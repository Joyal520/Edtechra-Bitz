// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: FULL WORKSPACE PAGE
// Dedicated authoring studio route: /classes/:classroomId/assessments/builder/:assessmentId?
// ============================================================================

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AssessmentBuilder } from '@/components/exam/builder/AssessmentBuilder';
import { ResponseStudioBuilder } from '@/components/exam/response/ResponseStudioBuilder';
import { isResponseAssessment } from '@/components/exam/response/responseStudioSchema';
import { CanonicalAssessmentV2, AssessmentType, ResponseSubType } from '@/components/exam/shared/ExamSchema';
import { classroomExamService } from '@/services/classroomExamService';
import { THEME_PRESETS } from '@/components/exam/shared/themePresets';
import { Loader2 } from 'lucide-react';

export const AssessmentBuilderPage: React.FC = () => {
  const { classroomId, assessmentId } = useParams<{ classroomId: string; assessmentId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isTeacher: authIsTeacher, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(Boolean(assessmentId));
  const [loadedAssessment, setLoadedAssessment] = useState<CanonicalAssessmentV2 | undefined>(undefined);
  const [savedExamId, setSavedExamId] = useState<string | undefined>(assessmentId);

  const rawTypeParam = (searchParams.get('type') || '').toLowerCase();
  const isResponseParam = ['response', 'poll', 'survey', 'feedback'].includes(rawTypeParam);
  const initialSubType: ResponseSubType | null =
    rawTypeParam === 'poll' || rawTypeParam === 'survey' || rawTypeParam === 'feedback'
      ? (rawTypeParam as ResponseSubType)
      : null;

  const initialType: AssessmentType = isResponseParam ? 'survey' : 'exam';

  useEffect(() => {
    setSavedExamId(assessmentId);
  }, [assessmentId]);

  useEffect(() => {
    let isMounted = true;

    // If non-teacher opens an existing assessment builder URL, redirect to student taking view
    if (!authLoading && assessmentId && (!user || !authIsTeacher)) {
      navigate(`/classes/${classroomId}/exams/${assessmentId}`, { replace: true });
      return;
    }

    const loadAssessment = async () => {
      if (!assessmentId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await classroomExamService.getAssessmentV2(assessmentId);
        if (isMounted && data) {
          setLoadedAssessment(data);
        }
      } catch (err) {
        console.error('Failed to load assessment for builder:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (!authLoading) {
      loadAssessment();
    }

    return () => {
      isMounted = false;
    };
  }, [assessmentId, classroomId, authLoading, user, authIsTeacher, navigate]);

  const handleSaveAssessment = async (
    assessment: CanonicalAssessmentV2,
    isPublished: boolean
  ) => {
    if (!classroomId) return;

    try {
      const res = await classroomExamService.saveAssessmentV2({
        examId: savedExamId || assessmentId,
        classroomId,
        assessment,
        status: isPublished ? 'published' : 'draft'
      });

      if (res.error) {
        alert(`Error saving assessment: ${res.error}`);
        return;
      }

      if (res.data?.id && !savedExamId) {
        setSavedExamId(res.data.id);
      }

      if (isPublished) {
        navigate(`/classes/${classroomId}`);
      }
    } catch (err: any) {
      console.error('Save failed:', err);
      alert(err.message || 'Failed to save assessment');
    }
  };

  const handleBack = () => {
    if (classroomId) {
      navigate(`/classes/${classroomId}`);
    } else {
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#050b18] flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
        <p className="text-sm font-semibold text-slate-300">
          Loading Assessment Studio...
        </p>
      </div>
    );
  }

  // Route to EdTechra Response Studio for Poll / Survey / Feedback
  const shouldUseResponseStudio =
    isResponseParam || (loadedAssessment && isResponseAssessment(loadedAssessment));

  if (shouldUseResponseStudio) {
    return (
      <ResponseStudioBuilder
        key={assessmentId || rawTypeParam || 'response-new'}
        classroomId={classroomId || ''}
        initialSubType={initialSubType}
        initialAssessment={loadedAssessment || null}
        onSave={async (assessment, status) => {
          await handleSaveAssessment(assessment, status === 'published');
        }}
        onCancel={handleBack}
      />
    );
  }

  // If new exam assessment, generate initial template matching requested type
  const fallbackAssessment: CanonicalAssessmentV2 = {
    schemaVersion: '2.0',
    assessmentType: initialType,
    exam: {
      title: 'Unit Examination',
      subject: 'General',
      grade: 'Grade 10',
      examType: 'quiz',
      difficulty: 'Medium',
      durationMinutes: 45,
      passPercentage: 60,
      maxAttempts: 1,
      randomizeQuestions: false,
      randomizeOptions: false,
      showMarksImmediately: true,
      showCorrectAnswers: true
    },
    theme: THEME_PRESETS.edtechra_light,
    brandKit: {
      enabled: false,
      watermark: false
    },
    surveySettings: {
      isAnonymous: false,
      collectEmail: true,
      oneResponsePerUser: true,
      thankYouMessage: 'Thank you for your valuable response!'
    },
    sections: [
      {
        id: 'sec_1',
        title: 'Section 1',
        description: 'Answer all questions in this section.',
        questions: []
      }
    ]
  };

  return (
    <AssessmentBuilder
      key={assessmentId || 'new'}
      isNewExam={!assessmentId}
      initialAssessment={loadedAssessment || fallbackAssessment}
      classroomId={classroomId || ''}
      onSaveAssessment={handleSaveAssessment}
      onBack={handleBack}
    />
  );
};
