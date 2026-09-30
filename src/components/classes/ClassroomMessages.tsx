// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: STREAM & RECENT ANNOUNCEMENTS FEED
// Authoritative attention layer for students and teachers:
// - 7-day visibility lifecycle
// - Automatic dismissal upon student task/exam completion
// - Expiration when task due date or exam availability has passed
// - Mobile-first clean feed card layout with compact metadata and priority typography
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Send,
  Pin,
  Trash2,
  Megaphone,
  FileText,
  Award,
  Trophy,
  Sparkles,
  ChevronRight,
  Plus,
  X,
  CheckCircle2
} from 'lucide-react';
import { Classroom, ClassroomMessage, Assignment, ClassroomExam } from '@/types/classroom';
import { LiveQuizSession } from '@/types/liveQuiz';
import { classroomMessageService } from '@/services/classroomMessageService';

export type StreamActivityType = 'task' | 'exam' | 'live_quiz' | 'competition' | 'announcement';

export interface StreamItem {
  id: string;
  type: StreamActivityType;
  title: string;
  description: string;
  createdAt: string;
  dueDate?: string | null;
  scheduledAt?: string | null;
  points?: number | null;
  questionCount?: number | null;
  durationMinutes?: number | null;
  statusBadge?: string | null;
  isPinned?: boolean;
  authorName?: string | null;
  rawId: string;
  rawItem: any;
  onAction?: () => void;
  isCompleted?: boolean;
  submittedAt?: string | null;
  scoreText?: string | null;
  actionLabel?: string;
}

export interface ClassroomMessagesProps {
  classroomId: string;
  classroom?: Classroom | null;
  messages: ClassroomMessage[];
  assignments?: Assignment[];
  exams?: ClassroomExam[];
  activeLiveQuizSession?: LiveQuizSession | null;
  challenges?: any[];
  announcements?: StreamItem[];
  isTeacher: boolean;
  onMessageUpdated: () => void;
  onOpenTask?: (task: Assignment) => void;
  onOpenExam?: (exam: ClassroomExam) => void;
  onOpenLiveQuiz?: (session?: LiveQuizSession | null) => void;
  onOpenChallenge?: (challenge?: any) => void;
}

/**
 * Accurately extracts the total question count from an exam record
 * across nested sections, questions_json, and flat question arrays.
 */
export function getExamQuestionCount(e: any): number {
  if (!e) return 0;
  // 1. Array of sections in questions_json: [ { questions: [...] } ]
  if (Array.isArray(e.questions_json)) {
    const flat = e.questions_json.flatMap((s: any) =>
      Array.isArray(s?.questions) ? s.questions : (s?.question || s?.question_text ? [s] : [])
    );
    if (flat.length > 0) return flat.length;
  }
  // 2. Object with sections: { sections: [ { questions: [...] } ] }
  if (e.questions_json?.sections && Array.isArray(e.questions_json.sections)) {
    const flat = e.questions_json.sections.flatMap((s: any) => s?.questions || []);
    if (flat.length > 0) return flat.length;
  }
  // 3. Flat questions array in questions:
  if (Array.isArray(e.questions) && e.questions.length > 0) {
    const flat = e.questions.flatMap((s: any) =>
      Array.isArray(s?.questions) ? s.questions : (s?.question || s?.question_text ? [s] : [])
    );
    if (flat.length > 0) return flat.length;
  }
  // 4. Fallback fields
  return Number(e.total_questions) || Number(e.questions_count) || 0;
}

