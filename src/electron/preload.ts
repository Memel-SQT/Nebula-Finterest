import { contextBridge, ipcRenderer } from 'electron';
import type { BackupFile, Loan, NebulaState, PendingBackup, SyncStatus, UpdateStatus } from '../shared/types';

function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: unknown, payload: T) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('finterest', {
  getSnapshot: () => ipcRenderer.invoke('budget:getSnapshot'),
  listAccounts: () => ipcRenderer.invoke('account:list'),
  createAccount: (name: string, pin: string) => ipcRenderer.invoke('account:create', name, pin),
  unlockAccount: (id: string, pin: string) => ipcRenderer.invoke('account:unlock', id, pin),
  enterGuestMode: (name: string) => ipcRenderer.invoke('account:guest', name),
  deleteAccount: (id: string, pin: string) => ipcRenderer.invoke('account:delete', id, pin),
  renameAccount: (name: string) => ipcRenderer.invoke('account:rename', name),
  chooseAvatar: () => ipcRenderer.invoke('account:chooseAvatar'),
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
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => subscribe('update:status', callback),
  installUpdate: () => ipcRenderer.invoke('app:installUpdate'),
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  getSyncStatus: () => ipcRenderer.invoke('sync:getStatus'),
  chooseSyncDirectory: () => ipcRenderer.invoke('sync:chooseDirectory'),
  disableSync: () => ipcRenderer.invoke('sync:disable'),
  syncNow: () => ipcRenderer.invoke('sync:now'),
  onSyncStatus: (callback: (status: SyncStatus) => void) => subscribe('sync:status', callback),
  listRestorableProfiles: () => ipcRenderer.invoke('sync:listRestorable'),
  restoreProfiles: (ids: string[]) => ipcRenderer.invoke('sync:restore', ids),
  getPendingImport: () => ipcRenderer.invoke('backup:getPending'),
  offerLatestBackup: () => ipcRenderer.invoke('backup:offerLatest'),
  dismissPendingImport: () => ipcRenderer.invoke('backup:dismissPending'),
  importPendingBackup: (accountName?: string) => ipcRenderer.invoke('backup:importPending', accountName),
  onPendingImport: (callback: (pending: PendingBackup) => void) => subscribe('backup:pending', callback),
  getNebulaState: () => ipcRenderer.invoke('nebula:getState'),
  setUpdatesByHub: (enabled: boolean) => ipcRenderer.invoke('nebula:setUpdatesByHub', enabled),
  onNebulaState: (callback: (state: NebulaState) => void) => subscribe('nebula:state', callback),
  onNebulaAppearance: (callback: (appearance: unknown) => void) => subscribe('nebula:appearance', callback),
  onOpenMonth: (callback: (monthKey: string) => void) => subscribe('nebula:open-month', callback),
  openNebulaHub: () => ipcRenderer.invoke('nebula:openHub'),
  isDocked: () => ipcRenderer.invoke('nebula:isDocked'),
  detachFromHub: () => ipcRenderer.invoke('nebula:detach'),
} as const satisfies Window['finterest']);
