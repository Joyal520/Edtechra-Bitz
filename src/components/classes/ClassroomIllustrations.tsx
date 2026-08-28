import React from 'react';

interface IllustrationProps {
  className?: string;
  size?: number;
}

// ============================================================================
// 1. CLASSROOM HERO: Dimensional 3D Paper-Cut Classroom Scene
// ============================================================================
export const ClassroomHeroIllustration: React.FC<IllustrationProps> = ({ className = "w-full max-w-[440px] h-auto" }) => (
  <svg viewBox="0 0 480 280" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      {/* Dimensional Paper Shadows */}
      <filter id="heroPaperDeep" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#020817" floodOpacity="0.45" />
      </filter>
      <filter id="heroPaperMedium" x="-15%" y="-15%" width="130%" height="130%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#020817" floodOpacity="0.3" />
      </filter>
      <filter id="heroPaperSoft" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#031528" floodOpacity="0.25" />
      </filter>
      <filter id="heroGlow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#38bdf8" floodOpacity="0.35" />
      </filter>

      {/* Background Cut-Paper Waves */}
      <linearGradient id="waveNavy1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#1e3a5f" />
        <stop offset="100%" stopColor="#0c1e34" />
      </linearGradient>
      <linearGradient id="waveNavy2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#255280" />
        <stop offset="100%" stopColor="#132f4c" />
      </linearGradient>
      <linearGradient id="waveNavy3" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#326c9f" />
        <stop offset="100%" stopColor="#1b4168" />
      </linearGradient>

      {/* Materials Gradients */}
      <linearGradient id="woodBevel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#b45309" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>
      <linearGradient id="deskWoodGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d97706" />
        <stop offset="50%" stopColor="#b45309" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>
      <linearGradient id="chairAmberGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="60%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id="boardSlateGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
    </defs>

    {/* LAYER 1: Background Organic Cut-Paper Curves */}
    <g filter="url(#heroPaperDeep)">
      <path d="M 0 0 C 80 50, 120 140, 140 280 L 0 280 Z" fill="url(#waveNavy1)" opacity="0.9" />
      <path d="M 40 0 C 110 70, 150 160, 175 280 L 0 280 Z" fill="url(#waveNavy2)" opacity="0.65" />
      <path d="M 90 0 C 145 90, 185 180, 210 280 L 0 280 Z" fill="url(#waveNavy3)" opacity="0.4" />
    </g>

    {/* LAYER 2: Hanging Wall Clock (Top Right) */}
    <g transform="translate(420, 50)" filter="url(#heroPaperSoft)">
      <circle cx="0" cy="0" r="24" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2.5" />
      <circle cx="0" cy="0" r="20" fill="#ffffff" />
      <circle cx="0" cy="0" r="18" fill="#f1f5f9" opacity="0.5" />
      {/* Clock Ticks */}
      <line x1="0" y1="-17" x2="0" y2="-13" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
      <line x1="0" y1="17" x2="0" y2="13" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
      <line x1="-17" y1="0" x2="-13" y2="0" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
      <line x1="17" y1="0" x2="13" y2="0" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
      {/* Clock Hands (10:10) */}
      <line x1="0" y1="0" x2="-8" y2="-9" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="0" y1="0" x2="11" y2="-5" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="0" cy="0" r="2.5" fill="#f59e0b" />
    </g>

    {/* LAYER 3: Large Wooden Framed Blackboard */}
    <g transform="translate(195, 25)" filter="url(#heroPaperDeep)">
      {/* Outer Wood Frame */}
      <rect x="0" y="0" width="195" height="120" rx="10" fill="url(#woodBevel)" stroke="#78350f" strokeWidth="2" />
      {/* Inner Wood Frame Highlight */}
      <rect x="5" y="5" width="185" height="110" rx="7" fill="#92400e" />
      {/* Chalkboard Surface */}
      <rect x="10" y="10" width="175" height="100" rx="5" fill="url(#boardSlateGrad)" />
      
      {/* Chalk Tray */}
      <rect x="6" y="116" width="183" height="7" rx="2" fill="#78350f" />
      <rect x="25" y="114" width="14" height="3.5" rx="1" fill="#ffffff" />
      <rect x="44" y="114" width="10" height="3.5" rx="1" fill="#fef08a" />
      <rect x="58" y="114" width="12" height="3.5" rx="1" fill="#38bdf8" />

      {/* Chalk Math Formulas & Geometry Diagrams */}
      <g opacity="0.8">
        <path d="M 24 30 C 32 24, 44 34, 52 26" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <path d="M 24 42 L 50 42 M 37 36 L 37 48" stroke="#38bdf8" strokeWidth="1.4" strokeLinecap="round" />
        <text x="24" y="66" fill="#fde047" fontSize="12" fontWeight="bold" fontFamily="monospace">E = mc²</text>
        <path d="M 24 82 L 42 82 M 48 82 L 60 82" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" />
        {/* Sine Wave graph */}
        <path d="M 24 96 Q 34 88, 44 96 T 64 96" stroke="#a7f3d0" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </g>

      {/* Stack of 3 Books on Board Ledge + Graduation Cap */}
      <g transform="translate(80, 58)">
        {/* Book 1 (Bottom - Amber Gold) */}
        <rect x="0" y="20" width="88" height="14" rx="2.5" fill="#d97706" />
        <rect x="4" y="22" width="80" height="10" rx="1.5" fill="#fef3c7" />
        <rect x="0" y="20" width="14" height="14" rx="2" fill="#b45309" />

        {/* Book 2 (Middle - Emerald Green) */}
        <rect x="6" y="10" width="78" height="13" rx="2.5" fill="#059669" />
        <rect x="10" y="12" width="70" height="9" rx="1.5" fill="#ecfdf5" />
        <rect x="6" y="10" width="12" height="13" rx="2" fill="#047857" />

        {/* Book 3 (Top - Royal Sky Blue) */}
        <rect x="14" y="0" width="68" height="13" rx="2.5" fill="#0284c7" />
        <rect x="18" y="2" width="60" height="9" rx="1.5" fill="#f0f9ff" />
        <rect x="14" y="0" width="11" height="13" rx="2" fill="#0369a1" />

        {/* 3D Graduation Cap on Top */}
        <g transform="translate(42, -16)" filter="url(#heroPaperDeep)">
          {/* Diamond Cap Mortarboard */}
          <path d="M 0 -10 L 34 0 L 0 10 L -34 0 Z" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.2" />
          <path d="M 0 -8 L 30 0 L 0 8 L -30 0 Z" fill="#0369a1" />
          {/* Cap Skull Underneath */}
          <path d="M -18 2 L -18 12 C -18 20, 18 20, 18 12 L 18 2 Z" fill="#075985" />
          {/* Golden Tassel */}
          <path d="M 0 0 L 26 8 L 26 22" stroke="#fbbf24" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="26" cy="24" r="3.5" fill="#f59e0b" />
          <circle cx="0" cy="0" r="3" fill="#fde047" />
        </g>
      </g>
    </g>

    {/* LAYER 4: Bookshelf with Potted Plant & Books (Right Edge) */}
    <g transform="translate(400, 105)" filter="url(#heroPaperMedium)">
      {/* Bookshelf Frame */}
      <rect x="0" y="0" width="75" height="160" rx="5" fill="#92400e" stroke="#78350f" strokeWidth="2" />
      {/* Top Shelf */}
      <rect x="5" y="5" width="65" height="46" fill="#b45309" />
      {/* Middle Shelf */}
      <rect x="5" y="56" width="65" height="46" fill="#b45309" />
      {/* Bottom Shelf */}
      <rect x="5" y="107" width="65" height="48" fill="#b45309" />

      {/* Top Shelf: Potted Plant */}
      <g transform="translate(20, 14)">
        <rect x="5" y="22" width="20" height="15" rx="2.5" fill="#fed7aa" stroke="#f97316" strokeWidth="1.2" />
        {/* Plant Leaves */}
        <path d="M 15 22 C 7 6, 12 0, 15 -4 C 18 0, 23 6, 15 22 Z" fill="#22c55e" />
        <path d="M 11 20 C 0 12, 7 3, 11 20 Z" fill="#16a34a" />
        <path d="M 19 20 C 30 12, 23 3, 19 20 Z" fill="#15803d" />
      </g>

      {/* Middle Shelf: Vertical Books */}
      <rect x="11" y="64" width="9" height="34" rx="1.5" fill="#0284c7" />
      <rect x="22" y="60" width="10" height="38" rx="1.5" fill="#38bdf8" />
      <rect x="34" y="66" width="9" height="32" rx="1.5" fill="#fbbf24" />
      <rect x="45" y="62" width="10" height="36" rx="1.5" fill="#10b981" />

      {/* Bottom Shelf: Stacked Books */}
      <rect x="11" y="138" width="53" height="9" rx="1.5" fill="#e2e8f0" />
      <rect x="14" y="129" width="48" height="9" rx="1.5" fill="#38bdf8" />
      <rect x="18" y="120" width="40" height="9" rx="1.5" fill="#fbbf24" />
    </g>

    {/* LAYER 5: Yellow Teacher Swivel Chair */}
    <g transform="translate(340, 148)" filter="url(#heroPaperDeep)">
      {/* Chair Backrest */}
      <path d="M 12 0 C 3 0, 0 12, 0 28 C 0 44, 5 56, 16 58 L 36 58 C 47 56, 52 44, 52 28 C 52 12, 49 0, 40 0 Z" fill="url(#chairAmberGrad)" stroke="#d97706" strokeWidth="1.8" />
      <rect x="12" y="12" width="28" height="30" rx="5" fill="#fde047" opacity="0.6" />
      {/* Chair Seat */}
      <rect x="-5" y="54" width="62" height="16" rx="7" fill="#d97706" stroke="#b45309" strokeWidth="1.2" />
      {/* Chair Stem */}
      <rect x="22" y="68" width="8" height="28" fill="#475569" />
      {/* Wheels Base */}
      <path d="M 2 96 L 50 96" stroke="#334155" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="4" cy="99" r="3.5" fill="#0f172a" />
      <circle cx="48" cy="99" r="3.5" fill="#0f172a" />
      <circle cx="26" cy="99" r="3.5" fill="#0f172a" />
    </g>

    {/* LAYER 6: Teacher Desk Surface, Laptop & Mug */}
    <g transform="translate(200, 185)" filter="url(#heroPaperDeep)">
      {/* Desk Surface Tabletop */}
      <rect x="0" y="0" width="195" height="16" rx="4.5" fill="url(#deskWoodGrad)" stroke="#78350f" strokeWidth="1.8" />
      <rect x="4" y="2" width="187" height="4.5" rx="2" fill="#fbbf24" opacity="0.4" />
      {/* Desk Legs */}
      <rect x="15" y="16" width="11" height="78" rx="2" fill="#78350f" />
      <rect x="168" y="16" width="11" height="78" rx="2" fill="#78350f" />
      <rect x="26" y="48" width="142" height="6" rx="1.5" fill="#92400e" opacity="0.6" />

      {/* Laptop on Desk */}
      <g transform="translate(28, -38)">
        {/* Laptop Screen */}
        <path d="M 9 0 L 58 0 C 60 0, 62 2, 62 4 L 58 32 C 58 34, 56 36, 54 36 L 13 36 C 11 36, 9 34, 9 32 L 5 4 C 5 2, 7 0, 9 0 Z" fill="#94a3b8" stroke="#64748b" strokeWidth="1.6" />
        <rect x="10" y="4" width="47" height="25" rx="2" fill="#0284c7" />
        {/* Screen Data & Pie Chart */}
        <path d="M 16 11 L 30 11 M 16 17 L 42 17 M 16 22 L 35 22" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
        <circle cx="46" cy="12" r="5" fill="#38bdf8" />
        {/* Laptop Base */}
        <path d="M 0 36 L 67 36 L 62 41 L 5 41 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.2" />
      </g>

      {/* Coffee Mug on Desk */}
      <g transform="translate(110, -20)">
        <rect x="0" y="5" width="16" height="15" rx="3.5" fill="#0284c7" />
        <path d="M 16 8 C 21 8, 21 17, 16 17" stroke="#0284c7" strokeWidth="2.2" fill="none" />
        {/* Steam */}
        <path d="M 4 0 C 3 -3, 6 -5, 5 -8" stroke="#93c5fd" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.75" />
        <path d="M 10 1 C 9 -2, 12 -4, 11 -7" stroke="#93c5fd" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.75" />
      </g>
    </g>
  </svg>
);

