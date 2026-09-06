// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: QUESTION CONFIGURATION (STEP 2)
// ============================================================================

import React from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  HelpCircle,
  AlertCircle,
  Sliders,
  CheckCircle2,
  ListChecks,
  ToggleLeft,
  MinusSquare,
  GitFork,
  ArrowUpDown,
  PenLine,
  FileText,
  BookOpen,
  Image as ImageIcon,
  Volume2
} from 'lucide-react';
import { SupportedQuestionType } from '../shared/ExamSchema';
import { ALL_QUESTION_TYPES, getQuestionTypeMeta } from '../shared/QuestionTypes';
import { QuestionTypeConfigItem } from './promptBuilder';

interface QuestionConfigurationProps {
  configs: QuestionTypeConfigItem[];
  onChangeConfigs: (configs: QuestionTypeConfigItem[]) => void;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  CheckCircle2,
  ListChecks,
  ToggleLeft,
  MinusSquare,
  GitFork,
  ArrowUpDown,
  PenLine,
  FileText,
  BookOpen,
  Image: ImageIcon,
  Volume2
};

export const QuestionConfiguration: React.FC<QuestionConfigurationProps> = ({
  configs,
  onChangeConfigs
}) => {
  const totalQuestions = configs.reduce((acc, c) => acc + (Number(c.count) || 0), 0);

  const handleAddType = (type: SupportedQuestionType) => {
    const newItem: QuestionTypeConfigItem = {
      id: `config_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      count: type === 'essay' ? 2 : type === 'reading_comprehension' ? 1 : 5,
      difficulty: 'medium'
    };
    onChangeConfigs([...configs, newItem]);
  };

  const handleRemove = (index: number) => {
    const updated = configs.filter((_, i) => i !== index);
    onChangeConfigs(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === configs.length - 1)
    ) {
      return;
    }
    const updated = [...configs];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    onChangeConfigs(updated);
  };

  const handleUpdate = (index: number, updates: Partial<QuestionTypeConfigItem>) => {
    const updated = configs.map((c, i) => (i === index ? { ...c, ...updates } : c));
    onChangeConfigs(updated);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-blue-950/70 via-indigo-950/60 to-purple-950/70 p-6 rounded-3xl border border-blue-500/30 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center shrink-0 text-blue-300 shadow-inner">
            <Sliders className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white tracking-wide">Step 2: Question Configuration</h3>
            <p className="text-xs text-blue-200/80 leading-relaxed max-w-xl">
              Select the question types you want in your exam. Specify the question counts and difficulty per section. Total marks are handled automatically.
            </p>
          </div>
        </div>

        {/* Total Questions Counter */}
        <div className="px-5 py-3 rounded-2xl bg-[#0a1226]/80 border border-blue-500/40 text-center sm:text-right shrink-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-300">Total Questions</div>
          <div className="text-2xl font-black text-white">{totalQuestions}</div>
        </div>
      </div>

      {/* Selected Question Type Cards List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-400" />
            Configured Exam Sections ({configs.length})
          </label>
          <span className="text-[11px] text-slate-400">Order from top to bottom represents exam flow</span>
        </div>

        {configs.length === 0 ? (
          <div className="p-8 rounded-3xl border border-dashed border-blue-800/80 bg-[#0c1633]/60 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
            <div className="text-sm font-bold text-white">No question types added yet</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Click any question type card below to add it to your exam structure.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map((cfg, idx) => {
              const meta = getQuestionTypeMeta(cfg.type);
              const IconComp = ICON_MAP[meta.icon] || HelpCircle;

              return (
                <div
                  key={cfg.id}
                  className="bg-[#0f1b3d] p-4 sm:p-5 rounded-3xl border border-blue-800/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-blue-600/60"
                >
                  {/* Left: Type Title, Icon & Category */}
                  <div className="flex items-center gap-3.5 min-w-[220px]">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMove(idx, 'up')}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === configs.length - 1}
                        onClick={() => handleMove(idx, 'down')}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${meta.color.bg} ${meta.color.border} ${meta.color.text}`}>
                      <IconComp className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{meta.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.color.badge}`}>
                          {meta.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{meta.description}</p>
                    </div>
                  </div>

                  {/* Middle: Controls (Count & Difficulty) */}
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Number of Questions */}
                    <div className="flex items-center gap-2 bg-[#091124] px-3 py-1.5 rounded-2xl border border-blue-900/80">
                      <span className="text-xs font-bold text-slate-400">Count:</span>
                      <button
                        type="button"
                        onClick={() => handleUpdate(idx, { count: Math.max(1, (Number(cfg.count) || 1) - 1) })}
                        className="w-7 h-7 rounded-xl bg-blue-950 hover:bg-blue-900 text-white font-black text-sm flex items-center justify-center cursor-pointer active:scale-95"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={cfg.count}
                        onChange={(e) => handleUpdate(idx, { count: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-12 text-center bg-transparent font-black text-sm text-white focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdate(idx, { count: (Number(cfg.count) || 1) + 1 })}
                        className="w-7 h-7 rounded-xl bg-blue-950 hover:bg-blue-900 text-white font-black text-sm flex items-center justify-center cursor-pointer active:scale-95"
                      >
                        +
                      </button>
                    </div>

                    {/* Difficulty Chips */}
                    <div className="flex items-center gap-1 bg-[#091124] p-1 rounded-2xl border border-blue-900/80">
                      {(['easy', 'medium', 'hard', 'mixed'] as const).map((lvl) => {
                        const isLvlSelected = cfg.difficulty === lvl;
                        return (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => handleUpdate(idx, { difficulty: lvl })}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-black capitalize transition-all cursor-pointer ${
                              isLvlSelected
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {lvl}
                          </button>
                        );
                      })}
                    </div>

                    {/* Delete Action */}
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="p-2.5 text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                      title="Remove Question Type"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Visual Question Type Picker (+ Add Question Type) */}
      <div className="space-y-3 pt-2">
        <label className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-indigo-400" />
          Click to Add Question Types ({ALL_QUESTION_TYPES.length} Available)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {ALL_QUESTION_TYPES.map((typeMeta) => {
            const IconComp = ICON_MAP[typeMeta.icon] || HelpCircle;
            const alreadyAddedCount = configs.filter(c => c.type === typeMeta.type).length;

            return (
              <button
                key={typeMeta.type}
                type="button"
                onClick={() => handleAddType(typeMeta.type)}
                className="p-3.5 rounded-2xl border border-blue-800/60 bg-[#0d1733]/90 hover:bg-[#16224c] hover:border-indigo-500/60 text-left transition-all group cursor-pointer flex flex-col justify-between space-y-2.5 hover:scale-[1.02] shadow-2xs"
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${typeMeta.color.bg} ${typeMeta.color.border} ${typeMeta.color.text}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  {alreadyAddedCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {alreadyAddedCount} Added
                    </span>
                  )}
                </div>

                <div>
                  <div className="text-xs font-black text-white group-hover:text-indigo-300 transition-colors">
                    {typeMeta.title}
                  </div>
                  <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                    {typeMeta.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
