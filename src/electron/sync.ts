import fs from 'node:fs/promises';
import path from 'node:path';
import type { SyncStatus } from '../shared/types';
import { decideFileSync, isSyncManifest, mergeAccountRecords, type SyncableRecord, type SyncManifest } from '../shared/sync';
import { statMtimeMs, writeFileAtomic } from './fsutil';

/** Subfolder created inside the directory the user picks, so the app never scatters files in, say, the root of their OneDrive. */
export const SYNC_SUBFOLDER = 'Nebula Finterest';
const MANIFEST_FILE = 'accounts-sync.json';

interface SyncSettings {
  directory: string | null;
}

/**
 * Mirrors every local profile (database, avatar, account record) into a second folder the user
 * chose — typically a cloud-synced or USB folder — and pulls back newer copies written there by
 * another machine. Whole-file, last-writer-wins: fine for a single person using one machine at a
 * time, which is what this app is for. A sync failure is recorded in the status and never blocks
 * or fails a local save.
 */
export class SyncManager {
  private settings: SyncSettings = { directory: null };
  private status: SyncStatus = { directory: null, state: 'disabled' };

  constructor(
    private readonly settingsPath: string,
    private readonly onStatus: (status: SyncStatus) => void = () => undefined,
  ) {}

  async load(): Promise<void> {
    try {
      const parsed = JSON.parse(await fs.readFile(this.settingsPath, 'utf8')) as Partial<SyncSettings>;
      this.settings = { directory: typeof parsed.directory === 'string' && parsed.directory ? parsed.directory : null };
    } catch {
      this.settings = { directory: null };
    }
    this.setStatus({ directory: this.settings.directory, state: this.settings.directory ? 'idle' : 'disabled' });
  }

  isEnabled(): boolean {
    return this.settings.directory !== null;
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  async setDirectory(directory: string | null): Promise<void> {
    if (directory) {
      await fs.mkdir(path.join(directory, SYNC_SUBFOLDER), { recursive: true });
    }
    this.settings = { directory };
    await writeFileAtomic(this.settingsPath, JSON.stringify(this.settings, null, 2));
    this.setStatus({ directory, state: directory ? 'idle' : 'disabled' });
  }

  remotePath(fileName: string): string {
    if (!this.settings.directory) {
      throw new Error('ERR_SYNC_UNAVAILABLE');
    }
    return path.join(this.settings.directory, SYNC_SUBFOLDER, fileName);
  }

  async readManifest<T extends SyncableRecord>(): Promise<SyncManifest<T> | null> {
    if (!this.isEnabled()) {
      return null;
    }
    try {
      const parsed = JSON.parse(await fs.readFile(this.remotePath(MANIFEST_FILE), 'utf8'));
      return isSyncManifest(parsed) ? (parsed as SyncManifest<T>) : null;
    } catch {
      return null;
    }
  }

  /**
   * Merges the remote account list into `local` and writes the union back. Returns the merged
   * list; the caller persists it locally when `changed` is true.
   */
  async syncManifest<T extends SyncableRecord>(local: T[], extraDeletedIds: string[] = []): Promise<{ records: T[]; changed: boolean }> {
    if (!this.isEnabled()) {
      return { records: local, changed: false };
    }
    return this.guard(async () => {
      const remote = await this.readManifest<T>();
      const deletedIds = Array.from(new Set([...(remote?.deletedIds ?? []), ...extraDeletedIds]));
      const merged = mergeAccountRecords(local, remote?.accounts ?? [], deletedIds);
      const manifest: SyncManifest<T> = {
        app: 'Finterest',
        kind: 'sync-manifest',
        version: 1,
        updatedAt: new Date().toISOString(),
        accounts: merged.records.filter((record) => !extraDeletedIds.includes(record.id)),
        deletedIds,
      };
      await writeFileAtomic(this.remotePath(MANIFEST_FILE), JSON.stringify(manifest, null, 2));
      return merged;
    }, { records: local, changed: false });
  }

  /** Copies `fileName` in whichever direction is newer. Before overwriting a local file, keeps it as `<name>.before-sync.bak`. */
  async syncFile(localPath: string, fileName: string): Promise<'push' | 'pull' | 'none'> {
    if (!this.isEnabled()) {
      return 'none';
    }
    return this.guard(async () => {
      const remotePath = this.remotePath(fileName);
      const action = decideFileSync(await statMtimeMs(localPath), await statMtimeMs(remotePath));
      if (action === 'push') {
        await this.copyPreservingMtime(localPath, remotePath);
      } else if (action === 'pull') {
        if ((await statMtimeMs(localPath)) !== null) {
          await fs.copyFile(localPath, `${localPath}.before-sync.bak`);
        }
        await this.copyPreservingMtime(remotePath, localPath);
      }
      return action;
    }, 'none' as const);
  }

  /** Called after each local database write: pushes the exact bytes just saved. */
  async pushData(localPath: string, fileName: string, data: Uint8Array): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }
    await this.guard(async () => {
      const remotePath = this.remotePath(fileName);
      await writeFileAtomic(remotePath, data);
      await this.alignMtime(localPath, remotePath);
    }, undefined);
  }

  async removeRemote(fileName: string): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }
    await this.guard(() => fs.rm(this.remotePath(fileName), { force: true }), undefined);
  }

  private async copyPreservingMtime(source: string, destination: string): Promise<void> {
    const data = await fs.readFile(source);
    await writeFileAtomic(destination, data);
    await this.alignMtime(source, destination);
  }

  /** Gives both copies the same mtime, so the next comparison sees them as in sync instead of ping-ponging. */
  private async alignMtime(source: string, destination: string): Promise<void> {
    const stats = await fs.stat(source);
    await fs.utimes(destination, stats.atime, stats.mtime);
  }

  private async guard<T>(action: () => Promise<T>, fallback: T): Promise<T> {
    this.setStatus({ ...this.status, state: 'syncing' });
    try {
      const result = await action();
      this.setStatus({ directory: this.settings.directory, state: 'idle', lastSyncAt: new Date().toISOString() });
      return result;
    } catch (error) {
      this.setStatus({
        directory: this.settings.directory,
        state: 'error',
        lastSyncAt: this.status.lastSyncAt,
        message: error instanceof Error ? error.message : String(error),
      });
      return fallback;
    }
  }

  private setStatus(status: SyncStatus): void {
    this.status = status;
    this.onStatus(status);
  }
}
