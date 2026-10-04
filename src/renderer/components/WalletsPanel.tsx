import { useState, type CSSProperties } from 'react';
import { walletBalance } from '@shared/budgets';
import { formatLocalDate, parseAmount } from '@shared/budget';
import type { BudgetSnapshot, Wallet, WalletMovement } from '@shared/types';
import type { Language, TranslationKey } from '../i18n';
import { translate } from '../i18n';
import { formatMoney } from '../constants';
import { SignedAmount } from './atoms';
import { Dialog } from './Dialog';
import { Icon } from './Icon';
import { EmptyState } from './ScreenState';

export interface WalletActions {
  saveWallet: (wallet: Partial<Wallet> & { name: string }) => Promise<boolean>;
  deleteWallet: (id: string) => Promise<boolean>;
  addMovement: (movement: { walletId: string; amount: number; label: string; date: string }) => Promise<boolean>;
  deleteMovement: (id: string) => Promise<boolean>;
}

function shortDate(date: string, language: Language): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Pots (v0.1.41): money set aside, with a balance that carries over from month to month. Each
 * deposit or withdrawal is a movement; the balance is their sum, green above zero, red below.
 * Pots are kept apart from the month's budget: they never change the "reste à vivre".
 */
export function WalletsPanel({ snapshot, language, actions }: { snapshot: BudgetSnapshot; language: Language; actions: WalletActions }) {
  const t = (key: TranslationKey, params?: Record<string, string>) => translate(language, key, params);
  const [form, setForm] = useState({ name: '', goal: '' });
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Wallet | null>(null);
  const wallets = snapshot.wallets ?? [];
  const movements = snapshot.walletMovements ?? [];

  async function create(): Promise<void> {
    const goal = form.goal.trim() ? parseAmount(form.goal) : null;
    if (!form.name.trim()) return setError(t('error.invalidName'));
    if (goal !== null && (!Number.isFinite(goal) || goal < 0)) return setError(t('error.negativeAmount'));
    setError(null);
    if (await actions.saveWallet({ name: form.name, goal })) setForm({ name: '', goal: '' });
  }

  return (
    <div className="budgets-layout">
      <section className="field-group budget-form" aria-labelledby="wallet-form-title">
        <h2 id="wallet-form-title">{t('wallets.new')}</h2>
        <form className="field-grid" onSubmit={(event) => { event.preventDefault(); void create(); }}>
          <label>{t('wallets.name')}<input value={form.name} placeholder={t('wallets.namePlaceholder')} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>{t('wallets.goal')}<input inputMode="decimal" placeholder="0,00" value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })} /></label>
          <small className="path-note">{t('wallets.hint')}</small>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button type="submit" data-sound="none"><Icon name="plus" size={16} />{t('wallets.create')}</button>
        </form>
      </section>

      <section className="budget-list" aria-label={t('nav.wallets')}>
        {wallets.length === 0 ? (
          <EmptyState icon="wallet" title={t('wallets.empty.title')} body={t('wallets.empty.body')} />
        ) : (
          wallets.map((wallet) => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              balance={walletBalance(wallet.id, movements)}
              movements={movements.filter((movement) => movement.walletId === wallet.id)}
              language={language}
              actions={actions}
              onDelete={setDeleting}
            />
          ))
        )}
      </section>

      {deleting ? (
        <Dialog
          title={t('wallets.deleteTitle', { name: deleting.name })}
          icon="trash"
          tone="danger"
          confirmLabel={t('list.delete')}
          cancelLabel={t('budgets.cancel')}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            const id = deleting.id;
            setDeleting(null);
            void actions.deleteWallet(id);
          }}
        >
          <p>{t('wallets.deleteBody', { count: String(movements.filter((movement) => movement.walletId === deleting.id).length) })}</p>
        </Dialog>
      ) : null}
    </div>
  );
}

