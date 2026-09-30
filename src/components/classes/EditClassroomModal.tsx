import React, { useState, useEffect } from 'react';
import { X, Check, Paintbrush, Loader2 } from 'lucide-react';
import { Classroom } from '@/types/classroom';
import { classroomService } from '@/services/classroomService';
import { CLASSROOM_THEMES, getClassroomTheme } from '@/utils/classroomThemes';

interface EditClassroomModalProps {
  isOpen: boolean;
  classroom: Classroom | null;
  onClose: () => void;
  onSuccess: (updated: { title: string; theme: string }) => void;
}

export const EditClassroomModal: React.FC<EditClassroomModalProps> = ({
  isOpen,
  classroom,
  onClose,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('theme-blue');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (classroom && isOpen) {
      setTitle(classroom.title || '');
      setTheme(classroom.theme || 'theme-blue');
      setErrorMessage(null);
    }
  }, [classroom, isOpen]);

  if (!isOpen || !classroom) return null;

  const activeThemeConfig = getClassroomTheme(theme);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setErrorMessage('Please enter a classroom name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await classroomService.updateClassroom(classroom.id, {
        title: trimmedTitle,
        theme
      });

      if (res.error) {
        setErrorMessage(res.error);
        setIsSubmitting(false);
        return;
      }

      onSuccess({ title: trimmedTitle, theme });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update classroom.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200 text-slate-900"
        data-light-surface="true"
        data-theme-mode="light"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-2xs transition-colors"
              style={{
                backgroundColor: `${activeThemeConfig.hex}15`,
                borderColor: `${activeThemeConfig.hex}30`,
                color: activeThemeConfig.hex
              }}
            >
              <Paintbrush className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Edit Classroom
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                Update name and visual theme
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Classroom Name Input */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
              Classroom Name *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. English Grade 8"
              className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-300 focus:border-[#026fc3] rounded-2xl text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3]/20 transition-all shadow-2xs select-text"
              autoFocus
            />
          </div>

          {/* Classroom Colour Swatches */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-extrabold text-slate-800">
                Classroom Colour
              </label>
              <span
                className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                style={{
                  backgroundColor: `${activeThemeConfig.hex}15`,
                  color: activeThemeConfig.hex
                }}
              >
                {activeThemeConfig.name}
              </span>
            </div>

            {/* 2 rows of 5 clickable circular swatches */}
            <div className="grid grid-cols-5 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              {CLASSROOM_THEMES.map((t) => {
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    title={t.name}
                    aria-label={`Select ${t.name} theme`}
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'ring-3 ring-offset-2 scale-105 shadow-md'
                        : 'hover:scale-105 shadow-2xs hover:shadow-xs opacity-85 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: t.hex,
                      // @ts-ignore
                      '--tw-ring-color': t.hex,
                      '--tw-ring-offset-color': '#ffffff'
                    }}
                  >
                    {isSelected && (
                      <Check className="w-5 h-5 text-white stroke-[3] drop-shadow-xs" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black text-white shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              style={{
                backgroundColor: activeThemeConfig.hex
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
