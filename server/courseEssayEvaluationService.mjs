// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: ESSAY & DESCRIPTIVE RESPONSE AI EVALUATOR
// Evaluates student open-ended writing and image descriptions.
// Architecture: Primary Google Gemini (Multimodal) -> Fallback OpenAI (Vision)
// -> Deterministic Heuristic Engine.
// ============================================================================

const CANDIDATE_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

/**
 * Fetches an image from URL and converts to base64 for Gemini inlineData
 */
async function fetchImageAsBase64(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
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
 * Deterministic Heuristic Fallback Evaluator when AI keys are offline
 */
export function evaluateEssayDeterministically({ question_text, student_response, min_words = 50, max_words = 150, evaluation_criteria = [] }) {
  const text = (student_response || '').trim();
  const words = text ? text.split(/\s+/).filter(w => w.length > 0) : [];
  const wordCount = words.length;

  // Criteria list
  const criteria = evaluation_criteria.length > 0
    ? evaluation_criteria
    : ['content_accuracy', 'relevance', 'completeness', 'language', 'grammar', 'vocabulary'];

  // Word count scoring
  let lengthScore = 80;
  if (wordCount < min_words) {
    lengthScore = Math.max(30, Math.round((wordCount / min_words) * 75));
  } else if (wordCount > max_words * 1.5) {
    lengthScore = 85;
  } else {
    lengthScore = 95;
  }

  // Unique words / vocabulary richness
  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')));
  const vocabRatio = words.length > 0 ? (uniqueWords.size / words.length) : 0;
  const vocabScore = Math.min(100, Math.round(vocabRatio * 110 + 20));

  // Sentence count & structure
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.length > 0 ? (wordCount / sentences.length) : 0;
  const grammarScore = avgSentenceLength >= 5 && avgSentenceLength <= 25 ? 88 : 74;

  const criteriaScores = {};
  criteria.forEach(c => {
    if (c === 'vocabulary') criteriaScores[c] = vocabScore;
    else if (c === 'grammar' || c === 'language') criteriaScores[c] = grammarScore;
    else if (c === 'completeness') criteriaScores[c] = lengthScore;
    else criteriaScores[c] = Math.round((lengthScore + vocabScore + grammarScore) / 3);
  });

  const avgTotal = Math.round(
    Object.values(criteriaScores).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(criteriaScores).length)
  );

  const strengths = [];
  if (wordCount >= min_words) strengths.push('Good answer length and detail');
  if (vocabRatio > 0.6) strengths.push('Varied vocabulary usage');
  if (sentences.length >= 3) strengths.push('Clear sentence structure');
  if (strengths.length === 0) strengths.push('Addressed the prompt directly');

  const improvements = [];
  if (wordCount < min_words) improvements.push(`Write more details to reach the target of ${min_words} words`);
  if (vocabRatio <= 0.6) improvements.push('Use more specific and descriptive vocabulary');
  if (sentences.length < 3) improvements.push('Expand your ideas into multiple complete sentences');
  if (improvements.length === 0) improvements.push('Incorporate deeper sensory details and metaphors to elevate your descriptive impact');

  return {
    score: Math.min(100, Math.max(10, avgTotal)),
    max_score: 100,
    feedback: wordCount >= min_words
      ? 'Well-written response addressing the key aspects of the prompt. Continue building rich descriptive details.'
      : `Your response provides a good foundation. Try expanding your response to reach the recommended ${min_words}–${max_words} word count.`,
    strengths,
    improvements,
    criteria_scores: criteriaScores,
    ai_provider: 'deterministic_evaluator'
  };
}

/**
 * Evaluates student essay with Gemini (Primary), OpenAI (Fallback), or Heuristic Engine.
 */
