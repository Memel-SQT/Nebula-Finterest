import { contextBridge, ipcRenderer } from 'electron';
import type { BackupFile, BudgetSnapshot, Loan, UpdateStatus } from '../shared/types';

contextBridge.exposeInMainWorld('finterest', {
  getSnapshot: () => ipcRenderer.invoke('budget:getSnapshot'),
  listAccounts: () => ipcRenderer.invoke('account:list'),
  createAccount: (name: string, pin: string) => ipcRenderer.invoke('account:create', name, pin),
  unlockAccount: (id: string, pin: string) => ipcRenderer.invoke('account:unlock', id, pin),
  deleteAccount: (id: string, pin: string) => ipcRenderer.invoke('account:delete', id, pin),
  lockAccount: () => ipcRenderer.invoke('account:lock'),
  getActiveAccount: () => ipcRenderer.invoke('account:active'),
  saveIncome: (income: number) => ipcRenderer.invoke('budget:saveIncome', income),
  saveMonthKey: (monthKey: string) => ipcRenderer.invoke('budget:saveMonthKey', monthKey),
  addFixedExpense: (expense) => ipcRenderer.invoke('budget:addFixedExpense', expense),
  toggleFixedExpense: (id: string, active: boolean) => ipcRenderer.invoke('budget:toggleFixedExpense', id, active),
  deleteFixedExpense: (id: string) => ipcRenderer.invoke('budget:deleteFixedExpense', id),
  addVariableExpense: (expense) => ipcRenderer.invoke('budget:addVariableExpense', expense),
  deleteVariableExpense: (id: string) => ipcRenderer.invoke('budget:deleteVariableExpense', id),
  addLoan: (loan: Omit<Loan, 'id'> & { id?: string }) => ipcRenderer.invoke('budget:addLoan', loan),
  toggleLoan: (id: string, active: boolean) => ipcRenderer.invoke('budget:toggleLoan', id, active),
  deleteLoan: (id: string) => ipcRenderer.invoke('budget:deleteLoan', id),
  exportBackup: () => ipcRenderer.invoke('budget:exportBackup'),
  importBackup: (backup: BackupFile) => ipcRenderer.invoke('budget:importBackup', backup),
  saveBackupToFile: () => ipcRenderer.invoke('budget:saveBackupToFile'),
  importBackupFromFile: () => ipcRenderer.invoke('budget:importBackupFromFile'),
  getDatabasePath: () => ipcRenderer.invoke('budget:getDatabasePath'),
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
    const listener = (_event: unknown, status: UpdateStatus) => callback(status);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },
  installUpdate: () => ipcRenderer.invoke('app:installUpdate'),
} as const satisfies Window['finterest']);
