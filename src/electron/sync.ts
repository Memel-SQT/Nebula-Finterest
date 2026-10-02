import fs from 'node:fs/promises';
import path from 'node:path';
import type { SyncStatus } from '../shared/types';
import { decideFileSync, isSyncManifest, mirrorManifestRecords, restorableRecords, type SyncableRecord, type SyncManifest } from '../shared/sync';
import { statMtimeMs, writeFileAtomic } from './fsutil';

/** Subfolder created inside the directory the user picks, so the app never scatters files in, say, the root of their OneDrive. */
export const SYNC_SUBFOLDER = 'Nebula Finterest';
const MANIFEST_FILE = 'accounts-sync.json';

interface SyncSettings {
  directory: string | null;
}

/**
 * Copies every local profile (database, avatar, account record) into a second folder the user
 * chose — typically a cloud-synced or USB folder. Since v0.1.37 it is a one-way **duplicate**: the
 * profiles in userData (with their PIN records) are the reference and are read first; nothing in the
 * folder ever replaces them on its own. Profiles found there that this computer does not have are
 * only offered (`listRestorable`), and added on the user's request (`pullFile`, never over an
 * existing local file). A copy failure is recorded in the status and never blocks or fails a local
 * save.
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
   * Writes this computer's records into the folder's manifest (they win for their ids), keeping
   * the records other computers left there. The local list is never changed.
   */
  async pushManifest<T extends SyncableRecord>(local: T[]): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }
    await this.guard(async () => {
      const remote = await this.readManifest<T>();
      const deletedIds = remote?.deletedIds ?? [];
      const manifest: SyncManifest<T> = {
        app: 'Finterest',
        kind: 'sync-manifest',
        version: 1,
        updatedAt: new Date().toISOString(),
        accounts: mirrorManifestRecords(local, remote?.accounts ?? [], deletedIds),
        deletedIds,
      };
      await writeFileAtomic(this.remotePath(MANIFEST_FILE), JSON.stringify(manifest, null, 2));
    }, undefined);
  }

  /** Profiles in the folder that this computer does not have (with their database present there). */
  async listRestorable<T extends SyncableRecord>(localIds: string[], databaseFileName: (id: string) => string): Promise<T[]> {
    const remote = await this.readManifest<T>();
    if (!remote) {
      return [];
    }
    const candidates = restorableRecords(localIds, remote.accounts, remote.deletedIds ?? []);
    const present: T[] = [];
    for (const record of candidates) {
      if ((await statMtimeMs(this.remotePath(databaseFileName(record.id)))) !== null) present.push(record);
    }
    return present;
  }

  /**
   * Duplicates `fileName` into the folder when the local copy is newer (or alone). A newer copy in
   * the folder (another computer) is left untouched, never pulled: returns 'newer-elsewhere'.
   */
  async pushFile(localPath: string, fileName: string): Promise<'push' | 'none' | 'newer-elsewhere'> {
    if (!this.isEnabled()) {
      return 'none';
    }
    return this.guard(async () => {
      const remotePath = this.remotePath(fileName);
      const action = decideFileSync(await statMtimeMs(localPath), await statMtimeMs(remotePath));
      if (action === 'push') {
        await this.copyPreservingMtime(localPath, remotePath);
        return 'push' as const;
      }
      return action === 'pull' && (await statMtimeMs(localPath)) !== null ? ('newer-elsewhere' as const) : ('none' as const);
    }, 'none' as const);
  }

  /** On the user's request only: brings a file from the folder, never over an existing local file. */
  async pullFile(fileName: string, localPath: string): Promise<boolean> {
    if (!this.isEnabled() || (await statMtimeMs(localPath)) !== null) {
      return false;
    }
    return this.guard(async () => {
      const remotePath = this.remotePath(fileName);
      if ((await statMtimeMs(remotePath)) === null) return false;
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await this.copyPreservingMtime(remotePath, localPath);
      return true;
    }, false);
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
