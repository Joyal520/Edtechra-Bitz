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
// 2. OVERVIEW: 3D Analytics & Performance Window (Transparent SVG)
// ============================================================================
export const OverviewIllustration: React.FC<IllustrationProps> = ({ className = "w-20 h-16" }) => (
  <svg viewBox="0 0 80 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Window Base */}
    <rect x="8" y="10" width="64" height="46" rx="8" fill="#0284c7" />
    <rect x="8" y="10" width="64" height="12" rx="8" fill="#0369a1" />
    <rect x="8" y="16" width="64" height="6" fill="#0369a1" />
    {/* Window Dots */}
    <circle cx="15" cy="16" r="2" fill="#f87171" />
    <circle cx="21" cy="16" r="2" fill="#fbbf24" />
    <circle cx="27" cy="16" r="2" fill="#34d399" />
    {/* Graph Background */}
    <rect x="12" y="26" width="56" height="26" rx="4" fill="#0f172a" />
    {/* Bar Charts */}
    <rect x="18" y="38" width="6" height="10" rx="1.5" fill="#38bdf8" />
    <rect x="28" y="32" width="6" height="16" rx="1.5" fill="#818cf8" />
    <rect x="38" y="35" width="6" height="13" rx="1.5" fill="#34d399" />
    <rect x="48" y="29" width="6" height="19" rx="1.5" fill="#fbbf24" />
    {/* Line Trend */}
    <path d="M 21 37 L 31 31 L 41 34 L 51 28 L 60 24" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="60" cy="24" r="2.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
  </svg>
);

// ============================================================================
// 3. TASKS: Emerald Checklist Clipboard with Pencil (Transparent SVG)
// ============================================================================
export const TaskIllustration: React.FC<IllustrationProps> = ({ className = "w-20 h-16" }) => (
  <svg viewBox="0 0 80 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Clipboard Base */}
    <rect x="16" y="8" width="48" height="52" rx="7" fill="#059669" />
    {/* Paper Sheet */}
    <rect x="20" y="14" width="40" height="42" rx="4" fill="#f0fdf4" />
    {/* Metallic Clip */}
    <rect x="30" y="5" width="20" height="7" rx="3" fill="#047857" />
    <rect x="34" y="3" width="12" height="4" rx="2" fill="#34d399" />
    {/* Check Item 1 */}
    <rect x="25" y="20" width="6" height="6" rx="1.5" fill="#10b981" />
    <path d="M 26.5 23 L 28 24.5 L 30 21.5" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="34" y="21.5" width="20" height="3" rx="1.5" fill="#047857" />
    {/* Check Item 2 */}
    <rect x="25" y="29" width="6" height="6" rx="1.5" fill="#10b981" />
    <path d="M 26.5 32 L 28 33.5 L 30 30.5" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="34" y="30.5" width="22" height="3" rx="1.5" fill="#047857" />
    {/* Check Item 3 */}
    <rect x="25" y="38" width="6" height="6" rx="1.5" fill="#10b981" />
    <path d="M 26.5 41 L 28 42.5 L 30 39.5" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="34" y="39.5" width="16" height="3" rx="1.5" fill="#047857" />
    {/* Check Item 4 */}
    <rect x="25" y="46" width="6" height="3" rx="1.5" fill="#a7f3d0" />
    <rect x="34" y="46" width="14" height="3" rx="1.5" fill="#a7f3d0" />
    {/* Pencil */}
    <g transform="translate(56, 26) rotate(22)">
      <rect x="0" y="0" width="7" height="24" rx="2" fill="#f59e0b" />
      <path d="M 0 24 L 3.5 29 L 7 24 Z" fill="#fed7aa" />
      <path d="M 2.2 27 L 3.5 29 L 4.8 27 Z" fill="#1e293b" />
      <rect x="0" y="0" width="7" height="4" rx="1" fill="#f43f5e" />
    </g>
  </svg>
);

