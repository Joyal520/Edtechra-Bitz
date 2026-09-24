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
  Calendar,
  ChevronRight,
  HelpCircle,
  Plus,
  X
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
}

export interface ClassroomMessagesProps {
  classroomId: string;
  classroom?: Classroom | null;
  messages: ClassroomMessage[];
  assignments?: Assignment[];
  exams?: ClassroomExam[];
  activeLiveQuizSession?: LiveQuizSession | null;
  challenges?: any[];
  isTeacher: boolean;
  onMessageUpdated: () => void;
  onOpenTask?: (task: Assignment) => void;
  onOpenExam?: (exam: ClassroomExam) => void;
  onOpenLiveQuiz?: (session?: LiveQuizSession | null) => void;
  onOpenChallenge?: (challenge?: any) => void;
}

function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString).getTime();
  if (isNaN(date)) return '';
  const now = Date.now();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatScheduledDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart} • ${timePart}`;
}

function formatDueDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return `Due: ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export const ClassroomMessages: React.FC<ClassroomMessagesProps> = ({
  classroomId,
  classroom,
  messages,
  assignments = [],
  exams = [],
  activeLiveQuizSession = null,
  challenges = [],
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

  // Aggregate and deduplicate all real activity announcements
  const streamItems = useMemo<StreamItem[]>(() => {
    const items: StreamItem[] = [];
    const seenKeys = new Set<string>();

    // 1. Tasks / Assignments
    (assignments || []).forEach((a) => {
      const key = `task-${a.id}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);

      const isDueSoon =
        a.due_date &&
        new Date(a.due_date).getTime() - Date.now() < 86400000 * 2 &&
        new Date(a.due_date).getTime() > Date.now();
      const isOverdue = a.due_date && new Date(a.due_date).getTime() < Date.now();

      items.push({
        id: key,
        type: 'task',
        title: a.title || 'Classroom Task',
        description: a.instructions || 'Complete the assignment and submit your work before the deadline.',
        createdAt: a.created_at || new Date().toISOString(),
        dueDate: a.due_date,
        points: a.points || 100,
        statusBadge: isOverdue ? 'Overdue' : isDueSoon ? 'Due Soon' : 'New',
        rawId: a.id,
        rawItem: a,
        onAction: () => onOpenTask?.(a)
      });
    });

    // 2. Exams
    (exams || []).forEach((e) => {
      const key = `exam-${e.id}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);

      const qCount = Array.isArray(e.questions) ? e.questions.length : (e as any).questions_count || null;
      const totalMarks = e.total_marks || 100;
      const startsAt = e.starts_at;

      items.push({
        id: key,
        type: 'exam',
        title: e.title || 'Classroom Exam',
        description: e.description || e.instructions || 'Comprehensive timed assessment covering class curriculum.',
        createdAt: e.created_at || new Date().toISOString(),
        scheduledAt: startsAt,
        points: totalMarks,
        questionCount: qCount,
        durationMinutes: e.duration_minutes || 30,
        statusBadge: startsAt && new Date(startsAt).getTime() > Date.now() ? 'Scheduled' : 'Active',
        rawId: e.id,
        rawItem: e,
        onAction: () => onOpenExam?.(e)
      });
    });

    // 3. Live Quiz Session (Active or Scheduled)
    if (activeLiveQuizSession) {
      const s = activeLiveQuizSession;
      const key = `livequiz-${s.id}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const quizTitle = s.quiz?.title || (classroom?.title ? `${classroom.title} Live Quiz` : 'Live Quiz Game');
        const qCount = s.quiz?.questions?.length || 15;
        const isLive = s.status === 'in_progress' || s.status === 'reveal';
        const isScheduled = s.status === 'scheduled' || Boolean(s.scheduled_start_at);

        items.push({
          id: key,
          type: 'live_quiz',
          title: quizTitle,
          description: s.quiz?.description || 'Join the live quiz session and test your knowledge with real-time class leaderboards!',
          createdAt: s.started_at || s.created_at || new Date().toISOString(),
          scheduledAt: s.scheduled_start_at || s.started_at,
          questionCount: qCount,
          statusBadge: isLive ? 'Live Now' : isScheduled ? 'Starting Soon' : 'Active',
          rawId: s.id,
          rawItem: s,
          onAction: () => onOpenLiveQuiz?.(s)
        });
      }
    }

    // 4. Competitions / AI Challenges
    (challenges || []).forEach((c) => {
      const key = `comp-${c.id}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);

      items.push({
        id: key,
        type: 'competition',
        title: c.title || 'Creative Problem Challenge',
        description: c.description || c.instructions || 'Submit your creative work for AI-powered evaluation and class leaderboard.',
        createdAt: c.created_at || new Date().toISOString(),
        dueDate: c.due_date,
        points: c.points || 100,
        statusBadge: 'Active',
        rawId: c.id,
        rawItem: c,
        onAction: () => onOpenChallenge?.(c)
      });
    });

    // 5. Manual Teacher Messages / Announcements
    (messages || []).forEach((m) => {
      const key = `msg-${m.id}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);

      items.push({
        id: key,
        type: 'announcement',
        title: m.is_pinned ? '📌 Pinned Announcement' : 'Classroom Announcement',
        description: m.message,
        createdAt: m.created_at || new Date().toISOString(),
        isPinned: m.is_pinned,
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
  }, [assignments, exams, activeLiveQuizSession, challenges, messages, classroom?.title, onOpenTask, onOpenExam, onOpenLiveQuiz, onOpenChallenge]);

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
    } catch (err) {
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
    } catch (err) {
      alert('Failed to delete announcement');
    }
  };

  return (
    <div className="space-y-4">
      {/* 2-Column Responsive Layout matching Reference Image */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        
        {/* LEFT COLUMN: Classroom Stream Info Card & Teacher Broadcaster */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-7 border border-sky-100 shadow-[0_4px_20px_-4px_rgba(2,111,195,0.06),0_1px_3px_rgba(15,23,42,0.04)] space-y-4 relative overflow-hidden">
          
          {/* Top Info Area */}
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0091ff] via-[#0084f0] to-cyan-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-500/20 ring-4 ring-sky-50">
              <Megaphone className="w-6 h-6 stroke-[2.2]" />
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
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Cancel"
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
        <div className="lg:col-span-8 bg-white rounded-3xl p-5 sm:p-7 border border-sky-100 shadow-[0_4px_20px_-4px_rgba(2,111,195,0.06),0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
          
          {/* Header Row */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100 animate-pulse" />
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Recent Announcements
              </h3>
            </div>
            <span className="text-xs font-bold text-sky-900 bg-sky-50 px-3 py-1 rounded-full border border-sky-200/80 shadow-2xs">
              {streamItems.length} {streamItems.length === 1 ? 'Announcement' : 'Announcements'}
            </span>
          </div>

          {/* Stream Feed Cards */}
          {streamItems.length === 0 ? (
            <div className="text-center py-12 sm:py-16 px-6 space-y-3 bg-[#f8fbff] rounded-2xl border border-dashed border-sky-200/80">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 text-[#0284c7] border border-sky-200 mx-auto flex items-center justify-center shadow-2xs">
                <Megaphone className="w-7 h-7 stroke-[2]" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h4 className="text-sm sm:text-base font-black text-slate-900">
                  No announcements yet
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Your teacher&apos;s tasks, exams, quizzes and class updates will appear here in real time.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[640px] overflow-y-auto pr-1">
              {streamItems.map((item) => {
                // TASK CARD
                if (item.type === 'task') {
                  return (
                    <article
                      key={item.id}
                      onClick={item.onAction}
                      className="bg-[#FAF9FF] hover:bg-white rounded-2xl p-4 sm:p-5 border border-purple-100/90 hover:border-purple-300 shadow-[0_2px_8px_rgba(124,58,237,0.03)] hover:shadow-[0_8px_24px_rgba(124,58,237,0.08)] transition-all duration-200 flex items-start sm:items-center justify-between gap-3.5 group cursor-pointer"
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        {/* Purple Icon Box */}
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-100/90 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200/80 shadow-2xs group-hover:scale-105 transition-transform mt-0.5 sm:mt-0">
                          <FileText className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                        </div>

                        <div className="space-y-1.5 min-w-0 flex-1">
                          {/* Top Row: Type Pill + Relative Time */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider border border-purple-200">
                                TASK
                              </span>
                              {item.statusBadge && item.statusBadge !== 'New' && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.statusBadge === 'Overdue'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {item.statusBadge}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-slate-400">
                              {formatRelativeTime(item.createdAt)}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-purple-900 transition-colors leading-tight">
                            {item.title}
                          </h4>

                          {/* Description */}
                          <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>

                          {/* Metadata Pills Row */}
                          <div className="flex items-center gap-2 flex-wrap pt-0.5">
                            {item.dueDate && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 text-[11px] font-bold border border-purple-200/80 shadow-2xs">
                                <Calendar className="w-3 h-3 text-purple-600" />
                                <span>{formatDueDate(item.dueDate)}</span>
                              </span>
                            )}
                            {item.points != null && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 text-[11px] font-bold border border-sky-200/80 shadow-2xs">
                                <FileText className="w-3 h-3 text-sky-600" />
                                <span>{item.points} points</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Circular Action Arrow Button */}
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-slate-200 group-hover:border-purple-300 text-slate-400 group-hover:text-purple-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:shadow-xs group-hover:translate-x-0.5 transition-all">
                        <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                      </div>
                    </article>
                  );
                }

                // EXAM CARD
                if (item.type === 'exam') {
                  return (
                    <article
                      key={item.id}
                      onClick={item.onAction}
                      className="bg-[#FFF8F8] hover:bg-white rounded-2xl p-4 sm:p-5 border border-rose-100/90 hover:border-rose-300 shadow-[0_2px_8px_rgba(225,29,72,0.03)] hover:shadow-[0_8px_24px_rgba(225,29,72,0.08)] transition-all duration-200 flex items-start sm:items-center justify-between gap-3.5 group cursor-pointer"
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        {/* Red/Pink Icon Box */}
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-rose-100/90 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200/80 shadow-2xs group-hover:scale-105 transition-transform mt-0.5 sm:mt-0">
                          <Award className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                        </div>

                        <div className="space-y-1.5 min-w-0 flex-1">
                          {/* Top Row */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-wider border border-rose-200">
                                EXAM
                              </span>
                              {item.statusBadge && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                                  {item.statusBadge}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-slate-400">
                              {formatRelativeTime(item.createdAt)}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-rose-900 transition-colors leading-tight">
                            {item.title}
                          </h4>

                          {/* Description */}
                          <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>

                          {/* Metadata */}
                          <div className="flex items-center gap-2 flex-wrap pt-0.5">
                            {item.scheduledAt && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 text-[11px] font-bold border border-rose-200/80 shadow-2xs">
                                <Calendar className="w-3 h-3 text-rose-600" />
                                <span>{formatScheduledDate(item.scheduledAt)}</span>
                              </span>
                            )}
                            {item.points != null && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 text-[11px] font-bold border border-sky-200/80 shadow-2xs">
                                <FileText className="w-3 h-3 text-sky-600" />
                                <span>{item.points} points</span>
                              </span>
                            )}
                            {item.questionCount != null && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-700 text-[11px] font-bold border border-slate-200 shadow-2xs">
                                <HelpCircle className="w-3 h-3 text-slate-500" />
                                <span>{item.questionCount} questions</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Arrow Button */}
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-slate-200 group-hover:border-rose-300 text-slate-400 group-hover:text-rose-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:shadow-xs group-hover:translate-x-0.5 transition-all">
                        <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                      </div>
                    </article>
                  );
                }

                // LIVE QUIZ CARD
                if (item.type === 'live_quiz') {
                  return (
                    <article
                      key={item.id}
                      onClick={item.onAction}
                      className="bg-[#F4FCF7] hover:bg-white rounded-2xl p-4 sm:p-5 border border-emerald-100/90 hover:border-emerald-300 shadow-[0_2px_8px_rgba(5,150,105,0.03)] hover:shadow-[0_8px_24px_rgba(5,150,105,0.08)] transition-all duration-200 flex items-start sm:items-center justify-between gap-3.5 group cursor-pointer"
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        {/* Green Icon Box */}
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-100/90 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/80 shadow-2xs group-hover:scale-105 transition-transform mt-0.5 sm:mt-0">
                          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                        </div>

                        <div className="space-y-1.5 min-w-0 flex-1">
                          {/* Top Row */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                                LIVE QUIZ
                              </span>
                              {item.statusBadge && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.statusBadge === 'Live Now'
                                    ? 'bg-emerald-500 text-white font-black animate-pulse'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                  {item.statusBadge}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-slate-400">
                              {formatRelativeTime(item.createdAt)}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-emerald-900 transition-colors leading-tight">
                            {item.title}
                          </h4>

                          {/* Description */}
                          <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>

                          {/* Metadata */}
                          <div className="flex items-center gap-2 flex-wrap pt-0.5">
                            {item.scheduledAt && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200/80 shadow-2xs">
                                <Calendar className="w-3 h-3 text-emerald-600" />
                                <span>{formatScheduledDate(item.scheduledAt)}</span>
                              </span>
                            )}
                            {item.questionCount != null && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 text-[11px] font-bold border border-sky-200/80 shadow-2xs">
                                <HelpCircle className="w-3 h-3 text-sky-600" />
                                <span>{item.questionCount} questions</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Arrow Button */}
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-slate-200 group-hover:border-emerald-300 text-slate-400 group-hover:text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:shadow-xs group-hover:translate-x-0.5 transition-all">
                        <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                      </div>
                    </article>
                  );
                }

                // COMPETITION CARD
                if (item.type === 'competition') {
                  return (
                    <article
                      key={item.id}
                      onClick={item.onAction}
                      className="bg-[#FFFDF5] hover:bg-white rounded-2xl p-4 sm:p-5 border border-amber-100/90 hover:border-amber-300 shadow-[0_2px_8px_rgba(217,119,6,0.03)] hover:shadow-[0_8px_24px_rgba(217,119,6,0.08)] transition-all duration-200 flex items-start sm:items-center justify-between gap-3.5 group cursor-pointer"
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        {/* Amber Icon Box */}
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-100/90 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200/80 shadow-2xs group-hover:scale-105 transition-transform mt-0.5 sm:mt-0">
                          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                        </div>

                        <div className="space-y-1.5 min-w-0 flex-1">
                          {/* Top Row */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider border border-amber-200">
                                COMPETITION
                              </span>
                              {item.statusBadge && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                                  {item.statusBadge}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-slate-400">
                              {formatRelativeTime(item.createdAt)}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-amber-950 transition-colors leading-tight">
                            {item.title}
                          </h4>

                          {/* Description */}
                          <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>

                          {/* Metadata */}
                          <div className="flex items-center gap-2 flex-wrap pt-0.5">
                            {item.dueDate && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 text-[11px] font-bold border border-amber-200/80 shadow-2xs">
                                <Calendar className="w-3 h-3 text-amber-700" />
                                <span>{formatDueDate(item.dueDate)}</span>
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 text-[11px] font-bold border border-purple-200/80 shadow-2xs">
                              <Sparkles className="w-3 h-3 text-purple-600" />
                              <span>AI Evaluated</span>
                            </span>
                            {item.points != null && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 text-[11px] font-bold border border-sky-200/80 shadow-2xs">
                                <FileText className="w-3 h-3 text-sky-600" />
                                <span>{item.points} pts</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Arrow Button */}
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-slate-200 group-hover:border-amber-300 text-slate-400 group-hover:text-amber-800 flex items-center justify-center shrink-0 shadow-2xs group-hover:shadow-xs group-hover:translate-x-0.5 transition-all">
                        <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                      </div>
                    </article>
                  );
                }

                // CUSTOM ANNOUNCEMENT / TEACHER POST
                return (
                  <article
                    key={item.id}
                    className={`rounded-2xl p-4 sm:p-5 border transition-all duration-200 flex items-start justify-between gap-3.5 ${
                      item.isPinned
                        ? 'bg-amber-50/40 border-amber-200 shadow-2xs'
                        : 'bg-slate-50/70 hover:bg-white border-slate-200/90 shadow-2xs hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-sky-100 text-[#026fc3] flex items-center justify-center shrink-0 border border-sky-200/80 shadow-2xs mt-0.5 sm:mt-0">
                        <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
                      </div>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-black uppercase tracking-wider border border-sky-200">
                              ANNOUNCEMENT
                            </span>
                            {item.isPinned && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black border border-amber-300">
                                <Pin className="w-3 h-3 fill-amber-700" />
                                <span>Pinned</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>

                        <div className="text-xs font-black text-slate-800">
                          {item.authorName}
                        </div>

                        <p className="text-xs sm:text-sm text-slate-900 font-semibold whitespace-pre-wrap leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {isTeacher && (
                      <button
                        type="button"
                        onClick={() => handleDelete(item.rawId)}
                        className="w-8 h-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        title="Delete announcement"
                        aria-label="Delete announcement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
