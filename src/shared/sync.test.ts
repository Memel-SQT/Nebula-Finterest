import { decideFileSync, isSyncManifest, mergeAccountRecords, MTIME_TOLERANCE_MS } from './sync';

describe('decideFileSync', () => {
  it('pushes when only the local copy exists, pulls when only the remote one does', () => {
    expect(decideFileSync(1000, null)).toBe('push');
    expect(decideFileSync(null, 1000)).toBe('pull');
    expect(decideFileSync(null, null)).toBe('none');
  });

  it('keeps the newer copy', () => {
    expect(decideFileSync(10_000, 10_000 + MTIME_TOLERANCE_MS + 1)).toBe('pull');
    expect(decideFileSync(10_000 + MTIME_TOLERANCE_MS + 1, 10_000)).toBe('push');
  });

  it('treats copies within the filesystem mtime precision as identical', () => {
    expect(decideFileSync(10_000, 11_999)).toBe('none');
    expect(decideFileSync(11_999, 10_000)).toBe('none');
  });
});

describe('mergeAccountRecords', () => {
  it('adds profiles created on another machine', () => {
    const result = mergeAccountRecords([{ id: 'a' }], [{ id: 'a' }, { id: 'b', updatedAt: 5 }], []);
    expect(result.records.map((record) => record.id)).toEqual(['a', 'b']);
    expect(result.changed).toBe(true);
  });

  it('keeps the most recently updated version of a profile', () => {
    const local = [{ id: 'a', name: 'old', updatedAt: 1 }];
    const remote = [{ id: 'a', name: 'new', updatedAt: 2 }];
    expect(mergeAccountRecords(local, remote, []).records[0].name).toBe('new');
    expect(mergeAccountRecords(remote, local, []).records[0].name).toBe('new');
  });

  it('treats records from before v0.1.36 (no updatedAt) as oldest', () => {
    const result = mergeAccountRecords([{ id: 'a', name: 'legacy' }], [{ id: 'a', name: 'renamed', updatedAt: 1 }], []);
    expect(result.records[0].name).toBe('renamed');
  });

  it('does not re-add a profile deleted elsewhere, and never deletes local data by itself', () => {
    expect(mergeAccountRecords([], [{ id: 'gone' }], ['gone']).records).toEqual([]);
    expect(mergeAccountRecords([{ id: 'gone' }], [], ['gone']).records).toEqual([{ id: 'gone' }]);
  });

  it('reports no change when nothing differs', () => {
    expect(mergeAccountRecords([{ id: 'a', updatedAt: 1 }], [{ id: 'a', updatedAt: 1 }], []).changed).toBe(false);
  });
});

describe('isSyncManifest', () => {
  it('recognizes only a sync manifest', () => {
    expect(isSyncManifest({ app: 'Finterest', kind: 'sync-manifest', version: 1, accounts: [], deletedIds: [] })).toBe(true);
    expect(isSyncManifest({ app: 'Finterest', version: 1, snapshot: {} })).toBe(false);
    expect(isSyncManifest(null)).toBe(false);
  });
});
