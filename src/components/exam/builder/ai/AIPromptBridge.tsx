// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: AI PROMPT BRIDGE (LEVEL 3)
// Generates external AI prompt for ChatGPT/Gemini/Claude and handles copy workflow
// ============================================================================

import React, { useState } from 'react';
import { Bot, Copy, Check, Sparkles } from 'lucide-react';
import { ExamMetadata, PedagogicalRequirements } from '../../shared/ExamSchema';
import { buildAIExamPrompt, QuestionTypeConfigItem } from '../../teacher/promptBuilder';

interface AIPromptBridgeProps {
  metadata: ExamMetadata;
  requirements?: PedagogicalRequirements;
  onOpenJSONImporter: () => void;
}

export const AIPromptBridge: React.FC<AIPromptBridgeProps> = ({
  metadata,
  requirements = {},
  onOpenJSONImporter
}) => {
  const [copied, setCopied] = useState(false);
  const [topicOverride, setTopicOverride] = useState(metadata.topic || '');
  const [customNotes, setCustomNotes] = useState('');

  const defaultQuestionConfigs: QuestionTypeConfigItem[] = [
    { id: '1', type: 'multiple_choice', count: 5, difficulty: 'medium' },
    { id: '2', type: 'true_false', count: 3, difficulty: 'easy' },
    { id: '3', type: 'short_answer', count: 2, difficulty: 'medium' }
  ];

  const generatedPrompt = React.useMemo(() => {
    return buildAIExamPrompt({
      exam: {
        ...metadata,
        topic: topicOverride || metadata.topic || 'General Curriculum'
      },
      questionConfigs: defaultQuestionConfigs,
      requirements: {
        ...requirements,
        specialInstructions: customNotes
      }
    });
  }, [metadata, topicOverride, customNotes, requirements]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="space-y-6 text-white p-1">
      <div>
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple-400" />
          External AI Prompt Bridge
        </h3>
        <p className="text-xs text-slate-400">
          Copy this prompt into ChatGPT, Gemini, or Claude. The AI returns EdTechra JSON which you can import back.
        </p>
      </div>

      {/* Configuration Inputs */}
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-300">Topic / Specific Focus</label>
          <input
            type="text"
            value={topicOverride}
            onChange={(e) => setTopicOverride(e.target.value)}
            placeholder="e.g. European History 1914-1918"
            className="w-full px-3 py-2 bg-[#070e1f] border border-blue-800/70 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-purple-400"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-300">Additional Instructions for AI</label>
          <input
            type="text"
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            placeholder="e.g. Include vocabulary from Oxford Word Skills chapter 3"
            className="w-full px-3 py-2 bg-[#070e1f] border border-blue-800/70 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-purple-400"
          />
        </div>
      </div>

      {/* Generated Prompt Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            Generated AI Prompt ({generatedPrompt.length} chars)
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs font-bold text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Prompt'}</span>
          </button>
        </div>

        <div className="relative">
          <pre className="p-4 bg-[#070e1f] border border-blue-900/80 rounded-2xl text-[11px] font-mono text-purple-200/90 whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed select-all">
            {generatedPrompt}
          </pre>
        </div>
      </div>

      {/* Next Step Action Cards */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/40 space-y-3">
        <div className="text-xs font-black text-white">Got the AI JSON response?</div>
        <p className="text-[11px] text-purple-200/80 leading-relaxed">
          Paste the AI response in the JSON Importer to convert it into live editable question cards.
        </p>
        <button
          type="button"
          onClick={onOpenJSONImporter}
          className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          <span>Open JSON Importer</span>
        </button>
      </div>
    </div>
  );
};
