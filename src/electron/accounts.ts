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
      await this.pushAll();
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
    await this.saveRecords();

    // The copy in the sync folder is kept: it is a duplicate the user can restore from.
    await fs.rm(this.databasePath(deleted.id), { force: true });
    if (deleted.avatarFile) {
      await fs.rm(path.join(this.avatarsDir, deleted.avatarFile), { force: true });
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
    }

    await fs.copyFile(sourceFilePath, destinationPath);
    active.record.avatarFile = fileName;
    active.record.updatedAt = Date.now();
    await this.saveRecords();
    await this.sync.pushFile(destinationPath, `avatars/${fileName}`);
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
   * Copy pass (v0.1.37): the account list, then every profile's database and avatar, from this
   * computer to the folder. Nothing local is ever replaced, so the open profile never needs a
   * reload: always returns false (kept for the IPC contract).
   */
  async syncNow(): Promise<boolean> {
    if (!this.sync.isEnabled()) {
      return false;
    }
    await this.active?.store.flush();
    await this.pushAll();
    return false;
  }

  /** Profiles in the copy folder that this computer does not have, offered to the user. */
  async listRestorable(): Promise<LocalAccountSummary[]> {
    if (!this.sync.isEnabled()) {
      return [];
    }
    const records = await this.sync.listRestorable<AccountRecord>(this.records.map((record) => record.id), (id) => this.databaseFileName(id));
    return records.map((record) => ({ id: record.id, name: typeof record.name === 'string' ? record.name : '?' }));
  }

  /**
   * On the user's request: adds profiles from the copy folder to this computer (record with its
   * PIN, database, photo). An existing local profile or file is never overwritten.
   */
  async restoreFromCopy(ids: string[]): Promise<LocalAccountSummary[]> {
    if (!this.sync.isEnabled() || !Array.isArray(ids)) {
      return this.list();
    }
    const wanted = new Set(ids.filter((id) => typeof id === 'string'));
    const candidates = await this.sync.listRestorable<AccountRecord>(this.records.map((record) => record.id), (id) => this.databaseFileName(id));
    let added = false;
    for (const record of candidates) {
      if (!wanted.has(record.id) || typeof record.pinHash !== 'string' || typeof record.pinSalt !== 'string' || typeof record.name !== 'string') continue;
      const pulled = await this.sync.pullFile(this.databaseFileName(record.id), this.databasePath(record.id));
      if (!pulled) continue;
      if (record.avatarFile && /^[\w-]+\.(png|jpe?g|webp|gif)$/i.test(record.avatarFile)) {
        await this.sync.pullFile(`avatars/${record.avatarFile}`, path.join(this.avatarsDir, record.avatarFile));
      }
      this.records.push({ id: record.id, name: record.name, pinHash: record.pinHash, pinSalt: record.pinSalt, avatarFile: record.avatarFile, updatedAt: record.updatedAt });
      added = true;
    }
    if (added) {
      await this.saveRecords();
    }
    return this.list();
  }

  /** Duplicates the account list, avatars and databases into the folder (never the other way). */
  private async pushAll(): Promise<void> {
    if (!this.sync.isEnabled()) {
      return;
    }
    await this.sync.pushManifest(this.records);
    for (const record of this.records) {
      if (record.avatarFile) {
        await this.sync.pushFile(path.join(this.avatarsDir, record.avatarFile), `avatars/${record.avatarFile}`);
      }
      await this.sync.pushFile(this.databasePath(record.id), this.databaseFileName(record.id));
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
    // The local database is the reference (v0.1.37): it is loaded as is, never replaced by the copy.
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

  private async saveRecords(): Promise<void> {
    await writeFileAtomic(this.accountsPath, JSON.stringify(this.records, null, 2));
    await this.sync.pushManifest(this.records);
  }
}
