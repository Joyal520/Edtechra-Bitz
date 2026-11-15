import type {
  ClassroomJigsawConfig,
  JigsawQuestion,
  JigsawMcqQuestion,
  JigsawTrueFalseQuestion,
  JigsawUnscrambleQuestion,
} from '../types/gameLibrary';

/**
 * Generates a unique local question ID safe for client and server use.
 */
export function createJigsawQuestionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `jq_${crypto.randomUUID().slice(0, 12)}`;
  }
  return `jq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Splits a teacher sentence into exact word tokens using whitespace boundaries,
 * without adding, removing, or substituting words.
 */
export function tokenizeSentenceWords(sentence: string): string[] {
  const cleaned = String(sentence || '').trim();
  if (!cleaned) return [];
  return cleaned.split(/\s+/).filter(Boolean);
}

/**
 * Normalizes a single word token for order comparison while handling
 * capitalization and optional trailing sentence punctuation cleanly.
 */
export function normalizeUnscrambleToken(token: string): string {
  return String(token || '')
    .trim()
    .replace(/[.!?]+$/g, '')
    .toLowerCase();
}

/**
 * Validates a student's arranged word tokens against the teacher's canonical sentence.
 */
export function validateUnscrambleTokens(
  studentTokens: string[],
  targetSentence: string
): boolean {
  const expectedTokens = tokenizeSentenceWords(targetSentence);
  if (expectedTokens.length < 2) return false;
  if (!Array.isArray(studentTokens) || studentTokens.length !== expectedTokens.length) {
    return false;
  }
  for (let i = 0; i < expectedTokens.length; i += 1) {
    if (normalizeUnscrambleToken(studentTokens[i]) !== normalizeUnscrambleToken(expectedTokens[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Produces a deterministic or random non-trivial permutation of tokens.
 * Guarantees at least one position differs from the original order when >= 2 distinct tokens exist.
 */
export function shuffleTokens(tokens: string[], seedInput?: string): string[] {
  const arr = [...tokens];
  if (arr.length <= 1) return arr;

  const hasDistinct = new Set(arr.map((t) => normalizeUnscrambleToken(t))).size > 1;
  let state = 0;
  if (seedInput) {
    for (let i = 0; i < seedInput.length; i += 1) {
      state = (state * 31 + seedInput.charCodeAt(i)) >>> 0;
    }
  }
  const nextRand = () => {
    if (!seedInput) return Math.random();
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(nextRand() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    const sameOrder = copy.every((t, idx) => t === arr[idx]);
    if (!hasDistinct || !sameOrder) {
      return copy;
    }
  }

  // Fallback swap if still identical
  if (hasDistinct) {
    for (let i = 1; i < arr.length; i += 1) {
      if (normalizeUnscrambleToken(arr[i]) !== normalizeUnscrambleToken(arr[0])) {
        const swapped = [...arr];
        [swapped[0], swapped[i]] = [swapped[i], swapped[0]];
        return swapped;
      }
    }
  }
  return arr;
}

export function computeJigsawScoreBreakdown(
  maxPoints: number,
  totalQuestions: number,
  correctCount: number
): {
  puzzlePoints: number;
  questionPoints: number;
  totalPoints: number;
  accuracyPct: number;
} {
  const safeMax = Math.max(0, Math.round(Number(maxPoints) || 0));
  if (totalQuestions <= 0) {
    return {
      puzzlePoints: safeMax,
      questionPoints: 0,
      totalPoints: safeMax,
      accuracyPct: 100,
    };
  }
  const safeCorrect = Math.max(0, Math.min(totalQuestions, Math.round(Number(correctCount) || 0)));
  const puzzlePoints = safeMax > 0 ? Math.max(1, Math.round(safeMax * 0.25)) : 0;
  const quizPool = Math.max(0, safeMax - puzzlePoints);
  const questionPoints =
    safeCorrect === totalQuestions
      ? quizPool
      : Math.round((quizPool * safeCorrect) / totalQuestions);
  const totalPoints = Math.min(safeMax, puzzlePoints + questionPoints);
  const accuracyPct = Math.round((safeCorrect / totalQuestions) * 100);
  return {
    puzzlePoints,
    questionPoints: totalPoints - puzzlePoints,
    totalPoints,
    accuracyPct,
  };
}

export function validateJigsawQuestion(
  q: JigsawQuestion,
  indexLabel?: string
): string | null {
  const prefix = indexLabel ? `${indexLabel}: ` : '';
  if (!q || typeof q !== 'object') {
    return `${prefix}Question entry is invalid.`;
  }
  if (q.type === 'mcq') {
    if (!q.prompt || !q.prompt.trim()) {
      return `${prefix}MCQ question prompt is required.`;
    }
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some((opt) => !String(opt || '').trim())) {
      return `${prefix}All four options (A, B, C, D) must be filled for MCQ questions.`;
    }
    if (![0, 1, 2, 3].includes(Number(q.correctIndex))) {
      return `${prefix}Please select the correct option (A–D) for the MCQ question.`;
    }
    return null;
  }
  if (q.type === 'true_false') {
    if (!q.prompt || !q.prompt.trim()) {
      return `${prefix}True or False statement text is required.`;
    }
    if (typeof q.correctAnswer !== 'boolean') {
      return `${prefix}Please select True or False as the correct answer.`;
    }
    return null;
  }
  if (q.type === 'unscramble') {
    const tokens = tokenizeSentenceWords(q.sentence);
    if (tokens.length < 2) {
      return `${prefix}Sentence Unscramble must contain at least 2 words.`;
    }
    return null;
  }
  return `${prefix}Unsupported question type.`;
}

export function validateJigsawConfig(
  cfg: ClassroomJigsawConfig,
  levelLabel = 'Puzzle'
): { error?: string; normalized?: ClassroomJigsawConfig } {
  const imgs =
    Array.isArray(cfg.images) && cfg.images.length > 0
      ? cfg.images.filter(Boolean)
      : cfg.imageDataUrl
      ? [cfg.imageDataUrl]
      : [];

  if (imgs.length === 0) {
    return {
      error: `${levelLabel}: Please upload a picture for the Classroom Jigsaw puzzle.`,
    };
  }

  const questionsEnabled = Boolean(cfg.questionsEnabled);
  const rawQuestions = Array.isArray(cfg.questions) ? cfg.questions : [];

  if (questionsEnabled && rawQuestions.length === 0) {
    return {
      error: `${levelLabel}: Questions are enabled, so please add at least 1 question or turn Questions OFF.`,
    };
  }

  const cleanQuestions: JigsawQuestion[] = [];
  if (questionsEnabled) {
    for (let i = 0; i < rawQuestions.length; i += 1) {
      const q = rawQuestions[i];
      const err = validateJigsawQuestion(q, `${levelLabel} Question #${i + 1}`);
      if (err) return { error: err };

      const id = (q.id || '').trim() || createJigsawQuestionId();
      if (q.type === 'mcq') {
        const cleanOpts = q.options.map((o) => String(o).trim()) as [string, string, string, string];
        const cleanMcq: JigsawMcqQuestion = {
          id,
          type: 'mcq',
          prompt: q.prompt.trim(),
          options: cleanOpts,
          correctIndex: Number(q.correctIndex) as 0 | 1 | 2 | 3,
        };
        cleanQuestions.push(cleanMcq);
      } else if (q.type === 'true_false') {
        const cleanTf: JigsawTrueFalseQuestion = {
          id,
          type: 'true_false',
          prompt: q.prompt.trim(),
          correctAnswer: Boolean(q.correctAnswer),
        };
        cleanQuestions.push(cleanTf);
      } else {
        const cleanSentence = q.sentence.trim().replace(/\s+/g, ' ');
        const tokens = tokenizeSentenceWords(cleanSentence);
        const cleanUnscramble: JigsawUnscrambleQuestion = {
          id,
          type: 'unscramble',
          sentence: cleanSentence,
          shuffledTokens: shuffleTokens(tokens, id),
        };
        cleanQuestions.push(cleanUnscramble);
      }
    }
  }

  return {
    normalized: {
      imageDataUrl: imgs[0],
      images: imgs,
      gridSize: ([2, 3, 4].includes(Number(cfg.gridSize)) ? Number(cfg.gridSize) : 3) as 2 | 3 | 4,
      title: (cfg.title || '').trim() || levelLabel,
      showTimer: cfg.showTimer !== false,
      questionsEnabled,
      questions: questionsEnabled ? cleanQuestions : [],
      questionCount: questionsEnabled ? cleanQuestions.length : 0,
    },
  };
}

