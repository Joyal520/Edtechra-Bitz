// ============================================================================
// EDTECHRA-BITZ: Saved Knowledge Pocket Modal
// Persistent vault of bookmarked Bitz, accessible even after learned & removed from Explore
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  Bookmark,
  Loader2,
  Trash2,
  ExternalLink,
  Clock
} from 'lucide-react';
import { KnowledgeBitzItem } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { knowledgeBitzService } from '@/services/knowledgeBitzService';
import { getTopicById } from '@/utils/bitzTopicsConfig';

interface SavedBitzModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReader: (bitz: KnowledgeBitzItem) => void;
}

export const SavedBitzModal: React.FC<SavedBitzModalProps> = ({
  isOpen,
  onClose,
  onOpenReader
}) => {
  const { session } = useAuth();
  const token = session?.access_token || null;

  const [savedBitz, setSavedBitz] = useState<KnowledgeBitzItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      knowledgeBitzService.getSavedBitz(token).then((items) => {
        setSavedBitz(items);
        setLoading(false);
      }).catch(() => {
        setSavedBitz([]);
        setLoading(false);
      });
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleUnsave = async (e: React.MouseEvent, bitzId: string) => {
    e.stopPropagation();
    try {
      await knowledgeBitzService.toggleSave(bitzId, undefined, token);
      setSavedBitz((prev) => prev.filter((b) => b.id !== bitzId));
    } catch (err) {
      console.error('[SavedBitzModal] Unsave error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200">
              <Bookmark className="w-5 h-5 fill-current stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0a213c]">
                My Saved Knowledge
              </h2>
              <p className="text-xs text-slate-600 font-semibold">
                Your personal library of bookmarked Knowledge Bitz.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-[#0a213c] hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Saved List */}
        <div className="p-6 max-h-[68vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#026fc3] mb-2" />
              <span className="text-xs font-bold">Loading saved knowledge...</span>
            </div>
          ) : savedBitz.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-slate-100 rounded-2xl text-slate-400 mb-3">
                <Bookmark className="w-8 h-8 stroke-[2.2]" />
              </div>
              <h3 className="text-base font-black text-[#0a213c] mb-1">
                No saved Bitz yet
              </h3>
              <p className="text-xs text-slate-600 font-medium max-w-sm">
                Tap the bookmark icon on any Knowledge Bitz card in Explore to save it here for later review.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {savedBitz.map((bitz) => {
                const topic = getTopicById(bitz.topic_id);

                return (
                  <div
                    key={bitz.id}
                    onClick={() => {
                      onClose();
                      onOpenReader(bitz);
                    }}
                    className="group relative bg-white p-4 rounded-2xl border border-slate-200 hover:border-[#026fc3] shadow-xs hover:shadow-md transition-all cursor-pointer select-none"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-slate-800 uppercase tracking-wide">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: topic.color }}
                        />
                        {topic.name}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleUnsave(e, bitz.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Remove from saved"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="text-sm font-black text-[#0a213c] leading-snug line-clamp-2 mb-1.5 group-hover:text-[#026fc3] transition-colors">
                      {bitz.title}
                    </h4>

                    <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed font-medium">
                      {bitz.short_fact}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        {bitz.reading_time_sec || 30}s
                      </span>
                      <span className="text-[#026fc3] font-black group-hover:underline flex items-center gap-0.5">
                        Read <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#0a213c] hover:bg-slate-800 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
