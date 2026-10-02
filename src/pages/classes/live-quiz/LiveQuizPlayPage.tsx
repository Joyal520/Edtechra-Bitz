import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { LiveQuizSession, LiveQuizResult } from '@/types/liveQuiz';
import { liveQuizService } from '@/services/liveQuizService';
import { useAuth } from '@/context/AuthContext';
import { LiveQuizStudentPlay } from '@/components/classes/live-quiz/LiveQuizStudentPlay';
import { LiveQuizPodium } from '@/components/classes/live-quiz/LiveQuizPodium';

export const LiveQuizPlayPage: React.FC = () => {
  const { classroomId, sessionId } = useParams<{ classroomId: string; sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isTeacher } = useAuth();
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
      if (s) {
        // Strict Host Guard: If current user is the host teacher, redirect to host controls!
        const isHost = (s.teacher_id && user?.id && s.teacher_id === user.id) || isTeacher;
        if (isHost) {
          navigate(`/classes/${classroomId || s.classroom_id}/live-quiz/host/${s.id}`, {
            state: { initialSession: s },
            replace: true
          });
          return;
        }
        const scheduledTimeStr = s.scheduled_start_at || s.started_at;
        const isScheduledTimeReached = Boolean(scheduledTimeStr && new Date(scheduledTimeStr).getTime() <= Date.now());

        // If scheduled start time is reached, authoritatively treat as in_progress and reconcile
        if ((s.status === 'scheduled' || s.status === 'lobby') && isScheduledTimeReached) {
          s.status = 'in_progress';
          s.current_question_index = s.current_question_index ?? 0;
          if (!s.question_start_ms) {
            s.question_start_ms = initialSession?.question_start_ms || Date.now();
          }
          if (!s.question_duration_sec) {
            s.question_duration_sec = initialSession?.question_duration_sec || s.quiz?.questions?.[0]?.durationSec || 20;
          }
          if ((initialSession as any)?.questionEndsAtMs) {
            (s as any).questionEndsAtMs = (initialSession as any).questionEndsAtMs;
          }
          liveQuizService.reconcileScheduledSession(s.id, s.classroom_id).catch(() => {});
        } else if (initialSession?.status === 'in_progress' && (s.status === 'scheduled' || s.status === 'lobby')) {
          // Never downgrade an active session back to lobby
          s.status = 'in_progress';
          if (!s.question_start_ms && initialSession.question_start_ms) {
            s.question_start_ms = initialSession.question_start_ms;
          }
          if (!s.question_duration_sec && initialSession.question_duration_sec) {
            s.question_duration_sec = initialSession.question_duration_sec;
          }
          if ((initialSession as any)?.questionEndsAtMs) {
            (s as any).questionEndsAtMs = (initialSession as any).questionEndsAtMs;
          }
        }

        // Guarantee quiz questions are retained if s.quiz is missing
        if (!s.quiz?.questions?.length && initialSession?.quiz?.questions?.length) {
          s.quiz = initialSession.quiz;
        }

        setSession(s);
        if (s.status === 'finished') {
          setIsFinished(true);
          const { data } = await liveQuizService.getResults(s.id);
          if (data && data.length > 0) {
            setFinalResults(data);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load play session', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizFinished = useCallback(async (results: any) => {
    if (Array.isArray(results) && results.length > 0 && results[0]?.student?.full_name) {
      setFinalResults(results);
    } else if (sessionId) {
      try {
        const { data } = await liveQuizService.getResults(sessionId);
        if (data && data.length > 0) {
          setFinalResults(data);
        } else if (Array.isArray(results) && results.length > 0) {
          setFinalResults(results);
        }
      } catch {
        if (Array.isArray(results) && results.length > 0) {
          setFinalResults(results);
        }
      }
    } else if (Array.isArray(results)) {
      setFinalResults(results);
    }
    setIsFinished(true);
  }, [sessionId]);

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
          sessionId={session.id}
          session={session}
          quiz={session.quiz}
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
