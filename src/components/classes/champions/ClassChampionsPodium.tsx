import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { ClassroomLeaderboardEntry } from '@/types/classroom';
import { sanitizeLeaderboardStudentName } from '@/utils/leaderboardResetUtils';
import {
  GoldCrownIllustration,
  GoldLaurelSprig,
  GoldenTrophyIllustration,
  PodiumLeavesDecor,
} from './ClassChampionsAssets';
import './classChampions.css';

export interface ClassChampionsPodiumProps {
  topThree: ClassroomLeaderboardEntry[];
  currentUserId?: string;
}

interface ConfettiPieceConfig {
  left: string;
  top: string;
  tx: string;
  ty: string;
  rot: string;
  color: string;
  size: number;
  delay: string;
}

const CONFETTI_BURST_PIECES: ConfettiPieceConfig[] = [
  { left: '46%', top: '34%', tx: '-96px', ty: '-64px', rot: '-140deg', color: '#fbbf24', size: 8, delay: '0ms' },
  { left: '54%', top: '34%', tx: '92px', ty: '-68px', rot: '165deg', color: '#8b5cf6', size: 8, delay: '30ms' },
  { left: '48%', top: '30%', tx: '-54px', ty: '-88px', rot: '110deg', color: '#ec4899', size: 7, delay: '60ms' },
  { left: '52%', top: '30%', tx: '58px', ty: '-86px', rot: '-125deg', color: '#38bdf8', size: 7, delay: '45ms' },
  { left: '50%', top: '32%', tx: '-18px', ty: '-98px', rot: '210deg', color: '#34d399', size: 7, delay: '90ms' },
  { left: '50%', top: '32%', tx: '24px', ty: '-92px', rot: '-190deg', color: '#f59e0b', size: 8, delay: '20ms' },
  { left: '44%', top: '38%', tx: '-118px', ty: '-36px', rot: '-90deg', color: '#60a5fa', size: 6, delay: '70ms' },
  { left: '56%', top: '38%', tx: '114px', ty: '-40px', rot: '130deg', color: '#f472b6', size: 6, delay: '50ms' },
];

const getInitials = (name: string): string => {
  const parts = sanitizeLeaderboardStudentName(name).trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) || 'ST').toUpperCase();
};

interface ChampionAvatarProps {
  entry?: ClassroomLeaderboardEntry;
  rank: 1 | 2 | 3;
  isCurrentUser: boolean;
}

