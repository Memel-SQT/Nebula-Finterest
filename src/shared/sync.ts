/**
 * Pure decision logic for the secondary-folder sync (see src/electron/sync.ts for the I/O).
 * Kept framework-free so it is unit-tested alongside budget.ts.
 */

export interface SyncableRecord {
  id: string;
  /** Epoch ms of the last change to the record itself (name, PIN, avatar). Missing on records written before v0.1.36. */
  updatedAt?: number;
}

export interface SyncManifest<T extends SyncableRecord> {
  app: 'Finterest';
  kind: 'sync-manifest';
  version: 1;
  updatedAt: string;
  accounts: T[];
  /** Profiles deleted from any machine. They are not re-added elsewhere, but local data is never deleted automatically. */
  deletedIds: string[];
}

/**
 * FAT32/exFAT (USB sticks) store mtimes with 2 s precision, and cloud clients sometimes round them,
 * so two copies written in the same instant can disagree by up to that much.
 */
export const MTIME_TOLERANCE_MS = 2000;

export type FileSyncAction = 'push' | 'pull' | 'none';

/** Last writer wins, at whole-file level: the app rewrites its entire database on every change anyway. */
export function decideFileSync(localMtimeMs: number | null, remoteMtimeMs: number | null): FileSyncAction {
  if (localMtimeMs === null && remoteMtimeMs === null) {
    return 'none';
  }
  if (remoteMtimeMs === null) {
    return 'push';
  }
  if (localMtimeMs === null) {
    return 'pull';
  }
  if (remoteMtimeMs - localMtimeMs > MTIME_TOLERANCE_MS) {
    return 'pull';
  }
  if (localMtimeMs - remoteMtimeMs > MTIME_TOLERANCE_MS) {
    return 'push';
  }
  return 'none';
}

export function mergeAccountRecords<T extends SyncableRecord>(local: T[], remote: T[], deletedIds: string[]): { records: T[]; changed: boolean } {
  const deleted = new Set(deletedIds);
  const remoteById = new Map(remote.filter((record) => record && typeof record.id === 'string').map((record) => [record.id, record]));
  let changed = false;

  const records = local.map((record) => {
    const candidate = remoteById.get(record.id);
    remoteById.delete(record.id);
    if (candidate && (candidate.updatedAt ?? 0) > (record.updatedAt ?? 0)) {
      changed = true;
      return candidate;
    }
    return record;
  });

  for (const candidate of remoteById.values()) {
    if (!deleted.has(candidate.id)) {
      records.push(candidate);
      changed = true;
    }
  }

  return { records, changed };
}

export function isSyncManifest(value: unknown): value is SyncManifest<SyncableRecord> {
  const manifest = value as SyncManifest<SyncableRecord> | null;
  return Boolean(
    manifest &&
      typeof manifest === 'object' &&
      manifest.app === 'Finterest' &&
      manifest.kind === 'sync-manifest' &&
      manifest.version === 1 &&
      Array.isArray(manifest.accounts),
  );
}
