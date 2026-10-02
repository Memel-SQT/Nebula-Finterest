import type { CSSProperties } from 'react';
import type { NebulaState, SyncStatus, UpdateStatus } from '@shared/types';
import type { LocalAccountSummary } from '@shared/accounts';
import { useEffect } from 'react';
import type { Language } from '../i18n';
import { translate } from '../i18n';
import { isLegacyTheme, type ResolvedTheme, type Theme } from '../theme';
import { ACCENT_PRESETS, DEFAULT_APPEARANCE, type Appearance, type BackgroundEffect, type MotionLevel } from '../appearance';
import { playSound } from '../sound';
import { Icon, type IconName } from './Icon';
import logoUrl from '../../../assets/nebula-logo.svg';

const BACKGROUNDS: Array<{ id: BackgroundEffect; icon: IconName }> = [
  { id: 'glow', icon: 'sparkles' },
  { id: 'aurora', icon: 'droplet' },
  { id: 'stars', icon: 'moon' },
  { id: 'particles', icon: 'layers' },
  { id: 'waves', icon: 'bolt' },
  { id: 'none', icon: 'close' },
];
const MOTIONS: MotionLevel[] = ['full', 'reduced', 'off'];

export function SettingsPanel({
  databasePath,
  isGuest,
  language,
  theme,
  resolvedTheme,
  appearance,
  updateStatus,
  syncStatus,
  onExport,
  onImport,
  onLanguageChange,
  onThemeChange,
  onAppearanceChange,
  onCheckForUpdates,
  onInstallUpdate,
  onOpenProfile,
  onChooseSyncDirectory,
  onDisableSync,
  onSyncNow,
  restorable = [],
  onRefreshRestorable,
  onRestoreProfile,
  nebulaState,
  followNebula = true,
  onFollowNebulaChange,
  onUpdatesByHubChange,
  onOpenNebulaHub,
}: {
  databasePath: string;
  isGuest: boolean;
  language: Language;
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  appearance: Appearance;
  updateStatus: UpdateStatus | null;
  syncStatus: SyncStatus | null;
  onExport: () => Promise<void>;
  onImport: () => Promise<void>;
  onLanguageChange: (language: Language) => void;
  onThemeChange: (theme: Theme) => void;
  onAppearanceChange: (patch: Partial<Appearance>) => void;
  onCheckForUpdates: () => Promise<void>;
  onInstallUpdate: () => Promise<void>;
  onOpenProfile: () => void;
  onChooseSyncDirectory: () => Promise<void>;
  onDisableSync: () => Promise<void>;
  onSyncNow: () => Promise<void>;
  /** Profiles in the copy folder that this computer does not have (v0.1.37). */
  restorable?: LocalAccountSummary[];
  onRefreshRestorable?: () => Promise<void>;
  onRestoreProfile?: (id: string) => Promise<void>;
  nebulaState?: NebulaState | null;
  followNebula?: boolean;
  onFollowNebulaChange?: (follow: boolean) => void;
  onUpdatesByHubChange?: (enabled: boolean) => Promise<void>;
  onOpenNebulaHub?: () => Promise<void>;
}) {
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string>) => translate(language, key, params);
  const legacyTheme = isLegacyTheme(resolvedTheme);

  // What the copy folder holds that this computer does not, listed when the settings open.
  useEffect(() => {
    if (syncStatus?.directory) void onRefreshRestorable?.();
    // Once per folder, not on every render (the callback is recreated by App on each render).
  }, [syncStatus?.directory]);

  const updateMessage = (() => {
    switch (updateStatus?.state) {
      case 'checking': return t('update.checking');
      case 'available': return t('update.available');
      case 'downloaded': return t('update.downloaded');
      case 'not-available': return t('update.notAvailable');
      case 'error': return t('update.error');
      default: return null;
    }
  })();

  const syncState = syncStatus?.state ?? 'disabled';
  const lastSync = syncStatus?.lastSyncAt
    ? new Date(syncStatus.lastSyncAt).toLocaleString(language === 'en' ? 'en-US' : 'fr-FR', { dateStyle: 'short', timeStyle: 'short' })
    : null;

  return (
    <section className="settings-panel">
      <div className="settings-icon"><img src={logoUrl} alt="" /></div>
      <div className="settings-body">
        <p className="settings-intro">{t('settings.description')}</p>

        <div className="settings-section">
          <h3><Icon name="palette" size={15} />{t('settings.appearance')}</h3>
          <div className="settings-fields">
            <label className="select-field">
              {t('settings.theme')}
              <select value={theme} onChange={(event) => onThemeChange(event.target.value as Theme)}>
                <option value="nebula-dark">{t('theme.nebulaDark')}</option>
                <option value="nebula-light">{t('theme.nebulaLight')}</option>
                <option value="glass-dark">{t('theme.glassDark')}</option>
                <option value="glass-light">{t('theme.glassLight')}</option>
                <option value="old-dark">{t('theme.oldDark')}</option>
                <option value="old-light">{t('theme.oldLight')}</option>
                <option value="system">{t('theme.system')}</option>
              </select>
            </label>
            <label className="select-field">
              {t('settings.language')}
              <select value={language} onChange={(event) => onLanguageChange(event.target.value as Language)}>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
          {resolvedTheme.startsWith('glass-') && appearance.background !== 'aurora' ? (
            <small className="path-note settings-hint"><Icon name="info" size={14} />{t('settings.glassHint')}</small>
          ) : null}

          <p className="settings-label">{t('settings.accent')}</p>
          <div className="swatch-row" role="radiogroup" aria-label={t('settings.accent')}>
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                role="radio"
                aria-checked={appearance.accentPreset === preset.id}
                className={`swatch ${appearance.accentPreset === preset.id ? 'active' : ''}`}
                style={{ '--swatch-a': preset.secondary, '--swatch-b': preset.primary } as CSSProperties}
                onClick={() => onAppearanceChange({ accentPreset: preset.id })}
                disabled={legacyTheme}
                data-sound="toggle"
              >
                <i aria-hidden="true" />
                <span>{t(preset.labelKey)}</span>
              </button>
            ))}
            <button
              role="radio"
              aria-checked={appearance.accentPreset === 'custom'}
              className={`swatch ${appearance.accentPreset === 'custom' ? 'active' : ''}`}
              style={{ '--swatch-a': appearance.customSecondary, '--swatch-b': appearance.customPrimary } as CSSProperties}
              onClick={() => onAppearanceChange({ accentPreset: 'custom' })}
              disabled={legacyTheme}
              data-sound="toggle"
            >
              <i aria-hidden="true" />
              <span>{t('accent.custom')}</span>
            </button>
          </div>
          {appearance.accentPreset === 'custom' && !legacyTheme ? (
            <div className="settings-fields color-fields">
              <label className="color-field">
                <input type="color" value={appearance.customPrimary} onChange={(event) => onAppearanceChange({ customPrimary: event.target.value })} />
                {t('settings.accentPrimary')}
              </label>
              <label className="color-field">
                <input type="color" value={appearance.customSecondary} onChange={(event) => onAppearanceChange({ customSecondary: event.target.value })} />
                {t('settings.accentSecondary')}
              </label>
            </div>
          ) : null}
          {legacyTheme ? <small className="path-note">{t('settings.accentLegacyNote')}</small> : null}
        </div>

        <div className="settings-section">
          <h3><Icon name="sparkles" size={15} />{t('settings.effects')}</h3>
          <p className="settings-label">{t('settings.background')}</p>
          <div className="effect-grid" role="radiogroup" aria-label={t('settings.background')}>
            {BACKGROUNDS.map((background) => (
              <button
                key={background.id}
                role="radio"
                aria-checked={appearance.background === background.id}
                className={`effect-tile effect-${background.id} ${appearance.background === background.id ? 'active' : ''}`}
                onClick={() => onAppearanceChange({ background: background.id })}
                data-sound="toggle"
              >
                <span className="effect-preview" aria-hidden="true"><Icon name={background.icon} size={18} /></span>
                <span>{t(`background.${background.id}`)}</span>
              </button>
            ))}
          </div>
          <p className="settings-label">{t('settings.motion')}</p>
          <div className="segmented" role="radiogroup" aria-label={t('settings.motion')}>
            {MOTIONS.map((motion) => (
              <button
                key={motion}
                type="button"
                role="radio"
                aria-checked={appearance.motion === motion}
                className={appearance.motion === motion ? 'active' : ''}
                onClick={() => onAppearanceChange({ motion })}
                data-sound="toggle"
              >
                {t(`motion.${motion}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <h3><Icon name={appearance.soundEnabled ? 'volume' : 'volumeOff'} size={15} />{t('settings.sounds')}</h3>
          <div className="sound-row">
            <button
              type="button"
              role="switch"
              aria-checked={appearance.soundEnabled}
              className={`switch ${appearance.soundEnabled ? 'on' : ''}`}
              data-sound="none"
              onClick={() => {
                const next = !appearance.soundEnabled;
                onAppearanceChange({ soundEnabled: next });
                if (next) playSound('toggle', { force: true });
              }}
            >
              <i aria-hidden="true" />
              <span>{t('settings.soundEnabled')} — {t(appearance.soundEnabled ? 'settings.on' : 'settings.off')}</span>
            </button>
            <label className="range-field">
              {t('settings.soundVolume')}
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={appearance.soundVolume}
                disabled={!appearance.soundEnabled}
                onChange={(event) => onAppearanceChange({ soundVolume: Number(event.target.value) })}
              />
              <b>{appearance.soundVolume}%</b>
            </label>
            <button className="ghost small" data-sound="none" disabled={!appearance.soundEnabled} onClick={() => playSound('success')}>
              <Icon name="volume" size={15} />{t('settings.soundTest')}
            </button>
          </div>
          <div className="settings-actions settings-reset">
            <button className="ghost small" data-sound="none" onClick={() => { onAppearanceChange(DEFAULT_APPEARANCE); onThemeChange('nebula-dark'); }}>
              <Icon name="refresh" size={15} />{t('settings.reset')}
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3><Icon name="download" size={15} />{t('settings.data')}</h3>
          {isGuest ? (
            <small className="path-note">{t('profile.guestNotice')}</small>
          ) : (
            <>
              <div className="settings-actions">
                <button onClick={onExport}><Icon name="download" size={16} />{t('settings.export')}</button>
                <button className="secondary" onClick={onImport}><Icon name="upload" size={16} />{t('settings.import')}</button>
              </div>
              <small className="path-note">{t('settings.path', { path: databasePath || t('settings.loading') })}</small>
              <small className="path-note">{t('backup.rootNote')}</small>
            </>
          )}
        </div>

        <div className="settings-section">
          <h3><Icon name="folderSync" size={15} />{t('sync.title')}</h3>
          <p className="settings-copy">{t('sync.description')}</p>
          <div className="settings-actions">
            <button className={syncStatus?.directory ? 'ghost small' : 'small'} onClick={() => void onChooseSyncDirectory()}>
              <Icon name="folderSync" size={15} />{t(syncStatus?.directory ? 'sync.change' : 'sync.choose')}
            </button>
            {syncStatus?.directory ? (
              <>
                <button className="ghost small" onClick={() => void onSyncNow()} disabled={syncState === 'syncing'}>
                  <Icon name="refresh" size={15} />{t('sync.now')}
                </button>
                <button className="ghost small danger" onClick={() => void onDisableSync()}>
                  <Icon name="power" size={15} />{t('sync.disable')}
                </button>
              </>
            ) : null}
          </div>
          <div className={`sync-status sync-${syncState}`}>
            <span className="status-dot" />
            <span>{t(`sync.state.${syncState}`)}</span>
          </div>
          {syncStatus?.directory ? <small className="path-note">{t('sync.folder', { path: syncStatus.directory })}</small> : null}
          {lastSync && syncState !== 'disabled' ? <small className="path-note">{t('sync.lastSync', { time: lastSync })}</small> : null}
          <small className="path-note">{t('sync.warning')}{isGuest ? ` ${t('sync.guestNote')}` : ''}</small>
          {restorable.length && onRestoreProfile ? (
            <div className="restorable">
              <p className="settings-copy">{t('sync.restorable')}</p>
              <div className="settings-actions">
                {restorable.map((profile) => (
                  <button key={profile.id} className="ghost small" onClick={() => void onRestoreProfile(profile.id)}>
                    <Icon name="user" size={15} />{t('sync.restore', { name: profile.name })}
                  </button>
                ))}
              </div>
              <small className="path-note">{t('sync.restoreNote')}</small>
            </div>
          ) : null}
        </div>

        <div className="settings-section">
          <h3><Icon name="overview" size={15} />{t('nebula.title')}</h3>
          <div className={`sync-status ${nebulaState?.connected ? 'sync-idle' : 'sync-disabled'}`}>
            <span className="status-dot" />
            <span>{nebulaState?.connected ? t('nebula.connected', { version: nebulaState.hubVersion ?? '' }) : t('nebula.offline')}</span>
          </div>
          {onFollowNebulaChange ? (
            <>
              <button type="button" role="switch" aria-checked={followNebula} aria-describedby="nebula-follow-hint" className={`switch ${followNebula ? 'on' : ''}`} data-sound="toggle" onClick={() => onFollowNebulaChange(!followNebula)}>
                <i aria-hidden="true" />
                <span>{t('nebula.follow')}</span>
              </button>
              <small className="path-note" id="nebula-follow-hint">{t('nebula.followHint')}</small>
            </>
          ) : null}
          {onUpdatesByHubChange ? (
            <>
              <button type="button" role="switch" aria-checked={Boolean(nebulaState?.updatesByHub)} aria-describedby="nebula-updates-hint" className={`switch ${nebulaState?.updatesByHub ? 'on' : ''}`} data-sound="toggle" onClick={() => void onUpdatesByHubChange(!nebulaState?.updatesByHub)}>
                <i aria-hidden="true" />
                <span>{t('nebula.updatesByHub')}</span>
              </button>
              <small className="path-note" id="nebula-updates-hint">{t('nebula.updatesByHubHint')}</small>
            </>
          ) : null}
          <small className="path-note">{t('nebula.privacy')}</small>
          {onOpenNebulaHub ? (
            <div className="settings-actions settings-reset">
              <button className="ghost small" onClick={() => void onOpenNebulaHub()}><Icon name="overview" size={15} />{t('nebula.apps')}</button>
            </div>
          ) : null}
        </div>

        <div className="settings-section">
          <h3><Icon name="refresh" size={15} />{t('settings.updates')}</h3>
          <div className="settings-actions">
            <button className="ghost small" onClick={() => void onCheckForUpdates()} disabled={updateStatus?.state === 'checking'}>{t('update.check')}</button>
            {updateStatus?.state === 'downloaded' ? (
              <button className="small" onClick={() => void onInstallUpdate()}>{t('update.restartInstall')}</button>
            ) : null}
          </div>
          {updateMessage ? <small className="path-note">{updateMessage}</small> : null}
        </div>

        <div className="settings-section">
          <h3><Icon name="user" size={15} />{t('settings.account')}</h3>
          <div className="settings-actions">
            <button className="ghost small" onClick={onOpenProfile}>{t('settings.viewProfile')}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