const ChampionAvatar: React.FC<ChampionAvatarProps> = ({ entry, rank, isCurrentUser }) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [entry?.avatar_url]);

  const sizeClass =
    rank === 1
      ? 'w-14 h-14 sm:w-[74px] sm:h-[74px]'
      : 'w-12 h-12 sm:w-[60px] sm:h-[60px]';

  const ringClass =
    rank === 1
      ? 'p-[3px] bg-gradient-to-br from-yellow-100 via-amber-400 to-amber-600 shadow-[0_8px_18px_rgba(245,158,11,0.42)]'
      : rank === 2
        ? 'p-[3px] bg-gradient-to-br from-white via-sky-300 to-blue-500 shadow-[0_6px_14px_rgba(59,130,246,0.3)]'
        : 'p-[3px] bg-gradient-to-br from-amber-100 via-orange-300 to-orange-600 shadow-[0_6px_14px_rgba(234,88,12,0.3)]';

  const initialsBgClass =
    rank === 1
      ? 'from-amber-400 to-orange-500'
      : rank === 2
        ? 'from-sky-400 to-blue-600'
        : 'from-orange-400 to-amber-600';

  if (!entry) {
    return (
      <div
        className={`${sizeClass} rounded-full p-[3px] bg-slate-200/80 shadow-inner flex items-center justify-center relative z-10`}
      >
        <div className="w-full h-full rounded-full bg-white/90 border border-dashed border-slate-300 flex items-center justify-center text-xs font-bold text-slate-400">
          #{rank}
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex flex-col items-center">
      {isCurrentUser && (
        <span className="mb-1 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-sm">
          You
        </span>
      )}
      <div className={`${sizeClass} rounded-full ${ringClass}`}>
        <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center">
          {entry.avatar_url && !imgFailed ? (
            <img
              src={entry.avatar_url}
              alt={sanitizeLeaderboardStudentName(entry.name)}
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-br ${initialsBgClass} flex items-center justify-center text-white font-black ${
                rank === 1 ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'
              }`}
            >
              {getInitials(entry.name)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface PodiumSpotConfig {
  rank: 1 | 2 | 3;
  entry?: ClassroomLeaderboardEntry;
  columnClass: string;
  pillarClass: string;
  pillarHeightClass: string;
  xpTextClass: string;
  numeralClass: string;
  delayClass: string;
}

export const ClassChampionsPodium: React.FC<ClassChampionsPodiumProps> = ({
  topThree,
  currentUserId,
}) => {
  const [burstKey, setBurstKey] = useState<number>(0);
  const previousWinnerRef = useRef<string | undefined>(topThree[0]?.student_id);
  const burstTimerRef = useRef<number | null>(null);

  const triggerCelebration = () => {
    if (burstTimerRef.current !== null) {
      window.clearTimeout(burstTimerRef.current);
    }
    setBurstKey((prev) => prev + 1);
    burstTimerRef.current = window.setTimeout(() => {
      setBurstKey(0);
    }, 2000);
  };

  useEffect(() => {
    const nextWinnerId = topThree[0]?.student_id;
    if (
      previousWinnerRef.current &&
      nextWinnerId &&
      previousWinnerRef.current !== nextWinnerId
    ) {
      triggerCelebration();
    }
    previousWinnerRef.current = nextWinnerId;
  }, [topThree]);

  useEffect(() => {
    return () => {
      if (burstTimerRef.current !== null) {
        window.clearTimeout(burstTimerRef.current);
      }
    };
  }, []);

  const rank1 = topThree[0];
  const rank2 = topThree[1];
  const rank3 = topThree[2];

  const spots: PodiumSpotConfig[] = [
    {
      rank: 2,
      entry: rank2,
      columnClass: 'flex-1 min-w-0 max-w-[104px]',
      pillarClass: 'cc-pillar-silver border border-blue-200/80',
      pillarHeightClass: 'h-[112px] sm:h-[130px]',
      xpTextClass: 'text-blue-600',
      numeralClass: 'text-2xl sm:text-[28px]',
      delayClass: 'cc-fade-up-delay-2',
    },
    {
      rank: 1,
      entry: rank1,
      columnClass: 'flex-[1.15] min-w-0 max-w-[120px] z-10',
      pillarClass: 'cc-pillar-gold border border-amber-200/80',
      pillarHeightClass: 'h-[140px] sm:h-[164px]',
      xpTextClass: 'text-amber-600',
      numeralClass: 'text-[28px] sm:text-[34px]',
      delayClass: 'cc-fade-up-delay-1',
    },
    {
      rank: 3,
      entry: rank3,
      columnClass: 'flex-1 min-w-0 max-w-[104px]',
      pillarClass: 'cc-pillar-bronze border border-orange-200/80',
      pillarHeightClass: 'h-[98px] sm:h-[116px]',
      xpTextClass: 'text-orange-600',
      numeralClass: 'text-2xl sm:text-[28px]',
      delayClass: 'cc-fade-up-delay-3',
    },
  ];

  return (
    <div className="cc-podium-card p-3.5 sm:p-5 flex flex-col justify-between h-full">
      <div className="cc-podium-rays" aria-hidden="true" />

      {/* Subtle Clouds & Decorative Shapes */}
      <svg
        viewBox="0 0 400 260"
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <g opacity="0.72">
          <ellipse cx="42" cy="145" rx="34" ry="15" fill="#ffffff" />
          <ellipse cx="64" cy="139" rx="22" ry="13" fill="#ffffff" />
          <ellipse cx="352" cy="128" rx="36" ry="16" fill="#ffffff" />
          <ellipse cx="330" cy="122" rx="20" ry="12" fill="#ffffff" />
        </g>
        {/* Confetti ribbons matching Class Champions composition */}
        <path d="M52 84 C60 76, 68 86, 76 78" stroke="#a855f7" strokeWidth="4" strokeLinecap="round" opacity="0.7" fill="none" />
        <path d="M332 78 C340 86, 348 76, 356 84" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" opacity="0.75" fill="none" />
        <path d="M342 152 C349 144, 357 154, 364 146" stroke="#ec4899" strokeWidth="3.5" strokeLinecap="round" opacity="0.7" fill="none" />
        <circle cx="88" cy="112" r="3.5" fill="#38bdf8" opacity="0.75" />
        <circle cx="312" cy="108" r="3.5" fill="#fbbf24" opacity="0.8" />
        <circle cx="40" cy="184" r="3" fill="#f472b6" opacity="0.75" />
      </svg>

      {/* One-shot Celebration Burst (never re-runs on unrelated renders) */}
      {burstKey > 0 && (
        <div key={burstKey} className="absolute inset-0 pointer-events-none z-30" aria-hidden="true">
          {CONFETTI_BURST_PIECES.map((piece, idx) => (
            <span
              key={idx}
              className="cc-confetti-burst rounded-sm"
              style={
                {
                  left: piece.left,
                  top: piece.top,
                  width: `${piece.size}px`,
                  height: `${piece.size}px`,
                  backgroundColor: piece.color,
                  animationDelay: piece.delay,
                  '--cc-tx': piece.tx,
                  '--cc-ty': piece.ty,
                  '--cc-rot': piece.rot,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      {/* Optional Sparkle Celebrate Trigger */}
      <button
        type="button"
        onClick={triggerCelebration}
        title="Celebrate Class Champions"
        aria-label="Celebrate Class Champions"
        className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-white/80 hover:bg-amber-50 border border-amber-200/70 text-amber-500 hover:text-amber-600 shadow-sm transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5 cc-sparkle" />
      </button>

      {/* Top Title Header */}
      <div className="relative z-10 text-center pt-1 pb-2">
        <div className="inline-flex items-center justify-center gap-1.5 sm:gap-2">
          <GoldLaurelSprig side="left" className="w-5 h-7 sm:w-6 sm:h-8 shrink-0" />
          <GoldenTrophyIllustration className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" />
          <h4 className="text-lg sm:text-[22px] font-black tracking-tight text-slate-900 leading-tight">
            Class Champions
          </h4>
          <GoldLaurelSprig side="right" className="w-5 h-7 sm:w-6 sm:h-8 shrink-0" />
        </div>
        <p className="text-xs sm:text-[13px] font-semibold text-indigo-700/75 mt-0.5">
          Top 3 performers in this classroom
        </p>
      </div>

      {/* 3-Position Podium Stage */}
      <div className="relative z-10 pt-3 pb-1">
        {/* Decorative Leaves */}
        <div
          className="hidden xs:block sm:block absolute left-0 bottom-3 w-12 h-16 sm:w-14 sm:h-20 pointer-events-none opacity-90 z-0"
          aria-hidden="true"
        >
          <PodiumLeavesDecor side="left" className="w-full h-full" />
        </div>
        <div
          className="hidden xs:block sm:block absolute right-0 bottom-3 w-12 h-16 sm:w-14 sm:h-20 pointer-events-none opacity-90 z-0"
          aria-hidden="true"
        >
          <PodiumLeavesDecor side="right" className="w-full h-full" />
        </div>

        <div className="flex items-end justify-center gap-1.5 sm:gap-2.5 px-1 sm:px-4 relative z-10">
          {spots.map((spot) => {
            const isCurrent = Boolean(
              spot.entry && currentUserId && spot.entry.student_id === currentUserId
            );
            const displayName = spot.entry
              ? sanitizeLeaderboardStudentName(spot.entry.name)
              : 'Open Spot';

            return (
              <div
                key={spot.rank}
                className={`cc-podium-column cc-fade-up ${spot.delayClass} ${spot.columnClass} flex flex-col items-center`}
              >
                {spot.rank === 1 && (
                  <div className="cc-crown-float w-10 h-7 sm:w-12 sm:h-8 -mb-1.5 relative z-20 drop-shadow-sm">
                    <GoldCrownIllustration className="w-full h-full" />
                  </div>
                )}

                <ChampionAvatar
                  entry={spot.entry}
                  rank={spot.rank}
                  isCurrentUser={isCurrent}
                />

                {/* Cylindrical Podium Pillar */}
                <div
                  className={`w-full ${spot.pillarHeightClass} ${spot.pillarClass} rounded-t-[18px] -mt-2.5 pt-3.5 pb-2 px-1.5 sm:px-2 flex flex-col items-center justify-between relative`}
                >
                  {/* Top cylindrical rim sheen */}
                  <div
                    className="w-[82%] h-1.5 rounded-full bg-white/40 absolute top-1.5 left-1/2 -translate-x-1/2 pointer-events-none"
                    aria-hidden="true"
                  />

                  <span
                    className={`${spot.numeralClass} font-black text-white leading-none drop-shadow-[0_2px_4px_rgba(15,23,42,0.22)] mt-1`}
                  >
                    {spot.rank}
                  </span>

                  {/* Nameplate */}
                  <div className="w-full bg-white/95 rounded-xl px-1.5 py-1.5 shadow-[0_4px_12px_rgba(15,23,42,0.12)] border border-white text-center">
                    <p
                      className={`text-[11px] sm:text-xs font-extrabold leading-tight line-clamp-2 break-words ${
                        spot.entry ? 'text-slate-900' : 'text-slate-400'
                      }`}
                      title={displayName}
                    >
                      {displayName}
                    </p>
                    <p
                      className={`text-[10px] sm:text-xs font-black mt-0.5 tabular-nums ${
                        spot.entry ? spot.xpTextClass : 'text-slate-400'
                      }`}
                    >
                      {spot.entry ? `${spot.entry.points.toLocaleString()} XP` : '--'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Golden Base Stage Platform */}
        <div className="cc-stage-platform h-3.5 sm:h-4 rounded-full mx-2 sm:mx-4 -mt-1 relative z-10 flex items-center justify-around px-6">
          {[0, 1, 2, 3, 4].map((dot) => (
            <span
              key={dot}
              className="w-1.5 h-1.5 rounded-full bg-amber-100 shadow-[0_0_6px_rgba(255,255,255,0.95)]"
            />
          ))}
        </div>
      </div>
    </div>
  );
};
