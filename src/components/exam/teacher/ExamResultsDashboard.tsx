// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: TEACHER RESULTS DASHBOARD
// Comprehensive class analytics, question profiling, and student attempt management
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Award,
  Users,
  CheckCircle2,
  TrendingUp,
  Search,
  ChevronRight
} from 'lucide-react';
import { StudentAttemptDetailModal } from './StudentAttemptDetailModal';

interface ExamResultsDashboardProps {
  exam: any;
  results: any[];
  onRefresh: () => void;
  onSaveManualGrade: (resultId: string, subjectiveScores: Record<string, number>, subjectiveFeedbacks: Record<string, string>, generalFeedback?: string) => Promise<void>;
  onClose: () => void;
}

export const ExamResultsDashboard: React.FC<ExamResultsDashboardProps> = ({
  exam,
  results = [],
  onRefresh,
  onSaveManualGrade,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_review' | 'reviewed' | 'auto_graded'>('all');
  const [selectedStudentResult, setSelectedStudentResult] = useState<any | null>(null);

  // Compute Aggregate Analytics
  const stats = useMemo(() => {
    if (results.length === 0) {
      return {
        count: 0,
        avgScore: 0,
        avgPercentage: 0,
        highScore: 0,
        lowScore: 0,
        passRate: 0,
        passedCount: 0,
        pendingReviewCount: 0
      };
    }

    const scores = results.map(r => Number(r.score || 0));
    const percentages = results.map(r => Number(r.percentage || 0));
    const passed = results.filter(r => Boolean(r.passed));
    const pending = results.filter(r => r.grading_status === 'pending_review');

    const totalScoreSum = scores.reduce((a, b) => a + b, 0);
    const totalPctSum = percentages.reduce((a, b) => a + b, 0);

    return {
      count: results.length,
      avgScore: Number((totalScoreSum / results.length).toFixed(1)),
      avgPercentage: Number((totalPctSum / results.length).toFixed(1)),
      highScore: Math.max(...scores),
      lowScore: Math.min(...scores),
      passRate: Number(((passed.length / results.length) * 100).toFixed(1)),
      passedCount: passed.length,
      pendingReviewCount: pending.length
    };
  }, [results]);

  // Filtered student results list
  const filteredResults = useMemo(() => {
    return results.filter(r => {
      const studentName = r.student?.full_name || '';
      const studentEmail = r.student?.email || '';
      const matchesSearch =
        studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        studentEmail.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        r.grading_status === statusFilter ||
        (statusFilter === 'pending_review' && r.status === 'pending_review');

      return matchesSearch && matchesStatus;
    });
  }, [results, searchTerm, statusFilter]);

  return (
    <div className="space-y-8 animate-fadeIn text-white">
      {/* Top Banner */}
      <div className="bg-[#0f1b3d] p-6 sm:p-7 rounded-3xl border border-blue-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Classroom Analytics</span>
            <span className="text-slate-500">•</span>
            <span className="text-xs font-bold text-slate-300">{results.length} Submissions Recorded</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">{exam.title || exam.metadata?.title}</h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            className="px-4 py-2.5 rounded-xl bg-[#091124] hover:bg-blue-900/60 border border-blue-700/60 text-xs font-black text-slate-200 hover:text-white cursor-pointer transition-all"
          >
            Refresh Data
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#091124] hover:bg-rose-900/40 border border-blue-700/60 hover:border-rose-500/50 text-xs font-black text-slate-200 hover:text-white cursor-pointer transition-all"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Primary Aggregate Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-[#0b142c] border border-blue-800/70 space-y-1 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            Total Submissions
          </div>
          <div className="text-2xl font-black text-white">{stats.count}</div>
          <div className="text-[11px] text-slate-400">{stats.pendingReviewCount} pending review</div>
        </div>

        <div className="p-5 rounded-3xl bg-[#0b142c] border border-blue-800/70 space-y-1 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Average Score
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {stats.avgPercentage}% <span className="text-sm font-bold text-slate-400">({stats.avgScore} pts)</span>
          </div>
          <div className="text-[11px] text-slate-400">Across all completed attempts</div>
        </div>

        <div className="p-5 rounded-3xl bg-[#0b142c] border border-blue-800/70 space-y-1 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
            Pass Rate
          </div>
          <div className="text-2xl font-black text-purple-400">{stats.passRate}%</div>
          <div className="text-[11px] text-slate-400">{stats.passedCount} / {stats.count} passed</div>
        </div>

        <div className="p-5 rounded-3xl bg-[#0b142c] border border-blue-800/70 space-y-1 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            High / Low Range
          </div>
          <div className="text-2xl font-black text-white">
            {stats.highScore} <span className="text-slate-500 text-base">/</span> {stats.lowScore}
          </div>
          <div className="text-[11px] text-slate-400">Score spread</div>
        </div>
      </div>

      {/* Student Submissions List */}
      <div className="bg-[#0b142c] border border-blue-800/80 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white">Student Exam Attempts</h3>
            <p className="text-xs text-slate-400">Click any student to view per-question answers and manually grade essays</p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search student..."
                className="pl-9 pr-4 py-2 bg-[#070e1f] border border-blue-800/70 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-indigo-400 w-48"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-[#070e1f] border border-blue-800/70 rounded-xl text-xs font-semibold text-white focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="pending_review">Pending Review</option>
              <option value="reviewed">Reviewed</option>
              <option value="auto_graded">Auto Graded</option>
            </select>
          </div>
        </div>

        {filteredResults.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-blue-900/80 rounded-2xl">
            No student submissions match your filters.
          </div>
        ) : (
          <div className="divide-y divide-blue-900/60">
            {filteredResults.map((res) => {
              const student = res.student || { full_name: 'Anonymous Student', email: '' };
              const isPending = res.grading_status === 'pending_review';

              return (
                <div
                  key={res.id}
                  onClick={() => setSelectedStudentResult(res)}
                  className="py-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-blue-950/40 px-3 rounded-2xl transition-all group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center font-black text-sm text-indigo-300 shrink-0">
                      {student.full_name?.charAt(0) || 'S'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors truncate">
                          {student.full_name}
                        </span>
                        {isPending && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Needs Review
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{student.email || 'Classroom Student'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-black text-white">
                        {res.score} / {res.total_marks || res.max_score || 100}
                      </div>
                      <div className="text-[11px] font-bold text-slate-400">
                        {res.percentage}% • Grade {res.grade || '—'}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 text-xs font-black flex items-center gap-1 transition-all"
                    >
                      <span>Review</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Grading Modal */}
      {selectedStudentResult && (
        <StudentAttemptDetailModal
          isOpen={true}
          studentResult={selectedStudentResult}
          exam={exam}
          onClose={() => setSelectedStudentResult(null)}
          onSaveManualGrade={async (resultId, scores, feedbacks, genFeedback) => {
            await onSaveManualGrade(resultId, scores, feedbacks, genFeedback);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
