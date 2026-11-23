// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: PREMIUM LESSON COMPLETION CELEBRATION MODAL
// High-craft celebratory modal with custom 3D WebP illustrations, soft sky
// header glow, encouraging completion card, dual reward/progress pills,
// and prominent blue gradient Continue CTA.
// ============================================================================

import React, { useEffect } from 'react';
import { Check, Eye, X, Award } from 'lucide-react';
import { triggerConfettiBurst } from '@/utils/courseConfetti';
import { playCompleteSound } from '@/utils/courseAudio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  lessonTitle: string;
  lessonPosition?: number;
  /** Leaderboard points newly credited by the backend for this completion. */
  pointsEarned?: number;
  /** Server-confirmed assessment score earned in this lesson. */
  earnedScore?: number;
  /** Server-confirmed maximum possible score for this lesson. */
  maxScore?: number;
  totalLeaderboardPoints?: number;
  progressPercent?: number;
  completedLessonsCount?: number;
  totalLessonsCount?: number;
  dailyReleaseEnabled?: boolean;
  courseTitle?: string;
  courseCompleted?: boolean;
  completionBonusPoints?: number;
  isPreviewMode?: boolean;
  onContinue: () => void;
}

const DAILY_RELEASE_MESSAGES = [
  "Another lesson completed! You're building your progress one day at a time.",
  "Excellent work! Come back tomorrow for the next step in your journey.",
  "Great job! Today's learning is complete. Your next lesson will unlock tomorrow.",
  "Well done! Keep going — your learning journey continues tomorrow."
];

const NORMAL_RELEASE_MESSAGES = [
  "Another lesson completed! You're building your progress one step at a time.",
  "Great work! You've completed this lesson. Keep going!",
  "Excellent progress! You're ready for the next lesson."
];

function formatDisplayName(raw?: string): { displayName: string | null; detectedPreview: boolean } {
  if (!raw || !raw.trim() || raw.includes('@')) {
    return { displayName: null, detectedPreview: false };
  }
  const detectedPreview = /preview/i.test(raw);
  const cleaned = raw.replace(/\(\s*preview\s*\)/gi, '').trim();
  if (!cleaned) return { displayName: null, detectedPreview };
  const titleCased = cleaned
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return { displayName: titleCased, detectedPreview };
}

