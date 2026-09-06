// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: EXAM HEADER
// Fullscreen examination HUD with server-authoritative countdown & sync indicator
// ============================================================================

import React from 'react';
import { Clock, Check, CloudOff, RefreshCw, Bookmark, Sparkles } from 'lucide-react';

export type SyncState = 'saved' | 'saving' | 'offline';

interface ExamHeaderProps {
  title: string;
  currentIndex: number;
  totalCount: number;
  timeRemainingSeconds: number;
  syncState: SyncState;
  onToggleNavigator?: () => void;
  navigatorOpen?: boolean;
}

export function formatTime(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const ExamHeader: React.FC<ExamHeaderProps> = ({
  title,
  currentIndex,
  totalCount,
  timeRemainingSeconds,
  syncState,
  onToggleNavigator,
  navigatorOpen
}) => {
  const progressPercent = totalCount > 0 ? Math.round(((currentIndex + 1) / totalCount) * 100) : 0;

  // Timer state classes (Normal, Warning <= 5 mins, Critical <= 1 min)
  const isCritical = timeRemainingSeconds <= 60;
  const isWarning = !isCritical && timeRemainingSeconds <= 300;

  return (
    <header className="sticky top-0 z-40 bg-[#091124]/95 backdrop-blur-md border-b border-blue-800/80 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Brand & Question Indicator */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">EdTechra</span>
              <span className="text-slate-500 text-xs">•</span>
              <span className="text-xs font-black text-white truncate max-w-[120px] sm:max-w-xs">{title}</span>
            </div>
            <div className="text-xs font-black text-indigo-300">
              Question {currentIndex + 1} <span className="text-slate-500 font-medium">/ {totalCount}</span>
            </div>
          </div>
        </div>

        {/* Center: Progress Bar (Desktop) */}
        <div className="hidden md:flex flex-col items-center justify-center flex-1 max-w-xs px-4">
          <div className="w-full bg-[#040916] rounded-full h-2 border border-blue-900/60 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-slate-400 mt-1">
            {progressPercent}% Complete
          </span>
        </div>

        {/* Right: Autosave Status & Authoritative Timer */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Sync Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0b142c] border border-blue-900/70 text-[11px] font-bold">
            {syncState === 'saving' && (
              <>
                <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
                <span className="text-indigo-300">Saving...</span>
              </>
            )}
            {syncState === 'saved' && (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300">Saved</span>
              </>
            )}
            {syncState === 'offline' && (
              <>
                <CloudOff className="w-3 h-3 text-amber-400" />
                <span className="text-amber-300">Offline</span>
              </>
            )}
          </div>

          {/* Countdown Timer Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs sm:text-sm font-black border transition-all ${
              isCritical
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/80 animate-pulse ring-2 ring-rose-500/40'
                : isWarning
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/70 ring-1 ring-amber-500/30'
                : 'bg-[#0f1b3d] text-indigo-200 border-blue-700/60'
            }`}
          >
            <Clock className={`w-4 h-4 ${isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-indigo-400'}`} />
            <span className="font-mono tracking-wider">{formatTime(timeRemainingSeconds)}</span>
          </div>

          {/* Navigator Toggle Button */}
          {onToggleNavigator && (
            <button
              type="button"
              onClick={onToggleNavigator}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                navigatorOpen
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-xs'
                  : 'bg-[#0b142c] text-slate-300 border-blue-800/80 hover:text-white'
              }`}
              title="Toggle Question Navigator"
            >
              <Bookmark className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Progress Bar (Micro bar at bottom edge) */}
      <div className="md:hidden w-full bg-[#040916] h-1 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </header>
  );
};
