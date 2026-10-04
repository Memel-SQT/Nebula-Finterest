import path from 'node:path';
import fs from 'node:fs/promises';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { isNewsDeepLink } from '../shared/nebula';
import { autoUpdater } from 'electron-updater';
import { AccountManager } from './accounts';
import { backupFileName, readBackupSummary, latestBackup, rotateExisting, type BackupSummary } from './backups';
import { NebulaIntegration } from './nebula';
import type { SyncStatus, UpdateStatus } from '../shared/types';

// The app was renamed to "Nebula Finterest" in v0.1.35. Electron derives userData from
// productName, so without this pin every existing install would silently start from an
// empty "Nebula Finterest" folder and appear to have lost its accounts. Must run before
// AccountManager is constructed, since BudgetStore resolves its path from userData.
// FINTEREST_USER_DATA_DIR lets development and manual testing run against a throwaway
// folder instead of the real accounts; it is never set in a packaged install.
app.setPath('userData', process.env.FINTEREST_USER_DATA_DIR || path.join(app.getPath('appData'), 'Finterest'));

const BACKUP_BEFORE_UNINSTALL_FLAG = '--backup-before-uninstall=';
/** Opens the import screen on a backup file (Nebula Hub, or a double click): always confirmed in the app. */
const IMPORT_BACKUP_FLAG = '--import-backup=';
const MAX_BACKUP_FILE_BYTES = 50 * 1024 * 1024;
const isBackupRun = process.argv.some((arg) => arg.startsWith(BACKUP_BEFORE_UNINSTALL_FLAG));

let mainWindow: BrowserWindow | null = null;
const accountManager = new AccountManager((status) => sendSyncStatus(status));
/** A backup waiting for the user's confirmation (from `--import-backup=` or "import the latest"). */
let pendingImport: BackupSummary | null = null;

/** The root folder of every backup: the uninstaller's, the exports', Nebula Hub's. Read first on import. */
function backupRoot(): string {
  // A throwaway data folder (manual testing) gets its own backups folder too: never the real one.
  if (process.env.FINTEREST_USER_DATA_DIR) return path.join(process.env.FINTEREST_USER_DATA_DIR, 'Documents', 'Nebula Finterest');
  return path.join(app.getPath('documents'), 'Nebula Finterest');
}

const nebula = new NebulaIntegration({
  appVersion: app.getVersion(),
  // Packaged: copied to resources by electron-builder (extraResources), where Nebula Hub reads it
  // too. Development: the repository root (main.js runs from dist/electron).
  manifestPath: app.isPackaged ? path.join(process.resourcesPath, 'nebula.app.json') : path.join(__dirname, '../../nebula.app.json'),
  settingsPath: path.join(app.getPath('userData'), 'nebula-hub.json'),
  openSnapshot: async () => (accountManager.getActive() && !accountManager.isActiveGuest() ? accountManager.getStore().getSnapshot() : null),
  openProfileId: () => (accountManager.isActiveGuest() ? null : accountManager.getActive()?.id ?? null),
  send: (channel, payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
  },
  focusWindow: () => focusWindow(),
  onDock: (payload) => void applyDock(payload),
  windowVisible: () => Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() && !mainWindow.isMinimized()),
});

// Two instances would each hold the database in memory and overwrite each other's file on
// every save. The headless uninstall backup only reads, so it is exempt.
if (!isBackupRun && !app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    focusWindow();
    nebula.routeArgv(argv);
    void offerImportFromArgv(argv);
  });

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
    await nebula.start().catch(() => undefined);
    nebula.routeArgv(process.argv);
    await offerImportFromArgv(process.argv);
    // The Hub may install the updates itself (user's choice): give its presence a moment to arrive.
    if (nebula.state().updatesByHub) await nebula.waitForHub();
    setUpAutoUpdater();

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
      }
    });
  });
}

