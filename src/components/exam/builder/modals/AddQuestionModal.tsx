// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: CATEGORIZED ADD QUESTION & ACTIVITY MODAL
// Clean popover/modal organizing 20+ types into Core, Language, Comprehension & Advanced
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  ListChecks,
  ToggleLeft,
  MinusSquare,
  PenLine,
  FileText,
  GitFork,
  ArrowUpDown,
  AlignLeft,
  BookOpen,
  Headphones,
  Video,
  Image,
  Mic,
  Code2,
  HelpCircle
} from 'lucide-react';
import { SupportedQuestionType, ActivityType } from '../../shared/ExamSchema';

export type AddItemType =
  | { kind: 'question'; type: SupportedQuestionType }
  | { kind: 'activity'; type: ActivityType };

interface AddQuestionModalProps {
  isOpen: boolean;
  targetSectionTitle: string;
  onClose: () => void;
  onSelectType: (item: AddItemType) => void;
}

interface ItemDefinition {
  id: string;
  kind: 'question' | 'activity';
  type: SupportedQuestionType | ActivityType;
  title: string;
  category: 'core' | 'language' | 'comprehension' | 'advanced';
  description: string;
  icon: React.ElementType;
  badge: string;
  badgeColor: string;
}

const ITEMS: ItemDefinition[] = [
  // --- 1. CORE ---
  {
    id: 'mcq',
    kind: 'question',
    type: 'multiple_choice',
    title: 'Multiple Choice',
    category: 'core',
    description: 'Single correct answer from customizable options A, B, C, D.',
    icon: CheckCircle2,
    badge: 'Auto-Graded',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  {
    id: 'multi_select',
    kind: 'question',
    type: 'checkboxes',
    title: 'Multiple Select',
    category: 'core',
    description: 'Multiple selection checkboxes where students pick all that apply.',
    icon: ListChecks,
    badge: 'Auto-Graded',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  {
    id: 'true_false',
    kind: 'question',
    type: 'true_false',
    title: 'True / False',
    category: 'core',
    description: 'Binary conceptual evaluation with immediate verification.',
    icon: ToggleLeft,
    badge: 'Auto-Graded',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  {
    id: 'fill_in_blank',
    kind: 'question',
    type: 'fill_in_blank',
    title: 'Fill in the Blank',
    category: 'core',
    description: 'Targeted single-word or phrase input with accepted synonyms.',
    icon: MinusSquare,
    badge: 'Auto-Graded',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200'
  },
  {
    id: 'short_answer',
    kind: 'question',
    type: 'short_answer',
    title: 'Short Answer',
    category: 'core',
    description: 'Concise 1-2 sentence response with keyword evaluation.',
    icon: PenLine,
    badge: 'Rubric / AI',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  {
    id: 'paragraph',
    kind: 'question',
    type: 'paragraph',
    title: 'Paragraph / Essay',
    category: 'core',
    description: 'Long-form composition with word count and rubric grading.',
    icon: FileText,
    badge: 'Teacher Evaluated',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  {
    id: 'matching',
    kind: 'question',
    type: 'matching',
    title: 'Matching Pairs',
    category: 'core',
    description: 'Column-to-column pairing interface for terms and definitions.',
    icon: GitFork,
    badge: 'Interactive',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200'
  },

  // --- 2. LANGUAGE ---
  {
    id: 'sentence_completion',
    kind: 'question',
    type: 'fill_in_blank',
    title: 'Sentence Completion',
    category: 'language',
    description: 'Grammar and vocabulary gap-filling in authentic sentences.',
    icon: MinusSquare,
    badge: 'Grammar',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  {
    id: 'sentence_transformation',
    kind: 'question',
    type: 'short_answer',
    title: 'Sentence Transformation',
    category: 'language',
    description: 'Rewrite sentences using a given word while keeping the same meaning.',
    icon: PenLine,
    badge: 'Grammar / B1-C1',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  {
    id: 'error_correction',
    kind: 'question',
    type: 'short_answer',
    title: 'Error Correction',
    category: 'language',
    description: 'Identify and fix grammatical, spelling, or punctuation errors.',
    icon: HelpCircle,
    badge: 'Language Skills',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  {
    id: 'reorder',
    kind: 'question',
    type: 'reorder',
    title: 'Reorder / Sequence',
    category: 'language',
    description: 'Arrange scrambled events, steps, or chronological story sentences.',
    icon: ArrowUpDown,
    badge: 'Auto-Graded',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  {
    id: 'sentence_builder',
    kind: 'question',
    type: 'sentence_builder',
    title: 'Sentence Builder',
    category: 'language',
    description: 'Arrange word tiles in correct grammatical order.',
    icon: AlignLeft,
    badge: 'Interactive',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },

  // --- 3. COMPREHENSION / ACTIVITIES ---
  {
    id: 'reading_activity',
    kind: 'activity',
    type: 'reading_activity',
    title: 'Reading Activity',
    category: 'comprehension',
    description: 'Reading passage containing 3 to 10 child comprehension questions.',
    icon: BookOpen,
    badge: 'Activity Container',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200'
  },
  {
    id: 'listening_activity',
    kind: 'activity',
    type: 'listening_activity',
    title: 'Listening Activity',
    category: 'comprehension',
    description: 'Audio track with teacher transcript and attached comprehension questions.',
    icon: Headphones,
    badge: 'Audio + Transcript',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200'
  },
  {
    id: 'video_activity',
    kind: 'activity',
    type: 'video_activity',
    title: 'Video Activity',
    category: 'comprehension',
    description: 'Embedded video lesson with transcript and interactive questions.',
    icon: Video,
    badge: 'Video + Transcript',
    badgeColor: 'bg-red-50 text-red-700 border-red-200'
  },
  {
    id: 'picture_description',
    kind: 'activity',
    type: 'picture_description_activity',
    title: 'Picture Description Activity',
    category: 'comprehension',
    description: 'Stimulus picture for writing response, object identification, or rubric grading.',
    icon: Image,
    badge: 'Visual Rubric',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
  },

  // --- 4. ADVANCED ---
  {
    id: 'image_question',
    kind: 'question',
    type: 'image_question',
    title: 'Image Question',
    category: 'advanced',
    description: 'Single visual diagram, map, chart, or scientific figure with inquiry.',
    icon: Image,
    badge: 'Diagram',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200'
  },
  {
    id: 'speaking',
    kind: 'question',
    type: 'paragraph',
    title: 'Speaking / Audio Response',
    category: 'advanced',
    description: 'Verbal prompt with oral response recording or speaking assessment.',
    icon: Mic,
    badge: 'Oral Test',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  {
    id: 'coding_question',
    kind: 'question',
    type: 'coding_question',
    title: 'Interactive Activity / Code',
    category: 'advanced',
    description: 'Live programming sandbox with starter code and test case validation.',
    icon: Code2,
    badge: 'Coding Sandbox',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }
];

export const AddQuestionModal: React.FC<AddQuestionModalProps> = ({
  isOpen,
  targetSectionTitle,
  onClose,
  onSelectType
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'core' | 'language' | 'comprehension' | 'advanced'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    return ITEMS.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.badge.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Exam Builder
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-700">
                Adding to <strong className="text-slate-950 font-bold">{targetSectionTitle}</strong>
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-1">
              Add Question or Learning Activity
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-3 bg-white">
          {/* Search input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search question types..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Types' },
              { id: 'core', label: 'Core' },
              { id: 'language', label: 'Language' },
              { id: 'comprehension', label: 'Activities' },
              { id: 'advanced', label: 'Advanced' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Items Grid */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-slate-50/40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.kind === 'activity') {
                      onSelectType({ kind: 'activity', type: item.type as ActivityType });
                    } else {
                      onSelectType({ kind: 'question', type: item.type as SupportedQuestionType });
                    }
                    onClose();
                  }}
                  className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all flex items-start gap-3.5 group hover:scale-[1.01]"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-950 group-hover:text-indigo-600 transition-colors truncate">
                        {item.title}
                      </h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor} shrink-0`}
                      >
                        {item.badge}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-slate-500 font-medium text-sm">
              No matching question or activity types found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
