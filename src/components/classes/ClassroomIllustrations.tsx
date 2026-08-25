import React from 'react';

interface IllustrationProps {
  className?: string;
  size?: number;
}

// 1. OVERVIEW: Analytics dashboard window with charts and pie graph
export const OverviewIllustration: React.FC<IllustrationProps> = ({ className = "w-28 h-24" }) => (
  <svg viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="ovShadow" x="-10" y="-10" width="180" height="150" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#38bdf8" floodOpacity="0.2" />
      </filter>
      <linearGradient id="ovWindowBg" x1="0" y1="0" x2="160" y2="130" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#f0f7ff" />
      </linearGradient>
      <linearGradient id="ovBlueBar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
      <linearGradient id="ovDarkBlueBar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
      <linearGradient id="ovAmberBar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
    {/* Window Container */}
    <rect x="15" y="15" width="130" height="96" rx="14" fill="url(#ovWindowBg)" stroke="#bae6fd" strokeWidth="2" filter="url(#ovShadow)" />
    
    {/* Window Header Bar */}
    <rect x="15" y="15" width="130" height="24" rx="14" fill="#e0f2fe" />
    <circle cx="28" cy="27" r="3.5" fill="#38bdf8" />
    <circle cx="38" cy="27" r="3.5" fill="#7dd3fc" />
    <circle cx="48" cy="27" r="3.5" fill="#bae6fd" />
    <rect x="62" y="24" width="40" height="6" rx="3" fill="#93c5fd" opacity="0.6" />

    {/* Left: Bar Charts */}
    <rect x="30" y="76" width="10" height="22" rx="4" fill="url(#ovBlueBar)" />
    <rect x="44" y="62" width="10" height="36" rx="4" fill="url(#ovDarkBlueBar)" />
    <rect x="58" y="50" width="10" height="48" rx="4" fill="url(#ovBlueBar)" />
    <line x1="26" y1="100" x2="72" y2="100" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />

    {/* Right: Pie Chart */}
    <g transform="translate(108, 72)">
      {/* Pie slice - Blue */}
      <circle cx="0" cy="0" r="22" fill="#38bdf8" />
      {/* Pie slice - Amber */}
      <path d="M 0 0 L 22 0 A 22 22 0 0 1 -7 20.8 Z" fill="url(#ovAmberBar)" />
      {/* Pie slice - Dark Blue */}
      <path d="M 0 0 L -7 20.8 A 22 22 0 0 1 -20.8 -7 Z" fill="#2563eb" />
      {/* Pie Center hole for donut look */}
      <circle cx="0" cy="0" r="10" fill="#ffffff" />
    </g>
  </svg>
);

// 2. TASK: Green checklist clipboard
export const TaskIllustration: React.FC<IllustrationProps> = ({ className = "w-28 h-24" }) => (
  <svg viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="taskShadow" x="-10" y="-10" width="180" height="150" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#34d399" floodOpacity="0.2" />
      </filter>
      <linearGradient id="taskBoardGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
    </defs>
    {/* Clipboard Base */}
    <rect x="36" y="20" width="88" height="98" rx="14" fill="url(#taskBoardGrad)" filter="url(#taskShadow)" />
    
    {/* Clipboard Inner Sheet */}
    <rect x="44" y="32" width="72" height="78" rx="8" fill="#ffffff" stroke="#a7f3d0" strokeWidth="1.5" />

    {/* Top Metallic Clip */}
    <rect x="62" y="12" width="36" height="14" rx="4" fill="#334155" />
    <rect x="69" y="16" width="22" height="6" rx="2" fill="#94a3b8" />
    <circle cx="80" cy="8" r="4" fill="#047857" stroke="#34d399" strokeWidth="2" />

    {/* Item 1 */}
    <path d="M 52 48 L 56 52 L 63 44" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="68" y="46" width="38" height="5" rx="2.5" fill="#10b981" opacity="0.85" />

    {/* Item 2 */}
    <path d="M 52 64 L 56 68 L 63 60" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="68" y="62" width="34" height="5" rx="2.5" fill="#10b981" opacity="0.85" />

    {/* Item 3 */}
    <path d="M 52 80 L 56 84 L 63 76" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="68" y="78" width="40" height="5" rx="2.5" fill="#10b981" opacity="0.85" />

    {/* Item 4 */}
    <circle cx="56" cy="94" r="3.5" fill="#d1fae5" stroke="#10b981" strokeWidth="1.5" />
    <rect x="68" y="92" width="28" height="4" rx="2" fill="#cbd5e1" />
  </svg>
);

