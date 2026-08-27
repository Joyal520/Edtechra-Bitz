// ============================================================================
// EDTECHRA-BITZ: Spelling Flip Card Interactive Feed Card
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Play, Zap, X, CheckCircle2 } from 'lucide-react';
import { SpellingFlipCardItem, SpellingFlipLevel } from '@/types/spellingFlipCard';
import { SpellingFlipGame } from '@/components/games/SpellingFlipGame';
import { INITIAL_SEED_CARDS } from '@/services/spellingFlipCardService';
import { triggerConfetti } from '@/utils/confetti';

interface SpellingFlipCardCardProps {
  card?: SpellingFlipCardItem;
  allCards?: SpellingFlipCardItem[];
  onAttemptCompleted?: (activityId: string, isCorrect: boolean, xp: number) => void;
}

interface FlipResultState {
  correct: number;
  total: number;
  totalXp: number;
  bestScore?: string;
  level: SpellingFlipLevel;
}

export const SpellingFlipCardCard: React.FC<SpellingFlipCardCardProps> = ({
  card: initialCard,
  allCards = INITIAL_SEED_CARDS,
  onAttemptCompleted
}) => {
  const [activeCard, setActiveCard] = useState<SpellingFlipCardItem>(
    initialCard || allCards[0] || INITIAL_SEED_CARDS[0]
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<FlipResultState | null>(() => {
    const cardId = initialCard?.id || allCards[0]?.id;
    if (typeof window !== 'undefined' && cardId) {
      try {
        const saved = localStorage.getItem(`edtechra_completed_flip_${cardId}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    if (initialCard?.has_completed) {
      return {
        correct: 1,
        total: 1,
        totalXp: initialCard.xp || 10,
        level: initialCard.level || 'easy',
        bestScore: '1 / 1'
      };
    }
    return null;
  });

  // Sync activeCard when prop changes
  useEffect(() => {
    if (initialCard && initialCard.id !== activeCard.id) {
      setActiveCard(initialCard);
    }
  }, [initialCard]);

  const level = activeCard.level || 'easy';
  const memorizeSeconds = activeCard.memorize_seconds || (level === 'easy' ? 30 : level === 'intermediate' ? 20 : 10);
  const xp = activeCard.xp || (level === 'easy' ? 10 : level === 'intermediate' ? 15 : 20);
  const wordLength = activeCard.word?.length || 5;

  // Determine next level card from allCards pool
  const nextLevelCard = useMemo(() => {
    if (!allCards || allCards.length === 0) return null;
    const currentIndex = allCards.findIndex(c => c.id === activeCard.id);

    // 1. Try finding a card with higher difficulty level
    const levelOrder: SpellingFlipLevel[] = ['easy', 'intermediate', 'hard'];
    const currentLevelIdx = levelOrder.indexOf(level);
    if (currentLevelIdx >= 0 && currentLevelIdx < levelOrder.length - 1) {
      const nextLevelName = levelOrder[currentLevelIdx + 1];
      const nextByLevel = allCards.find(c => c.level === nextLevelName);
      if (nextByLevel) return nextByLevel;
    }

    // 2. Otherwise next sequential card in pool
    if (currentIndex >= 0 && currentIndex < allCards.length - 1) {
      return allCards[currentIndex + 1];
    }
    return null;
  }, [allCards, activeCard, level]);

  const handleNextLevel = () => {
    if (nextLevelCard) {
      setActiveCard(nextLevelCard);
      setLastResult(null);
      setIsPlaying(true);
    }
  };

  const handleSessionCompleted = (stats: { correct: number; total: number; totalXp: number }) => {
    const resultObj: FlipResultState = {
      correct: stats.correct,
      total: stats.total,
      totalXp: stats.totalXp,
      level: activeCard.level,
      bestScore: `${stats.correct} / ${stats.total}`
    };
    setLastResult(resultObj);
    setIsPlaying(false);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`edtechra_completed_flip_${activeCard.id}`, JSON.stringify(resultObj));
      } catch (e) {}
    }

    if (stats.correct > 0) {
      triggerConfetti();
    }

    if (onAttemptCompleted) {
      onAttemptCompleted(activeCard.id, stats.correct > 0, stats.totalXp);
    }
  };

  return (
    <div className="mx-3 sm:mx-0 bg-white border border-stone-200/90 rounded-3xl overflow-hidden shadow-xs">
      {!isPlaying ? (
        lastResult ? (
          /* ================================================================
             POST-GAME RESULT & NEXT ACTION STATE (TRANSFORMED PANEL)
             ================================================================ */
          <div className="relative p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-[#0c1e33] to-slate-950 text-white flex flex-col gap-4 overflow-hidden animate-in fade-in duration-200">
            {/* Ambient Glows */}
            <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-cyan-500/20 blur-2xl pointer-events-none" />

            {/* Header Badges */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>✓ Challenge Complete</span>
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black flex items-center gap-1 shadow-2xs">
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                <span>+{lastResult.totalXp} XP</span>
              </span>
            </div>

            {/* Title & Level Info */}
            <div className="relative z-10 space-y-1">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>🃏 Spelling Memory Test: <span className="text-cyan-400 capitalize">{activeCard.level}</span></span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                {lastResult.correct >= lastResult.total
                  ? 'Perfect recall! Excellent memory and spelling accuracy.'
                  : 'Well done! Practice again or advance to the next level.'}
              </p>
            </div>

            {/* Score Metrics Grid */}
            <div className="relative z-10 grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center text-xs">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Score</div>
                <div className="text-base sm:text-lg font-black text-emerald-400">
                  {lastResult.correct} / {lastResult.total}
                </div>
              </div>
              <div className="border-x border-white/10">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Earned XP</div>
                <div className="text-base sm:text-lg font-black text-amber-400">
                  +{lastResult.totalXp} XP
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Best Score</div>
                <div className="text-base sm:text-lg font-black text-cyan-300">
                  {lastResult.bestScore || `${lastResult.correct}/${lastResult.total}`}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ================================================================
             PRE-GAME / INITIAL START STATE
             ================================================================ */
          <div className="relative p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-[#0c1e33] to-slate-950 text-white flex flex-col gap-4 overflow-hidden">
            {/* Ambient Glows */}
            <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-cyan-500/20 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

            {/* Header Badges */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Spelling Flip Card</span>
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black flex items-center gap-1 shadow-2xs">
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                <span>+{xp} XP</span>
              </span>
            </div>

            {/* Title & Rules */}
            <div className="relative z-10 space-y-1">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>🃏 Memory Spelling Challenge</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                Memorize the spelling before the timer runs out. Once the word flips, type it from memory!
              </p>
            </div>

            {/* Details Row */}
            <div className="relative z-10 grid grid-cols-3 gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 text-center text-xs">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Level</div>
                <div className="font-extrabold text-cyan-300 capitalize">{level}</div>
              </div>
              <div className="border-x border-white/10">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Memorize</div>
                <div className="font-extrabold text-amber-400">{memorizeSeconds}s</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Length</div>
                <div className="font-extrabold text-slate-200">{wordLength} letters</div>
              </div>
            </div>

            {/* Action Trigger */}
            <div className="relative z-10 pt-1">
              <button
                type="button"
                onClick={() => setIsPlaying(true)}
                className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-black rounded-2xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>START SPELLING MEMORY TEST</span>
              </button>
            </div>
          </div>
        )
      ) : (
        /* ================================================================
           ACTIVE PLAYING STATE
           ================================================================ */
        <div className="relative p-2 sm:p-4 bg-slate-950 flex flex-col items-center">
          <div className="w-full flex items-center justify-between pb-2 px-2 text-white">
            <span className="text-xs font-bold text-cyan-400">🃏 Spelling Flip Card ({activeCard.level})</span>
            <button
              type="button"
              onClick={() => setIsPlaying(false)}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-xs flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          </div>

          <SpellingFlipGame
            cards={[activeCard]}
            level={activeCard.level}
            hasNextLevel={Boolean(nextLevelCard)}
            onNextLevel={handleNextLevel}
            onClose={() => setIsPlaying(false)}
            onSessionCompleted={handleSessionCompleted}
          />
        </div>
      )}
    </div>
  );
};
