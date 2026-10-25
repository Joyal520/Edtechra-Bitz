// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: UNIFIED COURSE CONTENT RENDERER
// Single source of truth for course authoring (mode = "edit") and student
// interactive learning (mode = "student" / preview).
// Features click-to-edit inline blocks, 16:9 responsive video containers,
// compact mobile answer cards, natural word chips, and instant evaluation.
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Award,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Video,
  Image as ImageIcon,
  Quote,
  Heading,
  Minus,
  FileText
} from 'lucide-react';
import {
  CourseBlock,
  CourseQuestion,
  StudentQuestionResponse,
  BlockType,
  QuestionType
} from '@/types/courseStudio';
import { FormattedLessonText, TextScale } from '@/utils/courseTextFormatting';
import { courseAudio } from '@/utils/courseAudio';
import { ComprehensiveQuestionRenderer } from '@/components/course-studio/ComprehensiveQuestionRenderer';
import { isExcludedStudentSection } from '@/components/course-studio/CreepyLegendsStudentView';
import { CanvaInlineTextEditor } from '@/components/course-studio/CanvaInlineTextEditor';
import { getThemePreset } from '@/utils/courseThemes';
import {
  getCanonicalBlockTranscript,
  setCanonicalBlockTranscript
} from '@/utils/questionSchemaValidator';
import {
  ObjectiveBannerBlock,
  IllustrationBlock,
  LabelledDiagramBlock,
  IconCardsGridBlock,
  VocabularyCardsBlock,
  ComparisonBlock,
  DidYouKnowBlock,
  InteractiveActivityBlock,
  KeyTakeawayBlock,
  CourseCompletionBlock
} from '@/components/course-studio/InteractiveCourseBlocks';

interface Props {
  blocks: CourseBlock[];
  questions?: CourseQuestion[];
  mode?: 'edit' | 'student';
  isStudentView?: boolean;
  textScale?: TextScale;
  onQuestionAnswer?: (
    questionId: string,
    answer: string,
    isCorrect: boolean,
    pointsAwarded: number,
    question: CourseQuestion
  ) => void;
  onCompleteLesson?: () => void;
  onProgressChange?: (answeredCount: number, totalCount: number) => void;
  userAnswers?: Record<string, string>;
  feedbackState?: Record<string, { isCorrect: boolean; showExplanation: boolean; selected: string }>;
  // Edit mode props
  onChangeBlocks?: (blocks: CourseBlock[]) => void;
  onChangeQuestions?: (questions: CourseQuestion[]) => void;
  onOpenAiAssistant?: () => void;
  onOpenAddQuestions?: () => void;
  themeId?: string;
}

export function getValidLessonQuestions(questions?: CourseQuestion[]): CourseQuestion[] {
  const seen = new Set<string>();
  const result: CourseQuestion[] = [];
  (questions || []).forEach((q, idx) => {
    if (!q || !q.question_text || !q.question_text.trim()) return;
    if (q.question_text === 'New practice question' || q.question_text === 'Statement based on the lesson') return;
    const effectiveId = q.id || `q_pos_${idx}`;
    if (!seen.has(effectiveId)) {
      seen.add(effectiveId);
      result.push({ ...q, id: effectiveId, points: q.points || 10 });
    }
  });
  return result;
}

