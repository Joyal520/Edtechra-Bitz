// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: DEDICATED STUDENT EXAM PAGE
// Route: /classes/:classroomId/exams/:examId & /classes/:classroomId/assessments/:assessmentId
// Full standalone taking environment: server timer, autosave, submission, zero blank screen
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Lock,
  Loader2,
  LogIn,
  Eye,
  Pencil
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { classroomExamService } from '@/services/classroomExamService';
import { examPlatformService } from '@/services/examPlatformService';
import { CanonicalExamV1 } from '@/components/exam/shared/ExamSchema';
import { ExamSession, ExamSessionAttemptData } from '@/components/exam/student/ExamSession';
import { ExamResultView } from '@/components/exam/student/ExamResultView';

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

  // 1. Fetch Exam Data with Multi-Layer Fallback
  useEffect(() => {
    let isMounted = true;

    const loadExam = async () => {
      if (!effectiveExamId) {
        setErrorMessage('Invalid exam identifier.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        // Layer 1: Fetch through classroomExamService
        let examData: any = await classroomExamService.getExamById(effectiveExamId);

        // Layer 2: Resilient server API fallback if direct Supabase returned null
        if (!examData) {
          try {
            const apiRes = await fetch(`/api/exam-engine?action=get-student-exam&examId=${effectiveExamId}&classroomId=${classroomId || ''}`);
            if (apiRes.ok) {
              const resJson = await apiRes.json();
              if (resJson.success && resJson.exam) {
                examData = resJson.exam;
                if (resJson.latest_result && resJson.latest_result.status !== 'in_progress') {
                  setStudentResult(resJson.latest_result);
                }
              }
            }
          } catch (apiErr) {
            console.warn('[StudentExamPage] API fallback note:', apiErr);
          }
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
              questions_json: v2.sections,
              theme_config: v2.theme,
              brand_kit: v2.brandKit,
              survey_settings: v2.surveySettings,
              status: 'published'
            };
          }
        }

        if (!isMounted) return;

        if (!examData) {
          setErrorMessage('This assessment was not found or is no longer available.');
          setLoading(false);
          return;
        }

        // Check if student already submitted
        if (examData.latest_result && examData.latest_result.status !== 'in_progress') {
          setStudentResult(examData.latest_result);
        } else if (user?.id) {
          const existingResult = await classroomExamService.getStudentExamResult(effectiveExamId);
          if (existingResult && existingResult.status !== 'in_progress') {
            setStudentResult(existingResult);
          }
        }

        setExamRecord(examData);
      } catch (err: any) {
        console.error('[StudentExamPage] Exception loading exam:', err);
        if (isMounted) {
          setErrorMessage(err.message || 'Failed to load assessment.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (!authLoading) {
      loadExam();
    }

    return () => {
      isMounted = false;
    };
  }, [effectiveExamId, classroomId, authLoading, user?.id]);

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
        password: examRecord.password || undefined
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

          <button
            type="button"
            onClick={() => navigate(`/classes/${classroomId || examRecord.classroom_id}/assessments/builder/${effectiveExamId}`)}
            className="px-3 py-1 rounded-lg bg-indigo-800 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Pencil className="w-3 h-3" />
            <span>Edit in Studio</span>
          </button>
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
