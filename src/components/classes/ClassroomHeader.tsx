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
    <div className="relative bg-gradient-to-br from-[#e0f2fe]/90 via-[#f0f9ff] to-[#e8f5fe]/95 rounded-3xl sm:rounded-[36px] p-6 sm:p-8 lg:p-10 shadow-[0_15px_40px_-10px_rgba(2,111,195,0.12)] overflow-hidden border border-sky-200/90 transition-all">
      {/* Subtle Organic Background Glow Waves */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-sky-200/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />

      {/* Top back & tag navigation */}
      <div className="flex items-center justify-between gap-4 mb-5 sm:mb-6 relative z-10 flex-wrap">
        <Link
          to="/classes"
          className="group inline-flex items-center gap-2 text-xs font-bold text-sky-800 hover:text-sky-950 bg-white/90 hover:bg-white backdrop-blur-md px-4 py-2 rounded-full transition-all duration-200 border border-sky-200/80 shadow-2xs active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>All Classes</span>
        </Link>

        <div className="flex items-center gap-2">
          {onOpenAIFeedback && (
            <button
              onClick={onOpenAIFeedback}
              className="inline-flex items-center gap-1.5 text-xs font-black text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3.5 py-1.5 rounded-full transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Teaching Intelligence</span>
            </button>
          )}

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/85 border border-sky-200 text-[#0284c7] text-[11px] font-black uppercase tracking-widest shadow-2xs backdrop-blur-xs">
            <Sparkles className="w-3 h-3 text-[#0284c7]" />
            <span>CLASSROOM</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Headline & Details, Right 3D Illustration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center relative z-10">
        
        {/* Left Content */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-5">
          <div className="space-y-3">
            {/* Split Classroom Title */}
            {(() => {
              const titleStr = (classroom.title || 'Classroom').trim();
              const words = titleStr.split(' ');
              if (words.length > 1) {
                const lastWord = words.pop();
                const firstPart = words.join(' ');
                return (
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-[42px] font-black tracking-tight leading-[1.15] text-slate-900 drop-shadow-xs">
                    <span>{firstPart} </span>
                    <span className="text-[#0284c7]">{lastWord}</span>
                  </h1>
                );
              }
              return (
                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-[42px] font-black tracking-tight leading-[1.15] text-slate-900 drop-shadow-xs">
                  {classroom.title}
                </h1>
              );
            })()}

            {/* Metadata Pills */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap pt-0.5">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-xs font-bold text-slate-700 border border-sky-200/80 shadow-2xs">
                <BookOpen className="w-3.5 h-3.5 text-[#0284c7]" />
                <span>{classroom.subject || 'General'}</span>
              </span>

              {classroom.grade && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-xs font-bold text-slate-700 border border-sky-200/80 shadow-2xs">
                  <span>{classroom.grade}</span>
                </span>
              )}

              {classroom.user_role === 'teacher' && (
                <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-purple-50/90 backdrop-blur-md text-xs font-bold text-purple-700 border border-purple-200 shadow-2xs">
                  <span>Teacher Workspace</span>
                </span>
              )}
            </div>
          </div>

          {/* Inspirational Tagline */}
          <blockquote className="text-sm sm:text-base text-slate-500 font-medium italic border-l-2 border-sky-300 pl-3.5 py-0.5 max-w-xl">
            &ldquo;Empower your classroom, inspire your students.&rdquo;
          </blockquote>

          {/* Actions: Enter Classroom CTA & Options Dropdown */}
          <div className="pt-2 flex items-center gap-3 flex-wrap">
            {onEnterClassroom && (
              <button
                type="button"
                onClick={onEnterClassroom}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-black text-sm text-white bg-gradient-to-r from-[#0284c7] via-[#0275be] to-[#0369a1] hover:from-[#0369a1] hover:to-[#0284c7] shadow-[0_8px_20px_-4px_rgba(2,132,199,0.38)] active:scale-95 transition-all duration-200 cursor-pointer group shrink-0"
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
                className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-200 shadow-2xs cursor-pointer active:scale-95 shrink-0 ${
                  optionsMenuOpen
                    ? 'bg-sky-100 border-sky-300 text-[#0284c7]'
                    : 'bg-white/90 hover:bg-white border-sky-200 text-slate-700 hover:text-slate-900'
                }`}
                title="Classroom Options"
                aria-label="Classroom Options"
              >
                <MoreHorizontal className="w-5 h-5 stroke-[2.2]" />
              </button>

              {optionsMenuOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-64 rounded-2xl bg-white border border-sky-100 shadow-[0_12px_32px_-4px_rgba(15,23,42,0.15)] p-2 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100">
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

        {/* Right 3D Illustration */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end relative">
          <div className="relative w-full max-w-[280px] sm:max-w-[340px] lg:max-w-[380px] aspect-square flex items-center justify-center">
            <div className="absolute inset-0 bg-sky-200/50 rounded-full blur-2xl pointer-events-none transform scale-90" />
            <img
              src="/images/classroom/classroom-hero-student.jpg"
              alt="Classroom Illustration"
              className="w-full h-full object-contain mix-blend-multiply relative z-10 transition-transform duration-300 hover:scale-105 select-none pointer-events-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
