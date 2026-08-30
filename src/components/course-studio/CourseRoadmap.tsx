// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: STUDENT COURSE ROADMAP COMPONENT
// Beautiful, accessible, mobile-first visual progression roadmap.
// Displays Completed (✓), Available (▶), and Daily Locked (🔒) lessons.
// Guarantees zero horizontal overflow, 320px mobile compatibility,
// and non-blocking notifications for locked lessons.
// ============================================================================

import React, { useState } from 'react';
import {
  CheckCircle2,
  Play,
  Lock,
  Clock,
  HelpCircle,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { RoadmapLessonItem } from '@/types/courseStudio';

interface Props {
  courseTitle: string;
  roadmapItems: RoadmapLessonItem[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  dailyReleaseEnabled: boolean;
  onSelectLesson: (lesson: RoadmapLessonItem) => void;
  activeLessonId?: string;
}

export const CourseRoadmap: React.FC<Props> = ({
  courseTitle,
  roadmapItems,
  completedCount,
  totalCount,
  progressPercent,
  dailyReleaseEnabled,
  onSelectLesson,
  activeLessonId
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleItemClick = (item: RoadmapLessonItem) => {
    if (item.status === 'locked' || item.is_locked) {
      const msg = item.unlock_message || `Lesson ${item.position} is locked. It will open tomorrow at midnight.`;
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    onSelectLesson(item);
  };

  return (
    <div className="container-fluid px-2 sm:px-4 max-w-2xl mx-auto py-4 sm:py-6 space-y-5">
      
      {/* ------------------------------------------------------------------ */}
      {/* 1. COURSE PROGRESS HEADER                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-black text-[#026fc3] dark:text-sky-400 uppercase tracking-widest block reader-badge">
              Course Progress
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate max-w-sm reader-h2">
              {courseTitle}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-[#026fc3] dark:text-sky-300 text-xs font-black border border-sky-200 dark:border-sky-800 reader-badge">
              {progressPercent}% Complete
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-3 rounded-full bg-sky-100/70 dark:bg-slate-800 overflow-hidden border border-sky-100 dark:border-slate-700/60">
            <div
              className="h-full bg-gradient-to-r from-[#026fc3] via-sky-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 reader-meta">
            <span>{completedCount} of {totalCount} lessons completed</span>
            {dailyReleaseEnabled && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                <Lock className="w-3 h-3" />
                <span>Daily Release Active</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. NON-BLOCKING LOCKED LESSON TOAST NOTIFICATION                  */}
      {/* ------------------------------------------------------------------ */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-amber-500 text-white shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-xs sm:text-sm font-black reader-body">{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white text-xs font-bold px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. VERTICAL TIMELINE ROADMAP PATH                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-3 relative before:absolute before:left-6 sm:before:left-7 before:top-6 before:bottom-6 before:w-0.5 before:bg-sky-100 dark:before:bg-slate-800 before:z-0">
        {roadmapItems.map(item => {
          const isCompleted = item.status === 'completed';
          const isLocked = item.status === 'locked' || item.is_locked;
          const isAvailable = !isCompleted && !isLocked;
          const isActive = item.id === activeLessonId;

          return (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`relative z-10 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all duration-200 flex items-start gap-3.5 sm:gap-4 ${
                isCompleted
                  ? 'bg-white dark:bg-slate-900/90 border-emerald-300 dark:border-emerald-900/60 shadow-2xs cursor-pointer hover:border-emerald-500'
                  : isAvailable
                  ? 'bg-white dark:bg-slate-900 border-[#026fc3] dark:border-sky-500 shadow-md ring-2 ring-[#026fc3]/10 cursor-pointer hover:shadow-lg scale-[1.01]'
                  : 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 opacity-75 cursor-not-allowed'
              }`}
            >
              {/* Left Timeline Status Node */}
              <div className="shrink-0 pt-0.5">
                {isCompleted ? (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs font-black">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                ) : isAvailable ? (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#026fc3] text-white flex items-center justify-center shadow-md animate-pulse">
                    <Play className="w-4 h-4 ml-0.5" />
                  </div>
                ) : (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center border border-slate-300 dark:border-slate-700">
                    <Lock className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Center Content Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider reader-meta">
                    {item.unit_title} • Lesson {item.position}
                  </span>

                  {/* Status Badge */}
                  {isCompleted && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-200 dark:border-emerald-800 reader-badge">
                      ✓ Completed
                    </span>
                  )}
                  {isAvailable && (
                    <span className="px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-[#026fc3] dark:text-sky-300 text-[10px] font-black uppercase tracking-wider border border-sky-200 dark:border-sky-800 reader-badge">
                      ▶ {isActive ? 'In Progress' : 'Continue'}
                    </span>
                  )}
                  {isLocked && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 reader-badge">
                      🔒 Opens Day {item.release_day}
                    </span>
                  )}
                </div>

                <h3 className={`text-sm sm:text-base font-black truncate reader-h3 ${
                  isLocked ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'
                }`}>
                  {item.title}
                </h3>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium pt-0.5 reader-meta">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.estimated_minutes} min</span>
                  </span>
                  {item.questions_count !== undefined && item.questions_count > 0 && (
                    <span className="flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.questions_count} Practice Questions</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Right Arrow Navigation indicator */}
              {!isLocked && (
                <div className="shrink-0 self-center text-slate-400 hover:text-[#026fc3]">
                  <ChevronRight className="w-5 h-5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
