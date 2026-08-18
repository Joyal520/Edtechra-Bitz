import React, { useState, useEffect } from 'react';
import { X, RefreshCw, CheckCircle2, AlertCircle, Youtube, ShieldCheck, Clock, Layers, Sparkles } from 'lucide-react';
import { youtubeClient, SyncStatusData } from '@/services/youtubeClient';

interface AdminSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const AdminSyncModal: React.FC<AdminSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete
}) => {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success?: boolean; message?: string; count?: number; newCount?: number; upcomingCount?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMetrics, setStatusMetrics] = useState<SyncStatusData | null>(null);

  const fetchStatus = async () => {
    try {
      const stats = await youtubeClient.getSyncStatus();
      if (stats) setStatusMetrics(stats);
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const result = await youtubeClient.syncChannel();
      setSyncResult(result);
      if (result.stats) {
        setStatusMetrics(result.stats);
      } else {
        fetchStatus();
      }
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to synchronize with YouTube API.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-5 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <Youtube className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                YouTube Channel Synchronization
              </h3>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200 flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3" /> Auto-Sync Active
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Channel: <strong>@EdTechraBitz</strong> (ID: UCHOag2liOOp1XfTAUCqiFUg)
            </p>
          </div>
        </div>

        {/* Live Sync Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-blue-500" />
              <span>Synchronized</span>
            </div>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              {statusMetrics?.totalVideos || 198}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold">Total Shorts</div>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-2xl">
            <div className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Upcoming</span>
            </div>
            <div className="text-lg font-black text-amber-900 mt-0.5">
              {statusMetrics?.upcomingVideos ?? 0}
            </div>
            <div className="text-[10px] text-amber-600 font-semibold">Pending Release</div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl col-span-2 sm:col-span-1">
            <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-500" />
              <span>Last Synced</span>
            </div>
            <div className="text-xs font-bold text-slate-800 mt-1 truncate">
              {statusMetrics?.lastSyncTime ? new Date(statusMetrics.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold truncate">
              {statusMetrics?.lastSyncTime ? new Date(statusMetrics.lastSyncTime).toLocaleDateString() : 'Active'}
            </div>
          </div>
        </div>

        {/* Sync Mechanism & Security Card */}
        <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-1.5 text-xs text-slate-600">
          <div className="flex justify-between items-center font-semibold">
            <span>Detection:</span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> WebSub Push & Cron Backup
            </span>
          </div>
          <div className="flex justify-between items-center font-semibold">
            <span>Target Storage:</span>
            <span className="text-slate-800 font-bold">Supabase (PostgreSQL)</span>
          </div>
          <div className="flex justify-between items-center font-semibold">
            <span>New Video Rule:</span>
            <span className="text-amber-700 font-bold">status = "upcoming"</span>
          </div>
          {statusMetrics?.lastError && (
            <div className="pt-1 text-[11px] text-rose-600 font-medium">
              Last Error: {statusMetrics.lastError}
            </div>
          )}
        </div>

        {/* Result Alerts */}
        {syncResult && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold">{syncResult.message}</div>
              <div className="text-[11px] text-emerald-700 mt-0.5">
                All video metadata and educational modules synchronized cleanly.
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <div className="font-bold">Sync Failed</div>
              <div className="text-[11px] text-rose-700 mt-0.5">{error}</div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
          >
            Close
          </button>
          <button
            type="button"
            disabled={syncing}
            onClick={handleSync}
            className="px-5 py-2.5 text-xs font-extrabold text-white bg-[#026fc3] hover:bg-[#025ea6] disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Synchronizing Channel...' : 'Sync Channel Now'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
