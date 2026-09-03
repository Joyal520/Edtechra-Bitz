// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: AI COURSE DESIGNER MODAL
// Powered by Google Gemini. Allows teachers to generate a structured
// CEFR curriculum plan, review/edit units & lessons, and approve into Course Studio.
// ============================================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  RotateCcw,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { courseStudioService } from '@/services/courseStudioService';
import { Course, AICoursePlanResponse, AICoursePlanUnit } from '@/types/courseStudio';

interface AICourseDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCourseCreated?: (course: Course) => void;
}

const CEFR_LEVELS = [
  'A1 Beginner',
  'A2 Elementary',
  'B1 Intermediate',
  'B2 Upper Intermediate',
  'C1 Advanced',
  'General Audience'
];

const AGE_GROUPS = [
  'Teens & Adults',
  'Kids (Ages 6-10)',
  'Middle School (Ages 11-14)',
  'High School (Ages 15-18)',
  'Adult Professionals'
];

const LEARNING_STYLE_OPTIONS = [
  { id: 'reading', label: 'Reading Passages' },
  { id: 'vocabulary', label: 'Vocabulary Tables' },
  { id: 'grammar', label: 'Grammar Focus' },
  { id: 'speaking', label: 'Speaking & Pronunciation' },
  { id: 'listening', label: 'Listening Activities' },
  { id: 'writing', label: 'Writing Tasks' },
  { id: 'quizzes', label: 'Interactive Quizzes' }
];

