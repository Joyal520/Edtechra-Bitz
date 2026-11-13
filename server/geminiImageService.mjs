// ============================================================================
// EDTECHRA-BITZ: Safe Gemini AI Image Generation Service
// Server-Side Master Paper-Cut Art Generator for Educational Articles
// ============================================================================

import dotenv from 'dotenv';
import sharp from 'sharp';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { putBinaryContent, buildReadingCoverKey } from './r2Service.mjs';

dotenv.config({ path: '.env.local' });
dotenv.config();

export const EDTECHRA_BITZ_MASTER_VISUAL_STYLE = `
EDTECHRA BITZ PREMIUM PAPER-CUT STYLE
Create a sophisticated educational editorial illustration in EdTechra Bitz's signature high-premium layered paper-cut animation style.

Overall Aesthetic:
- Premium, sophisticated, modern, intelligent, visually memorable, polished, editorial, adult-oriented.
- Visually rich without being crowded. Looks like a professionally art-directed visual for a premium learning platform.

Paper-Cut Art Direction:
- Multiple dimensional paper layers with visible, refined paper edges.
- Tactile colored paper textures. Layered foreground, middle-ground, and background.
- Realistic paper depth with sophisticated cast shadows and subtle ambient shadows.
- Dimensional cut-paper construction with carefully controlled perspective.

Colour Direction:
- Very bright, vivid but refined colours with strong visual contrast and harmonious palette.
- Avoid muddy colours, dull grey-heavy palettes, or random rainbow colouring.

Audience & Restrictions:
- Adults and serious learners. Strictly NO childish cartoon styling, nursery graphics, emojis, or toys.
- 16:9 landscape composition with ONE dominant visual concept and generous negative space.
- Strictly NO random labels, NO gibberish, and NO invented factual claims.
`.trim();

export const EDTECHRA_BITZ_MASTER_STYLE = EDTECHRA_BITZ_MASTER_VISUAL_STYLE;

/**
 * Builds a structured, high-context visual prompt combining the article concept with master style
 */
export function buildArticleImagePrompt(article) {
  const title = (article.title || 'Educational Insight').trim();
  const subtitle = (article.subtitle || '').trim();
  const category = (article.category || 'General Knowledge').trim();
  
  // Extract key concept sentences from paragraphs
  let bodySummary = '';
  if (Array.isArray(article.paragraphs) && article.paragraphs.length > 0) {
    bodySummary = article.paragraphs
      .map(p => (typeof p === 'string' ? p : p.text || ''))
      .filter(Boolean)
      .join(' ')
      .slice(0, 300);
  }

  // Extract vocabulary words if available
  let vocabContext = '';
  if (Array.isArray(article.vocabulary) && article.vocabulary.length > 0) {
    const words = article.vocabulary.map(v => v.word).filter(Boolean).slice(0, 4).join(', ');
    if (words) vocabContext = `Key educational concepts: ${words}.`;
  }

  return `
${EDTECHRA_BITZ_MASTER_VISUAL_STYLE}

ARTICLE TITLE:
"${title}"

ARTICLE TOPIC:
${category}${subtitle ? ` — ${subtitle}` : ''}

MAIN CONCEPT:
${bodySummary || title}
${vocabContext}

VISUAL CONCEPT:
One powerful, scientifically and factually accurate layered paper-cut illustration capturing the central educational phenomenon of "${title}".

COMPOSITION:
16:9 landscape composition. One dominant focal point, sophisticated layered depth, generous negative space, clear visual hierarchy, balanced 16:9 frame.

TITLE TREATMENT:
Display the exact article title "${title}" as a prominent, elegant heading. Large, clean, professional, highly readable typography integrated seamlessly into the composition.

STYLE:
Premium dimensional layered paper-cut artwork, tactile paper textures, realistic paper edges, sophisticated shadows, bright refined colours, adult-oriented educational editorial design.

STRICTLY AVOID:
Childish cartoon aesthetics, clutter, excessive objects, excessive text, stock photography, generic AI art, random labels, emojis, stickers, gibberish, misspellings, and invented factual details. Strictly NO text, NO typography, NO labels other than the verified article title.
`.trim();
}

/**
 * Resolves the candidate Gemini image models based on environment and defaults
 */
function getCandidateImageModels() {
  const envModel = process.env.GEMINI_IMAGE_MODEL?.trim();
  const defaults = [
    'gemini-2.5-flash-image',
    'gemini-3.1-flash-image',
    'gemini-3-pro-image',
    'gemini-3.1-flash-lite-image'
  ];

  if (envModel && !defaults.includes(envModel)) {
    return [envModel, ...defaults];
  }
  if (envModel) {
    return [envModel, ...defaults.filter(m => m !== envModel)];
  }
  return defaults;
}

