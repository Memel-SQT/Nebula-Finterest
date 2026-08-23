import path from 'node:path';
import fs from 'node:fs/promises';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { AccountManager } from './accounts';
import type { BackupFile, UpdateStatus } from '../shared/types';

let mainWindow: BrowserWindow | null = null;
const accountManager = new AccountManager();

const BACKUP_BEFORE_UNINSTALL_FLAG = '--backup-before-uninstall=';

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 700,
    backgroundColor: '#05070a',
    title: 'Finterest',
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL ?? (!app.isPackaged ? 'http://127.0.0.1:5173' : undefined);
  if (devUrl) {
    await mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  const backupFlag = process.argv.find((arg) => arg.startsWith(BACKUP_BEFORE_UNINSTALL_FLAG));
  if (backupFlag) {
    const backupPath = backupFlag.slice(BACKUP_BEFORE_UNINSTALL_FLAG.length);
    await runPreUninstallBackup(backupPath);
    app.exit(0);
    return;
  }

  registerIpcHandlers();
  await accountManager.initialize();
  await createWindow();
  setUpAutoUpdater();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/** Invoked by the Windows NSIS uninstaller (build/installer.nsh) before it deletes the userData folder, so local accounts are not lost silently. */
async function runPreUninstallBackup(backupPath: string): Promise<void> {
  try {
    await accountManager.initialize();
    const backup = await accountManager.exportAllForBackup();
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.writeFile(backupPath, JSON.stringify(backup, null, 2), 'utf8');
  } catch {
    // Best-effort safety net: never block or fail the uninstall over a backup error.
  }
}

function sendUpdateStatus(status: UpdateStatus): void {
  mainWindow?.webContents.send('update:status', status);
}

function setUpAutoUpdater(): void {
  if (!app.isPackaged) {
    return;
  }

  autoUpdater.on('checking-for-update', () => sendUpdateStatus({ state: 'checking' }));
  autoUpdater.on('update-available', (info) => sendUpdateStatus({ state: 'available', version: info.version }));
  autoUpdater.on('update-not-available', () => sendUpdateStatus({ state: 'not-available' }));
  autoUpdater.on('update-downloaded', (info) => sendUpdateStatus({ state: 'downloaded', version: info.version }));
  autoUpdater.on('error', (error) => sendUpdateStatus({ state: 'error', message: error.message }));

  if (process.platform === 'win32') {
    autoUpdater.autoDownload = true;
    autoUpdater.checkForUpdatesAndNotify().catch(() => undefined);
  } else {
    // dmg/AppImage targets are not configured for a silent quitAndInstall cycle; only surface availability.
    autoUpdater.autoDownload = false;
    autoUpdater.checkForUpdates().catch(() => undefined);
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle('account:list', () => accountManager.list());
  ipcMain.handle('account:create', async (_event, name: string, pin: string) => accountManager.create(name, pin));
  ipcMain.handle('account:unlock', async (_event, id: string, pin: string) => accountManager.unlock(id, pin));
  ipcMain.handle('account:delete', async (_event, id: string, pin: string) => accountManager.delete(id, pin));
  ipcMain.handle('account:rename', async (_event, name: string) => accountManager.renameActive(name));
  ipcMain.handle('account:chooseAvatar', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Choisir une photo de profil',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return accountManager.setActiveAvatar(result.filePaths[0]);
  });
  ipcMain.handle('account:lock', () => accountManager.lock());
  ipcMain.handle('account:active', () => accountManager.getActive());
  ipcMain.handle('budget:getSnapshot', async () => accountManager.getStore().getSnapshot());
  ipcMain.handle('budget:saveIncome', async (_event, income: number) => accountManager.getStore().saveIncome(Number(income)));
  ipcMain.handle('budget:saveMonthKey', async (_event, monthKey: string) => accountManager.getStore().saveMonthKey(monthKey));
  ipcMain.handle('budget:addFixedExpense', async (_event, expense) => accountManager.getStore().addFixedExpense(expense));
  ipcMain.handle('budget:toggleFixedExpense', async (_event, id: string, active: boolean) => accountManager.getStore().toggleFixedExpense(id, active));
  ipcMain.handle('budget:deleteFixedExpense', async (_event, id: string) => accountManager.getStore().deleteFixedExpense(id));
  ipcMain.handle('budget:addVariableExpense', async (_event, expense) => accountManager.getStore().addVariableExpense(expense));
  ipcMain.handle('budget:deleteVariableExpense', async (_event, id: string) => accountManager.getStore().deleteVariableExpense(id));
  ipcMain.handle('budget:addLoan', async (_event, loan) => accountManager.getStore().addLoan(loan));
  ipcMain.handle('budget:toggleLoan', async (_event, id: string, active: boolean) => accountManager.getStore().toggleLoan(id, active));
  ipcMain.handle('budget:deleteLoan', async (_event, id: string) => accountManager.getStore().deleteLoan(id));
  ipcMain.handle('budget:exportBackup', async () => accountManager.exportActive());
  ipcMain.handle('budget:importBackup', async (_event, backup: BackupFile) => accountManager.getStore().importBackup(backup));
  ipcMain.handle('budget:getDatabasePath', async () => accountManager.getStore().getDatabasePath());
  ipcMain.handle('app:installUpdate', () => {
    autoUpdater.quitAndInstall();
  });
  ipcMain.handle('app:checkForUpdates', () => {
    if (!app.isPackaged) {
      sendUpdateStatus({ state: 'not-available' });
      return;
    }

    autoUpdater.checkForUpdates().catch((error) => {
      sendUpdateStatus({ state: 'error', message: error instanceof Error ? error.message : String(error) });
    });
  });
  ipcMain.handle('budget:saveBackupToFile', async () => {
    const backup = await accountManager.exportActive();
    const result = await dialog.showSaveDialog({
      title: 'Export Finterest Backup',
      defaultPath: 'finterest-backup.json',
      filters: [{ name: 'Finterest Backup', extensions: ['json'] }],
    });

    if (result.canceled || !result.filePath) {
      return;
    }

    await fs.writeFile(result.filePath, JSON.stringify(backup, null, 2), 'utf8');
  });
  ipcMain.handle('budget:importBackupFromFile', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import Finterest Backup',
      properties: ['openFile'],
      filters: [{ name: 'Finterest Backup', extensions: ['json'] }],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const fileBuffer = await fs.readFile(result.filePaths[0], 'utf8');
    const backup = JSON.parse(fileBuffer) as BackupFile;
    return accountManager.getStore().importBackup(backup);
  });
}
