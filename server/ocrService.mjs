/**
 * EdTechra Digital Classroom — AI OCR Worksheet Grader Engine
 * Scalable, category-driven, asynchronous Vision AI evaluation service.
 */

import crypto from 'crypto';
import {
  getBinaryContent,
  putBinaryContent,
  deleteObjects,
  listObjects,
  buildOcrReportKey
} from './r2Service.mjs';
import { generateEvaluationReportPdf } from './pdfReportService.mjs';
import { normalizeConcept } from './conceptNormalization.mjs';

export const OCR_CATEGORIES = [
  'Paragraph Writing',
  'Grammar',
  'Vocabulary',
  'Reading',
  'Writing',
  'Comprehension',
  'Essay Writing',
  'Story Writing',
  'Letter Writing',
  'Handwritten Neatness',
  'Other'
];

export const CATEGORY_CRITERIA_MAP = {
  'Grammar': [
    { criterion: 'Sentence Structure & Syntax', weight: 0.30 },
    { criterion: 'Punctuation & Capitalization', weight: 0.25 },
    { criterion: 'Tense & Agreement', weight: 0.25 },
    { criterion: 'Clarity & Flow', weight: 0.20 }
  ],
  'Vocabulary': [
    { criterion: 'Word Choice & Precision', weight: 0.35 },
    { criterion: 'Context Appropriateness', weight: 0.25 },
    { criterion: 'Spelling & Accuracy', weight: 0.25 },
    { criterion: 'Vocabulary Range', weight: 0.15 }
  ],
  'Reading': [
    { criterion: 'Comprehension & Understanding', weight: 0.35 },
    { criterion: 'Inference & Context Clues', weight: 0.25 },
    { criterion: 'Vocabulary Recognition', weight: 0.20 },
    { criterion: 'Response Accuracy', weight: 0.20 }
  ],
  'Writing': [
    { criterion: 'Content & Relevance', weight: 0.30 },
    { criterion: 'Organization & Structure', weight: 0.25 },
    { criterion: 'Grammar & Mechanics', weight: 0.25 },
    { criterion: 'Vocabulary & Style', weight: 0.20 }
  ],
  'Comprehension': [
    { criterion: 'Question Comprehension', weight: 0.35 },
    { criterion: 'Answer Accuracy', weight: 0.30 },
    { criterion: 'Text Evidence & Explanation', weight: 0.20 },
    { criterion: 'Completeness', weight: 0.15 }
  ],
  'Paragraph Writing': [
    { criterion: 'Content and Relevance', weight: 0.25 },
    { criterion: 'Organization & Flow', weight: 0.15 },
    { criterion: 'Grammar', weight: 0.20 },
    { criterion: 'Vocabulary', weight: 0.15 },
    { criterion: 'Sentence Structure', weight: 0.15 },
    { criterion: 'Spelling', weight: 0.10 }
  ],
  'Essay Writing': [
    { criterion: 'Ideas & Content', weight: 0.25 },
    { criterion: 'Organization', weight: 0.15 },
    { criterion: 'Development & Elaboration', weight: 0.15 },
    { criterion: 'Grammar', weight: 0.15 },
    { criterion: 'Vocabulary', weight: 0.15 },
    { criterion: 'Sentence Structure', weight: 0.10 },
    { criterion: 'Spelling', weight: 0.05 }
  ],
  'Story Writing': [
    { criterion: 'Creativity & Plot', weight: 0.25 },
    { criterion: 'Story Development & Pacing', weight: 0.20 },
    { criterion: 'Organization', weight: 0.15 },
    { criterion: 'Vocabulary & Imagery', weight: 0.15 },
    { criterion: 'Grammar', weight: 0.10 },
    { criterion: 'Sentence Structure', weight: 0.10 },
    { criterion: 'Spelling', weight: 0.05 }
  ],
  'Letter Writing': [
    { criterion: 'Format & Salutation', weight: 0.20 },
    { criterion: 'Purpose & Content', weight: 0.25 },
    { criterion: 'Organization', weight: 0.15 },
    { criterion: 'Grammar', weight: 0.15 },
    { criterion: 'Vocabulary & Tone', weight: 0.15 },
    { criterion: 'Spelling', weight: 0.10 }
  ],
  'Handwritten Neatness': [
    { criterion: 'Legibility', weight: 0.25 },
    { criterion: 'Letter Formation', weight: 0.20 },
    { criterion: 'Spacing & Margins', weight: 0.15 },
    { criterion: 'Alignment & Baseline', weight: 0.15 },
    { criterion: 'Consistency & Flow', weight: 0.15 },
    { criterion: 'Overall Presentation', weight: 0.10 }
  ],
  'Other': [
    { criterion: 'Task Accuracy & Understanding', weight: 0.35 },
    { criterion: 'Work Completeness', weight: 0.25 },
    { criterion: 'Clarity & Expression', weight: 0.25 },
    { criterion: 'Presentation & Effort', weight: 0.15 }
  ]
};

// Concurrency & Queue Configuration
const DEFAULT_CONCURRENCY = 3;
const CONCURRENCY_LIMIT = Math.max(
  1,
  parseInt(process.env.OCR_AI_CONCURRENCY_LIMIT || `${DEFAULT_CONCURRENCY}`, 10)
);

/**
 * Robust JSON extraction and parser handling markdown codeblocks, whitespace,
 * and conversational lead-in/lead-out wrapper text from LLMs.
 */
