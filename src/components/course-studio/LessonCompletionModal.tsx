// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: LESSON COMPLETION CELEBRATION MODAL
// Premium, encouraging completion pop-up shown once per completed lesson.
// Differentiates messaging between Daily Release ON vs OFF, personalizes
// student greeting, awards points, and provides clean roadmap transition.
// ============================================================================

import React, { useEffect } from 'react';
import {
  CheckCircle2,
  Award,
  ArrowRight,
  X
} from 'lucide-react';
import { triggerConfettiBurst } from '@/utils/courseConfetti';
import { playCompleteSound } from '@/utils/courseAudio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  lessonTitle: string;
  lessonPosition?: number;
  pointsEarned?: number;
  progressPercent?: number;
  completedLessonsCount?: number;
  totalLessonsCount?: number;
  dailyReleaseEnabled?: boolean;
  onContinue: () => void;
}

const DAILY_RELEASE_MESSAGES = [
  'Excellent work! You’ve completed today’s lesson. Your next lesson will be ready tomorrow.',
  'Great job! Today’s learning is complete. Come back tomorrow for the next step.',
  'Another lesson completed! You’re building your progress one day at a time.',
  'Well done! You’ve finished today’s lesson. Keep going — your learning journey continues tomorrow.'
];

const NORMAL_RELEASE_MESSAGES = [
  'Great work! You’ve completed this lesson. Keep going!',
  'Excellent progress! One more lesson completed.',
  'Well done! You’re moving forward. Continue when you’re ready.'
];

export const LessonCompletionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  studentName,
  lessonTitle,
  lessonPosition = 1,
  pointsEarned = 10,
  progressPercent = 0,
  completedLessonsCount = 1,
  totalLessonsCount = 1,
  dailyReleaseEnabled = false,
  onContinue
}) => {
  useEffect(() => {
    if (isOpen) {
      playCompleteSound();
      const target = document.getElementById('celebration-modal-card');
      if (target) {
        setTimeout(() => triggerConfettiBurst(target), 150);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Clean student greeting
  const cleanName = studentName && studentName.trim() && !studentName.includes('@')
    ? studentName.trim().toUpperCase()
    : null;

  const greeting = cleanName ? `CONGRATULATIONS, ${cleanName}!` : 'CONGRATULATIONS!';

  // Pick deterministic encouraging message based on lesson position
  const messagesList = dailyReleaseEnabled ? DAILY_RELEASE_MESSAGES : NORMAL_RELEASE_MESSAGES;
  const encouragingMessage = messagesList[(lessonPosition - 1) % messagesList.length];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      {/* Modal Card - Mobile First */}
      <div
        id="celebration-modal-card"
        className="surface-elevated rounded-[28px] max-w-md w-full border border-[var(--theme-border-primary)] shadow-2xl overflow-hidden flex flex-col p-6 sm:p-8 text-center space-y-5 transition-all animate-in fade-in zoom-in-95 duration-200 box-border text-theme-primary"
      >
        {/* Top Close Button (Min 44x44px target) */}
        <div className="flex justify-end -mt-2 -mr-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-11 h-11 rounded-full text-theme-muted hover:text-theme-primary flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Large Celebration Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mx-auto shadow-lg ring-8 ring-emerald-100 dark:ring-emerald-950/60 animate-bounce duration-1000">
          <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
        </div>

        {/* Header Greeting & Lesson Title */}
        <div className="space-y-1.5">
          <h2 className="text-lg sm:text-xl font-black text-theme-primary tracking-tight break-words reader-title">
            {greeting}
          </h2>
          <p className="text-xs sm:text-sm font-bold text-theme-accent truncate reader-meta">
            {lessonTitle} • Lesson {lessonPosition}
          </p>
        </div>

        {/* Specific Daily vs Normal Release Messaging */}
        <div className="p-4 rounded-2xl bg-[var(--theme-surface-subtle)] border border-[var(--theme-border-subtle)] space-y-1.5 text-xs sm:text-sm">
          <p className="font-extrabold text-theme-primary reader-h3">
            {dailyReleaseEnabled ? "You’ve completed today’s lesson!" : "You’ve completed this lesson!"}
          </p>
          <p className="text-theme-secondary font-medium leading-relaxed reader-body">
            {encouragingMessage}
          </p>
        </div>

        {/* Points & Progress Pill */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {pointsEarned > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 text-xs font-black border border-amber-200 dark:border-amber-800 reader-badge">
              <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>+{pointsEarned} POINTS</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 text-xs font-black border border-emerald-200 dark:border-emerald-800 reader-badge">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{completedLessonsCount} / {totalLessonsCount} Completed ({progressPercent}%)</span>
          </div>
        </div>

        {/* Primary Action Button (Min 44px height) */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onContinue}
            className="w-full min-h-[48px] px-6 py-3.5 rounded-2xl btn-theme-primary text-sm font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-98 reader-button"
          >
            <span>{dailyReleaseEnabled ? 'Continue to Roadmap' : 'Continue Learning'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
