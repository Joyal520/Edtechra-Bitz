// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: ESSAY & WRITING ASSESSMENT AI PIPELINE
// Engine-level server-side evaluation pipeline:
//   1. Validates student response & minimum word count (default 45-55 words)
//   2. Screens for AI-authorship likelihood (probabilistic with confidence guard)
//   3. Enforces configurable threshold (default 80%): withholds marks if exceeded
//      with high/medium confidence, queues for teacher review
//   4. Evaluates grammar, vocabulary, relevance, sentence structure, and
//      compliance with assignment instructions
//   5. Provider Failover: Primary Gemini API -> Fallback OpenAI nano model
//      (Never awards marks if neither provider succeeds)
// ============================================================================

import OpenAI from 'openai';

const CANDIDATE_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-flash-latest'
];

const CANDIDATE_OPENAI_NANO_MODELS = [
  process.env.OPENAI_NANO_MODEL,
  process.env.OPENAI_MODEL,
  'gpt-5-nano',
  'gpt-4.1-nano',
  'gpt-4o-mini'
].filter(Boolean);

export const AI_CONTENT_DETECTED_MESSAGE = `AI CONTENT DETECTED

Your writing appears to contain a high likelihood of AI-generated content. Marks have not been awarded. Please write your answer independently.`;

/**
 * Counts words in a response string.
 */
export function countWordsServer(text) {
  if (!text || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Fetches an image from URL and converts to base64 for Gemini inlineData
 */
async function fetchImageAsBase64(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) return null;
    const arrayBuffer = await resp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    return {
      mimeType: contentType.split(';')[0],
      data: buffer.toString('base64')
    };
  } catch (err) {
    console.warn('[EssayEvaluation] Could not fetch image for multimodal AI:', err.message);
    return null;
  }
}

/**
 * Evaluates linguistic and telemetry signals to calibrate AI-authorship screening.
 * Protects students when signals are ambiguous while catching clear LLM boilerplate.
 */
export function analyzeLinguisticAiSignals(studentResponse, typingTelemetry = null) {
  const text = String(studentResponse || '').trim();
  const lower = text.toLowerCase();

  const strongAiMarkers = [
    'as an ai',
    'as a large language model',
    'delve into',
    'multifaceted',
    'tapestry of',
    'testament to the',
    'it is imperative to note',
    'in conclusion, the overarching',
    'plays a pivotal role in shaping',
    'underscores the importance of',
    'fostering a deeper understanding',
    'in the realm of',
    'moreover, it is crucial to recognize',
    'furthermore, the juxtaposition',
    'serves as a poignant reminder',
    'indelible mark on',
    'symphony of',
    'beacon of'
  ];

  const transitionMarkers = [
    'furthermore,',
    'moreover,',
    'consequently,',
    'nevertheless,',
    'subsequently,',
    'nonetheless,',
    'in summary,',
    'in conclusion,',
    'ultimately,'
  ];

  let matchedStrong = 0;
  for (const phrase of strongAiMarkers) {
    if (lower.includes(phrase)) matchedStrong++;
  }

  let matchedTransitions = 0;
  for (const tr of transitionMarkers) {
    if (lower.includes(tr)) matchedTransitions++;
  }

  let telemetryRisk = 0;
  if (typingTelemetry && typeof typingTelemetry === 'object') {
    const pasteCount = Number(typingTelemetry.pasteAttemptsBlocked) || 0;
    const rapidFlags = Number(typingTelemetry.rapidInsertionFlags) || 0;
    const keystrokes = Number(typingTelemetry.keystrokeCount) || 0;
    const charLen = text.length;

    if (rapidFlags >= 2) telemetryRisk += 20;
    if (pasteCount >= 3) telemetryRisk += 10;
    if (keystrokes > 0 && charLen > 180 && keystrokes < charLen * 0.25) {
      telemetryRisk += 25;
    }
  }

  return {
    matchedStrong,
    matchedTransitions,
    telemetryRisk,
    hasStrongAiBoilerplate: matchedStrong >= 2 || (matchedStrong >= 1 && matchedTransitions >= 2)
  };
}

/**
 * Deterministic Heuristic Evaluator (ONLY used when explicitly invoked by internal non-graded previews).
 * Note: Student writing assessments NEVER award marks when both Gemini and OpenAI fail.
 */
