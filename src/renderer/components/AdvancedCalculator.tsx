import type { Language } from '../i18n';
import { translate } from '../i18n';
import { formatMoney } from '../constants';

export function AdvancedCalculator({
  form,
  language,
  onChange,
}: {
  form: { capital: string; rate: string; years: string };
  language: Language;
  onChange: (form: { capital: string; rate: string; years: string }) => void;
}) {
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string>) => translate(language, key, params);
  const capital = Number(form.capital) || 0;
  const rate = Number(form.rate) || 0;
  const years = Number(form.years) || 0;
  const result = capital * Math.pow(1 + rate / 100, years);
  const interest = Math.max(0, result - capital);

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
        <small>{t('advanced.interestOf', { amount: formatMoney(interest, language) })}</small>
      </div>
    </section>
  );
}
