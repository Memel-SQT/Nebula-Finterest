import { useState, type CSSProperties } from 'react';
import { budgetExpenses, budgetsOfScale, type BudgetStatus } from '@shared/budgets';
import { formatLocalDate, parseAmount } from '@shared/budget';
import type { Budget, BudgetPeriod, BudgetScale, BudgetSnapshot } from '@shared/types';
import type { Language, TranslationKey } from '../i18n';
import { translate } from '../i18n';
import { formatMoney } from '../constants';
import { SignedAmount } from './atoms';
import { Dialog } from './Dialog';
import { Icon } from './Icon';
import { EmptyState } from './ScreenState';

/** What the panel asks App to do; each returns whether it succeeded (forms reset only then). */
export interface BudgetActions {
  saveBudget: (budget: Partial<Budget> & { name: string; amount: number }) => Promise<boolean>;
  deleteBudget: (id: string) => Promise<boolean>;
  addExpense: (expense: { name: string; amount: number; date: string; budgetId: string }) => Promise<boolean>;
  deleteExpense: (id: string) => Promise<boolean>;
}

interface BudgetForm {
  id?: string;
  name: string;
  amount: string;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  countsInMonth: boolean;
}

const PERIODS: BudgetPeriod[] = ['month', 'range', 'open'];

function emptyForm(scale: BudgetScale): BudgetForm {
  // Everyday budgets renew every month and count in the month; a big budget starts as a forecast.
  return scale === 'regular'
    ? { name: '', amount: '', period: 'month', startDate: '', endDate: '', countsInMonth: true }
    : { name: '', amount: '', period: 'range', startDate: formatLocalDate(new Date()), endDate: '', countsInMonth: false };
}

function shortDate(date: string, language: Language): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Budgets (v0.1.40), for everyday envelopes (`regular`) and large projects such as a trip
 * (`project`, the "Gros budgets" screen). A purchase charged to a budget is an ordinary planned
 * purchase: the budget updates itself, and so do the calendar and, unless the budget is a forecast,
 * the month's "reste à vivre".
 */