function WalletCard({ wallet, balance, movements, language, actions, onDelete }: {
  wallet: Wallet;
  balance: number;
  movements: WalletMovement[];
  language: Language;
  actions: WalletActions;
  onDelete: (wallet: Wallet) => void;
}) {
  const t = (key: TranslationKey, params?: Record<string, string>) => translate(language, key, params);
  const [entry, setEntry] = useState({ direction: 'in' as 'in' | 'out', amount: '', label: '', date: formatLocalDate(new Date()) });
  const [error, setError] = useState<string | null>(null);
  const ratio = wallet.goal ? Math.min(1, Math.max(0, balance / wallet.goal)) : 0;

  async function add(): Promise<void> {
    const amount = parseAmount(entry.amount);
    if (!Number.isFinite(amount) || amount <= 0) return setError(t('error.negativeAmount'));
    if (!entry.date) return setError(t('error.invalidDate'));
    setError(null);
    const signed = entry.direction === 'in' ? amount : -amount;
    if (await actions.addMovement({ walletId: wallet.id, amount: signed, label: entry.label.trim() || t(entry.direction === 'in' ? 'wallets.deposit' : 'wallets.withdraw'), date: entry.date })) {
      setEntry({ ...entry, amount: '', label: '' });
    }
  }

  return (
    <article className={`budget-card wallet-card ${balance < 0 ? 'is-over' : ''}`}>
      <header className="budget-card-head">
        <span className="budget-card-icon" aria-hidden="true"><Icon name="wallet" size={18} /></span>
        <div>
          <h3>{wallet.name}</h3>
          {wallet.goal ? <p className="budget-badges"><span className="budget-badge">{t('wallets.goalOf', { goal: formatMoney(wallet.goal, language) })}</span></p> : null}
        </div>
        <div className="budget-card-tools">
          <button type="button" className="ghost small icon-button danger" data-sound="none" onClick={() => onDelete(wallet)} aria-label={`${t('list.delete')} ${wallet.name}`} title={t('list.delete')}><Icon name="trash" size={16} /></button>
        </div>
      </header>
      <p className="wallet-balance"><span>{t('wallets.balance')}</span><SignedAmount value={balance} language={language} /></p>
      {wallet.goal ? (
        <div className="budget-progress goal" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)} aria-label={`${wallet.name} : ${Math.round(ratio * 100)} %`}>
          <i style={{ '--ratio': ratio } as CSSProperties} />
        </div>
      ) : null}

      <form className="budget-inline-form" onSubmit={(event) => { event.preventDefault(); void add(); }}>
        <div className="segmented" role="radiogroup" aria-label={t('wallets.movements')}>
          {(['in', 'out'] as const).map((direction) => (
            <button key={direction} type="button" role="radio" aria-checked={entry.direction === direction} className={entry.direction === direction ? 'active' : ''} data-sound="toggle" onClick={() => setEntry({ ...entry, direction })}>
              {t(direction === 'in' ? 'wallets.deposit' : 'wallets.withdraw')}
            </button>
          ))}
        </div>
        <label>{t('wallets.amount')}<input inputMode="decimal" placeholder="0,00" value={entry.amount} onChange={(event) => setEntry({ ...entry, amount: event.target.value })} /></label>
        <label>{t('wallets.label')}<input value={entry.label} onChange={(event) => setEntry({ ...entry, label: event.target.value })} /></label>
        <label>{t('wallets.date')}<input type="date" value={entry.date} onChange={(event) => setEntry({ ...entry, date: event.target.value })} /></label>
        <button type="submit" className="secondary small" data-sound="none"><Icon name="check" size={15} />{t('wallets.add')}</button>
      </form>
      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="budget-expenses">
        <p className="budget-subtitle">{t('wallets.movements')}</p>
        {movements.length === 0 ? <p className="budget-empty">{t('wallets.noMovement')}</p> : (
          <ul>
            {movements.slice(0, 8).map((movement) => (
              <li key={movement.id}>
                <span className="budget-expense-date">{shortDate(movement.date, language)}</span>
                <span className="budget-expense-name" title={movement.label}>{movement.label}</span>
                <SignedAmount value={movement.amount} language={language} signed />
                <button type="button" className="ghost small icon-button danger" data-sound="none" onClick={() => void actions.deleteMovement(movement.id)} aria-label={`${t('list.delete')} ${movement.label}`} title={t('list.delete')}><Icon name="trash" size={14} /></button>
              </li>
            ))}
          </ul>
        )}
        {movements.length > 8 ? <small className="path-note">{t('budgets.more', { count: String(movements.length - 8) })}</small> : null}
      </div>
    </article>
  );
}