// 3. STUDENTS: Avatar group of boy and girl students
export const StudentsIllustration: React.FC<IllustrationProps> = ({ className = "w-28 h-24" }) => (
  <svg viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="studShadow" x="-10" y="-10" width="180" height="150" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#818cf8" floodOpacity="0.22" />
      </filter>
      <linearGradient id="studDisc" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ede9fe" />
        <stop offset="100%" stopColor="#e0e7ff" />
      </linearGradient>
    </defs>
    {/* Soft Lavender Background Disc */}
    <circle cx="80" cy="65" r="48" fill="url(#studDisc)" filter="url(#studShadow)" />

    {/* Left Student (Boy - in purple/indigo) */}
    <g transform="translate(42, 38)">
      {/* Hair */}
      <path d="M 12 18 C 10 6, 26 2, 32 10 C 35 12, 36 20, 32 24 C 28 20, 14 20, 12 18 Z" fill="#1e1b4b" />
      {/* Face */}
      <circle cx="22" cy="22" r="12" fill="#fcd34d" />
      {/* Neck */}
      <rect x="19" y="32" width="6" height="6" fill="#f59e0b" />
      {/* Clothes / Shirt */}
      <path d="M 6 48 C 6 36, 38 36, 38 48 Z" fill="#6366f1" />
    </g>

    {/* Right Student (Girl - in blue/sky) */}
    <g transform="translate(74, 42)">
      {/* Long Hair Back */}
      <path d="M 10 16 C 8 2, 36 2, 34 16 C 36 28, 38 40, 36 44 L 8 44 C 6 40, 8 28, 10 16 Z" fill="#0f172a" />
      {/* Face */}
      <circle cx="22" cy="20" r="11" fill="#fed7aa" />
      {/* Hair Bangs */}
      <path d="M 12 16 C 16 10, 28 10, 32 16 C 28 14, 16 14, 12 16 Z" fill="#0f172a" />
      {/* Neck */}
      <rect x="19" y="29" width="6" height="5" fill="#f97316" />
      {/* Clothes / Shirt */}
      <path d="M 8 46 C 8 35, 36 35, 36 46 Z" fill="#38bdf8" />
    </g>
  </svg>
);

// 4. STREAM: Stack of colourful textbooks
export const StreamIllustration: React.FC<IllustrationProps> = ({ className = "w-28 h-24" }) => (
  <svg viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="streamShadow" x="-10" y="-10" width="180" height="150" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#f59e0b" floodOpacity="0.2" />
      </filter>
    </defs>
    <g filter="url(#streamShadow)">
      {/* Book 3 (Bottom - Sky Blue) */}
      <rect x="30" y="82" width="98" height="18" rx="5" fill="#0284c7" />
      <rect x="34" y="85" width="90" height="12" rx="3" fill="#ffffff" />
      <rect x="30" y="82" width="18" height="18" rx="5" fill="#0369a1" />
      <line x1="38" y1="84" x2="38" y2="98" stroke="#38bdf8" strokeWidth="2" />

      {/* Book 2 (Middle - Emerald/Teal) */}
      <rect x="34" y="62" width="90" height="17" rx="5" fill="#059669" />
      <rect x="38" y="65" width="82" height="11" rx="3" fill="#ffffff" />
      <rect x="34" y="62" width="16" height="17" rx="5" fill="#047857" />
      <line x1="41" y1="64" x2="41" y2="77" stroke="#34d399" strokeWidth="2" />

      {/* Book 1 (Top - Orange / Coral) */}
      <rect x="40" y="42" width="82" height="18" rx="5" fill="#ea580c" />
      <rect x="44" y="45" width="74" height="12" rx="3" fill="#ffffff" />
      <rect x="40" y="42" width="16" height="18" rx="5" fill="#c2410c" />
      <line x1="47" y1="44" x2="47" y2="58" stroke="#fdba74" strokeWidth="2" />

      {/* Ribbon Bookmark coming out of top book */}
      <path d="M 58 42 L 58 28 L 65 33 L 72 28 L 72 42 Z" fill="#fbbf24" />
    </g>
  </svg>
);

