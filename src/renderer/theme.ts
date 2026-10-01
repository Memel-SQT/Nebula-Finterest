import { useEffect, useLayoutEffect, useState } from 'react';

/**
 * `nebula-*` are the current identity (see NEBULA_DESIGN.md, shared out of band).
 * `glass-*` are the Nebula palette rendered as translucent "liquid glass" surfaces over the
 * animated background. `old-*` are the previous emerald/gold themes, kept selectable so nobody
 * is forced onto the new look — they are frozen, not maintained.
 */
export type Theme = 'nebula-dark' | 'nebula-light' | 'glass-dark' | 'glass-light' | 'old-dark' | 'old-light' | 'system';
export type ResolvedTheme = Exclude<Theme, 'system'>;

const STORAGE_KEY = 'finterest-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
const THEMES: Theme[] = ['nebula-dark', 'nebula-light', 'glass-dark', 'glass-light', 'old-dark', 'old-light', 'system'];

/** Pre-Nebula builds stored plain 'light'/'dark'. Those users move to the new identity, not to `old-*`. */
const LEGACY_THEMES: Record<string, Theme> = { light: 'nebula-light', dark: 'nebula-dark' };

function readStoredTheme(): Theme {
  let stored = '';
  try {
    stored = window.localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    // Storage can be unavailable (locked-down profile); fall back to the system theme.
  }
  if ((THEMES as string[]).includes(stored)) {
    return stored as Theme;
  }
  return LEGACY_THEMES[stored] ?? 'system';
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return window.matchMedia(DARK_QUERY).matches ? 'nebula-dark' : 'nebula-light';
  }
  return theme;
}

export function isLightTheme(theme: ResolvedTheme): boolean {
  return theme.endsWith('-light');
}

export function isLegacyTheme(theme: ResolvedTheme): boolean {
  return theme.startsWith('old-');
}

export function useTheme(): [Theme, (theme: Theme) => void, ResolvedTheme] {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(theme));

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Not persisted this session; the choice still applies.
    }
    setResolvedTheme(resolveTheme(theme));

    if (theme !== 'system') {
      return;
    }

    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => setResolvedTheme(resolveTheme('system'));
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  const setTheme = (next: Theme) => setThemeState(next);

  return [theme, setTheme, resolvedTheme];
}
