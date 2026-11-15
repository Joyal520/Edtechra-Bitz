import React, { useId } from 'react';
import { AchievementSnapshot } from '@/utils/classChampionsUtils';
import {
  BooksAndGradCapIllustration,
  GoldAchievementSeal,
  GoldCrownIllustration,
  GoldLaurelSprig,
  GoldenTrophyIllustration,
  PodiumLeavesDecor,
} from './ClassChampionsAssets';

export interface ClassChampionsCertificateSvgProps {
  snapshot: AchievementSnapshot;
  /** Pre-resolved base64 data URL for /images/edtechra-classroom-logo.png */
  logoUrl?: string;
  /** Map of rank (1|2|3) -> pre-resolved base64 data URL */
  avatarDataUrls?: Partial<Record<1 | 2 | 3, string | null>>;
  className?: string;
  svgRef?: React.Ref<SVGSVGElement>;
}

function wrapNameLines(name: string, maxLen = 14): [string, string | null] {
  const clean = (name || 'Student').trim();
  if (clean.length <= maxLen) return [clean, null];

  const words = clean.split(/\s+/);
  if (words.length === 1) {
    return [`${clean.slice(0, maxLen - 1)}…`, null];
  }

  let line1 = '';
  let idx = 0;
  while (idx < words.length) {
    const candidate = line1 ? `${line1} ${words[idx]}` : words[idx];
    if (candidate.length <= maxLen || !line1) {
      line1 = candidate;
      idx += 1;
    } else {
      break;
    }
  }
  const rest = words.slice(idx).join(' ');
  if (!rest) return [line1, null];
  const line2 = rest.length > maxLen ? `${rest.slice(0, maxLen - 1)}…` : rest;
  return [line1, line2];
}

function getInitials(name: string): string {
  const parts = (name || 'S').trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }
  return (parts[0] || 'S').slice(0, 2).toUpperCase();
}

const ConfettiAndSparkles: React.FC = () => (
  <g aria-hidden="true">
    {/* Confetti ribbons */}
    <path d="M198 465C214 454 222 472 238 462" stroke="#f59e0b" strokeWidth="9" strokeLinecap="round" fill="none" />
    <path d="M258 415C272 398 282 418 296 404" stroke="#6366f1" strokeWidth="8" strokeLinecap="round" fill="none" />
    <path d="M168 545C180 534 192 548 202 536" stroke="#ec4899" strokeWidth="7" strokeLinecap="round" fill="none" />
    <path d="M998 470C982 458 974 476 960 464" stroke="#f59e0b" strokeWidth="9" strokeLinecap="round" fill="none" />
    <path d="M936 420C922 406 914 424 898 410" stroke="#8b5cf6" strokeWidth="8" strokeLinecap="round" fill="none" />
    <path d="M1028 548C1014 536 1004 550 990 540" stroke="#ec4899" strokeWidth="7" strokeLinecap="round" fill="none" />

    {/* Floating confetti diamonds */}
    <rect x="190" y="610" width="12" height="12" rx="2" fill="#38bdf8" transform="rotate(24 196 616)" />
    <rect x="996" y="618" width="12" height="12" rx="2" fill="#fbbf24" transform="rotate(-18 1002 624)" />
    <rect x="332" y="458" width="10" height="10" rx="2" fill="#ec4899" transform="rotate(35 337 463)" />
    <rect x="858" y="458" width="10" height="10" rx="2" fill="#3b82f6" transform="rotate(-30 863 463)" />

    {/* 4-point sparkles */}
    <path d="M178 395L183 410 198 415 183 420 178 435 173 420 158 415 173 410Z" fill="#fbbf24" />
    <path d="M1022 398L1027 413 1042 418 1027 423 1022 438 1017 423 1002 418 1017 413Z" fill="#fbbf24" />
    <path d="M446 410L450 420 460 424 450 428 446 438 442 428 432 424 442 420Z" fill="#fde047" />
    <path d="M754 410L758 420 768 424 758 428 754 438 750 428 740 424 750 420Z" fill="#fde047" />
    <path d="M112 665L116 676 127 680 116 684 112 695 108 684 97 680 108 676Z" fill="#ffffff" />
    <path d="M1088 665L1092 676 1103 680 1092 684 1088 695 1084 684 1073 680 1084 676Z" fill="#ffffff" />
  </g>
);

