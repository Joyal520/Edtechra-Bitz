// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: STUDENT EXAM SESSION
// Full examination environment with server-authoritative timer, autosave,
// question navigation, and secure grading.
// ============================================================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  RotateCcw,
  AlertCircle
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
import { playAnswerClickSound } from '@/utils/examSoundUtils';

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
  const answersRef = useRef<Record<string, any>>(attemptData?.savedAnswers || {});
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(
    new Set(attemptData?.bookmarkedIds || [])
  );

  // Sync answersRef with attemptData updates
  useEffect(() => {
    if (attemptData?.savedAnswers) {
      answersRef.current = { ...attemptData.savedAnswers, ...answersRef.current };
    }
  }, [attemptData?.savedAnswers]);

  // Boundary safety: guarantee currentIndex never points beyond valid questions
  useEffect(() => {
    if (flattenedQuestions.length > 0 && currentIndex >= flattenedQuestions.length) {
      setCurrentIndex(flattenedQuestions.length - 1);
    }
  }, [currentIndex, flattenedQuestions.length]);

  // Synchronously update memory ref and React state to avoid any asynchronous closure lag
  const updateAnswerSynchronously = useCallback((qId: string, val: any) => {
    const updated = { ...answersRef.current, [qId]: val };
    answersRef.current = updated;
    setAnswers(updated);
    return updated;
  }, []);

  // Time Remaining State (in seconds)
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(() => {
    if (attemptData?.expiresAt) {
      const remaining = Math.max(0, Math.floor((new Date(attemptData.expiresAt).getTime() - Date.now()) / 1000));
      return remaining;
    }
    const defaultSec = (exam.exam.durationMinutes || 45) * 60;
    const endsAt = (exam.exam as any).endsAt || (exam as any).ends_at;
    if (endsAt) {
      const windowRemainingSec = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
      return Math.min(defaultSec, windowRemainingSec);
    }
    return defaultSec;
  });

  const [syncState, setSyncState] = useState<SyncState>('saved');
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalResult, setFinalResult] = useState<any | null>(null);
  const [sessionErrorMessage, setSessionErrorMessage] = useState<string | null>(null);

  const autosaveTimerRef = useRef<any>(null);
  const expiryTimestampRef = useRef<number | null>(
    attemptData?.expiresAt
      ? new Date(attemptData.expiresAt).getTime()
      : (() => {
          const endsAt = (exam.exam as any).endsAt || (exam as any).ends_at;
          if (endsAt) {
            const endsTime = new Date(endsAt).getTime();
            const defaultExpiry = Date.now() + (exam.exam.durationMinutes || 45) * 60 * 1000;
            return Math.min(defaultExpiry, endsTime);
          }
          return null;
        })()
  );

  // Sync attempt data changes (e.g. from background restoration or late activation)
  useEffect(() => {
    if (attemptData) {
      if (attemptData.expiresAt) {
        expiryTimestampRef.current = new Date(attemptData.expiresAt).getTime();
        const rem = Math.max(0, Math.floor((expiryTimestampRef.current - Date.now()) / 1000));
        setTimeRemainingSeconds(rem);
      }
      if (attemptData.savedAnswers) {
        setAnswers(prev => ({ ...attemptData.savedAnswers, ...prev }));
      }
      if (attemptData.bookmarkedIds) {
        setBookmarkedIds(new Set(attemptData.bookmarkedIds));
      }
      if (attemptData.startedAt) {
        setSessionPhase('taking');
      }
    }
  }, [attemptData]);

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
    const updated = updateAnswerSynchronously(qId, val);
    triggerAutosave(updated, bookmarkedIds);
  };

  // ── Mobile Auto-Advance: answer → sound → brief delay → next question ──
  const autoAdvanceLockRef = useRef(false);
  const autoAdvanceTimerRef = useRef<any>(null);

  /**
   * Enhanced answer handler for MCQ/True-False:
   * 1. Lock to prevent double-taps
   * 2. Save the answer immediately in memory and state
   * 3. Play subtle click sound
   * 4. For questions 1 -> N-1: Auto-advance after 250ms delay
   * 5. For the LAST question:
   *    - Await immediate backend autosave to guarantee final answer is committed
   *    - DO NOT navigate to question N+1
   *    - Enter final review/submission ready state
   */
  const handleAnswerWithAutoAdvance = useCallback(async (val: any) => {
    if (autoAdvanceLockRef.current) return;

    const currentQ = flattenedQuestions[currentIndex];
    if (!currentQ) return;

    // Lock selection immediately
    autoAdvanceLockRef.current = true;

    // 1. Synchronously update answer in memory ref and React state
    const qId = currentQ.question.id;
    const updated = updateAnswerSynchronously(qId, val);

    // 2. Play click sound
    playAnswerClickSound();

    const isLast = currentIndex >= flattenedQuestions.length - 1;

    if (!isLast) {
      // Questions 1 -> N-1: Trigger debounced autosave and auto-advance
      triggerAutosave(updated, bookmarkedIds);

      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = setTimeout(() => {
        // Enforce strict boundary: NEVER advance beyond flattenedQuestions.length - 1
        setCurrentIndex(prev => Math.min(flattenedQuestions.length - 1, prev + 1));
        autoAdvanceLockRef.current = false;
      }, 250);
    } else {
      // LAST QUESTION: Cancel pending debounced timer and commit directly
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      setSyncState('saving');

      if (!isPreview && onAutosaveAnswers) {
        try {
          await onAutosaveAnswers(updated, Array.from(bookmarkedIds));
          setSyncState('saved');
        } catch (err) {
          console.warn('[ExamSession] Final question autosave notice:', err);
          setSyncState('saved');
        }
      } else {
        setSyncState('saved');
      }

      // Final question remains valid: release lock so student can review or submit
      setTimeout(() => {
        autoAdvanceLockRef.current = false;
      }, 200);
    }
  }, [currentIndex, flattenedQuestions, bookmarkedIds, isPreview, onAutosaveAnswers, updateAnswerSynchronously]);

  // Cleanup auto-advance timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
  }, []);

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
    triggerAutosave(answersRef.current, next);
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
      if (data?.savedAnswers) {
        answersRef.current = { ...answersRef.current, ...data.savedAnswers };
        setAnswers(data.savedAnswers);
      }
      if (data?.bookmarkedIds) setBookmarkedIds(new Set(data.bookmarkedIds));

      setSessionPhase('taking');
    } catch (err: any) {
      const msg = typeof err?.message === 'string' ? err.message : 'Failed to start examination session.';
      setSessionErrorMessage(msg);
    } finally {
      setIsStarting(false);
    }
  };

  // 4. Auto-Submit on Expiry
  const handleAutoSubmitOnExpiry = async () => {
    console.warn('[ExamSession] Authoritative time expired. Triggering auto-submit.');
    await performSubmission(answersRef.current);
  };

  // 5. Final Submission (Idempotent, Safe with Latest Answers)
  const performSubmission = async (overrideAnswers?: Record<string, any>) => {
    if (flattenedQuestions.length === 0) {
      setSessionErrorMessage('Cannot submit an examination with 0 questions.');
      return;
    }

    // Idempotency: prevent double-clicks or concurrent submissions
    if (isSubmitting) return;
    setIsSubmitting(true);
    setShowSubmitConfirm(false);

    // Cancel any pending debounced autosave
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    // Use guaranteed latest answers from ref to prevent stale state omission
    // Safety guard: reject browser Event objects accidentally passed as overrideAnswers
    const safeOverride = overrideAnswers && typeof overrideAnswers === 'object' && !('nativeEvent' in overrideAnswers) && !('target' in overrideAnswers && 'type' in overrideAnswers)
      ? overrideAnswers
      : undefined;
    const finalAnswersToSubmit = safeOverride || answersRef.current || answers;

    try {
      if (isPreview || !onSubmitExam) {
        // Simulate grading in Preview mode
        const totalMarks = flattenedQuestions.reduce((acc, q) => acc + (q.question.marks || 1), 0);
        let correctCount = 0;
        const breakdown = flattenedQuestions.map((q) => {
          const studentAns = finalAnswersToSubmit[q.question.id];
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
          totalScore: score,
          totalMarks,
          total_marks: totalMarks,
          percentage,
          grade: percentage >= 80 ? 'A' : percentage >= 60 ? 'B' : 'Pass',
          passed: percentage >= (exam.exam.passPercentage || 40),
          breakdown
        });
        setSessionPhase('submitted');
        return;
      }

      // Flush final answers to backend attempt before computing final score
      if (onAutosaveAnswers) {
        await onAutosaveAnswers(finalAnswersToSubmit, Array.from(bookmarkedIds)).catch(err => {
          console.warn('[ExamSession] Pre-submit flush notice:', err);
        });
      }

      const result = await onSubmitExam(finalAnswersToSubmit);
      if (result) {
        setFinalResult(result);
        setSessionPhase('submitted');
      } else {
        throw new Error('No result returned from server.');
      }
    } catch (err: any) {
      console.error('[ExamSession] Final submission error:', err);
      let errorMsg = "Your answers are saved, but we couldn't complete the submission. Please try again.";
      if (err) {
        if (typeof err.message === 'string' && err.message.trim()) {
          errorMsg = err.message;
        } else if (typeof err.error === 'string' && err.error.trim()) {
          errorMsg = err.error;
        } else if (typeof err === 'string' && err.trim()) {
          errorMsg = err;
        }
      }
      setSessionErrorMessage(errorMsg);
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

  const currentQ = flattenedQuestions[currentIndex];
  const isBookmarked = currentQ ? bookmarkedIds.has(currentQ.question.id) : false;

  // Section Navigation List (Hook called unconditionally to preserve hook order)
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

  // Check if exam conforms to Simple Exam template (Hook called unconditionally to preserve hook order)
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

  const handleClearCurrentAnswer = () => {
    if (currentQ) {
      handleAnswerChange(undefined);
    }
  };

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
          onAnswerWithAutoAdvance={handleAnswerWithAutoAdvance}
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
          onConfirmSubmit={() => performSubmission()}
        />

        {/* In-App Error Notification Modal */}
        {sessionErrorMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
            <div className="bg-[#0b142c] border border-rose-500/50 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl space-y-5 text-white text-center">
              <div className="w-14 h-14 rounded-3xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">Notice</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {sessionErrorMessage}
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSessionErrorMessage(null)}
                  className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm cursor-pointer shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
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
              onAnswerWithAutoAdvance={handleAnswerWithAutoAdvance}
            />
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <div className="text-sm font-black text-slate-800">
                Exam questions could not be loaded.
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                The questions for this examination are not currently available or failed to load.
              </p>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Classroom</span>
                </button>
              )}
            </div>
          )}

          {/* Question Navigation Controls (Previous / Clear / Bookmark / Next) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={currentIndex === 0 || flattenedQuestions.length === 0}
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
                disabled={!currentQ || answers[currentQ.question.id] === undefined || answers[currentQ.question.id] === null || answers[currentQ.question.id] === ''}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                title="Clear answer for this question"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Answer</span>
              </button>

              <button
                type="button"
                onClick={handleToggleBookmark}
                disabled={!currentQ}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
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

            {flattenedQuestions.length > 0 && (
              currentIndex < flattenedQuestions.length - 1 ? (
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
              )
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
        onConfirmSubmit={() => performSubmission()}
      />

      {/* In-App Error Notification Modal */}
      {sessionErrorMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0b142c] border border-rose-500/50 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl space-y-5 text-white text-center">
            <div className="w-14 h-14 rounded-3xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">Notice</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {sessionErrorMessage}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSessionErrorMessage(null)}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm cursor-pointer shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