export function cleanAndParseJson(rawText, fallback = null) {
  if (!rawText || typeof rawText !== 'string') return fallback;
  const trimmed = rawText.trim();
  if (!trimmed) return fallback;

  // 1. Direct JSON parse
  try {
    return JSON.parse(trimmed);
  } catch (_) {}

  // 2. Strip markdown code fences (```json ... ``` or ``` ... ```)
  try {
    const withoutBlocks = trimmed
      .replace(/^```(?:json)?\s*/im, '')
      .replace(/\s*```$/im, '')
      .trim();
    return JSON.parse(withoutBlocks);
  } catch (_) {}

  // 3. Extract outermost JSON object {...}
  try {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = trimmed.slice(firstBrace, lastBrace + 1);
      return JSON.parse(candidate);
    }
  } catch (_) {}

  // 4. Extract outermost JSON array [...]
  try {
    const firstBracket = trimmed.indexOf('[');
    const lastBracket = trimmed.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      const candidate = trimmed.slice(firstBracket, lastBracket + 1);
      return JSON.parse(candidate);
    }
  } catch (_) {}

  return fallback;
}

class OcrEvaluationQueue {
  constructor() {
    this.queue = [];
    this.activeWorkers = 0;
    this.concurrencyLimit = CONCURRENCY_LIMIT;
    this.serverSupabase = null;
    this.serverOpenAI = null;
  }

  init({ serverSupabase, serverOpenAI, geminiApiKey = null }) {
    this.serverSupabase = serverSupabase;
    this.serverOpenAI = serverOpenAI;
    this.geminiApiKey = geminiApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    console.log(`[OCR Engine] Initialized with concurrency limit: ${this.concurrencyLimit}`);
  }

  enqueue(job) {
    this.queue.push(job);
    console.log(`[OCR Engine] Enqueued job: ${job.evaluationId} (Queue size: ${this.queue.length})`);
    this.processNext();
  }

