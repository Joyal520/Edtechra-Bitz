import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from '@/routes';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { BitzThemeProvider } from '@/context/BitzThemeContext';
import { SplashScreen } from '@/components/SplashScreen';

const AppContent: React.FC = () => {
  const { isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Remove static HTML initial-splash as soon as React takes over
  useEffect(() => {
    const staticSplash = document.getElementById('initial-splash');
    if (staticSplash) {
      staticSplash.remove();
    }
  }, []);

  useEffect(() => {
    // Keep splash screen visible for at least 700ms so animations are experienced smoothly
    let isCancelled = false;

    const minTimer = setTimeout(() => {
      if (!isCancelled && !isLoading) {
        setIsFadingOut(true);
      }
    }, 700);

    // Safety fallback: ensure UI is never trapped indefinitely
    const safetyTimer = setTimeout(() => {
      if (!isCancelled) {
        setIsFadingOut(true);
      }
    }, 4500);

    return () => {
      isCancelled = true;
      clearTimeout(minTimer);
      clearTimeout(safetyTimer);
    };
  }, [isLoading]);

  // Handle case where isLoading took longer than 700ms and finally resolved
  useEffect(() => {
    if (!isLoading && showSplash && !isFadingOut) {
      const dismissTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 300);
      return () => clearTimeout(dismissTimer);
    }
  }, [isLoading, showSplash, isFadingOut]);

  return (
    <>
      {showSplash && (
        <SplashScreen
          isFadingOut={isFadingOut}
          onDismiss={() => setShowSplash(false)}
        />
      )}
      <AppRoutes />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BitzThemeProvider>
          <AppContent />
        </BitzThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

