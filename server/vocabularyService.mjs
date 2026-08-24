// ============================================================================
// EDTECHRA-BITZ: Unified Vocabulary Content Service
// Gemini AI Validation, Deterministic Local Fallback, R2 Content & Scheduling
// ============================================================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VOCABULARY_CACHE_FILE = path.resolve(__dirname, 'data/words_of_the_day_cache.json');
const IMPORT_BATCHES_CACHE_FILE = path.resolve(__dirname, 'data/vocabulary_import_batches_cache.json');
const USER_SAVED_WORDS_CACHE_FILE = path.resolve(__dirname, 'data/user_saved_words_cache.json');
const WORD_LIKES_CACHE_FILE = path.resolve(__dirname, 'data/word_likes_cache.json');
export const DEFAULT_VOCABULARY_IMAGE = '/assets/ChatGPT Image Aug 22, 2026, 05_39_51 PM.png';

const PHRASAL_VERB_PARTICLES = new Set([
  'about', 'across', 'ahead', 'along', 'apart', 'around', 'aside', 'away',
  'back', 'by', 'down', 'forward', 'in', 'into', 'off', 'on', 'onto',
  'out', 'over', 'past', 'round', 'through', 'to', 'together', 'under',
  'up', 'upon', 'with'
]);

const CANDIDATE_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro'
];

/**
 * Normalizes title for case-insensitive duplicate comparison
 */
