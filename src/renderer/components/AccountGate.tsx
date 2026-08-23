import { useState } from 'react';
import type { Language } from '../i18n';
import { translate } from '../i18n';
import type { LocalAccountSummary } from '@shared/accounts';
import { Avatar } from './atoms';
import logoUrl from '../../../assets/finterest-logo.svg';

export type AuthStage = 'select' | 'welcome' | 'login' | 'create' | 'manage';

export function AccountGate({
  stage,
  accounts,
  selectedAccountId,
  accountName,
  accountPin,
  error,
  language,
  onSelect,
  onAccountChange,
  onNameChange,
  onPinChange,
  onContinue,
  onLogin,
  onCreate,
  onManage,
  onBack,
  onSubmit,
  onDeleteAccount,
}: {
  stage: AuthStage;
  accounts: LocalAccountSummary[];
  selectedAccountId: string;
  accountName: string;
  accountPin: string;
  error: string | null;
  language: Language;
  onSelect: (id: string) => void;
  onAccountChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onPinChange: (value: string) => void;
  onContinue: () => void;
  onLogin: () => void;
  onCreate: () => void;
  onManage: () => void;
  onBack: () => void;
  onSubmit: () => void;
  onDeleteAccount: (id: string, pin: string) => Promise<void>;
}) {
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string>) => translate(language, key, params);
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);

  return (
    <main className="account-gate">
      <section className="account-card">
        <img src={logoUrl} alt="Finterest logo" />
        {stage === 'select' ? (
          <>
            <p className="eyebrow">{t('gate.localSpace')}</p>
            <h1>{t('gate.whoUses')}</h1>
            <p className="account-intro">{t('gate.chooseAccount')}</p>
            <div className="account-list">
              {accounts.map((account) => (
                <button className="account-choice" key={account.id} onClick={() => onSelect(account.id)}>
                  <Avatar name={account.name} avatarUrl={account.avatarUrl} />
                  <strong>{account.name}</strong>
                  <b>›</b>
                </button>
              ))}
            </div>
            <button className="ghost account-switch" onClick={onCreate}>{t('gate.createAnother')}</button>
            <button className="ghost account-switch" onClick={onManage}>{t('gate.manageAccounts')}</button>
          </>
        ) : stage === 'welcome' ? (
          <>
            <p className="eyebrow">{t('gate.welcome')}</p>
            <h1>{t('gate.hello', { name: selectedAccount?.name ?? '' })}</h1>
            <p className="account-intro">{t('gate.spaceReady')}</p>
            <button onClick={onContinue}>{t('gate.continue')}</button>
            <button className="ghost account-switch" onClick={onBack}>{t('gate.switchAccount')}</button>
          </>
        ) : stage === 'create' ? (
          <>
            <p className="eyebrow">{t('gate.localSpace')}</p>
            <h1>{t('gate.createAccount')}</h1>
            <p className="account-intro">{t('gate.createIntro')}</p>
            <label>
              {t('gate.accountName')}
              <input autoFocus value={accountName} onChange={(event) => onNameChange(event.target.value)} />
            </label>
            <label>
              {t('gate.pinLabel')}
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={accountPin}
                onChange={(event) => onPinChange(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') onSubmit(); }}
              />
            </label>
            {error ? <div className="error-banner">{error}</div> : null}
            <button onClick={onSubmit}>{t('gate.createAndContinue')}</button>
            {accounts.length > 0 ? <button className="ghost account-switch" onClick={onBack}>{t('gate.openExisting')}</button> : null}
          </>
        ) : stage === 'manage' ? (
          <AccountManagement
            accounts={accounts}
            language={language}
            error={error}
            onCreate={onCreate}
            onBack={onBack}
            onDeleteAccount={onDeleteAccount}
          />
        ) : (
          <>
            <p className="eyebrow">{t('gate.login')}</p>
            <h1>{t('gate.hello', { name: selectedAccount?.name ?? '' })}</h1>
            <p className="account-intro">{t('gate.loginIntro')}</p>
            <label>
              {t('gate.account')}
              <select value={selectedAccountId} onChange={(event) => onAccountChange(event.target.value)}>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </label>
            <label>
              {t('gate.pinShort')}
              <input
                autoFocus
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={accountPin}
                onChange={(event) => onPinChange(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') onSubmit(); }}
              />
            </label>
            {error ? <div className="error-banner">{error}</div> : null}
            <button onClick={onSubmit}>{t('gate.signIn')}</button>
            {accounts.length > 1 ? <button className="ghost account-switch" onClick={onLogin}>{t('gate.chooseAnother')}</button> : null}
          </>
        )}
      </section>
    </main>
  );
}

function AccountManagement({
  accounts,
  language,
  error,
  onCreate,
  onBack,
  onDeleteAccount,
}: {
  accounts: LocalAccountSummary[];
  language: Language;
  error: string | null;
  onCreate: () => void;
  onBack: () => void;
  onDeleteAccount: (id: string, pin: string) => Promise<void>;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmPin, setConfirmPin] = useState('');

  return (
    <>
      <p className="eyebrow">{t('gate.localSpace')}</p>
      <h1>{t('manage.title')}</h1>
      <p className="account-intro">{t('manage.intro')}</p>
      <div className="account-list">
        {accounts.map((account) => (
          <div className="account-choice manage-row" key={account.id}>
            <Avatar name={account.name} avatarUrl={account.avatarUrl} />
            <strong>{account.name}</strong>
            {confirmingId === account.id ? null : (
              <button className="ghost small" onClick={() => { setConfirmingId(account.id); setConfirmPin(''); }}>{t('manage.delete')}</button>
            )}
            {confirmingId === account.id ? (
              <div className="manage-confirm">
                <label>
                  {t('manage.deleteConfirmPin')}
                  <input
                    autoFocus
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={confirmPin}
                    onChange={(event) => setConfirmPin(event.target.value)}
                  />
                </label>
                <button
                  className="secondary small"
                  onClick={async () => {
                    await onDeleteAccount(account.id, confirmPin);
                    setConfirmingId(null);
                    setConfirmPin('');
                  }}
                >
                  {t('manage.deleteConfirmButton')}
                </button>
                <button className="ghost small" onClick={() => setConfirmingId(null)}>{t('manage.cancel')}</button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      <button onClick={onCreate}>{t('manage.addAccount')}</button>
      <button className="ghost account-switch" onClick={onBack}>{t('manage.back')}</button>
    </>
  );
}
