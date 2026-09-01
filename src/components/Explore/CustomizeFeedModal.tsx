import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Loader2,
  Atom,
  Brain,
  Landmark,
  Cpu,
  TrendingUp,
  HeartPulse,
  Globe,
  Palette,
  Trophy,
  BookOpen,
  Sparkles,
  Sprout,
  HelpCircle,
  Compass
} from 'lucide-react';
import {
  BITZ_CATEGORIES,
  ALL_BITZ_CATEGORY_IDS
} from '@/utils/bitzTopicsConfig';
import { useAuth } from '@/context/AuthContext';
import { useBitzTheme } from '@/context/BitzThemeContext';
import { knowledgeBitzService } from '@/services/knowledgeBitzService';

interface CustomizeFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreferencesSaved: (selectedTopics: string[]) => void;
}

// Icon mapper for categories
const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  Atom: <Atom className="w-4 h-4" />,
  Brain: <Brain className="w-4 h-4" />,
  Landmark: <Landmark className="w-4 h-4" />,
  Cpu: <Cpu className="w-4 h-4" />,
  TrendingUp: <TrendingUp className="w-4 h-4" />,
  HeartPulse: <HeartPulse className="w-4 h-4" />,
  Globe: <Globe className="w-4 h-4" />,
  Palette: <Palette className="w-4 h-4" />,
  Trophy: <Trophy className="w-4 h-4" />,
  BookOpen: <BookOpen className="w-4 h-4" />,
  Sprout: <Sprout className="w-4 h-4" />,
  HelpCircle: <HelpCircle className="w-4 h-4" />,
  Compass: <Compass className="w-4 h-4" />,
  Sparkles: <Sparkles className="w-4 h-4" />
};