  async processNext() {
    if (this.activeWorkers >= this.concurrencyLimit || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    this.activeWorkers++;

    try {
      await this.processJob(job);
    } catch (err) {
      console.error(`[OCR Engine] Unhandled job failure (${job.evaluationId}):`, err);
    } finally {
      this.activeWorkers--;
      // Trigger next job in queue
      this.processNext();
    }
  }

  async processJob(job) {
    const { evaluationId } = job;
    console.log(`[OCR Engine] Processing job: ${evaluationId} (Active: ${this.activeWorkers}/${this.concurrencyLimit})`);

    // 1. Mark status = 'processing'
    if (this.serverSupabase) {
      await this.serverSupabase
        .from('ocr_evaluations')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', evaluationId);
    }

    try {
      // 2. Fetch or decode temporary file buffer
      let imageBuffer = null;
      let effectiveContentType = job.fileContentType || 'image/jpeg';
      if (job.imageBase64) {
        const mimeMatch = job.imageBase64.match(/^data:([^;]+);base64,/);
        if (mimeMatch && mimeMatch[1]) {
          effectiveContentType = mimeMatch[1];
        }
        const cleanBase64 = job.imageBase64.replace(/^data:[^;]+;base64,/, '');
        imageBuffer = Buffer.from(cleanBase64, 'base64');
      } else if (job.temporaryFileKey) {
        try {
          imageBuffer = await getBinaryContent(job.temporaryFileKey);
        } catch (r2Err) {
          console.warn('[OCR Engine] Warning: Failed to fetch temporary file from R2:', r2Err.message);
        }
      }

      // 3. Perform Category-Specific AI Evaluation with Exponential Backoff
      const evaluationResult = await this.evaluateWithAiWithRetry({
        ...job,
        fileContentType: effectiveContentType,
        imageBuffer
      });

      // 4. Validate and sanitize AI Output
      const validated = this.validateAndNormalizeAiOutput(evaluationResult, job.maxMarks, job.category, job.title || '');

      // 5. Save structured evaluation data to Supabase
      if (this.serverSupabase) {
        const enrichedBreakdown = Array.isArray(validated.breakdown) ? [...validated.breakdown] : [];
        enrichedBreakdown.push({
          __is_diagnostic_meta: true,
          concept: validated.concept || null,
          ocr_text: validated.ocr_text || '',
          corrected_work: validated.corrected_work || '',
          detected_errors: validated.detected_errors || [],
          spelling_errors: validated.spelling_errors || [],
          strengths: validated.strengths || [],
          weaknesses: validated.weaknesses || []
        });

        const updatePayload = {
          score: validated.score,
          ai_original_score: validated.score,
          final_score: validated.score,
          percentage: validated.percentage,
          performance: validated.performance,
          breakdown_json: enrichedBreakdown,
          feedback: validated.feedback,
          ai_original_feedback: validated.feedback,
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        if (job.taskId || job.assignmentId) {
          updatePayload.assignment_id = job.taskId || job.assignmentId;
        }

        let { data: savedData, error: dbError } = await this.serverSupabase
          .from('ocr_evaluations')
          .update(updatePayload)
          .eq('id', evaluationId)
          .select('*')
          .maybeSingle();

        if (dbError && dbError.message && dbError.message.includes('assignment_id')) {
          delete updatePayload.assignment_id;
          const retry = await this.serverSupabase
            .from('ocr_evaluations')
            .update(updatePayload)
            .eq('id', evaluationId)
            .select('*')
            .maybeSingle();
          if (retry.data) savedData = retry.data;
          dbError = retry.error;
        }

        if (dbError) {
          console.error(`[OCR Engine] Persist warning: ${dbError.message}`);
        } else if (savedData) {
          updatedEvalRecord = savedData;
        }

        // 5b. UNIFY WITH TASK SUBMISSIONS: If associated with a Task, upsert into assignment_submissions & student_corrected_work
        // 5b. UNIFY WITH TASK SUBMISSIONS: If associated with a Task, upsert into assignment_submissions & student_corrected_work
        if (job.taskId || job.assignmentId) {
          const effectiveTaskId = job.taskId || job.assignmentId;
          try {
            const { data: taskData } = await this.serverSupabase
              .from('assignments')
              .select('id, version, points, title')
              .eq('id', effectiveTaskId)
              .maybeSingle();

            const grammarIssues = (validated.grammar_issues || []).length > 0
              ? validated.grammar_issues
              : (validated.detected_errors || [])
                  .filter((d) => d.error_type === 'grammar' || d.error_type === 'sentence_structure' || d.error_type === 'punctuation')
                  .map((g) => ({
                    original: g.student_error,
                    correction: g.correct_form,
                    explanation: g.explanation || g.concept || 'Grammar correction'
                  }));

            const spellingIssues = (validated.spelling_issues || []).length > 0
              ? validated.spelling_issues
              : (validated.spelling_errors || []).map((s) => ({
                  original: s.misspelled_word,
                  correction: s.correct_word,
                  explanation: 'Spelling correction'
                }));

            const sentenceIssues = validated.sentence_structure_issues || [];
            const vocabularyIssues = validated.vocabulary_issues || [];

            const mistakesList = [
              ...grammarIssues,
              ...spellingIssues,
              ...sentenceIssues,
              ...vocabularyIssues
            ];

            const grammarErrors = grammarIssues.map((g) => ({
              text: g.original,
              suggestion: g.correction,
              rule: g.explanation || 'Grammar'
            }));

            const spellingErrors = spellingIssues.map((s) => ({
              text: s.original,
              suggestion: s.correction
            }));

            const writingEval = {
              ocr_text: validated.ocr_text || '',
              original_work: validated.ocr_text || '',
              corrected_work: validated.corrected_work || validated.ocr_text || '',
              score: validated.score,
              max_score: job.maxMarks,
              percentage: validated.percentage,
              category: job.category,
              topic: validated.concept || job.category,
              concept: validated.concept || job.category,
              skills: [validated.concept || job.category],
              feedback: validated.feedback,
              strengths: validated.strengths || [],
              weaknesses: validated.weaknesses || [],
              next_step: validated.next_step || 'Review grammar and practice sentence structure in your writing.',
              grammar_issues: grammarIssues,
              spelling_issues: spellingIssues,
              sentence_structure_issues: sentenceIssues,
              vocabulary_issues: vocabularyIssues,
              mistakes: mistakesList,
              corrections: mistakesList.map((m) => `"${m.original}" → "${m.correction}"`),
              grammar_errors: grammarErrors,
              spelling_errors: spellingErrors,
              breakdown: validated.breakdown || []
            };

            const permanentFileUrls = job.temporaryFileKey
              ? [job.temporaryFileKey]
              : (job.imageBase64 ? [job.imageBase64] : []);

            const subUpsertPayload = {
              assignment_id: effectiveTaskId,
              classroom_id: job.classroomId,
              student_id: job.studentId,
              status: 'graded',
              ocr_evaluation_id: evaluationId,
              file_urls: permanentFileUrls,
              text_response: validated.ocr_text || '',
              question_answers: [
                {
                  question_id: 'ocr_handwritten_response',
                  student_answer: validated.ocr_text || '',
                  is_correct: validated.percentage >= 60,
                  score: validated.score,
                  max_score: job.maxMarks,
                  grading_method: 'ai',
                  feedback: validated.feedback,
                  writing_evaluation: writingEval
                }
              ],
              points_awarded: Math.round(validated.score),
              final_score: validated.score,
              ai_score: validated.score,
              percentage: validated.percentage,
              teacher_feedback: validated.feedback,
              is_ai_graded: true,
              task_version: taskData?.version || 1,
              completed_at: new Date().toISOString(),
              submitted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            let { error: taskSubErr } = await this.serverSupabase
              .from('assignment_submissions')
              .upsert(subUpsertPayload, { onConflict: 'assignment_id,student_id' });

            if (taskSubErr) {
              console.warn('[OCR Engine] Notice: assignment_submissions upsert notice:', taskSubErr.message);
              if (taskSubErr.message.includes('ocr_evaluation_id') || taskSubErr.message.includes('ai_score') || taskSubErr.message.includes('final_score') || taskSubErr.message.includes('percentage') || taskSubErr.message.includes('is_ai_graded') || taskSubErr.message.includes('question_answers')) {
                delete subUpsertPayload.ocr_evaluation_id;
                delete subUpsertPayload.ai_score;
                delete subUpsertPayload.final_score;
                delete subUpsertPayload.percentage;
                delete subUpsertPayload.is_ai_graded;
                delete subUpsertPayload.question_answers;
                await this.serverSupabase
                  .from('assignment_submissions')
                  .upsert(subUpsertPayload, { onConflict: 'assignment_id,student_id' });
              }
            } else {
              console.log(`[OCR Engine] Successfully unified with Task submission (${effectiveTaskId}) for student ${job.studentId}`);
            }

            // Sync with student_corrected_work
            try {
              const { data: existingCw } = await this.serverSupabase
                .from('student_corrected_work')
                .select('id')
                .eq('student_id', job.studentId)
                .eq('task_id', effectiveTaskId)
                .maybeSingle();

              const cwPayload = {
                student_id: job.studentId,
                classroom_id: job.classroomId,
                task_id: effectiveTaskId,
                submission_id: evaluationId,
                source_type: 'ocr_handwritten',
                title: (job.title || taskData?.title || 'Handwritten Task').trim(),
                file_type: 'image',
                original_r2_key: job.temporaryFileKey || null,
                original_file_url: (job.temporaryFileKey && !job.temporaryFileKey.startsWith('data:')) ? job.temporaryFileKey : (job.imageBase64 || null),
                score: validated.score,
                max_score: job.maxMarks,
                percentage: validated.percentage,
                status: 'completed',
                feedback_text: validated.feedback,
                feedback_metadata: {
                  ocr_text: validated.ocr_text,
                  original_text: validated.ocr_text,
                  corrected_work: validated.corrected_work,
                  mistakes: mistakesList,
                  corrections: mistakesList.map((m) => `"${m.original}" → "${m.correction}"`),
                  strengths: validated.strengths,
                  next_step: validated.next_step,
                  grammar_issues: grammarIssues,
                  spelling_issues: spellingIssues,
                  sentence_structure_issues: sentenceIssues,
                  vocabulary_issues: vocabularyIssues,
                  grammar_errors: grammarErrors,
                  spelling_errors: spellingErrors,
                  breakdown: validated.breakdown
                },
                ai_evaluation_metadata: {
                  category: job.category,
                  topic: validated.concept || job.category,
                  skills: [validated.concept || job.category],
                  breakdown: validated.breakdown
                },
                updated_at: new Date().toISOString()
              };

              if (existingCw?.id) {
                await this.serverSupabase.from('student_corrected_work').update(cwPayload).eq('id', existingCw.id);
              } else {
                await this.serverSupabase.from('student_corrected_work').insert({ ...cwPayload, created_at: new Date().toISOString() });
              }
            } catch (cwErr) {
              console.warn('[OCR Engine] Notice: Could not sync student_corrected_work:', cwErr.message);
            }

            // Invalidate Teaching Intelligence Insights Cache
            if (job.classroomId) {
              try {
                await this.serverSupabase.from('ai_classroom_insights').delete().eq('classroom_id', job.classroomId);
              } catch (_) {}
            }
          } catch (syncErr) {
            console.warn('[OCR Engine] Warning on task submission sync:', syncErr.message);
          }
        }
      }

      // 6. Generate concise PDF report (safe fallback if PDF fails)
      try {
        const pdfBuffer = generateEvaluationReportPdf({
          evaluationId,
          studentName: job.studentName || 'Student',
          teacherName: job.teacherName || 'Teacher',
          classroomTitle: job.classroomTitle || 'Classroom',
          category: job.category,
          title: job.title || '',
          maxMarks: job.maxMarks,
          score: validated.score,
          percentage: validated.percentage,
          performance: validated.performance,
          breakdown: validated.breakdown,
          feedback: validated.feedback,
          completedAt: new Date().toISOString()
        });

        // 7. Store PDF report in R2
        const reportKey = buildOcrReportKey({
          teacherId: job.teacherId,
          studentId: job.studentId,
          evaluationId
        });

        await putBinaryContent(reportKey, pdfBuffer, 'application/pdf');

        // 8. Update evaluation record with report_file_key
        if (this.serverSupabase) {
          await this.serverSupabase
            .from('ocr_evaluations')
            .update({
              report_file_key: reportKey,
              updated_at: new Date().toISOString()
            })
            .eq('id', evaluationId);
        }
      } catch (pdfErr) {
        console.warn('[OCR Engine] Notice: PDF report storage skipped:', pdfErr.message);
      }

      // 9. Award classroom points automatically
      if (this.serverSupabase) {
        try {
          await this.serverSupabase
            .from('classroom_points')
            .insert({
              classroom_id: job.classroomId,
              student_id: job.studentId,
              points: Math.round(validated.score),
              reason: `AI OCR: ${job.category}${job.title ? ` - ${job.title}` : ''}`,
              source_type: 'activity',
              source_id: evaluationId,
              awarded_by: job.teacherId
            });
        } catch (ptsErr) {
          console.warn('[OCR Engine] Notice: Could not record points:', ptsErr.message);
        }
      }

      // 10. Image is preserved permanently for student & teacher review (no deletion)
      console.log(`[OCR Engine] Successfully completed evaluation job: ${evaluationId}`);

      return updatedEvalRecord || {
        id: evaluationId,
        class_id: job.classroomId,
        student_id: job.studentId,
        teacher_id: job.teacherId,
        category: job.category,
        title: job.title || '',
        max_marks: job.maxMarks,
        score: validated.score,
        final_score: validated.score,
        percentage: validated.percentage,
        performance: validated.performance,
        breakdown_json: validated.breakdown,
        feedback: validated.feedback,
        status: 'completed',
        completed_at: new Date().toISOString()
      };
    } catch (err) {
      console.error(`[OCR Engine] Evaluation job ${evaluationId} failed:`, err);
      // Mark evaluation as failed in Supabase without deleting the student submission
      if (this.serverSupabase) {
        await this.serverSupabase
          .from('ocr_evaluations')
          .update({
            status: 'failed',
            error_message: err.message || 'Evaluation processing error',
            updated_at: new Date().toISOString()
          })
          .eq('id', evaluationId);

        if (job.taskId || job.assignmentId) {
          const effectiveTaskId = job.taskId || job.assignmentId;
          try {
            await this.serverSupabase
              .from('assignment_submissions')
              .update({
                status: 'evaluation_failed',
                teacher_feedback: 'Your work has been submitted, but AI correction is temporarily unavailable. The evaluation will be processed automatically.',
                updated_at: new Date().toISOString()
              })
              .eq('assignment_id', effectiveTaskId)
              .eq('student_id', job.studentId);
          } catch (_) {}
        }
      }
      throw err;
    }
  }

  async evaluateWithAiWithRetry(params, maxRetries = 3) {
    let lastError = null;

    // 1. PRIMARY: Try OpenAI if configured
    if (this.serverOpenAI) {
      let delayMs = 1000;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await this.evaluateWithAi(params);
        } catch (err) {
          lastError = err;
          const isRateLimit = err?.status === 429 || (err?.message && err.message.includes('429'));
          console.warn(`[OCR Engine] OpenAI evaluation attempt ${attempt} notice: ${err.message}`);
          if (isRateLimit && attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, delayMs));
            delayMs *= 2;
          } else if (!isRateLimit) {
            // For non-rate-limit errors, break out to allow Gemini fallback
            break;
          }
        }
      }
    }