export function normalizeVocabularyTitle(text) {
  if (!text || typeof text !== 'string') return '';
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Resolves content type
 */
export function resolveContentType(rawType, fallback = 'word') {
  if (!rawType || typeof rawType !== 'string') return fallback;
  const clean = rawType.trim().toLowerCase().replace(/[-\s]+/g, '_');
  if (clean === 'word' || clean === 'words') return 'word';
  if (clean === 'collocation' || clean === 'collocations') return 'collocation';
  if (clean === 'phrasal_verb' || clean === 'phrasal_verbs' || clean === 'phrasalverb' || clean === 'phrasalverbs') return 'phrasal_verb';
  if (clean === 'idiom' || clean === 'idioms') return 'idiom';
  return fallback;
}

// ----------------------------------------------------------------------------
// Cache persistence helpers
// ----------------------------------------------------------------------------

export function loadVocabularyCache() {
  try {
    if (fs.existsSync(VOCABULARY_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(VOCABULARY_CACHE_FILE, 'utf-8'));
      if (Array.isArray(data)) {
        return data.map(item => ({
          ...item,
          content_type: item.content_type || 'word',
          title: item.title || item.word || 'Vocabulary',
          word: item.word || item.title || 'Vocabulary',
          meaning: item.meaning || item.definition || '',
          definition: item.definition || item.meaning || '',
          validation_status: item.validation_status || 'manually_approved',
          validation_provider: item.validation_provider || 'manual',
          status: item.status || 'published',
          likes_count: Number(item.likes_count) || 0
        }));
      }
    }
  } catch (err) {
    console.warn('[Vocabulary Cache Read Error]:', err.message);
  }
  return [];
}

export function saveVocabularyCache(data) {
  try {
    const dir = path.dirname(VOCABULARY_CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(VOCABULARY_CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Vocabulary Cache Write Error]:', err.message);
  }
}

export function loadImportBatchesCache() {
  try {
    if (fs.existsSync(IMPORT_BATCHES_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(IMPORT_BATCHES_CACHE_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('[Import Batches Cache Read Error]:', err.message);
  }
  return [];
}

export function saveImportBatchesCache(data) {
  try {
    const dir = path.dirname(IMPORT_BATCHES_CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(IMPORT_BATCHES_CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Import Batches Cache Write Error]:', err.message);
  }
}

// ----------------------------------------------------------------------------
// Local Fallback Validator (Deterministic, High Resilience)
// ----------------------------------------------------------------------------

export function validateVocabularyLocal(rawList, defaultTypeOrOptions = 'word', maybeExistingSet = new Set()) {
  let defaultType = 'word';
  let existingSet = new Set();

  if (typeof defaultTypeOrOptions === 'object' && defaultTypeOrOptions !== null && !(defaultTypeOrOptions instanceof Set)) {
    defaultType = defaultTypeOrOptions.defaultType || 'word';
    existingSet = defaultTypeOrOptions.existingSet || new Set();
  } else {
    defaultType = typeof defaultTypeOrOptions === 'string' ? defaultTypeOrOptions : 'word';
    existingSet = maybeExistingSet instanceof Set ? maybeExistingSet : new Set();
  }

  const valid = [];
  const invalid = [];
  const duplicates = [];
  const existing = [];
  const allReport = [];
  const seenInBatch = new Set();

  for (let i = 0; i < rawList.length; i++) {
    const index = i + 1;
    const raw = rawList[i];

    if (!raw || typeof raw !== 'object') {
      const errItem = {
        index,
        title: `Record #${index}`,
        contentType: defaultType,
        error: 'Record must be an object.',
        type: 'invalid',
        rawInput: raw
      };
      invalid.push(errItem);
      allReport.push({
        index,
        title: `Record #${index}`,
        contentType: defaultType,
        status: 'invalid',
        validationProvider: 'local_fallback',
        validationStatus: 'rejected',
        message: 'Record must be a JSON object.',
        raw: { title: `Record #${index}`, meaning: '', example: '' }
      });
      continue;
    }

    const contentType = resolveContentType(raw.type || raw.content_type, defaultType);
    const title = String(raw.title || raw.word || '').trim();
    const meaning = String(raw.meaning || raw.definition || '').trim();
    const example = String(raw.example || '').trim();
    const pronunciation = raw.pronunciation || raw.phonetic ? String(raw.pronunciation || raw.phonetic).trim() : null;
    const partOfSpeech = raw.partOfSpeech || raw.part_of_speech ? String(raw.partOfSpeech || raw.part_of_speech).trim() : null;
    const level = raw.level ? String(raw.level).trim().toUpperCase() : null;
    const category = raw.category ? String(raw.category).trim() : null;
    const status = raw.status && ['draft', 'approved', 'scheduled', 'published', 'archived'].includes(raw.status)
      ? raw.status
      : 'published';

    const currentRaw = {
      content_type: contentType,
      type: contentType,
      title,
      word: title,
      meaning,
      definition: meaning,
      example,
      pronunciation,
      phonetic: pronunciation,
      partOfSpeech,
      level,
      category,
      status
    };

    // Check required fields
    const missing = [];
    if (!title) missing.push('title/word');
    if (!meaning) missing.push('meaning/definition');
    if (!example) missing.push('example');

    if (missing.length > 0) {
      const msg = `Missing required field(s): ${missing.join(', ')}.`;
      invalid.push({ index, title: title || `Record #${index}`, contentType, error: msg, type: 'invalid', rawInput: currentRaw });
      allReport.push({
        index,
        title: title || `Record #${index}`,
        contentType,
        status: 'invalid',
        validationProvider: 'local_fallback',
        validationStatus: 'rejected',
        message: msg,
        raw: currentRaw
      });
      continue;
    }

    if (title.length < 2) {
      const msg = 'Title is too short (minimum 2 characters).';
      invalid.push({ index, title, contentType, error: msg, type: 'invalid', rawInput: currentRaw });
      allReport.push({ index, title, contentType, status: 'invalid', validationProvider: 'local_fallback', validationStatus: 'rejected', message: msg, raw: currentRaw });
      continue;
    }

    const warnings = [];
    if (meaning.toLowerCase() === example.toLowerCase()) {
      warnings.push('Example sentence is identical to meaning.');
    }

    // Type-specific linguistic basic checks
    const words = title.split(/\s+/).filter(Boolean);
    if (contentType === 'phrasal_verb') {
      const hasParticle = words.slice(1).some(w => PHRASAL_VERB_PARTICLES.has(w.toLowerCase()));
      if (words.length < 2) {
        warnings.push('Phrasal verb should contain multiple words (verb + particle).');
      } else if (!hasParticle) {
        warnings.push('Phrasal verb does not contain a common particle.');
      }
    } else if (contentType === 'idiom') {
      if (words.length < 2) {
        warnings.push('Idioms are typically multi-word expressions.');
      }
    } else if (contentType === 'collocation') {
      if (words.length < 2) {
        warnings.push('Collocations typically contain multiple words.');
      }
    }

    const norm = normalizeVocabularyTitle(title);

    // In-batch duplicate check
    if (seenInBatch.has(norm)) {
      const msg = `Duplicate "${title}" detected within this import batch.`;
      duplicates.push({ index, title, contentType, error: msg, type: 'duplicate_in_batch', rawInput: currentRaw });
      allReport.push({
        index,
        title,
        contentType,
        status: 'duplicate_in_batch',
        validationProvider: 'local_fallback',
        validationStatus: 'rejected',
        message: msg,
        raw: currentRaw
      });
      continue;
    }

    // Existing database duplicate check
    if (existingSet.has(norm)) {
      const msg = `"${title}" already exists in the database.`;
      existing.push({ index, title, contentType, error: msg, type: 'already_exists', rawInput: currentRaw });
      allReport.push({
        index,
        title,
        contentType,
        status: 'already_exists',
        validationProvider: 'local_fallback',
        validationStatus: 'rejected',
        message: msg,
        raw: currentRaw
      });
      continue;
    }

    seenInBatch.add(norm);
    valid.push(currentRaw);
    allReport.push({
      index,
      title,
      contentType,
      status: warnings.length > 0 ? 'warning' : 'valid',
      validationProvider: 'local_fallback',
      validationStatus: 'fallback_validated',
      warnings: warnings.length > 0 ? warnings : undefined,
      message: warnings.length > 0 ? warnings.join(' ') : 'Passed basic local schema checks.',
      raw: currentRaw
    });
  }

  return {
    totalDetected: rawList.length,
    validCount: valid.length,
    warningCount: allReport.filter(r => r.status === 'warning').length,
    inBatchDuplicateCount: duplicates.length,
    existingCount: existing.length,
    invalidCount: invalid.length,
    geminiValidatedCount: 0,
    fallbackValidatedCount: valid.length,
    isGeminiAvailable: false,
    fallbackNotice: 'Basic local validation used. Content has passed structural checks but has not received AI linguistic verification.',
    valid,
    invalid,
    duplicates,
    existing,
    warnings: allReport.filter(r => r.status === 'warning'),
    allReport
  };
}

// ----------------------------------------------------------------------------
// Gemini AI Validation Engine
// ----------------------------------------------------------------------------

/**
 * Validates a batch of vocabulary items using Google Gemini API.
 * Uses structured JSON output with automatic retries and candidate model fallback.
 */
export async function validateVocabularyWithGemini(rawList, defaultType = 'word', existingSet = new Set()) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY is not configured in server environment.');
  }

  // Pre-filter with local basic parser to reject immediately malformed items
  const localPrecheck = validateVocabularyLocal(rawList, defaultType, existingSet);
  if (localPrecheck.valid.length === 0) {
    return localPrecheck;
  }

  const itemsToValidate = localPrecheck.valid.map((item, idx) => ({
    clientIndex: idx + 1,
    contentType: item.content_type,
    title: item.title,
    meaning: item.meaning,
    example: item.example,
    level: item.level || 'Unspecified',
    partOfSpeech: item.partOfSpeech || 'Unspecified'
  }));

  const prompt = `You are a certified English lexicographer and ESL curriculum reviewer for EdTechra Bitz.
Analyze the following batch of ${itemsToValidate.length} vocabulary entries across four content types (word, collocation, phrasal_verb, idiom).

Evaluate each item for:
1. Spelling and grammatical accuracy.
2. Definition correctness and clarity.
3. Natural English usage and whether the example sentence effectively demonstrates the correct meaning.
4. Content-type correctness:
   - "word": valid individual English word.
   - "collocation": natural, native multi-word combination (e.g. "make a decision", "deep sleep").
   - "phrasal_verb": legitimate verb + particle combination (e.g. "give up", "look forward to").
   - "idiom": recognized figurative idiom (e.g. "break the ice", "piece of cake").
5. CEFR difficulty level plausibility (A1, A2, B1, B2, C1, C2).

Input Items:
${JSON.stringify(itemsToValidate, null, 2)}

Respond with STRICT JSON only (an array of validation results for each item in order):
[
  {
    "clientIndex": 1,
    "isValid": true,
    "score": 0.95,
    "status": "valid",
    "warnings": [],
    "message": "Excellent natural usage and accurate definition.",
    "suggestedLevel": "B2"
  }
]
Status must be "valid", "warning", or "invalid". Return only raw JSON, no markdown codeblocks or conversational text.`;

  let geminiResults = null;
  let lastError = null;

  for (const modelName of CANDIDATE_GEMINI_MODELS) {
    // Retry up to 2 attempts per model for transient errors
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json'
            }
          })
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          const errMsg = errBody.error?.message || `HTTP ${response.status} from ${modelName}`;
          lastError = new Error(errMsg);

          // If quota exceeded or auth error, do not retry this model
          if (response.status === 429 || response.status === 401 || response.status === 403) {
            break;
          }
          continue;
        }

        const json = await response.json();
        const textContent = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textContent) {
          throw new Error('Gemini returned empty candidate response.');
        }

        // Clean any codeblock markers if present
        const cleaned = textContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(cleaned);

        if (Array.isArray(parsed)) {
          geminiResults = parsed;
          break;
        }
      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError') {
          lastError = new Error(`Gemini API request timed out after 12s (${modelName})`);
        }
        // Small backoff before attempt 2
        await new Promise(r => setTimeout(r, 400));
      }
    }

    if (geminiResults) break;
  }

  if (!geminiResults) {
    throw lastError || new Error('Failed to validate vocabulary with Gemini AI API.');
  }

  // Merge Gemini results back into our report
  const geminiMap = new Map(geminiResults.map(r => [r.clientIndex, r]));
  const finalValid = [];
  const finalInvalid = [...localPrecheck.invalid];
  const finalReport = [];

  localPrecheck.valid.forEach((item, idx) => {
    const clientIndex = idx + 1;
    const gRes = geminiMap.get(clientIndex);

    if (gRes && gRes.isValid === false) {
      finalInvalid.push({
        index: clientIndex,
        title: item.title,
        contentType: item.content_type,
        error: gRes.message || 'Linguistic validation failed by Gemini AI.',
        type: 'invalid',
        rawInput: item
      });
      finalReport.push({
        index: clientIndex,
        title: item.title,
        contentType: item.content_type,
        status: 'invalid',
        validationProvider: 'gemini',
        validationStatus: 'rejected',
        score: gRes.score || 0.3,
        message: gRes.message || 'Rejected by Gemini AI validation.',
        warnings: gRes.warnings || [],
        raw: item
      });
    } else {
      const hasWarnings = gRes && Array.isArray(gRes.warnings) && gRes.warnings.length > 0;
      finalValid.push({
        ...item,
        level: gRes?.suggestedLevel || item.level || 'B1'
      });
      finalReport.push({
        index: clientIndex,
        title: item.title,
        contentType: item.content_type,
        status: hasWarnings ? 'warning' : 'valid',
        validationProvider: 'gemini',
        validationStatus: 'gemini_validated',
        score: gRes?.score ?? 0.95,
        message: gRes?.message || 'Linguistically verified by Gemini AI.',
        warnings: gRes?.warnings || [],
        raw: item
      });
    }
  });

  return {
    totalDetected: rawList.length,
    validCount: finalValid.length,
    warningCount: finalReport.filter(r => r.status === 'warning').length,
    inBatchDuplicateCount: localPrecheck.inBatchDuplicateCount,
    existingCount: localPrecheck.existingCount,
    invalidCount: finalInvalid.length,
    geminiValidatedCount: finalValid.length,
    fallbackValidatedCount: 0,
    isGeminiAvailable: true,
    valid: finalValid,
    invalid: finalInvalid,
    duplicates: localPrecheck.duplicates,
    existing: localPrecheck.existing,
    allReport: [...finalReport, ...localPrecheck.allReport.filter(r => r.status === 'invalid' || r.status === 'duplicate_in_batch' || r.status === 'already_exists')]
  };
}

