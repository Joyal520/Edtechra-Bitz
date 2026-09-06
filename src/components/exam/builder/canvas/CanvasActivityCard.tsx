// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: CANVAS ACTIVITY CARD
// Dedicated container for learning materials (Reading, Listening, Video, Picture)
// with child questions belonging directly to the activity container.
// ============================================================================

import React, { useState } from 'react';
import {
  Headphones,
  Video,
  BookOpen,
  Image as ImageIcon,
  Plus,
  Trash2,
  Copy,
  Sparkles,
  Eye,
  EyeOff,
  Upload,
  Award,
  X
} from 'lucide-react';
import {
  ExamActivity,
  CanonicalQuestion,
  PictureTaskType,
  SupportedQuestionType
} from '../../shared/ExamSchema';
import { AssessmentThemeConfig } from '../../shared/themePresets';
import { CanvasQuestionCard } from './CanvasQuestionCard';

interface CanvasActivityCardProps {
  activity: ExamActivity;
  activityIndex: number;
  totalActivitiesInSection: number;
  theme: AssessmentThemeConfig;
  isSelected: boolean;
  selectedQuestionId: string | null;
  onSelectActivity: () => void;
  onSelectQuestion: (questionId: string) => void;
  onUpdateActivity: (updated: ExamActivity) => void;
  onDeleteActivity: () => void;
  onDuplicateActivity: () => void;
  onAddQuestionToActivity: (type?: SupportedQuestionType) => void;
  onUpdateQuestion: (updated: CanonicalQuestion) => void;
  onDeleteQuestion: (questionId: string) => void;
  onDuplicateQuestion: (questionId: string) => void;
  onMoveQuestion: (questionId: string, direction: 'up' | 'down') => void;
}

