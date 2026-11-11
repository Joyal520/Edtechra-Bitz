// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: COURSE STUDIO SERVER SERVICE
// AI Lesson Builder, Question Generator, Concept Mastery Engine,
// Course Duplication, and Cross-Classroom Analytics Aggregator.
// ============================================================================

import crypto from 'crypto';

const CANDIDATE_GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-pro-latest'
];

// ----------------------------------------------------------------------------
// 1. AI LESSON STRUCTURE GENERATOR (From Raw Pasted Material)
// ----------------------------------------------------------------------------

export async function buildLessonFromMaterial(options = {}) {
  const rawMaterial = options.rawMaterial || options.raw_material || '';
  const courseTitle = options.courseTitle || options.course_title || 'Course Lesson';
  const unitTitle = options.unitTitle || options.unit_title || 'Unit 1';
  const subject = options.subject || 'English';
  const gradeLevel = options.gradeLevel || options.grade_level || 'Grade 8';
  const geminiApiKey = options.geminiApiKey || process.env.GEMINI_API_KEY;
  const openaiApiKey = options.openaiApiKey || process.env.OPENAI_API_KEY;
  const serverOpenAI = options.serverOpenAI || null;

  if (!rawMaterial || !rawMaterial.trim()) {
    throw new Error('Please provide teaching material to build the lesson.');
  }

  const prompt = `You are a curriculum expert creating an interactive digital lesson for ${gradeLevel} students in ${subject}.
Analyze the following teacher's raw teaching material and transform it into a structured, highly engaging digital lesson.

TEACHER'S RAW MATERIAL:
"""
${rawMaterial.trim()}
"""

INSTRUCTIONS:
1. Divide the material into distinct educational content blocks:
   - "Introduction": Engaging hook and foundational overview.
   - "Core Concepts": Clear breakdown with bullet points, rules, or principles.
   - "Practical Examples": Real-world examples illustrating the rules.
   - "Key Reminders": Common mistakes to avoid or memory tips.
2. Formulate 2-3 interactive comprehension check questions grounded specifically in the material with educational concept metadata (skill, concept, difficulty).
3. Return STRICTLY valid JSON without Markdown backticks or extra commentary matching this schema:

{
  "title": "Lesson title based on content",
  "summary": "Brief 1-sentence learning objective",
  "blocks": [
    {
      "block_type": "text",
      "content": {
        "title": "Introduction",
        "text": "Introductory content..."
      }
    },
    {
      "block_type": "text",
      "content": {
        "title": "Core Rules & Principles",
        "text": "- Rule 1...\n- Rule 2..."
      }
    },
    {
      "block_type": "text",
      "content": {
        "title": "Examples in Action",
        "text": "Example 1...\nExample 2..."
      }
    },
    {
      "block_type": "text",
      "content": {
        "title": "Remember",
        "text": "Important takeaway to remember..."
      }
    }
  ],
  "suggested_questions": [
    {
      "question_text": "Question text here?",
      "question_type": "multiple_choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option B",
      "explanation": "Why this answer is correct",
      "skill": "${subject}",
      "concept": "Specific concept tested",
      "difficulty": "easy"
    }
  ]
}`;

  // 1. Try Gemini
  const gemKey = geminiApiKey || process.env.GEMINI_API_KEY;
  if (gemKey) {
    for (const modelName of CANDIDATE_GEMINI_MODELS) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${gemKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 2500 }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const parsed = parseCleanJson(rawText);
          if (parsed && Array.isArray(parsed.blocks)) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn(`[CourseStudioAI] Gemini ${modelName} error:`, err.message);
      }
    }
  }

  // 2. Try OpenAI Fallback
  if (serverOpenAI || openaiApiKey) {
    try {
      const client = serverOpenAI || new (await import('openai')).default({ apiKey: openaiApiKey });
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an educational AI curriculum designer that outputs strictly valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });
      const parsed = JSON.parse(completion.choices[0].message.content);
      if (parsed && Array.isArray(parsed.blocks)) {
        return parsed;
      }
    } catch (openAiErr) {
      console.warn('[CourseStudioAI] OpenAI fallback error:', openAiErr.message);
    }
  }

  // 3. Deterministic Local Rule-based Lesson Chunker (Zero-token fallback)
  return buildLocalRuleBasedLesson(rawMaterial, courseTitle, subject);
}

// ----------------------------------------------------------------------------
// 2. AI QUESTION GENERATOR (With Educational Concept Metadata)
// ----------------------------------------------------------------------------

export async function generateCourseQuestionsWithAI(options = {}) {
  const contentText = options.contentText || options.content_text || '';
  const questionTypes = options.questionTypes || options.question_types || ['multiple_choice'];
  const questionCount = Number(options.questionCount || options.question_count || 5);
  const difficulty = options.difficulty || 'medium';
  const targetGrade = options.targetGrade || options.target_grade || 'Grade 8';
  const subject = options.subject || 'English';
  const instructions = options.instructions || '';
  const geminiApiKey = options.geminiApiKey || process.env.GEMINI_API_KEY;
  const openaiApiKey = options.openaiApiKey || process.env.OPENAI_API_KEY;
  const serverOpenAI = options.serverOpenAI || null;

  const prompt = `You are a senior assessment creator. Generate ${questionCount} educational questions based strictly on the following lesson content.

CONTENT:
"""
${contentText.trim()}
"""

CRITERIA:
- Target Grade: ${targetGrade}
- Subject: ${subject}
- Target Difficulty: ${difficulty}
- Allowed Question Types: ${questionTypes.join(', ')}
- Special Teacher Instructions: ${instructions || 'Ensure clear wording and accurate answer keys.'}
- Multiple Choice Randomisation: Randomise correct answer positions evenly across options A, B, C, and D. Do not default to Option A.
- True/False Balance: Provide an equal, balanced mixture of True and False statements across lessons. Do not make all statements True.

CRITICAL: Every question MUST include fine-grained educational metadata:
- "skill": Broad subject skill (e.g. Grammar, Vocabulary, Reading, Comprehension, Problem Solving)
- "concept": Fine-grained concept (e.g. Subject-verb agreement, Third-person singular, Past tense irregulars)
- "points": integer points (e.g. 10)

Return STRICTLY valid JSON with no Markdown wrappers matching this schema:
{
  "questions": [
    {
      "question_text": "...",
      "question_type": "multiple_choice",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "B",
      "explanation": "...",
      "skill": "Grammar",
      "concept": "Subject-verb agreement",
      "difficulty": "${difficulty}",
      "points": 10
    }
  ]
}`;

  // 1. Try Gemini
  const gemKey = geminiApiKey || process.env.GEMINI_API_KEY;
  if (gemKey) {
    for (const modelName of CANDIDATE_GEMINI_MODELS) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${gemKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 2500 }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const parsed = parseCleanJson(rawText);
          if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            return {
              questions: ensureQuestionIntegrity(parsed.questions, difficulty)
            };
          }
        }
      } catch (err) {
        console.warn(`[CourseStudioAI] Gemini questions error (${modelName}):`, err.message);
      }
    }
  }

  // 2. Try OpenAI Fallback
  if (serverOpenAI || openaiApiKey) {
    try {
      const client = serverOpenAI || new (await import('openai')).default({ apiKey: openaiApiKey });
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an educational assessment expert that outputs strictly valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });
      const parsed = JSON.parse(completion.choices[0].message.content);
      if (parsed && Array.isArray(parsed.questions)) {
        return {
          questions: ensureQuestionIntegrity(parsed.questions, difficulty)
        };
      }
    } catch (openAiErr) {
      console.warn('[CourseStudioAI] OpenAI questions error:', openAiErr.message);
    }
  }

  // 3. Fallback Local Question Synthesizer
  const localRes = buildLocalRuleBasedQuestions(contentText, questionCount, subject, difficulty);
  return {
    questions: ensureQuestionIntegrity(localRes?.questions || [], difficulty)
  };
}

function ensureQuestionIntegrity(parsedQuestions, defaultDifficulty = 'medium') {
  if (!Array.isArray(parsedQuestions)) return [];
  return parsedQuestions.map((q, idx) => {
    const qType = q.question_type || q.type || 'multiple_choice';
    let options = Array.isArray(q.options) ? [...q.options] : [];
    let correctAnswer = String(q.correct_answer || q.answer || '').trim();

    // Randomize Multiple Choice option positions to prevent Option A bias
    if (qType === 'multiple_choice' && options.length > 1) {
      let matchIdx = -1;
      const cleanTarget = correctAnswer.toLowerCase().replace(/^[a-d][\.\)\:\-]\s*/i, '').trim();
      const letterMatch = correctAnswer.match(/^[A-Da-d]$/);

      if (letterMatch) {
        const letterIdx = letterMatch[0].toUpperCase().charCodeAt(0) - 65;
        if (letterIdx >= 0 && letterIdx < options.length) {
          matchIdx = letterIdx;
        }
      }

      if (matchIdx === -1) {
        matchIdx = options.findIndex(opt => {
          const optText = String(typeof opt === 'object' ? opt.text || opt.label : opt)
            .toLowerCase()
            .replace(/^[a-d][\.\)\:\-]\s*/i, '')
            .trim();
          return optText === cleanTarget || optText.includes(cleanTarget) || cleanTarget.includes(optText);
        });
      }

      if (matchIdx !== -1) {
        const correctItem = options[matchIdx];
        // Fisher-Yates shuffle
        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }
        if (typeof correctItem === 'string') {
          const rawTarget = String(correctItem).replace(/^[A-Da-d][\.\)\:\-]\s*/, '').trim();
          correctAnswer = rawTarget;
        } else if (typeof correctItem === 'object' && correctItem !== null) {
          options = options.map((opt, oIdx) => ({
            ...opt,
            id: String.fromCharCode(65 + oIdx)
          }));
          const newOpt = options.find(o => o.text === correctItem.text);
          if (newOpt) correctAnswer = newOpt.id;
        }
      }
    }

    return {
      id: q.id && String(q.id).length > 8 ? String(q.id) : crypto.randomUUID(),
      question_text: String(q.question_text || q.question || 'Practice question').trim(),
      question_type: qType,
      options,
      correct_answer: correctAnswer,
      explanation: q.explanation || '',
      skill: q.skill || 'Reading & Comprehension',
      concept: q.concept || 'Key Takeaway',
      difficulty: q.difficulty || defaultDifficulty,
      points: typeof q.points === 'number' ? q.points : 10,
      order_index: typeof q.order_index === 'number' ? q.order_index : idx,
      passage: q.passage || '',
      content_ref: q.content_ref || q.passage_ref || ''
    };
  });
}

