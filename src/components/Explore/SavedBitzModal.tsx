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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-900/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Bookmark className="w-5 h-5 fill-current stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-stone-950 dark:text-white">
                My Saved Knowledge
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-300 font-semibold">
                Your personal library of bookmarked Knowledge Bitz.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Saved List */}
        <div className="p-6 max-h-[68vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-stone-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <span className="text-xs font-bold">Loading saved knowledge...</span>
            </div>
          ) : savedBitz.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-stone-100 dark:bg-stone-800 rounded-2xl text-stone-500 mb-3">
                <Bookmark className="w-8 h-8 stroke-[2.2]" />
              </div>
              <h3 className="text-base font-black text-stone-950 dark:text-white mb-1">
                No saved Bitz yet
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 font-medium max-w-sm">
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
                    className="group relative bg-white dark:bg-stone-850 p-4 rounded-2xl border border-stone-300 dark:border-stone-800 hover:border-blue-400 dark:hover:border-blue-600 shadow-xs hover:shadow-md transition-all cursor-pointer select-none"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-stone-800 dark:text-stone-200 uppercase tracking-wide">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: topic.color }}
                        />
                        {topic.name}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleUnsave(e, bitz.id)}
                        className="p-1 text-stone-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Remove from saved"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="text-sm font-black text-stone-950 dark:text-white leading-snug line-clamp-2 mb-1.5 group-hover:text-[#026fc3] transition-colors">
                      {bitz.title}
                    </h4>

                    <p className="text-xs text-stone-700 dark:text-stone-300 line-clamp-2 leading-relaxed font-medium">
                      {bitz.short_fact}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500 font-semibold">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        {bitz.reading_time_sec || 30}s
                      </span>
                      <span className="text-[#026fc3] dark:text-blue-400 font-black group-hover:underline flex items-center gap-0.5">
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
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-stone-950 dark:bg-stone-100 hover:bg-stone-800 text-white dark:text-stone-900 text-xs font-black rounded-xl transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
