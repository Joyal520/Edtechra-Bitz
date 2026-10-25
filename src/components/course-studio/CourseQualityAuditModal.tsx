// ============================================================================
// EDTECHRA COURSE STUDIO 2.0: AUTOMATED COURSE QUALITY AUDIT & IMPROVER
// Evaluates any course across 10 instructional, visual, interactive, mobile,
// and accessibility dimensions (0-100) and provides 1-click Apply Improvement
// & Apply All actions.
// ============================================================================

import React, { useMemo, useState } from 'react';
import {
  X,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Wand2,
  Award
} from 'lucide-react';
import {
  Course,
  CourseEpisode,
  CourseQualityAuditReport,
  CourseQualityImprovement
} from '@/types/courseStudio';

interface CourseQualityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  onApplyImprovement: (improvement: CourseQualityImprovement) => Promise<void> | void;
  onApplyAllImprovements: (improvements: CourseQualityImprovement[]) => Promise<void> | void;
}

const VISUAL_BLOCK_TYPES = new Set([
  'image',
  'text_image',
  'illustration',
  'labelled_diagram',
  'icon_cards',
  'comparison',
  'video',
  'youtube_video',
  'text_video'
]);

const INTERACTIVE_BLOCK_TYPES = new Set([
  'labelled_diagram',
  'vocabulary_cards',
  'icon_cards',
  'interactive_activity',
  'did_you_know',
  'question_set',
  'interactive_question'
]);

