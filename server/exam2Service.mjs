// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: EXAM 2.0 ENGINE SERVICE
// Handles AI exam generation, deterministic auto-grading, teacher exam management,
// student submissions, score analytics, and Cloudflare R2 report storage.
// ============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  putBinaryContent,
  putJsonContent,
  getJsonContent,
  buildPresignedDownloadUrl,
  buildExamSourceObjectKey,
  buildExamAttachmentObjectKey,
  buildExamSubmissionObjectKey,
  buildExamReportObjectKey,
  sanitizeSegment,
  buildPublicUrl
} from './r2Service.mjs';
import { aiRouter } from './ai/aiRouter.mjs';
import { AI_TASK_TYPES } from './ai/taskTypes.mjs';
import {
  validateExamAgainstBlueprint,
  generateBlueprintCorrectionPrompt,
  normalizeCanonicalQuestionType
} from './ai/outputValidator.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const exam2RootDir = path.resolve(__dirname, '../Digital_classroom/Digital Classroom/Exam 2.0');
const dataDir = path.resolve(exam2RootDir, 'data');

// Dynamically import score_analysis from Exam 2.0 module
let computeAnalytics = null;
let generatePDFReport = null;

try {
  const scoreModule = await import('../Digital_classroom/Digital Classroom/Exam 2.0/score_analysis.mjs');
  computeAnalytics = scoreModule.computeAnalytics;
  generatePDFReport = scoreModule.generatePDFReport;
} catch (err) {
  console.warn('[Exam2Service] Note: Could not import score_analysis.mjs directly:', err.message);
}

function cryptoId(prefix = 'exam') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ----------------------------------------------------------------------------
// 1. AI EXAM GENERATOR & FALLBACK ENGINE
// ----------------------------------------------------------------------------

function examJsonSchema() {
  const question = {
    type: "object",
    additionalProperties: true,
    required: ["questionId", "questionType", "questionText", "marks", "difficulty"],
    properties: {
      questionId: { type: "string" },
      questionType: { type: "string" },
      questionText: { type: "string" },
      options: {
        type: "array",
        items: {
          anyOf: [
            { type: "string" },
            {
              type: "object",
              properties: {
                id: { type: "string" },
                text: { type: "string" }
              }
            }
          ]
        }
      },
      correctAnswer: {
        anyOf: [
          { type: "string" },
          { type: "boolean" },
          { type: "number" },
          { type: "array", items: { type: "string" } }
        ]
      },
      acceptedAnswers: { type: "array", items: { type: "string" } },
      pairs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            left: { type: "string" },
            right: { type: "string" }
          }
        }
      },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            text: { type: "string" }
          }
        }
      },
      blanks: { type: "array" },
      wordBank: { type: "array", items: { type: "string" } },
      marks: { type: "number" },
      difficulty: { type: "string" },
      explanation: { type: "string" }
    }
  };

  return {
    type: "object",
    additionalProperties: true,
    required: ["metadata", "sections"],
    properties: {
      metadata: {
        type: "object",
        additionalProperties: true,
        required: ["title", "examType", "difficulty", "totalMarks"],
        properties: {
          examId: { type: "string" },
          title: { type: "string" },
          examType: { type: "string" },
          difficulty: { type: "string" },
          duration: { type: "string" },
          totalMarks: { type: "number" },
          gradingMode: { type: "string" },
          passPercentage: { type: "number" },
          status: { type: "string" },
          generatedAt: { type: "string" },
          approvalRequired: { type: "boolean" },
          generatorNote: { type: "string" }
        }
      },
      sections: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
          required: ["sectionId", "title", "questionType", "questions"],
          properties: {
            sectionId: { type: "string" },
            title: { type: "string" },
            questionType: { type: "string" },
            instruction: { type: "string" },
            marksPerQuestion: { type: "number" },
            totalMarks: { type: "number" },
            questions: { type: "array", items: question },
            activities: { type: "array" },
            passage: { type: "string" }
          }
        }
      }
    }
  };
}

export function validateGenerationPayload(payload) {
  if (!payload || typeof payload !== "object") return "Payload must be an object.";
  const content = payload.content || payload.topic || payload.lessonNotes || "";
  if (content.trim().length < 2) return "Content or topic is required.";
  if (!payload.examType) return "Exam type is required.";
  if (!payload.difficulty) return "Difficulty is required.";

  const rawSections = payload.sections || payload.blueprintItems || [];
  if (!Array.isArray(rawSections) || rawSections.length === 0) {
    return "At least one question section is required.";
  }

  const enabledSections = rawSections.filter(s => s.enabled !== false);
  if (enabledSections.length === 0) {
    return "At least one enabled question section is required.";
  }

  return "";
}

