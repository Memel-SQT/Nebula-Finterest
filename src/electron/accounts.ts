import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { app } from 'electron';
import { BudgetStore } from './store';
import { SyncManager } from './sync';
import { writeFileAtomic } from './fsutil';
import type { BudgetSnapshot, FullBackupFile, SyncStatus } from '../shared/types';
import { GUEST_ACCOUNT_ID } from '../shared/accounts';
import type { AccountBackup, LocalAccountSummary } from '../shared/accounts';

/**
 * Persisted in accounts.json. Every field added after the first release must stay optional:
 * the auto-updater installs new versions over existing data, so records written by any older
 * version have to load unchanged.
 */
interface AccountRecord extends LocalAccountSummary {
  pinHash: string;
  pinSalt: string;
  avatarFile?: string;
  /** Epoch ms of the last change to this record; drives the sync merge. Added in v0.1.36. */
  updatedAt?: number;
}

const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 30_000;

export class AccountManager {
  private readonly userData = app.getPath('userData');
  private readonly accountsPath = path.join(this.userData, 'accounts.json');
  private readonly avatarsDir = path.join(this.userData, 'avatars');
  private readonly sync: SyncManager;
  private records: AccountRecord[] = [];
  private active: { record: AccountRecord; store: BudgetStore } | null = null;
  private readonly failedAttempts = new Map<string, { count: number; lockedUntil: number }>();

  constructor(onSyncStatus?: (status: SyncStatus) => void) {
    this.sync = new SyncManager(path.join(this.userData, 'sync-settings.json'), onSyncStatus);
  }

  /** `withSync: false` is used by the headless pre-uninstall backup, which must only read local data. */
  async initialize(options: { withSync?: boolean } = {}): Promise<void> {
    try {
      const parsed = JSON.parse(await fs.readFile(this.accountsPath, 'utf8'));
      this.records = Array.isArray(parsed) ? parsed.filter((record) => record && typeof record.id === 'string') : [];
    } catch {
      this.records = [];
    }

    if (options.withSync !== false) {
      await this.sync.load();
      await this.syncAccounts();
    }
  }

  list(): LocalAccountSummary[] { return this.records.map((record) => this.toSummary(record)); }

  async create(name: string, pin: string): Promise<LocalAccountSummary> {
    this.assertCredentials(name, pin);
    const record: AccountRecord = { id: crypto.randomUUID(), name: name.trim(), ...this.hashPin(pin), updatedAt: Date.now() };
    this.records.push(record);
    await this.saveRecords();
    await this.open(record);
    return this.toSummary(record);
  }

  async unlock(id: string, pin: string): Promise<BudgetSnapshot> {
    const record = this.records.find((candidate) => candidate.id === id);
    this.checkPin(record, pin);
    await this.open(record as AccountRecord);
    return this.requireActive().store.getSnapshot();
  }

  async delete(id: string, pin: string): Promise<void> {
    const record = this.records.find((candidate) => candidate.id === id);
    this.checkPin(record, pin);
    const deleted = record as AccountRecord;

    if (this.active?.record.id === id) {
      this.active = null;
    }

    this.records = this.records.filter((candidate) => candidate.id !== id);
    await this.saveRecords([id]);

    await fs.rm(this.databasePath(deleted.id), { force: true });
    await this.sync.removeRemote(this.databaseFileName(deleted.id));
    if (deleted.avatarFile) {
      await fs.rm(path.join(this.avatarsDir, deleted.avatarFile), { force: true });
      await this.sync.removeRemote(`avatars/${deleted.avatarFile}`);
    }
  }

  lock(): void { this.active = null; }
  getActive(): LocalAccountSummary | null { return this.active ? this.toSummary(this.active.record) : null; }
  getStore(): BudgetStore { return this.requireActive().store; }
  getActiveName(): string | undefined { return this.active?.record.name; }
  isActiveGuest(): boolean { return this.active?.record.id === GUEST_ACCOUNT_ID; }

