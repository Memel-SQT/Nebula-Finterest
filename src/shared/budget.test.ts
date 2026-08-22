import { computeBudgetSummary, createEmptySnapshot, getMonthKey, sanitizeFixedExpense } from './budget';
import type { FixedExpense } from './types';

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
});
