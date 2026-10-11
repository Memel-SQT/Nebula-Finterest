/**
 * @jest-environment node
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { isSealedSave, loadSaveKeyring, readSave, sealFileInPlace, sealSave } from '@nebula/link';
import { readBackupSummary } from '../../src/electron/backups';
import { saveKeyFile, sealFolder, type SaveSealer } from '../../src/electron/saves';
import { SyncManager } from '../../src/electron/sync';
import { createEmptySnapshot } from '../../src/shared/budget';

let dir = '';
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'finterest-sealed-'));
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

/** The family key with a stand-in for Windows protection (the mask is "the account"). */
async function sealer(keyName = 'key.json', mask = 0x5a): Promise<SaveSealer> {
  const flip = async (data: Buffer) => Buffer.from(data.map((byte) => byte ^ mask));
  const ring = await loadSaveKeyring({ file: path.join(dir, keyName), protector: { protect: flip, unprotect: flip } });
  return {
    seal: async (plain, kind) => sealSave(Buffer.from(plain), ring, { app: 'nebula.finterest', kind }),
    open: async (bytes) => readSave(Buffer.from(bytes), ring),
    sealInPlace: async (file, kind) => sealFileInPlace(file, ring, { app: 'nebula.finterest', kind }),
  };
}

const backup = JSON.stringify({ app: 'Finterest', version: 1, exportedAt: '2026-10-11T08:00:00.000Z', accounts: [{ name: 'Noa', snapshot: createEmptySnapshot() }] });
const MAX = 50 * 1024 * 1024;

describe('sealed saves (Nebula Hub ADR-040)', () => {
  it('reads a sealed backup only with the key, and an older plain one as before', async () => {
    const seal = await sealer();
    const sealedFile = path.join(dir, 'sealed.json');
    const plainFile = path.join(dir, 'plain.json');
    await fs.writeFile(sealedFile, await seal.seal(backup, 'backup'));
    await fs.writeFile(plainFile, backup);
    expect((await fs.readFile(sealedFile, 'utf8')).includes('Noa')).toBe(false);
    expect(await readBackupSummary(sealedFile, MAX, seal.open)).toMatchObject({ accounts: ['Noa'] });
    expect(await readBackupSummary(sealedFile, MAX)).toBeNull();
    expect(await readBackupSummary(plainFile, MAX, seal.open)).toMatchObject({ accounts: ['Noa'] });
    const elsewhere = await sealer('other.json', 0x33);
    expect(await readBackupSummary(sealedFile, MAX, elsewhere.open)).toBeNull();
  });

  it('seals the old plain backups where they are, once, keeping their date', async () => {
    const seal = await sealer();
    const old = path.join(dir, 'finterest-backup-2026-10-01_10-00-00.json');
    await fs.writeFile(old, backup);
    await fs.writeFile(path.join(dir, 'notes.txt'), 'not a backup');
    const date = new Date('2026-10-01T10:00:00Z');
    await fs.utimes(old, date, date);
    const accept = async (file: string) => file.endsWith('.json') && (await readBackupSummary(file, MAX)) !== null;
    expect(await sealFolder(seal, dir, 'backup', accept)).toBe(1);
    expect(isSealedSave(await fs.readFile(old))).toBe(true);
    expect((await fs.stat(old)).mtime.toISOString()).toBe(date.toISOString());
    expect(await fs.readFile(path.join(dir, 'notes.txt'), 'utf8')).toBe('not a backup');
    expect(await sealFolder(seal, dir, 'backup', accept)).toBe(0);
  });

  it('keeps a throwaway data folder on its own key file', () => {
    expect(saveKeyFile({ FINTEREST_USER_DATA_DIR: path.join(dir, 'data') })).toBe(path.join(dir, 'data', 'save-key.json'));
  });
});

describe('the sync folder holds sealed copies only (ADR-040)', () => {
  const record: { id: string; updatedAt: number; name: string } = { id: 'p1', name: 'Noa', updatedAt: 1_760_000_000_000 };

  async function setUp(seal: SaveSealer | null) {
    const sync = new SyncManager(path.join(dir, 'sync-settings.json'), () => undefined, seal);
    const folder = path.join(dir, 'cloud');
    await sync.setDirectory(folder);
    return { sync, copies: path.join(folder, 'Nebula Finterest') };
  }

  it('seals the manifest and the databases it copies, and opens them back', async () => {
    const seal = await sealer();
    const { sync, copies } = await setUp(seal);
    await sync.pushManifest([record]);
    const manifest = await fs.readFile(path.join(copies, 'accounts-sync.json'));
    expect(isSealedSave(manifest)).toBe(true);
    expect(manifest.toString('utf8').includes('Noa')).toBe(false);
    expect((await sync.readManifest())?.accounts).toEqual([record]);

    const local = path.join(dir, 'p1.sqlite');
    await fs.writeFile(local, 'database bytes');
    expect(await sync.pushFile(local, 'p1.sqlite')).toBe('push');
    expect(isSealedSave(await fs.readFile(path.join(copies, 'p1.sqlite')))).toBe(true);
    expect(await sync.pushFile(local, 'p1.sqlite')).toBe('none');

    await sync.pushData(local, 'p1.sqlite', Buffer.from('newer bytes'));
    const restored = path.join(dir, 'restored', 'p1.sqlite');
    expect(await sync.pullFile('p1.sqlite', restored)).toBe(true);
    expect(await fs.readFile(restored, 'utf8')).toBe('newer bytes');
  });

  it('seals the plain copies an older version left in the folder, keeping them in step', async () => {
    const plain = await setUp(null);
    const local = path.join(dir, 'p1.sqlite');
    await fs.writeFile(local, 'database bytes');
    await plain.sync.pushManifest([record]);
    await plain.sync.pushFile(local, 'p1.sqlite');
    await fs.mkdir(path.join(plain.copies, 'avatars'), { recursive: true });
    await fs.writeFile(path.join(plain.copies, 'avatars', 'p1.png'), 'png bytes');

    const seal = await sealer();
    const sync = new SyncManager(path.join(dir, 'sync-settings.json'), () => undefined, seal);
    await sync.load();
    for (const name of ['accounts-sync.json', 'p1.sqlite', path.join('avatars', 'p1.png')]) {
      expect(isSealedSave(await fs.readFile(path.join(plain.copies, name)))).toBe(true);
    }
    expect((await sync.readManifest())?.accounts).toEqual([record]);
    // Same date as the local file: nothing to copy again.
    expect(await sync.pushFile(local, 'p1.sqlite')).toBe('none');
  });

  it('never overwrites a manifest sealed with another computer’s key', async () => {
    const elsewhere = await setUp(await sealer('other.json', 0x33));
    await elsewhere.sync.pushManifest([{ ...record, id: 'far', name: 'Sam' } as typeof record]);
    const before = await fs.readFile(path.join(elsewhere.copies, 'accounts-sync.json'));

    const statuses: string[] = [];
    const sync = new SyncManager(path.join(dir, 'sync-settings.json'), (status) => statuses.push(status.message ?? status.state), await sealer());
    await sync.load();
    await sync.pushManifest([record]);
    expect(statuses).toContain('ERR_SYNC_KEY_UNKNOWN');
    expect((await fs.readFile(path.join(elsewhere.copies, 'accounts-sync.json'))).equals(before)).toBe(true);
    expect(await sync.listRestorable([], (id) => `${id}.sqlite`)).toEqual([]);
  });
});
