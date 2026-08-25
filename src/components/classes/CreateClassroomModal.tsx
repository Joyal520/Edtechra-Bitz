import React, { useState } from 'react';
import { X, BookOpen } from 'lucide-react';
import { classroomService } from '@/services/classroomService';
import { ClassroomTheme } from '@/types/classroom';

interface CreateClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newClassroomId: string) => void;
}

const THEMES: Array<{ id: ClassroomTheme; name: string; bg: string; border: string }> = [
  { id: 'theme-blue', name: 'Blue Focus', bg: 'bg-blue-500', border: 'border-blue-500' },
  { id: 'theme-purple', name: 'Purple Studio', bg: 'bg-purple-500', border: 'border-purple-500' },
  { id: 'theme-green', name: 'Green Growth', bg: 'bg-emerald-500', border: 'border-emerald-500' },
  { id: 'theme-amber', name: 'Amber Workshop', bg: 'bg-amber-500', border: 'border-amber-500' },
  { id: 'theme-rose', name: 'Rose Creative', bg: 'bg-rose-500', border: 'border-rose-500' },
  { id: 'theme-teal', name: 'Teal Discovery', bg: 'bg-teal-500', border: 'border-teal-500' }
];

export const CreateClassroomModal: React.FC<CreateClassroomModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState<ClassroomTheme>('theme-blue');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim() || !subject.trim() || !grade.trim()) {
      setErrorMessage('Please fill in Classroom Title, Subject, and Grade.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await classroomService.createClassroom({
        title: title.trim(),
        subject: subject.trim(),
        grade: grade.trim(),
        description: description.trim(),
        theme
      });

      if (res.error || !res.data) {
        setErrorMessage(res.error || 'Failed to create classroom.');
        setIsSubmitting(false);
        return;
      }

      onSuccess(res.data.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Unexpected error creating classroom.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-brand-50 text-[#026fc3] flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Create New Classroom</h2>
              <p className="text-xs text-slate-500 font-semibold">Launch a focused teaching space for your students</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              Classroom Name / Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Grade 10 English Literature"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3] focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                Subject *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. English, Science"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                Grade / Level *
              </label>
              <input
                type="text"
                required
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="e.g. Grade 10, Advanced"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will students learn in this classroom?"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3] focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Theme selection */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-2">
              Select Theme Banner
            </label>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-left text-xs font-bold transition-all ${
                    theme === t.id
                      ? 'border-[#026fc3] bg-brand-50/70 text-[#026fc3] shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${t.bg} shrink-0`} />
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-extrabold shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Creating...' : 'Create Classroom'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