// ============================================================================
// 2. OVERVIEW: 3D Paper-Cut Analytics Window
// ============================================================================
export const OverviewIllustration: React.FC<IllustrationProps> = ({ className = "w-20 h-16" }) => (
  <svg viewBox="0 0 140 110" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="ov3dDepth" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#0284c7" floodOpacity="0.25" />
      </filter>
    </defs>
    <g filter="url(#ov3dDepth)">
      <rect x="14" y="12" width="112" height="86" rx="16" fill="#ffffff" stroke="#bae6fd" strokeWidth="2" />
      <rect x="14" y="12" width="112" height="22" rx="16" fill="#e0f2fe" />
      <circle cx="28" cy="23" r="3.5" fill="#38bdf8" />
      <circle cx="38" cy="23" r="3.5" fill="#7dd3fc" />
      <circle cx="48" cy="23" r="3.5" fill="#bae6fd" />

      {/* 3 Dimensional Bar Columns */}
      <rect x="28" y="60" width="14" height="28" rx="4" fill="#7dd3fc" />
      <rect x="47" y="45" width="14" height="43" rx="4" fill="#38bdf8" />
      <rect x="66" y="34" width="14" height="54" rx="4" fill="#0284c7" />
      <line x1="22" y1="91" x2="86" y2="91" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />

      {/* Donut Chart */}
      <g transform="translate(100, 64)">
        <circle cx="0" cy="0" r="17" fill="#38bdf8" />
        <path d="M 0 0 L 17 0 A 17 17 0 0 1 -5 16 Z" fill="#f59e0b" />
        <path d="M 0 0 L -5 16 A 17 17 0 0 1 -16 -5 Z" fill="#2563eb" />
        <circle cx="0" cy="0" r="8.5" fill="#ffffff" />
      </g>
    </g>
  </svg>
);

