// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: JSON IMPORT MODAL
// Converts external AI JSON response into live editable canvas question cards
// ============================================================================

import React, { useState } from 'react';
import { X, FileCode, CheckCircle2, XCircle, Sparkles, ClipboardPaste } from 'lucide-react';
import { ExamSection } from '../../shared/ExamSchema';
import { validateExamJSON, ValidationResult } from '../../teacher/JSONValidator';

interface JSONImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSections: (sections: ExamSection[], updatedExamMeta?: any) => void;
}

export const JSONImportModal: React.FC<JSONImportModalProps> = ({
  isOpen,
  onClose,
  onImportSections
}) => {
  const [jsonText, setJsonText] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  if (!isOpen) return null;

  const handleValidate = () => {
    const res = validateExamJSON(jsonText);
    setValidation(res);
  };

  const handleImport = () => {
    if (!validation?.isValid || !validation.parsedExam) return;
    const { sections, exam } = validation.parsedExam;
    onImportSections(sections, exam);
    onClose();
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setJsonText(text);
        const res = validateExamJSON(text);
        setValidation(res);
      }
    } catch {
      // If clipboard API blocked, user pastes manually
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xs animate-fadeIn overflow-y-auto select-none">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Import AI-Generated JSON</h3>
              <p className="text-xs text-slate-600 font-medium">Paste structured JSON from ChatGPT, Gemini, or Claude.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 bg-white">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-slate-800">Raw JSON Text:</label>
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Paste from Clipboard</span>
            </button>
          </div>

          <textarea
            rows={8}
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setValidation(null);
            }}
            placeholder="Paste raw JSON or ```json ... ``` code fence here..."
            className="w-full p-3.5 bg-white border border-slate-300 rounded-2xl text-xs font-mono text-slate-900 placeholder:text-slate-500 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y"
          />

          {/* Validation Feedback Panel */}
          {validation && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-2 animate-fadeIn ${
                validation.isValid
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center justify-between font-black">
                <div className="flex items-center gap-2">
                  {validation.isValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>
                    {validation.isValid
                      ? 'Valid EdTechra Assessment Schema'
                      : `Validation Failed (${validation.errors.length} errors)`}
                  </span>
                </div>
                {validation.stats && (
                  <span className="text-[11px] font-mono text-slate-600 font-bold">
                    {validation.stats.questionCount} Questions • {validation.stats.sectionCount} Sections
                  </span>
                )}
              </div>

              {validation.errors.length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-700 font-medium">
                  {validation.errors.map((err, idx) => (
                    <li key={idx}>{err.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              disabled={!jsonText.trim()}
              onClick={handleValidate}
              className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-bold shadow-2xs cursor-pointer transition-all disabled:opacity-40"
            >
              Validate Syntax
            </button>

            <button
              type="button"
              disabled={!validation?.isValid}
              onClick={handleImport}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Convert to Editable Cards</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