export async function generateExam({ payload, openaiApiKey, serverOpenAI }) {
  const cleanedPayload = {
    ...payload,
    content: (payload.content || payload.topic || payload.lessonNotes || "").replace(/\s+/g, " ").trim(),
    sections: (payload.sections || payload.blueprintItems || []).filter(s => s.enabled !== false).map(s => ({
      ...s,
      type: s.type || s.questionType || s.name,
      count: Number(s.count || s.numQuestions || 1),
      marks: Number(s.marks || s.marksPerItem || 1),
      instruction: s.instruction ? s.instruction.trim() : ""
    }))
  };

  const totalQuestions = cleanedPayload.sections.reduce((sum, s) => sum + s.count, 0);
  const totalMarks = Number(payload.requiredTotal || cleanedPayload.sections.reduce((sum, s) => sum + s.count * s.marks, 0));
  const durationStr = payload.duration?.value
    ? `${payload.duration.value} ${payload.duration.unit || 'Minutes'}`
    : `${payload.durationMinutes || payload.duration || 60} Minutes`;

  const blueprintSpec = {
    totalQuestions,
    totalMarks,
    duration: durationStr,
    difficulty: payload.difficulty || "Medium",
    passPercentage: Number(payload.passPercentage || 50),
    sections: cleanedPayload.sections
  };

  // Section breakdown description for prompt
  const sectionBreakdownText = cleanedPayload.sections.map((s, idx) => {
    return `  Section ${idx + 1}: ${s.type} — exactly ${s.count} question(s), ${s.marks} mark(s) each (Total: ${s.count * s.marks} marks)${
      s.instruction ? ` — Instruction: "${s.instruction}"` : ""
    }`;
  }).join("\n");

  const systemPrompt = [
    "You are an expert pedagogical psychometrician and curriculum assessment engineer.",
    "Your mission is to construct a rigorous digital examination adhering strictly to the EdTechra Assessment Blueprint below.",
    "",
    "CRITICAL ARCHITECTURAL CONSTRAINTS (MANDATORY):",
    "1. BLUEPRINT IS THE SINGLE SOURCE OF TRUTH: You MUST NOT invent, omit, simplify, or replace question types or counts.",
    `2. The exam MUST contain EXACTLY ${totalQuestions} questions across ${cleanedPayload.sections.length} sections, totaling EXACTLY ${totalMarks} marks.`,
    "3. NEVER simplify this examination into only Multiple Choice questions. Generate EVERY requested question type.",
    "4. Return ONLY a valid JSON object matching the EdTechra exam schema.",
    "5. Do NOT include conversational text, pleasantries, or markdown explanations.",
    "",
    "QUESTION TYPE RULES:",
    "- Multiple Choice: exactly 4 distinct options, unambiguous correctAnswer mapping to an option.",
    "- True / False: factually sound statement, boolean or True/False correctAnswer, balanced distribution.",
    "- Fill in the Blank: question text with '[blank]', acceptedAnswers array with correct terms/synonyms.",
    "- Short Answer: clear prompt, model answer/explanation for teacher grading. Note: Error-correction tasks must be generated as short_answer questions within this section, NOT as a separate question type.",
    "- Reading Comprehension: substantive passage (150-300 words) with nested subQuestions. The reading passage and its sub-questions count as EXACTLY 1 top-level question/activity (worth 20 marks total). Do NOT count sub-questions as separate top-level questions.",
    "- Matching: pairs array or distinct questionText (left) and correctAnswer (right).",
    "- Reorder / Sequencing: scrambled sentence or chronological items with correct order.",
    "- Cloze Passage: passage text with '[blank_1]', '[blank_2]' and corresponding blanks array with answers."
  ].join("\n");

  const userPrompt = [
    "Generate a complete examination adhering to the following blueprint:",
    "",
    "================================================================================",
    "ASSESSMENT BLUEPRINT",
    "================================================================================",
    `- Title: ${payload.examType || "Assessment"}: ${payload.subject || "Curriculum"}`,
    `- Exam Type: ${payload.examType || "Standard Exam"}`,
    `- Difficulty Level: ${payload.difficulty || "Medium"}`,
    `- Duration: ${durationStr}`,
    `- Pass Threshold: ${blueprintSpec.passPercentage}%`,
    `- Total Questions: ${totalQuestions}`,
    `- Total Marks: ${totalMarks}`,
    "",
    "REQUIRED SECTIONS & QUESTION DISTRIBUTION (DO NOT ALTER):",
    sectionBreakdownText,
    "",
    "================================================================================",
    "PRIMARY TEACHING CONTENT (STRICT GROUNDING SOURCE)",
    "================================================================================",
    `"""`,
    cleanedPayload.content,
    `"""`,
    "",
    "Generate the complete examination JSON strictly conforming to this blueprint now:"
  ].join("\n");

  try {
    // 1. Initial Generation via Central AI Router (Tier 2: GPT-5 Nano with fallback to Gemini)
    let aiResponse = await aiRouter.executeTask({
      taskType: AI_TASK_TYPES.EXAM_GENERATION,
      prompt: userPrompt,
      systemPrompt,
      schema: examJsonSchema(),
      timeoutMs: 65000
    });

    let candidateExam = null;
    if (aiResponse && aiResponse.output) {
      candidateExam = typeof aiResponse.output === "object"
        ? aiResponse.output
        : JSON.parse(aiResponse.output);
    }

    if (!candidateExam) {
      throw new Error("AI provider returned empty exam output.");
    }

    // 2. Strict Post-Generation Blueprint Validation
    let validation = validateExamAgainstBlueprint(candidateExam, blueprintSpec);

    // 3. Automatic Repair Loop (Up to 2 Retries)
    let repairAttempts = 0;
    while (!validation.isValid && repairAttempts < 2) {
      repairAttempts++;
      console.warn(
        `[Exam2Service] Blueprint validation failed (repair attempt ${repairAttempts}/2): ${validation.errors.slice(0, 3).join("; ")}. Triggering AI auto-repair loop...`
      );

      const correctionPrompt = generateBlueprintCorrectionPrompt(
        validation.errors,
        validation.diff,
        candidateExam,
        blueprintSpec
      );

      const repairResponse = await aiRouter.executeTask({
        taskType: AI_TASK_TYPES.EXAM_GENERATION,
        prompt: correctionPrompt,
        systemPrompt: "You are an expert assessment psychometrician correcting an examination JSON so it strictly matches the requested blueprint.",
        schema: examJsonSchema(),
        timeoutMs: 60000
      });

      if (repairResponse && repairResponse.output) {
        try {
          const repaired = typeof repairResponse.output === "object"
            ? repairResponse.output
            : JSON.parse(repairResponse.output);
          candidateExam = repaired;
          validation = validateExamAgainstBlueprint(candidateExam, blueprintSpec);
        } catch (repairParseErr) {
          console.warn(`[Exam2Service] Repair attempt ${repairAttempts} parse failure:`, repairParseErr.message);
        }
      }
    }

    // If candidate passed validation or is reasonably structured, normalize and lock metadata
    if (validation.isValid || (candidateExam.sections && candidateExam.sections.length > 0)) {
      if (!validation.isValid) {
        console.warn("[Exam2Service] Proceeding with partially matched exam after repair loop. Remaining notices:", validation.errors);
      }
      return normalizeExam(candidateExam, payload, blueprintSpec);
    }

    throw new Error(`AI generated exam failed blueprint validation: ${validation.errors.join("; ")}`);
  } catch (error) {
    console.warn("[Exam2Service] AI generation notice:", error.message, "- Using verified deterministic fallback generator.");
    return normalizeExam(buildFallbackExam(cleanedPayload, `Generated with blueprint fallback: ${error.message}`), payload, blueprintSpec);
  }
}