// ============================================================================
// 3. TASKS: Emerald Checklist Clipboard with Metallic Clamp & Pencil
// ============================================================================
export const TaskIllustration: React.FC<IllustrationProps> = ({ className = "w-20 h-16" }) => (
  <svg viewBox="0 0 140 110" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="task3dDepth" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#059669" floodOpacity="0.25" />
      </filter>
    </defs>
    <g filter="url(#task3dDepth)">
      <rect x="30" y="14" width="80" height="88" rx="14" fill="#059669" />
      <rect x="36" y="24" width="68" height="72" rx="10" fill="#ffffff" stroke="#a7f3d0" strokeWidth="1.8" />

      {/* Top Clip */}
      <rect x="52" y="8" width="36" height="14" rx="4" fill="#1e293b" />
      <rect x="58" y="11" width="24" height="6" rx="2" fill="#94a3b8" />
      <circle cx="70" cy="4" r="3.5" fill="#047857" stroke="#34d399" strokeWidth="1.5" />

      {/* Checkmarks & Rows */}
      <path d="M 44 38 L 48 42 L 56 34" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="60" y="36" width="36" height="5" rx="2" fill="#10b981" />

      <path d="M 44 54 L 48 58 L 56 50" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="60" y="52" width="32" height="5" rx="2" fill="#10b981" />

      <path d="M 44 70 L 48 74 L 56 66" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="60" y="68" width="38" height="5" rx="2" fill="#10b981" />

      {/* Row 4 Pending */}
      <circle cx="48" cy="83" r="3.5" fill="#d1fae5" stroke="#10b981" strokeWidth="1.8" />
      <rect x="60" y="81" width="26" height="4.5" rx="2" fill="#cbd5e1" />
    </g>
  </svg>
);