// ----------------------------------------------------------------------------
// 3. AI CONTENT IMPROVEMENT
// ----------------------------------------------------------------------------

export async function improveCourseContentWithAI({
  text = '',
  instruction = 'Improve clarity, readability, and engagement for students.',
  geminiApiKey = process.env.GEMINI_API_KEY,
  openaiApiKey = process.env.OPENAI_API_KEY,
  serverOpenAI = null
}) {
  if (!text || !text.trim()) return { improved_text: text };

  const prompt = `You are an educational editor. Polish and improve the following lesson text for students.
Instruction: ${instruction}

ORIGINAL TEXT:
"""
${text.trim()}
"""

Return JSON format:
{
  "improved_text": "Enhanced text here...",
  "summary_of_changes": "Brief bulleted summary of improvements"
}`;

  const gemKey = geminiApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (gemKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${gemKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (res.ok) {
        const data = await res.json();
        const parsed = parseCleanJson(data?.candidates?.[0]?.content?.parts?.[0]?.text);
        if (parsed?.improved_text) return parsed;
      }
    } catch {}
  }

  return {
    improved_text: text.trim(),
    summary_of_changes: 'Content preserved in original clarity.'
  };
}

// ----------------------------------------------------------------------------
// 3B. AI COURSE DESIGNER: CURRICULUM PLAN GENERATOR
// ----------------------------------------------------------------------------

export async function generateCoursePlanWithAI(options = {}) {
  const promptText = options.coursePrompt || options.prompt || '';
  const targetLevel = options.targetLevel || options.target_level || 'A1 Beginner';
  const ageGroup = options.ageGroup || options.age_group || 'Teens & Adults';
  const unitsCount = Math.min(12, Math.max(1, parseInt(options.unitsCount || options.units_count || 6, 10)));
  const lessonsPerUnit = Math.min(6, Math.max(1, parseInt(options.lessonsPerUnit || options.lessons_per_unit || 4, 10)));
  const learningStyles = options.learningStyles || options.learning_styles || ['reading', 'vocabulary', 'grammar', 'speaking', 'writing', 'quizzes'];
  const subject = options.subject || 'English';
  const geminiApiKey = options.geminiApiKey || process.env.GEMINI_API_KEY;
  const openaiApiKey = options.openaiApiKey || process.env.OPENAI_API_KEY;
  const serverOpenAI = options.serverOpenAI || null;

  if (!promptText || !promptText.trim()) {
    throw new Error('Please describe the course you wish to create.');
  }

  const systemInstruction = `You are a world-class CEFR curriculum designer and pedagogy expert for ${subject}.
Design an organized, cohesive, highly motivating course plan matching the teacher's goal:
"${promptText.trim()}"

COURSE SPECIFICATIONS:
- Subject: ${subject}
- Target CEFR Level: ${targetLevel}
- Learner Age Group: ${ageGroup}
- Structure: Exactly ${unitsCount} Units
- Scope: Exactly ${lessonsPerUnit} Lessons per Unit
- Core Pedagogical Pillars: ${learningStyles.join(', ')}

PEDAGOGICAL RULES:
1. Ensure gradual, logical skill and vocabulary progression matching ${targetLevel}.
2. For A1/A2 levels, focus on practical communication, everyday situations, realistic examples, and short, natural sentences.
3. Every lesson must have a clear communicative "can_do" objective (e.g. "I can introduce myself to a new friend", "I can order food in a cafe").
4. Provide realistic, inspiring unit and lesson titles.
5. Return STRICTLY valid JSON with NO Markdown fences or markdown backticks matching this schema:
{
  "title": "Course Title",
  "short_description": "2-3 sentence overview of what students will achieve in this course.",
  "subject": "${subject}",
  "grade_level": "${targetLevel}",
  "target_level": "${targetLevel}",
  "age_group": "${ageGroup}",
  "units": [
    {
      "title": "Unit 1: Title",
      "description": "Clear unit objective and themes covered",
      "episodes": [
        {
          "title": "Lesson 1: Title",
          "objective": "Clear communicative goal",
          "can_do": "I can...",
          "focus_skills": ["Vocabulary", "Speaking", "Grammar"]
        }
      ]
    }
  ]
}`;

  // 1. Try Google Gemini with Candidate Models
  const gemKey = geminiApiKey || process.env.GEMINI_API_KEY;
  if (gemKey) {
    for (const modelName of CANDIDATE_GEMINI_MODELS) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${gemKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemInstruction }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 5000 }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const parsed = parseCleanJson(rawText);
          if (parsed && Array.isArray(parsed.units) && parsed.units.length > 0) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn(`[CourseStudioAI] Gemini Course Plan error (${modelName}):`, err.message);
      }
    }
  }

  // 2. Try OpenAI Fallback
  if (serverOpenAI || openaiApiKey) {
    try {
      const client = serverOpenAI || new (await import('openai')).default({ apiKey: openaiApiKey });
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an educational curriculum designer that outputs strictly valid JSON.' },
          { role: 'user', content: systemInstruction }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });
      const parsed = JSON.parse(completion.choices[0].message.content);
      if (parsed && Array.isArray(parsed.units) && parsed.units.length > 0) {
        return parsed;
      }
    } catch (openAiErr) {
      console.warn('[CourseStudioAI] OpenAI Course Plan fallback error:', openAiErr.message);
    }
  }

  // 3. Deterministic Local Curriculum Generator (Zero failure fallback)
  return buildLocalRuleBasedCoursePlan(promptText, targetLevel, ageGroup, unitsCount, lessonsPerUnit, subject);
}

// ----------------------------------------------------------------------------
// 3C. AI LESSON DESIGNER: STRUCTURED DIGITAL LESSON GENERATOR
// ----------------------------------------------------------------------------

export async function generateStructuredLessonWithAI(options = {}) {
  const courseTitle = options.courseTitle || options.course_title || 'English Course';
  const unitTitle = options.unitTitle || options.unit_title || 'Unit 1';
  const lessonTitle = options.lessonTitle || options.lesson_title || 'Lesson 1';
  const targetLevel = options.targetLevel || options.target_level || 'A1 Beginner';
  const objective = options.objective || options.can_do || 'Communicate effectively in English';
  const subject = options.subject || 'English';
  const instructions = options.instructions || '';
  const geminiApiKey = options.geminiApiKey || process.env.GEMINI_API_KEY;
  const openaiApiKey = options.openaiApiKey || process.env.OPENAI_API_KEY;
  const serverOpenAI = options.serverOpenAI || null;

  const prompt = `You are a digital textbook author creating an interactive digital lesson for ${targetLevel} learners in ${subject}.
Course: "${courseTitle}"
Unit: "${unitTitle}"
Lesson Title: "${lessonTitle}"
Learning Objective: "${objective}"
Special Instructions: ${instructions || 'Ensure clean formatting, short sentences, and engaging digital textbook layout.'}

INSTRUCTIONS:
1. Divide the lesson into 3 to 4 sequential Course Blocks:
   - Block 1: "Introduction & Context" (block_type: "text", formatted with Markdown # and ## headings, welcoming paragraph, and learning goals).
   - Block 2: "Key Vocabulary" (block_type: "text", formatted with a clean Markdown GFM table with columns | Word | Meaning | Example |).
   - Block 3: "Story / Dialogue in Action" (block_type: "text_image", with Markdown text dialogue, and an image object with position "above", "left", or "right", caption, and image_prompt describing what illustration fits).
   - Block 4: "Grammar & Communication Rules" (block_type: "text", with bullet points and bold keywords).
2. Generate 3 to 4 interactive practice questions directly grounded in the lesson content:
   - Question types: "multiple_choice", "true_false", "fill_blank", "short_answer", "ordering".
   - Include: question_text, question_type, options, correct_answer, explanation, skill, concept, difficulty (${targetLevel.toLowerCase().includes('a1') ? 'easy' : 'medium'}), points (10).
3. Return STRICTLY valid JSON with NO Markdown fences or markdown backticks matching this schema:
{
  "title": "${lessonTitle}",
  "summary": "${objective}",
  "can_do": "${objective}",
  "estimated_minutes": 15,
  "blocks": [
    {
      "block_type": "text",
      "content": {
        "title": "Welcome & Objective",
        "text": "# ${lessonTitle}\\n\\n..."
      }
    },
    {
      "block_type": "text",
      "content": {
        "title": "Essential Vocabulary",
        "text": "## Useful Words\\n\\n| Word | Meaning | Example |\\n|---|---|---|\\n| hello | greeting | Hello! Nice to meet you. |"
      }
    },
    {
      "block_type": "text_image",
      "content": {
        "title": "Story in Action",
        "text": "### Practice Conversation\\n\\n...",
        "image": {
          "url": "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80",
          "position": "above",
          "caption": "Students learning in a classroom",
          "image_prompt": "Friendly diverse students practicing conversation in a bright classroom"
        }
      }
    }
  ],
  "suggested_questions": [
    {
      "question_text": "...",
      "question_type": "multiple_choice",
      "options": ["...", "...", "...", "..."],
      "correct_answer": "...",
      "explanation": "...",
      "skill": "Comprehension",
      "concept": "Vocabulary in Context",
      "difficulty": "easy",
      "points": 10
    }
  ]
}`;

  // 1. Try Gemini
  const gemKey = geminiApiKey || process.env.GEMINI_API_KEY;
  if (gemKey) {
    for (const modelName of CANDIDATE_GEMINI_MODELS) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${gemKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 4000 }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const parsed = parseCleanJson(rawText);
          if (parsed && Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn(`[CourseStudioAI] Gemini Structured Lesson error (${modelName}):`, err.message);
      }
    }
  }

  // 2. Try OpenAI Fallback
  if (serverOpenAI || openaiApiKey) {
    try {
      const client = serverOpenAI || new (await import('openai')).default({ apiKey: openaiApiKey });
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an educational lesson designer that outputs strictly valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });
      const parsed = JSON.parse(completion.choices[0].message.content);
      if (parsed && Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
        return parsed;
      }
    } catch (openAiErr) {
      console.warn('[CourseStudioAI] OpenAI structured lesson fallback error:', openAiErr.message);
    }
  }

  // 3. Deterministic Local Structured Lesson Chunker
  return buildLocalRuleBasedStructuredLesson(lessonTitle, unitTitle, targetLevel, objective, subject);
}

