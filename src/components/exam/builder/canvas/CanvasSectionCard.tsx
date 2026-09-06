// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: CANVAS SECTION CARD (LIGHT)
// Section divider card with inline title, description, and branching jump
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
  isSelected,
  onSelectSection,
  onUpdateSection,
  onDuplicateSection,
  onDeleteSection,
  onAddQuestionToSection
}) => {
  const totalQuestions = (section.questions?.length || 0) + (section.activities?.reduce((acc, a) => acc + (a.questions?.length || 0), 0) || 0);
  const totalMarks =
    (section.questions?.reduce((acc, q) => acc + (Number(q.marks) || 1), 0) || 0) +
    (section.activities?.reduce((acc, a) => acc + (a.marks || a.questions?.reduce((qAcc, q) => qAcc + (Number(q.marks) || 1), 0) || 0), 0) || 0);

  return (
    <div
      onClick={onSelectSection}
      className={`rounded-3xl border transition-all cursor-pointer overflow-hidden shadow-xs hover:shadow-sm ${
        isSelected
          ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      {/* Top Section Header Strip */}
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span className="uppercase tracking-wider text-xs font-black text-indigo-950">
            Section {sectionIndex + 1} of {totalSections}
          </span>
          <span className="text-slate-400 font-bold">•</span>
          <span className="text-slate-700 font-bold text-xs">
            {totalQuestions} {totalQuestions === 1 ? 'question' : 'questions'} ({totalMarks} {totalMarks === 1 ? 'mark' : 'marks'})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddQuestionToSection();
            }}
            className="p-1.5 text-slate-700 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-200 cursor-pointer transition-colors"
            title="Add question to this section"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateSection();
            }}
            className="p-1.5 text-slate-700 hover:text-slate-950 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-300 cursor-pointer transition-colors"
            title="Duplicate section"
          >
            <Copy className="w-4 h-4" />
          </button>

          {totalSections > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSection();
              }}
              className="p-1.5 text-slate-700 hover:text-rose-600 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer transition-colors"
              title="Delete section"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Section Inputs */}
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
            Section Title
          </label>
          <input
            type="text"
            value={section.title}
            onChange={(e) => onUpdateSection({ title: e.target.value })}
            placeholder="Section Title (e.g. Section 1 / Grammar & Vocabulary)"
            className="w-full px-3.5 py-2 text-base font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-hidden transition-all placeholder:text-slate-500 shadow-2xs"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
            Description / Instructions
          </label>
          <textarea
            rows={2}
            value={section.description || ''}
            onChange={(e) => onUpdateSection({ description: e.target.value })}
            placeholder="Provide section instructions or guidelines for students..."
            className="w-full px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-hidden leading-relaxed resize-y transition-all placeholder:text-slate-500 shadow-2xs"
          />
        </div>

        {/* Optional Shared Reading Passage Field */}
        <div className="pt-1">
          <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span>Shared Context / Reading Passage (Optional)</span>
          </label>
          <textarea
            rows={3}
            value={section.passage || ''}
            onChange={(e) => onUpdateSection({ passage: e.target.value })}
            placeholder="Paste shared reading passage, contextual case study, or stimulus for questions in this section..."
            className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 leading-relaxed resize-y shadow-2xs"
          />
        </div>

        {/* Conditional Branching Jump Selector */}
        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-800 font-bold">
            <GitFork className="w-3.5 h-3.5 text-indigo-600" />
            <span>After completing this section:</span>
          </div>

          <select
            value={section.skipToSectionId || ''}
            onChange={(e) => onUpdateSection({ skipToSectionId: e.target.value || undefined })}
            className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">Continue to next section</option>
            {allSections
              .filter((s) => s.id !== section.id)
              .map((s, idx) => (
                <option key={s.id} value={s.id}>
                  Go to Section {idx + 1}: {s.title || 'Untitled'}
                </option>
              ))}
            <option value="SUBMIT_FORM">Submit exam directly</option>
          </select>
        </div>
      </div>
    </div>
  );
};