// ============================================================================
// 4. COURSES: Interactive Textbook with Bookmark & Ribbon (Transparent SVG)
// ============================================================================
export const CoursesIllustration: React.FC<IllustrationProps> = ({ className = "w-20 h-16" }) => (
  <svg viewBox="0 0 80 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Bottom Book (Cyan) */}
    <rect x="14" y="38" width="52" height="15" rx="3.5" fill="#0284c7" />
    <rect x="18" y="41" width="45" height="9" rx="2" fill="#e0f2fe" />
    <rect x="14" y="38" width="8" height="15" rx="2" fill="#0369a1" />
    {/* Middle Book (Indigo) */}
    <rect x="17" y="26" width="46" height="14" rx="3.5" fill="#4f46e5" />
    <rect x="21" y="28.5" width="39" height="9" rx="2" fill="#e0e7ff" />
    <rect x="17" y="26" width="8" height="14" rx="2" fill="#3730a3" />
    {/* Ribbon Bookmark Hanging Down */}
    <path d="M 46 26 L 46 44 L 50 41 L 54 44 L 54 26 Z" fill="#f59e0b" />
    {/* Top Book (Violet / Purple) */}
    <rect x="21" y="14" width="40" height="13" rx="3" fill="#7c3aed" />
    <rect x="25" y="16.5" width="33" height="8" rx="2" fill="#ede9fe" />
    <rect x="21" y="14" width="7" height="13" rx="2" fill="#5b21b6" />
    {/* Decorative Sparkle / Star */}
    <g transform="translate(23, 7)">
      <path d="M 6 0 L 7.5 4 L 12 5.5 L 7.5 7 L 6 11 L 4.5 7 L 0 5.5 L 4.5 4 Z" fill="#fbbf24" />
    </g>
  </svg>
);

// ============================================================================
// 5. STUDENTS: Lavender Layered Student Avatars (Transparent SVG)
// ============================================================================
export const StudentsIllustration: React.FC<IllustrationProps> = ({ className = "w-20 h-16" }) => (
  <svg viewBox="0 0 80 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Left Student (Lilac) */}
    <g transform="translate(14, 18)">
      <circle cx="12" cy="11" r="7.5" fill="#c084fc" />
      <path d="M 7 9 C 7 5, 17 5, 17 9 Z" fill="#581c87" />
      <path d="M 3 29 C 3 20, 21 20, 21 29 Z" fill="#9333ea" />
      <circle cx="12" cy="11" r="5.5" fill="#f5d0fe" />
      <path d="M 8 9 C 8 6, 16 6, 16 9 Z" fill="#581c87" />
    </g>
    {/* Right Student (Sky/Teal) */}
    <g transform="translate(42, 18)">
      <circle cx="12" cy="11" r="7.5" fill="#38bdf8" />
      <path d="M 7 9 C 7 5, 17 5, 17 9 Z" fill="#0c4a6e" />
      <path d="M 3 29 C 3 20, 21 20, 21 29 Z" fill="#0284c7" />
      <circle cx="12" cy="11" r="5.5" fill="#e0f2fe" />
      <path d="M 8 9 C 8 6, 16 6, 16 9 Z" fill="#0c4a6e" />
    </g>
    {/* Center Leading Student (Deep Purple with Golden Star) */}
    <g transform="translate(26, 10)">
      <circle cx="14" cy="13" r="9" fill="#fde047" stroke="#fbbf24" strokeWidth="1.5" />
      <circle cx="14" cy="13" r="8" fill="#f3e8ff" />
      <path d="M 8 11 C 8 4, 20 4, 20 11 Z" fill="#3b0764" />
      {/* Eyeglasses */}
      <circle cx="11" cy="13" r="2.2" stroke="#3b0764" strokeWidth="1" fill="none" />
      <circle cx="17" cy="13" r="2.2" stroke="#3b0764" strokeWidth="1" fill="none" />
      <line x1="13.2" y1="13" x2="14.8" y2="13" stroke="#3b0764" strokeWidth="1" />
      {/* Shoulders / Shirt */}
      <path d="M 3 37 C 3 25, 25 25, 25 37 Z" fill="#6b21a8" />
      {/* Graduation Cap / Collar */}
      <path d="M 14 26 L 11 31 L 17 31 Z" fill="#fbbf24" />
    </g>
  </svg>
);

