import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, AlertCircle } from 'lucide-react';
import { liveQuizService } from '@/services/liveQuizService';
import { useAuth } from '@/context/AuthContext';

export const LiveQuizJoinPage: React.FC = () => {
  const { pin } = useParams<{ pin?: string }>();
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, openAuthModal } = useAuth();

  const [inputPin, setInputPin] = useState(pin || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pin && isAuthenticated) {
      handleJoin(pin);
    }
  }, [pin, isAuthenticated]);

  const handleJoin = async (targetPin: string) => {
    const cleanPin = targetPin.trim();
    if (!cleanPin) return;

    if (!isAuthenticated) {
      openAuthModal('login', { type: 'action', action: `join_live_quiz_${cleanPin}` });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Check if session exists
      const session = await liveQuizService.getSessionByPin(cleanPin);
      if (!session) {
        setError('No active quiz found for this PIN. Please check the 6-digit code.');
        setLoading(false);
        return;
      }

      if (session.status === 'finished' || session.status === 'cancelled') {
        setError('This game session has already ended.');
        setLoading(false);
        return;
      }

      // 2. Join session as participant
      const name = profile?.full_name || profile?.name || user?.email?.split('@')[0] || 'Student';
      await liveQuizService.joinSession({
        session_id: session.id,
        display_name: name,
        avatar_url: profile?.avatar_url || profile?.avatarUrl || undefined
      });

      // 3. Navigate to lobby
      navigate(`/classes/${session.classroom_id}/live-quiz/lobby/${cleanPin}`);
    } catch (err: any) {
      setError(err.message || 'Failed to join game');
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleJoin(inputPin);
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 space-y-6 text-center animate-in zoom-in-95 duration-200">
        
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-purple-500/25">
          <Zap className="w-8 h-8 fill-current" />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Join Live Quiz
          </h1>
          <p className="text-xs text-slate-500 font-semibold">
            Enter the 6-digit PIN displayed on your teacher's screen
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 text-left animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              required
              maxLength={6}
              value={inputPin}
              onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 849201"
              className="w-full text-center tracking-[0.3em] font-mono font-black text-3xl py-3.5 px-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-purple-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-600/10 text-slate-900 placeholder:text-slate-300 placeholder:tracking-normal placeholder:font-sans placeholder:text-lg"
            />
          </div>

          <button
            type="submit"
            disabled={loading || inputPin.length < 6}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl font-extrabold text-sm shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>{loading ? 'Entering Game...' : 'Join Game'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 font-medium">
            Playing in a classroom? You can also launch quizzes directly from your <strong className="text-slate-600">Classroom Workspace</strong>.
          </p>
        </div>

      </div>
    </div>
  );
};
