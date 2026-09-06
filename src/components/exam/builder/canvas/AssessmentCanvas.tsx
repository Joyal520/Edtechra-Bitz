// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: ASSESSMENT CANVAS (LIGHT THEME)
// Central clean document workspace with sections, activities, and questions
// ============================================================================

import React from 'react';
import { Layers, Plus } from 'lucide-react';
import {
  CanonicalAssessmentV2,
  CanonicalQuestion,
  ExamMetadata,
  ExamSection,
  ExamActivity,
  SupportedQuestionType,
  BrandKitConfig
} from '../../shared/ExamSchema';
import { AssessmentThemeConfig } from '../../shared/themePresets';
import { CanvasHeaderCard } from './CanvasHeaderCard';
import { CanvasSectionCard } from './CanvasSectionCard';
import { CanvasQuestionCard } from './CanvasQuestionCard';
import { CanvasActivityCard } from './CanvasActivityCard';
import { AddQuestionInlineButton } from './AddQuestionInlineButton';

interface AssessmentCanvasProps {
  assessment: CanonicalAssessmentV2;
  theme: AssessmentThemeConfig;
  brandKit: BrandKitConfig;
  selectedQuestionId: string | null;
  selectedSectionId: string | null;
  selectedActivityId: string | null;
  onSelectQuestion: (questionId: string) => void;
  onSelectSection: (sectionId: string) => void;
  onSelectActivity: (activityId: string) => void;
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
  onOpenAddModal: (sectionId: string) => void;
  // Activity callbacks
  onUpdateActivity: (sectionId: string, updated: ExamActivity) => void;
  onDeleteActivity: (sectionId: string, activityId: string) => void;
  onDuplicateActivity: (sectionId: string, activityId: string) => void;
  onAddQuestionToActivity: (sectionId: string, activityId: string, type?: SupportedQuestionType) => void;
  onSaveToQuestionBank?: (question: CanonicalQuestion) => void;
}

export const AssessmentCanvas: React.FC<AssessmentCanvasProps> = ({
  assessment,
  theme,
  brandKit,
  selectedQuestionId,
  selectedSectionId,
  selectedActivityId,
  onSelectQuestion,
  onSelectSection,
  onSelectActivity,
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
  onOpenAddModal,
  onUpdateActivity,
  onDeleteActivity,
  onDuplicateActivity,
  onAddQuestionToActivity,
  onSaveToQuestionBank
}) => {
  const sections = assessment.sections && assessment.sections.length > 0
    ? assessment.sections
    : [{ id: 'sec-1', title: 'Section 1', questions: [] }];

  return (
    <div className="min-h-full w-full py-8 px-4 sm:px-6 lg:px-8 bg-slate-50/60 font-sans text-slate-800 relative">
      <div className="max-w-3xl mx-auto space-y-6 relative z-10">
        {/* Brand Kit Institution Header Banner if enabled */}
        {brandKit.enabled && (brandKit.institutionName || brandKit.logoUrl) && (
          <div className="flex items-center justify-between px-6 py-3 rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center gap-3">
              {brandKit.logoUrl ? (
                <img
                  src={brandKit.logoUrl}
                  alt={brandKit.institutionName || 'Institution Logo'}
                  className="w-8 h-8 rounded-lg object-contain p-1 bg-slate-50"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white bg-indigo-600">
                  {(brandKit.institutionName || 'E').charAt(0)}
                </div>
              )}
              {brandKit.institutionName && (
                <span className="text-sm font-bold text-slate-800">
                  {brandKit.institutionName}
                </span>
              )}
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700">
              Official Assessment
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
          const sectionActivities = sec.activities || [];
          const isSectionSelected = selectedSectionId === sec.id;

          return (
            <div key={sec.id} className="space-y-4 pt-2">
              {/* Section Header Card */}
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
                onAddQuestionToSection={() => onOpenAddModal(sec.id)}
              />

              {/* Activities in this section */}
              {sectionActivities.map((act, actIdx) => (
                <React.Fragment key={act.id}>
                  <CanvasActivityCard
                    activity={act}
                    activityIndex={actIdx}
                    totalActivitiesInSection={sectionActivities.length}
                    theme={theme}
                    isSelected={selectedActivityId === act.id}
                    selectedQuestionId={selectedQuestionId}
                    onSelectActivity={() => onSelectActivity(act.id)}
                    onSelectQuestion={onSelectQuestion}
                    onUpdateActivity={(updated) => onUpdateActivity(sec.id, updated)}
                    onDeleteActivity={() => onDeleteActivity(sec.id, act.id)}
                    onDuplicateActivity={() => onDuplicateActivity(sec.id, act.id)}
                    onAddQuestionToActivity={(type) => onAddQuestionToActivity(sec.id, act.id, type)}
                    onUpdateQuestion={onUpdateQuestion}
                    onDeleteQuestion={onDeleteQuestion}
                    onDuplicateQuestion={onDuplicateQuestion}
                    onMoveQuestion={onMoveQuestion}
                  />

                  <AddQuestionInlineButton
                    theme={theme}
                    onAddQuestion={(type) => onAddQuestion(sec.id, undefined, type)}
                    onOpenModal={() => onOpenAddModal(sec.id)}
                  />
                </React.Fragment>
              ))}

              {/* Standalone Questions within this Section */}
              {sectionQuestions.length === 0 && sectionActivities.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center bg-white shadow-2xs">
                  <p className="text-xs sm:text-sm font-bold text-slate-800 mb-3">
                    Section {secIdx + 1} has no questions or activities yet.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenAddModal(sec.id)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Question or Activity</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {sectionQuestions.map((q, qIdx) => {
                    const isSelected = selectedQuestionId === q.id;

                    return (
                      <React.Fragment key={q.id}>
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

                        <AddQuestionInlineButton
                          theme={theme}
                          onAddQuestion={(type) => onAddQuestion(sec.id, qIdx + 1, type)}
                          onOpenModal={() => onOpenAddModal(sec.id)}
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
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-600 bg-white hover:bg-indigo-50/50 text-xs font-bold text-slate-900 hover:text-indigo-900 transition-all shadow-xs cursor-pointer"
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Add New Section</span>
          </button>
        </div>
      </div>
    </div>
  );
};
