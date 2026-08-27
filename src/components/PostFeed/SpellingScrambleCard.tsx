// ============================================================================
// EDTECHRA-BITZ: Spelling Scramble Interactive Microlearning Game Card
// ============================================================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  RotateCcw,
  Undo2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  Zap,
  Flame,
  Check,
  ArrowRight,
  Trophy
} from 'lucide-react';
import { SpellingScramble, LetterTile, SpellingScrambleAttemptResult, SpellingDifficulty } from '@/types/spellingScramble';
import { spellingScrambleService } from '@/services/spellingScrambleService';
import { reorderAudio } from '@/utils/reorderAudio';
import { triggerConfetti } from '@/utils/confetti';
import { useAuth } from '@/context/AuthContext';

interface SpellingScrambleCardProps {
  scramble: SpellingScramble;
  allScrambles?: SpellingScramble[];
  onAttemptCompleted?: (activityId: string, result: SpellingScrambleAttemptResult) => void;
}

export const SpellingScrambleCard: React.FC<SpellingScrambleCardProps> = ({
  scramble: initialScramble,
  allScrambles = [],
  onAttemptCompleted
}) => {
  const { session } = useAuth();
  const cardRef = useRef<HTMLElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [activeScramble, setActiveScramble] = useState<SpellingScramble>(initialScramble);

  useEffect(() => {
    if (initialScramble && initialScramble.id !== activeScramble.id) {
      setActiveScramble(initialScramble);
    }
  }, [initialScramble]);

  // Next level / challenge detection
  const nextScramble = useMemo(() => {
    if (!allScrambles || allScrambles.length === 0) return null;
    const currentIndex = allScrambles.findIndex(s => s.id === activeScramble.id);

    // 1. Try finding a scramble with higher difficulty
    const diffOrder: SpellingDifficulty[] = ['Easy', 'Medium', 'Hard'];
    const currentDiffIdx = diffOrder.indexOf(activeScramble.difficulty);
    if (currentDiffIdx >= 0 && currentDiffIdx < diffOrder.length - 1) {
      const nextDiffName = diffOrder[currentDiffIdx + 1];
      const nextByDiff = allScrambles.find(s => s.difficulty === nextDiffName && s.id !== activeScramble.id);
      if (nextByDiff) return nextByDiff;
    }

    // 2. Next sequential scramble in pool
    if (currentIndex >= 0 && currentIndex < allScrambles.length - 1) {
      return allScrambles[currentIndex + 1];
    }
    return null;
  }, [allScrambles, activeScramble]);

  // Initialize letter tiles with unique IDs to safely support duplicate letters
  const generateShuffledTiles = useCallback((scrambleItem: SpellingScramble): LetterTile[] => {
    const rawLetters = Array.isArray(scrambleItem.scrambled_letters) && scrambleItem.scrambled_letters.length > 0
      ? [...scrambleItem.scrambled_letters].sort(() => Math.random() - 0.5)
      : scrambleItem.word.split('').sort(() => Math.random() - 0.5);

    return rawLetters.map((letter, index) => ({
      id: `letter-${scrambleItem.id}-${index}-${Date.now()}`,
      letter: String(letter).toUpperCase(),
      originalIndex: index
    }));
  }, []);

  const initialTiles = useMemo<LetterTile[]>(() => {
    return generateShuffledTiles(activeScramble);
  }, [activeScramble, generateShuffledTiles]);

  const targetWord = activeScramble.word.toUpperCase().trim();
  const targetCount = targetWord.length;

  // Game Phases: 'idle' | 'playing' | 'completed' | 'time_up'
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'completed' | 'time_up'>('idle');

  // Tile Selection State
  const [availableTiles, setAvailableTiles] = useState<LetterTile[]>(initialTiles);
  const [placedTiles, setPlacedTiles] = useState<LetterTile[]>([]);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // Timer State
  const totalTimerSeconds = activeScramble.timer_seconds || (activeScramble.difficulty === 'Hard' ? 60 : activeScramble.difficulty === 'Medium' ? 45 : 30);
  const [timeLeft, setTimeLeft] = useState<number>(totalTimerSeconds);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Result & Submission State
  const [result, setResult] = useState<SpellingScrambleAttemptResult | null>(() => {
    if (typeof window !== 'undefined' && activeScramble?.id) {
      try {
        const saved = localStorage.getItem(`edtechra_completed_scramble_${activeScramble.id}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [streak, setStreak] = useState<number>(1);

  // Reset state when activeScramble changes
  useEffect(() => {
    const tiles = generateShuffledTiles(activeScramble);
    setAvailableTiles(tiles);
    setPlacedTiles([]);
    setTimeLeft(totalTimerSeconds);
    setStartTime(null);
    setErrorNotice(null);

    // Read saved completion from localStorage or prop
    let existingResult: SpellingScrambleAttemptResult | null = null;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`edtechra_completed_scramble_${activeScramble.id}`);
        if (saved) existingResult = JSON.parse(saved);
      } catch (e) {}
    }

    if (!existingResult && activeScramble.has_completed) {
      existingResult = {
        is_correct: true,
        correct_word: activeScramble.word,
        clue: activeScramble.clue,
        xp_awarded: activeScramble.xp || (activeScramble.difficulty === 'Hard' ? 20 : activeScramble.difficulty === 'Medium' ? 15 : 10),
        already_completed: true
      };
    }

    if (existingResult) {
      setResult(existingResult);
      setGameState('completed');
    } else {
      setResult(null);
      setGameState('idle');
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [activeScramble, totalTimerSeconds, generateShuffledTiles]);

  /**
   * Start the Round and Begin the Timer
   */
  const handleStartRound = useCallback(() => {
    if (gameState !== 'idle') return;
    setGameState('playing');
    setTimeLeft(totalTimerSeconds);
    setStartTime(Date.now());
    reorderAudio.playTileClick();

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [gameState, totalTimerSeconds]);

  /**
   * Handle Timer Expiration
   */
  const handleTimeExpired = useCallback(() => {
    setGameState('time_up');
    reorderAudio.playWrongThud();
    setStreak(0);
    setErrorNotice("Time's up! Here is the correct spelling.");
  }, []);

  /**
   * Select a Letter from the Scrambled Bank
   */
  const handleSelectLetter = (tile: LetterTile) => {
    if (gameState === 'idle') {
      handleStartRound();
    }
    if (isAnimating || gameState === 'completed' || gameState === 'time_up' || isSubmitting) return;

    setIsAnimating(true);
    setErrorNotice(null);
    reorderAudio.playTileClick();

    // Remove from available, add to placed
    setAvailableTiles((prev) => prev.filter((t) => t.id !== tile.id));
    const nextPlaced = [...placedTiles, tile];
    setPlacedTiles(nextPlaced);

    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };

  /**
   * Undo: Returns the most recently placed letter to the bank
   */
  const handleUndo = () => {
    if (isAnimating || placedTiles.length === 0 || gameState === 'completed' || gameState === 'time_up' || isSubmitting) return;

    setIsAnimating(true);
    setErrorNotice(null);
    reorderAudio.playUndoPop();

    const lastTile = placedTiles[placedTiles.length - 1];
    setPlacedTiles((prev) => prev.slice(0, -1));
    setAvailableTiles((prev) => [...prev, lastTile]);

    setTimeout(() => {
      setIsAnimating(false);
    }, 280);
  };

  /**
   * Clear: Clears all placed letters and returns them to the original bank
   */
  const handleClear = () => {
    if (isAnimating || placedTiles.length === 0 || gameState === 'completed' || gameState === 'time_up' || isSubmitting) return;

    reorderAudio.playUndoPop();
    setAvailableTiles(initialTiles);
    setPlacedTiles([]);
    setErrorNotice(null);
  };

  const handlePlayAgain = () => {
    setGameState('idle');
    setResult(null);
    setPlacedTiles([]);
    setAvailableTiles(generateShuffledTiles(activeScramble));
    setTimeLeft(totalTimerSeconds);
    setStartTime(null);
    setErrorNotice(null);
  };

  const handleNextLevel = () => {
    if (nextScramble) {
      setActiveScramble(nextScramble);
      setGameState('idle');
      setResult(null);
      setPlacedTiles([]);
      setAvailableTiles(generateShuffledTiles(nextScramble));
      const nextTimer = nextScramble.timer_seconds || (nextScramble.difficulty === 'Hard' ? 60 : nextScramble.difficulty === 'Medium' ? 45 : 30);
      setTimeLeft(nextTimer);
      setStartTime(null);
      setErrorNotice(null);
    }
  };

  /**
   * Check Answer: Evaluates placed letters against target word
   */
  const handleCheckAnswer = async () => {
    if (placedTiles.length !== targetCount || isAnimating || gameState === 'completed' || isSubmitting) return;

    const userWord = placedTiles.map((t) => t.letter).join('');
    const timeTaken = startTime ? Math.round((Date.now() - startTime) / 1000) : undefined;

    if (userWord === targetWord) {
      // 1. Correct!
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setGameState('completed');
      reorderAudio.playCorrectChime();
      triggerConfetti(cardRef.current);
      setStreak((prev) => prev + 1);

      setIsSubmitting(true);
      try {
        const token = session?.access_token || null;
        const attemptRes = await spellingScrambleService.submitCompletion(
          activeScramble.id,
          userWord,
          timeTaken,
          token
        );
        setResult(attemptRes);
        if (onAttemptCompleted) {
          onAttemptCompleted(activeScramble.id, attemptRes);
        }
      } catch (err) {
        console.error('[SpellingScrambleCard] Submit completion error:', err);
        setResult({
          is_correct: true,
          correct_word: activeScramble.word,
          clue: activeScramble.clue,
          xp_awarded: activeScramble.xp || (activeScramble.difficulty === 'Hard' ? 20 : activeScramble.difficulty === 'Medium' ? 15 : 10),
          already_completed: false
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // 2. Incorrect: Subtle shake, keep playing
      reorderAudio.playWrongThud();
      setIsShaking(true);
      setStreak(0);
      setErrorNotice('Not quite! Check the clue and rearrange the letters.');
      setTimeout(() => {
        setIsShaking(false);
      }, 600);
    }
  };

  const isCompleted = gameState === 'completed';
  const isTimeUp = gameState === 'time_up';
  const earnedXP = result?.xp_awarded ?? (activeScramble.xp || (activeScramble.difficulty === 'Hard' ? 20 : activeScramble.difficulty === 'Medium' ? 15 : 10));

  // Timer percentage for circular or horizontal progress
  const timerPercent = Math.max(0, Math.min(100, (timeLeft / totalTimerSeconds) * 100));

  return (
    <article
      ref={cardRef}
      className="w-full bg-[#031124] border border-blue-900/60 rounded-3xl overflow-hidden shadow-lg transition-all relative text-white"
    >
      {/* 1. Header Strip */}
      <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-4 sm:px-5 py-2.5 flex items-center justify-between text-white shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-xs shadow-2xs">
            🔠
          </div>
          <span className="text-xs font-black uppercase tracking-wider">
            Spelling Scramble
          </span>
        </div>

        <div className="flex items-center gap-2">
          {activeScramble.category && (
            <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-extrabold">
              {activeScramble.category}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            activeScramble.difficulty === 'Hard'
              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
              : activeScramble.difficulty === 'Medium'
              ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
              : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
          }`}>
            {activeScramble.difficulty}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black shadow-2xs flex items-center gap-1">
            <Zap className="w-3 h-3 fill-slate-950" />
            +{activeScramble.xp || 10} XP
          </span>
        </div>
      </div>

      {/* 2. Main Game Container */}
      <div className="p-4 sm:p-6 space-y-5">
        {/* Game Stats Bar: Streak, Letters, and Timer Indicator */}
        <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-amber-400 font-extrabold">
              <Flame className="w-4 h-4 fill-amber-400" />
              <span>Streak: {streak}</span>
            </span>
            <span className="text-slate-400 font-medium">
              {placedTiles.length} / {targetCount} letters
            </span>
          </div>

          {/* Timer Display */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-black transition-colors ${
              isCompleted
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                : isTimeUp
                ? 'bg-rose-950 text-rose-400 border border-rose-500/60'
                : timeLeft <= 5
                ? 'bg-rose-950 text-rose-300 border border-rose-500/60 animate-pulse'
                : 'bg-slate-900/90 text-cyan-300 border border-cyan-500/30'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{isCompleted ? '✓ Done' : isTimeUp ? '0s' : `${timeLeft}s`}</span>
            </div>
          </div>
        </div>

        {/* Horizontal Timer Progress Bar */}
        {gameState === 'playing' && (
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                timeLeft <= 5 ? 'bg-rose-500' : timeLeft <= 15 ? 'bg-amber-400' : 'bg-gradient-to-r from-cyan-400 to-blue-500'
              }`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
        )}

        {/* 3. CLUE CARD */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-blue-950/40 border border-blue-500/20 shadow-xs space-y-1">
          <div className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <span>💡 Clue</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-white leading-relaxed learning-content-text">
            &ldquo;{activeScramble.clue}&rdquo;
          </p>
        </div>

        {/* Error Notice */}
        {errorNotice && (
          <div className="px-3.5 py-2 rounded-xl bg-rose-950/80 border border-rose-500/60 text-xs font-semibold text-rose-300 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* 4. ANSWER SLOTS (Drop Zone) */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Your Answer
          </div>

          <div
            className={`min-h-[68px] p-3.5 rounded-2xl bg-slate-900/80 border transition-all flex flex-wrap items-center justify-center gap-2 ${
              isCompleted
                ? 'border-emerald-500/80 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                : isTimeUp
                ? 'border-rose-500/80 bg-rose-950/20'
                : isShaking
                ? 'border-rose-500/80 bg-rose-950/20 animate-shake'
                : 'border-blue-500/30 shadow-inner'
            }`}
          >
            {placedTiles.map((tile, idx) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => {
                  if (!isCompleted && !isTimeUp && !isAnimating) {
                    reorderAudio.playUndoPop();
                    setPlacedTiles((prev) => prev.filter((_, i) => i !== idx));
                    setAvailableTiles((prev) => [...prev, tile]);
                  }
                }}
                disabled={isCompleted || isTimeUp || isAnimating}
                className="w-10 h-11 sm:w-11 sm:h-12 rounded-xl bg-gradient-to-b from-cyan-500 to-blue-600 border border-cyan-300 text-white font-black text-lg sm:text-xl shadow-md flex items-center justify-center select-none active:scale-95 transition-all cursor-pointer"
                title="Tap to remove"
              >
                {tile.letter}
              </button>
            ))}

            {/* Empty Slots */}
            {!isCompleted &&
              !isTimeUp &&
              Array.from({ length: Math.max(0, targetCount - placedTiles.length) }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="w-10 h-11 sm:w-11 sm:h-12 rounded-xl border-2 border-dashed border-slate-700/80 bg-slate-800/30 flex items-center justify-center text-sm font-black text-slate-500 select-none"
                >
                  _
                </div>
              ))}
          </div>
        </div>

        {/* 5. SCRAMBLED LETTER BANK */}
        {!isCompleted && !isTimeUp && (
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Scrambled Letters</span>
              <span className="text-[10px] text-slate-500">Tap letters to spell</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-center gap-2">
              {availableTiles.map((tile) => (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => handleSelectLetter(tile)}
                  disabled={isAnimating || isSubmitting}
                  className="w-10 h-11 sm:w-11 sm:h-12 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-black text-lg sm:text-xl shadow-xs flex items-center justify-center select-none active:scale-95 transition-all cursor-pointer hover:border-cyan-400 hover:text-cyan-300"
                >
                  {tile.letter}
                </button>
              ))}
              {availableTiles.length === 0 && (
                <div className="text-xs font-semibold text-slate-500 italic py-2">
                  All letters placed! Check your answer below.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. SUCCESS / RESULTS CARD */}
        {isCompleted && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-teal-950/30 border border-emerald-500/40 space-y-3 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-sm sm:text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>✓ Challenge Complete!</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-black flex items-center gap-1 shadow-xs">
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                +{earnedXP} XP
              </span>
            </div>

            <div className="text-xl sm:text-2xl font-black text-white tracking-widest font-mono">
              {activeScramble.word}
            </div>

            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              {activeScramble.clue}
            </p>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-emerald-500/20">
              <span>Score: <strong className="text-emerald-400">1 / 1</strong></span>
              <span>Level: <strong className="text-cyan-300">{activeScramble.difficulty}</strong></span>
              <span>XP Earned: <strong className="text-amber-400">+{earnedXP} XP</strong></span>
            </div>
          </div>
        )}

        {/* 7. TIME'S UP CARD */}
        {isTimeUp && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-rose-950/40 to-slate-900/60 border border-rose-500/40 space-y-3 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400 font-black text-sm sm:text-base">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                <span>Time&apos;s Up!</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-bold">
                +0 XP
              </span>
            </div>

            <div className="text-lg font-black text-white font-mono tracking-wider">
              Correct Word: <span className="text-cyan-300">{activeScramble.word}</span>
            </div>

            <p className="text-xs text-slate-400 font-medium">
              Keep practicing to build your vocabulary and speed!
            </p>
          </div>
        )}

        {/* 8. POST-GAME ACTION BUTTONS (PLAY AGAIN & NEXT LEVEL) */}
        {(isCompleted || isTimeUp) && (
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5 animate-in fade-in">
            <button
              type="button"
              onClick={handlePlayAgain}
              className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-black border border-slate-700 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span>PLAY AGAIN</span>
            </button>

            {nextScramble ? (
              <button
                type="button"
                onClick={handleNextLevel}
                className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                <span>NEXT LEVEL ({nextScramble.difficulty || 'Next'})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-full sm:flex-1 py-3 px-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5 min-h-[44px]">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>All Levels Mastered!</span>
              </div>
            )}
          </div>
        )}

        {/* 9. IN-GAME ACTION CONTROLS */}
        {!isCompleted && !isTimeUp && (
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleUndo}
                disabled={placedTiles.length === 0 || isAnimating}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed border border-slate-700"
                title="Undo last letter"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>

              <button
                onClick={handleClear}
                disabled={placedTiles.length === 0 || isAnimating}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed border border-slate-700"
                title="Clear all letters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>

            {/* Check Answer or Start Button */}
            {gameState === 'idle' ? (
              <button
                onClick={handleStartRound}
                className="min-h-[40px] px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Start Game</span>
              </button>
            ) : (
              <button
                onClick={handleCheckAnswer}
                disabled={placedTiles.length !== targetCount || isAnimating || isSubmitting}
                className={`min-h-[40px] px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed ${
                  placedTiles.length === targetCount
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-md hover:scale-105 active:scale-95'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Check Answer</span>
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
