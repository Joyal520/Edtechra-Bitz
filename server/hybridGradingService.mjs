/**
 * Task Categories
 */
export const TASK_CATEGORIES = [
  'assignment',
  'lesson',
  'practice',
  'activity',
  'resource'
];

/**
 * Deterministic Question Types (Computer-Graded)
 */
export const DETERMINISTIC_QUESTION_TYPES = [
  'mcq',
  'multiple_choice',
  'true_false',
  'fill_blank',
  'multiple_select',
  'matching',
  'ordering',
  'numeric'
];

/**
 * Open-Ended Question Types (AI-Graded)
 */
export const OPEN_ENDED_QUESTION_TYPES = [
  'short_answer',
  'paragraph',
  'essay',
  'creative_writing',
  'open_ended'
];

/**
 * Normalizes text for fill-in-the-blank & string matching
 */
export function normalizeAnswerText(text) {
  if (text == null) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '') // remove punctuation
    .replace(/\s+/g, ' '); // collapse multiple spaces
}

/**
 * Normalizes boolean values for True/False questions
 */
export function normalizeBoolean(val) {
  if (val == null) return null;
  const s = String(val).trim().toLowerCase();
  if (s === 'true' || s === 't' || s === 'yes' || s === 'y' || s === '1') return true;
  if (s === 'false' || s === 'f' || s === 'no' || s === 'n' || s === '0') return false;
  return null;
}

/**
 * Deterministic / Computer Answer Evaluator
 * Evaluates MCQ, True/False, Fill Blank, Multi-Select, Matching, Ordering, Numeric
 */
