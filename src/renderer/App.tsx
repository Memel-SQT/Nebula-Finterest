import { useEffect, useMemo, useState } from 'react';
import { computeBudgetSummary, getMonthKey } from '@shared/budget';
import type { BudgetSnapshot, FixedExpenseKind, UpdateStatus } from '@shared/types';
import type { LocalAccountSummary } from '@shared/accounts';
import { translate, translateError, useLanguage } from './i18n';
import { useTheme } from './theme';
import { Avatar, NavButton } from './components/atoms';
import { AccountGate, type AuthStage } from './components/AccountGate';
import { SubscriptionCalendar } from './components/SubscriptionCalendar';
import { AdvancedCalculator, type AdvancedCalculatorForm } from './components/AdvancedCalculator';
import { SettingsPanel } from './components/SettingsPanel';
import { Dashboard } from './components/Dashboard';
import type { LoanFormState } from './components/LoansPanel';
import { ProfileScreen } from './components/ProfileScreen';
import { SplashScreen } from './components/SplashScreen';
import logoUrl from '../../assets/finterest-logo.svg';

const emptyExpense = { name: '', amount: 0, category: '' };
const emptyLoanForm: LoanFormState = { name: '', principal: '', monthlyPayment: '', rate: '', remainingMonths: '' };

type ActiveView = 'overview' | 'calendar' | 'fixed' | 'variable' | 'loans' | 'profile' | 'settings';

