// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: PREMIUM INTERACTIVE COURSE CONTENT RENDERER
// Apple Books & Kindle inspired editorial reading typography (14px body)
// paired with a Game-Quality, Rewarding Interactive Practice Question Engine.
// Immediate 1-click evaluation, one-attempt locking, Web Audio chimes,
// contained canvas confetti, and full support for all 6 question types.
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  Check,
  X,
  Volume2,
  VolumeX,
  ArrowRight,
  Send,
  Award
} from 'lucide-react';
import { CourseBlock, CourseQuestion, QuestionType } from '@/types/courseStudio';
import { FormattedLessonText, TextScale } from '@/utils/courseTextFormatting';
import { QUESTION_TYPE_LABELS } from '@/utils/questionSchemaValidator';
import { courseAudio } from '@/utils/courseAudio';
import { triggerConfettiBurst } from '@/utils/courseConfetti';
import { DraggableOrderingQuestion } from '@/components/course-studio/DraggableOrderingQuestion';
import { ClozePassageQuestion } from '@/components/course-studio/ClozePassageQuestion';
import { EssayQuestion } from '@/components/course-studio/EssayQuestion';

interface Props {
  blocks: CourseBlock[];
  questions?: CourseQuestion[];
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
}

export const CourseContentRenderer: React.FC<Props> = ({
  blocks = [],
  questions = [],
  textScale = 'md',
  onQuestionAnswer,
  onCompleteLesson,
  userAnswers = {},
  feedbackState = {}
}) => {
  // Filter out any invalid / dummy placeholder questions from rendering
  const validQuestions = questions.filter(
    q => q && q.question_text && q.question_text.trim() && q.question_text !== 'New practice question' && q.question_text !== 'Statement based on the lesson'
  );

  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>(userAnswers);
  const [localFeedback, setLocalFeedback] = useState<Record<string, { isCorrect: boolean; showExplanation: boolean; selected: string }>>(feedbackState);
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());
  const [shakeId, setShakeId] = useState<string | null>(null);
  
  // Custom inputs for typed questions
  const [textInputs, setTextInputs] = useState<Record<string, string>>({});
  const [soundEnabled, setSoundEnabled] = useState<boolean>(courseAudio.isSoundEnabled());

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

  const handleToggleSound = () => {
    const next = courseAudio.toggleSound();
    setSoundEnabled(next);
  };

  // --------------------------------------------------------------------------
  // ONE ATTEMPT EVALUATION ENGINE
  // --------------------------------------------------------------------------
  const handleEvaluateAnswer = (
    question: CourseQuestion,
    studentAnswer: string,
    targetElement?: HTMLElement | null
  ) => {
    const qId = question.id;

    // CRITICAL: Strict anti-retry lock - once answered or currently submitting, reject!
    if (localAnswers[qId] || localFeedback[qId] || submittingIds.has(qId)) {
      return;
    }

    // Mark as submitting immediately to prevent rapid double-clicks
    setSubmittingIds(prev => new Set(prev).add(qId));
    courseAudio.playSelectSound();

    let isCorrect = false;
    const cleanStudent = studentAnswer.trim().toLowerCase();
    const cleanCorrect = (question.correct_answer || '').trim().toLowerCase();

    if (question.question_type === 'multiple_choice' || question.question_type === 'true_false' || question.question_type === 'fill_blank') {
      isCorrect = cleanStudent === cleanCorrect;
    } else if (question.question_type === 'short_answer') {
      const acceptable = Array.isArray(question.options)
        ? question.options.map(opt => (typeof opt === 'string' ? opt : (opt as any)?.text || '').trim().toLowerCase())
        : [];
      isCorrect = cleanStudent === cleanCorrect || acceptable.includes(cleanStudent);
    } else if (question.question_type === 'ordering') {
      // Compare sequence
      const correctSeq = Array.isArray(question.options) ? question.options.join('|||').toLowerCase() : '';
      isCorrect = studentAnswer.toLowerCase() === correctSeq;
    } else {
      isCorrect = cleanStudent === cleanCorrect;
    }

    const pointsAwarded = isCorrect ? (question.points || 10) : 0;

    // Trigger audio and visual effects
    if (isCorrect) {
      setTimeout(() => {
        courseAudio.playCorrectSound();
        triggerConfettiBurst(targetElement, 36);
      }, 50);
    } else {
      setShakeId(qId);
      setTimeout(() => {
        courseAudio.playIncorrectSound();
      }, 50);
      setTimeout(() => {
        setShakeId(null);
      }, 600);
    }

    // Permanently lock state in React memory
    setLocalAnswers(prev => ({ ...prev, [qId]: studentAnswer }));
    setLocalFeedback(prev => ({
      ...prev,
      [qId]: {
        isCorrect,
        showExplanation: true,
        selected: studentAnswer
      }
    }));

    setSubmittingIds(prev => {
      const next = new Set(prev);
      next.delete(qId);
      return next;
    });

    if (onQuestionAnswer) {
      onQuestionAnswer(qId, studentAnswer, isCorrect, pointsAwarded, question);
    }

    // Check if this was the last question in the set
    const answeredCount = Object.keys(localAnswers).length + 1;
    if (answeredCount >= validQuestions.length && validQuestions.length > 0) {
      setTimeout(() => {
        courseAudio.playCompleteSound();
        triggerConfettiBurst(null, 50);
      }, 800);
    }
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

    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
  };

  // Progress metrics
  const answeredTotal = Object.keys(localFeedback).length;
  const correctTotal = Object.values(localFeedback).filter(f => f.isCorrect).length;
  const incorrectTotal = answeredTotal - correctTotal;
  const totalPointsPossible = validQuestions.reduce((sum, q) => sum + (q.points || 10), 0);
  const earnedPoints = validQuestions.reduce((sum, q) => {
    const fb = localFeedback[q.id];
    return sum + (fb?.isCorrect ? (q.points || 10) : 0);
  }, 0);
  const isAllAnswered = validQuestions.length > 0 && answeredTotal >= validQuestions.length;

  return (
    <div className="container-fluid px-0 max-w-[760px] mx-auto space-y-10 sm:space-y-14 py-2 antialiased font-sans text-inherit box-border overflow-x-hidden">
      
      {/* 1. LESSON CONTENT STREAM */}
      <div className="w-full space-y-6 sm:space-y-10">
        {blocks.map((block, idx) => {
          const { block_type, content } = block;

          // A. PURE TEXT SECTION
          if (block_type === 'text' && !(content as any)?.image?.url && !(content as any)?.video?.url) {
            const textContent = content as any;
            const bodyText = textContent?.text || textContent?.markdown || '';

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
            const pos = img.position || 'above';

            const renderImageFigure = (extraClasses = '') => (
              <figure className={`w-full my-3 sm:my-5 ${extraClasses}`}>
                <div className="w-full rounded-none sm:rounded-2xl overflow-hidden bg-sky-50/40 dark:bg-slate-800 shadow-2xs border-y sm:border border-sky-100 dark:border-slate-700">
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

                {/* 1. ABOVE: [IMAGE] then [TEXT] */}
                {pos === 'above' && img.url && renderImageFigure('max-w-[800px] mx-auto media-breakout-mobile')}

                {/* 2. LEFT: Desktop [IMAGE] [TEXT], Mobile stacked */}
                {pos === 'left' && img.url ? (
                  <div className="w-full flex flex-col md:flex-row items-start gap-5 sm:gap-6 my-3 sm:my-5">
                    <div className="w-full md:w-[42%] md:max-w-[320px] shrink-0">
                      {renderImageFigure('my-0')}
                    </div>
                    <div className="w-full flex-1 min-w-0">
                      <FormattedLessonText text={bodyText} textScale={textScale} />
                    </div>
                  </div>
                ) : pos === 'right' && img.url ? (
                  /* 3. RIGHT: Desktop [TEXT] [IMAGE], Mobile stacked */
                  <div className="w-full flex flex-col md:flex-row-reverse items-start gap-5 sm:gap-6 my-3 sm:my-5">
                    <div className="w-full md:w-[42%] md:max-w-[320px] shrink-0">
                      {renderImageFigure('my-0')}
                    </div>
                    <div className="w-full flex-1 min-w-0">
                      <FormattedLessonText text={bodyText} textScale={textScale} />
                    </div>
                  </div>
                ) : (
                  /* Standard Stacked (Above or Below) */
                  <FormattedLessonText text={bodyText} textScale={textScale} />
                )}

                {/* 4. BELOW: [TEXT] then [IMAGE] */}
                {pos === 'below' && img.url && renderImageFigure('max-w-[800px] mx-auto media-breakout-mobile')}
              </section>
            );
          }

          // C. COMBINED TEXT + VIDEO SECTION
          if (block_type === 'text_video' || (block_type === 'text' && (content as any)?.video?.url)) {
            const item = content as any;
            const vid = item.video || {};
            const bodyText = item.text || item.markdown || '';
            const pos = vid.position || 'above';
            const embedUrl = getYouTubeEmbedUrl(vid.url || vid.video_id);

            const renderVideoFrame = (extraClasses = '') => (
              <div className={`w-full my-3 sm:my-5 ${extraClasses}`}>
                <div className="w-full rounded-none sm:rounded-2xl overflow-hidden bg-black shadow-md aspect-video border-y sm:border border-slate-200 dark:border-slate-800">
                  <iframe
                    src={embedUrl}
                    title={vid.title || 'Lesson Video'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            );

            return (
              <section key={block.id || idx} className="w-full space-y-4 clear-both">
                {item.title && (
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-inherit pt-2 pb-1 border-b border-current/10 opacity-90 text-left reader-h2">
                    {item.title}
                  </h3>
                )}

                {pos === 'above' && embedUrl && renderVideoFrame('max-w-2xl mx-auto media-breakout-mobile')}

                {pos === 'left' && embedUrl ? (
                  <div className="w-full flex flex-col md:flex-row items-start gap-5 sm:gap-6 my-3 sm:my-5">
                    <div className="w-full md:w-[48%] md:max-w-[360px] shrink-0">
                      {renderVideoFrame('my-0')}
                    </div>
                    <div className="w-full flex-1 min-w-0">
                      <FormattedLessonText text={bodyText} textScale={textScale} />
                    </div>
                  </div>
                ) : pos === 'right' && embedUrl ? (
                  <div className="w-full flex flex-col md:flex-row-reverse items-start gap-5 sm:gap-6 my-3 sm:my-5">
                    <div className="w-full md:w-[48%] md:max-w-[360px] shrink-0">
                      {renderVideoFrame('my-0')}
                    </div>
                    <div className="w-full flex-1 min-w-0">
                      <FormattedLessonText text={bodyText} textScale={textScale} />
                    </div>
                  </div>
                ) : (
                  <FormattedLessonText text={bodyText} textScale={textScale} />
                )}

                {pos === 'below' && embedUrl && renderVideoFrame('max-w-2xl mx-auto media-breakout-mobile')}
              </section>
            );
          }

          // D. STANDALONE IMAGE SECTION
          if (block_type === 'image') {
            const imgContent = content as any;
            if (!imgContent?.url) return null;

            return (
              <figure key={block.id || idx} className="w-full my-6 sm:my-8 overflow-hidden text-center media-breakout-mobile">
                <div className="w-full rounded-none sm:rounded-2xl overflow-hidden bg-sky-50/40 dark:bg-slate-800 shadow-2xs max-w-2xl mx-auto border-y sm:border border-sky-100 dark:border-slate-700">
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

          // E. STANDALONE YOUTUBE VIDEO (16:9)
          if (block_type === 'youtube_video' || (block_type === 'video' && !(content as any)?.is_short)) {
            const yt = content as any;
            const embedUrl = getYouTubeEmbedUrl(yt?.url || yt?.video_id);

            return (
              <figure key={block.id || idx} className="w-full my-6 sm:my-8 space-y-2 media-breakout-mobile">
                <div className="w-full rounded-none sm:rounded-2xl overflow-hidden bg-black shadow-md aspect-video max-w-2xl mx-auto border-y sm:border border-slate-200 dark:border-slate-800">
                  <iframe
                    src={embedUrl}
                    title={yt.title || 'Lesson Video'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
                {yt.title && (
                  <figcaption className="text-xs text-center italic opacity-75 font-serif reader-caption">
                    {yt.title}
                  </figcaption>
                )}
              </figure>
            );
          }

          // F. STANDALONE YOUTUBE SHORTS (9:16)
          if (block_type === 'youtube_short' || (block_type === 'video' && (content as any)?.is_short)) {
            const yt = content as any;
            const embedUrl = getYouTubeEmbedUrl(yt?.url || yt?.video_id);

            return (
              <figure key={block.id || idx} className="w-full my-6 sm:my-8 flex flex-col items-center">
                <div className="rounded-2xl overflow-hidden bg-black border-2 border-slate-800 shadow-lg w-full max-w-[260px] sm:max-w-[280px] aspect-[9/16]">
                  <iframe
                    src={embedUrl}
                    title={yt.title || 'YouTube Short Lesson'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
                {yt.title && (
                  <figcaption className="text-xs text-center mt-2.5 italic opacity-75 font-serif reader-caption">
                    {yt.title}
                  </figcaption>
                )}
              </figure>
            );
          }

          return null;
        })}
      </div>

      {/* 2. REFINED EDITORIAL INTERACTIVE PRACTICE SECTION */}
      {validQuestions.length > 0 && (
        <section className="w-full pt-6 sm:pt-8 border-t border-[var(--theme-border-subtle)] space-y-5 sm:space-y-6">
          
          {/* Ultra-Compact Modern Practice Header (Zero Vertical Waste) */}
          <div className="surface-card rounded-2xl p-3.5 sm:p-4.5 space-y-2.5 border border-[var(--theme-border-subtle)] shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--theme-accent-soft)] text-theme-accent text-[10px] sm:text-[11px] font-black uppercase tracking-wider reader-badge">
                  <Sparkles className="w-3 h-3 text-theme-accent" />
                  <span>Practice</span>
                </span>
                <span className="text-xs sm:text-sm font-bold text-theme-secondary reader-meta">
                  {answeredTotal} of {validQuestions.length} completed
                </span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-xs sm:text-sm font-black text-theme-accent font-mono reader-meta">
                  {Math.round((answeredTotal / validQuestions.length) * 100)}%
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
            </div>

            {/* Slim 4px Progress Track */}
            <div className="w-full h-1.5 bg-[var(--theme-surface-subtle)] rounded-full overflow-hidden border border-[var(--theme-border-subtle)]">
              <div
                className="h-full bg-linear-to-r from-[#026fc3] via-[#0284c7] to-[#38bdf8] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(answeredTotal / validQuestions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Interactive Question Cards Stream */}
          <div className="w-full space-y-5 sm:space-y-6">
            {validQuestions.map((q, qIndex) => {
              const qId = q.id;
              const feedback = localFeedback[qId];
              const selectedAnswer = localAnswers[qId];
              const isLocked = Boolean(selectedAnswer || feedback);
              const isSubmitting = submittingIds.has(qId);
              const isShaking = shakeId === qId;
              const qType = (q.question_type || 'multiple_choice') as QuestionType;

              // Normalize options array
              const optionsList: string[] = Array.isArray(q.options)
                ? q.options.map(opt => (typeof opt === 'string' ? opt : (opt as any)?.text || ''))
                : [];

              return (
                <div
                  key={qId || qIndex}
                  id={`question-card-${qId}`}
                  className={`w-full rounded-2xl sm:rounded-3xl p-4 sm:p-6 surface-card space-y-3.5 transition-all box-border border border-[var(--theme-border-primary)] shadow-xs ${
                    isShaking ? 'animate-shake ring-2 ring-rose-400' : ''
                  }`}
                >
                  {/* Question Card Header */}
                  <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-[var(--theme-border-subtle)]">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-theme-accent reader-badge">
                        QUESTION {String(qIndex + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] font-black opacity-80 uppercase px-2 py-0.5 rounded-md bg-[var(--theme-surface-subtle)] text-theme-secondary border border-[var(--theme-border-subtle)] reader-badge">
                        {QUESTION_TYPE_LABELS[qType] || qType}
                      </span>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--theme-accent-soft)] text-theme-accent text-[11px] font-black shrink-0 border border-[var(--theme-border-subtle)] reader-badge">
                      {q.points || 10} PTS
                    </span>
                  </div>

                  {/* Question Prompt */}
                  <h4 className="font-bold text-theme-primary leading-snug text-left reader-question">
                    {q.question_text}
                  </h4>

                  {/* -------------------------------------------------------- */}
                  {/* 1. MULTIPLE CHOICE ANSWER CARDS                          */}
                  {/* -------------------------------------------------------- */}
                  {qType === 'multiple_choice' && (
                    <div className="w-full space-y-2 pt-0.5">
                      {optionsList.map((optText, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx);
                        const isSelected = selectedAnswer === optText;
                        const isCorrectOption = optText.trim().toLowerCase() === (q.correct_answer || '').trim().toLowerCase();

                        // Dynamic state styling
                        let cardStyle = 'surface-answer-option text-theme-primary shadow-2xs';
                        let badgeStyle = 'bg-[var(--theme-surface-subtle)] text-theme-accent border border-[var(--theme-border-subtle)]';

                        if (isLocked) {
                          if (isSelected) {
                            if (feedback?.isCorrect) {
                              cardStyle = 'surface-answer-selected-correct';
                              badgeStyle = 'bg-emerald-600 text-white shadow-xs border-0';
                            } else {
                              cardStyle = 'surface-answer-selected-incorrect';
                              badgeStyle = 'bg-rose-600 text-white shadow-xs border-0';
                            }
                          } else if (!feedback?.isCorrect && isCorrectOption) {
                            // Reveal the correct option if the student was wrong
                            cardStyle = 'surface-answer-revealed-correct';
                            badgeStyle = 'bg-emerald-500/20 text-emerald-800 border border-emerald-500/40';
                          } else {
                            cardStyle = 'opacity-40 border-[var(--theme-border-subtle)] bg-[var(--theme-surface-subtle)] text-theme-muted';
                            badgeStyle = 'bg-[var(--theme-surface-subtle)] text-theme-muted';
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={isLocked || isSubmitting}
                            onClick={(e) => handleEvaluateAnswer(q, optText, e.currentTarget)}
                            className={`w-full min-h-[52px] p-3.5 sm:p-4 rounded-2xl border text-left reader-option transition-all flex items-center gap-3.5 box-border ${
                              isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                            } ${cardStyle}`}
                          >
                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${badgeStyle}`}>
                              {isSelected ? (
                                feedback?.isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />
                              ) : (
                                letter
                              )}
                            </span>

                            <span className="flex-1 leading-relaxed break-words font-medium reader-option">
                              {optText}
                            </span>

                            {/* Correct Answer Badge when revealed */}
                            {isLocked && !feedback?.isCorrect && isCorrectOption && (
                              <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300 uppercase px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 shrink-0 border border-emerald-300/80 reader-badge">
                                Correct Answer
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* -------------------------------------------------------- */}
                  {/* 2. TRUE / FALSE ANSWER CARDS                             */}
                  {/* -------------------------------------------------------- */}
                  {qType === 'true_false' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {['True', 'False'].map(choice => {
                        const isSelected = selectedAnswer === choice;
                        const isCorrectChoice = choice.toLowerCase() === (q.correct_answer || '').toLowerCase();

                        let cardStyle = 'surface-answer-option text-theme-primary shadow-2xs';
                        let icon = choice === 'True' ? <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <X className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />;

                        if (isLocked) {
                          if (isSelected) {
                            if (feedback?.isCorrect) {
                              cardStyle = 'surface-answer-selected-correct font-black';
                            } else {
                              cardStyle = 'surface-answer-selected-incorrect font-black';
                            }
                          } else if (!feedback?.isCorrect && isCorrectChoice) {
                            cardStyle = 'surface-answer-revealed-correct font-black';
                          } else {
                            cardStyle = 'opacity-40 border-[var(--theme-border-subtle)] bg-[var(--theme-surface-subtle)] text-theme-muted';
                          }
                        }

                        return (
                          <button
                            key={choice}
                            type="button"
                            disabled={isLocked || isSubmitting}
                            onClick={(e) => handleEvaluateAnswer(q, choice, e.currentTarget)}
                            className={`min-h-[54px] p-3.5 sm:p-4 rounded-2xl border text-center font-black transition-all flex items-center justify-center gap-2.5 reader-option ${
                              isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                            } ${cardStyle}`}
                          >
                            <span>{icon}</span>
                            <span className="uppercase tracking-wider font-extrabold text-sm sm:text-base">{choice}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* -------------------------------------------------------- */}
                  {/* 3. FILL IN THE BLANK / SHORT ANSWER                      */}
                  {/* -------------------------------------------------------- */}
                  {(qType === 'fill_blank' || qType === 'short_answer') && (
                    <div className="pt-1 space-y-3">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          disabled={isLocked || isSubmitting}
                          value={textInputs[qId] || selectedAnswer || ''}
                          onChange={e => setTextInputs(prev => ({ ...prev, [qId]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && textInputs[qId]?.trim() && !isLocked) {
                              handleEvaluateAnswer(q, textInputs[qId], e.currentTarget);
                            }
                          }}
                          placeholder={qType === 'fill_blank' ? 'Type the missing word...' : 'Type your answer here...'}
                          className={`flex-1 px-4 py-3 rounded-2xl border reader-input font-medium transition-all ${
                            isLocked
                              ? feedback?.isCorrect
                                ? 'bg-[var(--theme-success-bg)] border-2 border-[var(--theme-success-border)] text-[var(--theme-success-text)] font-bold'
                                : 'bg-[var(--theme-error-bg)] border-2 border-[var(--theme-error-border)] text-[var(--theme-error-text)] font-bold'
                              : 'input-theme text-theme-primary'
                          }`}
                        />
                        {!isLocked && (
                          <button
                            type="button"
                            disabled={!textInputs[qId]?.trim() || isSubmitting}
                            onClick={(e) => handleEvaluateAnswer(q, textInputs[qId] || '', e.currentTarget)}
                            className="min-h-[44px] px-6 py-3 rounded-2xl btn-theme-primary text-xs font-black transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-xs reader-button"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Submit</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* -------------------------------------------------------- */}
                  {/* 4. ORDERING SEQUENCE (DRAG & ARRANGE SENTENCE BLOCKS)     */}
                  {/* -------------------------------------------------------- */}
                  {qType === 'ordering' && (
                    <DraggableOrderingQuestion
                      question={q}
                      isLocked={isLocked}
                      isSubmitting={isSubmitting}
                      selectedAnswer={selectedAnswer}
                      feedback={feedback}
                      onEvaluateAnswer={handleEvaluateAnswer}
                    />
                  )}

                  {/* -------------------------------------------------------- */}
                  {/* 5. MATCHING PAIRS                                        */}
                  {/* -------------------------------------------------------- */}
                  {qType === 'matching' && (
                    <div className="pt-1 space-y-2">
                      <div className="space-y-2">
                        {optionsList.map((pairStr, pIdx) => (
                          <div key={pIdx} className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--theme-surface-interactive)] border border-[var(--theme-border-primary)] text-theme-primary text-xs reader-body">
                            <span className="font-bold">{pairStr.split('->')[0]?.trim()}</span>
                            <span className="text-theme-accent font-bold text-base px-2">⇄</span>
                            <span className="font-medium text-theme-secondary">{pairStr.split('->')[1]?.trim()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* -------------------------------------------------------- */}
                  {/* 6. CLOZE PASSAGE (INTERACTIVE READING WITH BLANKS)       */}
                  {/* -------------------------------------------------------- */}
                  {qType === 'cloze_passage' && (
                    <ClozePassageQuestion
                      question={q}
                      isLocked={isLocked}
                      isSubmitting={isSubmitting}
                      selectedAnswer={selectedAnswer}
                      feedback={feedback}
                      onEvaluateAnswer={handleEvaluateAnswer}
                    />
                  )}

                  {/* -------------------------------------------------------- */}
                  {/* 7. ESSAY / DESCRIPTIVE RESPONSE (AI EVALUATED)           */}
                  {/* -------------------------------------------------------- */}
                  {qType === 'essay' && (
                    <EssayQuestion
                      question={q}
                      isLocked={isLocked}
                      isSubmitting={isSubmitting}
                      selectedAnswer={selectedAnswer}
                      feedback={feedback}
                      onEvaluateAnswer={handleEvaluateAnswer}
                    />
                  )}

                  {/* -------------------------------------------------------- */}
                  {/* REFINED EXPLANATION CARD (Locked state for standard Qs)  */}
                  {/* -------------------------------------------------------- */}
                  {qType !== 'ordering' && qType !== 'cloze_passage' && qType !== 'essay' && feedback?.showExplanation && (
                    <div
                      className={`p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed border transition-all animate-in fade-in duration-200 reader-explanation ${
                        feedback.isCorrect
                          ? 'bg-[var(--theme-success-bg)] border-[var(--theme-success-border)] text-[var(--theme-success-text)]'
                          : 'bg-[var(--theme-error-bg)] border-[var(--theme-error-border)] text-[var(--theme-error-text)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-black mb-1.5">
                        {feedback.isCorrect ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>✓ Correct! Great job!</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                            <span>✕ Incorrect</span>
                          </>
                        )}
                      </div>

                      {q.explanation ? (
                        <p className="opacity-95 leading-relaxed font-medium">{q.explanation}</p>
                      ) : (
                        <p className="opacity-95 leading-relaxed font-medium">
                          {feedback.isCorrect
                            ? 'You got this right! Great job following the lesson.'
                            : `The correct answer was: ${q.correct_answer || 'See lesson content above.'}`}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* LESSON PRACTICE COMPLETION CARD                                  */}
          {/* ---------------------------------------------------------------- */}
          {isAllAnswered && (
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
