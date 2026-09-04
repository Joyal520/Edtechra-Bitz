// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: FULL-SCREEN AI QUESTION BUILDER WORKSPACE
// Full-Screen Workspace (100% viewport, Dark Blue EdTechra Visual Language)
// Step 1: Category & Question Type Workspace (A through I), Custom Checkboxes,
//         Count Selectors, and Sticky Live Selection Summary
// Step 2: AI Prompt Ready with 1-Click Copy and actual lesson context
// Step 3: Paste AI JSON with human-readable error reporting and 1-click import
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
  QuestionType,
  WhType
} from '@/types/courseStudio';
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
  onImportQuestions: (questions: CourseQuestion[]) => void;
}

interface QuestionTypeDefinition {
  id: string;
  label: string;
  type: QuestionType;
  defaultCount: number;
  isComingSoon?: boolean;
  maxCount?: number;
  points?: number;
  wh_type?: WhType;
}

interface QuestionCategoryDef {
  code: string; // 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'
  title: string;
  description: string;
  items: QuestionTypeDefinition[];
}

// Full Category Workspace Definitions matching Section 5 (A through I)
const WORKSPACE_CATEGORIES: QuestionCategoryDef[] = [
  {
    code: 'A',
    title: 'MULTIPLE CHOICE & SELECTION',
    description: 'Single and multiple selection objective items with distractors',
    items: [
      { id: 'mcq_single', label: 'Multiple Choice', type: 'multiple_choice', defaultCount: 5, points: 10 },
      { id: 'mcq_multi', label: 'Multiple Select', type: 'multiple_select', defaultCount: 3, points: 10 }
    ]
  },
  {
    code: 'B',
    title: 'TRUE / FALSE & BINARY',
    description: 'Factual verification and binary judgment statements',
    items: [
      { id: 'tf_standard', label: 'True / False', type: 'true_false', defaultCount: 3, points: 10 },
      { id: 'tf_yesno', label: 'Yes / No', type: 'yes_no', defaultCount: 2, points: 10 }
    ]
  },
  {
    code: 'C',
    title: 'FILL IN THE BLANK & CLOZE',
    description: 'Single blank, multi-blank, and embedded cloze reading passages',
    items: [
      { id: 'fill_single', label: 'Fill in the Blank', type: 'fill_blank', defaultCount: 5, points: 10 },
      { id: 'fill_multi', label: 'Multiple Fill in the Blanks', type: 'multiple_fill_blanks', defaultCount: 3, points: 10 },
      { id: 'cloze_passage', label: 'Cloze Passage', type: 'cloze_passage', defaultCount: 1, points: 20 }
    ]
  },
  {
    code: 'D',
    title: 'READING COMPREHENSION',
    description: 'Text-anchored WH comprehension, short answers, and passage inference',
    items: [
      { id: 'wh_general', label: 'WH Questions', type: 'wh_question', defaultCount: 5, wh_type: 'mixed_wh', points: 10 },
      { id: 'short_ans', label: 'Short Answer', type: 'short_answer', defaultCount: 3, points: 10 },
      { id: 'comp_main_idea', label: 'Main Idea', type: 'comprehension', defaultCount: 2, points: 10 },
      { id: 'comp_detail', label: 'Detail Questions', type: 'comprehension', defaultCount: 3, points: 10 },
      { id: 'comp_vocab', label: 'Vocabulary in Context', type: 'comprehension', defaultCount: 3, points: 10 }
    ]
  },
  {
    code: 'E',
    title: 'ORDERING & SEQUENCING',
    description: 'Chronological timeline, sentence reconstruction, and sequence events',
    items: [
      { id: 'ord_seq', label: 'Ordering Sequence', type: 'ordering', defaultCount: 2, maxCount: 10, points: 10 },
      { id: 'sent_builder', label: 'Sentence Builder', type: 'sentence_builder', defaultCount: 3, maxCount: 10, points: 10 },
      { id: 'sent_reorder', label: 'Sentence Reordering', type: 'sentence_reordering', defaultCount: 3, maxCount: 10, points: 10 }
    ]
  },
  {
    code: 'F',
    title: 'IDENTIFICATION & ODD ONE OUT',
    description: 'Odd item elimination, visual cues, and contextual dropdowns',
    items: [
      { id: 'odd_out', label: 'Odd One Out', type: 'odd_one_out', defaultCount: 3, isComingSoon: true, points: 10 },
      { id: 'img_select', label: 'Image Selection', type: 'image_selection', defaultCount: 2, isComingSoon: true, points: 10 },
      { id: 'drop_select', label: 'Dropdown Selection', type: 'dropdown_selection', defaultCount: 2, isComingSoon: true, points: 10 }
    ]
  },
  {
    code: 'G',
    title: 'GRAMMAR',
    description: 'Grammar choice, sentence completion, and error detection',
    items: [
      { id: 'gram_choice', label: 'Grammar Choice', type: 'word_choice', defaultCount: 5, points: 10 },
      { id: 'gram_completion', label: 'Sentence Completion', type: 'fill_blank', defaultCount: 5, points: 10 },
      { id: 'gram_error', label: 'Error Correction', type: 'grammar_correction', defaultCount: 3, points: 10 }
    ]
  },
  {
    code: 'H',
    title: 'WRITING & SPEAKING',
    description: 'Descriptive paragraphs, speaking responses, and guided role-plays',
    items: [
      { id: 'write_short', label: 'Short Writing', type: 'short_answer', defaultCount: 2, points: 10 },
      { id: 'write_paragraph', label: 'Paragraph Writing', type: 'essay', defaultCount: 1, maxCount: 5, points: 20 },
      { id: 'speak_prompt', label: 'Speaking Prompt', type: 'speaking', defaultCount: 2, maxCount: 5, points: 15 },
      { id: 'speak_roleplay', label: 'Role Play', type: 'speaking', defaultCount: 1, maxCount: 5, points: 15 }
    ]
  },
  {
    code: 'I',
    title: 'LISTENING',
    description: 'Audio-anchored listening comprehension and concept association',
    items: [
      { id: 'listen_comp', label: 'Listening Comprehension', type: 'comprehension', defaultCount: 5, points: 10 },
      { id: 'match_pairs', label: 'Matching Pairs', type: 'matching', defaultCount: 2, maxCount: 10, points: 10 }
    ]
  }
];

