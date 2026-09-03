// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: CONTRAST & ACCESSIBILITY VALIDATOR (WCAG 2.1)
// Calculates relative luminance, contrast ratios, and guarantees readable
// text-background combinations across all light, dark, and custom themes.
// ============================================================================

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ContrastEvaluation {
  ratio: number;
  isNormalTextAccessible: boolean; // >= 4.5:1 (WCAG AA)
  isLargeTextAccessible: boolean;  // >= 3.0:1 (WCAG AA Large)
  isEnhancedAccessible: boolean;   // >= 7.0:1 (WCAG AAA)
  recommendedColor: string;
}

/**
 * Converts Hex string (#RRGGBB or #RGB) to RGB object
 */
export function hexToRgb(hex: string): RGB {
  let clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) {
    // Default to dark slate if unparseable
    return { r: 15, g: 23, b: 42 };
  }

  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

/**
 * Calculates WCAG 2.1 relative luminance for an sRGB component
 */
function srgbToLinear(c: number): number {
  const norm = c / 255;
  return norm <= 0.03928 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

/**
 * Calculates WCAG 2.1 relative luminance for an RGB color
 */
export function getRelativeLuminance(rgb: RGB): number {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculates numerical contrast ratio between two colors (range: 1.0 to 21.0)
 */
export function getContrastRatio(fgHex: string, bgHex: string): number {
  const fgRgb = hexToRgb(fgHex);
  const bgRgb = hexToRgb(bgHex);
  const l1 = getRelativeLuminance(fgRgb);
  const l2 = getRelativeLuminance(bgRgb);

  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return parseFloat(((brighter + 0.05) / (darker + 0.05)).toFixed(2));
}

/**
 * Evaluates whether foreground and background meet WCAG standards
 */
export function evaluateContrast(fgHex: string, bgHex: string): ContrastEvaluation {
  const ratio = getContrastRatio(fgHex, bgHex);
  const isNormalTextAccessible = ratio >= 4.5;
  const isLargeTextAccessible = ratio >= 3.0;
  const isEnhancedAccessible = ratio >= 7.0;

  let recommendedColor = fgHex;
  if (!isNormalTextAccessible) {
    // Pick highest contrast fallback (crisp white or deep navy)
    const whiteRatio = getContrastRatio('#ffffff', bgHex);
    const darkRatio = getContrastRatio('#0f172a', bgHex);
    recommendedColor = whiteRatio > darkRatio ? '#ffffff' : '#0f172a';
  }

  return {
    ratio,
    isNormalTextAccessible,
    isLargeTextAccessible,
    isEnhancedAccessible,
    recommendedColor
  };
}

/**
 * Ensures a text color is accessible on a given background.
 * If contrast ratio is under 4.5:1, returns the safe fallback color.
 */
export function ensureAccessibleTextColor(
  textColor: string,
  bgColor: string,
  fallbackLight = '#f8fafc',
  fallbackDark = '#0f172a'
): string {
  if (!textColor) return fallbackDark;
  if (!bgColor) return textColor;

  const ratio = getContrastRatio(textColor, bgColor);
  if (ratio >= 4.5) return textColor;

  // Pick between fallbackLight and fallbackDark
  const lightRatio = getContrastRatio(fallbackLight, bgColor);
  const darkRatio = getContrastRatio(fallbackDark, bgColor);
  return lightRatio >= darkRatio ? fallbackLight : fallbackDark;
}

/**
 * Determines whether a surface background is considered "dark" (luminance < 0.35)
 */
export function isDarkBackground(bgHex: string): boolean {
  const rgb = hexToRgb(bgHex);
  const lum = getRelativeLuminance(rgb);
  return lum < 0.35;
}

/**
 * Returns optimal default text color for a given background surface
 */
export function getSurfaceDefaultTextColor(bgHex: string): string {
  return isDarkBackground(bgHex) ? '#f8fafc' : '#0f172a';
}

/**
 * Safe Canva-Style Palette with guaranteed accessible combinations
 */
export const SAFE_TEXT_COLORS = [
  { name: 'Default Dark', hex: '#0f172a' },
  { name: 'Slate Gray', hex: '#334155' },
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Soft White', hex: '#f8fafc' },
  { name: 'EdTechra Blue', hex: '#026fc3' },
  { name: 'Electric Cyan', hex: '#0284c7' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Amber Gold', hex: '#d97706' },
  { name: 'Ruby Rose', hex: '#e11d48' },
  { name: 'Royal Indigo', hex: '#4f46e5' },
  { name: 'Violet Purple', hex: '#7c3aed' }
];

export const SAFE_HIGHLIGHT_COLORS = [
  { name: 'None', hex: 'transparent' },
  { name: 'Soft Yellow', hex: '#fef08a' },
  { name: 'Soft Sky', hex: '#bae6fd' },
  { name: 'Soft Emerald', hex: '#a7f3d0' },
  { name: 'Soft Rose', hex: '#fecdd3' },
  { name: 'Soft Purple', hex: '#e9d5ff' },
  { name: 'Dark Navy Chip', hex: '#1e293b' },
  { name: 'Midnight Chip', hex: '#0f172a' }
];
