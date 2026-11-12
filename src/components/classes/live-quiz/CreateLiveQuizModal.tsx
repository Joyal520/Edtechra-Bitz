import React, { useState, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Shuffle,
  Play,
  BookmarkPlus,
  FileText,
  Clock,
  Globe,
  Image as ImageIcon,
  Upload,
  Loader2,
  RefreshCw,
  Lightbulb,
  Zap,
  Cpu
} from 'lucide-react';
import { LiveQuizQuestion, LiveQuizDifficulty, LiveQuiz } from '@/types/liveQuiz';
import { liveQuizService } from '@/services/liveQuizService';
import { courseStudioService } from '@/services/courseStudioService';
import { DEFAULT_QUIZ_COVER, extractCoverFromDescription, cleanDescription } from '@/utils/quizCover';
import { FormattedQuestionText } from './LiveQuizUI';

export interface CreateLiveQuizModalProps {
  isOpen: boolean;
  classroomId: string;
  onClose: () => void;
  onSuccess: (newQuiz: LiveQuiz) => void;
  initialQuiz?: LiveQuiz | null;
}

const PRESET_TOPICS = [
  'Present Perfect Tense',
  'Present Simple',
  'Solar System',
  'AI Basics',
  'Computer Hardware',
  'Climate Change',
  'Shakespeare',
  'Fractions'
];

export const QUESTION_COUNT_OPTIONS = [5, 10, 20, 25] as const;
const CATEGORY_OPTIONS = [
  'Grammar',
  'Vocabulary',
  'ICT',
  'AI',
  'Science',
  'Reading',
  'Life Skills',
  'Other'
];
const DIFFICULTY_OPTIONS: LiveQuizDifficulty[] = ['Easy', 'Medium', 'Hard'];
const PER_QUESTION_TIMER_PRESETS = [10, 15, 20, 30, 45, 60, 90, 120] as const;
const QUESTION_TYPE_OPTIONS = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'fill_in_blank', label: 'Fill in the Blank' },
  { value: 'concept_check', label: 'Concept Check' },
  { value: 'scenario', label: 'Scenario' }
] as const;

type ModalMode = 'ai' | 'manual';
type AiStep = 'configure' | 'preview_edit';

function buildDefaultQuestions(count: number, durationSec = 20): LiveQuizQuestion[] {
  const perQuestionPts = Math.max(1, Math.round(100 / Math.max(1, count)));
  return Array.from({ length: count }, (_, idx) => ({
    id: `q_${Date.now()}_${idx + 1}`,
    question: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    durationSec,
    explanation: '',
    hint: '',
    questionType: 'multiple_choice',
    points: perQuestionPts
  }));
}

