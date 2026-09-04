// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: PREMIUM INTERACTIVE COURSE CONTENT RENDERER
// Apple Books & Kindle inspired editorial reading typography (14px body)
// paired with a Game-Quality, Rewarding Interactive Practice Question Engine.
// Immediate 1-click evaluation, one-attempt locking, Web Audio chimes,
// contained canvas confetti, and full support for all 6 question types.
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  ArrowRight,
  Award
} from 'lucide-react';
import { CourseBlock, CourseQuestion, StudentQuestionResponse } from '@/types/courseStudio';
import { FormattedLessonText, TextScale } from '@/utils/courseTextFormatting';
import { courseAudio } from '@/utils/courseAudio';
import { ComprehensiveQuestionRenderer } from '@/components/course-studio/ComprehensiveQuestionRenderer';

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
  feedbackState = {},
  isStudentView = true
}) => {
  // Filter out any invalid / dummy placeholder questions from rendering
  const validQuestions = questions.filter(
    q => q && q.question_text && q.question_text.trim() && q.question_text !== 'New practice question' && q.question_text !== 'Statement based on the lesson'
  );

  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>(userAnswers);
  const [localFeedback, setLocalFeedback] = useState<Record<string, { isCorrect: boolean; showExplanation: boolean; selected: string }>>(feedbackState);
  const [studentResponses, setStudentResponses] = useState<Record<string, StudentQuestionResponse>>({});
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

    // Mirror to legacy callbacks for backward compatibility
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

    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
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

                {/* 1. ABOVE or FULL WIDTH: [IMAGE] then [TEXT] */}
                {(pos === 'above' || pos === 'full_width') && img.url && renderImageFigure('max-w-[800px] mx-auto media-breakout-mobile')}

                {/* 2. CENTER: [CENTERED IMAGE] then [TEXT] */}
                {pos === 'center' && img.url && renderImageFigure('max-w-[480px] mx-auto')}

                {/* 3. LEFT: Desktop [IMAGE] [TEXT], Mobile stacked */}
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
                  /* 4. RIGHT: Desktop [TEXT] [IMAGE], Mobile stacked */
                  <div className="w-full flex flex-col md:flex-row-reverse items-start gap-5 sm:gap-6 my-3 sm:my-5">
                    <div className="w-full md:w-[42%] md:max-w-[320px] shrink-0">
                      {renderImageFigure('my-0')}
                    </div>
                    <div className="w-full flex-1 min-w-0">
                      <FormattedLessonText text={bodyText} textScale={textScale} />
                    </div>
                  </div>
                ) : (
                  /* Standard Stacked (Above, Below, or Center) */
                  <FormattedLessonText text={bodyText} textScale={textScale} />
                )}

                {/* 5. BELOW: [TEXT] then [IMAGE] */}
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

          // G. STANDALONE EDITORIAL HEADING
          if (block_type === 'heading') {
            const h = content as any;
            const level = h.level || 'h2';
            const headingText = h.text || h.title || '';
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

          // H. INSPIRATIONAL OR EDITORIAL QUOTE
          if (block_type === 'quote') {
            const q = content as any;
            const quoteText = q.text || q.quote || '';
            const author = q.author || q.source || '';
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

          // I. CALLOUT / INFO BOX
          if (block_type === 'callout') {
            const callout = content as any;
            const variant = callout.variant || callout.type || 'tip';
            const title = callout.title || (variant === 'tip' ? '💡 Tip' : variant === 'warning' ? '⚠️ Warning' : variant === 'important' ? '⭐ Important' : '📌 Note');
            const calloutText = callout.text || callout.message || '';

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

          // J. EDITORIAL DIVIDER
          if (block_type === 'divider') {
            return (
              <div key={block.id || idx} className="w-full flex items-center justify-center gap-3 my-6 sm:my-8 opacity-40 select-none">
                <span className="w-16 h-px bg-current" />
                <span className="text-xs text-theme-accent">✦</span>
                <span className="w-16 h-px bg-current" />
              </div>
            );
          }

          // K. AUDIO PLAYER
          if (block_type === 'audio') {
            const audio = content as any;
            const audioUrl = audio.url || '';
            const title = audio.title || 'Audio Narration';

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
                  isStudentView={isStudentView}
                />
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
