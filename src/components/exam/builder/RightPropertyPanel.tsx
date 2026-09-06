// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: RIGHT CONTEXT-SENSITIVE PROPERTY PANEL (LIGHT)
// Dynamically morphs inspector based on selection: Question | Activity | Section | Canvas
// ============================================================================

import React from 'react';
import {
  Sliders,
  ChevronRight,
  ChevronLeft,
  Layers,
  GitFork,
  Image as ImageIcon,
  HelpCircle,
  Trash2,
  Copy,
  BookMarked,
  Headphones,
  Video,
  BookOpen,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  AssessmentType,
  CanonicalQuestion,
  ExamSection,
  ExamActivity,
  SupportedQuestionType,
  QuestionDifficulty,
  PictureTaskType
} from '../shared/ExamSchema';
import {
  ALL_ASSESSMENT_QUESTION_TYPES,
  getQuestionTypeDefinition
} from '../shared/QuestionTypeRegistry';

interface RightPropertyPanelProps {
  assessmentType: AssessmentType;
  selectedQuestion: CanonicalQuestion | null;
  selectedSection: ExamSection | null;
  selectedActivity?: ExamActivity | null;
  allSections: ExamSection[];
  isOpen: boolean;
  onToggle: () => void;
  onUpdateQuestion: (updated: CanonicalQuestion) => void;
  onDeleteQuestion: (questionId: string) => void;
  onDuplicateQuestion: (questionId: string) => void;
  onUpdateSection: (sectionId: string, updates: Partial<ExamSection>) => void;
  onUpdateActivity?: (updated: ExamActivity) => void;
  onDeleteActivity?: (activityId: string) => void;
  onSaveToQuestionBank?: (question: CanonicalQuestion) => void;
}

