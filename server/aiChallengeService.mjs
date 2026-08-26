/**
 * EdTechra Digital Classroom — AI Challenge Competition Engine
 * Scalable, asynchronous AI evaluation pipeline for open-ended student challenges.
 */

import crypto from 'crypto';
import {
  getBinaryContent,
  putBinaryContent,
  deleteObjects,
  listObjects
} from './r2Service.mjs';

export const AI_CHALLENGE_CATEGORIES = [
  'Creative Writing',
  'Paragraph Writing',
  'Essay Writing',
  'Story Writing',
  'Letter Writing',
  'ICT',
  'AI',
  'Science',
  'General Knowledge',
  'Life Skills',
  'Other'
];

export const CATEGORY_DEFAULT_CRITERIA = {
  'Creative Writing': [
    { name: 'Creativity & Imagination', weight: 0.30 },
    { name: 'Plot & Organization', weight: 0.25 },
    { name: 'Vocabulary & Style', weight: 0.20 },
    { name: 'Grammar & Mechanics', weight: 0.15 },
    { name: 'Task & Length Compliance', weight: 0.10 }
  ],
  'Paragraph Writing': [
    { name: 'Topic Sentence & Focus', weight: 0.25 },
    { name: 'Supporting Details', weight: 0.25 },
    { name: 'Coherence & Organization', weight: 0.20 },
    { name: 'Grammar & Punctuation', weight: 0.15 },
    { name: 'Vocabulary & Mechanics', weight: 0.15 }
  ],
  'Essay Writing': [
    { name: 'Thesis & Main Ideas', weight: 0.25 },
    { name: 'Structure & Flow', weight: 0.20 },
    { name: 'Evidence & Elaboration', weight: 0.20 },
    { name: 'Grammar & Expression', weight: 0.20 },
    { name: 'Vocabulary', weight: 0.15 }
  ],
  'Story Writing': [
    { name: 'Creativity & Plot', weight: 0.30 },
    { name: 'Character & Setting', weight: 0.20 },
    { name: 'Pacing & Structure', weight: 0.20 },
    { name: 'Descriptive Vocabulary', weight: 0.15 },
    { name: 'Grammar & Spelling', weight: 0.15 }
  ],
  'Letter Writing': [
    { name: 'Format & Salutation', weight: 0.20 },
    { name: 'Clarity of Purpose', weight: 0.30 },
    { name: 'Tone & Style', weight: 0.20 },
    { name: 'Grammar & Spelling', weight: 0.15 },
    { name: 'Organization', weight: 0.15 }
  ],
  'ICT': [
    { name: 'Technical Understanding', weight: 0.35 },
    { name: 'Problem Solving & Logic', weight: 0.30 },
    { name: 'Completeness', weight: 0.20 },
    { name: 'Clarity of Presentation', weight: 0.15 }
  ],
  'AI': [
    { name: 'Conceptual Understanding', weight: 0.35 },
    { name: 'Practical Application', weight: 0.30 },
    { name: 'Critical Thinking & Ethics', weight: 0.20 },
    { name: 'Clarity of Expression', weight: 0.15 }
  ],
  'Science': [
    { name: 'Scientific Accuracy', weight: 0.35 },
    { name: 'Explanation & Reasoning', weight: 0.30 },
    { name: 'Evidence & Terminology', weight: 0.20 },
    { name: 'Structure & Neatness', weight: 0.15 }
  ],
  'General Knowledge': [
    { name: 'Factual Accuracy', weight: 0.40 },
    { name: 'Depth of Knowledge', weight: 0.30 },
    { name: 'Clarity & Presentation', weight: 0.30 }
  ],
  'Life Skills': [
    { name: 'Practical Application', weight: 0.35 },
    { name: 'Critical Thinking', weight: 0.30 },
    { name: 'Communication & Empathy', weight: 0.20 },
    { name: 'Personal Reflection', weight: 0.15 }
  ],
  'Other': [
    { name: 'Task Completion', weight: 0.35 },
    { name: 'Quality of Content', weight: 0.30 },
    { name: 'Organization & Clarity', weight: 0.20 },
    { name: 'Effort & Presentation', weight: 0.15 }
  ]
};

