import type { BackupFile, BudgetSnapshot } from './types';
import type { LocalAccountSummary } from './accounts';

declare global {
  interface Window {
    finterest: {
      listAccounts(): Promise<LocalAccountSummary[]>;
      createAccount(name: string, pin: string): Promise<LocalAccountSummary>;
      unlockAccount(id: string, pin: string): Promise<BudgetSnapshot>;
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
      exportBackup(): Promise<BackupFile>;
      importBackup(backup: BackupFile): Promise<BudgetSnapshot>;
      saveBackupToFile(): Promise<void>;
      importBackupFromFile(): Promise<BudgetSnapshot | null>;
      getDatabasePath(): Promise<string>;
    };
  }
}

export {};
