// ============================================================================
// EDTECHRA-BITZ: Knowledge Bitz Reading Experience & 5-Quiz Modal (V2)
// 100-word reading, sequential 5-question quiz (2 XP each = 10 XP max), TTS Audio
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  BookOpen,
  Award,
  ArrowRight,
  Bookmark,
  Share2
} from 'lucide-react';
import { KnowledgeBitzItem, BitzQuizQuestion, normalizeQuizToArray } from '@/types';
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

export const KnowledgeBitzReaderModal: React.FC<KnowledgeBitzReaderModalProps> = ({
  bitz,
  isOpen,
  onClose,
  onLearned
}) => {
  const { session, requireAuth } = useAuth();
  const token = session?.access_token || null;

  // Reading & TTS Audio
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  // 5-Question Quiz Flow State
  const [showQuiz, setShowQuiz] = useState<boolean>(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [questionSubmitted, setQuestionSubmitted] = useState<boolean>(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState<boolean | null>(null);
  const [serverExplanation, setServerExplanation] = useState<string | null>(null);

  // Gamification & Quiz Progress Tracking
  const [answeredMap, setAnsweredMap] = useState<Record<number, boolean>>({});
  const [earnedXp, setEarnedXp] = useState<number>(0);
  const [isLearned, setIsLearned] = useState<boolean>(false);
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);

  const category = bitz ? getCategoryById(bitz.category || bitz.topic_id) : null;
  const quizQuestions: BitzQuizQuestion[] = bitz ? normalizeQuizToArray(bitz.quiz) : [];
  const totalQuestions = quizQuestions.length;

  // Reset states whenever modal opens with new bitz
  useEffect(() => {
    if (isOpen && bitz) {
      setIsPlayingAudio(false);
      setShowQuiz(false);
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setQuestionSubmitted(false);
      setIsCurrentCorrect(null);
      setServerExplanation(null);
      setAnsweredMap({});
      setEarnedXp(0);
      setIsLearned(Boolean(bitz.has_learned));
      setQuizCompleted(Boolean(bitz.has_learned));
      setIsSaved(Boolean(bitz.is_saved_by_me));

      // Record 'read' event
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

  // Submit Answer for current question
  const handleSelectOption = async (option: string) => {
    if (questionSubmitted || !currentQuestion) return;
    if (!session) {
      requireAuth('quiz');
      return;
    }

    setSelectedOption(option);
    setQuestionSubmitted(true);

    const correctAns = currentQuestion.correct_answer || currentQuestion.correctAnswer;
    const isCorrect = correctAns
      ? option.trim().toLowerCase() === String(correctAns).trim().toLowerCase()
      : true;

    setIsCurrentCorrect(isCorrect);
    setServerExplanation(currentQuestion.explanation || null);

    const questionXp = totalQuestions === 1 ? (bitz.xp_value || 10) : 2;
    let newlyAwardedXp = 0;

    if (isCorrect) {
      playCorrectAnswerSound();
      newlyAwardedXp = questionXp;
      setEarnedXp((prev) => prev + questionXp);
    }

    setAnsweredMap((prev) => ({
      ...prev,
      [currentQuestionIndex]: isCorrect
    }));

    // Submit to server for persistent verification & XP
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
      if (newlyAwardedXp > 0) {
        onLearned(bitz.id, newlyAwardedXp);
      }
    }

    // Check if this was the final question
    if (currentQuestionIndex >= totalQuestions - 1) {
      setQuizCompleted(true);
      setIsLearned(true);
      playCelebrationSound();
      triggerConfetti();
    }
  };

  // Advance to next quiz question
  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setQuestionSubmitted(false);
      setIsCurrentCorrect(null);
      setServerExplanation(null);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Badge */}
            <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: category.color }}
              />
              <span className="text-[11px] font-black text-[#0a213c] uppercase tracking-wider">
                {category.name}
              </span>
            </div>

            {/* CEFR Level Badge */}
            <div className="bg-[#026fc3] text-white px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider shadow-2xs">
              CEFR {bitz.cefr_level || 'B1'}
            </div>

            {bitz.sub_topic && (
              <span className="text-xs font-semibold text-slate-500 truncate max-w-[140px]">
                • {bitz.sub_topic}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleToggleSave}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                isSaved ? 'text-[#026fc3] bg-blue-50' : 'text-slate-500 hover:bg-slate-100'
              }`}
              title="Save Bitz"
              aria-label="Save"
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              title="Share"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-[#0a213c] hover:bg-slate-100 rounded-full transition-colors cursor-pointer ml-1"
              aria-label="Close reader"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {/* Hook Headline */}
          <h2 className="text-xl sm:text-2xl font-black text-[#0a213c] leading-tight tracking-tight">
            {bitz.title}
          </h2>

          {/* 100-Word Reading Body */}
          <div className="text-slate-800 text-sm sm:text-base leading-relaxed font-medium bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
            <p>{bitz.reading_text}</p>
          </div>

          {/* Vocabulary Section (if provided) */}
          {bitz.vocabulary && bitz.vocabulary.length > 0 && (
            <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 uppercase tracking-wider">
                <BookOpen className="w-4 h-4 text-amber-600 stroke-[2.5]" />
                <span>Key Vocabulary</span>
              </div>
              <div className="space-y-1.5">
                {bitz.vocabulary.map((v, idx) => (
                  <div key={idx} className="text-xs text-slate-800">
                    <strong className="text-[#0a213c] font-black">{v.word}:</strong>{' '}
                    <span className="font-medium text-slate-700">{v.definition}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source Citation */}
          {bitz.source_citation && (
            <div className="text-[11px] text-slate-500 italic flex items-center gap-1">
              <span>Source:</span>
              <span className="font-medium text-slate-700">{bitz.source_citation}</span>
            </div>
          )}

          {/* Control Bar: Audio + Quiz Button */}
          <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleToggleAudio}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                isPlayingAudio
                  ? 'bg-amber-500 text-white shadow-md'
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
                  <Volume2 className="w-4 h-4 text-[#026fc3] stroke-[2.2]" />
                  <span>Listen to Bitz</span>
                </>
              )}
            </button>

            {totalQuestions > 0 && !showQuiz && (
              <button
                type="button"
                onClick={() => setShowQuiz(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-full shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Quiz Me ({totalQuestions * 2} XP)</span>
              </button>
            )}
          </div>

          {/* 5-Question Sequential Quiz Experience */}
          {showQuiz && totalQuestions > 0 && (
            <div className="mt-4 p-4 sm:p-5 bg-blue-50/90 border border-blue-200 rounded-3xl space-y-4 animate-scale-in">
              {/* Quiz Header with Step Indicator & XP Tally */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#026fc3]" />
                  <span className="text-xs font-black text-[#0a213c] uppercase tracking-wider">
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-blue-100/90 px-3 py-1 rounded-full border border-blue-200">
                  <Award className="w-3.5 h-3.5 text-[#026fc3]" />
                  <span className="text-xs font-black text-[#0a213c]">
                    {earnedXp} / {totalQuestions * 2} XP
                  </span>
                </div>
              </div>

              {/* Question Progress Dots */}
              <div className="flex items-center gap-1.5 w-full">
                {quizQuestions.map((_, idx) => {
                  const answered = answeredMap[idx] !== undefined;
                  const isCorrect = answeredMap[idx] === true;
                  const isCurrent = idx === currentQuestionIndex;

                  let dotClass = 'bg-slate-200';
                  if (answered) {
                    dotClass = isCorrect ? 'bg-emerald-500' : 'bg-rose-400';
                  } else if (isCurrent) {
                    dotClass = 'bg-[#026fc3] ring-2 ring-blue-300';
                  }

                  return (
                    <div
                      key={idx}
                      className={`h-1.5 flex-1 rounded-full transition-all ${dotClass}`}
                    />
                  );
                })}
              </div>

              {/* Current Question Text */}
              {currentQuestion && (
                <>
                  <p className="text-sm font-black text-[#0a213c]">
                    {currentQuestion.question}
                  </p>

                  {/* 4 Options */}
                  <div className="space-y-2">
                    {currentQuestion.options.map((opt, idx) => {
                      const isSelected = selectedOption === opt;
                      const correctAns = currentQuestion.correct_answer || currentQuestion.correctAnswer;
                      const isThisCorrect = correctAns
                        ? opt.trim().toLowerCase() === String(correctAns).trim().toLowerCase()
                        : false;

                      let btnStyle = 'bg-white border-slate-300 text-[#0a213c] hover:border-[#026fc3] font-bold';
                      if (questionSubmitted) {
                        if (isThisCorrect) {
                          btnStyle = 'bg-emerald-600 border-emerald-700 text-white shadow-md font-bold';
                        } else if (isSelected) {
                          btnStyle = 'bg-rose-600 border-rose-700 text-white font-bold';
                        } else {
                          btnStyle = 'opacity-40 border-slate-300 text-slate-500';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={questionSubmitted}
                          onClick={() => handleSelectOption(opt)}
                          className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition-all ${btnStyle} flex items-center justify-between cursor-pointer`}
                        >
                          <span>{opt}</span>
                          {questionSubmitted && isThisCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-white shrink-0 ml-2 stroke-[2.5]" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Question Feedback / Explanation */}
                  {questionSubmitted && (
                    <div
                      className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                        isCurrentCorrect
                          ? 'bg-emerald-50 text-emerald-950 border border-emerald-200'
                          : 'bg-rose-50 text-rose-950 border border-rose-200'
                      }`}
                    >
                      <div className="font-black mb-1">
                        {isCurrentCorrect ? '🎉 +2 XP! Correct Answer.' : 'Not quite right.'}
                      </div>
                      {serverExplanation && <p className="font-semibold">{serverExplanation}</p>}
                    </div>
                  )}

                  {/* Next Question / Finish Button */}
                  {questionSubmitted && (
                    <div className="pt-2 flex justify-end">
                      {currentQuestionIndex < totalQuestions - 1 ? (
                        <button
                          type="button"
                          onClick={handleNextQuestion}
                          className="flex items-center gap-2 px-5 py-2 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                          <span>Next Question</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="w-full text-center p-3 bg-emerald-100/80 border border-emerald-300 rounded-2xl text-xs font-black text-emerald-900">
                          🏆 Quiz Complete! Total Earned: {earnedXp} XP. Fact Mastered!
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Share Toast */}
          {shareToast && (
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-bold text-emerald-900">
              {shareToast}
            </div>
          )}
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            {quizCompleted ? 'Close' : 'Done Reading'}
          </button>

          {isLearned && (
            <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
              <span>Learned & Mastered</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
