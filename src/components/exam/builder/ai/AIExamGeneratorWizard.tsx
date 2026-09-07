// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: STEP-BY-STEP AI EXAM GENERATOR WIZARD
// Simplifies teacher exam creation into 5 focused panels:
// 1. Content -> 2. Blueprint -> 3. Media -> 4. Settings -> 5. AI Prompt & JSON Import
// Teachers never see raw JSON or technical schemas.
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  ClipboardPaste,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Image as ImageIcon,
  Headphones,
  Video,
  Info,
  Zap,
  Award,
  GraduationCap,
  Star,
  Settings2
} from 'lucide-react';

export type ExamTemplate = 'simple' | 'standard' | 'advanced' | 'custom';
import {
  CanonicalAssessmentV2,
  SupportedQuestionType
} from '../../shared/ExamSchema';
import { THEME_PRESETS } from '../../shared/themePresets';
import {
  validateExamJSON,
  generateCorrectionPrompt,
  ValidationResult
} from '../../teacher/JSONValidator';

export interface AIExamWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onExamCreated: (assessment: CanonicalAssessmentV2) => void;
  initialTopic?: string;
  initialSubject?: string;
  initialGrade?: string;
}

// Teacher-friendly question type definition
export interface TeacherBlueprintItem {
  id: string;
  type: SupportedQuestionType | 'cloze_passage';
  name: string;
  category: 'core' | 'skills' | 'media';
  description: string;
  enabled: boolean;
  count: number;
  marksPerItem: number;
  isActivity?: boolean; // Single activity like Cloze, Writing, Reading
}

const DEFAULT_BLUEPRINT_ITEMS: TeacherBlueprintItem[] = [
  // Core Language & Objective
  {
    id: 'mcq',
    type: 'multiple_choice',
    name: 'Multiple Choice',
    category: 'core',
    description: 'Single correct answer from 3–4 choices',
    enabled: true,
    count: 10,
    marksPerItem: 1
  },
  {
    id: 'tf',
    type: 'true_false',
    name: 'True / False',
    category: 'core',
    description: 'Fact-checking statements with binary True/False choices',
    enabled: true,
    count: 5,
    marksPerItem: 1
  },
  {
    id: 'fill_blank',
    type: 'fill_in_blank',
    name: 'Fill in the Blank',
    category: 'core',
    description: 'Sentences containing [blank] with accepted answers',
    enabled: true,
    count: 5,
    marksPerItem: 1
  },
  {
    id: 'cloze',
    type: 'cloze_passage',
    name: 'Cloze Passage',
    category: 'core',
    description: 'Complete missing words in a passage with word bank',
    enabled: true,
    count: 1,
    marksPerItem: 5,
    isActivity: true
  },
  {
    id: 'short_ans',
    type: 'short_answer',
    name: 'Short Answer',
    category: 'core',
    description: 'Concise written answers evaluated against model guidance',
    enabled: true,
    count: 5,
    marksPerItem: 2
  },
  {
    id: 'matching',
    type: 'matching',
    name: 'Matching',
    category: 'core',
    description: 'Pair concepts or terms with their correct definitions',
    enabled: false,
    count: 3,
    marksPerItem: 1
  },
  {
    id: 'reorder',
    type: 'reorder',
    name: 'Reorder / Sequence',
    category: 'core',
    description: 'Arrange sentences, steps, or events into logical order',
    enabled: false,
    count: 2,
    marksPerItem: 1
  },
  {
    id: 'error_corr',
    type: 'error_correction',
    name: 'Error Correction',
    category: 'core',
    description: 'Identify grammatical mistakes and provide corrected sentences',
    enabled: false,
    count: 5,
    marksPerItem: 1
  },
  {
    id: 'sent_trans',
    type: 'sentence_transformation',
    name: 'Sentence Transformation',
    category: 'core',
    description: 'Rewrite sentences following grammatical instructions',
    enabled: false,
    count: 5,
    marksPerItem: 1
  },
  // Skills & Long Form
  {
    id: 'writing',
    type: 'essay',
    name: 'Writing',
    category: 'skills',
    description: 'Guided essay or paragraph task with live word counting',
    enabled: true,
    count: 1,
    marksPerItem: 10,
    isActivity: true
  },
  {
    id: 'reading',
    type: 'reading_comprehension',
    name: 'Reading Comprehension',
    category: 'skills',
    description: 'Contextual reading passage followed by questions',
    enabled: false,
    count: 1,
    marksPerItem: 10,
    isActivity: true
  },
  {
    id: 'listening',
    type: 'audio_question',
    name: 'Listening',
    category: 'skills',
    description: 'Audio playback followed by comprehension questions',
    enabled: false,
    count: 1,
    marksPerItem: 10,
    isActivity: true
  },
  // Media Based
  {
    id: 'picture_q',
    type: 'image_question',
    name: 'Picture Question',
    category: 'media',
    description: 'Questions based on an uploaded image or diagram',
    enabled: false,
    count: 1,
    marksPerItem: 5
  },
  {
    id: 'video_q',
    type: 'video_question',
    name: 'Video Question',
    category: 'media',
    description: 'Questions based on a video clip with transcript',
    enabled: false,
    count: 1,
    marksPerItem: 5
  },
  {
    id: 'audio_q',
    type: 'audio_question',
    name: 'Audio Question',
    category: 'media',
    description: 'Individual listening question with transcript stimulus',
    enabled: false,
    count: 1,
    marksPerItem: 2
  }
];

