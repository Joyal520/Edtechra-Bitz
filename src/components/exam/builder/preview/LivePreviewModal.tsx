// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: MODERN DIGITAL EXAM PREVIEW & VISUAL STUDIO
// Dual-Mode Experience:
// 1. [ Student Preview ]: Colorful, modern, compact 1400px student taking view
// 2. [ Teacher Edit ]: Visual card editing with [Edit], [Duplicate], [Delete] & [Publish]
// Features dedicated Cloze Passage, Reading, Audio/Video, and Picture Description UI
// ============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Monitor,
  Tablet,
  Smartphone,
  CheckCircle2,
  Bookmark,
  ArrowLeft,
  ArrowRight,
  Headphones,
  KeyRound,
  FileEdit,
  Type,
  RotateCcw,
  BookOpen,
  Pencil,
  Copy,
  Trash2,
  Send,
  Sparkles,
  Eye
} from 'lucide-react';
import {
  CanonicalAssessmentV2,
  CanonicalQuestion,
  MultipleChoiceQuestion
} from '../../shared/ExamSchema';
import { AssessmentThemeConfig } from '../../shared/themePresets';
import {
  flattenExamQuestions,
  calculateExamTotalMarks,
  FlattenedExamQuestion
} from '../../shared/scoringUtilities';
import { renderFormattedPrompt } from '../../shared/formattedText';
import { MCQQuestion } from '../../student/renderers/MCQQuestion';
import { TrueFalseQuestionComponent } from '../../student/renderers/TrueFalseQuestion';
import { FillBlankQuestionComponent } from '../../student/renderers/FillBlankQuestion';
import { ShortAnswerQuestionComponent } from '../../student/renderers/ShortAnswerQuestion';
import { ClozeQuestionComponent } from '../../student/renderers/ClozeQuestion';
import { EssayQuestionComponent } from '../../student/renderers/EssayQuestion';
import { QuestionVisualEditorModal } from '../modals/QuestionVisualEditorModal';
import { SimplePublishModal } from '../publishing/SimplePublishModal';
import { SimpleExamStudentView } from '../../student/SimpleExamStudentView';

interface LivePreviewModalProps {
  isOpen: boolean;
  assessment: CanonicalAssessmentV2;
  theme: AssessmentThemeConfig;
  onClose: () => void;
  onUpdateAssessment?: (updated: CanonicalAssessmentV2) => void;
  onPublishExam?: (settings: any) => void;
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';
type ViewMode = 'student' | 'teacher';

export const LivePreviewModal: React.FC<LivePreviewModalProps> = ({
  isOpen,
  assessment,
  onClose,
  onUpdateAssessment,
  onPublishExam
}) => {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [viewMode, setViewMode] = useState<ViewMode>('student');
  const [showAnswerKeys, setShowAnswerKeys] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mockAnswers, setMockAnswers] = useState<Record<string, any>>({});
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [showNotepad, setShowNotepad] = useState(false);
  const [notepadText, setNotepadText] = useState('');
  const [showStudentTranscript, setShowStudentTranscript] = useState(false);

  // Local live assessment state to allow immediate teacher editing updates
  const [liveAssessment, setLiveAssessment] = useState<CanonicalAssessmentV2>(assessment);
  const [editingQuestion, setEditingQuestion] = useState<CanonicalQuestion | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  // Synchronize when outer assessment changes
  useEffect(() => {
    setLiveAssessment(assessment);
  }, [assessment]);

  // When switching to student view, ensure answer keys are closed
  useEffect(() => {
    if (viewMode === 'student') {
      setShowAnswerKeys(false);
    }
  }, [viewMode]);

  // Effective answer key visibility: strictly prohibited in student preview
  const effectiveShowKeys = viewMode === 'teacher' && showAnswerKeys;

  // Helper for live word and character counts
  const getWordCount = (val: any): number => {
    if (!val || typeof val !== 'string') return 0;
    return val.trim().split(/\s+/).filter(Boolean).length;
  };

  const getCharCount = (val: any): number => {
    if (!val || typeof val !== 'string') return 0;
    return val.length;
  };

  // Flatten questions across all sections and activities
  const flattenedQuestions: FlattenedExamQuestion[] = useMemo(() => {
    return flattenExamQuestions(liveAssessment.sections);
  }, [liveAssessment.sections]);

