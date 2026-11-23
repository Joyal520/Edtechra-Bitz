import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Puzzle,
  RotateCw,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Hand
} from 'lucide-react';
import { courseAudio } from '@/utils/courseAudio';
import { triggerConfettiBurst } from '@/utils/courseConfetti';

interface InteractiveJigsawPuzzleProps {
  imageUrl: string;
  gridSize?: number; // default 3 (3x3 = 9 pieces)
  points?: number;
  isCompleted?: boolean;
  onComplete: () => void;
}

interface PuzzlePieceState {
  id: number; // 0 .. total-1 (correct slot index)
  currentSlot: number | null; // null = in tray, 0..total-1 = on board
  rotation: number; // 0, 90, 180, 270
  locked: boolean;
}

function createInitialPieces(total: number): PuzzlePieceState[] {
  const indices = Array.from({ length: total }, (_, i) => i);
  // Deterministic-feeling shuffle that guarantees pieces start in tray
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.map((id, idx) => ({
    id,
    currentSlot: null,
    // Rotate a few pieces by 90 degrees so rotation is meaningful yet not tedious
    rotation: idx % 3 === 1 ? 90 : 0,
    locked: false
  }));
}

export const InteractiveJigsawPuzzle: React.FC<InteractiveJigsawPuzzleProps> = ({
  imageUrl,
  gridSize = 3,
  points = 20,
  isCompleted = false,
  onComplete
}) => {
  const totalPieces = gridSize * gridSize;
  const [pieces, setPieces] = useState<PuzzlePieceState[]>(() => createInitialPieces(totalPieces));
  const [selectedPieceId, setSelectedPieceId] = useState<number | null>(null);
  const [draggedPieceId, setDraggedPieceId] = useState<number | null>(null);
  const [justSolved, setJustSolved] = useState(false);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const completedFiredRef = useRef(isCompleted);

  useEffect(() => {
    if (isCompleted) {
      completedFiredRef.current = true;
    }
  }, [isCompleted]);

  const lockedCount = useMemo(
    () => (isCompleted ? totalPieces : pieces.filter(p => p.locked).length),
    [isCompleted, pieces, totalPieces]
  );

  const progressPct = Math.round((lockedCount / totalPieces) * 100);

  // Check for completion
  useEffect(() => {
    if (isCompleted || completedFiredRef.current) return;
    if (pieces.length === totalPieces && pieces.every(p => p.locked)) {
      completedFiredRef.current = true;
      setJustSolved(true);
      courseAudio.playCompleteSound();
      if (boardRef.current) {
        triggerConfettiBurst(boardRef.current);
      }
      onComplete();
    }
  }, [pieces, totalPieces, isCompleted, onComplete]);

  const placePieceInSlot = (pieceId: number, slotIndex: number) => {
    if (isCompleted) return;
    setPieces(prev => {
      const targetPiece = prev.find(p => p.id === pieceId);
      if (!targetPiece || targetPiece.locked) return prev;

      const occupant = prev.find(p => p.currentSlot === slotIndex);
      if (occupant?.locked) return prev;

      const isRightSlot = pieceId === slotIndex;
      const isRightRotation = targetPiece.rotation % 360 === 0;
      const nowLocked = isRightSlot && isRightRotation;

      if (nowLocked) {
        courseAudio.playCorrectSound();
        setHintMessage(null);
      } else if (isRightSlot && !isRightRotation) {
        setHintMessage('Right spot! Tap the Rotate button on this piece to align it.');
      } else {
        setHintMessage(null);
      }

      return prev.map(p => {
        if (p.id === pieceId) {
          return {
            ...p,
            currentSlot: slotIndex,
            locked: nowLocked
          };
        }
        // If another unlocked piece was in that slot, return it to tray
        if (occupant && p.id === occupant.id) {
          return {
            ...p,
            currentSlot: null,
            locked: false
          };
        }
        return p;
      });
    });
    setSelectedPieceId(null);
    setDraggedPieceId(null);
  };

  const rotatePiece = (pieceId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isCompleted) return;
    setPieces(prev =>
      prev.map(p => {
        if (p.id !== pieceId || p.locked) return p;
        const nextRot = (p.rotation + 90) % 360;
        const nowLocked = p.currentSlot === p.id && nextRot === 0;
        if (nowLocked) {
          courseAudio.playCorrectSound();
          setHintMessage(null);
        }
        return {
          ...p,
          rotation: nextRot,
          locked: nowLocked
        };
      })
    );
  };

  const returnPieceToTray = (pieceId: number) => {
    if (isCompleted) return;
    setPieces(prev =>
      prev.map(p => (p.id === pieceId && !p.locked ? { ...p, currentSlot: null } : p))
    );
    setSelectedPieceId(null);
  };

  const handleReset = () => {
    if (isCompleted) return;
    setPieces(createInitialPieces(totalPieces));
    setSelectedPieceId(null);
    setHintMessage(null);
  };

  const getPieceStyle = (pieceId: number, rotation: number): React.CSSProperties => {
    const row = Math.floor(pieceId / gridSize);
    const col = pieceId % gridSize;
    const step = gridSize > 1 ? 100 / (gridSize - 1) : 0;
    return {
      backgroundImage: `url("${imageUrl}")`,
      backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
      backgroundPosition: `${col * step}% ${row * step}%`,
      transform: `rotate(${rotation}deg)`,
      transition: 'transform 0.2s ease'
    };
  };

  const trayPieces = pieces.filter(p => p.currentSlot === null);

  return (
    <div
      ref={boardRef}
      data-testid="day3-jigsaw-puzzle"
      className="rounded-3xl bg-gradient-to-br from-[#fffdf7] via-white to-[#f0f9ff] border-2 border-sky-200 p-4 sm:p-6 shadow-md space-y-5"
    >
      {/* Header & Progress */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
            <Puzzle className="w-5 h-5" />
          </span>
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-sky-700 block">
              Step 1 • Visual Jigsaw Puzzle
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              Assemble the Scene ({points} XP)
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-black border ${
              isCompleted || justSolved
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            {isCompleted || justSolved
              ? `✓ Completed (+${points} XP)`
              : `${lockedCount} / ${totalPieces} Pieces Solved`}
          </span>

          {!isCompleted && !justSolved && (
            <button
              type="button"
              onClick={handleReset}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Shuffle pieces"
              aria-label="Shuffle puzzle pieces"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
        <div
          className="h-full bg-gradient-to-r from-sky-500 via-amber-400 to-emerald-500 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Completed Full Scene View */}
      {isCompleted || justSolved ? (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="relative max-w-lg mx-auto rounded-2xl overflow-hidden border-4 border-emerald-400 shadow-xl bg-white">
            <img
              src={imageUrl}
              alt="Completed Day 3 Scene"
              className="w-full h-auto object-contain"
            />
            <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-black shadow-lg flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Puzzle Solved! +{points} XP</span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center text-sm font-bold text-emerald-900 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Awesome! You unlocked the 3 Multiple Choice Questions below.</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Puzzle Board (Left/Top) */}
          <div className="lg:col-span-7 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5">
                <Hand className="w-3.5 h-3.5 text-sky-600" />
                <span>Drag a piece or tap a piece then tap a square</span>
              </span>
              {selectedPieceId !== null && (
                <button
                  type="button"
                  onClick={() => rotatePiece(selectedPieceId)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-black cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate Selected</span>
                </button>
              )}
            </div>

            {hintMessage && (
              <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-xs font-bold text-amber-900">
                💡 {hintMessage}
              </div>
            )}

            <div
              className="grid gap-1.5 p-2 rounded-2xl bg-sky-100/70 border-2 border-sky-300/80 shadow-inner aspect-square max-w-[420px] mx-auto w-full"
              style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: totalPieces }, (_, slotIdx) => {
                const pieceInSlot = pieces.find(p => p.currentSlot === slotIdx);
                const isSelected = pieceInSlot && selectedPieceId === pieceInSlot.id;

                return (
                  <div
                    key={slotIdx}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      const pid = draggedPieceId ?? Number(e.dataTransfer.getData('text/plain'));
                      if (Number.isFinite(pid)) {
                        placePieceInSlot(pid, slotIdx);
                      }
                    }}
                    onClick={() => {
                      if (selectedPieceId !== null) {
                        placePieceInSlot(selectedPieceId, slotIdx);
                      } else if (pieceInSlot && !pieceInSlot.locked) {
                        setSelectedPieceId(pieceInSlot.id);
                      }
                    }}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all flex items-center justify-center aspect-square ${
                      pieceInSlot?.locked
                        ? 'border-emerald-400 ring-2 ring-emerald-400/40'
                        : isSelected
                        ? 'border-amber-500 ring-2 ring-amber-400'
                        : pieceInSlot
                        ? 'border-sky-400 cursor-pointer'
                        : 'border-dashed border-sky-300 bg-white/70 hover:bg-sky-50 cursor-pointer'
                    }`}
                  >
                    {pieceInSlot ? (
                      <>
                        <div
                          draggable={!pieceInSlot.locked}
                          onDragStart={e => {
                            setDraggedPieceId(pieceInSlot.id);
                            e.dataTransfer.setData('text/plain', String(pieceInSlot.id));
                          }}
                          className="w-full h-full bg-no-repeat"
                          style={getPieceStyle(pieceInSlot.id, pieceInSlot.rotation)}
                        />
                        {!pieceInSlot.locked && (
                          <div className="absolute top-1 right-1 flex gap-1">
                            <button
                              type="button"
                              onClick={e => rotatePiece(pieceInSlot.id, e)}
                              className="w-6 h-6 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-xs flex items-center justify-center cursor-pointer"
                              title="Rotate 90°"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {!pieceInSlot.locked && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              returnPieceToTray(pieceInSlot.id);
                            }}
                            className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-slate-900/70 text-white text-[10px] font-bold cursor-pointer"
                            title="Return to tray"
                          >
                            ↩
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-xs font-black text-sky-400 select-none">
                        {slotIdx + 1}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pieces Tray (Right/Bottom) */}
          <div className="lg:col-span-5 space-y-2.5">
            <div className="text-xs font-black uppercase tracking-wider text-slate-600">
              Puzzle Pieces ({trayPieces.length} remaining)
            </div>
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-amber-50/70 border border-amber-200 min-h-[160px]">
              {trayPieces.length === 0 ? (
                <div className="col-span-3 flex items-center justify-center text-xs font-bold text-slate-500 py-8 text-center">
                  All pieces are on the board! Rotate or adjust any misplaced pieces to finish.
                </div>
              ) : (
                trayPieces.map(piece => {
                  const isSelected = selectedPieceId === piece.id;
                  return (
                    <div
                      key={piece.id}
                      draggable
                      onDragStart={e => {
                        setDraggedPieceId(piece.id);
                        setSelectedPieceId(piece.id);
                        e.dataTransfer.setData('text/plain', String(piece.id));
                      }}
                      onClick={() => setSelectedPieceId(isSelected ? null : piece.id)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all shadow-xs ${
                        isSelected
                          ? 'border-amber-500 ring-4 ring-amber-300/60 scale-105'
                          : 'border-white hover:border-sky-400'
                      }`}
                    >
                      <div
                        className="w-full h-full bg-no-repeat"
                        style={getPieceStyle(piece.id, piece.rotation)}
                      />
                      <button
                        type="button"
                        onClick={e => rotatePiece(piece.id, e)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-xs flex items-center justify-center cursor-pointer"
                        title="Rotate 90°"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
