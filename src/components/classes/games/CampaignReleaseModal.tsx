import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Bell,
  CheckCircle2,
  Clock,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Sparkles,
  Trophy,
  Unlock,
  X
} from 'lucide-react';
import { gameLibraryService, getGameCatalogItem } from '@/services/gameLibraryService';
import type { CampaignAnalyticsData, GameId } from '@/types/gameLibrary';

interface CampaignReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string;
  classroomTitle?: string;
  onUpdated?: () => void;
}

export const CampaignReleaseModal: React.FC<CampaignReleaseModalProps> = ({
  isOpen,
  onClose,
  assignmentId,
  classroomTitle,
  onUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'release' | 'analytics'>('release');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<CampaignAnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Release Controls State
  const [customStart, setCustomStart] = useState<number>(1);
  const [customEnd, setCustomEnd] = useState<number>(10);
  const [customBatchSize, setCustomBatchSize] = useState<number>(15);
  const [lockCutoff, setLockCutoff] = useState<number>(10);
  const [notifyStudents, setNotifyStudents] = useState<boolean>(true);
  const [selectedDiff, setSelectedDiff] = useState<'easy' | 'intermediate' | 'hard'>('easy');
  const [studentSearch, setStudentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Completed' | 'In Progress' | 'Not Started'>('all');

  const loadAnalytics = useCallback(async () => {
    if (!assignmentId) return;
    setLoading(true);
    setError(null);
    const res = await gameLibraryService.getCampaignAnalytics(assignmentId);
    setLoading(false);
    if (res.error || !res.data) {
      setError(res.error || 'Failed to load level release & analytics data.');
      return;
    }
    setData(res.data);
    setCustomStart(res.data.levelRelease.releasedStart || 1);
    setCustomEnd(res.data.levelRelease.releasedEnd || 10);
    setLockCutoff(Math.max(0, (res.data.levelRelease.releasedEnd || 1) - 1));
  }, [assignmentId]);

  useEffect(() => {
    if (isOpen && assignmentId) {
      loadAnalytics();
    }
  }, [isOpen, assignmentId, loadAnalytics]);

  if (!isOpen) return null;

  const isDiffPaths = Boolean(data?.hasDifficultyPaths && data?.difficultyPaths);
  const activePath = isDiffPaths ? data?.difficultyPaths?.[selectedDiff] : null;
  const totalLevels = activePath ? activePath.totalLevels : (data?.levelRelease.totalLevels || 1000);
  const relStart = activePath ? activePath.releasedStart : (data?.levelRelease.releasedStart || 1);
  const relEnd = activePath ? (activePath.isAllowed ? activePath.releasedEnd : 0) : (data?.levelRelease.releasedEnd ?? 0);
  const releasedCount = relEnd >= relStart ? relEnd - relStart + 1 : 0;
  const releasedPct = totalLevels > 0 ? Math.min(100, Math.round((releasedCount / totalLevels) * 1000) / 10) : 0;
  const catItem = data ? getGameCatalogItem(data.assignment.gameId as GameId) : null;

  const runReleaseAction = async (params: {
    action: 'batch' | 'range' | 'lock' | 'release_all';
    batchSize?: number;
    startLevel?: number;
    endLevel?: number;
  }) => {
    if (!assignmentId) return;
    setSaving(true);
    setError(null);
    setFeedback(null);
    const res = await gameLibraryService.releaseCampaignLevels({
      assignmentId,
      ...(isDiffPaths ? { difficulty: selectedDiff } : {}),
      ...params,
      notifyStudents
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error || 'Could not update level release.');
      return;
    }
    const lr = res.levelRelease;
    const msg =
      res.newlyUnlockedRange
        ? `Released Levels ${res.newlyUnlockedRange.start}–${res.newlyUnlockedRange.end}${res.notified ? ' and notified students in the classroom!' : '.'}`
        : lr && lr.released_end < lr.released_start
          ? 'Locked all levels for this classroom.'
          : `Updated released levels to ${lr?.released_start}–${lr?.released_end}.`;
    setFeedback(msg);
    await loadAnalytics();
    onUpdated?.();
  };

  const nextBatchPreviewStart = relEnd >= relStart ? relEnd + 1 : 1;
  const nextBatchPreviewEnd = Math.min(totalLevels, (relEnd >= relStart ? relEnd : 0) + Math.max(1, customBatchSize || 1));

  const filteredStudents = (data?.students || []).filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (studentSearch.trim()) {
      const q = studentSearch.trim().toLowerCase();
      return s.studentName.toLowerCase().includes(q) || (s.studentEmail || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-sky-50 via-white to-indigo-50 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            {catItem && (
              <img
                src={catItem.thumbnailUrl}
                alt={catItem.name}
                className="w-20 aspect-video rounded-xl object-cover border border-sky-200 shrink-0 hidden sm:block"
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-600 text-white">
                  {data?.assignment.gameName || 'Campaign Game'}
                </span>
                {classroomTitle && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {classroomTitle}
                  </span>
                )}
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {totalLevels.toLocaleString()} Total Levels
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate mt-1">
                {data?.assignment.title || 'Level Release & Progress'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {data?.assignment.category || 'Games & Training'} • Class-specific release schedule &amp; analytics
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="px-5 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('release')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'release' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Unlock className="w-3.5 h-3.5" />
              Level Release Controls
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'analytics' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Student Analytics ({data?.summary.totalStudents ?? 0})
            </button>
          </div>

          <button
            type="button"
            onClick={loadAnalytics}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}
          {feedback && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {loading && !data ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 animate-spin text-sky-600 mb-3" />
              <p className="text-sm font-bold text-slate-600">Loading class release schedule &amp; analytics...</p>
            </div>
          ) : data && activeTab === 'release' ? (
            <div className="space-y-5">
              {isDiffPaths && data.difficultyPaths && (
                <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-700 px-1">Difficulty Path:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      { id: 'easy' as const, label: '🟢 Easy' },
                      { id: 'intermediate' as const, label: '🟡 Intermediate' },
                      { id: 'hard' as const, label: '🔴 Hard' }
                    ]).map((d) => {
                      const dp = data.difficultyPaths![d.id];
                      const active = selectedDiff === d.id;
                      const relText = dp?.isAllowed && dp.releasedEnd >= dp.releasedStart
                        ? `${dp.releasedStart}–${dp.releasedEnd}`
                        : 'Locked';
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setSelectedDiff(d.id);
                            setCustomStart(dp?.releasedStart || 1);
                            setCustomEnd(dp?.releasedEnd || 10);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                            active
                              ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {d.label} ({relText})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                  <div className="text-[11px] font-bold text-emerald-800 uppercase">Released Range</div>
                  <div className="text-lg font-black text-emerald-950 mt-0.5">
                    {releasedCount > 0 ? `${relStart}–${relEnd}` : 'Locked'}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold">
                    {releasedCount} of {totalLevels.toLocaleString()} levels
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200">
                  <div className="text-[11px] font-bold text-sky-800 uppercase">Students Assigned</div>
                  <div className="text-lg font-black text-sky-950 mt-0.5">{data.summary.totalStudents}</div>
                  <div className="text-[11px] text-sky-700 font-semibold">{data.summary.startedCount} started</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                  <div className="text-[11px] font-bold text-indigo-800 uppercase">Completed Batch</div>
                  <div className="text-lg font-black text-indigo-950 mt-0.5">
                    {data.summary.completedReleasedCount}/{data.summary.totalStudents}
                  </div>
                  <div className="text-[11px] text-indigo-700 font-semibold">{data.summary.completionPct}% completion</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
                  <div className="text-[11px] font-bold text-amber-800 uppercase">Avg Progress</div>
                  <div className="text-lg font-black text-amber-950 mt-0.5">
                    Lv {data.summary.averageLevelCompleted}
                  </div>
                  <div className="text-[11px] text-amber-700 font-semibold">Avg score: {data.summary.averageScore} pts</div>
                </div>
              </div>

              {/* Visual Level Release Progress Bar */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-600" />
                    <span className="text-sm font-black text-slate-900">Levels Released</span>
                  </div>
                  <span className="text-xs font-extrabold text-slate-700">
                    {releasedPct}% of {totalLevels.toLocaleString()} Levels
                  </span>
                </div>

                <div className="h-3.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-300"
                    style={{ width: `${Math.max(releasedCount > 0 ? 2 : 0, releasedPct)}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  {releasedCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      🟢 {relStart}–{relEnd} Released
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                      🔒 All Levels Currently Locked
                    </span>
                  )}
                  {relEnd < totalLevels && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 text-slate-700">
                      <Lock className="w-3 h-3" />
                      {relEnd + 1}–{totalLevels.toLocaleString()} Locked
                    </span>
                  )}
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyStudents}
                    onChange={(e) => setNotifyStudents(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <Bell className="w-3.5 h-3.5 text-sky-600" />
                  <span>Post a classroom announcement when new levels are unlocked</span>
                </label>
              </div>

              {/* Method B: Quick Batch Release */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Method A — Quick Batch Release
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 20, 50].map((size) => (
                    <button
                      key={size}
                      type="button"
                      disabled={saving || relEnd >= totalLevels}
                      onClick={() => runReleaseAction({ action: 'batch', batchSize: size })}
                      className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-45 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      + Release Next {size} Levels
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={saving || (relStart === 1 && relEnd >= totalLevels)}
                    onClick={() => runReleaseAction({ action: 'release_all' })}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    Release All ({totalLevels.toLocaleString()})
                  </button>
                </div>
              </div>

              {/* Method C & Method A: Custom Batch Size & Custom Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Method B — Custom Batch Size
                  </h3>
                  <p className="text-xs text-slate-500">
                    Next batch preview: <strong className="text-slate-800">Levels {nextBatchPreviewStart}–{nextBatchPreviewEnd}</strong>
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={totalLevels}
                      value={customBatchSize}
                      onChange={(e) => setCustomBatchSize(Math.max(1, Number(e.target.value) || 1))}
                      className="w-28 px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold"
                    />
                    <button
                      type="button"
                      disabled={saving || relEnd >= totalLevels}
                      onClick={() => runReleaseAction({ action: 'batch', batchSize: customBatchSize })}
                      className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-45 text-white text-xs font-extrabold cursor-pointer"
                    >
                      Release Next {customBatchSize}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Method C — Custom Level Range
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Start Level</label>
                      <input
                        type="number"
                        min={1}
                        max={totalLevels}
                        value={customStart}
                        onChange={(e) => setCustomStart(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">End Level</label>
                      <input
                        type="number"
                        min={1}
                        max={totalLevels}
                        value={customEnd}
                        onChange={(e) => setCustomEnd(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-sm font-bold"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => runReleaseAction({ action: 'range', startLevel: customStart, endLevel: customEnd })}
                    className="w-full px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-45 text-white text-xs font-extrabold cursor-pointer"
                  >
                    Apply Range ({customStart}–{Math.max(customStart, customEnd)})
                  </button>
                </div>
              </div>

              {/* Lock Levels Control */}
              <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Lock Levels Above Cap
                  </div>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Restrict access immediately by setting the highest released level (0 locks all levels).
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={0}
                    max={totalLevels}
                    value={lockCutoff}
                    onChange={(e) => setLockCutoff(Math.max(0, Number(e.target.value) || 0))}
                    className="w-24 px-3 py-1.5 rounded-xl border border-rose-200 bg-white text-sm font-bold"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => runReleaseAction({ action: 'lock', endLevel: lockCutoff })}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold cursor-pointer"
                  >
                    Set Cap
                  </button>
                </div>
              </div>
            </div>
          ) : data ? (
            /* Analytics Tab */
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-white border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500">Started / Not Started</div>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {data.summary.startedCount} / {data.summary.notStartedCount}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500">Completed / Playing</div>
                  <div className="text-base font-black text-emerald-700 mt-0.5">
                    {data.summary.completedReleasedCount} / {data.summary.inProgressCount}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500">Highest / Avg Score</div>
                  <div className="text-base font-black text-amber-700 mt-0.5">
                    {data.summary.highestScore} / {data.summary.averageScore} pts
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500">Batch Completion</div>
                  <div className="text-base font-black text-sky-700 mt-0.5">{data.summary.completionPct}%</div>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search student..."
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {(['all', 'Completed', 'In Progress', 'Not Started'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                        statusFilter === st ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      {st === 'all' ? 'All' : st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        <th className="py-2.5 px-4">Student</th>
                        <th className="py-2.5 px-3 text-right">Levels Completed</th>
                        <th className="py-2.5 px-3 text-right">Score</th>
                        <th className="py-2.5 px-3 text-right">Progress</th>
                        <th className="py-2.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500 font-semibold">
                            No students match the current filter.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((s) => (
                          <tr key={s.studentId} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-black text-[11px] flex items-center justify-center shrink-0">
                                  {s.studentName.slice(0, 1).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 truncate">{s.studentName}</div>
                                  {s.difficultySummary && (
                                    <div className="text-[10px] font-bold text-indigo-700 truncate">{s.difficultySummary}</div>
                                  )}
                                  {s.lastPlayedAt && (
                                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" />
                                      Last played {new Date(s.lastPlayedAt).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                              {s.completedCount}/{s.releasedCount}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-amber-700">
                              <span className="inline-flex items-center gap-1">
                                <Trophy className="w-3 h-3 text-amber-500" />
                                {s.scoreEarned}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="inline-flex items-center gap-2">
                                <div className="w-16 h-2 rounded-full bg-slate-200 overflow-hidden hidden sm:block">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full"
                                    style={{ width: `${s.progressPct}%` }}
                                  />
                                </div>
                                <span className="font-extrabold text-slate-700">{s.progressPct}%</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                  s.status === 'Completed'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : s.status === 'In Progress'
                                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                              >
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