export function BudgetsPanel({ scale, snapshot, monthKey, language, actions }: {
  scale: BudgetScale;
  snapshot: BudgetSnapshot;
  monthKey: string;
  language: Language;
  actions: BudgetActions;
}) {
  const t = (key: TranslationKey, params?: Record<string, string>) => translate(language, key, params);
  const [form, setForm] = useState<BudgetForm>(() => emptyForm(scale));
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<BudgetStatus | null>(null);
  const statuses = budgetsOfScale(snapshot, scale, monthKey);

  async function submit(): Promise<void> {
    const amount = parseAmount(form.amount);
    if (!form.name.trim()) return setFormError(t('error.invalidName'));
    if (!Number.isFinite(amount) || amount < 0) return setFormError(t('error.negativeAmount'));
    if (form.period === 'range' && (!form.startDate || !form.endDate || form.startDate > form.endDate)) return setFormError(t('error.invalidDate'));
    setFormError(null);
    const saved = await actions.saveBudget({
      id: form.id,
      name: form.name,
      amount,
      scale,
      period: form.period,
      startDate: form.period === 'range' ? form.startDate : null,
      endDate: form.period === 'range' ? form.endDate : null,
      countsInMonth: form.countsInMonth,
      parentId: null,
    });
    if (saved) setForm(emptyForm(scale));
  }

  function edit(budget: Budget): void {
    setForm({ id: budget.id, name: budget.name, amount: String(budget.amount).replace('.', ','), period: budget.period, startDate: budget.startDate ?? '', endDate: budget.endDate ?? '', countsInMonth: budget.countsInMonth });
    setFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="budgets-layout">
      <section className="field-group budget-form" aria-labelledby={`budget-form-${scale}`}>
        <h2 id={`budget-form-${scale}`}>{t(form.id ? 'budgets.edit' : scale === 'regular' ? 'budgets.new' : 'budgets.newProject')}</h2>
        <form
          className="field-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label>
            {t('budgets.name')}
            <input value={form.name} placeholder={t(scale === 'regular' ? 'budgets.namePlaceholder' : 'budgets.projectPlaceholder')} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            {t(form.period === 'month' ? 'budgets.amountMonthly' : 'budgets.amount')}
            <input inputMode="decimal" placeholder="0,00" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
          </label>
          <p className="settings-label" id={`budget-period-${scale}`}>{t('budgets.period')}</p>
          <div className="segmented" role="radiogroup" aria-labelledby={`budget-period-${scale}`}>
            {PERIODS.map((period) => (
              <button key={period} type="button" role="radio" aria-checked={form.period === period} className={form.period === period ? 'active' : ''} data-sound="toggle" onClick={() => setForm({ ...form, period })}>
                {t(`budgets.period.${period}`)}
              </button>
            ))}
          </div>
          {form.period === 'range' ? (
            <div className="budget-dates">
              <label>
                {t('budgets.start')}
                <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
              </label>
              <label>
                {t('budgets.end')}
                <input type="date" value={form.endDate} min={form.startDate || undefined} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
              </label>
            </div>
          ) : null}
          <button
            type="button"
            role="switch"
            aria-checked={form.countsInMonth}
            aria-describedby={`budget-counts-${scale}`}
            className={`switch ${form.countsInMonth ? 'on' : ''}`}
            data-sound="toggle"
            onClick={() => setForm({ ...form, countsInMonth: !form.countsInMonth })}
          >
            <i aria-hidden="true" />
            <span>{t('budgets.countsInMonth')}</span>
          </button>
          <small className="path-note" id={`budget-counts-${scale}`}>{t('budgets.countsHint')}</small>
          {formError ? <p className="form-error" role="alert">{formError}</p> : null}
          <div className="budget-form-actions">
            <button type="submit" data-sound="none"><Icon name={form.id ? 'check' : 'plus'} size={16} />{t(form.id ? 'budgets.save' : 'budgets.create')}</button>
            {form.id ? <button type="button" className="ghost" onClick={() => { setForm(emptyForm(scale)); setFormError(null); }}>{t('budgets.cancel')}</button> : null}
          </div>
        </form>
      </section>

      <section className="budget-list" aria-label={t(scale === 'regular' ? 'nav.budgets' : 'nav.projects')}>
        {statuses.length === 0 ? (
          <EmptyState
            icon={scale === 'regular' ? 'layers' : 'rocket'}
            title={t(scale === 'regular' ? 'budgets.empty.title' : 'projects.empty.title')}
            body={t(scale === 'regular' ? 'budgets.empty.body' : 'projects.empty.body')}
          />
        ) : (
          statuses.map((status) => (
            <BudgetCard key={status.budget.id} status={status} snapshot={snapshot} language={language} actions={actions} onEdit={edit} onDelete={setDeleting} />
          ))
        )}
      </section>

      {deleting ? (
        <Dialog
          title={t('budgets.deleteTitle', { name: deleting.budget.name })}
          icon="trash"
          tone="danger"
          confirmLabel={t('list.delete')}
          cancelLabel={t('budgets.cancel')}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            const id = deleting.budget.id;
            setDeleting(null);
            if (form.id === id) setForm(emptyForm(scale));
            void actions.deleteBudget(id);
          }}
        >
          <p>{t(deleting.budget.countsInMonth ? 'budgets.deleteKeep' : 'budgets.deleteForecast')}</p>
        </Dialog>
      ) : null}
    </div>
  );
}

