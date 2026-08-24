// ============================================================================
// EDTECHRA-BITZ: Admin Post Queue & Bulk Image Upload Types
// ============================================================================

export type QueueItemStatus =
  | 'queued'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'paused'
  | 'cancelled';

export interface AdminPostQueueItem {
  id: string;
  batch_id: string;
  batch_name?: string | null;
  caption?: string | null;
  image_url: string;
  image_object_key: string;
  storage_provider: 'r2' | 'supabase';
  image_width?: number | null;
  image_height?: number | null;
  image_size_bytes?: number | null;
  image_format?: string;
  uploaded_by: string;
  validation_status: 'manually_approved';
  validation_provider: 'manual';
  status: QueueItemStatus;
  queue_position: number;
  interval_minutes: number;
  scheduled_at: string;
  published_at?: string | null;
  feed_post_id?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminPostQueueBatchSummary {
  batch_id: string;
  batch_name: string;
  total_items: number;
  published_items: number;
  publishing_items: number;
  queued_items: number;
  failed_items: number;
  paused_items: number;
  interval_minutes: number;
  created_at: string;
  next_scheduled_at?: string | null;
  items: AdminPostQueueItem[];
}

export interface QueueOverviewStats {
  total: number;
  published: number;
  publishing: number;
  queued: number;
  failed: number;
  paused: number;
}

export interface CreateBatchQueueItemInput {
  imageUrl: string;
  imageObjectKey: string;
  caption?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageSizeBytes?: number;
  imageFormat?: string;
  queuePosition: number;
}

export interface CreateBatchQueuePayload {
  batchName?: string;
  defaultCaption?: string;
  intervalMinutes: number; // 0 = immediately sequential, 60, 180, 360, 720, 1440
  order: 'upload_order' | 'reverse_order';
  items: CreateBatchQueueItemInput[];
}

export type QueueIntervalOption = {
  label: string;
  minutes: number;
  description: string;
};

export const QUEUE_INTERVAL_OPTIONS: QueueIntervalOption[] = [
  { label: 'Immediately, one by one', minutes: 0, description: 'Publish all images sequentially one after another' },
  { label: 'Every 1 hour', minutes: 60, description: 'Publish 1 image every 60 minutes' },
  { label: 'Every 3 hours', minutes: 180, description: 'Publish 1 image every 3 hours' },
  { label: 'Every 6 hours', minutes: 360, description: 'Publish 1 image every 6 hours (Recommended)' },
  { label: 'Every 12 hours', minutes: 720, description: 'Publish 1 image every 12 hours' },
  { label: 'Every 24 hours', minutes: 1440, description: 'Publish 1 image every day' }
];
