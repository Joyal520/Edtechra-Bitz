// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: ASSESSMENT CANVAS
// Central live paper/document workspace with Canva-style theming & Brand Kit
// ============================================================================

import React from 'react';
import { Plus, Layers } from 'lucide-react';
import {
  CanonicalExamV2,
  CanonicalQuestion,
  ExamMetadata,
  ExamSection,
  SupportedQuestionType,
  BrandKitConfig
} from '../../shared/ExamSchema';
import { AssessmentThemeConfig } from '../../shared/themePresets';
import { CanvasHeaderCard } from './CanvasHeaderCard';
import { CanvasSectionCard } from './CanvasSectionCard';
import { CanvasQuestionCard } from './CanvasQuestionCard';
import { AddQuestionInlineButton } from './AddQuestionInlineButton';

interface AssessmentCanvasProps {
  assessment: CanonicalExamV2;
  theme: AssessmentThemeConfig;
  brandKit: BrandKitConfig;
  selectedQuestionId: string | null;
  selectedSectionId: string | null;
  onSelectQuestion: (questionId: string) => void;
  onSelectSection: (sectionId: string) => void;
  onChangeMetadata: (updates: Partial<ExamMetadata>) => void;
  onUpdateQuestion: (updated: CanonicalQuestion) => void;
  onDeleteQuestion: (questionId: string) => void;
  onDuplicateQuestion: (questionId: string) => void;
  onMoveQuestion: (questionId: string, direction: 'up' | 'down') => void;
  onAddQuestion: (sectionId: string, index?: number, type?: SupportedQuestionType) => void;
  onUpdateSection: (sectionId: string, updates: Partial<ExamSection>) => void;
  onDeleteSection: (sectionId: string) => void;
  onDuplicateSection: (sectionId: string) => void;
  onAddSection: () => void;
  onSaveToQuestionBank?: (question: CanonicalQuestion) => void;
}

