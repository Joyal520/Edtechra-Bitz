import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  CheckCircle2,
  Loader2,
  Lock,
  Map,
  RefreshCw,
  Sparkles,
  Trophy,
  X
} from 'lucide-react';
import { gameLibraryService, getGameCatalogItem } from '@/services/gameLibraryService';
import type {
  CompletedLevelRecord,
  GameCompletionPayload,
  GameConfig,
  GameId,
  GameLevelDefinition,
  GameSubmissionResponse
} from '@/types/gameLibrary';

interface GamePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: GameId;
  title: string;
  config: GameConfig;
  classroomId: string;
  assignmentId?: string;
  levelId?: string;
  levelNumber?: number;
  levelTitle?: string;
  questionCount?: number;
  maxPoints?: number;
  isPreview?: boolean;
  isUnavailable?: boolean;
  alreadyCompletedScore?: number | null;
  alreadyCompletedRecord?: CompletedLevelRecord | null;
  nextLevel?: GameLevelDefinition | null;
  nextLevelStatus?: 'completed' | 'available' | 'locked' | null;
  nextLevelLockReason?: string;
  onBackToLevelMap?: () => void;
  onContinueToNextLevel?: (nextLevel: GameLevelDefinition) => void;
  onSubmitted?: (result: GameSubmissionResponse) => void;
}

