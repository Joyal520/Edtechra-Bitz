// ============================================================================
// EDTECHRA COURSE STUDIO: TYPING-ONLY WRITING ASSESSMENT UTILITIES
// Provides live word counting, 45-55 word target resolution, rapid text
// insertion detection, anti-paste telemetry, and refresh-safe draft storage.
// ============================================================================

export const DEFAULT_WRITING_MIN_WORDS = 45;
export const DEFAULT_WRITING_MAX_WORDS = 55;
export const MAX_SINGLE_INPUT_CHAR_DELTA = 14;
export const MAX_BURST_CHARS_PER_SECOND = 35;

export interface WritingTypingTelemetry {
  keystrokeCount: number;
  backspaceCount: number;
  pasteAttemptsBlocked: number;
  dropAttemptsBlocked: number;
  rapidInsertionFlags: number;
  startedAt: number | null;
  lastInputAt: number | null;
  activeTypingDurationMs: number;
}

export interface WritingWordLimits {
  minWords: number;
  maxWords: number;
}

/**
 * Counts words in a student's writing response.
 */
export function countWritingWords(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Resolves the required minWords and recommended maxWords for a writing question.
 * Defaults to 45–55 words when not explicitly overridden in the prompt or question config.
 */
export function resolveWritingWordLimits(question?: {
  question_text?: string;
  min_words?: number;
  max_words?: number;
  options?: any;
}): WritingWordLimits {
  if (!question) {
    return { minWords: DEFAULT_WRITING_MIN_WORDS, maxWords: DEFAULT_WRITING_MAX_WORDS };
  }

  // 1. Check explicit prompt text for "X-Y words" or "X to Y words" (e.g., "45–55 words")
  const promptText = String(question.question_text || '');
  const rangeMatch = promptText.match(/(\d{2,3})\s*(?:[-–—]|to)\s*(\d{2,3})\s*words/i);
  if (rangeMatch) {
    const parsedMin = parseInt(rangeMatch[1], 10);
    const parsedMax = parseInt(rangeMatch[2], 10);
    if (parsedMin > 0 && parsedMax >= parsedMin) {
      return { minWords: parsedMin, maxWords: parsedMax };
    }
  }

  // 2. Check explicit min_words / max_words on question or question.options
  const optObj =
    question.options && typeof question.options === 'object' && !Array.isArray(question.options)
      ? question.options
      : {};
  const rawMin = Number(question.min_words ?? optObj.min_words);
  const rawMax = Number(question.max_words ?? optObj.max_words);

  if (Number.isFinite(rawMin) && rawMin > 0) {
    const minWords = Math.round(rawMin);
    const maxWords =
      Number.isFinite(rawMax) && rawMax >= minWords
        ? Math.round(rawMax)
        : Math.round(minWords + 10);
    return { minWords, maxWords };
  }

  return {
    minWords: DEFAULT_WRITING_MIN_WORDS,
    maxWords: DEFAULT_WRITING_MAX_WORDS
  };
}

/**
 * Evaluates a text change event to detect suspiciously rapid text insertion
 * (e.g. programmatic injection, clipboard manager bypass, or macro burst).
 */
export function evaluateTextInsertionSecurity(params: {
  previousText: string;
  nextText: string;
  recentCharTimestamps: number[];
  nowMs?: number;
}): {
  allowed: boolean;
  isRapidInsertion: boolean;
  charDelta: number;
  wordDelta: number;
  updatedTimestamps: number[];
  reason?: string;
} {
  const prev = params.previousText || '';
  const next = params.nextText || '';
  const now = params.nowMs ?? Date.now();
  const charDelta = next.length - prev.length;
  const wordDelta = countWritingWords(next) - countWritingWords(prev);

  // Deletions, backspaces, or in-place single character edits are always allowed
  if (charDelta <= 1) {
    const recent = (params.recentCharTimestamps || []).filter(t => now - t < 1000);
    if (charDelta === 1) recent.push(now);
    return {
      allowed: true,
      isRapidInsertion: false,
      charDelta,
      wordDelta,
      updatedTimestamps: recent
    };
  }

  // Single event adding more than MAX_SINGLE_INPUT_CHAR_DELTA chars or >= 3 words at once
  if (charDelta > MAX_SINGLE_INPUT_CHAR_DELTA || wordDelta >= 3) {
    return {
      allowed: false,
      isRapidInsertion: true,
      charDelta,
      wordDelta,
      updatedTimestamps: params.recentCharTimestamps || [],
      reason: 'Suspiciously rapid text insertion detected. Please type your answer directly.'
    };
  }

  // Rolling 1-second window burst check
  const recent = (params.recentCharTimestamps || []).filter(t => now - t < 1000);
  for (let i = 0; i < Math.max(0, charDelta); i++) {
    recent.push(now);
  }

  if (recent.length > MAX_BURST_CHARS_PER_SECOND) {
    return {
      allowed: false,
      isRapidInsertion: true,
      charDelta,
      wordDelta,
      updatedTimestamps: recent,
      reason: 'Typing rate exceeded human threshold. Rapid text insertion is blocked.'
    };
  }

  return {
    allowed: true,
    isRapidInsertion: false,
    charDelta,
    wordDelta,
    updatedTimestamps: recent
  };
}

export function createInitialTypingTelemetry(): WritingTypingTelemetry {
  return {
    keystrokeCount: 0,
    backspaceCount: 0,
    pasteAttemptsBlocked: 0,
    dropAttemptsBlocked: 0,
    rapidInsertionFlags: 0,
    startedAt: null,
    lastInputAt: null,
    activeTypingDurationMs: 0
  };
}

export function getWritingDraftStorageKey(
  questionId: string,
  episodeId?: string,
  userId?: string | null
): string {
  const cleanUser = userId ? String(userId).trim() : 'student';
  const cleanEp = episodeId ? String(episodeId).trim() : 'ep';
  return `edtechra_writing_draft_v1:${cleanUser}:${cleanEp}:${questionId}`;
}

export function loadWritingDraft(
  questionId: string,
  episodeId?: string,
  userId?: string | null
): { text: string; telemetry: WritingTypingTelemetry } | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = getWritingDraftStorageKey(questionId, episodeId, userId);
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.text !== 'string') return null;
    return {
      text: parsed.text,
      telemetry: {
        ...createInitialTypingTelemetry(),
        ...(parsed.telemetry || {})
      }
    };
  } catch {
    return null;
  }
}

export function saveWritingDraft(
  questionId: string,
  text: string,
  telemetry: WritingTypingTelemetry,
  episodeId?: string,
  userId?: string | null
): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getWritingDraftStorageKey(questionId, episodeId, userId);
    window.localStorage.setItem(
      key,
      JSON.stringify({
        text,
        telemetry,
        updatedAt: new Date().toISOString()
      })
    );
  } catch {
    // Ignore storage errors
  }
}

export function clearWritingDraft(
  questionId: string,
  episodeId?: string,
  userId?: string | null
): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getWritingDraftStorageKey(questionId, episodeId, userId);
    window.localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}
