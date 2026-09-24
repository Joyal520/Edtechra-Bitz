import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Printer,
  Send,
  Loader2,
  Upload,
  Trash2,
  Sparkles,
  AlertTriangle,
  PenLine,
  MessageSquare
} from 'lucide-react';
import {
  ClassroomTask,
  TaskQuestion,
  TaskSubmission,
  QuestionAnswerResult
} from '@/types/classroomTask';
import type { EvaluationPhase } from './StudentTaskModal';
import { optimizeImageForOCR } from '@/utils/imageOptimizer';

interface PremiumTaskPageProps {
  task: ClassroomTask;
  submission?: TaskSubmission | null;
  isPreview?: boolean;
  onSubmit?: (
    answers: Array<{ question_id: string; student_answer: any }>,
    textResponse?: string,
    handwrittenImageBase64?: string
  ) => Promise<void>;
  isSubmitting?: boolean;
  evaluationPhase?: EvaluationPhase;
}

export const PremiumTaskPage: React.FC<PremiumTaskPageProps> = ({
  task,
  submission,
  isPreview = false,
  onSubmit,
  isSubmitting = false,
  evaluationPhase = 'idle'
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
  const [submissionMode, setSubmissionMode] = useState<'text' | 'handwritten'>(() => {
    if (task.settings?.submission_method === 'upload') return 'handwritten';
    return 'text';
  });
  const [handwrittenPreview, setHandwrittenPreview] = useState<string | null>(() => {
    if (submission?.file_urls && submission.file_urls.length > 0) {
      return submission.file_urls[0];
    }
    return null;
  });
  const [handwrittenBase64, setHandwrittenBase64] = useState<string | null>(() => {
    if (submission?.file_urls && submission.file_urls.length > 0) {
      return submission.file_urls[0];
    }
    return null;
  });
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(Boolean(submission && submission.status !== 'draft'));

  const isTaskEvaluating = evaluationPhase === 'evaluating' || isSubmitting || Boolean(
    submission && (submission.status === 'evaluating' || (submission.status === 'submitted' && submission.final_score == null) || submission.status === 'processing')
  );

  const isTaskEvaluated = !isTaskEvaluating && Boolean(
    evaluationPhase === 'evaluated' ||
    (submission && (submission.status === 'graded' || submission.final_score != null || submission.points_awarded != null || (submission.status !== 'draft' && submission.teacher_feedback)))
  );

  const questions: TaskQuestion[] = Array.isArray(task.questions) ? task.questions : [];
  const contentBlocks = Array.isArray(task.content_blocks) ? task.content_blocks : [];

  const handleAnswerChange = (questionId: string, val: any) => {
    if (submitted && !task.settings?.allow_retry) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: val
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setFileError('Please select an image file (.jpg, .jpeg, .png, or .webp). PDF and document formats are not supported.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setFileError('Image size exceeds 15MB limit. Please choose a smaller photo.');
      return;
    }

    try {
      // Auto-compress and scale down client-side for rapid upload & pristine OCR accuracy
      const optimizedBase64 = await optimizeImageForOCR(file, 1600, 0.85);
      setHandwrittenPreview(optimizedBase64);
      setHandwrittenBase64(optimizedBase64);
    } catch (err: any) {
      console.warn('Fallback reading image:', err.message);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setHandwrittenPreview(result);
        setHandwrittenBase64(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmit || isSubmitting) return;

    const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
      question_id: qId,
      student_answer: ans
    }));

    await onSubmit(
      formattedAnswers,
      textResponse,
      submissionMode === 'handwritten' ? handwrittenBase64 || undefined : undefined
    );
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
    <div className="w-full flex flex-col items-center py-3 px-1.5 sm:py-6 sm:px-6 bg-slate-100/80 min-h-screen">
      
      {/* Action Toolbar (Hidden during print) */}
      <div className="w-full max-w-[8.5in] mb-4 flex items-center justify-between no-print px-1 sm:px-2">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 text-xs font-black rounded-full uppercase tracking-wider">
            TASK
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
      <div className="w-full max-w-[8.5in] min-h-[11in] bg-white rounded-2xl shadow-xl border border-slate-200/90 p-3.5 sm:p-8 lg:p-12 flex flex-col justify-between relative print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-full">
        
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

          {/* Prominent High-Contrast Task Instructions Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-md space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="px-3 py-1 bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[11px] font-black rounded-full uppercase tracking-wider">
                TASK INSTRUCTIONS
              </span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold rounded-full">
                Aim for approximately 50 words
              </span>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase">
                {task.subtitle || task.title}
              </h2>
              {task.instructions && (
                <p className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed whitespace-pre-wrap mt-2">
                  {task.instructions}
                </p>
              )}
            </div>
          </div>

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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-0 sm:pl-8">
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
                        <div className="flex items-center gap-3 pt-1 pl-0 sm:pl-8">
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
                        <div className="pt-1 pl-0 sm:pl-8">
                          <input
                            type="text"
                            disabled={submitted && !task.settings?.allow_retry}
                            value={currentAns || ''}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            placeholder="Type your answer here..."
                            style={{ color: '#172B2F', backgroundColor: '#FFFFFF' }}
                            className="w-full sm:max-w-md px-3.5 py-2 bg-white border-2 border-[#C9E5E2] rounded-xl text-xs font-black text-[#172B2F] placeholder:text-[#475569] focus:outline-hidden focus:border-[#159A9C] focus:ring-2 focus:ring-[#159A9C]/20"
                          />
                        </div>
                      )}

                      {/* 4. Short Answer / Open-Ended (AI-Evaluated) */}
                      {(q.type === 'short_answer' || q.type === 'paragraph' || q.type === 'essay' || q.type === 'creative_writing' || q.type === 'open_ended') && (
                        <div className="pt-1 pl-0 sm:pl-8 space-y-1">
                          <textarea
                            rows={3}
                            disabled={submitted && !task.settings?.allow_retry}
                            value={currentAns || ''}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            placeholder="Write your explanation or response here..."
                            style={{ color: '#172B2F', backgroundColor: '#FFFFFF' }}
                            className="w-full p-3 bg-white border-2 border-[#C9E5E2] rounded-xl text-xs font-semibold text-[#172B2F] placeholder:text-[#475569] focus:outline-hidden focus:border-[#159A9C] focus:ring-2 focus:ring-[#159A9C]/20 leading-relaxed"
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

          {/* Handwritten Evaluation Feedback if present */}
          {submission?.ocr_evaluation_id && (
            <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-black uppercase text-amber-900 tracking-wider">
                    Handwritten Work Evaluated
                  </span>
                </div>
                <span className="text-xs font-black text-amber-900">
                  Score: {submission.final_score ?? submission.points_awarded ?? 0} / {task.points} pts
                  {submission.percentage != null && ` (${submission.percentage}%)`}
                </span>
              </div>
              {submission.teacher_feedback && (
                <p className="text-xs text-amber-950 font-medium leading-relaxed bg-white/70 p-3 rounded-xl border border-amber-100">
                  {submission.teacher_feedback}
                </p>
              )}
            </div>
          )}

          {/* Submission Box for tasks allowing responses or handwritten work (shown when not yet evaluated) */}
          {!isTaskEvaluated && task.category !== 'resource' && (
            <div className="p-3.5 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                    Submit your Task
                  </span>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {task.settings?.submission_method === 'text'
                      ? 'Type your response directly into the field below.'
                      : task.settings?.submission_method === 'upload'
                      ? 'Upload a clear photo of your handwritten paper or worksheet.'
                      : 'You can type your answer or upload a clear photo of your handwritten work.'}
                  </p>
                </div>
                {!submitted && (!task.settings?.submission_method || task.settings?.submission_method === 'both') && (
                  <div className="flex items-center p-1 bg-white border border-slate-200 rounded-xl shrink-0">
                    <button
                      type="button"
                      onClick={() => setSubmissionMode('text')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        submissionMode === 'text'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Type Response
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubmissionMode('handwritten')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        submissionMode === 'handwritten'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Upload Handwritten Work
                    </button>
                  </div>
                )}
              </div>

              {submissionMode === 'text' ? (
                <div className="w-full">
                  <textarea
                    rows={questions.length > 0 ? 4 : 8}
                    disabled={submitted}
                    value={textResponse}
                    onChange={(e) => setTextResponse(e.target.value)}
                    placeholder="Type your explanation, summary, or response notes here..."
                    style={{ color: '#0f172a', backgroundColor: '#FFFFFF' }}
                    className="w-full block min-h-[200px] sm:min-h-[240px] p-3.5 sm:p-4 bg-white border-2 border-slate-300 rounded-xl text-base sm:text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 leading-relaxed shadow-xs"
                  />
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 px-1 font-medium">
                    <span>{textResponse ? `${textResponse.trim().split(/\s+/).filter(Boolean).length} words` : '0 words'}</span>
                    <span>AI-Powered Review & Learning Evidence</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {handwrittenPreview ? (
                    <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900/5 p-3 flex flex-col items-center">
                      <img
                        src={handwrittenPreview}
                        alt="Handwritten Work Preview"
                        className="max-h-80 object-contain rounded-lg shadow-sm"
                      />
                      {!submitted && (
                        <button
                          type="button"
                          onClick={() => {
                            setHandwrittenPreview(null);
                            setHandwrittenBase64(null);
                          }}
                          className="mt-3 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove and select different image</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 cursor-pointer bg-white transition-colors">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-center">
                        <span className="text-xs font-black text-slate-800 block">
                          Take a photo or upload handwritten worksheet
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Supports JPG, JPEG, PNG, or WEBP (up to 10MB)
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={submitted}
                      />
                    </label>
                  )}

                  {fileError && (
                    <p className="text-xs text-rose-600 font-bold">{fileError}</p>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* ================================================================= */}
        {/* AI EVALUATION LIFECYCLE UI                                         */}
        {/* ================================================================= */}

        {/* EVALUATING STATE: Show while AI is correcting */}
        {isTaskEvaluating && (
          <div className="mt-8 p-6 sm:p-8 rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-sky-50 to-purple-50 text-center space-y-4 animate-in fade-in duration-300 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md animate-pulse">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-950 tracking-tight">
                ✨ AI IS CORRECTING YOUR WORK
              </h3>
              <p className="text-sm font-semibold text-slate-700 max-w-md mx-auto">
                Please wait while your writing is being evaluated and corrected with sentence-level feedback...
              </p>
              <p className="text-xs font-medium text-slate-500">
                Your submission has been securely recorded.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* EVALUATED STATE: Show structured AI result */}
        {isTaskEvaluated && submission && (() => {
          // Extract writing evaluation from submission
          const wEval: any =
            submission.writing_evaluation ||
            (Array.isArray(submission.question_answers)
              ? submission.question_answers.find((qa: any) => qa.writing_evaluation || qa.question_id === 'ocr_handwritten_response' || qa.question_id === 'writing_response')?.writing_evaluation
              : null);

          const hasWritingResult = Boolean(wEval);
          const scoreVal = wEval?.score ?? submission.final_score ?? submission.points_awarded;
          const maxVal = wEval?.max_score ?? task.points ?? 100;
          const pctVal = wEval?.percentage ?? submission.percentage ?? (scoreVal != null && maxVal > 0 ? Math.round((Number(scoreVal) / maxVal) * 100) : null);
          const studentImage = submission.file_urls?.[0] || handwrittenPreview;
          const originalText = submission.text_response || wEval?.ocr_text || '';
          const correctedText = wEval?.corrected_work || '';
          const rubricBreakdown: any[] = Array.isArray(wEval?.breakdown) ? wEval.breakdown.filter((b: any) => !b?.__is_diagnostic_meta) : [];

          const grammarIssues: any[] = Array.isArray(wEval?.grammar_issues) && wEval.grammar_issues.length > 0
            ? wEval.grammar_issues
            : Array.isArray(wEval?.grammar_errors) && wEval.grammar_errors.length > 0
            ? wEval.grammar_errors.map((g: any) => ({ original: g.text || g.original, correction: g.suggestion || g.correction, explanation: g.rule || g.explanation || 'Grammar correction' }))
            : [];

          const spellingIssues: any[] = Array.isArray(wEval?.spelling_issues) && wEval.spelling_issues.length > 0
            ? wEval.spelling_issues
            : Array.isArray(wEval?.spelling_errors) && wEval.spelling_errors.length > 0
            ? wEval.spelling_errors.map((s: any) => ({ original: s.text || s.original, correction: s.suggestion || s.correction, explanation: 'Spelling correction' }))
            : [];

          const vocabIssues: any[] = Array.isArray(wEval?.vocabulary_issues) ? wEval.vocabulary_issues : [];
          const structureIssues: any[] = Array.isArray(wEval?.sentence_structure_issues) ? wEval.sentence_structure_issues : [];
          const strengthsList: string[] = Array.isArray(wEval?.strengths) ? wEval.strengths : [];
          const nextStepText: string = wEval?.next_step || '';

          return (
            <div className="mt-8 space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-500">

              {/* Score Header */}
              <div className="p-5 sm:p-6 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        EVALUATION COMPLETE
                      </span>
                      {(submission.is_ai_graded || hasWritingResult) && (
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          AI OCR GRADED
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">{task.title}</h3>
                    {wEval?.concept && (
                      <div className="text-xs font-bold text-teal-800">
                        Topic: <span className="text-teal-900">{wEval.concept}</span>
                      </div>
                    )}
                  </div>

                  {pctVal != null && (
                    <div className="text-left sm:text-right shrink-0 bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-emerald-200 shadow-2xs">
                      <div className="text-2xl sm:text-3xl font-black text-emerald-700">{scoreVal} / {maxVal}</div>
                      <div className="text-sm font-black text-emerald-600">{pctVal}% Score</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Structured Result Sections */}
              {(hasWritingResult || studentImage || originalText) && (
                <>
                  {/* Side-by-side comparison on desktop (grid lg:grid-cols-2), stacked on mobile */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left: Original Student Work */}
                    <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <PenLine className="w-4 h-4 text-slate-500" />
                            <span className="text-xs font-black uppercase tracking-wider text-slate-700">YOUR ORIGINAL WORK</span>
                          </div>
                          {studentImage && (
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Handwritten Sheet</span>
                          )}
                        </div>

                        {studentImage && (
                          <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900/5 p-2 flex flex-col items-center">
                            <img
                              src={studentImage}
                              alt="Submitted Handwritten Work"
                              className="max-h-72 sm:max-h-96 object-contain rounded-lg shadow-xs"
                            />
                          </div>
                        )}

                        {originalText && (
                          <div className="space-y-1">
                            {studentImage && (
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                Transcribed Text
                              </span>
                            )}
                            <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                              {originalText}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Complete Corrected Work */}
                    <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-black uppercase tracking-wider text-emerald-800">CORRECTED WORK</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-100 px-2 py-0.5 rounded-full">
                            Polished English
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm font-medium text-emerald-950 leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs">
                          {correctedText || originalText || 'No text provided.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rubric Criteria Breakdown if available */}
                  {rubricBreakdown.length > 0 && (
                    <div className="p-4 sm:p-5 rounded-2xl border border-[#C9E5E2] bg-white space-y-3">
                      <span className="text-xs font-black uppercase tracking-wider text-[#173B3F] block">
                        CRITERIA BREAKDOWN
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {rubricBreakdown.map((crit: any, cIdx: number) => (
                          <div key={cIdx} className="p-3 rounded-xl bg-[#E8F7F5]/40 border border-[#C9E5E2] flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-[#173B3F] block">{crit.criterion || crit.name}</span>
                              {crit.feedback && (
                                <span className="text-[11px] text-[#36565A] font-medium block mt-0.5">{crit.feedback}</span>
                              )}
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <span className="text-xs font-black text-[#087477]">
                                {crit.score}{crit.max != null ? ` / ${crit.max}` : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Categorized Issues Breakdown (14-point inspection) */}
                  <div className="p-4 sm:p-6 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800">DETAILED WRITING ANALYSIS</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        14-Point English Inspection
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Grammar & Syntax */}
                      <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-800">Grammar & Syntax</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {grammarIssues.length} issue{grammarIssues.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {grammarIssues.length > 0 ? (
                          <ul className="space-y-2 pt-1">
                            {grammarIssues.map((err: any, i: number) => (
                              <li key={i} className="text-xs text-slate-700 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                                <div>
                                  <span className="line-through text-rose-600 font-bold">"{err.original || err.text}"</span>
                                  <span className="mx-1.5 text-slate-400 font-bold">→</span>
                                  <span className="text-emerald-700 font-black">"{err.correction || err.suggestion}"</span>
                                </div>
                                {(err.explanation || err.rule) && (
                                  <p className="text-[11px] text-slate-500 leading-snug">
                                    <strong className="text-slate-700">Why:</strong> {err.explanation || err.rule}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-emerald-700 font-medium bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-100">
                            ✓ No grammar errors detected
                          </p>
                        )}
                      </div>

                      {/* Spelling */}
                      <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-800">Spelling</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {spellingIssues.length} issue{spellingIssues.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {spellingIssues.length > 0 ? (
                          <ul className="space-y-2 pt-1">
                            {spellingIssues.map((err: any, i: number) => (
                              <li key={i} className="text-xs text-slate-700 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                                <div>
                                  <span className="line-through text-rose-600 font-bold">"{err.original || err.text}"</span>
                                  <span className="mx-1.5 text-slate-400 font-bold">→</span>
                                  <span className="text-emerald-700 font-black">"{err.correction || err.suggestion}"</span>
                                </div>
                                {(err.explanation || err.rule) && (
                                  <p className="text-[11px] text-slate-500 leading-snug">
                                    <strong className="text-slate-700">Why:</strong> {err.explanation || err.rule}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-emerald-700 font-medium bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-100">
                            ✓ No spelling mistakes detected
                          </p>
                        )}
                      </div>

                      {/* Vocabulary */}
                      <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-800">Vocabulary & Word Choice</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {vocabIssues.length} issue{vocabIssues.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {vocabIssues.length > 0 ? (
                          <ul className="space-y-2 pt-1">
                            {vocabIssues.map((err: any, i: number) => (
                              <li key={i} className="text-xs text-slate-700 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                                <div>
                                  <span className="line-through text-rose-600 font-bold">"{err.original}"</span>
                                  <span className="mx-1.5 text-slate-400 font-bold">→</span>
                                  <span className="text-emerald-700 font-black">"{err.correction}"</span>
                                </div>
                                {err.explanation && (
                                  <p className="text-[11px] text-slate-500 leading-snug">
                                    <strong className="text-slate-700">Why:</strong> {err.explanation}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-emerald-700 font-medium bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-100">
                            ✓ Vocabulary is appropriate
                          </p>
                        )}
                      </div>

                      {/* Sentence Structure */}
                      <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-800">Sentence Structure</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {structureIssues.length} issue{structureIssues.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {structureIssues.length > 0 ? (
                          <ul className="space-y-2 pt-1">
                            {structureIssues.map((err: any, i: number) => (
                              <li key={i} className="text-xs text-slate-700 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                                <div>
                                  <span className="line-through text-rose-600 font-bold">"{err.original}"</span>
                                  <span className="mx-1.5 text-slate-400 font-bold">→</span>
                                  <span className="text-emerald-700 font-black">"{err.correction}"</span>
                                </div>
                                {err.explanation && (
                                  <p className="text-[11px] text-slate-500 leading-snug">
                                    <strong className="text-slate-700">Why:</strong> {err.explanation}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-emerald-700 font-medium bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-100">
                            ✓ Sentence structure is clear
                          </p>
                        )}
                      </div>
                    </div>

                    {/* What You Did Well (Strengths) */}
                    {strengthsList.length > 0 && (
                      <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                        <h4 className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WHAT YOU DID WELL</span>
                        </h4>
                        <ul className="space-y-1.5 pl-1">
                          {strengthsList.map((s: string, i: number) => (
                            <li key={i} className="text-xs text-emerald-950 font-medium flex items-start gap-2">
                              <span className="text-emerald-600 font-black">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Next Step */}
                    {nextStepText && (
                      <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-1.5">
                        <h4 className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>NEXT STEP</span>
                        </h4>
                        <p className="text-xs text-indigo-950 font-medium leading-relaxed">
                          {nextStepText}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* AI Feedback */}
                  {(wEval?.feedback || submission.teacher_feedback) && (
                    <div className="p-4 sm:p-5 rounded-2xl border border-sky-200 bg-sky-50/50 space-y-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-sky-600" />
                        <span className="text-xs font-black uppercase tracking-wider text-sky-800">PEDAGOGICAL FEEDBACK</span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {wEval?.feedback || submission.teacher_feedback}
                      </p>
                      {wEval?.skills && wEval.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {wEval.skills.map((skill: string, i: number) => (
                            <span key={i} className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Simple fallback result if no detailed writing breakdown */}
              {!hasWritingResult && !studentImage && !originalText && scoreVal != null && (
                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="text-sm font-black text-emerald-800">
                    Work Evaluated • Score: {scoreVal}/{maxVal}
                    {submission.teacher_feedback && ` — ${submission.teacher_feedback}`}
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Page Footer & Submission Actions */}
        <div className="pt-8 mt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-bold text-slate-400">
            EdTechra Learning Platform • Page 1 of 1
          </div>

          {!isPreview && onSubmit && (
            <div className="flex items-center gap-3 no-print w-full sm:w-auto justify-end">
              {isTaskEvaluating ? (
                <div className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs font-black text-indigo-700 bg-indigo-50 px-4 py-2.5 rounded-xl border border-indigo-200 shadow-2xs">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI is evaluating your work...</span>
                </div>
              ) : isTaskEvaluated ? (
                <div className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs font-black text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    ✓ AI Graded {submission?.final_score != null ? `• ${submission.final_score}/${task.points}` : ''}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting || (submissionMode === 'handwritten' && !handwrittenBase64)}
                  onClick={handleSubmit}
                  className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm sm:text-xs font-black shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit your Task</span>
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
