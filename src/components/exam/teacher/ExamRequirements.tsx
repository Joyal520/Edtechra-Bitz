// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: EXAM REQUIREMENTS (STEP 3)
// ============================================================================

import React from 'react';
import { Target, Languages, Check, Plus, X, ShieldAlert } from 'lucide-react';
import { CEFRLevel, PedagogicalRequirements } from '../shared/ExamSchema';

interface ExamRequirementsProps {
  requirements: PedagogicalRequirements;
  onChangeRequirements: (updates: Partial<PedagogicalRequirements>) => void;
}

const CEFR_LEVELS: { level: CEFRLevel; title: string; desc: string }[] = [
  { level: 'A1', title: 'A1 - Beginner', desc: 'Basic phrases & simple everyday expressions' },
  { level: 'A2', title: 'A2 - Elementary', desc: 'Direct exchange of simple information' },
  { level: 'B1', title: 'B1 - Intermediate', desc: 'Standard input on familiar matters, work & school' },
  { level: 'B2', title: 'B2 - Upper Intermediate', desc: 'Complex text, technical discussions, fluent interaction' },
  { level: 'C1', title: 'C1 - Advanced', desc: 'Demanding longer texts with implicit meaning' },
  { level: 'C2', title: 'C2 - Mastery', desc: 'Effortless understanding, spontaneous and precise nuance' },
  { level: 'General', title: 'General / Non-CEFR', desc: 'Subject-standard curriculum vocabulary' }
];

