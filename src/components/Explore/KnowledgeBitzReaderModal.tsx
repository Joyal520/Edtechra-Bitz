// ============================================================================
// EDTECHRA-BITZ: Knowledge Bitz Full-Screen Reading & Auto-Quiz Experience (V3 Canonical)
// Typography: DM Serif Display (titles), Lora (reading body), Manrope (UI & quiz).
// Features: Single scrollbar, zero nested scrolling, safe-area insets, reading progress,
// compact pill controls, automatic question advance, score-aware completion (>=3/5 mastery).
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  XCircle,
  Bookmark,
  Share2,
  RotateCcw,
  Check,
  Award
} from 'lucide-react';
import { KnowledgeBitzItem, BitzQuizQuestion, prepareBitzQuiz } from '@/types';
import { getCategoryById } from '@/utils/bitzTopicsConfig';
import { useAuth } from '@/context/AuthContext';
import { knowledgeBitzService } from '@/services/knowledgeBitzService';
import { playCorrectAnswerSound, playCelebrationSound } from '@/utils/reorderAudio';
import { triggerConfetti } from '@/utils/confetti';

interface KnowledgeBitzReaderModalProps {
  bitz: KnowledgeBitzItem | null;
  isOpen: boolean;
  onClose: () => void;
  onLearned: (bitzId: string, xpAwarded: number) => void;
}

type ReaderState = 'READING' | 'QUIZ_ACTIVE' | 'QUIZ_RESULT' | 'COMPLETED';

