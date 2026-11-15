import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Edit3,
  Eye,
  EyeOff,
  FolderOpen,
  Gamepad2,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Trophy,
  Users,
  X
} from 'lucide-react';
import type { SavedLibraryGame } from '@/types/gameLibrary';
import type {
  TeacherActivityAssignmentItem,
  TeacherActivityGroup,
  TeacherCompetitionActivity
} from '@/services/gameLibraryService';

interface ActivityDetailsTabProps {
  groups: TeacherActivityGroup[];
  competitions: TeacherCompetitionActivity[];
  savedGames: SavedLibraryGame[];
  currentClassroomId: string;
  loading: boolean;
  publishingId: string | null;
  onToggleGamePublish: (assignment: TeacherActivityAssignmentItem, publish: boolean) => Promise<void>;
  onToggleCompetitionPublish: (comp: TeacherCompetitionActivity, publish: boolean) => Promise<void>;
  onViewGame: (assignment: TeacherActivityAssignmentItem) => Promise<void> | void;
  onEditSavedGame: (savedGameId: string) => void;
  onEditAssignmentMeta: (
    assignmentId: string,
    updates: { title?: string; dueDate?: string | null }
  ) => Promise<boolean>;
  onViewSubmissions: (filter: {
    classroomId?: string;
    activityKey?: string;
  }) => void;
  onOpenGameLibrary: () => void;
  onCreateCompetition: () => void;
}

