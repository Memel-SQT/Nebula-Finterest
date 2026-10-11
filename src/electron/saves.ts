import fs from 'node:fs/promises';
import path from 'node:path';
import { defaultSaveKeyFile, importRecoveryCode, isSealedSave, loadSaveKeyring, readSave, recoveryCode, sealFileInPlace, sealSave, type SaveKeyring } from '@nebula/link';

/**
 * Sealed saves (Nebula Hub ADR-040, Nebula Link spec § 19): every save Finterest writes outside
 * its own data (backups, exports, copies in the sync folder) is encrypted with the family's save
 * key, which Windows protects for this account. Older plain saves stay readable, and are sealed
 * where they are when this version starts (`sealFolder`).
 */
export const SAVE_APP_ID = 'nebula.finterest';

export type SaveKind = 'backup' | 'export' | 'sync-copy';

export interface SaveSealer {
  /** The sealed bytes of a save. */
  seal(plain: Uint8Array | string, kind: SaveKind): Promise<Buffer>;
  /** The plain bytes of a save, sealed or (older) plain; throws when a sealed one cannot be opened. */
  open(bytes: Uint8Array): Promise<Buffer>;
  /** Seals a plain save file where it is (keeps its date); false when it already is, or is unreadable. */
  sealInPlace(file: string, kind: SaveKind): Promise<boolean>;
}

/** The key file: a throwaway data folder (manual testing) gets its own, never the real one. */
export function saveKeyFile(env: NodeJS.ProcessEnv = process.env): string {
  return env.FINTEREST_USER_DATA_DIR ? path.join(env.FINTEREST_USER_DATA_DIR, 'save-key.json') : defaultSaveKeyFile();
}

export class FamilySaveKey implements SaveSealer {
  private keyring: Promise<SaveKeyring> | null = null;

  constructor(private readonly file: string = saveKeyFile()) {}

  private ring(): Promise<SaveKeyring> {
    this.keyring ??= loadSaveKeyring({ file: this.file }).catch((error) => {
      this.keyring = null;
      throw error;
    });
    return this.keyring;
  }

  async seal(plain: Uint8Array | string, kind: SaveKind): Promise<Buffer> {
    return sealSave(typeof plain === 'string' ? Buffer.from(plain, 'utf8') : Buffer.from(plain), await this.ring(), { app: SAVE_APP_ID, kind });
  }

  async open(bytes: Uint8Array): Promise<Buffer> {
    const buffer = Buffer.from(bytes);
    return isSealedSave(buffer) ? readSave(buffer, await this.ring()) : buffer;
  }

  async sealInPlace(file: string, kind: SaveKind): Promise<boolean> {
    return sealFileInPlace(file, await this.ring(), { app: SAVE_APP_ID, kind });
  }

  /** The recovery key (to open these saves on another computer), shown only on request. */
  async recoveryCode(): Promise<string> {
    return recoveryCode(await this.ring());
  }

  /** Adds another computer's key; false when the code is not a recovery key. */
  async importRecoveryCode(code: string): Promise<boolean> {
    const added = await importRecoveryCode(code, { file: this.file });
    if (added) this.keyring = null;
    return added;
  }
}

/**
 * Seals the plain saves of a folder that `accept` keeps (and of its sub-folders up to `depth`), where they are.
 * Returns how many were sealed; never throws (a file that cannot be sealed stays as it is).
 */
export async function sealFolder(sealer: SaveSealer, dir: string, kind: SaveKind, accept: (file: string) => boolean | Promise<boolean>, depth = 0): Promise<number> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  let sealed = 0;
  for (const entry of entries) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory() && depth > 0) sealed += await sealFolder(sealer, file, kind, accept, depth - 1);
    else if (entry.isFile() && (await accept(file)) && (await sealer.sealInPlace(file, kind).catch(() => false))) sealed += 1;
  }
  return sealed;
}