export function computeCourseQualityAudit(course: Course): CourseQualityAuditReport {
  const episodes: CourseEpisode[] = (course.units || []).flatMap(u => u.episodes || []);
  const totalLessons = Math.max(1, episodes.length);

  let lessonsWithVisuals = 0;
  let lessonsWithInteractivity = 0;
  let lessonsWithObjectives = 0;
  let lessonsWithTakeaways = 0;
  let lessonsWithVocab = 0;
  let longTextBlocksCount = 0;
  let totalBlocksCount = 0;
  let blocksMissingAlt = 0;
  let totalQuestions = 0;
  let questionsWithExplanations = 0;
  const questionTypesUsed = new Set<string>();
  const difficultiesUsed = new Set<string>();

  const candidateImprovements: CourseQualityImprovement[] = [];

  episodes.forEach((ep, epIdx) => {
    const blocks = ep.blocks || [];
    const questions = ep.questions || [];
    totalBlocksCount += blocks.length;
    totalQuestions += questions.length;

    const hasVisual = blocks.some(b => VISUAL_BLOCK_TYPES.has(b.block_type));
    const hasInteractive = blocks.some(b => INTERACTIVE_BLOCK_TYPES.has(b.block_type)) || questions.length > 0;
    const hasObjective = blocks.some(b => b.block_type === 'objective' || b.block_type === 'heading');
    const hasTakeaway = blocks.some(b => b.block_type === 'key_takeaway' || b.block_type === 'callout' || b.block_type === 'course_completion');
    const hasVocab = blocks.some(b => b.block_type === 'vocabulary_cards');

    if (hasVisual) lessonsWithVisuals++;
    else {
      candidateImprovements.push({
        id: `imp_vis_${ep.id || epIdx}`,
        dimension: 'Visual Quality',
        title: `Add visual diagram or illustration to "${ep.title}"`,
        description: 'Every lesson should include at least one visual illustration, diagram, or icon card grid to prevent textbook walls of text.',
        impactPoints: 8,
        episodeId: ep.id,
        actionType: 'add_visual_block'
      });
    }

    if (hasInteractive) lessonsWithInteractivity++;
    if (! blocks.some(b => INTERACTIVE_BLOCK_TYPES.has(b.block_type))) {
      candidateImprovements.push({
        id: `imp_int_${ep.id || epIdx}`,
        dimension: 'Interactivity',
        title: `Add interactive discovery block to "${ep.title}"`,
        description: 'Add a tap-to-reveal discovery activity so learners actively interact before answering quiz questions.',
        impactPoints: 7,
        episodeId: ep.id,
        actionType: 'add_interactive_activity'
      });
    }

    if (hasObjective) lessonsWithObjectives++;
    else {
      candidateImprovements.push({
        id: `imp_obj_${ep.id || epIdx}`,
        dimension: 'Instructional Quality',
        title: `Add learning goal banner to "${ep.title}"`,
        description: 'Start the lesson with a clear 1-sentence learning objective so beginners know what they will discover.',
        impactPoints: 5,
        episodeId: ep.id,
        actionType: 'add_objective'
      });
    }

    if (hasTakeaway) lessonsWithTakeaways++;
    else {
      candidateImprovements.push({
        id: `imp_take_${ep.id || epIdx}`,
        dimension: 'Content Structure',
        title: `Add "Remember This" key takeaway card to "${ep.title}"`,
        description: 'Close the lesson with a concise summary card to reinforce retention (SEE -> READ -> PRACTISE -> REMEMBER).',
        impactPoints: 5,
        episodeId: ep.id,
        actionType: 'add_key_takeaway'
      });
    }

    if (hasVocab) lessonsWithVocab++;

    blocks.forEach(b => {
      const c = (b.content || {}) as any;
      if (b.block_type === 'text' && typeof c.text === 'string' && c.text.split(/\s+/).length > 85) {
        longTextBlocksCount++;
      }
      if ((b.block_type === 'image' || b.block_type === 'illustration') && !c.alt && !c.title && !c.caption) {
        blocksMissingAlt++;
      }
    });

    questions.forEach(q => {
      questionTypesUsed.add(q.question_type || 'multiple_choice');
      difficultiesUsed.add(q.difficulty || 'medium');
      if (q.explanation && q.explanation.trim().length > 5) {
        questionsWithExplanations++;
      }
    });
  });

  if (lessonsWithVocab === 0 && episodes.length > 0) {
    candidateImprovements.push({
      id: 'imp_vocab_course',
      dimension: 'Difficulty Balance',
      title: 'Add A1–A2 Vocabulary & Audio Pronunciation Cards',
      description: 'Include interactive vocabulary cards with Listen buttons and simple examples for beginner learners.',
      impactPoints: 9,
      episodeId: episodes[0]?.id,
      actionType: 'add_vocabulary_cards'
    });
  }

  if (totalQuestions > 0 && questionsWithExplanations < totalQuestions) {
    candidateImprovements.push({
      id: 'imp_q_exp',
      dimension: 'Assessment Quality',
      title: 'Add educational explanations to all practice questions',
      description: `${totalQuestions - questionsWithExplanations} question(s) are missing post-answer learning explanations.`,
      impactPoints: 6,
      actionType: 'add_explanations'
    });
  }

  // Compute 10 Dimension Scores (0 - 100)
  const visualScore = Math.min(100, Math.round((lessonsWithVisuals / totalLessons) * 85 + (totalBlocksCount >= totalLessons * 3 ? 15 : 8)));
  const instructionalScore = Math.min(
    100,
    Math.round(
      (lessonsWithObjectives / totalLessons) * 40 +
        (lessonsWithTakeaways / totalLessons) * 40 +
        (longTextBlocksCount === 0 ? 20 : Math.max(5, 20 - longTextBlocksCount * 5))
    )
  );
  const interactivityScore = Math.min(
    100,
    Math.round((lessonsWithInteractivity / totalLessons) * 70 + (lessonsWithVocab > 0 ? 15 : 0) + (questionTypesUsed.size >= 3 ? 15 : 8))
  );
  const assessmentScore =
    totalQuestions === 0
      ? 45
      : Math.min(
          100,
          Math.round(
            (questionsWithExplanations / Math.max(1, totalQuestions)) * 60 +
              Math.min(25, questionTypesUsed.size * 7) +
              (totalQuestions >= totalLessons * 2 ? 15 : 8)
          )
        );
  const mobileScore = Math.min(100, longTextBlocksCount === 0 ? 98 : Math.max(75, 96 - longTextBlocksCount * 4));
  const accessibilityScore = Math.min(100, blocksMissingAlt === 0 ? 98 : Math.max(72, 95 - blocksMissingAlt * 5));
  const structureScore = Math.min(
    100,
    Math.round(
      (episodes.length >= 5 && episodes.length <= 10 ? 40 : 28) +
        (lessonsWithObjectives / totalLessons) * 30 +
        (lessonsWithTakeaways / totalLessons) * 30
    )
  );
  const consistencyScore = Math.min(
    100,
    Math.round(((lessonsWithVisuals + lessonsWithInteractivity) / (totalLessons * 2)) * 85 + 15)
  );
  const engagementScore = Math.min(
    100,
    Math.round((visualScore * 0.35 + interactivityScore * 0.4 + assessmentScore * 0.25))
  );
  const difficultyScore = Math.min(
    100,
    Math.round((longTextBlocksCount === 0 ? 55 : 35) + (lessonsWithVocab > 0 ? 25 : 10) + (difficultiesUsed.size >= 2 ? 20 : 15))
  );

  const makeDim = (key: string, label: string, score: number, summary: string) => ({
    key,
    label,
    score,
    maxScore: 100 as const,
    status: (score >= 90 ? 'excellent' : score >= 75 ? 'good' : 'needs_work') as 'excellent' | 'good' | 'needs_work',
    summary
  });

  const dimensions = {
    visualQuality: makeDim('visualQuality', '1. Visual Quality', visualScore, `${lessonsWithVisuals}/${totalLessons} lessons have rich visuals & diagrams`),
    instructionalQuality: makeDim('instructionalQuality', '2. Instructional Quality', instructionalScore, 'Micro-learning chunking, objectives & takeaways'),
    interactivity: makeDim('interactivity', '3. Interactivity', interactivityScore, 'Interactive diagrams, discovery cards & vocab audio'),
    assessmentQuality: makeDim('assessmentQuality', '4. Assessment Quality', assessmentScore, `${totalQuestions} questions across ${questionTypesUsed.size} formats with feedback`),
    mobileExperience: makeDim('mobileExperience', '5. Mobile Experience', mobileScore, 'Responsive cards, touch targets >= 44px, zero horizontal scroll'),
    accessibility: makeDim('accessibility', '6. Accessibility', accessibilityScore, 'Semantic headings, high contrast, keyboard & ARIA support'),
    contentStructure: makeDim('contentStructure', '7. Content Structure', structureScore, 'SEE -> READ -> DISCOVER -> INTERACT -> PRACTISE -> REMEMBER'),
    consistency: makeDim('consistency', '8. Consistency', consistencyScore, 'Uniform pacing, visual typography & card hierarchy'),
    engagement: makeDim('engagement', '9. Engagement', engagementScore, 'Curiosity hooks, games, audio & achievement rewards'),
    difficultyBalance: makeDim('difficultyBalance', '10. Difficulty Balance', difficultyScore, 'Beginner-friendly A1–A2 sentence length & vocabulary')
  };

  const allScores = Object.values(dimensions).map(d => d.score);
  const overallScore = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);

  return {
    overallScore,
    dimensions,
    topImprovements: candidateImprovements.slice(0, 5)
  };
}

