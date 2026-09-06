// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: AI PROMPT GENERATOR (STEP 5)
// Dedicated Copyable Panel for External AI Generation
// ============================================================================

import React, { useState } from 'react';
import { Copy, Check, Sparkles, ArrowRight, Bot, AlertCircle } from 'lucide-react';
import { ExamMetadata, PedagogicalRequirements } from '../shared/ExamSchema';
import { buildAIExamPrompt, QuestionTypeConfigItem } from './promptBuilder';

interface AIPromptGeneratorProps {
  metadata: ExamMetadata;
  questionConfigs: QuestionTypeConfigItem[];
  requirements: PedagogicalRequirements;
  sourceMaterial?: string;
  onProceedToImport: () => void;
}

export const AIPromptGenerator: React.FC<AIPromptGeneratorProps> = ({
  metadata,
  questionConfigs,
  requirements,
  sourceMaterial,
  onProceedToImport
}) => {
  const [copied, setCopied] = useState(false);

  const promptText = React.useMemo(() => {
    return buildAIExamPrompt({
      exam: metadata,
      questionConfigs,
      requirements,
      sourceMaterial
    });
  }, [metadata, questionConfigs, requirements, sourceMaterial]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const totalQuestions = questionConfigs.reduce((acc, c) => acc + (Number(c.count) || 0), 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Step Header */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-purple-950/70 to-blue-950/80 p-6 rounded-3xl border border-indigo-500/30 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center shrink-0 text-indigo-300 shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white tracking-wide">Step 5: Copy Your AI Generation Prompt</h3>
            <p className="text-xs text-indigo-200/80 leading-relaxed max-w-xl">
              EdTechra has assembled your full exam requirements, pedagogical objectives, and canonical schema into a precision prompt.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleCopy}
          className={`px-6 py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0 active:scale-95 shadow-lg ${
            copied
              ? 'bg-emerald-600 text-white shadow-emerald-500/30'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/30'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span>Prompt Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy AI Prompt</span>
            </>
          )}
        </button>
      </div>

      {/* Instructions Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#0e1a3b] border border-blue-800/60 space-y-1.5">
          <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center">
            1
          </div>
          <div className="text-xs font-black text-white">Copy Prompt</div>
          <p className="text-[11px] text-slate-400">
            Click the "Copy AI Prompt" button above or in the prompt box below.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e1a3b] border border-blue-800/60 space-y-1.5">
          <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-300 font-black text-xs flex items-center justify-center">
            2
          </div>
          <div className="text-xs font-black text-white">Paste into Preferred AI</div>
          <p className="text-[11px] text-slate-400">
            Paste into ChatGPT, Claude, Google Gemini, or your preferred AI assistant.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e1a3b] border border-blue-800/60 space-y-1.5">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-xs flex items-center justify-center">
            3
          </div>
          <div className="text-xs font-black text-white">Paste JSON Back</div>
          <p className="text-[11px] text-slate-400">
            Copy the structured JSON output from the AI and paste it into Step 6.
          </p>
        </div>
      </div>

      {/* Dedicated Copyable Prompt Panel */}
      <div className="bg-[#091124] rounded-3xl border border-blue-800/80 overflow-hidden shadow-2xl space-y-0">
        {/* Panel Header */}
        <div className="px-5 py-3.5 bg-[#0f1b3d] border-b border-blue-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-black text-white uppercase tracking-wider">AI Exam Generation Prompt</span>
            <span className="text-[11px] text-indigo-300 font-mono">({promptText.length} characters)</span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="text-xs font-bold text-indigo-300 hover:text-white flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/50 cursor-pointer transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Prompt Content Viewport */}
        <div className="p-5 max-h-96 overflow-y-auto font-mono text-xs text-blue-100/90 leading-relaxed whitespace-pre-wrap select-all">
          {promptText}
        </div>

        {/* Panel Footer */}
        <div className="px-5 py-3 bg-[#0c1633] border-t border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            Generating for: <strong className="text-white">{metadata.title || 'Assessment'}</strong> • {totalQuestions} Questions
          </span>

          <button
            type="button"
            onClick={onProceedToImport}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <span>Proceed to Paste JSON</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