  const currentQItem = flattenedQuestions[currentIndex] || flattenedQuestions[0];
  const totalQuestions = flattenedQuestions.length;

  // Dynamically calculate total marks from sections
  const totalMarks = useMemo(() => {
    return calculateExamTotalMarks(liveAssessment.sections);
  }, [liveAssessment.sections]);

  const handleSelectAnswer = (qId: string, value: any) => {
    setMockAnswers((prev) => ({
      ...prev,
      [qId]: value
    }));
  };

  // Countdown timer state for student preview
  const [liveTimerSeconds, setLiveTimerSeconds] = useState(
    (liveAssessment.exam.durationMinutes || 60) * 60
  );
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTimerSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine if the assessment conforms to the Simple Exam template
  const isSimpleExam = useMemo(() => {
    const typeStr = (liveAssessment.exam.examType || '').toLowerCase();
    const titleStr = (liveAssessment.exam.title || '').toLowerCase();
    const template = (liveAssessment as any).exam_template || (liveAssessment.exam as any)?.exam_template;
    if (template === 'simple' || typeStr.includes('simple') || titleStr.includes('simple')) {
      return true;
    }
    const allMCQ =
      flattenedQuestions.length > 0 &&
      flattenedQuestions.every((q) => q.question.type === 'multiple_choice');
    if (allMCQ && (flattenedQuestions.length === 25 || typeStr.includes('quick') || (flattenedQuestions[0]?.question?.marks === 4))) {
      return true;
    }
    return false;
  }, [liveAssessment, flattenedQuestions]);

  const handleToggleFlag = (qId: string) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  // Sections navigation tabs
  const sections = liveAssessment.sections && liveAssessment.sections.length > 0
    ? liveAssessment.sections
    : [{ id: 'sec-1', title: 'Section 1', questions: [] }];

  const isQuestionAnswered = (qId: string): boolean => {
    const ans = mockAnswers[qId];
    if (ans !== undefined && ans !== null) {
      if (typeof ans === 'string') return ans.trim().length > 0;
      if (Array.isArray(ans)) return ans.length > 0;
      if (typeof ans === 'object') {
        return Object.values(ans).some((v) => Boolean(v && String(v).trim().length > 0));
      }
      return true;
    }
    const subKeys = Object.keys(mockAnswers).filter((k) => k.startsWith(`${qId}_`));
    if (subKeys.length > 0) {
      return subKeys.some((k) => Boolean(mockAnswers[k] && String(mockAnswers[k]).trim().length > 0));
    }
    return false;
  };

  const answeredCount = flattenedQuestions.filter((q) => isQuestionAnswered(q.question.id)).length;

  // Teacher Edit Handlers
  const handleSaveQuestionChanges = (updatedQ: CanonicalQuestion) => {
    const updatedSections = liveAssessment.sections.map((sec) => {
      const hasQ = (sec.questions || []).some((q) => q.id === updatedQ.id);
      if (hasQ) {
        return {
          ...sec,
          questions: sec.questions.map((q) => (q.id === updatedQ.id ? updatedQ : q))
        };
      }
      return sec;
    });

    const updatedAssessment = { ...liveAssessment, sections: updatedSections };
    setLiveAssessment(updatedAssessment);
    onUpdateAssessment?.(updatedAssessment);
  };

  const handleDuplicateQuestion = () => {
    if (!currentQItem) return;
    const targetQ = currentQItem.question;
    const duplicatedQ: CanonicalQuestion = {
      ...JSON.parse(JSON.stringify(targetQ)),
      id: `${targetQ.id}_copy_${Date.now().toString(36).slice(-4)}`,
      question: `${targetQ.question} (Copy)`
    };

    const updatedSections = liveAssessment.sections.map((sec) => {
      if (sec.id === currentQItem.sectionId) {
        return {
          ...sec,
          questions: [...sec.questions, duplicatedQ]
        };
      }
      return sec;
    });

    const updatedAssessment = { ...liveAssessment, sections: updatedSections };
    setLiveAssessment(updatedAssessment);
    onUpdateAssessment?.(updatedAssessment);
  };

