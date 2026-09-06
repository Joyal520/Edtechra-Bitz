// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: FULL WORKSPACE PAGE
// Dedicated authoring studio route: /classes/:classroomId/assessments/builder/:assessmentId?
// ============================================================================

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AssessmentBuilder } from '@/components/exam/builder/AssessmentBuilder';
import { CanonicalAssessmentV2, AssessmentType } from '@/components/exam/shared/ExamSchema';
import { classroomExamService } from '@/services/classroomExamService';
import { THEME_PRESETS } from '@/components/exam/shared/themePresets';
import { Loader2 } from 'lucide-react';

export const AssessmentBuilderPage: React.FC = () => {
  const { classroomId, assessmentId } = useParams<{ classroomId: string; assessmentId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(Boolean(assessmentId));
  const [loadedAssessment, setLoadedAssessment] = useState<CanonicalAssessmentV2 | undefined>(undefined);

  const initialType: AssessmentType = searchParams.get('type') === 'survey' ? 'survey' : 'exam';

  useEffect(() => {
    let isMounted = true;

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

    loadAssessment();
    return () => {
      isMounted = false;
    };
  }, [assessmentId]);

  const handleSaveAssessment = async (
    assessment: CanonicalAssessmentV2,
    isPublished: boolean
  ) => {
    if (!classroomId) return;

    try {
      const res = await classroomExamService.saveAssessmentV2({
        examId: assessmentId,
        classroomId,
        assessment,
        status: isPublished ? 'published' : 'draft'
      });

      if (res.error) {
        alert(`Error saving assessment: ${res.error}`);
        return;
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

  // If new assessment, generate initial template matching requested type
  const fallbackAssessment: CanonicalAssessmentV2 = {
    schemaVersion: '2.0',
    assessmentType: initialType,
    exam: {
      title: initialType === 'survey' ? 'Classroom Feedback Survey' : 'Unit Examination',
      subject: 'General',
      grade: 'Grade 10',
      examType: initialType === 'survey' ? 'survey' : 'quiz',
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
        description: initialType === 'survey' ? 'Please answer honestly.' : 'Answer all questions in this section.',
        questions: []
      }
    ]
  };

  return (
    <AssessmentBuilder
      key={assessmentId || 'new'}
      initialAssessment={loadedAssessment || fallbackAssessment}
      classroomId={classroomId || ''}
      onSaveAssessment={handleSaveAssessment}
      onBack={handleBack}
    />
  );
};
