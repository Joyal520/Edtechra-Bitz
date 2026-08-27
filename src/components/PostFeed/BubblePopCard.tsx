// ============================================================================
// EDTECHRA-BITZ: Bubble Pop Relaxation Feed Break Card
// Single-use relaxation card: after completion, user must continue learning
// down the feed to encounter the next level.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Sparkles, Play, Zap, X, CheckCircle2 } from 'lucide-react';
import { BubblePopGame, loadBubblePopProgress, calculateTargetScore } from '@/components/games/BubblePopGame';
import { bubblePopService, BubblePopCompletionResult } from '@/services/bubblePopService';
import { useAuth } from '@/context/AuthContext';

interface BubblePopCardProps {
  cardKey?: string;
  level?: number;
  onGameCompleted?: (level: number, xpEarned: number) => void;
}

export const BubblePopCard: React.FC<BubblePopCardProps> = ({
  level: initialLevelProp,
  onGameCompleted
}) => {
  const { session } = useAuth();
  const progress = loadBubblePopProgress();
  const assignedLevel = initialLevelProp || progress.highestUnlockedLevel || 1;

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [completedRecord, setCompletedRecord] = useState<BubblePopCompletionResult | null>(() => {
    return bubblePopService.getLocalCompletedLevel(assignedLevel);
  });

  const targetScore = calculateTargetScore(assignedLevel);

  // Check server/local progress on mount
  useEffect(() => {
    let isMounted = true;
    async function checkProgress() {
      const local = bubblePopService.getLocalCompletedLevel(assignedLevel);
      if (local && isMounted) {
        setCompletedRecord(local);
      }
    }
    checkProgress();
    return () => { isMounted = false; };
  }, [assignedLevel]);

  const handleGameSuccess = async (details: {
    level: number;
    score: number;
    targetScore: number;
    durationSeconds: number;
    xp: number;
  }) => {
    setIsPlaying(false);

    try {
      const token = session?.access_token || null;
      const res = await bubblePopService.submitCompletion(
        details.level,
        details.score,
        details.targetScore,
        details.durationSeconds,
        token
      );
      setCompletedRecord(res);

      if (onGameCompleted) {
        onGameCompleted(details.level, res.xp_awarded);
      }

      // Notify feed and global listeners of level completion
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('edtechra:activity_completed', {
            detail: { type: 'bubble_pop', id: `bubble_pop_${details.level}` }
          })
        );
      }
    } catch (e) {
      console.warn('[BubblePopCard] Submit completion fallback:', e);
      const fallbackRecord: BubblePopCompletionResult = {
        is_completed: true,
        level: details.level,
        score: details.score,
        target_score: details.targetScore,
        xp_awarded: details.xp,
        already_completed: false,
        completed_at: new Date().toISOString()
      };
      setCompletedRecord(fallbackRecord);
      bubblePopService.saveLocalCompletedLevel(details.level, fallbackRecord);
    }
  };

  // --------------------------------------------------------------------------
  // 1. FINAL COMPLETED STATE (Permanent, Clean, No Play Again, No Next Level)
  // --------------------------------------------------------------------------
  if (completedRecord && completedRecord.is_completed) {
    const finalScore = completedRecord.score || 0;
    const finalTarget = completedRecord.target_score || targetScore;
    const xpEarned = completedRecord.xp_awarded ?? 10;

    return (
      <div className="mx-3 sm:mx-0 bg-white border border-stone-200/90 rounded-3xl overflow-hidden shadow-xs">
        <div className="relative p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-[#0a1e36] to-slate-950 text-white flex flex-col gap-4 overflow-hidden animate-in fade-in duration-200">
          
          {/* Ambient Glows */}
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-cyan-500/20 blur-2xl pointer-events-none" />

          {/* Header Badges */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-extrabold uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>✓ LEVEL {completedRecord.level} COMPLETED</span>
            </div>

            <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black flex items-center gap-1 shadow-2xs">
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>+{xpEarned} XP Earned</span>
            </span>
          </div>

          {/* Title & Level Status */}
          <div className="relative z-10 space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>🫧 Level {completedRecord.level} Cleared!</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              You&apos;ve completed this level.
            </p>
          </div>

          {/* Score Metrics Grid */}
          <div className="relative z-10 grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center text-xs">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Score</div>
              <div className="text-base sm:text-lg font-black text-cyan-400">
                {finalScore.toLocaleString()}
              </div>
            </div>
            <div className="border-l border-white/10">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Target Score</div>
              <div className="text-base sm:text-lg font-black text-slate-200">
                {finalTarget.toLocaleString()}
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 2. PRE-GAME / ACTIVE GAME PLAY STATE
  // --------------------------------------------------------------------------
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
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-slate-200">Level {assignedLevel} of 100</span>
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
              className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-black rounded-2xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>START BREAK (PLAY BUBBLE POP)</span>
            </button>
          </div>

        </div>
      ) : (
        <div className="relative p-2 sm:p-4 bg-slate-950 flex flex-col items-center">
          <div className="w-full flex items-center justify-between pb-2 px-2 text-white">
            <span className="text-xs font-bold text-cyan-400">🫧 Bubble Pop (Level {assignedLevel})</span>
            <button
              type="button"
              onClick={() => setIsPlaying(false)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-xs flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close Game</span>
            </button>
          </div>
          
          <BubblePopGame
            initialLevel={assignedLevel}
            onClose={() => setIsPlaying(false)}
            onLevelCompleted={handleGameSuccess}
          />
        </div>
      )}

    </div>
  );
};
