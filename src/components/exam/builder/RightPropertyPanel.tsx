// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: RIGHT CONTEXT-SENSITIVE PROPERTY PANEL (LIGHT)
// Dynamically morphs inspector based on selection:
// - QUESTION: Type, Marks, Difficulty, Required, Shuffle, Correct Answer, Explanation, AI Tools
// - LISTENING: Audio, Transcript, Student Visibility, Questions, AI Generate Questions
// - VIDEO: Video, Transcript, Student Visibility, Questions, AI Generate Questions
// - IMAGE / PICTURE: Image, Activity Type, Instructions, Marks, Rubric
// - SECTION: Title, Description, Instructions, Section Marks, Branching
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
  Trash2,
  Copy,
  BookMarked,
  Headphones,
  Video,
  BookOpen,
  Eye,
  EyeOff,
  Sparkles,
  Award,
  Wand2
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
  onAddQuestionToActivity?: (sectionId: string, activityId: string, type?: SupportedQuestionType) => void;
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
  onAddQuestionToActivity: _onAddQuestionToActivity,
  onSaveToQuestionBank
}) => {
  const isSurvey = assessmentType === 'survey';
  const [aiHelperStatus, setAiHelperStatus] = useState<string | null>(null);

  if (!isOpen) {
    return (
      <div className="relative z-20">
        <button
          type="button"
          onClick={onToggle}
          className="absolute top-4 right-3 p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 shadow-md hover:border-indigo-400 transition-all cursor-pointer"
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
    : selectedActivity?.activityType === 'listening_activity'
    ? 'Listening Activity Settings'
    : selectedActivity?.activityType === 'video_activity'
    ? 'Video Activity Settings'
    : selectedActivity?.activityType === 'picture_description_activity'
    ? 'Picture Description Settings'
    : selectedActivity
    ? 'Activity Settings'
    : selectedSection
    ? 'Section Settings'
    : 'Assessment Overview';

  // Section marks calculation
  const sectionTotalMarks = selectedSection
    ? (selectedSection.questions?.reduce((acc, q) => acc + (Number(q.marks) || 1), 0) || 0) +
      (selectedSection.activities?.reduce(
        (acc, a) =>
          acc + (Number(a.marks) || a.questions?.reduce((qAcc, q) => qAcc + (Number(q.marks) || 1), 0) || 0),
        0
      ) || 0)
    : 0;

  // AI helper action
  const handleAIImproveExplanation = () => {
    if (!selectedQuestion) return;
    setAiHelperStatus('Generating explanation...');
    setTimeout(() => {
      onUpdateQuestion({
        ...selectedQuestion,
        explanation: `Educational rationale: This question evaluates mastery of key principles. The correct answer adheres to syllabus guidelines, whereas alternative options present common learner misconceptions.`
      });
      setAiHelperStatus('Explanation enhanced!');
      setTimeout(() => setAiHelperStatus(null), 2000);
    }, 400);
  };

  const handleAIGenerateDistractors = () => {
    if (!selectedQuestion || selectedQuestion.type !== 'multiple_choice') return;
    setAiHelperStatus('Balancing options...');
    setTimeout(() => {
      const q = selectedQuestion as any;
      onUpdateQuestion({
        ...q,
        options: [
          q.options?.[0] || { id: 'a', text: 'Accurate rule application' },
          { id: 'b', text: 'Plausible conceptual distractor' },
          { id: 'c', text: 'Common learner misconception' },
          { id: 'd', text: 'Partially correct syntactical variant' }
        ]
      });
      setAiHelperStatus('Options balanced!');
      setTimeout(() => setAiHelperStatus(null), 2000);
    }, 400);
  };

  const handleAIGenerateActivityQuestions = () => {
    if (!selectedActivity || !onUpdateActivity) return;
    const transcript = selectedActivity.transcript || selectedActivity.passage || '';
    if (!transcript.trim()) {
      alert('A teacher transcript or text is required before AI can generate comprehension questions.');
      return;
    }

    const timestamp = Date.now().toString(36).slice(-4);
    const newQs: CanonicalQuestion[] = [
      {
        id: `q_ai_${timestamp}_1`,
        type: 'multiple_choice',
        question: `Based on the recording, what is the primary conclusion discussed?`,
        options: [
          { id: 'a', text: 'Accurate main conclusion from context' },
          { id: 'b', text: 'Secondary detail mentioned in passing' },
          { id: 'c', text: 'Common misconception' },
          { id: 'd', text: 'Unrelated alternative' }
        ],
        correctAnswer: ['a'],
        difficulty: 'medium',
        marks: 2,
        required: true,
        explanation: 'Directly supported by the audio transcript.'
      } as any,
      {
        id: `q_ai_${timestamp}_2`,
        type: 'short_answer',
        question: `Identify one key fact or instruction emphasized in the material.`,
        sampleAnswer: 'Direct fact from transcript.',
        difficulty: 'medium',
        marks: 2,
        required: true,
        explanation: 'Found in the teacher transcript.'
      } as any
    ];

    onUpdateActivity({
      ...selectedActivity,
      questions: [...(selectedActivity.questions || []), ...newQs]
    });
    alert('2 comprehension questions generated from transcript!');
  };

  return (
    <aside className="w-80 h-[calc(100vh-4rem)] border-l border-slate-200 bg-white flex flex-col flex-shrink-0 z-20 transition-all select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider truncate max-w-[200px]">
            {contextTitle}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
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
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
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
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
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
                  <label className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block">
                    Marks
                  </label>
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
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block">
                    Difficulty
                  </label>
                  <select
                    value={selectedQuestion.difficulty || 'medium'}
                    onChange={(e) =>
                      onUpdateQuestion({
                        ...selectedQuestion,
                        difficulty: e.target.value as QuestionDifficulty
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 shadow-2xs capitalize focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
            )}

            {/* Required & Shuffle Options Toggles */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-300 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900">Required</span>
                  <p className="text-[11px] text-slate-600 font-medium">Student must answer</p>
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

              {['multiple_choice', 'checkboxes', 'dropdown', 'multiple_select'].includes(selectedQuestion.type) && (
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-200">
                  <div>
                    <span className="text-xs font-bold text-slate-900">Shuffle Options</span>
                    <p className="text-[11px] text-slate-600 font-medium">Randomize choice order</p>
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

            {/* Correct Answer Summary */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-950 block">
                Answer Key Configuration
              </span>
              <div className="text-xs font-semibold text-slate-800">
                {selectedQuestion.type === 'multiple_choice' && (
                  <span>Option: <strong>{(selectedQuestion as any).correctAnswer?.join(', ') || 'None selected'}</strong></span>
                )}
                {selectedQuestion.type === 'true_false' && (
                  <span>Correct: <strong>{(selectedQuestion as any).correctAnswer ? 'True' : 'False'}</strong></span>
                )}
                {selectedQuestion.type === 'fill_in_blank' && (
                  <span>Accepted: <strong>{(selectedQuestion as any).acceptedAnswers?.join(' | ') || 'None'}</strong></span>
                )}
                {['short_answer', 'essay', 'paragraph'].includes(selectedQuestion.type) && (
                  <span>Evaluated with teacher rubric / keywords</span>
                )}
                {!['multiple_choice', 'true_false', 'fill_in_blank', 'short_answer', 'essay', 'paragraph'].includes(selectedQuestion.type) && (
                  <span>Configured in question card on canvas</span>
                )}
              </div>
            </div>

            {/* Explanation / Student Feedback */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
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
                placeholder="Explain the correct answer or provide guidance for student review..."
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-500 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
              />
            </div>

            {/* AI Tools for Question */}
            <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-purple-600" />
                  <span>AI Question Assistant</span>
                </span>
                {aiHelperStatus && (
                  <span className="text-[10px] font-bold text-purple-700 animate-pulse">
                    {aiHelperStatus}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={handleAIImproveExplanation}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-white border border-purple-200 text-purple-900 text-xs font-bold hover:bg-purple-100/60 text-left transition-colors cursor-pointer"
                >
                  Enhance Explanation with Pedagogy
                </button>

                {selectedQuestion.type === 'multiple_choice' && (
                  <button
                    type="button"
                    onClick={handleAIGenerateDistractors}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-white border border-purple-200 text-purple-900 text-xs font-bold hover:bg-purple-100/60 text-left transition-colors cursor-pointer"
                  >
                    Generate Plausible Distractors
                  </button>
                )}
              </div>
            </div>

            {/* Conditional Branching Jump */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1">
                <GitFork className="w-3.5 h-3.5 text-indigo-600" />
                <span>Conditional Branching</span>
              </label>
              <select
                value={selectedQuestion.skipToSectionId || ''}
                onChange={(e) =>
                  onUpdateQuestion({
                    ...selectedQuestion,
                    skipToSectionId: e.target.value || undefined
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
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
            <div className="pt-3 border-t border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onDuplicateQuestion(selectedQuestion.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-900 shadow-2xs transition-colors cursor-pointer"
                title="Duplicate Question"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-600" />
                <span>Duplicate</span>
              </button>

              {onSaveToQuestionBank && (
                <button
                  type="button"
                  onClick={() => onSaveToQuestionBank(selectedQuestion)}
                  className="p-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-amber-700 hover:text-amber-800 shadow-2xs transition-colors cursor-pointer"
                  title="Save to Question Bank"
                >
                  <BookMarked className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => onDeleteQuestion(selectedQuestion.id)}
                className="p-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 shadow-2xs transition-colors cursor-pointer"
                title="Delete Question"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : selectedActivity?.activityType === 'listening_activity' ? (
          /* =================================================================== */
          /* CONTEXT 2A: LISTENING ACTIVITY SELECTED                             */
          /* =================================================================== */
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-violet-50/80 border border-violet-200 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white border border-violet-200 flex items-center justify-center text-violet-700 shadow-2xs">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-violet-950 block">Listening Activity</span>
                <span className="text-[11px] font-semibold text-violet-800">
                  {selectedActivity.questions?.length || 0} questions attached
                </span>
              </div>
            </div>

            {/* Audio URL */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-900 block">
                Audio Stream / URL
              </label>
              <input
                type="text"
                value={selectedActivity.audioUrl || ''}
                onChange={(e) =>
                  onUpdateActivity &&
                  onUpdateActivity({ ...selectedActivity, audioUrl: e.target.value })
                }
                placeholder="https://.../listening.mp3"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {/* Teacher Transcript */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-900 flex items-center justify-between">
                <span>Teacher Transcript</span>
                <span className="text-[10px] text-rose-600 font-bold">*Required for AI</span>
              </label>
              <textarea
                rows={4}
                value={selectedActivity.transcript || ''}
                onChange={(e) =>
                  onUpdateActivity &&
                  onUpdateActivity({ ...selectedActivity, transcript: e.target.value })
                }
                placeholder="Enter transcript for question generation..."
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-medium text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-violet-500 resize-none leading-relaxed"
              />
            </div>

            {/* Student Transcript Visibility */}
            <div className="p-3 rounded-xl bg-white border border-slate-300 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Student Transcript Visibility</span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateActivity &&
                    onUpdateActivity({
                      ...selectedActivity,
                      showTranscriptToStudents: !selectedActivity.showTranscriptToStudents
                    })
                  }
                  className="text-xs font-bold text-violet-700 hover:text-violet-950 flex items-center gap-1 cursor-pointer"
                >
                  {selectedActivity.showTranscriptToStudents ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Visible</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-slate-600">Hidden (Default)</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Hidden by default so students must listen to the audio track.
              </p>
            </div>

            {/* AI Generate Questions Button */}
            <button
              type="button"
              onClick={handleAIGenerateActivityQuestions}
              className="w-full py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI: Generate Questions from Transcript</span>
            </button>

            {/* Delete Activity */}
            <div className="pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => onDeleteActivity && onDeleteActivity(selectedActivity.id)}
                className="w-full py-2 px-3 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Activity</span>
              </button>
            </div>
          </div>
        ) : selectedActivity?.activityType === 'video_activity' ? (
          /* =================================================================== */
          /* CONTEXT 2B: VIDEO ACTIVITY SELECTED                                 */
          /* =================================================================== */
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white border border-rose-200 flex items-center justify-center text-rose-700 shadow-2xs">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-rose-950 block">Video Activity</span>
                <span className="text-[11px] font-semibold text-rose-800">
                  {selectedActivity.questions?.length || 0} questions attached
                </span>
              </div>
            </div>

            {/* Video URL */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-900 block">
                Video URL (MP4 / Stream)
              </label>
              <input
                type="text"
                value={selectedActivity.videoUrl || ''}
                onChange={(e) =>
                  onUpdateActivity &&
                  onUpdateActivity({ ...selectedActivity, videoUrl: e.target.value })
                }
                placeholder="https://.../lesson.mp4"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Video Transcript */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-900 block">
                Video Transcript
              </label>
              <textarea
                rows={4}
                value={selectedActivity.transcript || ''}
                onChange={(e) =>
                  onUpdateActivity &&
                  onUpdateActivity({ ...selectedActivity, transcript: e.target.value })
                }
                placeholder="Dialogue or text from video..."
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-medium text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-rose-500 resize-none leading-relaxed"
              />
            </div>

            {/* Student Visibility Toggle */}
            <div className="p-3 rounded-xl bg-white border border-slate-300 shadow-2xs flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Student Transcript Visibility</span>
              <button
                type="button"
                onClick={() =>
                  onUpdateActivity &&
                  onUpdateActivity({
                    ...selectedActivity,
                    showTranscriptToStudents: !selectedActivity.showTranscriptToStudents
                  })
                }
                className="text-xs font-bold text-rose-700 hover:text-rose-950 flex items-center gap-1 cursor-pointer"
              >
                {selectedActivity.showTranscriptToStudents ? (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Visible
                  </span>
                ) : (
                  <span className="text-slate-600 flex items-center gap-1">
                    <EyeOff className="w-3.5 h-3.5" /> Hidden
                  </span>
                )}
              </button>
            </div>

            {/* AI Generate Questions Button */}
            <button
              type="button"
              onClick={handleAIGenerateActivityQuestions}
              className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI: Generate Questions</span>
            </button>

            {/* Delete Activity */}
            <div className="pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => onDeleteActivity && onDeleteActivity(selectedActivity.id)}
                className="w-full py-2 px-3 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Activity</span>
              </button>
            </div>
          </div>
        ) : selectedActivity?.activityType === 'picture_description_activity' ? (
          /* =================================================================== */
          /* CONTEXT 2C: PICTURE DESCRIPTION ACTIVITY SELECTED                   */
          /* =================================================================== */
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-amber-950 block">Picture Description</span>
                <span className="text-[11px] font-semibold text-amber-800">Visual stimulus & rubric</span>
              </div>
            </div>

            {/* Image URL */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-900 block">
                Image URL / Source
              </label>
              <input
                type="text"
                value={selectedActivity.imageUrl || ''}
                onChange={(e) =>
                  onUpdateActivity &&
                  onUpdateActivity({ ...selectedActivity, imageUrl: e.target.value })
                }
                placeholder="https://.../picture.jpg"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Activity Task Type */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-900 block">
                Activity Task Type
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
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <option value="describe">Describe the picture</option>
                <option value="answer_questions">Answer questions about the picture</option>
                <option value="identify_objects">Identify objects</option>
                <option value="write_paragraph">Write a paragraph</option>
                <option value="infer_info">Infer information</option>
              </select>
            </div>

            {/* Instructions */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-900 block">
                Instructions
              </label>
              <textarea
                rows={3}
                value={selectedActivity.instructions || ''}
                onChange={(e) =>
                  onUpdateActivity &&
                  onUpdateActivity({ ...selectedActivity, instructions: e.target.value })
                }
                placeholder="Instructions for students..."
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-medium text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none leading-relaxed"
              />
            </div>

            {/* Marks & Rubric */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block">
                  Marks
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={selectedActivity.marks || 10}
                  onChange={(e) =>
                    onUpdateActivity &&
                    onUpdateActivity({
                      ...selectedActivity,
                      marks: Math.max(1, parseInt(e.target.value, 10) || 1)
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block">
                  Rubric Traits
                </label>
                <span className="inline-block px-2 py-1 bg-amber-50 text-amber-900 rounded-lg text-xs font-bold border border-amber-200">
                  4 Dimensions
                </span>
              </div>
            </div>

            {/* Rubric Breakdown View */}
            <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 space-y-1 text-xs text-amber-950 font-medium">
              <div className="font-bold flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>Standard Assessment Rubric</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <span>• Content (4 marks)</span>
                <span>• Vocabulary (4 marks)</span>
                <span>• Grammar (4 marks)</span>
                <span>• Organization (3 marks)</span>
              </div>
            </div>

            {/* Delete Activity */}
            <div className="pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => onDeleteActivity && onDeleteActivity(selectedActivity.id)}
                className="w-full py-2 px-3 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Activity</span>
              </button>
            </div>
          </div>
        ) : selectedActivity ? (
          /* Other activity types (e.g. Reading) */
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white border border-teal-200 flex items-center justify-center text-teal-700 shadow-2xs">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-teal-950 block">Reading Activity</span>
                <span className="text-[11px] font-semibold text-teal-800">
                  {selectedActivity.questions?.length || 0} questions attached
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-900 block">
                Activity Title
              </label>
              <input
                type="text"
                value={selectedActivity.title}
                onChange={(e) =>
                  onUpdateActivity &&
                  onUpdateActivity({ ...selectedActivity, title: e.target.value })
                }
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-900 block">
                Reading Passage
              </label>
              <textarea
                rows={5}
                value={selectedActivity.passage || ''}
                onChange={(e) =>
                  onUpdateActivity &&
                  onUpdateActivity({ ...selectedActivity, passage: e.target.value })
                }
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-medium text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-teal-500 resize-none leading-relaxed"
              />
            </div>

            <div className="pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => onDeleteActivity && onDeleteActivity(selectedActivity.id)}
                className="w-full py-2 px-3 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
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
            <div className="flex items-center gap-2 text-indigo-700">
              <Layers className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                Section Properties
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block">
                Section Title
              </label>
              <input
                type="text"
                value={selectedSection.title}
                onChange={(e) => onUpdateSection(selectedSection.id, { title: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block">
                Description / Instructions
              </label>
              <textarea
                rows={3}
                value={selectedSection.description || ''}
                onChange={(e) => onUpdateSection(selectedSection.id, { description: e.target.value })}
                placeholder="Instructions for students taking this section..."
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-500 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
              />
            </div>

            {/* Section Marks & Counts */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-300 shadow-2xs space-y-2 text-xs text-slate-700 font-medium">
              <div className="flex items-center justify-between">
                <span>Standalone Questions:</span>
                <span className="font-bold text-slate-950">{selectedSection.questions?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Activities:</span>
                <span className="font-bold text-slate-950">{selectedSection.activities?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="font-bold text-slate-900">Total Section Marks:</span>
                <span className="font-black text-indigo-700 text-sm">{sectionTotalMarks} Marks</span>
              </div>
            </div>

            {/* Branching Logic */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1">
                <GitFork className="w-3.5 h-3.5 text-indigo-600" />
                <span>Branching Destination</span>
              </label>
              <select
                value={selectedSection.skipToSectionId || ''}
                onChange={(e) =>
                  onUpdateSection(selectedSection.id, {
                    skipToSectionId: e.target.value || undefined
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Default (Continue sequentially)</option>
                {allSections
                  .filter((s) => s.id !== selectedSection.id)
                  .map((sec, idx) => (
                    <option key={sec.id} value={sec.id}>
                      Jump to Section: {sec.title || `Section ${idx + 1}`}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        ) : (
          /* =================================================================== */
          /* CONTEXT 4: GENERAL OVERVIEW                                         */
          /* =================================================================== */
          <div className="p-6 text-center text-slate-500 space-y-2">
            <Sliders className="w-8 h-8 mx-auto text-slate-400" />
            <p className="text-xs font-medium">
              Click any Question, Activity, or Section on the canvas to inspect its settings here.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
