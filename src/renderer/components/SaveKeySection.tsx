import { useState } from 'react';
import type { Language } from '../i18n';
import { translate } from '../i18n';
import { Icon } from './Icon';

/**
 * The family's save key (Nebula Hub ADR-040): backups, exports and sync copies are encrypted with
 * it. The recovery key opens them on another computer, so it is shown only on request; another
 * computer's key can be added here so its saves open too.
 */
export function SaveKeySection({ language }: { language: Language }) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const [code, setCode] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'added' | 'invalid' | 'error'>('idle');

  const reveal = async () => {
    setCode(code ? null : await window.finterest.getSaveRecoveryCode().catch(() => null));
  };
  const add = async () => {
    const added = await window.finterest.importSaveRecoveryCode(input).catch(() => null);
    setStatus(added === null ? 'error' : added ? 'added' : 'invalid');
    if (added) setInput('');
  };

  return (
    <div className="save-key">
      <small className="path-note">{t('saveKey.hint')}</small>
      <div className="settings-actions">
        <button className="ghost small" onClick={() => void reveal()} aria-expanded={code !== null}>
          <Icon name={code ? 'eyeOff' : 'eye'} size={15} />{t(code ? 'saveKey.hide' : 'saveKey.show')}
        </button>
      </div>
      {code ? (
        <div className="save-key-code">
          <code>{code}</code>
          <small className="path-note save-key-warning"><Icon name="alert" size={14} />{t('saveKey.warning')}</small>
        </div>
      ) : null}
      <label className="select-field" htmlFor="save-key-import">{t('saveKey.import')}</label>
      <div className="settings-actions">
        <input
          id="save-key-import"
          className="save-key-input"
          placeholder="XXXXXXXX-XXXXXXXX-…"
          value={input}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            setInput(event.target.value);
            setStatus('idle');
          }}
        />
        <button className="secondary small" disabled={!input.trim()} onClick={() => void add()}>
          <Icon name="plus" size={15} />{t('saveKey.add')}
        </button>
      </div>
      {status !== 'idle' ? (
        <small className={`path-note ${status === 'added' ? '' : 'save-key-warning'}`} role="status">
          {t(status === 'added' ? 'saveKey.added' : status === 'invalid' ? 'saveKey.invalid' : 'saveKey.error')}
        </small>
      ) : null}
    </div>
  );
}
