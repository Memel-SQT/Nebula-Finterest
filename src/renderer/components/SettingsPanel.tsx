import type { UpdateStatus } from '@shared/types';
import type { Language } from '../i18n';
import { translate } from '../i18n';
import type { Theme } from '../theme';
import logoUrl from '../../../assets/finterest-logo.svg';

export function SettingsPanel({
  databasePath,
  language,
  theme,
  updateStatus,
  onExport,
  onImport,
  onLanguageChange,
  onThemeChange,
  onCheckForUpdates,
  onInstallUpdate,
  onOpenProfile,
}: {
  databasePath: string;
  language: Language;
  theme: Theme;
  updateStatus: UpdateStatus | null;
  onExport: () => Promise<void>;
  onImport: () => Promise<void>;
  onLanguageChange: (language: Language) => void;
  onThemeChange: (theme: Theme) => void;
  onCheckForUpdates: () => Promise<void>;
  onInstallUpdate: () => Promise<void>;
  onOpenProfile: () => void;
}) {
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string>) => translate(language, key, params);

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

  return (
    <section className="settings-panel">
      <div className="settings-icon"><img src={logoUrl} alt="" /></div>
      <div>
        <p className="eyebrow">{t('settings.title')}</p>
        <h2>{t('settings.title')}</h2>
        <p>{t('settings.description')}</p>

        <div className="settings-section">
          <h3>{t('settings.appearance')}</h3>
          <div className="settings-fields">
            <label className="select-field">
              {t('settings.theme')}
              <select value={theme} onChange={(event) => onThemeChange(event.target.value as Theme)}>
                <option value="light">{t('theme.light')}</option>
                <option value="dark">{t('theme.dark')}</option>
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
        </div>

        <div className="settings-section">
          <h3>{t('settings.data')}</h3>
          <div className="settings-actions">
            <button onClick={onExport}>{t('settings.export')}</button>
            <button className="secondary" onClick={onImport}>{t('settings.import')}</button>
          </div>
          <small className="path-note">{t('settings.path', { path: databasePath || t('settings.loading') })}</small>
        </div>

        <div className="settings-section">
          <h3>{t('settings.updates')}</h3>
          <div className="settings-actions">
            <button className="ghost small" onClick={() => void onCheckForUpdates()} disabled={updateStatus?.state === 'checking'}>{t('update.check')}</button>
            {updateStatus?.state === 'downloaded' ? (
              <button className="small" onClick={() => void onInstallUpdate()}>{t('update.restartInstall')}</button>
            ) : null}
          </div>
          {updateMessage ? <small className="path-note">{updateMessage}</small> : null}
        </div>

        <div className="settings-section">
          <h3>{t('settings.account')}</h3>
          <div className="settings-actions">
            <button className="ghost small" onClick={onOpenProfile}>{t('settings.viewProfile')}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
