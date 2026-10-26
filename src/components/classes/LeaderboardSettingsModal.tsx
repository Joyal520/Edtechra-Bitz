import React, { useState } from 'react';
import {
  Trophy,
  X,
  Clock,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Check,
  Loader2,
  ShieldCheck,
  Info
} from 'lucide-react';
import { LeaderboardResetFrequency, LeaderboardSettings } from '@/types/classroom';
import { calculateNextResetDate, formatLeaderboardResetText, DEFAULT_LEADERBOARD_TIMEZONE } from '@/utils/leaderboardResetUtils';
import { classroomPointsService } from '@/services/classroomPointsService';

interface LeaderboardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId: string;
  currentFrequency?: LeaderboardResetFrequency;
  nextResetAt?: string | null;
  lastResetAt?: string | null;
  timeZone?: string;
  onSettingsUpdated?: (newSettings: LeaderboardSettings) => void;
  onLeaderboardReset?: () => void;
  onShowToast?: (message: string) => void;
}

const FREQUENCY_OPTIONS: Array<{
  value: LeaderboardResetFrequency;
  title: string;
  description: string;
  badge: string;
}> = [
  {
    value: 'never',
    title: 'Never',
    description: 'Leaderboard points accumulate continuously without automatic reset.',
    badge: 'Continuous'
  },
  {
    value: 'daily',
    title: 'Daily',
    description: 'Resets every night at 12:00 AM. Best for daily sprints and daily practice goals.',
    badge: 'Every Day 12:00 AM'
  },
  {
    value: 'weekly',
    title: 'Weekly',
    description: 'Resets every Monday at 12:00 AM. Perfect for weekly classroom challenges.',
    badge: 'Every Monday 12:00 AM'
  },
  {
    value: 'monthly',
    title: 'Monthly',
    description: 'Resets on the 1st of each month at 12:00 AM. Ideal for monthly grading periods.',
    badge: '1st of Month 12:00 AM'
  }
];

