/**
 * @jest-environment node
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import initSqlJs from 'sql.js';

let mockUserData = '';
jest.mock('electron', () => ({ app: { getPath: () => mockUserData } }));

// Imported after the mock so the store sees the fake `app`.
import { BudgetStore } from '../../src/electron/store';

async function tempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'finterest-store-'));
}

/** Builds a database exactly as v0.1.2x left it: no `kind` column, no `loans` table. */
async function writeLegacyDatabase(filePath: string): Promise<void> {
  const SQL = await initSqlJs();
  const database = new SQL.Database();
  database.run(`
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE fixed_expenses (id TEXT PRIMARY KEY, name TEXT NOT NULL, amount REAL NOT NULL, category TEXT NOT NULL, dayOfMonth INTEGER, active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE variable_expenses (id TEXT PRIMARY KEY, name TEXT NOT NULL, amount REAL NOT NULL, category TEXT NOT NULL, date TEXT NOT NULL, monthKey TEXT NOT NULL);
  `);
  database.run("INSERT INTO settings VALUES ('income', '1900'), ('activeMonthKey', '2026-04')");
  database.run("INSERT INTO fixed_expenses VALUES ('f1', 'Loyer', 650, 'Logement', 3, 1)");
  database.run("INSERT INTO variable_expenses VALUES ('v1', 'Vélo', 300, 'Transport', '2026-04-12', '2026-04')");
  await fs.writeFile(filePath, Buffer.from(database.export()));
}

describe('BudgetStore', () => {
  beforeEach(async () => {
    mockUserData = await tempDir();
  });

  afterEach(async () => {
    await fs.rm(mockUserData, { recursive: true, force: true });
  });

  it('opens a database written by an old version without losing anything', async () => {
    const databasePath = path.join(mockUserData, 'finterest-legacy.sqlite');
    await writeLegacyDatabase(databasePath);

    const store = new BudgetStore(databasePath);
    const snapshot = await store.getSnapshot();

    expect(snapshot.settings).toEqual({ income: 1900, activeMonthKey: '2026-04' });
    expect(snapshot.fixedExpenses).toEqual([{ id: 'f1', name: 'Loyer', amount: 650, category: 'Logement', dayOfMonth: 3, active: true, kind: 'subscription' }]);
    expect(snapshot.variableExpenses[0]).toMatchObject({ id: 'v1', date: '2026-04-12' });
    expect(snapshot.loans).toEqual([]);

    // And the migrated file can be written to and read back.
    await store.addLoan({ name: 'Auto', principal: 1000, monthlyPayment: 50 });
    const reopened = await new BudgetStore(databasePath).getSnapshot();
    expect(reopened.loans).toHaveLength(1);
    expect(reopened.fixedExpenses[0].name).toBe('Loyer');
  });

  it('derives the month of a purchase from its date and rejects invalid input', async () => {
    const store = new BudgetStore(path.join(mockUserData, 'a.sqlite'));
    const snapshot = await store.addVariableExpense({ name: 'Cadeau', amount: 30, category: '', date: '2026-12-24', monthKey: '1999-01' });
    expect(snapshot.variableExpenses.find((expense) => expense.name === 'Cadeau')?.monthKey).toBe('2026-12');

    await expect(store.addVariableExpense({ name: '  ', amount: 1, category: '', date: '2026-12-24' })).rejects.toThrow('ERR_INVALID_NAME');
    await expect(store.addVariableExpense({ name: 'x', amount: 1, category: '', date: '2026-02-30' })).rejects.toThrow('ERR_INVALID_DATE');
    await expect(store.addFixedExpense({ name: 'x', amount: -1, category: '' })).rejects.toThrow('ERR_NEGATIVE_AMOUNT');
    await expect(store.saveMonthKey('')).rejects.toThrow('ERR_INVALID_MONTH');
  });

  it('imports an old backup inside one transaction and keeps the data on failure', async () => {
    const store = new BudgetStore(path.join(mockUserData, 'b.sqlite'));
    await store.saveIncome(1234);

    await expect(store.importBackup({ app: 'Finterest', version: 1, snapshot: 'broken' })).rejects.toThrow('ERR_INVALID_BACKUP');
    expect((await store.getSnapshot()).settings.income).toBe(1234);

    const restored = await store.importBackup({
      app: 'Finterest',
      version: 1,
      exportedAt: '2026-05-01T00:00:00.000Z',
      snapshot: {
        settings: { income: 2100, activeMonthKey: '2026-05' },
        fixedExpenses: [{ id: 'a', name: 'Loyer', amount: 700, category: 'Logement', dayOfMonth: 1, active: true }],
        variableExpenses: [],
      },
    });
    expect(restored.settings.income).toBe(2100);
    expect(restored.fixedExpenses[0].kind).toBe('subscription');
  });

  it('reports every write to the sync hook, in order', async () => {
    const writes: number[] = [];
    const store = new BudgetStore(path.join(mockUserData, 'c.sqlite'), { onPersist: async (data) => { writes.push(data.length); } });
    await store.initialize();
    await Promise.all([store.saveIncome(1), store.saveIncome(2), store.saveIncome(3)]);
    await store.flush();
    expect(writes.length).toBeGreaterThanOrEqual(4);
    expect((await new BudgetStore(path.join(mockUserData, 'c.sqlite')).getSnapshot()).settings.income).toBe(3);
  });

  it('never touches the disk in guest mode', async () => {
    const store = new BudgetStore(undefined, { ephemeral: true });
    await store.saveIncome(99);
    expect(await fs.readdir(mockUserData)).toEqual([]);
  });
});

