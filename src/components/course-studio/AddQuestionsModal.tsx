// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: ADD QUESTIONS WORKFLOW MODAL
// Multi-Step Question Builder Workflow (Parts 7–15)
// Step 1: Select Question Types & Quantities (Categories A to H)
// Step 2: AI Prompt Generation with lesson context & 1-click copy
// Step 3: Paste AI JSON, strict schema validation, line-numbered errors & import
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Minus,
  Plus
} from 'lucide-react';
import {
  CourseQuestion,
  DifficultyLevel,
  QuestionType,
  WhType
} from '@/types/courseStudio';
import {
  QuestionPlan,
  QuestionPlanItem,
  QUESTION_CATEGORIES,
  QUESTION_TYPE_LABELS,
  isQuestionTypeImplemented,
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
  hasVideo?: boolean;
  hasImage?: boolean;
  onImportQuestions: (questions: CourseQuestion[]) => void;
}

interface SelectedTypeConfig {
  selected: boolean;
  count: number;
  difficulty: DifficultyLevel;
  points: number;
  // Type-specific configs
  wh_type?: WhType;
  blankCount?: number;
  itemsPerActivity?: number;
  activityCount?: number;
}

// Initial defaults for all question types across Categories A-H
const DEFAULT_TYPE_CONFIGS: Partial<Record<QuestionType, SelectedTypeConfig>> = {
  // Category A
  multiple_choice: { selected: true, count: 5, difficulty: 'medium', points: 10 },
  multiple_select: { selected: false, count: 3, difficulty: 'medium', points: 10 },
  // Category B
  true_false: { selected: false, count: 3, difficulty: 'medium', points: 10 },
  yes_no: { selected: false, count: 3, difficulty: 'medium', points: 10 },
  // Category C
  fill_blank: { selected: false, count: 3, difficulty: 'medium', points: 10 },
  multiple_fill_blanks: { selected: false, count: 2, difficulty: 'medium', points: 10 },
  cloze_passage: { selected: false, count: 1, blankCount: 10, difficulty: 'medium', points: 20 },
  // Category D
  matching: { selected: false, count: 1, difficulty: 'medium', points: 10 },
  matching_pairs: { selected: false, count: 1, difficulty: 'medium', points: 10 },
  drag_drop_matching: { selected: false, count: 1, difficulty: 'medium', points: 10 },
  categorisation: { selected: false, count: 1, difficulty: 'medium', points: 10 },
  // Category E
  ordering: { selected: false, count: 1, itemsPerActivity: 5, activityCount: 1, difficulty: 'medium', points: 10 },
  sentence_builder: { selected: false, count: 2, difficulty: 'medium', points: 10 },
  sentence_reordering: { selected: false, count: 2, difficulty: 'medium', points: 10 },
  word_ordering: { selected: false, count: 2, difficulty: 'medium', points: 10 },
  story_sequence: { selected: false, count: 1, difficulty: 'medium', points: 10 },
  // Category F
  odd_one_out: { selected: false, count: 3, difficulty: 'medium', points: 10 },
  image_selection: { selected: false, count: 2, difficulty: 'medium', points: 10 },
  dropdown_selection: { selected: false, count: 2, difficulty: 'medium', points: 10 },
  drag_to_complete: { selected: false, count: 2, difficulty: 'medium', points: 10 },
  // Category G
  wh_question: { selected: false, count: 5, wh_type: 'mixed_wh', difficulty: 'medium', points: 10 },
  short_answer: { selected: false, count: 3, difficulty: 'medium', points: 10 },
  comprehension: { selected: false, count: 2, difficulty: 'medium', points: 10 },
  // Category H
  essay: { selected: false, count: 1, difficulty: 'medium', points: 20 },
  speaking: { selected: false, count: 1, difficulty: 'medium', points: 15 },
  grammar_correction: { selected: false, count: 3, difficulty: 'medium', points: 10 },
  word_choice: { selected: false, count: 3, difficulty: 'medium', points: 10 }
};

