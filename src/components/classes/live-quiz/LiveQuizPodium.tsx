import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Sparkles, ArrowRight } from 'lucide-react';
import { LiveQuizResult } from '@/types/liveQuiz';
import { quizAudioService } from '@/services/quizAudioService';
import { ConfettiCelebration } from './ConfettiCelebration';

interface LiveQuizPodiumProps {
  results: LiveQuizResult[];
  classroomId: string;
  onExit?: () => void;
}

export const LiveQuizPodium: React.FC<LiveQuizPodiumProps> = ({
  results,
  classroomId,
  onExit
}) => {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);

  const sorted = [...results].sort((a, b) => b.score - a.score);
  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];

  useEffect(() => {
    quizAudioService.playCorrect();
  }, []);

  const handleReturn = () => {
    if (onExit) {
      onExit();
    } else {
      navigate(`/classes/${classroomId}`);
    }
  };

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-[#031528] via-[#092b4e] to-[#0f4477] text-white rounded-3xl p-6 sm:p-10 shadow-2xl overflow-hidden border border-sky-500/20 flex flex-col justify-between space-y-8 animate-in fade-in duration-300 relative">
      {showConfetti && (
        <ConfettiCelebration onComplete={() => setShowConfetti(false)} durationMs={2000} />
      )}
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-black uppercase tracking-wider border border-amber-400/30">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Game Finished</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Live Quiz Champions
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 font-medium">
          Points have been credited to the Classroom Leaderboard!
        </p>
      </div>

      {/* 3-Tier Podium Stage */}
      <div className="flex items-end justify-center gap-3 sm:gap-6 py-6 max-w-2xl mx-auto w-full">
        
        {/* 2nd Place */}
        <div className="flex-1 flex flex-col items-center space-y-2 animate-in slide-in-from-bottom-8 duration-500">
          {second ? (
            <>
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-300 text-slate-900 font-black text-sm flex items-center justify-center border-2 border-white shadow-lg overflow-hidden">
                {second.student?.avatar_url ? (
                  <img src={second.student.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  second.student?.full_name?.slice(0, 2).toUpperCase() || '2ND'
                )}
              </div>
              <span className="text-xs font-black text-white line-clamp-1">{second.student?.full_name || '2nd Place'}</span>
              <span className="text-xs font-extrabold text-slate-300">{second.score.toLocaleString()} pts</span>
            </>
          ) : (
            <div className="h-20" />
          )}
          <div className="w-full h-28 sm:h-32 bg-slate-400/40 rounded-t-2xl border-t-2 border-slate-300 flex items-center justify-center font-black text-2xl text-slate-200">
            2
          </div>
        </div>

        {/* 1st Place Champion */}
        <div className="flex-1 flex flex-col items-center space-y-2 animate-in slide-in-from-bottom-12 duration-700">
          {first ? (
            <>
              <Trophy className="w-8 h-8 text-amber-300 animate-bounce" />
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-amber-400 text-slate-950 font-black text-base flex items-center justify-center border-4 border-amber-200 shadow-2xl overflow-hidden ring-4 ring-amber-400/40">
                {first.student?.avatar_url ? (
                  <img src={first.student.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  first.student?.full_name?.slice(0, 2).toUpperCase() || '1ST'
                )}
              </div>
              <span className="text-sm font-black text-amber-300 line-clamp-1">{first.student?.full_name || 'Winner'}</span>
              <span className="text-xs font-black text-white">{first.score.toLocaleString()} pts</span>
            </>
          ) : (
            <div className="h-28" />
          )}
          <div className="w-full h-36 sm:h-44 bg-amber-500/40 rounded-t-2xl border-t-2 border-amber-400 flex items-center justify-center font-black text-4xl text-amber-300">
            1
          </div>
        </div>

        {/* 3rd Place */}
        <div className="flex-1 flex flex-col items-center space-y-2 animate-in slide-in-from-bottom-6 duration-400">
          {third ? (
            <>
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center border-2 border-amber-600 shadow-lg overflow-hidden">
                {third.student?.avatar_url ? (
                  <img src={third.student.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  third.student?.full_name?.slice(0, 2).toUpperCase() || '3RD'
                )}
              </div>
              <span className="text-xs font-black text-white line-clamp-1">{third.student?.full_name || '3rd Place'}</span>
              <span className="text-xs font-extrabold text-slate-300">{third.score.toLocaleString()} pts</span>
            </>
          ) : (
            <div className="h-16" />
          )}
          <div className="w-full h-20 sm:h-24 bg-amber-800/40 rounded-t-2xl border-t-2 border-amber-700 flex items-center justify-center font-black text-xl text-amber-400">
            3
          </div>
        </div>

      </div>

      {/* Full Leaderboard Table */}
      <div className="max-w-2xl mx-auto w-full bg-white/10 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-white/15 space-y-2">
        <div className="text-xs font-black uppercase tracking-wider text-sky-300 px-2 pb-1 border-b border-white/10 flex justify-between">
          <span>Rank & Player</span>
          <span>Score & Accuracy</span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {sorted.map((res, index) => (
            <div
              key={res.id || index}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-xs font-bold"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono font-black text-slate-400 w-5">#{index + 1}</span>
                <span className="text-white font-extrabold">{res.student?.full_name || `Student ${index + 1}`}</span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-slate-300 font-medium">
                  {res.accuracy_percentage}% ({res.correct_count} correct)
                </span>
                <span className="text-amber-300 font-black">
                  +{res.points_awarded} pts
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={handleReturn}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#026fc3] to-[#0295ff] hover:brightness-110 text-white rounded-2xl text-xs font-black shadow-xl active:scale-95 transition-all cursor-pointer"
        >
          <span>Return to Classroom Workspace</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
