// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: COURSE STUDIO WORKSPACE BACKGROUND
// Lightweight, responsive, professional SVG-based educational canvas.
// Features soft cyan/blue atmospheric glows, subtle mathematical arcs,
// faint geometric graph patterns, and understated learning motifs.
// Zero network downloads, zero layout shift, fully accessible contrast.
// ============================================================================

import React from 'react';

interface Props {
  className?: string;
  isDark?: boolean;
}

export const CourseStudioWorkspaceBackground: React.FC<Props> = ({
  className = '',
  isDark = false
}) => {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none select-none overflow-hidden ${className}`}
    >
      {/* 1. SOFT ATMOSPHERIC AMBIENT GLOWS */}
      <div
        className={`absolute -top-32 -left-32 w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full blur-3xl transition-opacity duration-300 ${
          isDark ? 'bg-sky-500/10' : 'bg-sky-400/15'
        }`}
      />
      <div
        className={`absolute top-1/3 -right-32 w-80 sm:w-[450px] h-80 sm:h-[450px] rounded-full blur-3xl transition-opacity duration-300 ${
          isDark ? 'bg-blue-600/10' : 'bg-blue-300/12'
        }`}
      />
      <div
        className={`absolute -bottom-32 left-1/4 w-96 sm:w-[600px] h-96 sm:h-[600px] rounded-full blur-3xl transition-opacity duration-300 ${
          isDark ? 'bg-indigo-600/10' : 'bg-indigo-300/10'
        }`}
      />

      {/* 2. SUBTLE REPETITIVE GRAPH / NOTEBOOK DOT PATTERN */}
      <svg
        className={`absolute inset-0 w-full h-full ${
          isDark ? 'opacity-[0.04]' : 'opacity-[0.06]'
        }`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="edtechra-studio-grid"
            width="32"
            height="32"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.2" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#edtechra-studio-grid)" />
      </svg>

      {/* 3. LIGHTWEIGHT EDUCATIONAL GEOMETRIC MOTIFS & LEARNING ARCS */}
      <svg
        className={`absolute inset-0 w-full h-full ${
          isDark ? 'text-sky-300 opacity-[0.08]' : 'text-[#026fc3] opacity-[0.07]'
        }`}
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Top-Right: Geometric Compass Curves & Trigonometric Waves */}
        <g transform="translate(1100, 40)">
          <circle cx="140" cy="140" r="120" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" />
          <circle cx="140" cy="140" r="80" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="140" cy="140" r="40" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <path d="M 20 140 H 260 M 140 20 V 260" stroke="currentColor" strokeWidth="1" opacity="0.6" />
          {/* Degree ticks */}
          <line x1="140" y1="15" x2="140" y2="25" stroke="currentColor" strokeWidth="2" />
          <line x1="265" y1="140" x2="255" y2="140" stroke="currentColor" strokeWidth="2" />
        </g>

        {/* Top-Center: Flowing Educational Ribbon Waves */}
        <path
          d="M -100 220 C 300 120, 600 320, 1000 200 C 1200 140, 1400 240, 1600 180"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="8 8"
        />
        <path
          d="M -100 240 C 320 150, 620 340, 1020 220 C 1220 160, 1420 260, 1620 200"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.5"
        />

        {/* Left Side: Floating Academic Icons (Open Book & Pencil Motif) */}
        <g transform="translate(60, 320) scale(0.9)">
          {/* Open Book */}
          <path
            d="M 10 50 C 30 40, 60 40, 80 50 C 100 40, 130 40, 150 50 V 110 C 130 100, 100 100, 80 110 C 60 100, 30 100, 10 110 Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path d="M 80 50 V 110" stroke="currentColor" strokeWidth="1.8" />
          {/* Book Page Lines */}
          <line x1="25" y1="65" x2="68" y2="65" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
          <line x1="25" y1="78" x2="68" y2="78" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
          <line x1="25" y1="91" x2="55" y2="91" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
          <line x1="92" y1="65" x2="135" y2="65" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
          <line x1="92" y1="78" x2="135" y2="78" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
          <line x1="92" y1="91" x2="120" y2="91" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
        </g>

        {/* Bottom-Right: Atom / Science Ring Orbit */}
        <g transform="translate(1180, 580) scale(0.85)">
          <ellipse cx="100" cy="100" rx="90" ry="32" stroke="currentColor" strokeWidth="1.5" transform="rotate(30 100 100)" />
          <ellipse cx="100" cy="100" rx="90" ry="32" stroke="currentColor" strokeWidth="1.5" transform="rotate(-30 100 100)" />
          <ellipse cx="100" cy="100" rx="90" ry="32" stroke="currentColor" strokeWidth="1.5" transform="rotate(90 100 100)" />
          <circle cx="100" cy="100" r="10" fill="currentColor" />
          {/* Orbiting electrons */}
          <circle cx="180" cy="145" r="4" fill="currentColor" />
          <circle cx="30" cy="65" r="4" fill="currentColor" />
        </g>

        {/* Bottom-Left: Idea Sparkles & Academic Star Motifs */}
        <g transform="translate(180, 680)">
          {/* 4-point sparkle 1 */}
          <path d="M 40 10 Q 40 40, 10 40 Q 40 40, 40 70 Q 40 40, 70 40 Q 40 40, 40 10 Z" fill="currentColor" />
          {/* 4-point sparkle 2 */}
          <path d="M 120 60 Q 120 75, 105 75 Q 120 75, 120 90 Q 120 75, 135 75 Q 120 75, 120 60 Z" fill="currentColor" opacity="0.7" />
        </g>
      </svg>
    </div>
  );
};
