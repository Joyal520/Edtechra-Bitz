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
import { parseCoverPosition } from '@/utils/courseCover';

// Inline fill-in-the-blank sentence templates for Creepy Legends short-answer questions
const INLINE_SENTENCE_TEMPLATES: Record<string, { before: string; after: string }> = {
  'e10c7ee9-0012-4000-8004-000000000017': { before: 'The bridge in the story is called', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000018': { before: 'A dog has a very powerful sense of', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000019': { before: 'In the local legend, the ghost was the', after: 'Lady.' },
  'e10c7ee9-0012-4000-8004-000000000027': { before: 'The mysterious woman wore a', after: 'dress.' },
  'e10c7ee9-0012-4000-8004-000000000028': { before: 'The drive took about', after: 'minutes.' },
  'e10c7ee9-0012-4000-8004-000000000029': { before: 'Ten years earlier, the daughter died in a car', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000037': { before: 'The legend of Kuchisake-onna began in', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000038': { before: 'Travelers can throw hard', after: 'to escape.' },
  'e10c7ee9-0012-4000-8004-000000000039': { before: 'She first asks travelers, "', after: '"' },
  'e10c7ee9-0012-4000-8004-000000000047': { before: 'The painted mummy lid was originally made in', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000048': { before: 'The famous ship Titanic sank in the year', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000049': { before: 'Sensational rumors about the curse were invented by', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000057': { before: 'In the story, the plane landed in', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000058': { before: 'The plane supposedly returned after', after: 'years.' },
  'e10c7ee9-0012-4000-8004-000000000059': { before: 'Inside the cockpit, the police found a', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000067': { before: 'The story of the Black-Eyed Kids began in', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000068': { before: 'The two boys were wearing dark', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000069': { before: 'Before entering the car, the boys needed an', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000077': { before: 'The ship was caught in a storm near the', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000078': { before: 'In the legend, the ghost ship was', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000079': { before: 'Sailors said the ghost ship glowed with an eerie', after: 'light.' },
  'e10c7ee9-0012-4000-8004-000000000087': { before: 'During the mirror ritual, light comes from a', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000088': { before: 'This mirror ritual is commonly done in the', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000089': { before: 'Science says the face in the mirror is', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000097': { before: "In English, the Swedish word 'Silverpilen' means", after: '.' },
  'e10c7ee9-0012-4000-8004-000000000098': { before: 'In the Stockholm metro, Kymlinge was an', after: 'station.' },
  'e10c7ee9-0012-4000-8004-000000000099': { before: 'The preposition', after: 'means moving from the outside to the inside.' },
  'e10c7ee9-0012-4000-8004-000000000107': { before: 'In Sleepy Hollow, Ichabod Crane worked as a', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000108': { before: 'According to legend, the soldier lost his head to a', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000109': { before: 'The Horseman threw a round', after: 'at Ichabod.' },
  'e10c7ee9-0012-4000-8004-000000000117': { before: 'Like a turtle, the Kappa has a hard', after: 'on its back.' },
  'e10c7ee9-0012-4000-8004-000000000118': { before: 'Making a polite', after: 'causes the Kappa to spill its water.' },
  'e10c7ee9-0012-4000-8004-000000000119': { before: 'In Japanese folklore, supernatural spirits like the Kappa are called', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000127': { before: 'When the two children were found, their skin was', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000128': { before: 'The girl described her twilight homeland as', after: '.' },
  'e10c7ee9-0012-4000-8004-000000000129': { before: 'Medieval chroniclers wrote that this event happened in the', after: 'century.' }
};

function getInlineSentenceParts(q: CourseQuestion): {
  promptLabel?: string;
  before: string;
  after: string;
} {
  const rawText = String(q.question_text || '').trim();
  const blankRegex = /_{2,}|\[blank\]|\(\s*blank\s*\)/i;
  if (blankRegex.test(rawText)) {
    const parts = rawText.split(blankRegex);
    return {
      before: (parts[0] || '').trim(),
      after: parts.slice(1).join(' ').trim()
    };
  }
  const mapped = INLINE_SENTENCE_TEMPLATES[q.id];
  if (mapped) {
    return {
      promptLabel: rawText,
      before: mapped.before,
      after: mapped.after
    };
  }
  return {
    promptLabel: rawText,
    before: 'My answer is',
    after: '.'
  };
}

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
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
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
        return (
          b.block_type === 'video' ||
          b.block_type === 'youtube_video' ||
          b.block_type === 'text_video' ||
          Boolean(c.video?.url) ||
          Boolean(c.video?.video_url) ||
          Boolean(c.video?.video_id) ||
          Boolean(c.video_url) ||
          Boolean(c.url) ||
          Boolean(c.video_id)
        );
      }),
    [rawBlocks]
  );

  const vocabularyList = useMemo(() => extractVocabularyFromBlocks(rawBlocks), [rawBlocks]);
  const grammarContent = useMemo(() => extractGrammarFromBlocks(rawBlocks), [rawBlocks]);

  // Extra custom blocks (that are NOT video, NOT vocabulary, NOT grammar, and NOT in the 4 excluded sections)
  const extraBlocks = useMemo(() => {
    return rawBlocks.filter(b => {
      if (isExcludedStudentSection(b)) return false;
      if (
        b.block_type === 'video' ||
        b.block_type === 'youtube_video' ||
        b.block_type === 'text_video' ||
        (videoBlock && b.id === videoBlock.id)
      ) {
        return false;
      }
      if (b.block_type === 'vocabulary_cards') return false;
      const c = contentAny(b);
      if (c.video?.url || c.video_url || c.video_id) return false;
      const t = String(c.title || '').toLowerCase();
      if (t.includes('vocabulary') || t.startsWith('grammar:') || t.includes('grammar')) return false;
      return true;
    });
  }, [rawBlocks, videoBlock]);

  // Video playback states: 'ready' | 'loading' | 'playing' | 'error' | 'completed'
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoStatus, setVideoStatus] = useState<'ready' | 'loading' | 'playing' | 'error' | 'completed'>('ready');
  const [videoRetryKey, setVideoRetryKey] = useState(0);
  const [videoWatched, setVideoWatched] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showFullVocabModal, setShowFullVocabModal] = useState(false);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const htmlVideoRef = useRef<HTMLVideoElement | null>(null);

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
  const [activeBlankMap, setActiveBlankMap] = useState<Record<string, boolean>>({});
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
    setVideoStatus('ready');
    setVideoRetryKey(0);
    setVideoWatched(Boolean(isCompleted));
    setShowTranscript(false);
    setValidationError(null);
    setCollapsedSections({});
    setActiveBlankMap({});

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
    const nextVideoBlock = (nextEp.blocks || []).find(b => {
      const c = contentAny(b);
      return (
        b.block_type === 'video' ||
        b.block_type === 'youtube_video' ||
        b.block_type === 'text_video' ||
        Boolean(c.video?.url) ||
        Boolean(c.video_url) ||
        Boolean(c.url)
      );
    });
    const nc = contentAny(nextVideoBlock);
    const nextVidId = extractYouTubeId(
      nc.video_id || nc.video?.video_id || nc.video?.url || nc.video?.video_url || nc.url || nc.video_url
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

  // Video metadata (supports both top-level and nested content.video structures, plus direct MP4/WebM URLs)
  const vc = contentAny(videoBlock);
  const rawVideoSourceUrl = String(
    vc.video?.url ||
      vc.video?.video_url ||
      vc.url ||
      vc.video_url ||
      vc.video_id ||
      vc.video?.video_id ||
      (selectedEpisode as any)?.video_url ||
      (selectedEpisode as any)?.video_id ||
      ''
  ).trim();
  const videoId = extractYouTubeId(
    vc.video_id ||
      vc.video?.video_id ||
      vc.video?.url ||
      vc.video?.video_url ||
      vc.url ||
      vc.video_url ||
      rawVideoSourceUrl
  );
  const directVideoUrl = !videoId && /^https?:\/\//i.test(rawVideoSourceUrl) ? rawVideoSourceUrl : null;
  const hasPlayableVideoSource = Boolean(videoId || directVideoUrl);

  const videoTranscript = String(
    vc.transcript ||
      vc.video?.transcript ||
      ''
  ).trim();
  const coverPos = parseCoverPosition(course.cover_image_url, (course as any)?.cover_object_position);
  const coverImageUrl =
    coverPos.cleanUrl || '/images/creepy-legends-cover.jpg';

  const videoPosterUrl = videoId
    ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
    : vc.poster || vc.video?.poster || coverImageUrl;
  const videoFallbackPosterUrl = videoId
    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    : coverImageUrl;

  // Send playVideo command & subscribe to YouTube IFrame API events via postMessage
  const triggerYouTubePlayCommand = useCallback(() => {
    const win = ytIframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
      win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
    } catch {
      // ignore cross-origin postMessage errors
    }
  }, []);

  useEffect(() => {
    if (!videoPlaying || !videoId) return;

    const handleYouTubeMessage = (event: MessageEvent) => {
      if (!event.origin.includes('youtube.com') && !event.origin.includes('youtube-nocookie.com')) {
        return;
      }
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data) return;

        if (data.event === 'onReady') {
          setVideoStatus(prev => (prev === 'loading' ? 'playing' : prev));
          triggerYouTubePlayCommand();
        } else if (data.event === 'onStateChange' || data.event === 'infoDelivery') {
          const playerState =
            typeof data.info === 'number'
              ? data.info
              : typeof data.info?.playerState === 'number'
              ? data.info.playerState
              : undefined;

          if (playerState === 1) {
            // YT.PlayerState.PLAYING
            setVideoStatus('playing');
            setVideoWatched(true);
          } else if (playerState === 2) {
            // YT.PlayerState.PAUSED
            setVideoStatus(prev => (prev === 'loading' ? 'playing' : prev));
          } else if (playerState === 0) {
            // YT.PlayerState.ENDED
            setVideoStatus('completed');
            setVideoWatched(true);
          }
        } else if (data.event === 'onError' || (data.info && typeof data.info.errorCode === 'number')) {
          setVideoStatus('error');
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleYouTubeMessage);
    return () => window.removeEventListener('message', handleYouTubeMessage);
  }, [videoPlaying, videoId, triggerYouTubePlayCommand]);

  const handleStartVideoPlayback = () => {
    if (!hasPlayableVideoSource) {
      setVideoPlaying(true);
      setVideoStatus('error');
      return;
    }
    setVideoPlaying(true);
    setVideoStatus('loading');
    setVideoWatched(true);
  };

  const handleRetryVideoPlayback = () => {
    setVideoRetryKey(prev => prev + 1);
    if (!hasPlayableVideoSource) {
      setVideoStatus('error');
      return;
    }
    setVideoPlaying(true);
    setVideoStatus('loading');
  };

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
          className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-sky-400/30 shadow-2xl bg-[#07152b]"
        >
          {/* 16:9 Background Artwork Layer with Strong Atmospheric Visibility & Saved Focal Point */}
          <div className="relative w-full min-h-[195px] sm:min-h-[245px] md:min-h-[280px] flex flex-col justify-between p-4 sm:p-7 md:p-8">
            <img
              src={coverImageUrl}
              alt={course.title}
              loading="eager"
              fetchPriority="high"
              style={{ objectPosition: coverPos.objectPosition }}
              onError={e => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/images/creepy-legends-cover.jpg')) {
                  target.src = '/images/creepy-legends-cover.jpg';
                }
              }}
              className="absolute inset-0 w-full h-full object-cover opacity-90 brightness-105 contrast-105 scale-[1.01] transition-all duration-500"
            />
            {/* Controlled cinematic gradient & soft vignette: keeps artwork vivid while guaranteeing title readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#050e1f]/90 via-[#07162e]/50 to-[#050e1f]/25 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050e1f]/95 via-[#050e1f]/20 to-[#050e1f]/25 pointer-events-none" />

            {/* Top Badges Row */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-slate-950/65 border border-sky-400/40 text-sky-200 text-[10px] sm:text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Interactive English Course</span>
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-950/65 border border-amber-300/45 text-amber-200 text-[10px] sm:text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs">
                  {course.grade_level || 'A1–A2'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/65 border border-emerald-400/40 text-emerald-200 text-[10px] sm:text-[11px] font-black backdrop-blur-md shadow-xs">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>{totalLessonXP} XP</span>
                </span>
              </div>

              {onOpenCoverModal && (
                <button
                  type="button"
                  onClick={onOpenCoverModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/70 hover:bg-slate-950/90 border border-white/25 text-white text-xs font-bold backdrop-blur-md transition-all cursor-pointer shadow-md"
                  title="Edit or Reposition Course Cover Image"
                >
                  <Camera className="w-3.5 h-3.5 text-sky-300" />
                  <span>Cover</span>
                </button>
              )}
            </div>

            {/* Center & Bottom Hero Content */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-3.5 sm:gap-5 pt-5 sm:pt-8">
              <div className="space-y-1.5 max-w-2xl">
                <p className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-sky-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
                  {course.subject || 'English Language'} • {totalCount} Lessons
                </p>
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)] leading-[1.1]">
                  {course.title}
                </h1>
                <p className="text-xs sm:text-base text-slate-100 font-medium max-w-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  {course.short_description || '12 Days of Stories, Vocabulary & Mystery'}
                </p>
              </div>

              {/* Featured Current Day Plaque (Matches Reference Header Plaque) */}
              <div className="shrink-0 w-full sm:w-auto self-start md:self-end bg-gradient-to-b from-[#2b1d12]/95 to-[#1a110a]/95 border-2 border-amber-500/60 rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 shadow-[0_10px_25px_rgba(0,0,0,0.7)] backdrop-blur-md sm:min-w-[250px]">
                <div className="flex items-center justify-between gap-3 mb-0.5 sm:mb-1">
                  <span className="px-2.5 py-0.5 rounded-md bg-rose-600 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-xs">
                    Day {dayNumber}
                  </span>
                  <span className="text-[11px] font-bold text-amber-300/95">
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
            <div className="rounded-2xl bg-gradient-to-r from-[#0e2344] via-[#122b52] to-[#0e2344] border border-sky-400/25 p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-xs shrink-0">
                    Day {dayNumber}
                  </span>
                  <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight break-words">
                    {cleanLessonTitle}
                  </h2>
                </div>
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
            {/* SECTION 1: WATCH THE STORY (EDGE-TO-EDGE MOBILE VIDEO)       */}
            {/* ============================================================ */}
            <section
              data-testid="lesson-video-section"
              className="-mx-3 sm:mx-0 rounded-none sm:rounded-2xl bg-[#0d213f] border-y sm:border border-sky-400/25 shadow-xl overflow-hidden"
            >
              {/* Section Header */}
              <div className="px-3.5 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 border-b border-sky-400/15">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1d6ef2] text-white font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-sm">
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
                      className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                        showTranscript
                          ? 'bg-sky-500 text-white border-sky-300'
                          : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border-sky-400/30'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{showTranscript ? 'Hide Transcript' : 'Transcript'}</span>
                    </button>
                  )}
                  <span className="px-2.5 sm:px-3 py-1 rounded-lg bg-[#15305b] border border-sky-400/25 text-sky-200 text-xs font-mono font-bold">
                    04:25
                  </span>
                </div>
              </div>

              {/* Responsive 16:9 Video Player Container — Edge-to-Edge on Mobile */}
              <div className="p-0 sm:p-5 space-y-0 sm:space-y-3">
                <div
                  data-video-status={videoStatus}
                  className="relative w-full aspect-video rounded-none sm:rounded-xl overflow-hidden bg-slate-950 border-0 sm:border border-sky-300/20 shadow-2xl group"
                >
                  {videoStatus === 'error' ? (
                    <div
                      data-testid="video-error-state"
                      className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-950 to-[#081529] space-y-3"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <p className="text-sm sm:text-base font-extrabold text-white max-w-md">
                        This video could not be loaded. Please try again.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={handleRetryVideoPlayback}
                          className="px-4 py-2 rounded-xl bg-[#1d6ef2] hover:bg-[#026fc3] text-white text-xs sm:text-sm font-black inline-flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retry</span>
                        </button>
                        {videoId && (
                          <a
                            href={`https://www.youtube.com/watch?v=${videoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setVideoWatched(true)}
                            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-sky-200 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-all"
                          >
                            <span>Watch on YouTube</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ) : videoPlaying && videoId ? (
                    <div className="relative w-full h-full bg-black">
                      {videoStatus === 'loading' && (
                        <div
                          data-testid="video-loading-state"
                          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 bg-slate-950/75 backdrop-blur-xs pointer-events-none"
                        >
                          <div className="w-10 h-10 rounded-full border-3 border-sky-400/30 border-t-sky-400 animate-spin" />
                          <span className="text-xs font-bold text-sky-100">Loading video...</span>
                        </div>
                      )}
                      <iframe
                        key={`${videoId}-${videoRetryKey}`}
                        ref={ytIframeRef}
                        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=${
                          typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : ''
                        }`}
                        title={cleanLessonTitle}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                        allowFullScreen
                        onLoad={() => {
                          setVideoStatus(prev => (prev === 'loading' ? 'playing' : prev));
                          setVideoWatched(true);
                          triggerYouTubePlayCommand();
                          setTimeout(triggerYouTubePlayCommand, 200);
                        }}
                        onError={() => setVideoStatus('error')}
                        className="w-full h-full border-0"
                      />
                    </div>
                  ) : videoPlaying && directVideoUrl ? (
                    <div className="relative w-full h-full bg-black">
                      {videoStatus === 'loading' && (
                        <div
                          data-testid="video-loading-state"
                          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 bg-slate-950/75 backdrop-blur-xs pointer-events-none"
                        >
                          <div className="w-10 h-10 rounded-full border-3 border-sky-400/30 border-t-sky-400 animate-spin" />
                          <span className="text-xs font-bold text-sky-100">Loading video...</span>
                        </div>
                      )}
                      <video
                        key={`${directVideoUrl}-${videoRetryKey}`}
                        ref={htmlVideoRef}
                        src={directVideoUrl}
                        poster={videoPosterUrl}
                        controls
                        autoPlay
                        playsInline
                        preload="auto"
                        onLoadStart={() => setVideoStatus('loading')}
                        onLoadedMetadata={() => setVideoStatus(prev => (prev === 'loading' ? 'playing' : prev))}
                        onCanPlay={() => setVideoStatus(prev => (prev === 'loading' ? 'playing' : prev))}
                        onPlaying={() => {
                          setVideoStatus('playing');
                          setVideoWatched(true);
                        }}
                        onWaiting={() => setVideoStatus('loading')}
                        onEnded={() => {
                          setVideoStatus('completed');
                          setVideoWatched(true);
                        }}
                        onError={() => setVideoStatus('error')}
                        className="w-full h-full object-contain bg-black"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartVideoPlayback}
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
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-95"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-slate-950/25" />

                      {/* Center Big Play Button */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 sm:gap-3">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#1d6ef2]/95 group-hover:bg-[#026fc3] border-2 border-white/85 text-white flex items-center justify-center shadow-[0_0_35px_rgba(29,110,242,0.85)] transition-all duration-200 group-hover:scale-110">
                          <Play className="w-8 h-8 sm:w-9 sm:h-9 fill-current ml-1" />
                        </div>
                        <span className="px-3.5 py-1 rounded-full bg-slate-950/80 border border-white/20 text-xs font-bold text-sky-100 backdrop-blur-xs">
                          Tap to Play Story Video
                        </span>
                      </div>

                      {/* Bottom Player Bar UI */}
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

                {/* Single Concise Video Footer Helper & Secondary YouTube Link */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-sky-200/85 px-3.5 py-3 sm:px-1 sm:py-0">
                  <div className="flex items-center gap-2">
                    {videoStatus === 'completed' || videoWatched ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-300 font-bold">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Watch the story carefully before answering the questions below.</span>
                      </span>
                    ) : (
                      <span>Watch the story carefully before answering the questions below.</span>
                    )}
                  </div>
                  {videoId && (
                    <a
                      href={`https://www.youtube.com/watch?v=${videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setVideoWatched(true)}
                      className="inline-flex items-center gap-1 text-sky-300 hover:text-white font-bold underline-offset-2 hover:underline shrink-0"
                    >
                      <span>Watch on YouTube</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Collapsible Video Transcript Drawer */}
                {showTranscript && videoTranscript && (
                  <div className="mx-3.5 mb-3.5 sm:mx-0 sm:mb-0 mt-1 sm:mt-3 rounded-xl bg-[#081529] border border-sky-400/25 p-4 sm:p-5 space-y-3 animate-in fade-in duration-200">
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
                  <div className="flex flex-wrap items-center gap-2.5">
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
                {/* Responsive Section Header */}
                <div
                  onClick={() => toggleSection('mcq')}
                  className="px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer sm:cursor-default"
                >
                  <div className="flex items-start sm:items-center justify-between gap-3 min-w-0">
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-[#13294b] text-white font-black text-sm flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-xs">
                        {mcqSectionNum}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                          Multiple Choice Questions
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5 leading-snug">
                          Choose the best answer for each question ({mcqQuestions[0]?.points || 10} marks each)
                        </p>
                      </div>
                    </div>
                    <span className="sm:hidden text-slate-500 shrink-0 mt-1">
                      {collapsedSections['mcq'] ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-11 sm:pl-0">
                    <span className="px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-[#0c2d57] text-xs font-extrabold">
                      {mcqQuestions.length} {mcqQuestions.length === 1 ? 'question' : 'questions'} •{' '}
                      {mcqQuestions.reduce((s, q) => s + (Number(q.points) || 10), 0)} marks
                    </span>
                  </div>
                </div>

                {/* Full-Width Responsive Question Cards */}
                {!collapsedSections['mcq'] && (
                  <div className="p-4 sm:p-6 space-y-4">
                    {mcqQuestions.map((q, qIdx) => {
                      const options = normalizeQuestionOptions(q.options);
                      const selectedVal = draftAnswers[q.id] || '';
                      const evaluated = evaluatedMap[q.id];
                      const resolvedCorrect = resolveCorrectOption(q);

                      return (
                        <div
                          key={q.id}
                          id={`question-card-${q.id}`}
                          className={`rounded-2xl border-2 p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all ${
                            evaluated
                              ? evaluated.isCorrect
                                ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                                : 'bg-rose-50/50 border-rose-300 shadow-xs'
                              : selectedVal
                              ? 'bg-sky-50/50 border-[#1d6ef2] shadow-sm'
                              : 'bg-slate-50/70 border-slate-200/90 hover:border-sky-300'
                          }`}
                        >
                          <div className="space-y-3.5">
                            {/* Question Number & Marks */}
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#13294b] text-white text-xs font-black mr-2 align-middle">
                                  {qIdx + 1}
                                </span>
                                <span className="align-middle">{q.question_text}</span>
                              </h4>
                              <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[11px] font-extrabold text-slate-600">
                                {q.points || 10} pts
                              </span>
                            </div>

                            {/* Answer Choices — 2-col on tablet/desktop, 1-col on mobile */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {options.map(opt => {
                                const isSelected =
                                  selectedVal === opt.id ||
                                  isOptionMatchingStudentAnswer(opt, selectedVal);
                                const isCorrectOpt =
                                  resolvedCorrect?.id === opt.id;

                                let btnStyle =
                                  'bg-white hover:bg-sky-50/70 hover:border-sky-300 border-slate-200 text-slate-800 shadow-2xs';
                                let badgeStyle =
                                  'bg-sky-100 text-[#0c2d57] border-sky-200';

                                if (evaluated) {
                                  if (isCorrectOpt) {
                                    btnStyle =
                                      'bg-emerald-600 border-emerald-600 text-white font-bold shadow-sm';
                                    badgeStyle = 'bg-white/20 text-white border-white/30';
                                  } else if (isSelected && !evaluated.isCorrect) {
                                    btnStyle =
                                      'bg-rose-600 border-rose-600 text-white font-bold shadow-sm';
                                    badgeStyle = 'bg-white/20 text-white border-white/30';
                                  }
                                } else if (isSelected) {
                                  btnStyle =
                                    'bg-[#1d6ef2] border-[#1d6ef2] text-white font-bold shadow-md ring-2 ring-sky-300/60';
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
                                    className={`w-full px-3.5 py-3 rounded-xl border-2 text-left text-xs sm:text-sm transition-all flex items-center gap-3 cursor-pointer active:scale-[0.99] disabled:cursor-default ${btnStyle}`}
                                  >
                                    <span
                                      className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 border ${badgeStyle}`}
                                    >
                                      {opt.id}
                                    </span>
                                    <span className="flex-1 leading-snug font-semibold">{opt.text}</span>
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
                          <div className="pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-2 text-xs">
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
                                  : `✗ Correct answer: ${resolvedCorrect?.id || q.correct_answer}`}
                              </span>
                            ) : selectedVal ? (
                              <button
                                type="button"
                                onClick={() => evaluateAndPersistQuestion(q)}
                                className="px-3 py-1 rounded-lg bg-[#1d6ef2]/10 hover:bg-[#1d6ef2]/20 text-[#026fc3] font-extrabold cursor-pointer transition-colors"
                              >
                                Check Answer →
                              </button>
                            ) : (
                              <span className="text-slate-400 font-semibold">Tap an option above</span>
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
            {/* SECTION 3: TRUE / FALSE QUESTIONS (CUTE COLOURFUL BUTTONS)   */}
            {/* ============================================================ */}
            {tfQuestions.length > 0 && (
              <section
                data-testid="section-true-false"
                className="rounded-2xl bg-white text-slate-900 border border-slate-200/90 shadow-xl overflow-hidden"
              >
                {/* Responsive Section Header */}
                <div
                  onClick={() => toggleSection('tf')}
                  className="px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer sm:cursor-default"
                >
                  <div className="flex items-start sm:items-center justify-between gap-3 min-w-0">
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-[#13294b] text-white font-black text-sm flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-xs">
                        {tfSectionNum}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                          True or False Questions
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5 leading-snug">
                          Decide whether each statement from the story is True or False
                        </p>
                      </div>
                    </div>
                    <span className="sm:hidden text-slate-500 shrink-0 mt-1">
                      {collapsedSections['tf'] ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-11 sm:pl-0">
                    <span className="px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-[#0c2d57] text-xs font-extrabold">
                      {tfQuestions.length} {tfQuestions.length === 1 ? 'question' : 'questions'} •{' '}
                      {tfQuestions.reduce((s, q) => s + (Number(q.points) || 10), 0)} marks
                    </span>
                  </div>
                </div>

                {/* Full-Width Question Cards with Cute Colourful True/False Icon Buttons */}
                {!collapsedSections['tf'] && (
                  <div className="p-4 sm:p-6 space-y-4">
                    {tfQuestions.map((q, qIdx) => {
                      const selectedVal = draftAnswers[q.id] || '';
                      const evaluated = evaluatedMap[q.id];
                      const choices: Array<'True' | 'False'> = ['True', 'False'];

                      return (
                        <div
                          key={q.id}
                          id={`question-card-${q.id}`}
                          className={`rounded-2xl border-2 p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all ${
                            evaluated
                              ? evaluated.isCorrect
                                ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                                : 'bg-rose-50/50 border-rose-300 shadow-xs'
                              : selectedVal
                              ? 'bg-sky-50/40 border-[#1d6ef2] shadow-sm'
                              : 'bg-slate-50/70 border-slate-200/90 hover:border-sky-300'
                          }`}
                        >
                          <div className="space-y-3.5">
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#13294b] text-white text-xs font-black mr-2 align-middle">
                                  {qIdx + 1}
                                </span>
                                <span className="align-middle">{q.question_text}</span>
                              </h4>
                              <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[11px] font-extrabold text-slate-600">
                                {q.points || 10} pts
                              </span>
                            </div>

                            {/* Cute Playful True / False Buttons with Distinct Icon Badges */}
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1">
                              {choices.map(choice => {
                                const isTrueBtn = choice === 'True';
                                const isSelected =
                                  selectedVal.toLowerCase() === choice.toLowerCase();
                                const isCorrectChoice =
                                  String(q.correct_answer || '').toLowerCase() ===
                                  choice.toLowerCase();

                                let cardClass = isTrueBtn
                                  ? 'bg-gradient-to-b from-emerald-50/90 to-teal-50/50 hover:from-emerald-100/90 hover:to-teal-100/70 border-emerald-300 text-emerald-900 shadow-xs'
                                  : 'bg-gradient-to-b from-rose-50/90 to-pink-50/50 hover:from-rose-100/90 hover:to-pink-100/70 border-rose-300 text-rose-900 shadow-xs';

                                let iconBadgeClass = isTrueBtn
                                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                                  : 'bg-rose-500 text-white shadow-sm shadow-rose-500/30';

                                if (evaluated) {
                                  if (isCorrectChoice) {
                                    cardClass = isTrueBtn
                                      ? 'bg-gradient-to-r from-emerald-600 to-teal-500 border-emerald-600 text-white shadow-md ring-2 ring-emerald-300'
                                      : 'bg-gradient-to-r from-rose-600 to-pink-600 border-rose-600 text-white shadow-md ring-2 ring-rose-300';
                                    iconBadgeClass = 'bg-white/25 text-white';
                                  } else if (isSelected && !evaluated.isCorrect) {
                                    cardClass =
                                      'bg-slate-200/80 border-rose-400 text-rose-900 opacity-85';
                                    iconBadgeClass = 'bg-rose-600 text-white';
                                  } else {
                                    cardClass =
                                      'bg-slate-100 border-slate-200 text-slate-400 opacity-60';
                                    iconBadgeClass = 'bg-slate-300 text-white';
                                  }
                                } else if (isSelected) {
                                  cardClass = isTrueBtn
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 border-emerald-600 text-white shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-300 scale-[1.01]'
                                    : 'bg-gradient-to-r from-rose-500 to-pink-500 border-rose-600 text-white shadow-lg shadow-rose-500/25 ring-2 ring-rose-300 scale-[1.01]';
                                  iconBadgeClass = 'bg-white/25 text-white';
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
                                    className={`py-3 px-3.5 sm:px-4 rounded-2xl border-2 text-sm sm:text-base font-black transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 disabled:cursor-default ${cardClass}`}
                                  >
                                    <span
                                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform ${iconBadgeClass}`}
                                    >
                                      {isTrueBtn ? (
                                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                                      ) : (
                                        <XCircle className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                                      )}
                                    </span>
                                    <span>{choice}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-2 text-xs">
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
                                  : `✗ Correct answer: ${q.correct_answer}`}
                              </span>
                            ) : selectedVal ? (
                              <button
                                type="button"
                                onClick={() => evaluateAndPersistQuestion(q)}
                                className="px-3 py-1 rounded-lg bg-[#1d6ef2]/10 hover:bg-[#1d6ef2]/20 text-[#026fc3] font-extrabold cursor-pointer transition-colors"
                              >
                                Check Answer →
                              </button>
                            ) : (
                              <span className="text-slate-400 font-semibold">Tap True or False</span>
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
            {/* SECTION 4: SHORT ANSWER QUESTIONS (INLINE SENTENCE BLANK)    */}
            {/* ============================================================ */}
            {shortQuestions.length > 0 && (
              <section
                data-testid="section-short-answer"
                className="rounded-2xl bg-white text-slate-900 border border-slate-200/90 shadow-xl overflow-hidden"
              >
                {/* Responsive Section Header */}
                <div
                  onClick={() => toggleSection('short')}
                  className="px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer sm:cursor-default"
                >
                  <div className="flex items-start sm:items-center justify-between gap-3 min-w-0">
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-[#13294b] text-white font-black text-sm flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-xs">
                        {shortSectionNum}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                          Short Answer Questions
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5 leading-snug">
                          Tap the blank space inside each sentence and type the missing word or phrase
                        </p>
                      </div>
                    </div>
                    <span className="sm:hidden text-slate-500 shrink-0 mt-1">
                      {collapsedSections['short'] ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-11 sm:pl-0">
                    <span className="px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-[#0c2d57] text-xs font-extrabold">
                      {shortQuestions.length} {shortQuestions.length === 1 ? 'question' : 'questions'} •{' '}
                      {shortQuestions.reduce((s, q) => s + (Number(q.points) || 10), 0)} marks
                    </span>
                  </div>
                </div>

                {/* Full-Width Question Cards with Inline Sentence Fill-in-the-Blank */}
                {!collapsedSections['short'] && (
                  <div className="p-4 sm:p-6 space-y-4">
                    {shortQuestions.map((q, qIdx) => {
                      const val = draftAnswers[q.id] || '';
                      const evaluated = evaluatedMap[q.id];
                      const isBlankActive = Boolean(activeBlankMap[q.id]) || Boolean(val);
                      const { promptLabel, before: beforeBlank, after: afterBlank } = getInlineSentenceParts(q);

                      return (
                        <div
                          key={q.id}
                          id={`question-card-${q.id}`}
                          className={`rounded-2xl border-2 p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all ${
                            evaluated
                              ? evaluated.isCorrect
                                ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                                : 'bg-rose-50/50 border-rose-300 shadow-xs'
                              : val.trim()
                              ? 'bg-sky-50/40 border-[#1d6ef2] shadow-sm'
                              : 'bg-slate-50/70 border-slate-200/90 hover:border-sky-300'
                          }`}
                        >
                          <div className="space-y-3">
                            {/* Question Prompt Header */}
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-600 leading-snug">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#13294b] text-white text-xs font-black mr-2 align-middle">
                                  {qIdx + 1}
                                </span>
                                <span className="align-middle">
                                  {promptLabel || 'Complete the sentence from the story:'}
                                </span>
                              </h4>
                              <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[11px] font-extrabold text-slate-600">
                                {q.points || 10} pts
                              </span>
                            </div>

                            {/* Interactive Inline Fill-in-the-Blank Sentence Box */}
                            <div
                              onClick={() => {
                                if (!evaluated) {
                                  setActiveBlankMap(prev => ({ ...prev, [q.id]: true }));
                                }
                              }}
                              className="rounded-xl bg-white border-2 border-sky-200/90 px-4 py-3.5 sm:px-5 sm:py-4 shadow-inner cursor-text"
                            >
                              <div className="text-sm sm:text-base font-extrabold text-slate-900 leading-relaxed flex flex-wrap items-baseline gap-x-1.5 gap-y-2">
                                {beforeBlank && <span>{beforeBlank}</span>}

                                {/* Inline Blank / Input Control */}
                                {isBlankActive || evaluated ? (
                                  <span className="inline-flex items-center">
                                    <input
                                      type="text"
                                      maxLength={120}
                                      disabled={Boolean(evaluated)}
                                      autoFocus={Boolean(activeBlankMap[q.id]) && !val}
                                      value={val}
                                      onChange={e => {
                                        setDraftAnswers(prev => ({
                                          ...prev,
                                          [q.id]: e.target.value
                                        }));
                                        setValidationError(null);
                                      }}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && val.trim() && !evaluated) {
                                          e.preventDefault();
                                          evaluateAndPersistQuestion(q);
                                        }
                                      }}
                                      placeholder="type answer..."
                                      style={{
                                        width: `${Math.max(11, Math.min(28, (val.length || 10) + 3))}ch`
                                      }}
                                      className={`inline-block rounded-lg border-2 px-3 py-1 text-center text-sm sm:text-base font-black transition-all focus:outline-none ${
                                        evaluated
                                          ? evaluated.isCorrect
                                            ? 'bg-emerald-100 border-emerald-500 text-emerald-900'
                                            : 'bg-rose-100 border-rose-500 text-rose-900'
                                          : 'bg-sky-50/90 border-[#1d6ef2] text-[#0c2d57] placeholder:text-sky-400/80 placeholder:font-semibold shadow-[0_0_12px_rgba(29,110,242,0.2)]'
                                      }`}
                                    />
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      courseAudio.playClick();
                                      setActiveBlankMap(prev => ({ ...prev, [q.id]: true }));
                                    }}
                                    className="inline-flex items-center justify-center px-4 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 border-2 border-dashed border-[#1d6ef2] text-[#1d6ef2] font-black text-sm sm:text-base tracking-wider transition-all cursor-pointer shadow-2xs hover:scale-[1.02]"
                                  >
                                    [ ______ ]
                                  </button>
                                )}

                                {afterBlank && <span>{afterBlank}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-2 text-xs">
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
                                  : `✗ Answer: "${q.correct_answer}"`}
                              </span>
                            ) : val.trim() ? (
                              <button
                                type="button"
                                onClick={() => evaluateAndPersistQuestion(q)}
                                className="px-3 py-1 rounded-lg bg-[#1d6ef2]/10 hover:bg-[#1d6ef2]/20 text-[#026fc3] font-extrabold cursor-pointer transition-colors"
                              >
                                Check Answer →
                              </button>
                            ) : (
                              <span className="text-sky-600 font-bold">
                                Tap [ ______ ] to type your answer
                              </span>
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
            {/* SECTION 5: SENTENCE-MAKING / ORDERING (NEON-BLUE PILL CHIPS) */}
            {/* ============================================================ */}
            {orderingQuestions.length > 0 && (
              <section
                data-testid="section-ordering"
                className="rounded-2xl bg-white text-slate-900 border border-slate-200/90 shadow-xl overflow-hidden"
              >
                {/* Responsive Section Header */}
                <div
                  onClick={() => toggleSection('ordering')}
                  className="px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer sm:cursor-default"
                >
                  <div className="flex items-start sm:items-center justify-between gap-3 min-w-0">
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-[#13294b] text-white font-black text-sm flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-xs">
                        {orderingSectionNum}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                          Sentence Builder — Put the Words in Order
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5 leading-snug">
                          Tap or drag the glowing word chips in the right order to build the sentence
                        </p>
                      </div>
                    </div>
                    <span className="sm:hidden text-slate-500 shrink-0 mt-1">
                      {collapsedSections['ordering'] ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-11 sm:pl-0">
                    <span className="px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-[#0c2d57] text-xs font-extrabold">
                      {orderingQuestions.reduce((s, q) => s + (Number(q.points) || 10), 0)} marks
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

                      const handleUndoLastWord = () => {
                        if (evaluated || placed.length === 0) return;
                        const lastIdx = placed.length - 1;
                        const lastWord = placed[lastIdx];
                        handleRemoveSlotWord(lastWord, lastIdx);
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
                            <p className="text-sm sm:text-base font-extrabold text-slate-900">
                              {q.question_text}
                            </p>
                            {!evaluated && placed.length > 0 && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={handleUndoLastWord}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-[#0c2d57] text-xs font-extrabold cursor-pointer transition-colors"
                                >
                                  <span>↩ Undo</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleResetOrder}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Reset</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Sentence Construction Slots */}
                          <div className="rounded-2xl bg-[#0b1d38] border-2 border-sky-400/35 p-3.5 sm:p-4 shadow-inner space-y-3">
                            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-sky-300/80">
                              <span>Your Sentence ({placed.length}/{totalSlots} placed)</span>
                              {placed.length > 0 && !evaluated && (
                                <span className="text-sky-200/75 normal-case font-semibold">
                                  Tap any placed chip to remove it
                                </span>
                              )}
                            </div>

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
                                    className={`min-h-[52px] rounded-xl border-2 p-2 flex items-center justify-between gap-2 transition-all ${
                                      wordInSlot
                                        ? evaluated
                                          ? evaluated.isCorrect
                                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                                            : 'bg-rose-500/20 border-rose-400 text-rose-100'
                                          : 'bg-gradient-to-r from-[#0284c7] to-[#1d6ef2] border-sky-300 text-white shadow-[0_0_16px_rgba(56,189,248,0.45)]'
                                        : 'bg-[#081529]/80 border-dashed border-sky-400/30 text-sky-300/45'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <span
                                        className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                                          wordInSlot
                                            ? 'bg-white/20 text-white border border-white/30'
                                            : 'bg-sky-950/90 text-sky-300/70 border border-sky-400/20'
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
                                          className="text-xs sm:text-sm font-black truncate text-left flex-1 cursor-pointer text-white"
                                          title="Tap to remove"
                                        >
                                          {wordInSlot}
                                        </button>
                                      ) : (
                                        <span className="text-xs italic select-none">
                                          Slot {slotIdx + 1}
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
                                            className="p-1 rounded hover:bg-white/20 text-white/90 cursor-pointer"
                                            title="Move earlier"
                                          >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {slotIdx < placed.length - 1 && (
                                          <button
                                            type="button"
                                            onClick={() => handleSwapSlots(slotIdx, slotIdx + 1)}
                                            className="p-1 rounded hover:bg-white/20 text-white/90 cursor-pointer"
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
                          </div>

                          {/* Cute Neon-Blue Interactive Pill Chips Bank */}
                          <div className="rounded-2xl bg-gradient-to-br from-[#07152b] via-[#0c2244] to-[#081730] border-2 border-sky-400/35 p-4 shadow-lg">
                            {bank.length === 0 ? (
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="text-xs sm:text-sm font-bold text-sky-100">
                                  Built sentence:{' '}
                                  <strong className="text-sky-300 font-black">
                                    “{placed.join(' ')}”
                                  </strong>
                                </span>
                                {evaluated ? (
                                  <span
                                    className={`text-xs sm:text-sm font-extrabold ${
                                      evaluated.isCorrect ? 'text-emerald-300' : 'text-rose-300'
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
                                    className="px-4 py-2 rounded-full bg-gradient-to-r from-[#0ea5e9] to-[#1d6ef2] hover:from-[#38bdf8] hover:to-[#0284c7] text-white text-xs sm:text-sm font-black shadow-[0_0_18px_rgba(56,189,248,0.45)] cursor-pointer transition-all"
                                  >
                                    Check Order →
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                <div className="text-[11px] font-extrabold uppercase tracking-wider text-sky-300/85">
                                  Tap a glowing word chip to place it next:
                                </div>
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
                                      className="px-4 py-2.5 rounded-full bg-gradient-to-b from-[#0f3161] to-[#091f40] hover:from-[#0284c7] hover:to-[#1d6ef2] border-2 border-[#38bdf8]/85 hover:border-white text-sky-100 hover:text-white text-xs sm:text-sm font-extrabold shadow-[0_0_15px_rgba(56,189,248,0.32)] hover:shadow-[0_0_22px_rgba(56,189,248,0.65)] flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95"
                                    >
                                      <span className="w-2 h-2 rounded-full bg-[#38bdf8] shadow-[0_0_8px_#38bdf8]" />
                                      <span>{word}</span>
                                    </button>
                                  ))}
                                </div>
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