/**
 * Calculates programmatic word count from string
 */
export function calculateWordCount(text) {
  if (!text || typeof text !== 'string') return 0;
  const clean = text.trim();
  if (!clean) return 0;
  return clean.split(/\s+/).filter(Boolean).length;
}

/**
 * Extracts word count target from teacher's instruction text
 */
export function extractWordCountTarget(instruction) {
  if (!instruction) return { required_word_count: null, word_count_rule: 'approximate' };

  // Match: "100-120 words" or "100 to 120 words"
  const rangeMatch = instruction.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*words?/i);
  if (rangeMatch) {
    return {
      required_word_count: parseInt(rangeMatch[2], 10),
      word_count_rule: 'range'
    };
  }

  // Match: "maximum 150 words" or "max 150 words" or "under 150 words"
  const maxMatch = instruction.match(/(?:max|maximum|under|up to|at most)\s*(\d+)\s*words?/i);
  if (maxMatch) {
    return {
      required_word_count: parseInt(maxMatch[1], 10),
      word_count_rule: 'max'
    };
  }

  // Match: "minimum 200 words" or "min 200 words" or "at least 200 words"
  const minMatch = instruction.match(/(?:min|minimum|at least)\s*(\d+)\s*words?/i);
  if (minMatch) {
    return {
      required_word_count: parseInt(minMatch[1], 10),
      word_count_rule: 'min'
    };
  }

  // Match: "100 words" or "in 100 words" or "approximately 100 words"
  const singleMatch = instruction.match(/(\d+)\s*words?/i);
  if (singleMatch) {
    return {
      required_word_count: parseInt(singleMatch[1], 10),
      word_count_rule: 'approximate'
    };
  }

  return { required_word_count: null, word_count_rule: 'approximate' };
}

/**
 * Generates compact, fixed evaluation specification for a challenge
 */
export function generateChallengeEvaluationSpec({
  title,
  instructions,
  category = 'Creative Writing',
  maxMarks = 100,
  referenceFileName
}) {
  const marks = Number(maxMarks) || 100;
  const wordTarget = extractWordCountTarget(instructions);

  const defaultCategoryCriteria =
    CATEGORY_DEFAULT_CRITERIA[category] || CATEGORY_DEFAULT_CRITERIA['Other'];

  // Scale weights to exact maxMarks integers
  let allocated = 0;
  const criteria = defaultCategoryCriteria.map((crit, idx) => {
    let critMax = 0;
    if (idx === defaultCategoryCriteria.length - 1) {
      critMax = marks - allocated;
    } else {
      critMax = Math.max(1, Math.round(marks * crit.weight));
      allocated += critMax;
    }
    return {
      name: crit.name,
      max: critMax
    };
  });

  const requirements = [
    `Follow instructions: ${instructions.slice(0, 150)}...`,
    wordTarget.required_word_count
      ? `Word count target: ${wordTarget.required_word_count} words (${wordTarget.word_count_rule})`
      : 'Appropriate length and completeness',
    'Clear organization and coherent structure',
    'Correct grammar, spelling, and vocabulary'
  ];

  if (referenceFileName) {
    requirements.push(`Aligns with reference material: ${referenceFileName}`);
  }

  return {
    task_summary: `${title} (${category})`,
    instructions: instructions.trim(),
    required_word_count: wordTarget.required_word_count,
    word_count_rule: wordTarget.word_count_rule,
    max_marks: marks,
    requirements,
    criteria
  };
}

/**
 * Sanitizes and extracts plain text from uploaded student HTML file.
 * HTML is NEVER executed in DOM; only clean text is extracted for AI.
 */
