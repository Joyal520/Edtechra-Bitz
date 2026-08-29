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
    <div className="w-full max-w-[760px] mx-auto space-y-12 sm:space-y-16 py-4 antialiased font-sans text-inherit box-border overflow-x-hidden">
      
      {/* 1. LESSON CONTENT STREAM */}
      <div className="w-full space-y-8 sm:space-y-12">
        {blocks.map((block, idx) => {
          const { block_type, content } = block;

          // A. PURE TEXT SECTION
          if (block_type === 'text' && !(content as any)?.image?.url && !(content as any)?.video?.url) {
            const textContent = content as any;
            const bodyText = textContent?.text || textContent?.markdown || '';

            if (!bodyText.trim() && !textContent?.title) return null;

            return (
              <section key={block.id || idx} className="w-full space-y-3">
                {textContent?.title && (
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-inherit pt-2 pb-1 border-b border-current/10 opacity-90 text-left">
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

            return (
              <section key={block.id || idx} className="w-full space-y-5 clear-both">
                {item.title && (
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-inherit pt-2 pb-1 border-b border-current/10 opacity-90 text-left">
                    {item.title}
                  </h3>
                )}

                {(pos === 'above' || pos === 'left' || pos === 'right') && img.url && (
                  <figure className={`w-full my-6 sm:my-8 ${
                    pos === 'left'
                      ? 'md:float-left md:w-[42%] md:max-w-[320px] md:mr-8 md:mb-6'
                      : pos === 'right'
                      ? 'md:float-right md:w-[42%] md:max-w-[320px] md:ml-8 md:mb-6'
                      : 'max-w-[800px] mx-auto'
                  }`}>
                    <div className="w-full rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 shadow-xs border border-black/5 dark:border-white/10">
                      <img
                        src={img.url}
                        alt={img.alt || img.caption || 'Story illustration'}
                        className="w-full h-auto object-cover max-h-[480px] block"
                        loading="lazy"
                      />
                    </div>
                    {img.caption && (
                      <figcaption className="text-xs text-center mt-2 italic opacity-75 leading-relaxed font-serif">
                        {img.caption}
                      </figcaption>
                    )}
                  </figure>
                )}

                <FormattedLessonText text={bodyText} textScale={textScale} />

                {pos === 'below' && img.url && (
                  <figure className="w-full my-6 sm:my-8 max-w-[800px] mx-auto">
                    <div className="w-full rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 shadow-xs border border-black/5 dark:border-white/10">
                      <img
                        src={img.url}
                        alt={img.alt || img.caption || 'Story illustration'}
                        className="w-full h-auto object-cover max-h-[480px] block"
                        loading="lazy"
                      />
                    </div>
                    {img.caption && (
                      <figcaption className="text-xs text-center mt-2 italic opacity-75 leading-relaxed font-serif">
                        {img.caption}
                      </figcaption>
                    )}
                  </figure>
                )}
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

            return (
              <section key={block.id || idx} className="w-full space-y-5 clear-both">
                {item.title && (
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-inherit pt-2 pb-1 border-b border-current/10 opacity-90 text-left">
                    {item.title}
                  </h3>
                )}

                {(pos === 'above' || pos === 'left' || pos === 'right') && embedUrl && (
                  <div className={`w-full my-6 sm:my-8 ${
                    pos === 'left'
                      ? 'md:float-left md:w-[48%] md:max-w-[360px] md:mr-8 md:mb-6'
                      : pos === 'right'
                      ? 'md:float-right md:w-[48%] md:max-w-[360px] md:ml-8 md:mb-6'
                      : 'max-w-2xl mx-auto'
                  }`}>
                    <div className="w-full rounded-2xl overflow-hidden bg-black shadow-md aspect-video border border-black/10">
                      <iframe
                        src={embedUrl}
                        title={vid.title || 'Lesson Video'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    </div>
                  </div>
                )}

                <FormattedLessonText text={bodyText} textScale={textScale} />

                {pos === 'below' && embedUrl && (
                  <div className="w-full my-6 sm:my-8 max-w-2xl mx-auto">
                    <div className="w-full rounded-2xl overflow-hidden bg-black shadow-md aspect-video border border-black/10">
                      <iframe
                        src={embedUrl}
                        title={vid.title || 'Lesson Video'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    </div>
                  </div>
                )}
              </section>
            );
          }

          // D. STANDALONE IMAGE SECTION
          if (block_type === 'image') {
            const imgContent = content as any;
            if (!imgContent?.url) return null;

            return (
              <figure key={block.id || idx} className="w-full my-8 sm:my-12 overflow-hidden text-center">
                <div className="w-full rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 shadow-xs max-w-2xl mx-auto border border-black/5 dark:border-white/10">
                  <img
                    src={imgContent.url}
                    alt={imgContent.alt || imgContent.caption || 'Course visual material'}
                    className="w-full h-auto object-contain max-h-[500px] block"
                    loading="lazy"
                  />
                </div>
                {imgContent.caption && (
                  <figcaption className="text-xs text-center mt-2 italic opacity-75 font-serif">
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
              <figure key={block.id || idx} className="w-full my-8 sm:my-12 space-y-2.5">
                <div className="w-full rounded-2xl overflow-hidden bg-black shadow-md aspect-video max-w-2xl mx-auto border border-black/10">
                  <iframe
                    src={embedUrl}
                    title={yt.title || 'Lesson Video'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
                {yt.title && (
                  <figcaption className="text-xs text-center italic opacity-75 font-serif">
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
              <figure key={block.id || idx} className="w-full my-8 sm:my-12 flex flex-col items-center">
                <div className="rounded-2xl overflow-hidden bg-black border-2 border-stone-800 shadow-lg w-full max-w-[260px] sm:max-w-[280px] aspect-[9/16]">
                  <iframe
                    src={embedUrl}
                    title={yt.title || 'YouTube Short Lesson'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
                {yt.title && (
                  <figcaption className="text-xs text-center mt-2.5 italic opacity-75 font-serif">
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
        <section className="w-full pt-10 sm:pt-16 border-t border-stone-200/80 dark:border-stone-800 space-y-8 sm:space-y-10">
          
          {/* Editorial Practice Section Header */}
          <div className="bg-white/90 dark:bg-stone-900/90 rounded-3xl p-6 sm:p-8 border border-stone-200/90 dark:border-stone-800 shadow-xs space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 text-sky-800 dark:text-sky-300 text-[11px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-[#026fc3]" />
                  <span>Interactive Practice</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  Think About the Story
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Check your understanding of the lesson.
                </p>
              </div>

              {/* Subtle Sound Toggle Control */}
              <button
                type="button"
                onClick={handleToggleSound}
                className="px-3.5 py-1.5 rounded-full bg-stone-100/80 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs border border-stone-200/60 dark:border-stone-700"
                title="Toggle Question Sound Effects"
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#026fc3]" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                <span>{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
              </button>
            </div>

            {/* Refined Minimalist Progress Bar */}
            <div className="pt-3 border-t border-stone-100 dark:border-stone-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>{answeredTotal} of {validQuestions.length} completed</span>
                <div className="flex items-center gap-3">
                  <span className="text-[#026fc3] font-black">{Math.round((answeredTotal / validQuestions.length) * 100)}%</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 text-[11px] font-black">
                    {earnedPoints} / {totalPointsPossible} pts
                  </span>
                </div>
              </div>

              {/* Smooth Progress Track */}
              <div className="w-full h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#026fc3] to-sky-400 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(answeredTotal / validQuestions.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Interactive Question Cards Stream */}
          <div className="w-full space-y-6 sm:space-y-8">
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
                  className={`w-full rounded-3xl p-6 sm:p-8 bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-sm space-y-5 transition-all box-border ${
                    isShaking ? 'animate-shake ring-2 ring-rose-400' : ''
                  }`}
                >
                  {/* Question Card Header */}
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#026fc3]">
                        QUESTION {String(qIndex + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] font-black opacity-60 uppercase px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-slate-700 dark:text-slate-300">
                        {QUESTION_TYPE_LABELS[qType] || qType}
                      </span>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-black shrink-0">
                      {q.points || 10} POINTS
                    </span>
                  </div>

                  {/* Question Prompt */}
                  <h4 className="text-lg sm:text-xl md:text-[22px] font-bold text-slate-900 dark:text-white leading-snug text-left">
                    {q.question_text}
                  </h4>

                  {/* -------------------------------------------------------- */}
                  {/* 1. MULTIPLE CHOICE ANSWER CARDS                          */}
                  {/* -------------------------------------------------------- */}
                  {qType === 'multiple_choice' && (
                    <div className="w-full space-y-3 pt-1">
                      {optionsList.map((optText, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx);
                        const isSelected = selectedAnswer === optText;
                        const isCorrectOption = optText.trim().toLowerCase() === (q.correct_answer || '').trim().toLowerCase();

                        // Dynamic state styling
                        let cardStyle = 'bg-white dark:bg-stone-900/90 border-stone-200/90 dark:border-stone-700/80 hover:border-[#026fc3] hover:bg-sky-50/30 dark:hover:bg-stone-800/80 text-slate-800 dark:text-slate-100 shadow-2xs';
                        let badgeStyle = 'bg-stone-100 dark:bg-stone-800 text-slate-700 dark:text-slate-300 border border-stone-200/60 dark:border-stone-700';

                        if (isLocked) {
                          if (isSelected) {
                            if (feedback?.isCorrect) {
                              cardStyle = 'bg-emerald-50/90 dark:bg-emerald-950/40 border-2 border-emerald-500 text-emerald-950 dark:text-emerald-100 shadow-xs ring-1 ring-emerald-400/20';
                              badgeStyle = 'bg-emerald-600 text-white shadow-xs';
                            } else {
                              cardStyle = 'bg-rose-50/90 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-950 dark:text-rose-100 shadow-xs ring-1 ring-rose-400/20';
                              badgeStyle = 'bg-rose-600 text-white shadow-xs';
                            }
                          } else if (!feedback?.isCorrect && isCorrectOption) {
                            // Reveal the correct option if the student was wrong
                            cardStyle = 'bg-emerald-50/40 dark:bg-emerald-950/20 border-2 border-emerald-500/70 text-emerald-900 dark:text-emerald-200';
                            badgeStyle = 'bg-emerald-500/20 text-emerald-800 border border-emerald-500/40';
                          } else {
                            cardStyle = 'opacity-40 border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40';
                            badgeStyle = 'bg-stone-100 text-stone-400 dark:bg-stone-800';
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={isLocked || isSubmitting}
                            onClick={(e) => handleEvaluateAnswer(q, optText, e.currentTarget)}
                            className={`w-full min-h-[54px] p-3.5 sm:p-4 rounded-2xl border text-left text-sm sm:text-[15px] transition-all flex items-center gap-3.5 box-border ${
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

                            <span className="flex-1 leading-relaxed break-words font-medium">
                              {optText}
                            </span>

                            {/* Correct Answer Badge when revealed */}
                            {isLocked && !feedback?.isCorrect && isCorrectOption && (
                              <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300 uppercase px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 shrink-0">
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

                        let cardStyle = 'bg-white dark:bg-stone-900/90 border-stone-200/90 dark:border-stone-700/80 hover:border-[#026fc3] hover:bg-sky-50/30 text-slate-800 dark:text-slate-100';
                        let icon = choice === 'True' ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-500" />;

                        if (isLocked) {
                          if (isSelected) {
                            if (feedback?.isCorrect) {
                              cardStyle = 'bg-emerald-50/90 dark:bg-emerald-950/40 border-2 border-emerald-500 text-emerald-950 dark:text-emerald-100 shadow-xs';
                            } else {
                              cardStyle = 'bg-rose-50/90 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-950 dark:text-rose-100 shadow-xs';
                            }
                          } else if (!feedback?.isCorrect && isCorrectChoice) {
                            cardStyle = 'bg-emerald-50/40 dark:bg-emerald-950/20 border-2 border-emerald-500/70 text-emerald-900 dark:text-emerald-200';
                          } else {
                            cardStyle = 'opacity-40 border-stone-200 dark:border-stone-800 bg-stone-50/50';
                          }
                        }

                        return (
                          <button
                            key={choice}
                            type="button"
                            disabled={isLocked || isSubmitting}
                            onClick={(e) => handleEvaluateAnswer(q, choice, e.currentTarget)}
                            className={`p-4 rounded-2xl border text-center text-sm font-black transition-all flex items-center justify-center gap-2 ${
                              isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                            } ${cardStyle}`}
                          >
                            <span>{icon}</span>
                            <span className="uppercase tracking-wider">{choice}</span>
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
                      <div className="flex items-center gap-2">
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
                          className={`flex-1 px-4 py-3 rounded-2xl border text-sm font-medium focus:ring-2 focus:ring-[#026fc3] focus:border-[#026fc3] focus:outline-none transition-all selection:bg-sky-500 selection:text-white ${
                            isLocked
                              ? feedback?.isCorrect
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-950 dark:bg-emerald-950/60 dark:border-emerald-500 dark:text-emerald-100'
                                : 'bg-rose-50 border-rose-500 text-rose-950 dark:bg-rose-950/60 dark:border-rose-500 dark:text-rose-100'
                              : 'bg-white text-slate-900 placeholder:text-stone-400 border-stone-200 dark:bg-[#182232] dark:text-white dark:placeholder:text-stone-400 dark:border-slate-700 caret-[#026fc3] dark:caret-white'
                          }`}
                        />
                        {!isLocked && (
                          <button
                            type="button"
                            disabled={!textInputs[qId]?.trim() || isSubmitting}
                            onClick={(e) => handleEvaluateAnswer(q, textInputs[qId] || '', e.currentTarget)}
                            className="px-5 py-3 rounded-2xl bg-[#026fc3] hover:bg-[#03589e] text-white text-xs font-black transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-xs"
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
                  {qType === 'matching' && (
                    <div className="pt-1 space-y-3">
                      <div className="space-y-2">
                        {optionsList.map((pairStr, pIdx) => (
                          <div key={pIdx} className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs">
                            <span className="font-bold">{pairStr.split('->')[0]?.trim()}</span>
                            <span className="text-[#026fc3] font-bold">⇄</span>
                            <span className="font-medium">{pairStr.split('->')[1]?.trim()}</span>
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
                      className={`p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed border transition-all animate-in fade-in duration-200 ${
                        feedback.isCorrect
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                          : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-black mb-1.5">
                        {feedback.isCorrect ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>✓ Correct! Excellent work.</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>✕ Not quite.</span>
                          </>
                        )}
                      </div>

                      {!feedback.isCorrect && q.correct_answer && (
                        <p className="font-bold text-slate-900 dark:text-white mb-1">
                          Correct Answer: <span className="text-emerald-700 dark:text-emerald-300">{q.correct_answer}</span>
                        </p>
                      )}

                      <p className="opacity-90 leading-relaxed font-medium">
                        {q.explanation || (feedback.isCorrect ? 'Your answer is correct based on the lesson.' : 'Review the lesson material to strengthen your understanding.')}
                      </p>
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
            <div className="w-full bg-linear-to-b from-sky-50 to-white dark:from-stone-900 dark:to-stone-950 rounded-3xl p-6 sm:p-8 border border-sky-200 dark:border-slate-800 shadow-md text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-14 h-14 rounded-2xl bg-[#026fc3] text-white flex items-center justify-center mx-auto shadow-md">
                <Award className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#026fc3]">
                  Lesson Practice Completed
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  Great job! You finished all practice questions.
                </h3>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                <div className="p-3 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Score</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">{earnedPoints} / {totalPointsPossible}</span>
                </div>
                <div className="p-3 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Correct</span>
                  <span className="text-lg font-black text-emerald-600">{correctTotal}</span>
                </div>
                <div className="p-3 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Incorrect</span>
                  <span className="text-lg font-black text-rose-500">{incorrectTotal}</span>
                </div>
              </div>

              {onCompleteLesson && (
                <button
                  type="button"
                  onClick={onCompleteLesson}
                  className="px-6 py-3 rounded-2xl bg-[#026fc3] hover:bg-[#03589e] text-white font-black text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Next Lesson</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

        </section>
      )}

    </div>
  );
};
