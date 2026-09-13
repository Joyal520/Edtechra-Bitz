import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Users,
  BarChart2,
  BarChart3,
  Star,
  Home,
  RotateCcw
} from 'lucide-react';
import { LiveQuizResult } from '@/types/liveQuiz';
import { quizAudioService } from '@/services/quizAudioService';
import { ConfettiCelebration } from './ConfettiCelebration';

interface LiveQuizPodiumProps {
  results: LiveQuizResult[];
  classroomId: string;
  onExit?: () => void;
}

// Crisp Golden Laurel Branch SVGs flanking the 1st-place champion
const LaurelWreathLeft = () => (
  <svg viewBox="0 0 50 100" className="w-8 h-16 sm:w-10 sm:h-20 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]" fill="currentColor">
    <path d="M45,95 C30,85 18,65 18,45 C18,25 30,10 40,5 C38,15 28,28 28,45 C28,62 38,80 45,95 Z" opacity="0.35" />
    <path d="M40,12 C32,8 20,12 18,20 C18,26 28,26 36,20 Z" />
    <path d="M35,28 C26,26 14,32 14,40 C15,46 25,45 32,38 Z" />
    <path d="M32,46 C22,46 12,54 13,62 C15,67 24,64 30,55 Z" />
    <path d="M32,64 C23,66 14,75 16,84 C19,89 27,84 32,74 Z" />
  </svg>
);

const LaurelWreathRight = () => (
  <svg viewBox="0 0 50 100" className="w-8 h-16 sm:w-10 sm:h-20 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.7)] scale-x-[-1]" fill="currentColor">
    <path d="M45,95 C30,85 18,65 18,45 C18,25 30,10 40,5 C38,15 28,28 28,45 C28,62 38,80 45,95 Z" opacity="0.35" />
    <path d="M40,12 C32,8 20,12 18,20 C18,26 28,26 36,20 Z" />
    <path d="M35,28 C26,26 14,32 14,40 C15,46 25,45 32,38 Z" />
    <path d="M32,46 C22,46 12,54 13,62 C15,67 24,64 30,55 Z" />
    <path d="M32,64 C23,66 14,75 16,84 C19,89 27,84 32,74 Z" />
  </svg>
);

// 3-Point Crown SVGs
const GoldCrown = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 sm:w-10 sm:h-10 text-amber-300 drop-shadow-[0_0_14px_rgba(251,191,36,0.9)]" fill="currentColor">
    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
  </svg>
);

const SilverCrown = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7 sm:w-8 sm:h-8 text-sky-200 drop-shadow-[0_0_10px_rgba(186,230,253,0.8)]" fill="currentColor">
    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
  </svg>
);

const BronzeCrown = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]" fill="currentColor">
    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
  </svg>
);