// 5. RESOURCES: Golden folder with documents
export const ResourcesIllustration: React.FC<IllustrationProps> = ({ className = "w-28 h-24" }) => (
  <svg viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="resShadow" x="-10" y="-10" width="180" height="150" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#f43f5e" floodOpacity="0.18" />
      </filter>
      <linearGradient id="folderBack" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="folderFront" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
    <g filter="url(#resShadow)">
      {/* Folder Back Tab */}
      <path d="M 32 38 C 32 34, 35 30, 40 30 L 68 30 L 78 38 L 122 38 C 126 38, 128 41, 128 46 L 128 92 L 32 92 Z" fill="url(#folderBack)" />

      {/* Papers / Sheets inside */}
      <rect x="42" y="24" width="70" height="60" rx="4" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" transform="rotate(-4 42 24)" />
      <rect x="52" y="32" width="40" height="4" rx="2" fill="#94a3b8" transform="rotate(-4 42 24)" />
      <rect x="52" y="40" width="50" height="4" rx="2" fill="#cbd5e1" transform="rotate(-4 42 24)" />

      <rect x="50" y="22" width="68" height="60" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" transform="rotate(3 50 22)" />
      <rect x="60" y="30" width="42" height="4" rx="2" fill="#38bdf8" transform="rotate(3 50 22)" />
      <rect x="60" y="38" width="48" height="4" rx="2" fill="#cbd5e1" transform="rotate(3 50 22)" />

      {/* Folder Front Flap */}
      <path d="M 28 50 C 28 46, 32 44, 36 44 L 124 44 C 128 44, 132 46, 132 50 L 128 98 C 128 102, 124 105, 120 105 L 36 105 C 32 105, 28 102, 28 98 Z" fill="url(#folderFront)" />
      
      {/* Folder Front Detail Line */}
      <path d="M 36 52 L 124 52" stroke="#fef3c7" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </g>
  </svg>
);

// 6. ASSIGN YOUR STUDENTS: Teacher guiding students with graduation cap
export const AssignStudentsIllustration: React.FC<IllustrationProps> = ({ className = "w-32 h-28" }) => (
  <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="assignShadow" x="-10" y="-10" width="180" height="160" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#6366f1" floodOpacity="0.22" />
      </filter>
      <linearGradient id="assignDisc" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ede9fe" />
        <stop offset="100%" stopColor="#ddd6fe" />
      </linearGradient>
    </defs>
    {/* Purple Disc */}
    <circle cx="80" cy="74" r="52" fill="url(#assignDisc)" filter="url(#assignShadow)" />

    {/* Floating Graduation Cap at Top */}
    <g transform="translate(80, 24)">
      {/* Cap Diamond */}
      <path d="M 0 -8 L 24 0 L 0 8 L -24 0 Z" fill="#4338ca" />
      <path d="M -12 2 L -12 9 C -12 14, 12 14, 12 9 L 12 2 Z" fill="#312e81" />
      {/* Tassel */}
      <path d="M 0 0 L 16 7 L 16 16" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="18" r="2.5" fill="#f59e0b" />
      <circle cx="0" cy="0" r="2" fill="#fbbf24" />
    </g>

    {/* Teacher Guidance Arrow */}
    <path d="M 44 48 L 56 48 M 56 48 L 50 42" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

    {/* Student 1 (Boy) */}
    <g transform="translate(46, 56)">
      <circle cx="18" cy="18" r="11" fill="#fcd34d" />
      <path d="M 8 16 C 6 8, 22 4, 28 10 C 30 14, 28 20, 26 20 Z" fill="#1e1b4b" />
      <path d="M 4 44 C 4 33, 32 33, 32 44 Z" fill="#4f46e5" />
    </g>

    {/* Student 2 (Girl) */}
    <g transform="translate(82, 58)">
      <circle cx="18" cy="18" r="11" fill="#fed7aa" />
      <path d="M 6 16 C 6 4, 30 4, 30 16 C 32 26, 32 36, 30 42 L 6 42 C 4 36, 4 26, 6 16 Z" fill="#0f172a" />
      <circle cx="18" cy="18" r="10" fill="#fed7aa" />
      <path d="M 8 14 C 14 10, 22 10, 28 14 Z" fill="#0f172a" />
      <path d="M 4 44 C 4 34, 32 34, 32 44 Z" fill="#e11d48" />
    </g>
  </svg>
);

