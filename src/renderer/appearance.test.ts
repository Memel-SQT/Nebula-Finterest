import { accentVariables, DEFAULT_APPEARANCE, parseAppearance, shade } from './appearance';
import { parseStoredTheme } from './theme';

describe('parseAppearance', () => {
  it('falls back to defaults for missing or corrupted storage', () => {
    expect(parseAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance('{not json')).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance('"a string"')).toEqual(DEFAULT_APPEARANCE);
  });

  it('keeps valid fields and repairs invalid ones independently', () => {
    const parsed = parseAppearance(JSON.stringify({ background: 'stars', motion: 'warp', customPrimary: 'red', soundVolume: 250, soundEnabled: false }));
    expect(parsed.background).toBe('stars');
    expect(parsed.motion).toBe(DEFAULT_APPEARANCE.motion);
    expect(parsed.customPrimary).toBe(DEFAULT_APPEARANCE.customPrimary);
    expect(parsed.soundVolume).toBe(100);
    expect(parsed.soundEnabled).toBe(false);
  });
});

describe('accentVariables', () => {
  it('darkens the accent on light themes so text on it stays readable', () => {
    expect(accentVariables('#10b981', '#06b6d4', 'nebula-dark')['--accent']).toBe('#10b981');
    expect(accentVariables('#10b981', '#06b6d4', 'nebula-light')['--accent']).toBe(shade('#10b981', -0.18));
  });

  it('switches to dark text on very light accents', () => {
    expect(accentVariables('#fde68a', '#fef3c7', 'nebula-dark')['--on-accent']).toBe('#16151f');
    expect(accentVariables('#8b5cf6', '#4c6ef5', 'nebula-dark')['--on-accent']).toBe('#ffffff');
  });
});

describe('appearance settings migration (PROMPT_DESIGN part 2)', () => {
  it('reads appearance saved by v0.1.36 / v0.1.37 unchanged: same model as @nebula/design', () => {
    const saved = { accentPreset: 'sunset', customPrimary: '#123456', customSecondary: '#abcdef', background: 'aurora', motion: 'reduced', soundEnabled: false, soundVolume: 70 };
    expect(parseAppearance(JSON.stringify(saved))).toEqual(saved);
  });

  it('keeps the default volume when it is missing or null instead of muting the app', () => {
    expect(parseAppearance(JSON.stringify({ soundVolume: null })).soundVolume).toBe(DEFAULT_APPEARANCE.soundVolume);
    expect(parseAppearance(JSON.stringify({ soundVolume: '' })).soundVolume).toBe(DEFAULT_APPEARANCE.soundVolume);
    expect(parseAppearance(JSON.stringify({ soundVolume: 0 })).soundVolume).toBe(0);
  });

  it('uses the family defaults', () => {
    expect(DEFAULT_APPEARANCE).toEqual({ accentPreset: 'nebula', customPrimary: '#8b5cf6', customSecondary: '#4c6ef5', background: 'glow', motion: 'full', soundEnabled: true, soundVolume: 45 });
  });
});

describe('parseStoredTheme', () => {
  it('keeps every theme a released version could store, including the frozen old-* ones', () => {
    for (const theme of ['nebula-dark', 'nebula-light', 'glass-dark', 'glass-light', 'old-dark', 'old-light', 'system'] as const) {
      expect(parseStoredTheme(theme)).toBe(theme);
    }
  });

  it('moves pre-Nebula light/dark to the Nebula pair and anything else to system (the family default)', () => {
    expect(parseStoredTheme('light')).toBe('nebula-light');
    expect(parseStoredTheme('dark')).toBe('nebula-dark');
    expect(parseStoredTheme(null)).toBe('system');
    expect(parseStoredTheme('emerald')).toBe('system');
  });
});
