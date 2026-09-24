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
  UserPlus,
  GraduationCap
} from 'lucide-react';
import { Classroom, ClassroomInvite } from '@/types/classroom';

interface ClassroomHeaderProps {
  classroom: Classroom;
  invite: ClassroomInvite | null;
  isTeacher?: boolean;
  onOpenSettings?: () => void;
  onOpenAIFeedback?: () => void;
  onEnterClassroom?: () => void;
}

export const ClassroomHeader: React.FC<ClassroomHeaderProps> = ({
  classroom,
  invite,
  isTeacher,
  onOpenSettings,
  onOpenAIFeedback,
  onEnterClassroom
}) => {
  const effectiveIsTeacher = Boolean(
    isTeacher !== undefined
      ? isTeacher
      : (classroom.teacher_id && classroom.user_role !== 'student' && classroom.user_role === 'teacher')
  );
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const optionsMenuRef = useRef<HTMLDivElement>(null);
  const mobileOptionsMenuRef = useRef<HTMLDivElement>(null);

  const inviteCode = invite?.invite_code || '...';
  const inviteUrl = `${window.location.origin}/classes/join/${inviteCode}`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideDesktop = optionsMenuRef.current && optionsMenuRef.current.contains(target);
      const insideMobile = mobileOptionsMenuRef.current && mobileOptionsMenuRef.current.contains(target);
      if (!insideDesktop && !insideMobile) {
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
    <div className="relative bg-white rounded-2xl sm:rounded-3xl lg:rounded-[32px] p-4 sm:p-7 lg:p-8 border border-slate-200/80 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden transition-all text-slate-900">
      {/* Top Bar for Mobile (< 640px): Back on Left, Options on Right */}
      <div className="flex sm:hidden items-center justify-between gap-2 mb-3.5 relative z-20">
        <Link
          to="/classes"
          className="group inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-full transition-all duration-200 border border-slate-200/80 shadow-2xs active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-600 group-hover:-translate-x-0.5 transition-transform" />
          <span>Classes</span>
        </Link>

        <div className="flex items-center gap-2">
          {onOpenAIFeedback && (
            <button
              onClick={onOpenAIFeedback}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-full transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>Diagnosis</span>
            </button>
          )}

          {/* Mobile Options Button [ ••• ] — TEACHER ONLY */}
          {effectiveIsTeacher && (
            <div className="relative inline-block" ref={mobileOptionsMenuRef}>
              <button
                type="button"
                onClick={() => setOptionsMenuOpen(prev => !prev)}
                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 shadow-2xs cursor-pointer active:scale-95 shrink-0 ${
                  optionsMenuOpen
                    ? 'bg-sky-50 border-sky-300 text-[#0284c7]'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-600 hover:text-slate-900'
                }`}
                title="Classroom Options"
                aria-label="Classroom Options"
              >
                <MoreHorizontal className="w-4 h-4 stroke-[2.2]" />
              </button>

              {optionsMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white border border-slate-200 shadow-[0_12px_32px_-4px_rgba(15,23,42,0.18)] p-2 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100 text-slate-800">
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
          )}
        </div>
      </div>

      {/* Top Bar for Desktop (>= 640px): Back on Left, Diagnosis + CLASSROOM Badge on Right */}
      <div className="hidden sm:flex items-center justify-between gap-3 mb-4 sm:mb-5 relative z-10 flex-wrap">
        <Link
          to="/classes"
          className="group inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-50/80 hover:bg-slate-100 px-3.5 sm:px-4 py-2 rounded-full transition-all duration-200 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Classes</span>
        </Link>

        <div className="flex items-center gap-2">
          {onOpenAIFeedback && (
            <button
              onClick={onOpenAIFeedback}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-full transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Teaching Intelligence</span>
            </button>
          )}

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-[#0284c7] text-xs font-black uppercase tracking-wider shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#0284c7]" />
            <span>CLASSROOM</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center relative z-10">
        {/* Left Headline, Details, Tagline & Action */}
        <div className="lg:col-span-7 space-y-3.5 sm:space-y-4">
          <div className="space-y-2.5">
            {/* Split Classroom Title */}
            {(() => {
              const titleStr = (classroom.title || 'Classroom').trim();
              const words = titleStr.split(' ');
              if (words.length > 1) {
                const lastWord = words.pop();
                const firstPart = words.join(' ');
                return (
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-[#0f172a] break-words">
                    <span>{firstPart} </span>
                    <span className="text-[#0284c7]">{lastWord}</span>
                  </h1>
                );
              }
              return (
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-[#0f172a] break-words">
                  {classroom.title}
                </h1>
              );
            })()}

            {/* Metadata Pills */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap pt-0.5">
              <span className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 border border-slate-200/80 shadow-2xs">
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0284c7] stroke-[2]" />
                <span>{classroom.subject || 'General'}</span>
              </span>

              {classroom.grade && (
                <span className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 border border-slate-200/80 shadow-2xs">
                  <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0284c7] stroke-[2]" />
                  <span>{classroom.grade.toLowerCase().startsWith('grade') ? classroom.grade : `Grade ${classroom.grade}`}</span>
                </span>
              )}

              {effectiveIsTeacher && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-purple-50 text-xs font-bold text-purple-800 border border-purple-200 shadow-2xs">
                  <span>Teacher Workspace</span>
                </span>
              )}
            </div>
          </div>

          {/* Tagline / Motto */}
          <p className="text-sm sm:text-base font-semibold italic text-slate-600 tracking-wide pt-0.5">
            Learn • Practise • Improve • Grow Together
          </p>

          {/* Action Buttons: Primary Enter Classroom CTA & Options Button */}
          <div className="pt-1.5 flex items-center gap-3 flex-wrap">
            {onEnterClassroom && (
              <button
                type="button"
                onClick={onEnterClassroom}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3 rounded-full font-bold text-sm sm:text-base text-white bg-gradient-to-r from-[#0091ff] via-[#0084f0] to-[#0070e0] hover:from-[#0084f0] hover:to-[#0060c8] shadow-[0_4px_16px_rgba(0,145,255,0.3)] active:scale-95 transition-all duration-200 cursor-pointer group shrink-0"
              >
                <span>Enter Classroom</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform stroke-[2.5]" />
              </button>
            )}

            {/* Desktop Secondary Options Button: [ ••• ] */}
            {effectiveIsTeacher && (
              <div className="hidden sm:inline-block relative" ref={optionsMenuRef}>
                <button
                  type="button"
                  onClick={() => setOptionsMenuOpen(prev => !prev)}
                  className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] cursor-pointer active:scale-95 shrink-0 ${
                    optionsMenuOpen
                      ? 'bg-sky-50 border-sky-300 text-[#0284c7]'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                  title="Classroom Options"
                  aria-label="Classroom Options"
                >
                  <MoreHorizontal className="w-5 h-5 stroke-[2.2]" />
                </button>

                {optionsMenuOpen && (
                  <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-[0_12px_32px_-4px_rgba(15,23,42,0.15)] p-2 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100 text-slate-800">
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
            )}
          </div>
        </div>

        {/* Right Seamless Educational Illustration */}
        <div className="lg:col-span-5 relative flex items-center justify-center lg:justify-end pt-2 lg:pt-0 select-none pointer-events-none">
          <img
            src="/images/classroom/classroom-hero-student.jpg"
            alt="Classroom Student Learning"
            className="w-full max-w-[260px] sm:max-w-[320px] lg:max-w-[380px] h-auto object-contain transition-transform duration-300 select-none pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
};
