import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
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
  const [showConfetti, setShowConfetti] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [isMuted, setIsMuted] = useState(() => quizAudioService.isMuted());

  // Choreographed tournament stage reveal:
  // 0 = dark arena + sweeping lights + victory intro + pedestals rise
  // 1 = 3rd place Bronze revealed
  // 2 = 2nd place Silver revealed
  // 3 = 1st place Gold Champion revealed + party-popper.mp3 + dual-side confetti cannons
  const [revealStage, setRevealStage] = useState<number>(0);

  // Dynamic session and quiz rehydration states
  const [loadedSession, setLoadedSession] = useState<LiveQuizSession | null>(initialSession || null);
  const [loadedQuiz, setLoadedQuiz] = useState<LiveQuiz | null>(initialQuiz || initialSession?.quiz || null);
  const [loadedResults, setLoadedResults] = useState<LiveQuizResult[]>(results);
  const [isSyncingResults, setIsSyncingResults] = useState<boolean>(results.length === 0);

  const activeSessionId = sessionId || initialSession?.id || loadedSession?.id || 'quiz_session';
  const startedChoreographyRef = useRef<string | null>(null);
  const choreographyTimersRef = useRef<number[]>([]);

  const handleToggleSound = () => {
    quizAudioService.unlockAudio();
    const nextMuted = quizAudioService.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      quizAudioService.playClick();
    }
  };

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

  // Sync sound settings & preload real audio files
  useEffect(() => {
    quizAudioService.setQuizFinished(true);
    quizAudioService.stopBackgroundMusic();
    quizAudioService.preloadQuizAudio();
    const unsubscribe = quizAudioService.subscribe((muted) => {
      setIsMuted(muted);
    });
    return () => {
      unsubscribe();
      quizAudioService.stopBackgroundMusic();
      quizAudioService.stopVictoryIntro();
    };
  }, []);

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
      liveQuizService
        .getSessionById(targetSessionId)
        .then((sess) => {
          if (sess && isSubscribed) {
            setLoadedSession(sess);
            if (sess.quiz) {
              setLoadedQuiz(sess.quiz);
            }
          }
        })
        .catch(() => {});
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
  }, [sessionId, initialSession?.id, loadedSession?.id, loadedQuiz]);

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

  // Deterministic Leaderboard & Podium Sorting Logic
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

  // Clean up reveal timers ONLY when switching sessions or unmounting (never cancel mid-reveal on Realtime updates)
  useEffect(() => {
    return () => {
      choreographyTimersRef.current.forEach((tid) => window.clearTimeout(tid));
      choreographyTimersRef.current = [];
      startedChoreographyRef.current = null;
    };
  }, [activeSessionId]);

  // Launch Podium Entrance & Champion Reveal Choreography once results arrive (never retriggered by Realtime updates)
  useEffect(() => {
    if (sortedPlayers.length === 0) {
      if (!isSyncingResults) {
        setRevealStage(3);
      }
      return;
    }
    if (startedChoreographyRef.current === activeSessionId) return;
    startedChoreographyRef.current = activeSessionId;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setRevealStage(3);
      setShowConfetti(true);
      quizAudioService.playChampionPartyPopper(activeSessionId);
      return;
    }

    // 1. Begin darkened arena + sweeping stage lights + opening notes of victory music
    setRevealStage(0);
    const tIntro = window.setTimeout(() => {
      quizAudioService.playVictoryIntro(activeSessionId);
    }, 30);

    // 2. Reveal 3rd Place Bronze
    const tBronze = window.setTimeout(() => {
      setRevealStage((prev) => Math.max(prev, 1));
    }, 380);

    // 3. Reveal 2nd Place Silver
    const tSilver = window.setTimeout(() => {
      setRevealStage((prev) => Math.max(prev, 2));
    }, 880);

    // 4. Reveal 1st Place Champion — Synchronized with party-popper.mp3 & dual-side confetti explosion
    const tChampion = window.setTimeout(() => {
      setRevealStage(3);
      setShowConfetti(true);
      quizAudioService.playChampionPartyPopper(activeSessionId);
    }, 1450);

    choreographyTimersRef.current = [tIntro, tBronze, tSilver, tChampion];
  }, [activeSessionId, isSyncingResults, sortedPlayers.length]);

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
    quizAudioService.stopVictoryIntro();
    if (onExit) {
      onExit();
    } else {
      navigate(`/classes/${classroomId || loadedSession?.classroom_id || ''}`);
    }
  };

  if (isSyncingResults && sortedPlayers.length === 0) {
    return (
      <div className="relative w-full max-w-[540px] mx-auto my-auto select-none">
        <div className="rounded-[28px] bg-white border border-[#DCEBFA] p-10 text-center space-y-3 shadow-[0_20px_50px_rgba(8,124,245,0.08)]">
          <div className="w-10 h-10 border-4 border-[#087CF5] border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-sm font-extrabold text-[#10245A]">Calculating Final Leaderboard...</h3>
          <p className="text-xs text-[#64748B]">Synchronizing all participant scores and rankings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[560px] mx-auto my-auto select-none">
      {/* Spectacular Dual-Side Confetti Explosion Synchronized with Champion Reveal */}
      {showConfetti && sortedPlayers.length > 0 && (
        <ConfettiCelebration
          variant="podium_champion"
          onComplete={() => setShowConfetti(false)}
          durationMs={4200}
        />
      )}

      {/* Main Competition Finale Shell */}
      <div className="relative rounded-[30px] overflow-hidden bg-[#081338] border border-[#1E3A8A]/70 shadow-[0_28px_70px_rgba(6,17,51,0.45)] animate-lq-stage-zoom">
        {/* Cinematic Darkened Arena Hero + Sweeping Spotlights + Top Header */}
        <div className="relative px-4 sm:px-6 pt-4 sm:pt-5 pb-0 bg-gradient-to-b from-[#061133] via-[#0B1E54] to-[#132C73] overflow-hidden">
          {/* Volumetric Stage Lighting Beams & Champion Radial Spotlight */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            {/* Left sweeping spotlight beam */}
            <div className="absolute -top-24 left-[10%] w-40 h-96 origin-top bg-gradient-to-b from-[#60A5FA]/35 via-[#38BDF8]/12 to-transparent blur-2xl animate-lq-spotlight-left" />
            {/* Right sweeping spotlight beam */}
            <div className="absolute -top-24 right-[10%] w-40 h-96 origin-top bg-gradient-to-b from-[#FDE047]/35 via-[#F59E0B]/12 to-transparent blur-2xl animate-lq-spotlight-right" />
            {/* Center Champion Hero Glow */}
            <div
              className={`absolute top-8 left-1/2 -translate-x-1/2 w-80 h-64 rounded-full bg-gradient-to-b from-[#FACC15]/35 via-[#08AEEF]/18 to-transparent blur-3xl transition-opacity duration-700 ${
                revealStage >= 3 ? 'opacity-100' : 'opacity-40'
              }`}
            />
          </div>

          {/* 1. TOP NAVIGATION BAR (Light Pill Surface Inside Dark Arena Header) */}
          <div className="relative z-20 rounded-2xl bg-white/95 backdrop-blur-xs px-3.5 py-2.5 shadow-[0_6px_24px_rgba(0,0,0,0.22)]">
            <QuizHeader
              uppercaseBrand={false}
              subtitle="WINNERS PODIUM"
              isMuted={isMuted}
              onToggleSound={handleToggleSound}
              rightSlot={
                <>
                  <ShareButton onClick={handleShare} copied={copiedShare} />
                  <ExitButton onClick={handleReturn} />
                </>
              }
            />
          </div>

          {/* Stage Announcement Pill */}
          <div className="relative z-10 flex justify-center mt-4">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 border border-[#FACC15]/40 text-[#FEF08A] text-[11px] font-black uppercase tracking-widest shadow-sm backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#FACC15]" />
              <span>
                {revealStage >= 3
                  ? 'Grand Champion Crowned!'
                  : revealStage === 2
                  ? 'Revealing #1 Champion...'
                  : revealStage === 1
                  ? 'Revealing #2 Silver...'
                  : 'Final Results Ready'}
              </span>
            </div>
          </div>

          {/* 2. 3D TOURNAMENT WINNERS PODIUM */}
          <div className="relative z-10 mt-1">
            <Podium players={podiumPlayers} revealStage={revealStage} />
          </div>
        </div>

        {/* 3. COMPLETE LEADERBOARD (ALWAYS MOUNTED, SHOWS ALL PARTICIPANTS) */}
        {allLeaderboardPlayers.length > 0 ? (
          <div className="relative z-20 p-3.5 sm:p-4 bg-white rounded-t-[26px] border-t border-[#DCEBFA] shadow-[0_-10px_30px_rgba(6,17,51,0.28)]">
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
