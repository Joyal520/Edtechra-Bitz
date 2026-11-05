// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: ESSAY & DESCRIPTIVE WRITING ASSESSMENT
// Engine-level Typing-Only Writing Assessment Component:
//   - Prevents clipboard paste (Ctrl+V, Cmd+V, Shift+Insert, context menu, paste event)
//   - Prevents drag-and-drop text insertion
//   - Detects & blocks suspiciously rapid text insertion bursts
//   - Live word counter (e.g. 38/45 words) with 45-word minimum submit gate
//   - Warning banner when exceeding recommended 55-word limit
//   - Refresh-safe draft persistence across page reloads
//   - Server-side AI content screening (80% threshold) + Gemini -> OpenAI failover
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Award,
  Image as ImageIcon,
  Loader2,
  ShieldAlert,
  RotateCcw,
  Keyboard
} from 'lucide-react';
import { CourseQuestion, EssayEvaluationResult } from '@/types/courseStudio';
import { courseStudioService } from '@/services/courseStudioService';
import { playCompleteSound, playIncorrectSound } from '@/utils/courseAudio';
import { triggerConfettiBurst } from '@/utils/courseConfetti';
import {
  countWritingWords,
  resolveWritingWordLimits,
  evaluateTextInsertionSecurity,
  createInitialTypingTelemetry,
  WritingTypingTelemetry,
  loadWritingDraft,
  saveWritingDraft,
  clearWritingDraft
} from '@/utils/writingAssessmentUtils';

interface Props {
  question: CourseQuestion;
  courseId?: string;
  classroomId?: string;
  episodeId?: string;
  userId?: string | null;
  lessonContext?: string;
  isLocked?: boolean;
  isSubmitting?: boolean;
  selectedAnswer?: string;
  feedback?: { isCorrect: boolean; showExplanation: boolean } | null;
  onEvaluateAnswer: (
    question: CourseQuestion,
    answer: string,
    targetEl?: HTMLElement,
    evaluationResult?: EssayEvaluationResult,
    typingTelemetry?: WritingTypingTelemetry
  ) => void;
}

