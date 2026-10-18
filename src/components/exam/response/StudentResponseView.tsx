// ============================================================================
// EDTECHRA STUDENT RESPONSE VIEW (POLL / SURVEY / FEEDBACK)
// Mobile-First, Distraction-Free Student Experience (Parts 11 & 12)
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Shield,
  Calendar,
  Star,
  ChevronUp,
  ChevronDown,
  Send,
  AlertCircle,
  BarChart3,
  Edit3,
  Clock,
} from 'lucide-react';
import { CanonicalAssessmentV2 } from '../shared/ExamSchema';
import {
  extractResponseStudioFromCanonical,
  YES_NO_DEFAULT_OPTIONS,
  LIKERT_DEFAULT_OPTIONS,
} from './responseStudioSchema';
import { classroomExamService } from '../../../services/classroomExamService';

interface StudentResponseViewProps {
  examId: string;
  classroomId: string;
  assessment: CanonicalAssessmentV2;
  existingResult?: any | null;
  onExit?: () => void;
  onSubmitted?: (result: any) => void;
}

export const StudentResponseView: React.FC<StudentResponseViewProps> = ({
  examId,
  classroomId,
  assessment,
  existingResult = null,
  onExit,
  onSubmitted,
}) => {
  const { config, payload } = useMemo(
    () => extractResponseStudioFromCanonical(assessment),
    [assessment]
  );

  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    if (existingResult?.answers && typeof existingResult.answers === 'object') {
      return { ...existingResult.answers };
    }
    // Pre-initialize ranking questions with their initial options order
    const init: Record<string, any> = {};
    payload.questions.forEach((q) => {
      if (q.type === 'ranking' && Array.isArray(q.options)) {
        init[q.id] = [...q.options];
      }
    });
    return init;
  });

  const [hasSubmitted, setHasSubmitted] = useState<boolean>(Boolean(existingResult));
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [publicPollResults, setPublicPollResults] = useState<Array<{ id: string; answers: Record<string, any> }>>([]);
  const [loadingPollResults, setLoadingPollResults] = useState<boolean>(false);

  const allowChange = Boolean(config.allowChangeResponse);
  const allowSeeResults =
    payload.type === 'poll' ? config.allowSeeResults !== false : Boolean(config.allowSeeResults);

  const deadlineDate = useMemo(() => {
    const raw = config.deadline || assessment.exam?.endsAt;
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [config.deadline, assessment.exam?.endsAt]);

  const isExpired = Boolean(deadlineDate && deadlineDate.getTime() < Date.now());

  // Load live poll results when submitted and allowSeeResults is enabled
  useEffect(() => {
    if (!hasSubmitted || !allowSeeResults || !examId) return;
    let mounted = true;
    setLoadingPollResults(true);
    classroomExamService
      .getSurveyPublicResults(examId, classroomId)
      .then((rows) => {
        if (mounted) {
          setPublicPollResults(rows || []);
        }
      })
      .finally(() => {
        if (mounted) setLoadingPollResults(false);
      });
    return () => {
      mounted = false;
    };
  }, [hasSubmitted, allowSeeResults, examId, classroomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isExpired) {
      setErrorMsg('The response deadline for this item has passed.');
      return;
    }

    // Validate required questions
    for (let i = 0; i < payload.questions.length; i++) {
      const q = payload.questions[i];
      if (!q.required) continue;
      const val = answers[q.id];
      const isEmpty =
        val === undefined ||
        val === null ||
        (typeof val === 'string' && !val.trim()) ||
        (Array.isArray(val) && val.length === 0);
      if (isEmpty) {
        setErrorMsg(`Please answer Question #${i + 1}: "${q.question}"`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await classroomExamService.submitSurveyResponse({
        examId,
        classroomId,
        answers,
        allowChangeResponse: allowChange || isEditingExisting,
      });

      if (res.error) {
        setErrorMsg(res.error);
        return;
      }

      setHasSubmitted(true);
      setIsEditingExisting(false);
      if (onSubmitted) {
        onSubmitted(res.data);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit your response.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const badgeColors = {
    poll: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    survey: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    feedback: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  };

  // ============================================================================
  // SUBMITTED CONFIRMATION & LIVE POLL RESULTS SCREEN
  // ============================================================================
  if (hasSubmitted && !isEditingExisting) {
    return (
      <div className="min-h-screen bg-[#060d1f] text-white px-4 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-gradient-to-br from-[#0e2439] to-[#0a1628] border border-teal-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span
                className={`inline-block px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider ${
                  badgeColors[payload.type]
                }`}
              >
                {payload.type.toUpperCase()} SUBMITTED
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white">{payload.title}</h1>
              <p className="text-base text-slate-300 max-w-md mx-auto">
                {assessment.surveySettings?.thankYouMessage ||
                  'Your response has been recorded. Thank you for participating!'}
              </p>
            </div>

            {payload.anonymous && (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                <Shield className="w-4 h-4" />
                <span>Submitted anonymously — your name is hidden</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {allowChange && !isExpired && (
                <button
                  type="button"
                  onClick={() => setIsEditingExisting(true)}
                  className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-black text-white flex items-center gap-2 transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Change My Response</span>
                </button>
              )}

              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  className="px-6 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Classroom</span>
                </button>
              )}
            </div>
          </div>

          {/* Live Poll Results Chart (when allowSeeResults is ON) */}
          {allowSeeResults && (
            <div className="bg-[#0b1530] border border-blue-900/60 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-black text-white">Live Class Results</h2>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {publicPollResults.length}{' '}
                  {publicPollResults.length === 1 ? 'Response' : 'Responses'}
                </span>
              </div>

              {loadingPollResults ? (
                <p className="text-sm text-slate-400 py-4 text-center">Loading live results...</p>
              ) : (
                <div className="space-y-6">
                  {payload.questions.map((q, qIdx) => {
                    const totalVotes = publicPollResults.length || 1;
                    const optionsList =
                      q.options && q.options.length > 0
                        ? q.options
                        : q.type === 'yes_no'
                        ? YES_NO_DEFAULT_OPTIONS
                        : q.type === 'rating'
                        ? Array.from({ length: q.scale || 5 }, (_, i) => `${i + 1} ★`)
                        : [];

                    if (optionsList.length === 0) return null;

                    return (
                      <div key={q.id} className="space-y-3">
                        <div className="text-sm font-black text-white">
                          {qIdx + 1}. {q.question}
                        </div>
                        <div className="space-y-2.5">
                          {optionsList.map((opt, oIdx) => {
                            const count = publicPollResults.filter((r) => {
                              const ans = r.answers?.[q.id];
                              if (q.type === 'rating') {
                                return Number(ans) === oIdx + 1;
                              }
                              if (Array.isArray(ans)) {
                                return ans.includes(opt);
                              }
                              return String(ans) === String(opt);
                            }).length;
                            const pct =
                              publicPollResults.length > 0
                                ? Math.round((count / totalVotes) * 100)
                                : 0;

                            return (
                              <div key={oIdx} className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-bold">
                                  <span className="text-slate-200">{opt}</span>
                                  <span className="text-cyan-300">
                                    {pct}% ({count})
                                  </span>
                                </div>
                                <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                                  <div
                                    className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // ACTIVE STUDENT RESPONSE FORM (MOBILE-FIRST)
  // ============================================================================
  return (
    <div className="min-h-screen bg-[#060d1f] text-white px-4 py-6 sm:py-10">
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
        {/* Top Bar */}
        {onExit && (
          <div>
            <button
              type="button"
              onClick={onExit}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold inline-flex items-center gap-2 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Classroom</span>
            </button>
          </div>
        )}

        {/* Header Card */}
        <div className="bg-gradient-to-br from-[#0e223d] to-[#0a1628] border border-teal-500/40 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider ${
                badgeColors[payload.type]
              }`}
            >
              {payload.type.toUpperCase()}
            </span>

            <span className="text-xs font-bold text-slate-300">
              {payload.questions.length}{' '}
              {payload.questions.length === 1 ? 'Question' : 'Questions'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
            {payload.title}
          </h1>

          {payload.description && (
            <p className="text-base text-slate-200 leading-relaxed">{payload.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
            {payload.anonymous && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                <Shield className="w-4 h-4" />
                <span>Your response is anonymous</span>
              </div>
            )}

            {deadlineDate && (
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold ${
                  isExpired
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>
                  {isExpired
                    ? `Deadline passed (${deadlineDate.toLocaleString()})`
                    : `Deadline: ${deadlineDate.toLocaleString()}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {isExpired && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-sm font-bold flex items-center gap-3">
            <Clock className="w-5 h-5 text-rose-400 shrink-0" />
            <span>This {payload.type} is closed because the submission deadline has passed.</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-sm font-bold flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Questions List */}
        {payload.questions.map((q, qIdx) => {
          const currentVal = answers[q.id];

          return (
            <div
              key={q.id}
              className="bg-[#0b1530] border border-blue-900/60 rounded-3xl p-6 sm:p-7 space-y-4 shadow-lg"
            >
              <div className="text-base font-black text-white leading-snug">
                <span className="text-teal-400 mr-2">{qIdx + 1}.</span>
                {q.question}
                {q.required && <span className="text-rose-400 ml-1">*</span>}
              </div>

              {/* SINGLE CHOICE */}
              {q.type === 'single_choice' && (
                <div className="space-y-2.5 pt-1">
                  {(q.options || []).map((opt, oIdx) => {
                    const selected = currentVal === opt;
                    return (
                      <button
                        key={oIdx}
                        type="button"
                        disabled={isExpired}
                        onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                        className={`w-full min-h-[48px] p-3.5 rounded-2xl border text-left text-base font-medium flex items-center gap-3 transition-all ${
                          selected
                            ? 'bg-teal-500/20 border-teal-400 text-white shadow-sm'
                            : 'bg-slate-900/80 border-slate-800 text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            selected ? 'border-teal-400' : 'border-slate-500'
                          }`}
                        >
                          {selected && <div className="w-2.5 h-2.5 rounded-full bg-teal-400" />}
                        </div>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* MULTIPLE SELECTION */}
              {q.type === 'multiple_selection' && (
                <div className="space-y-2.5 pt-1">
                  {(q.options || []).map((opt, oIdx) => {
                    const arr: string[] = Array.isArray(currentVal) ? currentVal : [];
                    const selected = arr.includes(opt);
                    return (
                      <button
                        key={oIdx}
                        type="button"
                        disabled={isExpired}
                        onClick={() => {
                          const next = selected ? arr.filter((x) => x !== opt) : [...arr, opt];
                          setAnswers({ ...answers, [q.id]: next });
                        }}
                        className={`w-full min-h-[48px] p-3.5 rounded-2xl border text-left text-base font-medium flex items-center gap-3 transition-all ${
                          selected
                            ? 'bg-teal-500/20 border-teal-400 text-white shadow-sm'
                            : 'bg-slate-900/80 border-slate-800 text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                            selected
                              ? 'bg-teal-400 border-teal-400 text-slate-950'
                              : 'border-slate-500'
                          }`}
                        >
                          {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* YES / NO */}
              {q.type === 'yes_no' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {(q.options && q.options.length >= 2 ? q.options : YES_NO_DEFAULT_OPTIONS).map(
                    (opt, oIdx) => {
                      const selected = currentVal === opt;
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          disabled={isExpired}
                          onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                          className={`min-h-[54px] p-4 rounded-2xl border text-base font-black flex items-center justify-center gap-2 transition-all ${
                            selected
                              ? 'bg-teal-500 text-slate-950 border-teal-300 shadow-lg'
                              : 'bg-slate-900/80 border-slate-800 text-white hover:border-slate-700'
                          }`}
                        >
                          <span>{opt}</span>
                        </button>
                      );
                    }
                  )}
                </div>
              )}

              {/* RATING */}
              {q.type === 'rating' && (
                <div className="pt-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {Array.from({ length: q.scale || 5 }, (_, i) => i + 1).map((num) => {
                      const selected = Number(currentVal) >= num;
                      return (
                        <button
                          key={num}
                          type="button"
                          disabled={isExpired}
                          onClick={() => setAnswers({ ...answers, [q.id]: num })}
                          className={`min-w-[54px] min-h-[54px] rounded-2xl border font-black text-base flex flex-col items-center justify-center gap-0.5 transition-all ${
                            selected
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <Star
                            className={`w-5 h-5 ${
                              selected ? 'fill-amber-400 text-amber-400' : ''
                            }`}
                          />
                          <span className="text-xs">{num}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* RANKING */}
              {q.type === 'ranking' && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs text-slate-400">
                    Use the up/down buttons to rank options (1 = Top Preference):
                  </p>
                  {(Array.isArray(currentVal) && currentVal.length > 0
                    ? currentVal
                    : q.options || []
                  ).map((opt: string, rIdx: number, list: string[]) => (
                    <div
                      key={rIdx}
                      className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-black flex items-center justify-center shrink-0">
                          #{rIdx + 1}
                        </span>
                        <span className="text-base text-white font-medium">{opt}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isExpired || rIdx === 0}
                          onClick={() => {
                            const copy = [...list];
                            const tmp = copy[rIdx - 1];
                            copy[rIdx - 1] = copy[rIdx];
                            copy[rIdx] = tmp;
                            setAnswers({ ...answers, [q.id]: copy });
                          }}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isExpired || rIdx === list.length - 1}
                          onClick={() => {
                            const copy = [...list];
                            const tmp = copy[rIdx + 1];
                            copy[rIdx + 1] = copy[rIdx];
                            copy[rIdx] = tmp;
                            setAnswers({ ...answers, [q.id]: copy });
                          }}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* LIKERT */}
              {q.type === 'likert' && (
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                  {(q.options && q.options.length > 0 ? q.options : LIKERT_DEFAULT_OPTIONS).map(
                    (opt, lIdx) => {
                      const selected = currentVal === opt;
                      return (
                        <button
                          key={lIdx}
                          type="button"
                          disabled={isExpired}
                          onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                          className={`min-h-[48px] p-3 rounded-2xl border text-xs font-black text-center flex items-center justify-center transition-all ${
                            selected
                              ? 'bg-teal-500 text-slate-950 border-teal-300 shadow'
                              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    }
                  )}
                </div>
              )}

              {/* SHORT ANSWER */}
              {q.type === 'short_answer' && (
                <input
                  type="text"
                  disabled={isExpired}
                  value={currentVal || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder="Type your answer..."
                  className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-base text-white focus:border-teal-400 focus:outline-none"
                />
              )}

              {/* LONG TEXT */}
              {q.type === 'long_text' && (
                <textarea
                  rows={4}
                  disabled={isExpired}
                  value={currentVal || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder="Share your thoughts or feedback..."
                  className="w-full p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-base text-white focus:border-teal-400 focus:outline-none"
                />
              )}
            </div>
          );
        })}

        {/* Submit Button */}
        {!isExpired && (
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[54px] py-4 px-6 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-base uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-teal-500/25 transition-all disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
            <span>
              {isSubmitting
                ? 'Submitting...'
                : payload.type === 'poll'
                ? 'Submit Vote'
                : payload.type === 'feedback'
                ? 'Submit Feedback'
                : 'Submit Survey'}
            </span>
          </button>
        )}
      </form>
    </div>
  );
};

export default StudentResponseView;