function focusWindow(): void {
  if (!mainWindow) return;
  if (dock.docked) {
    // In the Hub mode the Hub decides where the window is; it only comes to the front.
    mainWindow.moveTop();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

type Bounds = { x: number; y: number; width: number; height: number };

/**
 * Page and ink colors of each theme (styles.css token blocks), for the native window chrome: the
 * frameless window keeps Windows' own minimize / maximize / close buttons (titleBarOverlay), tinted
 * to match. The renderer only ever sends a theme name, validated against this table.
 */
const WINDOW_CHROME: Record<string, { page: string; ink: string }> = {
  'nebula-dark': { page: '#0a0a0f', ink: '#f1f1f6' },
  'nebula-light': { page: '#f4f3fb', ink: '#18172b' },
  'glass-dark': { page: '#06060f', ink: '#f5f4ff' },
  'glass-light': { page: '#e9ebf8', ink: '#17162a' },
  'old-dark': { page: '#05070a', ink: '#edf1ef' },
  'old-light': { page: '#eceeea', ink: '#12171a' },
};
/** Height of the drag strip (.titlebar-drag in styles.css) and of the window controls. */
const TITLE_BAR_HEIGHT = 36;
let windowTheme = 'nebula-dark';

function titleBarOverlay(): Electron.TitleBarOverlayOptions {
  // Transparent: the app's own background (and its animated glow) shows behind the controls.
  return { color: 'rgba(0, 0, 0, 0)', symbolColor: WINDOW_CHROME[windowTheme].ink, height: TITLE_BAR_HEIGHT };
}

function setWindowTheme(theme: unknown): void {
  if (typeof theme !== 'string' || !Object.hasOwn(WINDOW_CHROME, theme)) return;
  windowTheme = theme;
  const window = mainWindow;
  if (!window || window.isDestroyed()) return;
  window.setBackgroundColor(WINDOW_CHROME[theme].page);
  // The docked window has no frame at all, so no controls to tint.
  if (!dock.docked) window.setTitleBarOverlay(titleBarOverlay());
}

/**
 * The Hub mode (Nebula Hub, `nebula.hub.dock`): the window becomes frameless, off the taskbar, laid
 * exactly where the Hub says, shown without taking the focus. Electron cannot remove the frame of
 * an open window, so the window is recreated (the open profile stays open in the main process).
 * Any release, loss of the Hub, or "Detach" in the app brings the normal window back.
 */
const dock: { docked: boolean; normalBounds: Bounds | null; busy: Promise<void> } = { docked: false, normalBounds: null, busy: Promise.resolve() };

function isDockPayload(value: unknown): value is { state: 'released' } | { state: 'docked'; visible: boolean; raise: boolean; bounds: Bounds } {
  const record = value as Record<string, unknown> | null;
  if (!record || typeof record !== 'object') return false;
  if (record.state === 'released') return true;
  const bounds = record.bounds as Record<string, unknown> | undefined;
  return record.state === 'docked' && typeof record.visible === 'boolean' && typeof record.raise === 'boolean' && Boolean(bounds)
    && ['x', 'y', 'width', 'height'].every((key) => Number.isInteger(bounds![key]));
}

function applyDock(payload: unknown): Promise<void> {
  if (!isDockPayload(payload)) return dock.busy;
  dock.busy = dock.busy.then(async () => {
    if (payload.state === 'released') {
      await undock();
      return;
    }
    if (!dock.docked) {
      dock.normalBounds = mainWindow && !mainWindow.isDestroyed() ? mainWindow.getBounds() : null;
      dock.docked = true;
      await replaceWindow({ docked: true, bounds: payload.bounds });
    }
    const window = mainWindow;
    if (!window || window.isDestroyed()) return;
    if (!payload.visible) {
      window.hide();
      return;
    }
    window.setBounds(payload.bounds);
    if (!window.isVisible()) window.showInactive();
    if (payload.raise) window.moveTop();
  }).catch(() => undefined);
  return dock.busy;
}

async function undock(): Promise<void> {
  if (!dock.docked) return;
  dock.docked = false;
  await replaceWindow({ docked: false, bounds: dock.normalBounds ?? undefined });
}

/** Creates the new window first, then closes the old one (the app never has zero window). */
async function replaceWindow(options: { docked: boolean; bounds?: Bounds }): Promise<void> {
  const previous = mainWindow;
  await createWindow({ ...options, restored: true });
  if (previous && !previous.isDestroyed()) previous.destroy();
  if (!options.docked) focusWindow();
}

async function createWindow(options: { docked?: boolean; bounds?: Bounds; restored?: boolean } = {}): Promise<void> {
  const docked = options.docked === true;
  const window = new BrowserWindow({
    width: options.bounds?.width ?? 1280,
    height: options.bounds?.height ?? 860,
    ...(options.bounds ? { x: options.bounds.x, y: options.bounds.y } : {}),
    minWidth: docked ? 320 : 960,
    minHeight: docked ? 240 : 700,
    // Normal: no native frame, a 36 px drag strip drawn by the app, Windows' controls on top.
    // Docked: no frame and no controls at all (the Hub owns the area).
    ...(docked ? { frame: false } : { titleBarStyle: 'hidden' as const, titleBarOverlay: titleBarOverlay() }),
    skipTaskbar: docked,
    // Docked: exactly the Hub's area. No invisible resize border (thickFrame), and the Hub alone
    // moves and sizes it.
    ...(docked ? { thickFrame: false, resizable: false, movable: false, minimizable: false, maximizable: false, fullscreenable: false } : {}),
    show: false,
    backgroundColor: WINDOW_CHROME[windowTheme].page,
    title: 'Nebula Finterest',
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // The preload only uses contextBridge + ipcRenderer, both available in a sandboxed preload.
      sandbox: true,
    },
  });

  // The renderer is a single local page: never let it navigate away or open new windows.
  // External links (if any ever appear) go to the user's browser instead.
  mainWindow = window;
  window.once('ready-to-show', () => {
    if (docked) window.showInactive();
    else window.show();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) {
      event.preventDefault();
    }
  });

  // A recreated window (Hub mode on or off) skips the splash; the docked one shows a "Detach" bar.
  const mode = docked ? 'docked' : options.restored ? 'restored' : '';
  const devUrl = process.env.VITE_DEV_SERVER_URL ?? (!app.isPackaged ? 'http://127.0.0.1:5173' : undefined);
  if (devUrl) {
    await window.loadURL(mode ? `${devUrl}?mode=${mode}` : devUrl);
    if (!process.env.FINTEREST_NO_DEVTOOLS && !docked) {
      window.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    await window.loadFile(path.join(__dirname, '../renderer/index.html'), mode ? { query: { mode } } : undefined);
  }

  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
  });
}

