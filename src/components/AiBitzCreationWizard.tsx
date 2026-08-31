import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Copy, Check, AlertCircle, AlertTriangle, 
  ChevronRight, ChevronLeft, Loader2, Sparkles, 
  BookOpen, ClipboardCheck, FileSearch, Download 
} from 'lucide-react';
import { ALL_BITZ_TOPICS } from '@/utils/bitzTopicsConfig';
import { CEFR_LEVELS } from '@/utils/bitzCefrConfig';
import { generateBitzAiPrompt } from '@/utils/bitzAiPromptGenerator';
import { knowledgeBitzService } from '@/services/knowledgeBitzService';
import type { BitzCefrLevel } from '@/types';

export interface AiBitzCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  token: string | null;
}

interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
}

interface ValidatedRecord {
  original: any;
  status: 'valid' | 'warning' | 'error';
  issues: ValidationIssue[];
}

const BATCH_SIZES = [5, 10, 20, 50, 100];

export const AiBitzCreationWizard: React.FC<AiBitzCreationWizardProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  token
}) => {
  const [step, setStep] = useState(1);
  
  // Step 1 State
  const [selectedTopicId, setSelectedTopicId] = useState<string>(ALL_BITZ_TOPICS?.[0]?.id || '');
  const [selectedCefr, setSelectedCefr] = useState<string>(CEFR_LEVELS?.[0]?.id || 'A2');
  const [batchSize, setBatchSize] = useState<number | 'custom'>(10);
  const [customBatchSize, setCustomBatchSize] = useState<number>(10);
  
  // Step 2 State
  const [promptCopied, setPromptCopied] = useState(false);
  
  // Step 3 State
  const [jsonInput, setJsonInput] = useState('');
  
  // Step 4 State (Validation Results)
  const [validatedRecords, setValidatedRecords] = useState<ValidatedRecord[]>([]);
  const [jsonError, setJsonError] = useState<string | null>(null);
  
  // Step 5 State (Import)
  const [isImporting, setIsImporting] = useState(false);
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
        topicId: selectedTopicId, 
        cefrLevel: selectedCefr as BitzCefrLevel, 
        quantity: effectiveBatchSize 
      });
    } catch (e) {
      return 'Error generating prompt. Please ensure all fields are selected.';
    }
  }, [step, selectedTopicId, selectedCefr, effectiveBatchSize]);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const validateJson = () => {
    setJsonError(null);
    let parsed: any;
    try {
      parsed = JSON.parse(jsonInput);
    } catch (e: any) {
      setJsonError(`Invalid JSON syntax: ${e.message}`);
      return;
    }

    let records = [];
    if (Array.isArray(parsed)) {
      records = parsed;
    } else if (parsed?.bitz && Array.isArray(parsed.bitz)) {
      records = parsed.bitz;
    } else {
      setJsonError('Could not find an array of records in the JSON provided. Ensure the response matches the requested structure.');
      return;
    }

    const results: ValidatedRecord[] = records.map((record: any) => {
      const issues: ValidationIssue[] = [];
      let status: 'valid' | 'warning' | 'error' = 'valid';

      // Title
      if (!record.title || typeof record.title !== 'string' || record.title.length < 5) {
        issues.push({ type: 'error', message: 'Title is missing or less than 5 characters.' });
      }

      // Short Fact
      if (!record.short_fact || typeof record.short_fact !== 'string' || record.short_fact.length < 10) {
        issues.push({ type: 'error', message: 'Short fact is missing or less than 10 characters.' });
      }

      // Reading Text
      if (!record.reading_text || typeof record.reading_text !== 'string') {
        issues.push({ type: 'error', message: 'Reading text is missing.' });
      } else {
        const words = record.reading_text.trim().split(/\s+/).length;
        if (words < 40 || words > 250) {
          issues.push({ type: 'error', message: `Reading text length (${words} words) is outside 40-250 bounds.` });
        } else if (words < 80 || words > 120) {
          issues.push({ type: 'warning', message: `Reading text length (${words} words) is outside optimal 80-120 bounds.` });
        }
      }

      // Topic ID
      if (record.topic_id !== selectedTopicId) {
        issues.push({ type: 'warning', message: `Topic ID '${record.topic_id}' doesn't match selected topic '${selectedTopicId}'.` });
      }

      // Quiz
      if (!record.quiz || typeof record.quiz !== 'object') {
        issues.push({ type: 'error', message: 'Quiz object is missing.' });
      } else {
        if (!record.quiz.question) issues.push({ type: 'error', message: 'Quiz question is missing.' });
        if (!Array.isArray(record.quiz.options) || record.quiz.options.length !== 4) {
          issues.push({ type: 'error', message: 'Quiz must have exactly 4 options.' });
        } else if (record.quiz.correct_answer && !record.quiz.options.includes(record.quiz.correct_answer)) {
          issues.push({ type: 'error', message: 'Quiz correct_answer must match one of the options.' });
        }
      }

      // Source
      if (!record.source_citation) {
        issues.push({ type: 'error', message: 'Source citation is missing.' });
      }

      if (issues.some(i => i.type === 'error')) {
        status = 'error';
      } else if (issues.some(i => i.type === 'warning')) {
        status = 'warning';
      }

      return { original: record, status, issues };
    });

    setValidatedRecords(results);
    setStep(4);
  };

  const handleImport = async () => {
    setIsImporting(true);
    const validRecords = validatedRecords
      .filter(r => r.status !== 'error')
      .map(r => r.original);
    
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

  const validCount = validatedRecords.filter(r => r.status === 'valid').length;
  const warningCount = validatedRecords.filter(r => r.status === 'warning').length;
  const errorCount = validatedRecords.filter(r => r.status === 'error').length;
  const totalImportable = validCount + warningCount;

  const steps = [
    { num: 1, label: 'Setup', icon: BookOpen },
    { num: 2, label: 'Prompt', icon: Sparkles },
    { num: 3, label: 'Response', icon: ClipboardCheck },
    { num: 4, label: 'Validate', icon: FileSearch },
    { num: 5, label: 'Import', icon: Download },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center bg-stone-50 dark:bg-stone-900/50">
          <div>
            <h2 className="text-2xl font-black text-[#0a213c] dark:text-white">Create Knowledge Bitz</h2>
            <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">AI-Assisted Content Generation Wizard</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-8 py-5 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-stone-200 dark:bg-stone-700 -z-10 rounded-full"></div>
            {steps.map((s) => {
              const isCompleted = step > s.num;
              const isCurrent = step === s.num;
              return (
                <div key={s.num} className="flex flex-col items-center gap-2 bg-white dark:bg-stone-900 px-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isCompleted ? 'bg-emerald-600 border-emerald-600 text-white' :
                    isCurrent ? 'bg-[#026fc3] border-[#026fc3] text-white shadow-lg shadow-blue-500/30' :
                    'bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600 text-stone-400'
                  }`}>
                    {isCompleted ? <Check size={20} className="stroke-[3]" /> : <s.icon size={20} />}
                  </div>
                  <span className={`text-xs font-bold ${
                    isCurrent ? 'text-[#0a213c] dark:text-white' : 
                    isCompleted ? 'text-emerald-600' : 'text-stone-500'
                  }`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-stone-50/50 dark:bg-stone-900/50">
          
          {/* STEP 1: SETUP */}
          {step === 1 && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center mb-8">
                <h3 className="text-xl font-black text-[#0a213c] dark:text-white mb-2">Content Parameters</h3>
                <p className="text-stone-600 dark:text-stone-400">Choose category, English level, and quantity to generate an AI content prompt.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Knowledge Category</label>
                  <select 
                    value={selectedTopicId}
                    onChange={e => setSelectedTopicId(e.target.value)}
                    className="w-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-950 dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#026fc3] focus:border-transparent outline-none transition-all font-medium"
                  >
                    {ALL_BITZ_TOPICS.map(topic => (
                      <option key={topic.id} value={topic.id}>{topic.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-3">Target CEFR Level</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {CEFR_LEVELS.map(level => {
                      const isActive = selectedCefr === level.id;
                      return (
                        <button
                          key={level.id}
                          onClick={() => setSelectedCefr(level.id)}
                          className={`py-3 rounded-xl font-bold border-2 transition-all cursor-pointer ${
                            isActive 
                              ? 'border-[#026fc3] bg-[#026fc3]/10 text-[#026fc3] dark:text-blue-400' 
                              : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
                          }`}
                        >
                          {level.shortLabel || level.id}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-3">Batch Size (Quantity)</label>
                  <div className="flex flex-wrap gap-3 items-center">
                    {BATCH_SIZES.map(size => (
                      <button
                        key={size}
                        onClick={() => setBatchSize(size)}
                        className={`px-5 py-3 rounded-xl font-bold border-2 transition-all cursor-pointer ${
                          batchSize === size 
                            ? 'border-[#026fc3] bg-[#026fc3]/10 text-[#026fc3] dark:text-blue-400' 
                            : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setBatchSize('custom')}
                        className={`px-5 py-3 rounded-xl font-bold border-2 transition-all cursor-pointer ${
                          batchSize === 'custom' 
                            ? 'border-[#026fc3] bg-[#026fc3]/10 text-[#026fc3] dark:text-blue-400' 
                            : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
                        }`}
                      >
                        Custom
                      </button>
                      {batchSize === 'custom' && (
                        <input 
                          type="number" 
                          min="1" 
                          max="500"
                          value={customBatchSize}
                          onChange={e => setCustomBatchSize(parseInt(e.target.value) || 10)}
                          className="w-24 border-2 border-[#026fc3] bg-white dark:bg-stone-800 text-stone-950 dark:text-white rounded-xl px-3 py-3 focus:outline-none font-bold"
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
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center mb-6">
                <h3 className="text-xl font-black text-[#0a213c] dark:text-white mb-2">Prompt Ready</h3>
                <p className="text-stone-600 dark:text-stone-400">Paste this prompt into Gemini, ChatGPT, or Claude. Copy the AI's JSON response for the next step.</p>
              </div>

              <div className="flex-1 relative bg-[#0a213c] rounded-2xl overflow-hidden flex flex-col border border-stone-800 shadow-inner">
                <div className="flex justify-between items-center px-4 py-3 bg-black/40 border-b border-white/10">
                  <span className="text-xs font-mono text-stone-400">system_prompt.txt</span>
                  <button 
                    onClick={handleCopyPrompt}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all cursor-pointer ${
                      promptCopied 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {promptCopied ? <Check size={16} /> : <Copy size={16} />}
                    {promptCopied ? 'Copied!' : 'Copy Prompt'}
                  </button>
                </div>
                <pre className="flex-1 overflow-y-auto p-6 text-green-300 font-mono text-sm whitespace-pre-wrap">
                  {generatedPrompt}
                </pre>
              </div>
            </div>
          )}

          {/* STEP 3: PASTE AI RESPONSE */}
          {step === 3 && (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center mb-6">
                <h3 className="text-xl font-black text-[#0a213c] dark:text-white mb-2">Import AI Content</h3>
                <p className="text-stone-600 dark:text-stone-400">Paste the raw JSON response from the AI tool below to validate the contents.</p>
              </div>
              
              {jsonError && (
                <div className="mb-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 flex items-start gap-3">
                  <AlertCircle className="shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-bold text-sm">Validation Error</h4>
                    <p className="text-sm mt-1">{jsonError}</p>
                  </div>
                </div>
              )}

              <textarea
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                placeholder="Paste the AI-generated JSON response here... It should contain an array of Bitz objects."
                className="flex-1 min-h-[300px] w-full border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-300 rounded-2xl p-6 font-mono text-sm focus:ring-2 focus:ring-[#026fc3] focus:border-transparent outline-none resize-none shadow-inner"
              />
            </div>
          )}

          {/* STEP 4: VALIDATION RESULTS */}
          {step === 4 && (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center mb-6">
                <h3 className="text-xl font-black text-[#0a213c] dark:text-white mb-2">Diagnostic Results</h3>
                <p className="text-stone-600 dark:text-stone-400">Review the validation results for the imported records.</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                  <Check className="text-emerald-600 mb-2" size={24} />
                  <span className="text-2xl font-black text-emerald-700 dark:text-emerald-500">{validCount}</span>
                  <span className="text-xs font-bold text-emerald-600/80 uppercase tracking-wider">Valid</span>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                  <AlertTriangle className="text-amber-600 mb-2" size={24} />
                  <span className="text-2xl font-black text-amber-700 dark:text-amber-500">{warningCount}</span>
                  <span className="text-xs font-bold text-amber-600/80 uppercase tracking-wider">Warnings</span>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                  <AlertCircle className="text-rose-600 mb-2" size={24} />
                  <span className="text-2xl font-black text-rose-700 dark:text-rose-500">{errorCount}</span>
                  <span className="text-xs font-bold text-rose-600/80 uppercase tracking-wider">Errors</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar min-h-[300px]">
                {validatedRecords.map((record, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-xl border flex items-start gap-4 ${
                      record.status === 'valid' ? 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700' :
                      record.status === 'warning' ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50' :
                      'bg-rose-50/50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800/50'
                    }`}
                  >
                    <div className="mt-1 shrink-0">
                      {record.status === 'valid' && <Check className="text-emerald-500" size={20} />}
                      {record.status === 'warning' && <AlertTriangle className="text-amber-500" size={20} />}
                      {record.status === 'error' && <AlertCircle className="text-rose-500" size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono bg-stone-100 dark:bg-stone-900 text-stone-500 px-2 py-0.5 rounded">#{idx + 1}</span>
                        <h4 className="font-bold text-stone-900 dark:text-stone-100 truncate">
                          {record.original?.title || 'Untitled Record'}
                        </h4>
                      </div>
                      
                      {record.issues.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {record.issues.map((issue, i) => (
                            <li key={i} className={`text-sm flex items-start gap-1.5 ${
                              issue.type === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                            }`}>
                              <span className="mt-1 text-[10px]">●</span>
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
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              {!importResult ? (
                <>
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-black text-[#0a213c] dark:text-white mb-2">Ready to Import</h3>
                    <p className="text-stone-600 dark:text-stone-400">Previewing {totalImportable} valid records to be imported as drafts.</p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar min-h-[300px]">
                    {validatedRecords.filter(r => r.status !== 'error').map((record, idx) => (
                      <div key={idx} className="bg-white dark:bg-stone-800 rounded-2xl p-5 border border-stone-200 dark:border-stone-700 shadow-sm">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <h4 className="font-black text-lg text-[#0a213c] dark:text-white leading-tight">{record.original.title}</h4>
                          <span className="shrink-0 text-xs font-bold uppercase tracking-wider bg-stone-100 dark:bg-stone-900 text-stone-500 px-2.5 py-1 rounded-md">
                            {record.original.topic_id}
                          </span>
                        </div>
                        <p className="text-sm text-stone-600 dark:text-stone-400 line-clamp-2 mb-4">
                          {record.original.short_fact}
                        </p>
                        <div className="bg-stone-50 dark:bg-stone-900 rounded-xl p-4 border border-stone-100 dark:border-stone-800">
                          <p className="text-sm font-bold text-stone-800 dark:text-stone-200 mb-2">Quiz Preview:</p>
                          <p className="text-sm italic text-stone-600 dark:text-stone-400">"{record.original.quiz?.question}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                  <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6">
                    <Check className="text-emerald-600" size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-[#0a213c] dark:text-white mb-3">Import Complete!</h3>
                  <p className="text-stone-600 dark:text-stone-400 mb-6">
                    Successfully imported <strong className="text-stone-900 dark:text-white">{importResult.success}</strong> Bitz as drafts.
                    {importResult.failed > 0 && ` Failed to import ${importResult.failed} records.`}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 flex items-center justify-between mt-auto">
          <div className="text-sm font-bold text-stone-400">
            Step {step} of 5
          </div>
          <div className="flex items-center gap-3">
            {step > 1 && !importResult && (
              <button
                onClick={() => setStep(step === 4 ? 3 : step - 1)}
                disabled={isImporting}
                className="px-5 py-2.5 rounded-xl font-bold text-stone-700 hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-800 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
                {step === 4 ? 'Fix & Revalidate' : 'Back'}
              </button>
            )}
            
            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2.5 rounded-xl font-black bg-[#026fc3] hover:bg-blue-700 text-white shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                Generate Prompt <ChevronRight size={18} />
              </button>
            )}
            
            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                className="px-6 py-2.5 rounded-xl font-black bg-[#026fc3] hover:bg-blue-700 text-white shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                Next Step <ChevronRight size={18} />
              </button>
            )}

            {step === 3 && (
              <button
                onClick={validateJson}
                disabled={!jsonInput.trim()}
                className="px-6 py-2.5 rounded-xl font-black bg-[#026fc3] hover:bg-blue-700 text-white shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Validate Content <ChevronRight size={18} />
              </button>
            )}

            {step === 4 && (
              <button
                onClick={() => setStep(5)}
                disabled={totalImportable === 0}
                className="px-6 py-2.5 rounded-xl font-black bg-[#026fc3] hover:bg-blue-700 text-white shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {totalImportable} Valid Records <ChevronRight size={18} />
              </button>
            )}

            {step === 5 && !importResult && (
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="px-6 py-2.5 rounded-xl font-black bg-[#026fc3] hover:bg-blue-700 text-white shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <><Loader2 className="animate-spin" size={18} /> Importing...</>
                ) : (
                  <><Download size={18} /> Import as Drafts</>
                )}
              </button>
            )}

            {step === 5 && importResult && (
              <button
                onClick={() => {
                  onImportComplete();
                  onClose();
                }}
                className="px-8 py-2.5 rounded-xl font-black bg-[#026fc3] hover:bg-blue-700 text-white shadow-md transition-all cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