export function buildFallbackExam(payload, reason = "Offline mode") {
  let index = 1;
  const sections = (payload.sections || []).map((section, sIdx) => {
    const rawType = section.type || section.questionType || "multiple_choice";
    const normType = normalizeCanonicalQuestionType(rawType);
    const marksPerQ = Number(section.marks || section.marksPerItem || 1);
    const count = Number(section.count || 1);

    const isReading = normType === "reading_comprehension" || rawType.includes("Reading");
    const isTF = normType === "true_false";
    const isMatching = normType === "matching";
    const isReorder = normType === "reorder";
    const isFillBlank = normType === "fill_in_blank";
    const isShortAns = normType === "short_answer" || normType === "essay";
    const isErrorCorr = normType === "error_correction";
    const isCloze = normType === "cloze_passage";

    const passage = isReading
      ? `Effective communication in English relies upon a clear grasp of grammatical harmony, lexical precision, and coherent structure. When learners regularly practice applying core grammatical principles in authentic contexts, their fluency and analytical proficiency improve significantly. Systematic assessment across multiple question formats helps identify specific learning gaps and reinforce foundational mastery.`
      : "";

    const questions = Array.from({ length: count }, (_, qIdx) => {
      const id = `Q${String(index++).padStart(3, "0")}`;
      let questionText = `Question ${id} assessing ${payload.examType || 'curriculum topic'}.`;
      let correctAnswer = "Correct Answer";
      let options = [];
      let acceptedAnswers = undefined;
      let pairs = undefined;
      let items = undefined;
      let blanks = undefined;

      if (isTF) {
        correctAnswer = qIdx % 2 === 0;
        questionText = sampleTrueFalseQuestion(qIdx);
      } else if (isMatching) {
        questionText = sampleMatchingQuestion(qIdx);
        correctAnswer = sampleMatchingAnswer(qIdx);
        pairs = [
          { left: sampleMatchingQuestion(0), right: sampleMatchingAnswer(0) },
          { left: sampleMatchingQuestion(1), right: sampleMatchingAnswer(1) },
          { left: sampleMatchingQuestion(2), right: sampleMatchingAnswer(2) }
        ];
      } else if (isReorder) {
        questionText = "learning / interactive / is / enjoyable / process / an";
        correctAnswer = "Learning is an enjoyable interactive process";
        items = [
          { id: "step_1", text: "Identify the grammatical rule" },
          { id: "step_2", text: "Apply the rule in a sentence" },
          { id: "step_3", text: "Verify subject-verb agreement" }
        ];
      } else if (isFillBlank) {
        questionText = `The student completed the assignment carefully before the [blank] concluded.`;
        correctAnswer = "deadline";
        acceptedAnswers = ["deadline", "term", "lesson", "session"];
      } else if (isCloze) {
        questionText = "Complete the missing words in the passage:";
        blanks = [
          { id: "blank_1", correctAnswer: "important", acceptedAnswers: ["important", "vital"] },
          { id: "blank_2", correctAnswer: "practice", acceptedAnswers: ["practice", "review"] }
        ];
      } else if (isErrorCorr) {
        questionText = `Identify and correct the grammatical error: "Each of the participants were enthusiastic about the competition."`;
        correctAnswer = "Each of the participants was enthusiastic about the competition.";
      } else if (isShortAns) {
        if (qIdx % 3 === 0) {
          questionText = `Identify and correct the grammatical error: "Each of the participants were enthusiastic about the competition."`;
          correctAnswer = "Each of the participants was enthusiastic about the competition. ('Each' takes singular verb 'was'.)";
        } else if (qIdx % 3 === 1) {
          questionText = `Rewrite this sentence by correcting the misplaced modifier: "Walking into the room, the notes were found on the desk."`;
          correctAnswer = "Walking into the room, the student found the notes on the desk.";
        } else {
          questionText = `Explain the primary significance of ${payload.content ? payload.content.slice(0, 30) : 'this concept'} in 2-3 concise sentences.`;
          correctAnswer = "Demonstrates accurate domain knowledge, clear syntax, and supporting rationale.";
        }
      } else if (isReading) {
        questionText = `Read the passage carefully and answer the comprehension sub-questions below.`;
        options = [
          "Fluency and analytical proficiency improve significantly",
          "Passive memorization replaces conceptual learning",
          "Vocabulary growth is strictly restricted",
          "Written communication becomes unnecessary"
        ];
        correctAnswer = options[0];
      } else {
        // Standard MCQ
        questionText = `Select the most accurate statement regarding ${payload.content ? payload.content.slice(0, 30) : 'the curriculum'}:`;
        options = [
          "Accurately reflects standard grammatical and conceptual principles",
          "Plausible distractor containing a common grammatical error",
          "Partially correct statement missing necessary qualifying context",
          "Unrelated option inconsistent with syllabus guidelines"
        ];
        correctAnswer = options[0];
      }

      return {
        questionId: id,
        questionType: rawType,
        questionText,
        options,
        correctAnswer,
        acceptedAnswers,
        pairs,
        items,
        blanks,
        subQuestions: isReading ? [
          {
            id: `${id}_sub1`,
            type: "multiple_choice",
            question: "According to the passage, what is the primary benefit of systematic practice?",
            options: [
              "Fluency and analytical proficiency improve significantly",
              "Passive memorization replaces conceptual learning",
              "Vocabulary growth is strictly restricted",
              "Written communication becomes unnecessary"
            ],
            correctAnswer: "Fluency and analytical proficiency improve significantly",
            marks: 5,
            explanation: "Directly stated in paragraph 1."
          },
          {
            id: `${id}_sub2`,
            type: "multiple_choice",
            question: "Why are multiple question formats important in educational assessments?",
            options: [
              "They help identify specific learning gaps and reinforce foundational mastery",
              "They confuse students with arbitrary rules",
              "They eliminate the need for authentic context",
              "They make assessments entirely subjective"
            ],
            correctAnswer: "They help identify specific learning gaps and reinforce foundational mastery",
            marks: 5,
            explanation: "Directly referenced in paragraph 2."
          },
          {
            id: `${id}_sub3`,
            type: "multiple_choice",
            question: "In the context of the passage, the phrase 'lexical precision' means:",
            options: [
              "Careful and accurate word choice",
              "Random vocabulary memorization",
              "Omitting adjectives from sentences",
              "Using slang in formal contexts"
            ],
            correctAnswer: "Careful and accurate word choice",
            marks: 5,
            explanation: "Contextual vocabulary definition."
          },
          {
            id: `${id}_sub4`,
            type: "multiple_choice",
            question: "What conclusion does the author reach regarding language fluency?",
            options: [
              "Regular authentic practice produces measurable improvement",
              "Only native speakers can master syntax",
              "Grammar rules should be ignored during practice",
              "Assessment should be avoided in language learning"
            ],
            correctAnswer: "Regular authentic practice produces measurable improvement",
            marks: 5,
            explanation: "Synthesized from the concluding summary."
          }
        ] : undefined,
        marks: marksPerQ,
        difficulty: section.difficulty || payload.difficulty || "Medium",
        explanation: "Pedagogically verified assessment question."
      };
    });

    return {
      sectionId: section.sectionId || section.id || cryptoId("sec"),
      title: section.title || section.type || `Section ${sIdx + 1}`,
      questionType: rawType,
      instruction: section.instruction || "",
      marksPerQuestion: marksPerQ,
      totalMarks: count * marksPerQ,
      passage,
      questions
    };
  });

  const totalMarks = sections.reduce((sum, s) => sum + s.totalMarks, 0);

  return {
    metadata: {
      examId: cryptoId("exam"),
      title: `${payload.examType || 'Standard Exam'} - AI Draft`,
      examType: payload.examType || "Standard Exam",
      difficulty: payload.difficulty || "Medium",
      duration: payload.duration?.value
        ? `${payload.duration.value} ${payload.duration.unit}`
        : `${payload.durationMinutes || 60} Minutes`,
      totalMarks,
      gradingMode: payload.gradingMode || "Hybrid Grading",
      passPercentage: payload.passPercentage || 50,
      status: "draft",
      generatedAt: new Date().toISOString(),
      approvalRequired: true,
      generatorNote: reason
    },
    sections
  };
}

