// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: COURSE STUDIO WORKSPACE BACKGROUND
// Lightweight, responsive, professional SVG & CSS educational background.
// Features soft blue/cyan gradients, subtle purple accents, delicate notebook
// dot-grid patterns, soft flowing waves, abstract learning shapes, and
// understated academic motifs.
// Zero network downloads, zero layout shift, pointer-events: none.
// ============================================================================

import React from 'react';

interface Props {
  className?: string;
  isDark?: boolean;
  hideWatermarks?: boolean;
}

export const CourseStudioWorkspaceBackground: React.FC<Props> = ({
  className = '',
  isDark = false,
  hideWatermarks = false
}) => {
  return (
    <div
      aria-hidden="true"
      data-testid="course-studio-workspace-background"
      className={`absolute inset-0 pointer-events-none select-none overflow-hidden z-0 ${className}`}
    >
      {/* 1. SOFT MULTI-STOP EDUCATIONAL GRADIENT WASH */}
      <div
        className={`absolute inset-0 transition-colors duration-300 ${
          isDark
            ? 'bg-gradient-to-br from-slate-950/60 via-slate-900/40 to-indigo-950/50'
            : hideWatermarks
            ? 'bg-[#f8fafc]'
            : 'bg-gradient-to-br from-[#e6f4fe]/85 via-[#f5f9ff]/90 to-[#efeaff]/75'
        }`}
      />

      {/* 2. SOFT ATMOSPHERIC AMBIENT GLOWS (BLUE, CYAN & SUBTLE PURPLE ACCENTS) */}
      {!hideWatermarks && (
        <>
          <div
            className={`absolute -top-28 -left-24 w-96 sm:w-[540px] h-96 sm:h-[540px] rounded-full blur-3xl ${
              isDark ? 'bg-sky-500/14' : 'bg-sky-400/25'
            }`}
          />
          <div
            className={`absolute top-12 -right-24 w-80 sm:w-[480px] h-80 sm:h-[480px] rounded-full blur-3xl ${
              isDark ? 'bg-cyan-500/12' : 'bg-cyan-300/25'
            }`}
          />
          <div
            className={`absolute top-1/2 right-1/4 w-72 sm:w-[420px] h-72 sm:h-[420px] rounded-full blur-3xl ${
              isDark ? 'bg-purple-600/12' : 'bg-purple-400/16'
            }`}
          />
          <div
            className={`absolute -bottom-28 left-1/4 w-96 sm:w-[580px] h-96 sm:h-[580px] rounded-full blur-3xl ${
              isDark ? 'bg-indigo-600/14' : 'bg-blue-400/20'
            }`}
          />
        </>
      )}

      {/* 3. DELICATE NOTEBOOK DOT-GRID & SUBTLE GRAPH PAPER PATTERN (Omitted when hideWatermarks is true) */}
      {!hideWatermarks && (
        <svg
          className={`absolute inset-0 w-full h-full ${
            isDark ? 'text-sky-300 opacity-[0.12]' : 'text-[#026fc3] opacity-[0.20]'
          }`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="edtechra-studio-dot-grid"
              width="28"
              height="28"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1.35" fill="currentColor" />
            </pattern>
            <pattern
              id="edtechra-studio-major-grid"
              width="140"
              height="140"
              patternUnits="userSpaceOnUse"
            >
              <rect width="140" height="140" fill="url(#edtechra-studio-dot-grid)" />
              <path
                d="M 140 0 L 0 0 0 140"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.6"
                strokeOpacity="0.28"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#edtechra-studio-major-grid)" />
        </svg>
      )}

      {/* 4. SOFT FLOWING WAVES, ABSTRACT LEARNING SHAPES & EDUCATIONAL MOTIFS (Omitted when hideWatermarks is true) */}
      {!hideWatermarks && (
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1440 1024"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
        <defs>
          <linearGradient id="edtechra-wave-cyan-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={isDark ? '0.12' : '0.16'} />
            <stop offset="50%" stopColor="#026fc3" stopOpacity={isDark ? '0.08' : '0.11'} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={isDark ? '0.10' : '0.14'} />
          </linearGradient>

          <linearGradient id="edtechra-wave-purple-sky" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity={isDark ? '0.10' : '0.14'} />
            <stop offset="60%" stopColor="#3b82f6" stopOpacity={isDark ? '0.07' : '0.10'} />
            <stop offset="100%" stopColor="#a855f7" stopOpacity={isDark ? '0.10' : '0.13'} />
          </linearGradient>

          <linearGradient id="edtechra-stroke-accent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity={isDark ? '0.28' : '0.32'} />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity={isDark ? '0.24' : '0.28'} />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity={isDark ? '0.24' : '0.28'} />
          </linearGradient>
        </defs>

        {/* Top Flowing Layered Educational Wave */}
        <path
          d="M -80 120 C 260 20, 560 250, 920 130 C 1180 45, 1340 160, 1520 95 L 1520 0 L -80 0 Z"
          fill="url(#edtechra-wave-cyan-blue)"
        />
        <path
          d="M -100 185 C 280 85, 620 290, 980 175 C 1220 95, 1380 210, 1540 155"
          stroke="url(#edtechra-stroke-accent)"
          strokeWidth="2"
          strokeDasharray="10 8"
        />
        <path
          d="M -100 215 C 310 115, 640 315, 1010 200 C 1240 125, 1390 235, 1540 180"
          stroke="url(#edtechra-stroke-accent)"
          strokeWidth="1.2"
          opacity="0.7"
        />

        {/* Bottom Flowing Layered Wave */}
        <path
          d="M -80 860 C 280 760, 640 960, 1020 840 C 1240 770, 1380 870, 1520 820 L 1520 1024 L -80 1024 Z"
          fill="url(#edtechra-wave-purple-sky)"
        />
        <path
          d="M -80 835 C 290 735, 650 935, 1030 815 C 1250 745, 1390 845, 1520 795"
          stroke="url(#edtechra-stroke-accent)"
          strokeWidth="1.75"
        />

        {/* Top-Right: Geometric Compass, Protractor Arcs & Coordinate System */}
        <g
          transform="translate(1130, 55)"
          className={isDark ? 'text-sky-300 opacity-[0.16]' : 'text-[#026fc3] opacity-[0.22]'}
        >
          <circle cx="130" cy="130" r="115" stroke="currentColor" strokeWidth="1.75" strokeDasharray="7 7" />
          <circle cx="130" cy="130" r="78" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="130" cy="130" r="38" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 4" />
          <path d="M 15 130 H 245 M 130 15 V 245" stroke="currentColor" strokeWidth="1.2" opacity="0.65" />
          <circle cx="130" cy="130" r="5" fill="currentColor" />
          <circle cx="208" cy="130" r="4" fill="#06b6d4" />
          <circle cx="130" cy="52" r="4" fill="#8b5cf6" />
        </g>

        {/* Left Side: Open Textbook & Knowledge Pages Motif */}
        <g
          transform="translate(48, 340)"
          className={isDark ? 'text-sky-300 opacity-[0.16]' : 'text-[#026fc3] opacity-[0.22]'}
        >
          <rect
            x="-12"
            y="24"
            width="184"
            height="120"
            rx="24"
            fill="currentColor"
            fillOpacity="0.06"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray="5 5"
          />
          <path
            d="M 12 52 C 34 40, 66 40, 88 52 C 110 40, 142 40, 164 52 V 118 C 142 106, 110 106, 88 118 C 66 106, 34 106, 12 118 Z"
            stroke="currentColor"
            strokeWidth="2.2"
          />
          <path d="M 88 52 V 118" stroke="currentColor" strokeWidth="2.2" />
          <line x1="28" y1="68" x2="74" y2="68" stroke="currentColor" strokeWidth="1.6" opacity="0.8" />
          <line x1="28" y1="82" x2="74" y2="82" stroke="currentColor" strokeWidth="1.6" opacity="0.8" />
          <line x1="28" y1="96" x2="58" y2="96" stroke="currentColor" strokeWidth="1.6" opacity="0.8" />
          <line x1="102" y1="68" x2="148" y2="68" stroke="currentColor" strokeWidth="1.6" opacity="0.8" />
          <line x1="102" y1="82" x2="148" y2="82" stroke="currentColor" strokeWidth="1.6" opacity="0.8" />
          <line x1="102" y1="96" x2="132" y2="96" stroke="currentColor" strokeWidth="1.6" opacity="0.8" />
        </g>

        {/* Right-Middle: Graduation Mortarboard & Learning Pathway Nodes */}
        <g
          transform="translate(1220, 410)"
          className={isDark ? 'text-purple-300 opacity-[0.16]' : 'text-indigo-600 opacity-[0.20]'}
        >
          {/* Mortarboard diamond */}
          <polygon
            points="80,20 150,52 80,84 10,52"
            stroke="currentColor"
            strokeWidth="2"
            fill="currentColor"
            fillOpacity="0.07"
          />
          {/* Cap base */}
          <path
            d="M 38 66 V 98 C 38 112, 122 112, 122 98 V 66"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          {/* Tassel */}
          <path d="M 142 56 V 94" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="142" cy="97" r="3.5" fill="currentColor" />
        </g>

        {/* Bottom-Right: Science Atom Orbit & Discovery Rings */}
        <g
          transform="translate(1150, 670) scale(0.92)"
          className={isDark ? 'text-cyan-300 opacity-[0.15]' : 'text-[#0284c7] opacity-[0.20]'}
        >
          <ellipse cx="100" cy="100" rx="92" ry="34" stroke="currentColor" strokeWidth="1.8" transform="rotate(30 100 100)" />
          <ellipse cx="100" cy="100" rx="92" ry="34" stroke="currentColor" strokeWidth="1.8" transform="rotate(-30 100 100)" />
          <ellipse cx="100" cy="100" rx="92" ry="34" stroke="currentColor" strokeWidth="1.8" transform="rotate(90 100 100)" />
          <circle cx="100" cy="100" r="10" fill="currentColor" />
          <circle cx="180" cy="145" r="4.5" fill="currentColor" />
          <circle cx="28" cy="62" r="4.5" fill="currentColor" />
        </g>

        {/* Bottom-Left: Abstract Learning Nodes, Geometric Shapes & Sparkles */}
        <g
          transform="translate(110, 690)"
          className={isDark ? 'text-sky-300 opacity-[0.16]' : 'text-[#026fc3] opacity-[0.22]'}
        >
          {/* Connected Concept Nodes */}
          <path d="M 30 90 L 95 45 L 175 75 L 235 25" stroke="currentColor" strokeWidth="1.6" strokeDasharray="5 5" />
          <circle cx="30" cy="90" r="6" fill="currentColor" />
          <circle cx="95" cy="45" r="7" fill="#06b6d4" />
          <circle cx="175" cy="75" r="6" fill="#8b5cf6" />
          <circle cx="235" cy="25" r="5" fill="currentColor" />

          {/* 4-point AI / Idea Sparkles */}
          <path d="M 60 -15 Q 60 12, 33 12 Q 60 12, 60 39 Q 60 12, 87 12 Q 60 12, 60 -15 Z" fill="currentColor" fillOpacity="0.65" />
          <path d="M 145 95 Q 145 110, 130 110 Q 145 110, 145 125 Q 145 110, 160 110 Q 145 110, 145 95 Z" fill="#8b5cf6" fillOpacity="0.6" />
        </g>

        {/* Center-Left & Center-Right Floating Abstract Learning Shapes */}
        <g className={isDark ? 'text-sky-400 opacity-[0.12]' : 'text-sky-600 opacity-[0.16]'}>
          <rect x="420" y="190" width="44" height="44" rx="12" transform="rotate(15 442 212)" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="980" cy="310" r="22" stroke="#8b5cf6" strokeWidth="1.6" strokeDasharray="4 4" />
          <polygon points="360,560 386,515 412,560" stroke="#06b6d4" strokeWidth="1.6" />
        </g>
      </svg>
      )}
    </div>
  );
};
