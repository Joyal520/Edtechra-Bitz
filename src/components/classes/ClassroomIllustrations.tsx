import React from 'react';

interface IllustrationProps {
  className?: string;
  size?: number;
}

// ============================================================================
// 1. CLASSROOM HERO: 3D Paper-Cut Classroom Scene with Blackboard, Books, Desk
// ============================================================================
export const ClassroomHeroIllustration: React.FC<IllustrationProps> = ({ className = "w-full max-w-[420px] h-[220px]" }) => (
  <svg viewBox="0 0 460 260" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      {/* Paper Drop Shadows */}
      <filter id="heroPaperShadow" x="-15%" y="-15%" width="130%" height="130%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#020817" floodOpacity="0.35" />
      </filter>
      <filter id="softDepth" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#091e3a" floodOpacity="0.25" />
      </filter>
      <filter id="capShadow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#020817" floodOpacity="0.4" />
      </filter>

      {/* Wave Gradients */}
      <linearGradient id="wave1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#1e3a5f" />
        <stop offset="100%" stopColor="#0d233e" />
      </linearGradient>
      <linearGradient id="wave2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#254d77" />
        <stop offset="100%" stopColor="#153252" />
      </linearGradient>
      <linearGradient id="wave3" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#2e6093" />
        <stop offset="100%" stopColor="#1b3d63" />
      </linearGradient>

      {/* Wood Desk Gradient */}
      <linearGradient id="deskWood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#92400e" />
      </linearGradient>
      {/* Chair Yellow Gradient */}
      <linearGradient id="chairYellow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      {/* Blackboard Surface */}
      <linearGradient id="chalkboardBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
    </defs>

    {/* LAYER 1: Background Organic Cut-Paper Waves */}
    <g filter="url(#heroPaperShadow)">
      <path d="M 0 0 C 60 40, 100 120, 120 260 L 0 260 Z" fill="url(#wave1)" opacity="0.9" />
      <path d="M 30 0 C 90 60, 130 140, 150 260 L 0 260 Z" fill="url(#wave2)" opacity="0.65" />
      <path d="M 70 0 C 120 80, 160 160, 180 260 L 0 260 Z" fill="url(#wave3)" opacity="0.45" />
    </g>

    {/* LAYER 2: Hanging Wall Clock on Upper Right */}
    <g transform="translate(400, 48)" filter="url(#softDepth)">
      <circle cx="0" cy="0" r="22" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2.5" />
      <circle cx="0" cy="0" r="19" fill="#ffffff" />
      {/* Clock ticks */}
      <line x1="0" y1="-16" x2="0" y2="-13" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="0" y1="16" x2="0" y2="13" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="-16" y1="0" x2="-13" y2="0" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="0" x2="13" y2="0" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      {/* Clock Hands (10:10) */}
      <line x1="0" y1="0" x2="-7" y2="-8" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="0" y1="0" x2="10" y2="-5" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="0" cy="0" r="2" fill="#f59e0b" />
    </g>

    {/* LAYER 3: Blackboard Frame & Chalkboard */}
    <g transform="translate(190, 24)" filter="url(#heroPaperShadow)">
      {/* Wooden Frame */}
      <rect x="0" y="0" width="180" height="110" rx="10" fill="#92400e" stroke="#78350f" strokeWidth="2" />
      <rect x="5" y="5" width="170" height="100" rx="6" fill="#b45309" />
      {/* Chalkboard Slate */}
      <rect x="10" y="10" width="160" height="90" rx="4" fill="url(#chalkboardBg)" />
      
      {/* Chalk Tray */}
      <rect x="6" y="106" width="168" height="6" rx="2" fill="#78350f" />
      <rect x="25" y="104" width="12" height="3" rx="1" fill="#ffffff" />
      <rect x="42" y="104" width="8" height="3" rx="1" fill="#fef08a" />

      {/* Chalk Formulas & Math Doodles on Blackboard */}
      <path d="M 22 28 C 30 22, 40 32, 48 24" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M 22 38 L 46 38 M 34 32 L 34 44" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <text x="24" y="60" fill="#fde047" fontSize="11" fontWeight="bold" fontFamily="monospace" opacity="0.75">E = mc²</text>
      <path d="M 24 74 L 40 74 M 45 74 L 55 74" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />

      {/* Right Side: Stack of 3 Books on Board */}
      <g transform="translate(70, 52)">
        {/* Book 1 (Bottom - Gold) */}
        <rect x="0" y="16" width="82" height="12" rx="2" fill="#d97706" />
        <rect x="4" y="18" width="74" height="8" rx="1" fill="#fef3c7" />
        <rect x="0" y="16" width="12" height="12" rx="2" fill="#b45309" />

        {/* Book 2 (Middle - Amber) */}
        <rect x="6" y="8" width="72" height="11" rx="2" fill="#f59e0b" />
        <rect x="10" y="10" width="64" height="7" rx="1" fill="#ffffff" />
        <rect x="6" y="8" width="10" height="11" rx="2" fill="#d97706" />

        {/* Book 3 (Top - Cream) */}
        <rect x="12" y="0" width="62" height="11" rx="2" fill="#f8fafc" />
        <rect x="15" y="2" width="54" height="7" rx="1" fill="#f1f5f9" />
        <rect x="12" y="0" width="9" height="11" rx="2" fill="#0284c7" />

        {/* Graduation Cap on top of books */}
        <g transform="translate(38, -14)" filter="url(#capShadow)">
          {/* Diamond Cap Top */}
          <path d="M 0 -8 L 30 0 L 0 8 L -30 0 Z" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" />
          {/* Cap Skull Underneath */}
          <path d="M -16 2 L -16 10 C -16 16, 16 16, 16 10 L 16 2 Z" fill="#0369a1" />
          {/* Golden Tassel */}
          <path d="M 0 0 L 22 7 L 22 18" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="22" cy="20" r="3" fill="#f59e0b" />
          <circle cx="0" cy="0" r="2.5" fill="#fde047" />
        </g>
      </g>
    </g>

    {/* LAYER 4: Bookshelf with Books & Plant on Right */}
    <g transform="translate(380, 100)" filter="url(#softDepth)">
      {/* Bookshelf Frame */}
      <rect x="0" y="0" width="68" height="145" rx="4" fill="#92400e" stroke="#78350f" strokeWidth="1.5" />
      {/* Top Shelf Compartment */}
      <rect x="4" y="4" width="60" height="42" fill="#b45309" />
      {/* Middle Shelf Compartment */}
      <rect x="4" y="50" width="60" height="42" fill="#b45309" />
      {/* Bottom Shelf Compartment */}
      <rect x="4" y="96" width="60" height="44" fill="#b45309" />

      {/* Top Shelf: Potted Plant */}
      <g transform="translate(18, 12)">
        <rect x="4" y="20" width="18" height="14" rx="2" fill="#fed7aa" stroke="#f97316" strokeWidth="1" />
        <path d="M 13 20 C 6 6, 11 0, 13 -3 C 15 0, 20 6, 13 20 Z" fill="#22c55e" />
        <path d="M 9 18 C 0 10, 6 2, 9 18 Z" fill="#16a34a" />
        <path d="M 17 18 C 26 10, 20 2, 17 18 Z" fill="#15803d" />
      </g>

      {/* Middle Shelf: Standing Vertical Books (Teal, Blue, Yellow) */}
      <rect x="10" y="58" width="8" height="30" rx="1.5" fill="#0284c7" />
      <rect x="20" y="54" width="9" height="34" rx="1.5" fill="#38bdf8" />
      <rect x="31" y="60" width="8" height="28" rx="1.5" fill="#fbbf24" />
      <rect x="41" y="56" width="9" height="32" rx="1.5" fill="#059669" />

      {/* Bottom Shelf: Stacked Books & Globe */}
      <rect x="10" y="122" width="48" height="8" rx="1" fill="#e2e8f0" />
      <rect x="12" y="114" width="44" height="8" rx="1" fill="#38bdf8" />
      <rect x="16" y="106" width="36" height="8" rx="1" fill="#fbbf24" />
    </g>

    {/* LAYER 5: Yellow Teacher Office Chair */}
    <g transform="translate(325, 138)" filter="url(#heroPaperShadow)">
      {/* Chair Backrest */}
      <path d="M 10 0 C 2 0, 0 10, 0 24 C 0 38, 4 48, 14 50 L 32 50 C 42 48, 46 38, 46 24 C 46 10, 44 0, 36 0 Z" fill="url(#chairYellow)" stroke="#d97706" strokeWidth="1.5" />
      <rect x="10" y="10" width="26" height="26" rx="4" fill="#fde047" opacity="0.6" />
      {/* Chair Seat */}
      <rect x="-4" y="46" width="54" height="14" rx="6" fill="#d97706" stroke="#b45309" strokeWidth="1" />
      {/* Chair Stem */}
      <rect x="19" y="58" width="8" height="24" fill="#475569" />
      {/* Wheels Base */}
      <path d="M 2 82 L 44 82" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
      <circle cx="4" cy="85" r="3" fill="#0f172a" />
      <circle cx="42" cy="85" r="3" fill="#0f172a" />
      <circle cx="23" cy="85" r="3" fill="#0f172a" />
    </g>

    {/* LAYER 6: Teacher Desk Surface & Legs */}
    <g transform="translate(195, 172)" filter="url(#heroPaperShadow)">
      {/* Desk Surface Tabletop */}
      <rect x="0" y="0" width="180" height="14" rx="4" fill="url(#deskWood)" stroke="#78350f" strokeWidth="1.5" />
      <rect x="4" y="2" width="172" height="4" rx="2" fill="#fbbf24" opacity="0.4" />
      {/* Desk Legs */}
      <rect x="14" y="14" width="10" height="74" rx="2" fill="#78350f" />
      <rect x="156" y="14" width="10" height="74" rx="2" fill="#78350f" />
      <rect x="24" y="44" width="132" height="5" rx="1" fill="#92400e" opacity="0.6" />

      {/* Laptop on Desk */}
      <g transform="translate(26, -34)">
        {/* Laptop Screen (Silver/Grey with glow) */}
        <path d="M 8 0 L 52 0 C 54 0, 56 2, 56 4 L 52 28 C 52 30, 50 32, 48 32 L 12 32 C 10 32, 8 30, 8 28 L 4 4 C 4 2, 6 0, 8 0 Z" fill="#94a3b8" stroke="#64748b" strokeWidth="1.5" />
        <rect x="9" y="4" width="42" height="22" rx="2" fill="#38bdf8" />
        <path d="M 14 10 L 26 10 M 14 16 L 36 16 M 14 20 L 30 20" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        {/* Laptop Base */}
        <path d="M 0 32 L 60 32 L 56 36 L 4 36 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
      </g>

      {/* Coffee Mug on Desk */}
      <g transform="translate(100, -18)">
        <rect x="0" y="4" width="14" height="14" rx="3" fill="#0284c7" />
        <path d="M 14 7 C 18 7, 18 15, 14 15" stroke="#0284c7" strokeWidth="2" fill="none" />
        {/* Steam */}
        <path d="M 4 0 C 3 -3, 6 -4, 5 -7" stroke="#93c5fd" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M 9 1 C 8 -2, 11 -3, 10 -6" stroke="#93c5fd" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7" />
      </g>
    </g>
  </svg>
);

