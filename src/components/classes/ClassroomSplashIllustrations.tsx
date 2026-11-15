import React from 'react';

export const SplashSparkle: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-4 h-4',
  color = '#ffffff',
}) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
    <path
      d="M12 1.5L14.3 9.7L22.5 12L14.3 14.3L12 22.5L9.7 14.3L1.5 12L9.7 9.7Z"
      fill={color}
    />
  </svg>
);

export const GraduationCapIcon: React.FC<{ className?: string }> = ({
  className = 'w-full h-full',
}) => (
  <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
    <defs>
      <linearGradient id="capTop" x1="8" y1="16" x2="56" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1d4ed8" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
      <linearGradient id="capBase" x1="20" y1="30" x2="44" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1e3a8a" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>
    {/* Cap base */}
    <path
      d="M19 32V42C19 46.5 24.8 50 32 50C39.2 50 45 46.5 45 42V32Z"
      fill="url(#capBase)"
    />
    {/* Cap mortarboard */}
    <path
      d="M32 14L6 26L32 38L58 26L32 14Z"
      fill="url(#capTop)"
    />
    <path
      d="M32 16L11 26L32 35.5L53 26L32 16Z"
      fill="#38bdf8"
      opacity="0.22"
    />
    {/* Gold tassel */}
    <path
      d="M49 28.5V41"
      stroke="#f59e0b"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
    <circle cx="49" cy="43" r="3" fill="#fbbf24" />
    <circle cx="32" cy="26" r="2.2" fill="#93c5fd" />
  </svg>
);

export const ProgrammingLaptopIcon: React.FC<{ className?: string }> = ({
  className = 'w-full h-full',
}) => (
  <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
    <defs>
      <linearGradient id="laptopScreen" x1="14" y1="16" x2="50" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    {/* Screen bezel */}
    <rect x="13" y="15" width="38" height="26" rx="4" fill="#4f46e5" />
    <rect x="16" y="18" width="32" height="20" rx="2.5" fill="url(#laptopScreen)" />
    {/* Code symbol </> */}
    <path
      d="M26 24.5L21.5 28L26 31.5M38 24.5L42.5 28L38 31.5M33.5 23L30.5 33"
      stroke="#ffffff"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Laptop base */}
    <path
      d="M9 43H55L51 49H13L9 43Z"
      fill="#a5b4fc"
    />
    <rect x="26" y="44.5" width="12" height="2" rx="1" fill="#6366f1" opacity="0.5" />
  </svg>
);

export const GlowingLightbulbIcon: React.FC<{ className?: string }> = ({
  className = 'w-full h-full',
}) => (
  <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
    <defs>
      <radialGradient id="bulbGlow" cx="50%" cy="42%" r="50%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="65%" stopColor="#facc15" />
        <stop offset="100%" stopColor="#eab308" />
      </radialGradient>
    </defs>
    {/* Light rays */}
    <path
      d="M32 7V11M14 15L17 18M50 15L47 18M9 30H13M51 30H55"
      stroke="#f59e0b"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
    {/* Bulb glass */}
    <path
      d="M32 14C22.6 14 16 20.8 16 29.4C16 34.8 19 39.2 22.8 42.3C24.2 43.4 25 45 25 46.6V47H39V46.6C39 45 39.8 43.4 41.2 42.3C45 39.2 48 34.8 48 29.4C48 20.8 41.4 14 32 14Z"
      fill="url(#bulbGlow)"
    />
    {/* Highlight */}
    <path
      d="M23 24C24.5 20.5 27.5 18.8 30.5 18.5"
      stroke="#ffffff"
      strokeWidth="2.6"
      strokeLinecap="round"
      opacity="0.85"
    />
    {/* Filament */}
    <path
      d="M27 32L30 35L32 31L34 35L37 32M32 35V45"
      stroke="#b45309"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Base */}
    <rect x="25" y="47" width="14" height="4" rx="2" fill="#94a3b8" />
    <rect x="27" y="51.5" width="10" height="3.5" rx="1.75" fill="#64748b" />
  </svg>
);