// ============================================================================
// 6. STREAM: Amber Layered Speech Bubbles (Transparent SVG)
// ============================================================================
export const StreamIllustration: React.FC<IllustrationProps> = ({ className = "w-20 h-16" }) => (
  <svg viewBox="0 0 80 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Back Bubble (Sky Blue) */}
    <g transform="translate(36, 8)">
      <rect x="0" y="0" width="34" height="24" rx="8" fill="#38bdf8" />
      <path d="M 8 24 L 4 30 L 16 24 Z" fill="#38bdf8" />
      <line x1="8" y1="9" x2="26" y2="9" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="15" x2="20" y2="15" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </g>
    {/* Front Bubble (Warm Amber) */}
    <g transform="translate(10, 18)">
      <rect x="0" y="0" width="44" height="30" rx="10" fill="#f59e0b" />
      <path d="M 12 30 L 8 38 L 22 30 Z" fill="#f59e0b" />
      {/* Megaphone icon inside */}
      <g transform="translate(8, 7)">
        <path d="M 2 8 L 10 3 L 10 17 L 2 12 Z" fill="#ffffff" />
        <path d="M 10 3 C 13 3, 15 6, 15 10 C 15 14, 13 17, 10 17 Z" fill="#fef3c7" />
        <rect x="0" y="8" width="3" height="4" rx="1" fill="#ffffff" />
        <path d="M 6 12 L 8 18 L 10 18 L 8 12 Z" fill="#ffffff" />
        <path d="M 18 6 C 20 8, 20 12, 18 14" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <path d="M 22 3 C 25 7, 25 13, 22 17" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </g>
    </g>
  </svg>
);

// ============================================================================
// 7. RESOURCES: Golden-Peach File Folder with Papers (Transparent SVG)
// ============================================================================
export const ResourcesIllustration: React.FC<IllustrationProps> = ({ className = "w-20 h-16" }) => (
  <svg viewBox="0 0 80 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Back Folder Tab */}
    <path d="M 12 20 C 12 16, 14 14, 18 14 L 32 14 L 37 19 L 62 19 C 66 19, 68 21, 68 25 L 68 50 C 68 54, 66 56, 62 56 L 18 56 C 14 56, 12 54, 12 50 Z" fill="#e11d48" />
    {/* Protruding Document Sheets */}
    <rect x="22" y="10" width="36" height="34" rx="3" fill="#ffffff" stroke="#fecdd3" strokeWidth="1.2" />
    <line x1="28" y1="16" x2="48" y2="16" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
    <line x1="28" y1="22" x2="52" y2="22" stroke="#fda4af" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="28" y1="27" x2="44" y2="27" stroke="#fda4af" strokeWidth="1.8" strokeLinecap="round" />
    {/* Secondary Sheet (Angled) */}
    <g transform="translate(18, 14) rotate(-6)">
      <rect x="0" y="0" width="32" height="30" rx="3" fill="#fff1f2" stroke="#fda4af" strokeWidth="1" />
      <line x1="6" y1="6" x2="22" y2="6" stroke="#fb7185" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="6" y1="11" x2="26" y2="11" stroke="#fecdd3" strokeWidth="1.5" strokeLinecap="round" />
    </g>
    {/* Front Folder Pocket */}
    <path d="M 10 27 C 10 24, 12 22, 16 22 L 64 22 C 68 22, 70 24, 70 27 L 67 52 C 67 55, 65 57, 61 57 L 19 57 C 15 57, 13 55, 13 52 Z" fill="#f43f5e" />
    {/* Folder Stitch / Highlight */}
    <line x1="16" y1="26" x2="64" y2="26" stroke="#fb7185" strokeWidth="1.5" strokeLinecap="round" />
    {/* Golden Paperclip */}
    <path d="M 52 16 L 52 30 C 52 32, 55 32, 55 30 L 55 19 C 55 18, 57 18, 57 19 L 57 28" stroke="#fbbf24" strokeWidth="1.6" strokeLinecap="round" fill="none" />
  </svg>
);

// ============================================================================
// 8. ASSIGN YOUR STUDENTS: Graduation Cap Guiding Students (Transparent SVG)
// ============================================================================
export const AssignStudentsIllustration: React.FC<IllustrationProps> = ({ className = "w-24 h-20" }) => (
  <svg viewBox="0 0 96 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Base Pedestal / Classroom Desk */}
    <rect x="14" y="58" width="68" height="12" rx="4" fill="#0284c7" />
    <rect x="22" y="62" width="52" height="4" rx="2" fill="#38bdf8" />
    {/* Two Students in Foreground */}
    <circle cx="34" cy="46" r="8" fill="#c084fc" />
    <path d="M 24 58 C 24 51, 44 51, 44 58 Z" fill="#7c3aed" />
    <circle cx="62" cy="46" r="8" fill="#34d399" />
    <path d="M 52 58 C 52 51, 72 51, 72 58 Z" fill="#059669" />
    {/* Large Graduation Mortarboard Hovering Above */}
    <g transform="translate(48, 22)">
      <path d="M 0 -12 L 32 0 L 0 12 L -32 0 Z" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1.5" />
      <path d="M 0 -9 L 27 0 L 0 9 L -27 0 Z" fill="#2563eb" />
      <path d="M -16 2 L -16 11 C -16 18, 16 18, 16 11 L 16 2 Z" fill="#1d4ed8" />
      {/* Golden Tassel */}
      <path d="M 0 0 L 24 7 L 24 20" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="24" cy="21" r="3" fill="#fbbf24" />
      <circle cx="0" cy="0" r="2.5" fill="#fde047" />
    </g>
  </svg>
);

