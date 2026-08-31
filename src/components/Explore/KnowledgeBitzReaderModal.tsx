// ============================================================================
// EDTECHRA-BITZ: Knowledge Bitz Reading Experience & Quiz Modal
// 80-120 word focused microlearning reader with TTS Audio, Quiz Check, and XP
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Clock,
  BookOpen,
  Loader2,
  Award
} from 'lucide-react';
import { KnowledgeBitzItem } from '@/types';
import { getTopicById } from '@/utils/bitzTopicsConfig';
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

  // Reading & Quiz states
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [showQuiz, setShowQuiz] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [isQuizCorrect, setIsQuizCorrect] = useState<boolean | null>(null);
  const [isLearned, setIsLearned] = useState<boolean>(false);
  const [learningInProgress, setLearningInProgress] = useState<boolean>(false);
  const [awardedXpMessage, setAwardedXpMessage] = useState<string | null>(null);

  const topicConfig = bitz ? getTopicById(bitz.topic_id) : null;

  // Reset states whenever modal opens with new bitz
  useEffect(() => {
    if (isOpen && bitz) {
      setIsPlayingAudio(false);
      setShowQuiz(false);
      setSelectedOption(null);
      setQuizSubmitted(false);
      setIsQuizCorrect(null);
      setIsLearned(Boolean(bitz.has_learned));
      setAwardedXpMessage(null);

      // Record 'read' event
      knowledgeBitzService.recordInteraction(bitz.id, 'read', undefined, token);
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isOpen, bitz, token]);

  if (!isOpen || !bitz || !topicConfig) return null;

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

  // Submit Quiz Option
  const handleSelectQuizOption = async (option: string) => {
    if (quizSubmitted || learningInProgress) return;
    setSelectedOption(option);
    setQuizSubmitted(true);

    const correctAns = bitz.quiz?.correct_answer || bitz.quiz?.correctAnswer;
    const isCorrect = option.trim() === String(correctAns).trim();
    setIsQuizCorrect(isCorrect);

    if (isCorrect) {
      playCorrectAnswerSound();
      triggerConfetti();
      setIsLearned(true);
      const xp = bitz.xp_value || 10;
      setAwardedXpMessage(`+${xp} XP Awarded! Fact Learned.`);

      try {
        const res = await knowledgeBitzService.submitQuizAttempt(bitz.id, option, token);
        onLearned(bitz.id, res.xpAwarded || xp);
      } catch (err) {
        onLearned(bitz.id, xp);
      }
    }
  };

  // Explicit "I've Learned This" completion button
  const handleMarkAsLearned = async () => {
    if (isLearned || learningInProgress) return;
    if (!session) {
      requireAuth('quiz');
      return;
    }

    setLearningInProgress(true);
    try {
      const res = await knowledgeBitzService.recordInteraction(bitz.id, 'learned', undefined, token);
      setIsLearned(true);
      playCelebrationSound();
      triggerConfetti();

      const xp = res.xpAwarded || bitz.xp_value || 10;
      setAwardedXpMessage(`+${xp} XP Awarded! Fact permanently mastered.`);
      onLearned(bitz.id, xp);

      // Close modal smoothly after celebration
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err) {
      console.error('[KnowledgeBitzReaderModal] Learn error:', err);
    } finally {
      setLearningInProgress(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: topicConfig.color }}
            />
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wide">
              {topicConfig.name}
            </span>
            <span className="text-stone-300 dark:text-stone-700">•</span>
            <div className="flex items-center gap-1 text-xs text-stone-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>{bitz.reading_time_sec || 30}s</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
            aria-label="Close reader"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Reading Content */}
        <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-50 leading-tight tracking-tight">
            {bitz.title}
          </h2>

          {/* Visual Media */}
          {bitz.visual_url && (
            <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 shadow-inner">
              <img
                src={bitz.visual_url}
                alt={bitz.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* 80-120 Word Clear Reading Body */}
          <div className="text-stone-700 dark:text-stone-200 text-sm sm:text-base leading-relaxed font-normal space-y-3">
            <p>{bitz.reading_text}</p>
          </div>

          {/* Key Vocabulary Highlights (if any) */}
          {bitz.vocabulary && bitz.vocabulary.length > 0 && (
            <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Key Vocabulary</span>
              </div>
              <div className="space-y-1.5">
                {bitz.vocabulary.map((v, idx) => (
                  <div key={idx} className="text-xs text-stone-700 dark:text-stone-300">
                    <strong className="text-stone-900 dark:text-stone-100 font-semibold">{v.word}:</strong>{' '}
                    <span>{v.definition}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source Citation */}
          {bitz.source_citation && (
            <div className="text-[11px] text-stone-400 dark:text-stone-500 italic flex items-center gap-1">
              <span>Source:</span>
              <span className="font-medium text-stone-600 dark:text-stone-400">{bitz.source_citation}</span>
            </div>
          )}

          {/* Audio TTS Listen Action */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleToggleAudio}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
                isPlayingAudio
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200'
              }`}
            >
              {isPlayingAudio ? (
                <>
                  <VolumeX className="w-4 h-4 animate-pulse" />
                  <span>Pause Audio</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-amber-500" />
                  <span>Listen to Fact</span>
                </>
              )}
            </button>

            {/* Optional Quiz Trigger */}
            {bitz.quiz && !showQuiz && (
              <button
                type="button"
                onClick={() => setShowQuiz(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-full shadow-md shadow-blue-500/20 transition-all active:scale-95"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Quiz Me (+10 XP)</span>
              </button>
            )}
          </div>

          {/* Expandable Quiz Section */}
          {showQuiz && bitz.quiz && (
            <div className="mt-4 p-4 sm:p-5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl space-y-3.5 animate-scale-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Quick Knowledge Check
                </span>
                <span className="text-[11px] font-semibold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                  +10 XP
                </span>
              </div>

              <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {bitz.quiz.question}
              </p>

              {/* 4 Quiz Options */}
              <div className="space-y-2">
                {bitz.quiz.options.map((opt, idx) => {
                  const isSelected = selectedOption === opt;
                  const correctAns = bitz.quiz?.correct_answer || bitz.quiz?.correctAnswer;
                  const isThisCorrect = opt.trim() === String(correctAns).trim();

                  let btnStyle = 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 hover:border-blue-400';
                  if (quizSubmitted) {
                    if (isThisCorrect) {
                      btnStyle = 'bg-emerald-500 border-emerald-600 text-white shadow-md';
                    } else if (isSelected) {
                      btnStyle = 'bg-rose-500 border-rose-600 text-white';
                    } else {
                      btnStyle = 'opacity-50 border-stone-200 dark:border-stone-800 text-stone-400';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={quizSubmitted}
                      onClick={() => handleSelectQuizOption(opt)}
                      className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm font-medium transition-all ${btnStyle} flex items-center justify-between`}
                    >
                      <span>{opt}</span>
                      {quizSubmitted && isThisCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-white shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quiz Feedback Explanation */}
              {quizSubmitted && (
                <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                  isQuizCorrect
                    ? 'bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-100/90 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                }`}>
                  <div className="font-bold mb-1">
                    {isQuizCorrect ? '🎉 Correct! Knowledge Verified.' : 'Not quite right.'}
                  </div>
                  <p>{bitz.quiz.explanation}</p>
                </div>
              )}
            </div>
          )}

          {/* Awarded XP Banner */}
          {awardedXpMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 animate-bounce">
              <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{awardedXpMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer (Complete / Learned Action) */}
        <div className="p-4 sm:p-5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
          >
            Done Reading
          </button>

          <button
            type="button"
            disabled={isLearned || learningInProgress}
            onClick={handleMarkAsLearned}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-md transition-all active:scale-95 ${
              isLearned
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
            }`}
          >
            {learningInProgress ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isLearned ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Learned (+{bitz.xp_value || 10} XP)</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>I've Learned This (+{bitz.xp_value || 10} XP)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
