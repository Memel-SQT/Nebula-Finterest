import { useCallback, useEffect, useMemo, useState } from 'react';
import { computeBudgetSummary, formatLocalDate, getMonthKey, isValidMonthKey, parseAmount } from '@shared/budget';
import type { BudgetSnapshot, CalendarEntry, FixedExpenseKind, SyncStatus, UpdateStatus } from '@shared/types';
import { GUEST_ACCOUNT_ID } from '@shared/accounts';
import type { LocalAccountSummary } from '@shared/accounts';
import { translate, translateError, useLanguage, type TranslationKey } from './i18n';
import { useTheme } from './theme';
import { useAppearance } from './appearance';
import { configureSounds, playSound, type SoundName } from './sound';
import { useInterfaceEffects } from './effects';
import { Avatar, NavButton } from './components/atoms';
import { Icon, type IconName } from './components/Icon';
import { AccountGate, type AuthStage } from './components/AccountGate';
import { BudgetCalendar } from './components/BudgetCalendar';
import { AdvancedCalculator, type AdvancedCalculatorForm } from './components/AdvancedCalculator';
import { SettingsPanel } from './components/SettingsPanel';
import { Dashboard, type FixedFormState, type VariableFormState } from './components/Dashboard';
import type { LoanFormState } from './components/LoansPanel';
import { ProfileScreen } from './components/ProfileScreen';
import { SplashScreen } from './components/SplashScreen';
import { BackgroundFx } from './components/BackgroundFx';
import logoUrl from '../../assets/nebula-logo.svg';

const emptyFixedForm = (): FixedFormState => ({ name: '', amount: '', category: '', dayOfMonth: '', kind: 'subscription' });
const emptyVariableForm = (): VariableFormState => ({ name: '', amount: '', category: '', date: formatLocalDate(new Date()) });
const emptyLoanForm: LoanFormState = { name: '', principal: '', monthlyPayment: '', rate: '', remainingMonths: '' };

type ActiveView = 'overview' | 'calendar' | 'fixed' | 'variable' | 'loans' | 'profile' | 'settings';

const NAV_ITEMS: Array<{ view: ActiveView; labelKey: TranslationKey; icon: IconName }> = [
  { view: 'overview', labelKey: 'nav.overview', icon: 'overview' },
  { view: 'calendar', labelKey: 'nav.calendar', icon: 'calendar' },
  { view: 'fixed', labelKey: 'nav.fixed', icon: 'repeat' },
  { view: 'variable', labelKey: 'nav.variable', icon: 'bag' },
  { view: 'loans', labelKey: 'nav.loans', icon: 'bank' },
  { view: 'profile', labelKey: 'nav.profile', icon: 'user' },
  { view: 'settings', labelKey: 'nav.settings', icon: 'sliders' },
];

