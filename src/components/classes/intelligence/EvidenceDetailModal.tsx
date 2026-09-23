import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Zap,
  Award,
  Camera,
  Trophy,
  Calendar,
  User,
  Tag,
  CheckCircle2,
  AlertTriangle,
  PenLine,
  MessageSquare,
  Sparkles,
  Maximize2
} from 'lucide-react';

export interface EvidenceDetailItem {
  id?: string;
  activityId?: string;
  activityTitle?: string;
  activityType?: string;
  sourceLabel?: string;
  studentId?: string;
  studentName?: string;
  score?: number | null;
  maxScore?: number | null;
  percentage?: number | null;
  completedAt?: string;
  topic?: string;
  displayName?: string;
  category?: string;
  feedback?: string;
  feedback_text?: string;
  teacher_feedback?: string;
  ocr_text?: string;
  original_work?: string;
  original_text?: string;
  text_response?: string;
  corrected_work?: string;
  corrected_text?: string;
  original_url?: string;
  original_r2_key?: string;
  corrected_url?: string;
  corrected_r2_key?: string;
  file_urls?: string[];
  grammar_errors?: Array<{ text?: string; suggestion?: string; rule?: string }>;
  spelling_errors?: Array<{ text?: string; suggestion?: string }>;
  mistakes?: Array<{ original?: string; correction?: string; explanation?: string }>;
  strengths?: string[];
  breakdown?: any[];
  metadata?: any;
  [key: string]: any;
}

