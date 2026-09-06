// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: TEACHER EXAM CREATION STUDIO
// Seamless adapter pointing directly to AssessmentBuilder 2.0
// ============================================================================

import React from 'react';
import { CanonicalExamV1 } from '../shared/ExamSchema';
import { AssessmentBuilder } from '../builder/AssessmentBuilder';
import { classroomExamService } from '@/services/classroomExamService';

interface ExamStudioProps {
  classroomId: string;
  initialExam?: CanonicalExamV1 | null;
  onClose: () => void;
  onPublishExam: (exam: CanonicalExamV1, schedule?: { startsAt?: string; endsAt?: string }) => Promise<void>;
  onPreviewAsStudent?: (exam: CanonicalExamV1) => void;
}

export const ExamStudio: React.FC<ExamStudioProps> = ({
  classroomId,
  initialExam,
  onClose,
  onPublishExam
}) => {
  return (
    <AssessmentBuilder
      classroomId={classroomId}
      initialAssessment={initialExam || undefined}
      onBack={onClose}
      onSaveAssessment={async (assessment, isPublished) => {
        try {
          const res = await classroomExamService.saveAssessmentV2({
            classroomId,
            assessment,
            status: isPublished ? 'published' : 'draft'
          });

          if (res.error) {
            alert(`Error saving assessment: ${res.error}`);
            return;
          }

          if (isPublished) {
            await onPublishExam(assessment as any);
          } else {
            alert('Draft saved successfully!');
            onClose();
          }
        } catch (err: any) {
          console.error('[ExamStudio] Error saving assessment:', err);
          alert(err.message || 'Failed to save assessment');
        }
      }}
    />
  );
};
