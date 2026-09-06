// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: CANVAS QUESTION CARD
// Interactive Google Forms-style editable card with inline editing, options, and actions
// ============================================================================

import React, { useState } from 'react';
import {
  GripVertical,
  Copy,
  Trash2,
  CheckCircle2,
  Plus,
  X,
  KeyRound,
  ArrowUp,
  ArrowDown,
  BookMarked
} from 'lucide-react';
import {
  AssessmentType,
  CanonicalQuestion,
  MultipleChoiceQuestion,
  QuestionOption
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
  theme,
  isSelected,
  onSelect,
  onUpdateQuestion,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onSaveToQuestionBank
}) => {
  const [showAnswerKeyMode, setShowAnswerKeyMode] = useState(false);
  const typeDef = getQuestionTypeDefinition(question.type);

  // Updates helper
  const handleFieldChange = (field: string, val: any) => {
    onUpdateQuestion({
      ...question,
      [field]: val
    } as CanonicalQuestion);
  };

  // Option actions for choice questions
  const options = (question as MultipleChoiceQuestion).options || [];

  const handleUpdateOptionText = (optId: string, newText: string) => {
    const updatedOptions = options.map(o => o.id === optId ? { ...o, text: newText } : o);
    onUpdateQuestion({
      ...question,
      options: updatedOptions
    } as CanonicalQuestion);
  };

  const handleAddOption = () => {
    const newId = String.fromCharCode(97 + options.length); // a, b, c, d...
    const newOpt: QuestionOption = { id: newId, text: `Option ${newId.toUpperCase()}` };
    onUpdateQuestion({
      ...question,
      options: [...options, newOpt]
    } as CanonicalQuestion);
  };

  const handleRemoveOption = (optId: string) => {
    if (options.length <= 1) return;
    const updatedOptions = options.filter(o => o.id !== optId);
    onUpdateQuestion({
      ...question,
      options: updatedOptions
    } as CanonicalQuestion);
  };

  const handleToggleCorrectOption = (optId: string) => {
    const currentCorrect = (question as MultipleChoiceQuestion).correctAnswer || [];
    let updatedCorrect: string[];

    if (question.type === 'multiple_choice') {
      updatedCorrect = [optId];
    } else {
      // Checkboxes / multi-select
      if (currentCorrect.includes(optId)) {
        updatedCorrect = currentCorrect.filter(id => id !== optId);
      } else {
        updatedCorrect = [...currentCorrect, optId];
      }
    }

    onUpdateQuestion({
      ...question,
      correctAnswer: updatedCorrect
    } as CanonicalQuestion);
  };

  return (
    <div
      onClick={onSelect}
      className={`rounded-3xl border transition-all cursor-pointer overflow-hidden shadow-lg group relative ${
        isSelected
          ? 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-indigo-600/20'
          : 'border-blue-900/60 hover:border-blue-700'
      }`}
      style={{
        backgroundColor: theme.cardBg
      }}
    >
      {/* Top Drag & Action Bar */}
      <div className="px-5 py-2.5 bg-[#091124] border-b border-blue-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-1 text-slate-500 hover:text-white cursor-grab"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <span className="w-6 h-6 rounded-lg bg-indigo-600/40 text-indigo-300 font-black text-xs flex items-center justify-center border border-indigo-500/30">
            {index + 1}
          </span>

          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${typeDef.badgeClass}`}>
            {typeDef.title}
          </span>
        </div>

        {/* Quick Question Toolbar */}
        <div className="flex items-center gap-1">
          {/* Reorder Buttons */}
          <button
            type="button"
            disabled={index === 0}
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
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
            className="p-1 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
            title="Move Down"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          {/* Duplicate */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1 text-slate-400 hover:text-indigo-300 cursor-pointer"
            title="Duplicate Question"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Save to Question Bank */}
          {onSaveToQuestionBank && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSaveToQuestionBank();
              }}
              className="p-1 text-slate-400 hover:text-emerald-400 cursor-pointer"
              title="Save to Question Bank"
            >
              <BookMarked className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer ml-1"
            title="Delete Question"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Question Card Body */}
      <div className="p-6 space-y-4">
        {/* Question Prompt (Inline Editable) */}
        <div>
          <textarea
            rows={2}
            value={question.question}
            onChange={(e) => handleFieldChange('question', e.target.value)}
            placeholder="Type your question or prompt here..."
            className="w-full text-sm sm:text-base font-bold text-white bg-transparent border-b border-transparent hover:border-blue-700/60 focus:border-indigo-400 focus:outline-hidden py-1 leading-relaxed resize-none transition-all placeholder:text-slate-500"
          />
        </div>

        {/* Answer Options Rendering (If Choice Type) */}
        {['multiple_choice', 'checkboxes', 'dropdown'].includes(question.type) && (
          <div className="space-y-2.5 pt-1">
            {options.map((opt) => {
              const isCorrect = Array.isArray((question as any).correctAnswer)
                ? (question as any).correctAnswer.includes(opt.id)
                : (question as any).correctAnswer === opt.id;

              return (
                <div
                  key={opt.id}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                    isCorrect
                      ? 'bg-emerald-950/40 border-emerald-500/60'
                      : 'bg-[#070e1f] border-blue-900/60'
                  }`}
                >
                  {/* Choice Radio / Checkbox Indicator (Click to toggle answer key) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleCorrectOption(opt.id);
                    }}
                    className={`w-5 h-5 rounded-${question.type === 'checkboxes' ? 'md' : 'full'} border flex items-center justify-center text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      isCorrect
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'border-slate-500 text-slate-400 hover:border-emerald-400'
                    }`}
                    title="Click to set as correct answer"
                  >
                    {isCorrect && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>

                  <span className="text-xs font-black uppercase text-slate-400">{opt.id}:</span>

                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => handleUpdateOptionText(opt.id, e.target.value)}
                    placeholder="Option text..."
                    className="flex-1 bg-transparent text-xs text-white font-medium border-0 focus:outline-hidden"
                  />

                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveOption(opt.id);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                      title="Remove option"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Add Option Trigger */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAddOption();
              }}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 py-1 px-2 rounded-xl hover:bg-blue-950/40 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Option</span>
            </button>
          </div>
        )}

        {/* Binary Choice Preview for True / False */}
        {question.type === 'true_false' && (
          <div className="grid grid-cols-2 gap-3 pt-1">
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
                  className={`p-3 rounded-2xl border text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    isCorrect
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30'
                      : 'bg-[#070e1f] border-blue-900/60 text-slate-300 hover:border-blue-700'
                  }`}
                >
                  {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{tfVal ? 'TRUE' : 'FALSE'}</span>
                  {isCorrect && <span className="text-[10px] text-emerald-400">(Answer Key)</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Text Input Preview for Short Answer / Essay */}
        {['short_answer', 'paragraph'].includes(question.type) && (
          <div className="p-3 rounded-2xl bg-[#070e1f] border border-blue-900/60 text-xs text-slate-400 italic">
            Student will provide written response here ({question.type === 'paragraph' ? 'long-form essay' : 'concise answer'}).
          </div>
        )}

        {/* Linear Scale Preview */}
        {question.type === 'linear_scale' && (
          <div className="p-4 rounded-2xl bg-[#070e1f] border border-blue-900/60 flex items-center justify-between text-xs text-slate-300">
            <span className="text-[11px] text-slate-400">1 (Min)</span>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((val) => (
                <span key={val} className="w-7 h-7 rounded-full border border-blue-800 flex items-center justify-center font-black text-xs text-slate-400">
                  {val}
                </span>
              ))}
            </div>
            <span className="text-[11px] text-slate-400">5 (Max)</span>
          </div>
        )}

        {/* Bottom Property Pills Bar */}
        <div className="pt-3 border-t border-blue-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Marks & Required */}
          <div className="flex items-center gap-4">
            {assessmentType === 'exam' && (
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-bold text-slate-400">Marks:</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={question.marks}
                  onChange={(e) => handleFieldChange('marks', Math.max(0, parseInt(e.target.value) || 1))}
                  className="w-12 px-2 py-0.5 bg-[#070e1f] border border-blue-900 rounded-lg text-center font-black text-emerald-400 text-xs focus:outline-hidden"
                />
              </div>
            )}

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={question.required !== false}
                onChange={(e) => handleFieldChange('required', e.target.checked)}
                className="w-3.5 h-3.5 accent-indigo-500 rounded"
              />
              <span className="text-[11px] font-bold text-slate-300">Required</span>
            </label>
          </div>

          {/* Right: Answer Key Quick Toggle for Exams */}
          {assessmentType === 'exam' && typeDef.supportsGrading && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAnswerKeyMode(prev => !prev);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  showAnswerKeyMode
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-[#070e1f] hover:bg-blue-950 text-emerald-400 border border-emerald-500/40'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Answer Key</span>
              </button>
            </div>
          )}
        </div>

        {/* Expanded Answer Key Drawer */}
        {showAnswerKeyMode && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 space-y-2 animate-fadeIn text-xs">
            <div className="font-black text-emerald-300">Explanation & Rubric Guidance:</div>
            <input
              type="text"
              value={question.explanation || ''}
              onChange={(e) => handleFieldChange('explanation', e.target.value)}
              placeholder="Add explanation or correct answer justification for students..."
              className="w-full px-3 py-1.5 bg-[#070e1f] border border-emerald-500/40 rounded-xl text-xs text-white focus:outline-hidden"
            />
          </div>
        )}
      </div>
    </div>
  );
};
