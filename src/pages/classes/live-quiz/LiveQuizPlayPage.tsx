import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { LiveQuizSession, LiveQuizResult } from '@/types/liveQuiz';
import { liveQuizService } from '@/services/liveQuizService';
import { LiveQuizStudentPlay } from '@/components/classes/live-quiz/LiveQuizStudentPlay';
import { LiveQuizPodium } from '@/components/classes/live-quiz/LiveQuizPodium';

export const LiveQuizPlayPage: React.FC = () => {
  const { classroomId, sessionId } = useParams<{ classroomId: string; sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const initialSession = (location.state as any)?.initialSession as LiveQuizSession | undefined;

  const [session, setSession] = useState<LiveQuizSession | null>(initialSession || null);
  const [loading, setLoading] = useState(!initialSession);
  const [isFinished, setIsFinished] = useState(false);
  const [finalResults, setFinalResults] = useState<LiveQuizResult[]>([]);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  const loadSession = async () => {
    if (!initialSession) {
      setLoading(true);
    }
    try {
      const s = await liveQuizService.getSessionById(sessionId || '');
      if (s) setSession(s);
    } catch (err) {
      console.error('Failed to load play session', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizFinished = useCallback((results: any) => {
    if (Array.isArray(results)) {
      setFinalResults(results);
    }
    setIsFinished(true);
  }, []);

  if (loading || !session) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-black text-slate-500">Connecting to game...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      {isFinished ? (
        <LiveQuizPodium
          results={finalResults}
          classroomId={classroomId || session.classroom_id}
          onExit={() => navigate(`/classes/${classroomId || session.classroom_id}`)}
        />
      ) : (
        <LiveQuizStudentPlay
          session={session}
          onQuizFinished={handleQuizFinished}
        />
      )}
    </div>
  );
};
