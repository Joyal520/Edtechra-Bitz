import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  RotateCcw,
  Undo2,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Zap,
  ArrowRight,
  Trophy
} from 'lucide-react';
import { ReorderActivity, WordTile, ReorderAttemptResult } from '@/types/reorder';
import { reorderService } from '@/services/reorderService';
import { reorderAudio } from '@/utils/reorderAudio';
import { triggerConfetti } from '@/utils/confetti';
import { useAuth } from '@/context/AuthContext';
import { shuffleSentenceWords } from '@/utils/reorderValidation';

interface ReorderSentenceCardProps {
  reorder: ReorderActivity;
  allReorders?: ReorderActivity[];
  onAttemptCompleted?: (activityId: string, result: ReorderAttemptResult) => void;
}

export const ReorderSentenceCard: React.FC<ReorderSentenceCardProps> = ({
  reorder: initialReorder,
  allReorders = [],
  onAttemptCompleted
}) => {
  const { session } = useAuth();
  const cardRef = useRef<HTMLElement>(null);

  const [activeReorder, setActiveReorder] = useState<ReorderActivity>(initialReorder);

  useEffect(() => {
    if (initialReorder && initialReorder.id !== activeReorder.id) {
      setActiveReorder(initialReorder);
    }
  }, [initialReorder]);

  // Next reorder detection from pool
  const nextReorder = useMemo(() => {
    if (!allReorders || allReorders.length === 0) return null;
    const currentIndex = allReorders.findIndex(r => r.id === activeReorder.id);
    if (currentIndex >= 0 && currentIndex < allReorders.length - 1) {
      return allReorders[currentIndex + 1];
    }
    return null;
  }, [allReorders, activeReorder]);

  // Initialize word tiles using unbiased Fisher–Yates shuffle with non-identity guarantee
  const generateWordTiles = useCallback((item: ReorderActivity): WordTile[] => {
    const correctWords = Array.isArray(item.correct_order) && item.correct_order.length > 0
      ? item.correct_order
      : item.sentence.split(/\s+/).filter(Boolean);

    let wordsToScramble: string[] = [];
    if (Array.isArray(item.scrambled_words) && item.scrambled_words.length === correctWords.length) {
      const isIdentical = item.scrambled_words.every((w, idx) => w === correctWords[idx]);
      wordsToScramble = isIdentical
        ? shuffleSentenceWords(correctWords)
        : item.scrambled_words;
    } else {
      wordsToScramble = shuffleSentenceWords(correctWords);
    }

    return wordsToScramble.map((word, index) => ({
      id: `tile-${item.id}-${index}-${word}-${Date.now()}`,
      word,
      originalIndex: index
    }));
  }, []);

  const initialTiles = useMemo<WordTile[]>(() => {
    return generateWordTiles(activeReorder);
  }, [activeReorder, generateWordTiles]);

  const targetCount = activeReorder.correct_order?.length || activeReorder.sentence.split(/\s+/).length;

  // Interaction & Game State
  const [availableTiles, setAvailableTiles] = useState<WordTile[]>(initialTiles);
  const [placedTiles, setPlacedTiles] = useState<WordTile[]>([]);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [usedHint, setUsedHint] = useState<boolean>(false);
  const [result, setResult] = useState<ReorderAttemptResult | null>(() => {
    if (typeof window !== 'undefined' && activeReorder?.id) {
      try {
        const saved = localStorage.getItem(`edtechra_completed_reorder_${activeReorder.id}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Reset state if activeReorder changes
  useEffect(() => {
    const tiles = generateWordTiles(activeReorder);
    setAvailableTiles(tiles);
    setPlacedTiles([]);
    setUsedHint(false);
    setErrorNotice(null);

    let existingResult: ReorderAttemptResult | null = null;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`edtechra_completed_reorder_${activeReorder.id}`);
        if (saved) existingResult = JSON.parse(saved);
      } catch (e) {}
    }

    if (!existingResult && activeReorder.has_completed) {
      existingResult = {
        is_correct: true,
        correct_sentence: activeReorder.sentence,
        explanation: activeReorder.explanation || undefined,
        xp_awarded: activeReorder.xp || 10,
        already_completed: true
      };
    }

    setResult(existingResult);
  }, [activeReorder, generateWordTiles]);

  /**
   * Render-Time First Word Capitalization
   * Automatically capitalizes the first letter if in slot 0, without mutating stored data.
   */
  const formatWordDisplay = (word: string, slotIndex: number) => {
    if (slotIndex === 0 && word.length > 0) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    return word;
  };

  /**
   * Handle Tapping an Available Word in the Word Bank
   */
  const handleSelectWord = (tile: WordTile) => {
    if (isAnimating || result?.is_correct || isSubmitting) return;

    setIsAnimating(true);
    setErrorNotice(null);
    reorderAudio.playTileClick();

    // Remove from available, add to placed
    setAvailableTiles((prev) => prev.filter((t) => t.id !== tile.id));
    const nextPlaced = [...placedTiles, tile];
    setPlacedTiles(nextPlaced);

    // Release animation lock
    setTimeout(() => {
      setIsAnimating(false);
    }, 280);

    // If all words are now placed, check answer
    if (nextPlaced.length === targetCount) {
      checkCompletedSentence(nextPlaced);
    }
  };

  /**
   * Handle Undo: Returns the most recently placed word to the bank
   */
  const handleUndo = () => {
    if (isAnimating || placedTiles.length === 0 || result?.is_correct || isSubmitting) return;

    setIsAnimating(true);
    setErrorNotice(null);
    reorderAudio.playUndoPop();

    const lastTile = placedTiles[placedTiles.length - 1];
    setPlacedTiles((prev) => prev.slice(0, -1));
    setAvailableTiles((prev) => [...prev, lastTile]);

    setTimeout(() => {
      setIsAnimating(false);
    }, 250);
  };

  /**
   * Handle Reset: Clears all placed tiles
   */
  const handleReset = () => {
    if (isAnimating || placedTiles.length === 0 || result?.is_correct || isSubmitting) return;

    reorderAudio.playUndoPop();
    setAvailableTiles(initialTiles);
    setPlacedTiles([]);
    setErrorNotice(null);
  };

  /**
   * Handle Hint: Places the next correct word from the available bank
   */
  const handleUseHint = () => {
    if (isAnimating || usedHint || result?.is_correct || placedTiles.length >= targetCount) return;

    const nextIndex = placedTiles.length;
    const expectedWord = activeReorder.correct_order[nextIndex];
    if (!expectedWord) return;

    // Find matching available tile (case-insensitive)
    const matchingTile = availableTiles.find(
      (t) => t.word.trim().toLowerCase() === expectedWord.trim().toLowerCase()
    );

    if (!matchingTile) return;

    setIsAnimating(true);
    setUsedHint(true);
    setErrorNotice(null);
    reorderAudio.playHintShimmer();

    setAvailableTiles((prev) => prev.filter((t) => t.id !== matchingTile.id));
    const nextPlaced = [...placedTiles, matchingTile];
    setPlacedTiles(nextPlaced);

    setTimeout(() => {
      setIsAnimating(false);
    }, 300);

    if (nextPlaced.length === targetCount) {
      checkCompletedSentence(nextPlaced);
    }
  };

  /**
   * Evaluate Sentence when all slots are filled
   */
  const checkCompletedSentence = async (tiles: WordTile[]) => {
    const userWords = tiles.map((t) => t.word.trim().toLowerCase());
    const expectedWords = activeReorder.correct_order.map((w: string) => w.trim().toLowerCase());

    const isMatch =
      userWords.length === expectedWords.length &&
      userWords.every((w, i) => w === expectedWords[i]);

    if (isMatch) {
      // Correct!
      reorderAudio.playCorrectChime();
      triggerConfetti(cardRef.current);
      setIsSubmitting(true);
      try {
        const token = session?.access_token || null;
        const attemptRes = await reorderService.submitCompletion(
          activeReorder.id,
          tiles.map((t) => t.word),
          usedHint,
          token
        );
        setResult(attemptRes);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`edtechra_completed_reorder_${activeReorder.id}`, JSON.stringify(attemptRes));
          } catch (e) {}
        }
        if (onAttemptCompleted) {
          onAttemptCompleted(activeReorder.id, attemptRes);
        }
      } catch (err: any) {
        console.error('[ReorderSentenceCard] Submit completion error:', err);
        const fallbackRes = {
          is_correct: true,
          correct_sentence: activeReorder.sentence,
          explanation: activeReorder.explanation || undefined,
          xp_awarded: usedHint ? Math.max(5, (activeReorder.xp || 10) - 2) : (activeReorder.xp || 10),
          already_completed: false
        };
        setResult(fallbackRes);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`edtechra_completed_reorder_${activeReorder.id}`, JSON.stringify(fallbackRes));
          } catch (e) {}
        }
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Incorrect: subtle shake & gentle sound
      reorderAudio.playWrongThud();
      setIsShaking(true);
      setErrorNotice('Not quite! Try rearranging the words to make the correct sentence.');
      setTimeout(() => {
        setIsShaking(false);
      }, 500);
    }
  };

  /**
   * Play Again: Restarts this sentence with a fresh randomized shuffle
   */
  const handlePlayAgain = () => {
    const freshTiles = generateWordTiles(activeReorder);
    setAvailableTiles(freshTiles);
    setPlacedTiles([]);
    setUsedHint(false);
    setResult(null);
    setErrorNotice(null);
    reorderAudio.playTileClick();
  };

  /**
   * Next Level / Sentence: Advances to next sentence in pool without scrolling
   */
  const handleNextLevel = () => {
    if (nextReorder) {
      setActiveReorder(nextReorder);
    }
  };

  const isCompleted = Boolean(result?.is_correct);
  const earnedXP = result?.xp_awarded ?? (usedHint ? Math.max(5, (activeReorder.xp || 10) - 2) : (activeReorder.xp || 10));

  return (
    <article
      ref={cardRef}
      className="w-full bg-[#031124] border border-blue-900/60 rounded-3xl overflow-hidden shadow-lg transition-all relative text-white"
    >
      {/* 1. Header Strip */}
      <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-3.5 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between text-white shadow-xs">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-[11px] sm:text-xs shadow-2xs shrink-0">
            🔤
          </div>
          <span className="text-xs font-black uppercase tracking-wider truncate">
            Sentence Reorder
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {activeReorder.category && (
            <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-extrabold">
              {activeReorder.category}
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full bg-black/30 text-[10px] font-extrabold text-cyan-200">
            Level {activeReorder.level || 'A1'}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black shadow-2xs flex items-center gap-1">
            <Zap className="w-3 h-3 fill-slate-950" />
            +{activeReorder.xp || 10} XP
          </span>
        </div>
      </div>

      {/* 2. Main Game Container */}
      <div className="p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
        {/* Instruction and Micro-Goal (Learning Typography) */}
        <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-slate-400 gap-2">
          <span className="flex items-center gap-1.5 text-cyan-400 learning-content-text min-w-0">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Tap words in the correct order</span>
          </span>
          <span className="text-slate-400 font-medium shrink-0 text-[11px]">
            {placedTiles.length} / {targetCount}
          </span>
        </div>

        {/* 3. ANSWER SENTENCE SLOTS (Target Drop Zone) — Responsive 320px-430px+ Flex Wrap */}
        <div
          className={`min-h-[58px] sm:min-h-[68px] p-2.5 sm:p-3.5 rounded-2xl bg-slate-900/80 border transition-all flex flex-wrap items-center gap-1.5 sm:gap-2 ${
            isCompleted
              ? 'border-emerald-500/80 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
              : isShaking
              ? 'border-rose-500/80 bg-rose-950/20 animate-shake'
              : 'border-blue-500/30 shadow-inner'
          }`}
        >
          {placedTiles.length === 0 && !isCompleted ? (
            <span className="text-xs sm:text-sm text-slate-500 font-medium italic pl-1 select-none">
              Select words below to construct your sentence…
            </span>
          ) : (
            placedTiles.map((tile, index) => (
              <button
                key={tile.id}
                onClick={handleUndo}
                disabled={isCompleted || isAnimating}
                className="min-h-[38px] sm:min-h-[44px] px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 select-none active:scale-95 transition-all cursor-pointer border border-cyan-400/40"
                title="Tap to remove"
              >
                <span>{formatWordDisplay(tile.word, index)}</span>
              </button>
            ))
          )}
        </div>

        {/* Error / Alert Message */}
        {errorNotice && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* 4. SCRAMBLED WORD TILES BANK */}
        {!isCompleted && (
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Word Bank</span>
            </div>

            <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap gap-2 items-center justify-center min-h-[60px]">
              {availableTiles.length === 0 ? (
                <span className="text-xs text-slate-500 italic py-1">
                  All words placed!
                </span>
              ) : (
                availableTiles.map((tile) => (
                  <button
                    key={tile.id}
                    onClick={() => handleSelectWord(tile)}
                    disabled={isAnimating}
                    className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 hover:from-blue-900/60 hover:to-slate-800 border border-blue-400/30 hover:border-cyan-400 text-cyan-100 text-xs sm:text-sm md:text-base font-bold shadow-md hover:shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer select-none max-w-full"
                  >
                    {tile.word}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* 5. SUCCESS CARD & EXPLANATION */}
        {isCompleted && (
          <div className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-teal-950/30 border border-emerald-500/40 space-y-2.5 sm:space-y-3 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-sm sm:text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>✓ Sentence Complete!</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-black flex items-center gap-1 shadow-xs">
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                +{earnedXP} XP
              </span>
            </div>

            <div className="text-sm sm:text-base md:text-lg font-black text-white leading-relaxed tracking-wide">
              &ldquo;{activeReorder.sentence}&rdquo;
            </div>

            {activeReorder.explanation && (
              <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-slate-300 leading-relaxed font-medium learning-content-text">
                <span className="font-bold text-cyan-300 mr-1">Explanation:</span>
                {activeReorder.explanation}
              </div>
            )}

            <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-emerald-500/20">
              <span>Score: <strong className="text-emerald-400">1 / 1</strong></span>
              <span>Level: <strong className="text-cyan-300">{activeReorder.level || 'A1'}</strong></span>
              <span>XP Earned: <strong className="text-amber-400">+{earnedXP} XP</strong></span>
            </div>
          </div>
        )}

        {/* 6. POST-GAME ACTION BUTTONS (PLAY AGAIN & NEXT LEVEL) */}
        {isCompleted && (
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5 animate-in fade-in">
            <button
              type="button"
              onClick={handlePlayAgain}
              className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-black border border-slate-700 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span>PLAY AGAIN</span>
            </button>

            {nextReorder ? (
              <button
                type="button"
                onClick={handleNextLevel}
                className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                <span>NEXT SENTENCE ({nextReorder.level || 'Next'})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-full sm:flex-1 py-3 px-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5 min-h-[44px]">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>All Sentences Completed!</span>
              </div>
            )}
          </div>
        )}

        {/* 7. IN-GAME ACTION CONTROLS (Undo, Reset, Hint) */}
        {!isCompleted && (
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={handleUndo}
                disabled={placedTiles.length === 0 || isAnimating}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed border border-slate-700"
                title="Undo last word"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>

              <button
                onClick={handleReset}
                disabled={placedTiles.length === 0 || isAnimating}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed border border-slate-700"
                title="Reset all words"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Hint Button */}
            <button
              onClick={handleUseHint}
              disabled={usedHint || isAnimating || placedTiles.length >= targetCount}
              className={`min-h-[40px] px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed ${
                usedHint
                  ? 'bg-slate-800/50 text-slate-500 border border-slate-800'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 hover:border-amber-400 shadow-xs'
              }`}
              title={usedHint ? 'Hint already used' : 'Reveal next word (-2 XP)'}
            >
              <Lightbulb className={`w-3.5 h-3.5 ${usedHint ? 'text-slate-500' : 'text-amber-300 fill-amber-300'}`} />
              <span>{usedHint ? 'Hint Used' : 'Hint (-2 XP)'}</span>
            </button>
          </div>
        )}
      </div>
    </article>
  );
};
