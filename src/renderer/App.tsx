import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { computeBudgetSummary, getMonthKey } from '@shared/budget';
import type { BudgetSnapshot } from '@shared/types';
import type { LocalAccountSummary } from '@shared/accounts';
import logoUrl from '../../assets/finterest-logo.svg';

const emptyExpense = {
  name: '',
  amount: 0,
  category: '',
};

export function App() {
  const [snapshot, setSnapshot] = useState<BudgetSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [incomeInput, setIncomeInput] = useState('0');
  const [databasePath, setDatabasePath] = useState('');
  const [activeView, setActiveView] = useState<'overview' | 'calendar' | 'fixed' | 'variable' | 'settings'>('overview');
  const [activeMode, setActiveMode] = useState<'simple' | 'advanced'>('simple');
  const [interestForm, setInterestForm] = useState({ capital: '1000', rate: '3', years: '5' });
  const [fixedForm, setFixedForm] = useState({ ...emptyExpense, dayOfMonth: '' });
  const [variableForm, setVariableForm] = useState({ ...emptyExpense, date: new Date().toISOString().slice(0, 10) });
  const [activeMonthKey, setActiveMonthKey] = useState(getMonthKey(new Date()));
  const [accounts, setAccounts] = useState<LocalAccountSummary[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountPin, setAccountPin] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [authStage, setAuthStage] = useState<'select' | 'welcome' | 'login' | 'create'>('create');
  const [calendarDay, setCalendarDay] = useState<number | null>(null);

  useEffect(() => {
    void loadAccounts();
    void loadDatabasePath();
  }, []);

  useEffect(() => {
    if (snapshot) {
      setIncomeInput(String(snapshot.settings.income));
      setActiveMonthKey(snapshot.settings.activeMonthKey);
    }
  }, [snapshot]);

  const summary = useMemo(() => (snapshot ? computeBudgetSummary(snapshot, activeMonthKey) : null), [snapshot, activeMonthKey]);

  async function loadAccounts(): Promise<void> {
    const nextAccounts = await window.finterest.listAccounts();
    setAccounts(nextAccounts);
    setSelectedAccountId(nextAccounts[0]?.id ?? '');
    setAuthStage(nextAccounts.length > 1 ? 'select' : nextAccounts.length === 1 ? 'login' : 'create');
  }

  async function handleAccountAccess(): Promise<void> {
    try {
      setError(null);
      if (authStage === 'create' || accounts.length === 0 || isCreatingAccount) {
        const account = await window.finterest.createAccount(accountName, accountPin);
        setAccounts([account]);
        setSelectedAccountId(account.id);
        setSnapshot(await window.finterest.getSnapshot());
        setIsCreatingAccount(false);
      } else {
        setSnapshot(await window.finterest.unlockAccount(selectedAccountId, accountPin));
      }
      setAccountPin('');
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : 'Impossible d’ouvrir ce compte.');
    }
  }

  async function refreshSnapshot(): Promise<void> {
    try {
      setError(null);
      const nextSnapshot = await window.finterest.getSnapshot();
      setSnapshot(nextSnapshot);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : 'Impossible de charger le budget.');
    }
  }

  async function loadDatabasePath(): Promise<void> {
    try {
      const nextPath = await window.finterest.getDatabasePath();
      setDatabasePath(nextPath);
    } catch {
      setDatabasePath('Indisponible');
    }
  }

  async function handleSaveIncome(): Promise<void> {
    try {
      setError(null);
      const nextSnapshot = await window.finterest.saveIncome(Number(incomeInput));
      setSnapshot(nextSnapshot);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : 'Impossible d’enregistrer le revenu.');
    }
  }

  async function handleSaveMonthKey(nextMonthKey: string): Promise<void> {
    try {
      setError(null);
      const nextSnapshot = await window.finterest.saveMonthKey(nextMonthKey);
      setSnapshot(nextSnapshot);
      setActiveMonthKey(nextMonthKey);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : 'Impossible d’enregistrer le mois.');
    }
  }

  async function handleAddFixedExpense(): Promise<void> {
    try {
      setError(null);
      const nextSnapshot = await window.finterest.addFixedExpense({
        name: fixedForm.name,
        amount: Number(fixedForm.amount),
        category: fixedForm.category,
        dayOfMonth: fixedForm.dayOfMonth ? Number(fixedForm.dayOfMonth) : null,
        active: true,
      });
      setSnapshot(nextSnapshot);
      setFixedForm({ ...emptyExpense, dayOfMonth: '' });
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : 'Impossible d’enregistrer l’abonnement.');
    }
  }

  async function handleAddCalendarSubscription(name: string, amount: number, category: string, dayOfMonth: number): Promise<void> {
    try {
      setError(null);
      const nextSnapshot = await window.finterest.addFixedExpense({ name, amount, category, dayOfMonth, active: true });
      setSnapshot(nextSnapshot);
      setCalendarDay(null);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : 'Impossible d’enregistrer l’abonnement.');
    }
  }

  async function handleAddVariableExpense(): Promise<void> {
    try {
      setError(null);
      const nextSnapshot = await window.finterest.addVariableExpense({
        name: variableForm.name,
        amount: Number(variableForm.amount),
        category: variableForm.category,
        date: variableForm.date,
        monthKey: variableForm.date.slice(0, 7),
      });
      setSnapshot(nextSnapshot);
      setVariableForm({ ...emptyExpense, date: new Date().toISOString().slice(0, 10) });
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : 'Impossible d’enregistrer l’achat.');
    }
  }

  async function handleExportBackup(): Promise<void> {
    try {
      setError(null);
      await window.finterest.saveBackupToFile();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : 'Impossible d’exporter la sauvegarde.');
    }
  }

  async function handleImportBackup(): Promise<void> {
    try {
      setError(null);
      const restored = await window.finterest.importBackupFromFile();
      if (restored) {
        setSnapshot(restored);
      }
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : 'Impossible d’importer la sauvegarde.');
    }
  }

  async function handleToggleFixedExpense(id: string, active: boolean): Promise<void> {
    const nextSnapshot = await window.finterest.toggleFixedExpense(id, active);
    setSnapshot(nextSnapshot);
  }

  async function handleDeleteFixedExpense(id: string): Promise<void> {
    const nextSnapshot = await window.finterest.deleteFixedExpense(id);
    setSnapshot(nextSnapshot);
  }

  async function handleDeleteVariableExpense(id: string): Promise<void> {
    const nextSnapshot = await window.finterest.deleteVariableExpense(id);
    setSnapshot(nextSnapshot);
  }

  const remainingPercent = summary && summary.income > 0 ? Math.max(0, Math.min(100, (summary.remainingIncome / summary.income) * 100)) : 0;

  if (!snapshot) {
    return <AccountGate stage={authStage} accounts={accounts} selectedAccountId={selectedAccountId} accountName={accountName} accountPin={accountPin} error={error} onSelect={(id) => { setSelectedAccountId(id); setAccountPin(''); setAuthStage('welcome'); }} onAccountChange={setSelectedAccountId} onNameChange={setAccountName} onPinChange={setAccountPin} onContinue={() => setAuthStage('login')} onLogin={() => setAuthStage('select')} onCreate={() => { setIsCreatingAccount(true); setAuthStage('create'); setError(null); }} onBack={() => setAuthStage(accounts.length > 1 ? 'select' : 'login')} onSubmit={() => void handleAccountAccess()} />;
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <img src={logoUrl} alt="Finterest logo" />
          <div><strong>Finterest</strong><span>Votre budget, simplement</span></div>
        </div>
        <div className="mode-switch" aria-label="Mode de calcul">
          <button className={activeMode === 'simple' ? 'selected' : 'ghost'} onClick={() => setActiveMode('simple')}>Budget simple</button>
          <button className={activeMode === 'advanced' ? 'selected' : 'ghost'} onClick={() => setActiveMode('advanced')}>Calcul avancé</button>
        </div>
        {activeMode === 'simple' ? <nav className="primary-nav" aria-label="Navigation principale">
          <NavButton active={activeView === 'overview'} label="Vue d'ensemble" onClick={() => setActiveView('overview')} icon="◈" />
          <NavButton active={activeView === 'calendar'} label="Calendrier" onClick={() => setActiveView('calendar')} icon="▦" />
          <NavButton active={activeView === 'fixed'} label="Abonnements" onClick={() => setActiveView('fixed')} icon="▤" />
          <NavButton active={activeView === 'variable'} label="Achats prévus" onClick={() => setActiveView('variable')} icon="⌁" />
          <NavButton active={activeView === 'settings'} label="Sauvegarde" onClick={() => setActiveView('settings')} icon="⚙" />
        </nav> : null}
        {activeMode === 'advanced' ? <div className="advanced-nav-note"><span>+</span><p>Outils économiques supplémentaires</p></div> : null}
        <div className="sidebar-foot"><span className="status-dot" />Données locales<br /><small>Enregistrées sur cet ordinateur</small></div>
      </aside>

      <section key={`${activeMode}-${activeView}`} className={`workspace view-${activeView}`}>
        <header className="topbar">
          <div><p className="eyebrow">{activeMode === 'advanced' ? 'Outils économiques' : activeView === 'overview' ? 'Votre budget' : activeView === 'calendar' ? 'Abonnements et échéances' : activeView === 'fixed' ? 'Charges récurrentes' : activeView === 'variable' ? 'Achats prévus' : 'Données et sauvegarde'}</p><h1>{activeMode === 'advanced' ? 'Calcul avancé' : activeView === 'overview' ? 'Mon budget du mois' : activeView === 'calendar' ? 'Calendrier' : activeView === 'fixed' ? 'Mes abonnements' : activeView === 'variable' ? 'Mes achats prévus' : 'Sauvegarder mes données'}</h1></div>
          {activeMode === 'simple' ? <div className="month-control"><span>Mois concerné</span><input aria-label="Mois concerné" type="month" value={activeMonthKey} onChange={(event) => setActiveMonthKey(event.target.value)} onBlur={() => void handleSaveMonthKey(activeMonthKey)} /></div> : null}
        </header>

        {error ? <div className="error-banner">{error}</div> : null}

        {activeMode === 'advanced' ? <AdvancedCalculator form={interestForm} onChange={setInterestForm} /> : null}
        {activeMode === 'simple' && activeView === 'calendar' ? <SubscriptionCalendar monthKey={activeMonthKey} items={snapshot?.fixedExpenses ?? []} selectedDay={calendarDay} onDaySelect={setCalendarDay} onAdd={handleAddCalendarSubscription} onMonthChange={(monthKey) => void handleSaveMonthKey(monthKey)} /> : null}
        {activeMode === 'simple' && activeView === 'settings' ? <SettingsPanel databasePath={databasePath} onExport={handleExportBackup} onImport={handleImportBackup} /> : null}

        {activeMode === 'simple' && activeView !== 'settings' && activeView !== 'calendar' ? <>
        <section className="summary-grid">
          <Card label="Revenus du mois" value={summary?.income ?? 0} accent="income" icon="↗" />
          <Card label="Abonnements" value={summary?.totalFixedExpenses ?? 0} accent="fixed" icon="▤" />
          <Card label="Achats prévus" value={summary?.totalVariableExpenses ?? 0} accent="variable" icon="⌁" />
          <Card label="Reste à vivre" value={summary?.remainingIncome ?? 0} accent="remaining" icon="◒" />
        </section>

        {activeView === 'overview' ? <section className="insight-grid"><article className="balance-panel"><div className="section-heading"><div><p className="eyebrow">État du budget</p><h2>Ce qu’il vous reste</h2></div><span className="health-label">{remainingPercent.toFixed(0)}% restant</span></div><div className="ring-wrap"><div className="balance-ring" style={{ '--progress': `${remainingPercent * 3.6}deg` } as CSSProperties}><div><strong>{remainingPercent.toFixed(0)}%</strong><span>disponible</span></div></div><div className="ring-legend"><span><i className="dot income-dot" />Revenus <b>{formatMoney(summary?.income ?? 0)}</b></span><span><i className="dot spend-dot" />Dépensé <b>{formatMoney(summary?.totalExpenses ?? 0)}</b></span></div></div></article><article className="snapshot-panel"><div className="section-heading"><div><p className="eyebrow">En résumé</p><h2>Ce mois-ci</h2></div><span className="period-badge">{activeMonthKey}</span></div><div className="snapshot-row"><span>Revenus</span><strong>{formatMoney(summary?.income ?? 0)}</strong></div><div className="snapshot-row"><span>Abonnements</span><strong>{formatMoney(summary?.totalFixedExpenses ?? 0)}</strong></div><div className="snapshot-row"><span>Achats prévus</span><strong>{formatMoney(summary?.totalVariableExpenses ?? 0)}</strong></div><div className="snapshot-total"><span>Total dépensé</span><strong>{formatMoney(summary?.totalExpenses ?? 0)}</strong></div></article></section> : null}

        <section className="input-panel">
        <FieldGroup title="Revenus">
          <label>
            Revenu mensuel
            <input aria-label="Revenu mensuel" value={incomeInput} onChange={(event) => setIncomeInput(event.target.value)} inputMode="decimal" />
          </label>
          <button className="ghost" onClick={() => void handleSaveMonthKey(activeMonthKey)}>
            Enregistrer le mois
          </button>
          <button onClick={handleSaveIncome}>Enregistrer le revenu</button>
        </FieldGroup>

        <FieldGroup title="Nouvel abonnement">
          <label>
            Nom
            <input value={fixedForm.name} onChange={(event) => setFixedForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            Prix mensuel
            <input value={fixedForm.amount} onChange={(event) => setFixedForm((current) => ({ ...current, amount: Number(event.target.value) }))} inputMode="decimal" />
          </label>
          <label>
            Catégorie
            <select value={fixedForm.category} onChange={(event) => setFixedForm((current) => ({ ...current, category: event.target.value }))}>
              <option value="">Choisir une catégorie</option>
              {subscriptionCategories.map((category) => <option key={category.name} value={category.name}>{category.icon} {category.name}</option>)}
            </select>
          </label>
          <label>
            Jour de prélèvement
            <input value={fixedForm.dayOfMonth} onChange={(event) => setFixedForm((current) => ({ ...current, dayOfMonth: event.target.value }))} inputMode="numeric" />
          </label>
          <button onClick={handleAddFixedExpense}>Ajouter l'abonnement</button>
        </FieldGroup>

        <FieldGroup title="Prévoir un achat">
          <label>
            Nom de l'achat
            <input value={variableForm.name} onChange={(event) => setVariableForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            Prix prévu
            <input value={variableForm.amount} onChange={(event) => setVariableForm((current) => ({ ...current, amount: Number(event.target.value) }))} inputMode="decimal" />
          </label>
          <label>
            Catégorie
            <input value={variableForm.category} onChange={(event) => setVariableForm((current) => ({ ...current, category: event.target.value }))} />
          </label>
          <label>
            Date prévue
            <input type="date" value={variableForm.date} onChange={(event) => setVariableForm((current) => ({ ...current, date: event.target.value }))} />
          </label>
          <button onClick={handleAddVariableExpense}>Ajouter l'achat</button>
        </FieldGroup>
        </section>

        <section className="lists-grid">
        <ListCard
          title="Mes abonnements"
          subtitle="Ce qui tombe chaque mois. Désactivez sans supprimer."
          items={snapshot?.fixedExpenses ?? []}
          onToggleFixedExpense={handleToggleFixedExpense}
          onDeleteFixedExpense={handleDeleteFixedExpense}
        />
        <ListCard
          title="Mes achats prévus"
          subtitle={`Achats prévus pour ${activeMonthKey}.`}
          items={(snapshot?.variableExpenses ?? []).filter((expense) => expense.monthKey === activeMonthKey)}
          onDeleteVariableExpense={handleDeleteVariableExpense}
        />
        </section>
        </> : null}
      </section>
    </main>
  );
}

function AccountGate({ stage, accounts, selectedAccountId, accountName, accountPin, error, onSelect, onAccountChange, onNameChange, onPinChange, onContinue, onLogin, onCreate, onBack, onSubmit }: { stage: 'select' | 'welcome' | 'login' | 'create'; accounts: LocalAccountSummary[]; selectedAccountId: string; accountName: string; accountPin: string; error: string | null; onSelect: (id: string) => void; onAccountChange: (value: string) => void; onNameChange: (value: string) => void; onPinChange: (value: string) => void; onContinue: () => void; onLogin: () => void; onCreate: () => void; onBack: () => void; onSubmit: () => void }) {
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
  return <main className="account-gate"><section className="account-card"><img src={logoUrl} alt="Logo Finterest" />{stage === 'select' ? <><p className="eyebrow">Espace local</p><h1>Qui utilise Finterest ?</h1><p className="account-intro">Choisissez votre compte pour continuer.</p><div className="account-list">{accounts.map((account) => <button className="account-choice" key={account.id} onClick={() => onSelect(account.id)}><span>{account.name.slice(0, 1).toUpperCase()}</span><strong>{account.name}</strong><b>›</b></button>)}</div><button className="ghost account-switch" onClick={onCreate}>Créer un autre compte</button></> : stage === 'welcome' ? <><p className="eyebrow">Bienvenue</p><h1>Bonjour {selectedAccount?.name}</h1><p className="account-intro">Votre espace budget est prêt. Vous allez être invité à saisir votre code secret.</p><button onClick={onContinue}>Continuer</button><button className="ghost account-switch" onClick={onBack}>Changer de compte</button></> : stage === 'create' ? <><p className="eyebrow">Espace local</p><h1>Créer un compte</h1><p className="account-intro">Chaque compte possède son propre budget sur cet ordinateur.</p><label>Nom du compte<input autoFocus value={accountName} onChange={(event) => onNameChange(event.target.value)} /></label><label>Code secret (4 à 8 chiffres)<input type="password" inputMode="numeric" maxLength={8} value={accountPin} onChange={(event) => onPinChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onSubmit(); }} /></label>{error ? <div className="error-banner">{error}</div> : null}<button onClick={onSubmit}>Créer et continuer</button>{accounts.length > 0 ? <button className="ghost account-switch" onClick={onBack}>Ouvrir un compte existant</button> : null}</> : <><p className="eyebrow">Connexion</p><h1>Bonjour {selectedAccount?.name}</h1><p className="account-intro">Saisissez votre code secret pour accéder à votre budget.</p><label>Compte<select value={selectedAccountId} onChange={(event) => onAccountChange(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label>Code secret<input autoFocus type="password" inputMode="numeric" maxLength={8} value={accountPin} onChange={(event) => onPinChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onSubmit(); }} /></label>{error ? <div className="error-banner">{error}</div> : null}<button onClick={onSubmit}>Se connecter</button>{accounts.length > 1 ? <button className="ghost account-switch" onClick={onLogin}>Choisir un autre compte</button> : null}</>}</section></main>;
}

function formatMoney(value: number): string {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

const subscriptionCategories = [
  { name: 'Logement', icon: '🏠' },
  { name: 'Téléphone et internet', icon: '📱' },
  { name: 'Streaming', icon: '▶' },
  { name: 'Transport', icon: '🚆' },
  { name: 'Assurance', icon: '🛡' },
  { name: 'Sport et bien-être', icon: '♡' },
  { name: 'Autre', icon: '•' },
];

function categoryIcon(category: string): string {
  return subscriptionCategories.find((item) => item.name === category)?.icon ?? '•';
}

function SubscriptionCalendar({ monthKey, items, selectedDay, onDaySelect, onAdd, onMonthChange }: { monthKey: string; items: Array<{ id: string; name: string; amount: number; category: string; dayOfMonth: number | null; active: boolean }>; selectedDay: number | null; onDaySelect: (day: number) => void; onAdd: (name: string, amount: number, category: string, day: number) => Promise<void>; onMonthChange: (monthKey: string) => void }) {
  const [year, month] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => index - firstDay + 1);
  const title = new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const shiftMonth = (amount: number) => {
    const next = new Date(year, month - 1 + amount, 1);
    onMonthChange(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  const [form, setForm] = useState({ name: '', amount: '', category: '' });
  return <section className="calendar-panel"><div className="calendar-toolbar"><div><p className="eyebrow">Vue mensuelle</p><h2>{title.charAt(0).toUpperCase() + title.slice(1)}</h2><p className="calendar-hint">Sélectionnez un jour pour programmer un abonnement.</p></div><div className="calendar-actions"><button className="ghost small" onClick={() => shiftMonth(-1)} aria-label="Mois précédent">←</button><button className="ghost small" onClick={() => shiftMonth(1)} aria-label="Mois suivant">→</button></div></div><div className="calendar-weekdays">{['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{cells.map((day, index) => { const subscriptions = items.filter((item) => item.active && item.dayOfMonth === day); return <button className={`calendar-day ${day < 1 || day > daysInMonth ? 'outside' : ''} ${selectedDay === day ? 'selected' : ''}`} key={`${day}-${index}`} onClick={() => day > 0 && day <= daysInMonth ? onDaySelect(day) : undefined} disabled={day < 1 || day > daysInMonth}>{day > 0 && day <= daysInMonth ? <><strong>{day}</strong>{subscriptions.map((item) => <span className="calendar-subscription" key={item.id} title={`${item.name} - ${formatMoney(item.amount)}`}><span>{categoryIcon(item.category)}</span><b>{item.name}</b></span>)}{selectedDay === day ? <i className="calendar-add">+</i> : null}</> : null}</button>; })}</div>{selectedDay ? <form className="calendar-form" onSubmit={(event) => { event.preventDefault(); void onAdd(form.name, Number(form.amount), form.category, selectedDay); setForm({ name: '', amount: '', category: '' }); }}><div><p className="eyebrow">Nouvel abonnement</p><h3>Le {selectedDay} {title}</h3></div><label>Nom<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Prix mensuel<input required min="0" step="0.01" type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label><label>Catégorie<select required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="">Choisir</option>{subscriptionCategories.map((category) => <option key={category.name} value={category.name}>{category.icon} {category.name}</option>)}</select></label><button type="submit">Ajouter à cette date</button></form> : null}</section>;
}

function AdvancedCalculator({ form, onChange }: { form: { capital: string; rate: string; years: string }; onChange: (form: { capital: string; rate: string; years: string }) => void }) {
  const capital = Number(form.capital) || 0;
  const rate = Number(form.rate) || 0;
  const years = Number(form.years) || 0;
  const result = capital * Math.pow(1 + rate / 100, years);
  const interest = Math.max(0, result - capital);

  return <section className="advanced-panel"><div><p className="eyebrow">Outil économique</p><h2>Intérêts composés</h2><p>Estimez la valeur future d’une somme placée. Ce calcul ne remplace pas un conseil financier.</p></div><div className="advanced-form"><label>Capital de départ<input inputMode="decimal" value={form.capital} onChange={(event) => onChange({ ...form, capital: event.target.value })} /></label><label>Taux annuel (%)<input inputMode="decimal" value={form.rate} onChange={(event) => onChange({ ...form, rate: event.target.value })} /></label><label>Durée (années)<input inputMode="numeric" value={form.years} onChange={(event) => onChange({ ...form, years: event.target.value })} /></label></div><div className="advanced-result"><span>Valeur estimée</span><strong>{formatMoney(result)}</strong><small>Dont {formatMoney(interest)} d’intérêts</small></div></section>;
}

function NavButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: string; onClick: () => void }) {
  return <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}><span>{icon}</span>{label}{active ? <b>›</b> : null}</button>;
}

function Card({ label, value, accent, icon }: { label: string; value: number; accent: 'income' | 'fixed' | 'variable' | 'remaining'; icon: string }) {
  return (
    <article className={`summary-card ${accent}`}>
      <div className="card-top"><span>{label}</span><i>{icon}</i></div>
      <strong>{formatMoney(value)}</strong>
    </article>
  );
}

function SettingsPanel({ databasePath, onExport, onImport }: { databasePath: string; onExport: () => Promise<void>; onImport: () => Promise<void> }) {
  return <section className="settings-panel"><div className="settings-icon"><img src={logoUrl} alt="" /></div><div><p className="eyebrow">Données locales</p><h2>Vos données restent à vous</h2><p>Finterest conserve votre budget uniquement sur cet ordinateur. Utilisez une sauvegarde pour le transférer.</p><div className="settings-actions"><button onClick={onExport}>Exporter la sauvegarde</button><button className="secondary" onClick={onImport}>Importer une sauvegarde</button></div><small className="path-note">Emplacement : {databasePath || 'Chargement...'}</small></div></section>;
}

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="field-group">
      <h2>{title}</h2>
      <div className="field-grid">{children}</div>
    </article>
  );
}

