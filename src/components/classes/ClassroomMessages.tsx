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
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-black text-slate-900 tracking-wider uppercase">
          Classroom Announcements
        </h2>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: Composer Form (5 cols on desktop) */}
        {isTeacher ? (
          <div className="lg:col-span-5 bg-white rounded-[24px] p-5 sm:p-6 border border-stone-200/70 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <MegaphoneIllustration className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="text-sm font-black text-slate-900">Post Announcement</h3>
                <p className="text-[11px] text-slate-500 font-medium">Broadcast updates to all students</p>
              </div>
            </div>

            <form onSubmit={handlePost} className="space-y-3.5">
              <textarea
                rows={4}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Write an announcement for your class..."
                className="w-full px-4 py-3 bg-[#f8fafd] border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3] focus:bg-white resize-none transition-all"
              />

              <div className="flex items-center justify-between gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPinning}
                    onChange={(e) => setIsPinning(e.target.checked)}
                    className="w-4 h-4 rounded text-[#026fc3] focus:ring-[#026fc3] cursor-pointer"
                  />
                  <Pin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Pin to top</span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting || !newMessage.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-full text-xs font-black shadow-xs active:scale-95 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Posting...' : 'Post Announcement'}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="lg:col-span-5 bg-white rounded-[24px] p-6 border border-stone-200/70 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Megaphone className="w-4 h-4 text-[#026fc3]" />
              <span>Announcements Stream</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Only teachers can post announcements. Your teacher's messages will appear here.
            </p>
          </div>
        )}

        {/* RIGHT COLUMN: Recent Announcements Stream (7 cols on desktop) */}
        <div className="lg:col-span-7 bg-white rounded-[24px] p-5 sm:p-6 border border-stone-200/70 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Recent Announcements
              </h3>
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </span>
          </div>

          {/* List */}
          {messages.length === 0 ? (
            <div className="text-center py-8 space-y-1.5">
              <p className="text-xs font-bold text-slate-500">No announcements yet.</p>
              <p className="text-[11px] text-slate-400">Class announcements and reminders will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    msg.is_pinned
                      ? 'bg-amber-50/50 border-amber-200/80 shadow-2xs'
                      : 'bg-[#fcfdfe] border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-amber-100 text-slate-900 font-black text-xs flex items-center justify-center border border-amber-200">
                        {(msg.teacher?.full_name || 'T').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong className="text-xs font-black text-slate-900">
                          {msg.teacher?.full_name || 'Class Teacher'}
                        </strong>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {msg.is_pinned && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                          <Pin className="w-2.5 h-2.5" />
                          <span>Pinned</span>
                        </span>
                      )}

                      {isTeacher && (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                          title="Delete announcement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                    {msg.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
