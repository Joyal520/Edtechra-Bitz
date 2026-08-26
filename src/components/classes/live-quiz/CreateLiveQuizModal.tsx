import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Shuffle,
  Play,
  BookmarkPlus,
  FileText,
  Clock,
  Globe
} from 'lucide-react';
import { LiveQuizQuestion, LiveQuizDifficulty, LiveQuiz } from '@/types/liveQuiz';
import { liveQuizService } from '@/services/liveQuizService';
import {
  generateAiQuizPrompt,
  validateAndParseAiQuiz,
  ValidationResult
} from '@/utils/aiQuizParser';

interface CreateLiveQuizModalProps {
  isOpen: boolean;
  classroomId: string;
  onClose: () => void;
  onSuccess: (newQuiz: LiveQuiz) => void;
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

const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20, 25, 30];
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
const TIMER_PRESETS = [30, 60, 90, 120, 300, 600];

type ModalMode = 'ai' | 'manual';
type AiStep = 'create_prompt' | 'view_prompt' | 'paste_quiz' | 'quiz_ready';

export const CreateLiveQuizModal: React.FC<CreateLiveQuizModalProps> = ({
  isOpen,
  classroomId,
  onClose,
  onSuccess
}) => {
  const [mode, setMode] = useState<ModalMode>('ai');
  const [aiStep, setAiStep] = useState<AiStep>('create_prompt');

  // AI Prompt Generator Form State
  const [topic, setTopic] = useState('');
  const [learningContent, setLearningContent] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [isCustomCount, setIsCustomCount] = useState(false);
  const [customCountValue, setCustomCountValue] = useState('10');
  const [difficulty, setDifficulty] = useState<LiveQuizDifficulty>('Medium');
  const [category, setCategory] = useState('Grammar');

  // Quiz Timer & Visibility State
  const [timerEnabled, setTimerEnabled] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [visibility, setVisibility] = useState<'common' | 'private'>('private');

  // Generated Prompt State
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Paste & Validate State
  const [pastedJson, setPastedJson] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Manual Mode State
  const [manualTitle, setManualTitle] = useState('');
  const [manualCategory, setManualCategory] = useState('General');
  const [manualDifficulty, setManualDifficulty] = useState<LiveQuizDifficulty>('Medium');
  const [manualDescription, setManualDescription] = useState('');
  const [manualQuestions, setManualQuestions] = useState<LiveQuizQuestion[]>([
    {
      id: 'q1',
      question: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      durationSec: 20
    }
  ]);

  // Submission State
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Question Count Selection
  const handleSelectCount = (count: number) => {
    setIsCustomCount(false);
    setQuestionCount(count);
  };

  const handleCustomCountChange = (val: string) => {
    setCustomCountValue(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0 && num <= 50) {
      setQuestionCount(num);
    }
  };

  // Generate Prompt
  const handleGeneratePrompt = () => {
    if (!topic.trim() && !learningContent.trim()) {
      setError('Please provide either a Quiz Topic or paste Learning Content.');
      return;
    }
    setError(null);

    const count = isCustomCount ? parseInt(customCountValue, 10) || 10 : questionCount;
    const prompt = generateAiQuizPrompt({
      topic: topic.trim(),
      content: learningContent.trim(),
      questionCount: count,
      difficulty,
      category
    });

    setGeneratedPrompt(prompt);
    setAiStep('view_prompt');
  };

  // Copy Prompt to Clipboard
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      // Fallback
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    }
  };

  // Paste from clipboard helper
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPastedJson(text);
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }
  };

  // Validate Pasted AI Quiz
  const handleValidateQuiz = () => {
    setError(null);
    setIsValidating(true);

    try {
      const count = isCustomCount ? parseInt(customCountValue, 10) || 10 : questionCount;
      const result = validateAndParseAiQuiz(pastedJson, count, category, difficulty);
      setValidationResult(result);

      if (result.isValid && result.parsedQuiz) {
        setAiStep('quiz_ready');
      }
    } catch (err: any) {
      setValidationResult({
        isValid: false,
        errors: [err.message || 'Unknown error occurred while validating the quiz JSON.']
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Import and Save Quiz (Cloudflare R2 + Supabase)
  const handleImportAndSave = async (autoLaunch = true) => {
    if (!validationResult || !validationResult.isValid || !validationResult.parsedQuiz) {
      return;
    }

    const { parsedQuiz } = validationResult;
    setIsSaving(true);
    setError(null);

    try {
      const res = await liveQuizService.createCustomQuiz({
        classroom_id: classroomId,
        title: parsedQuiz.title || topic || 'AI Custom Quiz',
        description: parsedQuiz.description || `Generated ${parsedQuiz.questions.length}-question interactive quiz.`,
        category: parsedQuiz.category || category,
        difficulty: parsedQuiz.difficulty || difficulty,
        questions: parsedQuiz.questions,
        visibility,
        timer_enabled: timerEnabled,
        timer_seconds: timerEnabled ? timerSeconds : null,
        is_public: visibility === 'common'
      });

      if (res.error || !res.data) {
        throw new Error(res.error || 'Failed to save imported quiz');
      }

      onSuccess(res.data);
      if (!autoLaunch) {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save quiz to Cloudflare R2 storage');
    } finally {
      setIsSaving(false);
    }
  };

  // Manual Mode: Add Question
  const handleManualAddQuestion = () => {
    const nextId = `q${manualQuestions.length + 1}`;
    setManualQuestions((prev) => [
      ...prev,
      {
        id: nextId,
        question: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        durationSec: 20
      }
    ]);
  };

  // Manual Mode: Remove Question
  const handleManualRemoveQuestion = (idx: number) => {
    if (manualQuestions.length <= 1) return;
    setManualQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  // Manual Mode: Submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!manualTitle.trim()) {
      setError('Please provide a quiz title.');
      return;
    }

    const isValid = manualQuestions.every(
      (q) => q.question.trim() && q.options.every((opt) => opt.trim())
    );
    if (!isValid) {
      setError('Please fill in every question text and all 4 option fields.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await liveQuizService.createCustomQuiz({
        classroom_id: classroomId,
        title: manualTitle.trim(),
        description: manualDescription.trim(),
        category: manualCategory,
        difficulty: manualDifficulty,
        questions: manualQuestions,
        visibility,
        timer_enabled: timerEnabled,
        timer_seconds: timerEnabled ? timerSeconds : null,
        is_public: visibility === 'common'
      });

      if (res.error || !res.data) {
        throw new Error(res.error || 'Failed to save quiz');
      }

      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving quiz');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] p-6 shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* TOP HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">Create Custom Quiz</h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-black border border-purple-200">
                  Cloudflare R2 Storage
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold">
                Generate a quiz with AI using ChatGPT, Gemini or author questions manually
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-black text-slate-600">
              <button
                type="button"
                onClick={() => {
                  setMode('ai');
                  setError(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  mode === 'ai'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Builder</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('manual');
                  setError(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  mode === 'manual'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Manual Editor</span>
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

        {/* STEP PROGRESS INDICATOR (AI Mode) */}
        {mode === 'ai' && (
          <div className="py-3 px-1 border-b border-slate-100 shrink-0 bg-slate-50/60 -mx-6 px-6">
            <div className="flex items-center justify-between max-w-2xl mx-auto text-xs font-black">
              
              {/* Step 1 */}
              <button
                type="button"
                onClick={() => setAiStep('create_prompt')}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                  aiStep === 'create_prompt'
                    ? 'text-purple-700'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  aiStep === 'create_prompt' ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>1</span>
                <span>Create Prompt</span>
              </button>

              <ArrowRight className="w-3.5 h-3.5 text-slate-300" />

              {/* Step 2 */}
              <button
                type="button"
                onClick={() => generatedPrompt && setAiStep('view_prompt')}
                disabled={!generatedPrompt}
                className={`flex items-center gap-1.5 transition-colors ${
                  aiStep === 'view_prompt'
                    ? 'text-purple-700'
                    : generatedPrompt
                    ? 'text-slate-500 hover:text-slate-800 cursor-pointer'
                    : 'text-slate-300 cursor-not-allowed'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  aiStep === 'view_prompt' ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>2</span>
                <span>Generate with AI</span>
              </button>

              <ArrowRight className="w-3.5 h-3.5 text-slate-300" />

              {/* Step 3 */}
              <button
                type="button"
                onClick={() => setAiStep('paste_quiz')}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                  aiStep === 'paste_quiz'
                    ? 'text-purple-700'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  aiStep === 'paste_quiz' ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>3</span>
                <span>Paste Quiz</span>
              </button>

              <ArrowRight className="w-3.5 h-3.5 text-slate-300" />

              {/* Step 4 */}
              <span className={`flex items-center gap-1.5 ${
                aiStep === 'quiz_ready' ? 'text-emerald-700 font-extrabold' : 'text-slate-400'
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  aiStep === 'quiz_ready' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>4</span>
                <span>Launch</span>
              </span>

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
          {/* MODE: AI QUIZ BUILDER                                             */}
          {/* ================================================================= */}
          {mode === 'ai' && (
            <>
              {/* ------------------------------------------------------------- */}
              {/* STEP 1: CREATE YOUR AI PROMPT                                 */}
              {/* ------------------------------------------------------------- */}
              {aiStep === 'create_prompt' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  
                  {/* Topic & Content Options */}
                  <div className="space-y-4 bg-slate-50/80 p-4 sm:p-5 rounded-3xl border border-slate-200/80">
                    
                    {/* Option A: Topic */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                          Option A — Choose a Topic
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium">Type any subject or topic</span>
                      </div>
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. Present Perfect Tense, Solar System, Fractions..."
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                      />

                      {/* Preset Topic Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-2">
                        <span className="text-[10px] font-bold text-slate-400">Examples:</span>
                        {PRESET_TOPICS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTopic(t)}
                            className="px-2.5 py-0.5 rounded-full bg-white hover:bg-purple-50 text-slate-600 hover:text-purple-700 text-[11px] font-semibold border border-slate-200 transition-colors cursor-pointer"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative flex items-center justify-center py-1">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                      <span className="relative px-3 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-400">OR</span>
                    </div>

                    {/* Option B: Paste Learning Content */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                          Option B — Paste Learning Content
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium">Paragraphs, textbook excerpt or notes</span>
                      </div>
                      <textarea
                        rows={3}
                        value={learningContent}
                        onChange={(e) => setLearningContent(e.target.value)}
                        placeholder="Paste your lesson content, article, textbook notes or study paragraph here..."
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none resize-none"
                      />
                    </div>

                  </div>

                  {/* Settings Grid (Questions, Difficulty, Category) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    
                    {/* Number of Questions */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                        Number of Questions
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {QUESTION_COUNT_OPTIONS.map((count) => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => handleSelectCount(count)}
                            className={`py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                              !isCustomCount && questionCount === count
                                ? 'bg-purple-600 text-white shadow-2xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-purple-50'
                            }`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>

                      {/* Custom Count Toggle */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setIsCustomCount(!isCustomCount)}
                          className="text-[11px] font-bold text-purple-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          {isCustomCount ? 'Use preset options' : '+ Custom question count'}
                        </button>
                        {isCustomCount && (
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={customCountValue}
                            onChange={(e) => handleCustomCountChange(e.target.value)}
                            placeholder="e.g. 12"
                            className="mt-1 w-full px-3 py-1.5 bg-white border border-purple-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600"
                          />
                        )}
                      </div>
                    </div>

                    {/* Difficulty */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
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
                      <p className="text-[11px] text-slate-400 font-medium pt-1">
                        Multiple Choice — 4 Options with explanations
                      </p>
                    </div>

                    {/* Category */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                        Category
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
                      <p className="text-[11px] text-slate-400 font-medium pt-1">
                        Saved into your Quiz Bank catalog
                      </p>
                    </div>

                  </div>

                  {/* Quiz Timer & Visibility Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Quiz Timer */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            Quiz Timer
                          </span>
                        </div>
                        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setTimerEnabled(false)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                              !timerEnabled
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            No Timer
                          </button>
                          <button
                            type="button"
                            onClick={() => setTimerEnabled(true)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                              timerEnabled
                                ? 'bg-purple-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Timed
                          </button>
                        </div>
                      </div>

                      {timerEnabled ? (
                        <div className="pt-2 border-t border-slate-200/80 space-y-2.5 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-xs font-bold text-slate-700">
                              Time Limit:
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={1}
                                max={36000}
                                value={timerSeconds}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val)) setTimerSeconds(Math.max(1, Math.min(36000, val)));
                                }}
                                className="w-20 px-2.5 py-1.5 bg-white border border-purple-300 rounded-xl text-xs font-black text-purple-950 text-center focus:ring-2 focus:ring-purple-600 focus:outline-none"
                              />
                              <span className="text-xs font-bold text-slate-500">
                                sec ({Math.floor(timerSeconds / 60)}m {timerSeconds % 60}s)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-wrap pt-1">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mr-1">
                              Presets:
                            </span>
                            {TIMER_PRESETS.map((sec) => (
                              <button
                                key={sec}
                                type="button"
                                onClick={() => setTimerSeconds(sec)}
                                className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                                  timerSeconds === sec
                                    ? 'bg-purple-600 text-white shadow-2xs'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50'
                                }`}
                              >
                                {sec >= 60 ? `${sec / 60}m` : `${sec}s`}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 font-medium pt-1">
                          No overall time limit. Students can complete at their own pace.
                        </p>
                      )}
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

                  </div>

                  {/* Action Button: Generate AI Prompt */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleGeneratePrompt}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-black shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Generate AI Prompt</span>
                    </button>
                  </div>

                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STEP 2: VIEW & COPY AI PROMPT                                 */}
              {/* ------------------------------------------------------------- */}
              {aiStep === 'view_prompt' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <span>Your AI Quiz Prompt</span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-black border border-purple-200">
                          {isCustomCount ? customCountValue : questionCount} Questions • {difficulty}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Copy this prompt and paste it into ChatGPT, Gemini, or Claude.
                      </p>
                    </div>

                    {/* AI Quick Links */}
                    <div className="flex items-center gap-2">
                      <a
                        href="https://chatgpt.com"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                      >
                        <span>ChatGPT</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                      <a
                        href="https://gemini.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                      >
                        <span>Gemini</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    </div>
                  </div>

                  {/* Monospace Code Box */}
                  <div className="relative rounded-2xl bg-slate-900 text-slate-100 p-4 font-mono text-xs max-h-72 overflow-y-auto border border-slate-800">
                    <pre className="whitespace-pre-wrap leading-relaxed">{generatedPrompt}</pre>
                    
                    {/* Floating Copy Button */}
                    <button
                      type="button"
                      onClick={handleCopyPrompt}
                      className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      {copiedPrompt ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Prompt copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Prompt</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Instructions Bar */}
                  <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-purple-900 font-semibold">
                      <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>
                        1. Copy prompt → 2. Paste in ChatGPT / Gemini → 3. Copy the JSON response → 4. Click Next.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAiStep('paste_quiz')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black shrink-0 shadow-2xs active:scale-95 transition-all cursor-pointer"
                    >
                      <span>Next: Paste AI Quiz</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STEP 3: PASTE & VALIDATE AI QUIZ                              */}
              {/* ------------------------------------------------------------- */}
              {aiStep === 'paste_quiz' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        STEP 2 — IMPORT YOUR AI QUIZ
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Paste the AI-generated quiz below. EdTechra will automatically validate and convert it into a Live Quiz.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handlePasteFromClipboard}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Paste from Clipboard</span>
                    </button>
                  </div>

                  {/* JSON Paste Area */}
                  <div className="relative">
                    <textarea
                      rows={8}
                      value={pastedJson}
                      onChange={(e) => setPastedJson(e.target.value)}
                      placeholder='Paste Quiz JSON here... (e.g. { "quiz_title": "...", "questions": [...] })'
                      className="w-full font-mono text-xs p-4 bg-slate-900 text-emerald-400 placeholder:text-slate-500 rounded-2xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Validation Error Box */}
                  {validationResult && !validationResult.isValid && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-black text-rose-900">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Quiz validation failed</span>
                      </div>
                      <ul className="list-disc pl-5 space-y-1 font-medium text-rose-700">
                        {validationResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                      <p className="font-bold text-rose-900 pt-1">
                        Fix the quiz in ChatGPT/Gemini and paste it again. (Your pasted text is preserved above)
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setAiStep('view_prompt')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Prompt</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleValidateQuiz}
                      disabled={isValidating || !pastedJson.trim()}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isValidating ? 'Validating...' : 'Validate Quiz'}</span>
                    </button>
                  </div>

                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STEP 4: QUIZ READY & PREVIEW                                  */}
              {/* ------------------------------------------------------------- */}
              {aiStep === 'quiz_ready' && validationResult?.parsedQuiz && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  
                  {/* Success Status Banner */}
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 flex items-center justify-between flex-wrap gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <h3 className="text-base font-black text-emerald-950">Quiz Ready</h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold text-emerald-800 flex-wrap">
                        <span>✓ {validationResult.parsedQuiz.questions.length} questions validated</span>
                        <span>✓ 4 options per question</span>
                        <span>✓ Correct answers verified</span>
                        <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          <Shuffle className="w-3 h-3" />
                          <span>Choices automatically shuffled</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleImportAndSave(false)}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-extrabold shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        <span>Save to Quiz Bank</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleImportAndSave(true)}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isSaving ? 'Importing...' : 'Launch Lobby Now'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Question Preview Header */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Validated Questions Preview ({validationResult.parsedQuiz.questions.length})
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold">
                      Answers shown for teacher preview only
                    </span>
                  </div>

                  {/* Questions Preview List */}
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {validationResult.parsedQuiz.questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-xs font-black text-slate-900">
                            Question {idx + 1}: {q.question}
                          </strong>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Verified
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {q.options.map((opt, optIdx) => {
                            const isCorrect = q.correctIndex === optIdx;
                            return (
                              <div
                                key={optIdx}
                                className={`p-2 rounded-xl border flex items-center gap-2 font-medium ${
                                  isCorrect
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                                    : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                  isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="truncate">{opt}</span>
                                {isCorrect && (
                                  <span className="ml-auto text-[10px] font-black text-emerald-700">✓ Correct</span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <div className="text-[11px] text-slate-500 italic bg-white p-2 rounded-xl border border-slate-100">
                            <strong>Explanation:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Bottom Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setAiStep('paste_quiz')}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Paste different quiz
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleImportAndSave(false)}
                        disabled={isSaving}
                        className="px-4 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50 rounded-xl"
                      >
                        Save & Close
                      </button>
                      <button
                        type="button"
                        onClick={() => handleImportAndSave(true)}
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md active:scale-95 transition-all"
                      >
                        {isSaving ? 'Launching...' : 'Import & Launch Lobby'}
                      </button>
                    </div>
                  </div>

                </div>
              )}

            </>
          )}

          {/* ================================================================= */}
          {/* MODE: MANUAL QUESTION AUTHORING                                  */}
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
                  <input
                    type="text"
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    placeholder="e.g. Science, Grammar"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:bg-white"
                  />
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

              {/* Quiz Timer & Visibility Settings (Manual Mode) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Quiz Timer */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Quiz Timer
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setTimerEnabled(false)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          !timerEnabled
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        No Timer
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimerEnabled(true)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          timerEnabled
                            ? 'bg-purple-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Timed
                      </button>
                    </div>
                  </div>

                  {timerEnabled ? (
                    <div className="pt-2 border-t border-slate-200/80 space-y-2.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-bold text-slate-700">
                          Time Limit:
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            max={36000}
                            value={timerSeconds}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val)) setTimerSeconds(Math.max(1, Math.min(36000, val)));
                            }}
                            className="w-20 px-2.5 py-1.5 bg-white border border-purple-300 rounded-xl text-xs font-black text-purple-950 text-center focus:ring-2 focus:ring-purple-600 focus:outline-none"
                          />
                          <span className="text-xs font-bold text-slate-500">
                            sec ({Math.floor(timerSeconds / 60)}m {timerSeconds % 60}s)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-wrap pt-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mr-1">
                          Presets:
                        </span>
                        {TIMER_PRESETS.map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => setTimerSeconds(sec)}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                              timerSeconds === sec
                                ? 'bg-purple-600 text-white shadow-2xs'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50'
                            }`}
                          >
                            {sec >= 60 ? `${sec / 60}m` : `${sec}s`}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 font-medium pt-1">
                      No overall time limit. Students can complete at their own pace.
                    </p>
                  )}
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
                      <strong className="text-xs font-black text-slate-800">
                        Question {qIndex + 1}
                      </strong>
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
                      placeholder="Type the question prompt..."
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    />

                    {/* 4 Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-slate-200">
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
                  </div>
                ))}
              </div>

              {/* Submit Action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-extrabold shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Saving to R2...' : 'Save & Prepare Quiz'}
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