interface SelectedItemState {
  selected: boolean;
  count: number;
  wh_type?: WhType;
  blankCount?: number;
}

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

  // Selection states keyed by item ID
  const [itemSelections, setItemSelections] = useState<Record<string, SelectedItemState>>(() => {
    const initial: Record<string, SelectedItemState> = {};
    WORKSPACE_CATEGORIES.forEach(cat => {
      cat.items.forEach(item => {
        // Default: Multiple Choice in Category A selected by default
        initial[item.id] = {
          selected: item.id === 'mcq_single',
          count: item.defaultCount,
          wh_type: item.wh_type || 'mixed_wh',
          blankCount: item.type === 'cloze_passage' ? 10 : undefined
        };
      });
    });
    return initial;
  });

  // Global assessment settings
  const [cefrLevel, setCefrLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>('A1');
  const [teacherInstructions, setTeacherInstructions] = useState('');

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

  // Handle Escape key navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Selection Metrics Summary
  const { totalSelectedQuestions, totalSelectedTypes, totalSelectedPoints, selectedItemsSummary } = useMemo(() => {
    let qCount = 0;
    let tCount = 0;
    let pCount = 0;
    const summaryList: { id: string; label: string; count: number; points: number }[] = [];

    WORKSPACE_CATEGORIES.forEach(cat => {
      cat.items.forEach(item => {
        const state = itemSelections[item.id];
        if (state && state.selected && !item.isComingSoon) {
          tCount++;
          const c = item.type === 'cloze_passage' ? 1 : state.count;
          const pts = c * (item.points || 10);
          qCount += c;
          pCount += pts;
          summaryList.push({
            id: item.id,
            label: item.label,
            count: c,
            points: pts
          });
        }
      });
    });

    return {
      totalSelectedQuestions: qCount,
      totalSelectedTypes: tCount,
      totalSelectedPoints: pCount,
      selectedItemsSummary: summaryList
    };
  }, [itemSelections]);

  if (!isOpen) return null;

  // Toggle item selection
  const toggleItem = (itemId: string, isComingSoon?: boolean) => {
    if (isComingSoon) return;
    setItemSelections(prev => {
      const curr = prev[itemId] || { selected: false, count: 3 };
      return {
        ...prev,
        [itemId]: {
          ...curr,
          selected: !curr.selected
        }
      };
    });
  };

  // Adjust count
  const adjustCount = (itemId: string, delta: number, min = 1, max = 20) => {
    setItemSelections(prev => {
      const curr = prev[itemId] || { selected: true, count: 3 };
      const nextVal = Math.max(min, Math.min(max, curr.count + delta));
      return {
        ...prev,
        [itemId]: {
          ...curr,
          count: nextVal
        }
      };
    });
  };

  // Adjust Cloze blanks count
  const adjustClozeBlanks = (itemId: string, delta: number) => {
    setItemSelections(prev => {
      const curr = prev[itemId] || { selected: true, count: 1, blankCount: 10 };
      const nextBlanks = Math.max(2, Math.min(20, (curr.blankCount || 10) + delta));
      return {
        ...prev,
        [itemId]: {
          ...curr,
          blankCount: nextBlanks
        }
      };
    });
  };

  // Update WH type
  const updateWhType = (itemId: string, whType: WhType) => {
    setItemSelections(prev => {
      const curr = prev[itemId] || { selected: true, count: 5 };
      return {
        ...prev,
        [itemId]: {
          ...curr,
          wh_type: whType
        }
      };
    });
  };

  // Build the QuestionPlan object for prompt & validation
  const constructPlan = (): QuestionPlan => {
    const items: QuestionPlanItem[] = [];

    WORKSPACE_CATEGORIES.forEach(cat => {
      cat.items.forEach(item => {
        const state = itemSelections[item.id];
        if (state && state.selected && !item.isComingSoon) {
          const planItem: QuestionPlanItem = {
            id: `plan_${item.id}_${Date.now()}`,
            type: item.type,
            count: state.count,
            difficulty: 'medium',
            points: item.points || (item.type === 'essay' || item.type === 'cloze_passage' ? 20 : 10),
            instructions: item.label !== QUESTION_TYPE_LABELS[item.type] ? `Focus: ${item.label}` : undefined
          };

          if (item.type === 'cloze_passage') {
            planItem.blankCount = state.blankCount || 10;
          } else if (item.type === 'wh_question') {
            planItem.wh_type = state.wh_type || 'mixed_wh';
          } else if (item.type === 'ordering') {
            planItem.activityCount = state.count;
            planItem.itemsPerActivity = 5;
          }

          items.push(planItem);
        }
      });
    });

    return {
      items,
      cefr_level: cefrLevel,
      teacher_instructions: teacherInstructions
    };
  };

  // Step 1 -> Step 2: Generate Prompt
  const handleProceedToPrompt = () => {
    if (totalSelectedQuestions === 0) return;

    const plan = constructPlan();
    const promptText = buildAiQuestionPrompt({
      courseTitle,
      unitTitle,
      episodeTitle,
      lessonText,
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
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = generatedPrompt;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Step 3: Validate JSON
  const handleValidateJson = () => {
    const plan = constructPlan();
    const result = validateAiQuestionJson(jsonInput, plan);
    setValidationResult(result);
  };

  // Step 3: Execute Import
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
    <div className="fixed inset-0 z-50 bg-[#071322] text-white flex flex-col w-screen h-screen overflow-hidden antialiased select-none-desktop">
      
      {/* =================================================================== */}
      {/* 1. FULL-SCREEN PREMIUM WORKSPACE HEADER (FIXED TOP)                 */}
      {/* =================================================================== */}
      <header className="px-5 sm:px-8 py-3.5 bg-[#06101e] border-b border-[#142c4c] flex items-center justify-between shrink-0 z-20 shadow-md">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-2xl bg-[#026fc3]/25 text-sky-300 flex items-center justify-center border border-sky-400/30 shadow-inner">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                AI QUESTION BUILDER
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#026fc3]/20 text-sky-200 text-[10px] font-black uppercase tracking-wider border border-[#026fc3]/30">
                AI Assessment Workspace
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-slate-400 font-medium">
              <span className="text-slate-200 font-bold uppercase tracking-wider truncate max-w-xs">
                {unitTitle ? `${unitTitle.toUpperCase()} : ${episodeTitle.toUpperCase()}` : episodeTitle.toUpperCase()}
              </span>
              <span>·</span>
              <span className="text-sky-300 font-bold">
                {totalSelectedQuestions} QUESTIONS
              </span>
              <span>·</span>
              <span className="text-indigo-300 font-bold">
                {totalSelectedTypes} {totalSelectedTypes === 1 ? 'TYPE' : 'TYPES'}
              </span>
              <span>·</span>
              <span className="text-emerald-400 font-bold">
                {totalSelectedPoints} MARKS
              </span>
            </div>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0b1d33] px-3 py-1.5 rounded-xl border border-[#183a63]">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:inline">
              CEFR LEVEL:
            </span>
            <select
              value={cefrLevel}
              onChange={e => setCefrLevel(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-slate-100 hover:text-white focus:outline-none cursor-pointer"
            >
              <option value="A1" className="bg-[#0b1d33] text-white">A1 Beginner</option>
              <option value="A2" className="bg-[#0b1d33] text-white">A2 Elementary</option>
              <option value="B1" className="bg-[#0b1d33] text-white">B1 Intermediate</option>
              <option value="B2" className="bg-[#0b1d33] text-white">B2 Upper Int</option>
              <option value="C1" className="bg-[#0b1d33] text-white">C1 Advanced</option>
              <option value="C2" className="bg-[#0b1d33] text-white">C2 Proficiency</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close question builder"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* =================================================================== */}
      {/* 2. HORIZONTAL PROGRESS STEPS INDICATOR (FIXED UNDER HEADER)         */}
      {/* =================================================================== */}
      <nav aria-label="Progress steps" className="px-5 sm:px-8 py-2.5 bg-[#091b32] border-b border-[#142c4c] flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2 sm:gap-4 max-w-4xl">
          {/* Step 1 */}
          <button
            type="button"
            onClick={() => setStep('select')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              step === 'select'
                ? 'bg-[#026fc3] text-white shadow-sm ring-1 ring-sky-300/40'
                : 'text-slate-300 hover:text-white bg-[#0f2a4a]/40'
            }`}
          >
            <span className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center ${
              step === 'select' ? 'bg-white text-[#026fc3]' : 'bg-slate-700 text-slate-300'
            }`}>
              1
            </span>
            <span className="hidden xs:inline">STEP 1</span>
            <span className="font-medium opacity-90">Select Types & Counts</span>
          </button>

          <span className="text-slate-600 font-bold">→</span>

          {/* Step 2 */}
          <button
            type="button"
            onClick={() => {
              if (!generatedPrompt) handleProceedToPrompt();
              else setStep('prompt');
            }}
            disabled={totalSelectedQuestions === 0}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              step === 'prompt'
                ? 'bg-[#026fc3] text-white shadow-sm ring-1 ring-sky-300/40 cursor-pointer'
                : totalSelectedQuestions === 0
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-300 hover:text-white bg-[#0f2a4a]/40 cursor-pointer'
            }`}
          >
            <span className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center ${
              step === 'prompt' ? 'bg-white text-[#026fc3]' : 'bg-slate-700 text-slate-300'
            }`}>
              2
            </span>
            <span className="hidden xs:inline">STEP 2</span>
            <span className="font-medium opacity-90">Generate AI Prompt</span>
          </button>

          <span className="text-slate-600 font-bold">→</span>

          {/* Step 3 */}
          <button
            type="button"
            onClick={() => setStep('import')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              step === 'import'
                ? 'bg-[#026fc3] text-white shadow-sm ring-1 ring-sky-300/40'
                : 'text-slate-300 hover:text-white bg-[#0f2a4a]/40'
            }`}
          >
            <span className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center ${
              step === 'import' ? 'bg-white text-[#026fc3]' : 'bg-slate-700 text-slate-300'
            }`}>
              3
            </span>
            <span className="hidden xs:inline">STEP 3</span>
            <span className="font-medium opacity-90">Paste & Validate AI JSON</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs font-bold text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Full-Screen Authoring Mode</span>
        </div>
      </nav>

      {/* =================================================================== */}
      {/* 3. PRIMARY SCROLLABLE MAIN CONTENT AREA                             */}
      {/* =================================================================== */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6">
        <div className="max-w-[1380px] mx-auto w-full">

          {/* --------------------------------------------------------------- */}
          {/* STEP 1: QUESTION TYPE WORKSPACE & STICKY SUMMARY                */}
          {/* --------------------------------------------------------------- */}
          {step === 'select' && (
            <div className="flex flex-col lg:flex-row items-start gap-6">
              
              {/* LEFT / MAIN WORKSPACE AREA: CATEGORIES A THROUGH I */}
              <div className="w-full lg:flex-1 space-y-6">
                
                {/* Visual Authoring Instruction Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0d2849] to-[#0a1e38] border border-[#193e6a] flex items-start gap-3 shadow-md">
                  <div className="w-8 h-8 rounded-xl bg-[#026fc3]/25 text-sky-300 flex items-center justify-center shrink-0 border border-sky-400/30">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                  <div className="text-xs text-slate-200 leading-relaxed space-y-1">
                    <p className="font-bold text-white text-sm">Design Your Lesson Assessment</p>
                    <p className="text-slate-300">
                      Click any question type row to select it. Use <span className="font-bold text-white">[-]</span> and <span className="font-bold text-white">[+]</span> to adjust quantities. The AI Question Builder will construct a targeted prompt referencing your actual lesson text.
                    </p>
                  </div>
                </div>

                {/* CATEGORIES GRID (A through I) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {WORKSPACE_CATEGORIES.map(category => (
                    <div
                      key={category.code}
                      className="rounded-2xl border border-[#173b64] bg-[#0b213b] p-4 sm:p-5 space-y-3.5 shadow-lg transition-all"
                    >
                      {/* Category Header */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-[#17385d]">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-xl bg-[#026fc3] text-white text-xs font-black flex items-center justify-center shrink-0 shadow-sm">
                            {category.code}
                          </span>
                          <div>
                            <h2 className="text-xs sm:text-sm font-black text-white tracking-tight uppercase">
                              {category.title}
                            </h2>
                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              {category.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Category Items */}
                      <div className="space-y-2.5">
                        {category.items.map(item => {
                          const state = itemSelections[item.id] || { selected: false, count: item.defaultCount };
                          const isSelected = state.selected && !item.isComingSoon;

                          return (
                            <div
                              key={item.id}
                              tabIndex={item.isComingSoon ? -1 : 0}
                              role="button"
                              onClick={() => toggleItem(item.id, item.isComingSoon)}
                              onKeyDown={e => {
                                if (e.key === ' ' || e.key === 'Enter') {
                                  e.preventDefault();
                                  toggleItem(item.id, item.isComingSoon);
                                }
                              }}
                              className={`p-3 rounded-xl border transition-all select-none ${
                                item.isComingSoon
                                  ? 'bg-[#081524] border-[#10243d] opacity-50 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-[#0c2f58] border-2 border-[#026fc3] shadow-md cursor-pointer'
                                  : 'bg-[#091b30] hover:bg-[#0d2745] border border-[#143358] cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                {/* Left: Custom Checkbox & Label */}
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0 ${
                                      item.isComingSoon
                                        ? 'border border-slate-700 bg-slate-900/40 text-transparent'
                                        : isSelected
                                        ? 'border-2 border-[#026fc3] bg-[#026fc3] text-white shadow-xs'
                                        : 'border-2 border-slate-500/70 bg-[#071424]'
                                    }`}
                                  >
                                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                  </div>

                                  <div className="truncate">
                                    <span className={`text-xs sm:text-sm font-bold block truncate ${
                                      isSelected ? 'text-white' : 'text-slate-200'
                                    }`}>
                                      {item.label}
                                    </span>
                                  </div>
                                </div>

                                {/* Right: Count Selector or Coming Soon Badge */}
                                <div className="flex items-center gap-2 shrink-0">
                                  {item.isComingSoon ? (
                                    <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-400 text-[10px] font-bold border border-slate-700">
                                      Coming Soon
                                    </span>
                                  ) : isSelected ? (
                                    <div
                                      onClick={e => e.stopPropagation()}
                                      className="flex items-center gap-1.5 bg-[#08182b] px-2 py-1 rounded-xl border border-[#1b3e6b] shadow-inner"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => adjustCount(item.id, -1, 1, item.maxCount || 20)}
                                        disabled={state.count <= 1}
                                        className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-200 hover:bg-[#133256] disabled:opacity-25 transition-colors cursor-pointer disabled:cursor-not-allowed"
                                        title="Decrease count"
                                      >
                                        <Minus className="w-3.5 h-3.5" />
                                      </button>
                                      <span className="text-xs font-black min-w-[22px] text-center text-white">
                                        {state.count}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => adjustCount(item.id, 1, 1, item.maxCount || 20)}
                                        disabled={state.count >= (item.maxCount || 20)}
                                        className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-200 hover:bg-[#133256] disabled:opacity-25 transition-colors cursor-pointer disabled:cursor-not-allowed"
                                        title="Increase count"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-bold text-slate-400 px-2 py-1">
                                      {item.defaultCount}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Special Extra Config for WH Questions */}
                              {isSelected && item.type === 'wh_question' && (
                                <div
                                  onClick={e => e.stopPropagation()}
                                  className="mt-2.5 pt-2 border-t border-[#163861] flex flex-wrap items-center justify-between gap-2 text-[11px]"
                                >
                                  <span className="text-slate-300 font-medium">WH Variety:</span>
                                  <select
                                    value={state.wh_type || 'mixed_wh'}
                                    onChange={e => updateWhType(item.id, e.target.value as WhType)}
                                    className="px-2.5 py-1 rounded-lg border border-[#1e4573] bg-[#091b30] text-xs font-bold text-slate-100 hover:border-sky-400 focus:outline-none"
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

                              {/* Special Extra Config for Cloze Passage */}
                              {isSelected && item.type === 'cloze_passage' && (
                                <div
                                  onClick={e => e.stopPropagation()}
                                  className="mt-2.5 pt-2 border-t border-[#163861] flex items-center justify-between gap-2 text-[11px]"
                                >
                                  <span className="text-slate-300 font-medium">Blanks in passage:</span>
                                  <div className="flex items-center gap-1.5 bg-[#08182b] px-2 py-0.5 rounded-lg border border-[#1b3e6b]">
                                    <button
                                      type="button"
                                      onClick={() => adjustClozeBlanks(item.id, -1)}
                                      disabled={(state.blankCount || 10) <= 2}
                                      className="w-5 h-5 rounded flex items-center justify-center text-slate-200 hover:bg-[#133256] disabled:opacity-25"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="text-xs font-black text-white px-1">
                                      {state.blankCount || 10} blanks
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => adjustClozeBlanks(item.id, 1)}
                                      disabled={(state.blankCount || 10) >= 20}
                                      className="w-5 h-5 rounded flex items-center justify-center text-slate-200 hover:bg-[#133256] disabled:opacity-25"
                                    >
                                      <Plus className="w-3 h-3" />
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
              </div>

              {/* RIGHT SIDEBAR: STICKY CURRENT SELECTION SUMMARY PANEL */}
              <aside className="w-full lg:w-80 lg:shrink-0 space-y-5 lg:sticky lg:top-2">
                
                {/* Summary Card */}
                <div className="rounded-2xl border border-[#1a3f6e] bg-[#0a2039] p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#17375f]">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#026fc3] text-white text-[10px] font-black uppercase tracking-wider">
                        SELECTED
                      </span>
                      <h2 className="text-xs font-black text-white uppercase tracking-wider">
                        Current Plan
                      </h2>
                    </div>
                    <span className="text-[11px] font-bold text-sky-300">
                      v1.0 Engine
                    </span>
                  </div>

                  {/* 3 Metric Cards */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-[#07172b] border border-[#16355b] text-center">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Types</span>
                      <span className="text-lg font-black text-indigo-300">{totalSelectedTypes}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#07172b] border border-[#16355b] text-center">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Questions</span>
                      <span className="text-lg font-black text-sky-300">{totalSelectedQuestions}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#07172b] border border-[#16355b] text-center">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Marks</span>
                      <span className="text-lg font-black text-emerald-400">{totalSelectedPoints}</span>
                    </div>
                  </div>

                  {/* Selected Breakdown List */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Plan Breakdown
                    </span>

                    {selectedItemsSummary.length === 0 ? (
                      <div className="p-4 rounded-xl bg-[#071526]/60 border border-dashed border-slate-700 text-center text-xs text-slate-400">
                        No question types selected yet. Click any row on the left to add items.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {selectedItemsSummary.map(item => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#07182c] border border-[#143154] text-xs"
                          >
                            <span className="font-bold text-slate-200 truncate mr-2">{item.label}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="px-2 py-0.5 rounded bg-[#026fc3]/25 text-sky-200 text-xs font-black">
                                {item.count}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {item.points} pts
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Optional Teacher Guidance */}
                  <div className="space-y-1.5 pt-2 border-t border-[#17375f]">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Teacher AI Guidance (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={teacherInstructions}
                      onChange={e => setTeacherInstructions(e.target.value)}
                      placeholder="e.g. Focus on dialogue comprehension, avoid tricky distractors..."
                      className="w-full p-2.5 rounded-xl border border-[#193d68] bg-[#07172b] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400"
                    />
                  </div>
                </div>
              </aside>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* STEP 2: GENERATED AI PROMPT WORKSPACE                           */}
          {/* --------------------------------------------------------------- */}
          {step === 'prompt' && (
            <div className="space-y-5 max-w-4xl mx-auto">
              {/* Ready Banner */}
              <div className="p-5 rounded-2xl bg-[#0d2a4d] border border-sky-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h2 className="text-base font-black text-white">AI PROMPT READY</h2>
                    <p className="text-xs text-slate-300">
                      Copy this prompt and paste it into ChatGPT, Claude, Gemini, or DeepSeek. Then copy the AI's JSON output and click Next.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md cursor-pointer shrink-0 ${
                    copied
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                      : 'bg-[#026fc3] hover:bg-[#025da4] text-white ring-1 ring-sky-400/40'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'COPY PROMPT'}</span>
                </button>
              </div>

              {/* Large Dark Code / Text Container */}
              <div className="rounded-2xl border border-[#193d68] bg-[#050e1a] overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#091b32] border-b border-[#142d4d] text-xs font-mono text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <span className="font-bold">EdTechra Assessment Prompt v1.0</span>
                  </div>
                  <span>{generatedPrompt.length} characters</span>
                </div>
                <pre className="p-5 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto max-h-[520px] overflow-y-auto whitespace-pre-wrap">
                  {generatedPrompt}
                </pre>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* STEP 3: PASTE & VALIDATE AI JSON WORKSPACE                      */}
          {/* --------------------------------------------------------------- */}
          {step === 'import' && (
            <div className="space-y-5 max-w-4xl mx-auto">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <span>PASTE AI-GENERATED JSON</span>
                    <span className="text-xs text-slate-400 font-normal normal-case">(from external AI tool)</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleValidateJson}
                    disabled={!jsonInput.trim()}
                    className="px-4 py-1.5 bg-[#026fc3] hover:bg-[#025da4] disabled:opacity-40 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm disabled:cursor-not-allowed"
                  >
                    Validate JSON
                  </button>
                </div>

                <textarea
                  rows={12}
                  value={jsonInput}
                  onChange={e => {
                    setJsonInput(e.target.value);
                    if (validationResult) setValidationResult(null);
                  }}
                  placeholder="Paste the full JSON output from your AI model here (e.g. { 'schema_version': '1.0', 'question_sets': [...] })..."
                  className="w-full p-4 font-mono text-xs rounded-2xl border border-[#183d6a] bg-[#050e1a] text-slate-100 placeholder-slate-600 leading-relaxed focus:border-[#026fc3] focus:ring-1 focus:ring-[#026fc3] focus:outline-none shadow-inner"
                />
              </div>

              {/* Validation Result Display */}
              {validationResult && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  {/* Error Card */}
                  {!validationResult.isValid && (
                    <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-2.5 shadow-lg">
                      <div className="flex items-center gap-2 text-rose-300 font-black text-sm uppercase tracking-tight">
                        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                        <span>JSON VALIDATION ERROR</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1.5 text-rose-200 font-mono text-xs pl-2">
                        {validationResult.errors.map((err, idx) => (
                          <li key={idx} className="leading-relaxed">{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Success Card */}
                  {validationResult.isValid && (
                    <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                        <div className="flex items-center gap-2 text-emerald-300 font-black text-sm">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          <span>✓ Valid JSON — {validationResult.summary.totalQuestions} questions detected</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-400">
                          {validationResult.summary.totalMarks} Total Marks
                        </span>
                      </div>

                      {/* Breakdown Badges */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {Object.entries(validationResult.summary.byType).map(([t, count]) => (
                          <span
                            key={t}
                            className="px-3 py-1.5 rounded-xl bg-emerald-900/40 text-emerald-200 text-xs font-bold border border-emerald-500/30"
                          >
                            ✓ {count} {QUESTION_TYPE_LABELS[t as QuestionType] || t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* =================================================================== */}
      {/* 4. STICKY DARK FOOTER WITH DYNAMIC QUESTION COUNT ACTIONS           */}
      {/* =================================================================== */}
      <footer className="px-5 sm:px-8 py-4 bg-[#06101e] border-t border-[#142c4c] flex items-center justify-between shrink-0 z-20">
        <div>
          {step === 'select' ? (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-[#0d223a] hover:bg-[#122e4e] transition-colors cursor-pointer border border-[#1b3d68]"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(step === 'import' ? 'prompt' : 'select')}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white bg-[#0d223a] hover:bg-[#122e4e] transition-colors cursor-pointer flex items-center gap-2 border border-[#1b3d68]"
            >
              <ArrowLeft className="w-4 h-4" />
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
              className="px-6 py-2.5 rounded-xl bg-[#026fc3] hover:bg-[#025da4] disabled:opacity-40 text-white text-xs font-black shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed ring-1 ring-sky-400/40"
            >
              <span>Next: Generate AI Prompt ({totalSelectedQuestions})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 'prompt' && (
            <button
              type="button"
              onClick={() => setStep('import')}
              className="px-6 py-2.5 rounded-xl bg-[#026fc3] hover:bg-[#025da4] text-white text-xs font-black shadow-lg transition-all flex items-center gap-2 cursor-pointer ring-1 ring-sky-400/40"
            >
              <span>Next: Paste AI JSON</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 'import' && (
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={!validationResult?.isValid}
              className="px-7 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] disabled:opacity-40 text-white text-xs font-black shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed ring-1 ring-emerald-400/40"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>IMPORT QUESTIONS ({validationResult?.summary.totalQuestions || 0}) →</span>
            </button>
          )}
        </div>
      </footer>

    </div>
  );
};
