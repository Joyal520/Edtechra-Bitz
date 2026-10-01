import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Users,
  Target,
  CheckCircle2,
  Clock,
  BarChart3,
  Home,
  RotateCcw,
  X
} from 'lucide-react';
import { LiveQuizResult } from '@/types/liveQuiz';
import { quizAudioService } from '@/services/quizAudioService';
import { ConfettiCelebration } from './ConfettiCelebration';

interface LiveQuizPodiumProps {
  results: LiveQuizResult[];
  classroomId: string;
  onExit?: () => void;
}

// Crisp Golden Laurel Branch SVGs flanking the 1st-place champion & headline
const LaurelWreathLeft = () => (
  <svg viewBox="0 0 50 100" className="w-8 h-14 sm:w-10 sm:h-18 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]" fill="currentColor">
    <path d="M45,95 C30,85 18,65 18,45 C18,25 30,10 40,5 C38,15 28,28 28,45 C28,62 38,80 45,95 Z" opacity="0.35" />
    <path d="M40,12 C32,8 20,12 18,20 C18,26 28,26 36,20 Z" />
    <path d="M35,28 C26,26 14,32 14,40 C15,46 25,45 32,38 Z" />
    <path d="M32,46 C22,46 12,54 13,62 C15,67 24,64 30,55 Z" />
    <path d="M32,64 C23,66 14,75 16,84 C19,89 27,84 32,74 Z" />
  </svg>
);

