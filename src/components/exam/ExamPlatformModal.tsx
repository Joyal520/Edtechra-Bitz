// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: MODAL WRAPPER
// Connects ClassroomDetailPage with the modular Exam Platform architecture
// ============================================================================

import React, { useState, useEffect } from 'react';
import { ClassroomExam } from '@/types/classroom';
import { CanonicalExamV1 } from './shared/ExamSchema';
import { ExamStudio } from './teacher/ExamStudio';
import { ExamResultsDashboard } from './teacher/ExamResultsDashboard';
import { ExamSession, ExamSessionAttemptData } from './student/ExamSession';
import { ExamResultView } from './student/ExamResultView';
import { examPlatformService } from '@/services/examPlatformService';
import { classroomExamService } from '@/services/classroomExamService';

interface ExamPlatformModalProps {
  isOpen: boolean;
  classroomId: string;
  isTeacher: boolean;
  activeExam?: ClassroomExam | any | null;
  initialTab?: 'my-exams' | 'creator' | 'results' | 'taking';
  onClose: () => void;
  onSuccess: () => void;
}

export const ExamPlatformModal: React.FC<ExamPlatformModalProps> = ({
  isOpen,
  classroomId,
  isTeacher,
  activeExam,
  initialTab = 'creator',
  onClose,
  onSuccess
}) => {
  const [teacherMode, setTeacherMode] = useState<'studio' | 'results' | 'preview'>(
    initialTab === 'results' && activeExam ? 'results' : 'studio'
  );
  const [resultsList, setResultsList] = useState<any[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [previewExam, setPreviewExam] = useState<CanonicalExamV1 | null>(null);

  // Student Session State
  const [studentAttemptData, setStudentAttemptData] = useState<ExamSessionAttemptData | null>(null);
  const [studentResult, setStudentResult] = useState<any | null>(null);

  // Format active exam into canonical schema if needed
  const canonicalActiveExam: CanonicalExamV1 | null = React.useMemo(() => {
    if (!activeExam) return null;
    const rawSections = activeExam.questions_json || (activeExam.questions ? [{ id: 'sec_1', title: 'General', questions: activeExam.questions }] : []);

    return {
      schemaVersion: '1.0',
      exam: {
        title: activeExam.title || 'Exam',
        subject: activeExam.subject || 'General',
        grade: activeExam.grade || 'General',
        examType: activeExam.exam_type || 'Unit Test',
        difficulty: activeExam.difficulty || 'Mixed',
        description: activeExam.description || '',
        instructions: activeExam.instructions || '',
        durationMinutes: activeExam.duration_minutes || 45,
        passPercentage: activeExam.pass_marks ? Math.round((activeExam.pass_marks / (activeExam.total_marks || 100)) * 100) : 40,
        showMarksImmediately: activeExam.show_marks_immediately !== false,
        showCorrectAnswers: activeExam.show_correct_answers !== false,
        password: activeExam.password || undefined
      },
      sections: Array.isArray(rawSections) ? rawSections : []
    };
  }, [activeExam]);

  // Load results if in results view
  const loadExamResults = async () => {
    if (!activeExam?.id) return;
    setIsLoadingResults(true);
    try {
      const data = await classroomExamService.getExamResults(activeExam.id, classroomId);
      setResultsList(data || []);
    } catch (err) {
      console.warn('[ExamPlatformModal] Could not fetch results:', err);
    } finally {
      setIsLoadingResults(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    if (isTeacher) {
      if (initialTab === 'results' && activeExam) {
        setTeacherMode('results');
        loadExamResults();
      } else {
        setTeacherMode('studio');
      }
    } else {
      // Student mode: check if already has result
      if (activeExam?.latest_result) {
        setStudentResult(activeExam.latest_result);
      } else if (activeExam?.id) {
        classroomExamService.getStudentExamResult(activeExam.id).then((r) => {
          if (r) setStudentResult(r);
        });
      }
    }
  }, [isOpen, activeExam, isTeacher, initialTab]);

  if (!isOpen) return null;

  // 1. TEACHER: Student Preview Mode
  if (isTeacher && teacherMode === 'preview' && previewExam) {
    return (
      <ExamSession
        exam={previewExam}
        classroomId={classroomId}
        isPreview={true}
        onClose={() => setTeacherMode('studio')}
      />
    );
  }

  // 2. TEACHER: Results Analytics & Grading Mode
  if (isTeacher && teacherMode === 'results' && activeExam) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[#070e1f] p-4 sm:p-8">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setTeacherMode('studio')}
              className="text-xs font-black text-indigo-300 hover:text-white px-3 py-1.5 rounded-xl bg-blue-950 border border-blue-800"
            >
              &larr; Switch to Exam Creator Studio
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-black text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-blue-950 border border-blue-800"
            >
              Close
            </button>
          </div>

          {isLoadingResults ? (
            <div className="p-12 text-center text-slate-400 text-sm font-semibold bg-[#0b142c] rounded-3xl border border-blue-800">
              Loading student results...
            </div>
          ) : (
            <ExamResultsDashboard
              exam={activeExam}
              results={resultsList}
              onRefresh={loadExamResults}
              onSaveManualGrade={async (resultId, scores, feedbacks, genFeedback) => {
                await examPlatformService.gradeSubjectiveAnswer({
                  resultId,
                  subjectiveScores: scores,
                  subjectiveFeedbacks: feedbacks,
                  generalFeedback: genFeedback
                });
                loadExamResults();
                onSuccess();
              }}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    );
  }

  // 3. TEACHER: Exam Creation Studio
  if (isTeacher) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[#070e1f]">
        <ExamStudio
          classroomId={classroomId}
          initialExam={canonicalActiveExam}
          onClose={onClose}
          onPublishExam={async (examData, schedule) => {
            await examPlatformService.publishExam({
              classroomId,
              canonicalExam: examData,
              schedule
            });
            alert('Exam published successfully to classroom students!');
            onSuccess();
            onClose();
          }}
          onPreviewAsStudent={(examToPreview) => {
            setPreviewExam(examToPreview);
            setTeacherMode('preview');
          }}
        />
      </div>
    );
  }

  // 4. STUDENT: Already Submitted View
  if (!isTeacher && studentResult && canonicalActiveExam) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[#070e1f]">
        <ExamResultView
          result={studentResult}
          examTitle={canonicalActiveExam.exam.title}
          showMarksImmediately={canonicalActiveExam.exam.showMarksImmediately}
          showCorrectAnswers={canonicalActiveExam.exam.showCorrectAnswers}
          onReturnToClassroom={onClose}
        />
      </div>
    );
  }

  // 5. STUDENT: Exam Taking Session
  if (!isTeacher && canonicalActiveExam && activeExam) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[#070e1f]">
        <ExamSession
          exam={canonicalActiveExam}
          classroomId={classroomId}
          attemptData={studentAttemptData}
          onStartAttempt={async (password) => {
            const data = await examPlatformService.startExamAttempt({
              examId: activeExam.id,
              classroomId,
              password
            });
            setStudentAttemptData(data);
            return data;
          }}
          onAutosaveAnswers={async (answers, bookmarkedIds) => {
            await examPlatformService.autosaveAttemptAnswers({
              examId: activeExam.id,
              attemptId: studentAttemptData?.attemptId,
              answers,
              bookmarkedIds
            });
          }}
          onSubmitExam={async (answers) => {
            const result = await examPlatformService.submitExamAttempt({
              examId: activeExam.id,
              classroomId,
              exam: activeExam,
              answers
            });
            onSuccess();
            return result;
          }}
          onClose={onClose}
        />
      </div>
    );
  }

  return null;
};
