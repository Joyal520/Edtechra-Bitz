import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LiveQuizSession } from '@/types/liveQuiz';
import { liveQuizService } from '@/services/liveQuizService';
import { useAuth } from '@/context/AuthContext';
import { LiveQuizLobby } from '@/components/classes/live-quiz/LiveQuizLobby';

export const LiveQuizLobbyPage: React.FC = () => {
  const { classroomId, pin } = useParams<{ classroomId: string; pin: string }>();
  const navigate = useNavigate();
  const { user, isTeacher } = useAuth();

  const [session, setSession] = useState<LiveQuizSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pin) {
      loadSession();
    }
  }, [pin]);

  const loadSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await liveQuizService.getSessionByPin(pin || '');
      if (!s) {
        setError('Quiz session not found or ended.');
        setLoading(false);
        return;
      }

      const isHostTeacher = isTeacher || s.teacher_id === user?.id;

      // Only navigate to host/play if session is actively in progress or reveal
      if (s.status === 'in_progress' || s.status === 'reveal') {
        const activeSession = {
          ...s,
          status: 'in_progress' as const,
          current_question_index: s.current_question_index ?? 0
        };
        if (isHostTeacher) {
          navigate(`/classes/${classroomId || s.classroom_id}/live-quiz/host/${s.id}`, {
            state: { initialSession: activeSession },
            replace: true
          });
          return;
        } else {
          navigate(`/classes/${classroomId || s.classroom_id}/live-quiz/play/${s.id}`, {
            state: { initialSession: activeSession },
            replace: true
          });
          return;
        }
      }

      setSession(s);
    } catch (err: any) {
      setError(err.message || 'Error loading lobby');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!session) return;
    try {
      await liveQuizService.startSession(session.id, classroomId || session.classroom_id);
    } catch (e) {
      console.warn('[LiveQuizLobbyPage] startSession notice:', e);
    }
    navigate(`/classes/${classroomId || session.classroom_id}/live-quiz/host/${session.id}`);
  };

  if (loading) {
    return (
      <div className="w-full h-[100dvh] max-h-[100dvh] bg-[#060c1d] flex flex-col items-center justify-center text-center p-4 space-y-3">
        <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-black text-slate-400">Entering live game lobby...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="w-full h-[100dvh] max-h-[100dvh] bg-[#060c1d] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-6 bg-[#0c1a38] border border-white/10 rounded-3xl space-y-3 text-center">
          <h2 className="text-sm font-black text-rose-400">Lobby Unavailable</h2>
          <p className="text-xs text-slate-300 font-medium">{error || 'This live quiz session is no longer active.'}</p>
          <button
            type="button"
            onClick={() => navigate(classroomId ? `/classes/${classroomId}` : '/classes')}
            className="mt-3 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Back to Classes
          </button>
        </div>
      </div>
    );
  }

  const isHostTeacher = isTeacher || session.teacher_id === user?.id;

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col justify-center items-center p-0 sm:p-4 md:p-6 bg-[#060c1d]">
      <LiveQuizLobby
        session={session}
        isTeacher={isHostTeacher}
        onStartQuiz={handleStartQuiz}
      />
    </div>
  );
};