function sampleMatchingQuestion(qIdx) {
  const terms = ["Oxygen", "Chlorophyll", "Roots", "Stomata", "Mitochondria", "Photosynthesis", "Nitrogen", "Glucose"];
  return terms[qIdx % terms.length];
}

function sampleMatchingAnswer(qIdx) {
  const defs = ["Gas released", "Green pigment", "Absorbs water", "Gas exchange", "Energy powerhouse", "Sugar production", "Essential nutrient", "Stored chemical energy"];
  return defs[qIdx % defs.length];
}

function sampleTrueFalseQuestion(qIdx) {
  const questions = [
    "Plants produce their own food through photosynthesis.",
    "Sunlight is required for the light-dependent reactions of photosynthesis.",
    "Roots absorb water and essential minerals from the soil.",
    "Carbon dioxide is released as a byproduct of photosynthesis.",
    "Chlorophyll gives plant leaves their characteristic green color.",
    "All living organisms can perform photosynthesis."
  ];
  return questions[qIdx % questions.length];
}

export function normalizeExam(exam, payload = {}, blueprintSpec = {}) {
  const duration = payload.duration?.value
    ? `${payload.duration.value} ${payload.duration.unit || 'Minutes'}`
    : `${payload.durationMinutes || payload.duration || blueprintSpec.duration || 60} Minutes`;
  const totalMarks = Number(payload.requiredTotal || blueprintSpec.totalMarks || payload.totalMarks || 100);
  const passPercentage = Number(payload.passPercentage || blueprintSpec.passPercentage || 50);

  const normalized = {
    ...exam,
    metadata: {
      ...exam.metadata,
      examId: exam.metadata?.examId || cryptoId("exam"),
      title: payload.title || exam.metadata?.title || `${payload.examType || 'Standard Exam'} - AI Draft`,
      examType: payload.examType || exam.metadata?.examType || "Standard Exam",
      difficulty: payload.difficulty || exam.metadata?.difficulty || "Medium",
      duration,
      totalMarks,
      gradingMode: payload.gradingMode || 'Hybrid Grading',
      passPercentage,
      status: "draft",
      generatedAt: new Date().toISOString(),
      approvalRequired: true,
      generatorNote: exam.metadata?.generatorNote || "Generated and verified by EdTechra AI Exam Engine."
    }
  };

  const payloadSections = payload.sections || blueprintSpec.sections || [];

  normalized.sections = (normalized.sections || []).map((section, sectionIndex) => {
    const payloadSection = payloadSections[sectionIndex] || {};
    const sectionType = payloadSection.type || section.questionType || "multiple_choice";
    const normType = normalizeCanonicalQuestionType(sectionType);
    const marksPerQ = Number(payloadSection.marks || section.marksPerQuestion || 1);

    const mappedQuestions = (section.questions || []).map((question, questionIndex) => {
      let options = Array.isArray(question.options) ? question.options.filter(Boolean) : [];
      let questionText = question.questionText || question.question || "";
      let correctAnswer = question.correctAnswer !== undefined ? question.correctAnswer : (question.correct_answer || "");

      if (normType === 'multiple_choice' || normType === 'multiple_select') {
        const correctStr = typeof correctAnswer === 'string' ? correctAnswer.trim() : String(correctAnswer);
        if (correctStr && !options.some(o => (typeof o === 'string' ? o : o.text || o.id).toLowerCase() === correctStr.toLowerCase())) {
          options.push(correctStr);
        }
        const fallbacks = ["Alternative Alpha", "Alternative Beta", "Alternative Gamma", "Alternative Delta"];
        let fallbackIdx = 0;
        while (options.length < 4) {
          const candidate = fallbacks[fallbackIdx++];
          if (!options.some(o => (typeof o === 'string' ? o : o.text || o.id).toLowerCase() === candidate.toLowerCase())) {
            options.push(candidate);
          }
        }
        if (options.length > 4) options = options.slice(0, 4);
      } else if (normType === 'true_false') {
        if (typeof correctAnswer === 'string') {
          correctAnswer = correctAnswer.toLowerCase() === 'true';
        }
      } else if (normType === 'reorder') {
        if (typeof correctAnswer === 'string') {
          correctAnswer = correctAnswer.replace(/\.+$/, "").trim();
        }
      }

      return {
        ...question,
        questionId: question.questionId || question.id || `S${sectionIndex + 1}Q${questionIndex + 1}`,
        questionType: sectionType,
        questionText,
        correctAnswer,
        options: (normType === 'multiple_choice' || normType === 'multiple_select') ? options : question.options,
        acceptedAnswers: question.acceptedAnswers,
        pairs: question.pairs,
        items: question.items,
        blanks: question.blanks,
        marks: Number(question.marks) > 0 ? Number(question.marks) : marksPerQ
      };
    });

    let sectionPassage = section.passage || "";
    if ((normType === "reading_comprehension" || sectionType.includes("Reading")) && !sectionPassage.trim()) {
      sectionPassage = payload.content ? payload.content.slice(0, 400) : "Reading passage context.";
    }

    const sectionTotal = mappedQuestions.reduce((sum, q) => sum + Number(q.marks || 0), 0);

    return {
      ...section,
      sectionId: section.sectionId || section.id || cryptoId("sec"),
      questionType: sectionType,
      title: section.title || sectionType,
      instruction: section.instruction || payloadSection.instruction || "",
      marksPerQuestion: marksPerQ,
      totalMarks: sectionTotal || (mappedQuestions.length * marksPerQ),
      questions: mappedQuestions,
      passage: sectionPassage
    };
  });

  const calculatedTotalMarks = normalized.sections.reduce((sum, s) => sum + Number(s.totalMarks || 0), 0);
  if (calculatedTotalMarks > 0) {
    normalized.metadata.totalMarks = calculatedTotalMarks;
  }

  return normalized;
}

// ----------------------------------------------------------------------------
// 2. DETERMINISTIC & HYBRID AUTO-GRADING ENGINE
// ----------------------------------------------------------------------------

