// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: QUESTION PLANNER & AI JSON IMPORT MODAL
// Teacher-controlled question planning, prompt generation (v1.0 schema),
// untrusted JSON validation, and importing into Course Studio questions.
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
  ArrowRight,
  Code2,
  Layers
} from 'lucide-react';
import { CourseQuestion, DifficultyLevel, QuestionType } from '@/types/courseStudio';
import {
  QuestionPlan,
  QuestionPlanItem,
  QUESTION_TYPE_LABELS,
  buildAiQuestionPrompt,
  validateAiQuestionJson,
  convertValidatedJsonToCourseQuestions,
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
    { id: '1', type: 'multiple_choice', count: 5, difficulty: 'medium', instructions: '' }
  ]);
  const [videoTranscript, setVideoTranscript] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const [teacherInstructions, setTeacherInstructions] = useState('');

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

  // Calculate lesson text word count
  const wordCount = lessonText.trim() ? lessonText.trim().split(/\s+/).length : 0;
  const totalPlanQuestions = planItems.reduce((sum, item) => sum + (Number(item.count) || 0), 0);

  const handleAddPlanItem = () => {
    setPlanItems(prev => [
      ...prev,
      {
        id: `plan_${Date.now()}`,
        type: 'true_false',
        count: 3,
        difficulty: 'medium',
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
      plan
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      {/* Modal Dialog Container - Wide Landscape */}
      <div className="bg-white rounded-[24px] sm:rounded-[28px] max-w-[980px] w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header - Fixed at Top */}
        <div className="px-6 py-4 sm:px-8 bg-[#0a213c] text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center border border-sky-400/30">
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
              <p className="text-xs text-slate-400 font-medium">
                {courseTitle} • {unitTitle} • {episodeTitle}
              </p>
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
              
              {/* Question Sources Summary Box */}
              <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200/80 space-y-2">
                <p className="text-[11px] font-black text-[#026fc3] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Question Generation Sources</span>
                </p>
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
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Question Sets ({planItems.length}) • Total Questions: {totalPlanQuestions}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddPlanItem}
                    className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#026fc3] border border-sky-200 text-xs font-black flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Question Set</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {planItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                        <span className="text-xs font-black text-slate-800">
                          Set #{index + 1}
                        </span>
                        {planItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePlanItem(item.id)}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                            title="Remove set"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Question Type */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Type</label>
                          <select
                            value={item.type}
                            onChange={e => handleUpdatePlanItem(item.id, { type: e.target.value as QuestionType })}
                            className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#026fc3] bg-white"
                          >
                            <option value="multiple_choice">Multiple Choice (A,B,C,D)</option>
                            <option value="true_false">True / False</option>
                            <option value="fill_blank">Fill in the Blank</option>
                            <option value="matching">Matching Pairs</option>
                            <option value="ordering">Ordering Sequence</option>
                            <option value="short_answer">Short Answer</option>
                          </select>
                        </div>

                        {/* Question Count */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Count</label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={item.count}
                            onChange={e => handleUpdatePlanItem(item.id, { count: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#026fc3] bg-white"
                          />
                        </div>

                        {/* Difficulty */}
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
                      </div>

                      {/* Instructions */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Instructions for this Set (Optional)</label>
                        <input
                          type="text"
                          value={item.instructions || ''}
                          onChange={e => handleUpdatePlanItem(item.id, { instructions: e.target.value })}
                          placeholder="e.g. Focus on vocabulary and character motivation..."
                          className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#026fc3] bg-white"
                        />
                      </div>
                    </div>
                  ))}
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#026fc3] bg-white"
                />
              </div>

            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* TAB 2: GENERATED AI PROMPT                                       */}
          {/* ---------------------------------------------------------------- */}
          {tab === 'prompt' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-black text-amber-900">
                    How to use this AI Prompt:
                  </p>
                  <p className="text-xs text-amber-800 font-medium">
                    1. Click <strong>[Copy Prompt]</strong> below. <br />
                    2. Paste it into <strong>ChatGPT, Claude, Gemini</strong>, or your preferred LLM. <br />
                    3. Copy the returned JSON and paste it into the <strong>Validate & Import JSON</strong> tab.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Prompt'}</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Formatted Prompt (EdTechra Question Schema v1.0)
                </label>
                <textarea
                  readOnly
                  rows={14}
                  value={generatedPrompt}
                  className="w-full p-4 rounded-2xl bg-slate-900 text-sky-200 text-xs font-mono border border-slate-800 leading-relaxed select-all"
                />
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
                    Expected: {totalPlanQuestions} questions
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
                        {planItems.map(item => (
                          <div key={item.id} className="flex items-center justify-between font-medium text-slate-800">
                            <span>{QUESTION_TYPE_LABELS[item.type]}</span>
                            <span className="font-bold text-emerald-700">
                              {validationResult.summary.byType[item.type] || 0} / {item.count}
                            </span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-emerald-200 flex items-center justify-between font-black text-slate-900">
                          <span>Total Questions</span>
                          <span className="text-emerald-800 font-extrabold text-sm">{validationResult.summary.totalQuestions}</span>
                        </div>
                      </div>

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
                      <ul className="list-disc pl-5 space-y-1 text-xs font-semibold text-rose-800">
                        {validationResult.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions - Fixed at Bottom */}
        <div className="px-6 py-4 sm:px-8 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-slate-700 text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            {tab === 'plan' && (
              <button
                type="button"
                onClick={handleGeneratePrompt}
                className="px-6 py-2.5 rounded-xl bg-[#026fc3] hover:bg-[#03589e] text-white text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Generate AI Prompt</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {tab === 'prompt' && (
              <button
                type="button"
                onClick={() => setTab('import')}
                className="px-6 py-2.5 rounded-xl bg-[#026fc3] hover:bg-[#03589e] text-white text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Paste & Validate JSON</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {tab === 'import' && (
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={!validationResult?.isValid}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Import into Lesson</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
