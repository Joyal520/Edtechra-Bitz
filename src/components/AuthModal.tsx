import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  User as UserIcon,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthModalMode } from '@/types';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    authModalMode,
    oauthErrorMessage,
    clearOAuthError,
    closeAuthModal,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    resetPassword,
    updatePassword,
    updateProfileName,
    profile,
    user
  } = useAuth();

  const [mode, setMode] = useState<AuthModalMode>(authModalMode);
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [showEmailFields, setShowEmailFields] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingGoogleRef = useRef(false);

  // Sync mode whenever context opens or updates
  useEffect(() => {
    setMode(authModalMode);
    setShowEmailFields(false);
    setError(null);
    setSuccessMessage(null);
    isSubmittingGoogleRef.current = false;

    const currentName = profile?.full_name || '';
    if (currentName) {
      setNameInput(currentName);
    }

    try {
      const savedRole = localStorage.getItem('edtechra_onboarding_role');
      if (savedRole === 'teacher' || profile?.role === 'teacher' || user?.user_metadata?.role === 'teacher') {
        setRole('teacher');
      }
    } catch (e) {
      // ignore
    }

    if (authModalMode === 'name_prompt') {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [authModalMode, authModalOpen, profile, user]);

  if (!authModalOpen) return null;

  // Handle Google Sign In with role preservation
  const handleGoogleAuth = async () => {
    if (isSubmittingGoogleRef.current || loading) return;
    isSubmittingGoogleRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await signInWithGoogle(role);
      if (res.error) {
        setError(res.error);
        setLoading(false);
        isSubmittingGoogleRef.current = false;
      }
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed.');
      setLoading(false);
      isSubmittingGoogleRef.current = false;
    }
  };

  // Handle Name & Role Submission for onboarding
  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setError('Please tell us your preferred name.');
      return;
    }
    if (trimmed.length < 2) {
      setError('Please enter a name with at least 2 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await updateProfileName(trimmed, role);
      if (res.error) {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save profile.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Email Sign In / Sign Up
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (mode !== 'forgot_password') {
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const res = await signUpWithEmail(trimmedEmail, password, nameInput, role);
        if (res.error) {
          setError(res.error);
        } else {
          setSuccessMessage(res.message || 'Account created successfully!');
        }
      } else if (mode === 'login') {
        const res = await signInWithEmail(trimmedEmail, password);
        if (res.error) {
          setError(res.error);
        }
      } else if (mode === 'forgot_password') {
        const res = await resetPassword(trimmedEmail);
        if (res.error) {
          setError(res.error);
        } else {
          setSuccessMessage(res.message || 'Password reset email sent!');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div className="w-full max-w-md bg-[#fbfbf7] rounded-[32px] shadow-2xl border border-stone-200/90 p-6 sm:p-8 space-y-6 relative animate-in zoom-in-95 duration-200">
        
        {/* Close Button (Hidden on mandatory name prompt) */}
        {mode !== 'name_prompt' && (
          <button
            onClick={() => {
              clearOAuthError();
              closeAuthModal();
            }}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* ========================================================================= */}
        {/* MODE: OAUTH ERROR RECOVERY                                               */}
        {/* ========================================================================= */}
        {mode === 'oauth_error' && (
          <div className="space-y-5">
            {/* Branding Header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#0f233a] tracking-tight">
                Google Sign-In Issue
              </h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Google authentication could not be completed at this time.
              </p>
            </div>

            {/* Error Message Box */}
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-1 text-xs text-rose-800">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Authentication Notice</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-normal pl-5">
                {oauthErrorMessage || error || 'The authorization request was interrupted or missing required security parameters. Please try signing in again, or continue with email.'}
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full py-3.5 px-4 bg-white hover:bg-stone-50 text-slate-800 font-extrabold text-xs sm:text-sm rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>{loading ? 'Connecting to Google...' : 'Try Google Sign-In Again'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setShowEmailFields(true);
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="w-full py-3 px-4 bg-[#026fc3] hover:bg-[#025ea6] text-white font-extrabold text-xs rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Sign up with email instead</span>
              </button>
            </div>

            <div className="pt-2 text-center text-xs text-slate-500 font-semibold border-t border-stone-200/60">
              <span>Already have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="font-extrabold text-[#026fc3] hover:underline cursor-pointer"
              >
                Log in with email
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE: NAME ONBOARDING STEP ("How can we call you, dear?")                 */}
        {/* ========================================================================= */}
        {mode === 'name_prompt' && (
          <div className="space-y-6 text-center pt-2">
            
            <div className="w-14 h-14 rounded-full bg-brand-50 border border-brand-200 text-[#026fc3] flex items-center justify-center mx-auto shadow-2xs">
              <Sparkles className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-[26px] font-black text-[#0f233a] tracking-tight">
                How can we call you, dear?
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto">
                Tell us your name so we can personalize your learning journey and track your milestones.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-700 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleNameSubmit} className="space-y-4 pt-1">
              <div className="relative">
                <input
                  ref={nameInputRef}
                  type="text"
                  required
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-5 py-3.5 bg-white border border-stone-200/90 rounded-2xl text-sm font-extrabold text-slate-900 text-center placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3] shadow-2xs transition-all"
                />
              </div>

              {/* Role Selection in Name Prompt */}
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">I am joining as a:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      role === 'student'
                        ? 'bg-blue-50/80 border-[#026fc3] ring-2 ring-[#026fc3]/20 shadow-xs'
                        : 'bg-white border-stone-200/90 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-xl flex items-center justify-center ${role === 'student' ? 'bg-[#026fc3] text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <GraduationCap className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-xs font-black ${role === 'student' ? 'text-[#026fc3]' : 'text-slate-700'}`}>Student</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">Join classes & learn</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      role === 'teacher'
                        ? 'bg-purple-50/80 border-purple-600 ring-2 ring-purple-600/20 shadow-xs'
                        : 'bg-white border-stone-200/90 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-xl flex items-center justify-center ${role === 'teacher' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-xs font-black ${role === 'teacher' ? 'text-purple-700' : 'text-slate-700'}`}>Teacher</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">Create classes & teach</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-sm font-black rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-60"
              >
                <span>{loading ? 'Saving...' : 'Continue'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE: SIGN UP                                                             */}
        {/* ========================================================================= */}
        {mode === 'signup' && (
          <div className="space-y-5">
            
            {/* Branding Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 mb-1">
                <img
                  src="/logo.png"
                  alt="EdTechra Bitz"
                  className="w-9 h-9 rounded-xl object-cover shadow-xs"
                />
                <span className="text-lg font-black text-[#0f233a]">EdTechra <span className="text-[#026fc3]">BITZ</span></span>
              </div>
              <h2 className="text-2xl font-black text-[#0f233a] tracking-tight">
                Welcome to EdTechra Bitz
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                Create your free account to continue learning, creating, and exploring.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Dedicated Success / Email Confirmation View */}
            {successMessage ? (
              <div className="text-center space-y-4 py-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xl font-black text-[#0f233a] tracking-tight">
                    Check your email
                  </h3>
                  <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                    {successMessage}
                  </p>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setSuccessMessage(null);
                      setError(null);
                    }}
                    className="w-full py-3 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-2xl shadow-xs transition-all cursor-pointer"
                  >
                    Proceed to Log In
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      closeAuthModal();
                    }}
                    className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-slate-600 text-xs font-bold rounded-2xl transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Account Type Selector: Student or Teacher */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">I am joining as a:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        role === 'student'
                          ? 'bg-blue-50/80 border-[#026fc3] ring-2 ring-[#026fc3]/20 shadow-xs'
                          : 'bg-white border-stone-200/90 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-xl flex items-center justify-center ${role === 'student' ? 'bg-[#026fc3] text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <GraduationCap className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xs font-black ${role === 'student' ? 'text-[#026fc3]' : 'text-slate-700'}`}>Student</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">Join classes & learn</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('teacher')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        role === 'teacher'
                          ? 'bg-purple-50/80 border-purple-600 ring-2 ring-purple-600/20 shadow-xs'
                          : 'bg-white border-stone-200/90 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-xl flex items-center justify-center ${role === 'teacher' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xs font-black ${role === 'teacher' ? 'text-purple-700' : 'text-slate-700'}`}>Teacher</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">Create classes & teach</span>
                    </button>
                  </div>
                </div>

                {/* Primary Action: Google Authentication */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-white hover:bg-stone-50 text-slate-800 font-extrabold text-xs sm:text-sm rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>Continue as {role === 'teacher' ? 'Teacher' : 'Student'} with Google</span>
                  </button>

                  {/* Secondary Option: Email Form Accordion */}
                  {!showEmailFields ? (
                    <button
                      type="button"
                      onClick={() => setShowEmailFields(true)}
                      className="w-full py-3 px-4 bg-transparent hover:bg-stone-100/70 text-slate-600 font-extrabold text-xs rounded-2xl border border-stone-200/80 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>Sign up with email as {role === 'teacher' ? 'Teacher' : 'Student'}</span>
                    </button>
                  ) : (
                    <form onSubmit={handleEmailSubmit} className="space-y-3 pt-2">
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          placeholder="Your name (e.g. Alex)"
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200/90 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3]"
                        />
                      </div>

                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email address"
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200/90 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3]"
                        />
                      </div>

                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create password (6+ chars)"
                          className="w-full pl-10 pr-10 py-2.5 bg-white border border-stone-200/90 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-2xl shadow-xs transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
                      >
                        {loading ? 'Creating Account...' : 'Create Free Account'}
                      </button>
                    </form>
                  )}
                </div>

                {/* Toggle to Login */}
                <div className="pt-2 text-center text-xs text-slate-500 font-semibold border-t border-stone-200/60">
                  <span>Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="font-extrabold text-[#026fc3] hover:underline cursor-pointer"
                  >
                    Log in
                  </button>
                </div>
              </>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE: LOG IN                                                              */}
        {/* ========================================================================= */}
        {mode === 'login' && (
          <div className="space-y-5">
            
            {/* Branding Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 mb-1">
                <img
                  src="/logo.png"
                  alt="EdTechra-Bitz"
                  className="w-9 h-9 rounded-full object-cover shadow-2xs ring-1 ring-[#026fc3]/20"
                />
                <span className="text-lg font-black text-[#0f233a]">EdTechra <span className="text-[#026fc3]">BITZ</span></span>
              </div>
              <h2 className="text-2xl font-black text-[#0f233a] tracking-tight">
                Welcome Back
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                Log in to resume your lessons, quiz scores, and streak.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Primary Action: Google Authentication */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-white hover:bg-stone-50 text-slate-800 font-extrabold text-xs sm:text-sm rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-stone-200/80"></div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">or</span>
              <div className="flex-1 h-px bg-stone-200/80"></div>
            </div>

            {/* Email Login Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200/90 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3]"
                />
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-stone-200/90 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot_password');
                    setError(null);
                  }}
                  className="text-[11px] font-bold text-slate-400 hover:text-[#026fc3] transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-2xl shadow-xs transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Logging In...' : 'Log In'}
              </button>
            </form>

            {/* Toggle to Sign Up */}
            <div className="pt-2 text-center text-xs text-slate-500 font-semibold border-t border-stone-200/60">
              <span>Don't have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className="font-extrabold text-[#026fc3] hover:underline cursor-pointer"
              >
                Sign up free
              </button>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE: FORGOT PASSWORD                                                     */}
        {/* ========================================================================= */}
        {mode === 'forgot_password' && (
          <div className="space-y-5">
            <div className="text-center space-y-1.5">
              <h2 className="text-2xl font-black text-[#0f233a] tracking-tight">
                Reset Password
              </h2>
              <p className="text-xs text-slate-500">
                Enter your email address and we'll send a password recovery link.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleEmailSubmit} className="space-y-3.5">
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your account email"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200/90 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-2xl shadow-xs transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Sending Link...' : 'Send Recovery Link'}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-stone-200/60">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-500 hover:text-[#026fc3] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Log in</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE: SET NEW PASSWORD (RECOVERY)                                        */}
        {/* ========================================================================= */}
        {mode === 'reset_password' && (
          <div className="space-y-5">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-[#026fc3] flex items-center justify-center mx-auto shadow-xs border border-brand-100">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-[#0f233a] tracking-tight">
                Set New Password
              </h2>
              <p className="text-xs text-slate-500">
                Please enter a secure new password for your account.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!password || password.length < 6) {
                  setError('Password must be at least 6 characters long.');
                  return;
                }
                setLoading(true);
                setError(null);
                try {
                  const res = await updatePassword(password);
                  if (res.error) {
                    setError(res.error);
                  } else {
                    setSuccessMessage('Password updated successfully!');
                  }
                } catch (err: any) {
                  setError(err.message || 'Failed to update password.');
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-3.5"
            >
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-stone-200/90 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-2xl shadow-xs transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Saving...' : 'Update Password & Continue'}
              </button>
            </form>
          </div>
        )}

      </div>

    </div>
  );
};
