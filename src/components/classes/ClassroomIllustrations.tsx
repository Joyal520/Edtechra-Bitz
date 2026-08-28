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
  <img
    src="/assets/ChatGPT Image Aug 28, 2026, 04_09_59 PM.png"
    alt="Overview"
    className={`object-contain ${className}`}
    loading="lazy"
  />
);

// ============================================================================
// 3. TASKS: Emerald Checklist Clipboard with Metallic Clamp & Pencil
// ============================================================================
export const TaskIllustration: React.FC<IllustrationProps> = ({ className = "w-20 h-16" }) => (
  <img
    src="/assets/ChatGPT Image Aug 28, 2026, 04_12_41 PM.png"
    alt="Tasks"
    className={`object-contain ${className}`}
    loading="lazy"
  />
);

// ============================================================================
// 4. STUDENTS: Lavender Layered Student Avatars
// ============================================================================
export const StudentsIllustration: React.FC<IllustrationProps> = ({ className = "w-20 h-16" }) => (
  <img
    src="/assets/ChatGPT Image Aug 28, 2026, 04_13_06 PM.png"
    alt="Students"
    className={`object-contain ${className}`}
    loading="lazy"
  />
);

// ============================================================================
// 5. STREAM: Amber Layered Speech Bubbles
// ============================================================================
export const StreamIllustration: React.FC<IllustrationProps> = ({ className = "w-20 h-16" }) => (
  <img
    src="/assets/ChatGPT Image Aug 28, 2026, 04_13_17 PM.png"
    alt="Stream"
    className={`object-contain ${className}`}
    loading="lazy"
  />
);

// ============================================================================
// 6. RESOURCES: Golden-Peach File Folder with Papers
// ============================================================================
export const ResourcesIllustration: React.FC<IllustrationProps> = ({ className = "w-20 h-16" }) => (
  <img
    src="/assets/ChatGPT Image Aug 28, 2026, 04_15_06 PM.png"
    alt="Resources"
    className={`object-contain ${className}`}
    loading="lazy"
  />
);

// ============================================================================
// 7. ASSIGN YOUR STUDENTS: Graduation Cap Guiding Students
// ============================================================================
export const AssignStudentsIllustration: React.FC<IllustrationProps> = ({ className = "w-24 h-20" }) => (
  <img
    src="/assets/ChatGPT Image Aug 28, 2026, 04_17_45 PM.png"
    alt="Assign Your Students"
    className={`object-contain ${className}`}
    loading="lazy"
  />
);

// ============================================================================
// 8. LIVE QUIZ: Screen with LIVE Badge & Golden Trophy
// ============================================================================
export const LiveQuizIllustration: React.FC<IllustrationProps> = ({ className = "w-24 h-20" }) => (
  <img
    src="/assets/ChatGPT Image Aug 28, 2026, 04_20_42 PM.png"
    alt="Live Quiz"
    className={`object-contain ${className}`}
    loading="lazy"
  />
);

// ============================================================================
// 9. EXAM: Exam Paper Clipboard with Glowing Red A+ Stamp
// ============================================================================
export const ExamIllustration: React.FC<IllustrationProps> = ({ className = "w-24 h-20" }) => (
  <img
    src="/assets/ChatGPT Image Aug 28, 2026, 04_20_56 PM.png"
    alt="Exam"
    className={`object-contain ${className}`}
    loading="lazy"
  />
);

// ============================================================================
// 10. OCR ASSESSMENT: Worksheet with 4 Purple Scanning Brackets & OCR Tag
// ============================================================================
export const OCRIllustration: React.FC<IllustrationProps> = ({ className = "w-24 h-20" }) => (
  <img
    src="/assets/ChatGPT Image Aug 28, 2026, 04_24_25 PM.png"
    alt="OCR Assessment"
    className={`object-contain ${className}`}
    loading="lazy"
  />
);

// ============================================================================
// 11. COMPETITION: Golden Championship Trophy with Star
// ============================================================================
export const CompetitionIllustration: React.FC<IllustrationProps> = ({ className = "w-24 h-20" }) => (
  <img
    src="/assets/ChatGPT Image Aug 28, 2026, 04_27_39 PM.png"
    alt="Competition"
    className={`object-contain ${className}`}
    loading="lazy"
  />
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
  <img
    src="/assets/ChatGPT Image Aug 28, 2026, 04_29_38 PM.png"
    alt="Create a Course"
    className={`object-contain ${className}`}
    loading="lazy"
  />
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
