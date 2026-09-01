// ============================================================================
// EDTECHRA-BITZ: Knowledge Bitz Theme Context
// Provides Premium Dark Blue (DEFAULT) theme with light theme toggle & persistent storage.
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';

export type BitzTheme = 'dark' | 'light';

interface BitzThemeContextType {
  theme: BitzTheme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: BitzTheme) => void;
}

const THEME_STORAGE_KEY = 'edtechra_bitz_theme';

const BitzThemeContext = createContext<BitzThemeContextType | undefined>(undefined);

export const BitzThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<BitzTheme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // Ignore localStorage errors
    }
    // DEFAULT IS STRICTLY DARK AS PER SPECIFICATION
    return 'dark';
  });

  const setTheme = (newTheme: BitzTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore localStorage errors
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <BitzThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </BitzThemeContext.Provider>
  );
};

export const useBitzTheme = (): BitzThemeContextType => {
  const context = useContext(BitzThemeContext);
  if (!context) {
    // Graceful fallback for components used outside the provider (e.g. preview)
    return {
      theme: 'dark',
      isDark: true,
      toggleTheme: () => {},
      setTheme: () => {}
    };
  }
  return context;
};
