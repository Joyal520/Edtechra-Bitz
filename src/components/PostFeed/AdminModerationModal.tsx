import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ShieldCheck,
  Check,
  Trash2,
  AlertTriangle,
  Clock,
  Loader2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { StudentPost } from '@/types/post';
import { postService } from '@/services/postService';
import { useAuth } from '@/context/AuthContext';

interface AdminModerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostUpdated?: () => void;
}

export const AdminModerationModal: React.FC<AdminModerationModalProps> = ({
  isOpen,
  onClose,
  onPostUpdated
}) => {
  const { session } = useAuth();
  const token = session?.access_token || null;

  const [posts, setPosts] = useState<StudentPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'review' | 'rejected' | 'all'>('review');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchModerationQueue = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await postService.getAdminModerationQueue(activeTab, token);
      setPosts(res.posts || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch moderation queue.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, token]);

  useEffect(() => {
    if (isOpen) {
      fetchModerationQueue();
    }
  }, [isOpen, fetchModerationQueue]);

  if (!isOpen) return null;

  const handleAction = async (postId: string, action: 'approve' | 'reject') => {
    setActionLoadingId(postId);
    try {
      await postService.takeAdminModerationAction(postId, action, undefined, token);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      if (onPostUpdated) onPostUpdated();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6 space-y-4 relative animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[11px] font-black mb-1 border border-purple-200">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>AI Moderation Queue</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-[#0f233a] tracking-tight">
            Review Student Submissions
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage posts that were flagged for review or need manual administrative approval.
          </p>
        </div>

        {/* Filter Tabs & Refresh */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {(['review', 'rejected', 'all'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-xs font-black rounded-lg capitalize transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-white text-[#026fc3] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab === 'review' ? 'Needs Review' : tab}
              </button>
            ))}
          </div>

          <button
            onClick={fetchModerationQueue}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-[#026fc3] bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            title="Refresh queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#026fc3]" />
              <p className="text-xs font-semibold">Loading moderation records…</p>
            </div>
          ) : errorMessage ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <ShieldCheck className="w-10 h-10 mx-auto text-emerald-500" />
              <h4 className="text-sm font-bold text-slate-700">Moderation Queue is Clean</h4>
              <p className="text-xs text-slate-400">No student posts currently require administrative review.</p>
            </div>
          ) : (
            posts.map((post) => {
              const isActioning = actionLoadingId === post.id;
              return (
                <div
                  key={post.id}
                  className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center"
                >
                  {/* Left: Image Thumbnail */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300 relative group">
                    <img
                      src={post.image_url}
                      alt={post.caption}
                      className="w-full h-full object-cover"
                    />
                    <a
                      href={post.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  {/* Middle: Post Metadata */}
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 truncate">
                        {post.author?.full_name || 'Student'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          post.status === 'review'
                            ? 'bg-amber-100 text-amber-800'
                            : post.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {post.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium line-clamp-2">
                      {post.caption}
                    </p>

                    {post.moderation_reason && (
                      <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md inline-block">
                        AI Note: {post.moderation_reason}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(post.created_at).toLocaleString()}
                      </span>
                      {post.image_size_bytes && (
                        <span>{(post.image_size_bytes / 1024).toFixed(1)} KB WebP</span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                    <button
                      onClick={() => handleAction(post.id, 'approve')}
                      disabled={isActioning}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>

                    <button
                      onClick={() => handleAction(post.id, 'reject')}
                      disabled={isActioning}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reject & Delete</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
