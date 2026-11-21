import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Loader2, Star, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePriorityApp } from '@/context/PriorityAppContext';
import {
  getPriorityAppLaunchPath,
  hasPriorityBypass,
  markPriorityHandledForUser,
  setPriorityBypass,
  wasPriorityHandledForUser
} from '@/utils/priorityApp';

export const PriorityAppStartupGate: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading, pendingIntent } = useAuth();
  const {
    preference,
    isLoaded,
    enteredAtRoot,
    fallbackNotice,
    dismissFallbackNotice
  } = usePriorityApp();
  const location = useLocation();
  const navigate = useNavigate();

  const [safetyTimedOut, setSafetyTimedOut] = useState(false);

  const shouldCheckAutoLaunch =
    !authLoading &&
    isAuthenticated &&
    Boolean(user) &&
    location.pathname === '/' &&
    enteredAtRoot &&
    !hasPriorityBypass() &&
    !wasPriorityHandledForUser(user?.id) &&
    !pendingIntent;

  // Hard 3.5s safety timer so startup never hangs even if network stalls
  useEffect(() => {
    if (!shouldCheckAutoLaunch || isLoaded) {
      setSafetyTimedOut(false);
      return;
    }
    const timer = setTimeout(() => {
      setSafetyTimedOut(true);
      if (user?.id) {
        markPriorityHandledForUser(user.id);
      }
      setPriorityBypass();
    }, 3500);
    return () => clearTimeout(timer);
  }, [shouldCheckAutoLaunch, isLoaded, user?.id]);

  // Execute automatic launch once preference resolves
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user || !isLoaded) return;
    if (location.pathname !== '/') return;
    if (!enteredAtRoot) return;
    if (hasPriorityBypass() || wasPriorityHandledForUser(user.id)) return;

    let hasStoredPendingIntent = false;
    try {
      hasStoredPendingIntent = Boolean(localStorage.getItem('edtechra_pending_intent'));
    } catch {
      hasStoredPendingIntent = false;
    }
    if (pendingIntent || hasStoredPendingIntent) return;

    // Mark immediately before navigating to guarantee no redirect loops
    markPriorityHandledForUser(user.id);

    if (preference?.enabled && preference?.valid && preference?.app) {
      const targetPath = getPriorityAppLaunchPath(preference.app, preference.launchType);
      navigate(targetPath, { replace: true });
    }
  }, [
    authLoading,
    isAuthenticated,
    user,
    isLoaded,
    location.pathname,
    enteredAtRoot,
    pendingIntent,
    preference,
    navigate
  ]);

  const showCheckingVeil = shouldCheckAutoLaunch && !isLoaded && !safetyTimedOut;

  return (
    <>
      {showCheckingVeil && (
        <div
          role="status"
          aria-label="Checking Priority App preference"
          className="fixed inset-0 z-[99990] bg-[#020813]/95 backdrop-blur-md text-white flex flex-col items-center justify-center p-6 text-center space-y-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center">
            <Star className="w-6 h-6 text-amber-400 fill-amber-400 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-black tracking-tight flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
              <span>Preparing your EdTechra workspace...</span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Checking your Priority App setting
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPriorityBypass();
              if (user?.id) markPriorityHandledForUser(user.id);
              setSafetyTimedOut(true);
            }}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
          >
            Go to EdTechra Home
          </button>
        </div>
      )}

      {fallbackNotice && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-[99980] max-w-sm bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-amber-400/40 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-xs font-bold leading-relaxed text-slate-100">
              {fallbackNotice}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  dismissFallbackNotice();
                  setPriorityBypass();
                  navigate('/library?selectPriority=1');
                }}
                className="inline-flex items-center gap-1 px-3 py-1 bg-[#026fc3] hover:bg-[#025ea6] text-white rounded-lg text-[11px] font-black transition-colors cursor-pointer"
              >
                <span>Choose in Library</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissFallbackNotice}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
};
