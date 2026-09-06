// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: EXAM PREVIEW (STEP 7)
// Comprehensive teacher preview with per-question editing, reordering, duplicate, delete
// ============================================================================

import React, { useState } from 'react';
import {
  Edit3,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  Eye,
  CheckCircle2,
  Layers,
  Send
} from 'lucide-react';
import {
  CanonicalExamV1,
  CanonicalQuestion,
  MultipleChoiceQuestion
} from '../shared/ExamSchema';
import { getQuestionTypeMeta } from '../shared/QuestionTypes';
import {
  calculateExamTotalMarks,
  calculateQuestionMarks,
  calculateTotalQuestionCount
} from '../shared/scoringUtilities';
import { QuestionEditor } from './QuestionEditor';

interface ExamPreviewProps {
  exam: CanonicalExamV1;
  onUpdateExam: (updated: CanonicalExamV1) => void;
  onPreviewAsStudent: () => void;
  onProceedToPublish: () => void;
}

export const ExamPreview: React.FC<ExamPreviewProps> = ({
  exam,
  onUpdateExam,
  onPreviewAsStudent,
  onProceedToPublish
}) => {
  const [editingQuestion, setEditingQuestion] = useState<{
    question: CanonicalQuestion;
    sectionIdx: number;
    questionIdx: number;
  } | null>(null);

  const totalMarks = calculateExamTotalMarks(exam.sections);
  const totalQuestions = calculateTotalQuestionCount(exam.sections);

  // Per-question CRUD operations
  const handleSaveQuestion = (updatedQ: CanonicalQuestion) => {
    if (!editingQuestion) return;
    const { sectionIdx, questionIdx } = editingQuestion;

    const newSections = [...exam.sections];
    const newQuestions = [...newSections[sectionIdx].questions];
    newQuestions[questionIdx] = updatedQ;
    newSections[sectionIdx] = { ...newSections[sectionIdx], questions: newQuestions };

    onUpdateExam({ ...exam, sections: newSections });
  };

  const handleDuplicateQuestion = (secIdx: number, qIdx: number) => {
    const newSections = [...exam.sections];
    const qToDup = newSections[secIdx].questions[qIdx];
    const duplicated: CanonicalQuestion = {
      ...qToDup,
      id: `${qToDup.id}_copy_${Date.now().toString(36).slice(-4)}`,
      question: `${qToDup.question} (Copy)`
    };

    const newQuestions = [...newSections[secIdx].questions];
    newQuestions.splice(qIdx + 1, 0, duplicated);
    newSections[secIdx] = { ...newSections[secIdx], questions: newQuestions };

    onUpdateExam({ ...exam, sections: newSections });
  };

  const handleDeleteQuestion = (secIdx: number, qIdx: number) => {
    const newSections = [...exam.sections];
    const newQuestions = newSections[secIdx].questions.filter((_, i) => i !== qIdx);
    newSections[secIdx] = { ...newSections[secIdx], questions: newQuestions };
    onUpdateExam({ ...exam, sections: newSections });
  };

  const handleMoveQuestion = (secIdx: number, qIdx: number, direction: 'up' | 'down') => {
    const newSections = [...exam.sections];
    const newQuestions = [...newSections[secIdx].questions];
    const targetIdx = direction === 'up' ? qIdx - 1 : qIdx + 1;

    if (targetIdx < 0 || targetIdx >= newQuestions.length) return;

    const temp = newQuestions[qIdx];
    newQuestions[qIdx] = newQuestions[targetIdx];
    newQuestions[targetIdx] = temp;

    newSections[secIdx] = { ...newSections[secIdx], questions: newQuestions };
    onUpdateExam({ ...exam, sections: newSections });
  };

  const handleAddQuestion = (secIdx: number) => {
    const newSections = [...exam.sections];
    const newQ: MultipleChoiceQuestion = {
      id: `q_${Date.now().toString(36).slice(-4)}`,
      type: 'multiple_choice',
      question: 'New Question Prompt',
      options: [
        { id: 'a', text: 'Option A' },
        { id: 'b', text: 'Option B' },
        { id: 'c', text: 'Option C' },
        { id: 'd', text: 'Option D' }
      ],
      correctAnswer: ['a'],
      difficulty: 'medium',
      marks: 1,
      explanation: 'Explanation for correct option.'
    };

    newSections[secIdx] = {
      ...newSections[secIdx],
      questions: [...newSections[secIdx].questions, newQ]
    };
    onUpdateExam({ ...exam, sections: newSections });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner: Exam Stats Overview */}
      <div className="bg-[#0f1b3d] p-6 sm:p-7 rounded-3xl border border-blue-800/80 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-black">
                {exam.exam.examType || 'Exam'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-black">
                {exam.exam.subject}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-black">
                {exam.exam.grade}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black">
                {exam.exam.difficulty}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">{exam.exam.title}</h2>
            {exam.exam.description && (
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">{exam.exam.description}</p>
            )}
          </div>

          {/* Action Header Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onPreviewAsStudent}
              className="px-5 py-3 rounded-2xl bg-[#091124] hover:bg-blue-900/60 border border-blue-700/60 text-indigo-300 hover:text-white text-xs font-black flex items-center gap-2 cursor-pointer transition-all shadow-xs"
            >
              <Eye className="w-4 h-4 text-indigo-400" />
              <span>Preview as Student</span>
            </button>

            <button
              type="button"
              onClick={onProceedToPublish}
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/30 active:scale-95 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Publish Exam</span>
            </button>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-blue-900/60">
          <div className="p-3 rounded-2xl bg-[#091124] border border-blue-900/70">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Duration</div>
            <div className="text-lg font-black text-white mt-0.5">{exam.exam.durationMinutes} Mins</div>
          </div>

          <div className="p-3 rounded-2xl bg-[#091124] border border-blue-900/70">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Questions</div>
            <div className="text-lg font-black text-white mt-0.5">{totalQuestions} Questions</div>
          </div>

          <div className="p-3 rounded-2xl bg-[#091124] border border-blue-900/70">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Marks</div>
            <div className="text-lg font-black text-emerald-400 mt-0.5">{totalMarks} Marks</div>
          </div>

          <div className="p-3 rounded-2xl bg-[#091124] border border-blue-900/70">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pass Mark</div>
            <div className="text-lg font-black text-indigo-300 mt-0.5">
              {Math.ceil((totalMarks * (exam.exam.passPercentage || 40)) / 100)} Marks ({exam.exam.passPercentage}%)
            </div>
          </div>
        </div>
      </div>

      {/* Sections and Questions List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-indigo-200 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Exam Structure & Questions ({exam.sections.length} Sections)
          </h3>
          <span className="text-xs text-slate-400">Click "Edit" on any question to modify text, options, or keys</span>
        </div>

        {exam.sections.map((sec, secIdx) => (
          <div
            key={sec.id || secIdx}
            className="bg-[#0b142c] rounded-3xl border border-blue-800/60 p-5 sm:p-6 space-y-4 shadow-sm"
          >
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-900/60 pb-3.5">
              <div>
                <h4 className="text-base font-black text-white">{sec.title || `Section ${secIdx + 1}`}</h4>
                {sec.description && <p className="text-xs text-slate-400">{sec.description}</p>}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-indigo-300 px-2.5 py-1 rounded-xl bg-indigo-950/60 border border-indigo-700/50">
                  {sec.questions.length} Questions •{' '}
                  {sec.questions.reduce((a, b) => a + calculateQuestionMarks(b), 0)} Marks
                </span>

                <button
                  type="button"
                  onClick={() => handleAddQuestion(secIdx)}
                  className="px-3 py-1 bg-blue-900/60 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Question</span>
                </button>
              </div>
            </div>

            {/* Reading Passage if Present */}
            {sec.passage && (
              <div className="p-4 bg-[#091124] border border-amber-500/40 rounded-2xl space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">Reading Passage:</span>
                <p className="text-xs text-blue-100 leading-relaxed font-serif whitespace-pre-wrap">{sec.passage}</p>
              </div>
            )}

            {/* Questions in Section */}
            <div className="space-y-3">
              {sec.questions.map((q, qIdx) => {
                const meta = getQuestionTypeMeta(q.type);

                return (
                  <div
                    key={q.id || qIdx}
                    className="p-4 sm:p-5 rounded-2xl bg-[#0f1b3d] border border-blue-900/70 hover:border-blue-700/70 transition-all space-y-3"
                  >
                    {/* Top Row: Q Number, Type Badge, Marks, Actions */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                          {qIdx + 1}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${meta.color.badge}`}>
                          {meta.title}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">ID: {q.id}</span>
                      </div>

                      {/* Action Controls */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/40 mr-2">
                          {calculateQuestionMarks(q)} Mark{calculateQuestionMarks(q) > 1 ? 's' : ''}
                        </span>

                        {/* Move Up */}
                        <button
                          type="button"
                          disabled={qIdx === 0}
                          onClick={() => handleMoveQuestion(secIdx, qIdx, 'up')}
                          className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          disabled={qIdx === sec.questions.length - 1}
                          onClick={() => handleMoveQuestion(secIdx, qIdx, 'down')}
                          className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Duplicate */}
                        <button
                          type="button"
                          onClick={() => handleDuplicateQuestion(secIdx, qIdx)}
                          className="p-1.5 text-slate-400 hover:text-indigo-300 cursor-pointer"
                          title="Duplicate Question"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => setEditingQuestion({ question: q, sectionIdx: secIdx, questionIdx: qIdx })}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ml-1 shadow-xs"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(secIdx, qIdx)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer ml-1"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question Content Prompt */}
                    <div className="text-sm font-semibold text-white leading-relaxed">{q.question}</div>

                    {/* Quick Preview of Options / Keys */}
                    {q.type === 'multiple_choice' && (q as MultipleChoiceQuestion).options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {(q as MultipleChoiceQuestion).options.map((opt) => {
                          const isCorrect = Array.isArray(q.correctAnswer)
                            ? q.correctAnswer.includes(opt.id) || q.correctAnswer.includes(opt.text)
                            : q.correctAnswer === opt.id || q.correctAnswer === opt.text;
                          return (
                            <div
                              key={opt.id}
                              className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                                isCorrect
                                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                                  : 'bg-[#091124] border-blue-900/60 text-slate-300'
                              }`}
                            >
                              <span className="font-black uppercase">{opt.id}:</span>
                              <span className="flex-1">{opt.text}</span>
                              {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Explanation */}
                    {q.explanation && (
                      <p className="text-[11px] text-slate-400 font-medium pt-1 italic">
                        <strong>Explanation:</strong> {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#091124] border border-blue-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-300 font-medium">
          Ready to release? You can test as a student first or publish directly to classroom students.
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPreviewAsStudent}
            className="px-5 py-2.5 rounded-xl bg-blue-900/60 hover:bg-blue-800 text-indigo-200 hover:text-white border border-blue-700/60 text-xs font-black flex items-center gap-2 cursor-pointer transition-all"
          >
            <Eye className="w-4 h-4 text-indigo-400" />
            <span>Preview as Student</span>
          </button>

          <button
            type="button"
            onClick={onProceedToPublish}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/30 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Publish Exam</span>
          </button>
        </div>
      </div>

      {/* Active Modal Editor */}
      {editingQuestion && (
        <QuestionEditor
          question={editingQuestion.question}
          isOpen={true}
          onClose={() => setEditingQuestion(null)}
          onSave={handleSaveQuestion}
        />
      )}
    </div>
  );
};
