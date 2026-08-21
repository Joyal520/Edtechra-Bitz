import React from 'react';

interface SplashScreenProps {
  statusMessage?: string;
  isFadingOut?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  statusMessage = 'Loading amazing learning...',
  isFadingOut = false
}) => {
  return (
    <div
      className={`fixed inset-0 z-[9999] w-screen h-[100dvh] bg-[#020813] flex flex-col items-center justify-between p-6 overflow-hidden select-none transition-all duration-500 ease-out ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'radial-gradient(circle at 50% 30%, #08203e 0%, #030d1e 50%, #020813 100%)'
      }}
    >
      {/* Background Star / Particle Sparkles (Pure CSS, GPU Friendly) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/5 w-1 h-1 bg-cyan-300 rounded-full animate-ping opacity-60" />
        <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse opacity-70" />
        <div className="absolute top-1/2 left-1/3 w-1 h-1 bg-sky-200 rounded-full opacity-40" />
        <div className="absolute top-2/3 right-1/5 w-1 h-1 bg-cyan-400 rounded-full animate-pulse opacity-50" />
        <div className="absolute top-1/6 right-1/3 w-1 h-1 bg-white rounded-full opacity-60" />
      </div>

      {/* Top Spacer */}
      <div className="w-full h-8" />

      {/* Center Branding & Progress */}
      <div className="flex flex-col items-center justify-center text-center space-y-6 relative z-10 my-auto">
        {/* Glowing 3D Logo with Ambient Aura */}
        <div className="relative group">
          {/* Ambient Glow */}
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-blue-600/40 via-cyan-400/30 to-sky-600/40 blur-xl animate-pulse" />
          
          <img
            src="/logo-emblem.png"
            alt="EdTechra Bitz Logo"
            className="relative w-36 h-36 sm:w-44 sm:h-44 object-contain drop-shadow-[0_12px_28px_rgba(2,111,195,0.45)] transform transition-transform"
          />
        </div>

        {/* Brand Name & Tagline */}
        <div className="space-y-1.5 pt-1">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-widest flex items-center justify-center gap-0.5">
            <span>EDTECH</span>
            <span className="text-cyan-400">RA</span>
          </h1>

          <div className="text-xs font-black tracking-[0.35em] text-sky-300 uppercase">
            — B I T Z —
          </div>

          <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.25em] text-slate-400 uppercase pt-0.5">
            LEARN. DISCOVER. GROW.
          </div>
        </div>

        {/* Sleek Luminous Loading Ring */}
        <div className="pt-5 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 rounded-full border-[3px] border-sky-500/20 border-t-cyan-400 animate-spin shadow-[0_0_18px_rgba(56,189,248,0.55)]" />
          
          <p className="text-xs font-semibold text-slate-300/80 tracking-wide animate-pulse">
            {statusMessage}
          </p>
        </div>
      </div>

      {/* Bottom Luminous Wave Mesh */}
      <div className="w-full relative z-0 shrink-0 pointer-events-none flex justify-center">
        <img
          src="/splash-wave.png"
          alt=""
          className="w-full max-w-xl h-24 sm:h-32 object-cover object-top opacity-50 filter hue-rotate-15 contrast-125"
        />
      </div>
    </div>
  );
};
