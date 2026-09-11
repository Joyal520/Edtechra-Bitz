// ============================================================================
// EDTECHRA-BITZ: Premium Animated Loading Screen / Splash Experience
// Reconstructed visually from official design reference with layered HTML/CSS/SVG
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Brain,
  Lightbulb,
  TrendingUp,
  Users,
  GraduationCap,
  Play
} from 'lucide-react';

export interface SplashScreenProps {
  statusMessage?: string;
  isFadingOut?: boolean;
  onDismiss?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  statusMessage = 'Loading amazing learning...',
  isFadingOut = false,
  onDismiss
}) => {
  const [mounted, setMounted] = useState(true);

  // Smooth unmounting after fade-out transition completes
  useEffect(() => {
    if (isFadingOut) {
      const timer = setTimeout(() => {
        setMounted(false);
        if (onDismiss) onDismiss();
      }, 550);
      return () => clearTimeout(timer);
    }
  }, [isFadingOut, onDismiss]);

  if (!mounted) return null;

  return (
    <div
      role="status"
      aria-label="Loading EdTechra Bitz"
      className={`fixed inset-0 z-[99999] w-screen h-[100dvh] bg-[#01060f] text-white flex flex-col items-center justify-between p-4 sm:p-6 overflow-hidden select-none transition-all duration-500 ease-out ${
        isFadingOut ? 'opacity-0 scale-[1.02] pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'radial-gradient(ellipse 75% 65% at 50% 36%, #0a254a 0%, #031326 48%, #01060f 100%)'
      }}
    >
      {/* ===================================================================== */}
      {/* 1. BACKGROUND ATMOSPHERE: ORBITAL LINES & FLOATING PARTICLES           */}
      {/* ===================================================================== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        
        {/* Subtle Ambient Radial Glow directly behind the center logo */}
        <div className="absolute top-[32%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[480px] h-[340px] sm:h-[480px] rounded-full bg-radial from-sky-500/20 via-blue-600/10 to-transparent blur-3xl pointer-events-none" />

        {/* Delicate SVG Orbital Curves */}
        <svg
          className="absolute inset-0 w-full h-full opacity-40"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 1000 600"
        >
          <defs>
            <linearGradient id="orbitGradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="orbitGradRight" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.03" />
              <stop offset="45%" stopColor="#38bdf8" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Left Orbital Elliptical Arc passing near Book and Brain tiles */}
          <path
            d="M -60 120 C 180 160 220 320 160 480"
            fill="none"
            stroke="url(#orbitGradLeft)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />

          {/* Right Orbital Arc passing near Play and Cap tiles */}
          <path
            d="M 1060 100 C 820 140 840 340 980 480"
            fill="none"
            stroke="url(#orbitGradRight)"
            strokeWidth="1.5"
          />
        </svg>

        {/* Low-Density Glimmering Particles */}
        <div className="absolute top-[22%] left-[28%] w-1.5 h-1.5 bg-cyan-300 rounded-full animate-ping opacity-60 duration-1000" />
        <div className="absolute top-[35%] left-[34%] w-1 h-1 bg-sky-200 rounded-full animate-pulse opacity-70" />
        <div className="absolute top-[18%] right-[32%] w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse opacity-65" />
        <div className="absolute top-[48%] right-[26%] w-1 h-1 bg-cyan-400 rounded-full animate-ping opacity-50 duration-700" />
        <div className="absolute top-[28%] right-[22%] w-1 h-1 bg-white rounded-full opacity-60 animate-pulse" />
        <div className="absolute top-[60%] left-[24%] w-1 h-1 bg-sky-300 rounded-full opacity-40" />
      </div>

      {/* ===================================================================== */}
      {/* 2. LEFT-SIDE: SCRIPT MESSAGE & FLOATING EDUCATIONAL TILES              */}
      {/* ===================================================================== */}
      <div className="hidden lg:block absolute left-[5%] xl:left-[7%] top-[10%] bottom-[25%] pointer-events-none z-10 w-52">
        {/* Calligraphic Script: Better Learning Brighter Futures */}
        <div className="relative pt-2 pl-2 animate-in fade-in duration-1000">
          <div
            className="font-['Caveat',cursive] text-2xl xl:text-3xl text-sky-400/40 leading-[1.15] tracking-wide -rotate-6 select-none"
            style={{ textShadow: '0 0 16px rgba(56, 189, 248, 0.3)' }}
          >
            <div>Better</div>
            <div className="pl-3">Learning</div>
            <div className="pl-1">Brighter</div>
            <div className="pl-4">Futures</div>
          </div>
          {/* Handwritten underline swoop with tail */}
          <svg className="w-28 h-6 text-sky-400/35 -mt-1 ml-4" viewBox="0 0 120 24" fill="none">
            <path
              d="M 5 8 C 45 4 85 18 115 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Floating Glass Tile 1: Book */}
        <div
          className="absolute top-[40%] left-[8%] w-14 h-14 rounded-2xl bg-sky-950/25 border border-sky-400/20 backdrop-blur-xs flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.1)] transition-transform animate-float-slow"
          style={{ animationDuration: '7s' }}
        >
          <BookOpen className="w-6 h-6 text-sky-300/65 drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]" />
        </div>

        {/* Floating Glass Tile 2: Brain */}
        <div
          className="absolute top-[68%] left-[28%] w-13 h-13 rounded-2xl bg-sky-950/25 border border-sky-400/20 backdrop-blur-xs flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.1)] transition-transform animate-float-slow"
          style={{ animationDuration: '9s', animationDelay: '1.5s' }}
        >
          <Brain className="w-6 h-6 text-sky-300/65 drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]" />
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. RIGHT-SIDE: SCRIPT MESSAGE & FLOATING EDUCATIONAL TILES             */}
      {/* ===================================================================== */}
      <div className="hidden lg:block absolute right-[5%] xl:right-[7%] top-[10%] bottom-[25%] pointer-events-none z-10 w-52">
        {/* Floating Glass Tile 3: Play Video Button */}
        <div
          className="absolute top-[10%] right-[18%] w-14 h-14 rounded-2xl bg-sky-950/25 border border-sky-400/20 backdrop-blur-xs flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.1)] transition-transform animate-float-slow"
          style={{ animationDuration: '8s', animationDelay: '0.8s' }}
        >
          <div className="w-8 h-8 rounded-xl border border-sky-400/30 flex items-center justify-center bg-sky-900/20">
            <Play className="w-4 h-4 text-sky-300/70 fill-sky-300/40 ml-0.5" />
          </div>
        </div>

        {/* Floating Glass Tile 4: Graduation Cap */}
        <div
          className="absolute top-[38%] right-[8%] w-14 h-14 rounded-2xl bg-sky-950/25 border border-sky-400/20 backdrop-blur-xs flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.1)] transition-transform animate-float-slow"
          style={{ animationDuration: '7.5s', animationDelay: '2.2s' }}
        >
          <GraduationCap className="w-6 h-6 text-sky-300/65 drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]" />
        </div>

        {/* Calligraphic Script: Knowledge Changes Lives */}
        <div className="absolute top-[62%] right-[4%] text-right pr-2 animate-in fade-in duration-1000">
          <div
            className="font-['Caveat',cursive] text-2xl xl:text-3xl text-sky-400/35 leading-[1.15] tracking-wide rotate-3 select-none"
            style={{ textShadow: '0 0 16px rgba(56, 189, 248, 0.25)' }}
          >
            <div>Knowledge</div>
            <div className="pr-3">Changes</div>
            <div className="pr-1">Lives</div>
          </div>
          {/* Handwritten underline swoop */}
          <svg className="w-24 h-5 text-sky-400/30 mt-0.5 ml-auto" viewBox="0 0 100 20" fill="none">
            <path
              d="M 95 6 C 60 14 30 4 5 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. CENTRAL BRANDING, SPINNER & INDICATORS                             */}
      {/* ===================================================================== */}
      <div className="flex-1 flex flex-col items-center justify-center text-center relative z-20 w-full max-w-xl mx-auto px-4 my-auto">
        
        {/* Official 3D EdTechra Logo Emblem (NEVER CROPPED) */}
        <div className="relative flex items-center justify-center animate-in zoom-in-95 duration-700 ease-out">
          {/* Soft ambient halo behind emblem */}
          <div className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full bg-radial from-cyan-400/30 via-blue-600/15 to-transparent blur-xl pointer-events-none animate-pulse" />

          {/* Genuine uncropped emblem with object-fit: contain */}
          <img
            src="/logo-emblem.png"
            alt="EdTechra Bitz Logo"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.endsWith('/logo.png')) {
                target.src = '/logo.png';
              }
            }}
            className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 object-contain drop-shadow-[0_12px_32px_rgba(2,111,195,0.55)] select-none pointer-events-none animate-logo-breathe"
          />
        </div>

        {/* Central Brand Hierarchy */}
        <div className="space-y-1.5 pt-2 sm:pt-3">
          {/* EDTECHRA (Bold white + Cyan accent) */}
          <h1 className="text-3xl sm:text-4xl md:text-[42px] font-black tracking-[0.14em] text-white flex items-center justify-center leading-none">
            <span>EDTECH</span>
            <span
              className="text-[#00b4ff] drop-shadow-[0_0_18px_rgba(0,180,255,0.65)]"
              style={{ color: '#00b4ff' }}
            >
              RA
            </span>
          </h1>

          {/* — B I T Z — with flanked gradient lines */}
          <div className="flex items-center justify-center gap-3 pt-0.5">
            <div className="w-10 sm:w-14 h-[1.5px] bg-gradient-to-r from-transparent to-sky-400/70" />
            <span className="text-xs sm:text-sm font-black tracking-[0.45em] text-sky-200 uppercase pl-1">
              BITZ
            </span>
            <div className="w-10 sm:w-14 h-[1.5px] bg-gradient-to-l from-transparent to-sky-400/70" />
          </div>

          {/* LEARN. DISCOVER. GROW. */}
          <div className="text-[10px] sm:text-xs font-extrabold tracking-[0.28em] sm:tracking-[0.32em] text-sky-200/75 uppercase pt-1">
            LEARN. DISCOVER. GROW.
          </div>
        </div>

        {/* Custom Premium Glowing Spinner */}
        <div className="pt-6 sm:pt-7 flex flex-col items-center justify-center space-y-3">
          <div className="relative w-9 h-9 sm:w-10 sm:h-10">
            <svg
              className="w-full h-full animate-spin"
              style={{ animationDuration: '1s' }}
              viewBox="0 0 44 44"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00b4ff" />
                  <stop offset="60%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#a5f3fc" />
                </linearGradient>
                <filter id="spinnerGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Muted Track Circle */}
              <circle
                cx="22"
                cy="22"
                r="18"
                stroke="rgba(56, 189, 248, 0.15)"
                strokeWidth="2.5"
              />

              {/* Active Glowing Arc */}
              <circle
                cx="22"
                cy="22"
                r="18"
                stroke="url(#spinnerGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="72 42"
                filter="url(#spinnerGlow)"
              />
            </svg>
          </div>

          {/* Loading status message */}
          <p className="text-xs sm:text-sm font-medium text-slate-300/85 tracking-wide flex items-center justify-center gap-1 animate-pulse">
            <span>{statusMessage}</span>
          </p>
        </div>

        {/* 4 Bottom Feature Indicators (LEARN | DISCOVER | GROW | TOGETHER) */}
        <div className="pt-7 sm:pt-9 flex items-center justify-center gap-3 sm:gap-6 text-slate-300">
          
          {/* 1: LEARN */}
          <div className="flex flex-col items-center gap-1.5 group cursor-default transition-transform hover:-translate-y-0.5">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
            <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-sky-200/90 uppercase">
              LEARN
            </span>
          </div>

          <div className="w-[1px] h-6 bg-sky-500/25 shrink-0" />

          {/* 2: DISCOVER */}
          <div className="flex flex-col items-center gap-1.5 group cursor-default transition-transform hover:-translate-y-0.5">
            <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
            <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-sky-200/90 uppercase">
              DISCOVER
            </span>
          </div>

          <div className="w-[1px] h-6 bg-sky-500/25 shrink-0" />

          {/* 3: GROW */}
          <div className="flex flex-col items-center gap-1.5 group cursor-default transition-transform hover:-translate-y-0.5">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
            <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-sky-200/90 uppercase">
              GROW
            </span>
          </div>

          <div className="w-[1px] h-6 bg-sky-500/25 shrink-0" />

          {/* 4: TOGETHER */}
          <div className="flex flex-col items-center gap-1.5 group cursor-default transition-transform hover:-translate-y-0.5">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
            <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-sky-200/90 uppercase">
              TOGETHER
            </span>
          </div>

        </div>

      </div>

      {/* ===================================================================== */}
      {/* 5. BOTTOM GLOWING LIGHT WAVES (ANIMATED LUMINOUS FLOWING RIBBON)      */}
      {/* ===================================================================== */}
      <div className="w-full h-28 sm:h-36 md:h-44 relative z-10 shrink-0 pointer-events-none overflow-hidden">
        <svg
          className="absolute bottom-0 left-0 w-[200%] h-full animate-wave-flow"
          style={{ animationDuration: '14s' }}
          viewBox="0 0 2880 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Luminous Neon Cyan Edge Gradient */}
            <linearGradient id="neonWaveEdge" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
              <stop offset="25%" stopColor="#00f0ff" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.9" />
              <stop offset="75%" stopColor="#00f0ff" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.4" />
            </linearGradient>

            {/* Glowing Deep Blue Ribbon Fill Gradient */}
            <linearGradient id="waveFillGrad" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.35" />
              <stop offset="40%" stopColor="#0369a1" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#01060f" stopOpacity="0.0" />
            </linearGradient>

            {/* Secondary Backing Wave Gradient */}
            <linearGradient id="backWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0369a1" stopOpacity="0.15" />
              <stop offset="50%" stopColor="#0284c7" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.15" />
            </linearGradient>

            {/* Neon Glow Filter */}
            <filter id="waveNeonGlow" x="-5%" y="-30%" width="110%" height="160%">
              <feGaussianBlur stdDeviation="5" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Layer 1: Background Soft Flowing Wave */}
          <path
            d="M 0 110 C 360 160 720 70 1080 120 C 1440 170 1800 110 2160 160 C 2520 70 2880 120 L 2880 200 L 0 200 Z"
            fill="url(#backWaveGrad)"
          />

          {/* Layer 2: Main Foreground Wave with Luminous Glow */}
          <path
            d="M 0 80 C 320 150 640 160 960 90 C 1280 20 1600 130 1920 80 C 2240 150 2560 160 2880 90 L 2880 200 L 0 200 Z"
            fill="url(#waveFillGrad)"
          />

          {/* Layer 3: Brilliant Glowing Cyan Wave Crest Ribbon Line */}
          <path
            d="M 0 80 C 320 150 640 160 960 90 C 1280 20 1600 130 1920 80 C 2240 150 2560 160 2880 90"
            stroke="url(#neonWaveEdge)"
            strokeWidth="3.5"
            filter="url(#waveNeonGlow)"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Embedded Keyframes for Fluid Wave Flow & Floating Animations */}
      <style>{`
        @keyframes waveFlow {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-wave-flow {
          animation: waveFlow 14s linear infinite;
        }

        @keyframes floatSlow {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-6px) rotate(1deg);
          }
        }
        .animate-float-slow {
          animation: floatSlow ease-in-out infinite;
        }

        @keyframes logoBreathe {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.025);
          }
        }
        .animate-logo-breathe {
          animation: logoBreathe 4s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-wave-flow {
            animation: none !important;
          }
          .animate-float-slow {
            animation: none !important;
          }
          .animate-logo-breathe {
            animation: none !important;
          }
          .animate-spin {
            animation: none !important;
          }
        }
      `}</style>

    </div>
  );
};

export const LoadingScreen = SplashScreen;
export default SplashScreen;