// 7. LIVE QUIZ: Screen with LIVE banner, Trophy, and Quiz answer cards
export const LiveQuizIllustration: React.FC<IllustrationProps> = ({ className = "w-32 h-28" }) => (
  <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="quizGlow" x="-10" y="-10" width="180" height="160" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#8b5cf6" floodOpacity="0.25" />
      </filter>
      <linearGradient id="quizBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7c3aed" />
        <stop offset="100%" stopColor="#4c1d95" />
      </linearGradient>
    </defs>
    {/* Device Screen Body */}
    <rect x="28" y="28" width="104" height="82" rx="14" fill="url(#quizBg)" filter="url(#quizGlow)" stroke="#a78bfa" strokeWidth="2" />
    
    {/* Inner Screen Area */}
    <rect x="36" y="36" width="88" height="66" rx="8" fill="#5b21b6" />

    {/* Top LIVE Banner Tag */}
    <g transform="translate(62, 14)">
      <rect x="0" y="0" width="36" height="18" rx="6" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
      <text x="18" y="13" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900" fontFamily="sans-serif">LIVE</text>
    </g>

    {/* Center Mini Trophy */}
    <g transform="translate(80, 56)">
      <path d="M -10 -8 L 10 -8 L 8 4 C 6 10, -6 10, -8 4 Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
      <path d="M -10 -5 C -14 -5, -14 0, -8 0" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
      <path d="M 10 -5 C 14 -5, 14 0, 8 0" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
      <rect x="-3" y="9" width="6" height="5" fill="#f59e0b" />
      <rect x="-7" y="14" width="14" height="4" rx="2" fill="#d97706" />
    </g>

    {/* 4 Interactive Answer Pill Cards */}
    <rect x="42" y="76" width="18" height="8" rx="3" fill="#ef4444" />
    <rect x="64" y="76" width="18" height="8" rx="3" fill="#3b82f6" />
    <rect x="86" y="76" width="18" height="8" rx="3" fill="#eab308" />
    <rect x="106" y="76" width="14" height="8" rx="3" fill="#10b981" />
  </svg>
);

// 8. EXAM: Clipboard with questions and red "A+" stamp
export const ExamIllustration: React.FC<IllustrationProps> = ({ className = "w-32 h-28" }) => (
  <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="examShadow" x="-10" y="-10" width="180" height="160" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#64748b" floodOpacity="0.25" />
      </filter>
      <filter id="aPlusGlow" x="0" y="0" width="50" height="50" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#ef4444" floodOpacity="0.35" />
      </filter>
    </defs>
    {/* Clipboard Base */}
    <rect x="38" y="24" width="84" height="96" rx="12" fill="#475569" filter="url(#examShadow)" />

    {/* Paper Sheet */}
    <rect x="46" y="34" width="68" height="78" rx="6" fill="#ffffff" />

    {/* Metallic Clip */}
    <rect x="65" y="16" width="30" height="14" rx="4" fill="#334155" />
    <rect x="71" y="20" width="18" height="5" rx="2" fill="#94a3b8" />
    <circle cx="80" cy="13" r="3.5" fill="#cbd5e1" />

    {/* Exam Question Lines */}
    <rect x="54" y="44" width="40" height="4" rx="2" fill="#3b82f6" />
    <rect x="54" y="52" width="52" height="3" rx="1.5" fill="#94a3b8" />
    <rect x="54" y="58" width="46" height="3" rx="1.5" fill="#cbd5e1" />
    
    <rect x="54" y="68" width="40" height="4" rx="2" fill="#3b82f6" />
    <rect x="54" y="76" width="50" height="3" rx="1.5" fill="#94a3b8" />
    <rect x="54" y="82" width="38" height="3" rx="1.5" fill="#cbd5e1" />

    {/* Glowing Red A+ Stamp */}
    <g transform="translate(92, 80)">
      <circle cx="16" cy="16" r="16" fill="#ef4444" filter="url(#aPlusGlow)" />
      <circle cx="16" cy="16" r="14" fill="none" stroke="#fecaca" strokeWidth="1.5" strokeDasharray="3 2" />
      <text x="16" y="21.5" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="900" fontFamily="sans-serif">A+</text>
    </g>
  </svg>
);

