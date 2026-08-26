import React from 'react';
import { CreateTaskModal } from './tasks/CreateTaskModal';

interface ActivityHubModalProps {
  isOpen: boolean;
  classroomId: string;
  onClose: () => void;
  onCreateTask?: () => void;
  onOpenOCR?: () => void;
  onOpenExam?: () => void;
  isTeacher?: boolean;
}

/**
 * Assign Your Students Creation Hub
 * Directly renders the unified 5-category builder modal with the 3-column desktop layout.
 */
export const ActivityHubModal: React.FC<ActivityHubModalProps> = ({
  isOpen,
  classroomId,
  onClose,
  onCreateTask
}) => {
  if (!isOpen) return null;

  return (
    <CreateTaskModal
      isOpen={isOpen}
      onClose={onClose}
      classroomId={classroomId}
      onTaskCreated={() => {
        if (onCreateTask) onCreateTask();
        onClose();
      }}
    />
  );
};
