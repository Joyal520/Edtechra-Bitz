// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: CANVAS HEADER CARD (LIGHT)
// Live document header with click-to-edit title, description, and metadata
// ============================================================================

import React, { useState } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { AssessmentType, ExamMetadata } from '../../shared/ExamSchema';
import { AssessmentThemeConfig } from '../../shared/themePresets';

interface CanvasHeaderCardProps {
  metadata: ExamMetadata;
  assessmentType: AssessmentType;
  theme: AssessmentThemeConfig;
  onChangeMetadata: (updates: Partial<ExamMetadata>) => void;
}

export const CanvasHeaderCard: React.FC<CanvasHeaderCardProps> = ({
  metadata,
  assessmentType,
  onChangeMetadata
}) => {
  const [showCoverInput, setShowCoverInput] = useState(false);
  const [coverUrlInput, setCoverUrlInput] = useState(metadata.coverImageUrl || '');

  const handleSaveCover = () => {
    onChangeMetadata({ coverImageUrl: coverUrlInput.trim() || undefined });
    setShowCoverInput(false);
  };

  const handleRemoveCover = () => {
    onChangeMetadata({ coverImageUrl: undefined });
    setCoverUrlInput('');
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white transition-all overflow-hidden shadow-xs hover:shadow-sm">
      {/* Decorative Top Accent Bar */}
      <div className="h-2.5 w-full bg-indigo-600 transition-colors" />

      {/* Cover Image if Present */}
      {metadata.coverImageUrl && (
        <div className="relative w-full h-44 sm:h-52 bg-slate-100 overflow-hidden group">
          <img
            src={metadata.coverImageUrl}
            alt="Assessment Cover"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={handleRemoveCover}
            className="absolute top-3 right-3 p-1.5 rounded-xl bg-slate-900/70 hover:bg-rose-600 text-white transition-all cursor-pointer"
            title="Remove cover image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header Content */}
      <div className="p-6 sm:p-8 space-y-4">
        {/* Top Badges & Cover Image Trigger */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                assessmentType === 'exam'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-teal-50 text-teal-700 border-teal-200'
              }`}
            >
              {assessmentType === 'exam' ? 'Exam Assessment' : 'Classroom Survey'}
            </span>

            <input
              type="text"
              value={metadata.subject || ''}
              onChange={(e) => onChangeMetadata({ subject: e.target.value })}
              placeholder="Subject (e.g. English)"
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 w-36 shadow-2xs"
            />

            <input
              type="text"
              value={metadata.grade || ''}
              onChange={(e) => onChangeMetadata({ grade: e.target.value })}
              placeholder="Grade (e.g. Grade 10)"
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 w-32 shadow-2xs"
            />
          </div>

          {!metadata.coverImageUrl && (
            <button
              type="button"
              onClick={() => setShowCoverInput((prev) => !prev)}
              className="text-xs font-bold text-slate-700 hover:text-indigo-600 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Add Cover Image</span>
            </button>
          )}
        </div>

        {/* Cover Image Input Drawer */}
        {showCoverInput && !metadata.coverImageUrl && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2 animate-fadeIn">
            <input
              type="url"
              value={coverUrlInput}
              onChange={(e) => setCoverUrlInput(e.target.value)}
              placeholder="Paste cover image URL..."
              className="flex-1 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
            />
            <button
              type="button"
              onClick={handleSaveCover}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
            >
              Set Cover
            </button>
            <button
              type="button"
              onClick={() => setShowCoverInput(false)}
              className="p-2 text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Editable Title */}
        <div>
          <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
            Assessment Title
          </label>
          <input
            type="text"
            value={metadata.title}
            onChange={(e) => onChangeMetadata({ title: e.target.value })}
            placeholder="Untitled Assessment"
            className="w-full text-xl sm:text-2xl font-black text-slate-900 bg-white border border-slate-300 rounded-xl px-4 py-2.5 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-hidden transition-all placeholder:text-slate-500 shadow-2xs"
          />
        </div>

        {/* Editable Description */}
        <div>
          <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
            Assessment Description & Instructions
          </label>
          <textarea
            rows={2}
            value={metadata.description || ''}
            onChange={(e) => onChangeMetadata({ description: e.target.value })}
            placeholder="Add general description, instructions, or candidate guidelines for students..."
            className="w-full text-xs sm:text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-xl px-4 py-2.5 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-hidden leading-relaxed resize-y transition-all placeholder:text-slate-500 shadow-2xs"
          />
        </div>

        {/* Quick Meta Footer Strip (Duration & Pass %) */}
        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-6 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">Duration:</span>
            <input
              type="number"
              min={5}
              max={240}
              value={metadata.durationMinutes || 60}
              onChange={(e) => onChangeMetadata({ durationMinutes: parseInt(e.target.value) || 60 })}
              className="w-16 px-2.5 py-1 bg-white border border-slate-300 rounded-xl text-center font-bold text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 shadow-2xs"
            />
            <span className="font-semibold text-slate-600">minutes</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">Passing Grade:</span>
            <input
              type="number"
              min={10}
              max={100}
              value={metadata.passPercentage || 50}
              onChange={(e) => onChangeMetadata({ passPercentage: parseInt(e.target.value) || 50 })}
              className="w-16 px-2.5 py-1 bg-white border border-slate-300 rounded-xl text-center font-bold text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 shadow-2xs"
            />
            <span className="font-semibold text-slate-600">%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