// ============================================================================
// 2. OVERVIEW: 3D Paper-Cut Bar Chart & Donut Chart
// ============================================================================
export const OverviewIllustration: React.FC<IllustrationProps> = ({ className = "w-20 h-16" }) => (
  <svg viewBox="0 0 140 110" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="ovDepth" x="-15%" y="-15%" width="130%" height="130%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#0284c7" floodOpacity="0.25" />
      </filter>
      <linearGradient id="ovBar1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7dd3fc" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
      <linearGradient id="ovBar2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
      <linearGradient id="ovBar3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>
    <g filter="url(#ovDepth)">
      {/* Background Rounded Window Card */}
      <rect x="16" y="14" width="108" height="82" rx="14" fill="#ffffff" stroke="#bae6fd" strokeWidth="1.5" />
      
      {/* Window Top Bar */}
      <rect x="16" y="14" width="108" height="20" rx="14" fill="#e0f2fe" />
      <circle cx="28" cy="24" r="3" fill="#38bdf8" />
      <circle cx="37" cy="24" r="3" fill="#7dd3fc" />
      <circle cx="46" cy="24" r="3" fill="#bae6fd" />

      {/* 3 Dimensional Bar Columns */}
      <rect x="30" y="60" width="12" height="26" rx="4" fill="url(#ovBar1)" />
      <rect x="48" y="46" width="12" height="40" rx="4" fill="url(#ovBar2)" />
      <rect x="66" y="36" width="12" height="50" rx="4" fill="url(#ovBar3)" />
      <line x1="24" y1="88" x2="84" y2="88" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />

      {/* Donut Chart on Right */}
      <g transform="translate(98, 62)">
        <circle cx="0" cy="0" r="16" fill="#38bdf8" />
        <path d="M 0 0 L 16 0 A 16 16 0 0 1 -5 15.2 Z" fill="#f59e0b" />
        <path d="M 0 0 L -5 15.2 A 16 16 0 0 1 -15.2 -5 Z" fill="#2563eb" />
        <circle cx="0" cy="0" r="8" fill="#ffffff" />
      </g>
    </g>
  </svg>
);

