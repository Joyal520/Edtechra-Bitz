import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { classroomService } from '@/services/classroomService';
import { ClassroomTheme } from '@/types/classroom';
import { useAuth } from '@/context/AuthContext';

const THEMES: Array<{ id: ClassroomTheme; name: string; bg: string }> = [
  { id: 'theme-blue', name: 'Blue Focus', bg: 'bg-blue-500' },
  { id: 'theme-purple', name: 'Purple Studio', bg: 'bg-purple-500' },
  { id: 'theme-green', name: 'Green Growth', bg: 'bg-emerald-500' },
  { id: 'theme-amber', name: 'Amber Workshop', bg: 'bg-amber-500' },
  { id: 'theme-rose', name: 'Rose Creative', bg: 'bg-rose-500' },
  { id: 'theme-teal', name: 'Teal Discovery', bg: 'bg-teal-500' }
];

export const CreateClassroomPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, openAuthModal } = useAuth();

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState<ClassroomTheme>('theme-blue');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal('login', { type: 'action', action: 'create_classroom' });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
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

      navigate(`/classes/${res.data.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create classroom');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-100 space-y-6">
        
        <button
          onClick={() => navigate('/classes')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Classes</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#026fc3] flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Create New Classroom</h1>
            <p className="text-xs text-slate-500 font-semibold">Launch a workspace for your students and coursework</p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Classroom Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Grade 10 English Literature"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#026fc3] focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Subject *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. English, Math"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#026fc3] focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Grade / Level *</label>
              <input
                type="text"
                required
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="e.g. Grade 10"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#026fc3] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Description (Optional)</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will students learn in this classroom?"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#026fc3] focus:bg-white resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-2">Theme</label>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    theme === t.id
                      ? 'border-[#026fc3] bg-brand-50 text-[#026fc3]'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${t.bg}`} />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/classes')}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-extrabold shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Classroom'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
