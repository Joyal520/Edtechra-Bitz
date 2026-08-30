// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: ESSAY & DESCRIPTIVE RESPONSE QUESTION
// Provides an editorial student writing interface with live word count,
// attached image preview, and AI-assisted evaluation (Gemini primary, OpenAI fallback).
// ============================================================================

import React, { useState } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Award, Image as ImageIcon, Loader2 } from 'lucide-react';
import { CourseQuestion, EssayEvaluationResult } from '@/types/courseStudio';
import { courseStudioService } from '@/services/courseStudioService';
import { playCompleteSound, playIncorrectSound } from '@/utils/courseAudio';
import { triggerConfettiBurst } from '@/utils/courseConfetti';

interface Props {
  question: CourseQuestion;
  isLocked?: boolean;
  isSubmitting?: boolean;
  selectedAnswer?: string;
  feedback?: { isCorrect: boolean; showExplanation: boolean } | null;
  onEvaluateAnswer: (question: CourseQuestion, answer: string, targetEl?: HTMLElement) => void;
}

export const EssayQuestion: React.FC<Props> = ({
  question,
  isLocked = false,
  isSubmitting = false,
  selectedAnswer,
  onEvaluateAnswer
}) => {
  // Extract essay configuration
  const imageUrl = question.image_url || (typeof question.options === 'object' && !Array.isArray(question.options) ? (question.options as any).image_url : '');
  const minWords = question.min_words || (typeof question.options === 'object' && !Array.isArray(question.options) ? (question.options as any).min_words : 80) || 80;
  const maxWords = question.max_words || (typeof question.options === 'object' && !Array.isArray(question.options) ? (question.options as any).max_words : 100) || 100;
  const criteriaList: string[] = question.evaluation_criteria || (typeof question.options === 'object' && !Array.isArray(question.options) ? (question.options as any).evaluation_criteria : []) || [
    'content_accuracy',
    'relevance',
    'completeness',
    'language',
    'grammar',
    'vocabulary'
  ];

  const [studentText, setStudentText] = useState(selectedAnswer || '');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EssayEvaluationResult | null>(question.essay_result || null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Word count calculation
  const words = studentText.trim() ? studentText.trim().split(/\s+/).filter(w => w.length > 0) : [];
  const wordCount = words.length;
  const isWordCountGood = wordCount >= minWords;

  const handleSubmit = async (targetEl?: HTMLElement) => {
    if (!studentText.trim() || isLocked || isEvaluating || isSubmitting) return;

    setIsEvaluating(true);
    setErrorMessage(null);

    try {
      const result = await courseStudioService.evaluateEssay({
        question_text: question.question_text,
        student_response: studentText,
        image_url: imageUrl || undefined,
        min_words: minWords,
        max_words: maxWords,
        evaluation_criteria: criteriaList
      });

      setEvaluation(result);
      if (result.score >= 70) {
        playCompleteSound();
        if (targetEl) triggerConfettiBurst(targetEl);
      } else {
        playIncorrectSound();
      }

      onEvaluateAnswer(question, studentText, targetEl);
    } catch (err: any) {
      console.error('Failed to evaluate essay:', err);
      setErrorMessage(err.message || 'AI evaluation timed out. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const isAnswerLocked = isLocked || Boolean(evaluation);

  return (
    <div className="w-full space-y-4 pt-1">
      {/* Attached Image Preview (if present) */}
      {imageUrl && (
        <div className="rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900 shadow-2xs max-w-lg mx-auto">
          <img
            src={imageUrl}
            alt="Prompt visual"
            className="w-full h-auto max-h-72 object-cover transition-transform hover:scale-[1.01]"
          />
          <div className="px-3 py-1.5 bg-stone-50 dark:bg-stone-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-[#026fc3]" />
            <span>Image Reference for this Question</span>
          </div>
        </div>
      )}

      {/* Target Length Guidance Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs reader-meta">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider">
            Target Length:
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/70 text-[#026fc3] dark:text-sky-300 font-bold text-xs border border-sky-200/80">
            {minWords}–{maxWords} words
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-bold">
          <span className={isWordCountGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}>
            {wordCount} / {maxWords} words
          </span>
          {isWordCountGood && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
        </div>
      </div>

      {/* Student Writing Textarea */}
      <div className="space-y-2">
        <textarea
          rows={6}
          disabled={isAnswerLocked || isEvaluating || isSubmitting}
          value={studentText}
          onChange={e => setStudentText(e.target.value)}
          placeholder="Start writing your descriptive response here..."
          className={`w-full p-4 sm:p-5 rounded-2xl border reader-input font-normal leading-relaxed transition-all focus:ring-2 focus:ring-[#026fc3] focus:border-[#026fc3] focus:outline-none selection:bg-sky-100 selection:text-slate-900 ${
            isAnswerLocked
              ? 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 cursor-not-allowed'
              : 'bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 dark:bg-[#111b2b] dark:text-white dark:placeholder:text-slate-400 dark:border-slate-700 caret-[#026fc3] dark:caret-white shadow-2xs'
          }`}
        />

        {/* Submit Action & Evaluating Indicator */}
        {!isAnswerLocked && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-slate-400 font-medium italic reader-meta">
              AI evaluates accuracy, vocabulary, grammar, and relevance.
            </p>

            <button
              type="button"
              disabled={!studentText.trim() || isEvaluating || isSubmitting}
              onClick={(e) => handleSubmit(e.currentTarget)}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-2xl bg-[#026fc3] hover:bg-[#02599c] text-white text-xs font-black transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm reader-button"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-sky-200" />
                  <span>Submit for AI Evaluation</span>
                </>
              )}
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2 reader-meta">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* AI EVALUATION RESULTS DASHBOARD */}
      {evaluation && (
        <div className="p-5 sm:p-7 rounded-3xl bg-linear-to-b from-sky-50/60 to-white dark:from-slate-900 dark:to-slate-950 border border-sky-200/90 dark:border-slate-800 shadow-md space-y-5 animate-in fade-in zoom-in-95 duration-300">
          
          {/* Header & Overall Score */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-sky-100 dark:border-slate-800">
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#026fc3] flex items-center gap-1.5 reader-meta">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Assessment Feedback</span>
              </span>
              <h5 className="text-base font-bold text-slate-900 dark:text-white reader-h3">
                Evaluation & Rubric Breakdown
              </h5>
            </div>

            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-sky-200/80 dark:border-slate-700 shadow-2xs self-start sm:self-auto">
              <Award className="w-5 h-5 text-[#026fc3]" />
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Score</span>
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {evaluation.score} <span className="text-xs text-slate-400 font-bold">/ {evaluation.max_score || 100}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Feedback Paragraph */}
          <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-sky-100 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-medium reader-explanation">
            {evaluation.feedback}
          </div>

          {/* Strengths & Improvements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
            {/* Strengths */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 space-y-2">
              <span className="font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5 text-xs uppercase tracking-wider reader-meta">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Key Strengths</span>
              </span>
              <ul className="space-y-1 text-emerald-950 dark:text-emerald-100 font-medium reader-body">
                {(evaluation.strengths || []).map((s, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Improvements */}
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 space-y-2">
              <span className="font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5 text-xs uppercase tracking-wider reader-meta">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Improve Next Time</span>
              </span>
              <ul className="space-y-1 text-amber-950 dark:text-amber-100 font-medium reader-body">
                {(evaluation.improvements || []).map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Criteria Scores Progress Breakdown */}
          {evaluation.criteria_scores && Object.keys(evaluation.criteria_scores).length > 0 && (
            <div className="space-y-2.5 pt-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 reader-meta">
                Criteria Breakdown:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(evaluation.criteria_scores).map(([critName, scoreVal]) => (
                  <div key={critName} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold reader-meta">
                      <span className="capitalize text-slate-700 dark:text-slate-300">{critName.replace(/_/g, ' ')}</span>
                      <span className="text-[#026fc3] font-black">{scoreVal}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-[#026fc3] to-sky-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, scoreVal))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
