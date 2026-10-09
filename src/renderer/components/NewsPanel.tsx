import { useCallback, useEffect, useState } from 'react';
import type { NewsTab } from '@shared/nebula';
import type { Language } from '../i18n';
import { translate } from '../i18n';
import { Icon } from './Icon';

/** The tab asks the main process this often while it is on screen (the main process decides when News is really asked). */
const NEWS_TAB_POLL_MS = 30 * 1000;

type PanelState = { state: 'loading' } | NewsTab;

/**
 * "Nebula News" tab (Nebula Hub ADR-036): the latest finance articles of Nebula News, already
 * checked by the main process, shown as plain text (React escapes it). Asked when the tab opens,
 * every 30 s and when the window comes back, so the list appears on its own once News answers.
 * An article opens in Nebula News.
 */
export function NewsPanel({ language, onOpen }: { language: Language; onOpen: (deepLink: string) => void }) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const [view, setView] = useState<PanelState>({ state: 'loading' });

  const load = useCallback(() => {
    if (document.hidden) return;
    void window.finterest.getFinanceArticles().then(setView, () => setView({ state: 'unavailable' }));
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, NEWS_TAB_POLL_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, [load]);

  const dateOf = (iso: string) => new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

  if (view.state === 'loading') {
    return (
      <section className="news-tab" role="status" aria-busy="true" aria-label={t('newsTab.loading')}>
        <i className="skeleton skeleton-line" aria-hidden="true" />
        <i className="skeleton skeleton-line" aria-hidden="true" />
        <i className="skeleton skeleton-line short" aria-hidden="true" />
      </section>
    );
  }

  if (view.state !== 'ready') {
    const copy = {
      unavailable: ['newsTab.unavailable.title', 'newsTab.unavailable.body'],
      empty: ['newsTab.empty.title', 'newsTab.empty.body'],
      off: ['newsTab.off.title', 'newsTab.off.body'],
    } as const;
    const [title, body] = copy[view.state];
    return (
      <section className="news-tab news-tab-empty">
        <span className="news-tab-icon" aria-hidden="true"><Icon name="newspaper" size={26} /></span>
        <h2>{t(title)}</h2>
        <p>{t(body)}</p>
      </section>
    );
  }

  return (
    <section className="news-tab" aria-labelledby="news-tab-title">
      <div className="news-tab-head">
        <h2 id="news-tab-title">{view.articles.title}</h2>
        <button type="button" className="ghost small" data-sound="nav" onClick={load}>
          <Icon name="refresh" size={15} />
          {t('newsTab.refresh')}
        </button>
      </div>
      <ul className="news-tab-list">
        {view.articles.items.map((item) => (
          <li key={item.deepLink}>
            <button type="button" className="news-tab-item" data-sound="nav" onClick={() => onOpen(item.deepLink)}>
              <span className="news-tab-meta">
                <strong>{item.source}</strong>
                <time dateTime={item.publishedAt}>{dateOf(item.publishedAt)}</time>
              </span>
              <span className="news-tab-title">{item.title}</span>
              {item.summary ? <span className="news-tab-summary">{item.summary}</span> : null}
              <span className="news-tab-open"><Icon name="external" size={14} />{t('learn.open')}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