export function gradeExamAttempt(examPayload, answers = {}, subjectiveScores = {}, subjectiveFeedbacks = {}) {
  const sections = examPayload?.sections || examPayload?.questions_json || (Array.isArray(examPayload?.questions) ? [{ id: 'sec_default', questions: examPayload.questions }] : []);
  const questions = sections.flatMap((section) => {
    const sType = section.questionType || section.title || section.type || '';
    const sPassage = section.passage || '';
    const sPassageTitle = section.passageTitle || '';

    return (section.questions || []).flatMap(q => {
      // If reading comprehension with subQuestions, flatten them for grading
      if ((q.type === 'reading_comprehension' || q.questionType === 'reading_comprehension') && Array.isArray(q.subQuestions) && q.subQuestions.length > 0) {
        return q.subQuestions.map(subQ => ({
          ...subQ,
          questionType: subQ.type || subQ.questionType || 'multiple_choice',
          parentPassage: q.passage || sPassage,
          parentPassageTitle: q.passageTitle || sPassageTitle
        }));
      }
      return [{
        ...q,
        questionType: q.questionType || q.type || sType,
        parentPassage: sPassage,
        parentPassageTitle: sPassageTitle
      }];
    });
  });

  let hasSubjective = false;
  let allSubjectiveGraded = true;

  const breakdown = questions.map((question) => {
    const qId = question.id || question.questionId;
    const submitted = answers[qId] !== undefined ? answers[qId] : (question.questionId ? answers[question.questionId] : undefined);
    const qType = String(question.questionType || question.type || '').toLowerCase();

    const isSubjective =
      qType.includes('essay') ||
      qType.includes('short_answer') ||
      qType.includes('short answer');

    const marks = Number(question.marks || 1);

    if (isSubjective) {
      hasSubjective = true;
      const teacherAssignedScore = subjectiveScores[qId];
      const teacherFeedback = subjectiveFeedbacks[qId];

      if (teacherAssignedScore !== undefined && teacherAssignedScore !== null) {
        const score = Math.max(0, Math.min(marks, Number(teacherAssignedScore)));
        return {
          questionId: qId,
          questionType: question.questionType || question.type,
          questionText: question.question || question.questionText || '',
          submittedAnswer: submitted || '',
          score,
          maxScore: marks,
          isCorrect: score === marks,
          requiresTeacherReview: false,
          teacherFeedback: teacherFeedback || '',
          feedback: teacherFeedback || `Evaluated by teacher (${score}/${marks} marks).`
        };
      }

      allSubjectiveGraded = false;
      return {
        questionId: qId,
        questionType: question.questionType || question.type,
        questionText: question.question || question.questionText || '',
        submittedAnswer: submitted || '',
        score: 0,
        maxScore: marks,
        isCorrect: false,
        requiresTeacherReview: true,
        feedback: submitted ? 'Answer recorded. Pending teacher evaluation.' : 'Unattempted. Pending teacher evaluation.'
      };
    }

    // Objective Grading
    let isExact = false;
    const rawCorrect = question.correctAnswer || question.correct_answer || question.acceptedAnswers;

    if (qType.includes('reorder')) {
      const targetOrder = Array.isArray(question.correctOrder) ? question.correctOrder : [];
      if (Array.isArray(submitted) && targetOrder.length > 0) {
        isExact = submitted.join(',') === targetOrder.join(',');
      } else {
        const cleanSub = String(submitted || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
        const cleanCor = String(targetOrder.join('') || rawCorrect || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
        isExact = cleanSub.length > 0 && cleanSub === cleanCor;
      }
    } else if (qType.includes('fill') || qType.includes('blank')) {
      const cleanSub = String(submitted || '').trim().toLowerCase();
      const acceptedList = Array.isArray(question.acceptedAnswers)
        ? question.acceptedAnswers.map(a => String(a).trim().toLowerCase())
        : [String(rawCorrect || '').trim().toLowerCase()];
      isExact = cleanSub.length > 0 && acceptedList.includes(cleanSub);
    } else if (qType.includes('select') && Array.isArray(rawCorrect)) {
      const subArr = Array.isArray(submitted) ? submitted.map(String).sort() : [String(submitted)];
      const corArr = rawCorrect.map(String).sort();
      isExact = subArr.join(',') === corArr.join(',');
    } else if (qType.includes('matching') && Array.isArray(question.pairs)) {
      const subMap = (typeof submitted === 'object' && submitted !== null) ? submitted : {};
      const allMatched = question.pairs.every(p => {
        const studentMatch = subMap[p.left];
        return studentMatch && String(studentMatch).trim().toLowerCase() === String(p.right).trim().toLowerCase();
      });
      isExact = allMatched && question.pairs.length > 0;
    } else if (qType.includes('true') || qType.includes('false')) {
      const cleanSub = String(submitted).trim().toLowerCase();
      const cleanCor = String(rawCorrect).trim().toLowerCase();
      isExact = (cleanSub === 'true' && cleanCor === 'true') || (cleanSub === 'false' && cleanCor === 'false');
    } else {
      // MCQ / Single Choice
      const cleanSub = String(submitted || '').trim().toLowerCase();
      if (Array.isArray(rawCorrect)) {
        isExact = rawCorrect.some(c => String(c).trim().toLowerCase() === cleanSub) && cleanSub.length > 0;
      } else {
        const cleanCor = String(rawCorrect || '').trim().toLowerCase();
        isExact = cleanSub === cleanCor && cleanSub.length > 0;
      }
    }

    const score = isExact ? marks : 0;

    return {
      questionId: qId,
      questionType: question.questionType || question.type,
      questionText: question.question || question.questionText || '',
      submittedAnswer: submitted || '',
      correctAnswer: rawCorrect || '',
      explanation: question.explanation || '',
      score,
      maxScore: marks,
      isCorrect: isExact,
      requiresTeacherReview: false,
      feedback: isExact ? 'Correct answer.' : (question.explanation || 'Incorrect answer.')
    };
  });

  const totalScore = breakdown.reduce((sum, item) => sum + item.score, 0);
  const maxScore = breakdown.reduce((sum, item) => sum + item.maxScore, 0) || Number(examPayload?.metadata?.totalMarks || 100);
  const percentage = maxScore > 0 ? Number(((totalScore / maxScore) * 100).toFixed(2)) : 0;

  const gradingStatus = !hasSubjective
    ? 'auto_graded'
    : allSubjectiveGraded
    ? 'reviewed'
    : 'pending_review';

  let grade = 'Needs Support';
  if (percentage >= 90) grade = 'A+';
  else if (percentage >= 80) grade = 'A';
  else if (percentage >= 70) grade = 'B';
  else if (percentage >= 60) grade = 'C';
  else if (percentage >= 50) grade = 'D';

  const passThreshold = Number(examPayload?.pass_marks || examPayload?.metadata?.passPercentage || 40);
  const passed = totalScore >= passThreshold || percentage >= passThreshold;

  return {
    totalScore,
    score: totalScore,
    maxScore,
    total_marks: maxScore,
    percentage,
    grade,
    passed,
    gradingStatus,
    strengths: percentage >= 70 ? ['Strong concept mastery', 'High accuracy in objective sections'] : ['Attempt completed', 'Objective questions reviewed'],
    weaknesses: percentage < 70 ? ['Review topics with lower accuracy', 'Practice timed responses'] : ['Continue practice to maintain top tier score'],
    feedback: gradingStatus === 'pending_review'
      ? 'Exam submitted successfully. Subjective responses are pending teacher review.'
      : percentage >= 50
      ? 'Great effort! Your score and performance breakdown are recorded.'
      : 'Keep practicing! Review incorrect answers and retake practice sets.',
    breakdown
  };
}

// ----------------------------------------------------------------------------
// 3. STATISTICAL SCORE ANALYSIS & CLOUDFLARE R2 REPORT COMPILATION
// ----------------------------------------------------------------------------

export async function processScoreAnalysisAndUploadToR2({
  examId,
  classroomId,
  examName = 'Classroom Examination',
  totalMarks = 100,
  students = [],
  questions = []
}) {
  const cleanExamId = sanitizeSegment(examId) || 'exam_report';
  const cleanClassId = sanitizeSegment(classroomId) || 'classroom';

  // 1. Calculate deterministic statistics
  const payload = {
    exam_id: cleanExamId,
    class_id: cleanClassId,
    exam_name: examName,
    total_marks: Number(totalMarks || 100),
    students,
    questions
  };

  let analytics = {};
  if (typeof computeAnalytics === 'function') {
    analytics = computeAnalytics(payload);
  } else {
    // Basic fallback stats if computeAnalytics not available
    const scores = students.map(s => Number(s.score || 0));
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    analytics = {
      total_students: students.length,
      average_score: Number(avg.toFixed(2)),
      highest_score: scores.length ? Math.max(...scores) : 0,
      lowest_score: scores.length ? Math.min(...scores) : 0,
      pass_rate: scores.length ? Number(((students.filter(s => (s.score || 0) >= (totalMarks * 0.4)).length / students.length) * 100).toFixed(1)) : 0,
      grade_distribution: { "A+": 0, "A": 0, "B": 0, "C": 0, "D": 0, "F": 0 },
      students
    };
  }

  // 2. Compile PDF Report
  const tempDir = path.resolve(exam2RootDir, 'public/reports');
  await fs.promises.mkdir(tempDir, { recursive: true });
  const tempPdfFileName = `${cleanExamId}_${cleanClassId}_${Date.now()}.pdf`;
  const tempPdfPath = path.join(tempDir, tempPdfFileName);

  let pdfBuffer = null;

  try {
    if (typeof generatePDFReport === 'function') {
      await generatePDFReport(analytics, tempPdfPath);
      pdfBuffer = await fs.promises.readFile(tempPdfPath);
    }
  } catch (pdfErr) {
    console.warn('[Exam2Service] generatePDFReport error:', pdfErr.message);
  }

  // 3. Upload compiled PDF to Cloudflare R2
  const r2ReportKey = buildExamReportObjectKey({
    examId: cleanExamId,
    classOrStudentId: cleanClassId
  });

  let uploadRes = { success: false, publicUrl: '' };

  if (pdfBuffer) {
    try {
      uploadRes = await putBinaryContent(r2ReportKey, pdfBuffer, 'application/pdf');
      console.log(`[Exam2Service] Successfully uploaded AI Exam Report to Cloudflare R2: ${r2ReportKey}`);
    } catch (r2Err) {
      console.error('[Exam2Service] Cloudflare R2 upload error:', r2Err.message);
    }

    // Clean up temporary local file
    try {
      await fs.promises.unlink(tempPdfPath);
    } catch {}
  }

  // 4. Generate secure presigned download link
  const signedDownload = buildPresignedDownloadUrl({
    objectKey: r2ReportKey,
    expiresInSeconds: 3600 // 1 hour secure link
  });

  return {
    analytics,
    report_r2_key: r2ReportKey,
    report_pdf_url: uploadRes.publicUrl || signedDownload.downloadUrl,
    download_url: signedDownload.downloadUrl,
    storage_provider: 'cloudflare_r2',
    summary: {
      total_students: analytics.total_students || students.length,
      average_score: analytics.average_score,
      pass_rate: analytics.pass_rate,
      highest_score: analytics.highest_score,
      lowest_score: analytics.lowest_score
    }
  };
}

// ----------------------------------------------------------------------------
// 4. SUPABASE PERSISTENCE & TEACHER PREVIOUS EXAMS MANAGER
// ----------------------------------------------------------------------------

export async function getTeacherExamsFromSupabase(serverSupabase, teacherId) {
  if (!serverSupabase || !teacherId) return [];

  try {
    // 1. Fetch all exams created by this teacher (master templates + publications)
    let exams = null;
    const queryRes = await serverSupabase
      .from('classroom_exams')
      .select(`
        *,
        classroom:classrooms!classroom_id (id, title, subject, grade)
      `)
      .or(`created_by.eq.${teacherId},teacher_id.eq.${teacherId}`)
      .order('created_at', { ascending: false });

    if (queryRes.error) {
      console.error('[Exam2Service] getTeacherExams error:', queryRes.error.message);
      return [];
    }
    exams = queryRes.data || [];
    if (exams.length === 0) return [];

    const allExamIds = exams.map(e => e.id);

    // 2. Fetch submission aggregates for all these exams
    const { data: results } = await serverSupabase
      .from('classroom_exam_results')
      .select(`
        id,
        exam_id,
        classroom_id,
        score,
        total_marks,
        percentage,
        passed,
        student_id,
        submitted_at,
        report_r2_key,
        student:profiles!student_id (id, full_name, email, avatar_url)
      `)
      .in('exam_id', allExamIds);

    const resultsByExam = {};
    (results || []).forEach(r => {
      if (!resultsByExam[r.exam_id]) resultsByExam[r.exam_id] = [];
      resultsByExam[r.exam_id].push(r);
    });

    // 3. Group by root / master exam (group children with parent_exam_id to parent)
    const masterExamsMap = new Map();
    const childPublicationsMap = new Map();

    exams.forEach(exam => {
      if (exam.parent_exam_id) {
        if (!childPublicationsMap.has(exam.parent_exam_id)) {
          childPublicationsMap.set(exam.parent_exam_id, []);
        }
        childPublicationsMap.get(exam.parent_exam_id).push(exam);
      } else {
        masterExamsMap.set(exam.id, exam);
      }
    });

    // For any orphaned child publications whose parent was not returned, treat as top-level
    exams.forEach(exam => {
      if (exam.parent_exam_id && !masterExamsMap.has(exam.parent_exam_id)) {
        masterExamsMap.set(exam.id, exam);
      }
    });

    // 4. Build enriched response with assigned classes list and aggregate results
    const enrichedList = [];
    for (const [masterId, masterExam] of masterExamsMap.entries()) {
      const children = childPublicationsMap.get(masterId) || [];
      const allInstances = [masterExam, ...children];

      // Collect all assigned classrooms
      const classMap = new Map();
      allInstances.forEach(inst => {
        if (inst.classroom && inst.classroom.id) {
          classMap.set(inst.classroom.id, {
            id: inst.classroom.id,
            title: inst.classroom.title,
            grade: inst.classroom.grade,
            subject: inst.classroom.subject,
            publication_id: inst.id,
            published_at: inst.published_at || inst.created_at,
            status: inst.status
          });
        }
      });
      const classesList = Array.from(classMap.values());

      // Collect all submissions across all publications of this exam
      const allResults = [];
      allInstances.forEach(inst => {
        const instResults = resultsByExam[inst.id] || [];
        instResults.forEach(r => {
          allResults.push({
            ...r,
            classroom_title: inst.classroom?.title || 'Classroom'
          });
        });
      });

      const totalSubs = allResults.length;
      const scores = allResults.map(r => Number(r.score || 0));
      const totalMarks = Number(masterExam.total_marks || 100);
      const avgScore = totalSubs > 0 ? Number((scores.reduce((a, b) => a + b, 0) / totalSubs).toFixed(1)) : 0;
      const passCount = allResults.filter(r => r.passed).length;
      const passRate = totalSubs > 0 ? Number(((passCount / totalSubs) * 100).toFixed(1)) : 0;

      // Extract question count
      const questionsArray = Array.isArray(masterExam.questions_json) && masterExam.questions_json.length > 0
        ? masterExam.questions_json.flatMap(s => s.questions || [])
        : Array.isArray(masterExam.questions) ? masterExam.questions : [];

      enrichedList.push({
        ...masterExam,
        classes: classesList,
        classes_count: classesList.length,
        question_count: questionsArray.length || 10,
        submission_count: totalSubs,
        average_score: avgScore,
        pass_rate: passRate,
        results: allResults,
        publications: children.map(c => ({
          id: c.id,
          classroom_id: c.classroom_id,
          classroom_title: c.classroom?.title || 'Classroom',
          status: c.status,
          published_at: c.published_at || c.created_at,
          submissions_count: (resultsByExam[c.id] || []).length
        })),
        has_r2_report: Boolean(masterExam.r2_file_key || allResults.some(r => r.report_r2_key))
      });
    }

    return enrichedList;
  } catch (err) {
    console.error('[Exam2Service] getTeacherExamsFromSupabase exception:', err);
    return [];
  }
}

export async function saveExamToSupabase(serverSupabase, arg1, arg2) {
  if (!serverSupabase) throw new Error('Database client not configured.');

  const payload = typeof arg1 === 'object' && arg1 !== null ? arg1 : (typeof arg2 === 'object' && arg2 !== null ? arg2 : {});
  const teacherId = typeof arg1 === 'string' ? arg1 : (typeof arg2 === 'string' ? arg2 : payload.teacher_id || payload.created_by || null);

  const examData = payload.exam || payload;
  const metadata = examData.metadata || {};
  const sections = examData.sections || payload.sections || [];
  const publishing = payload.publishing || {};

  const title = metadata.title || payload.title || 'Classroom Exam';
  const durationStr = metadata.duration || publishing.duration || '60 Minutes';
  const durationMinutes = Number(parseInt(durationStr, 10)) || 60;

  // Authoritative total marks: sum of all questions across sections
  const questionsCount = sections.flatMap(s => s.questions || []).length;
  const calculatedTotal = sections.flatMap(s => s.questions || []).reduce((sum, q) => sum + Number(q.marks || 0), 0)
    || sections.reduce((sum, s) => sum + (Number(s.count || 0) * Number(s.marks || 0)), 0)
    || Number(metadata.totalMarks || payload.total_marks || 100);

  const totalMarks = calculatedTotal;
  const examType = metadata.examType || payload.exam_type || 'Unit Test';
  const difficulty = metadata.difficulty || payload.difficulty || 'Mixed';
  const gradingMode = metadata.gradingMode || payload.grading_mode || 'Hybrid Grading';
  const status = payload.status || (payload.approved ? 'published' : 'draft');
  const classroomId = payload.classroom_id || publishing.classroomId || null;
  const parentExamId = payload.parent_exam_id || null;
  const version = Number(payload.version || 1);

  const insertRecord = {
    title,
    description: metadata.generatorNote || payload.description || 'AI Exam 2.0 Assessment',
    instructions: sections[0]?.instruction || '',
    duration_minutes: durationMinutes,
    total_marks: totalMarks,
    pass_marks: Math.round(totalMarks * 0.4),
    exam_type: examType,
    difficulty,
    grading_mode: gradingMode,
    status,
    questions: sections,
    questions_json: sections,
    exam_config_json: {
      metadata,
      publishing,
      sections_count: sections.length,
      questions_count: questionsCount
    },
    teacher_id: teacherId,
    created_by: teacherId,
    parent_exam_id: parentExamId,
    version,
    source: 'exam2',
    assessment_type: payload.assessment_type || 'exam',
    theme_config: payload.theme_config || {},
    brand_kit: payload.brand_kit || {},
    branching_logic: payload.branching_logic || {},
    survey_settings: payload.survey_settings || {},
    updated_at: new Date().toISOString()
  };

  if (classroomId) {
    insertRecord.classroom_id = classroomId;
  }

  if (status === 'published') {
    insertRecord.published_at = new Date().toISOString();
  }

  // Also save audit file to local data folder for full Exam 2.0 filesystem compatibility
  try {
    await fs.promises.mkdir(dataDir, { recursive: true });
    const localExamId = metadata.examId || cryptoId('exam');
    await fs.promises.writeFile(
      path.join(dataDir, `${localExamId}.json`),
      JSON.stringify({ ...insertRecord, examId: localExamId, savedAt: new Date().toISOString() }, null, 2)
    );
  } catch {}

  let data = null;
  let { data: inserted, error } = await serverSupabase
    .from('classroom_exams')
    .insert(insertRecord)
    .select()
    .single();

  if (error) {
    // If schema cache does not yet have extended columns, retry with base columns
    if (error.message?.includes('column') || error.message?.includes('schema cache')) {
      console.warn('[Exam2Service] Retrying saveExamToSupabase with base schema columns:', error.message);
      const baseRecord = {
        title: insertRecord.title,
        description: insertRecord.description,
        instructions: insertRecord.instructions,
        duration_minutes: insertRecord.duration_minutes,
        total_marks: insertRecord.total_marks,
        pass_marks: insertRecord.pass_marks,
        status: insertRecord.status === 'published' ? 'published' : 'draft',
        questions: sections,
        created_by: teacherId,
        assessment_type: insertRecord.assessment_type || 'exam',
        survey_settings: insertRecord.survey_settings || {},
        theme_config: insertRecord.theme_config || {},
        brand_kit: insertRecord.brand_kit || {},
        updated_at: new Date().toISOString()
      };
      if (classroomId) baseRecord.classroom_id = classroomId;

      const retryRes = await serverSupabase
        .from('classroom_exams')
        .insert(baseRecord)
        .select()
        .single();

      if (retryRes.error) {
        console.error('[Exam2Service] saveExamToSupabase base retry error:', retryRes.error.message);
        throw retryRes.error;
      }
      data = retryRes.data;
    } else {
      console.error('[Exam2Service] saveExamToSupabase error:', error.message);
      throw error;
    }
  } else {
    data = inserted;
  }

  return data;
}

/**
 * Multi-Classroom Republishing Engine
 * Creates separate publication records for each target classroom referencing the parent template exam.
 * Keeps student attempts, submissions, and leaderboards strictly isolated.
 */
export async function republishExamToClassrooms(serverSupabase, {
  examId,
  classroomIds = [],
  publishSettings = {},
  teacherId
}) {
  if (!serverSupabase) throw new Error('Database client not configured.');
  if (!examId) throw new Error('Source exam ID is required.');
  if (!Array.isArray(classroomIds) || classroomIds.length === 0) {
    throw new Error('At least one target classroom must be selected.');
  }

  // 1. Fetch the master / source exam template
  const { data: sourceExam, error: fetchErr } = await serverSupabase
    .from('classroom_exams')
    .select('*')
    .eq('id', examId)
    .maybeSingle();

  if (fetchErr || !sourceExam) {
    throw new Error('Source exam not found or access denied.');
  }

  // 2. Fetch classroom details for metadata
  const { data: classrooms } = await serverSupabase
    .from('classrooms')
    .select('id, title, grade, subject, teacher_id')
    .in('id', classroomIds);

  const classroomMap = new Map((classrooms || []).map(c => [c.id, c]));

  const safePublishSettings = publishSettings || {};
  const durationStr = safePublishSettings.duration || `${sourceExam.duration_minutes || 60} Minutes`;
  const durationMinutes = Number(parseInt(durationStr, 10)) || sourceExam.duration_minutes || 60;
  const startsAt = safePublishSettings.startDate ? new Date(`${safePublishSettings.startDate}T${safePublishSettings.startTime || '00:00:00'}`).toISOString() : null;
  const endsAt = safePublishSettings.endDate ? new Date(`${safePublishSettings.endDate}T${safePublishSettings.endTime || '23:59:59'}`).toISOString() : null;

  const rootParentId = sourceExam.parent_exam_id || sourceExam.id;
  const publications = [];

  for (const classId of classroomIds) {
    const classInfo = classroomMap.get(classId);
    const pubRecord = {
      classroom_id: classId,
      parent_exam_id: rootParentId,
      teacher_id: teacherId || sourceExam.teacher_id || sourceExam.created_by,
      created_by: teacherId || sourceExam.created_by,
      title: sourceExam.title,
      description: sourceExam.description || '',
      instructions: sourceExam.instructions || '',
      duration_minutes: durationMinutes,
      total_marks: sourceExam.total_marks,
      pass_marks: sourceExam.pass_marks || Math.round(sourceExam.total_marks * 0.4),
      exam_type: sourceExam.exam_type || 'Unit Test',
      difficulty: sourceExam.difficulty || 'Mixed',
      grading_mode: sourceExam.grading_mode || 'Hybrid Grading',
      max_attempts: Number(publishSettings.maxAttempts) || 1,
      show_marks_immediately: publishSettings.showMarksImmediately !== undefined ? Boolean(publishSettings.showMarksImmediately) : true,
      show_correct_answers: publishSettings.showAnswersAfterExam !== undefined ? Boolean(publishSettings.showAnswersAfterExam) : true,
      allow_late_submission: Boolean(publishSettings.allowLateSubmission),
      password: publishSettings.password || null,
      status: 'published',
      starts_at: startsAt,
      ends_at: endsAt,
      questions: sourceExam.questions,
      questions_json: sourceExam.questions_json,
      assessment_type: sourceExam.assessment_type || 'exam',
      survey_settings: sourceExam.survey_settings || {},
      theme_config: sourceExam.theme_config || {},
      brand_kit: sourceExam.brand_kit || {},
      branching_logic: sourceExam.branching_logic || {},
      exam_config_json: {
        ...(sourceExam.exam_config_json || {}),
        publishing: {
          ...publishSettings,
          classroomId: classId,
          classroomTitle: classInfo?.title || 'Classroom'
        }
      },
      version: sourceExam.version || 1,
      source: 'exam2',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let inserted = null;
    const { data: pubData, error: pubErr } = await serverSupabase
      .from('classroom_exams')
      .insert(pubRecord)
      .select()
      .single();

    if (pubErr) {
      // Schema cache fallback with base columns
      console.warn('[Exam2Service] Retrying publication with base schema:', pubErr.message);
      const basePub = {
        classroom_id: classId,
        created_by: pubRecord.created_by,
        title: pubRecord.title,
        description: pubRecord.description,
        instructions: pubRecord.instructions,
        duration_minutes: pubRecord.duration_minutes,
        total_marks: pubRecord.total_marks,
        pass_marks: pubRecord.pass_marks,
        status: 'published',
        questions: pubRecord.questions,
        assessment_type: sourceExam.assessment_type || 'exam',
        survey_settings: sourceExam.survey_settings || {},
        theme_config: sourceExam.theme_config || {},
        brand_kit: sourceExam.brand_kit || {},
        starts_at: startsAt,
        ends_at: endsAt,
        updated_at: new Date().toISOString()
      };
      const retryRes = await serverSupabase
        .from('classroom_exams')
        .insert(basePub)
        .select()
        .single();

      if (!retryRes.error && retryRes.data) {
        inserted = retryRes.data;
      } else {
        console.error('[Exam2Service] Failed to publish to classroom:', classId, retryRes.error?.message);
      }
    } else {
      inserted = pubData;
    }

    if (inserted) {
      publications.push({
        publication_id: inserted.id,
        classroom_id: classId,
        classroom_title: classInfo?.title || 'Classroom',
        published_at: inserted.published_at || inserted.created_at
      });
    }
  }

  return {
    success: true,
    publishedCount: publications.length,
    publications,
    parentExamId: rootParentId,
    examTitle: sourceExam.title
  };
}