export const CreateLiveQuizModal: React.FC<CreateLiveQuizModalProps> = ({
  isOpen,
  classroomId,
  onClose,
  onSuccess,
  initialQuiz
}) => {
  const isEditMode = Boolean(initialQuiz);
  const [mode, setMode] = useState<ModalMode>(isEditMode ? 'manual' : 'ai');
  const [aiStep, setAiStep] = useState<AiStep>('configure');

  // Direct AI Quiz Builder Configuration State
  const [aiQuizTitle, setAiQuizTitle] = useState('');
  const [aiQuizDescription, setAiQuizDescription] = useState('');
  const [topic, setTopic] = useState('');
  const [learningContent, setLearningContent] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<LiveQuizDifficulty>('Medium');
  const [category, setCategory] = useState('Grammar');
  const [pointsPerQuestion, setPointsPerQuestion] = useState<number>(10);
  const [aiProvider, setAiProvider] = useState<'auto' | 'openai' | 'gemini'>('auto');
  const [autoGenerateCover, setAutoGenerateCover] = useState<boolean>(true);

  // Per-Question Timer, Tracking & Visibility State
  const [timerEnabled, setTimerEnabled] = useState<boolean>(true);
  const [timerSeconds, setTimerSeconds] = useState<number>(20);
  const [isCustomTimer, setIsCustomTimer] = useState<boolean>(false);
  const [trackQuiz, setTrackQuiz] = useState<boolean>(true);
  const [visibility, setVisibility] = useState<'common' | 'private'>('private');

  // Direct AI Generation & Preview State
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [regeneratingQuestionIdx, setRegeneratingQuestionIdx] = useState<number | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<LiveQuizQuestion[]>([]);
  const [activeProviderUsed, setActiveProviderUsed] = useState<string | null>(null);

  // Manual Mode State
  const [manualTitle, setManualTitle] = useState('');
  const [manualCategory, setManualCategory] = useState('Grammar');
  const [manualDifficulty, setManualDifficulty] = useState<LiveQuizDifficulty>('Medium');
  const [manualDescription, setManualDescription] = useState('');
  const [manualQuestions, setManualQuestions] = useState<LiveQuizQuestion[]>(buildDefaultQuestions(5, 20));

  // Submission State
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cover Image State
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize or reset form based on initialQuiz and isOpen
  React.useEffect(() => {
    if (isOpen) {
      if (initialQuiz) {
        setMode('manual');
        setManualTitle(initialQuiz.title || '');
        setManualDescription(cleanDescription(initialQuiz.description || ''));
        setManualCategory(initialQuiz.category || 'Grammar');
        setManualDifficulty(initialQuiz.difficulty || 'Medium');
        setCoverImageUrl(
          initialQuiz.cover_image ||
            initialQuiz.cover_image_url ||
            extractCoverFromDescription(initialQuiz.description) ||
            null
        );
        const firstQSec = initialQuiz.questions?.[0]?.durationSec || 20;
        const initTimed = initialQuiz.timer_enabled !== false && firstQSec < 3600;
        const initSec = initTimed
          ? initialQuiz.timer_seconds && initialQuiz.timer_seconds <= 600
            ? initialQuiz.timer_seconds
            : firstQSec
          : 20;
        setTimerEnabled(initTimed);
        setTimerSeconds(initSec);
        setIsCustomTimer(initTimed && !PER_QUESTION_TIMER_PRESETS.includes(initSec as any));
        setTrackQuiz(initialQuiz.track_quiz !== false);
        setVisibility(initialQuiz.visibility || 'private');
        const initCount = Math.max(1, initialQuiz.questions?.length || 5);
        const initPtsPerQ = Math.max(1, Math.round(100 / initCount));
        setPointsPerQuestion(initPtsPerQ);
        setManualQuestions(
          initialQuiz.questions && initialQuiz.questions.length > 0
            ? initialQuiz.questions.map((q, idx) => ({
                id: q.id || `q_${idx + 1}`,
                question: q.question,
                options: Array.isArray(q.options) ? [...q.options] : ['', '', '', ''],
                correctIndex: q.correctIndex ?? 0,
                durationSec: initTimed ? initSec : 86400,
                explanation: q.explanation || '',
                hint: q.hint || '',
                questionType: q.questionType || 'multiple_choice',
                points: initPtsPerQ
              }))
            : buildDefaultQuestions(5, initTimed ? initSec : 86400)
        );
      } else {
        setMode('ai');
        setAiStep('configure');
        setAiQuizTitle('');
        setAiQuizDescription('');
        setTopic('');
        setLearningContent('');
        setQuestionCount(10);
        setDifficulty('Medium');
        setCategory('Grammar');
        setPointsPerQuestion(10);
        setAiProvider('auto');
        setAutoGenerateCover(true);
        setTimerEnabled(true);
        setTimerSeconds(20);
        setIsCustomTimer(false);
        setTrackQuiz(true);
        setVisibility('private');
        setGeneratedQuestions([]);
        setActiveProviderUsed(null);
        setManualTitle('');
        setManualDescription('');
        setManualCategory('Grammar');
        setManualDifficulty('Medium');
        setCoverImageUrl(null);
        setManualQuestions(buildDefaultQuestions(5, 20));
      }
      setError(null);
    }
  }, [isOpen, initialQuiz]);

  if (!isOpen) return null;

  const handleCoverPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Cover image size must be under 5MB.');
      return;
    }

    setUploadingCover(true);
    setError(null);
    try {
      const res = await courseStudioService.uploadCourseImage(file, 'quiz-covers', true);
      if (res && res.publicUrl) {
        setCoverImageUrl(res.publicUrl);
      } else {
        throw new Error('Upload succeeded but no public URL was returned.');
      }
    } catch (uploadErr: any) {
      console.error('R2 cover upload error:', uploadErr);
      setError(`Cover image upload failed: ${uploadErr.message || 'Please check your connection and try again.'}`);
    } finally {
      setUploadingCover(false);
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = '';
      }
    }
  };

  const handleResetCover = () => {
    setCoverImageUrl(null);
    if (coverFileInputRef.current) {
      coverFileInputRef.current.value = '';
    }
  };

  const handleRegenerateCover = async () => {
    const effectiveTitle = (mode === 'ai' ? aiQuizTitle || topic : manualTitle || topic).trim();
    const effectiveCat = mode === 'ai' ? category : manualCategory;
    const effectiveDiff = mode === 'ai' ? difficulty : manualDifficulty;

    if (!effectiveTitle && !topic.trim()) {
      setError('Please enter a topic or quiz title before generating a cover image.');
      return;
    }

    setIsGeneratingCover(true);
    setError(null);
    try {
      const res = await liveQuizService.generateAiCoverImage({
        title: effectiveTitle || `${effectiveCat} Challenge`,
        topic: topic.trim() || effectiveTitle,
        category: effectiveCat,
        difficulty: effectiveDiff
      });
      if (res.error || !res.coverImageUrl) {
        throw new Error(res.error || 'Failed to generate cover image');
      }
      setCoverImageUrl(res.coverImageUrl);
    } catch (err: any) {
      setError(err.message || 'Could not generate quiz cover image.');
    } finally {
      setIsGeneratingCover(false);
    }
  };

  // ===========================================================================
  // DIRECT AI QUIZ GENERATION WORKFLOW (PART 2)
  // ===========================================================================
  const handleDirectAiGenerate = async () => {
    if (!topic.trim() && !learningContent.trim() && !aiQuizTitle.trim()) {
      setError('Please enter a Quiz Topic, Title, or paste Learning Content to generate your quiz.');
      return;
    }

    setError(null);
    setIsGeneratingQuiz(true);

    try {
      const perQSec = timerEnabled ? timerSeconds : 86400;
      const res = await liveQuizService.generateAiQuiz({
        title: aiQuizTitle.trim() || undefined,
        category,
        topic: topic.trim() || aiQuizTitle.trim(),
        content: learningContent.trim() || undefined,
        difficulty,
        questionCount,
        timePerQuestion: perQSec,
        pointsPerQuestion,
        provider: aiProvider,
        generateCover: autoGenerateCover && !coverImageUrl
      });

      if (res.error || !res.data) {
        throw new Error(res.error || 'Failed to generate quiz with AI.');
      }

      const generated = res.data;
      setAiQuizTitle(generated.title || aiQuizTitle.trim() || `${topic.trim() || category} Quiz`);
      setAiQuizDescription(
        generated.description || `Interactive ${generated.questions.length}-question ${difficulty} quiz on ${topic.trim() || category}.`
      );
      if (generated.coverImageUrl && !coverImageUrl) {
        setCoverImageUrl(generated.coverImageUrl);
      }
      setActiveProviderUsed(generated.provider || 'AI');
      setGeneratedQuestions(
        generated.questions.map((q, idx) => ({
          id: q.id || `q_${Date.now()}_${idx + 1}`,
          question: q.question,
          options: Array.isArray(q.options) && q.options.length === 4 ? [...q.options] : ['', '', '', ''],
          correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
          durationSec: perQSec,
          explanation: q.explanation || '',
          hint: q.hint || '',
          questionType: q.questionType || 'multiple_choice',
          points: q.points || pointsPerQuestion
        }))
      );
      setAiStep('preview_edit');
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI quiz. Please try again.');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleRegenerateSingleQuestion = async (qIndex: number) => {
    const currentQ = generatedQuestions[qIndex];
    if (!currentQ) return;

    setRegeneratingQuestionIdx(qIndex);
    setError(null);
    try {
      const existingPrompts = generatedQuestions
        .filter((_, idx) => idx !== qIndex)
        .map((q) => q.question);

      const res = await liveQuizService.regenerateAiQuestion({
        topic: topic.trim() || aiQuizTitle.trim() || category,
        category,
        difficulty,
        questionIndex: qIndex,
        currentQuestion: currentQ.question,
        existingQuestions: existingPrompts,
        timePerQuestion: timerEnabled ? timerSeconds : 86400,
        pointsPerQuestion,
        provider: aiProvider
      });

      if (res.error || !res.data) {
        throw new Error(res.error || 'Failed to regenerate question');
      }

      const replacement = res.data;
      setGeneratedQuestions((prev) =>
        prev.map((item, idx) =>
          idx === qIndex
            ? {
                ...item,
                question: replacement.question,
                options: Array.isArray(replacement.options) ? [...replacement.options] : item.options,
                correctIndex: typeof replacement.correctIndex === 'number' ? replacement.correctIndex : 0,
                explanation: replacement.explanation || '',
                hint: replacement.hint || '',
                questionType: replacement.questionType || item.questionType || 'multiple_choice',
                points: replacement.points || pointsPerQuestion
              }
            : item
        )
      );
    } catch (err: any) {
      setError(err.message || 'Could not regenerate question.');
    } finally {
      setRegeneratingQuestionIdx(null);
    }
  };

  const handleAddGeneratedQuestion = () => {
    if (generatedQuestions.length >= 50) {
      setError('Quizzes can have up to 50 questions.');
      return;
    }
    const perQSec = timerEnabled ? timerSeconds : 86400;
    setGeneratedQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}_${prev.length + 1}`,
        question: 'Select the correct answer: ',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: 0,
        durationSec: perQSec,
        explanation: '',
        hint: '',
        questionType: 'multiple_choice',
        points: pointsPerQuestion
      }
    ]);
  };

  const handleRemoveGeneratedQuestion = (qIndex: number) => {
    if (generatedQuestions.length <= 1) {
      setError('A quiz must contain at least 1 question.');
      return;
    }
    setGeneratedQuestions((prev) => prev.filter((_, idx) => idx !== qIndex));
  };

  const validateQuestionList = (questions: LiveQuizQuestion[]): string | null => {
    if (!questions || questions.length === 0) {
      return 'Please include at least 1 question in the quiz.';
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !q.question.trim()) {
        return `Question ${i + 1} is missing question text.`;
      }
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        return `Question ${i + 1} must have exactly 4 answer choices.`;
      }
      for (let j = 0; j < q.options.length; j++) {
        const optText = (q.options[j] || '').trim();
        if (!optText) {
          return `Question ${i + 1}, Option ${String.fromCharCode(65 + j)} is empty.`;
        }
        if (/^(all|none)\s+of\s+the\s+above$/i.test(optText)) {
          return `Question ${i + 1}, choice "${optText}" is not allowed. Avoid "All of the above" or "None of the above".`;
        }
      }
    }
    return null;
  };

  // Save Approved AI Quiz Directly into Supabase-backed Quiz Library + Cloudflare R2
  const handleSaveGeneratedQuiz = async (autoLaunch = false) => {
    const rawTitle = (aiQuizTitle || topic || `${category} Live Quiz`).trim();
    if (!rawTitle) {
      setError('Please provide a quiz title.');
      return;
    }

    const validationErr = validateQuestionList(generatedQuestions);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    const normalizedCandidate = rawTitle.replace(/\s+/g, ' ').toLowerCase();
    setIsSaving(true);
    setError(null);

    try {
      const existingQuizzes = await liveQuizService.getAllQuizzes(classroomId);
      const isDuplicate = existingQuizzes.some(
        (q) =>
          q.is_owner &&
          q.id !== initialQuiz?.id &&
          q.title.trim().replace(/\s+/g, ' ').toLowerCase() === normalizedCandidate
      );
      if (isDuplicate) {
        setError('A quiz with this title already exists in your library. Please adjust the title above.');
        setIsSaving(false);
        return;
      }

      const perQSec = timerEnabled ? timerSeconds : 86400;
      const questionsToSave = generatedQuestions.map((q) => ({
        ...q,
        durationSec: perQSec,
        points: q.points || pointsPerQuestion
      }));

      const payload = {
        classroom_id: classroomId,
        title: rawTitle,
        description:
          aiQuizDescription.trim() ||
          `Generated ${questionsToSave.length}-question interactive quiz on ${topic || category}.`,
        category,
        topic: topic.trim() || rawTitle,
        difficulty,
        questions: questionsToSave,
        cover_image: coverImageUrl,
        cover_image_url: coverImageUrl,
        visibility,
        timer_enabled: timerEnabled,
        timer_seconds: timerEnabled ? timerSeconds : null,
        points_per_question: pointsPerQuestion,
        track_quiz: trackQuiz,
        is_public: visibility === 'common'
      };

      const res = initialQuiz
        ? await liveQuizService.updateCustomQuiz(initialQuiz.id, payload)
        : await liveQuizService.createCustomQuiz(payload);

      if (res.error || !res.data) {
        throw new Error(res.error || 'Failed to save quiz to Quiz Library');
      }

      onSuccess(res.data);
      if (!autoLaunch) {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save quiz');
    } finally {
      setIsSaving(false);
    }
  };

  // ===========================================================================
  // MANUAL QUIZ CREATOR WORKFLOW (PART 2F)
  // ===========================================================================
  const handleSetManualCount = (targetCount: number) => {
    if (manualQuestions.length === targetCount) return;
    const perQSec = timerEnabled ? timerSeconds : 86400;
    if (manualQuestions.length < targetCount) {
      const added = Array.from({ length: targetCount - manualQuestions.length }, (_, i) => ({
        id: `q_${Date.now()}_${manualQuestions.length + i + 1}`,
        question: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        durationSec: perQSec,
        explanation: '',
        hint: '',
        questionType: 'multiple_choice' as const,
        points: pointsPerQuestion
      }));
      setManualQuestions((prev) => [...prev, ...added]);
    } else {
      if (
        window.confirm(
          `Reducing to ${targetCount} questions will remove the last ${manualQuestions.length - targetCount} questions. Proceed?`
        )
      ) {
        setManualQuestions((prev) => prev.slice(0, targetCount));
      }
    }
  };

  const handleManualAddQuestion = () => {
    if (manualQuestions.length >= 50) {
      setError('Quizzes are limited to a maximum of 50 questions.');
      return;
    }
    const perQSec = timerEnabled ? timerSeconds : 86400;
    setManualQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}_${prev.length + 1}`,
        question: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        durationSec: perQSec,
        explanation: '',
        hint: '',
        questionType: 'multiple_choice',
        points: pointsPerQuestion
      }
    ]);
  };

  const handleManualRemoveQuestion = (idx: number) => {
    if (manualQuestions.length <= 1) return;
    setManualQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const rawTitle = manualTitle.trim();
    if (!rawTitle) {
      setError('Please provide a quiz title.');
      return;
    }

    const validationErr = validateQuestionList(manualQuestions);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    const normalizedCandidate = rawTitle.replace(/\s+/g, ' ').toLowerCase();

    setIsSaving(true);
    try {
      const existingQuizzes = await liveQuizService.getAllQuizzes(classroomId);
      const isDuplicate = existingQuizzes.some(
        (q) =>
          q.is_owner &&
          q.id !== initialQuiz?.id &&
          q.title.trim().replace(/\s+/g, ' ').toLowerCase() === normalizedCandidate
      );
      if (isDuplicate) {
        setError('A quiz with this title already exists. Please choose a different title.');
        setIsSaving(false);
        return;
      }

      const perQSec = timerEnabled ? timerSeconds : 86400;
      const questionsWithDuration = manualQuestions.map((q) => ({
        ...q,
        durationSec: perQSec,
        points: q.points || pointsPerQuestion
      }));

      const payload = {
        classroom_id: classroomId,
        title: rawTitle,
        description: manualDescription.trim(),
        category: manualCategory,
        difficulty: manualDifficulty,
        questions: questionsWithDuration,
        cover_image: coverImageUrl,
        cover_image_url: coverImageUrl,
        visibility,
        timer_enabled: timerEnabled,
        timer_seconds: timerEnabled ? timerSeconds : null,
        points_per_question: pointsPerQuestion,
        track_quiz: trackQuiz,
        is_public: visibility === 'common'
      };

      const res = initialQuiz
        ? await liveQuizService.updateCustomQuiz(initialQuiz.id, payload)
        : await liveQuizService.createCustomQuiz(payload);

      if (res.error || !res.data) {
        throw new Error(res.error || (initialQuiz ? 'Failed to update quiz' : 'Failed to save quiz'));
      }

      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      setError(err.message || (initialQuiz ? 'Error updating quiz' : 'Error saving quiz'));
    } finally {
      setIsSaving(false);
    }
  };

  // Shared Cover & Configuration Controls Helper
  const renderCoverControlCard = () => (
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Quiz Cover Image
          </span>
        </div>
        {coverImageUrl && (
          <button
            type="button"
            onClick={handleResetCover}
            className="text-[10px] font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-24 h-14 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0 shadow-2xs">
          <img
            src={coverImageUrl || DEFAULT_QUIZ_COVER}
            alt="Quiz Cover"
            className="w-full h-full object-cover"
          />
          {isGeneratingCover && (
            <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <input
            ref={coverFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleCoverPick}
            className="hidden"
          />
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              disabled={isGeneratingCover || uploadingCover}
              onClick={handleRegenerateCover}
              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-extrabold shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
            >
              {isGeneratingCover ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  <span>{coverImageUrl ? 'Regenerate AI Cover' : 'Generate AI Cover'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={uploadingCover || isGeneratingCover}
              onClick={() => coverFileInputRef.current?.click()}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
            >
              {uploadingCover ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3 h-3 text-purple-600" />
                  <span>Upload Custom</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 font-medium truncate">
            {coverImageUrl ? 'Custom / AI R2 cover active' : 'Auto-generates 16:9 cover on R2'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        data-theme-mode="light"
        data-light-surface="true"
        style={{ colorScheme: 'light' }}
        className="bg-white text-slate-900 light edtechra-light-surface rounded-3xl max-w-4xl w-full max-h-[92vh] p-6 shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-200 [color-scheme:light]"
      >
        {/* TOP HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              {isEditMode ? <FileText className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-900">
                  {isEditMode ? 'Edit Quiz' : 'Create Live Quiz'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-black border border-purple-200">
                  Direct AI + Supabase Library
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-black border border-amber-200">
                  Speed Bonus Enabled
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold">
                {isEditMode
                  ? 'Update quiz title, description, questions, choices, answers, or cover image'
                  : 'Generate a complete quiz directly with AI or author questions manually'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher: 1. AI Quiz Builder | 2. Manual Quiz Creator */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-black text-slate-600">
              <button
                type="button"
                onClick={() => {
                  setMode('ai');
                  setError(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  mode === 'ai' ? 'bg-purple-600 text-white shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Quiz Builder</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('manual');
                  setError(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  mode === 'manual' ? 'bg-purple-600 text-white shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Manual Quiz Creator</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* STEP PROGRESS INDICATOR (Direct AI Quiz Builder) */}
        {mode === 'ai' && (
          <div className="py-3 px-1 border-b border-slate-100 shrink-0 bg-slate-50/60 -mx-6 px-6">
            <div className="flex items-center justify-center gap-4 max-w-xl mx-auto text-xs font-black">
              <button
                type="button"
                onClick={() => setAiStep('configure')}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                  aiStep === 'configure' ? 'text-purple-700' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                    aiStep === 'configure' ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  1
                </span>
                <span>Configure & Generate with AI</span>
              </button>

              <ArrowRight className="w-3.5 h-3.5 text-slate-300" />

              <button
                type="button"
                onClick={() => generatedQuestions.length > 0 && setAiStep('preview_edit')}
                disabled={generatedQuestions.length === 0}
                className={`flex items-center gap-1.5 transition-colors ${
                  aiStep === 'preview_edit'
                    ? 'text-emerald-700 font-extrabold'
                    : generatedQuestions.length > 0
                    ? 'text-slate-500 hover:text-slate-800 cursor-pointer'
                    : 'text-slate-300 cursor-not-allowed'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                    aiStep === 'preview_edit' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  2
                </span>
                <span>Preview, Edit & Save Directly</span>
              </button>
            </div>
          </div>
        )}

        {/* ERROR BANNER */}
        {error && (
          <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* MODAL MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
          {/* ================================================================= */}
          {/* MODE 1: DIRECT AI QUIZ BUILDER                                    */}
          {/* ================================================================= */}
          {mode === 'ai' && (
            <>
              {/* ------------------------------------------------------------- */}
              {/* STEP 1: CONFIGURE & DIRECT AI GENERATION                      */}
              {/* ------------------------------------------------------------- */}
              {aiStep === 'configure' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Quiz Title, Topic & Learning Content */}
                  <div className="space-y-4 bg-slate-50/80 p-4 sm:p-5 rounded-3xl border border-slate-200/80">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                            Quiz Title (Optional)
                          </label>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            AI generates if left blank
                          </span>
                        </div>
                        <input
                          type="text"
                          value={aiQuizTitle}
                          onChange={(e) => setAiQuizTitle(e.target.value)}
                          placeholder="e.g. Present Perfect Mastery Challenge"
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                            Quiz Topic *
                          </label>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Subject or concept focus
                          </span>
                        </div>
                        <input
                          type="text"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          placeholder="e.g. Present Perfect Tense, Solar System, Fractions..."
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Preset Topic Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400">Quick Topics:</span>
                      {PRESET_TOPICS.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTopic(t)}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                            topic === t
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white hover:bg-purple-50 text-slate-600 hover:text-purple-700 border-slate-200'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    {/* Optional Learning Content / Context */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                          Learning Content / Lesson Notes (Optional)
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Paste lesson passages or notes for context-grounded questions
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={learningContent}
                        onChange={(e) => setLearningContent(e.target.value)}
                        placeholder="Optional: Paste your lesson passage, vocabulary list, textbook excerpt, or study notes here..."
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none resize-none"
                      />
                    </div>
                  </div>

                  {/* Settings Grid (Questions, Difficulty, Subject/Category, Points & AI Provider) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Number of Questions */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                          Questions
                        </label>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                          {questionCount} Qs
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {QUESTION_COUNT_OPTIONS.map((count) => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setQuestionCount(count)}
                            className={`py-1.5 px-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                              questionCount === count
                                ? 'bg-purple-600 text-white shadow-2xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-purple-50'
                            }`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-bold text-slate-500">Custom Count:</span>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={questionCount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) setQuestionCount(Math.max(1, Math.min(50, val)));
                          }}
                          className="w-16 px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-center text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Difficulty */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                        Difficulty
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {DIFFICULTY_OPTIONS.map((diff) => (
                          <button
                            key={diff}
                            type="button"
                            onClick={() => setDifficulty(diff)}
                            className={`py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                              difficulty === diff
                                ? 'bg-purple-600 text-white shadow-2xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-purple-50'
                            }`}
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium pt-1">
                        Includes explanations & hints
                      </p>
                    </div>

                    {/* Subject / Category */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                        Subject / Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 cursor-pointer"
                      >
                        {CATEGORY_OPTIONS.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 font-medium pt-1">
                        Organizes your Quiz Library
                      </p>
                    </div>

                    {/* 100-Point Quiz Scoring & AI Provider */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                          Quiz Scoring
                        </label>
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          <Zap className="w-2.5 h-2.5" />
                          <span>100 Pts + Bonus</span>
                        </span>
                      </div>
                      <div className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800">
                        {Math.max(1, Math.round(100 / Math.max(1, questionCount)))} pts/Q + up to{' '}
                        {Math.max(1, Math.round(Math.max(1, Math.round(100 / Math.max(1, questionCount))) / 2))} speed bonus
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
                          <Cpu className="w-3 h-3 text-purple-600" />
                          <span>AI Engine:</span>
                        </span>
                        <select
                          value={aiProvider}
                          onChange={(e) => setAiProvider(e.target.value as 'auto' | 'openai' | 'gemini')}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[10px] font-extrabold text-slate-800 cursor-pointer"
                        >
                          <option value="auto">Auto (OpenAI + Gemini)</option>
                          <option value="openai">OpenAI</option>
                          <option value="gemini">Gemini</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Per-Question Timer, Visibility & Cover Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Time Per Question */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            Time Per Question
                          </span>
                        </div>
                        <select
                          aria-label="Time Per Question"
                          value={!timerEnabled ? 'none' : isCustomTimer ? 'custom' : String(timerSeconds)}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'none') {
                              setTimerEnabled(false);
                              setIsCustomTimer(false);
                            } else if (val === 'custom') {
                              setTimerEnabled(true);
                              setIsCustomTimer(true);
                            } else {
                              const sec = parseInt(val, 10);
                              setTimerEnabled(true);
                              setIsCustomTimer(false);
                              if (!isNaN(sec)) setTimerSeconds(sec);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-purple-600 cursor-pointer shadow-2xs"
                        >
                          <option value="none">No Timer</option>
                          <option value="10">10 seconds</option>
                          <option value="15">15 seconds</option>
                          <option value="20">20 seconds</option>
                          <option value="30">30 seconds</option>
                          <option value="45">45 seconds</option>
                          <option value="60">60 seconds</option>
                          <option value="90">90 seconds</option>
                          <option value="120">120 seconds</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setTimerEnabled(false);
                            setIsCustomTimer(false);
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                            !timerEnabled
                              ? 'bg-slate-900 text-white shadow-2xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50'
                          }`}
                        >
                          No Timer
                        </button>
                        {PER_QUESTION_TIMER_PRESETS.map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => {
                              setTimerEnabled(true);
                              setIsCustomTimer(false);
                              setTimerSeconds(sec);
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                              timerEnabled && !isCustomTimer && timerSeconds === sec
                                ? 'bg-purple-600 text-white shadow-2xs'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50'
                            }`}
                          >
                            {sec}s
                          </button>
                        ))}
                      </div>

                      {timerEnabled && isCustomTimer && (
                        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                          <label className="text-xs font-bold text-slate-700">Custom Seconds / Q:</label>
                          <input
                            type="number"
                            min={5}
                            max={600}
                            value={timerSeconds}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val)) setTimerSeconds(Math.max(5, Math.min(600, val)));
                            }}
                            className="w-20 px-2.5 py-1 bg-white border border-purple-300 rounded-xl text-xs font-black text-purple-950 text-center"
                          />
                        </div>
                      )}
                    </div>

                    {/* Library Sharing */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            Library Sharing
                          </span>
                        </div>
                        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setVisibility('private')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                              visibility === 'private'
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Private
                          </button>
                          <button
                            type="button"
                            onClick={() => setVisibility('common')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                              visibility === 'common'
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Common
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium pt-1">
                        {visibility === 'common'
                          ? 'Shared in Common Quizzes for teachers to discover and reuse.'
                          : 'Saved privately under "Your Quizzes".'}
                      </p>
                    </div>

                    {/* Quiz Cover Image */}
                    {renderCoverControlCard()}
                  </div>

                  {/* Track Student Performance & Auto Cover Checkboxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 cursor-pointer hover:bg-indigo-50 transition-colors select-none">
                      <input
                        type="checkbox"
                        checked={trackQuiz}
                        onChange={(e) => setTrackQuiz(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="block text-xs font-black text-slate-900">
                          Track student performance
                        </span>
                        <span className="block text-[11px] text-slate-600 font-medium">
                          Record student accuracy, response speed, and insights in My Report.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80 cursor-pointer hover:bg-purple-50 transition-colors select-none">
                      <input
                        type="checkbox"
                        checked={autoGenerateCover}
                        onChange={(e) => setAutoGenerateCover(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="block text-xs font-black text-slate-900">
                          Automatically generate quiz cover image
                        </span>
                        <span className="block text-[11px] text-slate-600 font-medium">
                          AI creates a visual 16:9 cover based on your quiz topic and stores it on R2.
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Direct Generate Action Button */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isGeneratingQuiz}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDirectAiGenerate}
                      disabled={isGeneratingQuiz}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-black shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isGeneratingQuiz ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating Quiz & Cover with AI...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Generate Quiz</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STEP 2: EDITABLE PREVIEW & DIRECT SAVING                      */}
              {/* ------------------------------------------------------------- */}
              {aiStep === 'preview_edit' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Top Summary & Direct Save Bar */}
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 flex items-center justify-between flex-wrap gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <h3 className="text-base font-black text-emerald-950">
                          AI Quiz Generated — Editable Preview
                        </h3>
                        {activeProviderUsed && (
                          <span className="px-2 py-0.5 rounded-full bg-white text-emerald-800 text-[10px] font-black border border-emerald-300 uppercase">
                            Provider: {activeProviderUsed}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold text-emerald-800 flex-wrap">
                        <span>✓ {generatedQuestions.length} questions ready</span>
                        <span>✓ Explanations & hints included</span>
                        <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          <Shuffle className="w-3 h-3" />
                          <span>Options auto-shuffled for students</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleSaveGeneratedQuiz(false)}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-extrabold shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5 text-purple-600" />
                        <span>{isSaving ? 'Saving...' : 'Save to Quiz Library'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveGeneratedQuiz(true)}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isSaving ? 'Saving & Launching...' : 'Save & Launch Quiz'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Editable Quiz Metadata & Cover Preview Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="lg:col-span-2 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                            Quiz Title
                          </label>
                          <input
                            type="text"
                            value={aiQuizTitle}
                            onChange={(e) => setAiQuizTitle(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                            Category
                          </label>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                          >
                            {CATEGORY_OPTIONS.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={aiQuizDescription}
                          onChange={(e) => setAiQuizDescription(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Cover Preview & Regenerate/Upload in Preview */}
                    <div>{renderCoverControlCard()}</div>
                  </div>

                  {/* Editable Questions Header */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                        Editable Questions ({generatedQuestions.length})
                      </span>
                      <span className="ml-2 text-[11px] text-slate-400 font-semibold">
                        Edit text, options, correct answer, explanation, or regenerate individual questions
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddGeneratedQuestion}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-black transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Question</span>
                    </button>
                  </div>

                  {/* Editable Questions List */}
                  <div className="space-y-4">
                    {generatedQuestions.map((q, qIndex) => {
                      const isRegeneratingThis = regeneratingQuestionIdx === qIndex;
                      return (
                        <div
                          key={q.id}
                          className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 transition-all"
                        >
                          {/* Question Card Top Bar */}
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-lg bg-purple-600 text-white text-xs font-black">
                                Q{qIndex + 1}
                              </span>
                              <select
                                value={q.questionType || 'multiple_choice'}
                                onChange={(e) => {
                                  const val = e.target.value as any;
                                  setGeneratedQuestions((prev) =>
                                    prev.map((item, idx) =>
                                      idx === qIndex ? { ...item, questionType: val } : item
                                    )
                                  );
                                }}
                                className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                              >
                                {QUESTION_TYPE_OPTIONS.map((t) => (
                                  <option key={t.value} value={t.value}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                              <span className="text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                {Math.max(1, Math.round(100 / Math.max(1, generatedQuestions.length)))} pts + bonus
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isRegeneratingThis}
                                onClick={() => handleRegenerateSingleQuestion(qIndex)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-extrabold transition-colors cursor-pointer disabled:opacity-50"
                                title="Regenerate this question with AI"
                              >
                                <RefreshCw className={`w-3 h-3 ${isRegeneratingThis ? 'animate-spin' : ''}`} />
                                <span>{isRegeneratingThis ? 'Regenerating...' : 'Regenerate'}</span>
                              </button>

                              {generatedQuestions.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveGeneratedQuestion(qIndex)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 text-[11px] font-bold transition-colors cursor-pointer"
                                  title="Delete question"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Live Highlighted Preview of Question Instruction (Part 5) */}
                          {q.question && (
                            <div className="px-3 py-2 rounded-xl bg-[#F4F9FF] border border-[#DCEBFA] text-xs text-[#10245A]">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[#64748B] block mb-0.5">
                                Student Question Preview:
                              </span>
                              <FormattedQuestionText text={q.question} />
                            </div>
                          )}

                          {/* Question Text Input */}
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                              Question Text (Use &quot;Instruction: Question&quot; to auto-highlight instruction)
                            </label>
                            <input
                              type="text"
                              value={q.question}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGeneratedQuestions((prev) =>
                                  prev.map((item, idx) => (idx === qIndex ? { ...item, question: val } : item))
                                );
                              }}
                              placeholder="e.g. Choose the negative form: We ______ the match yesterday."
                              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                            />
                          </div>

                          {/* 4 Editable Answer Options + Correct Answer Selector */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt, optIdx) => {
                              const isCorrect = q.correctIndex === optIdx;
                              return (
                                <div
                                  key={optIdx}
                                  className={`flex items-center gap-2 p-2 rounded-xl border transition-colors ${
                                    isCorrect
                                      ? 'bg-emerald-50/80 border-emerald-400'
                                      : 'bg-white border-slate-200'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setGeneratedQuestions((prev) =>
                                        prev.map((item, idx) =>
                                          idx === qIndex ? { ...item, correctIndex: optIdx } : item
                                        )
                                      );
                                    }}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 cursor-pointer transition-all ${
                                      isCorrect
                                        ? 'bg-emerald-600 text-white shadow-2xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-purple-100'
                                    }`}
                                    title="Click to mark as Correct Answer"
                                  >
                                    {String.fromCharCode(65 + optIdx)}
                                  </button>
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setGeneratedQuestions((prev) =>
                                        prev.map((item, idx) =>
                                          idx === qIndex
                                            ? {
                                                ...item,
                                                options: item.options.map((o, oi) => (oi === optIdx ? val : o))
                                              }
                                            : item
                                        )
                                      );
                                    }}
                                    placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                    className="flex-1 bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                                  />
                                  {isCorrect && (
                                    <span className="text-[10px] font-black text-emerald-700 shrink-0">
                                      ✓ Correct
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Explanation & Hint Inputs */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                Explanation / Feedback
                              </label>
                              <input
                                type="text"
                                value={q.explanation || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setGeneratedQuestions((prev) =>
                                    prev.map((item, idx) =>
                                      idx === qIndex ? { ...item, explanation: val } : item
                                    )
                                  );
                                }}
                                placeholder="Why is this answer correct?"
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-medium text-slate-700"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                Student Hint (Optional)
                              </label>
                              <div className="relative flex items-center">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-500 absolute left-2.5 pointer-events-none" />
                                <input
                                  type="text"
                                  value={q.hint || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setGeneratedQuestions((prev) =>
                                      prev.map((item, idx) => (idx === qIndex ? { ...item, hint: val } : item))
                                    );
                                  }}
                                  placeholder="Helpful clue without giving away the answer..."
                                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-medium text-slate-700"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAiStep('configure')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Configuration</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleAddGeneratedQuestion}
                        className="inline-flex items-center gap-1 px-3 py-2 text-xs font-black text-purple-700 hover:bg-purple-50 rounded-xl cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Question</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveGeneratedQuiz(false)}
                        disabled={isSaving}
                        className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-extrabold cursor-pointer disabled:opacity-50"
                      >
                        Save to Quiz Library
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveGeneratedQuiz(true)}
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save & Launch Quiz'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ================================================================= */}
          {/* MODE 2: MANUAL QUIZ CREATOR                                       */}
          {/* ================================================================= */}
          {mode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-700 mb-1">Quiz Title *</label>
                  <input
                    type="text"
                    required
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="e.g. Science Chapter 3 Solar System"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">Category</label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:bg-white"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={manualDifficulty}
                    onChange={(e) => setManualDifficulty(e.target.value as LiveQuizDifficulty)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:bg-white"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="What concepts will this live quiz cover?"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-purple-600 focus:bg-white resize-none"
                />
              </div>

              {/* Per-Question Timer, Visibility & Cover Settings (Manual Mode) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Time Per Question */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Time Per Question
                      </span>
                    </div>
                    <select
                      aria-label="Time Per Question"
                      value={!timerEnabled ? 'none' : isCustomTimer ? 'custom' : String(timerSeconds)}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'none') {
                          setTimerEnabled(false);
                          setIsCustomTimer(false);
                        } else if (val === 'custom') {
                          setTimerEnabled(true);
                          setIsCustomTimer(true);
                        } else {
                          const sec = parseInt(val, 10);
                          setTimerEnabled(true);
                          setIsCustomTimer(false);
                          if (!isNaN(sec)) setTimerSeconds(sec);
                        }
                      }}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-purple-600 cursor-pointer shadow-2xs"
                    >
                      <option value="none">No Timer</option>
                      <option value="10">10 seconds</option>
                      <option value="15">15 seconds</option>
                      <option value="20">20 seconds</option>
                      <option value="30">30 seconds</option>
                      <option value="45">45 seconds</option>
                      <option value="60">60 seconds</option>
                      <option value="90">90 seconds</option>
                      <option value="120">120 seconds</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    {PER_QUESTION_TIMER_PRESETS.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => {
                          setTimerEnabled(true);
                          setIsCustomTimer(false);
                          setTimerSeconds(sec);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                          timerEnabled && !isCustomTimer && timerSeconds === sec
                            ? 'bg-purple-600 text-white shadow-2xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quiz Visibility */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Library Sharing
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setVisibility('private')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          visibility === 'private'
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Private
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibility('common')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          visibility === 'common'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Common
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium pt-1">
                    {visibility === 'common'
                      ? 'Available in Common Quizzes for other teachers to view and reuse.'
                      : 'Visible only under "Your Quizzes" for your personal use.'}
                  </p>
                </div>

                {/* Quiz Cover Image */}
                {renderCoverControlCard()}
              </div>

              {/* Track This Quiz Option */}
              <label className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 cursor-pointer hover:bg-indigo-50 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={trackQuiz}
                  onChange={(e) => setTrackQuiz(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="block text-xs sm:text-sm font-black text-slate-900">
                    Track this quiz
                  </span>
                  <span className="block text-xs text-slate-600 font-medium">
                    Track student answers and performance to generate learning insights in My Report.
                  </span>
                </div>
              </label>

              {/* Question Count Presets for Manual Editor */}
              <div className="p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-slate-50 rounded-2xl border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Question Count Presets
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black shadow-2xs">
                      Current: {manualQuestions.length} Questions
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium pt-0.5">
                    Quick-set question count or add/remove individual questions below
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-1.5 shrink-0">
                  {QUESTION_COUNT_OPTIONS.map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => handleSetManualCount(cnt)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        manualQuestions.length === cnt
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'bg-white text-purple-900 border border-purple-200 hover:bg-purple-100'
                      }`}
                    >
                      {cnt} Qs
                    </button>
                  ))}
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Questions ({manualQuestions.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleManualAddQuestion}
                    className="inline-flex items-center gap-1 text-xs font-black text-purple-700 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </button>
                </div>

                {manualQuestions.map((q, qIndex) => (
                  <div key={q.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-black text-slate-800">
                          Question {qIndex + 1}
                        </strong>
                        <span className="text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          {Math.max(1, Math.round(100 / Math.max(1, manualQuestions.length)))} pts + bonus
                        </span>
                      </div>
                      {manualQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleManualRemoveQuestion(qIndex)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Remove question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {q.question && (
                      <div className="px-3 py-1.5 rounded-xl bg-[#F4F9FF] border border-[#DCEBFA] text-xs text-[#10245A]">
                        <FormattedQuestionText text={q.question} />
                      </div>
                    )}

                    <input
                      type="text"
                      required
                      value={q.question}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManualQuestions((prev) =>
                          prev.map((item, i) => (i === qIndex ? { ...item, question: val } : item))
                        );
                      }}
                      placeholder="Type the question prompt (e.g. Select the correct answer: She ______ to school.)"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    />

                    {/* 4 Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIndex) => (
                        <div
                          key={optIndex}
                          className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-slate-200"
                        >
                          <input
                            type="radio"
                            name={`correct_${q.id}`}
                            checked={q.correctIndex === optIndex}
                            onChange={() => {
                              setManualQuestions((prev) =>
                                prev.map((item, i) =>
                                  i === qIndex ? { ...item, correctIndex: optIndex } : item
                                )
                              );
                            }}
                            className="w-4 h-4 text-purple-600 focus:ring-purple-500 ml-1 cursor-pointer"
                            title="Mark as correct answer"
                          />
                          <input
                            type="text"
                            required
                            value={opt}
                            onChange={(e) => {
                              const val = e.target.value;
                              setManualQuestions((prev) =>
                                prev.map((item, i) =>
                                  i === qIndex
                                    ? {
                                        ...item,
                                        options: item.options.map((o, oi) => (oi === optIndex ? val : o))
                                      }
                                    : item
                                )
                              );
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                            className="flex-1 px-2 py-1 text-xs font-medium border-none focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Explanation & Hint */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={q.explanation || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setManualQuestions((prev) =>
                            prev.map((item, i) => (i === qIndex ? { ...item, explanation: val } : item))
                          );
                        }}
                        placeholder="Educational explanation for correct answer (optional)..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-medium text-slate-700 placeholder:text-slate-400"
                      />
                      <input
                        type="text"
                        value={q.hint || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setManualQuestions((prev) =>
                            prev.map((item, i) => (i === qIndex ? { ...item, hint: val } : item))
                          );
                        }}
                        placeholder="Optional hint for students..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-medium text-slate-700 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit Action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-extrabold shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving
                    ? isEditMode
                      ? 'Updating Quiz...'
                      : 'Saving Quiz...'
                    : isEditMode
                    ? 'Save Changes'
                    : 'Save to Quiz Library'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
