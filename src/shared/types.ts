export type FixedExpenseKind = 'subscription' | 'directDebit';

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  dayOfMonth: number | null;
  active: boolean;
  kind: FixedExpenseKind;
}

export interface VariableExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  date: string;
  monthKey: string;
}

export interface Loan {
  id: string;
  name: string;
  principal: number;
  monthlyPayment: number;
  interestRate: number;
  remainingMonths: number | null;
  active: boolean;
}

export interface BudgetSettings {
  income: number;
  activeMonthKey: string;
}

export interface BudgetSnapshot {
  settings: BudgetSettings;
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
  loans: Loan[];
}

export interface BudgetSummary {
  income: number;
  totalFixedExpenses: number;
  totalVariableExpenses: number;
  totalLoanPayments: number;
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

export interface FullBackupFile {
  app: 'Finterest';
  version: 1;
  exportedAt: string;
  accounts: Array<{ name: string; snapshot: BudgetSnapshot }>;
}

export interface UpdateStatus {
  state: 'checking' | 'available' | 'not-available' | 'downloaded' | 'error';
  version?: string;
  message?: string;
}

export type ErrorCode =
  | 'ERR_INVALID_ACCOUNT_NAME'
  | 'ERR_INVALID_PIN'
  | 'ERR_INVALID_CREDENTIALS'
  | 'ERR_ACCOUNT_LOCKED'
  | 'ERR_NEGATIVE_AMOUNT'
  | 'ERR_STORE_NOT_INITIALIZED'
  | 'ERR_INVALID_BACKUP';