/**
 * Generates an AI Cover Image for an article using Google Gemini API and stores it in Cloudflare R2
 * 
 * @param {Object} article - The article / reading object
 * @param {Object} [options] - Options (e.g. custom prompt, force regenerate)
 * @returns {Promise<{ success: boolean, publicUrl?: string, objectKey?: string, prompt?: string, model?: string, error?: string }>}
 */
export async function generateArticleCoverImage(article, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    return {
      success: false,
      error: 'GEMINI_API_KEY is not configured in server environment.'
    };
  }

  if (!article || !article.id) {
    return {
      success: false,
      error: 'Invalid article object provided for image generation.'
    };
  }

  const prompt = options.customPrompt || buildArticleImagePrompt(article);
  let rawImageBuffer = null;
  let lastErrorMsg = '';
  let usedModel = '';

  const candidateModels = getCandidateImageModels();

  // 1. Attempt generation across supported Gemini image models
  for (const modelName of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      
      const payload = {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
          imageConfig: {
            aspectRatio: "16:9"
          }
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errMsg = json.error?.message || `HTTP ${response.status} from ${modelName}`;
        lastErrorMsg = errMsg;
        // If quota exceeded or model not found, try next model candidate
        continue;
      }

      // Check if image data is present in parts
      const candidate = json.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          rawImageBuffer = Buffer.from(part.inlineData.data, 'base64');
          usedModel = modelName;
          break;
        }
      }

      if (rawImageBuffer && rawImageBuffer.length > 0) {
        break; // Successfully received image buffer
      } else {
        lastErrorMsg = `Gemini model ${modelName} returned response without image data.`;
      }
    } catch (err) {
      lastErrorMsg = err.message || `Network error connecting to Gemini API (${modelName})`;
    }
  }

  if (!rawImageBuffer) {
    return {
      success: false,
      prompt,
      model: usedModel || candidateModels[0],
      error: lastErrorMsg || 'Failed to generate image with Gemini AI API. Quota limit or model unavailable.'
    };
  }

  // 2. Process and optimize image with Sharp (16:9 Landscape, 1024x576, high quality WebP)
  let optimizedBuffer = rawImageBuffer;
  let mimeType = 'image/webp';
  let ext = 'webp';

  try {
    optimizedBuffer = await sharp(rawImageBuffer)
      .resize({
        width: 1024,
        height: 576,
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 88, effort: 4 })
      .toBuffer();
  } catch (sharpErr) {
    console.warn('[GeminiImageService] Sharp optimization notice, using raw buffer:', sharpErr.message);
    // Keep raw buffer if sharp fails
    mimeType = 'image/png';
    ext = 'png';
  }

  // 3. Upload directly to Cloudflare R2 with predictable path
  const objectKey = buildReadingCoverKey(article.id, ext);

  try {
    const uploadResult = await putBinaryContent(objectKey, optimizedBuffer, mimeType);

    return {
      success: true,
      publicUrl: uploadResult.publicUrl,
      objectKey,
      prompt,
      model: usedModel || candidateModels[0],
      error: null
    };
  } catch (r2Err) {
    return {
      success: false,
      prompt,
      error: `Generated image successfully but R2 storage upload failed: ${r2Err.message}`
    };
  }
}

export const LIVE_QUIZ_COVERS_BUCKET = 'quiz-covers';

