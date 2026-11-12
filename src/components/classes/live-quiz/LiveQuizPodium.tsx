import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LiveQuizResult, LiveQuizSession, LiveQuiz } from '@/types/liveQuiz';
import { quizAudioService } from '@/services/quizAudioService';
import { liveQuizService } from '@/services/liveQuizService';
import { supabase } from '@/lib/supabase';
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
  const [isSyncingResults, setIsSyncingResults] = useState<boolean>(results.length === 0);

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
  const playedAudioRef = React.useRef(false);

  useEffect(() => {
    quizAudioService.setQuizFinished(true);
    quizAudioService.stopBackgroundMusic();
    if (!playedAudioRef.current) {
      playedAudioRef.current = true;
      quizAudioService.playPodiumEntrance();
      setTimeout(() => quizAudioService.playTrophyReveal(), 550);
      setTimeout(() => quizAudioService.playConfettiBurst(), 900);
      quizAudioService.playQuizComplete(activeSessionId);
    }

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
      setLoadedResults((prev) => {
        if (results.length >= prev.length) return results;
        return prev;
      });
      setIsSyncingResults(false);
    }
  }, [results]);

  // Always fetch the complete authoritative leaderboard from Supabase on mount
  // and subscribe to realtime updates on live_quiz_results & live_quiz_participants
  // so partial 1st-place-only data is never shown.
  useEffect(() => {
    const targetSessionId = sessionId || initialSession?.id || loadedSession?.id;
    if (!targetSessionId || targetSessionId === 'quiz_session') {
      setIsSyncingResults(false);
      return;
    }

    let isSubscribed = true;
    let pollTimer: any = null;
    let attempts = 0;

    const fetchCompleteLeaderboard = async () => {
      if (!isSubscribed) return;
      try {
        const res = await liveQuizService.getResults(targetSessionId);
        if (!isSubscribed) return;
        if (res.data && res.data.length > 0) {
          setLoadedResults(res.data);
          setIsSyncingResults(false);
          // Re-verify once after 600ms in case final student submissions were just settling
          if (attempts < 2) {
            attempts++;
            pollTimer = setTimeout(fetchCompleteLeaderboard, 600);
          }
          return;
        }
      } catch {}

      attempts++;
      if (attempts < 6 && isSubscribed) {
        pollTimer = setTimeout(fetchCompleteLeaderboard, 500);
      } else if (isSubscribed) {
        setIsSyncingResults(false);
      }
    };

    fetchCompleteLeaderboard();

    // Realtime subscription for any late result / participant updates
    let realtimeChannel: any = null;
    if (supabase) {
      realtimeChannel = supabase
        .channel(`lq_podium_${targetSessionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'live_quiz_results',
            filter: `session_id=eq.${targetSessionId}`
          },
          () => {
            fetchCompleteLeaderboard();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'live_quiz_participants',
            filter: `session_id=eq.${targetSessionId}`
          },
          () => {
            fetchCompleteLeaderboard();
          }
        )
        .subscribe();
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
      if (realtimeChannel && supabase) {
        try {
          supabase.removeChannel(realtimeChannel);
        } catch {}
      }
    };
  }, [
    sessionId,
    initialSession?.id,
    loadedSession?.id,
    loadedQuiz
  ]);

  const activeQuiz = loadedQuiz || loadedSession?.quiz;

  // Filter out host/teacher and deduplicate by student_id
  const safeResults = useMemo(() => {
    const teacherId = loadedSession?.teacher_id || initialSession?.teacher_id;
    const dedupMap = new Map<string, LiveQuizResult>();

    for (const r of Array.isArray(loadedResults) ? loadedResults : []) {
      const sid = r.student_id || r.student?.id || r.id;
      if (!sid) continue;
      if (teacherId && (r.student_id === teacherId || r.student?.id === teacherId)) continue;

      const existing = dedupMap.get(sid);
      if (!existing || (r.score || 0) >= (existing.score || 0)) {
        dedupMap.set(sid, r);
      }
    }

    return Array.from(dedupMap.values());
  }, [loadedResults, loadedSession?.teacher_id, initialSession?.teacher_id]);

  // Deterministic Leaderboard & Podium Sorting Logic (Part 6):
  // 1. score DESC
  // 2. correct_count DESC
  // 3. avg_response_time_ms ASC (faster wins ties; 0 sorted after positive times)
  // 4. student_id ASC (ensures refreshing the page never changes tied rankings)
  const sortedPlayers = useMemo(() => {
    return [...safeResults].sort((a, b) => {
      const scoreDiff = (b.score || 0) - (a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      const correctDiff = (b.correct_count || 0) - (a.correct_count || 0);
      if (correctDiff !== 0) return correctDiff;
      const aRt = (a.avg_response_time_ms || 0) > 0 ? (a.avg_response_time_ms as number) : 999999999;
      const bRt = (b.avg_response_time_ms || 0) > 0 ? (b.avg_response_time_ms as number) : 999999999;
      if (aRt !== bRt) return aRt - bRt;
      return String(a.student_id || a.id).localeCompare(String(b.student_id || b.id));
    });
  }, [safeResults]);

  const totalQuestions =
    activeQuiz?.questions?.length ||
    sortedPlayers[0]?.total_questions ||
    sortedPlayers.reduce((max, r) => Math.max(max, (r.correct_count || 0) + (r.wrong_count || 0)), 0) ||
    10;

  // Top 3 players for the Podium (1st Gold, 2nd Silver, 3rd Bronze)
  const podiumPlayers: PodiumPlayerData[] = useMemo(() => {
    return sortedPlayers.slice(0, 3).map((res, idx) => ({
      id: res.student_id || res.id || `podium_${idx + 1}`,
      name: res.student?.full_name || `Player ${idx + 1}`,
      avatarUrl: res.student?.avatar_url,
      score: res.score || 0,
      correctCount: res.correct_count ?? 0
    }));
  }, [sortedPlayers]);

  // Complete Leaderboard below the podium: EVERY participant in descending order
  const allLeaderboardPlayers: LeaderboardRowData[] = useMemo(() => {
    return sortedPlayers.map((res, idx) => {
      const rank = idx + 1;
      return {
        id: res.student_id || res.id || `rank_${rank}`,
        rank,
        name: res.student?.full_name || `Player ${rank}`,
        avatarUrl: res.student?.avatar_url,
        correctCount: res.correct_count ?? 0,
        totalQuestions,
        score: res.score || 0,
        avgResponseTimeMs: res.avg_response_time_ms || 0
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

  if (isSyncingResults && sortedPlayers.length === 0) {
    return (
      <div className="relative w-full max-w-[460px] mx-auto my-auto select-none">
        <div className="rounded-[28px] bg-white border border-[#DCEBFA] p-10 text-center space-y-3 shadow-[0_20px_50px_rgba(8,124,245,0.08)]">
          <div className="w-10 h-10 border-4 border-[#087CF5] border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-sm font-extrabold text-[#10245A]">Calculating Final Leaderboard...</h3>
          <p className="text-xs text-[#64748B]">Synchronizing all participant scores and rankings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[460px] mx-auto my-auto select-none">
      {/* Celebration Particles */}
      {showConfetti && sortedPlayers.length > 0 && (
        <ConfettiCelebration onComplete={() => setShowConfetti(false)} durationMs={3800} />
      )}

      {/* Main Results Container Card with Part 13.D Camera Entrance */}
      <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-b from-[#EAF7FF] via-[#F2FAFF] to-white border border-[#DCEBFA] shadow-[0_20px_50px_rgba(8,124,245,0.08)] animate-lq-camera-in">
        {/* Dramatic stage lighting spotlight behind podium */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-96 h-60 bg-gradient-to-b from-[#FEF08A]/40 via-[#93C5FD]/25 to-transparent blur-3xl pointer-events-none animate-lq-spotlight" />
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

          {/* 2. 3D WINNERS PODIUM (1st Gold, 2nd Silver, 3rd Bronze) */}
          <div className="mt-2">
            <Podium players={podiumPlayers} />
          </div>
        </div>

        {/* 3. COMPLETE LEADERBOARD (EVERY PARTICIPANT IN DESCENDING ORDER) */}
        {allLeaderboardPlayers.length > 0 ? (
          <div className="relative z-20 -mt-1 p-3 sm:p-4 bg-white rounded-t-[26px] border-t border-[#E2EEF9] shadow-[0_-8px_24px_rgba(16,36,90,0.04)]">
            <Leaderboard
              players={allLeaderboardPlayers}
              totalAdditionalCount={allLeaderboardPlayers.length}
            />
          </div>
        ) : (
          <div className="relative z-20 h-4 bg-white rounded-t-[20px] border-t border-[#E2EEF9]" />
        )}
      </div>
    </div>
  );
};
