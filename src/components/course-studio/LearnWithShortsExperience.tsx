// ============================================================================
// EDTECHRA COURSE STUDIO: LEARN WITH SHORTS (9:16)
// Integrated microlearning experience within Course Studio:
//   1. LearnWithShortsEditor (Teacher authoring: Short Title, Short Description,
//      Vertical Video Upload 9:16 via Cloudflare R2 or Shorts URL, Mandatory
//      Video Transcript, Subject/Topic, Difficulty Level, Learning Objectives,
//      AI Question Generation from Transcript, Manual Question Creation, and
//      Student Experience Preview)
//   2. LearnWithShortsStudentPlayer (Student experience: Immersive 9:16 vertical
//      player with segment-verified completion & anti-seek enforcement, smooth
//      post-completion QUIT and NEXT → actions, 1-question-at-a-time interactive
//      challenge reusing ComprehensiveQuestionRenderer, and Reward Screen with
//      server-validated XP, accuracy, achievement badges, Next Short & Return)
// ============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Smartphone,
  Upload,
  Sparkles,
  Plus,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trophy,
  Award,
  ArrowRight,
  FileText,
  Target,
  BookOpen,
  Trash2,
  Video,
  Play,
  Calendar,
  Clock,
  Volume2,
  RotateCcw,
  Lightbulb
} from 'lucide-react';
import {
  CourseBlock,
  CourseQuestion,
  DifficultyLevel,
  QuestionType,
  StudentQuestionResponse
} from '@/types/courseStudio';
import { courseStudioService } from '@/services/courseStudioService';
import {
  getCanonicalBlockTranscript,
  setCanonicalBlockTranscript,
  generateTranscriptGrounded10Questions,
  shuffleWordsGuaranteed
} from '@/utils/questionSchemaValidator';
import {
  VideoProgressState,
  createInitialVideoProgressState,
  mergeWatchedSegments,
  computeUniqueWatchedSeconds,
  computeWatchedPercent,
  getMaxWatchedPosition,
  saveLocalVideoProgress,
  extractYouTubeId,
  formatSecondsAsTime
} from '@/utils/videoCompletionTracker';
import { ComprehensiveQuestionRenderer } from './ComprehensiveQuestionRenderer';
import { courseAudio } from '@/utils/courseAudio';
import { triggerConfettiBurst } from '@/utils/courseConfetti';
import { getNextDailyUnlockSummary } from '@/utils/dailyReleaseEngine';
import { normalizeQuestionOptions, resolveCorrectOption } from '@/utils/questionGrading';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<any> | null = null;
function ensureYouTubeIframeAPI(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevCallback === 'function') prevCallback();
      resolve(window.YT);
    };
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);
    }
  });
  return ytApiPromise;
}

// ============================================================================
// 1. TEACHER EDITOR COMPONENT: LearnWithShortsEditor
// ============================================================================

export interface LearnWithShortsEditorProps {
  block: CourseBlock;
  courseId?: string;
  episodeId?: string;
  courseTitle?: string;
  questions: CourseQuestion[];
  onUpdateBlockContent: (newContent: Record<string, any>) => void;
  onAddQuestions?: (newQuestions: CourseQuestion[]) => void;
  onOpenAddQuestionsModal?: () => void;
  onPreviewStudentExperience?: () => void;
  dailyReleaseEnabled?: boolean;
  courseStartDate?: string | null;
  dailyReleaseIntervalDays?: number;
  onUpdateDailyUnlockSettings?: (settings: {
    daily_release_enabled: boolean;
    course_start_date?: string;
    daily_release_interval_days?: number;
  }) => Promise<void> | void;
}

