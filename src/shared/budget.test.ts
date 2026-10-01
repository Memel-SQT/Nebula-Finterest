import {
  computeBudgetSummary,
  createEmptySnapshot,
  extractBackupSnapshot,
  formatLocalDate,
  getCalendarEntries,
  getMonthKey,
  isValidDateString,
  isValidMonthKey,
  normalizeSnapshot,
  parseAmount,
  sanitizeFixedExpense,
  validateBackupFile,
} from './budget';
import type { BackupFile, BudgetSnapshot, FixedExpense } from './types';

describe('budget calculations', () => {
  it('totals active fixed expenses, matching month variable expenses, and active loan payments', () => {
    const snapshot = createEmptySnapshot();
    snapshot.settings.income = 3000;
    snapshot.fixedExpenses = [
      { id: 'fixed-1', name: 'Rent', amount: 900, category: 'Housing', dayOfMonth: 1, active: true, kind: 'directDebit' },
      { id: 'fixed-2', name: 'Gym', amount: 40, category: 'Health', dayOfMonth: 10, active: false, kind: 'subscription' },
    ];
    snapshot.variableExpenses = [
      { id: 'var-1', name: 'Groceries', amount: 120, category: 'Food', date: '2026-08-01', monthKey: '2026-08' },
      { id: 'var-2', name: 'Coffee', amount: 15, category: 'Food', date: '2026-07-31', monthKey: '2026-07' },
    ];
    snapshot.loans = [
      { id: 'loan-1', name: 'Car loan', principal: 12000, monthlyPayment: 250, interestRate: 3.5, remainingMonths: 36, active: true },
      { id: 'loan-2', name: 'Paid off loan', principal: 5000, monthlyPayment: 100, interestRate: 2, remainingMonths: 0, active: false },
    ];

    const summary = computeBudgetSummary(snapshot, '2026-08');

    expect(summary.income).toBe(3000);
    expect(summary.totalFixedExpenses).toBe(900);
    expect(summary.totalVariableExpenses).toBe(120);
    expect(summary.totalLoanPayments).toBe(250);
    expect(summary.totalExpenses).toBe(1270);
    expect(summary.remainingIncome).toBe(1730);
  });

  it('uses the current month key format', () => {
    expect(getMonthKey(new Date('2026-08-22T00:00:00.000Z'))).toBe('2026-08');
  });

  it('defaults fixed expense kind to subscription when missing or invalid', () => {
    const raw = { id: 'fixed-3', name: 'Old record', amount: 10, category: 'Misc', dayOfMonth: null, active: true } as unknown as FixedExpense;
    expect(sanitizeFixedExpense(raw).kind).toBe('subscription');
  });

  it('clamps an out-of-range day of month', () => {
    const base = { id: 'f', name: 'x', amount: 1, category: '', active: true, kind: 'subscription' } as const;
    expect(sanitizeFixedExpense({ ...base, dayOfMonth: 45 }).dayOfMonth).toBe(31);
    expect(sanitizeFixedExpense({ ...base, dayOfMonth: -3 }).dayOfMonth).toBe(1);
  });
});

