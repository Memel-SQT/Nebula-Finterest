import { useState } from 'react';
import type { LocalAccountSummary } from '@shared/accounts';
import { GUEST_ACCOUNT_ID } from '@shared/accounts';
import type { Language } from '../i18n';
import { translate } from '../i18n';
import { Avatar } from './atoms';

export function ProfileScreen({
  account,
  language,
  onRename,
  onChangePhoto,
  onSwitchAccount,
}: {
  account: LocalAccountSummary;
  language: Language;
  onRename: (name: string) => Promise<void>;
  onChangePhoto: () => Promise<void>;
  onSwitchAccount: () => void;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const [name, setName] = useState(account.name);
  const isGuest = account.id === GUEST_ACCOUNT_ID;

  return (
    <section className="profile-panel">
      <div className="profile-identity">
        <Avatar name={account.name} avatarUrl={account.avatarUrl} size="lg" />
        {isGuest ? null : <button className="ghost small" onClick={() => void onChangePhoto()}>{t('profile.changePhoto')}</button>}
      </div>
      <div className="profile-fields">
        <p className="profile-intro">{isGuest ? t('profile.guestNotice') : t('profile.intro')}</p>
        {isGuest ? null : (
          <label>
            {t('profile.pseudonym')}
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
        )}
        <div className="profile-actions">
          {isGuest ? null : <button onClick={() => void onRename(name)}>{t('profile.save')}</button>}
          <button className={isGuest ? undefined : 'secondary'} onClick={onSwitchAccount}>
            {isGuest ? t('profile.exitGuest') : t('profile.switchAccount')}
          </button>
        </div>
      </div>
    </section>
  );
}
