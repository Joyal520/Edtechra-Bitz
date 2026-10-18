import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LiveQuizResult, LiveQuizSession, LiveQuiz } from '@/types/liveQuiz';
import { quizAudioService } from '@/services/quizAudioService';
import { liveQuizService } from '@/services/liveQuizService';
import { ConfettiCelebration } from './ConfettiCelebration';
import {
  QuizHeader,
  ShareButton,
  ExitButton,
  Podium,
  PodiumPlayerData,
  Leaderboard,
  LeaderboardRowData
} from './LiveQuizUI';

export interface LiveQuizPodiumProps {
  results?: LiveQuizResult[];
  classroomId: string;
  sessionId?: string;
  session?: LiveQuizSession | null;
  quiz?: LiveQuiz | null;
  onExit?: () => void;
}

export const LiveQuizPodium: React.FC<LiveQuizPodiumProps> = ({
  results = [],
  classroomId,
  sessionId,
  session: initialSession,
  quiz: initialQuiz,
  onExit
}) => {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);
  const [copiedShare, setCopiedShare] = useState(false);

  // Dynamic session and quiz rehydration states
  const [loadedSession, setLoadedSession] = useState<LiveQuizSession | null>(initialSession || null);
  const [loadedQuiz, setLoadedQuiz] = useState<LiveQuiz | null>(initialQuiz || initialSession?.quiz || null);
  const [loadedResults, setLoadedResults] = useState<LiveQuizResult[]>(results);

  const handleShare = async () => {
    quizAudioService.playClick();
    const shareText = `Check out our live quiz results on EdTechra!`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'EdTechra Live Quiz Results',
          text: shareText,
          url: window.location.href
        });
      } catch {}
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
      } catch {}
    }
  };

  const activeSessionId = sessionId || initialSession?.id || loadedSession?.id || 'quiz_session';

  useEffect(() => {
    quizAudioService.setQuizFinished(true);
    quizAudioService.stopBackgroundMusic();
    quizAudioService.playQuizComplete(activeSessionId);

    return () => {
      quizAudioService.stopBackgroundMusic();
    };
  }, [activeSessionId]);

  useEffect(() => {
    if (initialSession) setLoadedSession(initialSession);
    if (initialQuiz) {
      setLoadedQuiz(initialQuiz);
    }
  }, [initialSession, initialQuiz]);

  useEffect(() => {
    if (Array.isArray(results) && results.length > 0) {
      setLoadedResults(results);
    }
  }, [results]);

  useEffect(() => {
    const targetSessionId = sessionId || initialSession?.id;
    if (!targetSessionId) return;

    let isSubscribed = true;
    let pollTimer: any = null;
    let attempts = 0;

    const pollResults = async () => {
      if (!isSubscribed) return;
      try {
        const res = await liveQuizService.getResults(targetSessionId);
        if (res.data && res.data.length > 0 && isSubscribed) {
          setLoadedResults(res.data);
          return;
        }
      } catch {}

      attempts++;
      if (attempts < 6 && isSubscribed) {
        pollTimer = setTimeout(pollResults, 600);
      } else if (attempts >= 6 && isSubscribed) {
        try {
          const parts = await liveQuizService.getParticipants(targetSessionId);
          if (parts && parts.length > 0 && isSubscribed) {
            const fallbackResults: LiveQuizResult[] = parts.map((p, idx) => ({
              id: p.id,
              session_id: targetSessionId,
              classroom_id: loadedSession?.classroom_id || initialSession?.classroom_id || '',
              teacher_id: loadedSession?.teacher_id || initialSession?.teacher_id || '',
              student_id: p.student_id,
              quiz_id: loadedSession?.quiz_id || initialSession?.quiz_id || '',
              score: p.score || 0,
              points_awarded: p.score || 0,
              correct_count: Math.round((p.score || 0) / 10),
              wrong_count: Math.max(0, 10 - Math.round((p.score || 0) / 10)),
              total_questions: 10,
              accuracy_percentage: Math.min(100, Math.round(((p.score || 0) / 100) * 100)),
              final_rank: idx + 1,
              created_at: p.joined_at,
              student: {
                id: p.student_id,
                full_name: p.display_name,
                avatar_url: p.avatar_url,
                email: ''
              }
            }));
            setLoadedResults(fallbackResults);
          }
        } catch {}
      }
    };

    if (!loadedResults || loadedResults.length === 0) {
      pollResults();
    }

    if (!loadedQuiz) {
      liveQuizService.getSessionById(targetSessionId).then((sess) => {
        if (sess && isSubscribed) {
          setLoadedSession(sess);
          if (sess.quiz) {
            setLoadedQuiz(sess.quiz);
          }
        }
      }).catch(() => {});
    }

    return () => {
      isSubscribed = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [
    sessionId,
    initialSession?.id,
    loadedResults?.length,
    loadedQuiz,
    loadedSession?.classroom_id,
    loadedSession?.teacher_id,
    loadedSession?.quiz_id,
    initialSession?.classroom_id,
    initialSession?.teacher_id,
    initialSession?.quiz_id
  ]);

  const activeQuiz = loadedQuiz || loadedSession?.quiz;

  // Filter out host/teacher so podium displays student competitors
  const safeResults = useMemo(() => {
    const teacherId = loadedSession?.teacher_id || initialSession?.teacher_id;
    return (Array.isArray(loadedResults) ? loadedResults : []).filter((r) => {
      if (teacherId && r.student_id && r.student_id === teacherId) return false;
      if (teacherId && r.student?.id && r.student.id === teacherId) return false;
      return true;
    });
  }, [loadedResults, loadedSession?.teacher_id, initialSession?.teacher_id]);

  // Dynamic Leaderboard & Podium Sorting Logic (Section 11)
  const sortedPlayers = useMemo(() => {
    return [...safeResults].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [safeResults]);

  const totalQuestions =
    activeQuiz?.questions?.length ||
    sortedPlayers[0]?.total_questions ||
    sortedPlayers.reduce((max, r) => Math.max(max, (r.correct_count || 0) + (r.wrong_count || 0)), 0) ||
    10;

  // Top 3 players for the Podium ONLY (#1, #2, #3)
  const podiumPlayers: PodiumPlayerData[] = useMemo(() => {
    return sortedPlayers.slice(0, 3).map((res, idx) => ({
      id: res.id || res.student_id || `podium_${idx + 1}`,
      name: res.student?.full_name || `Player ${idx + 1}`,
      avatarUrl: res.student?.avatar_url,
      score: res.score || 0,
      correctCount: res.correct_count ?? 0
    }));
  }, [sortedPlayers]);

  // Remaining players (#4–#10) for the Leaderboard ONLY (never duplicate #1–#3)
  const remainingPlayers: LeaderboardRowData[] = useMemo(() => {
    return sortedPlayers.slice(3, 10).map((res, idx) => {
      const rank = idx + 4;
      return {
        id: res.id || res.student_id || `rank_${rank}`,
        rank,
        name: res.student?.full_name || `Player ${rank}`,
        avatarUrl: res.student?.avatar_url,
        correctCount: res.correct_count ?? 0,
        totalQuestions,
        score: res.score || 0
      };
    });
  }, [sortedPlayers, totalQuestions]);

  const handleReturn = () => {
    quizAudioService.playClick();
    quizAudioService.stopBackgroundMusic();
    if (onExit) {
      onExit();
    } else {
      navigate(`/classes/${classroomId || loadedSession?.classroom_id || ''}`);
    }
  };

  return (
    <div className="relative w-full max-w-[460px] mx-auto my-auto select-none">
      {/* Celebration Particles */}
      {showConfetti && sortedPlayers.length > 0 && (
        <ConfettiCelebration onComplete={() => setShowConfetti(false)} durationMs={2800} />
      )}

      {/* Main Results Container Card */}
      <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-b from-[#EAF7FF] via-[#F2FAFF] to-white border border-[#DCEBFA] shadow-[0_20px_50px_rgba(8,124,245,0.08)]">
        {/* Top Section: Header + Podium Hero */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-0">
          {/* 1. TOP NAVIGATION BAR */}
          <QuizHeader
            uppercaseBrand={false}
            subtitle="LIVE QUIZ RESULTS"
            rightSlot={
              <>
                <ShareButton onClick={handleShare} copied={copiedShare} />
                <ExitButton onClick={handleReturn} />
              </>
            }
          />

          {/* 2. 3D WINNERS PODIUM (#1, #2, #3 ONLY) */}
          <div className="mt-2">
            <Podium players={podiumPlayers} />
          </div>
        </div>

        {/* 3. LEADERBOARD CARD (PLAYERS #4–#10 ONLY) */}
        {remainingPlayers.length > 0 ? (
          <div className="relative z-20 -mt-1 p-3 sm:p-4 bg-white rounded-t-[26px] border-t border-[#E2EEF9] shadow-[0_-8px_24px_rgba(16,36,90,0.04)]">
            <Leaderboard
              players={remainingPlayers}
              totalAdditionalCount={remainingPlayers.length}
            />
          </div>
        ) : (
          <div className="relative z-20 h-4 bg-white rounded-t-[20px] border-t border-[#E2EEF9]" />
        )}
      </div>
    </div>
  );
};