export const LearnWithShortsEditor: React.FC<LearnWithShortsEditorProps> = ({
  block,
  courseId = 'general',
  episodeId = 'ep_temp',
  courseTitle = 'Course',
  questions,
  onUpdateBlockContent,
  onAddQuestions,
  onOpenAddQuestionsModal,
  onPreviewStudentExperience,
  dailyReleaseEnabled = false,
  courseStartDate = null,
  dailyReleaseIntervalDays = 1,
  onUpdateDailyUnlockSettings
}) => {
  const content = (block.content || {}) as Record<string, any>;

  const shortTitle = String(content.title ?? content.video?.title ?? '');
  const shortDescription = String(content.description ?? content.video?.description ?? '');
  const videoUrl = String(content.video_url ?? content.url ?? content.video?.url ?? '');
  const transcript = getCanonicalBlockTranscript(content);
  const readingPassage = String(content.reading_passage ?? content.text ?? '');
  const subjectTopic = String(content.subject_topic ?? '');
  const difficulty: DifficultyLevel =
    content.difficulty === 'easy' || content.difficulty === 'medium' || content.difficulty === 'hard'
      ? content.difficulty
      : 'medium';
  const learningObjectivesRaw = Array.isArray(content.learning_objectives)
    ? content.learning_objectives.join('\n')
    : String(content.learning_objectives ?? '');

  // Upload state
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const embeddedPreviewRef = useRef<HTMLDivElement | null>(null);
  const embeddedVideoRef = useRef<HTMLVideoElement | null>(null);

  // Daily Lesson Unlock state (synced with course settings)
  const [localDailyUnlockEnabled, setLocalDailyUnlockEnabled] = useState<boolean>(Boolean(dailyReleaseEnabled));
  const [localStartDate, setLocalStartDate] = useState<string>(
    courseStartDate ? String(courseStartDate).slice(0, 10) : new Date().toISOString().split('T')[0]
  );
  const [localIntervalDays, setLocalIntervalDays] = useState<number>(
    Math.max(1, Number(dailyReleaseIntervalDays || 1) || 1)
  );
  const [savingDailyUnlock, setSavingDailyUnlock] = useState<boolean>(false);

  useEffect(() => {
    setLocalDailyUnlockEnabled(Boolean(dailyReleaseEnabled));
  }, [dailyReleaseEnabled]);

  useEffect(() => {
    if (courseStartDate) {
      setLocalStartDate(String(courseStartDate).slice(0, 10));
    }
  }, [courseStartDate]);

  useEffect(() => {
    if (dailyReleaseIntervalDays) {
      setLocalIntervalDays(Math.max(1, Number(dailyReleaseIntervalDays) || 1));
    }
  }, [dailyReleaseIntervalDays]);

  // Pause embedded preview playback automatically if teacher scrolls away from it
  useEffect(() => {
    const el = embeddedPreviewRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting && embeddedVideoRef.current && !embeddedVideoRef.current.paused) {
            embeddedVideoRef.current.pause();
          }
        });
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleSaveDailyUnlockSettings = async (nextPatch: {
    daily_release_enabled?: boolean;
    course_start_date?: string;
    daily_release_interval_days?: number;
  }) => {
    const nextEnabled =
      nextPatch.daily_release_enabled !== undefined ? nextPatch.daily_release_enabled : localDailyUnlockEnabled;
    const nextStart = nextPatch.course_start_date !== undefined ? nextPatch.course_start_date : localStartDate;
    const nextInterval =
      nextPatch.daily_release_interval_days !== undefined ? nextPatch.daily_release_interval_days : localIntervalDays;

    setLocalDailyUnlockEnabled(nextEnabled);
    setLocalStartDate(nextStart);
    setLocalIntervalDays(nextInterval);

    const payload = {
      daily_release_enabled: nextEnabled,
      course_start_date: nextStart,
      daily_release_interval_days: nextInterval
    };

    setSavingDailyUnlock(true);
    try {
      if (onUpdateDailyUnlockSettings) {
        await onUpdateDailyUnlockSettings(payload);
      } else if (courseId && courseId !== 'general') {
        await courseStudioService.updateCourse(courseId, payload);
      }
    } catch {
      // Non-fatal in preview/offline
    } finally {
      setSavingDailyUnlock(false);
    }
  };

  // AI Generation state
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);
  const [aiQuestionCount, setAiQuestionCount] = useState<number>(5);

  // Manual Question Creation state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualType, setManualType] = useState<QuestionType>('multiple_choice');
  const [manualQuestionText, setManualQuestionText] = useState('');
  const [manualOptions, setManualOptions] = useState<string[]>(['Option A', 'Option B', 'Option C', 'Option D']);
  const [manualCorrectAnswer, setManualCorrectAnswer] = useState('Option A');
  const [manualPairs, setManualPairs] = useState<Array<{ left: string; right: string }>>([
    { left: 'Term 1', right: 'Definition 1' },
    { left: 'Term 2', right: 'Definition 2' }
  ]);
  const [manualSentence, setManualSentence] = useState('');
  const [manualExplanation, setManualExplanation] = useState('');
  const [manualPoints, setManualPoints] = useState<number>(10);
  const [manualDifficulty, setManualDifficulty] = useState<DifficultyLevel>('medium');

  // Inline Student Experience Preview modal
  const [showInlinePreview, setShowInlinePreview] = useState(false);

  const updateField = (patch: Record<string, any>) => {
    const next = {
      ...content,
      ...patch,
      aspect_ratio: '9:16',
      is_learn_with_shorts: true,
      video: {
        ...(content.video || {}),
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.video_url !== undefined ? { url: patch.video_url } : {}),
        aspect_ratio: '9:16'
      }
    };
    onUpdateBlockContent(next);
  };

  const handleTranscriptChange = (nextTranscript: string) => {
    const updated = setCanonicalBlockTranscript(content, nextTranscript);
    onUpdateBlockContent({
      ...updated,
      show_transcript: false,
      aspect_ratio: '9:16',
      is_learn_with_shorts: true
    });
    if (nextTranscript.trim().length > 0 && aiError) {
      setAiError(null);
    }
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|m4v)$/i.test(file.name)) {
      setUploadError('Please select a valid vertical video file (.mp4, .webm, or .mov).');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadError('Video file exceeds the 50 MB micro-lesson limit. Please upload a shorter vertical clip.');
      return;
    }

    setIsUploadingVideo(true);
    try {
      const uploaded = await courseStudioService.uploadCourseVideo(file, courseId);
      updateField({
        video_url: uploaded.publicUrl,
        url: uploaded.publicUrl,
        storage_key: uploaded.storageKey
      });
    } catch (err: any) {
      setUploadError(err.message || 'Video upload failed. You can also paste a direct vertical video or YouTube Shorts URL.');
    } finally {
      setIsUploadingVideo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerateQuestionsFromTranscript = async () => {
    setAiError(null);
    setAiSuccessMsg(null);

    const cleanTranscript = transcript.trim();
    if (!cleanTranscript || cleanTranscript.length < 20) {
      setAiError('Video Transcript is mandatory! Please enter the transcript of the short video (at least 20 characters) before generating questions.');
      return;
    }

    setIsGeneratingAI(true);
    try {
      let generatedQuestions: CourseQuestion[] = [];
      try {
        const aiData = await courseStudioService.generateQuestionsWithAI({
          course_id: courseId,
          episode_id: episodeId,
          scope: 'episode',
          subject: subjectTopic.trim() || shortTitle.trim() || courseTitle,
          content_text: `SHORT TITLE: ${shortTitle}\nSUBJECT/TOPIC: ${subjectTopic}\nLEARNING OBJECTIVES: ${learningObjectivesRaw}\n\nMANDATORY VIDEO TRANSCRIPT:\n${cleanTranscript}`,
          question_types: [
            'multiple_choice',
            'true_false',
            'fill_blank',
            'matching',
            'sentence_reordering'
          ],
          difficulty,
          question_count: aiQuestionCount,
          instructions: 'Generate questions strictly from the supplied video transcript.'
        });

        if (aiData && Array.isArray(aiData.questions) && aiData.questions.length > 0) {
          const now = Date.now();
          generatedQuestions = aiData.questions.map((q: any, idx: number) => {
            const qType: QuestionType = q.question_type || 'multiple_choice';
            let options: any = q.options || [];
            let items: any = q.items;
            let correctOrder: any = q.correct_order;
            let matchingPairs: any = q.matching_pairs;
            let correctAnswerStr = String(q.correct_answer ?? '').trim();

            if (qType === 'multiple_choice' && Array.isArray(options) && options.length > 1) {
              const normalized = normalizeQuestionOptions(options);
              const resolved = resolveCorrectOption({
                options: normalized,
                correct_answer: correctAnswerStr
              });
              if (resolved) {
                const shuffled = [...normalized];
                for (let i = shuffled.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                const reindexed = shuffled.map((opt, oIdx) => ({
                  id: String.fromCharCode(65 + oIdx),
                  text: opt.text
                }));
                const newCorrectOpt = reindexed.find(opt => opt.text === resolved.text);
                if (typeof options[0] === 'string') {
                  options = reindexed.map(o => o.text);
                  correctAnswerStr = newCorrectOpt ? newCorrectOpt.text : resolved.text;
                } else {
                  options = reindexed;
                  correctAnswerStr = newCorrectOpt ? newCorrectOpt.id : resolved.id;
                }
              }
            }

            if (qType === 'sentence_reordering' || qType === 'sentence_builder' || qType === 'ordering') {
              const sentenceStr = String(q.correct_answer || '').trim();
              const baseTokens = Array.isArray(q.options) && q.options.length > 1
                ? q.options.map((t: any) => String(typeof t === 'object' ? t.text : t))
                : sentenceStr.split(/\s+/).filter(Boolean);
              correctOrder = baseTokens;
              options = shuffleWordsGuaranteed(baseTokens);
              items = options;
            }

            return {
              id: `q_short_${now}_${idx}`,
              episode_id: episodeId,
              course_id: courseId,
              question_text: String(q.question_text || ''),
              question_type: qType,
              options,
              items,
              correct_order: correctOrder,
              matching_pairs: matchingPairs,
              correct_answer: correctAnswerStr,
              explanation: String(q.explanation || 'Grounded in the short video transcript.'),
              skill: String(q.skill || subjectTopic || 'Microlearning Comprehension'),
              concept: String(q.concept || shortTitle || 'Short Lesson'),
              difficulty: (q.difficulty as DifficultyLevel) || difficulty,
              points: Number(q.points) || 10,
              order_index: questions.length + idx
            };
          });
        }
      } catch {
        // Fallback to deterministic transcript-grounded question generator if AI endpoint is unavailable
        const fallbackAll = generateTranscriptGrounded10Questions(
          cleanTranscript,
          shortTitle || 'Learn with Shorts',
          episodeId,
          courseId
        );
        generatedQuestions = fallbackAll.slice(0, aiQuestionCount).map((q, idx) => ({
          ...q,
          difficulty: q.difficulty || difficulty,
          order_index: questions.length + idx
        }));
      }

      if (generatedQuestions.length > 0 && onAddQuestions) {
        onAddQuestions(generatedQuestions);
        setAiSuccessMsg(`Generated ${generatedQuestions.length} interactive questions directly from your video transcript! Review and edit them below before publishing.`);
      }
    } catch (err: any) {
      setAiError(err.message || 'Could not generate questions from transcript.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAddManualQuestion = () => {
    if (!onAddQuestions) return;
    const now = Date.now();
    let newQ: CourseQuestion;

    if (manualType === 'multiple_choice') {
      const cleanOpts = manualOptions.map(o => o.trim()).filter(Boolean);
      const validOpts = cleanOpts.length >= 2 ? cleanOpts : ['Option A', 'Option B', 'Option C', 'Option D'];
      const correct = validOpts.includes(manualCorrectAnswer.trim()) ? manualCorrectAnswer.trim() : validOpts[0];
      newQ = {
        id: `q_manual_${now}`,
        episode_id: episodeId,
        course_id: courseId,
        question_text: manualQuestionText.trim() || 'According to the short video, which statement is correct?',
        question_type: 'multiple_choice',
        options: validOpts,
        correct_answer: correct,
        explanation: manualExplanation.trim() || 'Explained in the vertical short.',
        skill: subjectTopic || 'Comprehension',
        concept: shortTitle || 'Micro Lesson',
        difficulty: manualDifficulty,
        points: manualPoints || 10,
        order_index: questions.length
      };
    } else if (manualType === 'true_false') {
      const tfCorrect = manualCorrectAnswer === 'False' ? 'False' : 'True';
      newQ = {
        id: `q_manual_${now}`,
        episode_id: episodeId,
        course_id: courseId,
        question_text: manualQuestionText.trim() || 'True or False statement based on the short video.',
        question_type: 'true_false',
        options: ['True', 'False'],
        correct_answer: tfCorrect,
        explanation: manualExplanation.trim() || 'Verified from the video transcript.',
        skill: subjectTopic || 'Fact Verification',
        concept: shortTitle || 'Micro Lesson',
        difficulty: manualDifficulty,
        points: manualPoints || 10,
        order_index: questions.length
      };
    } else if (manualType === 'fill_blank') {
      const answerWord = manualCorrectAnswer.trim() || 'answer';
      const promptWithBlank = manualQuestionText.trim().includes('___')
        ? manualQuestionText.trim()
        : `${manualQuestionText.trim() || 'Complete the key concept from the short:'} ________`;
      newQ = {
        id: `q_manual_${now}`,
        episode_id: episodeId,
        course_id: courseId,
        question_text: promptWithBlank,
        question_type: 'fill_blank',
        options: [answerWord],
        correct_answer: answerWord,
        expected_answer: answerWord,
        acceptable_answers: [answerWord, answerWord.toLowerCase()],
        explanation: manualExplanation.trim() || `The missing word is "${answerWord}".`,
        skill: subjectTopic || 'Key Recall',
        concept: shortTitle || 'Micro Lesson',
        difficulty: manualDifficulty,
        points: manualPoints || 10,
        order_index: questions.length
      };
    } else if (manualType === 'matching') {
      const validPairs = manualPairs
        .filter(p => p.left.trim() && p.right.trim())
        .map((p, idx) => ({ id: `pair_${idx}`, left: p.left.trim(), right: p.right.trim() }));
      const pairsToUse = validPairs.length >= 2
        ? validPairs
        : [
            { id: 'pair_0', left: 'Concept A', right: 'Meaning A' },
            { id: 'pair_1', left: 'Concept B', right: 'Meaning B' }
          ];
      newQ = {
        id: `q_manual_${now}`,
        episode_id: episodeId,
        course_id: courseId,
        question_text: manualQuestionText.trim() || 'Match each item from the short video with its partner.',
        question_type: 'matching',
        options: pairsToUse.map(p => `${p.left} -> ${p.right}`),
        matching_pairs: pairsToUse,
        correct_answer: pairsToUse.map(p => `${p.left}:${p.right}`).join('|'),
        explanation: manualExplanation.trim() || 'Correct pairs from the short video.',
        skill: subjectTopic || 'Concept Association',
        concept: shortTitle || 'Micro Lesson',
        difficulty: manualDifficulty,
        points: manualPoints || 10,
        order_index: questions.length
      };
    } else {
      // sentence_reordering
      const cleanSent = (manualSentence.trim() || manualCorrectAnswer.trim() || 'Short videos make learning fast and interactive').replace(/\s+/g, ' ');
      const canonicalWords = cleanSent.split(' ').filter(Boolean);
      const shuffled = shuffleWordsGuaranteed(canonicalWords);
      newQ = {
        id: `q_manual_${now}`,
        episode_id: episodeId,
        course_id: courseId,
        question_text: manualQuestionText.trim() || 'Arrange the words in the correct order based on the short video.',
        question_type: 'sentence_reordering',
        options: shuffled,
        items: shuffled,
        correct_order: canonicalWords,
        correct_answer: cleanSent,
        explanation: manualExplanation.trim() || `Correct sentence: "${cleanSent}"`,
        skill: subjectTopic || 'Sentence Ordering',
        concept: shortTitle || 'Micro Lesson',
        difficulty: manualDifficulty,
        points: manualPoints || 10,
        order_index: questions.length
      };
    }

    onAddQuestions([newQ]);
    setManualQuestionText('');
    setManualExplanation('');
    setShowManualForm(false);
  };

  const ytPreviewId = extractYouTubeId(videoUrl);
  const isTranscriptMissing = transcript.trim().length < 20;

  return (
    <div className="rounded-2xl border-2 border-[#BAE6FD] bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC] p-5 sm:p-6 shadow-sm space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0284C7] to-[#0369A1] text-white flex items-center justify-center shadow-sm">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#0284C7]">
                Learn with Shorts (9:16)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
                Microlearning Editor
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Create interactive micro lessons using short vertical videos followed by gamified questions.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onPreviewStudentExperience) {
              onPreviewStudentExperience();
            } else {
              setShowInlinePreview(true);
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold shadow-sm transition-all"
        >
          <Eye className="w-3.5 h-3.5 text-[#38BDF8]" />
          Preview Student Experience
        </button>
      </div>

      {/* Main Grid: Left (Fields 1, 2, 5, 6, 7) + Right (Vertical Video 9:16 Preview & Upload) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Metadata & Learning Objectives */}
        <div className="lg:col-span-7 space-y-4">
          {/* 1. Short Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-1.5">
              1. Short Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={shortTitle}
              onChange={(e) => updateField({ title: e.target.value })}
              placeholder="e.g., Why Do Stars Twinkle? (60-Second Concept)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/15"
            />
          </div>

          {/* 2. Short Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-1.5">
              2. Short Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={shortDescription}
              onChange={(e) => updateField({ description: e.target.value })}
              placeholder="Brief summary of what students will learn in this vertical micro lesson..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-sm text-[#334155] focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/15 resize-y"
            />
          </div>

          {/* 5. Subject / Topic & 6. Difficulty Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-1.5">
                5. Subject / Topic <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={subjectTopic}
                onChange={(e) => updateField({ subject_topic: e.target.value })}
                placeholder="e.g., Science / Atmospheric Refraction"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-1.5">
                6. Difficulty Level <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((lvl) => {
                  const active = difficulty === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => updateField({ difficulty: lvl })}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                        active
                          ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-sm'
                          : 'bg-white text-[#475569] border-[#CBD5E1] hover:border-[#94A3B8]'
                      }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 7. Learning Objectives */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-1.5 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-[#0284C7]" />
              7. Learning Objectives
            </label>
            <textarea
              rows={3}
              value={learningObjectivesRaw}
              onChange={(e) => updateField({ learning_objectives: e.target.value })}
              placeholder={'Enter learning objectives (one per line):\n• Understand key concept from the short\n• Apply vocabulary in context'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-sm text-[#334155] focus:outline-none focus:border-[#0284C7] resize-y"
            />
          </div>
        </div>

        {/* Right Column: 3. Vertical Video Upload (9:16) + Portrait Preview */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#334155] flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-[#0284C7]" />
              3. Vertical Video Upload (9:16) <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] font-bold text-[#0284C7] bg-[#F0F9FF] px-2 py-0.5 rounded-md border border-[#BAE6FD]">
              Portrait 9:16
            </span>
          </div>

          {/* Cloudflare R2 Direct Video Upload */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
              onChange={handleVideoFileUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploadingVideo}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-60 text-white text-xs font-bold transition-all shadow-xs"
            >
              {isUploadingVideo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading to Cloudflare R2...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Vertical Video (MP4/WebM)
                </>
              )}
            </button>
          </div>

          {/* Or Paste Vertical Video / YouTube Shorts URL */}
          <div>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) =>
                updateField({
                  video_url: e.target.value,
                  url: e.target.value
                })
              }
              placeholder="Or paste vertical video URL (.mp4) or YouTube Shorts link..."
              className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
            />
          </div>

          {uploadError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* 9:16 Vertical Preview Frame (pauses automatically when scrolled out of view) */}
          <div
            ref={embeddedPreviewRef}
            className="mx-auto w-full max-w-[210px] aspect-[9/16] rounded-2xl overflow-hidden bg-[#0F172A] border-2 border-[#1E293B] shadow-md relative flex items-center justify-center"
          >
            {videoUrl ? (
              ytPreviewId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${ytPreviewId}?rel=0&modestbranding=1&playsinline=1`}
                  title={shortTitle || 'Vertical Short Preview'}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  ref={embeddedVideoRef}
                  src={videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              <div className="text-center p-4 space-y-2">
                <div className="w-10 h-10 rounded-full bg-white/10 text-[#38BDF8] flex items-center justify-center mx-auto">
                  <Smartphone className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-white">9:16 Vertical Preview</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Upload a portrait MP4/WebM video or paste a Shorts link above.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Mandatory Video Transcript Section (Teacher-Only) */}
      <div
        className={`rounded-2xl p-4 sm:p-5 border transition-all ${
          isTranscriptMissing
            ? 'bg-amber-50/70 border-amber-300'
            : 'bg-emerald-50/40 border-emerald-200'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <label className="text-xs font-extrabold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0284C7]" />
            4. Video Transcript (Mandatory • Teacher-Only) <span className="text-rose-600">*</span>
          </label>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              isTranscriptMissing
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}
          >
            {isTranscriptMissing ? (
              <>
                <AlertCircle className="w-3 h-3" />
                Mandatory — Required for AI Questions & Publishing
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3" />
                Transcript Verified ({transcript.trim().split(/\s+/).filter(Boolean).length} words)
              </>
            )}
          </span>
        </div>
        <p className="text-xs text-[#475569] mb-2.5">
          Provide the exact spoken transcript of the short video. Stored for teacher reference and AI question generation only (never exposed to students).
        </p>
        <textarea
          rows={4}
          value={transcript}
          onChange={(e) => handleTranscriptChange(e.target.value)}
          placeholder="Paste or type the full transcript of the vertical short video here (required)..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-sm text-[#0F172A] focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/15 resize-y"
        />
      </div>

      {/* Reading Passage Section (Stage 3: READ — ~100 words, A1–A2 Simple English) */}
      <div className="rounded-2xl p-4 sm:p-5 border border-[#BAE6FD] bg-[#F0F9FF]/50 transition-all">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <label className="text-xs font-extrabold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#0284C7]" />
            Reading Passage (Simple English • ~100 Words)
          </label>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
            {readingPassage.trim()
              ? `${readingPassage.trim().split(/\s+/).filter(Boolean).length} words`
              : 'Optional / Recommended (~100 words)'}
          </span>
        </div>
        <p className="text-xs text-[#475569] mb-2.5">
          Students read this passage after the first viewing to understand the video better before watching a second time.
        </p>
        <textarea
          rows={4}
          value={readingPassage}
          onChange={(e) => updateField({ reading_passage: e.target.value, show_transcript: false })}
          placeholder="Enter an A1–A2 simple English reading passage (~100 words) explaining the short video..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-sm text-[#0F172A] focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/15 resize-y"
        />
      </div>

      {/* Reusable Shorts-to-Course Template Sections (Optional Vocabulary, Did You Know, Watch Again & Badge) */}
      <div className="rounded-2xl p-4 sm:p-5 border border-[#CBD5E1] bg-white space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#0284C7]" />
              Reusable Micro-Lesson Sections (Optional)
            </span>
            <p className="text-xs text-[#64748B] mt-0.5">
              Add Key Vocabulary cards, a Did You Know fact, Watch Again instruction, and lesson badge for the 8-step interactive flow.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const curr = Array.isArray(content.vocabulary_cards) ? content.vocabulary_cards : [];
              updateField({
                vocabulary_cards: [
                  ...curr,
                  { word: '', meaning: '', example: '' }
                ]
              });
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0284C7] text-white text-xs font-bold hover:bg-[#0369A1] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Vocabulary Word</span>
          </button>
        </div>

        {Array.isArray(content.vocabulary_cards) && content.vocabulary_cards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {content.vocabulary_cards.map((vc: any, vIdx: number) => (
              <div key={vIdx} className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={vc.word || ''}
                    onChange={(e) => {
                      const next = [...content.vocabulary_cards];
                      next[vIdx] = { ...vc, word: e.target.value };
                      updateField({ vocabulary_cards: next });
                    }}
                    placeholder="Word (e.g. Medieval)"
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-bold text-[#0F172A]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = content.vocabulary_cards.filter((_: any, i: number) => i !== vIdx);
                      updateField({ vocabulary_cards: next });
                    }}
                    className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                    aria-label="Remove vocabulary word"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={vc.meaning || vc.definition || ''}
                  onChange={(e) => {
                    const next = [...content.vocabulary_cards];
                    next[vIdx] = { ...vc, meaning: e.target.value, definition: e.target.value };
                    updateField({ vocabulary_cards: next });
                  }}
                  placeholder="Simple English meaning"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                />
                <input
                  type="text"
                  value={vc.example || ''}
                  onChange={(e) => {
                    const next = [...content.vocabulary_cards];
                    next[vIdx] = { ...vc, example: e.target.value };
                    updateField({ vocabulary_cards: next });
                  }}
                  placeholder="Simple example sentence"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                />
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#334155] mb-1">
              Did You Know? Fact (~20–30 words)
            </label>
            <textarea
              rows={2}
              value={String(content.did_you_know ?? '')}
              onChange={(e) => updateField({ did_you_know: e.target.value })}
              placeholder="One interesting extra fact..."
              className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] resize-y"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#334155] mb-1">
              Watch Again Instruction
            </label>
            <textarea
              rows={2}
              value={String(content.watch_again_instruction ?? '')}
              onChange={(e) => updateField({ watch_again_instruction: e.target.value })}
              placeholder="e.g. Watch again and discover the details you missed."
              className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] resize-y"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#334155] mb-1">
              Lesson Achievement Badge Name
            </label>
            <input
              type="text"
              value={String(content.badge_name ?? '')}
              onChange={(e) => updateField({ badge_name: e.target.value })}
              placeholder="e.g. Mystery Explorer"
              className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#334155] mb-1">
              Completion Message
            </label>
            <input
              type="text"
              value={String(content.completion_message ?? '')}
              onChange={(e) => updateField({ completion_message: e.target.value })}
              placeholder="Shown on the reward screen..."
              className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A]"
            />
          </div>
        </div>
      </div>

      {/* Course Setting: DAILY LESSON UNLOCK */}
      <div
        data-testid="daily-lesson-unlock-settings"
        className={`rounded-2xl p-4 sm:p-5 border transition-all ${
          localDailyUnlockEnabled
            ? 'bg-sky-50/80 border-[#38BDF8] shadow-xs'
            : 'bg-white border-[#E2E8F0]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Clock className="w-4 h-4 text-[#0284C7]" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#0F172A]">
                DAILY LESSON UNLOCK
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                  localDailyUnlockEnabled
                    ? 'bg-[#0284C7] text-white border-[#0284C7]'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {localDailyUnlockEnabled ? 'Enabled' : 'Disabled'}
              </span>
              {savingDailyUnlock && (
                <span className="text-[11px] font-semibold text-[#0284C7] inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </span>
              )}
            </div>
            <p className="text-xs text-[#475569]">
              Release one new micro lesson each day.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
              <button
                type="button"
                data-testid="daily-unlock-disable-btn"
                onClick={() => handleSaveDailyUnlockSettings({ daily_release_enabled: false })}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  !localDailyUnlockEnabled
                    ? 'bg-white text-[#0F172A] shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Disabled
              </button>
              <button
                type="button"
                data-testid="daily-unlock-enable-btn"
                onClick={() => handleSaveDailyUnlockSettings({ daily_release_enabled: true })}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  localDailyUnlockEnabled
                    ? 'bg-[#0284C7] text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Enabled
              </button>
            </div>
          </div>
        </div>

        {localDailyUnlockEnabled && (
          <div className="mt-4 pt-4 border-t border-sky-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#334155] mb-1">
                First Release Date
              </label>
              <input
                type="date"
                value={localStartDate}
                onChange={(e) => handleSaveDailyUnlockSettings({ course_start_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-sky-200 text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#334155] mb-1">
                Daily Release Interval
              </label>
              <select
                value={localIntervalDays}
                onChange={(e) =>
                  handleSaveDailyUnlockSettings({
                    daily_release_interval_days: Math.max(1, Number(e.target.value) || 1)
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-white border border-sky-200 text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
              >
                <option value={1}>1 Day (Default)</option>
                <option value={2}>2 Days</option>
                <option value={3}>3 Days</option>
                <option value={7}>7 Days</option>
              </select>
            </div>

            <div>
              <button
                type="button"
                onClick={() => {
                  if (onPreviewStudentExperience) {
                    onPreviewStudentExperience();
                  } else {
                    setShowInlinePreview(true);
                  }
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Eye className="w-3.5 h-3.5 text-[#38BDF8]" />
                Preview Student Experience
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Gamified Question Creation Toolbar (AI from Transcript + Manual Builder) */}
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-extrabold text-[#0F172A] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0284C7]" />
              Micro-Lesson Challenge Questions ({questions.length} created)
            </h4>
            <p className="text-xs text-[#64748B] mt-0.5">
              Generate questions with AI directly from the supplied transcript or create them manually. Teachers must review questions before publishing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Question count selector for quick AI generation */}
            <select
              value={aiQuestionCount}
              onChange={(e) => setAiQuestionCount(Number(e.target.value) || 5)}
              className="px-2.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-bold text-[#334155]"
              title="Number of AI questions to generate"
            >
              <option value={3}>3 Questions</option>
              <option value={5}>5 Questions</option>
              <option value={8}>8 Questions</option>
              <option value={10}>10 Questions</option>
            </select>

            <button
              type="button"
              disabled={isGeneratingAI}
              onClick={handleGenerateQuestionsFromTranscript}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#0369A1] hover:from-[#0369A1] hover:to-[#075985] disabled:opacity-60 text-white text-xs font-bold shadow-sm transition-all"
            >
              {isGeneratingAI ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating from Transcript...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate Questions with AI
                </>
              )}
            </button>

            {onOpenAddQuestionsModal && (
              <button
                type="button"
                onClick={onOpenAddQuestionsModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F0F9FF] hover:bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] text-xs font-bold transition-all"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Advanced Question Studio
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowManualForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] text-xs font-bold transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-[#0284C7]" />
              {showManualForm ? 'Close Manual Builder' : 'Create Question Manually'}
            </button>
          </div>
        </div>

        {aiError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{aiError}</span>
          </div>
        )}

        {aiSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{aiSuccessMsg}</span>
          </div>
        )}

        {/* Manual Question Creation Form */}
        {showManualForm && (
          <div className="rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#0F172A]">
                Create Question Manually
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { type: 'multiple_choice', label: 'Multiple Choice' },
                    { type: 'true_false', label: 'True or False' },
                    { type: 'fill_blank', label: 'Fill in the Blanks' },
                    { type: 'matching', label: 'Matching' },
                    { type: 'sentence_reordering', label: 'Sentence Ordering' }
                  ] as Array<{ type: QuestionType; label: string }>
                ).map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => {
                      setManualType(item.type);
                      if (item.type === 'true_false') {
                        setManualCorrectAnswer('True');
                      } else if (item.type === 'multiple_choice') {
                        setManualCorrectAnswer(manualOptions[0] || 'Option A');
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      manualType === item.type
                        ? 'bg-[#0284C7] text-white'
                        : 'bg-white text-[#475569] border border-[#CBD5E1] hover:border-[#94A3B8]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                  Question Prompt
                </label>
                <input
                  type="text"
                  value={manualQuestionText}
                  onChange={(e) => setManualQuestionText(e.target.value)}
                  placeholder={
                    manualType === 'fill_blank'
                      ? 'e.g., Stars appear to twinkle due to atmospheric ________.'
                      : 'Enter question prompt based on the short...'
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#CBD5E1] text-xs text-[#0F172A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                    Marks (XP)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={manualPoints}
                    onChange={(e) => setManualPoints(Math.max(1, Number(e.target.value) || 10))}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#CBD5E1] text-xs font-bold text-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                    Difficulty
                  </label>
                  <select
                    value={manualDifficulty}
                    onChange={(e) => setManualDifficulty(e.target.value as DifficultyLevel)}
                    className="w-full px-2.5 py-2 rounded-lg bg-white border border-[#CBD5E1] text-xs font-bold text-[#0F172A]"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Type-specific inputs */}
            {manualType === 'multiple_choice' && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase text-[#475569]">
                  Answer Options (Select the radio button for the correct answer)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {manualOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-[#CBD5E1]">
                      <input
                        type="radio"
                        name="manual_mcq_correct"
                        checked={manualCorrectAnswer === opt}
                        onChange={() => setManualCorrectAnswer(opt)}
                        className="accent-[#0284C7]"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...manualOptions];
                          const wasSelected = manualCorrectAnswer === opt;
                          next[idx] = e.target.value;
                          setManualOptions(next);
                          if (wasSelected) setManualCorrectAnswer(e.target.value);
                        }}
                        className="flex-1 text-xs text-[#0F172A] focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {manualType === 'true_false' && (
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-[#475569]">Correct Answer:</span>
                {['True', 'False'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setManualCorrectAnswer(val)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold border ${
                      manualCorrectAnswer === val
                        ? 'bg-[#0284C7] text-white border-[#0284C7]'
                        : 'bg-white text-[#475569] border-[#CBD5E1]'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            )}

            {manualType === 'fill_blank' && (
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                  Correct Missing Word / Phrase
                </label>
                <input
                  type="text"
                  value={manualCorrectAnswer}
                  onChange={(e) => setManualCorrectAnswer(e.target.value)}
                  placeholder="e.g., refraction"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#CBD5E1] text-xs text-[#0F172A]"
                />
              </div>
            )}

            {manualType === 'matching' && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase text-[#475569]">
                  Matching Pairs
                </label>
                {manualPairs.map((pair, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={pair.left}
                      onChange={(e) => {
                        const next = [...manualPairs];
                        next[idx] = { ...next[idx], left: e.target.value };
                        setManualPairs(next);
                      }}
                      placeholder="Left item"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-xs"
                    />
                    <span className="text-xs font-bold text-[#64748B]">→</span>
                    <input
                      type="text"
                      value={pair.right}
                      onChange={(e) => {
                        const next = [...manualPairs];
                        next[idx] = { ...next[idx], right: e.target.value };
                        setManualPairs(next);
                      }}
                      placeholder="Right match"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-xs"
                    />
                    {manualPairs.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setManualPairs(manualPairs.filter((_, i) => i !== idx))}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setManualPairs([...manualPairs, { left: '', right: '' }])}
                  className="text-xs font-bold text-[#0284C7] hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Pair
                </button>
              </div>
            )}

            {manualType === 'sentence_reordering' && (
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                  Target Sentence (Words will be automatically shuffled for students)
                </label>
                <input
                  type="text"
                  value={manualSentence}
                  onChange={(e) => setManualSentence(e.target.value)}
                  placeholder="e.g., Starlight bends as it travels through Earths atmosphere"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#CBD5E1] text-xs text-[#0F172A]"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                Answer Explanation (Shown to students for immediate feedback)
              </label>
              <input
                type="text"
                value={manualExplanation}
                onChange={(e) => setManualExplanation(e.target.value)}
                placeholder="Explain why this answer is correct based on the video transcript..."
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#CBD5E1] text-xs text-[#0F172A]"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#64748B] hover:bg-[#E2E8F0]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddManualQuestion}
                className="px-4 py-1.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold shadow-xs"
              >
                Add Question to Short
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inline Student Experience Preview Modal */}
      {showInlinePreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl">
            <div className="flex items-center justify-between bg-[#0F172A] text-white px-4 py-3 rounded-t-2xl border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#38BDF8]" />
                <span className="text-xs font-extrabold uppercase tracking-wider">
                  Learn with Shorts — Student Experience Preview
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowInlinePreview(false)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold"
              >
                Close Preview
              </button>
            </div>
            <div className="bg-[#0B1120] rounded-b-2xl p-3 sm:p-6">
              <LearnWithShortsStudentPlayer
                block={block}
                courseId={courseId}
                episodeId={episodeId}
                questions={questions}
                isPreview={true}
                dailyReleaseEnabled={localDailyUnlockEnabled}
                onQuitLesson={() => setShowInlinePreview(false)}
                onReturnToCourse={() => setShowInlinePreview(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. STUDENT EXPERIENCE COMPONENT: LearnWithShortsStudentPlayer
// ============================================================================

export type ShortsStage =
  | 'intro'
  | 'vocabulary'
  | 'watch'
  | 'read'
  | 'watch_again'
  | 'challenge'
  | 'reward'
  | 'course_complete';

export interface ShortsVocabularyItem {
  word: string;
  meaning: string;
  example: string;
}

export interface LearnWithShortsStudentPlayerProps {
  block: CourseBlock;
  courseId: string;
  classroomId?: string;
  episodeId: string;
  userId?: string | null;
  questions: CourseQuestion[];
  questionResponses?: Record<string, StudentQuestionResponse>;
  onQuestionAnswer?: (response: StudentQuestionResponse, question: CourseQuestion) => void;
  onCompleteLesson?: () => Promise<any> | void;
  onNextShort?: () => void;
  onReturnToCourse?: () => void;
  onQuitLesson?: () => void;
  hasNextShort?: boolean;
  isLessonCompleted?: boolean;
  allowRetries?: boolean;
  isPreview?: boolean;
  courseCoverUrl?: string | null;
  dailyReleaseEnabled?: boolean;
  nextUnlockDateLabel?: string;
  nextUnlockCountdown?: string;
  onStageChange?: (stage: ShortsStage) => void;
  onVideoProgressUpdate?: (state: VideoProgressState) => void;
  onVideoCompleted?: (state: VideoProgressState) => void;
}

export const LearnWithShortsStudentPlayer: React.FC<LearnWithShortsStudentPlayerProps> = ({
  block,
  courseId,
  classroomId,
  episodeId,
  userId,
  questions,
  questionResponses = {},
  onQuestionAnswer,
  onCompleteLesson,
  onNextShort,
  onReturnToCourse,
  onQuitLesson,
  hasNextShort = false,
  isLessonCompleted = false,
  allowRetries = true,
  isPreview = false,
  courseCoverUrl = null,
  dailyReleaseEnabled = false,
  nextUnlockDateLabel,
  nextUnlockCountdown,
  onStageChange,
  onVideoProgressUpdate,
  onVideoCompleted
}) => {
  const content = (block.content || {}) as Record<string, any>;
  const shortTitle = String(content.title ?? content.video?.title ?? 'Micro Lesson Short');
  const rawDescription = String(content.description ?? content.video?.description ?? content.hook ?? '').trim();
  const readingPassage = String(content.reading_passage ?? content.text ?? '').trim();
  const hasReadingStage = readingPassage.length > 0;
  // Use existing hook/description from course content; fall back to first sentence of reading passage only if description is empty
  const hookText = useMemo(() => {
    if (rawDescription.length > 0) return rawDescription;
    if (readingPassage.length > 0) {
      const firstSentence = readingPassage.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ').trim();
      if (firstSentence) return firstSentence;
    }
    return '';
  }, [rawDescription, readingPassage]);

  const videoUrl = String(content.video_url ?? content.url ?? content.video?.url ?? '').trim();
  const ytId = useMemo(() => extractYouTubeId(videoUrl), [videoUrl]);
  const baseVideoKey = useMemo(() => ytId || block.id || 'short_video', [ytId, block.id]);

  // Structured Shorts-to-Course template fields (all optional for full backward compatibility)
  const vocabularyCards: ShortsVocabularyItem[] = useMemo(() => {
    const rawList = Array.isArray(content.vocabulary_cards)
      ? content.vocabulary_cards
      : Array.isArray(content.vocabulary)
      ? content.vocabulary
      : [];
    return rawList
      .map((item: any) => ({
        word: String(item?.word || '').trim(),
        meaning: String(item?.meaning || item?.definition || '').trim(),
        example: String(item?.example || '').trim()
      }))
      .filter((item: ShortsVocabularyItem) => item.word.length > 0 && item.meaning.length > 0);
  }, [content.vocabulary_cards, content.vocabulary]);
  const hasVocabularyStage = vocabularyCards.length > 0;
  const didYouKnowText = String(content.did_you_know ?? '').trim();
  const watchAgainInstruction = String(content.watch_again_instruction ?? '').trim();
  const lessonBadgeName = String(content.badge_name ?? '').trim();
  const lessonCompletionMessage = String(content.completion_message ?? '').trim();
  const rewardMode: 'tiered_mystery' | 'classic' =
    content.reward_mode === 'tiered_mystery' ? 'tiered_mystery' : 'classic';
  const isFinalLesson = Boolean(content.is_final_lesson);
  const finalCompletionData = (content.final_completion || null) as Record<string, any> | null;

  // Ordered stage sequence
  const stageSequence: ShortsStage[] = useMemo(() => {
    const seq: ShortsStage[] = ['intro'];
    if (hasVocabularyStage) seq.push('vocabulary');
    seq.push('watch');
    if (hasReadingStage) seq.push('read');
    seq.push('watch_again', 'challenge', 'reward');
    if (isFinalLesson) seq.push('course_complete');
    return seq;
  }, [hasVocabularyStage, hasReadingStage, isFinalLesson]);

  // Cover / thumbnail image for Stage 1 (Intro) and Stage 3/4 (Reading Header)
  const coverArtworkUrl = useMemo(() => {
    if (content.cover_image_url) return String(content.cover_image_url);
    if (content.image_url) return String(content.image_url);
    if (ytId) return `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
    if (courseCoverUrl) return courseCoverUrl;
    return '/images/creepy-legends-cover.jpg';
  }, [content.cover_image_url, content.image_url, ytId, courseCoverUrl]);

  const [stage, setStage] = useState<ShortsStage>('intro');
  const [maxUnlockedStageIdx, setMaxUnlockedStageIdx] = useState<number>(() =>
    isLessonCompleted ? Math.max(0, stageSequence.length - 1) : 0
  );
  const [listenedVocabWords, setListenedVocabWords] = useState<string[]>([]);
  const [speakingVocabWord, setSpeakingVocabWord] = useState<string | null>(null);
  const [activeReadingWord, setActiveReadingWord] = useState<ShortsVocabularyItem | null>(null);
  const [showWatchAgainCaption, setShowWatchAgainCaption] = useState<boolean>(false);
  const loggedMilestonesRef = useRef<Set<string>>(new Set());

  const logStageMilestone = useCallback(
    (eventType: string, metadata: Record<string, any> = {}) => {
      if (isPreview || !courseId || courseId === 'general' || !episodeId) return;
      if (loggedMilestonesRef.current.has(eventType)) return;
      loggedMilestonesRef.current.add(eventType);
      courseStudioService.recordLearningEvent({
        course_id: courseId,
        classroom_id: classroomId || null,
        episode_id: episodeId,
        event_type: eventType,
        metadata: {
          title: shortTitle,
          ...metadata
        }
      });
    },
    [isPreview, courseId, classroomId, episodeId, shortTitle]
  );

  const speakVocabWord = useCallback((wordText: string, extraText?: string) => {
    courseAudio.playClick();
    setListenedVocabWords((prev) => (prev.includes(wordText) ? prev : [...prev, wordText]));
    setSpeakingVocabWord(wordText);
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const phrase = extraText ? `${wordText}. ${extraText}` : wordText;
        const utterance = new SpeechSynthesisUtterance(phrase);
        utterance.lang = 'en-US';
        utterance.rate = 0.88;
        utterance.onend = () => setSpeakingVocabWord((curr) => (curr === wordText ? null : curr));
        utterance.onerror = () => setSpeakingVocabWord((curr) => (curr === wordText ? null : curr));
        window.speechSynthesis.speak(utterance);
        return;
      }
    } catch {
      // Fallback clear below
    }
    setTimeout(() => setSpeakingVocabWord((curr) => (curr === wordText ? null : curr)), 900);
  }, []);

  // Helper to navigate to a stage & advance sequential unlock watermark
  const navigateToStage = useCallback(
    (nextStage: ShortsStage) => {
      const idx = stageSequence.indexOf(nextStage);
      if (idx >= 0) {
        setMaxUnlockedStageIdx((prev) => Math.max(prev, idx));
      }
      setStage(nextStage);
    },
    [stageSequence]
  );

  // Notify parent ONLY when `stage` actually transitions (never on ordinary scroll re-renders)
  const onStageChangeRef = useRef(onStageChange);
  onStageChangeRef.current = onStageChange;
  const onVideoProgressUpdateRef = useRef(onVideoProgressUpdate);
  onVideoProgressUpdateRef.current = onVideoProgressUpdate;
  const onVideoCompletedRef = useRef(onVideoCompleted);
  onVideoCompletedRef.current = onVideoCompleted;
  useEffect(() => {
    onStageChangeRef.current?.(stage);
    if (stage === 'intro') {
      logStageMilestone('lesson_started');
    }
  }, [stage, logStageMilestone]);

  // Active video key depends on whether the student is in Stage 2 (watch) or Stage 4 (watch_again)
  const activeVideoKey = stage === 'watch_again' ? `${baseVideoKey}_watch2` : baseVideoKey;

  // Stage 2 (First Watch) playback & verification state — starts at 0% on each viewing so QUIT/NEXT are hidden when video starts
  const [progressState, setProgressState] = useState<VideoProgressState>(() =>
    createInitialVideoProgressState({
      courseId,
      episodeId,
      videoKey: baseVideoKey,
      durationSeconds: 0
    })
  );

  // Stage 4 (Second Watch: WATCH AGAIN) playback & verification state — starts at 0% on each viewing
  const [secondWatchProgressState, setSecondWatchProgressState] = useState<VideoProgressState>(() =>
    createInitialVideoProgressState({
      courseId,
      episodeId,
      videoKey: `${baseVideoKey}_watch2`,
      durationSeconds: 0
    })
  );

  // Explicit per-viewing threshold (> 90%) verification flags
  const [watch1Unlocked, setWatch1Unlocked] = useState<boolean>(false);
  const [watch2Unlocked, setWatch2Unlocked] = useState<boolean>(false);

  const currentProgressState = stage === 'watch_again' ? secondWatchProgressState : progressState;

  const [isBuffering, setIsBuffering] = useState<boolean>(Boolean(videoUrl));
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [needsUserStartTap, setNeedsUserStartTap] = useState<boolean>(false);
  const [seekNotice, setSeekNotice] = useState<string | null>(null);

  // Interactive Challenge state (1 question at a time)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [localResponses, setLocalResponses] = useState<Record<string, StudentQuestionResponse>>({});
  const [retriedQuestionIds, setRetriedQuestionIds] = useState<Record<string, boolean>>({});
  const [isSubmittingReward, setIsSubmittingReward] = useState<boolean>(false);
  const [serverAwardedXp, setServerAwardedXp] = useState<number | null>(null);

  // Refs for Fullscreen container, HTML5 video, and YouTube Shorts player
  const fullscreenOverlayRef = useRef<HTMLDivElement | null>(null);
  const html5VideoRef = useRef<HTMLVideoElement | null>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const lastTimeRef = useRef<number>(0);
  const lastWallTimeRef = useRef<number>(0);
  const wasPlayingRef = useRef<boolean>(false);
  const isTabVisibleRef = useRef<boolean>(true);
  const progressRef = useRef<VideoProgressState>(currentProgressState);
  progressRef.current = currentProgressState;
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const lastServerSyncRef = useRef<number>(0);

  // Helper to safely exit native browser fullscreen when transitioning away from video stage
  const exitNativeFullscreenIfActive = useCallback(() => {
    try {
      if (typeof document !== 'undefined' && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch {
      // ignore
    }
  }, []);

  // Combined question responses (parent + local state, excluding actively retrying question IDs)
  const mergedResponses = useMemo(() => {
    const combined: Record<string, StudentQuestionResponse> = {
      ...questionResponses,
      ...localResponses
    };
    Object.keys(retriedQuestionIds).forEach((qKey) => {
      if (retriedQuestionIds[qKey]) {
        delete combined[qKey];
      }
    });
    return combined;
  }, [questionResponses, localResponses, retriedQuestionIds]);

  // Filter out empty placeholder questions
  const validQuestions = useMemo(
    () => (questions || []).filter((q) => q && String(q.question_text || '').trim().length > 0),
    [questions]
  );

  // Reset state when episode or video changes
  useEffect(() => {
    exitNativeFullscreenIfActive();
    const initial1 = createInitialVideoProgressState({
      courseId,
      episodeId,
      videoKey: baseVideoKey,
      durationSeconds: 0
    });
    const initial2 = createInitialVideoProgressState({
      courseId,
      episodeId,
      videoKey: `${baseVideoKey}_watch2`,
      durationSeconds: 0
    });

    setProgressState(initial1);
    setSecondWatchProgressState(initial2);
    setWatch1Unlocked(false);
    setWatch2Unlocked(false);
    progressRef.current = initial1;
    lastTimeRef.current = 0;
    lastWallTimeRef.current = 0;
    wasPlayingRef.current = false;
    setStage('intro');
    setMaxUnlockedStageIdx(isLessonCompleted ? Math.max(0, stageSequence.length - 1) : 0);
    setListenedVocabWords([]);
    setActiveReadingWord(null);
    setRetriedQuestionIds({});
    setLocalResponses({});
    loggedMilestonesRef.current = new Set();
    setCurrentQuestionIndex(0);
    setSeekNotice(null);
  }, [courseId, episodeId, baseVideoKey, userId, isLessonCompleted, stageSequence.length, exitNativeFullscreenIfActive]);

  // Lock body scroll during full-screen video stages ('watch' and 'watch_again')
  useEffect(() => {
    if (stage === 'watch' || stage === 'watch_again') {
      lastTimeRef.current = 0;
      lastWallTimeRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
      wasPlayingRef.current = false;
      setSeekNotice(null);
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [stage]);

  // Enter full-screen video mode from Stage 1 (Intro) or Stage 3 (Read)
  const enterFullscreenVideoStage = (targetStage: 'watch' | 'watch_again') => {
    courseAudio.playSelectSound();
    if (targetStage === 'watch') {
      const fresh1 = createInitialVideoProgressState({
        courseId,
        episodeId,
        videoKey: baseVideoKey,
        durationSeconds: 0
      });
      setProgressState(fresh1);
      progressRef.current = fresh1;
      setWatch1Unlocked(false);
    } else {
      const fresh2 = createInitialVideoProgressState({
        courseId,
        episodeId,
        videoKey: `${baseVideoKey}_watch2`,
        durationSeconds: 0
      });
      setSecondWatchProgressState(fresh2);
      progressRef.current = fresh2;
      setWatch2Unlocked(false);
    }
    lastTimeRef.current = 0;
    lastWallTimeRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
    wasPlayingRef.current = false;
    if (targetStage === 'watch_again' && watchAgainInstruction) {
      setShowWatchAgainCaption(true);
      setTimeout(() => setShowWatchAgainCaption(false), 5000);
    } else {
      setShowWatchAgainCaption(false);
    }
    navigateToStage(targetStage);
    setTimeout(() => {
      try {
        const el = fullscreenOverlayRef.current as any;
        if (el && typeof el.requestFullscreen === 'function' && !document.fullscreenElement) {
          el.requestFullscreen().catch(() => {});
        }
      } catch {
        // Fallback is the fixed inset-0 z-[100] full-viewport overlay
      }
    }, 40);
  };

  // Persist video progress to backend
  const syncProgressToServer = useCallback(
    async (stateToSync: VideoProgressState, force = false) => {
      saveLocalVideoProgress(stateToSync, userId);
      if (isPreview) return;
      const now = Date.now();
      if (!force && now - lastServerSyncRef.current < 5000) return;
      lastServerSyncRef.current = now;
      if (!courseId || !episodeId || courseId === 'general') return;

      try {
        await courseStudioService.saveVideoProgress({
          course_id: courseId,
          classroom_id: classroomId,
          episode_id: episodeId,
          video_key: stateToSync.videoKey,
          watched_seconds: stateToSync.watchedSeconds,
          duration_seconds: Math.round(stateToSync.durationSeconds),
          watched_percent: stateToSync.watchedPercent,
          watched_segments: stateToSync.watchedSegments,
          max_allowed_position: stateToSync.maxAllowedPosition,
          is_completed: stateToSync.isCompleted
        });
      } catch {
        // Keep localStorage copy on network hiccup
      }
    },
    [courseId, classroomId, episodeId, userId, isPreview]
  );

  // Pause tracking & playback when browser tab becomes hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      isTabVisibleRef.current = visible;
      if (!visible) {
        wasPlayingRef.current = false;
        if (html5VideoRef.current && !html5VideoRef.current.paused) {
          html5VideoRef.current.pause();
        }
        if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
          try {
            ytPlayerRef.current.pauseVideo();
          } catch {
            // ignore
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Process playback tick through the strict >90% verified playback & anti-skip segment engine
  const handleTick = useCallback(
    (currentTime: number, durationSeconds: number, activelyPlaying: boolean) => {
      const state = progressRef.current;
      const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const validDuration =
        Number.isFinite(durationSeconds) && durationSeconds > 5
          ? durationSeconds
          : state.durationSeconds > 5
          ? state.durationSeconds
          : 0;

      const curr = Math.max(0, Number(currentTime) || 0);
      const allowedFrontier = Math.max(
        state.maxAllowedPosition || 0,
        getMaxWatchedPosition(state.watchedSegments || [])
      );

      // 1. Block seeking ahead past the watched frontier (unless >90% is already verified in this viewing)
      if (!state.isCompleted && curr > allowedFrontier + 2.2) {
        wasPlayingRef.current = false;
        lastTimeRef.current = allowedFrontier;
        lastWallTimeRef.current = nowMs;
        setSeekNotice(`Fast-forwarding is disabled (${formatSecondsAsTime(allowedFrontier)}).`);
        if (html5VideoRef.current) {
          html5VideoRef.current.currentTime = allowedFrontier;
        }
        if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
          try {
            ytPlayerRef.current.seekTo(allowedFrontier, true);
          } catch {
            // ignore
          }
        }
        setTimeout(() => setSeekNotice(null), 2500);
        return;
      }

      // 2. Do not count paused time or hidden tab time
      if (!activelyPlaying || !isTabVisibleRef.current || validDuration <= 5) {
        wasPlayingRef.current = false;
        lastTimeRef.current = curr;
        lastWallTimeRef.current = nowMs;
        if (validDuration > 5 && state.durationSeconds !== validDuration) {
          const updatedDurState: VideoProgressState = {
            ...state,
            durationSeconds: validDuration
          };
          progressRef.current = updatedDurState;
          if (stageRef.current === 'watch_again') {
            setSecondWatchProgressState(updatedDurState);
          } else {
            setProgressState(updatedDurState);
          }
        }
        return;
      }

      // 3. First tick after starting or resuming from pause: anchor media & wall-clock timestamps without crediting paused time
      if (!wasPlayingRef.current) {
        wasPlayingRef.current = true;
        lastTimeRef.current = curr;
        lastWallTimeRef.current = nowMs;
        return;
      }

      // 4. Genuine sequential playback interval verification (bounded by both media progress & real-time playback)
      const mediaDelta = curr - lastTimeRef.current;
      const wallDelta = Math.max(0, (nowMs - lastWallTimeRef.current) / 1000);
      lastWallTimeRef.current = nowMs;

      // Detect rapid forward jump larger than real-time playback
      if (!state.isCompleted && mediaDelta > Math.max(2.2, wallDelta * 1.85) && curr > allowedFrontier + 1.5) {
        lastTimeRef.current = allowedFrontier;
        setSeekNotice(`Fast-forwarding is disabled (${formatSecondsAsTime(allowedFrontier)}).`);
        if (html5VideoRef.current) {
          html5VideoRef.current.currentTime = allowedFrontier;
        }
        if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
          try {
            ytPlayerRef.current.seekTo(allowedFrontier, true);
          } catch {
            // ignore
          }
        }
        setTimeout(() => setSeekNotice(null), 2500);
        return;
      }

      let nextSegments = state.watchedSegments || [];
      if (mediaDelta > 0 && wallDelta > 0) {
        const creditedAdvance = Math.min(mediaDelta, wallDelta * 1.35, 1.5);
        const segStart = Math.max(0, lastTimeRef.current);
        const segEnd = Math.min(validDuration, segStart + creditedAdvance);
        if (segEnd > segStart) {
          nextSegments = mergeWatchedSegments([...nextSegments, [segStart, segEnd]], validDuration);
        }
      }
      lastTimeRef.current = curr;

      const uniqueWatchedSeconds = computeUniqueWatchedSeconds(nextSegments, validDuration);
      const watchedPercent = computeWatchedPercent(uniqueWatchedSeconds, validDuration);
      const nextMaxAllowed = Math.min(
        validDuration,
        Math.max(allowedFrontier, getMaxWatchedPosition(nextSegments))
      );

      // Require MORE than 90% (> 90%) of actual unique video playback to unlock QUIT and NEXT
      const passedNinetyPercent = validDuration > 5 && watchedPercent > 90;
      const isNowCompleted = Boolean(state.isCompleted || passedNinetyPercent);
      const justCompleted = !state.isCompleted && isNowCompleted;

      const nextState: VideoProgressState = {
        ...state,
        durationSeconds: validDuration,
        watchedSeconds: Math.round(uniqueWatchedSeconds),
        watchedPercent,
        watchedSegments: nextSegments,
        maxAllowedPosition: nextMaxAllowed,
        isCompleted: isNowCompleted,
        completedAt: state.completedAt || (isNowCompleted ? new Date().toISOString() : null),
        updatedAt: new Date().toISOString()
      };

      progressRef.current = nextState;
      if (stageRef.current === 'watch_again') {
        setSecondWatchProgressState(nextState);
        if (isNowCompleted) setWatch2Unlocked(true);
      } else {
        setProgressState(nextState);
        if (isNowCompleted) setWatch1Unlocked(true);
        onVideoProgressUpdateRef.current?.(nextState);
      }

      if (isNowCompleted) {
        onVideoCompletedRef.current?.({
          ...nextState,
          videoKey: baseVideoKey,
          isCompleted: true
        });
      }

      syncProgressToServer(nextState, justCompleted);
    },
    [baseVideoKey, syncProgressToServer]
  );

  // Autoplay HTML5 vertical video on open (subject to browser autoplay policy)
  useEffect(() => {
    if ((stage !== 'watch' && stage !== 'watch_again') || ytId || !videoUrl) return;
    const videoEl = html5VideoRef.current;
    if (!videoEl) return;

    let mounted = true;
    const attemptAutoplay = async () => {
      try {
        videoEl.currentTime = 0;
        await videoEl.play();
        if (mounted) {
          setIsPlaying(true);
          setNeedsUserStartTap(false);
        }
      } catch {
        try {
          videoEl.muted = true;
          await videoEl.play();
          if (mounted) {
            setIsPlaying(true);
            setNeedsUserStartTap(false);
          }
        } catch {
          if (mounted) {
            setNeedsUserStartTap(true);
          }
        }
      }
    };

    attemptAutoplay();
    return () => {
      mounted = false;
    };
  }, [stage, ytId, videoUrl]);

  // Setup YouTube IFrame API player when the short is a YouTube Shorts URL
  useEffect(() => {
    if ((stage !== 'watch' && stage !== 'watch_again') || !ytId) return;
    let mounted = true;
    let pollInterval: any = null;

    ensureYouTubeIframeAPI()
      .then((YT) => {
        if (!mounted || !ytContainerRef.current) return;
        if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
          try {
            ytPlayerRef.current.destroy();
          } catch {
            // ignore
          }
        }

        ytPlayerRef.current = new YT.Player(ytContainerRef.current, {
          videoId: ytId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3
          },
          events: {
            onReady: (event: any) => {
              if (!mounted) return;
              setIsBuffering(false);
              const dur = Number(event.target?.getDuration?.()) || 0;
              if (dur > 5) {
                handleTick(0, dur, false);
              }
              try {
                event.target.seekTo(0, true);
                event.target.playVideo();
              } catch {
                setNeedsUserStartTap(true);
              }
            },
            onStateChange: (event: any) => {
              if (!mounted) return;
              const player = event.target;
              const stateCode = event.data;
              const curr = Number(player?.getCurrentTime?.()) || 0;
              const dur = Number(player?.getDuration?.()) || 0;

              if (stateCode === YT.PlayerState.BUFFERING) {
                setIsBuffering(true);
                wasPlayingRef.current = false;
              } else {
                setIsBuffering(false);
              }

              if (stateCode === YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                setNeedsUserStartTap(false);
                handleTick(curr, dur, true);
              } else if (stateCode === YT.PlayerState.PAUSED) {
                setIsPlaying(false);
                wasPlayingRef.current = false;
                handleTick(curr, dur, false);
              } else if (stateCode === YT.PlayerState.ENDED) {
                setIsPlaying(false);
                wasPlayingRef.current = false;
                const latest = progressRef.current;
                const validDur = dur > 5 ? dur : latest.durationSeconds;
                if (validDur > 5 && latest.maxAllowedPosition >= Math.max(0, validDur - 2.5)) {
                  const tailSegments = mergeWatchedSegments(
                    [...(latest.watchedSegments || []), [latest.maxAllowedPosition, validDur]],
                    validDur
                  );
                  const watchedSecs = computeUniqueWatchedSeconds(tailSegments, validDur);
                  const watchedPct = computeWatchedPercent(watchedSecs, validDur);
                  const completedNow = Boolean(latest.isCompleted || watchedPct > 90);
                  const nextState: VideoProgressState = {
                    ...latest,
                    durationSeconds: validDur,
                    watchedSeconds: Math.round(watchedSecs),
                    watchedPercent: watchedPct,
                    watchedSegments: tailSegments,
                    maxAllowedPosition: validDur,
                    isCompleted: completedNow,
                    completedAt: latest.completedAt || (completedNow ? new Date().toISOString() : null),
                    updatedAt: new Date().toISOString()
                  };
                  progressRef.current = nextState;
                  if (stageRef.current === 'watch_again') {
                    setSecondWatchProgressState(nextState);
                    if (completedNow) setWatch2Unlocked(true);
                  } else {
                    setProgressState(nextState);
                    if (completedNow) setWatch1Unlocked(true);
                  }
                  syncProgressToServer(nextState, true);
                }
              }
            }
          }
        });

        pollInterval = setInterval(() => {
          const p = ytPlayerRef.current;
          if (!p || typeof p.getPlayerState !== 'function') return;
          const st = p.getPlayerState();
          if (st === 1) {
            const curr = Number(p.getCurrentTime?.()) || 0;
            const dur = Number(p.getDuration?.()) || 0;
            handleTick(curr, dur, true);
          }
        }, 300);
      })
      .catch(() => {
        setIsBuffering(false);
      });

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // ignore
        }
        ytPlayerRef.current = null;
      }
    };
  }, [stage, ytId, handleTick, syncProgressToServer]);

  // Toggle Play/Pause when student taps the vertical video surface
  const handleVideoSurfaceTap = () => {
    if (ytId && ytPlayerRef.current) {
      try {
        const st = ytPlayerRef.current.getPlayerState?.();
        if (st === 1) {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
          wasPlayingRef.current = false;
        } else {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
          setNeedsUserStartTap(false);
        }
      } catch {
        // ignore
      }
      return;
    }

    const v = html5VideoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play()
        .then(() => {
          setIsPlaying(true);
          setNeedsUserStartTap(false);
        })
        .catch(() => {});
    } else {
      v.pause();
      setIsPlaying(false);
      wasPlayingRef.current = false;
    }
  };

  // Verified video completion flag for current watch stage: strictly requires > 90% verified playback in this viewing
  const isVideoCompleted = Boolean(
    (stage === 'watch_again' ? watch2Unlocked : watch1Unlocked) &&
      currentProgressState.durationSeconds > 5 &&
      currentProgressState.watchedPercent > 90
  );

  // Handle REPLAY button inside video player
  const handleReplayVideo = () => {
    courseAudio.playClick();
    if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      try {
        ytPlayerRef.current.seekTo(0, true);
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      } catch {
        // ignore
      }
      return;
    }
    const v = html5VideoRef.current;
    if (v) {
      v.currentTime = 0;
      v.play()
        .then(() => {
          setIsPlaying(true);
          setNeedsUserStartTap(false);
        })
        .catch(() => {});
    }
  };

  // Handle QUIT button after video completion (returns to lesson introduction without awarding completion rewards)
  const handleQuit = async () => {
    exitNativeFullscreenIfActive();
    await syncProgressToServer(progressRef.current, true);
    setStage('intro');
    if (onQuitLesson) {
      onQuitLesson();
    }
  };

  // Handle NEXT → / START CHALLENGE → button after video completion
  const handleNextAfterWatch = async () => {
    if (!isVideoCompleted) return;
    exitNativeFullscreenIfActive();
    await syncProgressToServer(progressRef.current, true);
    courseAudio.playSelectSound();

    if (stage === 'watch') {
      logStageMilestone('first_video_viewed');
      if (hasReadingStage) {
        navigateToStage('read');
        return;
      }
    }

    if (stage === 'watch_again') {
      logStageMilestone('second_video_viewed');
    }

    if (validQuestions.length > 0) {
      setCurrentQuestionIndex(0);
      navigateToStage('challenge');
    } else {
      await handleFinishChallengeAndShowRewards();
    }
  };

  // Handle individual question answer in the 1-at-a-time Interactive Game
  const handleSingleQuestionSubmit = (response: StudentQuestionResponse, question: CourseQuestion) => {
    const qKey = response.questionId || question.id;
    setRetriedQuestionIds((prev) => {
      if (!prev[qKey]) return prev;
      const next = { ...prev };
      delete next[qKey];
      return next;
    });
    setLocalResponses((prev) => ({
      ...prev,
      [qKey]: response
    }));
    if (onQuestionAnswer) {
      onQuestionAnswer(response, question);
    }
  };

  // Clear a single incorrect response to retry immediately
  const handleRetryQuestion = (questionId: string) => {
    if (!allowRetries) return;
    setRetriedQuestionIds((prev) => ({ ...prev, [questionId]: true }));
    setLocalResponses((prev) => {
      if (!prev[questionId]) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  // Retry all incorrect questions from Reward screen (or all questions if user wants to practice again)
  const handleRetryIncorrectFromReward = () => {
    if (!allowRetries) return;
    courseAudio.playClick();
    const wrongIds: string[] = [];
    validQuestions.forEach((q, idx) => {
      const qId = q.id || `q_fallback_${idx}`;
      const resp = mergedResponses[qId];
      if (!resp || resp.status !== 'correct') {
        wrongIds.push(qId);
      }
    });
    const targetIds =
      wrongIds.length > 0
        ? wrongIds
        : validQuestions.map((q, idx) => q.id || `q_fallback_${idx}`);
    if (targetIds.length === 0) return;

    setRetriedQuestionIds((prev) => {
      const next = { ...prev };
      targetIds.forEach((id) => {
        next[id] = true;
      });
      return next;
    });
    setLocalResponses((prev) => {
      const next = { ...prev };
      targetIds.forEach((id) => {
        delete next[id];
      });
      return next;
    });
    const firstIdx = validQuestions.findIndex(
      (q, idx) => (q.id || `q_fallback_${idx}`) === targetIds[0]
    );
    setCurrentQuestionIndex(firstIdx >= 0 ? firstIdx : 0);
    navigateToStage('challenge');
  };

  // Finish the challenge & transition to Reward Screen with server-validated XP
  const handleFinishChallengeAndShowRewards = async () => {
    setIsSubmittingReward(true);
    try {
      onVideoCompletedRef.current?.({
        ...progressRef.current,
        videoKey: baseVideoKey,
        isCompleted: true,
        watchedPercent: Math.max(91, progressRef.current.watchedPercent || 100)
      });
      logStageMilestone('quiz_completed', {
        earned_points: earnedQuestionPoints,
        max_points: maxQuestionPoints
      });
      if (onCompleteLesson) {
        const res = await onCompleteLesson();
        if (res && res.success !== false) {
          const confirmedXp =
            typeof res.credited_lesson_points === 'number' && res.credited_lesson_points > 0
              ? res.credited_lesson_points
              : typeof res.points_awarded === 'number' && res.points_awarded > 0
              ? res.points_awarded
              : null;
          if (confirmedXp !== null) {
            setServerAwardedXp(confirmedXp);
          }
        }
      }
      logStageMilestone('lesson_completed');
      courseAudio.playCompleteSound();
      triggerConfettiBurst();
    } catch {
      // Even if offline/preview, show the reward summary screen
    } finally {
      setIsSubmittingReward(false);
      navigateToStage('reward');
    }
  };

  // Scoring & Gamification Metrics for Reward Screen
  const totalQuestions = validQuestions.length;
  const correctAnswersCount = useMemo(() => {
    return validQuestions.filter((q, idx) => {
      const qId = q.id || `q_fallback_${idx}`;
      const resp = mergedResponses[qId];
      return Boolean(resp && resp.status === 'correct');
    }).length;
  }, [validQuestions, mergedResponses]);

  const maxQuestionPoints = useMemo(() => {
    return validQuestions.reduce((sum, q) => sum + (Number(q.points) || 2), 0);
  }, [validQuestions]);

  const earnedQuestionPoints = useMemo(() => {
    return validQuestions.reduce((sum, q, idx) => {
      const qId = q.id || `q_fallback_${idx}`;
      const resp = mergedResponses[qId];
      if (!resp) return sum;
      return sum + (Number(resp.score) || 0);
    }, 0);
  }, [validQuestions, mergedResponses]);

  // Official Learn with Shorts XP Reward Formula:
  // Tiered Mystery mode: 10/10 -> 20 XP, 8/10 -> 15 XP, 6/10 -> 10 XP, <6/10 -> 5 XP
  // Classic Shorts mode: 5 XP + 2 XP per correct + 5 XP perfect bonus
  const scorePct =
    maxQuestionPoints > 0 ? Math.round((earnedQuestionPoints / maxQuestionPoints) * 100) : 100;
  const calculatedShortsXp =
    rewardMode === 'tiered_mystery'
      ? scorePct >= 100
        ? 20
        : scorePct >= 80
        ? 15
        : scorePct >= 60
        ? 10
        : 5
      : 5 + correctAnswersCount * 2 + (totalQuestions > 0 && correctAnswersCount === totalQuestions ? 5 : 0);
  const totalXpEarned =
    serverAwardedXp !== null && serverAwardedXp >= calculatedShortsXp
      ? serverAwardedXp
      : calculatedShortsXp;
  const accuracyPercent =
    totalQuestions > 0 ? Math.round((correctAnswersCount / totalQuestions) * 100) : 100;

  // Achievement Badge (if earned)
  const earnedBadge = useMemo(() => {
    if (rewardMode === 'tiered_mystery') {
      if (scorePct >= 100) {
        return {
          title: 'Gold Mystery Explorer Badge',
          subtitle: lessonCompletionMessage || 'Perfect score! Every mystery clue unlocked.',
          color: 'from-amber-400 to-orange-500'
        };
      }
      if (scorePct >= 80) {
        return {
          title: 'Silver Mystery Explorer Badge',
          subtitle: lessonCompletionMessage || 'Great work solving this mystery!',
          color: 'from-slate-300 to-sky-500'
        };
      }
      if (scorePct >= 60) {
        return {
          title: 'Bronze Mystery Explorer Badge',
          subtitle: lessonCompletionMessage || 'Good effort! Review the passage and try again for Gold.',
          color: 'from-amber-600 to-amber-800'
        };
      }
      return {
        title: 'Learning Explorer Badge',
        subtitle: lessonCompletionMessage || 'Keep exploring and try incorrect questions again!',
        color: 'from-sky-500 to-blue-600'
      };
    }

    if (totalQuestions > 0 && accuracyPercent === 100) {
      return {
        title: 'Sharp Master',
        subtitle: 'Flawless Mystery Solver',
        color: 'from-amber-400 to-orange-500'
      };
    }
    if (totalQuestions > 0 && accuracyPercent >= 80) {
      return {
        title: 'Quick Thinker',
        subtitle: 'Sharp Mystery Investigator',
        color: 'from-emerald-500 to-teal-600'
      };
    }
    return {
      title: 'Short Finisher',
      subtitle: 'Micro Lesson Accomplished',
      color: 'from-sky-500 to-blue-600'
    };
  }, [rewardMode, scorePct, totalQuestions, accuracyPercent, lessonCompletionMessage]);

  // Helper to render the compact sequential stepper bar so students can revisit earlier unlocked sections
  const renderSectionStepper = (currentStage: ShortsStage) => {
    const labelMap: Record<ShortsStage, string> = {
      intro: '01 Intro',
      vocabulary: '02 Vocab',
      watch: '03 Watch',
      read: '04 Read',
      watch_again: '06 Rewatch',
      challenge: '07 Quiz',
      reward: '08 Reward',
      course_complete: 'Final'
    };
    const steps = stageSequence.filter((s) => s !== 'course_complete');
    return (
      <div
        data-testid="shorts-section-stepper"
        className="w-full max-w-[720px] mx-auto px-3 sm:px-0 mb-3 overflow-x-auto no-scrollbar"
      >
        <div className="inline-flex sm:flex items-center gap-1.5 min-w-max sm:min-w-0 sm:flex-wrap py-1">
          {steps.map((s) => {
            const idx = stageSequence.indexOf(s);
            const isActive = s === currentStage;
            const isUnlocked = idx <= maxUnlockedStageIdx;
            return (
              <button
                key={s}
                type="button"
                disabled={!isUnlocked || isActive}
                onClick={() => {
                  if (!isUnlocked || isActive) return;
                  if (s === 'watch' || s === 'watch_again') {
                    enterFullscreenVideoStage(s);
                  } else {
                    courseAudio.playClick();
                    setStage(s);
                  }
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#0284C7] text-white shadow-xs'
                    : isUnlocked
                    ? 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-700 dark:text-sky-200 border border-sky-400/30 cursor-pointer'
                    : 'bg-slate-200/60 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                {labelMap[s]}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Highlight vocabulary words inline inside Reading paragraphs without disturbing layout or scrolling
  const vocabRegex = useMemo(() => {
    if (vocabularyCards.length === 0) return null;
    const escaped = vocabularyCards
      .map((v) => v.word.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (escaped.length === 0) return null;
    return new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
  }, [vocabularyCards]);

  const renderHighlightedParagraph = (paragraphText: string) => {
    if (!vocabRegex) return paragraphText;
    const parts = paragraphText.split(vocabRegex);
    return parts.map((part, pIdx) => {
      const matchedCard = vocabularyCards.find(
        (v) => v.word.toLowerCase() === part.toLowerCase()
      );
      if (!matchedCard) return <React.Fragment key={pIdx}>{part}</React.Fragment>;
      return (
        <span
          key={pIdx}
          role="button"
          tabIndex={0}
          onClick={() => {
            setActiveReadingWord(matchedCard);
            speakVocabWord(matchedCard.word);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveReadingWord(matchedCard);
              speakVocabWord(matchedCard.word);
            }
          }}
          title={`${matchedCard.word}: ${matchedCard.meaning}`}
          className="bg-amber-100/80 border-b-2 border-amber-400 text-[#0F172A] px-0.5 rounded-[3px] cursor-pointer hover:bg-amber-200/80 transition-colors"
        >
          {part}
        </span>
      );
    });
  };

  // Compute fallback daily unlock info if not passed explicitly
  const fallbackUnlockSummary = useMemo(() => getNextDailyUnlockSummary(null), []);
  const effectiveNextUnlockDate = nextUnlockDateLabel || fallbackUnlockSummary.nextUnlockDateLabel;
  const effectiveNextUnlockCountdown = nextUnlockCountdown || fallbackUnlockSummary.countdownLabel;

  // ==========================================================================
  // STAGE 1: MYSTERY INTRODUCTION / HOOK SCREEN
  // ==========================================================================
  if (stage === 'intro') {
    return (
      <div
        data-testid="shorts-intro-stage"
        className="w-full max-w-2xl mx-auto py-2 sm:py-4 animate-in fade-in duration-300 select-none"
      >
        <div className="relative rounded-3xl overflow-hidden border border-sky-500/25 bg-[#071529] shadow-2xl">
          {/* Cover / Thumbnail Artwork with Dark Readability Overlay */}
          <div className="relative min-h-[380px] sm:min-h-[430px] flex flex-col justify-end p-6 sm:p-9">
            <img
              src={coverArtworkUrl}
              alt={shortTitle}
              className="absolute inset-0 w-full h-full object-cover object-center"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/images/creepy-legends-cover.jpg';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030b18] via-[#051428]/88 to-[#040d1a]/45" />

            <div className="relative z-10 space-y-4 sm:space-y-5 text-center sm:text-left">
              {hasVocabularyStage && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/35 text-sky-200 text-[11px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Section 01 • Mystery Introduction</span>
                </div>
              )}

              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight leading-tight drop-shadow-md">
                {shortTitle}
              </h2>

              {hookText && (
                <p
                  data-testid="shorts-intro-paragraph"
                  className="text-[18px] sm:text-[20px] text-sky-50 font-normal leading-[1.75] max-w-2xl drop-shadow-sm"
                >
                  {hookText}
                </p>
              )}

              <div className="pt-2">
                {hasVocabularyStage ? (
                  <button
                    type="button"
                    data-testid="shorts-vocab-start-button"
                    onClick={() => {
                      courseAudio.playSelectSound();
                      navigateToStage('vocabulary');
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] hover:from-[#0369A1] hover:to-[#0284C7] text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-sky-500/30 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <span>LEARN KEY VOCABULARY</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="shorts-watch-button"
                    onClick={() => enterFullscreenVideoStage('watch')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] hover:from-[#0369A1] hover:to-[#0284C7] text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-sky-500/30 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <span>WATCH SHORT</span>
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // STAGE 2: KEY VOCABULARY CARDS (WITH PRONUNCIATION AUDIO)
  // ==========================================================================
  if (stage === 'vocabulary') {
    const vocabProgressPct =
      vocabularyCards.length > 0
        ? Math.round((listenedVocabWords.length / vocabularyCards.length) * 100)
        : 0;

    const renderHighlightedExample = (sentence: string, targetWord: string) => {
      const cleanWord = targetWord.trim();
      if (!cleanWord) return sentence;
      const escaped = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped}[a-z]*)`, 'gi');
      const parts = sentence.split(regex);
      return parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="not-italic font-bold text-amber-300">
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      );
    };

    return (
      <div
        data-testid="shorts-vocabulary-stage"
        className="w-full max-w-[780px] mx-auto px-3 sm:px-0 py-3 space-y-4 animate-in fade-in duration-300 box-border"
      >
        {renderSectionStepper('vocabulary')}

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#071833] via-[#07152b] to-[#050f20] border border-sky-400/25 p-5 sm:p-7 shadow-2xl text-white space-y-6">
          <div className="pointer-events-none -top-24 -right-24 absolute w-64 h-64 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="pointer-events-none -bottom-24 -left-24 absolute w-64 h-64 rounded-full bg-amber-400/10 blur-3xl" />

          {/* Deck Header & Progress */}
          <div className="relative z-10 space-y-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/35 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Section 02 • Key Vocabulary</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Unlock These {vocabularyCards.length} Mystery Words
                </h2>
                <p className="text-sm sm:text-base text-sky-100/85 leading-relaxed max-w-xl">
                  Tap the audio button on each card to hear clear English pronunciation before you watch the Short.
                </p>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#0b2345] border border-sky-400/30 shadow-inner">
                <CheckCircle2
                  className={`w-4 h-4 ${
                    listenedVocabWords.length === vocabularyCards.length && vocabularyCards.length > 0
                      ? 'text-emerald-400'
                      : 'text-sky-300'
                  }`}
                />
                <span className="text-xs sm:text-sm font-black text-white">
                  {listenedVocabWords.length}/{vocabularyCards.length} Practised
                </span>
              </div>
            </div>

            <div className="w-full h-2 rounded-full bg-[#0c2142] overflow-hidden border border-sky-500/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400 transition-all duration-500"
                style={{ width: `${vocabProgressPct}%` }}
              />
            </div>
          </div>

          {/* Vocabulary Cards Grid */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            {vocabularyCards.map((card, vIdx) => {
              const isSpeaking = speakingVocabWord === card.word;
              const isListened = listenedVocabWords.includes(card.word);
              const cardIndexLabel = String(vIdx + 1).padStart(2, '0');
              return (
                <div
                  key={`${card.word}_${vIdx}`}
                  data-testid={`shorts-vocab-card-${vIdx}`}
                  className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    isSpeaking
                      ? 'bg-gradient-to-br from-[#0e2d57] to-[#081d3b] border-amber-400/80 shadow-[0_12px_32px_rgba(251,191,36,0.18)] -translate-y-0.5'
                      : isListened
                      ? 'bg-gradient-to-br from-[#0a2342] to-[#071830] border-emerald-400/45 shadow-lg'
                      : 'bg-gradient-to-br from-[#0b2344]/95 to-[#07172e] border-sky-400/25 hover:border-sky-300/50 shadow-md'
                  }`}
                >
                  {/* Top Accent Strip */}
                  <div
                    className={`h-1.5 w-full ${
                      isSpeaking
                        ? 'bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400'
                        : isListened
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                        : 'bg-gradient-to-r from-sky-500/70 via-cyan-400/70 to-indigo-400/70'
                    }`}
                  />

                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-lg text-[11px] font-black flex items-center justify-center shrink-0 border ${
                              isSpeaking
                                ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                                : isListened
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                                : 'bg-sky-500/15 text-sky-300 border-sky-400/30'
                            }`}
                          >
                            {cardIndexLabel}
                          </span>
                          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                            {card.word}
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={() => speakVocabWord(card.word, card.example)}
                          aria-label={`Listen to pronunciation of ${card.word}`}
                          className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-black inline-flex items-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95 ${
                            isSpeaking
                              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                              : isListened
                              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/45'
                              : 'bg-sky-500/25 hover:bg-sky-400/35 text-white border border-sky-300/40 shadow-sm'
                          }`}
                        >
                          <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-pulse' : ''}`} />
                          <span>{isSpeaking ? 'Speaking' : isListened ? 'Practised' : 'Listen'}</span>
                        </button>
                      </div>

                      <div className="space-y-1">
                        <span className="block text-[10px] font-black uppercase tracking-widest text-sky-300/80">
                          Meaning
                        </span>
                        <p className="text-[15px] sm:text-base font-medium text-sky-50 leading-relaxed">
                          {card.meaning}
                        </p>
                      </div>
                    </div>

                    {card.example && (
                      <div className="px-3.5 py-2.5 rounded-xl bg-[#040f20]/90 border border-sky-500/20 border-l-2 border-l-amber-400/80 space-y-1">
                        <span className="block text-[10px] font-black uppercase tracking-widest text-amber-300/85">
                          Example
                        </span>
                        <p className="text-sm text-sky-100/90 italic leading-relaxed">
                          “{renderHighlightedExample(card.example, card.word)}”
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative z-10 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-sky-400/20">
            <p className="text-xs sm:text-sm text-sky-100/85 font-medium">
              Ready to see these words in action? Watch the short video now.
            </p>
            <button
              type="button"
              data-testid="shorts-vocab-continue-button"
              onClick={() => {
                logStageMilestone('vocabulary_completed', {
                  word_count: vocabularyCards.length,
                  listened_count: listenedVocabWords.length
                });
                enterFullscreenVideoStage('watch');
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] hover:from-[#0369A1] hover:to-[#0284C7] text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-sky-500/30 cursor-pointer transition-all"
            >
              <span>WATCH THE SHORT</span>
              <Play className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // STAGE 2 (WATCH) & STAGE 4 (WATCH AGAIN): IMMERSIVE FULL-SCREEN SHORT VIDEO
  // ==========================================================================
  if (stage === 'watch' || stage === 'watch_again') {
    const isSecondViewing = stage === 'watch_again';
    return (
      <div
        ref={fullscreenOverlayRef}
        data-testid={isSecondViewing ? 'shorts-watch-again-stage' : 'shorts-watch-stage'}
        onClick={handleVideoSurfaceTap}
        className="fixed inset-0 z-[100] w-screen h-[100dvh] bg-black flex items-center justify-center select-none overflow-hidden cursor-pointer"
      >
        {/* 9:16 Vertical Video Viewport — Zero cards, zero titles, zero badges, zero speaker icons */}
        <div
          key={activeVideoKey}
          className="relative w-full h-full max-w-[56.25dvh] sm:max-w-[440px] aspect-[9/16] bg-black flex items-center justify-center overflow-hidden"
        >
          {videoUrl ? (
            ytId ? (
              <div className="w-full h-full pointer-events-none">
                <div ref={ytContainerRef} className="w-full h-full" />
              </div>
            ) : (
              <video
                ref={html5VideoRef}
                src={videoUrl}
                playsInline
                preload="auto"
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => {
                  setIsBuffering(false);
                  setIsPlaying(true);
                  setNeedsUserStartTap(false);
                }}
                onCanPlay={() => setIsBuffering(false)}
                onLoadedMetadata={(e) => {
                  setIsBuffering(false);
                  const dur = Number(e.currentTarget.duration) || 0;
                  if (dur > 0) {
                    handleTick(e.currentTarget.currentTime || 0, dur, !e.currentTarget.paused);
                  }
                }}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  handleTick(v.currentTime || 0, v.duration || 0, !v.paused && !v.ended);
                }}
                onSeeking={(e) => {
                  const v = e.currentTarget;
                  handleTick(v.currentTime || 0, v.duration || 0, !v.paused);
                }}
                onPause={() => setIsPlaying(false)}
                onEnded={(e) => {
                  setIsPlaying(false);
                  const v = e.currentTarget;
                  const dur = Number(v.duration) || progressRef.current.durationSeconds || 0;
                  const latest = progressRef.current;
                  const canFinalizeTail =
                    dur > 5 && latest.maxAllowedPosition >= Math.max(0, dur - 2.5);
                  const merged = canFinalizeTail
                    ? mergeWatchedSegments(
                        [...latest.watchedSegments, [Math.max(0, dur - 2.5), dur]],
                        dur
                      )
                    : latest.watchedSegments;
                  const uniqueWatched = computeUniqueWatchedSeconds(merged, dur);
                  const watchedPct = computeWatchedPercent(uniqueWatched, dur);
                  const maxWatched = getMaxWatchedPosition(merged);
                  const reached90Plus = dur > 5 && watchedPct > 90;
                  const updatedState: VideoProgressState = {
                    ...latest,
                    durationSeconds: dur,
                    watchedSeconds: Math.round(uniqueWatched),
                    watchedPercent: watchedPct,
                    maxAllowedPosition: Math.max(latest.maxAllowedPosition, maxWatched),
                    watchedSegments: merged,
                    isCompleted: reached90Plus,
                    completedAt: latest.completedAt || (reached90Plus ? new Date().toISOString() : null),
                    updatedAt: new Date().toISOString()
                  };
                  if (stageRef.current === 'watch_again') {
                    setSecondWatchProgressState(updatedState);
                    if (reached90Plus) setWatch2Unlocked(true);
                  } else {
                    setProgressState(updatedState);
                    if (reached90Plus) setWatch1Unlocked(true);
                  }
                  syncProgressToServer(updatedState, true);
                }}
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-white/80">
              <Smartphone className="w-10 h-10 text-[#38BDF8] mb-3" />
              <p className="text-sm font-bold">Vertical Short Not Uploaded Yet</p>
            </div>
          )}

          {/* Subtle Loading Indicator ONLY when buffering */}
          {isBuffering && videoUrl && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-[#38BDF8] animate-spin" />
              </div>
            </div>
          )}

          {/* Browser Autoplay Fallback Tap Prompt ONLY if browser blocks autoplay */}
          {needsUserStartTap && !isPlaying && videoUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="px-5 py-2.5 rounded-full bg-white/95 text-[#0F172A] text-xs font-extrabold shadow-lg">
                Tap to start short
              </div>
            </div>
          )}

          {/* Watch Again Gentle Instruction Caption (brief non-blocking banner on second viewing) */}
          {isSecondViewing && showWatchAgainCaption && watchAgainInstruction && !seekNotice && (
            <div className="absolute top-5 inset-x-4 z-20 p-3 rounded-xl bg-black/75 border border-sky-400/30 text-sky-100 text-xs font-semibold shadow-lg backdrop-blur-md text-center pointer-events-none animate-in fade-in duration-300">
              <span>{watchAgainInstruction}</span>
            </div>
          )}

          {/* Anti-Seek Notice Toast (only if student attempts to skip ahead) */}
          {seekNotice && (
            <div className="absolute top-6 inset-x-4 z-20 p-3 rounded-xl bg-black/80 border border-white/15 text-white text-xs font-semibold shadow-lg backdrop-blur-md flex items-center justify-center text-center">
              <span>{seekNotice}</span>
            </div>
          )}

          {/* Post-Completion Action Buttons: Strictly hidden until >90% verified playback */}
          {isVideoCompleted && (
            <div
              data-testid="shorts-post-completion-actions"
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 inset-x-0 p-5 pt-12 bg-gradient-to-t from-black/90 via-black/55 to-transparent animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out"
            >
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  data-testid="shorts-quit-button"
                  onClick={handleQuit}
                  className="flex-1 py-3.5 px-3 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white font-extrabold text-xs uppercase tracking-wider border border-white/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>QUIT</span>
                </button>

                <button
                  type="button"
                  data-testid="shorts-replay-button"
                  onClick={handleReplayVideo}
                  aria-label="Replay Short Video"
                  className="py-3.5 px-3.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white font-extrabold text-xs uppercase tracking-wider border border-white/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">REPLAY</span>
                </button>

                <button
                  type="button"
                  data-testid="shorts-next-button"
                  onClick={handleNextAfterWatch}
                  className="flex-1 py-3.5 px-3 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] hover:from-[#0369A1] hover:to-[#0284C7] text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-sky-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>NEXT →</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // STAGE 3/4: READING ACTIVITY & DID YOU KNOW — DIGITAL READING BOOK LAYOUT
  // ==========================================================================
  if (stage === 'read') {
    return (
      <div className="w-full m-0 p-0">
        {renderSectionStepper('read')}

        <div
          data-testid="shorts-reading-stage"
          className="w-full max-w-full sm:max-w-[720px] sm:mx-auto m-0 p-0 box-border bg-white sm:rounded-3xl sm:border sm:border-sky-500/25 sm:shadow-xl sm:overflow-hidden"
        >
          {/* Naturally Scrolling Reading Header: Lesson Title + Background Image + Dark Overlay (non-sticky) */}
          <div
            data-testid="shorts-reading-header"
            style={{ position: 'relative' }}
            className="relative w-full min-h-[180px] sm:min-h-[220px] flex items-end px-[20px] py-6 sm:px-8 sm:py-7 overflow-hidden"
          >
            <img
              src={coverArtworkUrl}
              alt={shortTitle}
              className="absolute inset-0 w-full h-full object-cover object-center"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/images/creepy-legends-cover.jpg';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050f1e]/95 via-[#07162c]/70 to-[#050f1e]/35" />
            <h2 className="relative z-10 w-full text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-snug drop-shadow-sm text-left">
              {shortTitle}
            </h2>
          </div>

          {/* Full-Width Digital Book Reading Body with 20px Mobile Padding & 18px Justified Typography */}
          <div className="w-full max-w-full px-[20px] pt-6 pb-10 sm:px-8 sm:pt-8 sm:pb-10 bg-white box-border">
            {readingPassage
              .split(/\n\n+/)
              .filter(Boolean)
              .map((para, idx) => (
                <p
                  key={idx}
                  style={{
                    fontSize: '18px',
                    lineHeight: 1.75,
                    fontWeight: 400,
                    textAlign: 'justify',
                    textJustify: 'inter-word',
                    color: '#0F172A',
                    marginBottom: '20px',
                    overflowWrap: 'break-word',
                    wordBreak: 'normal'
                  }}
                  className="w-full max-w-none text-[18px] leading-[1.75] font-normal text-[#0F172A] last:!mb-0"
                >
                  {renderHighlightedParagraph(para.trim())}
                </p>
              ))}

            {/* Quick Tap-to-Hear Vocabulary Helper Bar (only appears when student taps a highlighted word) */}
            {activeReadingWord && (
              <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-3 animate-in fade-in duration-150">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-amber-950">
                      {activeReadingWord.word}
                    </span>
                    <button
                      type="button"
                      onClick={() => speakVocabWord(activeReadingWord.word)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-200/80 text-amber-950 text-[11px] font-bold cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Hear</span>
                    </button>
                  </div>
                  <p className="text-xs font-medium text-amber-900 mt-0.5">
                    {activeReadingWord.meaning}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveReadingWord(null)}
                  className="text-xs font-bold text-amber-700 hover:text-amber-950 px-2 py-1 cursor-pointer shrink-0"
                >
                  Close
                </button>
              </div>
            )}

            {/* SECTION 05: DID YOU KNOW? */}
            {didYouKnowText && (
              <div
                data-testid="shorts-did-you-know"
                className="mt-7 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50 via-sky-50 to-violet-50 border border-indigo-200/90 shadow-2xs space-y-1.5"
              >
                <div className="flex items-center gap-2 text-indigo-800">
                  <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Lightbulb className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider">
                    Did You Know?
                  </span>
                </div>
                <p className="text-[15px] sm:text-base font-medium text-slate-800 leading-relaxed">
                  {didYouKnowText}
                </p>
              </div>
            )}

            {/* Watch Again Instruction Cue */}
            {watchAgainInstruction && (
              <div className="mt-5 p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-xs sm:text-sm font-semibold text-sky-900 flex items-start gap-2.5">
                <Play className="w-4 h-4 text-[#0284C7] shrink-0 mt-0.5" />
                <span>{watchAgainInstruction}</span>
              </div>
            )}

            {/* Bottom Action Button: Placed naturally after the complete reading passage */}
            <div className="pt-6 mt-7 pb-6 sm:pb-2 border-t border-slate-200/80 flex justify-center sm:justify-end">
              <button
                type="button"
                data-testid="shorts-read-next-button"
                onClick={() => {
                  logStageMilestone('reading_completed');
                  enterFullscreenVideoStage('watch_again');
                }}
                className="w-full sm:w-auto min-h-[52px] inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0284C7] to-[#0369A1] hover:from-[#0369A1] hover:to-[#075985] text-white text-sm font-black uppercase tracking-wider shadow-lg shadow-sky-500/20 active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>I&apos;M READY – WATCH AGAIN</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // STAGE 7: KNOWLEDGE CHALLENGE — 1-BY-1 INTERACTIVE QUIZ WITH RETRY SUPPORT
  // ==========================================================================
  if (stage === 'challenge') {
    const activeQuestion = validQuestions[currentQuestionIndex];
    const activeQuestionId =
      activeQuestion?.id || `q_fallback_${currentQuestionIndex}`;
    const activeResponse = mergedResponses[activeQuestionId];
    const isCurrentAnswered = Boolean(activeResponse);
    const isLastQuestion = currentQuestionIndex >= validQuestions.length - 1;
    const progressPct =
      validQuestions.length > 0
        ? Math.round(((currentQuestionIndex + 1) / validQuestions.length) * 100)
        : 100;

    return (
      <div
        data-testid="shorts-challenge-stage"
        className="w-full max-w-2xl mx-auto px-4 sm:px-0 space-y-4 py-3 animate-in fade-in duration-300 box-border"
      >
        {renderSectionStepper('challenge')}

        {/* Minimal Question Counter & Progress Bar */}
        <div className="rounded-2xl bg-[#07162c] border border-sky-500/25 px-4 py-3.5 shadow-md">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs sm:text-sm font-black text-white tracking-wide">
              Question {currentQuestionIndex + 1} of {validQuestions.length}
            </span>
            <span className="text-xs font-extrabold text-sky-300">
              {earnedQuestionPoints} / {maxQuestionPoints} pts
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#0284C7] to-[#38BDF8] transition-all duration-300 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Active Single Question Card (Reusing ComprehensiveQuestionRenderer with Retry support) */}
        {activeQuestion && (
          <div key={activeQuestionId} className="transition-all duration-300">
            <ComprehensiveQuestionRenderer
              question={activeQuestion}
              index={currentQuestionIndex}
              response={activeResponse}
              allowRetryIncorrect={allowRetries}
              onRetryQuestion={() => handleRetryQuestion(activeQuestionId)}
              onAnswerSubmit={(res) => handleSingleQuestionSubmit(res, activeQuestion)}
              isStudentView={true}
              mode="student"
            />
          </div>
        )}

        {/* Next Question / Finish Challenge Button */}
        {isCurrentAnswered && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={isSubmittingReward}
              onClick={() => {
                if (!isLastQuestion) {
                  setCurrentQuestionIndex((prev) => prev + 1);
                } else {
                  handleFinishChallengeAndShowRewards();
                }
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#0284C7] to-[#0369A1] hover:from-[#0369A1] hover:to-[#075985] text-white text-sm font-extrabold shadow-md transition-all animate-in fade-in cursor-pointer"
            >
              {isSubmittingReward ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Finishing...</span>
                </>
              ) : isLastQuestion ? (
                <>
                  <span>See Results</span>
                  <Trophy className="w-4 h-4 text-amber-300" />
                </>
              ) : (
                <>
                  <span>Next Question</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // STAGE 9 (LESSON 10 FINAL): GRAND COURSE COMPLETION PAGE
  // ==========================================================================
  if (stage === 'course_complete') {
    const achievements = Array.isArray(finalCompletionData?.achievements)
      ? finalCompletionData.achievements
      : [
          '10 Mysteries Explored',
          '10 Videos Watched',
          '50+ Vocabulary Words Encountered',
          '50 Knowledge Questions',
          '10 Lessons Completed'
        ];
    return (
      <div
        data-testid="shorts-course-completion-page"
        className="max-w-2xl mx-auto w-full px-4 sm:px-0 py-3 animate-in zoom-in-95 duration-300 box-border"
      >
        <div className="relative w-full rounded-3xl bg-gradient-to-b from-[#071936] via-[#07162c] to-[#040d1a] border border-amber-400/40 shadow-[0_24px_70px_rgba(251,191,36,0.22)] overflow-hidden text-white p-6 sm:p-9 space-y-6">
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 w-72 h-72 rounded-full bg-sky-500/15 blur-3xl" />

          <div className="relative z-10 text-center space-y-3">
            <div className="relative mx-auto w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 bg-gradient-to-b from-amber-300 via-amber-400 to-sky-500 shadow-[0_0_50px_rgba(251,191,36,0.35)]">
              <div className="w-full h-full rounded-[20px] overflow-hidden bg-[#040e1d] flex items-center justify-center">
                <picture>
                  <source srcSet="/images/shorts_reward_trophy.webp" type="image/webp" />
                  <img
                    src="/images/shorts_reward_trophy.png"
                    alt="EdTechra Master Mystery Explorer Trophy"
                    className="w-full h-full object-cover"
                  />
                </picture>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-sky-200 uppercase">
              {finalCompletionData?.headline || 'YOU DID IT!'}
            </h1>
            <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-amber-300">
              {finalCompletionData?.subheadline || 'CONGRATULATIONS, MYSTERY EXPLORER!'}
            </p>
            <p className="text-sm sm:text-base text-sky-100/95 font-medium max-w-xl mx-auto leading-relaxed">
              {finalCompletionData?.summary ||
                'You have completed EdTechra Bitz: 10 Extraordinary Mysteries Explained. You explored strange events, discovered scientific facts, learned new English vocabulary and challenged your knowledge.'}
            </p>
          </div>

          <div className="relative z-10 p-5 rounded-2xl bg-[#0b2140]/85 border border-sky-400/25 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-sky-300 text-center">
              YOUR LEARNING ACHIEVEMENTS
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {achievements.map((item: string, aIdx: number) => (
                <div
                  key={aIdx}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#061529] border border-sky-400/20 text-xs sm:text-sm font-bold text-white"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-400/15 to-sky-500/20 border-2 border-amber-400/50 text-center space-y-2 shadow-lg">
            <div className="text-[11px] font-black uppercase tracking-widest text-amber-300">
              YOUR FINAL ACHIEVEMENT
            </div>
            <div className="inline-flex items-center gap-2 text-lg sm:text-2xl font-black text-white uppercase tracking-tight">
              <Trophy className="w-6 h-6 text-amber-300" />
              <span>{finalCompletionData?.badge_title || 'EDTECHRA MASTER MYSTERY EXPLORER'}</span>
            </div>
            <p className="text-xs sm:text-sm text-sky-100/90 font-medium">
              {finalCompletionData?.closing_note ||
                'You are now a Master Mystery Explorer! Keep watching. Keep discovering. Keep learning. Your next adventure is waiting!'}
            </p>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setStage('reward')}
              className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              BACK TO LESSON SUMMARY
            </button>
            <button
              type="button"
              data-testid="shorts-final-return-roadmap"
              onClick={() => {
                if (onReturnToCourse) onReturnToCourse();
                else if (onQuitLesson) onQuitLesson();
              }}
              className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
            >
              RETURN TO COURSE ROADMAP
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // STAGE 8: PREMIUM CUSTOM GAMIFIED REWARD SCREEN
  // ==========================================================================
  const hasIncorrectAnswers = correctAnswersCount < totalQuestions;
  return (
    <div className="max-w-lg mx-auto w-full px-4 sm:px-0 py-3 animate-in zoom-in-95 duration-300 box-border">
      {renderSectionStepper('reward')}
      <div
        data-testid="shorts-reward-screen"
        className="relative w-full rounded-3xl bg-gradient-to-b from-[#061830] via-[#07162c] to-[#040d1a] border border-sky-400/30 shadow-[0_24px_60px_rgba(2,132,199,0.28)] overflow-hidden text-white"
      >
        {/* Ambient Ocean Blue & Golden Glow Backdrop */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 w-80 h-56 rounded-full bg-sky-500/15 blur-3xl" />

        {/* Custom Generated 3D Reward Artwork Header */}
        <div className="relative px-6 pt-7 pb-4 text-center">
          <div className="relative mx-auto w-32 h-32 sm:w-36 sm:h-36 rounded-3xl p-1 bg-gradient-to-b from-amber-300/60 via-sky-400/40 to-sky-600/20 shadow-[0_0_40px_rgba(251,191,36,0.25)] mb-4">
            <div className="w-full h-full rounded-[20px] overflow-hidden bg-[#040e1d] flex items-center justify-center relative">
              <picture>
                <source srcSet="/images/shorts_reward_trophy.webp" type="image/webp" />
                <img
                  src="/images/shorts_reward_trophy.png"
                  alt="EdTechra Lesson Completed Trophy"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </picture>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-sky-200 uppercase drop-shadow-sm">
            LESSON COMPLETED!
          </h2>

          {lessonCompletionMessage && (
            <p className="mt-2 text-xs sm:text-sm font-medium text-sky-100/90 max-w-md mx-auto">
              {lessonCompletionMessage}
            </p>
          )}

          {dailyReleaseEnabled && (
            <div
              data-testid="shorts-daily-unlock-notice"
              className="mt-3 space-y-1 max-w-md mx-auto"
            >
              <p className="text-xs sm:text-sm font-semibold text-sky-100/95">
                You have successfully completed today&apos;s micro lesson.
              </p>
              <p className="text-xs sm:text-sm font-bold text-amber-300">
                Your next lesson will unlock tomorrow.
              </p>
              <div className="pt-1.5 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-xs font-bold text-sky-200">
                <Calendar className="w-3.5 h-3.5 text-sky-300" />
                <span>
                  Unlocks {effectiveNextUnlockDate} ({effectiveNextUnlockCountdown})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Core Gamified Stats: Quiz Score (X/10), Correct Answers (X/5), XP Earned (+X XP) */}
        <div className="relative z-10 px-5 sm:px-6 pb-7 space-y-4">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <div className="p-3.5 rounded-2xl bg-[#0b2140]/90 border border-sky-400/25 text-center shadow-inner">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-sky-300">
                Quiz Score
              </span>
              <span
                data-testid="shorts-reward-academic-score"
                className="text-xl sm:text-2xl font-black text-white mt-1 block"
              >
                {earnedQuestionPoints}/{maxQuestionPoints}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0b2140]/90 border border-emerald-400/25 text-center shadow-inner">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                Correct Answers
              </span>
              <span
                data-testid="shorts-reward-correct"
                className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 block"
              >
                {correctAnswersCount}/{totalQuestions}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-b from-amber-500/20 to-[#0b2140]/90 border border-amber-400/35 text-center shadow-inner">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                XP Earned
              </span>
              <span
                data-testid="shorts-reward-xp"
                className="text-xl sm:text-2xl font-black text-amber-300 mt-1 block"
              >
                +{totalXpEarned} XP
              </span>
            </div>
          </div>

          {/* Achievement Badge(s) */}
          {earnedBadge && (
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#0b2140]/85 border border-sky-400/25">
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${earnedBadge.color} text-white flex items-center justify-center shrink-0 shadow-md`}
              >
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black uppercase tracking-wide text-white flex flex-wrap items-center gap-2">
                  <span>{earnedBadge.title}</span>
                  {lessonBadgeName && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px]">
                      {lessonBadgeName}
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-medium text-sky-200/85 mt-0.5">
                  {earnedBadge.subtitle}
                </div>
              </div>
            </div>
          )}

          {/* Vocabulary Learned Summary (with click-to-pronounce) */}
          {hasVocabularyStage && (
            <div className="p-3.5 rounded-2xl bg-[#0b2140]/75 border border-sky-400/20 space-y-2">
              <div className="text-[11px] font-black uppercase tracking-wider text-sky-300 flex items-center justify-between">
                <span>Vocabulary Learned ({vocabularyCards.length})</span>
                <span className="text-[10px] text-sky-200/75 font-semibold">Tap word to hear</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {vocabularyCards.map((vc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => speakVocabWord(vc.word)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/15 hover:bg-sky-500/30 border border-sky-400/30 text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3 text-sky-300" />
                    <span>{vc.word}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Retry Option for Incorrect Questions or Review (only when teacher allows retries) */}
          {allowRetries && validQuestions.length > 0 && (
            <button
              type="button"
              data-testid="shorts-retry-challenge"
              onClick={handleRetryIncorrectFromReward}
              className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-300" />
              <span>{hasIncorrectAnswers ? 'Retry Incorrect Questions' : 'Review & Retry Challenge'}</span>
            </button>
          )}

          {/* Navigation Buttons: Respect DAILY LESSON UNLOCK & Final Lesson */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            {isFinalLesson && (
              <button
                type="button"
                data-testid="shorts-open-final-completion"
                onClick={() => {
                  courseAudio.playCompleteSound();
                  triggerConfettiBurst();
                  logStageMilestone('course_completed');
                  navigateToStage('course_complete');
                }}
                className="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Trophy className="w-4 h-4" />
                <span>FINAL COURSE ACHIEVEMENT →</span>
              </button>
            )}

            {!isFinalLesson && !dailyReleaseEnabled && hasNextShort && onNextShort && (
              <button
                type="button"
                data-testid="shorts-next-short"
                onClick={onNextShort}
                className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] hover:from-[#0369A1] hover:to-[#0284C7] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>CONTINUE TO NEXT LESSON →</span>
              </button>
            )}

            <button
              type="button"
              data-testid="shorts-return-to-course"
              onClick={() => {
                if (onReturnToCourse) onReturnToCourse();
                else if (onQuitLesson) onQuitLesson();
              }}
              className={`w-full ${
                (isFinalLesson || (!dailyReleaseEnabled && hasNextShort && onNextShort))
                  ? 'sm:w-auto bg-white/10 hover:bg-white/15 text-white border border-white/15'
                  : 'bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] hover:from-[#0369A1] hover:to-[#0284C7] text-white shadow-lg shadow-sky-500/25'
              } py-3.5 px-6 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer`}
            >
              RETURN TO COURSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
