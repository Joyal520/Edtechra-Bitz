import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Puzzle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Hand,
  Image as ImageIcon
} from 'lucide-react';
import { courseAudio } from '@/utils/courseAudio';
import { triggerConfettiBurst } from '@/utils/courseConfetti';

interface InteractiveJigsawPuzzleProps {
  imageUrl: string;
  gridSize?: number; // default 2 (2x2 = 4 pieces)
  points?: number;
  isCompleted?: boolean;
  onComplete: () => void;
}

interface PuzzlePieceState {
  id: number; // 0 .. total-1 (correct slot index)
  currentSlot: number | null; // null = in tray, 0..total-1 = on board
  locked: boolean;
}

function createInitialPieces(total: number): PuzzlePieceState[] {
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.map(id => ({
    id,
    currentSlot: null,
    locked: false
  }));
}

export const InteractiveJigsawPuzzle: React.FC<InteractiveJigsawPuzzleProps> = ({
  imageUrl,
  gridSize = 2,
  points = 20,
  isCompleted = false,
  onComplete
}) => {
  const totalPieces = gridSize * gridSize;
  const [pieces, setPieces] = useState<PuzzlePieceState[]>(() => createInitialPieces(totalPieces));
  const [selectedPieceId, setSelectedPieceId] = useState<number | null>(null);
  const [draggedPieceId, setDraggedPieceId] = useState<number | null>(null);
  const [justSolved, setJustSolved] = useState(false);
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

  // Fire completion once when all 4 pieces are locked in place
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
      if (isRightSlot) {
        courseAudio.playCorrectSound();
      }

      return prev.map(p => {
        if (p.id === pieceId) {
          return {
            ...p,
            currentSlot: slotIndex,
            locked: isRightSlot
          };
        }
        // Return any unlocked occupant back to the tray
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

  const handleReset = () => {
    if (isCompleted) return;
    setPieces(createInitialPieces(totalPieces));
    setSelectedPieceId(null);
  };

  const getPieceStyle = (pieceId: number): React.CSSProperties => {
    const row = Math.floor(pieceId / gridSize);
    const col = pieceId % gridSize;
    const step = gridSize > 1 ? 100 / (gridSize - 1) : 0;
    return {
      backgroundImage: `url("${imageUrl}")`,
      backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
      backgroundPosition: `${col * step}% ${row * step}%`
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
              Step 1 • 4-Piece Jigsaw Puzzle
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              Put the 4 pieces together to complete the picture.
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-black border ${
              isCompleted || justSolved
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-sky-50 border-sky-200 text-sky-900'
            }`}
          >
            {isCompleted || justSolved
              ? `Puzzle Completed! +${points} XP`
              : `${lockedCount} / ${totalPieces} Pieces (${points} XP)`}
          </span>

          {!isCompleted && !justSolved && (
            <button
              type="button"
              onClick={handleReset}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Reset puzzle"
              aria-label="Reset puzzle"
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
          <div className="relative max-w-md mx-auto rounded-2xl overflow-hidden border-4 border-emerald-400 shadow-xl bg-white">
            <img
              src={imageUrl}
              alt="Completed Day 3 Scene"
              className="w-full h-auto object-contain"
            />
            <div className="absolute top-3 right-3 px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-black shadow-lg flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Puzzle Completed! +{points} XP</span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center text-sm font-bold text-emerald-900 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Great job! Now answer the 3 Multiple Choice Questions below.</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* 2x2 Puzzle Board */}
          <div className="lg:col-span-7 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <Hand className="w-4 h-4 text-sky-600 shrink-0" />
              <span>Drag a piece onto a square, or tap a piece and tap a square.</span>
            </div>

            <div
              className="grid gap-2 p-2.5 rounded-2xl bg-sky-100/70 border-2 border-sky-300/80 shadow-inner aspect-square max-w-[380px] mx-auto w-full"
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
                        : 'border-dashed border-sky-300 bg-white/80 hover:bg-sky-50 cursor-pointer'
                    }`}
                  >
                    {pieceInSlot ? (
                      <div
                        draggable={!pieceInSlot.locked}
                        onDragStart={e => {
                          setDraggedPieceId(pieceInSlot.id);
                          e.dataTransfer.setData('text/plain', String(pieceInSlot.id));
                        }}
                        className="w-full h-full bg-no-repeat"
                        style={getPieceStyle(pieceInSlot.id)}
                      />
                    ) : (
                      <span className="text-base font-black text-sky-400 select-none">
                        {slotIdx + 1}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Pieces Tray + Small Reference Picture */}
          <div className="lg:col-span-5 space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-black uppercase tracking-wider text-slate-600">
                Puzzle Pieces ({trayPieces.length} left)
              </div>
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-amber-50/70 border border-amber-200 min-h-[160px]">
                {trayPieces.length === 0 ? (
                  <div className="col-span-2 flex items-center justify-center text-xs font-bold text-slate-500 py-8 text-center">
                    All 4 pieces are on the board! Move any piece to its matching spot.
                  </div>
                ) : (
                  trayPieces.map(piece => {
                    const isSelected = selectedPieceId === piece.id;
                    return (
                      <button
                        key={piece.id}
                        type="button"
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
                        aria-label={`Puzzle piece ${piece.id + 1}`}
                      >
                        <div
                          className="w-full h-full bg-no-repeat"
                          style={getPieceStyle(piece.id)}
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Small Reference Picture */}
            <div className="p-3 rounded-2xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-600">
                <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
                <span>Reference Picture</span>
              </div>
              <img
                src={imageUrl}
                alt="Reference picture for Day 3 puzzle"
                className="w-full max-w-[180px] mx-auto rounded-xl border border-slate-200 object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
