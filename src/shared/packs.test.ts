import { findPackTheme, packBaseTheme, packLabel, packViewOf, type PackSource } from './packs';

const SOURCE: PackSource = {
  id: 'sample',
  themes: [
    { id: 'sample-dark', scheme: 'dark', label: { fr: 'Exemple nuit', en: 'Sample night' }, tokens: { '--page': '#101010' }, chrome: { page: '#101010', ink: '#f0f0f0' } },
    { id: 'sample-light', scheme: 'light', label: { fr: 'Exemple jour' }, tokens: { '--page': '#fafafa' }, chrome: { page: '#fafafa', ink: '#101010' } },
  ],
  names: { 'nebula.finterest': 'Sample Finterest', 'nebula.clock': 'Sample Clock' },
  marks: { 'nebula.finterest': '<svg></svg>', 'nebula.clock': '<svg><circle/></svg>' },
};

describe('appearance packs (Nebula Hub NEBULA_LINK.md § 18)', () => {
  it('keeps only what this app shows: its own name and logo', () => {
    const view = packViewOf(SOURCE, (svg) => `data:${svg.length}`);
    expect(view.name).toBe('Sample Finterest');
    expect(view.markUrl).toBe('data:11');
    expect(view.themes.map((theme) => theme.id)).toEqual(['sample-dark', 'sample-light']);
    expect(packViewOf({ ...SOURCE, names: {}, marks: {} }, (svg) => svg)).toMatchObject({ name: null, markUrl: null });
  });

  it('finds the chosen theme only while its pack is there', () => {
    const view = packViewOf(SOURCE, (svg) => svg);
    expect(findPackTheme([view], 'sample-light')?.theme.scheme).toBe('light');
    expect(findPackTheme([], 'sample-light')).toBeNull();
    expect(findPackTheme([view], null)).toBeNull();
    expect(packLabel(SOURCE.themes[0].label, 'en')).toBe('Sample night');
    expect(packLabel(SOURCE.themes[1].label, 'en')).toBe('Exemple jour');
    expect(packBaseTheme('light')).toBe('nebula-light');
    expect(packBaseTheme('dark')).toBe('nebula-dark');
  });
});
