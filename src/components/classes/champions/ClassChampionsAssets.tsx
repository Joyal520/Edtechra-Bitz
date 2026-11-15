import React, { useId } from 'react';

export interface SvgAssetProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export const GoldCrownIllustration: React.FC<SvgAssetProps> = ({
  className = 'w-full h-full',
  width,
  height,
}) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      viewBox="0 0 120 84"
      width={width}
      height={height}
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={`${uid}-crownFront`} x1="12" y1="18" x2="108" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff7bc" />
          <stop offset="32%" stopColor="#fbbf24" />
          <stop offset="72%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id={`${uid}-crownBack`} x1="24" y1="20" x2="96" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <radialGradient id={`${uid}-gemRed`} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fda4af" />
          <stop offset="50%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#881337" />
        </radialGradient>
      </defs>
      <path d="M24 58L34 28L52 46L60 22L68 46L86 28L96 58Z" fill={`url(#${uid}-crownBack)`} />
      <path
        d="M16 64L10 26L36 44L60 14L84 44L110 26L104 64C104 68 84 72 60 72C36 72 16 68 16 64Z"
        fill={`url(#${uid}-crownFront)`}
        stroke="#92400e"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M17 61C32 65 88 65 103 61L101 70C84 74 36 74 19 70Z"
        fill="#d97706"
        opacity="0.7"
      />
      <path d="M20 34L35 46L59 18" stroke="#fef9c3" strokeWidth="2.5" strokeLinecap="round" opacity="0.78" />
      <circle cx="10" cy="24" r="5" fill="#fde047" stroke="#92400e" strokeWidth="1.6" />
      <circle cx="60" cy="12" r="6" fill="#fef08a" stroke="#92400e" strokeWidth="1.6" />
      <circle cx="110" cy="24" r="5" fill="#fde047" stroke="#92400e" strokeWidth="1.6" />
      <circle cx="60" cy="52" r="6.5" fill={`url(#${uid}-gemRed)`} stroke="#fef08a" strokeWidth="2" />
      <circle cx="38" cy="54" r="3.8" fill="#38bdf8" stroke="#fef08a" strokeWidth="1.5" />
      <circle cx="82" cy="54" r="3.8" fill="#38bdf8" stroke="#fef08a" strokeWidth="1.5" />
    </svg>
  );
};

export const GoldLaurelSprig: React.FC<
  SvgAssetProps & { side?: 'left' | 'right' }
> = ({ side = 'left', className = 'w-full h-full', width, height }) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      viewBox="0 0 80 120"
      width={width}
      height={height}
      fill="none"
      aria-hidden="true"
      className={className}
      style={side === 'right' ? { transform: 'scaleX(-1)' } : undefined}
    >
      <defs>
        <linearGradient id={`${uid}-leafGold`} x1="10" y1="10" x2="70" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <path
        d="M52 110C30 88 22 54 34 12"
        stroke="#d97706"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {[
        { cx: 33, cy: 14, r: -10 },
        { cx: 24, cy: 30, r: -35 },
        { cx: 40, cy: 34, r: 28 },
        { cx: 20, cy: 50, r: -42 },
        { cx: 38, cy: 54, r: 24 },
        { cx: 22, cy: 70, r: -48 },
        { cx: 40, cy: 74, r: 22 },
        { cx: 30, cy: 90, r: -52 },
        { cx: 48, cy: 94, r: 16 },
      ].map((leaf, i) => (
        <ellipse
          key={i}
          cx={leaf.cx}
          cy={leaf.cy}
          rx="11"
          ry="5.5"
          transform={`rotate(${leaf.r} ${leaf.cx} ${leaf.cy})`}
          fill={`url(#${uid}-leafGold)`}
          stroke="#92400e"
          strokeWidth="1.2"
        />
      ))}
    </svg>
  );
};

export const PodiumLeavesDecor: React.FC<
  SvgAssetProps & { side?: 'left' | 'right' }
> = ({ side = 'left', className = 'w-full h-full', width, height }) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      viewBox="0 0 110 150"
      width={width}
      height={height}
      fill="none"
      aria-hidden="true"
      className={className}
      style={side === 'right' ? { transform: 'scaleX(-1)' } : undefined}
    >
      <defs>
        <linearGradient id={`${uid}-leafGreen`} x1="10" y1="15" x2="95" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="45%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <path d="M84 142C48 118 20 82 14 26C48 40 78 78 88 136Z" fill="#16a34a" />
      <path d="M90 144C62 114 44 74 48 12C76 34 94 76 94 140Z" fill={`url(#${uid}-leafGreen)`} />
      <path d="M86 144C52 132 18 110 8 76C36 74 68 96 90 138Z" fill="#4ade80" />
      <path d="M52 24C60 66 72 104 88 138" stroke="#dcfce7" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
      <path d="M14 82C38 98 62 116 86 138" stroke="#dcfce7" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
};

