import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Copy,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Settings,
  MessageSquareShare,
  BookOpen,
  MoreHorizontal,
  Link2,
  UserPlus
} from 'lucide-react';
import { Classroom, ClassroomInvite } from '@/types/classroom';

interface ClassroomHeaderProps {
  classroom: Classroom;
  invite: ClassroomInvite | null;
  onOpenSettings?: () => void;
  onOpenAIFeedback?: () => void;
  onEnterClassroom?: () => void;
}

export const ClassroomHeader: React.FC<ClassroomHeaderProps> = ({
  classroom,
  invite,
  onOpenSettings,
  onOpenAIFeedback,
  onEnterClassroom
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const optionsMenuRef = useRef<HTMLDivElement>(null);

  const inviteCode = invite?.invite_code || '...';
  const inviteUrl = `${window.location.origin}/classes/join/${inviteCode}`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
        setOptionsMenuOpen(false);
      }
    };
    if (optionsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [optionsMenuOpen]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = `Join my classroom "${classroom.title}" on EdTechra!\nUse code: ${inviteCode}\nOr click link: ${inviteUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="relative bg-gradient-to-br from-[#0a192f] via-[#0d223f] to-[#071322] text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-7 shadow-[0_12px_36px_-6px_rgba(2,111,195,0.25)] overflow-hidden border border-sky-500/25 transition-all">
      {/* Subtle Organic Background Glow Waves */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-16 w-64 h-64 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 left-1/3 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top back & tag navigation */}
      <div className="flex items-center justify-between gap-3 mb-3.5 sm:mb-4 relative z-10 flex-wrap">
        <Link
          to="/classes"
          className="group inline-flex items-center gap-2 text-xs font-bold text-sky-200 hover:text-white bg-white/10 hover:bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-full transition-all duration-200 border border-sky-400/20 shadow-xs active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>All Classes</span>
        </Link>

        <div className="flex items-center gap-2">
          {onOpenAIFeedback && (
            <button
              onClick={onOpenAIFeedback}
              className="inline-flex items-center gap-1.5 text-xs font-black text-purple-200 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 px-3 py-1 rounded-full transition-all shadow-xs active:scale-95 cursor-pointer backdrop-blur-md"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>Teaching Intelligence</span>
            </button>
          )}

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-[10px] font-black uppercase tracking-widest shadow-2xs backdrop-blur-xs">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>CLASSROOM</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Headline & Details, Right 3D Illustration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-center relative z-10">
        
        {/* Left Content (8 cols) */}
        <div className="lg:col-span-8 space-y-3 sm:space-y-3.5">
          <div className="space-y-2">
            {/* Split Classroom Title */}
            {(() => {
              const titleStr = (classroom.title || 'Classroom').trim();
              const words = titleStr.split(' ');
              if (words.length > 1) {
                const lastWord = words.pop();
                const firstPart = words.join(' ');
                return (
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight text-white drop-shadow-xs">
                    <span>{firstPart} </span>
                    <span className="text-cyan-400">{lastWord}</span>
                  </h1>
                );
              }
              return (
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight text-white drop-shadow-xs">
                  {classroom.title}
                </h1>
              );
            })()}

            {/* Metadata Pills */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap pt-0.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-sky-100 border border-white/10 shadow-xs">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>{classroom.subject || 'General'}</span>
              </span>

              {classroom.grade && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-sky-100 border border-white/10 shadow-xs">
                  <span>{classroom.grade}</span>
                </span>
              )}

              {classroom.user_role === 'teacher' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/25 backdrop-blur-md text-xs font-bold text-purple-200 border border-purple-400/30 shadow-xs">
                  <span>Teacher Workspace</span>
                </span>
              )}
            </div>
          </div>

          {/* Tagline */}
          <blockquote className="text-xs sm:text-sm text-sky-200/80 font-medium italic border-l-2 border-cyan-400/60 pl-3 py-0.5 max-w-xl">
            &ldquo;Empower your classroom, inspire your students.&rdquo;
          </blockquote>

          {/* Actions: Enter Classroom CTA & Options Dropdown */}
          <div className="pt-1 flex items-center gap-3 flex-wrap">
            {onEnterClassroom && (
              <button
                type="button"
                onClick={onEnterClassroom}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-black text-xs sm:text-sm text-white bg-gradient-to-r from-sky-500 via-cyan-500 to-sky-600 hover:from-sky-400 hover:to-cyan-400 shadow-[0_4px_16px_rgba(14,165,233,0.35)] active:scale-95 transition-all duration-200 cursor-pointer group shrink-0"
              >
                <span>Enter Classroom</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform stroke-[2.5]" />
              </button>
            )}

            {/* Options Button [ ••• ] */}
            <div className="relative inline-block" ref={optionsMenuRef}>
              <button
                type="button"
                onClick={() => setOptionsMenuOpen(prev => !prev)}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border transition-all duration-200 shadow-xs cursor-pointer active:scale-95 shrink-0 ${
                  optionsMenuOpen
                    ? 'bg-cyan-500/30 border-cyan-400 text-cyan-300'
                    : 'bg-white/10 hover:bg-white/20 border-white/15 text-sky-200 hover:text-white'
                }`}
                title="Classroom Options"
                aria-label="Classroom Options"
              >
                <MoreHorizontal className="w-5 h-5 stroke-[2.2]" />
              </button>

              {optionsMenuOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-64 rounded-2xl bg-white border border-sky-100 shadow-[0_12px_32px_-4px_rgba(15,23,42,0.15)] p-2 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100 text-slate-800">
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyCode();
                        setOptionsMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-700 hover:text-[#0284c7] hover:bg-sky-50 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Copy className="w-4 h-4 text-sky-500" />
                        <span>Copy Class Code</span>
                      </div>
                      <span className="font-mono text-[11px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {copiedCode ? 'Copied!' : inviteCode}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleCopyLink();
                        setOptionsMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-700 hover:text-[#0284c7] hover:bg-sky-50 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Link2 className="w-4 h-4 text-blue-500" />
                        <span>Copy Class Link</span>
                      </div>
                      {copiedLink && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Copied!
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleWhatsAppShare();
                        setOptionsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <MessageSquareShare className="w-4 h-4 text-emerald-500" />
                      <span>Share via WhatsApp</span>
                    </button>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyLink();
                        alert(`Class Invite Link copied!\n\nShare with students:\n${inviteUrl}\nClass Code: ${inviteCode}`);
                        setOptionsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4 text-indigo-500" />
                      <span>Invite Students</span>
                    </button>

                    {onOpenSettings && (
                      <button
                        type="button"
                        onClick={() => {
                          setOptionsMenuOpen(false);
                          onOpenSettings();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        <span>Class Settings</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Compact 3D Illustration (4 cols) */}
        <div className="lg:col-span-4 flex justify-center lg:justify-end relative">
          <div className="relative w-full max-w-[140px] sm:max-w-[170px] lg:max-w-[200px] aspect-square flex items-center justify-center">
            <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl pointer-events-none transform scale-90" />
            <img
              src="/images/classroom/classroom-hero-student.jpg"
              alt="Classroom Illustration"
              className="w-full h-full object-contain rounded-2xl relative z-10 transition-transform duration-300 hover:scale-105 select-none pointer-events-none drop-shadow-md"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
