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
import { useBitzTheme } from '@/context/BitzThemeContext';
import { knowledgeBitzService } from '@/services/knowledgeBitzService';
import { getCategoryById } from '@/utils/bitzTopicsConfig';

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
  const { isDark } = useBitzTheme();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div
        className={`relative w-full max-w-2xl rounded-3xl shadow-2xl border overflow-hidden my-auto transition-all ${
          isDark
            ? 'bg-[#0b172a] border-[#1e3a5f] text-white shadow-blue-950/50'
            : 'bg-white border-slate-200 text-[#0a213c]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-5 border-b ${
            isDark ? 'bg-[#091526] border-[#1b3456]' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl border ${
                isDark
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-amber-50 text-amber-600 border-amber-200'
              }`}
            >
              <Bookmark className="w-5 h-5 fill-current stroke-[2.2]" />
            </div>
            <div>
              <h2 className={`text-lg font-black ${isDark ? 'text-white' : 'text-[#0a213c]'}`}>
                My Saved Knowledge
              </h2>
              <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Your personal library of bookmarked Knowledge Bitz.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-[#132849]'
                : 'text-slate-500 hover:text-[#0a213c] hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Saved List */}
        <div className="p-6 max-h-[68vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#026fc3] mb-2" />
              <span className="text-xs font-bold">Loading saved knowledge...</span>
            </div>
          ) : savedBitz.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div
                className={`p-4 rounded-2xl mb-3 ${
                  isDark ? 'bg-[#10223d] text-slate-500' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Bookmark className="w-8 h-8 stroke-[2.2]" />
              </div>
              <h3 className={`text-base font-black mb-1 ${isDark ? 'text-white' : 'text-[#0a213c]'}`}>
                No saved Bitz yet
              </h3>
              <p className={`text-xs font-medium max-w-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Tap the bookmark icon on any Knowledge Bitz card in Explore to save it here for later review.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {savedBitz.map((bitz) => {
                const category = getCategoryById(bitz.category || bitz.topic_id);

                return (
                  <div
                    key={bitz.id}
                    onClick={() => {
                      onClose();
                      onOpenReader(bitz);
                    }}
                    className={`group relative p-4 rounded-2xl border shadow-xs transition-all cursor-pointer select-none ${
                      isDark
                        ? 'bg-[#0f2347] border-[#1e4070] hover:border-[#38bdf8] hover:shadow-lg'
                        : 'bg-white border-slate-200 hover:border-[#026fc3] hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide ${
                          isDark ? 'text-sky-200' : 'text-slate-800'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleUnsave(e, bitz.id)}
                        className={`p-1 rounded-lg transition-colors cursor-pointer ${
                          isDark ? 'text-slate-400 hover:text-rose-400' : 'text-slate-400 hover:text-rose-600'
                        }`}
                        title="Remove from saved"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4
                      className={`text-sm font-black leading-snug line-clamp-2 mb-1.5 transition-colors ${
                        isDark
                          ? 'text-white group-hover:text-[#38bdf8]'
                          : 'text-[#0a213c] group-hover:text-[#026fc3]'
                      }`}
                    >
                      {bitz.title}
                    </h4>

                    <p
                      className={`text-xs line-clamp-2 leading-relaxed font-medium ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      {bitz.short_fact}
                    </p>

                    <div
                      className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] font-semibold ${
                        isDark ? 'border-[#1b3860] text-slate-400' : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {bitz.reading_time_sec || 30}s
                      </span>
                      <span className="text-[#38bdf8] font-black group-hover:underline flex items-center gap-0.5">
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
        <div
          className={`p-4 border-t flex justify-end ${
            isDark ? 'bg-[#091526] border-[#1b3456]' : 'bg-white border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

