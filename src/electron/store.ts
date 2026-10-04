import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import type { BackupFile, Budget, BudgetSnapshot, FixedExpense, Loan, VariableExpense, Wallet, WalletMovement } from '../shared/types';
import { budgetInputError, sanitizeBudget, sanitizeWallet, sanitizeWalletMovement } from '../shared/budgets';
import {
  createEmptySnapshot,
  extractBackupSnapshot,
  isValidDateString,
  isValidMonthKey,
  sanitizeFixedExpense,
  sanitizeLoan,
  sanitizeVariableExpense,
} from '../shared/budget';
import { writeFileAtomic } from './fsutil';

const DATABASE_FILE_NAME = 'finterest.sqlite';
const BACKUP_FILE_VERSION = 1;

export interface BudgetStoreOptions {
  ephemeral?: boolean;
  /** Called after every successful write to disk with the bytes just written (used by the folder sync). */
  onPersist?: (data: Uint8Array) => Promise<void>;
}

export class BudgetStore {
  private database: SqlJsDatabase | null = null;
  private readonly databasePath: string;
  private readonly ephemeral: boolean;
  private readonly sqlJsPromise: Promise<Awaited<ReturnType<typeof initSqlJs>>>;
  private readonly onPersist?: BudgetStoreOptions['onPersist'];
  /** Serializes disk writes: two IPC calls in quick succession must not interleave their file writes. */
  private persistChain: Promise<void> = Promise.resolve();

  constructor(databasePath?: string, options?: BudgetStoreOptions) {
    this.ephemeral = options?.ephemeral ?? false;
    this.onPersist = options?.onPersist;
    this.databasePath = databasePath ?? (this.ephemeral ? ':memory:' : path.join(app.getPath('userData'), DATABASE_FILE_NAME));
    this.sqlJsPromise = initSqlJs({
      locateFile: (fileName: string) => path.join(path.dirname(require.resolve('sql.js/dist/sql-wasm.wasm')), fileName),
    });
  }

  isEphemeral(): boolean {
    return this.ephemeral;
  }

  async initialize(): Promise<void> {
    if (this.database) {
      return;
    }

    const sqlJs = await this.sqlJsPromise;
    if (!this.ephemeral && (await this.fileExists(this.databasePath))) {
      const fileBuffer = await fs.readFile(this.databasePath);
      this.database = new sqlJs.Database(fileBuffer);
    } else {
      this.database = new sqlJs.Database();
    }

    this.createSchema();
    this.migrateSchema();
    await this.ensureSeedData();
    await this.persist();
  }

  async getSnapshot(): Promise<BudgetSnapshot> {
    await this.initialize();
    const database = this.requireDatabase();

    const incomeRow = database.exec("SELECT value FROM settings WHERE key = 'income'");
    const monthKeyRow = database.exec("SELECT value FROM settings WHERE key = 'activeMonthKey'");
    const fixedRows = database.exec('SELECT id, name, amount, category, dayOfMonth, active, kind FROM fixed_expenses ORDER BY name');
    const variableRows = database.exec('SELECT id, name, amount, category, date, monthKey, budgetId FROM variable_expenses ORDER BY date DESC, name');
    const loanRows = database.exec('SELECT id, name, principal, monthlyPayment, interestRate, remainingMonths, active FROM loans ORDER BY name');

    return {
      settings: {
        income: this.readSingleNumber(incomeRow, 0),
        activeMonthKey: this.readSingleText(monthKeyRow, 0) || createEmptySnapshot().settings.activeMonthKey,
      },
      fixedExpenses: this.readFixedExpenses(fixedRows),
      variableExpenses: this.readVariableExpenses(variableRows),
      loans: this.readLoans(loanRows),
      budgets: this.readBudgets(),
      wallets: this.readWallets(),
      walletMovements: this.readWalletMovements(),
    };
  }

  async saveIncome(income: number): Promise<BudgetSnapshot> {
    this.assertNonNegative(income);
    await this.upsertSetting('income', String(income));
    return this.getSnapshot();
  }

  async saveMonthKey(monthKey: string): Promise<BudgetSnapshot> {
    if (!isValidMonthKey(monthKey)) {
      throw new Error('ERR_INVALID_MONTH');
    }
    await this.upsertSetting('activeMonthKey', monthKey);
    return this.getSnapshot();
  }

