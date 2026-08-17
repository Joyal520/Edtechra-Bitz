import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Upload,
  ChevronRight,
  Video,
  BookOpen,
  ClipboardList,
  UploadCloud,
  X,
  Sparkles,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Code,
  Download
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { InstallAppModal } from '@/components/InstallAppModal';

export const HomePage: React.FC = () => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<'text' | 'image' | 'web'>('text');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Science');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadSubmitted, setUploadSubmitted] = useState(false);

  const {
    canInstall,
    isInstalled,
    isIOS,
    iosModalOpen,
    setIosModalOpen,
    triggerInstall
  } = usePWAInstall();

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadSubmitted(true);
    setTimeout(() => {
      setUploadSubmitted(false);
      setUploadModalOpen(false);
      setUploadTitle('');
      setUploadContent('');
    }, 2500);
  };

  return (
    <div className="w-full space-y-10 sm:space-y-16 pb-12 sm:pb-20">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION WITH VERTICAL PAPER-CUT ARTWORK                           */}
      {/* ========================================================================= */}
      <section className="relative w-full max-w-6xl mx-auto px-2 sm:px-4 pt-1 sm:pt-2">
        <div className="relative rounded-3xl sm:rounded-[36px] overflow-hidden border border-stone-200/80 shadow-md bg-[#fbfbf7]">
          
          {/* Main Background Image - Clean Production Portrait Asset */}
          <div className="relative w-full min-h-[560px] xs:min-h-[590px] sm:min-h-[500px] md:min-h-[540px] lg:min-h-[580px] sm:aspect-[16/10] md:aspect-[16/9] lg:aspect-[21/10] overflow-hidden">
            <img
              src="/assets/edtechra-bitz-hero-portrait.png"
              alt="EdTechra-Bitz Papercraft Educational Landscape"
              className="w-full h-full object-cover object-[center_20%] sm:object-[center_28%] md:object-[center_32%] lg:object-[center_35%] pointer-events-none select-none transition-transform duration-700"
              loading="eager"
            />
          </div>

          {/* HTML Overlay Content (Layered seamlessly over the empty cream central area) */}
          <div className="absolute inset-0 z-10 flex flex-col justify-start items-center p-4 sm:p-6 md:p-8 lg:p-12 pointer-events-none">
            
            {/* Centered content box inside the open cream area */}
            <div className="w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl text-center mt-3 sm:mt-4 md:mt-6 lg:mt-8 space-y-2.5 sm:space-y-3.5 lg:space-y-4 pointer-events-auto">
              
              {/* Main Heading */}
              <h1 className="text-2xl sm:text-3xl md:text-[38px] lg:text-[46px] font-black text-[#0f233a] tracking-tight leading-[1.12] drop-shadow-2xs">
                Learn, Create<br />and Grow
              </h1>

              {/* Highlighted Secondary Line */}
              <p className="text-lg sm:text-xl md:text-[24px] lg:text-[28px] font-extrabold text-[#026fc3] tracking-tight">
                with EdTechra-Bitz
              </p>

              {/* Supporting Text */}
              <p className="text-[11px] sm:text-xs md:text-sm lg:text-[15px] font-semibold text-slate-700/90 leading-relaxed max-w-xs sm:max-w-sm mx-auto">
                Short videos. Smart lessons.<br />Real progress.
              </p>

              {/* Dual CTA Buttons (Horizontal on Desktop/Tablet, Stacked on Small Mobile) */}
              <div className="pt-1 sm:pt-3 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 max-w-xs sm:max-w-none mx-auto">
                
                {/* Explore CTA Button (Blue) */}
                <Link
                  to="/explore"
                  className="w-full sm:w-auto min-w-[140px] sm:min-w-[155px] py-2 sm:py-2.5 px-4 sm:px-5 bg-[#026fc3] hover:bg-[#025ea6] text-white rounded-full font-extrabold text-xs sm:text-sm md:text-base flex items-center justify-between gap-2.5 shadow-md hover:shadow-lg cta-btn-hover group"
                >
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                    <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                  </div>
                  <span className="flex-1 text-center">Explore</span>
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/80 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                {/* Upload CTA Button (Green) */}
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="w-full sm:w-auto min-w-[140px] sm:min-w-[155px] py-2 sm:py-2.5 px-4 sm:px-5 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-full font-extrabold text-xs sm:text-sm md:text-base flex items-center justify-between gap-2.5 shadow-md hover:shadow-lg cta-btn-hover group"
                >
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                    <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                  </div>
                  <span className="flex-1 text-center">Upload</span>
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/80 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Install App Hero Option (Desktop & Mobile) */}
              {!isInstalled && (
                <div className="pt-2 sm:pt-2.5">
                  <button
                    onClick={triggerInstall}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/90 hover:bg-white text-[#0f233a] border border-stone-200/90 hover:border-[#026fc3] rounded-full shadow-2xs hover:shadow-xs text-[11px] sm:text-xs font-extrabold transition-all group active:scale-95"
                    title="Install EdTechra-Bitz PWA"
                  >
                    <div className="w-5 h-5 rounded-full bg-brand-50 text-[#026fc3] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Download className="w-3 h-3 stroke-[2.5]" />
                    </div>
                    <span>Install App</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-semibold group-hover:text-slate-700">Learn anywhere</span>
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>
      </section>


      {/* ========================================================================= */}
      {/* 2. WHY EDTECHRA-BITZ? SECTION (Soft Papercraft Aesthetics, 4 Open Columns) */}
      {/* ========================================================================= */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-8 sm:space-y-10">
        
        {/* Section Heading & Green Accent Bar */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl md:text-[28px] font-black text-[#0f233a] tracking-tight">
            Why EdTechra-Bitz?
          </h2>
          <div className="w-10 h-1 bg-[#22c55e] rounded-full mx-auto"></div>
        </div>

        {/* 4 Feature Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6 lg:gap-8">
          
          {/* Feature 1: Short & Smart */}
          <div className="flex flex-col items-center text-center space-y-2.5 group">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#f3e8ff] text-[#9333ea] flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300">
              <Video className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="font-extrabold text-sm sm:text-base text-[#0f233a]">
              Short & Smart
            </h3>
            <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">
              Watch short videos and learn key ideas in minutes.
            </p>
          </div>

          {/* Feature 2: Understand Deeply */}
          <div className="flex flex-col items-center text-center space-y-2.5 group">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#dcfce7] text-[#16a34a] flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300">
              <BookOpen className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="font-extrabold text-sm sm:text-base text-[#0f233a]">
              Understand Deeply
            </h3>
            <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">
              Read simple lessons and explanations that stick.
            </p>
          </div>

          {/* Feature 3: Practice & Improve */}
          <div className="flex flex-col items-center text-center space-y-2.5 group">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#fef3c7] text-[#d97706] flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300">
              <ClipboardList className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="font-extrabold text-sm sm:text-base text-[#0f233a]">
              Practice & Improve
            </h3>
            <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">
              Answer questions and complete fun tasks.
            </p>
          </div>

          {/* Feature 4: Create & Share */}
          <div className="flex flex-col items-center text-center space-y-2.5 group">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#ffe4e6] text-[#e11d48] flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300">
              <UploadCloud className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="font-extrabold text-sm sm:text-base text-[#0f233a]">
              Create & Share
            </h3>
            <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">
              Upload your ideas, projects and help others learn.
            </p>
          </div>

        </div>
      </section>


      {/* ========================================================================= */}
      {/* 3. PWA INSTALLATION SECTION (Brand-Aligned Microlearning Card)            */}
      {/* ========================================================================= */}
      {!isInstalled && (
        <section className="w-full max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-tr from-white via-white to-blue-50/60 border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
            
            <div className="flex items-center gap-4">
              <img
                src="/logo.png"
                alt="EdTechra-Bitz Official Logo"
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-3xl object-cover shadow-sm ring-2 ring-[#026fc3]/20 shrink-0"
              />
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 bg-brand-50 text-[#026fc3] text-[10px] font-extrabold rounded-md border border-brand-200 uppercase tracking-wider">
                    Progressive Web App
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">Free</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-[#0f233a]">
                  Learn Anywhere on Your Device
                </h3>
                <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                  Install EdTechra-Bitz to your home screen or desktop for fast, fullscreen microlearning with offline lesson support.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto shrink-0">
              <button
                onClick={triggerInstall}
                className="w-full sm:w-auto px-6 py-3 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs sm:text-sm font-extrabold rounded-2xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2 group"
              >
                <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                <span>Install App</span>
              </button>
            </div>

          </div>
        </section>
      )}


      {/* ========================================================================= */}
      {/* 4. STUDENT UPLOAD MODAL (Post moderation, reflections, project sharing)   */}
      {/* ========================================================================= */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-5 relative">
            
            {/* Close Button */}
            <button
              onClick={() => setUploadModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
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
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Submission Received!</h4>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  Your creation is now in <strong>Pending Moderation</strong> status. Once reviewed by
                  a teacher, it will appear publicly on Explore and reward you <strong>+20 XP</strong>!
                </p>
              </div>
            ) : (
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                {/* Content Type Tabs */}
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setUploadTab('text')}
                    className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                      uploadTab === 'text'
                        ? 'bg-white text-[#0f233a] shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> Text / Notes
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadTab('image')}
                    className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                      uploadTab === 'image'
                        ? 'bg-white text-[#0f233a] shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Diagram
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadTab('web')}
                    className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                      uploadTab === 'web'
                        ? 'bg-white text-[#0f233a] shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" /> Web Project
                  </button>
                </div>

                {/* Title Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. My simple guide to Newton's First Law..."
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                {/* Topic / Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  >
                    <option value="Science">Science & Physics</option>
                    <option value="English">English & Vocabulary</option>
                    <option value="AI">AI & Computing</option>
                    <option value="ICT">ICT & Web Development</option>
                    <option value="Critical Thinking">Critical Thinking</option>
                  </select>
                </div>

                {/* Content / Notes */}
                {uploadTab === 'text' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Explanation & Notes
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={uploadContent}
                      onChange={(e) => setUploadContent(e.target.value)}
                      placeholder="Explain your concept in 50-150 words..."
                      className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>
                )}

                {uploadTab === 'image' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Upload Educational Image / Diagram
                    </label>
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-emerald-400 transition-colors cursor-pointer bg-slate-50">
                      <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <span className="text-xs font-bold text-slate-700 block">
                        Drag and drop or click to browse
                      </span>
                      <span className="text-[10px] text-slate-400">PNG, JPG, SVG up to 5MB</span>
                    </div>
                  </div>
                )}

                {uploadTab === 'web' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      HTML Simulation / Interactive Project
                    </label>
                    <textarea
                      rows={4}
                      value={uploadContent}
                      onChange={(e) => setUploadContent(e.target.value)}
                      placeholder="Paste your HTML / CSS / JS code for sandboxed preview..."
                      className="w-full p-3 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">
                      🔒 Runs in a secure sandboxed environment.
                    </span>
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-extrabold text-white bg-[#22c55e] hover:bg-[#16a34a] rounded-xl shadow-xs transition-all active:scale-95"
                  >
                    Submit for Review
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* iOS / PWA Installation Modal */}
      <InstallAppModal
        isOpen={iosModalOpen}
        onClose={() => setIosModalOpen(false)}
        isIOS={isIOS}
        hasNativePrompt={canInstall && !isIOS}
        onNativeInstall={triggerInstall}
      />
    </div>
  );
};