  const handleDeleteQuestion = () => {
    if (!currentQItem || totalQuestions <= 1) {
      alert('An examination must contain at least one question.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    const targetId = currentQItem.question.id;
    const updatedSections = liveAssessment.sections.map((sec) => ({
      ...sec,
      questions: (sec.questions || []).filter((q) => q.id !== targetId)
    }));

    const updatedAssessment = { ...liveAssessment, sections: updatedSections };
    setLiveAssessment(updatedAssessment);
    onUpdateAssessment?.(updatedAssessment);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  if (!isOpen) return null;

  const deviceWidthClass =
    device === 'mobile'
      ? 'max-w-[420px]'
      : device === 'tablet'
      ? 'max-w-3xl'
      : 'max-w-[1400px]';

  const fontClass =
    fontSize === 'xlarge'
      ? 'text-lg leading-relaxed'
      : fontSize === 'large'
      ? 'text-base leading-relaxed'
      : 'text-sm leading-relaxed';

  // Section Color Themes matching educational domains
  const getSectionColor = (title: string = '') => {
    const lower = title.toLowerCase();
    if (lower.includes('grammar') || lower.includes('language')) {
      return { bg: 'bg-indigo-600', text: 'text-white', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
    if (lower.includes('reading') || lower.includes('comprehension')) {
      return { bg: 'bg-emerald-600', text: 'text-white', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (lower.includes('cloze')) {
      return { bg: 'bg-teal-600', text: 'text-white', badge: 'bg-teal-50 text-teal-700 border-teal-200' };
    }
    if (lower.includes('listen') || lower.includes('audio')) {
      return { bg: 'bg-blue-600', text: 'text-white', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (lower.includes('picture') || lower.includes('image') || lower.includes('visual')) {
      return { bg: 'bg-amber-600', text: 'text-white', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    if (lower.includes('writ') || lower.includes('essay')) {
      return { bg: 'bg-purple-600', text: 'text-white', badge: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
    return { bg: 'bg-indigo-600', text: 'text-white', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  };

  const isPictureTask = Boolean(
    currentQItem?.parentActivityType === 'picture_description_activity' ||
    (currentQItem?.parentImageUrl && ['paragraph', 'essay', 'short_answer'].includes(currentQItem?.question.type)) ||
    (currentQItem?.question.type === 'image_question' && !(currentQItem?.question as any).options?.length)
  );
  const stimulusImageUrl = currentQItem?.parentImageUrl || (currentQItem?.question as any)?.imageUrl;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-md select-none overflow-hidden animate-fadeIn">
      {/* Top Device & Control Bar */}
      <div className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between z-20 shadow-2xs">
        {/* Left: Device Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              device === 'desktop'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Desktop View"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>

          <button
            type="button"
            onClick={() => setDevice('tablet')}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              device === 'tablet'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Tablet View"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tablet</span>
          </button>

          <button
            type="button"
            onClick={() => setDevice('mobile')}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              device === 'mobile'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Mobile View"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        {/* Center: Mode Toggle [ Student Preview ] vs [ Teacher Edit ] */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('student')}
            className={`px-3.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'student'
                ? 'bg-white text-indigo-600 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Student Preview</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('teacher')}
            className={`px-3.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'teacher'
                ? 'bg-indigo-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Teacher Edit</span>
          </button>
        </div>

        {/* Right: Answer Key, Publish & Close */}
        <div className="flex items-center gap-2">
          {viewMode === 'teacher' && (
            <button
              type="button"
              onClick={() => setShowAnswerKeys(!showAnswerKeys)}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                showAnswerKeys
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{showAnswerKeys ? 'Hide Keys' : 'Reveal Keys'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsPublishModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish Exam</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Exit Studio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Student Examination Viewport */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex justify-center custom-scrollbar bg-slate-100/70">
        {viewMode === 'student' && isSimpleExam ? (
          <div className={`w-full transition-all duration-300 rounded-3xl overflow-hidden shadow-xl my-auto ${deviceWidthClass}`}>
            <SimpleExamStudentView
              exam={liveAssessment as any}
              questions={flattenedQuestions}
              currentIndex={currentIndex}
              currentAnswer={mockAnswers[currentQItem?.question?.id]}
              answers={mockAnswers}
              bookmarkedIds={flaggedIds}
              timeRemainingSeconds={liveTimerSeconds}
              answeredCount={answeredCount}
              unansweredCount={Math.max(0, totalQuestions - answeredCount)}
              markedCount={flaggedIds.size}
              onAnswerChange={(val) => handleSelectAnswer(currentQItem.question.id, val)}
              onClearAnswer={() => handleSelectAnswer(currentQItem.question.id, undefined)}
              onPrevious={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              onNext={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
              onSelectIndex={(idx) => setCurrentIndex(idx)}
              onToggleBookmark={() => handleToggleFlag(currentQItem.question.id)}
              onSubmit={() => setIsPublishModalOpen(true)}
              onClose={onClose}
            />
          </div>
        ) : (
          <div
            className={`w-full transition-all duration-300 rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden flex flex-col my-auto ${deviceWidthClass}`}
          >
          {/* 1. Top Online Examination Header */}
          <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                E
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  {liveAssessment.exam.title || 'Official Digital Examination'}
                </h1>
                <span className="text-xs font-semibold text-slate-500">
                  {liveAssessment.exam.subject} • {liveAssessment.exam.grade} • {liveAssessment.exam.durationMinutes || 60} Minutes • {totalQuestions} Questions • {totalMarks} Total Marks
                </span>
              </div>
            </div>

            {/* Candidate / Mode Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-300 text-xs shadow-2xs">
              <span className="text-slate-600 font-bold">Mode:</span>
              <span className="font-black text-slate-900">
                {viewMode === 'teacher' ? 'Teacher Edit Studio' : 'Student Examination'}
              </span>
            </div>
          </div>

          {/* 2. Colorful Section Navigation Tabs */}
          <div className="px-6 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
            {sections.map((sec, sIdx) => {
              const color = getSectionColor(sec.title);
              const isSecCurrent = currentQItem?.sectionId === sec.id;

              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    const firstQIdx = flattenedQuestions.findIndex((q) => q.sectionId === sec.id);
                    if (firstQIdx !== -1) setCurrentIndex(firstQIdx);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    isSecCurrent
                      ? `${color.bg} text-white shadow-xs font-black`
                      : 'bg-white text-slate-800 hover:bg-slate-100 hover:text-slate-950 border border-slate-300 shadow-2xs'
                  }`}
                >
                  <span>{sec.title || `Section ${sIdx + 1}`}</span>
                </button>
              );
            })}
          </div>

          {/* 3. Main Examination Workspace: Left Question Area + Right Dashboard Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 items-start">
            {/* Left Question Area (70-75% width: 8 to 9 cols) */}
            <div className="lg:col-span-8 xl:col-span-9 p-5 sm:p-7 md:p-8 flex flex-col justify-start">
              {currentQItem ? (
                <div className="space-y-5 question-card question-content [color-scheme:light]">
                  {/* Teacher Edit Quick Toolbar */}
                  {viewMode === 'teacher' && (
                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center justify-between gap-2 animate-fadeIn">
                      <div className="flex items-center gap-2 text-xs font-black text-indigo-950">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <span>Teacher Edit Active</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingQuestion(currentQItem.question)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs transition-all active:scale-95"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDuplicateQuestion}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs transition-all active:scale-95"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Duplicate</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteQuestion}
                          className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs transition-all active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Question Meta Strip: Number, Marks, Flag */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                        Question {currentIndex + 1} of {totalQuestions}
                      </span>
                      <span className="text-xs font-bold text-slate-400">•</span>
                      <span className="text-xs font-bold text-slate-800">
                        {currentQItem.question.marks || 1} {Number(currentQItem.question.marks) === 1 ? 'Mark' : 'Marks'}
                      </span>
                      {currentQItem.sectionTitle && (
                        <>
                          <span className="text-xs font-bold text-slate-400 hidden sm:inline">•</span>
                          <span className="text-xs font-semibold text-slate-500 hidden sm:inline truncate max-w-[160px]">
                            {currentQItem.sectionTitle}
                          </span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleFlag(currentQItem.question.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                        flaggedIds.has(currentQItem.question.id)
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-white text-slate-800 hover:bg-amber-50 hover:text-amber-800 border border-slate-300'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${flaggedIds.has(currentQItem.question.id) ? 'fill-current' : ''}`} />
                      <span className="hidden sm:inline">{flaggedIds.has(currentQItem.question.id) ? 'Marked for Review' : 'Flag for Review'}</span>
                      <span className="sm:hidden">{flaggedIds.has(currentQItem.question.id) ? 'Flagged' : 'Flag'}</span>
                    </button>
                  </div>

                  {/* 1. Picture Description Specific Layout */}
                  {isPictureTask && stimulusImageUrl ? (
                    <div className="space-y-4">
                      <div className="max-w-[760px] mx-auto w-full rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-2xs">
                        <img
                          src={stimulusImageUrl}
                          alt="Picture stimulus"
                          className="w-full max-h-[360px] object-contain mx-auto"
                        />
                      </div>

                      <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-2">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                          {currentQItem.question.question}
                        </p>
                        {currentQItem.rubric && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-indigo-100/80">
                            <span className="text-[10px] font-black uppercase text-indigo-800 tracking-wider">
                              Rubric Criteria:
                            </span>
                            {currentQItem.rubric.content !== undefined && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-900 shadow-2xs">
                                Content ({String(currentQItem.rubric.content)}m)
                              </span>
                            )}
                            {currentQItem.rubric.vocabulary !== undefined && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-900 shadow-2xs">
                                Vocabulary ({String(currentQItem.rubric.vocabulary)}m)
                              </span>
                            )}
                            {currentQItem.rubric.grammar !== undefined && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-900 shadow-2xs">
                                Grammar ({String(currentQItem.rubric.grammar)}m)
                              </span>
                            )}
                            {currentQItem.rubric.organization !== undefined && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-900 shadow-2xs">
                                Organization ({String(currentQItem.rubric.organization)}m)
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 answer-area">
                        <textarea
                          rows={6}
                          value={mockAnswers[currentQItem.question.id] || ''}
                          onChange={(e) => handleSelectAnswer(currentQItem.question.id, e.target.value)}
                          placeholder="Write your description here..."
                          className="w-full p-4 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed shadow-2xs resize-y min-h-[180px] max-h-[240px]"
                        />
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1">
                          <span>Write clearly and describe the key details.</span>
                          <span className="font-mono text-slate-700 font-bold">
                            {getWordCount(mockAnswers[currentQItem.question.id])} words • {getCharCount(mockAnswers[currentQItem.question.id])} characters
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 2. Standard Question Flow (Cloze, Reading, Audio, MCQ, Text) */
                    <div className="space-y-4">
                      {/* Reading Passage Context */}
                      {currentQItem.parentPassage && currentQItem.question.type !== 'cloze_passage' && (
                        <div className="p-5 sm:p-6 rounded-2xl bg-teal-50/40 border border-teal-200 text-slate-900 space-y-2.5">
                          <div className="flex items-center gap-2 text-teal-900 text-xs font-black uppercase tracking-wider">
                            <BookOpen className="w-4 h-4 text-teal-600 shrink-0" />
                            <span>Reading Passage: {currentQItem.parentPassageTitle || 'Comprehension Text'}</span>
                          </div>
                          <div className="max-w-[72ch] text-xs sm:text-sm text-slate-800 leading-[1.6] font-serif whitespace-pre-wrap selection:bg-teal-100">
                            {currentQItem.parentPassage}
                          </div>
                        </div>
                      )}

                      {/* Audio Track Context */}
                      {currentQItem.parentAudioUrl && (
                        <div className="p-4 rounded-2xl bg-violet-50/40 border border-violet-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-violet-950 flex items-center gap-1.5">
                              <Headphones className="w-4 h-4 text-violet-700" />
                              <span>Listening Activity: {currentQItem.parentActivityTitle || 'Audio Track'}</span>
                            </span>

                            {(currentQItem.showTranscriptToStudents || showAnswerKeys) && (
                              <button
                                type="button"
                                onClick={() => setShowStudentTranscript(!showStudentTranscript)}
                                className="text-xs font-bold text-violet-800 hover:text-violet-950 cursor-pointer"
                              >
                                {showStudentTranscript ? 'Hide Transcript' : 'Show Transcript'}
                              </button>
                            )}
                          </div>

                          <audio controls className="w-full h-10 rounded-lg accent-violet-600">
                            <source src={currentQItem.parentAudioUrl} />
                            Your browser does not support audio playback.
                          </audio>

                          {showStudentTranscript && currentQItem.parentTranscript && (
                            <div className="p-3 bg-white rounded-xl border border-violet-200 text-xs text-slate-800 font-medium leading-relaxed animate-fadeIn">
                              <span className="text-[10px] font-black uppercase tracking-wider text-violet-700 block mb-1">
                                Audio Transcript:
                              </span>
                              {currentQItem.parentTranscript}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Question Prompt */}
                      <div className="space-y-2">
                        <h3 className={`font-black text-slate-900 ${fontClass}`}>
                          {renderFormattedPrompt(currentQItem.question.question, {
                            isMCQ: currentQItem.question.type === 'multiple_choice',
                            isFillBlank: currentQItem.question.type === 'fill_in_blank',
                            inlineInputValue: currentQItem.question.type === 'fill_in_blank' ? mockAnswers[currentQItem.question.id] : undefined,
                            onInlineInputChange: currentQItem.question.type === 'fill_in_blank' ? (val) => handleSelectAnswer(currentQItem.question.id, val) : undefined
                          })}
                        </h3>

                        {/* Multiple Choice Options */}
                        {['multiple_choice', 'checkboxes', 'dropdown'].includes(currentQItem.question.type) && (
                          <MCQQuestion
                            question={currentQItem.question as MultipleChoiceQuestion}
                            currentAnswer={mockAnswers[currentQItem.question.id]}
                            onAnswerChange={(val) => handleSelectAnswer(currentQItem.question.id, val)}
                            showAnswerKey={effectiveShowKeys}
                          />
                        )}

                        {/* True / False Selection */}
                        {currentQItem.question.type === 'true_false' && (
                          <TrueFalseQuestionComponent
                            question={currentQItem.question as any}
                            currentAnswer={mockAnswers[currentQItem.question.id]}
                            onAnswerChange={(val) => handleSelectAnswer(currentQItem.question.id, val)}
                            showAnswerKey={effectiveShowKeys}
                          />
                        )}

                        {/* Fill in Blank */}
                        {currentQItem.question.type === 'fill_in_blank' && (
                          <FillBlankQuestionComponent
                            question={currentQItem.question as any}
                            currentAnswer={mockAnswers[currentQItem.question.id]}
                            onAnswerChange={(val) => handleSelectAnswer(currentQItem.question.id, val)}
                            showAnswerKey={effectiveShowKeys}
                          />
                        )}

                        {/* Cloze Passage Component */}
                        {currentQItem.question.type === 'cloze_passage' && (
                          <ClozeQuestionComponent
                            question={currentQItem.question as any}
                            currentAnswer={mockAnswers[currentQItem.question.id] || {}}
                            onAnswerChange={(val) => handleSelectAnswer(currentQItem.question.id, val)}
                            showAnswerKey={effectiveShowKeys}
                          />
                        )}

                        {/* Short Answer */}
                        {currentQItem.question.type === 'short_answer' && (
                          <ShortAnswerQuestionComponent
                            question={currentQItem.question as any}
                            currentAnswer={mockAnswers[currentQItem.question.id]}
                            onAnswerChange={(val) => handleSelectAnswer(currentQItem.question.id, val)}
                            showAnswerKey={effectiveShowKeys}
                          />
                        )}

                        {/* Long Writing / Essay */}
                        {['paragraph', 'essay'].includes(currentQItem.question.type) && (
                          <EssayQuestionComponent
                            question={currentQItem.question as any}
                            currentAnswer={mockAnswers[currentQItem.question.id]}
                            onAnswerChange={(val) => handleSelectAnswer(currentQItem.question.id, val)}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bottom Navigation Controls: Previous / Clear / Flag / Next */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={currentIndex === 0}
                      onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                      className="px-4 py-2 rounded-xl border border-slate-300 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-slate-800 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={mockAnswers[currentQItem.question.id] === undefined || mockAnswers[currentQItem.question.id] === ''}
                        onClick={() => handleSelectAnswer(currentQItem.question.id, undefined)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 hover:text-rose-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Clear answer for this question"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Clear</span>
                      </button>

                      <button
                        type="button"
                        disabled={currentIndex === totalQuestions - 1}
                        onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <span>Next</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 font-semibold text-sm">
                  No questions in this assessment.
                </div>
              )}
            </div>

            {/* Right Dashboard Sidebar (25-30% width: 3 to 4 cols) */}
            <div className="lg:col-span-4 xl:col-span-3 p-5 sm:p-6 bg-slate-50/70 space-y-5">
              {/* Time Remaining Card */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                  Time Remaining
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {liveAssessment.exam.durationMinutes || 60}:00
                </div>
              </div>

              {/* Progress Summary Chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-slate-900">
                  <span>Exam Progress</span>
                  <span>{Math.round((answeredCount / (totalQuestions || 1)) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${(answeredCount / (totalQuestions || 1)) * 100}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px] text-center font-bold">
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                    <div className="text-sm font-black">{answeredCount}</div>
                    <div>Answered</div>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                    <div className="text-sm font-black">{flaggedIds.size}</div>
                    <div>Marked</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700">
                    <div className="text-sm font-black">{Math.max(0, totalQuestions - answeredCount)}</div>
                    <div>Remaining</div>
                  </div>
                </div>
              </div>

              {/* Question Palette Grid */}
              <div className="space-y-2">
                <span className="text-xs font-black text-slate-900 block">
                  Question Navigator
                </span>
                <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-1.5 max-h-56 overflow-y-auto pr-0.5">
                  {flattenedQuestions.map((q, idx) => {
                    const isCurrent = currentIndex === idx;
                    const isAnswered = isQuestionAnswered(q.question.id);
                    const isFlagged = flaggedIds.has(q.question.id);

                    let bgClass = 'bg-white text-slate-900 font-bold border-slate-300 hover:border-indigo-400 shadow-2xs';
                    if (isFlagged) {
                      bgClass = 'bg-amber-500 text-white font-black border-amber-500 shadow-xs';
                    } else if (isAnswered) {
                      bgClass = 'bg-emerald-500 text-white font-black border-emerald-500 shadow-xs';
                    }

                    return (
                      <button
                        key={q.question.id}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-8 rounded-lg text-xs font-bold border flex items-center justify-center transition-all cursor-pointer ${bgClass} ${
                          isCurrent ? 'ring-2 ring-indigo-600 ring-offset-1' : ''
                        }`}
                        title={`Question ${idx + 1}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Student Tools: Font size & Notepad */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <Type className="w-3.5 h-3.5 text-slate-500" />
                    <span>Text Size:</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setFontSize('normal')}
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        fontSize === 'normal' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      A
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontSize('large')}
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        fontSize === 'large' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      A+
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNotepad(!showNotepad)}
                  className="w-full py-1.5 px-3 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <FileEdit className="w-3.5 h-3.5 text-slate-600" />
                  <span>{showNotepad ? 'Hide Scratchpad' : 'Open Scratchpad'}</span>
                </button>

                {showNotepad && (
                  <textarea
                    rows={3}
                    value={notepadText}
                    onChange={(e) => setNotepadText(e.target.value)}
                    placeholder="Rough scratch notes for this exam..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-500 resize-none leading-relaxed shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 animate-fadeIn"
                  />
                )}
              </div>

              {/* Submit Exam Button */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <button
                  type="button"
                  onClick={() => alert(`Exam Submitted in Preview Mode! ${answeredCount} of ${totalQuestions} questions answered.`)}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Exam</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Exam to Students</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

      {/* Visual Question Editor Modal */}
      <QuestionVisualEditorModal
        isOpen={Boolean(editingQuestion)}
        question={editingQuestion}
        onClose={() => setEditingQuestion(null)}
        onSaveQuestion={handleSaveQuestionChanges}
      />

      {/* Simplified Publishing Dialog */}
      <SimplePublishModal
        isOpen={isPublishModalOpen}
        examTitle={liveAssessment.exam.title}
        totalQuestions={totalQuestions}
        totalMarks={flattenedQuestions.reduce((acc, q) => acc + (Number(q.question.marks) || 1), 0)}
        durationMinutes={liveAssessment.exam.durationMinutes || 60}
        onClose={() => setIsPublishModalOpen(false)}
        onConfirmPublish={(settings) => {
          setIsPublishModalOpen(false);
          if (onPublishExam) {
            onPublishExam(settings);
          } else {
            alert('Assessment published successfully to classroom students!');
            onClose();
          }
        }}
      />
    </div>
  );
};