export const AddQuestionsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  courseTitle,
  unitTitle,
  episodeTitle,
  episodeId,
  courseId,
  lessonText,
  onImportQuestions
}) => {
  const [step, setStep] = useState<'select' | 'prompt' | 'import'>('select');

  // Question configurations by type
  const [typeConfigs, setTypeConfigs] = useState<Record<string, SelectedTypeConfig>>(() => {
    return { ...DEFAULT_TYPE_CONFIGS } as Record<string, SelectedTypeConfig>;
  });

  // Global settings
  const [cefrLevel, setCefrLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>('A1');
  const [teacherInstructions, setTeacherInstructions] = useState('');
  const [videoTranscript] = useState('');
  const [imageDescription] = useState('');

  // Step 2: Prompt state
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  // Step 3: Paste and Validate state
  const [jsonInput, setJsonInput] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setValidationResult(null);
      setCopied(false);
    }
  }, [isOpen]);

  // Total selected question items count
  const { totalSelectedQuestions, totalSelectedTypes, totalSelectedPoints } = useMemo(() => {
    let qCount = 0;
    let tCount = 0;
    let pCount = 0;

    Object.entries(typeConfigs).forEach(([typeKey, cfg]) => {
      if (cfg.selected) {
        tCount++;
        const count = typeKey === 'cloze_passage' ? 1 : cfg.count;
        qCount += count;
        pCount += count * (cfg.points || 10);
      }
    });

    return {
      totalSelectedQuestions: qCount,
      totalSelectedTypes: tCount,
      totalSelectedPoints: pCount
    };
  }, [typeConfigs]);

  if (!isOpen) return null;

  // Toggle selection for a question type
  const toggleTypeSelected = (type: QuestionType) => {
    if (!isQuestionTypeImplemented(type)) return;
    setTypeConfigs(prev => {
      const current = prev[type] || { selected: false, count: 3, difficulty: 'medium', points: 10 };
      return {
        ...prev,
        [type]: {
          ...current,
          selected: !current.selected
        }
      };
    });
  };

  // Adjust count with bounds check (min 1, max 20)
  const adjustTypeCount = (type: QuestionType, delta: number, min = 1, max = 20) => {
    setTypeConfigs(prev => {
      const current = prev[type] || { selected: true, count: 3, difficulty: 'medium', points: 10 };
      const nextCount = Math.max(min, Math.min(max, (current.count || 1) + delta));
      return {
        ...prev,
        [type]: {
          ...current,
          count: nextCount
        }
      };
    });
  };

  // Adjust cloze blank count (min 2, max 20)
  const adjustClozeBlanks = (delta: number) => {
    setTypeConfigs(prev => {
      const current = prev.cloze_passage || { selected: true, count: 1, blankCount: 10, difficulty: 'medium', points: 20 };
      const nextBlanks = Math.max(2, Math.min(20, (current.blankCount || 10) + delta));
      return {
        ...prev,
        cloze_passage: {
          ...current,
          blankCount: nextBlanks
        }
      };
    });
  };

  // Update specific field on a type config
  const updateTypeField = (type: QuestionType, field: keyof SelectedTypeConfig, value: any) => {
    setTypeConfigs(prev => {
      const current = prev[type] || { selected: true, count: 3, difficulty: 'medium', points: 10 };
      return {
        ...prev,
        [type]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  // Build the QuestionPlan object based on teacher's selections
  const constructPlan = (): QuestionPlan => {
    const items: QuestionPlanItem[] = [];

    Object.entries(typeConfigs).forEach(([typeKey, cfg]) => {
      if (cfg.selected) {
        const qType = typeKey as QuestionType;
        const item: QuestionPlanItem = {
          id: `plan_${qType}_${Date.now()}`,
          type: qType,
          count: cfg.count,
          difficulty: cfg.difficulty || 'medium',
          points: cfg.points || (qType === 'essay' || qType === 'cloze_passage' ? 20 : 10)
        };

        if (qType === 'cloze_passage') {
          item.blankCount = cfg.blankCount || 10;
        } else if (qType === 'wh_question') {
          item.wh_type = cfg.wh_type || 'mixed_wh';
        } else if (qType === 'ordering') {
          item.activityCount = cfg.activityCount || 1;
          item.itemsPerActivity = cfg.itemsPerActivity || 5;
        }

        items.push(item);
      }
    });

    return {
      items,
      cefr_level: cefrLevel,
      video_transcript: videoTranscript,
      image_description: imageDescription,
      teacher_instructions: teacherInstructions
    };
  };

  // Step 1 -> Step 2: Generate AI Prompt
  const handleProceedToPrompt = () => {
    if (totalSelectedQuestions === 0) return;

    const plan = constructPlan();
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
    setStep('prompt');
  };

  // Copy Prompt to Clipboard
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = generatedPrompt;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Step 3: Validate Pasted JSON
  const handleValidateJson = () => {
    const plan = constructPlan();
    const result = validateAiQuestionJson(jsonInput, plan);
    setValidationResult(result);
  };

  // Step 3: Execute Import into Course Questions
  const handleExecuteImport = () => {
    if (!validationResult || !validationResult.isValid || !validationResult.parsedData) return;

    const importedQuestions = convertValidatedJsonToCourseQuestions(
      validationResult.parsedData,
      episodeId,
      courseId
    );

    onImportQuestions(importedQuestions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      {/* Modal Dialog Window */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border border-stone-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* =================================================================== */}
        {/* MODAL HEADER                                                        */}
        {/* =================================================================== */}
        <div className="px-6 py-4 bg-[#0a213c] text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#026fc3]/30 text-sky-300 flex items-center justify-center border border-sky-400/30 shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase">
                  ADD QUESTIONS
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-200 text-[10px] font-black uppercase tracking-wider border border-sky-400/20">
                  AI Question Builder
                </span>
              </div>
              <div className="flex items-center gap-2 pt-0.5 text-xs text-slate-400 font-medium">
                <span className="truncate max-w-xs">{episodeTitle || 'Lesson'}</span>
                <span>•</span>
                <span className="text-sky-300 font-bold">{totalSelectedQuestions} Questions ({totalSelectedTypes} Types)</span>
                <span>•</span>
                <span className="text-emerald-300 font-bold">{totalSelectedPoints} Marks</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* =================================================================== */}
        {/* 3-STEP WIZARD PROGRESS TABS                                         */}
        {/* =================================================================== */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {/* Step 1 Tab */}
            <button
              type="button"
              onClick={() => setStep('select')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                step === 'select'
                  ? 'bg-white dark:bg-slate-800 text-[#026fc3] shadow-xs border border-stone-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-[#026fc3] text-white text-[10px] flex items-center justify-center">1</span>
              <span>Select Types & Counts</span>
            </button>

            <span className="text-stone-300 dark:text-slate-700">→</span>

            {/* Step 2 Tab */}
            <button
              type="button"
              onClick={() => {
                if (!generatedPrompt) handleProceedToPrompt();
                else setStep('prompt');
              }}
              disabled={totalSelectedQuestions === 0}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                step === 'prompt'
                  ? 'bg-white dark:bg-slate-800 text-[#026fc3] shadow-xs border border-stone-200 dark:border-slate-700'
                  : totalSelectedQuestions === 0
                  ? 'text-stone-300 dark:text-slate-700 cursor-not-allowed'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-400 text-white text-[10px] flex items-center justify-center">2</span>
              <span>Generate AI Prompt</span>
            </button>

            <span className="text-stone-300 dark:text-slate-700">→</span>

            {/* Step 3 Tab */}
            <button
              type="button"
              onClick={() => setStep('import')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                step === 'import'
                  ? 'bg-white dark:bg-slate-800 text-[#026fc3] shadow-xs border border-stone-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-400 text-white text-[10px] flex items-center justify-center">3</span>
              <span>Paste & Validate AI JSON</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <span>CEFR Level:</span>
            <select
              value={cefrLevel}
              onChange={e => setCefrLevel(e.target.value as any)}
              className="px-2 py-0.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="A1">A1 (Beginner)</option>
              <option value="A2">A2 (Elementary)</option>
              <option value="B1">B1 (Intermediate)</option>
              <option value="B2">B2 (Upper Int)</option>
              <option value="C1">C1 (Advanced)</option>
              <option value="C2">C2 (Proficiency)</option>
            </select>
          </div>
        </div>

        {/* =================================================================== */}
        {/* STEP 1: CATEGORY & QUESTION SELECTION (A to H)                      */}
        {/* =================================================================== */}
        {step === 'select' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            <div className="bg-sky-50 dark:bg-sky-950/40 p-4 rounded-2xl border border-sky-200 dark:border-sky-900/60 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[#026fc3] shrink-0 mt-0.5" />
              <div className="text-xs text-sky-950 dark:text-sky-200 leading-relaxed">
                <span className="font-bold">Authoring Guidance:</span> Select which question types you want to generate. Adjust counts with the <span className="font-bold">[-]</span> and <span className="font-bold">[+]</span> buttons. Implemented types are ready for automated grading; Coming Soon types are reserved for future modules.
              </div>
            </div>

            {/* CATEGORIES A TO H */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {QUESTION_CATEGORIES.map(category => (
                <div
                  key={category.id}
                  className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-900/50 p-4 space-y-3"
                >
                  {/* Category Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#026fc3] text-white text-xs font-black flex items-center justify-center shrink-0">
                        {category.code}
                      </span>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {category.name}
                        </h3>
                        <p className="text-[10px] text-slate-500 line-clamp-1">
                          {category.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Question Types within this Category */}
                  <div className="space-y-2.5">
                    {category.types.map(type => {
                      const isImplemented = isQuestionTypeImplemented(type);
                      const cfg = typeConfigs[type] || { selected: false, count: 3, difficulty: 'medium', points: 10 };
                      const isChecked = isImplemented && cfg.selected;
                      const label = QUESTION_TYPE_LABELS[type] || type;

                      return (
                        <div
                          key={type}
                          className={`p-2.5 rounded-xl border transition-all ${
                            !isImplemented
                              ? 'bg-stone-100/60 dark:bg-slate-800/40 border-stone-200/60 dark:border-slate-800/60 opacity-60 cursor-not-allowed'
                              : isChecked
                              ? 'bg-white dark:bg-slate-800 border-[#026fc3] shadow-xs ring-1 ring-[#026fc3]/20'
                              : 'bg-white dark:bg-slate-800/80 border-stone-200 dark:border-slate-700 hover:border-stone-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            {/* Left: Checkbox & Type Name */}
                            <label className={`flex items-center gap-2.5 select-none ${isImplemented ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={!isImplemented}
                                onChange={() => toggleTypeSelected(type)}
                                className="w-4 h-4 rounded text-[#026fc3] focus:ring-[#026fc3] cursor-pointer disabled:cursor-not-allowed"
                              />
                              <span className={`text-xs font-bold ${isChecked ? 'text-[#026fc3]' : 'text-slate-800 dark:text-slate-200'}`}>
                                {label}
                              </span>
                            </label>

                            {/* Right: Implemented vs Coming Soon Badge & Count Selector */}
                            <div className="flex items-center gap-2">
                              {!isImplemented ? (
                                <span className="px-2 py-0.5 rounded-md bg-stone-200 dark:bg-slate-700 text-stone-600 dark:text-slate-400 text-[10px] font-bold">
                                  Coming Soon
                                </span>
                              ) : (
                                <>
                                  {isChecked && (
                                    <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-slate-700/60 px-2 py-1 rounded-lg border border-stone-200 dark:border-slate-600">
                                      <button
                                        type="button"
                                        onClick={() => adjustTypeCount(type, -1)}
                                        disabled={cfg.count <= 1}
                                        className="w-5 h-5 rounded flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                                        title="Decrease count"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="text-xs font-black min-w-[20px] text-center text-slate-900 dark:text-slate-100">
                                        {cfg.count}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => adjustTypeCount(type, 1)}
                                        disabled={cfg.count >= 20}
                                        className="w-5 h-5 rounded flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                                        title="Increase count"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[9px] font-black uppercase">
                                    Active
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Extra Configurations for Specific Implemented Types */}
                          {isChecked && type === 'wh_question' && (
                            <div className="mt-2 pt-2 border-t border-stone-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                              <span className="text-slate-500 font-medium">Question Variety:</span>
                              <select
                                value={cfg.wh_type || 'mixed_wh'}
                                onChange={e => updateTypeField('wh_question', 'wh_type', e.target.value)}
                                className="px-2 py-0.5 rounded border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
                              >
                                <option value="mixed_wh">Mixed WH (Who/What/Where/When/Why/How)</option>
                                <option value="who">Who Questions</option>
                                <option value="what">What Questions</option>
                                <option value="where">Where Questions</option>
                                <option value="when">When Questions</option>
                                <option value="why">Why Questions</option>
                                <option value="how">How Questions</option>
                              </select>
                            </div>
                          )}

                          {isChecked && type === 'cloze_passage' && (
                            <div className="mt-2 pt-2 border-t border-stone-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                              <span className="text-slate-500 font-medium">Number of blanks in passage:</span>
                              <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-slate-700/60 px-2 py-0.5 rounded border border-stone-200 dark:border-slate-600">
                                <button
                                  type="button"
                                  onClick={() => adjustClozeBlanks(-1)}
                                  disabled={(cfg.blankCount || 10) <= 2}
                                  className="w-4 h-4 rounded flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-600 disabled:opacity-30 cursor-pointer"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <span className="text-xs font-black min-w-[20px] text-center text-slate-900 dark:text-slate-100">
                                  {cfg.blankCount || 10} blanks
                                </span>
                                <button
                                  type="button"
                                  onClick={() => adjustClozeBlanks(1)}
                                  disabled={(cfg.blankCount || 10) >= 20}
                                  className="w-4 h-4 rounded flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-600 disabled:opacity-30 cursor-pointer"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Optional Teacher Guidance */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <span>Optional Teacher Instructions for AI</span>
                <span className="text-[10px] text-slate-400 font-normal">(e.g. Focus on dialogue comprehension, avoid tricky distractors)</span>
              </label>
              <textarea
                rows={2}
                value={teacherInstructions}
                onChange={e => setTeacherInstructions(e.target.value)}
                placeholder="Add any specific context or focus areas for the AI..."
                className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 2: GENERATED AI PROMPT                                         */}
        {/* =================================================================== */}
        {step === 'prompt' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 dark:text-emerald-200 space-y-1">
                  <p className="font-bold">AI Prompt Ready!</p>
                  <p>
                    1. Click <span className="font-bold underline">Copy Prompt</span> below.<br />
                    2. Paste into ChatGPT, Claude, Gemini, or DeepSeek.<br />
                    3. Copy the generated JSON response from your AI model and proceed to Step 3.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyPrompt}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#026fc3] hover:bg-[#025da4] text-white'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Prompt'}</span>
              </button>
            </div>

            {/* Formatted Code Block displaying the generated prompt */}
            <div className="relative">
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 text-slate-300 text-[11px] rounded-t-xl font-mono">
                <span>EdTechra Assessment Prompt v1.0</span>
                <span>{generatedPrompt.length} characters</span>
              </div>
              <pre className="p-4 bg-slate-900 text-slate-100 text-xs font-mono rounded-b-xl overflow-x-auto max-h-[380px] overflow-y-auto whitespace-pre-wrap leading-relaxed border border-slate-800">
                {generatedPrompt}
              </pre>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 3: PASTE & VALIDATE AI JSON                                    */}
        {/* =================================================================== */}
        {step === 'import' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Paste AI JSON Output Below:
                </label>
                <button
                  type="button"
                  onClick={handleValidateJson}
                  disabled={!jsonInput.trim()}
                  className="px-3 py-1 bg-[#026fc3] hover:bg-[#025da4] disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Validate JSON
                </button>
              </div>

              <textarea
                rows={9}
                value={jsonInput}
                onChange={e => {
                  setJsonInput(e.target.value);
                  if (validationResult) setValidationResult(null);
                }}
                placeholder="Paste the full JSON output from your AI model here (e.g. { 'schema_version': '1.0', 'question_sets': [...] })..."
                className="w-full p-3 font-mono text-xs rounded-xl border border-stone-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 leading-relaxed focus:ring-2 focus:ring-[#026fc3] focus:outline-none"
              />
            </div>

            {/* Validation Feedback Display */}
            {validationResult && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {/* Error Card */}
                {!validationResult.isValid && (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Validation Failed ({validationResult.errors.length} error{validationResult.errors.length > 1 ? 's' : ''}):</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-rose-800 dark:text-rose-200 font-mono text-[11px]">
                      {validationResult.errors.map((err, idx) => (
                        <li key={idx} className="leading-snug">{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Success Card */}
                {validationResult.isValid && (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>✓ Valid JSON Schema v1.0 — {validationResult.summary.totalQuestions} questions detected</span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                        {validationResult.summary.totalMarks} Total Marks
                      </span>
                    </div>

                    {/* Breakdown Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {Object.entries(validationResult.summary.byType).map(([t, count]) => (
                        <span
                          key={t}
                          className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 text-[11px] font-bold"
                        >
                          {count} {QUESTION_TYPE_LABELS[t as QuestionType] || t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* MODAL FOOTER & NAVIGATION ACTIONS                                   */}
        {/* =================================================================== */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-stone-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            {step === 'select' ? (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-stone-200/60 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep(step === 'import' ? 'prompt' : 'select')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step === 'select' && (
              <button
                type="button"
                onClick={handleProceedToPrompt}
                disabled={totalSelectedQuestions === 0}
                className="px-5 py-2.5 rounded-xl bg-[#026fc3] hover:bg-[#025da4] disabled:opacity-40 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Next: Generate AI Prompt ({totalSelectedQuestions})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 'prompt' && (
              <button
                type="button"
                onClick={() => setStep('import')}
                className="px-5 py-2.5 rounded-xl bg-[#026fc3] hover:bg-[#025da4] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Next: Paste AI JSON</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 'import' && (
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={!validationResult?.isValid}
                className="px-6 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] disabled:opacity-40 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                <span>Import {validationResult?.summary.totalQuestions || 0} Questions into Lesson</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
