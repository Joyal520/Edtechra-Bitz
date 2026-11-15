import React from 'react';

const INK = '#221f26';

/**
 * Friendly pink bean mascot wearing a red superhero cape (Left banner hero).
 */
export const MascotCapeBean: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 180 160" fill="none" aria-hidden="true" className={className}>
    {/* Soft ground shadow */}
    <ellipse cx="92" cy="146" rx="46" ry="8" fill="#d9c89e" opacity="0.45" />

    {/* Flowing red superhero cape behind */}
    <path
      d="M72 64C44 74 22 96 14 122C28 124 44 121 56 128C68 120 76 112 82 104Z"
      fill="#ef4444"
      stroke={INK}
      strokeWidth="3.5"
      strokeLinejoin="round"
    />
    <path
      d="M68 74C46 84 30 100 22 118"
      stroke="#b91c1c"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.55"
    />

    {/* Cape collar */}
    <path
      d="M74 62C88 68 106 68 120 60"
      stroke="#dc2626"
      strokeWidth="6"
      strokeLinecap="round"
    />

    {/* Legs & blue sneakers */}
    <path d="M84 120V140M108 120V140" stroke={INK} strokeWidth="6" strokeLinecap="round" />
    <ellipse cx="79" cy="143" rx="12" ry="5.5" fill="#3b82f6" stroke={INK} strokeWidth="2.5" />
    <ellipse cx="113" cy="143" rx="12" ry="5.5" fill="#3b82f6" stroke={INK} strokeWidth="2.5" />

    {/* Left arm */}
    <path
      d="M68 86C54 94 52 106 60 112"
      stroke={INK}
      strokeWidth="6"
      strokeLinecap="round"
    />

    {/* Bean body */}
    <path
      d="M96 34C124 34 134 62 130 92C126 118 114 126 96 126C78 126 66 118 62 92C58 62 68 34 96 34Z"
      fill="#f9a8c9"
      stroke={INK}
      strokeWidth="3.5"
      strokeLinejoin="round"
    />
    {/* Soft highlight on bean */}
    <path
      d="M78 46C72 56 70 70 71 84"
      stroke="#ffd6e7"
      strokeWidth="5"
      strokeLinecap="round"
      opacity="0.85"
    />

    {/* Raised right arm (heroic fist) */}
    <path
      d="M128 84C144 78 150 64 146 54"
      stroke={INK}
      strokeWidth="6"
      strokeLinecap="round"
    />
    <circle cx="146" cy="52" r="6" fill="#f9a8c9" stroke={INK} strokeWidth="3" />

    {/* Happy eyes */}
    <ellipse cx="86" cy="68" rx="4.2" ry="5.2" fill={INK} />
    <ellipse cx="108" cy="68" rx="4.2" ry="5.2" fill={INK} />
    <circle cx="84.8" cy="66" r="1.6" fill="#ffffff" />
    <circle cx="106.8" cy="66" r="1.6" fill="#ffffff" />

    {/* Rosy cheeks */}
    <ellipse cx="76" cy="77" rx="5.5" ry="3" fill="#f472b6" opacity="0.55" />
    <ellipse cx="117" cy="77" rx="5.5" ry="3" fill="#f472b6" opacity="0.55" />

    {/* Open cheerful smile */}
    <path
      d="M88 82C92 92 104 92 108 82Z"
      fill="#9f1239"
      stroke={INK}
      strokeWidth="2.8"
      strokeLinejoin="round"
    />
    <path d="M93 88C96 86 100 86 103 88" stroke="#fb7185" strokeWidth="2.5" strokeLinecap="round" />

    {/* Motion/joy accents */}
    <path d="M40 50L48 56M46 38L51 46M152 38L146 46" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/**
 * Card 1 (Yellow): Bean character with red cape holding a sword + sparkles.
 */