// ============================================================================
// 3. TASKS: Green Checklist Clipboard with Metallic Clip & Pencil
// ============================================================================
export const TaskIllustration: React.FC<IllustrationProps> = ({ className = "w-20 h-16" }) => (
  <svg viewBox="0 0 140 110" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="taskDepth" x="-15%" y="-15%" width="130%" height="130%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#059669" floodOpacity="0.25" />
      </filter>
      <linearGradient id="taskBoard" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
    </defs>
    <g filter="url(#taskDepth)">
      {/* Board Base */}
      <rect x="32" y="16" width="76" height="84" rx="12" fill="url(#taskBoard)" />
      {/* Inner White Paper */}
      <rect x="38" y="26" width="64" height="68" rx="8" fill="#ffffff" stroke="#a7f3d0" strokeWidth="1.5" />

      {/* Top Clip */}
      <rect x="54" y="10" width="32" height="12" rx="4" fill="#1e293b" />
      <rect x="60" y="13" width="20" height="5" rx="2" fill="#94a3b8" />
      <circle cx="70" cy="6" r="3" fill="#047857" stroke="#34d399" strokeWidth="1.5" />

      {/* Checklist Rows with Checkmarks */}
      <path d="M 45 40 L 49 44 L 56 36" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="60" y="38" width="34" height="4.5" rx="2" fill="#10b981" opacity="0.85" />

      <path d="M 45 54 L 49 58 L 56 50" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="60" y="52" width="30" height="4.5" rx="2" fill="#10b981" opacity="0.85" />

      <path d="M 45 68 L 49 72 L 56 64" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="60" y="66" width="36" height="4.5" rx="2" fill="#10b981" opacity="0.85" />

      {/* Row 4 Pending */}
      <circle cx="49" cy="80" r="3" fill="#d1fae5" stroke="#10b981" strokeWidth="1.5" />
      <rect x="60" y="78" width="24" height="4" rx="2" fill="#cbd5e1" />
    </g>
  </svg>
);

// ============================================================================
// 4. STUDENTS: Lavender Layered Student Avatars
// ============================================================================
export const StudentsIllustration: React.FC<IllustrationProps> = ({ className = "w-20 h-16" }) => (
  <svg viewBox="0 0 140 110" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="studDepth" x="-15%" y="-15%" width="130%" height="130%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#7c3aed" floodOpacity="0.22" />
      </filter>
    </defs>
    <g filter="url(#studDepth)">
      {/* Background Soft Disc */}
      <circle cx="70" cy="55" r="42" fill="#f5f3ff" stroke="#ddd6fe" strokeWidth="1.5" />

      {/* Center Main Student (Teacher/Leader - Gold/Indigo) */}
      <g transform="translate(52, 28)">
        <path d="M 8 16 C 6 4, 28 4, 26 16 C 30 24, 28 32, 26 36 L 8 36 Z" fill="#1e1b4b" />
        <circle cx="18" cy="18" r="11" fill="#fcd34d" />
        <path d="M 9 14 C 14 9, 22 9, 27 14 Z" fill="#1e1b4b" />
        <path d="M 2 46 C 2 34, 34 34, 34 46 Z" fill="#6366f1" />
      </g>

      {/* Left Student (Boy - Slate/Blue) */}
      <g transform="translate(24, 36)">
        <circle cx="15" cy="15" r="9" fill="#fed7aa" />
        <path d="M 6 13 C 6 5, 24 5, 24 13 Z" fill="#0f172a" />
        <path d="M 0 38 C 0 28, 30 28, 30 38 Z" fill="#0284c7" />
      </g>

      {/* Right Student (Girl - Coral/Purple) */}
      <g transform="translate(86, 36)">
        <path d="M 4 12 C 4 2, 26 2, 26 12 C 28 20, 28 28, 26 34 L 4 34 Z" fill="#0f172a" />
        <circle cx="15" cy="15" r="9" fill="#fed7aa" />
        <path d="M 0 38 C 0 28, 30 28, 30 38 Z" fill="#e11d48" />
      </g>
    </g>
  </svg>
);

// ============================================================================
// 5. STREAM: Pastel Yellow Layered Chat Speech Bubbles
// ============================================================================
export const StreamIllustration: React.FC<IllustrationProps> = ({ className = "w-20 h-16" }) => (
  <svg viewBox="0 0 140 110" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="streamDepth" x="-15%" y="-15%" width="130%" height="130%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#d97706" floodOpacity="0.22" />
      </filter>
    </defs>
    <g filter="url(#streamDepth)">
      {/* Large Blue Chat Bubble at Back */}
      <rect x="36" y="22" width="70" height="44" rx="12" fill="#0284c7" />
      <path d="M 50 66 L 44 76 L 60 66 Z" fill="#0284c7" />
      {/* Chat lines inside */}
      <rect x="48" y="32" width="36" height="4.5" rx="2" fill="#ffffff" />
      <rect x="48" y="42" width="46" height="4" rx="2" fill="#bae6fd" />
      <rect x="48" y="50" width="28" height="4" rx="2" fill="#bae6fd" />

      {/* Front Small Amber/Gold Chat Bubble */}
      <rect x="58" y="48" width="56" height="38" rx="10" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
      <path d="M 94 86 L 102 96 L 98 86 Z" fill="#f59e0b" />
      {/* 3 typing dots */}
      <circle cx="74" cy="67" r="3.5" fill="#ffffff" />
      <circle cx="86" cy="67" r="3.5" fill="#ffffff" />
      <circle cx="98" cy="67" r="3.5" fill="#ffffff" />
    </g>
  </svg>
);

