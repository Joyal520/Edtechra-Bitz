import React, { useEffect } from 'react';
import {
  X,
  FileEdit,
  Camera,
  ListFilter,
  ArrowRight,
  Layers
} from 'lucide-react';

interface TaskWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAssignTask: () => void;
  onSelectQuickAssessment: () => void;
  onSelectViewTasks: () => void;
}

export const TaskWorkspaceModal: React.FC<TaskWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onSelectAssignTask,
  onSelectQuickAssessment,
  onSelectViewTasks
}) => {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-[#C9E5E2] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 bg-[#071a1c] border-b border-[#0e3b40] flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#159A9C] to-[#087477] text-white flex items-center justify-center shadow-md shadow-[#159A9C]/25 shrink-0">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-wider uppercase text-white">
                TASK WORKSPACE
              </h2>
              <p className="text-xs text-teal-100 font-medium">
                Classroom evidence & task management
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Task Workspace"
            className="p-2 text-teal-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto bg-[#F8FCFB]">
          {/* Title & Subtitle */}
          <div className="text-center sm:text-left space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-[#173B3F] tracking-tight">
              What would you like to do?
            </h3>
            <p className="text-sm font-semibold text-[#36565A]">
              Create, assess, or review student learning tasks.
            </p>
          </div>

          {/* Three Options Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {/* OPTION 1 — ASSIGN TASK */}
            <div
              role="button"
              tabIndex={0}
              onClick={onSelectAssignTask}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectAssignTask();
                }
              }}
              className="bg-white hover:bg-[#F0FAF8] rounded-2xl p-6 border-2 border-[#C9E5E2] hover:border-[#159A9C] hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between gap-5 group shadow-2xs text-left"
            >
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#E8F7F5] border border-[#C9E5E2] flex items-center justify-center text-[#087477] group-hover:bg-[#087477] group-hover:text-white group-hover:scale-105 transition-all shadow-xs">
                  <FileEdit className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-base sm:text-lg font-black text-[#173B3F] group-hover:text-[#087477] transition-colors tracking-tight">
                    ASSIGN TASK
                  </h4>
                  <p className="text-xs sm:text-sm text-[#36565A] font-semibold leading-relaxed">
                    Create work for students to complete and submit.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <div className="w-full py-2.5 px-4 rounded-xl bg-[#087477] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 group-hover:bg-[#065e60] transition-colors shadow-xs">
                  <span>Select</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* OPTION 2 — QUICK ASSESSMENT */}
            <div
              role="button"
              tabIndex={0}
              onClick={onSelectQuickAssessment}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectQuickAssessment();
                }
              }}
              className="bg-white hover:bg-[#F0FAF8] rounded-2xl p-6 border-2 border-[#C9E5E2] hover:border-[#087477] hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between gap-5 group shadow-2xs text-left"
            >
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#E8F7F5] border border-[#C9E5E2] flex items-center justify-center text-[#087477] group-hover:bg-[#087477] group-hover:text-white group-hover:scale-105 transition-all shadow-xs">
                  <Camera className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-base sm:text-lg font-black text-[#173B3F] group-hover:text-[#087477] transition-colors tracking-tight">
                    QUICK ASSESSMENT
                  </h4>
                  <p className="text-xs sm:text-sm text-[#36565A] font-semibold leading-relaxed">
                    Immediately assess a student's existing work using a photo or uploaded image.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <div className="w-full py-2.5 px-4 rounded-xl bg-[#087477] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 group-hover:bg-[#065e60] transition-colors shadow-xs">
                  <span>Select</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* OPTION 3 — VIEW TASKS */}
            <div
              role="button"
              tabIndex={0}
              onClick={onSelectViewTasks}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectViewTasks();
                }
              }}
              className="bg-white hover:bg-[#F0FAF8] rounded-2xl p-6 border-2 border-[#C9E5E2] hover:border-[#159A9C] hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between gap-5 group shadow-2xs text-left"
            >
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#E8F7F5] border border-[#C9E5E2] flex items-center justify-center text-[#087477] group-hover:bg-[#087477] group-hover:text-white group-hover:scale-105 transition-all shadow-xs">
                  <ListFilter className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-base sm:text-lg font-black text-[#173B3F] group-hover:text-[#087477] transition-colors tracking-tight">
                    VIEW TASKS
                  </h4>
                  <p className="text-xs sm:text-sm text-[#36565A] font-semibold leading-relaxed">
                    Review existing tasks, submissions and results.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <div className="w-full py-2.5 px-4 rounded-xl bg-[#087477] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 group-hover:bg-[#065e60] transition-colors shadow-xs">
                  <span>Select</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