function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString).getTime();
  if (isNaN(date)) return '';
  const now = Date.now();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatScheduledDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart} • ${timePart}`;
}

function formatDueDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return `Due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export const ClassroomMessages: React.FC<ClassroomMessagesProps> = ({
  classroomId,
  classroom,
  messages,
  assignments = [],
  exams = [],
  activeLiveQuizSession = null,
  challenges = [],
  announcements,
  isTeacher,
  onMessageUpdated,
  onOpenTask,
  onOpenExam,
  onOpenLiveQuiz,
  onOpenChallenge
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isPinning, setIsPinning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  // Aggregate and enforce strict visibility lifecycle rules
  const streamItems = useMemo<StreamItem[]>(() => {
    // If server-provided authoritative announcements are supplied, connect actions and use
    if (announcements && announcements.length > 0) {
      return announcements.map((item) => {
        let onAction: (() => void) | undefined = undefined;
        if (item.type === 'task') {
          const task = assignments.find((a) => a.id === item.rawId) || item.rawItem;
          onAction = task ? () => onOpenTask?.(task) : undefined;
        } else if (item.type === 'exam') {
          const exam = exams.find((e) => e.id === item.rawId) || item.rawItem;
          onAction = exam ? () => onOpenExam?.(exam) : undefined;
        } else if (item.type === 'live_quiz') {
          onAction = () => onOpenLiveQuiz?.(item.rawItem || activeLiveQuizSession);
        } else if (item.type === 'competition') {
          const ch = challenges.find((c) => c.id === item.rawId) || item.rawItem;
          onAction = ch ? () => onOpenChallenge?.(ch) : undefined;
        }
        return {
          ...item,
          onAction
        };
      });
    }

    const items: StreamItem[] = [];
    const seenKeys = new Set<string>();
    const nowMs = Date.now();
    const sevenDaysAgoMs = nowMs - 7 * 24 * 60 * 60 * 1000;

    // 1. Tasks / Assignments
    (assignments || []).forEach((a) => {
      const key = `task-${a.id}`;
      if (seenKeys.has(key)) return;

      const sub = a.my_submission;
      // Real student completion detection from submission record
      const isCompleted =
        !isTeacher &&
        Boolean(
          sub &&
            (sub.status === 'submitted' ||
              sub.status === 'graded' ||
              sub.status === 'completed' ||
              sub.status === 'evaluating' ||
              sub.status === 'processing' ||
              Boolean(sub.submitted_at))
        );

      // PART 3 RULE: Student completed task -> immediately remove from Recent Announcements feed
      if (!isTeacher && isCompleted) return;

      // PART 3 RULE: Due date passed -> remove from active announcement feed
      const isOverdue = a.due_date && new Date(a.due_date).getTime() < nowMs;
      if (isOverdue) return;

      // PART 3 RULE: 7-day default visibility rule
      const createdMs = new Date(a.created_at || nowMs).getTime();
      const hasFutureDue = a.due_date && new Date(a.due_date).getTime() >= nowMs;
      if (createdMs < sevenDaysAgoMs && !hasFutureDue) return;

      seenKeys.add(key);

      const isDueSoon =
        a.due_date &&
        new Date(a.due_date).getTime() - nowMs < 86400000 * 2 &&
        new Date(a.due_date).getTime() > nowMs;

      let statusBadge = isDueSoon ? 'Due Soon' : 'Available';
      let description =
        a.instructions || 'Complete the assignment and submit your work before the deadline.';
      let scoreText: string | null = null;
      let actionLabel = isTeacher ? 'Review Work' : 'Start Task';

      if (isTeacher) {
        statusBadge = 'Active';
        scoreText = `${a.submission_count ?? 0} Submissions`;
        actionLabel = 'Review Work';
      }

      items.push({
        id: key,
        type: 'task',
        title: a.title || 'Classroom Task',
        description,
        createdAt: a.created_at || new Date().toISOString(),
        dueDate: a.due_date,
        points: a.points || 100,
        statusBadge,
        isCompleted: false,
        scoreText,
        actionLabel,
        rawId: a.id,
        rawItem: a,
        onAction: () => onOpenTask?.(a)
      });
    });

    // 2. Exams
    (exams || []).forEach((e) => {
      const key = `exam-${e.id}`;
      if (seenKeys.has(key)) return;

      const result = e.latest_result;
      const isExamCompleted =
        !isTeacher &&
        Boolean(
          result &&
            (result.status === 'submitted' ||
              result.status === 'graded' ||
              Boolean(result.submitted_at))
        );

      // PART 3 RULE: Student completed exam -> immediately remove from Recent Announcements feed
      if (!isTeacher && isExamCompleted) return;

      // PART 3 RULE: If exam availability expired (ends_at passed) -> remove from announcement feed
      if (e.ends_at && new Date(e.ends_at).getTime() < nowMs) return;

      // PART 3 RULE: 7-day default visibility rule
      const createdMs = new Date(e.created_at || nowMs).getTime();
      const isFutureScheduled = e.starts_at && new Date(e.starts_at).getTime() > nowMs;
      if (createdMs < sevenDaysAgoMs && !isFutureScheduled) return;

      seenKeys.add(key);

      const qCount = getExamQuestionCount(e);
      const totalMarks = e.total_marks || 100;
      const startsAt = e.starts_at;

      let statusBadge = isFutureScheduled ? 'Scheduled' : 'Active';
      let description = e.description || e.instructions || 'Comprehensive timed assessment covering class curriculum.';
      let actionLabel = isTeacher ? 'Review Results' : 'Take Exam';

      items.push({
        id: key,
        type: 'exam',
        title: e.title || 'Classroom Exam',
        description,
        createdAt: e.created_at || new Date().toISOString(),
        scheduledAt: startsAt,
        points: totalMarks,
        questionCount: qCount,
        durationMinutes: e.duration_minutes || 60,
        statusBadge,
        isCompleted: false,
        actionLabel,
        rawId: e.id,
        rawItem: e,
        onAction: () => onOpenExam?.(e)
      });
    });

    // 3. Live Quiz Session
    if (activeLiveQuizSession) {
      const s = activeLiveQuizSession;
      const key = `livequiz-${s.id}`;
      if (!seenKeys.has(key)) {
        const isLive = s.status === 'in_progress' || s.status === 'reveal';
        const isScheduled = s.status === 'scheduled' || Boolean(s.scheduled_start_at);

        // PART 3 RULE: Finished / cancelled quiz -> remove from active announcement feed
        if (s.status !== 'completed' && s.status !== 'finished' && s.status !== 'cancelled') {
          seenKeys.add(key);
          const quizTitle = s.quiz?.title || (classroom?.title ? `${classroom.title} Live Quiz` : 'Live Quiz Game');
          const qCount = s.quiz?.questions?.length || 15;

          items.push({
            id: key,
            type: 'live_quiz',
            title: quizTitle,
            description: s.quiz?.description || 'Join the live quiz session and test your knowledge with real-time class leaderboards!',
            createdAt: s.started_at || s.created_at || new Date().toISOString(),
            scheduledAt: s.scheduled_start_at || s.started_at,
            questionCount: qCount,
            statusBadge: isLive ? 'Live Now' : isScheduled ? 'Starting Soon' : 'Active',
            actionLabel: isLive ? 'Join Now' : 'Details',
            rawId: s.id,
            rawItem: s,
            onAction: () => onOpenLiveQuiz?.(s)
          });
        }
      }
    }

    // 4. Competitions / AI Challenges
    (challenges || []).forEach((c) => {
      const key = `comp-${c.id}`;
      if (seenKeys.has(key)) return;

      const compSub = c.my_submission;
      const isCompCompleted =
        !isTeacher &&
        Boolean(
          compSub &&
            (compSub.status === 'submitted' ||
              compSub.status === 'completed' ||
              Boolean(compSub.submitted_at))
        );

      if (!isTeacher && isCompCompleted) return;
      if (c.due_date && new Date(c.due_date).getTime() < nowMs) return;

      const createdMs = new Date(c.created_at || nowMs).getTime();
      const hasFutureDue = c.due_date && new Date(c.due_date).getTime() >= nowMs;
      if (createdMs < sevenDaysAgoMs && !hasFutureDue) return;

      seenKeys.add(key);

      let statusBadge = 'Active';
      let description = c.description || c.instructions || 'Submit your creative work for AI-powered evaluation and class leaderboard.';
      let actionLabel = isTeacher ? 'View Entries' : 'Participate';

      items.push({
        id: key,
        type: 'competition',
        title: c.title || 'Creative Problem Challenge',
        description,
        createdAt: c.created_at || new Date().toISOString(),
        dueDate: c.due_date,
        points: c.points || 100,
        statusBadge,
        isCompleted: false,
        actionLabel,
        rawId: c.id,
        rawItem: c,
        onAction: () => onOpenChallenge?.(c)
      });
    });

    // 5. Manual Teacher Messages / Announcements (7-day rule)
    (messages || []).forEach((m) => {
      const key = `msg-${m.id}`;
      if (seenKeys.has(key)) return;

      const createdMs = new Date(m.created_at || nowMs).getTime();
      if (createdMs < sevenDaysAgoMs) return;

      seenKeys.add(key);

      items.push({
        id: key,
        type: 'announcement',
        title: m.is_pinned ? '📌 Pinned Announcement' : 'Classroom Announcement',
        description: m.message,
        createdAt: m.created_at || new Date().toISOString(),
        isPinned: Boolean(m.is_pinned),
        authorName: m.teacher?.full_name || 'Class Teacher',
        rawId: m.id,
        rawItem: m
      });
    });

    // Sort: Pinned first, then newest createdAt -> oldest
    return items.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [
    announcements,
    assignments,
    exams,
    activeLiveQuizSession,
    challenges,
    messages,
    classroom?.title,
    isTeacher,
    onOpenTask,
    onOpenExam,
    onOpenLiveQuiz,
    onOpenChallenge
  ]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSubmitting(true);
    try {
      await classroomMessageService.postMessage({
        classroom_id: classroomId,
        message: newMessage.trim(),
        is_pinned: isPinning
      });
      setNewMessage('');
      setIsPinning(false);
      setShowComposer(false);
      onMessageUpdated();
    } catch {
      alert('Failed to post announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await classroomMessageService.deleteMessage(messageId);
      onMessageUpdated();
    } catch {
      alert('Failed to delete announcement');
    }
  };

  const renderAnnouncementCard = (item: StreamItem) => {
    // Determine visual style according to EdTechra design system
    let icon = <Megaphone className="w-4 h-4 stroke-[2]" />;
    let iconBg = 'bg-sky-100 text-[#026fc3] border-sky-200';
    let typeBadgeStyle = 'bg-sky-100 text-sky-800 border-sky-200';
    let cardBorderHover = 'hover:border-sky-300';
    let cardBg = 'bg-[#F8FAFC]';
    let statusBadgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';

    if (item.type === 'task') {
      icon = <FileText className="w-4 h-4 stroke-[2.2]" />;
      iconBg = 'bg-purple-100 text-purple-700 border-purple-200';
      typeBadgeStyle = 'bg-purple-100 text-purple-800 border-purple-200';
      cardBorderHover = 'hover:border-purple-300';
      cardBg = 'bg-[#FAF9FF]';
      statusBadgeStyle =
        item.statusBadge === 'Due Soon'
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-purple-50 text-purple-700 border-purple-200';
    } else if (item.type === 'exam') {
      icon = <Award className="w-4 h-4 stroke-[2.2]" />;
      iconBg = 'bg-rose-100 text-rose-700 border-rose-200';
      typeBadgeStyle = 'bg-rose-100 text-rose-800 border-rose-200';
      cardBorderHover = 'hover:border-rose-300';
      cardBg = 'bg-[#FFF8F8]';
      statusBadgeStyle =
        item.statusBadge === 'Scheduled'
          ? 'bg-amber-50 text-amber-800 border-amber-200'
          : 'bg-emerald-50 text-emerald-800 border-emerald-200';
    } else if (item.type === 'live_quiz') {
      icon = <Trophy className="w-4 h-4 stroke-[2.2]" />;
      iconBg = 'bg-emerald-100 text-emerald-700 border-emerald-200';
      typeBadgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      cardBorderHover = 'hover:border-emerald-300';
      cardBg = 'bg-[#F4FCF7]';
      statusBadgeStyle =
        item.statusBadge === 'Live Now'
          ? 'bg-emerald-500 text-white font-black animate-pulse'
          : 'bg-emerald-50 text-emerald-800 border-emerald-200';
    } else if (item.type === 'competition') {
      icon = <Sparkles className="w-4 h-4 stroke-[2.2]" />;
      iconBg = 'bg-amber-100 text-amber-800 border-amber-200';
      typeBadgeStyle = 'bg-amber-100 text-amber-900 border-amber-200';
      cardBorderHover = 'hover:border-amber-300';
      cardBg = 'bg-[#FFFDF5]';
      statusBadgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
    } else if (item.type === 'announcement' && item.isPinned) {
      icon = <Pin className="w-4 h-4 fill-amber-700 text-amber-700" />;
      iconBg = 'bg-amber-100 text-amber-800 border-amber-300';
      typeBadgeStyle = 'bg-amber-100 text-amber-900 border-amber-300';
      cardBorderHover = 'hover:border-amber-300';
      cardBg = 'bg-amber-50/40';
      statusBadgeStyle = 'bg-amber-100 text-amber-900 border-amber-300';
    }

    const hasBottomMeta = Boolean(
      item.scheduledAt ||
      item.dueDate ||
      item.points != null ||
      item.questionCount != null ||
      item.authorName ||
      item.scoreText
    );

    return (
      <article
        key={item.id}
        onClick={item.onAction}
        className={`w-full rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 ${cardBg} hover:bg-white ${cardBorderHover} ${
          item.onAction ? 'cursor-pointer group' : ''
        } flex flex-col gap-2.5`}
      >
        {/* Top Header: [ICON] TYPE • Status (Left) | Relative Time (Right) */}
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${iconBg}`}>
              {icon}
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${typeBadgeStyle}`}>
              {item.type.replace('_', ' ')}
            </span>
            {item.statusBadge && (
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs ${statusBadgeStyle}`}>
                {item.statusBadge}
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold text-slate-400 shrink-0">
            {formatRelativeTime(item.createdAt)}
          </span>
        </div>

        {/* Middle Row: Title (with Action Arrow) & Description */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <h4 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
              {item.title}
            </h4>
            {item.description && (
              <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>

          {item.onAction && (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-slate-200/90 text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-300 flex items-center justify-center shrink-0 shadow-2xs transition-all group-hover:translate-x-0.5 mt-0.5">
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </div>
          )}

          {isTeacher && item.type === 'announcement' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(item.rawId);
              }}
              className="w-8 h-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Delete announcement"
              aria-label="Delete announcement"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bottom Row: Compact Metadata (Middle dot separated) */}
        {hasBottomMeta && (
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 font-medium pt-1.5 border-t border-slate-200/60">
            {item.scheduledAt && (
              <span className="font-semibold text-slate-800">
                {formatScheduledDate(item.scheduledAt)}
              </span>
            )}
            {item.dueDate && (
              <span className="font-semibold text-slate-800">
                {formatDueDate(item.dueDate)}
              </span>
            )}
            {(item.scheduledAt || item.dueDate) && (item.points != null || item.questionCount != null) && (
              <span className="text-slate-300">•</span>
            )}
            {item.points != null && (
              <span>
                {item.points} {item.type === 'exam' ? 'marks' : 'points'}
              </span>
            )}
            {item.points != null && item.questionCount != null && (
              <span className="text-slate-300">•</span>
            )}
            {item.questionCount != null && (
              <span>
                {item.questionCount} {item.questionCount === 1 ? 'question' : 'questions'}
              </span>
            )}
            {item.scoreText && (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-slate-700">{item.scoreText}</span>
              </>
            )}
            {item.authorName && (
              <span className="text-slate-500 font-semibold text-[11px]">
                By {item.authorName}
              </span>
            )}
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="space-y-4">
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* LEFT COLUMN: Classroom Stream Info Card & Teacher Broadcaster */}
        <div className="lg:col-span-4 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-sky-100 shadow-[0_4px_20px_-4px_rgba(2,111,195,0.06),0_1px_3px_rgba(15,23,42,0.04)] space-y-4 relative overflow-hidden">
          {/* Top Info Area */}
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#0091ff] via-[#0084f0] to-cyan-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-500/20 ring-4 ring-sky-50">
              <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Classroom Stream
              </h3>
              <p className="text-xs sm:text-[13px] text-slate-500 font-medium leading-relaxed mt-1">
                Your teacher&apos;s updates, study reminders, and class announcements will appear here in real time.
              </p>
            </div>
          </div>

          {/* Teacher Broadcast Action & Composer */}
          {isTeacher && (
            <div className="pt-2 border-t border-slate-100 space-y-3">
              {!showComposer ? (
                <button
                  type="button"
                  onClick={() => setShowComposer(true)}
                  className="w-full py-2.5 px-4 rounded-full bg-sky-50 hover:bg-sky-100 text-[#0284c7] font-bold text-xs flex items-center justify-center gap-2 border border-sky-200/80 transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Write Announcement</span>
                </button>
              ) : (
                <form onSubmit={handlePost} className="space-y-3 pt-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">New Broadcast</span>
                    <button
                      type="button"
                      onClick={() => setShowComposer(false)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Cancel"
                      aria-label="Cancel announcement"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="relative rounded-2xl border border-sky-200 bg-white focus-within:border-[#0091ff] focus-within:ring-2 focus-within:ring-sky-100 transition-all shadow-xs overflow-hidden">
                    <textarea
                      rows={4}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Broadcast a note to your students... e.g. Welcome to Unit 2! Please review vocabulary."
                      className="w-full p-3.5 bg-white border-0 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden resize-none min-h-[100px] leading-relaxed block"
                    />
                    <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-500 font-medium">
                      <span>Shift + Enter for new line</span>
                      <span>{newMessage.length} chars</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isPinning}
                        onChange={(e) => setIsPinning(e.target.checked)}
                        className="rounded border-slate-300 text-[#0091ff] focus:ring-sky-400"
                      />
                      <Pin className={`w-3.5 h-3.5 ${isPinning ? 'text-amber-600 fill-amber-500' : 'text-slate-400'}`} />
                      <span>Pin to top</span>
                    </label>

                    <button
                      type="submit"
                      disabled={isSubmitting || !newMessage.trim()}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs text-white bg-gradient-to-r from-[#0091ff] to-[#0070e0] hover:from-[#0084f0] hover:to-[#0060c8] shadow-sm shadow-sky-500/30 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Posting...' : 'Post'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Recent Announcements Feed */}
        <div className="lg:col-span-8 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 border border-sky-100 shadow-[0_4px_20px_-4px_rgba(2,111,195,0.06),0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
          {/* Header Row */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100 animate-pulse" />
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Recent Announcements
              </h3>
            </div>
            {/* Authoritative counter of currently visible announcements */}
            <span className="text-xs font-bold text-sky-900 bg-sky-50 px-3 py-1 rounded-full border border-sky-200/80 shadow-2xs">
              {streamItems.length} {streamItems.length === 1 ? 'Announcement' : 'Announcements'}
            </span>
          </div>

          {/* Stream Feed Cards */}
          {streamItems.length === 0 ? (
            <div className="text-center py-10 sm:py-14 px-4 sm:px-6 space-y-3 bg-[#f8fbff] rounded-2xl border border-dashed border-sky-200/80">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0284c7] border border-sky-200 mx-auto flex items-center justify-center shadow-2xs">
                <CheckCircle2 className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h4 className="text-sm sm:text-base font-black text-slate-900">
                  No new announcements
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  You&apos;re all caught up. New tasks, exams, and class updates will appear here when posted.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-none sm:max-h-[680px] sm:overflow-y-auto sm:pr-1">
              {streamItems.map((item) => renderAnnouncementCard(item))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
