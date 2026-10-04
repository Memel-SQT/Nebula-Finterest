import { useEffect, useMemo, useRef, useState } from 'react';
import type { BudgetSnapshot, CalendarEntry, FixedExpenseKind } from '@shared/types';
import { formatLocalDate, getCalendarEntries, parseAmount } from '@shared/budget';
import type { Language } from '../i18n';
import { translate } from '../i18n';
import { categoryIcon, formatMoney, subscriptionCategories } from '../constants';
import { Icon } from './Icon';
import { BudgetSelect } from './BudgetSelect';

/** Budget start / end markers and forecast purchases are shown, but never added to the money totals. */
const countsInTotals = (entry: CalendarEntry) => entry.source !== 'budget' && !entry.forecast;

type EntryMode = 'purchase' | 'recurring';

interface CalendarFormState {
  mode: EntryMode;
  name: string;
  amount: string;
  category: string;
  kind: FixedExpenseKind;
  /** Purchases only: the budget it is charged to ('' = none). */
  budgetId: string;
}

const MAX_CHIPS_PER_DAY = 3;
const emptyForm = (mode: EntryMode): CalendarFormState => ({ mode, name: '', amount: '', category: '', kind: 'subscription', budgetId: '' });

export function BudgetCalendar({
  monthKey,
  snapshot,
  selectedDay,
  language,
  onDaySelect,
  onAddRecurring,
  onAddPurchase,
  onDeleteEntry,
  onMonthChange,
}: {
  monthKey: string;
  snapshot: BudgetSnapshot;
  selectedDay: number | null;
  language: Language;
  onDaySelect: (day: number | null) => void;
  onAddRecurring: (name: string, amount: number, category: string, day: number, kind: FixedExpenseKind) => Promise<boolean>;
  onAddPurchase: (name: string, amount: number, category: string, date: string, budgetId: string | null) => Promise<boolean>;
  onDeleteEntry: (entry: CalendarEntry) => Promise<void>;
  onMonthChange: (monthKey: string) => void;
}) {
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string>) => translate(language, key, params);
  const locale = language === 'en' ? 'en-US' : 'fr-FR';
  const [year, month] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => index - firstDay + 1);
  const title = new Date(year, month - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const today = formatLocalDate(new Date());
  const entriesByDay = useMemo(() => getCalendarEntries(snapshot, monthKey), [snapshot, monthKey]);
  const [form, setForm] = useState<CalendarFormState>(emptyForm('purchase'));
  const [formError, setFormError] = useState<string | null>(null);
  /** A recurring charge deleted from one day disappears from every month, so it takes a second click. */
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const sideRef = useRef<HTMLElement>(null);

  // On narrower windows the day panel sits under the grid: bring it into view when a day is picked.
  useEffect(() => {
    if (selectedDay !== null) {
      sideRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }
    setConfirmingId(null);
  }, [selectedDay]);

  const totals = useMemo(() => {
    let recurring = 0;
    let purchases = 0;
    for (const entries of entriesByDay.values()) {
      for (const entry of entries) {
        if (!countsInTotals(entry)) continue;
        if (entry.source === 'fixed') recurring += entry.amount;
        else purchases += entry.amount;
      }
    }
    return { recurring, purchases };
  }, [entriesByDay]);

  const shiftMonth = (amount: number) => {
    const next = new Date(year, month - 1 + amount, 1);
    onDaySelect(null);
    onMonthChange(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  const weekdays = [t('calendar.mon'), t('calendar.tue'), t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat'), t('calendar.sun')];
  const selectedDate = selectedDay ? `${monthKey}-${String(selectedDay).padStart(2, '0')}` : null;
  const selectedEntries = selectedDay ? entriesByDay.get(selectedDay) ?? [] : [];
  const selectedLabel = selectedDay
    ? new Date(year, month - 1, selectedDay).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  async function submit(): Promise<void> {
    if (!selectedDay || !selectedDate) {
      return;
    }
    const amount = parseAmount(form.amount);
    if (!form.name.trim()) {
      setFormError(t('error.invalidName'));
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setFormError(t('error.negativeAmount'));
      return;
    }
    setFormError(null);
    const saved = form.mode === 'purchase'
      ? await onAddPurchase(form.name, amount, form.category, selectedDate, form.budgetId || null)
      : await onAddRecurring(form.name, amount, form.category, selectedDay, form.kind);
    if (saved) {
      setForm(emptyForm(form.mode));
    }
  }

  return (
    <section className="calendar-panel">
      <div className="calendar-toolbar">
        <div>
          <p className="eyebrow">{t('calendar.monthlyView')}</p>
          <h2>{title.charAt(0).toUpperCase() + title.slice(1)}</h2>
          <p className="calendar-hint">{t('calendar.hint')}</p>
        </div>
        <div className="calendar-actions">
          <button className="ghost small icon-button" data-sound="nav" onClick={() => shiftMonth(-1)} aria-label={t('calendar.prevMonth')} title={t('calendar.prevMonth')}><Icon name="chevronLeft" /></button>
          <button className="ghost small" data-sound="nav" onClick={() => { onDaySelect(null); onMonthChange(today.slice(0, 7)); }}>{t('calendar.today')}</button>
          <button className="ghost small icon-button" data-sound="nav" onClick={() => shiftMonth(1)} aria-label={t('calendar.nextMonth')} title={t('calendar.nextMonth')}><Icon name="chevronRight" /></button>
        </div>
      </div>

      <div className="calendar-totals">
        <span className="calendar-legend recurring"><Icon name="repeat" size={15} />{t('calendar.totalRecurring')} <b>{formatMoney(totals.recurring, language)}</b></span>
        <span className="calendar-legend purchase"><Icon name="bag" size={15} />{t('calendar.totalPurchases')} <b>{formatMoney(totals.purchases, language)}</b></span>
        <span className="calendar-legend total">{t('calendar.totalMonth')} <b>{formatMoney(totals.recurring + totals.purchases, language)}</b></span>
      </div>

      <div className="calendar-layout">
        <div className="calendar-main">
          <div className="calendar-weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
          <div className="calendar-grid">
            {cells.map((day, index) => {
              const inMonth = day >= 1 && day <= daysInMonth;
              const entries = inMonth ? entriesByDay.get(day) ?? [] : [];
              const dayTotal = entries.filter(countsInTotals).reduce((sum, entry) => sum + entry.amount, 0);
              const isToday = inMonth && `${monthKey}-${String(day).padStart(2, '0')}` === today;
              return (
                <button
                  className={`calendar-day ${inMonth ? '' : 'outside'} ${selectedDay === day ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                  key={`${day}-${index}`}
                  onClick={() => (inMonth ? onDaySelect(selectedDay === day ? null : day) : undefined)}
                  disabled={!inMonth}
                  data-sound="toggle"
                  aria-pressed={selectedDay === day}
                  aria-label={inMonth ? `${day} — ${entries.length} ${t('calendar.entries')}` : undefined}
                >
                  {inMonth ? (
                    <>
                      <strong>{day}</strong>
                      {entries.slice(0, MAX_CHIPS_PER_DAY).map((entry) => (
                        <span
                          className={`calendar-chip ${entry.source} ${entry.forecast ? 'forecast' : ''}`}
                          key={`${entry.source}-${entry.id}`}
                          title={entry.source === 'budget'
                            ? `${t(entry.marker === 'start' ? 'calendar.budgetStart' : 'calendar.budgetEnd')} · ${entry.name} — ${formatMoney(entry.amount, language)}`
                            : `${entry.name} — ${formatMoney(entry.amount, language)}${entry.forecast ? ` (${t('budgets.forecast')})` : ''}`}
                        >
                          <Icon name={entry.source === 'fixed' ? 'repeat' : entry.source === 'budget' ? 'rocket' : 'bag'} size={12} />
                          <b>{entry.name}</b>
                        </span>
                      ))}
                      {entries.length > MAX_CHIPS_PER_DAY ? <span className="calendar-more">+{entries.length - MAX_CHIPS_PER_DAY}</span> : null}
                      {dayTotal > 0 ? <small className="calendar-day-total">{formatMoney(dayTotal, language)}</small> : null}
                    </>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <aside ref={sideRef} className="calendar-side" aria-live="polite">
          {selectedDay ? (
            <div key={selectedDay} className="calendar-day-panel">
              <div className="calendar-side-heading">
                <div>
                  <p className="eyebrow">{t('calendar.selectedDay')}</p>
                  <h3>{selectedLabel.charAt(0).toUpperCase() + selectedLabel.slice(1)}</h3>
                </div>
                <button className="ghost small icon-button" onClick={() => onDaySelect(null)} aria-label={t('calendar.close')} title={t('calendar.close')}><Icon name="close" /></button>
              </div>

              {selectedEntries.length > 0 ? (
                <ul className="calendar-entry-list">
                  {selectedEntries.map((entry) => (
                    <li key={`${entry.source}-${entry.id}`} className={entry.source}>
                      <span className="calendar-entry-icon"><Icon name={entry.source === 'budget' ? 'rocket' : categoryIcon(entry.category, language)} size={16} /></span>
                      <div>
                        <strong>{entry.name}</strong>
                        <span>
                          {entry.source === 'fixed'
                            ? t(entry.kind === 'directDebit' ? 'badge.directDebit' : 'badge.subscription')
                            : entry.source === 'budget'
                              ? t(entry.marker === 'start' ? 'calendar.budgetStart' : 'calendar.budgetEnd')
                              : t('calendar.oneOff')}
                          {entry.forecast ? ` · ${t('budgets.forecast')}` : ''}
                          {entry.source === 'purchase' && entry.budgetName ? ` · ${entry.budgetName}` : ''}
                          {entry.category ? ` · ${entry.category}` : ''}
                        </span>
                      </div>
                      <b>{formatMoney(entry.amount, language)}</b>
                      {entry.source === 'budget' ? <span aria-hidden="true" /> : entry.source === 'fixed' && confirmingId !== entry.id ? (
                        <button className="ghost small icon-button danger" onClick={() => setConfirmingId(entry.id)} aria-label={`${t('list.delete')} ${entry.name}`} title={t('list.delete')}>
                          <Icon name="trash" size={16} />
                        </button>
                      ) : (
                        <button
                          className={`ghost small danger ${entry.source === 'fixed' ? 'confirming' : 'icon-button'}`}
                          data-sound="none"
                          onClick={() => { setConfirmingId(null); void onDeleteEntry(entry); }}
                          aria-label={`${t('list.delete')} ${entry.name}`}
                          title={entry.source === 'fixed' ? t('calendar.deleteRecurringConfirm') : t('list.delete')}
                        >
                          {entry.source === 'fixed' ? t('calendar.deleteEveryMonth') : <Icon name="trash" size={16} />}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="calendar-empty">{t('calendar.nothingThisDay')}</p>
              )}

              <form
                className="calendar-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
              >
                <div className="segmented" role="radiogroup" aria-label={t('calendar.entryType')}>
                  <button type="button" role="radio" aria-checked={form.mode === 'purchase'} className={form.mode === 'purchase' ? 'active' : ''} onClick={() => setForm({ ...form, mode: 'purchase', category: '' })}>
                    <Icon name="bag" size={15} />{t('calendar.oneOffPurchase')}
                  </button>
                  <button type="button" role="radio" aria-checked={form.mode === 'recurring'} className={form.mode === 'recurring' ? 'active' : ''} onClick={() => setForm({ ...form, mode: 'recurring', category: '' })}>
                    <Icon name="repeat" size={15} />{t('calendar.recurring')}
                  </button>
                </div>
                <p className="calendar-form-note">{t(form.mode === 'purchase' ? 'calendar.oneOffNote' : 'calendar.recurringNote')}</p>
                <label>
                  {t('calendar.name')}
                  <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                </label>
                <label>
                  {t(form.mode === 'purchase' ? 'form.variable.amount' : 'calendar.monthlyPrice')}
                  <input required inputMode="decimal" placeholder="0,00" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
                </label>
                <label>
                  {t('calendar.category')}
                  {form.mode === 'recurring' ? (
                    <select required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                      <option value="">{t('calendar.choose')}</option>
                      {subscriptionCategories.map((category) => (
                        <option key={category.labelKey} value={translate(language, category.labelKey)}>{translate(language, category.labelKey)}</option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <input list="calendar-purchase-categories" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
                      <datalist id="calendar-purchase-categories">
                        {subscriptionCategories.map((category) => <option key={category.labelKey} value={translate(language, category.labelKey)} />)}
                      </datalist>
                    </>
                  )}
                </label>
                {form.mode === 'purchase' ? (
                  <BudgetSelect snapshot={snapshot} value={form.budgetId} language={language} onChange={(budgetId) => setForm({ ...form, budgetId })} />
                ) : null}
                {form.mode === 'recurring' ? (
                  <label>
                    {t('form.fixed.type')}
                    <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as FixedExpenseKind })}>
                      <option value="subscription">{t('form.fixed.type.subscription')}</option>
                      <option value="directDebit">{t('form.fixed.type.directDebit')}</option>
                    </select>
                  </label>
                ) : null}
                {formError ? <p className="form-error" role="alert">{formError}</p> : null}
                <button type="submit" data-sound="none"><Icon name="plus" size={16} />{t('calendar.addOnDate')}</button>
              </form>
            </div>
          ) : (
            <div className="calendar-placeholder">
              <span className="calendar-placeholder-icon"><Icon name="calendar" size={28} /></span>
              <p>{t('calendar.pickDay')}</p>
              <div className="calendar-key">
                <span className="calendar-chip fixed"><Icon name="repeat" size={12} /><b>{t('calendar.recurring')}</b></span>
                <span className="calendar-chip purchase"><Icon name="bag" size={12} /><b>{t('calendar.oneOffPurchase')}</b></span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