export const LessonCompletionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  studentName,
  lessonTitle,
  lessonPosition = 1,
  pointsEarned = 0,
  earnedScore,
  maxScore,
  totalLeaderboardPoints,
  progressPercent = 0,
  completedLessonsCount = 1,
  totalLessonsCount = 1,
  dailyReleaseEnabled = false,
  courseTitle,
  courseCompleted = false,
  completionBonusPoints = 0,
  isPreviewMode,
  onContinue
}) => {
  useEffect(() => {
    if (!isOpen) return;
    playCompleteSound();
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced) {
      const target = document.getElementById('celebration-modal-card');
      if (target) {
        const timer = setTimeout(() => triggerConfettiBurst(target), 160);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const { displayName, detectedPreview } = formatDisplayName(studentName);
  const showPreviewBadge = Boolean(isPreviewMode ?? detectedPreview);

  const headingText = courseCompleted
    ? 'Course Completed!'
    : displayName
    ? `Congratulations, ${displayName}!`
    : 'Congratulations!';

  const messagesList = dailyReleaseEnabled ? DAILY_RELEASE_MESSAGES : NORMAL_RELEASE_MESSAGES;
  const encouragingMessage = courseCompleted
    ? `You have successfully completed ${courseTitle || 'this course'}!`
    : messagesList[(Math.max(1, lessonPosition) - 1) % messagesList.length];

  // Dynamic reward value (Leaderboard Pts or Lesson Score)
  const displayedPoints =
    pointsEarned > 0
      ? pointsEarned
      : typeof earnedScore === 'number' && earnedScore > 0
      ? earnedScore
      : showPreviewBadge
      ? 100
      : 0;

  const rewardLabel =
    pointsEarned > 0 || showPreviewBadge
      ? 'Leaderboard Pts'
      : typeof earnedScore === 'number' && typeof maxScore === 'number' && maxScore > 0
      ? `of ${maxScore} Score`
      : 'Leaderboard Pts';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lesson-completion-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      {/* Modal Container */}
      <div
        id="celebration-modal-card"
        className="relative w-full max-w-[460px] my-auto bg-white rounded-[32px] shadow-[0_24px_60px_rgba(15,23,42,0.35)] overflow-hidden text-center animate-in zoom-in-95 fade-in duration-250 motion-reduce:animate-none"
      >
        {/* Top-Right Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-sm flex items-center justify-center transition-all cursor-pointer active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. CELEBRATION HEADER WITH SOFT SKY GRADIENT & TROPHY ILLUSTRATION */}
        <div className="relative pt-6 pb-3 px-6 bg-gradient-to-b from-[#d8e7ff] via-[#eef5ff] to-white overflow-hidden">
          {/* Subtle decorative cloud shapes */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-10 top-14 w-36 h-20 rounded-full bg-white/70 blur-[2px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 top-12 w-36 h-20 rounded-full bg-white/70 blur-[2px]"
          />

          {/* Generated 3D Trophy Illustration */}
          <div className="relative z-10 flex justify-center">
            <img
              src="/assets/completion/celebration-trophy.webp"
              alt="Celebration Trophy"
              width={240}
              height={143}
              className="w-52 sm:w-60 h-auto object-contain drop-shadow-[0_8px_16px_rgba(217,119,6,0.18)]"
            />
          </div>

          {/* Heading, Preview Pill & Lesson Subtitle */}
          <div className="relative z-10 mt-1 space-y-2">
            <h2
              id="lesson-completion-heading"
              className="text-2xl sm:text-[28px] font-black text-[#0f1742] tracking-tight leading-tight break-words"
            >
              {headingText}
            </h2>

            {showPreviewBadge && (
              <div className="flex justify-center">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#ede9fe] text-[#5b21b6] text-xs font-extrabold tracking-tight shadow-2xs">
                  <Eye className="w-3.5 h-3.5 text-[#7c3aed]" />
                  <span>Preview Complete!</span>
                </span>
              </div>
            )}

            {courseCompleted && courseTitle && (
              <p className="text-sm font-black text-amber-600">{courseTitle}</p>
            )}

            <p className="text-xs sm:text-sm font-extrabold text-[#1d4ed8] truncate">
              {lessonTitle} · Lesson {lessonPosition}
            </p>
          </div>
        </div>

        {/* 2. MODAL BODY CONTENT */}
        <div className="px-5 sm:px-7 pb-7 pt-2 space-y-4">
          {/* Soft Blue Completion Card */}
          <div className="relative rounded-2xl bg-gradient-to-br from-[#eaf3ff] via-[#f4f8ff] to-[#deecff] border border-[#cfe1ff] p-4 sm:p-5 text-left overflow-hidden shadow-2xs">
            {/* Soft decorative cloud accent */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-6 -right-6 w-28 h-20 rounded-full bg-white/60"
            />
            <div className="relative z-10 flex items-center gap-4">
              <img
                src="/assets/completion/success-badge.webp"
                alt="Lesson Completed Badge"
                width={76}
                height={76}
                className="w-16 h-16 sm:w-[74px] sm:h-[74px] shrink-0 object-contain animate-in zoom-in-75 duration-300 motion-reduce:animate-none"
              />
              <div className="min-w-0 space-y-1">
                <h3 className="text-base sm:text-lg font-black text-[#0f1742] leading-snug">
                  {courseCompleted
                    ? 'You completed the entire course!'
                    : dailyReleaseEnabled
                    ? "You've completed today's lesson!"
                    : "You've completed this lesson!"}
                </h3>
                <p className="text-xs sm:text-[13.5px] font-medium text-[#334155] leading-relaxed">
                  {encouragingMessage}
                </p>
              </div>
            </div>
          </div>

          {/* Optional Course Completion Bonus Achievement Strip */}
          {courseCompleted && (
            <div className="rounded-2xl bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border border-amber-300/80 px-4 py-3 flex items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-2 text-amber-900 text-xs font-black">
                <Award className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Course Completion Bonus</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-xs font-black">
                +{completionBonusPoints > 0 ? completionBonusPoints : 100} XP
              </span>
            </div>
          )}

          {/* 3. REWARD & PROGRESS CARDS (2 COLUMNS ON SM+) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Gold Reward Card */}
            <div className="rounded-2xl bg-gradient-to-r from-[#fff8e1] to-[#fef3c7] border border-[#fde68a] px-4 py-3 flex items-center gap-3 text-left shadow-2xs">
              <img
                src="/assets/completion/reward-trophy.webp"
                alt="Reward Trophy"
                width={42}
                height={42}
                className="w-10 h-10 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <div className="text-base font-black text-[#78350f] leading-tight">
                  {displayedPoints > 0 ? `+${displayedPoints}` : '0'}
                </div>
                <div className="text-xs font-bold text-[#92400e] truncate">
                  {rewardLabel}
                </div>
                {typeof totalLeaderboardPoints === 'number' && totalLeaderboardPoints > 0 && (
                  <div className="text-[10px] font-bold text-[#b45309]">
                    {totalLeaderboardPoints.toLocaleString()} Total Pts
                  </div>
                )}
              </div>
            </div>

            {/* Green Progress Card */}
            <div className="rounded-2xl bg-gradient-to-r from-[#e8fbf2] to-[#dcfce7] border border-[#bbf7d0] px-4 py-3 flex items-center gap-3 text-left shadow-2xs">
              <img
                src="/assets/completion/progress-target.webp"
                alt="Progress Target"
                width={42}
                height={42}
                className="w-10 h-10 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <div className="text-sm font-black text-[#065f46] leading-tight">
                  {completedLessonsCount} / {totalLessonsCount} Completed
                </div>
                <div className="text-xs font-extrabold text-[#047857]">
                  ({progressPercent}%)
                </div>
              </div>
            </div>
          </div>

          {/* 4. PROMINENT BLUE GRADIENT CONTINUE CTA */}
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={onContinue}
              className="w-full max-w-[300px] min-h-[52px] px-8 py-3.5 rounded-full bg-gradient-to-r from-[#026fc3] via-[#1565d8] to-[#0057d9] hover:from-[#03589e] hover:to-[#0047b3] text-white text-base font-extrabold shadow-[0_10px_24px_rgba(2,111,195,0.38)] hover:shadow-[0_14px_28px_rgba(2,111,195,0.45)] transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>Continue</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
