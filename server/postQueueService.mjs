// ============================================================================
// EDTECHRA-BITZ: Admin Post Queue Service & Background Sequential Publisher
// Zero Gemini validation | Resilient Supabase + JSON Cache | Idempotent Publishing
// ============================================================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUEUE_CACHE_FILE = path.resolve(__dirname, 'data/admin_post_queue.json');
const POSTS_CACHE_FILE = path.resolve(__dirname, 'data/posts_cache.json');

// Ensure data directory exists
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {}
}

/**
 * Load queue records from JSON cache
 */
export function loadQueueCache() {
  try {
    if (fs.existsSync(QUEUE_CACHE_FILE)) {
      const data = fs.readFileSync(QUEUE_CACHE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('[PostQueueService] Error reading queue cache:', err.message);
  }
  return [];
}

/**
 * Save queue records to JSON cache
 */
export function saveQueueCache(queue) {
  try {
    fs.writeFileSync(QUEUE_CACHE_FILE, JSON.stringify(queue, null, 2), 'utf8');
  } catch (err) {
    console.error('[PostQueueService] Error writing queue cache:', err.message);
  }
}

/**
 * Helper to load posts cache
 */
function loadPostsCacheInternal() {
  try {
    if (fs.existsSync(POSTS_CACHE_FILE)) {
      const data = fs.readFileSync(POSTS_CACHE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('[PostQueueService] Error reading posts cache:', err.message);
  }
  return [];
}

/**
 * Helper to save posts cache
 */
function savePostsCacheInternal(posts) {
  try {
    fs.writeFileSync(POSTS_CACHE_FILE, JSON.stringify(posts, null, 2), 'utf8');
  } catch (err) {
    console.error('[PostQueueService] Error writing posts cache:', err.message);
  }
}

/**
 * Create a new batch of pre-approved images in the publishing queue
 * CRITICAL: Zero Gemini AI validation is executed.
 */
export async function createQueueBatch(adminUser, payload, supabase) {
  if (!adminUser || !adminUser.id) {
    throw new Error('Admin authentication required.');
  }

  const {
    batchName = `Batch #${new Date().toISOString().slice(0, 10)}`,
    defaultCaption = '',
    intervalMinutes = 360,
    order = 'upload_order',
    items = []
  } = payload;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one image item is required to create a batch queue.');
  }

  const nowTime = Date.now();
  const nowIso = new Date(nowTime).toISOString();
  const batchId = `batch_${nowTime}_${crypto.randomBytes(3).toString('hex')}`;

  const orderedItems = order === 'reverse_order' ? [...items].reverse() : [...items];

  const queueRecords = orderedItems.map((item, index) => {
    const queuePosition = index + 1;
    // Calculate scheduled_at based on interval
    // Item 1 (position 1) is scheduled for now.
    // Subsequent items are spaced by intervalMinutes.
    const scheduledTime = nowTime + (index * Math.max(0, intervalMinutes) * 60 * 1000);
    const scheduledAt = new Date(scheduledTime).toISOString();

    const recordId = crypto.randomUUID();

    return {
      id: recordId,
      batch_id: batchId,
      batch_name: batchName || `Batch #${batchId.slice(-6)}`,
      caption: (item.caption && item.caption.trim()) || defaultCaption.trim() || null,
      image_url: item.imageUrl,
      image_object_key: item.imageObjectKey,
      storage_provider: 'r2',
      image_width: item.imageWidth || null,
      image_height: item.imageHeight || null,
      image_size_bytes: item.imageSizeBytes || null,
      image_format: item.imageFormat || 'webp',
      uploaded_by: adminUser.id,
      validation_status: 'manually_approved',
      validation_provider: 'manual',
      status: 'queued',
      queue_position: queuePosition,
      interval_minutes: Math.max(0, intervalMinutes),
      scheduled_at: scheduledAt,
      published_at: null,
      feed_post_id: null,
      error_message: null,
      created_at: nowIso,
      updated_at: nowIso
    };
  });

  // 1. Save to local resilient cache
  const cache = loadQueueCache();
  const updatedCache = [...queueRecords, ...cache];
  saveQueueCache(updatedCache);

  // 2. Save to Supabase if available
  if (supabase) {
    try {
      const { error: sbErr } = await supabase.from('admin_post_queue').insert(queueRecords);
      if (sbErr) {
        console.warn('[PostQueueService] Supabase insert warning (cached locally):', sbErr.message);
      } else {
        console.log(`[PostQueueService] Saved ${queueRecords.length} queue records to Supabase`);
      }
    } catch (sbEx) {
      console.warn('[PostQueueService] Supabase insert exception:', sbEx.message);
    }
  }

  // 3. Immediately trigger sequential queue processor to publish any due item (e.g. position 1)
  processPublishingQueue(supabase).catch((err) => {
    console.error('[PostQueueService] Immediate queue process error:', err.message);
  });

  return {
    success: true,
    batchId,
    batchName,
    intervalMinutes,
    totalQueued: queueRecords.length,
    items: queueRecords
  };
}

/**
 * Background Sequential Publishing Engine
 * Selects eligible queued items whose scheduled_at <= now, locks item, creates student_post,
 * updates queue item with feed_post_id, and handles errors safely.
 */
let isProcessingQueue = false;

export async function processPublishingQueue(supabase) {
  if (isProcessingQueue) {
    return { skipped: true, reason: 'Already processing' };
  }

  isProcessingQueue = true;
  const processedItems = [];

  try {
    const nowIso = new Date().toISOString();
    let queue = loadQueueCache();

    // Find all queued items eligible for publishing (status === 'queued' AND scheduled_at <= now)
    // Ordered by scheduled_at ASC, queue_position ASC
    const eligibleItems = queue
      .filter((item) => item.status === 'queued' && new Date(item.scheduled_at) <= new Date(nowIso))
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime() || a.queue_position - b.queue_position);

    if (eligibleItems.length === 0) {
      isProcessingQueue = false;
      return { count: 0, processed: [] };
    }

    console.log(`[PostQueueService] Processing ${eligibleItems.length} eligible queued items...`);

    for (const item of eligibleItems) {
      // Re-check lock to prevent race conditions
      if (item.status !== 'queued') continue;

      // Duplicate protection: if already published or has feed_post_id, skip
      if (item.feed_post_id) {
        console.log(`[PostQueueService] Item ${item.id} already has feed_post_id ${item.feed_post_id}, skipping duplicate.`);
        item.status = 'published';
        continue;
      }

      // Mark as publishing
      item.status = 'publishing';
      item.updated_at = new Date().toISOString();
      saveQueueCache(queue);

      try {
        const publishNowIso = new Date().toISOString();
        const newPostId = crypto.randomUUID();

        // Construct standard feed post
        const newPost = {
          id: newPostId,
          user_id: item.uploaded_by,
          caption: item.caption || item.batch_name || 'Educational Resource',
          image_url: item.image_url,
          image_object_key: item.image_object_key,
          storage_provider: item.storage_provider || 'r2',
          status: 'approved',
          moderation_status: 'approved',
          moderation_reason: 'Administrator Pre-Approved (Zero AI validation)',
          moderated_at: publishNowIso,
          likes_count: 0,
          comments_count: 0,
          image_width: item.image_width || null,
          image_height: item.image_height || null,
          image_size_bytes: item.image_size_bytes || null,
          image_format: item.image_format || 'webp',
          created_at: publishNowIso,
          updated_at: publishNowIso
        };

        // 1. Insert into resilient posts cache
        const postsCache = loadPostsCacheInternal();
        postsCache.unshift(newPost);
        savePostsCacheInternal(postsCache);

        // 2. Insert into Supabase student_posts table if available
        if (supabase) {
          try {
            const { error: postErr } = await supabase.from('student_posts').insert([newPost]);
            if (postErr) {
              console.warn('[PostQueueService] Supabase student_posts insert error:', postErr.message);
            } else {
              console.log(`[PostQueueService] Published feed post created in Supabase: ${newPost.id}`);
            }
          } catch (sbErr) {
            console.warn('[PostQueueService] Supabase insert post exception:', sbErr.message);
          }
        }

        // 3. Mark queue item as published with feed_post_id
        item.status = 'published';
        item.published_at = publishNowIso;
        item.feed_post_id = newPostId;
        item.error_message = null;
        item.updated_at = publishNowIso;

        // Update in Supabase queue table
        if (supabase) {
          try {
            await supabase
              .from('admin_post_queue')
              .update({
                status: 'published',
                published_at: publishNowIso,
                feed_post_id: newPostId,
                error_message: null,
                updated_at: publishNowIso
              })
              .eq('id', item.id);
          } catch (upErr) {}
        }

        saveQueueCache(queue);
        processedItems.push(item);
        console.log(`[PostQueueService] Successfully published queue item ${item.id} (Batch: ${item.batch_id}, Pos: ${item.queue_position})`);

        // If batch interval is 0 (immediately one by one), brief pause between publishes
        if (item.interval_minutes === 0) {
          await new Promise((r) => setTimeout(r, 200));
        }
      } catch (publishErr) {
        console.error(`[PostQueueService] Failed to publish queue item ${item.id}:`, publishErr.message);
        item.status = 'failed';
        item.error_message = publishErr.message || 'Unknown publishing error';
        item.updated_at = new Date().toISOString();

        if (supabase) {
          try {
            await supabase
              .from('admin_post_queue')
              .update({
                status: 'failed',
                error_message: item.error_message,
                updated_at: item.updated_at
              })
              .eq('id', item.id);
          } catch (e) {}
        }

        saveQueueCache(queue);
      }
    }
  } catch (err) {
    console.error('[PostQueueService] Critical error in processPublishingQueue:', err.message);
  } finally {
    isProcessingQueue = false;
  }

  return { count: processedItems.length, processed: processedItems };
}

/**
 * Get comprehensive queue overview and grouped batch statistics
 */
export async function getQueueOverview(supabase) {
  let queue = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('admin_post_queue')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        queue = data;
        // sync to cache
        saveQueueCache(queue);
      } else {
        queue = loadQueueCache();
      }
    } catch (err) {
      queue = loadQueueCache();
    }
  } else {
    queue = loadQueueCache();
  }

  // Calculate high-level stats
  const stats = {
    total: queue.length,
    published: queue.filter((i) => i.status === 'published').length,
    publishing: queue.filter((i) => i.status === 'publishing').length,
    queued: queue.filter((i) => i.status === 'queued').length,
    failed: queue.filter((i) => i.status === 'failed').length,
    paused: queue.filter((i) => i.status === 'paused').length
  };

  // Group by batch_id
  const batchMap = new Map();
  for (const item of queue) {
    const bId = item.batch_id || 'default_batch';
    if (!batchMap.has(bId)) {
      batchMap.set(bId, {
        batch_id: bId,
        batch_name: item.batch_name || `Batch #${bId.slice(-6)}`,
        interval_minutes: item.interval_minutes || 0,
        created_at: item.created_at,
        total_items: 0,
        published_items: 0,
        publishing_items: 0,
        queued_items: 0,
        failed_items: 0,
        paused_items: 0,
        next_scheduled_at: null,
        items: []
      });
    }

    const b = batchMap.get(bId);
    b.total_items++;
    if (item.status === 'published') b.published_items++;
    else if (item.status === 'publishing') b.publishing_items++;
    else if (item.status === 'queued') {
      b.queued_items++;
      if (!b.next_scheduled_at || new Date(item.scheduled_at) < new Date(b.next_scheduled_at)) {
        b.next_scheduled_at = item.scheduled_at;
      }
    } else if (item.status === 'failed') b.failed_items++;
    else if (item.status === 'paused') b.paused_items++;

    b.items.push(item);
  }

  // Sort batches by newest created_at
  const batches = Array.from(batchMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return {
    success: true,
    stats,
    batches,
    totalBatches: batches.length,
    rawQueueCount: queue.length
  };
}