  /** Entirely in-memory: never touches accounts.json, a .sqlite file or the sync folder, so nothing survives the session. */
  async enterGuestMode(name: string): Promise<BudgetSnapshot> {
    const record: AccountRecord = { id: GUEST_ACCOUNT_ID, name: name.trim() || 'Invité', pinHash: '', pinSalt: '' };
    const store = new BudgetStore(undefined, { ephemeral: true });
    await store.initialize();
    this.active = { record, store };
    return store.getSnapshot();
  }

  async renameActive(name: string): Promise<LocalAccountSummary> {
    const active = this.requireActive();
    if (typeof name !== 'string' || name.trim().length < 2) throw new Error('ERR_INVALID_ACCOUNT_NAME');
    active.record.name = name.trim();
    active.record.updatedAt = Date.now();
    if (active.record.id !== GUEST_ACCOUNT_ID) {
      await this.saveRecords();
    }
    return this.toSummary(active.record);
  }

  async setActiveAvatar(sourceFilePath: string): Promise<LocalAccountSummary> {
    const active = this.requireActive();
    if (active.record.id === GUEST_ACCOUNT_ID) {
      throw new Error('ERR_GUEST_READONLY');
    }
    await fs.mkdir(this.avatarsDir, { recursive: true });

    const extension = path.extname(sourceFilePath).toLowerCase() || '.png';
    const fileName = `${active.record.id}${extension}`;
    const destinationPath = path.join(this.avatarsDir, fileName);

    if (active.record.avatarFile && active.record.avatarFile !== fileName) {
      await fs.rm(path.join(this.avatarsDir, active.record.avatarFile), { force: true });
      await this.sync.removeRemote(`avatars/${active.record.avatarFile}`);
    }

    await fs.copyFile(sourceFilePath, destinationPath);
    active.record.avatarFile = fileName;
    active.record.updatedAt = Date.now();
    await this.saveRecords();
    await this.sync.syncFile(destinationPath, `avatars/${fileName}`);
    return this.toSummary(active.record);
  }

  async exportActive(): Promise<AccountBackup> {
    const active = this.requireActive();
    return { app: 'Finterest', version: 1, exportedAt: new Date().toISOString(), account: { name: active.record.name, pinHash: active.record.pinHash, pinSalt: active.record.pinSalt }, snapshot: await active.store.getSnapshot() };
  }

  /** Used only by the headless pre-uninstall backup path (main.ts `--backup-before-uninstall`); bypasses PIN verification since disk access is already implied at that point. */
  async exportAllForBackup(): Promise<FullBackupFile> {
    const accounts: FullBackupFile['accounts'] = [];
    for (const record of this.records) {
      const store = new BudgetStore(this.databasePath(record.id));
      await store.initialize();
      accounts.push({ name: record.name, snapshot: await store.getSnapshot() });
    }

    return { app: 'Finterest', version: 1, exportedAt: new Date().toISOString(), accounts };
  }

  getSyncStatus(): SyncStatus { return this.sync.getStatus(); }

  async setSyncDirectory(directory: string | null): Promise<SyncStatus> {
    await this.sync.setDirectory(directory);
    if (directory) {
      await this.syncNow();
    }
    return this.sync.getStatus();
  }

  /**
   * Full two-way pass: account list, then every profile's database and avatar. If the open
   * profile's database was replaced by a newer copy, it is reloaded so the UI shows it.
   * Returns true when the active profile's data changed.
   */
  async syncNow(): Promise<boolean> {
    if (!this.sync.isEnabled()) {
      return false;
    }
    await this.active?.store.flush();
    await this.syncAccounts();

    let activeReloaded = false;
    for (const record of this.records) {
      const action = await this.sync.syncFile(this.databasePath(record.id), this.databaseFileName(record.id));
      if (action === 'pull' && this.active?.record.id === record.id) {
        await this.active.store.reload();
        activeReloaded = true;
      }
    }
    return activeReloaded;
  }

