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
    additionalProperties: false,
    required: ["questionId", "questionType", "questionText", "options", "correctAnswer", "marks", "difficulty", "explanation"],
    properties: {
      questionId: { type: "string" },
      questionType: { type: "string" },
      questionText: { type: "string" },
      options: { type: "array", items: { type: "string" } },
      correctAnswer: { type: "string" },
      marks: { type: "number" },
      difficulty: { type: "string" },
      explanation: { type: "string" }
    }
  };
  return {
    type: "object",
    additionalProperties: false,
    required: ["metadata", "sections"],
    properties: {
      metadata: {
        type: "object",
        additionalProperties: false,
        required: ["examId", "title", "examType", "difficulty", "duration", "totalMarks", "gradingMode", "status", "generatedAt", "approvalRequired", "generatorNote"],
        properties: {
          examId: { type: "string" },
          title: { type: "string" },
          examType: { type: "string" },
          difficulty: { type: "string" },
          duration: { type: "string" },
          totalMarks: { type: "number" },
          gradingMode: { type: "string" },
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
          additionalProperties: false,
          required: ["sectionId", "title", "questionType", "instruction", "marksPerQuestion", "totalMarks", "questions", "passage"],
          properties: {
            sectionId: { type: "string" },
            title: { type: "string" },
            questionType: { type: "string" },
            instruction: { type: "string" },
            marksPerQuestion: { type: "number" },
            totalMarks: { type: "number" },
            questions: { type: "array", items: question },
            passage: { type: "string" }
          }
        }
      }
    }
  };
}

export function validateGenerationPayload(payload) {
  if (!payload.content || payload.content.trim().length < 3) return "Content is required.";
  if (!payload.examType) return "Exam type is required.";
  if (!payload.difficulty) return "Difficulty is required.";
  if (!payload.duration?.value || !payload.duration?.unit) return "Duration is required.";
  if (!Array.isArray(payload.sections) || payload.sections.length === 0) return "At least one question section is required.";
  const total = payload.sections.reduce((sum, section) => sum + section.count * section.marks, 0);
  if (total !== Number(payload.requiredTotal || 100)) return `Total marks must equal ${payload.requiredTotal || 100}.`;
  return "";
}