// 9. OCR ASSESSMENT: Document with scanning boundary corners and OCR tag
export const OCRIllustration: React.FC<IllustrationProps> = ({ className = "w-32 h-28" }) => (
  <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="ocrShadow" x="-10" y="-10" width="180" height="160" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#8b5cf6" floodOpacity="0.2" />
      </filter>
      <linearGradient id="scanBeam" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
      </linearGradient>
    </defs>
    {/* Soft Purple Background Disc */}
    <circle cx="80" cy="70" r="50" fill="#f5f3ff" />

    {/* Paper Sheet */}
    <g filter="url(#ocrShadow)">
      <path d="M 50 28 L 94 28 L 110 44 L 110 106 C 110 110, 106 112, 102 112 L 50 112 C 46 112, 42 110, 42 106 L 42 36 C 42 32, 46 28, 50 28 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
      <path d="M 94 28 L 94 44 L 110 44 Z" fill="#e2e8f0" />
      
      {/* Handwriting / Text Lines on Paper */}
      <rect x="52" y="42" width="32" height="4" rx="2" fill="#6366f1" opacity="0.8" />
      <rect x="52" y="52" width="46" height="3" rx="1.5" fill="#94a3b8" />
      <rect x="52" y="60" width="50" height="3" rx="1.5" fill="#cbd5e1" />
      <rect x="52" y="68" width="40" height="3" rx="1.5" fill="#cbd5e1" />
      <rect x="52" y="76" width="48" height="3" rx="1.5" fill="#94a3b8" />
    </g>

    {/* 4 Purple Scanning Bracket Corners */}
    <path d="M 34 42 L 34 26 L 50 26" stroke="#6366f1" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M 126 42 L 126 26 L 110 26" stroke="#6366f1" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M 34 98 L 34 114 L 50 114" stroke="#6366f1" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M 126 98 L 126 114 L 110 114" stroke="#6366f1" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

    {/* OCR Purple Pill Badge */}
    <g transform="translate(90, 88)">
      <rect x="0" y="0" width="38" height="20" rx="7" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
      <text x="19" y="14" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="900" fontFamily="sans-serif">OCR</text>
    </g>
  </svg>
);

// 10. COMPETITION: Golden Championship Trophy with Star
export const CompetitionIllustration: React.FC<IllustrationProps> = ({ className = "w-32 h-28" }) => (
  <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="tropGlow" x="-10" y="-10" width="180" height="160" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#f59e0b" floodOpacity="0.3" />
      </filter>
      <linearGradient id="goldCup" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="50%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
    </defs>
    {/* Soft Amber Disc */}
    <circle cx="80" cy="70" r="50" fill="#fef3c7" />

    <g filter="url(#tropGlow)">
      {/* Left Handle */}
      <path d="M 54 44 C 36 44, 36 68, 58 68" stroke="#ca8a04" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M 54 44 C 38 44, 38 68, 58 68" stroke="#fde047" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Right Handle */}
      <path d="M 106 44 C 124 44, 124 68, 102 68" stroke="#ca8a04" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M 106 44 C 122 44, 122 68, 102 68" stroke="#fde047" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Main Trophy Cup */}
      <path d="M 50 36 L 110 36 C 110 36, 108 72, 80 78 C 52 72, 50 36, 50 36 Z" fill="url(#goldCup)" stroke="#a16207" strokeWidth="1.5" />

      {/* Cup Rim Highlight */}
      <ellipse cx="80" cy="36" rx="30" ry="6" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />

      {/* Center White Star */}
      <path d="M 80 46 L 82.5 52 L 89 52.5 L 84 57 L 85.5 63.5 L 80 60 L 74.5 63.5 L 76 57 L 71 52.5 L 77.5 52 Z" fill="#ffffff" />

      {/* Trophy Stem */}
      <rect x="74" y="78" width="12" height="16" fill="#ca8a04" />
      <rect x="76" y="78" width="8" height="16" fill="#fde047" />

      {/* Trophy Base Pedestal */}
      <path d="M 64 94 L 96 94 L 102 108 L 58 108 Z" fill="#1e293b" />
      <rect x="62" y="98" width="36" height="6" rx="1.5" fill="#fde047" />
    </g>
  </svg>
);