export const GamePlayerModal: React.FC<GamePlayerModalProps> = ({
  isOpen,
  onClose,
  gameId,
  title,
  config,
  classroomId,
  assignmentId,
  levelId,
  levelNumber,
  levelTitle,
  questionCount = 0,
  maxPoints = 100,
  isPreview = false,
  isUnavailable = false,
  alreadyCompletedScore = null,
  alreadyCompletedRecord = null,
  nextLevel = null,
  nextLevelStatus = null,
  nextLevelLockReason,
  onBackToLevelMap,
  onContinueToNextLevel,
  onSubmitted
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const submittingRef = useRef(false);
  const hasSubmittedThisSessionRef = useRef(false);
  const lastPayloadRef = useRef<GameCompletionPayload | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<GameSubmissionResponse | null>(null);
  const [completedDetails, setCompletedDetails] = useState<Record<string, unknown> | null>(null);
  const [previewResult, setPreviewResult] = useState<{ score: number; max: number; time: number } | null>(null);

  const catalogItem = getGameCatalogItem(gameId);

  const submitScorePayload = useCallback(
    async (payload: GameCompletionPayload) => {
      if (!assignmentId || submittingRef.current || hasSubmittedThisSessionRef.current) return;
      lastPayloadRef.current = payload;
      setCompletedDetails(payload.details || null);
      submittingRef.current = true;
      setSubmitting(true);

      const result = await gameLibraryService.submitGameCompletion({
        assignmentId,
        classroomId,
        payload
      });

      submittingRef.current = false;
      setSubmitting(false);
      setSubmissionResult(result);

      if (result.success) {
        hasSubmittedThisSessionRef.current = true;
        onSubmitted?.(result);
      }
    },
    [assignmentId, classroomId, onSubmitted]
  );

  useEffect(() => {
    // Reset attempt state whenever modal closes or switches to a different assignment/level
    submittingRef.current = false;
    hasSubmittedThisSessionRef.current = false;
    lastPayloadRef.current = null;
    setSubmitting(false);
    setSubmissionResult(null);
    setCompletedDetails(null);
    setPreviewResult(null);
  }, [isOpen, assignmentId, gameId, levelId]);

  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = async (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'EDTECHRA_GAME_READY') {
        const initPayload = {
          mode: isPreview ? 'preview' : 'student',
          title,
          levelNumber,
          levelTitle,
          maxPoints,
          config
        };
        iframeRef.current.contentWindow?.postMessage(
          {
            type: 'EDTECHRA_INIT_GAME',
            payload: initPayload,
            ...initPayload
          },
          '*'
        );
        return;
      }

      if (data.type === 'EDTECHRA_GAME_COMPLETE') {
        const raw = data.payload && typeof data.payload === 'object' ? data.payload : data;
        const payload: GameCompletionPayload = {
          gameId: (raw.gameId as GameId) || gameId,
          levelId,
          scoreEarned: Number(raw.scoreEarned ?? 0),
          maxPoints: Number(raw.maxAvailablePoints ?? raw.maxPoints ?? maxPoints),
          completed: raw.completionStatus
            ? raw.completionStatus === 'completed'
            : Boolean(raw.completed ?? true),
          timeTakenSeconds: Number(raw.timeTakenSeconds ?? 0),
          details: raw.details && typeof raw.details === 'object' ? raw.details : undefined
        };

        if (isPreview || !assignmentId) {
          setPreviewResult({
            score: payload.scoreEarned,
            max: payload.maxPoints,
            time: payload.timeTakenSeconds
          });
          return;
        }

        await submitScorePayload(payload);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, isPreview, title, maxPoints, config, gameId, assignmentId, levelId, submitScorePayload]);

  if (!isOpen) return null;

  const isUnpublishedError = Boolean(
    submissionResult &&
      !submissionResult.success &&
      /unpublished/i.test(submissionResult.error || '')
  );
  const effectiveUnavailable = !isPreview && (isUnavailable || isUnpublishedError);

  const isLockedCompleted =
    !isPreview &&
    !effectiveUnavailable &&
    (alreadyCompletedScore !== null || Boolean(submissionResult?.success));

  const finalPointsAwarded =
    submissionResult?.success
      ? submissionResult.alreadySubmitted
        ? 0
        : submissionResult.pointsAwarded
      : 0;
  const finalScoreEarned =
    submissionResult?.success
      ? submissionResult.alreadySubmitted
        ? submissionResult.existingScore ?? alreadyCompletedScore ?? 0
        : submissionResult.pointsAwarded
      : alreadyCompletedScore ?? 0;

  const activeDetails =
    completedDetails ||
    (alreadyCompletedRecord?.details as Record<string, unknown> | undefined) ||
    null;

  const resolvedTotalQuestions = Number(
    activeDetails?.total ??
      activeDetails?.totalWords ??
      activeDetails?.totalPuzzles ??
      activeDetails?.pairs ??
      questionCount ??
      0
  );
  const resolvedQuestionsCompleted = Number(
    activeDetails?.questionsCompleted ?? resolvedTotalQuestions
  );
  const resolvedCorrectAnswers = Number(
    activeDetails?.correctAnswers ??
      activeDetails?.solved ??
      activeDetails?.wordsSolved ??
      activeDetails?.puzzlesCompleted ??
      activeDetails?.pairs ??
      resolvedQuestionsCompleted
  );

  const displayLevelHeading = levelNumber
    ? `Level ${levelNumber}`
    : levelTitle || 'this level';
  const displayLevelTitle = levelTitle || title;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950/90 backdrop-blur-sm">
      {/* Compact Header Bar */}
      <header className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/95 border-b border-white/10 text-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg bg-gradient-to-br ${catalogItem.accentColor} flex items-center justify-center shrink-0 shadow-sm`}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold truncate">{title}</h2>
              {isPreview ? (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 shrink-0">
                  Teacher Preview
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 shrink-0">
                  {catalogItem.name}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {isPreview
                ? 'Testing teacher configuration — scores are not recorded in preview mode'
                : `Available Points: ${maxPoints} pts`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isLockedCompleted && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed ({finalScoreEarned} / {maxPoints} pts)
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition"
            aria-label="Close game"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </header>

      {/* Score Submission / Retry Banner */}
      {submitting && (
        <div className="px-4 py-2 bg-sky-600 text-white text-xs font-semibold flex items-center justify-center gap-2 shrink-0">
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving your score and updating the classroom leaderboard...
        </div>
      )}

      {submissionResult && !submissionResult.success && (
        <div className="px-4 py-2.5 bg-rose-600/95 text-white text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{submissionResult.error || 'Could not save score. Your attempt is not locked yet.'}</span>
          </div>
          {lastPayloadRef.current && (
            <button
              type="button"
              onClick={() => lastPayloadRef.current && submitScorePayload(lastPayloadRef.current)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 text-xs font-bold shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Submission
            </button>
          )}
        </div>
      )}

      {previewResult && (
        <div className="px-4 py-2 bg-amber-500/95 text-slate-950 text-xs sm:text-sm font-bold flex items-center justify-between gap-3 shrink-0">
          <span>
            Preview Complete! Game reported {previewResult.score} / {previewResult.max} in{' '}
            {previewResult.time}s.
          </span>
          <button
            type="button"
            onClick={() => setPreviewResult(null)}
            className="px-2.5 py-0.5 rounded bg-slate-900/15 hover:bg-slate-900/25 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content: Unavailable Notice OR Level Completion Screen OR Live Game Iframe */}
      {effectiveUnavailable ? (
        <div className="flex-1 w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-y-auto">
          <div className="max-w-md w-full rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-extrabold uppercase tracking-wider">
                Unavailable
              </span>
              <h3 className="text-xl font-black text-slate-900 pt-1">
                This game is currently unavailable
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your teacher has unpublished this game assignment. New attempts cannot be started, and your existing progress and leaderboard scores remain safely preserved.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-sm transition cursor-pointer"
            >
              Back to Classroom
            </button>
          </div>
        </div>
      ) : isLockedCompleted ? (
        <div className="flex-1 w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 overflow-y-auto">
          <div className="max-w-lg w-full rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-600">
                CONGRATULATIONS!
              </p>
              <h3 className="text-2xl font-black text-slate-900">
                You&apos;ve completed {displayLevelHeading}!
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                {displayLevelTitle} • {catalogItem.name}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left">
              <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Questions Completed
                </p>
                <p className="text-lg font-black text-slate-900 mt-0.5">
                  {resolvedQuestionsCompleted}
                  {resolvedTotalQuestions > 0 ? ` / ${resolvedTotalQuestions}` : ''}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Correct Answers
                </p>
                <p className="text-lg font-black text-emerald-700 mt-0.5">
                  {resolvedCorrectAnswers}
                  {resolvedTotalQuestions > 0 ? ` / ${resolvedTotalQuestions}` : ''}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Score Earned
                </p>
                <p className="text-lg font-black text-slate-900 mt-0.5">
                  {finalScoreEarned}
                  <span className="text-xs font-bold text-slate-400"> / {maxPoints}</span>
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Points Awarded
                </p>
                <p className="text-lg font-black text-emerald-600 flex items-center gap-1 mt-0.5">
                  <Award className="w-4 h-4 shrink-0" />
                  +{submissionResult?.success && !submissionResult.alreadySubmitted ? finalPointsAwarded : finalScoreEarned}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-800 flex items-center justify-center gap-2 font-semibold">
              <Lock className="w-4 h-4 shrink-0 text-sky-600" />
              <span>
                {alreadyCompletedScore !== null || submissionResult?.alreadySubmitted
                  ? 'Level already completed — points were awarded once on the classroom leaderboard.'
                  : 'Level completed and saved to your classroom leaderboard. One scoring attempt per level.'}
              </span>
            </div>

            {nextLevel && nextLevelStatus === 'locked' && nextLevelLockReason && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-center gap-2 font-semibold text-left">
                <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Next level ({nextLevel.title}) is locked: {nextLevelLockReason}
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                type="button"
                onClick={onBackToLevelMap || onClose}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl border border-slate-200 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-sm transition cursor-pointer"
              >
                <Map className="w-4 h-4" />
                Back to Level Map
              </button>
              {nextLevel && nextLevelStatus === 'available' && onContinueToNextLevel && (
                <button
                  type="button"
                  onClick={() => onContinueToNextLevel(nextLevel)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm transition cursor-pointer"
                >
                  <span>Continue to Level {nextLevel.levelNumber}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 w-full h-full relative bg-slate-950 overflow-hidden">
          <iframe
            key={`${gameId}-${assignmentId || 'preview'}-${levelId || 'single'}`}
            ref={iframeRef}
            src={catalogItem.htmlPath}
            title={`${catalogItem.name} - ${title}`}
            className="w-full h-full border-0 block"
            allow="autoplay"
          />
        </div>
      )}
    </div>
  );
};
