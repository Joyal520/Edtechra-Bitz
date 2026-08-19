import React from 'react';

export const UploadBoxIllustration: React.FC<{ className?: string }> = ({ className = 'w-24 h-20' }) => {
  return (
    <svg
      viewBox="0 0 160 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Box gradients */}
        <linearGradient id="boxFront" x1="80" y1="65" x2="80" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
        <linearGradient id="boxLeft" x1="30" y1="55" x2="80" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#026fc3" />
          <stop offset="100%" stopColor="#075985" />
        </linearGradient>
        <linearGradient id="boxRight" x1="130" y1="55" x2="80" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="boxInside" x1="80" y1="45" x2="80" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#082f49" />
          <stop offset="100%" stopColor="#0c4a6e" />
        </linearGradient>
        
        {/* Document gradient */}
        <linearGradient id="docGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        {/* Card gradients */}
        <linearGradient id="imgCardGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
        <linearGradient id="videoCardGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0369a1" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        {/* Box Flap Gradients */}
        <linearGradient id="flapLeft" x1="25" y1="40" x2="55" y2="65" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="flapRight" x1="135" y1="40" x2="105" y2="65" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        {/* Glow Filter */}
        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Sparkles Floating around */}
      {/* Sparkle Top Center */}
      <path
        d="M80 8 C80 13 83 16 88 16 C83 16 80 19 80 24 C80 19 77 16 72 16 C77 16 80 13 80 8Z"
        fill="#fde047"
        filter="url(#softGlow)"
      />
      {/* Sparkle Top Left */}
      <path
        d="M38 22 C38 25 40 27 43 27 C40 27 38 29 38 32 C38 29 36 27 33 27 C36 27 38 25 38 22Z"
        fill="#38bdf8"
      />
      {/* Sparkle Top Right */}
      <path
        d="M125 18 C125 21 127 23 130 23 C127 23 125 25 125 28 C125 25 123 23 120 23 C123 23 125 21 125 18Z"
        fill="#7dd3fc"
      />
      {/* Sparkle Middle Left */}
      <circle cx="28" cy="38" r="1.5" fill="#fde047" />
      {/* Sparkle Middle Right */}
      <circle cx="138" cy="36" r="1.5" fill="#fde047" />

      {/* Floating Items Rising from the Box */}

      {/* 1. Left Image Card (Tilted) */}
      <g transform="translate(42, 28) rotate(-14)">
        <rect width="28" height="34" rx="4" fill="url(#imgCardGrad)" stroke="#38bdf8" strokeWidth="1.2" />
        {/* Mountain Silhouette & Sun */}
        <circle cx="19" cy="11" r="3" fill="#fde047" />
        <path d="M4 27 L11 18 L16 23 L22 15 L26 27 Z" fill="#38bdf8" opacity="0.9" />
        <path d="M12 27 L17 21 L21 27 Z" fill="#7dd3fc" />
      </g>

      {/* 2. Right Video Card (Tilted) */}
      <g transform="translate(94, 25) rotate(16)">
        <rect width="26" height="32" rx="4" fill="url(#videoCardGrad)" stroke="#0ea5e9" strokeWidth="1.2" />
        {/* Play Triangle */}
        <polygon points="9,11 9,21 19,16" fill="#38bdf8" />
        <circle cx="13" cy="16" r="8" stroke="#38bdf8" strokeWidth="1" strokeDasharray="1.5 1.5" fill="none" opacity="0.6" />
      </g>

      {/* 3. Center Document (Main sheet floating vertically) */}
      <g transform="translate(68, 16) rotate(2)">
        <rect width="26" height="36" rx="4" fill="url(#docGrad)" stroke="#94a3b8" strokeWidth="1" />
        {/* Corner Fold */}
        <path d="M20 0 L26 6 L20 6 Z" fill="#cbd5e1" />
        {/* Text Lines */}
        <line x1="5" y1="10" x2="16" y2="10" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
        <line x1="5" y1="16" x2="21" y2="16" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="5" y1="21" x2="21" y2="21" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="5" y1="26" x2="17" y2="26" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* 4. 3D Open Box */}
      
      {/* Box Interior Shadow */}
      <polygon points="40,55 80,72 120,55 80,42" fill="url(#boxInside)" />

      {/* Left Wall */}
      <polygon points="40,55 80,72 80,105 40,88" fill="url(#boxLeft)" />

      {/* Right Wall */}
      <polygon points="80,72 120,55 120,88 80,105" fill="url(#boxRight)" />

      {/* Center Crease / Highlight */}
      <line x1="80" y1="72" x2="80" y2="105" stroke="#7dd3fc" strokeWidth="1" opacity="0.6" />

      {/* Left Open Flap (angled out) */}
      <polygon points="40,55 80,72 65,82 25,62" fill="url(#flapLeft)" stroke="#38bdf8" strokeWidth="0.8" />

      {/* Right Open Flap (angled out) */}
      <polygon points="80,72 120,55 135,62 95,82" fill="url(#flapRight)" stroke="#7dd3fc" strokeWidth="0.8" />

      {/* Back Top Left Flap */}
      <polygon points="40,55 80,42 70,33 28,45" fill="#026fc3" opacity="0.9" />

      {/* Back Top Right Flap */}
      <polygon points="80,42 120,55 132,45 90,33" fill="#0284c7" opacity="0.9" />

      {/* Soft Box Base Glow */}
      <ellipse cx="80" cy="108" rx="42" ry="7" fill="#0369a1" opacity="0.25" filter="url(#softGlow)" />
    </svg>
  );
};
