// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: INTERACTIVE STUDENT LESSON EXPERIENCE
// Premium dark-blue educational UI for "Learn English with Creepy Legends"
// and structured interactive video + assessment courses.
// ============================================================================

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Check,
  CheckCircle2,
  XCircle,
  Lock,
  Star,
  Volume2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Sparkles,
  Target,
  FileText,
  ArrowRight,
  RotateCcw,
  GripVertical,
  AlertCircle,
  X,
  Camera,
  Award,
  ExternalLink
} from 'lucide-react';
import {
  Course,
  CourseEpisode,
  CourseBlock,
  CourseQuestion
} from '@/types/courseStudio';
import {
  normalizeQuestionOptions,
  evaluateQuestionAnswer,
  resolveCorrectOption,
  isOptionMatchingStudentAnswer
} from '@/utils/questionGrading';
import { courseAudio } from '@/utils/courseAudio';

function contentAny(block?: CourseBlock | null): any {
  return (block?.content as any) || {};
}

// ============================================================================
// 1. HELPER: EXCLUDED STUDENT SECTIONS & CONTENT EXTRACTION
// ============================================================================

/**
 * Checks if a block is one of the 4 sections that must be hidden from the
 * student-facing lesson UI:
 * 1. Lesson Introduction & Learning Goals
 * 2. Simple English Story (A1–A2)
 * 3. Speaking Activity
 * 4. Writing Activity (including "Writing Activity & Daily Challenge")
 */
export function isExcludedStudentSection(block: CourseBlock): boolean {
  if (!block) return true;
  const c = contentAny(block);
  const rawTitle = String(
    c.title ||
    c.heading ||
    ''
  ).trim().toLowerCase();

  const rawText = String(
    c.text ||
    c.markdown ||
    ''
  ).trim().toLowerCase();

  if (!rawTitle && !rawText) return false;

  // 1. Lesson Introduction & Learning Goals
  if (
    rawTitle.includes('lesson introduction') ||
    rawTitle.includes('learning goals') ||
    rawTitle === 'introduction & learning goals'
  ) {
    return true;
  }

  // 2. Simple English Story (A1–A2)
  if (
    rawTitle.includes('simple english story') ||
    rawTitle.startsWith('english story (a1')
  ) {
    return true;
  }

  // 3. Speaking Activity
  if (
    rawTitle === 'speaking activity' ||
    rawTitle.startsWith('speaking activity')
  ) {
    return true;
  }

  // 4. Writing Activity
  if (
    rawTitle === 'writing activity' ||
    rawTitle.startsWith('writing activity')
  ) {
    return true;
  }

  return false;
}

export interface ParsedVocabItem {
  word: string;
  meaning: string;
  example?: string;
}

export interface ParsedGrammarContent {
  title: string;
  explanation: string;
  examples: string[];
}

/**
 * Extracts structured Vocabulary items from markdown table or vocabulary_cards blocks.
 */
