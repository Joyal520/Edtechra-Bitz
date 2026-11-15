import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Gamepad2,
  Loader2,
  Search,
  Trophy,
  User,
  X
} from 'lucide-react';
import type {
  TeacherDashboardClassroom,
  TeacherStudentSubmissionRow
} from '@/services/gameLibraryService';

interface StudentSubmissionsTabProps {
  submissions: TeacherStudentSubmissionRow[];
  classrooms: TeacherDashboardClassroom[];
  loading: boolean;
  initialFilter?: {
    classroomId?: string;
    activityKey?: string;
  } | null;
}

const formatDuration = (seconds?: number | null) => {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return null;
  const s = Math.max(0, Math.round(seconds));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return mins > 0 ? `${mins}m ${rem}s` : `${rem}s`;
};

const STATUS_BADGE: Record<TeacherStudentSubmissionRow['status'], string> = {
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
  'Not Started': 'bg-slate-100 text-slate-600 border-slate-200'
};

export const StudentSubmissionsTab: React.FC<StudentSubmissionsTabProps> = ({
  submissions,
  classrooms,
  loading,
  initialFilter
}) => {
  const [classroomFilter, setClassroomFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7d' | '30d' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [selectedRow, setSelectedRow] = useState<TeacherStudentSubmissionRow | null>(null);

  useEffect(() => {
    if (!initialFilter) return;
    setClassroomFilter(initialFilter.classroomId || 'all');
    setActivityFilter(initialFilter.activityKey || 'all');
    setStatusFilter('all');
  }, [initialFilter]);

  const activityOptions = useMemo(() => {
    const map = new Map<string, { id: string; title: string; itemType: string }>();
    submissions.forEach((row) => {
      if (classroomFilter !== 'all' && row.classroomId !== classroomFilter) return;
      if (!map.has(row.activityId)) {
        map.set(row.activityId, {
          id: row.activityId,
          title: row.activityTitle,
          itemType: row.itemType
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [submissions, classroomFilter]);

  const filteredRows = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysMs = now.getTime() - 7 * 86400000;
    const thirtyDaysMs = now.getTime() - 30 * 86400000;
    const customStartMs = customStartDate ? new Date(`${customStartDate}T00:00:00`).getTime() : null;
    const customEndMs = customEndDate ? new Date(`${customEndDate}T23:59:59`).getTime() : null;

    return submissions.filter((row) => {
      if (classroomFilter !== 'all' && row.classroomId !== classroomFilter) return false;
      if (activityFilter !== 'all' && row.activityId !== activityFilter) return false;
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (q) {
        const hay = `${row.studentName} ${row.studentEmail || ''} ${row.activityTitle} ${row.classroomTitle}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (datePreset !== 'all') {
        if (!row.completedAt) return false;
        const ts = new Date(row.completedAt).getTime();
        if (Number.isNaN(ts)) return false;
        if (datePreset === 'today' && ts < startOfToday) return false;
        if (datePreset === '7d' && ts < sevenDaysMs) return false;
        if (datePreset === '30d' && ts < thirtyDaysMs) return false;
        if (datePreset === 'custom') {
          if (customStartMs !== null && ts < customStartMs) return false;
          if (customEndMs !== null && ts > customEndMs) return false;
        }
      }

      return true;
    });
  }, [
    submissions,
    classroomFilter,
    activityFilter,
    statusFilter,
    studentQuery,
    datePreset,
    customStartDate,
    customEndDate
  ]);

  const stats = useMemo(() => {
    const completed = filteredRows.filter((r) => r.status === 'Completed');
    const inProgress = filteredRows.filter((r) => r.status === 'In Progress');
    const notStarted = filteredRows.filter((r) => r.status === 'Not Started');
    const scored = filteredRows.filter((r) => r.percentage !== null && r.percentage !== undefined);
    const avgPct =
      scored.length > 0
        ? Math.round(scored.reduce((s, r) => s + Number(r.percentage || 0), 0) / scored.length)
        : null;
    return {
      completed: completed.length,
      inProgress: inProgress.length,
      notStarted: notStarted.length,
      avgPct
    };
  }, [filteredRows]);

  const clearFilters = () => {
    setClassroomFilter('all');
    setActivityFilter('all');
    setStatusFilter('all');
    setDatePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setStudentQuery('');
  };

  if (loading && submissions.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-bold text-slate-700">Loading student submissions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completed</div>
          <div className="text-xl font-black text-emerald-700 mt-0.5">{stats.completed}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">In Progress</div>
          <div className="text-xl font-black text-amber-600 mt-0.5">{stats.inProgress}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Not Started</div>
          <div className="text-xl font-black text-slate-600 mt-0.5">{stats.notStarted}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Average Score</div>
          <div className="text-xl font-black text-indigo-700 mt-0.5">
            {stats.avgPct !== null ? `${stats.avgPct}%` : '—'}
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">Filter Submissions</span>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Student Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              placeholder="Search student name..."
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Classroom Filter */}
          <select
            aria-label="Filter by classroom"
            value={classroomFilter}
            onChange={(e) => {
              setClassroomFilter(e.target.value);
              setActivityFilter('all');
            }}
            className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Classrooms</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          {/* Activity Filter */}
          <select
            aria-label="Filter by game or competition"
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Games & Competitions</option>
            {activityOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.itemType === 'competition' ? '[Comp] ' : '[Game] '}
                {opt.title}
              </option>
            ))}
          </select>

          {/* Completion Status Filter */}
          <select
            aria-label="Filter by completion status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="In Progress">In Progress</option>
            <option value="Not Started">Not Started</option>
          </select>

          {/* Date Filter */}
          <select
            aria-label="Filter by completion date"
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value as any)}
            className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {datePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-bold text-slate-600">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg"
            />
            <span className="text-xs font-bold text-slate-600">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Results List */}
      {filteredRows.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center">
          <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No matching student submissions</p>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or assigning an activity to students.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Classroom</th>
                    <th className="py-3 px-4">Game / Competition</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredRows.map((row) => (
                    <tr
                      key={row.rowId}
                      onClick={() => setSelectedRow(row)}
                      className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">{row.studentName}</td>
                      <td className="py-3 px-4 text-slate-600 font-semibold">{row.classroomTitle}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          {row.itemType === 'competition' ? (
                            <Trophy className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          ) : (
                            <Gamepad2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          )}
                          <span className="truncate max-w-[200px]">{row.activityTitle}</span>
                          {row.publicationStatus === 'Unpublished' && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold">
                              Unpublished
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_BADGE[row.status]}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black text-slate-800">
                        {row.scoreEarned !== null ? (
                          <span>
                            {row.scoreEarned} / {row.maxPoints}{' '}
                            {row.percentage !== null && (
                              <span className="text-[10px] font-bold text-indigo-600">({row.percentage}%)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold">— / {row.maxPoints}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium whitespace-nowrap">
                        {row.completedAt ? new Date(row.completedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRow(row);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px]"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List (Zero Horizontal Overflow at 390px) */}
          <div className="md:hidden space-y-2.5">
            {filteredRows.map((row) => (
              <button
                key={row.rowId}
                type="button"
                onClick={() => setSelectedRow(row)}
                className="w-full text-left bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-2 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-900 truncate">{row.studentName}</div>
                    <div className="text-[11px] font-semibold text-slate-500 truncate">{row.classroomTitle}</div>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_BADGE[row.status]}`}
                  >
                    {row.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  {row.itemType === 'competition' ? (
                    <Trophy className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  ) : (
                    <Gamepad2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  )}
                  <span className="truncate">{row.activityTitle}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                  <span className="font-black text-indigo-700">
                    {row.scoreEarned !== null
                      ? `${row.scoreEarned}/${row.maxPoints} pts${row.percentage !== null ? ` (${row.percentage}%)` : ''}`
                      : `— / ${row.maxPoints} pts`}
                  </span>
                  <span className="text-slate-500">
                    {row.completedAt ? new Date(row.completedAt).toLocaleDateString() : 'Not completed'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Detailed Submission Drawer / Modal */}
      {selectedRow && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedRow(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-xs font-bold text-indigo-100 uppercase tracking-wider">
                  {selectedRow.classroomTitle} · {selectedRow.gameName}
                </div>
                <h4 className="text-base sm:text-lg font-black truncate">
                  {selectedRow.studentName} — {selectedRow.activityTitle}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Overview Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Status</div>
                  <div className="text-xs font-black text-slate-900 mt-1">{selectedRow.status}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Score Earned</div>
                  <div className="text-xs font-black text-indigo-700 mt-1">
                    {selectedRow.scoreEarned !== null
                      ? `${selectedRow.scoreEarned} / ${selectedRow.maxPoints} pts`
                      : `— / ${selectedRow.maxPoints} pts`}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Completion Date</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">
                    {selectedRow.completedAt ? new Date(selectedRow.completedAt).toLocaleString() : '—'}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Time Recorded</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">
                    {formatDuration(selectedRow.timeTakenSeconds) || '—'}
                  </div>
                </div>
              </div>

              {/* Game Detailed Metrics */}
              {selectedRow.itemType === 'game' && (
                <div className="space-y-3">
                  {(!selectedRow.levelsCompleted || selectedRow.levelsCompleted.length === 0) ? (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
                      {selectedRow.status === 'Not Started'
                        ? 'Student has not started this game yet.'
                        : 'Game is currently in progress. Detailed level metrics will appear once a level is submitted.'}
                    </div>
                  ) : (
                    selectedRow.levelsCompleted.map((lvl) => {
                      const d = lvl.details || {};
                      return (
                        <div
                          key={lvl.levelId}
                          className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm font-black text-slate-900">
                                Level {lvl.levelNumber}: {lvl.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold">
                              <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700">
                                {lvl.scoreEarned} / {lvl.maxPoints} pts ({lvl.percentage}%)
                              </span>
                              {formatDuration(lvl.timeTakenSeconds) && (
                                <span className="inline-flex items-center gap-1 text-slate-500">
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatDuration(lvl.timeTakenSeconds)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Authentic Per-Game Metrics */}
                          <div className="flex flex-wrap gap-2 text-xs">
                            {d.gridSize && (
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                                Grid: {d.gridSize}×{d.gridSize}
                              </span>
                            )}
                            {typeof d.moves === 'number' && (
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                                Moves: {d.moves}
                              </span>
                            )}
                            {typeof d.pairs === 'number' && (
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                                Pairs Matched: {d.pairs}
                              </span>
                            )}
                            {typeof d.stars === 'number' && (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-semibold">
                                Stars: {d.stars}
                              </span>
                            )}
                            {typeof d.wordsSolved === 'number' && typeof d.totalWords === 'number' && (
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                                Words Solved: {d.wordsSolved} / {d.totalWords}
                              </span>
                            )}
                            {typeof d.solved === 'number' && typeof d.total === 'number' && (
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                                Solved: {d.solved} / {d.total}
                              </span>
                            )}
                            {typeof d.hintsUsed === 'number' && (
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                                Hints Used: {d.hintsUsed}
                              </span>
                            )}
                          </div>

                          {/* Classroom Jigsaw Question-Level Breakdown */}
                          {d.questionsEnabled && (
                            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-emerald-900">
                                <span>
                                  Jigsaw Interactive Questions: {d.correctAnswers ?? 0} / {d.totalQuestions ?? 0} Correct (
                                  {d.accuracyPct ?? 0}%)
                                </span>
                                {typeof d.puzzlePoints === 'number' && typeof d.questionPoints === 'number' && (
                                  <span className="text-[11px] font-semibold text-emerald-800">
                                    Puzzle: {d.puzzlePoints} pts + Quiz: {d.questionPoints} pts
                                  </span>
                                )}
                              </div>

                              {Array.isArray(d.questionResults) && d.questionResults.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                  {d.questionResults.map((qr: any, idx: number) => (
                                    <div
                                      key={qr.questionId || idx}
                                      className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                    >
                                      <div className="min-w-0">
                                        <div className="font-bold text-slate-800">
                                          Q{idx + 1}: {qr.prompt || 'Question'}
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                          Student Answer: <span className="font-semibold text-slate-700">{String(qr.studentAnswer ?? '—')}</span>
                                          {!qr.isCorrect && qr.correctAnswer !== undefined && (
                                            <>
                                              {' · '}Correct: <span className="font-semibold text-emerald-700">{String(qr.correctAnswer)}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      <span
                                        className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border self-start sm:self-center ${
                                          qr.isCorrect
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-rose-50 text-rose-700 border-rose-200'
                                        }`}
                                      >
                                        {qr.isCorrect ? 'Correct' : 'Incorrect'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Save the Balloon per-word results */}
                          {Array.isArray(d.results) && d.results.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {d.results.map((r: any, idx: number) => (
                                <span
                                  key={idx}
                                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border ${
                                    r.won
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}
                                >
                                  {r.word}: {r.won ? 'Saved' : 'Missed'}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Competition Detailed Metrics */}
              {selectedRow.itemType === 'competition' && (
                <div className="space-y-3">
                  {!selectedRow.competitionDetails ? (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
                      Student has not submitted work for this competition yet.
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 font-bold">
                          Type: {selectedRow.competitionDetails.submissionType}
                        </span>
                        {selectedRow.competitionDetails.wordCount !== null && (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold">
                            Word Count: {selectedRow.competitionDetails.wordCount}
                          </span>
                        )}
                        {selectedRow.competitionDetails.aiScore !== null && (
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold">
                            AI Score: {selectedRow.competitionDetails.aiScore}
                          </span>
                        )}
                        {selectedRow.competitionDetails.finalScore !== null && (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold">
                            Final Score: {selectedRow.competitionDetails.finalScore}
                          </span>
                        )}
                      </div>

                      {selectedRow.competitionDetails.aiFeedback && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 whitespace-pre-wrap">
                          <div className="font-black text-slate-900 mb-1 flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-purple-600" />
                            AI Evaluation Feedback
                          </div>
                          {selectedRow.competitionDetails.aiFeedback}
                        </div>
                      )}

                      {selectedRow.competitionDetails.teacherAdjusted && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                          <span className="font-bold">Teacher Adjusted Score:</span>{' '}
                          {selectedRow.competitionDetails.teacherAdjustmentReason || 'Score updated by teacher.'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
