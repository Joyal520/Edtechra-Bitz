// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: MANAGE CLASS ASSIGNMENTS & DELIVERY MODAL
// Independent per-class course assignment configuration: each selected class
// owns its own Available From date, Deadline, Daily Lesson Unlock toggle,
// unlock frequency & lessons-per-release schedule, timezone, and restrictions.
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Users,
  Calendar,
  Clock,
  Globe,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Lock,
  Unlock,
  Pause,
  AlertCircle
} from 'lucide-react';
import {
  Course,
  CourseClassroomAssignment,
  ClassAssignmentInput
} from '@/types/courseStudio';
import { Classroom } from '@/types/classroom';
import { courseStudioService } from '@/services/courseStudioService';
import { classroomService } from '@/services/classroomService';
import { formatUnlockDateLabel } from '@/utils/dailyReleaseEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  onSuccess: () => void;
  initialClassroomId?: string;
}

interface PerClassAssignmentForm {
  classroomId: string;
  assignmentId?: string;
  status: 'active' | 'paused' | 'archived' | 'completed';
  availableFrom: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD or ''
  dailyReleaseEnabled: boolean;
  unlockFrequencyDays: number; // e.g. 1 = Daily, 7 = Weekly
  unlockLessonsPerRelease: number; // e.g. 1 lesson or 2 lessons per release
  unlockStartDate: string; // YYYY-MM-DD
  courseTimezone: string;
  allowRetries: boolean;
  awardPoints: boolean;
  sequentialUnlock: boolean;
  trackMastery: boolean;
}

const COMMON_TIMEZONES = [
  'Asia/Colombo',
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Asia/Dubai',
  'Asia/Singapore',
  'Australia/Sydney'
];

function getTodayYmd(): string {
  return new Date().toISOString().split('T')[0];
}

function toYmdInput(raw: string | null | undefined, fallback = ''): string {
  if (!raw) return fallback;
  const trimmed = String(raw).trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return fallback;
}

function buildDefaultClassConfig(classroomId: string): PerClassAssignmentForm {
  const today = getTodayYmd();
  return {
    classroomId,
    status: 'active',
    availableFrom: today,
    dueDate: '',
    dailyReleaseEnabled: false,
    unlockFrequencyDays: 1,
    unlockLessonsPerRelease: 1,
    unlockStartDate: today,
    courseTimezone: 'Asia/Colombo',
    allowRetries: true,
    awardPoints: true,
    sequentialUnlock: false,
    trackMastery: true
  };
}

function hydrateClassConfigFromAssignment(
  classroomId: string,
  assignment: CourseClassroomAssignment
): PerClassAssignmentForm {
  const resolved = assignment.resolved_config;
  const s = assignment.settings || ({} as any);
  const u = assignment.unlock_configuration || ({} as any);
  const today = getTodayYmd();

  const availableFrom = toYmdInput(
    resolved?.available_from ?? assignment.start_date ?? s.available_from,
    today
  );
  const dueDate = toYmdInput(resolved?.due_date ?? assignment.due_date ?? s.due_date, '');
  const dailyReleaseEnabled =
    typeof resolved?.daily_release_enabled === 'boolean'
      ? resolved.daily_release_enabled
      : typeof assignment.daily_unlock_enabled === 'boolean'
        ? assignment.daily_unlock_enabled
        : Boolean(s.daily_release_enabled);

  const unlockFrequencyDays = Math.max(
    1,
    Number(
      resolved?.daily_release_interval_days ??
        u?.unlock_frequency_days ??
        s?.daily_release_interval_days ??
        1
    ) || 1
  );
  const unlockLessonsPerRelease = Math.max(
    1,
    Number(
      resolved?.unlock_lessons_per_release ??
        u?.unlock_lessons_per_release ??
        s?.unlock_lessons_per_release ??
        1
    ) || 1
  );
  const unlockStartDate = toYmdInput(
    resolved?.unlock_start_date ??
      u?.unlock_start_date ??
      s?.unlock_start_date ??
      s?.course_start_date,
    availableFrom
  );
  const courseTimezone =
    resolved?.course_timezone ||
    u?.course_timezone ||
    s?.course_timezone ||
    'Asia/Colombo';

  return {
    classroomId,
    assignmentId: assignment.id,
    status: assignment.status || 'active',
    availableFrom,
    dueDate,
    dailyReleaseEnabled,
    unlockFrequencyDays,
    unlockLessonsPerRelease,
    unlockStartDate,
    courseTimezone,
    allowRetries: resolved ? resolved.allow_retries : s.allow_retries !== false,
    awardPoints: resolved ? resolved.award_points : s.award_points !== false,
    sequentialUnlock: resolved ? resolved.sequential_unlock : Boolean(s.sequential_unlock),
    trackMastery: resolved ? resolved.track_mastery : s.track_mastery !== false
  };
}