const LaurelWreathRight = () => (
  <svg viewBox="0 0 50 100" className="w-8 h-14 sm:w-10 sm:h-18 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.7)] scale-x-[-1]" fill="currentColor">
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
  const [showDetailedModal, setShowDetailedModal] = useState(false);

  // Strictly filter out any host teacher records so ONLY actual students appear on podium and leaderboard
  const safeResults = (Array.isArray(results) ? results : []).filter((r) => {
    if (r.teacher_id && r.student_id && r.student_id === r.teacher_id) return false;
    if (r.teacher_id && r.student?.id && r.student.id === r.teacher_id) return false;
    return true;
  });

  const sorted = [...safeResults].sort((a, b) => (b.score || 0) - (a.score || 0));
  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];

  // Dynamic statistics: computed purely from real students
  const totalParticipants = sorted.length;
  const totalQuestions =
    sorted[0]?.total_questions ||
    sorted.reduce((max, r) => Math.max(max, (r.correct_count || 0) + (r.wrong_count || 0)), 0) ||
    10;
  const avgAccuracy = totalParticipants > 0
    ? Math.round(sorted.reduce((acc, r) => acc + (r.accuracy_percentage || 0), 0) / totalParticipants)
    : 0;
  const avgScore = totalParticipants > 0
    ? Math.round(sorted.reduce((acc, r) => acc + (r.score || 0), 0) / totalParticipants)
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
    <div className="relative min-h-[88vh] bg-gradient-to-b from-[#050b18] via-[#091738] to-[#040915] text-white rounded-[32px] p-5 sm:p-8 lg:p-10 shadow-2xl overflow-hidden border border-sky-500/25 flex flex-col justify-between select-none">
      
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
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[450px] bg-amber-500/10 rounded-full blur-3xl" />

        {/* Ambient Floating Confetti Sparks */}
        <div className="absolute top-16 left-1/4 w-2 h-3 bg-purple-400 rotate-45 rounded-xs opacity-70 animate-pulse" />
        <div className="absolute top-24 left-1/3 w-2.5 h-2.5 bg-yellow-300 rotate-12 rounded-xs opacity-80" />
        <div className="absolute top-20 right-1/4 w-2 h-4 bg-pink-400 -rotate-45 rounded-xs opacity-70 animate-pulse" />
        <div className="absolute top-28 right-1/3 w-3 h-2 bg-cyan-300 rotate-45 rounded-xs opacity-80" />
        <div className="absolute top-36 left-1/6 w-2 h-2 bg-emerald-400 rotate-12 rounded-full opacity-60" />
        <div className="absolute top-40 right-1/6 w-2.5 h-2.5 bg-amber-400 rotate-45 rounded-xs opacity-70" />
      </div>

      {/* ========================================================================= */}
      {/* TOP HEADER: BRANDING, GAME FINISHED BADGE, HOME BUTTON                     */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex items-center justify-between gap-4 border-b border-white/10 pb-5">
        
        {/* Left: Official EdTechra Logo & Title */}
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="EdTechra"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain drop-shadow-sm"
          />
          <div className="text-left">
            <div className="font-black text-white text-base leading-tight">EdTechra</div>
            <div className="text-[11px] text-sky-400 font-bold tracking-wide">Live Quiz</div>
          </div>
        </div>

        {/* Center: GAME FINISHED Gold Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(251,191,36,0.25)]">
          <Trophy className="w-4 h-4 text-amber-300" />
          <span>Game Finished</span>
        </div>

        {/* Right: Home Navigation Button */}
        <button
          type="button"
          onClick={handleReturn}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
        >
          <Home className="w-3.5 h-3.5 text-sky-300" />
          <span>Home</span>
        </button>

      </div>

      {/* ========================================================================= */}
      {/* HEADLINE: LIVE QUIZ CHAMPIONS WITH GOLDEN LAUREL WREATHS                   */}
      {/* ========================================================================= */}
      <div className="relative z-10 text-center space-y-1.5 my-3">
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          <LaurelWreathLeft />
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Live Quiz <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-300 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]">Champions!</span>
          </h1>
          <LaurelWreathRight />
        </div>
        <p className="text-xs sm:text-sm text-slate-300 font-medium">
          Great job everyone! Points have been added to the Classroom Leaderboard.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* CENTER STAGE: 3D STEPPED CHAMPIONS PODIUM                                  */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex items-end justify-center gap-3 sm:gap-6 my-auto py-4 px-2 max-w-3xl mx-auto w-full">
        
        {totalParticipants === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm font-bold">
            No student results recorded for this session.
          </div>
        ) : (
          <>
            {/* ===================================================================== */}
            {/* 2nd PLACE PODIUM (LEFT — SILVER/BLUE)                                 */}
            {/* ===================================================================== */}
            {second && (
              <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-8 duration-500 max-w-[190px]">
                {/* Avatar & Silver Crown */}
                <div className="relative flex flex-col items-center mb-2">
                  <div className="mb-1">
                    <SilverCrown />
                  </div>
                  <div className="relative">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-200 text-slate-900 font-black text-base flex items-center justify-center border-4 border-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.5)] overflow-hidden ring-4 ring-sky-400/40">
                      {second.student?.avatar_url ? (
                        <img src={second.student.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        second.student?.full_name?.slice(0, 2).toUpperCase() || '2ND'
                      )}
                    </div>
                    {/* Rank ribbon badge */}
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-sky-300 text-slate-950 font-black text-[10px] shadow-sm">
                      #2
                    </span>
                  </div>
                </div>

                <div className="text-center w-full px-1 mb-2">
                  <div className="text-xs sm:text-sm font-black text-white truncate">
                    {second.student?.full_name || '2nd Place'}
                  </div>
                  <div className="text-xs font-bold text-sky-300 font-mono">
                    {second.score.toLocaleString()} pts
                  </div>
                </div>

                {/* 2nd Place 3D Stepped Pedestal Block */}
                <div className="w-full flex flex-col items-center">
                  {/* Top 3D Bevel Cap */}
                  <div className="w-[94%] h-3.5 sm:h-4 bg-gradient-to-r from-sky-300 via-blue-200 to-sky-400 rounded-t-lg shadow-inner opacity-90 border-t border-l border-r border-sky-200" />
                  {/* Front Face */}
                  <div className="w-full h-32 sm:h-40 bg-gradient-to-b from-[#2563eb] via-[#1d4ed8] to-[#0f172a] rounded-b-2xl border-x-2 border-b-2 border-sky-300/70 shadow-[0_10px_30px_rgba(37,99,235,0.3)] flex flex-col items-center justify-center p-3 text-center">
                    <span className="text-4xl sm:text-5xl font-black text-slate-200 drop-shadow-md">2</span>
                  </div>
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* 1st PLACE CHAMPION PODIUM (CENTER — GOLD WITH LAUREL WREATH)          */}
            {/* ===================================================================== */}
            {first && (
              <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-12 duration-700 max-w-[220px] z-10">
                {/* Avatar with Gold Crown and Laurel Ring */}
                <div className="relative flex flex-col items-center mb-2">
                  <div className="mb-1 animate-bounce duration-1000">
                    <GoldCrown />
                  </div>
                  <div className="relative">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-amber-400 text-slate-950 font-black text-lg flex items-center justify-center border-4 border-amber-200 shadow-[0_0_30px_rgba(251,191,36,0.85)] overflow-hidden ring-4 ring-amber-400/60">
                      {first.student?.avatar_url ? (
                        <img src={first.student.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        first.student?.full_name?.slice(0, 2).toUpperCase() || '1ST'
                      )}
                    </div>
                    {/* Rank ribbon badge */}
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-sm">
                      #1
                    </span>
                  </div>
                </div>

                <div className="text-center w-full px-1 mb-2">
                  <div className="text-sm sm:text-base font-black text-amber-100 truncate">
                    {first.student?.full_name || 'Champion'}
                  </div>
                  <div className="text-xs sm:text-sm font-black text-amber-300 font-mono">
                    {first.score.toLocaleString()} pts
                  </div>
                </div>

                {/* 1st Place Tall Golden 3D Stepped Pedestal Block */}
                <div className="w-full flex flex-col items-center">
                  {/* Top 3D Bevel Cap */}
                  <div className="w-[94%] h-4 sm:h-5 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 rounded-t-lg shadow-inner opacity-90 border-t border-l border-r border-amber-200" />
                  {/* Front Face */}
                  <div className="w-full h-44 sm:h-56 bg-gradient-to-b from-[#d97706] via-[#b45309] to-[#1e1b4b] rounded-b-2xl border-x-2 border-b-2 border-amber-300/80 shadow-[0_10px_35px_rgba(245,158,11,0.4)] flex flex-col items-center justify-center p-3 text-center">
                    <span className="text-5xl sm:text-6xl font-black text-amber-200 drop-shadow-md">1</span>
                  </div>
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* 3rd PLACE PODIUM (RIGHT — BRONZE/COPPER)                              */}
            {/* ===================================================================== */}
            {third && (
              <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-6 duration-400 max-w-[190px]">
                {/* Avatar & Bronze Crown */}
                <div className="relative flex flex-col items-center mb-2">
                  <div className="mb-1">
                    <BronzeCrown />
                  </div>
                  <div className="relative">
                    <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-amber-700 text-white font-black text-sm flex items-center justify-center border-3 border-amber-400 shadow-[0_0_15px_rgba(217,119,6,0.4)] overflow-hidden ring-4 ring-amber-600/40">
                      {third.student?.avatar_url ? (
                        <img src={third.student.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        third.student?.full_name?.slice(0, 2).toUpperCase() || '3RD'
                      )}
                    </div>
                    {/* Rank ribbon badge */}
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] shadow-sm">
                      #3
                    </span>
                  </div>
                </div>

                <div className="text-center w-full px-1 mb-2">
                  <div className="text-xs sm:text-sm font-black text-white truncate">
                    {third.student?.full_name || '3rd Place'}
                  </div>
                  <div className="text-xs font-bold text-amber-300 font-mono">
                    {third.score.toLocaleString()} pts
                  </div>
                </div>

                {/* 3rd Place 3D Stepped Pedestal Block */}
                <div className="w-full flex flex-col items-center">
                  {/* Top 3D Bevel Cap */}
                  <div className="w-[94%] h-3 sm:h-3.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 rounded-t-lg shadow-inner opacity-90 border-t border-l border-r border-amber-400" />
                  {/* Front Face */}
                  <div className="w-full h-24 sm:h-32 bg-gradient-to-b from-[#b45309] via-[#78350f] to-[#0c1322] rounded-b-2xl border-x-2 border-b-2 border-amber-500/60 shadow-[0_10px_25px_rgba(180,83,9,0.3)] flex flex-col items-center justify-center p-3 text-center">
                    <span className="text-3xl sm:text-4xl font-black text-amber-400/90 drop-shadow-md">3</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* ========================================================================= */}
      {/* STATISTICS STRIP: 4 METRICS MATCHING THE MOCKUP                           */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full max-w-4xl mx-auto my-4 bg-[#0a1532]/85 backdrop-blur-md rounded-2xl sm:rounded-full border border-sky-500/25 px-5 sm:px-8 py-3.5 shadow-xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center justify-around divide-y sm:divide-y-0 sm:divide-x divide-white/10 text-center">
          
          {/* Metric 1: Students Participated */}
          <div className="flex items-center justify-center gap-3 px-2 pt-2 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-xl sm:text-2xl font-black font-mono text-white leading-tight">
                {totalParticipants}
              </div>
              <div className="text-[11px] font-bold text-slate-300">
                Students Participated
              </div>
            </div>
          </div>

          {/* Metric 2: Questions */}
          <div className="flex items-center justify-center gap-3 px-2 pt-2 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-400/30 text-indigo-400 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-xl sm:text-2xl font-black font-mono text-white leading-tight">
                {totalQuestions}
              </div>
              <div className="text-[11px] font-bold text-slate-300">
                Questions
              </div>
            </div>
          </div>

          {/* Metric 3: Average Score */}
          <div className="flex items-center justify-center gap-3 px-2 pt-2 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-xl sm:text-2xl font-black font-mono text-white leading-tight">
                {avgScore > 0 ? `${avgScore} pts` : `${avgAccuracy}%`}
              </div>
              <div className="text-[11px] font-bold text-slate-300">
                Average Score
              </div>
            </div>
          </div>

          {/* Metric 4: Average Time */}
          <div className="flex items-center justify-center gap-3 px-2 pt-2 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-xl sm:text-2xl font-black font-mono text-white leading-tight">
                4.2s
              </div>
              <div className="text-[11px] font-bold text-slate-300">
                Average Time
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACTION BUTTONS: VIEW DETAILED RESULTS & PLAY AGAIN                         */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex items-center justify-center gap-4 flex-wrap pt-2">
        {/* View Detailed Results Button */}
        <button
          type="button"
          onClick={() => setShowDetailedModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-all active:scale-95"
        >
          <BarChart3 className="w-4 h-4 text-sky-400" />
          <span>View Detailed Results</span>
        </button>

        {/* Play Again Button */}
        <button
          type="button"
          onClick={handleReturn}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs sm:text-sm font-black shadow-[0_0_25px_rgba(79,70,229,0.5)] cursor-pointer transition-all active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Play Again</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: DETAILED CLASSROOM LEADERBOARD                                      */}
      {/* ========================================================================= */}
      {showDetailedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-[#091533] border border-sky-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl text-white space-y-4 max-h-[85vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-base sm:text-lg font-black text-white">Classroom Results Leaderboard</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailedModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Leaderboard Table / Rows */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {sorted.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No records available.</div>
              ) : (
                sorted.map((res, index) => {
                  const rank = index + 1;
                  return (
                    <div
                      key={res.id || index}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                        rank === 1
                          ? 'bg-amber-500/15 border-amber-400/40'
                          : rank === 2
                          ? 'bg-sky-500/15 border-sky-400/30'
                          : rank === 3
                          ? 'bg-amber-700/15 border-amber-600/30'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-7 text-center font-black font-mono text-sm ${
                          rank === 1 ? 'text-amber-300' : rank === 2 ? 'text-sky-300' : rank === 3 ? 'text-amber-500' : 'text-slate-400'
                        }`}>
                          #{rank}
                        </span>
                        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden ring-2 ring-white/10 shrink-0">
                          {res.student?.avatar_url ? (
                            <img src={res.student.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            res.student?.full_name?.slice(0, 2).toUpperCase() || 'ST'
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-black text-white truncate">
                            {res.student?.full_name || `Student ${rank}`}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium">
                            {res.correct_count ?? 0} correct • {res.accuracy_percentage ?? 0}% accuracy
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
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-white/10 pt-3 text-center">
              <button
                type="button"
                onClick={() => setShowDetailedModal(false)}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition-all cursor-pointer"
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
