import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  RotateCcw,
  Undo2,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Zap
} from 'lucide-react';
import { ReorderActivity, WordTile, ReorderAttemptResult } from '@/types/reorder';
import { reorderService } from '@/services/reorderService';
import { reorderAudio } from '@/utils/reorderAudio';
import { triggerConfetti } from '@/utils/confetti';
import { useAuth } from '@/context/AuthContext';
import { shuffleSentenceWords } from '@/utils/reorderValidation';

interface ReorderSentenceCardProps {
  reorder: ReorderActivity;
  onAttemptCompleted?: (activityId: string, result: ReorderAttemptResult) => void;
}

export const ReorderSentenceCard: React.FC<ReorderSentenceCardProps> = ({
  reorder,
  onAttemptCompleted
}) => {
  const { session } = useAuth();
  const cardRef = useRef<HTMLElement>(null);

  // Initialize word tiles using unbiased Fisher–Yates shuffle with non-identity guarantee
  const initialTiles = useMemo<WordTile[]>(() => {
    const correctWords = Array.isArray(reorder.correct_order) && reorder.correct_order.length > 0
      ? reorder.correct_order
      : reorder.sentence.split(/\s+/).filter(Boolean);

    let wordsToScramble: string[] = [];
    if (Array.isArray(reorder.scrambled_words) && reorder.scrambled_words.length === correctWords.length) {
      // Check if pre-stored scrambled words already differ from correct order
      const isIdentical = reorder.scrambled_words.every((w, idx) => w === correctWords[idx]);
      wordsToScramble = isIdentical
        ? shuffleSentenceWords(correctWords)
        : reorder.scrambled_words;
    } else {
      wordsToScramble = shuffleSentenceWords(correctWords);
    }

    return wordsToScramble.map((word, index) => ({
      id: `tile-${reorder.id}-${index}-${word}`,
      word,
      originalIndex: index
    }));
  }, [reorder]);

  const targetCount = reorder.correct_order?.length || reorder.sentence.split(/\s+/).length;

  // Interaction & Game State
  const [availableTiles, setAvailableTiles] = useState<WordTile[]>(initialTiles);
  const [placedTiles, setPlacedTiles] = useState<WordTile[]>([]);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [usedHint, setUsedHint] = useState<boolean>(false);
  const [result, setResult] = useState<ReorderAttemptResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Reset state if activity prop changes
  useEffect(() => {
    setAvailableTiles(initialTiles);
    setPlacedTiles([]);
    setUsedHint(false);
    setResult(null);
    setErrorNotice(null);
  }, [initialTiles]);

  // If already completed in previous session
  useEffect(() => {
    if (reorder.has_completed && !result) {
      setResult({
        is_correct: true,
        correct_sentence: reorder.sentence,
        explanation: reorder.explanation || undefined,
        xp_awarded: reorder.xp || 10,
        already_completed: true
      });
    }
  }, [reorder.has_completed, reorder.sentence, reorder.explanation, reorder.xp, result]);

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
    const expectedWord = reorder.correct_order[nextIndex];
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
    const expectedWords = reorder.correct_order.map((w) => w.trim().toLowerCase());

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
          reorder.id,
          tiles.map((t) => t.word),
          usedHint,
          token
        );
        setResult(attemptRes);
        if (onAttemptCompleted) {
          onAttemptCompleted(reorder.id, attemptRes);
        }
      } catch (err: any) {
        console.error('[ReorderSentenceCard] Submit completion error:', err);
        setResult({
          is_correct: true,
          correct_sentence: reorder.sentence,
          explanation: reorder.explanation || undefined,
          xp_awarded: usedHint ? Math.max(5, (reorder.xp || 10) - 2) : (reorder.xp || 10),
          already_completed: false
        });
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

  const isCompleted = Boolean(result?.is_correct);
  const earnedXP = result?.xp_awarded ?? (usedHint ? Math.max(5, (reorder.xp || 10) - 2) : (reorder.xp || 10));

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
          {reorder.category && (
            <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-extrabold">
              {reorder.category}
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full bg-black/30 text-[10px] font-extrabold text-cyan-200">
            Level {reorder.level || 'A1'}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black shadow-2xs flex items-center gap-1">
            <Zap className="w-3 h-3 fill-slate-950" />
            +{reorder.xp || 10} XP
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
          {placedTiles.map((tile, idx) => (
            <button
              key={tile.id}
              onClick={() => {
                // Clicking placed tile returns it to bank
                if (!isCompleted && !isAnimating) {
                  reorderAudio.playUndoPop();
                  setPlacedTiles((prev) => prev.filter((_, i) => i !== idx));
                  setAvailableTiles((prev) => [...prev, tile]);
                }
              }}
              disabled={isCompleted || isAnimating}
              className={`min-h-[38px] sm:min-h-[42px] px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm md:text-base font-bold shadow-md transition-all cursor-pointer select-none max-w-full truncate ${
                isCompleted
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-emerald-900/30'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:scale-103 active:scale-95 shadow-cyan-900/30'
              }`}
              title="Tap to return word to bank"
            >
              {formatWordDisplay(tile.word, idx)}
            </button>
          ))}

          {/* Empty Placeholder Slots */}
          {!isCompleted &&
            Array.from({ length: Math.max(0, targetCount - placedTiles.length) }).map((_, placeholderIdx) => (
              <div
                key={`placeholder-${placeholderIdx}`}
                className="h-9 sm:h-10 min-w-[42px] sm:min-w-[48px] px-2.5 sm:px-3 rounded-xl border-2 border-dashed border-slate-700/80 bg-slate-800/30 flex items-center justify-center text-xs text-slate-500 select-none"
              >
                _
              </div>
            ))}
        </div>

        {/* Error Feedback Message (Gentle & Actionable) */}
        {errorNotice && !isCompleted && (
          <div className="p-2.5 sm:p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="learning-content-text">{errorNotice}</span>
          </div>
        )}

        {/* 4. SCRAMBLED WORD BANK (Interactive Tiles) — Responsive Auto-Wrap, Touch Targets >= 44px */}
        {!isCompleted && (
          <div className="space-y-1.5 sm:space-y-2">
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Word Bank</span>
              {reorder.hint && !usedHint && (
                <span className="text-amber-400 text-[10px] lowercase italic font-normal">
                  💡 hint available
                </span>
              )}
            </div>

            <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex flex-wrap gap-2 sm:gap-2.5 items-center justify-center min-h-[56px] sm:min-h-[64px]">
              {availableTiles.length === 0 ? (
                <span className="text-xs text-slate-500 italic py-2">
                  All words placed. Evaluating sentence...
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
              &ldquo;{reorder.sentence}&rdquo;
            </div>

            {reorder.explanation && (
              <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-slate-300 leading-relaxed font-medium learning-content-text">
                <span className="font-bold text-cyan-300 mr-1">Explanation:</span>
                {reorder.explanation}
              </div>
            )}
          </div>
        )}

        {/* 6. ACTION CONTROLS (Undo, Reset, Hint) — Mobile Touch-Friendly */}
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