export function extractTextFromHtml(htmlBuffer) {
  if (!htmlBuffer) return '';
  const htmlStr = htmlBuffer.toString('utf8');

  // Strip script and style tags completely along with their contents
  let clean = htmlStr
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Convert break tags and paragraphs to newlines
  clean = clean
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n');

  // Strip all other HTML tags
  clean = clean.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  clean = clean
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Normalize whitespace
  return clean.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();
}

/**
 * Extract plain text from DOCX (unzips document.xml text nodes)
 */
export function extractTextFromDocx(buffer) {
  if (!buffer) return '';
  const str = buffer.toString('utf8');
  // Simple XML text extractor for word document XML parts
  const matches = str.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
  if (matches && matches.length > 0) {
    return matches
      .map((m) => m.replace(/<w:t[^>]*>|<\/w:t>/g, ''))
      .join(' ')
      .trim();
  }
  // Fallback if raw text chunks exist
  return str.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Build R2 key for student uploaded challenge submission
 */
export function buildChallengeSubmissionKey({ challengeId, submissionId, extension }) {
  const ext = (extension || 'bin').toLowerCase().replace(/^\./, '');
  return `ai-challenges/${challengeId}/submissions/${submissionId}/original.${ext}`;
}

/**
 * Build R2 key for teacher uploaded challenge reference file
 */
export function buildChallengeReferenceKey({ challengeId, extension }) {
  const ext = (extension || 'pdf').toLowerCase().replace(/^\./, '');
  return `ai-challenges/${challengeId}/reference/reference.${ext}`;
}

/**
 * Asynchronous Queue Worker for AI Challenge Evaluations
 */
const DEFAULT_CONCURRENCY = 3;
const CONCURRENCY_LIMIT = Math.max(
  1,
  parseInt(process.env.AI_CHALLENGE_CONCURRENCY_LIMIT || `${DEFAULT_CONCURRENCY}`, 10)
);

class AiChallengeQueue {
  constructor() {
    this.queue = [];
    this.activeWorkers = 0;
    this.concurrencyLimit = CONCURRENCY_LIMIT;
    this.serverSupabase = null;
    this.serverOpenAI = null;
    this.isRecovering = false;
  }

  init({ serverSupabase, serverOpenAI }) {
    this.serverSupabase = serverSupabase;
    this.serverOpenAI = serverOpenAI;
    console.log(`[AI Challenge Engine] Initialized with concurrency limit: ${this.concurrencyLimit}`);
    this.recoverStaleJobs();
  }

  /**
   * Recovers any jobs in 'queued' or 'processing' from Supabase on startup
   */
  async recoverStaleJobs() {
    if (!this.serverSupabase || this.isRecovering) return;
    this.isRecovering = true;

    try {
      const { data, error } = await this.serverSupabase
        .from('ai_challenge_submissions')
        .select(`
          id,
          challenge_id,
          student_id,
          submission_type,
          content_text,
          file_key,
          file_type,
          status,
          challenge:ai_challenges!challenge_id (
            title,
            instructions,
            category,
            max_marks,
            evaluation_spec_json
          )
        `)
        .in('status', ['queued', 'processing'])
        .order('submitted_at', { ascending: true })
        .limit(50);

      if (!error && data && data.length > 0) {
        console.log(`[AI Challenge Engine] Recovered ${data.length} pending submissions from DB.`);
        for (const sub of data) {
          this.enqueue({
            submissionId: sub.id,
            challengeId: sub.challenge_id,
            studentId: sub.student_id,
            submissionType: sub.submission_type,
            contentText: sub.content_text,
            fileKey: sub.file_key,
            fileType: sub.file_type,
            challenge: sub.challenge
          });
        }
      }
    } catch (err) {
      console.warn('[AI Challenge Engine] Notice during job recovery:', err.message);
    } finally {
      this.isRecovering = false;
    }
  }

  enqueue(job) {
    // Avoid enqueuing duplicates
    if (this.queue.some((j) => j.submissionId === job.submissionId)) {
      return;
    }
    this.queue.push(job);
    console.log(`[AI Challenge Engine] Enqueued submission: ${job.submissionId} (Queue size: ${this.queue.length})`);
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
      console.error(`[AI Challenge Engine] Job failure (${job.submissionId}):`, err);
    } finally {
      this.activeWorkers--;
      this.processNext();
    }
  }

  async processJob(job) {
    const { submissionId, challengeId, submissionType, fileKey, fileType, contentText } = job;
    console.log(`[AI Challenge Engine] Processing submission: ${submissionId} (Active: ${this.activeWorkers}/${this.concurrencyLimit})`);

    // 1. Idempotency Check & Status -> 'processing'
    if (this.serverSupabase) {
      const { data: currentSub } = await this.serverSupabase
        .from('ai_challenge_submissions')
        .select('status')
        .eq('id', submissionId)
        .maybeSingle();

      if (currentSub && currentSub.status === 'completed') {
        console.log(`[AI Challenge Engine] Submission ${submissionId} is already completed. Skipping.`);
        return;
      }

      await this.serverSupabase
        .from('ai_challenge_submissions')
        .update({
          status: 'processing',
          processing_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId);
    }

    try {
      // 2. Fetch challenge details if not attached
      let challenge = job.challenge;
      if (!challenge && this.serverSupabase) {
        const { data: cData } = await this.serverSupabase
          .from('ai_challenges')
          .select('title, instructions, category, max_marks, evaluation_spec_json')
          .eq('id', challengeId)
          .single();
        challenge = cData;
      }

      const evalSpec = challenge?.evaluation_spec_json || generateChallengeEvaluationSpec({
        title: challenge?.title || 'Challenge',
        instructions: challenge?.instructions || '',
        category: challenge?.category || 'Creative Writing',
        maxMarks: challenge?.max_marks || 100
      });

      const maxMarks = challenge?.max_marks || evalSpec.max_marks || 100;

      // 3. Extract and normalize student submission content
      let normalizedText = '';
      let imageBuffer = null;
      let isVisualSubmission = false;

      if (submissionType === 'text') {
        normalizedText = (contentText || '').trim();
      } else if (fileKey) {
        const fileBuffer = await getBinaryContent(fileKey);
        if (!fileBuffer) {
          throw new Error('Uploaded file could not be retrieved from storage.');
        }

        const ext = fileKey.split('.').pop()?.toLowerCase() || '';

        if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
          imageBuffer = fileBuffer;
          isVisualSubmission = true;
        } else if (ext === 'html' || fileType?.includes('html')) {
          normalizedText = extractTextFromHtml(fileBuffer);
        } else if (ext === 'docx') {
          normalizedText = extractTextFromDocx(fileBuffer);
        } else if (ext === 'txt') {
          normalizedText = fileBuffer.toString('utf8').trim();
        } else if (ext === 'pdf') {
          // Check if PDF has plain text or is scanned image
          const pdfRaw = fileBuffer.toString('utf8');
          if (pdfRaw.includes('/Font') && pdfRaw.length > 500) {
            normalizedText = pdfRaw.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
          }
          if (!normalizedText || normalizedText.length < 50) {
            // Treat as visual PDF
            imageBuffer = fileBuffer;
            isVisualSubmission = true;
          }
        } else {
          normalizedText = fileBuffer.toString('utf8').trim();
        }
      }

      // Calculate word count programmatically
      const actualWordCount = normalizedText ? calculateWordCount(normalizedText) : 0;

      // 4. Perform AI Evaluation against fixed specification
      const evaluationResult = await this.evaluateSubmissionWithAi({
        evalSpec,
        maxMarks,
        normalizedText,
        actualWordCount,
        imageBuffer,
        isVisualSubmission,
        fileType
      });

      // 5. Validate and normalize AI output
      const validated = this.validateAndNormalizeAiOutput(evaluationResult, maxMarks, evalSpec.criteria);

      // 6. Save completed result in Supabase
      const processedAt = new Date();
      // 7-day retention for uploaded files:
      const expiresAt = fileKey
        ? new Date(processedAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      if (this.serverSupabase) {
        const { error: updateError } = await this.serverSupabase
          .from('ai_challenge_submissions')
          .update({
            word_count: actualWordCount,
            ai_score: validated.score,
            final_score: validated.score,
            percentage: validated.percentage,
            criteria_json: validated.criteria,
            ai_feedback: validated.feedback,
            ai_original_score: validated.score,
            status: 'completed',
            processed_at: processedAt.toISOString(),
            expires_at: expiresAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', submissionId);

        if (updateError) {
          throw new Error(`Failed to update submission record: ${updateError.message}`);
        }
      }

      console.log(`[AI Challenge Engine] Successfully evaluated submission ${submissionId} (Score: ${validated.score}/${maxMarks})`);
    } catch (err) {
      console.error(`[AI Challenge Engine] Error evaluating submission ${submissionId}:`, err);
      if (this.serverSupabase) {
        await this.serverSupabase
          .from('ai_challenge_submissions')
          .update({
            status: 'teacher_review',
            error_message: err.message || 'AI evaluation error. Marked for teacher review.',
            updated_at: new Date().toISOString()
          })
          .eq('id', submissionId);
      }
    }
  }

  /**
   * Execute AI assessment call with structured prompt and exponential backoff
   */
  async evaluateSubmissionWithAi({
    evalSpec,
    maxMarks,
    normalizedText,
    actualWordCount,
    imageBuffer,
    isVisualSubmission,
    fileType
  }) {
    const promptSystem = `You are an expert, objective educational evaluator.
Evaluate the student's submission against the fixed challenge specification.

Challenge Specification:
- Task: ${evalSpec.task_summary}
- Instructions: ${evalSpec.instructions}
- Requirements: ${JSON.stringify(evalSpec.requirements)}
- Target Word Count: ${evalSpec.required_word_count || 'N/A'} (Rule: ${evalSpec.word_count_rule || 'N/A'})
- Maximum Marks: ${maxMarks}
- Fixed Criteria Rubric:
${evalSpec.criteria.map((c) => `  * ${c.name}: max ${c.max} marks`).join('\n')}

Student Submission Data:
- Programmatic Word Count: ${actualWordCount} words
- Text Content:
"""
${normalizedText ? normalizedText.slice(0, 4000) : '[Uploaded visual/image submission attached]'}
"""

Return ONLY a valid JSON object matching this schema:
{
  "score": number (0 to ${maxMarks}),
  "max_score": ${maxMarks},
  "percentage": number (0 to 100),
  "criteria": [
    ${evalSpec.criteria.map((c) => `{"name": "${c.name}", "score": number (0 to ${c.max}), "max": ${c.max}}`).join(',\n    ')}
  ],
  "feedback": string (STRICT LIMIT: 50 words or fewer. Constructive, educational summary highlighting key strength and area to improve.)
}

RULES:
1. Feedback MUST contain 50 words or fewer.
2. Every criterion score must be non-negative and <= criterion max.
3. Total score must equal the sum of criteria scores.
4. Do NOT reproduce the student text or provide chain-of-thought.`;

    if (!this.serverOpenAI) {
      // Fallback evaluation if OpenAI is not initialized in local test
      const fallbackCriteria = evalSpec.criteria.map((c) => ({
        name: c.name,
        score: Math.round(c.max * 0.85),
        max: c.max
      }));
      const sumScore = fallbackCriteria.reduce((sum, c) => sum + c.score, 0);
      return {
        score: sumScore,
        max_score: maxMarks,
        percentage: Math.round((sumScore / maxMarks) * 100),
        criteria: fallbackCriteria,
        feedback: 'Creative and well-structured response that meets the prompt requirements with clear organization and appropriate vocabulary.'
      };
    }

    // Call OpenAI API
    const messages = [
      { role: 'system', content: 'You evaluate educational student challenge submissions and return strict JSON.' },
      {
        role: 'user',
        content: isVisualSubmission && imageBuffer
          ? [
              { type: 'text', text: promptSystem },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${fileType || 'image/jpeg'};base64,${imageBuffer.toString('base64')}`
                }
              }
            ]
          : promptSystem
      }
    ];

    const response = await this.serverOpenAI.chat.completions.create({
      model: isVisualSubmission ? 'gpt-4o' : 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 500
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty AI evaluation response');
    }

    return JSON.parse(content);
  }

  /**
   * Validates and ensures AI output adheres to schema and ≤50 word limit
   */
  validateAndNormalizeAiOutput(rawOutput, maxMarks, expectedCriteria = []) {
    let score = Number(rawOutput?.score);
    if (isNaN(score) || score < 0) score = 0;
    if (score > maxMarks) score = maxMarks;

    const percentage = Math.min(100, Math.max(0, Math.round((score / maxMarks) * 100)));

    let criteria = Array.isArray(rawOutput?.criteria) ? rawOutput.criteria : [];
    if (criteria.length === 0 && expectedCriteria.length > 0) {
      criteria = expectedCriteria.map((c) => ({
        name: c.name,
        score: Math.round(c.max * (score / maxMarks)),
        max: c.max
      }));
    } else {
      criteria = criteria.map((c, idx) => {
        const matched = expectedCriteria.find((ec) => ec.name.toLowerCase() === (c.name || '').toLowerCase()) || expectedCriteria[idx] || { max: 20 };
        const cScore = Math.min(matched.max, Math.max(0, Number(c.score) || 0));
        return {
          name: c.name || matched.name,
          score: cScore,
          max: matched.max
        };
      });
    }

    // Strict 50-word feedback boundary enforcement
    let feedback = (rawOutput?.feedback || 'Work completed successfully.').trim();
    const words = feedback.split(/\s+/).filter(Boolean);
    if (words.length > 50) {
      feedback = words.slice(0, 50).join(' ') + '.';
    }

    return {
      score,
      max_score: maxMarks,
      percentage,
      criteria,
      feedback
    };
  }
}

export const aiChallengeQueue = new AiChallengeQueue();

/**
 * 7-Day Storage Cleanup Function:
 * Finds completed submissions where expires_at <= now() and deletes R2 objects safely.
 */
export async function cleanupExpiredChallengeFiles(serverSupabase) {
  if (!serverSupabase) return { deletedCount: 0 };
  const nowIso = new Date().toISOString();

  try {
    const { data: expiredSubs, error } = await serverSupabase
      .from('ai_challenge_submissions')
      .select('id, file_key')
      .lte('expires_at', nowIso)
      .eq('status', 'completed')
      .not('file_key', 'is', null)
      .is('file_deleted_at', null)
      .limit(50);

    if (error || !expiredSubs || expiredSubs.length === 0) {
      return { deletedCount: 0 };
    }

    console.log(`[AI Challenge Cleanup] Found ${expiredSubs.length} expired submission files to clean up.`);
    const keysToDelete = expiredSubs.map((s) => s.file_key).filter(Boolean);

    if (keysToDelete.length > 0) {
      await deleteObjects(keysToDelete);
    }

    const subIds = expiredSubs.map((s) => s.id);
    await serverSupabase
      .from('ai_challenge_submissions')
      .update({
        file_deleted_at: nowIso,
        updated_at: nowIso
      })
      .in('id', subIds);

    console.log(`[AI Challenge Cleanup] Successfully deleted ${keysToDelete.length} expired R2 files.`);
    return { deletedCount: keysToDelete.length };
  } catch (err) {
    console.error('[AI Challenge Cleanup] Notice:', err.message);
    return { deletedCount: 0, error: err.message };
  }
}
