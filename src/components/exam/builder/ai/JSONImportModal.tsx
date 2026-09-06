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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-[#0b142c] border border-blue-800/90 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-white">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-950 via-[#0f1b3d] to-purple-950 border-b border-blue-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/50 flex items-center justify-center text-indigo-300">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Import AI-Generated JSON</h3>
              <p className="text-xs text-slate-400">Paste structured JSON from ChatGPT, Gemini, or Claude.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-blue-900/40 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">Raw JSON Text:</label>
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="text-xs font-bold text-indigo-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
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
            className="w-full p-3.5 bg-[#070e1f] border border-blue-800/80 rounded-2xl text-xs font-mono text-indigo-200 placeholder:text-slate-600 focus:outline-hidden focus:border-indigo-400 leading-relaxed resize-y"
          />

          {/* Validation Feedback Panel */}
          {validation && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-2 animate-fadeIn ${
                validation.isValid
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between font-black">
                <div className="flex items-center gap-2">
                  {validation.isValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>
                    {validation.isValid
                      ? 'Valid EdTechra Assessment Schema'
                      : `Validation Failed (${validation.errors.length} errors)`}
                  </span>
                </div>
                {validation.stats && (
                  <span className="text-[11px] font-mono text-slate-400">
                    {validation.stats.questionCount} Questions • {validation.stats.sectionCount} Sections
                  </span>
                )}
              </div>

              {validation.errors.length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-300">
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
              className="px-5 py-2.5 rounded-xl border border-blue-800 hover:bg-blue-900/40 text-slate-300 hover:text-white text-xs font-black cursor-pointer transition-all disabled:opacity-30"
            >
              Validate Syntax
            </button>

            <button
              type="button"
              disabled={!validation?.isValid}
              onClick={handleImport}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
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