export const CardSwordBean: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 120 150" fill="none" aria-hidden="true" className={className}>
    {/* Sparkles */}
    <path d="M24 26L27 33 34 36 27 39 24 46 21 39 14 36 21 33Z" fill="#ffffff" stroke={INK} strokeWidth="1.5" />
    <path d="M96 22L98 27 103 29 98 31 96 36 94 31 89 29 94 27Z" fill="#ffffff" stroke={INK} strokeWidth="1.5" />
    <path d="M20 108L22 112 26 114 22 116 20 120 18 116 14 114 18 112Z" fill="#fef08a" stroke={INK} strokeWidth="1.5" />

    {/* Red cape */}
    <path
      d="M44 76C30 88 24 106 22 120C34 120 44 116 52 112Z"
      fill="#ef4444"
      stroke={INK}
      strokeWidth="2.8"
      strokeLinejoin="round"
    />

    {/* Sword held up */}
    <g transform="rotate(14 84 62)">
      <path d="M80 14L86 6L92 14V72H80Z" fill="#e2e8f0" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M86 10V70" stroke="#ffffff" strokeWidth="2" />
      <rect x="72" y="70" width="28" height="7" rx="3" fill="#f59e0b" stroke={INK} strokeWidth="2.4" />
      <rect x="82" y="77" width="8" height="14" rx="2" fill="#78350f" stroke={INK} strokeWidth="2.2" />
    </g>

    {/* Legs & shoes */}
    <path d="M52 116V134M68 116V134" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
    <ellipse cx="49" cy="136" rx="9" ry="4.5" fill="#3b82f6" stroke={INK} strokeWidth="2" />
    <ellipse cx="71" cy="136" rx="9" ry="4.5" fill="#3b82f6" stroke={INK} strokeWidth="2" />

    {/* Bean body */}
    <path
      d="M60 44C82 44 88 68 85 94C82 114 73 120 60 120C47 120 38 114 35 94C32 68 38 44 60 44Z"
      fill="#f9a8c9"
      stroke={INK}
      strokeWidth="3"
    />
    {/* Eyes & smile */}
    <circle cx="53" cy="70" r="3.2" fill={INK} />
    <circle cx="68" cy="70" r="3.2" fill={INK} />
    <circle cx="52" cy="68.8" r="1.2" fill="#ffffff" />
    <circle cx="67" cy="68.8" r="1.2" fill="#ffffff" />
    <ellipse cx="46" cy="76" rx="4" ry="2.2" fill="#f472b6" opacity="0.6" />
    <ellipse cx="75" cy="76" rx="4" ry="2.2" fill="#f472b6" opacity="0.6" />
    <path d="M54 82Q60 89 67 82" stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" />

    {/* Arm holding sword */}
    <path d="M78 86Q86 84 85 78" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
    <path d="M40 84Q32 94 38 102" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
  </svg>
);

/**
 * Card 2 (Mint): Bean character with a glowing lightbulb.
 */
export const CardLightbulbBean: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 120 150" fill="none" aria-hidden="true" className={className}>
    {/* Lightbulb */}
    <circle cx="60" cy="30" r="18" fill="#fef08a" opacity="0.55" />
    <path
      d="M60 14C50 14 44 21 44 29C44 35 48 39 51 43H69C72 39 76 35 76 29C76 21 70 14 60 14Z"
      fill="#fde047"
      stroke={INK}
      strokeWidth="2.6"
      strokeLinejoin="round"
    />
    <rect x="53" y="43" width="14" height="6" rx="2" fill="#94a3b8" stroke={INK} strokeWidth="2.2" />
    <path d="M36 22L28 17M84 22L92 17M60 8V4" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />

    {/* Legs & shoes */}
    <path d="M52 116V134M68 116V134" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
    <ellipse cx="49" cy="136" rx="9" ry="4.5" fill="#3b82f6" stroke={INK} strokeWidth="2" />
    <ellipse cx="71" cy="136" rx="9" ry="4.5" fill="#3b82f6" stroke={INK} strokeWidth="2" />

    {/* Bean body */}
    <path
      d="M60 54C80 54 86 74 83 96C80 114 72 120 60 120C48 120 40 114 37 96C34 74 40 54 60 54Z"
      fill="#60a5fa"
      stroke={INK}
      strokeWidth="3"
    />
    <circle cx="53" cy="78" r="3" fill={INK} />
    <circle cx="67" cy="78" r="3" fill={INK} />
    <path d="M54 88Q60 94 66 88" stroke={INK} strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M40 90Q30 98 34 108M80 90Q90 80 86 70" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
  </svg>
);

