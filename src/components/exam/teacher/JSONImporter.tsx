// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: JSON IMPORTER (STEP 6)
// Validates structured AI output with visual error/warning panels
// ============================================================================

import React, { useState } from 'react';
import {
  FileCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RotateCcw,
  ClipboardPaste,
  ShieldCheck,
  Check
} from 'lucide-react';
import { CanonicalExamV1 } from '../shared/ExamSchema';
import { validateExamJSON, ValidationResult } from './JSONValidator';

interface JSONImporterProps {
  onExamImported: (exam: CanonicalExamV1) => void;
  onBackToPrompt: () => void;
}

export const JSONImporter: React.FC<JSONImporterProps> = ({
  onExamImported,
  onBackToPrompt
}) => {
  const [jsonText, setJsonText] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const handleValidate = () => {
    if (!jsonText.trim()) {
      setValidationResult({
        isValid: false,
        errors: [{ id: 'empty_input', message: 'Please paste the AI-generated JSON before validating.' }],
        warnings: []
      });
      return;
    }

    const result = validateExamJSON(jsonText);
    setValidationResult(result);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setJsonText(text);
        const result = validateExamJSON(text);
        setValidationResult(result);
      }
    } catch (e) {
      console.warn('Could not read from clipboard directly:', e);
    }
  };

  const handleImport = () => {
    if (!validationResult?.isValid || !validationResult.parsedExam) {
      handleValidate();
      return;
    }
    onExamImported(validationResult.parsedExam);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-indigo-950/60 to-blue-950/70 p-6 rounded-3xl border border-emerald-500/30 backdrop-blur-md">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 text-emerald-300 shadow-inner">
            <ClipboardPaste className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white tracking-wide">Step 6: Import AI-Generated JSON</h3>
            <p className="text-xs text-emerald-200/80 leading-relaxed max-w-xl">
              Paste the structured JSON response you received from ChatGPT, Gemini, or Claude. EdTechra will strictly validate the syntax, answer keys, and schemas.
            </p>
          </div>
        </div>
      </div>

      {/* Editor & Validation Display */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-indigo-400" />
            Paste AI JSON Response
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-700/50 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Paste from Clipboard</span>
            </button>
            {jsonText && (
              <button
                type="button"
                onClick={() => {
                  setJsonText('');
                  setValidationResult(null);
                }}
                className="text-xs font-bold text-slate-400 hover:text-rose-400 px-2.5 py-1.5 cursor-pointer transition-all"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Text Area Code Box */}
        <div className="relative">
          <textarea
            rows={14}
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              if (validationResult) setValidationResult(null);
            }}
            placeholder={`{\n  "schemaVersion": "1.0",\n  "exam": {\n    "title": "...",\n    ...\n  },\n  "sections": [...]\n}`}
            className="w-full p-5 bg-[#091124] border border-blue-800/80 rounded-3xl font-mono text-xs text-blue-100 placeholder:text-blue-400/30 focus:outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 leading-relaxed resize-y"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={onBackToPrompt}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-blue-800/80 text-slate-300 hover:text-white hover:bg-blue-900/40 text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Back to AI Prompt</span>
          </button>

          <div className="w-full sm:w-auto flex items-center gap-3">
            <button
              type="button"
              onClick={handleValidate}
              disabled={!jsonText.trim()}
              className="flex-1 sm:flex-initial px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Validate JSON</span>
            </button>

            {validationResult?.isValid && (
              <button
                type="button"
                onClick={handleImport}
                className="flex-1 sm:flex-initial px-7 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/30 transition-all active:scale-95 animate-bounce-subtle"
              >
                <Check className="w-4 h-4" />
                <span>Import Exam Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Validation Report Panel */}
      {validationResult && (
        <div
          className={`p-6 rounded-3xl border transition-all animate-fadeIn space-y-4 ${
            validationResult.isValid
              ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/60 text-rose-200'
          }`}
        >
          {/* Header Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {validationResult.isValid ? (
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-300">
                  <XCircle className="w-6 h-6" />
                </div>
              )}
              <div>
                <h4 className="text-base font-black text-white">
                  {validationResult.isValid ? 'JSON Validation Passed' : 'JSON Validation Failed'}
                </h4>
                <div className="flex items-center gap-3 text-xs font-semibold mt-0.5">
                  {validationResult.errors.length > 0 && (
                    <span className="text-rose-400 flex items-center gap-1 font-bold">
                      <XCircle className="w-3.5 h-3.5" />
                      {validationResult.errors.length} error{validationResult.errors.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {validationResult.warnings.length > 0 && (
                    <span className="text-amber-400 flex items-center gap-1 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {validationResult.warnings.length} warning{validationResult.warnings.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {validationResult.isValid && validationResult.stats && (
                    <span className="text-emerald-300 font-bold">
                      {validationResult.stats.questionCount} Questions • {validationResult.stats.sectionCount} Sections • {validationResult.stats.totalMarks} Total Marks
                    </span>
                  )}
                </div>
              </div>
            </div>

            {validationResult.isValid && (
              <button
                type="button"
                onClick={handleImport}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
              >
                <span>Import Exam</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Errors List */}
          {validationResult.errors.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-black text-rose-300 uppercase tracking-wider">Errors to Resolve:</div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {validationResult.errors.map((err, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-xs text-rose-200 flex items-start gap-2.5"
                  >
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/30 text-rose-200 font-black text-[10px] shrink-0 uppercase tracking-wider">
                      ERROR
                    </span>
                    <span className="leading-snug">{err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings List */}
          {validationResult.warnings.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="text-xs font-black text-amber-300 uppercase tracking-wider">Warnings:</div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {validationResult.warnings.map((warn, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-amber-950/70 border border-amber-500/50 text-xs text-amber-200 flex items-start gap-2.5"
                  >
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/30 text-amber-200 font-black text-[10px] shrink-0 uppercase tracking-wider">
                      WARNING
                    </span>
                    <span className="leading-snug">{warn.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
