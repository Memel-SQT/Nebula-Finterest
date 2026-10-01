import type { BackupFile, BudgetSnapshot, BudgetSummary, CalendarEntry, FixedExpense, FixedExpenseKind, Loan, VariableExpense } from './types';

export function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** Local calendar date as `YYYY-MM-DD`. `toISOString()` would give the UTC date, which is still "yesterday" just after midnight in France. */
export function formatLocalDate(date: Date): string {
  return `${getMonthKey(date)}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isValidMonthKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(`${value.slice(0, 7)}`) && year > 0;
}

export function daysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

/**
 * Parses an amount typed by a French user: accepts a comma or a dot as decimal separator,
 * spaces (including the narrow no-break space `toLocaleString` produces) as thousands separators,
 * and an optional euro sign. Returns NaN for anything else so callers can reject it.
 */
export function parseAmount(value: string | number): number {
  if (typeof value === 'number') {
    return value;
  }
  const compact = value.replace(/[\s  €]/g, '');
  // "1.234,56": with a comma present, dots can only be thousands separators.
  const cleaned = compact.includes(',') ? compact.replace(/\./g, '').replace(',', '.') : compact;
  if (cleaned === '' || !/^-?\d*\.?\d+$|^-?\d+\.$/.test(cleaned)) {
    return Number.NaN;
  }
  return Number(cleaned);
}

export function createEmptySnapshot(): BudgetSnapshot {
  return {
    settings: {
      income: 0,
      activeMonthKey: getMonthKey(new Date()),
    },
    fixedExpenses: [],
    variableExpenses: [],
    loans: [],
  };
}

export function computeBudgetSummary(snapshot: BudgetSnapshot, monthKey = snapshot.settings.activeMonthKey): BudgetSummary {
  const totalFixedExpenses = snapshot.fixedExpenses
    .filter((expense) => expense.active)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const totalVariableExpenses = snapshot.variableExpenses
    .filter((expense) => expense.monthKey === monthKey)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const totalLoanPayments = (snapshot.loans ?? [])
    .filter((loan) => loan.active)
    .reduce((sum, loan) => sum + loan.monthlyPayment, 0);

  const totalExpenses = totalFixedExpenses + totalVariableExpenses + totalLoanPayments;

  return {
    income: snapshot.settings.income,
    totalFixedExpenses,
    totalVariableExpenses,
    totalLoanPayments,
    totalExpenses,
    remainingIncome: snapshot.settings.income - totalExpenses,
    activeMonthKey: monthKey,
  };
}

/**
 * Everything that lands on a given day of `monthKey`: active recurring charges on their
 * day of month, and the one-off purchases dated in that month. A recurring charge set on
 * the 29th-31st still shows up in shorter months, on their last day, since that is when
 * banks actually take it.
 */
export function getCalendarEntries(snapshot: BudgetSnapshot, monthKey: string): Map<number, CalendarEntry[]> {
  const entries = new Map<number, CalendarEntry[]>();
  if (!isValidMonthKey(monthKey)) {
    return entries;
  }

  const lastDay = daysInMonth(monthKey);
  const push = (day: number, entry: CalendarEntry) => {
    const list = entries.get(day) ?? [];
    list.push(entry);
    entries.set(day, list);
  };

  for (const expense of snapshot.fixedExpenses) {
    if (!expense.active || expense.dayOfMonth === null) {
      continue;
    }
    const day = Math.min(Math.max(1, expense.dayOfMonth), lastDay);
    push(day, { id: expense.id, source: 'fixed', name: expense.name, amount: expense.amount, category: expense.category, kind: expense.kind });
  }

  for (const expense of snapshot.variableExpenses) {
    if (!isValidDateString(expense.date) || expense.date.slice(0, 7) !== monthKey) {
      continue;
    }
    push(Number(expense.date.slice(8, 10)), { id: expense.id, source: 'purchase', name: expense.name, amount: expense.amount, category: expense.category });
  }

  return entries;
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

const FIXED_EXPENSE_KINDS: FixedExpenseKind[] = ['subscription', 'directDebit'];

export function sanitizeFixedExpense(expense: FixedExpense): FixedExpense {
  const day = expense.dayOfMonth === null || expense.dayOfMonth === undefined ? null : Math.trunc(Number(expense.dayOfMonth)) || null;
  return {
    ...expense,
    amount: Number(expense.amount) || 0,
    dayOfMonth: day === null ? null : Math.min(31, Math.max(1, day)),
    active: Boolean(expense.active),
    kind: FIXED_EXPENSE_KINDS.includes(expense.kind) ? expense.kind : 'subscription',
  };
}

export function sanitizeVariableExpense(expense: VariableExpense): VariableExpense {
  return {
    ...expense,
    amount: Number(expense.amount) || 0,
  };
}

export function sanitizeLoan(loan: Loan): Loan {
  return {
    ...loan,
    principal: Number(loan.principal) || 0,
    monthlyPayment: Number(loan.monthlyPayment) || 0,
    interestRate: Number(loan.interestRate) || 0,
    remainingMonths: loan.remainingMonths === null || loan.remainingMonths === undefined ? null : Number(loan.remainingMonths) || null,
    active: Boolean(loan.active),
  };
}

export function validateBackupFile(file: BackupFile): string[] {
  const errors: string[] = [];

  if (!file || typeof file !== 'object') {
    return ['Backup file is not an object.'];
  }

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

type IdFactory = () => string;

let fallbackIdCounter = 0;
const defaultIdFactory: IdFactory = () =>
  globalThis.crypto?.randomUUID?.() ?? `imported-${Date.now().toString(36)}-${(fallbackIdCounter += 1).toString(36)}`;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : value === null || value === undefined ? fallback : String(value);
}

/**
 * Makes any snapshot coming from a backup file safe to insert, without rejecting data that
 * older versions of the app legitimately wrote: missing `kind` (pre-v0.1.2x), missing `loans`,
 * a `monthKey` absent from purchases, items without an id or sharing an id. Entries that are
 * not objects at all are dropped rather than failing the whole import.
 */
export function normalizeSnapshot(snapshot: BudgetSnapshot, createId: IdFactory = defaultIdFactory): BudgetSnapshot {
  const usedIds = new Set<string>();
  const uniqueId = (raw: unknown) => {
    let id = asText(raw).trim();
    if (!id || usedIds.has(id)) {
      id = createId();
    }
    usedIds.add(id);
    return id;
  };

  const fixedExpenses = (Array.isArray(snapshot.fixedExpenses) ? snapshot.fixedExpenses : [])
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) =>
      sanitizeFixedExpense({
        id: uniqueId(item.id),
        name: asText(item.name),
        amount: Number(item.amount),
        category: asText(item.category),
        dayOfMonth: item.dayOfMonth as number | null,
        active: item.active === undefined ? true : Boolean(item.active),
        kind: item.kind as FixedExpenseKind,
      }),
    );

  const variableExpenses = (Array.isArray(snapshot.variableExpenses) ? snapshot.variableExpenses : [])
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => {
      const date = asText(item.date);
      const monthKey = isValidMonthKey(item.monthKey) ? item.monthKey : isValidMonthKey(date.slice(0, 7)) ? date.slice(0, 7) : getMonthKey(new Date());
      return sanitizeVariableExpense({
        id: uniqueId(item.id),
        name: asText(item.name),
        amount: Number(item.amount),
        category: asText(item.category),
        date,
        monthKey,
      });
    });

  const loans = (Array.isArray(snapshot.loans) ? snapshot.loans : [])
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) =>
      sanitizeLoan({
        id: uniqueId(item.id),
        name: asText(item.name),
        principal: Number(item.principal),
        monthlyPayment: Number(item.monthlyPayment),
        interestRate: Number(item.interestRate),
        remainingMonths: item.remainingMonths as number | null,
        active: item.active === undefined ? true : Boolean(item.active),
      }),
    );

  const income = Number(snapshot.settings?.income);
  return {
    settings: {
      income: Number.isFinite(income) && income >= 0 ? income : 0,
      activeMonthKey: isValidMonthKey(snapshot.settings?.activeMonthKey) ? snapshot.settings.activeMonthKey : getMonthKey(new Date()),
    },
    fixedExpenses,
    variableExpenses,
    loans,
  };
}

/**
 * Accepts every backup shape any released version has written:
 * - `BackupFile` / `AccountBackup` (manual export, one account, `snapshot` at the top level);
 * - `FullBackupFile` (written by the Windows uninstaller, several accounts under `accounts`).
 * For the latter, the account whose name matches `preferredAccountName` wins, then the only
 * account if there is just one. Returns null when nothing importable is found.
 */
export function extractBackupSnapshot(file: unknown, preferredAccountName?: string): BudgetSnapshot | null {
  const record = asRecord(file);
  if (!record || record.app !== 'Finterest' || record.version !== 1) {
    return null;
  }

  if (isValidBudgetSnapshot(record.snapshot)) {
    return normalizeSnapshot(record.snapshot);
  }

  if (Array.isArray(record.accounts)) {
    const accounts = record.accounts
      .map(asRecord)
      .filter((account): account is Record<string, unknown> => account !== null && isValidBudgetSnapshot(account.snapshot));
    const match =
      accounts.find((account) => preferredAccountName !== undefined && asText(account.name).trim() === preferredAccountName.trim()) ??
      (accounts.length === 1 ? accounts[0] : undefined);
    return match ? normalizeSnapshot(match.snapshot as BudgetSnapshot) : null;
  }

  return null;
}
