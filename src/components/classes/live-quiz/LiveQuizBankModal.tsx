import React, { useState, useEffect } from 'react';
import { X, Search, Zap, Plus, Play } from 'lucide-react';
import { LiveQuiz } from '@/types/liveQuiz';
import { liveQuizService } from '@/services/liveQuizService';

interface LiveQuizBankModalProps {
  isOpen: boolean;
  classroomId: string;
  onClose: () => void;
  onSelectQuiz: (quiz: LiveQuiz) => void;
  onCreateCustomQuiz: () => void;
}

const CATEGORIES = ['All', 'Grammar', 'Vocabulary', 'ICT', 'AI', 'Science', 'Reading', 'Life Skills', 'General Knowledge'];

export const LiveQuizBankModal: React.FC<LiveQuizBankModalProps> = ({
  isOpen,
  classroomId,
  onClose,
  onSelectQuiz,
  onCreateCustomQuiz
}) => {
  const [quizzes, setQuizzes] = useState<LiveQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadQuizzes();
    }
  }, [isOpen, classroomId]);

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const list = await liveQuizService.getAllQuizzes(classroomId);
      setQuizzes(list);
    } catch (err) {
      console.error('Failed to load quiz bank', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredQuizzes = quizzes.filter((q) => {
    const matchesCat = activeCategory === 'All' || q.category.toLowerCase() === activeCategory.toLowerCase();
    const term = search.toLowerCase().trim();
    const matchesSearch = !term || q.title.toLowerCase().includes(term) || (q.description || '').toLowerCase().includes(term);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full h-[85vh] p-6 shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Live Quiz Bank & Catalog</h2>
              <p className="text-xs text-slate-500 font-semibold">Select a ready-made quiz or build your own custom game</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onCreateCustomQuiz();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-extrabold shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Custom Quiz</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeCategory === cat
                    ? 'bg-purple-600 text-white font-extrabold shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search quizzes..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>
        </div>

        {/* Grid List of Quizzes */}
        <div className="flex-1 overflow-y-auto pt-2">
          {loading ? (
            <div className="text-center py-16 text-xs font-bold text-slate-400 animate-pulse">
              Loading quiz catalog...
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Zap className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-500">No quizzes match your filter.</p>
              <p className="text-[11px] text-slate-400">Click "Create Custom Quiz" to make one from scratch.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
              {filteredQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white rounded-3xl p-5 border border-slate-100 hover:border-purple-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                        {quiz.category}
                      </span>
                      <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {quiz.difficulty}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 line-clamp-1">
                      {quiz.title}
                    </h3>

                    <p className="text-xs text-slate-500 font-medium line-clamp-2">
                      {quiz.description || `${quiz.questions.length} interactive questions`}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">
                      {quiz.questions.length} Questions
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectQuiz(quiz);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold shadow-2xs active:scale-95 transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Launch Lobby</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
