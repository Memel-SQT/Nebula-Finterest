import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { AccountManager } from './accounts';
import type { BackupFile } from '../shared/types';

let mainWindow: BrowserWindow | null = null;
const accountManager = new AccountManager();

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 700,
    backgroundColor: '#f4efe8',
    title: 'Finterest',
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
  registerIpcHandlers();
  await accountManager.initialize();
  await createWindow();

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

function registerIpcHandlers(): void {
  ipcMain.handle('account:list', () => accountManager.list());
  ipcMain.handle('account:create', async (_event, name: string, pin: string) => accountManager.create(name, pin));
  ipcMain.handle('account:unlock', async (_event, id: string, pin: string) => accountManager.unlock(id, pin));
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
  ipcMain.handle('budget:exportBackup', async () => accountManager.exportActive());
  ipcMain.handle('budget:importBackup', async (_event, backup: BackupFile) => accountManager.getStore().importBackup(backup));
  ipcMain.handle('budget:getDatabasePath', async () => accountManager.getStore().getDatabasePath());
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

    await import('node:fs/promises').then(async (fs) => {
      await fs.writeFile(result.filePath, JSON.stringify(backup, null, 2), 'utf8');
    });
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

    const fileBuffer = await import('node:fs/promises').then((fs) => fs.readFile(result.filePaths[0], 'utf8'));
    const backup = JSON.parse(fileBuffer) as BackupFile;
    return accountManager.getStore().importBackup(backup);
  });
}
