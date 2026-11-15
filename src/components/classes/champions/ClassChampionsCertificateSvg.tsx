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
  /** Pre-resolved base64 data URL for /images/edtechra-classroom-logo.png (for clean canvas export) */
  logoUrl?: string;
  /** Map of rank (1|2|3) -> pre-resolved base64 data URL (or fallback to snapshot avatarUrl) */
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
    <path d="M210 430C226 420 232 438 248 428" stroke="#f59e0b" strokeWidth="9" strokeLinecap="round" fill="none" />
    <path d="M260 390C274 374 282 392 296 378" stroke="#6366f1" strokeWidth="8" strokeLinecap="round" fill="none" />
    <path d="M175 495C186 485 198 498 208 486" stroke="#ec4899" strokeWidth="7" strokeLinecap="round" fill="none" />
    <path d="M975 438C960 426 952 444 938 432" stroke="#f59e0b" strokeWidth="9" strokeLinecap="round" fill="none" />
    <path d="M920 395C906 382 898 400 882 386" stroke="#8b5cf6" strokeWidth="8" strokeLinecap="round" fill="none" />
    <path d="M1015 500C1002 488 992 502 978 492" stroke="#ec4899" strokeWidth="7" strokeLinecap="round" fill="none" />

    {/* Floating confetti squares/diamonds */}
    <rect x="200" y="545" width="12" height="12" rx="2" fill="#38bdf8" transform="rotate(24 206 551)" />
    <rect x="992" y="555" width="12" height="12" rx="2" fill="#fbbf24" transform="rotate(-18 998 561)" />
    <rect x="330" y="425" width="10" height="10" rx="2" fill="#ec4899" transform="rotate(35 335 430)" />
    <rect x="860" y="425" width="10" height="10" rx="2" fill="#3b82f6" transform="rotate(-30 865 430)" />

    {/* Gold & White 4-point sparkles */}
    <path d="M190 360L195 375 210 380 195 385 190 400 185 385 170 380 185 375Z" fill="#fbbf24" />
    <path d="M1010 365L1015 380 1030 385 1015 390 1010 405 1005 390 990 385 1005 380Z" fill="#fbbf24" />
    <path d="M452 380L456 390 466 394 456 398 452 408 448 398 438 394 448 390Z" fill="#fde047" />
    <path d="M748 380L752 390 762 394 752 398 748 408 744 398 734 394 744 390Z" fill="#fde047" />
    <path d="M118 595L122 606 133 610 122 614 118 625 114 614 103 610 114 606Z" fill="#ffffff" />
    <path d="M1082 595L1086 606 1097 610 1086 614 1082 625 1078 614 1067 610 1078 606Z" fill="#ffffff" />
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
    snapshot.classroomName.length > 26
      ? `${snapshot.classroomName.slice(0, 25)}…`
      : snapshot.classroomName;

  const periodDisplay =
    snapshot.periodLabel.length > 28
      ? `${snapshot.periodLabel.slice(0, 27)}…`
      : snapshot.periodLabel;

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 1200 1300"
      className={className}
      role="img"
      aria-label={`EdTechra Class Champions Achievement Certificate for ${snapshot.classroomName}`}
    >
      <defs>
        {/* Background sky gradient */}
        <linearGradient id={`${uid}-bgGrad`} x1="0" y1="0" x2="1200" y2="1300" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#eef5ff" />
          <stop offset="45%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8efff" />
        </linearGradient>

        {/* Sunburst radial glow behind podium */}
        <radialGradient id={`${uid}-sunGlow`} cx="50%" cy="46%" r="48%">
          <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.88" />
          <stop offset="45%" stopColor="#ede9fe" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* Gold border gradient */}
        <linearGradient id={`${uid}-goldFrame`} x1="0" y1="0" x2="1200" y2="1300" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="28%" stopColor="#fef08a" />
          <stop offset="55%" stopColor="#d97706" />
          <stop offset="80%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        {/* Ribbon gold */}
        <linearGradient id={`${uid}-ribbonGrad`} x1="180" y1="180" x2="1020" y2="290" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="25%" stopColor="#fde047" />
          <stop offset="50%" stopColor="#fef08a" />
          <stop offset="75%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>

        {/* Pillar 1 Gold */}
        <linearGradient id={`${uid}-podiumGold`} x1="468" y1="620" x2="732" y2="895" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="30%" stopColor="#fbbf24" />
          <stop offset="70%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>

        {/* Pillar 2 Silver */}
        <linearGradient id={`${uid}-podiumSilver`} x1="214" y1="672" x2="454" y2="895" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="35%" stopColor="#cbd5e1" />
          <stop offset="75%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>

        {/* Pillar 3 Bronze */}
        <linearGradient id={`${uid}-podiumBronze`} x1="746" y1="682" x2="986" y2="895" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fdba74" />
          <stop offset="35%" stopColor="#fb923c" />
          <stop offset="75%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#9a3412" />
        </linearGradient>

        {/* Stage base */}
        <linearGradient id={`${uid}-stageGold`} x1="120" y1="880" x2="1080" y2="950" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="28%" stopColor="#fde047" />
          <stop offset="50%" stopColor="#fef08a" />
          <stop offset="72%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        {/* Corner wave gradients */}
        <linearGradient id={`${uid}-cornerBlue`} x1="0" y1="0" x2="400" y2="300" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="55%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>

        <linearGradient id={`${uid}-digitalPill`} x1="530" y1="106" x2="776" y2="144" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0070e0" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>

        <filter id={`${uid}-softShadow`} x="-10%" y="-10%" width="120%" height="125%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#1e293b" floodOpacity="0.16" />
        </filter>

        {/* Clip paths for circular student avatars */}
        <clipPath id={`${uid}-clip1`}>
          <circle cx="600" cy="516" r="98" />
        </clipPath>
        <clipPath id={`${uid}-clip2`}>
          <circle cx="334" cy="586" r="82" />
        </clipPath>
        <clipPath id={`${uid}-clip3`}>
          <circle cx="866" cy="596" r="82" />
        </clipPath>
        <clipPath id={`${uid}-outerClip`}>
          <rect x="0" y="0" width="1200" height="1300" rx="28" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${uid}-outerClip)`}>
        {/* 1. Background Sky & Sunburst */}
        <rect x="0" y="0" width="1200" height="1300" fill={`url(#${uid}-bgGrad)`} />

        {/* Subtle geometric rays */}
        <g opacity="0.28">
          <polygon points="600,600 120,250 320,180" fill="#fef9c3" />
          <polygon points="600,600 440,140 580,120" fill="#fef08a" />
          <polygon points="600,600 660,120 820,150" fill="#fef9c3" />
          <polygon points="600,600 940,190 1120,290" fill="#fef08a" />
        </g>
        <circle cx="600" cy="590" r="460" fill={`url(#${uid}-sunGlow)`} />

        {/* Fluffy Background Clouds */}
        <path
          d="M0 680Q80 620 170 655Q230 610 310 660Q370 665 410 730L0 730Z"
          fill="#ffffff"
          opacity="0.72"
        />
        <path
          d="M1200 660Q1100 600 1010 645Q940 595 860 655Q810 665 780 730L1200 730Z"
          fill="#ffffff"
          opacity="0.72"
        />

        {/* Corner Accent Waves */}
        <path
          d="M0 0H265C205 68 150 112 72 152C38 170 15 202 0 245V0Z"
          fill={`url(#${uid}-cornerBlue)`}
          opacity="0.92"
        />
        <path
          d="M1200 0H935C995 68 1050 112 1128 152C1162 170 1185 202 1200 245V0Z"
          fill={`url(#${uid}-cornerBlue)`}
          opacity="0.92"
        />

        {/* Bottom Blue/Purple Ribbon Wave */}
        <path
          d="M0 1190Q290 1255 620 1218Q940 1182 1200 1210V1300H0V1190Z"
          fill="#38bdf8"
          opacity="0.35"
        />
        <path
          d="M0 1218Q320 1278 650 1236Q960 1198 1200 1236V1300H0V1218Z"
          fill={`url(#${uid}-cornerBlue)`}
        />

        {/* Ornate Double Gold Certificate Border */}
        <rect
          x="18"
          y="18"
          width="1164"
          height="1264"
          rx="26"
          fill="none"
          stroke={`url(#${uid}-goldFrame)`}
          strokeWidth="12"
        />
        <rect
          x="36"
          y="36"
          width="1128"
          height="1228"
          rx="18"
          fill="none"
          stroke="#fbbf24"
          strokeWidth="2.5"
          opacity="0.7"
        />

        {/* 2. Top Branding: Actual EdTechra Logo + EdTechra + Digital Classroom */}
        <g transform="translate(0, 4)">
          <image
            href={logoUrl}
            xlinkHref={logoUrl}
            x="408"
            y="42"
            width="102"
            height="102"
            preserveAspectRatio="xMidYMid meet"
          />
          <text
            x="524"
            y="95"
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
            y="107"
            width="244"
            height="38"
            rx="19"
            fill={`url(#${uid}-digitalPill)`}
          />
          <text
            x="648"
            y="132"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
            fontSize="21"
            fontWeight="700"
            fill="#ffffff"
          >
            Digital Classroom
          </text>
        </g>

        {/* Flanking Laurel Sprigs */}
        <g transform="translate(242, 72) scale(1.2)">
          <GoldLaurelSprig side="left" className="w-[80px] h-[120px]" />
        </g>
        <g transform="translate(862, 72) scale(1.2)">
          <GoldLaurelSprig side="right" className="w-[80px] h-[120px]" />
        </g>

        {/* 3. Large Golden Ribbon Banner: CLASS CHAMPIONS */}
        <g filter={`url(#${uid}-softShadow)`}>
          {/* Left & Right folded ribbon tails */}
          <path d="M110 218L228 202L242 292L122 308L154 260Z" fill="#d97706" stroke="#92400e" strokeWidth="2.2" />
          <path d="M1090 218L972 202L958 292L1078 308L1046 260Z" fill="#d97706" stroke="#92400e" strokeWidth="2.2" />

          {/* Main curved ribbon body */}
          <path
            d="M178 194Q600 144 1022 194L1002 288Q600 240 198 288Z"
            fill={`url(#${uid}-ribbonGrad)`}
            stroke="#b45309"
            strokeWidth="3"
          />
          {/* Inner highlight stroke */}
          <path
            d="M196 204Q600 156 1004 204"
            stroke="#fef9c3"
            strokeWidth="3"
            fill="none"
            opacity="0.8"
          />
        </g>

        {/* Ribbon Stars */}
        <path
          d="M236 218L243 234L260 236L247 248L251 264L236 255L221 264L225 248L212 236L229 234Z"
          fill="#fbbf24"
          stroke="#b45309"
          strokeWidth="2"
        />
        <path
          d="M964 218L971 234L988 236L975 248L979 264L964 255L949 264L953 248L940 236L957 234Z"
          fill="#fbbf24"
          stroke="#b45309"
          strokeWidth="2"
        />

        {/* Ribbon Headline */}
        <text
          x="600"
          y="246"
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
        <line x1="255" y1="312" x2="345" y2="312" stroke="#64748b" strokeWidth="2" opacity="0.55" />
        <text
          x="600"
          y="319"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
          fontSize="21"
          fontWeight="800"
          fill="#1e3a8a"
          letterSpacing="3.5"
        >
          TOP 3 PERFORMERS IN THIS CLASSROOM
        </text>
        <line x1="855" y1="312" x2="945" y2="312" stroke="#64748b" strokeWidth="2" opacity="0.55" />

        {/* Confetti & Sparkles */}
        <ConfettiAndSparkles />

        {/* 4. Centre Podium & Stage */}
        {/* Botanical leaves behind podium */}
        <g transform="translate(115, 705) scale(1.25)">
          <PodiumLeavesDecor side="left" className="w-[110px] h-[150px]" />
        </g>
        <g transform="translate(945, 705) scale(1.25)">
          <PodiumLeavesDecor side="right" className="w-[110px] h-[150px]" />
        </g>

        {/* Illuminated Golden Stage Base */}
        <g filter={`url(#${uid}-softShadow)`}>
          <ellipse cx="600" cy="912" rx="486" ry="44" fill="#b45309" />
          <ellipse cx="600" cy="900" rx="486" ry="40" fill={`url(#${uid}-stageGold)`} stroke="#fef08a" strokeWidth="2.5" />
          <ellipse cx="600" cy="894" rx="442" ry="26" fill="#fef9c3" opacity="0.32" />
        </g>

        {/* Stage rim lights */}
        {[220, 310, 410, 505, 600, 695, 790, 890, 980].map((lx, idx) => {
          const ly = 928 + (idx === 4 ? 7 : Math.abs(idx - 4) <= 1 ? 5 : 0);
          return <circle key={lx} cx={lx} cy={ly} r="5.5" fill="#fef9c3" opacity="0.92" />;
        })}

        {/* -------- SECOND PLACE (LEFT) -------- */}
        <g filter={`url(#${uid}-softShadow)`}>
          <rect
            x="214"
            y="674"
            width="240"
            height="226"
            rx="16"
            fill={`url(#${uid}-podiumSilver)`}
          />
          <ellipse cx="334" cy="674" rx="120" ry="18" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
          {/* Large Rank 2 */}
          <text
            x="334"
            y="745"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
            fontSize="66"
            fontWeight="900"
            fill="#ffffff"
          >
            2
          </text>
          {/* Nameplate */}
          <rect x="234" y="766" width="200" height="106" rx="20" fill="#ffffff" fillOpacity="0.94" stroke="#e2e8f0" strokeWidth="2" />
          {secondNameLines[1] ? (
            <>
              <text
                x="334"
                y="798"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
                fontSize="22"
                fontWeight="800"
                fill="#0f172a"
              >
                {secondNameLines[0]}
              </text>
              <text
                x="334"
                y="824"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
                fontSize="22"
                fontWeight="800"
                fill="#0f172a"
              >
                {secondNameLines[1]}
              </text>
              <text
                x="334"
                y="856"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
                fontSize="23"
                fontWeight="900"
                fill="#1d4ed8"
              >
                {second ? `${second.points.toLocaleString()} XP` : '— XP'}
              </text>
            </>
          ) : (
            <>
              <text
                x="334"
                y="808"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
                fontSize="24"
                fontWeight="800"
                fill="#0f172a"
              >
                {secondNameLines[0]}
              </text>
              <text
                x="334"
                y="848"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
                fontSize="24"
                fontWeight="900"
                fill="#1d4ed8"
              >
                {second ? `${second.points.toLocaleString()} XP` : '— XP'}
              </text>
            </>
          )}
        </g>

        {/* Second Place Avatar */}
        <g filter={`url(#${uid}-softShadow)`}>
          <circle cx="334" cy="586" r="91" fill="#94a3b8" />
          <circle cx="334" cy="586" r="87" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="4" />
          <g clipPath={`url(#${uid}-clip2)`}>
            <rect x="252" y="504" width="164" height="164" fill="#eff6ff" />
            {secondAvatar ? (
              <image
                href={secondAvatar}
                xlinkHref={secondAvatar}
                x="252"
                y="504"
                width="164"
                height="164"
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <text
                x="334"
                y="605"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
                fontSize="54"
                fontWeight="900"
                fill="#334155"
              >
                {getInitials(second?.name || '2')}
              </text>
            )}
          </g>
        </g>

        {/* -------- THIRD PLACE (RIGHT) -------- */}
        <g filter={`url(#${uid}-softShadow)`}>
          <rect
            x="746"
            y="684"
            width="240"
            height="216"
            rx="16"
            fill={`url(#${uid}-podiumBronze)`}
          />
          <ellipse cx="866" cy="684" rx="120" ry="18" fill="#fed7aa" stroke="#fb923c" strokeWidth="2" />
          {/* Large Rank 3 */}
          <text
            x="866"
            y="752"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
            fontSize="66"
            fontWeight="900"
            fill="#ffffff"
          >
            3
          </text>
          {/* Nameplate */}
          <rect x="766" y="772" width="200" height="104" rx="20" fill="#ffffff" fillOpacity="0.94" stroke="#fed7aa" strokeWidth="2" />
          {thirdNameLines[1] ? (
            <>
              <text
                x="866"
                y="803"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
                fontSize="22"
                fontWeight="800"
                fill="#0f172a"
              >
                {thirdNameLines[0]}
              </text>
              <text
                x="866"
                y="828"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
                fontSize="22"
                fontWeight="800"
                fill="#0f172a"
              >
                {thirdNameLines[1]}
              </text>
              <text
                x="866"
                y="859"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
                fontSize="23"
                fontWeight="900"
                fill="#1d4ed8"
              >
                {third ? `${third.points.toLocaleString()} XP` : '— XP'}
              </text>
            </>
          ) : (
            <>
              <text
                x="866"
                y="813"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
                fontSize="24"
                fontWeight="800"
                fill="#0f172a"
              >
                {thirdNameLines[0]}
              </text>
              <text
                x="866"
                y="852"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
                fontSize="24"
                fontWeight="900"
                fill="#1d4ed8"
              >
                {third ? `${third.points.toLocaleString()} XP` : '— XP'}
              </text>
            </>
          )}
        </g>

        {/* Third Place Avatar */}
        <g filter={`url(#${uid}-softShadow)`}>
          <circle cx="866" cy="596" r="91" fill="#ea580c" />
          <circle cx="866" cy="596" r="87" fill="#fff7ed" stroke="#fdba74" strokeWidth="4" />
          <g clipPath={`url(#${uid}-clip3)`}>
            <rect x="784" y="514" width="164" height="164" fill="#fff7ed" />
            {thirdAvatar ? (
              <image
                href={thirdAvatar}
                xlinkHref={thirdAvatar}
                x="784"
                y="514"
                width="164"
                height="164"
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <text
                x="866"
                y="615"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
                fontSize="54"
                fontWeight="900"
                fill="#9a3412"
              >
                {getInitials(third?.name || '3')}
              </text>
            )}
          </g>
        </g>

        {/* -------- FIRST PLACE (CENTER, ELEVATED) -------- */}
        <g filter={`url(#${uid}-softShadow)`}>
          <rect
            x="468"
            y="622"
            width="264"
            height="282"
            rx="18"
            fill={`url(#${uid}-podiumGold)`}
          />
          <ellipse cx="600" cy="622" rx="132" ry="20" fill="#fef9c3" stroke="#fbbf24" strokeWidth="2.5" />
          {/* Golden laurel sprigs flanking #1 */}
          <g transform="translate(502, 646) scale(0.85)">
            <GoldLaurelSprig side="left" className="w-[80px] h-[120px]" />
          </g>
          <g transform="translate(630, 646) scale(0.85)">
            <GoldLaurelSprig side="right" className="w-[80px] h-[120px]" />
          </g>
          {/* Large Rank 1 */}
          <text
            x="600"
            y="724"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
            fontSize="82"
            fontWeight="900"
            fill="#ffffff"
            stroke="#b45309"
            strokeWidth="3"
            paintOrder="stroke fill"
          >
            1
          </text>
          {/* Nameplate */}
          <rect x="488" y="752" width="224" height="118" rx="22" fill="#fffdf5" stroke="#fde047" strokeWidth="2.5" />
          {firstNameLines[1] ? (
            <>
              <text
                x="600"
                y="788"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
                fontSize="24"
                fontWeight="800"
                fill="#0f172a"
              >
                {firstNameLines[0]}
              </text>
              <text
                x="600"
                y="816"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
                fontSize="24"
                fontWeight="800"
                fill="#0f172a"
              >
                {firstNameLines[1]}
              </text>
              <text
                x="600"
                y="852"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
                fontSize="27"
                fontWeight="900"
                fill="#b45309"
              >
                {first ? `${first.points.toLocaleString()} XP` : '— XP'}
              </text>
            </>
          ) : (
            <>
              <text
                x="600"
                y="800"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
                fontSize="27"
                fontWeight="800"
                fill="#0f172a"
              >
                {firstNameLines[0]}
              </text>
              <text
                x="600"
                y="846"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
                fontSize="28"
                fontWeight="900"
                fill="#b45309"
              >
                {first ? `${first.points.toLocaleString()} XP` : '— XP'}
              </text>
            </>
          )}
        </g>

        {/* First Place Avatar & Crown */}
        <g filter={`url(#${uid}-softShadow)`}>
          <circle cx="600" cy="516" r="110" fill="#f59e0b" />
          <circle cx="600" cy="516" r="105" fill="#fef9c3" stroke="#fbbf24" strokeWidth="5" />
          <g clipPath={`url(#${uid}-clip1)`}>
            <rect x="502" y="418" width="196" height="196" fill="#fefce8" />
            {firstAvatar ? (
              <image
                href={firstAvatar}
                xlinkHref={firstAvatar}
                x="502"
                y="418"
                width="196"
                height="196"
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <text
                x="600"
                y="538"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
                fontSize="66"
                fontWeight="900"
                fill="#92400e"
              >
                {getInitials(first?.name || '1')}
              </text>
            )}
          </g>
        </g>
        <g transform="translate(525, 342)">
          <GoldCrownIllustration className="w-[150px] h-[105px]" />
        </g>

        {/* Books & Graduation Cap (Bottom Left of Podium) */}
        <g transform="translate(48, 795)">
          <BooksAndGradCapIllustration className="w-[190px] h-[155px]" />
        </g>

        {/* Golden Trophy (Bottom Right of Podium) */}
        <g transform="translate(972, 790)">
          <GoldenTrophyIllustration className="w-[150px] h-[160px]" />
        </g>

        {/* 5. Lower Information Pill Bar */}
        <g filter={`url(#${uid}-softShadow)`}>
          <rect
            x="84"
            y="990"
            width="926"
            height="118"
            rx="34"
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth="2.5"
          />
          {/* Vertical Divider */}
          <line x1="484" y1="1014" x2="484" y2="1084" stroke="#cbd5e1" strokeWidth="2.5" />

          {/* Left: Classroom */}
          <g transform="translate(122, 1024)">
            <circle cx="24" cy="18" r="9" fill="#f59e0b" />
            <path d="M8 42C8 33 15 29 24 29C33 29 40 33 40 42" stroke="#f59e0b" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <circle cx="42" cy="20" r="6.5" fill="#fbbf24" />
            <circle cx="6" cy="20" r="6.5" fill="#fbbf24" />
          </g>
          <text
            x="184"
            y="1040"
            fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
            fontSize="20"
            fontWeight="600"
            fill="#475569"
          >
            Classroom:
          </text>
          <text
            x="184"
            y="1076"
            fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
            fontSize="28"
            fontWeight="900"
            fill="#0f172a"
          >
            {classroomDisplay}
          </text>

          {/* Right: Leaderboard Period */}
          <g transform="translate(520, 1024)">
            <rect x="4" y="8" width="40" height="36" rx="7" fill="none" stroke="#f59e0b" strokeWidth="3.8" />
            <path d="M4 20H44M15 3V12M33 3V12" stroke="#f59e0b" strokeWidth="3.8" strokeLinecap="round" />
            <circle cx="16" cy="29" r="2.8" fill="#fbbf24" />
            <circle cx="24" cy="29" r="2.8" fill="#fbbf24" />
            <circle cx="32" cy="29" r="2.8" fill="#fbbf24" />
          </g>
          <text
            x="582"
            y="1040"
            fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
            fontSize="20"
            fontWeight="600"
            fill="#475569"
          >
            Leaderboard Period:
          </text>
          <text
            x="582"
            y="1076"
            fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
            fontSize="27"
            fontWeight="900"
            fill="#0f172a"
          >
            {periodDisplay}
          </text>
        </g>

        {/* 6. Ornate Gold Achievement Seal (Overlapping lower right) */}
        <g transform="translate(925, 928)" filter={`url(#${uid}-softShadow)`}>
          <GoldAchievementSeal className="w-[215px] h-[255px]" />
        </g>

        {/* 7. Bottom Motivational Message & Footer */}
        <path d="M235 1165L240 1177 252 1182 240 1187 235 1199 230 1187 218 1182 230 1177Z" fill="#fbbf24" />
        <path d="M895 1165L900 1177 912 1182 900 1187 895 1199 890 1187 878 1182 890 1177Z" fill="#fbbf24" />

        <text
          x="565"
          y="1174"
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
          y="1210"
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
          y="1266"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif"
          fontSize="16"
          fontWeight="800"
          fill="#ffffff"
          letterSpacing="2"
          opacity="0.92"
        >
          EDTECHRA DIGITAL CLASSROOM
        </text>
      </g>
    </svg>
  );
};