export const AssessmentCanvas: React.FC<AssessmentCanvasProps> = ({
  assessment,
  theme,
  brandKit,
  selectedQuestionId,
  selectedSectionId,
  onSelectQuestion,
  onSelectSection,
  onChangeMetadata,
  onUpdateQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onMoveQuestion,
  onAddQuestion,
  onUpdateSection,
  onDeleteSection,
  onDuplicateSection,
  onAddSection,
  onSaveToQuestionBank
}) => {
  const fontClass =
    theme.fontFamily === 'serif'
      ? 'font-serif'
      : theme.fontFamily === 'mono'
      ? 'font-mono'
      : theme.fontFamily === 'comic'
      ? 'font-sans tracking-wide'
      : 'font-sans';

  // Fallback if sections is empty
  const sections = assessment.sections && assessment.sections.length > 0
    ? assessment.sections
    : [
        {
          id: 'sec-default',
          title: 'Section 1',
          questions: []
        }
      ];

  return (
    <div
      className={`min-h-full w-full py-8 px-4 sm:px-6 lg:px-8 relative transition-colors duration-300 ${fontClass}`}
      style={{
        backgroundColor: theme.pageBg
      }}
    >
      {/* Subtle Brand Watermark if enabled */}
      {brandKit.enabled && brandKit.watermark && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] select-none z-0 overflow-hidden">
          <span className="text-8xl md:text-9xl font-black uppercase rotate-[-25deg] tracking-widest text-white whitespace-nowrap">
            {brandKit.institutionName || 'EDTECHRA'}
          </span>
        </div>
      )}

      {/* Main Document Container (max-w-3xl for optimal readable document width) */}
      <div className="max-w-3xl mx-auto space-y-6 relative z-10">
        {/* Brand Kit Institution Header Banner (if enabled and institutionName or logo is present) */}
        {brandKit.enabled && (brandKit.institutionName || brandKit.logoUrl) && (
          <div
            className="flex items-center justify-between px-6 py-3 rounded-2xl border shadow-sm"
            style={{
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder
            }}
          >
            <div className="flex items-center gap-3">
              {brandKit.logoUrl ? (
                <img
                  src={brandKit.logoUrl}
                  alt={brandKit.institutionName || 'Institution Logo'}
                  className="w-8 h-8 rounded-lg object-contain bg-white/5 p-1"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white"
                  style={{ backgroundColor: brandKit.primaryColor || theme.primaryColor }}
                >
                  {(brandKit.institutionName || 'E').charAt(0)}
                </div>
              )}
              {brandKit.institutionName && (
                <span className="text-sm font-semibold text-slate-200">
                  {brandKit.institutionName}
                </span>
              )}
            </div>
            <span
              className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border"
              style={{
                borderColor: `${theme.primaryColor}55`,
                color: theme.primaryColor
              }}
            >
              {assessment.assessmentType === 'survey' ? 'Official Survey' : 'Official Assessment'}
            </span>
          </div>
        )}

        {/* Canvas Header Card */}
        <CanvasHeaderCard
          metadata={assessment.exam}
          assessmentType={assessment.assessmentType}
          theme={theme}
          onChangeMetadata={onChangeMetadata}
        />

        {/* Multi-Section Workspace */}
        {sections.map((sec, secIdx) => {
          const sectionQuestions = sec.questions || [];
          const isSectionSelected = selectedSectionId === sec.id;

          return (
            <div key={sec.id} className="space-y-4 pt-2">
              {/* Section Header Card (shown if more than 1 section, or if title/desc/passage customized) */}
              {(sections.length > 1 || sec.title !== 'Section 1' || sec.description || sec.passage) && (
                <CanvasSectionCard
                  section={sec}
                  sectionIndex={secIdx}
                  totalSections={sections.length}
                  allSections={sections}
                  theme={theme}
                  isSelected={isSectionSelected}
                  onSelectSection={() => onSelectSection(sec.id)}
                  onUpdateSection={(updates) => onUpdateSection(sec.id, updates)}
                  onDuplicateSection={() => onDuplicateSection(sec.id)}
                  onDeleteSection={() => onDeleteSection(sec.id)}
                  onAddQuestionToSection={() => onAddQuestion(sec.id, sectionQuestions.length)}
                />
              )}

              {/* Questions within this Section */}
              {sectionQuestions.length === 0 ? (
                <div
                  className="rounded-3xl border-2 border-dashed border-blue-900/50 p-8 text-center transition-all hover:border-indigo-500/50"
                  style={{ backgroundColor: `${theme.cardBg}88` }}
                >
                  <p className="text-sm text-slate-400 mb-3">
                    This section has no questions yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => onAddQuestion(sec.id, 0)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md hover:scale-[1.02] transition-transform"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Question to Section {secIdx + 1}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sectionQuestions.map((q, qIdx) => {
                    const isSelected = selectedQuestionId === q.id;

                    return (
                      <React.Fragment key={q.id}>
                        {/* Question Card */}
                        <CanvasQuestionCard
                          question={q}
                          index={qIdx}
                          totalQuestionsInSection={sectionQuestions.length}
                          assessmentType={assessment.assessmentType}
                          theme={theme}
                          isSelected={isSelected}
                          onSelect={() => onSelectQuestion(q.id)}
                          onUpdateQuestion={onUpdateQuestion}
                          onDuplicate={() => onDuplicateQuestion(q.id)}
                          onDelete={() => onDeleteQuestion(q.id)}
                          onMoveUp={() => onMoveQuestion(q.id, 'up')}
                          onMoveDown={() => onMoveQuestion(q.id, 'down')}
                          onSaveToQuestionBank={
                            onSaveToQuestionBank ? () => onSaveToQuestionBank(q) : undefined
                          }
                        />

                        {/* Inline Button between questions */}
                        <AddQuestionInlineButton
                          theme={theme}
                          onAddQuestion={(type) => onAddQuestion(sec.id, qIdx + 1, type)}
                        />
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Global Footer Actions: Add Section Button */}
        <div className="pt-4 pb-12 flex justify-center">
          <button
            type="button"
            onClick={onAddSection}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-dashed border-blue-700/80 hover:border-indigo-400 bg-[#091124]/60 hover:bg-[#091124] text-xs font-bold text-slate-300 hover:text-white transition-all shadow-sm"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Add New Section</span>
          </button>
        </div>
      </div>
    </div>
  );
};