function getCoverSupabaseClient(explicitClient = null) {
  if (explicitClient) return explicitClient;
  const url = (
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function getTopicVisualCue(topic = '', category = '') {
  const text = `${topic} ${category}`.toLowerCase();
  if (text.includes('pronoun')) {
    return 'Sculpted speech bubbles, open storybooks, character silhouettes, connecting paper ribbons, and classroom notebooks illustrating communication between people.';
  }
  if (text.includes('tense') || text.includes('verb') || text.includes('past') || text.includes('future')) {
    return 'Clockwork hourglass, timeline ribbon, open journal pages, and directional arrows in tactile layered paper.';
  }
  if (text.includes('grammar') || text.includes('english') || text.includes('writing') || text.includes('vocabulary')) {
    return 'Layered open books, fountain pen nib, floating speech bubbles, library arches, and warm lamp light.';
  }
  if (text.includes('microcontroller') || text.includes('circuit') || text.includes('electronics') || text.includes('robotics')) {
    return 'Cut-paper microchip board with glowing gold traces, sensor modules, LED beacons, and blueprint grid waves.';
  }
  if (text.includes('math') || text.includes('algebra') || text.includes('geometry')) {
    return 'Geometric polyhedrons, compass divider, layered graph curves, and precision ruler shapes in vibrant paper planes.';
  }
  if (text.includes('science') || text.includes('biology') || text.includes('chemistry') || text.includes('physics')) {
    return 'Layered laboratory glassware, orbital atom rings, botanical leaves, and prismatic light beams in crisp paper craft.';
  }
  if (text.includes('history') || text.includes('geography')) {
    return 'Layered topographic globe contours, compass rose, classical columns, and parchment scroll ribbons.';
  }
  return `Symbolic educational objects, open books, glowing lightbulb inspiration, and dynamic geometric paper depth representing "${topic || category}".`;
}

/**
 * Builds a colourful, topic-connected 16:9 layered paper-cut prompt for a Live Quiz cover image
 */
export function buildQuizCoverPrompt({ title, topic, category, difficulty }) {
  const cleanTitle = String(title || topic || 'Live Quiz Challenge').trim();
  const cleanTopic = String(topic || title || 'General Knowledge').trim();
  const cleanCategory = String(category || 'General').trim();
  const cleanDifficulty = String(difficulty || 'Medium').trim();
  const visualCue = getTopicVisualCue(cleanTopic, cleanCategory);

  return `
Modern 3D layered paper-cut educational editorial illustration in widescreen 16:9 composition.
SUBJECT: ${cleanCategory} — Topic: "${cleanTopic}" (${cleanDifficulty} difficulty, inspired by "${cleanTitle}").
VISUAL MOTIF: ${visualCue}
ART DIRECTION:
- Colourful, bright, engaging, high-contrast academic palette combining vibrant cobalt blue (#087CF5), sunlit golden amber (#F7B928), fresh emerald (#18B981), warm coral accents, and deep indigo shadows.
- Crisp tactile cut-paper relief layers with foreground, mid-ground, and softly backlit background depth.
- Clean, joyful classroom-ready competition aesthetic suitable for students and teachers.
CRITICAL CONSTRAINTS:
- Strictly NO text, NO words, NO letters, NO numbers, NO labels, NO gibberish, and NO watermarks anywhere inside the image so the quiz title overlay stays sharp and readable.
`.trim();
}

/**
 * Uploads any raw cover buffer (AI-generated or teacher custom upload) into Supabase Storage ('quiz-covers'),
 * converting it to optimized 16:9 1024x576 WebP.
 */
export async function uploadCustomQuizCoverToSupabase({
  buffer,
  contentType = 'image/png',
  userId = 'teacher',
  filename = 'cover',
  prefix = 'custom',
  supabaseClient = null
}) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    return {
      success: false,
      publicUrl: null,
      error: 'Cover image buffer is empty.'
    };
  }

  const sb = getCoverSupabaseClient(supabaseClient);
  if (!sb) {
    return {
      success: false,
      publicUrl: null,
      error: 'Supabase Storage client is not configured on the server (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).'
    };
  }

  let optimizedBuffer = buffer;
  let finalMime = 'image/webp';
  let ext = 'webp';

  try {
    optimizedBuffer = await sharp(buffer)
      .resize({ width: 1024, height: 576, fit: 'cover', position: 'center' })
      .webp({ quality: 88, effort: 4 })
      .toBuffer();
  } catch (sharpErr) {
    finalMime = contentType && contentType.startsWith('image/') ? contentType : 'image/png';
    ext = finalMime.includes('jpeg') || finalMime.includes('jpg') ? 'jpg' : 'png';
    console.warn('[QuizCoverStorage] Sharp WebP conversion skipped, storing original format:', sharpErr.message);
  }

  const safeFolder = String(userId || 'teacher').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'teacher';
  const safeBase = String(filename || 'cover')
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 36) || 'quiz_cover';
  const storagePath = `${safeFolder}/${prefix}_${safeBase}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

  try {
    const { error: uploadError } = await sb.storage
      .from(LIVE_QUIZ_COVERS_BUCKET)
      .upload(storagePath, optimizedBuffer, {
        contentType: finalMime,
        cacheControl: '31536000',
        upsert: false
      });

    if (uploadError) {
      return {
        success: false,
        publicUrl: null,
        error: `Supabase Storage upload failed: ${uploadError.message}`
      };
    }

    const { data: urlData } = sb.storage
      .from(LIVE_QUIZ_COVERS_BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = urlData?.publicUrl || null;
    if (!publicUrl) {
      return {
        success: false,
        publicUrl: null,
        error: 'Supabase Storage did not return a public cover URL.'
      };
    }

    return {
      success: true,
      publicUrl,
      storagePath,
      bucket: LIVE_QUIZ_COVERS_BUCKET,
      error: null
    };
  } catch (err) {
    return {
      success: false,
      publicUrl: null,
      error: `Supabase Storage error: ${err.message || 'Unknown upload failure'}`
    };
  }
}

/**
 * Generates an AI Cover Image for a Live Quiz using configured image providers
 * (OpenAI primary: gpt-image-1-mini / gpt-image-1 / dall-e-3; Gemini fallback)
 * and stores the 16:9 WebP result strictly in Supabase Storage ('quiz-covers').
 * Never returns fake SVGs or data URIs as success.
 */
export async function generateQuizCoverImage(quizMeta = {}, options = {}) {
  const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  const quizId = String(quizMeta.id || `quiz_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);
  const userId = String(quizMeta.userId || options.userId || 'teacher');
  const prompt = options.customPrompt || buildQuizCoverPrompt(quizMeta);

  let rawImageBuffer = null;
  let usedModel = '';
  const providerErrors = [];

  // 1. Primary: OpenAI Image API (fast, reliable 16:9-compatible landscape output)
  const startedAt = Date.now();
  if (openaiKey) {
    const openai = new OpenAI({ apiKey: openaiKey, timeout: 55000, maxRetries: 0 });
    const openaiCandidates = [
      { model: process.env.OPENAI_IMAGE_MODEL?.trim() || 'gpt-image-1.5', size: '1536x1024', quality: 'low', output_format: 'webp' },
      { model: 'gpt-image-2.6-flare', size: '1536x1024', quality: 'low', output_format: 'webp' },
      { model: 'gpt-image-1-mini', size: '1536x1024', quality: 'low', output_format: 'webp' }
    ];

    // Deduplicate in case env overrides to one of the defaults
    const seen = new Set();
    for (const candidate of openaiCandidates) {
      if (seen.has(candidate.model)) continue;
      seen.add(candidate.model);
      if (Date.now() - startedAt > 56000) {
        providerErrors.push(`${candidate.model}: skipped (time budget reached)`);
        break;
      }
      try {
        const reqPayload = {
          model: candidate.model,
          prompt,
          n: 1,
          size: candidate.size
        };
        if (candidate.quality && candidate.model.startsWith('gpt-image')) {
          reqPayload.quality = candidate.quality;
        }
        if (candidate.output_format && candidate.model.startsWith('gpt-image')) {
          reqPayload.output_format = candidate.output_format;
        }

        const imgRes = await openai.images.generate(reqPayload);
        const item = imgRes?.data?.[0];
        if (item?.b64_json) {
          rawImageBuffer = Buffer.from(item.b64_json, 'base64');
          usedModel = candidate.model;
          break;
        }
        if (item?.url) {
          const dl = await fetch(item.url);
          if (dl.ok) {
            rawImageBuffer = Buffer.from(await dl.arrayBuffer());
            usedModel = candidate.model;
            break;
          }
        }
        providerErrors.push(`${candidate.model}: response contained no image payload`);
      } catch (err) {
        providerErrors.push(`${candidate.model}: ${err?.message || 'request failed'}`);
      }
    }
  } else {
    providerErrors.push('OPENAI_API_KEY is not configured');
  }

  // 2. Fallback: Gemini Image API if OpenAI did not produce an image
  if (!rawImageBuffer && geminiKey) {
    const candidateModels = getCandidateImageModels();
    for (const modelName of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ['IMAGE', 'TEXT'],
              imageConfig: { aspectRatio: '16:9' }
            }
          })
        });

        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          providerErrors.push(`${modelName}: ${json.error?.message || `HTTP ${response.status}`}`);
          continue;
        }

        const parts = json.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            rawImageBuffer = Buffer.from(part.inlineData.data, 'base64');
            usedModel = modelName;
            break;
          }
        }
        if (rawImageBuffer && rawImageBuffer.length > 0) break;
      } catch (err) {
        providerErrors.push(`${modelName}: ${err.message || 'request error'}`);
      }
    }
  }

  if (!rawImageBuffer || rawImageBuffer.length === 0) {
    return {
      success: false,
      publicUrl: null,
      prompt,
      model: usedModel || 'none',
      error: `AI cover generation failed (${providerErrors.slice(0, 2).join('; ') || 'No image provider available'}). You can retry or upload a custom cover.`
    };
  }

  // 3. Optimize to 16:9 WebP and upload strictly to Supabase Storage ('quiz-covers')
  const uploadRes = await uploadCustomQuizCoverToSupabase({
    buffer: rawImageBuffer,
    contentType: 'image/png',
    userId,
    filename: quizId,
    prefix: 'ai',
    supabaseClient: options.supabaseClient || null
  });

  if (!uploadRes.success || !uploadRes.publicUrl) {
    return {
      success: false,
      publicUrl: null,
      prompt,
      model: usedModel,
      error: uploadRes.error || 'Cover generated but failed to upload to Supabase Storage.'
    };
  }

  return {
    success: true,
    publicUrl: uploadRes.publicUrl,
    storagePath: uploadRes.storagePath,
    bucket: uploadRes.bucket,
    prompt,
    model: usedModel,
    error: null
  };
}
