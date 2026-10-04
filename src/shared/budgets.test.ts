import { computeBudgetSummary, createEmptySnapshot, extractBackupSnapshot, getCalendarEntries } from './budget';
import { amountTone, budgetInputError, budgetsOfScale, budgetStatus, countsInMonth, effectiveBudget, sanitizeBudget, walletBalance } from './budgets';
import type { Budget, BudgetSnapshot } from './types';

const budget = (patch: Partial<Budget> & { id: string }): Budget => sanitizeBudget({ name: patch.id, amount: 100, ...patch });

function snapshot(): BudgetSnapshot {
  const base = createEmptySnapshot();
  base.settings = { income: 2000, activeMonthKey: '2026-10' };
  base.budgets = [
    budget({ id: 'courses', amount: 300, period: 'month' }),
    budget({ id: 'japon', scale: 'project', amount: 3000, period: 'range', startDate: '2026-10-20', endDate: '2026-11-05', countsInMonth: false }),
    budget({ id: 'avion', parentId: 'japon', amount: 900 }),
    budget({ id: 'hotel', parentId: 'japon', amount: 1200 }),
  ];
  base.variableExpenses = [
    { id: 'c1', name: 'Courses', amount: 120, category: '', date: '2026-10-03', monthKey: '2026-10', budgetId: 'courses' },
    { id: 'c2', name: 'Courses', amount: 210, category: '', date: '2026-10-17', monthKey: '2026-10', budgetId: 'courses' },
    { id: 'c0', name: 'Courses de septembre', amount: 80, category: '', date: '2026-09-28', monthKey: '2026-09', budgetId: 'courses' },
    { id: 'a1', name: 'Billet', amount: 950, category: '', date: '2026-10-12', monthKey: '2026-10', budgetId: 'avion' },
    { id: 'h1', name: 'Ryokan', amount: 400, category: '', date: '2026-11-01', monthKey: '2026-11', budgetId: 'hotel' },
    { id: 'x', name: 'Livre', amount: 15, category: '', date: '2026-10-05', monthKey: '2026-10' },
  ];
  return base;
}

describe('budgets', () => {
  it('starts a monthly budget over every month and shows an overspend as negative', () => {
    const status = budgetStatus(snapshot().budgets![0], snapshot(), '2026-10');
    expect(status).toMatchObject({ amount: 300, spent: 330, remaining: -30 });
    expect(budgetStatus(snapshot().budgets![0], snapshot(), '2026-09').spent).toBe(80);
  });

  it('adds the sub-envelopes to their project, whatever the month', () => {
    const [japon] = budgetsOfScale(snapshot(), 'project', '2026-10');
    expect(japon.spent).toBe(1350);
    expect(japon.remaining).toBe(1650);
    expect(japon.allocated).toBe(2100);
    expect(japon.children.map((child) => [child.budget.id, child.spent, child.remaining])).toEqual([['avion', 950, -50], ['hotel', 400, 800]]);
  });

  it('gives sub-envelopes their root budget’s period and month mode', () => {
    const data = snapshot();
    expect(effectiveBudget(data.budgets![2], data.budgets!)).toMatchObject({ period: 'range', startDate: '2026-10-20', countsInMonth: false, scale: 'project' });
  });

  it('leaves forecast purchases out of the month, and keeps the others', () => {
    const data = snapshot();
    expect(countsInMonth(data.variableExpenses[3], data.budgets!)).toBe(false);
    expect(countsInMonth(data.variableExpenses[0], data.budgets!)).toBe(true);
    expect(countsInMonth(data.variableExpenses[5], data.budgets!)).toBe(true);
    // 120 + 210 (courses) + 15 (no budget); the 950 € flight is a forecast.
    expect(computeBudgetSummary(data, '2026-10').totalVariableExpenses).toBe(345);
  });

  it('shows forecast purchases and the dates of a dated budget in the calendar', () => {
    const entries = getCalendarEntries(snapshot(), '2026-10');
    expect(entries.get(12)?.[0]).toMatchObject({ source: 'purchase', forecast: true, budgetName: 'avion' });
    expect(entries.get(20)?.[0]).toMatchObject({ source: 'budget', marker: 'start', name: 'japon' });
    expect(getCalendarEntries(snapshot(), '2026-11').get(5)?.[0]).toMatchObject({ source: 'budget', marker: 'end' });
  });

  it('validates what the user creates', () => {
    const existing = snapshot().budgets!;
    expect(budgetInputError(budget({ id: 'n', name: '' }), existing)).toBe('ERR_INVALID_NAME');
    expect(budgetInputError({ ...budget({ id: 'n' }), amount: -1 }, existing)).toBe('ERR_NEGATIVE_AMOUNT');
    expect(budgetInputError({ ...budget({ id: 'n' }), period: 'range', startDate: '2026-12-01', endDate: '2026-11-01' }, existing)).toBe('ERR_INVALID_DATE');
    expect(budgetInputError(budget({ id: 'n', parentId: 'avion' }), existing)).toBe('ERR_INVALID_BUDGET');
    expect(budgetInputError(budget({ id: 'n', parentId: 'missing' }), existing)).toBe('ERR_INVALID_BUDGET');
    // A budget that has sub-envelopes cannot become one itself.
    expect(budgetInputError(budget({ id: 'japon', parentId: 'courses' }), existing)).toBe('ERR_INVALID_BUDGET');
    expect(budgetInputError(budget({ id: 'n', parentId: 'japon' }), existing)).toBeNull();
  });

  it('turns a range without both dates into a budget without dates', () => {
    expect(sanitizeBudget({ id: 'r', name: 'r', period: 'range', startDate: '2026-10-01', endDate: null })).toMatchObject({ period: 'open', startDate: null, endDate: null });
  });
});

