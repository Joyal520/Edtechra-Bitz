import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Send,
  RefreshCw,
  MessageSquare,
  Bot,
  Trash2,
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import { Classroom } from '@/types/classroom';
import {
  teachingIntelligenceService,
  TeacherChatMessage
} from '@/services/teachingIntelligenceService';
import { StructuredAIReportRenderer } from '../StructuredAIReportRenderer';

interface AskAITeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroom: Classroom | null;
  initialPrompt?: string;
}

const QUICK_PROMPTS = [
  'Who needs the most help in this class?',
  'What topics should I reteach tomorrow?',
  'Draft 3 practice questions for struggling students',
  'Summarize class performance from recent evidence'
];

export const AskAITeacherModal: React.FC<AskAITeacherModalProps> = ({
  isOpen,
  onClose,
  classroom,
  initialPrompt
}) => {
  const [messages, setMessages] = useState<TeacherChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && initialPrompt && messages.length === 0) {
      handleSend(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  if (!isOpen || !classroom) return null;

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;

    const userMsg: TeacherChatMessage = {
      role: 'teacher',
      content: text,
      timestamp: new Date().toISOString()
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!overrideText) setInput('');
    setSending(true);
    setError('');

    try {
      const res = await teachingIntelligenceService.sendTeacherChatMessage(
        classroom.id,
        text,
        messages
      );
      if (res.reply) {
        const assistantMsg: TeacherChatMessage = {
          role: 'assistant',
          content: res.reply,
          timestamp: new Date().toISOString()
        };
        setMessages([...nextHistory, assistantMsg]);
      } else {
        throw new Error(res.error || 'No response received from AI Teacher.');
      }
    } catch (err: any) {
      console.error('[AskAITeacherModal] chat error:', err);
      setError(err?.message || 'Failed to communicate with AI Teacher assistant.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl h-[85vh] max-h-[780px] flex flex-col shadow-2xl border border-[#C9E5E2] overflow-hidden">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-[#071a1c] border-b border-[#0e3b40] flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#159A9C] to-[#087477] flex items-center justify-center shadow-md shadow-[#159A9C]/25 text-white">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Ask AI Teacher
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-[#159A9C]/30 text-teal-200 border border-[#159A9C]/50">
                  Classroom Copilot
                </span>
              </div>
              <p className="text-xs text-teal-100/80 font-medium">
                Grounded directly in {classroom.title}&apos;s learning evidence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                title="Clear conversation"
                className="p-2 text-teal-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-teal-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#E8F7F5]/60 border-b border-[#C9E5E2] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-[#087477] shrink-0">
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Try asking:</span>
          </div>
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(prompt)}
              disabled={sending}
              className="px-3 py-1 bg-white hover:bg-[#D4EFEC] text-[#173B3F] hover:text-[#087477] border border-[#C9E5E2] hover:border-[#159A9C] rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-rose-600 font-bold ml-2">Dismiss</button>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#F8FCFB]">
          {messages.length === 0 ? (
            <div className="py-16 text-center space-y-4 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-[#D4EFEC] text-[#087477] flex items-center justify-center mx-auto shadow-sm ring-4 ring-[#E8F7F5]">
                <MessageSquare className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-lg font-black text-[#173B3F]">
                  How can I help your teaching today?
                </h4>
                <p className="text-xs sm:text-sm text-[#36565A] font-medium leading-relaxed">
                  I analyze live evidence from tasks, quizzes, assessments, and competitions in {classroom.title} to give actionable recommendations.
                </p>
              </div>
              <div className="pt-2 text-left bg-white p-4 rounded-2xl border border-[#C9E5E2] shadow-2xs space-y-2">
                <p className="text-xs font-bold text-[#173B3F] flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-[#159A9C]" />
                  What you can ask:
                </p>
                <ul className="text-xs text-[#36565A] space-y-1.5 list-disc list-inside">
                  <li>Who is struggling the most with recent material?</li>
                  <li>Draft 3 remedial practice questions for tomorrow</li>
                  <li>Summarize learning evidence for parents</li>
                  <li>Recommend lesson interventions based on recent exam scores</li>
                </ul>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isTeacher = msg.role === 'teacher' || msg.role === 'user';
              return (
                <div
                  key={idx}
                  className={`flex gap-3 ${isTeacher ? 'justify-end' : 'justify-start'}`}
                >
                  {!isTeacher && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#159A9C] to-[#087477] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ring-2 ring-[#E8F7F5]">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-xl sm:max-w-2xl p-4 rounded-2xl text-sm space-y-2 shadow-2xs ${
                      isTeacher
                        ? 'bg-[#087477] text-white rounded-br-xs'
                        : 'bg-white border border-[#C9E5E2] text-[#173B3F] rounded-bl-xs'
                    }`}
                  >
                    {isTeacher ? (
                      <div className="whitespace-pre-wrap leading-relaxed font-semibold text-white">
                        {msg.content}
                      </div>
                    ) : (
                      <StructuredAIReportRenderer content={msg.content} />
                    )}
                    <span
                      className={`text-[10px] block font-bold ${
                        isTeacher ? 'text-teal-100 text-right' : 'text-[#36565A]'
                      }`}
                    >
                      {msg.timestamp
                        ? new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : ''}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {sending && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#159A9C] to-[#087477] text-white flex items-center justify-center shrink-0 shadow-2xs ring-2 ring-[#E8F7F5]">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-[#C9E5E2] px-4 py-3 rounded-2xl text-xs text-[#173B3F] font-bold flex items-center gap-2.5 shadow-2xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#159A9C]" />
                <span>Consulting classroom records and formulating recommendation...</span>
              </div>
            </div>
          )}
          <div ref={threadEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3.5 sm:p-4 border-t border-[#C9E5E2] bg-white flex items-center gap-3 relative z-10 shrink-0"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about students, learning gaps, or lesson ideas..."
            disabled={sending}
            style={{ color: '#173B3F', backgroundColor: '#FFFFFF' }}
            className="flex-1 px-4 py-2.5 bg-white border border-[#C9E5E2] rounded-xl text-sm font-semibold text-[#173B3F] placeholder:text-[#36565A]/60 focus:outline-none focus:border-[#159A9C] focus:ring-3 focus:ring-[#159A9C]/20 transition-all shadow-2xs"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="px-5 py-2.5 bg-[#087477] hover:bg-[#159A9C] disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer disabled:cursor-not-allowed shrink-0"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
