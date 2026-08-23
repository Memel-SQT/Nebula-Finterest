import type { CSSProperties } from 'react';
import type { BudgetSnapshot, BudgetSummary, FixedExpenseKind, Loan } from '@shared/types';
import type { Language } from '../i18n';
import { translate } from '../i18n';
import { formatMoney, subscriptionCategories } from '../constants';
import { Card, FieldGroup, ListCard } from './atoms';
import { LoansPanel, type LoanFormState } from './LoansPanel';

type DashboardView = 'overview' | 'fixed' | 'variable' | 'loans';

interface FixedFormState { name: string; amount: number; category: string; dayOfMonth: string; kind: FixedExpenseKind }
interface VariableFormState { name: string; amount: number; category: string; date: string }

export function Dashboard({
  activeView,
  language,
  snapshot,
  summary,
  activeMonthKey,
  remainingPercent,
  incomeInput,
  fixedForm,
  variableForm,
  loanForm,
  onIncomeInputChange,
  onSaveMonth,
  onSaveIncome,
  onFixedFormChange,
  onAddFixedExpense,
  onToggleFixedExpense,
  onDeleteFixedExpense,
  onVariableFormChange,
  onAddVariableExpense,
  onDeleteVariableExpense,
  onLoanFormChange,
  onAddLoan,
  onToggleLoan,
  onDeleteLoan,
}: {
  activeView: DashboardView;
  language: Language;
  snapshot: BudgetSnapshot;
  summary: BudgetSummary | null;
  activeMonthKey: string;
  remainingPercent: number;
  incomeInput: string;
  fixedForm: FixedFormState;
  variableForm: VariableFormState;
  loanForm: LoanFormState;
  onIncomeInputChange: (value: string) => void;
  onSaveMonth: () => void;
  onSaveIncome: () => void;
  onFixedFormChange: (form: FixedFormState) => void;
  onAddFixedExpense: () => void;
  onToggleFixedExpense: (id: string, active: boolean) => void;
  onDeleteFixedExpense: (id: string) => void;
  onVariableFormChange: (form: VariableFormState) => void;
  onAddVariableExpense: () => void;
  onDeleteVariableExpense: (id: string) => void;
  onLoanFormChange: (form: LoanFormState) => void;
  onAddLoan: () => void;
  onToggleLoan: (id: string, active: boolean) => void;
  onDeleteLoan: (id: string) => void;
}) {
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string>) => translate(language, key, params);

  return (
    <>
      <section className="summary-grid">
        <Card label={t('card.income')} value={formatMoney(summary?.income ?? 0, language)} accent="income" icon="↗" />
        <Card label={t('card.fixed')} value={formatMoney(summary?.totalFixedExpenses ?? 0, language)} accent="fixed" icon="▤" />
        <Card label={t('card.variable')} value={formatMoney(summary?.totalVariableExpenses ?? 0, language)} accent="variable" icon="⌁" />
        <Card label={t('card.loans')} value={formatMoney(summary?.totalLoanPayments ?? 0, language)} accent="loans" icon="▣" />
        <Card label={t('card.remaining')} value={formatMoney(summary?.remainingIncome ?? 0, language)} accent="remaining" icon="◒" />
      </section>

      {activeView === 'overview' ? (
        <section className="insight-grid">
          <article className="balance-panel">
            <div className="section-heading">
              <div><p className="eyebrow">{t('insight.status')}</p><h2>{t('insight.remainingTitle')}</h2></div>
              <span className="health-label">{remainingPercent.toFixed(0)}{t('insight.percentRemaining')}</span>
            </div>
            <div className="ring-wrap">
              <div className="balance-ring" style={{ '--progress': `${remainingPercent * 3.6}deg` } as CSSProperties}>
                <div><strong>{remainingPercent.toFixed(0)}%</strong><span>{t('insight.available')}</span></div>
              </div>
              <div className="ring-legend">
                <span><i className="dot income-dot" />{t('insight.income')} <b>{formatMoney(summary?.income ?? 0, language)}</b></span>
                <span><i className="dot spend-dot" />{t('insight.spent')} <b>{formatMoney(summary?.totalExpenses ?? 0, language)}</b></span>
              </div>
            </div>
          </article>
          <article className="snapshot-panel">
            <div className="section-heading">
              <div><p className="eyebrow">{t('insight.summary')}</p><h2>{t('insight.thisMonth')}</h2></div>
              <span className="period-badge">{activeMonthKey}</span>
            </div>
            <div className="snapshot-row"><span>{t('insight.income')}</span><strong>{formatMoney(summary?.income ?? 0, language)}</strong></div>
            <div className="snapshot-row"><span>{t('card.fixed')}</span><strong>{formatMoney(summary?.totalFixedExpenses ?? 0, language)}</strong></div>
            <div className="snapshot-row"><span>{t('card.variable')}</span><strong>{formatMoney(summary?.totalVariableExpenses ?? 0, language)}</strong></div>
            <div className="snapshot-row"><span>{t('card.loans')}</span><strong>{formatMoney(summary?.totalLoanPayments ?? 0, language)}</strong></div>
            <div className="snapshot-total"><span>{t('insight.totalSpent')}</span><strong>{formatMoney(summary?.totalExpenses ?? 0, language)}</strong></div>
          </article>
        </section>
      ) : null}

      {activeView === 'overview' ? (
        <section className="input-panel">
          <FieldGroup title={t('form.income.title')}>
            <label>
              {t('form.income.label')}
              <input aria-label={t('form.income.label')} value={incomeInput} onChange={(event) => onIncomeInputChange(event.target.value)} inputMode="decimal" />
            </label>
            <button className="ghost" onClick={onSaveMonth}>{t('form.income.saveMonth')}</button>
            <button onClick={onSaveIncome}>{t('form.income.saveIncome')}</button>
          </FieldGroup>
        </section>
      ) : null}

      {activeView === 'fixed' ? (
        <>
          <section className="input-panel">
            <FieldGroup title={t('form.fixed.title')}>
              <label>
                {t('form.fixed.name')}
                <input value={fixedForm.name} onChange={(event) => onFixedFormChange({ ...fixedForm, name: event.target.value })} />
              </label>
              <label>
                {t('form.fixed.amount')}
                <input value={fixedForm.amount} onChange={(event) => onFixedFormChange({ ...fixedForm, amount: Number(event.target.value) })} inputMode="decimal" />
              </label>
              <label>
                {t('form.fixed.category')}
                <select value={fixedForm.category} onChange={(event) => onFixedFormChange({ ...fixedForm, category: event.target.value })}>
                  <option value="">{t('form.fixed.categoryPlaceholder')}</option>
                  {subscriptionCategories.map((category) => (
                    <option key={category.labelKey} value={translate(language, category.labelKey)}>{category.icon} {translate(language, category.labelKey)}</option>
                  ))}
                </select>
              </label>
              <label>
                {t('form.fixed.dayOfMonth')}
                <input value={fixedForm.dayOfMonth} onChange={(event) => onFixedFormChange({ ...fixedForm, dayOfMonth: event.target.value })} inputMode="numeric" />
              </label>
              <label>
                {t('form.fixed.type')}
                <select value={fixedForm.kind} onChange={(event) => onFixedFormChange({ ...fixedForm, kind: event.target.value as FixedExpenseKind })}>
                  <option value="subscription">{t('form.fixed.type.subscription')}</option>
                  <option value="directDebit">{t('form.fixed.type.directDebit')}</option>
                </select>
              </label>
              <button onClick={onAddFixedExpense}>{t('form.fixed.submit')}</button>
            </FieldGroup>
          </section>
          <section className="lists-grid">
            <ListCard
              title={t('list.fixed.title')}
              subtitle={t('list.fixed.subtitle')}
              language={language}
              items={snapshot.fixedExpenses.map((expense) => ({ id: expense.id, name: expense.name, category: expense.category, amountLabel: formatMoney(expense.amount, language), kind: expense.kind, active: expense.active }))}
              onToggle={onToggleFixedExpense}
              onDelete={onDeleteFixedExpense}
            />
          </section>
        </>
      ) : null}

      {activeView === 'variable' ? (
        <>
          <section className="input-panel">
            <FieldGroup title={t('form.variable.title')}>
              <label>
                {t('form.variable.name')}
                <input value={variableForm.name} onChange={(event) => onVariableFormChange({ ...variableForm, name: event.target.value })} />
              </label>
              <label>
                {t('form.variable.amount')}
                <input value={variableForm.amount} onChange={(event) => onVariableFormChange({ ...variableForm, amount: Number(event.target.value) })} inputMode="decimal" />
              </label>
              <label>
                {t('form.variable.category')}
                <input value={variableForm.category} onChange={(event) => onVariableFormChange({ ...variableForm, category: event.target.value })} />
              </label>
              <label>
                {t('form.variable.date')}
                <input type="date" value={variableForm.date} onChange={(event) => onVariableFormChange({ ...variableForm, date: event.target.value })} />
              </label>
              <button onClick={onAddVariableExpense}>{t('form.variable.submit')}</button>
            </FieldGroup>
          </section>
          <section className="lists-grid">
            <ListCard
              title={t('list.variable.title')}
              subtitle={t('list.variable.subtitle', { month: activeMonthKey })}
              language={language}
              items={snapshot.variableExpenses
                .filter((expense) => expense.monthKey === activeMonthKey)
                .map((expense) => ({ id: expense.id, name: expense.name, category: expense.category, amountLabel: formatMoney(expense.amount, language) }))}
              onDelete={onDeleteVariableExpense}
            />
          </section>
        </>
      ) : null}

      {activeView === 'loans' ? (
        <LoansPanel
          loans={snapshot.loans as Loan[]}
          form={loanForm}
          language={language}
          onFormChange={onLoanFormChange}
          onSubmit={onAddLoan}
          onToggle={onToggleLoan}
          onDelete={onDeleteLoan}
        />
      ) : null}
    </>
  );
}