export async function evaluateStudentEssay(params) {
  const {
    question_text,
    student_response,
    image_url,
    lesson_context = '',
    min_words = 80,
    max_words = 100,
    evaluation_criteria = [
      'content_accuracy',
      'relevance',
      'completeness',
      'language',
      'grammar',
      'vocabulary'
    ],
    geminiApiKey = process.env.GEMINI_API_KEY,
    openaiApiKey = process.env.OPENAI_API_KEY,
    serverOpenAI = null
  } = params;

  if (!student_response || !student_response.trim()) {
    return {
      score: 0,
      max_score: 100,
      feedback: 'No response submitted. Please type your answer before submitting.',
      strengths: [],
      improvements: ['Write your response in the answer box provided.'],
      criteria_scores: evaluation_criteria.reduce((acc, c) => ({ ...acc, [c]: 0 }), {}),
      ai_provider: 'deterministic_evaluator'
    };
  }

  const systemInstruction = `You are an expert pedagogical assessment AI evaluating student essay and descriptive writing responses for EdTechra Course Studio.
Evaluate the student's writing fairly, constructively, and thoroughly against the provided prompt, target word count (${min_words}-${max_words} words), and evaluation criteria.

EVALUATION CRITERIA:
${evaluation_criteria.map(c => `- ${c}`).join('\n')}

YOU MUST RESPOND ONLY WITH A VALID JSON OBJECT MATCHING THIS EXACT SCHEMA:
{
  "score": number (0 to 100),
  "max_score": 100,
  "feedback": "2-3 constructive, encouraging sentences summarizing the overall quality",
  "strengths": ["1-3 bullet points of what the student did well"],
  "improvements": ["1-3 actionable bullet points for improvement"],
  "criteria_scores": {
    ${evaluation_criteria.map(c => `"${c}": number (0 to 100)`).join(',\n    ')}
  }
}`;

  const userPromptText = `PROMPT / TASK:
"""${question_text}"""

${lesson_context ? `LESSON CONTEXT:\n"""${lesson_context}"""\n` : ''}
TARGET LENGTH: ${min_words} to ${max_words} words
${image_url ? `ATTACHED IMAGE: ${image_url} (inspect visual details carefully)` : ''}

STUDENT RESPONSE TO EVALUATE:
"""${student_response.trim()}"""`;

  // --------------------------------------------------------------------------
  // 1. PRIMARY: GOOGLE GEMINI (Multimodal with JSON Mode)
  // --------------------------------------------------------------------------
  if (geminiApiKey) {
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

    for (const modelName of CANDIDATE_GEMINI_MODELS) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const parts = [{ text: `${systemInstruction}\n\n${userPromptText}` }];
        if (imagePart) parts.push(imagePart);

        const resp = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          })
        });

        clearTimeout(timeoutId);

        if (resp.ok) {
          const gData = await resp.json();
          const rawText = gData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            if (typeof parsed.score === 'number') {
              console.log(`[EssayEvaluation] Evaluated successfully via Google Gemini (${modelName})`);
              return {
                score: Math.min(100, Math.max(0, Math.round(parsed.score))),
                max_score: 100,
                feedback: parsed.feedback || 'Good effort on your response.',
                strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Clear effort and ideas.'],
                improvements: Array.isArray(parsed.improvements) ? parsed.improvements : ['Keep practicing descriptive writing.'],
                criteria_scores: parsed.criteria_scores || {},
                ai_provider: 'gemini',
                model: modelName
              };
            }
          }
        }
      } catch (gemErr) {
        console.warn(`[EssayEvaluation] Gemini (${modelName}) warning:`, gemErr.message);
      }
    }
  }

  // --------------------------------------------------------------------------
  // 2. FALLBACK: OPENAI (GPT-4o-mini with Vision)
  // --------------------------------------------------------------------------
  if (serverOpenAI || openaiApiKey) {
    try {
      const client = serverOpenAI || new (await import('openai')).default({ apiKey: openaiApiKey });
      const userContent = [{ type: 'text', text: userPromptText }];

      if (image_url) {
        userContent.push({
          type: 'image_url',
          image_url: { url: image_url }
        });
      }

      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userContent }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 800
      });

      const raw = completion.choices?.[0]?.message?.content;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.score === 'number') {
          console.log('[EssayEvaluation] Evaluated successfully via OpenAI fallback (gpt-4o-mini)');
          return {
            score: Math.min(100, Math.max(0, Math.round(parsed.score))),
            max_score: 100,
            feedback: parsed.feedback || 'Good effort on your response.',
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Clear effort and ideas.'],
            improvements: Array.isArray(parsed.improvements) ? parsed.improvements : ['Keep practicing descriptive writing.'],
            criteria_scores: parsed.criteria_scores || {},
            ai_provider: 'openai_fallback',
            model: 'gpt-4o-mini'
          };
        }
      }
    } catch (oaiErr) {
      console.warn('[EssayEvaluation] OpenAI fallback warning:', oaiErr.message);
    }
  }

  // --------------------------------------------------------------------------
  // 3. DETERMINISTIC HEURISTIC FALLBACK
  // --------------------------------------------------------------------------
  console.log('[EssayEvaluation] Using deterministic heuristic evaluator');
  return evaluateEssayDeterministically({
    question_text,
    student_response,
    min_words,
    max_words,
    evaluation_criteria
  });
}
