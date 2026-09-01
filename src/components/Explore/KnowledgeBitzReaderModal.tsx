// ============================================================================
// EDTECHRA-BITZ: Knowledge Bitz Reading Experience & 5-Quiz Engine (V2 Canonical)
// 100-word reading, sequential in-place 5-question quiz (2 XP each = 10 XP max),
// instantaneous feedback & answer reveal, Dark Blue Default Theme & Light Theme.
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BookOpen,
  Award,
  ArrowRight,
  Bookmark,
  Share2,
  RotateCcw,
  Check
} from 'lucide-react';
import { KnowledgeBitzItem, BitzQuizQuestion, normalizeQuizToArray } from '@/types';
import { getCategoryById } from '@/utils/bitzTopicsConfig';
import { useAuth } from '@/context/AuthContext';
import { useBitzTheme } from '@/context/BitzThemeContext';
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
  const { isDark } = useBitzTheme();

  // Audio & Sharing
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Interaction State Machine: READING -> QUIZ_ACTIVE -> QUIZ_RESULT -> COMPLETED
  const [viewState, setViewState] = useState<ReaderState>('READING');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState<boolean | null>(null);
  const [serverExplanation, setServerExplanation] = useState<string | null>(null);

  // Score & XP Tracking (2 XP per question = max 10 XP)
  const [answeredMap, setAnsweredMap] = useState<Record<number, boolean>>({});
  const [earnedXp, setEarnedXp] = useState<number>(0);
  const awardedQuestionsRef = useRef<Set<number>>(new Set());

  const quizSectionRef = useRef<HTMLDivElement | null>(null);

  const category = bitz ? getCategoryById(bitz.category || bitz.topic_id) : null;
  const quizQuestions: BitzQuizQuestion[] = bitz ? normalizeQuizToArray(bitz.quiz) : [];
  const totalQuestions = quizQuestions.length;

  // Reset states on modal open
  useEffect(() => {
    if (isOpen && bitz) {
      setIsPlayingAudio(false);
      setViewState('READING');
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setIsCurrentCorrect(null);
      setServerExplanation(null);
      setAnsweredMap({});
      setEarnedXp(0);
      awardedQuestionsRef.current.clear();
      setIsSaved(Boolean(bitz.is_saved_by_me));

      // Record 'read' interaction event
      knowledgeBitzService.recordInteraction(bitz.id, 'read', undefined, undefined, token);
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isOpen, bitz, token]);

  if (!isOpen || !bitz || !category) return null;

  const currentQuestion = quizQuestions[currentQuestionIndex] || null;

  // Web Speech API Text-to-Speech
  const handleToggleAudio = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported on this browser.');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();
    const textToRead = `${bitz.title}. ${bitz.reading_text}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
  };

  // Start Quiz Mode
  const handleStartQuiz = () => {
    setViewState('QUIZ_ACTIVE');
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsCurrentCorrect(null);
    setServerExplanation(null);
    setTimeout(() => {
      quizSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  // Submit Answer for Current Question
  const handleSelectOption = async (option: string) => {
    if (viewState !== 'QUIZ_ACTIVE' || !currentQuestion) return;
    if (!session) {
      requireAuth('quiz');
      return;
    }

    setSelectedOption(option);

    const correctAns = currentQuestion.correct_answer || currentQuestion.correctAnswer;
    const isCorrect = correctAns
      ? option.trim().toLowerCase() === String(correctAns).trim().toLowerCase()
      : true;

    setIsCurrentCorrect(isCorrect);
    setServerExplanation(currentQuestion.explanation || 'Verified fact.');
    setViewState('QUIZ_RESULT');

    const isFirstAttemptOnThisQuestion = !awardedQuestionsRef.current.has(currentQuestionIndex);
    const questionXp = totalQuestions === 1 ? (bitz.xp_value || 10) : 2;

    if (isFirstAttemptOnThisQuestion) {
      awardedQuestionsRef.current.add(currentQuestionIndex);
      setAnsweredMap((prev) => ({
        ...prev,
        [currentQuestionIndex]: isCorrect
      }));

      if (isCorrect) {
        playCorrectAnswerSound();
        setEarnedXp((prev) => prev + questionXp);
      }

      // Submit to server for persistent tracking
      try {
        const res = await knowledgeBitzService.submitQuizAttempt(
          bitz.id,
          option,
          currentQuestionIndex,
          token
        );
        if (res.explanation) setServerExplanation(res.explanation);
        if (res.xpAwarded) {
          onLearned(bitz.id, res.xpAwarded);
        }
      } catch {
        if (isCorrect) {
          onLearned(bitz.id, questionXp);
        }
      }
    }
  };

  // Advance to Next Question or Completion
  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsCurrentCorrect(null);
      setServerExplanation(null);
      setViewState('QUIZ_ACTIVE');
    } else {
      // Finished all 5 questions
      setViewState('COMPLETED');
      playCelebrationSound();
      triggerConfetti();
    }
  };

  // Read Again from Beginning
  const handleReadAgain = () => {
    setViewState('READING');
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsCurrentCorrect(null);
    setServerExplanation(null);
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

  const correctCount = Object.values(answeredMap).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div
        className={`relative w-full max-w-xl rounded-3xl shadow-2xl border overflow-hidden my-auto transition-all ${
          isDark
            ? 'bg-[#0b172a] border-[#1e3a5f] text-white shadow-blue-950/50'
            : 'bg-white border-slate-200 text-[#0a213c]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isDark ? 'bg-[#091526] border-[#1b3456]' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                isDark
                  ? 'bg-[#0e2344] border-[#1e4070]'
                  : 'bg-blue-50 border-blue-100'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: category.color }}
              />
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  isDark ? 'text-sky-200' : 'text-[#0a213c]'
                }`}
              >
                {category.name}
              </span>
            </div>

            {/* CEFR Level Badge */}
            <div className="bg-[#026fc3] text-white px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider shadow-xs">
              CEFR {bitz.cefr_level || 'B1'}
            </div>

            {bitz.sub_topic && (
              <span
                className={`text-xs font-semibold truncate max-w-[140px] ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                • {bitz.sub_topic}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleToggleSave}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isSaved
                  ? isDark
                    ? 'text-[#38bdf8] bg-blue-950/80'
                    : 'text-[#026fc3] bg-blue-50'
                  : isDark
                  ? 'text-slate-400 hover:bg-[#132849] hover:text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
              title="Save Bitz"
              aria-label="Save"
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleShare}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isDark
                  ? 'text-slate-400 hover:bg-[#132849] hover:text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
              title="Share"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-full transition-colors cursor-pointer ml-1 ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-[#132849]'
                  : 'text-slate-500 hover:text-[#0a213c] hover:bg-slate-100'
              }`}
              aria-label="Close reader"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {/* Hook Headline */}
          <h2
            className={`text-xl sm:text-2xl font-black leading-tight tracking-tight ${
              isDark ? 'text-white' : 'text-[#0a213c]'
            }`}
          >
            {bitz.title}
          </h2>

          {/* 100-Word Reading Body */}
          <div
            className={`text-sm sm:text-base leading-relaxed font-normal p-4 sm:p-5 rounded-2xl border ${
              isDark
                ? 'bg-[#0f2244] border-[#1e4070] text-slate-100'
                : 'bg-slate-50/80 border-slate-200/90 text-slate-800'
            }`}
          >
            <p className="leading-[1.8]">{bitz.reading_text}</p>
          </div>

          {/* Vocabulary Section (if present) */}
          {bitz.vocabulary && bitz.vocabulary.length > 0 && (
            <div
              className={`rounded-2xl p-4 space-y-2 border ${
                isDark
                  ? 'bg-[#182338] border-amber-500/30'
                  : 'bg-amber-50/90 border-amber-200/80'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase tracking-wider">
                <BookOpen className="w-4 h-4 text-amber-400 stroke-[2.5]" />
                <span>Key Vocabulary</span>
              </div>
              <div className="space-y-1.5">
                {bitz.vocabulary.map((v, idx) => (
                  <div key={idx} className="text-xs">
                    <strong className={isDark ? 'text-white' : 'text-[#0a213c]'}>{v.word}:</strong>{' '}
                    <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{v.definition}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source Citation */}
          {bitz.source_citation && (
            <div
              className={`text-[11px] italic flex items-center gap-1 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              <span>Source:</span>
              <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                {bitz.source_citation}
              </span>
            </div>
          )}

          {/* Audio TTS Control Button */}
          <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleToggleAudio}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                isPlayingAudio
                  ? 'bg-amber-500 text-white shadow-md'
                  : isDark
                  ? 'bg-[#132849] hover:bg-[#1a3560] text-slate-200 border border-[#1e3a5f]'
                  : 'bg-slate-100 hover:bg-slate-200 text-[#0a213c] border border-slate-200'
              }`}
            >
              {isPlayingAudio ? (
                <>
                  <VolumeX className="w-4 h-4 animate-pulse" />
                  <span>Pause Audio</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-[#38bdf8] stroke-[2.2]" />
                  <span>Listen to Bitz</span>
                </>
              )}
            </button>

            {/* If user is still in READING mode and quiz exists, show Start Quiz button */}
            {totalQuestions > 0 && viewState === 'READING' && (
              <button
                type="button"
                onClick={handleStartQuiz}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-full shadow-lg shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Start Quiz ({totalQuestions} Questions • +10 XP)</span>
              </button>
            )}
          </div>

          {/* ================================================================ */}
          {/* SAME-PANEL SEQUENTIAL 5-QUIZ SYSTEM                              */}
          {/* ================================================================ */}
          {totalQuestions > 0 && viewState !== 'READING' && (
            <div
              ref={quizSectionRef}
              className={`p-4 sm:p-5 rounded-3xl border space-y-4 animate-scale-in transition-all ${
                isDark
                  ? 'bg-[#0d2142] border-[#1d4677] shadow-lg shadow-blue-950/60'
                  : 'bg-blue-50/90 border-blue-200'
              }`}
            >
              {viewState !== 'COMPLETED' ? (
                <>
                  {/* Quiz Progress Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#38bdf8]" />
                      <span
                        className={`text-xs font-black uppercase tracking-wider ${
                          isDark ? 'text-sky-200' : 'text-[#0a213c]'
                        }`}
                      >
                        Quiz {currentQuestionIndex + 1} of {totalQuestions}
                      </span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                        isDark
                          ? 'bg-[#09172c] border-[#1a3a60] text-[#38bdf8]'
                          : 'bg-blue-100/90 border-blue-200 text-[#0a213c]'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span className="text-xs font-black">
                        {earnedXp} / {totalQuestions * 2} XP
                      </span>
                    </div>
                  </div>

                  {/* Progress Dots Indicator */}
                  <div className="flex items-center gap-1.5 w-full">
                    {quizQuestions.map((_, idx) => {
                      const answered = answeredMap[idx] !== undefined;
                      const isCorrect = answeredMap[idx] === true;
                      const isCurrent = idx === currentQuestionIndex;

                      let dotClass = isDark ? 'bg-[#183457]' : 'bg-slate-200';
                      if (answered) {
                        dotClass = isCorrect ? 'bg-emerald-500' : 'bg-rose-500';
                      } else if (isCurrent) {
                        dotClass = 'bg-[#38bdf8] ring-2 ring-sky-400';
                      }

                      return (
                        <div
                          key={idx}
                          className={`h-2 flex-1 rounded-full transition-all ${dotClass}`}
                        />
                      );
                    })}
                  </div>

                  {/* Current Active Question */}
                  {currentQuestion && (
                    <div className="space-y-3 pt-1">
                      <p
                        className={`text-sm sm:text-base font-black ${
                          isDark ? 'text-white' : 'text-[#0a213c]'
                        }`}
                      >
                        {currentQuestion.question}
                      </p>

                      {/* 4 Answer Options */}
                      <div className="space-y-2">
                        {currentQuestion.options.map((opt, idx) => {
                          const isSelected = selectedOption === opt;
                          const correctAns = currentQuestion.correct_answer || currentQuestion.correctAnswer;
                          const isThisCorrect = correctAns
                            ? opt.trim().toLowerCase() === String(correctAns).trim().toLowerCase()
                            : false;

                          let btnStyle = isDark
                            ? 'bg-[#0b1a33] hover:bg-[#12284d] border-[#1f3f6e] text-slate-100 hover:border-[#38bdf8]'
                            : 'bg-white border-slate-300 text-[#0a213c] hover:border-[#026fc3]';

                          if (viewState === 'QUIZ_RESULT') {
                            if (isThisCorrect) {
                              btnStyle = 'bg-emerald-600 border-emerald-500 text-white font-black shadow-md';
                            } else if (isSelected) {
                              btnStyle = 'bg-rose-600 border-rose-500 text-white font-black shadow-md';
                            } else {
                              btnStyle = isDark
                                ? 'opacity-35 border-slate-800 text-slate-500 bg-transparent'
                                : 'opacity-40 border-slate-200 text-slate-400 bg-slate-50';
                            }
                          }

                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={viewState === 'QUIZ_RESULT'}
                              onClick={() => handleSelectOption(opt)}
                              className={`w-full text-left p-3.5 rounded-2xl border text-xs sm:text-sm font-semibold transition-all min-h-[44px] flex items-center justify-between cursor-pointer ${btnStyle}`}
                            >
                              <span>{opt}</span>
                              {viewState === 'QUIZ_RESULT' && isThisCorrect && (
                                <Check className="w-4 h-4 text-white shrink-0 ml-2 stroke-[3]" />
                              )}
                              {viewState === 'QUIZ_RESULT' && isSelected && !isThisCorrect && (
                                <XCircle className="w-4 h-4 text-white shrink-0 ml-2 stroke-[2.5]" />
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
                              ? isDark
                                ? 'bg-emerald-950/80 border-emerald-600/70 text-emerald-200'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                              : isDark
                              ? 'bg-rose-950/80 border-rose-600/70 text-rose-200'
                              : 'bg-rose-50 border-rose-200 text-rose-950'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-black text-sm">
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
                            <p className="font-bold">
                              Correct answer: <span className="underline">{currentQuestion.correct_answer}</span>
                            </p>
                          )}

                          {serverExplanation && (
                            <p className="font-normal opacity-95 text-xs sm:text-sm">
                              {serverExplanation}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Next Question Button in Same Panel */}
                      {viewState === 'QUIZ_RESULT' && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={handleNextQuestion}
                            className="flex items-center gap-2 px-6 py-3 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs sm:text-sm font-black rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
                          >
                            <span>
                              {currentQuestionIndex < totalQuestions - 1
                                ? `Next Question (${currentQuestionIndex + 2}/${totalQuestions})`
                                : 'View Results'}
                            </span>
                            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* ================================================================ */
                /* COMPLETION SCREEN (INSIDE SAME PANEL)                            */
                /* ================================================================ */
                <div
                  className={`p-6 text-center rounded-2xl border space-y-4 animate-scale-in ${
                    isDark
                      ? 'bg-[#0a1c36] border-emerald-500/40 text-white'
                      : 'bg-emerald-50 border-emerald-200 text-[#0a213c]'
                  }`}
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                    <Award className="w-8 h-8 stroke-[2.5]" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-black tracking-tight">
                      Knowledge Bitz Complete! 🏆
                    </h3>
                    <p
                      className={`text-xs sm:text-sm font-medium ${
                        isDark ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {totalQuestions} quizzes completed
                    </p>
                  </div>

                  {/* Score & XP Summary */}
                  <div
                    className={`p-3.5 rounded-xl border max-w-xs mx-auto flex items-center justify-around ${
                      isDark
                        ? 'bg-[#0d2242] border-[#1e4272]'
                        : 'bg-white border-emerald-200 shadow-xs'
                    }`}
                  >
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Score
                      </span>
                      <span className="text-lg font-black text-emerald-400">
                        {correctCount} / {totalQuestions}
                      </span>
                    </div>
                    <div className="h-8 w-px bg-slate-700/50" />
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                        XP Earned
                      </span>
                      <span className="text-lg font-black text-[#38bdf8]">
                        +{earnedXp} XP
                      </span>
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleReadAgain}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black border transition-all active:scale-95 cursor-pointer ${
                        isDark
                          ? 'bg-[#132849] hover:bg-[#1a3560] border-[#1e3a5f] text-slate-200'
                          : 'bg-white hover:bg-slate-100 border-slate-300 text-[#0a213c]'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Read Again</span>
                    </button>

                    <button
                      type="button"
                      onClick={onClose}
                      className="flex items-center gap-2 px-6 py-2.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-xl shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Back to Discover</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Share Toast */}
          {shareToast && (
            <div
              className={`p-2 rounded-xl text-center text-xs font-bold border ${
                isDark
                  ? 'bg-emerald-950/80 text-emerald-200 border-emerald-800'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-200'
              }`}
            >
              {shareToast}
            </div>
          )}
        </div>

        {/* Modal Bottom Action Bar */}
        <div
          className={`p-4 sm:p-5 border-t flex items-center justify-between gap-3 ${
            isDark ? 'bg-[#091526] border-[#1b3456]' : 'bg-white border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#132849] hover:bg-[#1a3560] border-[#1e3a5f] text-slate-200'
                : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
            }`}
          >
            {viewState === 'COMPLETED' ? 'Close' : 'Done Reading'}
          </button>

          {viewState === 'COMPLETED' && (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 rounded-xl text-xs font-black">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Learned & Mastered</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
