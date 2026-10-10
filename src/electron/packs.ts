import path from 'node:path';
import { readAppearancePacks } from '@nebula/link';
import { packViewOf, type PackView } from '../shared/packs';

/**
 * Appearance packs shared by installed Nebula apps (Nebula Hub NEBULA_LINK.md § 18): read from the
 * family's shared folder, or next to a test-mode Hub's session file (`NEBULA_LINK_SESSION_FILE`).
 * Only valid packs whose owner is installed come back (the SDK checks both); never throws.
 */
export function packDirectory(env: NodeJS.ProcessEnv): string | undefined {
  return env.NEBULA_LINK_SESSION_FILE ? path.join(path.dirname(env.NEBULA_LINK_SESSION_FILE), 'appearance') : undefined;
}

function svgUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export function readPackViews(env: NodeJS.ProcessEnv): PackView[] {
  try {
    return readAppearancePacks({ directory: packDirectory(env) }).map((pack) => packViewOf(pack, svgUrl));
  } catch {
    return [];
  }
}

/** Native window colours of a pack theme, if one of the packs has it. */
export function packChrome(packs: readonly PackView[], themeId: string): { page: string; ink: string } | null {
  for (const pack of packs) {
    const theme = pack.themes.find((candidate) => candidate.id === themeId);
    if (theme) return theme.chrome;
  }
  return null;
}
