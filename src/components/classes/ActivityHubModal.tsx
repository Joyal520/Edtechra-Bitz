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
 * Task Creation Hub
 * Directly renders the unified Task workspace modal.
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
