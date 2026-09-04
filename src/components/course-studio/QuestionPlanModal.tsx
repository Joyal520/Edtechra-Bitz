// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: QUESTION PLANNER & AI JSON IMPORT MODAL
// Teacher-controlled question planning, prompt generation (v1.0 schema),
// untrusted JSON validation, and importing into Course Studio questions.
// Supports type-specific counts (Cloze Blanks, Ordering Sentences),
// Marks per Question / Activity, and Non-blocking Authoring.
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  FileText,
  Video,
  Image as ImageIcon,
  Code2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { CourseQuestion, DifficultyLevel, QuestionType } from '@/types/courseStudio';
import {
  QuestionPlan,
  QuestionPlanItem,
  QUESTION_TYPE_LABELS,
  QUESTION_CATEGORIES,
  buildAiQuestionPrompt,
  validateAiQuestionJson,
  convertValidatedJsonToCourseQuestions,
  getPlanItemActivityCount,
  getPlanItemTotalMarks,
  ValidationResult
} from '@/utils/questionSchemaValidator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  unitTitle: string;
  episodeTitle: string;
  episodeId: string;
  courseId: string;
  lessonText: string;
  hasVideo: boolean;
  hasImage: boolean;
  onImportQuestions: (questions: CourseQuestion[]) => void;
}

