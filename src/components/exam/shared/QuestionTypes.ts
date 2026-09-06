// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: QUESTION TYPES DEFINITION
// ============================================================================

import { SupportedQuestionType } from './ExamSchema';

export interface QuestionTypeMeta {
  type: SupportedQuestionType;
  title: string;
  shortLabel: string;
  description: string;
  category: 'objective' | 'subjective' | 'complex';
  defaultMarks: number;
  icon: string;
  color: {
    bg: string;
    border: string;
    text: string;
    badge: string;
  };
}

export const ALL_QUESTION_TYPES: QuestionTypeMeta[] = [
  {
    type: 'multiple_choice',
    title: 'Multiple Choice',
    shortLabel: 'MCQ',
    description: 'Single correct answer from multiple choices',
    category: 'objective',
    defaultMarks: 1,
    icon: 'CheckCircle2',
    color: {
      bg: 'bg-indigo-950/40 hover:bg-indigo-900/50',
      border: 'border-indigo-500/30 hover:border-indigo-500/60',
      text: 'text-indigo-300',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
    }
  },
  {
    type: 'multiple_select',
    title: 'Multiple Select',
    shortLabel: 'Multi-Select',
    description: 'Choose one or more correct answers with checkboxes',
    category: 'objective',
    defaultMarks: 2,
    icon: 'ListChecks',
    color: {
      bg: 'bg-blue-950/40 hover:bg-blue-900/50',
      border: 'border-blue-500/30 hover:border-blue-500/60',
      text: 'text-blue-300',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    }
  },
  {
    type: 'true_false',
    title: 'True / False',
    shortLabel: 'T / F',
    description: 'Binary choice to evaluate factual accuracy',
    category: 'objective',
    defaultMarks: 1,
    icon: 'ToggleLeft',
    color: {
      bg: 'bg-cyan-950/40 hover:bg-cyan-900/50',
      border: 'border-cyan-500/30 hover:border-cyan-500/60',
      text: 'text-cyan-300',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    }
  },
  {
    type: 'fill_in_blank',
    title: 'Fill in the Blank',
    shortLabel: 'Fill Blank',
    description: 'Typed entry evaluated against accepted solutions',
    category: 'objective',
    defaultMarks: 1,
    icon: 'MinusSquare',
    color: {
      bg: 'bg-emerald-950/40 hover:bg-emerald-900/50',
      border: 'border-emerald-500/30 hover:border-emerald-500/60',
      text: 'text-emerald-300',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    }
  },
  {
    type: 'matching',
    title: 'Matching',
    shortLabel: 'Matching',
    description: 'Pair items from left column with right column',
    category: 'objective',
    defaultMarks: 2,
    icon: 'GitFork',
    color: {
      bg: 'bg-violet-950/40 hover:bg-violet-900/50',
      border: 'border-violet-500/30 hover:border-violet-500/60',
      text: 'text-violet-300',
      badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30'
    }
  },
  {
    type: 'reorder',
    title: 'Reorder / Sequencing',
    shortLabel: 'Reorder',
    description: 'Arrange sentences, steps, or chronological events in order',
    category: 'objective',
    defaultMarks: 2,
    icon: 'ArrowUpDown',
    color: {
      bg: 'bg-amber-950/40 hover:bg-amber-900/50',
      border: 'border-amber-500/30 hover:border-amber-500/60',
      text: 'text-amber-300',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    }
  },
  {
    type: 'short_answer',
    title: 'Short Answer',
    shortLabel: 'Short Ans',
    description: 'Concise written answer evaluated against teacher rubric',
    category: 'subjective',
    defaultMarks: 2,
    icon: 'PenLine',
    color: {
      bg: 'bg-orange-950/40 hover:bg-orange-900/50',
      border: 'border-orange-500/30 hover:border-orange-500/60',
      text: 'text-orange-300',
      badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    }
  },
  {
    type: 'essay',
    title: 'Essay / Long Form',
    shortLabel: 'Essay',
    description: 'In-depth writing assessment with word count & rubric',
    category: 'subjective',
    defaultMarks: 5,
    icon: 'FileText',
    color: {
      bg: 'bg-rose-950/40 hover:bg-rose-900/50',
      border: 'border-rose-500/30 hover:border-rose-500/60',
      text: 'text-rose-300',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    }
  },
  {
    type: 'reading_comprehension',
    title: 'Reading Comprehension',
    shortLabel: 'Reading',
    description: 'Passage context with associated multi-type questions',
    category: 'complex',
    defaultMarks: 5,
    icon: 'BookOpen',
    color: {
      bg: 'bg-teal-950/40 hover:bg-teal-900/50',
      border: 'border-teal-500/30 hover:border-teal-500/60',
      text: 'text-teal-300',
      badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30'
    }
  },
  {
    type: 'image_question',
    title: 'Image Question',
    shortLabel: 'Image',
    description: 'Visual diagram, chart, or photo analysis question',
    category: 'objective',
    defaultMarks: 1,
    icon: 'Image',
    color: {
      bg: 'bg-purple-950/40 hover:bg-purple-900/50',
      border: 'border-purple-500/30 hover:border-purple-500/60',
      text: 'text-purple-300',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    }
  },
  {
    type: 'audio_question',
    title: 'Audio Question',
    shortLabel: 'Audio',
    description: 'Listening comprehension with embedded audio track',
    category: 'objective',
    defaultMarks: 1,
    icon: 'Volume2',
    color: {
      bg: 'bg-pink-950/40 hover:bg-pink-900/50',
      border: 'border-pink-500/30 hover:border-pink-500/60',
      text: 'text-pink-300',
      badge: 'bg-pink-500/20 text-pink-300 border-pink-500/30'
    }
  }
];

export function getQuestionTypeMeta(type: string): QuestionTypeMeta {
  const normalized = String(type || '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const found = ALL_QUESTION_TYPES.find(q => q.type === normalized || q.title.toLowerCase() === type.toLowerCase());
  return found || ALL_QUESTION_TYPES[0];
}
