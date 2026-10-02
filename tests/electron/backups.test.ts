/**
 * @jest-environment node
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { backupFileName, latestBackup, readBackupSummary, rotateExisting } from '../../src/electron/backups';
import { createEmptySnapshot } from '../../src/shared/budget';

const MAX = 50 * 1024 * 1024;
let dir = '';

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'finterest-backups-'));
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

const single = (name: string) => JSON.stringify({ app: 'Finterest', version: 1, exportedAt: '2026-10-01T10:00:00.000Z', account: { name, pinHash: 'x', pinSalt: 'y' }, snapshot: createEmptySnapshot() });
const full = (...names: string[]) => JSON.stringify({ app: 'Finterest', version: 1, exportedAt: '2026-10-02T08:00:00.000Z', accounts: names.map((name) => ({ name, snapshot: createEmptySnapshot() })) });

describe('backups in Documents\\Nebula Finterest (v0.1.37)', () => {
  it('names exports by date', () => {
    expect(backupFileName(new Date(2026, 9, 2, 9, 5, 7))).toBe('finterest-backup-2026-10-02_09-05-07.json');
  });

  it('keeps an earlier uninstall backup instead of overwriting it', async () => {
    const file = path.join(dir, 'finterest-uninstall-backup.json');
    await fs.writeFile(file, full('Noa'));
    await rotateExisting(file);
    const names = await fs.readdir(dir);
    expect(names).toHaveLength(1);
    expect(names[0]).toMatch(/^finterest-uninstall-backup-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/);
    await expect(rotateExisting(path.join(dir, 'missing.json'))).resolves.toBeUndefined();
  });

  it('summarizes a backup (profiles, date) and refuses anything else', async () => {
    await fs.writeFile(path.join(dir, 'one.json'), single('Noa'));
    await fs.writeFile(path.join(dir, 'all.json'), full('Noa', 'Sam'));
    await fs.writeFile(path.join(dir, 'other.json'), JSON.stringify({ app: 'Other', version: 1 }));
    await fs.writeFile(path.join(dir, 'broken.json'), '{ nope');
    expect(await readBackupSummary(path.join(dir, 'one.json'), MAX)).toMatchObject({ fileName: 'one.json', accounts: ['Noa'], exportedAt: '2026-10-01T10:00:00.000Z' });
    expect(await readBackupSummary(path.join(dir, 'all.json'), MAX)).toMatchObject({ accounts: ['Noa', 'Sam'] });
    expect(await readBackupSummary(path.join(dir, 'other.json'), MAX)).toBeNull();
    expect(await readBackupSummary(path.join(dir, 'broken.json'), MAX)).toBeNull();
    expect(await readBackupSummary(path.join(dir, 'one.json'), 10)).toBeNull();
    expect(await readBackupSummary(path.join(dir, 'absent.json'), MAX)).toBeNull();
  });

  it('finds the most recent valid backup of the root folder', async () => {
    await fs.writeFile(path.join(dir, 'old.json'), single('Ancien'));
    await fs.utimes(path.join(dir, 'old.json'), new Date(2026, 0, 1), new Date(2026, 0, 1));
    await fs.writeFile(path.join(dir, 'recent.json'), full('Noa'));
    await fs.writeFile(path.join(dir, 'newest-broken.json'), 'x');
    expect(await latestBackup(dir, MAX)).toMatchObject({ fileName: 'recent.json' });
    expect(await latestBackup(path.join(dir, 'missing'), MAX)).toBeNull();
  });
});
