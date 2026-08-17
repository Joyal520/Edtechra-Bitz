import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserProfile, AuthModalMode } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  authModalOpen: boolean;
  authModalMode: AuthModalMode;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
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
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');

  const isAdmin = Boolean(profile?.role === 'admin');

  // Fetch or safely ensure profile from Supabase
  const fetchUserProfile = useCallback(async (currentUser: User): Promise<UserProfile | null> => {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) {
        console.warn('[AuthContext] Error fetching profile from Supabase:', error.message);
      }

      // Check if there was a pending name saved from Step 1 before Google OAuth
      let effectiveName = data?.full_name || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '';
      const pendingName = localStorage.getItem('edtechra_pending_name');

      if ((!effectiveName || effectiveName === currentUser.email?.split('@')[0]) && pendingName?.trim()) {
        effectiveName = pendingName.trim();
        // Update database with the pending name
        try {
          await supabase
            .from('profiles')
            .update({ full_name: effectiveName, updated_at: new Date().toISOString() })
            .eq('id', currentUser.id);
          localStorage.removeItem('edtechra_pending_name');
        } catch (err) {
          console.warn('[AuthContext] Error applying pending name:', err);
        }
      } else if (pendingName) {
        localStorage.removeItem('edtechra_pending_name');
      }

      if (data) {
        const userProfile: UserProfile = {
          id: data.id,
          email: data.email || currentUser.email || '',
          full_name: effectiveName || data.full_name || '',
          name: effectiveName || data.full_name || '',
          avatar_url: data.avatar_url || currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '',
          avatarUrl: data.avatar_url || currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '',
          role: data.role === 'admin' ? 'admin' : 'student',
          created_at: data.created_at || currentUser.created_at,
          updated_at: data.updated_at
        };
        return userProfile;
      }

      // Fallback profile if record doesn't exist yet
      const fallbackRole = currentUser.email?.toLowerCase().trim() === 'roshanjoyal520@gmail.com' ? 'admin' : 'student';
      const fallbackProfile: UserProfile = {
        id: currentUser.id,
        email: currentUser.email || '',
        full_name: effectiveName,
        name: effectiveName,
        avatar_url: currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '',
        avatarUrl: currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '',
        role: fallbackRole,
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

  // Update profile name in database & local state
  const updateProfileName = async (newName: string): Promise<{ error?: string }> => {
    const trimmed = newName.trim();
    if (!trimmed) {
      return { error: 'Please enter a valid name.' };
    }

    if (!user || !supabase) {
      return { error: 'Not authenticated.' };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: trimmed,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        return { error: error.message };
      }

      setProfile((prev) => (prev ? { ...prev, full_name: trimmed, name: trimmed } : null));
      closeAuthModal();
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to update name.' };
    }
  };

  // Initialize Session on mount
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
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
              // If user is authenticated via Google but has no name, prompt for name
              if (!userProfile?.full_name?.trim()) {
                setAuthModalMode('name_prompt');
                setAuthModalOpen(true);
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
        if (isMounted) setIsLoading(false);
      }
    }

    initSession();

    // Subscribe to auth state changes (OAuth redirect, sign in, sign out, token refresh)
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, newSession) => {
          if (!isMounted) return;

          setSession(newSession);
          setUser(newSession?.user || null);

          if (newSession?.user) {
            const userProfile = await fetchUserProfile(newSession.user);
            if (isMounted) {
              setProfile(userProfile);
              // If user logged in and has empty name, show name prompt
              if (!userProfile?.full_name?.trim()) {
                setAuthModalMode('name_prompt');
                setAuthModalOpen(true);
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
  }, [fetchUserProfile]);

  const openAuthModal = (mode: AuthModalMode = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  // Sign In with Email & Password
  const signInWithEmail = async (email: string, password: string): Promise<{ error?: string }> => {
    if (!supabase) return { error: 'Supabase is not configured' };

    try {
      console.log('[Supabase Auth Diagnostic] Initiating signInWithEmail for:', email.trim());
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        console.warn('[Supabase Auth Diagnostic] Login error:', {
          message: error.message,
          status: error.status,
          code: (error as any).code
        });

        if (error.message.toLowerCase().includes('not confirmed') || (error as any).code === 'email_not_confirmed') {
          return {
            error: 'Your email has not been confirmed yet. Please check your email inbox (and spam folder) for the confirmation link sent by Supabase.'
          };
        }

        return { error: error.message };
      }

      console.log('[Supabase Auth Diagnostic] Login success:', {
        userId: data.user?.id,
        email: data.user?.email,
        hasSession: Boolean(data.session)
      });

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        const userProfile = await fetchUserProfile(data.user);
        setProfile(userProfile);
      }

      closeAuthModal();
      return {};
    } catch (err: any) {
      console.error('[Supabase Auth Diagnostic] Unexpected login failure:', err);
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
    if (!trimmedName) {
      return { error: 'Please enter your name.' };
    }

    try {
      console.log('[Supabase Auth Diagnostic] Initiating signUpWithEmail for:', email.trim(), 'with name:', trimmedName);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: trimmedName,
            name: trimmedName
          },
          emailRedirectTo: `${window.location.origin}`
        }
      });

      if (error) {
        console.warn('[Supabase Auth Diagnostic] SignUp error:', {
          message: error.message,
          status: error.status,
          code: (error as any).code
        });

        if (error.message.toLowerCase().includes('invalid')) {
          return {
            error: 'Please enter a valid email address with a recognized domain (e.g. name@gmail.com, name@outlook.com).'
          };
        }

        return { error: error.message };
      }

      console.log('[Supabase Auth Diagnostic] SignUp response:', {
        userId: data.user?.id,
        email: data.user?.email,
        confirmed: Boolean(data.user?.confirmed_at),
        hasSession: Boolean(data.session)
      });

      if (data.user && data.session) {
        setUser(data.user);
        setSession(data.session);
        const userProfile = await fetchUserProfile(data.user);
        setProfile(userProfile);
        closeAuthModal();
        return { message: 'Account created successfully!' };
      }

      // If email confirmation is enabled on Supabase
      return {
        message: 'Account created! Please check your email inbox (and spam folder) for the confirmation link to activate your account.'
      };
    } catch (err: any) {
      console.error('[Supabase Auth Diagnostic] Unexpected signup failure:', err);
      return { error: err.message || 'An unexpected error occurred during registration.' };
    }
  };

  // Sign In with Google OAuth
  const signInWithGoogle = async (pendingName?: string): Promise<{ error?: string }> => {
    if (!supabase) return { error: 'Supabase is not configured' };

    try {
      if (pendingName?.trim()) {
        localStorage.setItem('edtechra_pending_name', pendingName.trim());
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
        redirectTo: `${window.location.origin}`
      });

      if (error) {
        return { error: error.message };
      }

      return { message: 'Password reset link sent to your email.' };
    } catch (err: any) {
      return { error: err.message || 'Failed to send password reset email.' };
    }
  };

  // Sign Out
  const signOut = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('[AuthContext] Sign out error:', err);
      }
    }
    setUser(null);
    setSession(null);
    setProfile(null);
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
        openAuthModal,
        closeAuthModal,
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

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
