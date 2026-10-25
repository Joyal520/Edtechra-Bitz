// ============================================================================
// EDTECHRA COURSE STUDIO 2.0: EDUCATIONAL ILLUSTRATION & DIAGRAM ENGINE
// Provides crisp, accessible, zero-latency vector illustrations and interactive
// anatomical diagrams for courses (including the flagship "Amazing Brain" course).
// Supports interactive region highlighting, dark/light themes, and ARIA alt text.
// ============================================================================

import React from 'react';

export type IllustrationKey =
  | 'hero_brain'
  | 'friendly_brain'
  | 'brain_superpowers'
  | 'brain_anatomy'
  | 'memory_notebook'
  | 'sleeping_brain'
  | 'healthy_brain'
  | 'brain_champion';

interface IllustrationProps {
  illustrationKey: IllustrationKey | string;
  alt?: string;
  activeRegionId?: string | null;
  onSelectRegion?: (regionId: string) => void;
  className?: string;
}

export const CourseIllustrationGraphic: React.FC<IllustrationProps> = ({
  illustrationKey,
  alt,
  activeRegionId,
  onSelectRegion,
  className = ''
}) => {
  const key = (illustrationKey || 'friendly_brain').toLowerCase();

  // 1. INTERACTIVE BRAIN ANATOMY DIAGRAM (Cerebrum, Cerebellum, Brain Stem)
  if (key === 'brain_anatomy') {
    const isCerebrum = !activeRegionId || activeRegionId === 'cerebrum';
    const isCerebellum = activeRegionId === 'cerebellum';
    const isBrainStem = activeRegionId === 'brain_stem' || activeRegionId === 'brainstem';

    return (
      <div
        role="img"
        aria-label={alt || 'Interactive diagram of the three main parts of the brain: Cerebrum, Cerebellum, and Brain Stem'}
        className={`relative w-full max-w-xl mx-auto select-none ${className}`}
      >
        <svg
          viewBox="0 0 600 400"
          className="w-full h-auto drop-shadow-md overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="cerebrumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="cerebellumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="stemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>

          {/* Soft background halo */}
          <circle cx="300" cy="195" r="165" fill="currentColor" className="text-indigo-500/5 dark:text-indigo-400/10" />

          {/* Head silhouette outline */}
          <path
            d="M175 290 C145 250, 135 190, 155 135 C180 70, 260 40, 345 50 C425 60, 470 115, 465 190 C462 235, 435 270, 405 295"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="6 6"
            className="text-slate-300 dark:text-slate-700"
          />

          {/* REGION 1: CEREBRUM (Largest top part - Thinking, Learning, Memory, Senses) */}
          <g
            onClick={() => onSelectRegion?.('cerebrum')}
            className="cursor-pointer transition-transform duration-200"
            style={{
              opacity: !activeRegionId || isCerebrum ? 1 : 0.45,
              transform: isCerebrum && activeRegionId ? 'scale(1.02)' : 'scale(1)',
              transformOrigin: '295px 155px'
            }}
          >
            <path
              d="M175 215 C160 175, 175 115, 225 88 C265 65, 335 62, 385 92 C430 118, 448 170, 425 212 C405 242, 355 235, 315 230 C265 225, 200 245, 175 215 Z"
              fill="url(#cerebrumGrad)"
              stroke={isCerebrum && activeRegionId ? '#ffffff' : '#4f46e5'}
              strokeWidth={isCerebrum && activeRegionId ? '5' : '3'}
            />
            {/* Brain folds (gyri/sulci) */}
            <path
              d="M210 140 Q245 115 280 140 M285 105 Q325 130 365 110 M200 185 Q250 165 295 190 M310 165 Q360 150 395 185 M250 145 Q295 170 335 140"
              fill="none"
              stroke="#e0e7ff"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.75"
            />
            {/* Label pill inside/attached */}
            <rect x="42" y="88" width="115" height="36" rx="18" fill="#4f46e5" />
            <text x="99" y="111" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="800">
              1. Cerebrum
            </text>
            <line x1="157" y1="106" x2="215" y2="125" stroke="#4f46e5" strokeWidth="3" strokeDasharray="4 3" />
            <circle cx="215" cy="125" r="5" fill="#ffffff" stroke="#4f46e5" strokeWidth="3" />
          </g>

          {/* REGION 2: CEREBELLUM (Back lower part - Balance & Movement) */}
          <g
            onClick={() => onSelectRegion?.('cerebellum')}
            className="cursor-pointer transition-transform duration-200"
            style={{
              opacity: !activeRegionId || isCerebellum ? 1 : 0.45,
              transform: isCerebellum ? 'scale(1.04)' : 'scale(1)',
              transformOrigin: '375px 265px'
            }}
          >
            <path
              d="M325 235 C355 225, 415 228, 425 262 C432 292, 395 312, 355 305 C325 300, 312 260, 325 235 Z"
              fill="url(#cerebellumGrad)"
              stroke={isCerebellum ? '#ffffff' : '#047857'}
              strokeWidth={isCerebellum ? '5' : '3'}
            />
            {/* Leaf-like horizontal stripes of cerebellum */}
            <path
              d="M340 255 Q375 248 408 258 M338 272 Q375 265 410 275 M345 288 Q375 283 398 290"
              fill="none"
              stroke="#d1fae5"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.85"
            />
            <rect x="448" y="248" width="128" height="36" rx="18" fill="#059669" />
            <text x="512" y="271" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="800">
              2. Cerebellum
            </text>
            <line x1="415" y1="266" x2="448" y2="266" stroke="#059669" strokeWidth="3" strokeDasharray="4 3" />
            <circle cx="415" cy="266" r="5" fill="#ffffff" stroke="#059669" strokeWidth="3" />
          </g>

          {/* REGION 3: BRAIN STEM (Bottom stem - Breathing, Heartbeat, Automatic Actions) */}
          <g
            onClick={() => onSelectRegion?.('brain_stem')}
            className="cursor-pointer transition-transform duration-200"
            style={{
              opacity: !activeRegionId || isBrainStem ? 1 : 0.45,
              transform: isBrainStem ? 'scale(1.04)' : 'scale(1)',
              transformOrigin: '295px 305px'
            }}
          >
            <path
              d="M272 228 L315 232 C320 268, 322 315, 315 362 L278 362 C282 315, 278 270, 272 228 Z"
              fill="url(#stemGrad)"
              stroke={isBrainStem ? '#ffffff' : '#b45309'}
              strokeWidth={isBrainStem ? '5' : '3'}
            />
            <path
              d="M294 248 L296 345"
              stroke="#fef3c7"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="6 6"
              opacity="0.8"
            />
            <rect x="78" y="312" width="125" height="36" rx="18" fill="#d97706" />
            <text x="140" y="335" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="800">
              3. Brain Stem
            </text>
            <line x1="203" y1="330" x2="285" y2="320" stroke="#d97706" strokeWidth="3" strokeDasharray="4 3" />
            <circle cx="285" cy="320" r="5" fill="#ffffff" stroke="#d97706" strokeWidth="3" />
          </g>
        </svg>
      </div>
    );
  }

  // 2. MEMORY NOTEBOOK METAPHOR (Short-Term Sticky Note vs Long-Term Golden Book)
  if (key === 'memory_notebook') {
    return (
      <div
        role="img"
        aria-label={alt || "Illustration comparing Short-Term Memory (a small sticky note) and Long-Term Memory (a big library notebook)"}
        className={`w-full max-w-xl mx-auto ${className}`}
      >
        <svg viewBox="0 0 600 280" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
          {/* Left card: Short-term sticky note */}
          <rect x="30" y="35" width="210" height="210" rx="24" fill="#fef3c7" stroke="#f59e0b" strokeWidth="3" />
          <rect x="95" y="22" width="80" height="24" rx="6" fill="#fbbf24" opacity="0.8" />
          <text x="135" y="80" textAnchor="middle" fill="#92400e" fontSize="15" fontWeight="800">
            SHORT-TERM MEMORY
          </text>
          <text x="135" y="108" textAnchor="middle" fill="#b45309" fontSize="12" fontWeight="600">
            Quick Sticky Note
          </text>
          <line x1="65" y1="135" x2="205" y2="135" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" />
          <text x="135" y="165" textAnchor="middle" fill="#78350f" fontSize="13" fontWeight="700">
            • Holds a few things
          </text>
          <text x="135" y="190" textAnchor="middle" fill="#78350f" fontSize="13" fontWeight="700">
            • Lasts a few seconds
          </text>
          <text x="135" y="218" textAnchor="middle" fill="#b45309" fontSize="11" fontWeight="700">
            ⏱ 15–30 seconds
          </text>

          {/* Center arrow: Practice & Sleep */}
          <path d="M255 140 L335 140" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" />
          <polygon points="335,132 350,140 335,148" fill="#6366f1" />
          <rect x="256" y="96" width="88" height="28" rx="14" fill="#e0e7ff" />
          <text x="300" y="114" textAnchor="middle" fill="#4338ca" fontSize="11" fontWeight="800">
            Practice + Sleep
          </text>

          {/* Right card: Long-term permanent notebook */}
          <rect x="360" y="35" width="210" height="210" rx="24" fill="#eef2ff" stroke="#6366f1" strokeWidth="3" />
          <rect x="372" y="35" width="18" height="210" rx="6" fill="#4f46e5" />
          <text x="472" y="80" textAnchor="middle" fill="#312e81" fontSize="15" fontWeight="800">
            LONG-TERM MEMORY
          </text>
          <text x="472" y="108" textAnchor="middle" fill="#4338ca" fontSize="12" fontWeight="600">
            Big Brain Notebook
          </text>
          <line x1="405" y1="135" x2="545" y2="135" stroke="#818cf8" strokeWidth="2" />
          <text x="472" y="165" textAnchor="middle" fill="#1e1b4b" fontSize="13" fontWeight="700">
            • Your name &amp; language
          </text>
          <text x="472" y="190" textAnchor="middle" fill="#1e1b4b" fontSize="13" fontWeight="700">
            • Riding a bike &amp; skills
          </text>
          <text x="472" y="218" textAnchor="middle" fill="#4338ca" fontSize="11" fontWeight="700">
            ⭐ Kept for years!
          </text>
        </svg>
      </div>
    );
  }

  // 3. SLEEPING BRAIN (Night-time memory saving & cleaning)
  if (key === 'sleeping_brain') {
    return (
      <div
        role="img"
        aria-label={alt || 'Illustration of the brain at night saving memories and cleaning itself while you sleep'}
        className={`w-full max-w-xl mx-auto ${className}`}
      >
        <svg viewBox="0 0 600 260" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
          <rect x="15" y="15" width="570" height="230" rx="28" fill="#0f172a" />
          {/* Moon & Stars */}
          <path d="M95 60 A28 28 0 1 0 125 95 A22 22 0 1 1 95 60 Z" fill="#fde047" />
          <circle cx="490" cy="55" r="3" fill="#fde047" />
          <circle cx="530" cy="85" r="4" fill="#38bdf8" />
          <circle cx="165" cy="50" r="2.5" fill="#e2e8f0" />
          {/* Sleeping Brain in Center */}
          <ellipse cx="300" cy="135" rx="95" ry="68" fill="#818cf8" stroke="#c7d2fe" strokeWidth="4" />
          <path d="M245 115 Q275 95 305 115 M305 95 Q335 115 360 100 M235 145 Q270 130 300 148" stroke="#e0e7ff" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          {/* Happy closed sleeping eyes */}
          <path d="M268 145 Q278 155 288 145" stroke="#1e1b4b" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M312 145 Q322 155 332 145" stroke="#1e1b4b" strokeWidth="4" fill="none" strokeLinecap="round" />
          {/* Zzz */}
          <text x="395" y="82" fill="#38bdf8" fontSize="22" fontWeight="900">Z</text>
          <text x="418" y="64" fill="#7dd3fc" fontSize="17" fontWeight="900">z</text>
          <text x="435" y="50" fill="#bae6fd" fontSize="13" fontWeight="900">z</text>
          {/* Left badge: Cleans waste */}
          <rect x="42" y="155" width="145" height="58" rx="16" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
          <text x="114" y="180" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="800">🧹 Cleans &amp; Rests</text>
          <text x="114" y="198" textAnchor="middle" fill="#cbd5e1" fontSize="11">Washes away tired waste</text>
          {/* Right badge: Saves memories */}
          <rect x="412" y="155" width="145" height="58" rx="16" fill="#1e293b" stroke="#a78bfa" strokeWidth="2" />
          <text x="484" y="180" textAnchor="middle" fill="#c4b5fd" fontSize="12" fontWeight="800">💾 Saves Memories</text>
          <text x="484" y="198" textAnchor="middle" fill="#cbd5e1" fontSize="11">Stores what you learned</text>
        </svg>
      </div>
    );
  }

  // 4. BRAIN SUPERPOWERS / AT WORK
  if (key === 'brain_superpowers') {
    return (
      <div
        role="img"
        aria-label={alt || 'Diagram showing how the brain connects to thinking, seeing, hearing, moving, feeling, and remembering'}
        className={`w-full max-w-xl mx-auto ${className}`}
      >
        <svg viewBox="0 0 600 280" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
          {/* Connecting lines from center brain */}
          <line x1="300" y1="140" x2="115" y2="65" stroke="#818cf8" strokeWidth="3" strokeDasharray="5 5" />
          <line x1="300" y1="140" x2="115" y2="215" stroke="#34d399" strokeWidth="3" strokeDasharray="5 5" />
          <line x1="300" y1="140" x2="485" y2="65" stroke="#fbbf24" strokeWidth="3" strokeDasharray="5 5" />
          <line x1="300" y1="140" x2="485" y2="215" stroke="#f472b6" strokeWidth="3" strokeDasharray="5 5" />

          {/* Center Brain Hub */}
          <circle cx="300" cy="140" r="64" fill="#4f46e5" />
          <circle cx="300" cy="140" r="54" fill="#6366f1" />
          <text x="300" y="132" textAnchor="middle" fill="#ffffff" fontSize="28">🧠</text>
          <text x="300" y="158" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="800">BOSS CENTER</text>

          {/* Satellite nodes */}
          <rect x="30" y="38" width="160" height="52" rx="16" fill="#eef2ff" stroke="#6366f1" strokeWidth="2.5" />
          <text x="110" y="69" textAnchor="middle" fill="#312e81" fontSize="13" fontWeight="800">💡 Think &amp; Learn</text>

          <rect x="30" y="190" width="160" height="52" rx="16" fill="#ecfdf5" stroke="#10b981" strokeWidth="2.5" />
          <text x="110" y="221" textAnchor="middle" fill="#065f46" fontSize="13" fontWeight="800">🏃 Move &amp; Balance</text>

          <rect x="410" y="38" width="160" height="52" rx="16" fill="#fffbeb" stroke="#f59e0b" strokeWidth="2.5" />
          <text x="490" y="69" textAnchor="middle" fill="#92400e" fontSize="13" fontWeight="800">👀 See &amp; Hear</text>

          <rect x="410" y="190" width="160" height="52" rx="16" fill="#fdf2f8" stroke="#ec4899" strokeWidth="2.5" />
          <text x="490" y="221" textAnchor="middle" fill="#831843" fontSize="13" fontWeight="800">❤️ Feel &amp; Remember</text>
        </svg>
      </div>
    );
  }

  // 5. DEFAULT / FRIENDLY BRAIN ILLUSTRATION
  return (
    <div
      role="img"
      aria-label={alt || 'Friendly illustration of the human brain, your body’s smart command center'}
      className={`w-full max-w-xl mx-auto ${className}`}
    >
      <svg viewBox="0 0 600 260" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="friendlyBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        <rect x="10" y="10" width="580" height="240" rx="28" fill="url(#friendlyBg)" />
        <circle cx="300" cy="130" r="88" fill="#ffffff" opacity="0.12" />
        <circle cx="300" cy="130" r="68" fill="#ffffff" opacity="0.18" />

        {/* Friendly brain icon center */}
        <ellipse cx="300" cy="126" rx="74" ry="56" fill="#fda4af" stroke="#fff1f2" strokeWidth="4" />
        <path
          d="M252 110 Q278 90 302 110 M302 92 Q330 112 350 98 M245 135 Q275 122 300 138 M305 125 Q335 118 355 136"
          stroke="#ffe4e6"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        {/* Friendly eyes and smile */}
        <circle cx="278" cy="132" r="5" fill="#1e1b4b" />
        <circle cx="322" cy="132" r="5" fill="#1e1b4b" />
        <path d="M286 146 Q300 158 314 146" stroke="#1e1b4b" strokeWidth="4" fill="none" strokeLinecap="round" />

        {/* Left & Right callout pills */}
        <rect x="36" y="52" width="155" height="44" rx="14" fill="#ffffff" opacity="0.95" />
        <text x="113" y="79" textAnchor="middle" fill="#312e81" fontSize="13" fontWeight="800">
          ⚡ Works 24 Hours a Day
        </text>

        <rect x="36" y="162" width="155" height="44" rx="14" fill="#ffffff" opacity="0.95" />
        <text x="113" y="189" textAnchor="middle" fill="#312e81" fontSize="13" fontWeight="800">
          🛡️ Protected by Your Skull
        </text>

        <rect x="409" y="52" width="155" height="44" rx="14" fill="#ffffff" opacity="0.95" />
        <text x="486" y="79" textAnchor="middle" fill="#312e81" fontSize="13" fontWeight="800">
          💭 Controls Thoughts
        </text>

        <rect x="409" y="162" width="155" height="44" rx="14" fill="#ffffff" opacity="0.95" />
        <text x="486" y="189" textAnchor="middle" fill="#312e81" fontSize="13" fontWeight="800">
          ❤️ Controls Feelings
        </text>
      </svg>
    </div>
  );
};