export function extractVocabularyFromBlocks(blocks: CourseBlock[]): ParsedVocabItem[] {
  const items: ParsedVocabItem[] = [];

  for (const b of blocks) {
    const c = contentAny(b);
    if (b.block_type === 'vocabulary_cards' && Array.isArray(c.words)) {
      for (const w of c.words) {
        if (w?.word) {
          items.push({
            word: String(w.word).trim(),
            meaning: String(w.definition || w.meaning || '').trim(),
            example: w.example ? String(w.example).trim() : undefined
          });
        }
      }
    }

    const title = String(c.title || '').toLowerCase();
    const text = String(c.text || c.markdown || '');
    if (title.includes('vocabulary') || text.includes('| Word |')) {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (!line.startsWith('|')) continue;
        const cells = line
          .split('|')
          .map(cell => cell.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (cells.length >= 2) {
          const rawWord = cells[0].replace(/[*_`~]/g, '').trim();
          const rawMeaning = cells[1].replace(/[*_`~]/g, '').trim();
          const rawExample = cells[2] ? cells[2].replace(/^[*_"“”']+|[*"“”'_]+$/g, '').trim() : undefined;

          if (
            rawWord &&
            rawWord.toLowerCase() !== 'word' &&
            !rawWord.startsWith('-') &&
            !rawMeaning.startsWith('-')
          ) {
            items.push({
              word: rawWord,
              meaning: rawMeaning,
              example: rawExample
            });
          }
        }
      }
    }
  }

  return items;
}

/**
 * Extracts Grammar Spotlight content from blocks.
 */
export function extractGrammarFromBlocks(blocks: CourseBlock[]): ParsedGrammarContent | null {
  for (const b of blocks) {
    const c = contentAny(b);
    const title = String(c.title || '').trim();
    if (title.toLowerCase().startsWith('grammar:') || title.toLowerCase().includes('grammar')) {
      const text = String(c.text || c.markdown || '').trim();
      const parts = text.split(/\*\*Story Examples:\*\*|\*\*Examples:\*\*/i);
      const explanation = (parts[0] || '').trim();
      const examplesRaw = (parts[1] || '').trim();
      const examples = examplesRaw
        ? examplesRaw
            .split('\n')
            .map(l => l.replace(/^\d+[\.\)]\s*|^[\*\-]\s*/, '').trim())
            .filter(Boolean)
        : [];
      return {
        title: title.replace(/^Grammar:\s*/i, '').trim() || title,
        explanation,
        examples
      };
    }
  }
  return null;
}

/**
 * Extracts YouTube video ID from a URL or ID string.
 */
export function extractYouTubeId(urlOrId?: string | null): string | null {
  if (!urlOrId) return null;
  const trimmed = String(urlOrId).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

// ============================================================================
// 2. COMPONENT PROPS
// ============================================================================

export interface EpisodeNavItem {
  episode: CourseEpisode;
  unitTitle: string;
  unitIndex: number;
  epIndex: number;
  dayNumber: number;
  cleanTitle: string;
  isCompleted: boolean;
  isLocked: boolean;
  unlockMessage?: string | null;
}

interface CreepyLegendsStudentViewProps {
  course: Course;
  selectedEpisode: CourseEpisode;
  allEpisodes: EpisodeNavItem[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  attemptsMap?: Record<string, any>;
  isCompleted?: boolean;
  isCompleting?: boolean;
  isPreviewMode?: boolean;
  onSelectEpisode: (episode: CourseEpisode, isLocked: boolean, unlockMessage?: string | null) => void;
  onRecordAttempt?: (
    question: CourseQuestion,
    studentAnswer: string,
    isCorrect: boolean,
    pointsAwarded: number
  ) => Promise<void> | void;
  onCompleteLesson: () => Promise<void> | void;
  onProgressChange?: (answered: number, total: number) => void;
  onOpenCoverModal?: () => void;
}

// ============================================================================
// 3. MAIN STUDENT VIEW COMPONENT
// ============================================================================

export const CreepyLegendsStudentView: React.FC<CreepyLegendsStudentViewProps> = ({
  course,
  selectedEpisode,
  allEpisodes,
  completedCount,
  totalCount,
  progressPercent,
  attemptsMap = {},
  isCompleted = false,
  isCompleting = false,
  onSelectEpisode,
  onRecordAttempt,
  onCompleteLesson,
  onProgressChange,
  onOpenCoverModal
}) => {
  const dayNavScrollRef = useRef<HTMLDivElement>(null);
  const activeDayBtnRef = useRef<HTMLButtonElement>(null);

  // Current lesson position & clean title
  const currentNavItem = useMemo(() => {
    return (
      allEpisodes.find(item => item.episode.id === selectedEpisode.id) || {
        episode: selectedEpisode,
        unitTitle: 'Unit 1',
        unitIndex: 1,
        epIndex: 1,
        dayNumber: selectedEpisode.position || 1,
        cleanTitle: selectedEpisode.title.replace(/^Day\s+\d+\s*:\s*/i, '').trim(),
        isCompleted,
        isLocked: false
      }
    );
  }, [allEpisodes, selectedEpisode, isCompleted]);

  const dayNumber = currentNavItem.dayNumber;
  const cleanLessonTitle = currentNavItem.cleanTitle || selectedEpisode.title;

  // Blocks & Questions for current episode
  const rawBlocks = useMemo(() => selectedEpisode.blocks || [], [selectedEpisode]);
  const rawQuestions = useMemo(() => selectedEpisode.questions || [], [selectedEpisode]);

  // Extract Video, Vocabulary, Grammar, and any additional non-excluded blocks
  const videoBlock = useMemo(
    () =>
      rawBlocks.find(b => {
        const c = contentAny(b);
        return b.block_type === 'video' || c.video_url || c.url || c.video_id;
      }),
    [rawBlocks]
  );

  const vocabularyList = useMemo(() => extractVocabularyFromBlocks(rawBlocks), [rawBlocks]);
  const grammarContent = useMemo(() => extractGrammarFromBlocks(rawBlocks), [rawBlocks]);

  // Extra custom blocks (that are NOT video, NOT vocabulary, NOT grammar, and NOT in the 4 excluded sections)
  const extraBlocks = useMemo(() => {
    return rawBlocks.filter(b => {
      if (isExcludedStudentSection(b)) return false;
      if (b.block_type === 'video') return false;
      if (b.block_type === 'vocabulary_cards') return false;
      const c = contentAny(b);
      const t = String(c.title || '').toLowerCase();
      if (t.includes('vocabulary') || t.startsWith('grammar:') || t.includes('grammar')) return false;
      return true;
    });
  }, [rawBlocks]);

  // Video state (Lite facade for instant page load)
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showFullVocabModal, setShowFullVocabModal] = useState(false);

  // Mobile collapsible section states (all open by default on desktop, collapsible on mobile)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Group questions by category while preserving all questions
  const {
    mcqQuestions,
    tfQuestions,
    shortQuestions,
    orderingQuestions,
    allValidQuestions
  } = useMemo(() => {
    const mcqs: CourseQuestion[] = [];
    const tfs: CourseQuestion[] = [];
    const shorts: CourseQuestion[] = [];
    const orderings: CourseQuestion[] = [];

    for (const q of rawQuestions) {
      const qt = String(q.question_type || 'multiple_choice').toLowerCase();
      if (qt === 'multiple_choice' || qt === 'image_based' || qt === 'image_selection' || qt === 'odd_one_out') {
        mcqs.push(q);
      } else if (qt === 'true_false' || qt === 'yes_no') {
        tfs.push(q);
      } else if (qt === 'sentence_builder' || qt === 'ordering' || qt === 'sentence_reordering' || qt === 'word_ordering' || qt === 'matching') {
        orderings.push(q);
      } else {
        shorts.push(q);
      }
    }

    return {
      mcqQuestions: mcqs,
      tfQuestions: tfs,
      shortQuestions: shorts,
      orderingQuestions: orderings,
      allValidQuestions: [...mcqs, ...tfs, ...shorts, ...orderings]
    };
  }, [rawQuestions]);

  // Local interactive state per question
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [evaluatedMap, setEvaluatedMap] = useState<
    Record<string, { isCorrect: boolean; pointsAwarded: number; feedback: string; submittedAnswer: string }>
  >({});
  const [orderingSlotsMap, setOrderingSlotsMap] = useState<Record<string, string[]>>({});
  const [orderingBankMap, setOrderingBankMap] = useState<Record<string, string[]>>({});
  const [draggedItem, setDraggedItem] = useState<{ qId: string; word: string; source: 'bank' | 'slot'; index: number } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submittingAll, setSubmittingAll] = useState(false);

  // Reset state when switching episodes
  useEffect(() => {
    setVideoPlaying(false);
    setVideoWatched(Boolean(isCompleted));
    setShowTranscript(false);
    setValidationError(null);
    setCollapsedSections({});

    // Initialize ordering word banks for each ordering question
    const initialSlots: Record<string, string[]> = {};
    const initialBanks: Record<string, string[]> = {};

    orderingQuestions.forEach(q => {
      const rawOpts = Array.isArray(q.options)
        ? q.options.map(o => (typeof o === 'string' ? o : o?.text || String(o)))
        : [];
      const existingAtt = attemptsMap[q.id];
      if (existingAtt && existingAtt.student_answer) {
        const savedWords = String(existingAtt.student_answer).split(/\s+/).filter(Boolean);
        initialSlots[q.id] = savedWords;
        initialBanks[q.id] = [];
      } else {
        initialSlots[q.id] = [];
        initialBanks[q.id] = [...rawOpts];
      }
    });

    setOrderingSlotsMap(initialSlots);
    setOrderingBankMap(initialBanks);

    // Seed draftAnswers and evaluatedMap from attemptsMap
    const nextDrafts: Record<string, string> = {};
    const nextEvaluated: Record<
      string,
      { isCorrect: boolean; pointsAwarded: number; feedback: string; submittedAnswer: string }
    > = {};

    allValidQuestions.forEach(q => {
      const att = attemptsMap[q.id];
      if (att) {
        const ansStr = String(att.student_answer || '');
        nextDrafts[q.id] = ansStr;
        const evalRes = evaluateQuestionAnswer(q, ansStr);
        nextEvaluated[q.id] = {
          isCorrect: Boolean(att.is_correct),
          pointsAwarded: Number(att.points_awarded ?? (att.is_correct ? q.points || 10 : 0)),
          feedback: evalRes.feedback,
          submittedAnswer: ansStr
        };
      }
    });

    setDraftAnswers(nextDrafts);
    setEvaluatedMap(nextEvaluated);
  }, [selectedEpisode.id]);

  // Sync late-arriving attemptsMap from backend without wiping active user drafts
  useEffect(() => {
    if (!attemptsMap || Object.keys(attemptsMap).length === 0) return;
    setDraftAnswers(prev => {
      const next = { ...prev };
      allValidQuestions.forEach(q => {
        const att = attemptsMap[q.id];
        if (att && !next[q.id]) {
          next[q.id] = String(att.student_answer || '');
        }
      });
      return next;
    });
    setEvaluatedMap(prev => {
      const next = { ...prev };
      allValidQuestions.forEach(q => {
        const att = attemptsMap[q.id];
        if (att && !next[q.id]) {
          const ansStr = String(att.student_answer || '');
          const evalRes = evaluateQuestionAnswer(q, ansStr);
          next[q.id] = {
            isCorrect: Boolean(att.is_correct),
            pointsAwarded: Number(att.points_awarded ?? (att.is_correct ? q.points || 10 : 0)),
            feedback: evalRes.feedback,
            submittedAnswer: ansStr
          };
        }
      });
      return next;
    });
  }, [attemptsMap, allValidQuestions]);

  // Scroll active day button into view in horizontal strip
  useEffect(() => {
    if (activeDayBtnRef.current && dayNavScrollRef.current) {
      const container = dayNavScrollRef.current;
      const btn = activeDayBtnRef.current;
      const scrollLeft = btn.offsetLeft - container.clientWidth / 2 + btn.clientWidth / 2;
      container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
    }
  }, [selectedEpisode.id]);

  // Prefetch next episode's YouTube thumbnail for instant switching
  useEffect(() => {
    const currentIdx = allEpisodes.findIndex(item => item.episode.id === selectedEpisode.id);
    const nextEp = currentIdx >= 0 && currentIdx + 1 < allEpisodes.length ? allEpisodes[currentIdx + 1].episode : null;
    if (!nextEp) return;
    const nextVideoBlock = (nextEp.blocks || []).find(b => b.block_type === 'video');
    const nc = contentAny(nextVideoBlock);
    const nextVidId = extractYouTubeId(
      nc.video_id || nc.url || nc.video_url
    );
    if (nextVidId) {
      const img = new Image();
      img.src = `https://i.ytimg.com/vi/${nextVidId}/hqdefault.jpg`;
    }
  }, [selectedEpisode.id, allEpisodes]);

  // Calculate answered count & XP
  const isQuestionReadyOrAnswered = useCallback(
    (q: CourseQuestion): boolean => {
      if (evaluatedMap[q.id]) return true;
      const qt = String(q.question_type || '').toLowerCase();
      if (qt === 'sentence_builder' || qt === 'ordering' || qt === 'sentence_reordering' || qt === 'word_ordering') {
        const placed = orderingSlotsMap[q.id] || [];
        const bank = orderingBankMap[q.id] || [];
        return placed.length > 0 && bank.length === 0;
      }
      return Boolean((draftAnswers[q.id] || '').trim());
    },
    [evaluatedMap, orderingSlotsMap, orderingBankMap, draftAnswers]
  );

  const answeredCount = useMemo(
    () => allValidQuestions.filter(q => isQuestionReadyOrAnswered(q)).length,
    [allValidQuestions, isQuestionReadyOrAnswered]
  );

  const evaluatedCount = useMemo(
    () => allValidQuestions.filter(q => Boolean(evaluatedMap[q.id])).length,
    [allValidQuestions, evaluatedMap]
  );

  useEffect(() => {
    onProgressChange?.(answeredCount, allValidQuestions.length);
  }, [answeredCount, allValidQuestions.length, onProgressChange]);

  const totalLessonXP = useMemo(() => {
    const sum = allValidQuestions.reduce((acc, q) => acc + (Number(q.points) || 10), 0);
    return sum > 0 ? sum : 60;
  }, [allValidQuestions]);

  const earnedLessonXP = useMemo(() => {
    return allValidQuestions.reduce((acc, q) => acc + (evaluatedMap[q.id]?.pointsAwarded || 0), 0);
  }, [allValidQuestions, evaluatedMap]);

  // Evaluate and persist a single question
  const evaluateAndPersistQuestion = async (q: CourseQuestion, answerOverride?: string) => {
    const qt = String(q.question_type || '').toLowerCase();
    let rawAnswer = answerOverride !== undefined ? answerOverride : (draftAnswers[q.id] || '').trim();

    if (
      answerOverride === undefined &&
      (qt === 'sentence_builder' || qt === 'ordering' || qt === 'sentence_reordering' || qt === 'word_ordering')
    ) {
      rawAnswer = (orderingSlotsMap[q.id] || []).join(' ').trim();
    }

    if (!rawAnswer) return null;

    const evalRes = evaluateQuestionAnswer(q, rawAnswer);
    const maxPts = Number(q.points) || 10;
    const pts = evalRes.isCorrect ? maxPts : 0;

    setEvaluatedMap(prev => ({
      ...prev,
      [q.id]: {
        isCorrect: evalRes.isCorrect,
        pointsAwarded: pts,
        feedback: evalRes.feedback,
        submittedAnswer: rawAnswer
      }
    }));

    if (onRecordAttempt && !attemptsMap[q.id]) {
      try {
        await onRecordAttempt(q, rawAnswer, evalRes.isCorrect, pts);
      } catch {
        // non-fatal in preview or duplicate attempt
      }
    }

    return { isCorrect: evalRes.isCorrect, pointsAwarded: pts };
  };

  // Handle "Submit Day X ->" button click
  const handleSubmitLesson = async () => {
    setValidationError(null);

    // 1. Validate that all required questions have answers
    const firstUnanswered = allValidQuestions.find(q => !isQuestionReadyOrAnswered(q));
    if (firstUnanswered) {
      const qIndex = allValidQuestions.findIndex(q => q.id === firstUnanswered.id) + 1;
      const remaining = allValidQuestions.length - answeredCount;
      setValidationError(
        `Please complete all activities before submitting Day ${dayNumber}. You have ${remaining} unanswered ${
          remaining === 1 ? 'question' : 'questions'
        } (starting at Question #${qIndex}).`
      );
      const el = document.getElementById(`question-card-${firstUnanswered.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmittingAll(true);
    try {
      // 2. Evaluate and persist any question that hasn't been evaluated yet
      for (const q of allValidQuestions) {
        if (!evaluatedMap[q.id]) {
          await evaluateAndPersistQuestion(q);
        }
      }

      // 3. Complete the lesson and award XP
      await onCompleteLesson();
    } finally {
      setSubmittingAll(false);
    }
  };

  // Web Speech API helper for vocabulary & transcript
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.92;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore speech errors
    }
  };

  // Video metadata
  const vc = contentAny(videoBlock);
  const videoId = extractYouTubeId(
    vc.video_id ||
      vc.video?.video_id ||
      vc.url ||
      vc.video_url
  );
  const videoTranscript = String(
    vc.transcript ||
      vc.video?.transcript ||
      ''
  ).trim();
  const videoPosterUrl = videoId
    ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
    : course.cover_image_url || '/images/creepy-legends-cover.jpg';
  const videoFallbackPosterUrl = videoId
    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    : '/images/creepy-legends-cover.jpg';

  const coverImageUrl =
    course.cover_image_url || '/images/creepy-legends-cover.jpg';

  // Section numbering (1 = Video, 2 = MCQs, 3 = True/False or Very Short, 4 = Short Answer, 5 = Ordering)
  let sectionCounter = 1; // 1 is Watch the Story
  const mcqSectionNum = mcqQuestions.length > 0 ? ++sectionCounter : 0;
  const tfSectionNum = tfQuestions.length > 0 ? ++sectionCounter : 0;
  const shortSectionNum = shortQuestions.length > 0 ? ++sectionCounter : 0;
  const orderingSectionNum = orderingQuestions.length > 0 ? ++sectionCounter : 0;

  // Objectives completion status
  const allMcqsDone = mcqQuestions.length > 0 && mcqQuestions.every(q => isQuestionReadyOrAnswered(q));
  const allTfsDone = tfQuestions.length > 0 && tfQuestions.every(q => isQuestionReadyOrAnswered(q));
  const allShortsDone = shortQuestions.length > 0 && shortQuestions.every(q => isQuestionReadyOrAnswered(q));
  const allOrderingsDone = orderingQuestions.length > 0 && orderingQuestions.every(q => isQuestionReadyOrAnswered(q));

  // Scroll day strip left/right
  const scrollDayStrip = (dir: 'left' | 'right') => {
    if (!dayNavScrollRef.current) return;
    const offset = dir === 'left' ? -320 : 320;
    dayNavScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <div className="w-full min-h-screen bg-[#071326] text-white font-sans antialiased pb-20 overflow-x-hidden">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 pt-3 sm:pt-5 space-y-4 sm:space-y-5">
        
        {/* ================================================================ */}
        {/* 1. HERO COURSE COVER HEADER (16:9 VISUAL IDENTITY)               */}
        {/* ================================================================ */}
        <header
          data-testid="creepy-legends-hero-header"
          className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-sky-400/25 shadow-2xl bg-[#091933]"
        >
          {/* 16:9 Background Artwork Layer */}
          <div className="relative w-full min-h-[190px] sm:min-h-[240px] md:min-h-[270px] flex flex-col justify-between p-4 sm:p-7 md:p-8">
            <img
              src={coverImageUrl}
              alt={course.title}
              loading="eager"
              fetchPriority="high"
              onError={e => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/images/creepy-legends-cover.jpg')) {
                  target.src = '/images/creepy-legends-cover.jpg';
                }
              }}
              className="absolute inset-0 w-full h-full object-cover object-center opacity-55 scale-[1.01]"
            />
            {/* Multi-stop atmospheric dark blue gradient overlays for crisp readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#061124]/95 via-[#081b38]/80 to-[#061124]/75 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#061124] via-transparent to-[#061124]/40 pointer-events-none" />

            {/* Top Badges Row */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/35 text-sky-200 text-[11px] font-black uppercase tracking-wider backdrop-blur-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Interactive English Course</span>
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[11px] font-black uppercase tracking-wider">
                  {course.grade_level || 'A1–A2'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/35 text-emerald-200 text-[11px] font-black">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>{totalLessonXP} XP Available</span>
                </span>
              </div>

              {onOpenCoverModal && (
                <button
                  type="button"
                  onClick={onOpenCoverModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold backdrop-blur-xs transition-all cursor-pointer shadow-sm"
                  title="Upload or Replace 16:9 Course Cover Image"
                >
                  <Camera className="w-3.5 h-3.5 text-sky-300" />
                  <span>Course Cover (16:9)</span>
                </button>
              )}
            </div>

            {/* Center & Bottom Hero Content */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 pt-6 sm:pt-8">
              <div className="space-y-1.5 max-w-2xl">
                <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-sky-300/90 drop-shadow">
                  {course.subject || 'English Language'} • {totalCount} Lessons
                </p>
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] leading-[1.1]">
                  {course.title}
                </h1>
                <p className="text-xs sm:text-base text-slate-200/90 font-medium max-w-xl drop-shadow">
                  {course.short_description || '12 Days of Stories, Vocabulary & Mystery'}
                </p>
              </div>

              {/* Featured Current Day Plaque (Matches Reference Header Plaque) */}
              <div className="shrink-0 self-start md:self-end bg-gradient-to-b from-[#2b1d12]/95 to-[#1a110a]/95 border-2 border-amber-500/50 rounded-2xl px-4 sm:px-5 py-3 shadow-[0_10px_25px_rgba(0,0,0,0.6)] backdrop-blur-md min-w-[230px] sm:min-w-[260px]">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="px-2.5 py-0.5 rounded-md bg-rose-600 text-white text-[11px] font-black uppercase tracking-wider shadow-xs">
                    Day {dayNumber}
                  </span>
                  <span className="text-[11px] font-bold text-amber-300/90">
                    Lesson {dayNumber} of {totalCount}
                  </span>
                </div>
                <p className="text-sm sm:text-base font-black text-amber-50 tracking-tight line-clamp-1">
                  {cleanLessonTitle}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* ================================================================ */}
        {/* 2. COURSE / DAY NAVIGATION STRIP                                 */}
        {/* ================================================================ */}
        <nav
          aria-label="Course Day Navigation"
          data-testid="course-day-navigation"
          className="relative flex items-center gap-1.5 bg-[#0a1b36] border border-sky-400/20 rounded-2xl p-2 shadow-lg"
        >
          {/* Left Scroll Button (Desktop) */}
          <button
            type="button"
            onClick={() => scrollDayStrip('left')}
            className="hidden sm:flex w-9 h-12 rounded-xl bg-[#102649] hover:bg-[#173564] border border-sky-400/20 items-center justify-center text-sky-200 shrink-0 cursor-pointer transition-colors"
            title="Scroll days left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Scrollable Day Pills */}
          <div
            ref={dayNavScrollRef}
            className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5 px-0.5"
          >
            {allEpisodes.map(item => {
              const isCurrent = item.episode.id === selectedEpisode.id;
              const isEpCompleted = item.isCompleted;
              const isEpLocked = item.isLocked;

              return (
                <button
                  key={item.episode.id}
                  ref={isCurrent ? activeDayBtnRef : null}
                  type="button"
                  onClick={() => onSelectEpisode(item.episode, isEpLocked, item.unlockMessage)}
                  className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all shrink-0 min-w-[185px] sm:min-w-[215px] max-w-[250px] cursor-pointer ${
                    isCurrent
                      ? 'bg-gradient-to-r from-[#026fc3] to-[#1d6ef2] border-sky-300/70 text-white shadow-[0_0_20px_rgba(29,110,242,0.45)]'
                      : isEpCompleted
                      ? 'bg-[#0f2942] hover:bg-[#153656] border-emerald-400/40 text-slate-100'
                      : isEpLocked
                      ? 'bg-[#09162b]/70 border-slate-800 text-slate-400 opacity-75'
                      : 'bg-[#0e2240] hover:bg-[#142e54] border-sky-500/20 text-slate-200'
                  }`}
                >
                  {/* Status Icon Circle */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs ${
                      isCurrent
                        ? 'bg-white text-[#026fc3] shadow-xs'
                        : isEpCompleted
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                        : isEpLocked
                        ? 'bg-slate-800 text-slate-500'
                        : 'bg-sky-500/15 text-sky-300 border border-sky-400/25'
                    }`}
                  >
                    {isCurrent ? (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    ) : isEpCompleted ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : isEpLocked ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      <span>{item.dayNumber}</span>
                    )}
                  </div>

                  {/* Day Label + Title */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider ${
                          isCurrent
                            ? 'text-sky-100'
                            : isEpCompleted
                            ? 'text-emerald-300'
                            : 'text-sky-400/90'
                        }`}
                      >
                        Day {item.dayNumber}
                      </span>
                      {isEpCompleted && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                          Done
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-extrabold truncate leading-snug">
                      {item.cleanTitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Scroll Button (Desktop) */}
          <button
            type="button"
            onClick={() => scrollDayStrip('right')}
            className="hidden sm:flex w-9 h-12 rounded-xl bg-[#102649] hover:bg-[#173564] border border-sky-400/20 items-center justify-center text-sky-200 shrink-0 cursor-pointer transition-colors"
            title="Scroll days right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </nav>

        {/* ================================================================ */}
        {/* 3. RESPONSIVE TWO-COLUMN DESKTOP / SINGLE-COLUMN MOBILE LAYOUT   */}
        {/* ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          
          {/* ============================================================== */}
          {/* LEFT COLUMN: MAIN LEARNING & ASSESSMENT AREA (8 cols on lg)    */}
          {/* ============================================================== */}
          <div className="lg:col-span-8 space-y-5 min-w-0">
            
            {/* CURRENT DAY BANNER CARD */}
            <div className="rounded-2xl bg-gradient-to-r from-[#0e2344] via-[#122b52] to-[#0e2344] border border-sky-400/25 p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-xs shrink-0">
                    Day {dayNumber}
                  </span>
                  <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight break-words">
                    {cleanLessonTitle}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-sky-200/85 font-medium">
                  Watch the video and complete the activities.
                </p>
              </div>

              {/* XP Badge Card */}
              <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-400/40 shadow-inner">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/50 flex items-center justify-center shrink-0">
                  <Star className="w-6 h-6 text-amber-400 fill-amber-400 drop-shadow" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg sm:text-xl font-black text-amber-300 leading-none">
                      {totalLessonXP} XP
                    </span>
                    {earnedLessonXP > 0 && (
                      <span className="text-xs font-extrabold text-emerald-300">
                        ({earnedLessonXP} earned)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-amber-100/80 font-semibold">
                    Earn on completing all activities
                  </p>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* SECTION 1: WATCH THE STORY (VIDEO-FIRST LEARNING CARD)       */}
            {/* ============================================================ */}
            <section
              data-testid="lesson-video-section"
              className="rounded-2xl bg-[#0d213f] border border-sky-400/25 shadow-xl overflow-hidden"
            >
              {/* Section Header */}
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-2 border-b border-sky-400/15">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-full bg-[#1d6ef2] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                    1
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                    Watch the Story
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {videoTranscript && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowTranscript(prev => !prev);
                        setVideoWatched(true);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                        showTranscript
                          ? 'bg-sky-500 text-white border-sky-300'
                          : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border-sky-400/30'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{showTranscript ? 'Hide Transcript' : 'Transcript'}</span>
                    </button>
                  )}
                  <span className="px-3 py-1 rounded-lg bg-[#15305b] border border-sky-400/25 text-sky-200 text-xs font-mono font-bold">
                    04:25
                  </span>
                </div>
              </div>

              {/* Responsive 16:9 Video Player Container */}
              <div className="p-3 sm:p-5 space-y-3">
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-sky-300/20 shadow-2xl group">
                  {videoPlaying && videoId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                      title={cleanLessonTitle}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setVideoPlaying(true);
                        setVideoWatched(true);
                      }}
                      className="relative w-full h-full block text-left cursor-pointer focus:outline-none"
                      aria-label={`Play video: ${cleanLessonTitle}`}
                    >
                      <img
                        src={videoPosterUrl}
                        alt={cleanLessonTitle}
                        loading="eager"
                        onError={e => {
                          const target = e.currentTarget;
                          if (target.src !== videoFallbackPosterUrl) {
                            target.src = videoFallbackPosterUrl;
                          }
                        }}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-slate-950/30" />

                      {/* Center Big Play Button */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#1d6ef2]/95 group-hover:bg-[#026fc3] border-2 border-white/80 text-white flex items-center justify-center shadow-[0_0_35px_rgba(29,110,242,0.8)] transition-all duration-200 group-hover:scale-110">
                          <Play className="w-8 h-8 sm:w-9 sm:h-9 fill-current ml-1" />
                        </div>
                        <span className="px-3.5 py-1 rounded-full bg-slate-950/80 border border-white/15 text-xs font-bold text-sky-100 backdrop-blur-xs">
                          Click to Play Lesson Video
                        </span>
                      </div>

                      {/* Bottom Player Bar UI (Matches Reference Image) */}
                      <div className="absolute bottom-0 inset-x-0 px-3 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent flex items-center gap-3">
                        <Play className="w-4 h-4 text-white fill-current shrink-0" />
                        <div className="flex-1 h-1.5 rounded-full bg-white/25 overflow-hidden flex items-center">
                          <div className="w-1/4 h-full bg-[#1d6ef2] rounded-full" />
                        </div>
                        <span className="text-[11px] font-mono text-slate-200 shrink-0">
                          00:00 / 04:25
                        </span>
                        <Volume2 className="w-4 h-4 text-slate-200 shrink-0 hidden xs:block" />
                        <Maximize2 className="w-4 h-4 text-slate-200 shrink-0" />
                      </div>
                    </button>
                  )}
                </div>

                {/* Video Footer Helper & External Link */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-sky-200/80 px-1">
                  <div className="flex items-center gap-2">
                    {videoWatched ? (
                      <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Video opened</span>
                      </span>
                    ) : (
                      <span>Watch the story video carefully before answering the questions below.</span>
                    )}
                  </div>
                  {videoId && (
                    <a
                      href={`https://www.youtube.com/watch?v=${videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setVideoWatched(true)}
                      className="inline-flex items-center gap-1 text-sky-300 hover:text-white font-bold underline-offset-2 hover:underline"
                    >
                      <span>Watch on YouTube</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Collapsible Video Transcript Drawer */}
                {showTranscript && videoTranscript && (
                  <div className="mt-3 rounded-xl bg-[#081529] border border-sky-400/25 p-4 sm:p-5 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between gap-2 border-b border-sky-400/15 pb-2.5">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-sky-400" />
                        <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-sky-200">
                          Video Story Transcript
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakText(videoTranscript)}
                        className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Listen</span>
                      </button>
                    </div>
                    <div className="text-sm sm:text-base text-slate-200 leading-relaxed whitespace-pre-line font-normal">
                      {videoTranscript}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ============================================================ */}
            {/* GRAMMAR SPOTLIGHT CARD (PRESERVING LESSON GRAMMAR CONTENT)   */}
            {/* ============================================================ */}
            {grammarContent && (
              <section
                data-testid="lesson-grammar-section"
                className="rounded-2xl bg-gradient-to-br from-[#0e2344] to-[#0a1930] border border-sky-400/25 p-4 sm:p-5 shadow-lg space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-black uppercase tracking-wider">
                      Grammar Spotlight
                    </span>
                    <h3 className="text-sm sm:text-base font-black text-white">
                      {grammarContent.title}
                    </h3>
                  </div>
                </div>

                {grammarContent.explanation && (
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {grammarContent.explanation}
                  </p>
                )}

                {grammarContent.examples.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {grammarContent.examples.map((ex, i) => (
                      <div
                        key={i}
                        className="rounded-xl bg-[#071326]/80 border border-sky-400/15 px-3.5 py-2.5 text-xs sm:text-sm text-sky-100 font-medium flex items-start gap-2"
                      >
                        <span className="text-amber-400 font-black shrink-0">{i + 1}.</span>
                        <span>{ex}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ============================================================ */}
            {/* SECTION 2: MULTIPLE CHOICE QUESTIONS                         */}
            {/* ============================================================ */}
            {mcqQuestions.length > 0 && (
              <section
                data-testid="section-mcq"
                className="rounded-2xl bg-white text-slate-900 border border-slate-200/90 shadow-xl overflow-hidden"
              >
                {/* Section Header */}
                <div
                  onClick={() => toggleSection('mcq')}
                  className="px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between gap-2 cursor-pointer sm:cursor-default"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-[#13294b] text-white font-black text-sm flex items-center justify-center shrink-0">
                      {mcqSectionNum}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        Multiple Choice Questions
                      </h3>
                      <p className="text-[11px] font-semibold text-slate-500">
                        Choose the best answer for each question ({mcqQuestions[0]?.points || 10} marks each)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-extrabold">
                      {mcqQuestions.length} {mcqQuestions.length === 1 ? 'question' : 'questions'} |{' '}
                      {mcqQuestions.reduce((s, q) => s + (Number(q.points) || 10), 0)} marks
                    </span>
                    <span className="sm:hidden text-slate-500">
                      {collapsedSections['mcq'] ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </span>
                  </div>
                </div>

                {/* 3-Column Desktop / 1-Column Mobile Question Cards Grid */}
                {!collapsedSections['mcq'] && (
                  <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {mcqQuestions.map((q, qIdx) => {
                      const options = normalizeQuestionOptions(q.options);
                      const selectedVal = draftAnswers[q.id] || '';
                      const evaluated = evaluatedMap[q.id];
                      const resolvedCorrect = resolveCorrectOption(q);

                      return (
                        <div
                          key={q.id}
                          id={`question-card-${q.id}`}
                          className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                            evaluated
                              ? evaluated.isCorrect
                                ? 'bg-emerald-50/50 border-emerald-300'
                                : 'bg-rose-50/40 border-rose-300'
                              : selectedVal
                              ? 'bg-sky-50/40 border-[#1d6ef2]'
                              : 'bg-slate-50/60 border-slate-200/90 hover:border-slate-300'
                          }`}
                        >
                          <div className="space-y-3">
                            {/* Question Number & Marks */}
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                                {qIdx + 1}. {q.question_text}
                              </h4>
                            </div>

                            {/* Answer Choices */}
                            <div className="space-y-2">
                              {options.map(opt => {
                                const isSelected =
                                  selectedVal === opt.id ||
                                  isOptionMatchingStudentAnswer(opt, selectedVal);
                                const isCorrectOpt =
                                  resolvedCorrect?.id === opt.id;

                                let btnStyle =
                                  'bg-white hover:bg-slate-100 border-slate-200 text-slate-800';
                                let badgeStyle =
                                  'bg-slate-100 text-slate-700 border-slate-200';

                                if (evaluated) {
                                  if (isCorrectOpt) {
                                    btnStyle =
                                      'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs';
                                    badgeStyle = 'bg-white/20 text-white border-white/30';
                                  } else if (isSelected && !evaluated.isCorrect) {
                                    btnStyle =
                                      'bg-rose-600 border-rose-600 text-white font-bold';
                                    badgeStyle = 'bg-white/20 text-white border-white/30';
                                  }
                                } else if (isSelected) {
                                  btnStyle =
                                    'bg-[#1d6ef2] border-[#1d6ef2] text-white font-bold shadow-sm';
                                  badgeStyle = 'bg-white/20 text-white border-white/30';
                                }

                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    disabled={Boolean(evaluated)}
                                    onClick={() => {
                                      courseAudio.playClick();
                                      setDraftAnswers(prev => ({ ...prev, [q.id]: opt.id }));
                                      setValidationError(null);
                                    }}
                                    className={`w-full px-3 py-2.5 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center gap-2.5 cursor-pointer disabled:cursor-default ${btnStyle}`}
                                  >
                                    <span
                                      className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 border ${badgeStyle}`}
                                    >
                                      {opt.id}
                                    </span>
                                    <span className="flex-1 leading-snug">{opt.text}</span>
                                    {evaluated && isCorrectOpt && (
                                      <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                                    )}
                                    {evaluated && isSelected && !evaluated.isCorrect && (
                                      <XCircle className="w-4 h-4 text-white shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Card Footer: Marks or Feedback */}
                          <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-bold text-slate-500">
                              {q.points || 10} marks
                            </span>
                            {evaluated ? (
                              <span
                                className={`font-extrabold ${
                                  evaluated.isCorrect ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                              >
                                {evaluated.isCorrect
                                  ? `✓ Correct (+${evaluated.pointsAwarded} XP)`
                                  : `✗ Correct: ${resolvedCorrect?.id || q.correct_answer}`}
                              </span>
                            ) : selectedVal ? (
                              <button
                                type="button"
                                onClick={() => evaluateAndPersistQuestion(q)}
                                className="text-[#026fc3] hover:underline font-extrabold cursor-pointer"
                              >
                                Check Answer →
                              </button>
                            ) : (
                              <span className="text-slate-400 font-medium">Select an option</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ============================================================ */}
            {/* SECTION 3: VERY SHORT / TRUE OR FALSE QUESTIONS              */}
            {/* ============================================================ */}
            {tfQuestions.length > 0 && (
              <section
                data-testid="section-true-false"
                className="rounded-2xl bg-white text-slate-900 border border-slate-200/90 shadow-xl overflow-hidden"
              >
                <div
                  onClick={() => toggleSection('tf')}
                  className="px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between gap-2 cursor-pointer sm:cursor-default"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-[#13294b] text-white font-black text-sm flex items-center justify-center shrink-0">
                      {tfSectionNum}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        Very Short Questions (True / False)
                      </h3>
                      <p className="text-[11px] font-semibold text-slate-500">
                        Decide whether each statement from the story is True or False
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-extrabold">
                      {tfQuestions.length} {tfQuestions.length === 1 ? 'question' : 'questions'} |{' '}
                      {tfQuestions.reduce((s, q) => s + (Number(q.points) || 10), 0)} marks
                    </span>
                    <span className="sm:hidden text-slate-500">
                      {collapsedSections['tf'] ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </span>
                  </div>
                </div>

                {!collapsedSections['tf'] && (
                  <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {tfQuestions.map((q, qIdx) => {
                      const selectedVal = draftAnswers[q.id] || '';
                      const evaluated = evaluatedMap[q.id];
                      const choices = ['True', 'False'];

                      return (
                        <div
                          key={q.id}
                          id={`question-card-${q.id}`}
                          className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                            evaluated
                              ? evaluated.isCorrect
                                ? 'bg-emerald-50/50 border-emerald-300'
                                : 'bg-rose-50/40 border-rose-300'
                              : selectedVal
                              ? 'bg-sky-50/40 border-[#1d6ef2]'
                              : 'bg-slate-50/60 border-slate-200/90 hover:border-slate-300'
                          }`}
                        >
                          <div className="space-y-3">
                            <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                              {qIdx + 1}. {q.question_text}
                            </h4>

                            <div className="grid grid-cols-2 gap-2.5 pt-1">
                              {choices.map(choice => {
                                const isSelected =
                                  selectedVal.toLowerCase() === choice.toLowerCase();
                                const isCorrectChoice =
                                  String(q.correct_answer || '').toLowerCase() ===
                                  choice.toLowerCase();

                                let btnClass =
                                  'bg-white hover:bg-slate-100 border-slate-200 text-slate-800';
                                if (evaluated) {
                                  if (isCorrectChoice) {
                                    btnClass =
                                      'bg-emerald-600 border-emerald-600 text-white font-black shadow-xs';
                                  } else if (isSelected && !evaluated.isCorrect) {
                                    btnClass =
                                      'bg-rose-600 border-rose-600 text-white font-black';
                                  }
                                } else if (isSelected) {
                                  btnClass =
                                    'bg-[#1d6ef2] border-[#1d6ef2] text-white font-black shadow-sm';
                                }

                                return (
                                  <button
                                    key={choice}
                                    type="button"
                                    disabled={Boolean(evaluated)}
                                    onClick={() => {
                                      courseAudio.playClick();
                                      setDraftAnswers(prev => ({ ...prev, [q.id]: choice }));
                                      setValidationError(null);
                                    }}
                                    className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-default ${btnClass}`}
                                  >
                                    <span>{choice}</span>
                                    {evaluated && isCorrectChoice && (
                                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-bold text-slate-500">
                              {q.points || 10} marks
                            </span>
                            {evaluated ? (
                              <span
                                className={`font-extrabold ${
                                  evaluated.isCorrect ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                              >
                                {evaluated.isCorrect
                                  ? `✓ Correct (+${evaluated.pointsAwarded} XP)`
                                  : `✗ Answer: ${q.correct_answer}`}
                              </span>
                            ) : selectedVal ? (
                              <button
                                type="button"
                                onClick={() => evaluateAndPersistQuestion(q)}
                                className="text-[#026fc3] hover:underline font-extrabold cursor-pointer"
                              >
                                Check Answer →
                              </button>
                            ) : (
                              <span className="text-slate-400 font-medium">Select True or False</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ============================================================ */}
            {/* SECTION 4: SHORT ANSWER QUESTIONS                            */}
            {/* ============================================================ */}
            {shortQuestions.length > 0 && (
              <section
                data-testid="section-short-answer"
                className="rounded-2xl bg-white text-slate-900 border border-slate-200/90 shadow-xl overflow-hidden"
              >
                <div
                  onClick={() => toggleSection('short')}
                  className="px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between gap-2 cursor-pointer sm:cursor-default"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-[#13294b] text-white font-black text-sm flex items-center justify-center shrink-0">
                      {shortSectionNum}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        Short Answer Questions
                      </h3>
                      <p className="text-[11px] font-semibold text-slate-500">
                        Write a short answer for each question ({shortQuestions[0]?.points || 10} marks each)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-extrabold">
                      {shortQuestions.length} {shortQuestions.length === 1 ? 'question' : 'questions'} |{' '}
                      {shortQuestions.reduce((s, q) => s + (Number(q.points) || 10), 0)} marks
                    </span>
                    <span className="sm:hidden text-slate-500">
                      {collapsedSections['short'] ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </span>
                  </div>
                </div>

                {!collapsedSections['short'] && (
                  <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {shortQuestions.map((q, qIdx) => {
                      const val = draftAnswers[q.id] || '';
                      const charCount = val.length;
                      const wordCount = val.trim() ? val.trim().split(/\s+/).length : 0;
                      const evaluated = evaluatedMap[q.id];

                      return (
                        <div
                          key={q.id}
                          id={`question-card-${q.id}`}
                          className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                            evaluated
                              ? evaluated.isCorrect
                                ? 'bg-emerald-50/50 border-emerald-300'
                                : 'bg-rose-50/40 border-rose-300'
                              : val.trim()
                              ? 'bg-sky-50/30 border-[#1d6ef2]'
                              : 'bg-slate-50/60 border-slate-200/90'
                          }`}
                        >
                          <div className="space-y-2.5">
                            <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                              {qIdx + 1}. {q.question_text}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Type a key word, phrase, or short sentence from the lesson.
                            </p>

                            <div className="relative">
                              <textarea
                                rows={3}
                                maxLength={150}
                                disabled={Boolean(evaluated)}
                                value={val}
                                onChange={e => {
                                  setDraftAnswers(prev => ({ ...prev, [q.id]: e.target.value }));
                                  setValidationError(null);
                                }}
                                placeholder="Write your answer here..."
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1d6ef2] focus:outline-none resize-none disabled:bg-slate-100"
                              />
                              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 pt-1 px-0.5">
                                <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
                                <span>{charCount}/150</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-bold text-slate-500">
                              {q.points || 10} marks
                            </span>
                            {evaluated ? (
                              <span
                                className={`font-extrabold ${
                                  evaluated.isCorrect ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                              >
                                {evaluated.isCorrect
                                  ? `✓ Correct (+${evaluated.pointsAwarded} XP)`
                                  : `✗ Expected: "${q.correct_answer}"`}
                              </span>
                            ) : val.trim() ? (
                              <button
                                type="button"
                                onClick={() => evaluateAndPersistQuestion(q)}
                                className="text-[#026fc3] hover:underline font-extrabold cursor-pointer"
                              >
                                Check Answer →
                              </button>
                            ) : (
                              <span className="text-slate-400 font-medium">Required</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ============================================================ */}
            {/* SECTION 5: SENTENCE / EVENT ORDERING ACTIVITY                */}
            {/* ============================================================ */}
            {orderingQuestions.length > 0 && (
              <section
                data-testid="section-ordering"
                className="rounded-2xl bg-white text-slate-900 border border-slate-200/90 shadow-xl overflow-hidden"
              >
                <div
                  onClick={() => toggleSection('ordering')}
                  className="px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between gap-2 cursor-pointer sm:cursor-default"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-[#13294b] text-white font-black text-sm flex items-center justify-center shrink-0">
                      {orderingSectionNum}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        Put the Words / Events in the Correct Order
                      </h3>
                      <p className="text-[11px] font-semibold text-slate-500">
                        Drag and drop or tap each item in the right order
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-extrabold">
                      {orderingQuestions.reduce((s, q) => s + (Number(q.points) || 10), 0)} marks
                    </span>
                    <span className="sm:hidden text-slate-500">
                      {collapsedSections['ordering'] ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </span>
                  </div>
                </div>

                {!collapsedSections['ordering'] && (
                  <div className="p-4 sm:p-6 space-y-6">
                    {orderingQuestions.map(q => {
                      const rawOpts = Array.isArray(q.options)
                        ? q.options.map(o => (typeof o === 'string' ? o : o?.text || String(o)))
                        : [];
                      const totalSlots = rawOpts.length || 5;
                      const placed = orderingSlotsMap[q.id] || [];
                      const bank = orderingBankMap[q.id] || [];
                      const evaluated = evaluatedMap[q.id];

                      const handlePlaceWord = (word: string, bankIdx: number) => {
                        if (evaluated) return;
                        courseAudio.playClick();
                        setOrderingBankMap(prev => ({
                          ...prev,
                          [q.id]: (prev[q.id] || []).filter((_, idx) => idx !== bankIdx)
                        }));
                        setOrderingSlotsMap(prev => ({
                          ...prev,
                          [q.id]: [...(prev[q.id] || []), word]
                        }));
                        setValidationError(null);
                      };

                      const handleRemoveSlotWord = (word: string, slotIdx: number) => {
                        if (evaluated) return;
                        courseAudio.playClick();
                        setOrderingSlotsMap(prev => ({
                          ...prev,
                          [q.id]: (prev[q.id] || []).filter((_, idx) => idx !== slotIdx)
                        }));
                        setOrderingBankMap(prev => ({
                          ...prev,
                          [q.id]: [...(prev[q.id] || []), word]
                        }));
                      };

                      const handleSwapSlots = (fromIdx: number, toIdx: number) => {
                        if (evaluated || toIdx < 0 || toIdx >= placed.length) return;
                        courseAudio.playClick();
                        setOrderingSlotsMap(prev => {
                          const list = [...(prev[q.id] || [])];
                          const [moved] = list.splice(fromIdx, 1);
                          list.splice(toIdx, 0, moved);
                          return { ...prev, [q.id]: list };
                        });
                      };

                      const handleResetOrder = () => {
                        if (evaluated) return;
                        courseAudio.playClick();
                        setOrderingSlotsMap(prev => ({ ...prev, [q.id]: [] }));
                        setOrderingBankMap(prev => ({ ...prev, [q.id]: [...rawOpts] }));
                      };

                      return (
                        <div
                          key={q.id}
                          id={`question-card-${q.id}`}
                          className="space-y-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-extrabold text-slate-800">
                              {q.question_text}
                            </p>
                            {!evaluated && placed.length > 0 && (
                              <button
                                type="button"
                                onClick={handleResetOrder}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reset Order</span>
                              </button>
                            )}
                          </div>

                          {/* Numbered Target Slots (Matches Reference Design 1..N) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                            {Array.from({ length: totalSlots }).map((_, slotIdx) => {
                              const wordInSlot = placed[slotIdx];
                              return (
                                <div
                                  key={slotIdx}
                                  onDragOver={e => e.preventDefault()}
                                  onDrop={e => {
                                    e.preventDefault();
                                    if (!draggedItem || draggedItem.qId !== q.id || evaluated) return;
                                    if (draggedItem.source === 'bank') {
                                      handlePlaceWord(draggedItem.word, draggedItem.index);
                                    } else if (draggedItem.source === 'slot' && draggedItem.index !== slotIdx && slotIdx < placed.length) {
                                      handleSwapSlots(draggedItem.index, slotIdx);
                                    }
                                    setDraggedItem(null);
                                  }}
                                  className={`min-h-[54px] rounded-xl border-2 p-2.5 flex items-center justify-between gap-2 transition-all ${
                                    wordInSlot
                                      ? evaluated
                                        ? evaluated.isCorrect
                                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                                          : 'bg-rose-50 border-rose-300 text-rose-950'
                                        : 'bg-sky-50 border-[#1d6ef2] text-slate-900 shadow-xs'
                                      : 'bg-slate-50 border-dashed border-slate-300 text-slate-400'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span
                                      className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                                        wordInSlot
                                          ? 'bg-[#13294b] text-white'
                                          : 'bg-slate-200 text-slate-600'
                                      }`}
                                    >
                                      {slotIdx + 1}
                                    </span>
                                    {wordInSlot ? (
                                      <button
                                        type="button"
                                        draggable={!evaluated}
                                        onDragStart={() =>
                                          setDraggedItem({
                                            qId: q.id,
                                            word: wordInSlot,
                                            source: 'slot',
                                            index: slotIdx
                                          })
                                        }
                                        onClick={() => handleRemoveSlotWord(wordInSlot, slotIdx)}
                                        className="text-xs sm:text-sm font-extrabold truncate text-left flex-1 cursor-pointer"
                                        title="Tap to remove"
                                      >
                                        {wordInSlot}
                                      </button>
                                    ) : (
                                      <span className="text-xs italic select-none">
                                        Drag or tap item
                                      </span>
                                    )}
                                  </div>

                                  {/* Touch-friendly reorder arrows when placed */}
                                  {wordInSlot && !evaluated && (
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      {slotIdx > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => handleSwapSlots(slotIdx, slotIdx - 1)}
                                          className="p-1 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
                                          title="Move earlier"
                                        >
                                          <ChevronLeft className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      {slotIdx < placed.length - 1 && (
                                        <button
                                          type="button"
                                          onClick={() => handleSwapSlots(slotIdx, slotIdx + 1)}
                                          className="p-1 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
                                          title="Move later"
                                        >
                                          <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Draggable / Tap-to-Place Bank */}
                          <div className="rounded-xl bg-slate-100/90 border border-slate-200 p-3.5">
                            {bank.length === 0 ? (
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs sm:text-sm font-bold text-slate-700">
                                  Your sentence: <strong className="text-[#026fc3]">“{placed.join(' ')}”</strong>
                                </span>
                                {evaluated ? (
                                  <span
                                    className={`text-xs font-extrabold ${
                                      evaluated.isCorrect ? 'text-emerald-700' : 'text-rose-700'
                                    }`}
                                  >
                                    {evaluated.isCorrect
                                      ? `✓ Perfect Order! (+${evaluated.pointsAwarded} XP)`
                                      : `✗ Correct order: "${q.correct_answer}"`}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => evaluateAndPersistQuestion(q)}
                                    className="px-4 py-1.5 rounded-xl bg-[#1d6ef2] hover:bg-[#026fc3] text-white text-xs font-black shadow-xs cursor-pointer"
                                  >
                                    Check Order →
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2.5">
                                {bank.map((word, bIdx) => (
                                  <button
                                    key={`${word}-${bIdx}`}
                                    type="button"
                                    draggable={!evaluated}
                                    onDragStart={() =>
                                      setDraggedItem({
                                        qId: q.id,
                                        word,
                                        source: 'bank',
                                        index: bIdx
                                      })
                                    }
                                    onClick={() => handlePlaceWord(word, bIdx)}
                                    className="px-3.5 py-2.5 rounded-xl bg-[#13294b] hover:bg-[#1d6ef2] text-white text-xs sm:text-sm font-bold shadow-sm flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                                  >
                                    <GripVertical className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                                    <span>{word}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Any extra custom teacher blocks (if added in studio) */}
            {extraBlocks.length > 0 && (
              <div className="space-y-4">
                {extraBlocks.map((b, idx) => {
                  const bc = contentAny(b);
                  return (
                    <div
                      key={b.id || idx}
                      className="rounded-2xl bg-[#0d213f] border border-sky-400/20 p-5 space-y-2"
                    >
                      {bc.title && (
                        <h4 className="text-base font-black text-white">{bc.title}</h4>
                      )}
                      {(bc.text || bc.markdown) && (
                        <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                          {bc.text || bc.markdown}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* RIGHT COLUMN: PROGRESS, OBJECTIVES, VOCABULARY & SUBMIT        */}
          {/* ============================================================== */}
          <aside className="lg:col-span-4 space-y-5 min-w-0 lg:sticky lg:top-16">
            
            {/* 1. COURSE PROGRESS CARD */}
            <div
              data-testid="sidebar-course-progress"
              className="rounded-2xl bg-white text-slate-900 border border-slate-200/90 p-5 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full border-2 border-[#1d6ef2] flex items-center justify-center text-[#1d6ef2] font-black text-xs">
                    {progressPercent}%
                  </div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Course Progress
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-xs font-extrabold">
                  {course.grade_level || 'A1–A2'}
                </span>
              </div>

              {/* Day X of N Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>
                    Day <strong className="text-slate-900">{dayNumber}</strong> of {totalCount}
                  </span>
                  <span className="text-[#026fc3] font-extrabold">
                    {completedCount}/{totalCount} Completed
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-[#1d6ef2] to-sky-400 transition-all duration-500"
                    style={{
                      width: `${Math.max(8, progressPercent || Math.round((dayNumber / Math.max(1, totalCount)) * 100))}%`
                    }}
                  />
                </div>
              </div>

              {/* Interactive Day Bubbles Grid */}
              <div className="grid grid-cols-6 gap-2 pt-1">
                {allEpisodes.map(item => {
                  const isCurrent = item.episode.id === selectedEpisode.id;
                  return (
                    <button
                      key={item.episode.id}
                      type="button"
                      onClick={() => onSelectEpisode(item.episode, item.isLocked, item.unlockMessage)}
                      title={`Day ${item.dayNumber}: ${item.cleanTitle}`}
                      className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-sky-50 border-[#1d6ef2] text-[#1d6ef2] shadow-2xs'
                          : item.isCompleted
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center ${
                          isCurrent
                            ? 'bg-[#1d6ef2] text-white'
                            : item.isCompleted
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {item.isCompleted && !isCurrent ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          item.dayNumber
                        )}
                      </span>
                      <span className="text-[9px] font-bold leading-tight line-clamp-1 w-full">
                        {item.cleanTitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. TODAY'S OBJECTIVES CARD */}
            <div
              data-testid="sidebar-todays-objectives"
              className="rounded-2xl bg-white text-slate-900 border border-slate-200/90 p-5 shadow-xl space-y-3.5"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Today’s Objectives
                </h3>
              </div>

              <ul className="space-y-2.5 text-xs sm:text-sm">
                {[
                  {
                    label: 'Watch and understand the video',
                    done: videoWatched || isCompleted
                  },
                  ...(mcqQuestions.length > 0
                    ? [
                        {
                          label: `Answer ${mcqQuestions.length} MCQs`,
                          done: allMcqsDone || isCompleted
                        }
                      ]
                    : []),
                  ...(tfQuestions.length > 0
                    ? [
                        {
                          label: `Answer ${tfQuestions.length} very short questions`,
                          done: allTfsDone || isCompleted
                        }
                      ]
                    : []),
                  ...(shortQuestions.length > 0
                    ? [
                        {
                          label: `Answer ${shortQuestions.length} short answer questions`,
                          done: allShortsDone || isCompleted
                        }
                      ]
                    : []),
                  ...(orderingQuestions.length > 0
                    ? [
                        {
                          label: 'Put the events in correct order',
                          done: allOrderingsDone || isCompleted
                        }
                      ]
                    : [])
                ].map((obj, idx) => (
                  <li key={idx} className="flex items-center gap-2.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        obj.done
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 border border-slate-300 text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                    <span
                      className={`font-semibold ${
                        obj.done ? 'text-emerald-800 line-through decoration-emerald-500/50' : 'text-slate-700'
                      }`}
                    >
                      {obj.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3. KEY VOCABULARY (PREVIEW) CARD */}
            {vocabularyList.length > 0 && (
              <div
                data-testid="sidebar-vocabulary-preview"
                className="rounded-2xl bg-gradient-to-br from-[#fde68a] via-[#fef3c7] to-[#fde68a] text-amber-950 border-2 border-amber-300/90 p-5 shadow-xl space-y-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-800 shrink-0" />
                    <h3 className="text-base font-black text-amber-950 tracking-tight">
                      Key Vocabulary (Preview)
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-900/10 text-amber-900 text-[10px] font-black">
                    {vocabularyList.length} words
                  </span>
                </div>

                <ul className="space-y-2 text-xs sm:text-sm">
                  {vocabularyList.slice(0, 5).map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start justify-between gap-2 pb-1.5 border-b border-amber-900/10 last:border-none last:pb-0"
                    >
                      <div className="leading-snug">
                        <strong className="font-black text-amber-950">{item.word}</strong>
                        <span className="text-amber-900/85"> — {item.meaning}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakText(`${item.word}. ${item.meaning}`)}
                        className="p-1 rounded-lg hover:bg-amber-900/10 text-amber-900 shrink-0 cursor-pointer"
                        title={`Pronounce ${item.word}`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => setShowFullVocabModal(true)}
                  className="w-full pt-1 text-xs font-black text-amber-950 hover:text-amber-800 flex items-center justify-end gap-1 cursor-pointer group"
                >
                  <span>View full vocabulary list</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            )}

            {/* Validation Alert Banner */}
            {validationError && (
              <div className="rounded-2xl bg-rose-500/20 border border-rose-400/50 p-4 text-xs sm:text-sm font-bold text-rose-100 flex items-start gap-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            {/* 4. STRONG SUBMIT BUTTON ("Submit Day X ->") */}
            <div className="space-y-2">
              <button
                type="button"
                data-testid="submit-day-button"
                disabled={isCompleting || submittingAll}
                onClick={handleSubmitLesson}
                className={`w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg shadow-[0_10px_30px_rgba(29,110,242,0.5)] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 ${
                  isCompleted && evaluatedCount >= allValidQuestions.length
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white border border-emerald-300/50'
                    : 'bg-gradient-to-r from-[#026fc3] via-[#1d6ef2] to-[#2563eb] hover:from-[#03589e] hover:to-[#1d4ed8] text-white border border-sky-300/50 active:scale-[0.99]'
                }`}
              >
                {isCompleting || submittingAll ? (
                  <>
                    <Sparkles className="w-5 h-5 animate-spin" />
                    <span>Submitting Day {dayNumber}...</span>
                  </>
                ) : isCompleted && evaluatedCount >= allValidQuestions.length ? (
                  <>
                    <Award className="w-5 h-5" />
                    <span>Day {dayNumber} Completed • Continue</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    <span>Submit Day {dayNumber}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between px-2 text-[11px] font-semibold text-sky-200/75">
                <span>
                  Activities ready: {answeredCount}/{allValidQuestions.length}
                </span>
                <span>
                  XP Earned: {earnedLessonXP}/{totalLessonXP} XP
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ================================================================== */}
      {/* FULL VOCABULARY MODAL                                              */}
      {/* ================================================================== */}
      {showFullVocabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white text-slate-900 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-amber-200 shadow-2xl overflow-hidden">
            <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0a213c] to-[#13325c] text-white flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                  Day {dayNumber} • {cleanLessonTitle}
                </span>
                <h3 className="text-lg sm:text-xl font-black">
                  Full Key Vocabulary ({vocabularyList.length} Words)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFullVocabModal(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-3">
              {vocabularyList.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-4 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-400/30 text-amber-950 text-xs font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-base font-black text-slate-900">
                        {item.word}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-700">
                      {item.meaning}
                    </p>
                    {item.example && (
                      <p className="text-xs italic text-slate-500 pt-0.5">
                        Example: “{item.example}”
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      speakText(
                        `${item.word}. ${item.meaning}. ${item.example ? `Example: ${item.example}` : ''}`
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-amber-200/70 hover:bg-amber-300/80 text-amber-950 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>Listen</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
