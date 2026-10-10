import type { PackView } from '@shared/packs';
import { nebulaAppearancePatch, windowMode } from './nebula';

const HUB_APPEARANCE = { theme: 'glass-dark', accentPreset: 'ember', customPrimary: '#112233', customSecondary: '#445566', background: 'aurora', motion: 'reduced', soundEnabled: false, soundVolume: 20, language: 'en' };

const SAMPLE_PACK: PackView = {
  id: 'sample',
  themes: [{ id: 'sample-dark', scheme: 'dark', label: { fr: 'Exemple nuit' }, tokens: { '--page': '#101010' }, chrome: { page: '#101010', ink: '#f0f0f0' } }],
  name: 'Sample Finterest',
  markUrl: null,
};

describe('Nebula appearance: themes of an appearance pack', () => {
  it('follows a pack theme the Hub sends when the pack is installed here, keeping the built-in theme', () => {
    const patch = nebulaAppearancePatch({ ...HUB_APPEARANCE, theme: 'sample-dark' }, 'nebula-dark', [SAMPLE_PACK]);
    expect(patch.packTheme).toBe('sample-dark');
    expect(patch.theme).toBeUndefined();
    expect(patch.language).toBe('en');
  });

  it('ignores a pack theme it does not have (the pack is not installed here)', () => {
    const patch = nebulaAppearancePatch({ ...HUB_APPEARANCE, theme: 'sample-dark' }, 'nebula-dark', []);
    expect(patch.packTheme).toBeUndefined();
    expect(patch.theme).toBeUndefined();
  });
});

describe('Nebula appearance', () => {
  it('applies the theme, the appearance and the language sent by the Hub', () => {
    expect(nebulaAppearancePatch(HUB_APPEARANCE, 'nebula-dark')).toEqual({
      theme: 'glass-dark',
      // A built-in theme from the Hub leaves any appearance pack theme.
      packTheme: null,
      language: 'en',
      appearance: { accentPreset: 'ember', customPrimary: '#112233', customSecondary: '#445566', background: 'aurora', motion: 'reduced', soundEnabled: false, soundVolume: 20 },
    });
  });

  it('keeps an old-* theme chosen locally, and ignores unknown values', () => {
    const patch = nebulaAppearancePatch({ ...HUB_APPEARANCE, background: 'lava', language: 'de' }, 'old-dark');
    expect(patch.theme).toBeUndefined();
    expect(patch.language).toBeUndefined();
    expect(patch.appearance.background).toBe('glow');
    expect(nebulaAppearancePatch(null, 'nebula-light').appearance.accentPreset).toBe('nebula');
  });
});

describe('window mode', () => {
  it('reads the Hub mode from the page address', () => {
    expect(windowMode('?mode=docked')).toBe('docked');
    expect(windowMode('?mode=restored')).toBe('restored');
    expect(windowMode('?mode=evil')).toBeNull();
    expect(windowMode('')).toBeNull();
  });
});