export interface ParsedJigsawBulkResult {
  questions: JigsawQuestion[];
  errors: Array<{ row: number; raw: string; reason: string }>;
  totalRows: number;
}

/**
 * Splits a single CSV line handling double-quoted fields, or a pipe-delimited line.
 */
function splitBulkRow(line: string): string[] {
  const hasPipe = line.includes('|') && !line.includes('","');
  if (hasPipe) {
    return line.split('|').map((c) => c.trim());
  }
  const fields: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

function normalizeBulkType(rawType: string): 'mcq' | 'true_false' | 'unscramble' | null {
  const norm = String(rawType || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (norm === 'MCQ' || norm === 'MULTIPLE_CHOICE') return 'mcq';
  if (
    norm === 'TRUE_FALSE' ||
    norm === 'TRUE/FALSE' ||
    norm === 'TRUEFALSE' ||
    norm === 'TF' ||
    norm === 'T/F' ||
    norm === 'BOOLEAN'
  ) {
    return 'true_false';
  }
  if (
    norm === 'UNSCRAMBLE' ||
    norm === 'UNSCRAMBLE_SENTENCE' ||
    norm === 'UNSCRAMBLE_THE_SENTENCE' ||
    norm === 'SENTENCE_UNSCRAMBLE' ||
    norm === 'SENTENCE'
  ) {
    return 'unscramble';
  }
  return null;
}

/**
 * Parses Bulk CSV / TXT / Pasted Jigsaw Questions strictly with zero default rows.
 * Supported columns:
 *   Type | Question / Statement / Sentence | Option A | Option B | Option C | Option D | Correct Answer
 */
export function parseBulkJigsawQuestions(rawText: string): ParsedJigsawBulkResult {
  const lines = String(rawText || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const questions: JigsawQuestion[] = [];
  const errors: Array<{ row: number; raw: string; reason: string }> = [];

  if (lines.length === 0) {
    return { questions, errors, totalRows: 0 };
  }

  let startIdx = 0;
  const firstCols = splitBulkRow(lines[0]).map((c) => c.toLowerCase());
  if (
    firstCols[0] === 'type' ||
    firstCols[0] === 'question type' ||
    (firstCols[1] && (firstCols[1].includes('question') || firstCols[1].includes('statement')))
  ) {
    startIdx = 1;
  }

  for (let i = startIdx; i < lines.length; i += 1) {
    const raw = lines[i];
    const rowNumber = i + 1;
    const cols = splitBulkRow(raw);
    const qType = normalizeBulkType(cols[0] || '');
    if (!qType) {
      errors.push({
        row: rowNumber,
        raw,
        reason: `Unknown question type "${cols[0] || ''}". Expected MCQ, TRUE_FALSE, or UNSCRAMBLE.`,
      });
      continue;
    }

    const promptText = (cols[1] || '').trim();
    if (!promptText) {
      errors.push({
        row: rowNumber,
        raw,
        reason: 'Question / Statement / Sentence is empty.',
      });
      continue;
    }

    if (qType === 'mcq') {
      const optA = (cols[2] || '').trim();
      const optB = (cols[3] || '').trim();
      const optC = (cols[4] || '').trim();
      const optD = (cols[5] || '').trim();
      const ansRaw = (cols[6] || '').trim();
      if (!optA || !optB || !optC || !optD) {
        errors.push({
          row: rowNumber,
          raw,
          reason: 'MCQ row must include all 4 options (Option A, Option B, Option C, Option D).',
        });
        continue;
      }
      let correctIndex: 0 | 1 | 2 | 3 | -1 = -1;
      const letter = ansRaw.toUpperCase();
      if (letter === 'A' || letter === '1') correctIndex = 0;
      else if (letter === 'B' || letter === '2') correctIndex = 1;
      else if (letter === 'C' || letter === '3') correctIndex = 2;
      else if (letter === 'D' || letter === '4') correctIndex = 3;
      else {
        const idxByText = [optA, optB, optC, optD].findIndex(
          (o) => o.toLowerCase() === ansRaw.toLowerCase()
        );
        if (idxByText >= 0) correctIndex = idxByText as 0 | 1 | 2 | 3;
      }
      if (correctIndex === -1) {
        errors.push({
          row: rowNumber,
          raw,
          reason: `MCQ Correct Answer "${ansRaw}" must be A, B, C, D, or match one of the four options.`,
        });
        continue;
      }
      questions.push({
        id: createJigsawQuestionId(),
        type: 'mcq',
        prompt: promptText,
        options: [optA, optB, optC, optD],
        correctIndex,
      });
      continue;
    }

    if (qType === 'true_false') {
      // Allow either 3-column (TRUE_FALSE, statement, TRUE) or 7-column (TRUE_FALSE, statement, , , , , TRUE)
      const ansCandidate = (cols[6] || cols[2] || '').trim().toUpperCase();
      if (ansCandidate === 'TRUE' || ansCandidate === 'T' || ansCandidate === 'YES' || ansCandidate === '1') {
        questions.push({
          id: createJigsawQuestionId(),
          type: 'true_false',
          prompt: promptText,
          correctAnswer: true,
        });
      } else if (ansCandidate === 'FALSE' || ansCandidate === 'F' || ansCandidate === 'NO' || ansCandidate === '0') {
        questions.push({
          id: createJigsawQuestionId(),
          type: 'true_false',
          prompt: promptText,
          correctAnswer: false,
        });
      } else {
        errors.push({
          row: rowNumber,
          raw,
          reason: `True/False answer "${ansCandidate}" must be TRUE or FALSE.`,
        });
      }
      continue;
    }

    // UNSCRAMBLE: allows sentence in col 1 (or override in col 6 if someone filled both, prefer col 1 if >= 2 words)
    const cleanSentence = promptText.replace(/\s+/g, ' ');
    const tokens = tokenizeSentenceWords(cleanSentence);
    if (tokens.length < 2) {
      errors.push({
        row: rowNumber,
        raw,
        reason: 'Sentence Unscramble row must contain a complete sentence with at least 2 words.',
      });
      continue;
    }
    const qId = createJigsawQuestionId();
    questions.push({
      id: qId,
      type: 'unscramble',
      sentence: cleanSentence,
      shuffledTokens: shuffleTokens(tokens, qId),
    });
  }

  return {
    questions,
    errors,
    totalRows: Math.max(0, lines.length - startIdx),
  };
}

export const JIGSAW_BULK_SAMPLE_CSV = [
  'Type,Question / Statement / Sentence,Option A,Option B,Option C,Option D,Correct Answer',
  'MCQ,"What animal can you see in the picture?",Fish,Turtle,Gecko,Rabbit,C',
  'TRUE_FALSE,"There is a gecko sitting on a leaf.",,,,,TRUE',
  'UNSCRAMBLE,"The green gecko is climbing up the branch.",,,,,',
].join('\n');