  private async syncAccounts(): Promise<void> {
    if (!this.sync.isEnabled()) {
      return;
    }
    const merged = await this.sync.syncManifest(this.records);
    if (merged.changed) {
      this.records = merged.records;
      await writeFileAtomic(this.accountsPath, JSON.stringify(this.records, null, 2));
      const refreshed = this.records.find((record) => record.id === this.active?.record.id);
      if (this.active && refreshed) {
        this.active.record = refreshed;
      }
    }
    for (const record of this.records) {
      if (record.avatarFile) {
        await this.sync.syncFile(path.join(this.avatarsDir, record.avatarFile), `avatars/${record.avatarFile}`);
      }
    }
  }

  private toSummary(record: AccountRecord): LocalAccountSummary {
    // The version query busts Chromium's image cache: replacing a photo keeps the same file name.
    const avatarUrl = record.avatarFile ? `${pathToFileURL(path.join(this.avatarsDir, record.avatarFile)).href}?v=${record.updatedAt ?? 0}` : undefined;
    return { id: record.id, name: record.name, avatarUrl };
  }

  private databaseFileName(id: string): string { return `finterest-${id}.sqlite`; }
  private databasePath(id: string): string { return path.join(this.userData, this.databaseFileName(id)); }

  private async open(record: AccountRecord): Promise<void> {
    const databasePath = this.databasePath(record.id);
    const fileName = this.databaseFileName(record.id);
    // Pick up a newer copy written by another machine before loading it into memory.
    await this.sync.syncFile(databasePath, fileName);
    const store = new BudgetStore(databasePath, {
      onPersist: (data) => this.sync.pushData(databasePath, fileName, data),
    });
    await store.initialize();
    this.active = { record, store };
  }

  private checkPin(record: AccountRecord | undefined, pin: string): void {
    const key = record?.id ?? '';
    const attempts = this.failedAttempts.get(key);
    if (attempts && attempts.lockedUntil > Date.now()) {
      throw new Error('ERR_TOO_MANY_ATTEMPTS');
    }
    if (!record || !this.verifyPin(pin, record)) {
      const count = (attempts?.count ?? 0) + 1;
      this.failedAttempts.set(key, count >= MAX_PIN_ATTEMPTS ? { count: 0, lockedUntil: Date.now() + PIN_LOCKOUT_MS } : { count, lockedUntil: 0 });
      throw new Error('ERR_INVALID_CREDENTIALS');
    }
    this.failedAttempts.delete(key);
  }

  private requireActive() { if (!this.active) throw new Error('ERR_ACCOUNT_LOCKED'); return this.active; }
  private assertCredentials(name: string, pin: string): void { if (typeof name !== 'string' || name.trim().length < 2) throw new Error('ERR_INVALID_ACCOUNT_NAME'); if (typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) throw new Error('ERR_INVALID_PIN'); }
  private hashPin(pin: string) { const pinSalt = crypto.randomBytes(16).toString('hex'); return { pinSalt, pinHash: crypto.scryptSync(pin, pinSalt, 64).toString('hex') }; }

  private verifyPin(pin: string, record: AccountRecord): boolean {
    if (typeof pin !== 'string' || !record.pinSalt || !record.pinHash) {
      return false;
    }
    const expected = Buffer.from(record.pinHash, 'hex');
    const actual = crypto.scryptSync(pin, record.pinSalt, 64);
    // timingSafeEqual throws on a length mismatch, which a hand-edited or truncated accounts.json could cause.
    return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
  }

  private async saveRecords(deletedIds: string[] = []): Promise<void> {
    await writeFileAtomic(this.accountsPath, JSON.stringify(this.records, null, 2));
    if (this.sync.isEnabled()) {
      const merged = await this.sync.syncManifest(this.records, deletedIds);
      if (merged.changed) {
        this.records = merged.records;
        await writeFileAtomic(this.accountsPath, JSON.stringify(this.records, null, 2));
      }
    }
  }
}
