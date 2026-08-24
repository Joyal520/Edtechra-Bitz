// ============================================================================
// EDTECHRA-BITZ: Admin Post Queue Service & Background Sequential Publisher
// Primary: Supabase DB (Vercel serverless compatible) | Fallback: JSON Cache
// Zero Gemini AI validation | Sequential Interval Timing | Idempotent Publishing
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
 * Load queue records from local JSON cache (fallback)
 */
export function loadQueueCache() {
  try {
    if (fs.existsSync(QUEUE_CACHE_FILE)) {
      const data = fs.readFileSync(QUEUE_CACHE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    // ignore read error in serverless
  }
  return [];
}

/**
 * Save queue records to local JSON cache (fallback)
 */
export function saveQueueCache(queue) {
  try {
    fs.writeFileSync(QUEUE_CACHE_FILE, JSON.stringify(queue, null, 2), 'utf8');
  } catch (err) {
    // ignore write error in read-only serverless
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
  } catch (err) {}
  return [];
}

/**
 * Helper to save posts cache
 */
function savePostsCacheInternal(posts) {
  try {
    fs.writeFileSync(POSTS_CACHE_FILE, JSON.stringify(posts, null, 2), 'utf8');
  } catch (err) {}
}

/**
 * Helper to fetch all queue items from Supabase (or fallback to cache)
 */
async function fetchAllQueueItems(supabase) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('admin_post_queue')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        saveQueueCache(data);
        return data;
      }
    } catch (err) {
      console.warn('[PostQueueService] Supabase fetch error, using cache:', err.message);
    }
  }
  return loadQueueCache();
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

  // In-batch deduplication: filter out any repeated image_url or image_object_key within the same batch
  const seenKeys = new Set();
  const uniqueItems = [];
  for (const item of orderedItems) {
    const key = (item.imageObjectKey || item.imageUrl || '').toLowerCase().trim();
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueItems.push(item);
    }
  }

  if (uniqueItems.length === 0) {
    throw new Error('No valid non-duplicate image items found.');
  }

  // Cross-batch duplicate check against Supabase
  let finalItems = uniqueItems;
  if (supabase) {
    try {
      const keysToCheck = uniqueItems.map((i) => i.imageObjectKey).filter(Boolean);
      if (keysToCheck.length > 0) {
        const { data: existingQueue } = await supabase
          .from('admin_post_queue')
          .select('image_object_key')
          .in('image_object_key', keysToCheck)
          .in('status', ['queued', 'publishing', 'published']);

        if (existingQueue && existingQueue.length > 0) {
          const existingKeySet = new Set(existingQueue.map((e) => e.image_object_key.toLowerCase()));
          const filtered = uniqueItems.filter((i) => !existingKeySet.has(i.imageObjectKey.toLowerCase()));
          if (filtered.length > 0) {
            finalItems = filtered;
          } else {
            throw new Error('All selected images have already been uploaded or queued in previous batches.');
          }
        }
      }
    } catch (e) {
      if (e.message.includes('All selected images have already')) throw e;
      console.warn('[PostQueueService] Cross-batch duplicate check notice:', e.message);
    }
  }

  const queueRecords = finalItems.map((item, index) => {
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

  // 1. Save to Supabase (primary)
  if (supabase) {
    try {
      const { error: sbErr } = await supabase.from('admin_post_queue').insert(queueRecords);
      if (sbErr) {
        console.error('[PostQueueService] Supabase admin_post_queue insert error:', sbErr.message);
      } else {
        console.log(`[PostQueueService] Successfully inserted ${queueRecords.length} queue records into Supabase`);
      }
    } catch (sbEx) {
      console.error('[PostQueueService] Supabase insert exception:', sbEx.message);
    }
  }

  // 2. Save to local resilient cache
  const cache = loadQueueCache();
  saveQueueCache([...queueRecords, ...cache]);

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
 * Queries Supabase (or cache) for eligible queued items (status === 'queued' AND scheduled_at <= now),
 * locks item, creates standard student_post in Supabase, and updates queue item with feed_post_id.
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
    let eligibleItems = [];

    // 1. Fetch eligible items directly from Supabase (Primary)
    if (supabase) {
      try {
        const { data: dbItems, error: queryErr } = await supabase
          .from('admin_post_queue')
          .select('*')
          .eq('status', 'queued')
          .lte('scheduled_at', nowIso)
          .order('scheduled_at', { ascending: true })
          .order('queue_position', { ascending: true });

        if (!queryErr && Array.isArray(dbItems)) {
          eligibleItems = dbItems;
        }
      } catch (e) {
        console.warn('[PostQueueService] Supabase eligible query warning:', e.message);
      }
    }

    // Fallback to local cache if no Supabase items
    if (eligibleItems.length === 0) {
      const cache = loadQueueCache();
      eligibleItems = cache
        .filter((item) => item.status === 'queued' && new Date(item.scheduled_at) <= new Date(nowIso))
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime() || a.queue_position - b.queue_position);
    }

    if (eligibleItems.length === 0) {
      isProcessingQueue = false;
      return { count: 0, processed: [] };
    }

    console.log(`[PostQueueService] Found ${eligibleItems.length} eligible queued items to publish...`);

    for (const item of eligibleItems) {
      // Lock / check to prevent duplicate publish
      if (item.status !== 'queued' && item.status !== 'failed') continue;
      if (item.feed_post_id) {
        console.log(`[PostQueueService] Item ${item.id} already has feed_post_id ${item.feed_post_id}, skipping duplicate.`);
        continue;
      }

      // Mark status as publishing in Supabase & cache
      const publishingIso = new Date().toISOString();
      if (supabase) {
        try {
          await supabase
            .from('admin_post_queue')
            .update({ status: 'publishing', updated_at: publishingIso })
            .eq('id', item.id);
        } catch (e) {}
      }

      try {
        const publishNowIso = new Date().toISOString();
        const newPostId = crypto.randomUUID();

        // Construct standard feed post
        const newPost = {
          id: newPostId,
          user_id: item.uploaded_by,
          caption: item.caption || item.batch_name || 'Knowledge Share',
          image_url: item.image_url,
          image_object_key: item.image_object_key,
          storage_provider: item.storage_provider || 'r2',
          status: 'approved',
          likes_count: 0,
          comments_count: 0,
          image_width: item.image_width || null,
          image_height: item.image_height || null,
          image_size_bytes: item.image_size_bytes || null,
          image_format: item.image_format || 'webp',
          created_at: publishNowIso,
          updated_at: publishNowIso
        };

        // 1. Insert into Supabase student_posts table (Primary)
        if (supabase) {
          const { error: postErr } = await supabase.from('student_posts').insert([newPost]);
          if (postErr) {
            console.error('[PostQueueService] Supabase student_posts insert error:', postErr.message);
            throw new Error(`Supabase student_posts error: ${postErr.message}`);
          }
          console.log(`[PostQueueService] Published feed post created in Supabase: ${newPost.id}`);
        }

        // 2. Insert into resilient posts cache
        const postsCache = loadPostsCacheInternal();
        postsCache.unshift(newPost);
        savePostsCacheInternal(postsCache);

        // 3. Mark queue item as published with feed_post_id in Supabase
        if (supabase) {
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
        }

        // Update local cache
        const queueCache = loadQueueCache();
        const cachedItem = queueCache.find((i) => i.id === item.id);
        if (cachedItem) {
          cachedItem.status = 'published';
          cachedItem.published_at = publishNowIso;
          cachedItem.feed_post_id = newPostId;
          cachedItem.error_message = null;
          cachedItem.updated_at = publishNowIso;
          saveQueueCache(queueCache);
        }

        processedItems.push({
          ...item,
          status: 'published',
          published_at: publishNowIso,
          feed_post_id: newPostId
        });

        console.log(`[PostQueueService] Successfully published queue item ${item.id} (Batch: ${item.batch_id}, Pos: #${item.queue_position})`);

        // If batch interval is 0 (immediately one by one), small delay between sequential posts
        if (item.interval_minutes === 0) {
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch (publishErr) {
        console.error(`[PostQueueService] Failed to publish queue item ${item.id}:`, publishErr.message);
        const errorIso = new Date().toISOString();

        if (supabase) {
          try {
            await supabase
              .from('admin_post_queue')
              .update({
                status: 'failed',
                error_message: publishErr.message || 'Unknown publishing error',
                updated_at: errorIso
              })
              .eq('id', item.id);
          } catch (e) {}
        }

        const queueCache = loadQueueCache();
        const cachedItem = queueCache.find((i) => i.id === item.id);
        if (cachedItem) {
          cachedItem.status = 'failed';
          cachedItem.error_message = publishErr.message;
          cachedItem.updated_at = errorIso;
          saveQueueCache(queueCache);
        }
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
  // First, check and process any due queued items
  await processPublishingQueue(supabase).catch(() => {});

  const queue = await fetchAllQueueItems(supabase);

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

  // Sort batches by newest created_at, and sort items inside batch by queue_position
  const batches = Array.from(batchMap.values())
    .map((b) => ({
      ...b,
      items: b.items.sort((x, y) => x.queue_position - y.queue_position)
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
  let targetItem = null;

  // 1. Query Supabase directly (Primary)
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('admin_post_queue')
        .select('*')
        .eq('id', itemId)
        .maybeSingle();

      if (!error && data) {
        targetItem = data;
      }
    } catch (e) {
      console.warn('[PostQueueService] Supabase fetch item warning:', e.message);
    }
  }

  // Fallback to cache if not found
  if (!targetItem) {
    const queue = loadQueueCache();
    targetItem = queue.find((i) => i.id === itemId);
  }

  if (!targetItem) {
    throw new Error('Queue item not found.');
  }

  if (targetItem.status === 'published' && targetItem.feed_post_id) {
    throw new Error('This item has already been published to the feed.');
  }

  const nowIso = new Date(Date.now() - 1000).toISOString();

  // Update in Supabase
  if (supabase) {
    const { error: upErr } = await supabase
      .from('admin_post_queue')
      .update({
        scheduled_at: nowIso,
        status: 'queued',
        error_message: null,
        updated_at: nowIso
      })
      .eq('id', itemId);

    if (upErr) {
      console.error('[PostQueueService] Supabase update item error:', upErr.message);
    }
  }

  // Update in cache
  const queueCache = loadQueueCache();
  const cachedItem = queueCache.find((i) => i.id === itemId);
  if (cachedItem) {
    cachedItem.scheduled_at = nowIso;
    cachedItem.status = 'queued';
    cachedItem.error_message = null;
    cachedItem.updated_at = nowIso;
    saveQueueCache(queueCache);
  }

  // Process queue immediately
  const publishRes = await processPublishingQueue(supabase);

  return {
    success: true,
    message: 'Item triggered for immediate publication.',
    publishedCount: publishRes.count
  };
}

/**
 * Pause a batch (prevents scheduled items from publishing)
 */
export async function pauseQueueBatch(batchId, supabase) {
  const nowIso = new Date().toISOString();
  let count = 0;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('admin_post_queue')
        .update({ status: 'paused', updated_at: nowIso })
        .eq('batch_id', batchId)
        .eq('status', 'queued')
        .select('id');

      if (!error && Array.isArray(data)) {
        count = data.length;
      }
    } catch (e) {}
  }

  // Also sync cache
  const queue = loadQueueCache();
  let localCount = 0;
  queue.forEach((item) => {
    if (item.batch_id === batchId && item.status === 'queued') {
      item.status = 'paused';
      item.updated_at = nowIso;
      localCount++;
    }
  });
  saveQueueCache(queue);
  if (!count) count = localCount;

  return { success: true, pausedCount: count, message: `Batch ${batchId} paused.` };
}

/**
 * Resume a paused batch (resets remaining items to queued and reschedules sequentially from now)
 */
export async function resumeQueueBatch(batchId, supabase) {
  const nowTime = Date.now();
  const nowIso = new Date(nowTime).toISOString();
  let pausedItems = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('admin_post_queue')
        .select('*')
        .eq('batch_id', batchId)
        .eq('status', 'paused')
        .order('queue_position', { ascending: true });

      if (!error && Array.isArray(data)) {
        pausedItems = data;
      }
    } catch (e) {}
  }

  if (pausedItems.length === 0) {
    const queue = loadQueueCache();
    pausedItems = queue
      .filter((i) => i.batch_id === batchId && i.status === 'paused')
      .sort((a, b) => a.queue_position - b.queue_position);
  }

  let count = 0;
  for (let idx = 0; idx < pausedItems.length; idx++) {
    const item = pausedItems[idx];
    const intervalMins = item.interval_minutes || 0;
    const scheduledAt = new Date(nowTime + (idx * intervalMins * 60 * 1000)).toISOString();

    if (supabase) {
      try {
        await supabase
          .from('admin_post_queue')
          .update({
            status: 'queued',
            scheduled_at: scheduledAt,
            updated_at: nowIso
          })
          .eq('id', item.id);
      } catch (e) {}
    }

    item.status = 'queued';
    item.scheduled_at = scheduledAt;
    item.updated_at = nowIso;
    count++;
  }

  // Update cache
  const queue = loadQueueCache();
  queue.forEach((i) => {
    const updated = pausedItems.find((p) => p.id === i.id);
    if (updated) {
      i.status = updated.status;
      i.scheduled_at = updated.scheduled_at;
      i.updated_at = updated.updated_at;
    }
  });
  saveQueueCache(queue);

  // Trigger publishing runner
  processPublishingQueue(supabase).catch(() => {});

  return { success: true, resumedCount: count, message: `Batch ${batchId} resumed.` };
}

/**
 * Cancel remaining unpublished items in a batch
 */
export async function cancelQueueBatch(batchId, supabase) {
  const nowIso = new Date().toISOString();
  let count = 0;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('admin_post_queue')
        .update({ status: 'cancelled', updated_at: nowIso })
        .eq('batch_id', batchId)
        .in('status', ['queued', 'paused', 'failed'])
        .select('id');

      if (!error && Array.isArray(data)) {
        count = data.length;
      }
    } catch (e) {}
  }

  const queue = loadQueueCache();
  let localCancelledCount = 0;
  queue.forEach((item) => {
    if (item.batch_id === batchId && (item.status === 'queued' || item.status === 'paused' || item.status === 'failed')) {
      item.status = 'cancelled';
      item.updated_at = nowIso;
      localCancelledCount++;
    }
  });
  saveQueueCache(queue);
  if (!count) count = localCancelledCount;

  return { success: true, cancelledCount: count, message: `Batch ${batchId} cancelled.` };
}

/**
 * Retry a failed queue item
 */
export async function retryQueueItem(itemId, supabase) {
  const nowIso = new Date(Date.now() - 1000).toISOString();

  if (supabase) {
    try {
      await supabase
        .from('admin_post_queue')
        .update({
          status: 'queued',
          scheduled_at: nowIso,
          error_message: null,
          updated_at: nowIso
        })
        .eq('id', itemId);
    } catch (e) {}
  }

  const queue = loadQueueCache();
  const item = queue.find((i) => i.id === itemId);
  if (item) {
    item.status = 'queued';
    item.scheduled_at = nowIso;
    item.error_message = null;
    item.updated_at = nowIso;
    saveQueueCache(queue);
  }

  // Trigger processing
  processPublishingQueue(supabase).catch(() => {});

  return { success: true, message: 'Item reset to queued for retry.' };
}