// ============================================================================
// 9. LIVE QUIZ: Screen with LIVE Badge & Golden Trophy (Transparent SVG)
// ============================================================================
export const LiveQuizIllustration: React.FC<IllustrationProps> = ({ className = "w-24 h-20" }) => (
  <svg viewBox="0 0 96 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Monitor / Tablet Frame */}
    <rect x="12" y="10" width="72" height="52" rx="9" fill="#0f172a" stroke="#334155" strokeWidth="2" />
    <rect x="16" y="14" width="64" height="44" rx="6" fill="#1e1b4b" />
    {/* Pulsing LIVE Pill */}
    <rect x="22" y="20" width="26" height="8" rx="4" fill="#ef4444" />
    <circle cx="26" cy="24" r="2" fill="#ffffff" />
    <text x="31" y="26.5" fill="#ffffff" fontSize="5.5" fontWeight="900" fontFamily="sans-serif">LIVE</text>
    {/* Golden Trophy Centered */}
    <g transform="translate(48, 38)">
      <path d="M -9 -12 L 9 -12 L 7 0 C 6 5, -6 5, -7 0 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
      {/* Handles */}
      <path d="M -9 -10 C -15 -10, -15 -2, -8 -2" stroke="#d97706" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M 9 -10 C 15 -10, 15 -2, 8 -2" stroke="#d97706" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* Trophy Stem & Base */}
      <rect x="-2.5" y="3" width="5" height="5" fill="#d97706" />
      <rect x="-7" y="8" width="14" height="4" rx="1.5" fill="#b45309" />
      {/* Star */}
      <path d="M 0 -7 L 1.2 -3.5 L 4.5 -3.5 L 2 -1.5 L 3 2 L 0 0 L -3 2 L -2 -1.5 L -4.5 -3.5 L -1.2 -3.5 Z" fill="#ffffff" />
    </g>
    {/* Stand */}
    <path d="M 42 62 L 54 62 L 57 70 L 39 70 Z" fill="#334155" />
    <rect x="32" y="70" width="32" height="3" rx="1.5" fill="#475569" />
  </svg>
);

// ============================================================================
// 10. EXAM: Exam Paper Clipboard with Glowing Red A+ Stamp (Transparent SVG)
// ============================================================================
export const ExamIllustration: React.FC<IllustrationProps> = ({ className = "w-24 h-20" }) => (
  <svg viewBox="0 0 96 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Clipboard Base */}
    <rect x="22" y="10" width="52" height="62" rx="7" fill="#1e293b" />
    {/* White Paper Sheet */}
    <rect x="26" y="16" width="44" height="52" rx="4" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
    {/* Metallic Clip */}
    <rect x="38" y="7" width="20" height="7" rx="3" fill="#475569" />
    <rect x="42" y="5" width="12" height="4" rx="2" fill="#94a3b8" />
    {/* Exam Question Lines */}
    <line x1="32" y1="24" x2="48" y2="24" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="32" y1="30" x2="58" y2="30" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
    <line x1="32" y1="35" x2="54" y2="35" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
    <line x1="32" y1="41" x2="44" y2="41" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="32" y1="47" x2="56" y2="47" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
    <line x1="32" y1="52" x2="50" y2="52" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
    {/* Glowing Red A+ Stamp */}
    <g transform="translate(56, 46)">
      <circle cx="6" cy="6" r="11" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.8" />
      <text x="3" y="10" fill="#dc2626" fontSize="11" fontWeight="900" fontFamily="sans-serif">A</text>
      <text x="10" y="8" fill="#dc2626" fontSize="8" fontWeight="900" fontFamily="sans-serif">+</text>
    </g>
  </svg>
);

