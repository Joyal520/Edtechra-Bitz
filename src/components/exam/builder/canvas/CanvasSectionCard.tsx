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
      <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span className="uppercase tracking-wider text-[11px] text-indigo-700">
            Section {sectionIndex + 1} of {totalSections}
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 font-semibold text-[11px]">
            {totalQuestions} {totalQuestions === 1 ? 'question' : 'questions'} ({totalMarks} {totalMarks === 1 ? 'mark' : 'marks'})
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddQuestionToSection();
            }}
            className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors"
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
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
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
              className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
              title="Delete section"
            >
              <Trash2 className="w-4 h-4" />
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
            className="w-full text-lg sm:text-xl font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-hidden py-1 transition-all"
          />
        </div>

        <div>
          <input
            type="text"
            value={section.description || ''}
            onChange={(e) => onUpdateSection({ description: e.target.value })}
            placeholder="Section description or instructions for students..."
            className="w-full text-xs text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-hidden py-0.5 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Optional Shared Reading Passage Field */}
        <div className="pt-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Shared Context / Reading Passage (Optional):</span>
          </div>
          <textarea
            rows={2}
            value={section.passage || ''}
            onChange={(e) => onUpdateSection({ passage: e.target.value })}
            placeholder="Paste shared reading passage or contextual article for questions in this section..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-400 leading-relaxed resize-y"
          />
        </div>

        {/* Conditional Branching Jump Selector */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <GitFork className="w-3.5 h-3.5 text-indigo-500" />
            <span>After completing this section:</span>
          </div>

          <select
            value={section.skipToSectionId || ''}
            onChange={(e) => onUpdateSection({ skipToSectionId: e.target.value || undefined })}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:bg-white focus:outline-hidden"
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