export const CourseContentRenderer: React.FC<Props> = ({
  blocks = [],
  questions = [],
  mode = 'student',
  textScale = 'md',
  onQuestionAnswer,
  onCompleteLesson: _onCompleteLesson,
  onProgressChange,
  userAnswers = {},
  feedbackState = {},
  isStudentView: _isStudentView = true,
  onChangeBlocks,
  onChangeQuestions,
  onOpenAiAssistant,
  onOpenAddQuestions,
  themeId = 'midnight-navy'
}) => {
  const isEditMode = mode === 'edit';
  const activeTheme = getThemePreset(themeId);

  // Unique canonical questions strictly belonging to this lesson instance
  const validQuestions = React.useMemo(() => getValidLessonQuestions(questions), [questions]);

  const validQuestionIdSet = React.useMemo(() => new Set(validQuestions.map(q => q.id)), [validQuestions]);

  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
  const [localFeedback, setLocalFeedback] = useState<Record<string, { isCorrect: boolean; showExplanation: boolean; selected: string }>>({});
  const [studentResponses, setStudentResponses] = useState<Record<string, StudentQuestionResponse>>({});
  const [soundEnabled, setSoundEnabled] = useState<boolean>(courseAudio.isSoundEnabled());
  const [showAddSectionMenu, setShowAddSectionMenu] = useState<boolean>(false);
  const [transcriptValidationBlockIdx, setTranscriptValidationBlockIdx] = useState<number | null>(null);

  // Sync external answers if component updates, filtering strictly to valid questions
  useEffect(() => {
    if (userAnswers && Object.keys(userAnswers).length > 0) {
      setLocalAnswers(prev => {
        const next = { ...prev };
        Object.entries(userAnswers).forEach(([k, v]) => {
          if (validQuestionIdSet.has(k)) next[k] = v;
        });
        return next;
      });
    }
  }, [userAnswers, validQuestionIdSet]);

  useEffect(() => {
    if (feedbackState && Object.keys(feedbackState).length > 0) {
      setLocalFeedback(prev => {
        const next = { ...prev };
        Object.entries(feedbackState).forEach(([k, v]) => {
          if (validQuestionIdSet.has(k)) next[k] = v;
        });
        return next;
      });
    }
  }, [feedbackState, validQuestionIdSet]);

  // Prune any stale responses when validQuestions changes
  useEffect(() => {
    setLocalAnswers(prev => {
      const filtered: Record<string, string> = {};
      Object.entries(prev).forEach(([k, v]) => {
        if (validQuestionIdSet.has(k)) filtered[k] = v;
      });
      return filtered;
    });

    setLocalFeedback(prev => {
      const filtered: Record<string, { isCorrect: boolean; showExplanation: boolean; selected: string }> = {};
      Object.entries(prev).forEach(([k, v]) => {
        if (validQuestionIdSet.has(k)) filtered[k] = v;
      });
      return filtered;
    });

    setStudentResponses(prev => {
      const filtered: Record<string, StudentQuestionResponse> = {};
      Object.entries(prev).forEach(([k, v]) => {
        if (validQuestionIdSet.has(k)) filtered[k] = v;
      });
      return filtered;
    });
  }, [validQuestionIdSet]);

  // Seed studentResponses from userAnswers/feedbackState if present
  useEffect(() => {
    if (Object.keys(userAnswers || {}).length > 0 || Object.keys(feedbackState || {}).length > 0) {
      setStudentResponses(prev => {
        const next = { ...prev };
        validQuestions.forEach(q => {
          const qId = q.id;
          if (!qId) return;
          const ans = userAnswers[qId];
          const fb = feedbackState[qId];
          if ((ans || fb) && !next[qId]) {
            next[qId] = {
              questionId: qId,
              answer: ans || fb?.selected || '',
              status: fb ? (fb.isCorrect ? 'correct' : 'incorrect') : 'unanswered',
              score: fb?.isCorrect ? (q.points || 10) : 0,
              maxScore: q.points || 10,
              feedback: fb?.isCorrect ? 'Correct!' : 'Incorrect.'
            };
          }
        });
        return next;
      });
    }
  }, [userAnswers, feedbackState, validQuestions]);

  const handleStudentResponse = (res: StudentQuestionResponse, q: CourseQuestion) => {
    setStudentResponses(prev => ({
      ...prev,
      [res.questionId]: res
    }));

    setLocalAnswers(prev => ({ ...prev, [res.questionId]: typeof res.answer === 'string' ? res.answer : JSON.stringify(res.answer) }));
    setLocalFeedback(prev => ({
      ...prev,
      [res.questionId]: {
        isCorrect: res.status === 'correct',
        showExplanation: true,
        selected: typeof res.answer === 'string' ? res.answer : ''
      }
    }));

    if (onQuestionAnswer) {
      onQuestionAnswer(
        res.questionId,
        typeof res.answer === 'string' ? res.answer : JSON.stringify(res.answer),
        res.status === 'correct',
        res.score,
        q
      );
    }
  };

  const handleToggleSound = () => {
    const next = courseAudio.toggleSound();
    setSoundEnabled(next);
  };

  const getYouTubeEmbedUrl = (urlOrId: string) => {
    if (!urlOrId) return '';
    let videoId = urlOrId.trim();

    try {
      if (urlOrId.includes('youtube.com/shorts/')) {
        const parts = urlOrId.split('youtube.com/shorts/');
        videoId = parts[1]?.split('?')[0]?.split('/')[0] || '';
      } else if (urlOrId.includes('youtu.be/')) {
        const parts = urlOrId.split('youtu.be/');
        videoId = parts[1]?.split('?')[0]?.split('/')[0] || '';
      } else if (urlOrId.includes('youtube.com/watch')) {
        const urlObj = new URL(urlOrId);
        videoId = urlObj.searchParams.get('v') || '';
      }
    } catch {
      // fallback
    }

    return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1` : '';
  };

  // --------------------------------------------------------------------------
  // BLOCK EDIT HANDLERS (EDIT MODE)
  // --------------------------------------------------------------------------
  const updateBlockContent = (idx: number, newContent: any) => {
    if (!onChangeBlocks) return;
    const next = [...blocks];
    next[idx] = { ...next[idx], content: newContent };
    onChangeBlocks(next);
  };

  const moveBlock = (fromIdx: number, toIdx: number) => {
    if (!onChangeBlocks || toIdx < 0 || toIdx >= blocks.length) return;
    const next = [...blocks];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onChangeBlocks(next);
  };

  const duplicateBlock = (idx: number) => {
    if (!onChangeBlocks) return;
    const next = [...blocks];
    const cloned = JSON.parse(JSON.stringify(next[idx]));
    cloned.id = `block_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    next.splice(idx + 1, 0, cloned);
    onChangeBlocks(next);
  };

  const deleteBlock = (idx: number) => {
    if (!onChangeBlocks) return;
    const next = blocks.filter((_, i) => i !== idx);
    onChangeBlocks(next);
  };

  const handleAddSection = (type: BlockType) => {
    if (!onChangeBlocks) return;
    let content: any = { text: '' };
    if (type === 'text') {
      content = { title: '', text: 'Type lesson content here...' };
    } else if (type === 'heading') {
      content = { level: 'h2', text: 'Section Heading' };
    } else if (type === 'quote') {
      content = { quote: 'Inspiring key takeaway from this lesson...', author: 'Author' };
    } else if (type === 'callout') {
      content = { type: 'tip', title: '💡 Pro Tip', text: 'Important key point for students.' };
    } else if (type === 'divider') {
      content = {};
    } else if (type === 'audio') {
      content = { title: 'Lesson Narration', url: '' };
    } else if (type === 'image') {
      content = { url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80', caption: 'Story illustration' };
    } else if (type === 'video' || type === 'youtube_video' || type === 'text_video') {
      content = {
        title: 'Video Lesson Title',
        text: '',
        transcript: '',
        show_transcript: false,
        video: { url: '', position: 'above' }
      };
    } else if (type === 'objective') {
      content = {
        title: 'Learning Goal',
        text: 'Discover the main idea of this lesson through visuals and interactive practice.',
        outcomes: ['Understand key concepts', 'Practise new vocabulary']
      };
    } else if (type === 'illustration') {
      content = {
        title: 'Visual Guide',
        illustration_key: 'friendly_brain',
        caption: 'Look closely at how each part works together.',
        badges: ['Visual Concept', 'Easy Guide']
      };
    } else if (type === 'labelled_diagram') {
      content = {
        title: 'Interactive Diagram: Click Each Part',
        subtitle: 'Tap each label to discover what it does.',
        illustration_key: 'brain_anatomy'
      };
    } else if (type === 'icon_cards') {
      content = {
        title: 'Key Functions',
        subtitle: 'Tap any card to see an example!',
        cards: [
          { icon: '💡', title: 'Thinking', description: 'Helps you solve problems and make choices.', example: 'Answering a question in class.' },
          { icon: '📚', title: 'Remembering', description: 'Stores your favourite moments and facts.', example: 'Remembering your best friend’s name.' },
          { icon: '🏃', title: 'Moving', description: 'Sends fast messages to your muscles.', example: 'Running, jumping, and writing.' }
        ]
      };
    } else if (type === 'vocabulary_cards') {
      content = {
        title: 'Key Vocabulary Words',
        words: [
          { word: 'brain', partOfSpeech: 'noun', definition: 'The soft organ inside your head that controls your body and mind.', example: 'Your brain helps you think and learn.', icon: '🧠' },
          { word: 'memory', partOfSpeech: 'noun', definition: 'Your ability to keep and remember information.', example: 'I have a happy memory of my birthday.', icon: '📓' }
        ]
      };
    } else if (type === 'comparison') {
      content = {
        title: 'Compare & Contrast',
        left: { title: 'Short-Term Memory', subtitle: 'Quick Sticky Note', icon: '📝', points: ['Holds a few items at once', 'Lasts 15–30 seconds'] },
        right: { title: 'Long-Term Memory', subtitle: 'Big Notebook', icon: '📚', points: ['Stores important skills & facts', 'Can last for many years'] }
      };
    } else if (type === 'did_you_know') {
      content = {
        title: 'Did You Know?',
        question_prompt: 'Does your brain rest when you go to sleep?',
        text: 'No! While you sleep, your brain stays busy cleaning itself and saving everything you learned today!'
      };
    } else if (type === 'interactive_activity') {
      content = {
        activity_type: 'click_to_reveal',
        title: 'Quick Discovery: Tap to Check!',
        instruction: 'Tap each card below to see how it works.',
        items: [
          { icon: '🧩', label: 'Solving a puzzle', detail: 'Yes! Your cerebrum thinks through each piece.' },
          { icon: '🚲', label: 'Riding a bicycle', detail: 'Yes! Your cerebellum keeps your balance steady.' }
        ]
      };
    } else if (type === 'key_takeaway') {
      content = {
        title: 'Remember This!',
        points: [
          'Your brain is the command center of your body.',
          'Practice and good sleep make your brain stronger.'
        ]
      };
    } else if (type === 'course_completion') {
      content = {
        course_title: '🧠 AMAZING BRAIN',
        badge_title: 'Junior Brain Explorer'
      };
    }

    const newBlock: CourseBlock = {
      id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      episode_id: '',
      course_id: '',
      block_type: type,
      content,
      order_index: blocks.length
    };
    onChangeBlocks([...blocks, newBlock]);
    setShowAddSectionMenu(false);
  };

  // --------------------------------------------------------------------------
  // QUESTION EDIT HANDLERS (EDIT MODE)
  // --------------------------------------------------------------------------
  const handleUpdateQuestion = (qIndex: number, updated: CourseQuestion) => {
    if (!onChangeQuestions) return;
    const next = [...questions];
    next[qIndex] = updated;
    onChangeQuestions(next);
  };

  const handleDeleteQuestion = (qIndex: number) => {
    if (!onChangeQuestions) return;
    const next = questions.filter((_, i) => i !== qIndex);
    onChangeQuestions(next);
  };

  const handleDuplicateQuestion = (qIndex: number) => {
    if (!onChangeQuestions) return;
    const next = [...questions];
    const cloned: CourseQuestion = {
      ...JSON.parse(JSON.stringify(next[qIndex])),
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    };
    next.splice(qIndex + 1, 0, cloned);
    onChangeQuestions(next);
  };

  const handleMoveQuestion = (qIndex: number, dir: 'up' | 'down') => {
    if (!onChangeQuestions) return;
    const targetIdx = dir === 'up' ? qIndex - 1 : qIndex + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const next = [...questions];
    const [moved] = next.splice(qIndex, 1);
    next.splice(targetIdx, 0, moved);
    onChangeQuestions(next);
  };

  const handleAddQuestion = (type: QuestionType) => {
    if (!onChangeQuestions) return;
    let newQ: CourseQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      episode_id: '',
      course_id: '',
      difficulty: 'medium',
      question_type: type,
      question_text: 'What is the key takeaway from this lesson?',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_answer: 'A',
      points: 10,
      order_index: questions.length
    };

    if (type === 'true_false') {
      newQ.question_text = 'Statement based on the lesson:';
      newQ.options = ['True', 'False'];
      newQ.correct_answer = 'True';
    } else if (type === 'sentence_reordering') {
      newQ.question_text = 'Build the sentence in the correct order:';
      newQ.correct_answer = 'Sarah likes tea every day';
      newQ.options = ['Sarah', 'likes', 'tea', 'every', 'day'];
    } else if (type === 'fill_blank') {
      newQ.question_text = 'Fill in the blank with the correct term:';
      newQ.correct_answer = 'water';
    }

    onChangeQuestions([...questions, newQ]);
  };

  // Progress metrics computed STRICTLY against unique active questions in this lesson
  const totalQuestions = validQuestions.length;
  const totalPointsPossible = validQuestions.reduce((sum, q) => sum + (q.points || 10), 0);

  const answeredTotal = validQuestions.filter(q => {
    const resp = studentResponses[q.id];
    const ans = localAnswers[q.id];
    const fb = localFeedback[q.id];
    const hasResp = Boolean(
      resp &&
      resp.status !== 'unanswered' &&
      (Array.isArray(resp.answer) ? resp.answer.length > 0 : String(resp.answer ?? '').trim().length > 0)
    );
    const hasAns = typeof ans === 'string' ? ans.trim().length > 0 : Boolean(ans);
    return hasResp || hasAns || Boolean(fb);
  }).length;

  useEffect(() => {
    onProgressChange?.(answeredTotal, totalQuestions);
  }, [answeredTotal, totalQuestions, onProgressChange]);

  const correctTotal = validQuestions.filter(q => {
    const resp = studentResponses[q.id];
    if (resp && resp.status === 'correct') return true;
    return Boolean(localFeedback[q.id]?.isCorrect);
  }).length;

  const incorrectTotal = validQuestions.filter(q => {
    const resp = studentResponses[q.id];
    if (resp && resp.status === 'incorrect') return true;
    const fb = localFeedback[q.id];
    if (fb && !fb.isCorrect) return true;
    const ans = localAnswers[q.id];
    return Boolean(ans && fb && !fb.isCorrect);
  }).length;

  const earnedPoints = Math.min(
    totalPointsPossible,
    validQuestions.reduce((sum, q) => {
      const resp = studentResponses[q.id];
      if (resp && typeof resp.score === 'number') {
        return sum + Math.max(0, resp.score);
      }
      const fb = localFeedback[q.id];
      return sum + (fb?.isCorrect ? (q.points || 10) : 0);
    }, 0)
  );

  const isAllAnswered = totalQuestions > 0 && answeredTotal >= totalQuestions;

  return (
    <div className="w-full max-w-[760px] mx-auto space-y-8 sm:space-y-12 py-2 antialiased font-sans text-inherit box-border min-w-0">
      
      {/* ===================================================================== */}
      {/* 1. LESSON CONTENT STREAM                                              */}
      {/* ===================================================================== */}
      <div className="w-full space-y-6 sm:space-y-8">
        {blocks.map((block, idx) => {
          if (!isEditMode && isExcludedStudentSection(block)) {
            return null;
          }
          const { block_type, content } = block;

          // Block Toolbar wrapper for Edit Mode
          const renderBlockWrapper = (children: React.ReactNode) => {
            if (!isEditMode) return children;

            return (
              <div
                key={block.id || idx}
                className="relative group p-4 sm:p-5 rounded-2xl border border-[var(--theme-border-subtle)] hover:border-[#026fc3]/50 bg-white/40 dark:bg-black/20 transition-all space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-theme-muted pb-2 border-b border-current/10">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-theme-accent">
                    <span className="w-2 h-2 rounded-full bg-[#026fc3]" />
                    <span>{block.block_type.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveBlock(idx, idx - 1)}
                      title="Move Section Up"
                      className="p-1 hover:text-theme-primary disabled:opacity-20 cursor-pointer rounded"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === blocks.length - 1}
                      onClick={() => moveBlock(idx, idx + 1)}
                      title="Move Section Down"
                      className="p-1 hover:text-theme-primary disabled:opacity-20 cursor-pointer rounded"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateBlock(idx)}
                      title="Duplicate Section"
                      className="p-1 hover:text-[#026fc3] cursor-pointer rounded"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteBlock(idx)}
                      title="Delete Section"
                      className="p-1 hover:text-rose-500 cursor-pointer rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {children}
              </div>
            );
          };

          // A. PURE TEXT SECTION
          if (block_type === 'text' && !(content as any)?.image?.url && !(content as any)?.video?.url) {
            const textContent = content as any;
            const bodyText = textContent?.text || textContent?.markdown || '';

            if (isEditMode) {
              return renderBlockWrapper(
                <div className="space-y-3">
                  <input
                    type="text"
                    value={textContent.title || ''}
                    onChange={e => updateBlockContent(idx, { ...textContent, title: e.target.value })}
                    placeholder="Section Title (optional)"
                    className="w-full text-base font-bold bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:border-[#026fc3] focus:outline-none pb-1"
                  />
                  <CanvaInlineTextEditor
                    value={bodyText}
                    onChange={newText => updateBlockContent(idx, { ...textContent, text: newText })}
                    placeholder="Type or format your lesson content..."
                    surfaceBgColor={activeTheme.cardBgHex || '#ffffff'}
                  />
                </div>
              );
            }

            if (!bodyText.trim() && !textContent?.title) return null;

            return (
              <section key={block.id || idx} className="w-full space-y-2">
                {textContent?.title && (
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-inherit pt-2 pb-1 border-b border-current/10 opacity-90 text-left reader-h2">
                    {textContent.title}
                  </h3>
                )}
                <FormattedLessonText text={bodyText} textScale={textScale} />
              </section>
            );
          }

          // B. COMBINED TEXT + IMAGE SECTION
          if (block_type === 'text_image' || (block_type === 'text' && (content as any)?.image?.url)) {
            const item = content as any;
            const img = item.image || {};
            const bodyText = item.text || item.markdown || '';

            if (isEditMode) {
              return renderBlockWrapper(
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={img.url || ''}
                      onChange={e => updateBlockContent(idx, { ...item, image: { ...img, url: e.target.value } })}
                      placeholder="Image URL..."
                      className="w-full p-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-stone-900"
                    />
                    <input
                      type="text"
                      value={img.caption || ''}
                      onChange={e => updateBlockContent(idx, { ...item, image: { ...img, caption: e.target.value } })}
                      placeholder="Image Caption..."
                      className="w-full p-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-stone-900"
                    />
                  </div>
                  {img.url && (
                    <div className="w-full max-h-60 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img src={img.url} alt={img.caption || ''} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CanvaInlineTextEditor
                    value={bodyText}
                    onChange={newText => updateBlockContent(idx, { ...item, text: newText })}
                    placeholder="Accompanying explanation text..."
                    surfaceBgColor={activeTheme.cardBgHex || '#ffffff'}
                  />
                </div>
              );
            }

            const renderImageFigure = (extraClasses = '') => (
              <figure className={`w-full my-3 sm:my-5 ${extraClasses}`}>
                <div className="w-full rounded-2xl overflow-hidden bg-sky-50/40 dark:bg-slate-800 shadow-2xs border border-sky-100 dark:border-slate-700">
                  <img
                    src={img.url}
                    alt={img.alt || img.caption || 'Story illustration'}
                    className="w-full h-auto object-cover max-h-[480px] block"
                    loading="lazy"
                  />
                </div>
                {img.caption && (
                  <figcaption className="text-xs text-center mt-2 italic opacity-75 leading-relaxed font-serif reader-caption">
                    {img.caption}
                  </figcaption>
                )}
              </figure>
            );

            return (
              <section key={block.id || idx} className="w-full space-y-4 clear-both">
                {item.title && (
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-inherit pt-2 pb-1 border-b border-current/10 opacity-90 text-left reader-h2">
                    {item.title}
                  </h3>
                )}
                {renderImageFigure('max-w-[800px] mx-auto')}
                <FormattedLessonText text={bodyText} textScale={textScale} />
              </section>
            );
          }

          // C. COMBINED TEXT + VIDEO / STANDALONE VIDEO SECTION (16:9 RESPONSIVE)
          if (
            block_type === 'text_video' ||
            block_type === 'video' ||
            block_type === 'youtube_video' ||
            (block_type === 'text' && (content as any)?.video?.url)
          ) {
            const item = content as any;
            const vidUrl = item.video?.url || item.url || item.video_id || '';
            const vidTitle = item.title || 'Video Lesson';
            const vidTranscript = getCanonicalBlockTranscript(item);
            const showTranscriptToStudents = Boolean(item.show_transcript || item.video?.show_transcript);
            const bodyText = item.text || item.markdown || '';
            const embedUrl = getYouTubeEmbedUrl(vidUrl);

            if (isEditMode) {
              return renderBlockWrapper(
                <div className="space-y-3.5 p-3.5 rounded-2xl bg-white/95 dark:bg-stone-900/90 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  {/* Video Title */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                      Video Lesson Title:
                    </label>
                    <input
                      type="text"
                      data-color-scheme="light"
                      value={item.title || ''}
                      onChange={e => updateBlockContent(idx, { ...item, title: e.target.value })}
                      placeholder="e.g. Understanding the Present Perfect Tense"
                      style={{
                        backgroundColor: '#FFFFFF',
                        color: '#172033',
                        WebkitTextFillColor: '#172033',
                        caretColor: '#172033',
                        borderColor: '#CBD5E1',
                        opacity: 1
                      }}
                      className="edtechra-light-input w-full p-2.5 text-xs font-bold rounded-xl border border-[#CBD5E1] bg-white text-[#172033] focus:outline-none focus:border-[#026fc3] placeholder:text-[#64748B]"
                    />
                  </div>

                  {/* Video URL */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                      Video URL:
                    </label>
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-sky-500 shrink-0" />
                      <input
                        type="text"
                        data-color-scheme="light"
                        value={vidUrl}
                        onChange={e => {
                          const nextUrl = e.target.value;
                          if (item.video) {
                            updateBlockContent(idx, { ...item, video: { ...item.video, url: nextUrl } });
                          } else {
                            updateBlockContent(idx, { ...item, url: nextUrl });
                          }
                        }}
                        placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)"
                        style={{
                          backgroundColor: '#FFFFFF',
                          color: '#172033',
                          WebkitTextFillColor: '#172033',
                          caretColor: '#172033',
                          borderColor: '#CBD5E1',
                          opacity: 1
                        }}
                        className="edtechra-light-input flex-1 p-2 text-xs font-medium rounded-lg border border-[#CBD5E1] bg-white text-[#172033] focus:outline-none focus:border-[#026fc3] placeholder:text-[#64748B]"
                      />
                    </div>
                  </div>

                  {/* 16:9 Responsive Video Preview */}
                  {embedUrl ? (
                    <div className="video-container shadow-md rounded-2xl overflow-hidden aspect-video w-full">
                      <iframe
                        src={embedUrl}
                        title={vidTitle}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-video rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Enter a valid YouTube URL to preview 16:9 video
                    </div>
                  )}

                  {/* Video Transcript (Canonical Single Source of Truth) */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Video Transcript (Used to generate practice questions):</span>
                      </label>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {vidTranscript.length} characters
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      data-color-scheme="light"
                      value={vidTranscript}
                      onChange={e => {
                        const newTr = e.target.value;
                        if (transcriptValidationBlockIdx === idx && newTr.trim().length > 0) {
                          setTranscriptValidationBlockIdx(null);
                        }
                        updateBlockContent(
                          idx,
                          setCanonicalBlockTranscript(
                            {
                              ...item,
                              video: item.video ? { ...item.video } : (vidUrl ? { url: vidUrl } : undefined)
                            },
                            newTr
                          )
                        );
                      }}
                      placeholder="Paste the video transcript here. EdTechra will use the transcript to create practice questions based on the actual lesson content."
                      style={{
                        backgroundColor: '#FFFFFF',
                        color: '#172033',
                        WebkitTextFillColor: '#172033',
                        caretColor: '#172033',
                        borderColor: '#CBD5E1',
                        opacity: 1
                      }}
                      className="edtechra-video-transcript-textarea w-full p-3 text-xs sm:text-sm font-mono leading-relaxed rounded-xl border border-[#CBD5E1] bg-white text-[#172033] focus:outline-none focus:border-[#026fc3] placeholder:text-[#64748B]"
                    />

                    {(transcriptValidationBlockIdx === idx && !vidTranscript.trim()) && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold leading-relaxed">
                        Please enter or restore the video transcript before generating practice questions. EdTechra requires the transcript to create questions based on this lesson.
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={showTranscriptToStudents}
                          onChange={e => updateBlockContent(idx, { ...item, show_transcript: e.target.checked })}
                          className="w-3.5 h-3.5 rounded text-[#026fc3]"
                        />
                        <span>Show transcript to students (hidden by default)</span>
                      </label>

                      {onOpenAddQuestions && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!vidTranscript.trim()) {
                              setTranscriptValidationBlockIdx(idx);
                            } else {
                              setTranscriptValidationBlockIdx(null);
                            }
                            onOpenAddQuestions();
                          }}
                          title={!vidTranscript.trim() ? 'Paste video transcript first' : 'Generate questions from transcript'}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Generate Practice Questions</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {bodyText !== undefined && (
                    <div className="pt-1">
                      <CanvaInlineTextEditor
                        value={bodyText}
                        onChange={newText => updateBlockContent(idx, { ...item, text: newText })}
                        placeholder="Notes or prompt for students watching this video..."
                        surfaceBgColor={activeTheme.cardBgHex || '#ffffff'}
                      />
                    </div>
                  )}
                </div>
              );
            }

            // Student view: never render the private transcript unless the teacher
            // opted in. Also suppress "notes" text that is just a pasted transcript copy.
            const normCmp = (s: string) =>
              String(s || '').toLowerCase().replace(/[#*_>`~\-]+/g, ' ').replace(/\s+/g, ' ').trim();
            const nTr = normCmp(vidTranscript);
            const nBody = normCmp(bodyText);
            const bodyDuplicatesTranscript =
              nTr.length >= 30 && nBody.length >= 30 && (nBody === nTr || nTr.includes(nBody) || nBody.includes(nTr));
            const studentBodyText = !showTranscriptToStudents && bodyDuplicatesTranscript ? '' : bodyText;

            return (
              <figure key={block.id || idx} className="w-full my-3 sm:my-6 space-y-2 sm:space-y-3">
                {vidTitle && (
                  <h3 className="text-base sm:text-lg font-black text-theme-primary reader-h2 leading-snug">
                    {vidTitle}
                  </h3>
                )}
                {embedUrl && (
                  <div className="video-container course-video-bleed sm:shadow-md">
                    <iframe
                      src={embedUrl}
                      title={vidTitle}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                {studentBodyText && <FormattedLessonText text={studentBodyText} textScale={textScale} />}
                {showTranscriptToStudents && vidTranscript && (
                  <details className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs mt-2 text-[#172033]">
                    <summary className="font-bold text-[#172033] cursor-pointer select-none">
                      View Video Transcript
                    </summary>
                    <p className="mt-2 text-xs leading-relaxed whitespace-pre-wrap text-[#334155] font-mono">
                      {vidTranscript}
                    </p>
                  </details>
                )}
              </figure>
            );
          }

          // D. STANDALONE IMAGE SECTION
          if (block_type === 'image') {
            const imgContent = content as any;

            if (isEditMode) {
              return renderBlockWrapper(
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={imgContent.url || ''}
                      onChange={e => updateBlockContent(idx, { ...imgContent, url: e.target.value })}
                      placeholder="Image URL..."
                      className="w-full p-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-stone-900"
                    />
                    <input
                      type="text"
                      value={imgContent.caption || ''}
                      onChange={e => updateBlockContent(idx, { ...imgContent, caption: e.target.value })}
                      placeholder="Caption..."
                      className="w-full p-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-stone-900"
                    />
                  </div>
                  {imgContent.url && (
                    <div className="w-full max-h-64 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img src={imgContent.url} alt={imgContent.caption || ''} className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
              );
            }

            if (!imgContent?.url) return null;

            return (
              <figure key={block.id || idx} className="w-full my-6 sm:my-8 overflow-hidden text-center">
                <div className="w-full rounded-2xl overflow-hidden bg-sky-50/40 dark:bg-slate-800 shadow-2xs max-w-2xl mx-auto border border-sky-100 dark:border-slate-700">
                  <img
                    src={imgContent.url}
                    alt={imgContent.alt || imgContent.caption || 'Course visual material'}
                    className="w-full h-auto object-contain max-h-[500px] block mx-auto"
                    loading="lazy"
                  />
                </div>
                {imgContent.caption && (
                  <figcaption className="text-xs text-center mt-2 italic opacity-75 font-serif reader-caption">
                    {imgContent.caption}
                  </figcaption>
                )}
              </figure>
            );
          }

          // E. STANDALONE EDITORIAL HEADING
          if (block_type === 'heading') {
            const h = content as any;
            const level = h.level || 'h2';
            const headingText = h.text || h.title || '';

            if (isEditMode) {
              return renderBlockWrapper(
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 text-xs font-bold">
                      {(['h1', 'h2', 'h3'] as const).map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => updateBlockContent(idx, { ...h, level: lvl })}
                          className={`px-2 py-0.5 rounded ${level === lvl ? 'bg-[#026fc3] text-white' : 'text-slate-600 dark:text-slate-400'}`}
                        >
                          {lvl.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={headingText}
                      onChange={e => updateBlockContent(idx, { ...h, text: e.target.value })}
                      placeholder="Heading Text..."
                      className="flex-1 p-2 text-base sm:text-lg font-black bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:border-[#026fc3] focus:outline-none"
                    />
                  </div>
                </div>
              );
            }

            if (!headingText.trim()) return null;

            if (level === 'h1') {
              return (
                <h1 key={block.id || idx} className="text-2xl sm:text-3xl font-extrabold tracking-tight text-inherit pt-6 pb-2 text-left reader-h1">
                  {headingText}
                </h1>
              );
            }
            if (level === 'h3') {
              return (
                <h3 key={block.id || idx} className="text-base sm:text-lg font-bold tracking-tight text-inherit pt-3 pb-1 text-left reader-h3">
                  {headingText}
                </h3>
              );
            }
            return (
              <h2 key={block.id || idx} className="text-xl sm:text-2xl font-bold tracking-tight text-inherit pt-4 pb-1.5 text-left reader-h2">
                {headingText}
              </h2>
            );
          }

          // F. INSPIRATIONAL OR EDITORIAL QUOTE
          if (block_type === 'quote') {
            const q = content as any;
            const quoteText = q.text || q.quote || '';
            const author = q.author || q.source || '';

            if (isEditMode) {
              return renderBlockWrapper(
                <div className="space-y-2">
                  <textarea
                    value={quoteText}
                    onChange={e => updateBlockContent(idx, { ...q, quote: e.target.value, text: e.target.value })}
                    placeholder="Quote text..."
                    rows={2}
                    className="w-full p-2.5 text-sm font-serif italic rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-stone-900"
                  />
                  <input
                    type="text"
                    value={author}
                    onChange={e => updateBlockContent(idx, { ...q, author: e.target.value })}
                    placeholder="Author or Speaker (optional)"
                    className="w-full p-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-stone-900"
                  />
                </div>
              );
            }

            if (!quoteText.trim()) return null;

            return (
              <figure key={block.id || idx} className="w-full my-5 sm:my-7 p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface-subtle)] border-l-4 border-l-[var(--theme-accent)] text-inherit space-y-2">
                <blockquote className="text-sm sm:text-base font-serif italic leading-relaxed opacity-95">
                  “{quoteText}”
                </blockquote>
                {author && (
                  <figcaption className="text-xs font-bold text-theme-accent tracking-wide text-right">
                    — {author}
                  </figcaption>
                )}
              </figure>
            );
          }

          // G. CALLOUT / INFO BOX
          if (block_type === 'callout') {
            const callout = content as any;
            const variant = callout.variant || callout.type || 'tip';
            const title = callout.title || (variant === 'tip' ? '💡 Tip' : variant === 'warning' ? '⚠️ Warning' : variant === 'important' ? '⭐ Important' : '📌 Note');
            const calloutText = callout.text || callout.message || '';

            if (isEditMode) {
              return renderBlockWrapper(
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={variant}
                      onChange={e => updateBlockContent(idx, { ...callout, variant: e.target.value, type: e.target.value })}
                      className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold bg-white dark:bg-stone-900"
                    >
                      <option value="tip">💡 Tip</option>
                      <option value="important">⭐ Important</option>
                      <option value="warning">⚠️ Warning</option>
                      <option value="note">📌 Note</option>
                    </select>
                    <input
                      type="text"
                      value={title}
                      onChange={e => updateBlockContent(idx, { ...callout, title: e.target.value })}
                      placeholder="Callout Title..."
                      className="flex-1 p-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-stone-900"
                    />
                  </div>
                  <textarea
                    value={calloutText}
                    onChange={e => updateBlockContent(idx, { ...callout, text: e.target.value, message: e.target.value })}
                    placeholder="Callout message..."
                    rows={2}
                    className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-stone-900"
                  />
                </div>
              );
            }

            let borderStyle = activeTheme.isDark
              ? 'border-sky-800 bg-sky-950/30 text-sky-100'
              : 'border-sky-300 bg-sky-50/80 text-sky-950';
            if (variant === 'warning') {
              borderStyle = activeTheme.isDark
                ? 'border-amber-800 bg-amber-950/30 text-amber-100'
                : 'border-amber-300 bg-amber-50/80 text-amber-950';
            }
            if (variant === 'important') {
              borderStyle = activeTheme.isDark
                ? 'border-indigo-800 bg-indigo-950/30 text-indigo-100'
                : 'border-indigo-300 bg-indigo-50/80 text-indigo-950';
            }

            return (
              <div key={block.id || idx} className={`w-full my-4 sm:my-6 p-4 sm:p-5 rounded-2xl border ${borderStyle} space-y-1.5 shadow-2xs`}>
                <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span>{title}</span>
                </div>
                <div className="text-xs sm:text-sm leading-relaxed">
                  <FormattedLessonText text={calloutText} textScale={textScale} />
                </div>
              </div>
            );
          }

          // H. EDITORIAL DIVIDER
          if (block_type === 'divider') {
            if (isEditMode) {
              return renderBlockWrapper(
                <div className="w-full flex items-center justify-center gap-3 my-2 opacity-60">
                  <span className="w-16 h-px bg-current" />
                  <span className="text-xs text-theme-accent">✦ Decorative Divider</span>
                  <span className="w-16 h-px bg-current" />
                </div>
              );
            }

            return (
              <div key={block.id || idx} className="w-full flex items-center justify-center gap-3 my-6 sm:my-8 opacity-40 select-none">
                <span className="w-16 h-px bg-current" />
                <span className="text-xs text-theme-accent">✦</span>
                <span className="w-16 h-px bg-current" />
              </div>
            );
          }

          // I. AUDIO PLAYER
          if (block_type === 'audio') {
            const audio = content as any;
            const audioUrl = audio.url || '';
            const title = audio.title || 'Audio Narration';

            if (isEditMode) {
              return renderBlockWrapper(
                <div className="space-y-2">
                  <input
                    type="text"
                    value={title}
                    onChange={e => updateBlockContent(idx, { ...audio, title: e.target.value })}
                    placeholder="Audio Title..."
                    className="w-full p-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-stone-900"
                  />
                  <input
                    type="text"
                    value={audioUrl}
                    onChange={e => updateBlockContent(idx, { ...audio, url: e.target.value })}
                    placeholder="Audio Source URL (MP3)..."
                    className="w-full p-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-stone-900"
                  />
                </div>
              );
            }

            return (
              <div key={block.id || idx} className="w-full my-4 sm:my-6 p-4 rounded-2xl bg-[var(--theme-surface-subtle)] border border-[var(--theme-border-primary)] flex items-center gap-4 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-[var(--theme-accent)] text-[var(--theme-accent-contrast)] flex items-center justify-center shrink-0 shadow-xs">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-theme-primary truncate">{title}</p>
                  {audioUrl ? (
                    <audio controls className="w-full h-8 mt-1.5 rounded-lg" src={audioUrl}>
                      Your browser does not support audio playback.
                    </audio>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No audio source configured</span>
                  )}
                </div>
              </div>
            );
          }

          // J. COURSE STUDIO 2.0 INTERACTIVE & VISUAL BLOCKS
          const updateInteractiveBlock = (updates: Record<string, any>) => {
            updateBlockContent(idx, { ...(content as any), ...updates });
          };

          if (block_type === 'objective') {
            return renderBlockWrapper(
              <ObjectiveBannerBlock
                block={block}
                isEditMode={isEditMode}
                onUpdateContent={updateInteractiveBlock}
              />
            );
          }

          if (block_type === 'illustration') {
            return renderBlockWrapper(
              <IllustrationBlock
                block={block}
                isEditMode={isEditMode}
                onUpdateContent={updateInteractiveBlock}
              />
            );
          }

          if (block_type === 'labelled_diagram') {
            return renderBlockWrapper(
              <LabelledDiagramBlock
                block={block}
                isEditMode={isEditMode}
                onUpdateContent={updateInteractiveBlock}
              />
            );
          }

          if (block_type === 'icon_cards') {
            return renderBlockWrapper(
              <IconCardsGridBlock
                block={block}
                isEditMode={isEditMode}
                onUpdateContent={updateInteractiveBlock}
              />
            );
          }

          if (block_type === 'vocabulary_cards') {
            return renderBlockWrapper(
              <VocabularyCardsBlock
                block={block}
                isEditMode={isEditMode}
                onUpdateContent={updateInteractiveBlock}
              />
            );
          }

          if (block_type === 'comparison') {
            return renderBlockWrapper(
              <ComparisonBlock
                block={block}
                isEditMode={isEditMode}
                onUpdateContent={updateInteractiveBlock}
              />
            );
          }

          if (block_type === 'did_you_know') {
            return renderBlockWrapper(
              <DidYouKnowBlock
                block={block}
                isEditMode={isEditMode}
                onUpdateContent={updateInteractiveBlock}
              />
            );
          }

          if (block_type === 'interactive_activity') {
            return renderBlockWrapper(
              <InteractiveActivityBlock
                block={block}
                isEditMode={isEditMode}
                onUpdateContent={updateInteractiveBlock}
              />
            );
          }

          if (block_type === 'key_takeaway') {
            return renderBlockWrapper(
              <KeyTakeawayBlock
                block={block}
                isEditMode={isEditMode}
                onUpdateContent={updateInteractiveBlock}
              />
            );
          }

          if (block_type === 'course_completion') {
            return renderBlockWrapper(
              <CourseCompletionBlock
                block={block}
                isEditMode={isEditMode}
                onUpdateContent={updateInteractiveBlock}
                courseScore={{ earned: earnedPoints, max: totalPointsPossible }}
              />
            );
          }

          return null;
        })}

        {/* IN EDIT MODE: ADD SECTION ACTION DROPDOWN */}
        {isEditMode && (
          <div className="relative pt-4 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setShowAddSectionMenu(!showAddSectionMenu)}
              className="px-4 py-2.5 rounded-2xl border-2 border-dashed border-[#026fc3] text-[#026fc3] hover:bg-[#026fc3]/10 text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Content Section</span>
            </button>

            {showAddSectionMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowAddSectionMenu(false)}
                />
                <div
                  role="menu"
                  aria-label="Add Content Section Menu"
                  className="absolute top-16 z-30 w-80 max-w-[92vw] p-2.5 rounded-2xl shadow-2xl border space-y-1 animate-in fade-in zoom-in-95 duration-150"
                  style={{
                    backgroundColor: '#0B2340',
                    borderColor: '#315579',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  <div className="px-3 py-1.5 border-b border-[#315579] mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#38BDF8]">
                      Add Content Section
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddSection('heading')}
                    className="w-full p-2 rounded-xl text-left hover:bg-[#174A75] active:bg-[#1769AA] flex items-center gap-2.5 cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                  >
                    <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                      <Heading className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white leading-tight">Heading Title</div>
                      <div className="text-[10px] text-[#DCE8F5] leading-tight">Major chapter or section break</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection('text')}
                    className="w-full p-2 rounded-xl text-left hover:bg-[#174A75] active:bg-[#1769AA] flex items-center gap-2.5 cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white leading-tight">Paragraph Text</div>
                      <div className="text-[10px] text-[#DCE8F5] leading-tight">Rich editorial text block</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection('video')}
                    className="w-full p-2 rounded-xl text-left hover:bg-[#174A75] active:bg-[#1769AA] flex items-center gap-2.5 cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                      <Video className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white leading-tight">Video Lesson (16:9)</div>
                      <div className="text-[10px] text-[#DCE8F5] leading-tight">YouTube or direct video player</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection('image')}
                    className="w-full p-2 rounded-xl text-left hover:bg-[#174A75] active:bg-[#1769AA] flex items-center gap-2.5 cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white leading-tight">Visual Image</div>
                      <div className="text-[10px] text-[#DCE8F5] leading-tight">Standalone image with caption</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection('callout')}
                    className="w-full p-2 rounded-xl text-left hover:bg-[#174A75] active:bg-[#1769AA] flex items-center gap-2.5 cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white leading-tight">Callout / Tip Box</div>
                      <div className="text-[10px] text-[#DCE8F5] leading-tight">Highlighted key takeaways & tips</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection('quote')}
                    className="w-full p-2 rounded-xl text-left hover:bg-[#174A75] active:bg-[#1769AA] flex items-center gap-2.5 cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <Quote className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white leading-tight">Inspirational Quote</div>
                      <div className="text-[10px] text-[#DCE8F5] leading-tight">Featured quotation with author</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection('divider')}
                    className="w-full p-2 rounded-xl text-left hover:bg-[#174A75] active:bg-[#1769AA] flex items-center gap-2.5 cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-500/20 text-slate-300 flex items-center justify-center shrink-0">
                      <Minus className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white leading-tight">Decorative Divider</div>
                      <div className="text-[10px] text-[#DCE8F5] leading-tight">Subtle visual break between topics</div>
                    </div>
                  </button>

                  <div className="px-3 py-1.5 border-t border-b border-[#315579] my-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                      Interactive Studio 2.0 Blocks
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddSection('labelled_diagram')}
                    className="w-full p-2 rounded-xl text-left hover:bg-[#174A75] flex items-center gap-2.5 cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/25 text-indigo-300 flex items-center justify-center shrink-0 text-sm">
                      🧠
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white leading-tight">Interactive Labelled Diagram</div>
                      <div className="text-[10px] text-[#DCE8F5] leading-tight">Click-to-inspect visual parts</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection('icon_cards')}
                    className="w-full p-2 rounded-xl text-left hover:bg-[#174A75] flex items-center gap-2.5 cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/25 text-emerald-300 flex items-center justify-center shrink-0 text-sm">
                      🃏
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white leading-tight">Visual Icon Cards Grid</div>
                      <div className="text-[10px] text-[#DCE8F5] leading-tight">Micro-learning cards with examples</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection('vocabulary_cards')}
                    className="w-full p-2 rounded-xl text-left hover:bg-[#174A75] flex items-center gap-2.5 cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-500/25 text-amber-300 flex items-center justify-center shrink-0 text-sm">
                      🗣️
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white leading-tight">Vocabulary &amp; Audio Cards</div>
                      <div className="text-[10px] text-[#DCE8F5] leading-tight">Pronunciation + quick word practice</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection('interactive_activity')}
                    className="w-full p-2 rounded-xl text-left hover:bg-[#174A75] flex items-center gap-2.5 cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-teal-500/25 text-teal-300 flex items-center justify-center shrink-0 text-sm">
                      🎮
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white leading-tight">Interactive Discovery Activity</div>
                      <div className="text-[10px] text-[#DCE8F5] leading-tight">Tap-to-reveal or memory challenge</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection('comparison')}
                    className="w-full p-2 rounded-xl text-left hover:bg-[#174A75] flex items-center gap-2.5 cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-violet-500/25 text-violet-300 flex items-center justify-center shrink-0 text-sm">
                      ⚖️
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white leading-tight">Comparison Card</div>
                      <div className="text-[10px] text-[#DCE8F5] leading-tight">Side-by-side concept comparison</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection('key_takeaway')}
                    className="w-full p-2 rounded-xl text-left hover:bg-[#174A75] flex items-center gap-2.5 cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-sky-500/25 text-sky-300 flex items-center justify-center shrink-0 text-sm">
                      ⭐
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white leading-tight">Key Takeaway Summary</div>
                      <div className="text-[10px] text-[#DCE8F5] leading-tight">“Remember This” lesson recap</div>
                    </div>
                  </button>

                  {onOpenAiAssistant && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddSectionMenu(false);
                        onOpenAiAssistant();
                      }}
                      className="w-full p-2.5 rounded-xl text-left flex items-center gap-2.5 cursor-pointer transition-all border border-[#38BDF8]/40 hover:border-[#38BDF8] mt-1 shadow-xs"
                      style={{
                        background: 'linear-gradient(135deg, rgba(23, 74, 117, 0.8) 0%, rgba(23, 105, 170, 0.5) 100%)'
                      }}
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-black text-[#38BDF8] leading-tight">✨ Generate Section with AI</div>
                        <div className="text-[10px] text-[#DCE8F5] leading-tight">Draft an entire section automatically</div>
                      </div>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 2. PRACTICE QUESTIONS STREAM                                          */}
      {/* ===================================================================== */}
      {(validQuestions.length > 0 || isEditMode) && (
        <section className="w-full pt-5 sm:pt-8 border-t border-[var(--theme-border-subtle)] space-y-4 sm:space-y-6">
          
          {/* Practice Header: Mode Switch Aware (panel only in edit mode; light row for students) */}
          <div className={isEditMode
            ? 'surface-card rounded-2xl p-3.5 sm:p-4.5 space-y-2.5 border border-[var(--theme-border-subtle)] shadow-xs'
            : 'space-y-2'}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--theme-accent-soft)] text-theme-accent text-[10px] sm:text-[11px] font-black uppercase tracking-wider reader-badge">
                  <Sparkles className="w-3 h-3 text-theme-accent" />
                  <span>{isEditMode ? 'Practice Authoring' : 'Practice'}</span>
                </span>
                <span className="text-xs sm:text-sm font-bold text-theme-secondary reader-meta">
                  {isEditMode
                    ? `${questions.length} Question${questions.length !== 1 ? 's' : ''} in Lesson`
                    : `${answeredTotal} of ${validQuestions.length} completed`}
                </span>
              </div>

              {!isEditMode && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xs sm:text-sm font-black text-theme-accent font-mono reader-meta">
                    {validQuestions.length > 0 ? Math.round((answeredTotal / validQuestions.length) * 100) : 0}%
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full bg-amber-500/15 ${
                      activeTheme.isDark ? 'text-amber-300' : 'text-amber-900'
                    } text-[10px] sm:text-[11px] font-black border border-amber-400/30 flex items-center gap-1 reader-badge`}
                  >
                    <Award className={`w-3 h-3 ${activeTheme.isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    <span>{earnedPoints} / {totalPointsPossible} XP</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleSound}
                    className="p-1 rounded-lg hover:bg-[var(--theme-surface-interactive-hover)] text-theme-secondary transition-all cursor-pointer"
                    title="Toggle Sound Effects"
                  >
                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-theme-accent" /> : <VolumeX className="w-3.5 h-3.5 opacity-60" />}
                  </button>
                </div>
              )}
            </div>

            {/* Slim Progress Track in Student Mode */}
            {!isEditMode && validQuestions.length > 0 && (
              <div className="w-full h-1.5 bg-[var(--theme-surface-subtle)] rounded-full overflow-hidden border border-[var(--theme-border-subtle)]">
                <div
                  className="h-full bg-linear-to-r from-[#026fc3] via-[#0284c7] to-[#38bdf8] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(answeredTotal / validQuestions.length) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Interactive Question Cards Stream */}
          <div className="w-full space-y-4 sm:space-y-5">
            {(isEditMode ? questions : validQuestions).map((q, qIndex, arr) => {
              const effectiveQId = q.id || `q_${qIndex}`;
              const qWithId = q.id ? q : { ...q, id: effectiveQId };
              const qResponse = studentResponses[effectiveQId];

              const isFirstShortAnswer =
                q.question_type === 'short_answer' &&
                (qIndex === 0 || arr[qIndex - 1]?.question_type !== 'short_answer');

              return (
                <React.Fragment key={effectiveQId}>
                  {isFirstShortAnswer && (
                    <div className="pt-2 pb-1 text-left border-t border-[var(--theme-border-subtle)]/70 mt-2">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-4 rounded-full bg-[#026fc3]" />
                        <h4 className="text-xs sm:text-sm font-bold text-theme-primary">
                          Complete each sentence with one missing word.
                        </h4>
                      </div>
                    </div>
                  )}
                  <ComprehensiveQuestionRenderer
                    question={qWithId}
                    index={qIndex}
                    response={qResponse}
                    onAnswerSubmit={(res) => handleStudentResponse(res, qWithId)}
                    isStudentView={!isEditMode}
                    mode={mode}
                    onUpdateQuestion={updated => handleUpdateQuestion(qIndex, updated)}
                    onDeleteQuestion={() => handleDeleteQuestion(qIndex)}
                    onDuplicateQuestion={() => handleDuplicateQuestion(qIndex)}
                    onMoveQuestionUp={() => handleMoveQuestion(qIndex, 'up')}
                    onMoveQuestionDown={() => handleMoveQuestion(qIndex, 'down')}
                    canMoveUp={qIndex > 0}
                    canMoveDown={qIndex < questions.length - 1}
                  />
                </React.Fragment>
              );
            })}
          </div>

          {/* IN EDIT MODE: ADD QUESTION BUTTONS */}
          {isEditMode && (
            <div className="pt-4 p-4 rounded-2xl border-2 border-dashed border-sky-300/80 bg-sky-50/20 dark:bg-sky-950/20 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#026fc3]">
                  + Add Practice Activity:
                </span>
                {onOpenAddQuestions && (
                  <button
                    type="button"
                    onClick={onOpenAddQuestions}
                    className="px-3 py-1.5 rounded-xl bg-[#026fc3] hover:bg-[#025ca2] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                    <span>AI Question Bank</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleAddQuestion('multiple_choice')}
                  className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-slate-200 dark:border-slate-800 hover:border-[#026fc3] text-xs font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-2xs text-left"
                >
                  + Multiple Choice
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion('true_false')}
                  className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-slate-200 dark:border-slate-800 hover:border-[#026fc3] text-xs font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-2xs text-left"
                >
                  + True / False
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion('sentence_reordering')}
                  className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-slate-200 dark:border-slate-800 hover:border-[#026fc3] text-xs font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-2xs text-left"
                >
                  + Reorder Words
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion('fill_blank')}
                  className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-slate-200 dark:border-slate-800 hover:border-[#026fc3] text-xs font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-2xs text-left"
                >
                  + Fill in Blank
                </button>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* LESSON PRACTICE COMPLETION CARD (STUDENT / PREVIEW MODE)         */}
          {/* ---------------------------------------------------------------- */}
          {!isEditMode && isAllAnswered && (
            <div className="w-full surface-elevated rounded-3xl p-5 sm:p-7 border border-[var(--theme-border-primary)] shadow-md text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-12 h-12 rounded-2xl bg-[var(--theme-accent)] text-[var(--theme-accent-contrast)] flex items-center justify-center mx-auto shadow-md">
                <Award className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-theme-accent reader-badge">
                  Lesson Practice Completed
                </span>
                <h3 className="text-lg sm:text-xl font-black text-theme-primary reader-h2">
                  Great job! You finished all practice questions.
                </h3>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-3 gap-2.5 max-w-sm mx-auto pt-1">
                <div className="p-2.5 rounded-2xl bg-[var(--theme-surface-interactive)] border border-[var(--theme-border-subtle)] shadow-2xs">
                  <span className="text-[10px] font-bold text-theme-muted uppercase block reader-meta">Score</span>
                  <span className="text-sm sm:text-base font-black text-theme-primary reader-body">{earnedPoints} / {totalPointsPossible}</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-[var(--theme-surface-interactive)] border border-[var(--theme-border-subtle)] shadow-2xs">
                  <span className="text-[10px] font-bold text-theme-muted uppercase block reader-meta">Correct</span>
                  <span className={`text-sm sm:text-base font-black ${activeTheme.isDark ? 'text-emerald-400' : 'text-emerald-600'} reader-body`}>{correctTotal}</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-[var(--theme-surface-interactive)] border border-[var(--theme-border-subtle)] shadow-2xs">
                  <span className="text-[10px] font-bold text-theme-muted uppercase block reader-meta">Incorrect</span>
                  <span className={`text-sm sm:text-base font-black ${activeTheme.isDark ? 'text-rose-400' : 'text-rose-600'} reader-body`}>{incorrectTotal}</span>
                </div>
              </div>
            </div>
          )}

        </section>
      )}

    </div>
  );
};