export function App() {
  const [language, setLanguage] = useLanguage();
  const [theme, setTheme] = useTheme();
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string>) => translate(language, key, params);

  const [snapshot, setSnapshot] = useState<BudgetSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [incomeInput, setIncomeInput] = useState('0');
  const [databasePath, setDatabasePath] = useState('');
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [activeMode, setActiveMode] = useState<'simple' | 'advanced'>('simple');
  const [interestForm, setInterestForm] = useState<AdvancedCalculatorForm>({ capital: '1000', rate: '3', years: '5', monthlyInvestment: '0' });
  const [fixedForm, setFixedForm] = useState({ ...emptyExpense, dayOfMonth: '', kind: 'subscription' as FixedExpenseKind });
  const [variableForm, setVariableForm] = useState({ ...emptyExpense, date: new Date().toISOString().slice(0, 10) });
  const [loanForm, setLoanForm] = useState<LoanFormState>(emptyLoanForm);
  const [activeMonthKey, setActiveMonthKey] = useState(getMonthKey(new Date()));
  const [accounts, setAccounts] = useState<LocalAccountSummary[]>([]);
  const [activeAccount, setActiveAccount] = useState<LocalAccountSummary | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountPin, setAccountPin] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [authStage, setAuthStage] = useState<AuthStage>('create');
  const [calendarDay, setCalendarDay] = useState<number | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    void loadAccounts();
    void loadDatabasePath();
    return window.finterest?.onUpdateStatus(setUpdateStatus);
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
    setAuthStage(nextAccounts.length > 0 ? 'select' : 'create');
  }

  async function handleAccountAccess(): Promise<void> {
    try {
      setError(null);
      if (authStage === 'create' || accounts.length === 0 || isCreatingAccount) {
        const account = await window.finterest.createAccount(accountName, accountPin);
        setAccounts([account]);
        setActiveAccount(account);
        setSelectedAccountId(account.id);
        setSnapshot(await window.finterest.getSnapshot());
        setIsCreatingAccount(false);
      } else {
        setSnapshot(await window.finterest.unlockAccount(selectedAccountId, accountPin));
        setActiveAccount(await window.finterest.getActiveAccount());
      }
      setAccountPin('');
    } catch (thrown) {
      setError(translateError(language, thrown, 'error.openAccount'));
    }
  }

  async function handleDeleteAccount(id: string, pin: string): Promise<void> {
    try {
      setError(null);
      await window.finterest.deleteAccount(id, pin);
      await loadAccounts();
    } catch (thrown) {
      setError(translateError(language, thrown, 'error.deleteAccount'));
    }
  }

  async function handleRenameAccount(name: string): Promise<void> {
    try {
      setError(null);
      setActiveAccount(await window.finterest.renameAccount(name));
    } catch (thrown) {
      setError(translateError(language, thrown, 'error.renameAccount'));
    }
  }

  async function handleChangeAvatar(): Promise<void> {
    try {
      setError(null);
      const updated = await window.finterest.chooseAvatar();
      if (updated) {
        setActiveAccount(updated);
      }
    } catch (thrown) {
      setError(translateError(language, thrown, 'error.setAvatar'));
    }
  }

  async function handleSwitchAccount(): Promise<void> {
    await window.finterest.lockAccount();
    setSnapshot(null);
    setActiveAccount(null);
    setAccountPin('');
    setError(null);
    await loadAccounts();
  }

  async function loadDatabasePath(): Promise<void> {
    try {
      setDatabasePath(await window.finterest.getDatabasePath());
    } catch {
      setDatabasePath('');
    }
  }

  async function handleSaveIncome(): Promise<void> {
    try {
      setError(null);
      setSnapshot(await window.finterest.saveIncome(Number(incomeInput)));
    } catch (thrown) {
      setError(translateError(language, thrown, 'error.saveIncome'));
    }
  }

  async function handleSaveMonthKey(nextMonthKey: string): Promise<void> {
    try {
      setError(null);
      const nextSnapshot = await window.finterest.saveMonthKey(nextMonthKey);
      setSnapshot(nextSnapshot);
      setActiveMonthKey(nextMonthKey);
    } catch (thrown) {
      setError(translateError(language, thrown, 'error.saveMonth'));
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
        kind: fixedForm.kind,
      });
      setSnapshot(nextSnapshot);
      setFixedForm({ ...emptyExpense, dayOfMonth: '', kind: 'subscription' });
    } catch (thrown) {
      setError(translateError(language, thrown, 'error.saveFixed'));
    }
  }

  async function handleAddCalendarSubscription(name: string, amount: number, category: string, dayOfMonth: number, kind: FixedExpenseKind): Promise<void> {
    try {
      setError(null);
      const nextSnapshot = await window.finterest.addFixedExpense({ name, amount, category, dayOfMonth, active: true, kind });
      setSnapshot(nextSnapshot);
      setCalendarDay(null);
    } catch (thrown) {
      setError(translateError(language, thrown, 'error.saveFixed'));
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
      setError(translateError(language, thrown, 'error.saveVariable'));
    }
  }

  async function handleAddLoan(): Promise<void> {
    try {
      setError(null);
      const nextSnapshot = await window.finterest.addLoan({
        name: loanForm.name,
        principal: Number(loanForm.principal),
        monthlyPayment: Number(loanForm.monthlyPayment),
        interestRate: Number(loanForm.rate) || 0,
        remainingMonths: loanForm.remainingMonths ? Number(loanForm.remainingMonths) : null,
        active: true,
      });
      setSnapshot(nextSnapshot);
      setLoanForm(emptyLoanForm);
    } catch (thrown) {
      setError(translateError(language, thrown, 'error.saveLoan'));
    }
  }

  async function handleToggleLoan(id: string, active: boolean): Promise<void> {
    setSnapshot(await window.finterest.toggleLoan(id, active));
  }

  async function handleDeleteLoan(id: string): Promise<void> {
    setSnapshot(await window.finterest.deleteLoan(id));
  }

  async function handleExportBackup(): Promise<void> {
    try {
      setError(null);
      await window.finterest.saveBackupToFile();
    } catch (thrown) {
      setError(translateError(language, thrown, 'error.exportBackup'));
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
      setError(translateError(language, thrown, 'error.importBackup'));
    }
  }

  async function handleToggleFixedExpense(id: string, active: boolean): Promise<void> {
    setSnapshot(await window.finterest.toggleFixedExpense(id, active));
  }

  async function handleDeleteFixedExpense(id: string): Promise<void> {
    setSnapshot(await window.finterest.deleteFixedExpense(id));
  }

  async function handleDeleteVariableExpense(id: string): Promise<void> {
    setSnapshot(await window.finterest.deleteVariableExpense(id));
  }

  const remainingPercent = summary && summary.income > 0 ? Math.max(0, Math.min(100, (summary.remainingIncome / summary.income) * 100)) : 0;

  if (showSplash) {
    return <SplashScreen language={language} onFinish={() => setShowSplash(false)} />;
  }

  if (!snapshot) {
    return (
      <AccountGate
        stage={authStage}
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        accountName={accountName}
        accountPin={accountPin}
        error={error}
        language={language}
        onSelect={(id) => { setSelectedAccountId(id); setAccountPin(''); setAuthStage('welcome'); }}
        onNameChange={setAccountName}
        onPinChange={setAccountPin}
        onContinue={() => setAuthStage('login')}
        onLogin={() => setAuthStage('select')}
        onCreate={() => { setIsCreatingAccount(true); setAuthStage('create'); setError(null); }}
        onManage={() => { setAuthStage('manage'); setError(null); }}
        onBack={() => setAuthStage(accounts.length > 1 ? 'select' : 'login')}
        onSubmit={() => void handleAccountAccess()}
        onDeleteAccount={handleDeleteAccount}
      />
    );
  }

  const viewCopy: Record<ActiveView, { eyebrow: Parameters<typeof t>[0]; title: Parameters<typeof t>[0] }> = {
    overview: { eyebrow: 'view.overview.eyebrow', title: 'view.overview.title' },
    calendar: { eyebrow: 'view.calendar.eyebrow', title: 'view.calendar.title' },
    fixed: { eyebrow: 'view.fixed.eyebrow', title: 'view.fixed.title' },
    variable: { eyebrow: 'view.variable.eyebrow', title: 'view.variable.title' },
    loans: { eyebrow: 'view.loans.eyebrow', title: 'view.loans.title' },
    profile: { eyebrow: 'view.profile.eyebrow', title: 'view.profile.title' },
    settings: { eyebrow: 'view.settings.eyebrow', title: 'view.settings.title' },
  };

  const showKpis = activeMode === 'simple' && ['overview', 'fixed', 'variable', 'loans'].includes(activeView);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <img src={logoUrl} alt="Finterest logo" />
          <div><strong>{t('app.name')}</strong><span>{t('app.tagline')}</span></div>
        </div>
        {activeMode === 'simple' && activeAccount ? (
          <button className="profile-chip" onClick={() => setActiveView('profile')}>
            <Avatar name={activeAccount.name} avatarUrl={activeAccount.avatarUrl} size="sm" />
            <span>{activeAccount.name}</span>
            <b>›</b>
          </button>
        ) : null}
        <div className="mode-switch" aria-label="Mode de calcul">
          <button className={activeMode === 'simple' ? 'selected' : 'ghost'} onClick={() => setActiveMode('simple')}>{t('mode.simple')}</button>
          <button className={activeMode === 'advanced' ? 'selected' : 'ghost'} onClick={() => setActiveMode('advanced')}>{t('mode.advanced')}</button>
        </div>
        {activeMode === 'simple' ? (
          <nav className="primary-nav" aria-label="Navigation principale">
            <NavButton active={activeView === 'overview'} label={t('nav.overview')} onClick={() => setActiveView('overview')} icon="◈" />
            <NavButton active={activeView === 'calendar'} label={t('nav.calendar')} onClick={() => setActiveView('calendar')} icon="▦" />
            <NavButton active={activeView === 'fixed'} label={t('nav.fixed')} onClick={() => setActiveView('fixed')} icon="▤" />
            <NavButton active={activeView === 'variable'} label={t('nav.variable')} onClick={() => setActiveView('variable')} icon="⌁" />
            <NavButton active={activeView === 'loans'} label={t('nav.loans')} onClick={() => setActiveView('loans')} icon="▣" />
            <NavButton active={activeView === 'profile'} label={t('nav.profile')} onClick={() => setActiveView('profile')} icon="◍" />
            <NavButton active={activeView === 'settings'} label={t('nav.settings')} onClick={() => setActiveView('settings')} icon="⚙" />
          </nav>
        ) : (
          <div className="advanced-nav-note"><span>+</span><p>{t('mode.advancedNote')}</p></div>
        )}
        <div className="sidebar-foot"><span className="status-dot" />{t('sidebar.localData')}<br /><small>{t('sidebar.localDataNote')}</small></div>
      </aside>

      <section key={`${activeMode}-${activeView}`} className={`workspace view-${activeView}`}>
        <header className="topbar">
          <div>
            <p className="eyebrow">{activeMode === 'advanced' ? t('view.advanced.eyebrow') : t(viewCopy[activeView].eyebrow)}</p>
            <h1>{activeMode === 'advanced' ? t('view.advanced.title') : t(viewCopy[activeView].title)}</h1>
          </div>
          {activeMode === 'simple' ? (
            <div className="month-control">
              <span>{t('month.label')}</span>
              <input aria-label={t('month.label')} type="month" value={activeMonthKey} onChange={(event) => setActiveMonthKey(event.target.value)} onBlur={() => void handleSaveMonthKey(activeMonthKey)} />
            </div>
          ) : null}
        </header>

        {error ? <div className="error-banner">{error}</div> : null}
        {updateStatus?.state === 'available' || updateStatus?.state === 'downloaded' ? (
          <div className="update-banner">
            <span>{t(updateStatus.state === 'downloaded' ? 'update.downloaded' : 'update.available')}</span>
            {updateStatus.state === 'downloaded' ? (
              <button className="ghost small" onClick={() => void window.finterest.installUpdate()}>{t('update.restartInstall')}</button>
            ) : null}
          </div>
        ) : null}

        {activeMode === 'advanced' ? <AdvancedCalculator form={interestForm} language={language} onChange={setInterestForm} /> : null}

        {activeMode === 'simple' && activeView === 'calendar' ? (
          <SubscriptionCalendar
            monthKey={activeMonthKey}
            items={snapshot.fixedExpenses}
            selectedDay={calendarDay}
            language={language}
            onDaySelect={setCalendarDay}
            onAdd={handleAddCalendarSubscription}
            onMonthChange={(monthKey) => void handleSaveMonthKey(monthKey)}
          />
        ) : null}

        {activeMode === 'simple' && activeView === 'settings' ? (
          <SettingsPanel
            databasePath={databasePath}
            language={language}
            theme={theme}
            updateStatus={updateStatus}
            onExport={handleExportBackup}
            onImport={handleImportBackup}
            onLanguageChange={setLanguage}
            onThemeChange={setTheme}
            onCheckForUpdates={() => window.finterest.checkForUpdates()}
            onInstallUpdate={() => window.finterest.installUpdate()}
            onOpenProfile={() => setActiveView('profile')}
          />
        ) : null}

        {activeMode === 'simple' && activeView === 'profile' && activeAccount ? (
          <ProfileScreen
            account={activeAccount}
            language={language}
            onRename={handleRenameAccount}
            onChangePhoto={handleChangeAvatar}
            onSwitchAccount={() => void handleSwitchAccount()}
          />
        ) : null}

        {showKpis ? (
          <Dashboard
            activeView={activeView as 'overview' | 'fixed' | 'variable' | 'loans'}
            language={language}
            snapshot={snapshot}
            summary={summary}
            activeMonthKey={activeMonthKey}
            remainingPercent={remainingPercent}
            incomeInput={incomeInput}
            fixedForm={fixedForm}
            variableForm={variableForm}
            loanForm={loanForm}
            onIncomeInputChange={setIncomeInput}
            onSaveMonth={() => void handleSaveMonthKey(activeMonthKey)}
            onSaveIncome={handleSaveIncome}
            onFixedFormChange={setFixedForm}
            onAddFixedExpense={handleAddFixedExpense}
            onToggleFixedExpense={handleToggleFixedExpense}
            onDeleteFixedExpense={handleDeleteFixedExpense}
            onVariableFormChange={setVariableForm}
            onAddVariableExpense={handleAddVariableExpense}
            onDeleteVariableExpense={handleDeleteVariableExpense}
            onLoanFormChange={setLoanForm}
            onAddLoan={handleAddLoan}
            onToggleLoan={handleToggleLoan}
            onDeleteLoan={handleDeleteLoan}
          />
        ) : null}
      </section>
    </main>
  );
}
