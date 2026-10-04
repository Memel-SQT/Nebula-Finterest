import type { LocalAccountSummary } from '@shared/accounts';
import { GUEST_ACCOUNT_ID } from '@shared/accounts';
import type { NebulaState } from '@shared/types';
import type { Language, TranslationKey } from '../i18n';
import { translate } from '../i18n';
import { Avatar } from './atoms';
import { Icon, type IconName } from './Icon';
import logoUrl from '../../../assets/nebula-logo.svg';

export type ActiveView = 'overview' | 'calendar' | 'fixed' | 'variable' | 'budgets' | 'projects' | 'wallets' | 'loans' | 'calculator' | 'profile' | 'settings';
type NavGroup = 'budget' | 'plans' | 'tools' | 'system';

export const NAV_ITEMS: Array<{ view: ActiveView; group: NavGroup; labelKey: TranslationKey; icon: IconName }> = [
  { view: 'overview', group: 'budget', labelKey: 'nav.overview', icon: 'navHome' },
  { view: 'calendar', group: 'budget', labelKey: 'nav.calendar', icon: 'calendar' },
  { view: 'fixed', group: 'budget', labelKey: 'nav.fixed', icon: 'repeat' },
  { view: 'variable', group: 'budget', labelKey: 'nav.variable', icon: 'bag' },
  { view: 'budgets', group: 'budget', labelKey: 'nav.budgets', icon: 'layers' },
  { view: 'projects', group: 'plans', labelKey: 'nav.projects', icon: 'rocket' },
  { view: 'wallets', group: 'plans', labelKey: 'nav.wallets', icon: 'wallet' },
  { view: 'loans', group: 'tools', labelKey: 'nav.loans', icon: 'bank' },
  { view: 'calculator', group: 'tools', labelKey: 'nav.calculator', icon: 'calculator' },
  { view: 'settings', group: 'system', labelKey: 'nav.settings', icon: 'gear' },
];

const GROUP_TITLES: Record<Exclude<NavGroup, 'system'>, TranslationKey> = {
  budget: 'nav.group.budget',
  plans: 'nav.group.plans',
  tools: 'nav.group.tools',
};

/**
 * Sidebar, after Nebula Hub 2ebf5f6 `src/renderer/components/Sidebar.tsx`: a floating panel with
 * the brand lockup, the profile card (open profile + lock), the sections in titled groups, then
 * Settings, the Nebula Hub status card and the local-only footer pinned at the bottom. Below
 * 1100 px it becomes an icon rail (labels stay as tooltips and for screen readers), below 720 px
 * a bar at the top (styles.css).
 */
export function Sidebar({ active, account, nebulaState, syncError, version, language, onNavigate, onLock, onOpenHub }: {
  active: ActiveView;
  account: LocalAccountSummary | null;
  nebulaState: NebulaState | null;
  syncError: boolean;
  version: string;
  language: Language;
  onNavigate: (view: ActiveView) => void;
  onLock: () => void;
  onOpenHub: () => void;
}) {
  const t = (key: TranslationKey, params?: Record<string, string>) => translate(language, key, params);
  const connected = Boolean(nebulaState?.connected);
  const hubLine = connected ? t('sidebar.hub.connected') : t('sidebar.hub.absent');
  const isGuest = account?.id === GUEST_ACCOUNT_ID;

  const navItem = (item: (typeof NAV_ITEMS)[number]) => {
    const current = item.view === active;
    const label = t(item.labelKey);
    return (
      <button
        key={item.view}
        type="button"
        className={`nav-item ${current ? 'active' : ''}`}
        data-sound="nav"
        aria-current={current ? 'page' : undefined}
        title={label}
        onClick={() => onNavigate(item.view)}
      >
        <span className="nav-icon"><Icon name={item.icon} size={18} /></span>
        <span className="nav-label">{label}</span>
      </button>
    );
  };

  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <img src={logoUrl} alt="" width={40} height={40} />
        <div>
          <strong>{t('app.name')}</strong>
          <span>{t('app.tagline')}</span>
        </div>
      </div>

      {account ? (
        <div className={`profile-card ${active === 'profile' ? 'active' : ''}`}>
          <button
            type="button"
            className="profile-card-main"
            data-sound="nav"
            aria-current={active === 'profile' ? 'page' : undefined}
            title={`${t('nav.profile')} · ${account.name}`}
            onClick={() => onNavigate('profile')}
          >
            <Avatar name={account.name} avatarUrl={account.avatarUrl} size="sm" />
            <span className="profile-card-text">
              <strong>{account.name}</strong>
              <small>{t(isGuest ? 'sidebar.profile.guest' : 'sidebar.profile.open')}</small>
            </span>
          </button>
          <button
            type="button"
            className="profile-card-lock"
            data-sound="nav"
            title={t(isGuest ? 'profile.exitGuest' : 'sidebar.profile.lock')}
            aria-label={t(isGuest ? 'profile.exitGuest' : 'sidebar.profile.lock')}
            onClick={onLock}
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      ) : null}

      <nav className="sidebar-nav" aria-label={t('nav.sections')}>
        {(Object.keys(GROUP_TITLES) as Array<keyof typeof GROUP_TITLES>).map((group) => (
          <div key={group} className="nav-group" role="group" aria-labelledby={`nav-group-${group}`}>
            <p className="nav-group-title" id={`nav-group-${group}`}>{t(GROUP_TITLES[group])}</p>
            {NAV_ITEMS.filter((item) => item.group === group).map(navItem)}
          </div>
        ))}
        <div className="nav-group nav-group-system">
          {NAV_ITEMS.filter((item) => item.group === 'system').map(navItem)}
        </div>
      </nav>

      <button
        type="button"
        className={`link-card ${connected ? 'is-online' : 'is-absent'}`}
        data-sound="nav"
        title={`${t('sidebar.hub.title')} · ${hubLine} — ${t('sidebar.hub.open')}`}
        onClick={onOpenHub}
      >
        <span className="link-card-icon">
          <Icon name="orbit" size={18} />
          <i className={`status-dot ${connected ? '' : 'idle'}`} aria-hidden="true" />
        </span>
        <span className="link-card-text">
          <strong>{t('sidebar.hub.title')}</strong>
          <small>{hubLine}</small>
        </span>
        <Icon name="chevronRight" size={14} className="link-card-chevron" />
      </button>

      <p className={`sidebar-foot ${syncError ? 'has-warning' : ''}`} title={t(syncError ? 'sync.state.error' : 'sidebar.localNote')}>
        <Icon name={syncError ? 'alert' : 'shield'} size={13} />
        <span>{t('sidebar.local')}</span>
        <small className="tabular">{t('sidebar.version', { version })}</small>
      </p>
    </aside>
  );
}
