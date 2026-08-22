import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserProfile, AuthModalMode, AuthIntent, AuthState } from '@/types';

interface AuthContextType {
  authState: AuthState;
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  authModalOpen: boolean;
  authModalMode: AuthModalMode;
  oauthErrorMessage: string | null;
  pendingIntent: AuthIntent;
  openAuthModal: (mode?: AuthModalMode, intent?: AuthIntent) => void;
  closeAuthModal: () => void;
  clearOAuthError: () => void;
  requireAuth: (destination?: AuthIntent | string, onSuccess?: () => void) => Promise<boolean>;
  setPendingIntent: (intent: AuthIntent) => void;
  executePendingIntent: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error?: string; message?: string; sessionEstablished?: boolean }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string; message?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  updateProfileName: (newName: string) => Promise<{ error?: string }>;
  updateUserProfile: (payload: { full_name?: string; avatar_url?: string | null; text_size?: string }) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const getAppOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return 'http://localhost:3000';
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Pure helper function: Check if user has completed display name onboarding
export const checkIsProfileComplete = (currentUser: User | null, currentProfile: UserProfile | null): boolean => {
  if (!currentUser) return false;
  const fullName = currentProfile?.full_name?.trim() || currentUser.user_metadata?.full_name?.trim() || currentUser.user_metadata?.name?.trim();
  if (!fullName) return false;
  
  const emailPrefix = currentUser.email?.split('@')[0]?.trim().toLowerCase();
  if (emailPrefix && fullName.toLowerCase() === emailPrefix) {
    if (currentUser.user_metadata?.onboarding_completed) return true;
    return false;
  }
  return true;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('signup');
  const [oauthErrorMessage, setOauthErrorMessage] = useState<string | null>(null);
  const [pendingIntent, setPendingIntentState] = useState<AuthIntent>(null);

  // Keep a ref of pendingIntent to avoid stale closures during asynchronous auth flows
  const pendingIntentRef = useRef<AuthIntent>(null);
  const setPendingIntent = useCallback((intent: AuthIntent) => {
    pendingIntentRef.current = intent;
    setPendingIntentState(intent);
    if (intent) {
      try {
        localStorage.setItem('edtechra_pending_intent', JSON.stringify(intent));
      } catch (e) {
        // ignore
      }
    } else {
      try {
        localStorage.removeItem('edtechra_pending_intent');
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const isLoading = authState === 'loading';
  const isAuthenticated = authState === 'authenticated' && Boolean(user);
  const isProfileComplete = Boolean(isAuthenticated && checkIsProfileComplete(user, profile));

  const isAdmin = Boolean(
    user?.email?.toLowerCase().trim() === 'roshanjoyal520@gmail.com' &&
    (profile?.role === 'admin' || user?.email?.toLowerCase().trim() === 'roshanjoyal520@gmail.com')
  );

  // Safely fetch or resolve user profile from Supabase
  const fetchUserProfile = useCallback(async (currentUser: User): Promise<UserProfile | null> => {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) {
        console.warn('[Supabase Profile Query] Notice:', error.message);
      }

      const metaName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '';
      const effectiveName = data?.full_name?.trim() || metaName.trim() || '';

      const isUserAdmin = currentUser.email?.toLowerCase().trim() === 'roshanjoyal520@gmail.com';
      const resolvedRole = isUserAdmin ? 'admin' : (data?.role === 'admin' ? 'admin' : (data?.role || 'student'));

      if (data) {
        const userProfile: UserProfile = {
          id: data.id,
          email: data.email || currentUser.email || '',
          full_name: effectiveName || data.full_name || '',
          name: effectiveName || data.full_name || '',
          avatar_url: data.avatar_url || currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '',
          avatarUrl: data.avatar_url || currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '',
          text_size: data.text_size || localStorage.getItem('edtechra_text_size') || 'medium',
          role: resolvedRole,
          created_at: data.created_at || currentUser.created_at,
          updated_at: data.updated_at
        };
        return userProfile;
      }

      // Fallback profile if record doesn't exist yet
      const fallbackName = effectiveName || currentUser.email?.split('@')[0] || '';
      const fallbackProfile: UserProfile = {
        id: currentUser.id,
        email: currentUser.email || '',
        full_name: fallbackName,
        name: fallbackName,
        avatar_url: currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '',
        avatarUrl: currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '',
        text_size: (typeof window !== 'undefined' ? localStorage.getItem('edtechra_text_size') : null) || 'medium',
        role: resolvedRole,
        created_at: currentUser.created_at
      };

      return fallbackProfile;
    } catch (err) {
      console.error('[AuthContext] Unexpected error resolving user profile:', err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await fetchUserProfile(user);
      if (p) setProfile(p);
    }
  }, [user, fetchUserProfile]);

  // Execute and clear any pending navigation/action after successful login/onboarding
  const executePendingIntent = useCallback(() => {
    let intentToRun = pendingIntentRef.current;
    if (!intentToRun) {
      try {
        const saved = localStorage.getItem('edtechra_pending_intent');
        if (saved) {
          intentToRun = JSON.parse(saved);
        }
      } catch (e) {
        // ignore
      }
    }

    if (intentToRun) {
      setPendingIntent(null);

      if (intentToRun.type === 'navigate' && intentToRun.path) {
        window.dispatchEvent(new CustomEvent('edtechra:navigate', { detail: intentToRun.path }));
      } else if (intentToRun.type === 'action' && intentToRun.action === 'upload') {
        window.dispatchEvent(new CustomEvent('edtechra:open_upload_modal'));
      }
    }
  }, [setPendingIntent]);

  // Update profile name in Supabase database & Auth metadata
  const updateProfileName = async (newName: string): Promise<{ error?: string }> => {
    const trimmed = newName.trim();
    if (!trimmed) {
      return { error: 'Please enter a valid name.' };
    }
    if (trimmed.length < 2) {
      return { error: 'Name must be at least 2 characters.' };
    }

    if (!user || !supabase) {
      return { error: 'You must be authenticated to update your profile.' };
    }

    try {
      // 1. Upsert into public.profiles table
      const { error: dbError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email,
            full_name: trimmed,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'id' }
        );

      if (dbError) {
        console.warn('[AuthContext] Database profile upsert notice:', dbError.message);
      }

      // 2. Update Supabase Auth metadata
      try {
        await supabase.auth.updateUser({
          data: {
            full_name: trimmed,
            name: trimmed,
            onboarding_completed: true
          }
        });
      } catch (metaErr) {
        console.warn('[AuthContext] Auth metadata update notice:', metaErr);
      }

      // 3. Update local state
      setProfile((prev) => ({
        id: user.id,
        email: user.email || '',
        full_name: trimmed,
        name: trimmed,
        avatar_url: prev?.avatar_url || user.user_metadata?.avatar_url || '',
        avatarUrl: prev?.avatarUrl || user.user_metadata?.avatar_url || '',
        role: user.email?.toLowerCase().trim() === 'roshanjoyal520@gmail.com' ? 'admin' : (prev?.role || 'student'),
        created_at: prev?.created_at || user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // 4. Close modal and execute pending destination
      closeAuthModal();
      executePendingIntent();

      return {};
    } catch (err: any) {
      console.error('[AuthContext] updateProfileName exception:', err);
      return { error: err.message || 'Failed to save name.' };
    }
  };

  // Synchronize document text size attribute across whole application
  useEffect(() => {
    const savedSize = profile?.text_size || (typeof window !== 'undefined' ? localStorage.getItem('edtechra_text_size') : null) || 'medium';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-text-size', savedSize);
    }
  }, [profile?.text_size]);

  // Update user profile fields (display name, avatar_url, text_size)
  const updateUserProfile = async (payload: {
    full_name?: string;
    avatar_url?: string | null;
    text_size?: string;
  }): Promise<{ error?: string }> => {
    if (!user || !supabase) {
      return { error: 'You must be authenticated to update your profile.' };
    }

    try {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      if (payload.full_name !== undefined) {
        const trimmed = payload.full_name.trim();
        if (!trimmed) return { error: 'Please enter a valid name.' };
        updateData.full_name = trimmed;
      }

      if (payload.avatar_url !== undefined) {
        updateData.avatar_url = payload.avatar_url;
      }

      if (payload.text_size !== undefined) {
        updateData.text_size = payload.text_size;
        localStorage.setItem('edtechra_text_size', payload.text_size);
        document.documentElement.setAttribute('data-text-size', payload.text_size);
      }

      // Upsert into Supabase profiles table
      const { error: dbError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email,
            ...updateData
          },
          { onConflict: 'id' }
        );

      if (dbError) {
        console.warn('[AuthContext] Database profile update notice:', dbError.message);
      }

      // Update Supabase Auth user metadata
      try {
        const metaUpdates: Record<string, any> = {};
        if (payload.full_name !== undefined) {
          metaUpdates.full_name = payload.full_name.trim();
          metaUpdates.name = payload.full_name.trim();
        }
        if (payload.avatar_url !== undefined) {
          metaUpdates.avatar_url = payload.avatar_url;
          metaUpdates.picture = payload.avatar_url;
        }
        if (payload.text_size !== undefined) {
          metaUpdates.text_size = payload.text_size;
        }
        await supabase.auth.updateUser({ data: metaUpdates });
      } catch (metaErr) {
        console.warn('[AuthContext] Auth metadata update notice:', metaErr);
      }

      // Update local profile state immediately
      setProfile((prev) => ({
        id: user.id,
        email: user.email || '',
        full_name: payload.full_name !== undefined ? payload.full_name.trim() : (prev?.full_name || ''),
        name: payload.full_name !== undefined ? payload.full_name.trim() : (prev?.name || ''),
        avatar_url: payload.avatar_url !== undefined ? payload.avatar_url : (prev?.avatar_url || ''),
        avatarUrl: payload.avatar_url !== undefined ? (payload.avatar_url || '') : (prev?.avatarUrl || ''),
        text_size: payload.text_size !== undefined ? payload.text_size : (prev?.text_size || 'medium'),
        role: user.email?.toLowerCase().trim() === 'roshanjoyal520@gmail.com' ? 'admin' : (prev?.role || 'student'),
        created_at: prev?.created_at || user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      return {};
    } catch (err: any) {
      console.error('[AuthContext] updateUserProfile exception:', err);
      return { error: err.message || 'Failed to save profile changes.' };
    }
  };

  // Open modal helper with single-instance protection
  const openAuthModal = useCallback((mode: AuthModalMode = 'signup', intent?: AuthIntent) => {
    setAuthModalMode(mode);
    if (intent !== undefined) {
      setPendingIntent(intent);
    }
    setAuthModalOpen(true);
  }, [setPendingIntent]);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const clearOAuthError = useCallback(() => {
    setOauthErrorMessage(null);
  }, []);

  // Centralized Authentication Guard for protected actions
  const requireAuth = useCallback(async (
    destination?: AuthIntent | string,
    onSuccess?: () => void
  ): Promise<boolean> => {
    let normalizedIntent: AuthIntent = null;
    if (typeof destination === 'string') {
      normalizedIntent = { type: 'navigate', path: destination };
    } else if (destination) {
      normalizedIntent = destination;
    }

    // Step 1: If currently loading, wait for the session resolution
    if (authState === 'loading') {
      if (!supabase) {
        openAuthModal('signup', normalizedIntent);
        return false;
      }

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.user) {
          // Authenticated!
          if (onSuccess) {
            onSuccess();
          } else if (normalizedIntent?.type === 'navigate' && normalizedIntent.path) {
            window.dispatchEvent(new CustomEvent('edtechra:navigate', { detail: normalizedIntent.path }));
          }
          return true;
        }
      } catch (e) {
        // Fallback to unauthenticated
      }

      openAuthModal('signup', normalizedIntent);
      return false;
    }

    // Step 2: If already authenticated, continue immediately
    if (authState === 'authenticated' && user) {
      // Check if profile is complete
      const isComplete = checkIsProfileComplete(user, profile);
      if (!isComplete) {
        if (normalizedIntent) setPendingIntent(normalizedIntent);
        setAuthModalMode('name_prompt');
        setAuthModalOpen(true);
        return false;
      }

      if (onSuccess) {
        onSuccess();
      } else if (normalizedIntent?.type === 'navigate' && normalizedIntent.path) {
        window.dispatchEvent(new CustomEvent('edtechra:navigate', { detail: normalizedIntent.path }));
      }
      return true;
    }

    // Step 3: If unauthenticated, save intent and open modal
    openAuthModal('signup', normalizedIntent);
    return false;
  }, [authState, user, profile, openAuthModal, setPendingIntent]);

  // Initial Session Hydration on mount + Auth State Change Listener
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      if (!supabase) {
        if (isMounted) setAuthState('unauthenticated');
        return;
      }

      // Check for OAuth callback error in URL parameters or hash
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

      const errorParam = searchParams.get('error') || hashParams.get('error');
      const errorCode = searchParams.get('error_code') || hashParams.get('error_code');
      const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');

      if (errorParam || errorCode || errorDescription) {
        console.warn('[Supabase Auth] OAuth redirect error detected in URL:', {
          error: errorParam,
          errorCode,
          errorDescription
        });

        // Clean query/hash parameters from URL without reloading
        const cleanPath = window.location.pathname;
        window.history.replaceState({}, document.title, cleanPath);

        if (isMounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setAuthState('unauthenticated');

          const friendlyMsg = errorDescription
            ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
            : 'Google sign-in could not be completed. Please try again or sign in with email.';

          setOauthErrorMessage(friendlyMsg);
          setAuthModalMode('oauth_error');
          setAuthModalOpen(true);
        }
        return;
      }

      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('[AuthContext] Error retrieving session:', error.message);
        }

        if (!isMounted) return;

        if (currentSession?.user) {
          // Clean hash fragment or query params containing auth tokens to avoid repetitive clock-skew warnings
          if (typeof window !== 'undefined' && (window.location.hash.includes('access_token=') || window.location.search.includes('code='))) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }

          setSession(currentSession);
          setUser(currentSession.user);
          setAuthState('authenticated');

          const userProfile = await fetchUserProfile(currentSession.user);
          if (isMounted) {
            setProfile(userProfile);

            const isComplete = checkIsProfileComplete(currentSession.user, userProfile);
            if (!isComplete) {
              setAuthModalMode('name_prompt');
              setAuthModalOpen(true);
            } else {
              setAuthModalOpen(false);
              executePendingIntent();
            }
          }
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setAuthState('unauthenticated');
        }
      } catch (e) {
        console.error('[AuthContext] Session initialization error:', e);
        if (isMounted) {
          setAuthState('unauthenticated');
        }
      }
    }

    initSession();

    // Subscribe to auth state changes
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          if (!isMounted) return;

          console.log(`[Supabase Auth] event: ${event}`);

          if (event === 'PASSWORD_RECOVERY') {
            setSession(newSession);
            setUser(newSession?.user || null);
            setAuthState('authenticated');
            setAuthModalMode('reset_password');
            setAuthModalOpen(true);
            return;
          }

          if (newSession?.user) {
            setSession(newSession);
            setUser(newSession.user);
            setAuthState('authenticated');

            if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
              const userProfile = await fetchUserProfile(newSession.user);
              if (isMounted) {
                setProfile(userProfile);

                const isComplete = checkIsProfileComplete(newSession.user, userProfile);
                if (!isComplete) {
                  setAuthModalMode('name_prompt');
                  setAuthModalOpen(true);
                } else {
                  setAuthModalOpen(false);
                  executePendingIntent();
                }
              }
            }
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
            setAuthState('unauthenticated');
          }
        }
      );

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, [fetchUserProfile, executePendingIntent]);

  // Sign In with Email & Password
  const signInWithEmail = async (email: string, password: string): Promise<{ error?: string }> => {
    if (!supabase) return { error: 'Supabase is not configured' };

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return { error: 'Please enter your email address.' };
    }
    if (!password) {
      return { error: 'Please enter your password.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password
      });

      if (error) {
        const errorCode = (error as any).code || '';
        const errorMessage = error.message || '';

        if (errorCode === 'email_not_confirmed' || errorMessage.toLowerCase().includes('not confirmed')) {
          return {
            error: 'Your email has not been confirmed yet. Please check your email inbox for the confirmation link.'
          };
        }
        if (errorCode === 'invalid_credentials' || errorMessage.toLowerCase().includes('invalid login credentials')) {
          return { error: 'Incorrect email or password. Please try again.' };
        }
        return { error: errorMessage || 'Sign in failed. Please try again.' };
      }

      if (data.user && data.session) {
        setSession(data.session);
        setUser(data.user);
        setAuthState('authenticated');

        const userProfile = await fetchUserProfile(data.user);
        setProfile(userProfile);

        const isComplete = checkIsProfileComplete(data.user, userProfile);
        if (!isComplete) {
          setAuthModalMode('name_prompt');
          return {};
        }
      }

      closeAuthModal();
      executePendingIntent();
      return {};
    } catch (err: any) {
      return { error: err.message || 'An unexpected error occurred during sign in.' };
    }
  };

  // Sign Up with Email & Password
  const signUpWithEmail = async (
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ error?: string; message?: string; sessionEstablished?: boolean }> => {
    if (!supabase) return { error: 'Supabase is not configured' };

    const trimmedEmail = email.trim();
    const trimmedName = (fullName || '').trim();

    if (!trimmedEmail) {
      return { error: 'Please enter an email address.' };
    }
    if (!password || password.length < 6) {
      return { error: 'Password must be at least 6 characters long.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
            name: trimmedName
          },
          emailRedirectTo: `${getAppOrigin()}`
        }
      });

      if (error) {
        const errorCode = (error as any).code || '';
        const errorMessage = error.message || '';

        if (errorCode === 'email_address_invalid') {
          return {
            error: 'Please enter a valid email address with a recognized domain (e.g. name@gmail.com).'
          };
        }
        if (errorCode === 'weak_password') {
          return {
            error: 'Password is too weak. Please use at least 6 characters.'
          };
        }
        if (errorCode === 'user_already_exists') {
          return {
            error: 'An account with this email already exists. Please log in instead.'
          };
        }
        if (errorCode === 'over_email_send_rate_limit' || errorCode === 'over_request_rate_limit') {
          return {
            error: 'Too many signup attempts. Please wait a few minutes before trying again.'
          };
        }
        if (errorCode === 'signup_disabled') {
          return {
            error: 'New user registration is currently disabled. Please contact support.'
          };
        }
        if (errorCode === 'validation_failed') {
          return {
            error: errorMessage || 'Validation failed. Please check your registration details.'
          };
        }

        // Return actual Supabase error message without masking
        return { error: errorMessage || 'Registration failed. Please try again.' };
      }

      // Check if user already exists (Supabase returns empty identities array when email confirmation is active)
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return {
          error: 'An account with this email already exists. Please log in with your password instead.'
        };
      }

      // Case 1: Session was returned immediately (Email confirmation disabled or auto-confirmed)
      if (data.user && data.session) {
        setSession(data.session);
        setUser(data.user);
        setAuthState('authenticated');

        let userProfile = await fetchUserProfile(data.user);

        if (trimmedName) {
          try {
            await supabase.from('profiles').upsert(
              {
                id: data.user.id,
                email: data.user.email,
                full_name: trimmedName,
                updated_at: new Date().toISOString()
              },
              { onConflict: 'id' }
            );
            userProfile = {
              ...(userProfile || {
                id: data.user.id,
                email: data.user.email || '',
                role: 'student',
                created_at: new Date().toISOString()
              }),
              full_name: trimmedName,
              name: trimmedName
            };
          } catch (e) {
            console.warn('[AuthContext] Error upserting signup name:', e);
          }
        }

        setProfile(userProfile);

        const isComplete = checkIsProfileComplete(data.user, userProfile);
        if (!isComplete) {
          setAuthModalMode('name_prompt');
          return { sessionEstablished: true };
        }

        closeAuthModal();
        executePendingIntent();
        return { message: 'Account created successfully!', sessionEstablished: true };
      }

      // Case 2: Email confirmation required by Supabase configuration
      return {
        message: 'Account created! Please check your email inbox for the confirmation link to activate your account.',
        sessionEstablished: false
      };
    } catch (err: any) {
      return { error: err.message || 'An unexpected error occurred during registration.' };
    }
  };

  // Sign In with Google OAuth
  const signInWithGoogle = async (): Promise<{ error?: string }> => {
    if (!supabase) return { error: 'Supabase is not configured' };

    try {
      console.log('[OAuth] Google sign-in started');
      const redirectUrl = `${getAppOrigin()}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account'
          }
        }
      });

      if (error) {
        console.error('[OAuth] Google sign-in error:', error);
        return { error: error.message };
      }

      console.log('[OAuth] Google sign-in redirect initiated:', data?.url);
      return {};
    } catch (err: any) {
      console.error('[OAuth] Google sign-in exception:', err);
      return { error: err.message || 'Google Sign-In failed to initialize.' };
    }
  };

  // Reset Password (Send link)
  const resetPassword = async (email: string): Promise<{ error?: string; message?: string }> => {
    if (!supabase) return { error: 'Supabase is not configured' };

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${getAppOrigin()}`
      });

      if (error) return { error: error.message };
      return { message: 'Password reset link sent! Check your inbox.' };
    } catch (err: any) {
      return { error: err.message || 'Failed to send reset link.' };
    }
  };

  // Update Password (After recovery link is clicked)
  const updatePassword = async (newPassword: string): Promise<{ error?: string }> => {
    if (!supabase) return { error: 'Supabase is not configured' };
    const trimmed = newPassword.trim();
    if (!trimmed || trimmed.length < 6) {
      return { error: 'Password must be at least 6 characters long.' };
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: trimmed });
      if (error) return { error: error.message };
      closeAuthModal();
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to update password.' };
    }
  };

  // Sign Out
  const signOut = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[AuthContext] SignOut error:', err);
      }
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    setAuthState('unauthenticated');
    setPendingIntent(null);
    setOauthErrorMessage(null);
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        user,
        session,
        profile,
        isAdmin,
        isLoading,
        isAuthenticated,
        isProfileComplete,
        authModalOpen,
        authModalMode,
        oauthErrorMessage,
        pendingIntent,
        openAuthModal,
        closeAuthModal,
        clearOAuthError,
        requireAuth,
        setPendingIntent,
        executePendingIntent,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        resetPassword,
        updatePassword,
        updateProfileName,
        updateUserProfile,
        signOut,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

