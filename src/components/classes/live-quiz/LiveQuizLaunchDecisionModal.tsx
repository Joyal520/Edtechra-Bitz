// ============================================================================
// EDTECHRA-BITZ: Live Quiz Launch Decision & Scheduling Modal
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  X,
  Play,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Timer
} from 'lucide-react';
import { LiveQuiz } from '@/types/liveQuiz';
import { getQuizCover, DEFAULT_QUIZ_COVER } from '@/utils/quizCover';

interface LiveQuizLaunchDecisionModalProps {
  isOpen: boolean;
  quiz: LiveQuiz | null;
  onClose: () => void;
  onLaunchNow: (quiz: LiveQuiz) => Promise<void> | void;
  onScheduleQuiz: (quiz: LiveQuiz, scheduledStartAt: string) => Promise<void> | void;
}

export const LiveQuizLaunchDecisionModal: React.FC<LiveQuizLaunchDecisionModalProps> = ({
  isOpen,
  quiz,
  onClose,
  onLaunchNow,
  onScheduleQuiz
}) => {
  const [selectedMode, setSelectedMode] = useState<'decision' | 'schedule'>('decision');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scheduling Form State
  // Default to today + 10 minutes rounded to next 5-minute increment
  const defaultDateTime = useMemo(() => {
    const d = new Date(Date.now() + 10 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(Math.ceil(d.getMinutes() / 5) * 5 % 60).padStart(2, '0');
    return { date: dateStr, time: `${hours}:${minutes}` };
  }, []);

  const [scheduleDate, setScheduleDate] = useState(defaultDateTime.date);
  const [scheduleTime, setScheduleTime] = useState(defaultDateTime.time);

  // Timezone representation
  const userTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'Local Time';
    }
  }, []);

  // Compute calculated target Date and countdown preview
  const { targetDate, isValidTime, countdownText } = useMemo(() => {
    if (!scheduleDate || !scheduleTime) {
      return { targetDate: null, isValidTime: false, countdownText: '' };
    }

    try {
      const [year, month, day] = scheduleDate.split('-').map(Number);
      const [hours, minutes] = scheduleTime.split(':').map(Number);
      const target = new Date(year, month - 1, day, hours, minutes, 0);
      const diffMs = target.getTime() - Date.now();

      if (diffMs <= 30000) {
        return {
          targetDate: target,
          isValidTime: false,
          countdownText: 'Scheduled time must be at least 1 minute in the future'
        };
      }

      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const remainingMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      let countdownStr = '';
      if (diffHours > 24) {
        const days = Math.floor(diffHours / 24);
        countdownStr = `Starts in ${days} day${days > 1 ? 's' : ''}, ${diffHours % 24} hours`;
      } else if (diffHours > 0) {
        countdownStr = `Starts in ${diffHours} hour${diffHours > 1 ? 's' : ''} ${remainingMinutes} min`;
      } else {
        countdownStr = `Starts in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
      }

      return {
        targetDate: target,
        isValidTime: true,
        countdownText: countdownStr
      };
    } catch {
      return { targetDate: null, isValidTime: false, countdownText: 'Invalid date/time' };
    }
  }, [scheduleDate, scheduleTime]);

  if (!isOpen || !quiz) return null;

  const handleLaunchNowClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onLaunchNow(quiz);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to launch quiz now');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidTime || !targetDate || isSubmitting) {
      setError('Please select a valid future date and time for the quiz.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onScheduleQuiz(quiz, targetDate.toISOString());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule live quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        data-theme-mode="light"
        data-light-surface="true"
        style={{ colorScheme: 'light' }}
        className="bg-white text-slate-900 light edtechra-light-surface rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-200 [color-scheme:light]"
      >
        
        {/* TOP HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Quiz Ready to Deploy</h2>
              <p className="text-xs font-semibold text-slate-600">
                Choose how and when to launch this Live Quiz
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QUIZ PREVIEW CARD */}
        <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-4">
          <div className="w-16 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0 shadow-xs">
            <img
              src={getQuizCover(quiz)}
              alt={quiz.title}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = DEFAULT_QUIZ_COVER;
              }}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-extrabold text-slate-900 text-sm truncate">{quiz.title}</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                {quiz.category || 'General'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                {quiz.difficulty || 'Medium'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
              <span>{quiz.questions?.length || 0} Questions</span>
              {quiz.timer_enabled && quiz.timer_seconds && (
                <span className="flex items-center gap-1 text-slate-700 font-semibold">
                  <Timer className="w-3.5 h-3.5 text-slate-500" />
                  {Math.round(quiz.timer_seconds / 60)} min total
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ERROR DISPLAY */}
        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* MAIN BODY: DECISION OR SCHEDULE FORM */}
        {selectedMode === 'decision' ? (
          <div className="mt-5 space-y-3">
            {/* OPTION A: LAUNCH NOW */}
            <button
              type="button"
              onClick={handleLaunchNowClick}
              disabled={isSubmitting}
              className="w-full text-left p-4 rounded-2xl border-2 border-indigo-500/30 bg-gradient-to-r from-indigo-50/50 to-blue-50/30 hover:border-indigo-600 hover:from-indigo-100/60 hover:to-blue-100/40 transition-all flex items-start gap-4 group focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <Play className="w-5 h-5 ml-0.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-indigo-700 transition-colors">
                    Launch Now (Live Session)
                  </h4>
                  <span className="text-[11px] font-black text-indigo-700 uppercase tracking-wider bg-indigo-100/80 px-2 py-0.5 rounded-full">
                    Immediate
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                  Generate Game PIN immediately and open the teacher lobby. Connected students will see the "LIVE NOW" banner and can join instantly.
                </p>
              </div>
            </button>

            {/* OPTION B: SCHEDULE QUIZ */}
            <button
              type="button"
              onClick={() => setSelectedMode('schedule')}
              disabled={isSubmitting}
              className="w-full text-left p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/20 transition-all flex items-start gap-4 group focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                    Schedule for Later
                  </h4>
                  <span className="text-[11px] font-black text-emerald-700 uppercase tracking-wider bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    Automated Start
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                  Pick a future date & time. Classroom displays a "STARTING SOON" countdown and students can join a patient waiting lobby until start.
                </p>
              </div>
            </button>

            {/* OPTION C: DECIDE LATER / KEEP AS DRAFT */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl border border-slate-300 text-slate-700 hover:text-slate-950 hover:bg-slate-100 text-xs font-extrabold transition-all text-center cursor-pointer"
              >
                Keep in Quiz Bank (Decide Later / Draft)
              </button>
              <p className="text-[11px] text-center text-slate-600 font-medium mt-1">
                Your quiz is securely saved. No live panel or banner will appear to students.
              </p>
            </div>
          </div>
        ) : (
          /* SCHEDULE CONFIGURATION FORM */
          <form onSubmit={handleConfirmSchedule} className="mt-5 space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <div className="flex items-center gap-2 text-emerald-900 text-xs font-extrabold mb-1">
                <Clock className="w-4 h-4 text-emerald-700" />
                <span>Select Start Time ({userTimezone})</span>
              </div>
              <p className="text-[11px] text-emerald-800 font-semibold mb-3">
                Students will enter a waiting lobby with a synchronized countdown timer.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    required
                    data-color-scheme="light"
                    style={{ colorScheme: 'light' }}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-bold text-slate-900 shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    required
                    data-color-scheme="light"
                    style={{ colorScheme: 'light' }}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-bold text-slate-900 shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* COUNTDOWN PREVIEW */}
              <div className="mt-3 pt-3 border-t border-emerald-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-700 font-bold">Countdown Preview:</span>
                <span
                  className={`font-black ${
                    isValidTime ? 'text-emerald-800' : 'text-rose-700'
                  }`}
                >
                  {countdownText}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedMode('decision')}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-800 hover:bg-slate-100 hover:text-slate-950 text-xs font-extrabold transition-all cursor-pointer"
              >
                Back
              </button>

              <button
                type="submit"
                disabled={!isValidTime || isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Scheduling Quiz...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Schedule Quiz</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