  async addFixedExpense(expense: Partial<FixedExpense> & { name: string; amount: number; category: string; active?: boolean }): Promise<BudgetSnapshot> {
    this.assertNonNegative(expense.amount);
    this.assertName(expense.name);
    const fixedExpense: FixedExpense = sanitizeFixedExpense({
      id: expense.id ?? crypto.randomUUID(),
      name: expense.name.trim(),
      amount: Number(expense.amount),
      category: (expense.category ?? '').trim(),
      dayOfMonth: expense.dayOfMonth ?? null,
      active: expense.active ?? true,
      kind: expense.kind ?? 'subscription',
    });

    await this.runWithTransaction(() => {
      this.requireDatabase().run(
        'INSERT OR REPLACE INTO fixed_expenses (id, name, amount, category, dayOfMonth, active, kind) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [fixedExpense.id, fixedExpense.name, fixedExpense.amount, fixedExpense.category, fixedExpense.dayOfMonth, fixedExpense.active ? 1 : 0, fixedExpense.kind],
      );
    });

    return this.getSnapshot();
  }

  async toggleFixedExpense(id: string, active: boolean): Promise<BudgetSnapshot> {
    await this.runWithTransaction(() => {
      this.requireDatabase().run('UPDATE fixed_expenses SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
    });

    return this.getSnapshot();
  }

  async deleteFixedExpense(id: string): Promise<BudgetSnapshot> {
    await this.runWithTransaction(() => {
      this.requireDatabase().run('DELETE FROM fixed_expenses WHERE id = ?', [id]);
    });

    return this.getSnapshot();
  }

  async addVariableExpense(expense: Partial<VariableExpense> & { name: string; amount: number; category: string; date: string; monthKey?: string }): Promise<BudgetSnapshot> {
    this.assertNonNegative(expense.amount);
    this.assertName(expense.name);
    if (!isValidDateString(expense.date)) {
      throw new Error('ERR_INVALID_DATE');
    }
    await this.initialize();
    const budgetId = typeof expense.budgetId === 'string' && expense.budgetId ? expense.budgetId : null;
    if (budgetId && !this.readBudgets().some((budget) => budget.id === budgetId)) {
      throw new Error('ERR_INVALID_BUDGET');
    }
    const variableExpense: VariableExpense = sanitizeVariableExpense({
      id: expense.id ?? crypto.randomUUID(),
      name: expense.name.trim(),
      amount: Number(expense.amount),
      category: (expense.category ?? '').trim(),
      date: expense.date,
      // Always derived from the date: the budget totals and the calendar must agree on which month a purchase belongs to.
      monthKey: expense.date.slice(0, 7),
      budgetId,
    });

    await this.runWithTransaction(() => {
      this.requireDatabase().run(
        'INSERT OR REPLACE INTO variable_expenses (id, name, amount, category, date, monthKey, budgetId) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [variableExpense.id, variableExpense.name, variableExpense.amount, variableExpense.category, variableExpense.date, variableExpense.monthKey, variableExpense.budgetId ?? null],
      );
    });

    return this.getSnapshot();
  }

  async deleteVariableExpense(id: string): Promise<BudgetSnapshot> {
    await this.runWithTransaction(() => {
      this.requireDatabase().run('DELETE FROM variable_expenses WHERE id = ?', [id]);
    });

    return this.getSnapshot();
  }

  /**
   * Creates or edits a budget or a sub-envelope (v0.1.41). A sub-envelope inherits its root's
   * scale, period, dates and month mode, so only the root's are stored for both.
   */
  async saveBudget(input: Partial<Budget> & { name: string; amount: number }): Promise<BudgetSnapshot> {
    await this.initialize();
    const existing = this.readBudgets();
    const budget = sanitizeBudget({ ...input, id: input.id ?? crypto.randomUUID() });
    budget.name = String(input.name ?? '').trim();
    budget.amount = Number(input.amount);
    if (input.period === 'range') {
      // Checked as given: a half-filled range must be an error, not silently turned into "no dates".
      budget.period = 'range';
      budget.startDate = typeof input.startDate === 'string' ? input.startDate : null;
      budget.endDate = typeof input.endDate === 'string' ? input.endDate : null;
    }
    const error = budgetInputError(budget, existing);
    if (error) throw new Error(error);
    const parent = budget.parentId ? existing.find((candidate) => candidate.id === budget.parentId) : undefined;
    const stored: Budget = parent
      ? { ...budget, scale: parent.scale, period: parent.period, startDate: parent.startDate, endDate: parent.endDate, countsInMonth: parent.countsInMonth }
      : budget;

    await this.runWithTransaction(() => {
      const database = this.requireDatabase();
      database.run(
        'INSERT OR REPLACE INTO budgets (id, name, scale, parentId, amount, period, startDate, endDate, countsInMonth) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [stored.id, stored.name, stored.scale, stored.parentId, stored.amount, stored.period, stored.startDate, stored.endDate, stored.countsInMonth ? 1 : 0],
      );
      if (!stored.parentId) {
        // Sub-envelopes follow their root when it is edited.
        database.run('UPDATE budgets SET scale = ?, period = ?, startDate = ?, endDate = ?, countsInMonth = ? WHERE parentId = ?', [stored.scale, stored.period, stored.startDate, stored.endDate, stored.countsInMonth ? 1 : 0, stored.id]);
      }
    });
    return this.getSnapshot();
  }

  /**
   * Deletes a budget and its sub-envelopes. Purchases of a budget that counts in the month are real
   * spending: they stay, no longer charged to a budget. Purchases of a forecast budget were only
   * projections: they go with it.
   */
  async deleteBudget(id: string): Promise<BudgetSnapshot> {
    await this.initialize();
    const budgets = this.readBudgets();
    const budget = budgets.find((candidate) => candidate.id === id);
    if (!budget) return this.getSnapshot();
    const root = budget.parentId ? budgets.find((candidate) => candidate.id === budget.parentId) ?? budget : budget;
    const ids = [id, ...budgets.filter((candidate) => candidate.parentId === id).map((candidate) => candidate.id)];
    await this.runWithTransaction(() => {
      const database = this.requireDatabase();
      for (const budgetId of ids) {
        if (root.countsInMonth) {
          database.run('UPDATE variable_expenses SET budgetId = NULL WHERE budgetId = ?', [budgetId]);
        } else {
          database.run('DELETE FROM variable_expenses WHERE budgetId = ?', [budgetId]);
        }
        database.run('DELETE FROM budgets WHERE id = ?', [budgetId]);
      }
    });
    return this.getSnapshot();
  }

  async saveWallet(input: Partial<Wallet> & { name: string }): Promise<BudgetSnapshot> {
    const wallet = sanitizeWallet({ ...input, id: input.id ?? crypto.randomUUID() });
    this.assertName(wallet.name);
    if (input.goal !== null && input.goal !== undefined) this.assertNonNegative(Number(input.goal));
    await this.runWithTransaction(() => {
      this.requireDatabase().run('INSERT OR REPLACE INTO wallets (id, name, goal) VALUES (?, ?, ?)', [wallet.id, wallet.name, wallet.goal]);
    });
    return this.getSnapshot();
  }

  async deleteWallet(id: string): Promise<BudgetSnapshot> {
    await this.runWithTransaction(() => {
      const database = this.requireDatabase();
      database.run('DELETE FROM wallet_movements WHERE walletId = ?', [id]);
      database.run('DELETE FROM wallets WHERE id = ?', [id]);
    });
    return this.getSnapshot();
  }

  /** Money put into (positive amount) or taken out of (negative amount) a pot. */
  async addWalletMovement(input: Partial<WalletMovement> & { walletId: string; amount: number; date: string }): Promise<BudgetSnapshot> {
    await this.initialize();
    const movement = sanitizeWalletMovement({ ...input, id: input.id ?? crypto.randomUUID() });
    if (!Number.isFinite(Number(input.amount)) || movement.amount === 0) throw new Error('ERR_NEGATIVE_AMOUNT');
    if (!isValidDateString(movement.date)) throw new Error('ERR_INVALID_DATE');
    if (!this.readWallets().some((wallet) => wallet.id === movement.walletId)) throw new Error('ERR_INVALID_WALLET');
    await this.runWithTransaction(() => {
      this.requireDatabase().run('INSERT OR REPLACE INTO wallet_movements (id, walletId, amount, label, date) VALUES (?, ?, ?, ?, ?)', [movement.id, movement.walletId, movement.amount, movement.label, movement.date]);
    });
    return this.getSnapshot();
  }

  async deleteWalletMovement(id: string): Promise<BudgetSnapshot> {
    await this.runWithTransaction(() => {
      this.requireDatabase().run('DELETE FROM wallet_movements WHERE id = ?', [id]);
    });
    return this.getSnapshot();
  }

  async addLoan(loan: Partial<Loan> & { name: string; principal: number; monthlyPayment: number }): Promise<BudgetSnapshot> {
    this.assertNonNegative(loan.principal);
    this.assertNonNegative(loan.monthlyPayment);
    this.assertName(loan.name);
    const sanitized: Loan = sanitizeLoan({
      id: loan.id ?? crypto.randomUUID(),
      name: loan.name.trim(),
      principal: Number(loan.principal),
      monthlyPayment: Number(loan.monthlyPayment),
      interestRate: Number(loan.interestRate ?? 0),
      remainingMonths: loan.remainingMonths ?? null,
      active: loan.active ?? true,
    });

    await this.runWithTransaction(() => {
      this.requireDatabase().run(
        'INSERT OR REPLACE INTO loans (id, name, principal, monthlyPayment, interestRate, remainingMonths, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [sanitized.id, sanitized.name, sanitized.principal, sanitized.monthlyPayment, sanitized.interestRate, sanitized.remainingMonths, sanitized.active ? 1 : 0],
      );
    });

    return this.getSnapshot();
  }

  async toggleLoan(id: string, active: boolean): Promise<BudgetSnapshot> {
    await this.runWithTransaction(() => {
      this.requireDatabase().run('UPDATE loans SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
    });

    return this.getSnapshot();
  }

  async deleteLoan(id: string): Promise<BudgetSnapshot> {
    await this.runWithTransaction(() => {
      this.requireDatabase().run('DELETE FROM loans WHERE id = ?', [id]);
    });

    return this.getSnapshot();
  }

  async exportBackup(): Promise<BackupFile> {
    const snapshot = await this.getSnapshot();
    return {
      app: 'Finterest',
      version: BACKUP_FILE_VERSION,
      exportedAt: new Date().toISOString(),
      snapshot,
    };
  }

  /**
   * Replaces this account's data with a backup. Accepts every backup format any released version
   * wrote (see extractBackupSnapshot) and normalizes it first, so an older file never fails
   * half-way: the whole replacement runs in one transaction either way.
   */
  async importBackup(backup: unknown, preferredAccountName?: string): Promise<BudgetSnapshot> {
    const snapshot = extractBackupSnapshot(backup, preferredAccountName);
    if (!snapshot) {
      throw new Error('ERR_INVALID_BACKUP');
    }

    await this.initialize();
    await this.runWithTransaction(() => {
      const database = this.requireDatabase();
      database.run('DELETE FROM settings');
      database.run('DELETE FROM fixed_expenses');
      database.run('DELETE FROM variable_expenses');
      database.run('DELETE FROM loans');
      database.run('DELETE FROM budgets');
      database.run('DELETE FROM wallets');
      database.run('DELETE FROM wallet_movements');

      database.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['income', String(snapshot.settings.income)]);
      database.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['activeMonthKey', snapshot.settings.activeMonthKey]);

      for (const fixedExpense of snapshot.fixedExpenses) {
        database.run(
          'INSERT INTO fixed_expenses (id, name, amount, category, dayOfMonth, active, kind) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [fixedExpense.id, fixedExpense.name, fixedExpense.amount, fixedExpense.category, fixedExpense.dayOfMonth, fixedExpense.active ? 1 : 0, fixedExpense.kind],
        );
      }

      for (const variableExpense of snapshot.variableExpenses) {
        database.run(
          'INSERT INTO variable_expenses (id, name, amount, category, date, monthKey, budgetId) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [variableExpense.id, variableExpense.name, variableExpense.amount, variableExpense.category, variableExpense.date, variableExpense.monthKey, variableExpense.budgetId ?? null],
        );
      }

      for (const sanitizedLoan of snapshot.loans) {
        database.run(
          'INSERT INTO loans (id, name, principal, monthlyPayment, interestRate, remainingMonths, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [sanitizedLoan.id, sanitizedLoan.name, sanitizedLoan.principal, sanitizedLoan.monthlyPayment, sanitizedLoan.interestRate, sanitizedLoan.remainingMonths, sanitizedLoan.active ? 1 : 0],
        );
      }

      for (const budget of snapshot.budgets ?? []) {
        database.run(
          'INSERT INTO budgets (id, name, scale, parentId, amount, period, startDate, endDate, countsInMonth) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [budget.id, budget.name, budget.scale, budget.parentId, budget.amount, budget.period, budget.startDate, budget.endDate, budget.countsInMonth ? 1 : 0],
        );
      }
      for (const wallet of snapshot.wallets ?? []) {
        database.run('INSERT INTO wallets (id, name, goal) VALUES (?, ?, ?)', [wallet.id, wallet.name, wallet.goal]);
      }
      for (const movement of snapshot.walletMovements ?? []) {
        database.run('INSERT INTO wallet_movements (id, walletId, amount, label, date) VALUES (?, ?, ?, ?, ?)', [movement.id, movement.walletId, movement.amount, movement.label, movement.date]);
      }
    });

    return this.getSnapshot();
  }

