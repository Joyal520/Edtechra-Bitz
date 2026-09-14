// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: AI USAGE & TELEMETRY ADMIN MODAL
// Real-time visibility into AI token consumption, estimated operational costs,
// provider breakdown (Gemini vs OpenAI GPT-5 nano), and request audit logs.
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  Cpu,
  Sparkles,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers
} from 'lucide-react';

interface AIUsageSummary {
  totalRequests: number;
  providerBreakdown: {
    openai: number;
    gemini: number;
    fallback: number;
  };
  tokenTotals: {
    promptTokens: number;
    completionTokens: number;
    reasoningTokens: number;
    totalTokens: number;
  };
  estimatedCostUSD: {
    openai: string;
    gemini: string;
    total: string;
  };
  fallbackCount: number;
  errorCount: number;
  averageLatencyMs: number;
}

interface AIUsageLogItem {
  id: string;
  timestamp: string;
  provider: string;
  model: string;
  taskType: string;
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  latencyMs: number;
  success: boolean;
  fallbackUsed: boolean;
  error?: string;
}

interface AIUsageAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIUsageAdminModal: React.FC<AIUsageAdminModalProps> = ({ isOpen, onClose }) => {
  const [summary, setSummary] = useState<AIUsageSummary | null>(null);
  const [logs, setLogs] = useState<AIUsageLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai-usage?limit=50');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
        setLogs(data.recentLogs || []);
      } else {
        throw new Error(data.error || 'Failed to load AI usage');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to AI usage endpoint.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsage();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">AI Provider Telemetry & Usage</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Two-Tier Routing Audit: Google Gemini Flash & OpenAI GPT-5 nano</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsage}
              disabled={loading}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {summary && (
            <>
              {/* Top Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold uppercase text-purple-600 dark:text-purple-400">OpenAI (GPT-5)</span>
                    <Sparkles className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {summary.providerBreakdown.openai}
                  </div>
                  <div className="text-[11px] text-purple-700 dark:text-purple-300 mt-1 font-mono">
                    ${summary.estimatedCostUSD.openai} est.
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400">Gemini Flash</span>
                    <Cpu className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {summary.providerBreakdown.gemini}
                  </div>
                  <div className="text-[11px] text-blue-700 dark:text-blue-300 mt-1 font-mono">
                    ${summary.estimatedCostUSD.gemini} est.
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400">Total Tokens</span>
                    <Layers className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {summary.tokenTotals.totalTokens.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1 font-mono">
                    {summary.tokenTotals.reasoningTokens > 0
                      ? `${summary.tokenTotals.reasoningTokens} reasoning`
                      : '0 reasoning'}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">Avg Latency</span>
                    <Clock className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {summary.averageLatencyMs}ms
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {summary.fallbackCount} fallback(s)
                  </div>
                </div>
              </div>

              {/* Cost & Policy Rates */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
                <span><b>OpenAI gpt-5-nano Rate:</b> $0.05 / 1M prompt &bull; $0.20 / 1M completion</span>
                <span><b>Total Cost Accrued:</b> <b className="text-slate-900 dark:text-white">${summary.estimatedCostUSD.total}</b></span>
              </div>
            </>
          )}

          {/* Recent Requests Table */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Recent AI Invocations</h3>
            {logs.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No recent AI requests logged in this session yet.
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3">Time</th>
                        <th className="py-2.5 px-3">Task Type</th>
                        <th className="py-2.5 px-3">Provider</th>
                        <th className="py-2.5 px-3">Model</th>
                        <th className="py-2.5 px-3">Tokens</th>
                        <th className="py-2.5 px-3">Latency</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-2 px-3 text-slate-500 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">
                            {log.taskType}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              log.provider === 'openai'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                : log.provider === 'gemini'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {log.provider}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {log.model}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">
                            {log.totalTokens > 0 ? log.totalTokens.toLocaleString() : '—'}
                          </td>
                          <td className="py-2 px-3 text-slate-500">
                            {log.latencyMs}ms
                          </td>
                          <td className="py-2 px-3">
                            {log.success ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>OK</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400" title={log.error}>
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Error</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
