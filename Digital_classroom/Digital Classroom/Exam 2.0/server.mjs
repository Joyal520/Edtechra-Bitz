import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { computeAnalytics, generatePDFReport } from "./score_analysis.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = resolve(__dirname, "public");
const dataDir = resolve(__dirname, "data");
const env = loadEnv(resolve(__dirname, ".env"));
const port = Number(process.env.PORT || env.PORT || 5173);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY;
const MAX_BODY_BYTES = 1_500_000;
const aiWindow = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      return json(res, 200, { ok: true, openaiConfigured: Boolean(OPENAI_API_KEY) });
    }

    if (req.method === "POST" && url.pathname === "/api/generate-exam") {
      if (!rateLimit(req, "generate", 6, 60_000)) {
        return json(res, 429, { error: "Too many AI requests. Please wait before generating again." });
      }
      const payload = await readJson(req);
      const validation = validateGenerationPayload(payload);
      if (validation) return json(res, 400, { error: validation });
      const exam = await generateExam(payload);
      await audit("ai_generation", {
        examType: payload.examType,
        difficulty: payload.difficulty,
        totalMarks: payload.requiredTotal,
        sectionCount: payload.sections.length
      });
      return json(res, 200, exam);
    }

    if (req.method === "POST" && url.pathname === "/api/grade-attempt") {
      const payload = await readJson(req);
      const result = gradeAttempt(payload);
      await audit("attempt_graded", { examId: payload.exam?.metadata?.examId || "draft", score: result.totalScore });
      return json(res, 200, result);
    }

    if (req.method === "POST" && url.pathname === "/api/save-exam") {
      const payload = await readJson(req);
      const saved = await saveExam(payload);
      await audit("exam_saved", { examId: saved.examId, approved: Boolean(payload.approved) });
      return json(res, 200, saved);
    }

    if (req.method === "POST" && url.pathname === "/api/publish-exam") {
      const payload = await readJson(req);
      if (!payload.approved) return json(res, 403, { error: "Teacher approval is required before publishing." });
      const saved = await saveExam({ ...payload, status: "published" });
      await audit("exam_published", { examId: saved.examId });
      return json(res, 200, { ...saved, status: "published" });
    }

    if (req.method === "POST" && url.pathname === "/api/score-analysis") {
      const payload = await readJson(req);
      const analytics = computeAnalytics(payload);
      
      const reportsDir = join(publicDir, "reports");
      await mkdir(reportsDir, { recursive: true });
      
      const fileName = `${payload.exam_id || "EXAM"}_${payload.class_id || "CLASS"}.pdf`;
      const pdfPath = join(reportsDir, fileName);
      await generatePDFReport(analytics, pdfPath);
      
      return json(res, 200, {
        report_pdf_url: `/reports/${fileName}`,
        summary: {
          average_score: analytics.average_score,
          pass_rate: analytics.pass_rate,
          highest_score: analytics.highest_score,
          lowest_score: analytics.lowest_score
        },
        analytics
      });
    }

    if (req.method === "GET") {
      return serveStatic(url.pathname, res);
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: error.message || "Unexpected server error" });
  }
}).listen(port, () => {
  console.log(`Edtechra AI Exam Engine running at http://127.0.0.1:${port}`);
});

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const text = readFileSyncSafe(path);
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^["']|["']$/g, "")];
      })
  );
}

