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
  /** The budget (or sub-envelope) this purchase is charged to (v0.1.40); absent on older data. */
  budgetId?: string | null;
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

/** Everyday envelopes ("Budgets") or large projects such as a trip ("Gros budgets"). */
export type BudgetScale = 'regular' | 'project';
/** Renewed every month, between two dates (shown in the calendar), or without dates. */
export type BudgetPeriod = 'month' | 'range' | 'open';

/**
 * A budget (v0.1.40). A root budget has `parentId: null`; a sub-envelope points to its root
 * budget and inherits its scale, period, dates and `countsInMonth` (one level only).
 */
export interface Budget {
  id: string;
  name: string;
  scale: BudgetScale;
  parentId: string | null;
  /** Amount planned for the period (per month for `month`). */
  amount: number;
  period: BudgetPeriod;
  /** `YYYY-MM-DD`, only for `range`. */
  startDate: string | null;
  endDate: string | null;
  /** true: its purchases count in the month's "reste à vivre"; false: a forecast, tracked apart. */
  countsInMonth: boolean;
}

/** A pot with its own balance, carried over from month to month ("Cagnotte", v0.1.40). */
export interface Wallet {
  id: string;
  name: string;
  /** Optional savings goal. */
  goal: number | null;
}

/** Money put into (positive) or taken out of (negative) a pot. */
export interface WalletMovement {
  id: string;
  walletId: string;
  amount: number;
  label: string;
  date: string;
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
  /** v0.1.40; absent from snapshots and backups written by older versions. */
  budgets?: Budget[];
  wallets?: Wallet[];
  walletMovements?: WalletMovement[];
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
  /** `fixed` = recurring subscription/direct debit, `purchase` = one-off planned purchase, `budget` = start or end of a dated budget. */
  source: 'fixed' | 'purchase' | 'budget';
  name: string;
  amount: number;
  category: string;
  kind?: FixedExpenseKind;
  /** A purchase charged to a forecast budget: shown, but left out of the month's totals. */
  forecast?: boolean;
  /** For `budget` entries: the first or the last day of the budget. */
  marker?: 'start' | 'end';
  /** The budget a purchase is charged to (or the budget itself, for markers). */
  budgetName?: string;
}

export interface SyncStatus {
  /** The folder the user picked; profiles are mirrored into a "Nebula Finterest" subfolder of it. */
  directory: string | null;
  state: 'disabled' | 'idle' | 'syncing' | 'error';
  lastSyncAt?: string;
  message?: string;
}

/** A backup waiting for the user's confirmation before it is imported (v0.1.37). */
export interface PendingBackup {
  file: string;
  fileName: string;
  exportedAt: string | null;
  /** Profile names it holds; the user picks one when there are several. */
  accounts: string[];
  modifiedAt: string;
}

/** Nebula Hub as seen by Finterest (Nebula Link, v0.1.37). */
export interface NebulaState {
  /** The Hub is running and connected. */
  connected: boolean;
  hubVersion: string | null;
  /** The user lets the Hub install the updates (only while the Hub is there). */
  updatesByHub: boolean;
  /** "Finance articles from Nebula News" on the overview (shown only if News answers). */
  newsFinance: boolean;
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
  | 'ERR_SYNC_UNAVAILABLE'
  | 'ERR_INVALID_BUDGET'
  | 'ERR_INVALID_WALLET';
