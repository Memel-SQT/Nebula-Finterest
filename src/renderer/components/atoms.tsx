import type { ReactNode } from 'react';
import type { Language } from '../i18n';
import { translate } from '../i18n';
import { categoryIcon } from '../constants';

export function NavButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: string; onClick: () => void }) {
  return (
    <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}>
      <span>{icon}</span>
      {label}
      {active ? <b>›</b> : null}
    </button>
  );
}

export function Card({ label, value, accent, icon }: { label: string; value: string; accent: 'income' | 'fixed' | 'variable' | 'loans' | 'remaining'; icon: string }) {
  return (
    <article className={`summary-card ${accent}`}>
      <div className="card-top"><span>{label}</span><i>{icon}</i></div>
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
}: {
  title: string;
  subtitle: string;
  items: ListItem[];
  language: Language;
  onToggle?: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <article className="list-card">
      <div className="list-heading">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{item.name}</strong>
              <span>{categoryIcon(item.category, language)} {item.category}{item.kind ? ` · ${translate(language, item.kind === 'directDebit' ? 'badge.directDebit' : 'badge.subscription')}` : ''}</span>
            </div>
            <div className="row-actions">
              <span>{item.amountLabel}</span>
              {onToggle && item.active !== undefined ? (
                <button className="ghost small" onClick={() => onToggle(item.id, !item.active)}>
                  {translate(language, item.active ? 'list.deactivate' : 'list.activate')}
                </button>
              ) : null}
              <button className="ghost small" onClick={() => onDelete(item.id)}>
                {translate(language, 'list.delete')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}
