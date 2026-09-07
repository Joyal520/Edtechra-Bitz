// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: STUDENT EXAM SESSION
// Full examination environment with server-authoritative timer, autosave,
// question navigation, and secure grading.
// ============================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';
import { CanonicalExamV1 } from '../shared/ExamSchema';
import { flattenExamQuestions, FlattenedExamQuestion } from '../shared/scoringUtilities';
import { ExamHeader, SyncState } from './ExamHeader';
import { QuestionNavigator } from './QuestionNavigator';
import { QuestionRenderer } from './QuestionRenderer';
import { SubmitDialog } from './SubmitDialog';
import { ExamInstructions } from './ExamInstructions';
import { ExamResultView } from './ExamResultView';
import { SimpleExamStudentView } from './SimpleExamStudentView';

export interface ExamSessionAttemptData {
  attemptId?: string;
  startedAt?: string;
  expiresAt?: string;
  savedAnswers?: Record<string, any>;
  bookmarkedIds?: string[];
  durationMinutes: number;
}

interface ExamSessionProps {
  exam: CanonicalExamV1;
  classroomId?: string;
  isPreview?: boolean; // When teacher is testing as student
  attemptData?: ExamSessionAttemptData | null;
  onStartAttempt?: (password?: string) => Promise<ExamSessionAttemptData>;
  onAutosaveAnswers?: (answers: Record<string, any>, bookmarkedIds: string[]) => Promise<void>;
  onSubmitExam?: (answers: Record<string, any>) => Promise<any>;
  onClose: () => void;
}

