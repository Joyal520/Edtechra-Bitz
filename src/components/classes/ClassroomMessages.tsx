import React, { useState } from 'react';
import { Send, Pin, Trash2, Clock, Megaphone, Check } from 'lucide-react';
import { ClassroomMessage } from '@/types/classroom';
import { classroomMessageService } from '@/services/classroomMessageService';

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
          <div className="lg:col-span-5 bg-gradient-to-b from-white via-sky-50/30 to-white rounded-3xl p-6 sm:p-7 border-2 border-sky-200/90 shadow-[0_10px_32px_-4px_rgba(2,111,195,0.12),0_2px_8px_rgba(15,23,42,0.04)] space-y-5 relative overflow-hidden">
            {/* Ambient Corner Glow Accent */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-sky-400/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-cyan-400/15 rounded-full blur-2xl pointer-events-none" />

            {/* Header with Megaphone Badge */}
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 via-blue-600 to-cyan-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-500/25 ring-4 ring-sky-100">
                <Megaphone className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Post Announcement
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Live Stream
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">
                  Broadcast updates, homework notes & alerts to all students
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handlePost} className="space-y-4 relative z-10">
              <div className="space-y-2">
                <div className="relative rounded-2xl border-2 border-sky-200/90 bg-white focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-100 transition-all shadow-xs overflow-hidden">
                  <textarea
                    rows={5}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Write an announcement for your class... e.g. Welcome to our English class! Please review Chapter 3 before tomorrow's live session."
                    style={{
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      caretColor: '#026fc3',
                      padding: '20px',
                      lineHeight: '1.6',
                      boxSizing: 'border-box'
                    }}
                    className="classroom-announcement-textarea w-full p-5 sm:p-6 bg-white border-0 text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-hidden resize-none min-h-[140px] leading-relaxed selection:bg-sky-200 selection:text-slate-900 block"
                  />
                  
                  {/* Textarea bottom toolbar */}
                  <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-200/80 bg-slate-50/90 text-xs text-slate-600 font-semibold">
                    <span className="text-[11px] text-slate-500">Press Shift + Enter for new line</span>
                    <span className={`font-black ${newMessage.length > 500 ? 'text-amber-700' : 'text-slate-600'}`}>
                      {newMessage.length} characters
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions: Pin Toggle & Submit CTA */}
              <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                <label className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 transition-all cursor-pointer select-none text-xs font-bold ${
                  isPinning
                    ? 'bg-amber-100/80 border-amber-400 text-amber-950 shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                }`}>
                  <input
                    type="checkbox"
                    checked={isPinning}
                    onChange={(e) => setIsPinning(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                    isPinning ? 'bg-amber-600 text-white' : 'border border-slate-400 bg-white'
                  }`}>
                    {isPinning && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <Pin className={`w-3.5 h-3.5 ${isPinning ? 'text-amber-700 fill-amber-600' : 'text-slate-500'}`} />
                  <span>Pin to top of feed</span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting || !newMessage.trim()}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-black text-xs sm:text-sm text-white bg-gradient-to-r from-sky-600 via-[#026fc3] to-cyan-600 hover:from-sky-500 hover:to-cyan-500 shadow-md shadow-sky-600/30 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none transition-all cursor-pointer group"
                >
                  <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  <span>{isSubmitting ? 'Posting...' : 'Post Announcement'}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="lg:col-span-5 bg-gradient-to-b from-white via-sky-50/30 to-white rounded-3xl p-6 sm:p-7 border-2 border-sky-200/90 shadow-[0_10px_32px_-4px_rgba(2,111,195,0.12)] space-y-3">
            <div className="flex items-center gap-3 text-slate-900 font-black text-base">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
                <Megaphone className="w-5 h-5" />
              </div>
              <span>Classroom Stream</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Your teacher&apos;s updates, study reminders, and class announcements will appear here in real time.
            </p>
          </div>
        )}

        {/* RIGHT COLUMN: Recent Announcements Feed */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border-2 border-sky-200/80 shadow-[0_10px_32px_-4px_rgba(2,111,195,0.08),0_2px_8px_rgba(15,23,42,0.04)] space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100 animate-pulse" />
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Recent Announcements
              </h3>
            </div>
            <span className="text-xs font-extrabold text-sky-900 bg-sky-100 px-3.5 py-1 rounded-full border border-sky-200 shadow-2xs">
              {messages.length} {messages.length === 1 ? 'Announcement' : 'Announcements'}
            </span>
          </div>

          {/* Messages Feed */}
          {messages.length === 0 ? (
            <div className="text-center py-14 sm:py-16 px-6 space-y-4 bg-gradient-to-b from-sky-50/40 via-white to-sky-50/20 rounded-2xl sm:rounded-3xl border-2 border-dashed border-sky-200/80 shadow-2xs">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-sky-100 via-sky-50 to-cyan-100 text-[#026fc3] border border-sky-200/90 mx-auto flex items-center justify-center shadow-sm shadow-sky-500/10">
                <Megaphone className="w-8 h-8 stroke-[2.2]" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  No announcements yet
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                  Important homework notes, reminders and class news will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {messages.map((msg) => (
                <article
                  key={msg.id}
                  className={`p-4.5 sm:p-5 rounded-2xl border-2 transition-all duration-200 hover:-translate-y-0.5 ${
                    msg.is_pinned
                      ? 'bg-gradient-to-r from-amber-50 via-amber-50/40 to-white border-amber-300 shadow-[0_4px_16px_rgba(245,158,11,0.12)]'
                      : 'bg-slate-50/70 hover:bg-white border-slate-200/90 hover:border-sky-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 via-sky-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs ring-2 ring-sky-200 shrink-0">
                        {(msg.teacher?.full_name || 'T').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-xs sm:text-sm font-black text-slate-900 truncate block">
                            {msg.teacher?.full_name || 'Class Teacher'}
                          </strong>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-200">
                            Teacher
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{new Date(msg.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {msg.is_pinned && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-amber-900 bg-amber-200/80 px-3 py-1 rounded-full border border-amber-300 shadow-2xs">
                          <Pin className="w-3 h-3 fill-amber-700" />
                          <span>Pinned</span>
                        </span>
                      )}

                      {isTeacher && (
                        <button
                          type="button"
                          onClick={() => handleDelete(msg.id)}
                          className="w-8 h-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete announcement"
                          aria-label="Delete announcement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-900 font-semibold whitespace-pre-wrap leading-relaxed pl-0 sm:pl-13">
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