// ============================================================================
// 6. RESOURCES: Golden-Peach File Folder with Papers
// ============================================================================
export const ResourcesIllustration: React.FC<IllustrationProps> = ({ className = "w-20 h-16" }) => (
  <svg viewBox="0 0 140 110" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="resDepth" x="-15%" y="-15%" width="130%" height="130%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#e11d48" floodOpacity="0.2" />
      </filter>
      <linearGradient id="resFoldBack" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="resFoldFront" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
    <g filter="url(#resDepth)">
      {/* Folder Back with Tab */}
      <path d="M 28 32 C 28 28, 31 24, 35 24 L 58 24 L 66 32 L 105 32 C 109 32, 112 35, 112 39 L 112 82 L 28 82 Z" fill="url(#resFoldBack)" />

      {/* Sheets of paper inside */}
      <rect x="36" y="18" width="60" height="54" rx="4" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" transform="rotate(-5 36 18)" />
      <rect x="45" y="24" width="34" height="4" rx="2" fill="#94a3b8" transform="rotate(-5 36 18)" />
      <rect x="45" y="32" width="42" height="3" rx="1.5" fill="#cbd5e1" transform="rotate(-5 36 18)" />

      <rect x="44" y="16" width="58" height="54" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" transform="rotate(4 44 16)" />
      <rect x="52" y="22" width="36" height="4" rx="2" fill="#38bdf8" transform="rotate(4 44 16)" />
      <rect x="52" y="30" width="40" height="3" rx="1.5" fill="#cbd5e1" transform="rotate(4 44 16)" />

      {/* Folder Front Flap */}
      <path d="M 24 42 C 24 38, 27 36, 31 36 L 109 36 C 113 36, 116 38, 116 42 L 112 88 C 112 92, 109 95, 105 95 L 31 95 C 27 95, 24 92, 24 88 Z" fill="url(#resFoldFront)" />
      <path d="M 32 44 L 108 44" stroke="#fef3c7" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </g>
  </svg>
);

// ============================================================================
// 7. ASSIGN YOUR STUDENTS: Graduation Cap Guiding Students
// ============================================================================
export const AssignStudentsIllustration: React.FC<IllustrationProps> = ({ className = "w-24 h-20" }) => (
  <svg viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="assignDepth" x="-15%" y="-15%" width="130%" height="130%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#4f46e5" floodOpacity="0.25" />
      </filter>
    </defs>
    <g filter="url(#assignDepth)">
      {/* Soft Purple Disc Base */}
      <circle cx="70" cy="62" r="44" fill="#ede9fe" />

      {/* Top Floating Graduation Cap */}
      <g transform="translate(70, 22)">
        <path d="M 0 -7 L 24 0 L 0 7 L -24 0 Z" fill="#4338ca" stroke="#6366f1" strokeWidth="1" />
        <path d="M -12 2 L -12 8 C -12 13, 12 13, 12 8 L 12 2 Z" fill="#312e81" />
        {/* Golden Tassel */}
        <path d="M 0 0 L 16 6 L 16 14" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
        <circle cx="16" cy="16" r="2.5" fill="#f59e0b" />
        <circle cx="0" cy="0" r="2" fill="#fbbf24" />
      </g>

      {/* Student 1 (Boy) */}
      <g transform="translate(38, 48)">
        <circle cx="16" cy="16" r="10" fill="#fcd34d" />
        <path d="M 7 14 C 5 7, 19 3, 25 9 Z" fill="#1e1b4b" />
        <path d="M 3 38 C 3 28, 29 28, 29 38 Z" fill="#4f46e5" />
      </g>

      {/* Student 2 (Center Girl) */}
      <g transform="translate(56, 44)">
        <circle cx="14" cy="14" r="9" fill="#fed7aa" />
        <path d="M 4 12 C 4 3, 24 3, 24 12 Z" fill="#0f172a" />
        <path d="M 0 36 C 0 26, 28 26, 28 36 Z" fill="#0284c7" />
      </g>

      {/* Student 3 (Right Student) */}
      <g transform="translate(74, 48)">
        <circle cx="16" cy="16" r="10" fill="#fed7aa" />
        <path d="M 5 14 C 5 4, 25 4, 25 14 Z" fill="#0f172a" />
        <path d="M 3 38 C 3 28, 29 28, 29 38 Z" fill="#e11d48" />
      </g>
    </g>
  </svg>
);

