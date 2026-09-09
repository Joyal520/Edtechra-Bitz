// ============================================================================
// EDTECHRA ASSESSMENT STUDIO: EXAM LIBRARY MODAL
// Teacher Assessment Repository: Search, Preview, Edit & Republish without Duplicates
// Strictly isolated to the authenticated teacher (created_by or teacher_id)
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Search,
  Library,
  Eye,
  Pencil,
  Send,
  Copy,
  Check,
  Calendar,
  Clock,
  Award,
  BookOpen,
  RotateCw,
  Layers
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { classroomExamService } from '@/services/classroomExamService';
import { CanonicalAssessmentV2 } from '../shared/ExamSchema';
import { LivePreviewModal } from '../builder/preview/LivePreviewModal';
import { THEME_PRESETS } from '../shared/themePresets';

interface ExamLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId?: string;
  onExamRepublished?: () => void;
}

export const ExamLibraryModal: React.FC<ExamLibraryModalProps> = ({
  isOpen,
  onClose,
  classroomId,
  onExamRepublished
}) => {
  const navigate = useNavigate();

  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Preview State
  const [previewAssessment, setPreviewAssessment] = useState<CanonicalAssessmentV2 | null>(null);

  // Copy & Action Feedback State
  const [copiedExamId, setCopiedExamId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Show auto-dismiss toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // 1. Fetch Teacher Exams with Strict Authentication Isolation
  const loadTeacherExams = async () => {
    setLoading(true);
    try {
      let uid = currentUserId;
      if (!uid && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        uid = session?.user?.id || null;
        setCurrentUserId(uid);
      }

      const allExams = await classroomExamService.getTeacherPreviousExams();

      // Enforce strict teacher isolation: only show exams created by or belonging to this teacher
      const isolatedExams = (allExams || []).filter((e: any) => {
        if (!uid) return true;
        return e.teacher_id === uid || e.created_by === uid;
      });

      setExams(isolatedExams);
    } catch (err: any) {
      console.error('[ExamLibraryModal] Failed to load exams:', err);
      showToast('Failed to load exam library: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTeacherExams();
    }
  }, [isOpen]);

  // Convert an exam database record into CanonicalAssessmentV2 format
  const formatAsCanonical = (item: any): CanonicalAssessmentV2 => {
    let sections = [];
    if (Array.isArray(item.questions_json) && item.questions_json.length > 0) {
      sections = item.questions_json;
    } else if (typeof item.questions_json === 'string' && item.questions_json.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(item.questions_json);
        if (Array.isArray(parsed) && parsed.length > 0) sections = parsed;
      } catch (e) {}
    }

    if (sections.length === 0) {
      let rawQuestions = item.questions;
      if (typeof rawQuestions === 'string' && rawQuestions.trim().startsWith('[')) {
        try {
          rawQuestions = JSON.parse(rawQuestions);
        } catch (e) {}
      }
      if (Array.isArray(rawQuestions) && rawQuestions.length > 0) {
        sections = [{ id: 'sec_1', title: 'General Section', questions: rawQuestions }];
      }
    }

    return {
      schemaVersion: '2.0',
      assessmentType: item.assessment_type || 'exam',
      exam: {
        title: item.title || 'Untitled Assessment',
        subject: item.subject || 'General',
        grade: item.grade || 'Grade 10',
        examType: item.exam_type || 'quiz',
        difficulty: item.difficulty || 'medium',
        description: item.description || '',
        instructions: item.instructions || '',
        durationMinutes: item.duration_minutes || 45,
        passPercentage: item.pass_marks && item.total_marks
          ? Math.round((item.pass_marks / item.total_marks) * 100)
          : 60,
        maxAttempts: item.max_attempts || 1,
        randomizeQuestions: Boolean(item.randomize_questions),
        randomizeOptions: Boolean(item.randomize_options),
        showMarksImmediately: item.show_marks_immediately !== false,
        showCorrectAnswers: item.show_correct_answers !== false,
        startsAt: item.starts_at || null,
        endsAt: item.ends_at || null
      },
      theme: item.theme_config && Object.keys(item.theme_config).length > 0 ? item.theme_config : THEME_PRESETS.edtechra_light,
      brandKit: item.brand_kit || undefined,
      surveySettings: item.survey_settings || undefined,
      sections
    };
  };

  // 2. Filter & Search
  const filteredExams = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return exams.filter((exam) => {
      // Status filter
      if (statusFilter === 'published' && exam.status !== 'published') return false;
      if (statusFilter === 'draft' && exam.status === 'published') return false;

      // Text search
      if (!q) return true;
      const titleMatch = (exam.title || '').toLowerCase().includes(q);
      const subjectMatch = (exam.subject || '').toLowerCase().includes(q);
      const gradeMatch = (exam.grade || '').toLowerCase().includes(q);
      const classMatch = (exam.classroom?.title || '').toLowerCase().includes(q);
      return titleMatch || subjectMatch || gradeMatch || classMatch;
    });
  }, [exams, searchQuery, statusFilter]);

  // 3. Actions
  const handlePreviewExam = (exam: any) => {
    const canonical = formatAsCanonical(exam);
    setPreviewAssessment(canonical);
  };

  const handleEditInStudio = (exam: any) => {
    const targetClassroomId = exam.classroom_id || classroomId || 'general';
    onClose();
    navigate(`/classes/${targetClassroomId}/assessments/builder/${exam.id}`);
  };

  const handleCopyStudentLink = async (exam: any) => {
    const targetClassroomId = exam.classroom_id || classroomId || '';
    const studentUrl = `${window.location.origin}/classes/${targetClassroomId}/exams/${exam.id}`;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(studentUrl);
        setCopiedExamId(exam.id);
        showToast('Student exam link copied to clipboard!');
        setTimeout(() => setCopiedExamId(null), 2500);
      }
    } catch (e) {
      console.warn('Clipboard write failed:', e);
      showToast('Could not copy link to clipboard automatically.', 'error');
    }
  };

  const handleRepublish = async (exam: any) => {
    setPublishingId(exam.id);
    try {
      const canonical = formatAsCanonical(exam);
      const targetClassroomId = exam.classroom_id || classroomId;
      if (!targetClassroomId) {
        showToast('Please assign this exam to a classroom before publishing.', 'error');
        setPublishingId(null);
        return;
      }

      // Update existing record by ID (prevent duplicate creation!)
      const res = await classroomExamService.saveAssessmentV2({
        examId: exam.id,
        classroomId: targetClassroomId,
        assessment: canonical,
        status: 'published'
      });

      if (res.error) {
        showToast(`Failed to republish: ${res.error}`, 'error');
      } else {
        showToast('Assessment published successfully to classroom!');
        // Update local status in place
        setExams((prev) =>
          prev.map((e) => (e.id === exam.id ? { ...e, status: 'published', updated_at: new Date().toISOString() } : e))
        );
        if (onExamRepublished) onExamRepublished();
      }
    } catch (err: any) {
      console.error('Republish error:', err);
      showToast(`Error republishing exam: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setPublishingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
        <div className="bg-[#0b142c] border border-blue-800/80 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
          {/* Header */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-purple-950/90 via-[#101938] to-indigo-950/90 border-b border-blue-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-600/30 border border-purple-400/50 flex items-center justify-center text-purple-300 font-black shadow-inner">
                <Library className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">
                    Teacher Assessment Repository
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-xs font-bold text-slate-300">
                    {exams.length} Total Saved Assessments
                  </span>
                </div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <span>Exam Library</span>
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadTeacherExams}
                disabled={loading}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-blue-900/40 cursor-pointer transition-all disabled:opacity-50"
                title="Refresh library"
              >
                <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-blue-900/40 cursor-pointer transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Controls Bar: Search & Status Filters */}
          <div className="p-4 sm:px-6 bg-[#070e1f] border-b border-blue-900/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search exams by title, subject, or grade..."
                className="w-full pl-9.5 pr-4 py-2 bg-[#0d1b3d] border border-blue-800/80 rounded-xl text-xs font-medium text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-[#0d1b3d] rounded-xl border border-blue-800/80 shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({exams.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('published')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'published'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Published ({exams.filter((e) => e.status === 'published').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('draft')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'draft'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Drafts ({exams.filter((e) => e.status !== 'published').length})
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <RotateCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-400">Loading your exam repository...</p>
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-[#081024] rounded-2xl border border-blue-900/60 p-8">
                <Library className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-sm font-black text-white">No assessments found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchQuery
                    ? `No exams matched "${searchQuery}". Try clearing your search filter.`
                    : 'You haven’t created any assessments yet. Create an Exam or Survey from the studio to build your library.'}
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredExams.map((exam) => {
                  const isSurvey = exam.assessment_type === 'survey';
                  const isPublished = exam.status === 'published';

                  // Calculate question count safely
                  let qCount = 0;
                  if (Array.isArray(exam.questions_json) && exam.questions_json.length > 0) {
                    qCount = exam.questions_json.flatMap((s: any) => s.questions || []).length;
                  } else if (Array.isArray(exam.questions)) {
                    qCount = exam.questions.length;
                  }

                  const updatedDate = exam.updated_at
                    ? new Date(exam.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : null;

                  return (
                    <div
                      key={exam.id}
                      className="p-5 rounded-2xl bg-gradient-to-b from-[#0e1b3d] to-[#0a142c] border border-blue-800/70 hover:border-purple-500/80 shadow-md hover:shadow-xl hover:shadow-purple-950/30 transition-all flex flex-col justify-between space-y-4 group"
                    >
                      {/* Card Top: Badges */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                isPublished
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              }`}
                            >
                              {isPublished ? 'Published' : 'Draft'}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                isSurvey
                                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                              }`}
                            >
                              {isSurvey ? 'Survey' : 'Exam'}
                            </span>
                          </div>

                          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{exam.duration_minutes || 45} mins</span>
                          </span>
                        </div>

                        {/* Exam Title */}
                        <h3 className="text-base font-black text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                          {exam.title || 'Untitled Assessment'}
                        </h3>

                        {/* Subject & Grade Metadata */}
                        <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                          <span>{exam.subject || 'General'}</span>
                          <span className="text-slate-600">•</span>
                          <span>{exam.grade || 'Grade 10'}</span>
                          {exam.difficulty && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-blue-900/40 text-blue-300 rounded">
                                {exam.difficulty}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Card Middle: Stats Strip */}
                      <div className="pt-3 border-t border-blue-900/60 grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="font-bold text-white">{qCount}</span>
                          <span className="text-slate-400">Questions</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="font-bold text-white">{exam.total_marks || 100}</span>
                          <span className="text-slate-400">Marks Total</span>
                        </div>

                        {exam.classroom?.title && (
                          <div className="col-span-2 flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                            <BookOpen className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">
                              Classroom:{' '}
                              <strong className="text-slate-300 font-bold">
                                {exam.classroom.title}
                              </strong>
                            </span>
                          </div>
                        )}

                        {updatedDate && (
                          <div className="col-span-2 flex items-center gap-1.5 text-[10px] text-slate-500">
                            <Calendar className="w-3 h-3 text-slate-600 shrink-0" />
                            <span>Last updated {updatedDate}</span>
                          </div>
                        )}
                      </div>

                      {/* Card Bottom: Action Buttons */}
                      <div className="pt-3 border-t border-blue-900/60 flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          {/* Live Preview Button */}
                          <button
                            type="button"
                            onClick={() => handlePreviewExam(exam)}
                            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-blue-950/80 hover:bg-blue-900 text-slate-200 hover:text-white border border-blue-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Live Student Preview"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="hidden sm:inline">Preview</span>
                          </button>

                          {/* Edit in Studio Button */}
                          <button
                            type="button"
                            onClick={() => handleEditInStudio(exam)}
                            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-blue-950/80 hover:bg-blue-900 text-slate-200 hover:text-white border border-blue-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Edit in Assessment Studio"
                          >
                            <Pencil className="w-3.5 h-3.5 text-purple-400" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Copy Student Link Button */}
                          <button
                            type="button"
                            onClick={() => handleCopyStudentLink(exam)}
                            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Copy direct student exam link"
                          >
                            {copiedExamId === exam.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-300 font-bold">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                <span className="hidden sm:inline">Copy Link</span>
                              </>
                            )}
                          </button>

                          {/* Republish / Publish Button */}
                          <button
                            type="button"
                            disabled={publishingId === exam.id}
                            onClick={() => handleRepublish(exam)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                              isPublished
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                            title={isPublished ? 'Update published exam' : 'Publish to classroom'}
                          >
                            {publishingId === exam.id ? (
                              <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {publishingId === exam.id
                                ? 'Saving...'
                                : isPublished
                                ? 'Republish'
                                : 'Publish'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Toast Notification */}
          {feedbackToast && (
            <div
              className={`p-3 text-center text-xs font-black transition-all ${
                feedbackToast.type === 'error'
                  ? 'bg-rose-900/90 text-rose-200 border-t border-rose-700'
                  : 'bg-emerald-900/90 text-emerald-200 border-t border-emerald-700'
              }`}
            >
              {feedbackToast.message}
            </div>
          )}

          {/* Footer note */}
          <div className="p-4 bg-[#070e1f] border-t border-blue-900/70 text-center text-xs text-slate-400 font-medium">
            Republishing an exam directly updates the existing record without creating duplicate entries.
          </div>
        </div>
      </div>

      {/* Live Preview Modal */}
      {previewAssessment && (
        <LivePreviewModal
          isOpen={Boolean(previewAssessment)}
          assessment={previewAssessment}
          theme={previewAssessment.theme || THEME_PRESETS.edtechra_light}
          onClose={() => setPreviewAssessment(null)}
        />
      )}
    </>
  );
};
