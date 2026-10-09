export const THEME_COLORS = [
  '#0FA3B1',
  '#14284B',
  '#2E9E6B',
  '#7C3AED',
  '#E91E8C',
  '#F2A900',
] as const;

export type ThemeColor = typeof THEME_COLORS[number];

export const LIGHT_DEFAULTS = {
  colorText: '#0F172A',
  colorText2: '#334155',
  colorMuted: '#5B6B80',
  colorBg: '#F6F8FB',
  colorSurface: '#FFFFFF',
  colorSurfaceHover: '#F1F5F9',
  colorBorder: '#E2E8F0',
  colorBorderInput: '#8091A7',
};

export const DARK_DEFAULTS = {
  colorText: '#E8EEF7',
  colorText2: '#C3CCD9',
  colorMuted: '#9AA9BF',
  colorBg: '#0B1220',
  colorSurface: '#111A2B',
  colorSurfaceHover: '#172338',
  colorBorder: '#223049',
  colorBorderInput: '#66788F',
};

export function parseHex(hexStr: string): [number, number, number] {
  let hex = (hexStr || '#0FA3B1').replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6) {
    return [15, 163, 177]; // fallback to #0FA3B1
  }
  const num = parseInt(hex, 16);
  if (Number.isNaN(num)) {
    return [15, 163, 177];
  }
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function toHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
}

function sRGBtoLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function getLuminance(rgb: [number, number, number]): number {
  return 0.2126 * sRGBtoLinear(rgb[0]) + 0.7152 * sRGBtoLinear(rgb[1]) + 0.0722 * sRGBtoLinear(rgb[2]);
}

export function getContrastRatio(colorA: string | [number, number, number], colorB: string | [number, number, number]): number {
  const rgbA = typeof colorA === 'string' ? parseHex(colorA) : colorA;
  const rgbB = typeof colorB === 'string' ? parseHex(colorB) : colorB;
  const l1 = getLuminance(rgbA);
  const l2 = getLuminance(rgbB);
  const top = Math.max(l1, l2);
  const bot = Math.min(l1, l2);
  return (top + 0.05) / (bot + 0.05);
}

export function meetsContrast(colorA: string, colorB: string, minRatio = 4.5): boolean {
  return getContrastRatio(colorA, colorB) >= minRatio;
}

function darkenRgb(rgb: [number, number, number], factor = 0.96): [number, number, number] {
  return [
    Math.max(0, Math.round(rgb[0] * factor)),
    Math.max(0, Math.round(rgb[1] * factor)),
    Math.max(0, Math.round(rgb[2] * factor)),
  ];
}

function lightenRgb(rgb: [number, number, number], factor = 0.06): [number, number, number] {
  return [
    Math.min(255, Math.round(rgb[0] + (255 - rgb[0]) * factor)),
    Math.min(255, Math.round(rgb[1] + (255 - rgb[1]) * factor)),
    Math.min(255, Math.round(rgb[2] + (255 - rgb[2]) * factor)),
  ];
}

function mixRgb(rgb1: [number, number, number], rgb2: [number, number, number], weight: number): [number, number, number] {
  return [
    Math.round(rgb1[0] * weight + rgb2[0] * (1 - weight)),
    Math.round(rgb1[1] * weight + rgb2[1] * (1 - weight)),
    Math.round(rgb1[2] * weight + rgb2[2] * (1 - weight)),
  ];
}

/**
 * Derives accessible brand tokens guaranteeing WCAG AA:
 * - primary-600 vs white >= 4.5:1
 * - primary-700 on white and on tint >= 4.5:1
 * - primary-400 on dark surface >= 4.5:1
 * - on-primary chosen by contrast
 */
