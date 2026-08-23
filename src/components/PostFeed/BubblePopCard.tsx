// ============================================================================
// EDTECHRA-BITZ: Bubble Pop Relaxation Feed Break Card
// ============================================================================

import React, { useState } from 'react';
import { Sparkles, Play, Zap, Trophy, X } from 'lucide-react';
import { BubblePopGame, loadBubblePopProgress, calculateTargetScore } from '@/components/games/BubblePopGame';

interface BubblePopCardProps {
  onGameCompleted?: (level: number, xpEarned: number) => void;
}

export const BubblePopCard: React.FC<BubblePopCardProps> = ({ onGameCompleted }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const progress = loadBubblePopProgress();
  const currentLevel = progress.highestUnlockedLevel;
  const targetScore = calculateTargetScore(currentLevel);

  return (
    <div className="mx-3 sm:mx-0 bg-white border border-stone-200/90 rounded-3xl overflow-hidden shadow-xs">
      
      {!isPlaying ? (
        <div className="relative p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white flex flex-col gap-4 overflow-hidden">
          
          {/* Ambient Background Lights */}
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-cyan-500/20 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

          {/* Card Top Header */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[11px] font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Relaxation Break</span>
            </div>

            <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black flex items-center gap-1 shadow-2xs">
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>+10 XP</span>
            </span>
          </div>

          {/* Card Title & Description */}
          <div className="relative z-10 space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>🫧 Bubble Pop</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Take a quick 30–60s break. Pop bubbles to hit the target and refresh your focus!
            </p>
          </div>

          {/* Current Challenge Badge */}
          <div className="relative z-10 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-slate-200">Level {currentLevel} of 100</span>
            </div>
            <span className="text-slate-400 font-semibold">
              Target: <strong className="text-cyan-400">{targetScore.toLocaleString()}</strong>
            </span>
          </div>

          {/* Play Trigger Button */}
          <div className="relative z-10 pt-1">
            <button
              type="button"
              onClick={() => setIsPlaying(true)}
              className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-black rounded-2xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>START BREAK (PLAY BUBBLE POP)</span>
            </button>
          </div>

        </div>
      ) : (
        <div className="relative p-2 sm:p-4 bg-slate-950 flex flex-col items-center">
          <div className="w-full flex items-center justify-between pb-2 px-2 text-white">
            <span className="text-xs font-bold text-cyan-400">🫧 Bubble Pop Relaxation</span>
            <button
              type="button"
              onClick={() => setIsPlaying(false)}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-xs flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close Game</span>
            </button>
          </div>
          
          <BubblePopGame
            onClose={() => setIsPlaying(false)}
            onAwardXP={(xp) => {
              if (onGameCompleted) onGameCompleted(currentLevel, xp);
            }}
          />
        </div>
      )}

    </div>
  );
};