export const CustomizeFeedModal: React.FC<CustomizeFeedModalProps> = ({
  isOpen,
  onClose,
  onPreferencesSaved
}) => {
  const { session } = useAuth();
  const token = session?.access_token || null;
  const { isDark } = useBitzTheme();

  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set(ALL_BITZ_CATEGORY_IDS));
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<boolean>(false);

  // Load current user preferences
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      knowledgeBitzService.getUserPreferences(token).then((res) => {
        if (res.isAllTopicsSelected || !res.selectedTopics || res.selectedTopics.length === 0) {
          setSelectedTopics(new Set(ALL_BITZ_CATEGORY_IDS));
        } else {
          // Map legacy topic IDs if necessary
          const cleanSet = new Set<string>();
          res.selectedTopics.forEach((t) => {
            if (ALL_BITZ_CATEGORY_IDS.includes(t)) {
              cleanSet.add(t);
            }
          });
          setSelectedTopics(cleanSet.size > 0 ? cleanSet : new Set(ALL_BITZ_CATEGORY_IDS));
        }
        setLoading(false);
      }).catch(() => {
        setSelectedTopics(new Set(ALL_BITZ_CATEGORY_IDS));
        setLoading(false);
      });
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  const isAllSelected = selectedTopics.size === ALL_BITZ_CATEGORY_IDS.length;

  const handleToggleTopic = (categoryId: string) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        if (next.size > 1) {
          next.delete(categoryId);
        }
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTopics(new Set([ALL_BITZ_CATEGORY_IDS[0]]));
    } else {
      setSelectedTopics(new Set(ALL_BITZ_CATEGORY_IDS));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const topicsArray = isAllSelected ? [] : Array.from(selectedTopics);

    try {
      await knowledgeBitzService.saveUserPreferences(topicsArray, token);
      setSaveToast(true);
      onPreferencesSaved(Array.from(selectedTopics));
      setTimeout(() => {
        setSaveToast(false);
        onClose();
      }, 800);
    } catch (err) {
      console.error('[CustomizeFeedModal] Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div
        className={`relative w-full max-w-xl rounded-3xl shadow-2xl border overflow-hidden my-auto transition-all ${
          isDark
            ? 'bg-[#0b172a] border-[#1e3a5f] text-white shadow-blue-950/50'
            : 'bg-white border-slate-200 text-[#0a213c]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b ${
            isDark ? 'bg-[#06152B] border-[rgba(96,165,250,0.2)]' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl border ${
                isDark
                  ? 'bg-[#1677FF]/20 text-[#36D1FF] border-[#1677FF]/40'
                  : 'bg-blue-50 text-[#1677FF] border-blue-100'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className={`text-base sm:text-lg font-black ${isDark ? 'text-[#F8FAFC]' : 'text-[#0a213c]'}`}>
                Customize Your Feed
              </h2>
              <p className={`text-xs font-medium ${isDark ? 'text-[#CBD5E1]' : 'text-slate-600'}`}>
                Choose the 10 core categories you want to discover.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isDark
                ? 'text-[#CBD5E1] hover:text-white hover:bg-[#0B2342]'
                : 'text-slate-500 hover:text-[#0a213c] hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 max-h-[65vh] overflow-y-auto space-y-4">
          {/* Select All Bar */}
          <div
            className={`flex items-center justify-between p-3 rounded-2xl border ${
              isDark
                ? 'bg-[#0B2342] border-[rgba(96,165,250,0.25)]'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className={`text-xs font-bold ${isDark ? 'text-[#CBD5E1]' : 'text-slate-800'}`}>
              Selected: <strong className="text-[#36D1FF] font-black">{selectedTopics.size}</strong> of {ALL_BITZ_CATEGORY_IDS.length} categories
            </div>

            <button
              type="button"
              onClick={handleToggleSelectAll}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border shadow-xs transition-all active:scale-95 cursor-pointer ${
                isDark
                  ? 'bg-[#081B35] hover:bg-[#0B2342] border-[rgba(96,165,250,0.3)] text-[#CBD5E1]'
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-[#0a213c]'
              }`}
            >
              {isAllSelected ? (
                <>
                  <CheckSquare className="w-4 h-4 text-[#36D1FF] stroke-[2.5]" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-slate-400" />
                  <span>Select All</span>
                </>
              )}
            </button>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#1677FF] mb-2" />
              <span className="text-xs font-bold">Loading categories...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {BITZ_CATEGORIES.map((category) => {
                const isSelected = selectedTopics.has(category.id);
                const icon = CATEGORY_ICON_MAP[category.icon] || <Sparkles className="w-4 h-4" />;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleToggleTopic(category.id)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all active:scale-98 cursor-pointer ${
                      isSelected
                        ? isDark
                          ? 'bg-[#0B2342] border-[#1677FF] shadow-xs'
                          : 'bg-blue-50/80 border-[#1677FF] shadow-xs'
                        : isDark
                        ? 'bg-[#06152B] border-[rgba(96,165,250,0.2)] hover:border-[#36D1FF]'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: isSelected ? `${category.color}25` : isDark ? '#081B35' : '#f1f5f9',
                          color: isSelected ? category.color : isDark ? '#94A3B8' : '#64748b'
                        }}
                      >
                        {icon}
                      </div>
                      <div className="min-w-0">
                        <span className={`text-xs sm:text-sm font-bold block truncate ${isDark ? 'text-[#F8FAFC]' : 'text-[#0a213c]'}`}>
                          {category.name}
                        </span>
                        <span className={`text-[10px] block truncate ${isDark ? 'text-[#94A3B8]' : 'text-slate-500'}`}>
                          {category.subtopics.length} subtopics
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ml-2 transition-colors ${
                        isSelected
                          ? 'bg-[#1677FF] text-white'
                          : isDark
                          ? 'border-2 border-slate-600 bg-transparent'
                          : 'border-2 border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Success Save Toast */}
          {saveToast && (
            <div
              className={`p-3 rounded-2xl text-center text-xs font-black animate-fade-in border ${
                isDark
                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              ✓ Preferences saved successfully!
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`p-4 sm:p-5 border-t flex items-center justify-between ${
            isDark
              ? 'bg-[#06152B] border-[rgba(96,165,250,0.2)]'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#081B35] hover:bg-[#0B2342] border-[rgba(96,165,250,0.25)] text-[#CBD5E1]'
                : 'bg-white hover:bg-slate-200/70 border-slate-300 text-slate-700'
            }`}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1677FF] hover:bg-[#2D8CFF] text-white text-xs font-black rounded-xl shadow-md shadow-blue-600/35 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>Save Preferences</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

