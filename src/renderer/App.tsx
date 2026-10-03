import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computeBudgetSummary, formatLocalDate, getMonthKey, isValidMonthKey, parseAmount } from '@shared/budget';
import type { BudgetSnapshot, CalendarEntry, FixedExpenseKind, NebulaState, PendingBackup, SyncStatus, UpdateStatus } from '@shared/types';
import { GUEST_ACCOUNT_ID } from '@shared/accounts';
import type { LocalAccountSummary } from '@shared/accounts';
import { translate, translateError, useLanguage, type TranslationKey } from './i18n';
import { useTheme } from './theme';
import { useAppearance } from './appearance';
import { configureSounds, playSound, type SoundName } from './sound';
import { useInterfaceEffects } from './effects';
import { nebulaAppearancePatch, useFollowNebula, windowMode } from './nebula';
import { Icon } from './components/Icon';
import { Sidebar, type ActiveView } from './components/Sidebar';
import { AccountGate, type AuthStage } from './components/AccountGate';
import { BudgetCalendar } from './components/BudgetCalendar';
import { AdvancedCalculator, type AdvancedCalculatorForm } from './components/AdvancedCalculator';
import { SettingsPanel } from './components/SettingsPanel';
import { Dashboard, type FixedFormState, type VariableFormState } from './components/Dashboard';
import type { LoanFormState } from './components/LoansPanel';
import { ProfileScreen } from './components/ProfileScreen';
import { SplashScreen } from './components/SplashScreen';
import { BackgroundFx } from './components/BackgroundFx';
import { Dialog } from './components/Dialog';
import { LearnCard, type LearnState } from './components/LearnCard';

/** Injected by Vite from package.json (vite.config.ts); empty under Jest. */
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '';

const emptyFixedForm = (): FixedFormState => ({ name: '', amount: '', category: '', dayOfMonth: '', kind: 'subscription' });
const emptyVariableForm = (): VariableFormState => ({ name: '', amount: '', category: '', date: formatLocalDate(new Date()) });
const emptyLoanForm: LoanFormState = { name: '', principal: '', monthlyPayment: '', rate: '', remainingMonths: '' };

/** Nebula News refreshes its widgets every 15 minutes; the main process caches as long. */
const LEARN_REFRESH_MS = 15 * 60 * 1000;

