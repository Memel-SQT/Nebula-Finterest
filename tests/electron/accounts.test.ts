/**
 * @jest-environment node
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

let mockUserData = '';
jest.mock('electron', () => ({ app: { getPath: () => mockUserData } }));

import { AccountManager } from '../../src/electron/accounts';

async function tempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), `finterest-${prefix}-`));
}

/** AccountManager reads userData when constructed, so each "machine" gets its own folder. */
function managerFor(userData: string): AccountManager {
  mockUserData = userData;
  return new AccountManager();
}

describe('AccountManager', () => {
  const cleanup: string[] = [];
  afterEach(async () => {
    await Promise.all(cleanup.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it('unlocks an account written by an older version (no updatedAt, no sync settings)', async () => {
    const userData = await tempDir('legacy');
    cleanup.push(userData);
    const pinSalt = 'abcdef0123456789';
    const pinHash = crypto.scryptSync('1234', pinSalt, 64).toString('hex');
    await fs.writeFile(path.join(userData, 'accounts.json'), JSON.stringify([{ id: 'old-id', name: 'Ancien', pinHash, pinSalt }]));

    const manager = managerFor(userData);
    await manager.initialize();
    expect(manager.list()).toEqual([{ id: 'old-id', name: 'Ancien', avatarUrl: undefined }]);
    await expect(manager.unlock('old-id', '0000')).rejects.toThrow('ERR_INVALID_CREDENTIALS');
    const snapshot = await manager.unlock('old-id', '1234');
    expect(snapshot.settings.income).toBe(0);
    expect(manager.getSyncStatus().state).toBe('disabled');
  });

  it('survives a corrupt accounts.json and a malformed PIN record', async () => {
    const userData = await tempDir('corrupt');
    cleanup.push(userData);
    await fs.writeFile(path.join(userData, 'accounts.json'), JSON.stringify([{ id: 'bad', name: 'x', pinHash: 'abcd', pinSalt: 'salt' }, 42, null]));
    const manager = managerFor(userData);
    await manager.initialize();
    expect(manager.list().map((account) => account.id)).toEqual(['bad']);
    await expect(manager.unlock('bad', '1234')).rejects.toThrow('ERR_INVALID_CREDENTIALS');
  });

  it('locks the PIN prompt after repeated failures', async () => {
    const userData = await tempDir('throttle');
    cleanup.push(userData);
    const manager = managerFor(userData);
    await manager.initialize();
    const account = await manager.create('Test', '1234');
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(manager.unlock(account.id, '9999')).rejects.toThrow('ERR_INVALID_CREDENTIALS');
    }
    await expect(manager.unlock(account.id, '1234')).rejects.toThrow('ERR_TOO_MANY_ATTEMPTS');
  });

  it('copies the profiles to the folder, and adds them elsewhere only on request (v0.1.37)', async () => {
    const machineA = await tempDir('machine-a');
    const machineB = await tempDir('machine-b');
    const shared = await tempDir('shared');
    cleanup.push(machineA, machineB, shared);

    // Machine A: create a profile, then turn on the copy.
    const a = managerFor(machineA);
    await a.initialize();
    const account = await a.create('Noa', '2468');
    await a.getStore().saveIncome(3210);
    await a.setSyncDirectory(shared);
    await a.getStore().addVariableExpense({ name: 'Billet de train', amount: 89, category: 'Transport', date: '2026-10-02' });
    expect(a.getSyncStatus().state).toBe('idle');

    const mirrored = await fs.readdir(path.join(shared, 'Nebula Finterest'));
    expect(mirrored).toEqual(expect.arrayContaining(['accounts-sync.json', `finterest-${account.id}.sqlite`]));

    // Machine B points at the same folder: nothing is added on its own, the profile is only offered.
    const b = managerFor(machineB);
    await b.initialize();
    await b.setSyncDirectory(shared);
    expect(b.list()).toEqual([]);
    expect(await b.listRestorable()).toEqual([{ id: account.id, name: 'Noa' }]);
    await b.restoreFromCopy([account.id]);
    expect(b.list().map((summary) => summary.name)).toEqual(['Noa']);
    expect(await b.listRestorable()).toEqual([]);
    const onB = await b.unlock(account.id, '2468');
    expect(onB.settings.income).toBe(3210);
    expect(onB.variableExpenses.map((expense) => expense.name)).toContain('Billet de train');
  });

  it('never replaces the local profile with a newer copy from the folder (v0.1.37)', async () => {
    const machineA = await tempDir('root-a');
    const machineB = await tempDir('root-b');
    const shared = await tempDir('root-shared');
    cleanup.push(machineA, machineB, shared);
    const a = managerFor(machineA);
    await a.initialize();
    const account = await a.create('Noa', '2468');
    await a.getStore().saveIncome(1000);
    await a.setSyncDirectory(shared);

    const b = managerFor(machineB);
    await b.initialize();
    await b.setSyncDirectory(shared);
    await b.restoreFromCopy([account.id]);
    await b.unlock(account.id, '2468');
    await b.renameActive('Renommé ailleurs');
    await b.getStore().saveIncome(4000);
    await b.getStore().flush();
    const future = new Date(Date.now() + 10_000);
    await fs.utimes(path.join(shared, 'Nebula Finterest', `finterest-${account.id}.sqlite`), future, future);

    a.lock();
    expect(await a.syncNow()).toBe(false);
    expect(a.list()[0].name).toBe('Noa');
    const onA = await a.unlock(account.id, '2468');
    expect(onA.settings.income).toBe(1000);
    // The local record (name, PIN) is the reference too: the other computer's rename never came back.
    expect(a.list().map((summary) => summary.name)).toEqual(['Noa']);
  });

  it('keeps the copy of a profile deleted here, so it can be added back (v0.1.37)', async () => {
    const userData = await tempDir('delete');
    const shared = await tempDir('delete-shared');
    cleanup.push(userData, shared);
    const manager = managerFor(userData);
    await manager.initialize();
    const account = await manager.create('Temporaire', '1357');
    await manager.setSyncDirectory(shared);
    await manager.delete(account.id, '1357');
    expect(manager.list()).toEqual([]);
    expect(await manager.listRestorable()).toEqual([{ id: account.id, name: 'Temporaire' }]);
    await manager.restoreFromCopy([account.id]);
    await expect(manager.unlock(account.id, '1357')).resolves.toBeDefined();
  });

  it('keeps working locally when the sync folder disappears', async () => {
    const userData = await tempDir('offline');
    const shared = await tempDir('gone');
    cleanup.push(userData, shared);
    const manager = managerFor(userData);
    await manager.initialize();
    await manager.create('Solo', '1357');
    await manager.setSyncDirectory(shared);
    await fs.rm(shared, { recursive: true, force: true });
    // Recreate as a file so writes into it fail even on systems that would recreate folders.
    await fs.writeFile(shared, 'not a folder');
    cleanup.push(shared);

    const snapshot = await manager.getStore().saveIncome(500);
    expect(snapshot.settings.income).toBe(500);
    expect(manager.getSyncStatus().state).toBe('error');
  });

  it('never syncs the guest session', async () => {
    const userData = await tempDir('guest');
    const shared = await tempDir('guest-shared');
    cleanup.push(userData, shared);
    const manager = managerFor(userData);
    await manager.initialize();
    await manager.setSyncDirectory(shared);
    await manager.enterGuestMode('Invité');
    await manager.getStore().saveIncome(10);
    const files = await fs.readdir(path.join(shared, 'Nebula Finterest'));
    expect(files.filter((file) => file.endsWith('.sqlite'))).toEqual([]);
  });
});