export function App() {
  const [language, setLanguage] = useLanguage();
  const [theme, setTheme, resolvedTheme] = useTheme();
  const [appearance, updateAppearance] = useAppearance(resolvedTheme);
  const t = (key: TranslationKey, params?: Record<string, string>) => translate(language, key, params);

  const [snapshot, setSnapshot] = useState<BudgetSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [incomeInput, setIncomeInput] = useState('0');
  const [databasePath, setDatabasePath] = useState('');
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [activeMode, setActiveMode] = useState<'simple' | 'advanced'>('simple');
  const [interestForm, setInterestForm] = useState<AdvancedCalculatorForm>({ capital: '1000', rate: '3', years: '5', monthlyInvestment: '0' });
  const [fixedForm, setFixedForm] = useState<FixedFormState>(emptyFixedForm);
  const [variableForm, setVariableForm] = useState<VariableFormState>(emptyVariableForm);
  const [loanForm, setLoanForm] = useState<LoanFormState>(emptyLoanForm);
  const [activeMonthKey, setActiveMonthKey] = useState(getMonthKey(new Date()));
  const [accounts, setAccounts] = useState<LocalAccountSummary[]>([]);
  const [activeAccount, setActiveAccount] = useState<LocalAccountSummary | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountPin, setAccountPin] = useState('');
  const [authStage, setAuthStage] = useState<AuthStage>('create');
  const [calendarDay, setCalendarDay] = useState<number | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  useInterfaceEffects(appearance.motion, resolvedTheme);

  useEffect(() => {
    configureSounds({ enabled: appearance.soundEnabled, volume: appearance.soundVolume });
  }, [appearance.soundEnabled, appearance.soundVolume]);

  useEffect(() => {
    void loadAccounts();
    void window.finterest?.getSyncStatus().then(setSyncStatus).catch(() => undefined);
    const offUpdate = window.finterest?.onUpdateStatus(setUpdateStatus);
    const offSync = window.finterest?.onSyncStatus(setSyncStatus);
    return () => {
      offUpdate?.();
      offSync?.();
    };
  }, []);

  useEffect(() => {
    if (snapshot) {
      setIncomeInput(String(snapshot.settings.income));
      setActiveMonthKey(snapshot.settings.activeMonthKey);
    }
  }, [snapshot]);

  // The database path only exists once an account is open; asking at startup always failed.
  useEffect(() => {
    if (!activeAccount) {
      setDatabasePath('');
      return;
    }
    window.finterest.getDatabasePath().then(setDatabasePath).catch(() => setDatabasePath(''));
  }, [activeAccount]);

  useEffect(() => {
    if (error) {
      playSound('error');
    }
  }, [error]);

  const summary = useMemo(() => (snapshot ? computeBudgetSummary(snapshot, activeMonthKey) : null), [snapshot, activeMonthKey]);
  const finishSplash = useCallback(() => setShowSplash(false), []);

  function fail(thrown: unknown, fallback: TranslationKey): void {
    setError(translateError(language, thrown, fallback));
  }

  /** Runs a budget mutation, adopts the snapshot it returns, and plays `sound` on success. */
  async function mutate(action: () => Promise<BudgetSnapshot>, fallback: TranslationKey, sound?: SoundName): Promise<boolean> {
    try {
      setError(null);
      setSnapshot(await action());
      if (sound) playSound(sound);
      return true;
    } catch (thrown) {
      fail(thrown, fallback);
      return false;
    }
  }

  async function loadAccounts(): Promise<void> {
    try {
      const nextAccounts = await window.finterest.listAccounts();
      setAccounts(nextAccounts);
      setSelectedAccountId(nextAccounts[0]?.id ?? '');
      setAuthStage(nextAccounts.length > 0 ? 'select' : 'create');
    } catch (thrown) {
      fail(thrown, 'error.openAccount');
    }
  }

  async function handleAccountAccess(): Promise<void> {
    try {
      setError(null);
      if (authStage === 'create' || accounts.length === 0) {
        const account = await window.finterest.createAccount(accountName, accountPin);
        setAccounts(await window.finterest.listAccounts());
        setActiveAccount(account);
        setSelectedAccountId(account.id);
        setSnapshot(await window.finterest.getSnapshot());
        setAccountName('');
      } else {
        setSnapshot(await window.finterest.unlockAccount(selectedAccountId, accountPin));
        setActiveAccount(await window.finterest.getActiveAccount());
      }
      setAccountPin('');
      setActiveView('overview');
      playSound('unlock');
    } catch (thrown) {
      setAccountPin('');
      fail(thrown, 'error.openAccount');
    }
  }

  async function handleEnterGuest(): Promise<void> {
    try {
      setError(null);
      const nextSnapshot = await window.finterest.enterGuestMode(t('gate.guestName'));
      setActiveAccount(await window.finterest.getActiveAccount());
      setSnapshot(nextSnapshot);
      setActiveView('overview');
      playSound('open');
    } catch (thrown) {
      fail(thrown, 'error.openAccount');
    }
  }

  async function handleDeleteAccount(id: string, pin: string): Promise<void> {
    try {
      setError(null);
      await window.finterest.deleteAccount(id, pin);
      playSound('delete');
      await loadAccounts();
    } catch (thrown) {
      fail(thrown, 'error.deleteAccount');
    }
  }

  async function handleRenameAccount(name: string): Promise<void> {
    try {
      setError(null);
      setActiveAccount(await window.finterest.renameAccount(name));
      playSound('success');
    } catch (thrown) {
      fail(thrown, 'error.renameAccount');
    }
  }

  async function handleChangeAvatar(): Promise<void> {
    try {
      setError(null);
      const updated = await window.finterest.chooseAvatar();
      if (updated) {
        setActiveAccount(updated);
        playSound('success');
      }
    } catch (thrown) {
      fail(thrown, 'error.setAvatar');
    }
  }

  async function handleSwitchAccount(): Promise<void> {
    await window.finterest.lockAccount();
    setSnapshot(null);
    setActiveAccount(null);
    setAccountPin('');
    setCalendarDay(null);
    setError(null);
    await loadAccounts();
  }

  async function handleSaveIncome(): Promise<void> {
    const income = parseAmount(incomeInput);
    if (!Number.isFinite(income) || income < 0) {
      fail(new Error('ERR_NEGATIVE_AMOUNT'), 'error.saveIncome');
      return;
    }
    await mutate(() => window.finterest.saveIncome(income), 'error.saveIncome', 'success');
  }

  async function handleSaveMonthKey(nextMonthKey: string): Promise<void> {
    // The month input reports '' while being cleared or half-typed; never persist that.
    if (!isValidMonthKey(nextMonthKey)) {
      return;
    }
    setActiveMonthKey(nextMonthKey);
    await mutate(() => window.finterest.saveMonthKey(nextMonthKey), 'error.saveMonth');
  }

  async function handleAddFixedExpense(): Promise<void> {
    const amount = parseAmount(fixedForm.amount);
    const day = fixedForm.dayOfMonth.trim() ? Number(fixedForm.dayOfMonth) : null;
    if (!Number.isFinite(amount) || amount < 0) {
      fail(new Error('ERR_NEGATIVE_AMOUNT'), 'error.saveFixed');
      return;
    }
    if (day !== null && (!Number.isInteger(day) || day < 1 || day > 31)) {
      fail(new Error('ERR_INVALID_DATE'), 'error.saveFixed');
      return;
    }
    const saved = await mutate(
      () => window.finterest.addFixedExpense({ name: fixedForm.name, amount, category: fixedForm.category, dayOfMonth: day, active: true, kind: fixedForm.kind }),
      'error.saveFixed',
      'success',
    );
    if (saved) setFixedForm(emptyFixedForm());
  }

  function handleAddCalendarRecurring(name: string, amount: number, category: string, dayOfMonth: number, kind: FixedExpenseKind): Promise<boolean> {
    return mutate(() => window.finterest.addFixedExpense({ name, amount, category, dayOfMonth, active: true, kind }), 'error.saveFixed', 'success');
  }

  function handleAddCalendarPurchase(name: string, amount: number, category: string, date: string): Promise<boolean> {
    return mutate(() => window.finterest.addVariableExpense({ name, amount, category, date, monthKey: date.slice(0, 7) }), 'error.saveVariable', 'success');
  }

  async function handleDeleteCalendarEntry(entry: CalendarEntry): Promise<void> {
    await mutate(
      () => (entry.source === 'fixed' ? window.finterest.deleteFixedExpense(entry.id) : window.finterest.deleteVariableExpense(entry.id)),
      'error.deleteItem',
      'delete',
    );
  }

  async function handleAddVariableExpense(): Promise<void> {
    const amount = parseAmount(variableForm.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      fail(new Error('ERR_NEGATIVE_AMOUNT'), 'error.saveVariable');
      return;
    }
    const saved = await mutate(
      () => window.finterest.addVariableExpense({ name: variableForm.name, amount, category: variableForm.category, date: variableForm.date, monthKey: variableForm.date.slice(0, 7) }),
      'error.saveVariable',
      'success',
    );
    if (saved) setVariableForm(emptyVariableForm());
  }

  async function handleAddLoan(): Promise<void> {
    const principal = parseAmount(loanForm.principal);
    const monthlyPayment = parseAmount(loanForm.monthlyPayment);
    const rate = loanForm.rate.trim() ? parseAmount(loanForm.rate) : 0;
    const remaining = loanForm.remainingMonths.trim() ? Number(loanForm.remainingMonths) : null;
    if (![principal, monthlyPayment, rate].every((value) => Number.isFinite(value) && value >= 0) || (remaining !== null && !(Number.isInteger(remaining) && remaining >= 0))) {
      fail(new Error('ERR_NEGATIVE_AMOUNT'), 'error.saveLoan');
      return;
    }
    const saved = await mutate(
      () => window.finterest.addLoan({ name: loanForm.name, principal, monthlyPayment, interestRate: rate, remainingMonths: remaining, active: true }),
      'error.saveLoan',
      'success',
    );
    if (saved) setLoanForm(emptyLoanForm);
  }

  async function handleExportBackup(): Promise<void> {
    try {
      setError(null);
      await window.finterest.saveBackupToFile();
    } catch (thrown) {
      fail(thrown, 'error.exportBackup');
    }
  }

  async function handleImportBackup(): Promise<void> {
    try {
      setError(null);
      const restored = await window.finterest.importBackupFromFile();
      if (restored) {
        setSnapshot(restored);
        playSound('success');
      }
    } catch (thrown) {
      fail(thrown, 'error.importBackup');
    }
  }

  /** After a sync replaced files, re-read everything that may have changed underneath the UI. */
  async function refreshAfterSync(reloaded: boolean): Promise<void> {
    setAccounts(await window.finterest.listAccounts());
    if (reloaded && snapshot && activeAccount?.id !== GUEST_ACCOUNT_ID) {
      setSnapshot(await window.finterest.getSnapshot());
      setActiveAccount(await window.finterest.getActiveAccount());
    }
  }

  async function handleChooseSyncDirectory(): Promise<void> {
    try {
      setError(null);
      const result = await window.finterest.chooseSyncDirectory();
      setSyncStatus(result.status);
      await refreshAfterSync(result.reloaded);
      if (result.reloaded) playSound(result.status.state === 'error' ? 'error' : 'success');
    } catch (thrown) {
      fail(thrown, 'error.sync');
    }
  }

  async function handleSyncNow(): Promise<void> {
    try {
      setError(null);
      const result = await window.finterest.syncNow();
      setSyncStatus(result.status);
      await refreshAfterSync(result.reloaded);
      playSound(result.status.state === 'error' ? 'error' : 'success');
    } catch (thrown) {
      fail(thrown, 'error.sync');
    }
  }

  async function handleDisableSync(): Promise<void> {
    try {
      setSyncStatus(await window.finterest.disableSync());
    } catch (thrown) {
      fail(thrown, 'error.sync');
    }
  }

  const remainingPercent = summary && summary.income > 0 ? Math.max(0, Math.min(100, (summary.remainingIncome / summary.income) * 100)) : 0;
  const background = <BackgroundFx effect={appearance.background} motion={appearance.motion} />;

  if (showSplash) {
    return <>{background}<SplashScreen language={language} motion={appearance.motion} onFinish={finishSplash} /></>;
  }

  if (!snapshot) {
    return (
      <>
        {background}
        <AccountGate
          stage={authStage}
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          accountName={accountName}
          accountPin={accountPin}
          error={error}
          language={language}
          onSelect={(id) => { setSelectedAccountId(id); setAccountPin(''); setError(null); setAuthStage('welcome'); }}
          onNameChange={setAccountName}
          onPinChange={setAccountPin}
          onContinue={() => setAuthStage('login')}
          onLogin={() => setAuthStage('select')}
          onCreate={() => { setAccountPin(''); setAuthStage('create'); setError(null); }}
          onManage={() => { setAuthStage('manage'); setError(null); }}
          onBack={() => { setAccountPin(''); setError(null); setAuthStage(accounts.length > 1 ? 'select' : 'login'); }}
          onSubmit={() => void handleAccountAccess()}
          onDeleteAccount={handleDeleteAccount}
          onGuest={() => void handleEnterGuest()}
        />
      </>
    );
  }

  const viewCopy: Record<ActiveView, { eyebrow: TranslationKey; title: TranslationKey }> = {
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
    <>
      {background}
      <main className="app-shell">
        <aside className="sidebar">
          <div className="brand-lockup">
            <img src={logoUrl} alt="" />
            <div><strong>{t('app.name')}</strong><span>{t('app.tagline')}</span></div>
          </div>
          {activeMode === 'simple' && activeAccount ? (
            <button className="profile-chip" data-sound="nav" onClick={() => setActiveView('profile')}>
              <Avatar name={activeAccount.name} avatarUrl={activeAccount.avatarUrl} size="sm" />
              <span>{activeAccount.name}</span>
              <b><Icon name="chevronRight" size={14} /></b>
            </button>
          ) : null}
          <div className="mode-switch" aria-label={t('mode.simple')}>
            <button className={activeMode === 'simple' ? 'selected' : 'ghost'} data-sound="nav" onClick={() => setActiveMode('simple')}><Icon name="wallet" size={16} />{t('mode.simple')}</button>
            <button className={activeMode === 'advanced' ? 'selected' : 'ghost'} data-sound="nav" onClick={() => setActiveMode('advanced')}><Icon name="calculator" size={16} />{t('mode.advanced')}</button>
          </div>
          {activeMode === 'simple' ? (
            <nav className="primary-nav" aria-label={t('app.name')}>
              {NAV_ITEMS.map((item) => (
                <NavButton key={item.view} active={activeView === item.view} label={t(item.labelKey)} icon={item.icon} onClick={() => setActiveView(item.view)} />
              ))}
            </nav>
          ) : (
            <div className="advanced-nav-note"><Icon name="sparkles" size={18} /><p>{t('mode.advancedNote')}</p></div>
          )}
          <div className="sidebar-foot">
            <span className={`status-dot ${syncStatus?.state === 'error' ? 'warn' : ''}`} />
            {t('sidebar.localData')}<br />
            <small>{syncStatus?.directory ? `${t('sidebar.localDataNote')} · ${t('sync.title')}` : t('sidebar.localDataNote')}</small>
          </div>
        </aside>

        <section key={`${activeMode}-${activeView}`} className={`workspace view-${activeView}`}>
          <header className="topbar">
            <div>
              <p className="eyebrow">{activeMode === 'advanced' ? t('view.advanced.eyebrow') : t(viewCopy[activeView].eyebrow)}</p>
              <h1>{activeMode === 'advanced' ? t('view.advanced.title') : t(viewCopy[activeView].title)}</h1>
            </div>
            {activeMode === 'simple' && activeView !== 'settings' && activeView !== 'profile' ? (
              <div className="month-control">
                <span>{t('month.label')}</span>
                <input
                  aria-label={t('month.label')}
                  type="month"
                  value={activeMonthKey}
                  onChange={(event) => { if (isValidMonthKey(event.target.value)) setActiveMonthKey(event.target.value); }}
                  onBlur={() => void handleSaveMonthKey(activeMonthKey)}
                />
              </div>
            ) : null}
          </header>

          {error ? (
            <div className="error-banner" role="alert">
              <Icon name="alert" size={18} />
              <span>{error}</span>
              <button className="ghost small icon-button" data-sound="none" onClick={() => setError(null)} aria-label={t('calendar.close')}><Icon name="close" size={15} /></button>
            </div>
          ) : null}
          {updateStatus?.state === 'available' || updateStatus?.state === 'downloaded' ? (
            <div className="update-banner">
              <span><Icon name="download" size={16} />{t(updateStatus.state === 'downloaded' ? 'update.downloaded' : 'update.available')}</span>
              {updateStatus.state === 'downloaded' ? (
                <button className="ghost small" onClick={() => void window.finterest.installUpdate()}>{t('update.restartInstall')}</button>
              ) : null}
            </div>
          ) : null}

          {activeMode === 'advanced' ? <AdvancedCalculator form={interestForm} language={language} onChange={setInterestForm} /> : null}

          {activeMode === 'simple' && activeView === 'calendar' ? (
            <BudgetCalendar
              monthKey={activeMonthKey}
              snapshot={snapshot}
              selectedDay={calendarDay}
              language={language}
              onDaySelect={setCalendarDay}
              onAddRecurring={handleAddCalendarRecurring}
              onAddPurchase={handleAddCalendarPurchase}
              onDeleteEntry={handleDeleteCalendarEntry}
              onMonthChange={(monthKey) => void handleSaveMonthKey(monthKey)}
            />
          ) : null}

          {activeMode === 'simple' && activeView === 'settings' ? (
            <SettingsPanel
              databasePath={databasePath}
              isGuest={activeAccount?.id === GUEST_ACCOUNT_ID}
              language={language}
              theme={theme}
              resolvedTheme={resolvedTheme}
              appearance={appearance}
              updateStatus={updateStatus}
              syncStatus={syncStatus}
              onExport={handleExportBackup}
              onImport={handleImportBackup}
              onLanguageChange={setLanguage}
              onThemeChange={setTheme}
              onAppearanceChange={updateAppearance}
              onCheckForUpdates={() => window.finterest.checkForUpdates()}
              onInstallUpdate={() => window.finterest.installUpdate()}
              onOpenProfile={() => setActiveView('profile')}
              onChooseSyncDirectory={handleChooseSyncDirectory}
              onDisableSync={handleDisableSync}
              onSyncNow={handleSyncNow}
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
              onSaveIncome={() => void handleSaveIncome()}
              onFixedFormChange={setFixedForm}
              onAddFixedExpense={() => void handleAddFixedExpense()}
              onToggleFixedExpense={(id, active) => void mutate(() => window.finterest.toggleFixedExpense(id, active), 'error.updateItem')}
              onDeleteFixedExpense={(id) => void mutate(() => window.finterest.deleteFixedExpense(id), 'error.deleteItem', 'delete')}
              onVariableFormChange={setVariableForm}
              onAddVariableExpense={() => void handleAddVariableExpense()}
              onDeleteVariableExpense={(id) => void mutate(() => window.finterest.deleteVariableExpense(id), 'error.deleteItem', 'delete')}
              onLoanFormChange={setLoanForm}
              onAddLoan={() => void handleAddLoan()}
              onToggleLoan={(id, active) => void mutate(() => window.finterest.toggleLoan(id, active), 'error.updateItem')}
              onDeleteLoan={(id) => void mutate(() => window.finterest.deleteLoan(id), 'error.deleteItem', 'delete')}
            />
          ) : null}
        </section>
      </main>
    </>
  );
}
