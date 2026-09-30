// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: DEDICATED STUDENT EXAM PAGE
// Route: /classes/:classroomId/exams/:examId & /classes/:classroomId/assessments/:assessmentId
// Full standalone taking environment: server timer, autosave, submission, zero blank screen
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Lock,
  Loader2,
  LogIn,
  Eye,
  Pencil,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { classroomExamService } from '@/services/classroomExamService';
import { examPlatformService } from '@/services/examPlatformService';
import { CanonicalExamV1 } from '@/components/exam/shared/ExamSchema';
import { ExamSession, ExamSessionAttemptData } from '@/components/exam/student/ExamSession';
import { ExamResultView } from '@/components/exam/student/ExamResultView';
import { ExamWaitingScreen } from '@/components/exam/student/ExamWaitingScreen';

export const StudentExamPage: React.FC = () => {
  const { classroomId, examId, assessmentId } = useParams<{
    classroomId: string;
    examId?: string;
    assessmentId?: string;
  }>();
  const effectiveExamId = examId || assessmentId || '';

  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading, isTeacher: authIsTeacher } = useAuth();

  const [loading, setLoading] = useState(true);
  const [examRecord, setExamRecord] = useState<any | null>(null);
  const [studentAttemptData, setStudentAttemptData] = useState<ExamSessionAttemptData | null>(null);
  const [studentResult, setStudentResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScheduledWaiting, setIsScheduledWaiting] = useState(false);
  const [serverTimeStr, setServerTimeStr] = useState<string | undefined>(undefined);
  const [teacherBypassWaiting, setTeacherBypassWaiting] = useState(false);

  // 1. Fetch Exam Data with Multi-Layer Fallback & Schedule Verification
  const loadExam = useCallback(async (isAutoActivating = false) => {
    if (!effectiveExamId) {
      setErrorMessage('Invalid exam identifier.');
      setLoading(false);
      return;
    }

    if (!isAutoActivating) {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      let examData: any = null;
      let serverTimeFromApi: string | undefined = undefined;

      // Layer 1: Resilient server API call for authoritative server time & scheduled status
      try {
        const headers: Record<string, string> = {};
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || (user as any)?.access_token;
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const apiRes = await fetch(`/api/exam-engine?action=get-student-exam&examId=${effectiveExamId}&classroomId=${classroomId || ''}`, { headers });
        if (apiRes.ok) {
          const resJson = await apiRes.json();
          if (resJson.success && resJson.exam) {
            examData = resJson.exam;
            serverTimeFromApi = resJson.server_time;
            if (resJson.latest_result && resJson.latest_result.status !== 'in_progress') {
              setStudentResult(resJson.latest_result);
            }
          }
        }
      } catch (apiErr) {
        console.warn('[StudentExamPage] API notice:', apiErr);
      }

      // Layer 2: Fetch through classroomExamService if API not returned
      if (!examData) {
        examData = await classroomExamService.getExamById(effectiveExamId);
      }

      // Layer 3: getAssessmentV2 fallback
      if (!examData) {
        const v2 = await classroomExamService.getAssessmentV2(effectiveExamId);
        if (v2) {
          examData = {
            id: effectiveExamId,
            classroom_id: classroomId,
            title: v2.exam.title,
            subject: v2.exam.subject,
            grade: v2.exam.grade,
            difficulty: v2.exam.difficulty,
            duration_minutes: v2.exam.durationMinutes,
            pass_marks: Math.round(100 * (v2.exam.passPercentage / 100)),
            total_marks: 100,
            starts_at: v2.exam.startsAt || null,
            ends_at: v2.exam.endsAt || null,
            questions_json: v2.sections,
            theme_config: v2.theme,
            brand_kit: v2.brandKit,
            survey_settings: v2.surveySettings,
            status: 'published'
          };
        }
      }

      if (!examData) {
        setErrorMessage('This assessment was not found or is no longer available.');
        setLoading(false);
        return;
      }

      // Gating: If assessment is in draft mode, only teachers/creators can preview it
      const isTeacher = Boolean(
        examData.teacher_id === user?.id ||
        examData.created_by === user?.id ||
        authIsTeacher
      );
      if (examData.status === 'draft' && !isTeacher) {
        setErrorMessage('This assessment is currently in draft mode and has not been published to students yet.');
        setLoading(false);
        return;
      }

      // Check if student already submitted or has an in-progress attempt to restore
      if (examData.latest_result) {
        if (examData.latest_result.status !== 'in_progress') {
          setStudentResult(examData.latest_result);
        } else {
          setStudentAttemptData({
            attemptId: examData.latest_result.id,
            startedAt: examData.latest_result.started_at,
            expiresAt: examData.latest_result.expires_at,
            savedAnswers: examData.latest_result.session_answers || examData.latest_result.answers || {},
            bookmarkedIds: examData.latest_result.bookmarked_question_ids || [],
            durationMinutes: examData.duration_minutes || 45
          });
        }
      } else if (user?.id) {
        const existingResult = await classroomExamService.getStudentExamResult(effectiveExamId);
        if (existingResult) {
          if (existingResult.status !== 'in_progress') {
            setStudentResult(existingResult);
          } else {
            setStudentAttemptData({
              attemptId: existingResult.id,
              startedAt: existingResult.started_at,
              expiresAt: existingResult.expires_at,
              savedAnswers: existingResult.session_answers || existingResult.answers || {},
              bookmarkedIds: existingResult.bookmarked_question_ids || [],
              durationMinutes: examData.duration_minutes || 45
            });
          }
        }
      }

      // Authoritative Schedule Calculation
      setServerTimeStr(serverTimeFromApi || new Date().toISOString());
      const effectiveNow = serverTimeFromApi ? new Date(serverTimeFromApi).getTime() : Date.now();
      const startsAtTime = examData.starts_at ? new Date(examData.starts_at).getTime() : null;
      const isFutureScheduled = Boolean(startsAtTime && startsAtTime > effectiveNow);

      setIsScheduledWaiting(isFutureScheduled);
      setExamRecord(examData);
    } catch (err: any) {
      console.error('[StudentExamPage] Exception loading exam:', err);
      setErrorMessage(err.message || 'Failed to load assessment.');
    } finally {
      setLoading(false);
    }
  }, [effectiveExamId, classroomId, user?.id, authIsTeacher]);

  useEffect(() => {
    if (!authLoading) {
      loadExam();
    }
  }, [authLoading, loadExam]);

  // Realtime subscription on classroom_exams for instant status transitions
  useEffect(() => {
    if (!supabase || !effectiveExamId) return;

    const channel = supabase
      .channel(`exam-lifecycle-${effectiveExamId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'classroom_exams',
          filter: `id=eq.${effectiveExamId}`
        },
        (payload) => {
          console.log('[StudentExamPage] Realtime exam update received:', payload);
          loadExam(true);
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [effectiveExamId, loadExam]);

  // 2. Normalize into CanonicalExamV1 Schema with Deep Robustness
  const canonicalExam: CanonicalExamV1 | null = useMemo(() => {
    if (!examRecord) return null;

    // Normalizing sections: handle array, JSON strings, and empty fallbacks
    let rawSections: any[] = [];
    if (Array.isArray(examRecord.questions_json) && examRecord.questions_json.length > 0) {
      rawSections = examRecord.questions_json;
    } else if (typeof examRecord.questions_json === 'string' && examRecord.questions_json.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(examRecord.questions_json);
        if (Array.isArray(parsed) && parsed.length > 0) rawSections = parsed;
      } catch (e) {}
    }

    if (rawSections.length === 0) {
      let rawQuestions = examRecord.questions;
      if (typeof rawQuestions === 'string' && rawQuestions.trim().startsWith('[')) {
        try {
          rawQuestions = JSON.parse(rawQuestions);
        } catch (e) {}
      }
      if (Array.isArray(rawQuestions) && rawQuestions.length > 0) {
        rawSections = [{ id: 'sec_1', title: 'General', questions: rawQuestions }];
      }
    }

    // Ensure all sections have valid IDs, titles, and questions arrays
    const formattedSections = rawSections.map((sec, sIdx) => {
      const secId = sec.id || `sec_${sIdx + 1}`;
      const secTitle = sec.title || `Section ${String.fromCharCode(65 + sIdx)}`;
      const qList = Array.isArray(sec.questions) ? sec.questions : [];

      return {
        ...sec,
        id: secId,
        title: secTitle,
        questions: qList.map((q: any, qIdx: number) => ({
          ...q,
          id: q.id || `q_${secId}_${qIdx + 1}`,
          type: q.type || 'multiple_choice',
          question: q.question || q.questionText || q.prompt || 'Question Prompt',
          marks: Number(q.marks || 1)
        }))
      };
    });

    const totalMarks = examRecord.total_marks || 100;
    const passMarks = examRecord.pass_marks || Math.round(totalMarks * 0.4);

    return {
      schemaVersion: '1.0',
      assessmentType: examRecord.assessment_type || 'exam',
      exam: {
        title: examRecord.title || 'Classroom Assessment',
        subject: examRecord.subject || 'General',
        grade: examRecord.grade || 'General',
        examType: examRecord.exam_type || 'Unit Test',
        difficulty: examRecord.difficulty || 'Mixed',
        description: examRecord.description || '',
        instructions: examRecord.instructions || '',
        durationMinutes: examRecord.duration_minutes || 45,
        passPercentage: totalMarks > 0 ? Math.round((passMarks / totalMarks) * 100) : 40,
        showMarksImmediately: examRecord.show_marks_immediately !== false,
        showCorrectAnswers: examRecord.show_correct_answers !== false,
        password: examRecord.password || undefined,
        startsAt: examRecord.starts_at || null,
        endsAt: examRecord.ends_at || null
      },
      theme: examRecord.theme_config || undefined,
      brandKit: examRecord.brand_kit || undefined,
      surveySettings: examRecord.survey_settings || undefined,
      sections: formattedSections
    };
  }, [examRecord]);

  // Check if current user is teacher of this exam/classroom
  const isClassroomTeacher = useMemo(() => {
    if (!user) return false;
    if (examRecord?.teacher_id === user.id || examRecord?.created_by === user.id) return true;
    if (authIsTeacher) return true;
    return false;
  }, [user, examRecord, authIsTeacher]);

  // --------------------------------------------------------------------------
  // RENDER: Loading State
  // --------------------------------------------------------------------------
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#070e1f] flex flex-col items-center justify-center p-6 text-white space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
        <div className="text-center space-y-1">
          <h2 className="text-base font-black text-white">Opening Examination Workspace</h2>
          <p className="text-xs text-slate-400">Verifying session and preparing questions...</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: Unauthenticated User Prompt
  // --------------------------------------------------------------------------
  if (!user) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);

    return (
      <div className="min-h-screen bg-[#070e1f] flex items-center justify-center p-4 sm:p-6 text-white animate-fadeIn">
        <div className="w-full max-w-md bg-[#0b142c] border border-blue-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-indigo-600/30 border border-indigo-400/50 text-indigo-300 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
              Student Assessment
            </span>
            <h1 className="text-xl font-black text-white">Sign In to Take Assessment</h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Please sign in with your student account to record your attempt, start the countdown timer, and submit your answers.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(`/login?returnUrl=${returnUrl}`)}
              className="w-full py-3.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In to Continue</span>
            </button>

            {classroomId && (
              <button
                type="button"
                onClick={() => navigate(`/classes/${classroomId}`)}
                className="w-full py-2.5 px-4 text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Classroom</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: Error / Not Found State (Zero Silent Blank Screen!)
  // --------------------------------------------------------------------------
  if (errorMessage || !examRecord || !canonicalExam) {
    return (
      <div className="min-h-screen bg-[#070e1f] flex items-center justify-center p-4 sm:p-6 text-white animate-fadeIn">
        <div className="w-full max-w-md bg-[#0b142c] border border-blue-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-rose-950/80 border border-rose-500/50 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
              Assessment Notice
            </span>
            <h1 className="text-xl font-black text-white">Assessment Not Available</h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              {errorMessage || 'This assessment cannot be loaded. It may not be published yet or you may not have access to this classroom.'}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (classroomId) navigate(`/classes/${classroomId}`);
                else navigate('/classes');
              }}
              className="w-full py-3 px-5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Classroom</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: Already Submitted Result View
  // --------------------------------------------------------------------------
  if (studentResult) {
    return (
      <div className="min-h-screen bg-slate-100">
        <ExamResultView
          result={studentResult}
          examTitle={canonicalExam.exam.title}
          showMarksImmediately={canonicalExam.exam.showMarksImmediately}
          showCorrectAnswers={canonicalExam.exam.showCorrectAnswers}
          onReturnToClassroom={() => {
            if (classroomId) navigate(`/classes/${classroomId}`);
            else navigate('/classes');
          }}
        />
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: Scheduled Exam Waiting Screen (Starts in Future)
  // --------------------------------------------------------------------------
  if (isScheduledWaiting && (!isClassroomTeacher || !teacherBypassWaiting)) {
    return (
      <div className="relative min-h-screen bg-[#070e1f] flex flex-col">
        {/* Teacher Preview Banner with toggle */}
        {isClassroomTeacher && (
          <div className="bg-indigo-950 text-indigo-200 border-b border-indigo-800/80 px-4 py-2.5 text-xs flex items-center justify-between gap-3 z-40 sticky top-0">
            <div className="flex items-center gap-2 font-semibold">
              <Eye className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Teacher Preview Mode — Previewing Student Scheduled Waiting Screen.</span>
            </div>
            <button
              type="button"
              onClick={() => setTeacherBypassWaiting(true)}
              className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <span>Preview Exam Taking UI</span>
            </button>
          </div>
        )}

        <ExamWaitingScreen
          title={canonicalExam.exam.title}
          subject={canonicalExam.exam.subject}
          grade={canonicalExam.exam.grade}
          examType={canonicalExam.exam.examType}
          durationMinutes={canonicalExam.exam.durationMinutes}
          totalMarks={examRecord.total_marks || (canonicalExam.sections.flatMap(s => s.questions || []).reduce((acc, q) => acc + (q.marks || 1), 0))}
          questionCount={examRecord.question_count || canonicalExam.sections.flatMap(s => s.questions || []).length}
          startsAt={examRecord.starts_at}
          serverTime={serverTimeStr}
          onCountdownComplete={async () => {
            console.log('[StudentExamPage] Scheduled start reached. Auto-activating...');
            setIsScheduledWaiting(false);
            await loadExam(true);
          }}
          onReturnToClassroom={() => {
            if (classroomId) navigate(`/classes/${classroomId}`);
            else navigate('/classes');
          }}
        />
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: Guard Against Zero Questions in Active Exam
  // --------------------------------------------------------------------------
  const totalQuestions = canonicalExam.sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0);

  if (totalQuestions === 0) {
    return (
      <div className="min-h-screen bg-[#070e1f] flex items-center justify-center p-4 sm:p-6 text-white animate-fadeIn">
        <div className="w-full max-w-md bg-[#0b142c] border border-blue-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-950/80 border border-amber-500/50 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
              Questions Unavailable
            </span>
            <h1 className="text-xl font-black text-white">Examination Questions Not Available</h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              This examination does not contain any questions or the questions could not be loaded at this time. Please contact your instructor.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => loadExam(true)}
              className="w-full py-3 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md shadow-indigo-600/30"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Loading Questions</span>
            </button>

            {classroomId && (
              <button
                type="button"
                onClick={() => navigate(`/classes/${classroomId}`)}
                className="w-full py-2.5 px-4 text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Classroom</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: Active Student Examination Session
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Teacher Preview Banner (when teacher is viewing student exam) */}
      {isClassroomTeacher && (
        <div className="bg-indigo-950 text-indigo-200 border-b border-indigo-800/80 px-4 py-2 text-xs flex items-center justify-between gap-2 z-40 sticky top-0">
          <div className="flex items-center gap-2 font-semibold">
            <Eye className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Teacher Preview Mode — Student scores will not be recorded for your account.</span>
          </div>

          <div className="flex items-center gap-2">
            {isScheduledWaiting && teacherBypassWaiting && (
              <button
                type="button"
                onClick={() => setTeacherBypassWaiting(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition-colors cursor-pointer"
              >
                <span>View Waiting Screen</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate(`/classes/${classroomId || examRecord.classroom_id}/assessments/builder/${effectiveExamId}`)}
              className="px-3 py-1 rounded-lg bg-indigo-800 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Pencil className="w-3 h-3" />
              <span>Edit in Studio</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Student Taking Workspace */}
      <ExamSession
        exam={canonicalExam}
        classroomId={classroomId || examRecord.classroom_id}
        isPreview={isClassroomTeacher}
        attemptData={studentAttemptData}
        onStartAttempt={async (password) => {
          const data = await examPlatformService.startExamAttempt({
            examId: effectiveExamId,
            classroomId: classroomId || examRecord.classroom_id,
            password
          });
          setStudentAttemptData(data);
          return data;
        }}
        onAutosaveAnswers={async (answers, bookmarkedIds) => {
          await examPlatformService.autosaveAttemptAnswers({
            examId: effectiveExamId,
            attemptId: studentAttemptData?.attemptId,
            answers,
            bookmarkedIds
          });
        }}
        onSubmitExam={async (answers) => {
          const result = await examPlatformService.submitExamAttempt({
            examId: effectiveExamId,
            classroomId: classroomId || examRecord.classroom_id,
            exam: examRecord,
            answers
          });
          setStudentResult(result);
          return result;
        }}
        onClose={() => {
          if (classroomId) navigate(`/classes/${classroomId}`);
          else navigate('/classes');
        }}
      />
    </div>
  );
};