export const RightPropertyPanel: React.FC<RightPropertyPanelProps> = ({
  assessmentType,
  selectedQuestion,
  selectedSection,
  selectedActivity,
  allSections,
  isOpen,
  onToggle,
  onUpdateQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onUpdateSection,
  onUpdateActivity,
  onDeleteActivity,
  onSaveToQuestionBank
}) => {
  const isSurvey = assessmentType === 'survey';

  if (!isOpen) {
    return (
      <div className="relative z-20">
        <button
          type="button"
          onClick={onToggle}
          className="absolute top-4 right-3 p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 shadow-md hover:border-indigo-400 transition-all"
          title="Open Settings Inspector"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Active Context Label
  const contextTitle = selectedQuestion
    ? 'Question Settings'
    : selectedActivity
    ? 'Activity Settings'
    : selectedSection
    ? 'Section Settings'
    : 'Assessment Overview';

  return (
    <aside className="w-80 h-[calc(100vh-4rem)] border-l border-slate-200 bg-white flex flex-col flex-shrink-0 z-20 transition-all select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {contextTitle}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Collapse settings panel"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dynamic Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5 bg-white">
        {/* =================================================================== */}
        {/* CONTEXT 1: QUESTION SELECTED                                        */}
        {/* =================================================================== */}
        {selectedQuestion ? (
          <div className="space-y-4">
            {/* Question Type Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
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
                    marks: isSurvey ? 0 : selectedQuestion.marks || def.defaultMarks
                  } as CanonicalQuestion);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <optgroup label="Core Types">
                  {ALL_ASSESSMENT_QUESTION_TYPES.filter((t) => t.group === 'google_forms').map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Educational & Interactive">
                  {ALL_ASSESSMENT_QUESTION_TYPES.filter((t) => t.group === 'edtechra_interactive').map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.title}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Marks & Difficulty */}
            {!isSurvey && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">Marks</label>
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">Difficulty</label>
                  <select
                    value={selectedQuestion.difficulty || 'medium'}
                    onChange={(e) =>
                      onUpdateQuestion({
                        ...selectedQuestion,
                        difficulty: e.target.value as QuestionDifficulty
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 capitalize focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
            )}

            {/* Required & Shuffle Options Toggles */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800">Required</span>
                  <p className="text-[10px] text-slate-500">Student must answer</p>
                </div>
                <input
                  type="checkbox"
                  checked={selectedQuestion.required !== false}
                  onChange={(e) =>
                    onUpdateQuestion({
                      ...selectedQuestion,
                      required: e.target.checked
                    })
                  }
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              {['multiple_choice', 'checkboxes', 'dropdown'].includes(selectedQuestion.type) && (
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/80">
                  <div>
                    <span className="text-xs font-bold text-slate-800">Shuffle Options</span>
                    <p className="text-[10px] text-slate-500">Randomize choice order</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedQuestion.shuffleOptions)}
                    onChange={(e) =>
                      onUpdateQuestion({
                        ...selectedQuestion,
                        shuffleOptions: e.target.checked
                      })
                    }
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Explanation / Learning Hint */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                <span>Explanation / Student Feedback</span>
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
                placeholder="Explain the correct answer or provide guidance for review..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
              />
            </div>

            {/* Conditional Branching Jump */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <GitFork className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Conditional Branching</span>
                </label>
              </div>
              <select
                value={selectedQuestion.skipToSectionId || ''}
                onChange={(e) =>
                  onUpdateQuestion({
                    ...selectedQuestion,
                    skipToSectionId: e.target.value || undefined
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Continue to next item</option>
                {allSections.map((sec, idx) => (
                  <option key={sec.id} value={sec.id}>
                    Jump to Section {idx + 1}: {sec.title || 'Untitled'}
                  </option>
                ))}
                <option value="SUBMIT_FORM">Submit exam immediately</option>
              </select>
            </div>

            {/* Actions: Duplicate, Save to Bank, Delete */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onDuplicateQuestion(selectedQuestion.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
                title="Duplicate Question"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-600" />
                <span>Duplicate</span>
              </button>

              {onSaveToQuestionBank && (
                <button
                  type="button"
                  onClick={() => onSaveToQuestionBank(selectedQuestion)}
                  className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-amber-600 hover:text-amber-700 transition-colors"
                  title="Save to Question Bank"
                >
                  <BookMarked className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => onDeleteQuestion(selectedQuestion.id)}
                className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                title="Delete Question"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : selectedActivity ? (
          /* =================================================================== */
          /* CONTEXT 2: ACTIVITY SELECTED (Listening, Reading, Video, Picture)   */
          /* =================================================================== */
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white border border-indigo-200 flex items-center justify-center text-indigo-600">
                {selectedActivity.activityType === 'listening_activity' && <Headphones className="w-4 h-4" />}
                {selectedActivity.activityType === 'video_activity' && <Video className="w-4 h-4" />}
                {selectedActivity.activityType === 'reading_activity' && <BookOpen className="w-4 h-4" />}
                {selectedActivity.activityType === 'picture_description_activity' && <ImageIcon className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-xs font-bold text-indigo-950 block capitalize">
                  {selectedActivity.activityType.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] text-indigo-700">
                  {selectedActivity.questions?.length || 0} child questions attached
                </span>
              </div>
            </div>

            {/* Activity Title */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Activity Title
              </label>
              <input
                type="text"
                value={selectedActivity.title}
                onChange={(e) =>
                  onUpdateActivity &&
                  onUpdateActivity({
                    ...selectedActivity,
                    title: e.target.value
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Transcript Visibility Toggle */}
            {(selectedActivity.activityType === 'listening_activity' ||
              selectedActivity.activityType === 'video_activity') && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Transcript for Students</span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateActivity &&
                      onUpdateActivity({
                        ...selectedActivity,
                        showTranscriptToStudents: !selectedActivity.showTranscriptToStudents
                      })
                    }
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    {selectedActivity.showTranscriptToStudents ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Visible</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-500">Hidden</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  By default, listening transcripts are hidden so students must listen to the audio track.
                </p>
              </div>
            )}

            {/* Picture Description Task Type */}
            {selectedActivity.activityType === 'picture_description_activity' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Picture Task Format
                </label>
                <select
                  value={selectedActivity.pictureTaskType || 'describe'}
                  onChange={(e) =>
                    onUpdateActivity &&
                    onUpdateActivity({
                      ...selectedActivity,
                      pictureTaskType: e.target.value as PictureTaskType
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="describe">Describe the picture</option>
                  <option value="answer_questions">Answer questions about the picture</option>
                  <option value="identify_objects">Identify objects</option>
                  <option value="write_paragraph">Write a paragraph</option>
                  <option value="infer_info">Infer information</option>
                </select>
              </div>
            )}

            {/* Delete Activity */}
            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onDeleteActivity && onDeleteActivity(selectedActivity.id)}
                className="w-full py-2 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Activity</span>
              </button>
            </div>
          </div>
        ) : selectedSection ? (
          /* =================================================================== */
          /* CONTEXT 3: SECTION SELECTED                                         */
          /* =================================================================== */
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-600">
              <Layers className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Section Properties
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Section Title
              </label>
              <input
                type="text"
                value={selectedSection.title}
                onChange={(e) => onUpdateSection(selectedSection.id, { title: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Description / Instructions
              </label>
              <textarea
                rows={3}
                value={selectedSection.description || ''}
                onChange={(e) => onUpdateSection(selectedSection.id, { description: e.target.value })}
                placeholder="Instructions for students taking this section..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Standalone Questions:</span>
                <span className="font-bold text-slate-800">{selectedSection.questions?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Activities:</span>
                <span className="font-bold text-slate-800">{selectedSection.activities?.length || 0}</span>
              </div>
            </div>
          </div>
        ) : (
          /* =================================================================== */
          /* CONTEXT 4: GENERAL CANVAS / NO SELECTION                            */
          /* =================================================================== */
          <div className="p-6 text-center text-slate-400 space-y-2">
            <Sliders className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-medium">
              Click any Question, Activity, or Section on the canvas to inspect its settings here.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