function readFileSyncSafe(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

async function serveStatic(pathname, res) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const target = resolve(publicDir, `.${decodeURIComponent(requested)}`);
  if (!target.startsWith(publicDir)) return json(res, 403, { error: "Forbidden" });
  const ext = extname(target);
  try {
    const body = await readFile(target);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(body);
  } catch {
    json(res, 404, { error: "Not found" });
  }
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("Request body too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function validateGenerationPayload(payload) {
  if (!payload.content || payload.content.trim().length < 3) return "Content is required.";
  if (!payload.examType) return "Exam type is required.";
  if (!payload.difficulty) return "Difficulty is required.";
  if (!payload.duration?.value || !payload.duration?.unit) return "Duration is required.";
  if (!Array.isArray(payload.sections) || payload.sections.length === 0) return "At least one question section is required.";
  const total = payload.sections.reduce((sum, section) => sum + section.count * section.marks, 0);
  if (total !== Number(payload.requiredTotal || 100)) return `Total marks must equal ${payload.requiredTotal || 100}.`;
  return "";
}

async function generateExam(payload) {
  if (!OPENAI_API_KEY) return normalizeExam(buildFallbackExam(payload, "OPENAI_API_KEY is not configured."), payload);

  // Clean whitespaces to optimize input tokens
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
  const timeoutId = setTimeout(() => controller.abort(), 80000); // 80 second timeout
  
  console.log("[generateExam] Starting OpenAI call...");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
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
              "- Do NOT follow a predictable pattern (no alternating T,F,T,F). Randomize the order.",
              "- Never have more than 3 consecutive True or 3 consecutive False answers.",
              "",
              "READING COMPREHENSION RULES (CRITICAL - READ CAREFULLY):",
              "- You MUST generate a reading passage and put it in the section-level 'passage' property.",
              "- The 'passage' property is at the SECTION level, NOT inside individual questions.",
              "- The passage MUST NOT be empty. It must be a real, substantive paragraph.",
              "- Respect the 'paragraphLength' parameter: Short=100-150 words, Medium=200-300 words, Long=400-500 words.",
              "- The 'questions' array should test comprehension of the passage.",
              "- Each question must have 'options' as an empty array [] and 'correctAnswer' as a short answer.",
              "- Example section output: {\"sectionId\":\"s1\",\"title\":\"Reading Comprehension\",\"questionType\":\"Reading Comprehension Questions\",\"instruction\":\"...\",\"marksPerQuestion\":2,\"totalMarks\":10,\"passage\":\"The water cycle is a continuous process by which water circulates through the Earth's systems. Water evaporates from oceans and lakes, rises as vapor, condenses into clouds, and falls back as precipitation...\",\"questions\":[{\"questionId\":\"Q1\",\"questionType\":\"Reading Comprehension Questions\",\"questionText\":\"What happens to water when it evaporates?\",\"options\":[],\"correctAnswer\":\"It rises as vapor\",\"marks\":2,\"difficulty\":\"Medium\",\"explanation\":\"Evaporation turns water into vapor.\"}]}",
              "",
              "MATCHING QUESTIONS RULES (CRITICAL - READ CAREFULLY):",
              "- Generate the requested number of questions. Each question = one matching pair.",
              "- 'questionText' = left-column item (1-3 words ONLY). 'correctAnswer' = right-column item (1-3 words ONLY).",
              "- NEVER use sentences, explanations, or punctuation. Maximum 3 words per item.",
              "- Set 'options' to empty array [] for all matching questions.",
              "- CORRECT example: {\"questionText\":\"Labrador\",\"correctAnswer\":\"Friendly\"}",
              "- CORRECT example: {\"questionText\":\"H2O\",\"correctAnswer\":\"Water\"}",
              "- CORRECT example: {\"questionText\":\"1947\",\"correctAnswer\":\"Independence Year\"}",
              "- WRONG example (too long): {\"questionText\":\"Match the following breed\",\"correctAnswer\":\"This breed is known for being friendly and loyal\"}",
              "- WRONG example (sentence): {\"questionText\":\"What is a Labrador known for?\",\"correctAnswer\":\"A Labrador is known for being friendly\"}"
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
    console.log("[generateExam] OpenAI response status:", response.status);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[generateExam] OpenAI error:", errorBody.slice(0, 500));
      throw new Error(`OpenAI generation failed: ${response.status} ${errorBody.slice(0, 240)}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      console.error("[generateExam] No content in response:", JSON.stringify(data).slice(0, 500));
      throw new Error("OpenAI response did not include structured text.");
    }
    console.log("[generateExam] Success. Normalizing exam...");
    return normalizeExam(JSON.parse(text), payload);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      console.warn("[generateExam] OpenAI timed out after 80s, using fallback.");
      return normalizeExam(buildFallbackExam(payload, "AI generation timed out. Using local fallback."), payload);
    }
    console.error("[generateExam] Error:", error.message);
    // Fall back to local generation on any error
    return normalizeExam(buildFallbackExam(payload, `AI error: ${error.message}`), payload);
  }
}

function buildFallbackExam(payload, reason = "Offline demo mode") {
  let index = 1;
  const sections = payload.sections.map((section) => ({
    sectionId: cryptoId("sec"),
    title: section.type,
    questionType: section.type,
    instruction: section.instruction || "",
    marksPerQuestion: section.marks,
    totalMarks: section.count * section.marks,
    passage: section.type === "Reading Comprehension Questions"
      ? `Photosynthesis is a vital process used by plants and other organisms to convert light energy into chemical energy. This chemical energy is stored in carbohydrate molecules, such as sugars, which are synthesized from carbon dioxide and water. In most cases, oxygen is also released as a waste product. Most plants, algae, and cyanobacteria perform photosynthesis; such organisms are called photoautotrophs. Photosynthesis is largely responsible for producing and maintaining the oxygen content of the Earth's atmosphere, and supplies most of the energy necessary for life on Earth. The process begins when energy from light is absorbed by proteins called reaction centres that contain green chlorophyll pigments.`
      : "",
    questions: Array.from({ length: section.count }, (_, qIdx) => {
      const id = `Q${String(index++).padStart(3, "0")}`;
      const isTF = section.type === "True or False Questions" || section.type === "True Or False";
      const isMatching = section.type === "Matching Questions";
      const answer = isTF
        ? (Math.random() < 0.5 ? "True" : "False")
        : isMatching
          ? sampleMatchingAnswer(qIdx)
          : sampleAnswer(section.type);
      return {
        questionId: id,
        questionType: section.type,
        questionText: isTF
          ? sampleTrueFalseQuestion(qIdx)
          : isMatching
            ? sampleMatchingQuestion(qIdx)
            : sampleQuestion(section.type, payload.content, id),
        options: (section.type === "Multiple Choice Questions (MCQ)" || section.type === "Fill In The Blanks" || section.type === "Cloze Passage Questions")
          ? [answer, "Alternative A", "Alternative B", "Alternative C"]
          : [],
        correctAnswer: answer,
        marks: section.marks,
        difficulty: section.difficulty || payload.difficulty,
        explanation: isTF
          ? sampleTrueFalseExplanation(qIdx)
          : isMatching
            ? "Pair description for local verification."
            : "Demo question generated locally. Use AI generation after configuring server access."
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
  const terms = ["Labrador", "Beagle", "Poodle", "Shepherd", "Bulldog", "Noun", "Verb", "Adjective", "Sun", "Water"];
  return terms[qIdx % terms.length];
}

function sampleMatchingAnswer(qIdx) {
  const definitions = ["Friendly", "Curious", "Intelligent", "Protective", "Docile", "Naming word", "Action word", "Describing word", "Light energy", "Hydrogen dioxide"];
  return definitions[qIdx % definitions.length];
}

function sampleTrueFalseQuestion(qIdx) {
  const questions = [
    "Plants produce their own food through photosynthesis.",
    "All plants have flowers.",
    "Roots help plants absorb water and nutrients from the soil.",
    "Plants do not need sunlight to grow.",
    "Photosynthesis occurs in the leaves of green plants.",
    "Stems only transport water and do not support the plant.",
    "Chlorophyll gives plants their green color."
  ];
  return questions[qIdx % questions.length];
}

function sampleTrueFalseExplanation(qIdx) {
  const explanations = [
    "Photosynthesis allows plants to make food.",
    "Not all plants produce flowers (e.g., ferns, mosses).",
    "Roots anchor the plant and absorb water/nutrients.",
    "Sunlight is required for photosynthesis.",
    "Chloroplasts in the leaf cells perform photosynthesis.",
    "Stems also hold the leaves up to the light.",
    "Chlorophyll is the green pigment in chloroplasts."
  ];
  return explanations[qIdx % explanations.length];
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalizeExam(exam, payload) {
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
      generatorNote: exam.metadata?.generatorNote || "Generated by OpenAI and normalized by the Edtechra server."
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
          if (options.length > 4) {
            options = options.slice(0, 4);
          }
          options = shuffleArray(options);
        }
        let questionText = question.questionText || "";
        let correctAnswer = question.correctAnswer || "";
        
        if (sectionType === "Reorder the Sentence Questions" || sectionType === "Sentence Reordering" || sectionType === "Sentence Reorder Questions" || sectionType === "Reorder Sentence Questions") {
          correctAnswer = correctAnswer.replace(/\.+$/, "").trim();
          let words = correctAnswer.split(/\s+/).filter(Boolean);
          
          const properNounsList = [
            "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
            "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
            "london", "paris", "tokyo", "america", "china", "india", "england", "france", "germany",
            "john", "mary", "peter", "sarah", "david", "james", "emma", "olivia", "william", "sofia", "ayaan", "nethmi"
          ];
          
          const properNounsInSentence = new Set();
          words.forEach((w, idx) => {
            const cleanWord = w.replace(/[^a-zA-Z]/g, "").toLowerCase();
            if (cleanWord === "i") {
              properNounsInSentence.add(cleanWord);
            } else if (properNounsList.includes(cleanWord)) {
              properNounsInSentence.add(cleanWord);
            } else if (idx > 0 && w.charAt(0) === w.charAt(0).toUpperCase() && w.charAt(0) !== w.charAt(0).toLowerCase()) {
              properNounsInSentence.add(cleanWord);
            }
          });
          
          const normalizedWords = words.map((w, idx) => {
            const cleanWord = w.replace(/[^a-zA-Z]/g, "");
            const isProper = properNounsInSentence.has(cleanWord.toLowerCase());
            return isProper ? w : w.toLowerCase();
          });
          
          correctAnswer = normalizedWords.map((w, idx) => idx === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(" ");
          
          if (words.length > 8) {
            words = words.slice(0, 8);
            const truncatedNormalized = normalizedWords.slice(0, 8);
            correctAnswer = truncatedNormalized.map((w, idx) => idx === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(" ");
            questionText = shuffleArray(truncatedNormalized).join(" / ");
          } else {
            const splitter = questionText.includes("/") ? "/" : /\s+/;
            const tiles = questionText.split(splitter).map(w => w.trim().replace(/\.+$/, "")).filter(Boolean);
            const normalizedTiles = tiles.map(tile => {
              const cleanTile = tile.replace(/[^a-zA-Z]/g, "");
              const isProper = properNounsInSentence.has(cleanTile.toLowerCase());
              return isProper ? tile : tile.toLowerCase();
            });
            questionText = normalizedTiles.join(" / ");
          }
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
      // Shuffle T/F questions randomly instead of forcing a predictable alternating pattern.
      // Ensure no more than 3 consecutive same answers.
      questions = shuffleArray(mappedQuestions);

      // Validate: break runs of 4+ consecutive same answers by swapping
      for (let attempts = 0; attempts < 20; attempts++) {
        let hasLongRun = false;
        for (let i = 0; i <= questions.length - 4; i++) {
          const ans = questions.slice(i, i + 4).map(q => String(q.correctAnswer || "").trim().toLowerCase());
          if (ans.every(a => a === ans[0])) {
            hasLongRun = true;
            break;
          }
        }
        if (!hasLongRun) break;
        questions = shuffleArray(questions);
      }

      questions.forEach((q, idx) => {
        q.questionId = `S${sectionIndex + 1}Q${idx + 1}`;
      });
    }

    // ── Matching: sanitize items to max 3 words and split if AI crammed all pairs into one question ──
    if (sectionType === "Matching Questions") {
      // If AI generated only 1 question but crammed multiple pairs (e.g. "Go - Went; Take - Took"),
      // try to split them into individual question objects.
      if (questions.length === 1) {
        const q = questions[0];
        const text = q.correctAnswer || "";
        // Check for semicolon-separated or newline-separated pairs
        const separators = [";", "\n", "|"];
        let pairs = null;
        for (const sep of separators) {
          if (text.includes(sep)) {
            pairs = text.split(sep).map(p => p.trim()).filter(Boolean);
            break;
          }
        }
        if (pairs && pairs.length > 1) {
          const splitQuestions = [];
          for (const pair of pairs) {
            // Try to split "Term - Definition" or "Term: Definition" or "Term = Definition"
            const dashMatch = pair.match(/^(.+?)\s*[-:=→]\s*(.+)$/);
            if (dashMatch) {
              splitQuestions.push({
                ...q,
                questionId: `S${sectionIndex + 1}Q${splitQuestions.length + 1}`,
                questionText: dashMatch[1].trim().split(/\s+/).slice(0, 3).join(" "),
                correctAnswer: dashMatch[2].trim().split(/\s+/).slice(0, 3).join(" "),
                options: []
              });
            }
          }
          if (splitQuestions.length > 1) {
            questions = splitQuestions;
          }
        }
      }

      // Truncate any matching item to max 3 words
      questions = questions.map(q => ({
        ...q,
        questionText: (q.questionText || "").split(/\s+/).slice(0, 3).join(" "),
        correctAnswer: (q.correctAnswer || "").split(/\s+/).slice(0, 3).join(" "),
        options: []
      }));
    }

    // ── Reading Comprehension: ensure passage is not empty ──
    let sectionPassage = section.passage || "";
    if (sectionType === "Reading Comprehension Questions" && !sectionPassage.trim()) {
      // If AI failed to generate a passage, build one from the first question's text or use content
      const contentSnippet = payload.content ? payload.content.slice(0, 500) : "";
      sectionPassage = contentSnippet || "No passage was generated. Please edit this text to add your reading passage.";
      console.warn("[normalizeExam] Reading Comprehension passage was empty; used content fallback.");
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

function sampleQuestion(type, content, id) {
  const topic = content.trim().split(/\s+/).slice(0, 10).join(" ");
  const map = {
    "Multiple Choice Questions (MCQ)": `Which statement best matches the supplied lesson content about ${topic}?`,
    "Fill In The Blanks": `Complete the key idea from the lesson: ${topic} ... _____.`,
    "Cloze Passage Questions": `Complete the passage by filling in the blanks for the ${topic} content: _____ is essential.`,
    "Matching Questions": `Match the related items of ${topic} below.`,
    "True or False Questions": `True or false: ${topic} is a central idea in the supplied material.`,
    "Reorder the Sentence Questions": `football / play / we / on / Sundays / love / to`,
    "Short Answer Questions": `Write a brief answer explaining the main concept of ${topic}.`,
    "Reading Comprehension Questions": `Based on the reading passage, what is a key detail related to ${topic}?`,
    "Essay Type Questions": `Write a structured response explaining ${topic} with examples from the provided material.`
  };
  return `${id}. ${map[type] || map["Essay Type Questions"]}`;
}

function sampleAnswer(type) {
  if (type === "Multiple Choice Questions (MCQ)") return "Core concept";
  if (type === "True or False Questions" || type === "True Or False") return "True";
  if (type === "Reorder the Sentence Questions" || type === "Sentence Reordering") return "We love to play football on Sundays";
  if (type === "Matching Questions") return "Column A Item 1 - Column B Item 1, Column A Item 2 - Column B Item 2";
  if (type === "Cloze Passage Questions" || type === "Fill In The Blanks") return "missing word";
  return "A complete answer that accurately reflects the supplied content.";
}

function gradeAttempt(payload) {
  const questions = (payload.exam?.sections || []).flatMap((section) => section.questions || []);
  const answers = payload.answers || {};
  const breakdown = questions.map((question) => {
    const submitted = answers[question.questionId];
    const exact = String(submitted || "").trim().toLowerCase() === String(question.correctAnswer || "").trim().toLowerCase();
    const hybrid = ["Essay Type Questions", "Essay Questions", "Reading Comprehension Questions", "Reading Comprehension", "Short Answer Questions"].includes(question.questionType);
    const score = hybrid ? Math.round(question.marks * 0.7) : exact ? question.marks : 0;
    return {
      questionId: question.questionId,
      score,
      maxScore: question.marks,
      feedback: hybrid ? "Queued for teacher review with provisional rubric score." : exact ? "Correct." : "Review the concept and try again."
    };
  });
  const totalScore = breakdown.reduce((sum, item) => sum + item.score, 0);
  const maxScore = breakdown.reduce((sum, item) => sum + item.maxScore, 0);
  return {
    totalScore,
    maxScore,
    percentage: maxScore ? Math.round((totalScore / maxScore) * 100) : 0,
    grade: gradeFromPercentage(maxScore ? (totalScore / maxScore) * 100 : 0),
    strengths: ["Completed attempt", "Objective answers processed"],
    weaknesses: ["Long-form answers need teacher confirmation"],
    feedback: "Objective questions were auto-graded. Hybrid sections remain reviewable.",
    breakdown
  };
}

function gradeFromPercentage(value) {
  if (value >= 90) return "A";
  if (value >= 80) return "B";
  if (value >= 70) return "C";
  if (value >= 60) return "D";
  return "Needs Support";
}

async function saveExam(payload) {
  await mkdir(dataDir, { recursive: true });
  const examId = payload.exam?.metadata?.examId || cryptoId("exam");
  const record = {
    examId,
    status: payload.status || "draft",
    approved: Boolean(payload.approved),
    savedAt: new Date().toISOString(),
    metadata: payload.exam?.metadata || {},
    exam: payload.exam,
    settings: payload.settings || {},
    publishing: payload.publishing || {}
  };
  await writeFile(join(dataDir, `${examId}.json`), JSON.stringify(record, null, 2));
  return { examId, status: record.status, savedAt: record.savedAt };
}

async function audit(action, details) {
  await mkdir(dataDir, { recursive: true });
  const line = JSON.stringify({ at: new Date().toISOString(), action, details }) + "\n";
  await writeFile(join(dataDir, "exam_audit_logs.jsonl"), line, { flag: "a" });
}

function rateLimit(req, action, max, interval) {
  const key = `${req.socket.remoteAddress}:${action}`;
  const now = Date.now();
  const hits = (aiWindow.get(key) || []).filter((time) => now - time < interval);
  if (hits.length >= max) return false;
  hits.push(now);
  aiWindow.set(key, hits);
  return true;
}

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(JSON.stringify(body));
}

function cryptoId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

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