// ----------------------------------------------------------------------------
// Master Orchestrator with Resilient Fallback
// ----------------------------------------------------------------------------

export async function validateVocabularyBatch(rawList, options = {}) {
  const {
    defaultType = 'word',
    existingSet = new Set(),
    preferredMode = 'gemini'
  } = options;

  if (preferredMode === 'basic') {
    return validateVocabularyLocal(rawList, defaultType, existingSet);
  }

  // Attempt Gemini validation with automatic, graceful fallback
  try {
    return await validateVocabularyWithGemini(rawList, defaultType, existingSet);
  } catch (geminiErr) {
    console.warn('[VocabularyService] Gemini validation unavailable, switching to local fallback:', geminiErr.message);
    const fallback = validateVocabularyLocal(rawList, defaultType, existingSet);
    fallback.fallbackNotice = `Gemini validation is currently unavailable (${geminiErr.message}). The system has switched to basic local validation. Your content can still be imported, but it has NOT received AI linguistic validation.`;
    return fallback;
  }
}

// ----------------------------------------------------------------------------
// Gemini Connection Test
// ----------------------------------------------------------------------------

export async function testGeminiConnection() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    return {
      isConfigured: false,
      isConnected: false,
      provider: 'Gemini',
      status: 'unconfigured',
      message: 'GEMINI_API_KEY is not configured in server environment. Local fallback validation will be used automatically.'
    };
  }

  const maskedApiKey = apiKey.length > 8
    ? `${apiKey.slice(0, 4)}••••••••${apiKey.slice(-4)}`
    : '••••••••';

  for (const modelName of CANDIDATE_GEMINI_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with JSON {"ping":"pong"}' }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return {
          isConfigured: true,
          isConnected: true,
          provider: 'Gemini',
          model: modelName,
          maskedApiKey,
          status: 'connected',
          message: 'Gemini connection successful. AI linguistic validation is active.',
          lastChecked: new Date().toISOString()
        };
      }
    } catch (err) {
      // Continue to next model candidate
    }
  }

  return {
    isConfigured: true,
    isConnected: false,
    provider: 'Gemini',
    maskedApiKey,
    status: 'unavailable',
    message: 'Gemini unavailable. Local fallback validation will be used automatically.',
    lastChecked: new Date().toISOString()
  };
}

