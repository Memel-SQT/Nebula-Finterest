import type { BackupFile, BudgetSnapshot, BudgetSummary, FixedExpense, VariableExpense } from './types';

export function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function createEmptySnapshot(): BudgetSnapshot {
  return {
    settings: {
      income: 0,
      activeMonthKey: getMonthKey(new Date()),
    },
    fixedExpenses: [],
    variableExpenses: [],
  };
}

export function computeBudgetSummary(snapshot: BudgetSnapshot, monthKey = snapshot.settings.activeMonthKey): BudgetSummary {
  const totalFixedExpenses = snapshot.fixedExpenses
    .filter((expense) => expense.active)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const totalVariableExpenses = snapshot.variableExpenses
    .filter((expense) => expense.monthKey === monthKey)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const totalExpenses = totalFixedExpenses + totalVariableExpenses;

  return {
    income: snapshot.settings.income,
    totalFixedExpenses,
    totalVariableExpenses,
    totalExpenses,
    remainingIncome: snapshot.settings.income - totalExpenses,
    activeMonthKey: monthKey,
  };
}

export function isValidBudgetSnapshot(value: unknown): value is BudgetSnapshot {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const snapshot = value as BudgetSnapshot;
  return (
    typeof snapshot.settings?.income === 'number' &&
    typeof snapshot.settings?.activeMonthKey === 'string' &&
    Array.isArray(snapshot.fixedExpenses) &&
    Array.isArray(snapshot.variableExpenses)
  );
}

export function sanitizeFixedExpense(expense: FixedExpense): FixedExpense {
  return {
    ...expense,
    amount: Number(expense.amount) || 0,
    dayOfMonth: expense.dayOfMonth === null ? null : Number(expense.dayOfMonth) || null,
    active: Boolean(expense.active),
  };
}

export function sanitizeVariableExpense(expense: VariableExpense): VariableExpense {
  return {
    ...expense,
    amount: Number(expense.amount) || 0,
  };
}

export function validateBackupFile(file: BackupFile): string[] {
  const errors: string[] = [];

  if (file.app !== 'Finterest') {
    errors.push('Backup file is not for Finterest.');
  }

  if (file.version !== 1) {
    errors.push('Unsupported backup version.');
  }

  if (!isValidBudgetSnapshot(file.snapshot)) {
    errors.push('Backup snapshot is invalid.');
  }

  return errors;
}
