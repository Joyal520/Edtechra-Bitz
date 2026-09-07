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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs [color-scheme:light]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Brand & Question Indicator */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">EdTechra</span>
              <span className="text-slate-300 text-xs">•</span>
              <span className="text-xs font-black text-slate-900 truncate max-w-[120px] sm:max-w-xs">{title}</span>
            </div>
            <div className="text-xs font-black text-indigo-700">
              Question {currentIndex + 1} <span className="text-slate-400 font-medium">/ {totalCount}</span>
            </div>
          </div>
        </div>

        {/* Center: Progress Bar (Desktop) */}
        <div className="hidden md:flex flex-col items-center justify-center flex-1 max-w-xs px-4">
          <div className="w-full bg-slate-100 rounded-full h-2 border border-slate-200 overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-slate-500 mt-1">
            {progressPercent}% Complete
          </span>
        </div>

        {/* Right: Autosave Status & Authoritative Timer */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Sync Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700">
            {syncState === 'saving' && (
              <>
                <RefreshCw className="w-3 h-3 text-indigo-600 animate-spin" />
                <span className="text-indigo-700">Saving...</span>
              </>
            )}
            {syncState === 'saved' && (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-700">Saved</span>
              </>
            )}
            {syncState === 'offline' && (
              <>
                <CloudOff className="w-3 h-3 text-amber-600" />
                <span className="text-amber-800">Offline</span>
              </>
            )}
          </div>

          {/* Countdown Timer Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black border transition-all shadow-2xs ${
              isCritical
                ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse ring-2 ring-rose-200'
                : isWarning
                ? 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-200'
                : 'bg-slate-50 text-slate-900 border-slate-200'
            }`}
          >
            <Clock className={`w-4 h-4 ${isCritical ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-slate-500'}`} />
            <span className="font-mono tracking-wider">{formatTime(timeRemainingSeconds)}</span>
          </div>

          {/* Navigator Toggle Button */}
          {onToggleNavigator && (
            <button
              type="button"
              onClick={onToggleNavigator}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                navigatorOpen
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Toggle Question Navigator"
            >
              <Bookmark className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Progress Bar (Micro bar at bottom edge) */}
      <div className="md:hidden w-full bg-slate-100 h-1 overflow-hidden">
        <div
          className="h-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </header>
  );
};
