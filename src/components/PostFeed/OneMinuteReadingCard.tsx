import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Clock,
  Sparkles,
  ChevronRight,
  X,
  Volume2,
  CheckCircle2,
  HelpCircle,
  Check,
  AlertCircle
} from 'lucide-react';
import { ReadingBit, ReadingVocabulary } from '@/types';
import { readingService } from '@/services/readingService';
import { useAuth } from '@/context/AuthContext';
import { triggerConfetti } from '@/utils/confetti';

interface OneMinuteReadingCardProps {
  reading: ReadingBit;
  onCompleted?: (readingId: string) => void;
}

export const OneMinuteReadingCard: React.FC<OneMinuteReadingCardProps> = ({
  reading,
  onCompleted
}) => {
  const { session } = useAuth();
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedVocab, setSelectedVocab] = useState<ReadingVocabulary | null>(null);
  const [completed, setCompleted] = useState<boolean>(Boolean(reading.has_completed));
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<number, boolean>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [readingError, setReadingError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const hasImage = Boolean(reading.cover_image_url && reading.cover_image_url.trim());
  const firstParagraph = reading.paragraphs?.[0]?.text || '';
  const excerpt = firstParagraph.length > 160 ? `${firstParagraph.slice(0, 160)}…` : firstParagraph;

  // Start or resume server-authoritative reading timer when modal opens
  useEffect(() => {
    if (!modalOpen || completed) return;
    let active = true;
    const token = session?.access_token || null;

    readingService.startReadingSession(reading.id, token)
      .then(res => {
        if (!active) return;
        if (typeof res.elapsed_seconds === 'number') {
          setElapsedSeconds(res.elapsed_seconds);
        }
        if (res.is_completed) {
          setCompleted(true);
        }
      })
      .catch(() => {});

    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [modalOpen, reading.id, completed, session?.access_token]);

  const handleOpenReader = () => {
    setModalOpen(true);
    setReadingError(null);
  };

  const handleMarkComplete = async () => {
    if (completed || isSubmitting) return;

    if (elapsedSeconds < 60) {
      setReadingError(`Keep reading for a little longer. This reading requires at least 60 seconds (${60 - elapsedSeconds}s remaining).`);
      setTimeout(() => setReadingError(null), 5000);
      return;
    }

    setIsSubmitting(true);
    setReadingError(null);

    try {
      const token = session?.access_token || null;
      const result = await readingService.completeReading(reading.id, token);
      setCompleted(true);
      triggerConfetti();

      // Dispatch authoritative activity completed event so Dashboard & Feed react
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('edtechra:activity_completed', {
          detail: {
            type: 'reading',
            id: reading.id,
            category: reading.category || 'English',
            xp: result.xp_awarded || 15
          }
        }));
      }

      if (onCompleted) onCompleted(reading.id);
    } catch (err: any) {
      setReadingError(err.message || 'Keep reading for a little longer. This reading requires at least 60 seconds.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswerQuestion = (qId: number, option: string) => {
    setQuizAnswers(prev => ({ ...prev, [qId]: option }));
    setQuizSubmitted(prev => ({ ...prev, [qId]: true }));
    triggerConfetti();
  };

  return (
    <>
      <article className="w-full bg-white border border-stone-200/90 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all">
        
        {/* 1. Header Strip */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-4 sm:px-5 py-2.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-xs text-white shadow-2xs">
              📖
            </div>
            <span className="text-xs font-black uppercase tracking-wider">
              1-Minute Reading
            </span>
          </div>

          <div className="flex items-center gap-2">
            {reading.category && (
              <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-extrabold text-white">
                {reading.category}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black shadow-2xs flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-900" />
              {reading.reading_time || 1} min
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/25 text-white text-[10px] font-black">
              {reading.level || 'A2'}
            </span>
          </div>
        </div>

        {/* 2. CARD BODY: State A (With Cover Image) vs State B (Text-First Without Image) */}
        {hasImage ? (
          <div>
            {/* Cover Image Container */}
            <div
              onClick={handleOpenReader}
              className="relative w-full aspect-[16/9] sm:aspect-[2/1] overflow-hidden cursor-pointer group bg-slate-900"
            >
              <img
                src={reading.cover_image_url!}
                alt={reading.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex items-end p-4 sm:p-5">
                <div className="text-white space-y-1">
                  <h3 className="text-base sm:text-lg font-black leading-snug drop-shadow-sm">
                    {reading.title}
                  </h3>
                  {reading.subtitle && (
                    <p className="text-xs sm:text-sm text-slate-200 font-medium line-clamp-1">
                      {reading.subtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Content Preview */}
            <div className="p-4 sm:p-5 space-y-3">
              <p className="text-slate-600 leading-relaxed font-serif italic learning-content-text">
                "{excerpt}"
              </p>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
                  <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                  <span>{reading.paragraphs?.length || 1} paragraphs</span>
                  {reading.vocabulary && reading.vocabulary.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{reading.vocabulary.length} vocab words</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleOpenReader}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer min-h-[36px]"
                >
                  <span>Read Article</span>
                  <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* State B: Text-First Editorial Card (Premium typography layout) */
          <div className="p-5 sm:p-6 space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-teal-600">
                  {reading.category || 'Science & Culture'}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] font-bold text-slate-400">
                  Level {reading.level || 'A2'}
                </span>
              </div>
              <h3
                onClick={handleOpenReader}
                className="text-lg sm:text-xl font-black text-[#0f233a] leading-tight cursor-pointer hover:text-teal-700 transition-colors"
              >
                {reading.title}
              </h3>
              {reading.subtitle && (
                <p className="text-xs sm:text-sm text-slate-500 font-semibold">
                  {reading.subtitle}
                </p>
              )}
            </div>

            {/* Styled Excerpt Box with Editorial Drop-Cap */}
            <div
              onClick={handleOpenReader}
              className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/70 cursor-pointer hover:bg-stone-100/80 transition-colors group"
            >
              <p className="text-slate-700 leading-relaxed font-serif learning-content-text">
                <span className="float-left text-2xl sm:text-3xl font-black text-teal-700 mr-2 leading-none font-serif">
                  {excerpt.charAt(0)}
                </span>
                {excerpt.slice(1)}
              </p>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
                <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                <span>{reading.paragraphs?.length || 1} paragraphs</span>
                {reading.vocabulary && reading.vocabulary.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-teal-700 font-bold">{reading.vocabulary.length} vocab</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleOpenReader}
                className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer min-h-[36px]"
              >
                <span>Read Story</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

      </article>

      {/* ========================================================================= */}
      {/* FULL RESPONSIVE READER MODAL                                              */}
      {/* ========================================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-stone-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0f233a] to-teal-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-sm font-black">
                  📖
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-300">
                      {reading.category}
                    </span>
                    <span className="text-white/40">•</span>
                    <span className="text-[10px] font-bold text-white/70">
                      {reading.level} Level
                    </span>
                  </div>
                  <h2 className="text-sm sm:text-base font-black truncate max-w-xs sm:max-w-md">
                    {reading.title}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Close reader"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Authoritative Reading Timer Bar */}
            <div className="bg-slate-900 text-white px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black">
                <Clock className={`w-4 h-4 ${elapsedSeconds >= 60 ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`} />
                <span className="font-mono">
                  {elapsedSeconds >= 60 ? '✓ 60s Target Reached' : `Reading Timer: ${elapsedSeconds}s / 60s`}
                </span>
              </div>
              <div className="w-28 sm:w-44 h-2 bg-slate-800 rounded-full overflow-hidden shrink-0 border border-slate-700/60">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    elapsedSeconds >= 60 ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.round((elapsedSeconds / 60) * 100))}%` }}
                />
              </div>
            </div>

            {/* Modal Scrollable Article Body */}
            <div className="p-5 sm:p-8 overflow-y-auto space-y-6 flex-1 bg-[#fcfcf9]">
              
              {/* Optional Cover Image inside modal */}
              {hasImage && (
                <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-xs max-h-64 bg-black">
                  <img
                    src={reading.cover_image_url!}
                    alt={reading.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Title & Subtitle */}
              <div className="space-y-1 pb-3 border-b border-stone-200">
                <h1 className="text-xl sm:text-2xl font-black text-[#0f233a] leading-snug">
                  {reading.title}
                </h1>
                {reading.subtitle && (
                  <p className="text-sm text-slate-600 font-semibold italic">
                    {reading.subtitle}
                  </p>
                )}
              </div>

              {/* Paragraphs with Interactive Vocabulary Highlighter */}
              <div className="space-y-4 text-slate-800 leading-relaxed font-serif learning-content-text">
                {reading.paragraphs.map(paragraph => (
                  <p key={paragraph.id} className="text-justify leading-relaxed">
                    {paragraph.text}
                  </p>
                ))}
              </div>

              {/* Interactive Vocabulary Glossary Section */}
              {reading.vocabulary && reading.vocabulary.length > 0 && (
                <div className="pt-4 border-t border-stone-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <h3 className="text-xs sm:text-sm font-black text-[#0f233a] uppercase tracking-wider">
                      Key Vocabulary
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {reading.vocabulary.map((vocab, vIdx) => (
                      <div
                        key={vIdx}
                        onClick={() => setSelectedVocab(vocab)}
                        className="p-3 bg-white border border-stone-200 rounded-2xl shadow-2xs hover:border-teal-400 transition-all cursor-pointer space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs sm:text-sm text-teal-900">
                            {vocab.word}
                          </span>
                          {vocab.part_of_speech && (
                            <span className="text-[10px] font-bold text-slate-400 italic">
                              {vocab.part_of_speech}
                            </span>
                          )}
                        </div>
                        {vocab.pronunciation && (
                          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                            <Volume2 className="w-3 h-3 text-teal-600" />
                            <span>{vocab.pronunciation}</span>
                          </div>
                        )}
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {vocab.definition}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mini Comprehension Question Section */}
              {reading.questions && reading.questions.length > 0 && (
                <div className="pt-4 border-t border-stone-200 space-y-4">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#026fc3]" />
                    <h3 className="text-xs sm:text-sm font-black text-[#0f233a] uppercase tracking-wider">
                      Quick Comprehension Check
                    </h3>
                  </div>

                  {reading.questions.map((q, qIdx) => {
                    const isSubmitted = Boolean(quizSubmitted[q.id || qIdx]);
                    const selected = quizAnswers[q.id || qIdx];
                    const isCorrect = selected === q.correct_answer;

                    return (
                      <div
                        key={q.id || qIdx}
                        className="p-4 bg-white border border-stone-200 rounded-2xl shadow-2xs space-y-3"
                      >
                        <h4 className="font-bold text-slate-900 learning-question-text">
                          {q.question}
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, optIdx) => {
                            let style = 'bg-slate-50 border-slate-200 text-slate-800 hover:border-teal-400';
                            if (isSubmitted) {
                              if (opt === q.correct_answer) {
                                style = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-black';
                              } else if (opt === selected) {
                                style = 'bg-rose-50 border-rose-300 text-rose-800 line-through';
                              } else {
                                style = 'bg-slate-100/50 border-slate-200 text-slate-400 opacity-60';
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={isSubmitted}
                                onClick={() => handleAnswerQuestion(q.id || qIdx, opt)}
                                className={`p-2.5 rounded-xl border text-left font-semibold transition-all flex items-center justify-between learning-option-text ${style}`}
                              >
                                <span>{opt}</span>
                                {isSubmitted && opt === q.correct_answer && (
                                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {isSubmitted && q.explanation && (
                          <div className={`p-2.5 rounded-xl text-xs ${isCorrect ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>
                            <strong>{isCorrect ? '🎉 Correct! ' : '💡 Explanation: '}</strong>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

            {/* Reading Error / Feedback Notice */}
            {readingError && (
              <div className="px-5 py-2.5 bg-amber-50 border-t border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{readingError}</span>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 bg-white border-t border-stone-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleMarkComplete}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black shadow-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer min-h-[42px] ${
                  completed
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-none'
                    : elapsedSeconds < 60
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-emerald-500/20'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${completed ? 'text-emerald-700' : elapsedSeconds < 60 ? 'text-amber-600' : 'text-white'}`} />
                <span>
                  {completed
                    ? 'Completed ✨ (+15 XP)'
                    : elapsedSeconds < 60
                    ? `Read for ${60 - elapsedSeconds}s more (+15 XP)`
                    : 'Mark as Completed (+15 XP) ✨'}
                </span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Selected Vocabulary Definition Dialog */}
      {selectedVocab && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-stone-200 space-y-3 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-black text-teal-950">
                  {selectedVocab.word}
                </h4>
                {selectedVocab.part_of_speech && (
                  <span className="text-xs font-bold text-slate-400 italic">
                    {selectedVocab.part_of_speech}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedVocab(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedVocab.pronunciation && (
              <div className="text-xs font-mono text-slate-500 bg-slate-50 p-2 rounded-xl">
                Pronunciation: {selectedVocab.pronunciation}
              </div>
            )}

            <div className="space-y-1">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Definition
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-serif">
                {selectedVocab.definition}
              </p>
            </div>

            {selectedVocab.example && (
              <div className="space-y-1 bg-teal-50/50 p-2.5 rounded-xl border border-teal-100">
                <div className="text-[10px] font-black uppercase tracking-wider text-teal-700">
                  Example
                </div>
                <p className="text-xs text-teal-900 italic">
                  "{selectedVocab.example}"
                </p>
              </div>
            )}
          </div>
        </div>
      )}

    </>
  );
};