// ----------------------------------------------------------------------------
// 4. DETERMINISTIC CONCEPT MASTERY ENGINE
// ----------------------------------------------------------------------------

/**
 * Calculates fine-grained concept mastery from student question attempts.
 * @param {Array} attempts - List of course_question_attempts
 * @returns {Array} List of ConceptMasteryItem
 */
export function calculateConceptMastery(attempts = []) {
  const conceptGroups = new Map();

  for (const att of attempts) {
    const rawConcept = att.concept || 'General Understanding';
    const concept = rawConcept.trim();
    const skill = att.skill || 'General';

    if (!conceptGroups.has(concept)) {
      conceptGroups.set(concept, {
        concept,
        skill,
        total_attempts: 0,
        correct_attempts: 0
      });
    }

    const group = conceptGroups.get(concept);
    group.total_attempts += 1;
    if (att.is_correct) {
      group.correct_attempts += 1;
    }
  }

  const result = [];
  for (const [concept, data] of conceptGroups.entries()) {
    const accuracy = data.total_attempts > 0
      ? Number(((data.correct_attempts / data.total_attempts) * 100).toFixed(1))
      : 0;

    let status = 'good';
    if (accuracy >= 80) status = 'strong';
    else if (accuracy >= 65) status = 'good';
    else if (accuracy >= 50) status = 'needs_support';
    else status = 'at_risk';

    result.push({
      concept,
      skill: data.skill,
      accuracy_percentage: accuracy,
      total_attempts: data.total_attempts,
      correct_attempts: data.correct_attempts,
      status
    });
  }

  return result.sort((a, b) => b.total_attempts - a.total_attempts || a.accuracy_percentage - b.accuracy_percentage);
}

// ----------------------------------------------------------------------------
// 5. CROSS-CLASSROOM COURSE ANALYTICS AGGREGATOR
// ----------------------------------------------------------------------------

/**
 * Compiles comprehensive cross-classroom analytics for a teacher's course.
 * @param {Object} serverSupabase - Supabase client instance
 * @param {string} courseId - Target course UUID
 * @returns {Promise<Object>} CourseAnalyticsSummary
 */
export async function compileCrossClassroomAnalytics(arg1, arg2) {
  let course;
  let assignmentList = [];
  let enrollmentList = [];
  let attemptList = [];

  if (typeof arg1 === 'object' && arg1.course) {
    course = arg1.course;
    assignmentList = arg1.assignments || [];
    enrollmentList = arg1.enrollments || [];
    attemptList = arg1.attempts || [];
  } else {
    const serverSupabase = typeof arg1 === 'object' ? arg1 : arg2;
    const courseId = typeof arg1 === 'string' ? arg1 : arg2;

    if (!serverSupabase || !courseId) {
      throw new Error('Supabase client and valid courseId are required.');
    }

    // 1. Fetch Course Metadata
    const { data: cData, error: cErr } = await serverSupabase
      .from('courses')
      .select('*, teacher:profiles(id, full_name, email, avatar_url)')
      .eq('id', courseId)
      .maybeSingle();

    if (cErr || !cData) {
      throw new Error(`Course ${courseId} not found.`);
    }
    course = cData;

    // 2. Fetch Assignments & Classrooms
    const { data: assignments } = await serverSupabase
      .from('course_classroom_assignments')
      .select(`
        id,
        course_id,
        classroom_id,
        status,
        assigned_at,
        classroom:classrooms(id, title, subject, grade)
      `)
      .eq('course_id', courseId);
    assignmentList = assignments || [];

    // 3. Fetch All Enrollments
    const { data: enrollments } = await serverSupabase
      .from('course_enrollments')
      .select(`
        id,
        course_id,
        classroom_id,
        classroom_assignment_id,
        student_id,
        status,
        progress_percent,
        mastery_percent,
        accuracy_percent,
        completed_episodes_count,
        total_episodes_count,
        last_activity_at,
        student:profiles(id, full_name, email, avatar_url)
      `)
      .eq('course_id', courseId);
    enrollmentList = enrollments || [];

    // 4. Fetch Question Attempts for Concept Mastery
    const { data: attempts } = await serverSupabase
      .from('course_question_attempts')
      .select('*')
      .eq('course_id', courseId);
    attemptList = attempts || [];

    // 4b. Fetch Course Units & Episodes for Lesson-Level Telemetry
    try {
      const { data: unitsData } = await serverSupabase
        .from('course_units')
        .select('id, title, order_index, course_episodes(id, title, order_index)')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });
      if (unitsData) {
        course.units = unitsData;
      }
    } catch {
      // Optional enrichment
    }
  }

  // Extract ordered list of episodes/lessons if available
  const allCourseLessons = [];
  const rawUnits = course.units || course.course_units || [];
  rawUnits.forEach((u, uIdx) => {
    const eps = u.episodes || u.course_episodes || [];
    eps.forEach((ep, eIdx) => {
      allCourseLessons.push({
        episode_id: ep.id,
        title: ep.title || `Lesson ${eIdx + 1}`,
        unit_id: u.id,
        unit_title: u.title || `Unit ${uIdx + 1}`,
        order_index: ep.order_index ?? eIdx
      });
    });
  });
  const totalCourseLessons = allCourseLessons.length;

  const assignedClassroomsCount = assignmentList.length;
  const totalEnrolled = enrollmentList.length;
  const conceptMastery = calculateConceptMastery(attemptList);

  // 5. Aggregate Classroom Breakdown
  const classroomMap = new Map();
  assignmentList.forEach(a => {
    const cl = a.classroom || {};
    classroomMap.set(a.classroom_id, {
      classroom_id: a.classroom_id,
      classroom_title: cl.title || 'Classroom',
      grade: cl.grade || 'Grade 8',
      enrollments: []
    });
  });

  enrollmentList.forEach(e => {
    if (classroomMap.has(e.classroom_id)) {
      classroomMap.get(e.classroom_id).enrollments.push(e);
    }
  });

  const classroomPerformance = [];
  for (const [classroomId, item] of classroomMap.entries()) {
    const classEnrollments = item.enrollments;
    const enrolledCount = classEnrollments.length;

    const avgProgress = enrolledCount > 0
      ? Number((classEnrollments.reduce((s, e) => s + Number(e.progress_percent || 0), 0) / enrolledCount).toFixed(1))
      : 0;

    const avgMastery = enrolledCount > 0
      ? Number((classEnrollments.reduce((s, e) => s + Number(e.mastery_percent || 0), 0) / enrolledCount).toFixed(1))
      : 0;

    const avgAccuracy = enrolledCount > 0
      ? Number((classEnrollments.reduce((s, e) => s + Number(e.accuracy_percent || 0), 0) / enrolledCount).toFixed(1))
      : 0;

    const completedCount = classEnrollments.filter(e => e.status === 'completed' || Number(e.progress_percent) >= 100).length;
    const completionRate = enrolledCount > 0
      ? Number(((completedCount / enrolledCount) * 100).toFixed(1))
      : 0;

    classroomPerformance.push({
      classroom_id: classroomId,
      classroom_title: item.classroom_title,
      grade: item.grade,
      enrolled_students: enrolledCount,
      average_progress_percent: avgProgress,
      average_mastery_percent: avgMastery,
      average_accuracy_percent: avgAccuracy,
      completion_rate_percent: completionRate
    });
  }

  // 6. Aggregate Student Roster with Weak/Strong Concepts
  const studentPerformance = enrollmentList.map(e => {
    const student = e.student || {};
    const studentAttempts = attemptList.filter(a => a.student_id === e.student_id);
    const studentMastery = calculateConceptMastery(studentAttempts);

    const weakConcepts = studentMastery.filter(m => m.status === 'needs_support' || m.status === 'at_risk').map(m => m.concept);
    const strongConcepts = studentMastery.filter(m => m.status === 'strong').map(m => m.concept);

    let status = 'good';
    const mastery = Number(e.mastery_percent || 0);
    if (mastery >= 80) status = 'strong';
    else if (mastery >= 65) status = 'good';
    else if (mastery >= 50) status = 'needs_support';
    else status = 'at_risk';

    const totalEpisodes = Number(e.total_episodes_count || totalCourseLessons || 0);
    const completedEpisodes = e.completed_episodes_count != null
      ? Number(e.completed_episodes_count)
      : (totalEpisodes > 0 ? Math.round((Number(e.progress_percent || 0) / 100) * totalEpisodes) : 0);

    return {
      student_id: e.student_id,
      student_name: student.full_name || 'Student',
      student_email: student.email || '',
      avatar_url: student.avatar_url || null,
      classroom_id: e.classroom_id,
      classroom_title: classroomMap.get(e.classroom_id)?.classroom_title || 'Classroom',
      progress_percent: Number(e.progress_percent || 0),
      mastery_percent: Number(e.mastery_percent || 0),
      accuracy_percent: Number(e.accuracy_percent || 0),
      completed_episodes_count: completedEpisodes,
      total_episodes_count: totalEpisodes,
      status,
      last_active_at: e.last_activity_at,
      weak_concepts: weakConcepts,
      strong_concepts: strongConcepts
    };
  });

  // 6b. Lesson-Level Performance Telemetry
  const lessonMap = new Map();
  allCourseLessons.forEach(l => {
    lessonMap.set(l.episode_id, {
      episode_id: l.episode_id,
      title: l.title,
      unit_title: l.unit_title,
      total_attempts: 0,
      correct_attempts: 0
    });
  });

  attemptList.forEach(a => {
    const epId = a.episode_id;
    if (!epId) return;
    if (!lessonMap.has(epId)) {
      lessonMap.set(epId, {
        episode_id: epId,
        title: a.concept || 'Course Lesson',
        unit_title: a.skill || 'Unit',
        total_attempts: 0,
        correct_attempts: 0
      });
    }
    const rec = lessonMap.get(epId);
    rec.total_attempts += 1;
    if (a.is_correct) rec.correct_attempts += 1;
  });

  const lessonPerformance = Array.from(lessonMap.values()).map(l => {
    const acc = l.total_attempts > 0 ? Math.round((l.correct_attempts / l.total_attempts) * 100) : null;
    let status = 'good';
    if (acc !== null) {
      if (acc >= 80) status = 'strong';
      else if (acc >= 65) status = 'good';
      else if (acc >= 50) status = 'needs_support';
      else status = 'at_risk';
    }
    return {
      ...l,
      accuracy_percentage: acc ?? 0,
      has_attempts: l.total_attempts > 0,
      status
    };
  });

  const attemptedLessons = lessonPerformance.filter(l => l.has_attempts);
  const mostDifficultLessons = [...attemptedLessons].sort((a, b) => a.accuracy_percentage - b.accuracy_percentage).slice(0, 3);
  const strongestLessons = [...attemptedLessons].filter(l => l.accuracy_percentage >= 70).sort((a, b) => b.accuracy_percentage - a.accuracy_percentage).slice(0, 3);

  // 7. Overall Summary Metrics
  const activeStudentsCount = enrollmentList.filter(e => Number(e.progress_percent) > 0).length;
  const overallAvgProgress = totalEnrolled > 0
    ? Number((enrollmentList.reduce((s, e) => s + Number(e.progress_percent || 0), 0) / totalEnrolled).toFixed(1))
    : 0;

  const overallAvgMastery = totalEnrolled > 0
    ? Number((enrollmentList.reduce((s, e) => s + Number(e.mastery_percent || 0), 0) / totalEnrolled).toFixed(1))
    : 0;

  const overallAvgAccuracy = totalEnrolled > 0
    ? Number((enrollmentList.reduce((s, e) => s + Number(e.accuracy_percent || 0), 0) / totalEnrolled).toFixed(1))
    : 0;

  const totalCompleted = enrollmentList.filter(e => e.status === 'completed' || Number(e.progress_percent) >= 100).length;
  const overallCompletionRate = totalEnrolled > 0
    ? Number(((totalCompleted / totalEnrolled) * 100).toFixed(1))
    : 0;

  // 8. Grounded AI Insights
  const weakConceptsOverall = conceptMastery.filter(c => c.status === 'needs_support' || c.status === 'at_risk');
  const strongConceptsOverall = conceptMastery.filter(c => c.status === 'strong');

  let insightSummary = `Course "${course.title}" is assigned across ${assignedClassroomsCount} classrooms with ${totalEnrolled} enrolled learners.`;
  if (totalEnrolled > 0) {
    insightSummary += ` Overall student progress is at ${overallAvgProgress}% with ${overallAvgMastery}% average concept mastery.`;
  }

  const criticalStruggles = weakConceptsOverall.map(w => `${w.concept} (${w.accuracy_percentage}% accuracy across ${w.total_attempts} attempts)`);
  const classStrengths = strongConceptsOverall.map(s => `${s.concept} (${s.accuracy_percentage}% accuracy)`);

  const recommendedAction = weakConceptsOverall.length > 0
    ? `Schedule a 15-minute targeted review on "${weakConceptsOverall[0].concept}" and assign a 5-question reinforcement set.`
    : 'Maintain current instructional pace and progress to the next curriculum unit.';

  return {
    course,
    overview: {
      total_assigned_classrooms: assignedClassroomsCount,
      total_enrolled_students: totalEnrolled,
      active_students_count: activeStudentsCount,
      average_progress_percent: overallAvgProgress,
      average_mastery_percent: overallAvgMastery,
      average_accuracy_percent: overallAvgAccuracy,
      overall_completion_rate: overallCompletionRate
    },
    classroom_performance: classroomPerformance,
    student_performance: studentPerformance,
    concept_mastery: conceptMastery,
    lesson_performance: lessonPerformance,
    most_difficult_lessons: mostDifficultLessons,
    strongest_lessons: strongestLessons,
    ai_insights: {
      summary: insightSummary,
      class_strengths: classStrengths.length > 0 ? classStrengths : ['Foundational concepts show steady progression'],
      critical_struggles: criticalStruggles.length > 0 ? criticalStruggles : ['No critical concept deficiencies detected'],
      recommended_action: recommendedAction
    }
  };
}