export const ClassChampionsCertificateSvg: React.FC<ClassChampionsCertificateSvgProps> = ({
  snapshot,
  logoUrl = '/images/edtechra-classroom-logo.png',
  avatarDataUrls,
  className = 'w-full h-auto',
  svgRef,
}) => {
  const uid = useId().replace(/:/g, '');
  const first = snapshot.champions.find((c) => c.rank === 1) || snapshot.champions[0] || null;
  const second = snapshot.champions.find((c) => c.rank === 2) || snapshot.champions[1] || null;
  const third = snapshot.champions.find((c) => c.rank === 3) || snapshot.champions[2] || null;

  const getAvatar = (rank: 1 | 2 | 3, fallbackUrl?: string | null) => {
    if (avatarDataUrls && rank in avatarDataUrls) {
      return avatarDataUrls[rank] || null;
    }
    return fallbackUrl || null;
  };

  const firstAvatar = getAvatar(1, first?.avatarUrl);
  const secondAvatar = getAvatar(2, second?.avatarUrl);
  const thirdAvatar = getAvatar(3, third?.avatarUrl);

  const firstNameLines = wrapNameLines(first?.name || 'Position Open', 14);
  const secondNameLines = wrapNameLines(second?.name || 'Position Open', 13);
  const thirdNameLines = wrapNameLines(third?.name || 'Position Open', 13);

  const classroomDisplay =
    snapshot.classroomName.length > 24
      ? `${snapshot.classroomName.slice(0, 23)}…`
      : snapshot.classroomName;

  const periodDisplay =
    snapshot.periodLabel.length > 26
      ? `${snapshot.periodLabel.slice(0, 25)}…`
      : snapshot.periodLabel;

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 1200 1500"
      className={className}
      role="img"
      aria-label={`EdTechra Class Champions Achievement Certificate for ${snapshot.classroomName}`}
    >
      <defs>
        <linearGradient id={`${uid}-bgGrad`} x1="0" y1="0" x2="1200" y2="1500" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#edf4ff" />
          <stop offset="45%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8efff" />
        </linearGradient>

        <radialGradient id={`${uid}-sunGlow`} cx="50%" cy="46%" r="48%">
          <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.92" />
          <stop offset="45%" stopColor="#ede9fe" stopOpacity="0.44" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={`${uid}-goldFrame`} x1="0" y1="0" x2="1200" y2="1500" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="28%" stopColor="#fef08a" />
          <stop offset="55%" stopColor="#d97706" />
          <stop offset="80%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        <linearGradient id={`${uid}-ribbonGrad`} x1="180" y1="185" x2="1020" y2="310" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="25%" stopColor="#fde047" />
          <stop offset="50%" stopColor="#fef08a" />
          <stop offset="75%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>

        {/* 3D Cylindrical Gold Pillar */}
        <linearGradient id={`${uid}-podiumGold`} x1="466" y1="674" x2="734" y2="674" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="18%" stopColor="#fbbf24" />
          <stop offset="38%" stopColor="#fef08a" />
          <stop offset="68%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        {/* 3D Cylindrical Silver-Blue Pillar */}
        <linearGradient id={`${uid}-podiumSilver`} x1="212" y1="746" x2="458" y2="746" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="20%" stopColor="#cbd5e1" />
          <stop offset="40%" stopColor="#f1f5f9" />
          <stop offset="72%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        {/* 3D Cylindrical Bronze Pillar */}
        <linearGradient id={`${uid}-podiumBronze`} x1="742" y1="762" x2="988" y2="762" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9a3412" />
          <stop offset="20%" stopColor="#fb923c" />
          <stop offset="40%" stopColor="#fed7aa" />
          <stop offset="72%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </linearGradient>

        <linearGradient id={`${uid}-stageGold`} x1="110" y1="990" x2="1090" y2="1065" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="28%" stopColor="#fde047" />
          <stop offset="50%" stopColor="#fef08a" />
          <stop offset="72%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        <linearGradient id={`${uid}-cornerBlue`} x1="0" y1="0" x2="400" y2="300" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="55%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>

        <linearGradient id={`${uid}-digitalPill`} x1="526" y1="112" x2="770" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0070e0" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>

        <filter id={`${uid}-softShadow`} x="-10%" y="-10%" width="120%" height="125%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#1e293b" floodOpacity="0.16" />
        </filter>

        <clipPath id={`${uid}-clip1`}>
          <circle cx="600" cy="562" r="98" />
        </clipPath>
        <clipPath id={`${uid}-clip2`}>
          <circle cx="335" cy="648" r="82" />
        </clipPath>
        <clipPath id={`${uid}-clip3`}>
          <circle cx="865" cy="664" r="82" />
        </clipPath>
        <clipPath id={`${uid}-outerClip`}>
          <rect x="0" y="0" width="1200" height="1500" rx="28" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${uid}-outerClip)`}>
        {/* 1. Background Sky & Sunburst */}
        <rect x="0" y="0" width="1200" height="1500" fill={`url(#${uid}-bgGrad)`} />

        {/* Radial light rays behind Rank #1 */}
        <g opacity="0.3">
          <polygon points="600,660 110,270 310,190" fill="#fef9c3" />
          <polygon points="600,660 440,140 580,120" fill="#fef08a" />
          <polygon points="600,660 660,120 820,150" fill="#fef9c3" />
          <polygon points="600,660 940,200 1130,300" fill="#fef08a" />
        </g>
        <circle cx="600" cy="650" r="470" fill={`url(#${uid}-sunGlow)`} />

        {/* Fluffy Background Clouds */}
        <path
          d="M0 745Q80 685 170 720Q230 675 310 725Q370 730 410 795L0 795Z"
          fill="#ffffff"
          opacity="0.76"
        />
        <path
          d="M1200 725Q1100 665 1010 710Q940 660 860 720Q810 730 780 795L1200 795Z"
          fill="#ffffff"
          opacity="0.76"
        />

        {/* Top Corner Accent Waves */}
        <path
          d="M0 0H265C205 70 150 115 72 156C38 175 15 208 0 252V0Z"
          fill={`url(#${uid}-cornerBlue)`}
          opacity="0.92"
        />
        <path
          d="M1200 0H935C995 70 1050 115 1128 156C1162 175 1185 208 1200 252V0Z"
          fill={`url(#${uid}-cornerBlue)`}
          opacity="0.92"
        />

        {/* Bottom Blue/Purple Ribbon Wave */}
        <path
          d="M0 1372Q290 1445 620 1405Q940 1365 1200 1396V1500H0V1372Z"
          fill="#38bdf8"
          opacity="0.35"
        />
        <path
          d="M0 1405Q320 1472 650 1425Q960 1384 1200 1425V1500H0V1405Z"
          fill={`url(#${uid}-cornerBlue)`}
        />

        {/* Ornate Double Gold Certificate Border */}
        <rect
          x="18"
          y="18"
          width="1164"
          height="1464"
          rx="28"
          fill="none"
          stroke={`url(#${uid}-goldFrame)`}
          strokeWidth="12"
        />
        <rect
          x="36"
          y="36"
          width="1128"
          height="1428"
          rx="20"
          fill="none"
          stroke="#fbbf24"
          strokeWidth="2.5"
          opacity="0.72"
        />

        {/* 2. Top Branding: Actual EdTechra Logo + EdTechra + Digital Classroom */}
        <g transform="translate(0, 8)">
          <image
            href={logoUrl}
            xlinkHref={logoUrl}
            x="408"
            y="44"
            width="102"
            height="102"
            preserveAspectRatio="xMidYMid meet"
          />
          <text
            x="524"
            y="98"
            fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
            fontSize="54"
            fontWeight="800"
            fill="#0b2249"
            letterSpacing="-1"
          >
            EdTechra
          </text>
          <rect
            x="526"
            y="110"
            width="244"
            height="38"
            rx="19"
            fill={`url(#${uid}-digitalPill)`}
          />
          <text
            x="648"
            y="135"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
            fontSize="21"
            fontWeight="700"
            fill="#ffffff"
          >
            Digital Classroom
          </text>
        </g>

        {/* Flanking Gold Laurel Sprigs (with explicit width/height for PNG export) */}
        <g transform="translate(218, 76)">
          <GoldLaurelSprig side="left" width={88} height={132} />
        </g>
        <g transform="translate(894, 76)">
          <GoldLaurelSprig side="right" width={88} height={132} />
        </g>

        {/* 3. Large Golden Ribbon Banner: CLASS CHAMPIONS */}
        <g filter={`url(#${uid}-softShadow)`}>
          <path d="M108 232L228 214L242 308L120 326L154 276Z" fill="#d97706" stroke="#92400e" strokeWidth="2.4" />
          <path d="M1092 232L972 214L958 308L1080 326L1046 276Z" fill="#d97706" stroke="#92400e" strokeWidth="2.4" />

          <path
            d="M176 206Q600 156 1024 206L1002 304Q600 256 198 304Z"
            fill={`url(#${uid}-ribbonGrad)`}
            stroke="#b45309"
            strokeWidth="3"
          />
          <path
            d="M196 216Q600 168 1004 216"
            stroke="#fef9c3"
            strokeWidth="3"
            fill="none"
            opacity="0.85"
          />
        </g>

        {/* Ribbon Stars */}
        <path
          d="M236 232L243 248L260 250L247 262L251 278L236 269L221 278L225 262L212 250L229 248Z"
          fill="#fbbf24"
          stroke="#b45309"
          strokeWidth="2"
        />
        <path
          d="M964 232L971 248L988 250L975 262L979 278L964 269L949 278L953 262L940 250L957 248Z"
          fill="#fbbf24"
          stroke="#b45309"
          strokeWidth="2"
        />

        <text
          x="600"
          y="262"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
          fontSize="74"
          fontWeight="900"
          fill="#0b2249"
          stroke="#ffffff"
          strokeWidth="12"
          paintOrder="stroke fill"
          letterSpacing="-1"
        >
          Class Champions
        </text>

        {/* Subtitle */}
        <line x1="248" y1="336" x2="342" y2="336" stroke="#64748b" strokeWidth="2" opacity="0.55" />
        <text
          x="600"
          y="343"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
          fontSize="21"
          fontWeight="800"
          fill="#1e3a8a"
          letterSpacing="3.5"
        >
          TOP 3 PERFORMERS IN THIS CLASSROOM
        </text>
        <line x1="858" y1="336" x2="952" y2="336" stroke="#64748b" strokeWidth="2" opacity="0.55" />

        {/* Confetti & Sparkles */}
        <ConfettiAndSparkles />

        {/* 4. Centre Podium & Stage */}
        {/* Botanical leaves behind podium */}
        <g transform="translate(105, 815)">
          <PodiumLeavesDecor side="left" width={120} height={162} />
        </g>
        <g transform="translate(975, 815)">
          <PodiumLeavesDecor side="right" width={120} height={162} />
        </g>

        {/* Illuminated Golden Stage Base */}
        <g filter={`url(#${uid}-softShadow)`}>
          <ellipse cx="600" cy="1028" rx="492" ry="44" fill="#b45309" />
          <ellipse cx="600" cy="1016" rx="492" ry="40" fill={`url(#${uid}-stageGold)`} stroke="#fef08a" strokeWidth="2.5" />
          <ellipse cx="600" cy="1010" rx="446" ry="26" fill="#fef9c3" opacity="0.34" />
        </g>

        {/* Stage rim lights */}
        {[215, 310, 410, 505, 600, 695, 790, 890, 985].map((lx, idx) => {
          const ly = 1044 + (idx === 4 ? 7 : Math.abs(idx - 4) <= 1 ? 5 : 0);
          return <circle key={lx} cx={lx} cy={ly} r="5.5" fill="#fef9c3" opacity="0.94" />;
        })}

        {/* -------- SECOND PLACE (LEFT — SILVER) -------- */}
        <g filter={`url(#${uid}-softShadow)`}>
          <rect x="212" y="746" width="246" height="266" rx="18" fill={`url(#${uid}-podiumSilver)`} />
          <ellipse cx="335" cy="746" rx="123" ry="18" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          <text
            x="335"
            y="822"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
            fontSize="68"
            fontWeight="900"
            fill="#ffffff"
          >
            2
          </text>
          <rect x="232" y="844" width="206" height="114" rx="22" fill="#ffffff" fillOpacity="0.96" stroke="#e2e8f0" strokeWidth="2" />
          {secondNameLines[1] ? (
            <>
              <text x="335" y="880" textAnchor="middle" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="22" fontWeight="800" fill="#0f172a">
                {secondNameLines[0]}
              </text>
              <text x="335" y="906" textAnchor="middle" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="22" fontWeight="800" fill="#0f172a">
                {secondNameLines[1]}
              </text>
              <text x="335" y="940" textAnchor="middle" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="24" fontWeight="900" fill="#1d4ed8">
                {second ? `${second.points.toLocaleString()} XP` : '— XP'}
              </text>
            </>
          ) : (
            <>
              <text x="335" y="892" textAnchor="middle" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="24" fontWeight="800" fill="#0f172a">
                {secondNameLines[0]}
              </text>
              <text x="335" y="934" textAnchor="middle" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="24" fontWeight="900" fill="#1d4ed8">
                {second ? `${second.points.toLocaleString()} XP` : '— XP'}
              </text>
            </>
          )}
        </g>

        {/* Second Place Avatar */}
        <g filter={`url(#${uid}-softShadow)`}>
          <circle cx="335" cy="648" r="92" fill="#64748b" />
          <circle cx="335" cy="648" r="87" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="4" />
          <g clipPath={`url(#${uid}-clip2)`}>
            <rect x="253" y="566" width="164" height="164" fill="#eff6ff" />
            {secondAvatar ? (
              <image
                href={secondAvatar}
                xlinkHref={secondAvatar}
                x="253"
                y="566"
                width="164"
                height="164"
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <text x="335" y="668" textAnchor="middle" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="56" fontWeight="900" fill="#334155">
                {getInitials(second?.name || '2')}
              </text>
            )}
          </g>
        </g>

        {/* -------- THIRD PLACE (RIGHT — BRONZE) -------- */}
        <g filter={`url(#${uid}-softShadow)`}>
          <rect x="742" y="762" width="246" height="250" rx="18" fill={`url(#${uid}-podiumBronze)`} />
          <ellipse cx="865" cy="762" rx="123" ry="18" fill="#ffedd5" stroke="#fdba74" strokeWidth="2" />
          <text
            x="865"
            y="836"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
            fontSize="68"
            fontWeight="900"
            fill="#ffffff"
          >
            3
          </text>
          <rect x="762" y="856" width="206" height="114" rx="22" fill="#ffffff" fillOpacity="0.96" stroke="#fed7aa" strokeWidth="2" />
          {thirdNameLines[1] ? (
            <>
              <text x="865" y="892" textAnchor="middle" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="22" fontWeight="800" fill="#0f172a">
                {thirdNameLines[0]}
              </text>
              <text x="865" y="918" textAnchor="middle" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="22" fontWeight="800" fill="#0f172a">
                {thirdNameLines[1]}
              </text>
              <text x="865" y="952" textAnchor="middle" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="24" fontWeight="900" fill="#c2410c">
                {third ? `${third.points.toLocaleString()} XP` : '— XP'}
              </text>
            </>
          ) : (
            <>
              <text x="865" y="904" textAnchor="middle" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="24" fontWeight="800" fill="#0f172a">
                {thirdNameLines[0]}
              </text>
              <text x="865" y="946" textAnchor="middle" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="24" fontWeight="900" fill="#c2410c">
                {third ? `${third.points.toLocaleString()} XP` : '— XP'}
              </text>
            </>
          )}
        </g>

        {/* Third Place Avatar */}
        <g filter={`url(#${uid}-softShadow)`}>
          <circle cx="865" cy="664" r="92" fill="#c2410c" />
          <circle cx="865" cy="664" r="87" fill="#fff7ed" stroke="#fdba74" strokeWidth="4" />
          <g clipPath={`url(#${uid}-clip3)`}>
            <rect x="783" y="582" width="164" height="164" fill="#fff7ed" />
            {thirdAvatar ? (
              <image
                href={thirdAvatar}
                xlinkHref={thirdAvatar}
                x="783"
                y="582"
                width="164"
                height="164"
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <text x="865" y="684" textAnchor="middle" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="56" fontWeight="900" fill="#9a3412">
                {getInitials(third?.name || '3')}
              </text>
            )}
          </g>
        </g>

        {/* -------- FIRST PLACE (CENTER — 3D GOLD) -------- */}
        <g filter={`url(#${uid}-softShadow)`}>
          <rect x="466" y="674" width="268" height="342" rx="22" fill={`url(#${uid}-podiumGold)`} />
          <ellipse cx="600" cy="674" rx="134" ry="20" fill="#fef08a" stroke="#fde047" strokeWidth="2.5" />

          {/* Laurel Wreath framing Numeral 1 */}
          <g transform="translate(526, 706)">
            <GoldLaurelSprig side="left" width={48} height={72} />
          </g>
          <g transform="translate(626, 706)">
            <GoldLaurelSprig side="right" width={48} height={72} />
          </g>

          <text
            x="600"
            y="764"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
            fontSize="82"
            fontWeight="900"
            fill="#ffffff"
          >
            1
          </text>

          {/* Center Nameplate */}
          <rect x="488" y="794" width="224" height="136" rx="24" fill="#ffffff" fillOpacity="0.97" stroke="#fde68a" strokeWidth="2.5" />
          {firstNameLines[1] ? (
            <>
              <text x="600" y="836" textAnchor="middle" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="25" fontWeight="800" fill="#0f172a">
                {firstNameLines[0]}
              </text>
              <text x="600" y="866" textAnchor="middle" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="25" fontWeight="800" fill="#0f172a">
                {firstNameLines[1]}
              </text>
              <text x="600" y="906" textAnchor="middle" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="28" fontWeight="900" fill="#b45309">
                {first ? `${first.points.toLocaleString()} XP` : '— XP'}
              </text>
            </>
          ) : (
            <>
              <text x="600" y="852" textAnchor="middle" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="27" fontWeight="800" fill="#0f172a">
                {firstNameLines[0]}
              </text>
              <text x="600" y="900" textAnchor="middle" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="28" fontWeight="900" fill="#b45309">
                {first ? `${first.points.toLocaleString()} XP` : '— XP'}
              </text>
            </>
          )}
        </g>

        {/* First Place Avatar & Crown */}
        <g filter={`url(#${uid}-softShadow)`}>
          <circle cx="600" cy="562" r="110" fill="#f59e0b" />
          <circle cx="600" cy="562" r="105" fill="#fef9c3" stroke="#fbbf24" strokeWidth="5" />
          <g clipPath={`url(#${uid}-clip1)`}>
            <rect x="502" y="464" width="196" height="196" fill="#fefce8" />
            {firstAvatar ? (
              <image
                href={firstAvatar}
                xlinkHref={firstAvatar}
                x="502"
                y="464"
                width="196"
                height="196"
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <text x="600" y="584" textAnchor="middle" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="66" fontWeight="900" fill="#92400e">
                {getInitials(first?.name || '1')}
              </text>
            )}
          </g>
        </g>
        <g transform="translate(525, 386)">
          <GoldCrownIllustration width={150} height={105} />
        </g>

        {/* Books & Graduation Cap (Bottom Left of Stage) */}
        <g transform="translate(46, 902)">
          <BooksAndGradCapIllustration width={180} height={150} />
        </g>

        {/* Golden Trophy (Bottom Right of Stage) */}
        <g transform="translate(972, 898)">
          <GoldenTrophyIllustration width={138} height={148} />
        </g>

        {/* 5. Lower Information Pill Bar */}
        <g filter={`url(#${uid}-softShadow)`}>
          <rect
            x="76"
            y="1102"
            width="905"
            height="124"
            rx="34"
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth="2.5"
          />
          <line x1="476" y1="1126" x2="476" y2="1202" stroke="#cbd5e1" strokeWidth="2.5" />

          {/* Left: Classroom */}
          <g transform="translate(116, 1140)">
            <circle cx="24" cy="18" r="9" fill="#f59e0b" />
            <path d="M8 42C8 33 15 29 24 29C33 29 40 33 40 42" stroke="#f59e0b" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <circle cx="42" cy="20" r="6.5" fill="#fbbf24" />
            <circle cx="6" cy="20" r="6.5" fill="#fbbf24" />
          </g>
          <text x="178" y="1156" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="20" fontWeight="600" fill="#475569">
            Classroom:
          </text>
          <text x="178" y="1192" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="28" fontWeight="900" fill="#0f172a">
            {classroomDisplay}
          </text>

          {/* Right: Leaderboard Period */}
          <g transform="translate(512, 1140)">
            <rect x="4" y="8" width="40" height="36" rx="7" fill="none" stroke="#f59e0b" strokeWidth="3.8" />
            <path d="M4 20H44M15 3V12M33 3V12" stroke="#f59e0b" strokeWidth="3.8" strokeLinecap="round" />
            <circle cx="16" cy="29" r="2.8" fill="#fbbf24" />
            <circle cx="24" cy="29" r="2.8" fill="#fbbf24" />
            <circle cx="32" cy="29" r="2.8" fill="#fbbf24" />
          </g>
          <text x="574" y="1156" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="20" fontWeight="600" fill="#475569">
            Leaderboard Period:
          </text>
          <text x="574" y="1192" fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif" fontSize="27" fontWeight="900" fill="#0f172a">
            {periodDisplay}
          </text>
        </g>

        {/* 6. Ornate Gold Achievement Seal (Cleanly positioned at lower right) */}
        <g transform="translate(924, 1032)" filter={`url(#${uid}-softShadow)`}>
          <GoldAchievementSeal width={205} height={245} />
        </g>

        {/* 7. Bottom Motivational Message & Footer */}
        <path d="M235 1296L240 1308 252 1313 240 1318 235 1330 230 1318 218 1313 230 1308Z" fill="#fbbf24" />
        <path d="M895 1296L900 1308 912 1313 900 1318 895 1330 890 1318 878 1313 890 1308Z" fill="#fbbf24" />

        <text
          x="565"
          y="1306"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
          fontSize="28"
          fontWeight="800"
          fill="#0f172a"
        >
          Keep learning, keep growing, and
        </text>
        <text
          x="565"
          y="1344"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
          fontSize="28"
          fontWeight="800"
          fill="#0f172a"
        >
          reach even greater heights!
        </text>

        <text
          x="600"
          y="1456"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
          fontSize="16"
          fontWeight="800"
          fill="#ffffff"
          letterSpacing="2"
          opacity="0.94"
        >
          EDTECHRA DIGITAL CLASSROOM
        </text>
      </g>
    </svg>
  );
};
