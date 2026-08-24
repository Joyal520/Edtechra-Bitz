// ============================================================================
// EDTECHRA-BITZ: Admin Post Queue Dashboard
// Live monitoring of batches, sequential progress, pause/resume, and instant publish
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  RefreshCw,
  Loader2,
  Send
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  AdminPostQueueBatchSummary,
  AdminPostQueueItem,
  QueueOverviewStats
} from '@/types';
import { adminPostQueueService } from '@/services/adminPostQueueService';

interface AdminQueueDashboardProps {
  onBatchSelected?: (batchId: string) => void;
}

export const AdminQueueDashboard: React.FC<AdminQueueDashboardProps> = () => {
  const { session } = useAuth();
  const token = session?.access_token || null;

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [stats, setStats] = useState<QueueOverviewStats | null>(null);
  const [batches, setBatches] = useState<AdminPostQueueBatchSummary[]>([]);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchQueueData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    setErrorMessage(null);

    try {
      const res = await adminPostQueueService.getQueueOverview(token);
      if (res.success) {
        setStats(res.stats);
        setBatches(res.batches);
      }
    } catch (err: any) {
      console.error('[AdminQueueDashboard] Fetch error:', err);
      setErrorMessage(err.message || 'Failed to load publishing queue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchQueueData();
    // Background polling every 10 seconds to update live state
    const interval = setInterval(() => {
      fetchQueueData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchQueueData]);

  const handlePublishNow = async (itemId: string) => {
    setActionInProgress(itemId);
    try {
      await adminPostQueueService.publishItemNow(itemId, token);
      await fetchQueueData(true);
    } catch (err: any) {
      alert(`Publish now failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handlePauseBatch = async (batchId: string) => {
    setActionInProgress(batchId);
    try {
      await adminPostQueueService.pauseBatch(batchId, token);
      await fetchQueueData(true);
    } catch (err: any) {
      alert(`Pause failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleResumeBatch = async (batchId: string) => {
    setActionInProgress(batchId);
    try {
      await adminPostQueueService.resumeBatch(batchId, token);
      await fetchQueueData(true);
    } catch (err: any) {
      alert(`Resume failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCancelBatch = async (batchId: string) => {
    if (!window.confirm('Are you sure you want to cancel remaining unpublished images in this batch?')) return;
    setActionInProgress(batchId);
    try {
      await adminPostQueueService.cancelBatch(batchId, token);
      await fetchQueueData(true);
    } catch (err: any) {
      alert(`Cancel failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRetryItem = async (itemId: string) => {
    setActionInProgress(itemId);
    try {
      await adminPostQueueService.retryFailedItem(itemId, token);
      await fetchQueueData(true);
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-3">
        <Loader2 className="w-7 h-7 animate-spin mx-auto text-purple-400" />
        <p className="text-xs font-semibold">Loading persistent publishing queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left">
      {/* Header & Refresh */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-700/60">
        <div>
          <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Admin Sequential Publishing Queue</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            Persistent server-side queue (Runs automatically even when browser is closed)
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchQueueData()}
          disabled={refreshing}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          title="Refresh Queue"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-950/60 border border-rose-500/40 text-rose-200 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Metric Counters Grid */}
      {stats && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-center">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Total</div>
            <div className="text-lg font-black text-white mt-0.5">{stats.total}</div>
          </div>
          <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-center">
            <div className="text-[10px] text-emerald-400 font-bold uppercase">Published</div>
            <div className="text-lg font-black text-emerald-300 mt-0.5">{stats.published}</div>
          </div>
          <div className="p-2.5 bg-sky-950/30 border border-sky-500/30 rounded-xl text-center">
            <div className="text-[10px] text-sky-400 font-bold uppercase">Publishing</div>
            <div className="text-lg font-black text-sky-300 mt-0.5">{stats.publishing}</div>
          </div>
          <div className="p-2.5 bg-purple-950/30 border border-purple-500/30 rounded-xl text-center">
            <div className="text-[10px] text-purple-400 font-bold uppercase">Queued</div>
            <div className="text-lg font-black text-purple-300 mt-0.5">{stats.queued}</div>
          </div>
          <div className="p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-xl text-center">
            <div className="text-[10px] text-amber-400 font-bold uppercase">Paused</div>
            <div className="text-lg font-black text-amber-300 mt-0.5">{stats.paused}</div>
          </div>
          <div className="p-2.5 bg-rose-950/30 border border-rose-500/30 rounded-xl text-center">
            <div className="text-[10px] text-rose-400 font-bold uppercase">Failed</div>
            <div className="text-lg font-black text-rose-300 mt-0.5">{stats.failed}</div>
          </div>
        </div>
      )}

      {/* Batches List */}
      {batches.length === 0 ? (
        <div className="p-10 bg-slate-950/40 border border-slate-800 rounded-2xl text-center space-y-2 text-slate-400">
          <Layers className="w-8 h-8 mx-auto text-slate-600" />
          <p className="text-xs font-bold">No active or scheduled batches in the queue.</p>
          <p className="text-[11px] text-slate-500">
            Use the <strong>Bulk Image Upload</strong> tab to schedule new images.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {batches.map((batch) => {
            const isPaused = batch.paused_items > 0 && batch.queued_items === 0;
            const isComplete = batch.published_items === batch.total_items;
            const percent = batch.total_items > 0 ? Math.round((batch.published_items / batch.total_items) * 100) : 0;

            return (
              <div
                key={batch.batch_id}
                className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-3 shadow-md"
              >
                {/* Batch Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">
                        {batch.batch_name}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold rounded-md">
                        {batch.batch_id.slice(-8)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Interval: {batch.interval_minutes === 0 ? 'Immediate sequential' : `${batch.interval_minutes}m`}
                      </span>
                    </div>

                    {batch.next_scheduled_at && !isComplete && (
                      <p className="text-[11px] text-sky-300 font-medium mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-sky-400" />
                        <span>Next scheduled publish: {new Date(batch.next_scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(batch.next_scheduled_at).toLocaleDateString()})</span>
                      </p>
                    )}
                  </div>

                  {/* Batch Controls */}
                  <div className="flex items-center gap-2">
                    {!isComplete && (
                      <>
                        {isPaused ? (
                          <button
                            type="button"
                            onClick={() => handleResumeBatch(batch.batch_id)}
                            disabled={actionInProgress === batch.batch_id}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span>Resume</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePauseBatch(batch.batch_id)}
                            disabled={actionInProgress === batch.batch_id}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Pause className="w-3 h-3 fill-white" />
                            <span>Pause</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCancelBatch(batch.batch_id)}
                          disabled={actionInProgress === batch.batch_id}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 text-[11px] font-bold transition-all cursor-pointer"
                          title="Cancel remaining"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                    <span>
                      {batch.published_items} / {batch.total_items} published ({percent}%)
                    </span>
                    {isComplete && (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                      </span>
                    )}
                  </div>

                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isComplete
                          ? 'bg-emerald-400'
                          : isPaused
                          ? 'bg-amber-400'
                          : 'bg-gradient-to-r from-purple-500 to-sky-400'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Itemized Queue List */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {batch.items.map((item: AdminPostQueueItem) => (
                    <div
                      key={item.id}
                      className="p-2 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Thumbnail */}
                        <img
                          src={item.image_url}
                          alt={`Queue item ${item.queue_position}`}
                          className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0"
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-[11px]">
                              #{item.queue_position}
                            </span>

                            {/* Status Badge */}
                            {item.status === 'published' ? (
                              <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Published
                              </span>
                            ) : item.status === 'publishing' ? (
                              <span className="px-1.5 py-0.2 rounded-md bg-sky-500/20 text-sky-300 text-[10px] font-black border border-sky-500/30 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> Publishing
                              </span>
                            ) : item.status === 'paused' ? (
                              <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/30">
                                Paused
                              </span>
                            ) : item.status === 'failed' ? (
                              <span className="px-1.5 py-0.2 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-black border border-rose-500/30 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Failed
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-black border border-purple-500/30 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Queued
                              </span>
                            )}
                          </div>

                          <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                            {item.status === 'published'
                              ? `Published at ${new Date(item.published_at || item.updated_at).toLocaleTimeString()}`
                              : `Scheduled for ${new Date(item.scheduled_at).toLocaleTimeString()} (${new Date(item.scheduled_at).toLocaleDateString()})`}
                          </p>
                        </div>
                      </div>

                      {/* Item Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.status === 'queued' && (
                          <button
                            type="button"
                            onClick={() => handlePublishNow(item.id)}
                            disabled={actionInProgress === item.id}
                            className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                            title="Publish immediately"
                          >
                            <Send className="w-2.5 h-2.5" />
                            <span>Publish Now</span>
                          </button>
                        )}

                        {item.status === 'failed' && (
                          <button
                            type="button"
                            onClick={() => handleRetryItem(item.id)}
                            disabled={actionInProgress === item.id}
                            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Retry</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
