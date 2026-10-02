import fs from 'node:fs/promises';
import path from 'node:path';
import { extractBackupSnapshot } from '../shared/budget';
import type { PendingBackup } from '../shared/types';

/**
 * Backup files in the root folder `Documents\Nebula Finterest` (v0.1.37): where the uninstaller,
 * the exports and Nebula Hub write them, and where an import looks first. Only file names, dates
 * and profile names are read here; the content is imported by the store after the user confirms.
 */
export type BackupSummary = PendingBackup;

const pad = (value: number) => String(value).padStart(2, '0');

function stamp(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

/** `finterest-backup-2026-10-02_10-15-03.json`: sortable, never overwritten. */
export function backupFileName(now: Date): string {
  return `finterest-backup-${stamp(now)}.json`;
}

/** Keeps an earlier file of the same name, renamed with its own date (`<name>-<date>.json`). */
export async function rotateExisting(file: string): Promise<void> {
  let modified: Date;
  try {
    modified = (await fs.stat(file)).mtime;
  } catch {
    return;
  }
  const extension = path.extname(file);
  const target = `${file.slice(0, file.length - extension.length)}-${stamp(modified)}${extension}`;
  await fs.rename(file, target).catch(() => undefined);
}

/** Reads a backup's summary, or null when it is missing, too large or not a Finterest backup. */
export async function readBackupSummary(file: string, maxBytes: number): Promise<BackupSummary | null> {
  try {
    const stats = await fs.stat(file);
    if (!stats.isFile() || stats.size > maxBytes) return null;
    const parsed = JSON.parse((await fs.readFile(file, 'utf8')).replace(/^﻿/, '')) as Record<string, unknown>;
    if (!parsed || parsed.app !== 'Finterest' || parsed.version !== 1) return null;
    const accounts = Array.isArray(parsed.accounts)
      ? parsed.accounts.map((account) => (account && typeof account === 'object' ? String((account as Record<string, unknown>).name ?? '').trim() : '')).filter(Boolean)
      : parsed.account && typeof parsed.account === 'object' ? [String((parsed.account as Record<string, unknown>).name ?? '').trim()].filter(Boolean) : [];
    // At least one snapshot must be importable.
    const importable = accounts.some((name) => extractBackupSnapshot(parsed, name) !== null) || extractBackupSnapshot(parsed) !== null;
    if (!importable) return null;
    return { file, fileName: path.basename(file), exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null, accounts, modifiedAt: stats.mtime.toISOString() };
  } catch {
    return null;
  }
}

/** The most recent valid backup of the root folder, or null. */
export async function latestBackup(dir: string, maxBytes: number): Promise<BackupSummary | null> {
  let names: string[];
  try {
    names = (await fs.readdir(dir)).filter((name) => name.toLowerCase().endsWith('.json'));
  } catch {
    return null;
  }
  const dated = await Promise.all(names.map(async (name) => ({ name, mtime: await fs.stat(path.join(dir, name)).then((stats) => stats.mtimeMs, () => 0) })));
  for (const { name } of dated.sort((a, b) => b.mtime - a.mtime)) {
    const summary = await readBackupSummary(path.join(dir, name), maxBytes);
    if (summary) return summary;
  }
  return null;
}