  getDatabasePath(): string {
    return this.databasePath;
  }

  /** Drops the in-memory copy and reloads from disk, after the sync replaced the file underneath. */
  async reload(): Promise<void> {
    await this.persistChain;
    this.database = null;
    await this.initialize();
  }

  /** Resolves once every pending write has reached the disk. */
  async flush(): Promise<void> {
    await this.persistChain;
  }

  private createSchema(): void {
    const database = this.requireDatabase();
    database.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS fixed_expenses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        dayOfMonth INTEGER,
        active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS variable_expenses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        monthKey TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS loans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        principal REAL NOT NULL,
        monthlyPayment REAL NOT NULL,
        interestRate REAL NOT NULL DEFAULT 0,
        remainingMonths INTEGER,
        active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        scale TEXT NOT NULL DEFAULT 'regular',
        parentId TEXT,
        amount REAL NOT NULL DEFAULT 0,
        period TEXT NOT NULL DEFAULT 'month',
        startDate TEXT,
        endDate TEXT,
        countsInMonth INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS wallets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        goal REAL
      );

      CREATE TABLE IF NOT EXISTS wallet_movements (
        id TEXT PRIMARY KEY,
        walletId TEXT NOT NULL,
        amount REAL NOT NULL,
        label TEXT NOT NULL DEFAULT '',
        date TEXT NOT NULL
      );
    `);
  }

  /** Adds columns introduced after a user's database was first created; CREATE TABLE IF NOT EXISTS above does not alter existing tables. */
  private migrateSchema(): void {
    const database = this.requireDatabase();
    const columns = database.exec('PRAGMA table_info(fixed_expenses)');
    const columnNames = (columns[0]?.values ?? []).map((row) => String(row[1]));
    if (!columnNames.includes('kind')) {
      database.run("ALTER TABLE fixed_expenses ADD COLUMN kind TEXT NOT NULL DEFAULT 'subscription'");
    }
    // v0.1.41: a purchase can be charged to a budget. Existing purchases keep NULL (no budget).
    const variableColumns = (database.exec('PRAGMA table_info(variable_expenses)')[0]?.values ?? []).map((row) => String(row[1]));
    if (!variableColumns.includes('budgetId')) {
      database.run('ALTER TABLE variable_expenses ADD COLUMN budgetId TEXT');
    }
  }

  private async ensureSeedData(): Promise<void> {
    const database = this.requireDatabase();
    const settingsRows = database.exec('SELECT COUNT(*) AS count FROM settings');
    if (this.readSingleNumber(settingsRows, 0) > 0) {
      return;
    }

    const emptySnapshot = createEmptySnapshot();
    database.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['income', String(emptySnapshot.settings.income)]);
    database.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['activeMonthKey', emptySnapshot.settings.activeMonthKey]);

    database.run('INSERT INTO fixed_expenses (id, name, amount, category, dayOfMonth, active, kind) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      crypto.randomUUID(),
      'Rent',
      850,
      'Housing',
      1,
      1,
      'directDebit',
    ]);
    database.run('INSERT INTO fixed_expenses (id, name, amount, category, dayOfMonth, active, kind) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      crypto.randomUUID(),
      'Internet',
      35,
      'Utilities',
      5,
      1,
      'subscription',
    ]);
    database.run('INSERT INTO variable_expenses (id, name, amount, category, date, monthKey) VALUES (?, ?, ?, ?, ?, ?)', [
      crypto.randomUUID(),
      'Groceries',
      120,
      'Food',
      new Date().toISOString().slice(0, 10),
      emptySnapshot.settings.activeMonthKey,
    ]);
  }

  private async upsertSetting(key: string, value: string): Promise<void> {
    await this.runWithTransaction(() => {
      this.requireDatabase().run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    });
  }

  private async runWithTransaction(action: () => void): Promise<void> {
    await this.initialize();
    const database = this.requireDatabase();
    database.run('BEGIN IMMEDIATE');
    try {
      action();
      database.run('COMMIT');
    } catch (error) {
      database.run('ROLLBACK');
      throw error;
    }
    // Outside the try: once COMMIT succeeded there is no transaction left to roll back, and a
    // failed ROLLBACK would otherwise hide the real disk error behind "no transaction is active".
    await this.persist();
  }

  private persist(): Promise<void> {
    if (this.ephemeral) {
      return Promise.resolve();
    }

    const run = async () => {
      // Exported when the write actually starts, so it always carries the latest committed state.
      const data = this.requireDatabase().export();
      await writeFileAtomic(this.databasePath, data);
      await this.onPersist?.(data);
    };
    const next = this.persistChain.then(run, run);
    this.persistChain = next.catch(() => undefined);
    return next;
  }

  private requireDatabase(): SqlJsDatabase {
    if (!this.database) {
      throw new Error('ERR_STORE_NOT_INITIALIZED');
    }

    return this.database;
  }

  private readSingleNumber(rows: ReturnType<SqlJsDatabase['exec']>, columnIndex: number): number {
    const value = rows[0]?.values[0]?.[columnIndex];
    return typeof value === 'number' ? value : Number(value ?? 0);
  }

  private readSingleText(rows: ReturnType<SqlJsDatabase['exec']>, columnIndex: number): string {
    const value = rows[0]?.values[0]?.[columnIndex];
    return typeof value === 'string' ? value : String(value ?? '');
  }

  private readFixedExpenses(rows: ReturnType<SqlJsDatabase['exec']>): FixedExpense[] {
    const result: FixedExpense[] = [];
    const values = rows[0]?.values ?? [];
    for (const row of values) {
      result.push(
        sanitizeFixedExpense({
          id: String(row[0]),
          name: String(row[1]),
          amount: Number(row[2]),
          category: String(row[3]),
          dayOfMonth: row[4] === null ? null : Number(row[4]),
          active: Boolean(row[5]),
          kind: row[6] === 'directDebit' ? 'directDebit' : 'subscription',
        }),
      );
    }
    return result;
  }

  private readVariableExpenses(rows: ReturnType<SqlJsDatabase['exec']>): VariableExpense[] {
    const result: VariableExpense[] = [];
    const values = rows[0]?.values ?? [];
    for (const row of values) {
      result.push(
        sanitizeVariableExpense({
          id: String(row[0]),
          name: String(row[1]),
          amount: Number(row[2]),
          category: String(row[3]),
          date: String(row[4]),
          monthKey: String(row[5]),
          budgetId: row[6] === null || row[6] === undefined ? null : String(row[6]),
        }),
      );
    }
    return result;
  }

  private readBudgets(): Budget[] {
    const rows = this.requireDatabase().exec('SELECT id, name, scale, parentId, amount, period, startDate, endDate, countsInMonth FROM budgets ORDER BY rowid');
    return (rows[0]?.values ?? []).map((row) =>
      sanitizeBudget({
        id: String(row[0]),
        name: String(row[1]),
        scale: String(row[2]) as Budget['scale'],
        parentId: row[3] === null ? null : String(row[3]),
        amount: Number(row[4]),
        period: String(row[5]) as Budget['period'],
        startDate: row[6] === null ? null : String(row[6]),
        endDate: row[7] === null ? null : String(row[7]),
        countsInMonth: Boolean(row[8]),
      }),
    );
  }

  private readWallets(): Wallet[] {
    const rows = this.requireDatabase().exec('SELECT id, name, goal FROM wallets ORDER BY rowid');
    return (rows[0]?.values ?? []).map((row) => sanitizeWallet({ id: String(row[0]), name: String(row[1]), goal: row[2] === null ? null : Number(row[2]) }));
  }

  private readWalletMovements(): WalletMovement[] {
    const rows = this.requireDatabase().exec('SELECT id, walletId, amount, label, date FROM wallet_movements ORDER BY date DESC, rowid DESC');
    return (rows[0]?.values ?? []).map((row) => sanitizeWalletMovement({ id: String(row[0]), walletId: String(row[1]), amount: Number(row[2]), label: String(row[3]), date: String(row[4]) }));
  }

  private readLoans(rows: ReturnType<SqlJsDatabase['exec']>): Loan[] {
    const result: Loan[] = [];
    const values = rows[0]?.values ?? [];
    for (const row of values) {
      result.push(
        sanitizeLoan({
          id: String(row[0]),
          name: String(row[1]),
          principal: Number(row[2]),
          monthlyPayment: Number(row[3]),
          interestRate: Number(row[4]),
          remainingMonths: row[5] === null ? null : Number(row[5]),
          active: Boolean(row[6]),
        }),
      );
    }
    return result;
  }

  private assertNonNegative(value: number): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error('ERR_NEGATIVE_AMOUNT');
    }
  }

  private assertName(name: unknown): void {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('ERR_INVALID_NAME');
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
