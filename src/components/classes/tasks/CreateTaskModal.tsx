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
  onTaskCreated?: () => void;
  initialCategory?: TaskCategory | null;
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
    description: 'Students practise skills with interactive auto-graded exercises.',
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
  onTaskCreated,
  initialCategory
}) => {
  const [step, setStep] = useState<'category' | 'builder' | 'preview'>(
    initialCategory ? 'builder' : 'category'
  );
  const [category, setCategory] = useState<TaskCategory>(initialCategory || 'assignment');

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
        if (onTaskCreated) onTaskCreated();
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

  const getCategoryTitle = () => {
    switch (category) {
      case 'assignment':
        return 'Assignment Builder';
      case 'lesson':
        return 'Lesson Builder';
      case 'practice':
        return 'Practice Builder';
      case 'activity':
        return 'Activity Builder';
      case 'resource':
        return 'Resource Builder';
      default:
        return 'Task Builder';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Dark Premium Header (Second Orientation) */}
        <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            {step !== 'category' && (
              <button
                type="button"
                onClick={() => setStep(step === 'preview' ? 'builder' : 'category')}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{step === 'preview' ? 'Back' : 'Categories'}</span>
              </button>
            )}
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-white/10 px-2.5 py-0.5 rounded-full">
                  Assign Your Students
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight">
                {step === 'category'
                  ? 'Choose Activity Type'
                  : step === 'preview'
                  ? `Preview: ${title || 'New Task'}`
                  : getCategoryTitle()}
              </h2>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {step === 'category'
                  ? 'Select a category to build and publish a premium learning task'
                  : step === 'preview'
                  ? 'Inspect the US Letter HTML sheet as students will see it'
                  : `Configure content, questions, instructions and points for this ${category}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {step === 'builder' && (
              <button
                type="button"
                onClick={() => setStep('preview')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Page</span>
              </button>
            )}
            {step === 'builder' && (
              <button
                type="button"
                onClick={handlePublish}
                disabled={loading || !title.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Publish</span>
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
        <div className="overflow-y-auto flex-1 p-6 sm:p-8 space-y-6">
          
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Exactly 5 Category Cards (3 Columns Desktop, 2 Columns Tablet, 1 Column Mobile) */}
          {step === 'category' && (
            <div className="space-y-4 py-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                {CATEGORY_DEFINITIONS.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <div
                      key={cat.id}
                      className="p-6 rounded-3xl border border-slate-200/90 bg-white hover:border-indigo-400 hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-5 group"
                    >
                      <div className="space-y-3.5">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cat.color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {cat.name}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                            {cat.description}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectCategory(cat.id)}
                        className="w-full py-2.5 px-4 bg-slate-50 group-hover:bg-indigo-600 text-slate-700 group-hover:text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <span>Select</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
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
                    placeholder={`e.g., ${category === 'lesson' ? 'Introduction to Cell Biology' : category === 'practice' ? 'Grammar & Tenses Practice' : 'Weekly Writing Assignment'}`}
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
                    Teacher Instructions & Guidance
                  </label>
                  <textarea
                    rows={3}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Explain what students are expected to learn or complete..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Total Points / Max Score
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={points}
                      onChange={(e) => setPoints(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden"
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
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Sections / Structured Content Blocks */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Learning Content & Sections</h3>
                    <p className="text-xs text-slate-500 font-medium">Add text explanations, vocabulary terms or summaries</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddContentBlock}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Section</span>
                  </button>
                </div>

                {contentBlocks.length === 0 ? (
                  <div className="p-5 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-1">
                    <p className="text-xs text-slate-500 font-medium">No custom sections added yet.</p>
                    <p className="text-[11px] text-slate-400 font-normal">Click "+ Add Section" to insert structured lesson content or explanations.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contentBlocks.map((block, idx) => (
                      <div key={block.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
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
                            className="bg-transparent font-black text-xs text-slate-900 focus:outline-hidden border-b border-dashed border-slate-300 focus:border-indigo-500 pb-0.5"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveContentBlock(block.id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <textarea
                          rows={3}
                          value={block.content || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setContentBlocks((prev) =>
                              prev.map((b) => (b.id === block.id ? { ...b, content: val } : b))
                            );
                          }}
                          placeholder="Write the educational content or explanation..."
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Questions Builder */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Questions & Interactive Checks</h3>
                    <p className="text-xs text-slate-500 font-medium">Add auto-graded exercises or open-ended prompts</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('mcq')}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      + MCQ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('fill_blank')}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      + Fill Blank
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('short_answer')}
                      className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      + Short Answer
                    </button>
                  </div>
                </div>

                {questions.length === 0 ? (
                  <div className="p-5 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-1">
                    <p className="text-xs text-slate-500 font-medium">No interactive questions added yet.</p>
                    <p className="text-[11px] text-slate-400 font-normal">Use the buttons above to add Multiple Choice, Fill in the Blank, or Open-Ended questions.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {questions.map((q, qIdx) => (
                      <div key={q.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                            Q{qIdx + 1} • {q.type.toUpperCase()}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500">Marks:</span>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={q.marks || 5}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setQuestions((prev) =>
                                  prev.map((item) => (item.id === q.id ? { ...item, marks: val } : item))
                                );
                              }}
                              className="w-14 px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(q.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
                          placeholder="Enter question prompt..."
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden"
                        />

                        {/* MCQ Options */}
                        {q.type === 'mcq' && (
                          <div className="space-y-2 pt-1">
                            <label className="text-[11px] font-bold text-slate-500 block">Options & Correct Answer:</label>
                            {(q.options || ['A', 'B', 'C', 'D']).map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct-${q.id}`}
                                  checked={q.correct_answer === opt}
                                  onChange={() => {
                                    setQuestions((prev) =>
                                      prev.map((item) => (item.id === q.id ? { ...item, correct_answer: opt } : item))
                                    );
                                  }}
                                  className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const nextOpts = [...(q.options || [])];
                                    nextOpts[optIdx] = val;
                                    setQuestions((prev) =>
                                      prev.map((item) =>
                                        item.id === q.id
                                          ? {
                                              ...item,
                                              options: nextOpts,
                                              correct_answer: item.correct_answer === opt ? val : item.correct_answer
                                            }
                                          : item
                                      )
                                    );
                                  }}
                                  className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Fill in Blank Expected Answer */}
                        {q.type === 'fill_blank' && (
                          <div className="space-y-1 pt-1">
                            <label className="text-[11px] font-bold text-slate-500 block">Correct / Expected Answer:</label>
                            <input
                              type="text"
                              value={String(q.correct_answer || '')}
                              onChange={(e) => {
                                const val = e.target.value;
                                setQuestions((prev) =>
                                  prev.map((item) => (item.id === q.id ? { ...item, correct_answer: val } : item))
                                );
                              }}
                              placeholder="Exact word or phrase"
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                            />
                          </div>
                        )}

                        {/* Short Answer Rubric */}
                        {q.type === 'short_answer' && (
                          <div className="space-y-1 pt-1">
                            <label className="text-[11px] font-bold text-slate-500 block">Evaluation Rubric / Key Concepts (AI Graded):</label>
                            <textarea
                              rows={2}
                              value={q.evaluation_rubric || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setQuestions((prev) =>
                                  prev.map((item) => (item.id === q.id ? { ...item, evaluation_rubric: val } : item))
                                );
                              }}
                              placeholder="Specify required points the AI should check for in student explanations..."
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep('category')}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-black transition-colors cursor-pointer"
                >
                  ← Categories
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('preview')}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-indigo-50 text-indigo-700 rounded-2xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview Letter Page</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={loading || !title.trim()}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-md active:scale-95 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Publish Task</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* STEP 3: Premium US Letter Proportion HTML Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <p className="text-xs text-indigo-900 font-bold">
                  This is the exact US Letter (8.5 × 11 in) HTML page students will see.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('builder')}
                    className="px-3.5 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-xl text-xs font-black hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    ← Edit Content
                  </button>
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={loading}
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    <span>Publish Now</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-center py-2 bg-slate-100/70 p-4 rounded-3xl overflow-x-auto">
                <PremiumTaskPage
                  task={previewTask}
                  isPreview={true}
                />
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