// ============================================================================
// 4. STUDENTS: Lavender Layered Student Avatars
// ============================================================================
export const StudentsIllustration: React.FC<IllustrationProps> = ({ className = "w-20 h-16" }) => (
  <svg viewBox="0 0 140 110" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="stud3dDepth" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#7c3aed" floodOpacity="0.25" />
      </filter>
    </defs>
    <g filter="url(#stud3dDepth)">
      {/* Student 1 (Left Back) */}
      <g transform="translate(32, 26)">
        <circle cx="16" cy="16" r="16" fill="#ddd6fe" stroke="#c4b5fd" strokeWidth="1.5" />
        <circle cx="16" cy="12" r="7" fill="#7c3aed" />
        <path d="M 5 28 C 5 22, 27 22, 27 28 Z" fill="#7c3aed" />
      </g>

      {/* Student 3 (Right Back) */}
      <g transform="translate(76, 26)">
        <circle cx="16" cy="16" r="16" fill="#ddd6fe" stroke="#c4b5fd" strokeWidth="1.5" />
        <circle cx="16" cy="12" r="7" fill="#8b5cf6" />
        <path d="M 5 28 C 5 22, 27 22, 27 28 Z" fill="#8b5cf6" />
      </g>

      {/* Student 2 (Center Front - Hero with Graduation Cap) */}
      <g transform="translate(50, 16)">
        <circle cx="20" cy="20" r="20" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2.5" />
        <circle cx="20" cy="15" r="9" fill="#6d28d9" />
        <path d="M 6 36 C 6 28, 34 28, 34 36 Z" fill="#6d28d9" />
        {/* Cap on top of center student */}
        <g transform="translate(20, 6)">
          <path d="M -14 0 L 0 -5 L 14 0 L 0 5 Z" fill="#1e1b4b" />
          <path d="M 0 0 L 10 3 L 10 9" stroke="#fbbf24" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="10" cy="10" r="1.5" fill="#f59e0b" />
        </g>
      </g>
    </g>
  </svg>
);

