import React, { useState, useEffect } from 'react';
import {
  X,
  Award,
  Clock,
  Plus,
  Trash2
} from 'lucide-react';
import { ClassroomExam, ClassroomExamQuestion, ClassroomExamResult } from '@/types/classroom';
import { classroomExamService } from '@/services/classroomExamService';

interface ClassroomExamModalProps {
  isOpen: boolean;
  classroomId: string;
  isTeacher: boolean;
  activeExam?: ClassroomExam | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClassroomExamModal: React.FC<ClassroomExamModalProps> = ({
  isOpen,
  classroomId,
  isTeacher,
  activeExam,
  onClose,
  onSuccess
}) => {
  // Teacher Creation State
  const [examTitle, setExamTitle] = useState('');
  const [examDesc, setExamDesc] = useState('');
  const [durationMin, setDurationMin] = useState(15);
  const [questions, setQuestions] = useState<ClassroomExamQuestion[]>([
    {
      id: 'q1',
      question: '',
      options: [
        { id: 'opt1', text: '' },
        { id: 'opt2', text: '' },
        { id: 'opt3', text: '' },
        { id: 'opt4', text: '' }
      ],
      correct_option_id: 'opt1',
      marks: 10
    }
  ]);

  // Student Taking Exam State
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);
  const [examResult, setExamResult] = useState<ClassroomExamResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeExam && !isTeacher) {
      const duration = (activeExam.duration_minutes || 15) * 60;
      setTimeLeftSeconds(duration);
      setSelectedAnswers({});
      setExamResult(activeExam.latest_result || null);
    }
  }, [activeExam, isTeacher]);

  // Countdown timer for student taking exam
  useEffect(() => {
    if (!isOpen || isTeacher || !activeExam || examResult || timeLeftSeconds <= 0) return;

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleStudentSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isTeacher, activeExam, examResult, timeLeftSeconds]);

  if (!isOpen) return null;

  // Teacher handlers
  const handleAddQuestion = () => {
    const nextId = `q${questions.length + 1}`;
    setQuestions((prev) => [
      ...prev,
      {
        id: nextId,
        question: '',
        options: [
          { id: `${nextId}_opt1`, text: '' },
          { id: `${nextId}_opt2`, text: '' },
          { id: `${nextId}_opt3`, text: '' },
          { id: `${nextId}_opt4`, text: '' }
        ],
        correct_option_id: `${nextId}_opt1`,
        marks: 10
      }
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTeacherCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim()) return;

    const validQuestions = questions.every(
      (q) => q.question.trim() && q.options.every((opt) => opt.text.trim())
    );
    if (!validQuestions) {
      alert('Please fill in all question text and option fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await classroomExamService.createExam({
        classroom_id: classroomId,
        title: examTitle.trim(),
        description: examDesc.trim(),
        duration_minutes: durationMin,
        questions
      });

      if (res.error) throw new Error(res.error);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to create exam');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Student handlers
  const handleStudentSubmit = async () => {
    if (!activeExam) return;
    setIsSubmitting(true);
    try {
      const res = await classroomExamService.submitExam({
        exam_id: activeExam.id,
        classroom_id: classroomId,
        answers: selectedAnswers
      });

      if (res.error || !res.data) throw new Error(res.error || 'Submission failed');
      setExamResult(res.data);
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Failed to submit exam');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {isTeacher
                  ? 'Create Timed Classroom Exam'
                  : activeExam?.title || 'Classroom Exam'}
              </h2>
              {!isTeacher && activeExam && (
                <p className="text-xs text-slate-500 font-semibold">
                  {activeExam.questions.length} questions • {activeExam.total_marks} marks total
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isTeacher && !examResult && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-black border border-amber-200">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(timeLeftSeconds)}</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-4">
          
          {/* TEACHER CREATOR FORM */}
          {isTeacher ? (
            <form onSubmit={handleTeacherCreate} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Exam Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    placeholder="e.g. Midterm Physics Assessment"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Duration (Minutes) *
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    required
                    value={durationMin}
                    onChange={(e) => setDurationMin(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Description / Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={examDesc}
                  onChange={(e) => setExamDesc(e.target.value)}
                  placeholder="e.g. Please complete all questions before timer expires."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              {/* Questions List */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Questions ({questions.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="inline-flex items-center gap-1 text-xs font-extrabold text-[#026fc3] hover:underline"
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
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                    />

                    {/* 4 Options */}
                    <div className="space-y-2">
                      {q.options.map((opt, optIndex) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct_${q.id}`}
                            checked={q.correct_option_id === opt.id}
                            onChange={() => {
                              setQuestions((prev) =>
                                prev.map((item, i) =>
                                  i === qIndex ? { ...item, correct_option_id: opt.id } : item
                                )
                              );
                            }}
                            className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                            title="Mark as correct answer"
                          />
                          <input
                            type="text"
                            required
                            value={opt.text}
                            onChange={(e) => {
                              const val = e.target.value;
                              setQuestions((prev) =>
                                prev.map((item, i) =>
                                  i === qIndex
                                    ? {
                                        ...item,
                                        options: item.options.map((o, oi) =>
                                          oi === optIndex ? { ...o, text: val } : o
                                        )
                                      }
                                    : item
                                )
                              );
                            }}
                            placeholder={`Option ${optIndex + 1}`}
                            className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
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
                  className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-extrabold shadow-md active:scale-95 transition-all"
                >
                  {isSubmitting ? 'Publishing Exam...' : 'Publish Exam'}
                </button>
              </div>
            </form>
          ) : examResult ? (
            /* STUDENT EXAM RESULT */
            <div className="space-y-5 p-6 bg-purple-50/50 rounded-2xl border border-purple-200 text-center animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto shadow-xs">
                <Award className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">
                  {examResult.passed ? 'Exam Passed!' : 'Exam Completed'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">{examResult.feedback}</p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-purple-100 max-w-xs mx-auto shadow-2xs space-y-1">
                <div className="text-3xl font-black text-purple-700">
                  {examResult.score} <span className="text-xs font-bold text-slate-400">/ {examResult.total_marks}</span>
                </div>
                <div className="text-xs font-extrabold text-slate-600">
                  Percentage: {examResult.percentage}%
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-extrabold shadow-md"
              >
                Back to Classroom
              </button>
            </div>
          ) : (
            /* STUDENT TAKING EXAM */
            activeExam && (
              <div className="space-y-6">
                {activeExam.questions.map((q, idx) => (
                  <div key={q.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <strong className="text-xs font-black text-slate-900">
                        {idx + 1}. {q.question}
                      </strong>
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">
                        {q.marks || 10} pts
                      </span>
                    </div>

                    <div className="space-y-2 pt-1">
                      {q.options.map((opt) => {
                        const isSelected = selectedAnswers[q.id] === opt.id;
                        return (
                          <label
                            key={opt.id}
                            className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-purple-100/70 border-purple-400 text-purple-900 shadow-2xs'
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`exam_${q.id}`}
                              checked={isSelected}
                              onChange={() =>
                                setSelectedAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                              }
                              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                            />
                            <span>{opt.text}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-500">
                    Answered {Object.keys(selectedAnswers).length} of {activeExam.questions.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleStudentSubmit}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-extrabold shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    {isSubmitting ? 'Submitting Answers...' : 'Finish & Submit Exam'}
                  </button>
                </div>
              </div>
            )
          )}

        </div>

      </div>
    </div>
  );
};