/**
 * Card 3 (Blue): Bean character climbing a mountain with a red flag.
 */
export const CardMountainBean: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 120 150" fill="none" aria-hidden="true" className={className}>
    {/* Mountain */}
    <path
      d="M8 142L54 50L78 96L92 74L114 142Z"
      fill="#e0f2fe"
      stroke={INK}
      strokeWidth="2.8"
      strokeLinejoin="round"
    />
    <path d="M54 50L44 70L54 66L64 70Z" fill="#ffffff" />
    {/* Flag */}
    <path d="M54 50V26" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
    <path d="M54 26L78 33L54 40Z" fill="#ef4444" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />

    {/* Bean character */}
    <path d="M74 114V132M88 114V132" stroke={INK} strokeWidth="4.2" strokeLinecap="round" />
    <path
      d="M81 66C95 66 99 82 97 100C95 114 89 118 81 118C73 118 67 114 65 100C63 82 67 66 81 66Z"
      fill="#fb923c"
      stroke={INK}
      strokeWidth="2.8"
    />
    <circle cx="76" cy="84" r="2.6" fill={INK} />
    <circle cx="86" cy="84" r="2.6" fill={INK} />
    <path d="M77 92Q81 96 85 92" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
  </svg>
);

/**
 * Card 4 (Pink): Bean character holding a big pink heart.
 */
export const CardHeartBean: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 120 150" fill="none" aria-hidden="true" className={className}>
    {/* Floating heart */}
    <path
      d="M60 36C55 20 32 22 32 39C32 54 60 68 60 76C60 68 88 54 88 39C88 22 65 20 60 36Z"
      fill="#f43f5e"
      stroke={INK}
      strokeWidth="2.8"
      strokeLinejoin="round"
    />
    <path d="M42 36C42 32 45 29 49 29" stroke="#fda4af" strokeWidth="2.5" strokeLinecap="round" />

    {/* Bean */}
    <path d="M52 116V134M68 116V134" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
    <path
      d="M60 68C78 68 84 86 81 104C78 116 70 120 60 120C50 120 42 116 39 104C36 86 42 68 60 68Z"
      fill="#f9a8c9"
      stroke={INK}
      strokeWidth="2.8"
    />
    <circle cx="53" cy="88" r="2.8" fill={INK} />
    <circle cx="67" cy="88" r="2.8" fill={INK} />
    <path d="M55 96Q60 101 65 96" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />
  </svg>
);

/**
 * Card 5 (Lilac): Sleeping bean character with a crescent moon and stars.
 */
export const CardMoonBean: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 120 150" fill="none" aria-hidden="true" className={className}>
    {/* Crescent moon */}
    <path
      d="M78 18A20 20 0 1 0 102 44A16 16 0 0 1 78 18Z"
      fill="#fde047"
      stroke={INK}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path d="M28 30L30 35 35 37 30 39 28 44 26 39 21 37 26 35Z" fill="#ffffff" stroke={INK} strokeWidth="1.2" />

    {/* Bean */}
    <path d="M52 116V134M68 116V134" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
    <path
      d="M60 54C80 54 86 74 83 96C80 114 72 120 60 120C48 120 40 114 37 96C34 74 40 54 60 54Z"
      fill="#c4b5fd"
      stroke={INK}
      strokeWidth="2.8"
    />
    {/* Closed peaceful eyes */}
    <path d="M48 78Q53 83 58 78M62 78Q67 83 72 78" stroke={INK} strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M55 88Q60 93 65 88" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />
  </svg>
);
