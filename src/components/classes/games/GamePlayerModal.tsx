import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  Loader2,
  Lock,
  Map,
  Music,
  Play,
  RefreshCw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { ACTIVITY_TYPE_LABELS, gameLibraryService, getGameCatalogItem } from '@/services/gameLibraryService';
import { gameMusicService, type GameMusicSnapshot } from '@/services/gameMusicService';
import type {
  CompletedLevelRecord,
  GameAssignmentSettings,
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
  assignmentSettings?: GameAssignmentSettings;
  assignmentInstructions?: string;
  assignmentDueDate?: string | null;
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
  assignmentSettings,
  assignmentInstructions,
  assignmentDueDate,
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

  const [hasStarted, setHasStarted] = useState(isPreview);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<GameSubmissionResponse | null>(null);
  const [completedDetails, setCompletedDetails] = useState<Record<string, unknown> | null>(null);
  const [previewResult, setPreviewResult] = useState<{ score: number; max: number; time: number } | null>(null);
  const [musicSnap, setMusicSnap] = useState<GameMusicSnapshot>(() => gameMusicService.getSnapshot());

  const catalogItem = getGameCatalogItem(gameId);
  const supportsScoring = assignmentSettings?.supports_scoring !== false && catalogItem.supportsScoring !== false;
  const showScoresToStudents = supportsScoring && assignmentSettings?.show_scores_to_students !== false;
  const maxAttempts = assignmentSettings?.max_attempts ?? 1;
  const usedAttempts = Number(alreadyCompletedRecord?.attempts || (alreadyCompletedScore !== null ? 1 : 0));
  const attemptsExhausted =
    alreadyCompletedScore !== null && maxAttempts !== 0 && usedAttempts >= Math.max(1, maxAttempts);

  useEffect(() => {
    return gameMusicService.subscribe(setMusicSnap);
  }, []);

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

      if ((result as any)?.details && typeof (result as any).details === 'object') {
        setCompletedDetails((result as any).details);
      }

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
    setHasStarted(isPreview);
    setSubmitting(false);
    setSubmissionResult(null);
    setCompletedDetails(null);
    setPreviewResult(null);
  }, [isOpen, isPreview, assignmentId, gameId, levelId]);

  useEffect(() => {
    if (!isOpen) return;

    const targetOrigin = window.location.origin;

    const handleMessage = async (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      if (event.origin !== targetOrigin) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'EDTECHRA_GAME_READY') {
        if (data.gameId && String(data.gameId) !== gameId) return;
        const initPayload = {
          mode: isPreview ? 'preview' : 'student',
          title,
          levelNumber,
          levelTitle,
          maxPoints,
          assignmentId,
          classroomId,
          levelId,
          config
        };
        iframeRef.current.contentWindow?.postMessage(
          {
            type: 'EDTECHRA_INIT_GAME',
            payload: initPayload,
            ...initPayload
          },
          targetOrigin
        );
        return;
      }

      if (data.type === 'EDTECHRA_JIGSAW_FETCH_STATE') {
        const reqId = data.requestId;
        if (isPreview || !assignmentId) {
          iframeRef.current.contentWindow?.postMessage(
            {
              type: 'EDTECHRA_JIGSAW_RESPONSE',
              requestId: reqId,
              data: {
                success: true,
                alreadyCompleted: false,
                questionsEnabled: Boolean((config as any)?.questionsEnabled),
                questionCount: Array.isArray((config as any)?.questions) ? (config as any).questions.length : 0,
                inProgress: { puzzleCompleted: false, answers: {}, currentQuestionIndex: 0 },
                unlockedQuestions: []
              }
            },
            targetOrigin
          );
          return;
        }
        const result = await gameLibraryService.getJigsawState(assignmentId, levelId);
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'EDTECHRA_JIGSAW_RESPONSE', requestId: reqId, data: result },
          targetOrigin
        );
        return;
      }

      if (data.type === 'EDTECHRA_JIGSAW_UNLOCK_QUESTIONS') {
        const reqId = data.requestId;
        if (isPreview || !assignmentId) {
          const qs = Array.isArray((config as any)?.questions) ? (config as any).questions : [];
          iframeRef.current.contentWindow?.postMessage(
            {
              type: 'EDTECHRA_JIGSAW_RESPONSE',
              requestId: reqId,
              data: {
                success: true,
                puzzleCompleted: true,
                questionsEnabled: Boolean((config as any)?.questionsEnabled) && qs.length > 0,
                questionCount: qs.length,
                questions: qs,
                answers: {},
                currentQuestionIndex: 0
              }
            },
            targetOrigin
          );
          return;
        }
        const result = await gameLibraryService.unlockJigsawQuestions(assignmentId, levelId);
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'EDTECHRA_JIGSAW_RESPONSE', requestId: reqId, data: result },
          targetOrigin
        );
        return;
      }

      if (data.type === 'EDTECHRA_JIGSAW_SUBMIT_ANSWER') {
        const reqId = data.requestId;
        if (isPreview || !assignmentId) {
          iframeRef.current.contentWindow?.postMessage(
            {
              type: 'EDTECHRA_JIGSAW_RESPONSE',
              requestId: reqId,
              data: { success: true, previewMode: true }
            },
            targetOrigin
          );
          return;
        }
        const result = await gameLibraryService.submitJigsawAnswer({
          assignmentId,
          levelId,
          questionId: String(data.questionId || ''),
          submittedAnswer: data.submittedAnswer
        });
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'EDTECHRA_JIGSAW_RESPONSE', requestId: reqId, data: result },
          targetOrigin
        );
        return;
      }

      if (data.type === 'EDTECHRA_SFX_DUCK') {
        gameMusicService.duck(Number(data.durationMs) || 950);
        return;
      }

      if (data.type === 'EDTECHRA_GAME_EXIT') {
        onClose();
        return;
      }

      if (data.type === 'EDTECHRA_GAME_COMPLETE') {
        const raw = data.payload && typeof data.payload === 'object' ? data.payload : data;
        if (raw.gameId && String(raw.gameId) !== gameId) return;
        const payload: GameCompletionPayload = {
          gameId,
          levelId,
          scoreEarned: supportsScoring ? Math.max(0, Number(raw.scoreEarned ?? 0)) : 0,
          maxPoints: supportsScoring ? Math.max(0, Number(raw.maxAvailablePoints ?? raw.maxPoints ?? maxPoints)) : 0,
          completed: raw.completionStatus
            ? raw.completionStatus === 'completed'
            : Boolean(raw.completed ?? true),
          timeTakenSeconds: Math.max(0, Number(raw.timeTakenSeconds ?? 0)),
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
  }, [isOpen, isPreview, title, maxPoints, config, gameId, assignmentId, levelId, supportsScoring, submitScorePayload, onClose]);

  const shouldPlayMusic =
    isOpen &&
    hasStarted &&
    gameId !== 'box-breathing' &&
    !( !isPreview && isUnavailable ) &&
    !( !isPreview && attemptsExhausted && !submissionResult?.success );

  useEffect(() => {
    if (shouldPlayMusic) {
      gameMusicService.start();
    } else {
      gameMusicService.stop(350);
    }
    return () => {
      if (!isOpen) {
        gameMusicService.stop(350);
      }
    };
  }, [shouldPlayMusic, isOpen]);

  useEffect(() => {
    return () => {
      gameMusicService.stop(250);
    };
  }, []);

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
    (attemptsExhausted || Boolean(submissionResult?.success));

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
    activeDetails?.totalQuestions ??
      activeDetails?.total ??
      activeDetails?.totalWords ??
      activeDetails?.totalPuzzles ??
      activeDetails?.pairs ??
      questionCount ??
      0
  );
  const resolvedQuestionsCompleted = Number(
    activeDetails?.questionsAnswered ??
      activeDetails?.questionsCompleted ??
      resolvedTotalQuestions
  );
  const resolvedCorrectAnswers = Number(
    activeDetails?.correctAnswers ??
      activeDetails?.solved ??
      activeDetails?.wordsSolved ??
      activeDetails?.puzzlesCompleted ??
      activeDetails?.pairs ??
      resolvedQuestionsCompleted
  );
  const isJigsawWithQuestions =
    gameId === 'classroom-jigsaw' && Boolean(activeDetails?.questionsEnabled);
  const jigsawIncorrectAnswers = Number(
    activeDetails?.incorrectAnswers ?? Math.max(0, resolvedQuestionsCompleted - resolvedCorrectAnswers)
  );
  const jigsawAccuracyPct = Number(
    activeDetails?.accuracyPct ??
      (resolvedTotalQuestions > 0
        ? Math.round((resolvedCorrectAnswers / resolvedTotalQuestions) * 100)
        : 100)
  );
  const jigsawPuzzlePoints = Number(activeDetails?.puzzlePoints ?? 0);
  const jigsawQuestionPoints = Number(activeDetails?.questionPoints ?? 0);

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
                ? 'Testing activity — results are not recorded in preview mode'
                : !supportsScoring
                  ? 'Mindfulness & wellness session — completion recorded'
                  : showScoresToStudents
                    ? `Available Points: ${maxPoints} pts`
                    : 'Activity completion & metrics tracked'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {musicSnap.status === 'blocked' && musicSnap.enabled && (
            <button
              type="button"
              onClick={() => gameMusicService.unlockFromUserGesture()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-[11px] font-bold animate-pulse cursor-pointer"
              title="Browser blocked autoplay — tap to start 8D background music"
            >
              <Music className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline sm:inline">Enable 8D Music</span>
              <span className="sm:hidden">Play Music</span>
            </button>
          )}

          {/* Shared 8D Background Music Control */}
          <div
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10 border border-white/15"
            title="8D Background Music Control (independent of game SFX)"
          >
            <button
              type="button"
              onClick={() => gameMusicService.toggleEnabled()}
              aria-label={musicSnap.enabled ? 'Turn off background music' : 'Turn on background music'}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-white hover:text-amber-300 transition cursor-pointer"
            >
              {musicSnap.enabled ? (
                <Volume2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <span className="hidden md:inline">
                {musicSnap.enabled ? '8D Music On' : 'Music Off'}
              </span>
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(musicSnap.volume * 100)}
              onChange={(e) => gameMusicService.setVolume(Number(e.target.value) / 100)}
              aria-label="8D Background music volume"
              disabled={!musicSnap.enabled}
              className="hidden sm:block w-14 md:w-16 h-1.5 accent-emerald-400 cursor-pointer disabled:opacity-40"
            />
          </div>

          {isLockedCompleted && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {showScoresToStudents ? `Completed (${finalScoreEarned} / ${maxPoints} pts)` : 'Completed'}
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
            {supportsScoring
              ? `Preview Complete! Activity reported ${previewResult.score} / ${previewResult.max} in ${previewResult.time}s.`
              : `Preview Complete! Mindfulness session finished in ${previewResult.time}s.`}
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

      {/* Main Content: Unavailable Notice OR Level Completion Screen OR Student Pre-Start Briefing OR Live Activity Iframe */}
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
                This activity is currently unavailable
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your teacher has unpublished this assignment. New attempts cannot be started, and your existing progress remains safely preserved.
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
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-sm ${
                !supportsScoring
                  ? 'bg-teal-100 text-teal-600'
                  : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {!supportsScoring ? <CheckCircle2 className="w-8 h-8" /> : <Trophy className="w-8 h-8" />}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-600">
                {!supportsScoring ? 'SESSION COMPLETED' : 'CONGRATULATIONS!'}
              </p>
              <h3 className="text-2xl font-black text-slate-900">
                {!supportsScoring
                  ? `Well done finishing ${catalogItem.name}!`
                  : `You've completed ${displayLevelHeading}!`}
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                {displayLevelTitle} • {catalogItem.name}
              </p>
            </div>

            {!supportsScoring ? (
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-teal-50/70 border border-teal-200 text-left">
                <div className="p-2.5 rounded-xl bg-white border border-teal-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Session Status
                  </p>
                  <p className="text-base font-black text-teal-700 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Completed
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-teal-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Duration
                  </p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">
                    {Number(activeDetails?.durationSeconds ?? submissionResult?.timeTakenSeconds ?? 0)}s
                  </p>
                </div>
                {typeof activeDetails?.cyclesCompleted === 'number' && (
                  <div className="p-2.5 rounded-xl bg-white border border-teal-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Breathing Cycles
                    </p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">
                      {String(activeDetails.cyclesCompleted)}
                    </p>
                  </div>
                )}
                {typeof activeDetails?.paceSeconds === 'number' && (
                  <div className="p-2.5 rounded-xl bg-white border border-teal-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Square Pace
                    </p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">
                      {String(activeDetails.paceSeconds)}s per side
                    </p>
                  </div>
                )}
              </div>
            ) : isJigsawWithQuestions ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left">
                <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Puzzle Status
                  </p>
                  <p className="text-sm sm:text-base font-black text-emerald-700 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Completed
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Questions Answered
                  </p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">
                    {resolvedQuestionsCompleted}
                    {resolvedTotalQuestions > 0 ? ` / ${resolvedTotalQuestions}` : ''}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Accuracy
                  </p>
                  <p className="text-lg font-black text-indigo-700 mt-0.5">{jigsawAccuracyPct}%</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Correct / Incorrect
                  </p>
                  <p className="text-base font-black mt-0.5">
                    <span className="text-emerald-700">{resolvedCorrectAnswers} ✓</span>
                    <span className="text-slate-300 mx-1.5">/</span>
                    <span className="text-rose-600">{jigsawIncorrectAnswers} ✗</span>
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Puzzle / Quiz Pts
                  </p>
                  <p className="text-base font-black text-slate-900 mt-0.5">
                    {jigsawPuzzlePoints} + {jigsawQuestionPoints}
                  </p>
                </div>
                {showScoresToStudents && (
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Total Points
                    </p>
                    <p className="text-lg font-black text-emerald-600 flex items-center gap-1 mt-0.5">
                      <Award className="w-4 h-4 shrink-0" />
                      +{submissionResult?.success && !submissionResult.alreadySubmitted ? finalPointsAwarded : finalScoreEarned}
                      <span className="text-xs font-bold text-slate-400"> / {maxPoints}</span>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left">
                {typeof activeDetails?.accuracyPct === 'number' && (
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Accuracy
                    </p>
                    <p className="text-lg font-black text-indigo-700 mt-0.5">
                      {String(activeDetails.accuracyPct)}%
                    </p>
                  </div>
                )}
                {typeof activeDetails?.highestNumberRemembered === 'number' && (
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Longest Sequence
                    </p>
                    <p className="text-lg font-black text-indigo-700 mt-0.5">
                      {String(activeDetails.highestNumberRemembered)} digits
                    </p>
                  </div>
                )}
                {typeof activeDetails?.longestPattern === 'number' && (
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Longest Pattern
                    </p>
                    <p className="text-lg font-black text-indigo-700 mt-0.5">
                      {String(activeDetails.longestPattern)} steps
                    </p>
                  </div>
                )}
                {typeof activeDetails?.levelReached === 'number' && typeof activeDetails?.longestPattern !== 'number' && (
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Level Reached
                    </p>
                    <p className="text-lg font-black text-indigo-700 mt-0.5">
                      Level {String(activeDetails.levelReached)}
                    </p>
                  </div>
                )}
                {typeof activeDetails?.levelsCompleted === 'number' && (
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Levels Completed
                    </p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">
                      {String(activeDetails.levelsCompleted)}
                    </p>
                  </div>
                )}
                {resolvedTotalQuestions > 0 && (
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Correct Answers
                    </p>
                    <p className="text-lg font-black text-emerald-700 mt-0.5">
                      {resolvedCorrectAnswers} / {resolvedTotalQuestions}
                    </p>
                  </div>
                )}
                {typeof activeDetails?.rawScore === 'number' && (
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Game Score
                    </p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">
                      {String(activeDetails.rawScore)}
                    </p>
                  </div>
                )}
                {showScoresToStudents && (
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Points Awarded
                    </p>
                    <p className="text-lg font-black text-emerald-600 flex items-center gap-1 mt-0.5">
                      <Award className="w-4 h-4 shrink-0" />
                      +{submissionResult?.success && !submissionResult.alreadySubmitted ? finalPointsAwarded : finalScoreEarned}
                      <span className="text-xs font-bold text-slate-400"> / {maxPoints}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-800 flex items-center justify-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-sky-600" />
              <span>
                {!supportsScoring
                  ? 'Your mindfulness session completion and duration have been saved.'
                  : alreadyCompletedScore !== null || submissionResult?.alreadySubmitted
                    ? 'Activity completed — your results have been saved.'
                    : 'Activity completed and recorded in your classroom progress.'}
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
                Return to Games &amp; Training
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
      ) : !hasStarted && !isPreview ? (
        <div className="flex-1 w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 overflow-y-auto">
          <div className="max-w-lg w-full rounded-3xl bg-white overflow-hidden shadow-2xl border border-slate-200">
            <div className="w-full aspect-video bg-slate-100 relative overflow-hidden">
              <img
                src={catalogItem.thumbnailUrl}
                alt={catalogItem.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-900/80 text-white">
                  {catalogItem.category}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/90 text-slate-800">
                  {ACTIVITY_TYPE_LABELS[assignmentSettings?.activity_type || catalogItem.activityType]}
                </span>
              </div>
              <span
                className={`absolute top-3 right-3 text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                  assignmentSettings?.is_compulsory === false
                    ? 'bg-teal-50 text-teal-800 border-teal-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {assignmentSettings?.is_compulsory === false ? 'Optional' : 'Compulsory'}
              </span>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">{title}</h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  {catalogItem.name}
                  {catalogItem.estimatedDuration ? ` • ${catalogItem.estimatedDuration}` : ''}
                  {supportsScoring && showScoresToStudents ? ` • Up to ${maxPoints} pts` : ''}
                </p>
              </div>

              {(assignmentSettings?.teacher_instructions || assignmentInstructions) && (
                <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-100 text-xs text-sky-950 leading-relaxed">
                  <div className="font-extrabold text-sky-800 mb-1">Teacher Instructions</div>
                  {assignmentSettings?.teacher_instructions || assignmentInstructions}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-semibold">
                {assignmentDueDate && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    Due {new Date(assignmentDueDate).toLocaleString()}
                  </span>
                )}
                <span>
                  Attempts: {maxAttempts === 0 ? 'Unlimited' : `${usedAttempts}/${maxAttempts} used`}
                </span>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onBackToLevelMap || onClose}
                  className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHasStarted(true);
                    if (gameId !== 'box-breathing') {
                      void gameMusicService.unlockFromUserGesture();
                    }
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-extrabold shadow-md transition cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Activity</span>
                </button>
              </div>
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
            sandbox="allow-scripts allow-same-origin allow-pointer-lock"
            onLoad={() => {
              try {
                const win = iframeRef.current?.contentWindow;
                if (!win) return;
                const unlockFromIframe = () => {
                  if (gameId !== 'box-breathing') {
                    void gameMusicService.unlockFromUserGesture();
                  }
                };
                (['pointerdown', 'pointerup', 'click', 'touchstart', 'keydown'] as const).forEach((evt) => {
                  win.addEventListener(evt, unlockFromIframe, {
                    capture: true,
                    passive: true,
                    once: true
                  });
                });
              } catch {
                // ignore cross-origin restrictions if any
              }
            }}
            className="w-full h-full border-0 block"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
};
