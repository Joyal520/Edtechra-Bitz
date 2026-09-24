import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  ExternalLink, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  BookOpen, 
  Eye, 
  Loader2,
  Calendar,
  UserCheck,
  Bot
} from 'lucide-react';
import { StudentCorrectedWorkItem, studentLearningService } from '@/services/studentLearningService';

interface CorrectedWorkModalProps {
  item: StudentCorrectedWorkItem | null;
  classroomId: string;
  onClose: () => void;
  defaultTab?: 'work' | 'feedback' | 'original';
}

export const CorrectedWorkModal: React.FC<CorrectedWorkModalProps> = ({
  item,
  classroomId,
  onClose,
  defaultTab = 'work'
}) => {
  const [activeTab, setActiveTab] = useState<'work' | 'feedback' | 'original'>(defaultTab);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [originalFileUrl, setOriginalFileUrl] = useState<string | null>(null);
  const [r2Evaluation, setR2Evaluation] = useState<any | null>(null);
  const [loadingFile, setLoadingFile] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(defaultTab);
    setR2Evaluation(null);
  }, [defaultTab, item]);

  useEffect(() => {
    if (!item) return;

    let isMounted = true;
    const loadUrls = async () => {
      setLoadingFile(true);
      setFileError(null);
      try {
        // 1. Fetch detailed evaluation JSON artifact from R2 if present
        const r2Key = item.r2_result_path || (item.corrected_r2_key?.endsWith('.json') ? item.corrected_r2_key : null);
        if (r2Key || item.source_type === 'writing_task') {
          const evalDoc = await studentLearningService.getEvaluationJson(classroomId, {
            key: r2Key || undefined,
            submissionId: item.id
          });
          if (isMounted && evalDoc) {
            setR2Evaluation(evalDoc);
          }
        }

        // 2. Direct URLs or R2 signed URLs for images/PDFs
        if (item.corrected_url) {
          if (isMounted) setFileUrl(item.corrected_url);
        } else if (item.corrected_r2_key && !item.corrected_r2_key.endsWith('.json')) {
          const downloadUrl = await studentLearningService.getPresignedFileUrl(classroomId, item.corrected_r2_key);
          if (isMounted) {
            if (downloadUrl) {
              setFileUrl(downloadUrl);
            } else {
              setFileError('Unable to generate secure file preview.');
            }
          }
        }

        if (item.original_url) {
          if (isMounted) setOriginalFileUrl(item.original_url);
        } else if (item.original_r2_key) {
          const origUrl = await studentLearningService.getPresignedFileUrl(classroomId, item.original_r2_key);
          if (isMounted && origUrl) {
            setOriginalFileUrl(origUrl);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setFileError(err.message || 'Error loading file preview.');
        }
      } finally {
        if (isMounted) setLoadingFile(false);
      }
    };

    loadUrls();

    return () => {
      isMounted = false;
    };
  }, [item, classroomId]);

  if (!item) return null;

  const currentPreviewUrl = activeTab === 'original' ? originalFileUrl : fileUrl;
  const isPdf = (keyOrUrl?: string | null) => keyOrUrl?.toLowerCase().includes('.pdf');
  const isImage = (keyOrUrl?: string | null) => {
    if (!keyOrUrl) return false;
    const lower = keyOrUrl.toLowerCase();
    return lower.includes('.png') || lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.webp');
  };

  const currentSource = activeTab === 'original' 
    ? (item.original_url || item.original_r2_key)
    : (item.corrected_url || item.corrected_r2_key);

  const formattedDate = item.date
    ? new Date(item.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Recently';

  // Extract typed writing evaluation metadata (prioritizing R2 evaluation JSON)
  const correctedText = r2Evaluation?.corrected_work || item.corrected_work || item.feedback_metadata?.corrected_work || null;
  const originalText = r2Evaluation?.original_work || item.original_text || item.text_response || item.content_text || item.feedback_metadata?.original_text || null;
  
  const grammarIssues: Array<{ original: string; correction: string; explanation?: string }> = 
    (Array.isArray(r2Evaluation?.grammar_issues) && r2Evaluation.grammar_issues.length > 0)
      ? r2Evaluation.grammar_issues.map((g: any) => ({ original: g.original || g.text, correction: g.correction || g.suggestion, explanation: g.explanation || g.rule }))
      : (Array.isArray(item.grammar_issues) && item.grammar_issues.length > 0)
        ? item.grammar_issues
        : (Array.isArray(item.grammar_errors) && item.grammar_errors.length > 0)
          ? item.grammar_errors.map((g: any) => ({ original: g.text || g.original, correction: g.suggestion || g.correction, explanation: g.rule || g.explanation }))
          : (Array.isArray(item.feedback_metadata?.grammar_issues) ? item.feedback_metadata.grammar_issues : []);

  const spellingIssues: Array<{ original: string; correction: string; explanation?: string }> = 
    (Array.isArray(r2Evaluation?.spelling_issues) && r2Evaluation.spelling_issues.length > 0)
      ? r2Evaluation.spelling_issues.map((s: any) => ({ original: s.original || s.text, correction: s.correction || s.suggestion, explanation: s.explanation || 'Spelling correction' }))
      : (Array.isArray(item.spelling_issues) && item.spelling_issues.length > 0)
        ? item.spelling_issues
        : (Array.isArray(item.spelling_errors) && item.spelling_errors.length > 0)
          ? item.spelling_errors.map((s: any) => ({ original: s.text || s.original, correction: s.suggestion || s.correction, explanation: 'Spelling correction' }))
          : (Array.isArray(item.feedback_metadata?.spelling_issues) ? item.feedback_metadata.spelling_issues : []);

  const vocabIssues: Array<{ original: string; correction: string; explanation?: string }> =
    (Array.isArray(r2Evaluation?.vocabulary_issues) && r2Evaluation.vocabulary_issues.length > 0)
      ? r2Evaluation.vocabulary_issues
      : (Array.isArray(item.vocabulary_issues) && item.vocabulary_issues.length > 0)
        ? item.vocabulary_issues
        : (Array.isArray(item.feedback_metadata?.vocabulary_issues) ? item.feedback_metadata.vocabulary_issues : []);

  const structureIssues: Array<{ original: string; correction: string; explanation?: string }> =
    (Array.isArray(r2Evaluation?.sentence_structure_issues) && r2Evaluation.sentence_structure_issues.length > 0)
      ? r2Evaluation.sentence_structure_issues
      : (Array.isArray(item.sentence_structure_issues) && item.sentence_structure_issues.length > 0)
        ? item.sentence_structure_issues
        : (Array.isArray(item.feedback_metadata?.sentence_structure_issues) ? item.feedback_metadata.sentence_structure_issues : []);

  const nextStepText: string = r2Evaluation?.next_step || item.next_step || item.feedback_metadata?.next_step || '';

  const mistakesList: Array<{ original: string; correction: string; explanation?: string }> = 
    (Array.isArray(r2Evaluation?.other_issues) && r2Evaluation.other_issues.length > 0)
      ? r2Evaluation.other_issues
      : (Array.isArray(item.mistakes) && item.mistakes.length > 0)
        ? item.mistakes
        : (Array.isArray(item.feedback_metadata?.mistakes) ? item.feedback_metadata.mistakes : []);

  const grammarErrors = grammarIssues.map((g) => ({ text: g.original, suggestion: g.correction, rule: g.explanation }));
  const spellingErrors = spellingIssues.map((s) => ({ text: s.original, suggestion: s.correction }));

  const aiMeta = r2Evaluation || item.ai_evaluation_metadata || {};
  const rubricBreakdown: Array<{ criterion: string; score: number; max?: number }> = 
    Array.isArray(aiMeta.breakdown) && aiMeta.breakdown.length > 0
      ? aiMeta.breakdown
      : (Array.isArray(item.breakdown) ? item.breakdown : []);

  // Breakdown parsing for strengths, improvements, rubric criteria
  const breakdown = item.breakdown || {};
  const strengths: string[] = (Array.isArray(r2Evaluation?.strengths) && r2Evaluation.strengths.length > 0)
    ? r2Evaluation.strengths
    : (Array.isArray(item.strengths) && item.strengths.length > 0)
      ? item.strengths
      : (Array.isArray(item.feedback_metadata?.strengths) && item.feedback_metadata.strengths.length > 0)
      ? item.feedback_metadata.strengths
      : Array.isArray(breakdown.strengths)
      ? breakdown.strengths
      : Array.isArray(breakdown.pros)
      ? breakdown.pros
      : [];

  const improvements: string[] = Array.isArray(breakdown.improvements)
    ? breakdown.improvements
    : Array.isArray(breakdown.areas_for_improvement)
    ? breakdown.areas_for_improvement
    : Array.isArray(breakdown.action_items)
    ? breakdown.action_items
    : [];

  const isAiEvaluated = Boolean(
    correctedText || 
    item.source_type === 'ocr_handwritten' || 
    item.source_type === 'challenge' || 
    item.source_type === 'writing_task' ||
    breakdown.evaluator === 'ai'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[94vh] border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-50 via-sky-50/40 to-white border-b border-slate-200/80 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-[#026fc3]">
                <FileText className="w-3.5 h-3.5" />
                <span className="capitalize">{item.source_type.replace('_', ' ')}</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                {isAiEvaluated ? (
                  <>
                    <Bot className="w-3 h-3 text-sky-600" />
                    <span>AI Evaluated</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3 h-3 text-emerald-600" />
                    <span>Teacher Reviewed</span>
                  </>
                )}
              </span>

              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                <Calendar className="w-3 h-3" />
                <span>{formattedDate}</span>
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">
              {item.title}
            </h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {item.percentage !== null && item.percentage !== undefined && (
              <div className="text-right">
                <div className="inline-flex items-baseline gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-2xl">
                  <span className="text-base sm:text-lg font-black">{Math.round(item.percentage)}%</span>
                  {item.score !== null && item.score !== undefined && item.max_score && (
                    <span className="text-[11px] font-bold text-emerald-600">({item.score}/{item.max_score})</span>
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 pt-3 bg-white border-b border-slate-100 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('work')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'work'
                ? 'border-[#026fc3] text-[#026fc3]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Corrected Work</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'feedback'
                ? 'border-[#026fc3] text-[#026fc3]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Detailed Feedback</span>
          </button>

          {(originalText || item.original_r2_key || item.original_url) && (
            <button
              type="button"
              onClick={() => setActiveTab('original')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'original'
                  ? 'border-[#026fc3] text-[#026fc3]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Original Submission</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-6">
          
          {/* 1. Tab: Corrected Work */}
          {activeTab === 'work' && (
            <div className="space-y-6">
              
              {/* Scenario A: Typed Task with AI Corrected Text */}
              {correctedText ? (
                <div className="space-y-6">
                  {/* Side-by-Side Comparison on Desktop, Stacked on Mobile */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left: Original Submission */}
                    <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-2.5 flex flex-col justify-between shadow-2xs">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                            YOUR ORIGINAL WORK
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded-full">
                            Student Draft
                          </span>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap">
                          {originalText || 'No original text recorded.'}
                        </div>
                      </div>
                    </div>

                    {/* Right: AI Corrected & Polished Version */}
                    <div className="p-5 bg-emerald-50/50 border-2 border-emerald-200/80 rounded-2xl space-y-2.5 flex flex-col justify-between shadow-2xs">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
                              CORRECTED WORK
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Polished English
                          </span>
                        </div>
                        <div className="p-3.5 bg-white rounded-xl border border-emerald-100 text-emerald-950 text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap selection:bg-emerald-100 shadow-2xs">
                          {correctedText}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 14-Point English Inspection Breakdown */}
                  <div className="p-5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span>14-Point English Analysis</span>
                      </h4>
                      <span className="text-[11px] font-semibold text-slate-500">
                        Detailed feedback & explanations
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Grammar & Syntax */}
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800">Grammar & Syntax</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {grammarIssues.length} issue{grammarIssues.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {grammarIssues.length > 0 ? (
                          <ul className="space-y-2">
                            {grammarIssues.map((err, i) => (
                              <li key={i} className="text-xs text-slate-700 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                                <div>
                                  <span className="line-through text-rose-600 font-bold">"{err.original}"</span>
                                  <span className="mx-1.5 text-slate-400 font-bold">→</span>
                                  <span className="text-emerald-700 font-black">"{err.correction}"</span>
                                </div>
                                {err.explanation && (
                                  <p className="text-[11px] text-slate-500 leading-snug">
                                    <strong className="text-slate-700">Why:</strong> {err.explanation}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-emerald-700 font-medium bg-emerald-50/80 p-2 rounded-lg border border-emerald-100">
                            ✓ No grammar errors detected
                          </p>
                        )}
                      </div>

                      {/* Spelling */}
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800">Spelling</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {spellingIssues.length} issue{spellingIssues.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {spellingIssues.length > 0 ? (
                          <ul className="space-y-2">
                            {spellingIssues.map((err, i) => (
                              <li key={i} className="text-xs text-slate-700 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                                <div>
                                  <span className="line-through text-rose-600 font-bold">"{err.original}"</span>
                                  <span className="mx-1.5 text-slate-400 font-bold">→</span>
                                  <span className="text-emerald-700 font-black">"{err.correction}"</span>
                                </div>
                                {err.explanation && (
                                  <p className="text-[11px] text-slate-500 leading-snug">
                                    <strong className="text-slate-700">Why:</strong> {err.explanation}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-emerald-700 font-medium bg-emerald-50/80 p-2 rounded-lg border border-emerald-100">
                            ✓ No spelling mistakes detected
                          </p>
                        )}
                      </div>

                      {/* Vocabulary */}
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800">Vocabulary</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {vocabIssues.length} issue{vocabIssues.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {vocabIssues.length > 0 ? (
                          <ul className="space-y-2">
                            {vocabIssues.map((err, i) => (
                              <li key={i} className="text-xs text-slate-700 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                                <div>
                                  <span className="line-through text-rose-600 font-bold">"{err.original}"</span>
                                  <span className="mx-1.5 text-slate-400 font-bold">→</span>
                                  <span className="text-emerald-700 font-black">"{err.correction}"</span>
                                </div>
                                {err.explanation && (
                                  <p className="text-[11px] text-slate-500 leading-snug">
                                    <strong className="text-slate-700">Why:</strong> {err.explanation}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-emerald-700 font-medium bg-emerald-50/80 p-2 rounded-lg border border-emerald-100">
                            ✓ Vocabulary is appropriate
                          </p>
                        )}
                      </div>

                      {/* Sentence Structure */}
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800">Sentence Structure</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {structureIssues.length} issue{structureIssues.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {structureIssues.length > 0 ? (
                          <ul className="space-y-2">
                            {structureIssues.map((err, i) => (
                              <li key={i} className="text-xs text-slate-700 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                                <div>
                                  <span className="line-through text-rose-600 font-bold">"{err.original}"</span>
                                  <span className="mx-1.5 text-slate-400 font-bold">→</span>
                                  <span className="text-emerald-700 font-black">"{err.correction}"</span>
                                </div>
                                {err.explanation && (
                                  <p className="text-[11px] text-slate-500 leading-snug">
                                    <strong className="text-slate-700">Why:</strong> {err.explanation}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-emerald-700 font-medium bg-emerald-50/80 p-2 rounded-lg border border-emerald-100">
                            ✓ Sentence structure is clear
                          </p>
                        )}
                      </div>
                    </div>

                    {/* What You Did Well (Strengths) */}
                    {strengths.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                        <h4 className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WHAT YOU DID WELL</span>
                        </h4>
                        <ul className="space-y-1 pl-1">
                          {strengths.map((s, i) => (
                            <li key={i} className="text-xs text-emerald-950 font-medium flex items-start gap-2">
                              <span className="text-emerald-600 font-black">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Next Step */}
                    {nextStepText && (
                      <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-1">
                        <h4 className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>NEXT STEP</span>
                        </h4>
                        <p className="text-xs text-indigo-950 font-medium leading-relaxed">
                          {nextStepText}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Practiced Rules and Skills Chips */}
                  {(grammarErrors.length > 0 || spellingErrors.length > 0) && (
                    <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-indigo-900 mr-1">Skills Targeted:</span>
                      {grammarErrors.map((ge, idx) => ge.rule && (
                        <span key={`g-${idx}`} className="px-2.5 py-1 bg-white text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold">
                          {ge.rule}
                        </span>
                      ))}
                      {spellingErrors.length > 0 && (
                        <span className="px-2.5 py-1 bg-white text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold">
                          Spelling ({spellingErrors.length} words)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : loadingFile ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-[#026fc3]" />
                  <p className="text-xs font-semibold">Generating secure file view from R2...</p>
                </div>
              ) : fileError ? (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                  <h4 className="text-sm font-bold text-amber-900">File Preview Unavailable</h4>
                  <p className="text-xs text-amber-700 max-w-md mx-auto">{fileError}</p>
                </div>
              ) : currentPreviewUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">
                      Marked & Annotated Document
                    </span>
                    <a
                      href={currentPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-sky-300 text-xs font-bold text-slate-700 hover:text-[#026fc3] rounded-xl shadow-2xs transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in New Tab</span>
                    </a>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-inner p-2 min-h-[420px] flex items-center justify-center">
                    {isPdf(currentSource || currentPreviewUrl) ? (
                      <iframe
                        src={currentPreviewUrl}
                        title="Document Viewer"
                        className="w-full h-[520px] rounded-xl border-0"
                      />
                    ) : isImage(currentSource || currentPreviewUrl) ? (
                      <img
                        src={currentPreviewUrl}
                        alt="Work evaluation"
                        className="max-h-[520px] max-w-full object-contain rounded-xl"
                      />
                    ) : (
                      <div className="text-center py-12 space-y-3">
                        <FileText className="w-12 h-12 text-[#026fc3] mx-auto" />
                        <p className="text-xs font-bold text-slate-700">Document ready for download</p>
                        <a
                          href={currentPreviewUrl}
                          download
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#026fc3] text-white rounded-xl text-xs font-bold shadow-md hover:bg-sky-700"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download Document</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800">No Document File Attached</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    This evaluation contains qualitative commentary and score breakdown. Click the "Detailed Feedback" tab above to view your review.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('feedback')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 text-[#026fc3] border border-sky-200 rounded-xl text-xs font-bold hover:bg-sky-100 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>View Detailed Feedback</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. Tab: Original Submission */}
          {activeTab === 'original' && (
            <div className="space-y-4">
              {originalText ? (
                <div className="p-5 sm:p-6 bg-white border-2 border-slate-200 rounded-2xl space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-slate-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Original Student Submission</span>
                    </h4>
                    <span className="text-[11px] font-bold text-slate-500">
                      {originalText.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-900 text-sm sm:text-base font-medium leading-relaxed whitespace-pre-wrap">
                    {originalText}
                  </div>
                  {correctedText && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('work')}
                      className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Compare with AI Corrected Version</span>
                    </button>
                  )}
                </div>
              ) : originalFileUrl ? (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-inner p-2 min-h-[420px] flex items-center justify-center">
                  {isPdf(originalFileUrl) ? (
                    <iframe
                      src={originalFileUrl}
                      title="Original Document"
                      className="w-full h-[520px] rounded-xl border-0"
                    />
                  ) : (
                    <img
                      src={originalFileUrl}
                      alt="Original Work"
                      className="max-h-[520px] max-w-full object-contain rounded-xl"
                    />
                  )}
                </div>
              ) : (
                <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-2">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500">No original document or text found.</p>
                </div>
              )}
            </div>
          )}

          {/* 3. Tab: Detailed Feedback */}
          {activeTab === 'feedback' && (
            <div className="space-y-5">
              {/* Overall Feedback Commentary */}
              {item.feedback ? (
                <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-2xs">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Sparkles className="w-4 h-4 text-[#026fc3]" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Evaluation Comments</h4>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-900 leading-relaxed whitespace-pre-wrap font-medium">
                    {item.feedback}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-slate-100/70 border border-slate-200 rounded-2xl text-xs text-slate-500 font-medium text-center">
                  No written commentary recorded for this submission.
                </div>
              )}

              {/* Rubric Breakdown Progress Bars (if available) */}
              {rubricBreakdown.length > 0 && (
                <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3.5 shadow-2xs">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Rubric Criteria Breakdown
                  </h4>
                  <div className="space-y-3">
                    {rubricBreakdown.map((crit, idx) => {
                      const maxVal = crit.max || 10;
                      const scoreVal = crit.score || 0;
                      const pct = Math.round((scoreVal / maxVal) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                            <span>{crit.criterion}</span>
                            <span className="text-slate-900">{scoreVal} / {maxVal} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Strengths & Areas to Practice */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="p-4 sm:p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <h4 className="text-xs font-black uppercase tracking-wider">What You Did Well</h4>
                  </div>
                  {strengths.length > 0 ? (
                    <ul className="space-y-1.5 pl-1">
                      {strengths.map((str: string, idx: number) => (
                        <li key={idx} className="text-xs text-emerald-950 flex items-start gap-2 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-emerald-800 italic">Solid submission demonstrating comprehension.</p>
                  )}
                </div>

                {/* Areas to Practice */}
                <div className="p-4 sm:p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <h4 className="text-xs font-black uppercase tracking-wider">Areas to Practice</h4>
                  </div>
                  {improvements.length > 0 ? (
                    <ul className="space-y-1.5 pl-1">
                      {improvements.map((imp: string, idx: number) => (
                        <li key={idx} className="text-xs text-amber-950 flex items-start gap-2 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  ) : mistakesList.length > 0 ? (
                    <ul className="space-y-1.5 pl-1">
                      {mistakesList.slice(0, 3).map((m, idx) => (
                        <li key={idx} className="text-xs text-amber-950 flex items-start gap-2 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                          <span>{m.explanation || `Review correction for "${m.original}"`}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-amber-800 italic">No major remedial items highlighted.</p>
                  )}
                </div>
              </div>

              {/* Rubric Criteria if present (legacy object format) */}
              {breakdown.criteria && typeof breakdown.criteria === 'object' && Object.keys(breakdown.criteria).length > 0 && (
                <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Rubric & Assessment Criteria
                  </h4>
                  <div className="divide-y divide-slate-100">
                    {Object.entries(breakdown.criteria).map(([criterion, val]: [string, any], idx: number) => (
                      <div key={idx} className="py-2.5 flex items-start justify-between gap-4 first:pt-0 last:pb-0">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-slate-800 capitalize">
                            {criterion.replace(/_/g, ' ')}
                          </div>
                          {typeof val === 'string' && (
                            <div className="text-[11px] text-slate-600">{val}</div>
                          )}
                          {typeof val === 'object' && val?.notes && (
                            <div className="text-[11px] text-slate-600">{val.notes}</div>
                          )}
                        </div>
                        {typeof val === 'object' && val?.score !== undefined && (
                          <div className="text-xs font-black text-slate-900 shrink-0">
                            {val.score} {val.max_score ? `/ ${val.max_score}` : 'pts'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200/80 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-slate-500">
            EdTechra Learning Intelligence
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
