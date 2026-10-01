import { accentVariables, DEFAULT_APPEARANCE, parseAppearance, shade } from './appearance';

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
