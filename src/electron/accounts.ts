import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import { BudgetStore } from './store';
import type { BudgetSnapshot } from '../shared/types';
import type { AccountBackup, LocalAccountSummary } from '../shared/accounts';

interface AccountRecord extends LocalAccountSummary { pinHash: string; pinSalt: string; }

export class AccountManager {
  private readonly accountsPath = path.join(app.getPath('userData'), 'accounts.json');
  private records: AccountRecord[] = [];
  private active: { record: AccountRecord; store: BudgetStore } | null = null;

  async initialize(): Promise<void> {
    try { this.records = JSON.parse(await fs.readFile(this.accountsPath, 'utf8')) as AccountRecord[]; } catch { this.records = []; }
  }

  list(): LocalAccountSummary[] { return this.records.map(({ id, name }) => ({ id, name })); }

  async create(name: string, pin: string): Promise<LocalAccountSummary> {
    this.assertCredentials(name, pin);
    const record = { id: crypto.randomUUID(), name: name.trim(), ...this.hashPin(pin) };
    this.records.push(record);
    await this.saveRecords();
    await this.open(record);
    return { id: record.id, name: record.name };
  }

  async unlock(id: string, pin: string): Promise<BudgetSnapshot> {
    const record = this.records.find((candidate) => candidate.id === id);
    if (!record || !this.verifyPin(pin, record)) throw new Error('Nom de compte ou code incorrect.');
    await this.open(record);
    return this.requireActive().store.getSnapshot();
  }

  lock(): void { this.active = null; }
  getActive(): LocalAccountSummary | null { return this.active ? { id: this.active.record.id, name: this.active.record.name } : null; }
  getStore(): BudgetStore { return this.requireActive().store; }

  async exportActive(): Promise<AccountBackup> {
    const active = this.requireActive();
    return { app: 'Finterest', version: 1, exportedAt: new Date().toISOString(), account: { name: active.record.name, pinHash: active.record.pinHash, pinSalt: active.record.pinSalt }, snapshot: await active.store.getSnapshot() };
  }

  private async open(record: AccountRecord): Promise<void> {
    const databasePath = path.join(app.getPath('userData'), `finterest-${record.id}.sqlite`);
    const store = new BudgetStore(databasePath);
    await store.initialize();
    this.active = { record, store };
  }

  private requireActive() { if (!this.active) throw new Error('Compte verrouillé.'); return this.active; }
  private assertCredentials(name: string, pin: string): void { if (name.trim().length < 2) throw new Error('Le nom du compte doit contenir au moins 2 caractères.'); if (!/^\d{4,8}$/.test(pin)) throw new Error('Le code doit contenir entre 4 et 8 chiffres.'); }
  private hashPin(pin: string) { const pinSalt = crypto.randomBytes(16).toString('hex'); return { pinSalt, pinHash: crypto.scryptSync(pin, pinSalt, 64).toString('hex') }; }
  private verifyPin(pin: string, record: AccountRecord): boolean { const hash = crypto.scryptSync(pin, record.pinSalt, 64).toString('hex'); return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(record.pinHash, 'hex')); }
  private async saveRecords(): Promise<void> { await fs.mkdir(path.dirname(this.accountsPath), { recursive: true }); await fs.writeFile(this.accountsPath, JSON.stringify(this.records, null, 2), 'utf8'); }
}
