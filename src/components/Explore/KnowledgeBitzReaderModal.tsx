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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: topicConfig.color }}
            />
            <span className="text-xs font-black text-[#0a213c] uppercase tracking-wide">
              {topicConfig.name}
            </span>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>{bitz.reading_time_sec || 30}s</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-[#0a213c] hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            aria-label="Close reader"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Reading Content */}
        <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-black text-[#0a213c] leading-tight tracking-tight">
            {bitz.title}
          </h2>

          {/* Visual Media */}
          {bitz.visual_url && (
            <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100 shadow-2xs border border-slate-200">
              <img
                src={bitz.visual_url}
                alt={bitz.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* 80-120 Word Clear Reading Body */}
          <div className="text-slate-800 text-sm sm:text-base leading-relaxed font-medium space-y-3">
            <p>{bitz.reading_text}</p>
          </div>

          {/* Key Vocabulary Highlights (if any) */}
          {bitz.vocabulary && bitz.vocabulary.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 uppercase tracking-wider">
                <BookOpen className="w-4 h-4 text-amber-600 stroke-[2.5]" />
                <span>Key Vocabulary</span>
              </div>
              <div className="space-y-1.5">
                {bitz.vocabulary.map((v, idx) => (
                  <div key={idx} className="text-xs text-slate-800">
                    <strong className="text-[#0a213c] font-black">{v.word}:</strong>{' '}
                    <span className="font-medium">{v.definition}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source Citation */}
          {bitz.source_citation && (
            <div className="text-[11px] text-slate-500 italic flex items-center gap-1">
              <span>Source:</span>
              <span className="font-semibold text-slate-700">{bitz.source_citation}</span>
            </div>
          )}

          {/* Audio TTS Listen Action */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleToggleAudio}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer ${
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
                  <Volume2 className="w-4 h-4 text-amber-500 stroke-[2.2]" />
                  <span>Listen to Fact</span>
                </>
              )}
            </button>

            {/* Optional Quiz Trigger */}
            {bitz.quiz && !showQuiz && (
              <button
                type="button"
                onClick={() => setShowQuiz(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-full shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Quiz Me (+10 XP)</span>
              </button>
            )}
          </div>

          {/* Expandable Quiz Section */}
          {showQuiz && bitz.quiz && (
            <div className="mt-4 p-4 sm:p-5 bg-blue-50/90 border border-blue-200 rounded-2xl space-y-3.5 animate-scale-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#026fc3]" />
                  Quick Knowledge Check
                </span>
                <span className="text-[11px] font-black bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-full border border-blue-200">
                  +10 XP
                </span>
              </div>

              <p className="text-sm font-black text-[#0a213c]">
                {bitz.quiz.question}
              </p>

              {/* 4 Quiz Options */}
              <div className="space-y-2">
                {bitz.quiz.options.map((opt, idx) => {
                  const isSelected = selectedOption === opt;
                  const correctAns = bitz.quiz?.correct_answer || bitz.quiz?.correctAnswer;
                  const isThisCorrect = opt.trim() === String(correctAns).trim();

                  let btnStyle = 'bg-white border-slate-300 text-[#0a213c] hover:border-[#026fc3] font-bold';
                  if (quizSubmitted) {
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
                      disabled={quizSubmitted}
                      onClick={() => handleSelectQuizOption(opt)}
                      className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition-all ${btnStyle} flex items-center justify-between cursor-pointer`}
                    >
                      <span>{opt}</span>
                      {quizSubmitted && isThisCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-white shrink-0 ml-2 stroke-[2.5]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quiz Feedback Explanation */}
              {quizSubmitted && (
                <div className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                  isQuizCorrect
                    ? 'bg-emerald-50 text-emerald-950 border border-emerald-200'
                    : 'bg-rose-50 text-rose-950 border border-rose-200'
                }`}>
                  <div className="font-black mb-1">
                    {isQuizCorrect ? '🎉 Correct! Knowledge Verified.' : 'Not quite right.'}
                  </div>
                  <p className="font-semibold">{bitz.quiz.explanation}</p>
                </div>
              )}
            </div>
          )}

          {/* Awarded XP Banner */}
          {awardedXpMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-black text-emerald-950 animate-bounce">
              <Award className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{awardedXpMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer (Complete / Learned Action) */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            Done Reading
          </button>

          <button
            type="button"
            disabled={isLearned || learningInProgress}
            onClick={handleMarkAsLearned}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer ${
              isLearned
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
            }`}
          >
            {learningInProgress ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isLearned ? (
              <>
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Learned (+{bitz.xp_value || 10} XP)</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>I've Learned This (+{bitz.xp_value || 10} XP)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
