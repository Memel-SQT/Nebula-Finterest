import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { packBaseTheme, type ActivePack, type PackView } from '@shared/packs';
import type { Appearance } from './appearance';
import type { ResolvedTheme } from './theme';

/**
 * Appearance packs in the renderer (Nebula Hub NEBULA_LINK.md § 18): the packs the main process
 * read, the pack theme the user chose (kept apart from the built-in theme, which stays the
 * fallback), and the theme drawn over the built-in one of its scheme.
 */
const PACK_THEME_KEY = 'finterest-pack-theme';

export function useAppearancePacks(): PackView[] {
  const [packs, setPacks] = useState<PackView[]>([]);
  useEffect(() => {
    let active = true;
    void window.finterest?.getAppearancePacks?.().then((value) => active && setPacks(Array.isArray(value) ? value : []), () => undefined);
    const off = window.finterest?.onAppearancePacks?.((value) => setPacks(Array.isArray(value) ? value : []));
    return () => {
      active = false;
      off?.();
    };
  }, []);
  return packs;
}

export function usePackThemeChoice(): [string | null, (themeId: string | null) => void] {
  const [choice, setChoiceState] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(PACK_THEME_KEY) || null;
    } catch {
      return null;
    }
  });
  const setChoice = useCallback((themeId: string | null) => {
    setChoiceState(themeId);
    try {
      if (themeId) window.localStorage.setItem(PACK_THEME_KEY, themeId);
      else window.localStorage.removeItem(PACK_THEME_KEY);
    } catch {
      // Not persisted this session; the choice still applies.
    }
  }, []);
  return [choice, setChoice];
}

/**
 * Draws the active pack theme: `data-theme` takes the built-in theme of the same scheme (every
 * selector of the stylesheet keeps matching), `data-pack-theme` names the pack theme, and its
 * tokens become inline custom properties, which win over the token blocks and the accent colours.
 * Re-applied after every appearance change; everything is removed when the pack goes.
 */
export function useAppliedPackTheme(active: ActivePack | null, resolvedTheme: ResolvedTheme, appearance: Appearance): void {
  useLayoutEffect(() => {
    if (!active) return undefined;
    const root = document.documentElement;
    const names = Object.keys(active.theme.tokens).filter((name) => name.startsWith('--'));
    // The accent colours of the appearance are inline too: put them back when the pack goes.
    const previous = names.map((name) => [name, root.style.getPropertyValue(name)] as const);
    root.dataset.theme = packBaseTheme(active.theme.scheme);
    root.dataset.packTheme = active.theme.id;
    root.style.setProperty('color-scheme', active.theme.scheme);
    for (const name of names) root.style.setProperty(name, active.theme.tokens[name]);
    return () => {
      for (const [name, value] of previous) {
        if (value) root.style.setProperty(name, value);
        else root.style.removeProperty(name);
      }
      root.style.removeProperty('color-scheme');
      delete root.dataset.packTheme;
      root.dataset.theme = resolvedTheme;
    };
  }, [active, resolvedTheme, appearance]);
}
