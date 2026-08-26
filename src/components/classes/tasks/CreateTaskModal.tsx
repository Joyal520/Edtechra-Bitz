import React, { useState } from 'react';
import {
  X,
  FileText,
  BookOpen,
  CheckCircle2,
  Layers,
  FolderPlus,
  Plus,
  Trash2,
  Sparkles,
  Eye,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2
} from 'lucide-react';
import {
  TaskCategory,
  TaskContentBlock,
  TaskQuestion,
  QuestionType,
  ClassroomTask
} from '@/types/classroomTask';
import { classroomTaskService } from '@/services/classroomTaskService';
import { PremiumTaskPage } from './PremiumTaskPage';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId: string;
  onTaskCreated: () => void;
}

const CATEGORY_DEFINITIONS: Array<{
  id: TaskCategory;
  name: string;
  icon: any;
  description: string;
  color: string;
}> = [
  {
    id: 'assignment',
    name: 'Assignment',
    icon: FileText,
    description: 'Students complete and submit written work or files.',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'lesson',
    name: 'Lesson',
    icon: BookOpen,
    description: 'Students learn structured content with text, media and checks.',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'practice',
    name: 'Practice',
    icon: CheckCircle2,
    description: 'Students practice skills with interactive auto-graded exercises.',
    color: 'from-purple-500 to-indigo-600'
  },
  {
    id: 'activity',
    name: 'Activity',
    icon: Layers,
    description: 'Classroom projects, creative tasks, debates and discussions.',
    color: 'from-amber-500 to-orange-600'
  },
  {
    id: 'resource',
    name: 'Resource',
    icon: FolderPlus,
    description: 'Learning materials, PDFs, notes, links or reference guides.',
    color: 'from-slate-600 to-slate-800'
  }
];

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  classroomId,
  onTaskCreated
}) => {
  const [step, setStep] = useState<'category' | 'builder' | 'preview'>('category');
  const [category, setCategory] = useState<TaskCategory>('assignment');

  // Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [points, setPoints] = useState(100);
  const [dueDate, setDueDate] = useState('');

  // Sections / Content Blocks
  const [contentBlocks, setContentBlocks] = useState<TaskContentBlock[]>([]);

  // Questions
  const [questions, setQuestions] = useState<TaskQuestion[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectCategory = (cat: TaskCategory) => {
    setCategory(cat);
    setStep('builder');
  };

  const handleAddContentBlock = () => {
    setContentBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'text',
        title: `Section ${prev.length + 1}`,
        content: ''
      }
    ]);
  };

  const handleRemoveContentBlock = (id: string) => {
    setContentBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const handleAddQuestion = (type: QuestionType = 'mcq') => {
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type,
        prompt: '',
        options: type === 'mcq' ? ['Option A', 'Option B', 'Option C', 'Option D'] : undefined,
        correct_answer: type === 'mcq' ? 'Option A' : type === 'true_false' ? 'True' : '',
        marks: 5,
        explanation: ''
      }
    ]);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      setError('Task Title is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await classroomTaskService.createTask({
        classroomId,
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        instructions: instructions.trim() || undefined,
        category,
        points: Number(points) || 100,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        contentBlocks,
        questions,
        settings: {
          show_result_immediately: true,
          show_correct_answers: true,
          allow_retry: false,
          enable_ai_feedback: true
        }
      });

      if (res.error) {
        setError(res.error);
      } else {
        onTaskCreated();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  // Mock Task Object for Live Preview
  const previewTask: ClassroomTask = {
    id: 'preview',
    classroom_id: classroomId,
    created_by: 'teacher',
    title: title || 'Untitled Task',
    subtitle: subtitle || undefined,
    instructions: instructions || 'Follow the instructions provided below.',
    category,
    points: Number(points) || 100,
    due_date: dueDate || null,
    content_blocks: contentBlocks,
    questions,
    attachment_urls: [],
    settings: {
      show_result_immediately: true,
      show_correct_answers: true,
      allow_retry: false,
      enable_ai_feedback: true
    },
    version: 1,
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {step !== 'category' && (
              <button
                type="button"
                onClick={() => setStep(step === 'preview' ? 'builder' : 'category')}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 block">
                Assign Your Students
              </span>
              <h2 className="text-lg font-black tracking-tight">
                {step === 'category'
                  ? 'Choose Activity Type'
                  : step === 'preview'
                  ? `Preview: ${title || 'New Task'}`
                  : `Create ${category.charAt(0).toUpperCase() + category.slice(1)}`}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {step === 'builder' && (
              <button
                type="button"
                onClick={() => setStep('preview')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Letter Page</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: 5 Simple Category Selection */}
          {step === 'category' && (
            <div className="space-y-4 py-2">
              <div className="text-center space-y-1 mb-6">
                <h3 className="text-xl font-black text-slate-900">What do you want your students to do?</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Select a category to build and publish a premium learning task
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {CATEGORY_DEFINITIONS.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat.id)}
                      className="p-5 rounded-3xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-xl transition-all text-left flex flex-col justify-between space-y-4 group cursor-pointer"
                    >
                      <div className="space-y-3">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cat.color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {cat.name}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                            {cat.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-black text-indigo-600 pt-1">
                        <span>Select</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Content & Question Builder */}
          {step === 'builder' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Present Perfect Grammar & Usage"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Subtitle / Short Topic (Optional)
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g., English Language Arts • Unit 3"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Instructions
                  </label>
                  <textarea
                    rows={3}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Provide clear step-by-step instructions for students..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Total Points
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={points}
                      onChange={(e) => setPoints(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Due Date (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Sections / Content Blocks */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Learning Sections & Explanations ({contentBlocks.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddContentBlock}
                    className="text-xs font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Section</span>
                  </button>
                </div>

                {contentBlocks.map((block, idx) => (
                  <div key={block.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={block.title || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setContentBlocks((prev) =>
                            prev.map((b) => (b.id === block.id ? { ...b, title: val } : b))
                          );
                        }}
                        placeholder={`Section ${idx + 1} Heading`}
                        className="font-bold text-xs bg-white px-3 py-1.5 rounded-xl border border-slate-200 flex-1 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveContentBlock(block.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={block.content}
                      onChange={(e) => {
                        const val = e.target.value;
                        setContentBlocks((prev) =>
                          prev.map((b) => (b.id === block.id ? { ...b, content: val } : b))
                        );
                      }}
                      placeholder="Enter explanation, key points, or text content..."
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden"
                    />
                  </div>
                ))}
              </div>

              {/* Questions Builder */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Questions & Exercises ({questions.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('mcq')}
                      className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-xl text-[11px] font-black hover:bg-indigo-100 cursor-pointer"
                    >
                      + MCQ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('true_false')}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-xl text-[11px] font-black hover:bg-emerald-100 cursor-pointer"
                    >
                      + True/False
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('fill_blank')}
                      className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-xl text-[11px] font-black hover:bg-purple-100 cursor-pointer"
                    >
                      + Fill Blank
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('short_answer')}
                      className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-xl text-[11px] font-black hover:bg-amber-100 cursor-pointer"
                    >
                      + Short Answer
                    </button>
                  </div>
                </div>

                {questions.map((q, idx) => (
                  <div key={q.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800">
                        Q{idx + 1} • {q.type.toUpperCase().replace('_', ' ')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={q.prompt}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQuestions((prev) =>
                          prev.map((item) => (item.id === q.id ? { ...item, prompt: val } : item))
                        );
                      }}
                      placeholder="Question prompt..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden"
                    />

                    {/* MCQ Options */}
                    {(q.type === 'mcq' || q.type === 'multiple_choice') && q.options && (
                      <div className="space-y-1.5 pl-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Options (Select radio for correct answer)
                        </span>
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct_${q.id}`}
                              checked={q.correct_answer === opt}
                              onChange={() => {
                                setQuestions((prev) =>
                                  prev.map((item) =>
                                    item.id === q.id ? { ...item, correct_answer: opt } : item
                                  )
                                );
                              }}
                              className="text-indigo-600"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const val = e.target.value;
                                setQuestions((prev) =>
                                  prev.map((item) => {
                                    if (item.id === q.id && item.options) {
                                      const newOpts = [...item.options];
                                      newOpts[oIdx] = val;
                                      return { ...item, options: newOpts };
                                    }
                                    return item;
                                  })
                                );
                              }}
                              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium flex-1"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Fill Blank Correct Answer */}
                    {q.type === 'fill_blank' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 block">
                          Correct Word/Phrase
                        </label>
                        <input
                          type="text"
                          value={q.correct_answer || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQuestions((prev) =>
                              prev.map((item) =>
                                item.id === q.id ? { ...item, correct_answer: val } : item
                              )
                            );
                          }}
                          placeholder="e.g., photosynthesis"
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                    )}

                    {/* Short Answer Rubric */}
                    {q.type === 'short_answer' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-amber-700 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>AI Evaluation Rubric & Key Points</span>
                        </label>
                        <input
                          type="text"
                          value={q.evaluation_rubric || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQuestions((prev) =>
                              prev.map((item) =>
                                item.id === q.id ? { ...item, evaluation_rubric: val } : item
                              )
                            );
                          }}
                          placeholder="e.g., Explains physical benefit and mental benefit clearly"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep('category')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Change Category
                </button>
                <button
                  type="button"
                  onClick={() => setStep('preview')}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview & Publish</span>
                </button>
              </div>

            </div>
          )}

          {/* STEP 3: Live Preview Before Publish */}
          {step === 'preview' && (
            <div className="space-y-6">
              <PremiumTaskPage task={previewTask} isPreview={true} />

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between rounded-2xl">
                <button
                  type="button"
                  onClick={() => setStep('builder')}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Editor</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handlePublish}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publishing Task...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Publish & Assign Students</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