function formatFrequencySummary(lessonsPerRelease: number, intervalDays: number): string {
  const lessonsLabel = `${lessonsPerRelease} lesson${lessonsPerRelease > 1 ? 's' : ''}`;
  if (intervalDays === 1) return `${lessonsLabel} / day`;
  if (intervalDays === 7) return `${lessonsLabel} / week`;
  return `${lessonsLabel} / ${intervalDays} days`;
}

export const CoursePublishModal: React.FC<Props> = ({
  isOpen,
  onClose,
  course,
  onSuccess,
  initialClassroomId
}) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [classConfigs, setClassConfigs] = useState<Record<string, PerClassAssignmentForm>>({});
  const [expandedClassIds, setExpandedClassIds] = useState<Set<string>>(new Set());
  const [confirmCopyFromClassId, setConfirmCopyFromClassId] = useState<string | null>(null);
  const [copyFeedbackMessage, setCopyFeedbackMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lock background page scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setConfirmCopyFromClassId(null);
    setCopyFeedbackMessage(null);
    loadTeacherClassroomsAndAssignments();
  }, [isOpen, course.id, initialClassroomId]);

  const loadTeacherClassroomsAndAssignments = async () => {
    setLoading(true);
    try {
      const [classroomList, fullCourse] = await Promise.all([
        classroomService.getClassrooms(),
        courseStudioService.getCourse(course.id, { forceRefresh: true }).catch(() => course)
      ]);
      setClassrooms(classroomList);

      const rawAssignments: CourseClassroomAssignment[] =
        (fullCourse as any)?.assignments ||
        (fullCourse as any)?.course_classroom_assignments ||
        (course as any)?.assignments ||
        [];

      const assignmentByClassroom = new Map<string, CourseClassroomAssignment>();
      rawAssignments.forEach(a => {
        if (a?.classroom_id) {
          assignmentByClassroom.set(a.classroom_id, a);
        }
      });

      const nextConfigs: Record<string, PerClassAssignmentForm> = {};
      const activeIds: string[] = [];

      classroomList.forEach(c => {
        const existingAssign = assignmentByClassroom.get(c.id);
        if (existingAssign) {
          nextConfigs[c.id] = hydrateClassConfigFromAssignment(c.id, existingAssign);
          if (existingAssign.status === 'active' || existingAssign.status === 'paused') {
            activeIds.push(c.id);
          }
        } else {
          nextConfigs[c.id] = buildDefaultClassConfig(c.id);
        }
      });

      // Handle pre-selected classroom from dashboard/classroom context without discarding others
      if (initialClassroomId && nextConfigs[initialClassroomId] && !activeIds.includes(initialClassroomId)) {
        activeIds.push(initialClassroomId);
      }

      setClassConfigs(nextConfigs);
      setSelectedClassIds(activeIds);

      // Expand initial class, or first couple of selected classes for immediate clarity
      if (initialClassroomId && activeIds.includes(initialClassroomId)) {
        setExpandedClassIds(new Set([initialClassroomId]));
      } else if (activeIds.length <= 2) {
        setExpandedClassIds(new Set(activeIds));
      } else if (activeIds.length > 0) {
        setExpandedClassIds(new Set([activeIds[0]]));
      } else {
        setExpandedClassIds(new Set());
      }
    } catch (err) {
      console.error('Failed to load classrooms or assignments:', err);
      setError('Failed to load classroom assignment settings.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const toggleClassSelection = (classroomId: string) => {
    setError(null);
    setConfirmCopyFromClassId(null);
    setSelectedClassIds(prev => {
      const exists = prev.includes(classroomId);
      if (exists) {
        return prev.filter(item => item !== classroomId);
      }
      // Ensure this classroom has an independent config entry (never copy another class silently)
      setClassConfigs(prevCfg =>
        prevCfg[classroomId]
          ? prevCfg
          : { ...prevCfg, [classroomId]: buildDefaultClassConfig(classroomId) }
      );
      setExpandedClassIds(prevExp => new Set([...prevExp, classroomId]));
      return [...prev, classroomId];
    });
  };

  const toggleExpanded = (classroomId: string) => {
    setExpandedClassIds(prev => {
      const next = new Set(prev);
      if (next.has(classroomId)) {
        next.delete(classroomId);
      } else {
        next.add(classroomId);
      }
      return next;
    });
  };

  const updateClassConfig = (
    classroomId: string,
    updater: (prev: PerClassAssignmentForm) => PerClassAssignmentForm
  ) => {
    setClassConfigs(prev => {
      const current = prev[classroomId] || buildDefaultClassConfig(classroomId);
      return {
        ...prev,
        [classroomId]: updater(current)
      };
    });
  };

  const applyConfigToAllSelected = (sourceClassId: string) => {
    const source = classConfigs[sourceClassId];
    if (!source) return;
    setClassConfigs(prev => {
      const next = { ...prev };
      selectedClassIds.forEach(targetId => {
        if (targetId === sourceClassId) return;
        const existingTarget = prev[targetId] || buildDefaultClassConfig(targetId);
        next[targetId] = {
          ...source,
          classroomId: targetId,
          assignmentId: existingTarget.assignmentId
        };
      });
      return next;
    });
    const sourceTitle = classrooms.find(c => c.id === sourceClassId)?.title || 'selected class';
    setConfirmCopyFromClassId(null);
    setCopyFeedbackMessage(`Copied ${sourceTitle}'s schedule and rules to all selected classes.`);
    setTimeout(() => setCopyFeedbackMessage(null), 4000);
  };

  const handlePublishAndAssign = async () => {
    setPublishing(true);
    setError(null);

    try {
      const class_assignments: ClassAssignmentInput[] = selectedClassIds.map(classroomId => {
        const cfg = classConfigs[classroomId] || buildDefaultClassConfig(classroomId);
        const dailyReleaseEnabled = cfg.dailyReleaseEnabled;
        const availableFromIso = cfg.availableFrom ? `${cfg.availableFrom}T00:00:00.000Z` : null;
        const dueDateIso = cfg.dueDate ? `${cfg.dueDate}T00:00:00.000Z` : null;
        const unlockStart = cfg.unlockStartDate || cfg.availableFrom || null;

        return {
          classroom_id: classroomId,
          status: cfg.status === 'paused' ? 'paused' : 'active',
          available_from: availableFromIso,
          start_date: availableFromIso,
          due_date: dueDateIso,
          daily_unlock_enabled: dailyReleaseEnabled,
          daily_release_enabled: dailyReleaseEnabled,
          daily_release_interval_days: cfg.unlockFrequencyDays,
          unlock_frequency_days: cfg.unlockFrequencyDays,
          unlock_lessons_per_release: cfg.unlockLessonsPerRelease,
          unlock_start_date: unlockStart,
          course_start_date: unlockStart,
          course_timezone: cfg.courseTimezone,
          unlock_configuration: {
            unlock_frequency_days: cfg.unlockFrequencyDays,
            unlock_lessons_per_release: cfg.unlockLessonsPerRelease,
            unlock_start_date: unlockStart,
            course_timezone: cfg.courseTimezone
          },
          settings: {
            sequential_unlock: cfg.sequentialUnlock,
            allow_retries: cfg.allowRetries,
            track_mastery: cfg.trackMastery,
            award_points: cfg.awardPoints,
            daily_release_enabled: dailyReleaseEnabled,
            daily_release_interval_days: cfg.unlockFrequencyDays,
            unlock_frequency_days: cfg.unlockFrequencyDays,
            unlock_lessons_per_release: cfg.unlockLessonsPerRelease,
            unlock_start_date: unlockStart,
            course_start_date: unlockStart,
            course_timezone: cfg.courseTimezone,
            available_from: availableFromIso,
            due_date: dueDateIso
          }
        };
      });

      // Save each class assignment independently without mutating global course schedule
      await courseStudioService.publishAndAssignCourse(course.id, {
        classroom_ids: selectedClassIds,
        class_assignments
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save class assignments.');
    } finally {
      setPublishing(false);
    }
  };

  const selectedClassrooms = selectedClassIds
    .map(id => classrooms.find(c => c.id === id))
    .filter((c): c is Classroom => Boolean(c));

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-publish-modal-title"
    >
      <div className="bg-white rounded-3xl w-full max-w-[1100px] max-h-[88dvh] flex flex-col overflow-hidden shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200">
        {/* PERSISTENT HEADER */}
        <div className="bg-[#0a213c] text-white px-6 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="course-publish-modal-title" className="text-base sm:text-lg font-black truncate">
                Manage Class Assignments & Delivery
              </h3>
              <p className="text-xs text-sky-200/80 font-medium truncate">
                "{course.title}" — Independent dates, deadlines & unlock schedules per class
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-white/60 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* INDEPENDENT SCROLLABLE BODY */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 py-6 space-y-6">
          {/* 1. Target Classrooms Grid */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#026fc3]" />
                <span>1. Select Classrooms</span>
              </label>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-[#026fc3] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  {selectedClassIds.length} Selected
                </span>
                {classrooms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedClassIds.length === classrooms.length) {
                        setSelectedClassIds([]);
                      } else {
                        const allIds = classrooms.map(c => c.id);
                        setClassConfigs(prev => {
                          const next = { ...prev };
                          allIds.forEach(cid => {
                            if (!next[cid]) next[cid] = buildDefaultClassConfig(cid);
                          });
                          return next;
                        });
                        setSelectedClassIds(allIds);
                        if (allIds.length > 0 && expandedClassIds.size === 0) {
                          setExpandedClassIds(new Set([allIds[0]]));
                        }
                      }
                    }}
                    className="text-xs font-bold text-[#026fc3] hover:underline cursor-pointer"
                  >
                    {selectedClassIds.length === classrooms.length ? 'Unassign All' : 'Select All'}
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="py-10 text-center text-xs text-slate-400 font-medium">
                Loading classrooms & independent assignment settings...
              </div>
            ) : classrooms.length === 0 ? (
              <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 font-semibold">
                You haven't created any classrooms yet. You can create a classroom anytime to assign this course.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {classrooms.map(c => {
                  const isSelected = selectedClassIds.includes(c.id);
                  const cfg = classConfigs[c.id] || buildDefaultClassConfig(c.id);
                  const isExisting = Boolean(cfg.assignmentId);

                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleClassSelection(c.id)}
                      className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex items-start justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-sky-50 border-[#026fc3] ring-1 ring-[#026fc3] shadow-xs'
                          : 'bg-slate-50/70 border-stone-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{c.title}</h4>
                          {isSelected && (
                            <span
                              className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                                cfg.status === 'paused'
                                  ? 'bg-amber-100 text-amber-800'
                                  : isExisting
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-sky-100 text-sky-700'
                              }`}
                            >
                              {cfg.status === 'paused' ? 'Paused' : isExisting ? 'Assigned' : 'New'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {c.subject || 'General'} • {c.grade || 'All Grades'} • {c.student_count || 0} students
                        </p>
                        {isSelected && (
                          <p className="text-[10px] font-semibold text-slate-600 truncate">
                            {cfg.availableFrom ? `From ${formatUnlockDateLabel(cfg.availableFrom)}` : 'Immediate'}
                            {cfg.dueDate ? ` • Due ${formatUnlockDateLabel(cfg.dueDate)}` : ''}
                            {cfg.dailyReleaseEnabled
                              ? ` • ${formatFrequencySummary(cfg.unlockLessonsPerRelease, cfg.unlockFrequencyDays)}`
                              : ' • All Open'}
                          </p>
                        )}
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 mt-0.5 transition-colors ${
                          isSelected
                            ? 'bg-[#026fc3] border-[#026fc3] text-white'
                            : 'bg-white border-stone-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {copyFeedbackMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{copyFeedbackMessage}</span>
            </div>
          )}

          {/* 2. Per-Class Independent Assignment Configuration Cards */}
          <div className="space-y-3 pt-4 border-t border-stone-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  2. Configure Each Class Individually
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Each selected class has its own independent availability, deadline, and Learning Pace & Access rules.
                </p>
              </div>
            </div>

            {selectedClassrooms.length === 0 ? (
              <div className="p-5 bg-slate-50 border border-stone-200 rounded-2xl text-xs text-slate-500 font-medium text-center space-y-1">
                <p>Select one or more classes above to configure availability dates, deadlines, and Learning Pace & Access settings for each class.</p>
                <p className="sr-only">Learning Pace & Access — Unlock One Lesson Per Day</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedClassrooms.map(classroom => {
                  const cfg = classConfigs[classroom.id] || buildDefaultClassConfig(classroom.id);
                  const isExpanded = expandedClassIds.has(classroom.id);
                  const availLabel = cfg.availableFrom ? formatUnlockDateLabel(cfg.availableFrom) : 'Immediately';
                  const dueLabel = cfg.dueDate ? formatUnlockDateLabel(cfg.dueDate) : 'No deadline';
                  const unlockSummary = cfg.dailyReleaseEnabled
                    ? `Daily Unlock: ${formatFrequencySummary(cfg.unlockLessonsPerRelease, cfg.unlockFrequencyDays)}`
                    : 'All lessons open';

                  return (
                    <div
                      key={classroom.id}
                      data-testid={`class-assignment-card-${classroom.id}`}
                      className="rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden"
                    >
                      {/* Collapsible Card Header */}
                      <div
                        onClick={() => toggleExpanded(classroom.id)}
                        className={`px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-slate-50 border-b border-stone-200' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-slate-900">{classroom.title}</span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                cfg.status === 'paused'
                                  ? 'bg-amber-100 text-amber-800'
                                  : cfg.assignmentId
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-sky-100 text-sky-700'
                              }`}
                            >
                              {cfg.status === 'paused' ? 'Paused' : cfg.assignmentId ? 'Assigned' : 'New Assignment'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600">
                            <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                              <Calendar className="w-3 h-3 text-[#026fc3]" />
                              <span>From {availLabel}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>{dueLabel}</span>
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${
                                cfg.dailyReleaseEnabled
                                  ? 'bg-sky-50 text-[#026fc3] border-sky-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {cfg.dailyReleaseEnabled ? (
                                <Lock className="w-3 h-3" />
                              ) : (
                                <Unlock className="w-3 h-3" />
                              )}
                              <span>{unlockSummary}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-bold text-[#026fc3]">
                            {isExpanded ? 'Hide Settings' : 'Edit Settings'}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Class Configuration Body */}
                      {isExpanded && (
                        <div className="p-4 sm:p-5 space-y-5 bg-white">
                          {/* Explicit Opt-In Copy Helper (NEVER applied silently) */}
                          {selectedClassrooms.length > 1 && (
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-100">
                              <span className="text-[11px] text-slate-500 font-medium">
                                Changes below apply only to <strong>{classroom.title}</strong>.
                              </span>
                              {confirmCopyFromClassId === classroom.id ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-amber-700">
                                    Copy to all {selectedClassrooms.length} selected classes?
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => applyConfigToAllSelected(classroom.id)}
                                    className="px-2.5 py-1 rounded-lg bg-[#026fc3] text-white text-[11px] font-bold cursor-pointer hover:bg-[#03589e]"
                                  >
                                    Confirm Copy
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmCopyFromClassId(null)}
                                    className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold cursor-pointer hover:bg-slate-200"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmCopyFromClassId(classroom.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-[#026fc3] border border-stone-200 text-[11px] font-bold transition-colors cursor-pointer"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>Apply this class's settings to all selected classes</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* A. Class Availability, Deadline & Status */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-[#026fc3]" />
                                <span>Available From</span>
                              </label>
                              <input
                                type="date"
                                value={cfg.availableFrom}
                                onChange={e => {
                                  const nextAvail = e.target.value;
                                  updateClassConfig(classroom.id, prev => ({
                                    ...prev,
                                    availableFrom: nextAvail,
                                    unlockStartDate:
                                      prev.unlockStartDate === prev.availableFrom || !prev.unlockStartDate
                                        ? nextAvail
                                        : prev.unlockStartDate
                                  }));
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-slate-50/70 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#026fc3]"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Deadline (Optional)</span>
                                </label>
                                {cfg.dueDate && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateClassConfig(classroom.id, prev => ({ ...prev, dueDate: '' }))
                                    }
                                    className="text-[10px] font-bold text-slate-400 hover:text-rose-600 cursor-pointer"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                              <input
                                type="date"
                                value={cfg.dueDate}
                                onChange={e =>
                                  updateClassConfig(classroom.id, prev => ({
                                    ...prev,
                                    dueDate: e.target.value
                                  }))
                                }
                                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-slate-50/70 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#026fc3]"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Class Timezone</span>
                              </label>
                              <select
                                value={cfg.courseTimezone}
                                onChange={e =>
                                  updateClassConfig(classroom.id, prev => ({
                                    ...prev,
                                    courseTimezone: e.target.value
                                  }))
                                }
                                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-slate-50/70 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#026fc3]"
                              >
                                {COMMON_TIMEZONES.map(tz => (
                                  <option key={tz} value={tz}>
                                    {tz}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                                <Pause className="w-3.5 h-3.5 text-slate-600" />
                                <span>Assignment Status</span>
                              </label>
                              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 border border-stone-200">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateClassConfig(classroom.id, prev => ({ ...prev, status: 'active' }))
                                  }
                                  className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    cfg.status !== 'paused'
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Active
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateClassConfig(classroom.id, prev => ({ ...prev, status: 'paused' }))
                                  }
                                  className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    cfg.status === 'paused'
                                      ? 'bg-amber-600 text-white shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Paused
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* B. Learning Pace & Access + Experience Restrictions */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2 border-t border-stone-100">
                            {/* Learning Pace & Access */}
                            <div className="space-y-3">
                              <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-[#026fc3]" />
                                <span>Learning Pace & Access</span>
                              </h5>

                              <div
                                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                                  cfg.dailyReleaseEnabled
                                    ? 'bg-sky-50/70 border-[#026fc3]'
                                    : 'bg-slate-50/70 border-stone-200'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h6 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                                      <span>Unlock One Lesson Per Day</span>
                                    </h6>
                                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                                      {cfg.dailyReleaseEnabled
                                        ? `Enabled: Students in ${classroom.title} follow this class's release schedule.`
                                        : `Disabled: All lessons are immediately open for ${classroom.title}.`}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-stone-200 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateClassConfig(classroom.id, prev => ({
                                          ...prev,
                                          dailyReleaseEnabled: true
                                        }))
                                      }
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                        cfg.dailyReleaseEnabled
                                          ? 'bg-[#026fc3] text-white shadow-2xs'
                                          : 'text-slate-500 hover:text-slate-800'
                                      }`}
                                    >
                                      Enabled
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateClassConfig(classroom.id, prev => ({
                                          ...prev,
                                          dailyReleaseEnabled: false
                                        }))
                                      }
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                        !cfg.dailyReleaseEnabled
                                          ? 'bg-slate-700 text-white shadow-2xs'
                                          : 'text-slate-500 hover:text-slate-800'
                                      }`}
                                    >
                                      Disabled
                                    </button>
                                  </div>
                                </div>

                                {cfg.dailyReleaseEnabled && (
                                  <div className="pt-2 border-t border-sky-200/70 space-y-3">
                                    {/* Quick Pacing Presets */}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {[
                                        { label: '1 lesson / day', lessons: 1, days: 1 },
                                        { label: '1 lesson / 2 days', lessons: 1, days: 2 },
                                        { label: '2 lessons / week', lessons: 2, days: 7 }
                                      ].map(preset => {
                                        const isActivePreset =
                                          cfg.unlockLessonsPerRelease === preset.lessons &&
                                          cfg.unlockFrequencyDays === preset.days;
                                        return (
                                          <button
                                            key={preset.label}
                                            type="button"
                                            onClick={() =>
                                              updateClassConfig(classroom.id, prev => ({
                                                ...prev,
                                                unlockLessonsPerRelease: preset.lessons,
                                                unlockFrequencyDays: preset.days
                                              }))
                                            }
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                              isActivePreset
                                                ? 'bg-[#026fc3] text-white border-[#026fc3]'
                                                : 'bg-white text-slate-600 border-stone-200 hover:border-sky-300'
                                            }`}
                                          >
                                            {preset.label}
                                          </button>
                                        );
                                      })}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                          Lessons Released
                                        </label>
                                        <input
                                          type="number"
                                          min={1}
                                          max={20}
                                          value={cfg.unlockLessonsPerRelease}
                                          onChange={e =>
                                            updateClassConfig(classroom.id, prev => ({
                                              ...prev,
                                              unlockLessonsPerRelease: Math.max(1, Number(e.target.value) || 1)
                                            }))
                                          }
                                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-bold text-slate-800 outline-none focus:border-[#026fc3]"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                          Every (Days)
                                        </label>
                                        <input
                                          type="number"
                                          min={1}
                                          max={90}
                                          value={cfg.unlockFrequencyDays}
                                          onChange={e =>
                                            updateClassConfig(classroom.id, prev => ({
                                              ...prev,
                                              unlockFrequencyDays: Math.max(1, Number(e.target.value) || 1)
                                            }))
                                          }
                                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-bold text-slate-800 outline-none focus:border-[#026fc3]"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                          Schedule Start Date
                                        </label>
                                        <input
                                          type="date"
                                          value={cfg.unlockStartDate}
                                          onChange={e =>
                                            updateClassConfig(classroom.id, prev => ({
                                              ...prev,
                                              unlockStartDate: e.target.value
                                            }))
                                          }
                                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-bold text-slate-800 outline-none focus:border-[#026fc3]"
                                        />
                                      </div>
                                    </div>

                                    <p className="text-[11px] font-semibold text-[#026fc3] bg-white/80 px-3 py-2 rounded-xl border border-sky-200/80">
                                      Releases{' '}
                                      <strong>{formatFrequencySummary(cfg.unlockLessonsPerRelease, cfg.unlockFrequencyDays)}</strong>{' '}
                                      starting{' '}
                                      <strong>
                                        {cfg.unlockStartDate
                                          ? formatUnlockDateLabel(cfg.unlockStartDate)
                                          : 'immediately'}
                                      </strong>
                                      .
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Student Experience Restrictions */}
                            <div className="space-y-3">
                              <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                                Student Experience Restrictions
                              </h5>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {[
                                  {
                                    key: 'allowRetries' as const,
                                    label: 'Allow Answer Retries',
                                    desc: 'Students can retry incorrect interactive questions'
                                  },
                                  {
                                    key: 'awardPoints' as const,
                                    label: 'Award Leaderboard Points',
                                    desc: 'Lessons credit earned XP into class leaderboard'
                                  },
                                  {
                                    key: 'sequentialUnlock' as const,
                                    label: 'Sequential Lesson Unlock',
                                    desc: 'Complete prior lesson before advancing'
                                  },
                                  {
                                    key: 'trackMastery' as const,
                                    label: 'Track Concept Mastery',
                                    desc: 'Feed analytics & concept scores to teacher reports'
                                  }
                                ].map(item => {
                                  const activeVal = Boolean(cfg[item.key]);
                                  return (
                                    <button
                                      key={item.key}
                                      type="button"
                                      onClick={() =>
                                        updateClassConfig(classroom.id, prev => ({
                                          ...prev,
                                          [item.key]: !prev[item.key]
                                        }))
                                      }
                                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-2 ${
                                        activeVal
                                          ? 'bg-sky-50/50 border-sky-300'
                                          : 'bg-slate-50/70 border-stone-200'
                                      }`}
                                    >
                                      <div className="min-w-0">
                                        <span className="block text-xs font-bold text-slate-900">
                                          {item.label}
                                        </span>
                                        <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">
                                          {item.desc}
                                        </span>
                                      </div>
                                      <div
                                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                                          activeVal
                                            ? 'bg-[#026fc3] text-white'
                                            : 'bg-white border border-stone-300'
                                        }`}
                                      >
                                        {activeVal && <Check className="w-3 h-3 stroke-[3]" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* PERSISTENT FOOTER */}
        <div className="px-6 sm:px-8 py-4 bg-slate-50 border-t border-stone-200 flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs font-semibold text-slate-500 hidden sm:block">
            {selectedClassIds.length === 0
              ? 'No classes assigned yet — unchecking a class archives access without erasing progress.'
              : `${selectedClassIds.length} class${selectedClassIds.length === 1 ? '' : 'es'} configured independently`}
          </p>
          <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-600 hover:bg-slate-200/60 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePublishAndAssign}
              disabled={publishing}
              className="px-6 py-2.5 bg-[#026fc3] hover:bg-[#03589e] disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {publishing
                  ? 'Saving Assignments...'
                  : selectedClassIds.length > 0
                    ? `Save Assignments (${selectedClassIds.length})`
                    : 'Publish Without Classes'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
