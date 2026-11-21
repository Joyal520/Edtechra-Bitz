// ============================================================================
// EDTECHRA LIBRARY: PRIORITY APP REACT CONTEXT
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { priorityAppService } from '@/services/priorityAppService';
import type { PriorityAppPreference } from '@/types/priorityApp';
import { clearPrioritySessionFlags, setPriorityBypass } from '@/utils/priorityApp';

interface PriorityAppContextValue {
  preference: PriorityAppPreference | null;
  isLoaded: boolean;
  isUpdating: boolean;
  fallbackNotice: string | null;
  enteredAtRoot: boolean;
  refreshPreference: () => Promise<PriorityAppPreference | null>;
  setPriorityApp: (appId: string, enabled?: boolean) => Promise<PriorityAppPreference>;
  toggleAutoLaunch: (enabled: boolean) => Promise<PriorityAppPreference>;
  removePriorityApp: () => Promise<void>;
  dismissFallbackNotice: () => void;
  setFallbackNotice: (msg: string | null) => void;
  goToEdTechraHome: () => void;
}

const PriorityAppContext = createContext<PriorityAppContextValue | undefined>(undefined);

export const PriorityAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [preference, setPreference] = useState<PriorityAppPreference | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  const enteredAtRootRef = useRef<boolean>(
    typeof window !== 'undefined' ? window.location.pathname === '/' : false
  );

  const fetchLatestPreference = useCallback(async (): Promise<PriorityAppPreference | null> => {
    if (!isAuthenticated || !user) {
      setPreference(null);
      setIsLoaded(true);
      return null;
    }

    try {
      const pref = await priorityAppService.getPreference(3500);
      setPreference(pref);
      if (pref.auto_disabled && pref.notice) {
        setFallbackNotice(pref.notice);
      }
      setIsLoaded(true);
      return pref;
    } catch (err) {
      console.warn('[PriorityAppContext] Safe fallback while loading preference:', err);
      setPreference(null);
      setIsLoaded(true);
      return null;
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      setPreference(null);
      setIsLoaded(true);
      setFallbackNotice(null);
      clearPrioritySessionFlags();
      return;
    }

    setIsLoaded(false);
    fetchLatestPreference();
  }, [authLoading, isAuthenticated, user?.id, fetchLatestPreference]);

  const setPriorityApp = useCallback(async (appId: string, enabled = true) => {
    setIsUpdating(true);
    try {
      const updated = await priorityAppService.setPriorityApp(appId, enabled);
      setPreference(updated);
      setFallbackNotice(null);
      return updated;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const toggleAutoLaunch = useCallback(async (enabled: boolean) => {
    setIsUpdating(true);
    try {
      const updated = await priorityAppService.setAutoLaunchEnabled(enabled);
      setPreference(updated);
      return updated;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const removePriorityApp = useCallback(async () => {
    setIsUpdating(true);
    try {
      const cleared = await priorityAppService.removePriorityApp();
      setPreference(cleared);
      setFallbackNotice(null);
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const dismissFallbackNotice = useCallback(() => {
    setFallbackNotice(null);
  }, []);

  const goToEdTechraHome = useCallback(() => {
    setPriorityBypass();
  }, []);

  return (
    <PriorityAppContext.Provider
      value={{
        preference,
        isLoaded,
        isUpdating,
        fallbackNotice,
        enteredAtRoot: enteredAtRootRef.current,
        refreshPreference: fetchLatestPreference,
        setPriorityApp,
        toggleAutoLaunch,
        removePriorityApp,
        dismissFallbackNotice,
        setFallbackNotice,
        goToEdTechraHome
      }}
    >
      {children}
    </PriorityAppContext.Provider>
  );
};

export const usePriorityApp = (): PriorityAppContextValue => {
  const ctx = useContext(PriorityAppContext);
  if (!ctx) {
    throw new Error('usePriorityApp must be used within a PriorityAppProvider');
  }
  return ctx;
};