export function deriveBrand(baseHex: string, isDark = false): Record<string, string> {
  const base = parseHex(baseHex || '#0FA3B1');
  const white: [number, number, number] = [255, 255, 255];
  const darkSurface: [number, number, number] = [17, 26, 43]; // #111A2B

  // Light theme tint: soft 12% mix with white
  const tintRgb = mixRgb(base, white, 0.12);
  const tintHex = toHex(...tintRgb);

  // primary-600: darken in steps until contrast vs white >= 4.5:1
  let p600Rgb = [...base] as [number, number, number];
  let iters = 0;
  while (getContrastRatio(white, p600Rgb) < 4.5 && iters < 60) {
    p600Rgb = darkenRgb(p600Rgb, 0.96);
    iters++;
  }
  const p600Hex = toHex(...p600Rgb);

  // primary-700: darken until vs white >= 4.5:1 AND vs tint >= 4.5:1
  let p700Rgb = [...p600Rgb] as [number, number, number];
  iters = 0;
  while ((getContrastRatio(white, p700Rgb) < 4.5 || getContrastRatio(tintRgb, p700Rgb) < 4.5) && iters < 60) {
    p700Rgb = darkenRgb(p700Rgb, 0.96);
    iters++;
  }
  const p700Hex = toHex(...p700Rgb);

  // primary-400: on dark surface >= 4.5:1
  let p400Rgb = [...base] as [number, number, number];
  iters = 0;
  while (getContrastRatio(darkSurface, p400Rgb) < 4.5 && iters < 60) {
    p400Rgb = lightenRgb(p400Rgb, 0.06);
    iters++;
  }
  const p400Hex = toHex(...p400Rgb);

  // on-primary: white if contrast vs primary-600 >= 4.5:1, otherwise near-black
  const onPrimaryHex = getContrastRatio(white, p600Rgb) >= 4.5 ? '#FFFFFF' : '#0F172A';

  const baseHexClean = toHex(...base);

  if (isDark) {
    return {
      '--color-primary': p400Hex,
      '--color-primary-dark': '#0F1D32',
      '--color-primary-tint': `rgba(${p400Rgb.join(', ')}, 0.14)`,
      '--color-primary-400': p400Hex,
      '--color-primary-500': p400Hex,
      '--color-primary-600': p600Hex,
      '--color-primary-700': p400Hex,
      '--color-primary-text': p400Hex,
      '--color-on-primary': onPrimaryHex,
      '--color-chrome-accent': p400Hex,
    };
  }

  return {
    '--color-primary': baseHexClean,
    '--color-primary-dark': '#0F1D32',
    '--color-primary-tint': tintHex,
    '--color-primary-400': p400Hex,
    '--color-primary-500': baseHexClean,
    '--color-primary-600': p600Hex,
    '--color-primary-700': p700Hex,
    '--color-primary-text': p700Hex,
    '--color-on-primary': onPrimaryHex,
    '--color-chrome-accent': p400Hex,
  };
}

/**
 * Validates custom color overrides in light mode.
 * Returns only overrides meeting WCAG 4.5:1 contrast, plus warnings for failing ones.
 */
export function validateCustomOverrides(profile: {
  colorBg?: string;
  colorSurface?: string;
  colorText?: string;
  colorMuted?: string;
}): {
  validOverrides: Record<string, string>;
  warnings: Record<string, string>;
} {
  const validOverrides: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  const surface = profile.colorSurface || LIGHT_DEFAULTS.colorSurface;
  const text = profile.colorText || LIGHT_DEFAULTS.colorText;

  // Validate text vs surface
  if (profile.colorText) {
    const ratio = getContrastRatio(profile.colorText, surface);
    if (ratio < 4.5) {
      warnings.colorText = `Contrast against surface is ${ratio.toFixed(2)}:1 (must be >= 4.5:1)`;
    } else {
      validOverrides['--color-text'] = profile.colorText;
    }
  }

  // Validate muted vs surface
  if (profile.colorMuted) {
    const ratio = getContrastRatio(profile.colorMuted, surface);
    if (ratio < 4.0) {
      warnings.colorMuted = `Contrast against surface is ${ratio.toFixed(2)}:1 (recommended >= 4.0:1)`;
    } else {
      validOverrides['--color-muted'] = profile.colorMuted;
    }
  }

  // Validate surface vs text
  if (profile.colorSurface) {
    const ratio = getContrastRatio(text, profile.colorSurface);
    if (ratio < 4.5) {
      warnings.colorSurface = `Contrast against text is ${ratio.toFixed(2)}:1 (must be >= 4.5:1)`;
    } else {
      validOverrides['--color-surface'] = profile.colorSurface;
    }
  }

  // Validate bg vs text
  if (profile.colorBg) {
    const ratio = getContrastRatio(text, profile.colorBg);
    if (ratio < 4.5) {
      warnings.colorBg = `Contrast against text is ${ratio.toFixed(2)}:1 (must be >= 4.5:1)`;
    } else {
      validOverrides['--color-bg'] = profile.colorBg;
    }
  }

  return { validOverrides, warnings };
}
