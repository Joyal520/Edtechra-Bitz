import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Zap,
  Plus,
  Play,
  Clock,
  User,
  Copy,
  Check,
  Globe,
  Lock,
  Sparkles,
  Loader2
} from 'lucide-react';
import { LiveQuiz } from '@/types/liveQuiz';
import { liveQuizService } from '@/services/liveQuizService';

interface LiveQuizBankModalProps {
  isOpen: boolean;
  classroomId: string;
  onClose: () => void;
  onSelectQuiz: (quiz: LiveQuiz) => void;
  onCreateCustomQuiz: () => void;
}

type LibraryTab = 'your' | 'common';

const CATEGORIES = [
  'All',
  'Grammar',
  'Vocabulary',
  'ICT',
  'AI',
  'Science',
  'Reading',
  'Life Skills',
  'General Knowledge',
  'Other'
];

export const LiveQuizBankModal: React.FC<LiveQuizBankModalProps> = ({
  isOpen,
  classroomId,
  onClose,
  onSelectQuiz,
  onCreateCustomQuiz
}) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('your');
  const [quizzes, setQuizzes] = useState<LiveQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [copiedSuccessId, setCopiedSuccessId] = useState<string | null>(null);

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

  const handleCopyQuiz = async (quiz: LiveQuiz) => {
    setCopyingId(quiz.id);
    try {
      const res = await liveQuizService.copyQuiz(quiz.id, classroomId);
      if (res.data) {
        setCopiedSuccessId(quiz.id);
        setTimeout(() => setCopiedSuccessId(null), 2000);
        await loadQuizzes();
        setActiveTab('your');
      } else {
        alert(res.error || 'Failed to copy quiz');
      }
    } catch (err: any) {
      alert(err.message || 'Error copying quiz');
    } finally {
      setCopyingId(null);
    }
  };

  if (!isOpen) return null;

  // 1. Filter by Library Tab (Your Quizzes vs Common Quizzes)
  const tabQuizzes = quizzes.filter((q) => {
    if (activeTab === 'your') {
      return q.is_owner === true;
    } else {
      return q.is_owner !== true && q.visibility === 'common';
    }
  });

  // 2. Filter by Academic Category and Search Term
  const filteredQuizzes = tabQuizzes.filter((q) => {
    const matchesCat =
      activeCategory === 'All' || q.category.toLowerCase() === activeCategory.toLowerCase();
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      q.title.toLowerCase().includes(term) ||
      (q.description || '').toLowerCase().includes(term) ||
      (q.creator_name || '').toLowerCase().includes(term);
    return matchesCat && matchesSearch;
  });

  const yourCount = quizzes.filter((q) => q.is_owner === true).length;
  const commonCount = quizzes.filter(
    (q) => q.is_owner !== true && q.visibility === 'common'
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full h-[88vh] p-6 shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Quiz Library & Bank</h2>
              <p className="text-xs text-slate-500 font-semibold">
                Manage your created quizzes or explore shared common quizzes
              </p>
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
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* QUIZ LIBRARY OWNERSHIP TABS */}
        <div className="pt-3 pb-2 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('your')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'your'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Your Quizzes</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  activeTab === 'your' ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {yourCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('common')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'common'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Common Quizzes</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  activeTab === 'common' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {commonCount}
              </span>
            </button>
          </div>
        </div>

        {/* Academic Category Filters & Search Bar */}
        <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-slate-900 text-white font-extrabold shadow-2xs'
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
        <div className="flex-1 overflow-y-auto pt-2 pr-1">
          {loading ? (
            <div className="text-center py-16 flex flex-col items-center justify-center space-y-2 text-xs font-bold text-slate-400 animate-pulse">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              <span>Loading {activeTab === 'your' ? 'your quizzes' : 'common quizzes'}...</span>
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-xs font-black text-slate-700">
                {activeTab === 'your'
                  ? 'You have not created any quizzes yet in this category.'
                  : 'No common quizzes found matching your filters.'}
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                {activeTab === 'your'
                  ? 'Use the AI Quiz Builder or Manual Editor to create your first custom quiz.'
                  : 'Explore other academic categories or create your own custom quiz.'}
              </p>
              {activeTab === 'your' && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreateCustomQuiz();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Quiz Now</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
              {filteredQuizzes.map((quiz) => {
                const timerSec = quiz.timer_seconds;
                const isTimed = quiz.timer_enabled && timerSec && timerSec > 0;
                const timerDisplay = isTimed
                  ? timerSec >= 60
                    ? `${Math.floor(timerSec / 60)}m ${timerSec % 60 ? `${timerSec % 60}s` : ''}`.trim()
                    : `${timerSec} sec`
                  : 'No Timer';

                return (
                  <div
                    key={quiz.id}
                    className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-purple-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div className="space-y-2.5">
                      {/* Top Badges (Category, Difficulty, Timer) */}
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                          {quiz.category}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {quiz.difficulty}
                          </span>

                          <span
                            className={`text-[10px] font-black inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${
                              isTimed
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            <span>{timerDisplay}</span>
                          </span>
                        </div>
                      </div>

                      {/* Quiz Title */}
                      <h3 className="text-sm sm:text-base font-black text-slate-900 line-clamp-1 group-hover:text-purple-700 transition-colors">
                        {quiz.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-slate-500 font-medium line-clamp-2">
                        {quiz.description || `${quiz.questions.length} interactive questions`}
                      </p>

                      {/* Creator attribution badge */}
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className={quiz.is_owner ? 'text-purple-700 font-black' : 'text-slate-600'}>
                          {quiz.creator_name || (quiz.is_owner ? 'Created by You' : 'Created by Teacher')}
                        </span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-400">
                        {quiz.questions.length} Qs
                      </span>

                      <div className="flex items-center gap-1.5">
                        {/* Use / Copy Quiz Button for Common Quizzes */}
                        {!quiz.is_owner && (
                          <button
                            type="button"
                            disabled={copyingId === quiz.id}
                            onClick={() => handleCopyQuiz(quiz)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 rounded-xl text-xs font-black border border-slate-200 transition-colors cursor-pointer"
                            title="Copy this quiz to Your Quizzes so you can edit and customize it"
                          >
                            {copyingId === quiz.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : copiedSuccessId === quiz.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedSuccessId === quiz.id ? 'Copied' : 'Use Quiz'}</span>
                          </button>
                        )}

                        {/* Launch Lobby Button */}
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectQuiz(quiz);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Launch</span>
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
