import type { ReactNode } from 'react';
import type { Language } from '../i18n';
import { translate } from '../i18n';
import { categoryIcon } from '../constants';
import { Icon, type IconName } from './Icon';
import { EmptyState } from './ScreenState';

export function Avatar({ name, avatarUrl, size = 'md' }: { name: string; avatarUrl?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  if (avatarUrl) {
    return <img className={`avatar avatar-${size}`} src={avatarUrl} alt="" />;
  }
  return <span className={`avatar avatar-${size} avatar-fallback`}>{name.slice(0, 1).toUpperCase()}</span>;
}

export function Card({ label, value, accent, icon }: { label: string; value: string; accent: 'income' | 'fixed' | 'variable' | 'loans' | 'remaining'; icon: IconName }) {
  return (
    <article className={`summary-card ${accent}`}>
      <div className="card-top"><span>{label}</span><i><Icon name={icon} size={18} /></i></div>
      <strong>{value}</strong>
    </article>
  );
}

export function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="field-group">
      <h2>{title}</h2>
      <div className="field-grid">{children}</div>
    </article>
  );
}

interface ListItem {
  id: string;
  name: string;
  category: string;
  amountLabel: string;
  detail?: string;
  kind?: 'subscription' | 'directDebit';
  active?: boolean;
}

export function ListCard({
  title,
  subtitle,
  items,
  language,
  onToggle,
  onDelete,
  empty,
}: {
  title: string;
  subtitle: string;
  items: ListItem[];
  language: Language;
  onToggle?: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  /** Shown instead of an empty list. */
  empty?: { icon: IconName; title: string; body: string };
}) {
  return (
    <article className="list-card">
      <div className="list-heading">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {items.length === 0 && empty ? <EmptyState compact icon={empty.icon} title={empty.title} body={empty.body} /> : null}
      <ul>
        {items.map((item) => (
          <li key={item.id} className={item.active === false ? 'inactive' : undefined}>
            <span className="list-icon"><Icon name={categoryIcon(item.category, language)} size={18} /></span>
            <div className="list-text">
              <strong>{item.name}</strong>
              <span>
                {item.category || '—'}
                {item.kind ? ` · ${translate(language, item.kind === 'directDebit' ? 'badge.directDebit' : 'badge.subscription')}` : ''}
                {item.detail ? ` · ${item.detail}` : ''}
              </span>
            </div>
            <div className="row-actions">
              <span className="row-amount">{item.amountLabel}</span>
              {onToggle && item.active !== undefined ? (
                <button className="ghost small" data-sound="toggle" onClick={() => onToggle(item.id, !item.active)}>
                  <Icon name="power" size={14} />
                  {translate(language, item.active ? 'list.deactivate' : 'list.activate')}
                </button>
              ) : null}
              <button className="ghost small icon-button danger" data-sound="none" onClick={() => onDelete(item.id)} aria-label={`${translate(language, 'list.delete')} ${item.name}`} title={translate(language, 'list.delete')}>
                <Icon name="trash" size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}