// ============================================================================
// 5. STREAM: Amber Layered Speech Bubbles
// ============================================================================
export const StreamIllustration: React.FC<IllustrationProps> = ({ className = "w-20 h-16" }) => (
  <svg viewBox="0 0 140 110" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="stream3dDepth" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#d97706" floodOpacity="0.25" />
      </filter>
    </defs>
    <g filter="url(#stream3dDepth)">
      {/* Background Bubble (White with Blue lines) */}
      <g transform="translate(24, 16)">
        <path d="M 12 0 L 76 0 C 82 0, 88 6, 88 12 L 88 42 C 88 48, 82 54, 76 54 L 32 54 L 18 64 L 22 54 L 12 54 C 6 54, 0 48, 0 42 L 0 12 C 0 6, 6 0, 12 0 Z" fill="#ffffff" stroke="#fde68a" strokeWidth="2" />
        <rect x="16" y="16" width="56" height="5" rx="2" fill="#f59e0b" />
        <rect x="16" y="26" width="40" height="5" rx="2" fill="#fbbf24" />
      </g>

      {/* Foreground Bubble (Amber Gold) */}
      <g transform="translate(42, 42)">
        <path d="M 10 0 L 68 0 C 74 0, 78 4, 78 10 L 78 36 C 78 42, 74 46, 68 46 L 56 46 L 60 55 L 48 46 L 10 46 C 4 46, 0 42, 0 36 L 0 10 C 0 4, 4 0, 10 0 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="1.8" />
        <circle cx="20" cy="23" r="3.5" fill="#ffffff" />
        <circle cx="34" cy="23" r="3.5" fill="#ffffff" />
        <circle cx="48" cy="23" r="3.5" fill="#ffffff" />
      </g>
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
// 13. AI TEACHING INTELLIGENCE: Left-Facing Silhouette with Brain & Glowing Bulb
// ============================================================================
export const AITeachingIntelligenceIllustration: React.FC<IllustrationProps> = ({ className = "w-36 h-28" }) => (
  <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="aiGlow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#fde047" floodOpacity="0.45" />
      </filter>
      <filter id="headShadow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="-2" dy="4" stdDeviation="5" floodColor="#0f0c29" floodOpacity="0.35" />
      </filter>
      {/* Background Curved Layered Waves */}
      <linearGradient id="aiWave1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#4338ca" />
        <stop offset="100%" stopColor="#1e1b4b" />
      </linearGradient>
      <linearGradient id="aiWave2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#312e81" />
      </linearGradient>
      <linearGradient id="aiWave3" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#3730a3" />
      </linearGradient>
    </defs>

    {/* Layered Cut-Paper Background Silhouette Waves (Curving on Right) */}
    <path d="M 0 0 C 40 40, 50 90, 80 140 L 160 140 L 160 0 Z" fill="url(#aiWave1)" opacity="0.6" />
    <path d="M 30 0 C 65 35, 75 85, 105 140 L 160 140 L 160 0 Z" fill="url(#aiWave2)" opacity="0.45" />
    <path d="M 60 0 C 90 30, 105 75, 130 140 L 160 140 L 160 0 Z" fill="url(#aiWave3)" opacity="0.35" />

    {/* Left-Facing Human Head Profile (Lavender Paper Silhouette) */}
    <g transform="translate(10, 10)" filter="url(#headShadow)">
      {/* Profile Head Outline */}
      <path
        d="M 125 125 L 125 35 C 125 15, 105 5, 80 5 C 60 5, 42 16, 36 30 C 34 35, 30 42, 22 45 C 18 47, 18 52, 22 55 C 26 58, 28 62, 26 66 C 24 70, 20 73, 24 78 C 28 82, 32 82, 34 88 C 36 94, 30 102, 36 108 C 42 114, 52 118, 65 120 L 70 125 Z"
        fill="#c7d2fe"
      />

      {/* Brain Cavity (White / Cream Multi-Lobed Paper Cloud) */}
      <g transform="translate(68, 14)">
        {/* Brain Lobes */}
        <path
          d="M 0 25 C -8 18, -8 6, 2 0 C 12 -6, 26 -2, 32 8 C 38 0, 50 2, 54 12 C 58 22, 52 32, 46 36 C 52 44, 46 56, 36 58 C 28 60, 20 56, 16 50 C 8 54, -2 46, 0 38 C 2 34, 0 28, 0 25 Z"
          fill="#ffffff"
          stroke="#e0e7ff"
          strokeWidth="1.5"
        />

        {/* Glowing Golden Lightbulb in Brain */}
        <g transform="translate(25, 28)" filter="url(#aiGlow)">
          {/* Radiant Bulb Body */}
          <circle cx="0" cy="0" r="10" fill="#fde047" />
          <path d="M -7 5 C -7 10, -4 14, -3 18 L 3 18 C 4 14, 7 10, 7 5 Z" fill="#fde047" />
          
          {/* Inner Filament */}
          <path d="M -3 3 L -1 -3 L 1 -3 L 3 3" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          
          {/* Metallic Base */}
          <rect x="-3.5" y="18" width="7" height="3" rx="1" fill="#94a3b8" />
          <rect x="-2" y="21" width="4" height="2" rx="1" fill="#64748b" />
        </g>
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
