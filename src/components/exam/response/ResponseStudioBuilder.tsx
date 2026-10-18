// ============================================================================
// EDTECHRA RESPONSE STUDIO BUILDER (POLL / SURVEY / FEEDBACK)
// Dedicated 4-Step Workflow:
// Configure (Step 1) -> Generate AI Prompt (Step 2) -> Paste AI Result (Step 3) -> Preview & Publish (Step 4)
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  ClipboardList,
  MessageSquareHeart,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Edit3,
  Save,
  Send,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Shield,
  Calendar,
  Users,
  Globe,
  Star,
  BrainCircuit,
  FileJson,
} from 'lucide-react';
import { CanonicalAssessmentV2, ResponseSubType } from '../shared/ExamSchema';
import {
  ResponseStudioConfig,
  ResponseStudioPayload,
  ResponseStudioQuestion,
  ResponseQuestionType,
  PollTypeOption,
  FeedbackStyleOption,
  DEFAULT_RESPONSE_STUDIO_CONFIG,
  SURVEY_QUESTION_TYPE_OPTIONS,
  LIKERT_DEFAULT_OPTIONS,
  YES_NO_DEFAULT_OPTIONS,
  generateResponseStudioPrompt,
  validateResponseStudioJson,
  buildCanonicalFromResponseStudio,
  extractResponseStudioFromCanonical,
  mapPollTypeToQuestionType,
} from './responseStudioSchema';
import { supabase } from '../../../lib/supabase';

interface ResponseStudioBuilderProps {
  classroomId: string;
  initialSubType?: ResponseSubType | null;
  initialAssessment?: CanonicalAssessmentV2 | null;
  initialStatus?: 'draft' | 'published';
  onSave: (assessment: CanonicalAssessmentV2, status: 'draft' | 'published') => Promise<void>;
  onCancel?: () => void;
}

const LANGUAGES = [
  'English',
  'Tamil',
  'Hindi',
  'Malayalam',
  'Spanish',
  'French',
  'Arabic',
  'Bilingual (English + Native)',
];

const POLL_TYPES: PollTypeOption[] = [
  'Single Choice Poll',
  'Multiple Selection Poll',
  'Yes / No Poll',
  'Rating Poll (1 to 5)',
  'Opinion Ranking Poll',
];

const FEEDBACK_STYLES: FeedbackStyleOption[] = [
  'Lesson Feedback',
  'Teacher / Teaching Feedback',
  'Course / Module Feedback',
  'Difficulty / Understanding Check',
  'Open Reflections',
];

const QUESTION_TYPE_LABELS: Record<ResponseQuestionType, string> = {
  single_choice: 'Single Choice',
  multiple_selection: 'Multiple Selection (Checkboxes)',
  yes_no: 'Yes / No',
  rating: 'Rating Scale',
  ranking: 'Opinion Ranking',
  likert: 'Likert Scale (5-Point)',
  short_answer: 'Short Answer',
  long_text: 'Long Text',
};

