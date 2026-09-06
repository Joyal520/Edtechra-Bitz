// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: AI PROMPT BUILDER
// Constructs pedagogy-grounded, production-grade prompts with the exact canonical schema.
// ============================================================================

import { ExamMetadata, PedagogicalRequirements, SupportedQuestionType } from '../shared/ExamSchema';
import { getQuestionTypeMeta } from '../shared/QuestionTypes';

export interface QuestionTypeConfigItem {
  id: string;
  type: SupportedQuestionType;
  count: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  customInstructions?: string;
}

export interface PromptBuilderInput {
  exam: ExamMetadata;
  questionConfigs: QuestionTypeConfigItem[];
  requirements: PedagogicalRequirements;
  sourceMaterial?: string;
}

export function buildAIExamPrompt(input: PromptBuilderInput): string {
  const { exam, questionConfigs, requirements, sourceMaterial } = input;

  const totalQuestions = questionConfigs.reduce((acc, q) => acc + (Number(q.count) || 0), 0);

  const questionBreakdownText = questionConfigs.map((q, idx) => {
    const meta = getQuestionTypeMeta(q.type);
    return `  ${idx + 1}. **${meta.title}** (${q.type}): ${q.count} question(s), Difficulty: ${q.difficulty}${
      q.customInstructions ? ` — Notes: ${q.customInstructions}` : ''
    }`;
  }).join('\n');

  const learningObjectivesText = Array.isArray(requirements.learningObjectives) && requirements.learningObjectives.length > 0
    ? requirements.learningObjectives.map(obj => `  - ${obj}`).join('\n')
    : '  - Assess comprehensive conceptual understanding, reasoning, and practical application of the topic.';

  const skillsText = Array.isArray(requirements.skillsTested) && requirements.skillsTested.length > 0
    ? requirements.skillsTested.map(s => `  - ${s}`).join('\n')
    : '  - Recall, comprehension, analytical thinking, and domain vocabulary mastery.';

  const topicsIncludeText = Array.isArray(requirements.topicsToInclude) && requirements.topicsToInclude.length > 0
    ? requirements.topicsToInclude.map(t => `  - ${t}`).join('\n')
    : `  - Core principles of ${exam.topic || exam.subject}.`;

  const topicsAvoidText = Array.isArray(requirements.topicsToAvoid) && requirements.topicsToAvoid.length > 0
    ? requirements.topicsToAvoid.map(t => `  - Avoid: ${t}`).join('\n')
    : '  - Avoid out-of-syllabus tangents, obscure trivia, or racially/culturally biased references.';

  const cefrText = requirements.cefrLevel && requirements.cefrLevel !== 'General'
    ? `Target CEFR English Level: **${requirements.cefrLevel}**. Ensure sentence structures, lexis, and reading passages adhere strictly to ${requirements.cefrLevel} proficiency standards.`
    : '';

  const grammarText = requirements.grammarFocus ? `Grammar / Language Focus: ${requirements.grammarFocus}` : '';
  const vocabularyText = requirements.vocabularyLevel ? `Vocabulary Level: ${requirements.vocabularyLevel}` : '';

  const canonicalSchemaExample = `{
  "schemaVersion": "1.0",
  "exam": {
    "title": "${exam.title}",
    "subject": "${exam.subject}",
    "grade": "${exam.grade}",
    "level": "${exam.level || 'General'}",
    "examType": "${exam.examType}",
    "difficulty": "${exam.difficulty}",
    "topic": "${exam.topic || ''}",
    "description": "${exam.description || ''}",
    "instructions": "Read all questions carefully. Review your answers before submitting.",
    "durationMinutes": ${exam.durationMinutes || 45},
    "passPercentage": ${exam.passPercentage || 40}
  },
  "sections": [
    {
      "id": "section-1",
      "title": "Section 1: Objective Questions",
      "questionType": "multiple_choice",
      "questions": [
        {
          "id": "q1",
          "type": "multiple_choice",
          "question": "Clear, unambiguous question text?",
          "options": [
            { "id": "a", "text": "First option" },
            { "id": "b", "text": "Second option" },
            { "id": "c", "text": "Third option" },
            { "id": "d", "text": "Fourth option" }
          ],
          "correctAnswer": ["b"],
          "difficulty": "medium",
          "marks": 1,
          "explanation": "Brief explanation of why option b is correct."
        },
        {
          "id": "q2",
          "type": "true_false",
          "question": "Statement to evaluate as True or False?",
          "correctAnswer": true,
          "difficulty": "easy",
          "marks": 1,
          "explanation": "Why this statement is factually true."
        },
        {
          "id": "q3",
          "type": "fill_in_blank",
          "question": "Photosynthesis takes place in the [blank] of plant cells.",
          "acceptedAnswers": ["chloroplast", "chloroplasts"],
          "caseSensitive": false,
          "difficulty": "medium",
          "marks": 1,
          "explanation": "Chloroplasts contain chlorophyll where photosynthesis occurs."
        },
        {
          "id": "q4",
          "type": "matching",
          "question": "Match each scientific term with its correct definition:",
          "pairs": [
            { "id": "p1", "left": "Mitochondria", "right": "Powerhouse of the cell" },
            { "id": "p2", "left": "Ribosome", "right": "Protein synthesis" },
            { "id": "p3", "left": "Nucleus", "right": "Contains genetic material" }
          ],
          "difficulty": "medium",
          "marks": 2,
          "explanation": "Correct cellular organelle functions."
        },
        {
          "id": "q5",
          "type": "reorder",
          "question": "Arrange the stages of the scientific method in sequential order:",
          "items": [
            { "id": "step_1", "text": "Make an observation" },
            { "id": "step_2", "text": "Formulate a hypothesis" },
            { "id": "step_3", "text": "Conduct an experiment" },
            { "id": "step_4", "text": "Analyze data and draw conclusions" }
          ],
          "correctOrder": ["step_1", "step_2", "step_3", "step_4"],
          "difficulty": "medium",
          "marks": 2,
          "explanation": "Standard scientific method progression."
        }
      ]
    }
  ]
}`;

  return `You are an expert pedagogical assessment designer, curriculum specialist, and educational psychometrician.

Your mission is to design a high-quality, balanced, and rigorous digital examination that precisely conforms to the teacher's assessment specification below.

================================================================================
EXAM SPECIFICATION
================================================================================
- Exam Title: ${exam.title}
- Subject: ${exam.subject}
- Grade / Target Audience: ${exam.grade}
- Exam Type: ${exam.examType}
- Topic / Subject Area: ${exam.topic || 'Curriculum Standards'}
- Overall Difficulty: ${exam.difficulty}
- Target Total Questions: ${totalQuestions}
- Duration: ${exam.durationMinutes || 45} minutes
- Pass Threshold: ${exam.passPercentage || 40}%

================================================================================
REQUIRED QUESTION TYPE BREAKDOWN
================================================================================
You MUST produce the exact counts for each question type specified below:
${questionBreakdownText}

================================================================================
PEDAGOGICAL & CURRICULUM OBJECTIVES
================================================================================
Learning Objectives:
${learningObjectivesText}

Skills Tested:
${skillsText}

Topics to Emphasize:
${topicsIncludeText}

Topics to Avoid / Constraints:
${topicsAvoidText}
${cefrText ? `\n${cefrText}` : ''}
${grammarText ? `\n${grammarText}` : ''}
${vocabularyText ? `\n${vocabularyText}` : ''}
${requirements.specialInstructions ? `\nSpecial Teacher Notes:\n${requirements.specialInstructions}` : ''}

${sourceMaterial ? `================================================================================
SOURCE MATERIAL / REFERENCE NOTES GROUNDING
================================================================================
Ground your questions directly on this reference material:
"""
${sourceMaterial.trim()}
"""
` : ''}
================================================================================
QUALITY & ASSESSMENT RULES
================================================================================
1. Accuracy: Every question, option, answer key, and explanation must be 100% factually and grammatically correct.
2. Clarity: Avoid trick questions, negative phrasing ("Which of the following is NOT..."), double negatives, or vague prompts unless intentionally testing analytical critique.
3. Multiple Choice: Provide 4 plausible options for each MCQ. Do NOT use "All of the above" or "None of the above". Distractors must be believable common misconceptions.
4. Fill in the Blank: Use '[blank]' inside the question prompt where the missing word/phrase belongs. Provide all reasonable spelling variations in 'acceptedAnswers'.
5. Matching: Provide at least 3 distinct, non-overlapping pairs with concise left and right items.
6. Reorder: Provide clear sequential, chronological, or logical steps. Ensure 'correctOrder' holds the exact item IDs in chronological order.
7. Reading Comprehension: If included, generate a rich, coherent passage appropriate for the grade level, followed by 3-5 distinct questions (factual, inferential, and vocabulary-in-context).
8. Essays & Short Answer: Provide clear rubrics and sample answers for teacher reference.
9. Unique IDs: Every question must have a unique ID (e.g., "q1", "q2", "q3", etc.).
10. Explanations: Every objective question MUST have a clear, educational explanation explaining WHY the correct answer is right.

================================================================================
OUTPUT FORMAT REQUIREMENTS (CRITICAL)
================================================================================
You MUST output ONLY a valid JSON object matching the EdTechra Canonical Exam Schema (v1.0) below.
DO NOT include any introductory conversational text, greeting, or conclusion.
DO NOT wrap with backticks other than a standard \`\`\`json block.

Canonical JSON Structure Reference:
${canonicalSchemaExample}

Generate the full, complete exam JSON now:`;
}
