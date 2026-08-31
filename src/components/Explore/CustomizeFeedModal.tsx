// ============================================================================
// EDTECHRA-BITZ: Customize Your Feed Modal
// Allows students to select their favorite topics, with Select All and persistent storage.
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Loader2
} from 'lucide-react';
import {
  BITZ_CATEGORY_GROUPS,
  ALL_BITZ_TOPIC_IDS
} from '@/utils/bitzTopicsConfig';
import { useAuth } from '@/context/AuthContext';
import { knowledgeBitzService } from '@/services/knowledgeBitzService';

interface CustomizeFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreferencesSaved: (selectedTopics: string[]) => void;
}

export const CustomizeFeedModal: React.FC<CustomizeFeedModalProps> = ({
  isOpen,
  onClose,
  onPreferencesSaved
}) => {
  const { session } = useAuth();
  const token = session?.access_token || null;

  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set(ALL_BITZ_TOPIC_IDS));
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<boolean>(false);

  // Load current user preferences
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      knowledgeBitzService.getUserPreferences(token).then((res) => {
        if (res.isAllTopicsSelected || !res.selectedTopics || res.selectedTopics.length === 0) {
          setSelectedTopics(new Set(ALL_BITZ_TOPIC_IDS));
        } else {
          setSelectedTopics(new Set(res.selectedTopics));
        }
        setLoading(false);
      }).catch(() => {
        setSelectedTopics(new Set(ALL_BITZ_TOPIC_IDS));
        setLoading(false);
      });
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  const isAllSelected = selectedTopics.size === ALL_BITZ_TOPIC_IDS.length;

  const handleToggleTopic = (topicId: string) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // Clear all
      setSelectedTopics(new Set());
    } else {
      // Select all
      setSelectedTopics(new Set(ALL_BITZ_TOPIC_IDS));
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
      }, 1000);
    } catch (err) {
      console.error('[CustomizeFeedModal] Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-900/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 text-[#026fc3] dark:text-blue-400 rounded-2xl">
              <SlidersHorizontal className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-stone-950 dark:text-white">
                Customize Your Feed
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-300 font-semibold">
                Choose the topics you want to discover in your Knowledge Bitz stream.
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

        {/* Modal Body with Topics Selection */}
        <div className="p-6 max-h-[68vh] overflow-y-auto space-y-6">
          {/* Select All Bar */}
          <div className="flex items-center justify-between bg-stone-100 dark:bg-stone-800 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700">
            <div className="text-xs font-bold text-stone-800 dark:text-stone-200">
              Selected: <strong className="text-[#026fc3] dark:text-blue-400 font-black">{selectedTopics.size}</strong> of {ALL_BITZ_TOPIC_IDS.length} topics
            </div>

            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 text-xs font-black text-stone-900 dark:text-white rounded-xl shadow-xs hover:bg-stone-50 transition-all active:scale-95 cursor-pointer"
            >
              {isAllSelected ? (
                <>
                  <CheckSquare className="w-4 h-4 text-[#026fc3] stroke-[2.5]" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-stone-500" />
                  <span>Select All Topics</span>
                </>
              )}
            </button>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-stone-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <span className="text-xs font-bold">Loading topics...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {BITZ_CATEGORY_GROUPS.map((group) => (
                <div key={group.id} className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <span>{group.name}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {group.topics.map((topic) => {
                      const isSelected = selectedTopics.has(topic.id);

                      return (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => handleToggleTopic(topic.id)}
                          className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all active:scale-95 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 shadow-xs'
                              : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-800 hover:border-stone-400 opacity-75 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: topic.color }}
                            />
                            <span className="text-xs font-extrabold text-stone-950 dark:text-white truncate">
                              {topic.name}
                            </span>
                          </div>

                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ml-1.5 transition-colors ${
                              isSelected
                                ? 'bg-[#026fc3] text-white'
                                : 'border-2 border-stone-400 dark:border-stone-600'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Success Save Banner */}
          {saveToast && (
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 rounded-2xl text-center text-xs font-black text-emerald-900 dark:text-emerald-200 animate-fade-in">
              ✓ Your feed has been updated!
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#026fc3] hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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
