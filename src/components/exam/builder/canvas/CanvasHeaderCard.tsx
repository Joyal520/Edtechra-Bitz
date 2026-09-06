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
              className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 w-32"
            />

            <input
              type="text"
              value={metadata.grade || ''}
              onChange={(e) => onChangeMetadata({ grade: e.target.value })}
              placeholder="Grade (e.g. Grade 10)"
              className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 w-28"
            />
          </div>

          {!metadata.coverImageUrl && (
            <button
              type="button"
              onClick={() => setShowCoverInput((prev) => !prev)}
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
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
              className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleSaveCover}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Set Cover
            </button>
            <button
              type="button"
              onClick={() => setShowCoverInput(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Editable Title */}
        <div>
          <input
            type="text"
            value={metadata.title}
            onChange={(e) => onChangeMetadata({ title: e.target.value })}
            placeholder="Untitled Assessment"
            className="w-full text-2xl sm:text-3xl font-black text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-hidden py-1 transition-all"
          />
        </div>

        {/* Editable Description */}
        <div>
          <textarea
            rows={2}
            value={metadata.description || ''}
            onChange={(e) => onChangeMetadata({ description: e.target.value })}
            placeholder="Add general description or instructions for students..."
            className="w-full text-xs sm:text-sm text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-hidden py-1 leading-relaxed resize-none transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Quick Meta Footer Strip (Duration & Pass %) */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">Duration:</span>
            <input
              type="number"
              min={5}
              max={240}
              value={metadata.durationMinutes || 60}
              onChange={(e) => onChangeMetadata({ durationMinutes: parseInt(e.target.value) || 60 })}
              className="w-14 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 text-xs focus:bg-white focus:outline-hidden"
            />
            <span>mins</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">Pass:</span>
            <input
              type="number"
              min={10}
              max={100}
              value={metadata.passPercentage || 50}
              onChange={(e) => onChangeMetadata({ passPercentage: parseInt(e.target.value) || 50 })}
              className="w-14 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 text-xs focus:bg-white focus:outline-hidden"
            />
            <span>%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
