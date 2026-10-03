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

/**
 * `news.finance.today` (Nebula News 0.4.0, public widget): today's finance / financial-literacy
 * articles, shown as the "Learn" card of the overview. What Finterest keeps from the `WidgetV1`
 * payload after its own checks: plain short texts and a link into Nebula News only.
 */
export interface NewsWidget {
  title: string;
  caption?: string;
  /** Article title (`label`) and source (`value`), 3 at most. */
  items: Array<{ label: string; value: string }>;
  /** Always a `nebula://news/...` link (checked by `isNewsDeepLink`). */
  deepLink: string;
  updatedAt: string;
}

export const NEWS_MAX_ITEMS = 3;
const NEWS_TEXT_MAX = 80;
const NEWS_LINK_MAX = 300;
// Control characters, and anything that looks like markup: the card shows plain text only.
const UNSAFE_TEXT = /[\u0000-\u001f\u007f]|<\s*[a-z!/?]/i;
const NEWS_LINK = /^nebula:\/\/news\/[a-z0-9/-]{0,60}(\?[a-z0-9=&_.%-]{1,200})?$/i;

/** A deep link into Nebula News, and nothing else (no other app, no web URL, bounded). */
export function isNewsDeepLink(value: unknown): value is string {
  return typeof value === 'string' && value.length <= NEWS_LINK_MAX && NEWS_LINK.test(value);
}

function safeText(value: unknown, required: boolean): string | undefined | null {
  if (value === undefined || value === null) return required ? null : undefined;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text) return required ? null : undefined;
  if (text.length > NEWS_TEXT_MAX || UNSAFE_TEXT.test(text)) return null;
  return text;
}

/**
 * Checks what Nebula News returned for `news.finance.today`. Anything unexpected makes the whole
 * card disappear (null): a missing title, a text over 80 characters or with markup, a link that is
 * not `nebula://news/...`, an invalid date, malformed items, or no article at all. Only the first
 * three articles are kept.
 */
export function parseNewsWidget(value: unknown): NewsWidget | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const title = safeText(record.title, true);
  const caption = safeText(record.caption, false);
  if (title === null || title === undefined || caption === null) return null;
  if (!isNewsDeepLink(record.deepLink)) return null;
  if (typeof record.updatedAt !== 'string' || !Number.isFinite(Date.parse(record.updatedAt))) return null;
  if (!Array.isArray(record.items) || record.items.length === 0 || record.items.length > 5) return null;
  const items: NewsWidget['items'] = [];
  for (const raw of record.items) {
    if (!raw || typeof raw !== 'object') return null;
    const label = safeText((raw as Record<string, unknown>).label, true);
    const source = safeText((raw as Record<string, unknown>).value, true);
    if (!label || !source) return null;
    items.push({ label, value: source });
  }
  return { title, ...(caption ? { caption } : {}), items: items.slice(0, NEWS_MAX_ITEMS), deepLink: record.deepLink, updatedAt: record.updatedAt };
}
