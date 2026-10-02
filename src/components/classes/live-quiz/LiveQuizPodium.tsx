import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Users,
  Target,
  CheckCircle2,
  BarChart3,
  X,
  ArrowLeft
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
  <svg viewBox="0 0 24 24" className="w-7 h-7 sm:w-8 sm:h-8 text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]" fill="currentColor">
    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
  </svg>
);

const SilverMedalIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7 text-sky-200 drop-shadow-[0_0_10px_rgba(186,230,253,0.7)]" fill="currentColor">
    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
  </svg>
);

const BronzeMedalIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" fill="currentColor">
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

  // Dynamic session and quiz rehydration states
  const [loadedSession, setLoadedSession] = useState<LiveQuizSession | null>(initialSession || null);
  const [loadedQuiz, setLoadedQuiz] = useState<LiveQuiz | null>(initialQuiz || initialSession?.quiz || null);
  const [loadedResults, setLoadedResults] = useState<LiveQuizResult[]>(results);
  const [coverImgSrc, setCoverImgSrc] = useState<string>(() => getQuizCover(initialQuiz || initialSession?.quiz));

  // Determine active session key for idempotent sound execution
  const activeSessionId = sessionId || initialSession?.id || loadedSession?.id || 'quiz_session';

  // Strictly stop all gameplay music and trigger victory fanfare once
  useEffect(() => {
    quizAudioService.setQuizFinished(true);
    quizAudioService.stopBackgroundMusic();
    quizAudioService.playQuizComplete(activeSessionId);

    return () => {
      quizAudioService.stopBackgroundMusic();
    };
  }, [activeSessionId]);

  // Sync / hydrate session & quiz if missing
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

    // Load missing results if results array is empty
    if (!loadedResults || loadedResults.length === 0) {
      liveQuizService.getResults(targetSessionId).then((res) => {
        if (res.data && res.data.length > 0) {
          setLoadedResults(res.data);
        }
      }).catch(() => {});
    }

    // Load session / quiz if quiz is not yet present
    if (!loadedQuiz) {
      liveQuizService.getSessionById(targetSessionId).then((sess) => {
        if (sess) {
          setLoadedSession(sess);
          if (sess.quiz) {
            setLoadedQuiz(sess.quiz);
            setCoverImgSrc(getQuizCover(sess.quiz));
          }
        }
      }).catch(() => {});
    }
  }, [sessionId, initialSession?.id, loadedResults?.length, loadedQuiz]);

  // Active quiz reference
  const activeQuiz = loadedQuiz || loadedSession?.quiz;

  // Filter out any teacher/host entries so only student participants are placed on podium
  const safeResults = useMemo(() => {
    const teacherId = loadedSession?.teacher_id || initialSession?.teacher_id;
    return (Array.isArray(loadedResults) ? loadedResults : []).filter((r) => {
      if (teacherId && r.student_id && r.student_id === teacherId) return false;
      if (teacherId && r.student?.id && r.student.id === teacherId) return false;
      return true;
    });
  }, [loadedResults, loadedSession?.teacher_id, initialSession?.teacher_id]);

  // Sorted participants (highest score first)
  const sorted = useMemo(() => {
    return [...safeResults].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [safeResults]);

  const totalParticipants = sorted.length;
  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];

  // Dynamic statistics
  const totalQuestions =
    activeQuiz?.questions?.length ||
    sorted[0]?.total_questions ||
    sorted.reduce((max, r) => Math.max(max, (r.correct_count || 0) + (r.wrong_count || 0)), 0) ||
    5;

  const totalPossiblePoints = totalQuestions * 20;

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
    <div className="relative w-full max-w-4xl mx-auto min-h-[85vh] bg-gradient-to-b from-[#060c1d] via-[#091636] to-[#040814] text-white rounded-3xl p-4 sm:p-7 shadow-2xl border border-sky-500/20 flex flex-col justify-between overflow-hidden select-none">
      
      {/* Lightweight Celebration Particles */}
      {showConfetti && totalParticipants > 0 && (
        <ConfettiCelebration onComplete={() => setShowConfetti(false)} durationMs={2800} />
      )}

      {/* Atmospheric Background Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-16 -left-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -top-16 -right-16 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-80 bg-amber-500/8 rounded-full blur-3xl" />
      </div>

      {/* ========================================================================= */}
      {/* 1. HEADER: BRANDING, STATUS PILL, RETURN ACTION                            */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex items-center justify-between gap-3 border-b border-white/10 pb-3 sm:pb-4">
        {/* Left: EdTechra Live Quiz Brand */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <img
            src="/logo.png"
            alt="EdTechra"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain shadow-sm"
          />
          <div>
            <div className="font-black text-white text-sm sm:text-base leading-tight tracking-tight">EdTechra</div>
            <div className="text-[10px] sm:text-[11px] text-sky-400 font-bold tracking-wide">Live Quiz</div>
          </div>
        </div>

        {/* Center: Game Finished Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/35 text-amber-300 text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-[0_0_12px_rgba(251,191,36,0.25)]">
          <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>Game Finished</span>
        </div>

        {/* Right: Back to Live Quizzes Button */}
        <button
          type="button"
          onClick={handleReturn}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Back to Live Quizzes</span>
          <span className="sm:hidden">Exit</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. QUIZ INFORMATION CARD: REAL COVER IMAGE, TITLE & DETAILS                */}
      {/* ========================================================================= */}
      <div className="relative z-10 my-3 sm:my-4 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/10 p-3 sm:p-4 shadow-lg flex items-center gap-3.5">
        
        {/* Actual Uploaded Quiz Cover Image */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border border-white/15 shadow-md bg-slate-800">
          <img
            src={coverImgSrc || DEFAULT_QUIZ_COVER}
            alt={activeQuiz?.title || 'Quiz Cover'}
            className="w-full h-full object-cover"
            onError={() => {
              if (coverImgSrc !== DEFAULT_QUIZ_COVER) {
                setCoverImgSrc(DEFAULT_QUIZ_COVER);
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
        </div>

        {/* Quiz Metadata & Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
              {activeQuiz?.category || 'General'}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-sky-200 border border-white/10">
              {totalPossiblePoints} Total Pts
            </span>
          </div>

          <h2 className="text-sm sm:text-base font-black text-white truncate leading-snug">
            {activeQuiz?.title || 'Live Classroom Quiz'}
          </h2>

          <p className="text-[11px] sm:text-xs text-slate-300 font-medium truncate mt-0.5">
            {totalQuestions} Questions • {totalParticipants} Student{totalParticipants === 1 ? '' : 's'} Participated
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. WINNERS / PODIUM SECTION                                               */}
      {/* ========================================================================= */}
      <div className="relative z-10 my-auto py-2 sm:py-4">
        
        {/* Case A: Zero participants */}
        {totalParticipants === 0 && (
          <div className="py-12 px-4 text-center bg-slate-900/40 rounded-2xl border border-white/10 max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white">No Participants</h3>
            <p className="text-xs text-slate-400">
              No student submissions were recorded for this quiz session.
            </p>
          </div>
        )}

        {/* Case B: Exactly 1 participant (Spotlight Winner Card) */}
        {totalParticipants === 1 && first && (
          <div className="max-w-sm mx-auto flex flex-col items-center animate-in zoom-in-95 duration-500">
            <div className="relative flex flex-col items-center text-center p-6 bg-gradient-to-b from-amber-500/15 via-slate-900/60 to-slate-950/80 rounded-3xl border border-amber-400/40 shadow-[0_0_30px_rgba(251,191,36,0.2)] w-full">
              
              {/* Crown Icon */}
              <div className="mb-2">
                <GoldTrophyIcon />
              </div>

              {/* Champion Avatar */}
              <div className="relative mb-3">
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-amber-400 text-slate-950 font-black text-xl flex items-center justify-center border-4 border-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.6)] overflow-hidden ring-4 ring-amber-400/30">
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

              {/* Name & Points */}
              <div className="text-base sm:text-lg font-black text-amber-100 truncate w-full px-2">
                {first.student?.full_name || 'Champion'}
              </div>
              <div className="text-sm font-black text-amber-300 font-mono mt-0.5">
                {first.score.toLocaleString()} pts
              </div>

              <div className="mt-2 text-xs font-semibold text-slate-300">
                {first.correct_count} of {totalQuestions} correct ({first.accuracy_percentage || 0}%)
              </div>

              <div className="mt-3 px-3 py-1 rounded-full bg-amber-400/20 text-amber-200 text-[11px] font-black uppercase tracking-wider">
                Quiz Champion
              </div>
            </div>
          </div>
        )}

        {/* Case C: Exactly 2 participants */}
        {totalParticipants === 2 && first && second && (
          <div className="flex items-end justify-center gap-3 sm:gap-6 max-w-lg mx-auto w-full px-2">
            
            {/* 2nd Place (Left) */}
            <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-6 duration-500 max-w-[170px]">
              <div className="mb-1">
                <SilverMedalIcon />
              </div>

              <div className="relative mb-2">
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-slate-200 text-slate-900 font-black text-base flex items-center justify-center border-3 border-sky-200 shadow-[0_0_15px_rgba(56,189,248,0.4)] overflow-hidden ring-4 ring-sky-400/25">
                  {second.student?.avatar_url ? (
                    <img src={second.student.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{getInitials(second.student?.full_name)}</span>
                  )}
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-sky-300 text-slate-950 font-black text-[10px] shadow-sm">
                  #2
                </span>
              </div>

              <div className="text-center w-full px-1 mb-2">
                <div className="text-xs sm:text-sm font-black text-white truncate">
                  {second.student?.full_name || '2nd Place'}
                </div>
                <div className="text-xs font-bold text-sky-300 font-mono">
                  {second.score.toLocaleString()} pts
                </div>
              </div>

              {/* Stepped Glass Pedestal */}
              <div className="w-full h-14 sm:h-16 rounded-t-xl bg-gradient-to-b from-sky-500/20 to-slate-900/60 border-t-2 border-x border-sky-300/40 flex items-center justify-center shadow-lg">
                <span className="text-xl sm:text-2xl font-black text-sky-200/80">2</span>
              </div>
            </div>

            {/* 1st Place (Center / Right) */}
            <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-8 duration-600 max-w-[190px]">
              <div className="mb-1 animate-bounce">
                <GoldTrophyIcon />
              </div>

              <div className="relative mb-2">
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-amber-400 text-slate-950 font-black text-lg flex items-center justify-center border-4 border-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.7)] overflow-hidden ring-4 ring-amber-400/30">
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
                <div className="text-sm sm:text-base font-black text-amber-100 truncate">
                  {first.student?.full_name || 'Champion'}
                </div>
                <div className="text-xs sm:text-sm font-black text-amber-300 font-mono">
                  {first.score.toLocaleString()} pts
                </div>
              </div>

              {/* Stepped Glass Pedestal */}
              <div className="w-full h-20 sm:h-24 rounded-t-xl bg-gradient-to-b from-amber-500/25 to-slate-900/70 border-t-2 border-x border-amber-300/60 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                <span className="text-2xl sm:text-3xl font-black text-amber-200">1</span>
              </div>
            </div>

          </div>
        )}

        {/* Case D: 3 or more participants (Complete 1st, 2nd, 3rd Podium) */}
        {totalParticipants >= 3 && first && second && third && (
          <div className="flex items-end justify-center gap-2 sm:gap-4 max-w-2xl mx-auto w-full px-1">
            
            {/* 2nd Place (Left) */}
            <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-6 duration-500 max-w-[160px]">
              <div className="mb-1">
                <SilverMedalIcon />
              </div>

              <div className="relative mb-1.5">
                <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-slate-200 text-slate-900 font-black text-sm sm:text-base flex items-center justify-center border-3 border-sky-200 shadow-[0_0_15px_rgba(56,189,248,0.4)] overflow-hidden ring-4 ring-sky-400/20">
                  {second.student?.avatar_url ? (
                    <img src={second.student.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{getInitials(second.student?.full_name)}</span>
                  )}
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-sky-300 text-slate-950 font-black text-[10px] shadow-sm">
                  #2
                </span>
              </div>

              <div className="text-center w-full px-1 mb-1.5">
                <div className="text-xs sm:text-sm font-black text-white truncate">
                  {second.student?.full_name || '2nd Place'}
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-sky-300 font-mono">
                  {second.score.toLocaleString()} pts
                </div>
              </div>

              {/* Stepped Pedestal */}
              <div className="w-full h-12 sm:h-16 rounded-t-xl bg-gradient-to-b from-sky-500/20 to-slate-900/60 border-t-2 border-x border-sky-300/40 flex items-center justify-center shadow-lg">
                <span className="text-lg sm:text-xl font-black text-sky-200/80">2</span>
              </div>
            </div>

            {/* 1st Place (Center) */}
            <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-8 duration-600 max-w-[190px] z-10">
              <div className="mb-1 animate-bounce">
                <GoldTrophyIcon />
              </div>

              <div className="relative mb-1.5">
                <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-full bg-amber-400 text-slate-950 font-black text-base sm:text-lg flex items-center justify-center border-4 border-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.7)] overflow-hidden ring-4 ring-amber-400/30">
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
                <div className="text-xs sm:text-base font-black text-amber-100 truncate">
                  {first.student?.full_name || 'Champion'}
                </div>
                <div className="text-xs sm:text-sm font-black text-amber-300 font-mono">
                  {first.score.toLocaleString()} pts
                </div>
              </div>

              {/* Stepped Pedestal */}
              <div className="w-full h-18 sm:h-24 rounded-t-xl bg-gradient-to-b from-amber-500/25 to-slate-900/70 border-t-2 border-x border-amber-300/60 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <span className="text-2xl sm:text-3xl font-black text-amber-200">1</span>
              </div>
            </div>

            {/* 3rd Place (Right) */}
            <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-5 duration-400 max-w-[160px]">
              <div className="mb-1">
                <BronzeMedalIcon />
              </div>

              <div className="relative mb-1.5">
                <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-full bg-amber-700 text-white font-black text-xs sm:text-sm flex items-center justify-center border-3 border-amber-400 shadow-[0_0_12px_rgba(217,119,6,0.4)] overflow-hidden ring-4 ring-amber-600/20">
                  {third.student?.avatar_url ? (
                    <img src={third.student.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{getInitials(third.student?.full_name)}</span>
                  )}
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] shadow-sm">
                  #3
                </span>
              </div>

              <div className="text-center w-full px-1 mb-1.5">
                <div className="text-xs sm:text-sm font-black text-white truncate">
                  {third.student?.full_name || '3rd Place'}
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-amber-300 font-mono">
                  {third.score.toLocaleString()} pts
                </div>
              </div>

              {/* Stepped Pedestal */}
              <div className="w-full h-8 sm:h-12 rounded-t-xl bg-gradient-to-b from-amber-700/20 to-slate-900/60 border-t-2 border-x border-amber-500/40 flex items-center justify-center shadow-md">
                <span className="text-base sm:text-lg font-black text-amber-400/80">3</span>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 4. STATISTICS STRIP: 4 METRICS                                             */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full max-w-3xl mx-auto my-3 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/10 p-3 sm:p-4 shadow-xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center justify-around divide-y sm:divide-y-0 sm:divide-x divide-white/10 text-center">
          
          {/* Metric 1: Participants */}
          <div className="flex items-center justify-center gap-2.5 px-2 pt-1.5 sm:pt-0">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-400/30 text-sky-400 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-base sm:text-lg font-black font-mono text-white leading-tight">
                {totalParticipants}
              </div>
              <div className="text-[10px] font-bold text-slate-300">
                Participants
              </div>
            </div>
          </div>

          {/* Metric 2: Questions */}
          <div className="flex items-center justify-center gap-2.5 px-2 pt-1.5 sm:pt-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-400/30 text-indigo-400 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-base sm:text-lg font-black font-mono text-white leading-tight">
                {totalQuestions}
              </div>
              <div className="text-[10px] font-bold text-slate-300">
                Questions
              </div>
            </div>
          </div>

          {/* Metric 3: Highest Score */}
          <div className="flex items-center justify-center gap-2.5 px-2 pt-1.5 sm:pt-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-base sm:text-lg font-black font-mono text-white leading-tight">
                {highestScore} pts
              </div>
              <div className="text-[10px] font-bold text-slate-300">
                Highest Score
              </div>
            </div>
          </div>

          {/* Metric 4: Average Score */}
          <div className="flex items-center justify-center gap-2.5 px-2 pt-1.5 sm:pt-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-base sm:text-lg font-black font-mono text-white leading-tight">
                {avgScore > 0 ? `${avgScore} pts` : `${avgAccuracy}%`}
              </div>
              <div className="text-[10px] font-bold text-slate-300">
                Average Score
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. ACTION BUTTON: SINGLE "Back to Live Quizzes" BUTTON                     */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleReturn}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs sm:text-sm font-black shadow-[0_0_20px_rgba(99,102,241,0.4)] cursor-pointer transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Live Quizzes</span>
        </button>

        {/* View all standings toggle if > 3 participants */}
        {totalParticipants > 3 && (
          <button
            type="button"
            onClick={() => setShowDetailedModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
            <span>View All {totalParticipants} Standings</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. MODAL: FULL PARTICIPANT STANDINGS (For sessions with >3 students)        */}
      {/* ========================================================================= */}
      {showDetailedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-[#091533] border border-sky-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl text-white space-y-4 max-h-[85vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm sm:text-base font-black text-white">Full Quiz Standings</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailedModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Standings List */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {sorted.map((res, index) => {
                const rank = index + 1;
                return (
                  <div
                    key={res.id || index}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      rank === 1
                        ? 'bg-amber-500/15 border-amber-400/40'
                        : rank === 2
                        ? 'bg-sky-500/15 border-sky-400/30'
                        : rank === 3
                        ? 'bg-amber-700/15 border-amber-600/30'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-6 text-center font-black font-mono text-xs ${
                        rank === 1 ? 'text-amber-300' : rank === 2 ? 'text-sky-300' : rank === 3 ? 'text-amber-500' : 'text-slate-400'
                      }`}>
                        #{rank}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden ring-2 ring-white/10 shrink-0">
                        {res.student?.avatar_url ? (
                          <img src={res.student.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{getInitials(res.student?.full_name)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-black text-white truncate">
                          {res.student?.full_name || `Student ${rank}`}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {res.correct_count ?? 0} correct • {res.accuracy_percentage ?? 0}%
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-sm font-black font-mono text-amber-300">
                        {res.score.toLocaleString()} pts
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-white/10 pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowDetailedModal(false)}
                className="px-5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition-all cursor-pointer"
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
