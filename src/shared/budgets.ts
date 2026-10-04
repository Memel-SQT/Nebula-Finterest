import type { Budget, BudgetPeriod, BudgetScale, BudgetSnapshot, VariableExpense, Wallet, WalletMovement } from './types';

/**
 * Budgets, sub-envelopes and pots (v0.1.40). Pure functions shared by the main process (validation
 * before writing) and the renderer (what the screens show), so the rules live in one tested place.
 *
 * - A budget's purchases are ordinary planned purchases (`VariableExpense.budgetId`): they show in
 *   the calendar and the purchase list like any other.
 * - `countsInMonth: false` makes a budget a forecast: its purchases are tracked, shown as forecast,
 *   and left out of the month's totals ("reste à vivre").
 * - A sub-envelope belongs to a root budget and inherits its scale, period, dates and
 *   `countsInMonth`. Its own amount is a share of the root's amount.
 */

const SCALES: BudgetScale[] = ['regular', 'project'];
const PERIODS: BudgetPeriod[] = ['month', 'range', 'open'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value);
}

function finiteOr(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

/** Coerces any stored or imported record into a well-formed budget (never throws). */
export function sanitizeBudget(raw: Partial<Budget> & { id: string }): Budget {
  const period = PERIODS.includes(raw.period as BudgetPeriod) ? (raw.period as BudgetPeriod) : 'month';
  const startDate = period === 'range' && isDate(raw.startDate) ? raw.startDate : null;
  const endDate = period === 'range' && isDate(raw.endDate) ? raw.endDate : null;
  return {
    id: raw.id,
    name: text(raw.name).trim(),
    scale: SCALES.includes(raw.scale as BudgetScale) ? (raw.scale as BudgetScale) : 'regular',
    parentId: typeof raw.parentId === 'string' && raw.parentId ? raw.parentId : null,
    amount: Math.max(0, finiteOr(raw.amount, 0)),
    // A range missing a date falls back to "no dates" rather than to a broken range.
    period: period === 'range' && (!startDate || !endDate) ? 'open' : period,
    startDate: startDate && endDate ? startDate : null,
    endDate: startDate && endDate ? endDate : null,
    countsInMonth: raw.countsInMonth === undefined ? true : Boolean(raw.countsInMonth),
  };
}

export function sanitizeWallet(raw: Partial<Wallet> & { id: string }): Wallet {
  const goal = raw.goal === null || raw.goal === undefined ? null : finiteOr(raw.goal, 0);
  return { id: raw.id, name: text(raw.name).trim(), goal: goal !== null && goal > 0 ? goal : null };
}

export function sanitizeWalletMovement(raw: Partial<WalletMovement> & { id: string }): WalletMovement {
  return { id: raw.id, walletId: text(raw.walletId), amount: finiteOr(raw.amount, 0), label: text(raw.label).trim(), date: text(raw.date) };
}

export type BudgetInputError = 'ERR_INVALID_NAME' | 'ERR_NEGATIVE_AMOUNT' | 'ERR_INVALID_DATE' | 'ERR_INVALID_BUDGET';

/**
 * Checks a budget the user is creating or editing, against the existing ones. Returns the error
 * code to throw, or null. A sub-envelope must point to an existing root budget (one level only),
 * and a root budget that has sub-envelopes cannot itself become one.
 */
export function budgetInputError(input: Budget, existing: Budget[]): BudgetInputError | null {
  if (!input.name) return 'ERR_INVALID_NAME';
  if (!Number.isFinite(input.amount) || input.amount < 0) return 'ERR_NEGATIVE_AMOUNT';
  if (input.period === 'range' && (!isDate(input.startDate) || !isDate(input.endDate) || input.startDate > input.endDate)) {
    return 'ERR_INVALID_DATE';
  }
  if (input.parentId) {
    const parent = existing.find((budget) => budget.id === input.parentId);
    if (!parent || parent.parentId || parent.id === input.id) return 'ERR_INVALID_BUDGET';
    if (existing.some((budget) => budget.parentId === input.id)) return 'ERR_INVALID_BUDGET';
  }
  return null;
}

/** A sub-envelope as it behaves: the root's scale, period, dates and month mode. */
export function effectiveBudget(budget: Budget, budgets: Budget[]): Budget {
  if (!budget.parentId) return budget;
  const root = budgets.find((candidate) => candidate.id === budget.parentId);
  if (!root) return budget;
  return { ...budget, scale: root.scale, period: root.period, startDate: root.startDate, endDate: root.endDate, countsInMonth: root.countsInMonth };
}

/** A purchase counts in the month unless it is charged to a forecast budget. */
export function countsInMonth(expense: VariableExpense, budgets: Budget[]): boolean {
  if (!expense.budgetId) return true;
  const budget = budgets.find((candidate) => candidate.id === expense.budgetId);
  return budget ? effectiveBudget(budget, budgets).countsInMonth : true;
}

export interface BudgetStatus {
  budget: Budget;
  /** Amount planned: the budget's own amount. */
  amount: number;
  /** Charged to this budget (and, for a root, to its sub-envelopes) within the period. */
  spent: number;
  /** amount - spent: negative when the budget is overspent. */
  remaining: number;
  /** spent / amount, 0 when nothing is planned. */
  ratio: number;
  /** Roots only: the sum of their sub-envelopes' amounts. */
  allocated: number;
  children: BudgetStatus[];
}

function inPeriod(expense: VariableExpense, budget: Budget, monthKey: string): boolean {
  // Monthly budgets start over every month; dated and open budgets keep every purchase charged to them.
  return budget.period === 'month' ? expense.date.slice(0, 7) === monthKey : true;
}

/** Where a budget stands for `monthKey` (only used by monthly budgets). */
export function budgetStatus(budget: Budget, snapshot: BudgetSnapshot, monthKey: string): BudgetStatus {
  const budgets = snapshot.budgets ?? [];
  const effective = effectiveBudget(budget, budgets);
  const children = budget.parentId ? [] : budgets.filter((child) => child.parentId === budget.id).map((child) => budgetStatus(child, snapshot, monthKey));
  const own = snapshot.variableExpenses
    .filter((expense) => expense.budgetId === budget.id && inPeriod(expense, effective, monthKey))
    .reduce((sum, expense) => sum + expense.amount, 0);
  const spent = own + children.reduce((sum, child) => sum + child.spent, 0);
  return {
    budget: effective,
    amount: budget.amount,
    spent,
    remaining: budget.amount - spent,
    ratio: budget.amount > 0 ? spent / budget.amount : 0,
    allocated: children.reduce((sum, child) => sum + child.amount, 0),
    children,
  };
}

/** Root budgets of one scale, with their status, in the order they were created. */
export function budgetsOfScale(snapshot: BudgetSnapshot, scale: BudgetScale, monthKey: string): BudgetStatus[] {
  return (snapshot.budgets ?? []).filter((budget) => !budget.parentId && budget.scale === scale).map((budget) => budgetStatus(budget, snapshot, monthKey));
}

/** The purchases charged to a budget or one of its sub-envelopes, newest first. */
export function budgetExpenses(budget: Budget, snapshot: BudgetSnapshot): VariableExpense[] {
  const ids = new Set([budget.id, ...(snapshot.budgets ?? []).filter((child) => child.parentId === budget.id).map((child) => child.id)]);
  return snapshot.variableExpenses.filter((expense) => expense.budgetId && ids.has(expense.budgetId)).sort((a, b) => b.date.localeCompare(a.date));
}

export function walletBalance(walletId: string, movements: WalletMovement[]): number {
  return movements.filter((movement) => movement.walletId === walletId).reduce((sum, movement) => sum + movement.amount, 0);
}

/** Positive, negative or zero, for the green / red / neutral colour of an amount. */
export function amountTone(value: number): 'positive' | 'negative' | 'neutral' {
  if (value > 0.004) return 'positive';
  if (value < -0.004) return 'negative';
  return 'neutral';
}
