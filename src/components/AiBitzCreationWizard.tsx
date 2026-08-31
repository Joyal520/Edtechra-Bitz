// ============================================================================
// EDTECHRA-BITZ: AI Content Creation Wizard (V2)
// 5-Step Workflow: Category/CEFR/Quantity -> Copy Prompt -> Paste JSON -> Validate -> Import
// ============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Copy, Check, AlertCircle, AlertTriangle, 
  ChevronRight, ChevronLeft, Loader2, Sparkles, 
  BookOpen, ClipboardCheck, FileSearch, Download, CheckCircle2 
} from 'lucide-react';
import { BITZ_CATEGORIES } from '@/utils/bitzTopicsConfig';
import { CEFR_LEVELS } from '@/utils/bitzCefrConfig';
import { generateBitzAiPrompt } from '@/utils/bitzAiPromptGenerator';
import { validateBitzBatch, ValidatedBitzRecord } from '@/utils/bitzContentValidator';
import { knowledgeBitzService } from '@/services/knowledgeBitzService';

export interface AiBitzCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  token: string | null;
}

const BATCH_SIZES = [10, 20, 50, 100, 250, 500, 1000];

export const AiBitzCreationWizard: React.FC<AiBitzCreationWizardProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  token
}) => {
  const [step, setStep] = useState<number>(1);
  
  // Step 1 State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(BITZ_CATEGORIES[0]?.id || 'science_nature');
  const [selectedCefr, setSelectedCefr] = useState<string>('B1');
  const [batchSize, setBatchSize] = useState<number | 'custom'>(10);
  const [customBatchSize, setCustomBatchSize] = useState<number>(10);
  
  // Step 2 State
  const [promptCopied, setPromptCopied] = useState<boolean>(false);
  
  // Step 3 State
  const [jsonInput, setJsonInput] = useState<string>('');
  
  // Step 4 State (Validation Results)
  const [validatedRecords, setValidatedRecords] = useState<ValidatedBitzRecord[]>([]);
  const [jsonError, setJsonError] = useState<string | null>(null);
  
  // Step 5 State (Import)
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setJsonInput('');
      setValidatedRecords([]);
      setJsonError(null);
      setImportResult(null);
      setPromptCopied(false);
    }
  }, [isOpen]);

  const effectiveBatchSize = batchSize === 'custom' ? customBatchSize : batchSize;

  const generatedPrompt = useMemo(() => {
    if (step !== 2) return '';
    try {
      return generateBitzAiPrompt({ 
        categoryId: selectedCategoryId, 
        cefrLevel: selectedCefr, 
        quantity: effectiveBatchSize 
      });
    } catch {
      return 'Error generating prompt. Please ensure all fields are selected.';
    }
  }, [step, selectedCategoryId, selectedCefr, effectiveBatchSize]);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleValidateJson = () => {
    setJsonError(null);
    let parsed: any;
    try {
      parsed = JSON.parse(jsonInput);
    } catch (e: any) {
      setJsonError(`Invalid JSON syntax: ${e.message}`);
      return;
    }

    let rawRecords: any[] = [];
    if (Array.isArray(parsed)) {
      rawRecords = parsed;
    } else if (parsed?.bitz && Array.isArray(parsed.bitz)) {
      rawRecords = parsed.bitz;
    } else if (parsed?.facts && Array.isArray(parsed.facts)) {
      rawRecords = parsed.facts;
    } else {
      setJsonError('Could not find an array of records in the JSON provided. Ensure the response contains a "bitz" array.');
      return;
    }

    if (rawRecords.length === 0) {
      setJsonError('The JSON array is empty. Please paste at least one Knowledge Bitz record.');
      return;
    }

    // Run canonical validation
    const { results } = validateBitzBatch(rawRecords);
    setValidatedRecords(results);
    setStep(4);
  };

  const handleImport = async () => {
    setIsImporting(true);
    const validRecords = validatedRecords
      .filter((r) => r.status !== 'error')
      .map((r) => r.original);
    
    try {
      const result = await knowledgeBitzService.bulkImport(validRecords, token, selectedCefr);
      setImportResult({
        success: result?.importedCount ?? validRecords.length,
        failed: result?.failedCount ?? 0
      });
    } catch (e) {
      console.error('Import failed', e);
      setImportResult({ success: 0, failed: validRecords.length });
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  const validCount = validatedRecords.filter((r) => r.status === 'valid').length;
  const warningCount = validatedRecords.filter((r) => r.status === 'warning').length;
  const errorCount = validatedRecords.filter((r) => r.status === 'error').length;
  const totalImportable = validCount + warningCount;

  const steps = [
    { num: 1, label: 'Parameters', icon: BookOpen },
    { num: 2, label: 'Prompt', icon: Sparkles },
    { num: 3, label: 'JSON Response', icon: ClipboardCheck },
    { num: 4, label: 'Validation', icon: FileSearch },
    { num: 5, label: 'Import', icon: Download },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col my-auto">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#0a213c]">Create Knowledge Bitz</h2>
            <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-0.5">AI-Assisted Content Generation Wizard</p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-[#0a213c] transition-colors cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 sm:px-8 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10 rounded-full" />
            {steps.map((s) => {
              const isCompleted = step > s.num;
              const isCurrent = step === s.num;
              return (
                <div key={s.num} className="flex flex-col items-center gap-1.5 bg-slate-50 px-2">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted ? 'bg-emerald-600 border-emerald-600 text-white' :
                    isCurrent ? 'bg-[#026fc3] border-[#026fc3] text-white shadow-md shadow-blue-500/30' :
                    'bg-white border-slate-300 text-slate-400'
                  }`}>
                    {isCompleted ? <Check size={18} className="stroke-[3]" /> : <s.icon size={18} />}
                  </div>
                  <span className={`text-[11px] font-bold ${
                    isCurrent ? 'text-[#0a213c] font-black' : 
                    isCompleted ? 'text-emerald-700' : 'text-slate-500'
                  }`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50">
          
          {/* STEP 1: SETUP */}
          {step === 1 && (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              <div className="text-center mb-6">
                <h3 className="text-lg sm:text-xl font-black text-[#0a213c] mb-1.5">Content Parameters</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-semibold">Select main category, English proficiency, and quantity to generate the AI prompt.</p>
              </div>

              <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#0a213c] mb-2">Main Category</label>
                  <select 
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full border border-slate-300 bg-white text-[#0a213c] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#026fc3]/25 focus:border-[#026fc3] outline-none transition-all font-bold text-sm"
                  >
                    {BITZ_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.subtopics.length} subtopics)
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 font-medium mt-1.5">
                    Subtopics will be assigned automatically by the AI based on each fact's content.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#0a213c] mb-2">CEFR English Level</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {CEFR_LEVELS.map((level) => {
                      const isActive = selectedCefr === level.id;
                      return (
                        <button
                          key={level.id}
                          type="button"
                          onClick={() => setSelectedCefr(level.id)}
                          className={`py-2.5 rounded-xl font-black border-2 transition-all cursor-pointer text-xs sm:text-sm ${
                            isActive 
                              ? 'border-[#026fc3] bg-blue-50 text-[#026fc3] shadow-xs' 
                              : 'border-slate-300 bg-white text-[#0a213c] hover:border-slate-400'
                          }`}
                        >
                          {level.shortLabel || level.id}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#0a213c] mb-2">Batch Size (Quantity)</label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {BATCH_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setBatchSize(size)}
                        className={`px-4 py-2 rounded-xl font-black border-2 transition-all cursor-pointer text-xs ${
                          batchSize === size 
                            ? 'border-[#026fc3] bg-blue-50 text-[#026fc3] shadow-xs' 
                            : 'border-slate-300 bg-white text-[#0a213c] hover:border-slate-400'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBatchSize('custom')}
                        className={`px-4 py-2 rounded-xl font-black border-2 transition-all cursor-pointer text-xs ${
                          batchSize === 'custom' 
                            ? 'border-[#026fc3] bg-blue-50 text-[#026fc3] shadow-xs' 
                            : 'border-slate-300 bg-white text-[#0a213c] hover:border-slate-400'
                        }`}
                      >
                        Custom
                      </button>
                      {batchSize === 'custom' && (
                        <input 
                          type="number" 
                          min="1" 
                          max="1000"
                          value={customBatchSize}
                          onChange={(e) => setCustomBatchSize(Math.max(1, parseInt(e.target.value, 10) || 10))}
                          className="w-20 border-2 border-[#026fc3] bg-white text-[#0a213c] rounded-xl px-2 py-1.5 font-black text-xs outline-none"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PROMPT GENERATED */}
          {step === 2 && (
            <div className="h-full flex flex-col animate-fade-in space-y-4">
              <div className="text-center mb-2">
                <h3 className="text-lg sm:text-xl font-black text-[#0a213c] mb-1">AI Prompt Ready</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-semibold">Copy this prompt and paste it into ChatGPT, Gemini, or Claude.</p>
              </div>

              <div className="flex-1 relative bg-[#082847] rounded-2xl overflow-hidden flex flex-col border border-slate-800 shadow-inner">
                <div className="flex justify-between items-center px-4 py-3 bg-black/40 border-b border-white/10">
                  <span className="text-xs font-mono text-slate-300 font-bold">knowledge_bitz_prompt.txt</span>
                  <button 
                    type="button"
                    onClick={handleCopyPrompt}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                      promptCopied 
                        ? 'bg-emerald-500 text-white shadow-md' 
                        : 'bg-[#026fc3] hover:bg-[#025ea6] text-white shadow-xs'
                    }`}
                  >
                    {promptCopied ? <Check size={16} /> : <Copy size={16} />}
                    {promptCopied ? 'Copied to Clipboard!' : 'Copy Prompt'}
                  </button>
                </div>
                <pre className="flex-1 overflow-y-auto p-5 text-emerald-300 font-mono text-xs sm:text-sm whitespace-pre-wrap leading-relaxed max-h-[400px]">
                  {generatedPrompt}
                </pre>
              </div>
            </div>
          )}

          {/* STEP 3: PASTE AI RESPONSE */}
          {step === 3 && (
            <div className="h-full flex flex-col animate-fade-in space-y-4">
              <div className="text-center mb-2">
                <h3 className="text-lg sm:text-xl font-black text-[#0a213c] mb-1">Paste AI Response</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-semibold">Paste the raw JSON response returned by the AI tool below.</p>
              </div>
              
              {jsonError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
                  <AlertCircle className="shrink-0 mt-0.5 text-rose-600" size={20} />
                  <div>
                    <h4 className="font-black text-sm">JSON Parsing Error</h4>
                    <p className="text-xs mt-1 font-medium">{jsonError}</p>
                  </div>
                </div>
              )}

              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='Paste the JSON response here, e.g. { "bitz": [ ... ] }'
                className="flex-1 min-h-[300px] w-full border border-slate-300 bg-white text-[#0a213c] placeholder:text-slate-400 rounded-2xl p-4 sm:p-5 font-mono text-xs sm:text-sm focus:ring-2 focus:ring-[#026fc3]/25 focus:border-[#026fc3] outline-none resize-none shadow-inner font-semibold"
              />
            </div>
          )}

          {/* STEP 4: VALIDATION RESULTS */}
          {step === 4 && (
            <div className="h-full flex flex-col animate-fade-in space-y-4">
              <div className="text-center mb-2">
                <h3 className="text-lg sm:text-xl font-black text-[#0a213c] mb-1">Validation Diagnostics</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-semibold">Checked: 20-30 word short fact, exactly 100-word reading, 5-quiz array (2 XP each).</p>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center">
                  <Check className="text-emerald-600 mb-1" size={22} />
                  <span className="text-xl font-black text-emerald-800">{validCount}</span>
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Valid Facts</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center">
                  <AlertTriangle className="text-amber-600 mb-1" size={22} />
                  <span className="text-xl font-black text-amber-800">{warningCount}</span>
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Warnings</span>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center">
                  <AlertCircle className="text-rose-600 mb-1" size={22} />
                  <span className="text-xl font-black text-rose-800">{errorCount}</span>
                  <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider">Errors</span>
                </div>
              </div>

              {/* Record List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar max-h-[360px]">
                {validatedRecords.map((record, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                      record.status === 'valid' ? 'bg-white border-slate-200 shadow-2xs' :
                      record.status === 'warning' ? 'bg-amber-50/80 border-amber-200' :
                      'bg-rose-50/80 border-rose-200'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {record.status === 'valid' && <Check className="text-emerald-600" size={18} />}
                      {record.status === 'warning' && <AlertTriangle className="text-amber-600" size={18} />}
                      {record.status === 'error' && <AlertCircle className="text-rose-600" size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md">#{idx + 1}</span>
                        <h4 className="font-black text-[#0a213c] truncate text-sm">
                          {record.original?.title || 'Untitled Record'}
                        </h4>
                        {record.original?.subtopic && (
                          <span className="text-[10px] bg-blue-50 text-[#026fc3] font-bold px-2 py-0.5 rounded-full border border-blue-100">
                            {record.original.subtopic}
                          </span>
                        )}
                      </div>
                      
                      {record.issues.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {record.issues.map((issue: any, i: number) => (
                            <li key={i} className={`text-xs flex items-start gap-1.5 font-semibold ${
                              issue.type === 'error' ? 'text-rose-700' : 'text-amber-800'
                            }`}>
                              <span className="mt-0.5 text-[8px]">●</span>
                              {issue.message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: PREVIEW & IMPORT */}
          {step === 5 && (
            <div className="h-full flex flex-col animate-fade-in space-y-4">
              {!importResult ? (
                <>
                  <div className="text-center mb-2">
                    <h3 className="text-lg sm:text-xl font-black text-[#0a213c] mb-1">Ready for Import</h3>
                    <p className="text-xs sm:text-sm text-slate-600 font-semibold">
                      Importing {totalImportable} valid Knowledge Bitz as drafts. Facts will have 5 quizzes each (10 XP max).
                    </p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar max-h-[360px]">
                    {validatedRecords.filter((r) => r.status !== 'error').map((record, idx) => {
                      const quizList = Array.isArray(record.original.quiz) ? record.original.quiz : [];
                      return (
                        <div key={idx} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="font-black text-base text-[#0a213c] leading-tight">{record.original.title}</h4>
                            <span className="shrink-0 text-[10px] font-black uppercase tracking-wider bg-blue-50 text-[#026fc3] border border-blue-100 px-2.5 py-0.5 rounded-full">
                              {record.original.category || selectedCategoryId}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium line-clamp-2">
                            {record.original.short_fact}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold pt-1">
                            <span>CEFR: <strong>{record.original.cefr_level || selectedCefr}</strong></span>
                            <span>•</span>
                            <span>Quizzes: <strong>{quizList.length} questions (10 XP)</strong></span>
                            {record.original.subtopic && (
                              <>
                                <span>•</span>
                                <span>Subtopic: <strong>{record.original.subtopic}</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto py-8">
                  <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="text-emerald-600 stroke-[2.5]" size={36} />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-[#0a213c] mb-2">Import Successful!</h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-semibold mb-6">
                    Successfully imported <strong className="text-[#0a213c]">{importResult.success}</strong> Knowledge Bitz as drafts.
                    {importResult.failed > 0 && ` ${importResult.failed} duplicates/invalid records were skipped.`}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between mt-auto">
          <div className="text-xs font-black text-slate-500">
            Step {step} of 5
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {step > 1 && !importResult && (
              <button
                type="button"
                onClick={() => setStep(step === 4 ? 3 : step - 1)}
                disabled={isImporting}
                className="px-4 py-2 rounded-xl font-bold text-xs sm:text-sm text-[#0a213c] hover:bg-slate-100 border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ChevronLeft size={16} />
                {step === 4 ? 'Edit & Revalidate' : 'Back'}
              </button>
            )}
            
            {step === 1 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl font-black bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Generate Prompt</span>
                <ChevronRight size={16} />
              </button>
            )}
            
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-5 py-2.5 rounded-xl font-black bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Next: Paste JSON</span>
                <ChevronRight size={16} />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={handleValidateJson}
                disabled={!jsonInput.trim()}
                className="px-5 py-2.5 rounded-xl font-black bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <span>Validate JSON</span>
                <ChevronRight size={16} />
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                onClick={() => setStep(5)}
                disabled={totalImportable === 0}
                className="px-5 py-2.5 rounded-xl font-black bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <span>Import {totalImportable} Valid Records</span>
                <ChevronRight size={16} />
              </button>
            )}

            {step === 5 && !importResult && (
              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting}
                className="px-5 py-2.5 rounded-xl font-black bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isImporting ? (
                  <><Loader2 className="animate-spin" size={16} /> Importing...</>
                ) : (
                  <><Download size={16} /> Import as Drafts</>
                )}
              </button>
            )}

            {step === 5 && importResult && (
              <button
                type="button"
                onClick={() => {
                  onImportComplete();
                  onClose();
                }}
                className="px-6 py-2.5 rounded-xl font-black bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs sm:text-sm shadow-md transition-all cursor-pointer"
              >
                Close Wizard
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
