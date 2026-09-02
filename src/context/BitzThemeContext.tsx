// ============================================================================
// EDTECHRA-BITZ: Knowledge Bitz Theme & Reading Settings Context
// Provides Premium Dark Blue (DEFAULT) theme with light theme toggle &
// user-controlled reading typography settings (Text size, Line spacing, Font choice).
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';

export type BitzTheme = 'dark' | 'light';
export type BitzTextSize = 'small' | 'medium' | 'large' | 'xlarge';
export type BitzLineSpacing = 'compact' | 'comfortable' | 'relaxed';
export type BitzFontChoice = 'standard' | 'reading';

export interface BitzReadingSettings {
  textSize: BitzTextSize;
  lineSpacing: BitzLineSpacing;
  fontFamily: BitzFontChoice;
}

interface BitzThemeContextType {
  theme: BitzTheme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: BitzTheme) => void;
  readingSettings: BitzReadingSettings;
  setTextSize: (size: BitzTextSize) => void;
  setLineSpacing: (spacing: BitzLineSpacing) => void;
  setFontFamily: (font: BitzFontChoice) => void;
  resetReadingSettings: () => void;
}

const THEME_STORAGE_KEY = 'edtechra_bitz_theme';
const READING_SETTINGS_KEY = 'edtechra_bitz_reading_settings';

const DEFAULT_READING_SETTINGS: BitzReadingSettings = {
  textSize: 'medium',
  lineSpacing: 'comfortable',
  fontFamily: 'standard'
};

const BitzThemeContext = createContext<BitzThemeContextType | undefined>(undefined);

export const BitzThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme State
  const [theme, setThemeState] = useState<BitzTheme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {}
    // DEFAULT IS STRICTLY DARK AS PER SPECIFICATION
    return 'dark';
  });

  // Reading Typography Settings State
  const [readingSettings, setReadingSettings] = useState<BitzReadingSettings>(() => {
    try {
      const saved = localStorage.getItem(READING_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          textSize: parsed.textSize || 'medium',
          lineSpacing: parsed.lineSpacing || 'comfortable',
          fontFamily: parsed.fontFamily || 'standard'
        };
      }
    } catch {}
    return DEFAULT_READING_SETTINGS;
  });

  const setTheme = (newTheme: BitzTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {}
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const setTextSize = (textSize: BitzTextSize) => {
    setReadingSettings(prev => ({ ...prev, textSize }));
  };

  const setLineSpacing = (lineSpacing: BitzLineSpacing) => {
    setReadingSettings(prev => ({ ...prev, lineSpacing }));
  };

  const setFontFamily = (fontFamily: BitzFontChoice) => {
    setReadingSettings(prev => ({ ...prev, fontFamily }));
  };

  const resetReadingSettings = () => {
    setReadingSettings(DEFAULT_READING_SETTINGS);
  };

  // Sync theme to localStorage and HTML root attribute
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      localStorage.setItem('theme', theme);
    } catch {}

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme-mode', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

  // Sync reading settings to localStorage & apply dynamic CSS variables & HTML data-text-size attribute
  useEffect(() => {
    try {
      localStorage.setItem(READING_SETTINGS_KEY, JSON.stringify(readingSettings));
      localStorage.setItem('edtechra_text_size', readingSettings.textSize);
    } catch {}

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    // Font size mapping for 100-word reading text (Medium is default, comfortable on mobile & desktop)
    let fontSizeValue = '20px';
    if (readingSettings.textSize === 'small') fontSizeValue = isMobile ? '16px' : '17px';
    else if (readingSettings.textSize === 'medium') fontSizeValue = isMobile ? '18px' : '20px';
    else if (readingSettings.textSize === 'large') fontSizeValue = isMobile ? '20px' : '22px';
    else if (readingSettings.textSize === 'xlarge') fontSizeValue = isMobile ? '23px' : '25px';

    // Line spacing mapping (Generous 1.7 - 1.9)
    let lineSpacingValue = '1.8';
    if (readingSettings.lineSpacing === 'compact') lineSpacingValue = '1.7';
    else if (readingSettings.lineSpacing === 'comfortable') lineSpacingValue = '1.8';
    else if (readingSettings.lineSpacing === 'relaxed') lineSpacingValue = '1.9';

    // Font family mapping: Lora serif for reading, Manrope / standard UI for UI
    let fontFamilyValue = 'Lora, Georgia, serif';
    if (readingSettings.fontFamily === 'reading') {
      fontFamilyValue = 'Lora, Georgia, "Times New Roman", Merriweather, serif';
    } else {
      fontFamilyValue = 'Lora, Georgia, serif';
    }

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-text-size', readingSettings.textSize);
      document.documentElement.style.setProperty('--reading-font-size', fontSizeValue);
      document.documentElement.style.setProperty('--reading-line-height', lineSpacingValue);
      document.documentElement.style.setProperty('--reading-font-family', fontFamilyValue);
    }
  }, [readingSettings]);

  const isDark = theme === 'dark';

  return (
    <BitzThemeContext.Provider
      value={{
        theme,
        isDark,
        toggleTheme,
        setTheme,
        readingSettings,
        setTextSize,
        setLineSpacing,
        setFontFamily,
        resetReadingSettings
      }}
    >
      {children}
    </BitzThemeContext.Provider>
  );
};

export const useBitzTheme = (): BitzThemeContextType => {
  const context = useContext(BitzThemeContext);
  if (!context) {
    return {
      theme: 'dark',
      isDark: true,
      toggleTheme: () => {},
      setTheme: () => {},
      readingSettings: DEFAULT_READING_SETTINGS,
      setTextSize: () => {},
      setLineSpacing: () => {},
      setFontFamily: () => {},
      resetReadingSettings: () => {}
    };
  }
  return context;
};
