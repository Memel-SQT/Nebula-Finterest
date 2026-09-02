import { useEffect, useLayoutEffect, useState } from 'react';

/**
 * `nebula-*` are the current identity (see NEBULA_DESIGN.md, shared out of band).
 * `old-*` are the previous emerald/gold themes, kept selectable so nobody is forced
 * onto the new look — they are frozen, not maintained.
 */
export type Theme = 'nebula-dark' | 'nebula-light' | 'old-dark' | 'old-light' | 'system';
export type ResolvedTheme = Exclude<Theme, 'system'>;

const STORAGE_KEY = 'finterest-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
const THEMES: Theme[] = ['nebula-dark', 'nebula-light', 'old-dark', 'old-light', 'system'];

/** Pre-Nebula builds stored plain 'light'/'dark'. Those users move to the new identity, not to `old-*`. */
const LEGACY_THEMES: Record<string, Theme> = { light: 'nebula-light', dark: 'nebula-dark' };

function readStoredTheme(): Theme {
  const stored = window.localStorage.getItem(STORAGE_KEY) ?? '';
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

export function useTheme(): [Theme, (theme: Theme) => void, ResolvedTheme] {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(theme));

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, theme);
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
