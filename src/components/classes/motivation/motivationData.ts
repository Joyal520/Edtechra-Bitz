export type MotivationSceneId =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14;

export interface MotivationCardData {
  day: number;
  message: string;
  sceneId: MotivationSceneId;
  theme: string;
}

export const COLOMBO_TIMEZONE = 'Asia/Colombo';

/**
 * Pastel card backgrounds preserved from the original 31 Days of Motivation Cards.
 */
export const CARD_BACKGROUNDS = [
  '#ffd97a',
  '#a3e4c1',
  '#92d0f5',
  '#f7c3da',
  '#d3c3f7',
  '#ffc9a3',
] as const;

/**
 * Bean character body colors preserved from the original 31 Days of Motivation Cards.
 */
export const BEAN_BODY_COLORS = [
  '#f06fa8',
  '#4a8be8',
  '#ff8a5c',
  '#8a67f0',
] as const;

/**
 * 31 student-friendly motivational life lessons aligned with EdTechra Classroom.
 * Each day preserves the concise, readable card format and maps to a matching bean illustration.
 */
export const MOTIVATION_CARDS: readonly MotivationCardData[] = [
  { day: 1, message: 'I believe in myself today', sceneId: 14, theme: 'Self-confidence' },
  { day: 2, message: 'Courage means trying even when I feel nervous', sceneId: 0, theme: 'Courage' },
  { day: 3, message: 'Every mistake teaches me how to improve', sceneId: 1, theme: 'Learning from mistakes' },
  { day: 4, message: 'I keep going when things get hard', sceneId: 2, theme: 'Resilience' },
  { day: 5, message: 'Small daily efforts build big success', sceneId: 3, theme: 'Hard work' },
  { day: 6, message: 'I stay curious and ask thoughtful questions', sceneId: 4, theme: 'Critical thinking' },
  { day: 7, message: 'My honest voice and ideas matter', sceneId: 5, theme: 'Honesty' },
  { day: 8, message: 'I am proud of every step forward', sceneId: 6, theme: 'Personal growth' },
  { day: 9, message: 'Patience helps my skills grow stronger', sceneId: 7, theme: 'Patience' },
  { day: 10, message: 'I treat myself and others with kindness', sceneId: 8, theme: 'Kindness' },
  { day: 11, message: 'Calm focus helps me make good choices', sceneId: 9, theme: 'Self-control' },
  { day: 12, message: 'I use my time wisely each day', sceneId: 12, theme: 'Time management' },
  { day: 13, message: 'Discipline turns good habits into strengths', sceneId: 10, theme: 'Discipline' },
  { day: 14, message: 'Creative thinking opens new possibilities', sceneId: 11, theme: 'Creativity' },
  { day: 15, message: 'I take responsibility for my own learning', sceneId: 13, theme: 'Responsibility' },
  { day: 16, message: 'I am grateful for those who guide me', sceneId: 8, theme: 'Gratitude' },
  { day: 17, message: 'Good friends lift each other up', sceneId: 14, theme: 'Friendship' },
  { day: 18, message: 'I listen with respect to everyone', sceneId: 5, theme: 'Respect' },
  { day: 19, message: 'Practice turns confusion into understanding', sceneId: 1, theme: 'Learning from mistakes' },
  { day: 20, message: 'I think carefully before I decide', sceneId: 4, theme: 'Critical thinking' },
  { day: 21, message: 'Hard work beats giving up every time', sceneId: 3, theme: 'Hard work' },
  { day: 22, message: 'I am brave enough to speak the truth', sceneId: 0, theme: 'Honesty' },
  { day: 23, message: 'I grow a little wiser every day', sceneId: 7, theme: 'Personal growth' },
  { day: 24, message: 'A clear plan keeps me on track', sceneId: 12, theme: 'Time management' },
  { day: 25, message: 'I pause and stay calm under pressure', sceneId: 9, theme: 'Self-control' },
  { day: 26, message: 'Setbacks cannot stop my determination', sceneId: 2, theme: 'Resilience' },
  { day: 27, message: 'I show up and do my part', sceneId: 10, theme: 'Responsibility' },
  { day: 28, message: 'My imagination can solve real problems', sceneId: 11, theme: 'Creativity' },
  { day: 29, message: 'Respect and kindness make our class stronger', sceneId: 6, theme: 'Respect' },
  { day: 30, message: 'I celebrate progress, not just perfection', sceneId: 13, theme: 'Gratitude' },
  { day: 31, message: 'I am ready to shine and help others', sceneId: 14, theme: 'Self-confidence' },
] as const;

export function getCardBackground(index: number): string {
  const safeIndex = ((index % CARD_BACKGROUNDS.length) + CARD_BACKGROUNDS.length) % CARD_BACKGROUNDS.length;
  return CARD_BACKGROUNDS[safeIndex];
}

export function getBeanBodyColor(index: number): string {
  const safeIndex = ((index % BEAN_BODY_COLORS.length) + BEAN_BODY_COLORS.length) % BEAN_BODY_COLORS.length;
  return BEAN_BODY_COLORS[safeIndex];
}

/**
 * Returns the 0-based card index (0..30) for the current calendar day in Asia/Colombo timezone,
 * ensuring all students see the same card on the same calendar day.
 */
export function getColomboDayIndex(date: Date = new Date()): number {
  try {
    const dayStr = new Intl.DateTimeFormat('en-US', {
      timeZone: COLOMBO_TIMEZONE,
      day: 'numeric',
    }).format(date);
    const parsedDay = parseInt(dayStr, 10);
    if (Number.isFinite(parsedDay) && parsedDay >= 1) {
      return Math.min(parsedDay, 31) - 1;
    }
  } catch {
    // Fallback if Intl timezone formatting is unavailable
  }
  return Math.min(Math.max(date.getDate(), 1), 31) - 1;
}

/**
 * Returns a YYYY-MM-DD key in Asia/Colombo timezone for lightweight daily interaction state.
 */
export function getColomboDateKey(date: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: COLOMBO_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // Fallback
  }
  return date.toISOString().slice(0, 10);
}
