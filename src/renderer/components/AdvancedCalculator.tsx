import type { Language } from '../i18n';
import { translate } from '../i18n';
import { formatMoney } from '../constants';

export interface AdvancedCalculatorForm {
  capital: string;
  rate: string;
  years: string;
  monthlyInvestment: string;
}

export function AdvancedCalculator({
  form,
  language,
  onChange,
}: {
  form: AdvancedCalculatorForm;
  language: Language;
  onChange: (form: AdvancedCalculatorForm) => void;
}) {
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string>) => translate(language, key, params);
  const capital = Number(form.capital) || 0;
  const rate = Number(form.rate) || 0;
  const years = Math.max(0, Number(form.years) || 0);
  const monthlyInvestment = Number(form.monthlyInvestment) || 0;

  const months = Math.round(years * 12);
  const monthlyRate = rate / 100 / 12;
  const growthFactor = Math.pow(1 + monthlyRate, months);

  // Future value = lump sum growth + future value of an ordinary annuity (monthly contributions).
  const futureValueOfCapital = capital * growthFactor;
  const futureValueOfContributions = monthlyRate === 0
    ? monthlyInvestment * months
    : monthlyInvestment * ((growthFactor - 1) / monthlyRate);

  const result = futureValueOfCapital + futureValueOfContributions;
  const totalContributed = capital + monthlyInvestment * months;
  const interest = Math.max(0, result - totalContributed);

  return (
    <section className="advanced-panel">
      <div>
        <p className="eyebrow">{t('advanced.title')}</p>
        <h2>{t('advanced.heading')}</h2>
        <p>{t('advanced.description')}</p>
      </div>
      <div className="advanced-form">
        <label>
          {t('advanced.capital')}
          <input inputMode="decimal" value={form.capital} onChange={(event) => onChange({ ...form, capital: event.target.value })} />
        </label>
        <label>
          {t('advanced.monthlyInvestment')}
          <input inputMode="decimal" value={form.monthlyInvestment} onChange={(event) => onChange({ ...form, monthlyInvestment: event.target.value })} />
        </label>
        <label>
          {t('advanced.rate')}
          <input inputMode="decimal" value={form.rate} onChange={(event) => onChange({ ...form, rate: event.target.value })} />
        </label>
        <label>
          {t('advanced.years')}
          <input inputMode="numeric" value={form.years} onChange={(event) => onChange({ ...form, years: event.target.value })} />
        </label>
      </div>
      <div className="advanced-result">
        <span>{t('advanced.estimatedValue')}</span>
        <strong>{formatMoney(result, language)}</strong>
        <small>{t('advanced.contributedOf', { amount: formatMoney(totalContributed, language) })}</small>
        <small>{t('advanced.interestOf', { amount: formatMoney(interest, language) })}</small>
      </div>
    </section>
  );
}
