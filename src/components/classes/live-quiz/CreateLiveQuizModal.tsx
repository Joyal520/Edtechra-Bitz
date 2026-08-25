import React, { useState } from 'react';
import { X, Plus, Trash2, Zap } from 'lucide-react';
import { LiveQuizQuestion, LiveQuizDifficulty, LiveQuiz } from '@/types/liveQuiz';
import { liveQuizService } from '@/services/liveQuizService';

interface CreateLiveQuizModalProps {
  isOpen: boolean;
  classroomId: string;
  onClose: () => void;
  onSuccess: (newQuiz: LiveQuiz) => void;
}

export const CreateLiveQuizModal: React.FC<CreateLiveQuizModalProps> = ({
  isOpen,
  classroomId,
  onClose,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [difficulty, setDifficulty] = useState<LiveQuizDifficulty>('Medium');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<LiveQuizQuestion[]>([
    {
      id: 'q1',
      question: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      durationSec: 20
    }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddQuestion = () => {
    const nextId = `q${questions.length + 1}`;
    setQuestions((prev) => [
      ...prev,
      {
        id: nextId,
        question: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        durationSec: 20
      }
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please provide a quiz title.');
      return;
    }

    const isValid = questions.every(
      (q) => q.question.trim() && q.options.every((opt) => opt.trim())
    );
    if (!isValid) {
      setError('Please fill in every question text and all 4 option fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await liveQuizService.createCustomQuiz({
        classroom_id: classroomId,
        title: title.trim(),
        description: description.trim(),
        category,
        difficulty,
        questions,
        is_public: true
      });

      if (res.error || !res.data) {
        throw new Error(res.error || 'Failed to save quiz');
      }

      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] p-6 shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Create Live Quiz Game</h2>
              <p className="text-xs text-slate-500 font-semibold">Author interactive questions for multiplayer classroom games</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold shrink-0">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-extrabold text-slate-700 mb-1">Quiz Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Science Chapter 3 Solar System"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Science, Grammar"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as LiveQuizDifficulty)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:bg-white"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">Description (Optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What concepts will this live quiz cover?"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-purple-600 focus:bg-white resize-none"
            />
          </div>

          {/* Questions Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Questions ({questions.length})
              </span>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="inline-flex items-center gap-1 text-xs font-extrabold text-purple-700 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>
            </div>

            {questions.map((q, qIndex) => (
              <div key={q.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-black text-slate-800">
                    Question {qIndex + 1}
                  </strong>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIndex)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      title="Remove question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  required
                  value={q.question}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuestions((prev) =>
                      prev.map((item, i) => (i === qIndex ? { ...item, question: val } : item))
                    );
                  }}
                  placeholder="Type the question prompt..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />

                {/* 4 Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-slate-200">
                      <input
                        type="radio"
                        name={`correct_${q.id}`}
                        checked={q.correctIndex === optIndex}
                        onChange={() => {
                          setQuestions((prev) =>
                            prev.map((item, i) =>
                              i === qIndex ? { ...item, correctIndex: optIndex } : item
                            )
                          );
                        }}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500 ml-1"
                        title="Mark as correct answer"
                      />
                      <input
                        type="text"
                        required
                        value={opt}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuestions((prev) =>
                            prev.map((item, i) =>
                              i === qIndex
                                ? {
                                    ...item,
                                    options: item.options.map((o, oi) => (oi === optIndex ? val : o))
                                  }
                                : item
                            )
                          );
                        }}
                        placeholder={`Option ${optIndex + 1}`}
                        className="flex-1 px-2 py-1 text-xs font-medium border-none focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-extrabold shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save & Prepare Quiz'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
