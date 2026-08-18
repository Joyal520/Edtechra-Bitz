import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserProfile, AuthModalMode, AuthIntent } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  authModalOpen: boolean;
  authModalMode: AuthModalMode;
  pendingIntent: AuthIntent;
  openAuthModal: (mode?: AuthModalMode, intent?: AuthIntent) => void;
  closeAuthModal: () => void;
  setPendingIntent: (intent: AuthIntent) => void;
  executePendingIntent: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error?: string; message?: string }>;
  signInWithGoogle: (pendingName?: string) => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string; message?: string }>;
  updateProfileName: (newName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('signup');
  const [pendingIntent, setPendingIntent] = useState<AuthIntent>(null);

  const isAdmin = Boolean(
    user?.email?.toLowerCase().trim() === 'roshanjoyal520@gmail.com' &&
    (profile?.role === 'admin' || user?.email?.toLowerCase().trim() === 'roshanjoyal520@gmail.com')
  );

  // Fetch or safely ensure profile from Supabase
  const fetchUserProfile = useCallback(async (currentUser: User): Promise<UserProfile | null> => {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        console.warn('[Supabase Profile Query] Notice:', {
          code: error.code,
          message: error.message
        });
      }

      // Check stored user name
      const storedName = localStorage.getItem('edtechra_user_name') || localStorage.getItem('edtechra_guest_name') || localStorage.getItem('edtechra_pending_name');
      let effectiveName = data?.full_name || storedName || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '';
      const pendingName = localStorage.getItem('edtechra_pending_name');

      if ((!data?.full_name || data.full_name === currentUser.email?.split('@')[0]) && effectiveName.trim()) {
        effectiveName = effectiveName.trim();
        try {
          await supabase
            .from('profiles')
            .update({ full_name: effectiveName, updated_at: new Date().toISOString() })
            .eq('id', currentUser.id);
          localStorage.removeItem('edtechra_pending_name');
        } catch (err) {
          console.warn('[AuthContext] Error applying name to database:', err);
        }
      } else if (pendingName) {
        localStorage.removeItem('edtechra_pending_name');
      }

      const isUserAdmin = currentUser.email?.toLowerCase().trim() === 'roshanjoyal520@gmail.com';
      const resolvedRole = isUserAdmin ? 'admin' : (data?.role === 'admin' ? 'student' : (data?.role || 'student'));

      if (data) {
        const userProfile: UserProfile = {
          id: data.id,
          email: data.email || currentUser.email || '',
          full_name: effectiveName || data.full_name || '',
          name: effectiveName || data.full_name || '',
          avatar_url: data.avatar_url || currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '',
          avatarUrl: data.avatar_url || currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '',
          role: resolvedRole,
          created_at: data.created_at || currentUser.created_at,
          updated_at: data.updated_at
        };
        return userProfile;
      }

      // Fallback profile if record doesn't exist yet
      const fallbackName = effectiveName || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || '';
      const fallbackProfile: UserProfile = {
        id: currentUser.id,
        email: currentUser.email || '',
        full_name: fallbackName,
        name: fallbackName,
        avatar_url: currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '',
        avatarUrl: currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '',
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
    let intentToRun = pendingIntent;
    if (!intentToRun) {
      const saved = localStorage.getItem('edtechra_pending_intent');
      if (saved) {
        try {
          intentToRun = JSON.parse(saved);
        } catch (e) {
          // ignore
        }
      }
    }

    if (intentToRun) {
      localStorage.removeItem('edtechra_pending_intent');
      setPendingIntent(null);

      if (intentToRun.type === 'navigate' && intentToRun.path) {
        window.dispatchEvent(new CustomEvent('edtechra:navigate', { detail: intentToRun.path }));
      } else if (intentToRun.type === 'action' && intentToRun.action === 'upload') {
        window.dispatchEvent(new CustomEvent('edtechra:open_upload_modal'));
      }
    }
  }, [pendingIntent]);

  // Update profile name in database, local storage & state
  const updateProfileName = async (newName: string): Promise<{ error?: string }> => {
    const trimmed = newName.trim();
    if (!trimmed) {
      return { error: 'Please enter a valid name.' };
    }

    localStorage.setItem('edtechra_user_name', trimmed);
    localStorage.setItem('edtechra_guest_name', trimmed);
    localStorage.setItem('edtechra_pending_name', trimmed);

    if (user && supabase) {
      try {
        await supabase
          .from('profiles')
          .update({
            full_name: trimmed,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      } catch (err: any) {
        console.warn('[AuthContext] Database update exception:', err);
      }
    }

    setProfile((prev) => {
      if (prev) {
        return { ...prev, full_name: trimmed, name: trimmed, updated_at: new Date().toISOString() };
      }
      return {
        id: user?.id || 'guest',
        email: user?.email || '',
        full_name: trimmed,
        name: trimmed,
        role: user?.email?.toLowerCase().trim() === 'roshanjoyal520@gmail.com' ? 'admin' : 'student',
        created_at: new Date().toISOString()
      };
    });

    closeAuthModal();
    executePendingIntent();
    return {};
  };

  // Initialize Session on mount
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      setIsLoading(true);
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('[AuthContext] Error getting initial session:', error.message);
        }

        if (isMounted) {
          if (currentSession?.user) {
            setSession(currentSession);
            setUser(currentSession.user);

            const userProfile = await fetchUserProfile(currentSession.user);
            if (isMounted) {
              setProfile(userProfile);

              // Check if user has no display name, prompt for name onboarding
              const hasNoName = !userProfile?.full_name?.trim() || userProfile?.full_name === currentSession.user.email?.split('@')[0];
              if (hasNoName && !localStorage.getItem('edtechra_user_name')) {
                setAuthModalMode('name_prompt');
                setAuthModalOpen(true);
              } else {
                // Check if there was a pending intent from Google OAuth redirect
                const savedIntent = localStorage.getItem('edtechra_pending_intent');
                if (savedIntent) {
                  executePendingIntent();
                }
              }
            }
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
          }
        }
      } catch (e) {
        console.error('[AuthContext] Session init failure:', e);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initSession();

    // Subscribe to auth state changes
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          if (!isMounted) return;

          console.log(`[Supabase Auth] onAuthStateChange event: ${event}`);
          setSession(newSession);
          setUser(newSession?.user || null);

          if (newSession?.user) {
            const userProfile = await fetchUserProfile(newSession.user);
            if (isMounted) {
              setProfile(userProfile);

              const hasNoName = !userProfile?.full_name?.trim() || userProfile?.full_name === newSession.user.email?.split('@')[0];
              if (hasNoName && !localStorage.getItem('edtechra_user_name')) {
                setAuthModalMode('name_prompt');
                setAuthModalOpen(true);
              } else {
                executePendingIntent();
              }
            }
          } else {
            if (isMounted) setProfile(null);
          }
          setIsLoading(false);
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

  const openAuthModal = (mode: AuthModalMode = 'signup', intent?: AuthIntent) => {
    setAuthModalMode(mode);
    if (intent !== undefined) {
      setPendingIntent(intent);
      if (intent) {
        localStorage.setItem('edtechra_pending_intent', JSON.stringify(intent));
      } else {
        localStorage.removeItem('edtechra_pending_intent');
      }
    }
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  // Sign In with Email & Password
  const signInWithEmail = async (email: string, password: string): Promise<{ error?: string }> => {
    if (!supabase) return { error: 'Supabase is not configured' };

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        if (error.message.toLowerCase().includes('not confirmed') || (error as any).code === 'email_not_confirmed') {
          return {
            error: 'Your email has not been confirmed yet. Please check your email inbox for the confirmation link.'
          };
        }
        return { error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        const userProfile = await fetchUserProfile(data.user);
        setProfile(userProfile);

        const hasNoName = !userProfile?.full_name?.trim() || userProfile?.full_name === data.user.email?.split('@')[0];
        if (hasNoName && !localStorage.getItem('edtechra_user_name')) {
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
    fullName: string
  ): Promise<{ error?: string; message?: string }> => {
    if (!supabase) return { error: 'Supabase is not configured' };

    const trimmedName = fullName.trim();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: trimmedName || '',
            name: trimmedName || ''
          },
          emailRedirectTo: `${window.location.origin}`
        }
      });

      if (error) {
        if (error.message.toLowerCase().includes('invalid')) {
          return {
            error: 'Please enter a valid email address with a recognized domain (e.g. name@gmail.com).'
          };
        }
        return { error: error.message };
      }

      if (trimmedName) {
        localStorage.setItem('edtechra_user_name', trimmedName);
      }

      if (data.user && data.session) {
        setUser(data.user);
        setSession(data.session);
        const userProfile = await fetchUserProfile(data.user);
        setProfile(userProfile);

        if (!trimmedName && !userProfile?.full_name?.trim()) {
          setAuthModalMode('name_prompt');
          return {};
        }

        closeAuthModal();
        executePendingIntent();
        return { message: 'Account created successfully!' };
      }

      return {
        message: 'Account created! Please check your email inbox for the confirmation link to activate your account.'
      };
    } catch (err: any) {
      return { error: err.message || 'An unexpected error occurred during registration.' };
    }
  };

  // Sign In with Google OAuth
  const signInWithGoogle = async (pendingName?: string): Promise<{ error?: string }> => {
    if (!supabase) return { error: 'Supabase is not configured' };

    try {
      if (pendingName?.trim()) {
        localStorage.setItem('edtechra_pending_name', pendingName.trim());
        localStorage.setItem('edtechra_user_name', pendingName.trim());
      }

      const redirectUrl = `${window.location.origin}`;

      const { error } = await supabase.auth.signInWithOAuth({
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
        return { error: error.message };
      }

      return {};
    } catch (err: any) {
      return { error: err.message || 'Google OAuth failed to initialize.' };
    }
  };

  // Reset Password
  const resetPassword = async (email: string): Promise<{ error?: string; message?: string }> => {
    if (!supabase) return { error: 'Supabase is not configured' };

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) return { error: error.message };
      return { message: 'Password reset link sent! Check your inbox.' };
    } catch (err: any) {
      return { error: err.message || 'Failed to send reset link.' };
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
    setUser(null);
    setSession(null);
    setProfile(null);
    localStorage.removeItem('edtechra_user_name');
    localStorage.removeItem('edtechra_pending_intent');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isLoading,
        authModalOpen,
        authModalMode,
        pendingIntent,
        openAuthModal,
        closeAuthModal,
        setPendingIntent,
        executePendingIntent,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        resetPassword,
        updateProfileName,
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