export async function generateExam({ payload, openaiApiKey, serverOpenAI }) {
  const apiKey = openaiApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey && !serverOpenAI) {
    return normalizeExam(buildFallbackExam(payload, "OpenAI API key not configured. Generated in offline demo mode."), payload);
  }

  const cleanedPayload = {
    ...payload,
    content: payload.content.replace(/\s+/g, " ").trim(),
    sections: payload.sections.map(s => ({
      ...s,
      instruction: s.instruction ? s.instruction.trim() : ""
    }))
  };

  const schema = examJsonSchema();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 85000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: [
              "You generate secure teacher-reviewed exams as structured JSON. Follow ALL rules below exactly.",
              "",
              "GENERAL RULES:",
              "1. Questions must be unique, grounded in supplied content, include answer keys.",
              "2. Keep each explanation under 15 words.",
              "3. Never include images, image references, or image descriptions.",
              "4. For each section, copy the provided 'instruction' string directly to the output 'instruction' property.",
              "5. For sections that are NOT 'Reading Comprehension Questions', set 'passage' to an empty string \"\".",
              "",
              "MCQ / FILL IN THE BLANKS / CLOZE PASSAGE RULES:",
              "- Provide exactly 4 unique options in the 'options' array. One must be the correct answer.",
              "- For MCQ, randomize the correct answer position across questions.",
              "",
              "REORDER THE SENTENCE RULES:",
              "- Each question must contain 6-8 words/phrases separated by slashes. Never more than 8.",
              "",
              "TRUE OR FALSE RULES:",
              "- Generate a roughly balanced mix of True and False answers (approximately half each).",
              "- Do NOT follow a predictable pattern. Randomize the order.",
              "- Never have more than 3 consecutive True or 3 consecutive False answers.",
              "",
              "READING COMPREHENSION RULES (CRITICAL):",
              "- You MUST generate a reading passage and put it in the section-level 'passage' property.",
              "- The 'passage' property is at the SECTION level, NOT inside individual questions.",
              "- The passage MUST NOT be empty. It must be a real, substantive paragraph.",
              "- Respect the 'paragraphLength' parameter: Short=100-150 words, Medium=200-300 words, Long=400-500 words.",
              "- The 'questions' array should test comprehension of the passage.",
              "- Each question must have 'options' as an empty array [] and 'correctAnswer' as a short answer.",
              "",
              "MATCHING QUESTIONS RULES (CRITICAL):",
              "- Generate the requested number of questions. Each question = one matching pair.",
              "- 'questionText' = left-column item (1-3 words ONLY). 'correctAnswer' = right-column item (1-3 words ONLY).",
              "- NEVER use sentences, explanations, or punctuation. Maximum 3 words per item.",
              "- Set 'options' to empty array [] for all matching questions."
            ].join("\n")
          },
          {
            role: "user",
            content: JSON.stringify(cleanedPayload)
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "edtechra_exam",
            strict: true,
            schema
          }
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[Exam2Service] OpenAI generation error:", errorBody.slice(0, 300));
      throw new Error(`OpenAI generation failed: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("OpenAI response did not include structured text.");
    return normalizeExam(JSON.parse(text), payload);
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn("[Exam2Service] AI generation notice:", error.message, "- Using fallback generator.");
    return normalizeExam(buildFallbackExam(payload, `Generated with local engine fallback: ${error.message}`), payload);
  }
}

export function buildFallbackExam(payload, reason = "Offline mode") {
  let index = 1;
  const sections = payload.sections.map((section) => ({
    sectionId: cryptoId("sec"),
    title: section.type,
    questionType: section.type,
    instruction: section.instruction || "",
    marksPerQuestion: section.marks,
    totalMarks: section.count * section.marks,
    passage: section.type === "Reading Comprehension Questions"
      ? `Photosynthesis is a vital process used by plants and other organisms to convert light energy into chemical energy. This chemical energy is stored in carbohydrate molecules, such as sugars, which are synthesized from carbon dioxide and water. In most cases, oxygen is also released as a waste product. Photosynthesis is largely responsible for producing and maintaining the oxygen content of the Earth's atmosphere, and supplies most of the energy necessary for life on Earth.`
      : "",
    questions: Array.from({ length: section.count }, (_, qIdx) => {
      const id = `Q${String(index++).padStart(3, "0")}`;
      const isTF = section.type === "True or False Questions" || section.type === "True Or False";
      const isMatching = section.type === "Matching Questions";
      const isReorder = section.type.includes("Reorder");
      
      let answer = "Core concept";
      let questionText = `Question ${id} based on ${payload.examType || 'lesson content'}.`;
      let options = [];

      if (isTF) {
        answer = qIdx % 2 === 0 ? "True" : "False";
        questionText = sampleTrueFalseQuestion(qIdx);
      } else if (isMatching) {
        questionText = sampleMatchingQuestion(qIdx);
        answer = sampleMatchingAnswer(qIdx);
      } else if (isReorder) {
        questionText = "learning / interactive / is / enjoyable / process / an";
        answer = "Learning is an enjoyable interactive process";
      } else if (["Multiple Choice Questions (MCQ)", "Fill In The Blanks", "Cloze Passage Questions"].includes(section.type)) {
        answer = "Correct Option";
        options = ["Correct Option", "Alternative Alpha", "Alternative Beta", "Alternative Gamma"];
        questionText = `Identify the key principle regarding ${payload.content.slice(0, 30)}...`;
      }

      return {
        questionId: id,
        questionType: section.type,
        questionText,
        options,
        correctAnswer: answer,
        marks: section.marks,
        difficulty: section.difficulty || payload.difficulty,
        explanation: "Verified educational question."
      };
    })
  }));

  return {
    metadata: {
      examId: cryptoId("exam"),
      title: `${payload.examType} - AI Draft`,
      examType: payload.examType,
      difficulty: payload.difficulty,
      duration: `${payload.duration.value} ${payload.duration.unit}`,
      totalMarks: payload.requiredTotal,
      gradingMode: payload.gradingMode,
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

export function normalizeExam(exam, payload) {
  const totalMarks = payload.sections.reduce((sum, section) => sum + section.count * section.marks, 0);
  const normalized = {
    ...exam,
    metadata: {
      ...exam.metadata,
      examId: exam.metadata?.examId || cryptoId("exam"),
      examType: payload.examType,
      difficulty: payload.difficulty,
      duration: `${payload.duration.value} ${payload.duration.unit}`,
      totalMarks,
      gradingMode: payload.gradingMode,
      status: "draft",
      generatedAt: new Date().toISOString(),
      approvalRequired: true,
      generatorNote: exam.metadata?.generatorNote || "Generated and verified by EdTechra AI Exam Engine."
    }
  };

  normalized.sections = (normalized.sections || []).map((section, sectionIndex) => {
    const payloadSection = payload.sections[sectionIndex] || {};
    const sectionType = payloadSection.type || section.questionType || "Short Answer Questions";

    const mappedQuestions = (section.questions || []).map((question, questionIndex) => {
      let options = Array.isArray(question.options) ? question.options.filter(Boolean) : [];
      const isDropdownType = ["Multiple Choice Questions (MCQ)", "Fill In The Blanks", "Cloze Passage Questions"].includes(sectionType);

      if (isDropdownType) {
        const correct = question.correctAnswer || "";
        if (correct && !options.some(o => o.trim().toLowerCase() === correct.trim().toLowerCase())) {
          options.push(correct);
        }
        const fallbacks = ["Option A", "Option B", "Option C", "Option D"];
        let fallbackIdx = 0;
        while (options.length < 4) {
          const candidate = fallbacks[fallbackIdx++];
          if (!options.some(o => o.trim().toLowerCase() === candidate.trim().toLowerCase())) {
            options.push(candidate);
          }
        }
        if (options.length > 4) options = options.slice(0, 4);
        options = shuffleArray(options);
      }

      let questionText = question.questionText || "";
      let correctAnswer = question.correctAnswer || "";

      if (sectionType.includes("Reorder") || sectionType.includes("Sentence")) {
        correctAnswer = correctAnswer.replace(/\.+$/, "").trim();
        let words = correctAnswer.split(/\s+/).filter(Boolean);
        if (words.length > 8) words = words.slice(0, 8);
        const splitter = questionText.includes("/") ? "/" : /\s+/;
        const tiles = questionText.split(splitter).map(w => w.trim().replace(/\.+$/, "")).filter(Boolean);
        questionText = (tiles.length >= 3 ? tiles : words).map(w => w.toLowerCase()).join(" / ");
      }

      return {
        ...question,
        questionId: question.questionId || `S${sectionIndex + 1}Q${questionIndex + 1}`,
        questionType: sectionType,
        questionText,
        correctAnswer,
        options
      };
    });

    let questions = mappedQuestions;

    if (sectionType === "True or False Questions" || sectionType === "True Or False") {
      questions = shuffleArray(mappedQuestions);
      questions.forEach((q, idx) => {
        q.questionId = `S${sectionIndex + 1}Q${idx + 1}`;
      });
    }

    if (sectionType === "Matching Questions") {
      questions = questions.map(q => ({
        ...q,
        questionText: (q.questionText || "").split(/\s+/).slice(0, 3).join(" "),
        correctAnswer: (q.correctAnswer || "").split(/\s+/).slice(0, 3).join(" "),
        options: []
      }));
    }

    let sectionPassage = section.passage || "";
    if (sectionType === "Reading Comprehension Questions" && !sectionPassage.trim()) {
      sectionPassage = payload.content ? payload.content.slice(0, 400) : "Reading passage context.";
    }

    return {
      ...section,
      sectionId: section.sectionId || cryptoId("sec"),
      questionType: sectionType,
      title: section.title || sectionType,
      instruction: section.instruction || payloadSection.instruction || "",
      totalMarks: questions.reduce((sum, q) => sum + Number(q.marks || 0), 0),
      questions,
      passage: sectionPassage
    };
  });

  return normalized;
}

// ----------------------------------------------------------------------------
// 2. DETERMINISTIC & HYBRID AUTO-GRADING ENGINE
// ----------------------------------------------------------------------------

export function gradeExamAttempt(examPayload, answers = {}) {
  const sections = examPayload?.sections || examPayload?.questions_json || [];
  const questions = sections.flatMap((section) => section.questions || []);

  const breakdown = questions.map((question) => {
    const submitted = answers[question.questionId] !== undefined ? answers[question.questionId] : answers[question.id];
    const cleanSubmitted = String(submitted || '').trim().toLowerCase();
    const cleanCorrect = String(question.correctAnswer || question.correct_answer || '').trim().toLowerCase();

    const hybrid = [
      "Essay Type Questions",
      "Essay Questions",
      "Reading Comprehension Questions",
      "Reading Comprehension",
      "Short Answer Questions"
    ].includes(question.questionType || question.type);

    let isExact = false;
    if (question.questionType?.includes("Reorder")) {
      isExact = cleanSubmitted.replace(/[^a-z0-9]/g, '') === cleanCorrect.replace(/[^a-z0-9]/g, '');
    } else {
      isExact = cleanSubmitted === cleanCorrect && cleanSubmitted.length > 0;
    }

    const marks = Number(question.marks || 10);
    const score = isExact ? marks : hybrid ? Math.round(marks * 0.7) : 0;

    return {
      questionId: question.questionId || question.id,
      questionType: question.questionType || question.type,
      submittedAnswer: submitted || "",
      correctAnswer: question.correctAnswer || question.correct_answer || "",
      score,
      maxScore: marks,
      isCorrect: isExact,
      isHybrid: hybrid,
      feedback: isExact ? "Correct answer." : hybrid ? "Provisional rubric score assigned." : "Incorrect. Review topic."
    };
  });

  const totalScore = breakdown.reduce((sum, item) => sum + item.score, 0);
  const maxScore = breakdown.reduce((sum, item) => sum + item.maxScore, 0) || Number(examPayload?.metadata?.totalMarks || 100);
  const percentage = maxScore > 0 ? Number(((totalScore / maxScore) * 100).toFixed(2)) : 0;

  let grade = "Needs Support";
  if (percentage >= 90) grade = "A+";
  else if (percentage >= 80) grade = "A";
  else if (percentage >= 70) grade = "B";
  else if (percentage >= 60) grade = "C";
  else if (percentage >= 50) grade = "D";

  return {
    totalScore,
    maxScore,
    percentage,
    grade,
    passed: percentage >= 40,
    strengths: percentage >= 70 ? ["Strong concept mastery", "High accuracy in objective sections"] : ["Attempt completed", "Objective questions reviewed"],
    weaknesses: percentage < 70 ? ["Review topics with lower accuracy", "Practice timed responses"] : ["Continue practice to maintain top tier score"],
    feedback: percentage >= 50 ? "Great effort! Your score and performance breakdown are recorded." : "Keep practicing! Review incorrect answers and retake practice sets.",
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
    // 1. Fetch exams created by this teacher (try with teacher_id or fallback to created_by)
    let exams = null;
    const queryRes = await serverSupabase
      .from('classroom_exams')
      .select(`
        *,
        classroom:classrooms!classroom_id (id, title, subject, grade)
      `)
      .eq('created_by', teacherId)
      .order('created_at', { ascending: false });

    if (queryRes.error) {
      console.error('[Exam2Service] getTeacherExams error:', queryRes.error.message);
      return [];
    }
    exams = queryRes.data;

    const examList = exams || [];
    if (examList.length === 0) return [];

    const examIds = examList.map(e => e.id);

    // 2. Fetch submission aggregates for these exams
    const { data: results } = await serverSupabase
      .from('classroom_exam_results')
      .select('id, exam_id, score, total_marks, percentage, passed, student_id, submitted_at, report_r2_key')
      .in('exam_id', examIds);

    const resultsByExam = {};
    (results || []).forEach(r => {
      if (!resultsByExam[r.exam_id]) resultsByExam[r.exam_id] = [];
      resultsByExam[r.exam_id].push(r);
    });

    // 3. Enrich exams with analytics and R2 report pointers
    return examList.map(exam => {
      const examResults = resultsByExam[exam.id] || [];
      const totalSubs = examResults.length;
      const scores = examResults.map(r => Number(r.score || 0));
      const avgScore = totalSubs > 0 ? Number((scores.reduce((a, b) => a + b, 0) / totalSubs).toFixed(1)) : 0;
      const passCount = examResults.filter(r => r.passed).length;
      const passRate = totalSubs > 0 ? Number(((passCount / totalSubs) * 100).toFixed(1)) : 0;

      // Extract question count
      const questionsArray = Array.isArray(exam.questions_json) && exam.questions_json.length > 0
        ? exam.questions_json.flatMap(s => s.questions || [])
        : Array.isArray(exam.questions) ? exam.questions : [];

      return {
        ...exam,
        question_count: questionsArray.length || 10,
        submission_count: totalSubs,
        average_score: avgScore,
        pass_rate: passRate,
        results: examResults,
        has_r2_report: Boolean(exam.r2_file_key || examResults.some(r => r.report_r2_key))
      };
    });
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
  const totalMarks = Number(metadata.totalMarks || payload.total_marks || 100);
  const examType = metadata.examType || payload.exam_type || 'Unit Test';
  const difficulty = metadata.difficulty || payload.difficulty || 'Mixed';
  const gradingMode = metadata.gradingMode || payload.grading_mode || 'Hybrid Grading';
  const status = payload.status || (payload.approved ? 'published' : 'draft');
  const classroomId = payload.classroom_id || publishing.classroomId || null;

  const questionsCount = sections.flatMap(s => s.questions || []).length;

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
    source: 'exam2',
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
