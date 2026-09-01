// ============================================================================
// EDTECHRA-BITZ: Server Pixabay Image Search & Cloudflare R2 Ingestion Service
// Strictly Server-Side Only: PIXABAY_API_KEY is never exposed to frontend.
// Zero Hotlinking: Images are downloaded, center-cropped to 1:1 WebP, and stored in R2.
// ============================================================================

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { putBinaryContent, sanitizeSegment, buildPublicUrl } from './r2Service.mjs';

// In-Memory Search Cache (24 hours TTL)
const pixabaySearchCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Clean search query to extract core descriptive terms suitable for Pixabay API
 * e.g. "Octopuses Have Three Hearts" + "Animals & Wildlife" -> "octopus wildlife"
 */
export function buildPixabaySearchQuery(title = '', subtopic = '', category = '') {
  let combined = `${title} ${subtopic || ''}`.trim();
  
  // Remove punctuation, filler stopwords, and formatting characters
  combined = combined
    .replace(/[^\w\s-]/gi, ' ')
    .replace(/\b(why|how|what|when|where|who|have|has|had|looks|looks|look|the|a|an|is|are|in|on|at|and|or|of|from|with|for|to|into|about|that|this)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If title was too generic or cleaned to nothing, fall back to subtopic or category
  if (!combined || combined.length < 3) {
    combined = `${subtopic || ''} ${category || ''}`.replace(/[^\w\s-]/gi, ' ').trim();
  }

  // Pixabay query max length is 100 chars, limit to top 4-5 keywords for best matching
  const terms = combined.split(' ').filter(Boolean).slice(0, 4);
  return terms.join(' ') || 'nature';
}

/**
 * Search Pixabay with in-memory caching and safe error logging
 */
export async function searchPixabay({
  query,
  category = null,
  imageType = 'photo',
  safesearch = true,
  perPage = 5,
  orientation = 'all'
} = {}) {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.warn('[PIXABAY_ERROR] PIXABAY_API_KEY is not configured in server environment.');
    return {
      success: false,
      error: 'PIXABAY_API_KEY is not configured on server.',
      hits: []
    };
  }

  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) {
    return { success: true, hits: [] };
  }

  const cacheKey = `${cleanQuery.toLowerCase()}|${category || ''}|${imageType}|${orientation}`;
  const cached = pixabaySearchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { success: true, hits: cached.hits, cached: true };
  }

  try {
    const url = new URL('https://pixabay.com/api/');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('q', cleanQuery);
    url.searchParams.set('image_type', imageType);
    url.searchParams.set('safesearch', String(safesearch));
    url.searchParams.set('per_page', String(Math.max(3, Math.min(20, perPage))));
    url.searchParams.set('orientation', orientation);
    if (category) {
      url.searchParams.set('category', category);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`[PIXABAY_ERROR] HTTP ${response.status} for query="${cleanQuery}":`, errorText);
      return {
        success: false,
        error: `Pixabay API returned status ${response.status}`,
        hits: []
      };
    }

    const data = await response.json();
    const hits = (data.hits || []).map(hit => ({
      id: hit.id,
      pageURL: hit.pageURL,
      type: hit.type,
      tags: hit.tags,
      previewURL: hit.previewURL,
      webformatURL: hit.webformatURL,
      largeImageURL: hit.largeImageURL,
      imageWidth: hit.imageWidth,
      imageHeight: hit.imageHeight,
      views: hit.views,
      downloads: hit.downloads,
      likes: hit.likes,
      user: hit.user
    }));

    // Cache successful search
    pixabaySearchCache.set(cacheKey, {
      hits,
      timestamp: Date.now()
    });

    return {
      success: true,
      hits,
      total: data.totalHits || hits.length
    };
  } catch (err) {
    console.error(`[PIXABAY_ERROR] Exception querying Pixabay for query="${cleanQuery}":`, err.message || err);
    return {
      success: false,
      error: 'Failed to contact Pixabay API.',
      hits: []
    };
  }
}

/**
 * Select the highest quality, most suitable candidate image from Pixabay results
 */
