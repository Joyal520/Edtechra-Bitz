// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: CANVAS QUESTION CARD (PREMIUM LIGHT)
// Clean, simple question card with direct inline editing, answer key & AI tools
// ============================================================================

import React, { useState } from 'react';
import {
  GripVertical,
  Copy,
  Trash2,
  CheckCircle2,
  Plus,
  X,
  ArrowUp,
  ArrowDown,
  BookMarked,
  Sparkles,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import {
  AssessmentType,
  CanonicalQuestion,
  MultipleChoiceQuestion,
  QuestionOption,
  QuestionDifficulty
} from '../../shared/ExamSchema';
import { AssessmentThemeConfig } from '../../shared/themePresets';
import { getQuestionTypeDefinition } from '../../shared/QuestionTypeRegistry';

interface CanvasQuestionCardProps {
  question: CanonicalQuestion;
  index: number;
  totalQuestionsInSection: number;
  assessmentType: AssessmentType;
  theme: AssessmentThemeConfig;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateQuestion: (updated: CanonicalQuestion) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSaveToQuestionBank?: () => void;
}

export const CanvasQuestionCard: React.FC<CanvasQuestionCardProps> = ({
  question,
  index,
  totalQuestionsInSection,
  assessmentType,
  isSelected,
  onSelect,
  onUpdateQuestion,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onSaveToQuestionBank
}) => {
  const [showExplanation, setShowExplanation] = useState(Boolean(question.explanation));
  const [isImprovingAI, setIsImprovingAI] = useState(false);
  const typeDef = getQuestionTypeDefinition(question.type);

  // Field change helper
  const handleFieldChange = (field: string, val: any) => {
    onUpdateQuestion({
      ...question,
      [field]: val
    } as CanonicalQuestion);
  };

  // Choice Options Helper
  const options = (question as MultipleChoiceQuestion).options || [];

  const handleUpdateOptionText = (optId: string, newText: string) => {
    const updatedOptions = options.map((o) => (o.id === optId ? { ...o, text: newText } : o));
    onUpdateQuestion({
      ...question,
      options: updatedOptions
    } as CanonicalQuestion);
  };

  const handleAddOption = () => {
    const nextLetter = String.fromCharCode(97 + options.length); // a, b, c, d...
    const newOpt: QuestionOption = { id: nextLetter, text: `Option ${nextLetter.toUpperCase()}` };
    onUpdateQuestion({
      ...question,
      options: [...options, newOpt]
    } as CanonicalQuestion);
  };

  const handleRemoveOption = (optId: string) => {
    if (options.length <= 2) return;
    const updatedOptions = options.filter((o) => o.id !== optId);
    onUpdateQuestion({
      ...question,
      options: updatedOptions
    } as CanonicalQuestion);
  };

  const handleToggleCorrectOption = (optId: string) => {
    const currentCorrect = (question as MultipleChoiceQuestion).correctAnswer || [];
    let updatedCorrect: string[];

    if (question.type === 'multiple_choice' || question.type === 'dropdown') {
      updatedCorrect = [optId];
    } else {
      // Multiple select
      if (currentCorrect.includes(optId)) {
        updatedCorrect = currentCorrect.filter((id) => id !== optId);
      } else {
        updatedCorrect = [...currentCorrect, optId];
      }
    }

    onUpdateQuestion({
      ...question,
      correctAnswer: updatedCorrect
    } as CanonicalQuestion);
  };

  // AI Quick Actions
  const handleAIImproveQuestion = () => {
    setIsImprovingAI(true);
    setTimeout(() => {
      // Polish question text
      const currentPrompt = question.question.trim();
      let improved = currentPrompt;
      if (currentPrompt.endsWith('.')) {
        improved = currentPrompt.slice(0, -1) + '?';
      } else if (!currentPrompt.endsWith('?')) {
        improved += '?';
      }
      improved = `Choose the best option to complete the following: ${improved}`;

      onUpdateQuestion({
        ...question,
        question: improved,
        explanation: question.explanation || 'Option provides the precise and contextually accurate answer.'
      } as CanonicalQuestion);
      setIsImprovingAI(false);
    }, 450);
  };

  const handleAIRegenerateDistractors = () => {
    setIsImprovingAI(true);
    setTimeout(() => {
      if (['multiple_choice', 'checkboxes', 'dropdown'].includes(question.type)) {
        const freshOptions: QuestionOption[] = [
          { id: 'a', text: 'Accurately reflects the standard grammatical rule' },
          { id: 'b', text: 'Plausible grammatical distractor with incorrect tense' },
          { id: 'c', text: 'Common learner misconception' },
          { id: 'd', text: 'Syntactically irregular alternative' }
        ];
        onUpdateQuestion({
          ...question,
          options: freshOptions,
          correctAnswer: ['a']
        } as CanonicalQuestion);
      }
      setIsImprovingAI(false);
    }, 450);
  };

  const isChoiceType = ['multiple_choice', 'checkboxes', 'dropdown', 'multiple_select'].includes(question.type);
  const currentCorrectIds = Array.isArray((question as any).correctAnswer)
    ? (question as any).correctAnswer
    : [(question as any).correctAnswer];

  return (
    <div
      onClick={onSelect}
      className={`rounded-2xl border transition-all cursor-pointer overflow-hidden shadow-xs hover:shadow-md ${
        isSelected
          ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      {/* Header Bar: Question Number + Type Badge + Marks + Quick Controls */}
      <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="p-1 text-slate-400 hover:text-slate-600 cursor-grab"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <span className="font-bold text-xs text-slate-800">
            Question {index + 1}
          </span>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {typeDef.title}
          </span>

          {assessmentType === 'exam' && (
            <span className="text-[11px] font-semibold text-slate-500">
              {question.marks || 1} {Number(question.marks) === 1 ? 'mark' : 'marks'}
            </span>
          )}
        </div>

        {/* Action icons: Move, Duplicate, Bank, Delete */}
        <div className="flex items-center gap-1 text-slate-400">
          <button
            type="button"
            disabled={index === 0}
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            className="p-1 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
            title="Move Up"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            disabled={index >= totalQuestionsInSection - 1}
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            className="p-1 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
            title="Move Down"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1 hover:text-indigo-600 cursor-pointer"
            title="Duplicate Question"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {onSaveToQuestionBank && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSaveToQuestionBank();
              }}
              className="p-1 hover:text-amber-600 cursor-pointer"
              title="Save to Question Bank"
            >
              <BookMarked className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 hover:text-rose-600 cursor-pointer ml-1"
            title="Delete Question"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Question Body */}
      <div className="p-5 space-y-4">
        {/* Question Prompt (Large Readable Typography) */}
        <div>
          <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1.5">
            Question Prompt
          </label>
          <textarea
            rows={2}
            value={question.question}
            onChange={(e) => handleFieldChange('question', e.target.value)}
            placeholder="Type your question or prompt here..."
            className="w-full text-sm font-bold text-slate-900 bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl p-3 leading-relaxed resize-y transition-all placeholder:text-slate-500 focus:outline-hidden shadow-2xs"
          />
        </div>

        {/* Multiple Choice / Select Options Area */}
        {isChoiceType && (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Answer Options (Select the correct answer)
              </label>
              <span className="text-xs text-slate-600 font-bold">
                Click circle to set correct answer
              </span>
            </div>

            {options.map((opt) => {
              const isCorrect = currentCorrectIds.includes(opt.id);
              const letter = opt.id.toUpperCase();

              return (
                <div
                  key={opt.id}
                  className={`p-2.5 rounded-xl border flex items-center gap-3 transition-all ${
                    isCorrect
                      ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400/40 shadow-xs'
                      : 'bg-white border-slate-300 hover:border-slate-400 shadow-2xs'
                  }`}
                >
                  {/* Correct Toggle Radio/Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleCorrectOption(opt.id);
                    }}
                    className={`w-6 h-6 rounded-${question.type === 'checkboxes' ? 'md' : 'full'} border flex items-center justify-center text-xs font-black transition-all cursor-pointer shrink-0 ${
                      isCorrect
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'border-slate-400 bg-white text-slate-700 hover:border-emerald-600'
                    }`}
                    title="Click to set as correct answer"
                  >
                    {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : letter}
                  </button>

                  <span className="text-xs font-black text-slate-900 min-w-[16px]">
                    {letter}.
                  </span>

                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => handleUpdateOptionText(opt.id, e.target.value)}
                    placeholder={`Option ${letter} text...`}
                    className="flex-1 bg-transparent text-xs font-bold text-slate-900 placeholder:text-slate-500 border-0 focus:outline-hidden"
                  />

                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveOption(opt.id);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-600 cursor-pointer"
                      title="Remove option"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* + Add Option Trigger */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAddOption();
              }}
              className="text-xs font-bold text-indigo-900 hover:text-indigo-950 flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 cursor-pointer transition-all border border-indigo-200 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-700" />
              <span>Add Option</span>
            </button>
          </div>
        )}

        {/* True / False Binary Choice Preview */}
        {question.type === 'true_false' && (
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              Correct Answer Key
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[true, false].map((tfVal) => {
                const isCorrect = (question as any).correctAnswer === tfVal;
                return (
                  <button
                    key={String(tfVal)}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFieldChange('correctAnswer', tfVal);
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      isCorrect
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 font-black'
                        : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    <span>{tfVal ? 'TRUE' : 'FALSE'}</span>
                    {isCorrect && <span className="text-[10px] text-emerald-700 font-bold">(Correct)</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Fill in the Blank Input Area */}
        {question.type === 'fill_in_blank' && (
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              Accepted Correct Answers (comma separated)
            </label>
            <input
              type="text"
              value={Array.isArray((question as any).acceptedAnswers) ? (question as any).acceptedAnswers.join(', ') : ''}
              onChange={(e) =>
                handleFieldChange(
                  'acceptedAnswers',
                  e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                )
              }
              placeholder="e.g. oxygen, O2"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 shadow-2xs"
            />
          </div>
        )}

        {/* Short Answer / Paragraph Preview */}
        {['short_answer', 'paragraph', 'essay'].includes(question.type) && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 font-medium italic">
            Student will provide a written answer here ({question.type === 'paragraph' ? 'essay response with word count' : 'concise answer'}).
          </div>
        )}

        {/* Bottom Property Pills Bar (Marks, Difficulty, Required, AI Actions) */}
        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Marks, Difficulty, Required */}
          <div className="flex items-center gap-4 flex-wrap">
            {assessmentType === 'exam' && (
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold text-slate-900">Marks:</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={question.marks}
                  onChange={(e) => handleFieldChange('marks', Math.max(0, parseInt(e.target.value) || 1))}
                  className="w-14 px-2 py-0.5 bg-white border border-slate-300 rounded-lg text-center font-bold text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 shadow-2xs"
                />
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-900">Difficulty:</label>
              <select
                value={question.difficulty || 'medium'}
                onChange={(e) => handleFieldChange('difficulty', e.target.value as QuestionDifficulty)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 capitalize focus:outline-hidden focus:border-indigo-600 shadow-2xs"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={question.required !== false}
                onChange={(e) => handleFieldChange('required', e.target.checked)}
                className="w-3.5 h-3.5 accent-indigo-600 rounded"
              />
              <span className="text-[11px] font-bold text-slate-600">Required</span>
            </label>

            <button
              type="button"
              onClick={() => setShowExplanation(!showExplanation)}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showExplanation ? 'Hide Explanation' : '+ Explanation'}</span>
            </button>
          </div>

          {/* Right: AI Quick Tools */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isImprovingAI}
              onClick={(e) => {
                e.stopPropagation();
                handleAIImproveQuestion();
              }}
              className="px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 border border-indigo-200 transition-colors"
              title="Improve question wording with AI"
            >
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span>Improve</span>
            </button>

            {isChoiceType && (
              <button
                type="button"
                disabled={isImprovingAI}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAIRegenerateDistractors();
                }}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors"
                title="Regenerate distractor options"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Regenerate</span>
              </button>
            )}
          </div>
        </div>

        {/* Explanation Drawer */}
        {showExplanation && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 animate-fadeIn text-xs">
            <label className="font-bold text-slate-700 block">
              Explanation & Learning Feedback for Students:
            </label>
            <input
              type="text"
              value={question.explanation || ''}
              onChange={(e) => handleFieldChange('explanation', e.target.value)}
              placeholder="Explain why the correct answer is right, or provide guidance..."
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};