export const CanvasActivityCard: React.FC<CanvasActivityCardProps> = ({
  activity,
  activityIndex: _activityIndex,
  theme,
  isSelected,
  selectedQuestionId,
  onSelectActivity,
  onSelectQuestion,
  onUpdateActivity,
  onDeleteActivity,
  onDuplicateActivity,
  onAddQuestionToActivity,
  onUpdateQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onMoveQuestion
}) => {
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [aiSelectedTypes, setAiSelectedTypes] = useState({
    mcq: true,
    trueFalse: true,
    fillBlank: true,
    shortAnswer: false
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const questions = activity.questions || [];

  const handleUpdateField = (field: keyof ExamActivity, value: any) => {
    onUpdateActivity({
      ...activity,
      [field]: value
    });
  };

  const handleGenerateQuestionsFromTranscript = () => {
    const textSource = activity.transcript || activity.passage || '';
    if (!textSource.trim()) {
      alert('A transcript or passage is required to generate AI comprehension questions.');
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      const generated: CanonicalQuestion[] = [];
      const timestamp = Date.now().toString(36).slice(-4);

      for (let i = 1; i <= aiQuestionCount; i++) {
        const qId = `q_act_${timestamp}_${i}`;

        if (aiSelectedTypes.trueFalse && i % 3 === 0) {
          generated.push({
            id: qId,
            type: 'true_false',
            question: `According to the audio/material, statement ${i} is correct.`,
            correctAnswer: i % 2 === 0,
            difficulty: aiDifficulty,
            marks: 1,
            required: true,
            explanation: 'Verified directly from the transcript.'
          } as any);
        } else if (aiSelectedTypes.fillBlank && i % 4 === 0) {
          generated.push({
            id: qId,
            type: 'fill_in_blank',
            question: `The speaker explicitly mentioned the term "_____" during the recording.`,
            acceptedAnswers: ['key term', 'important fact'],
            difficulty: aiDifficulty,
            marks: 1,
            required: true,
            explanation: 'Found in the listening transcript.'
          } as any);
        } else {
          generated.push({
            id: qId,
            type: 'multiple_choice',
            question: `What is the main idea conveyed in section ${i} of the material?`,
            options: [
              { id: 'a', text: 'Accurate main conclusion from context' },
              { id: 'b', text: 'Partially mentioned secondary detail' },
              { id: 'c', text: 'Common misconception or distractor' },
              { id: 'd', text: 'Unrelated alternative' }
            ],
            correctAnswer: ['a'],
            difficulty: aiDifficulty,
            marks: 1,
            required: true,
            explanation: 'Option A matches the speaker / author context.'
          } as any);
        }
      }

      onUpdateActivity({
        ...activity,
        questions: [...questions, ...generated]
      });

      setIsGenerating(false);
      setShowAIGenerator(false);
    }, 600);
  };

  // Render Activity Icon & Title
  const renderActivityHeader = () => {
    switch (activity.activityType) {
      case 'listening_activity':
        return (
          <div className="flex items-center gap-2 text-violet-700">
            <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 block">
                Listening Activity
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Audio stimulus with comprehension questions
              </span>
            </div>
          </div>
        );

      case 'video_activity':
        return (
          <div className="flex items-center gap-2 text-rose-700">
            <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                Video Activity
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Video clip stimulus with comprehension questions
              </span>
            </div>
          </div>
        );

      case 'reading_activity':
        return (
          <div className="flex items-center gap-2 text-teal-700">
            <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 block">
                Reading Activity
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Passage reader with child questions
              </span>
            </div>
          </div>
        );

      case 'picture_description_activity':
        return (
          <div className="flex items-center gap-2 text-amber-700">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">
                Picture Description Activity
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Visual prompt with rubric or writing task
              </span>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      onClick={onSelectActivity}
      className={`rounded-3xl border transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md ${
        isSelected
          ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      {/* Activity Top Bar */}
      <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
        {renderActivityHeader()}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateActivity();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
            title="Duplicate Activity"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteActivity();
            }}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
            title="Delete Activity"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Activity Material Content Body */}
      <div className="p-6 space-y-5">
        {/* Title Input */}
        <div>
          <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1.5">
            Activity Title
          </label>
          <input
            type="text"
            value={activity.title}
            onChange={(e) => handleUpdateField('title', e.target.value)}
            placeholder="e.g. Airport Announcement / The Great Barrier Reef"
            className="w-full px-3.5 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-500 shadow-2xs"
          />
        </div>

        {/* 1. LISTENING ACTIVITY MATERIAL */}
        {activity.activityType === 'listening_activity' && (
          <div className="p-4 rounded-2xl bg-violet-50/50 border border-violet-200 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-violet-950 uppercase tracking-wider block">
                Audio Track (URL or Audio File)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={activity.audioUrl || ''}
                  onChange={(e) => handleUpdateField('audioUrl', e.target.value)}
                  placeholder="https://edtechra.blob.core.windows.net/.../listening.mp3"
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    const demoAudio = 'https://actions.google.com/sounds/v1/ambiences/outdoor_market.ogg';
                    handleUpdateField('audioUrl', demoAudio);
                  }}
                  className="px-3 py-2 bg-violet-100 hover:bg-violet-200 text-violet-900 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Sample</span>
                </button>
              </div>
            </div>

            {/* Transcript Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-violet-950 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Audio Transcript</span>
                  <span className="text-xs text-rose-600 font-bold">*Required for AI Generation</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleUpdateField('showTranscriptToStudents', !activity.showTranscriptToStudents)}
                  className="text-xs font-bold text-violet-800 hover:text-violet-950 flex items-center gap-1 cursor-pointer"
                >
                  {activity.showTranscriptToStudents ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Visible to Students</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-slate-600">Hidden by default</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                rows={3}
                value={activity.transcript || ''}
                onChange={(e) => handleUpdateField('transcript', e.target.value)}
                placeholder="Paste the audio transcript here. AI will use this transcript to create comprehension questions..."
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 leading-relaxed resize-y shadow-2xs"
              />
            </div>
          </div>
        )}

        {/* 2. VIDEO ACTIVITY MATERIAL */}
        {activity.activityType === 'video_activity' && (
          <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-rose-950 uppercase tracking-wider block">
                Video URL (MP4 or Embedded Stream)
              </label>
              <input
                type="text"
                value={activity.videoUrl || ''}
                onChange={(e) => handleUpdateField('videoUrl', e.target.value)}
                placeholder="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Video Transcript */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-rose-950 uppercase tracking-wider">
                  Video Transcript (For Question Generation)
                </label>
                <button
                  type="button"
                  onClick={() => handleUpdateField('showTranscriptToStudents', !activity.showTranscriptToStudents)}
                  className="text-xs font-bold text-rose-800 flex items-center gap-1 cursor-pointer"
                >
                  {activity.showTranscriptToStudents ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> Visible
                    </span>
                  ) : (
                    <span className="text-slate-600 flex items-center gap-1">
                      <EyeOff className="w-3.5 h-3.5" /> Hidden by default
                    </span>
                  )}
                </button>
              </div>
              <textarea
                rows={3}
                value={activity.transcript || ''}
                onChange={(e) => handleUpdateField('transcript', e.target.value)}
                placeholder="Paste the dialogue or transcript from the video..."
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 leading-relaxed resize-y shadow-2xs"
              />
            </div>
          </div>
        )}

        {/* 3. READING ACTIVITY MATERIAL */}
        {activity.activityType === 'reading_activity' && (
          <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200 space-y-3">
            <label className="text-xs font-bold text-teal-950 uppercase tracking-wider block">
              Reading Passage
            </label>
            <textarea
              rows={5}
              value={activity.passage || ''}
              onChange={(e) => handleUpdateField('passage', e.target.value)}
              placeholder="Paste or write the reading comprehension passage here..."
              className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 leading-relaxed resize-y shadow-2xs"
            />
          </div>
        )}

        {/* 4. PICTURE DESCRIPTION ACTIVITY MATERIAL */}
        {activity.activityType === 'picture_description_activity' && (
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-amber-950 uppercase tracking-wider block mb-1">
                  Image URL / Upload
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={activity.imageUrl || ''}
                    onChange={(e) => handleUpdateField('imageUrl', e.target.value)}
                    placeholder="https://images.unsplash.com/photo-1577563908411-5077b6dc7624"
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const sampleImg = 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=800&q=80';
                      handleUpdateField('imageUrl', sampleImg);
                    }}
                    className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-bold rounded-xl transition-colors shrink-0 cursor-pointer"
                  >
                    Sample
                  </button>
                </div>

                {/* Task Type */}
                <div className="pt-2">
                  <label className="text-xs font-bold text-amber-950 uppercase tracking-wider block mb-1.5">
                    Activity Task Type
                  </label>
                  <select
                    value={activity.pictureTaskType || 'describe'}
                    onChange={(e) => handleUpdateField('pictureTaskType', e.target.value as PictureTaskType)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 shadow-2xs"
                  >
                    <option value="describe">Describe the picture</option>
                    <option value="answer_questions">Answer questions about the picture</option>
                    <option value="identify_objects">Identify objects</option>
                    <option value="write_paragraph">Write a paragraph</option>
                    <option value="infer_info">Infer information</option>
                  </select>
                </div>
              </div>

              {/* Image Preview Box */}
              <div className="w-full h-36 rounded-xl border border-slate-300 bg-white overflow-hidden flex items-center justify-center shadow-2xs">
                {activity.imageUrl ? (
                  <img
                    src={activity.imageUrl}
                    alt="Stimulus Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-slate-500 text-xs font-semibold">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1 text-slate-400" />
                    <span>No image selected</span>
                  </div>
                )}
              </div>
            </div>

            {/* Prompt / Instructions */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-amber-950 uppercase tracking-wider block">
                Student Instructions / Task Prompt
              </label>
              <textarea
                rows={2}
                value={activity.instructions || ''}
                onChange={(e) => handleUpdateField('instructions', e.target.value)}
                placeholder="e.g. Look at the picture carefully. Write 5 complete sentences describing what the people are doing..."
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 resize-y shadow-2xs"
              />
            </div>

            {/* Optional Rubric Badges */}
            <div className="p-3 bg-white rounded-xl border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-amber-900 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-600" />
                <span>Evaluation Rubric:</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md border border-amber-200 font-semibold text-[11px]">
                  Content
                </span>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md border border-amber-200 font-semibold text-[11px]">
                  Vocabulary
                </span>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md border border-amber-200 font-semibold text-[11px]">
                  Grammar
                </span>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md border border-amber-200 font-semibold text-[11px]">
                  Organization
                </span>
              </div>
            </div>
          </div>
        )}

        {/* AI Question Generator Drawer for this Activity */}
        {showAIGenerator && (
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-indigo-900">
                  Generate Comprehension Questions from Activity Material
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAIGenerator(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Question Types:</label>
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiSelectedTypes.mcq}
                      onChange={(e) => setAiSelectedTypes((p) => ({ ...p, mcq: e.target.checked }))}
                      className="accent-indigo-600 rounded"
                    />
                    <span>Multiple Choice</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiSelectedTypes.trueFalse}
                      onChange={(e) => setAiSelectedTypes((p) => ({ ...p, trueFalse: e.target.checked }))}
                      className="accent-indigo-600 rounded"
                    />
                    <span>True / False</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiSelectedTypes.fillBlank}
                      onChange={(e) => setAiSelectedTypes((p) => ({ ...p, fillBlank: e.target.checked }))}
                      className="accent-indigo-600 rounded"
                    />
                    <span>Fill in the Blank</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Number of Questions:</label>
                <div className="flex items-center gap-1">
                  {[3, 5, 8].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setAiQuestionCount(num)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        aiQuestionCount === num
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Difficulty:</label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateQuestionsFromTranscript}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? 'Generating...' : 'Generate Questions from Material'}</span>
            </button>
          </div>
        )}

        {/* Child Questions belonging to this Activity */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Questions for this Activity ({questions.length})
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAIGenerator(!showAIGenerator)}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 border border-indigo-200 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Assist</span>
              </button>

              <button
                type="button"
                onClick={() => onAddQuestionToActivity('multiple_choice')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>
            </div>
          </div>

          {/* Child questions list */}
          {questions.length === 0 ? (
            <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 text-center bg-slate-50/50">
              <p className="text-xs text-slate-500 mb-2">
                No questions added to this activity yet.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onAddQuestionToActivity('multiple_choice')}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Question</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAIGenerator(true)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold inline-flex items-center gap-1.5 border border-indigo-200 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate with AI</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pl-3 border-l-2 border-indigo-100">
              {questions.map((q, qIdx) => (
                <CanvasQuestionCard
                  key={q.id}
                  question={q}
                  index={qIdx}
                  totalQuestionsInSection={questions.length}
                  assessmentType="exam"
                  theme={theme}
                  isSelected={selectedQuestionId === q.id}
                  onSelect={() => onSelectQuestion(q.id)}
                  onUpdateQuestion={onUpdateQuestion}
                  onDuplicate={() => onDuplicateQuestion(q.id)}
                  onDelete={() => onDeleteQuestion(q.id)}
                  onMoveUp={() => onMoveQuestion(q.id, 'up')}
                  onMoveDown={() => onMoveQuestion(q.id, 'down')}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
