// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: CANVAS SECTION CARD
// Section divider card with inline title, description, passage, and branching
// ============================================================================

import React from 'react';
import { Layers, Copy, Trash2, BookOpen, GitFork, Plus } from 'lucide-react';
import { ExamSection } from '../../shared/ExamSchema';
import { AssessmentThemeConfig } from '../../shared/themePresets';

interface CanvasSectionCardProps {
  section: ExamSection;
  sectionIndex: number;
  totalSections: number;
  allSections: ExamSection[];
  theme: AssessmentThemeConfig;
  isSelected: boolean;
  onSelectSection: () => void;
  onUpdateSection: (updates: Partial<ExamSection>) => void;
  onDuplicateSection: () => void;
  onDeleteSection: () => void;
  onAddQuestionToSection: () => void;
}

export const CanvasSectionCard: React.FC<CanvasSectionCardProps> = ({
  section,
  sectionIndex,
  totalSections,
  allSections,
  theme,
  isSelected,
  onSelectSection,
  onUpdateSection,
  onDuplicateSection,
  onDeleteSection,
  onAddQuestionToSection
}) => {
  return (
    <div
      onClick={onSelectSection}
      className={`rounded-3xl border transition-all cursor-pointer overflow-hidden shadow-md ${
        isSelected
          ? 'border-indigo-400 ring-2 ring-indigo-500/30 shadow-indigo-600/20'
          : 'border-blue-900/60 hover:border-blue-700'
      }`}
      style={{
        backgroundColor: theme.cardBg
      }}
    >
      {/* Top Section Tag */}
      <div className="px-6 py-2.5 bg-[#091124] border-b border-blue-900/60 flex items-center justify-between text-xs font-bold text-slate-300">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>Section {sectionIndex + 1} of {totalSections}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddQuestionToSection();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-blue-900/50 cursor-pointer"
            title="Add question to this section"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateSection();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-blue-900/50 cursor-pointer"
            title="Duplicate section"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {totalSections > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSection();
              }}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 cursor-pointer"
              title="Delete section"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Section Inputs */}
      <div className="p-6 space-y-3">
        <div>
          <input
            type="text"
            value={section.title}
            onChange={(e) => onUpdateSection({ title: e.target.value })}
            placeholder="Section Title (e.g. Grammar & Vocabulary)"
            className="w-full text-lg sm:text-xl font-black text-white bg-transparent border-b border-transparent hover:border-blue-700/60 focus:border-indigo-400 focus:outline-hidden py-1 transition-all"
          />
        </div>

        <div>
          <input
            type="text"
            value={section.description || ''}
            onChange={(e) => onUpdateSection({ description: e.target.value })}
            placeholder="Section description or instructions for students..."
            className="w-full text-xs text-slate-300 bg-transparent border-b border-transparent hover:border-blue-800/60 focus:border-indigo-400 focus:outline-hidden py-0.5 transition-all placeholder:text-slate-500"
          />
        </div>

        {/* Optional Reading Passage Field */}
        <div className="pt-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Reading Passage (Optional):</span>
          </div>
          <textarea
            rows={3}
            value={section.passage || ''}
            onChange={(e) => onUpdateSection({ passage: e.target.value })}
            placeholder="Paste shared reading passage, case study, or contextual article for questions in this section..."
            className="w-full p-3 bg-[#070e1f] border border-blue-900/80 rounded-2xl text-xs font-serif text-amber-100 placeholder:text-slate-600 focus:outline-hidden focus:border-amber-400 leading-relaxed resize-y"
          />
        </div>

        {/* Conditional Branching Jump Selector */}
        <div className="pt-2 border-t border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <GitFork className="w-3.5 h-3.5 text-indigo-400" />
            <span>After completing this section:</span>
          </div>

          <select
            value={section.skipToSectionId || 'next'}
            onChange={(e) => onUpdateSection({ skipToSectionId: e.target.value === 'next' ? undefined : e.target.value })}
            className="px-3 py-1.5 bg-[#070e1f] border border-blue-800/70 rounded-xl text-xs text-white font-semibold focus:outline-hidden"
          >
            <option value="next">Continue to next section</option>
            {allSections
              .filter(s => s.id !== section.id)
              .map((s, idx) => (
                <option key={s.id} value={s.id}>
                  Jump to: {s.title || `Section ${idx + 1}`}
                </option>
              ))}
            <option value="submit">Submit assessment</option>
          </select>
        </div>
      </div>
    </div>
  );
};
