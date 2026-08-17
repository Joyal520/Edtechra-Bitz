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
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error?: string; message?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string; message?: string }>;
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

      if (data) {
        const userProfile: UserProfile = {
          id: data.id,
          email: data.email || currentUser.email || '',
          full_name: data.full_name || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
          name: data.full_name || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
          avatar_url: data.avatar_url || currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '',
          avatarUrl: data.avatar_url || currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '',
          role: data.role === 'admin' ? 'admin' : 'student',
          created_at: data.created_at || currentUser.created_at,
          updated_at: data.updated_at
        };
        return userProfile;
      }

      // If profile record does not yet exist in table (e.g. before trigger runs), build temporary fallback from session
      const fallbackRole = currentUser.email?.toLowerCase().trim() === 'roshanjoyal520@gmail.com' ? 'admin' : 'student';
      const fallbackProfile: UserProfile = {
        id: currentUser.id,
        email: currentUser.email || '',
        full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
        name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
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
            if (isMounted) setProfile(userProfile);
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
            if (isMounted) setProfile(userProfile);
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        const userProfile = await fetchUserProfile(data.user);
        setProfile(userProfile);
      }

      closeAuthModal();
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
  ): Promise<{ error?: string; message?: string }> => {
    if (!supabase) return { error: 'Supabase is not configured' };

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName?.trim() || '',
            name: fullName?.trim() || ''
          },
          emailRedirectTo: `${window.location.origin}`
        }
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user && data.session) {
        setUser(data.user);
        setSession(data.session);
        const userProfile = await fetchUserProfile(data.user);
        setProfile(userProfile);
        closeAuthModal();
        return { message: 'Account created successfully!' };
      }

      return {
        message: 'Account created! Please check your email inbox to confirm your registration.'
      };
    } catch (err: any) {
      return { error: err.message || 'An unexpected error occurred during registration.' };
    }
  };

  // Sign In with Google OAuth
  const signInWithGoogle = async (): Promise<{ error?: string }> => {
    if (!supabase) return { error: 'Supabase is not configured' };

    try {
      // Dynamic redirect URL supporting both localhost & production Vercel URL
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
