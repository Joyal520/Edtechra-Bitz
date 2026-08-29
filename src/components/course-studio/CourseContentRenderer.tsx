// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: MOBILE-FIRST EDITORIAL CONTENT RENDERER
// Apple Books & Kindle inspired reading-first digital lesson layout.
// Guarantees zero horizontal overflow, responsive single-column mobile flow,
// large editorial typography, and seamless activity transitions.
// ============================================================================

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  Check
} from 'lucide-react';
import { CourseBlock, CourseQuestion } from '@/types/courseStudio';
import { FormattedLessonText, TextScale } from '@/utils/courseTextFormatting';

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
  userAnswers?: Record<string, string>;
  feedbackState?: Record<string, { isCorrect: boolean; showExplanation: boolean; selected: string }>;
}

export const CourseContentRenderer: React.FC<Props> = ({
  blocks = [],
  questions = [],
  textScale = 'md',
  onQuestionAnswer,
  userAnswers = {},
  feedbackState = {}
}) => {
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>(userAnswers);
  const [localFeedback, setLocalFeedback] = useState<Record<string, { isCorrect: boolean; showExplanation: boolean; selected: string }>>(feedbackState);

  const handleSelectOption = (question: CourseQuestion, optionText: string) => {
    const isCorrect = optionText.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
    const pointsAwarded = isCorrect ? (question.points || 10) : 0;

    setLocalAnswers(prev => ({ ...prev, [question.id]: optionText }));
    setLocalFeedback(prev => ({
      ...prev,
      [question.id]: {
        isCorrect,
        showExplanation: true,
        selected: optionText
      }
    }));

    if (onQuestionAnswer) {
      onQuestionAnswer(question.id, optionText, isCorrect, pointsAwarded, question);
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

  return (
    <div className="w-full max-w-[760px] mx-auto space-y-10 sm:space-y-14 py-2 antialiased font-sans text-inherit box-border overflow-x-hidden">
      
      {/* 1. STORY & LESSON CONTENT STREAM */}
      <div className="w-full space-y-8 sm:space-y-12">
        {blocks.map((block, idx) => {
          const { block_type, content } = block;

          // ------------------------------------------------------------------
          // A. PURE TEXT SECTION
          // ------------------------------------------------------------------
          if (block_type === 'text' && !(content as any)?.image?.url && !(content as any)?.video?.url) {
            const textContent = content as any;
            const bodyText = textContent?.text || textContent?.markdown || '';

            if (!bodyText.trim() && !textContent?.title) return null;

            return (
              <section key={block.id || idx} className="w-full space-y-3">
                {textContent?.title && (
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-inherit pt-2 pb-1 border-b border-current/10 opacity-90 text-left">
                    {textContent.title}
                  </h3>
                )}
                <FormattedLessonText text={bodyText} textScale={textScale} />
              </section>
            );
          }

          // ------------------------------------------------------------------
          // B. COMBINED TEXT + IMAGE SECTION (Editorial story illustration)
          // On mobile (< md): Image is ALWAYS 100% width ABOVE the text!
          // On desktop (>= md): Floats left/right or full-width above/below.
          // ------------------------------------------------------------------
          if (block_type === 'text_image' || (block_type === 'text' && (content as any)?.image?.url)) {
            const item = content as any;
            const img = item.image || {};
            const bodyText = item.text || item.markdown || '';
            const pos = img.position || 'above';

            return (
              <section key={block.id || idx} className="w-full space-y-5 clear-both">
                {item.title && (
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-inherit pt-2 pb-1 border-b border-current/10 opacity-90 text-left">
                    {item.title}
                  </h3>
                )}

                {/* Mobile-First Image: If above, or on mobile for left/right */}
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
                      <figcaption className="text-xs sm:text-sm text-center mt-2.5 italic opacity-75 leading-relaxed font-serif">
                        {img.caption}
                      </figcaption>
                    )}
                  </figure>
                )}

                {/* Body Text */}
                <FormattedLessonText text={bodyText} textScale={textScale} />

                {/* Image Position: BELOW */}
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
                      <figcaption className="text-xs sm:text-sm text-center mt-2.5 italic opacity-75 leading-relaxed font-serif">
                        {img.caption}
                      </figcaption>
                    )}
                  </figure>
                )}
              </section>
            );
          }

          // ------------------------------------------------------------------
          // C. COMBINED TEXT + VIDEO SECTION
          // ------------------------------------------------------------------
          if (block_type === 'text_video' || (block_type === 'text' && (content as any)?.video?.url)) {
            const item = content as any;
            const vid = item.video || {};
            const bodyText = item.text || item.markdown || '';
            const pos = vid.position || 'above';
            const embedUrl = getYouTubeEmbedUrl(vid.url || vid.video_id);

            return (
              <section key={block.id || idx} className="w-full space-y-5 clear-both">
                {item.title && (
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-inherit pt-2 pb-1 border-b border-current/10 opacity-90 text-left">
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

          // ------------------------------------------------------------------
          // D. STANDALONE IMAGE SECTION
          // ------------------------------------------------------------------
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
                  <figcaption className="text-xs sm:text-sm text-center mt-2.5 italic opacity-75 font-serif">
                    {imgContent.caption}
                  </figcaption>
                )}
              </figure>
            );
          }

          // ------------------------------------------------------------------
          // E. STANDALONE YOUTUBE / VIDEO (16:9)
          // ------------------------------------------------------------------
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
                  <figcaption className="text-xs sm:text-sm text-center italic opacity-75 font-serif">
                    {yt.title}
                  </figcaption>
                )}
              </figure>
            );
          }

          // ------------------------------------------------------------------
          // F. STANDALONE YOUTUBE SHORTS (9:16 Vertical Player)
          // ------------------------------------------------------------------
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
                  <figcaption className="text-xs sm:text-sm text-center mt-2.5 italic opacity-75 font-serif">
                    {yt.title}
                  </figcaption>
                )}
              </figure>
            );
          }

          return null;
        })}
      </div>

      {/* 2. ACTIVITY TRANSITION (Seamless Editorial Book Transition) */}
      {questions.length > 0 && (
        <section className="w-full pt-8 sm:pt-14 border-t border-current/15 space-y-6 sm:space-y-8">
          
          {/* Editorial Section Divider & Title */}
          <div className="text-center space-y-1.5 pb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-current/5 text-[11px] font-bold uppercase tracking-widest opacity-80">
              <Sparkles className="w-3.5 h-3.5 text-[#026fc3]" />
              <span>Comprehension & Reflection</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-inherit">
              Think About the Story
            </h3>
            <p className="text-sm sm:text-base opacity-75 max-w-md mx-auto font-serif italic">
              Reflect on what you’ve read and check your understanding.
            </p>
          </div>

          {/* Interactive Editorial Questions */}
          <div className="w-full space-y-6 sm:space-y-8">
            {questions.map((q, qIndex) => {
              const feedback = localFeedback[q.id];
              const selectedAnswer = localAnswers[q.id];
              const isAnswered = Boolean(selectedAnswer);

              // Normalize options array
              const optionsList: string[] = Array.isArray(q.options)
                ? q.options.map(opt => (typeof opt === 'string' ? opt : (opt as any)?.text || ''))
                : [];

              return (
                <div
                  key={q.id || qIndex}
                  className="w-full rounded-2xl p-5 sm:p-7 bg-current/3 border border-current/10 space-y-4 transition-all box-border"
                >
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#026fc3]">
                        Question {qIndex + 1}
                      </span>
                      <h4 className="text-base sm:text-lg md:text-xl font-bold text-inherit leading-snug text-left">
                        {q.question_text}
                      </h4>
                    </div>
                    {q.points && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-bold shrink-0">
                        {q.points} pts
                      </span>
                    )}
                  </div>

                  {/* Options List */}
                  <div className="w-full space-y-2 pt-1">
                    {optionsList.map((optText, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isSelected = selectedAnswer === optText;
                      const isCorrectAnswer = optText.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();

                      let btnStyle = 'bg-white/80 dark:bg-stone-800/80 border-current/15 hover:border-current/30 text-inherit hover:bg-white dark:hover:bg-stone-800';

                      if (isAnswered) {
                        if (isSelected && feedback?.isCorrect) {
                          btnStyle = 'bg-emerald-500/15 border-emerald-600 text-emerald-950 dark:text-emerald-200 font-bold';
                        } else if (isSelected && !feedback?.isCorrect) {
                          btnStyle = 'bg-rose-500/15 border-rose-600 text-rose-950 dark:text-rose-200 font-bold';
                        } else if (isCorrectAnswer) {
                          btnStyle = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-300';
                        } else {
                          btnStyle = 'opacity-40 border-current/10';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(q, optText)}
                          className={`w-full p-3.5 sm:p-4 rounded-xl border text-left text-sm sm:text-base transition-all flex items-center gap-3 cursor-pointer shadow-2xs box-border ${btnStyle}`}
                        >
                          <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                            isSelected
                              ? feedback?.isCorrect
                                ? 'bg-emerald-600 text-white'
                                : 'bg-rose-600 text-white'
                              : 'bg-current/10 text-inherit'
                          }`}>
                            {isSelected ? (
                              feedback?.isCorrect ? <Check className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />
                            ) : (
                              letter
                            )}
                          </span>
                          <span className="flex-1 leading-relaxed break-words">{optText}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Immediate Explanation Callout */}
                  {feedback?.showExplanation && (
                    <div
                      className={`p-3.5 sm:p-4 rounded-xl text-xs sm:text-sm leading-relaxed border transition-all animate-in fade-in duration-200 ${
                        feedback.isCorrect
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        {feedback.isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{feedback.isCorrect ? 'Well done!' : 'Keep trying!'}</span>
                      </div>
                      <p className="opacity-90">
                        {q.explanation || (feedback.isCorrect ? 'Your answer is correct.' : `The correct answer is: ${q.correct_answer}.`)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </section>
      )}

    </div>
  );
};
