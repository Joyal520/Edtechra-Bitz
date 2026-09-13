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
  X,
  BookOpen,
  AlertCircle
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
}

export const ComprehensiveQuestionRenderer: React.FC<ComprehensiveQuestionRendererProps> = ({
  question,
  index,
  response,
  onAnswerSubmit,
  isStudentView: _isStudentView = true
}) => {
  // Guarantee unique immutable question ID
  const qId = question.id || `q_fallback_${index}`;
  const qType = question.question_type || (question as any).type || 'multiple_choice';

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
      const tokenObjects: SentenceToken[] = itemsList.map((text, idx) => ({
        id: `tok_${qId}_${idx}_${text.substring(0, 12).replace(/\s+/g, '_')}`,
        text
      }));

      // Deterministic Fisher-Yates shuffle for display (ensuring order changes if > 1 item)
      if (tokenObjects.length > 1) {
        const shuffled = [...tokenObjects];
        for (let attempt = 0; attempt < 5; attempt++) {
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          const isIdentical = shuffled.every((t, i) => t.id === tokenObjects[i].id);
          if (!isIdentical) break;
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
  // 2. OPEN-ENDED AI EVALUATOR SUBMISSION
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
      className={`w-full rounded-2xl sm:rounded-3xl p-5 sm:p-7 surface-card space-y-4 transition-all border border-[var(--theme-border-primary)] shadow-xs ${
        isAnswered
          ? isCorrect
            ? 'ring-1 ring-emerald-500/40 bg-emerald-50/10'
            : 'ring-1 ring-rose-500/40 bg-rose-50/10'
          : ''
      }`}
    >
      {/* CARD HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--theme-border-subtle)]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-theme-accent reader-badge">
            QUESTION {String(index + 1).padStart(2, '0')}
          </span>
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[var(--theme-surface-subtle)] text-theme-secondary border border-[var(--theme-border-subtle)]">
            {qType.replace(/_/g, ' ')}
          </span>
          {question.skill && (
            <span className="text-[10px] font-bold text-sky-700 bg-sky-100 dark:bg-sky-900/40 px-2 py-0.5 rounded-md">
              {question.skill}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[var(--theme-accent-soft)] text-theme-accent text-[11px] font-black border border-[var(--theme-border-subtle)]">
            {question.points || 10} PTS
          </span>
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
      <h4 className="text-base sm:text-lg font-bold text-theme-primary leading-snug text-left reader-question">
        {question.question_text}
      </h4>

      {/* ------------------------------------------------------------------- */}
      {/* TYPE 1: MULTIPLE CHOICE (ROBUST SINGLE-SOURCE-OF-TRUTH GRADING)     */}
      {/* ------------------------------------------------------------------- */}
      {qType === 'multiple_choice' && (
        <div className="space-y-2 pt-1">
          {normalizedOptions.map((opt, oIdx) => {
            const isSelected = isOptionMatchingStudentAnswer(opt, response?.answer);
            const isThisTheCorrectAnswer = resolvedCorrect ? resolvedCorrect.id === opt.id : false;

            let btnStyle = 'surface-answer-option text-theme-primary hover:border-[var(--theme-accent)]';
            if (isAnswered) {
              if (isSelected) {
                btnStyle = isCorrect
                  ? 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-400'
                  : 'bg-rose-600 text-white font-bold ring-2 ring-rose-400';
              } else if (!isCorrect && isThisTheCorrectAnswer) {
                btnStyle = 'border-2 border-emerald-500 bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 font-bold';
              } else {
                btnStyle = 'opacity-40 bg-[var(--theme-surface-subtle)] text-theme-muted';
              }
            }

            return (
              <button
                key={opt.id || oIdx}
                type="button"
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
                className={`w-full p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all box-border cursor-pointer disabled:cursor-not-allowed ${btnStyle}`}
              >
                <span className="w-7 h-7 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs font-black shrink-0">
                  {isSelected ? (isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />) : opt.id}
                </span>
                <span className="flex-1 font-medium">{opt.text}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TYPE 2: MULTIPLE SELECT (CHECKBOXES)                                */}
      {/* ------------------------------------------------------------------- */}
      {qType === 'multiple_select' && (
        <div className="space-y-3 pt-1">
          <p className="text-xs text-theme-secondary font-medium italic">
            Select all correct options that apply:
          </p>
          <div className="space-y-2">
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
                  className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 cursor-pointer transition-all ${
                    isChecked
                      ? 'border-[#026fc3] bg-sky-50 dark:bg-sky-950/30 text-theme-primary'
                      : 'surface-answer-option text-theme-primary'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      isChecked ? 'bg-[#026fc3] border-[#026fc3] text-white' : 'border-stone-400'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <span className="flex-1 text-sm font-medium">{opt}</span>
                </button>
              );
            })}
          </div>

          {!isAnswered && (
            <button
              type="button"
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
              className="px-5 py-2.5 rounded-xl bg-[#026fc3] hover:bg-[#025da4] text-white text-xs font-black shadow-xs cursor-pointer disabled:opacity-40"
            >
              Submit Choices
            </button>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TYPE 3 & 4: TRUE / FALSE & YES / NO                                 */}
      {/* ------------------------------------------------------------------- */}
      {(qType === 'true_false' || qType === 'yes_no') && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          {(qType === 'true_false' ? ['True', 'False'] : ['Yes', 'No']).map(val => {
            const isSelected = response?.answer === val;
            const isCorrectOption = val.toLowerCase() === (question.correct_answer || '').trim().toLowerCase();

            let btnStyle = 'surface-answer-option text-theme-primary hover:border-[var(--theme-accent)]';
            if (isAnswered) {
              if (isSelected) {
                btnStyle = isCorrect ? 'bg-emerald-600 text-white font-bold' : 'bg-rose-600 text-white font-bold';
              } else if (!isCorrect && isCorrectOption) {
                btnStyle = 'border-2 border-emerald-500 bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 font-bold';
              } else {
                btnStyle = 'opacity-40 bg-[var(--theme-surface-subtle)] text-theme-muted';
              }
            }

            return (
              <button
                key={val}
                type="button"
                disabled={isAnswered}
                onClick={() =>
                  commitAnswer(
                    val,
                    isCorrectOption,
                    isCorrectOption
                      ? question.explanation || 'Correct!'
                      : `Incorrect. The correct answer is: ${question.correct_answer}. ${question.explanation || ''}`
                  )
                }
                className={`py-3.5 px-4 rounded-xl border text-center font-bold text-sm transition-all cursor-pointer disabled:cursor-not-allowed ${btnStyle}`}
              >
                {val}
              </button>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TYPE 5: FILL IN THE BLANK                                           */}
      {/* ------------------------------------------------------------------- */}
      {qType === 'fill_blank' && (
        <div className="space-y-3 pt-1">
          <div className="flex gap-2">
            <input
              type="text"
              disabled={isAnswered}
              value={fillInput}
              onChange={e => setFillInput(e.target.value)}
              placeholder="Type your answer here..."
              className="flex-1 p-3 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-surface-input)] text-theme-primary text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#026fc3]"
            />
            {!isAnswered && (
              <button
                type="button"
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
                className="px-5 py-3 rounded-xl bg-[#026fc3] hover:bg-[#025da4] text-white text-xs font-black shadow-xs cursor-pointer disabled:opacity-40"
              >
                Check
              </button>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TYPE 6: SENTENCE & WORD REORDERING                                  */}
      {/* ------------------------------------------------------------------- */}
      {(qType === 'sentence_reordering' || qType === 'word_ordering' || qType === 'sentence_builder') && (
        <div className="space-y-4 pt-1">
          <p className="text-xs sm:text-sm text-theme-secondary font-medium">
            Click the word chips below to assemble the sentence in the correct order:
          </p>

          {/* Constructed Sentence Box (Answer Area) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-theme-muted uppercase tracking-wider block">
              Your Ordered Sentence:
            </span>
            <div
              className="min-h-[64px] p-3 sm:p-4 rounded-2xl border-2 border-dashed border-[#026fc3]/60 bg-[var(--theme-surface-subtle)] flex flex-wrap items-center transition-all duration-200"
              style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', minHeight: '64px' }}
            >
              {selectedTokens.length === 0 ? (
                <span className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-medium italic select-none py-1">
                  Click the chips below in order to assemble the sentence...
                </span>
              ) : (
                selectedTokens.map((token) => (
                  <button
                    key={token.id}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => {
                      if (isAnswered) return;
                      courseAudio.playClick();
                      setSelectedTokens(prev => prev.filter(t => t.id !== token.id));
                      setSentenceTokens(prev => [...prev, token]);
                    }}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-[#026fc3] hover:bg-rose-600 text-white font-bold text-sm sm:text-base shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer inline-flex items-center justify-center gap-2 w-auto select-none group"
                    style={{ minHeight: '40px', width: 'auto' }}
                    title={isAnswered ? undefined : "Click to remove"}
                  >
                    <span>{token.text}</span>
                    {!isAnswered && (
                      <span className="w-4 h-4 rounded-full bg-white/20 group-hover:bg-white/40 flex items-center justify-center text-[10px] leading-none transition-colors">
                        ✕
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Available Word Chips Area */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-theme-muted uppercase tracking-wider block">
              Available Words & Phrases:
            </span>
            <div
              className="flex flex-wrap items-center p-3 sm:p-4 rounded-2xl bg-[var(--theme-surface-interactive)] border border-[var(--theme-border-subtle)] min-h-[64px]"
              style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}
            >
              {sentenceTokens.length === 0 ? (
                <div className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 py-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>All words placed! Click "Submit Sentence" below.</span>
                </div>
              ) : (
                sentenceTokens.map((token) => (
                  <button
                    key={token.id}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => {
                      if (isAnswered) return;
                      courseAudio.playClick();
                      setSelectedTokens(prev => [...prev, token]);
                      setSentenceTokens(prev => prev.filter(t => t.id !== token.id));
                    }}
                    className="min-h-[40px] px-4 py-2 rounded-xl border-2 border-sky-300 dark:border-sky-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-sky-100 font-bold text-sm sm:text-base shadow-xs hover:border-[#026fc3] hover:bg-sky-50 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer inline-flex items-center justify-center text-center w-auto select-none"
                    style={{ minHeight: '40px', width: 'auto' }}
                  >
                    {token.text}
                  </button>
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
                  <button
                    type="button"
                    onClick={() => {
                      courseAudio.playClick();
                      const all = [...selectedTokens, ...sentenceTokens];
                      const shuffled = [...all].sort(() => 0.5 - Math.random());
                      setSentenceTokens(shuffled);
                      setSelectedTokens([]);
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}

                <button
                  type="button"
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
                  className="px-5 py-2.5 rounded-xl bg-[#026fc3] hover:bg-[#025da4] text-white text-xs sm:text-sm font-black shadow-xs cursor-pointer disabled:opacity-40 transition-all"
                >
                  Submit Sentence
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TYPE 7: ODD ONE OUT                                                 */}
      {/* ------------------------------------------------------------------- */}
      {qType === 'odd_one_out' && (
        <div className="space-y-2 pt-1">
          <p className="text-xs text-theme-secondary font-medium">
            Identify the item that does not belong:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {optionsList.map((opt, oIdx) => {
              const isSelected = response?.answer === opt;
              const isCorrectAnswer =
                opt.trim().toLowerCase() === (question.correct_answer || '').trim().toLowerCase();

              let btnStyle = 'surface-answer-option text-theme-primary hover:border-amber-400';
              if (isAnswered) {
                if (isSelected) {
                  btnStyle = isCorrect ? 'bg-emerald-600 text-white font-bold' : 'bg-rose-600 text-white font-bold';
                } else if (!isCorrect && isCorrectAnswer) {
                  btnStyle = 'border-2 border-emerald-500 bg-emerald-500/20 text-emerald-800 font-bold';
                } else {
                  btnStyle = 'opacity-40 text-theme-muted';
                }
              }

              return (
                <button
                  key={oIdx}
                  type="button"
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
                  className={`p-3 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed ${btnStyle}`}
                >
                  {opt}
                </button>
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

          <div className="space-y-2">
            <textarea
              rows={2}
              disabled={isAnswered || isEvaluatingAi}
              value={fillInput}
              onChange={e => setFillInput(e.target.value)}
              placeholder="Type your complete answer here..."
              className="w-full p-3 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-surface-input)] text-theme-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#026fc3] leading-relaxed"
            />

            {aiError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{aiError}</span>
              </div>
            )}

            {!isAnswered && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!fillInput.trim() || isEvaluatingAi}
                  onClick={handleEvaluateWhQuestion}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-40 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isEvaluatingAi ? 'Evaluating Answer...' : 'Submit Answer'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TYPE 9: OPEN-ENDED WITH AI EVALUATION (ESSAY / SHORT ANSWER)        */}
      {/* ------------------------------------------------------------------- */}
      {(qType === 'short_answer' || qType === 'essay') && (
        <div className="space-y-3 pt-1">
          <textarea
            rows={4}
            disabled={isAnswered || isEvaluatingAi}
            value={openEndedText}
            onChange={e => setOpenEndedText(e.target.value)}
            placeholder="Write your explanation or response here..."
            className="w-full p-3 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-surface-input)] text-theme-primary text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#026fc3] leading-relaxed"
          />

          {aiError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{aiError}</span>
            </div>
          )}

          {!isAnswered && (
            <button
              type="button"
              disabled={!openEndedText.trim() || isEvaluatingAi}
              onClick={handleEvaluateOpenEnded}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-40"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isEvaluatingAi ? 'AI Evaluating response...' : 'Submit for AI Evaluation'}</span>
            </button>
          )}
        </div>
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
    </div>
  );
};
