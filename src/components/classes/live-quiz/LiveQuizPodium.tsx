import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Users,
  BarChart3,
  X,
  ArrowLeft,
  Share2
} from 'lucide-react';
import { LiveQuizResult, LiveQuizSession, LiveQuiz } from '@/types/liveQuiz';
import { quizAudioService } from '@/services/quizAudioService';
import { liveQuizService } from '@/services/liveQuizService';
import { getQuizCover, getQuizCategoryBadgeStyle, DEFAULT_QUIZ_COVER } from '@/utils/quizCover';
import { ConfettiCelebration } from './ConfettiCelebration';

export interface LiveQuizPodiumProps {
  results?: LiveQuizResult[];
  classroomId: string;
  sessionId?: string;
  session?: LiveQuizSession | null;
  quiz?: LiveQuiz | null;
  onExit?: () => void;
}

// ---------------------------------------------------------------------------
// Crown & Medal SVG Badges
// ---------------------------------------------------------------------------
const GoldTrophyIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 sm:w-9 sm:h-9 text-amber-300 drop-shadow-[0_0_16px_rgba(251,191,36,0.9)]" fill="currentColor">
    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
  </svg>
);

const SilverMedalIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7 text-sky-200 drop-shadow-[0_0_12px_rgba(186,230,253,0.8)]" fill="currentColor">
    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
  </svg>
);

const BronzeMedalIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.7)]" fill="currentColor">
    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
  </svg>
);

