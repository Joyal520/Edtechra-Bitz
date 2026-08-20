import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Module-level storage to capture beforeinstallprompt before React component mounts
let deferredPromptEvent: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPromptEvent = e as BeforeInstallPromptEvent;
    promptListeners.forEach((listener) => listener(deferredPromptEvent));
  });

  window.addEventListener('appinstalled', () => {
    deferredPromptEvent = null;
    promptListeners.forEach((listener) => listener(null));
    console.log('[PWA] EdTechra-Bitz appinstalled event detected');
  });
}

function checkStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

function checkIsIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return (
    /iphone|ipad|ipod/.test(userAgent) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
  );
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => deferredPromptEvent);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => checkStandalone());
  const [isIOS] = useState<boolean>(() => checkIsIOS());
  const [iosModalOpen, setIosModalOpen] = useState(false);

  useEffect(() => {
    // 1. Standalone check and listener for display-mode changes
    setIsInstalled(checkStandalone());

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches || checkStandalone());
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    } else {
      mediaQuery.addListener(handleDisplayModeChange);
    }

    // 2. Subscribe to module-level prompt store updates
    const handlePromptChange = (prompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(prompt);
      if (checkStandalone()) {
        setIsInstalled(true);
      }
    };

    promptListeners.add(handlePromptChange);

    // 3. Native appinstalled listener
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      deferredPromptEvent = null;
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      } else {
        mediaQuery.removeListener(handleDisplayModeChange);
      }
      promptListeners.delete(handlePromptChange);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          console.log('[PWA] User accepted installation prompt');
          setIsInstalled(true);
        } else {
          console.log('[PWA] User dismissed installation prompt');
        }
      } catch (err) {
        console.error('[PWA] Install prompt error:', err);
      } finally {
        deferredPromptEvent = null;
        setDeferredPrompt(null);
        promptListeners.forEach((listener) => listener(null));
      }
    } else if (isIOS && !isInstalled) {
      setIosModalOpen(true);
    }
  }, [deferredPrompt, isIOS, isInstalled]);

  // Can install if:
  // - Not already in standalone mode
  // AND
  // - Either native prompt is captured (Chrome/Edge/Android) OR iOS Safari manual flow is applicable
  const hasNativePrompt = !isInstalled && deferredPrompt !== null;
  const isIOSManual = !isInstalled && isIOS && deferredPrompt === null;
  const canInstall = !isInstalled && (hasNativePrompt || isIOSManual);

  return {
    canInstall,
    isInstalled,
    hasNativePrompt,
    isIOS,
    isIOSManual,
    iosModalOpen,
    setIosModalOpen,
    triggerInstall
  };
}

