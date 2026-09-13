import React, { useState } from 'react';
import { Send, Pin, Trash2, Clock, Megaphone } from 'lucide-react';
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
    <div className="space-y-3 sm:space-y-4">
      {/* 2-Column Grid for Composer & Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        
        {/* LEFT COLUMN: Composer Form (5 cols on desktop) */}
        {isTeacher ? (
          <div className="lg:col-span-5 bg-white rounded-2xl sm:rounded-[26px] p-5 sm:p-6 border border-slate-200/85 shadow-[0_4px_20px_-4px_rgba(2,111,195,0.06),0_1px_3px_rgba(15,23,42,0.04)] space-y-4 relative overflow-hidden group">
            {/* Subtle top ambient glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-sky-400/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-100 via-sky-50 to-white border border-sky-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                <MegaphoneIllustration className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  Post Announcement
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Broadcast updates, reminders and news to your students
                </p>
              </div>
            </div>

            <form onSubmit={handlePost} className="space-y-3.5 relative z-10">
              <div className="relative">
                <textarea
                  rows={4}
                  value={newMessage}
                  data-color-scheme="light"
                  data-light-surface="true"
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Write an announcement for your class... e.g. Welcome to our English class!"
                  style={{
                    color: '#0a1a33',
                    WebkitTextFillColor: '#0a1a33',
                    backgroundColor: '#ffffff',
                    caretColor: '#026fc3'
                  }}
                  className="classroom-announcement-textarea w-full px-4 py-3.5 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-semibold text-[#0a1a33] placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#026fc3] focus:border-[#026fc3] resize-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] selection:bg-sky-200 selection:text-[#0a1a33]"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold px-1 pt-1">
                  <span>Press Shift + Enter for new lines</span>
                  <span>{newMessage.length} characters</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer select-none transition-colors">
                  <input
                    type="checkbox"
                    checked={isPinning}
                    onChange={(e) => setIsPinning(e.target.checked)}
                    className="w-4 h-4 rounded text-[#026fc3] focus:ring-[#026fc3] cursor-pointer"
                  />
                  <Pin className={`w-3.5 h-3.5 ${isPinning ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                  <span>Pin to top of stream</span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting || !newMessage.trim()}
                  className="btn-liquid-primary min-h-[42px] px-5 text-xs sm:text-sm disabled:opacity-45 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Posting...' : 'Post Announcement'}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="lg:col-span-5 bg-white rounded-2xl sm:rounded-[26px] p-6 border border-slate-200/85 shadow-[0_4px_20px_-4px_rgba(2,111,195,0.06)] space-y-2">
            <div className="flex items-center gap-2.5 text-slate-900 font-black text-sm">
              <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#026fc3]">
                <Megaphone className="w-4 h-4" />
              </div>
              <span>Class Announcements Stream</span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed pl-10">
              Only teachers can post announcements. Your teacher&apos;s updates, reminders, and class news will appear here in real time.
            </p>
          </div>
        )}

        {/* RIGHT COLUMN: Recent Announcements Stream (7 cols on desktop) */}
        <div className="lg:col-span-7 bg-white rounded-2xl sm:rounded-[26px] p-5 sm:p-6 border border-slate-200/85 shadow-[0_4px_20px_-4px_rgba(2,111,195,0.06),0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 animate-pulse" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Recent Announcements
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100/80 px-2.5 py-0.5 rounded-full border border-slate-200/60">
              {messages.length} {messages.length === 1 ? 'post' : 'posts'}
            </span>
          </div>

          {/* List */}
          {messages.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 mx-auto flex items-center justify-center text-sky-400">
                <Megaphone className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">No announcements yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Important reminders, homework notes, and class updates from your teacher will be posted right here.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
              {messages.map((msg) => (
                <article
                  key={msg.id}
                  className={`p-4 sm:p-4.5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 ${
                    msg.is_pinned
                      ? 'bg-gradient-to-r from-amber-50/60 via-amber-50/30 to-white border-amber-200/90 shadow-[0_2px_10px_rgba(245,158,11,0.08)]'
                      : 'bg-[#fcfdfe] hover:bg-white border-slate-200/70 hover:border-sky-200 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs border border-white/40 shrink-0">
                        {(msg.teacher?.full_name || 'T').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <strong className="text-xs sm:text-sm font-black text-slate-900 truncate block">
                          {msg.teacher?.full_name || 'Class Teacher'}
                        </strong>
                        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
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

                  <p className="text-xs sm:text-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed pl-0 sm:pl-12">
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
