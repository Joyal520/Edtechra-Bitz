import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  Calendar,
  Loader2,
  Check
} from 'lucide-react';
import { leaderboardService } from '@/services/leaderboardService';
import { useAuth } from '@/context/AuthContext';
import { CollapsibleCatalogue } from '@/components/CollapsibleCatalogue';

export const AdminLeaderboardSection: React.FC = () => {
  const { session } = useAuth();

  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'never'>('weekly');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Manual Reset State
  const [resetTargetPeriod, setResetTargetPeriod] = useState<'today' | 'week' | 'month' | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const token = session?.access_token || null;
      const data = await leaderboardService.getLeaderboardSettings(token);
      if (data?.reset_frequency) {
        setFrequency(data.reset_frequency);
      }
    } catch (err: any) {
      console.warn('Failed to load leaderboard settings:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveFrequency = async (newFreq: 'weekly' | 'monthly' | 'never') => {
    setSaving(true);
    try {
      const token = session?.access_token || null;
      const res = await leaderboardService.updateLeaderboardSettings(newFreq, token);
      setFrequency(newFreq);
      showToast(res.message || `Reset frequency saved as ${newFreq}.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to update reset frequency.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteManualReset = async () => {
    if (!resetTargetPeriod || isResetting) return;
    setIsResetting(true);
    try {
      const token = session?.access_token || null;
      const res = await leaderboardService.resetLeaderboard(resetTargetPeriod, token);
      showToast(res.message || `Leaderboard for ${resetTargetPeriod} reset successfully.`);
      setResetTargetPeriod(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to reset leaderboard.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <CollapsibleCatalogue
      title="Leaderboard Reset Frequency & Competition Settings"
      icon={<Trophy className="w-5 h-5 text-amber-500" />}
      subtitle="Configure automated leaderboard reset schedules (Weekly, Monthly, Never) and manage competition cycles."
    >
      <div className="space-y-6">
        
        {/* Toast Alert */}
        {toast && (
          <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-in fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* 1. Reset Frequency Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>Leaderboard Reset Frequency</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Controls the active competitive period used to calculate rankings on the student dashboard.
              </p>
            </div>

            {loading && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Loading...</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Weekly Option */}
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveFrequency('weekly')}
              className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                frequency === 'weekly'
                  ? 'bg-purple-50 border-purple-500 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">Weekly</span>
                {frequency === 'weekly' && <Check className="w-4 h-4 text-purple-600 font-black" />}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Resets every Monday. Best for active weekly school challenges.
              </p>
              <span className="inline-block mt-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-md">
                Default
              </span>
            </button>

            {/* Monthly Option */}
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveFrequency('monthly')}
              className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                frequency === 'monthly'
                  ? 'bg-purple-50 border-purple-500 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">Monthly</span>
                {frequency === 'monthly' && <Check className="w-4 h-4 text-purple-600 font-black" />}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Resets on the 1st of every month (1st to last day).
              </p>
              <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-md">
                Monthly Cycles
              </span>
            </button>

            {/* Never (All-Time) Option */}
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveFrequency('never')}
              className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                frequency === 'never'
                  ? 'bg-purple-50 border-purple-500 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">Never (All Time)</span>
                {frequency === 'never' && <Check className="w-4 h-4 text-purple-600 font-black" />}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Never resets automatically. Continuous cumulative all-time ranking.
              </p>
              <span className="inline-block mt-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                Cumulative
              </span>
            </button>

          </div>
        </div>

        {/* 2. Lifetime XP Safety Guarantee Banner */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-black text-emerald-900">Lifetime XP Persistence Guarantee</h4>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Changing or resetting the leaderboard period only refreshes the competitive period score. Every learner&apos;s <strong>Lifetime XP</strong>, learning streak, vocabulary milestones, and level progress remain completely permanent and are never deleted.
            </p>
          </div>
        </div>

        {/* 3. Manual Reset Triggers */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-black text-slate-900">Manual Competition Reset</h4>
              <p className="text-[11px] text-slate-500">
                Immediately trigger a fresh start for the current week or month.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setResetTargetPeriod('week')}
              className="px-4 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Weekly Competition Now</span>
            </button>

            <button
              type="button"
              onClick={() => setResetTargetPeriod('month')}
              className="px-4 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Monthly Competition Now</span>
            </button>
          </div>
        </div>

        {/* Confirmation Modal for Manual Reset */}
        {resetTargetPeriod && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  Reset {resetTargetPeriod === 'week' ? 'Weekly' : 'Monthly'} Competition?
                </h3>
                <p className="text-xs text-slate-600">
                  This will start a brand-new ranking period. All student lifetime XP and records will remain completely intact.
                </p>
              </div>
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => setResetTargetPeriod(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={handleExecuteManualReset}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Resetting...</span>
                    </>
                  ) : (
                    <span>Confirm Reset</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </CollapsibleCatalogue>
  );
};