/**
 * Trigger immediate publication of a specific queue item
 */
export async function publishItemNow(itemId, supabase) {
  let queue = loadQueueCache();
  const itemIndex = queue.findIndex((i) => i.id === itemId);

  if (itemIndex === -1) {
    throw new Error('Queue item not found.');
  }

  const item = queue[itemIndex];
  if (item.status === 'published' && item.feed_post_id) {
    throw new Error('This item has already been published to the feed.');
  }

  // Set scheduled_at to now and status to queued
  item.scheduled_at = new Date(Date.now() - 1000).toISOString();
  item.status = 'queued';
  item.updated_at = new Date().toISOString();
  saveQueueCache(queue);

  if (supabase) {
    try {
      await supabase
        .from('admin_post_queue')
        .update({
          scheduled_at: item.scheduled_at,
          status: 'queued',
          updated_at: item.updated_at
        })
        .eq('id', itemId);
    } catch (e) {}
  }

  // Process immediately
  await processPublishingQueue(supabase);

  return { success: true, message: 'Item triggered for immediate publication.' };
}

/**
 * Pause a batch (prevents scheduled items from publishing)
 */
export async function pauseQueueBatch(batchId, supabase) {
  let queue = loadQueueCache();
  let count = 0;

  queue.forEach((item) => {
    if (item.batch_id === batchId && item.status === 'queued') {
      item.status = 'paused';
      item.updated_at = new Date().toISOString();
      count++;
    }
  });

  saveQueueCache(queue);

  if (supabase) {
    try {
      await supabase
        .from('admin_post_queue')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('batch_id', batchId)
        .eq('status', 'queued');
    } catch (e) {}
  }

  return { success: true, pausedCount: count, message: `Batch ${batchId} paused.` };
}