export const AIExamGeneratorWizard: React.FC<AIExamWizardProps> = ({
  isOpen,
  onClose,
  onExamCreated,
  initialTopic = 'Simple Present Tense',
  initialSubject = 'English Language',
  initialGrade = 'Grade 10'
}) => {
  // Wizard Step: 0 (Template), 1 (Content), 2 (Blueprint), 3 (Media), 4 (Settings), 5 (AI Prompt & JSON)
  const [currentStep, setCurrentStep] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);

  // Panel 0: Template Selection State
  const [selectedTemplate, setSelectedTemplate] = useState<ExamTemplate | null>(null);

  // Panel 1: Content State
  const [contentTitle, setContentTitle] = useState(initialTopic);
  const [contentText, setContentText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Panel 2: Blueprint State
  const [activePreset, setActivePreset] = useState<'standard' | 'quick' | 'grammar' | 'reading' | 'custom'>('standard');
  const [blueprintItems, setBlueprintItems] = useState<TeacherBlueprintItem[]>(DEFAULT_BLUEPRINT_ITEMS);

  // Panel 3: Media State
  const [pictureFile, setPictureFile] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTranscript, setVideoTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioTranscript, setAudioTranscript] = useState('');

  // Panel 4: Exam Settings
  const [subject, setSubject] = useState(initialSubject);
  const [grade, setGrade] = useState(initialGrade);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passPercentage, setPassPercentage] = useState(50);
  const [questionOrder, setQuestionOrder] = useState<'fixed' | 'shuffle'>('shuffle');
  const [showResults] = useState<'immediately' | 'after_review'>('immediately');
  const [answerFeedback] = useState<'off' | 'after_submission'>('after_submission');

  // Panel 5: AI Prompt & JSON Paste State
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedCorrection, setCopiedCorrection] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isProcessingJson, setIsProcessingJson] = useState(false);

  // Check if media is required by the blueprint
  const requiresMedia = useMemo(() => {
    return blueprintItems.some(
      (item) => item.enabled && (item.id === 'picture_q' || item.id === 'video_q' || item.id === 'audio_q')
    );
  }, [blueprintItems]);

  const requiresPicture = useMemo(() => {
    return blueprintItems.some((item) => item.enabled && item.id === 'picture_q');
  }, [blueprintItems]);

  const requiresVideo = useMemo(() => {
    return blueprintItems.some((item) => item.enabled && item.id === 'video_q');
  }, [blueprintItems]);

  const requiresAudio = useMemo(() => {
    return blueprintItems.some((item) => item.enabled && item.id === 'audio_q');
  }, [blueprintItems]);

  // Totals calculations
  const totalQuestions = useMemo(() => {
    return blueprintItems
      .filter((i) => i.enabled)
      .reduce((acc, i) => acc + i.count, 0);
  }, [blueprintItems]);

  const totalMarks = useMemo(() => {
    return blueprintItems
      .filter((i) => i.enabled)
      .reduce((acc, i) => acc + i.count * i.marksPerItem, 0);
  }, [blueprintItems]);

  const enabledTypesCount = useMemo(() => {
    return blueprintItems.filter((i) => i.enabled).length;
  }, [blueprintItems]);

  // Apply Blueprint Presets
  const handleApplyPreset = (preset: 'standard' | 'quick' | 'grammar' | 'reading' | 'custom') => {
    setActivePreset(preset);
    if (preset === 'custom') return;

    setBlueprintItems((prev) =>
      prev.map((item) => {
        if (preset === 'standard') {
          if (item.id === 'mcq') return { ...item, enabled: true, count: 10, marksPerItem: 1 };
          if (item.id === 'tf') return { ...item, enabled: true, count: 5, marksPerItem: 1 };
          if (item.id === 'fill_blank') return { ...item, enabled: true, count: 5, marksPerItem: 1 };
          if (item.id === 'cloze') return { ...item, enabled: true, count: 1, marksPerItem: 5 };
          if (item.id === 'short_ans') return { ...item, enabled: true, count: 5, marksPerItem: 2 };
          if (item.id === 'writing') return { ...item, enabled: true, count: 1, marksPerItem: 10 };
          return { ...item, enabled: false };
        }
        if (preset === 'quick') {
          if (item.id === 'mcq') return { ...item, enabled: true, count: 5, marksPerItem: 1 };
          if (item.id === 'tf') return { ...item, enabled: true, count: 3, marksPerItem: 1 };
          if (item.id === 'fill_blank') return { ...item, enabled: true, count: 2, marksPerItem: 1 };
          return { ...item, enabled: false };
        }
        if (preset === 'grammar') {
          if (item.id === 'mcq') return { ...item, enabled: true, count: 10, marksPerItem: 1 };
          if (item.id === 'fill_blank') return { ...item, enabled: true, count: 5, marksPerItem: 1 };
          if (item.id === 'error_corr') return { ...item, enabled: true, count: 5, marksPerItem: 1 };
          if (item.id === 'sent_trans') return { ...item, enabled: true, count: 5, marksPerItem: 1 };
          return { ...item, enabled: false };
        }
        if (preset === 'reading') {
          if (item.id === 'reading') return { ...item, enabled: true, count: 1, marksPerItem: 10 };
          if (item.id === 'cloze') return { ...item, enabled: true, count: 1, marksPerItem: 5 };
          if (item.id === 'mcq') return { ...item, enabled: true, count: 5, marksPerItem: 1 };
          return { ...item, enabled: false };
        }
        return item;
      })
    );
  };

  const handleToggleItem = (id: string) => {
    setActivePreset('custom');
    setBlueprintItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, enabled: !it.enabled } : it))
    );
  };

  const handleCountChange = (id: string, delta: number) => {
    setActivePreset('custom');
    setBlueprintItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const next = Math.max(1, it.count + delta);
        return { ...it, count: next, enabled: true };
      })
    );
  };

  const handleMarksChange = (id: string, marks: number) => {
    setActivePreset('custom');
    setBlueprintItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        return { ...it, marksPerItem: Math.max(1, marks) };
      })
    );
  };

  // ============================================================================
  // EXAM TEMPLATE APPLICATION FUNCTIONS
  // These map the Simple/Standard/Advanced templates to existing blueprintItems.
  // Each function only pre-fills the existing blueprint state — nothing downstream changes.
  // ============================================================================

  const applySimpleTemplate = () => {
    setActivePreset('custom');
    setBlueprintItems((prev) =>
      prev.map((item) => {
        if (item.id === 'mcq') return { ...item, enabled: true, count: 25, marksPerItem: 4 };
        return { ...item, enabled: false };
      })
    );
  };

  const applyStandardTemplate = () => {
    setActivePreset('custom');
    setBlueprintItems((prev) =>
      prev.map((item) => {
        if (item.id === 'mcq') return { ...item, enabled: true, count: 15, marksPerItem: 2 };
        if (item.id === 'tf') return { ...item, enabled: true, count: 5, marksPerItem: 2 };
        if (item.id === 'fill_blank') return { ...item, enabled: true, count: 8, marksPerItem: 2 };
        if (item.id === 'short_ans') return { ...item, enabled: true, count: 7, marksPerItem: 2 };
        if (item.id === 'reading') return { ...item, enabled: true, count: 1, marksPerItem: 20 };
        if (item.id === 'error_corr') return { ...item, enabled: true, count: 5, marksPerItem: 2 };
        return { ...item, enabled: false };
      })
    );
  };

  const applyAdvancedTemplate = () => {
    setActivePreset('custom');
    setBlueprintItems((prev) =>
      prev.map((item) => {
        if (item.id === 'mcq') return { ...item, enabled: true, count: 10, marksPerItem: 2 };
        if (item.id === 'tf') return { ...item, enabled: true, count: 5, marksPerItem: 1 };
        if (item.id === 'fill_blank') return { ...item, enabled: true, count: 5, marksPerItem: 2 };
        if (item.id === 'short_ans') return { ...item, enabled: true, count: 5, marksPerItem: 3 };
        if (item.id === 'reading') return { ...item, enabled: true, count: 1, marksPerItem: 15 };
        if (item.id === 'error_corr') return { ...item, enabled: true, count: 3, marksPerItem: 2 };
        if (item.id === 'sent_trans') return { ...item, enabled: true, count: 3, marksPerItem: 3 };
        if (item.id === 'writing') return { ...item, enabled: true, count: 1, marksPerItem: 20 };
        return { ...item, enabled: false };
      })
    );
  };

  const handleSelectTemplate = (template: ExamTemplate) => {
    setSelectedTemplate(template);
    if (template === 'simple') applySimpleTemplate();
    else if (template === 'standard') applyStandardTemplate();
    else if (template === 'advanced') applyAdvancedTemplate();
    // 'custom' leaves blueprint items at defaults
    setCurrentStep(1);
  };

  // Generate Grounded AI Prompt
  const generatedAIPrompt = useMemo(() => {
    const activeBlueprint = blueprintItems.filter((i) => i.enabled);
    const blueprintDescription = activeBlueprint
      .map(
        (b) =>
          `- ${b.name}: exactly ${b.count} ${b.isActivity ? 'activity/passage' : 'question(s)'}, ${b.marksPerItem} mark(s) each (Total: ${b.count * b.marksPerItem} marks)`
      )
      .join('\n');

    const effectiveContent =
      contentText.trim() ||
      `Standard Grade ${grade} curriculum topic on "${contentTitle.trim() || 'English Language'}" covering core definitions, rules, usage, and practical application.`;

    return `You are an expert curriculum specialist and educational assessment psychometrician.

Your mission is to generate a complete, rigorous, and pedagogically sound digital examination strictly adhering to the EdTechra Assessment Blueprint defined below.

================================================================================
EXAMINATION METADATA
================================================================================
- Title: ${subject}: ${contentTitle || 'Assessment'}
- Subject: ${subject}
- Grade Level: ${grade}
- Difficulty Level: ${difficulty}
- Duration: ${durationMinutes} minutes
- Pass Threshold: ${passPercentage}%
- Total Questions: ${totalQuestions}
- Total Marks: ${totalMarks}

================================================================================
PRIMARY TEACHING CONTENT (STRICT GROUNDING SOURCE)
================================================================================
"""
${effectiveContent}
"""

GROUNDING RULES (MANDATORY):
1. Use ONLY the supplied teaching content as the primary source for all questions.
2. Do NOT introduce external advanced concepts that students could not learn from this content.
3. Ensure all distractors in multiple-choice questions are plausible misconceptions, but clearly incorrect.
4. Language must be age-appropriate for ${grade}.
5. Ensure unambiguous question wording and complete answer keys.

================================================================================
EXACT QUESTION BLUEPRINT (DO NOT ALTER COUNTS OR MARKS)
================================================================================
You MUST construct an examination containing EXACTLY these question types, counts, and marks:
${blueprintDescription}

CRITICAL ASSESSMENT & RENDERING RULES:
- Generate questions that are directly renderable by the EdTechra examination engine.
- EdTechra defines the assessment structure. You MUST NOT change question counts, marks, or types.
- DO NOT alter or hallucinate question types not listed in the blueprint.
- DO NOT alter the JSON schema or create new fields.
- Distribute correct answers across A, B, C, and D naturally. Do not use a predictable answer pattern. Do not make every correct answer option A. Vary the correct options (e.g. C, A, D, B, C...).
- Never refer to an underlined, bold, highlighted, italicized, circled, boxed, or marked word unless that formatting actually exists in the JSON using <b>, <strong>, <i>, <em>, or <u> tags.
- Prefer simpler instructions like: "Replace the noun 'teacher' with a suitable subject pronoun." instead of "Replace the underlined noun..." unless actual underline formatting is present.
- Do not output literal [blank] text for a question type that does not support blanks.
- For Fill in the Blank questions, use the exact [blank] placeholder in the question text.
- For Cloze Passage questions, use [blank_1], [blank_2], [blank_3], etc. in the passage string.
- For Cloze Passage, every blank ID in the passage MUST have a matching object in the blanks array with 'id', 'correctAnswer', and 'acceptedAnswers'. Also provide a 'wordBank' array containing all correct words plus distractors.
- Do not include the correct answer in question text or option labels.
- Do not reveal correct answers through option ordering or hints.
- Do not add answer-key labels such as 'Correct option: A' in option text.
- Correct answers are metadata for grading only, stored exclusively in the 'correctAnswer' field.
${blueprintItems.some((i) => i.enabled && i.id === 'cloze') ? `- Cloze Passage MUST contain a contextual passage with numbered '[blank_1]', '[blank_2]', etc., accompanied by a 'blanks' array where each blank has an 'id', 'correctAnswer', and 'acceptedAnswers'. Also provide a 'wordBank' array.\n` : ''}${requiresVideo && videoTranscript ? `- Video Questions MUST be strictly derived from this Video Transcript:\n"""\n${videoTranscript}\n"""\n` : ''}${requiresAudio && audioTranscript ? `- Audio Questions MUST be strictly derived from this Audio Transcript:\n"""\n${audioTranscript}\n"""\n` : ''}
================================================================================
OUTPUT FORMAT REQUIREMENTS (CRITICAL)
================================================================================
You MUST return ONLY valid JSON matching the EdTechra Assessment Schema.
DO NOT wrap your output in conversational markdown, explanations, introductory notes, or trailing comments.
Output ONLY the raw JSON object starting with { and ending with }.

Schema structure:
{
  "schemaVersion": "2.0",
  "assessmentType": "exam",
  "exam": {
    "title": "${subject}: ${contentTitle || 'Assessment'}",
    "subject": "${subject}",
    "grade": "${grade}",
    "examType": "${activePreset.toUpperCase()} EXAM",
    "difficulty": "${difficulty}",
    "durationMinutes": ${durationMinutes},
    "passPercentage": ${passPercentage}
  },
  "sections": [
    {
      "id": "sec_1",
      "title": "Section A — Core Assessment",
      "description": "Answer all questions in this section.",
      "questions": [
        // Populate questions matching exact types and counts
      ]
    }
  ]
}

Generate the complete examination JSON now:`;
  }, [
    subject,
    contentTitle,
    grade,
    difficulty,
    durationMinutes,
    passPercentage,
    totalQuestions,
    totalMarks,
    contentText,
    blueprintItems,
    requiresVideo,
    videoTranscript,
    requiresAudio,
    audioTranscript,
    activePreset
  ]);

  // Handle Copy AI Prompt
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedAIPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    }
  };

  // Handle Copy Correction Prompt
  const handleCopyCorrection = async () => {
    if (!validationResult || validationResult.isValid) return;
    const correctionPrompt = generateCorrectionPrompt(
      validationResult.errors,
      validationResult.warnings,
      pastedJson
    );
    try {
      await navigator.clipboard.writeText(correctionPrompt);
      setCopiedCorrection(true);
      setTimeout(() => setCopiedCorrection(false), 2500);
    } catch {
      setCopiedCorrection(true);
      setTimeout(() => setCopiedCorrection(false), 2500);
    }
  };

  // Handle JSON validation and Exam creation
  const handleCreateExamFromJSON = () => {
    if (!pastedJson.trim()) return;
    setIsProcessingJson(true);

    try {
      const result = validateExamJSON(pastedJson);
      setValidationResult(result);

      if (result.isValid && result.parsedExam) {
        // Construct canonical assessment object
        const finalAssessment: CanonicalAssessmentV2 = {
          schemaVersion: '2.0',
          assessmentType: 'exam',
          exam: {
            title: result.parsedExam.exam.title || `${subject}: ${contentTitle || 'Exam'}`,
            subject: result.parsedExam.exam.subject || subject,
            grade: result.parsedExam.exam.grade || grade,
            examType: selectedTemplate === 'simple' ? 'Simple Exam' : selectedTemplate === 'advanced' ? 'Advanced Exam' : result.parsedExam.exam.examType || 'Standard Exam',
            difficulty: difficulty,
            durationMinutes: result.parsedExam.exam.durationMinutes || durationMinutes,
            passPercentage: result.parsedExam.exam.passPercentage || passPercentage,
            randomizeQuestions: questionOrder === 'shuffle',
            showMarksImmediately: showResults === 'immediately',
            showCorrectAnswers: answerFeedback === 'after_submission'
          },
          theme: THEME_PRESETS.edtechra_light,
          brandKit: { enabled: false, watermark: false },
          sections: result.parsedExam.sections || []
        };

        if (selectedTemplate) {
          (finalAssessment as any).exam_template = selectedTemplate;
          (finalAssessment.exam as any).exam_template = selectedTemplate;
        }

        onExamCreated(finalAssessment);
        onClose();
      }
    } catch (e: any) {
      setValidationResult({
        isValid: false,
        errors: [{ id: 'fatal_parse', message: `Parse error: ${e.message}` }],
        warnings: []
      });
    } finally {
      setIsProcessingJson(false);
    }
  };

  // Step Navigation validation
  const canGoNextFromStep1 = contentTitle.trim().length > 0 || contentText.trim().length > 0;
  const canGoNextFromStep2 = totalQuestions > 0;
  const canGoNextFromStep3 =
    (!requiresVideo || videoTranscript.trim().length > 0) &&
    (!requiresAudio || audioTranscript.trim().length > 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen flex flex-col bg-white overflow-hidden select-none animate-fadeIn [color-scheme:light]">
      {/* Top Header */}
      <div className="px-6 py-4 sm:px-10 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                AI Exam Generator
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">Step {currentStep + 1} of 6</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {currentStep === 0 && 'Choose Exam Type'}
              {currentStep === 1 && '1. What should this exam test?'}
              {currentStep === 2 && '2. Choose your question types'}
              {currentStep === 3 && '3. Add Media'}
              {currentStep === 4 && '4. Exam Settings'}
              {currentStep === 5 && '5. Generate Your AI Exam'}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
          title="Close Wizard"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Visual Step Progress Indicator */}
      <div className="px-6 py-3.5 sm:px-10 bg-white border-b border-slate-200 flex items-center justify-center shrink-0 z-10 shadow-2xs">
        <div className="flex items-center justify-between w-full max-w-4xl overflow-x-auto gap-2">
          {[
            { step: 0, label: 'Template' },
            { step: 1, label: 'Content' },
            { step: 2, label: 'Blueprint' },
            { step: 3, label: 'Media' },
            { step: 4, label: 'Settings' },
            { step: 5, label: 'AI Generator' }
          ].map((s) => {
            const isDone = currentStep > s.step;
            const isCurrent = currentStep === s.step;
            return (
              <button
                key={s.step}
                type="button"
                disabled={s.step > currentStep}
                onClick={() => setCurrentStep(s.step as any)}
                className={`flex items-center gap-2 text-xs font-bold transition-all px-3.5 py-1.5 rounded-xl cursor-pointer disabled:cursor-not-allowed ${
                  isCurrent
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs'
                    : isDone
                    ? 'text-emerald-700 hover:bg-emerald-50'
                    : 'text-slate-400 opacity-60'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    isCurrent
                      ? 'bg-indigo-600 text-white'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isDone ? <Check className="w-3 h-3" /> : s.step + 1}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Wizard Content Panels */}
      <div className="p-6 sm:px-10 sm:py-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* ============================================================
              PANEL 0 — TEMPLATE SELECTION
          ============================================================ */}
          {currentStep === 0 && (
            <div className="space-y-8 animate-fadeIn">
              {/* Header */}
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-900">Choose Exam Type</h3>
                <p className="text-sm text-slate-500 font-medium max-w-lg mx-auto">
                  Choose how you want your examination to be structured. The system will configure question types and marks automatically.
                </p>
              </div>

              {/* Three Template Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* SIMPLE */}
                <button
                  type="button"
                  onClick={() => handleSelectTemplate('simple')}
                  className="p-6 rounded-3xl border-2 border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/30 text-left transition-all hover:scale-[1.02] hover:shadow-xl cursor-pointer group flex flex-col justify-between space-y-5 shadow-xs"
                >
                  <div className="space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs group-hover:bg-blue-100 transition-colors">
                      <Zap className="w-7 h-7" />
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-lg font-black text-slate-900 group-hover:text-indigo-700 transition-colors">SIMPLE</h4>
                      <p className="text-xs font-bold text-blue-600">Quick Knowledge Assessment</p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>25 questions — MCQ only</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>4 options per question</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>4 marks per question</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="font-bold text-slate-800">Total: 100 marks</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Designed for quick tests, revision, and basic knowledge checking.
                    </p>
                  </div>

                  <div className="w-full py-3 rounded-2xl bg-slate-100 group-hover:bg-indigo-600 text-slate-700 group-hover:text-white font-black text-xs flex items-center justify-center gap-2 transition-all">
                    <span>Select Simple</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>

                {/* STANDARD — RECOMMENDED */}
                <button
                  type="button"
                  onClick={() => handleSelectTemplate('standard')}
                  className="p-6 rounded-3xl border-2 border-indigo-300 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50 text-left transition-all hover:scale-[1.02] hover:shadow-xl cursor-pointer group flex flex-col justify-between space-y-5 shadow-md shadow-indigo-100 relative"
                >
                  {/* Recommended Badge */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                    <Star className="w-3 h-3" />
                    <span>Recommended</span>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs group-hover:bg-indigo-200 transition-colors">
                      <Award className="w-7 h-7" />
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-lg font-black text-slate-900 group-hover:text-indigo-700 transition-colors">STANDARD</h4>
                      <p className="text-xs font-bold text-indigo-600">Cambridge-Style Assessment</p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-indigo-100 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>~50 questions — Mixed types</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>MCQ, Fill-in-blank, Short answer</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Reading comprehension</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Mobile-friendly • Progressive difficulty</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="font-bold text-slate-800">Total: 100 marks</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Tests knowledge, understanding, and application. Default examination format.
                    </p>
                  </div>

                  <div className="w-full py-3 rounded-2xl bg-indigo-600 group-hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-200">
                    <span>Select Standard</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>

                {/* ADVANCED */}
                <button
                  type="button"
                  onClick={() => handleSelectTemplate('advanced')}
                  className="p-6 rounded-3xl border-2 border-slate-200 hover:border-purple-400 bg-white hover:bg-purple-50/30 text-left transition-all hover:scale-[1.02] hover:shadow-xl cursor-pointer group flex flex-col justify-between space-y-5 shadow-xs"
                >
                  <div className="space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-2xs group-hover:bg-purple-100 transition-colors">
                      <GraduationCap className="w-7 h-7" />
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-lg font-black text-slate-900 group-hover:text-purple-700 transition-colors">ADVANCED</h4>
                      <p className="text-xs font-bold text-purple-600">Comprehensive Examination</p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Structured — Multiple sections</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Higher-order thinking</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Reading, analysis, essay</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Sentence transformation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="font-bold text-slate-800">Total: 100 marks</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Suitable for major examinations with complex assessment blueprints.
                    </p>
                  </div>

                  <div className="w-full py-3 rounded-2xl bg-slate-100 group-hover:bg-purple-600 text-slate-700 group-hover:text-white font-black text-xs flex items-center justify-center gap-2 transition-all">
                    <span>Select Advanced</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </div>

              {/* Custom Option */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => handleSelectTemplate('custom')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs font-bold transition-all cursor-pointer"
                >
                  <Settings2 className="w-4 h-4" />
                  <span>Custom Exam — Choose your own question types</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================
              PANEL 1 — CONTENT
          ============================================================ */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  1. What should this exam test?
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Paste your lesson, notes, topic, or teaching content. AI will create questions from it.
                </p>
              </div>

              {/* Topic / Unit Title */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Topic or Exam Subject Focus
                </label>
                <input
                  type="text"
                  value={contentTitle}
                  onChange={(e) => setContentTitle(e.target.value)}
                  placeholder="e.g. Simple Present Tense, Photosynthesis, Quadratic Equations..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
              </div>

              {/* Teaching Content Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Lesson Notes / Source Material
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {contentText.trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={contentText}
                  onChange={(e) => setContentText(e.target.value)}
                  placeholder="Paste your topic, lesson notes, textbook content, learning outcomes, or study material here..."
                  className="w-full p-4 rounded-2xl border border-slate-300 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs leading-relaxed resize-y"
                />
              </div>

              {/* Optional File Upload Helper */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Optional: Attach notes file (PDF, DOCX, TXT)
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {uploadedFileName ? (
                        <span className="text-emerald-700 font-bold">Uploaded: {uploadedFileName}</span>
                      ) : (
                        'Extract text directly from your lesson documents'
                      )}
                    </div>
                  </div>
                </div>

                <label className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs transition-colors shrink-0">
                  <span>Browse Files</span>
                  <input
                    type="file"
                    accept=".txt,.pdf,.docx,.doc"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadedFileName(file.name);
                        if (file.name.endsWith('.txt')) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const res = event.target?.result;
                            if (typeof res === 'string') {
                              setContentText((prev) => (prev ? `${prev}\n\n${res}` : res));
                            }
                          };
                          reader.readAsText(file);
                        } else {
                          setContentText((prev) =>
                            prev
                              ? prev
                              : `[Source Document: ${file.name}]\nLesson content covering ${contentTitle}.`
                          );
                        }
                      }
                    }}
                  />
                </label>
              </div>

              {/* Helper Example Box */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex items-start gap-3 text-xs text-indigo-950">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Helpful example: </span>
                  <span className="text-indigo-900/90 font-medium">
                    "Simple Present Tense — uses, forms, negatives, questions, adverbs of frequency. Third-person singular 's/es' rule. Time expressions: every day, always, usually..."
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              PANEL 2 — QUESTION BLUEPRINT
          ============================================================ */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  2. Choose your question types
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Select the question types you want. You can change the number of questions and marks.
                </p>
              </div>

              {/* Presets Selector Bar */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Recommended Exam Presets
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'standard', label: 'Standard Exam', desc: 'Balanced 40-mark mix' },
                    { id: 'quick', label: 'Quick Test', desc: '10-mark fast check' },
                    { id: 'grammar', label: 'Grammar Test', desc: 'Focused syntax drills' },
                    { id: 'reading', label: 'Reading Test', desc: 'Comprehension & Cloze' },
                    { id: 'custom', label: 'Custom', desc: 'Tailored by you' }
                  ].map((p) => {
                    const isActive = activePreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleApplyPreset(p.id as any)}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                          isActive
                            ? 'bg-indigo-600 text-white ring-2 ring-indigo-600/30'
                            : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Totals Summary Bar */}
              <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 flex items-center justify-between text-xs text-indigo-950 font-bold">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-indigo-600 uppercase tracking-wider text-[10px]">Total Questions: </span>
                    <span className="text-sm font-black text-indigo-950">{totalQuestions}</span>
                  </div>
                  <div>
                    <span className="text-indigo-600 uppercase tracking-wider text-[10px]">Total Marks: </span>
                    <span className="text-sm font-black text-indigo-950">{totalMarks}</span>
                  </div>
                </div>

                <div className="text-[11px] font-semibold text-indigo-800">
                  {enabledTypesCount} Question Types Selected
                </div>
              </div>

              {/* 15 Question Types Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {blueprintItems.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        item.enabled
                          ? 'bg-white border-indigo-300 shadow-sm'
                          : 'bg-slate-50/60 border-slate-200 opacity-60 hover:opacity-80'
                      }`}
                    >
                      {/* Checkbox and Label */}
                      <label className="flex items-center gap-3 cursor-pointer min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={() => handleToggleItem(item.id)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-black text-slate-900 truncate">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {item.description}
                          </div>
                        </div>
                      </label>

                      {/* Stepper controls */}
                      {item.enabled ? (
                        <div className="flex items-center gap-3 shrink-0">
                          {/* Number Stepper */}
                          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleCountChange(item.id, -1)}
                              className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center font-black text-xs cursor-pointer shadow-2xs"
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-xs font-black text-slate-900">
                              {item.count}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCountChange(item.id, 1)}
                              className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center font-black text-xs cursor-pointer shadow-2xs"
                            >
                              +
                            </button>
                          </div>

                          {/* Marks Input */}
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={item.marksPerItem}
                              onChange={(e) =>
                                handleMarksChange(item.id, parseInt(e.target.value) || 1)
                              }
                              className="w-12 px-2 py-1 text-xs font-black text-center bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="text-[10px] font-bold text-slate-500">m</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400">Disabled</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================
              PANEL 3 — MEDIA (CONDITIONAL)
          ============================================================ */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  3. Add Media
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Upload any images, audio, or videos required by your questions.
                </p>
              </div>

              {!requiresMedia ? (
                <div className="p-8 text-center rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-black text-slate-900">
                    No media is required for this exam.
                  </div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Your selected question blueprint consists of text and passage-based tasks. You can proceed directly to Exam Settings.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-all inline-flex items-center gap-1.5"
                  >
                    <span>Continue to Settings</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Picture Questions */}
                  {requiresPicture && (
                    <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
                        <ImageIcon className="w-4 h-4 text-indigo-600" />
                        <span>PICTURE QUESTIONS</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-800 cursor-pointer shadow-2xs transition-colors inline-flex items-center gap-2">
                          <UploadCloud className="w-4 h-4 text-indigo-600" />
                          <span>Upload Image (JPG, PNG, WEBP)</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  setPictureFile(ev.target?.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        {pictureFile && (
                          <div className="flex items-center gap-2 text-xs text-emerald-700 font-bold">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Image Loaded</span>
                          </div>
                        )}
                      </div>
                      {pictureFile && (
                        <div className="mt-2 max-w-xs rounded-xl overflow-hidden border border-slate-300">
                          <img src={pictureFile} alt="Preview" className="w-full h-auto object-cover" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Video Questions */}
                  {requiresVideo && (
                    <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
                        <Video className="w-4 h-4 text-indigo-600" />
                        <span>VIDEO QUESTION</span>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">
                          Video URL (YouTube or MP4)
                        </label>
                        <input
                          type="text"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800">
                            Video Transcript <span className="text-rose-600">*</span>
                          </label>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Required for AI accuracy
                          </span>
                        </div>
                        <textarea
                          rows={4}
                          value={videoTranscript}
                          onChange={(e) => setVideoTranscript(e.target.value)}
                          placeholder="Paste the transcript here... The transcript helps AI create accurate questions from the video."
                          className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white placeholder:text-slate-500 resize-y"
                        />
                      </div>
                    </div>
                  )}

                  {/* Audio Questions */}
                  {requiresAudio && (
                    <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
                        <Headphones className="w-4 h-4 text-indigo-600" />
                        <span>AUDIO QUESTION</span>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">
                          Audio URL (MP3 or Web Audio)
                        </label>
                        <input
                          type="text"
                          value={audioUrl}
                          onChange={(e) => setAudioUrl(e.target.value)}
                          placeholder="https://example.com/audio.mp3"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800">
                            Audio Transcript <span className="text-rose-600">*</span>
                          </label>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Required for AI accuracy
                          </span>
                        </div>
                        <textarea
                          rows={4}
                          value={audioTranscript}
                          onChange={(e) => setAudioTranscript(e.target.value)}
                          placeholder="Paste the transcript here... The transcript helps AI create accurate questions from the audio."
                          className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white placeholder:text-slate-500 resize-y"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              PANEL 4 — EXAM SETTINGS
          ============================================================ */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  4. Exam Settings
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Configure timing, difficulty, and student feedback options.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white shadow-2xs"
                  >
                    <option value="English Language">English Language</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="History">History</option>
                    <option value="Geography">Geography</option>
                    <option value="General Knowledge">General Knowledge</option>
                  </select>
                </div>

                {/* Grade */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Grade Level</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white shadow-2xs"
                  >
                    <option value="Grade 6">Grade 6</option>
                    <option value="Grade 7">Grade 7</option>
                    <option value="Grade 8">Grade 8</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 11">Grade 11 (O/L)</option>
                    <option value="Grade 12">Grade 12 (A/L)</option>
                  </select>
                </div>

                {/* Difficulty */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white shadow-2xs"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                {/* Duration */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Duration (Minutes)</label>
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 45)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white shadow-2xs"
                  />
                </div>

                {/* Pass Mark */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Pass Mark (%)</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={passPercentage}
                    onChange={(e) => setPassPercentage(parseInt(e.target.value) || 50)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white shadow-2xs"
                  />
                </div>

                {/* Question Order */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Question Order</label>
                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="qorder"
                        checked={questionOrder === 'fixed'}
                        onChange={() => setQuestionOrder('fixed')}
                        className="text-indigo-600"
                      />
                      <span>Fixed</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="qorder"
                        checked={questionOrder === 'shuffle'}
                        onChange={() => setQuestionOrder('shuffle')}
                        className="text-indigo-600"
                      />
                      <span>Shuffle</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Exam Summary Card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  EXAM SUMMARY
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Question Types: </span>
                    <span className="font-bold text-slate-900">{enabledTypesCount}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Total Questions: </span>
                    <span className="font-bold text-slate-900">{totalQuestions}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Total Marks: </span>
                    <span className="font-bold text-slate-900">{totalMarks}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Duration: </span>
                    <span className="font-bold text-slate-900">{durationMinutes} minutes</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Difficulty: </span>
                    <span className="font-bold text-slate-900">{difficulty}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Pass Mark: </span>
                    <span className="font-bold text-slate-900">{passPercentage}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              PANEL 5 — AI PROMPT GENERATION & JSON IMPORT
          ============================================================ */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  5. Generate Your AI Exam
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  EdTechra has prepared the instructions for your AI assistant.
                </p>
              </div>

              {/* Instructions banner */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1 text-slate-700">
                  <div className="font-bold text-indigo-950">
                    Two simple steps to complete your examination:
                  </div>
                  <p className="leading-relaxed">
                    1. Click <strong>Copy AI Prompt</strong> and paste it into ChatGPT, Gemini, or Claude.<br />
                    2. Copy the JSON response from your AI and paste it below, then click <strong>Create Exam</strong>.
                  </p>
                </div>
              </div>

              {/* Read-Only AI Prompt Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    AI PROMPT ({generatedAIPrompt.length} characters)
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
                  >
                    {copiedPrompt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPrompt ? 'Copied to Clipboard!' : 'Copy AI Prompt'}</span>
                  </button>
                </div>

                <pre className="p-4 bg-slate-50 border border-slate-300 rounded-2xl text-[11px] font-mono text-slate-900 whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed select-all">
                  {generatedAIPrompt}
                </pre>
              </div>

              {/* Paste JSON Area */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Paste AI-generated JSON
                  </label>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setPastedJson(text);
                          const res = validateExamJSON(text);
                          setValidationResult(res);
                        }
                      } catch {}
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Paste from Clipboard</span>
                  </button>
                </div>

                <textarea
                  rows={8}
                  value={pastedJson}
                  onChange={(e) => {
                    setPastedJson(e.target.value);
                    setValidationResult(null);
                  }}
                  placeholder="Paste the JSON response from your AI here (with or without ```json code fences)..."
                  className="w-full p-4 bg-white border border-slate-300 rounded-2xl text-xs font-mono text-slate-900 placeholder:text-slate-500 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y"
                />

                {/* Validation Feedback & Friendly Correction Banner */}
                {validationResult && (
                  <div
                    className={`p-4 rounded-2xl border text-xs space-y-2 animate-fadeIn ${
                      validationResult.isValid
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : 'bg-rose-50 border-rose-200 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <div className="flex items-center gap-2">
                        {validationResult.isValid ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>
                          {validationResult.isValid
                            ? 'Exam JSON is valid and ready to build!'
                            : `Your AI response has ${validationResult.errors.length} issue${
                                validationResult.errors.length === 1 ? '' : 's'
                              }.`}
                        </span>
                      </div>

                      {!validationResult.isValid && (
                        <button
                          type="button"
                          onClick={handleCopyCorrection}
                          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                        >
                          {copiedCorrection ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedCorrection ? 'Copied Prompt!' : 'Copy Correction Prompt'}</span>
                        </button>
                      )}
                    </div>

                    {!validationResult.isValid && (
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-800 font-medium pt-1">
                        {validationResult.errors.map((err, idx) => (
                          <li key={idx}>{err.message}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Wizard Footer Controls */}
      {currentStep > 0 && (
      <div className="px-6 py-4 sm:px-10 bg-slate-50 border-t border-slate-200 shrink-0 z-20">
        <div className="w-full max-w-4xl mx-auto flex items-center justify-between">
          <div>
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold shadow-2xs cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold shadow-2xs cursor-pointer transition-colors"
            >
              Cancel
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                disabled={
                  (currentStep === 1 && !canGoNextFromStep1) ||
                  (currentStep === 2 && !canGoNextFromStep2) ||
                  (currentStep === 3 && !canGoNextFromStep3)
                }
                onClick={() => setCurrentStep((prev) => (prev + 1) as any)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-40"
              >
                <span>{currentStep === 4 ? 'Generate AI Prompt →' : 'Next →'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!pastedJson.trim() || isProcessingJson}
                onClick={handleCreateExamFromJSON}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all active:scale-95 disabled:opacity-40"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isProcessingJson ? 'Building Exam...' : 'Create Exam'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