export const BooksAndGradCapIllustration: React.FC<SvgAssetProps> = ({
  className = 'w-full h-full',
  width,
  height,
}) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      viewBox="0 0 180 150"
      width={width}
      height={height}
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={`${uid}-purpleBook`} x1="16" y1="100" x2="150" y2="136" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#5b21b6" />
        </linearGradient>
        <linearGradient id={`${uid}-goldBook`} x1="22" y1="74" x2="144" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id={`${uid}-gradCap`} x1="22" y1="14" x2="154" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      <ellipse cx="90" cy="138" rx="76" ry="9" fill="#312e81" opacity="0.18" />
      <path d="M14 106L34 94H162L144 108H14Z" fill="#a78bfa" />
      <rect x="14" y="106" width="130" height="28" rx="6" fill={`url(#${uid}-purpleBook)`} />
      <rect x="26" y="111" width="114" height="18" rx="3" fill="#fef3c7" />
      <path d="M26 117H138M26 123H138" stroke="#fde68a" strokeWidth="1.5" />
      <path d="M24 78L44 68H154L138 80H24Z" fill="#fde047" />
      <rect x="24" y="78" width="116" height="26" rx="5" fill={`url(#${uid}-goldBook)`} />
      <rect x="34" y="83" width="102" height="16" rx="3" fill="#fffbeb" />
      <path d="M52 50V66C52 72 68 77 88 77C108 77 124 72 124 66V50Z" fill="#1e293b" />
      <path d="M88 18L22 40L88 60L154 40L88 18Z" fill={`url(#${uid}-gradCap)`} />
      <path d="M88 21L34 40L88 56L142 40L88 21Z" fill="#475569" opacity="0.35" />
      <circle cx="88" cy="39" r="4" fill="#fbbf24" />
      <path d="M88 39L122 49V69" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M117 69H127L129 82H115L117 69Z" fill="#fbbf24" />
    </svg>
  );
};

export const GoldenTrophyIllustration: React.FC<SvgAssetProps> = ({
  className = 'w-full h-full',
  width,
  height,
}) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      viewBox="0 0 130 140"
      width={width}
      height={height}
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={`${uid}-cupGold`} x1="26" y1="18" x2="104" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="35%" stopColor="#fbbf24" />
          <stop offset="75%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <ellipse cx="65" cy="130" rx="38" ry="7" fill="#312e81" opacity="0.18" />
      <path d="M34 30H18C12 30 12 62 36 64" stroke="#f59e0b" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M96 30H112C118 30 118 62 94 64" stroke="#d97706" strokeWidth="7" strokeLinecap="round" fill="none" />
      <rect x="57" y="82" width="16" height="22" rx="3" fill="#d97706" />
      <ellipse cx="65" cy="104" rx="22" ry="6" fill="#fbbf24" />
      <path d="M36 108H94L98 126H32L36 108Z" fill={`url(#${uid}-cupGold)`} stroke="#92400e" strokeWidth="2" />
      <rect x="44" y="114" width="42" height="7" rx="2" fill="#92400e" opacity="0.35" />
      <path
        d="M30 20H100L94 58C92 74 79 86 65 86C51 86 38 74 36 58L30 20Z"
        fill={`url(#${uid}-cupGold)`}
        stroke="#b45309"
        strokeWidth="2"
      />
      <ellipse cx="65" cy="20" rx="36" ry="6.5" fill="#fef08a" stroke="#b45309" strokeWidth="2" />
      <path d="M40 30L43 60" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.65" />
      <path
        d="M65 36L69.2 44.6L78.6 46L71.8 52.6L73.4 62L65 57.5L56.6 62L58.2 52.6L51.4 46L60.8 44.6Z"
        fill="#fef9c3"
        stroke="#b45309"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const GoldAchievementSeal: React.FC<SvgAssetProps> = ({
  className = 'w-full h-full',
  width,
  height,
}) => {
  const uid = useId().replace(/:/g, '');
  const pts: string[] = [];
  const count = 24;
  for (let i = 0; i < count * 2; i += 1) {
    const angle = (i * Math.PI) / count;
    const r = i % 2 === 0 ? 78 : 70;
    const x = 90 + r * Math.cos(angle);
    const y = 84 + r * Math.sin(angle);
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  const sealPath = `${pts.join(' ')}Z`;

  return (
    <svg
      viewBox="0 0 180 215"
      width={width}
      height={height}
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={`${uid}-ribbonLeft`} x1="40" y1="125" x2="72" y2="205" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id={`${uid}-ribbonRight`} x1="108" y1="125" x2="140" y2="205" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
        <radialGradient id={`${uid}-sealGold`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="40%" stopColor="#fbbf24" />
          <stop offset="80%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
      </defs>
      <path d="M54 134L36 205L64 192L82 208L88 140Z" fill={`url(#${uid}-ribbonLeft)`} />
      <path d="M126 134L144 205L116 192L98 208L92 140Z" fill={`url(#${uid}-ribbonRight)`} />
      <path d={sealPath} fill={`url(#${uid}-sealGold)`} stroke="#92400e" strokeWidth="2.2" />
      <circle cx="90" cy="84" r="59" fill="#f59e0b" stroke="#fef08a" strokeWidth="2.5" />
      <circle cx="90" cy="84" r="50" fill={`url(#${uid}-sealGold)`} stroke="#b45309" strokeWidth="2" />
      {/* Mini Laurel Arcs inside seal */}
      <path d="M56 108C45 94 45 72 56 58" stroke="#fef08a" strokeWidth="3.2" strokeLinecap="round" opacity="0.85" />
      <path d="M124 108C135 94 135 72 124 58" stroke="#fef08a" strokeWidth="3.2" strokeLinecap="round" opacity="0.85" />
      <path
        d="M90 48L99.5 67.3L120.8 70.4L105.4 85.4L109 106.6L90 96.6L71 106.6L74.6 85.4L59.2 70.4L80.5 67.3Z"
        fill="#fef08a"
        stroke="#b45309"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M90 52L96 71L90 80L72 72Z" fill="#ffffff" opacity="0.35" />
    </svg>
  );
};
