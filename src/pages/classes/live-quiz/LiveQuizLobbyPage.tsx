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
      setSession(s);
    } catch (err: any) {
      setError(err.message || 'Error loading lobby');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = () => {
    if (!session) return;
    navigate(`/classes/${classroomId || session.classroom_id}/live-quiz/host/${session.id}`);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-black text-slate-500">Entering live game lobby...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl space-y-2">
          <h2 className="text-sm font-black text-rose-800">Lobby Unavailable</h2>
          <p className="text-xs text-rose-600 font-medium">{error || 'This live quiz session is no longer active.'}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(classroomId ? `/classes/${classroomId}` : '/classes')}
          className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          Back to Classes
        </button>
      </div>
    );
  }

  const isHostTeacher = isTeacher || session.teacher_id === user?.id;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      <LiveQuizLobby
        session={session}
        isTeacher={isHostTeacher}
        onStartQuiz={handleStartQuiz}
      />
    </div>
  );
};
