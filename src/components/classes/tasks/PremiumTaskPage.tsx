import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Printer,
  Send,
  Loader2
} from 'lucide-react';
import {
  ClassroomTask,
  TaskQuestion,
  TaskSubmission,
  QuestionAnswerResult
} from '@/types/classroomTask';

interface PremiumTaskPageProps {
  task: ClassroomTask;
  submission?: TaskSubmission | null;
  isPreview?: boolean;
  onSubmit?: (answers: Array<{ question_id: string; student_answer: any }>, textResponse?: string) => Promise<void>;
  isSubmitting?: boolean;
}

export const PremiumTaskPage: React.FC<PremiumTaskPageProps> = ({
  task,
  submission,
  isPreview = false,
  onSubmit,
  isSubmitting = false
}) => {
  // Local student answers state
  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    if (submission && Array.isArray(submission.question_answers)) {
      const initial: Record<string, any> = {};
      submission.question_answers.forEach((qa) => {
        initial[qa.question_id] = qa.student_answer;
      });
      return initial;
    }
    return {};
  });

  const [textResponse, setTextResponse] = useState<string>(submission?.text_response || '');
  const [submitted, setSubmitted] = useState<boolean>(Boolean(submission && submission.status !== 'draft'));

  const questions: TaskQuestion[] = Array.isArray(task.questions) ? task.questions : [];
  const contentBlocks = Array.isArray(task.content_blocks) ? task.content_blocks : [];

  const handleAnswerChange = (questionId: string, val: any) => {
    if (submitted && !task.settings?.allow_retry) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: val
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmit || isSubmitting) return;

    const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
      question_id: qId,
      student_answer: ans
    }));

    await onSubmit(formattedAnswers, textResponse);
    setSubmitted(true);
  };

  const handlePrint = () => {
    window.print();
  };

  // Find question result from submission
  const getQuestionResult = (qId: string): QuestionAnswerResult | undefined => {
    if (!submission || !Array.isArray(submission.question_answers)) return undefined;
    return submission.question_answers.find((qa) => qa.question_id === qId);
  };

  return (
    <div className="w-full flex flex-col items-center py-6 px-3 sm:px-6 bg-slate-100/80 min-h-screen">
      
      {/* Action Toolbar (Hidden during print) */}
      <div className="w-full max-w-[8.5in] mb-4 flex items-center justify-between no-print px-2">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-black rounded-full uppercase tracking-wider">
            {task.category.toUpperCase()}
          </span>
          {isPreview && (
            <span className="px-3 py-1 bg-amber-100 text-amber-900 text-xs font-black rounded-full">
              Preview Mode (Letter Format)
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5 text-slate-500" />
          <span>Print / PDF</span>
        </button>
      </div>

      {/* Primary Content Canvas (US Letter Proportion: 8.5in × 11in) */}
      <div className="w-full max-w-[8.5in] min-h-[11in] bg-white rounded-2xl shadow-xl border border-slate-200/90 p-8 sm:p-12 flex flex-col justify-between relative print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-full">
        
        <div className="space-y-6">
          
          {/* Header & Branding */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
                  E
                </div>
                <span className="text-xs font-black tracking-widest text-slate-900 uppercase">
                  EDTECHRA DIGITAL CLASSROOM
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                {task.title}
              </h1>
              {task.subtitle && (
                <p className="text-sm font-semibold text-slate-600 mt-0.5">
                  {task.subtitle}
                </p>
              )}
            </div>

            <div className="text-left sm:text-right shrink-0 space-y-1">
              <div className="text-xs font-bold text-slate-500">
                {task.classroom?.title ? `Class: ${task.classroom.title}` : 'Classroom Task'}
              </div>
              <div className="flex items-center sm:justify-end gap-2 text-xs font-black text-slate-800">
                <span>Total Points: {task.points}</span>
                {task.due_date && (
                  <span className="text-slate-500">
                    • Due: {new Date(task.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Instructions Box */}
          {task.instructions && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Instructions
              </span>
              <p className="text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                {task.instructions}
              </p>
            </div>
          )}

          {/* Structured Learning Sections / Content Blocks */}
          {contentBlocks.length > 0 && (
            <div className="space-y-5 pt-2">
              {contentBlocks.map((block, idx) => (
                <div key={block.id || idx} className="space-y-2">
                  {block.title && (
                    <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                      <span>{block.title}</span>
                    </h3>
                  )}

                  {block.content && (
                    <p className="text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap pl-4 border-l-2 border-indigo-100">
                      {block.content}
                    </p>
                  )}

                  {block.media_url && (
                    <div className="my-3 rounded-xl overflow-hidden border border-slate-200 max-h-80 bg-slate-50 flex items-center justify-center">
                      <img
                        src={block.media_url}
                        alt={block.caption || 'Lesson illustration'}
                        loading="lazy"
                        className="max-h-80 object-contain w-full"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Interactive Questions Sheet */}
          {questions.length > 0 && (
            <div className="space-y-6 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
                  Exercises & Questions ({questions.length})
                </h2>
                <span className="text-xs font-bold text-slate-500">
                  {questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0)} Marks Total
                </span>
              </div>

              <div className="space-y-6">
                {questions.map((q, index) => {
                  const qNum = index + 1;
                  const currentAns = answers[q.id];
                  const qResult = getQuestionResult(q.id);
                  const isGraded = Boolean(qResult);

                  return (
                    <div
                      key={q.id || index}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50/80 transition-colors space-y-3"
                    >
                      {/* Question Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {qNum}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-900 leading-snug">
                              {q.prompt}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            {q.marks || 1} pt{Number(q.marks) > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Question Inputs by Type */}
                      
                      {/* 1. Multiple Choice (MCQ) */}
                      {(q.type === 'mcq' || q.type === 'multiple_choice') && Array.isArray(q.options) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-8">
                          {q.options.map((opt, oIdx) => {
                            const isSelected = String(currentAns) === String(opt) || String(currentAns) === String(oIdx);
                            return (
                              <button
                                key={oIdx}
                                type="button"
                                disabled={submitted && !task.settings?.allow_retry}
                                onClick={() => handleAnswerChange(q.id, opt)}
                                className={`text-left p-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                                }`}
                              >
                                <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] shrink-0 ${
                                  isSelected ? 'border-white bg-white text-indigo-600' : 'border-slate-300'
                                }`}>
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span className="flex-1">{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* 2. True / False */}
                      {q.type === 'true_false' && (
                        <div className="flex items-center gap-3 pt-1 pl-8">
                          {['True', 'False'].map((opt) => {
                            const isSelected = String(currentAns).toLowerCase() === opt.toLowerCase();
                            return (
                              <button
                                key={opt}
                                type="button"
                                disabled={submitted && !task.settings?.allow_retry}
                                onClick={() => handleAnswerChange(q.id, opt)}
                                className={`px-5 py-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* 3. Fill in the Blank */}
                      {q.type === 'fill_blank' && (
                        <div className="pt-1 pl-8">
                          <input
                            type="text"
                            disabled={submitted && !task.settings?.allow_retry}
                            value={currentAns || ''}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            placeholder="Type your answer here..."
                            className="w-full sm:max-w-md px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      )}

                      {/* 4. Short Answer / Open-Ended (AI-Evaluated) */}
                      {(q.type === 'short_answer' || q.type === 'paragraph' || q.type === 'essay' || q.type === 'creative_writing' || q.type === 'open_ended') && (
                        <div className="pt-1 pl-8 space-y-1">
                          <textarea
                            rows={3}
                            disabled={submitted && !task.settings?.allow_retry}
                            value={currentAns || ''}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            placeholder="Write your explanation or response here..."
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                          />
                        </div>
                      )}

                      {/* Evaluation Result Feedback */}
                      {isGraded && qResult && (
                        <div className={`mt-2 p-3 rounded-xl border text-xs font-bold flex items-start gap-2 ${
                          qResult.is_correct
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-rose-50 border-rose-200 text-rose-900'
                        }`}>
                          {qResult.is_correct ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          )}
                          <div className="space-y-0.5 flex-1">
                            <div className="flex items-center justify-between">
                              <span>
                                {qResult.is_correct ? 'Correct' : 'Incorrect'} ({qResult.score} / {qResult.max_score} pts)
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {qResult.grading_method === 'ai' ? 'AI Evaluated' : 'Auto Graded'}
                              </span>
                            </div>
                            {qResult.feedback && (
                              <p className="text-[11px] font-normal leading-relaxed text-slate-700">
                                {qResult.feedback}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Standard Submission Box if no interactive questions */}
          {questions.length === 0 && task.category !== 'resource' && (
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                Your Response / Work
              </span>
              <textarea
                rows={5}
                disabled={submitted}
                value={textResponse}
                onChange={(e) => setTextResponse(e.target.value)}
                placeholder="Type your response or assignment notes here..."
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

        </div>

        {/* Page Footer & Submission Actions */}
        <div className="pt-8 mt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-bold text-slate-400">
            EdTechra Learning Platform • Page 1 of 1
          </div>

          {!isPreview && onSubmit && (
            <div className="flex items-center gap-3 no-print">
              {submitted ? (
                <div className="flex items-center gap-2 text-xs font-black text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Work Submitted {submission?.final_score != null ? `• Score: ${submission.final_score}/${task.points}` : ''}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Evaluating Answers...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Assignment</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