export const AICourseDesignerModal: React.FC<AICourseDesignerModalProps> = ({
  isOpen,
  onClose,
  onCourseCreated
}) => {
  const navigate = useNavigate();

  // Step 1: Configuration state
  const [step, setStep] = useState<'prompt' | 'plan' | 'creating'>('prompt');
  const [prompt, setPrompt] = useState(
    'Create a beginner English course for A1 learners. Focus on grammar, vocabulary, reading, writing, listening and speaking.'
  );
  const [targetLevel, setTargetLevel] = useState('A1 Beginner');
  const [ageGroup, setAgeGroup] = useState('Teens & Adults');
  const [unitsCount, setUnitsCount] = useState(6);
  const [lessonsPerUnit, setLessonsPerUnit] = useState(4);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([
    'reading',
    'vocabulary',
    'grammar',
    'speaking',
    'quizzes'
  ]);

  // Step 2: Generated Plan state
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [coursePlan, setCoursePlan] = useState<AICoursePlanResponse | null>(null);
  const [expandedUnitIndices, setExpandedUnitIndices] = useState<Record<number, boolean>>({ 0: true });

  if (!isOpen) return null;

  const toggleStyle = (id: string) => {
    setSelectedStyles(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleUnitExpand = (idx: number) => {
    setExpandedUnitIndices(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // 1. Generate Course Plan with Gemini
  const handleGeneratePlan = async () => {
    if (!prompt.trim()) {
      setErrorMessage('Please describe your course objectives.');
      return;
    }

    setLoadingPlan(true);
    setErrorMessage(null);

    try {
      const plan = await courseStudioService.generateCoursePlanWithAI({
        prompt: prompt.trim(),
        target_level: targetLevel,
        age_group: ageGroup,
        units_count: unitsCount,
        lessons_per_unit: lessonsPerUnit,
        learning_styles: selectedStyles,
        subject: 'English'
      });

      setCoursePlan(plan);
      setStep('plan');
      // Expand all units initially
      const expanded: Record<number, boolean> = {};
      plan.units.forEach((_, idx) => {
        expanded[idx] = idx === 0;
      });
      setExpandedUnitIndices(expanded);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate course plan with AI. Please try again.');
    } finally {
      setLoadingPlan(false);
    }
  };

  // 2. Edit / Delete / Add Units in Plan
  const handleDeleteUnit = (idx: number) => {
    if (!coursePlan) return;
    const newUnits = coursePlan.units.filter((_, i) => i !== idx);
    setCoursePlan({ ...coursePlan, units: newUnits });
  };

  const handleUpdateUnitTitle = (idx: number, newTitle: string) => {
    if (!coursePlan) return;
    const newUnits = [...coursePlan.units];
    newUnits[idx] = { ...newUnits[idx], title: newTitle };
    setCoursePlan({ ...coursePlan, units: newUnits });
  };

  const handleAddUnit = () => {
    if (!coursePlan) return;
    const newUnit: AICoursePlanUnit = {
      title: `Unit ${coursePlan.units.length + 1} — New Topic`,
      description: 'Cohesive communicative learning focus.',
      episodes: [
        {
          title: 'Lesson 1: Introduction & Essentials',
          objective: 'Learn key phrases and vocabulary.',
          can_do: 'I can use practical phrases in everyday context.',
          focus_skills: ['Vocabulary', 'Speaking']
        }
      ]
    };
    setCoursePlan({ ...coursePlan, units: [...coursePlan.units, newUnit] });
  };

  // 3. Approve Course Plan -> Create in Supabase & Navigate to Direct Preview Editor
  const handleApprovePlan = async () => {
    if (!coursePlan) return;

    setStep('creating');
    setErrorMessage(null);

    try {
      // Create Course record
      const course = await courseStudioService.createCourse({
        title: coursePlan.title,
        short_description: coursePlan.short_description,
        subject: coursePlan.subject || 'English',
        grade_level: coursePlan.grade_level || targetLevel,
        course_type: 'full'
      });

      // Create Units & Lessons sequentially
      for (let uIdx = 0; uIdx < coursePlan.units.length; uIdx++) {
        const u = coursePlan.units[uIdx];
        const unitRecord = await courseStudioService.createUnit(course.id, {
          title: u.title,
          description: u.description,
          order_index: uIdx
        });

        for (let epIdx = 0; epIdx < u.episodes.length; epIdx++) {
          const ep = u.episodes[epIdx];
          await courseStudioService.createEpisode(course.id, {
            unit_id: unitRecord.id,
            title: ep.title,
            estimated_minutes: 15,
            order_index: epIdx
          });
        }
      }

      onClose();
      if (onCourseCreated) {
        onCourseCreated(course);
      } else {
        // Direct jump to Course Editing Preview with edit=1
        navigate(`/course-studio/${course.id}/preview?edit=1`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save approved course plan.');
      setStep('plan');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs font-sans animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <header className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-indigo-50/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#026fc3] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span>CREATE COURSE WITH AI</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                  Gemini Powered
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {step === 'prompt'
                  ? 'Describe what you want to teach. Gemini generates a structured curriculum plan.'
                  : 'Review, fine-tune and approve the course plan before creating.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* ERROR BANNER */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: PROMPT & PARAMETERS */}
        {step === 'prompt' && (
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {/* Prompt Textarea */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                What do you want to teach?
              </label>
              <textarea
                rows={4}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Example: Create a beginner English course for A1 learners. Focus on grammar, vocabulary, reading, writing, listening and speaking."
                className="w-full p-3.5 rounded-xl border border-stone-200 text-xs sm:text-sm leading-relaxed text-slate-800 focus:ring-2 focus:ring-[#026fc3] focus:outline-none placeholder:text-slate-400"
              />
              <p className="text-[11px] text-slate-500">
                Include target skills, topics, or practical situations (e.g. introductions, cafe conversations, travel).
              </p>
            </div>

            {/* Grid Configuration: Target Level & Age Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Target Level</label>
                <select
                  value={targetLevel}
                  onChange={e => setTargetLevel(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold bg-white text-slate-800"
                >
                  {CEFR_LEVELS.map(lvl => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Age Group</label>
                <select
                  value={ageGroup}
                  onChange={e => setAgeGroup(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold bg-white text-slate-800"
                >
                  {AGE_GROUPS.map(ag => (
                    <option key={ag} value={ag}>
                      {ag}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scope Sliders: Units Count & Lessons Per Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200/70">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Course Size</span>
                  <span className="text-[#026fc3]">{unitsCount} Units</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={unitsCount}
                  onChange={e => setUnitsCount(parseInt(e.target.value, 10))}
                  className="w-full accent-[#026fc3] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Lessons per Unit</span>
                  <span className="text-[#026fc3]">{lessonsPerUnit} Lessons</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={lessonsPerUnit}
                  onChange={e => setLessonsPerUnit(parseInt(e.target.value, 10))}
                  className="w-full accent-[#026fc3] cursor-pointer"
                />
              </div>
            </div>

            {/* Learning Style Checkboxes */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Core Pedagogical Elements
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LEARNING_STYLE_OPTIONS.map(item => {
                  const isChecked = selectedStyles.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleStyle(item.id)}
                      className={`p-2.5 rounded-xl text-left text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                        isChecked
                          ? 'bg-sky-50 border-[#026fc3] text-[#026fc3]'
                          : 'bg-white border-stone-200 text-slate-600 hover:border-stone-300'
                      }`}
                    >
                      <span>{item.label}</span>
                      {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-[#026fc3] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PLAN REVIEW & EDIT */}
        {step === 'plan' && coursePlan && (
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {/* Generated Course Title & Summary Banner */}
            <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    {coursePlan.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {coursePlan.short_description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-sky-700 bg-sky-100/80 px-2.5 py-1 rounded-lg border border-sky-200">
                    {coursePlan.units.length} Units •{' '}
                    {coursePlan.units.reduce((s, u) => s + u.episodes.length, 0)} Lessons
                  </span>
                </div>
              </div>
            </div>

            {/* Units & Lessons Accordion List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Proposed Curriculum Structure
                </span>
                <button
                  type="button"
                  onClick={handleAddUnit}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#026fc3] hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Unit</span>
                </button>
              </div>

              {coursePlan.units.map((unit, uIdx) => {
                const isExpanded = !!expandedUnitIndices[uIdx];
                return (
                  <div
                    key={uIdx}
                    className="rounded-2xl border border-stone-200/80 bg-white overflow-hidden shadow-2xs"
                  >
                    <div className="p-3.5 bg-stone-50/70 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => toggleUnitExpand(uIdx)}
                        className="flex items-center gap-2 text-left flex-1 cursor-pointer"
                      >
                        <Layers className="w-4 h-4 text-sky-600 shrink-0" />
                        <span className="text-xs sm:text-sm font-bold text-slate-800">
                          {unit.title}
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          ({unit.episodes.length} lessons)
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                        )}
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const newTitle = window.prompt('Edit unit title:', unit.title);
                            if (newTitle) handleUpdateUnitTitle(uIdx, newTitle);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
                          title="Rename Unit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUnit(uIdx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                          title="Delete Unit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-3.5 space-y-2.5 border-t border-stone-100 bg-white">
                        <p className="text-xs text-slate-500 italic">{unit.description}</p>
                        <div className="space-y-1.5 pl-2 border-l-2 border-sky-100">
                          {unit.episodes.map((ep, epIdx) => (
                            <div
                              key={epIdx}
                              className="p-2 rounded-xl bg-stone-50/60 text-xs text-slate-700 flex items-start justify-between gap-2"
                            >
                              <div>
                                <span className="font-bold text-slate-800">{ep.title}</span>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Goal: {ep.can_do || ep.objective}
                                </p>
                              </div>
                              {ep.focus_skills && (
                                <div className="flex gap-1 flex-wrap shrink-0">
                                  {ep.focus_skills.map((skill, sIdx) => (
                                    <span
                                      key={sIdx}
                                      className="px-1.5 py-0.5 rounded-md bg-stone-200/70 text-[10px] font-bold text-slate-600"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: CREATING STATE */}
        {step === 'creating' && (
          <div className="p-12 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-[#026fc3] flex items-center justify-center animate-spin">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">
                Setting Up Your Digital Course...
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Creating course modules and initializing the Direct Preview Editor...
              </p>
            </div>
          </div>
        )}

        {/* FOOTER ACTIONS */}
        {step !== 'creating' && (
          <footer className="px-6 py-4 bg-stone-50 border-t border-stone-200/80 flex items-center justify-between shrink-0">
            {step === 'prompt' ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGeneratePlan}
                  disabled={loadingPlan}
                  className="px-6 py-2.5 rounded-xl bg-[#026fc3] hover:bg-[#025da4] text-white text-xs font-black shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{loadingPlan ? 'Designing Course Plan...' : 'Generate Course Plan'}</span>
                  {!loadingPlan && <ArrowRight className="w-4 h-4" />}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep('prompt')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
                <button
                  type="button"
                  onClick={handleApprovePlan}
                  className="px-6 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-black shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>APPROVE COURSE PLAN</span>
                </button>
              </>
            )}
          </footer>
        )}
      </div>
    </div>
  );
};
