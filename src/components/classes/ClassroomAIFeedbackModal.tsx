import React, { useState } from 'react';
import { X, Sparkles, RefreshCw, Copy, Check } from 'lucide-react';
import { Classroom, ClassroomStats } from '@/types/classroom';
import { supabase } from '@/lib/supabase';

interface ClassroomAIFeedbackModalProps {
  isOpen: boolean;
  classroom: Classroom | null;
  stats: ClassroomStats;
  onClose: () => void;
}

export const ClassroomAIFeedbackModal: React.FC<ClassroomAIFeedbackModalProps> = ({
  isOpen,
  classroom,
  stats,
  onClose
}) => {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !classroom) return null;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token;

      const res = await fetch('/api/classes/ai-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          classroomId: classroom.id,
          classroomTitle: classroom.title,
          subject: classroom.subject,
          studentCount: stats.total_students,
          assignmentCount: stats.total_assignments,
          averageScore: stats.average_score,
          recentActivity: `${stats.total_submissions} submissions recorded with ${stats.average_completion_percent}% overall completion rate.`
        })
      });

      if (!res.ok) throw new Error('Report generation failed');
      const json = await res.json();
      setReport(json.data.summary);
    } catch (err: any) {
      alert(err.message || 'Failed to generate AI report');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                AI Classroom Performance Report
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                Pedagogical insights & curriculum recommendations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-4">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            <div>
              <div className="text-xs font-bold text-slate-400">Students</div>
              <div className="text-sm font-black text-slate-800">{stats.total_students}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400">Tasks</div>
              <div className="text-sm font-black text-slate-800">{stats.total_assignments}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400">Avg Grade</div>
              <div className="text-sm font-black text-purple-700">{stats.average_score}%</div>
            </div>
          </div>

          {!report ? (
            <div className="text-center py-10 space-y-3">
              <Sparkles className="w-10 h-10 text-purple-400 mx-auto animate-pulse" />
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900">Generate Executive AI Summary</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Our pedagogical AI analyzes completion rates, submission patterns, and student grades to provide actionable feedback.
                </p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={handleGenerate}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white rounded-xl text-xs font-extrabold shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loading ? 'Analyzing Classroom...' : 'Generate AI Report'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-purple-50/40 rounded-2xl border border-purple-200 text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                {report}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-extrabold shadow-xs transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Summary'}</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
