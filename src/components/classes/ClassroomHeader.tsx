import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Share2,
  Copy,
  Check,
  Sparkles,
  ArrowLeft,
  Settings,
  MessageSquareShare
} from 'lucide-react';
import { Classroom, ClassroomInvite } from '@/types/classroom';

interface ClassroomHeaderProps {
  classroom: Classroom;
  invite: ClassroomInvite | null;
  onOpenSettings?: () => void;
  onOpenAIFeedback?: () => void;
}

export const ClassroomHeader: React.FC<ClassroomHeaderProps> = ({
  classroom,
  invite,
  onOpenSettings,
  onOpenAIFeedback
}) => {
  const [copied, setCopied] = useState(false);

  const inviteCode = invite?.invite_code || '...';
  const inviteUrl = `${window.location.origin}/classes/join/${inviteCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = `Join my classroom "${classroom.title}" on EdTechra!\nUse code: ${inviteCode}\nOr click link: ${inviteUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="relative bg-gradient-to-br from-[#031528] via-[#082847] to-[#0c3f6c] text-white rounded-3xl p-6 sm:p-8 shadow-xl overflow-hidden border border-sky-500/20">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-sky-400/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-16 w-60 h-60 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

      {/* Top back & action navigation */}
      <div className="flex items-center justify-between gap-4 mb-6 relative z-10">
        <Link
          to="/classes"
          className="inline-flex items-center gap-2 text-xs font-bold text-sky-200 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-full transition-all border border-white/10"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Classes</span>
        </Link>

        <div className="flex items-center gap-2">
          {onOpenAIFeedback && (
            <button
              onClick={onOpenAIFeedback}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-3.5 py-1.5 rounded-full transition-all shadow-md active:scale-95 cursor-pointer border border-purple-400/30"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Classroom Report</span>
              <span className="sm:hidden">AI Report</span>
            </button>
          )}

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
              title="Classroom Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Title & Meta */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end relative z-10">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[11px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full">
              {classroom.subject}
            </span>
            <span className="bg-white/10 text-white/90 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
              {classroom.grade}
            </span>
            {classroom.user_role === 'teacher' && (
              <span className="bg-purple-500/30 text-purple-200 border border-purple-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                Teacher Workspace
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            {classroom.title}
          </h1>

          {classroom.description && (
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-2xl leading-relaxed">
              {classroom.description}
            </p>
          )}

          {/* Teacher Profile pill */}
          <div className="flex items-center gap-3 pt-2">
            <div className="w-7 h-7 rounded-full bg-amber-200 text-slate-900 font-black text-xs flex items-center justify-center shadow-xs">
              {(classroom.teacher?.full_name || 'T').charAt(0).toUpperCase()}
            </div>
            <div className="text-xs">
              <span className="text-slate-400">Taught by </span>
              <strong className="text-white">{classroom.teacher?.full_name || 'Class Teacher'}</strong>
            </div>
          </div>
        </div>

        {/* Invite & Share Action Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5" />
              Class Invite Code
            </span>
            <span className="text-xs font-mono font-black text-white tracking-widest bg-white/15 px-2.5 py-0.5 rounded-md">
              {inviteCode}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-extrabold transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
              title="Share on WhatsApp"
            >
              <MessageSquareShare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