// ----------------------------------------------------------------------------
// Automatic Publishing Scheduler
// ----------------------------------------------------------------------------

/**
 * Checks for scheduled items whose release time has arrived,
 * and transitions them to published with strict idempotency.
 */
export async function publishScheduledVocabularyItems(serverSupabase = null) {
  const now = new Date();
  const cache = loadVocabularyCache();
  let updatedCount = 0;

  for (let i = 0; i < cache.length; i++) {
    const item = cache[i];
    if (item.status === 'scheduled' && item.scheduled_at) {
      const scheduledTime = new Date(item.scheduled_at);
      if (scheduledTime <= now) {
        cache[i].status = 'published';
        cache[i].published_at = new Date().toISOString();
        cache[i].updated_at = new Date().toISOString();
        updatedCount++;

        // Update in Supabase if configured
        if (serverSupabase) {
          try {
            await serverSupabase
              .from('words_of_the_day')
              .update({
                status: 'published',
                published_at: cache[i].published_at,
                updated_at: cache[i].updated_at
              })
              .eq('id', item.id)
              .eq('status', 'scheduled'); // Idempotent check
          } catch (dbErr) {
            console.warn('[Scheduler Publish Supabase Error]:', dbErr.message);
          }
        }
      }
    }
  }

  if (updatedCount > 0) {
    saveVocabularyCache(cache);
    console.log(`[Vocabulary Scheduler] Published ${updatedCount} scheduled vocabulary items.`);
  }

  return { updatedCount };
}

// ----------------------------------------------------------------------------
// Batch History Logger
// ----------------------------------------------------------------------------

export function logImportBatchRecord(batchData) {
  const batches = loadImportBatchesCache();
  const record = {
    id: batchData.id || `batch_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    created_at: new Date().toISOString(),
    created_by: batchData.createdBy || null,
    file_name: batchData.fileName || 'bulk_import.json',
    content_type: batchData.contentType || 'mixed',
    total_records: Number(batchData.totalRecords) || 0,
    successful_count: Number(batchData.successfulCount) || 0,
    rejected_count: Number(batchData.rejectedCount) || 0,
    duplicate_count: Number(batchData.duplicateCount) || 0,
    gemini_validated_count: Number(batchData.geminiValidatedCount) || 0,
    fallback_validated_count: Number(batchData.fallbackValidatedCount) || 0,
    status: batchData.status || 'completed',
    details: batchData.details || {}
  };

  batches.unshift(record);
  saveImportBatchesCache(batches.slice(0, 100)); // Keep recent 100 batches
  return record;
}
