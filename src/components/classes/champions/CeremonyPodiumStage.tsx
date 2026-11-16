import React from 'react';
import { Sparkles } from 'lucide-react';
import { AchievementChampion, AchievementSnapshot } from '@/utils/classChampionsUtils';
import {
  GoldAchievementSeal,
  GoldCrownIllustration,
  GoldLaurelSprig,
  GoldenTrophyIllustration,
  PodiumLeavesDecor,
} from './ClassChampionsAssets';
import './classChampions.css';
import './classChampionsCeremony.css';

export interface CeremonyPodiumStageProps {
  snapshot: AchievementSnapshot;
  logoUrl?: string;
}

function getInitials(name: string): string {
  const parts = (name || 'S').trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) || 'ST').toUpperCase();
}

interface CeremonyAvatarProps {
  champion?: AchievementChampion | null;
  rank: 1 | 2 | 3;
}

const CeremonyAvatar: React.FC<CeremonyAvatarProps> = ({ champion, rank }) => {
  const isFirst = rank === 1;
  const sizeClass = isFirst
    ? 'w-20 h-20 sm:w-28 sm:h-28'
    : 'w-14 h-14 sm:w-20 sm:h-20';

  const ringStyle =
    rank === 1
      ? 'border-[3.5px] sm:border-4 border-amber-400 ceremony-first-avatar-glow'
      : rank === 2
        ? 'border-[3px] border-slate-300 shadow-[0_8px_20px_rgba(100,116,139,0.22)]'
        : 'border-[3px] border-amber-600/80 shadow-[0_8px_18px_rgba(180,83,9,0.2)]';

  const bgFallback =
    rank === 1
      ? 'bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 text-amber-950'
      : rank === 2
        ? 'bg-gradient-to-br from-slate-100 via-slate-300 to-slate-500 text-slate-900'
        : 'bg-gradient-to-br from-orange-200 via-amber-600 to-amber-800 text-white';

  const animClass = isFirst ? 'ceremony-avatar-first' : 'ceremony-avatar-side';

  return (
    <div className={`relative flex items-center justify-center ${animClass}`}>
      {isFirst && (
        <div
          className="absolute -top-[22px] sm:-top-[30px] left-1/2 -translate-x-1/2 w-12 h-8 sm:w-16 sm:h-11 z-20 pointer-events-none"
          aria-hidden="true"
        >
          <div className="ceremony-crown-glow absolute -inset-2 rounded-full pointer-events-none" />
          <div className="ceremony-crown-descend relative w-full h-full drop-shadow-[0_4px_10px_rgba(217,119,6,0.45)]">
            <GoldCrownIllustration />
          </div>
          <Sparkles
            className="ceremony-crown-sparkle w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 absolute -top-1 -right-2.5"
          />
          <Sparkles
            className="ceremony-crown-sparkle w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-500 absolute top-0 -left-2"
            style={{ animationDelay: '1.1s' }}
          />
        </div>
      )}

      <div
        className={`${sizeClass} rounded-full overflow-hidden ${ringStyle} ${bgFallback} flex items-center justify-center font-black select-none relative z-10`}
      >
        {champion?.avatarUrl ? (
          <img
            src={champion.avatarUrl}
            alt={champion.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className={isFirst ? 'text-xl sm:text-3xl' : 'text-sm sm:text-xl'}>
            {getInitials(champion?.name || `#${rank}`)}
          </span>
        )}
      </div>

      <span
        className={`absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black tracking-wide shadow-md ${
          rank === 1
            ? 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-amber-950 border border-amber-100'
            : rank === 2
              ? 'bg-gradient-to-r from-slate-100 to-slate-300 text-slate-900 border border-white'
              : 'bg-gradient-to-r from-amber-600 to-orange-700 text-amber-50 border border-amber-300/60'
        }`}
      >
        #{rank}
      </span>
    </div>
  );
};

export const CeremonyPodiumStage: React.FC<CeremonyPodiumStageProps> = ({
  snapshot,
  logoUrl = '/images/edtechra-classroom-logo.png',
}) => {
  const first = snapshot.champions.find((c) => c.rank === 1) || snapshot.champions[0] || null;
  const second = snapshot.champions.find((c) => c.rank === 2) || snapshot.champions[1] || null;
  const third = snapshot.champions.find((c) => c.rank === 3) || snapshot.champions[2] || null;

  return (
    <section
      aria-label={`Class Champions Ceremony for ${snapshot.classroomName}`}
      className="ceremony-gold-frame relative w-full max-w-4xl mx-auto rounded-3xl sm:rounded-[36px] px-3.5 py-6 sm:px-10 sm:py-9 overflow-hidden text-slate-900"
    >
      {/* Subtle moving golden highlight along top & bottom certificate border sections */}
      <div className="ceremony-border-sheen top-0" aria-hidden="true" />
      <div className="ceremony-border-sheen bottom-0" aria-hidden="true" />

      {/* Stage 1: Soft Golden Light Rays & Ambient Halo */}
      <div className="ceremony-light-rays absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div
        className="ceremony-ambient-halo absolute left-1/2 top-[48%] w-[260px] h-[260px] sm:w-[420px] sm:h-[420px] rounded-full pointer-events-none"
        aria-hidden="true"
      />

      {/* Gold Decorative Corner Ornaments */}
      <div className="pointer-events-none absolute top-3.5 left-3.5 w-7 h-7 sm:w-10 sm:h-10 border-t-2 border-l-2 border-amber-500/60 rounded-tl-xl" aria-hidden="true" />
      <div className="pointer-events-none absolute top-3.5 right-3.5 w-7 h-7 sm:w-10 sm:h-10 border-t-2 border-r-2 border-amber-500/60 rounded-tr-xl" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-3.5 left-3.5 w-7 h-7 sm:w-10 sm:h-10 border-b-2 border-l-2 border-amber-500/60 rounded-bl-xl" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-3.5 right-3.5 w-7 h-7 sm:w-10 sm:h-10 border-b-2 border-r-2 border-amber-500/60 rounded-br-xl" aria-hidden="true" />

      {/* TOP: EdTechra Logo, Digital Classroom Branding & Class Champions Ribbon */}
      <header className="ceremony-stage-header relative z-10 flex flex-col items-center text-center">
        <div className="flex items-center justify-center gap-2.5 sm:gap-3 mb-4">
          <img
            src={logoUrl}
            alt="EdTechra"
            className="h-8 sm:h-10 w-auto object-contain drop-shadow-[0_3px_8px_rgba(30,58,138,0.16)]"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/logo-emblem.png';
            }}
          />
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
              EdTechra
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-700 text-white text-[10px] sm:text-xs font-bold tracking-wide uppercase shadow-sm">
              Digital Classroom
            </span>
          </div>
        </div>

        {/* Gold Class Champions Ribbon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="hidden sm:block w-8 h-12 -mr-2 opacity-95" aria-hidden="true">
            <GoldLaurelSprig side="left" />
          </div>
          <div className="px-6 sm:px-10 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 shadow-[0_10px_26px_rgba(217,119,6,0.32)] border border-amber-200">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-black tracking-[0.14em] uppercase text-amber-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]">
              Class Champions
            </h1>
          </div>
          <div className="hidden sm:block w-8 h-12 -ml-2 opacity-95" aria-hidden="true">
            <GoldLaurelSprig side="right" />
          </div>
        </div>

        <p className="mt-2.5 text-xs sm:text-sm font-bold tracking-wide text-blue-900/80">
          Top 3 Performers in This Classroom
        </p>
      </header>

      {/* CENTRE: Animated 3-Position Podium */}
      <div className="relative z-10 mt-10 sm:mt-14 mb-6 sm:mb-8">
        {/* Decorative Leaves */}
        <div className="hidden md:block pointer-events-none absolute -left-3 bottom-4 w-20 h-28 opacity-80" aria-hidden="true">
          <PodiumLeavesDecor side="left" />
        </div>
        <div className="hidden md:block pointer-events-none absolute -right-3 bottom-4 w-20 h-28 opacity-80" aria-hidden="true">
          <PodiumLeavesDecor side="right" />
        </div>

        <div className="grid grid-cols-3 items-end gap-2 sm:gap-5 max-w-2xl mx-auto pt-4">
          {/* 2nd Place (Left) */}
          <div className="flex flex-col items-center">
            <CeremonyAvatar champion={second} rank={2} />

            <div className="ceremony-meta-2 mt-3.5 mb-2.5 text-center px-1 min-h-[48px] sm:min-h-[54px] flex flex-col justify-start">
              <p className="text-xs sm:text-base font-extrabold text-slate-900 leading-tight line-clamp-2 break-words">
                {second?.name || 'Position Open'}
              </p>
              <span className="mt-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-[11px] sm:text-xs font-bold text-slate-700 shadow-sm">
                {second ? `${second.points.toLocaleString()} XP` : '— XP'}
              </span>
            </div>

            <div className="ceremony-podium-rise-side w-full">
              <div className="cc-pillar-silver h-24 sm:h-32 rounded-t-2xl flex flex-col items-center justify-center relative border-t border-white/80">
                <span className="text-3xl sm:text-5xl font-black text-slate-800/90 drop-shadow-[0_1px_0_rgba(255,255,255,0.75)]">
                  2
                </span>
                <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  2nd Place
                </span>
              </div>
            </div>
          </div>

          {/* 1st Place (Center - Tallest & Prominent) */}
          <div className="flex flex-col items-center">
            <CeremonyAvatar champion={first} rank={1} />

            <div className="ceremony-meta-1 mt-3.5 mb-2.5 text-center px-1 min-h-[52px] sm:min-h-[58px] flex flex-col justify-start">
              <p className="text-sm sm:text-lg font-black text-amber-950 leading-tight line-clamp-2 break-words">
                {first?.name || 'Position Open'}
              </p>
              <span className="mt-1 inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-400 text-xs sm:text-sm font-extrabold text-amber-900 shadow-sm">
                {first ? `${first.points.toLocaleString()} XP` : '— XP'}
              </span>
            </div>

            <div className="ceremony-podium-rise-first w-full">
              <div className="cc-pillar-gold ceremony-gold-shimmer h-32 sm:h-44 rounded-t-2xl flex flex-col items-center justify-center relative border-t-2 border-amber-100 shadow-[0_14px_34px_rgba(217,119,6,0.28)]">
                <div className="w-7 h-7 sm:w-9 sm:h-9 mb-0.5 opacity-95" aria-hidden="true">
                  <GoldenTrophyIllustration />
                </div>
                <span className="text-4xl sm:text-6xl font-black text-amber-950/90 drop-shadow-[0_1px_0_rgba(255,255,255,0.55)] leading-none">
                  1
                </span>
                <span className="mt-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-950/85">
                  Champion
                </span>
              </div>
            </div>
          </div>

          {/* 3rd Place (Right) */}
          <div className="flex flex-col items-center">
            <CeremonyAvatar champion={third} rank={3} />

            <div className="ceremony-meta-3 mt-3.5 mb-2.5 text-center px-1 min-h-[48px] sm:min-h-[54px] flex flex-col justify-start">
              <p className="text-xs sm:text-base font-extrabold text-slate-900 leading-tight line-clamp-2 break-words">
                {third?.name || 'Position Open'}
              </p>
              <span className="mt-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-orange-100/90 border border-amber-400/70 text-[11px] sm:text-xs font-bold text-amber-900 shadow-sm">
                {third ? `${third.points.toLocaleString()} XP` : '— XP'}
              </span>
            </div>

            <div className="ceremony-podium-rise-side w-full">
              <div className="cc-pillar-bronze h-20 sm:h-28 rounded-t-2xl flex flex-col items-center justify-center relative border-t border-amber-200/70">
                <span className="text-3xl sm:text-5xl font-black text-amber-950/85 drop-shadow-[0_1px_0_rgba(255,255,255,0.45)]">
                  3
                </span>
                <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-amber-950/80">
                  3rd Place
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM: Classroom Name, Period, Achievement Message & Gold Seal */}
      <footer className="ceremony-stage-footer relative z-10 border-t border-amber-500/25 pt-5 flex flex-col items-center text-center gap-3.5">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs sm:text-sm font-bold text-blue-950 shadow-sm">
            {snapshot.classroomName}
          </span>
          <span className="px-3.5 py-1 rounded-full bg-amber-50 border border-amber-300 text-xs sm:text-sm font-bold text-amber-900 shadow-sm">
            {snapshot.periodLabel}
          </span>
        </div>

        <p className="text-sm sm:text-base font-medium italic text-slate-700 max-w-xl leading-relaxed">
          &ldquo;Keep learning, keep growing, and reach even greater heights!&rdquo;
        </p>

        <div className="flex items-center justify-center gap-3 pt-1">
          <div className="ceremony-seal-float w-12 h-12 sm:w-14 sm:h-14 shrink-0 drop-shadow-[0_6px_14px_rgba(217,119,6,0.32)]">
            <GoldAchievementSeal />
          </div>
          <div className="text-left">
            <div className="text-xs sm:text-sm font-extrabold text-amber-800 tracking-wide uppercase">
              Verified Achievement
            </div>
            <div className="text-[11px] sm:text-xs text-slate-600 font-semibold">
              EdTechra Digital Classroom • Learn. Discover. Grow.
            </div>
          </div>
        </div>
      </footer>
    </section>
  );
};
