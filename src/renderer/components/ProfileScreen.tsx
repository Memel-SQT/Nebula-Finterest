import { useEffect, useState } from 'react';
import type { LocalAccountSummary } from '@shared/accounts';
import { GUEST_ACCOUNT_ID } from '@shared/accounts';
import type { Language } from '../i18n';
import { translate } from '../i18n';
import { Avatar } from './atoms';
import { Icon } from './Icon';

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

  // The name can change underneath this screen (a sync pulled a rename from another machine).
  useEffect(() => setName(account.name), [account.name]);

  return (
    <section className="profile-panel">
      <div className="profile-identity">
        <Avatar name={account.name} avatarUrl={account.avatarUrl} size="lg" />
        {isGuest ? null : <button className="ghost small" onClick={() => void onChangePhoto()}><Icon name="camera" size={15} />{t('profile.changePhoto')}</button>}
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
          {isGuest ? null : <button onClick={() => void onRename(name)}><Icon name="check" size={16} />{t('profile.save')}</button>}
          <button className={isGuest ? undefined : 'secondary'} onClick={onSwitchAccount}>
            <Icon name="logout" size={16} />
            {isGuest ? t('profile.exitGuest') : t('profile.switchAccount')}
          </button>
        </div>
      </div>
    </section>
  );
}
