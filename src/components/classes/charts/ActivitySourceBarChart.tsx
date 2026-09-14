import React from 'react';
import { FileText, Zap, BookOpen, Trophy } from 'lucide-react';

interface ActivitySourceBarChartProps {
  activityBreakdown?: {
    assignment?: { eventCount: number; averagePercentage: number | null; participationRate: number };
    live_quiz?: { eventCount: number; averagePercentage: number | null; participationRate: number };
    exam?: { eventCount: number; averagePercentage: number | null; participationRate: number };
    ai_challenge?: { eventCount: number; averagePercentage: number | null; participationRate: number };
  };
}

export const ActivitySourceBarChart: React.FC<ActivitySourceBarChartProps> = ({
  activityBreakdown = {}
}) => {
  const sources = [
    {
      id: 'assignment',
      name: 'Tasks',
      icon: FileText,
      data: activityBreakdown?.assignment,
      color: 'bg-indigo-600',
      barBg: 'from-indigo-500 to-indigo-700',
      textBadge: 'text-indigo-800 bg-indigo-50 border-indigo-200'
    },
    {
      id: 'live_quiz',
      name: 'Quizzes',
      icon: Zap,
      data: activityBreakdown?.live_quiz,
      color: 'bg-purple-600',
      barBg: 'from-purple-500 to-purple-700',
      textBadge: 'text-purple-800 bg-purple-50 border-purple-200'
    },
    {
      id: 'exam',
      name: 'Assessments',
      icon: BookOpen,
      data: activityBreakdown?.exam,
      color: 'bg-emerald-600',
      barBg: 'from-emerald-500 to-teal-700',
      textBadge: 'text-emerald-800 bg-emerald-50 border-emerald-200'
    },
    {
      id: 'ai_challenge',
      name: 'Competitions',
      icon: Trophy,
      data: activityBreakdown?.ai_challenge,
      color: 'bg-amber-600',
      barBg: 'from-amber-500 to-orange-600',
      textBadge: 'text-amber-800 bg-amber-50 border-amber-200'
    }
  ];

  const totalEvents = sources.reduce((sum, s) => sum + (s.data?.eventCount || 0), 0);

  if (totalEvents === 0) {
    return (
      <div className="p-6 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 text-center space-y-1.5">
        <p className="text-xs font-bold text-slate-700">Not enough evidence yet.</p>
        <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
          Complete tasks, live quizzes, assessments, or challenges to visualize cross-activity performance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {sources.map((s) => {
          const avg = s.data?.averagePercentage;
          const count = s.data?.eventCount || 0;
          const participation = s.data?.participationRate || 0;
          const Icon = s.icon;

          return (
            <div
              key={s.id}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-white ${s.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-black text-slate-900">{s.name}</span>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${s.textBadge}`}>
                  {count} {count === 1 ? 'Event' : 'Events'}
                </span>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs font-bold text-slate-500">Average Score</span>
                  <span className="text-sm font-black text-slate-900">
                    {avg != null ? `${Math.round(avg)}%` : '—'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${s.barBg} transition-all duration-500`}
                    style={{ width: `${avg != null ? Math.min(100, Math.max(5, avg)) : 0}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-1 border-t border-slate-100">
                <span>Participation</span>
                <span className="text-slate-700 font-black">{participation}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
