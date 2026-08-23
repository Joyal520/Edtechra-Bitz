// ============================================================================
// EDTECHRA-BITZ: Spelling Flip Card Interactive Feed Card
// ============================================================================

import React, { useState } from 'react';
import { Sparkles, Play, Zap, X } from 'lucide-react';
import { SpellingFlipCardItem } from '@/types/spellingFlipCard';
import { SpellingFlipGame } from '@/components/games/SpellingFlipGame';

interface SpellingFlipCardCardProps {
  card?: SpellingFlipCardItem;
  onAttemptCompleted?: (activityId: string, isCorrect: boolean, xp: number) => void;
}

export const SpellingFlipCardCard: React.FC<SpellingFlipCardCardProps> = ({
  card,
  onAttemptCompleted
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const level = card?.level || 'easy';
  const memorizeSeconds = card?.memorize_seconds || (level === 'easy' ? 30 : level === 'intermediate' ? 20 : 10);
  const xp = card?.xp || (level === 'easy' ? 10 : level === 'intermediate' ? 15 : 20);
  const wordLength = card?.word?.length || 5;

  return (
    <div className="mx-3 sm:mx-0 bg-white border border-stone-200/90 rounded-3xl overflow-hidden shadow-xs">
      {!isPlaying ? (
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
              className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-black rounded-2xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>START SPELLING MEMORY TEST</span>
            </button>
          </div>

        </div>
      ) : (
        <div className="relative p-2 sm:p-4 bg-slate-950 flex flex-col items-center">
          <div className="w-full flex items-center justify-between pb-2 px-2 text-white">
            <span className="text-xs font-bold text-cyan-400">🃏 Spelling Flip Card</span>
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
            cards={card ? [card] : undefined}
            level={card?.level}
            onClose={() => setIsPlaying(false)}
            onSessionCompleted={(stats) => {
              if (onAttemptCompleted && card) {
                onAttemptCompleted(card.id, stats.correct > 0, stats.totalXp);
              }
            }}
          />
        </div>
      )}
    </div>
  );
};