export const ResponseStudioBuilder: React.FC<ResponseStudioBuilderProps> = ({
  classroomId,
  initialSubType = null,
  initialAssessment = null,
  initialStatus: _initialStatus = 'draft',
  onSave,
  onCancel,
}) => {
  const existingData = useMemo(() => {
    if (initialAssessment && (initialAssessment.sections?.[0]?.questions?.length || 0) > 0) {
      return extractResponseStudioFromCanonical(initialAssessment, initialSubType || undefined);
    }
    return null;
  }, [initialAssessment, initialSubType]);

  // Screen state: if initialSubType or existingData is present, skip type picker; otherwise show type picker
  const [selectedType, setSelectedType] = useState<ResponseSubType | null>(
    existingData?.config.responseType || initialSubType || null
  );

  // 4-step workflow: 1 = Configure, 2 = Generate AI Prompt, 3 = Paste AI Result, 4 = Preview & Publish
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(existingData ? 4 : 1);

  const [config, setConfig] = useState<ResponseStudioConfig>(() => {
    if (existingData) return existingData.config;
    const base = { ...DEFAULT_RESPONSE_STUDIO_CONFIG };
    if (initialSubType) {
      base.responseType = initialSubType;
      if (initialSubType === 'feedback') {
        base.isAnonymous = true; // Recommended for honest feedback
      }
    }
    return base;
  });

  const [customSurveyCount, setCustomSurveyCount] = useState<boolean>(false);
  const [classroomStudents, setClassroomStudents] = useState<Array<{ id: string; name: string; email?: string }>>([]);

  // Step 2 & 3 state
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [rawJsonInput, setRawJsonInput] = useState<string>(() => {
    if (existingData) {
      return JSON.stringify(existingData.payload, null, 2);
    }
    return '';
  });
  const [validationStatus, setValidationStatus] = useState<{
    checked: boolean;
    valid: boolean;
    errors: string[];
  }>({
    checked: Boolean(existingData),
    valid: Boolean(existingData),
    errors: [],
  });

  // Step 4 state (Preview & Inline Edit)
  const [payload, setPayload] = useState<ResponseStudioPayload | null>(
    existingData ? existingData.payload : null
  );
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Interactive preview state so teacher can test clicking options in Step 4
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});

  // Fetch classroom students for "Selected Students" target audience option
  useEffect(() => {
    if (!classroomId || !supabase) return;
    let mounted = true;
    (async () => {
      try {
        const { data: members } = await supabase
          .from('classroom_members')
          .select('user_id, profiles:user_id(id, full_name, email)')
          .eq('classroom_id', classroomId)
          .eq('role', 'student');
        if (mounted && Array.isArray(members)) {
          const list = members.map((m: any) => ({
            id: m.user_id,
            name: m.profiles?.full_name || m.profiles?.email || 'Student',
            email: m.profiles?.email || '',
          }));
          setClassroomStudents(list);
        }
      } catch {
        // Ignore if offline or table unavailable
      }
    })();
    return () => {
      mounted = false;
    };
  }, [classroomId]);

  const generatedPrompt = useMemo(() => {
    return generateResponseStudioPrompt(config);
  }, [config]);

  const handleSelectResponseType = (type: ResponseSubType) => {
    setSelectedType(type);
    setConfig((prev) => ({
      ...prev,
      responseType: type,
      isAnonymous: type === 'feedback' ? true : prev.isAnonymous,
    }));
    setCurrentStep(1);
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      // Fallback copy
      const el = document.createElement('textarea');
      el.value = generatedPrompt;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    }
  };

  const handleGenerateSampleJson = () => {
    const sampleTitle =
      config.title.trim() ||
      (config.responseType === 'poll'
        ? 'Quick Class Poll: Today’s Topic'
        : config.responseType === 'feedback'
        ? 'Lesson Feedback & Reflection'
        : 'Student Learning & Preferences Survey');
    const sampleDesc =
      config.topic.trim() ||
      (config.responseType === 'poll'
        ? 'Cast your vote below. It only takes 15 seconds!'
        : config.responseType === 'feedback'
        ? 'Share your honest thoughts on today’s lesson so we can improve together.'
        : 'Please answer the following questions to help tailor upcoming lessons.');

    let sampleQuestions: ResponseStudioQuestion[] = [];
    if (config.responseType === 'poll') {
      const qType = mapPollTypeToQuestionType(config.pollType);
      const count = config.pollQuestionCount || 1;
      for (let i = 1; i <= count; i++) {
        sampleQuestions.push({
          id: `q${i}`,
          type: qType,
          question:
            i === 1
              ? config.topic.trim() || 'Which learning activity helped you understand today’s lesson best?'
              : `Follow-up Poll Question #${i}`,
          ...(qType === 'yes_no'
            ? { options: ['Yes', 'No'] }
            : qType === 'rating'
            ? { scale: 5 }
            : {
                options: [
                  'Interactive Live Practice',
                  'Visual Examples & Diagrams',
                  'Group Discussion',
                  'Guided Problem Solving',
                ],
              }),
          required: true,
        });
      }
    } else if (config.responseType === 'feedback') {
      sampleQuestions = ([
        {
          id: 'q1',
          type: 'rating',
          question: 'How clear and easy to follow was today’s lesson?',
          scale: 5,
          required: true,
        },
        {
          id: 'q2',
          type: 'single_choice',
          question: 'How did you feel about the pace of the class today?',
          options: ['Too fast', 'Just right', 'Too slow', 'Needed more examples'],
          required: true,
        },
        {
          id: 'q3',
          type: 'likert',
          question: 'I feel confident applying what we learned today on my own.',
          options: [...LIKERT_DEFAULT_OPTIONS],
          required: true,
        },
        {
          id: 'q4',
          type: 'long_text',
          question: 'What part of today’s lesson was most helpful or still feels confusing?',
          required: false,
        },
      ] as ResponseStudioQuestion[]).slice(0, config.feedbackQuestionCount || 4);
    } else {
      sampleQuestions = ([
        {
          id: 'q1',
          type: 'single_choice',
          question: 'Which study format do you prefer most when preparing for class?',
          options: ['Short video summaries', 'Practice quizzes', 'Reading notes', 'Flashcards'],
          required: config.requiredQuestions,
        },
        {
          id: 'q2',
          type: 'multiple_selection',
          question: 'Which areas would you like extra practice in this week?',
          options: ['Core concepts', 'Real-world examples', 'Speaking & communication', 'Problem solving'],
          required: config.requiredQuestions,
        },
        {
          id: 'q3',
          type: 'rating',
          question: 'Rate your current confidence level with this unit so far.',
          scale: 5,
          required: config.requiredQuestions,
        },
        {
          id: 'q4',
          type: 'likert',
          question: 'The classroom activities keep me engaged and motivated.',
          options: [...LIKERT_DEFAULT_OPTIONS],
          required: config.requiredQuestions,
        },
        {
          id: 'q5',
          type: 'short_answer',
          question: 'What is one topic you would like us to cover next?',
          required: false,
        },
      ] as ResponseStudioQuestion[]).slice(0, config.surveyQuestionCount || 5);
    }

    const samplePayload: ResponseStudioPayload = {
      type: config.responseType,
      title: sampleTitle,
      description: sampleDesc,
      anonymous: config.isAnonymous,
      questions: sampleQuestions,
    };

    const formatted = JSON.stringify(samplePayload, null, 2);
    setRawJsonInput(formatted);
    const result = validateResponseStudioJson(formatted, config.responseType);
    setValidationStatus({
      checked: true,
      valid: result.valid,
      errors: result.errors,
    });
    if (result.valid && result.payload) {
      setPayload(result.payload);
    }
  };

  const handleValidateAndPreview = () => {
    const result = validateResponseStudioJson(rawJsonInput, config.responseType);
    setValidationStatus({
      checked: true,
      valid: result.valid,
      errors: result.errors,
    });

    if (result.valid && result.payload) {
      setPayload(result.payload);
      setConfig((prev) => ({
        ...prev,
        responseType: result.payload!.type,
        title: result.payload!.title || prev.title,
        isAnonymous: result.payload!.anonymous ?? prev.isAnonymous,
      }));
      setCurrentStep(4);
    }
  };

  const handleSaveAssessment = async (targetStatus: 'draft' | 'published') => {
    if (!payload) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const canonical = buildCanonicalFromResponseStudio(payload, config);
      await onSave(canonical, targetStatus);
      setSaveMessage(
        targetStatus === 'published'
          ? 'Published successfully!'
          : 'Draft saved successfully!'
      );
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      alert(`Failed to save ${config.responseType}: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Inline Editor handlers (Step 4)
  const updateQuestion = (index: number, updater: (q: ResponseStudioQuestion) => ResponseStudioQuestion) => {
    if (!payload) return;
    const nextQuestions = [...payload.questions];
    nextQuestions[index] = updater(nextQuestions[index]);
    const nextPayload = { ...payload, questions: nextQuestions };
    setPayload(nextPayload);
    setRawJsonInput(JSON.stringify(nextPayload, null, 2));
  };

  const handleAddQuestion = () => {
    if (!payload) return;
    const nextIdx = payload.questions.length + 1;
    const defaultType: ResponseQuestionType =
      payload.type === 'poll'
        ? mapPollTypeToQuestionType(config.pollType)
        : payload.type === 'feedback'
        ? 'rating'
        : 'single_choice';

    const newQ: ResponseStudioQuestion = {
      id: `q${Date.now().toString().slice(-4)}_${nextIdx}`,
      type: defaultType,
      question: `New Question #${nextIdx}`,
      ...(defaultType === 'single_choice' || defaultType === 'multiple_selection' || defaultType === 'ranking'
        ? { options: ['Option 1', 'Option 2', 'Option 3'] }
        : defaultType === 'yes_no'
        ? { options: [...YES_NO_DEFAULT_OPTIONS] }
        : defaultType === 'likert'
        ? { options: [...LIKERT_DEFAULT_OPTIONS] }
        : defaultType === 'rating'
        ? { scale: 5 }
        : {}),
      required: true,
    };

    const nextPayload = {
      ...payload,
      questions: [...payload.questions, newQ],
    };
    setPayload(nextPayload);
    setRawJsonInput(JSON.stringify(nextPayload, null, 2));
  };

  const handleDeleteQuestion = (index: number) => {
    if (!payload || payload.questions.length <= 1) return;
    const nextQuestions = payload.questions.filter((_, idx) => idx !== index);
    const nextPayload = { ...payload, questions: nextQuestions };
    setPayload(nextPayload);
    setRawJsonInput(JSON.stringify(nextPayload, null, 2));
  };

  const handleMoveQuestion = (index: number, direction: -1 | 1) => {
    if (!payload) return;
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= payload.questions.length) return;
    const nextQuestions = [...payload.questions];
    const temp = nextQuestions[index];
    nextQuestions[index] = nextQuestions[targetIdx];
    nextQuestions[targetIdx] = temp;
    const nextPayload = { ...payload, questions: nextQuestions };
    setPayload(nextPayload);
    setRawJsonInput(JSON.stringify(nextPayload, null, 2));
  };

  // ============================================================================
  // PART 3: TYPE SELECTION SCREEN (POLL | SURVEY | FEEDBACK)
  // ============================================================================
  if (!selectedType) {
    return (
      <div className="min-h-screen bg-[#060d1f] text-white flex flex-col">
        {/* Top Bar */}
        <header className="h-16 px-6 bg-[#0b1530] border-b border-blue-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
                <MessageSquareHeart className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 block">
                  EdTechra Response Studio
                </span>
                <h1 className="text-sm font-black text-white">Polls • Surveys • Feedback</h1>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-10 flex flex-col justify-center">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Feedback &amp; Response Studio</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              What would you like to collect?
            </h2>
            <p className="text-sm text-slate-300">
              Choose the response format that fits your classroom goal. No marks, timers, or exam stress.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CARD 1: POLL */}
            <div
              onClick={() => handleSelectResponseType('poll')}
              className="p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-[#0f243c] to-[#0a1628] border-2 border-cyan-500/40 hover:border-cyan-400 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-cyan-500/15 group flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all">
                  <BarChart3 className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    Quick Class Vote
                  </span>
                  <h3 className="text-2xl font-black text-white">POLL</h3>
                  <p className="text-sm text-slate-300 leading-relaxed pt-1">
                    Ask 1 to 5 quick questions and see instant results.
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-800 text-xs text-slate-300">
                  <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                    Examples:
                  </div>
                  <ul className="space-y-1.5 text-slate-200">
                    <li>• Yes / No vote</li>
                    <li>• Best option choice</li>
                    <li>• Quick class opinion</li>
                    <li>• Rating vote</li>
                  </ul>
                </div>
              </div>

              <button
                type="button"
                className="w-full py-3.5 px-5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all"
              >
                <span>Create Poll</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* CARD 2: SURVEY */}
            <div
              onClick={() => handleSelectResponseType('survey')}
              className="p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-[#10262e] to-[#0a1822] border-2 border-teal-500/40 hover:border-teal-400 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-teal-500/15 group flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 group-hover:bg-teal-500 group-hover:text-slate-950 transition-all">
                  <ClipboardList className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                    Structured Questionnaire
                  </span>
                  <h3 className="text-2xl font-black text-white">SURVEY</h3>
                  <p className="text-sm text-slate-300 leading-relaxed pt-1">
                    Collect detailed responses across multiple questions.
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-800 text-xs text-slate-300">
                  <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                    Examples:
                  </div>
                  <ul className="space-y-1.5 text-slate-200">
                    <li>• Student interest survey</li>
                    <li>• Learning needs survey</li>
                    <li>• Parent / student questionnaire</li>
                    <li>• Event registration survey</li>
                  </ul>
                </div>
              </div>

              <button
                type="button"
                className="w-full py-3.5 px-5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25 transition-all"
              >
                <span>Create Survey</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* CARD 3: FEEDBACK */}
            <div
              onClick={() => handleSelectResponseType('feedback')}
              className="p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-[#1e1b38] to-[#0f1126] border-2 border-amber-500/40 hover:border-amber-400 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-500/15 group flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                  <MessageSquareHeart className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Lesson &amp; Course Reflection
                  </span>
                  <h3 className="text-2xl font-black text-white">FEEDBACK</h3>
                  <p className="text-sm text-slate-300 leading-relaxed pt-1">
                    Understand how students felt about a lesson, topic, teacher, or activity.
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-800 text-xs text-slate-300">
                  <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                    Examples:
                  </div>
                  <ul className="space-y-1.5 text-slate-200">
                    <li>• Lesson feedback</li>
                    <li>• Course evaluation</li>
                    <li>• Difficulty check</li>
                    <li>• &ldquo;What confused you today?&rdquo;</li>
                  </ul>
                </div>
              </div>

              <button
                type="button"
                className="w-full py-3.5 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all"
              >
                <span>Create Feedback</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const badgeColors: Record<ResponseSubType, string> = {
    poll: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    survey: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    feedback: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  };

  return (
    <div className="min-h-screen bg-[#060d1f] text-white flex flex-col">
      {/* ============================================================================
          HEADER & TOP 4-STEP PROGRESS BAR
      ============================================================================ */}
      <header className="bg-[#0b1530] border-b border-blue-900/60 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (currentStep > 1) {
                  setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
                } else if (!initialAssessment) {
                  setSelectedType(null);
                } else if (onCancel) {
                  onCancel();
                }
              }}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{currentStep > 1 ? 'Back' : 'Change Type'}</span>
            </button>

            <div className="flex items-center gap-2.5">
              <span
                className={`px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider ${
                  badgeColors[config.responseType]
                }`}
              >
                {config.responseType.toUpperCase()}
              </span>
              <h1 className="text-sm sm:text-base font-black text-white truncate max-w-xs sm:max-w-md">
                {config.title || `New ${config.responseType.charAt(0).toUpperCase() + config.responseType.slice(1)}`}
              </h1>
            </div>
          </div>

          {/* Type Switcher Pills + Exit */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              {(['poll', 'survey', 'feedback'] as ResponseSubType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      responseType: t,
                      isAnonymous: t === 'feedback' ? true : prev.isAnonymous,
                    }))
                  }
                  className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all ${
                    config.responseType === t
                      ? 'bg-teal-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-300"
              >
                Exit Studio
              </button>
            )}
          </div>
        </div>

        {/* 4-Step Progress Bar */}
        <div className="bg-[#081026] border-t border-blue-950/80 px-4 sm:px-6 py-3">
          <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { step: 1, label: 'Configure', sub: 'Step 1' },
              { step: 2, label: 'Generate AI Prompt', sub: 'Step 2' },
              { step: 3, label: 'Paste AI Result', sub: 'Step 3' },
              { step: 4, label: 'Preview & Publish', sub: 'Step 4' },
            ].map((item) => {
              const isActive = currentStep === item.step;
              const isCompleted = currentStep > item.step || (item.step === 4 && Boolean(payload));
              const isClickable = item.step < 4 || Boolean(payload);
              return (
                <button
                  key={item.step}
                  type="button"
                  disabled={!isClickable}
                  onClick={() => {
                    if (isClickable) setCurrentStep(item.step as 1 | 2 | 3 | 4);
                  }}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                    isActive
                      ? 'bg-teal-500/15 border-teal-400 text-white shadow-sm'
                      : isCompleted
                      ? 'bg-slate-900/80 border-teal-500/30 text-teal-300 hover:bg-slate-800/70'
                      : 'bg-slate-900/40 border-slate-800/80 text-slate-500'
                  } ${!isClickable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                      isActive
                        ? 'bg-teal-400 text-slate-950'
                        : isCompleted
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isCompleted && !isActive ? <Check className="w-4 h-4" /> : item.step}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-wider opacity-75">
                      {item.sub}
                    </div>
                    <div className="text-xs font-black truncate">{item.label}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ============================================================================
          STEP BODY
      ============================================================================ */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* ==========================================================================
            STEP 1: CONFIGURATION SCREEN
        ========================================================================== */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-[#0b1530] border border-blue-900/60 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-teal-400">
                    Step 1 of 4 • Configure {config.responseType.toUpperCase()}
                  </span>
                  <h2 className="text-xl font-black text-white mt-0.5">
                    {config.responseType === 'poll'
                      ? 'Poll Configuration'
                      : config.responseType === 'feedback'
                      ? 'Feedback Form Configuration'
                      : 'Survey Configuration'}
                  </h2>
                </div>
              </div>

              {/* Common Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-300">
                    Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.title}
                    onChange={(e) => setConfig({ ...config, title: e.target.value })}
                    placeholder={
                      config.responseType === 'poll'
                        ? "e.g., Quick Poll: Which topic should we review tomorrow?"
                        : config.responseType === 'feedback'
                        ? "e.g., Today's English Grammar Lesson Feedback"
                        : 'e.g., Student Learning Preferences & Study Habits Survey'
                    }
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white text-sm focus:border-teal-400 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-300">
                    Topic / Purpose <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={config.topic}
                    onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                    placeholder="e.g., Collect feedback on today's English grammar lesson and check which concepts students found difficult."
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white text-sm focus:border-teal-400 focus:outline-none"
                  />
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-300">
                    <Globe className="w-3.5 h-3.5 text-teal-400" />
                    <span>Language</span>
                  </label>
                  <select
                    value={config.language}
                    onChange={(e) => setConfig({ ...config, language: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white text-sm focus:border-teal-400 focus:outline-none"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Response Deadline */}
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-teal-400" />
                    <span>Response Deadline (Optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={config.deadline}
                    onChange={(e) => setConfig({ ...config, deadline: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white text-sm focus:border-teal-400 focus:outline-none"
                  />
                </div>

                {/* Target Audience */}
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-300">
                    <Users className="w-3.5 h-3.5 text-teal-400" />
                    <span>Target Audience</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, targetAudience: 'entire_class' })}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-black transition-all ${
                        config.targetAudience === 'entire_class'
                          ? 'bg-teal-500/20 border-teal-400 text-teal-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Entire Class
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, targetAudience: 'selected_students' })}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-black transition-all ${
                        config.targetAudience === 'selected_students'
                          ? 'bg-teal-500/20 border-teal-400 text-teal-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Selected Students
                    </button>
                  </div>
                </div>

                {/* Anonymous Responses */}
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-300">
                    <Shield className="w-3.5 h-3.5 text-teal-400" />
                    <span>
                      Anonymous Mode{' '}
                      {config.responseType === 'feedback' && (
                        <span className="text-amber-300 font-bold">(Recommended for honest feedback)</span>
                      )}
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, isAnonymous: true })}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-black transition-all ${
                        config.isAnonymous
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      ON (Anonymous)
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, isAnonymous: false })}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-black transition-all ${
                        !config.isAnonymous
                          ? 'bg-teal-500/20 border-teal-400 text-teal-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      OFF (Show Names)
                    </button>
                  </div>
                </div>

                {/* Selected Students Picker */}
                {config.targetAudience === 'selected_students' && (
                  <div className="md:col-span-2 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="text-xs font-black uppercase tracking-wider text-teal-300">
                      Select Students ({config.selectedStudentIds.length} selected)
                    </div>
                    {classroomStudents.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        No students found in roster yet. All enrolled students will be able to access when published.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                        {classroomStudents.map((stu) => {
                          const checked = config.selectedStudentIds.includes(stu.id);
                          return (
                            <label
                              key={stu.id}
                              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                                checked
                                  ? 'bg-teal-500/15 border-teal-500/50 text-white'
                                  : 'bg-slate-950/60 border-slate-800 text-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...config.selectedStudentIds, stu.id]
                                    : config.selectedStudentIds.filter((id) => id !== stu.id);
                                  setConfig({ ...config, selectedStudentIds: next });
                                }}
                                className="rounded text-teal-500"
                              />
                              <span className="truncate font-bold">{stu.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ==================================================================
                  4A. POLL-SPECIFIC CONFIGURATION
              ================================================================== */}
              {config.responseType === 'poll' && (
                <div className="pt-6 border-t border-slate-800 space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400">
                    Poll Settings
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-300">
                        Poll Type
                      </label>
                      <div className="space-y-2">
                        {POLL_TYPES.map((pt) => (
                          <button
                            key={pt}
                            type="button"
                            onClick={() => setConfig({ ...config, pollType: pt })}
                            className={`w-full py-2.5 px-4 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition-all ${
                              config.pollType === pt
                                ? 'bg-cyan-500/20 border-cyan-400 text-white'
                                : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <span>{pt}</span>
                            {config.pollType === pt && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-300">
                          Number of Questions
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {[1, 2, 3, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setConfig({ ...config, pollQuestionCount: num })}
                              className={`py-2.5 rounded-xl border text-xs font-black transition-all ${
                                config.pollQuestionCount === num
                                  ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                              }`}
                            >
                              {num} {num === 1 ? '(Default)' : ''}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer">
                          <div>
                            <div className="text-xs font-black text-white">
                              Allow students to see live poll results after voting
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Displays live percentage bar charts once their vote is submitted
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={config.allowSeeResults}
                            onChange={(e) => setConfig({ ...config, allowSeeResults: e.target.checked })}
                            className="w-4 h-4 accent-cyan-400"
                          />
                        </label>

                        <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer">
                          <div>
                            <div className="text-xs font-black text-white">Allow changing vote</div>
                            <div className="text-[11px] text-slate-400">
                              Let students update their selected poll option later
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={config.allowChangeResponse}
                            onChange={(e) => setConfig({ ...config, allowChangeResponse: e.target.checked })}
                            className="w-4 h-4 accent-cyan-400"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================================
                  4B. SURVEY-SPECIFIC CONFIGURATION
              ================================================================== */}
              {config.responseType === 'survey' && (
                <div className="pt-6 border-t border-slate-800 space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-wider text-teal-400">
                    Survey Settings
                  </h3>

                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-300">
                      Number of Questions
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {[3, 5, 8, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setCustomSurveyCount(false);
                            setConfig({ ...config, surveyQuestionCount: num });
                          }}
                          className={`px-4 py-2.5 rounded-xl border text-xs font-black transition-all ${
                            !customSurveyCount && config.surveyQuestionCount === num
                              ? 'bg-teal-500 text-slate-950 border-teal-400'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          {num} Questions
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCustomSurveyCount(true)}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-black transition-all ${
                          customSurveyCount
                            ? 'bg-teal-500 text-slate-950 border-teal-400'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        Custom
                      </button>
                      {customSurveyCount && (
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={config.surveyQuestionCount}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              surveyQuestionCount: Math.max(1, Math.min(30, Number(e.target.value) || 1)),
                            })
                          }
                          className="w-24 px-3 py-2 rounded-xl bg-slate-900 border border-teal-400 text-white text-xs font-black"
                        />
                      )}
                    </div>
                  </div>

                  {/* Question Types Selection Mode */}
                  <div className="space-y-3">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-300">
                      Question Types to Include
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, questionSelectionMode: 'auto' })}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                          config.questionSelectionMode === 'auto'
                            ? 'bg-teal-500/20 border-teal-400 text-white'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            config.questionSelectionMode === 'auto' ? 'border-teal-400' : 'border-slate-500'
                          }`}
                        >
                          {config.questionSelectionMode === 'auto' && (
                            <div className="w-2 h-2 rounded-full bg-teal-400" />
                          )}
                        </div>
                        <span className="text-xs font-black">
                          Auto Select Best Question Types (Recommended)
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, questionSelectionMode: 'manual' })}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                          config.questionSelectionMode === 'manual'
                            ? 'bg-teal-500/20 border-teal-400 text-white'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            config.questionSelectionMode === 'manual' ? 'border-teal-400' : 'border-slate-500'
                          }`}
                        >
                          {config.questionSelectionMode === 'manual' && (
                            <div className="w-2 h-2 rounded-full bg-teal-400" />
                          )}
                        </div>
                        <span className="text-xs font-black">Let me choose question types</span>
                      </button>
                    </div>

                    {config.questionSelectionMode === 'manual' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                        {SURVEY_QUESTION_TYPE_OPTIONS.map((opt) => {
                          const isChecked = config.selectedQuestionTypes.includes(opt.type);
                          return (
                            <label
                              key={opt.type}
                              className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-teal-500/15 border-teal-400/60 text-white'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...config.selectedQuestionTypes, opt.type]
                                    : config.selectedQuestionTypes.filter((t) => t !== opt.type);
                                  setConfig({
                                    ...config,
                                    selectedQuestionTypes: next.length > 0 ? next : ['single_choice'],
                                  });
                                }}
                                className="mt-0.5 accent-teal-400"
                              />
                              <div>
                                <div className="text-xs font-black">{opt.label}</div>
                                <div className="text-[11px] text-slate-400">{opt.description}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Survey Rules */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-black text-white">Required Questions</div>
                        <div className="text-[11px] text-slate-400">
                          {config.requiredQuestions ? 'All required' : 'Optional allowed'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({ ...config, requiredQuestions: !config.requiredQuestions })
                        }
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-teal-300"
                      >
                        {config.requiredQuestions ? 'All required' : 'Optional allowed'}
                      </button>
                    </div>

                    <label className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between cursor-pointer">
                      <div>
                        <div className="text-xs font-black text-white">One response per student</div>
                        <div className="text-[11px] text-slate-400">
                          Prevent duplicate submissions from the same student
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.oneResponsePerStudent}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            oneResponsePerStudent: e.target.checked,
                            allowChangeResponse: !e.target.checked,
                          })
                        }
                        className="w-4 h-4 accent-teal-400"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* ==================================================================
                  4C. FEEDBACK-SPECIFIC CONFIGURATION
              ================================================================== */}
              {config.responseType === 'feedback' && (
                <div className="pt-6 border-t border-slate-800 space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-wider text-amber-400">
                    Feedback Form Settings
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-300">
                        Feedback Style
                      </label>
                      <div className="space-y-2">
                        {FEEDBACK_STYLES.map((style) => (
                          <button
                            key={style}
                            type="button"
                            onClick={() => setConfig({ ...config, feedbackStyle: style })}
                            className={`w-full py-2.5 px-4 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition-all ${
                              config.feedbackStyle === style
                                ? 'bg-amber-500/20 border-amber-400 text-white'
                                : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <span>{style}</span>
                            {config.feedbackStyle === style && (
                              <CheckCircle2 className="w-4 h-4 text-amber-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-300">
                          Number of Questions
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {[3, 5, 8, 10].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setConfig({ ...config, feedbackQuestionCount: num })}
                              className={`py-2.5 rounded-xl border text-xs font-black transition-all ${
                                config.feedbackQuestionCount === num
                                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Instructions & Learning Intelligence Tracking */}
              <div className="pt-6 border-t border-slate-800 space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-300">
                    Additional Instructions for AI (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={config.additionalInstructions}
                    onChange={(e) => setConfig({ ...config, additionalInstructions: e.target.value })}
                    placeholder="Any specific questions, options, or classroom context you want included..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white text-sm focus:border-teal-400 focus:outline-none"
                  />
                </div>

                {/* Part 17: Track responses for learning intelligence */}
                <label className="flex items-center justify-between p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                      <BrainCircuit className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-white">
                        Track responses for learning intelligence
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Includes participation &amp; sentiment trends in My Reports and Classroom Learning Intelligence
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.trackResponses}
                    onChange={(e) => setConfig({ ...config, trackResponses: e.target.checked })}
                    className="w-4 h-4 accent-indigo-400"
                  />
                </label>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 flex flex-wrap items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => {
                    handleGenerateSampleJson();
                    setCurrentStep(4);
                    setIsEditing(true);
                  }}
                  className="px-4 py-3 rounded-2xl border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-300"
                >
                  Build Manually in Visual Editor
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-teal-500/25 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate AI Prompt (Step 2)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================================================
            STEP 2: GENERATE AI PROMPT
        ========================================================================== */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-[#0b1530] border border-blue-900/60 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-teal-400">
                    Step 2 of 4 • Generate AI Prompt
                  </span>
                  <h2 className="text-xl font-black text-white mt-0.5">
                    Copy Your Deterministic AI Prompt
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Copy this prompt and paste it into ChatGPT, Claude, Gemini, or any AI assistant.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg ${
                    copiedPrompt
                      ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/25'
                      : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-500/25'
                  }`}
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Prompt</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <pre className="w-full p-5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed max-h-[420px] overflow-y-auto">
                  {generatedPrompt}
                </pre>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-3 rounded-2xl border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-300 flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Configure</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-teal-500/25 transition-all"
                >
                  <span>Next: Paste AI Result (Step 3)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================================================
            STEP 3: PASTE AI RESULT & VALIDATE
        ========================================================================== */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-[#0b1530] border border-blue-900/60 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-teal-400">
                    Step 3 of 4 • Paste AI Result &amp; Validate
                  </span>
                  <h2 className="text-xl font-black text-white mt-0.5">
                    Paste AI-Generated JSON Response
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Paste the JSON output from your AI assistant below. Markdown code fences are stripped automatically.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5"
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPrompt ? 'Prompt Copied' : 'Copy Prompt Again'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateSampleJson}
                    className="px-3.5 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-xs font-bold text-indigo-300 flex items-center gap-1.5"
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    <span>Load Sample JSON</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <textarea
                  rows={14}
                  value={rawJsonInput}
                  onChange={(e) => {
                    setRawJsonInput(e.target.value);
                    setValidationStatus({ checked: false, valid: false, errors: [] });
                  }}
                  placeholder={`{\n  "type": "${config.responseType}",\n  "title": "${config.title || 'Sample Title'}",\n  "description": "Instructions for students",\n  "anonymous": ${config.isAnonymous},\n  "questions": [\n    {\n      "id": "q1",\n      "type": "single_choice",\n      "question": "Your question here?",\n      "options": ["Option A", "Option B"],\n      "required": true\n    }\n  ]\n}`}
                  className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-700 text-xs text-emerald-300 font-mono focus:border-teal-400 focus:outline-none"
                />

                {/* Validation Status Banner */}
                {validationStatus.checked && validationStatus.valid && (
                  <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-3 text-emerald-300 text-sm font-black">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                    <span>✓ Response validated successfully</span>
                  </div>
                )}

                {validationStatus.checked && !validationStatus.valid && (
                  <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 space-y-2 text-rose-200">
                    <div className="flex items-center gap-2 text-sm font-black text-rose-300">
                      <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
                      <span>Please fix the following JSON validation issues:</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      {validationStatus.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-3 rounded-2xl border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-300 flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to AI Prompt</span>
                </button>

                <button
                  type="button"
                  onClick={handleValidateAndPreview}
                  className="px-6 py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-teal-500/25 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Validate &amp; Preview (Step 4)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================================================
            STEP 4: PREVIEW, INLINE EDIT & PUBLISH
        ========================================================================== */}
        {currentStep === 4 && payload && (
          <div className="space-y-6 animate-fadeIn">
            {/* Validation Success + Top Action Toolbar */}
            <div className="bg-[#0b1530] border border-blue-900/60 rounded-3xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-emerald-400">
                    ✓ Response validated successfully • {payload.questions.length}{' '}
                    {payload.questions.length === 1 ? 'Question' : 'Questions'}
                  </div>
                  <div className="text-sm font-black text-white">
                    {isEditing ? 'Inline Edit Mode' : 'Student-Facing Live Preview'}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-black flex items-center gap-2 transition-all ${
                    isEditing
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                  }`}
                >
                  {isEditing ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                  <span>{isEditing ? 'Done Editing (Preview)' : 'Edit'}</span>
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveAssessment('draft')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-black text-slate-200 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Draft</span>
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveAssessment('published')}
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-teal-500/25 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSaving ? 'Publishing...' : 'Publish'}</span>
                </button>
              </div>
            </div>

            {saveMessage && (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-sm font-black flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>{saveMessage}</span>
              </div>
            )}

            {/* ====================================================================
                PART 9: INLINE EDIT MODE
            ==================================================================== */}
            {isEditing ? (
              <div className="space-y-6">
                {/* Header Details Editor */}
                <div className="bg-[#0b1530] border border-blue-900/60 rounded-3xl p-6 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
                    Edit Header &amp; Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Title</label>
                      <input
                        type="text"
                        value={payload.title}
                        onChange={(e) => {
                          const next = { ...payload, title: e.target.value };
                          setPayload(next);
                          setConfig({ ...config, title: e.target.value });
                        }}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-bold"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Description / Instructions</label>
                      <textarea
                        rows={2}
                        value={payload.description}
                        onChange={(e) => {
                          const next = { ...payload, description: e.target.value };
                          setPayload(next);
                        }}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                      />
                    </div>
                    <label className="flex items-center gap-2.5 text-xs font-bold text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={payload.anonymous}
                        onChange={(e) => {
                          setPayload({ ...payload, anonymous: e.target.checked });
                          setConfig({ ...config, isAnonymous: e.target.checked });
                        }}
                        className="w-4 h-4 accent-teal-400"
                      />
                      <span>Anonymous Responses (Hide student names in results)</span>
                    </label>
                  </div>
                </div>

                {/* Questions Editor List */}
                <div className="space-y-4">
                  {payload.questions.map((q, qIdx) => (
                    <div
                      key={q.id}
                      className="bg-[#0b1530] border border-blue-900/60 rounded-3xl p-6 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 text-xs font-black">
                            Q{qIdx + 1}
                          </span>
                          <select
                            value={q.type}
                            onChange={(e) => {
                              const newType = e.target.value as ResponseQuestionType;
                              updateQuestion(qIdx, (prev) => ({
                                ...prev,
                                type: newType,
                                options:
                                  newType === 'yes_no'
                                    ? [...YES_NO_DEFAULT_OPTIONS]
                                    : newType === 'likert'
                                    ? [...LIKERT_DEFAULT_OPTIONS]
                                    : newType === 'single_choice' ||
                                      newType === 'multiple_selection' ||
                                      newType === 'ranking'
                                    ? prev.options && prev.options.length >= 2
                                      ? prev.options
                                      : ['Option 1', 'Option 2']
                                    : undefined,
                                scale: newType === 'rating' ? prev.scale || 5 : undefined,
                              }));
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white"
                          >
                            {Object.entries(QUESTION_TYPE_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mr-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={q.required}
                              onChange={(e) =>
                                updateQuestion(qIdx, (prev) => ({
                                  ...prev,
                                  required: e.target.checked,
                                }))
                              }
                              className="accent-teal-400"
                            />
                            <span>Required</span>
                          </label>

                          <button
                            type="button"
                            disabled={qIdx === 0}
                            onClick={() => handleMoveQuestion(qIdx, -1)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
                            title="Move Up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={qIdx === payload.questions.length - 1}
                            onClick={() => handleMoveQuestion(qIdx, 1)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
                            title="Move Down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={payload.questions.length <= 1}
                            onClick={() => handleDeleteQuestion(qIdx)}
                            className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 disabled:opacity-40"
                            title="Delete Question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300">Question Text</label>
                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) =>
                            updateQuestion(qIdx, (prev) => ({ ...prev, question: e.target.value }))
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-medium"
                        />
                      </div>

                      {/* Options Editor for choice/ranking/yes_no/likert */}
                      {(q.type === 'single_choice' ||
                        q.type === 'multiple_selection' ||
                        q.type === 'ranking' ||
                        q.type === 'yes_no' ||
                        q.type === 'likert') && (
                        <div className="space-y-2 pt-2">
                          <label className="text-xs font-bold text-slate-300">Options</label>
                          {(q.options || []).map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-500 w-6">
                                {optIdx + 1}.
                              </span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const nextOpts = [...(q.options || [])];
                                  nextOpts[optIdx] = e.target.value;
                                  updateQuestion(qIdx, (prev) => ({ ...prev, options: nextOpts }));
                                }}
                                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                              />
                              {(q.options || []).length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextOpts = (q.options || []).filter((_, i) => i !== optIdx);
                                    updateQuestion(qIdx, (prev) => ({ ...prev, options: nextOpts }));
                                  }}
                                  className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() =>
                              updateQuestion(qIdx, (prev) => ({
                                ...prev,
                                options: [...(prev.options || []), `Option ${(prev.options?.length || 0) + 1}`],
                              }))
                            }
                            className="mt-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-bold inline-flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Option</span>
                          </button>
                        </div>
                      )}

                      {/* Rating Scale Editor */}
                      {q.type === 'rating' && (
                        <div className="flex items-center gap-3 pt-2">
                          <label className="text-xs font-bold text-slate-300">Max Rating Scale (3–10):</label>
                          <input
                            type="number"
                            min={3}
                            max={10}
                            value={q.scale || 5}
                            onChange={(e) =>
                              updateQuestion(qIdx, (prev) => ({
                                ...prev,
                                scale: Math.max(3, Math.min(10, Number(e.target.value) || 5)),
                              }))
                            }
                            className="w-20 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold"
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="w-full py-4 rounded-2xl border-2 border-dashed border-teal-500/40 hover:border-teal-400 bg-teal-500/5 hover:bg-teal-500/10 text-teal-300 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Question</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ====================================================================
                  PART 8: STUDENT-FACING MOBILE-FIRST PREVIEW
              ==================================================================== */
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Student Header Card */}
                <div className="bg-gradient-to-br from-[#0e223d] to-[#0a1628] border border-teal-500/40 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider ${
                        badgeColors[payload.type]
                      }`}
                    >
                      {payload.type.toUpperCase()}
                    </span>

                    <span className="text-xs font-bold text-slate-300">
                      {payload.questions.length}{' '}
                      {payload.questions.length === 1 ? 'Question' : 'Questions'}
                    </span>
                  </div>

                  <h2 className="text-2xl font-black text-white leading-tight">{payload.title}</h2>
                  {payload.description && (
                    <p className="text-base text-slate-200 leading-relaxed">{payload.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                    {payload.anonymous ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                        <Shield className="w-4 h-4" />
                        <span>Your response is anonymous</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 font-bold">
                        <Users className="w-4 h-4" />
                        <span>Recorded with your student profile</span>
                      </div>
                    )}

                    {config.deadline && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
                        <Calendar className="w-4 h-4" />
                        <span>Due: {new Date(config.deadline).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Student Question Cards Preview */}
                {payload.questions.map((q, qIdx) => {
                  const currentVal = previewAnswers[q.id];
                  return (
                    <div
                      key={q.id}
                      className="bg-[#0b1530] border border-blue-900/60 rounded-3xl p-6 sm:p-7 space-y-4 shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-base font-black text-white leading-snug">
                          <span className="text-teal-400 mr-2">{qIdx + 1}.</span>
                          {q.question}
                          {q.required && <span className="text-rose-400 ml-1">*</span>}
                        </div>
                      </div>

                      {/* SINGLE CHOICE */}
                      {q.type === 'single_choice' && (
                        <div className="space-y-2.5 pt-1">
                          {(q.options || []).map((opt, oIdx) => {
                            const selected = currentVal === opt;
                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => setPreviewAnswers({ ...previewAnswers, [q.id]: opt })}
                                className={`w-full min-h-[48px] p-3.5 rounded-2xl border text-left text-base font-medium flex items-center gap-3 transition-all ${
                                  selected
                                    ? 'bg-teal-500/20 border-teal-400 text-white'
                                    : 'bg-slate-900/80 border-slate-800 text-slate-200 hover:border-slate-700'
                                }`}
                              >
                                <div
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    selected ? 'border-teal-400' : 'border-slate-500'
                                  }`}
                                >
                                  {selected && <div className="w-2.5 h-2.5 rounded-full bg-teal-400" />}
                                </div>
                                <span>{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* MULTIPLE SELECTION */}
                      {q.type === 'multiple_selection' && (
                        <div className="space-y-2.5 pt-1">
                          {(q.options || []).map((opt, oIdx) => {
                            const arr: string[] = Array.isArray(currentVal) ? currentVal : [];
                            const selected = arr.includes(opt);
                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => {
                                  const next = selected
                                    ? arr.filter((x) => x !== opt)
                                    : [...arr, opt];
                                  setPreviewAnswers({ ...previewAnswers, [q.id]: next });
                                }}
                                className={`w-full min-h-[48px] p-3.5 rounded-2xl border text-left text-base font-medium flex items-center gap-3 transition-all ${
                                  selected
                                    ? 'bg-teal-500/20 border-teal-400 text-white'
                                    : 'bg-slate-900/80 border-slate-800 text-slate-200 hover:border-slate-700'
                                }`}
                              >
                                <div
                                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                                    selected
                                      ? 'bg-teal-400 border-teal-400 text-slate-950'
                                      : 'border-slate-500'
                                  }`}
                                >
                                  {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                                <span>{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* YES / NO */}
                      {q.type === 'yes_no' && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          {(q.options && q.options.length >= 2 ? q.options : YES_NO_DEFAULT_OPTIONS).map(
                            (opt, oIdx) => {
                              const selected = currentVal === opt;
                              return (
                                <button
                                  key={oIdx}
                                  type="button"
                                  onClick={() => setPreviewAnswers({ ...previewAnswers, [q.id]: opt })}
                                  className={`min-h-[54px] p-4 rounded-2xl border text-base font-black flex items-center justify-center gap-2 transition-all ${
                                    selected
                                      ? 'bg-teal-500 text-slate-950 border-teal-300 shadow-lg'
                                      : 'bg-slate-900/80 border-slate-800 text-white hover:border-slate-700'
                                  }`}
                                >
                                  <span>{opt}</span>
                                </button>
                              );
                            }
                          )}
                        </div>
                      )}

                      {/* RATING SCALE */}
                      {q.type === 'rating' && (
                        <div className="pt-2">
                          <div className="flex flex-wrap items-center gap-2.5">
                            {Array.from({ length: q.scale || 5 }, (_, i) => i + 1).map((num) => {
                              const selected = Number(currentVal) >= num;
                              return (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => setPreviewAnswers({ ...previewAnswers, [q.id]: num })}
                                  className={`min-w-[52px] min-h-[52px] rounded-2xl border font-black text-base flex flex-col items-center justify-center gap-0.5 transition-all ${
                                    selected
                                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  <Star
                                    className={`w-5 h-5 ${
                                      selected ? 'fill-amber-400 text-amber-400' : ''
                                    }`}
                                  />
                                  <span className="text-xs">{num}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* RANKING */}
                      {q.type === 'ranking' && (
                        <div className="space-y-2 pt-1">
                          <p className="text-xs text-slate-400">
                            Use the arrows to rank options in order of preference (1 = Top Choice):
                          </p>
                          {(Array.isArray(currentVal) && currentVal.length > 0
                            ? currentVal
                            : q.options || []
                          ).map((opt: string, rIdx: number, list: string[]) => (
                            <div
                              key={rIdx}
                              className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-black flex items-center justify-center">
                                  #{rIdx + 1}
                                </span>
                                <span className="text-base text-white font-medium">{opt}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={rIdx === 0}
                                  onClick={() => {
                                    const copy = [...list];
                                    const tmp = copy[rIdx - 1];
                                    copy[rIdx - 1] = copy[rIdx];
                                    copy[rIdx] = tmp;
                                    setPreviewAnswers({ ...previewAnswers, [q.id]: copy });
                                  }}
                                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={rIdx === list.length - 1}
                                  onClick={() => {
                                    const copy = [...list];
                                    const tmp = copy[rIdx + 1];
                                    copy[rIdx + 1] = copy[rIdx];
                                    copy[rIdx] = tmp;
                                    setPreviewAnswers({ ...previewAnswers, [q.id]: copy });
                                  }}
                                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* LIKERT */}
                      {q.type === 'likert' && (
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                          {(q.options && q.options.length > 0 ? q.options : LIKERT_DEFAULT_OPTIONS).map(
                            (opt, lIdx) => {
                              const selected = currentVal === opt;
                              return (
                                <button
                                  key={lIdx}
                                  type="button"
                                  onClick={() => setPreviewAnswers({ ...previewAnswers, [q.id]: opt })}
                                  className={`min-h-[48px] p-3 rounded-2xl border text-xs font-black text-center flex items-center justify-center transition-all ${
                                    selected
                                      ? 'bg-teal-500 text-slate-950 border-teal-300 shadow'
                                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white'
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            }
                          )}
                        </div>
                      )}

                      {/* SHORT ANSWER */}
                      {q.type === 'short_answer' && (
                        <input
                          type="text"
                          value={currentVal || ''}
                          onChange={(e) =>
                            setPreviewAnswers({ ...previewAnswers, [q.id]: e.target.value })
                          }
                          placeholder="Type your short answer here..."
                          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-base text-white focus:border-teal-400 focus:outline-none"
                        />
                      )}

                      {/* LONG TEXT */}
                      {q.type === 'long_text' && (
                        <textarea
                          rows={4}
                          value={currentVal || ''}
                          onChange={(e) =>
                            setPreviewAnswers({ ...previewAnswers, [q.id]: e.target.value })
                          }
                          placeholder="Share your thoughts in detail..."
                          className="w-full p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-base text-white focus:border-teal-400 focus:outline-none"
                        />
                      )}
                    </div>
                  );
                })}

                {/* Bottom Action Bar */}
                <div className="bg-[#0b1530] border border-blue-900/60 rounded-3xl p-5 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-black text-white flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Questions</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveAssessment('draft')}
                      className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-black text-slate-200 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Draft</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveAssessment('published')}
                      className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-teal-500/25"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSaving ? 'Publishing...' : 'Publish'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ResponseStudioBuilder;
