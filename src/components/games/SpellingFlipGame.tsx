// ============================================================================
// EDTECHRA-BITZ: Spelling Flip Card Memory Game Component
// Flow: LOOK -> REMEMBER -> WORD DISAPPEARS -> RECALL -> TYPE -> SUBMIT -> NEXT
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Trophy,
  Volume2,
  VolumeX,
  RotateCcw
} from 'lucide-react';
import {
  SpellingFlipCardItem,
  SpellingFlipLevel,
  SpellingFlipAttemptResult
} from '@/types/spellingFlipCard';
import { spellingFlipCardService } from '@/services/spellingFlipCardService';
import { triggerConfetti } from '@/utils/confetti';

interface SpellingFlipGameProps {
  cards?: SpellingFlipCardItem[];
  level?: SpellingFlipLevel;
  onClose?: () => void;
  onSessionCompleted?: (stats: { correct: number; total: number; totalXp: number }) => void;
  onNextLevel?: () => void;
  hasNextLevel?: boolean;
}

type GamePhase = 'MEMORIZE' | 'RECALL' | 'FEEDBACK' | 'SUMMARY';

export const SpellingFlipGame: React.FC<SpellingFlipGameProps> = ({
  cards: initialCards,
  level: initialLevel = 'easy',
  onClose,
  onSessionCompleted,
  onNextLevel,
  hasNextLevel
}) => {
  const [selectedLevel] = useState<SpellingFlipLevel>(initialLevel);
  const [cardPool, setCardPool] = useState<SpellingFlipCardItem[]>(initialCards || []);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [phase, setPhase] = useState<GamePhase>('MEMORIZE');
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackResult, setFeedbackResult] = useState<SpellingFlipAttemptResult | null>(null);
  const [sessionResults, setSessionResults] = useState<{
    word: string;
    userAnswer: string;
    isCorrect: boolean;
    xp: number;
  }[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Synthesized audio helper
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const playChime = useCallback((type: 'correct' | 'incorrect' | 'flip' | 'tick') => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === 'correct') {
        [523.25, 659.25, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.25, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.35);
        });
      } else if (type === 'incorrect') {
        [400, 320].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);
          gain.gain.setValueAtTime(0.2, now + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.22);
        });
      } else if (type === 'flip') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      }
    } catch (e) {}
  }, [getAudioContext, isMuted]);

  const handleFlipToRecall = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    playChime('flip');
    setPhase('RECALL');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [playChime]);

  const startRound = useCallback((card: SpellingFlipCardItem) => {
    if (!card) return;
    const dur = card.memorize_seconds || (card.level === 'easy' ? 30 : card.level === 'intermediate' ? 20 : 10);
    setTimeLeft(dur);
    setPhase('MEMORIZE');
    setTypedAnswer('');
    setFeedbackResult(null);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          handleFlipToRecall();
          return 0;
        }
        if (prev <= 4) playChime('tick');
        return prev - 1;
      });
    }, 1000);
  }, [handleFlipToRecall, playChime]);

  // Load cards if not provided, or start immediately with initialCards
  useEffect(() => {
    if (initialCards && initialCards.length > 0) {
      setCardPool(initialCards);
      setCurrentIndex(0);
      startRound(initialCards[0]);
    } else {
      let isMounted = true;
      async function loadCards() {
        const data = await spellingFlipCardService.getFeedCards(selectedLevel);
        if (isMounted && data.length > 0) {
          setCardPool(data);
          setCurrentIndex(0);
          startRound(data[0]);
        }
      }
      loadCards();
      return () => { isMounted = false; };
    }
  }, [initialCards, selectedLevel, startRound]);

  const currentCard: SpellingFlipCardItem | undefined = cardPool[currentIndex];

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Handle word submission
  const handleSubmitAnswer = async () => {
    if (!currentCard || !typedAnswer.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const cleanInput = typedAnswer.trim().toUpperCase();
    const cleanTarget = currentCard.word.trim().toUpperCase();
    const isCorrect = cleanInput === cleanTarget;

    try {
      const result = await spellingFlipCardService.submitCompletion(
        currentCard.id,
        cleanInput
      );

      setFeedbackResult(result);
      setPhase('FEEDBACK');

      if (result.is_correct) {
        playChime('correct');
        triggerConfetti();
      } else {
        playChime('incorrect');
      }

      setSessionResults((prev) => [
        ...prev,
        {
          word: currentCard.word,
          userAnswer: cleanInput,
          isCorrect: result.is_correct,
          xp: result.xp_awarded
        }
      ]);
    } catch (err) {
      console.warn('[SpellingFlipGame] Offline fallback check:', err);
      const fallbackResult: SpellingFlipAttemptResult = {
        is_correct: isCorrect,
        correct_word: currentCard.word,
        xp_awarded: isCorrect ? (currentCard.xp || 10) : 0,
        already_completed: false,
        level: currentCard.level
      };
      setFeedbackResult(fallbackResult);
      setPhase('FEEDBACK');

      if (isCorrect) {
        playChime('correct');
        triggerConfetti();
      } else {
        playChime('incorrect');
      }

      setSessionResults((prev) => [
        ...prev,
        {
          word: currentCard.word,
          userAnswer: cleanInput,
          isCorrect,
          xp: fallbackResult.xp_awarded
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Next Word Progression
  const handleNextWord = () => {
    const nextIdx = currentIndex + 1;
    const sessionLimit = Math.min(5, cardPool.length);

    if (nextIdx < sessionLimit) {
      setCurrentIndex(nextIdx);
      startRound(cardPool[nextIdx]);
    } else {
      setPhase('SUMMARY');
      if (onSessionCompleted) {
        const correctCount = sessionResults.filter(r => r.isCorrect).length;
        const totalXp = sessionResults.reduce((sum, r) => sum + r.xp, 0);
        onSessionCompleted({
          correct: correctCount,
          total: sessionResults.length,
          totalXp
        });
      }
    }
  };

  if (!currentCard && phase !== 'SUMMARY') {
    return (
      <div className="p-8 text-center bg-slate-900 text-white rounded-3xl flex flex-col items-center gap-3">
        <Clock className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="text-sm font-semibold text-slate-300">Loading Spelling Flip Card challenges…</span>
      </div>
    );
  }

  const wordLength = currentCard?.word?.length || 5;
  const typedLetters = typedAnswer.toUpperCase().split('');
  const sessionTotal = Math.min(5, cardPool.length || 5);
  const currentStep = currentIndex + 1;
  const currentTotalXp = sessionResults.reduce((sum, r) => sum + r.xp, 0);

  return (
    <div className="relative w-full max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans text-white select-none flex flex-col min-h-[500px]">
      
      {/* Background ambient lighting */}
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header HUD */}
      <div className="relative z-10 px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/10 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-black uppercase tracking-wider">
            <span>🃏 FLIP CARD</span>
          </div>
          <span className="text-[11px] font-bold text-slate-400 capitalize">
            {currentCard?.level || selectedLevel} ({currentCard?.category || 'General'})
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs font-black text-amber-400">
            <Zap className="w-3.5 h-3.5 fill-amber-400" />
            <span>{currentTotalXp} XP</span>
          </div>

          <span className="text-xs font-bold text-slate-400">
            {currentStep}/{sessionTotal}
          </span>

          <button
            onClick={() => setIsMuted(m => !m)}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 cursor-pointer"
            title="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* GAME CONTENT CONTAINER */}
      <div className="relative z-10 p-6 flex-1 flex flex-col items-center justify-between gap-6 text-center">

        {/* PHASE 1: MEMORIZATION */}
        {phase === 'MEMORIZE' && (
          <div className="w-full flex-1 flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in-95">
            <div className="space-y-1">
              <span className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest">
                Memorization Phase
              </span>
              <p className="text-xs font-medium text-slate-400">
                Remember the spelling
              </p>
            </div>

            {/* Prominent Word Card */}
            <div className="w-full py-8 px-4 rounded-3xl bg-gradient-to-b from-slate-800 to-slate-850 border border-cyan-400/30 shadow-xl flex flex-col items-center justify-center gap-2">
              <h2 className={`font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-sky-300 uppercase break-all text-center ${
                wordLength > 14
                  ? 'text-xl sm:text-2xl md:text-3xl'
                  : wordLength > 9
                  ? 'text-2xl sm:text-3xl md:text-4xl'
                  : 'text-3xl sm:text-4xl md:text-5xl'
              }`}>
                {currentCard?.word}
              </h2>
            </div>

            {/* Countdown Display */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-400 font-mono text-xl font-black">
                <Clock className="w-4 h-4" />
                <span>00:{String(timeLeft).padStart(2, '0')}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Word will disappear when timer reaches 0</span>
            </div>

            {/* Ready / Skip countdown button */}
            <button
              type="button"
              onClick={handleFlipToRecall}
              className="mt-2 px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>I'm Ready (Flip Now)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* PHASE 2: RECALL & TYPE */}
        {phase === 'RECALL' && (
          <div className="w-full flex-1 flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in-95">
            <div className="space-y-1">
              <span className="text-xs font-extrabold text-amber-400 uppercase tracking-widest">
                Recall & Type
              </span>
              <p className="text-xs font-medium text-slate-400">
                Type the complete spelling from memory
              </p>
            </div>

            {/* Blank Letter Boxes */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap max-w-full py-3">
              {Array.from({ length: wordLength }).map((_, idx) => {
                const char = typedLetters[idx] || '';
                const boxSizeClass =
                  wordLength > 14
                    ? 'w-6 h-8 sm:w-7 sm:h-10 text-xs sm:text-sm rounded-lg border'
                    : wordLength > 9
                    ? 'w-7 h-10 sm:w-9 sm:h-12 text-sm sm:text-base rounded-xl border-2'
                    : 'w-9 h-11 sm:w-11 sm:h-14 text-lg sm:text-xl rounded-2xl border-2';

                return (
                  <div
                    key={idx}
                    className={`${boxSizeClass} flex items-center justify-center font-black uppercase transition-all ${
                      char
                        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 shadow-sm scale-105'
                        : 'border-slate-700 bg-slate-800/60 text-transparent'
                    }`}
                  >
                    {char || '_'}
                  </div>
                );
              })}
            </div>

            {/* Text Input Box */}
            <div className="w-full space-y-2">
              <input
                ref={inputRef}
                type="text"
                value={typedAnswer}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^A-Za-z]/g, '').slice(0, wordLength);
                  setTypedAnswer(cleaned);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && typedAnswer.trim()) {
                    handleSubmitAnswer();
                  }
                }}
                placeholder="Type the spelling…"
                className="w-full py-3.5 px-4 rounded-2xl bg-slate-950 border border-slate-700 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 text-center text-lg font-black tracking-widest uppercase text-white placeholder:text-slate-600 outline-none transition-all"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                autoFocus
              />
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={!typedAnswer.trim() || isSubmitting}
              className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                typedAnswer.trim()
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>SUBMIT</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* PHASE 3: FEEDBACK */}
        {phase === 'FEEDBACK' && feedbackResult && (
          <div className="w-full flex-1 flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in-95">
            {feedbackResult.is_correct ? (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-emerald-400">Correct!</h3>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 font-black text-sm border border-amber-400/40">
                    <Zap className="w-4 h-4 fill-amber-400" />
                    <span>+{feedbackResult.xp_awarded} XP</span>
                  </div>
                </div>
                <div className="text-lg font-black tracking-widest uppercase text-white">
                  {feedbackResult.correct_word}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-lg">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-rose-400">Not quite!</h3>
                  <p className="text-xs text-slate-400">
                    Your answer: <span className="font-bold text-rose-300">{typedAnswer.toUpperCase()}</span>
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Correct spelling:</span>
                  <div className="text-xl font-black tracking-widest uppercase text-cyan-400">
                    {feedbackResult.correct_word}
                  </div>
                </div>
              </div>
            )}

            {/* Next Button */}
            <button
              type="button"
              onClick={handleNextWord}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{currentStep < sessionTotal ? 'NEXT WORD' : 'VIEW RESULTS'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* PHASE 4: SUMMARY & RESULTS */}
        {phase === 'SUMMARY' && (
          <div className="w-full flex-1 flex flex-col items-center justify-center gap-5 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shadow-lg">
              <Trophy className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white">Session Complete!</h2>
              <p className="text-xs text-slate-400">Spelling Flip Card Memory Challenge</p>
            </div>

            {/* Score Grid */}
            <div className="w-full grid grid-cols-3 gap-2.5 p-4 rounded-2xl bg-slate-950/70 border border-white/10">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Correct</div>
                <div className="text-lg font-black text-emerald-400">
                  {sessionResults.filter(r => r.isCorrect).length}
                </div>
              </div>
              <div className="border-x border-white/10">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Incorrect</div>
                <div className="text-lg font-black text-rose-400">
                  {sessionResults.filter(r => !r.isCorrect).length}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Total XP</div>
                <div className="text-lg font-black text-amber-400">
                  +{currentTotalXp}
                </div>
              </div>
            </div>

            {/* Word Review List */}
            <div className="w-full space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {sessionResults.map((res, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-xl bg-white/5 text-xs"
                >
                  <span className="font-bold text-slate-300">{res.word}</span>
                  <span className={`font-black ${res.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {res.isCorrect ? '✓ Correct' : `✗ (${res.userAnswer || 'Empty'})`}
                  </span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="w-full pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex(0);
                  setSessionResults([]);
                  setTypedAnswer('');
                  setFeedbackResult(null);
                  if (cardPool.length > 0) {
                    startRound(cardPool[0]);
                  }
                }}
                className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs border border-slate-700 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4 text-cyan-400" />
                <span>PLAY AGAIN</span>
              </button>

              {hasNextLevel && onNextLevel ? (
                <button
                  type="button"
                  onClick={onNextLevel}
                  className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                >
                  <span>NEXT LEVEL</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                >
                  <span>CLOSE</span>
                </button>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
