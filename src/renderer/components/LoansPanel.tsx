import type { Loan } from '@shared/types';
import type { Language } from '../i18n';
import { translate } from '../i18n';
import { formatMoney } from '../constants';
import { FieldGroup } from './atoms';

export interface LoanFormState {
  name: string;
  principal: string;
  monthlyPayment: string;
  rate: string;
  remainingMonths: string;
}

export function LoansPanel({
  loans,
  form,
  language,
  onFormChange,
  onSubmit,
  onToggle,
  onDelete,
}: {
  loans: Loan[];
  form: LoanFormState;
  language: Language;
  onFormChange: (form: LoanFormState) => void;
  onSubmit: () => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string>) => translate(language, key, params);

  return (
    <>
      <section className="input-panel">
        <FieldGroup title={t('form.loan.title')}>
          <label>
            {t('form.loan.name')}
            <input value={form.name} onChange={(event) => onFormChange({ ...form, name: event.target.value })} />
          </label>
          <label>
            {t('form.loan.principal')}
            <input value={form.principal} inputMode="decimal" onChange={(event) => onFormChange({ ...form, principal: event.target.value })} />
          </label>
          <label>
            {t('form.loan.monthlyPayment')}
            <input value={form.monthlyPayment} inputMode="decimal" onChange={(event) => onFormChange({ ...form, monthlyPayment: event.target.value })} />
          </label>
          <label>
            {t('form.loan.rate')}
            <input value={form.rate} inputMode="decimal" onChange={(event) => onFormChange({ ...form, rate: event.target.value })} />
          </label>
          <label>
            {t('form.loan.remainingMonths')}
            <input value={form.remainingMonths} inputMode="numeric" onChange={(event) => onFormChange({ ...form, remainingMonths: event.target.value })} />
          </label>
          <button onClick={onSubmit}>{t('form.loan.submit')}</button>
        </FieldGroup>
      </section>

      <section className="lists-grid">
        <article className="list-card">
          <div className="list-heading">
            <div>
              <h2>{t('list.loans.title')}</h2>
              <p>{t('list.loans.subtitle')}</p>
            </div>
          </div>
          <ul>
            {loans.map((loan) => (
              <li key={loan.id}>
                <div>
                  <strong>{loan.name}</strong>
                  <span>{loan.interestRate}% · {loan.remainingMonths ?? '—'} {t('form.loan.remainingMonths').toLowerCase()}</span>
                </div>
                <div className="row-actions">
                  <span>{formatMoney(loan.monthlyPayment, language)}</span>
                  <button className="ghost small" onClick={() => onToggle(loan.id, !loan.active)}>
                    {t(loan.active ? 'list.deactivate' : 'list.activate')}
                  </button>
                  <button className="ghost small" onClick={() => onDelete(loan.id)}>{t('list.delete')}</button>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </>
  );
}
