import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import type { BackupFile, BudgetSnapshot, FixedExpense, VariableExpense } from '../shared/types';
import {
  createEmptySnapshot,
  isValidBudgetSnapshot,
  sanitizeFixedExpense,
  sanitizeVariableExpense,
  validateBackupFile,
} from '../shared/budget';

const DATABASE_FILE_NAME = 'finterest.sqlite';
const BACKUP_FILE_VERSION = 1;

export class BudgetStore {
  private database: SqlJsDatabase | null = null;
  private readonly databasePath: string;
  private readonly sqlJsPromise: Promise<Awaited<ReturnType<typeof initSqlJs>>>;

  constructor(databasePath?: string) {
    this.databasePath = databasePath ?? path.join(app.getPath('userData'), DATABASE_FILE_NAME);
    this.sqlJsPromise = initSqlJs({
      locateFile: (fileName: string) => path.join(path.dirname(require.resolve('sql.js/dist/sql-wasm.wasm')), fileName),
    });
  }

  async initialize(): Promise<void> {
    if (this.database) {
      return;
    }

    const sqlJs = await this.sqlJsPromise;
    if (await this.fileExists(this.databasePath)) {
      const fileBuffer = await fs.readFile(this.databasePath);
      this.database = new sqlJs.Database(fileBuffer);
    } else {
      this.database = new sqlJs.Database();
    }

    this.createSchema();
    await this.ensureSeedData();
    await this.persist();
  }

  async getSnapshot(): Promise<BudgetSnapshot> {
    await this.initialize();
    const database = this.requireDatabase();

    const incomeRow = database.exec("SELECT value FROM settings WHERE key = 'income'");
    const monthKeyRow = database.exec("SELECT value FROM settings WHERE key = 'activeMonthKey'");
    const fixedRows = database.exec('SELECT id, name, amount, category, dayOfMonth, active FROM fixed_expenses ORDER BY name');
    const variableRows = database.exec('SELECT id, name, amount, category, date, monthKey FROM variable_expenses ORDER BY date DESC, name');

    return {
      settings: {
        income: this.readSingleNumber(incomeRow, 0),
        activeMonthKey: this.readSingleText(monthKeyRow, 0) || createEmptySnapshot().settings.activeMonthKey,
      },
      fixedExpenses: this.readFixedExpenses(fixedRows),
      variableExpenses: this.readVariableExpenses(variableRows),
    };
  }

  async saveIncome(income: number): Promise<BudgetSnapshot> {
    this.assertNonNegative(income, 'income');
    await this.upsertSetting('income', String(income));
    return this.getSnapshot();
  }

  async saveMonthKey(monthKey: string): Promise<BudgetSnapshot> {
    await this.upsertSetting('activeMonthKey', monthKey);
    return this.getSnapshot();
  }

  async addFixedExpense(expense: Partial<FixedExpense> & { name: string; amount: number; category: string; active?: boolean }): Promise<BudgetSnapshot> {
    this.assertNonNegative(expense.amount, 'amount');
    const fixedExpense: FixedExpense = sanitizeFixedExpense({
      id: expense.id ?? crypto.randomUUID(),
      name: expense.name.trim(),
      amount: Number(expense.amount),
      category: expense.category.trim(),
      dayOfMonth: expense.dayOfMonth ?? null,
      active: expense.active ?? true,
    });

    await this.runWithTransaction(() => {
      this.requireDatabase().run(
        'INSERT OR REPLACE INTO fixed_expenses (id, name, amount, category, dayOfMonth, active) VALUES (?, ?, ?, ?, ?, ?)',
        [fixedExpense.id, fixedExpense.name, fixedExpense.amount, fixedExpense.category, fixedExpense.dayOfMonth, fixedExpense.active ? 1 : 0],
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
    this.assertNonNegative(expense.amount, 'amount');
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
      throw new Error(errors.join(' '));
    }

    await this.initialize();
    await this.runWithTransaction(() => {
      const database = this.requireDatabase();
      database.run('DELETE FROM settings');
      database.run('DELETE FROM fixed_expenses');
      database.run('DELETE FROM variable_expenses');

      database.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['income', String(backup.snapshot.settings.income)]);
      database.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['activeMonthKey', backup.snapshot.settings.activeMonthKey]);

      for (const expense of backup.snapshot.fixedExpenses) {
        const fixedExpense = sanitizeFixedExpense(expense);
        database.run(
          'INSERT INTO fixed_expenses (id, name, amount, category, dayOfMonth, active) VALUES (?, ?, ?, ?, ?, ?)',
          [fixedExpense.id, fixedExpense.name, fixedExpense.amount, fixedExpense.category, fixedExpense.dayOfMonth, fixedExpense.active ? 1 : 0],
        );
      }

      for (const expense of backup.snapshot.variableExpenses) {
        const variableExpense = sanitizeVariableExpense(expense);
        database.run(
          'INSERT INTO variable_expenses (id, name, amount, category, date, monthKey) VALUES (?, ?, ?, ?, ?, ?)',
          [variableExpense.id, variableExpense.name, variableExpense.amount, variableExpense.category, variableExpense.date, variableExpense.monthKey],
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
    `);
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

    database.run('INSERT INTO fixed_expenses (id, name, amount, category, dayOfMonth, active) VALUES (?, ?, ?, ?, ?, ?)', [
      crypto.randomUUID(),
      'Rent',
      850,
      'Housing',
      1,
      1,
    ]);
    database.run('INSERT INTO fixed_expenses (id, name, amount, category, dayOfMonth, active) VALUES (?, ?, ?, ?, ?, ?)', [
      crypto.randomUUID(),
      'Internet',
      35,
      'Utilities',
      5,
      1,
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
    const database = this.requireDatabase();
    const data = database.export();
    await fs.mkdir(path.dirname(this.databasePath), { recursive: true });
    await fs.writeFile(this.databasePath, Buffer.from(data));
  }

  private requireDatabase(): SqlJsDatabase {
    if (!this.database) {
      throw new Error('Budget store has not been initialized.');
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

  private assertNonNegative(value: number, fieldName: string): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${fieldName} must be a non-negative number.`);
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