export function evaluateEssayDeterministically({
  question_text,
  student_response,
  min_words = 45,
  max_words = 55,
  evaluation_criteria = []
}) {
  const text = (student_response || '').trim();
  const wordCount = countWordsServer(text);

  const criteria =
    evaluation_criteria.length > 0
      ? evaluation_criteria
      : ['grammar', 'vocabulary', 'relevance', 'sentence_structure', 'instruction_compliance'];

  let lengthScore = wordCount >= min_words ? 90 : Math.max(30, Math.round((wordCount / Math.max(1, min_words)) * 75));
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')));
  const vocabRatio = words.length > 0 ? uniqueWords.size / words.length : 0;
  const vocabScore = Math.min(100, Math.round(vocabRatio * 110 + 20));
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : 0;
  const grammarScore = avgSentenceLength >= 5 && avgSentenceLength <= 25 ? 88 : 74;

  const criteriaScores = {};
  criteria.forEach(c => {
    if (c === 'vocabulary') criteriaScores[c] = vocabScore;
    else if (c === 'grammar' || c === 'sentence_structure') criteriaScores[c] = grammarScore;
    else if (c === 'instruction_compliance') criteriaScores[c] = lengthScore;
    else criteriaScores[c] = Math.round((lengthScore + vocabScore + grammarScore) / 3);
  });

  const avgTotal = Math.round(
    Object.values(criteriaScores).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(criteriaScores).length)
  );

  return {
    score: Math.min(100, Math.max(10, avgTotal)),
    max_score: 100,
    feedback: 'Good effort addressing the prompt.',
    strengths: ['Addressed the prompt directly'],
    improvements: ['Continue refining vocabulary and sentence structure'],
    criteria_scores: criteriaScores,
    ai_likelihood_percentage: 10,
    confidence: 'low',
    assessment_status: 'passed',
    explanation: 'Heuristic fallback check.',
    ai_provider: 'deterministic_evaluator'
  };
}

/**
 * Calls Google Gemini API with timeout and retry handling.
 */
async function callGeminiEvaluation({
  apiKey,
  systemInstruction,
  userPromptText,
  imagePart = null,
  timeoutMs = 10000,
  maxRetriesPerModel = 1,
  customFetch = null
}) {
  const fetchFn = customFetch || globalThis.fetch;
  const errors = [];

  for (const modelName of CANDIDATE_GEMINI_MODELS) {
    for (let attempt = 0; attempt <= maxRetriesPerModel; attempt++) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const parts = [{ text: `${systemInstruction}\n\n${userPromptText}` }];
        if (imagePart) parts.push(imagePart);

        const resp = await fetchFn(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.15
            }
          })
        });

        clearTimeout(timeoutId);

        if (!resp.ok) {
          const errBody = await resp.text().catch(() => '');
          throw new Error(`Gemini HTTP ${resp.status} (${modelName}): ${errBody.slice(0, 140)}`);
        }

        const gData = await resp.json();
        const rawText = gData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          throw new Error(`Gemini (${modelName}) returned empty content.`);
        }

        const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (
          typeof parsed.ai_likelihood_percentage !== 'number' ||
          typeof parsed.score !== 'number'
        ) {
          throw new Error(`Gemini (${modelName}) returned incomplete JSON schema.`);
        }

        return {
          parsed,
          provider: 'gemini',
          model: modelName
        };
      } catch (err) {
        errors.push(`${modelName}#${attempt + 1}: ${err.message}`);
        if (attempt < maxRetriesPerModel) {
          await new Promise(r => setTimeout(r, 400));
        }
      }
    }
  }

  throw new Error(`Gemini evaluation failed across all models (${errors.join(' | ')})`);
}

/**
 * Calls OpenAI nano fallback model with timeout and retry handling.
 */
