// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: PREMIUM COURSE CONTENT RENDERER
// High-readability editorial layout (14px body text, comfortable 1.75 line-height,
// controlled 760px reading width, wrapped Text + Image, Text + Video, and interactive questions).
// Shared identically between Teacher Preview and Student Learning Player.
// ============================================================================

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CourseBlock, CourseQuestion } from '@/types/courseStudio';
import { FormattedLessonText } from '@/utils/courseTextFormatting';

interface Props {
  blocks: CourseBlock[];
  questions?: CourseQuestion[];
  isStudentView?: boolean;
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
  onQuestionAnswer,
  userAnswers = {},
  feedbackState = {}
}) => {
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>(userAnswers);
  const [localFeedback, setLocalFeedback] = useState<Record<string, { isCorrect: boolean; showExplanation: boolean; selected: string }>>(feedbackState);
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});

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
    setExpandedExplanations(prev => ({ ...prev, [question.id]: true }));

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

  const getImageSizeClass = (size?: string, isFloated: boolean = false) => {
    if (isFloated) {
      if (size === 'small') return 'w-[28%] min-w-[180px] max-w-[240px]';
      if (size === 'large') return 'w-[52%] min-w-[300px] max-w-[440px]';
      return 'w-[38%] min-w-[240px] max-w-[320px]'; // medium default
    }

    if (size === 'small') return 'max-w-xs mx-auto';
    if (size === 'medium') return 'max-w-md mx-auto';
    return 'w-full'; // large
  };

  return (
    <div className="max-w-[760px] mx-auto space-y-7 py-2 text-slate-800 antialiased font-sans">
      
      {/* 1. CONTENT BLOCKS STREAM */}
      {blocks.map((block, idx) => {
        const { block_type, content } = block;

        // --------------------------------------------------------------------
        // A. PURE TEXT SECTION
        // --------------------------------------------------------------------
        if (block_type === 'text' && !(content as any)?.image?.url && !(content as any)?.video?.url) {
          const textContent = content as any;
          const bodyText = textContent?.text || textContent?.markdown || '';

          if (!bodyText.trim() && !textContent?.title) return null;

          return (
            <section key={block.id || idx} className="space-y-3 pt-2">
              {textContent?.title && (
                <h3 className="text-[17px] font-extrabold text-slate-900 tracking-tight flex items-center gap-2 pb-1 border-b border-stone-200/50">
                  <span className="w-1.5 h-4 bg-[#026fc3] rounded-full inline-block" />
                  <span>{textContent.title}</span>
                </h3>
              )}
              <FormattedLessonText text={bodyText} />
            </section>
          );
        }

        // --------------------------------------------------------------------
        // B. COMBINED TEXT + IMAGE SECTION (Image wraps inside text flow)
        // --------------------------------------------------------------------
        if (block_type === 'text_image' || (block_type === 'text' && (content as any)?.image?.url)) {
          const item = content as any;
          const img = item.image || {};
          const bodyText = item.text || item.markdown || '';
          const pos = img.position || 'right';
          const size = img.size || 'medium';

          return (
            <section key={block.id || idx} className="space-y-3 pt-2 clear-both">
              {item.title && (
                <h3 className="text-[17px] font-extrabold text-slate-900 tracking-tight flex items-center gap-2 pb-1 border-b border-stone-200/50">
                  <span className="w-1.5 h-4 bg-[#026fc3] rounded-full inline-block" />
                  <span>{item.title}</span>
                </h3>
              )}

              {/* Position: ABOVE */}
              {pos === 'above' && img.url && (
                <figure className={`mb-4 overflow-hidden ${getImageSizeClass(size, false)}`}>
                  <div className="rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/70 shadow-2xs">
                    <img
                      src={img.url}
                      alt={img.alt || img.caption || 'Lesson visual'}
                      className="w-full h-auto object-cover max-h-[420px]"
                      loading="lazy"
                    />
                  </div>
                  {img.caption && (
                    <figcaption className="text-[12px] text-slate-500 font-medium text-center mt-1.5 leading-relaxed">
                      {img.caption}
                    </figcaption>
                  )}
                </figure>
              )}

              {/* Floated layout for LEFT / RIGHT wrapping */}
              <div className="clearfix">
                {pos === 'left' && img.url && (
                  <figure className={`float-left mr-5 sm:mr-6 mb-3 sm:mb-4 max-sm:float-none max-sm:w-full max-sm:mr-0 max-sm:mb-4 ${getImageSizeClass(size, true)}`}>
                    <div className="rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/70 shadow-2xs">
                      <img
                        src={img.url}
                        alt={img.alt || img.caption || 'Lesson visual'}
                        className="w-full h-auto object-cover max-h-[380px]"
                        loading="lazy"
                      />
                    </div>
                    {img.caption && (
                      <figcaption className="text-[12px] text-slate-500 font-medium text-center mt-1.5 leading-relaxed">
                        {img.caption}
                      </figcaption>
                    )}
                  </figure>
                )}

                {pos === 'right' && img.url && (
                  <figure className={`float-right ml-5 sm:ml-6 mb-3 sm:mb-4 max-sm:float-none max-sm:w-full max-sm:ml-0 max-sm:mb-4 ${getImageSizeClass(size, true)}`}>
                    <div className="rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/70 shadow-2xs">
                      <img
                        src={img.url}
                        alt={img.alt || img.caption || 'Lesson visual'}
                        className="w-full h-auto object-cover max-h-[380px]"
                        loading="lazy"
                      />
                    </div>
                    {img.caption && (
                      <figcaption className="text-[12px] text-slate-500 font-medium text-center mt-1.5 leading-relaxed">
                        {img.caption}
                      </figcaption>
                    )}
                  </figure>
                )}

                <FormattedLessonText text={bodyText} />
              </div>

              {/* Position: BELOW */}
              {pos === 'below' && img.url && (
                <figure className={`mt-4 overflow-hidden ${getImageSizeClass(size, false)}`}>
                  <div className="rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/70 shadow-2xs">
                    <img
                      src={img.url}
                      alt={img.alt || img.caption || 'Lesson visual'}
                      className="w-full h-auto object-cover max-h-[420px]"
                      loading="lazy"
                    />
                  </div>
                  {img.caption && (
                    <figcaption className="text-[12px] text-slate-500 font-medium text-center mt-1.5 leading-relaxed">
                      {img.caption}
                    </figcaption>
                  )}
                </figure>
              )}
            </section>
          );
        }

        // --------------------------------------------------------------------
        // C. COMBINED TEXT + VIDEO SECTION
        // --------------------------------------------------------------------
        if (block_type === 'text_video' || (block_type === 'text' && (content as any)?.video?.url)) {
          const item = content as any;
          const vid = item.video || {};
          const bodyText = item.text || item.markdown || '';
          const pos = vid.position || 'right';
          const embedUrl = getYouTubeEmbedUrl(vid.url || vid.video_id);

          return (
            <section key={block.id || idx} className="space-y-3 pt-2 clear-both">
              {item.title && (
                <h3 className="text-[17px] font-extrabold text-slate-900 tracking-tight flex items-center gap-2 pb-1 border-b border-stone-200/50">
                  <span className="w-1.5 h-4 bg-[#026fc3] rounded-full inline-block" />
                  <span>{item.title}</span>
                </h3>
              )}

              {/* Position: ABOVE */}
              {pos === 'above' && embedUrl && (
                <div className="mb-4 rounded-2xl overflow-hidden bg-black border border-stone-200/80 shadow-2xs aspect-video max-w-lg mx-auto">
                  <iframe
                    src={embedUrl}
                    title={vid.title || 'Lesson Video'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              )}

              <div className="clearfix">
                {pos === 'left' && embedUrl && (
                  <div className="float-left mr-5 sm:mr-6 mb-3 sm:mb-4 w-[45%] min-w-[260px] max-w-[340px] max-sm:float-none max-sm:w-full max-sm:mr-0">
                    <div className="rounded-2xl overflow-hidden bg-black border border-stone-200/80 shadow-2xs aspect-video">
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

                {pos === 'right' && embedUrl && (
                  <div className="float-right ml-5 sm:ml-6 mb-3 sm:mb-4 w-[45%] min-w-[260px] max-w-[340px] max-sm:float-none max-sm:w-full max-sm:ml-0">
                    <div className="rounded-2xl overflow-hidden bg-black border border-stone-200/80 shadow-2xs aspect-video">
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

                <FormattedLessonText text={bodyText} />
              </div>

              {/* Position: BELOW */}
              {pos === 'below' && embedUrl && (
                <div className="mt-4 rounded-2xl overflow-hidden bg-black border border-stone-200/80 shadow-2xs aspect-video max-w-lg mx-auto">
                  <iframe
                    src={embedUrl}
                    title={vid.title || 'Lesson Video'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              )}
            </section>
          );
        }

        // --------------------------------------------------------------------
        // D. STANDALONE IMAGE SECTION
        // --------------------------------------------------------------------
        if (block_type === 'image') {
          const imgContent = content as any;
          if (!imgContent?.url) return null;

          return (
            <figure key={block.id || idx} className="my-5 overflow-hidden text-center">
              <div className="relative rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/70 shadow-2xs max-w-xl mx-auto">
                <img
                  src={imgContent.url}
                  alt={imgContent.alt || imgContent.caption || 'Course visual material'}
                  className="w-full h-auto object-contain max-h-[460px]"
                  loading="lazy"
                />
              </div>
              {imgContent.caption && (
                <figcaption className="text-[12px] text-slate-500 font-medium text-center mt-2 leading-relaxed">
                  {imgContent.caption}
                </figcaption>
              )}
            </figure>
          );
        }

        // --------------------------------------------------------------------
        // E. STANDALONE YOUTUBE STANDARD VIDEO (16:9)
        // --------------------------------------------------------------------
        if (block_type === 'youtube_video') {
          const yt = content as any;
          const embedUrl = getYouTubeEmbedUrl(yt?.url || yt?.video_id);

          return (
            <figure key={block.id || idx} className="my-5 space-y-2">
              <div className="relative rounded-2xl overflow-hidden bg-black border border-stone-200/80 shadow-2xs aspect-video max-w-2xl mx-auto">
                <iframe
                  src={embedUrl}
                  title={yt.title || 'Lesson Video'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
              {yt.title && (
                <figcaption className="text-[12px] text-slate-500 font-medium text-center">
                  {yt.title}
                </figcaption>
              )}
            </figure>
          );
        }

        // --------------------------------------------------------------------
        // F. STANDALONE YOUTUBE SHORTS (9:16 Vertical Player)
        // --------------------------------------------------------------------
        if (block_type === 'youtube_short') {
          const yt = content as any;
          const embedUrl = getYouTubeEmbedUrl(yt?.url || yt?.video_id);

          return (
            <figure key={block.id || idx} className="my-5 flex flex-col items-center">
              <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-stone-800 shadow-md w-[260px] sm:w-[280px] aspect-[9/16]">
                <iframe
                  src={embedUrl}
                  title={yt.title || 'YouTube Short Lesson'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
              {yt.title && (
                <figcaption className="text-[12px] text-slate-500 font-medium text-center mt-2">
                  {yt.title}
                </figcaption>
              )}
            </figure>
          );
        }

        return null;
      })}

      {/* -------------------------------------------------------------------- */}
      {/* 2. INTERACTIVE PRACTICE QUESTIONS SECTION                             */}
      {/* -------------------------------------------------------------------- */}
      {questions.length > 0 && (
        <section className="pt-6 mt-8 border-t border-stone-200/80 space-y-6">
          <div className="flex items-center justify-between pb-1">
            <div className="space-y-0.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#026fc3]">
                Interactive Practice
              </span>
              <h3 className="text-[18px] font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#fbbf24]" />
                <span>Check Your Understanding</span>
              </h3>
            </div>
            <span className="text-[12px] font-bold text-slate-500 bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200">
              {questions.length} Questions
            </span>
          </div>

          <div className="space-y-5">
            {questions.map((q, qIndex) => {
              const selectedAnswer = localAnswers[q.id];
              const fb = localFeedback[q.id];
              const isAnswered = !!selectedAnswer;
              const options = Array.isArray(q.options)
                ? q.options.map(opt => (typeof opt === 'string' ? opt : opt.text))
                : [];

              return (
                <div
                  key={q.id || qIndex}
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/80 shadow-2xs space-y-4 transition-all"
                >
                  {/* Question Header & Concept Tags */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-sky-50 text-[#026fc3] font-black text-xs flex items-center justify-center shrink-0 mt-0.5 border border-sky-100">
                        {qIndex + 1}
                      </span>
                      <p className="text-[15px] font-bold text-slate-900 leading-snug">
                        {q.question_text}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {q.concept && (
                        <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-stone-100 text-slate-600 text-[11px] font-bold">
                          {q.concept}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-100">
                        +{q.points || 10} XP
                      </span>
                    </div>
                  </div>

                  {/* Multiple Choice Options */}
                  <div className="space-y-2 pt-1">
                    {options.map((opt, oIdx) => {
                      const isSelected = selectedAnswer === opt;
                      const isCorrectOpt = opt.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();

                      let btnStyle = 'bg-stone-50/80 hover:bg-stone-100/90 text-slate-800 border-stone-200/80';
                      let icon = null;

                      if (isAnswered) {
                        if (isCorrectOpt) {
                          btnStyle = 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold';
                          icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
                        } else if (isSelected && !fb?.isCorrect) {
                          btnStyle = 'bg-rose-50 text-rose-900 border-rose-300 font-bold';
                          icon = <XCircle className="w-4 h-4 text-rose-600 shrink-0" />;
                        } else {
                          btnStyle = 'bg-stone-50/50 text-slate-400 border-stone-100 opacity-60';
                        }
                      }

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          disabled={isAnswered}
                          onClick={() => handleSelectOption(q, opt)}
                          className={`w-full p-3 rounded-xl border text-left text-[14px] font-medium transition-all flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default ${btnStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-md bg-white text-slate-500 font-black text-[11px] flex items-center justify-center border border-stone-200 shrink-0">
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span>{opt}</span>
                          </div>
                          {icon}
                        </button>
                      );
                    })}
                  </div>

                  {/* Immediate Feedback Banner & Explanation */}
                  {fb && (
                    <div className="pt-2 space-y-2 animate-in fade-in duration-200">
                      <div
                        className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 border ${
                          fb.isCorrect
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                            : 'bg-rose-50/80 border-rose-200 text-rose-900'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {fb.isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <span>
                            {fb.isCorrect
                              ? 'Correct! Well done.'
                              : `Incorrect. The correct answer is: "${q.correct_answer}"`}
                          </span>
                        </div>

                        {q.explanation && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedExplanations(prev => ({
                                ...prev,
                                [q.id]: !prev[q.id]
                              }))
                            }
                            className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-0.5 cursor-pointer underline underline-offset-2"
                          >
                            <span>{expandedExplanations[q.id] ? 'Hide Explanation' : 'Why?'}</span>
                            {expandedExplanations[q.id] ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>

                      {expandedExplanations[q.id] && q.explanation && (
                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70 text-[13px] text-slate-700 leading-relaxed font-medium">
                          <p>
                            <span className="font-bold text-slate-900">Explanation: </span>
                            {q.explanation}
                          </p>
                        </div>
                      )}
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
