import React, { useState } from 'react';
import { Send, Pin, Trash2, Clock, Megaphone, Check } from 'lucide-react';
import { ClassroomMessage } from '@/types/classroom';
import { classroomMessageService } from '@/services/classroomMessageService';
import { MegaphoneIllustration } from './ClassroomIllustrations';

interface ClassroomMessagesProps {
  classroomId: string;
  messages: ClassroomMessage[];
  isTeacher: boolean;
  onMessageUpdated: () => void;
}

export const ClassroomMessages: React.FC<ClassroomMessagesProps> = ({
  classroomId,
  messages,
  isTeacher,
  onMessageUpdated
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isPinning, setIsPinning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSubmitting(true);
    try {
      await classroomMessageService.postMessage({
        classroom_id: classroomId,
        message: newMessage.trim(),
        is_pinned: isPinning
      });
      setNewMessage('');
      setIsPinning(false);
      onMessageUpdated();
    } catch (err) {
      alert('Failed to post announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await classroomMessageService.deleteMessage(messageId);
      onMessageUpdated();
    } catch (err) {
      alert('Failed to delete announcement');
    }
  };

  return (
    <div className="space-y-4">
      {/* 2-Column Responsive Grid for Composer & Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        
        {/* LEFT COLUMN: Post Announcement Composer */}
        {isTeacher ? (
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-[0_8px_30px_-4px_rgba(2,111,195,0.08),0_2px_6px_rgba(15,23,42,0.04)] space-y-5 relative overflow-hidden">
            {/* Ambient Corner Glow Accent */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header with Megaphone Badge */}
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-100 via-sky-50 to-white border border-sky-200/80 flex items-center justify-center shrink-0 shadow-xs">
                <MegaphoneIllustration className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Post Announcement
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-sky-100 text-[#026fc3] text-[10px] font-black uppercase tracking-wider">
                    Live
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Broadcast updates, homework alerts & reminders to your students
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handlePost} className="space-y-4 relative z-10">
              <div className="space-y-2">
                <div className="relative rounded-2xl border border-slate-200/90 bg-slate-50/50 focus-within:bg-white focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-200/70 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">
                  <textarea
                    rows={5}
                    value={newMessage}
                    data-color-scheme="light"
                    data-light-surface="true"
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Write an announcement for your class... e.g. Welcome to our English class! Please review Chapter 3 before tomorrow's live session."
                    style={{
                      color: '#0a1a33',
                      WebkitTextFillColor: '#0a1a33',
                      backgroundColor: 'transparent',
                      caretColor: '#026fc3'
                    }}
                    className="classroom-announcement-textarea w-full px-4.5 py-4 bg-transparent border-0 rounded-2xl text-xs sm:text-sm font-semibold text-[#0a1a33] placeholder:text-slate-400 focus:outline-hidden resize-none min-h-[130px] leading-relaxed selection:bg-sky-200 selection:text-[#0a1a33]"
                  />
                  
                  {/* Subtle textarea bottom toolbar */}
                  <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200/60 bg-white/70 rounded-b-2xl text-[11px] text-slate-400 font-medium">
                    <span>Shift + Enter for new lines</span>
                    <span className={`font-bold ${newMessage.length > 500 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {newMessage.length} characters
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions: Pin Toggle & Submit CTA */}
              <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer select-none text-xs font-bold ${
                  isPinning
                    ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                }`}>
                  <input
                    type="checkbox"
                    checked={isPinning}
                    onChange={(e) => setIsPinning(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                    isPinning ? 'bg-amber-500 text-white' : 'border border-slate-300 bg-white'
                  }`}>
                    {isPinning && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <Pin className={`w-3.5 h-3.5 ${isPinning ? 'text-amber-600 fill-amber-500' : 'text-slate-400'}`} />
                  <span>Pin to top</span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting || !newMessage.trim()}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-black text-xs sm:text-sm text-white bg-gradient-to-r from-[#0284c7] via-[#026fc3] to-[#0369a1] hover:from-[#0369a1] hover:to-[#0284c7] shadow-[0_6px_20px_-4px_rgba(2,111,195,0.4)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none transition-all cursor-pointer group"
                >
                  <Send className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  <span>{isSubmitting ? 'Posting...' : 'Post Announcement'}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-[0_8px_30px_-4px_rgba(2,111,195,0.08)] space-y-3">
            <div className="flex items-center gap-3 text-slate-900 font-black text-sm sm:text-base">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#026fc3] shadow-xs">
                <Megaphone className="w-5 h-5" />
              </div>
              <span>Class Stream</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
              Only teachers can post announcements. Your teacher&apos;s updates, reminders, study resources and class news will appear here in real time.
            </p>
          </div>
        )}

        {/* RIGHT COLUMN: Recent Announcements Feed */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-[0_8px_30px_-4px_rgba(2,111,195,0.08),0_2px_6px_rgba(15,23,42,0.04)] space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 animate-pulse" />
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                Recent Announcements
              </h3>
            </div>
            <span className="text-xs font-black text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-100/90 shadow-2xs">
              {messages.length} {messages.length === 1 ? 'announcement' : 'announcements'}
            </span>
          </div>

          {/* Messages Feed */}
          {messages.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
              <div className="w-14 h-14 rounded-2xl bg-sky-100/80 border border-sky-200 mx-auto flex items-center justify-center text-sky-500 shadow-2xs">
                <Megaphone className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-slate-800">No announcements yet</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                  Important reminders, homework notes, and class updates from your teacher will be posted right here.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
              {messages.map((msg) => (
                <article
                  key={msg.id}
                  className={`p-4.5 sm:p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 ${
                    msg.is_pinned
                      ? 'bg-gradient-to-r from-amber-50/70 via-amber-50/30 to-white border-amber-300/80 shadow-[0_4px_16px_rgba(245,158,11,0.09)]'
                      : 'bg-[#fcfdfe] hover:bg-white border-slate-200/80 hover:border-sky-200 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 via-sky-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs ring-2 ring-sky-100 shrink-0">
                        {(msg.teacher?.full_name || 'T').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-xs sm:text-sm font-black text-slate-900 truncate block">
                            {msg.teacher?.full_name || 'Class Teacher'}
                          </strong>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-100">
                            Teacher
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{new Date(msg.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {msg.is_pinned && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300/70 shadow-2xs">
                          <Pin className="w-2.5 h-2.5 fill-amber-700" />
                          <span>Pinned</span>
                        </span>
                      )}

                      {isTeacher && (
                        <button
                          type="button"
                          onClick={() => handleDelete(msg.id)}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete announcement"
                          aria-label="Delete announcement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed pl-0 sm:pl-13">
                    {msg.message}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