// ============================================================================
// 8. LIVE QUIZ: Screen with LIVE Badge & Golden Trophy
// ============================================================================
export const LiveQuizIllustration: React.FC<IllustrationProps> = ({ className = "w-24 h-20" }) => (
  <svg viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="lqDepth" x="-15%" y="-15%" width="130%" height="130%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#7c3aed" floodOpacity="0.25" />
      </filter>
    </defs>
    <g filter="url(#lqDepth)">
      {/* Device Body */}
      <rect x="24" y="24" width="92" height="74" rx="14" fill="#4c1d95" stroke="#8b5cf6" strokeWidth="2" />
      {/* Screen Inner */}
      <rect x="32" y="32" width="76" height="58" rx="8" fill="#5b21b6" />

      {/* Red LIVE Badge */}
      <g transform="translate(54, 12)">
        <rect x="0" y="0" width="32" height="16" rx="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
        <text x="16" y="11.5" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="900" fontFamily="sans-serif">LIVE</text>
      </g>

      {/* Trophy Center */}
      <g transform="translate(70, 52)">
        <path d="M -8 -6 L 8 -6 L 6 3 C 5 8, -5 8, -6 3 Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
        <path d="M -8 -4 C -11 -4, -11 0, -6 0" stroke="#f59e0b" strokeWidth="1.2" fill="none" />
        <path d="M 8 -4 C 11 -4, 11 0, 6 0" stroke="#f59e0b" strokeWidth="1.2" fill="none" />
        <rect x="-2.5" y="7" width="5" height="4" fill="#f59e0b" />
        <rect x="-6" y="11" width="12" height="3" rx="1.5" fill="#d97706" />
      </g>

      {/* 4 Colored Answer Buttons */}
      <rect x="38" y="72" width="14" height="7" rx="2.5" fill="#ef4444" />
      <rect x="56" y="72" width="14" height="7" rx="2.5" fill="#3b82f6" />
      <rect x="74" y="72" width="14" height="7" rx="2.5" fill="#eab308" />
      <rect x="92" y="72" width="10" height="7" rx="2.5" fill="#10b981" />
    </g>
  </svg>
);

// ============================================================================
// 9. EXAM: Exam Paper Clipboard with Glowing Red A+ Stamp
// ============================================================================
export const ExamIllustration: React.FC<IllustrationProps> = ({ className = "w-24 h-20" }) => (
  <svg viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="examDepth" x="-15%" y="-15%" width="130%" height="130%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#334155" floodOpacity="0.25" />
      </filter>
      <filter id="stampDepth" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#ef4444" floodOpacity="0.35" />
      </filter>
    </defs>
    <g filter="url(#examDepth)">
      {/* Clipboard Slate Base */}
      <rect x="34" y="18" width="72" height="86" rx="10" fill="#334155" />
      {/* Paper Sheet */}
      <rect x="40" y="28" width="60" height="70" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />

      {/* Top Metallic Clip */}
      <rect x="56" y="12" width="28" height="12" rx="3" fill="#1e293b" />
      <rect x="62" y="15" width="16" height="4" rx="2" fill="#94a3b8" />

      {/* Question Lines */}
      <rect x="48" y="38" width="34" height="3.5" rx="1.5" fill="#3b82f6" />
      <rect x="48" y="45" width="44" height="2.5" rx="1" fill="#94a3b8" />
      <rect x="48" y="50" width="38" height="2.5" rx="1" fill="#cbd5e1" />

      <rect x="48" y="60" width="34" height="3.5" rx="1.5" fill="#3b82f6" />
      <rect x="48" y="67" width="42" height="2.5" rx="1" fill="#94a3b8" />
      <rect x="48" y="72" width="30" height="2.5" rx="1" fill="#cbd5e1" />

      {/* Red A+ Stamp */}
      <g transform="translate(80, 68)" filter="url(#stampDepth)">
        <circle cx="14" cy="14" r="14" fill="#ef4444" />
        <circle cx="14" cy="14" r="12" fill="none" stroke="#fecaca" strokeWidth="1.2" strokeDasharray="3 2" />
        <text x="14" y="19" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="900" fontFamily="sans-serif">A+</text>
      </g>
    </g>
  </svg>
);

// ============================================================================
// 10. OCR ASSESSMENT: Worksheet with 4 Purple Scanning Brackets & OCR Tag
// ============================================================================
export const OCRIllustration: React.FC<IllustrationProps> = ({ className = "w-24 h-20" }) => (
  <svg viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="ocrDepth" x="-15%" y="-15%" width="130%" height="130%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#6366f1" floodOpacity="0.25" />
      </filter>
    </defs>
    <g filter="url(#ocrDepth)">
      {/* Background Soft Purple Circle */}
      <circle cx="70" cy="60" r="44" fill="#f5f3ff" />

      {/* Paper Sheet with Corner Fold */}
      <path d="M 44 24 L 84 24 L 98 38 L 98 96 C 98 100, 95 102, 91 102 L 44 102 C 40 102, 37 100, 37 96 L 37 31 C 37 27, 40 24, 44 24 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
      <path d="M 84 24 L 84 38 L 98 38 Z" fill="#e2e8f0" />

      {/* Handwriting Lines */}
      <rect x="46" y="36" width="28" height="3.5" rx="1.5" fill="#6366f1" opacity="0.8" />
      <rect x="46" y="45" width="40" height="2.5" rx="1" fill="#94a3b8" />
      <rect x="46" y="52" width="44" height="2.5" rx="1" fill="#cbd5e1" />
      <rect x="46" y="59" width="36" height="2.5" rx="1" fill="#cbd5e1" />
      <rect x="46" y="66" width="42" height="2.5" rx="1" fill="#94a3b8" />

      {/* 4 Purple Scanning Bracket Corners */}
      <path d="M 30 36 L 30 22 L 44 22" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 110 36 L 110 22 L 96 22" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 30 84 L 30 98 L 44 98" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 110 84 L 110 98 L 96 98" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {/* OCR Pill Tag */}
      <g transform="translate(80, 78)">
        <rect x="0" y="0" width="34" height="18" rx="6" fill="#4338ca" stroke="#ffffff" strokeWidth="1.5" />
        <text x="17" y="12.5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900" fontFamily="sans-serif">OCR</text>
      </g>
    </g>
  </svg>
);