// Helper for initial avatars
const getInitials = (name?: string | null): string => {
  if (!name || !name.trim()) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

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
  const [showDetailedModal, setShowDetailedModal] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Dynamic session and quiz rehydration states
  const [loadedSession, setLoadedSession] = useState<LiveQuizSession | null>(initialSession || null);
  const [loadedQuiz, setLoadedQuiz] = useState<LiveQuiz | null>(initialQuiz || initialSession?.quiz || null);
  const [loadedResults, setLoadedResults] = useState<LiveQuizResult[]>(results);
  const [coverImgSrc, setCoverImgSrc] = useState<string>(() => getQuizCover(initialQuiz || initialSession?.quiz));

  const handleShare = async () => {
    quizAudioService.playClick();
    const shareText = `Check out our live quiz results on EdTechra: ${loadedQuiz?.title || 'Classroom Live Quiz'}!`;
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
      setCoverImgSrc(getQuizCover(initialQuiz));
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
            setCoverImgSrc(getQuizCover(sess.quiz));
          }
        }
      }).catch(() => {});
    }

    return () => {
      isSubscribed = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [sessionId, initialSession?.id, loadedResults?.length, loadedQuiz, loadedSession?.classroom_id, loadedSession?.teacher_id, loadedSession?.quiz_id, initialSession?.classroom_id, initialSession?.teacher_id, initialSession?.quiz_id]);

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

  const sorted = useMemo(() => {
    return [...safeResults].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [safeResults]);

  const totalParticipants = sorted.length;
  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];

  const totalQuestions =
    activeQuiz?.questions?.length ||
    sorted[0]?.total_questions ||
    sorted.reduce((max, r) => Math.max(max, (r.correct_count || 0) + (r.wrong_count || 0)), 0) ||
    5;

  const highestScore = sorted[0]?.score || 0;

  const avgAccuracy = totalParticipants > 0
    ? Math.round(sorted.reduce((acc, r) => acc + (r.accuracy_percentage || 0), 0) / totalParticipants)
    : 0;

  const avgScore = totalParticipants > 0
    ? Math.round(sorted.reduce((acc, r) => acc + (r.score || 0), 0) / totalParticipants)
    : 0;

  const handleReturn = () => {
    quizAudioService.playClick();
    quizAudioService.stopBackgroundMusic();
    if (onExit) {
      onExit();
    } else {
      navigate(`/classes/${classroomId || loadedSession?.classroom_id || ''}`);
    }
  };

  const badgeStyle = getQuizCategoryBadgeStyle(activeQuiz?.category || 'General');

  return (
    <div className="relative w-full max-w-2xl mx-auto min-h-[100dvh] flex flex-col justify-between p-3 sm:p-5 text-white bg-transparent select-none">
      
      {/* Lightweight Celebration Particles */}
      {showConfetti && totalParticipants > 0 && (
        <ConfettiCelebration onComplete={() => setShowConfetti(false)} durationMs={2800} />
      )}

      {/* Atmospheric Subtle Background Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -top-20 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      {/* 1. TOP BAR */}
      <div className="relative z-10 shrink-0 flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="EdTechra"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain"
          />
          <div>
            <div className="font-extrabold text-white text-sm sm:text-base leading-none tracking-tight">EdTechra</div>
            <div className="text-[10px] text-sky-400 font-bold uppercase tracking-wider mt-0.5">
              Live Quiz Results
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 text-xs font-bold transition-all cursor-pointer"
            title="Share Quiz Results"
          >
            <Share2 className="w-3.5 h-3.5 text-sky-400" />
            <span>{copiedShare ? 'Copied!' : 'Share'}</span>
          </button>

          <button
            type="button"
            onClick={handleReturn}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 text-xs font-bold transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* 2. QUIZ HEADER OVERVIEW (MINIMALIST, NO HEAVY BOX CARD) */}
      <div className="relative z-10 shrink-0 mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
              {activeQuiz?.category || 'General'}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              {totalQuestions} Questions • {totalParticipants} Student{totalParticipants === 1 ? '' : 's'}
            </span>
          </div>
          <h1 className="text-base sm:text-lg font-black text-white truncate" title={activeQuiz?.title}>
            {activeQuiz?.title || 'Live Classroom Quiz'}
          </h1>
        </div>

        {/* Small thumbnail */}
        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-sm bg-slate-800">
          <img
            src={coverImgSrc || DEFAULT_QUIZ_COVER}
            alt=""
            className="w-full h-full object-cover"
            onError={() => {
              if (coverImgSrc !== DEFAULT_QUIZ_COVER) setCoverImgSrc(DEFAULT_QUIZ_COVER);
            }}
          />
        </div>
      </div>

      {/* 3. 3D WINNERS' PODIUM SECTION */}
      <div className="relative z-10 my-auto py-3">
        {/* Zero participants */}
        {totalParticipants === 0 && (
          <div className="py-10 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-500 mx-auto animate-pulse" />
            <h3 className="text-sm font-black text-white">No Participant Scores Recorded</h3>
            <p className="text-xs text-slate-400">Quiz session completed without active submissions.</p>
          </div>
        )}

        {/* 1 Participant: Spotlight Champion */}
        {totalParticipants === 1 && first && (
          <div className="max-w-xs mx-auto flex flex-col items-center animate-in zoom-in-95 duration-500 text-center">
            <div className="mb-2">
              <GoldTrophyIcon />
            </div>

            <div className="relative mb-3">
              <div className="w-20 h-20 rounded-full bg-amber-400 text-slate-950 font-black text-xl flex items-center justify-center border-4 border-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.5)] overflow-hidden ring-4 ring-amber-400/30">
                {first.student?.avatar_url ? (
                  <img src={first.student.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{getInitials(first.student?.full_name)}</span>
                )}
              </div>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-md">
                #1
              </span>
            </div>

            <div className="text-base font-black text-amber-100 truncate w-full">
              {first.student?.full_name || 'Champion'}
            </div>
            <div className="text-sm font-black text-amber-300 font-mono mt-0.5">
              {first.score.toLocaleString()} pts
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {first.correct_count} of {totalQuestions} correct ({first.accuracy_percentage || 0}%)
            </div>
          </div>
        )}

        {/* 2 Participants: 2nd on Left, 1st on Right */}
        {totalParticipants === 2 && first && second && (
          <div className="flex items-end justify-center gap-3 sm:gap-6 max-w-md mx-auto w-full px-2">
            {/* 2nd Place */}
            <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-4 duration-500 max-w-[150px]">
              <div className="mb-1">
                <SilverMedalIcon />
              </div>

              <div className="relative mb-2">
                <div className="w-16 h-16 rounded-full bg-slate-200 text-slate-900 font-black text-base flex items-center justify-center border-3 border-sky-200 shadow-[0_0_15px_rgba(56,189,248,0.3)] overflow-hidden ring-4 ring-sky-400/20">
                  {second.student?.avatar_url ? (
                    <img src={second.student.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{getInitials(second.student?.full_name)}</span>
                  )}
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-sky-300 text-slate-950 font-black text-[10px]">
                  #2
                </span>
              </div>

              <div className="text-center w-full px-1 mb-2">
                <div className="text-xs font-bold text-white truncate">{second.student?.full_name || '2nd'}</div>
                <div className="text-xs font-bold text-sky-300 font-mono">{second.score.toLocaleString()} pts</div>
              </div>

              <div className="w-full h-14 rounded-t-2xl bg-gradient-to-b from-sky-500/25 to-slate-900/80 border-t-2 border-x border-sky-300/40 flex items-center justify-center">
                <span className="text-xl font-black text-sky-200/80">2</span>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-6 duration-600 max-w-[170px]">
              <div className="mb-1 animate-bounce">
                <GoldTrophyIcon />
              </div>

              <div className="relative mb-2">
                <div className="w-20 h-20 rounded-full bg-amber-400 text-slate-950 font-black text-lg flex items-center justify-center border-4 border-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.6)] overflow-hidden ring-4 ring-amber-400/30">
                  {first.student?.avatar_url ? (
                    <img src={first.student.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{getInitials(first.student?.full_name)}</span>
                  )}
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-md">
                  #1
                </span>
              </div>

              <div className="text-center w-full px-1 mb-2">
                <div className="text-sm font-black text-amber-100 truncate">{first.student?.full_name || 'Champion'}</div>
                <div className="text-xs sm:text-sm font-black text-amber-300 font-mono">{first.score.toLocaleString()} pts</div>
              </div>

              <div className="w-full h-20 rounded-t-2xl bg-gradient-to-b from-amber-500/30 to-slate-900/80 border-t-2 border-x border-amber-300/60 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                <span className="text-2xl font-black text-amber-200">1</span>
              </div>
            </div>
          </div>
        )}

        {/* 3+ Participants: Complete 1st, 2nd, 3rd Podium */}
        {totalParticipants >= 3 && first && second && third && (
          <div className="flex items-end justify-center gap-2 sm:gap-3 max-w-lg mx-auto w-full px-1">
            {/* 2nd Place */}
            <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-4 duration-500 max-w-[140px]">
              <div className="mb-1">
                <SilverMedalIcon />
              </div>

              <div className="relative mb-1.5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-200 text-slate-900 font-black text-sm flex items-center justify-center border-3 border-sky-200 shadow-[0_0_15px_rgba(56,189,248,0.3)] overflow-hidden ring-4 ring-sky-400/20">
                  {second.student?.avatar_url ? (
                    <img src={second.student.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{getInitials(second.student?.full_name)}</span>
                  )}
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-sky-300 text-slate-950 font-black text-[10px]">
                  #2
                </span>
              </div>

              <div className="text-center w-full px-1 mb-1.5">
                <div className="text-xs font-bold text-white truncate">{second.student?.full_name || '2nd'}</div>
                <div className="text-[11px] font-bold text-sky-300 font-mono">{second.score.toLocaleString()} pts</div>
              </div>

              <div className="w-full h-12 sm:h-14 rounded-t-2xl bg-gradient-to-b from-sky-500/20 to-slate-900/80 border-t-2 border-x border-sky-300/40 flex items-center justify-center">
                <span className="text-lg font-black text-sky-200/80">2</span>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-6 duration-600 max-w-[160px] z-10">
              <div className="mb-1 animate-bounce">
                <GoldTrophyIcon />
              </div>

              <div className="relative mb-1.5">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-amber-400 text-slate-950 font-black text-base flex items-center justify-center border-4 border-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.6)] overflow-hidden ring-4 ring-amber-400/30">
                  {first.student?.avatar_url ? (
                    <img src={first.student.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{getInitials(first.student?.full_name)}</span>
                  )}
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-md">
                  #1
                </span>
              </div>

              <div className="text-center w-full px-1 mb-1.5">
                <div className="text-xs sm:text-sm font-black text-amber-100 truncate">{first.student?.full_name || 'Champion'}</div>
                <div className="text-xs font-black text-amber-300 font-mono">{first.score.toLocaleString()} pts</div>
              </div>

              <div className="w-full h-18 sm:h-22 rounded-t-2xl bg-gradient-to-b from-amber-500/25 to-slate-900/80 border-t-2 border-x border-amber-300/60 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                <span className="text-2xl font-black text-amber-200">1</span>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-3 duration-400 max-w-[140px]">
              <div className="mb-1">
                <BronzeMedalIcon />
              </div>

              <div className="relative mb-1.5">
                <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center border-3 border-amber-400 shadow-[0_0_12px_rgba(217,119,6,0.3)] overflow-hidden ring-4 ring-amber-600/20">
                  {third.student?.avatar_url ? (
                    <img src={third.student.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{getInitials(third.student?.full_name)}</span>
                  )}
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                  #3
                </span>
              </div>

              <div className="text-center w-full px-1 mb-1.5">
                <div className="text-xs font-bold text-white truncate">{third.student?.full_name || '3rd'}</div>
                <div className="text-[11px] font-bold text-amber-300 font-mono">{third.score.toLocaleString()} pts</div>
              </div>

              <div className="w-full h-9 sm:h-11 rounded-t-2xl bg-gradient-to-b from-amber-700/20 to-slate-900/80 border-t-2 border-x border-amber-500/40 flex items-center justify-center">
                <span className="text-base font-black text-amber-400/80">3</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. KEY SESSION STATS (SLEEK 4 METRICS STRIP, NO HEAVY BOXES) */}
      <div className="relative z-10 shrink-0 my-2 py-2 px-3 rounded-2xl bg-white/[0.03] border border-white/10">
        <div className="grid grid-cols-4 gap-1 text-center divide-x divide-white/10">
          <div className="px-1">
            <div className="text-xs sm:text-sm font-black font-mono text-white leading-tight">{totalParticipants}</div>
            <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase mt-0.5">Players</div>
          </div>

          <div className="px-1">
            <div className="text-xs sm:text-sm font-black font-mono text-white leading-tight">{totalQuestions}</div>
            <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase mt-0.5">Questions</div>
          </div>

          <div className="px-1">
            <div className="text-xs sm:text-sm font-black font-mono text-amber-300 leading-tight">{highestScore}</div>
            <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase mt-0.5">Top Score</div>
          </div>

          <div className="px-1">
            <div className="text-xs sm:text-sm font-black font-mono text-emerald-400 leading-tight">
              {avgScore > 0 ? avgScore : `${avgAccuracy}%`}
            </div>
            <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase mt-0.5">Average</div>
          </div>
        </div>
      </div>

      {/* 5. INTEGRATED LEADERBOARD (CLEAN LIST, NO BOX-IN-A-BOX) */}
      {totalParticipants > 0 && (
        <div className="relative z-10 flex-1 min-h-0 flex flex-col justify-start my-2">
          <div className="flex items-center justify-between pb-1.5 mb-1 text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-200">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Leaderboard Standings</span>
            </span>
            <span className="text-[11px] text-slate-400">
              {totalParticipants} {totalParticipants === 1 ? 'Player' : 'Players'}
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-white/20">
            {sorted.map((res, index) => {
              const rank = index + 1;
              return (
                <div
                  key={res.id || index}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                    rank === 1
                      ? 'bg-amber-500/10 border border-amber-400/30'
                      : rank === 2
                      ? 'bg-sky-500/10 border border-sky-400/25'
                      : rank === 3
                      ? 'bg-amber-700/10 border border-amber-600/25'
                      : 'bg-white/[0.02] hover:bg-white/[0.05] border border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-5 text-center font-black font-mono text-xs ${
                      rank === 1 ? 'text-amber-300' : rank === 2 ? 'text-sky-300' : rank === 3 ? 'text-amber-500' : 'text-slate-500'
                    }`}>
                      #{rank}
                    </span>

                    <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden shrink-0">
                      {res.student?.avatar_url ? (
                        <img src={res.student.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{getInitials(res.student?.full_name)}</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-white truncate">
                        {res.student?.full_name || `Student ${rank}`}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {res.correct_count ?? 0} of {totalQuestions} correct
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-black text-xs sm:text-sm text-amber-300">
                      {res.score.toLocaleString()} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. BOTTOM NAVIGATION ACTIONS */}
      <div className="relative z-10 shrink-0 pt-2 flex flex-col sm:flex-row items-center gap-2">
        <button
          type="button"
          onClick={handleReturn}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-indigo-600/30 cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Live Quizzes</span>
        </button>

        {totalParticipants > 3 && (
          <button
            type="button"
            onClick={() => setShowDetailedModal(true)}
            className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
            <span>Full Standings</span>
          </button>
        )}
      </div>

      {/* 7. DETAILED STANDINGS MODAL */}
      {showDetailedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#091533] border border-sky-500/30 rounded-3xl p-5 shadow-2xl text-white space-y-3 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-white">Full Quiz Standings</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailedModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-1.5 flex-1 pr-1">
              {sorted.map((res, index) => {
                const rank = index + 1;
                return (
                  <div
                    key={res.id || index}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 text-center font-mono font-bold text-xs text-slate-400">
                        #{rank}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden shrink-0">
                        {res.student?.avatar_url ? (
                          <img src={res.student.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{getInitials(res.student?.full_name)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {res.student?.full_name || `Student ${rank}`}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {res.correct_count ?? 0} of {totalQuestions} correct
                        </div>
                      </div>
                    </div>

                    <div className="text-xs font-mono font-bold text-amber-300">
                      {res.score.toLocaleString()} pts
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-center border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowDetailedModal(false)}
                className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