describe('input parsing and dates', () => {
  it('parses amounts typed the French way', () => {
    expect(parseAmount('12,50')).toBe(12.5);
    expect(parseAmount('1 234,56 €')).toBe(1234.56);
    expect(parseAmount('1 234,5')).toBe(1234.5);
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('99.9')).toBe(99.9);
    expect(parseAmount('12,')).toBe(12);
    expect(parseAmount(42)).toBe(42);
    expect(parseAmount('')).toBeNaN();
    expect(parseAmount('abc')).toBeNaN();
    expect(parseAmount('1,2,3')).toBeNaN();
  });

  it('formats the local date, not the UTC one', () => {
    expect(formatLocalDate(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01');
  });

  it('validates month keys and dates', () => {
    expect(isValidMonthKey('2026-09')).toBe(true);
    expect(isValidMonthKey('2026-13')).toBe(false);
    expect(isValidMonthKey('')).toBe(false);
    expect(isValidDateString('2026-02-29')).toBe(false);
    expect(isValidDateString('2028-02-29')).toBe(true);
    expect(isValidDateString('2026-09-31')).toBe(false);
  });
});

describe('calendar entries', () => {
  const snapshot: BudgetSnapshot = {
    settings: { income: 0, activeMonthKey: '2026-02' },
    fixedExpenses: [
      { id: 'rent', name: 'Rent', amount: 800, category: 'Logement', dayOfMonth: 5, active: true, kind: 'directDebit' },
      { id: 'end', name: 'End of month', amount: 20, category: '', dayOfMonth: 31, active: true, kind: 'subscription' },
      { id: 'off', name: 'Paused', amount: 9, category: '', dayOfMonth: 5, active: false, kind: 'subscription' },
      { id: 'noday', name: 'No day', amount: 9, category: '', dayOfMonth: null, active: true, kind: 'subscription' },
    ],
    variableExpenses: [
      { id: 'tv', name: 'TV', amount: 400, category: 'Maison', date: '2026-02-05', monthKey: '2026-02' },
      { id: 'other-month', name: 'Shoes', amount: 60, category: '', date: '2026-03-05', monthKey: '2026-03' },
    ],
    loans: [],
  };

  it('puts recurring charges and one-off purchases on their day', () => {
    const entries = getCalendarEntries(snapshot, '2026-02');
    expect(entries.get(5)?.map((entry) => `${entry.source}:${entry.id}`)).toEqual(['fixed:rent', 'purchase:tv']);
  });

  it('moves a charge set on the 31st to the last day of a shorter month', () => {
    expect(getCalendarEntries(snapshot, '2026-02').get(28)?.map((entry) => entry.id)).toEqual(['end']);
    expect(getCalendarEntries(snapshot, '2026-03').get(31)?.map((entry) => entry.id)).toEqual(['end']);
  });

  it('skips inactive charges, charges without a day, and purchases from other months', () => {
    const ids = Array.from(getCalendarEntries(snapshot, '2026-02').values()).flat().map((entry) => entry.id);
    expect(ids).not.toContain('off');
    expect(ids).not.toContain('noday');
    expect(ids).not.toContain('other-month');
  });

  it('returns nothing for an invalid month', () => {
    expect(getCalendarEntries(snapshot, '').size).toBe(0);
  });
});

/**
 * The app auto-updates over existing installs, so every backup shape written by a released
 * version must keep importing. These fixtures mirror what older versions actually wrote.
 */
describe('backward-compatible backups', () => {
  const v0_1_2x: unknown = {
    app: 'Finterest',
    version: 1,
    exportedAt: '2026-05-01T10:00:00.000Z',
    snapshot: {
      settings: { income: 2100, activeMonthKey: '2026-05' },
      // Before `kind` existed, and before loans existed at all.
      fixedExpenses: [{ id: 'a', name: 'Loyer', amount: 700, category: 'Logement', dayOfMonth: 1, active: true }],
      variableExpenses: [{ id: 'b', name: 'Courses', amount: 90, category: 'Food', date: '2026-05-03', monthKey: '2026-05' }],
    },
  };

  const accountBackup: unknown = {
    app: 'Finterest',
    version: 1,
    exportedAt: '2026-08-01T10:00:00.000Z',
    account: { name: 'Noa', pinHash: 'x', pinSalt: 'y' },
    snapshot: { settings: { income: 1500, activeMonthKey: '2026-08' }, fixedExpenses: [], variableExpenses: [], loans: [{ id: 'l', name: 'Auto', principal: 5000, monthlyPayment: 150, interestRate: 2, remainingMonths: 30, active: true }] },
  };

  const uninstallBackup: unknown = {
    app: 'Finterest',
    version: 1,
    exportedAt: '2026-08-10T10:00:00.000Z',
    accounts: [
      { name: 'Alice', snapshot: { settings: { income: 1, activeMonthKey: '2026-08' }, fixedExpenses: [], variableExpenses: [], loans: [] } },
      { name: 'Bob', snapshot: { settings: { income: 2, activeMonthKey: '2026-08' }, fixedExpenses: [], variableExpenses: [], loans: [] } },
    ],
  };

  it('still validates older backup files the way it always did', () => {
    expect(validateBackupFile(v0_1_2x as BackupFile)).toEqual([]);
    expect(validateBackupFile(null as unknown as BackupFile)).toHaveLength(1);
  });

  it('imports a pre-loans, pre-kind backup', () => {
    const snapshot = extractBackupSnapshot(v0_1_2x);
    expect(snapshot?.settings.income).toBe(2100);
    expect(snapshot?.fixedExpenses[0]).toMatchObject({ id: 'a', kind: 'subscription', dayOfMonth: 1, active: true });
    expect(snapshot?.loans).toEqual([]);
  });

  it('imports a manual account export', () => {
    expect(extractBackupSnapshot(accountBackup)?.loans[0].monthlyPayment).toBe(150);
  });

  it('imports the matching account from an uninstall backup', () => {
    expect(extractBackupSnapshot(uninstallBackup, 'Bob')?.settings.income).toBe(2);
    expect(extractBackupSnapshot(uninstallBackup, 'Nobody')).toBeNull();
  });

  it('rejects files that are not Finterest backups', () => {
    expect(extractBackupSnapshot({ app: 'Other', version: 1, snapshot: {} })).toBeNull();
    expect(extractBackupSnapshot('not an object')).toBeNull();
    expect(extractBackupSnapshot({ app: 'Finterest', version: 2, snapshot: (v0_1_2x as { snapshot: unknown }).snapshot })).toBeNull();
  });

  it('repairs missing or duplicate ids and bad values instead of failing the import', () => {
    let counter = 0;
    const snapshot = normalizeSnapshot(
      {
        settings: { income: -5, activeMonthKey: 'garbage' },
        fixedExpenses: [
          { id: 'dup', name: 'A', amount: '12' as unknown as number, category: 'x', dayOfMonth: null, active: true, kind: 'subscription' },
          { id: 'dup', name: 'B', amount: 3, category: 'x', dayOfMonth: 2, active: true, kind: 'directDebit' },
          null as unknown as FixedExpense,
        ],
        variableExpenses: [{ name: 'No id', amount: 4, category: '', date: '2026-04-02' } as never],
        loans: undefined as never,
      },
      () => `generated-${(counter += 1)}`,
    );
    expect(snapshot.fixedExpenses.map((expense) => expense.id)).toEqual(['dup', 'generated-1']);
    expect(snapshot.fixedExpenses[0].amount).toBe(12);
    expect(snapshot.variableExpenses[0]).toMatchObject({ id: 'generated-2', monthKey: '2026-04' });
    expect(snapshot.settings.income).toBe(0);
    expect(isValidMonthKey(snapshot.settings.activeMonthKey)).toBe(true);
    expect(snapshot.loans).toEqual([]);
  });
});
