import { useState } from 'react';
import type { FixedExpense, FixedExpenseKind } from '@shared/types';
import type { Language } from '../i18n';
import { translate } from '../i18n';
import { categoryIcon, formatMoney, subscriptionCategories } from '../constants';

export function SubscriptionCalendar({
  monthKey,
  items,
  selectedDay,
  language,
  onDaySelect,
  onAdd,
  onMonthChange,
}: {
  monthKey: string;
  items: FixedExpense[];
  selectedDay: number | null;
  language: Language;
  onDaySelect: (day: number) => void;
  onAdd: (name: string, amount: number, category: string, day: number, kind: FixedExpenseKind) => Promise<void>;
  onMonthChange: (monthKey: string) => void;
}) {
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string>) => translate(language, key, params);
  const [year, month] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => index - firstDay + 1);
  const title = new Date(year, month - 1, 1).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', { month: 'long', year: 'numeric' });
  const shiftMonth = (amount: number) => {
    const next = new Date(year, month - 1 + amount, 1);
    onMonthChange(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  const weekdays = [t('calendar.mon'), t('calendar.tue'), t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat'), t('calendar.sun')];
  const [form, setForm] = useState<{ name: string; amount: string; category: string; kind: FixedExpenseKind }>({ name: '', amount: '', category: '', kind: 'subscription' });

  return (
    <section className="calendar-panel">
      <div className="calendar-toolbar">
        <div>
          <p className="eyebrow">{t('calendar.monthlyView')}</p>
          <h2>{title.charAt(0).toUpperCase() + title.slice(1)}</h2>
          <p className="calendar-hint">{t('calendar.hint')}</p>
        </div>
        <div className="calendar-actions">
          <button className="ghost small" onClick={() => shiftMonth(-1)} aria-label={t('calendar.prevMonth')}>←</button>
          <button className="ghost small" onClick={() => shiftMonth(1)} aria-label={t('calendar.nextMonth')}>→</button>
        </div>
      </div>
      <div className="calendar-weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
      <div className="calendar-grid">
        {cells.map((day, index) => {
          const subscriptions = items.filter((item) => item.active && item.dayOfMonth === day);
          return (
            <button
              className={`calendar-day ${day < 1 || day > daysInMonth ? 'outside' : ''} ${selectedDay === day ? 'selected' : ''}`}
              key={`${day}-${index}`}
              onClick={() => (day > 0 && day <= daysInMonth ? onDaySelect(day) : undefined)}
              disabled={day < 1 || day > daysInMonth}
            >
              {day > 0 && day <= daysInMonth ? (
                <>
                  <strong>{day}</strong>
                  {subscriptions.map((item) => (
                    <span className="calendar-subscription" key={item.id} title={`${item.name} - ${formatMoney(item.amount, language)}`}>
                      <span>{categoryIcon(item.category, language)}</span>
                      <b>{item.name}</b>
                    </span>
                  ))}
                  {selectedDay === day ? <i className="calendar-add">+</i> : null}
                </>
              ) : null}
            </button>
          );
        })}
      </div>
      {selectedDay ? (
        <form
          className="calendar-form"
          onSubmit={(event) => {
            event.preventDefault();
            void onAdd(form.name, Number(form.amount), form.category, selectedDay, form.kind);
            setForm({ name: '', amount: '', category: '', kind: 'subscription' });
          }}
        >
          <div>
            <p className="eyebrow">{t('calendar.newSubscription')}</p>
            <h3>{t('calendar.on', { day: String(selectedDay), month: title })}</h3>
          </div>
          <label>
            {t('calendar.name')}
            <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            {t('calendar.monthlyPrice')}
            <input required min="0" step="0.01" type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
          </label>
          <label>
            {t('calendar.category')}
            <select required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              <option value="">{t('calendar.choose')}</option>
              {subscriptionCategories.map((category) => (
                <option key={category.labelKey} value={translate(language, category.labelKey)}>{category.icon} {translate(language, category.labelKey)}</option>
              ))}
            </select>
          </label>
          <label>
            {t('form.fixed.type')}
            <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as FixedExpenseKind })}>
              <option value="subscription">{t('form.fixed.type.subscription')}</option>
              <option value="directDebit">{t('form.fixed.type.directDebit')}</option>
            </select>
          </label>
          <button type="submit">{t('calendar.addOnDate')}</button>
        </form>
      ) : null}
    </section>
  );
}