export function selectBestCandidate(hits = []) {
  if (!Array.isArray(hits) || hits.length === 0) return null;

  // Score candidate images based on resolution and like metrics
  const scored = hits.map(hit => {
    let score = 0;
    const w = hit.imageWidth || 0;
    const h = hit.imageHeight || 0;

    // Favor high resolution
    if (w >= 1000 && h >= 1000) score += 30;
    else if (w >= 640 && h >= 640) score += 15;

    // Favor aspect ratio closer to 1:1 or 4:3 (better for square center crop)
    if (w > 0 && h > 0) {
      const ratio = w / h;
      if (ratio >= 0.8 && ratio <= 1.4) score += 25;
      else if (ratio >= 0.6 && ratio <= 1.8) score += 10;
    }

    // Add metric bonuses
    score += Math.min(20, (hit.likes || 0) / 10);

    return { hit, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.hit || hits[0];
}

/**
 * Download selected Pixabay image, convert/crop into 1:1 square WebP with Sharp, and store in R2
 */
export async function downloadAndStoreImage(hit, bitzId = 'bitz') {
  if (!hit) throw new Error('Pixabay image hit object is required.');

  const downloadUrl = hit.largeImageURL || hit.webformatURL || hit.previewURL;
  if (!downloadUrl) throw new Error('No valid download URL found on Pixabay hit.');

  // 1. Download image binary from Pixabay CDN
  const imgRes = await fetch(downloadUrl);
  if (!imgRes.ok) {
    throw new Error(`Failed to download Pixabay image from CDN (status ${imgRes.status})`);
  }

  const arrayBuffer = await imgRes.arrayBuffer();
  const rawBuffer = Buffer.from(arrayBuffer);

  // 2. Crop into 1:1 square WebP (1024x1024, quality: 86)
  let processedBuffer = rawBuffer;
  try {
    const sharpModule = await import('sharp');
    const sharpInstance = sharpModule.default || sharpModule;

    processedBuffer = await sharpInstance(rawBuffer)
      .resize({
        width: 1024,
        height: 1024,
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 86, effort: 4 })
      .toBuffer();
  } catch (sharpErr) {
    console.warn('[PixabayService] Sharp resize notice, using original buffer:', sharpErr.message);
  }

  // 3. Upload to Cloudflare R2
  const cleanId = sanitizeSegment(bitzId || 'bitz');
  const objectKey = `bitz/covers/${cleanId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.webp`;

  let publicUrl = '';
  try {
    const uploadResult = await putBinaryContent(objectKey, processedBuffer, 'image/webp');
    publicUrl = uploadResult.publicUrl;
  } catch (r2Err) {
    console.warn('[PixabayService] R2 direct upload unavailable, using local buffer fallback:', r2Err.message);
    
    // Local static file storage fallback
    const localDir = path.join(process.cwd(), 'public', 'uploads', 'bitz');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const localFilename = `${cleanId}_${Date.now()}.webp`;
    const localFilePath = path.join(localDir, localFilename);
    fs.writeFileSync(localFilePath, processedBuffer);
    publicUrl = `/uploads/bitz/${localFilename}`;
  }

  return {
    publicUrl,
    objectKey,
    imageSource: 'pixabay',
    imageSourceId: String(hit.id),
    imageSourceUrl: hit.pageURL || null
  };
}

/**
 * Complete Automated Pipeline:
 * For a newly created/imported Bitz where visual_url is empty:
 * Searches Pixabay -> Downloads -> Stores in R2 -> Updates Bitz record in Supabase / Local cache
 */
export async function autoAssignPixabayImageToBitz(bitz, supabaseClient = null) {
  if (!bitz) return null;

  // PRIORITY RULE: If visual_url already exists (e.g. admin-uploaded or explicitly provided), NEVER overwrite
  if (bitz.visual_url && bitz.visual_url.trim() !== '') {
    return bitz;
  }

  const query = buildPixabaySearchQuery(bitz.title, bitz.sub_topic, bitz.category);
  console.log(`[Pixabay Pipeline] Searching image for Bitz "${bitz.title}" with query: "${query}"`);

  const searchRes = await searchPixabay({ query, perPage: 6 });
  if (!searchRes.success || !searchRes.hits || searchRes.hits.length === 0) {
    console.log(`[Pixabay Pipeline] No Pixabay image found for query: "${query}". Setting visual_status="missing".`);
    bitz.visual_url = null;
    bitz.visual_status = 'missing';
    bitz.image_source = 'none';
    return bitz;
  }

  const bestHit = selectBestCandidate(searchRes.hits);
  if (!bestHit) {
    bitz.visual_url = null;
    bitz.visual_status = 'missing';
    bitz.image_source = 'none';
    return bitz;
  }

  try {
    const stored = await downloadAndStoreImage(bestHit, bitz.id || bitz.bitz_code);

    bitz.visual_url = stored.publicUrl;
    bitz.visual_object_key = stored.objectKey;
    bitz.visual_status = 'ready';
    bitz.image_source = 'pixabay';
    bitz.image_source_id = stored.imageSourceId;
    bitz.image_source_url = stored.imageSourceUrl;

    console.log(`[Pixabay Pipeline] Successfully stored image for Bitz "${bitz.title}" -> ${stored.publicUrl}`);

    // If Supabase client provided, update database record
    if (supabaseClient && bitz.id) {
      try {
        let { error: updateErr } = await supabaseClient
          .from('knowledge_bitz')
          .update({
            visual_url: stored.publicUrl,
            visual_object_key: stored.objectKey,
            visual_status: 'ready',
            image_source: 'pixabay',
            image_source_id: stored.imageSourceId,
            image_source_url: stored.imageSourceUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', bitz.id);

        if (updateErr && updateErr.code === 'PGRST204') {
          // Schema doesn't have optional image_source_id/url columns yet
          await supabaseClient
            .from('knowledge_bitz')
            .update({
              visual_url: stored.publicUrl,
              visual_object_key: stored.objectKey,
              visual_status: 'ready',
              image_source: 'pixabay',
              updated_at: new Date().toISOString()
            })
            .eq('id', bitz.id);
        }
      } catch (dbErr) {
        console.warn('[Pixabay Pipeline] Database update notice:', dbErr.message);
      }
    }

    return bitz;
  } catch (err) {
    console.error(`[PIXABAY_ERROR] Failed to download and store image for "${bitz.title}":`, err.message || err);
    bitz.visual_url = null;
    bitz.visual_status = 'missing';
    bitz.image_source = 'none';
    return bitz;
  }
}