function Progress({ ratio, label }: { ratio: number; label: string }) {
  const over = ratio > 1;
  return (
    <div className={`budget-progress ${over ? 'over' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)} aria-label={label}>
      <i style={{ '--ratio': Math.min(1, Math.max(0, ratio)) } as CSSProperties} />
    </div>
  );
}

function BudgetCard({ status, snapshot, language, actions, onEdit, onDelete }: {
  status: BudgetStatus;
  snapshot: BudgetSnapshot;
  language: Language;
  actions: BudgetActions;
  onEdit: (budget: Budget) => void;
  onDelete: (status: BudgetStatus) => void;
}) {
  const t = (key: TranslationKey, params?: Record<string, string>) => translate(language, key, params);
  const { budget } = status;
  const [panel, setPanel] = useState<'none' | 'expense' | 'envelope'>('none');
  const [expense, setExpense] = useState({ name: '', amount: '', date: budget.period === 'range' && budget.startDate ? budget.startDate : formatLocalDate(new Date()), budgetId: budget.id });
  const [envelope, setEnvelope] = useState({ name: '', amount: '' });
  const [error, setError] = useState<string | null>(null);
  const expenses = budgetExpenses(budget, snapshot);
  const envelopeName = new Map(status.children.map((child) => [child.budget.id, child.budget.name]));
  const periodLabel = budget.period === 'month'
    ? t('budgets.period.month')
    : budget.period === 'range' && budget.startDate && budget.endDate
      ? t('budgets.range', { start: shortDate(budget.startDate, language), end: shortDate(budget.endDate, language) })
      : t('budgets.period.open');

  async function addExpense(): Promise<void> {
    const amount = parseAmount(expense.amount);
    if (!expense.name.trim()) return setError(t('error.invalidName'));
    if (!Number.isFinite(amount) || amount < 0) return setError(t('error.negativeAmount'));
    if (!expense.date) return setError(t('error.invalidDate'));
    setError(null);
    if (await actions.addExpense({ name: expense.name, amount, date: expense.date, budgetId: expense.budgetId })) {
      setExpense({ ...expense, name: '', amount: '' });
    }
  }

  async function addEnvelope(): Promise<void> {
    const amount = parseAmount(envelope.amount);
    if (!envelope.name.trim()) return setError(t('error.invalidName'));
    if (!Number.isFinite(amount) || amount < 0) return setError(t('error.negativeAmount'));
    setError(null);
    if (await actions.saveBudget({ name: envelope.name, amount, parentId: budget.id })) setEnvelope({ name: '', amount: '' });
  }

  return (
    <article className={`budget-card ${status.remaining < 0 ? 'is-over' : ''}`}>
      <header className="budget-card-head">
        <span className="budget-card-icon" aria-hidden="true"><Icon name={budget.scale === 'regular' ? 'layers' : 'rocket'} size={18} /></span>
        <div>
          <h3>{budget.name}</h3>
          <p className="budget-badges">
            <span className="budget-badge">{periodLabel}</span>
            <span className={`budget-badge ${budget.countsInMonth ? 'in-month' : 'forecast'}`}>{t(budget.countsInMonth ? 'budgets.inMonth' : 'budgets.forecast')}</span>
          </p>
        </div>
        <div className="budget-card-tools">
          <button type="button" className="ghost small icon-button" onClick={() => onEdit(budget)} aria-label={`${t('budgets.edit')} ${budget.name}`} title={t('budgets.edit')}><Icon name="sliders" size={16} /></button>
          <button type="button" className="ghost small icon-button danger" data-sound="none" onClick={() => onDelete(status)} aria-label={`${t('list.delete')} ${budget.name}`} title={t('list.delete')}><Icon name="trash" size={16} /></button>
        </div>
      </header>

      <dl className="budget-figures">
        <div><dt>{t('budgets.planned')}</dt><dd>{formatMoney(status.amount, language)}</dd></div>
        <div><dt>{t('budgets.spent')}</dt><dd>{formatMoney(status.spent, language)}</dd></div>
        <div><dt>{t('budgets.remaining')}</dt><dd><SignedAmount value={status.remaining} language={language} /></dd></div>
      </dl>
      <Progress ratio={status.ratio} label={`${budget.name} : ${Math.round(status.ratio * 100)} %`} />

      {status.children.length ? (
        <div className="budget-envelopes">
          <p className="budget-subtitle">
            {t('budgets.envelopes')}
            <small className={status.allocated > status.amount ? 'warn' : ''}>
              {t(status.allocated > status.amount ? 'budgets.overAllocated' : 'budgets.allocated', { allocated: formatMoney(status.allocated, language), amount: formatMoney(status.amount, language) })}
            </small>
          </p>
          <ul>
            {status.children.map((child) => (
              <li key={child.budget.id}>
                <div className="budget-envelope-line">
                  <strong>{child.budget.name}</strong>
                  <span>{formatMoney(child.spent, language)} / {formatMoney(child.amount, language)}</span>
                  <SignedAmount value={child.remaining} language={language} />
                  <button type="button" className="ghost small icon-button danger" data-sound="none" onClick={() => onDelete(child)} aria-label={`${t('list.delete')} ${child.budget.name}`} title={t('list.delete')}><Icon name="close" size={14} /></button>
                </div>
                <Progress ratio={child.ratio} label={`${child.budget.name} : ${Math.round(child.ratio * 100)} %`} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="budget-card-actions">
        <button type="button" className={`ghost small ${panel === 'expense' ? 'pressed' : ''}`} aria-expanded={panel === 'expense'} onClick={() => { setPanel(panel === 'expense' ? 'none' : 'expense'); setError(null); }}>
          <Icon name="plus" size={15} />{t('budgets.addExpense')}
        </button>
        <button type="button" className={`ghost small ${panel === 'envelope' ? 'pressed' : ''}`} aria-expanded={panel === 'envelope'} onClick={() => { setPanel(panel === 'envelope' ? 'none' : 'envelope'); setError(null); }}>
          <Icon name="layers" size={15} />{t('budgets.addEnvelope')}
        </button>
      </div>

      {panel === 'expense' ? (
        <form className="budget-inline-form" onSubmit={(event) => { event.preventDefault(); void addExpense(); }}>
          <label>{t('form.variable.name')}<input value={expense.name} onChange={(event) => setExpense({ ...expense, name: event.target.value })} /></label>
          <label>{t('form.variable.amount')}<input inputMode="decimal" placeholder="0,00" value={expense.amount} onChange={(event) => setExpense({ ...expense, amount: event.target.value })} /></label>
          <label>{t('form.variable.date')}<input type="date" value={expense.date} onChange={(event) => setExpense({ ...expense, date: event.target.value })} /></label>
          {status.children.length ? (
            <label>
              {t('budgets.expenseIn')}
              <select value={expense.budgetId} onChange={(event) => setExpense({ ...expense, budgetId: event.target.value })}>
                <option value={budget.id}>{t('budgets.wholeBudget')}</option>
                {status.children.map((child) => <option key={child.budget.id} value={child.budget.id}>{child.budget.name}</option>)}
              </select>
            </label>
          ) : null}
          <button type="submit" className="secondary small" data-sound="none"><Icon name="check" size={15} />{t('budgets.expenseAdd')}</button>
        </form>
      ) : null}

      {panel === 'envelope' ? (
        <form className="budget-inline-form" onSubmit={(event) => { event.preventDefault(); void addEnvelope(); }}>
          <label>{t('budgets.envelopeName')}<input value={envelope.name} placeholder={t('budgets.envelopePlaceholder')} onChange={(event) => setEnvelope({ ...envelope, name: event.target.value })} /></label>
          <label>{t('budgets.amount')}<input inputMode="decimal" placeholder="0,00" value={envelope.amount} onChange={(event) => setEnvelope({ ...envelope, amount: event.target.value })} /></label>
          <button type="submit" className="secondary small" data-sound="none"><Icon name="check" size={15} />{t('budgets.envelopeAdd')}</button>
        </form>
      ) : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="budget-expenses">
        <p className="budget-subtitle">{t('budgets.recent')}</p>
        {expenses.length === 0 ? <p className="budget-empty">{t('budgets.noExpense')}</p> : (
          <ul>
            {expenses.slice(0, 6).map((item) => (
              <li key={item.id}>
                <span className="budget-expense-date">{shortDate(item.date, language)}</span>
                <span className="budget-expense-name" title={item.name}>{item.name}{item.budgetId && envelopeName.has(item.budgetId) ? <small> · {envelopeName.get(item.budgetId)}</small> : null}</span>
                <b>{formatMoney(item.amount, language)}</b>
                <button type="button" className="ghost small icon-button danger" data-sound="none" onClick={() => void actions.deleteExpense(item.id)} aria-label={`${t('list.delete')} ${item.name}`} title={t('list.delete')}><Icon name="trash" size={14} /></button>
              </li>
            ))}
          </ul>
        )}
        {expenses.length > 6 ? <small className="path-note">{t('budgets.more', { count: String(expenses.length - 6) })}</small> : null}
      </div>
    </article>
  );
}
