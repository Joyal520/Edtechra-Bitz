// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: QUESTION EDITOR MODAL / PANEL
// Dedicated editor supporting all 11 question types
// ============================================================================

import React, { useState } from 'react';
import {
  X,
  Check,
  Plus,
  Trash2,
  HelpCircle
} from 'lucide-react';
import {
  CanonicalQuestion,
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  FillInBlankQuestion,
  MatchingQuestion,
  ReorderQuestion,
  ShortAnswerQuestion,
  EssayQuestion,
  ReadingComprehensionQuestion,
  ImageQuestion,
  AudioQuestion,
  QuestionDifficulty
} from '../shared/ExamSchema';
import { getQuestionTypeMeta } from '../shared/QuestionTypes';

interface QuestionEditorProps {
  question: CanonicalQuestion;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedQuestion: CanonicalQuestion) => void;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  isOpen,
  onClose,
  onSave
}) => {
  const [edited, setEdited] = useState<CanonicalQuestion>({ ...question });

  if (!isOpen) return null;

  const meta = getQuestionTypeMeta(edited.type);

  const handleUpdate = (updates: Partial<CanonicalQuestion>) => {
    setEdited(prev => ({ ...prev, ...updates } as CanonicalQuestion));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(edited);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="bg-[#0b142c] border border-blue-800/80 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-[#0f1b3d] border-b border-blue-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center font-black text-xs ${meta.color.bg} ${meta.color.border} ${meta.color.text}`}>
              {meta.shortLabel}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Edit Question</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.color.badge}`}>
                  {meta.title}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">ID: {edited.id}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-blue-900/40 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1 text-white">
          {/* Question Prompt Text */}
          <div className="space-y-2">
            <label className="text-xs font-black text-indigo-200 uppercase tracking-wider">
              Question Text / Prompt <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={edited.question}
              onChange={(e) => handleUpdate({ question: e.target.value })}
              placeholder="Enter clear, concise question prompt..."
              className="w-full p-4 bg-[#091124] border border-blue-800/70 rounded-2xl text-sm font-semibold text-white placeholder:text-blue-300/40 focus:outline-hidden focus:border-indigo-400 leading-relaxed"
            />
          </div>

          {/* Marks and Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-indigo-200 uppercase tracking-wider">
                Assigned Marks
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={edited.marks || 1}
                onChange={(e) => handleUpdate({ marks: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-4 py-2.5 bg-[#091124] border border-blue-800/70 rounded-xl text-xs font-black text-white focus:outline-hidden focus:border-indigo-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-indigo-200 uppercase tracking-wider">
                Question Difficulty
              </label>
              <div className="flex gap-2">
                {(['easy', 'medium', 'hard'] as QuestionDifficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleUpdate({ difficulty: d })}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black capitalize transition-all cursor-pointer ${
                      edited.difficulty === d
                        ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400/40'
                        : 'bg-[#091124] text-slate-400 hover:text-white border border-blue-900/60'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* TYPE-SPECIFIC EDITORS */}
          {/* ============================================================ */}

          {/* 1 & 2: Multiple Choice & Multiple Select */}
          {(edited.type === 'multiple_choice' || edited.type === 'multiple_select') && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-indigo-200 uppercase tracking-wider">
                  Options & Correct Answer Selection
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const current = (edited as MultipleChoiceQuestion).options || [];
                    const nextLetter = String.fromCharCode(97 + current.length);
                    const updated = [...current, { id: nextLetter, text: '' }];
                    handleUpdate({ options: updated } as any);
                  }}
                  className="text-xs font-bold text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Option</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {((edited as MultipleChoiceQuestion).options || []).map((opt, optIdx) => {
                  const isCorrect = Array.isArray(edited.correctAnswer)
                    ? edited.correctAnswer.includes(opt.id) || edited.correctAnswer.includes(opt.text)
                    : edited.correctAnswer === opt.id || edited.correctAnswer === opt.text;

                  const toggleCorrect = () => {
                    if (edited.type === 'multiple_choice') {
                      handleUpdate({ correctAnswer: [opt.id] } as any);
                    } else {
                      // Multiple select
                      const current = Array.isArray(edited.correctAnswer) ? [...edited.correctAnswer] : [];
                      const next = current.includes(opt.id)
                        ? current.filter(id => id !== opt.id)
                        : [...current, opt.id];
                      handleUpdate({ correctAnswer: next } as any);
                    }
                  };

                  return (
                    <div
                      key={optIdx}
                      className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                        isCorrect
                          ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/40'
                          : 'bg-[#091124] border-blue-900/60'
                      }`}
                    >
                      {/* Check / Radio Selector */}
                      <button
                        type="button"
                        onClick={toggleCorrect}
                        className={`w-7 h-7 rounded-xl border flex items-center justify-center font-black text-xs cursor-pointer transition-all shrink-0 ${
                          isCorrect
                            ? 'bg-emerald-600 text-white border-emerald-400'
                            : 'bg-[#060c1c] text-slate-400 border-blue-800 hover:border-blue-600'
                        }`}
                        title={isCorrect ? 'Correct Answer' : 'Mark as Correct'}
                      >
                        {isCorrect ? <Check className="w-4 h-4" /> : opt.id.toUpperCase()}
                      </button>

                      {/* Option Text Input */}
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const current = [...(edited as MultipleChoiceQuestion).options];
                          current[optIdx] = { ...current[optIdx], text: e.target.value };
                          handleUpdate({ options: current } as any);
                        }}
                        placeholder={`Option ${opt.id.toUpperCase()} text...`}
                        className="flex-1 bg-transparent text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-hidden"
                      />

                      {/* Remove Option */}
                      {((edited as MultipleChoiceQuestion).options || []).length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const current = (edited as MultipleChoiceQuestion).options.filter((_, i) => i !== optIdx);
                            handleUpdate({ options: current } as any);
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3: True / False */}
          {edited.type === 'true_false' && (
            <div className="space-y-2 pt-2">
              <label className="text-xs font-black text-indigo-200 uppercase tracking-wider">
                Correct Answer (True or False)
              </label>
              <div className="grid grid-cols-2 gap-4">
                {[true, false].map((val) => {
                  const isSelected = (edited as TrueFalseQuestion).correctAnswer === val;
                  return (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => handleUpdate({ correctAnswer: val } as any)}
                      className={`py-4 rounded-2xl border text-sm font-black transition-all cursor-pointer ${
                        isSelected
                          ? val
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/40'
                            : 'bg-rose-600 text-white border-rose-400 shadow-md ring-2 ring-rose-400/40'
                          : 'bg-[#091124] text-slate-300 border-blue-900/60 hover:bg-[#121f44]'
                      }`}
                    >
                      {val ? 'TRUE' : 'FALSE'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4: Fill in the Blank */}
          {edited.type === 'fill_in_blank' && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-black text-indigo-200 uppercase tracking-wider">
                  Accepted Solutions (Comma-separated)
                </label>
                <input
                  type="text"
                  value={((edited as FillInBlankQuestion).acceptedAnswers || []).join(', ')}
                  onChange={(e) => {
                    const answers = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                    handleUpdate({ acceptedAnswers: answers } as any);
                  }}
                  placeholder="e.g., chloroplast, chloroplasts"
                  className="w-full px-4 py-2.5 bg-[#091124] border border-blue-800/70 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-indigo-400"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean((edited as FillInBlankQuestion).caseSensitive)}
                  onChange={(e) => handleUpdate({ caseSensitive: e.target.checked } as any)}
                  className="w-4 h-4 accent-indigo-600 rounded-sm"
                />
                <span className="text-xs font-bold text-slate-300">Case-sensitive answer evaluation</span>
              </label>
            </div>
          )}

          {/* 5: Matching */}
          {edited.type === 'matching' && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-indigo-200 uppercase tracking-wider">
                  Matching Pairs (Left Column &rarr; Right Column)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const current = (edited as MatchingQuestion).pairs || [];
                    const next = [...current, { id: `p${current.length + 1}`, left: '', right: '' }];
                    handleUpdate({ pairs: next } as any);
                  }}
                  className="text-xs font-bold text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Pair</span>
                </button>
              </div>

              <div className="space-y-2">
                {((edited as MatchingQuestion).pairs || []).map((pair, pIdx) => (
                  <div key={pIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={pair.left}
                      onChange={(e) => {
                        const current = [...(edited as MatchingQuestion).pairs];
                        current[pIdx] = { ...current[pIdx], left: e.target.value };
                        handleUpdate({ pairs: current } as any);
                      }}
                      placeholder="Left Item / Term..."
                      className="flex-1 px-3 py-2 bg-[#091124] border border-blue-800/70 rounded-xl text-xs font-semibold text-white focus:outline-hidden"
                    />
                    <span className="text-indigo-400 font-black text-sm">&rarr;</span>
                    <input
                      type="text"
                      value={pair.right}
                      onChange={(e) => {
                        const current = [...(edited as MatchingQuestion).pairs];
                        current[pIdx] = { ...current[pIdx], right: e.target.value };
                        handleUpdate({ pairs: current } as any);
                      }}
                      placeholder="Right Item / Definition..."
                      className="flex-1 px-3 py-2 bg-[#091124] border border-blue-800/70 rounded-xl text-xs font-semibold text-white focus:outline-hidden"
                    />
                    {((edited as MatchingQuestion).pairs || []).length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const current = (edited as MatchingQuestion).pairs.filter((_, i) => i !== pIdx);
                          handleUpdate({ pairs: current } as any);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6: Reorder */}
          {edited.type === 'reorder' && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-indigo-200 uppercase tracking-wider">
                  Reorder Items (Correct Chronological Sequence)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const current = (edited as ReorderQuestion).items || [];
                    const nextId = `step_${current.length + 1}`;
                    const nextItems = [...current, { id: nextId, text: '' }];
                    const nextOrder = [...((edited as ReorderQuestion).correctOrder || []), nextId];
                    handleUpdate({ items: nextItems, correctOrder: nextOrder } as any);
                  }}
                  className="text-xs font-bold text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Step</span>
                </button>
              </div>

              <div className="space-y-2">
                {((edited as ReorderQuestion).items || []).map((item, itIdx) => (
                  <div key={item.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-[#091124] border border-blue-800/70">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center shrink-0">
                      {itIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => {
                        const current = [...(edited as ReorderQuestion).items];
                        current[itIdx] = { ...current[itIdx], text: e.target.value };
                        handleUpdate({ items: current } as any);
                      }}
                      placeholder={`Step ${itIdx + 1} description...`}
                      className="flex-1 bg-transparent text-xs font-semibold text-white focus:outline-hidden"
                    />
                    {((edited as ReorderQuestion).items || []).length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const current = (edited as ReorderQuestion).items.filter((_, i) => i !== itIdx);
                          const nextOrder = current.map(c => c.id);
                          handleUpdate({ items: current, correctOrder: nextOrder } as any);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7: Short Answer */}
          {edited.type === 'short_answer' && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-black text-indigo-200 uppercase tracking-wider">
                  Teacher Grading Rubric / Criteria <span className="text-slate-400 font-normal lowercase">(for manual grading)</span>
                </label>
                <textarea
                  rows={2}
                  value={(edited as ShortAnswerQuestion).rubric || ''}
                  onChange={(e) => handleUpdate({ rubric: e.target.value } as any)}
                  placeholder="Points criteria for awarding 1 mark vs 2 marks..."
                  className="w-full p-3 bg-[#091124] border border-blue-800/70 rounded-xl text-xs font-medium text-white focus:outline-hidden"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-indigo-200 uppercase tracking-wider">
                  Sample Exemplar Answer
                </label>
                <textarea
                  rows={2}
                  value={(edited as ShortAnswerQuestion).sampleAnswer || ''}
                  onChange={(e) => handleUpdate({ sampleAnswer: e.target.value } as any)}
                  placeholder="Expected ideal student answer for teacher reference..."
                  className="w-full p-3 bg-[#091124] border border-blue-800/70 rounded-xl text-xs font-medium text-white focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* 8: Essay */}
          {edited.type === 'essay' && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-indigo-200 uppercase tracking-wider">
                    Minimum Word Count
                  </label>
                  <input
                    type="number"
                    min={20}
                    value={(edited as EssayQuestion).minWords || ''}
                    onChange={(e) => handleUpdate({ minWords: parseInt(e.target.value) || undefined } as any)}
                    placeholder="e.g., 150"
                    className="w-full px-3 py-2 bg-[#091124] border border-blue-800/70 rounded-xl text-xs font-semibold text-white focus:outline-hidden"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-indigo-200 uppercase tracking-wider">
                    Maximum Word Count
                  </label>
                  <input
                    type="number"
                    min={50}
                    value={(edited as EssayQuestion).maxWords || ''}
                    onChange={(e) => handleUpdate({ maxWords: parseInt(e.target.value) || undefined } as any)}
                    placeholder="e.g., 300"
                    className="w-full px-3 py-2 bg-[#091124] border border-blue-800/70 rounded-xl text-xs font-semibold text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-indigo-200 uppercase tracking-wider">
                  Teacher Evaluation Rubric
                </label>
                <textarea
                  rows={3}
                  value={(edited as EssayQuestion).rubric || ''}
                  onChange={(e) => handleUpdate({ rubric: e.target.value } as any)}
                  placeholder="e.g., Content (2 marks), Vocabulary & Grammar (2 marks), Coherence (1 mark)..."
                  className="w-full p-3 bg-[#091124] border border-blue-800/70 rounded-xl text-xs font-medium text-white focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* 9: Reading Comprehension */}
          {edited.type === 'reading_comprehension' && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-black text-indigo-200 uppercase tracking-wider">
                  Passage Title
                </label>
                <input
                  type="text"
                  value={(edited as ReadingComprehensionQuestion).passageTitle || ''}
                  onChange={(e) => handleUpdate({ passageTitle: e.target.value } as any)}
                  placeholder="e.g., The Future of Clean Energy"
                  className="w-full px-3 py-2 bg-[#091124] border border-blue-800/70 rounded-xl text-xs font-semibold text-white focus:outline-hidden"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-indigo-200 uppercase tracking-wider">
                  Reading Passage Text <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={6}
                  value={(edited as ReadingComprehensionQuestion).passage || ''}
                  onChange={(e) => handleUpdate({ passage: e.target.value } as any)}
                  placeholder="Enter or paste reading passage here..."
                  className="w-full p-3 bg-[#091124] border border-blue-800/70 rounded-xl text-xs font-medium text-white leading-relaxed focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* 10 & 11: Image / Audio */}
          {(edited.type === 'image_question' || edited.type === 'audio_question') && (
            <div className="space-y-3 pt-2">
              <label className="text-xs font-black text-indigo-200 uppercase tracking-wider">
                {edited.type === 'image_question' ? 'Image Media URL' : 'Audio Track URL'}
              </label>
              <input
                type="text"
                value={
                  edited.type === 'image_question'
                    ? (edited as ImageQuestion).imageUrl || ''
                    : (edited as AudioQuestion).audioUrl || ''
                }
                onChange={(e) => {
                  if (edited.type === 'image_question') {
                    handleUpdate({ imageUrl: e.target.value } as any);
                  } else {
                    handleUpdate({ audioUrl: e.target.value } as any);
                  }
                }}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-[#091124] border border-blue-800/70 rounded-xl text-xs font-semibold text-white focus:outline-hidden"
              />
            </div>
          )}

          {/* Educational Explanation */}
          <div className="space-y-2 pt-2 border-t border-blue-900/60">
            <label className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              Solution Explanation / Feedback Note
            </label>
            <textarea
              rows={2}
              value={edited.explanation || ''}
              onChange={(e) => handleUpdate({ explanation: e.target.value })}
              placeholder="Explain why the correct answer is right for post-exam student review..."
              className="w-full p-3 bg-[#091124] border border-blue-800/70 rounded-xl text-xs font-medium text-white focus:outline-hidden"
            />
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-blue-900/80">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-blue-800/70 text-slate-300 hover:text-white hover:bg-blue-900/40 text-xs font-black cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
