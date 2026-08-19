import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Upload,
  ChevronRight,
  X,
  Sparkles,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Code
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const HomePage: React.FC = () => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<'text' | 'image' | 'web'>('text');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Science');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadSubmitted, setUploadSubmitted] = useState(false);

  const { requireAuth } = useAuth();

  // Listen for custom event to open upload modal after contextual authentication
  useEffect(() => {
    const handleOpenUploadEvent = () => {
      setUploadModalOpen(true);
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
      setUploadModalOpen(true);
    });
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requireAuth({ type: 'action', action: 'upload' }, () => {
      setUploadSubmitted(true);
      setTimeout(() => {
        setUploadSubmitted(false);
        setUploadModalOpen(false);
        setUploadTitle('');
        setUploadContent('');
      }, 2200);
    });
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

          {/* 4. Dual Primary Action Buttons */}
          <div className="animate-hero-4 pt-1 sm:pt-3 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 w-full max-w-xs sm:max-w-none mx-auto">
            
            {/* Explore CTA Button (Blue) - Contextually gated if guest */}
            <Link
              to="/explore"
              onClick={handleExploreClick}
              className="w-full sm:w-auto min-w-[145px] sm:min-w-[165px] py-2.5 sm:py-3 px-5 sm:px-6 bg-[#026fc3] hover:bg-[#025ea6] text-white rounded-full font-bold text-xs sm:text-sm md:text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg cta-btn-hover group cursor-pointer"
            >
              <Compass className="w-4 h-4 stroke-[2.5]" />
              <span className="font-extrabold tracking-wide">Explore</span>
              <ChevronRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* Upload CTA Button (Green) - Contextually gated if guest */}
            <button
              onClick={handleOpenUpload}
              className="w-full sm:w-auto min-w-[145px] sm:min-w-[165px] py-2.5 sm:py-3 px-5 sm:px-6 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-full font-bold text-xs sm:text-sm md:text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg cta-btn-hover-green group cursor-pointer"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" />
              <span className="font-extrabold tracking-wide">Upload</span>
              <ChevronRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* STUDENT UPLOAD MODAL (Post moderation, reflections, project sharing)      */}
      {/* ========================================================================= */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-5 relative animate-in zoom-in-95 duration-150">
            
            {/* Close Button */}
            <button
              onClick={() => setUploadModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>+20 XP on Approved Creation</span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Share Your Knowledge
              </h3>
              <p className="text-xs text-slate-500">
                Submit an educational post, reflection, diagram, or interactive web project.
              </p>
            </div>

            {uploadSubmitted ? (
              <div className="py-8 text-center space-y-3 animate-in zoom-in duration-200">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-extrabold text-slate-900">
                  Knowledge Submission Received!
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Your contribution is in review and will appear in the Community section once approved.
                </p>
              </div>
            ) : (
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                
                {/* Mode Selector Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                  <button
                    type="button"
                    onClick={() => setUploadTab('text')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      uploadTab === 'text'
                        ? 'bg-white text-[#026fc3] shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Summary</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadTab('image')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      uploadTab === 'image'
                        ? 'bg-white text-[#026fc3] shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Diagram</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadTab('web')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      uploadTab === 'web'
                        ? 'bg-white text-[#026fc3] shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>Web Embed</span>
                  </button>
                </div>

                {/* Category & Topic */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Category
                    </label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026fc3]"
                    >
                      <option value="Science">Science & Physics</option>
                      <option value="Psychology">Psychology & Habits</option>
                      <option value="English">English & Grammar</option>
                      <option value="Nature">Nature & Wildlife</option>
                      <option value="Life Skills">Life Skills</option>
                      <option value="Technology">Technology</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Lesson Title
                    </label>
                    <input
                      type="text"
                      required
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g. The 20-Second Rule"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026fc3]"
                    />
                  </div>
                </div>

                {/* Content / Upload Body */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    {uploadTab === 'text' && 'Educational Summary / Insight'}
                    {uploadTab === 'image' && 'Image or Diagram URL'}
                    {uploadTab === 'web' && 'HTML / Codepen / GitHub Project URL'}
                  </label>
                  {uploadTab === 'text' ? (
                    <textarea
                      required
                      rows={4}
                      value={uploadContent}
                      onChange={(e) => setUploadContent(e.target.value)}
                      placeholder="Write your explanation or key takeaway in clear, simple language..."
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026fc3]"
                    />
                  ) : (
                    <input
                      type="url"
                      required
                      value={uploadContent}
                      onChange={(e) => setUploadContent(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026fc3]"
                    />
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full py-3 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-2xl shadow-xs transition-all active:scale-98 cursor-pointer"
                >
                  Submit Knowledge for Review (+20 XP)
                </button>

              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