app.on('before-quit', () => nebula.dispose());

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Invoked by the Windows NSIS uninstaller (build/installer.nsh) and by Nebula Hub before an update,
 * a repair or an uninstall, so local accounts are never lost silently. An earlier file with the same
 * name (the uninstaller always uses one name) is kept, renamed with its date.
 */
async function runPreUninstallBackup(backupPath: string): Promise<void> {
  try {
    // Set the earlier file aside first: if this backup fails, no file is there, and the
    // uninstaller can tell (and ask the user) instead of trusting an old one.
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await rotateExisting(backupPath);
    await accountManager.initialize({ withSync: false });
    const backup = await accountManager.exportAllForBackup();
    await fs.writeFile(backupPath, JSON.stringify(backup, null, 2), 'utf8');
  } catch {
    // Best-effort safety net: never block or fail the uninstall over a backup error.
  }
}

/** `--import-backup=<file>`: checks the file and asks the renderer to confirm (never a silent import). */
async function offerImportFromArgv(argv: readonly string[]): Promise<void> {
  const flag = argv.find((arg) => arg.startsWith(IMPORT_BACKUP_FLAG));
  if (!flag) return;
  const summary = await readBackupSummary(flag.slice(IMPORT_BACKUP_FLAG.length), MAX_BACKUP_FILE_BYTES);
  if (!summary) return;
  pendingImport = summary;
  // The renderer may not be listening yet: it also asks for the pending import when it starts.
  mainWindow?.webContents.send('backup:pending', pendingImport);
}

function sendUpdateStatus(status: UpdateStatus): void {
  mainWindow?.webContents.send('update:status', status);
}

function sendSyncStatus(status: SyncStatus): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('sync:status', status);
  }
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

async function readBackupFile(filePath: string): Promise<unknown> {
  const stats = await fs.stat(filePath);
  if (stats.size > MAX_BACKUP_FILE_BYTES) {
    throw new Error('ERR_INVALID_BACKUP');
  }
  try {
    // Strip a UTF-8 BOM: files re-saved with Windows Notepad start with one and JSON.parse rejects it.
    return JSON.parse((await fs.readFile(filePath, 'utf8')).replace(/^﻿/, ''));
  } catch {
    throw new Error('ERR_INVALID_BACKUP');
  }
}

function dialogParent(): BrowserWindow | undefined {
  return mainWindow ?? undefined;
}

