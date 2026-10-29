// ============================================================================
// EDTECHRA COURSE STUDIO 2.0: PREMIUM COURSE OPENING HERO BANNER
// Displays course title, subtitle, illustration, estimated duration, learner
// level, learning outcomes, course progress, and a Start/Continue Learning CTA.
// ============================================================================

import React, { useState } from 'react';
import {
  Clock,
  Target,
  Sparkles,
  Play,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Award
} from 'lucide-react';
import { Course } from '@/types/courseStudio';
import { CourseIllustrationGraphic } from './BrainIllustrations';

interface CourseHeroBannerProps {
  course: Course;
  completedLessonsCount: number;
  totalLessonsCount: number;
  onStartOrContinue?: () => void;
  defaultCollapsed?: boolean;
}

export const CourseHeroBanner: React.FC<CourseHeroBannerProps> = ({
  course,
  completedLessonsCount,
  totalLessonsCount,
  onStartOrContinue,
  defaultCollapsed = false
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const isBrainCourse =
    course.title.toLowerCase().includes('amazing brain') ||
    course.title.toLowerCase().includes('brain');

  const isAnnabelleCourse =
    course.title.toLowerCase().includes('annabelle');

  const progressPercent =
    totalLessonsCount > 0
      ? Math.min(100, Math.round((completedLessonsCount / totalLessonsCount) * 100))
      : 0;

  const subtitle = isAnnabelleCourse
    ? '7 Days of Simple Past Grammar, Mystery & Storytelling'
    : isBrainCourse
    ? 'Discover the amazing machine inside your head.'
    : course.subject || 'Interactive Digital Course';

  const introText = isAnnabelleCourse
    ? 'Master the Simple Past Tense through the legend of Annabelle. Learn regular and irregular verbs, negatives with didn’t, Yes/No and WH- questions, explore video and listening museum accounts, and write your own original 50-word mystery story.'
    : course.short_description ||
    (isBrainCourse
      ? 'Learn how your brain helps you think, remember, move, and feel through visual stories and interactive activities.'
      : 'Explore interactive lessons, visual guides, and practice activities.');

  const durationLabel = isAnnabelleCourse
    ? '7 Days (100 Marks / 400 Pts)'
    : isBrainCourse
    ? '1 Day (~45 mins)'
    : course.estimated_hours
    ? `${course.estimated_hours} hrs`
    : '1 Day';

  const levelLabel = isAnnabelleCourse
    ? 'A1–A2 English'
    : isBrainCourse
    ? 'Beginner (A1–A2)'
    : course.grade_level || 'All Levels';

  const outcomes = isAnnabelleCourse
    ? [
        'Explain when to use the Simple Past Tense',
        'Identify regular (-ed) and irregular verbs',
        'Make negative sentences with didn\'t + base verb',
        'Form Yes/No and WH- questions with did',
        'Understand stories via video, reading & listening',
        'Write a 45–55-word story using past-tense verbs'
      ]
    : isBrainCourse
    ? [
        'What your brain is & what it does',
        '3 main parts: Cerebrum, Cerebellum & Brain Stem',
        'How memory & sleep help you learn',
        '6 simple ways to take care of your brain'
      ]
    : [
        'Visual & interactive micro-lessons',
        'Key vocabulary with audio pronunciation',
        'Instant feedback practice challenges'
      ];

  return (
    <div className="w-full rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 text-white border border-indigo-500/30 shadow-xl overflow-hidden transition-all">
      {/* Compact bar when collapsed */}
      <div className="px-5 py-3.5 bg-white/5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl">{isAnnabelleCourse ? '🕯️' : isBrainCourse ? '🧠' : '🎓'}</span>
          <span className="text-xs sm:text-sm font-black tracking-tight truncate">
            {course.title}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-[11px] font-bold text-indigo-200">
            ⏱ {durationLabel}
          </span>
          <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[11px] font-bold text-emerald-200">
            🎯 {levelLabel}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-200">
            <span>{completedLessonsCount}/{totalLessonsCount} Lessons</span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-mono">
              {progressPercent}%
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            aria-label={isCollapsed ? 'Expand course overview' : 'Minimize course overview'}
          >
            <span>{isCollapsed ? 'Course Overview' : 'Hide Overview'}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-5 sm:p-7 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Title, Subtitle, Metadata, Outcomes & CTA */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black">
                <Sparkles className="w-3.5 h-3.5" />
                <span>⭐ Interactive Course</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-100 text-xs font-bold">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>⏱ {durationLabel}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <span>🎯 {levelLabel}</span>
              </span>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                {isBrainCourse && !course.title.includes('🧠') ? `🧠 ${course.title}` : course.title}
              </h1>
              <p className="text-base sm:text-lg font-extrabold text-indigo-200">
                {subtitle}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                {introText}
              </p>
            </div>

            {/* Learning Outcomes */}
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-black uppercase tracking-wider text-indigo-300">
                What You Will Discover:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {outcomes.map((outcome, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-100"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{outcome}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Course Progress & Start Learning Button */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              {onStartOrContinue && (
                <button
                  type="button"
                  onClick={onStartOrContinue}
                  className="min-h-[48px] px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black text-sm shadow-lg flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {completedLessonsCount === 0
                      ? 'Start Learning'
                      : completedLessonsCount >= totalLessonsCount
                      ? 'Review Course'
                      : 'Continue Learning'}
                  </span>
                </button>
              )}

              <div className="flex-1 min-w-[180px] space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-200">
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Course Progress</span>
                  </span>
                  <span>{progressPercent}% Complete</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all duration-500"
                    style={{ width: `${Math.max(4, progressPercent)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Attractive Visual Illustration */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3 backdrop-blur-xs">
              {isBrainCourse ? (
                <CourseIllustrationGraphic
                  illustrationKey="friendly_brain"
                  alt="Friendly Brain Hero Illustration"
                />
              ) : course.cover_image_url ? (
                <img
                  src={course.cover_image_url}
                  alt={course.title}
                  className="w-full max-h-[240px] object-cover rounded-xl"
                />
              ) : (
                <CourseIllustrationGraphic
                  illustrationKey="friendly_brain"
                  alt={course.title}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
