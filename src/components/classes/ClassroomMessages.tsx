import React, { useState } from 'react';
import { Send, MessageSquare, Pin, Trash2, Clock } from 'lucide-react';
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
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#026fc3] flex items-center justify-center">
          <MessageSquare className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-black text-slate-900">Classroom Stream & Announcements</h2>
          <p className="text-xs text-slate-500 font-semibold">Teacher messages shared with all class members</p>
        </div>
      </div>

      {/* Teacher Composer Form */}
      {isTeacher && (
        <form onSubmit={handlePost} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <textarea
            rows={3}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Share an announcement with your students..."
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3] resize-none"
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPinning}
                onChange={(e) => setIsPinning(e.target.checked)}
                className="w-4 h-4 rounded text-[#026fc3] focus:ring-[#026fc3]"
              />
              <Pin className="w-3.5 h-3.5 text-slate-400" />
              <span>Pin to top</span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting || !newMessage.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-extrabold shadow-xs active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Posting...' : 'Post Announcement'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Messages List */}
      {messages.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <p className="text-xs font-bold text-slate-500">No announcements yet.</p>
          <p className="text-[11px] text-slate-400">Class announcements and reminders from your teacher will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 rounded-2xl border transition-all ${
                msg.is_pinned
                  ? 'bg-amber-50/40 border-amber-200'
                  : 'bg-white border-slate-100 hover:border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-100 text-slate-900 font-bold text-xs flex items-center justify-center">
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

                <div className="flex items-center gap-1">
                  {msg.is_pinned && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      <Pin className="w-3 h-3" />
                      <span>Pinned</span>
                    </span>
                  )}

                  {isTeacher && (
                    <button
                      onClick={() => handleDelete(msg.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
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
  );
};
