// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: DAILY RELEASE & PROGRESSION ENGINE
// Calculates student lesson unlock schedule based on course timezone,
// student start date, explicit lesson positions, and completion states.
// ============================================================================

import {
  Course,
  CourseEpisode,
  LessonProgressionStatus,
  RoadmapLessonItem
} from '@/types/courseStudio';

export interface DailyReleaseCalculationOptions {
  course: Course;
  completedEpisodeIds?: Set<string> | string[];
  studentStartDate?: string | Date | null;
  currentDate?: string | Date | null;
  currentActiveEpisodeId?: string | null;
}

/**
 * Returns the calendar date string (YYYY-MM-DD) for a given timestamp in the course timezone.
 */
export function getDateStringInTimezone(dateInput: Date | string | number, timeZone = 'Asia/Colombo'): string {
  try {
    const d = new Date(dateInput);
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(d);
  } catch (err) {
    // Fallback to UTC if timezone is invalid
    return new Date(dateInput).toISOString().split('T')[0];
  }
}

/**
 * Computes calendar days elapsed between two dates in a specific timezone.
 * Returns 1 on the first day, 2 on the next calendar day, etc.
 */
export function getCalendarDaysElapsed(
  startDateInput: Date | string,
  currentDateInput: Date | string = new Date(),
  timeZone = 'Asia/Colombo'
): number {
  const startStr = getDateStringInTimezone(startDateInput, timeZone);
  const currentStr = getDateStringInTimezone(currentDateInput, timeZone);

  const startUTC = Date.UTC(
    parseInt(startStr.substring(0, 4), 10),
    parseInt(startStr.substring(5, 7), 10) - 1,
    parseInt(startStr.substring(8, 10), 10)
  );
  const currentUTC = Date.UTC(
    parseInt(currentStr.substring(0, 4), 10),
    parseInt(currentStr.substring(5, 7), 10) - 1,
    parseInt(currentStr.substring(8, 10), 10)
  );

  const diffMs = currentUTC - startUTC;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

/**
 * Computes the full roadmap items with accurate progression statuses.
 */
export function computeCourseRoadmap(options: DailyReleaseCalculationOptions): {
  items: RoadmapLessonItem[];
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  currentAvailableEpisode: RoadmapLessonItem | null;
  dailyReleaseEnabled: boolean;
  daysElapsed: number;
  timeZone: string;
} {
  const {
    course,
    completedEpisodeIds = new Set<string>(),
    studentStartDate,
    currentDate = new Date(),
    currentActiveEpisodeId
  } = options;

  const completedSet = completedEpisodeIds instanceof Set
    ? completedEpisodeIds
    : new Set(completedEpisodeIds);

  const dailyReleaseEnabled = Boolean(course.daily_release_enabled);
  const timeZone = course.course_timezone || 'Asia/Colombo';
  const effectiveStartDate: Date | string = studentStartDate || course.course_start_date || course.created_at || new Date();
  const effectiveCurrentDate: Date | string = currentDate || new Date();
  const daysElapsed = getCalendarDaysElapsed(effectiveStartDate, effectiveCurrentDate, timeZone);

  const rawEpisodes: Array<{ ep: CourseEpisode; unitTitle: string; unitId: string; unitIndex: number }> = [];

  (course.units || []).forEach((unit, uIdx) => {
    // Sort episodes by order_index / position
    const sortedEps = [...(unit.episodes || [])].sort((a, b) => {
      const posA = a.position !== undefined ? a.position : a.order_index;
      const posB = b.position !== undefined ? b.position : b.order_index;
      return posA - posB;
    });

    sortedEps.forEach(ep => {
      rawEpisodes.push({
        ep,
        unitTitle: unit.title,
        unitId: unit.id,
        unitIndex: uIdx + 1
      });
    });
  });

  const totalLessons = rawEpisodes.length;
  let globalPosition = 1;

  const items: RoadmapLessonItem[] = rawEpisodes.map((item, index) => {
    const ep = item.ep;
    const position = ep.position || globalPosition++;
    const releaseDay = position;
    const isCompleted = completedSet.has(ep.id);

    let isLocked = false;
    let status: LessonProgressionStatus = 'available';
    let unlockMessage = '';

    if (isCompleted) {
      status = 'completed';
      isLocked = false;
    } else if (dailyReleaseEnabled) {
      // Position 1 is always unlocked (never lock the first lesson)
      if (position === 1 || ep.is_manually_unlocked) {
        isLocked = false;
        status = (currentActiveEpisodeId === ep.id) ? 'in_progress' : 'available';
      } else if (position <= daysElapsed) {
        // Unlocked by day progression
        isLocked = false;
        status = (currentActiveEpisodeId === ep.id) ? 'in_progress' : 'available';
      } else {
        // Locked
        isLocked = true;
        status = 'locked';
        const dayDifference = position - daysElapsed;
        if (dayDifference === 1) {
          unlockMessage = `Lesson ${index + 1} is locked. It will open tomorrow at midnight.`;
        } else {
          unlockMessage = `Lesson ${index + 1} is locked. It will open on Day ${releaseDay}.`;
        }
      }
    } else {
      // Daily release is OFF -> all uncompleted lessons are available
      isLocked = false;
      status = (currentActiveEpisodeId === ep.id) ? 'in_progress' : 'available';
    }

    return {
      id: ep.id,
      unit_id: item.unitId,
      unit_title: item.unitTitle,
      unit_index: item.unitIndex,
      title: ep.title,
      position,
      order_index: ep.order_index !== undefined ? ep.order_index : index,
      estimated_minutes: ep.estimated_minutes || 15,
      status,
      release_day: releaseDay,
      is_locked: isLocked,
      unlock_message: unlockMessage,
      questions_count: ep.questions?.length || 0
    };
  });

  const completedLessons = items.filter(i => i.status === 'completed').length;
  const progressPercent = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  // Find the primary available lesson to continue
  const currentAvailableEpisode = items.find(i => i.status === 'in_progress')
    || items.find(i => i.status === 'available')
    || (items.length > 0 ? items[items.length - 1] : null);

  return {
    items,
    totalLessons,
    completedLessons,
    progressPercent,
    currentAvailableEpisode,
    dailyReleaseEnabled,
    daysElapsed,
    timeZone
  };
}