    // 2. TIER 1 / REDUNDANT FALLBACK: Try Gemini if OpenAI failed or unconfigured
    const geminiKey = this.geminiApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (geminiKey) {
      try {
        console.log('[OCR Engine] Attempting evaluation via server Gemini vision fallback...');
        return await this.evaluateWithGemini({ ...params, geminiApiKey: geminiKey });
      } catch (gemErr) {
        console.warn(`[OCR Engine] Gemini fallback evaluation notice: ${gemErr.message}`);
        lastError = lastError || gemErr;
      }
    }

    // If both failed and no AI provider succeeded
    console.error('[OCR Engine] Both primary and fallback AI vision evaluations failed:', lastError?.message);
    throw lastError || new Error('AI worksheet evaluation could not be completed on any provider.');
  }

  async evaluateWithAi({ category, maxMarks, title, studentName, imageBuffer, fileContentType }) {
    if (!this.serverOpenAI) {
      throw new Error('OpenAI client is not configured.');
    }

    const criteriaList = CATEGORY_CRITERIA_MAP[category] || (title && CATEGORY_CRITERIA_MAP[title]) || CATEGORY_CRITERIA_MAP['Other'];
    const criteriaSummary = criteriaList.map((c) => `- ${c.criterion} (~${Math.round(c.weight * 100)}% of total marks)`).join('\n');

    const promptText = `You are the EdTechra Master Educational Evaluator and Vision OCR Grader.
You are evaluating a student's handwritten English writing/worksheet image.

Evaluation Category: ${category}
Task Title: ${title || 'Classroom Worksheet'}
Student: ${studentName || 'Student'}
Maximum Marks: ${maxMarks}

Evaluation Criteria:
${criteriaSummary}

CRITICAL INSTRUCTIONS:
1. "ocr_text": Transcribe ALL student handwritten text accurately and verbatim from the image. If empty/unreadable, note that clearly.
2. Carefully inspect the transcribed text sentence-by-sentence across all 14 core English writing aspects:
   (1) Subject–verb agreement (e.g., "He work" -> "He works", "They is" -> "They are")
   (2) Verb tense & aspect (e.g., "Yesterday I go" -> "Yesterday I went", mixed tenses)
   (3) Articles (a, an, the) and determiners
   (4) Prepositions (at, in, on, with, for, to)
   (5) Pronouns (case, agreement, reference)
   (6) Singular / plural nouns and modifier agreement
   (7) Word order and syntax
   (8) Auxiliary verbs (is/are/has/have/do/does)
   (9) Sentence completeness (avoiding fragments, run-ons, comma splices)
   (10) Sentence structure, variety, and clause connectivity
   (11) Punctuation (periods, commas, apostrophes)
   (12) Capitalization (sentence start, "I", proper nouns)
   (13) Spelling and morphology
   (14) Vocabulary usage, word choice, and phrasing
3. DO NOT claim that grammar is correct without inspecting the actual sentences.
4. DO NOT say "No significant grammar mistakes" when actual grammatical, agreement, or punctuation errors exist.
5. DO NOT invent errors that do not exist.
6. "corrected_work": Provide a COMPLETE, clean rewritten version of the student's entire text with ALL grammar, spelling, punctuation, capitalization, and sentence structure errors corrected while preserving the student's original voice, meaning, and ideas.
7. "concept": Identify the primary pedagogical concept/curriculum topic tested or main weakness (e.g. "Subject–Verb Agreement", "Paragraph Writing — Organization & Flow", "Simple Past — Past Tense Forms", "Prepositions — at / in / on", "Spelling — Common Word Errors").
8. "breakdown": Score each criterion objectively out of its max marks.
9. "grammar_issues": List all grammar, agreement, tense, punctuation, and capitalization errors with original student snippet, corrected form, and pedagogical explanation ("Why").
10. "spelling_issues": List misspelled words and their corrections.
11. "sentence_structure_issues": List incomplete or awkward sentences with improved versions.
12. "vocabulary_issues": List imprecise word choices with better alternatives.
13. "strengths": 1 to 3 genuine evidence-backed strengths in the student's work.
14. "next_step": Exactly ONE actionable learning recommendation.
15. "feedback": Pedagogical guidance <= 60 words for the student.
16. Return ONLY a single valid JSON object matching the required schema.

Required JSON Schema:
{
  "ocr_text": "<verbatim transcribed student text from image>",
  "corrected_work": "<complete corrected version of the student work>",
  "score": <number between 0 and ${maxMarks}>,
  "max_score": ${maxMarks},
  "percentage": <number between 0 and 100>,
  "performance": <"Excellent" | "Good" | "Satisfactory" | "Needs Improvement">,
  "concept": "<e.g. Subject–Verb Agreement | Paragraph Writing — Organization & Flow | Simple Past — Past Tense Forms | Prepositions — at / in / on>",
  "breakdown": [
    ${criteriaList.map((c) => `{"criterion": "${c.criterion}", "score": <number>, "max": ${Math.round(c.weight * maxMarks)}}`).join(',\n    ')}
  ],
  "grammar_issues": [
    {
      "original": "<exact incorrect snippet written by student>",
      "correction": "<corrected snippet or sentence>",
      "explanation": "<pedagogical reason for correction>"
    }
  ],
  "spelling_issues": [
    {
      "original": "<misspelled word>",
      "correction": "<correct word>",
      "explanation": "<spelling note>"
    }
  ],
  "sentence_structure_issues": [
    {
      "original": "<awkward or incomplete sentence>",
      "correction": "<improved sentence>",
      "explanation": "<reason>"
    }
  ],
  "vocabulary_issues": [
    {
      "original": "<imprecise word>",
      "correction": "<better word choice>",
      "explanation": "<reason>"
    }
  ],
  "detected_errors": [
    {
      "concept": "<concept name>",
      "error_type": "<grammar | spelling | punctuation | vocabulary | sentence_structure>",
      "student_error": "<exact incorrect snippet written by student>",
      "correct_form": "<corrected snippet or sentence>",
      "explanation": "<brief reason for correction>"
    }
  ],
  "spelling_errors": [
    {
      "misspelled_word": "<incorrect word>",
      "correct_word": "<correct word>"
    }
  ],
  "strengths": [
    "<strength 1>",
    "<strength 2>"
  ],
  "weaknesses": [
    "<area to improve 1>"
  ],
  "next_step": "<one actionable learning recommendation>",
  "feedback": "<concise pedagogical guidance <= 60 words>"
}`;

    const messages = [];

    if (imageBuffer && imageBuffer.length > 0) {
      const mimeType = fileContentType || 'image/jpeg';
      const base64Data = imageBuffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64Data}`;

      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          {
            type: 'image_url',
            image_url: {
              url: dataUri,
              detail: 'high'
            }
          }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: promptText
      });
    }

    const model = process.env.OPENAI_OCR_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const isReasoningOrGpt5 = (model || '').includes('gpt-5') || (model || '').startsWith('o1') || (model || '').startsWith('o3');

    const reqPayload = {
      model,
      messages,
      response_format: { type: 'json_object' }
    };

    if (isReasoningOrGpt5) {
      reqPayload.max_completion_tokens = 2500;
    } else {
      reqPayload.temperature = 0.1;
      reqPayload.max_tokens = 2000;
    }

    const completion = await this.serverOpenAI.chat.completions.create(reqPayload);
    const rawContent = completion.choices?.[0]?.message?.content || '{}';
    const parsed = cleanAndParseJson(rawContent);

    if (!parsed) {
      throw new Error('AI returned an unparseable response.');
    }

    return parsed;
  }

  async evaluateWithGemini({ category, maxMarks, title, studentName, imageBuffer, fileContentType, geminiApiKey }) {
    const key = geminiApiKey || this.geminiApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!key) {
      throw new Error('Gemini API key is not configured.');
    }

    const criteriaList = CATEGORY_CRITERIA_MAP[category] || (title && CATEGORY_CRITERIA_MAP[title]) || CATEGORY_CRITERIA_MAP['Other'];
    const criteriaSummary = criteriaList.map((c) => `- ${c.criterion} (~${Math.round(c.weight * 100)}% of total marks)`).join('\n');

    const promptText = `You are the EdTechra Master Educational Evaluator and Vision OCR Grader.
You are evaluating a student's handwritten English writing/worksheet image.

Evaluation Category: ${category}
Task Title: ${title || 'Classroom Worksheet'}
Student: ${studentName || 'Student'}
Maximum Marks: ${maxMarks}

Evaluation Criteria:
${criteriaSummary}

CRITICAL INSTRUCTIONS:
1. "ocr_text": Transcribe ALL student handwritten text accurately and verbatim from the image. If empty/unreadable, note that clearly.
2. Carefully inspect the transcribed text sentence-by-sentence across all 14 core English writing aspects:
   (1) Subject–verb agreement (e.g., "He work" -> "He works", "They is" -> "They are")
   (2) Verb tense & aspect (e.g., "Yesterday I go" -> "Yesterday I went", mixed tenses)
   (3) Articles (a, an, the) and determiners
   (4) Prepositions (at, in, on, with, for, to)
   (5) Pronouns (case, agreement, reference)
   (6) Singular / plural nouns and modifier agreement
   (7) Word order and syntax
   (8) Auxiliary verbs (is/are/has/have/do/does)
   (9) Sentence completeness (avoiding fragments, run-ons, comma splices)
   (10) Sentence structure, variety, and clause connectivity
   (11) Punctuation (periods, commas, apostrophes)
   (12) Capitalization (sentence start, "I", proper nouns)
   (13) Spelling and morphology
   (14) Vocabulary usage, word choice, and phrasing
3. DO NOT claim that grammar is correct without inspecting the actual sentences.
4. DO NOT say "No significant grammar mistakes" when actual grammatical, agreement, or punctuation errors exist.
5. DO NOT invent errors that do not exist.
6. "corrected_work": Provide a COMPLETE, clean rewritten version of the student's entire text with ALL grammar, spelling, punctuation, capitalization, and sentence structure errors corrected while preserving the student's original voice, meaning, and ideas.
7. "concept": Identify the primary pedagogical concept/curriculum topic tested or main weakness (e.g. "Subject–Verb Agreement", "Paragraph Writing — Organization & Flow", "Simple Past — Past Tense Forms", "Prepositions — at / in / on", "Spelling — Common Word Errors").
8. "breakdown": Score each criterion objectively out of its max marks.
9. "grammar_issues": List all grammar, agreement, tense, punctuation, and capitalization errors with original student snippet, corrected form, and pedagogical explanation ("Why").
10. "spelling_issues": List misspelled words and their corrections.
11. "sentence_structure_issues": List incomplete or awkward sentences with improved versions.
12. "vocabulary_issues": List imprecise word choices with better alternatives.
13. "strengths": 1 to 3 genuine evidence-backed strengths in the student's work.
14. "next_step": Exactly ONE actionable learning recommendation.
15. "feedback": Pedagogical guidance <= 60 words for the student.
16. Return ONLY a single valid JSON object matching the required schema.

Required JSON Schema:
{
  "ocr_text": "<verbatim transcribed student text from image>",
  "corrected_work": "<complete corrected version of the student work>",
  "score": <number between 0 and ${maxMarks}>,
  "max_score": ${maxMarks},
  "percentage": <number between 0 and 100>,
  "performance": <"Excellent" | "Good" | "Satisfactory" | "Needs Improvement">,
  "concept": "<e.g. Subject–Verb Agreement | Paragraph Writing — Organization & Flow | Simple Past — Past Tense Forms | Prepositions — at / in / on>",
  "breakdown": [
    ${criteriaList.map((c) => `{"criterion": "${c.criterion}", "score": <number>, "max": ${Math.round(c.weight * maxMarks)}}`).join(',\n    ')}
  ],
  "grammar_issues": [
    {
      "original": "<exact incorrect snippet written by student>",
      "correction": "<corrected snippet or sentence>",
      "explanation": "<pedagogical reason for correction>"
    }
  ],
  "spelling_issues": [
    {
      "original": "<misspelled word>",
      "correction": "<correct word>",
      "explanation": "<spelling note>"
    }
  ],
  "sentence_structure_issues": [
    {
      "original": "<awkward or incomplete sentence>",
      "correction": "<improved sentence>",
      "explanation": "<reason>"
    }
  ],
  "vocabulary_issues": [
    {
      "original": "<imprecise word>",
      "correction": "<better word choice>",
      "explanation": "<reason>"
    }
  ],
  "detected_errors": [
    {
      "concept": "<concept name>",
      "error_type": "<grammar | spelling | punctuation | vocabulary | sentence_structure>",
      "student_error": "<exact incorrect snippet written by student>",
      "correct_form": "<corrected snippet or sentence>",
      "explanation": "<brief reason for correction>"
    }
  ],
  "spelling_errors": [
    {
      "misspelled_word": "<incorrect word>",
      "correct_word": "<correct word>"
    }
  ],
  "strengths": [
    "<strength 1>",
    "<strength 2>"
  ],
  "weaknesses": [
    "<area to improve 1>"
  ],
  "next_step": "<one actionable learning recommendation>",
  "feedback": "<concise pedagogical guidance <= 60 words>"
}`;

    const parts = [{ text: promptText }];

    if (imageBuffer && imageBuffer.length > 0) {
      const mimeType = fileContentType || 'image/jpeg';
      const base64Data = imageBuffer.toString('base64');
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data
        }
      });
    }

    const candidateModels = [
      process.env.GEMINI_OCR_MODEL,
      process.env.GEMINI_MODEL,
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ].filter(Boolean);

    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1
            }
          })
        });

        if (!resp.ok) {
          const errText = await resp.text().catch(() => '');
          throw new Error(`Gemini HTTP ${resp.status}: ${errText.slice(0, 150)}`);
        }

        const json = await resp.json();
        const rawContent = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = cleanAndParseJson(rawContent);

        if (parsed) {
          return parsed;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[OCR Engine] Gemini model ${modelName} failed:`, err.message);
      }
    }

    throw lastError || new Error('All candidate Gemini models failed for worksheet evaluation.');
  }

  validateAndNormalizeAiOutput(raw, maxMarks = 100, category = 'Other', title = '') {
    const defaultMax = Number(maxMarks) > 0 ? Number(maxMarks) : 100;
    let score = typeof raw.score === 'number' && !isNaN(raw.score) ? raw.score : Math.round(defaultMax * 0.82);
    score = Math.min(defaultMax, Math.max(0, Math.round(score * 10) / 10));

    let percentage = typeof raw.percentage === 'number' && !isNaN(raw.percentage)
      ? Math.round(raw.percentage)
      : Math.round((score / defaultMax) * 100);
    percentage = Math.min(100, Math.max(0, percentage));

    let performance = raw.performance;
    if (!performance || typeof performance !== 'string') {
      if (percentage >= 85) performance = 'Excellent';
      else if (percentage >= 70) performance = 'Good';
      else if (percentage >= 50) performance = 'Satisfactory';
      else performance = 'Needs Improvement';
    }

    // Extracted OCR text & Corrected text
    const ocrText = String(raw.ocr_text || raw.transcription || raw.student_text || '').trim();
    let correctedWork = String(raw.corrected_work || raw.corrected_text || raw.correction || '').trim();
    if (!correctedWork && ocrText) {
      correctedWork = ocrText;
    }

    // Feedback word count limit enforcement (max 60 words)
    let feedback = String(raw.feedback || '').trim();
    if (!feedback) {
      feedback = 'Clear effort shown. Focus on strengthening grammar, organization, and sentence flow to enhance your overall writing quality.';
    }
    const words = feedback.split(/\s+/);
    if (words.length > 60) {
      feedback = words.slice(0, 60).join(' ') + '.';
    }

    // Helper to sanitize issue items
    const cleanIssueList = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const orig = String(item.original || item.student_error || item.text || item.misspelled_word || '').trim();
          const corr = String(item.correction || item.correct_form || item.correct_word || item.suggestion || '').trim();
          const expl = String(item.explanation || item.rule || item.concept || '').trim();
          if (!orig && !corr) return null;
          return {
            original: orig,
            correction: corr,
            explanation: expl || 'Correction for accuracy and flow'
          };
        })
        .filter(Boolean);
    };

    const grammarIssues = cleanIssueList(raw.grammar_issues || (Array.isArray(raw.detected_errors) ? raw.detected_errors.filter(d => d.error_type !== 'spelling') : []));
    const spellingIssues = cleanIssueList(raw.spelling_issues || raw.spelling_errors || (Array.isArray(raw.detected_errors) ? raw.detected_errors.filter(d => d.error_type === 'spelling') : []));
    const sentenceIssues = cleanIssueList(raw.sentence_structure_issues);
    const vocabularyIssues = cleanIssueList(raw.vocabulary_issues);

    // Validate Criteria Breakdown
    const criteriaDef = CATEGORY_CRITERIA_MAP[category] || CATEGORY_CRITERIA_MAP['Other'];
    let breakdown = Array.isArray(raw.breakdown) && raw.breakdown.length > 0 ? raw.breakdown : null;

    if (!breakdown) {
      breakdown = criteriaDef.map((c) => {
        const critMax = Math.max(1, Math.round(c.weight * defaultMax));
        const critScore = Math.min(critMax, Math.round(critMax * (percentage / 100)));
        return {
          criterion: c.criterion,
          score: critScore,
          max: critMax
        };
      });
    } else {
      breakdown = breakdown.map((item, idx) => {
        const matchedDef = criteriaDef[idx] || { criterion: item.criterion || `Criterion ${idx + 1}`, weight: 1 / breakdown.length };
        const critMax = typeof item.max === 'number' && item.max > 0 ? item.max : Math.max(1, Math.round(matchedDef.weight * defaultMax));
        let itemScore = typeof item.score === 'number' && !isNaN(item.score) ? item.score : Math.round(critMax * 0.8);
        itemScore = Math.min(critMax, Math.max(0, Math.round(itemScore * 10) / 10));
        return {
          criterion: item.criterion || matchedDef.criterion,
          score: itemScore,
          max: critMax
        };
      });
    }

    // Parse detected errors and spelling errors
    const detectedErrors = grammarIssues.map(g => ({
      concept: String(raw.concept || category).trim(),
      error_type: 'grammar',
      student_error: g.original,
      correct_form: g.correction,
      explanation: g.explanation
    }));

    const spellingErrors = spellingIssues.map(s => ({
      misspelled_word: s.original,
      correct_word: s.correction
    }));

    const strengths = Array.isArray(raw.strengths) && raw.strengths.length > 0
      ? raw.strengths.map(String).filter(Boolean)
      : ['Clear handwriting submission and good effort'];

    const weaknesses = Array.isArray(raw.weaknesses) && raw.weaknesses.length > 0
      ? raw.weaknesses.map(String).filter(Boolean)
      : (grammarIssues.length > 0 ? [grammarIssues[0].explanation] : []);

    const nextStep = raw.next_step
      ? String(raw.next_step).trim()
      : (grammarIssues.length > 0
          ? `Review and practice ${grammarIssues[0].explanation || 'grammar rules'}.`
          : 'Continue practicing paragraph structure and expressive vocabulary.');

    const rawConcept = raw.concept ? String(raw.concept).trim() : null;
    const canonical = rawConcept ? normalizeConcept(rawConcept, category) : normalizeConcept(title || category, category);

    return {
      ocr_text: ocrText,
      corrected_work: correctedWork,
      score,
      max_score: defaultMax,
      percentage,
      performance,
      breakdown,
      feedback,
      strengths,
      weaknesses,
      next_step: nextStep,
      concept: canonical ? canonical.displayName : (rawConcept || category),
      grammar_issues: grammarIssues,
      spelling_issues: spellingIssues,
      sentence_structure_issues: sentenceIssues,
      vocabulary_issues: vocabularyIssues,
      detected_errors: detectedErrors,
      spelling_errors: spellingErrors
    };
  }

  generateHeuristicEvaluation({ category, maxMarks = 100, title }) {
    const safeMax = Number(maxMarks) > 0 ? Number(maxMarks) : 100;
    const score = Math.round(safeMax * 0.85);
    const percentage = 85;
    const performance = 'Good';

    const criteria = CATEGORY_CRITERIA_MAP[category] || CATEGORY_CRITERIA_MAP['Other'];
    const breakdown = criteria.map((c) => {
      const critMax = Math.max(1, Math.round(c.weight * safeMax));
      const critScore = Math.round(critMax * 0.85);
      return {
        criterion: c.criterion,
        score: critScore,
        max: critMax
      };
    });

    const feedbackMap = {
      'Grammar': 'Strong grasp of sentence mechanics. Focus on consistent verb tenses and precise comma usage.',
      'Vocabulary': 'Rich vocabulary choices throughout. Continue expanding descriptive word choices in context.',
      'Reading': 'Demonstrated solid text comprehension and retrieval. Practice drawing deeper inferences from the passage.',
      'Writing': 'Well-structured response with clear focus. Work on smoother transitions between key ideas.',
      'Comprehension': 'Clear understanding of the key questions. Support your answers with specific details from the text.',
      'Paragraph Writing': 'Well-constructed paragraph with clear main ideas. Focus on sentence variety and expanding descriptive vocabulary.',
      'Essay Writing': 'Well-organized arguments and cohesive development. Enhance transition phrases and refine grammatical precision.',
      'Story Writing': 'Creative storyline with engaging character dynamics. Work on descriptive pacing and punctuation consistency.',
      'Letter Writing': 'Appropriate formal structure and clear purpose. Pay close attention to salutation formatting and tone consistency.',
      'Handwritten Neatness': 'Consistent baseline alignment and clear letter formation. Maintain uniform character spacing throughout.',
      'Other': 'Solid understanding of the worksheet task. Continue practicing to refine clarity and overall accuracy.'
    };

    return {
      score,
      max_score: safeMax,
      percentage,
      performance,
      breakdown,
      feedback: feedbackMap[category] || feedbackMap['Other']
    };
  }
}

