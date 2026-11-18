// ============================================================================
// EDTECHRA COURSE STUDIO: GAMES & COMPETITIONS SERVER SERVICE
// Grounded AI Question Generation, Material Extraction, Server-Authoritative
// Grading, Scoring, Badges, and Analytics Aggregation.
// ============================================================================

import { AI_TASK_TYPES } from './ai/taskTypes.mjs';

const VALID_QUESTION_TYPES = new Set([
  'multiple_choice',
  'true_false',
  'fill_blank',
  'matching',
  'word_arrangement',
  'image_based',
  'short_answer',
  'correct_mistake'
]);

function stripHtmlToText(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTextFromCourseBlocks(blocks = []) {
  const parts = [];
  for (const b of blocks) {
    const c = b?.content || {};
    if (c.title) parts.push(String(c.title));
    if (c.heading) parts.push(String(c.heading));
    if (c.text) parts.push(stripHtmlToText(c.text));
    if (c.body) parts.push(stripHtmlToText(c.body));
    if (c.description) parts.push(stripHtmlToText(c.description));
    if (c.transcript) parts.push(String(c.transcript));
    if (c.video?.transcript) parts.push(String(c.video.transcript));
    if (Array.isArray(c.items)) {
      for (const item of c.items) {
        if (typeof item === 'string') parts.push(item);
        else if (item?.title || item?.text || item?.term || item?.definition) {
          parts.push([item.title, item.term, item.definition, item.text].filter(Boolean).join(': '));
        }
      }
    }
    if (Array.isArray(c.cards)) {
      for (const card of c.cards) {
        parts.push([card.title, card.word, card.definition, card.description].filter(Boolean).join(' - '));
      }
    }
  }
  return parts.filter(Boolean).join('\n').trim();
}

/**
 * Extracts grounded text from selected Course Lessons, EdTechra Library resources,
 * and uploaded materials while enforcing Library & Course access permissions.
 */
export async function extractMaterialsContext({ serverSupabase, userId, isAdmin = false, materials = [] }) {
  const sections = [];
  const attributedMaterials = [];

  for (const mat of materials) {
    if (!mat || !mat.source_type) continue;

    if (mat.source_type === 'course_lesson' && mat.episode_id && serverSupabase) {
      const { data: ep } = await serverSupabase
        .from('course_episodes')
        .select('id, title, course_id, courses!inner(id, title, teacher_id, status)')
        .eq('id', mat.episode_id)
        .maybeSingle();

      if (!ep) continue;
      const courseOwner = ep.courses?.teacher_id === userId;
      if (!courseOwner && ep.courses?.status !== 'published' && !isAdmin) continue;

      const { data: blocks } = await serverSupabase
        .from('course_blocks')
        .select('block_type, content, order_index')
        .eq('episode_id', ep.id)
        .order('order_index', { ascending: true });

      const text = extractTextFromCourseBlocks(blocks || []);
      const excerpt = text.slice(0, 8000);
      if (excerpt) {
        sections.push(`[SOURCE: Course Lesson "${ep.title}" from "${ep.courses?.title || 'Course'}"]\n${excerpt}`);
      }
      attributedMaterials.push({
        ...mat,
        title: mat.title || ep.title,
        attribution: `Course: ${ep.courses?.title || 'Course'} — ${ep.title}`
      });
    } else if (mat.source_type === 'library' && mat.library_resource_id && serverSupabase) {
      const { data: libRes } = await serverSupabase
        .from('library_resources')
        .select('id, title, description, subject, category, grade_level, file_type, file_url, author, published, uploaded_by')
        .eq('id', mat.library_resource_id)
        .maybeSingle();

      if (!libRes) continue;
      if (!libRes.published && libRes.uploaded_by !== userId && !isAdmin) continue;

      let fetchedText = mat.extracted_text ? String(mat.extracted_text).trim() : '';
      if (!fetchedText && libRes.file_url && /\.(html?|txt|md)$/i.test(libRes.file_url)) {
        try {
          const resp = await fetch(libRes.file_url, { signal: AbortSignal.timeout(6000) });
          if (resp.ok) {
            const raw = await resp.text();
            fetchedText = stripHtmlToText(raw).slice(0, 8000);
          }
        } catch {
          // Ignore network fetch errors and fall back to library metadata
        }
      }

      const metaSummary = [
        `Title: ${libRes.title}`,
        `Subject: ${libRes.subject}`,
        `Category: ${libRes.category}`,
        `Grade Level: ${libRes.grade_level}`,
        libRes.description ? `Description: ${libRes.description}` : ''
      ]
        .filter(Boolean)
        .join('\n');

      sections.push(
        `[SOURCE: EdTechra Library "${libRes.title}" (${libRes.file_type.toUpperCase()})]\n${metaSummary}${
          fetchedText ? `\nContent Excerpt:\n${fetchedText.slice(0, 7500)}` : ''
        }`
      );
      attributedMaterials.push({
        ...mat,
        title: libRes.title,
        subject: libRes.subject,
        file_url: libRes.file_url,
        file_type: libRes.file_type,
        attribution: `EdTechra Library: ${libRes.title}${libRes.author ? ` by ${libRes.author}` : ''}`
      });
    } else if (mat.source_type === 'upload') {
      const text = String(mat.extracted_text || '').trim().slice(0, 8000);
      if (text || mat.title) {
        sections.push(
          `[SOURCE: Uploaded Material "${mat.title || 'Teacher Upload'}"]\n${text || mat.title}`
        );
      }
      attributedMaterials.push({
        ...mat,
        attribution: `Teacher Upload: ${mat.title || 'Uploaded Resource'}`
      });
    }
  }

  return {
    combinedContext: sections.join('\n\n---\n\n').slice(0, 24000),
    attributedMaterials
  };
}

function normalizeGeneratedQuestion(raw, index, defaultDifficulty = 'medium', defaultPoints = 10) {
  const qType = VALID_QUESTION_TYPES.has(raw?.question_type)
    ? raw.question_type
    : 'multiple_choice';

  const questionText = String(raw?.question_text || raw?.prompt || '').trim();
  if (!questionText) return null;

  const difficulty = ['easy', 'medium', 'hard'].includes(raw?.difficulty)
    ? raw.difficulty
    : defaultDifficulty;

  const points = Number(raw?.points) > 0 ? Number(raw.points) : defaultPoints;
  const explanation = String(raw?.explanation || '').trim();
  const sourceRef = raw?.source_ref ? String(raw.source_ref).trim() : null;
  const imageUrl = raw?.image_url ? String(raw.image_url).trim() : null;

  let options = raw?.options;
  let correctAnswer = raw?.correct_answer;

  if (qType === 'true_false') {
    options = ['True', 'False'];
    const norm = String(correctAnswer ?? 'True').trim().toLowerCase();
    correctAnswer = norm === 'false' || norm === 'f' || norm === 'no' ? 'False' : 'True';
  } else if (qType === 'matching') {
    const pairs = Array.isArray(options)
      ? options
          .map((p) => ({
            left: String(p?.left || p?.term || '').trim(),
            right: String(p?.right || p?.definition || p?.match || '').trim()
          }))
          .filter((p) => p.left && p.right)
      : [];
    if (pairs.length < 2) return null;
    options = pairs;
    correctAnswer = pairs;
  } else if (qType === 'word_arrangement') {
    const targetSentence = String(
      Array.isArray(correctAnswer) ? correctAnswer.join(' ') : correctAnswer || ''
    ).trim();
    const words = targetSentence.split(/\s+/).filter(Boolean);
    if (words.length < 2) return null;
    const shuffled = Array.isArray(options) && options.length >= 2
      ? options.map(String)
      : [...words].sort(() => Math.random() - 0.5);
    options = shuffled;
    correctAnswer = targetSentence;
  } else if (qType === 'multiple_choice' || qType === 'image_based') {
    const opts = Array.isArray(options) ? options.map((o) => String(o).trim()).filter(Boolean) : [];
    if (opts.length < 2) return null;
    options = opts.slice(0, 6);
    const ans = String(correctAnswer || opts[0]).trim();
    correctAnswer = options.includes(ans) ? ans : options[0];
  } else {
    // fill_blank, short_answer, correct_mistake
    options = Array.isArray(options) ? options.map(String) : [];
    correctAnswer = String(correctAnswer || '').trim();
    if (!correctAnswer) return null;
  }

  return {
    id: raw?.id || `q_${Date.now()}_${index}`,
    order_index: index,
    question_type: qType,
    question_text: questionText,
    options,
    correct_answer: correctAnswer,
    explanation,
    points,
    difficulty,
    image_url: imageUrl,
    source_ref: sourceRef
  };
}

/**
 * Generates grounded questions strictly from the selected learning materials using AIRouter.
 */
export async function generateGroundedGameQuestions({
  aiRouter,
  materialContext,
  count = 10,
  difficulty = 'medium',
  questionTypes = ['multiple_choice', 'true_false'],
  targetLevel = 'All Grades',
  topic = '',
  learningObjective = '',
  pointsPerQuestion = 10
}) {
  if (!materialContext || !materialContext.trim()) {
    throw new Error('Please select at least one learning material with content before generating questions.');
  }

  const safeCount = Math.max(1, Math.min(30, Number(count) || 10));
  const safeTypes = (Array.isArray(questionTypes) ? questionTypes : ['multiple_choice'])
    .filter((t) => VALID_QUESTION_TYPES.has(t));
  if (safeTypes.length === 0) safeTypes.push('multiple_choice');

  const prompt = `You are an expert educational game designer. Generate ${safeCount} engaging, accurate questions strictly grounded in the LEARNING MATERIALS below.

CRITICAL GROUNDING RULE:
- ONLY use facts, concepts, vocabulary, and details present in the LEARNING MATERIALS below.
- Do NOT invent external facts or unrelated trivia that are absent from the selected sources.
- For each question, cite the source title in "source_ref".

CONFIGURATION:
- Number of questions: ${safeCount}
- Difficulty: ${difficulty}
- Target Learning Level: ${targetLevel}
- Topic / Focus: ${topic || 'Derived from selected materials'}
- Learning Objective: ${learningObjective || 'Assess comprehension and application of the selected materials'}
- Allowed question_type values: ${safeTypes.join(', ')}

FORMAT REQUIREMENTS BY question_type:
1. "multiple_choice": "options" is an array of 4 strings; "correct_answer" is the exact matching string from options.
2. "true_false": "options" is ["True", "False"]; "correct_answer" is "True" or "False".
3. "fill_blank": "question_text" includes "_____" for the blank; "options" is []; "correct_answer" is the missing word/phrase.
4. "matching": "options" is an array of 3-4 objects [{"left":"Term","right":"Definition"}]; "correct_answer" is the same array.
5. "word_arrangement": "question_text" instructs the student to arrange words into a correct sentence/concept; "correct_answer" is the exact target sentence string; "options" is the shuffled array of words.
6. "image_based": "question_text" describes a visual/diagram concept from the source; "options" is 4 strings; "correct_answer" is the exact matching option string.
7. "short_answer": "options" is []; "correct_answer" is a concise 1-5 word expected answer.
8. "correct_mistake": "question_text" presents a statement with a factual or grammatical error from the topic; "options" is []; "correct_answer" is the corrected word/phrase or corrected sentence.

LEARNING MATERIALS:
"""
${materialContext}
"""

Return STRICTLY valid JSON (no markdown fences) matching:
{
  "questions": [
    {
      "question_type": "${safeTypes[0]}",
      "question_text": "...",
      "options": [...],
      "correct_answer": "...",
      "explanation": "Brief explanation referencing the source material",
      "difficulty": "${difficulty}",
      "source_ref": "Source title"
    }
  ]
}`;

  const result = await aiRouter.executeTask({
    taskType: AI_TASK_TYPES.QUIZ_GENERATION,
    prompt,
    systemPrompt: 'You are a strict, source-grounded educational assessment generator. Always output valid JSON.',
    allowFallbackToGemini: true,
    allowFallbackToOpenAI: true,
    timeoutMs: 35000
  });

  const parsed = typeof result?.data === 'string' ? JSON.parse(result.data) : result?.data;
  const rawQuestions = Array.isArray(parsed?.questions)
    ? parsed.questions
    : Array.isArray(parsed)
    ? parsed
    : [];

  const normalized = rawQuestions
    .map((q, idx) => normalizeGeneratedQuestion(q, idx, difficulty, pointsPerQuestion))
    .filter(Boolean);

  if (normalized.length === 0) {
    throw new Error('AI could not generate valid questions from the selected materials. Please try again or add more source content.');
  }

  return normalized;
}

/**
 * Strips correct_answer and explanation before sending questions to student clients.
 */
export function sanitizeQuestionsForStudent(questions = []) {
  return questions.map(({ correct_answer: _ca, explanation: _exp, ...safe }) => safe);
}

function normalizeTextAnswer(val) {
  return String(val ?? '')
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:'"()]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Server-authoritative grading for all 8 question types + dynamic scoring & badges.
 */
export function gradeCourseGameSubmission({ game, questions = [], submittedAnswers = {}, timeTakenSec = 0 }) {
  const scoring = game?.scoring_config || {};
  const difficultyMultipliers = { easy: 1, medium: 1.25, hard: 1.5 };

  let rawScore = 0;
  let maxScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  const answerResults = [];
  const missedTopics = [];

  for (const q of questions) {
    const basePts = Number(q.points) || Number(scoring.points_per_question) || 10;
    const mult = scoring.difficulty_based_scoring
      ? difficultyMultipliers[q.difficulty || 'medium'] || 1
      : 1;
    const qMaxPts = Math.round(basePts * mult);
    maxScore += qMaxPts;

    const submitted = submittedAnswers[q.id];
    let isCorrect = false;

    if (q.question_type === 'matching') {
      const expectedPairs = Array.isArray(q.correct_answer) ? q.correct_answer : [];
      const userMap = submitted && typeof submitted === 'object' ? submitted : {};
      isCorrect =
        expectedPairs.length > 0 &&
        expectedPairs.every((p) => normalizeTextAnswer(userMap[p.left]) === normalizeTextAnswer(p.right));
    } else if (q.question_type === 'word_arrangement') {
      const userSentence = Array.isArray(submitted) ? submitted.join(' ') : String(submitted ?? '');
      isCorrect = normalizeTextAnswer(userSentence) === normalizeTextAnswer(q.correct_answer);
    } else {
      isCorrect = normalizeTextAnswer(submitted) === normalizeTextAnswer(q.correct_answer);
    }

    let ptsEarned = 0;
    if (isCorrect) {
      ptsEarned = qMaxPts;
      rawScore += ptsEarned;
      correctCount += 1;
    } else {
      incorrectCount += 1;
      if (scoring.negative_marking) {
        const penalty = Math.max(0, Number(scoring.negative_points) || 2);
        rawScore -= penalty;
      }
      missedTopics.push(q.source_ref || q.question_text.slice(0, 60));
    }

    answerResults.push({
      question_id: q.id,
      submitted_answer: submitted ?? null,
      is_correct: isCorrect,
      correct_answer: q.correct_answer,
      explanation: q.explanation || '',
      points_earned: ptsEarned,
      max_points: qMaxPts
    });
  }

  const totalQuestions = questions.length;
  const accuracyPct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 10000) / 100 : 0;

  // Bonus & time-based scoring
  let bonusEarned = 0;
  const configuredBonus = Math.max(0, Number(scoring.bonus_points) || 0);
  if (configuredBonus > 0 && accuracyPct >= 80) {
    bonusEarned += configuredBonus;
  }
  const timeLimit = Number(game?.settings?.time_limit_sec) || 0;
  if (scoring.time_based_scoring && timeLimit > 0 && timeTakenSec > 0 && timeTakenSec < timeLimit * 0.6 && accuracyPct >= 60) {
    bonusEarned += Math.max(5, Math.round(configuredBonus * 0.5) || 5);
  }

  const finalScore = Math.max(0, Math.round(rawScore + bonusEarned));
  const finalMaxScore = Math.max(1, maxScore + configuredBonus);

  const badges = [];
  if (accuracyPct === 100 && totalQuestions > 0) badges.push('Perfect Score');
  else if (accuracyPct >= 90) badges.push('Sharp Shooter');
  if (timeLimit > 0 && timeTakenSec > 0 && timeTakenSec <= timeLimit * 0.5 && accuracyPct >= 70) {
    badges.push('Speed Champion');
  }
  if (correctCount > 0 && badges.length === 0) badges.push('Completed');

  const recommendations = [];
  if (accuracyPct === 100) {
    recommendations.push('Outstanding mastery! Try a harder difficulty or challenge a classmate.');
  } else if (accuracyPct >= 75) {
    recommendations.push('Strong performance. Review the explanations for the missed questions to achieve 100%.');
  } else {
    recommendations.push('Revisit the selected course lessons or library materials, then try another attempt.');
  }
  if (missedTopics.length > 0) {
    recommendations.push(`Focus areas to review: ${missedTopics.slice(0, 3).join('; ')}`);
  }

  return {
    answers: answerResults,
    score: finalScore,
    max_score: finalMaxScore,
    correct_count: correctCount,
    incorrect_count: incorrectCount,
    accuracy_pct: accuracyPct,
    badges_earned: badges,
    recommendations
  };
}