export const ScienceFlaskIcon: React.FC<{ className?: string }> = ({
  className = 'w-full h-full',
}) => (
  <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
    <defs>
      <linearGradient id="flaskLiquid" x1="18" y1="36" x2="46" y2="52" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#818cf8" />
      </linearGradient>
    </defs>
    {/* Flask neck & body */}
    <path
      d="M25 13H39V17H37V28L49.5 46.5C51.2 49 49.4 52.5 46.3 52.5H17.7C14.6 52.5 12.8 49 14.5 46.5L27 28V17H25V13Z"
      fill="#e0f2fe"
      stroke="#6366f1"
      strokeWidth="2.4"
      strokeLinejoin="round"
    />
    {/* Liquid inside */}
    <path
      d="M21.5 37H42.5L47.5 46C48.5 47.8 47.2 50 45.1 50H18.9C16.8 50 15.5 47.8 16.5 46L21.5 37Z"
      fill="url(#flaskLiquid)"
    />
    {/* Bubbles */}
    <circle cx="28" cy="43" r="2.2" fill="#ffffff" opacity="0.85" />
    <circle cx="36" cy="45.5" r="1.6" fill="#ffffff" opacity="0.75" />
    <circle cx="33" cy="39.5" r="1.4" fill="#ffffff" opacity="0.8" />
    {/* Glass shine */}
    <path d="M22 39L19 45" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
  </svg>
);

export const GrowingPlantIcon: React.FC<{ className?: string }> = ({
  className = 'w-full h-full',
}) => (
  <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
    <defs>
      <linearGradient id="leafLeft" x1="14" y1="22" x2="32" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#4ade80" />
        <stop offset="100%" stopColor="#16a34a" />
      </linearGradient>
      <linearGradient id="leafRight" x1="32" y1="18" x2="50" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#86efac" />
        <stop offset="100%" stopColor="#22c55e" />
      </linearGradient>
    </defs>
    {/* Soil mound */}
    <ellipse cx="32" cy="50" rx="14" ry="4" fill="#15803d" opacity="0.3" />
    {/* Stem */}
    <path
      d="M32 50V29"
      stroke="#16a34a"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
    {/* Left leaf */}
    <path
      d="M32 36C21 36 15 29 15 20C24 20 32 25 32 36Z"
      fill="url(#leafLeft)"
    />
    {/* Right leaf */}
    <path
      d="M32 31C43 31 49 24 49 15C40 15 32 20 32 31Z"
      fill="url(#leafRight)"
    />
    {/* Leaf veins */}
    <path d="M20 24L29 33M44 19L35 28" stroke="#dcfce7" strokeWidth="1.6" strokeLinecap="round" opacity="0.75" />
  </svg>
);

export const OpenGlowingBook: React.FC<{ className?: string }> = ({
  className = 'w-full h-full',
}) => (
  <svg viewBox="0 0 320 120" fill="none" aria-hidden="true" className={className}>
    <defs>
      <radialGradient id="bookRadiance" cx="50%" cy="62%" r="55%">
        <stop offset="0%" stopColor="#fef08a" stopOpacity="0.92" />
        <stop offset="45%" stopColor="#fde68a" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="bookCover" x1="20" y1="90" x2="300" y2="112" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1d4ed8" />
        <stop offset="50%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#1e40af" />
      </linearGradient>
      <linearGradient id="pageLeft" x1="34" y1="48" x2="160" y2="96" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fff7ed" />
        <stop offset="100%" stopColor="#ffffff" />
      </linearGradient>
      <linearGradient id="pageRight" x1="160" y1="48" x2="286" y2="96" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#fff7ed" />
      </linearGradient>
    </defs>

    {/* Radiating warm light from center */}
    <ellipse cx="160" cy="48" rx="110" ry="48" fill="url(#bookRadiance)" />

    {/* Outer blue hard cover */}
    <path
      d="M18 96L42 74H278L302 96C304 98 302.5 102 299 102H172C168 106 152 106 148 102H21C17.5 102 16 98 18 96Z"
      fill="url(#bookCover)"
    />

    {/* Page block thickness */}
    <path
      d="M26 92L46 66H274L294 92C250 96 196 96 160 100C124 96 70 96 26 92Z"
      fill="#fed7aa"
    />

    {/* Left open page */}
    <path
      d="M160 94C122 84 74 84 30 88L48 50C88 46 128 50 160 66V94Z"
      fill="url(#pageLeft)"
    />
    {/* Right open page */}
    <path
      d="M160 94C198 84 246 84 290 88L272 50C232 46 192 50 160 66V94Z"
      fill="url(#pageRight)"
    />

    {/* Subtle page lines & center spine shadow */}
    <path
      d="M160 66V95"
      stroke="#fb923c"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.45"
    />
    <path
      d="M64 62C94 60 124 63 146 72M58 72C90 70 122 73 146 81M256 62C226 60 196 63 174 72M262 72C230 70 198 73 174 81"
      stroke="#cbd5e1"
      strokeWidth="1.6"
      strokeLinecap="round"
      opacity="0.55"
    />
  </svg>
);