export const EssayQuestion: React.FC<Props> = ({
  question,
  courseId,
  classroomId,
  episodeId,
  userId = null,
  lessonContext = '',
  isLocked = false,
  isSubmitting = false,
  selectedAnswer,
  onEvaluateAnswer
}) => {
  const imageUrl =
    question.image_url ||
    (typeof question.options === 'object' && !Array.isArray(question.options)
      ? (question.options as any).image_url
      : '');

  const { minWords, maxWords } = resolveWritingWordLimits(question);

  const criteriaList: string[] =
    question.evaluation_criteria ||
    (typeof question.options === 'object' && !Array.isArray(question.options)
      ? (question.options as any).evaluation_criteria
      : null) || [
      'grammar',
      'vocabulary',
      'relevance',
      'sentence_structure',
      'instruction_compliance'
    ];

  const effectiveEpisodeId = episodeId || question.episode_id || 'ep';
  const effectiveCourseId = courseId || question.course_id || '';

  const [studentText, setStudentText] = useState<string>(() => {
    if (selectedAnswer && selectedAnswer.trim()) return selectedAnswer;
    const saved = loadWritingDraft(question.id, effectiveEpisodeId, userId);
    return saved?.text || '';
  });

  const [telemetry, setTelemetry] = useState<WritingTypingTelemetry>(() => {
    const saved = loadWritingDraft(question.id, effectiveEpisodeId, userId);
    return saved?.telemetry || createInitialTypingTelemetry();
  });

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EssayEvaluationResult | null>(
    question.essay_result || null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);

  const recentCharTimestampsRef = useRef<number[]>([]);
  const securityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitInFlightRef = useRef<boolean>(false);

  // Sync draft when question changes
  useEffect(() => {
    if (selectedAnswer && selectedAnswer.trim()) {
      setStudentText(selectedAnswer);
      return;
    }
    const saved = loadWritingDraft(question.id, effectiveEpisodeId, userId);
    if (saved) {
      setStudentText(saved.text);
      setTelemetry(saved.telemetry);
    } else {
      setStudentText('');
      setTelemetry(createInitialTypingTelemetry());
    }
    setEvaluation(question.essay_result || null);
    setErrorMessage(null);
    setSecurityWarning(null);
  }, [question.id, effectiveEpisodeId, userId]);

  const triggerSecurityNotice = (msg: string) => {
    if (securityTimeoutRef.current) {
      clearTimeout(securityTimeoutRef.current);
    }
    setSecurityWarning(msg);
    securityTimeoutRef.current = setTimeout(() => {
      setSecurityWarning(null);
    }, 4500);
  };

  const wordCount = countWritingWords(studentText);
  const meetsMinWords = wordCount >= minWords;
  const exceedsMaxWords = wordCount > maxWords;

  const isFlaggedAi = Boolean(
    evaluation && (evaluation.ai_flagged || evaluation.assessment_status === 'flagged_ai')
  );
  const isAnswerLocked = isLocked || (Boolean(evaluation) && !isFlaggedAi);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isAnswerLocked || isEvaluating || isSubmitting) return;

    const isPasteShortcut =
      ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') ||
      (e.shiftKey && e.key === 'Insert');

    if (isPasteShortcut) {
      e.preventDefault();
      e.stopPropagation();
      const nextTelemetry: WritingTypingTelemetry = {
        ...telemetry,
        pasteAttemptsBlocked: telemetry.pasteAttemptsBlocked + 1
      };
      setTelemetry(nextTelemetry);
      saveWritingDraft(question.id, studentText, nextTelemetry, effectiveEpisodeId, userId);
      triggerSecurityNotice(
        'Pasting (Ctrl+V / Cmd+V) is disabled for writing assessments. Please type your answer independently.'
      );
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      setTelemetry(prev => ({
        ...prev,
        backspaceCount: prev.backspaceCount + 1,
        lastInputAt: Date.now()
      }));
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = Date.now();
      setTelemetry(prev => ({
        ...prev,
        keystrokeCount: prev.keystrokeCount + 1,
        startedAt: prev.startedAt || now,
        lastInputAt: now,
        activeTypingDurationMs: prev.startedAt ? now - prev.startedAt : 0
      }));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const nextTelemetry: WritingTypingTelemetry = {
      ...telemetry,
      pasteAttemptsBlocked: telemetry.pasteAttemptsBlocked + 1
    };
    setTelemetry(nextTelemetry);
    saveWritingDraft(question.id, studentText, nextTelemetry, effectiveEpisodeId, userId);
    triggerSecurityNotice(
      'Clipboard pasting is disabled for writing assessments. Please type your response directly.'
    );
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const nextTelemetry: WritingTypingTelemetry = {
      ...telemetry,
      dropAttemptsBlocked: telemetry.dropAttemptsBlocked + 1
    };
    setTelemetry(nextTelemetry);
    saveWritingDraft(question.id, studentText, nextTelemetry, effectiveEpisodeId, userId);
    triggerSecurityNotice(
      'Drag-and-drop text insertion is disabled. Please type your response directly.'
    );
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    // Prevent right-click context menu paste in strict typing-only assessment box
    e.preventDefault();
    triggerSecurityNotice(
      'Context menu paste is disabled. Please type your response using the keyboard.'
    );
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isAnswerLocked || isEvaluating || isSubmitting) return;

    const nextValue = e.target.value;
    const nativeInputType = (e.nativeEvent as InputEvent)?.inputType || '';

    if (
      nativeInputType === 'insertFromPaste' ||
      nativeInputType === 'insertFromDrop' ||
      nativeInputType === 'insertFromYank'
    ) {
      const nextTelemetry: WritingTypingTelemetry = {
        ...telemetry,
        pasteAttemptsBlocked: telemetry.pasteAttemptsBlocked + 1
      };
      setTelemetry(nextTelemetry);
      saveWritingDraft(question.id, studentText, nextTelemetry, effectiveEpisodeId, userId);
      triggerSecurityNotice(
        'Pasting is disabled for writing assessments. Please type your response directly.'
      );
      return;
    }

    const secCheck = evaluateTextInsertionSecurity({
      previousText: studentText,
      nextText: nextValue,
      recentCharTimestamps: recentCharTimestampsRef.current
    });

    recentCharTimestampsRef.current = secCheck.updatedTimestamps;

    if (!secCheck.allowed && secCheck.isRapidInsertion) {
      const nextTelemetry: WritingTypingTelemetry = {
        ...telemetry,
        rapidInsertionFlags: telemetry.rapidInsertionFlags + 1
      };
      setTelemetry(nextTelemetry);
      saveWritingDraft(question.id, studentText, nextTelemetry, effectiveEpisodeId, userId);
      triggerSecurityNotice(
        secCheck.reason ||
          'Suspiciously rapid text insertion detected. Please type your answer character by character.'
      );
      return;
    }

    const now = Date.now();
    const nextTelemetry: WritingTypingTelemetry = {
      ...telemetry,
      keystrokeCount:
        secCheck.charDelta > 0
          ? telemetry.keystrokeCount + secCheck.charDelta
          : telemetry.keystrokeCount,
      startedAt: telemetry.startedAt || now,
      lastInputAt: now,
      activeTypingDurationMs: telemetry.startedAt ? now - telemetry.startedAt : 0
    };

    setStudentText(nextValue);
    setTelemetry(nextTelemetry);
    saveWritingDraft(question.id, nextValue, nextTelemetry, effectiveEpisodeId, userId);
  };

  const handleSubmit = async (targetEl?: HTMLElement) => {
    if (
      !meetsMinWords ||
      !studentText.trim() ||
      isAnswerLocked ||
      isEvaluating ||
      isSubmitting ||
      submitInFlightRef.current
    ) {
      return;
    }

    submitInFlightRef.current = true;
    setIsEvaluating(true);
    setErrorMessage(null);

    try {
      const result = await courseStudioService.evaluateEssay({
        course_id: effectiveCourseId || undefined,
        classroom_id: classroomId || undefined,
        episode_id: effectiveEpisodeId || undefined,
        question_id: question.id,
        question_text: question.question_text,
        student_response: studentText,
        image_url: imageUrl || undefined,
        lesson_context: lessonContext || undefined,
        min_words: minWords,
        max_words: maxWords,
        evaluation_criteria: criteriaList,
        typing_telemetry: telemetry as any
      });

      setEvaluation(result);

      if (result.ai_flagged || result.assessment_status === 'flagged_ai') {
        playIncorrectSound();
        // Do NOT award marks when AI content threshold is exceeded
        onEvaluateAnswer(question, studentText, targetEl, result, telemetry);
        return;
      }

      // Clear draft once genuine evaluation completes and marks are awarded
      clearWritingDraft(question.id, effectiveEpisodeId, userId);

      if (result.score >= 60) {
        playCompleteSound();
        if (targetEl) triggerConfettiBurst(targetEl);
      } else {
        playIncorrectSound();
      }

      onEvaluateAnswer(question, studentText, targetEl, result, telemetry);
    } catch (err: any) {
      console.error('Failed to evaluate essay:', err);
      setErrorMessage(
        err.message ||
          'AI evaluation service is temporarily unavailable. Marks have not been awarded. Please try again.'
      );
    } finally {
      setIsEvaluating(false);
      submitInFlightRef.current = false;
    }
  };

  const handleResetFlaggedResponse = () => {
    setEvaluation(null);
    setStudentText('');
    const freshTelemetry = createInitialTypingTelemetry();
    setTelemetry(freshTelemetry);
    clearWritingDraft(question.id, effectiveEpisodeId, userId);
    setErrorMessage(null);
    setSecurityWarning(null);
  };

  return (
    <div className="w-full space-y-4 pt-1" data-testid="typing-only-writing-assessment">
      {/* Attached Image Preview (if present) */}
      {imageUrl && (
        <div className="rounded-2xl overflow-hidden border border-[var(--theme-border-primary)] bg-[var(--theme-surface-interactive)] shadow-2xs max-w-lg mx-auto">
          <img
            src={imageUrl}
            alt="Prompt visual"
            className="w-full h-auto max-h-72 object-cover transition-transform hover:scale-[1.01]"
          />
          <div className="px-3 py-1.5 bg-[var(--theme-surface-subtle)] text-[11px] font-bold text-theme-muted flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-theme-accent" />
            <span>Image Reference for this Question</span>
          </div>
        </div>
      )}

      {/* Target Length & Live Word Counter Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs reader-meta">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-theme-muted uppercase text-[10px] tracking-wider flex items-center gap-1">
            <Keyboard className="w-3.5 h-3.5 text-theme-accent" />
            <span>Typing-Only Response • Target:</span>
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[var(--theme-accent-soft)] text-theme-accent font-bold text-xs border border-[var(--theme-border-subtle)]">
            {minWords}–{maxWords} words
          </span>
        </div>

        <div
          data-testid="writing-word-counter"
          data-word-count={wordCount}
          data-min-words={minWords}
          data-max-words={maxWords}
          className="flex items-center gap-1.5 font-extrabold"
        >
          <span
            className={
              exceedsMaxWords
                ? 'text-amber-600 dark:text-amber-400'
                : meetsMinWords
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-theme-muted'
            }
          >
            {wordCount}/{minWords} words
          </span>
          {meetsMinWords && !exceedsMaxWords && (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          )}
          {exceedsMaxWords && (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          )}
        </div>
      </div>

      {/* Student Writing Textarea */}
      <div className="space-y-2.5">
        <textarea
          data-testid="writing-response-textarea"
          rows={6}
          disabled={isAnswerLocked || isEvaluating || isSubmitting}
          value={studentText}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onContextMenu={handleContextMenu}
          autoComplete="off"
          placeholder={`Type your response directly here (minimum ${minWords} words, recommended ${minWords}–${maxWords} words). Copy-paste is disabled...`}
          className={`w-full p-4 sm:p-5 rounded-2xl border reader-input font-normal leading-relaxed transition-all ${
            isAnswerLocked
              ? 'bg-[var(--theme-surface-subtle)] border-[var(--theme-border-subtle)] text-theme-primary cursor-not-allowed'
              : 'input-theme text-theme-primary shadow-2xs'
          }`}
        />

        {/* Recommended Maximum Word Warning (> 55 words) */}
        {exceedsMaxWords && !isAnswerLocked && (
          <div
            data-testid="writing-max-words-warning"
            role="status"
            className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              You have written {wordCount} words, which exceeds the recommended {maxWords}-word limit ({minWords}–{maxWords} words recommended). Consider keeping your answer concise.
            </span>
          </div>
        )}

        {/* Anti-Paste / Rapid Insertion Security Warning */}
        {securityWarning && (
          <div
            data-testid="writing-security-warning"
            role="alert"
            className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{securityWarning}</span>
          </div>
        )}

        {/* Submit Action & Evaluating Indicator */}
        {!isAnswerLocked && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-theme-muted font-medium italic reader-meta">
              {meetsMinWords
                ? 'Minimum word count reached. Ready for AI evaluation.'
                : `Write at least ${minWords - wordCount} more word${
                    minWords - wordCount === 1 ? '' : 's'
                  } to enable submission (${wordCount}/${minWords} words).`}
            </p>

            <button
              type="button"
              data-testid="writing-submit-button"
              disabled={!meetsMinWords || isEvaluating || isSubmitting}
              onClick={e => handleSubmit(e.currentTarget)}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-2xl btn-theme-primary text-xs font-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm reader-button"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Submit for AI Evaluation</span>
                </>
              )}
            </button>
          </div>
        )}

        {errorMessage && (
          <div
            data-testid="writing-evaluation-error"
            role="alert"
            className="p-3.5 rounded-xl bg-[var(--theme-error-bg)] border border-[var(--theme-error-border)] text-[var(--theme-error-text)] text-xs font-bold flex items-center gap-2 reader-meta"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* AI CONTENT DETECTED BLOCKING ALERT (WHEN THRESHOLD EXCEEDED) */}
      {evaluation && isFlaggedAi && (
        <div
          data-testid="ai-content-detected-banner"
          role="alert"
          className="p-5 sm:p-6 rounded-3xl bg-rose-500/12 dark:bg-rose-950/50 border-2 border-rose-500/50 text-rose-950 dark:text-rose-100 space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0 border border-rose-500/30">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h5
                  data-testid="ai-content-detected-heading"
                  className="text-sm sm:text-base font-black tracking-wide uppercase text-rose-700 dark:text-rose-300"
                >
                  AI CONTENT DETECTED
                </h5>
                <p
                  data-testid="ai-content-detected-body"
                  className="text-xs sm:text-sm font-bold leading-relaxed text-rose-900 dark:text-rose-100"
                >
                  Your writing appears to contain a high likelihood of AI-generated content. Marks have not been awarded. Please write your answer independently.
                </p>
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-right shrink-0">
              <span className="text-[10px] font-black uppercase tracking-wider block text-rose-700 dark:text-rose-300">
                Marks Awarded
              </span>
              <span className="text-base font-black text-rose-800 dark:text-rose-200">
                0 / {evaluation.max_score || 100}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-black/30 border border-rose-500/25 text-xs space-y-1.5">
            <div className="flex flex-wrap items-center gap-3 font-bold text-rose-800 dark:text-rose-200">
              <span>
                Estimated AI Likelihood: {evaluation.ai_likelihood_percentage ?? 85}%
              </span>
              <span>•</span>
              <span className="capitalize">
                Confidence: {evaluation.confidence || 'high'}
              </span>
              <span>•</span>
              <span>Status: Queued for Teacher Review</span>
            </div>
            {evaluation.explanation && (
              <p className="text-slate-700 dark:text-slate-300 font-medium">
                {evaluation.explanation}
              </p>
            )}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
              Note: Automated AI screening is probabilistic and not definitive proof. Your teacher can review this submission and override the result if appropriate, or you may rewrite your answer independently below.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              data-testid="writing-rewrite-independently-button"
              onClick={handleResetFlaggedResponse}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear & Write Independently</span>
            </button>
          </div>
        </div>
      )}

      {/* AI EVALUATION RESULTS DASHBOARD (PASSED SCREENING) */}
      {evaluation && !isFlaggedAi && (
        <div
          data-testid="writing-evaluation-passed-card"
          className="p-5 sm:p-7 rounded-3xl surface-card space-y-5 animate-in fade-in zoom-in-95 duration-300"
        >
          {/* Header & Overall Score */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--theme-border-subtle)]">
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-theme-accent flex items-center gap-1.5 reader-meta">
                <Sparkles className="w-3.5 h-3.5 text-theme-accent" />
                <span>AI Assessment Feedback</span>
              </span>
              <h5 className="text-base font-bold text-theme-primary reader-h3">
                Evaluation & Rubric Breakdown
              </h5>
            </div>

            <div className="flex items-center gap-3 bg-[var(--theme-surface-interactive)] px-4 py-2 rounded-2xl border border-[var(--theme-border-primary)] shadow-2xs self-start sm:self-auto">
              <Award className="w-5 h-5 text-theme-accent" />
              <div>
                <span className="text-[10px] font-black text-theme-muted uppercase tracking-wider block">
                  Score
                </span>
                <span
                  data-testid="writing-evaluated-score"
                  className="text-lg font-black text-theme-primary"
                >
                  {evaluation.score}{' '}
                  <span className="text-xs text-theme-muted font-bold">
                    / {evaluation.max_score || 100}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Feedback Paragraph */}
          <div className="p-4 rounded-2xl bg-[var(--theme-surface-interactive)] border border-[var(--theme-border-subtle)] text-xs sm:text-sm text-theme-primary leading-relaxed font-medium reader-explanation">
            {evaluation.feedback}
          </div>

          {/* Strengths & Improvements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="p-4 rounded-2xl bg-[var(--theme-success-bg)] border border-[var(--theme-success-border)] space-y-2">
              <span className="font-black text-[var(--theme-success-text)] flex items-center gap-1.5 text-xs uppercase tracking-wider reader-meta">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Key Strengths</span>
              </span>
              <ul className="space-y-1 text-[var(--theme-success-text)] font-medium reader-body">
                {(evaluation.strengths || []).map((s, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--theme-warning-bg)] border border-[var(--theme-warning-border)] space-y-2">
              <span className="font-black text-[var(--theme-warning-text)] flex items-center gap-1.5 text-xs uppercase tracking-wider reader-meta">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Improve Next Time</span>
              </span>
              <ul className="space-y-1 text-[var(--theme-warning-text)] font-medium reader-body">
                {(evaluation.improvements || []).map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Criteria Scores Progress Breakdown */}
          {evaluation.criteria_scores && Object.keys(evaluation.criteria_scores).length > 0 && (
            <div className="space-y-2.5 pt-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-theme-muted reader-meta">
                Criteria Breakdown:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(evaluation.criteria_scores).map(([critName, scoreVal]) => (
                  <div
                    key={critName}
                    className="p-3 rounded-xl bg-[var(--theme-surface-interactive)] border border-[var(--theme-border-subtle)] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold reader-meta">
                      <span className="capitalize text-theme-primary">
                        {critName.replace(/_/g, ' ')}
                      </span>
                      <span className="text-theme-accent font-black">{scoreVal}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[var(--theme-surface-subtle)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-[#026fc3] to-sky-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, Number(scoreVal) || 0))}%` }}
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