function ListCard({
  title,
  subtitle,
  items,
  onToggleFixedExpense,
  onDeleteFixedExpense,
  onDeleteVariableExpense,
}: {
  title: string;
  subtitle: string;
  items: Array<{ id: string; name: string; amount: number; category: string; active?: boolean; dayOfMonth?: number | null; date?: string }>;
  onToggleFixedExpense?: (id: string, active: boolean) => Promise<void>;
  onDeleteFixedExpense?: (id: string) => Promise<void>;
  onDeleteVariableExpense?: (id: string) => Promise<void>;
}) {
  return (
    <article className="list-card">
      <div className="list-heading">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{item.name}</strong>
              <span>{categoryIcon(item.category)} {item.category}</span>
            </div>
            <div className="row-actions">
              <span>{formatMoney(item.amount)}</span>
              {'active' in item && onToggleFixedExpense ? (
                <button className="ghost small" onClick={() => onToggleFixedExpense(item.id, !item.active)}>
                  {item.active ? 'Désactiver' : 'Activer'}
                </button>
              ) : null}
              {onDeleteFixedExpense ? (
                <button className="ghost small" onClick={() => onDeleteFixedExpense(item.id)}>
                  Supprimer
                </button>
              ) : null}
              {onDeleteVariableExpense ? (
                <button className="ghost small" onClick={() => onDeleteVariableExpense(item.id)}>
                  Supprimer
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}
