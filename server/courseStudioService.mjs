// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: COURSE STUDIO SERVER SERVICE
// AI Lesson Builder, Question Generator, Concept Mastery Engine,
// Course Duplication, and Cross-Classroom Analytics Aggregator.
// ============================================================================

import crypto from 'crypto';

const CANDIDATE_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro'
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
            return parsed;
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
        return parsed;
      }
    } catch (openAiErr) {
      console.warn('[CourseStudioAI] OpenAI questions error:', openAiErr.message);
    }
  }

  // 3. Fallback Local Question Synthesizer
  return buildLocalRuleBasedQuestions(contentText, questionCount, subject, difficulty);
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

  const gemKey = geminiApiKey || process.env.GEMINI_API_KEY;
  if (gemKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${gemKey}`;
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
  }

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
      status,
      last_active_at: e.last_activity_at,
      weak_concepts: weakConcepts,
      strong_concepts: strongConcepts
    };
  });

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
