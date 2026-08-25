import React from 'react';
import { X, ArrowRight, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActivityHubModalProps {
  isOpen: boolean;
  classroomId: string;
  onClose: () => void;
  onCreateTask: () => void;
  onOpenOCR: () => void;
  onOpenExam: () => void;
}

export const ActivityHubModal: React.FC<ActivityHubModalProps> = ({
  isOpen,
  classroomId,
  onClose,
  onCreateTask,
  onOpenOCR,
  onOpenExam
}) => {
  const navigate = useNavigate();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Create Learning Activity</h2>
              <p className="text-xs text-slate-500 font-semibold">Choose how you want to create and assign tasks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Creation Paths Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
          
          {/* Option 1: Standard Task Assignment */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onCreateTask();
            }}
            className="text-left p-4 rounded-2xl border border-blue-100 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300 transition-all group flex flex-col justify-between space-y-3 cursor-pointer"
          >
            <div>
              <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center font-black text-xs mb-2">
                01
              </div>
              <h3 className="text-sm font-black text-slate-900 group-hover:text-[#026fc3]">
                Standard Task / Assignment
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Create structured homework, writing prompts, or reading assignments with due dates and points.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-extrabold text-[#026fc3]">
              <span>Create Task</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Option 2: Timed Classroom Exam */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenExam();
            }}
            className="text-left p-4 rounded-2xl border border-purple-100 bg-purple-50/40 hover:bg-purple-50 hover:border-purple-300 transition-all group flex flex-col justify-between space-y-3 cursor-pointer"
          >
            <div>
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-xs mb-2">
                02
              </div>
              <h3 className="text-sm font-black text-slate-900 group-hover:text-purple-700">
                Timed In-Class Exam
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Build multiple-choice assessments with automated scoring, countdown timers, and pass marks.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-extrabold text-purple-700">
              <span>Create Exam</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Option 3: AI OCR Worksheet Grading */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenOCR();
            }}
            className="text-left p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-300 transition-all group flex flex-col justify-between space-y-3 cursor-pointer"
          >
            <div>
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs mb-2">
                03
              </div>
              <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-700">
                AI OCR Worksheet Grading
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Upload student handwriting or worksheet photos for instant rubric evaluation and feedback.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-extrabold text-emerald-700">
              <span>Open OCR Engine</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Option 4: Saved Collections & Resources */}
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(`/classes/${classroomId}/resources`);
            }}
            className="text-left p-4 rounded-2xl border border-amber-100 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-300 transition-all group flex flex-col justify-between space-y-3 cursor-pointer"
          >
            <div>
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-xs mb-2">
                04
              </div>
              <h3 className="text-sm font-black text-slate-900 group-hover:text-amber-700">
                Teaching Resources & Folders
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Organize EdTechra lessons, videos, and reading materials into structured learning folders.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-extrabold text-amber-700">
              <span>Browse Folders</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

        </div>

      </div>
    </div>
  );
};
