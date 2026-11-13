import React, { useEffect, useRef, useState } from 'react';
import { Award, CheckCircle2, Loader2, Sparkles, X, AlertCircle } from 'lucide-react';
import { gameLibraryService, getGameCatalogItem } from '@/services/gameLibraryService';
import type {
  GameCompletionPayload,
  GameConfig,
  GameId,
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
  maxPoints?: number;
  isPreview?: boolean;
  alreadyCompletedScore?: number | null;
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
  maxPoints = 100,
  isPreview = false,
  alreadyCompletedScore = null,
  onSubmitted
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const submittingRef = useRef(false);
  const hasSubmittedThisSessionRef = useRef(false);

  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<GameSubmissionResponse | null>(null);
  const [previewResult, setPreviewResult] = useState<{ score: number; max: number; time: number } | null>(null);

  const catalogItem = getGameCatalogItem(gameId);

  useEffect(() => {
    if (!isOpen) {
      submittingRef.current = false;
      hasSubmittedThisSessionRef.current = false;
      setSubmitting(false);
      setSubmissionResult(null);
      setPreviewResult(null);
    }
  }, [isOpen, assignmentId, gameId]);

  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = async (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'EDTECHRA_GAME_READY') {
        iframeRef.current.contentWindow?.postMessage(
          {
            type: 'EDTECHRA_INIT_GAME',
            mode: isPreview ? 'preview' : 'student',
            title,
            maxPoints,
            config
          },
          '*'
        );
        return;
      }

      if (data.type === 'EDTECHRA_GAME_COMPLETE') {
        const payload: GameCompletionPayload = {
          gameId: (data.gameId as GameId) || gameId,
          scoreEarned: Number(data.scoreEarned ?? 0),
          maxPoints: Number(data.maxPoints ?? maxPoints),
          completed: Boolean(data.completed ?? true),
          timeTakenSeconds: Number(data.timeTakenSeconds ?? 0),
          details: data.details && typeof data.details === 'object' ? data.details : undefined
        };

        if (isPreview || !assignmentId) {
          setPreviewResult({
            score: payload.scoreEarned,
            max: payload.maxPoints,
            time: payload.timeTakenSeconds
          });
          return;
        }

        if (submittingRef.current || hasSubmittedThisSessionRef.current) {
          return;
        }

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
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, isPreview, title, maxPoints, config, gameId, assignmentId, classroomId, onSubmitted]);

  if (!isOpen) return null;

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
          {!isPreview && alreadyCompletedScore !== null && !submissionResult && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed ({alreadyCompletedScore} / {maxPoints} pts)
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

      {/* Score Submission / Status Banner */}
      {submitting && (
        <div className="px-4 py-2 bg-sky-600 text-white text-xs font-semibold flex items-center justify-center gap-2 shrink-0">
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving your score and updating the classroom leaderboard...
        </div>
      )}

      {submissionResult && (
        <div
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shrink-0 ${
            submissionResult.success
              ? submissionResult.alreadySubmitted
                ? 'bg-amber-600/95 text-white'
                : 'bg-emerald-600/95 text-white'
              : 'bg-rose-600/95 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {submissionResult.success ? (
              <Award className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>
              {submissionResult.success
                ? submissionResult.message ||
                  `Score saved! +${submissionResult.pointsAwarded} points awarded.`
                : submissionResult.error || 'Could not save score.'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 text-xs font-bold shrink-0"
          >
            Back to Classroom
          </button>
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

      {/* Sandboxed Game Iframe */}
      <div className="flex-1 w-full h-full relative bg-slate-950 overflow-hidden">
        <iframe
          ref={iframeRef}
          src={catalogItem.htmlPath}
          title={`${catalogItem.name} - ${title}`}
          className="w-full h-full border-0 block"
          allow="autoplay"
        />
      </div>
    </div>
  );
};
