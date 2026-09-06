// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: QUESTION TYPE REGISTRY
// Complete catalog of Google Forms core types + EdTechra educational types
// ============================================================================

export type AssessmentQuestionType =
  // Google Forms Core Types
  | 'short_answer'
  | 'paragraph'
  | 'multiple_choice'
  | 'checkboxes'
  | 'dropdown'
  | 'linear_scale'
  | 'grid_choice'
  | 'grid_checkbox'
  | 'date'
  | 'time'
  | 'file_upload'
  // EdTechra Educational Types
  | 'true_false'
  | 'fill_in_blank'
  | 'matching'
  | 'reorder'
  | 'reading_comprehension'
  | 'image_question'
  | 'audio_question'
  | 'video_question'
  | 'coding_question'
  | 'sentence_builder';

export type QuestionGroup = 'google_forms' | 'edtechra_interactive';

export interface QuestionTypeDefinition {
  type: AssessmentQuestionType;
  title: string;
  shortLabel: string;
  description: string;
  group: QuestionGroup;
  category: 'objective' | 'subjective' | 'interactive' | 'survey_input';
  supportsGrading: boolean;
  defaultMarks: number;
  iconName: string;
  badgeClass: string;
}

export const QUESTION_TYPE_DEFINITIONS: Record<AssessmentQuestionType, QuestionTypeDefinition> = {
  // --- Google Forms Core Types ---
  multiple_choice: {
    type: 'multiple_choice',
    title: 'Multiple Choice',
    shortLabel: 'MCQ',
    description: 'Single-choice question with customizable options.',
    group: 'google_forms',
    category: 'objective',
    supportsGrading: true,
    defaultMarks: 1,
    iconName: 'CheckCircle2',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
  },
  checkboxes: {
    type: 'checkboxes',
    title: 'Checkboxes',
    shortLabel: 'Select All',
    description: 'Multiple selection cards where students choose all applicable answers.',
    group: 'google_forms',
    category: 'objective',
    supportsGrading: true,
    defaultMarks: 2,
    iconName: 'ListChecks',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
  },
  dropdown: {
    type: 'dropdown',
    title: 'Dropdown',
    shortLabel: 'Dropdown',
    description: 'Compact select menu for single answer options.',
    group: 'google_forms',
    category: 'objective',
    supportsGrading: true,
    defaultMarks: 1,
    iconName: 'ChevronDown',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  },
  short_answer: {
    type: 'short_answer',
    title: 'Short Answer',
    shortLabel: 'Short',
    description: 'Concise 1-2 sentence response with character limit.',
    group: 'google_forms',
    category: 'subjective',
    supportsGrading: true,
    defaultMarks: 2,
    iconName: 'PenLine',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  paragraph: {
    type: 'paragraph',
    title: 'Paragraph (Essay)',
    shortLabel: 'Essay',
    description: 'Long-form text response with word counters and rubric support.',
    group: 'google_forms',
    category: 'subjective',
    supportsGrading: true,
    defaultMarks: 5,
    iconName: 'FileText',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  },
  linear_scale: {
    type: 'linear_scale',
    title: 'Linear Scale',
    shortLabel: 'Scale',
    description: 'Numeric rating scale (e.g. 1 to 5 or 1 to 10) for surveys or feedback.',
    group: 'google_forms',
    category: 'survey_input',
    supportsGrading: false,
    defaultMarks: 0,
    iconName: 'SlidersHorizontal',
    badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40'
  },
  grid_choice: {
    type: 'grid_choice',
    title: 'Multiple Choice Grid',
    shortLabel: 'Radio Grid',
    description: 'Matrix of rows and columns with one radio selection per row.',
    group: 'google_forms',
    category: 'objective',
    supportsGrading: true,
    defaultMarks: 3,
    iconName: 'Grid',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40'
  },
  grid_checkbox: {
    type: 'grid_checkbox',
    title: 'Checkbox Grid',
    shortLabel: 'Check Grid',
    description: 'Matrix of rows and columns with multiple selections permitted per row.',
    group: 'google_forms',
    category: 'objective',
    supportsGrading: true,
    defaultMarks: 3,
    iconName: 'LayoutGrid',
    badgeClass: 'bg-violet-500/20 text-violet-300 border-violet-500/40'
  },
  date: {
    type: 'date',
    title: 'Date Picker',
    shortLabel: 'Date',
    description: 'Calendar date input for event or registration surveys.',
    group: 'google_forms',
    category: 'survey_input',
    supportsGrading: false,
    defaultMarks: 0,
    iconName: 'Calendar',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  time: {
    type: 'time',
    title: 'Time Picker',
    shortLabel: 'Time',
    description: 'Time input for schedules, meetings, and survey timestamps.',
    group: 'google_forms',
    category: 'survey_input',
    supportsGrading: false,
    defaultMarks: 0,
    iconName: 'Clock',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
  },
  file_upload: {
    type: 'file_upload',
    title: 'File Upload',
    shortLabel: 'File',
    description: 'Allows students to attach PDF, doc, or image files.',
    group: 'google_forms',
    category: 'subjective',
    supportsGrading: true,
    defaultMarks: 5,
    iconName: 'UploadCloud',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40'
  },

  // --- EdTechra Educational Types ---
  true_false: {
    type: 'true_false',
    title: 'True / False',
    shortLabel: 'T/F',
    description: 'Binary choice cards for conceptual validation.',
    group: 'edtechra_interactive',
    category: 'objective',
    supportsGrading: true,
    defaultMarks: 1,
    iconName: 'ToggleLeft',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  fill_in_blank: {
    type: 'fill_in_blank',
    title: 'Fill in the Blank',
    shortLabel: 'Blank',
    description: 'Focused text box with case-insensitivity and synonym lists.',
    group: 'edtechra_interactive',
    category: 'objective',
    supportsGrading: true,
    defaultMarks: 1,
    iconName: 'MinusSquare',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
  },
  matching: {
    type: 'matching',
    title: 'Matching Pairs',
    shortLabel: 'Match',
    description: 'Interactive click-to-pair column interface with real-time links.',
    group: 'edtechra_interactive',
    category: 'objective',
    supportsGrading: true,
    defaultMarks: 3,
    iconName: 'GitFork',
    badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/40'
  },
  reorder: {
    type: 'reorder',
    title: 'Reorder / Sequence',
    shortLabel: 'Reorder',
    description: 'Interactive sequencing cards with up/down rearrange controls.',
    group: 'edtechra_interactive',
    category: 'objective',
    supportsGrading: true,
    defaultMarks: 2,
    iconName: 'ArrowUpDown',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  reading_comprehension: {
    type: 'reading_comprehension',
    title: 'Reading Passage',
    shortLabel: 'Reading',
    description: 'Side-by-side passage reader with contextual child questions.',
    group: 'edtechra_interactive',
    category: 'interactive',
    supportsGrading: true,
    defaultMarks: 5,
    iconName: 'BookOpen',
    badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40'
  },
  image_question: {
    type: 'image_question',
    title: 'Image Question',
    shortLabel: 'Image',
    description: 'Embedded visual diagram, chart, or photo with inquiry prompt.',
    group: 'edtechra_interactive',
    category: 'objective',
    supportsGrading: true,
    defaultMarks: 2,
    iconName: 'Image',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
  },
  audio_question: {
    type: 'audio_question',
    title: 'Audio Listening',
    shortLabel: 'Audio',
    description: 'Listening comprehension track with player controls.',
    group: 'edtechra_interactive',
    category: 'objective',
    supportsGrading: true,
    defaultMarks: 2,
    iconName: 'Volume2',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  },
  video_question: {
    type: 'video_question',
    title: 'Video Question',
    shortLabel: 'Video',
    description: 'Embedded lesson clip or video prompt with interactive questions.',
    group: 'edtechra_interactive',
    category: 'interactive',
    supportsGrading: true,
    defaultMarks: 3,
    iconName: 'Video',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40'
  },
  coding_question: {
    type: 'coding_question',
    title: 'Code Editor',
    shortLabel: 'Code',
    description: 'Interactive programming prompt with starter code and syntax highlight.',
    group: 'edtechra_interactive',
    category: 'subjective',
    supportsGrading: true,
    defaultMarks: 5,
    iconName: 'Code2',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  sentence_builder: {
    type: 'sentence_builder',
    title: 'Sentence Builder',
    shortLabel: 'Sentence',
    description: 'Grammar and language tile rearranger for constructing correct sentences.',
    group: 'edtechra_interactive',
    category: 'objective',
    supportsGrading: true,
    defaultMarks: 2,
    iconName: 'AlignLeft',
    badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
  }
};

export const ALL_ASSESSMENT_QUESTION_TYPES = Object.values(QUESTION_TYPE_DEFINITIONS);

export function getQuestionTypeDefinition(type: string): QuestionTypeDefinition {
  return QUESTION_TYPE_DEFINITIONS[type as AssessmentQuestionType] || QUESTION_TYPE_DEFINITIONS.multiple_choice;
}
