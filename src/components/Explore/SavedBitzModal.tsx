import React, { useState, useEffect } from 'react';
import {
  X,
  Bookmark,
  Loader2,
  Trash2,
  ExternalLink
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
            ? 'bg-[#081B35] border-[rgba(96,165,250,0.28)] text-[#F8FAFC] shadow-blue-950/60'
            : 'bg-white border-slate-200 text-[#0a213c]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-5 border-b ${
            isDark ? 'bg-[#06152B] border-[rgba(96,165,250,0.2)]' : 'bg-white border-slate-200'
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
              <h2 className={`text-lg font-black ${isDark ? 'text-[#F8FAFC]' : 'text-[#0a213c]'}`}>
                My Saved Knowledge
              </h2>
              <p className={`text-xs font-semibold ${isDark ? 'text-[#CBD5E1]' : 'text-slate-600'}`}>
                Your personal library of bookmarked Knowledge Bitz.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isDark
                ? 'text-[#CBD5E1] hover:text-white hover:bg-[#0B2342]'
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
              <Loader2 className="w-8 h-8 animate-spin text-[#1677FF] mb-2" />
              <span className="text-xs font-bold">Loading saved knowledge...</span>
            </div>
          ) : savedBitz.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div
                className={`p-4 rounded-2xl mb-3 ${
                  isDark ? 'bg-[#0B2342] text-slate-400' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Bookmark className="w-8 h-8 stroke-[2.2]" />
              </div>
              <h3 className={`text-base font-black mb-1 ${isDark ? 'text-[#F8FAFC]' : 'text-[#0a213c]'}`}>
                No saved Bitz yet
              </h3>
              <p className={`text-xs font-medium max-w-sm ${isDark ? 'text-[#CBD5E1]' : 'text-slate-600'}`}>
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
                        ? 'bg-[#0B2342] border-[rgba(96,165,250,0.25)] hover:border-[#36D1FF] hover:shadow-lg'
                        : 'bg-white border-slate-200 hover:border-[#1677FF] hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide ${
                          isDark ? 'text-[#36D1FF]' : 'text-slate-800'
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
                          isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                        title="Remove from saved"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className={`text-sm font-black line-clamp-2 mb-1.5 ${isDark ? 'text-[#F8FAFC]' : 'text-[#0a213c]'}`}>
                      {bitz.title}
                    </h4>
                    <p className={`text-xs line-clamp-2 mb-3 ${isDark ? 'text-[#CBD5E1]' : 'text-slate-600'}`}>
                      {bitz.short_fact}
                    </p>

                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="bg-[#1677FF] text-white px-2 py-0.5 rounded-full text-[10px] font-black">
                        CEFR {bitz.cefr_level || 'B1'}
                      </span>
                      <span className={`inline-flex items-center gap-1 group-hover:underline ${isDark ? 'text-[#36D1FF]' : 'text-[#1677FF]'}`}>
                        <span>Read</span>
                        <ExternalLink className="w-3 h-3" />
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
            isDark ? 'bg-[#06152B] border-[rgba(96,165,250,0.2)]' : 'bg-white border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#1677FF] hover:bg-[#2D8CFF] text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
