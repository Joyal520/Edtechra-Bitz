// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: SHARED COURSE CONTENT RENDERER
// Unified responsive content block renderer for Text, R2 Images, YouTube Videos,
// YouTube Shorts (Vertical 9:16), and Interactive Question Sets.
// Shared identically between Teacher Preview and Student Learning Player.
// ============================================================================

import React, { useState } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Play,
  Sparkles,
  Award,
  BookOpen
} from 'lucide-react';
import { CourseBlock, CourseQuestion } from '@/types/courseStudio';

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
  isStudentView = false,
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

  const getYouTubeEmbedUrl = (urlOrId: string, _isShort: boolean = false) => {
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
      // fallback to raw id
    }

    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto py-2">
      {/* 1. CONTENT BLOCKS STREAM */}
      {blocks.map((block, idx) => {
        const { block_type, content } = block;

        // --- TEXT BLOCK ---
        if (block_type === 'text') {
          const textContent = content as any;
          return (
            <section
              key={block.id || idx}
              className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-4"
            >
              {textContent?.title && (
                <div className="flex items-center gap-2.5 pb-2 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#026fc3] flex items-center justify-center font-bold text-sm">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    {textContent.title}
                  </h3>
                </div>
              )}
              <div className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line space-y-3">
                {textContent?.text || textContent?.markdown || ''}
              </div>
            </section>
          );
        }

        // --- IMAGE BLOCK ---
        if (block_type === 'image') {
          const imgContent = content as any;
          if (!imgContent?.url) return null;

          return (
            <figure
              key={block.id || idx}
              className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs space-y-3 overflow-hidden text-center"
            >
              <div className="relative rounded-xl overflow-hidden bg-stone-100 max-h-[520px] flex items-center justify-center">
                <img
                  src={imgContent.url}
                  alt={imgContent.alt || imgContent.caption || 'Course visual material'}
                  className="max-h-[520px] w-auto max-w-full object-contain rounded-xl transition-transform hover:scale-[1.01]"
                  loading="lazy"
                />
              </div>
              {imgContent.caption && (
                <figcaption className="text-xs text-slate-500 font-semibold px-2">
                  {imgContent.caption}
                </figcaption>
              )}
            </figure>
          );
        }

        // --- YOUTUBE STANDARD VIDEO BLOCK ---
        if (block_type === 'youtube_video') {
          const yt = content as any;
          const embedUrl = getYouTubeEmbedUrl(yt?.url || yt?.video_id, false);

          return (
            <div
              key={block.id || idx}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/80 shadow-xs space-y-3"
            >
              {yt?.title && (
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Play className="w-4 h-4 text-rose-500 fill-rose-500" />
                  <span>{yt.title}</span>
                </h4>
              )}
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner">
                <iframe
                  src={embedUrl}
                  title={yt?.title || 'Course Video Lesson'}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          );
        }

        // --- YOUTUBE SHORTS (VERTICAL 9:16) BLOCK ---
        if (block_type === 'youtube_short') {
          const yt = content as any;
          const embedUrl = getYouTubeEmbedUrl(yt?.url || yt?.video_id, true);

          return (
            <div
              key={block.id || idx}
              className="bg-[#0a192f] text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4 text-center max-w-md mx-auto"
            >
              <div className="flex items-center justify-center gap-2">
                <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 rounded-full text-xs font-black uppercase tracking-wider border border-rose-500/30 flex items-center gap-1.5">
                  <Play className="w-3 h-3 fill-rose-400 text-rose-400" />
                  <span>Quick Lesson Short</span>
                </span>
              </div>
              {yt?.title && (
                <h4 className="text-base font-black text-white">{yt.title}</h4>
              )}
              <div className="relative aspect-[9/16] w-full max-w-[320px] mx-auto rounded-2xl overflow-hidden bg-black shadow-2xl border border-slate-700">
                <iframe
                  src={embedUrl}
                  title={yt?.title || 'YouTube Short Lesson'}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          );
        }

        return null;
      })}

      {/* 2. INTERACTIVE QUESTIONS SECTION */}
      {questions.length > 0 && (
        <section className="space-y-6 pt-4">
          <div className="flex items-center justify-between gap-4 border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                <HelpCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Concept Practice & Check
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {questions.length} questions • Test your understanding
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
              <Award className="w-4 h-4 text-amber-600" />
              <span>{questions.reduce((s, q) => s + (q.points || 10), 0)} XP Total</span>
            </div>
          </div>

          <div className="space-y-6">
            {questions.map((q, qIndex) => {
              const currentFeedback = localFeedback[q.id];
              const selectedAnswer = localAnswers[q.id];
              const rawOptions: any = q.options;
              const options: string[] = Array.isArray(rawOptions)
                ? rawOptions.map(o => (typeof o === 'string' ? o : o.text || ''))
                : [];

              return (
                <div
                  key={q.id || qIndex}
                  className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-xs space-y-4 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 text-slate-600 text-[11px] font-black uppercase tracking-wider">
                          Q{qIndex + 1}
                        </span>
                        {q.concept && (
                          <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-[#026fc3] text-[11px] font-bold border border-sky-100">
                            {q.concept}
                          </span>
                        )}
                        {q.difficulty && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              q.difficulty === 'easy'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : q.difficulty === 'hard'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}
                          >
                            {q.difficulty}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                        {q.question_text}
                      </h4>
                    </div>
                    <span className="text-xs font-black text-slate-400 shrink-0">
                      +{q.points || 10} XP
                    </span>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {options.map((optText, optIdx) => {
                      const isSelected = selectedAnswer === optText;
                      const isOptionCorrect = optText.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();

                      let btnStyle = 'bg-stone-50 border-stone-200/80 text-slate-700 hover:bg-sky-50/50 hover:border-sky-200';

                      if (currentFeedback) {
                        if (isSelected && currentFeedback.isCorrect) {
                          btnStyle = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-black shadow-xs';
                        } else if (isSelected && !currentFeedback.isCorrect) {
                          btnStyle = 'bg-rose-50 border-rose-400 text-rose-900 font-black';
                        } else if (!isSelected && isOptionCorrect) {
                          btnStyle = 'bg-emerald-50/60 border-emerald-300 text-emerald-800 font-bold';
                        } else {
                          btnStyle = 'bg-stone-50/40 border-stone-100 text-slate-400';
                        }
                      } else if (isSelected) {
                        btnStyle = 'bg-[#026fc3] text-white border-[#026fc3] font-black shadow-xs';
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={Boolean(currentFeedback && isStudentView)}
                          onClick={() => handleSelectOption(q, optText)}
                          className={`p-3.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between gap-3 cursor-pointer ${btnStyle}`}
                        >
                          <span>{optText}</span>
                          {currentFeedback && isSelected && (
                            currentFeedback.isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            )
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Feedback Explanation */}
                  {currentFeedback?.showExplanation && (
                    <div
                      className={`p-4 rounded-xl text-xs font-medium space-y-1.5 border ${
                        currentFeedback.isCorrect
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50/80 border-rose-200 text-rose-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-black">
                        {currentFeedback.isCorrect ? (
                          <>
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                            <span>Correct! Excellent comprehension.</span>
                          </>
                        ) : (
                          <>
                            <HelpCircle className="w-4 h-4 text-rose-600" />
                            <span>Not quite right. Correct answer: {q.correct_answer}</span>
                          </>
                        )}
                      </div>
                      {q.explanation && (
                        <p className="leading-relaxed text-slate-700 pl-6 border-l-2 border-stone-300">
                          {q.explanation}
                        </p>
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