// 11. SIDEBAR WORKSTATION: Dark background desk with computer, chair & plant
export const SidebarIllustration: React.FC<IllustrationProps> = ({ className = "w-full max-w-[200px]" }) => (
  <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Subtle Background Glowing Doodles */}
    <path d="M 30 40 L 40 40 M 35 35 L 35 45" stroke="#38bdf8" strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
    {/* Floating Graduation Cap Doodle */}
    <path d="M 140 38 L 155 33 L 170 38 L 155 43 Z" stroke="#818cf8" strokeWidth="1.5" fill="none" opacity="0.4" />
    <path d="M 147 40 L 147 46 C 147 48, 163 48, 163 46 L 163 40" stroke="#818cf8" strokeWidth="1.5" fill="none" opacity="0.4" />
    <circle cx="165" cy="50" r="1.5" fill="#818cf8" opacity="0.4" />

    {/* Study Desk */}
    <rect x="25" y="112" width="150" height="8" rx="3" fill="#d97706" />
    {/* Desk Legs */}
    <line x1="38" y1="120" x2="30" y2="152" stroke="#b45309" strokeWidth="4" strokeLinecap="round" />
    <line x1="162" y1="120" x2="170" y2="152" stroke="#b45309" strokeWidth="4" strokeLinecap="round" />

    {/* Laptop on Desk */}
    <path d="M 46 96 L 78 96 L 74 112 L 50 112 Z" fill="#93c5fd" stroke="#60a5fa" strokeWidth="1.5" />
    <path d="M 40 112 L 84 112" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />

    {/* Desk Plant */}
    <rect x="145" y="98" width="16" height="14" rx="2" fill="#ffffff" />
    <path d="M 153 98 C 145 84, 150 78, 153 74 C 156 78, 161 84, 153 98 Z" fill="#22c55e" />
    <path d="M 148 95 C 138 88, 142 80, 148 95 Z" fill="#16a34a" />
    <path d="M 158 95 C 168 88, 164 80, 158 95 Z" fill="#15803d" />

    {/* Modern Blue Office Chair */}
    <g transform="translate(85, 94)">
      {/* Chair Backrest */}
      <rect x="8" y="0" width="28" height="34" rx="8" fill="#3b82f6" stroke="#2563eb" strokeWidth="1.5" />
      {/* Chair Seat */}
      <rect x="0" y="28" width="44" height="10" rx="4" fill="#2563eb" />
      {/* Chair Stem */}
      <rect x="19" y="38" width="6" height="14" fill="#64748b" />
      {/* Chair Wheels Base */}
      <path d="M 10 52 L 34 52" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
      <circle cx="10" cy="54" r="2" fill="#0f172a" />
      <circle cx="34" cy="54" r="2" fill="#0f172a" />
    </g>
  </svg>
);

// 12. BOTTOM BANNER ILLUSTRATION: Plant, books and mug
export const BottomBannerIllustration: React.FC<IllustrationProps> = ({ className = "w-40 h-20" }) => (
  <svg viewBox="0 0 160 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Wooden Desk Surface */}
    <rect x="10" y="66" width="140" height="6" rx="3" fill="#d97706" />

    {/* Left Plant */}
    <g transform="translate(24, 36)">
      <rect x="8" y="18" width="12" height="12" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
      <path d="M 14 18 C 8 4, 12 0, 14 -2 C 16 0, 20 4, 14 18 Z" fill="#22c55e" />
      <path d="M 10 16 C 2 10, 8 2, 10 16 Z" fill="#16a34a" />
      <path d="M 18 16 C 26 10, 20 2, 18 16 Z" fill="#15803d" />
    </g>

    {/* Stack of 3 Books */}
    <g transform="translate(54, 38)">
      {/* Book 3 (Bottom) */}
      <rect x="0" y="20" width="46" height="8" rx="2" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
      <rect x="0" y="20" width="8" height="8" rx="2" fill="#0284c7" />

      {/* Book 2 (Middle) */}
      <rect x="2" y="11" width="42" height="8" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
      <rect x="2" y="11" width="8" height="8" rx="2" fill="#f59e0b" />

      {/* Book 1 (Top) */}
      <rect x="5" y="2" width="36" height="8" rx="2" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
      <rect x="5" y="2" width="7" height="8" rx="2" fill="#8b5cf6" />
    </g>

    {/* Coffee / Tea Mug with Steam */}
    <g transform="translate(112, 42)">
      {/* Mug Handle */}
      <path d="M 18 8 C 24 8, 24 18, 18 18" stroke="#8b5cf6" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Mug Cup */}
      <rect x="0" y="4" width="20" height="20" rx="4" fill="#7c3aed" />
      <rect x="2" y="6" width="16" height="4" rx="2" fill="#6d28d9" />
      {/* Steam curves */}
      <path d="M 6 0 C 4 -4, 8 -6, 6 -10" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M 12 2 C 10 -2, 14 -4, 12 -8" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />
    </g>
  </svg>
);