interface EvidenceDetailModalProps {
  item: EvidenceDetailItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EvidenceDetailModal: React.FC<EvidenceDetailModalProps> = ({
  item,
  isOpen,
  onClose
}) => {
  const [isImageExpanded, setIsImageExpanded] = useState<boolean>(false);

  if (!isOpen || !item) return null;

  const meta = item.metadata || {};
  const writingEval = meta.writing_evaluation || null;

  const originalImage =
    item.original_url ||
    (item.file_urls && item.file_urls.length > 0 ? item.file_urls[0] : null) ||
    (meta.file_urls && meta.file_urls.length > 0 ? meta.file_urls[0] : null) ||
    null;

  const originalText =
    item.original_work ||
    item.original_text ||
    item.ocr_text ||
    item.text_response ||
    meta.ocr_text ||
    meta.original_text ||
    meta.text_response ||
    writingEval?.ocr_text ||
    null;

  const correctedText =
    item.corrected_work ||
    item.corrected_text ||
    meta.corrected_work ||
    writingEval?.corrected_work ||
    null;

  const grammarErrors =
    (Array.isArray(item.grammar_errors) && item.grammar_errors.length > 0)
      ? item.grammar_errors
      : (Array.isArray(meta.grammar_errors) && meta.grammar_errors.length > 0)
      ? meta.grammar_errors
      : (Array.isArray(writingEval?.grammar_errors) ? writingEval.grammar_errors : []);

  const spellingErrors =
    (Array.isArray(item.spelling_errors) && item.spelling_errors.length > 0)
      ? item.spelling_errors
      : (Array.isArray(meta.spelling_errors) && meta.spelling_errors.length > 0)
      ? meta.spelling_errors
      : (Array.isArray(writingEval?.spelling_errors) ? writingEval.spelling_errors : []);

  const mistakes =
    (Array.isArray(item.mistakes) && item.mistakes.length > 0)
      ? item.mistakes
      : (Array.isArray(meta.mistakes) && meta.mistakes.length > 0)
      ? meta.mistakes
      : (Array.isArray(writingEval?.mistakes) ? writingEval.mistakes : []);

  const strengths: string[] =
    (Array.isArray(item.strengths) && item.strengths.length > 0)
      ? item.strengths
      : (Array.isArray(meta.strengths) && meta.strengths.length > 0)
      ? meta.strengths
      : (Array.isArray(writingEval?.strengths) ? writingEval.strengths : []);

  const rawBreakdown =
    (Array.isArray(item.breakdown) && item.breakdown.length > 0)
      ? item.breakdown
      : (Array.isArray(meta.breakdown_json) && meta.breakdown_json.length > 0)
      ? meta.breakdown_json
      : (Array.isArray(writingEval?.breakdown) ? writingEval.breakdown : []);

  const rubricBreakdown = rawBreakdown.filter((b: any) => !b?.__is_diagnostic_meta);

  const feedbackText =
    item.feedback ||
    item.feedback_text ||
    item.teacher_feedback ||
    meta.feedback ||
    meta.teacher_feedback ||
    meta.feedback_text ||
    writingEval?.feedback ||
    null;

  const getSourceBadge = (type?: string) => {
    switch (type) {
      case 'assignment':
      case 'task':
        return { label: 'Task', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <BookOpen className="w-3.5 h-3.5" /> };
      case 'live_quiz':
      case 'quiz':
        return { label: 'Live Quiz', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: <Zap className="w-3.5 h-3.5" /> };
      case 'exam':
      case 'assessment':
        return { label: 'Assessment', color: 'bg-teal-100 text-teal-800 border-teal-200', icon: <Award className="w-3.5 h-3.5" /> };
      case 'ocr':
        return { label: 'OCR Worksheet', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Camera className="w-3.5 h-3.5" /> };
      case 'ai_challenge':
      case 'competition':
        return { label: 'Competition', color: 'bg-pink-100 text-pink-800 border-pink-200', icon: <Trophy className="w-3.5 h-3.5" /> };
      default:
        return { label: 'Activity', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: <BookOpen className="w-3.5 h-3.5" /> };
    }
  };

  const badge = getSourceBadge(item.activityType || item.rawActivityType);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border-2 border-[#C9E5E2] overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-[#071a1c] border-b border-[#0e3b40] flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#159A9C] to-[#087477] text-white flex items-center justify-center font-black shadow-md shadow-[#159A9C]/25 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border ${badge.color}`}>
                  {badge.icon}
                  {badge.label}
                </span>
                <span className="text-xs text-teal-200 font-bold">Evidence Detail</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white leading-snug">
                {item.activityTitle || 'Assessment Evidence'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-teal-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-5 bg-[#F8FCFB]">

          {/* Student & Score Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#C9E5E2] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-black text-[#173B3F]">
                <User className="w-4 h-4 text-[#087477]" />
                <span>{item.studentName || 'Student'}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#36565A] font-medium flex-wrap">
                {item.completedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#159A9C]" />
                    <span>{new Date(item.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </span>
                )}
                {(item.displayName || item.topic) && (
                  <span className="flex items-center gap-1 text-[#087477] font-bold">
                    <Tag className="w-3.5 h-3.5" />
                    <span>{item.displayName || item.topic}</span>
                  </span>
                )}
                {item.category && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-black uppercase">
                    {item.category}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
              {item.percentage != null && (
                <div className="px-4 py-2 bg-gradient-to-br from-[#E8F7F5] to-white rounded-2xl border border-[#C9E5E2] text-right">
                  <div className={`text-2xl font-black ${item.percentage < 50 ? 'text-rose-600' : item.percentage < 70 ? 'text-amber-600' : 'text-emerald-700'}`}>
                    {item.percentage}%
                  </div>
                  {item.score != null && item.maxScore != null && (
                    <div className="text-[10px] font-bold text-[#36565A]">
                      {item.score} / {item.maxScore} pts
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Original Student Work */}
          {(originalImage || originalText) && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#C9E5E2] space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#173B3F]">
                  <PenLine className="w-4 h-4 text-[#087477]" />
                  <span>Original Student Work</span>
                </div>
                {originalImage && (
                  <button
                    type="button"
                    onClick={() => setIsImageExpanded(!isImageExpanded)}
                    className="text-xs font-bold text-[#087477] hover:text-[#065e60] flex items-center gap-1 cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>{isImageExpanded ? 'Shrink image' : 'Expand image'}</span>
                  </button>
                )}
              </div>

              {originalImage && (
                <div className="rounded-xl border border-[#C9E5E2] overflow-hidden bg-slate-900/5 p-2 flex flex-col items-center">
                  <img
                    src={originalImage}
                    alt="Original Handwritten Submission"
                    className={`${isImageExpanded ? 'max-h-[600px]' : 'max-h-72'} object-contain rounded-lg transition-all duration-300 shadow-2xs`}
                  />
                </div>
              )}

              {originalText && (
                <div className="space-y-1">
                  {originalImage && (
                    <span className="text-[10px] font-bold text-[#36565A] uppercase tracking-wide">
                      Transcribed Text
                    </span>
                  )}
                  <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap bg-[#F8FCFB] p-3.5 rounded-xl border border-[#C9E5E2]">
                    {originalText}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Complete Corrected Work */}
          {correctedText && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Complete Corrected Work</span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-emerald-950 leading-relaxed whitespace-pre-wrap bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
                {correctedText}
              </p>
            </div>
          )}

          {/* Rubric Breakdown */}
          {rubricBreakdown.length > 0 && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#C9E5E2] space-y-3 shadow-2xs">
              <span className="text-xs font-black uppercase tracking-wider text-[#173B3F] block">
                Criteria Breakdown & Scoring
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {rubricBreakdown.map((crit: any, cIdx: number) => (
                  <div key={cIdx} className="p-3 rounded-xl bg-[#E8F7F5]/40 border border-[#C9E5E2] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#173B3F] block">{crit.criterion || crit.name}</span>
                      {crit.feedback && (
                        <span className="text-[11px] text-[#36565A] font-medium block mt-0.5">{crit.feedback}</span>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className="text-xs font-black text-[#087477]">
                        {crit.score}{crit.max != null ? ` / ${crit.max}` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What to Improve */}
          {(grammarErrors.length > 0 || spellingErrors.length > 0 || mistakes.length > 0) && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-200 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Identified Issues & What to Improve</span>
              </div>

              {/* Grammar Errors */}
              {grammarErrors.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-black text-slate-800">Grammar & Mechanics</h4>
                  <ul className="space-y-1.5">
                    {grammarErrors.map((err: any, i: number) => (
                      <li key={i} className="text-xs text-slate-700 font-medium flex items-start gap-2 bg-[#F8FCFB] p-2.5 rounded-lg border border-slate-200">
                        <span className="text-rose-500 font-black shrink-0">•</span>
                        <span>
                          <span className="line-through text-rose-600">"{err.text || err.original}"</span>
                          <span className="mx-1.5 text-slate-400">→</span>
                          <span className="text-emerald-700 font-bold">"{err.suggestion || err.correction}"</span>
                          {err.rule && <span className="text-slate-500 ml-1.5 text-[11px]">({err.rule})</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Spelling Errors */}
              {spellingErrors.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-black text-slate-800">Spelling</h4>
                  <ul className="space-y-1.5">
                    {spellingErrors.map((err: any, i: number) => (
                      <li key={i} className="text-xs text-slate-700 font-medium flex items-start gap-2 bg-[#F8FCFB] p-2.5 rounded-lg border border-slate-200">
                        <span className="text-rose-500 font-black shrink-0">•</span>
                        <span>
                          <span className="line-through text-rose-600">"{err.text || err.original}"</span>
                          <span className="mx-1.5 text-slate-400">→</span>
                          <span className="text-emerald-700 font-bold">"{err.suggestion || err.correction}"</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Other Mistakes */}
              {mistakes.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-black text-slate-800">Other Observations</h4>
                  <ul className="space-y-1.5">
                    {mistakes.slice(0, 5).map((m: any, i: number) => (
                      <li key={i} className="text-xs text-slate-700 font-medium flex items-start gap-2 bg-[#F8FCFB] p-2.5 rounded-lg border border-slate-200">
                        <span className="text-amber-500 font-black shrink-0">•</span>
                        <span>
                          "{m.original || m.text}" → "{m.correction || m.suggestion}"
                          {m.explanation && <span className="block text-[11px] text-slate-500 mt-0.5">{m.explanation}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Strengths */}
          {strengths.length > 0 && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200 space-y-2.5 shadow-2xs">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800 block">
                Demonstrated Strengths
              </span>
              <ul className="space-y-1.5">
                {strengths.map((s: string, i: number) => (
                  <li key={i} className="text-xs text-emerald-900 font-medium flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pedagogical Feedback */}
          {feedbackText && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-sky-200 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-sky-800">
                <MessageSquare className="w-4 h-4 text-sky-600" />
                <span>Pedagogical Feedback</span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap bg-sky-50/40 p-3.5 rounded-xl border border-sky-100">
                {feedbackText}
              </p>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-[#C9E5E2] flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-[#36565A]">
            Teaching Intelligence Learning Evidence
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-black text-white bg-[#087477] hover:bg-[#159A9C] transition-colors shadow-2xs cursor-pointer"
          >
            Close Detail
          </button>
        </div>

      </div>
    </div>
  );
};