export const KnowledgeBitzReaderModal: React.FC<KnowledgeBitzReaderModalProps> = ({
  bitz,
  isOpen,
  onClose,
  onLearned
}) => {
  const { session, requireAuth } = useAuth();
  const token = session?.access_token || null;

  // Bookmarking & Sharing State
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Interaction State Machine: READING -> QUIZ_ACTIVE -> QUIZ_RESULT -> COMPLETED
  const [viewState, setViewState] = useState<ReaderState>('READING');
  const [quizQuestions, setQuizQuestions] = useState<BitzQuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState<boolean | null>(null);
  const [serverExplanation, setServerExplanation] = useState<string | null>(null);

  // Score & XP Tracking (2 XP per correct = max 10 XP)
  const [answeredMap, setAnsweredMap] = useState<Record<number, boolean>>({});
  const [earnedXp, setEarnedXp] = useState<number>(0);
  const awardedQuestionsRef = useRef<Set<number>>(new Set());
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll & Single Container Ref
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const category = bitz ? getCategoryById(bitz.category || bitz.topic_id) : null;
  const totalQuestions = quizQuestions.length;

  // Cleanup timers on unmount
  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  // Track single container scroll progress
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll <= 0) {
      setScrollProgress(100);
    } else {
      const progress = Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));
      setScrollProgress(progress);
    }
  }, []);

  // Reset states on modal open / bitz change
  useEffect(() => {
    if (isOpen && bitz) {
      clearAutoAdvanceTimer();
      setViewState('READING');
      setQuizQuestions(prepareBitzQuiz(bitz.quiz, true));
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setIsCurrentCorrect(null);
      setServerExplanation(null);
      setAnsweredMap({});
      setEarnedXp(0);
      awardedQuestionsRef.current.clear();
      setIsSaved(Boolean(bitz.is_saved_by_me));
      setScrollProgress(0);

      // Lock background body scroll to prevent page behind from scrolling
      document.body.style.overflow = 'hidden';

      // Record 'read' interaction event
      knowledgeBitzService.recordInteraction(bitz.id, 'read', undefined, undefined, token);

      // Scroll container to top
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      }, 50);
    }

    return () => {
      clearAutoAdvanceTimer();
      document.body.style.overflow = '';
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isOpen, bitz, token, clearAutoAdvanceTimer]);

  if (!isOpen || !bitz || !category) return null;

  const currentQuestion = quizQuestions[currentQuestionIndex] || null;
  const correctCount = Object.values(answeredMap).filter(Boolean).length;
  const isMastered = correctCount >= 3;

  // Transition from Reading to Quiz
  const handleStartQuiz = () => {
    clearAutoAdvanceTimer();
    setViewState('QUIZ_ACTIVE');
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsCurrentCorrect(null);
    setServerExplanation(null);

    // Smoothly reset scroll to top of quiz
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Submit Answer for Current Question
  const handleSelectOption = async (option: string) => {
    if (viewState !== 'QUIZ_ACTIVE' || !currentQuestion) return;
    if (!session) {
      requireAuth('quiz');
      return;
    }

    // Immediately lock option selection
    setSelectedOption(option);

    const correctAns = currentQuestion.correct_answer || currentQuestion.correctAnswer;
    const isCorrect = correctAns
      ? option.trim().toLowerCase() === String(correctAns).trim().toLowerCase()
      : true;

    setIsCurrentCorrect(isCorrect);
    setServerExplanation(currentQuestion.explanation || 'Verified educational fact.');
    setViewState('QUIZ_RESULT');

    const isFirstAttempt = !awardedQuestionsRef.current.has(currentQuestionIndex);
    const questionXp = 2; // Always 2 XP per correct answer

    let nextEarnedXp = earnedXp;

    if (isFirstAttempt) {
      awardedQuestionsRef.current.add(currentQuestionIndex);
      setAnsweredMap((prev) => ({
        ...prev,
        [currentQuestionIndex]: isCorrect
      }));

      if (isCorrect) {
        playCorrectAnswerSound();
        triggerConfetti();
        nextEarnedXp = earnedXp + questionXp;
        setEarnedXp(nextEarnedXp);
      }

      // Submit to backend
      try {
        const res = await knowledgeBitzService.submitQuizAttempt(
          bitz.id,
          option,
          currentQuestionIndex,
          token
        );
        if (res.explanation) setServerExplanation(res.explanation);
      } catch (e) {
        console.warn('[KnowledgeBitzReader] Quiz attempt sync warning:', e);
      }
    }

    // Automatic transition to next question without manual button press
    clearAutoAdvanceTimer();
    const pauseDuration = isCorrect ? 1400 : 2000; // Brief pause to read explanation

    autoAdvanceTimerRef.current = setTimeout(() => {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setSelectedOption(null);
        setIsCurrentCorrect(null);
        setServerExplanation(null);
        setViewState('QUIZ_ACTIVE');

        // Scroll back to top of the next question
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        // Quiz completed
        setViewState('COMPLETED');
        const finalCorrectCount = isCorrect ? correctCount + 1 : correctCount;
        if (finalCorrectCount >= 3) {
          playCelebrationSound();
          triggerConfetti();
          onLearned(bitz.id, nextEarnedXp);
        }

        // Notify dashboard of XP & Mastery update
        window.dispatchEvent(new CustomEvent('edtechra:activity_completed'));
        window.dispatchEvent(new CustomEvent('edtechra:bitz_mastered', {
          detail: { bitzId: bitz.id, isMastered: finalCorrectCount >= 3, correctCount: finalCorrectCount }
        }));

        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    }, pauseDuration);
  };

  // Read Again
  const handleReadAgain = () => {
    clearAutoAdvanceTimer();
    setViewState('READING');
    if (bitz) {
      setQuizQuestions(prepareBitzQuiz(bitz.quiz, true));
    }
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsCurrentCorrect(null);
    setServerExplanation(null);
    setAnsweredMap({});
    setEarnedXp(0);
    awardedQuestionsRef.current.clear();
    setScrollProgress(0);

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleToggleSave = async () => {
    if (!session) {
      requireAuth('save');
      return;
    }
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    try {
      await knowledgeBitzService.toggleSave(bitz.id, bitz.category, token);
    } catch {
      setIsSaved(!nextSaved);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/explore?bitz=${bitz.bitz_code || bitz.id}`;
    const shareData = {
      title: `${bitz.title} — EdTechra Bitz`,
      text: `${bitz.reading_text}`,
      url: shareUrl
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareToast('Link copied to clipboard!');
      setTimeout(() => setShareToast(null), 2500);
    } catch {
      setShareToast('Failed to copy link');
      setTimeout(() => setShareToast(null), 2000);
    }
  };

  // Split reading text into paragraphs if newline exists, or format cleanly
  const paragraphs = (bitz.reading_text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#020817] text-[#F8FAFC] h-[100dvh] min-h-[100dvh] w-full overflow-hidden animate-fade-in select-none"
      role="dialog"
      aria-modal="true"
      aria-label={`Knowledge Bitz: ${bitz.title}`}
    >
      {/* 1. Thin Scroll Progress Indicator at Very Top */}
      <div className="w-full h-1 bg-slate-900 overflow-hidden shrink-0 z-30">
        <div
          className="h-full bg-gradient-to-r from-[#1677FF] via-[#38bdf8] to-[#00f2fe] transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* 2. Top Header Bar (Subtle Bitz Identity & Controls) */}
      <header className="px-4 sm:px-6 py-3 sm:py-3.5 bg-[#030d1d]/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between shrink-0 z-20">
        {/* Left: Subtle Bitz Identity */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/60 shadow-xs">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: category.color || '#38bdf8' }}
            />
            <span className="font-ui text-[11px] font-black uppercase tracking-wider text-sky-300">
              {category.name || 'Knowledge Bitz'}
            </span>
          </div>
        </div>

        {/* Right Action Icons: Bookmark, Share, Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Bookmark */}
          <button
            type="button"
            onClick={handleToggleSave}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isSaved
                ? 'text-[#36D1FF] bg-sky-950/70 border border-sky-800/60'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
            title="Save Bitz"
            aria-label="Save Bitz"
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title="Share"
            aria-label="Share Bitz"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer ml-1"
            aria-label="Close reader"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 3. Single Controlled Scroll Container */}
      <main
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 w-full scroll-smooth select-text"
      >
        <div className="max-w-[680px] mx-auto px-5 sm:px-8 py-6 sm:py-8 w-full min-h-full flex flex-col justify-between pb-[max(2.5rem,env(safe-area-inset-bottom))]">
          {/* ================================================================ */}
          {/* STATE 1: READING VIEW                                           */}
          {/* ================================================================ */}
          {viewState === 'READING' && (
            <div className="space-y-6 animate-fade-in flex-1 flex flex-col justify-between">
              <div className="space-y-6">
                {/* Bitz Title: DM Serif Display */}
                <h1 className="font-display text-2xl sm:text-3xl md:text-4xl text-[#F8FAFC] leading-[1.25] tracking-tight font-normal">
                  {bitz.title}
                </h1>

                {/* 100-Word Reading Body: Lora (Left-aligned, 18px on mobile, 1.75 line-height) */}
                <div className="font-reading text-[17px] sm:text-[18px] md:text-[19px] leading-[1.75] text-slate-200 select-text text-left font-normal space-y-4">
                  {paragraphs.map((p, idx) => (
                    <p key={idx} className="tracking-normal">
                      {p}
                    </p>
                  ))}
                </div>

                {/* Key Vocabulary (if present) */}
                {bitz.vocabulary && bitz.vocabulary.length > 0 && (
                  <div className="rounded-2xl p-4 sm:p-5 space-y-2.5 bg-slate-900/80 border border-slate-800">
                    <div className="font-ui flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 stroke-[2.5]" />
                      <span>Key Vocabulary</span>
                    </div>
                    <div className="space-y-2">
                      {bitz.vocabulary.map((v, idx) => (
                        <div key={idx} className="font-ui text-xs sm:text-sm leading-relaxed">
                          <strong className="text-white font-bold">{v.word}:</strong>{' '}
                          <span className="text-slate-300 font-normal">{v.definition}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source Citation */}
                {bitz.source_citation && (
                  <div className="font-ui text-xs text-slate-400 italic flex items-center gap-1.5 pt-1">
                    <span>Source:</span>
                    <span className="font-medium text-slate-300">{bitz.source_citation}</span>
                  </div>
                )}
              </div>

              {/* Reading Controls: Done (Left) & Compact Cute Quiz Button (Right) */}
              <div className="flex items-center justify-between pt-8 mt-6 border-t border-slate-800/80 gap-3">
                {/* Done Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="font-ui px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-all active:scale-95 cursor-pointer"
                >
                  Done
                </button>

                {/* Compact Quiz Pill Button */}
                {totalQuestions > 0 && (
                  <button
                    type="button"
                    onClick={handleStartQuiz}
                    className="font-ui flex items-center gap-1.5 px-5 py-2 rounded-full text-xs sm:text-sm font-bold bg-gradient-to-r from-[#1677FF] to-[#026fc3] hover:from-[#2D8CFF] hover:to-[#1677FF] text-white shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
                  >
                    <span>✦ Quiz →</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STATE 2: AUTOMATIC QUIZ VIEW                                    */}
          {/* ================================================================ */}
          {(viewState === 'QUIZ_ACTIVE' || viewState === 'QUIZ_RESULT') && currentQuestion && (
            <div className="space-y-5 animate-fade-in flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Quiz Header & Compact Progress */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-ui text-xs font-black uppercase tracking-wider text-sky-400">
                      QUESTION {currentQuestionIndex + 1} OF {totalQuestions}
                    </span>

                    <div className="font-ui flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-900 border border-slate-700/80 text-sky-300 text-xs font-black">
                      <Award className="w-3.5 h-3.5 text-sky-400" />
                      <span>+{earnedXp} XP</span>
                    </div>
                  </div>

                  {/* Compact Progress Indicator (● ● ○ ○ ○) */}
                  <div className="flex items-center gap-1.5 w-full">
                    {quizQuestions.map((_, idx) => {
                      const answered = answeredMap[idx] !== undefined;
                      const isCorrect = answeredMap[idx] === true;
                      const isCurrent = idx === currentQuestionIndex;

                      let dotClass = 'bg-slate-800';
                      if (answered) {
                        dotClass = isCorrect ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-rose-500';
                      } else if (isCurrent) {
                        dotClass = 'bg-[#38bdf8] ring-2 ring-sky-400/50';
                      }

                      return (
                        <div
                          key={idx}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${dotClass}`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Question: Manrope UI font */}
                <h2 className="font-ui text-base sm:text-lg md:text-xl font-bold text-white leading-snug pt-1">
                  {currentQuestion.question}
                </h2>

                {/* 4 Answer Options (large touch target, Manrope font) */}
                <div className="space-y-2.5 pt-2">
                  {currentQuestion.options.map((opt, idx) => {
                    const isSelected = selectedOption === opt;
                    const correctAns = currentQuestion.correct_answer || currentQuestion.correctAnswer;
                    const isThisCorrect = correctAns
                      ? opt.trim().toLowerCase() === String(correctAns).trim().toLowerCase()
                      : false;

                    let btnStyle =
                      'bg-slate-900/90 hover:bg-slate-800/90 border-slate-700/80 text-slate-100 hover:border-sky-400/60';

                    if (viewState === 'QUIZ_RESULT') {
                      if (isThisCorrect) {
                        btnStyle = 'bg-emerald-950/90 border-emerald-500 text-white font-bold ring-2 ring-emerald-500/50 animate-correct-bounce';
                      } else if (isSelected) {
                        btnStyle = 'bg-rose-950/90 border-rose-500 text-white font-bold ring-2 ring-rose-500/50 animate-error-shake';
                      } else {
                        btnStyle = 'opacity-30 border-slate-800 text-slate-500 bg-transparent';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={viewState === 'QUIZ_RESULT'}
                        onClick={() => handleSelectOption(opt)}
                        className={`font-ui w-full text-left p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm font-medium transition-all min-h-[50px] flex items-center justify-between cursor-pointer ${btnStyle}`}
                      >
                        <span className="leading-relaxed pr-2">{opt}</span>
                        {viewState === 'QUIZ_RESULT' && isThisCorrect && (
                          <span className="flex items-center gap-1 text-emerald-400 text-xs font-black shrink-0">
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span className="hidden xs:inline">Correct</span>
                          </span>
                        )}
                        {viewState === 'QUIZ_RESULT' && isSelected && !isThisCorrect && (
                          <span className="flex items-center gap-1 text-rose-400 text-xs font-black shrink-0">
                            <XCircle className="w-4 h-4 stroke-[2.5]" />
                            <span className="hidden xs:inline">Incorrect</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Instant Answer Feedback & Explanation */}
                {viewState === 'QUIZ_RESULT' && (
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed space-y-1.5 border animate-fade-in ${
                      isCurrentCorrect
                        ? 'bg-emerald-950/80 border-emerald-600/70 text-emerald-200'
                        : 'bg-rose-950/80 border-rose-600/70 text-rose-200'
                    }`}
                  >
                    <div className="font-ui flex items-center gap-1.5 font-black text-sm">
                      {isCurrentCorrect ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                          <span>✓ Correct! +2 XP</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-rose-400 stroke-[2.5]" />
                          <span>✕ Incorrect</span>
                        </>
                      )}
                    </div>

                    {!isCurrentCorrect && currentQuestion.correct_answer && (
                      <p className="font-ui font-semibold text-rose-300">
                        Correct answer: <span className="underline">{currentQuestion.correct_answer}</span>
                      </p>
                    )}

                    {serverExplanation && (
                      <p className="font-ui font-normal opacity-95 text-xs sm:text-sm pt-0.5">
                        {serverExplanation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STATE 3: REDESIGNED CLEAN COMPLETION SCREEN                     */}
          {/* ================================================================ */}
          {viewState === 'COMPLETED' && (
            <div className="my-auto py-6 sm:py-10 text-center space-y-6 animate-scale-in max-w-md mx-auto w-full">
              {/* Dynamic Icon */}
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto border transition-all ${
                  isMastered
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/20'
                    : 'bg-sky-500/20 border-sky-500/40 text-sky-400'
                }`}
              >
                {isMastered ? (
                  <Check className="w-10 h-10 stroke-[3]" />
                ) : (
                  <RotateCcw className="w-9 h-9 stroke-[2.5]" />
                )}
              </div>

              {/* Dynamic Titles according to score */}
              <div className="space-y-1.5">
                <h2 className="font-display text-2xl sm:text-3xl font-normal text-white">
                  {correctCount === 5 && 'Perfect!'}
                  {correctCount === 4 && 'Excellent!'}
                  {correctCount === 3 && 'Well done!'}
                  {correctCount === 2 && 'Good try!'}
                  {correctCount === 1 && 'Keep going!'}
                  {correctCount === 0 && "Let's try again!"}
                </h2>
                <p className="font-ui text-xs sm:text-sm text-slate-300">
                  {correctCount} / {totalQuestions} correct
                </p>
              </div>

              {/* Score & XP Summary Card */}
              <div className="font-ui p-4 rounded-2xl border border-slate-700/80 bg-slate-900/90 max-w-xs mx-auto flex items-center justify-around shadow-lg">
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Score
                  </span>
                  <span
                    className={`text-xl font-black ${
                      isMastered ? 'text-emerald-400' : 'text-sky-400'
                    }`}
                  >
                    {correctCount} / {totalQuestions}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-700/60" />
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                    XP Earned
                  </span>
                  <span className="text-xl font-black text-amber-400">
                    +{earnedXp} XP
                  </span>
                </div>
              </div>

              {/* Mastery / Learning State Badge */}
              <div>
                {isMastered ? (
                  <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 rounded-full text-xs font-black">
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Topic Mastered</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-sky-500/15 border border-sky-500/40 text-sky-400 rounded-full text-xs font-black">
                    <Sparkles className="w-4 h-4 stroke-[2]" />
                    <span>Keep learning this topic</span>
                  </div>
                )}
              </div>

              {/* Supporting Encouraging Message */}
              <p className="font-ui text-xs sm:text-sm text-slate-400 max-w-xs mx-auto">
                {correctCount >= 3
                  ? 'Great work! You have successfully mastered this Bitz.'
                  : 'Review the reading again to strengthen your understanding and master this Bitz.'}
              </p>

              {/* Bottom Actions: Read Again & Back to Discover */}
              <div className="font-ui flex items-center justify-center gap-3 pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleReadAgain}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition-all active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Read Again</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#1677FF] to-[#026fc3] hover:from-[#2D8CFF] hover:to-[#1677FF] text-white text-xs sm:text-sm font-bold rounded-full shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Back to Discover</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Share Toast */}
      {shareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-900/90 text-emerald-100 border border-emerald-700 shadow-xl text-xs font-bold animate-fade-in font-ui">
          {shareToast}
        </div>
      )}
    </div>
  );
};
