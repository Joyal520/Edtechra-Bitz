import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.OPENAI_API_KEY?.trim();

let openaiClient = null;
if (apiKey) {
  openaiClient = new OpenAI({ apiKey });
}

// In-flight moderation locks to prevent duplicate simultaneous calls for the same post/upload
const activeModerationLocks = new Set();

/**
 * Sends image and optional caption to OpenAI omni-moderation-latest
 * Returns status: 'approved' | 'rejected' | 'review'
 */
export async function moderatePostContent({ postId, imageUrl, caption = '' }) {
  if (!imageUrl) {
    return {
      status: 'rejected',
      flagged: true,
      reason: 'Missing media URL.'
    };
  }

  // Prevent duplicate concurrent moderation calls for the same post
  const lockKey = `${postId || ''}_${imageUrl}`;
  if (activeModerationLocks.has(lockKey)) {
    console.log(`[Moderation] Duplicate moderation request locked for: ${lockKey}`);
    return {
      status: 'pending',
      reason: 'Moderation already in progress.'
    };
  }

  activeModerationLocks.add(lockKey);
  const startTime = Date.now();

  try {
    if (!openaiClient) {
      console.warn('[Moderation Warning] OPENAI_API_KEY is not configured on server. Marking post for admin review.');
      return {
        status: 'review',
        flagged: null,
        reason: 'OpenAI API key is missing on the server.'
      };
    }

    const input = [
      {
        type: 'image_url',
        image_url: {
          url: imageUrl
        }
      }
    ];

    if (caption && caption.trim()) {
      input.unshift({
        type: 'text',
        text: caption.trim()
      });
    }

    console.log(`[Moderation] Submitting image to OpenAI omni-moderation-latest (postId: ${postId || 'new'})...`);

    const response = await openaiClient.moderations.create({
      model: 'omni-moderation-latest',
      input
    });

    const durationMs = Date.now() - startTime;
    const result = response.results?.[0];

    if (!result) {
      console.warn(`[Moderation] Empty response from OpenAI (duration: ${durationMs}ms). Marking for review.`);
      return {
        status: 'review',
        flagged: null,
        reason: 'Empty result from moderation API.',
        durationMs
      };
    }

    const isFlagged = Boolean(result.flagged);
    const categories = result.categories || {};
    const categoryScores = result.category_scores || {};

    // Extract flagged category names for internal audit logging
    const flaggedCategories = Object.entries(categories)
      .filter(([_, val]) => Boolean(val))
      .map(([cat]) => cat);

    console.log(`[Moderation Result] postId: ${postId || 'new'} | flagged: ${isFlagged} | duration: ${durationMs}ms`);

    if (isFlagged) {
      return {
        status: 'rejected',
        flagged: true,
        reason: flaggedCategories.length > 0
          ? `Flagged for: ${flaggedCategories.join(', ')}`
          : 'Flagged by content guidelines.',
        categories,
        categoryScores,
        durationMs
      };
    }

    return {
      status: 'approved',
      flagged: false,
      reason: 'Passed automated AI safety guidelines.',
      categories,
      categoryScores,
      durationMs
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`[Moderation Error] Failed after ${durationMs}ms:`, error.message);

    // Fail-safe: NEVER auto-approve on error. Mark for manual review.
    return {
      status: 'review',
      flagged: null,
      reason: `Moderation service temporarily unavailable (${error.message})`,
      durationMs
    };
  } finally {
    activeModerationLocks.delete(lockKey);
  }
}
