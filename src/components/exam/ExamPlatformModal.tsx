// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: MODAL WRAPPER
// Connects ClassroomDetailPage with the modular Exam Platform architecture
// ============================================================================

import React, { useState, useEffect } from 'react';
import { ClassroomExam } from '@/types/classroom';
import { CanonicalExamV1 } from './shared/ExamSchema';
import { AssessmentBuilder } from './builder/AssessmentBuilder';
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
  const [teacherMode, setTeacherMode] = useState<'studio' | 'results'>(
    initialTab === 'results' && activeExam ? 'results' : 'studio'
  );
  const [resultsList, setResultsList] = useState<any[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  // Student Session State
  const [studentAttemptData, setStudentAttemptData] = useState<ExamSessionAttemptData | null>(null);
  const [studentResult, setStudentResult] = useState<any | null>(null);

  // Format active exam into canonical schema if needed
  const canonicalActiveExam: CanonicalExamV1 | null = React.useMemo(() => {
    if (!activeExam) return null;

    let rawSections: any[] = [];
    if (Array.isArray(activeExam.questions_json) && activeExam.questions_json.length > 0) {
      rawSections = activeExam.questions_json;
    } else if (typeof activeExam.questions_json === 'string' && activeExam.questions_json.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(activeExam.questions_json);
        if (Array.isArray(parsed) && parsed.length > 0) rawSections = parsed;
      } catch (e) {}
    }

    if (rawSections.length === 0) {
      let rawQuestions = activeExam.questions;
      if (typeof rawQuestions === 'string' && rawQuestions.trim().startsWith('[')) {
        try {
          rawQuestions = JSON.parse(rawQuestions);
        } catch (e) {}
      }
      if (Array.isArray(rawQuestions) && rawQuestions.length > 0) {
        rawSections = [{ id: 'sec_1', title: 'General', questions: rawQuestions }];
      }
    }

    const formattedSections = rawSections.map((sec, idx) => ({
      ...sec,
      id: sec.id || `sec_${idx + 1}`,
      title: sec.title || `Section ${String.fromCharCode(65 + idx)}`,
      questions: Array.isArray(sec.questions) ? sec.questions : []
    }));

    return {
      schemaVersion: '1.0',
      assessmentType: activeExam.assessment_type || 'exam',
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
      theme: activeExam.theme_config || undefined,
      brandKit: activeExam.brand_kit || undefined,
      surveySettings: activeExam.survey_settings || undefined,
      sections: formattedSections
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
      // Student mode: check if already has result (ignore in-progress sessions)
      if (activeExam?.latest_result && activeExam.latest_result.status !== 'in_progress') {
        setStudentResult(activeExam.latest_result);
      } else if (activeExam?.id) {
        classroomExamService.getStudentExamResult(activeExam.id).then((r) => {
          if (r && r.status !== 'in_progress') setStudentResult(r);
        });
      }
    }
  }, [isOpen, activeExam, isTeacher, initialTab]);

  if (!isOpen) return null;


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
              &larr; Edit in Assessment Studio
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

  // 3. TEACHER: Visual Assessment Builder 2.0 (Canva + Google Forms)
  if (isTeacher) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden bg-slate-50">
        <AssessmentBuilder
          classroomId={classroomId}
          initialAssessment={canonicalActiveExam || undefined}
          onBack={onClose}
          onSaveAssessment={async (assessmentData, isPublished) => {
            const res = await classroomExamService.saveAssessmentV2({
              examId: activeExam?.id,
              classroomId,
              assessment: assessmentData,
              status: isPublished ? 'published' : 'draft'
            });
            if (res.error) {
              alert(`Error saving assessment: ${res.error}`);
              return;
            }
            if (isPublished) {
              alert('Assessment published successfully to classroom students!');
            } else {
              alert('Draft saved successfully!');
            }
            onSuccess();
            onClose();
          }}
        />
      </div>
    );
  }

  // 4. STUDENT: Already Submitted View
  if (!isTeacher && studentResult && canonicalActiveExam) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100">
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
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100">
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b142c] border border-blue-800/80 rounded-3xl p-6 max-w-md w-full text-center space-y-4 text-white shadow-2xl">
        <h3 className="text-base font-black text-white">Assessment Notice</h3>
        <p className="text-xs text-slate-300">
          This assessment is currently preparing questions or not available. Please ensure the examination is published and try again.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
};
