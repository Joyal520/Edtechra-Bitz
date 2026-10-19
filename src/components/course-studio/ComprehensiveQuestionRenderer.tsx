// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: COMPREHENSIVE QUESTION RENDERER
// Handles all 17+ closed-ended question types, comprehension passage-anchored
// questions, and open-ended questions with live AI rubric evaluation.
// Guaranteed strict question-state isolation (zero cross-question contamination).
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  Check,
  BookOpen,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Undo2,
  RotateCcw,
} from 'lucide-react';
import {
  CourseQuestion,
  StudentQuestionResponse,
  OpenEndedRubricCriterion
} from '@/types/courseStudio';
import { courseAudio } from '@/utils/courseAudio';
import { triggerConfettiBurst } from '@/utils/courseConfetti';
import { courseStudioService } from '@/services/courseStudioService';
import {
  normalizeQuestionOptions,
  resolveCorrectOption,
  isOptionMatchingStudentAnswer,
  evaluateQuestionAnswer,
  cleanTextForComparison
} from '@/utils/questionGrading';
import { shuffleWordsGuaranteed } from '@/utils/questionSchemaValidator';
import { LiquidButton, LiquidChip, LiquidOption } from '@/components/course-studio/liquid';
import { DraggableOrderingQuestion } from './DraggableOrderingQuestion';
import { ClozePassageQuestion } from './ClozePassageQuestion';

interface SentenceToken {
  id: string;
  text: string;
}

// Normalizes items/options/correct_order into a clean array of string tokens
function extractSentenceTokens(q: any): string[] {
  const rawItems = q.items || q.options || q.words || q.correct_order || q.correctOrder;
  if (Array.isArray(rawItems) && rawItems.length > 0) {
    return rawItems
      .map((item: any) => {
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'object' && item !== null) {
          return String(item.text ?? item.label ?? item.value ?? item.word ?? '').trim();
        }
        return String(item ?? '').trim();
      })
      .filter(Boolean);
  }

  if (q.correct_answer && typeof q.correct_answer === 'string') {
    return q.correct_answer.trim().split(/\s+/).filter(Boolean);
  }

  return [];
}

function extractSentenceCorrectOrder(q: any): string[] {
  const rawCorrect = q.correct_order || q.correctOrder || q.items;
  if (Array.isArray(rawCorrect) && rawCorrect.length > 0) {
    return rawCorrect
      .map((item: any) => {
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'object' && item !== null) {
          return String(item.text ?? item.label ?? item.value ?? item.word ?? '').trim();
        }
        return String(item ?? '').trim();
      })
      .filter(Boolean);
  }

  if (q.correct_answer && typeof q.correct_answer === 'string') {
    return q.correct_answer.trim().split(/\s+/).filter(Boolean);
  }

  return [];
}

