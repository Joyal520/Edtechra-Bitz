// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: QUESTION BANK MODAL
// Reusable repository for searching, filtering, and inserting saved questions
// ============================================================================

import React, { useState } from 'react';
import { X, Search, Plus, BookMarked, Check } from 'lucide-react';
import { CanonicalQuestion, MultipleChoiceQuestion, TrueFalseQuestion } from '../../shared/ExamSchema';
import { getQuestionTypeDefinition } from '../../shared/QuestionTypeRegistry';

interface QuestionBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertQuestion: (question: CanonicalQuestion) => void;
}

// Built-in seed questions for common subjects & topics
const SAMPLE_BANK_QUESTIONS: CanonicalQuestion[] = [
  {
    id: 'bank_bio_01',
    type: 'multiple_choice',
    question: 'Which organelle is known as the powerhouse of the eukaryotic cell?',
    options: [
      { id: 'a', text: 'Mitochondria' },
      { id: 'b', text: 'Ribosome' },
      { id: 'c', text: 'Endoplasmic Reticulum' },
      { id: 'd', text: 'Golgi Apparatus' }
    ],
    correctAnswer: ['a'],
    difficulty: 'medium',
    marks: 1,
    explanation: 'Mitochondria generate most of the cell supply of adenosine triphosphate (ATP).'
  } as MultipleChoiceQuestion,
  {
    id: 'bank_chem_01',
    type: 'true_false',
    question: 'Water reaches its maximum density at 4 degrees Celsius.',
    correctAnswer: true,
    difficulty: 'easy',
    marks: 1,
    explanation: 'Liquid water expands as it cools below 4°C, causing ice to be less dense than water.'
  } as TrueFalseQuestion,
  {
    id: 'bank_eng_01',
    type: 'multiple_choice',
    question: 'Choose the sentence with the correct subjunctive mood:',
    options: [
      { id: 'a', text: 'I wish I were more confident in public speaking.' },
      { id: 'b', text: 'I wish I was more confident in public speaking.' },
      { id: 'c', text: 'I wish I am more confident in public speaking.' },
      { id: 'd', text: 'I wish I will be more confident in public speaking.' }
    ],
    correctAnswer: ['a'],
    difficulty: 'hard',
    marks: 2,
    explanation: '"Were" is the correct subjunctive form for hypothetical statements.'
  } as MultipleChoiceQuestion,
  {
    id: 'bank_math_01',
    type: 'multiple_choice',
    question: 'What is the derivative of f(x) = 3x^2 + 5x - 7 with respect to x?',
    options: [
      { id: 'a', text: '6x + 5' },
      { id: 'b', text: '3x + 5' },
      { id: 'c', text: '6x - 7' },
      { id: 'd', text: '6x^2 + 5' }
    ],
    correctAnswer: ['a'],
    difficulty: 'medium',
    marks: 2,
    explanation: 'Using the power rule: d/dx(3x^2) = 6x and d/dx(5x) = 5.'
  } as MultipleChoiceQuestion
];

export const QuestionBankModal: React.FC<QuestionBankModalProps> = ({
  isOpen,
  onClose,
  onInsertQuestion
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const filteredQuestions = SAMPLE_BANK_QUESTIONS.filter((q) => {
    const matchesSearch = q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || q.type === typeFilter;
    const matchesDiff = difficultyFilter === 'all' || q.difficulty === difficultyFilter;
    return matchesSearch && matchesType && matchesDiff;
  });

  const handleAdd = (q: CanonicalQuestion) => {
    const freshCopy: CanonicalQuestion = {
      ...q,
      id: `bank_${Date.now().toString(36).slice(-4)}_${Math.random().toString(36).slice(-3)}`
    };
    onInsertQuestion(freshCopy);
    setAddedIds(prev => new Set(prev).add(q.id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-[#0b142c] border border-blue-800/90 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-950 via-[#0f1b3d] to-indigo-950 border-b border-blue-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/50 flex items-center justify-center text-indigo-300">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Question Bank</h3>
              <p className="text-xs text-slate-400">Search and insert curated curriculum questions in 1 click.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-blue-900/40 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-4 sm:p-5 bg-[#070e1f] border-b border-blue-900/80 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search question keyword..."
              className="w-full pl-9 pr-3 py-2 bg-[#0b142c] border border-blue-800/70 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-indigo-400"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-[#0b142c] border border-blue-800/70 rounded-xl text-xs font-semibold text-white focus:outline-hidden"
          >
            <option value="all">All Question Types</option>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="true_false">True / False</option>
            <option value="short_answer">Short Answer</option>
          </select>

          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-3 py-2 bg-[#0b142c] border border-blue-800/70 rounded-xl text-xs font-semibold text-white focus:outline-hidden"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Question Cards List */}
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {filteredQuestions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-blue-900 rounded-2xl">
              No questions found matching your filter criteria.
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const meta = getQuestionTypeDefinition(q.type);
              const isAdded = addedIds.has(q.id);

              return (
                <div
                  key={q.id}
                  className="p-4 rounded-2xl bg-[#0f1b3d] border border-blue-800/70 hover:border-blue-700 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeClass}`}>
                        {meta.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono capitalize">
                        {q.difficulty} • {q.marks} Mark{q.marks > 1 ? 's' : ''}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAdd(q)}
                      className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                        isAdded
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs active:scale-95'
                      }`}
                    >
                      {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{isAdded ? 'Added' : 'Add to Exam'}</span>
                    </button>
                  </div>

                  <p className="text-xs font-semibold text-white leading-relaxed">{q.question}</p>

                  {/* Options if MCQ */}
                  {q.type === 'multiple_choice' && (q as MultipleChoiceQuestion).options && (
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {(q as MultipleChoiceQuestion).options.map((opt) => (
                        <div
                          key={opt.id}
                          className="px-2 py-1 rounded-lg bg-[#070e1f] border border-blue-900/60 text-[11px] text-slate-300"
                        >
                          <span className="font-bold uppercase text-indigo-400 mr-1.5">{opt.id}:</span>
                          <span>{opt.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
