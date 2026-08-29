// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: CROSS-CLASSROOM COURSE ANALYTICS & INTELLIGENCE
// Comprehensive Concept Mastery, Classroom Comparisons, and AI Insights.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Users,
  Award,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Search,
  GraduationCap
} from 'lucide-react';
import { CourseAnalyticsSummary } from '@/types/courseStudio';
import { courseStudioService } from '@/services/courseStudioService';
import { BotanicalPaperCutFrame } from '@/components/classes/ClassroomIllustrations';

export const CourseAnalyticsPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState<CourseAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('all');
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    if (courseId) {
      loadAnalytics(courseId);
    }
  }, [courseId]);

  const loadAnalytics = async (id: string) => {
    setLoading(true);
    try {
      const data = await courseStudioService.getCourseAnalytics(id);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load course analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f7f1] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 text-[#026fc3] flex items-center justify-center mx-auto animate-spin">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-sm font-black text-slate-800">Calculating Course Intelligence...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-[#f9f7f1] flex items-center justify-center p-6 text-center space-y-4">
        <h2 className="text-lg font-black text-slate-900">Analytics Not Available</h2>
        <button
          onClick={() => navigate('/course-studio')}
          className="px-5 py-2.5 bg-[#026fc3] text-white text-xs font-black rounded-xl"
        >
          Return to Studio
        </button>
      </div>
    );
  }

  const { overview, classroom_performance, student_performance, concept_mastery, ai_insights, course } = analytics;

  const filteredStudents = student_performance.filter(s => {
    const matchClass = selectedClassroomId === 'all' || s.classroom_id === selectedClassroomId;
    const matchName = s.student_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.student_email.toLowerCase().includes(studentSearch.toLowerCase());
    return matchClass && matchName;
  });

  return (
    <div className="min-h-screen bg-[#f9f7f1] font-sans antialiased text-slate-800 py-6 sm:py-8 relative overflow-x-hidden">
      <BotanicalPaperCutFrame />

      <main className="max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
        
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/course-studio/${course.id}`)}
              className="p-2 rounded-2xl bg-white border border-stone-200/80 hover:bg-stone-50 text-slate-600 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {course.title} • Intelligence & Analytics
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-[#026fc3] text-xs font-black border border-sky-100 uppercase">
                  {course.subject}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Cross-Classroom Learning Telemetry • {overview.total_assigned_classrooms} Assigned Classrooms
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/course-studio/${course.id}`)}
            className="px-4 py-2 rounded-xl bg-[#026fc3] hover:bg-[#03589e] text-white text-xs font-black shadow-xs transition-all cursor-pointer self-start sm:self-auto"
          >
            Open Editor
          </button>
        </div>

        {/* 4 SUMMARY STAT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-[24px] p-5 border border-stone-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Enrolled Students</span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#026fc3] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900">{overview.total_enrolled_students}</p>
            <p className="text-[11px] text-slate-500 font-semibold">{overview.active_students_count} active learners</p>
          </div>

          <div className="bg-white rounded-[24px] p-5 border border-stone-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Avg Progress</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900">{overview.average_progress_percent}%</p>
            <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-[#fbbf24] h-full rounded-full" style={{ width: `${overview.average_progress_percent}%` }} />
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-5 border border-stone-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Concept Mastery</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900">{overview.average_mastery_percent}%</p>
            <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${overview.average_mastery_percent}%` }} />
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-5 border border-stone-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Completion Rate</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900">{overview.overall_completion_rate}%</p>
            <p className="text-[11px] text-slate-500 font-semibold">{overview.average_accuracy_percent}% accuracy</p>
          </div>
        </div>

        {/* AI TEACHING INTELLIGENCE CARD */}
        <section className="bg-gradient-to-br from-[#0a213c] to-[#0f3460] rounded-[28px] p-6 sm:p-8 text-white shadow-lg border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-400/20 text-[#fbbf24] flex items-center justify-center border border-amber-400/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-white">AI Learning Intelligence & Remediation</h2>
                <p className="text-xs text-sky-200 font-medium">Grounded in real student question attempts</p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-sky-500/20 text-sky-200 border border-sky-400/30">
              Live Analysis
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
            {ai_insights.summary}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-white/10 rounded-2xl p-4 border border-white/10 space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Strong Concepts
              </span>
              <ul className="text-xs text-slate-200 space-y-1 font-medium">
                {ai_insights.class_strengths.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white/10 rounded-2xl p-4 border border-white/10 space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Concept Deficiencies
              </span>
              <ul className="text-xs text-slate-200 space-y-1 font-medium">
                {ai_insights.critical_struggles.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-amber-400/10 rounded-2xl p-4 border border-amber-400/20 text-xs font-semibold text-amber-200 flex items-start gap-2.5">
            <Lightbulb className="w-4 h-4 text-[#fbbf24] shrink-0 mt-0.5" />
            <div>
              <span className="font-black text-[#fbbf24]">Recommended Teacher Action: </span>
              <span>{ai_insights.recommended_action}</span>
            </div>
          </div>
        </section>

        {/* 2 COLUMN GRID: CLASSROOM COMPARISON & CONCEPT MASTERY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: CLASSROOM PERFORMANCE COMPARISON (7 cols) */}
          <section className="lg:col-span-7 bg-white rounded-[28px] p-6 border border-stone-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#026fc3]" />
              <span>Classroom Performance Breakdown</span>
            </h3>

            {classroom_performance.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium py-6 text-center">
                This course has not been assigned to any classrooms yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-slate-400 font-black uppercase text-[10px]">
                      <th className="pb-2">Classroom</th>
                      <th className="pb-2">Students</th>
                      <th className="pb-2">Avg Progress</th>
                      <th className="pb-2">Mastery</th>
                      <th className="pb-2">Completion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {classroom_performance.map(c => (
                      <tr key={c.classroom_id} className="hover:bg-stone-50/60 font-semibold text-slate-800">
                        <td className="py-3 font-extrabold text-slate-900">
                          {c.classroom_title}
                          <span className="block text-[10px] text-slate-400 font-normal">{c.grade}</span>
                        </td>
                        <td className="py-3">{c.enrolled_students}</td>
                        <td className="py-3 font-bold text-amber-700">{c.average_progress_percent}%</td>
                        <td className="py-3 font-bold text-emerald-700">{c.average_mastery_percent}%</td>
                        <td className="py-3 font-bold">{c.completion_rate_percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* RIGHT: CONCEPT MASTERY TELEMETRY (5 cols) */}
          <section className="lg:col-span-5 bg-white rounded-[28px] p-6 border border-stone-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Concept Mastery Telemetry</span>
            </h3>

            {concept_mastery.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium py-6 text-center">
                No student question attempts recorded yet.
              </p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {concept_mastery.map((item, idx) => {
                  let badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  if (item.status === 'good') badgeStyle = 'bg-sky-50 text-[#026fc3] border-sky-200';
                  if (item.status === 'needs_support') badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                  if (item.status === 'at_risk') badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';

                  return (
                    <div key={idx} className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900">{item.concept}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${badgeStyle}`}>
                          {item.accuracy_percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.accuracy_percentage >= 80 ? 'bg-emerald-500' : item.accuracy_percentage >= 60 ? 'bg-[#026fc3]' : 'bg-amber-500'
                          }`}
                          style={{ width: `${item.accuracy_percentage}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        {item.correct_attempts} of {item.total_attempts} attempts correct • {item.skill}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>

        {/* STUDENT PERFORMANCE ROSTER */}
        <section className="bg-white rounded-[28px] p-6 border border-stone-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-[#026fc3]" />
              <span>Student Learning Roster ({filteredStudents.length})</span>
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Classroom filter dropdown */}
              <select
                value={selectedClassroomId}
                onChange={e => setSelectedClassroomId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-slate-700"
              >
                <option value="all">All Classrooms</option>
                {classroom_performance.map(c => (
                  <option key={c.classroom_id} value={c.classroom_id}>{c.classroom_title}</option>
                ))}
              </select>

              {/* Student Search */}
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  placeholder="Search student..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <p className="text-xs text-slate-500 font-medium py-6 text-center">
              No students found for the selected filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-slate-400 font-black uppercase text-[10px]">
                    <th className="pb-2">Learner</th>
                    <th className="pb-2">Classroom</th>
                    <th className="pb-2">Progress</th>
                    <th className="pb-2">Mastery</th>
                    <th className="pb-2">Accuracy</th>
                    <th className="pb-2">Deficient Concepts</th>
                    <th className="pb-2">Mastered Concepts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredStudents.map(s => (
                    <tr key={s.student_id} className="hover:bg-stone-50/60 font-semibold text-slate-800">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-sky-100 text-[#026fc3] font-black text-xs flex items-center justify-center">
                            {s.student_name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900">{s.student_name}</p>
                            <p className="text-[10px] text-slate-400">{s.student_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 font-medium text-slate-600">{s.classroom_title}</td>
                      <td className="py-3 font-bold text-amber-700">{s.progress_percent}%</td>
                      <td className="py-3 font-bold text-emerald-700">{s.mastery_percent}%</td>
                      <td className="py-3 font-bold">{s.accuracy_percent}%</td>
                      <td className="py-3">
                        {s.weak_concepts.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {s.weak_concepts.map((wc, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-100">
                                {wc}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">None</span>
                        )}
                      </td>
                      <td className="py-3">
                        {s.strong_concepts.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {s.strong_concepts.map((sc, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                                {sc}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">In Progress</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>
    </div>
  );
};