// ----------------------------------------------------------------------------
// 6. HELPER FUNCTIONS & PARSERS
// ----------------------------------------------------------------------------

function parseCleanJson(text = '') {
  if (!text) return null;
  try {
    let clean = text.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

function buildLocalRuleBasedLesson(rawMaterial, courseTitle, subject) {
  const lines = rawMaterial.split('\n').map(l => l.trim()).filter(Boolean);
  const title = lines[0] ? lines[0].slice(0, 60) : `${subject} Lesson`;

  return {
    title,
    summary: `Structured digital lesson on ${courseTitle}.`,
    blocks: [
      {
        block_type: 'text',
        content: {
          title: 'Introduction',
          text: lines.slice(0, Math.min(3, lines.length)).join('\n\n') || rawMaterial.slice(0, 200)
        }
      },
      {
        block_type: 'text',
        content: {
          title: 'Key Concepts & Rules',
          text: lines.length > 3 ? lines.slice(3).map(l => `• ${l}`).join('\n') : `• ${rawMaterial}`
        }
      },
      {
        block_type: 'text',
        content: {
          title: 'Remember',
          text: 'Practice consistently to reinforce these core rules.'
        }
      }
    ],
    suggested_questions: [
      {
        question_text: `Based on the lesson "${title}", what is the primary takeaway?`,
        question_type: 'multiple_choice',
        options: [
          'Follow the core rules outlined in the lesson',
          'Ignore the examples provided',
          'Only study once without review',
          'None of the above'
        ],
        correct_answer: 'Follow the core rules outlined in the lesson',
        explanation: 'The lesson emphasizes understanding and applying the core rules.',
        skill: subject,
        concept: title,
        difficulty: 'easy',
        points: 10
      }
    ]
  };
}

function buildLocalRuleBasedQuestions(contentText, count, subject, difficulty) {
  const questions = [];
  const lines = contentText.split('\n').map(l => l.trim()).filter(l => l.length > 10);
  const fallbackLines = lines.length > 0 ? lines : [contentText.trim() || 'Understanding core principles'];

  for (let i = 0; i < count; i++) {
    const snippet = fallbackLines[i % fallbackLines.length];
    questions.push({
      question_text: `Which of the following best reflects: "${snippet.slice(0, 80)}"?`,
      question_type: 'multiple_choice',
      options: [
        `It accurately represents the ${subject} concept`,
        'It is grammatically incorrect',
        'It does not apply to this unit',
        'None of the above'
      ],
      correct_answer: `It accurately represents the ${subject} concept`,
      explanation: 'Derived directly from the verified lesson material.',
      skill: subject,
      concept: `${subject} Principle ${i + 1}`,
      difficulty,
      points: 10
    });
  }

  return { questions };
}

function buildLocalRuleBasedCoursePlan(promptText, targetLevel, ageGroup, unitsCount, lessonsPerUnit, subject) {
  const cleanPrompt = promptText.trim().replace(/^["']|["']$/g, '');
  const title = cleanPrompt.length > 50 ? `${cleanPrompt.slice(0, 47)}...` : cleanPrompt;

  const defaultUnitThemes = [
    { name: 'Me, My Identity & Greetings', canDo: 'introduce myself and greet others politely' },
    { name: 'My Family, Friends & People', canDo: 'describe family members and basic appearances' },
    { name: 'My Home, Classroom & Surroundings', canDo: 'talk about objects in a room and locations' },
    { name: 'Daily Routines, Habits & Time', canDo: 'describe my daily schedule and tell the time' },
    { name: 'Food, Drinks & Ordering at a Cafe', canDo: 'order meals and express food preferences' },
    { name: 'Hobbies, Sports & Free Time', canDo: 'share what I enjoy doing on weekends' },
    { name: 'Getting Around Town & Travel', canDo: 'ask for and follow simple directions' },
    { name: 'Weather, Clothes & Seasons', canDo: 'describe today\'s weather and what to wear' },
    { name: 'Health, Well-being & Daily Care', canDo: 'explain how I feel and ask for help' },
    { name: 'Shopping, Numbers & Prices', canDo: 'ask for prices and make simple purchases' },
    { name: 'Work, Careers & Ambitions', canDo: 'describe everyday jobs and workplaces' },
    { name: 'Stories, Memories & Future Plans', canDo: 'share a memorable experience and future goals' }
  ];

  const units = [];
  for (let u = 0; u < unitsCount; u++) {
    const theme = defaultUnitThemes[u % defaultUnitThemes.length];
    const unitTitle = `Unit ${u + 1} — ${theme.name}`;
    const episodes = [];

    for (let ep = 0; ep < lessonsPerUnit; ep++) {
      const epNum = ep + 1;
      episodes.push({
        title: `Lesson ${epNum}: Key Skills in ${theme.name.split('&')[0].trim()}`,
        objective: `Practice practical communication to ${theme.canDo}.`,
        can_do: `I can ${theme.canDo}.`,
        focus_skills: ['Vocabulary', 'Speaking', 'Grammar']
      });
    }

    units.push({
      title: unitTitle,
      description: `Students learn essential vocabulary and conversational structures to ${theme.canDo}.`,
      episodes
    });
  }

  return {
    title: title || `${subject} for ${targetLevel}`,
    short_description: `Comprehensive digital course designed for ${ageGroup} at ${targetLevel} level.`,
    subject,
    grade_level: targetLevel,
    target_level: targetLevel,
    age_group: ageGroup,
    units
  };
}

function buildLocalRuleBasedStructuredLesson(lessonTitle, unitTitle, targetLevel, objective, subject) {
  return {
    title: lessonTitle,
    summary: objective,
    can_do: objective,
    estimated_minutes: 15,
    blocks: [
      {
        block_type: 'text',
        content: {
          title: 'Lesson Introduction',
          text: `# ${lessonTitle}\n\nWelcome to this digital lesson in **${unitTitle}**!\n\n### Learning Goals\n- Understand core concepts and practical vocabulary.\n- Practice natural communicative examples.\n- Test your knowledge with interactive check questions.`
        }
      },
      {
        block_type: 'text',
        content: {
          title: 'Key Vocabulary',
          text: `## Essential Words\n\n| Word | Meaning | Example |\n|:---|:---|:---|\n| practice | to do something repeatedly to improve | I practice English every morning. |\n| student | a person who is learning | She is a diligent student. |\n| conversation | a friendly talk between people | We had a great conversation today. |\n| success | achieving your goal | Consistency is the key to success. |`
        }
      },
      {
        block_type: 'text_image',
        content: {
          title: 'Dialogue in Action',
          text: `### Real-Life Scenario\n\n**Alex**: Hello! How is your lesson going today?\n\n**Taylor**: Hi Alex! It is going great. I am learning new practical phrases.\n\n**Alex**: That sounds wonderful! Remember to practice speaking them out loud.`,
          image: {
            url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80',
            position: 'above',
            caption: 'Students collaborating and communicating in English.'
          }
        }
      },
      {
        block_type: 'text',
        content: {
          title: 'Key Takeaways',
          text: `## What to Remember\n\n- **Use short, clear sentences** when introducing yourself.\n- Pay attention to **subject-verb agreement**.\n- Review the vocabulary table before taking the quiz below.`
        }
      }
    ],
    suggested_questions: [
      {
        question_text: `What is the most effective way to improve according to this lesson?`,
        question_type: 'multiple_choice',
        options: [
          'Practice consistently and speak out loud',
          'Only read without speaking',
          'Memorize without understanding meaning',
          'Skip vocabulary reviews'
        ],
        correct_answer: 'Practice consistently and speak out loud',
        explanation: 'The lesson highlights active practice and speaking phrases aloud.',
        skill: 'Comprehension',
        concept: 'Study Habits',
        difficulty: 'easy',
        points: 10
      },
      {
        question_text: `Short, clear sentences are recommended for clear communication.`,
        question_type: 'true_false',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation: 'Direct, clear sentences enhance clarity for language learners.',
        skill: 'Grammar',
        concept: 'Sentence Structure',
        difficulty: 'easy',
        points: 10
      }
    ]
  };
}

// ----------------------------------------------------------------------------
// 6. AUTHORITATIVE LESSON COMPLETION & LEADERBOARD REWARD ENGINE
// ----------------------------------------------------------------------------

// Default per-question point value. Mirrors the frontend's getValidLessonQuestions()
// (`q.points || 10`). This is a PER-QUESTION default, NOT a lesson completion reward.
const DEFAULT_QUESTION_POINTS = 10;
const PLACEHOLDER_QUESTION_TEXTS = new Set(['New practice question', 'Statement based on the lesson']);
const lessonRewardMutexMap = new Map();

/**
 * Returns the maximum points a single lesson question is worth.
 */
export function getQuestionMaxPoints(question) {
  return Math.max(0, Math.round(Number(question?.points) || DEFAULT_QUESTION_POINTS));
}

/**
 * Clamps a client-reported question score to the server-known bounds of that question.
 * Incorrect answers earn 0; correct answers earn at most the question's point value.
 */
export function clampQuestionPoints(question, isCorrect, reportedPoints) {
  if (!isCorrect) return 0;
  const qMax = getQuestionMaxPoints(question);
  const reported = Math.round(Number(reportedPoints));
  if (!Number.isFinite(reported) || reported <= 0) return qMax;
  return Math.min(qMax, reported);
}

/**
 * SERVER-AUTHORITATIVE lesson score.
 * Computes the earned score and true maximum from the lesson's persisted questions
 * (course_questions) and the student's persisted attempts (course_question_attempts).
 * Client-submitted score / max_score values are never trusted.
 *
 * - Uses the same "valid question" filter as the student player (non-empty text,
 *   not a placeholder, de-duplicated by id).
 * - max_score = sum of each valid question's points (NOT assumed to be 100).
 * - Unanswered questions earn 0. Incorrect answers earn 0.
 * - If a question has several attempts, the most recent attempt is used.
 */
export function computeLessonScoreFromAttempts(questions, attempts) {
  const latestAttemptByQuestion = new Map();
  for (const att of attempts || []) {
    if (!att?.question_id) continue;
    const prev = latestAttemptByQuestion.get(att.question_id);
    const attTime = new Date(att.answered_at || 0).getTime() || 0;
    const prevTime = prev ? (new Date(prev.answered_at || 0).getTime() || 0) : -1;
    if (!prev || attTime >= prevTime) latestAttemptByQuestion.set(att.question_id, att);
  }

  const seen = new Set();
  let maxScore = 0;
  let earnedScore = 0;
  let answeredCount = 0;
  let correctCount = 0;
  let questionCount = 0;

  for (const q of questions || []) {
    if (!q?.id) continue;
    const text = typeof q.question_text === 'string' ? q.question_text : '';
    if (!text.trim() || PLACEHOLDER_QUESTION_TEXTS.has(text)) continue;
    if (seen.has(q.id)) continue;
    seen.add(q.id);

    questionCount++;
    maxScore += getQuestionMaxPoints(q);

    const att = latestAttemptByQuestion.get(q.id);
    if (!att) continue;
    if (att.submission_status === 'flagged_ai' || att.submission_status === 'provider_unavailable') {
      continue;
    }
    answeredCount++;
    if (att.is_correct) correctCount++;
    earnedScore += clampQuestionPoints(q, Boolean(att.is_correct), att.points_awarded);
  }

  return { earnedScore, maxScore, answeredCount, correctCount, questionCount };
}

/**
 * Generates a deterministic, canonical unique reward key for a student's lesson completion.
 */
export function buildLessonRewardKey({ user_id, course_id, unit_id, lesson_id }) {
  return `lesson_completion:${String(user_id).trim()}:${String(course_id).trim()}:${String(unit_id || 'unit').trim()}:${String(lesson_id).trim()}`;
}

/**
 * Serializes concurrent execution per lock key to eliminate race conditions.
 */
async function withLessonRewardLock(lockKey, taskFn) {
  const previousPromise = lessonRewardMutexMap.get(lockKey) || Promise.resolve();
  let releaseLock;
  const currentLockPromise = new Promise(resolve => {
    releaseLock = resolve;
  });
  const chainedPromise = previousPromise.then(() => currentLockPromise);
  lessonRewardMutexMap.set(lockKey, chainedPromise);

  try {
    await previousPromise;
    return await taskFn();
  } finally {
    releaseLock();
    if (lessonRewardMutexMap.get(lockKey) === chainedPromise) {
      lessonRewardMutexMap.delete(lockKey);
    }
  }
}

/**
 * Authoritatively marks a Course Studio lesson as completed, prevents duplicate rewards,
 * records the reward transaction, and atomically updates the student's classroom leaderboard points.
 *
 * SCORING POLICY (score-only, highest-score-wins):
 * - The leaderboard contribution of a lesson equals the student's EARNED assessment score,
 *   computed server-side from persisted question attempts (see computeLessonScoreFromAttempts).
 * - Each lesson owns exactly ONE classroom_points ledger row
 *   (classroom_id, student_id, source_type='activity', source_id=episode_id).
 *   That row's `points` is the lesson's credited (best) score.
 * - Re-submissions with the same or lower score credit 0 additional points.
 * - An improved score raises the row to the new score, i.e. credits only the difference.
 *
 * `score` / `max_score` arguments are accepted for backwards compatibility but are IGNORED
 * for crediting purposes - the frontend cannot submit an arbitrary score.
 */
export async function completeCourseLessonAndAwardPoints(supabaseClient, {
  student_id,
  course_id,
  classroom_id,
  episode_id,
  time_spent_seconds = 0,
  client_score: _clientScore,
  client_max_score: _clientMaxScore,
  question_attempts = [],
  backfill_completed_at = null
}) {
  if (!supabaseClient) {
    throw new Error('Database client is required.');
  }
  if (!student_id || !course_id || !classroom_id || !episode_id) {
    throw new Error('student_id, course_id, classroom_id, and episode_id are required.');
  }

  const cleanStudentId = String(student_id).trim();
  const cleanCourseId = String(course_id).trim();
  const cleanClassroomId = String(classroom_id).trim();
  const cleanEpisodeId = String(episode_id).trim();

  const lockKey = `${cleanStudentId}:${cleanCourseId}:${cleanEpisodeId}`;

  return withLessonRewardLock(lockKey, async () => {
    const nowIso = new Date().toISOString();

    // 1. Fetch episode metadata (unit_id, title), classroom teacher_id, student profile, and course daily release config
    const [{ data: episodeRow }, { data: classroomRow }, { data: studentProfile }, { data: courseRow }] = await Promise.all([
      supabaseClient
        .from('course_episodes')
        .select('*')
        .eq('id', cleanEpisodeId)
        .maybeSingle(),
      supabaseClient
        .from('classrooms')
        .select('id, teacher_id, leaderboard_reset_at')
        .eq('id', cleanClassroomId)
        .maybeSingle(),
      supabaseClient
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', cleanStudentId)
        .maybeSingle(),
      supabaseClient
        .from('courses')
        .select('*')
        .eq('id', cleanCourseId)
        .maybeSingle()
    ]);

    // Check if user is teacher/creator/admin previewing the course
    const isCourseOwner = courseRow?.teacher_id && courseRow.teacher_id === cleanStudentId;
    const isClassroomOwner = classroomRow?.teacher_id && classroomRow.teacher_id === cleanStudentId;
    const isTeacherOrAdmin = isCourseOwner || isClassroomOwner || studentProfile?.role === 'teacher' || studentProfile?.role === 'admin';

    // Prevent teachers from being enrolled as students or accumulating leaderboard points
    if (isTeacherOrAdmin) {
      return {
        success: true,
        is_preview: true,
        is_teacher: true,
        message: 'Teacher preview mode - student progress and leaderboard points are not recorded.',
        episode_id: cleanEpisodeId,
        already_awarded: true,
        points_awarded: 0,
        previous_points: 0,
        new_points: 0,
        enrollment: null
      };
    }

    const unitId = episodeRow?.unit_id || 'default_unit';
    const episodeTitle = episodeRow?.title || 'Course Lesson';
    const uniqueRewardKey = buildLessonRewardKey({
      user_id: cleanStudentId,
      course_id: cleanCourseId,
      unit_id: unitId,
      lesson_id: cleanEpisodeId
    });

    // 2. Resolve student enrollment and verify assignment status
    const { data: assignment } = await supabaseClient
      .from('course_classroom_assignments')
      .select('id, status, settings, start_date')
      .eq('course_id', cleanCourseId)
      .eq('classroom_id', cleanClassroomId)
      .maybeSingle();

    if (!assignment) {
      const notAssignedErr = new Error('Course is not actively assigned to this classroom.');
      notAssignedErr.statusCode = 404;
      throw notAssignedErr;
    }

    if (assignment.status === 'paused') {
      const pauseErr = new Error('This course is currently paused by the teacher. Lessons and submissions are on hold.');
      pauseErr.statusCode = 403;
      pauseErr.is_paused = true;
      throw pauseErr;
    }

    let { data: enrollment } = await supabaseClient
      .from('course_enrollments')
      .select('*')
      .eq('course_id', cleanCourseId)
      .eq('classroom_id', cleanClassroomId)
      .eq('student_id', cleanStudentId)
      .maybeSingle();

    if (!enrollment) {
      const { data: allEpisodes } = await supabaseClient
        .from('course_episodes')
        .select('id')
        .eq('course_id', cleanCourseId);

      const { data: created } = await supabaseClient
        .from('course_enrollments')
        .upsert({
          course_id: cleanCourseId,
          classroom_id: cleanClassroomId,
          classroom_assignment_id: assignment.id,
          student_id: cleanStudentId,
          status: 'in_progress',
          total_episodes_count: (allEpisodes || []).length
        }, { onConflict: 'classroom_assignment_id,student_id' })
        .select()
        .single();

      enrollment = created;
    }

    if (!enrollment) {
      const enrollErr = new Error('Enrollment could not be established.');
      enrollErr.statusCode = 404;
      throw enrollErr;
    }

    // Ensure student is registered in classroom_members so they appear on the leaderboard
    if (!isTeacherOrAdmin) {
      try {
        await supabaseClient
          .from('classroom_members')
          .upsert({
            classroom_id: cleanClassroomId,
            profile_id: cleanStudentId,
            role: 'student',
            status: 'active'
          }, { onConflict: 'classroom_id,profile_id' });
      } catch (_memberErr) {
        // Non-critical if membership already exists
      }
    }

    // 3. Load existing progress, this lesson's ledger row, current classroom total,
    //    and the persisted questions + attempts used to compute the authoritative score.
    const [
      { data: existingProgress },
      { data: existingPointRows },
      { data: currentPointsRows },
      { data: lessonQuestions },
      { data: lessonAttempts }
    ] = await Promise.all([
      supabaseClient
        .from('course_episode_progress')
        .select('id, status, completed_at, score, max_score')
        .eq('enrollment_id', enrollment.id)
        .eq('episode_id', cleanEpisodeId)
        .maybeSingle(),
      supabaseClient
        .from('classroom_points')
        .select('id, points, created_at')
        .eq('classroom_id', cleanClassroomId)
        .eq('student_id', cleanStudentId)
        .eq('source_type', 'activity')
        .eq('source_id', cleanEpisodeId)
        .order('created_at', { ascending: true }),
      supabaseClient
        .from('classroom_points')
        .select('points, created_at')
        .eq('classroom_id', cleanClassroomId)
        .eq('student_id', cleanStudentId),
      supabaseClient
        .from('course_questions')
        .select('id, question_text, points, episode_id, course_id, skill, concept, difficulty')
        .eq('episode_id', cleanEpisodeId)
        .eq('course_id', cleanCourseId),
      supabaseClient
        .from('course_question_attempts')
        .select('id, question_id, is_correct, points_awarded, answered_at')
        .eq('enrollment_id', enrollment.id)
        .eq('episode_id', cleanEpisodeId)
    ]);

    const resetAtMs = classroomRow?.leaderboard_reset_at ? new Date(classroomRow.leaderboard_reset_at).getTime() : NaN;
    const isAfterReset = (rowCreatedAt) => {
      if (isNaN(resetAtMs) || !rowCreatedAt) return true;
      return new Date(rowCreatedAt).getTime() >= resetAtMs;
    };

    const previousPoints = (currentPointsRows || []).reduce(
      (sum, r) => (isAfterReset(r?.created_at) ? sum + Number(r.points || 0) : sum),
      0
    );
    const hasExistingPointRow = Array.isArray(existingPointRows) && existingPointRows.length > 0;
    const previouslyCreditedPoints = hasExistingPointRow ? Number(existingPointRows[0].points || 0) : 0;

    // Authoritative check: Enforce "Daily Lesson Unlock" locking rule in course timezone
    const dailyReleaseActive = Boolean(
      courseRow?.daily_release_enabled ?? assignment?.settings?.daily_release_enabled
    );
    const isManuallyUnlocked = Boolean(episodeRow?.manual_unlock);
    if (dailyReleaseActive && !isManuallyUnlocked && existingProgress?.status !== 'completed') {
      const timeZone =
        courseRow?.course_timezone || assignment?.settings?.course_timezone || 'Asia/Colombo';
      const intervalDays = Math.max(
        1,
        Number(courseRow?.daily_release_interval_days ?? assignment?.settings?.daily_release_interval_days ?? 1) || 1
      );
      const formatTzDate = (dt) => {
        try {
          return new Intl.DateTimeFormat('en-CA', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(dt);
        } catch (_e) {
          return dt.toISOString().split('T')[0];
        }
      };

      const todayStr = formatTzDate(new Date());
      const toUtcDayMs = (ymd) => {
        const [y, m, d] = String(ymd || '').split('-').map(Number);
        return Date.UTC(y || 1970, (m || 1) - 1, d || 1);
      };
      const todayDayMs = toUtcDayMs(todayStr);

      // Check 1: Scheduled release date based on course_start_date + lesson index * intervalDays
      const rawStartDate =
        courseRow?.course_start_date || assignment?.settings?.course_start_date || assignment?.start_date || null;
      if (rawStartDate) {
        const startDateStr = String(rawStartDate).includes('T')
          ? formatTzDate(new Date(rawStartDate))
          : String(rawStartDate).slice(0, 10);
        const startDayMs = toUtcDayMs(startDateStr);
        const lessonIdx = Math.max(
          0,
          Number(episodeRow?.order_index ?? (episodeRow?.position ? episodeRow.position - 1 : 0)) || 0
        );
        const scheduledUnlockDayMs = startDayMs + lessonIdx * intervalDays * 86400000;
        if (todayDayMs < scheduledUnlockDayMs) {
          const unlockDateFormatted = new Date(scheduledUnlockDayMs).toISOString().split('T')[0];
          const lockErr = new Error(
            `Daily Lesson Unlock is active for this course. This lesson is scheduled to unlock on ${unlockDateFormatted}.`
          );
          lockErr.statusCode = 403;
          lockErr.dailyReleaseLocked = true;
          throw lockErr;
        }
      }

      // Check 2: Student completion pacing (at most 1 new micro lesson per release interval)
      const { data: todayCompletions } = await supabaseClient
        .from('course_episode_progress')
        .select('id, episode_id, completed_at')
        .eq('enrollment_id', enrollment.id)
        .eq('status', 'completed')
        .neq('episode_id', cleanEpisodeId);

      const hasCompletedWithinInterval = (todayCompletions || []).some(c => {
        if (!c.completed_at) return false;
        const compDateStr = formatTzDate(new Date(c.completed_at));
        const compDayMs = toUtcDayMs(compDateStr);
        const diffDays = Math.floor((todayDayMs - compDayMs) / 86400000);
        return diffDays < intervalDays;
      });

      if (hasCompletedWithinInterval) {
        const lockErr = new Error(
          'Daily Lesson Unlock is active for this course. You have already completed today\'s micro lesson. Your next lesson will unlock tomorrow.'
        );
        lockErr.statusCode = 403;
        lockErr.dailyReleaseLocked = true;
        throw lockErr;
      }
    }

    // 3b. Enforce server-side video completion if video progress records exist and are incomplete (< 90%)
    if (existingProgress?.status !== 'completed') {
      try {
        const { data: videoRows } = await supabaseClient
          .from('course_video_progress')
          .select('*')
          .eq('student_id', cleanStudentId)
          .eq('course_id', cleanCourseId)
          .eq('episode_id', cleanEpisodeId);

        if (Array.isArray(videoRows) && videoRows.length > 0) {
          const incompleteVideo = videoRows.find(
            row => !(row.is_completed || row.completed) && Number(row.watched_percent || 0) < 90
          );
          if (incompleteVideo) {
            const vidErr = new Error(
              `Please watch at least 90% of the required lesson video before completing this lesson (currently ${Math.round(
                Number(incompleteVideo.watched_percent || 0)
              )}% watched).`
            );
            vidErr.statusCode = 403;
            vidErr.videoCompletionRequired = true;
            throw vidErr;
          }
        }
      } catch (vidCheckErr) {
        if (vidCheckErr?.videoCompletionRequired) {
          throw vidCheckErr;
        }
        // Ignore if course_video_progress table is not yet migrated
      }
    }

    // 3c. Sync any submitted question_attempts that were not yet persisted in course_question_attempts
    //     (server-validated and clamped against course_questions).
    const effectiveLessonAttempts = Array.isArray(lessonAttempts) ? [...lessonAttempts] : [];
    if (Array.isArray(question_attempts) && question_attempts.length > 0 && Array.isArray(lessonQuestions) && lessonQuestions.length > 0) {
      const questionById = new Map(lessonQuestions.map(q => [String(q.id), q]));
      const dbAttemptByQId = new Map(effectiveLessonAttempts.map(a => [String(a.question_id), a]));

      for (const rawAtt of question_attempts) {
        const qId = String(rawAtt?.question_id || rawAtt?.questionId || '');
        const qRow = questionById.get(qId);
        if (!qRow) continue;

        const isFlagged =
          rawAtt?.submission_status === 'flagged_ai' ||
          rawAtt?.assessment_status === 'flagged_ai' ||
          rawAtt?.status === 'flagged_ai' ||
          rawAtt?.submission_status === 'provider_unavailable';
        const isCorr = isFlagged ? false : Boolean(rawAtt?.is_correct ?? (rawAtt?.status === 'correct'));
        const clampedPts = isFlagged
          ? 0
          : clampQuestionPoints(qRow, isCorr, rawAtt?.points_awarded ?? rawAtt?.score);

        const existingAtt = dbAttemptByQId.get(qId);
        if (!existingAtt) {
          try {
            const { data: insAtt } = await supabaseClient
              .from('course_question_attempts')
              .insert({
                enrollment_id: enrollment.id,
                student_id: cleanStudentId,
                course_id: cleanCourseId,
                classroom_id: cleanClassroomId,
                episode_id: cleanEpisodeId,
                question_id: qRow.id,
                student_answer: String(rawAtt?.student_answer ?? rawAtt?.answer ?? ''),
                is_correct: isCorr,
                points_awarded: clampedPts,
                skill: qRow.skill || 'General',
                concept: qRow.concept || 'General',
                difficulty: qRow.difficulty || 'medium'
              })
              .select('id, question_id, is_correct, points_awarded, answered_at')
              .maybeSingle();

            const synced = insAtt || {
              question_id: qRow.id,
              is_correct: isCorr,
              points_awarded: clampedPts,
              answered_at: nowIso
            };
            effectiveLessonAttempts.push(synced);
            dbAttemptByQId.set(qId, synced);
          } catch (_syncErr) {
            effectiveLessonAttempts.push({
              question_id: qRow.id,
              is_correct: isCorr,
              points_awarded: clampedPts,
              answered_at: nowIso
            });
          }
        } else if (clampedPts > Number(existingAtt.points_awarded || 0)) {
          existingAtt.points_awarded = clampedPts;
          existingAtt.is_correct = isCorr;
          existingAtt.answered_at = nowIso;
          if (existingAtt.id) {
            try {
              await supabaseClient
                .from('course_question_attempts')
                .update({
                  student_answer: String(rawAtt?.student_answer ?? rawAtt?.answer ?? ''),
                  is_correct: isCorr,
                  points_awarded: clampedPts,
                  answered_at: nowIso
                })
                .eq('id', existingAtt.id);
            } catch (_upAttErr) {
              // ignore
            }
          }
        }
      }
    }

    // 4. Compute the AUTHORITATIVE earned score strictly from persisted questions + attempts.
    //    Client-submitted scores are NEVER trusted or used.
    const wasAlreadyCompleted = existingProgress?.status === 'completed';
    const {
      earnedScore,
      maxScore,
      answeredCount,
      correctCount,
      questionCount
    } = computeLessonScoreFromAttempts(lessonQuestions, effectiveLessonAttempts);

    const effectiveCompletedAt = existingProgress?.completed_at || backfill_completed_at || nowIso;
    const numScore = earnedScore;
    const numMaxScore = maxScore;
    const percentage = numMaxScore > 0 ? Number(((numScore / numMaxScore) * 100).toFixed(1)) : 100;

    await supabaseClient
      .from('course_episode_progress')
      .upsert(
        {
          enrollment_id: enrollment.id,
          student_id: cleanStudentId,
          course_id: cleanCourseId,
          classroom_id: cleanClassroomId,
          episode_id: cleanEpisodeId,
          status: 'completed',
          score: numScore,
          max_score: numMaxScore,
          percentage,
          time_spent_seconds: Number(time_spent_seconds) || 0,
          completed_at: effectiveCompletedAt
        },
        { onConflict: 'enrollment_id,episode_id' }
      );

    // 5. Recalculate course enrollment progress
    const { data: completedEps } = await supabaseClient
      .from('course_episode_progress')
      .select('id, score, max_score')
      .eq('enrollment_id', enrollment.id)
      .eq('status', 'completed');

    const completedCount = (completedEps || []).length;
    const totalCount = Math.max(1, enrollment.total_episodes_count || 1);
    const progressPercent = Math.min(100, Number(((completedCount / totalCount) * 100).toFixed(1)));
    const enrollmentStatus = progressPercent >= 100 ? 'completed' : 'in_progress';

    const totalEarnedAcrossEps = (completedEps || []).reduce((s, r) => s + Number(r.score || 0), 0);
    const totalMaxAcrossEps = (completedEps || []).reduce((s, r) => s + Number(r.max_score || 0), 0);
    const computedAccuracy =
      totalMaxAcrossEps > 0
        ? Math.min(100, Number(((totalEarnedAcrossEps / totalMaxAcrossEps) * 100).toFixed(1)))
        : Number(enrollment.accuracy_percent || 0);

    const { data: updatedEnrollment } = await supabaseClient
      .from('course_enrollments')
      .update({
        progress_percent: progressPercent,
        completed_episodes_count: completedCount,
        accuracy_percent: Math.max(Number(enrollment.accuracy_percent || 0), computedAccuracy),
        mastery_percent: Math.max(Number(enrollment.mastery_percent || 0), computedAccuracy),
        status: enrollmentStatus,
        current_episode_id: cleanEpisodeId,
        completed_at: progressPercent >= 100 ? (enrollment.completed_at || nowIso) : null,
        last_activity_at: nowIso
      })
      .eq('id', enrollment.id)
      .select()
      .single();

    // 6. Credit the EARNED score to the existing classroom leaderboard ledger.
    //    One ledger row per lesson; its `points` = the lesson's credited (best) score.
    //    - No row yet          -> INSERT row with the earned score (unique index guards duplicates).
    //    - Row with lower score -> atomic conditional UPDATE (points < earned) => credits only the difference.
    //    - Row with >= score    -> nothing credited (refresh / re-submit / lower retry).
    //    Each write touches only this lesson's row, so concurrent awards from other sources
    //    (Live Quiz, Exams, Tasks, ...) are never overwritten. Totals are SUM(points) on read.
    // Check if this episode is a Learn with Shorts (9:16) micro-lesson:
    // Reward calculation for Learn with Shorts:
    //   - Complete the lesson: 5 XP
    //   - Each correct answer: 2 XP
    //   - Perfect score bonus: 5 XP
    //   - Maximum reward (5 questions): 20 XP
    let isShortsEpisode = false;
    try {
      const { data: epBlocks } = await supabaseClient
        .from('course_blocks')
        .select('block_type, content')
        .eq('episode_id', cleanEpisodeId)
        .eq('course_id', cleanCourseId);
      if (Array.isArray(epBlocks)) {
        isShortsEpisode = epBlocks.some(
          (b) =>
            b?.block_type === 'learn_with_shorts' ||
            b?.content?._block_type === 'learn_with_shorts' ||
            Boolean(b?.content?.is_learn_with_shorts)
        );
      }
    } catch {
      // Non-critical if blocks check is unavailable in mock/test
    }

    const targetRewardPoints = isShortsEpisode
      ? 5 + correctCount * 2 + (questionCount > 0 && correctCount === questionCount ? 5 : 0)
      : numScore;

    let pointsAwarded = 0;
    let creditedLessonPoints = previouslyCreditedPoints;
    let lessonPointRowId = hasExistingPointRow ? existingPointRows[0].id : null;
    let creditAction = 'none';
    const scoreReason = isShortsEpisode
      ? `Learn with Shorts XP: ${episodeTitle} (${numScore}/${numMaxScore} Marks • ${targetRewardPoints} XP)`
      : `Course Lesson Score: ${episodeTitle} (${numScore}/${numMaxScore})`;

    if (!isClassroomOwner && targetRewardPoints > 0) {
      if (!lessonPointRowId) {
        const { data: insertedPoint, error: ptErr } = await supabaseClient
          .from('classroom_points')
          .insert({
            classroom_id: cleanClassroomId,
            student_id: cleanStudentId,
            points: targetRewardPoints,
            reason: scoreReason,
            source_type: 'activity',
            source_id: cleanEpisodeId,
            awarded_by: cleanStudentId,
            created_at: effectiveCompletedAt
          })
          .select()
          .single();

        if (ptErr) {
          console.warn('[CourseStudioPoints] Insert notice:', ptErr.message);
        }

        // Post-insert deduplication guard: ensure strictly 1 point record exists for (classroom_id, student_id, activity, episode_id)
        const { data: verifyRows } = await supabaseClient
          .from('classroom_points')
          .select('id, points, created_at')
          .eq('classroom_id', cleanClassroomId)
          .eq('student_id', cleanStudentId)
          .eq('source_type', 'activity')
          .eq('source_id', cleanEpisodeId)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true });

        if (Array.isArray(verifyRows) && verifyRows.length > 1) {
          const duplicateIds = verifyRows.slice(1).map(r => r.id);
          await supabaseClient
            .from('classroom_points')
            .delete()
            .in('id', duplicateIds);
        }

        const primaryPointRow = (verifyRows && verifyRows[0]) || insertedPoint || null;
        if (primaryPointRow) {
          lessonPointRowId = primaryPointRow.id;
          if (insertedPoint && primaryPointRow.id === insertedPoint.id) {
            pointsAwarded = targetRewardPoints;
            creditedLessonPoints = targetRewardPoints;
            creditAction = 'initial_score';
          } else {
            creditedLessonPoints = Number(primaryPointRow.points || 0);
          }
        } else if (ptErr) {
          throw new Error(`Failed to record classroom points: ${ptErr.message}`);
        }
      }

      // Highest-score retry policy: raise the lesson's credited contribution by the difference only.
      if (lessonPointRowId && creditAction === 'none' && creditedLessonPoints < targetRewardPoints) {
        const { data: upgradedRows, error: upErr } = await supabaseClient
          .from('classroom_points')
          .update({ points: targetRewardPoints, reason: scoreReason })
          .eq('id', lessonPointRowId)
          .lt('points', targetRewardPoints)
          .select('id, points');

        if (upErr) {
          console.warn('[CourseStudioPoints] Score upgrade notice:', upErr.message);
        } else if (Array.isArray(upgradedRows) && upgradedRows.length > 0) {
          pointsAwarded = targetRewardPoints - creditedLessonPoints;
          creditedLessonPoints = targetRewardPoints;
          creditAction = 'improved_score';
        }
      }
    }

    const rewardTransaction = (lessonPointRowId || pointsAwarded > 0)
      ? {
          user_id: cleanStudentId,
          course_id: cleanCourseId,
          unit_id: unitId,
          lesson_id: cleanEpisodeId,
          points: creditedLessonPoints,
          points_delta: pointsAwarded,
          previous_credited_points: previouslyCreditedPoints,
          reward_type: 'lesson_score',
          credit_action: creditAction,
          reward_key: uniqueRewardKey,
          created_at: nowIso
        }
      : null;

    if (pointsAwarded > 0) {
      // Record authoritative reward transaction event (audit trail of each credited change)
      await supabaseClient.from('course_learning_events').insert({
        student_id: cleanStudentId,
        course_id: cleanCourseId,
        classroom_id: cleanClassroomId,
        episode_id: cleanEpisodeId,
        event_type: 'lesson_completion_reward',
        metadata: {
          ...rewardTransaction,
          score: numScore,
          max_score: numMaxScore,
          percentage,
          completion_bonus_points: 0,
          progress_percent: progressPercent
        }
      });
    }

    if (!wasAlreadyCompleted) {
      // Record standard episode_completed telemetry event once (first completion)
      await supabaseClient.from('course_learning_events').insert({
        student_id: cleanStudentId,
        course_id: cleanCourseId,
        classroom_id: cleanClassroomId,
        episode_id: cleanEpisodeId,
        event_type: 'episode_completed',
        metadata: {
          score: numScore,
          max_score: numMaxScore,
          percentage,
          progress_percent: progressPercent,
          points_awarded: pointsAwarded,
          reward_key: uniqueRewardKey
        }
      });
    }

    // Stage 2 Deadline Pipeline Rule: Do NOT delete saved ai_classroom_insights on individual student episode completions.

    // 7. Query authoritative updated leaderboard total for this student in this classroom
    const { data: updatedPointsRows } = await supabaseClient
      .from('classroom_points')
      .select('points, created_at')
      .eq('classroom_id', cleanClassroomId)
      .eq('student_id', cleanStudentId);

    const totalClassroomPoints = (updatedPointsRows || []).reduce(
      (sum, r) => (isAfterReset(r?.created_at) ? sum + Number(r.points || 0) : sum),
      0
    );

    return {
      success: true,
      enrollment: updatedEnrollment,
      // Points newly added to the leaderboard by THIS request (0 for duplicates / lower retries)
      points_awarded: pointsAwarded,
      // Authoritative assessment result
      earned_score: numScore,
      max_score: numMaxScore,
      percentage,
      answered_questions: answeredCount,
      correct_questions: correctCount,
      total_questions: questionCount,
      // Lesson's total contribution to the leaderboard after this request
      credited_lesson_points: creditedLessonPoints,
      previous_credited_points: previouslyCreditedPoints,
      lesson_reward_points: creditedLessonPoints,
      completion_bonus_points: 0,
      scoring_policy: 'score_only_highest_attempt',
      credit_action: creditAction,
      already_completed: wasAlreadyCompleted,
      already_awarded: pointsAwarded === 0 && (wasAlreadyCompleted || hasExistingPointRow),
      previous_points: previousPoints,
      total_classroom_points: totalClassroomPoints,
      reward_key: uniqueRewardKey,
      reward_transaction: rewardTransaction
    };
  });
}

/**
 * Backfills missing lesson completion rewards for any student lessons that were marked
 * 'completed' before the leaderboard reward integration was active or where points are missing.
 * Idempotent, fast, and safe.
 */
export async function backfillMissingCourseLessonPoints(supabaseClient, classroomId = null) {
  if (!supabaseClient) return { backfilledCount: 0, recoveredFromAttemptsCount: 0 };

  let query = supabaseClient
    .from('course_episode_progress')
    .select('enrollment_id, student_id, course_id, classroom_id, episode_id, score, time_spent_seconds, completed_at')
    .eq('status', 'completed');

  if (classroomId) {
    query = query.eq('classroom_id', classroomId);
  }

  let ptQuery = supabaseClient
    .from('classroom_points')
    .select('classroom_id, student_id, source_id, points')
    .eq('source_type', 'activity');

  if (classroomId) {
    ptQuery = ptQuery.eq('classroom_id', classroomId);
  }

  const [{ data: completedRows, error }, { data: existingPts }] = await Promise.all([query, ptQuery]);
  if (error) {
    return { backfilledCount: 0, recoveredFromAttemptsCount: 0 };
  }

  const completedKeySet = new Set();
  for (const row of completedRows || []) {
    if (row?.classroom_id && row?.student_id && row?.episode_id) {
      completedKeySet.add(`${row.classroom_id}:${row.student_id}:${row.episode_id}`);
    }
  }

  const existingPtMap = new Map();
  for (const pt of existingPts || []) {
    if (!pt?.classroom_id || !pt?.student_id || !pt?.source_id) continue;
    const k = `${pt.classroom_id}:${pt.student_id}:${pt.source_id}`;
    existingPtMap.set(k, Math.max(Number(existingPtMap.get(k) || 0), Number(pt.points || 0)));
  }

  const candidateRows = (completedRows || []).filter(row => {
    if (!row.student_id || !row.course_id || !row.classroom_id || !row.episode_id) return false;
    const k = `${row.classroom_id}:${row.student_id}:${row.episode_id}`;
    const currentCredited = existingPtMap.get(k) || 0;
    return currentCredited === 0 || Number(row.score || 0) > currentCredited;
  });

  let backfilledCount = 0;
  for (const row of candidateRows) {
    try {
      const res = await completeCourseLessonAndAwardPoints(supabaseClient, {
        student_id: row.student_id,
        course_id: row.course_id,
        classroom_id: row.classroom_id,
        episode_id: row.episode_id,
        time_spent_seconds: row.time_spent_seconds || 0,
        backfill_completed_at: row.completed_at || null
      });
      if (res && !res.already_awarded && res.points_awarded > 0) {
        backfilledCount++;
      }
    } catch (_err) {
      // Continue safely
    }
  }

  // Also recover lessons where a student completed all persisted questions (and video completion if required)
  // but the client failed to persist course_episode_progress (e.g. Learn with Shorts video-sync bug).
  let recoveredFromAttemptsCount = 0;
  try {
    let attQuery = supabaseClient
      .from('course_question_attempts')
      .select('student_id, course_id, classroom_id, episode_id, question_id, answered_at');
    if (classroomId) {
      attQuery = attQuery.eq('classroom_id', classroomId);
    }
    if (typeof attQuery.order === 'function') {
      attQuery = attQuery.order('answered_at', { ascending: false });
    }
    if (typeof attQuery.limit === 'function') {
      attQuery = attQuery.limit(5000);
    }
    const attRes = await attQuery;
    const allAtts = Array.isArray(attRes?.data) ? attRes.data : [];
    if (allAtts.length > 0) {
      const attGroups = new Map();
      const episodeIdsSet = new Set();
      for (const a of allAtts) {
        if (!a?.student_id || !a?.course_id || !a?.classroom_id || !a?.episode_id || !a?.question_id) continue;
        const k = `${a.classroom_id}:${a.student_id}:${a.episode_id}`;
        if (completedKeySet.has(k)) continue;
        episodeIdsSet.add(a.episode_id);
        if (!attGroups.has(k)) {
          attGroups.set(k, {
            student_id: a.student_id,
            course_id: a.course_id,
            classroom_id: a.classroom_id,
            episode_id: a.episode_id,
            qIds: new Set(),
            lastAnsweredAt: a.answered_at || null
          });
        }
        const g = attGroups.get(k);
        g.qIds.add(a.question_id);
        if (a.answered_at && (!g.lastAnsweredAt || new Date(a.answered_at) > new Date(g.lastAnsweredAt))) {
          g.lastAnsweredAt = a.answered_at;
        }
      }

      if (attGroups.size > 0 && episodeIdsSet.size > 0) {
        const epIds = Array.from(episodeIdsSet);
        const [qRes, blkRes, evRes] = await Promise.all([
          supabaseClient.from('course_questions').select('id, episode_id, question_text').in('episode_id', epIds),
          supabaseClient.from('course_blocks').select('episode_id, block_type, content').in('episode_id', epIds),
          (() => {
            let eq = supabaseClient
              .from('course_learning_events')
              .select('student_id, episode_id, event_type')
              .eq('event_type', 'video_completed_verified')
              .in('episode_id', epIds);
            if (classroomId) eq = eq.eq('classroom_id', classroomId);
            return eq;
          })()
        ]);

        const validQCountByEp = new Map();
        for (const q of qRes?.data || []) {
          const t = typeof q.question_text === 'string' ? q.question_text.trim() : '';
          if (!t || PLACEHOLDER_QUESTION_TEXTS.has(t)) continue;
          if (!validQCountByEp.has(q.episode_id)) validQCountByEp.set(q.episode_id, new Set());
          validQCountByEp.get(q.episode_id).add(q.id);
        }

        const videoRequiredEps = new Set();
        for (const b of blkRes?.data || []) {
          const c = b?.content || {};
          const hasVid =
            b?.block_type === 'video' ||
            b?.block_type === 'youtube_video' ||
            b?.block_type === 'youtube_short' ||
            b?.block_type === 'learn_with_shorts' ||
            b?.block_type === 'text_video' ||
            Boolean(c?.video?.url || c?.video_url || c?.video_id);
          if (hasVid && (c?.video?.url || c?.video_url || c?.url || c?.video_id)) {
            videoRequiredEps.add(b.episode_id);
          }
        }

        const vidCompletedSet = new Set();
        for (const ev of evRes?.data || []) {
          if (ev?.student_id && ev?.episode_id) {
            vidCompletedSet.add(`${ev.student_id}:${ev.episode_id}`);
          }
        }

        for (const g of attGroups.values()) {
          const requiredCount = validQCountByEp.get(g.episode_id)?.size || 0;
          if (requiredCount === 0 || g.qIds.size < requiredCount) continue;
          if (videoRequiredEps.has(g.episode_id) && !vidCompletedSet.has(`${g.student_id}:${g.episode_id}`)) {
            continue;
          }
          try {
            const res = await completeCourseLessonAndAwardPoints(supabaseClient, {
              student_id: g.student_id,
              course_id: g.course_id,
              classroom_id: g.classroom_id,
              episode_id: g.episode_id,
              backfill_completed_at: g.lastAnsweredAt || null
            });
            if (res && !res.is_teacher && !res.already_awarded && res.points_awarded > 0) {
              recoveredFromAttemptsCount++;
              backfilledCount++;
            }
          } catch (_recErr) {
            // Skip if not actively assigned or paused or teacher
          }
        }
      }
    }
  } catch (_attRecoverErr) {
    // Non-critical in mock environments without .in() support
  }

  return { backfilledCount, recoveredFromAttemptsCount };
}

