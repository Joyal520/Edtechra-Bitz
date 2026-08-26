import React, { useState } from 'react';
import {
  X,
  ArrowRight,
  FileText,
  BookOpen,
  CheckCircle2,
  Layers,
  FolderPlus,
  ListOrdered
} from 'lucide-react';
import { TaskCategory } from '@/types/classroomTask';
import { CreateTaskModal } from './tasks/CreateTaskModal';
import { TaskDashboardModal } from './tasks/TaskDashboardModal';

interface ActivityHubModalProps {
  isOpen: boolean;
  classroomId: string;
  onClose: () => void;
  onCreateTask?: () => void;
  onOpenOCR?: () => void;
  onOpenExam?: () => void;
}

const CATEGORIES: Array<{
  id: TaskCategory;
  name: string;
  icon: any;
  description: string;
  color: string;
}> = [
  {
    id: 'assignment',
    name: 'Assignment',
    icon: FileText,
    description: 'Students complete and submit written work or files.',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'lesson',
    name: 'Lesson',
    icon: BookOpen,
    description: 'Students learn structured content with text, media and checks.',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'practice',
    name: 'Practice',
    icon: CheckCircle2,
    description: 'Students practice skills with interactive auto-graded exercises.',
    color: 'from-purple-500 to-indigo-600'
  },
  {
    id: 'activity',
    name: 'Activity',
    icon: Layers,
    description: 'Classroom projects, creative tasks, debates and discussions.',
    color: 'from-amber-500 to-orange-600'
  },
  {
    id: 'resource',
    name: 'Resource',
    icon: FolderPlus,
    description: 'Learning materials, PDFs, notes, links or reference guides.',
    color: 'from-slate-600 to-slate-800'
  }
];

export const ActivityHubModal: React.FC<ActivityHubModalProps> = ({
  isOpen,
  classroomId,
  onClose
}) => {
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(null);
  const [dashboardOpen, setDashboardOpen] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs font-black text-sm">
              E
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">ASSIGN YOUR STUDENTS</h2>
              <p className="text-xs text-slate-500 font-semibold">What do you want your students to do?</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 5 Simple Category Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className="text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-lg transition-all group flex flex-col justify-between space-y-3 cursor-pointer"
              >
                <div>
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${cat.color} text-white flex items-center justify-center font-black text-xs mb-2 shadow-xs`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium leading-relaxed">
                    {cat.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-black text-indigo-600">
                  <span>Create {cat.name}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}

          {/* Option 6: View All Tasks Dashboard */}
          <button
            type="button"
            onClick={() => setDashboardOpen(true)}
            className="text-left p-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100/70 transition-all group flex flex-col justify-between space-y-3 cursor-pointer"
          >
            <div>
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs mb-2 shadow-xs">
                <ListOrdered className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-indigo-950">
                View Task Dashboard
              </h3>
              <p className="text-xs text-indigo-700 mt-0.5 font-medium leading-relaxed">
                Track all published tasks, view student submissions, and manage scores.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-black text-indigo-700">
              <span>Open Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

      </div>

      {/* Task Creation Modal */}
      {selectedCategory && (
        <CreateTaskModal
          isOpen={Boolean(selectedCategory)}
          onClose={() => {
            setSelectedCategory(null);
            onClose();
          }}
          classroomId={classroomId}
          onTaskCreated={() => {
            setSelectedCategory(null);
            onClose();
          }}
        />
      )}

      {/* Task Dashboard Modal */}
      {dashboardOpen && (
        <TaskDashboardModal
          isOpen={dashboardOpen}
          onClose={() => {
            setDashboardOpen(false);
            onClose();
          }}
          classroomId={classroomId}
        />
      )}

    </div>
  );
};