// ============================================================================
// 11. COMPETITION: Golden Championship Trophy with Star
// ============================================================================
export const CompetitionIllustration: React.FC<IllustrationProps> = ({ className = "w-24 h-20" }) => (
  <svg viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="compDepth" x="-15%" y="-15%" width="130%" height="130%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#d97706" floodOpacity="0.28" />
      </filter>
      <linearGradient id="compGold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="50%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
    </defs>
    <g filter="url(#compDepth)">
      {/* Background Amber Circle */}
      <circle cx="70" cy="60" r="44" fill="#fef3c7" />

      {/* Left Handle */}
      <path d="M 48 38 C 32 38, 32 58, 52 58" stroke="#ca8a04" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M 48 38 C 34 38, 34 58, 52 58" stroke="#fde047" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* Right Handle */}
      <path d="M 92 38 C 108 38, 108 58, 88 58" stroke="#ca8a04" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M 92 38 C 106 38, 106 58, 88 58" stroke="#fde047" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* Main Trophy Cup */}
      <path d="M 44 30 L 96 30 C 96 30, 94 62, 70 68 C 46 62, 44 30, 44 30 Z" fill="url(#compGold)" stroke="#a16207" strokeWidth="1.5" />
      <ellipse cx="70" cy="30" rx="26" ry="5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.2" />

      {/* White Star */}
      <path d="M 70 39 L 72 44 L 77 44.5 L 73 48 L 74.5 53 L 70 50 L 65.5 53 L 67 48 L 63 44.5 L 68 44 Z" fill="#ffffff" />

      {/* Stem */}
      <rect x="65" y="68" width="10" height="14" fill="#ca8a04" />
      <rect x="67" y="68" width="6" height="14" fill="#fde047" />

      {/* Pedestal Base */}
      <path d="M 56 82 L 84 82 L 89 94 L 51 94 Z" fill="#1e293b" />
      <rect x="55" y="85" width="30" height="4.5" rx="1.5" fill="#fde047" />
    </g>
  </svg>
);

// ============================================================================
// 12. PODIUM: 3D Paper-Cut Leaderboard Podium (2, 1, 3)
// ============================================================================
export const PodiumIllustration: React.FC<IllustrationProps> = ({ className = "w-44 h-32" }) => (
  <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="podiumShadow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.2" />
      </filter>
    </defs>
    <g filter="url(#podiumShadow)">
      {/* 2nd Place Step (Left - Slate/Silver) */}
      <g transform="translate(18, 55)">
        {/* Step Block */}
        <path d="M 0 12 L 48 12 L 48 65 L 0 65 Z" fill="#334155" />
        <rect x="0" y="0" width="48" height="12" fill="#475569" />
        <text x="24" y="45" textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="900" fontFamily="sans-serif">2</text>
        
        {/* Student Avatar on Step 2 */}
        <g transform="translate(24, -20)">
          <circle cx="0" cy="0" r="14" fill="#64748b" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M -6 -4 C -6 -12, 6 -12, 6 -4 Z" fill="#0f172a" />
          <circle cx="0" cy="0" r="10" fill="#fed7aa" />
          <path d="M -5 -2 C -2 -6, 2 -6, 5 -2 Z" fill="#0f172a" />
        </g>
      </g>

      {/* 1st Place Step (Center - Gold) */}
      <g transform="translate(68, 32)">
        {/* Step Block */}
        <path d="M 0 14 L 64 14 L 64 88 L 0 88 Z" fill="#d97706" />
        <rect x="0" y="0" width="64" height="14" fill="#fbbf24" />
        <text x="32" y="58" textAnchor="middle" fill="#ffffff" fontSize="32" fontWeight="900" fontFamily="sans-serif">1</text>
        
        {/* Crown atop Step 1 */}
        <g transform="translate(32, -42)">
          <path d="M -12 12 L -16 -2 L -6 4 L 0 -6 L 6 4 L 16 -2 L 12 12 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
          <circle cx="-16" cy="-2" r="2" fill="#ef4444" />
          <circle cx="0" cy="-6" r="2" fill="#3b82f6" />
          <circle cx="16" cy="-2" r="2" fill="#10b981" />
        </g>

        {/* Student Avatar on Step 1 */}
        <g transform="translate(32, -18)">
          <circle cx="0" cy="0" r="16" fill="#fbbf24" stroke="#fef08a" strokeWidth="2.5" />
          <circle cx="0" cy="0" r="13" fill="#fcd34d" />
          <path d="M -7 -4 C -7 -14, 7 -14, 7 -4 Z" fill="#1e1b4b" />
          {/* Eyeglasses */}
          <circle cx="-4" cy="0" r="3.5" stroke="#1e1b4b" strokeWidth="1.2" fill="none" />
          <circle cx="4" cy="0" r="3.5" stroke="#1e1b4b" strokeWidth="1.2" fill="none" />
          <line x1="-0.5" y1="0" x2="0.5" y2="0" stroke="#1e1b4b" strokeWidth="1.2" />
        </g>
      </g>

      {/* 3rd Place Step (Right - Bronze/Coral) */}
      <g transform="translate(134, 68)">
        {/* Step Block */}
        <path d="M 0 10 L 48 10 L 48 52 L 0 52 Z" fill="#c2410c" />
        <rect x="0" y="0" width="48" height="10" fill="#ea580c" />
        <text x="24" y="38" textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="900" fontFamily="sans-serif">3</text>
        
        {/* Student Avatar on Step 3 */}
        <g transform="translate(24, -18)">
          <circle cx="0" cy="0" r="13" fill="#ea580c" stroke="#fed7aa" strokeWidth="2" />
          <circle cx="0" cy="0" r="10" fill="#fed7aa" />
          <path d="M -6 -2 C -6 -10, 6 -10, 6 -2 Z" fill="#0f172a" />
        </g>
      </g>
    </g>
  </svg>
);

