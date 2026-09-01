// ============================================================================
// EDTECHRA-BITZ: Knowledge Bitz Reading Experience & 5-Quiz Engine (V2 Canonical)
// 100-word reading, adjustable typography ("Aa" settings), responsive mobile & desktop,
// sequential in-place 5-question quiz (2 XP each = 10 XP max), instant answer feedback,
// Premium Dark Blue default theme (#020817, #081B35, #0B2342, #1677FF, #36D1FF).
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
  Check,
  Type,
  Sliders
} from 'lucide-react';
import { KnowledgeBitzItem, BitzQuizQuestion, normalizeQuizToArray } from '@/types';
import { getCategoryById } from '@/utils/bitzTopicsConfig';
import { useAuth } from '@/context/AuthContext';
import { useBitzTheme, BitzTextSize, BitzLineSpacing, BitzFontChoice } from '@/context/BitzThemeContext';
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
  const {
    isDark,
    readingSettings,
    setTextSize,
    setLineSpacing,
    setFontFamily,
    resetReadingSettings
  } = useBitzTheme();

  // Audio, Sharing, and Typography Settings Popover
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [showTypographySettings, setShowTypographySettings] = useState<boolean>(false);

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
  const settingsRef = useRef<HTMLDivElement | null>(null);

  const category = bitz ? getCategoryById(bitz.category || bitz.topic_id) : null;
  const quizQuestions: BitzQuizQuestion[] = bitz ? normalizeQuizToArray(bitz.quiz) : [];
  const totalQuestions = quizQuestions.length;

  // Close typography settings popover on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowTypographySettings(false);
      }
    }
    if (showTypographySettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTypographySettings]);

  // Reset states on modal open
  useEffect(() => {
    if (isOpen && bitz) {
      setIsPlayingAudio(false);
      setShowTypographySettings(false);
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
    setServerExplanation(currentQuestion.explanation || 'Verified educational fact.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div
        className={`relative w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl rounded-3xl shadow-2xl border overflow-hidden my-auto transition-all ${
          isDark
            ? 'bg-[#081B35] border-[rgba(96,165,250,0.28)] text-[#F8FAFC] shadow-blue-950/60'
            : 'bg-white border-slate-200 text-[#0a213c]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div
          className={`flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b ${
            isDark ? 'bg-[#06152B] border-[rgba(96,165,250,0.2)]' : 'bg-white border-slate-200'
          }`}
        >
          {/* Metadata Badges */}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {/* Category Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                isDark
                  ? 'bg-[#0B2342] border-[rgba(96,165,250,0.3)]'
                  : 'bg-blue-50 border-blue-100'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: category.color }}
              />
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  isDark ? 'text-[#5AA9FF]' : 'text-[#0a213c]'
                }`}
              >
                {category.name}
              </span>
            </div>

            {/* CEFR Level Badge */}
            <div className="bg-[#1677FF] text-white px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider shadow-xs">
              CEFR {bitz.cefr_level || 'B1'}
            </div>

            {bitz.sub_topic && (
              <span
                className={`text-xs font-semibold truncate max-w-[130px] sm:max-w-[200px] ${
                  isDark ? 'text-[#94A3B8]' : 'text-slate-500'
                }`}
              >
                • {bitz.sub_topic}
              </span>
            )}
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* "Aa" Reading Typography Settings Trigger (Section 8) */}
            <div className="relative" ref={settingsRef}>
              <button
                type="button"
                onClick={() => setShowTypographySettings(!showTypographySettings)}
                className={`p-2 rounded-full transition-all cursor-pointer ${
                  showTypographySettings
                    ? isDark
                      ? 'bg-[#1677FF] text-white'
                      : 'bg-blue-100 text-[#1677FF]'
                    : isDark
                    ? 'text-[#CBD5E1] hover:bg-[#0B2342] hover:text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Reading Typography Settings (Aa)"
                aria-label="Reading Typography Settings"
              >
                <Type className="w-4 h-4 stroke-[2.5]" />
              </button>

              {/* Typography Settings Dropdown Popover */}
              {showTypographySettings && (
                <div
                  className={`absolute right-0 top-full mt-2 w-72 sm:w-80 p-4 rounded-2xl border shadow-2xl z-30 space-y-3.5 animate-scale-in ${
                    isDark
                      ? 'bg-[#06152B] border-[rgba(96,165,250,0.3)] text-white shadow-black/80'
                      : 'bg-white border-slate-200 text-[#0a213c] shadow-xl'
                  }`}
                >
                  <div className="flex items-center justify-between border-b pb-2 border-slate-700/40">
                    <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#36D1FF]" />
                      <span>Reading Settings</span>
                    </span>
                    <button
                      type="button"
                      onClick={resetReadingSettings}
                      className="text-[10px] font-bold text-[#36D1FF] hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>

                  {/* 1. Text Size Control */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400">Text Size</span>
                    <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-black/20 border border-white/10">
                      {(['small', 'medium', 'large', 'xlarge'] as BitzTextSize[]).map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setTextSize(size)}
                          className={`py-1 rounded-lg text-[11px] font-black capitalize transition-all cursor-pointer ${
                            readingSettings.textSize === size
                              ? 'bg-[#1677FF] text-white shadow-xs'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {size === 'small' ? 'S' : size === 'medium' ? 'M' : size === 'large' ? 'L' : 'XL'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Line Spacing Control */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400">Line Spacing</span>
                    <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/20 border border-white/10">
                      {(['compact', 'comfortable', 'relaxed'] as BitzLineSpacing[]).map((spacing) => (
                        <button
                          key={spacing}
                          type="button"
                          onClick={() => setLineSpacing(spacing)}
                          className={`py-1 rounded-lg text-[10px] font-black capitalize transition-all cursor-pointer ${
                            readingSettings.lineSpacing === spacing
                              ? 'bg-[#1677FF] text-white shadow-xs'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {spacing}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Font Family Choice */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400">Font Type</span>
                    <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-black/20 border border-white/10">
                      {(['standard', 'reading'] as BitzFontChoice[]).map((font) => (
                        <button
                          key={font}
                          type="button"
                          onClick={() => setFontFamily(font)}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            readingSettings.fontFamily === font
                              ? 'bg-[#1677FF] text-white shadow-xs font-black'
                              : 'text-slate-300 hover:text-white'
                          } ${font === 'reading' ? 'font-serif' : 'font-sans'}`}
                        >
                          {font === 'standard' ? 'Standard' : 'Editorial Serif'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bookmark Save */}
            <button
              type="button"
              onClick={handleToggleSave}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isSaved
                  ? isDark
                    ? 'text-[#36D1FF] bg-[#0B2342]'
                    : 'text-[#1677FF] bg-blue-50'
                  : isDark
                  ? 'text-[#CBD5E1] hover:bg-[#0B2342] hover:text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Save Bitz"
              aria-label="Save"
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>

            {/* Share */}
            <button
              type="button"
              onClick={handleShare}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isDark
                  ? 'text-[#CBD5E1] hover:bg-[#0B2342] hover:text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Share"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-full transition-colors cursor-pointer ml-1 ${
                isDark
                  ? 'text-[#CBD5E1] hover:text-white hover:bg-[#0B2342]'
                  : 'text-slate-600 hover:text-[#0a213c] hover:bg-slate-100'
              }`}
              aria-label="Close reader"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content (Sections 7, 10, 11: Comfortable padding & column width) */}
        <div className="p-4 sm:p-8 max-h-[78vh] overflow-y-auto space-y-6">
          <div className="max-w-[720px] mx-auto space-y-5">
            {/* Hook Headline */}
            <h2
              className={`text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-tight ${
                isDark ? 'text-[#F8FAFC]' : 'text-[#0a213c]'
              }`}
            >
              {bitz.title}
            </h2>

            {/* 100-Word Reading Body (Section 7: Left-aligned, NOT justified, dynamic CSS typography) */}
            <div
              className={`p-5 sm:p-7 rounded-3xl border transition-all ${
                isDark
                  ? 'bg-[#06152B] border-[rgba(96,165,250,0.25)] text-[#F8FAFC] shadow-inner'
                  : 'bg-slate-50 border-slate-200/90 text-slate-800'
              }`}
            >
              <p
                className="text-left select-text"
                style={{
                  fontSize: 'var(--reading-font-size, 18px)',
                  lineHeight: 'var(--reading-line-height, 1.8)',
                  fontFamily: 'var(--reading-font-family, inherit)'
                }}
              >
                {bitz.reading_text}
              </p>
            </div>

            {/* Key Vocabulary (if present) */}
            {bitz.vocabulary && bitz.vocabulary.length > 0 && (
              <div
                className={`rounded-2xl p-4 sm:p-5 space-y-2 border ${
                  isDark
                    ? 'bg-[#0B2342] border-amber-500/30'
                    : 'bg-amber-50/90 border-amber-200/80'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase tracking-wider">
                  <BookOpen className="w-4 h-4 text-amber-400 stroke-[2.5]" />
                  <span>Key Vocabulary</span>
                </div>
                <div className="space-y-1.5">
                  {bitz.vocabulary.map((v, idx) => (
                    <div key={idx} className="text-xs sm:text-sm">
                      <strong className={isDark ? 'text-white' : 'text-[#0a213c]'}>{v.word}:</strong>{' '}
                      <span className={isDark ? 'text-[#CBD5E1]' : 'text-slate-700'}>{v.definition}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Source Citation (Section 16) */}
            <div
              className={`text-xs italic flex items-center gap-1.5 ${
                isDark ? 'text-[#94A3B8]' : 'text-slate-500'
              }`}
            >
              <span>Source:</span>
              <span className={`font-medium ${isDark ? 'text-[#CBD5E1]' : 'text-slate-700'}`}>
                {bitz.source_citation || 'Requires administrator review'}
              </span>
            </div>

            {/* Audio TTS Control Button & Start Quiz Button */}
            <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleToggleAudio}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  isPlayingAudio
                    ? 'bg-amber-500 text-white shadow-md'
                    : isDark
                    ? 'bg-[#0B2342] hover:bg-[#122c54] text-[#CBD5E1] border border-[rgba(96,165,250,0.25)]'
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
                    <Volume2 className="w-4 h-4 text-[#36D1FF] stroke-[2.2]" />
                    <span>Listen to Bitz</span>
                  </>
                )}
              </button>

              {/* Start Quiz Action */}
              {totalQuestions > 0 && viewState === 'READING' && (
                <button
                  type="button"
                  onClick={handleStartQuiz}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#1677FF] hover:bg-[#2D8CFF] text-white text-xs sm:text-sm font-black rounded-full shadow-lg shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Start Quiz (5 Questions • 10 XP)</span>
                </button>
              )}
            </div>

            {/* ================================================================ */}
            {/* SAME-PANEL SEQUENTIAL 5-QUIZ SYSTEM (Sections 12, 13, 14, 15)   */}
            {/* ================================================================ */}
            {totalQuestions > 0 && viewState !== 'READING' && (
              <div
                ref={quizSectionRef}
                className={`mt-4 p-5 sm:p-7 rounded-3xl border space-y-4 animate-scale-in transition-all ${
                  isDark
                    ? 'bg-[#06152B] border-[rgba(96,165,250,0.3)] shadow-xl shadow-blue-950/70'
                    : 'bg-blue-50/90 border-blue-200'
                }`}
              >
                {viewState !== 'COMPLETED' ? (
                  <>
                    {/* Quiz Progress Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#36D1FF]" />
                        <span
                          className={`text-xs font-black uppercase tracking-wider ${
                            isDark ? 'text-[#5AA9FF]' : 'text-[#0a213c]'
                          }`}
                        >
                          Question {currentQuestionIndex + 1} of {totalQuestions}
                        </span>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                          isDark
                            ? 'bg-[#020817] border-[rgba(96,165,250,0.3)] text-[#36D1FF]'
                            : 'bg-blue-100/90 border-blue-200 text-[#0a213c]'
                        }`}
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span className="text-xs font-black">
                          {earnedXp} / {totalQuestions * 2} XP
                        </span>
                      </div>
                    </div>

                    {/* Progress Dots Indicator (● ○ ○ ○ ○) */}
                    <div className="flex items-center gap-1.5 w-full">
                      {quizQuestions.map((_, idx) => {
                        const answered = answeredMap[idx] !== undefined;
                        const isCorrect = answeredMap[idx] === true;
                        const isCurrent = idx === currentQuestionIndex;

                        let dotClass = isDark ? 'bg-[#0B2342]' : 'bg-slate-200';
                        if (answered) {
                          dotClass = isCorrect ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-rose-500';
                        } else if (isCurrent) {
                          dotClass = 'bg-[#36D1FF] ring-2 ring-sky-400';
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
                      <div className="space-y-3.5 pt-1">
                        <p
                          className={`text-sm sm:text-base font-black leading-snug ${
                            isDark ? 'text-white' : 'text-[#0a213c]'
                          }`}
                        >
                          {currentQuestion.question}
                        </p>

                        {/* 4 Answer Options */}
                        <div className="space-y-2.5">
                          {currentQuestion.options.map((opt, idx) => {
                            const isSelected = selectedOption === opt;
                            const correctAns = currentQuestion.correct_answer || currentQuestion.correctAnswer;
                            const isThisCorrect = correctAns
                              ? opt.trim().toLowerCase() === String(correctAns).trim().toLowerCase()
                              : false;

                            let btnStyle = isDark
                              ? 'bg-[#081B35] hover:bg-[#0B2342] border-[rgba(96,165,250,0.25)] text-[#F8FAFC] hover:border-[#36D1FF]'
                              : 'bg-white border-slate-300 text-[#0a213c] hover:border-[#1677FF]';

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
                                className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm font-semibold transition-all min-h-[48px] flex items-center justify-between cursor-pointer ${btnStyle}`}
                              >
                                <span className="leading-relaxed">{opt}</span>
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
                              className="flex items-center gap-2 px-6 py-3 bg-[#1677FF] hover:bg-[#2D8CFF] text-white text-xs sm:text-sm font-black rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
                            >
                              <span>
                                {currentQuestionIndex < totalQuestions - 1
                                  ? `Next Question (${currentQuestionIndex + 2}/${totalQuestions})`
                                  : 'View Final Results'}
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
                  /* COMPLETION SCREEN (INSIDE SAME PANEL - Section 13)               */
                  /* ================================================================ */
                  <div
                    className={`p-6 sm:p-8 text-center rounded-2xl border space-y-4 animate-scale-in ${
                      isDark
                        ? 'bg-[#081B35] border-emerald-500/40 text-white'
                        : 'bg-emerald-50 border-emerald-200 text-[#0a213c]'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                      <Award className="w-8 h-8 stroke-[2.5]" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                        Knowledge Bitz Complete! 🏆
                      </h3>
                      <p
                        className={`text-xs sm:text-sm font-medium ${
                          isDark ? 'text-[#CBD5E1]' : 'text-slate-600'
                        }`}
                      >
                        {totalQuestions} quizzes completed
                      </p>
                    </div>

                    {/* Score & XP Summary */}
                    <div
                      className={`p-4 rounded-2xl border max-w-xs mx-auto flex items-center justify-around ${
                        isDark
                          ? 'bg-[#020817] border-[rgba(96,165,250,0.3)]'
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
                        <span className="text-lg font-black text-[#36D1FF]">
                          +{earnedXp} XP
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleReadAgain}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black border transition-all active:scale-95 cursor-pointer ${
                          isDark
                            ? 'bg-[#0B2342] hover:bg-[#122c54] border-[rgba(96,165,250,0.25)] text-[#CBD5E1]'
                            : 'bg-white hover:bg-slate-100 border-slate-300 text-[#0a213c]'
                        }`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Read Again</span>
                      </button>

                      <button
                        type="button"
                        onClick={onClose}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#1677FF] hover:bg-[#2D8CFF] text-white text-xs sm:text-sm font-black rounded-xl shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
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
                className={`p-2.5 rounded-xl text-center text-xs font-bold border ${
                  isDark
                    ? 'bg-emerald-950/80 text-emerald-200 border-emerald-800'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                }`}
              >
                {shareToast}
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div
          className={`p-4 sm:p-5 border-t flex items-center justify-between gap-3 ${
            isDark ? 'bg-[#06152B] border-[rgba(96,165,250,0.2)]' : 'bg-white border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#081B35] hover:bg-[#0B2342] border-[rgba(96,165,250,0.25)] text-[#CBD5E1]'
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