export const ActivityDetailsTab: React.FC<ActivityDetailsTabProps> = ({
  groups,
  competitions,
  currentClassroomId,
  loading,
  publishingId,
  onToggleGamePublish,
  onToggleCompetitionPublish,
  onViewGame,
  onEditSavedGame,
  onEditAssignmentMeta,
  onViewSubmissions,
  onOpenGameLibrary,
  onCreateCompetition
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Published' | 'Unpublished'>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'current'>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Inline single-assignment title / deadline edit state
  const [editingMetaId, setEditingMetaId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [editDueValue, setEditDueValue] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const startEditMeta = (item: TeacherActivityAssignmentItem) => {
    setEditingMetaId(item.assignmentId);
    setEditTitleValue(item.title);
    setEditDueValue(item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 16) : '');
  };

  const handleSaveMeta = async (assignmentId: string) => {
    if (!editTitleValue.trim()) return;
    setSavingMeta(true);
    try {
      const ok = await onEditAssignmentMeta(assignmentId, {
        title: editTitleValue.trim(),
        dueDate: editDueValue ? new Date(editDueValue).toISOString() : null
      });
      if (ok) {
        setEditingMetaId(null);
      }
    } finally {
      setSavingMeta(false);
    }
  };

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return groups
      .map((grp) => {
        const matchedAssignments = grp.assignments.filter((a) => {
          if (scopeFilter === 'current' && a.classroomId !== currentClassroomId) return false;
          if (statusFilter !== 'all' && a.publicationStatus !== statusFilter) return false;
          if (q) {
            const hay = `${grp.title} ${grp.gameName} ${a.title} ${a.classroomTitle}`.toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        });

        if (matchedAssignments.length === 0) return null;
        return {
          ...grp,
          assignments: matchedAssignments,
          totalClassrooms: matchedAssignments.length,
          publishedCount: matchedAssignments.filter((a) => a.published).length,
          unpublishedCount: matchedAssignments.filter((a) => !a.published).length,
          totalSubmissions: matchedAssignments.reduce((sum, a) => sum + a.submissionsCount, 0)
        };
      })
      .filter((g): g is TeacherActivityGroup => g !== null);
  }, [groups, searchQuery, statusFilter, scopeFilter, currentClassroomId]);

  const filteredCompetitions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return competitions.filter((c) => {
      if (scopeFilter === 'current' && c.classroomId !== currentClassroomId) return false;
      if (statusFilter !== 'all' && c.publicationStatus !== statusFilter) return false;
      if (q) {
        const hay = `${c.title} ${c.classroomTitle} competition`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [competitions, searchQuery, statusFilter, scopeFilter, currentClassroomId]);

  if (loading && groups.length === 0 && competitions.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-bold text-slate-700">Loading assigned activities across your classrooms...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary & Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">Activity Details Across Classrooms</h3>
            <p className="text-xs text-slate-500">
              Games are grouped by saved configuration so multiple classroom assignments stay organised without duplicates.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={onOpenGameLibrary}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors"
            >
              + Assign from Library
            </button>
            <button
              type="button"
              onClick={onCreateCompetition}
              className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-colors"
            >
              + New Competition
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search game, title, or classroom..."
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="sm:col-span-4 flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['all', 'Published', 'Unpublished'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'all' ? 'All Status' : st}
              </button>
            ))}
          </div>
          <div className="sm:col-span-3 flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setScopeFilter('all')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                scopeFilter === 'all'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Classes
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('current')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                scopeFilter === 'current'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Class
            </button>
          </div>
        </div>
      </div>

      {/* Section 1: Grouped Game Assignments */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">
              Assigned Games ({filteredGroups.length})
            </h4>
          </div>
        </div>

        {filteredGroups.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
            <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No matching game assignments</p>
            <p className="text-xs text-slate-500 mt-1">
              Assign a saved game from your Game Library or adjust the filters above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGroups.map((grp) => {
              const isCollapsed = Boolean(collapsedGroups[grp.groupKey]);
              return (
                <div
                  key={grp.groupKey}
                  data-testid={`activity-group-${grp.groupKey}`}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
                >
                  {/* Group Header */}
                  <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleGroup(grp.groupKey)}
                      className="flex items-start sm:items-center gap-3 text-left flex-1 min-w-0"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <Gamepad2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-sm font-black text-slate-900 truncate">{grp.title}</h5>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {grp.gameName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 flex-wrap mt-1 text-[11px] font-semibold text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {grp.totalClassrooms} {grp.totalClassrooms === 1 ? 'Classroom' : 'Classrooms'}
                          </span>
                          {grp.publishedCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              {grp.publishedCount} Published
                            </span>
                          )}
                          {grp.unpublishedCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                              {grp.unpublishedCount} Unpublished
                            </span>
                          )}
                          <span>{grp.totalSubmissions} Total Submissions</span>
                        </div>
                      </div>
                      <span className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0">
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </span>
                    </button>

                    {grp.isSavedLibraryGame && grp.libraryGameId && (
                      <button
                        type="button"
                        onClick={() => onEditSavedGame(grp.libraryGameId!)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shrink-0"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Library Game
                      </button>
                    )}
                  </div>

                  {/* Expanded Classroom Assignment Rows */}
                  {!isCollapsed && (
                    <div className="divide-y divide-slate-100">
                      {grp.assignments.map((a) => {
                        const isBusy = publishingId === a.assignmentId;
                        const isEditingThis = editingMetaId === a.assignmentId;
                        const isCurrentClass = a.classroomId === currentClassroomId;

                        return (
                          <div
                            key={a.assignmentId}
                            data-testid={`activity-row-${a.assignmentId}`}
                            className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition-colors"
                          >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-extrabold">
                                    {a.classroomTitle}
                                  </span>
                                  {isCurrentClass && (
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                                      Current Class
                                    </span>
                                  )}
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      a.published
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    {a.publicationStatus}
                                  </span>
                                </div>

                                {isEditingThis ? (
                                  <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                    <input
                                      type="text"
                                      value={editTitleValue}
                                      onChange={(e) => setEditTitleValue(e.target.value)}
                                      placeholder="Assignment title"
                                      className="sm:col-span-6 px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg"
                                    />
                                    <input
                                      type="datetime-local"
                                      value={editDueValue}
                                      onChange={(e) => setEditDueValue(e.target.value)}
                                      className="sm:col-span-4 px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg"
                                    />
                                    <div className="sm:col-span-2 flex items-center gap-1 justify-end">
                                      <button
                                        type="button"
                                        disabled={savingMeta}
                                        onClick={() => handleSaveMeta(a.assignmentId)}
                                        className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                                        title="Save"
                                      >
                                        {savingMeta ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Check className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingMetaId(null)}
                                        className="p-1.5 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
                                        title="Cancel"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                                      {a.title}
                                    </div>
                                    <div className="flex items-center gap-3 flex-wrap text-[11px] font-medium text-slate-500">
                                      <span className="inline-flex items-center gap-1">
                                        <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                                        {a.completedCount}/{a.totalStudents} Completed
                                        {a.inProgressCount > 0 ? ` · ${a.inProgressCount} In Progress` : ''}
                                      </span>
                                      <span className="inline-flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        {a.dueDate
                                          ? `Due ${new Date(a.dueDate).toLocaleDateString()}`
                                          : 'No Deadline'}
                                      </span>
                                      <span className="font-bold text-indigo-700">
                                        {a.points} pts · {a.totalLevels} {a.totalLevels === 1 ? 'Level' : 'Levels'}
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Row Actions */}
                              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                                <button
                                  type="button"
                                  onClick={() => onViewGame(a)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                  View
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => onToggleGamePublish(a, !a.published)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors disabled:opacity-50 ${
                                    a.published
                                      ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  }`}
                                >
                                  {isBusy ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : a.published ? (
                                    <EyeOff className="w-3.5 h-3.5" />
                                  ) : (
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  )}
                                  {a.published ? 'Unpublish' : 'Republish'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => startEditMeta(a)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onViewSubmissions({
                                      classroomId: a.classroomId,
                                      activityKey: a.assignmentId
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  View Submissions
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Classroom Competitions */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-purple-600" />
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">
            Competitions ({filteredCompetitions.length})
          </h4>
        </div>

        {filteredCompetitions.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
            No competitions match the current filter.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-sm overflow-hidden">
            {filteredCompetitions.map((comp) => {
              const isBusy = publishingId === comp.challengeId;
              return (
                <div
                  key={comp.challengeId}
                  className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 text-[11px] font-extrabold">
                        {comp.classroomTitle}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          comp.published
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {comp.publicationStatus}
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">{comp.title}</div>
                    <div className="flex items-center gap-3 flex-wrap text-[11px] font-medium text-slate-500">
                      <span>
                        {comp.completedCount}/{comp.totalStudents} Evaluated · {comp.submissionsCount} Submitted
                      </span>
                      <span>
                        {comp.deadlineAt
                          ? `Deadline ${new Date(comp.deadlineAt).toLocaleDateString()}`
                          : 'No Deadline'}
                      </span>
                      <span className="font-bold text-purple-700">{comp.maxMarks} pts</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onToggleCompetitionPublish(comp, !comp.published)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors disabled:opacity-50 ${
                        comp.published
                          ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : comp.published ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      {comp.published ? 'Unpublish' : 'Republish'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onViewSubmissions({
                          classroomId: comp.classroomId,
                          activityKey: comp.challengeId
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Submissions
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