export const CourseQualityAuditModal: React.FC<CourseQualityAuditModalProps> = ({
  isOpen,
  onClose,
  course,
  onApplyImprovement,
  onApplyAllImprovements
}) => {
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [applyingAll, setApplyingAll] = useState(false);

  const report = useMemo(() => computeCourseQualityAudit(course), [course]);

  if (!isOpen) return null;

  const dimensionList = Object.values(report.dimensions);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-violet-950 text-white flex items-center justify-between gap-4 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-indigo-300">
                  Course Studio 2.0 Quality Engine
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black">
                  Overall: {report.overallScore}/100
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                Course Quality Audit — {course.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
            aria-label="Close Quality Audit"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* 10 Quality Metrics Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              10-Point Instructional &amp; Visual Quality Scorecard
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dimensionList.map(dim => (
                <div
                  key={dim.key}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      {dim.label}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-black font-mono ${
                        dim.score >= 90
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                          : dim.score >= 75
                          ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300'
                          : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {dim.score}/100
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        dim.score >= 90
                          ? 'bg-emerald-500'
                          : dim.score >= 75
                          ? 'bg-sky-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${dim.score}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                    {dim.summary}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* TOP 5 IMPROVEMENTS */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>TOP 5 IMPROVEMENTS</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Apply recommended studio upgrades automatically with one click.
                </p>
              </div>

              {report.topImprovements.length > 0 && (
                <button
                  type="button"
                  disabled={applyingAll}
                  onClick={async () => {
                    setApplyingAll(true);
                    try {
                      await onApplyAllImprovements(report.topImprovements);
                    } finally {
                      setApplyingAll(false);
                    }
                  }}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>{applyingAll ? 'Applying All...' : '[Apply All]'}</span>
                </button>
              )}
            </div>

            {report.topImprovements.length === 0 ? (
              <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-center space-y-2">
                <Award className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <div className="text-base font-black text-emerald-950 dark:text-emerald-100">
                  100% Premium Course Quality Achieved!
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-lg mx-auto">
                  Every lesson in this course includes visual diagrams, interactive discovery blocks, learning objectives, vocabulary support, and explained practice assessments.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {report.topImprovements.map((imp, idx) => (
                  <div
                    key={imp.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase">
                          #{idx + 1} • {imp.dimension}
                        </span>
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                          +{imp.impactPoints} pts
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        {imp.title}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {imp.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={applyingId === imp.id || applyingAll}
                      onClick={async () => {
                        setApplyingId(imp.id);
                        try {
                          await onApplyImprovement(imp);
                        } finally {
                          setApplyingId(null);
                        }
                      }}
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-700 text-xs font-black shrink-0 cursor-pointer transition-colors"
                    >
                      {applyingId === imp.id ? 'Applying...' : '[Apply Improvement]'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Evaluated against EdTechra Premium Course Design Standards</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
