// ============================================================================
// TEST SUITE: COURSE STUDIO THEMES & WCAG 2.1 CONTRAST ENGINE
// Verifies relative luminance, contrast ratios, and automatic accessibility
// enforcement across all 5 themes (dark, light, ocean blue, etc.).
// ============================================================================

function hexToRgb(hex) {
  let clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) return { r: 15, g: 23, b: 42 };
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function srgbToLinear(c) {
  const norm = c / 255;
  return norm <= 0.03928 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

function getRelativeLuminance(rgb) {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(fgHex, bgHex) {
  const fgRgb = hexToRgb(fgHex);
  const bgRgb = hexToRgb(bgHex);
  const l1 = getRelativeLuminance(fgRgb);
  const l2 = getRelativeLuminance(bgRgb);
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return parseFloat(((brighter + 0.05) / (darker + 0.05)).toFixed(2));
}

function ensureAccessibleTextColor(textColor, bgColor, fallbackLight = '#f8fafc', fallbackDark = '#0f172a') {
  if (!textColor) return fallbackDark;
  if (!bgColor) return textColor;
  const ratio = getContrastRatio(textColor, bgColor);
  if (ratio >= 4.5) return textColor;
  const lightRatio = getContrastRatio(fallbackLight, bgColor);
  const darkRatio = getContrastRatio(fallbackDark, bgColor);
  return lightRatio >= darkRatio ? fallbackLight : fallbackDark;
}

function isDarkBackground(bgHex) {
  const rgb = hexToRgb(bgHex);
  return getRelativeLuminance(rgb) < 0.35;
}

function getSurfaceDefaultTextColor(bgHex) {
  return isDarkBackground(bgHex) ? '#f8fafc' : '#0f172a';
}

const THEME_PRESETS = [
  { id: 'midnight-navy', name: 'Midnight Navy', isDark: true, bgHex: '#090e17', cardBgHex: '#111b2b', textHex: '#f8fafc' },
  { id: 'ocean-blue', name: 'Ocean Blue', isDark: true, bgHex: '#0a192f', cardBgHex: '#0f243d', textHex: '#f0f9ff' },
  { id: 'morning-mist', name: 'Morning Mist', isDark: false, bgHex: '#eaf5ff', cardBgHex: '#ffffff', textHex: '#0f172a' },
  { id: 'aurora-blue', name: 'Aurora Blue', isDark: true, bgHex: '#0b112c', cardBgHex: '#131c42', textHex: '#f8fafc' },
  { id: 'cloud-light', name: 'Cloud Light', isDark: false, bgHex: '#f8fafc', cardBgHex: '#ffffff', textHex: '#0f172a' }
];

function runContrastSuite() {
  console.log('------------------------------------------------------------');
  console.log('1. RUNNING WCAG CONTRAST RATIO & THEME VERIFICATION SUITE');
  console.log('------------------------------------------------------------');

  let passed = 0;
  let total = 0;

  function assert(condition, desc) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      process.exitCode = 1;
    }
  }

  // 1. Check all 5 theme presets have valid contrast on their card surfaces
  THEME_PRESETS.forEach(theme => {
    const ratio = getContrastRatio(theme.textHex, theme.cardBgHex);
    assert(
      ratio >= 4.5,
      `Theme "${theme.name}" text (${theme.textHex}) vs card background (${theme.cardBgHex}) contrast ratio is ${ratio}:1 (>= 4.5:1 WCAG AA)`
    );
  });

  // 2. Test dark-on-dark auto-correction
  const darkOnDarkFix = ensureAccessibleTextColor('#0f172a', '#090e17'); // Dark slate on Midnight Navy
  const fixedDarkRatio = getContrastRatio(darkOnDarkFix, '#090e17');
  assert(
    fixedDarkRatio >= 4.5 && (darkOnDarkFix === '#f8fafc' || darkOnDarkFix === '#ffffff'),
    `Dark text on dark background automatically flips to accessible light color (${darkOnDarkFix}, ${fixedDarkRatio}:1)`
  );

  // 3. Test light-on-light auto-correction
  const lightOnLightFix = ensureAccessibleTextColor('#ffffff', '#ffffff'); // Pure white on Pure white
  const fixedLightRatio = getContrastRatio(lightOnLightFix, '#ffffff');
  assert(
    fixedLightRatio >= 4.5 && (lightOnLightFix === '#0f172a' || lightOnLightFix === '#000000'),
    `White text on white background automatically flips to accessible dark color (${lightOnLightFix}, ${fixedLightRatio}:1)`
  );

  // 4. Test preservation of accessible colors
  const accessibleBlue = '#026fc3';
  const preserved = ensureAccessibleTextColor(accessibleBlue, '#ffffff');
  assert(
    preserved === accessibleBlue,
    `Accessible color (${accessibleBlue} on #ffffff) is preserved without modification`
  );

  // 5. Test getSurfaceDefaultTextColor
  const darkSurfaceText = getSurfaceDefaultTextColor('#090e17');
  const lightSurfaceText = getSurfaceDefaultTextColor('#f8fafc');
  assert(darkSurfaceText === '#f8fafc', `Dark surface default text is light (${darkSurfaceText})`);
  assert(lightSurfaceText === '#0f172a', `Light surface default text is dark (${lightSurfaceText})`);

  console.log(`\nContrast Suite Summary: ${passed}/${total} assertions passed.\n`);
}

runContrastSuite();
