// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: LEFT SIDEBAR (EXAM OUTLINE)
// Clean hierarchical document tree: Exam -> Instructions -> Sections -> Activities & Questions
// ============================================================================

import React from 'react';
import {
  ListTree,
  ChevronRight,
  ChevronDown,
  Layers,
  CheckCircle2,
  ListChecks,
  PenLine,
  FileText,
  ToggleLeft,
  MinusSquare,
  GitFork,
  BookOpen,
  Headphones,
  Video,
  Image as ImageIcon,
  Plus
} from 'lucide-react';
import {
  CanonicalAssessmentV2,
  SupportedQuestionType
} from '../shared/ExamSchema';

interface LeftSidebarProps {
  assessment: CanonicalAssessmentV2;
  activeSectionId: string;
  selectedQuestionId: string | null;
  selectedSectionId: string | null;
  selectedActivityId?: string | null;
  onSelectQuestion: (questionId: string) => void;
  onSelectSection: (sectionId: string) => void;
  onSelectActivity?: (activityId: string) => void;
  onAddQuestion: (sectionId: string, index?: number, type?: SupportedQuestionType) => void;
  onAddSection: () => void;
  onOpenAddModal: (sectionId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const getQuestionIcon = (type: string) => {
  switch (type) {
    case 'multiple_choice':
      return <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />;
    case 'checkboxes':
    case 'multiple_select':
      return <ListChecks className="w-3.5 h-3.5 text-purple-600" />;
    case 'true_false':
      return <ToggleLeft className="w-3.5 h-3.5 text-emerald-600" />;
    case 'fill_in_blank':
      return <MinusSquare className="w-3.5 h-3.5 text-cyan-600" />;
    case 'short_answer':
      return <PenLine className="w-3.5 h-3.5 text-amber-600" />;
    case 'paragraph':
    case 'essay':
      return <FileText className="w-3.5 h-3.5 text-rose-600" />;
    case 'matching':
      return <GitFork className="w-3.5 h-3.5 text-pink-600" />;
    default:
      return <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />;
  }
};

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'listening_activity':
      return <Headphones className="w-3.5 h-3.5 text-violet-600" />;
    case 'video_activity':
      return <Video className="w-3.5 h-3.5 text-rose-600" />;
    case 'reading_activity':
      return <BookOpen className="w-3.5 h-3.5 text-teal-600" />;
    case 'picture_description_activity':
      return <ImageIcon className="w-3.5 h-3.5 text-amber-600" />;
    default:
      return <Layers className="w-3.5 h-3.5 text-slate-500" />;
  }
};

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  assessment,
  activeSectionId: _activeSectionId,
  selectedQuestionId,
  selectedSectionId,
  selectedActivityId,
  onSelectQuestion,
  onSelectSection,
  onSelectActivity,
  onAddSection,
  onOpenAddModal,
  isOpen,
  onToggle
}) => {
  const sections = assessment.sections && assessment.sections.length > 0
    ? assessment.sections
    : [{ id: 'sec-1', title: 'Section 1', questions: [] }];

  const totalQuestions = sections.reduce(
    (acc, s) =>
      acc +
      (s.questions?.length || 0) +
      (s.activities?.reduce((aAcc, act) => aAcc + (act.questions?.length || 0), 0) || 0),
    0
  );

  const totalMarks = sections.reduce(
    (acc, s) =>
      acc +
      (s.questions?.reduce((qAcc, q) => qAcc + (Number(q.marks) || 1), 0) || 0) +
      (s.activities?.reduce(
        (aAcc, act) =>
          aAcc +
          (act.marks || act.questions?.reduce((qAcc, q) => qAcc + (Number(q.marks) || 1), 0) || 0),
        0
      ) || 0),
    0
  );

  if (!isOpen) {
    return (
      <div className="relative z-20">
        <button
          type="button"
          onClick={onToggle}
          className="absolute top-4 left-3 p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 shadow-md hover:border-indigo-400 transition-all"
          title="Expand Exam Outline"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Running global index counter for Q1, Q2...
  let globalQNum = 1;

  return (
    <aside className="w-72 h-[calc(100vh-4rem)] border-r border-slate-200 bg-white flex flex-col flex-shrink-0 z-20 transition-all select-none">
      {/* Top Header: EXAM OUTLINE */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700">
            <ListTree className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-950 block">
              Exam Outline
            </span>
            <span className="text-xs text-slate-700 font-bold">
              {totalQuestions} Qs • {totalMarks} Marks
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
          title="Collapse outline"
        >
          <ChevronDown className="w-4 h-4 rotate-90" />
        </button>
      </div>

      {/* Main Hierarchical Tree View */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
        {/* Exam Title & Instructions Anchor */}
        <div
          onClick={() => {
            onSelectSection(sections[0]?.id || 'sec_1');
          }}
          className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors space-y-0.5 shadow-2xs"
        >
          <span className="text-xs font-black text-slate-950 truncate block">
            {assessment.exam.title || 'Untitled Assessment'}
          </span>
          <span className="text-xs text-slate-700 font-semibold block truncate">
            {assessment.exam.subject} • {assessment.exam.grade}
          </span>
        </div>

        {/* Section List */}
        <div className="space-y-2">
          {sections.map((sec, sIdx) => {
            const isSecSelected = selectedSectionId === sec.id && !selectedQuestionId && !selectedActivityId;
            const secQuestions = sec.questions || [];
            const secActivities = sec.activities || [];
            const secLetter = String.fromCharCode(65 + sIdx); // A, B, C, D...

            return (
              <div
                key={sec.id}
                className="rounded-2xl border border-slate-300 overflow-hidden bg-white shadow-2xs"
              >
                {/* Section Header Row */}
                <div
                  onClick={() => onSelectSection(sec.id)}
                  className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                    isSecSelected
                      ? 'bg-indigo-50 text-indigo-950 font-bold border-b border-indigo-200'
                      : 'hover:bg-slate-50 text-slate-900 font-bold'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-950 border border-indigo-200">
                      SEC {secLetter}
                    </span>
                    <span className="text-xs font-bold text-slate-950 truncate">
                      {sec.title || `Section ${sIdx + 1}`}
                    </span>
                  </div>

                  <span className="text-xs font-bold text-slate-700 shrink-0">
                    {secQuestions.length + secActivities.length} items
                  </span>
                </div>

                {/* Children: Activities & Questions */}
                <div className="px-2 py-2 space-y-1.5 bg-slate-50/50 border-t border-slate-200 text-xs">
                  {/* 1. Activities in this section */}
                  {secActivities.map((act) => {
                    const isActSelected = selectedActivityId === act.id;
                    const childQs = act.questions || [];

                    return (
                      <div key={act.id} className="space-y-0.5">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectActivity) onSelectActivity(act.id);
                          }}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                            isActSelected
                              ? 'bg-violet-100 text-violet-950 font-black border border-violet-300'
                              : 'hover:bg-white text-slate-900 font-bold'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {getActivityIcon(act.activityType)}
                            <span className="truncate text-xs font-bold text-slate-900">
                              {act.title || 'Activity'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-700 font-bold">
                            {childQs.length} Qs
                          </span>
                        </div>

                        {/* Child Questions under this activity */}
                        {childQs.map((q) => {
                          const isQSelected = selectedQuestionId === q.id;
                          const qNum = globalQNum++;

                          return (
                            <div
                              key={q.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectQuestion(q.id);
                              }}
                              className={`flex items-center gap-2 pl-6 pr-2 py-1 rounded-md cursor-pointer text-xs transition-colors ${
                                isQSelected
                                  ? 'bg-indigo-600 text-white font-bold'
                                  : 'text-slate-800 hover:bg-white hover:text-slate-950 font-medium'
                              }`}
                            >
                              <span className="font-black text-slate-900 min-w-[22px]">Q{qNum}</span>
                              <span className="truncate font-semibold">{q.question || 'Untitled Question'}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* 2. Standalone Questions in this section */}
                  {secQuestions.map((q) => {
                    const isQSelected = selectedQuestionId === q.id;
                    const qNum = globalQNum++;

                    return (
                      <div
                        key={q.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectQuestion(q.id);
                        }}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${
                          isQSelected
                            ? 'bg-indigo-600 text-white font-bold shadow-xs'
                            : 'text-slate-900 hover:bg-white font-semibold'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {getQuestionIcon(q.type)}
                          <span className="font-black text-slate-900 min-w-[22px]">
                            Q{qNum}
                          </span>
                          <span className="truncate text-xs font-semibold">
                            {q.question || 'Untitled Question'}
                          </span>
                        </div>

                        <span className={`text-xs font-bold ${isQSelected ? 'text-indigo-100' : 'text-slate-700'}`}>
                          {q.marks || 1}m
                        </span>
                      </div>
                    );
                  })}

                  {/* Add Question / Activity to this section button */}
                  <button
                    type="button"
                    onClick={() => onOpenAddModal(sec.id)}
                    className="w-full mt-2 py-2 px-3 rounded-xl text-xs font-bold text-indigo-900 hover:text-indigo-950 bg-indigo-50/90 hover:bg-indigo-100 border border-indigo-200 flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-700" />
                    <span>+ Add Question / Activity</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Actions: + Add Section */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2">
        <button
          type="button"
          onClick={onAddSection}
          className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-600 bg-white hover:bg-indigo-50/50 text-xs font-bold text-slate-900 hover:text-indigo-900 flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 text-indigo-600" />
          <span>Add Section</span>
        </button>
      </div>
    </aside>
  );
};
