// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: LEFT SIDEBAR
// Palette of 21 Google Forms & EdTechra Question Types + Document Navigator
// ============================================================================

import React, { useState } from 'react';
import {
  PlusCircle,
  ListTree,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Award,
  Clock,
  CheckCircle2,
  ListChecks,
  ChevronDown,
  PenLine,
  FileText,
  SlidersHorizontal,
  Grid,
  Calendar,
  Upload,
  ToggleLeft,
  HelpCircle,
  SplitSquareVertical,
  ArrowDownUp,
  BookOpen,
  Image,
  Volume2,
  Video,
  Code2,
  AlignLeft
} from 'lucide-react';
import {
  CanonicalExamV2,
  SupportedQuestionType
} from '../shared/ExamSchema';
import {
  ALL_ASSESSMENT_QUESTION_TYPES,
  getQuestionTypeDefinition,
  QuestionTypeDefinition
} from '../shared/QuestionTypeRegistry';

interface LeftSidebarProps {
  assessment: CanonicalExamV2;
  activeSectionId: string;
  selectedQuestionId: string | null;
  selectedSectionId: string | null;
  onSelectQuestion: (questionId: string) => void;
  onSelectSection: (sectionId: string) => void;
  onAddQuestion: (sectionId: string, index?: number, type?: SupportedQuestionType) => void;
  onAddSection: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

// Icon mapper for registry icon names
const renderTypeIcon = (iconName: string, className: string = 'w-4 h-4') => {
  switch (iconName) {
    case 'CheckCircle2':
      return <CheckCircle2 className={className} />;
    case 'ListChecks':
      return <ListChecks className={className} />;
    case 'ChevronDown':
      return <ChevronDown className={className} />;
    case 'PenLine':
      return <PenLine className={className} />;
    case 'FileText':
      return <FileText className={className} />;
    case 'SlidersHorizontal':
      return <SlidersHorizontal className={className} />;
    case 'Grid':
      return <Grid className={className} />;
    case 'Calendar':
      return <Calendar className={className} />;
    case 'Clock':
      return <Clock className={className} />;
    case 'Upload':
      return <Upload className={className} />;
    case 'ToggleLeft':
      return <ToggleLeft className={className} />;
    case 'HelpCircle':
      return <HelpCircle className={className} />;
    case 'SplitSquareVertical':
      return <SplitSquareVertical className={className} />;
    case 'ArrowDownUp':
      return <ArrowDownUp className={className} />;
    case 'BookOpen':
      return <BookOpen className={className} />;
    case 'Image':
      return <Image className={className} />;
    case 'Volume2':
      return <Volume2 className={className} />;
    case 'Video':
      return <Video className={className} />;
    case 'Code2':
      return <Code2 className={className} />;
    case 'AlignLeft':
      return <AlignLeft className={className} />;
    default:
      return <CheckCircle2 className={className} />;
  }
};

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  assessment,
  activeSectionId,
  selectedQuestionId,
  selectedSectionId,
  onSelectQuestion,
  onSelectSection,
  onAddQuestion,
  onAddSection,
  isOpen,
  onToggle
}) => {
  const [activeTab, setActiveTab] = useState<'palette' | 'outline'>('palette');

  const isSurvey = assessment.assessmentType === 'survey';
  const sections = assessment.sections && assessment.sections.length > 0
    ? assessment.sections
    : [{ id: 'sec-default', title: 'Section 1', questions: [] }];

  const totalQuestions = sections.reduce((acc: number, s: any) => acc + (s.questions?.length || 0), 0);
  const totalMarks = sections.reduce(
    (acc: number, s: any) => acc + (s.questions?.reduce((qAcc: number, q: any) => qAcc + (q.marks || 1), 0) || 0),
    0
  );
  const estimatedMins = Math.max(1, Math.ceil(totalQuestions * 0.75));

  const googleFormsTypes = ALL_ASSESSMENT_QUESTION_TYPES.filter(
    (t: QuestionTypeDefinition) => t.group === 'google_forms'
  );
  const edtechraTypes = ALL_ASSESSMENT_QUESTION_TYPES.filter(
    (t: QuestionTypeDefinition) => t.group === 'edtechra_interactive'
  );

  if (!isOpen) {
    return (
      <div className="relative z-20">
        <button
          type="button"
          onClick={onToggle}
          className="absolute top-4 left-3 p-2 bg-[#091124] border border-blue-900/80 rounded-xl text-slate-300 hover:text-white shadow-xl hover:border-indigo-500 transition-all"
          title="Expand Palette & Outline"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-80 h-[calc(100vh-4rem)] border-r border-blue-900/60 bg-[#070e1e] flex flex-col flex-shrink-0 z-20 transition-all select-none">
      {/* Top Header & Tab Switcher */}
      <div className="p-3 border-b border-blue-900/60 flex items-center justify-between">
        <div className="flex bg-[#050b18] p-1 rounded-xl border border-blue-900/60 w-full max-w-[220px]">
          <button
            type="button"
            onClick={() => setActiveTab('palette')}
            className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'palette'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Blocks</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('outline')}
            className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'outline'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListTree className="w-3.5 h-3.5" />
            <span>Outline</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors ml-2"
          title="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        {activeTab === 'palette' ? (
          <div className="space-y-4">
            {/* Google Forms Essentials Group */}
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400">
                  Google Forms Essentials
                </span>
                <span className="text-[10px] text-slate-500 font-bold">11 Types</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {googleFormsTypes.map((item: QuestionTypeDefinition) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => onAddQuestion(activeSectionId, undefined, item.type as SupportedQuestionType)}
                    className="flex items-center gap-3 p-2 rounded-xl border border-blue-900/40 bg-[#091124]/70 hover:bg-[#0c1836] hover:border-indigo-500/60 text-left transition-all group"
                  >
                    <div className="p-2 rounded-lg bg-[#050b18] border border-blue-900/60 text-indigo-400 group-hover:text-white group-hover:scale-105 transition-all">
                      {renderTypeIcon(item.iconName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {item.shortLabel}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">
                        {item.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* EdTechra Interactive Educational Group */}
            <div>
              <div className="flex items-center justify-between px-1 mb-2 pt-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>EdTechra Interactive</span>
                </span>
                <span className="text-[10px] text-slate-500 font-bold">10 Types</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {edtechraTypes.map((item: QuestionTypeDefinition) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => onAddQuestion(activeSectionId, undefined, item.type as SupportedQuestionType)}
                    className="flex items-center gap-3 p-2 rounded-xl border border-blue-900/40 bg-[#091124]/70 hover:bg-[#0c1836] hover:border-emerald-500/60 text-left transition-all group"
                  >
                    <div className="p-2 rounded-lg bg-[#050b18] border border-blue-900/60 text-emerald-400 group-hover:text-white group-hover:scale-105 transition-all">
                      {renderTypeIcon(item.iconName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {item.shortLabel}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">
                        {item.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Outline / Navigator Tab */
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Assessment Structure
              </span>
              <button
                type="button"
                onClick={onAddSection}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Layers className="w-3 h-3" />
                <span>+ Section</span>
              </button>
            </div>

            <div className="space-y-3">
              {sections.map((sec: any, secIdx: number) => {
                const sectionQuestions = sec.questions || [];
                const isSecSelected = selectedSectionId === sec.id;

                return (
                  <div
                    key={sec.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isSecSelected
                        ? 'border-indigo-500/80 bg-indigo-950/20'
                        : 'border-blue-900/40 bg-[#091124]/60'
                    }`}
                  >
                    {/* Section Header in Navigator */}
                    <button
                      type="button"
                      onClick={() => onSelectSection(sec.id)}
                      className="w-full text-left p-2.5 flex items-center justify-between border-b border-blue-900/40 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Layers className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {sec.title || `Section ${secIdx + 1}`}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 bg-[#050b18] px-1.5 py-0.5 rounded">
                        {sectionQuestions.length} Qs
                      </span>
                    </button>

                    {/* Question Items */}
                    <div className="p-1 space-y-1">
                      {sectionQuestions.length === 0 ? (
                        <div className="text-[11px] text-slate-500 text-center py-2">
                          No questions in this section
                        </div>
                      ) : (
                        sectionQuestions.map((q: any, qIdx: number) => {
                          const isQSelected = selectedQuestionId === q.id;
                          const typeDef = getQuestionTypeDefinition(q.type);

                          return (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => {
                                onSelectSection(sec.id);
                                onSelectQuestion(q.id);
                              }}
                              className={`w-full flex items-center gap-2 p-2 rounded-xl text-left transition-all ${
                                isQSelected
                                  ? 'bg-indigo-600 text-white shadow-md'
                                  : 'hover:bg-white/5 text-slate-300'
                              }`}
                            >
                              <span className="text-[10px] font-mono opacity-60 w-4 text-center">
                                {qIdx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs truncate font-medium">
                                  {q.question || 'Untitled question'}
                                </p>
                                <div className="flex items-center gap-1 text-[10px] opacity-70">
                                  <span>{typeDef.shortLabel}</span>
                                  {!isSurvey && q.marks !== undefined && (
                                    <>
                                      <span>•</span>
                                      <span>{q.marks} pts</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Summary Bar */}
      <div className="p-3 border-t border-blue-900/60 bg-[#050b18] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <ListTree className="w-3.5 h-3.5 text-indigo-400" />
          <span>{totalQuestions} {totalQuestions === 1 ? 'Question' : 'Questions'}</span>
        </div>

        {isSurvey ? (
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>~{estimatedMins} min read</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
            <Award className="w-3.5 h-3.5 text-indigo-400" />
            <span>{totalMarks} Total Pts</span>
          </div>
        )}
      </div>
    </aside>
  );
};
