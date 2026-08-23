import type { Language } from '../i18n';
import { translate } from '../i18n';
import logoUrl from '../../../assets/finterest-logo.svg';

export function SettingsPanel({
  databasePath,
  language,
  onExport,
  onImport,
  onLanguageChange,
}: {
  databasePath: string;
  language: Language;
  onExport: () => Promise<void>;
  onImport: () => Promise<void>;
  onLanguageChange: (language: Language) => void;
}) {
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string>) => translate(language, key, params);

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
      </div>
    </section>
  );
}