export function evaluateDeterministicQuestion(question, studentAnswer) {
  const marks = Number(question.marks) || 1;
  const qType = (question.type || question.question_type || 'mcq').toLowerCase();

  // 1. Multiple Choice / MCQ
  if (qType === 'mcq' || qType === 'multiple_choice') {
    const studentStr = String(studentAnswer ?? '').trim().toLowerCase();
    const correctStr = String(question.correct_answer ?? '').trim().toLowerCase();

    // Check direct equality or index match
    let isCorrect = studentStr === correctStr;

    // Check if options array contains matching value or index
    if (!isCorrect && Array.isArray(question.options)) {
      const studentIdx = question.options.findIndex((opt) => String(opt).trim().toLowerCase() === studentStr);
      const correctIdx = question.options.findIndex((opt) => String(opt).trim().toLowerCase() === correctStr);
      if (studentIdx !== -1 && correctIdx !== -1 && studentIdx === correctIdx) {
        isCorrect = true;
      }
    }

    return {
      question_id: question.id,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      score: isCorrect ? marks : 0,
      max_score: marks,
      grading_method: 'deterministic',
      feedback: isCorrect ? 'Correct!' : (question.explanation || 'Incorrect answer.')
    };
  }

  // 2. True / False
  if (qType === 'true_false') {
    const studentBool = normalizeBoolean(studentAnswer);
    const correctBool = normalizeBoolean(question.correct_answer);
    const isCorrect = studentBool !== null && studentBool === correctBool;

    return {
      question_id: question.id,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      score: isCorrect ? marks : 0,
      max_score: marks,
      grading_method: 'deterministic',
      feedback: isCorrect ? 'Correct!' : (question.explanation || 'Incorrect answer.')
    };
  }

  // 3. Fill in the Blank
  if (qType === 'fill_blank') {
    const normStudent = normalizeAnswerText(studentAnswer);
    const normCorrect = normalizeAnswerText(question.correct_answer);

    let isCorrect = normStudent === normCorrect && normStudent !== '';

    // Check accepted_answers list if configured
    if (!isCorrect && Array.isArray(question.accepted_answers)) {
      isCorrect = question.accepted_answers.some(
        (ans) => normalizeAnswerText(ans) === normStudent
      );
    }

    return {
      question_id: question.id,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      score: isCorrect ? marks : 0,
      max_score: marks,
      grading_method: 'deterministic',
      feedback: isCorrect ? 'Correct!' : (question.explanation || `Incorrect. Expected: ${question.correct_answer}`)
    };
  }

  // 4. Multiple Select
  if (qType === 'multiple_select') {
    const studentArr = Array.isArray(studentAnswer)
      ? studentAnswer.map((s) => String(s).trim().toLowerCase()).sort()
      : [String(studentAnswer ?? '').trim().toLowerCase()];

    const correctArr = Array.isArray(question.correct_answer)
      ? question.correct_answer.map((c) => String(c).trim().toLowerCase()).sort()
      : [String(question.correct_answer ?? '').trim().toLowerCase()];

    const isCorrect = JSON.stringify(studentArr) === JSON.stringify(correctArr);

    return {
      question_id: question.id,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      score: isCorrect ? marks : 0,
      max_score: marks,
      grading_method: 'deterministic',
      feedback: isCorrect ? 'Correct selection!' : (question.explanation || 'Incorrect choices selected.')
    };
  }

  // 5. Matching
  if (qType === 'matching') {
    let isCorrect = false;
    if (studentAnswer && typeof studentAnswer === 'object' && question.correct_answer && typeof question.correct_answer === 'object') {
      const keys = Object.keys(question.correct_answer);
      isCorrect = keys.every(
        (k) => String(studentAnswer[k]).trim().toLowerCase() === String(question.correct_answer[k]).trim().toLowerCase()
      );
    }

    return {
      question_id: question.id,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      score: isCorrect ? marks : 0,
      max_score: marks,
      grading_method: 'deterministic',
      feedback: isCorrect ? 'Correct matches!' : (question.explanation || 'One or more pairs are matched incorrectly.')
    };
  }

  // 6. Ordering
  if (qType === 'ordering') {
    const studentList = Array.isArray(studentAnswer) ? studentAnswer.map(String) : [];
    const correctList = Array.isArray(question.correct_answer) ? question.correct_answer.map(String) : [];
    const isCorrect = JSON.stringify(studentList) === JSON.stringify(correctList);

    return {
      question_id: question.id,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      score: isCorrect ? marks : 0,
      max_score: marks,
      grading_method: 'deterministic',
      feedback: isCorrect ? 'Correct sequence!' : (question.explanation || 'Incorrect order.')
    };
  }

  // 7. Numeric
  if (qType === 'numeric') {
    const numStudent = parseFloat(studentAnswer);
    const numCorrect = parseFloat(question.correct_answer);
    const tolerance = parseFloat(question.tolerance) || 0;

    const isCorrect = !isNaN(numStudent) && !isNaN(numCorrect) && Math.abs(numStudent - numCorrect) <= tolerance;

    return {
      question_id: question.id,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      score: isCorrect ? marks : 0,
      max_score: marks,
      grading_method: 'deterministic',
      feedback: isCorrect ? 'Correct!' : (question.explanation || `Incorrect value. Expected: ${question.correct_answer}`)
    };
  }

  // Default fallback for unrecognized deterministic type
  return {
    question_id: question.id,
    student_answer: studentAnswer,
    is_correct: false,
    score: 0,
    max_score: marks,
    grading_method: 'deterministic',
    feedback: 'Evaluation not supported for this question type.'
  };
}

/**
 * AI Semantic Answer Evaluator with Strict 50-Word Limit
 */
