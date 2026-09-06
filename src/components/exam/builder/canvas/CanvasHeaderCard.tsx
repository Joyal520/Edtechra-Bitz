// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: CANVAS HEADER CARD
// Live document header with click-to-edit title, description, and cover image
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
  theme,
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
    <div
      className={`rounded-3xl border transition-all overflow-hidden shadow-xl ${
        theme.cardStyle === 'glass'
          ? 'backdrop-blur-md bg-opacity-80'
          : theme.cardStyle === 'outlined'
          ? 'bg-transparent border-2'
          : ''
      }`}
      style={{
        backgroundColor: theme.cardBg,
        borderColor: theme.cardBorder
      }}
    >
      {/* Decorative Top Accent Bar */}
      <div
        className="h-3 w-full transition-colors"
        style={{ backgroundColor: theme.primaryColor }}
      />

      {/* Cover Image if Present */}
      {metadata.coverImageUrl && (
        <div className="relative w-full h-44 sm:h-52 bg-[#050b18] overflow-hidden group">
          <img
            src={metadata.coverImageUrl}
            alt="Assessment Cover"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={handleRemoveCover}
            className="absolute top-3 right-3 p-1.5 rounded-xl bg-slate-900/80 hover:bg-rose-900/80 text-slate-300 hover:text-white transition-all cursor-pointer"
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
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                assessmentType === 'exam'
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-teal-500/20 text-teal-300 border-teal-500/40'
              }`}
            >
              {assessmentType === 'exam' ? 'Exam Assessment' : 'Classroom Survey'}
            </span>

            <input
              type="text"
              value={metadata.subject || ''}
              onChange={(e) => onChangeMetadata({ subject: e.target.value })}
              placeholder="Subject (e.g. Science)"
              className="px-2.5 py-0.5 rounded-lg bg-[#070e1f] border border-blue-900/70 text-xs font-bold text-slate-300 focus:outline-hidden focus:border-indigo-400 w-32"
            />

            <input
              type="text"
              value={metadata.grade || ''}
              onChange={(e) => onChangeMetadata({ grade: e.target.value })}
              placeholder="Grade (e.g. Grade 8)"
              className="px-2.5 py-0.5 rounded-lg bg-[#070e1f] border border-blue-900/70 text-xs font-bold text-slate-300 focus:outline-hidden focus:border-indigo-400 w-28"
            />
          </div>

          {!metadata.coverImageUrl && (
            <button
              type="button"
              onClick={() => setShowCoverInput(prev => !prev)}
              className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Add Cover Image</span>
            </button>
          )}
        </div>

        {/* Cover Image Input Drawer */}
        {showCoverInput && !metadata.coverImageUrl && (
          <div className="p-3.5 rounded-2xl bg-[#070e1f] border border-blue-800/80 flex items-center gap-2 animate-fadeIn">
            <input
              type="url"
              value={coverUrlInput}
              onChange={(e) => setCoverUrlInput(e.target.value)}
              placeholder="Paste cover image URL..."
              className="flex-1 px-3 py-1.5 bg-[#0b142c] border border-blue-900 rounded-xl text-xs font-medium text-white focus:outline-hidden focus:border-indigo-400"
            />
            <button
              type="button"
              onClick={handleSaveCover}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black cursor-pointer"
            >
              Set Cover
            </button>
            <button
              type="button"
              onClick={() => setShowCoverInput(false)}
              className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Assessment Title (Large Inline Editable Heading) */}
        <div>
          <input
            type="text"
            value={metadata.title}
            onChange={(e) => onChangeMetadata({ title: e.target.value })}
            placeholder="Untitled Assessment Title"
            className="w-full text-2xl sm:text-3xl font-black text-white bg-transparent border-b border-transparent hover:border-blue-700/60 focus:border-indigo-400 focus:outline-hidden py-1 transition-all"
            style={{
              fontFamily: theme.typography === 'serif' ? 'serif' : theme.typography === 'mono' ? 'monospace' : 'inherit'
            }}
          />
        </div>

        {/* Description / Subtitle */}
        <div>
          <textarea
            rows={2}
            value={metadata.description || ''}
            onChange={(e) => onChangeMetadata({ description: e.target.value })}
            placeholder="Form description, learning objectives, or assessment context..."
            className="w-full text-xs sm:text-sm text-slate-300 bg-transparent border-b border-transparent hover:border-blue-800/60 focus:border-indigo-400 focus:outline-hidden py-1 leading-relaxed resize-none transition-all placeholder:text-slate-500"
          />
        </div>

        {/* Instructions */}
        <div className="pt-2 border-t border-blue-900/50">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Student Instructions</label>
          <input
            type="text"
            value={metadata.instructions || ''}
            onChange={(e) => onChangeMetadata({ instructions: e.target.value })}
            placeholder="e.g. Choose the best answer for each question. All questions must be completed before submitting."
            className="w-full text-xs text-slate-300 bg-transparent border-b border-transparent hover:border-blue-800/60 focus:border-indigo-400 focus:outline-hidden py-1 transition-all placeholder:text-slate-500"
          />
        </div>
      </div>
    </div>
  );
};
