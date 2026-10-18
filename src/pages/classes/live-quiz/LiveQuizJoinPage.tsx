import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle } from 'lucide-react';
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

      // Strict Host Guard: Host teacher must never join as a student participant
      if (session.teacher_id && user?.id && session.teacher_id === user.id) {
        if (session.status === 'in_progress' || session.status === 'reveal') {
          navigate(`/classes/${session.classroom_id}/live-quiz/host/${session.id}`);
        } else {
          navigate(`/classes/${session.classroom_id}/live-quiz/lobby/${cleanPin}`);
        }
        return;
      }

      // 2. Join session as participant
      const name = profile?.full_name || profile?.name || user?.email?.split('@')[0] || 'Student';
      await liveQuizService.joinSession({
        session_id: session.id,
        display_name: name,
        avatar_url: profile?.avatar_url || profile?.avatarUrl || undefined
      });

      // 3. Navigate to play if already active, otherwise to lobby
      if (session.status === 'in_progress' || session.status === 'reveal') {
        navigate(`/classes/${session.classroom_id}/live-quiz/play/${session.id}`, {
          state: { initialSession: session }
        });
      } else {
        navigate(`/classes/${session.classroom_id}/live-quiz/lobby/${cleanPin}`);
      }
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
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-[#EAF7FF] via-[#F5FBFF] to-[#E6F4FF] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-[28px] p-7 sm:p-8 shadow-[0_20px_50px_rgba(8,124,245,0.08)] border border-[#DCEBFA] space-y-6 text-center animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center gap-2">
          <img
            src="/logo.png"
            alt="EdTechra"
            className="w-14 h-14 rounded-2xl object-contain shadow-sm"
          />
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#087CF5]">
            EDTECHRA LIVE QUIZ
          </span>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-[#10245A] tracking-tight">
            Join Live Quiz
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] font-semibold">
            Enter the 6-digit PIN displayed on your teacher&apos;s screen
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-[#FFF1F5] border border-[#FECDD3] text-[#9F1239] text-xs font-bold flex items-center gap-2 text-left animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-[#F43F7A] shrink-0" />
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
              className="w-full text-center tracking-[0.3em] font-mono font-black text-3xl py-3.5 px-4 bg-[#F5FBFF] border-2 border-[#DCEBFA] rounded-2xl focus:border-[#087CF5] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#087CF5]/15 text-[#10245A] placeholder:text-[#94A3B8] placeholder:tracking-normal placeholder:font-sans placeholder:text-lg"
            />
          </div>

          <button
            type="submit"
            disabled={loading || inputPin.length < 6}
            className="w-full py-4 bg-gradient-to-r from-[#087CF5] via-[#0895F3] to-[#08AEEF] hover:brightness-105 text-white rounded-full font-extrabold text-sm sm:text-base shadow-[0_10px_25px_rgba(8,124,245,0.3)] flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>{loading ? 'Entering Game...' : 'Join Game'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-[#E6F1FC] space-y-2">
          <p className="text-[11px] text-[#64748B] font-medium">
            Enrolled in a class? You don&apos;t need a PIN — join directly from your classroom workspace.
          </p>
          <button
            type="button"
            onClick={() => navigate('/classes')}
            className="text-xs font-extrabold text-[#087CF5] hover:underline cursor-pointer"
          >
            Go to My Classrooms →
          </button>
        </div>
      </div>
    </div>
  );
};
