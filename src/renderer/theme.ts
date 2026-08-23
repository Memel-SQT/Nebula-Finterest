import { useEffect, useLayoutEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'finterest-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
  }
  return theme;
}

export function useTheme(): [Theme, (theme: Theme) => void, ResolvedTheme] {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  });
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