export async function evaluateAiQuestion(question, studentAnswer, serverOpenAI) {
  const marks = Number(question.marks) || 5;
  const promptText = question.prompt || question.question || question.title || '';
  const rubric = question.evaluation_rubric || question.rubric || question.expected_points || 'General semantic correctness and relevance';
  const studentText = String(studentAnswer ?? '').trim();

  // If student left it empty
  if (!studentText) {
    return {
      question_id: question.id,
      student_answer: '',
      is_correct: false,
      score: 0,
      max_score: marks,
      grading_method: 'ai',
      feedback: 'No response provided.'
    };
  }

  // AI Prompt Configuration
  const systemInstruction = `You are the EdTechra Classroom Assessment Evaluator.
Evaluate the student's open-ended answer against the question prompt and fixed evaluation requirements.

RULES:
1. Return ONLY a valid JSON object matching this exact schema:
{
  "score": number (between 0 and ${marks}),
  "max_score": ${marks},
  "correct": boolean (true if score >= ${Math.ceil(marks * 0.6)}),
  "feedback": string (MUST be <= 50 words, encouraging, clear, constructive)
}
2. HARD CONSTRAINT: The feedback MUST be 50 words or fewer.
3. Be fair, objective, and consistent with the provided evaluation rubric.
4. Do NOT output markdown, markdown code blocks, or thinking process.`;

  const userContent = `QUESTION:
${promptText}

MAX MARKS: ${marks}

EVALUATION REQUIREMENTS / RUBRIC:
${rubric}

STUDENT ANSWER:
${studentText}`;

  // Controlled Retry Logic (Up to 2 attempts)
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      let rawJsonText = '';

      if (serverOpenAI) {
        const response = await serverOpenAI.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userContent }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2
        });
      } else if (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) {
        const gemKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${gemKey}`;
        const resp = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `${systemInstruction}\n\n${userContent}` }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          })
        });
        const gData = await resp.json();
        rawJsonText = gData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      } else {
        throw new Error('No AI provider configured');
      }

      // Clean JSON delimiters if needed
      const cleaned = rawJsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const rawScore = Number(parsed.score);
      const boundedScore = isNaN(rawScore) ? 0 : Math.max(0, Math.min(marks, rawScore));
      const isCorrect = typeof parsed.correct === 'boolean' ? parsed.correct : boundedScore >= Math.ceil(marks * 0.6);

      // Enforce 50-word limit on feedback
      let feedback = (parsed.feedback || 'Answer evaluated.').trim();
      const words = feedback.split(/\s+/).filter(Boolean);
      if (words.length > 50) {
        feedback = words.slice(0, 50).join(' ');
      }

      return {
        question_id: question.id,
        student_answer: studentText,
        is_correct: isCorrect,
        score: boundedScore,
        max_score: marks,
        ai_score: boundedScore,
        grading_method: 'ai',
        feedback
      };
    } catch (err) {
      console.warn(`[HybridGrading] AI evaluation attempt ${attempt} failed:`, err.message);
      if (attempt === 2) {
        // Fallback on total failure -> Flag for teacher review (do NOT silently give 0 or error out)
        return {
          question_id: question.id,
          student_answer: studentText,
          is_correct: false,
          score: 0,
          max_score: marks,
          grading_method: 'ai',
          needs_teacher_review: true,
          feedback: 'Submitted. Evaluation pending teacher review.'
        };
      }
    }
  }
}

const CANDIDATE_GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-pro-latest'
];

/**
 * AI Writing & Text Response Evaluator
 * Evaluates open-ended student writing, essays, summaries, and responses.
 * Strictly and actively inspects:
 * 1. Subject-verb agreement
 * 2. Verb tense & aspect
 * 3. Articles (a, an, the)
 * 4. Prepositions
 * 5. Pronouns
 * 6. Singular/plural
 * 7. Word order
 * 8. Auxiliary verbs
 * 9. Sentence completeness
 * 10. Sentence structure
 * 11. Punctuation
 * 12. Capitalization
 * 13. Spelling
 * 14. Vocabulary usage
 */
export async function evaluateWritingTaskResponse(task, textResponse, serverOpenAI = null, geminiApiKey = null) {
  if (!textResponse || !String(textResponse).trim()) {
    return null;
  }

  const studentText = String(textResponse).trim();
  const maxScore = Number(task.points) || 10;
  const promptText = task.instructions || task.subtitle || task.title || 'Writing Task';
  const rubric = task.settings?.evaluation_rubric || 'Grammar, vocabulary, spelling, sentence mechanics, structure, and task relevance.';

  const systemInstruction = `You are the EdTechra Master Educational Evaluator and Writing Coach.
You are evaluating a student's English writing submission.

CRITICAL EVALUATION INSTRUCTIONS:
1. Carefully inspect the actual submitted text sentence-by-sentence.
2. Actively check these 14 core writing dimensions:
   (1) Subject–verb agreement (e.g. "He work" -> "He works", "They is" -> "They are")
   (2) Verb tense & aspect (e.g. "Yesterday I go" -> "Yesterday I went", inconsistent past/present tense)
   (3) Articles (a, an, the) and determiners
   (4) Prepositions (at, in, on, with, for, to)
   (5) Pronouns (case, subject/object, agreement)
   (6) Singular / plural nouns and modifier agreement
   (7) Word order and syntax
   (8) Auxiliary verbs (is/are/has/have/do/does)
   (9) Sentence completeness (avoiding fragments, run-ons, comma splices)
   (10) Sentence structure, variety, and clause connectivity
   (11) Punctuation (periods, commas, apostrophes)
   (12) Capitalization (sentence start, "I", proper nouns)
   (13) Spelling and morphology
   (14) Vocabulary usage, word choice, and phrasing
3. DO NOT give generic feedback. Every reported error MUST be supported by an exact excerpt from the student's work.
4. DO NOT claim that grammar is correct without examining the actual sentences.
5. DO NOT say "No significant grammar mistakes" when actual grammatical, agreement, or punctuation errors exist.
6. DO NOT invent errors that do not exist.
7. If an error exists, quote the original student wording, provide the corrected wording, and explain the exact pedagogical rule ("Why").
8. Produce a COMPLETE corrected version of the student's entire work with all grammar, spelling, punctuation, capitalization, and phrasing issues corrected while preserving the student's original voice, meaning, and ideas.
9. Provide 1 to 3 specific strengths ("what you did well") and exactly ONE actionable "next_step" recommendation for learning.
10. Return ONLY a single valid JSON object matching this exact schema:

{
  "score": number (between 0 and ${maxScore}),
  "max_score": ${maxScore},
  "percentage": number (0 to 100),
  "evaluation_status": "completed",
  "category": "Grammar",
  "topic": string (e.g. "Subject–Verb Agreement", "Simple Present", "Past Tense", "Prepositions", "Paragraph Writing"),
  "skills": string[] (1 to 4 specific skills, e.g. ["Subject–Verb Agreement", "Sentence Structure"]),
  "feedback": string (pedagogical feedback <= 60 words explaining key strengths and the primary rule to improve),
  "strengths": string[] (1 to 3 genuine strengths in the student's work),
  "next_step": string (one short, specific learning recommendation),
  "grammar_issues": [
    {
      "original": string (exact snippet from student's text containing the grammar/agreement/tense/punctuation error),
      "correction": string (corrected snippet),
      "explanation": string (clear pedagogical rule explaining why the correction is needed)
    }
  ],
  "spelling_issues": [
    {
      "original": string (misspelled word),
      "correction": string (correct spelling),
      "explanation": string (brief spelling note)
    }
  ],
  "sentence_structure_issues": [
    {
      "original": string (awkward or incomplete sentence from student),
      "correction": string (improved sentence),
      "explanation": string (why this improves clarity and flow)
    }
  ],
  "vocabulary_issues": [
    {
      "original": string (inaccurate or repetitive word choice),
      "correction": string (more precise or natural word choice),
      "explanation": string (why this word choice is better)
    }
  ],
  "corrected_work": string (COMPLETE student text rewritten with all grammar, spelling, and punctuation errors fixed while maintaining the student's original tone and voice),
  "breakdown": [
    { "criterion": "Grammar & Mechanics", "score": number, "max": 10 },
    { "criterion": "Vocabulary & Word Choice", "score": number, "max": 10 },
    { "criterion": "Sentence Structure", "score": number, "max": 10 },
    { "criterion": "Task Completion", "score": number, "max": 10 }
  ]
}`;

  const userContent = `TASK TITLE:
${task.title || 'Writing Task'}

INSTRUCTIONS & PROMPT:
${promptText}

RUBRIC / REQUIREMENTS:
${rubric}

MAX MARKS:
${maxScore}

STUDENT'S SUBMITTED TEXT:
${studentText}`;

  let parsed = null;

  // 1. Try OpenAI if configured
  if (serverOpenAI) {
    try {
      const response = await serverOpenAI.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userContent }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      });
      const raw = response.choices[0]?.message?.content || '{}';
      const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.warn('[HybridGrading] OpenAI writing evaluation error:', err.message);
    }
  }

  // 2. Fallback to Gemini if OpenAI was not available or failed
  const gemKey = geminiApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!parsed && gemKey) {
    for (const modelName of CANDIDATE_GEMINI_MODELS) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${gemKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 9000);

        const resp = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `${systemInstruction}\n\n${userContent}` }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1
            }
          })
        });
        clearTimeout(timeout);

        if (resp.ok) {
          const gData = await resp.json();
          const rawText = gData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
            parsed = JSON.parse(cleaned);
            if (parsed) break;
          }
        }
      } catch (err) {
        console.warn(`[HybridGrading] Gemini model ${modelName} error:`, err.message);
      }
    }
  }

  // Helper to validate and clean error items
  const cleanIssueList = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const orig = String(item.original || item.text || item.student_error || '').trim();
        const corr = String(item.correction || item.suggestion || item.correct_form || '').trim();
        const expl = String(item.explanation || item.rule || item.reason || '').trim();
        if (!orig && !corr) return null;
        return {
          original: orig,
          correction: corr,
          explanation: expl || 'Correction for accuracy and flow'
        };
      })
      .filter(Boolean);
  };

  // 3. Fallback normalization if AI produced a response
  if (parsed && typeof parsed === 'object') {
    const rawScore = Number(parsed.score);
    const grammarIssues = cleanIssueList(parsed.grammar_issues || parsed.grammar_errors);
    const spellingIssues = cleanIssueList(parsed.spelling_issues || parsed.spelling_errors);
    const sentenceIssues = cleanIssueList(parsed.sentence_structure_issues);
    const vocabularyIssues = cleanIssueList(parsed.vocabulary_issues);
    const totalIssuesCount = grammarIssues.length + spellingIssues.length + sentenceIssues.length + vocabularyIssues.length;

    // Deduce fair score if needed
    let score;
    if (!isNaN(rawScore) && rawScore >= 0 && rawScore <= maxScore) {
      score = rawScore;
    } else {
      const deduction = Math.min(maxScore * 0.5, totalIssuesCount * (maxScore * 0.1));
      score = Math.max(0, Math.round(maxScore - deduction));
    }

    const percentage = parsed.percentage != null && !isNaN(Number(parsed.percentage))
      ? Math.max(0, Math.min(100, Math.round(Number(parsed.percentage))))
      : Math.round((score / maxScore) * 100);

    const legacyMistakes = [
      ...grammarIssues,
      ...spellingIssues,
      ...sentenceIssues,
      ...vocabularyIssues
    ];

    const legacyGrammarErrors = grammarIssues.map((g) => ({
      text: g.original,
      suggestion: g.correction,
      rule: g.explanation
    }));

    const legacySpellingErrors = spellingIssues.map((s) => ({
      text: s.original,
      suggestion: s.correction
    }));

    const strengths = Array.isArray(parsed.strengths) && parsed.strengths.length > 0
      ? parsed.strengths.map(String).filter(Boolean)
      : ['Clear expression of ideas', 'Good attempt at the writing topic'];

    const nextStep = parsed.next_step
      ? String(parsed.next_step).trim()
      : (grammarIssues.length > 0
          ? `Review and practice ${grammarIssues[0].explanation || 'grammar rules'}.`
          : 'Continue reading and practicing expressive vocabulary in daily writing.');

    const feedback = parsed.feedback
      ? String(parsed.feedback).trim()
      : (totalIssuesCount === 0
          ? 'Excellent writing with clear sentence structure and strong grammatical precision.'
          : 'Good effort on your response. Review the highlighted corrections to improve your grammar and precision.');

    return {
      score,
      max_score: maxScore,
      percentage,
      evaluation_status: 'completed',
      category: parsed.category || 'Grammar',
      topic: parsed.topic || (grammarIssues[0]?.explanation ? 'Grammar & Mechanics' : 'Subject–Verb Agreement'),
      concept: parsed.topic || 'Subject–Verb Agreement',
      skills: Array.isArray(parsed.skills) && parsed.skills.length > 0 ? parsed.skills : ['Grammar & Sentence Mechanics'],
      feedback,
      strengths,
      next_step: nextStep,
      grammar_issues: grammarIssues,
      spelling_issues: spellingIssues,
      sentence_structure_issues: sentenceIssues,
      vocabulary_issues: vocabularyIssues,
      mistakes: legacyMistakes,
      corrections: legacyMistakes.map((m) => `"${m.original}" → "${m.correction}"`),
      corrected_work: String(parsed.corrected_work || studentText).trim(),
      grammar_errors: legacyGrammarErrors,
      spelling_errors: legacySpellingErrors,
      breakdown: Array.isArray(parsed.breakdown) && parsed.breakdown.length > 0
        ? parsed.breakdown
        : [
            { criterion: 'Grammar & Mechanics', score: Math.max(1, Math.round((score / maxScore) * 10)), max: 10 },
            { criterion: 'Vocabulary & Word Choice', score: 8, max: 10 },
            { criterion: 'Sentence Structure', score: Math.max(1, Math.round((score / maxScore) * 10)), max: 10 },
            { criterion: 'Task Completion', score: 10, max: 10 }
          ]
    };
  }

  // 4. If AI provider failed or produced unparseable output
  return {
    evaluation_status: 'evaluation_failed',
    error: 'AI evaluation could not be completed.'
  };
}

/**
 * Main Hybrid Auto-Grading Pipeline for an entire task submission
 */
export async function gradeTaskSubmission(
  task,
  studentAnswers = [],
  serverOpenAI = null,
  textResponse = '',
  geminiApiKey = null
) {
  const questions = Array.isArray(task.questions) ? task.questions : [];
  const results = [];
  let totalScore = 0;
  let maxPossible = 0;
  let hasAiGraded = false;

  // Build answer map from student submissions
  const answerMap = new Map();
  studentAnswers.forEach((sa) => {
    if (sa && sa.question_id) {
      answerMap.set(String(sa.question_id), sa.student_answer);
    }
  });

  for (const q of questions) {
    const qType = (q.type || q.question_type || 'mcq').toLowerCase();
    const isDeterministic = DETERMINISTIC_QUESTION_TYPES.includes(qType) || q.grading_mode === 'deterministic';
    const studentAnswer = answerMap.get(String(q.id));

    let res;
    if (isDeterministic) {
      res = evaluateDeterministicQuestion(q, studentAnswer);
    } else {
      hasAiGraded = true;
      res = await evaluateAiQuestion(q, studentAnswer, serverOpenAI);
    }

    results.push(res);
    totalScore += res.score;
    maxPossible += res.max_score;
  }

  // Handle typed text response evaluation
  let writingEvaluation = null;
  if (textResponse && String(textResponse).trim()) {
    writingEvaluation = await evaluateWritingTaskResponse(task, textResponse, serverOpenAI, geminiApiKey);
    if (writingEvaluation && writingEvaluation.evaluation_status === 'completed') {
      hasAiGraded = true;
      results.push({
        question_id: 'writing_response',
        student_answer: textResponse,
        is_correct: writingEvaluation.percentage >= 60,
        score: writingEvaluation.score,
        max_score: writingEvaluation.max_score,
        grading_method: 'ai',
        feedback: writingEvaluation.feedback,
        writing_evaluation: writingEvaluation
      });
      if (questions.length === 0) {
        totalScore = writingEvaluation.score;
        maxPossible = writingEvaluation.max_score;
      } else {
        totalScore += writingEvaluation.score;
        maxPossible += writingEvaluation.max_score;
      }
    } else if (writingEvaluation && writingEvaluation.evaluation_status === 'evaluation_failed') {
      return {
        evaluation_status: 'evaluation_failed',
        error: writingEvaluation.error || 'AI evaluation could not be completed. Please try submitting again.',
        results
      };
    }
  }

  // Handle tasks without structured questions and without typed response (e.g. empty submission)
  if (questions.length === 0 && !writingEvaluation) {
    return {
      question_answers: [],
      final_score: null,
      ai_score: null,
      percentage: null,
      is_ai_graded: false,
      writing_evaluation: null
    };
  }

  const percentage = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;

  return {
    question_answers: results,
    final_score: totalScore,
    ai_score: hasAiGraded ? totalScore : null,
    percentage,
    is_ai_graded: hasAiGraded,
    writing_evaluation: writingEvaluation
  };
}