describe('pots and colours', () => {
  it('sums a pot’s movements, carried over from month to month', () => {
    const movements = [
      { id: '1', walletId: 'w', amount: 200, label: 'Versement', date: '2026-08-01' },
      { id: '2', walletId: 'w', amount: -50, label: 'Retrait', date: '2026-10-02' },
      { id: '3', walletId: 'other', amount: 999, label: '', date: '2026-10-02' },
    ];
    expect(walletBalance('w', movements)).toBe(150);
  });

  it('colours amounts green above zero and red below', () => {
    expect(amountTone(12)).toBe('positive');
    expect(amountTone(-0.5)).toBe('negative');
    expect(amountTone(0)).toBe('neutral');
  });
});

describe('backups with budgets', () => {
  it('imports a backup written before budgets existed with empty budgets and pots', () => {
    const old = extractBackupSnapshot({ app: 'Finterest', version: 1, snapshot: { settings: { income: 1, activeMonthKey: '2026-08' }, fixedExpenses: [], variableExpenses: [{ id: 'v', name: 'Achat', amount: 5, category: '', date: '2026-08-02', monthKey: '2026-08' }], loans: [] } });
    expect(old).toMatchObject({ budgets: [], wallets: [], walletMovements: [] });
    expect(old?.variableExpenses[0].budgetId).toBeNull();
  });

  it('repairs broken references instead of failing the import', () => {
    const data = snapshot();
    data.budgets!.push(budget({ id: 'orphan', parentId: 'gone' }));
    data.variableExpenses.push({ id: 'lost', name: 'Perdu', amount: 1, category: '', date: '2026-10-01', monthKey: '2026-10', budgetId: 'gone' });
    data.wallets = [{ id: 'w', name: 'Vacances', goal: 500 }];
    data.walletMovements = [
      { id: 'm1', walletId: 'w', amount: 100, label: '', date: '2026-10-01' },
      { id: 'm2', walletId: 'gone', amount: 100, label: '', date: '2026-10-01' },
      { id: 'm3', walletId: 'w', amount: 0, label: '', date: '2026-10-01' },
    ];
    const restored = extractBackupSnapshot({ app: 'Finterest', version: 1, snapshot: data })!;
    expect(restored.budgets!.find((item) => item.id === 'orphan')?.parentId).toBeNull();
    expect(restored.variableExpenses.find((item) => item.id === 'lost')?.budgetId).toBeNull();
    expect(restored.walletMovements!.map((movement) => movement.id)).toEqual(['m1']);
    expect(restored.budgets!.find((item) => item.id === 'avion')?.parentId).toBe('japon');
  });
});