/**
 * Resume a paused batch (resets remaining items to queued and reschedules sequentially from now)
 */
export async function resumeQueueBatch(batchId, supabase) {
  let queue = loadQueueCache();
  const now = Date.now();
  let count = 0;

  // Filter paused items for this batch sorted by position
  const pausedItems = queue
    .filter((i) => i.batch_id === batchId && i.status === 'paused')
    .sort((a, b) => a.queue_position - b.queue_position);

  pausedItems.forEach((item, idx) => {
    item.status = 'queued';
    const intervalMins = item.interval_minutes || 0;
    item.scheduled_at = new Date(now + (idx * intervalMins * 60 * 1000)).toISOString();
    item.updated_at = new Date().toISOString();
    count++;
  });

  saveQueueCache(queue);

  if (supabase) {
    try {
      for (const item of pausedItems) {
        await supabase
          .from('admin_post_queue')
          .update({
            status: 'queued',
            scheduled_at: item.scheduled_at,
            updated_at: item.updated_at
          })
          .eq('id', item.id);
      }
    } catch (e) {}
  }

  // Trigger publishing runner
  processPublishingQueue(supabase).catch(() => {});

  return { success: true, resumedCount: count, message: `Batch ${batchId} resumed.` };
}

/**
 * Cancel remaining unpublished items in a batch
 */
