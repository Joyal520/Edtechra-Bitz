// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: PAYLOAD SANITIZER
// Strictly purges any browser objects (Window, Document, DOM Node, MouseEvent,
// PointerEvent, SyntheticEvent, Functions, Circular References) from payloads
// before network JSON serialization.
// ============================================================================

/**
 * Checks if a value is a browser Event object (MouseEvent, PointerEvent, etc.)
 */
export function isBrowserEvent(val: any): boolean {
  if (!val || typeof val !== 'object') return false;
  return Boolean(
    'nativeEvent' in val ||
    ('target' in val && 'type' in val) ||
    'view' in val ||
    'bubbles' in val ||
    'cancelable' in val ||
    (typeof Window !== 'undefined' && val instanceof (window as any).Event)
  );
}

/**
 * Sanitizes student answers map:
 * - Keeps primitives (string, number, boolean)
 * - Keeps arrays of primitives
 * - Keeps safe nested objects (e.g. matching or cloze answer mappings)
 * - Discards Events, DOM elements, Window, functions, and circular references
 */
export function sanitizeAnswersForPayload(answers: any): Record<string, any> {
  const cleanAnswers: Record<string, any> = {};
  if (!answers || typeof answers !== 'object' || isBrowserEvent(answers)) {
    return cleanAnswers;
  }

  for (const [key, val] of Object.entries(answers)) {
    if (!key || key === 'view' || key === 'window' || key === 'target' || key === 'nativeEvent') {
      continue;
    }

    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      cleanAnswers[key] = val;
    } else if (Array.isArray(val)) {
      cleanAnswers[key] = val.filter(
        item => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
      );
    } else if (val && typeof val === 'object') {
      if (isBrowserEvent(val)) {
        // Discard any browser Event objects stored as answers
        continue;
      }

      // Nested map (e.g. Matching pairs or Cloze sub-answers)
      const cleanSub: Record<string, any> = {};
      for (const [subK, subV] of Object.entries(val)) {
        if (typeof subV === 'string' || typeof subV === 'number' || typeof subV === 'boolean') {
          cleanSub[subK] = subV;
        }
      }
      cleanAnswers[key] = cleanSub;
    }
  }

  return cleanAnswers;
}

/**
 * Strips non-serializable properties (methods, window, DOM) from the exam object
 */
export function sanitizeExamForPayload(exam: any): any {
  if (!exam || typeof exam !== 'object') return null;

  return {
    id: String(exam.id || ''),
    classroom_id: exam.classroom_id ? String(exam.classroom_id) : undefined,
    title: String(exam.title || exam.exam?.title || 'Exam'),
    sections: Array.isArray(exam.sections)
      ? exam.sections
      : Array.isArray(exam.questions_json)
      ? exam.questions_json
      : [],
    questions_json: Array.isArray(exam.questions_json)
      ? exam.questions_json
      : Array.isArray(exam.sections)
      ? exam.sections
      : [],
    questions: Array.isArray(exam.questions) ? exam.questions : [],
    total_marks: Number(exam.total_marks || exam.totalMarks || 100),
    pass_marks: Number(exam.pass_marks || exam.passPercentage || 40),
    duration_minutes: Number(exam.duration_minutes || exam.durationMinutes || 45)
  };
}

/**
 * Safe JSON stringify that strips circular references and browser objects as a fallback
 */
export function safeJsonStringify(obj: any): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (key === 'view' || key === 'window') return undefined;
    if (typeof value === 'object' && value !== null) {
      if (typeof window !== 'undefined' && value === window) return undefined;
      if (typeof document !== 'undefined' && value === document) return undefined;
      if (isBrowserEvent(value)) return undefined;
      if (seen.has(value)) return undefined;
      seen.add(value);
    }
    return value;
  });
}
