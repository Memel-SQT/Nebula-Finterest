import { computeBudgetSummary, createEmptySnapshot, getMonthKey } from './budget';

describe('budget calculations', () => {
  it('totals active fixed expenses and matching month variable expenses', () => {
    const snapshot = createEmptySnapshot();
    snapshot.settings.income = 3000;
    snapshot.fixedExpenses = [
      { id: 'fixed-1', name: 'Rent', amount: 900, category: 'Housing', dayOfMonth: 1, active: true },
      { id: 'fixed-2', name: 'Gym', amount: 40, category: 'Health', dayOfMonth: 10, active: false },
    ];
    snapshot.variableExpenses = [
      { id: 'var-1', name: 'Groceries', amount: 120, category: 'Food', date: '2026-08-01', monthKey: '2026-08' },
      { id: 'var-2', name: 'Coffee', amount: 15, category: 'Food', date: '2026-07-31', monthKey: '2026-07' },
    ];

    const summary = computeBudgetSummary(snapshot, '2026-08');

    expect(summary.income).toBe(3000);
    expect(summary.totalFixedExpenses).toBe(900);
    expect(summary.totalVariableExpenses).toBe(120);
    expect(summary.totalExpenses).toBe(1020);
    expect(summary.remainingIncome).toBe(1980);
  });

  it('uses the current month key format', () => {
    expect(getMonthKey(new Date('2026-08-22T00:00:00.000Z'))).toBe('2026-08');
  });
});
