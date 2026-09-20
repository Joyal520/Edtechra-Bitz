import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Zap,
  Award,
  Camera,
  Trophy,
  Filter,
  Calendar,
  User,
  Tag
} from 'lucide-react';
import { Classroom } from '@/types/classroom';
import { TeachingIntelligenceData, ClassroomMetricsSummary } from '@/services/teachingIntelligenceService';

interface Student {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
}

interface EvidenceReportsTabProps {
  intelligence?: TeachingIntelligenceData | null;
  metrics?: ClassroomMetricsSummary | null;
  classroomId?: string;
  students?: Student[];
  initialFilter?: {
    topic?: string;
    studentId?: string;
  };
  /** Legacy props from AITeachingIntelligenceModal */
  classroom?: Classroom | { id: string; [key: string]: any } | null;
  data?: any;
}

export const EvidenceReportsTab: React.FC<EvidenceReportsTabProps> = ({
  metrics: metricsProp,
  students: _students = [],
  initialFilter,
  classroom: _classroom,
  data
}) => {
  // Support both explicit metrics prop and legacy data.metrics envelope
  const metrics = metricsProp || data?.metrics || null;
  
  // Extract student list from prop or from metrics.students
  const studentsList: Student[] = useMemo(() => {
    if (_students && _students.length > 0) return _students;
    if (metrics?.students && Array.isArray(metrics.students)) {
      return metrics.students.map((s: any) => ({
        id: s.studentId || s.id,
        full_name: s.fullName || s.full_name || 'Student',
        email: s.email || '',
        avatar_url: s.avatarUrl || s.avatar_url || null
      }));
    }
    return [];
  }, [_students, metrics?.students]);

  const [studentFilter, setStudentFilter] = useState<string>(initialFilter?.studentId || 'all');
  const [topicFilter, setTopicFilter] = useState<string>(initialFilter?.topic || 'all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Reactively synchronize with incoming initialFilter navigation
  React.useEffect(() => {
    if (initialFilter?.topic) {
      setTopicFilter(initialFilter.topic);
    }
    if (initialFilter?.studentId) {
      setStudentFilter(initialFilter.studentId);
    }
  }, [initialFilter?.topic, initialFilter?.studentId]);

  // Extract all individual evidence events from metrics.all_evidence or students.assessmentHistory
  const allEvidence = useMemo(() => {
    // Check if unified normalized evidence is directly available from metrics
    const directEvidence = 
      metrics?.all_evidence || 
      metrics?.allEvidence || 
      (Array.isArray(metrics?.recent_learning_evidence) && metrics.recent_learning_evidence.length > 0 && (metrics.recent_learning_evidence[0]?.sourceLabel || metrics.recent_learning_evidence[0]?.studentName) ? metrics.recent_learning_evidence : null);

    if (Array.isArray(directEvidence) && directEvidence.length > 0) {
      return [...directEvidence].sort((a, b) => {
        const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return timeB - timeA;
      });
    }

    const events: any[] = [];
    if (metrics?.students) {
      metrics.students.forEach((student: any) => {
        if (student.assessmentHistory) {
          student.assessmentHistory.forEach((event: any) => {
            events.push({
              ...event,
              studentId: student.studentId || event.studentId,
              studentName: student.fullName || event.studentName || 'Student'
            });
          });
        }
      });
    }
    // Sort by date newest first
    return events.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }, [metrics]);

  const uniqueTopics = useMemo(() => {
    const topics = new Set<string>();
    allEvidence.forEach((ev) => {
      if (ev.displayName) topics.add(ev.displayName);
      else if (ev.topic) topics.add(ev.topic);
    });
    if (topicFilter !== 'all' && !topics.has(topicFilter)) {
      topics.add(topicFilter);
    }
    return Array.from(topics).sort();
  }, [allEvidence, topicFilter]);

  const filteredEvidence = useMemo(() => {
    return allEvidence.filter((ev) => {
      if (studentFilter !== 'all' && ev.studentId !== studentFilter) return false;
      
      if (topicFilter !== 'all') {
        const filterLower = topicFilter.toLowerCase().trim();
        const evTopicLower = (ev.topic || '').toLowerCase().trim();
        const evSkillLower = (ev.skill || '').toLowerCase().trim();
        const evDisplayLower = (ev.displayName || '').toLowerCase().trim();
        const evRawTopicLower = (ev.rawTopic || '').toLowerCase().trim();
        const evCategoryLower = (ev.category || '').toLowerCase().trim();
        const evTitleLower = (ev.activityTitle || '').toLowerCase().trim();

        // Also check inside metadata.breakdown_json criteria if present (e.g. for OCR or rubric criteria)
        const hasMatchingCriterion = Array.isArray(ev.metadata?.breakdown_json) &&
          ev.metadata.breakdown_json.some((crit: any) => {
            const cName = (crit?.criterion || crit?.name || '').toLowerCase().trim();
            return cName && (filterLower.includes(cName) || cName.includes(filterLower));
          });

        const matchesTopic = 
          hasMatchingCriterion ||
          evTopicLower === filterLower || 
          evDisplayLower === filterLower ||
          evSkillLower === filterLower ||
          evRawTopicLower === filterLower ||
          evCategoryLower === filterLower ||
          evTopicLower.includes(filterLower) || 
          filterLower.includes(evTopicLower) ||
          (evSkillLower && (filterLower.includes(evSkillLower) || evSkillLower.includes(filterLower))) ||
          (evDisplayLower && (filterLower.includes(evDisplayLower) || evDisplayLower.includes(filterLower))) ||
          (evTitleLower && (filterLower.includes(evTitleLower) || evTitleLower.includes(filterLower)));

        if (!matchesTopic) return false;
      }
      
      if (sourceFilter !== 'all') {
        const type = ev.activityType;
        if (sourceFilter === 'task' && type !== 'assignment' && type !== 'task') return false;
        if (sourceFilter === 'live_quiz' && type !== 'live_quiz' && type !== 'quiz') return false;
        if (sourceFilter === 'exam' && type !== 'exam' && type !== 'assessment') return false;
        if (sourceFilter === 'ocr' && type !== 'ocr') return false;
        if (sourceFilter === 'ai_challenge' && type !== 'ai_challenge' && type !== 'competition') return false;
      }

      if (dateFilter !== 'all') {
        const evDate = new Date(ev.completedAt).getTime();
        const now = new Date().getTime();
        const diffDays = (now - evDate) / (1000 * 3600 * 24);
        
        if (dateFilter === '7' && diffDays > 7) return false;
        if (dateFilter === '30' && diffDays > 30) return false;
        if (dateFilter === '90' && diffDays > 90) return false;
      }

      return true;
    });
  }, [allEvidence, studentFilter, topicFilter, sourceFilter, dateFilter]);

  // Compute focus stats when a specific topic is selected
  const focusStats = useMemo(() => {
    if (topicFilter === 'all' || filteredEvidence.length === 0) return null;
    
    const scored = filteredEvidence.filter(e => e.percentage != null && !isNaN(Number(e.percentage)));
    const avgScore = scored.length > 0 
      ? Math.round(scored.reduce((s, e) => s + Number(e.percentage), 0) / scored.length)
      : null;

    const affectedStudents = new Set(scored.filter(e => Number(e.percentage) < 70).map(e => e.studentId).filter(Boolean));
    const totalDistinctStudents = new Set(filteredEvidence.map(e => e.studentId).filter(Boolean));

    // Per-source breakdown cards
    const sourceGroups: Record<string, { count: number; totalPct: number; scoredCount: number }> = {};
    filteredEvidence.forEach(e => {
      const src = e.sourceLabel || (
        e.activityType === 'assignment' || e.activityType === 'task' ? 'Task' :
        e.activityType === 'live_quiz' || e.activityType === 'quiz' ? 'Live Quiz' :
        e.activityType === 'exam' || e.activityType === 'assessment' ? 'Assessment' :
        e.activityType === 'ocr' ? 'OCR' :
        e.activityType === 'ai_challenge' || e.activityType === 'competition' ? 'Competition' :
        'Task'
      );
      if (!sourceGroups[src]) {
        sourceGroups[src] = { count: 0, totalPct: 0, scoredCount: 0 };
      }
      sourceGroups[src].count++;
      if (e.percentage != null && !isNaN(Number(e.percentage))) {
        sourceGroups[src].totalPct += Number(e.percentage);
        sourceGroups[src].scoredCount++;
      }
    });

    const sourcesBreakdown = Object.entries(sourceGroups).map(([source, data]) => ({
      source,
      count: data.count,
      accuracy: data.scoredCount > 0 ? Math.round(data.totalPct / data.scoredCount) : null
    }));

    return {
      topic: topicFilter,
      totalEvidence: filteredEvidence.length,
      averageScore: avgScore,
      affectedCount: affectedStudents.size,
      totalStudentsCount: totalDistinctStudents.size,
      sourcesBreakdown
    };
  }, [topicFilter, filteredEvidence]);

  const getSourceBadge = (type: string) => {
    switch (type) {
      case 'assignment':
      case 'task':
        return { label: 'Task', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <BookOpen className="w-3 h-3" /> };
      case 'live_quiz':
      case 'quiz':
        return { label: 'Live Quiz', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: <Zap className="w-3 h-3" /> };
      case 'exam':
      case 'assessment':
        return { label: 'Assessment', color: 'bg-teal-100 text-teal-800 border-teal-200', icon: <Award className="w-3 h-3" /> };
      case 'ocr':
        return { label: 'OCR Worksheet', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Camera className="w-3 h-3" /> };
      case 'ai_challenge':
      case 'competition':
        return { label: 'Competition', color: 'bg-pink-100 text-pink-800 border-pink-200', icon: <Trophy className="w-3 h-3" /> };
      default:
        return { label: 'Activity', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: <BookOpen className="w-3 h-3" /> };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Diagnostic Evidence Focus Header Banner */}
      {focusStats && (
        <div className="bg-gradient-to-r from-[#F0FDF4] to-[#F8FCFB] rounded-2xl p-5 border border-[#C9E5E2] shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#087477] text-white">
                Diagnostic Evidence Focus
              </span>
              <h3 className="text-base font-black text-[#173B3F]">{focusStats.topic}</h3>
            </div>
            <button
              onClick={() => setTopicFilter('all')}
              className="text-xs font-bold text-[#087477] hover:text-[#065e60] underline cursor-pointer"
            >
              Clear Focus (View All Topics)
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[#36565A]">
            <div>
              <span className="font-bold text-[#173B3F]">{focusStats.totalEvidence}</span> total evidence records
            </div>
            {focusStats.averageScore != null && (
              <div>
                Class accuracy:{' '}
                <span className={`font-black ${focusStats.averageScore < 50 ? 'text-rose-600' : focusStats.averageScore < 70 ? 'text-amber-600' : 'text-teal-700'}`}>
                  {focusStats.averageScore}%
                </span>
              </div>
            )}
            {focusStats.affectedCount > 0 && (
              <div>
                <span className="font-bold text-[#173B3F]">{focusStats.affectedCount}</span> of <span className="font-bold text-[#173B3F]">{focusStats.totalStudentsCount}</span> students below mastery
              </div>
            )}
          </div>

          {/* Per-source breakdown cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {focusStats.sourcesBreakdown.map((sb, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-[#C9E5E2] p-3 shadow-2xs">
                <span className="text-[10px] font-black uppercase tracking-wide text-[#36565A] block">{sb.source}</span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-base font-black text-[#173B3F]">
                    {sb.accuracy != null ? `${sb.accuracy}%` : '--'}
                  </span>
                  <span className="text-[10px] font-bold text-[#36565A]">
                    {sb.count} sub{sb.count > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#C9E5E2] shadow-xs flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5 text-[#173B3F] font-black text-sm shrink-0 mr-2">
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </div>

        {/* Student Filter */}
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-[#36565A]" />
          <select
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            className="bg-white text-[#111827] border border-[#C9E5E2] rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-[#159A9C]"
          >
            <option value="all">All Students</option>
            {studentsList.map((st: Student) => (
              <option key={st.id} value={st.id}>{st.full_name}</option>
            ))}
          </select>
        </div>

        {/* Topic Filter */}
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-[#36565A]" />
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="bg-white text-[#111827] border border-[#C9E5E2] rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-[#159A9C] max-w-[180px] truncate"
          >
            <option value="all">All Topics</option>
            {uniqueTopics.map((topic) => (
              <option key={topic} value={topic}>{topic}</option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#36565A]" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-white text-[#111827] border border-[#C9E5E2] rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-[#159A9C]"
          >
            <option value="all">All Time</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Source Type Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <span className="text-xs font-black text-[#173B3F] shrink-0 mr-1">Source:</span>
        <button
          onClick={() => setSourceFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            sourceFilter === 'all'
              ? 'bg-[#173B3F] text-white shadow-2xs'
              : 'bg-white text-[#36565A] border border-[#C9E5E2] hover:bg-[#E8F7F5]'
          }`}
        >
          All ({allEvidence.length})
        </button>
        <button
          onClick={() => setSourceFilter('task')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            sourceFilter === 'task'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'bg-white text-[#36565A] border border-[#C9E5E2] hover:bg-[#E8F7F5]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Tasks
        </button>
        <button
          onClick={() => setSourceFilter('live_quiz')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            sourceFilter === 'live_quiz'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'bg-white text-[#36565A] border border-[#C9E5E2] hover:bg-[#E8F7F5]'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Live Quizzes
        </button>
        <button
          onClick={() => setSourceFilter('exam')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            sourceFilter === 'exam'
              ? 'bg-teal-600 text-white shadow-2xs'
              : 'bg-white text-[#36565A] border border-[#C9E5E2] hover:bg-[#E8F7F5]'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          Assessments
        </button>
        <button
          onClick={() => setSourceFilter('ocr')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            sourceFilter === 'ocr'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'bg-white text-[#36565A] border border-[#C9E5E2] hover:bg-[#E8F7F5]'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          OCR Worksheets
        </button>
        <button
          onClick={() => setSourceFilter('ai_challenge')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            sourceFilter === 'ai_challenge'
              ? 'bg-pink-600 text-white shadow-2xs'
              : 'bg-white text-[#36565A] border border-[#C9E5E2] hover:bg-[#E8F7F5]'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          Competitions
        </button>
      </div>

      {/* Evidence List */}
      <div className="space-y-3">
        {filteredEvidence.length === 0 ? (
          <div className="py-12 text-center text-[#36565A] text-xs font-bold bg-white rounded-2xl border border-dashed border-[#C9E5E2]">
            No evidence collected yet. Use Tasks, Quizzes, Exams, or Quick Assessments to collect student learning evidence.
          </div>
        ) : (
          filteredEvidence.map((ev, idx) => {
            const badge = getSourceBadge(ev.activityType);
            return (
              <div key={ev.id || idx} className="bg-white rounded-xl border border-[#C9E5E2] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-xs transition-shadow">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-black text-[#111827]">{ev.activityTitle}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border ${badge.color}`}>
                      {badge.icon}
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium text-[#36565A]">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {ev.studentName}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(ev.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  {ev.topic && (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-[#475569] mt-1">
                      <Tag className="w-3 h-3" />
                      {ev.topic}
                    </div>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  {ev.percentage != null ? (
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-black text-[#111827]">
                        {ev.percentage}%
                      </span>
                      {ev.score != null && ev.maxScore != null && (
                        <span className="text-[10px] font-bold text-[#667085]">
                          {ev.score}/{ev.maxScore} pts
                        </span>
                      )}
                    </div>
                  ) : ev.score != null ? (
                    <span className="text-sm font-black text-[#111827]">
                      {ev.score} {ev.maxScore ? `/ ${ev.maxScore}` : ''} pts
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#667085]">Completed</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