export async function cancelQueueBatch(batchId, supabase) {
  let queue = loadQueueCache();
  let count = 0;

  queue.forEach((item) => {
    if (item.batch_id === batchId && (item.status === 'queued' || item.status === 'paused' || item.status === 'failed')) {
      item.status = 'cancelled';
      item.updated_at = new Date().toISOString();
      count++;
    }
  });

  saveQueueCache(queue);

  if (supabase) {
    try {
      await supabase
        .from('admin_post_queue')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('batch_id', batchId)
        .in('status', ['queued', 'paused', 'failed']);
    } catch (e) {}
  }

  return { success: true, cancelledCount: count, message: `Batch ${batchId} cancelled.` };
}

/**
 * Retry a failed queue item
 */
export async function retryQueueItem(itemId, supabase) {
  let queue = loadQueueCache();
  const item = queue.find((i) => i.id === itemId);

  if (!item) {
    throw new Error('Queue item not found.');
  }

  item.status = 'queued';
  item.scheduled_at = new Date(Date.now() - 1000).toISOString();
  item.error_message = null;
  item.updated_at = new Date().toISOString();

  saveQueueCache(queue);

  if (supabase) {
    try {
      await supabase
        .from('admin_post_queue')
        .update({
          status: 'queued',
          scheduled_at: item.scheduled_at,
          error_message: null,
          updated_at: item.updated_at
        })
        .eq('id', itemId);
    } catch (e) {}
  }

  // Trigger processing
  processPublishingQueue(supabase).catch(() => {});

  return { success: true, message: 'Item reset to queued for retry.' };
}