// ============================================================================
// 13. AI TEACHING INTELLIGENCE: Profile Head with Glowing Lightbulb Brain
// ============================================================================
export const AITeachingIntelligenceIllustration: React.FC<IllustrationProps> = ({ className = "w-36 h-28" }) => (
  <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="aiGlow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#38bdf8" floodOpacity="0.35" />
      </filter>
      {/* Background Curved Layered Waves */}
      <linearGradient id="aiWave1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#4f46e5" />
        <stop offset="100%" stopColor="#312e81" />
      </linearGradient>
      <linearGradient id="aiWave2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#3730a3" />
      </linearGradient>
      <linearGradient id="aiWave3" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#4338ca" />
      </linearGradient>
    </defs>

    {/* Layered Cut-Paper Silhouette Waves */}
    <path d="M 80 0 C 110 30, 130 70, 160 80 L 160 0 Z" fill="url(#aiWave1)" opacity="0.5" />
    <path d="M 60 0 C 95 35, 115 80, 160 110 L 160 0 Z" fill="url(#aiWave2)" opacity="0.4" />
    <path d="M 40 0 C 80 40, 100 90, 160 140 L 160 0 Z" fill="url(#aiWave3)" opacity="0.3" />

    {/* Layered Paper Human Head Profile (Right-Facing Silhouette) */}
    <g transform="translate(50, 16)" filter="url(#aiGlow)">
      {/* Profile Head Cutout */}
      <path d="M 20 10 C 45 -5, 80 0, 85 30 C 87 40, 86 50, 88 56 C 90 60, 94 62, 92 68 C 90 74, 82 74, 80 80 C 78 86, 82 92, 78 98 C 74 104, 60 108, 48 108 L 48 120 L 15 120 C 15 105, 12 70, 10 50 C 8 30, 8 18, 20 10 Z" fill="#e0e7ff" />

      {/* Brain Cavity Cutout Area */}
      <path d="M 32 24 C 48 14, 70 18, 72 38 C 74 54, 64 64, 48 68 C 34 68, 26 56, 26 42 C 26 30, 28 26, 32 24 Z" fill="#312e81" />

      {/* Glowing Golden Lightbulb in Brain */}
      <g transform="translate(50, 42)">
        {/* Bulb Glow */}
        <circle cx="0" cy="0" r="13" fill="#fef08a" opacity="0.9" />
        <circle cx="0" cy="0" r="10" fill="#fde047" />
        {/* Filament */}
        <path d="M -4 2 L -2 -4 L 2 -4 L 4 2" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        {/* Screw Base */}
        <rect x="-4" y="9" width="8" height="4" rx="1" fill="#94a3b8" />
        <rect x="-2.5" y="13" width="5" height="2" rx="1" fill="#64748b" />
      </g>
    </g>
  </svg>
);

// ============================================================================
// 14. CREATE COURSE: Stack of Textbooks with Graduation Cap
// ============================================================================
export const CreateCourseIllustration: React.FC<IllustrationProps> = ({ className = "w-20 h-16" }) => (
  <svg viewBox="0 0 130 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="courseDepth" x="-15%" y="-15%" width="130%" height="130%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0284c7" floodOpacity="0.25" />
      </filter>
    </defs>
    <g filter="url(#courseDepth)">
      {/* Background Soft Sky Circle */}
      <circle cx="65" cy="50" r="38" fill="#f0f9ff" />

      {/* Book 2 (Bottom - Emerald) */}
      <rect x="25" y="58" width="76" height="15" rx="3" fill="#059669" />
      <rect x="29" y="60" width="68" height="10" rx="1.5" fill="#f8fafc" />
      <rect x="25" y="58" width="12" height="15" rx="3" fill="#047857" />

      {/* Book 1 (Top - Gold/Amber) */}
      <rect x="30" y="44" width="66" height="14" rx="3" fill="#d97706" />
      <rect x="34" y="46" width="58" height="9" rx="1.5" fill="#ffffff" />
      <rect x="30" y="44" width="10" height="14" rx="3" fill="#b45309" />

      {/* Graduation Cap on top */}
      <g transform="translate(63, 24)">
        <path d="M 0 -7 L 24 0 L 0 7 L -24 0 Z" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" />
        <path d="M -12 2 L -12 8 C -12 13, 12 13, 12 8 L 12 2 Z" fill="#0369a1" />
        {/* Tassel */}
        <path d="M 0 0 L 16 6 L 16 13" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
        <circle cx="16" cy="15" r="2.5" fill="#f59e0b" />
        <circle cx="0" cy="0" r="2" fill="#fbbf24" />
      </g>
    </g>
  </svg>
);

// ============================================================================
// 15. MEGAPHONE: Blue Announcement Megaphone
// ============================================================================
export const MegaphoneIllustration: React.FC<IllustrationProps> = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="30" cy="30" r="26" fill="#e0f2fe" />
    <g transform="translate(14, 16)">
      {/* Megaphone Cone */}
      <path d="M 6 12 L 20 4 L 20 24 L 6 16 Z" fill="#0284c7" />
      <path d="M 20 4 C 23 4, 25 8, 25 14 C 25 20, 23 24, 20 24 Z" fill="#38bdf8" />
      {/* Back Handle */}
      <rect x="0" y="11" width="6" height="6" rx="2" fill="#0369a1" />
      {/* Bottom Grip Handle */}
      <path d="M 12 16 L 14 26 L 18 26 L 16 16 Z" fill="#0369a1" />
      {/* Sound waves */}
      <path d="M 28 8 C 31 10, 31 18, 28 20" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M 32 5 C 36 8, 36 22, 32 25" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" fill="none" />
    </g>
  </svg>
);

