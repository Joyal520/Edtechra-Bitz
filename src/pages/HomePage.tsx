import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  Upload,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PostComposerModal } from '@/components/PostFeed/PostComposerModal';
import { StudentPost } from '@/types/post';

export const HomePage: React.FC = () => {
  const [postComposerOpen, setPostComposerOpen] = useState(false);
  const navigate = useNavigate();
  const { requireAuth } = useAuth();

  // Listen for custom event to open post composer modal after contextual authentication
  useEffect(() => {
    const handleOpenUploadEvent = () => {
      setPostComposerOpen(true);
    };
    window.addEventListener('edtechra:open_upload_modal', handleOpenUploadEvent);
    return () => {
      window.removeEventListener('edtechra:open_upload_modal', handleOpenUploadEvent);
    };
  }, []);

  const handleExploreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    requireAuth({ type: 'navigate', path: '/explore' });
  };

  const handleOpenUpload = () => {
    requireAuth({ type: 'action', action: 'upload' }, () => {
      setPostComposerOpen(true);
    });
  };

  const handlePostCreated = (_newPost: StudentPost) => {
    navigate('/explore');
  };

  return (
    <div className="relative w-full h-full flex-1 flex flex-col justify-center items-center px-3 sm:px-6 py-2 sm:py-4 overflow-hidden select-none bg-[#020813]">
      
      {/* ========================================================================= */}
      {/* FULL-SCREEN HERO PAPER-CUT CANVAS (1920x1080 Composition with Neon Aura) */}
      {/* ========================================================================= */}
      <div className="relative w-full max-w-[1440px] h-[calc(100dvh-5.5rem)] sm:h-[calc(100vh-5.8rem)] max-h-[860px] rounded-3xl sm:rounded-[36px] overflow-hidden border-2 border-sky-400/80 shadow-[0_0_35px_rgba(56,189,248,0.45)] bg-[#fbfbf7] flex items-center justify-center">
        
        {/* Animated Background Layer: Animated WebP for Mobile, Looping Video for Desktop */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none animate-hero-bg">
          {/* Mobile Animated WebP Asset (< 640px) with Static Fallback */}
          <div className="block sm:hidden absolute inset-0 w-full h-full">
            <picture className="w-full h-full">
              <source
                type="image/webp"
                srcSet="/assets/edtechra-bitz-hero-mobile-animated.webp"
              />
              <img
                src="/assets/edtechra-bitz-hero-mobile.webp"
                alt="EdTechra Papercraft Educational Background"
                className="w-full h-full object-cover object-bottom pointer-events-none select-none"
                loading="eager"
                decoding="async"
              />
            </picture>
          </div>

          {/* Desktop Hero Background (>= 640px) with Video and Fallback Poster */}
          <div className="hidden sm:block absolute inset-0 w-full h-full">
            <picture className="absolute inset-0 w-full h-full">
              <img
                src="/assets/hero-papercraft.jpg"
                alt="EdTechra Papercraft Educational Background"
                className="w-full h-full object-cover object-center pointer-events-none select-none"
                loading="eager"
              />
            </picture>

            {/* High-Performance Web-Optimized Looping Hero Video */}
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="/assets/hero-papercraft.jpg"
              className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
            >
              <source src="/assets/edtechra-bitz-hero.webm" type="video/webm" />
            </video>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CENTRAL HERO TYPOGRAPHY & INTERACTIVE ACTIONS                            */}
        {/* ========================================================================= */}
        <div className="relative z-10 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl text-center px-4 py-3 sm:py-6 flex flex-col items-center justify-center space-y-2.5 sm:space-y-3.5 md:space-y-4">
          
          {/* 1. Main Heading */}
          <h1 className="animate-hero-1 text-3xl xs:text-4xl sm:text-5xl md:text-[50px] lg:text-[58px] font-black text-[#0f233a] tracking-tight leading-[1.08] drop-shadow-2xs">
            Learn, Create<br />and Grow
          </h1>

          {/* 2. Highlighted Brand Line */}
          <p className="animate-hero-2 text-xl xs:text-2xl sm:text-3xl md:text-[28px] lg:text-[32px] font-extrabold text-[#026fc3] tracking-tight">
            with EdTechra
          </p>

          {/* 3. Supporting Text */}
          <p className="animate-hero-3 text-xs sm:text-sm md:text-base lg:text-[16px] font-semibold text-slate-700/90 leading-relaxed max-w-xs sm:max-w-sm md:max-w-md mx-auto">
            Short videos. Smart lessons.<br className="sm:hidden" /> Real progress.
          </p>

          {/* 4. Dual Primary Action Buttons (Short, cute, centered on mobile; balanced on desktop) */}
          <div className="animate-hero-4 pt-1.5 sm:pt-3 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 w-full mx-auto">
            
            {/* Explore CTA Button (Blue) - Contextually gated if guest */}
            <Link
              to="/explore"
              onClick={handleExploreClick}
              className="w-fit min-w-[150px] sm:min-w-[165px] min-h-[44px] py-2.5 sm:py-3 px-5 sm:px-6 bg-[#026fc3] hover:bg-[#025ea6] text-white rounded-full font-black text-xs sm:text-sm md:text-base flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-95 cta-btn-hover group cursor-pointer transition-all"
            >
              <Compass className="w-4 h-4 stroke-[2.5]" />
              <span className="tracking-wide">Explore</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/80 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* Upload CTA Button (Green) - Contextually gated if guest */}
            <button
              onClick={handleOpenUpload}
              className="w-fit min-w-[150px] sm:min-w-[165px] min-h-[44px] py-2.5 sm:py-3 px-5 sm:px-6 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-full font-black text-xs sm:text-sm md:text-base flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-95 cta-btn-hover-green group cursor-pointer transition-all"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" />
              <span className="tracking-wide">Upload</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/80 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* STUDENT POST COMPOSER MODAL (1:1 Media, R2 Storage & Adaptive Optimizer)  */}
      {/* ========================================================================= */}
      <PostComposerModal
        isOpen={postComposerOpen}
        onClose={() => setPostComposerOpen(false)}
        onPostCreated={handlePostCreated}
      />

    </div>
  );
};