async function callOpenAINanoFallback({
  apiKey,
  serverOpenAI,
  systemInstruction,
  userPromptText,
  imageUrl = null,
  timeoutMs = 12000,
  maxRetries = 1
}) {
  const client =
    serverOpenAI ||
    (apiKey ? new OpenAI({ apiKey, timeout: timeoutMs, maxRetries }) : null);

  if (!client) {
    throw new Error('OpenAI fallback client is not configured.');
  }

  const uniqueModels = Array.from(new Set(CANDIDATE_OPENAI_NANO_MODELS));
  const errors = [];

  for (const modelName of uniqueModels) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const isGpt5OrReasoning =
          modelName.includes('gpt-5') || modelName.startsWith('o1') || modelName.startsWith('o3');

        const userContent = [{ type: 'text', text: userPromptText }];
        if (imageUrl && !isGpt5OrReasoning) {
          userContent.push({
            type: 'image_url',
            image_url: { url: imageUrl }
          });
        }

        const reqPayload = {
          model: modelName,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: isGpt5OrReasoning ? userPromptText : userContent }
          ],
          response_format: { type: 'json_object' }
        };

        if (!isGpt5OrReasoning) {
          reqPayload.temperature = 0.15;
          reqPayload.max_tokens = 900;
        }

        const completion = await Promise.race([
          client.chat.completions.create(reqPayload),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`OpenAI (${modelName}) timed out after ${timeoutMs}ms`)), timeoutMs)
          )
        ]);

        const raw = completion?.choices?.[0]?.message?.content;
        if (!raw) {
          throw new Error(`OpenAI (${modelName}) returned empty message content.`);
        }

        const cleanJson = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (
          typeof parsed.ai_likelihood_percentage !== 'number' ||
          typeof parsed.score !== 'number'
        ) {
          throw new Error(`OpenAI (${modelName}) returned incomplete JSON schema.`);
        }

        return {
          parsed,
          provider: 'openai_fallback',
          model: modelName
        };
      } catch (err) {
        errors.push(`${modelName}#${attempt + 1}: ${err.message}`);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 400));
        }
      }
    }
  }

  throw new Error(`OpenAI nano fallback failed across all candidate models (${errors.join(' | ')})`);
}

/**
 * Primary Server-Side AI Writing Evaluation Pipeline:
 *   Step 1: Validate student response & word count
 *   Step 2: Screen for AI-authorship likelihood (Gemini -> OpenAI nano failover)
 *   Step 3: Compare against threshold (default 80%). If exceeded (and confidence not uncertain/low),
 *           withhold marks (score = 0) and return AI CONTENT DETECTED message.
 *   Step 4: If passed, evaluate grammar, vocabulary, relevance, sentence structure,
 *           and instruction compliance, returning score and constructive feedback.
 *   Step 5: If BOTH Gemini and OpenAI fail, do NOT award marks (throws 503 provider error).
 */
