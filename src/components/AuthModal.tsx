import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthModalMode } from '@/types';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    authModalMode,
    closeAuthModal,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    resetPassword,
    updateProfileName
  } = useAuth();

  const [mode, setMode] = useState<AuthModalMode>(authModalMode);
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync mode if changed from props/context
  useEffect(() => {
    setMode(authModalMode);
    if (authModalMode === 'signup') {
      setSignupStep(1);
    }
    setError(null);
    setSuccessMessage(null);
  }, [authModalMode, authModalOpen]);

  if (!authModalOpen) return null;

  const validateName = (name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please tell us your name to continue.');
      return false;
    }
    if (trimmed.length < 2) {
      setError('Please enter a name with at least 2 characters.');
      return false;
    }
    if (trimmed.length > 60) {
      setError('Name cannot exceed 60 characters.');
      return false;
    }
    return true;
  };

  const handleStep1Continue = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateName(fullName)) return;
    setSignupStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (mode === 'name_prompt') {
      if (!validateName(fullName)) return;
      setLoading(true);
      try {
        const res = await updateProfileName(fullName);
        if (res.error) {
          setError(res.error);
        } else {
          closeAuthModal();
        }
      } catch (err: any) {
        setError(err.message || 'Failed to save name.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'signup' && signupStep === 1) {
      handleStep1Continue(e);
      return;
    }

    // Email format validation
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (mode !== 'forgot_password') {
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
    }

    if (mode === 'signup' && signupStep === 2) {
      if (!validateName(fullName)) {
        setSignupStep(1);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await signInWithEmail(email, password);
        if (res.error) {
          setError(res.error);
        }
      } else if (mode === 'signup') {
        const res = await signUpWithEmail(email, password, fullName);
        if (res.error) {
          setError(res.error);
        } else {
          setSuccessMessage(res.message || 'Registration successful!');
        }
      } else if (mode === 'forgot_password') {
        const res = await resetPassword(email);
        if (res.error) {
          setError(res.error);
        } else {
          setSuccessMessage(res.message || 'Reset link sent to your email.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const res = await signInWithGoogle(fullName.trim() || undefined);
      if (res.error) {
        setError(res.error);
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Google sign in failed.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200/80 p-6 sm:p-7 relative overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img
              src="/logo.png"
              alt="EdTechra-Bitz Logo"
              className="w-10 h-10 rounded-full object-cover shadow-2xs ring-2 ring-[#026fc3]/20"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black text-[#0f233a] tracking-tight">
                EdTechra
              </span>
              <span className="bg-[#026fc3] text-white text-[11px] font-extrabold px-2 py-0.5 rounded-lg shadow-2xs tracking-wide uppercase">
                Bitz
              </span>
            </div>
          </div>

          {/* Titles & Subtitles for each state */}
          {mode === 'signup' && signupStep === 1 && (
            <>
              <h2 className="text-xl sm:text-2xl font-black text-[#0f233a]">
                How can we call you?
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Tell us your name so we can personalize your learning experience.
              </p>
            </>
          )}

          {mode === 'signup' && signupStep === 2 && (
            <>
              <h2 className="text-xl sm:text-2xl font-black text-[#0f233a]">
                Create Your Account
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Nice to meet you, <strong className="text-[#026fc3]">{fullName.trim()}</strong>! Let's secure your account.
              </p>
            </>
          )}

          {mode === 'name_prompt' && (
            <>
              <h2 className="text-xl sm:text-2xl font-black text-[#0f233a]">
                How can we call you?
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Tell us your name so we can personalize your learning experience.
              </p>
            </>
          )}

          {mode === 'login' && (
            <>
              <h2 className="text-xl sm:text-2xl font-black text-[#0f233a]">
                Welcome Back!
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Log in to track your learning progress, XP, and quizzes
              </p>
            </>
          )}

          {mode === 'forgot_password' && (
            <>
              <h2 className="text-xl sm:text-2xl font-black text-[#0f233a]">
                Reset Your Password
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Enter your email address to receive password instructions
              </p>
            </>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: SIGN-UP STEP 1 & NAME PROMPT ("How can we call you?")              */}
        {/* ========================================================================= */}
        {((mode === 'signup' && signupStep === 1) || mode === 'name_prompt') && (
          <form onSubmit={mode === 'name_prompt' ? handleSubmit : handleStep1Continue} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Your name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={60}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Joyal"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#026fc3] focus:bg-white font-semibold text-slate-900"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
              <span className="text-[11px] text-slate-400 mt-1.5 block">
                This name will appear on your personalized dashboard and certificates.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !fullName.trim()}
              className="w-full py-3 px-4 bg-[#026fc3] hover:bg-[#025ea6] disabled:opacity-50 text-white rounded-2xl font-extrabold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <span>{mode === 'name_prompt' ? 'Save & Continue' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: SIGN-UP STEP 2 (Create Your Account)                              */}
        {/* ========================================================================= */}
        {mode === 'signup' && signupStep === 2 && (
          <div className="space-y-4">
            
            {/* Step 1 recap & edit name option */}
            <div className="flex items-center justify-between p-2.5 px-3.5 bg-brand-50/70 border border-brand-200/80 rounded-2xl text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#026fc3] text-white flex items-center justify-center text-[10px] font-bold">
                  ✓
                </div>
                <span className="font-extrabold text-slate-800">{fullName.trim()}</span>
              </div>
              <button
                type="button"
                onClick={() => setSignupStep(1)}
                className="text-[11px] font-bold text-[#026fc3] hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Change name</span>
              </button>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300/90 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-3 shadow-2xs hover:shadow-xs transition-all active:scale-98 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-stone-200"></div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                or with email
              </span>
              <div className="flex-1 h-px bg-stone-200"></div>
            </div>

            {/* Email & Password Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#026fc3] focus:bg-white font-medium"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#026fc3] focus:bg-white font-medium"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#026fc3] focus:bg-white font-medium"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#026fc3] hover:bg-[#025ea6] disabled:opacity-50 text-white rounded-xl font-extrabold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-2 active:scale-98"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: LOGIN & FORGOT PASSWORD                                           */}
        {/* ========================================================================= */}
        {(mode === 'login' || mode === 'forgot_password') && (
          <div className="space-y-4">
            
            {mode === 'login' && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300/90 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-3 shadow-2xs hover:shadow-xs transition-all active:scale-98 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-stone-200"></div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    or with email
                  </span>
                  <div className="flex-1 h-px bg-stone-200"></div>
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#026fc3] focus:bg-white font-medium"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {mode === 'login' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] font-bold text-[#026fc3] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#026fc3] focus:bg-white font-medium"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#026fc3] hover:bg-[#025ea6] disabled:opacity-50 text-white rounded-xl font-extrabold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-2 active:scale-98"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In' : 'Send Reset Link'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

          </div>
        )}

        {/* Modal Footer Switcher */}
        {mode !== 'name_prompt' && (
          <div className="mt-5 pt-4 border-t border-stone-100 text-center text-xs text-slate-500 font-medium">
            {mode === 'login' && (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setSignupStep(1);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="font-extrabold text-[#026fc3] hover:underline"
                >
                  Sign up free
                </button>
              </p>
            )}

            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="font-extrabold text-[#026fc3] hover:underline"
                >
                  Log in
                </button>
              </p>
            )}

            {mode === 'forgot_password' && (
              <p>
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="font-extrabold text-[#026fc3] hover:underline"
                >
                  Back to Login
                </button>
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
