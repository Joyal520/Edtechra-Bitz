// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: RIGHT PROPERTY PANEL
// Contextual Inspector for selected question/section: types, branching, marks, media
// ============================================================================

import React, { useState } from 'react';
import {
  Sliders,
  ChevronRight,
  ChevronLeft,
  Layers,
  GitFork,
  Image as ImageIcon,
  HelpCircle,
  Award,
  Trash2,
  Copy,
  BookMarked
} from 'lucide-react';
import {
  AssessmentType,
  CanonicalQuestion,
  ExamSection,
  SupportedQuestionType
} from '../shared/ExamSchema';
import {
  ALL_ASSESSMENT_QUESTION_TYPES,
  getQuestionTypeDefinition,
  QuestionTypeDefinition
} from '../shared/QuestionTypeRegistry';

interface RightPropertyPanelProps {
  assessmentType: AssessmentType;
  selectedQuestion: CanonicalQuestion | null;
  selectedSection: ExamSection | null;
  allSections: ExamSection[];
  isOpen: boolean;
  onToggle: () => void;
  onUpdateQuestion: (updated: CanonicalQuestion) => void;
  onDeleteQuestion: (questionId: string) => void;
  onDuplicateQuestion: (questionId: string) => void;
  onUpdateSection: (sectionId: string, updates: Partial<ExamSection>) => void;
  onSaveToQuestionBank?: (question: CanonicalQuestion) => void;
}

