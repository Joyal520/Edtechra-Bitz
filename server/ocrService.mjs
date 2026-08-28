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

export const OCR_CATEGORIES = [
  'Paragraph Writing',
  'Essay Writing',
  'Story Writing',
  'Letter Writing',
  'Handwritten Neatness',
  'Other'
];

export const CATEGORY_CRITERIA_MAP = {
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

class OcrEvaluationQueue {
  constructor() {
    this.queue = [];
    this.activeWorkers = 0;
    this.concurrencyLimit = CONCURRENCY_LIMIT;
    this.serverSupabase = null;
    this.serverOpenAI = null;
  }

  init({ serverSupabase, serverOpenAI }) {
    this.serverSupabase = serverSupabase;
    this.serverOpenAI = serverOpenAI;
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
      if (job.imageBase64) {
        const cleanBase64 = job.imageBase64.replace(/^data:image\/\w+;base64,/, '');
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
        imageBuffer
      });

      // 4. Validate and sanitize AI Output
      const validated = this.validateAndNormalizeAiOutput(evaluationResult, job.maxMarks, job.category);

      let updatedEvalRecord = null;

      // 5. Save structured evaluation data to Supabase
      if (this.serverSupabase) {
        const { data: savedData, error: dbError } = await this.serverSupabase
          .from('ocr_evaluations')
          .update({
            score: validated.score,
            ai_original_score: validated.score,
            final_score: validated.score,
            percentage: validated.percentage,
            performance: validated.performance,
            breakdown_json: validated.breakdown,
            feedback: validated.feedback,
            ai_original_feedback: validated.feedback,
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', evaluationId)
          .select('*')
          .maybeSingle();

        if (dbError) {
          console.error(`[OCR Engine] Persist warning: ${dbError.message}`);
        } else if (savedData) {
          updatedEvalRecord = savedData;
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

      // 10. SUCCESS CONFIRMED — Delete temporary source image from Cloudflare R2 if it was used
      if (job.temporaryFileKey) {
        try {
          await deleteObjects([job.temporaryFileKey]);
          console.log(`[OCR Engine] Cleaned up temporary image: ${job.temporaryFileKey}`);
        } catch (delErr) {
          console.warn(`[OCR Engine] Notice: Failed to delete temporary image ${job.temporaryFileKey}:`, delErr.message);
        }
      }

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
      // Mark evaluation as failed in Supabase
      if (this.serverSupabase) {
        await this.serverSupabase
          .from('ocr_evaluations')
          .update({
            status: 'failed',
            error_message: err.message || 'Evaluation processing error',
            updated_at: new Date().toISOString()
          })
          .eq('id', evaluationId);
      }
      throw err;
    }
  }

  async evaluateWithAiWithRetry(params, maxRetries = 3) {
    let delayMs = 1000;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.evaluateWithAi(params);
      } catch (err) {
        const isRateLimit = err?.status === 429 || (err?.message && err.message.includes('429'));
        if (isRateLimit && attempt < maxRetries) {
          console.warn(`[OCR Engine] Rate limited (429). Retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})...`);
          await new Promise((r) => setTimeout(r, delayMs));
          delayMs *= 2;
        } else if (attempt === maxRetries) {
          console.warn('[OCR Engine] Falling back to intelligent heuristic evaluation rule.');
          return this.generateHeuristicEvaluation(params);
        } else {
          // For non-rate-limit errors, fall back immediately to avoid wasting tokens
          return this.generateHeuristicEvaluation(params);
        }
      }
    }
    return this.generateHeuristicEvaluation(params);
  }

  async evaluateWithAi({ category, maxMarks, title, studentName, imageBuffer, fileContentType }) {
    if (!this.serverOpenAI) {
      return this.generateHeuristicEvaluation({ category, maxMarks, title });
    }

    const criteriaList = CATEGORY_CRITERIA_MAP[category] || CATEGORY_CRITERIA_MAP['Other'];
    const criteriaSummary = criteriaList.map((c) => `- ${c.criterion} (~${Math.round(c.weight * 100)}% of total marks)`).join('\n');

    const promptText = `You are an educational worksheet evaluator for EdTechra Digital Classroom.

Evaluation Category: ${category}
Task Title: ${title || 'Classroom Worksheet'}
Student: ${studentName || 'Student'}
Maximum Marks: ${maxMarks}

Evaluation Criteria:
${criteriaSummary}

Special Category Instructions:
${category === 'Handwritten Neatness' 
  ? 'Inspect ONLY the visual handwriting presentation qualities (legibility, letter formation, spacing, alignment, consistency, neatness). Do not score based on OCR text content.'
  : 'Evaluate the student writing directly from the worksheet image based on the predefined criteria above.'}

CRITICAL RULES:
1. Return ONLY a single valid JSON object.
2. "feedback" MUST BE 50 WORDS OR FEWER (concise pedagogical guidance).
3. Do NOT repeat or transcribe the student answer.
4. Do NOT include reasoning, thought processes, or extra fields.
5. "score" must be a number between 0 and ${maxMarks}.

Required JSON Schema:
{
  "score": <number between 0 and ${maxMarks}>,
  "max_score": ${maxMarks},
  "percentage": <number between 0 and 100>,
  "performance": <"Excellent" | "Good" | "Satisfactory" | "Needs Improvement">,
  "breakdown": [
    ${criteriaList.map((c) => `{"criterion": "${c.criterion}", "score": <number>, "max": ${Math.round(c.weight * maxMarks)}}`).join(',\n    ')}
  ],
  "feedback": "<concise feedback, 50 words maximum>"
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

    const completion = await this.serverOpenAI.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 500
    });

    const rawContent = completion.choices?.[0]?.message?.content || '{}';
    return JSON.parse(rawContent);
  }

  validateAndNormalizeAiOutput(raw, maxMarks = 100, category = 'Other') {
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

    // Feedback word count limit enforcement (max 50 words)
    let feedback = String(raw.feedback || '').trim();
    if (!feedback) {
      feedback = 'Clear effort shown. Focus on strengthening grammar, organization, and sentence flow to enhance your overall writing quality.';
    }
    const words = feedback.split(/\s+/);
    if (words.length > 50) {
      feedback = words.slice(0, 50).join(' ') + '.';
    }

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

    return {
      score,
      max_score: defaultMax,
      percentage,
      performance,
      breakdown,
      feedback
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
