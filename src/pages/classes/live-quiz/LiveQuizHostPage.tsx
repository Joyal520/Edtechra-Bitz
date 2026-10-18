import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LiveQuizSession, LiveQuizResult } from '@/types/liveQuiz';
import { liveQuizService } from '@/services/liveQuizService';
import { LiveQuizTeacherHost } from '@/components/classes/live-quiz/LiveQuizTeacherHost';
import { LiveQuizPodium } from '@/components/classes/live-quiz/LiveQuizPodium';

export const LiveQuizHostPage: React.FC = () => {
  const { classroomId, sessionId } = useParams<{ classroomId: string; sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<LiveQuizSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [finalResults, setFinalResults] = useState<LiveQuizResult[]>([]);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  const loadSession = async () => {
    setLoading(true);
    try {
      const s = await liveQuizService.getSessionById(sessionId || '');
      if (s) {
        setSession(s);
        if (s.status === 'finished') {
          setIsFinished(true);
          const res = await liveQuizService.getResults(s.id);
          if (res.data && res.data.length > 0) {
            setFinalResults(res.data);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load host session', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    if (!sessionId) return;
    try {
      const res = await liveQuizService.finishQuiz(sessionId);
      if (res.data && res.data.length > 0) {
        setFinalResults(res.data);
      } else {
        for (let attempt = 0; attempt < 4; attempt++) {
          const fallback = await liveQuizService.getResults(sessionId);
          if (fallback.data && fallback.data.length > 0) {
            setFinalResults(fallback.data);
            break;
          }
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    } catch (err) {
      console.warn('Finish quiz notice:', err);
    }
    setIsFinished(true);
  };

  if (loading || !session) {
    return (
      <div className="w-full min-h-[100dvh] bg-gradient-to-br from-[#EAF7FF] via-[#F5FBFF] to-[#E6F4FF] flex flex-col items-center justify-center px-4 py-16 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#087CF5] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs sm:text-sm font-extrabold text-[#10245A]">
          Loading game host session...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100dvh] bg-gradient-to-br from-[#EAF7FF] via-[#F5FBFF] to-[#E6F4FF] flex flex-col items-center justify-center px-3 sm:px-4 py-4 sm:py-6">
      <div className="w-full max-w-5xl mx-auto">
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
          <LiveQuizTeacherHost
            session={session}
            onFinish={handleFinish}
          />
        )}
      </div>
    </div>
  );
};