export const QuestionPlanModal: React.FC<Props> = ({
  isOpen,
  onClose,
  courseTitle,
  unitTitle,
  episodeTitle,
  episodeId,
  courseId,
  lessonText,
  hasVideo,
  hasImage,
  onImportQuestions
}) => {
  const [tab, setTab] = useState<'plan' | 'prompt' | 'import'>('plan');
  
  // Question Plan state
  const [planItems, setPlanItems] = useState<QuestionPlanItem[]>([
    {
      id: '1',
      type: 'multiple_choice',
      count: 5,
      difficulty: 'medium',
      points: 10,
      instructions: ''
    }
  ]);
  const [videoTranscript, setVideoTranscript] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const [teacherInstructions, setTeacherInstructions] = useState('');
  const [cefrLevel, setCefrLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>('A1');

  // Prompt state
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  // Import / Validation state
  const [jsonInput, setJsonInput] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setTab('plan');
      setValidationResult(null);
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate lesson text word count & total interactive activities & marks
  const wordCount = lessonText.trim() ? lessonText.trim().split(/\s+/).length : 0;
  const totalPlanActivities = planItems.reduce((sum, item) => sum + getPlanItemActivityCount(item), 0);
  const totalPlanMarks = planItems.reduce((sum, item) => sum + getPlanItemTotalMarks(item), 0);

  const handleAddPlanItem = () => {
    setPlanItems(prev => [
      ...prev,
      {
        id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'true_false',
        count: 3,
        difficulty: 'medium',
        points: 10,
        instructions: ''
      }
    ]);
  };

  const handleRemovePlanItem = (id: string) => {
    setPlanItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdatePlanItem = (id: string, updates: Partial<QuestionPlanItem>) => {
    setPlanItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleGeneratePrompt = () => {
    const plan: QuestionPlan = {
      items: planItems,
      cefr_level: cefrLevel,
      video_transcript: videoTranscript,
      image_description: imageDescription,
      teacher_instructions: teacherInstructions
    };

    const promptText = buildAiQuestionPrompt({
      courseTitle,
      unitTitle,
      episodeTitle,
      lessonText,
      videoTranscript,
      imageDescription,
      plan,
      cefrLevel
    });

    setGeneratedPrompt(promptText);
    setTab('prompt');
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleValidateJson = () => {
    const plan: QuestionPlan = {
      items: planItems,
      cefr_level: cefrLevel,
      video_transcript: videoTranscript,
      image_description: imageDescription,
      teacher_instructions: teacherInstructions
    };

    const result = validateAiQuestionJson(jsonInput, plan);
    setValidationResult(result);
  };

  const handleExecuteImport = () => {
    if (!validationResult || !validationResult.isValid || !validationResult.parsedData) return;

    const imported = convertValidatedJsonToCourseQuestions(
      validationResult.parsedData,
      episodeId,
      courseId
    );

    onImportQuestions(imported);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/65 backdrop-blur-xs overflow-y-auto">
      {/* Modal Dialog Container - Wide Landscape */}
      <div className="bg-white rounded-[24px] sm:rounded-[28px] max-w-[1000px] w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header - Fixed at Top with Premium Badges */}
        <div className="px-6 py-4 sm:px-8 bg-[#0a213c] text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center border border-sky-400/30 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  AI Question Plan & Importer
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-200 text-[10px] font-black uppercase tracking-wider">
                  v1.0 Schema
                </span>
              </div>
              <div className="flex items-center gap-2 pt-0.5 text-xs text-slate-400 font-medium">
                <span className="truncate max-w-xs">{courseTitle}</span>
                <span>•</span>
                <span className="text-sky-300 font-bold">{totalPlanActivities} Activities</span>
                <span>•</span>
                <span className="text-emerald-300 font-bold">{totalPlanMarks} Total Marks</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 sm:px-8 py-2.5 bg-slate-50 border-b border-stone-200 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setTab('plan')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === 'plan'
                ? 'bg-white text-[#026fc3] shadow-xs border border-stone-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. Question Plan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!generatedPrompt) handleGeneratePrompt();
              else setTab('prompt');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === 'prompt'
                ? 'bg-white text-[#026fc3] shadow-xs border border-stone-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>2. Generated Prompt</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('import')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === 'import'
                ? 'bg-white text-[#026fc3] shadow-xs border border-stone-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>3. Validate & Import JSON</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          
          {/* ---------------------------------------------------------------- */}
          {/* TAB 1: QUESTION PLAN BUILDER                                     */}
          {/* ---------------------------------------------------------------- */}
          {tab === 'plan' && (
            <div className="space-y-6">
              
              {/* Question Sources Summary Box & CEFR Level */}
              <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-sky-200/50">
                  <p className="text-[11px] font-black text-[#026fc3] uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Question Generation Settings</span>
                  </p>
                  
                  {/* CEFR Level Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Target CEFR:</span>
                    <select
                      value={cefrLevel}
                      onChange={e => setCefrLevel(e.target.value as any)}
                      className="px-2.5 py-1 rounded-lg border border-sky-300 bg-white text-xs font-black text-[#026fc3] shadow-2xs focus:ring-2 focus:ring-[#026fc3]"
                    >
                      <option value="A1">A1 — Beginner</option>
                      <option value="A2">A2 — Elementary</option>
                      <option value="B1">B1 — Intermediate</option>
                      <option value="B2">B2 — Upper Intermediate</option>
                      <option value="C1">C1 — Advanced</option>
                      <option value="C2">C2 — Proficiency</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Lesson text: {wordCount} words detected</span>
                  </div>
                  {hasVideo && (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Video present in lesson</span>
                    </div>
                  )}
                  {hasImage && (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Image illustration present</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Optional Transcripts / Descriptions */}
              {(hasVideo || hasImage) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {hasVideo && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-rose-500" />
                        <span>Video Transcript (Optional)</span>
                      </label>
                      <textarea
                        rows={3}
                        value={videoTranscript}
                        onChange={e => setVideoTranscript(e.target.value)}
                        placeholder="Paste video dialogue or key spoken points here..."
                        className="w-full p-3 rounded-xl border border-stone-200 text-xs font-mono focus:ring-2 focus:ring-[#026fc3] focus:outline-none"
                      />
                    </div>
                  )}

                  {hasImage && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Image Description (Optional)</span>
                      </label>
                      <textarea
                        rows={3}
                        value={imageDescription}
                        onChange={e => setImageDescription(e.target.value)}
                        placeholder="e.g. A young eagle standing among chickens on a farm..."
                        className="w-full p-3 rounded-xl border border-stone-200 text-xs font-mono focus:ring-2 focus:ring-[#026fc3] focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Question Sets List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                      QUESTION SETS ({planItems.length}) • TOTAL ACTIVITIES: {totalPlanActivities}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      Total Points: <span className="text-[#026fc3] font-black">{totalPlanMarks} pts</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddPlanItem}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#026fc3] border border-sky-200 text-xs font-black flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Question Set</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {planItems.map((item, index) => {
                    const isCloze = item.type === 'cloze_passage';
                    const isOrdering = item.type === 'ordering';
                    const isEssay = item.type === 'essay';
                    const pointsVal = typeof item.points === 'number' ? item.points : (isEssay || isCloze ? 20 : 10);
                    const itemTotalMarks = getPlanItemTotalMarks(item);

                    return (
                      <div
                        key={item.id}
                        className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-4 hover:border-sky-300/80 transition-all"
                      >
                        {/* Header & Removal */}
                        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">
                              Set #{index + 1}:
                            </span>
                            <span className="text-xs font-bold text-[#026fc3]">
                              {QUESTION_TYPE_LABELS[item.type]}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-stone-100 text-slate-700 text-[10px] font-bold">
                              {itemTotalMarks} pts
                            </span>
                          </div>

                          {planItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePlanItem(item.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer transition-all"
                              title="Remove set"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Controls Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          {/* 1. Question Type */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase">Type</label>
                            <select
                              value={item.type}
                              onChange={e => {
                                const newType = e.target.value as QuestionType;
                                handleUpdatePlanItem(item.id, {
                                  type: newType,
                                  points: newType === 'essay' || newType === 'cloze_passage' ? 20 : 10,
                                  wh_type: newType === 'wh_question' ? 'mixed_wh' : undefined,
                                  blankCount: newType === 'cloze_passage' ? 10 : undefined,
                                  activityCount: newType === 'ordering' ? 1 : undefined,
                                  itemsPerActivity: newType === 'ordering' ? 5 : undefined,
                                  min_words: newType === 'essay' ? 80 : undefined,
                                  max_words: newType === 'essay' ? 100 : undefined,
                                  evaluation_criteria: newType === 'essay' ? ['content_accuracy', 'relevance', 'completeness', 'language', 'grammar', 'vocabulary'] : undefined
                                });
                              }}
                              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#026fc3] bg-white"
                            >
                              {QUESTION_CATEGORIES.map(cat => (
                                <optgroup key={cat.id} label={`Category ${cat.code}: ${cat.name}`}>
                                  {cat.types.map(t => (
                                    <option key={t} value={t}>
                                      {QUESTION_TYPE_LABELS[t] || t}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </div>

                          {/* 2. Type-Specific Count Fields */}
                          {isCloze ? (
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-500 uppercase">
                                Number of Blanks
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={30}
                                value={item.blankCount || item.count || 10}
                                onChange={e => {
                                  const val = Math.max(1, parseInt(e.target.value) || 1);
                                  handleUpdatePlanItem(item.id, { blankCount: val, count: val });
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#026fc3] bg-white"
                              />
                              <span className="text-[10px] text-slate-400 font-medium block">
                                Create one passage with exactly this many blanks.
                              </span>
                            </div>
                          ) : isOrdering ? (
                            <>
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase">
                                  Number of Activities
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={item.activityCount || 1}
                                  onChange={e => handleUpdatePlanItem(item.id, { activityCount: Math.max(1, parseInt(e.target.value) || 1) })}
                                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#026fc3] bg-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase">
                                  Sentences per Activity
                                </label>
                                <input
                                  type="number"
                                  min={2}
                                  max={20}
                                  value={item.itemsPerActivity || item.count || 5}
                                  onChange={e => {
                                    const val = Math.max(2, parseInt(e.target.value) || 2);
                                    handleUpdatePlanItem(item.id, { itemsPerActivity: val, count: val });
                                  }}
                                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#026fc3] bg-white"
                                />
                              </div>
                            </>
                          ) : (
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-500 uppercase">
                                Question Count
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={20}
                                value={item.count}
                                onChange={e => handleUpdatePlanItem(item.id, { count: Math.max(1, parseInt(e.target.value) || 1) })}
                                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#026fc3] bg-white"
                              />
                            </div>
                          )}

                          {/* 3. Difficulty */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase">Difficulty</label>
                            <select
                              value={item.difficulty}
                              onChange={e => handleUpdatePlanItem(item.id, { difficulty: e.target.value as DifficultyLevel })}
                              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#026fc3] bg-white"
                            >
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                            </select>
                          </div>

                          {/* 4. Marks / Points per Question or Activity */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase">
                              {isCloze || isOrdering ? 'Marks per Activity' : 'Marks per Question'}
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={pointsVal}
                              onChange={e => handleUpdatePlanItem(item.id, { points: Math.max(1, parseInt(e.target.value) || 1) })}
                              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#026fc3] bg-white"
                            />
                            <span className="text-[10px] text-[#026fc3] font-bold block">
                              Total: {itemTotalMarks} pts
                            </span>
                          </div>
                        </div>

                        {/* Extended Controls for Essay */}
                        {isEssay && (
                          <div className="p-3.5 rounded-xl bg-sky-50/50 border border-sky-200/70 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-[#026fc3] uppercase tracking-wider">
                                Essay Configuration & AI Evaluation
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                                Gemini + OpenAI
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase">Answer Length</label>
                                <select
                                  value={`${item.min_words || 80}-${item.max_words || 100}`}
                                  onChange={e => {
                                    const [min, max] = e.target.value.split('-').map(Number);
                                    handleUpdatePlanItem(item.id, { min_words: min, max_words: max });
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium bg-white"
                                >
                                  <option value="30-50">Short (30–50 words)</option>
                                  <option value="50-80">50–80 words</option>
                                  <option value="80-100">80–100 words (Standard)</option>
                                  <option value="100-150">100–150 words</option>
                                  <option value="150-200">120–200 words</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase">Attached Image URL (Optional)</label>
                                <input
                                  type="text"
                                  value={item.image_url || ''}
                                  onChange={e => handleUpdatePlanItem(item.id, { image_url: e.target.value })}
                                  placeholder="https://..."
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium bg-white"
                                />
                              </div>
                            </div>

                            {/* Evaluation Criteria Toggles */}
                            <div className="space-y-1 pt-1">
                              <label className="text-[10px] font-bold text-slate-600 uppercase">Evaluation Criteria</label>
                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  { id: 'content_accuracy', label: 'Content Accuracy' },
                                  { id: 'relevance', label: 'Relevance' },
                                  { id: 'completeness', label: 'Completeness' },
                                  { id: 'language', label: 'Language' },
                                  { id: 'grammar', label: 'Grammar' },
                                  { id: 'vocabulary', label: 'Vocabulary' }
                                ].map(crit => {
                                  const currentCriteria = item.evaluation_criteria || ['content_accuracy', 'relevance', 'completeness', 'language', 'grammar', 'vocabulary'];
                                  const isSelected = currentCriteria.includes(crit.id);
                                  return (
                                    <button
                                      key={crit.id}
                                      type="button"
                                      onClick={() => {
                                        const next = isSelected
                                          ? currentCriteria.filter(c => c !== crit.id)
                                          : [...currentCriteria, crit.id];
                                        handleUpdatePlanItem(item.id, { evaluation_criteria: next });
                                      }}
                                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-[#026fc3] text-white shadow-2xs'
                                          : 'bg-white text-slate-600 border border-stone-200 hover:bg-stone-100'
                                      }`}
                                    >
                                      {isSelected ? '✓ ' : '+ '}{crit.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Extended Controls for WH Questions */}
                        {item.type === 'wh_question' && (
                          <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-200/80 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black text-[#026fc3] uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                                <span>WH Comprehension Configuration</span>
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                                AI Evaluation + Semantic Grading
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase">WH Question Focus</label>
                                <select
                                  value={item.wh_type || 'mixed_wh'}
                                  onChange={e => handleUpdatePlanItem(item.id, { wh_type: e.target.value as any })}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium bg-white"
                                >
                                  <option value="mixed_wh">Mixed WH Questions (Who, What, Where, When, Why, How)</option>
                                  <option value="who">Who (People, subjects)</option>
                                  <option value="what">What (Actions, definitions, objects)</option>
                                  <option value="where">Where (Locations, origin)</option>
                                  <option value="when">When (Time, sequence)</option>
                                  <option value="why">Why (Reasons, motives)</option>
                                  <option value="how">How (Manner, process)</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase">Evaluation & Coaching</label>
                                <div className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-slate-700 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>CEFR-aware semantic scoring + language advice</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Instructions */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Instructions for this Set (Optional)</label>
                          <input
                            type="text"
                            value={item.instructions || ''}
                            onChange={e => handleUpdatePlanItem(item.id, { instructions: e.target.value })}
                            placeholder={isCloze ? 'e.g. Focus on vocabulary from paragraph 2...' : isOrdering ? 'e.g. Focus on sequence of character decisions...' : 'e.g. Focus on comprehension and key themes...'}
                            className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#026fc3] bg-white"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* General Teacher Instructions */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Overall Teacher Instructions / Pedagogical Focus (Optional)
                </label>
                <input
                  type="text"
                  value={teacherInstructions}
                  onChange={e => setTeacherInstructions(e.target.value)}
                  placeholder="e.g. Focus on comprehension, key themes, and critical thinking."
                  className="w-full p-3 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-[#026fc3] focus:outline-none bg-white"
                />
              </div>

              {/* Action Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleGeneratePrompt}
                  className="px-6 py-3 rounded-xl bg-[#026fc3] hover:bg-[#03589e] text-white text-xs font-black transition-all cursor-pointer shadow-sm flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate AI Prompt ({totalPlanActivities} Activities • {totalPlanMarks} Marks)</span>
                </button>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* TAB 2: GENERATED PROMPT PREVIEW & COPY                           */}
          {/* ---------------------------------------------------------------- */}
          {tab === 'prompt' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>AI Prompt Ready!</span>
                </p>
                <p>
                  Copy the prompt below and paste it into ChatGPT (GPT-4o), Claude 3.5 Sonnet, or Google Gemini.
                  Then paste the returned JSON into Tab 3 to validate and import into your course.
                </p>
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  rows={14}
                  value={generatedPrompt}
                  className="w-full p-4 rounded-2xl bg-slate-900 text-slate-100 text-xs font-mono border border-slate-800 focus:outline-none selection:bg-sky-500 selection:text-white"
                />
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className={`absolute top-4 right-4 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#026fc3] hover:bg-[#03589e] text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Full Prompt</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setTab('plan')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  ← Edit Question Plan
                </button>

                <button
                  type="button"
                  onClick={() => setTab('import')}
                  className="px-6 py-2.5 rounded-xl bg-[#026fc3] hover:bg-[#03589e] text-white text-xs font-black transition-all cursor-pointer shadow-xs flex items-center gap-2"
                >
                  <span>Proceed to Import JSON</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* TAB 3: PASTE, VALIDATE & IMPORT JSON                             */}
          {/* ---------------------------------------------------------------- */}
          {tab === 'import' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Paste AI Generated JSON below:
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">
                    Expected: {totalPlanActivities} activities • {totalPlanMarks} pts
                  </span>
                </div>
                <textarea
                  rows={10}
                  value={jsonInput}
                  onChange={e => setJsonInput(e.target.value)}
                  placeholder={`Paste the JSON returned by ChatGPT / Gemini here...\n{\n  "schema_version": "1.0",\n  "question_sets": [...]\n}`}
                  className="w-full p-4 rounded-2xl bg-white text-slate-900 text-xs font-mono border border-stone-200 focus:ring-2 focus:ring-[#026fc3] focus:outline-none"
                />
              </div>

              {/* Validation Action */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleValidateJson}
                  className="px-5 py-2.5 rounded-xl bg-[#026fc3] hover:bg-[#03589e] text-white text-xs font-black transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Validate JSON</span>
                </button>
              </div>

              {/* Validation Results Display */}
              {validationResult && (
                <div className={`p-5 rounded-2xl border transition-all animate-in fade-in duration-150 ${
                  validationResult.isValid
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-rose-50/70 border-rose-300'
                }`}>
                  {validationResult.isValid ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-emerald-900 font-black text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>✓ JSON VALID & READY TO IMPORT</span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white/90 border border-emerald-300/80 space-y-2 text-xs">
                        <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] pb-1 border-b border-emerald-200">
                          Question Plan Breakdown
                        </div>
                        {planItems.map(item => {
                          const isCloze = item.type === 'cloze_passage';
                          const isOrd = item.type === 'ordering';
                          const label = isCloze
                            ? `1 activity (${item.blankCount || item.count || 10} blanks)`
                            : isOrd
                            ? `${item.activityCount || 1} activit${(item.activityCount || 1) > 1 ? 'ies' : 'y'} (${item.itemsPerActivity || item.count || 5} sentences)`
                            : `${validationResult.summary.byType[item.type] || 0} / ${item.count} questions`;
                          const pts = getPlanItemTotalMarks(item);

                          return (
                            <div key={item.id} className="flex items-center justify-between font-medium text-slate-800">
                              <span>{QUESTION_TYPE_LABELS[item.type]}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-emerald-700">{label}</span>
                                <span className="text-[10px] font-bold text-slate-500">({pts} pts)</span>
                              </div>
                            </div>
                          );
                        })}
                        <div className="pt-2 border-t border-emerald-200 flex items-center justify-between font-black text-slate-900">
                          <span>Total Activities & Marks</span>
                          <span className="text-emerald-800 font-extrabold text-sm">
                            {validationResult.summary.totalActivities} Activities • {validationResult.summary.totalMarks} Points
                          </span>
                        </div>
                      </div>

                      {/* Interactive Question Preview List */}
                      {validationResult.parsedData?.question_sets && (
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between text-xs font-black text-slate-800">
                            <span>Questions Preview ({validationResult.summary.totalQuestions} Questions)</span>
                            <span className="text-emerald-700 font-bold">Ready to Import</span>
                          </div>

                          <div className="max-h-60 overflow-y-auto space-y-2 p-2 bg-slate-50/80 rounded-xl border border-stone-200">
                            {validationResult.parsedData.question_sets.flatMap((qSet: any) =>
                              (qSet.questions || []).map((q: any, qIdx: number) => {
                                const qLabel = QUESTION_TYPE_LABELS[qSet.type as QuestionType] || qSet.type;
                                const prompt = q.question || q.statement || q.sentence || 'Question';
                                const ans = q.correct_answer !== undefined ? String(q.correct_answer) : (q.expected_answer || '');
                                return (
                                  <div
                                    key={`${qSet.type}-${qIdx}`}
                                    className="p-3 rounded-lg bg-white border border-stone-200/80 text-xs space-y-1"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="px-1.5 py-0.5 rounded bg-sky-100 text-[#026fc3] font-black text-[10px] uppercase">
                                        {qLabel}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-400">
                                        {q.points || 10} pts
                                      </span>
                                    </div>
                                    <p className="font-bold text-slate-900">{prompt}</p>
                                    {ans && (
                                      <p className="text-emerald-700 font-medium text-[11px]">
                                        <span className="font-bold">Correct Answer:</span> {ans}
                                      </p>
                                    )}
                                    {q.explanation && (
                                      <p className="text-slate-500 italic text-[11px]">
                                        {q.explanation}
                                      </p>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}

                      {validationResult.warnings.length > 0 && (
                        <div className="text-xs text-amber-800 space-y-0.5 pt-1">
                          {validationResult.warnings.map((w, idx) => (
                            <p key={idx}>⚠️ {w}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-rose-900 font-black text-sm">
                        <AlertCircle className="w-5 h-5 text-rose-600" />
                        <span>JSON Validation Issues Detected</span>
                      </div>
                      <ul className="space-y-1 text-xs text-rose-800 list-disc list-inside">
                        {validationResult.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Final Import CTA */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setTab('prompt')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  ← Back to Prompt
                </button>

                <button
                  type="button"
                  disabled={!validationResult || !validationResult.isValid}
                  onClick={handleExecuteImport}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all cursor-pointer shadow-xs disabled:opacity-40 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Import Questions into Course</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