export async function evaluateStudentEssay(params) {
  const {
    question_text,
    student_response,
    image_url,
    lesson_context = '',
    min_words: rawMinWords,
    max_words: rawMaxWords,
    evaluation_criteria = [
      'grammar',
      'vocabulary',
      'relevance',
      'sentence_structure',
      'instruction_compliance'
    ],
    typing_telemetry = null,
    ai_threshold: rawThreshold,
    enforce_min_words = false,
    geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY,
    openaiApiKey = process.env.OPENAI_API_KEY,
    serverOpenAI = null,
    customFetch = null,
    timeoutMs = 10000
  } = params || {};

  const min_words = Number.isFinite(Number(rawMinWords)) && Number(rawMinWords) > 0 ? Number(rawMinWords) : 45;
  const max_words = Number.isFinite(Number(rawMaxWords)) && Number(rawMaxWords) >= min_words ? Number(rawMaxWords) : 55;
  const aiThreshold = Number.isFinite(Number(rawThreshold))
    ? Number(rawThreshold)
    : Number(process.env.AI_CONTENT_THRESHOLD || process.env.AI_DETECTION_THRESHOLD || 80);

  const trimmedResponse = String(student_response || '').trim();
  const wordCount = countWordsServer(trimmedResponse);

  // 1. Validate response presence & minimum word count
  if (!trimmedResponse) {
    const emptyErr = new Error('Student response cannot be empty.');
    emptyErr.statusCode = 400;
    throw emptyErr;
  }

  if (enforce_min_words && wordCount < min_words) {
    const minWordErr = new Error(
      `Your response has ${wordCount} words, which is below the required minimum of ${min_words} words.`
    );
    minWordErr.statusCode = 400;
    minWordErr.wordCount = wordCount;
    minWordErr.minWords = min_words;
    throw minWordErr;
  }

  const canonicalCriteria = Array.from(
    new Set([
      'grammar',
      'vocabulary',
      'relevance',
      'sentence_structure',
      'instruction_compliance',
      ...(Array.isArray(evaluation_criteria) ? evaluation_criteria : [])
    ])
  );

  const systemInstruction = `You are an expert educational writing assessor and academic integrity evaluator for EdTechra Course Studio.
Perform a two-stage evaluation of the student's writing response:

STAGE 1 — AI-AUTHORSHIP SCREENING (PROBABILISTIC):
Assess the likelihood (0 to 100) that the response was generated by an AI / LLM rather than written independently by a student.
- Look for unnatural encyclopedic tone, formulaic LLM transitions ("Furthermore, it is imperative to note", "delve into", "multifaceted tapestry"), robotic symmetry, or generic AI phrasing detached from natural student writing.
- Do NOT penalize genuine student writing that is simply well-structured or grammatically correct.
- Set "confidence" to "high", "medium", or "low". If signals are ambiguous or uncertain, set "confidence" to "low" and keep "ai_likelihood_percentage" below ${aiThreshold}.

STAGE 2 — PEDAGOGICAL WRITING EVALUATION:
Evaluate the response against the assignment prompt and target length (${min_words}–${max_words} words) across:
- grammar
- vocabulary
- relevance
- sentence_structure
- instruction_compliance

YOU MUST RESPOND ONLY WITH VALID JSON MATCHING THIS EXACT SCHEMA:
{
  "ai_likelihood_percentage": number (0 to 100),
  "confidence": "low" | "medium" | "high",
  "assessment_status": "passed" | "flagged_ai" | "uncertain_passed",
  "explanation": "1-2 objective sentences explaining the AI-authorship likelihood assessment",
  "score": number (0 to 100),
  "max_score": 100,
  "feedback": "2-3 constructive, encouraging sentences evaluating grammar, vocabulary, relevance, sentence structure, and instruction compliance",
  "strengths": ["1-3 specific strengths of the student's writing"],
  "improvements": ["1-3 actionable suggestions for improvement"],
  "criteria_scores": {
    ${canonicalCriteria.map(c => `"${c}": number (0 to 100)`).join(',\n    ')}
  }
}`;

  const userPromptText = `ASSIGNMENT PROMPT / INSTRUCTIONS:
"""${question_text}"""

${lesson_context ? `LESSON CONTEXT:\n"""${lesson_context}"""\n` : ''}
REQUIRED WORD RANGE: ${min_words} to ${max_words} words (Student wrote ${wordCount} words)
${image_url ? `ATTACHED IMAGE: ${image_url}` : ''}
${
  typing_telemetry
    ? `TYPING TELEMETRY: ${JSON.stringify({
        keystrokeCount: typing_telemetry.keystrokeCount,
        pasteAttemptsBlocked: typing_telemetry.pasteAttemptsBlocked,
        rapidInsertionFlags: typing_telemetry.rapidInsertionFlags
      })}`
    : ''
}

STUDENT WRITING RESPONSE:
"""${trimmedResponse}"""`;

  // --------------------------------------------------------------------------
  // PROVIDER EXECUTION WITH FAILOVER: GEMINI (PRIMARY) -> OPENAI NANO (FALLBACK)
  // --------------------------------------------------------------------------
  let providerResponse = null;
  let geminiError = null;
  let openAiError = null;

  // 1. Primary Provider: Google Gemini
  if (geminiApiKey) {
    try {
      let imagePart = null;
      if (image_url) {
        const imgData = await fetchImageAsBase64(image_url);
        if (imgData) {
          imagePart = {
            inlineData: {
              mimeType: imgData.mimeType,
              data: imgData.data
            }
          };
        }
      }

      providerResponse = await callGeminiEvaluation({
        apiKey: geminiApiKey,
        systemInstruction,
        userPromptText,
        imagePart,
        timeoutMs,
        maxRetriesPerModel: 1,
        customFetch
      });
      console.log(`[EssayEvaluation] Evaluated via primary provider Gemini (${providerResponse.model})`);
    } catch (gemErr) {
      geminiError = gemErr;
      console.warn('[EssayEvaluation] Primary provider Gemini failed, activating OpenAI nano fallback:', gemErr.message);
    }
  } else {
    geminiError = new Error('GEMINI_API_KEY is not configured.');
    console.warn('[EssayEvaluation] GEMINI_API_KEY missing, activating OpenAI nano fallback.');
  }

  // 2. Fallback Provider: OpenAI Nano Model (only when Gemini fails or is unconfigured)
  if (!providerResponse) {
    if (serverOpenAI || openaiApiKey) {
      try {
        providerResponse = await callOpenAINanoFallback({
          apiKey: openaiApiKey,
          serverOpenAI,
          systemInstruction,
          userPromptText,
          imageUrl: image_url,
          timeoutMs,
          maxRetries: 1
        });
        console.log(`[EssayEvaluation] Evaluated via fallback provider OpenAI (${providerResponse.model})`);
      } catch (oaiErr) {
        openAiError = oaiErr;
        console.error('[EssayEvaluation] OpenAI nano fallback also failed:', oaiErr.message);
      }
    } else {
      openAiError = new Error('OPENAI_API_KEY is not configured.');
      console.error('[EssayEvaluation] OpenAI fallback unavailable: OPENAI_API_KEY missing.');
    }
  }

  // 3. If NEITHER provider succeeded: DO NOT AWARD MARKS
  if (!providerResponse) {
    const combinedReason = [
      geminiError ? `Gemini: ${geminiError.message}` : null,
      openAiError ? `OpenAI: ${openAiError.message}` : null
    ]
      .filter(Boolean)
      .join('; ');

    console.error(`[EssayEvaluation] CRITICAL: Both AI providers failed. Marks not awarded. (${combinedReason})`);

    const unavailableErr = new Error(
      'AI evaluation service is temporarily unavailable. Marks have not been awarded. Please try submitting again shortly.'
    );
    unavailableErr.statusCode = 503;
    unavailableErr.provider_unavailable = true;
    unavailableErr.details = combinedReason;
    throw unavailableErr;
  }

  // --------------------------------------------------------------------------
  // PROCESS SCREENING & EVALUATION RESULT
  // --------------------------------------------------------------------------
  const { parsed, provider, model } = providerResponse;
  const linguisticSignals = analyzeLinguisticAiSignals(trimmedResponse, typing_telemetry);

  let aiLikelihood = Math.min(100, Math.max(0, Math.round(Number(parsed.ai_likelihood_percentage) || 0)));
  let confidence = ['low', 'medium', 'high', 'uncertain'].includes(
    String(parsed.confidence || '').toLowerCase()
  )
    ? String(parsed.confidence).toLowerCase()
    : 'medium';

  // Calibrate with unmistakable LLM boilerplate markers if present
  if (linguisticSignals.hasStrongAiBoilerplate && aiLikelihood < 85) {
    aiLikelihood = Math.max(aiLikelihood, 88);
    confidence = 'high';
  }

  const isConfidenceUncertain = confidence === 'low' || confidence === 'uncertain';
  const exceedsThreshold = aiLikelihood >= aiThreshold;

  // IMPORTANT: Do not automatically penalize students when detection result is uncertain
  const isFlaggedAi = exceedsThreshold && !isConfidenceUncertain;
  const assessmentStatus = isFlaggedAi
    ? 'flagged_ai'
    : exceedsThreshold && isConfidenceUncertain
    ? 'uncertain_passed'
    : 'passed';

  const explanation =
    parsed.explanation ||
    (isFlaggedAi
      ? 'The response exhibits multiple linguistic patterns and formulaic structures strongly associated with AI-generated text.'
      : 'The response appears consistent with independent student writing.');

  const evaluatedAt = new Date().toISOString();

  // If threshold exceeded with medium/high confidence -> DO NOT AWARD MARKS
  if (isFlaggedAi) {
    return {
      score: 0,
      max_score: 100,
      feedback: AI_CONTENT_DETECTED_MESSAGE,
      ai_detection_message: AI_CONTENT_DETECTED_MESSAGE,
      ai_flagged: true,
      ai_likelihood_percentage: aiLikelihood,
      confidence,
      assessment_status: 'flagged_ai',
      explanation,
      strengths: [],
      improvements: [
        'Write your response independently in your own words.',
        'Use examples and vocabulary from the lesson rather than AI-generated text.'
      ],
      criteria_scores: canonicalCriteria.reduce((acc, c) => ({ ...acc, [c]: 0 }), {}),
      ai_provider: provider,
      model,
      word_count: wordCount,
      evaluated_at: evaluatedAt,
      teacher_review_status: 'pending'
    };
  }

  // Passed screening -> award evaluated score & constructive feedback
  const rawScore = Math.min(100, Math.max(1, Math.round(Number(parsed.score) || 75)));
  const wordLengthWarning =
    wordCount > max_words
      ? ` Note: Your response (${wordCount} words) exceeded the recommended ${max_words}-word target.`
      : '';

  return {
    score: rawScore,
    max_score: 100,
    feedback: `${parsed.feedback || 'Well-written response addressing the assignment instructions.'}${wordLengthWarning}`,
    ai_detection_message: null,
    ai_flagged: false,
    ai_likelihood_percentage: aiLikelihood,
    confidence,
    assessment_status: assessmentStatus,
    explanation,
    strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0
      ? parsed.strengths
      : ['Clear effort addressing the assignment prompt.'],
    improvements: Array.isArray(parsed.improvements) && parsed.improvements.length > 0
      ? parsed.improvements
      : ['Continue practicing sentence variety and vocabulary precision.'],
    criteria_scores: parsed.criteria_scores || {},
    ai_provider: provider,
    model,
    word_count: wordCount,
    evaluated_at: evaluatedAt,
    teacher_review_status: null
  };
}
