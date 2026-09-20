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

  // Extract all individual evidence events from metrics.students.assessmentHistory
  const allEvidence = useMemo(() => {
    const events: any[] = [];
    if (metrics?.students) {
      metrics.students.forEach((student: any) => {
        if (student.assessmentHistory) {
          student.assessmentHistory.forEach((event: any) => {
            events.push({
              ...event,
              studentId: student.studentId,
              studentName: student.fullName
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
      if (ev.topic) topics.add(ev.topic);
    });
    return Array.from(topics).sort();
  }, [allEvidence]);

  const filteredEvidence = useMemo(() => {
    return allEvidence.filter((ev) => {
      if (studentFilter !== 'all' && ev.studentId !== studentFilter) return false;
      if (topicFilter !== 'all' && ev.topic !== topicFilter) return false;
      
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
