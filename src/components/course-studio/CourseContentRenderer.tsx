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
  ArrowRight,
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
import { CanvaInlineTextEditor } from '@/components/course-studio/CanvaInlineTextEditor';
import { getThemePreset } from '@/utils/courseThemes';

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
  userAnswers?: Record<string, string>;
  feedbackState?: Record<string, { isCorrect: boolean; showExplanation: boolean; selected: string }>;
  // Edit mode props
  onChangeBlocks?: (blocks: CourseBlock[]) => void;
  onChangeQuestions?: (questions: CourseQuestion[]) => void;
  onOpenAiAssistant?: () => void;
  onOpenAddQuestions?: () => void;
  themeId?: string;
}

export const CourseContentRenderer: React.FC<Props> = ({
  blocks = [],
  questions = [],
  mode = 'student',
  textScale = 'md',
  onQuestionAnswer,
  onCompleteLesson,
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

  // Filter out any invalid / dummy placeholder questions from rendering
  const validQuestions = questions.filter(
    q => q && q.question_text && q.question_text.trim() && q.question_text !== 'New practice question' && q.question_text !== 'Statement based on the lesson'
  );

  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>(userAnswers);
  const [localFeedback, setLocalFeedback] = useState<Record<string, { isCorrect: boolean; showExplanation: boolean; selected: string }>>(feedbackState);
  const [studentResponses, setStudentResponses] = useState<Record<string, StudentQuestionResponse>>({});
  const [soundEnabled, setSoundEnabled] = useState<boolean>(courseAudio.isSoundEnabled());
  const [showAddSectionMenu, setShowAddSectionMenu] = useState<boolean>(false);

  // Sync external answers if component updates
  useEffect(() => {
    if (Object.keys(userAnswers).length > 0) {
      setLocalAnswers(prev => ({ ...prev, ...userAnswers }));
    }
  }, [userAnswers]);

  useEffect(() => {
    if (Object.keys(feedbackState).length > 0) {
      setLocalFeedback(prev => ({ ...prev, ...feedbackState }));
    }
  }, [feedbackState]);

  // Seed studentResponses from userAnswers/feedbackState if present
  useEffect(() => {
    if (Object.keys(userAnswers).length > 0 || Object.keys(feedbackState).length > 0) {
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
      content = { title: 'Lesson Video', text: '', video: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', position: 'above' } };
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

  // Progress metrics
  const answeredTotal = Math.max(
    Object.keys(localAnswers).length,
    Object.keys(localFeedback).length,
    Object.keys(studentResponses).length
  );
  const correctTotal = Object.values(studentResponses).filter(r => r.status === 'correct').length ||
    Object.values(localFeedback).filter(f => f.isCorrect).length;
  const incorrectTotal = Math.max(0, answeredTotal - correctTotal);
  const totalPointsPossible = validQuestions.reduce((sum, q) => sum + (q.points || 10), 0);
  const earnedPoints = Object.values(studentResponses).reduce((sum, r) => sum + (r.score || 0), 0) ||
    validQuestions.reduce((sum, q) => {
      const fb = localFeedback[q.id];
      return sum + (fb?.isCorrect ? (q.points || 10) : 0);
    }, 0);
  const isAllAnswered = validQuestions.length > 0 && answeredTotal >= validQuestions.length;

  return (
    <div className="w-full max-w-[760px] mx-auto space-y-8 sm:space-y-12 py-2 antialiased font-sans text-inherit box-border overflow-x-hidden">
      
      {/* ===================================================================== */}
      {/* 1. LESSON CONTENT STREAM                                              */}
      {/* ===================================================================== */}
      <div className="w-full space-y-6 sm:space-y-8">
        {blocks.map((block, idx) => {
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
            const bodyText = item.text || item.markdown || '';
            const embedUrl = getYouTubeEmbedUrl(vidUrl);

            if (isEditMode) {
              return renderBlockWrapper(
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-sky-500 shrink-0" />
                    <input
                      type="text"
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
                      className="flex-1 p-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-stone-900 focus:outline-none focus:border-[#026fc3]"
                    />
                  </div>
                  {embedUrl ? (
                    <div className="video-container shadow-md">
                      <iframe
                        src={embedUrl}
                        title={item.title || 'Lesson Video'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="w-full h-32 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400 font-medium">
                      Enter a valid YouTube URL to preview video
                    </div>
                  )}
                  {bodyText !== undefined && (
                    <CanvaInlineTextEditor
                      value={bodyText}
                      onChange={newText => updateBlockContent(idx, { ...item, text: newText })}
                      placeholder="Notes or prompt for students watching this video..."
                      surfaceBgColor={activeTheme.cardBgHex || '#ffffff'}
                    />
                  )}
                </div>
              );
            }

            return (
              <figure key={block.id || idx} className="w-full my-4 sm:my-6 space-y-2">
                {embedUrl && (
                  <div className="video-container shadow-md">
                    <iframe
                      src={embedUrl}
                      title={item.title || 'Lesson Video'}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                {bodyText && <FormattedLessonText text={bodyText} textScale={textScale} />}
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

            let borderStyle = 'border-sky-300 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/30 text-sky-950 dark:text-sky-100';
            if (variant === 'warning') borderStyle = 'border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100';
            if (variant === 'important') borderStyle = 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-100';

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
              <div className="absolute top-16 z-30 w-72 bg-white dark:bg-stone-900 rounded-2xl p-2 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => handleAddSection('heading')}
                  className="w-full p-2 rounded-xl text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-stone-800 flex items-center gap-2 cursor-pointer"
                >
                  <Heading className="w-4 h-4 text-sky-500" />
                  <span>Heading Title</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSection('text')}
                  className="w-full p-2 rounded-xl text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-stone-800 flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span>Paragraph Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSection('video')}
                  className="w-full p-2 rounded-xl text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-stone-800 flex items-center gap-2 cursor-pointer"
                >
                  <Video className="w-4 h-4 text-rose-500" />
                  <span>Video Lesson (16:9)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSection('image')}
                  className="w-full p-2 rounded-xl text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-stone-800 flex items-center gap-2 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-purple-500" />
                  <span>Visual Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSection('callout')}
                  className="w-full p-2 rounded-xl text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-stone-800 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Callout / Tip Box</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSection('quote')}
                  className="w-full p-2 rounded-xl text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-stone-800 flex items-center gap-2 cursor-pointer"
                >
                  <Quote className="w-4 h-4 text-indigo-500" />
                  <span>Inspirational Quote</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSection('divider')}
                  className="w-full p-2 rounded-xl text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-stone-800 flex items-center gap-2 cursor-pointer"
                >
                  <Minus className="w-4 h-4 text-slate-400" />
                  <span>Decorative Divider</span>
                </button>
                {onOpenAiAssistant && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSectionMenu(false);
                      onOpenAiAssistant();
                    }}
                    className="w-full p-2 rounded-xl text-left text-xs font-black bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-[#026fc3] hover:from-sky-500/30 flex items-center gap-2 cursor-pointer border border-sky-400/30"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>✨ Generate Section with AI</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 2. PRACTICE QUESTIONS STREAM                                          */}
      {/* ===================================================================== */}
      {(validQuestions.length > 0 || isEditMode) && (
        <section className="w-full pt-6 sm:pt-8 border-t border-[var(--theme-border-subtle)] space-y-5 sm:space-y-6">
          
          {/* Practice Header: Mode Switch Aware */}
          <div className="surface-card rounded-2xl p-3.5 sm:p-4.5 space-y-2.5 border border-[var(--theme-border-subtle)] shadow-xs">
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
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] sm:text-[11px] font-black border border-amber-400/30 flex items-center gap-1 reader-badge">
                    <Award className="w-3 h-3 text-amber-600 dark:text-amber-400" />
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
          <div className="w-full space-y-5 sm:space-y-6">
            {(isEditMode ? questions : validQuestions).map((q, qIndex) => {
              const effectiveQId = q.id || `q_${qIndex}`;
              const qWithId = { ...q, id: effectiveQId };
              const qResponse = studentResponses[effectiveQId];

              return (
                <ComprehensiveQuestionRenderer
                  key={effectiveQId}
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
                  <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 reader-body">{correctTotal}</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-[var(--theme-surface-interactive)] border border-[var(--theme-border-subtle)] shadow-2xs">
                  <span className="text-[10px] font-bold text-theme-muted uppercase block reader-meta">Incorrect</span>
                  <span className="text-sm sm:text-base font-black text-rose-500 dark:text-rose-400 reader-body">{incorrectTotal}</span>
                </div>
              </div>

              {onCompleteLesson && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onCompleteLesson}
                    className="min-h-[44px] px-6 py-2.5 rounded-2xl btn-theme-primary font-black text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer active:scale-98 reader-button"
                  >
                    <span>Continue to Next Lesson</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

        </section>
      )}

    </div>
  );
};
