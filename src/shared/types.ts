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

export interface CalendarEntry {
  id: string;
  /** `fixed` = recurring subscription/direct debit, `purchase` = one-off planned purchase. */
  source: 'fixed' | 'purchase';
  name: string;
  amount: number;
  category: string;
  kind?: FixedExpenseKind;
}

export interface SyncStatus {
  /** The folder the user picked; profiles are mirrored into a "Nebula Finterest" subfolder of it. */
  directory: string | null;
  state: 'disabled' | 'idle' | 'syncing' | 'error';
  lastSyncAt?: string;
  message?: string;
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
  | 'ERR_INVALID_BACKUP'
  | 'ERR_GUEST_READONLY'
  | 'ERR_INVALID_NAME'
  | 'ERR_INVALID_DATE'
  | 'ERR_INVALID_MONTH'
  | 'ERR_TOO_MANY_ATTEMPTS'
  | 'ERR_SYNC_UNAVAILABLE';