export const RightPropertyPanel: React.FC<RightPropertyPanelProps> = ({
  assessmentType,
  selectedQuestion,
  selectedSection,
  allSections,
  isOpen,
  onToggle,
  onUpdateQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onUpdateSection,
  onSaveToQuestionBank
}) => {
  const [showMediaInputs, setShowMediaInputs] = useState(false);

  const isSurvey = assessmentType === 'survey';

  if (!isOpen) {
    return (
      <div className="relative z-20">
        <button
          type="button"
          onClick={onToggle}
          className="absolute top-4 right-3 p-2 bg-[#091124] border border-blue-900/80 rounded-xl text-slate-300 hover:text-white shadow-xl hover:border-indigo-500 transition-all"
          title="Open Properties Panel"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-80 h-[calc(100vh-4rem)] border-l border-blue-900/60 bg-[#070e1e] flex flex-col flex-shrink-0 z-20 transition-all select-none">
      {/* Header */}
      <div className="p-3 border-b border-blue-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            {selectedQuestion ? 'Question Properties' : selectedSection ? 'Section Properties' : 'Inspector'}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Collapse properties"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
        {selectedQuestion ? (
          <>
            {/* Question Type Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Question Type
              </label>
              <select
                value={selectedQuestion.type}
                onChange={(e) => {
                  const newType = e.target.value as SupportedQuestionType;
                  const def = getQuestionTypeDefinition(newType);
                  onUpdateQuestion({
                    ...selectedQuestion,
                    type: newType,
                    marks: isSurvey ? 0 : (selectedQuestion.marks || def.defaultMarks)
                  } as CanonicalQuestion);
                }}
                className="w-full bg-[#091124] border border-blue-800/80 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <optgroup label="Google Forms Essentials">
                  {ALL_ASSESSMENT_QUESTION_TYPES.filter((t: QuestionTypeDefinition) => t.group === 'google_forms').map((t: QuestionTypeDefinition) => (
                    <option key={t.type} value={t.type}>
                      {t.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="EdTechra Interactive">
                  {ALL_ASSESSMENT_QUESTION_TYPES.filter((t: QuestionTypeDefinition) => t.group === 'edtechra_interactive').map((t: QuestionTypeDefinition) => (
                    <option key={t.type} value={t.type}>
                      {t.title}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Marks / Points (Exams only) */}
            {!isSurvey && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Points / Marks</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-bold">Graded</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={selectedQuestion.marks ?? 1}
                  onChange={(e) =>
                    onUpdateQuestion({
                      ...selectedQuestion,
                      marks: Math.max(0, parseInt(e.target.value, 10) || 0)
                    })
                  }
                  className="w-full bg-[#091124] border border-blue-800/80 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* General Toggles: Required */}
            <div className="p-3 rounded-xl bg-[#091124] border border-blue-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200">Required</span>
                  <p className="text-[10px] text-slate-400">Must be answered before submitting</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateQuestion({
                      ...selectedQuestion,
                      required: !selectedQuestion.required
                    })
                  }
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    selectedQuestion.required ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      selectedQuestion.required ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Shuffle Options Toggle for choices */}
              {(selectedQuestion.type === 'multiple_choice' ||
                selectedQuestion.type === 'multiple_select' ||
                selectedQuestion.type === 'checkboxes' ||
                selectedQuestion.type === 'dropdown') && (
                <div className="flex items-center justify-between pt-2 border-t border-blue-900/40">
                  <div>
                    <span className="text-xs font-semibold text-slate-200">Shuffle Options</span>
                    <p className="text-[10px] text-slate-400">Randomize choice order per student</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateQuestion({
                        ...selectedQuestion,
                        shuffleOptions: !selectedQuestion.shuffleOptions
                      })
                    }
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      selectedQuestion.shuffleOptions ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        selectedQuestion.shuffleOptions ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* Google Forms Conditional Branching Jump */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <GitFork className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Conditional Branching</span>
                </label>
                <span className="text-[10px] text-cyan-400 font-bold">Logic Jump</span>
              </div>
              <select
                value={selectedQuestion.skipToSectionId || ''}
                onChange={(e) =>
                  onUpdateQuestion({
                    ...selectedQuestion,
                    skipToSectionId: e.target.value || undefined
                  })
                }
                className="w-full bg-[#091124] border border-blue-800/80 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Continue to next question / section</option>
                {allSections.map((sec, idx) => (
                  <option key={sec.id} value={sec.id}>
                    Go to Section {idx + 1}: {sec.title || 'Untitled'}
                  </option>
                ))}
                <option value="SUBMIT_FORM">Submit form directly</option>
              </select>
              <p className="text-[10px] text-slate-400">
                Direct students to a specific section based on this answer.
              </p>
            </div>

            {/* Explanation / Hint Field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Explanation / Solution Note</span>
              </label>
              <textarea
                rows={3}
                value={selectedQuestion.explanation || ''}
                onChange={(e) =>
                  onUpdateQuestion({
                    ...selectedQuestion,
                    explanation: e.target.value
                  })
                }
                placeholder="Explain the correct answer or add a learning hint..."
                className="w-full bg-[#091124] border border-blue-800/80 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Media URL Attachments */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowMediaInputs(!showMediaInputs)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#091124] border border-blue-900/60 text-xs font-semibold text-slate-300 hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Media Attachments</span>
                </span>
                <span className="text-[10px] text-indigo-400">
                  {showMediaInputs ? 'Hide' : 'Add Image/Video'}
                </span>
              </button>

              {showMediaInputs && (
                <div className="p-3 rounded-xl bg-[#091124] border border-blue-900/60 space-y-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Image URL
                    </label>
                    <input
                      type="url"
                      value={selectedQuestion.mediaUrl || ''}
                      onChange={(e) =>
                        onUpdateQuestion({
                          ...selectedQuestion,
                          mediaUrl: e.target.value.trim() || undefined
                        })
                      }
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-[#050b18] border border-blue-900/80 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-400 mt-1"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions: Duplicate, Save to Bank, Delete */}
            <div className="pt-3 border-t border-blue-900/60 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onDuplicateQuestion(selectedQuestion.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-blue-800/80 bg-[#091124] hover:bg-[#0d1838] text-xs font-semibold text-slate-200 transition-colors"
                title="Duplicate Question"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-400" />
                <span>Duplicate</span>
              </button>

              {onSaveToQuestionBank && (
                <button
                  type="button"
                  onClick={() => onSaveToQuestionBank(selectedQuestion)}
                  className="p-2 rounded-xl border border-blue-800/80 bg-[#091124] hover:bg-[#0d1838] text-amber-400 hover:text-amber-300 transition-colors"
                  title="Save to Question Bank"
                >
                  <BookMarked className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => onDeleteQuestion(selectedQuestion.id)}
                className="p-2 rounded-xl border border-rose-900/60 bg-[#091124] hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 transition-colors"
                title="Delete Question"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : selectedSection ? (
          /* Section Inspector */
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <Layers className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Section Settings
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Section Title
              </label>
              <input
                type="text"
                value={selectedSection.title}
                onChange={(e) => onUpdateSection(selectedSection.id, { title: e.target.value })}
                className="w-full bg-[#091124] border border-blue-800/80 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Section Description
              </label>
              <textarea
                rows={2}
                value={selectedSection.description || ''}
                onChange={(e) => onUpdateSection(selectedSection.id, { description: e.target.value })}
                placeholder="Optional description or instructions for this section..."
                className="w-full bg-[#091124] border border-blue-800/80 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                After Section Completion (Branching)
              </label>
              <select
                value={selectedSection.skipToSectionId || ''}
                onChange={(e) =>
                  onUpdateSection(selectedSection.id, {
                    skipToSectionId: e.target.value || undefined
                  })
                }
                className="w-full bg-[#091124] border border-blue-800/80 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Continue to next section</option>
                {allSections
                  .filter((s) => s.id !== selectedSection.id)
                  .map((s, idx) => (
                    <option key={s.id} value={s.id}>
                      Go to Section {idx + 1}: {s.title || 'Untitled'}
                    </option>
                  ))}
                <option value="SUBMIT_FORM">Submit form directly</option>
              </select>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Sliders className="w-8 h-8 mb-2 opacity-40 text-indigo-400" />
            <p className="text-xs font-semibold text-slate-400">
              No Question Selected
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Click on any question or section on the canvas to configure its properties, points, and branching logic.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
