import { nebulaAppearancePatch, windowMode } from './nebula';

const HUB_APPEARANCE = { theme: 'glass-dark', accentPreset: 'ember', customPrimary: '#112233', customSecondary: '#445566', background: 'aurora', motion: 'reduced', soundEnabled: false, soundVolume: 20, language: 'en' };

describe('Nebula appearance', () => {
  it('applies the theme, the appearance and the language sent by the Hub', () => {
    expect(nebulaAppearancePatch(HUB_APPEARANCE, 'nebula-dark')).toEqual({
      theme: 'glass-dark',
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