interface ComprehensiveQuestionRendererProps {
  question: CourseQuestion;
  index: number;
  response?: StudentQuestionResponse;
  onAnswerSubmit: (res: StudentQuestionResponse) => void;
  isStudentView?: boolean;
  mode?: 'edit' | 'student';
  onUpdateQuestion?: (updated: CourseQuestion) => void;
  onDeleteQuestion?: () => void;
  onDuplicateQuestion?: () => void;
  onMoveQuestionUp?: () => void;
  onMoveQuestionDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export const ComprehensiveQuestionRenderer: React.FC<ComprehensiveQuestionRendererProps> = ({
  question,
  index,
  response,
  onAnswerSubmit,
  isStudentView: _isStudentView = true,
  mode = 'student',
  onUpdateQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onMoveQuestionUp,
  onMoveQuestionDown,
  canMoveUp,
  canMoveDown
}) => {
  // Guarantee unique immutable question ID
  const qId = question.id || `q_fallback_${index}`;
  const rawQType = question.question_type || (question as any).type || 'multiple_choice';
  const qType = (rawQType as string) === 'open_ended' ? 'essay' : rawQType;

  // Normalize options array with stable identifiers
  const rawOptionsSource = question.options || (question as any).items || (question as any).correct_order;
  const normalizedOptions = normalizeQuestionOptions(rawOptionsSource);
  const resolvedCorrect = resolveCorrectOption(question);
  const optionsList: string[] = normalizedOptions.map(opt => opt.text);

  // Extract passage & WH metadata supporting both direct properties and options JSONB object
  const passageText =
    question.passage ||
    (typeof question.options === 'object' && question.options !== null && (question.options as any).passage) ||
    question.content_ref ||
    null;

  const whType =
    question.wh_type ||
    (typeof question.options === 'object' && question.options !== null && (question.options as any).wh_type) ||
    (qType === 'wh_question' ? 'Comprehension' : null);

  // Local interaction states strictly keyed to this instance
  const [selectedMulti, setSelectedMulti] = useState<string[]>([]);
  const [fillInput, setFillInput] = useState<string>('');
  const [shortAnswerInput, setShortAnswerInput] = useState<string>('');
  const [sentenceTokens, setSentenceTokens] = useState<SentenceToken[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<SentenceToken[]>([]);
  const [openEndedText, setOpenEndedText] = useState<string>('');
  const [isEvaluatingAi, setIsEvaluatingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Initialize Sentence Reordering tokens from question items / options / correct_order
  useEffect(() => {
    if (qType === 'sentence_reordering' || qType === 'word_ordering' || qType === 'sentence_builder') {
      if (response && response.status !== 'unanswered' && response.answer) {
        let prevWords: string[] = [];
        if (Array.isArray(response.answer)) {
          prevWords = response.answer.map(String);
        } else if (typeof response.answer === 'string') {
          prevWords = response.answer.trim().split(/\s+/);
        }
        setSelectedTokens(prevWords.map((w, i) => ({ id: `prev_${qId}_${i}`, text: w })));
        setSentenceTokens([]);
        return;
      }

      const itemsList = extractSentenceTokens(question);
      const canonicalOrder = extractSentenceCorrectOrder(question);
      const tokenObjects: SentenceToken[] = itemsList.map((text, idx) => ({
        id: `tok_${qId}_${idx}_${text.substring(0, 12).replace(/\s+/g, '_')}`,
        text
      }));

      // Guarantee shuffled order is not identical to canonical order
      if (tokenObjects.length > 1) {
        let shuffled = shuffleWordsGuaranteed(tokenObjects);
        if (
          canonicalOrder.length === shuffled.length &&
          shuffled.every((t, i) => t.text.toLowerCase() === canonicalOrder[i].toLowerCase())
        ) {
          shuffled = shuffleWordsGuaranteed(shuffled);
        }
        setSentenceTokens(shuffled);
      } else {
        setSentenceTokens(tokenObjects);
      }
      setSelectedTokens([]);
    }
  }, [qId, qType, question, response]);

  const isAnswered = Boolean(response && response.status !== 'unanswered');
  const isCorrect = response?.status === 'correct';

  // --------------------------------------------------------------------------
  // 1. SUBMIT CLOSED-ENDED ANSWER
  // --------------------------------------------------------------------------
  const commitAnswer = (
    studentAnswer: any,
    correctCheck: boolean,
    feedbackText: string,
    pointsMultiplier = 1,
    languageFeedback: string | null = null
  ) => {
    if (isAnswered) return;

    if (correctCheck) {
      courseAudio.playCorrectSound();
      triggerConfettiBurst(null);
    } else {
      courseAudio.playIncorrectSound();
    }

    const pointsAwarded = correctCheck ? Math.round((question.points || 10) * pointsMultiplier) : 0;

    const result: StudentQuestionResponse = {
      questionId: qId,
      answer: studentAnswer,
      status: correctCheck ? 'correct' : 'incorrect',
      score: pointsAwarded,
      maxScore: question.points || 10,
      feedback: feedbackText,
      languageFeedback,
      evaluatedAt: new Date().toISOString()
    };

    onAnswerSubmit(result);
  };

  // --------------------------------------------------------------------------
  // 2. OPEN-ENDED AI EVALUATOR SUBMISSION (ESSAY)
  // --------------------------------------------------------------------------
  const handleEvaluateOpenEnded = async () => {
    if (!openEndedText.trim()) return;

    setIsEvaluatingAi(true);
    setAiError(null);

    try {
      const evaluation = await courseStudioService.evaluateEssay({
        question_text: question.question_text,
        student_response: openEndedText.trim(),
        image_url: question.image_url,
        lesson_context: passageText || question.explanation || '',
        min_words: question.min_words || 15,
        max_words: question.max_words || 200,
        evaluation_criteria: question.evaluation_criteria || ['grammar', 'vocabulary', 'relevance', 'completeness']
      });

      const maxScore = question.points || 10;
      const rawScorePercent = evaluation.max_score > 0 ? evaluation.score / evaluation.max_score : 0.7;
      const scaledScore = Math.round(rawScorePercent * maxScore);
      const passed = scaledScore >= Math.round(maxScore * 0.6);

      if (passed) {
        courseAudio.playCorrectSound();
        triggerConfettiBurst(null);
      } else {
        courseAudio.playIncorrectSound();
      }

      const formattedCriteria: OpenEndedRubricCriterion[] = Object.entries(
        evaluation.criteria_scores || {}
      ).map(([name, score]) => ({
        name,
        score: Math.round(((score as number) / 100) * 10),
        maxScore: 10
      }));

      const res: StudentQuestionResponse = {
        questionId: qId,
        answer: openEndedText.trim(),
        status: passed ? 'correct' : 'incorrect',
        score: scaledScore,
        maxScore,
        feedback: evaluation.feedback || (passed ? 'Well done!' : 'Needs improvement.'),
        strengths: evaluation.strengths || [],
        improvements: evaluation.improvements || [],
        criteria: formattedCriteria,
        evaluatedAt: new Date().toISOString()
      };

      onAnswerSubmit(res);
    } catch (err: any) {
      setAiError(err.message || 'AI evaluation temporarily unavailable. Please retry.');
    } finally {
      setIsEvaluatingAi(false);
    }
  };

  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // 2B. SHORT ANSWER: DETERMINISTIC ONE-WORD EVALUATOR (0 OR 10 MARKS, NO AI)
  // --------------------------------------------------------------------------
  const handleEvaluateShortAnswer = () => {
    const rawInput = shortAnswerInput.trim();
    if (!rawInput || isAnswered) return;

    // Reject multi-word submissions
    const words = rawInput.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      setAiError('Please enter exactly ONE word.');
      return;
    }
    setAiError(null);

    // Score deterministically using questionGrading engine (no AI API call)
    const evalResult = evaluateQuestionAnswer(question, rawInput);
    commitAnswer(
      rawInput,
      evalResult.isCorrect,
      evalResult.feedback,
      evalResult.isCorrect ? 1 : 0,
      null
    );
  };

  // --------------------------------------------------------------------------
  // 3. WH QUESTION / COMPREHENSION AI EVALUATOR SUBMISSION
  // --------------------------------------------------------------------------
  const handleEvaluateWhQuestion = async () => {
    if (!fillInput.trim() || isAnswered || isEvaluatingAi) return;

    setIsEvaluatingAi(true);
    setAiError(null);

    const expectedAns =
      question.expected_answer ||
      question.correct_answer ||
      (typeof question.options === 'object' && (question.options as any)?.expected_answer) ||
      '';

    const acceptableAnswers = Array.isArray(question.acceptable_answers)
      ? question.acceptable_answers
      : (typeof question.options === 'object' && Array.isArray((question.options as any)?.acceptable_answers)
          ? (question.options as any).acceptable_answers
          : []);

    try {
      const evaluation = await courseStudioService.evaluateQuestionAnswer({
        question_text: question.question_text,
        student_answer: fillInput.trim(),
        expected_answer: expectedAns,
        acceptable_answers: acceptableAnswers,
        evaluation_criteria: question.evaluation_criteria || question.evaluation?.criteria || [],
        passage: passageText || '',
        max_score: question.points || 10,
        wh_type: whType || undefined,
        cefr_level: 'A1'
      });

      if (evaluation.correct) {
        courseAudio.playCorrectSound();
        triggerConfettiBurst(null);
      } else {
        courseAudio.playIncorrectSound();
      }

      const res: StudentQuestionResponse = {
        questionId: qId,
        answer: fillInput.trim(),
        status: evaluation.correct ? 'correct' : 'incorrect',
        score: evaluation.score,
        maxScore: evaluation.maxScore || question.points || 10,
        feedback: evaluation.feedback,
        languageFeedback: evaluation.languageFeedback || null,
        evaluatedAt: new Date().toISOString()
      };

      onAnswerSubmit(res);
    } catch (err: any) {
      console.warn('AI evaluation service failed, falling back to local evaluation:', err);
      const fallbackResult = evaluateQuestionAnswer(question, fillInput.trim());
      commitAnswer(
        fillInput.trim(),
        fallbackResult.isCorrect,
        fallbackResult.feedback,
        fallbackResult.isCorrect ? 1 : 0,
        fallbackResult.languageFeedback
      );
    } finally {
      setIsEvaluatingAi(false);
    }
  };

  return (
    <div
      id={`question-${qId}`}
      className={`w-full ${
        mode === 'edit'
          ? 'rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[var(--theme-border-primary)] shadow-xs'
          : 'rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-[var(--theme-border-subtle)] shadow-2xs'
      } surface-card space-y-3.5 sm:space-y-4 transition-all ${
        isAnswered
          ? isCorrect
            ? 'ring-1 ring-emerald-500/40 bg-emerald-50/10'
            : 'ring-1 ring-rose-500/40 bg-rose-50/10'
          : ''
      }`}
    >
      {/* CARD HEADER */}
      <div className="question-header pb-3 border-b border-[var(--theme-border-subtle)]">
        <div className="question-meta flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-theme-accent reader-badge whitespace-nowrap">
            QUESTION {String(index + 1).padStart(2, '0')}
          </span>
          {mode === 'edit' ? (
            <select
              value={qType}
              onChange={e => {
                const newType = e.target.value as any;
                let newOpts: any = question.options;
                let newCorrect = question.correct_answer;
                let newExpected = question.expected_answer;
                let newAcceptable = question.acceptable_answers;
                if (newType === 'multiple_choice') {
                  newOpts = ['Option A', 'Option B', 'Option C', 'Option D'];
                  newCorrect = 'A';
                } else if (newType === 'true_false') {
                  newOpts = ['True', 'False'];
                  newCorrect = 'True';
                } else if (newType === 'short_answer') {
                  newCorrect = question.correct_answer || 'Sample expected answer from the lesson';
                  newExpected = newCorrect;
                  newAcceptable = [newCorrect];
                  newOpts = [newCorrect];
                } else if (newType === 'fill_blank') {
                  newCorrect = 'Answer';
                } else if (newType === 'sentence_reordering') {
                  newCorrect = 'Students learn key concepts from the video lesson';
                  newOpts = ['Students', 'learn', 'key', 'concepts', 'from', 'the', 'video', 'lesson'];
                }
                onUpdateQuestion?.({
                  ...question,
                  question_type: newType,
                  options: newOpts,
                  correct_answer: newCorrect,
                  expected_answer: newExpected,
                  acceptable_answers: newAcceptable,
                  points: question.points || 10
                });
              }}
              className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg bg-white text-[#172033] border border-[#CBD5E1] focus:outline-none focus:border-[#026fc3] cursor-pointer w-fit shadow-2xs"
            >
              <option value="multiple_choice" className="bg-white text-[#172033]">Multiple Choice</option>
              <option value="true_false" className="bg-white text-[#172033]">True / False</option>
              <option value="short_answer" className="bg-white text-[#172033]">Short Answer</option>
              <option value="sentence_reordering" className="bg-white text-[#172033]">Sentence Ordering</option>
              <option value="fill_blank" className="bg-white text-[#172033]">Fill in Blank</option>
              <option value="wh_question" className="bg-white text-[#172033]">WH Question</option>
              <option value="multiple_select" className="bg-white text-[#172033]">Multiple Select</option>
              <option value="ordering" className="bg-white text-[#172033]">Story / Step Ordering</option>
              <option value="cloze_passage" className="bg-white text-[#172033]">Cloze Passage</option>
              <option value="essay" className="bg-white text-[#172033]">Essay / Open Ended</option>
            </select>
          ) : (
            <span className="question-type text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[var(--theme-surface-subtle)] text-theme-secondary border border-[var(--theme-border-subtle)] w-fit">
              {qType === 'sentence_reordering' || qType === 'sentence_builder' || qType === 'word_ordering'
                ? 'Sentence Ordering'
                : qType.replace(/_/g, ' ')}
            </span>
          )}
          {question.skill && (
            <span className="text-[10px] font-bold text-sky-700 bg-sky-100 dark:bg-sky-900/40 px-2 py-0.5 rounded-md w-fit truncate">
              {question.skill}
            </span>
          )}
        </div>

        <div className="question-points flex items-center gap-1.5">
          {mode === 'edit' ? (
            <label className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 cursor-pointer">
              <input
                type="number"
                min={1}
                max={100}
                value={question.points || 10}
                onChange={e => onUpdateQuestion?.({ ...question, points: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                className="w-8 bg-transparent text-center font-black focus:outline-none"
              />
              <span>PTS</span>
            </label>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--theme-accent-soft)] text-theme-accent text-[11px] font-black border border-[var(--theme-border-subtle)] whitespace-nowrap">
              {question.points || 10} PTS
            </span>
          )}

          {mode === 'edit' && (
            <div className="flex items-center gap-0.5 text-theme-muted">
              {canMoveUp !== undefined && (
                <button
                  type="button"
                  onClick={onMoveQuestionUp}
                  disabled={!canMoveUp}
                  title="Move Question Up"
                  className="p-1 hover:text-theme-primary disabled:opacity-20 cursor-pointer rounded"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              )}
              {canMoveDown !== undefined && (
                <button
                  type="button"
                  onClick={onMoveQuestionDown}
                  disabled={!canMoveDown}
                  title="Move Question Down"
                  className="p-1 hover:text-theme-primary disabled:opacity-20 cursor-pointer rounded"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}
              {onDuplicateQuestion && (
                <button
                  type="button"
                  onClick={onDuplicateQuestion}
                  title="Duplicate Question"
                  className="p-1 hover:text-[#026fc3] cursor-pointer rounded"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
              {onDeleteQuestion && (
                <button
                  type="button"
                  onClick={onDeleteQuestion}
                  title="Delete Question"
                  className="p-1 hover:text-rose-500 cursor-pointer rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* READING PASSAGE REFERENCE CALLOUT */}
      {passageText && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/5 to-transparent border-l-4 border-l-[#026fc3] border border-sky-200/40 dark:border-sky-800/40 text-xs leading-relaxed text-theme-primary space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#026fc3] dark:text-sky-400">
            <BookOpen className="w-3.5 h-3.5" />
            <span>READING PASSAGE REFERENCE</span>
          </div>
          <blockquote className="italic font-serif text-sm opacity-95 text-theme-primary pl-2 border-l-2 border-sky-400/40">
            "{passageText}"
          </blockquote>
        </div>
      )}

      {/* QUESTION PROMPT */}
      {mode === 'edit' ? (
        <textarea
          value={question.question_text}
          onChange={e => onUpdateQuestion?.({ ...question, question_text: e.target.value })}
          placeholder="Enter question prompt..."
          rows={2}
          className="w-full text-base sm:text-lg font-bold text-theme-primary leading-snug p-2.5 rounded-xl border border-dashed border-[#026fc3]/50 focus:border-[#026fc3] focus:outline-none bg-white/50 dark:bg-black/30 resize-y"
        />
      ) : (
        <h4 className="text-base sm:text-lg font-bold text-theme-primary leading-snug text-left reader-question">
          {question.question_text}
        </h4>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TYPE 1: MULTIPLE CHOICE (4-OPTION SINGLE SELECT)                    */}
      {/* ------------------------------------------------------------------- */}
      {qType === 'multiple_choice' && (
        mode === 'edit' ? (
          <div className="space-y-2.5 pt-1">
            {normalizedOptions.map((opt, oIdx) => {
              const isThisCorrect = resolvedCorrect ? resolvedCorrect.id === opt.id : (question.correct_answer === opt.id || question.correct_answer === opt.text);
              return (
                <div
                  key={opt.id || oIdx}
                  className={`liquid-option ${isThisCorrect ? 'ring-2 ring-emerald-500 bg-emerald-50/20' : ''}`}
                >
                  <button
                    type="button"
                    title="Click to set as correct answer"
                    onClick={() => onUpdateQuestion?.({ ...question, correct_answer: opt.id })}
                    className={`liquid-option-badge cursor-pointer transition-colors ${
                      isThisCorrect ? 'bg-emerald-500 text-white border-emerald-600' : 'hover:bg-sky-100 text-slate-700'
                    }`}
                  >
                    {isThisCorrect ? '✓' : opt.id}
                  </button>
                  <div className="liquid-option-text flex items-center gap-2">
                    <input
                      type="text"
                      value={opt.text}
                      onChange={e => {
                        const newText = e.target.value;
                        const nextOptions = [...normalizedOptions];
                        nextOptions[oIdx] = { ...opt, text: newText };
                        onUpdateQuestion?.({ ...question, options: nextOptions.map(o => o.text) });
                      }}
                      placeholder={`Option ${opt.id}`}
                      className="w-full text-sm font-bold bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:border-[#026fc3] focus:outline-none py-1"
                    />
                    {normalizedOptions.length > 2 && (
                      <button
                        type="button"
                        title="Remove option"
                        onClick={() => {
                          const nextOptions = normalizedOptions.filter((_, i) => i !== oIdx);
                          let newCorrect = question.correct_answer;
                          if (newCorrect === opt.id) {
                            newCorrect = nextOptions[0]?.id || 'A';
                          }
                          onUpdateQuestion?.({
                            ...question,
                            options: nextOptions.map(o => o.text),
                            correct_answer: newCorrect
                          });
                        }}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  const nextLetter = String.fromCharCode(65 + normalizedOptions.length);
                  const nextOptions = [...normalizedOptions.map(o => o.text), `Option ${nextLetter}`];
                  onUpdateQuestion?.({ ...question, options: nextOptions });
                }}
                className="px-3 py-1.5 rounded-xl border border-dashed border-[#026fc3] text-[#026fc3] hover:bg-[#026fc3]/5 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Answer</span>
              </button>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>Correct Answer:</span>
                <select
                  value={question.correct_answer || 'A'}
                  onChange={e => onUpdateQuestion?.({ ...question, correct_answer: e.target.value })}
                  className="px-2 py-1 rounded-lg border border-slate-300 bg-white dark:bg-stone-800 text-xs font-black text-emerald-600 focus:outline-none cursor-pointer"
                >
                  {normalizedOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>
                      {opt.id} ({opt.text.substring(0, 16)}...)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 pt-1">
            {normalizedOptions.map((opt, oIdx) => {
              const isSelected = isOptionMatchingStudentAnswer(opt, response?.answer);
              const isThisTheCorrectAnswer = resolvedCorrect ? resolvedCorrect.id === opt.id : false;

              return (
                <LiquidOption
                  key={opt.id || oIdx}
                  badge={opt.id}
                  text={opt.text}
                  isSelected={isSelected}
                  isAnswered={isAnswered}
                  isCorrect={isCorrect}
                  isCorrectOption={isThisTheCorrectAnswer}
                  disabled={isAnswered}
                  onClick={() => {
                    const evalResult = evaluateQuestionAnswer(question, opt.id);
                    commitAnswer(
                      opt.id,
                      evalResult.isCorrect,
                      evalResult.feedback,
                      evalResult.isCorrect ? 1 : 0,
                      evalResult.languageFeedback
                    );
                  }}
                />
              );
            })}
          </div>
        )
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TYPE 2: MULTIPLE SELECT (CHECKBOXES)                                */}
      {/* ------------------------------------------------------------------- */}
      {qType === 'multiple_select' && (
        <div className="space-y-3 pt-1">
          <p className="text-xs text-theme-secondary font-medium italic">
            Select all correct options that apply:
          </p>
          <div className="space-y-2.5">
            {optionsList.map((opt, oIdx) => {
              const isChecked = selectedMulti.includes(opt);
              return (
                <button
                  key={oIdx}
                  type="button"
                  disabled={isAnswered}
                  onClick={() => {
                    setSelectedMulti(prev =>
                      prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]
                    );
                  }}
                  className={`liquid-option ${isChecked ? 'is-selected' : ''}`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                      isChecked ? 'bg-[#026fc3] border-[#026fc3] text-white shadow-xs' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span className="flex-1 text-sm font-semibold">{opt}</span>
                </button>
              );
            })}
          </div>

          {!isAnswered && (
            <LiquidButton
              variant="primary"
              size="md"
              disabled={selectedMulti.length === 0}
              onClick={() => {
                const correctList = (question.correct_answer || '')
                  .split(',')
                  .map(s => s.trim().toLowerCase());
                const studentList = selectedMulti.map(s => s.trim().toLowerCase());
                const allCorrect =
                  correctList.length === studentList.length &&
                  studentList.every(s => correctList.includes(s));

                commitAnswer(
                  selectedMulti,
                  allCorrect,
                  allCorrect
                    ? 'All correct options selected!'
                    : `Correct options: ${question.correct_answer}. ${question.explanation || ''}`
                );
              }}
            >
              Submit Choices
            </LiquidButton>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TYPE 3 & 4: TRUE / FALSE & YES / NO                                 */}
      {/* ------------------------------------------------------------------- */}
      {(qType === 'true_false' || qType === 'yes_no') && (
        mode === 'edit' ? (
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-black uppercase text-slate-500 block">Select Correct Answer:</span>
            <div className="grid grid-cols-2 gap-3">
              {(qType === 'true_false' ? ['True', 'False'] : ['Yes', 'No']).map(val => {
                const isSelected = (question.correct_answer || '').toLowerCase() === val.toLowerCase();
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onUpdateQuestion?.({ ...question, correct_answer: val })}
                    className={`py-2.5 px-4 rounded-xl font-bold text-sm border cursor-pointer transition-all flex items-center justify-center gap-2 ${
                      isSelected
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-stone-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-emerald-400'
                    }`}
                  >
                    <span>{val}</span>
                    {isSelected && <span className="font-black">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-4 sm:gap-6 pt-2 pb-1">
            {/* TRUE BUTTON (Green / Teal checkmark icon button) */}
            {(() => {
              const val = qType === 'true_false' ? 'True' : 'Yes';
              const isSelected = String(response?.answer || '').toLowerCase() === val.toLowerCase();
              const isCorrectOption = val.toLowerCase() === (question.correct_answer || '').trim().toLowerCase();

              let buttonStyle = 'bg-white hover:bg-emerald-50 text-emerald-600 border-2 border-emerald-300 hover:border-emerald-500 shadow-xs';
              if (isAnswered) {
                if (isSelected) {
                  buttonStyle = isCorrect
                    ? 'bg-emerald-600 text-white border-2 border-emerald-600 shadow-md ring-4 ring-emerald-500/20'
                    : 'bg-emerald-600 text-white border-2 border-emerald-600';
                } else if (!isCorrect && isCorrectOption) {
                  buttonStyle = 'bg-emerald-50 text-emerald-700 border-2 border-dashed border-emerald-500';
                } else {
                  buttonStyle = 'opacity-35 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed';
                }
              } else if (isSelected) {
                buttonStyle = 'bg-emerald-600 text-white border-2 border-emerald-600 shadow-md ring-4 ring-emerald-500/20';
              }

              return (
                <button
                  type="button"
                  disabled={isAnswered}
                  aria-label={`Select ${val}`}
                  title={val}
                  onClick={() =>
                    commitAnswer(
                      val,
                      isCorrectOption,
                      isCorrectOption
                        ? question.explanation || 'Correct!'
                        : `Incorrect. The correct answer is: ${question.correct_answer}. ${question.explanation || ''}`
                    )
                  }
                  className={`w-24 sm:w-28 h-16 sm:h-18 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none active:scale-95 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 ${buttonStyle}`}
                >
                  <Check className="w-8 h-8 stroke-[3.2]" />
                  <span className="sr-only">{val}</span>
                </button>
              );
            })()}

            {/* FALSE BUTTON (Coral / Red cross icon button) */}
            {(() => {
              const val = qType === 'true_false' ? 'False' : 'No';
              const isSelected = String(response?.answer || '').toLowerCase() === val.toLowerCase();
              const isCorrectOption = val.toLowerCase() === (question.correct_answer || '').trim().toLowerCase();

              let buttonStyle = 'bg-white hover:bg-rose-50 text-rose-600 border-2 border-rose-300 hover:border-rose-500 shadow-xs';
              if (isAnswered) {
                if (isSelected) {
                  buttonStyle = isCorrect
                    ? 'bg-rose-600 text-white border-2 border-rose-600 shadow-md ring-4 ring-rose-500/20'
                    : 'bg-rose-600 text-white border-2 border-rose-600';
                } else if (!isCorrect && isCorrectOption) {
                  buttonStyle = 'bg-rose-50 text-rose-700 border-2 border-dashed border-rose-500';
                } else {
                  buttonStyle = 'opacity-35 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed';
                }
              } else if (isSelected) {
                buttonStyle = 'bg-rose-600 text-white border-2 border-rose-600 shadow-md ring-4 ring-rose-500/20';
              }

              return (
                <button
                  type="button"
                  disabled={isAnswered}
                  aria-label={`Select ${val}`}
                  title={val}
                  onClick={() =>
                    commitAnswer(
                      val,
                      isCorrectOption,
                      isCorrectOption
                        ? question.explanation || 'Correct!'
                        : `Incorrect. The correct answer is: ${question.correct_answer}. ${question.explanation || ''}`
                    )
                  }
                  className={`w-24 sm:w-28 h-16 sm:h-18 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none active:scale-95 focus:outline-none focus:ring-4 focus:ring-rose-500/30 ${buttonStyle}`}
                >
                  <XCircle className="w-8 h-8 stroke-[2.8]" />
                  <span className="sr-only">{val}</span>
                </button>
              );
            })()}
          </div>
        )
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TYPE 5: FILL IN THE BLANK                                           */}
      {/* ------------------------------------------------------------------- */}
      {qType === 'fill_blank' && (
        mode === 'edit' ? (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-black uppercase text-slate-500 block">Expected Correct Answer:</span>
            <input
              type="text"
              value={question.correct_answer || ''}
              onChange={e => onUpdateQuestion?.({ ...question, correct_answer: e.target.value })}
              placeholder="e.g. digestive"
              className="w-full p-2.5 text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-stone-900 focus:outline-none focus:border-[#026fc3]"
            />
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="flex gap-2.5">
              <input
                type="text"
                disabled={isAnswered}
                value={fillInput}
                onChange={e => setFillInput(e.target.value)}
                placeholder="Type your answer here..."
                className="flex-1 p-3.5 liquid-input text-sm font-bold placeholder:text-slate-400 placeholder:font-normal"
              />
              {!isAnswered && (
                <LiquidButton
                  variant="primary"
                  size="md"
                  disabled={!fillInput.trim()}
                  onClick={() => {
                    const isMatch =
                      fillInput.trim().toLowerCase() === (question.correct_answer || '').trim().toLowerCase();
                    commitAnswer(
                      fillInput.trim(),
                      isMatch,
                      isMatch
                        ? question.explanation || 'Correct!'
                        : `Expected: "${question.correct_answer}". ${question.explanation || ''}`
                    );
                  }}
                >
                  Check
                </LiquidButton>
              )}
            </div>
          </div>
        )
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TYPE 6: SENTENCE & WORD REORDERING                                  */}
      {/* ------------------------------------------------------------------- */}
      {(qType === 'sentence_reordering' || qType === 'word_ordering' || qType === 'sentence_builder') && (
        mode === 'edit' ? (
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-black uppercase text-slate-500 block">
              Full Target Sentence (in correct sequence):
            </span>
            <input
              type="text"
              value={question.correct_answer || (Array.isArray(question.options) ? question.options.join(' ') : '')}
              onChange={e => {
                const fullSentence = e.target.value;
                const words = fullSentence.trim().split(/\s+/).filter(Boolean);
                onUpdateQuestion?.({
                  ...question,
                  correct_answer: fullSentence,
                  options: words
                });
              }}
              placeholder="e.g. Sarah likes tea every day"
              className="w-full p-2.5 text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:border-[#026fc3]"
            />
            <span className="text-[11px] text-slate-400 font-medium block">
              Word chips available to student:
            </span>
            <div className="word-bank">
              {(question.correct_answer || (Array.isArray(question.options) ? question.options.join(' ') : ''))
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .map((w, i) => (
                  <span
                    key={i}
                    className="word-chip bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 px-2.5 py-1 rounded-full text-xs font-bold"
                  >
                    {w}
                  </span>
                ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <p className="text-xs sm:text-sm text-theme-secondary font-medium">
              Assemble the sentence in the correct order:
            </p>

            {/* AREA 1: Ordered Sentence */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-[#026fc3] uppercase tracking-wider block">
                  Your Ordered Sentence:
                </span>
                {selectedTokens.length > 0 && !isAnswered && (
                  <span className="text-[11px] font-semibold text-slate-500">
                    Tap any word to remove it
                  </span>
                )}
              </div>
              <div className="min-h-[58px] p-3 sm:p-4 rounded-2xl bg-sky-50/70 border-2 border-dashed border-sky-300 flex flex-wrap items-center gap-2 transition-all">
                {selectedTokens.length === 0 ? (
                  <span className="text-xs sm:text-sm text-slate-400 font-medium italic select-none">
                    Tap the words below in order to assemble the sentence...
                  </span>
                ) : (
                  selectedTokens.map((token) => (
                    <LiquidChip
                      key={token.id}
                      text={token.text}
                      isPlaced
                      disabled={isAnswered}
                      onClick={() => {
                        if (isAnswered) return;
                        courseAudio.playClick();
                        setSelectedTokens(prev => prev.filter(t => t.id !== token.id));
                        setSentenceTokens(prev => [...prev, token]);
                      }}
                    />
                  ))
                )}
              </div>
            </div>

            {/* AREA 2: Available Word Bank */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                Available Words:
              </span>
              <div className="min-h-[58px] p-3 sm:p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex flex-wrap items-center gap-2 transition-all">
                {sentenceTokens.length === 0 ? (
                  <div className="text-xs sm:text-sm text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>All words placed! Click "Submit Sentence" below.</span>
                  </div>
                ) : (
                  sentenceTokens.map((token) => (
                    <LiquidChip
                      key={token.id}
                      text={token.text}
                      disabled={isAnswered}
                      onClick={() => {
                        if (isAnswered) return;
                        courseAudio.playClick();
                        setSelectedTokens(prev => [...prev, token]);
                        setSentenceTokens(prev => prev.filter(t => t.id !== token.id));
                      }}
                    />
                  ))
                )}
              </div>
            </div>

            {!isAnswered && (
              <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {sentenceTokens.length > 0 ? (
                    <span>{sentenceTokens.length} word{sentenceTokens.length > 1 ? 's' : ''} remaining to place</span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Ready to submit!
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {selectedTokens.length > 0 && (
                    <LiquidButton
                      variant="secondary"
                      size="sm"
                      icon={<Undo2 className="w-3.5 h-3.5" />}
                      onClick={() => {
                        courseAudio.playClick();
                        const lastToken = selectedTokens[selectedTokens.length - 1];
                        setSelectedTokens(prev => prev.slice(0, -1));
                        setSentenceTokens(prev => [...prev, lastToken]);
                      }}
                    >
                      Undo
                    </LiquidButton>
                  )}

                  {selectedTokens.length > 0 && (
                    <LiquidButton
                      variant="secondary"
                      size="sm"
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                      onClick={() => {
                        courseAudio.playClick();
                        const all = [...selectedTokens, ...sentenceTokens];
                        const shuffled = [...all].sort(() => 0.5 - Math.random());
                        setSentenceTokens(shuffled);
                        setSelectedTokens([]);
                      }}
                    >
                      Reset
                    </LiquidButton>
                  )}

                  <LiquidButton
                    variant="primary"
                    size="md"
                    disabled={selectedTokens.length === 0}
                    onClick={() => {
                      const studentOrderList = selectedTokens.map(t => t.text.trim());
                      const builtSentence = studentOrderList.join(' ').trim();

                      const expectedOrderList = extractSentenceCorrectOrder(question);
                      const expectedFullSentence = expectedOrderList.length > 0
                        ? expectedOrderList.join(' ').trim()
                        : String(question.correct_answer || '').trim();

                      // 1. Array comparison against correct_order
                      const isArrayMatch = expectedOrderList.length > 0 &&
                        studentOrderList.length === expectedOrderList.length &&
                        studentOrderList.every((word, i) => word.toLowerCase() === expectedOrderList[i].toLowerCase());

                      // 2. Normalized text match
                      const cleanBuilt = cleanTextForComparison(builtSentence);
                      const cleanExpected = cleanTextForComparison(expectedFullSentence);
                      const isStringMatch = Boolean(cleanBuilt) && cleanBuilt === cleanExpected;

                      const isMatch = isArrayMatch || isStringMatch;

                      const feedbackText = isMatch
                        ? (question.explanation || 'Perfect sentence sequence!')
                        : `The correct sentence is: ${expectedFullSentence}. ${question.explanation || ''}`.trim();

                      commitAnswer(builtSentence, isMatch, feedbackText);
                    }}
                  >
                    Submit Sentence
                  </LiquidButton>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TYPE 7: ODD ONE OUT                                                 */}
      {/* ------------------------------------------------------------------- */}
      {qType === 'odd_one_out' && (
        <div className="space-y-2 pt-1">
          <p className="text-xs text-theme-secondary font-medium">
            Identify the item that does not belong:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {optionsList.map((opt, oIdx) => {
              const isSelected = response?.answer === opt;
              const isCorrectAnswer =
                opt.trim().toLowerCase() === (question.correct_answer || '').trim().toLowerCase();

              return (
                <LiquidOption
                  key={oIdx}
                  text={opt}
                  isSelected={isSelected}
                  isAnswered={isAnswered}
                  isCorrect={isCorrect}
                  isCorrectOption={isCorrectAnswer}
                  disabled={isAnswered}
                  onClick={() =>
                    commitAnswer(
                      opt,
                      isCorrectAnswer,
                      isCorrectAnswer
                        ? question.explanation || 'Spot on! That is the odd one out.'
                        : `The odd one out is: ${question.correct_answer}. ${question.explanation || ''}`
                    )
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TYPE 8: WH QUESTION & READING COMPREHENSION                         */}
      {/* ------------------------------------------------------------------- */}
      {(qType === 'wh_question' || (qType === 'comprehension' && normalizedOptions.length === 0)) && (
        <div className="space-y-3 pt-1">
          {whType && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 shadow-2xs">
                WH QUESTION: {String(whType).toUpperCase()}
              </span>
              <span className="text-xs text-theme-secondary font-medium">
                Answer in your own words based on the reading passage.
              </span>
            </div>
          )}

          <div className="space-y-2.5">
            <textarea
              rows={2}
              disabled={isAnswered || isEvaluatingAi}
              value={fillInput}
              onChange={e => setFillInput(e.target.value)}
              placeholder="Type your complete answer here..."
              className="w-full p-3.5 liquid-textarea text-sm font-medium leading-relaxed placeholder:text-slate-400"
            />

            {aiError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{aiError}</span>
              </div>
            )}

            {!isAnswered && (
              <div className="flex items-center gap-2">
                <LiquidButton
                  variant="primary"
                  size="md"
                  disabled={!fillInput.trim() || isEvaluatingAi}
                  loading={isEvaluatingAi}
                  onClick={handleEvaluateWhQuestion}
                  icon={<Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                >
                  {isEvaluatingAi ? 'Evaluating Answer...' : 'Submit Answer'}
                </LiquidButton>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TYPE 9A: SHORT ANSWER (CONTROLLED ONE-WORD FILL-IN-THE-BLANK TASK) */}
      {/* ------------------------------------------------------------------- */}
      {qType === 'short_answer' && (
        mode === 'edit' ? (
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-[#172033]">
            <div>
              <span className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                Expected Word (One word answer key):
              </span>
              <input
                type="text"
                value={question.expected_answer || question.correct_answer || ''}
                onChange={e => {
                  const val = e.target.value;
                  onUpdateQuestion?.({
                    ...question,
                    correct_answer: val,
                    expected_answer: val,
                    acceptable_answers: question.acceptable_answers || [val]
                  });
                }}
                placeholder="e.g. tunnel"
                className="w-full p-2.5 text-sm font-bold rounded-xl border border-slate-300 bg-white text-[#172033] focus:outline-none focus:border-[#026fc3]"
              />
              <span className="text-[10px] text-slate-400 font-medium block mt-1">
                Tip: Enter the exact missing word. Question text should contain an underscore blank (e.g. "The train entered a long ________.")
              </span>
            </div>
            <div>
              <span className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                Alternative Accepted Answers (comma-separated, optional):
              </span>
              <input
                type="text"
                value={Array.isArray(question.acceptable_answers) ? question.acceptable_answers.join(', ') : ''}
                onChange={e => {
                  const list = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  onUpdateQuestion?.({
                    ...question,
                    acceptable_answers: list
                  });
                }}
                placeholder="e.g. color, colour"
                className="w-full p-2.5 text-xs font-medium rounded-xl border border-slate-300 bg-white text-[#172033] focus:outline-none focus:border-[#026fc3]"
              />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                Review Explanation (shown after submission):
              </span>
              <textarea
                rows={2}
                value={question.explanation || ''}
                onChange={e => onUpdateQuestion?.({ ...question, explanation: e.target.value })}
                placeholder="e.g. The transcript confirms the train entered the tunnel."
                className="w-full p-2.5 text-xs font-medium rounded-xl border border-slate-300 bg-white text-[#172033] focus:outline-none focus:border-[#026fc3]"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  disabled={isAnswered}
                  value={shortAnswerInput}
                  onChange={e => {
                    setShortAnswerInput(e.target.value);
                    if (aiError) setAiError(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !isAnswered && shortAnswerInput.trim()) {
                      e.preventDefault();
                      handleEvaluateShortAnswer();
                    }
                  }}
                  placeholder="Type missing word (one word only)..."
                  aria-label="One word answer"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-[#026fc3] focus:ring-2 focus:ring-[#026fc3]/20 bg-white text-[#172033] text-base font-semibold placeholder:text-slate-400 placeholder:font-normal outline-none transition-all"
                />
              </div>

              {!isAnswered && (
                <button
                  type="button"
                  disabled={!shortAnswerInput.trim()}
                  onClick={handleEvaluateShortAnswer}
                  className="px-5 py-3 rounded-xl bg-[#026fc3] hover:bg-[#025aa0] active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-black transition-all cursor-pointer shadow-xs shrink-0 flex items-center justify-center gap-1.5"
                >
                  <span>Check Word</span>
                </button>
              )}
            </div>

            {aiError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="font-semibold">{aiError}</span>
              </div>
            )}
          </div>
        )
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TYPE 9B: ESSAY / EXTENDED RESPONSE                                  */}
      {/* ------------------------------------------------------------------- */}
      {qType === 'essay' && (
        <div className="space-y-3 pt-1">
          <textarea
            rows={5}
            disabled={isAnswered || isEvaluatingAi}
            value={openEndedText}
            onChange={e => setOpenEndedText(e.target.value)}
            placeholder="Write your essay response here (at least 50 words)..."
            className="w-full p-3.5 liquid-textarea text-base font-sans leading-relaxed placeholder:text-slate-400"
          />

          {aiError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{aiError}</span>
            </div>
          )}

          {!isAnswered && (
            <LiquidButton
              variant="primary"
              size="md"
              disabled={!openEndedText.trim() || isEvaluatingAi}
              loading={isEvaluatingAi}
              onClick={handleEvaluateOpenEnded}
              icon={<Sparkles className="w-3.5 h-3.5 text-amber-300" />}
            >
              {isEvaluatingAi ? 'AI Evaluating response...' : 'Submit for AI Evaluation'}
            </LiquidButton>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TYPE 9C: STORY / CHRONOLOGICAL ORDERING                             */}
      {/* ------------------------------------------------------------------- */}
      {qType === 'ordering' && (
        <DraggableOrderingQuestion
          question={question}
          isLocked={isAnswered}
          isSubmitting={isEvaluatingAi}
          selectedAnswer={typeof response?.answer === 'string' ? response.answer : undefined}
          feedback={response ? { isCorrect, showExplanation: isAnswered, selected: String(response.answer || '') } : undefined}
          onEvaluateAnswer={(q, ans) => {
            const canonicalOrder = (q.options || []).join('|||');
            const isMatch = ans.trim() === canonicalOrder.trim();
            commitAnswer(
              ans,
              isMatch,
              isMatch ? (q.explanation || 'Chronological order is correct!') : `Chronological sequence was incorrect. ${q.explanation || ''}`
            );
          }}
        />
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TYPE 9D: CLOZE READING PASSAGE WITH INLINE BLANKS                    */}
      {/* ------------------------------------------------------------------- */}
      {qType === 'cloze_passage' && (
        <ClozePassageQuestion
          question={question}
          isLocked={isAnswered}
          isSubmitting={isEvaluatingAi}
          selectedAnswer={typeof response?.answer === 'string' ? response.answer : undefined}
          feedback={response ? { isCorrect, showExplanation: isAnswered } : null}
          onEvaluateAnswer={(q, ans) => {
            commitAnswer(ans, true, q.explanation || 'Cloze passage completed!');
          }}
        />
      )}

      {/* ------------------------------------------------------------------- */}
      {/* FEEDBACK BANNER (STRICTLY ISOLATED PER QUESTION)                    */}
      {/* ------------------------------------------------------------------- */}
      {isAnswered && (
        <div
          className={`p-4 rounded-xl text-xs leading-relaxed space-y-2 animate-in fade-in duration-150 ${
            isCorrect
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
              : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
          }`}
        >
          <div className="flex items-center justify-between font-black">
            <span className="flex items-center gap-1.5">
              {isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
              <span>{isCorrect ? 'Correct!' : (qType === 'essay' || qType === 'short_answer' ? 'Needs Review' : 'Incorrect')}</span>
            </span>
            <span className="font-mono">
              Score: {response?.score} / {response?.maxScore} pts
            </span>
          </div>

          <p className="font-medium">{response?.feedback}</p>

          {/* Language Feedback Coaching for WH / ESL questions */}
          {response?.languageFeedback && (
            <div className="p-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 text-xs flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Language Coaching: </span>
                <span>{response.languageFeedback}</span>
              </div>
            </div>
          )}

          {/* AI Strengths & Improvements */}
          {response?.strengths && response.strengths.length > 0 && (
            <div className="pt-1 text-[11px]">
              <span className="font-bold text-emerald-700 dark:text-emerald-300">Strengths: </span>
              <span>{response.strengths.join(' • ')}</span>
            </div>
          )}
          {response?.improvements && response.improvements.length > 0 && (
            <div className="text-[11px]">
              <span className="font-bold text-amber-700 dark:text-amber-300">Areas to improve: </span>
              <span>{response.improvements.join(' • ')}</span>
            </div>
          )}
        </div>
      )}

      {/* EDIT MODE: EXPLANATION / FEEDBACK INPUT */}
      {mode === 'edit' && (
        <div className="pt-2 border-t border-[var(--theme-border-subtle)] space-y-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Explanation / Feedback for Students (shown after answering):
          </label>
          <input
            type="text"
            value={question.explanation || ''}
            onChange={e => onUpdateQuestion?.({ ...question, explanation: e.target.value })}
            placeholder="e.g. Water is essential because it aids digestion and transports nutrients..."
            className="w-full text-xs font-medium text-slate-700 dark:text-slate-300 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:border-[#026fc3] focus:outline-none py-1"
          />
        </div>
      )}
    </div>
  );
};
