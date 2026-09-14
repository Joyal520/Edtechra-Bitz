import React, { useState } from 'react';
import {
  FileText,
  Zap,
  BookOpen,
  Trophy,
  ChevronRight,
  Sparkles,
  Lightbulb,
  X,
  Users,
  Clock,
  ExternalLink
} from 'lucide-react';
import { RecentLearningEvidenceItem } from '@/services/teachingIntelligenceService';

interface RecentLearningEvidenceFeedProps {
  evidenceList?: RecentLearningEvidenceItem[];
  onOpenActivity?: (activityType: string, activityId: string) => void;
}

export const RecentLearningEvidenceFeed: React.FC<RecentLearningEvidenceFeedProps> = ({
  evidenceList = [],
  onOpenActivity
}) => {
  const [selectedActivity, setSelectedActivity] = useState<RecentLearningEvidenceItem | null>(null);

  if (!evidenceList || evidenceList.length === 0) {
    return (
      <div className="p-6 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-center space-y-1">
        <p className="text-xs font-bold text-slate-700">No learning evidence recorded yet.</p>
        <p className="text-[11px] text-slate-500">
          Recent student results from Tasks, Live Quizzes, Assessments, and Competitions will automatically stream here.
        </p>
      </div>
    );
  }

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'task':
      case 'assignment':
        return {
          label: 'Task',
          icon: FileText,
          badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          iconBg: 'bg-indigo-600'
        };
      case 'quiz':
      case 'live_quiz':
        return {
          label: 'Live Quiz',
          icon: Zap,
          badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
          iconBg: 'bg-purple-600'
        };
      case 'assessment':
      case 'exam':
        return {
          label: 'Assessment',
          icon: BookOpen,
          badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          iconBg: 'bg-emerald-600'
        };
      case 'competition':
      case 'ai_challenge':
        return {
          label: 'Competition',
          icon: Trophy,
          badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
          iconBg: 'bg-amber-600'
        };
      default:
        return {
          label: 'Activity',
          icon: FileText,
          badgeBg: 'bg-slate-50 text-slate-800 border-slate-200',
          iconBg: 'bg-slate-600'
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Activity Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {evidenceList.slice(0, 6).map((item) => {
          const config = getTypeConfig(item.activityType);
          const Icon = config.icon;
          const avg = item.averagePercentage;

          return (
            <div
              key={`${item.activityType}-${item.activityId}`}
              onClick={() => setSelectedActivity(item)}
              className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-white ${config.iconBg}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${config.badgeBg}`}>
                      {config.label}
                    </span>
                  </div>

                  {item.latestCompletedAt && (
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.latestCompletedAt).toLocaleDateString()}</span>
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {item.activityTitle}
                  </h4>
                  <p className="text-[11px] font-bold text-slate-500">
                    Topic: {item.topic}
                  </p>
                </div>
              </div>

              {/* Metrics Strip */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-600 font-extrabold flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.submissionsCount} {item.submissionsCount === 1 ? 'submission' : 'submissions'}</span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-black text-slate-900">
                    Average: <span className={avg != null && avg < 60 ? 'text-rose-600' : 'text-indigo-600'}>{avg != null ? `${avg}%` : '—'}</span>
                  </span>
                </div>

                <span className="text-xs font-black text-indigo-600 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                  <span>Analyze</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Analysis Modal / Detail Drawer for selected activity */}
      {selectedActivity && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white ${getTypeConfig(selectedActivity.activityType).iconBg}`}>
                  {React.createElement(getTypeConfig(selectedActivity.activityType).icon, { className: 'w-4 h-4' })}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">
                      {getTypeConfig(selectedActivity.activityType).label} Visual Analysis
                    </span>
                    {selectedActivity.passRate != null && (
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {selectedActivity.passRate}% Pass Rate
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-white">{selectedActivity.activityTitle}</h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
              
              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Submissions</span>
                  <span className="text-xl font-black text-slate-900">{selectedActivity.submissionsCount}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase block">Class Average</span>
                  <span className="text-xl font-black text-indigo-900">
                    {selectedActivity.averagePercentage != null ? `${selectedActivity.averagePercentage}%` : '—'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Score Range</span>
                  <span className="text-sm font-black text-slate-800 mt-1 block">
                    {selectedActivity.lowestScore != null && selectedActivity.highestScore != null
                      ? `${selectedActivity.lowestScore}% – ${selectedActivity.highestScore}%`
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Performance Tier Distribution Bar */}
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                  Score Distribution
                </span>
                <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden">
                  <div
                    className="bg-emerald-500 transition-all"
                    style={{
                      width: `${selectedActivity.submissionsCount > 0
                        ? (selectedActivity.performanceDistribution.strong / selectedActivity.submissionsCount) * 100
                        : 0}%`
                    }}
                    title={`Strong (>=75%): ${selectedActivity.performanceDistribution.strong}`}
                  />
                  <div
                    className="bg-indigo-500 transition-all"
                    style={{
                      width: `${selectedActivity.submissionsCount > 0
                        ? (selectedActivity.performanceDistribution.steady / selectedActivity.submissionsCount) * 100
                        : 0}%`
                    }}
                    title={`Steady (60-74%): ${selectedActivity.performanceDistribution.steady}`}
                  />
                  <div
                    className="bg-rose-500 transition-all"
                    style={{
                      width: `${selectedActivity.submissionsCount > 0
                        ? (selectedActivity.performanceDistribution.weak / selectedActivity.submissionsCount) * 100
                        : 0}%`
                    }}
                    title={`Needs Support (<60%): ${selectedActivity.performanceDistribution.weak}`}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pt-0.5">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Strong: {selectedActivity.performanceDistribution.strong}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>Steady: {selectedActivity.performanceDistribution.steady}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Needs Support: {selectedActivity.performanceDistribution.weak}</span>
                  </span>
                </div>
              </div>

              {/* Short AI Analysis & Recommendation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-900 font-black text-[11px] uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Short AI Interpretation</span>
                  </div>
                  <p className="text-slate-800 font-medium leading-relaxed">
                    {selectedActivity.aiShortInsight}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-indigo-900 font-black text-[11px] uppercase tracking-wider">
                    <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Pedagogical Recommendation</span>
                  </div>
                  <p className="text-slate-800 font-semibold leading-relaxed">
                    {selectedActivity.aiRecommendation}
                  </p>
                </div>
              </div>

              {/* Student Results Table */}
              {selectedActivity.studentResults && selectedActivity.studentResults.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                    Student Performance Log ({selectedActivity.studentResults.length})
                  </span>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-52 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                        <tr>
                          <th className="p-2.5 pl-4">Student</th>
                          <th className="p-2.5 text-right">Score</th>
                          <th className="p-2.5 text-right pr-4">Percentage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedActivity.studentResults.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50/80">
                            <td className="p-2.5 pl-4 font-extrabold text-slate-800">{r.studentName}</td>
                            <td className="p-2.5 text-right font-bold text-slate-600">{r.score ?? '—'}</td>
                            <td className="p-2.5 text-right pr-4">
                              <span className={`font-black ${
                                (r.percentage ?? 0) >= 75
                                  ? 'text-emerald-700'
                                  : (r.percentage ?? 0) < 60
                                  ? 'text-rose-700'
                                  : 'text-indigo-700'
                              }`}>
                                {r.percentage != null ? `${r.percentage}%` : '—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              {onOpenActivity ? (
                <button
                  type="button"
                  onClick={() => {
                    onOpenActivity(selectedActivity.activityType, selectedActivity.activityId);
                    setSelectedActivity(null);
                  }}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Detail</span>
                </button>
              ) : <div />}
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
              >
                Close Analysis
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
