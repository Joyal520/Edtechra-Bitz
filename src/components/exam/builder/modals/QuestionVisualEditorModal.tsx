// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: QUESTION VISUAL EDITOR MODAL
// Intuitive visual editor for all 15 question types.
// Teachers can edit prompts, options, answer keys, marks, and rubrics without JSON.
// ============================================================================

import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Check
} from 'lucide-react';
import {
  CanonicalQuestion,
  ClozeBlank
} from '../../shared/ExamSchema';

interface QuestionVisualEditorModalProps {
  isOpen: boolean;
  question: CanonicalQuestion | null;
  onClose: () => void;
  onSaveQuestion: (updatedQuestion: CanonicalQuestion) => void;
}

export const QuestionVisualEditorModal: React.FC<QuestionVisualEditorModalProps> = ({
  isOpen,
  question,
  onClose,
  onSaveQuestion
}) => {
  if (!isOpen || !question) return null;

  // Local editable draft copy
  const [draft, setDraft] = useState<any>(JSON.parse(JSON.stringify(question)));
  const [newWordBankTerm, setNewWordBankTerm] = useState('');

  const handlePromptChange = (val: string) => {
    setDraft((prev: any) => ({ ...prev, question: val }));
  };

  const handleMarksChange = (marks: number) => {
    setDraft((prev: any) => ({ ...prev, marks: Math.max(1, marks) }));
  };

  const handleExplanationChange = (exp: string) => {
    setDraft((prev: any) => ({ ...prev, explanation: exp }));
  };

  // Multiple Choice Handlers
  const handleOptionTextChange = (optIdx: number, text: string) => {
    setDraft((prev: any) => {
      const opts = [...(prev.options || [])];
      opts[optIdx] = { ...opts[optIdx], text };
      return { ...prev, options: opts };
    });
  };

  const handleAddOption = () => {
    setDraft((prev: any) => {
      const opts = [...(prev.options || [])];
      const nextId = String.fromCharCode(97 + opts.length); // a, b, c...
      opts.push({ id: nextId, text: `Option ${opts.length + 1}` });
      return { ...prev, options: opts };
    });
  };

  const handleRemoveOption = (optIdx: number) => {
    setDraft((prev: any) => {
      const opts = prev.options.filter((_: any, i: number) => i !== optIdx);
      return { ...prev, options: opts };
    });
  };

  const handleSetCorrectChoice = (optId: string) => {
    setDraft((prev: any) => ({
      ...prev,
      correctAnswer: [optId]
    }));
  };

  // Fill Blank Accepted Answers Handlers
  const handleAddAcceptedAnswer = () => {
    setDraft((prev: any) => {
      const answers = [...(prev.acceptedAnswers || [])];
      answers.push('');
      return { ...prev, acceptedAnswers: answers };
    });
  };

  const handleAcceptedAnswerChange = (idx: number, val: string) => {
    setDraft((prev: any) => {
      const answers = [...(prev.acceptedAnswers || [])];
      answers[idx] = val;
      return { ...prev, acceptedAnswers: answers };
    });
  };

  const handleRemoveAcceptedAnswer = (idx: number) => {
    setDraft((prev: any) => {
      const answers = prev.acceptedAnswers.filter((_: any, i: number) => i !== idx);
      return { ...prev, acceptedAnswers: answers };
    });
  };

  // Cloze Passage Handlers
  const handleClozeBlankChange = (bIdx: number, field: keyof ClozeBlank, val: any) => {
    setDraft((prev: any) => {
      const blanks = [...(prev.blanks || [])];
      blanks[bIdx] = { ...blanks[bIdx], [field]: val };
      return { ...prev, blanks };
    });
  };

  const handleAddClozeBlank = () => {
    setDraft((prev: any) => {
      const blanks = [...(prev.blanks || [])];
      const num = blanks.length + 1;
      blanks.push({
        id: `blank_${num}`,
        correctAnswer: '',
        acceptedAnswers: [],
        marks: 1
      });
      return { ...prev, blanks };
    });
  };

  const handleRemoveClozeBlank = (bIdx: number) => {
    setDraft((prev: any) => {
      const blanks = prev.blanks.filter((_: any, i: number) => i !== bIdx);
      return { ...prev, blanks };
    });
  };

  const handleAddWordBankTerm = () => {
    if (!newWordBankTerm.trim()) return;
    setDraft((prev: any) => {
      const bank = [...(prev.wordBank || [])];
      if (!bank.includes(newWordBankTerm.trim())) {
        bank.push(newWordBankTerm.trim());
      }
      return { ...prev, wordBank: bank };
    });
    setNewWordBankTerm('');
  };

  const handleRemoveWordBankTerm = (term: string) => {
    setDraft((prev: any) => ({
      ...prev,
      wordBank: (prev.wordBank || []).filter((w: string) => w !== term)
    }));
  };

  // Matching Pairs Handlers
  const handleMatchingPairChange = (pIdx: number, side: 'left' | 'right', val: string) => {
    setDraft((prev: any) => {
      const pairs = [...(prev.pairs || [])];
      pairs[pIdx] = { ...pairs[pIdx], [side]: val };
      return { ...prev, pairs };
    });
  };

  const handleAddMatchingPair = () => {
    setDraft((prev: any) => {
      const pairs = [...(prev.pairs || [])];
      pairs.push({ id: `pair_${pairs.length + 1}`, left: '', right: '' });
      return { ...prev, pairs };
    });
  };

  const handleRemoveMatchingPair = (pIdx: number) => {
    setDraft((prev: any) => {
      const pairs = prev.pairs.filter((_: any, i: number) => i !== pIdx);
      return { ...prev, pairs };
    });
  };

  // Reorder Handlers
  const handleReorderItemChange = (itIdx: number, text: string) => {
    setDraft((prev: any) => {
      const items = [...(prev.items || [])];
      items[itIdx] = { ...items[itIdx], text };
      return { ...prev, items };
    });
  };

  const handleMoveReorderItem = (fromIdx: number, toIdx: number) => {
    setDraft((prev: any) => {
      const items = [...(prev.items || [])];
      if (toIdx < 0 || toIdx >= items.length) return prev;
      const [moved] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, moved);
      return { ...prev, items };
    });
  };

  const handleSave = () => {
    onSaveQuestion(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-fadeIn overflow-y-auto select-none">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs font-black text-xs uppercase">
              {draft.type?.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Visual Question Editor
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-500 capitalize">
                  {draft.type?.replace(/_/g, ' ')}
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 mt-0.5">
                Edit Question Details
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 sm:p-7 overflow-y-auto custom-scrollbar flex-1 bg-white space-y-6">
          {/* Question Prompt */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Question Prompt / Instructions
            </label>
            <textarea
              rows={3}
              value={draft.question || ''}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder="Enter your question or task instructions here..."
              className="w-full p-3.5 rounded-2xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y"
            />
          </div>

          {/* 1. Multiple Choice Options */}
          {(draft.type === 'multiple_choice' || draft.type === 'multiple_select') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Answer Options (Select the correct one)
                </label>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Option</span>
                </button>
              </div>

              <div className="space-y-2">
                {(draft.options || []).map((opt: any, optIdx: number) => {
                  const isCorrect = Array.isArray(draft.correctAnswer)
                    ? draft.correctAnswer.includes(opt.id)
                    : draft.correctAnswer === opt.id;

                  return (
                    <div
                      key={opt.id || optIdx}
                      className={`p-2.5 rounded-2xl border flex items-center gap-3 transition-all ${
                        isCorrect
                          ? 'bg-indigo-50/70 border-indigo-300'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      {/* Correct answer toggle radio */}
                      <button
                        type="button"
                        onClick={() => handleSetCorrectChoice(opt.id)}
                        className={`w-5 h-5 rounded-full border flex items-center justify-center cursor-pointer transition-all ${
                          isCorrect
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 hover:border-indigo-400 bg-white'
                        }`}
                        title="Mark as correct answer"
                      >
                        {isCorrect && <Check className="w-3 h-3" />}
                      </button>

                      {/* Option text input */}
                      <input
                        type="text"
                        value={opt.text || ''}
                        onChange={(e) => handleOptionTextChange(optIdx, e.target.value)}
                        placeholder={`Option ${optIdx + 1}`}
                        className="flex-1 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-transparent focus:outline-hidden"
                      />

                      {/* Delete option button */}
                      {(draft.options || []).length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(optIdx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. True / False */}
          {draft.type === 'true_false' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Correct Answer
              </label>
              <div className="flex items-center gap-4">
                {[true, false].map((val) => {
                  const isSelected = draft.correctAnswer === val;
                  return (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => setDraft((prev: any) => ({ ...prev, correctAnswer: val }))}
                      className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {val ? 'TRUE' : 'FALSE'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Fill in the Blank */}
          {draft.type === 'fill_in_blank' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Accepted Answers (Synonyms & spellings)
                </label>
                <button
                  type="button"
                  onClick={handleAddAcceptedAnswer}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Synonym</span>
                </button>
              </div>

              <div className="space-y-2">
                {(draft.acceptedAnswers || []).map((ans: string, aIdx: number) => (
                  <div key={aIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ans}
                      onChange={(e) => handleAcceptedAnswerChange(aIdx, e.target.value)}
                      placeholder={`Accepted Answer ${aIdx + 1}`}
                      className="flex-1 px-4 py-2 text-xs font-semibold text-slate-900 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    {(draft.acceptedAnswers || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAcceptedAnswer(aIdx)}
                        className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Cloze Passage */}
          {draft.type === 'cloze_passage' && (
            <div className="space-y-5">
              {/* Passage text */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Passage with Numbered Blanks
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Use [blank_1], [blank_2] or [ 1 ], [ 2 ]
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={draft.passage || ''}
                  onChange={(e) => setDraft((prev: any) => ({ ...prev, passage: e.target.value }))}
                  placeholder="Plants need [blank_1] to make food. They also absorb [blank_2] from the soil..."
                  className="w-full p-4 rounded-2xl border border-slate-300 text-xs font-mono text-slate-900 leading-relaxed resize-y focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Blanks Configuration Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Blanks & Expected Answers
                  </label>
                  <button
                    type="button"
                    onClick={handleAddClozeBlank}
                    className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Blank</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {(draft.blanks || []).map((blank: ClozeBlank, bIdx: number) => (
                    <div
                      key={blank.id || bIdx}
                      className="p-3 rounded-2xl bg-teal-50/40 border border-teal-200 flex items-center gap-3"
                    >
                      <span className="w-8 text-center text-xs font-black text-teal-900">
                        #{bIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={blank.correctAnswer || ''}
                        onChange={(e) =>
                          handleClozeBlankChange(bIdx, 'correctAnswer', e.target.value)
                        }
                        placeholder="Correct word (e.g. sunlight)"
                        className="flex-1 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-teal-300 rounded-xl focus:outline-hidden"
                      />
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={blank.marks || 1}
                        onChange={(e) =>
                          handleClozeBlankChange(bIdx, 'marks', parseInt(e.target.value) || 1)
                        }
                        className="w-14 px-2 py-1.5 text-xs font-bold text-center bg-white border border-teal-300 rounded-xl"
                        title="Marks for this blank"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveClozeBlank(bIdx)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Word Bank Tags */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Word Bank (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newWordBankTerm}
                    onChange={(e) => setNewWordBankTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddWordBankTerm();
                      }
                    }}
                    placeholder="Type word & press Add..."
                    className="flex-1 px-3 py-1.5 text-xs text-slate-900 border border-slate-300 rounded-xl focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddWordBankTerm}
                    className="px-3 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {(draft.wordBank || []).map((term: string) => (
                    <span
                      key={term}
                      className="px-3 py-1 bg-teal-100/70 border border-teal-300 text-teal-900 rounded-full text-xs font-bold flex items-center gap-1.5"
                    >
                      <span>{term}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveWordBankTerm(term)}
                        className="text-teal-700 hover:text-rose-600 cursor-pointer"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. Short Answer / Essay Guidance */}
          {(draft.type === 'short_answer' || draft.type === 'essay' || draft.type === 'paragraph') && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Model Answer / Teacher Evaluation Guidance
                </label>
                <textarea
                  rows={4}
                  value={draft.sampleAnswer || draft.rubric || ''}
                  onChange={(e) =>
                    setDraft((prev: any) => ({
                      ...prev,
                      sampleAnswer: e.target.value,
                      rubric: e.target.value
                    }))
                  }
                  placeholder="Describe expected points, grammar criteria, or sample solution..."
                  className="w-full p-3.5 rounded-2xl border border-slate-300 text-xs text-slate-900 leading-relaxed resize-y focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {draft.type !== 'short_answer' && (
                <div className="flex items-center gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Target Word Count</label>
                    <input
                      type="number"
                      value={draft.maxWords || 100}
                      onChange={(e) =>
                        setDraft((prev: any) => ({
                          ...prev,
                          maxWords: parseInt(e.target.value) || 100
                        }))
                      }
                      className="w-24 px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. Matching Pairs */}
          {draft.type === 'matching' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Matching Pairs (Left Column $\leftrightarrow$ Right Column)
                </label>
                <button
                  type="button"
                  onClick={handleAddMatchingPair}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Pair</span>
                </button>
              </div>

              <div className="space-y-2">
                {(draft.pairs || []).map((pair: any, pIdx: number) => (
                  <div key={pair.id || pIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={pair.left || ''}
                      onChange={(e) => handleMatchingPairChange(pIdx, 'left', e.target.value)}
                      placeholder="Term / Concept"
                      className="flex-1 px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-300 rounded-xl focus:outline-hidden"
                    />
                    <span className="text-slate-400 font-bold">&rarr;</span>
                    <input
                      type="text"
                      value={pair.right || ''}
                      onChange={(e) => handleMatchingPairChange(pIdx, 'right', e.target.value)}
                      placeholder="Definition / Match"
                      className="flex-1 px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-300 rounded-xl focus:outline-hidden"
                    />
                    {(draft.pairs || []).length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMatchingPair(pIdx)}
                        className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. Reorder / Sequence */}
          {draft.type === 'reorder' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Sequence Items (In Correct Order)
              </label>
              <div className="space-y-2">
                {(draft.items || []).map((item: any, itIdx: number) => (
                  <div key={item.id || itIdx} className="flex items-center gap-2">
                    <span className="w-6 text-center text-xs font-black text-slate-500">
                      {itIdx + 1}.
                    </span>
                    <input
                      type="text"
                      value={item.text || ''}
                      onChange={(e) => handleReorderItemChange(itIdx, e.target.value)}
                      placeholder={`Step ${itIdx + 1}`}
                      className="flex-1 px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-300 rounded-xl focus:outline-hidden"
                    />
                    <button
                      type="button"
                      disabled={itIdx === 0}
                      onClick={() => handleMoveReorderItem(itIdx, itIdx - 1)}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={itIdx === (draft.items || []).length - 1}
                      onClick={() => handleMoveReorderItem(itIdx, itIdx + 1)}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Marks and Explanation Footer Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Allocated Marks
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={draft.marks || 1}
                onChange={(e) => handleMarksChange(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Educational Explanation
              </label>
              <input
                type="text"
                value={draft.explanation || ''}
                onChange={(e) => handleExplanationChange(e.target.value)}
                placeholder="Reason why this answer is correct..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold shadow-2xs cursor-pointer transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Question Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
