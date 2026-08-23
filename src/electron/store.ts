import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import type { BackupFile, BudgetSnapshot, FixedExpense, Loan, VariableExpense } from '../shared/types';
import {
  createEmptySnapshot,
  sanitizeFixedExpense,
  sanitizeLoan,
  sanitizeVariableExpense,
  validateBackupFile,
} from '../shared/budget';

const DATABASE_FILE_NAME = 'finterest.sqlite';
const BACKUP_FILE_VERSION = 1;

export class BudgetStore {
  private database: SqlJsDatabase | null = null;
  private readonly databasePath: string;
  private readonly ephemeral: boolean;
  private readonly sqlJsPromise: Promise<Awaited<ReturnType<typeof initSqlJs>>>;

  constructor(databasePath?: string, options?: { ephemeral?: boolean }) {
    this.ephemeral = options?.ephemeral ?? false;
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
    const variableRows = database.exec('SELECT id, name, amount, category, date, monthKey FROM variable_expenses ORDER BY date DESC, name');
    const loanRows = database.exec('SELECT id, name, principal, monthlyPayment, interestRate, remainingMonths, active FROM loans ORDER BY name');

    return {
      settings: {
        income: this.readSingleNumber(incomeRow, 0),
        activeMonthKey: this.readSingleText(monthKeyRow, 0) || createEmptySnapshot().settings.activeMonthKey,
      },
      fixedExpenses: this.readFixedExpenses(fixedRows),
      variableExpenses: this.readVariableExpenses(variableRows),
      loans: this.readLoans(loanRows),
    };
  }

  async saveIncome(income: number): Promise<BudgetSnapshot> {
    this.assertNonNegative(income);
    await this.upsertSetting('income', String(income));
    return this.getSnapshot();
  }

  async saveMonthKey(monthKey: string): Promise<BudgetSnapshot> {
    await this.upsertSetting('activeMonthKey', monthKey);
    return this.getSnapshot();
  }

  async addFixedExpense(expense: Partial<FixedExpense> & { name: string; amount: number; category: string; active?: boolean }): Promise<BudgetSnapshot> {
    this.assertNonNegative(expense.amount);
    const fixedExpense: FixedExpense = sanitizeFixedExpense({
      id: expense.id ?? crypto.randomUUID(),
      name: expense.name.trim(),
      amount: Number(expense.amount),
      category: expense.category.trim(),
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

  async addVariableExpense(expense: Partial<VariableExpense> & { name: string; amount: number; category: string; date: string; monthKey: string }): Promise<BudgetSnapshot> {
    this.assertNonNegative(expense.amount);
    const variableExpense: VariableExpense = sanitizeVariableExpense({
      id: expense.id ?? crypto.randomUUID(),
      name: expense.name.trim(),
      amount: Number(expense.amount),
      category: expense.category.trim(),
      date: expense.date,
      monthKey: expense.monthKey,
    });

    await this.runWithTransaction(() => {
      this.requireDatabase().run(
        'INSERT OR REPLACE INTO variable_expenses (id, name, amount, category, date, monthKey) VALUES (?, ?, ?, ?, ?, ?)',
        [variableExpense.id, variableExpense.name, variableExpense.amount, variableExpense.category, variableExpense.date, variableExpense.monthKey],
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

  async addLoan(loan: Partial<Loan> & { name: string; principal: number; monthlyPayment: number }): Promise<BudgetSnapshot> {
    this.assertNonNegative(loan.principal);
    this.assertNonNegative(loan.monthlyPayment);
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

  async importBackup(backup: BackupFile): Promise<BudgetSnapshot> {
    const errors = validateBackupFile(backup);
    if (errors.length > 0) {
      throw new Error('ERR_INVALID_BACKUP');
    }

    await this.initialize();
    await this.runWithTransaction(() => {
      const database = this.requireDatabase();
      database.run('DELETE FROM settings');
      database.run('DELETE FROM fixed_expenses');
      database.run('DELETE FROM variable_expenses');
      database.run('DELETE FROM loans');

      database.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['income', String(backup.snapshot.settings.income)]);
      database.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['activeMonthKey', backup.snapshot.settings.activeMonthKey]);

      for (const expense of backup.snapshot.fixedExpenses) {
        const fixedExpense = sanitizeFixedExpense(expense);
        database.run(
          'INSERT INTO fixed_expenses (id, name, amount, category, dayOfMonth, active, kind) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [fixedExpense.id, fixedExpense.name, fixedExpense.amount, fixedExpense.category, fixedExpense.dayOfMonth, fixedExpense.active ? 1 : 0, fixedExpense.kind],
        );
      }

      for (const expense of backup.snapshot.variableExpenses) {
        const variableExpense = sanitizeVariableExpense(expense);
        database.run(
          'INSERT INTO variable_expenses (id, name, amount, category, date, monthKey) VALUES (?, ?, ?, ?, ?, ?)',
          [variableExpense.id, variableExpense.name, variableExpense.amount, variableExpense.category, variableExpense.date, variableExpense.monthKey],
        );
      }

      for (const loan of backup.snapshot.loans ?? []) {
        const sanitizedLoan = sanitizeLoan(loan);
        database.run(
          'INSERT INTO loans (id, name, principal, monthlyPayment, interestRate, remainingMonths, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [sanitizedLoan.id, sanitizedLoan.name, sanitizedLoan.principal, sanitizedLoan.monthlyPayment, sanitizedLoan.interestRate, sanitizedLoan.remainingMonths, sanitizedLoan.active ? 1 : 0],
        );
      }
    });

    return this.getSnapshot();
  }

  getDatabasePath(): string {
    return this.databasePath;
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
    const database = this.requireDatabase();
    try {
      database.run('BEGIN IMMEDIATE');
      action();
      database.run('COMMIT');
      await this.persist();
    } catch (error) {
      database.run('ROLLBACK');
      throw error;
    }
  }

  private async persist(): Promise<void> {
    if (this.ephemeral) {
      return;
    }

    const database = this.requireDatabase();
    const data = database.export();
    await fs.mkdir(path.dirname(this.databasePath), { recursive: true });
    await fs.writeFile(this.databasePath, Buffer.from(data));
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
        }),
      );
    }
    return result;
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

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