/** Views that work on one month: they show the "Month" control in the page header. */
const MONTH_VIEWS: ActiveView[] = ['overview', 'calendar', 'fixed', 'variable', 'loans'];

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
  // A window recreated for (or after) the Nebula Hub mode skips the splash: the app is already open.
  const [mode] = useState(() => windowMode(window.location.search));
  const [showSplash, setShowSplash] = useState(mode === null);
  const [pendingImport, setPendingImport] = useState<PendingBackup | null>(null);
  const [pendingIsLatest, setPendingIsLatest] = useState(false);
  const [importSource, setImportSource] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [restorable, setRestorable] = useState<LocalAccountSummary[]>([]);
  const [nebulaState, setNebulaState] = useState<NebulaState | null>(null);
  const [followNebula, setFollowNebula] = useFollowNebula();
  const [learn, setLearn] = useState<LearnState>({ status: 'none' });
  /** Profile just created on this computer (typically after a reinstall): offered the latest backup. */
  const justCreated = useRef<string | null>(null);
  const snapshotRef = useRef<BudgetSnapshot | null>(null);
  snapshotRef.current = snapshot;

  useInterfaceEffects(appearance.motion, resolvedTheme);

  // The frameless window keeps Windows' own controls: tint them like the page.
  useEffect(() => {
    void window.finterest?.setWindowTheme?.(resolvedTheme).catch(() => undefined);
  }, [resolvedTheme]);

  useEffect(() => {
    configureSounds({ enabled: appearance.soundEnabled, volume: appearance.soundVolume });
  }, [appearance.soundEnabled, appearance.soundVolume]);

  useEffect(() => {
    void loadAccounts();
    void restoreOpenProfile();
    void window.finterest?.getSyncStatus().then(setSyncStatus).catch(() => undefined);
    void window.finterest?.getPendingImport().then((pending) => pending && showPendingImport(pending, false)).catch(() => undefined);
    void window.finterest?.getNebulaState().then(setNebulaState).catch(() => undefined);
    const offUpdate = window.finterest?.onUpdateStatus(setUpdateStatus);
    const offSync = window.finterest?.onSyncStatus(setSyncStatus);
    const offPending = window.finterest?.onPendingImport((pending) => showPendingImport(pending, false));
    const offNebula = window.finterest?.onNebulaState(setNebulaState);
    const offMonth = window.finterest?.onOpenMonth((monthKey) => {
      // A Nebula link to a month (widget, notification): shown if a profile is open.
      if (!snapshotRef.current || !isValidMonthKey(monthKey)) return;
      setActiveView('overview');
      setActiveMonthKey(monthKey);
      void window.finterest.saveMonthKey(monthKey).then(setSnapshot).catch(() => undefined);
    });
    return () => {
      offUpdate?.();
      offSync?.();
      offPending?.();
      offNebula?.();
      offMonth?.();
    };
  }, []);

  // The Nebula appearance, when the user follows it (I1): theme (never over an old-* one), colors, language.
  useEffect(() => {
    if (!followNebula) return undefined;
    return window.finterest?.onNebulaAppearance((payload) => {
      const patch = nebulaAppearancePatch(payload, theme);
      if (patch.theme) setTheme(patch.theme);
      updateAppearance(patch.appearance);
      if (patch.language) setLanguage(patch.language);
    });
  }, [followNebula, theme, setTheme, updateAppearance, setLanguage]);

  // After a reinstall, the profile created on this computer is offered the latest backup of
  // Documents\Nebula Finterest, once (new profiles start with example data: "empty" cannot tell).
  useEffect(() => {
    if (!snapshot || !activeAccount || activeAccount.id === GUEST_ACCOUNT_ID || pendingImport) return;
    if (justCreated.current !== activeAccount.id) return;
    justCreated.current = null;
    void window.finterest.offerLatestBackup().then((latest) => {
      if (!latest) return;
      let dismissed = '';
      try {
        dismissed = window.localStorage.getItem('finterest-dismissed-backup') ?? '';
      } catch {
        dismissed = '';
      }
      if (dismissed !== `${latest.file}|${latest.modifiedAt}`) showPendingImport(latest, true);
      else void window.finterest.dismissPendingImport();
    }).catch(() => undefined);
  }, [snapshot, activeAccount, pendingImport]);

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

  // "Learn" card (Nebula News, news.finance.today): only on the overview of a real unlocked profile
  // (never on the gate, profile creation or a guest session), with the Hub connected and the
  // setting on; refreshed every 15 minutes while the window is visible. The main process asks
  // News without any parameter, checks the payload and caches it; null hides the card.
  const learnActive = Boolean(snapshot) && Boolean(activeAccount) && activeAccount?.id !== GUEST_ACCOUNT_ID
    && activeView === 'overview' && nebulaState?.connected === true && nebulaState.newsFinance !== false;
  useEffect(() => {
    if (!learnActive) {
      setLearn({ status: 'none' });
      return undefined;
    }
    let cancelled = false;
    let loaded = false;
    const load = () => {
      if (document.hidden) return;
      if (!loaded) setLearn({ status: 'loading' });
      void window.finterest.getFinanceNews()
        .then((widget) => {
          if (cancelled) return;
          loaded = true;
          setLearn(widget ? { status: 'ready', widget } : { status: 'none' });
        })
        .catch(() => {
          if (!cancelled) setLearn({ status: 'none' });
        });
    };
    load();
    const timer = window.setInterval(load, LEARN_REFRESH_MS);
    const onVisibility = () => {
      if (!document.hidden) load();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [learnActive]);

  /** The open profile survives a window recreated for the Hub mode: show it again without the gate. */
  async function restoreOpenProfile(): Promise<void> {
    try {
      const active = await window.finterest.getActiveAccount();
      if (!active) return;
      setActiveAccount(active);
      setSnapshot(await window.finterest.getSnapshot());
    } catch {
      // Locked: the gate shows as usual.
    }
  }

  function showPendingImport(pending: PendingBackup, latest: boolean): void {
    setPendingImport(pending);
    setPendingIsLatest(latest);
    setImportSource(pending.accounts[0] ?? '');
  }

  async function handleImportPending(): Promise<void> {
    if (!pendingImport) return;
    const done = await mutate(() => window.finterest.importPendingBackup(importSource || undefined), 'error.importBackup', 'success');
    if (done) {
      setPendingImport(null);
      setInfo(t('import.done'));
    }
  }

  async function handleDismissPending(): Promise<void> {
    if (pendingImport && pendingIsLatest) {
      try {
        window.localStorage.setItem('finterest-dismissed-backup', `${pendingImport.file}|${pendingImport.modifiedAt}`);
      } catch {
        // Offered again next time; harmless.
      }
    }
    setPendingImport(null);
    await window.finterest.dismissPendingImport().catch(() => undefined);
  }

  async function refreshRestorable(): Promise<void> {
    setRestorable(await window.finterest.listRestorableProfiles().catch(() => []));
  }

  async function handleRestoreProfile(id: string): Promise<void> {
    try {
      setError(null);
      setAccounts(await window.finterest.restoreProfiles([id]));
      await refreshRestorable();
      setInfo(t('sync.restored'));
      playSound('success');
    } catch (thrown) {
      fail(thrown, 'error.sync');
    }
  }

  async function handleOpenNebulaHub(): Promise<void> {
    const result = await window.finterest.openNebulaHub().catch(() => 'not-installed' as const);
    if (result === 'not-installed') setInfo(t('nebula.notInstalled'));
  }

  async function handleUpdatesByHub(enabled: boolean): Promise<void> {
    setNebulaState(await window.finterest.setUpdatesByHub(enabled));
  }

  async function handleNewsFinance(enabled: boolean): Promise<void> {
    setNebulaState(await window.finterest.setNewsFinance(enabled));
  }

  async function handleOpenNews(deepLink: string): Promise<void> {
    const opened = await window.finterest.openNewsLink(deepLink).catch(() => false);
    if (!opened) setInfo(t('learn.unavailable'));
  }
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
        justCreated.current = account.id;
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
      await refreshRestorable();
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
      await refreshRestorable();
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
        {mode === 'docked' ? null : <div className="titlebar-drag" aria-hidden="true" />}
        {pendingImport ? <div className="gate-notice" role="status"><Icon name="download" size={16} />{t('import.pending.locked')}</div> : null}
        {mode === 'docked' ? (
          <div className="dock-bar gate-dock">
            <span><Icon name="overview" size={15} />{t('dock.bar')}</span>
            <button className="ghost small" data-sound="none" onClick={() => void window.finterest.detachFromHub()}>{t('dock.detach')}</button>
          </div>
        ) : null}
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
    calculator: { eyebrow: 'view.advanced.eyebrow', title: 'view.advanced.title' },
  };

  const showKpis = ['overview', 'fixed', 'variable', 'loans'].includes(activeView);

  return (
    <>
      {background}
      {mode === 'docked' ? null : <div className="titlebar-drag" aria-hidden="true" />}
      <main className="app-shell">
        <Sidebar
          active={activeView}
          account={activeAccount}
          nebulaState={nebulaState}
          syncError={syncStatus?.state === 'error'}
          version={APP_VERSION}
          language={language}
          onNavigate={setActiveView}
          onLock={() => void handleSwitchAccount()}
          onOpenHub={() => void handleOpenNebulaHub()}
        />

        <div className="workspace-column">
        <section key={activeView} className={`workspace view-${activeView}`}>
          <div className="workspace-inner">
          {mode === 'docked' ? (
            <div className="dock-bar">
              <span><Icon name="orbit" size={15} />{t('dock.bar')}</span>
              <button className="ghost small" data-sound="none" onClick={() => void window.finterest.detachFromHub()}>{t('dock.detach')}</button>
            </div>
          ) : null}
          <header className="topbar">
            <div>
              <p className="eyebrow">{t(viewCopy[activeView].eyebrow)}</p>
              <h1>{t(viewCopy[activeView].title)}</h1>
            </div>
            {MONTH_VIEWS.includes(activeView) ? (
              <label className="topbar-control month-control">
                <span>{t('month.label')}</span>
                <input
                  type="month"
                  value={activeMonthKey}
                  onChange={(event) => { if (isValidMonthKey(event.target.value)) setActiveMonthKey(event.target.value); }}
                  onBlur={() => void handleSaveMonthKey(activeMonthKey)}
                />
              </label>
            ) : null}
          </header>

          {error ? (
            <div className="state-banner error-banner" role="alert">
              <Icon name="alert" size={18} />
              <span className="state-banner-text">{error}</span>
              <button className="ghost small icon-button" data-sound="none" onClick={() => setError(null)} aria-label={t('calendar.close')}><Icon name="close" size={15} /></button>
            </div>
          ) : null}
          {info ? (
            <div className="state-banner info-banner" role="status">
              <Icon name="check" size={18} />
              <span className="state-banner-text">{info}</span>
              <button className="ghost small icon-button" data-sound="none" onClick={() => setInfo(null)} aria-label={t('calendar.close')}><Icon name="close" size={15} /></button>
            </div>
          ) : null}
          {pendingImport ? (
            <Dialog
              title={t(pendingIsLatest ? 'import.latest.title' : 'import.pending.title')}
              icon="download"
              tone="accent"
              confirmLabel={t('import.pending.confirm')}
              cancelLabel={t('import.pending.dismiss')}
              onConfirm={() => void handleImportPending()}
              onCancel={() => void handleDismissPending()}
            >
              <p>{t(pendingIsLatest ? 'import.latest.body' : 'import.pending.body', {
                file: pendingImport.fileName,
                date: new Date(pendingImport.exportedAt ?? pendingImport.modifiedAt).toLocaleString(language === 'en' ? 'en-US' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short' }),
                name: activeAccount?.name ?? '',
              })}</p>
              {pendingImport.accounts.length > 1 ? (
                <label className="dialog-field">
                  {t('import.pending.source')}
                  <select value={importSource} onChange={(event) => setImportSource(event.target.value)}>
                    {pendingImport.accounts.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </label>
              ) : null}
            </Dialog>
          ) : null}
          {updateStatus?.state === 'available' || updateStatus?.state === 'downloaded' ? (
            <div className="update-banner">
              <span><Icon name="download" size={16} />{t(updateStatus.state === 'downloaded' ? 'update.downloaded' : 'update.available')}</span>
              {updateStatus.state === 'downloaded' ? (
                <button className="ghost small" onClick={() => void window.finterest.installUpdate()}>{t('update.restartInstall')}</button>
              ) : null}
            </div>
          ) : null}

          {activeView === 'calculator' ? <AdvancedCalculator form={interestForm} language={language} onChange={setInterestForm} /> : null}

          {activeView === 'calendar' ? (
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

          {activeView === 'settings' ? (
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
              restorable={restorable}
              onRefreshRestorable={refreshRestorable}
              onRestoreProfile={handleRestoreProfile}
              nebulaState={nebulaState}
              followNebula={followNebula}
              onFollowNebulaChange={setFollowNebula}
              onUpdatesByHubChange={handleUpdatesByHub}
              onNewsFinanceChange={handleNewsFinance}
              onOpenNebulaHub={handleOpenNebulaHub}
            />
          ) : null}

          {activeView === 'profile' && activeAccount ? (
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
              learn={<LearnCard state={learn} language={language} onOpen={(deepLink) => void handleOpenNews(deepLink)} />}
            />
          ) : null}
          </div>
        </section>
        </div>
      </main>
    </>
  );
}
