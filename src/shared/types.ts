export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  dayOfMonth: number | null;
  active: boolean;
}

export interface VariableExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  date: string;
  monthKey: string;
}

export interface BudgetSettings {
  income: number;
  activeMonthKey: string;
}

export interface BudgetSnapshot {
  settings: BudgetSettings;
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
}

export interface BudgetSummary {
  income: number;
  totalFixedExpenses: number;
  totalVariableExpenses: number;
  totalExpenses: number;
  remainingIncome: number;
  activeMonthKey: string;
}

export interface BackupFile {
  app: 'Finterest';
  version: number;
  exportedAt: string;
  snapshot: BudgetSnapshot;
}
