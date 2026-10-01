import type { BackupFile, BudgetSnapshot, Loan, SyncStatus, UpdateStatus } from './types';
import type { LocalAccountSummary } from './accounts';

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
      exportBackup(): Promise<BackupFile>;
      importBackup(backup: BackupFile): Promise<BudgetSnapshot>;
      saveBackupToFile(): Promise<void>;
      importBackupFromFile(): Promise<BudgetSnapshot | null>;
      getDatabasePath(): Promise<string>;
      onUpdateStatus(callback: (status: UpdateStatus) => void): () => void;
      installUpdate(): Promise<void>;
      checkForUpdates(): Promise<void>;
      getSyncStatus(): Promise<SyncStatus>;
      /** `reloaded` tells the renderer to re-read accounts and the snapshot, which the sync may have replaced. */
      chooseSyncDirectory(): Promise<{ status: SyncStatus; reloaded: boolean }>;
      disableSync(): Promise<SyncStatus>;
      syncNow(): Promise<{ status: SyncStatus; reloaded: boolean }>;
      onSyncStatus(callback: (status: SyncStatus) => void): () => void;
    };
  }
}

export {};