// ============================================================================
// 16. BOTANICAL PAPER-CUT FRAME: Decorative Layered 3D Leaves around Page
// ============================================================================
export const BotanicalPaperCutFrame: React.FC = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
    {/* TOP-LEFT: Layered Blue & Teal Paper Leaves */}
    <div className="absolute -top-6 -left-6 w-48 sm:w-64 h-48 sm:h-64 opacity-90 transition-transform">
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <filter id="botShadowTL" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="3" dy="6" stdDeviation="6" floodColor="#0c4a6e" floodOpacity="0.25" />
          </filter>
        </defs>
        <g filter="url(#botShadowTL)">
          {/* Layer 1: Dark Navy Leaf */}
          <path d="M 0 0 C 40 40, 80 80, 70 140 C 40 130, 20 90, 0 60 Z" fill="#0369a1" />
          {/* Layer 2: Medium Blue Leaf */}
          <path d="M 0 0 C 60 30, 110 60, 110 110 C 75 110, 45 75, 0 45 Z" fill="#0284c7" />
          {/* Layer 3: Cyan Light Leaf */}
          <path d="M 0 0 C 80 15, 140 40, 140 85 C 95 85, 60 55, 0 30 Z" fill="#38bdf8" />
          {/* Layer 4: Soft Sky Leaf */}
          <path d="M 0 0 C 90 0, 160 15, 160 55 C 110 55, 70 35, 0 15 Z" fill="#7dd3fc" />
        </g>
      </svg>
    </div>

    {/* TOP-RIGHT: Layered Green & Sage Paper Leaves */}
    <div className="absolute -top-6 -right-6 w-48 sm:w-64 h-48 sm:h-64 opacity-90 transition-transform">
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <filter id="botShadowTR" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="-3" dy="6" stdDeviation="6" floodColor="#064e3b" floodOpacity="0.25" />
          </filter>
        </defs>
        <g filter="url(#botShadowTR)">
          {/* Layer 1: Deep Emerald Leaf */}
          <path d="M 200 0 C 160 40, 120 80, 130 140 C 160 130, 180 90, 200 60 Z" fill="#047857" />
          {/* Layer 2: Medium Green Leaf */}
          <path d="M 200 0 C 140 30, 90 60, 90 110 C 125 110, 155 75, 200 45 Z" fill="#059669" />
          {/* Layer 3: Vibrant Green Leaf */}
          <path d="M 200 0 C 120 15, 60 40, 60 85 C 105 85, 140 55, 200 30 Z" fill="#10b981" />
          {/* Layer 4: Mint Light Leaf */}
          <path d="M 200 0 C 110 0, 40 15, 40 55 C 90 55, 130 35, 200 15 Z" fill="#34d399" />
        </g>
      </svg>
    </div>

    {/* LEFT-MIDDLE: Golden-Yellow & Coral Paper Leaves */}
    <div className="absolute top-[52%] -left-8 w-44 sm:w-56 h-44 sm:h-56 opacity-85 transition-transform">
      <svg viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <filter id="botShadowLM" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="3" dy="5" stdDeviation="6" floodColor="#78350f" floodOpacity="0.2" />
          </filter>
        </defs>
        <g filter="url(#botShadowLM)">
          {/* Terracotta-Red Leaf Bottom */}
          <path d="M 0 100 C 40 100, 70 130, 70 170 C 40 165, 20 140, 0 120 Z" fill="#dc2626" />
          {/* Amber-Gold Leaf */}
          <path d="M 0 60 C 50 60, 90 90, 85 140 C 55 130, 30 100, 0 80 Z" fill="#d97706" />
          {/* Bright Yellow Leaf */}
          <path d="M 0 20 C 60 20, 110 50, 100 100 C 65 90, 35 60, 0 40 Z" fill="#fbbf24" />
        </g>
      </svg>
    </div>

    {/* BOTTOM-RIGHT: Terracotta-Red & Coral Paper Leaves */}
    <div className="absolute -bottom-8 -right-8 w-48 sm:w-64 h-48 sm:h-64 opacity-85 transition-transform">
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <filter id="botShadowBR" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="-4" dy="-4" stdDeviation="6" floodColor="#7f1d1d" floodOpacity="0.25" />
          </filter>
        </defs>
        <g filter="url(#botShadowBR)">
          <path d="M 200 200 C 160 160, 120 120, 130 60 C 160 70, 180 110, 200 140 Z" fill="#991b1b" />
          <path d="M 200 200 C 140 170, 90 140, 90 90 C 125 90, 155 125, 200 155 Z" fill="#b91c1c" />
          <path d="M 200 200 C 120 185, 60 160, 60 115 C 105 115, 140 145, 200 170 Z" fill="#ef4444" />
        </g>
      </svg>
    </div>
  </div>
);

// ============================================================================
// 17. COURSE CARD DECORATIVE LEAVES: Green leaves emerging from right edge
// ============================================================================
export const CourseCardLeaves: React.FC = () => (
  <div className="absolute -bottom-2 -right-3 w-32 h-24 pointer-events-none select-none opacity-90 hidden sm:block">
    <svg viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <filter id="courseLeafShadow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="-2" dy="2" stdDeviation="3" floodColor="#064e3b" floodOpacity="0.2" />
        </filter>
      </defs>
      <g filter="url(#courseLeafShadow)">
        <path d="M 120 90 C 90 70, 70 40, 75 10 C 90 25, 105 55, 120 70 Z" fill="#047857" />
        <path d="M 120 90 C 80 80, 50 60, 50 25 C 70 40, 95 65, 120 80 Z" fill="#059669" />
        <path d="M 120 90 C 70 90, 30 75, 30 45 C 55 55, 85 75, 120 85 Z" fill="#10b981" />
        <path d="M 120 90 C 60 90, 15 85, 15 65 C 45 70, 75 80, 120 88 Z" fill="#34d399" />
      </g>
    </svg>
  </div>
);

// ============================================================================
// 18. SIDEBAR ILLUSTRATION: Compact classroom desk
// ============================================================================
export const SidebarIllustration: React.FC<IllustrationProps> = ({ className = "w-full max-w-[200px]" }) => (
  <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="25" y="92" width="150" height="8" rx="3" fill="#d97706" />
    <line x1="38" y1="100" x2="30" y2="132" stroke="#b45309" strokeWidth="4" strokeLinecap="round" />
    <line x1="162" y1="100" x2="170" y2="132" stroke="#b45309" strokeWidth="4" strokeLinecap="round" />
    <rect x="46" y="76" width="32" height="16" rx="2" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
    <rect x="145" y="78" width="16" height="14" rx="2" fill="#fed7aa" />
    <path d="M 153 78 C 145 64, 150 58, 153 54 C 156 58, 161 64, 153 78 Z" fill="#22c55e" />
  </svg>
);

// ============================================================================
// 19. BOTTOM BANNER ILLUSTRATION
// ============================================================================
export const BottomBannerIllustration: React.FC<IllustrationProps> = ({ className = "w-40 h-20" }) => (
  <svg viewBox="0 0 160 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="10" y="66" width="140" height="6" rx="3" fill="#d97706" />
    <rect x="24" y="48" width="16" height="18" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
    <path d="M 32 48 C 26 34, 30 30, 32 28 C 34 30, 38 34, 32 48 Z" fill="#22c55e" />
    <rect x="54" y="52" width="46" height="14" rx="2" fill="#0284c7" />
    <rect x="56" y="44" width="42" height="8" rx="2" fill="#f59e0b" />
    <rect x="112" y="46" width="20" height="20" rx="4" fill="#7c3aed" />
  </svg>
);