export const ExamSession: React.FC<ExamSessionProps> = ({
  exam,
  classroomId: _classroomId,
  isPreview = false,
  attemptData,
  onStartAttempt,
  onAutosaveAnswers,
  onSubmitExam,
  onClose
}) => {
  // Flatten all questions across sections
  const flattenedQuestions: FlattenedExamQuestion[] = useMemo(() => {
    return flattenExamQuestions(exam.sections);
  }, [exam.sections]);

  // Session Lifecycle State: 'instructions' | 'taking' | 'submitted'
  const [sessionPhase, setSessionPhase] = useState<'instructions' | 'taking' | 'submitted'>(
    attemptData?.startedAt || isPreview ? 'taking' : 'instructions'
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>(attemptData?.savedAnswers || {});
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(
    new Set(attemptData?.bookmarkedIds || [])
  );

  // Time Remaining State (in seconds)
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(() => {
    if (attemptData?.expiresAt) {
      const remaining = Math.max(0, Math.floor((new Date(attemptData.expiresAt).getTime() - Date.now()) / 1000));
      return remaining;
    }
    return (exam.exam.durationMinutes || 45) * 60;
  });

  const [syncState, setSyncState] = useState<SyncState>('saved');
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalResult, setFinalResult] = useState<any | null>(null);

  const autosaveTimerRef = useRef<any>(null);
  const expiryTimestampRef = useRef<number | null>(
    attemptData?.expiresAt ? new Date(attemptData.expiresAt).getTime() : null
  );

  // 1. Authoritative Countdown Timer Effect
  useEffect(() => {
    if (sessionPhase !== 'taking') return;

    const interval = setInterval(() => {
      if (expiryTimestampRef.current) {
        const remaining = Math.max(0, Math.floor((expiryTimestampRef.current - Date.now()) / 1000));
        setTimeRemainingSeconds(remaining);

        if (remaining <= 0) {
          clearInterval(interval);
          handleAutoSubmitOnExpiry();
        }
      } else {
        // Fallback local decrement if offline or preview
        setTimeRemainingSeconds(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleAutoSubmitOnExpiry();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionPhase]);

  // 2. Debounced Autosave Sync Loop
  const triggerAutosave = (newAnswers: Record<string, any>, newBookmarks: Set<string>) => {
    if (isPreview || !onAutosaveAnswers) {
      setSyncState('saved');
      return;
    }

    setSyncState('saving');
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(async () => {
      try {
        await onAutosaveAnswers(newAnswers, Array.from(newBookmarks));
        setSyncState('saved');
      } catch (err) {
        console.warn('[ExamSession] Autosave notice:', err);
        setSyncState('offline');
      }
    }, 1000); // 1-second debounce
  };

  const handleAnswerChange = (val: any) => {
    const currentQ = flattenedQuestions[currentIndex];
    if (!currentQ) return;

    const qId = currentQ.question.id;
    const updated = { ...answers, [qId]: val };
    setAnswers(updated);
    triggerAutosave(updated, bookmarkedIds);
  };

  const handleToggleBookmark = () => {
    const currentQ = flattenedQuestions[currentIndex];
    if (!currentQ) return;

    const qId = currentQ.question.id;
    const next = new Set(bookmarkedIds);
    if (next.has(qId)) {
      next.delete(qId);
    } else {
      next.add(qId);
    }
    setBookmarkedIds(next);
    triggerAutosave(answers, next);
  };

  // 3. Begin Examination Action
  const handleBeginExam = async (password?: string) => {
    if (isPreview) {
      setSessionPhase('taking');
      return;
    }

    if (!onStartAttempt) {
      setSessionPhase('taking');
      return;
    }

    setIsStarting(true);
    try {
      const data = await onStartAttempt(password);
      if (data?.expiresAt) {
        expiryTimestampRef.current = new Date(data.expiresAt).getTime();
        const rem = Math.max(0, Math.floor((expiryTimestampRef.current - Date.now()) / 1000));
        setTimeRemainingSeconds(rem);
      }
      if (data?.savedAnswers) setAnswers(data.savedAnswers);
      if (data?.bookmarkedIds) setBookmarkedIds(new Set(data.bookmarkedIds));

      setSessionPhase('taking');
    } catch (err: any) {
      alert(err.message || 'Failed to start examination session.');
    } finally {
      setIsStarting(false);
    }
  };

  // 4. Auto-Submit on Expiry
  const handleAutoSubmitOnExpiry = async () => {
    console.warn('[ExamSession] Authoritative time expired. Triggering auto-submit.');
    await performSubmission();
  };

  // 5. Final Submission
  const performSubmission = async () => {
    setIsSubmitting(true);
    setShowSubmitConfirm(false);

    try {
      if (isPreview || !onSubmitExam) {
        // Simulate grading in Preview mode
        const totalMarks = flattenedQuestions.reduce((acc, q) => acc + (q.question.marks || 1), 0);
        let correctCount = 0;
        const breakdown = flattenedQuestions.map((q) => {
          const studentAns = answers[q.question.id];
          const isCorrect = studentAns !== undefined && studentAns !== null && String(studentAns).trim().length > 0;
          if (isCorrect) correctCount++;
          return {
            questionId: q.question.id,
            questionType: q.question.type,
            questionText: q.question.question,
            score: isCorrect ? (q.question.marks || 1) : 0,
            maxScore: q.question.marks || 1,
            isCorrect,
            submittedAnswer: studentAns || '(Unanswered)',
            correctAnswer: (q.question as any).correctAnswer,
            explanation: q.question.explanation
          };
        });

        const score = breakdown.reduce((acc, b) => acc + b.score, 0);
        const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

        setFinalResult({
          score,
          maxScore: totalMarks,
          percentage,
          grade: percentage >= 80 ? 'A' : percentage >= 60 ? 'B' : 'Pass',
          passed: percentage >= (exam.exam.passPercentage || 40),
          breakdown
        });
        setSessionPhase('submitted');
        return;
      }

      const result = await onSubmitExam(answers);
      setFinalResult(result);
      setSessionPhase('submitted');
    } catch (err: any) {
      alert(err.message || 'Failed to submit exam.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Statistics
  const answeredCount = useMemo(() => {
    return flattenedQuestions.filter(q => {
      const a = answers[q.question.id];
      return a !== undefined && a !== null && String(a).trim().length > 0 && !(Array.isArray(a) && a.length === 0);
    }).length;
  }, [answers, flattenedQuestions]);

  const unansweredCount = flattenedQuestions.length - answeredCount;
  const markedCount = bookmarkedIds.size;

  // Phase: Instructions Screen
  if (sessionPhase === 'instructions') {
    return (
      <ExamInstructions
        exam={exam}
        isStarting={isStarting}
        onBeginExam={handleBeginExam}
        onClose={onClose}
      />
    );
  }

  // Phase: Final Result Screen
  if (sessionPhase === 'submitted' && finalResult) {
    return (
      <ExamResultView
        result={finalResult}
        examTitle={exam.exam.title}
        showMarksImmediately={exam.exam.showMarksImmediately}
        showCorrectAnswers={exam.exam.showCorrectAnswers}
        onReturnToClassroom={onClose}
      />
    );
  }

  const currentQ = flattenedQuestions[currentIndex];
  const isBookmarked = currentQ ? bookmarkedIds.has(currentQ.question.id) : false;

  // Section Navigation List
  const sectionsList = useMemo(() => {
    return exam.sections.map((sec, idx) => {
      const firstQIndex = flattenedQuestions.findIndex(q => q.sectionId === sec.id);
      const isCurrent = currentQ ? currentQ.sectionId === sec.id : idx === 0;
      return {
        id: sec.id,
        title: sec.title || `Section ${String.fromCharCode(65 + idx)}`,
        firstQIndex: firstQIndex >= 0 ? firstQIndex : 0,
        isCurrent
      };
    });
  }, [exam.sections, flattenedQuestions, currentQ]);

  const handleClearCurrentAnswer = () => {
    if (currentQ) {
      handleAnswerChange(undefined);
    }
  };

  // Check if exam conforms to Simple Exam template
  const isSimpleExam = useMemo(() => {
    const typeStr = (exam.exam.examType || '').toLowerCase();
    const titleStr = (exam.exam.title || '').toLowerCase();
    const template = (exam as any).exam_template || (exam.exam as any)?.exam_template;
    if (template === 'simple' || typeStr.includes('simple') || titleStr.includes('simple')) {
      return true;
    }
    const allMCQ =
      flattenedQuestions.length > 0 &&
      flattenedQuestions.every((q) => q.question.type === 'multiple_choice');
    if (allMCQ && (flattenedQuestions.length === 25 || typeStr.includes('quick'))) {
      return true;
    }
    return false;
  }, [exam, flattenedQuestions]);

  // Render dedicated Simple Exam student UI when applicable
  if (isSimpleExam && currentQ) {
    return (
      <div className="relative min-h-screen bg-gradient-to-b from-[#eef6ff] via-[#f7faff] to-[#eaf3fe]">
        {/* Preview Watermark Badge if Teacher is Previewing */}
        {isPreview && (
          <div className="bg-amber-50 border-b border-amber-200 py-1.5 px-4 text-center text-xs font-bold text-amber-900 flex items-center justify-center gap-2">
            <span>TEACHER PREVIEW MODE — Student scores will not be recorded</span>
            <button
              type="button"
              onClick={onClose}
              className="underline text-amber-950 hover:text-indigo-600 font-semibold cursor-pointer ml-2"
            >
              Exit Preview
            </button>
          </div>
        )}

        <SimpleExamStudentView
          exam={exam}
          questions={flattenedQuestions}
          currentIndex={currentIndex}
          currentAnswer={answers[currentQ.question.id]}
          answers={answers}
          bookmarkedIds={bookmarkedIds}
          timeRemainingSeconds={timeRemainingSeconds}
          syncState={syncState}
          answeredCount={answeredCount}
          unansweredCount={unansweredCount}
          markedCount={markedCount}
          onAnswerChange={handleAnswerChange}
          onClearAnswer={() => handleAnswerChange(undefined)}
          onPrevious={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          onNext={() => setCurrentIndex((prev) => Math.min(flattenedQuestions.length - 1, prev + 1))}
          onSelectIndex={(idx) => setCurrentIndex(idx)}
          onToggleBookmark={handleToggleBookmark}
          onSubmit={() => setShowSubmitConfirm(true)}
          onClose={onClose}
        />

        {/* Submit Confirmation Dialog */}
        <SubmitDialog
          isOpen={showSubmitConfirm}
          totalQuestions={flattenedQuestions.length}
          answeredCount={answeredCount}
          unansweredCount={unansweredCount}
          markedForReviewCount={markedCount}
          isSubmitting={isSubmitting}
          onClose={() => setShowSubmitConfirm(false)}
          onConfirmSubmit={performSubmission}
        />
      </div>
    );
  }

  return (
    <div
      data-student-exam="true"
      className="edtechra-student-exam min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none animate-fadeIn [color-scheme:light]"
      style={{ colorScheme: 'light' }}
    >
      {/* Top Authoritative Header */}
      <ExamHeader
        title={exam.exam.title}
        currentIndex={currentIndex}
        totalCount={flattenedQuestions.length}
        timeRemainingSeconds={timeRemainingSeconds}
        syncState={syncState}
        onToggleNavigator={() => setNavigatorOpen(prev => !prev)}
        navigatorOpen={navigatorOpen}
      />

      {/* Section Navigation Strip */}
      {sectionsList.length > 1 && (
        <nav
          aria-label="Exam Sections Navigation"
          className="sticky top-[57px] z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-2 shadow-2xs"
        >
          <div className="max-w-[1400px] mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
              Sections:
            </span>
            {sectionsList.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setCurrentIndex(sec.firstQIndex)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                  sec.isCurrent
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {sec.title}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Preview Watermark Badge if Teacher is Previewing */}
      {isPreview && (
        <div className="bg-amber-50 border-b border-amber-200 py-1.5 px-4 text-center text-xs font-bold text-amber-900 flex items-center justify-center gap-2">
          <span>TEACHER PREVIEW MODE — Student scores will not be recorded</span>
          <button
            type="button"
            onClick={onClose}
            className="underline text-amber-950 hover:text-indigo-600 font-semibold cursor-pointer ml-2"
          >
            Exit Preview
          </button>
        </div>
      )}

      {/* Main Examination Workspace */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto p-3 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* Left / Center: Question Renderer Container (approx 70-75% width) */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {currentQ ? (
            <QuestionRenderer
              questionItem={currentQ}
              currentAnswer={answers[currentQ.question.id]}
              onAnswerChange={handleAnswerChange}
            />
          ) : (
            <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              No questions available in this examination.
            </div>
          )}

          {/* Question Navigation Controls (Previous / Clear / Bookmark / Next) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearCurrentAnswer}
                disabled={answers[currentQ?.question?.id] === undefined || answers[currentQ?.question?.id] === null || answers[currentQ?.question?.id] === ''}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                title="Clear answer for this question"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Answer</span>
              </button>

              <button
                type="button"
                onClick={handleToggleBookmark}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95 ${
                  isBookmarked
                    ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 hover:text-amber-700 hover:bg-amber-50/50 border-slate-200'
                }`}
                title={isBookmarked ? 'Remove review flag' : 'Flag to review before submitting'}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">{isBookmarked ? 'Marked' : 'Mark for Review'}</span>
              </button>
            </div>

            {currentIndex < flattenedQuestions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex(prev => Math.min(flattenedQuestions.length - 1, prev + 1))}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(true)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Exam</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Question Navigator Panel (Sticky on Desktop, approx 25-30% width) */}
        <div className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-20">
          <QuestionNavigator
            questions={flattenedQuestions}
            currentIndex={currentIndex}
            answers={answers}
            bookmarkedIds={bookmarkedIds}
            onSelectIndex={setCurrentIndex}
            timeRemainingSeconds={timeRemainingSeconds}
            onSubmitExam={() => setShowSubmitConfirm(true)}
          />
        </div>

        {/* Mobile Question Navigator Drawer */}
        {navigatorOpen && (
          <div className="fixed inset-0 z-50 lg:hidden bg-slate-950/80 backdrop-blur-md p-4 flex items-center justify-center animate-fadeIn">
            <div className="w-full max-w-sm">
              <QuestionNavigator
                questions={flattenedQuestions}
                currentIndex={currentIndex}
                answers={answers}
                bookmarkedIds={bookmarkedIds}
                onSelectIndex={setCurrentIndex}
                timeRemainingSeconds={timeRemainingSeconds}
                onSubmitExam={() => setShowSubmitConfirm(true)}
                onClose={() => setNavigatorOpen(false)}
              />
            </div>
          </div>
        )}
      </main>

      {/* Submit Confirmation Dialog */}
      <SubmitDialog
        isOpen={showSubmitConfirm}
        totalQuestions={flattenedQuestions.length}
        answeredCount={answeredCount}
        unansweredCount={unansweredCount}
        markedForReviewCount={markedCount}
        isSubmitting={isSubmitting}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirmSubmit={performSubmission}
      />
    </div>
  );
};
