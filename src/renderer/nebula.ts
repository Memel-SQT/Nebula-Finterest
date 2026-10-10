import { useCallback, useState } from 'react';
import { parseAppearance, type Appearance } from './appearance';
import type { Language } from './i18n';
import { isLegacyTheme, type ResolvedTheme, type Theme } from './theme';
import { findPackTheme, type PackView } from '@shared/packs';

/**
 * Nebula Hub, renderer side (v0.1.37): the "Follow the Nebula appearance" choice and how the
 * appearance the Hub broadcasts (`AppearanceV1`) maps onto Finterest's own settings.
 */
const FOLLOW_KEY = 'finterest-follow-nebula';
const HUB_THEMES: Theme[] = ['nebula-dark', 'nebula-light', 'glass-dark', 'glass-light', 'system'];

/** On by default: following the Nebula appearance is what adopting the Hub is for; it can be turned off. */
export function useFollowNebula(): [boolean, (follow: boolean) => void] {
  const [follow, setFollowState] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(FOLLOW_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const setFollow = useCallback((next: boolean) => {
    setFollowState(next);
    try {
      window.localStorage.setItem(FOLLOW_KEY, String(next));
    } catch {
      // Not persisted this session; the choice still applies.
    }
  }, []);
  return [follow, setFollow];
}

/**
 * What to change for an appearance sent by the Hub. Every field goes through Finterest's own
 * parser (an unknown value never applies). An `old-*` theme chosen here stays: it is a local choice
 * the Hub never imposes, only the rest follows.
 */
export function nebulaAppearancePatch(payload: unknown, currentTheme: Theme | ResolvedTheme, packs: readonly PackView[] = []): { theme?: Theme; packTheme?: string | null; appearance: Appearance; language?: Language } {
  const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const appearance = parseAppearance(JSON.stringify(record));
  const language = record.language === 'fr' || record.language === 'en' ? record.language : undefined;
  // A theme of an installed appearance pack (Nebula Hub NEBULA_LINK.md § 18): applied over the
  // built-in theme, which stays as it is (the fallback when the pack goes).
  if (typeof record.theme === 'string' && findPackTheme(packs, record.theme)) return { packTheme: record.theme, appearance, language };
  const theme = HUB_THEMES.includes(record.theme as Theme) && !(currentTheme !== 'system' && isLegacyTheme(currentTheme)) ? (record.theme as Theme) : undefined;
  return { theme, ...(theme ? { packTheme: null } : {}), appearance, language };
}

/** The window shown inside Nebula Hub (Hub mode), or recreated when leaving it: no splash then. */
export function windowMode(search: string): 'docked' | 'restored' | null {
  const mode = new URLSearchParams(search).get('mode');
  return mode === 'docked' || mode === 'restored' ? mode : null;
}