export const LiveQuizPodium: React.FC<LiveQuizPodiumProps> = ({
  results = [],
  classroomId,
  onExit
}) => {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);

  const safeResults = Array.isArray(results) ? results : [];
  const sorted = [...safeResults].sort((a, b) => (b.score || 0) - (a.score || 0));
  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];
  const lowerRanks = sorted.slice(3, 8); // Ranks 4 to 8

  // Dynamic statistics
  const totalParticipants = sorted.length;
  const avgAccuracy = totalParticipants > 0
    ? Math.round(sorted.reduce((acc, r) => acc + (r.accuracy_percentage || 0), 0) / totalParticipants)
    : 0;

  useEffect(() => {
    // Strictly ensure no background music is playing on results/podium
    quizAudioService.stopBackgroundMusic();
    quizAudioService.playQuizComplete();
  }, []);

  const handleReturn = () => {
    quizAudioService.playClick();
    if (onExit) {
      onExit();
    } else {
      navigate(`/classes/${classroomId}`);
    }
  };

  return (
    <div className="relative min-h-[90vh] bg-gradient-to-b from-[#050b18] via-[#091738] to-[#040915] text-white rounded-[32px] p-6 sm:p-8 lg:p-10 shadow-2xl overflow-hidden border border-sky-500/25 flex flex-col justify-between select-none">
      
      {/* Confetti Celebration Emitter */}
      {showConfetti && (
        <ConfettiCelebration onComplete={() => setShowConfetti(false)} durationMs={3500} />
      )}

      {/* Atmospheric Spotlight Cones and Ambient Confetti Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Left Spotlight Cone */}
        <div className="absolute -top-20 -left-20 w-[450px] h-[550px] bg-gradient-to-br from-blue-500/15 via-indigo-600/10 to-transparent rotate-12 blur-3xl" />
        {/* Right Spotlight Cone */}
        <div className="absolute -top-20 -right-20 w-[450px] h-[550px] bg-gradient-to-bl from-purple-500/15 via-blue-600/10 to-transparent -rotate-12 blur-3xl" />
        {/* Center Golden Bloom */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-amber-500/10 rounded-full blur-3xl" />

        {/* Ambient Floating Confetti Particles */}
        <div className="absolute top-16 left-1/4 w-2 h-3 bg-purple-400 rotate-45 rounded-xs opacity-70 animate-pulse" />
        <div className="absolute top-24 left-1/3 w-2.5 h-2.5 bg-yellow-300 rotate-12 rounded-xs opacity-80" />
        <div className="absolute top-20 right-1/4 w-2 h-4 bg-pink-400 -rotate-45 rounded-xs opacity-70 animate-pulse" />
        <div className="absolute top-28 right-1/3 w-3 h-2 bg-cyan-300 rotate-45 rounded-xs opacity-80" />
        <div className="absolute top-36 left-1/6 w-2 h-2 bg-emerald-400 rotate-12 rounded-full opacity-60" />
        <div className="absolute top-40 right-1/6 w-2.5 h-2.5 bg-amber-400 rotate-45 rounded-xs opacity-70" />
      </div>

      {/* ========================================================================= */}
      {/* TOP HEADER: BRANDING, GAME FINISHED BADGE, BACK TO CLASS                   */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex items-center justify-between gap-4 border-b border-white/10 pb-5">
        
        {/* Left: EdTechra Biz Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center p-2 shadow-lg shadow-blue-500/30 shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="2.2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-sm font-black tracking-tight text-white flex items-center gap-1">
              <span>EdTechra</span>
              <span className="text-sky-400 font-extrabold">Biz</span>
            </div>
            <div className="text-[10px] font-semibold text-slate-400 tracking-wider">
              Learn • Assess • Grow
            </div>
          </div>
        </div>

        {/* Center: GAME FINISHED Gold Badge + Subtitle */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-400/10 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(251,191,36,0.2)]">
            <Trophy className="w-3.5 h-3.5 text-amber-300" />
            <span>Game Finished</span>
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Live Quiz Champions!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            Great job everyone! Points have been added to the Classroom Leaderboard.
          </p>
        </div>

        {/* Right: Back to Class Action Button */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={handleReturn}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
          >
            <Home className="w-3.5 h-3.5 text-sky-300" />
            <span className="hidden sm:inline">Back to Class</span>
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* CENTER STAGE: LEFT STAT PANEL, 3D STEPPED PODIUM, RIGHT STAT PANEL         */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center gap-4 sm:gap-6 my-auto py-4">
        
        {/* Left Stat Card: Students Participated */}
        <div className="w-36 sm:w-44 h-44 sm:h-52 rounded-3xl bg-[#0a1532]/75 backdrop-blur-md border border-sky-500/25 p-4 sm:p-5 flex flex-col items-center justify-between shadow-2xl text-center shrink-0 order-2 lg:order-1">
          {/* Top glowing star icon */}
          <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center shadow-inner">
            <Star className="w-5 h-5 fill-current" />
          </div>
          {/* Middle count & label */}
          <div className="space-y-0.5">
            <div className="text-3xl sm:text-4xl font-black text-white font-mono">
              {totalParticipants}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-300 font-bold leading-tight">
              Students<br />Participated
            </div>
          </div>
          {/* Bottom subtle users icon */}
          <div className="text-slate-500">
            <Users className="w-4 h-4" />
          </div>
        </div>

        {/* Center: 3-Tier Stepped 3D Dimensional Podium */}
        <div className="flex items-end justify-center gap-3 sm:gap-5 flex-1 max-w-2xl w-full order-1 lg:order-2 px-2">
          
          {/* ===================================================================== */}
          {/* 2nd PLACE PODIUM (LEFT — SILVER/BLUE)                                 */}
          {/* ===================================================================== */}
          <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-8 duration-500 max-w-[170px]">
            {/* Avatar & Silver Crown */}
            <div className="relative flex flex-col items-center mb-3">
              <div className="mb-1">
                <SilverCrown />
              </div>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-200 text-slate-900 font-black text-base flex items-center justify-center border-4 border-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.5)] overflow-hidden ring-4 ring-sky-400/40">
                {second?.student?.avatar_url ? (
                  <img src={second.student.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  second?.student?.full_name?.slice(0, 2).toUpperCase() || '2ND'
                )}
              </div>
            </div>

            {/* 2nd Place 3D Stepped Block */}
            <div className="w-full h-36 sm:h-44 bg-gradient-to-b from-[#3b82f6]/45 via-[#1e3a8a]/60 to-[#0c1a40]/90 rounded-t-3xl border-t-2 border-l border-r border-sky-300/60 shadow-[0_0_30px_rgba(56,189,248,0.25)] flex flex-col items-center justify-center p-3 text-center">
              <div className="text-3xl sm:text-4xl font-black text-white/95">
                2
              </div>
              <div className="text-xs sm:text-sm font-black text-white truncate w-full px-1 mt-1">
                {second?.student?.full_name || '2nd Place'}
              </div>
              <div className="text-xs font-bold text-sky-200 font-mono mt-0.5">
                {second ? `${second.score.toLocaleString()} pts` : '—'}
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* 1st PLACE CHAMPION PODIUM (CENTER — GOLD WITH LAUREL WREATH)          */}
          {/* ===================================================================== */}
          <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-12 duration-700 max-w-[210px] z-10">
            {/* Avatar with Gold Crown and Flanking Laurel Wreath Branches */}
            <div className="relative flex items-center justify-center mb-3">
              {/* Left Laurel Branch */}
              <div className="absolute -left-7 sm:-left-9 top-4 z-0">
                <LaurelWreathLeft />
              </div>

              {/* Center Avatar & Crown */}
              <div className="flex flex-col items-center relative z-10">
                <div className="mb-1 animate-bounce duration-1000">
                  <GoldCrown />
                </div>
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-amber-400 text-slate-950 font-black text-lg flex items-center justify-center border-4 border-amber-200 shadow-[0_0_30px_rgba(251,191,36,0.8)] overflow-hidden ring-4 ring-amber-400/60">
                  {first?.student?.avatar_url ? (
                    <img src={first.student.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    first?.student?.full_name?.slice(0, 2).toUpperCase() || '1ST'
                  )}
                </div>
              </div>

              {/* Right Laurel Branch */}
              <div className="absolute -right-7 sm:-right-9 top-4 z-0">
                <LaurelWreathRight />
              </div>
            </div>

            {/* 1st Place Tall Golden 3D Stepped Block */}
            <div className="w-full h-48 sm:h-56 bg-gradient-to-b from-[#f59e0b]/55 via-[#b45309]/65 to-[#1a1c3d]/95 rounded-t-3xl border-t-2 border-l border-r border-amber-300/80 shadow-[0_0_40px_rgba(245,158,11,0.35)] flex flex-col items-center justify-center p-3 text-center">
              <div className="text-4xl sm:text-5xl font-black text-amber-200 drop-shadow-md">
                1
              </div>
              <div className="text-sm sm:text-base font-black text-white truncate w-full px-1 mt-1">
                {first?.student?.full_name || 'Champion'}
              </div>
              <div className="text-xs sm:text-sm font-black text-amber-300 font-mono mt-0.5">
                {first ? `${first.score.toLocaleString()} pts` : '—'}
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* 3rd PLACE PODIUM (RIGHT — BRONZE/COPPER)                              */}
          {/* ===================================================================== */}
          <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-6 duration-400 max-w-[170px]">
            {/* Avatar & Bronze Crown */}
            <div className="relative flex flex-col items-center mb-3">
              <div className="mb-1">
                <BronzeCrown />
              </div>
              <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-amber-700 text-white font-black text-sm flex items-center justify-center border-3 border-amber-400 shadow-[0_0_15px_rgba(217,119,6,0.4)] overflow-hidden ring-4 ring-amber-600/40">
                {third?.student?.avatar_url ? (
                  <img src={third.student.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  third?.student?.full_name?.slice(0, 2).toUpperCase() || '3RD'
                )}
              </div>
            </div>

            {/* 3rd Place 3D Stepped Block */}
            <div className="w-full h-28 sm:h-36 bg-gradient-to-b from-[#d97706]/40 via-[#78350f]/55 to-[#0b1428]/90 rounded-t-3xl border-t-2 border-l border-r border-amber-500/50 shadow-[0_0_25px_rgba(217,119,6,0.2)] flex flex-col items-center justify-center p-3 text-center">
              <div className="text-2xl sm:text-3xl font-black text-amber-300/90">
                3
              </div>
              <div className="text-xs sm:text-sm font-black text-white truncate w-full px-1 mt-1">
                {third?.student?.full_name || '3rd Place'}
              </div>
              <div className="text-xs font-bold text-amber-200/90 font-mono mt-0.5">
                {third ? `${third.score.toLocaleString()} pts` : '—'}
              </div>
            </div>
          </div>

        </div>

        {/* Right Stat Card: Average Accuracy */}
        <div className="w-36 sm:w-44 h-44 sm:h-52 rounded-3xl bg-[#0a1532]/75 backdrop-blur-md border border-sky-500/25 p-4 sm:p-5 flex flex-col items-center justify-between shadow-2xl text-center shrink-0 order-3">
          {/* Top glowing chart icon */}
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center shadow-inner">
            <BarChart3 className="w-5 h-5" />
          </div>
          {/* Middle accuracy & label */}
          <div className="space-y-0.5">
            <div className="text-3xl sm:text-4xl font-black text-white font-mono">
              {avgAccuracy}%
            </div>
            <div className="text-[11px] sm:text-xs text-slate-300 font-bold leading-tight">
              Average<br />Accuracy
            </div>
          </div>
          {/* Bottom subtle chart icon */}
          <div className="text-slate-500">
            <BarChart2 className="w-4 h-4" />
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* LOWER HORIZONTAL LEADERBOARD (RANKS 4 THROUGH 8)                           */}
      {/* ========================================================================= */}
      <div className="relative z-10 max-w-5xl mx-auto w-full my-2">
        {lowerRanks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {lowerRanks.map((res, index) => {
              const rank = index + 4;
              return (
                <div
                  key={res.id || index}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-[#0a193d]/70 backdrop-blur-sm border border-blue-500/20 shadow-md hover:bg-white/10 transition-colors"
                >
                  <span className="text-sm font-black font-mono text-slate-400 w-4 text-center">
                    {rank}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden ring-1 ring-white/20 shrink-0">
                    {res.student?.avatar_url ? (
                      <img src={res.student.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      res.student?.full_name?.slice(0, 2).toUpperCase() || `P${rank}`
                    )}
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <div className="text-xs font-black text-white truncate">
                      {res.student?.full_name || `Student ${rank}`}
                    </div>
                    <div className="text-[10px] text-sky-300 font-mono font-bold">
                      {res.score.toLocaleString()} pts
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-2" />
        )}
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM CTA ACTION BUTTON: PLAY AGAIN                                       */}
      {/* ========================================================================= */}
      <div className="relative z-10 text-center pt-2">
        <button
          type="button"
          onClick={handleReturn}
          className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-full text-xs sm:text-sm font-black shadow-[0_0_30px_rgba(99,102,241,0.5)] active:scale-95 transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Play Again</span>
        </button>
      </div>

    </div>
  );
};
