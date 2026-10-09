import type { BackupFile, Budget, BudgetSnapshot, Loan, NebulaState, PendingBackup, SyncStatus, UpdateStatus, Wallet, WalletMovement } from './types';
import type { LocalAccountSummary } from './accounts';
import type { NewsTab, NewsWidget } from './nebula';

declare global {
  interface Window {
    finterest: {
      listAccounts(): Promise<LocalAccountSummary[]>;
      createAccount(name: string, pin: string): Promise<LocalAccountSummary>;
      unlockAccount(id: string, pin: string): Promise<BudgetSnapshot>;
      enterGuestMode(name: string): Promise<BudgetSnapshot>;
      deleteAccount(id: string, pin: string): Promise<void>;
      renameAccount(name: string): Promise<LocalAccountSummary>;
      chooseAvatar(): Promise<LocalAccountSummary | null>;
      lockAccount(): Promise<void>;
      getActiveAccount(): Promise<LocalAccountSummary | null>;
      getSnapshot(): Promise<BudgetSnapshot>;
      saveIncome(income: number): Promise<BudgetSnapshot>;
      saveMonthKey(monthKey: string): Promise<BudgetSnapshot>;
      addFixedExpense(expense: Omit<BudgetSnapshot['fixedExpenses'][number], 'id'> & { id?: string }): Promise<BudgetSnapshot>;
      toggleFixedExpense(id: string, active: boolean): Promise<BudgetSnapshot>;
      deleteFixedExpense(id: string): Promise<BudgetSnapshot>;
      addVariableExpense(expense: Omit<BudgetSnapshot['variableExpenses'][number], 'id'> & { id?: string }): Promise<BudgetSnapshot>;
      deleteVariableExpense(id: string): Promise<BudgetSnapshot>;
      addLoan(loan: Omit<Loan, 'id'> & { id?: string }): Promise<BudgetSnapshot>;
      toggleLoan(id: string, active: boolean): Promise<BudgetSnapshot>;
      deleteLoan(id: string): Promise<BudgetSnapshot>;
      /** Budgets, sub-envelopes and pots (v0.1.41). */
      saveBudget(budget: Partial<Budget> & { name: string; amount: number }): Promise<BudgetSnapshot>;
      deleteBudget(id: string): Promise<BudgetSnapshot>;
      saveWallet(wallet: Partial<Wallet> & { name: string }): Promise<BudgetSnapshot>;
      deleteWallet(id: string): Promise<BudgetSnapshot>;
      addWalletMovement(movement: Partial<WalletMovement> & { walletId: string; amount: number; date: string }): Promise<BudgetSnapshot>;
      deleteWalletMovement(id: string): Promise<BudgetSnapshot>;
      exportBackup(): Promise<BackupFile>;
      importBackup(backup: BackupFile): Promise<BudgetSnapshot>;
      saveBackupToFile(): Promise<void>;
      importBackupFromFile(): Promise<BudgetSnapshot | null>;
      getDatabasePath(): Promise<string>;
      onUpdateStatus(callback: (status: UpdateStatus) => void): () => void;
      installUpdate(): Promise<void>;
      /** Tints the native window controls of the frameless window; only known theme names are accepted. */
      setWindowTheme(theme: string): Promise<void>;
      checkForUpdates(): Promise<void>;
      getSyncStatus(): Promise<SyncStatus>;
      /** `reloaded` tells the renderer to re-read accounts and the snapshot, which the sync may have replaced. */
      chooseSyncDirectory(): Promise<{ status: SyncStatus; reloaded: boolean }>;
      disableSync(): Promise<SyncStatus>;
      syncNow(): Promise<{ status: SyncStatus; reloaded: boolean }>;
      onSyncStatus(callback: (status: SyncStatus) => void): () => void;
      /** Profiles in the copy folder that this computer does not have (v0.1.37: never added on their own). */
      listRestorableProfiles(): Promise<LocalAccountSummary[]>;
      restoreProfiles(ids: string[]): Promise<LocalAccountSummary[]>;
      /** A backup waiting for confirmation (`--import-backup=`, or the latest one offered after a reinstall). */
      getPendingImport(): Promise<PendingBackup | null>;
      offerLatestBackup(): Promise<PendingBackup | null>;
      dismissPendingImport(): Promise<void>;
      importPendingBackup(accountName?: string): Promise<BudgetSnapshot>;
      onPendingImport(callback: (pending: PendingBackup) => void): () => void;
      /** Nebula Hub (Nebula Link). */
      getNebulaState(): Promise<NebulaState>;
      setUpdatesByHub(enabled: boolean): Promise<NebulaState>;
      onNebulaState(callback: (state: NebulaState) => void): () => void;
      onNebulaAppearance(callback: (appearance: unknown) => void): () => void;
      onOpenMonth(callback: (monthKey: string) => void): () => void;
      openNebulaHub(): Promise<'opened' | 'not-installed'>;
      /** Nebula News' finance articles (news.finance.today), checked in the main process; null when there is nothing to show. */
      getFinanceNews(): Promise<NewsWidget | null>;
      /** The "Nebula News" tab: Nebula News' finance articles (news.finance.articles), checked in the main process. */
      getFinanceArticles(): Promise<NewsTab>;
      setNewsFinance(enabled: boolean): Promise<NebulaState>;
      /** Opens a nebula://news/ link (re-checked in the main process); false when it cannot. */
      openNewsLink(deepLink: string): Promise<boolean>;
      isDocked(): Promise<boolean>;
      detachFromHub(): Promise<void>;
    };
  }
}

export {};
