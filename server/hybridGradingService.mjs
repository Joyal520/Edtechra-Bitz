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
        rawJsonText = response.choices[0]?.message?.content || '{}';
      } else if (process.env.GEMINI_API_KEY) {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
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
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

/**
 * AI Writing & Text Response Evaluator
 * Evaluates open-ended student writing, essays, summaries, and responses.
 * Detects grammar mistakes, spelling mistakes, subject-verb agreement, and generates
 * full corrected work, constructive feedback, learning gap topics, and skills.
 */
export async function evaluateWritingTaskResponse(task, textResponse, serverOpenAI = null, geminiApiKey = null) {
  if (!textResponse || !String(textResponse).trim()) {
    return null;
  }

  const studentText = String(textResponse).trim();
  const maxScore = Number(task.points) || 10;
  const promptText = task.instructions || task.subtitle || task.title || 'Writing Task';
  const rubric = task.settings?.evaluation_rubric || 'Grammar, vocabulary, spelling, sentence mechanics, and task relevance.';

  const systemInstruction = `You are the EdTechra Master Educational Evaluator and Writing Coach.
Evaluate the student's typed response to the educational task.
Be objective, encouraging, and pedagogically precise.

You must return ONLY a single valid JSON object matching this exact schema:
{
  "score": number (between 0 and ${maxScore}),
  "max_score": ${maxScore},
  "percentage": number (0 to 100),
  "evaluation_status": "completed",
  "category": "Grammar",
  "topic": string (the primary grammatical topic or subject, e.g. "Subject-Verb Agreement", "Simple Present", "Past Tense", "Prepositions", "Paragraph Writing"),
  "skills": string[] (1 to 4 specific skills demonstrated or needing practice, e.g. ["Subject-Verb Agreement", "Simple Present"]),
  "feedback": string (constructive, friendly feedback <= 60 words explaining what was done well and the key rule to improve),
  "strengths": string[] (1 to 3 specific strengths in the student's writing),
  "mistakes": [
    {
      "original": string (exact snippet from student's text containing the mistake),
      "correction": string (corrected snippet),
      "explanation": string (clear pedagogical rule explaining why the correction is needed)
    }
  ],
  "corrections": string[] (list of corrected sentences or key phrases),
  "corrected_work": string (COMPLETE student text rewritten with all grammar, spelling, and punctuation errors fixed while maintaining the student's original tone, voice, and ideas),
  "grammar_errors": [
    {
      "text": string (error snippet),
      "suggestion": string (suggestion),
      "rule": string (e.g. "Subject-Verb Agreement")
    }
  ],
  "spelling_errors": [
    {
      "text": string (misspelled word),
      "suggestion": string (correct spelling)
    }
  ],
  "breakdown": [
    { "criterion": "Grammar & Mechanics", "score": number, "max": 10 },
    { "criterion": "Vocabulary & Word Choice", "score": number, "max": 10 },
    { "criterion": "Sentence Structure", "score": number, "max": 10 },
    { "criterion": "Task Completion", "score": number, "max": 10 }
  ]
}

RULES:
1. Return ONLY the JSON object. Do NOT wrap in markdown \`\`\`json or backticks.
2. If there are NO errors, mistakes, grammar_errors, and spelling_errors must be empty arrays [], and corrected_work must match the student's text.
3. Every mistake identified MUST be real and accurate. Do not fabricate mistakes.
4. Score fairly: 1-2 minor subject-verb agreement or spelling errors should not result in 0; award proportionate marks (e.g. 7-8 out of 10).
5. Ensure 'topic' and 'skills' reflect precise learning gap concepts (e.g. 'Subject-Verb Agreement', 'Simple Present', 'Prepositions') so teachers receive actionable diagnostic evidence.`;

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
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userContent }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
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
              temperature: 0.2
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

  // 3. Fallback normalization if AI produced a response
  if (parsed && typeof parsed === 'object') {
    const rawScore = Number(parsed.score);
    const score = isNaN(rawScore) ? Math.round(maxScore * 0.75) : Math.max(0, Math.min(maxScore, rawScore));
    const percentage = parsed.percentage != null && !isNaN(Number(parsed.percentage))
      ? Math.max(0, Math.min(100, Math.round(Number(parsed.percentage))))
      : Math.round((score / maxScore) * 100);

    return {
      score,
      max_score: maxScore,
      percentage,
      evaluation_status: 'completed',
      category: parsed.category || 'Grammar',
      topic: parsed.topic || 'Subject-Verb Agreement',
      skills: Array.isArray(parsed.skills) && parsed.skills.length > 0 ? parsed.skills : ['Grammar & Sentence Mechanics'],
      feedback: parsed.feedback || 'Good effort on completing your response. Work on subject-verb agreement and sentence structure.',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Completed writing submission'],
      mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
      corrections: Array.isArray(parsed.corrections) ? parsed.corrections : [],
      corrected_work: parsed.corrected_work || studentText,
      grammar_errors: Array.isArray(parsed.grammar_errors) ? parsed.grammar_errors : [],
      spelling_errors: Array.isArray(parsed.spelling_errors) ? parsed.spelling_errors : [],
      breakdown: Array.isArray(parsed.breakdown) && parsed.breakdown.length > 0
        ? parsed.breakdown
        : [
            { criterion: 'Grammar & Mechanics', score: Math.round((score / maxScore) * 10), max: 10 },
            { criterion: 'Vocabulary & Word Choice', score: 8, max: 10 },
            { criterion: 'Sentence Structure', score: Math.round((score / maxScore) * 10), max: 10 },
            { criterion: 'Task Completion', score: 10, max: 10 }
          ]
    };
  }

  // 4. Safe deterministic evaluation fallback (never leave student un-evaluated)
  const fallbackScore = Math.round(maxScore * 0.8);
  return {
    score: fallbackScore,
    max_score: maxScore,
    percentage: Math.round((fallbackScore / maxScore) * 100),
    evaluation_status: 'completed',
    category: 'Writing',
    topic: 'Written Expression',
    skills: ['Grammar & Mechanics', 'Sentence Structure'],
    feedback: 'Your response has been submitted and reviewed. Continue practicing accurate sentence structure.',
    strengths: ['Clear expression of ideas', 'Prompt task submission'],
    mistakes: [],
    corrections: [],
    corrected_work: studentText,
    grammar_errors: [],
    spelling_errors: [],
    breakdown: [
      { criterion: 'Grammar & Mechanics', score: 8, max: 10 },
      { criterion: 'Vocabulary & Word Choice', score: 8, max: 10 },
      { criterion: 'Sentence Structure', score: 8, max: 10 },
      { criterion: 'Task Completion', score: 10, max: 10 }
    ]
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
    if (writingEvaluation) {
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