export const ExamRequirements: React.FC<ExamRequirementsProps> = ({
  requirements,
  onChangeRequirements
}) => {
  const [newObjective, setNewObjective] = React.useState('');
  const [newTopicInclude, setNewTopicInclude] = React.useState('');
  const [newTopicAvoid, setNewTopicAvoid] = React.useState('');

  const handleAddObjective = () => {
    if (!newObjective.trim()) return;
    const current = requirements.learningObjectives || [];
    onChangeRequirements({ learningObjectives: [...current, newObjective.trim()] });
    setNewObjective('');
  };

  const handleRemoveObjective = (idx: number) => {
    const current = requirements.learningObjectives || [];
    onChangeRequirements({ learningObjectives: current.filter((_, i) => i !== idx) });
  };

  const handleAddIncludeTopic = () => {
    if (!newTopicInclude.trim()) return;
    const current = requirements.topicsToInclude || [];
    onChangeRequirements({ topicsToInclude: [...current, newTopicInclude.trim()] });
    setNewTopicInclude('');
  };

  const handleRemoveIncludeTopic = (idx: number) => {
    const current = requirements.topicsToInclude || [];
    onChangeRequirements({ topicsToInclude: current.filter((_, i) => i !== idx) });
  };

  const handleAddAvoidTopic = () => {
    if (!newTopicAvoid.trim()) return;
    const current = requirements.topicsToAvoid || [];
    onChangeRequirements({ topicsToAvoid: [...current, newTopicAvoid.trim()] });
    setNewTopicAvoid('');
  };

  const handleRemoveAvoidTopic = (idx: number) => {
    const current = requirements.topicsToAvoid || [];
    onChangeRequirements({ topicsToAvoid: current.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-purple-950/70 via-indigo-950/60 to-blue-950/70 p-6 rounded-3xl border border-purple-500/30 backdrop-blur-md">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center shrink-0 text-purple-300 shadow-inner">
            <Target className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white tracking-wide">Step 3: Pedagogical & Content Requirements</h3>
            <p className="text-xs text-purple-200/80 leading-relaxed max-w-xl">
              Specify learning objectives, grammar foci, and curriculum boundaries. The AI prompt will strictly enforce these constraints so you get tailored educational questions.
            </p>
          </div>
        </div>
      </div>

      {/* CEFR Level Selector (For English & Language Exams) */}
      <div className="space-y-3">
        <label className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
          <Languages className="w-4 h-4 text-indigo-400" />
          Language / CEFR Proficiency Level
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {CEFR_LEVELS.map((item) => {
            const isSelected = (requirements.cefrLevel || 'General') === item.level;
            return (
              <button
                key={item.level}
                type="button"
                onClick={() => onChangeRequirements({ cefrLevel: item.level })}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30 ring-2 ring-purple-400/40 scale-[1.02]'
                    : 'bg-[#0d1733]/90 text-slate-300 border-blue-800/50 hover:bg-[#16224c]'
                }`}
              >
                <div className="font-black text-xs">{item.title}</div>
                <div className={`text-[10px] mt-1 line-clamp-2 ${isSelected ? 'text-purple-100' : 'text-slate-400'}`}>
                  {item.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grammar & Vocabulary Specifics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="text-xs font-black text-indigo-200 uppercase tracking-wider">
            Grammar / Linguistic Focus <span className="text-slate-400 font-normal lowercase">(optional)</span>
          </label>
          <input
            type="text"
            value={requirements.grammarFocus || ''}
            onChange={(e) => onChangeRequirements({ grammarFocus: e.target.value })}
            placeholder="e.g., Present perfect with already, yet, just, ever, never"
            className="w-full px-4 py-3 bg-[#0d1733] border border-blue-800/70 rounded-2xl text-sm font-semibold text-white placeholder:text-blue-300/40 focus:outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-indigo-200 uppercase tracking-wider">
            Vocabulary Domain / Terminology <span className="text-slate-400 font-normal lowercase">(optional)</span>
          </label>
          <input
            type="text"
            value={requirements.vocabularyLevel || ''}
            onChange={(e) => onChangeRequirements({ vocabularyLevel: e.target.value })}
            placeholder="e.g., Environmental science, renewable energy, climate systems"
            className="w-full px-4 py-3 bg-[#0d1733] border border-blue-800/70 rounded-2xl text-sm font-semibold text-white placeholder:text-blue-300/40 focus:outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
          />
        </div>
      </div>

      {/* Learning Objectives List */}
      <div className="space-y-3">
        <label className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
          <Target className="w-4 h-4 text-indigo-400" />
          Learning Objectives
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newObjective}
            onChange={(e) => setNewObjective(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddObjective())}
            placeholder="e.g., Differentiate between mitosis and meiosis stages"
            className="flex-1 px-4 py-2.5 bg-[#0d1733] border border-blue-800/70 rounded-2xl text-xs font-semibold text-white placeholder:text-blue-300/40 focus:outline-hidden focus:border-indigo-400"
          />
          <button
            type="button"
            onClick={handleAddObjective}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {requirements.learningObjectives && requirements.learningObjectives.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {requirements.learningObjectives.map((obj, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-xl bg-[#0e1939] border border-indigo-500/40 text-indigo-200 text-xs font-semibold flex items-center gap-2"
              >
                <span>{obj}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveObjective(idx)}
                  className="text-slate-400 hover:text-rose-400 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Topics to Include & Avoid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Topics to Include */}
        <div className="space-y-3">
          <label className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-400" />
            Topics to Include / Emphasize
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTopicInclude}
              onChange={(e) => setNewTopicInclude(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddIncludeTopic())}
              placeholder="e.g., Cellular respiration equation"
              className="flex-1 px-4 py-2.5 bg-[#0d1733] border border-blue-800/70 rounded-2xl text-xs font-semibold text-white placeholder:text-blue-300/40 focus:outline-hidden focus:border-emerald-400"
            />
            <button
              type="button"
              onClick={handleAddIncludeTopic}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {requirements.topicsToInclude && requirements.topicsToInclude.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {requirements.topicsToInclude.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5"
                >
                  {t}
                  <button type="button" onClick={() => handleRemoveIncludeTopic(idx)} className="hover:text-rose-300">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Topics to Avoid */}
        <div className="space-y-3">
          <label className="text-xs font-black text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            Topics to Avoid / Out of Scope
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTopicAvoid}
              onChange={(e) => setNewTopicAvoid(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAvoidTopic())}
              placeholder="e.g., Anaerobic fermentation formulas"
              className="flex-1 px-4 py-2.5 bg-[#0d1733] border border-blue-800/70 rounded-2xl text-xs font-semibold text-white placeholder:text-blue-300/40 focus:outline-hidden focus:border-rose-400"
            />
            <button
              type="button"
              onClick={handleAddAvoidTopic}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-black flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {requirements.topicsToAvoid && requirements.topicsToAvoid.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {requirements.topicsToAvoid.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[11px] font-semibold flex items-center gap-1.5"
                >
                  {t}
                  <button type="button" onClick={() => handleRemoveAvoidTopic(idx)} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Special Instructions for AI */}
      <div className="space-y-2">
        <label className="text-xs font-black text-indigo-200 uppercase tracking-wider">
          Special Guidance or Tone for AI <span className="text-slate-400 font-normal lowercase">(optional)</span>
        </label>
        <textarea
          rows={2}
          value={requirements.specialInstructions || ''}
          onChange={(e) => onChangeRequirements({ specialInstructions: e.target.value })}
          placeholder="e.g., Include real-world case studies for Grade 8 students, keep sentences concise, ensure distractors test common misconceptions."
          className="w-full px-4 py-3 bg-[#0d1733] border border-blue-800/70 rounded-2xl text-sm font-medium text-white placeholder:text-blue-300/40 focus:outline-hidden focus:border-indigo-400 transition-all resize-y"
        />
      </div>
    </div>
  );
};
