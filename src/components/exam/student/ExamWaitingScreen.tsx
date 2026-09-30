// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: SCHEDULED EXAM WAITING SCREEN
// Dedicated pre-exam countdown & waiting environment with server synchronization
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  FileQuestion,
  Award,
  Loader2,
  Radio
} from 'lucide-react';

interface ExamWaitingScreenProps {
  title: string;
  subject?: string;
  grade?: string;
  examType?: string;
  durationMinutes?: number;
  totalMarks?: number;
  questionCount?: number;
  startsAt: string;
  serverTime?: string;
  onCountdownComplete: () => void;
  onReturnToClassroom?: () => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

export const ExamWaitingScreen: React.FC<ExamWaitingScreenProps> = ({
  title,
  subject,
  grade,
  examType = 'Examination',
  durationMinutes = 45,
  totalMarks,
  questionCount,
  startsAt,
  serverTime,
  onCountdownComplete,
  onReturnToClassroom
}) => {
  // Compute initial clock skew between local browser time and server timestamp
  const serverOffsetMsRef = useRef<number>(0);
  const hasTriggeredCompleteRef = useRef<boolean>(false);
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    if (serverTime) {
      const serverMs = new Date(serverTime).getTime();
      const localMs = Date.now();
      if (!isNaN(serverMs)) {
        serverOffsetMsRef.current = serverMs - localMs;
      }
    }
  }, [serverTime]);

  const targetTimestamp = new Date(startsAt).getTime();

  // Helper to calculate exact breakdown from target and current server-adjusted time
  const calculateRemaining = (): TimeRemaining => {
    const currentAdjustedTime = Date.now() + serverOffsetMsRef.current;
    const diffMs = targetTimestamp - currentAdjustedTime;
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));

    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { days, hours, minutes, seconds, totalSeconds };
  };

  const [remaining, setRemaining] = useState<TimeRemaining>(calculateRemaining);

  useEffect(() => {
    hasTriggeredCompleteRef.current = false;

    const interval = setInterval(() => {
      const rem = calculateRemaining();
      setRemaining(rem);

      if (rem.totalSeconds <= 0 && !hasTriggeredCompleteRef.current) {
        hasTriggeredCompleteRef.current = true;
        clearInterval(interval);
        setIsActivating(true);
        // Small delay to allow visual transition, then trigger callback
        setTimeout(() => {
          onCountdownComplete();
        }, 1200);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startsAt]);

  // Formatted date and time strings in student's locale
  const startDate = new Date(startsAt);
  const formattedDate = !isNaN(startDate.getTime())
    ? startDate.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Scheduled Date';

  const formattedTime = !isNaN(startDate.getTime())
    ? startDate.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    : 'Scheduled Time';

  const timeZoneName = !isNaN(startDate.getTime())
    ? Intl.DateTimeFormat().resolvedOptions().timeZone.replace('_', ' ')
    : '';

  return (
    <div className="min-h-screen bg-[#070e1f] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 animate-fadeIn select-none font-sans relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 sm:w-[500px] sm:h-[500px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shadow-inner">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-slate-300">
            EdTechra Digital Classroom
          </span>
        </div>

        {onReturnToClassroom && (
          <button
            type="button"
            onClick={onReturnToClassroom}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Classroom</span>
          </button>
        )}
      </div>

      {/* Main Waiting Card */}
      <main className="max-w-2xl w-full mx-auto my-auto z-10 py-6">
        <div className="bg-[#0b142c]/90 backdrop-blur-md border border-blue-900/80 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 text-center">
          
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[11px] font-black uppercase tracking-wider shadow-inner">
            <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
            <span>Exam Starting Soon</span>
          </div>

          {/* Title & Metadata */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              {title}
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {subject && (
                <span className="px-3 py-1 rounded-xl bg-indigo-950/80 border border-indigo-800/80 text-indigo-300 text-xs font-bold">
                  {subject}
                </span>
              )}
              {grade && (
                <span className="px-3 py-1 rounded-xl bg-blue-950/80 border border-blue-800/80 text-blue-300 text-xs font-bold">
                  {grade}
                </span>
              )}
              <span className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-bold">
                {examType}
              </span>
            </div>
          </div>

          {/* Quick Specifications Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-[#070e1f]/70 border border-blue-950 text-slate-300 text-xs font-semibold">
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{durationMinutes} Minutes</span>
            </div>
            {totalMarks != null && totalMarks > 0 && (
              <div className="flex items-center justify-center gap-2">
                <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{totalMarks} Points</span>
              </div>
            )}
            {questionCount != null && questionCount > 0 && (
              <div className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2">
                <FileQuestion className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{questionCount} Questions</span>
              </div>
            )}
          </div>

          {/* Scheduled Timing Display */}
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-900/60 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center justify-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Scheduled Start</span>
            </div>
            <div className="text-base sm:text-lg font-black text-white">
              {formattedDate} • {formattedTime}
            </div>
            {timeZoneName && (
              <div className="text-[10px] text-slate-400 font-medium">
                {timeZoneName} Timezone
              </div>
            )}
          </div>

          {/* Countdown Clock */}
          <div className="space-y-3 pt-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Starts In
            </div>

            {isActivating ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                <div className="text-base font-black text-emerald-300">
                  Opening Examination...
                </div>
                <div className="text-xs text-slate-400">
                  Retrieving your questions and preparing the timer
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                {/* Days (if > 0) */}
                {remaining.days > 0 && (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-18 sm:w-20 sm:h-22 rounded-2xl bg-[#070e1f] border border-indigo-700/60 flex items-center justify-center shadow-lg">
                      <span className="text-2xl sm:text-4xl font-black text-white tabular-nums">
                        {String(remaining.days).padStart(2, '0')}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1.5">
                      Days
                    </span>
                  </div>
                )}

                {/* Hours */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-18 sm:w-20 sm:h-22 rounded-2xl bg-[#070e1f] border border-indigo-700/60 flex items-center justify-center shadow-lg">
                    <span className="text-2xl sm:text-4xl font-black text-white tabular-nums">
                      {String(remaining.hours).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1.5">
                    Hours
                  </span>
                </div>

                <div className="text-xl sm:text-3xl font-black text-indigo-400 -mt-6">:</div>

                {/* Minutes */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-18 sm:w-20 sm:h-22 rounded-2xl bg-[#070e1f] border border-indigo-700/60 flex items-center justify-center shadow-lg">
                    <span className="text-2xl sm:text-4xl font-black text-white tabular-nums">
                      {String(remaining.minutes).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1.5">
                    Minutes
                  </span>
                </div>

                <div className="text-xl sm:text-3xl font-black text-indigo-400 -mt-6">:</div>

                {/* Seconds */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-18 sm:w-20 sm:h-22 rounded-2xl bg-[#070e1f] border border-indigo-500/80 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                    <span className="text-2xl sm:text-4xl font-black text-indigo-300 tabular-nums">
                      {String(remaining.seconds).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1.5">
                    Seconds
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Student Waiting Instruction Banner */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
            <p className="text-xs sm:text-sm font-bold text-slate-200">
              Please wait. The examination will start automatically when the countdown reaches zero.
            </p>
            <p className="text-[11px] text-slate-400">
              You can keep this page open. Your questions and timer will appear as soon as the exam begins.
            </p>
          </div>

        </div>
      </main>

      {/* Bottom Footer Info */}
      <footer className="max-w-2xl w-full mx-auto text-center text-[11px] text-slate-500 space-y-1 z-10 pt-4">
        <div className="flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Live synchronized session • Powered by EdTechra Assessment Engine</span>
        </div>
      </footer>
    </div>
  );
};
