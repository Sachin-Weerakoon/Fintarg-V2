import { describe, it, expect } from 'vitest';
import { THEME_COLORS, deriveBrand, getContrastRatio, validateCustomOverrides } from './theme';

describe('deriveBrand', () => {
  const white = '#FFFFFF';
  const darkSurface = '#111A2B';

  it('guarantees WCAG AA contrast for all six swatches in light mode', () => {
    for (const swatch of THEME_COLORS) {
      const vars = deriveBrand(swatch, false);
      const p600 = vars['--color-primary-600'];
      const p700 = vars['--color-primary-700'];
      const p400 = vars['--color-primary-400'];
      const tint = vars['--color-primary-tint'];

      // primary-600 vs white >= 4.5:1
      const p600Contrast = getContrastRatio(white, p600);
      expect(p600Contrast, `${swatch} p600 vs white contrast ${p600Contrast}`).toBeGreaterThanOrEqual(4.5);

      // primary-700 on white >= 4.5:1
      const p700WhiteContrast = getContrastRatio(white, p700);
      expect(p700WhiteContrast, `${swatch} p700 vs white contrast ${p700WhiteContrast}`).toBeGreaterThanOrEqual(4.5);

      // primary-700 on tint >= 4.5:1
      const p700TintContrast = getContrastRatio(tint, p700);
      expect(p700TintContrast, `${swatch} p700 vs tint contrast ${p700TintContrast}`).toBeGreaterThanOrEqual(4.5);

      // primary-400 on dark surface >= 4.5:1
      const p400DarkContrast = getContrastRatio(darkSurface, p400);
      expect(p400DarkContrast, `${swatch} p400 vs darkSurface contrast ${p400DarkContrast}`).toBeGreaterThanOrEqual(4.5);

      // on-primary has high contrast
      const onPrimary = vars['--color-on-primary'];
      const onPrimaryContrast = getContrastRatio(p600, onPrimary);
      expect(onPrimaryContrast).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('guarantees WCAG AA contrast for all six swatches in dark mode', () => {
    for (const swatch of THEME_COLORS) {
      const vars = deriveBrand(swatch, true);
      const p600 = vars['--color-primary-600'];
      const p400 = vars['--color-primary-400'];

      // buttons keep p600 fill with white text >= 4.5:1
      const p600Contrast = getContrastRatio(white, p600);
      expect(p600Contrast, `${swatch} dark p600 vs white contrast`).toBeGreaterThanOrEqual(4.5);

      // primary-400 on dark surface >= 4.5:1
      const p400DarkContrast = getContrastRatio(darkSurface, p400);
      expect(p400DarkContrast, `${swatch} dark p400 vs darkSurface contrast`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('validates custom overrides and flags low contrast in light mode', () => {
    // Failing contrast: light yellow text on white surface
    const failing = validateCustomOverrides({
      colorText: '#FFEEAA',
      colorSurface: '#FFFFFF',
    });
    expect(failing.warnings.colorText).toBeDefined();
    expect(failing.validOverrides['--color-text']).toBeUndefined();

    // Passing contrast: dark slate text on white surface
    const passing = validateCustomOverrides({
      colorText: '#0F172A',
      colorSurface: '#FFFFFF',
    });
    expect(passing.warnings.colorText).toBeUndefined();
    expect(passing.validOverrides['--color-text']).toBe('#0F172A');
  });
});
