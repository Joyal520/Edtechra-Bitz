// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: IN-PREVIEW AI LESSON ASSISTANT MODAL
// Generates structured lesson content and practice questions grounded in
// the active lesson context using Google Gemini. Requires teacher review.
// ============================================================================

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Check,
  ListPlus
} from 'lucide-react';
import { courseStudioService } from '@/services/courseStudioService';
import {
  CourseBlock,
  CourseQuestion,
  QuestionType,
  DifficultyLevel
} from '@/types/courseStudio';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';

interface AILessonAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  unitTitle: string;
  lessonTitle: string;
  currentLessonText: string;
  onApplyBlocks: (blocks: CourseBlock[]) => void;
  onApplyQuestions: (questions: CourseQuestion[]) => void;
}

export const AILessonAssistantModal: React.FC<AILessonAssistantModalProps> = ({
  isOpen,
  onClose,
  courseTitle,
  unitTitle,
  lessonTitle,
  currentLessonText,
  onApplyBlocks,
  onApplyQuestions
}) => {
  const [activeTab, setActiveTab] = useState<'lesson' | 'questions'>('lesson');

  // Tab 1: Lesson generation state
  const [lessonInstructions, setLessonInstructions] = useState('');
  const [targetLevel, setTargetLevel] = useState('A1 Beginner');
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [proposedBlocks, setProposedBlocks] = useState<CourseBlock[] | null>(null);
  const [proposedQuestions, setProposedQuestions] = useState<CourseQuestion[] | null>(null);

  // Tab 2: Question generation state
  const [questionCount, setQuestionCount] = useState(5);
  const [questionDifficulty, setQuestionDifficulty] = useState<DifficultyLevel>('easy');
  const [questionType, setQuestionType] = useState<QuestionType>('multiple_choice');
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [reviewQuestions, setReviewQuestions] = useState<CourseQuestion[] | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Generate Full Structured Lesson
  const handleGenerateLesson = async () => {
    setLoadingLesson(true);
    setErrorMessage(null);
    try {
      const res = await courseStudioService.generateStructuredLessonWithAI({
        course_title: courseTitle,
        unit_title: unitTitle,
        lesson_title: lessonTitle,
        target_level: targetLevel,
        instructions: lessonInstructions.trim()
      });

      if (res && Array.isArray(res.blocks)) {
        setProposedBlocks(res.blocks as CourseBlock[]);
        if (Array.isArray(res.suggested_questions)) {
          setProposedQuestions(res.suggested_questions as CourseQuestion[]);
        }
      } else {
        throw new Error('Could not parse generated lesson structure.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate structured lesson.');
    } finally {
      setLoadingLesson(false);
    }
  };

  // 2. Generate Practice Questions
  const handleGenerateQuestions = async () => {
    setLoadingQuestions(true);
    setErrorMessage(null);
    try {
      const textContext = currentLessonText.trim() || `${lessonTitle}: ${courseTitle}`;
      const res = await courseStudioService.generateQuestionsWithAI({
        course_id: '',
        scope: 'episode',
        content_text: textContext,
        question_types: [questionType],
        question_count: questionCount,
        difficulty: questionDifficulty,
        instructions: `Generate questions grounded strictly in: ${lessonTitle}`
      });

      if (res && Array.isArray(res.questions)) {
        setReviewQuestions(res.questions as CourseQuestion[]);
      } else {
        throw new Error('No questions returned from AI.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate questions.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleAcceptLesson = () => {
    if (proposedBlocks) {
      onApplyBlocks(proposedBlocks);
      if (proposedQuestions && proposedQuestions.length > 0) {
        onApplyQuestions(proposedQuestions);
      }
      setSuccessNotice('Lesson blocks applied! Review changes in the preview.');
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  const handleAcceptQuestions = () => {
    if (reviewQuestions) {
      onApplyQuestions(reviewQuestions);
      setSuccessNotice(`${reviewQuestions.length} questions applied!`);
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs font-sans animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <header className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-indigo-50/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#026fc3] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">
                AI LESSON DESIGNER
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {lessonTitle} • {unitTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* TAB SWITCHER */}
        <div className="flex border-b border-stone-200 px-6 bg-stone-50/70 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('lesson');
              setErrorMessage(null);
            }}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'lesson'
                ? 'border-[#026fc3] text-[#026fc3]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Full Lesson Content
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('questions');
              setErrorMessage(null);
            }}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'questions'
                ? 'border-[#026fc3] text-[#026fc3]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Practice Questions
          </button>
        </div>

        {/* ERROR / SUCCESS NOTICES */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successNotice && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* CONTENT AREA */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'lesson' ? (
            <div>
              {!proposedBlocks ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Target CEFR Level</label>
                    <select
                      value={targetLevel}
                      onChange={e => setTargetLevel(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold bg-white text-slate-800"
                    >
                      <option value="A1 Beginner">A1 Beginner</option>
                      <option value="A2 Elementary">A2 Elementary</option>
                      <option value="B1 Intermediate">B1 Intermediate</option>
                      <option value="B2 Upper Intermediate">B2 Upper Intermediate</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Teacher Focus / Specific Instructions (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={lessonInstructions}
                      onChange={e => setLessonInstructions(e.target.value)}
                      placeholder="e.g. Include a vocabulary table with travel words, a short greeting dialogue, and 2 comprehension questions."
                      className="w-full p-3 rounded-xl border border-stone-200 text-xs text-slate-800 focus:ring-2 focus:ring-[#026fc3] focus:outline-none"
                    />
                  </div>

                  <p className="text-[11.5px] text-slate-500 bg-stone-50 p-3 rounded-xl border border-stone-200/70">
                    💡 <strong>What Gemini will generate:</strong> An engaging introductory hook, essential vocabulary table, story dialogue with an image prompt, and practical takeaway tips formatted cleanly in Markdown.
                  </p>

                  <button
                    type="button"
                    onClick={handleGenerateLesson}
                    disabled={loadingLesson}
                    className="w-full py-3 rounded-xl bg-[#026fc3] hover:bg-[#025da4] text-white text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{loadingLesson ? 'Generating Lesson with Gemini...' : 'Generate Structured Lesson'}</span>
                  </button>
                </div>
              ) : (
                /* REVIEW PROPOSED BLOCKS */
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-sky-900">
                        {proposedBlocks.length} Section Blocks Generated
                      </span>
                      {proposedQuestions && (
                        <p className="text-[11px] text-sky-700">
                          + {proposedQuestions.length} interactive practice questions
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setProposedBlocks(null)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:underline"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Back / Reconfigure</span>
                    </button>
                  </div>

                  {/* Rendered Preview Snippets */}
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {proposedBlocks.map((b, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Block {idx + 1}: {b.block_type}
                        </span>
                        <div className="text-xs text-slate-800 line-clamp-3">
                          <MarkdownRenderer content={(b.content as any)?.text || ''} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={handleGenerateLesson}
                      disabled={loadingLesson}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-stone-100 cursor-pointer"
                    >
                      Regenerate
                    </button>
                    <button
                      type="button"
                      onClick={handleAcceptLesson}
                      className="px-5 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Apply to Lesson</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* QUESTIONS TAB */
            <div>
              {!reviewQuestions ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Question Type</label>
                      <select
                        value={questionType}
                        onChange={e => setQuestionType(e.target.value as QuestionType)}
                        className="w-full p-2 rounded-xl border border-stone-200 text-xs font-bold bg-white"
                      >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="true_false">True / False</option>
                        <option value="short_answer">Short Answer</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Number</label>
                      <select
                        value={questionCount}
                        onChange={e => setQuestionCount(parseInt(e.target.value, 10))}
                        className="w-full p-2 rounded-xl border border-stone-200 text-xs font-bold bg-white"
                      >
                        <option value={3}>3 Questions</option>
                        <option value={5}>5 Questions</option>
                        <option value={8}>8 Questions</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Difficulty</label>
                      <select
                        value={questionDifficulty}
                        onChange={e => setQuestionDifficulty(e.target.value as DifficultyLevel)}
                        className="w-full p-2 rounded-xl border border-stone-200 text-xs font-bold bg-white"
                      >
                        <option value="easy">Easy (Beginner)</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Challenging</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-[11.5px] text-slate-500 bg-stone-50 p-3 rounded-xl border border-stone-200/70">
                    Questions are generated directly from the text of <strong>{lessonTitle}</strong> with concept tagging and explanations.
                  </p>

                  <button
                    type="button"
                    onClick={handleGenerateQuestions}
                    disabled={loadingQuestions}
                    className="w-full py-3 rounded-xl bg-[#026fc3] hover:bg-[#025da4] text-white text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{loadingQuestions ? 'Generating Questions...' : 'Generate Practice Questions'}</span>
                  </button>
                </div>
              ) : (
                /* REVIEW PROPOSED QUESTIONS */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      {reviewQuestions.length} Questions Generated
                    </span>
                    <button
                      type="button"
                      onClick={() => setReviewQuestions(null)}
                      className="text-xs font-bold text-[#026fc3] hover:underline cursor-pointer"
                    >
                      Reconfigure
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {reviewQuestions.map((q, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-stone-200 bg-stone-50/60 text-xs space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-800">
                            {idx + 1}. {q.question_text}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">
                            {q.question_type}
                          </span>
                        </div>
                        {Array.isArray(q.options) && q.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-1 pt-1 text-[11px] text-slate-600">
                            {q.options.map((opt, oIdx) => (
                              <div
                                key={oIdx}
                                className={`px-2 py-0.5 rounded ${
                                  opt === q.correct_answer ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-white'
                                }`}
                              >
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}
                        {q.explanation && (
                          <p className="text-[10.5px] text-slate-500 italic mt-1">
                            Key: {q.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={handleGenerateQuestions}
                      disabled={loadingQuestions}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-stone-100 cursor-pointer"
                    >
                      Regenerate
                    </button>
                    <button
                      type="button"
                      onClick={handleAcceptQuestions}
                      className="px-5 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <ListPlus className="w-4 h-4" />
                      <span>Apply Questions to Lesson</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