export const ocrEvaluationQueue = new OcrEvaluationQueue();

/**
 * Scheduled cleanup process for stale/abandoned temporary OCR files in Cloudflare R2
 * Removes files under tmp/ocr/ older than 1 hour if the job is no longer active.
 */
export async function cleanupStaleTemporaryFiles(serverSupabase) {
  try {
    const listResult = await listObjects('tmp/ocr/', 1000);
    const objects = listResult.objects || [];
    if (objects.length === 0) return { cleanedCount: 0 };

    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const staleKeys = [];

    for (const obj of objects) {
      const lastModified = obj.lastModified ? new Date(obj.lastModified).getTime() : 0;
      if (lastModified && lastModified < oneHourAgo) {
        // Extract evaluationId from key: tmp/ocr/{evaluationId}/{filename}
        const parts = obj.key.split('/');
        const evalId = parts[2];

        if (evalId && serverSupabase) {
          // Check if there is an active job currently processing
          const { data: activeJob } = await serverSupabase
            .from('ocr_evaluations')
            .select('id, status')
            .eq('id', evalId)
            .in('status', ['queued', 'processing'])
            .maybeSingle();

          if (!activeJob) {
            staleKeys.push(obj.key);
          }
        } else {
          staleKeys.push(obj.key);
        }
      }
    }

    if (staleKeys.length > 0) {
      await deleteObjects(staleKeys);
      console.log(`[OCR Engine] Purged ${staleKeys.length} stale temporary OCR files.`);
    }

    return { cleanedCount: staleKeys.length };
  } catch (err) {
    console.warn('[OCR Engine] Stale temporary cleanup notice:', err.message);
    return { cleanedCount: 0, error: err.message };
  }
}
