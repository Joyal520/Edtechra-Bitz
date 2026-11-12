// ============================================================================
// EDTECHRA-BITZ: Safe Gemini AI Image Generation Service
// Server-Side Master Paper-Cut Art Generator for Educational Articles
// ============================================================================

import dotenv from 'dotenv';
import sharp from 'sharp';
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

/**
 * Builds a 16:9 layered paper-cut prompt for a Live Quiz cover image
 */
export function buildQuizCoverPrompt({ title, topic, category, difficulty }) {
  const cleanTitle = String(title || topic || 'Live Quiz Challenge').trim();
  const cleanTopic = String(topic || title || 'General Knowledge').trim();
  const cleanCategory = String(category || 'General').trim();
  const cleanDifficulty = String(difficulty || 'Medium').trim();

  return `
${EDTECHRA_BITZ_MASTER_VISUAL_STYLE}

QUIZ TITLE:
"${cleanTitle}"

SUBJECT / CATEGORY:
${cleanCategory} (${cleanDifficulty} Level)

QUIZ TOPIC:
${cleanTopic}

VISUAL CONCEPT:
Create an iconic, visually striking 16:9 layered paper-cut illustration representing the educational topic "${cleanTopic}" within the field of ${cleanCategory}.
Use dimensional cut-paper layers, warm tactile paper textures, crisp cast shadows, and a vibrant academic palette (#087CF5 electric blue, #10245A deep navy, #FFC83D golden amber, #16A34A emerald).
Strictly NO text, NO letters, NO words, NO numbers, and NO watermarks inside the artwork so the UI card title overlay remains crystal clear.
`.trim();
}

function buildFallbackQuizCoverSvg({ title, topic, category }) {
  const seedText = `${title || ''}-${topic || ''}-${category || ''}`;
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) {
    hash = ((hash << 5) - hash) + seedText.charCodeAt(i);
    hash |= 0;
  }
  const palettes = [
    ['#0A1E5E', '#087CF5', '#38BDF8', '#FFC83D'],
    ['#10245A', '#4F46E5', '#818CF8', '#F59E0B'],
    ['#064E3B', '#059669', '#34D399', '#FBBF24'],
    ['#3B0764', '#7C3AED', '#C084FC', '#38BDF8'],
    ['#1E293B', '#0284C7', '#22D3EE', '#FB923C']
  ];
  const pal = palettes[Math.abs(hash) % palettes.length];
  const offset = (Math.abs(hash) % 120) - 60;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="576" viewBox="0 0 1024 576">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${pal[0]}"/>
        <stop offset="60%" stop-color="${pal[1]}"/>
        <stop offset="100%" stop-color="${pal[2]}"/>
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000000" flood-opacity="0.28"/>
      </filter>
    </defs>
    <rect width="1024" height="576" fill="url(#bg)"/>
    <circle cx="${820 + offset}" cy="140" r="210" fill="${pal[2]}" fill-opacity="0.25" filter="url(#shadow)"/>
    <circle cx="${200 - offset}" cy="480" r="260" fill="${pal[0]}" fill-opacity="0.35" filter="url(#shadow)"/>
    <path d="M0,410 C240,${340 + offset} 460,${470 - offset} 720,390 C860,350 950,380 1024,340 L1024,576 L0,576 Z" fill="${pal[0]}" fill-opacity="0.45" filter="url(#shadow)"/>
    <path d="M0,470 C280,${430 - offset} 540,${510 + offset} 810,440 C910,415 980,440 1024,420 L1024,576 L0,576 Z" fill="${pal[1]}" fill-opacity="0.55" filter="url(#shadow)"/>
    <g filter="url(#shadow)" transform="translate(${512 + offset * 0.5}, 250)">
      <rect x="-110" y="-110" width="220" height="220" rx="44" transform="rotate(12)" fill="#FFFFFF" fill-opacity="0.14" stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="3"/>
      <rect x="-85" y="-85" width="170" height="170" rx="34" transform="rotate(-8)" fill="${pal[3]}" fill-opacity="0.88"/>
      <circle cx="0" cy="0" r="46" fill="#FFFFFF" fill-opacity="0.95"/>
      <polygon points="-14,-20 22,0 -14,20" fill="${pal[0]}"/>
    </g>
  </svg>`;
}

/**
 * Generates an AI Cover Image for a Live Quiz and uploads it to Cloudflare R2
 */
export async function generateQuizCoverImage(quizMeta = {}, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  const quizId = String(quizMeta.id || `quiz_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);
  const prompt = options.customPrompt || buildQuizCoverPrompt(quizMeta);

  let rawImageBuffer = null;
  let usedModel = 'gemini-2.5-flash-image';
  let lastErrorMsg = '';

  if (apiKey && apiKey.trim() !== '') {
    const candidateModels = getCandidateImageModels();
    for (const modelName of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
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
          lastErrorMsg = json.error?.message || `HTTP ${response.status} from ${modelName}`;
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
        lastErrorMsg = err.message || `Error calling ${modelName}`;
      }
    }
  }

  let optimizedBuffer = null;
  let mimeType = 'image/webp';
  let ext = 'webp';

  if (rawImageBuffer && rawImageBuffer.length > 0) {
    try {
      optimizedBuffer = await sharp(rawImageBuffer)
        .resize({ width: 1024, height: 576, fit: 'cover', position: 'center' })
        .webp({ quality: 88, effort: 4 })
        .toBuffer();
    } catch {
      optimizedBuffer = rawImageBuffer;
      mimeType = 'image/png';
      ext = 'png';
    }
  } else {
    // Render high-craft layered SVG illustration via Sharp -> WebP
    usedModel = 'edtechra-papercut-illustrator';
    const svgBuffer = Buffer.from(buildFallbackQuizCoverSvg(quizMeta), 'utf-8');
    try {
      optimizedBuffer = await sharp(svgBuffer)
        .resize({ width: 1024, height: 576, fit: 'cover' })
        .webp({ quality: 90 })
        .toBuffer();
    } catch {
      optimizedBuffer = svgBuffer;
      mimeType = 'image/svg+xml';
      ext = 'svg';
    }
  }

  const objectKey = `quiz-covers/ai_${quizId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

  try {
    const uploadResult = await putBinaryContent(objectKey, optimizedBuffer, mimeType);
    return {
      success: true,
      publicUrl: uploadResult.publicUrl,
      objectKey,
      prompt,
      model: usedModel,
      error: null
    };
  } catch (r2Err) {
    // Fallback to inline data URI only if R2 is unreachable
    const base64Data = optimizedBuffer.toString('base64');
    return {
      success: true,
      publicUrl: `data:${mimeType};base64,${base64Data}`,
      objectKey,
      prompt,
      model: usedModel,
      warning: lastErrorMsg || r2Err.message
    };
  }
}
