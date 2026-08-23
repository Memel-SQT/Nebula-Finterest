import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { app } from 'electron';
import { BudgetStore } from './store';
import type { BudgetSnapshot, FullBackupFile } from '../shared/types';
import type { AccountBackup, LocalAccountSummary } from '../shared/accounts';

interface AccountRecord extends LocalAccountSummary { pinHash: string; pinSalt: string; avatarFile?: string; }

export class AccountManager {
  private readonly accountsPath = path.join(app.getPath('userData'), 'accounts.json');
  private readonly avatarsDir = path.join(app.getPath('userData'), 'avatars');
  private records: AccountRecord[] = [];
  private active: { record: AccountRecord; store: BudgetStore } | null = null;

  async initialize(): Promise<void> {
    try { this.records = JSON.parse(await fs.readFile(this.accountsPath, 'utf8')) as AccountRecord[]; } catch { this.records = []; }
  }

  list(): LocalAccountSummary[] { return this.records.map((record) => this.toSummary(record)); }

  async create(name: string, pin: string): Promise<LocalAccountSummary> {
    this.assertCredentials(name, pin);
    const record: AccountRecord = { id: crypto.randomUUID(), name: name.trim(), ...this.hashPin(pin) };
    this.records.push(record);
    await this.saveRecords();
    await this.open(record);
    return this.toSummary(record);
  }

  async unlock(id: string, pin: string): Promise<BudgetSnapshot> {
    const record = this.records.find((candidate) => candidate.id === id);
    if (!record || !this.verifyPin(pin, record)) throw new Error('ERR_INVALID_CREDENTIALS');
    await this.open(record);
    return this.requireActive().store.getSnapshot();
  }

  async delete(id: string, pin: string): Promise<void> {
    const record = this.records.find((candidate) => candidate.id === id);
    if (!record || !this.verifyPin(pin, record)) throw new Error('ERR_INVALID_CREDENTIALS');

    if (this.active?.record.id === id) {
      this.active = null;
    }

    this.records = this.records.filter((candidate) => candidate.id !== id);
    await this.saveRecords();

    const databasePath = path.join(app.getPath('userData'), `finterest-${record.id}.sqlite`);
    await fs.rm(databasePath, { force: true });
    if (record.avatarFile) {
      await fs.rm(path.join(this.avatarsDir, record.avatarFile), { force: true });
    }
  }

  lock(): void { this.active = null; }
  getActive(): LocalAccountSummary | null { return this.active ? this.toSummary(this.active.record) : null; }
  getStore(): BudgetStore { return this.requireActive().store; }

  async renameActive(name: string): Promise<LocalAccountSummary> {
    const active = this.requireActive();
    if (name.trim().length < 2) throw new Error('ERR_INVALID_ACCOUNT_NAME');
    active.record.name = name.trim();
    await this.saveRecords();
    return this.toSummary(active.record);
  }

  async setActiveAvatar(sourceFilePath: string): Promise<LocalAccountSummary> {
    const active = this.requireActive();
    await fs.mkdir(this.avatarsDir, { recursive: true });

    const extension = path.extname(sourceFilePath) || '.png';
    const fileName = `${active.record.id}${extension}`;
    const destinationPath = path.join(this.avatarsDir, fileName);

    if (active.record.avatarFile && active.record.avatarFile !== fileName) {
      await fs.rm(path.join(this.avatarsDir, active.record.avatarFile), { force: true });
    }

    await fs.copyFile(sourceFilePath, destinationPath);
    active.record.avatarFile = fileName;
    await this.saveRecords();
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
      const databasePath = path.join(app.getPath('userData'), `finterest-${record.id}.sqlite`);
      const store = new BudgetStore(databasePath);
      await store.initialize();
      accounts.push({ name: record.name, snapshot: await store.getSnapshot() });
    }

    return { app: 'Finterest', version: 1, exportedAt: new Date().toISOString(), accounts };
  }

  private toSummary(record: AccountRecord): LocalAccountSummary {
    const avatarUrl = record.avatarFile ? pathToFileURL(path.join(this.avatarsDir, record.avatarFile)).href : undefined;
    return { id: record.id, name: record.name, avatarUrl };
  }

  private async open(record: AccountRecord): Promise<void> {
    const databasePath = path.join(app.getPath('userData'), `finterest-${record.id}.sqlite`);
    const store = new BudgetStore(databasePath);
    await store.initialize();
    this.active = { record, store };
  }

  private requireActive() { if (!this.active) throw new Error('ERR_ACCOUNT_LOCKED'); return this.active; }
  private assertCredentials(name: string, pin: string): void { if (name.trim().length < 2) throw new Error('ERR_INVALID_ACCOUNT_NAME'); if (!/^\d{4,8}$/.test(pin)) throw new Error('ERR_INVALID_PIN'); }
  private hashPin(pin: string) { const pinSalt = crypto.randomBytes(16).toString('hex'); return { pinSalt, pinHash: crypto.scryptSync(pin, pinSalt, 64).toString('hex') }; }
  private verifyPin(pin: string, record: AccountRecord): boolean { const hash = crypto.scryptSync(pin, record.pinSalt, 64).toString('hex'); return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(record.pinHash, 'hex')); }
  private async saveRecords(): Promise<void> { await fs.mkdir(path.dirname(this.accountsPath), { recursive: true }); await fs.writeFile(this.accountsPath, JSON.stringify(this.records, null, 2), 'utf8'); }
}
