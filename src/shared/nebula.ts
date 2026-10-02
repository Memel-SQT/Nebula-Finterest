import { computeBudgetSummary, formatLocalDate, getCalendarEntries, getMonthKey } from './budget';
import type { BudgetSnapshot } from './types';

/**
 * Nebula Hub integration (Nebula Link, v0.1.37): what Finterest shares, built from the open
 * profile only. Pure functions, so the private data shared is easy to review and test. Nothing is
 * ever shared while no profile is unlocked: the main process only calls these with an open store.
 */

/** The widget shape of Nebula Link (`WidgetV1`): short texts only, the Hub draws it itself. */
export interface NebulaWidget {
  title: string;
  value?: string;
  unit?: string;
  caption?: string;
  items?: Array<{ label: string; value: string }>;
  deepLink?: string;
  updatedAt: string;
}

/** A Nebula Link notification (`NotificationV1`). */
export interface NebulaNotification {
  id: string;
  title: string;
  body: string;
  sensitivity: 'public' | 'private';
  deepLink?: string;
  category?: string;
}

const clip = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1)}…`);

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

/** `finterest.budget.remaining` (private): what is left to live on this month, for the Hub's Home. */
export function budgetWidget(snapshot: BudgetSnapshot, now: Date): NebulaWidget {
  const monthKey = getMonthKey(now);
  const summary = computeBudgetSummary(snapshot, monthKey);
  return {
    title: 'Reste à vivre',
    value: formatAmount(summary.remainingIncome),
    unit: '€',
    caption: clip(`Budget de ${monthLabel(monthKey)}`, 80),
    deepLink: `nebula://finterest/month?date=${monthKey}`,
    updatedAt: now.toISOString(),
  };
}

export interface DebitDue {
  id: string;
  name: string;
  amount: number;
  /** `YYYY-MM-DD`, tomorrow in local time. */
  date: string;
}

/** Recurring charges (subscriptions, direct debits) due tomorrow, from the same calendar the app shows. */
export function debitsDueTomorrow(snapshot: BudgetSnapshot, now: Date): DebitDue[] {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const entries = getCalendarEntries(snapshot, getMonthKey(tomorrow)).get(tomorrow.getDate()) ?? [];
  return entries.filter((entry) => entry.source === 'fixed').map((entry) => ({ id: entry.id, name: entry.name, amount: entry.amount, date: formatLocalDate(tomorrow) }));
}

/** The private notification for one charge due tomorrow; its id makes it unique per charge and day. */
export function debitNotification(debit: DebitDue): NebulaNotification {
  return {
    id: clip(`debit-${debit.id}-${debit.date}`, 80),
    title: 'Prélèvement prévu demain',
    body: clip(`${debit.name} : ${formatAmount(debit.amount)} €`, 300),
    sensitivity: 'private',
    deepLink: `nebula://finterest/month?date=${debit.date.slice(0, 7)}`,
    category: 'debit',
  };
}
