// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: AI PROMPT BRIDGE MODAL (STANDARD EXAM 2.0)
// Generates high-fidelity external prompts for ChatGPT/Gemini/Claude based on
// the controlled 100-mark Standard Exam Blueprint (7 sections, 40 questions).
// Validates external AI JSON and imports directly into live examination cards.
// ============================================================================

import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Bot,
  Copy,
  Check,
  Sparkles,
  ClipboardPaste,
  CheckCircle2,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { StandardExamInput } from '../../shared/assessmentBlueprints';
import { ExamSection } from '../../shared/ExamSchema';
import {
  buildStandardExamAIPrompt,
  validateStandardExamPackage,
  buildStandardCorrectionPrompt,
  StandardValidationResult
} from '../../shared/standardExamPackage';
import { validateExamJSON } from '../../teacher/JSONValidator';

interface AIPromptBridgeModalProps {
  isOpen: boolean;
  input: StandardExamInput;
  onClose: () => void;
  onImportExam: (sections: ExamSection[], updatedExamMeta?: any) => void;
}

export const AIPromptBridgeModal: React.FC<AIPromptBridgeModalProps> = ({
  isOpen,
  input,
  onClose,
  onImportExam
}) => {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedCorrection, setCopiedCorrection] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'paste'>('prompt');
  const [pasteText, setPasteText] = useState('');
  const [validationResult, setValidationResult] = useState<StandardValidationResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const generatedPrompt = useMemo(() => {
    return buildStandardExamAIPrompt({
      subject: input.subject || 'English Language',
      grade: input.grade || 'Grade 10',
      topic: input.topic || 'The Simple Past',
      medium: 'English',
      difficulty: input.difficulty || 'Medium',
      durationMinutes: input.durationMinutes || 60,
      sourceContent: input.lessonNotes || ''
    });
  }, [input]);

  if (!isOpen) return null;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 3000);
    } catch {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 3000);
    }
  };

  const handleCopyCorrection = async () => {
    if (!validationResult || validationResult.isValid || validationResult.errors.length === 0) return;
    const correctionPrompt = buildStandardCorrectionPrompt(validationResult.errors);
    try {
      await navigator.clipboard.writeText(correctionPrompt);
      setCopiedCorrection(true);
      setTimeout(() => setCopiedCorrection(false), 3000);
    } catch {
      setCopiedCorrection(true);
      setTimeout(() => setCopiedCorrection(false), 3000);
    }
  };

  const handleValidatePaste = (textToValidate?: string) => {
    void validateExamJSON;
    const raw = textToValidate !== undefined ? textToValidate : pasteText;
    if (!raw.trim()) {
      setValidationResult(null);
      return;
    }
    const result = validateStandardExamPackage(raw);
    setValidationResult(result);
  };

  const handleImport = () => {
    if (!validationResult?.isValid || !validationResult.canonicalAssessment) {
      handleValidatePaste();
      return;
    }
    const { sections, exam } = validationResult.canonicalAssessment;
    onImportExam(sections, exam);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn overflow-y-auto select-none">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-2xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  Standard Exam 2.0 AI Bridge
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-500">40 Questions • 100 Marks</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                AI Examination Generator
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: 1. Generate Prompt | 2. Paste AI Exam */}
        <div className="px-6 pt-4 border-b border-slate-200 flex items-center gap-4 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            className={`pb-3 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'prompt'
                ? 'text-purple-700 border-b-2 border-purple-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Copy AI Exam Prompt
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`pb-3 text-xs font-bold transition-all relative cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'paste'
                ? 'text-purple-700 border-b-2 border-purple-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>2. Paste AI Exam</span>
            {validationResult?.isValid && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 sm:p-7 overflow-y-auto custom-scrollbar flex-1 bg-white">
          {activeTab === 'prompt' ? (
            <div className="space-y-4">
              {/* Instructions Banner */}
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1 text-slate-700">
                  <div className="font-bold text-purple-950">
                    How to use this AI Exam Prompt
                  </div>
                  <p className="leading-relaxed">
                    1. Click <strong>Copy Prompt</strong> below.<br />
                    2. Paste it into <strong>ChatGPT, Gemini, Claude</strong>, or your preferred AI assistant.<br />
                    3. Copy the returned JSON and click <strong>Paste AI Exam</strong> above to import the 40 questions directly into EdTechra.
                  </p>
                </div>
              </div>

              {/* Blueprint Summary Pill */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 flex flex-wrap gap-2 items-center justify-between font-semibold">
                <span>Controlled Blueprint: 7 Sections (A through G)</span>
                <span className="text-purple-700 font-bold">40 Questions • 100 Marks Total</span>
              </div>

              {/* Prompt Text Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    AI EXAM PROMPT ({generatedPrompt.length} characters)
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPrompt ? 'Copied to Clipboard!' : 'Copy Prompt'}</span>
                  </button>
                </div>

                <pre className="p-4 bg-slate-50 border border-slate-300 rounded-2xl text-[11px] font-mono text-slate-900 whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed shadow-inner select-all">
                  {generatedPrompt}
                </pre>
              </div>

              {/* Next Step Shortcut */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                >
                  <span>Ready to import? Go to Paste AI Exam</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Paste AI Response (JSON)
                </label>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) {
                        setPasteText(text);
                        handleValidatePaste(text);
                      }
                    } catch {}
                  }}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Paste from Clipboard</span>
                </button>
              </div>

              <textarea
                ref={textareaRef}
                rows={10}
                value={pasteText}
                onChange={(e) => {
                  const val = e.target.value;
                  setPasteText(val);
                  handleValidatePaste(val);
                }}
                placeholder="Paste the JSON response from ChatGPT, Gemini, or Claude here (including or excluding ```json code fences)..."
                className="w-full p-4 bg-white border border-slate-300 rounded-2xl text-xs font-mono text-slate-900 placeholder:text-slate-500 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-purple-500 leading-relaxed resize-y"
              />

              {/* Validation Feedback & Action Buttons */}
              {validationResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs space-y-3 animate-fadeIn ${
                    validationResult.isValid
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <div className="flex items-center gap-2">
                      {validationResult.isValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      )}
                      <span>
                        {validationResult.isValid
                          ? 'Valid EdTechra Standard Exam 2.0 Package'
                          : `Validation Issues Found (${validationResult.errors.length})`}
                      </span>
                    </div>

                    {validationResult.stats && (
                      <span className="text-[11px] font-mono font-bold text-slate-700">
                        {validationResult.stats.totalQuestions} Questions • {validationResult.stats.sectionsCount} Sections • {validationResult.stats.totalMarks} Marks
                      </span>
                    )}
                  </div>

                  {validationResult.errors.length > 0 && (
                    <div className="space-y-3">
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-700 font-medium max-h-40 overflow-y-auto">
                        {validationResult.errors.map((err, idx) => (
                          <li key={idx}>
                            {err.questionId ? `[${err.questionId}] ` : ''}
                            {err.message}
                          </li>
                        ))}
                      </ul>

                      {/* Explicit Fix with AI, Edit JSON, Cancel Buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-200/80">
                        <button
                          type="button"
                          onClick={handleCopyCorrection}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                        >
                          {copiedCorrection ? <Check className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                          <span>{copiedCorrection ? 'Correction Prompt Copied!' : 'Fix with AI'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => textareaRef.current?.focus()}
                          className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                        >
                          Edit JSON
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setValidationResult(null);
                            setPasteText('');
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
            Strict validation ensures zero empty sections and exact 100 marks.
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold shadow-2xs cursor-pointer transition-colors"
            >
              Cancel
            </button>

            {activeTab === 'paste' ? (
              <button
                type="button"
                disabled={!pasteText.trim() || !validationResult?.isValid}
                onClick={handleImport}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-purple-600/20 cursor-pointer transition-all active:scale-95 disabled:opacity-40"
              >
                <span>Import Into Live Exam Cards</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-purple-600/20 cursor-pointer transition-all active:scale-95"
              >
                {copiedPrompt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedPrompt ? 'Copied!' : 'Copy Prompt'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