describe('BudgetStore budgets and pots (v0.1.41)', () => {
  beforeEach(async () => {
    mockUserData = await tempDir();
  });

  afterEach(async () => {
    await fs.rm(mockUserData, { recursive: true, force: true });
  });

  it('adds the budget column and tables to a database written before budgets existed', async () => {
    const databasePath = path.join(mockUserData, 'finterest-legacy.sqlite');
    await writeLegacyDatabase(databasePath);
    const snapshot = await new BudgetStore(databasePath).getSnapshot();
    expect(snapshot.budgets).toEqual([]);
    expect(snapshot.wallets).toEqual([]);
    expect(snapshot.walletMovements).toEqual([]);
    expect(snapshot.variableExpenses[0]).toMatchObject({ id: 'v1', budgetId: null });
  });

  it('creates budgets and sub-envelopes that inherit their root, and rejects invalid ones', async () => {
    const store = new BudgetStore(path.join(mockUserData, 'b.sqlite'));
    let snapshot = await store.saveBudget({ id: 'japon', name: 'Japon', scale: 'project', amount: 3000, period: 'range', startDate: '2026-10-20', endDate: '2026-11-05', countsInMonth: false });
    snapshot = await store.saveBudget({ id: 'avion', name: 'Avion', amount: 900, parentId: 'japon', period: 'month', countsInMonth: true });
    expect(snapshot.budgets!.find((budget) => budget.id === 'avion')).toMatchObject({ scale: 'project', period: 'range', startDate: '2026-10-20', countsInMonth: false });

    await expect(store.saveBudget({ name: ' ', amount: 10 })).rejects.toThrow('ERR_INVALID_NAME');
    await expect(store.saveBudget({ name: 'x', amount: -5 })).rejects.toThrow('ERR_NEGATIVE_AMOUNT');
    await expect(store.saveBudget({ name: 'x', amount: 5, period: 'range', startDate: '2026-10-20' })).rejects.toThrow('ERR_INVALID_DATE');
    await expect(store.saveBudget({ name: 'x', amount: 5, parentId: 'avion' })).rejects.toThrow('ERR_INVALID_BUDGET');
    await expect(store.addVariableExpense({ name: 'x', amount: 5, category: '', date: '2026-10-01', budgetId: 'missing' })).rejects.toThrow('ERR_INVALID_BUDGET');

    // Editing the root carries its period to the sub-envelopes.
    snapshot = await store.saveBudget({ id: 'japon', name: 'Japon', scale: 'project', amount: 3200, period: 'open', countsInMonth: true });
    expect(snapshot.budgets!.find((budget) => budget.id === 'avion')).toMatchObject({ period: 'open', startDate: null, countsInMonth: true });
  });

  it('keeps real purchases when a budget is deleted, and drops forecast ones', async () => {
    const store = new BudgetStore(path.join(mockUserData, 'd.sqlite'));
    await store.saveBudget({ id: 'courses', name: 'Courses', amount: 300, period: 'month', countsInMonth: true });
    await store.saveBudget({ id: 'projet', name: 'Projet', scale: 'project', amount: 1000, period: 'open', countsInMonth: false });
    await store.saveBudget({ id: 'part', name: 'Partie', amount: 200, parentId: 'projet' });
    await store.addVariableExpense({ id: 'real', name: 'Marché', amount: 40, category: '', date: '2026-10-02', budgetId: 'courses' });
    await store.addVariableExpense({ id: 'plan', name: 'Matériel', amount: 150, category: '', date: '2026-10-02', budgetId: 'part' });

    let snapshot = await store.deleteBudget('courses');
    expect(snapshot.variableExpenses.find((expense) => expense.id === 'real')).toMatchObject({ budgetId: null });
    snapshot = await store.deleteBudget('projet');
    expect(snapshot.variableExpenses.find((expense) => expense.id === 'plan')).toBeUndefined();
    expect(snapshot.budgets).toEqual([]);
  });

  it('manages pots and their movements', async () => {
    const store = new BudgetStore(path.join(mockUserData, 'w.sqlite'));
    await store.saveWallet({ id: 'w', name: 'Vacances', goal: 800 });
    await store.addWalletMovement({ walletId: 'w', amount: 300, label: 'Versement', date: '2026-09-01' });
    let snapshot = await store.addWalletMovement({ walletId: 'w', amount: -120, label: 'Retrait', date: '2026-10-01' });
    expect(snapshot.walletMovements!.reduce((sum, movement) => sum + movement.amount, 0)).toBe(180);

    await expect(store.addWalletMovement({ walletId: 'w', amount: 0, date: '2026-10-01' })).rejects.toThrow('ERR_NEGATIVE_AMOUNT');
    await expect(store.addWalletMovement({ walletId: 'nope', amount: 5, date: '2026-10-01' })).rejects.toThrow('ERR_INVALID_WALLET');
    await expect(store.addWalletMovement({ walletId: 'w', amount: 5, date: '2026-02-30' })).rejects.toThrow('ERR_INVALID_DATE');
    await expect(store.saveWallet({ name: '' })).rejects.toThrow('ERR_INVALID_NAME');

    snapshot = await store.deleteWallet('w');
    expect(snapshot.wallets).toEqual([]);
    expect(snapshot.walletMovements).toEqual([]);
  });

  it('carries budgets and pots through a backup and its import', async () => {
    const source = new BudgetStore(path.join(mockUserData, 'src.sqlite'));
    await source.saveBudget({ id: 'b', name: 'Loisirs', amount: 120, period: 'month' });
    await source.addVariableExpense({ id: 'e', name: 'Cinéma', amount: 12, category: '', date: '2026-10-04', budgetId: 'b' });
    await source.saveWallet({ id: 'w', name: 'Coup dur', goal: null });
    await source.addWalletMovement({ id: 'm', walletId: 'w', amount: 50, label: '', date: '2026-10-04' });
    const backup = await source.exportBackup();

    const target = new BudgetStore(path.join(mockUserData, 'dst.sqlite'));
    const restored = await target.importBackup(JSON.parse(JSON.stringify(backup)));
    expect(restored.budgets).toEqual([expect.objectContaining({ id: 'b', name: 'Loisirs', amount: 120 })]);
    expect(restored.variableExpenses.find((expense) => expense.id === 'e')?.budgetId).toBe('b');
    expect(restored.wallets).toEqual([{ id: 'w', name: 'Coup dur', goal: null }]);
    expect(restored.walletMovements).toEqual([expect.objectContaining({ id: 'm', amount: 50 })]);
  });
});
