import React from 'react';
import { AlertTriangle, CheckCircle2, Sparkles, Lightbulb } from 'lucide-react';
import { WeakAreaVisualData } from '@/services/teachingIntelligenceService';

interface WeakAreaVisualizerProps {
  data?: WeakAreaVisualData | null;
}

export const WeakAreaVisualizer: React.FC<WeakAreaVisualizerProps> = ({ data }) => {
  if (!data || !data.topicsComparison || data.topicsComparison.length === 0) {
    return (
      <div className="p-6 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-center space-y-1">
        <p className="text-xs font-bold text-slate-700">Not enough evidence yet.</p>
        <p className="text-[11px] text-slate-500">
          Complete classroom tasks, quizzes, and assessments to highlight specific weak and strong topic areas.
        </p>
      </div>
    );
  }

  const { weakestTopic, weakestScore, topicsComparison, shortAnalysis, recommendation, hasWeakArea } = data;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Targeted Topic & Skill Diagnostics
            </h4>
            {hasWeakArea ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Weak Area Detected</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>On Track</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            Comparative performance across assessed skill domains
          </p>
        </div>

        {hasWeakArea && weakestScore != null && (
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Priority Focus</span>
            <span className="text-xs font-black text-rose-700">{weakestTopic} ({weakestScore}%)</span>
          </div>
        )}
      </div>

      {/* Visual Bar Comparison */}
      <div className="space-y-3 pt-1">
        {topicsComparison.map((item, idx) => {
          const isWeak = item.isWeak || item.score < 60;
          const isStrong = item.score >= 75;

          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900">{item.topic}</span>
                  {isWeak && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-800">
                      Weak Area
                    </span>
                  )}
                </div>
                <span className={`font-black ${isWeak ? 'text-rose-700' : isStrong ? 'text-emerald-700' : 'text-slate-700'}`}>
                  {item.score}%
                </span>
              </div>

              {/* Accessible Contrast Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isWeak
                      ? 'bg-rose-500 shadow-xs'
                      : isStrong
                      ? 'bg-emerald-500'
                      : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, item.score))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Short Analysis & Recommendation Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-900 font-black text-[11px] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>AI Short Analysis</span>
          </div>
          <p className="text-slate-800 font-semibold leading-relaxed">
            {shortAnalysis || 'Not enough evidence yet.'}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-1">
          <div className="flex items-center gap-1.5 text-indigo-900 font-black text-[11px] uppercase tracking-wider">
            <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
            <span>Actionable Recommendation</span>
          </div>
          <p className="text-slate-800 font-semibold leading-relaxed">
            {recommendation || 'Not enough evidence yet.'}
          </p>
        </div>
      </div>
    </div>
  );
};