export const LeaderboardSettingsModal: React.FC<LeaderboardSettingsModalProps> = ({
  isOpen,
  onClose,
  classroomId,
  currentFrequency = 'never',
  nextResetAt,
  lastResetAt,
  timeZone = DEFAULT_LEADERBOARD_TIMEZONE,
  onSettingsUpdated,
  onLeaderboardReset,
  onShowToast
}) => {
  const [selectedFrequency, setSelectedFrequency] = useState<LeaderboardResetFrequency>(currentFrequency);
  const [isSavingFrequency, setIsSavingFrequency] = useState(false);
  const [showConfirmResetModal, setShowConfirmResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedFrequency(currentFrequency);
      setErrorMessage(null);
    }
  }, [isOpen, currentFrequency]);

  if (!isOpen) return null;

  // Calculate live preview of next reset for the currently selected option
  const previewNextResetDate = calculateNextResetDate(selectedFrequency, new Date(), timeZone);
  const previewFormatted = formatLeaderboardResetText(
    selectedFrequency,
    previewNextResetDate ? previewNextResetDate.toISOString() : null,
    timeZone
  );

  // Format current active schedule
  const activeFormatted = formatLeaderboardResetText(currentFrequency, nextResetAt, timeZone);

  const handleSaveFrequency = async () => {
    setIsSavingFrequency(true);
    setErrorMessage(null);
    try {
      const res = await classroomPointsService.updateLeaderboardSettings(
        classroomId,
        selectedFrequency,
        timeZone
      );

      if (!res.success) {
        throw new Error(res.error || 'Failed to update reset frequency');
      }

      if (res.settings && onSettingsUpdated) {
        onSettingsUpdated(res.settings);
      }

      const successMsg = selectedFrequency === 'never'
        ? 'Leaderboard reset schedule turned off (Never).'
        : `Leaderboard reset frequency updated to ${selectedFrequency.charAt(0).toUpperCase() + selectedFrequency.slice(1)}.`;

      onShowToast?.(successMsg);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save settings.');
    } finally {
      setIsSavingFrequency(false);
    }
  };

  const handleConfirmManualReset = async () => {
    setIsResetting(true);
    setErrorMessage(null);
    try {
      const res = await classroomPointsService.resetLeaderboard(classroomId);

      if (!res.success) {
        throw new Error(res.error || 'Failed to reset leaderboard');
      }

      setShowConfirmResetModal(false);
      onLeaderboardReset?.();
      onShowToast?.('Leaderboard reset successfully. Everyone starts from 0 XP.');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset leaderboard.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      {/* ======================================================================= */}
      {/* MAIN LEADERBOARD SETTINGS MODAL                                         */}
      {/* ======================================================================= */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in">
        <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-stone-200 shadow-2xl space-y-6 max-h-[90vh] flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-stone-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 shadow-2xs">
                <Trophy className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>Leaderboard Settings</span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                    Teacher Only
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Configure scoring cycles or reset student rankings to 0 XP.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-stone-100 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Modal Content Scroll Area */}
          <div className="overflow-y-auto space-y-6 flex-1 pr-1">

            {/* Current Schedule Summary Badge */}
            <div className="p-3.5 bg-stone-50 border border-stone-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Active Schedule: <strong className="text-slate-900 font-bold capitalize">{currentFrequency}</strong>
                </span>
                {lastResetAt && (
                  <span className="text-slate-400 text-[11px] hidden md:inline">
                    (Current period started: {new Date(lastResetAt).toLocaleDateString()})
                  </span>
                )}
              </div>
              {currentFrequency !== 'never' && activeFormatted.nextResetLabel && (
                <span className="text-[11px] font-bold text-[#026fc3] bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200/70 self-start sm:self-auto">
                  Next: {activeFormatted.nextResetLabel}
                </span>
              )}
            </div>

            {/* 1. RESET FREQUENCY SECTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#026fc3]" />
                  <span>Automatic Reset Frequency</span>
                </label>
                <span className="text-[11px] font-semibold text-slate-400">4 options</span>
              </div>

              <div className="space-y-2">
                {FREQUENCY_OPTIONS.map((opt) => {
                  const isSelected = selectedFrequency === opt.value;

                  return (
                    <div
                      key={opt.value}
                      onClick={() => setSelectedFrequency(opt.value)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-blue-50/70 border-[#026fc3] ring-2 ring-[#026fc3]/15 shadow-2xs'
                          : 'bg-white hover:bg-stone-50/80 border-stone-200'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'border-[#026fc3] bg-[#026fc3]'
                              : 'border-stone-300 bg-white'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900">{opt.title}</span>
                            <span className="text-[10px] font-bold px-2 py-0.2 bg-stone-100 text-slate-600 rounded-md border border-stone-200">
                              {opt.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                            {opt.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Next reset preview indicator */}
              {selectedFrequency !== 'never' && previewFormatted.nextResetLabel && (
                <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl text-xs text-slate-600 flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#026fc3] shrink-0" />
                  <span>
                    When enabled, the next reset will occur on{' '}
                    <strong className="text-[#026fc3] font-bold">{previewFormatted.nextResetLabel}</strong>.
                  </span>
                </div>
              )}

              {/* Save frequency button */}
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveFrequency}
                  disabled={isSavingFrequency || selectedFrequency === currentFrequency}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#026fc3] hover:bg-[#025ca5] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  {isSavingFrequency ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Frequency...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Apply Frequency</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* SEPARATOR */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase font-bold text-slate-400">
                <span className="bg-white px-3">or manual action</span>
              </div>
            </div>

            {/* 2. MANUAL RESET SECTION */}
            <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-rose-950">Reset Leaderboard Now</h4>
                  <p className="text-xs text-rose-700/90 font-medium leading-relaxed mt-0.5">
                    Instantly sets every student's current leaderboard score to <strong>0 XP</strong>.
                    Student accounts, certificates, completed activities, and grades are 100% preserved.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowConfirmResetModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Leaderboard Now</span>
                </button>
              </div>
            </div>

            {/* Data Safety Note */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                Zero data loss guarantee: quiz submissions, exam attempts, and student progress are never deleted.
              </span>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-stone-100 flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-stone-100 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>

        </div>
      </div>

      {/* ======================================================================= */}
      {/* CONFIRMATION MODAL FOR MANUAL RESET                                     */}
      {/* ======================================================================= */}
      {showConfirmResetModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-stone-200 shadow-2xl space-y-5 animate-in zoom-in-95">
            
            {/* Warning Icon & Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Reset leaderboard?</h3>
                <p className="text-xs text-slate-400 font-semibold">Immediate classroom scoring action</p>
              </div>
            </div>

            {/* Explanatory Body */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-slate-700 space-y-2.5 leading-relaxed font-medium">
              <p>
                This will set the current leaderboard score of every student in this classroom to <strong className="text-slate-950 font-black">0 XP</strong>.
              </p>
              <p className="text-slate-500">
                Student learning records, grades, course progress and other educational data will not be deleted.
              </p>
            </div>

            {/* Destructive Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmResetModal(false)}
                disabled={isResetting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-stone-100 border border-stone-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmManualReset}
                disabled={isResetting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Leaderboard</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
