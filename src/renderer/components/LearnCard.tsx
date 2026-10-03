import type { NewsWidget } from '@shared/nebula';
import type { Language } from '../i18n';
import { translate } from '../i18n';
import { Icon } from './Icon';

export type LearnState = { status: 'loading' } | { status: 'ready'; widget: NewsWidget } | { status: 'none' };

/**
 * "Learn" card of the overview (v0.1.39): Nebula News' finance articles of the day
 * (`news.finance.today`), already checked by the main process. Everything is shown as plain text
 * (React escapes it); the only action opens the finance theme in Nebula News. With nothing to show
 * (News or the Hub absent, empty theme, setting off), the card is simply not there.
 */
export function LearnCard({ state, language, onOpen }: { state: LearnState; language: Language; onOpen: (deepLink: string) => void }) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  if (state.status === 'none') return null;

  if (state.status === 'loading') {
    return (
      <section className="learn-panel" role="status" aria-busy="true" aria-label={t('learn.loading')}>
        <div className="learn-head">
          <span className="learn-icon" aria-hidden="true"><Icon name="compass" size={18} /></span>
          <div>
            <p className="eyebrow">{t('learn.eyebrow')}</p>
            <i className="skeleton skeleton-line" aria-hidden="true" />
          </div>
        </div>
        <i className="skeleton skeleton-line" aria-hidden="true" />
        <i className="skeleton skeleton-line short" aria-hidden="true" />
      </section>
    );
  }

  const { widget } = state;
  return (
    <section className="learn-panel" aria-labelledby="learn-title">
      <div className="learn-head">
        <span className="learn-icon" aria-hidden="true"><Icon name="compass" size={18} /></span>
        <div>
          <p className="eyebrow">{t('learn.eyebrow')}</p>
          <h2 id="learn-title">{widget.title}</h2>
          {widget.caption ? <p className="learn-caption">{widget.caption}</p> : null}
        </div>
        <button type="button" className="ghost small learn-open" onClick={() => onOpen(widget.deepLink)}>
          <Icon name="external" size={15} />
          {t('learn.open')}
        </button>
      </div>
      <ul className="learn-list">
        {widget.items.map((item, index) => (
          <li key={`${index}-${item.label}`}>
            <strong title={item.label}>{item.label}</strong>
            <span title={item.value}>{item.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