function registerIpcHandlers(): void {
  ipcMain.handle('account:list', () => accountManager.list());
  ipcMain.handle('account:create', async (_event, name: string, pin: string) => {
    const created = await accountManager.create(name, pin);
    void nebula.checkDebits();
    return created;
  });
  ipcMain.handle('account:unlock', async (_event, id: string, pin: string) => {
    const snapshot = await accountManager.unlock(id, pin);
    void nebula.checkDebits();
    return snapshot;
  });
  ipcMain.handle('account:guest', async (_event, name: string) => accountManager.enterGuestMode(String(name ?? '')));
  ipcMain.handle('account:delete', async (_event, id: string, pin: string) => accountManager.delete(id, pin));
  ipcMain.handle('account:rename', async (_event, name: string) => accountManager.renameActive(name));
  ipcMain.handle('account:chooseAvatar', async () => {
    const options: Electron.OpenDialogOptions = {
      title: 'Choisir une photo de profil',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
    };
    const parent = dialogParent();
    const result = parent ? await dialog.showOpenDialog(parent, options) : await dialog.showOpenDialog(options);

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return accountManager.setActiveAvatar(result.filePaths[0]);
  });
  ipcMain.handle('account:lock', () => {
    nebula.clearNews();
    return accountManager.lock();
  });
  ipcMain.handle('account:active', () => accountManager.getActive());
  ipcMain.handle('budget:getSnapshot', async () => accountManager.getStore().getSnapshot());
  ipcMain.handle('budget:saveIncome', async (_event, income: number) => accountManager.getStore().saveIncome(Number(income)));
  ipcMain.handle('budget:saveMonthKey', async (_event, monthKey: string) => accountManager.getStore().saveMonthKey(monthKey));
  ipcMain.handle('budget:addFixedExpense', async (_event, expense) => accountManager.getStore().addFixedExpense(expense));
  ipcMain.handle('budget:toggleFixedExpense', async (_event, id: string, active: boolean) => accountManager.getStore().toggleFixedExpense(id, active));
  ipcMain.handle('budget:deleteFixedExpense', async (_event, id: string) => accountManager.getStore().deleteFixedExpense(id));
  ipcMain.handle('budget:addVariableExpense', async (_event, expense) => accountManager.getStore().addVariableExpense(expense));
  ipcMain.handle('budget:deleteVariableExpense', async (_event, id: string) => accountManager.getStore().deleteVariableExpense(id));
  // Budgets, sub-envelopes and pots (v0.1.40): the store validates every field.
  ipcMain.handle('budget:saveBudget', async (_event, budget) => accountManager.getStore().saveBudget(budget));
  ipcMain.handle('budget:deleteBudget', async (_event, id: string) => accountManager.getStore().deleteBudget(String(id)));
  ipcMain.handle('budget:saveWallet', async (_event, wallet) => accountManager.getStore().saveWallet(wallet));
  ipcMain.handle('budget:deleteWallet', async (_event, id: string) => accountManager.getStore().deleteWallet(String(id)));
  ipcMain.handle('budget:addWalletMovement', async (_event, movement) => accountManager.getStore().addWalletMovement(movement));
  ipcMain.handle('budget:deleteWalletMovement', async (_event, id: string) => accountManager.getStore().deleteWalletMovement(String(id)));
  ipcMain.handle('budget:addLoan', async (_event, loan) => accountManager.getStore().addLoan(loan));
  ipcMain.handle('budget:toggleLoan', async (_event, id: string, active: boolean) => accountManager.getStore().toggleLoan(id, active));
  ipcMain.handle('budget:deleteLoan', async (_event, id: string) => accountManager.getStore().deleteLoan(id));
  ipcMain.handle('budget:exportBackup', async () => accountManager.exportActive());
  ipcMain.handle('budget:importBackup', async (_event, backup: unknown) => accountManager.getStore().importBackup(backup, accountManager.getActiveName()));
  ipcMain.handle('budget:getDatabasePath', async () => accountManager.getStore().getDatabasePath());
  ipcMain.handle('app:setWindowTheme', (_event, theme: unknown) => setWindowTheme(theme));
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
    // Saved by default in the root folder (read first on import); any other place stays possible.
    await fs.mkdir(backupRoot(), { recursive: true }).catch(() => undefined);
    const options: Electron.SaveDialogOptions = {
      title: 'Exporter une sauvegarde Nebula Finterest',
      defaultPath: path.join(backupRoot(), backupFileName(new Date())),
      filters: [{ name: 'Finterest Backup', extensions: ['json'] }],
    };
    const parent = dialogParent();
    const result = parent ? await dialog.showSaveDialog(parent, options) : await dialog.showSaveDialog(options);

    if (result.canceled || !result.filePath) {
      return;
    }

    await fs.writeFile(result.filePath, JSON.stringify(backup, null, 2), 'utf8');
  });
  ipcMain.handle('budget:importBackupFromFile', async () => {
    const options: Electron.OpenDialogOptions = {
      title: 'Importer une sauvegarde Nebula Finterest',
      defaultPath: backupRoot(),
      properties: ['openFile'],
      filters: [{ name: 'Finterest Backup', extensions: ['json'] }],
    };
    const parent = dialogParent();
    const result = parent ? await dialog.showOpenDialog(parent, options) : await dialog.showOpenDialog(options);

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const backup = await readBackupFile(result.filePaths[0]);
    return accountManager.getStore().importBackup(backup, accountManager.getActiveName());
  });

  ipcMain.handle('sync:getStatus', () => accountManager.getSyncStatus());
  ipcMain.handle('sync:listRestorable', async () => accountManager.listRestorable());
  ipcMain.handle('sync:restore', async (_event, ids: unknown) => accountManager.restoreFromCopy(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []));

  // Backups waiting for a confirmation (`--import-backup=`, or the latest one after a reinstall).
  ipcMain.handle('backup:getPending', () => pendingImport);
  ipcMain.handle('backup:offerLatest', async () => {
    pendingImport = await latestBackup(backupRoot(), MAX_BACKUP_FILE_BYTES);
    return pendingImport;
  });
  ipcMain.handle('backup:dismissPending', () => {
    pendingImport = null;
  });
  ipcMain.handle('backup:importPending', async (_event, accountName: unknown) => {
    if (!pendingImport) throw new Error('ERR_INVALID_BACKUP');
    const backup = await readBackupFile(pendingImport.file);
    const source = typeof accountName === 'string' && pendingImport.accounts.includes(accountName) ? accountName : accountManager.getActiveName();
    const snapshot = await accountManager.getStore().importBackup(backup, source);
    pendingImport = null;
    return snapshot;
  });

  // Nebula Hub (Nebula Link): state, updates by the Hub, the "Nebula apps" button, Hub mode.
  ipcMain.handle('nebula:getState', () => nebula.state());
  ipcMain.handle('nebula:setUpdatesByHub', async (_event, enabled: unknown) => {
    await nebula.setUpdatesByHub(enabled === true);
    return nebula.state();
  });
  ipcMain.handle('nebula:openHub', async () => {
    // The nebula:// protocol is registered by an installed Nebula Hub; without it, its download page.
    if (app.getApplicationNameForProtocol('nebula://')) {
      await shell.openExternal('nebula://hub/');
      return 'opened';
    }
    await shell.openExternal('https://github.com/Memel-SQT/Nebula-Hub/releases');
    return 'not-installed';
  });
  // Nebula News' "Learn" card (news.finance.today): the main process asks, checks and caches it.
  ipcMain.handle('nebula:getFinanceNews', () => nebula.financeNews());
  ipcMain.handle('nebula:setNewsFinance', async (_event, enabled: unknown) => {
    await nebula.setNewsFinance(enabled === true);
    return nebula.state();
  });
  ipcMain.handle('nebula:openNewsLink', async (_event, deepLink: unknown) => {
    // Re-checked here: only a nebula://news/ link, and only through the protocol Nebula Hub registers.
    if (!isNewsDeepLink(deepLink) || !app.getApplicationNameForProtocol('nebula://')) return false;
    await shell.openExternal(deepLink);
    return true;
  });
  ipcMain.handle('nebula:isDocked', () => dock.docked);
  ipcMain.handle('nebula:detach', async () => {
    // Leaving the Hub mode from the app: stop listening (the Hub forgets the app), go back to the
    // normal window, then listen again so the Hub mode can be chosen later.
    nebula.pauseDock();
    await undock();
    setTimeout(() => nebula.resumeDock(), 1500);
  });
  ipcMain.handle('sync:chooseDirectory', async () => {
    const options: Electron.OpenDialogOptions = {
      title: 'Choisir le dossier de synchronisation',
      properties: ['openDirectory', 'createDirectory'],
    };
    const parent = dialogParent();
    const result = parent ? await dialog.showOpenDialog(parent, options) : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) {
      return { status: accountManager.getSyncStatus(), reloaded: false };
    }
    const status = await accountManager.setSyncDirectory(result.filePaths[0]);
    return { status, reloaded: true };
  });
  ipcMain.handle('sync:disable', async () => accountManager.setSyncDirectory(null));
  ipcMain.handle('sync:now', async () => {
    const reloaded = await accountManager.syncNow();
    return { status: accountManager.getSyncStatus(), reloaded };
  });
}