// ============================================================================
// 11. OCR ASSESSMENT: Worksheet with Scanning Laser Brackets (Transparent SVG)
// ============================================================================
export const OCRIllustration: React.FC<IllustrationProps> = ({ className = "w-24 h-20" }) => (
  <svg viewBox="0 0 96 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Sheet */}
    <rect x="22" y="12" width="52" height="58" rx="6" fill="#f5f3ff" stroke="#ddd6fe" strokeWidth="1.5" />
    <line x1="30" y1="22" x2="52" y2="22" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="30" y1="28" x2="66" y2="28" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" />
    <line x1="30" y1="34" x2="60" y2="34" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" />
    <line x1="30" y1="42" x2="50" y2="42" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="30" y1="48" x2="64" y2="48" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" />
    {/* Scanning Brackets in Glowing Purple */}
    <path d="M 16 16 L 16 8 L 24 8" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M 80 16 L 80 8 L 72 8" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M 16 64 L 16 72 L 24 72" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M 80 64 L 80 72 L 72 72" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* Horizontal Scanning Laser Bar */}
    <line x1="18" y1="40" x2="78" y2="40" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" />
    <circle cx="48" cy="40" r="4" fill="#a855f7" stroke="#ffffff" strokeWidth="1" />
  </svg>
);

// ============================================================================
// 12. COMPETITION: Golden Championship Trophy with Star (Transparent SVG)
// ============================================================================
export const CompetitionIllustration: React.FC<IllustrationProps> = ({ className = "w-24 h-20" }) => (
  <svg viewBox="0 0 96 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Trophy Cup */}
    <path d="M 32 14 L 64 14 L 60 40 C 58 48, 38 48, 36 40 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
    <path d="M 35 17 L 61 17 L 58 38 C 56 44, 40 44, 38 38 Z" fill="#fde047" />
    {/* Handles */}
    <path d="M 32 20 C 18 20, 18 36, 34 36" stroke="#d97706" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M 64 20 C 78 20, 78 36, 62 36" stroke="#d97706" strokeWidth="3" fill="none" strokeLinecap="round" />
    {/* Center Star */}
    <g transform="translate(48, 28)">
      <path d="M 0 -6 L 1.8 -1.8 L 6.5 -1.8 L 2.8 1 L 4.2 5.5 L 0 2.8 L -4.2 5.5 L -2.8 1 L -6.5 -1.8 L -1.8 -1.8 Z" fill="#d97706" />
    </g>
    {/* Stem */}
    <rect x="44" y="44" width="8" height="10" rx="1" fill="#d97706" />
    {/* Pedestal Base */}
    <rect x="34" y="54" width="28" height="8" rx="2.5" fill="#92400e" />
    <rect x="30" y="62" width="36" height="6" rx="2" fill="#78350f" />
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
// 14. CREATE COURSE: Stack of Textbooks with Graduation Cap (Transparent SVG)
// ============================================================================
export const CreateCourseIllustration: React.FC<IllustrationProps> = ({ className = "w-20 h-16" }) => (
  <svg viewBox="0 0 80 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Bottom Book (Emerald) */}
    <rect x="14" y="42" width="52" height="14" rx="3.5" fill="#059669" />
    <rect x="18" y="45" width="45" height="8" rx="2" fill="#ecfdf5" />
    <rect x="14" y="42" width="8" height="14" rx="2" fill="#047857" />
    {/* Middle Book (Indigo) */}
    <rect x="18" y="30" width="44" height="13" rx="3" fill="#4338ca" />
    <rect x="22" y="32.5" width="37" height="8" rx="2" fill="#e0e7ff" />
    <rect x="18" y="30" width="7" height="13" rx="2" fill="#312e81" />
    {/* Top Book (Amber) */}
    <rect x="22" y="19" width="36" height="12" rx="3" fill="#d97706" />
    <rect x="26" y="21" width="29" height="8" rx="2" fill="#fef3c7" />
    <rect x="22" y="19" width="6" height="12" rx="2" fill="#b45309" />
    {/* Mini Graduation Cap on Top */}
    <g transform="translate(40, 10)">
      <path d="M 0 -7 L 18 0 L 0 7 L -18 0 Z" fill="#1e1b4b" stroke="#38bdf8" strokeWidth="1" />
      <path d="M -9 1 L -9 6 C -9 10, 9 10, 9 6 L 9 1 Z" fill="#0f172a" />
      <path d="M 0 0 L 14 4 L 14 11" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="14" cy="12" r="1.5" fill="#f59e0b" />
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
