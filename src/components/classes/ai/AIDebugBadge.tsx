// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: AI ROUTING DEBUG BADGE
// Compact status indicator showing active AI Provider (Gemini vs OpenAI GPT-5 nano),
// task routing classification, and fallback telemetry.
// ============================================================================

import React, { useState } from 'react';
import { Sparkles, Cpu, AlertTriangle, Info } from 'lucide-react';

export interface AIDebugBadgeProps {
  provider?: 'openai' | 'gemini' | 'deterministic' | 'fallback' | string;
  model?: string;
  taskType?: string;
  fallbackUsed?: boolean;
  tokens?: number;
  latencyMs?: number;
  className?: string;
  onClick?: () => void;
  showDetails?: boolean;
}

export const AIDebugBadge: React.FC<AIDebugBadgeProps> = ({
  provider = 'openai',
  model = 'gpt-5-nano',
  taskType,
  fallbackUsed = false,
  tokens,
  latencyMs,
  className = '',
  onClick
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const isOpenAI = provider === 'openai' || provider === 'openai_fallback' || model?.includes('gpt');
  const isGemini = provider === 'gemini' || model?.includes('gemini');

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all shadow-sm ${
          isOpenAI
            ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
            : isGemini
            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
            : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700'
        }`}
        title="AI Provider Routing Engine"
      >
        {isOpenAI ? (
          <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 animate-pulse" />
        ) : isGemini ? (
          <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        ) : (
          <Info className="w-3.5 h-3.5 text-zinc-500" />
        )}

        <span className="font-semibold">
          {isOpenAI ? 'OpenAI GPT-5 nano' : isGemini ? 'Google Gemini' : 'Local Synthesis'}
        </span>

        {model && (
          <span className="opacity-75 text-[11px] font-mono">
            ({model})
          </span>
        )}

        {fallbackUsed && (
          <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded text-[10px] font-semibold">
            <AlertTriangle className="w-2.5 h-2.5" />
            Fallback
          </span>
        )}
      </button>

      {/* Tooltip on Hover */}
      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-64 p-2.5 bg-slate-900 text-white text-xs rounded-lg shadow-xl border border-slate-700 pointer-events-none">
          <div className="font-semibold text-slate-200 mb-1 flex items-center justify-between">
            <span>Pedagogical AI Routing</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded font-mono">
              Tier {isOpenAI ? '2 (Deep)' : '1 (Fast)'}
            </span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            {isOpenAI
              ? 'Complex educational reasoning, multi-question exam synthesis, and structured lesson plan generation.'
              : isGemini
              ? 'Rapid, economical high-volume response, conversational support, and routine formative checks.'
              : 'Deterministic pedagogy synthesis engine.'}
          </p>
          {(tokens != null || latencyMs != null || taskType) && (
            <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
              {taskType && <span>Task: <b className="text-slate-200">{taskType}</b></span>}
              {tokens != null && <span>Tokens: <b className="text-slate-200">{tokens}</b></span>}
              {latencyMs != null && <span>Latency: <b className="text-slate-200">{latencyMs}ms</b></span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
