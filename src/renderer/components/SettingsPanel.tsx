import type { UpdateStatus } from '@shared/types';
import type { Language } from '../i18n';
import { translate } from '../i18n';
import logoUrl from '../../../assets/finterest-logo.svg';

export function SettingsPanel({
  databasePath,
  language,
  updateStatus,
  onExport,
  onImport,
  onLanguageChange,
  onCheckForUpdates,
  onInstallUpdate,
}: {
  databasePath: string;
  language: Language;
  updateStatus: UpdateStatus | null;
  onExport: () => Promise<void>;
  onImport: () => Promise<void>;
  onLanguageChange: (language: Language) => void;
  onCheckForUpdates: () => Promise<void>;
  onInstallUpdate: () => Promise<void>;
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
        <div className="settings-actions">
          <button onClick={onExport}>{t('settings.export')}</button>
          <button className="secondary" onClick={onImport}>{t('settings.import')}</button>
        </div>
        <label className="language-field">
          {t('settings.language')}
          <select value={language} onChange={(event) => onLanguageChange(event.target.value as Language)}>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </label>
        <small className="path-note">{t('settings.path', { path: databasePath || t('settings.loading') })}</small>

        <div className="settings-updates">
          <p className="eyebrow">{t('settings.updates')}</p>
          <div className="settings-actions">
            <button className="ghost small" onClick={() => void onCheckForUpdates()} disabled={updateStatus?.state === 'checking'}>{t('update.check')}</button>
            {updateStatus?.state === 'downloaded' ? (
              <button className="small" onClick={() => void onInstallUpdate()}>{t('update.restartInstall')}</button>
            ) : null}
          </div>
          {updateMessage ? <small className="path-note">{updateMessage}</small> : null}
        </div>
      </div>
    </section>
  );
}
