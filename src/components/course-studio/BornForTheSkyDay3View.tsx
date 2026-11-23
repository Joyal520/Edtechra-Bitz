import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  CheckCircle2,
  Puzzle,
  HelpCircle,
  CheckSquare,
  BookOpen,
  Star,
  Sparkles,
  Unlock
} from 'lucide-react';
import {
  CourseBlock,
  CourseQuestion,
  StudentQuestionResponse
} from '@/types/courseStudio';
import { ComprehensiveQuestionRenderer } from '@/components/course-studio/ComprehensiveQuestionRenderer';
import { InteractiveJigsawPuzzle } from '@/components/course-studio/InteractiveJigsawPuzzle';
import { getValidLessonQuestions } from '@/components/course-studio/CourseContentRenderer';

interface BornForTheSkyDay3ViewProps {
  blocks: CourseBlock[];
  questions: CourseQuestion[];
  userAnswers?: Record<string, string>;
  feedbackState?: Record<string, { isCorrect: boolean; showExplanation: boolean; selected: string }>;
  isLessonCompleted?: boolean;
  onQuestionAnswer?: (
    questionId: string,
    answer: string,
    isCorrect: boolean,
    pointsAwarded: number,
    question: CourseQuestion,
    responseMeta?: StudentQuestionResponse
  ) => void;
  onProgressChange?: (answeredCount: number, totalCount: number) => void;
}

const DEFAULT_DAY3_IMAGE =
  'https://pub-5b308f0d53ca4cf3bf3ad3630d2b86d5.r2.dev/courses/blocks/covers/548eea36-a825-4c69-9ca3-89fc06218c39/1788012269491_a74f8a3d.webp';

export const BornForTheSkyDay3View: React.FC<BornForTheSkyDay3ViewProps> = ({
  blocks,
  questions,
  userAnswers = {},
  feedbackState = {},
  isLessonCompleted = false,
  onQuestionAnswer,
  onProgressChange
}) => {
  const validQuestions = useMemo(() => getValidLessonQuestions(questions), [questions]);

  const day3ImageUrl = useMemo(() => {
    for (const b of blocks || []) {
      const url = (b.content as any)?.url || (b.content as any)?.image?.url;
      if (url && typeof url === 'string') return url;
    }
    return DEFAULT_DAY3_IMAGE;
  }, [blocks]);

  // Partition questions into the 4 sequential stages
  const jigsawQuestion = useMemo(
    () =>
      validQuestions.find(
        q => (q.options as any)?.activity_type === 'jigsaw_puzzle' || (q.question_type === 'ordering' && q.order_index === 0)
      ),
    [validQuestions]
  );

  const mcqQuestions = useMemo(
    () => validQuestions.filter(q => q.question_type === 'multiple_choice').slice(0, 3),
    [validQuestions]
  );

  const tfQuestions = useMemo(
    () => validQuestions.filter(q => q.question_type === 'true_false').slice(0, 2),
    [validQuestions]
  );

  const clozeQuestion = useMemo(
    () => validQuestions.find(q => q.question_type === 'cloze_passage'),
    [validQuestions]
  );

  // Restore saved attempts from Supabase props (prevents localStorage-only state and survives refresh)
  const [responses, setResponses] = useState<Record<string, StudentQuestionResponse>>(() => {
    const initial: Record<string, StudentQuestionResponse> = {};
    for (const q of validQuestions) {
      const savedAnswer = userAnswers[q.id];
      const savedFeedback = feedbackState[q.id];
      if (savedAnswer !== undefined || savedFeedback) {
        initial[q.id] = {
          questionId: q.id,
          answer: savedAnswer ?? savedFeedback?.selected ?? '',
          status: savedFeedback?.isCorrect ? 'correct' : 'incorrect',
          score: savedFeedback?.isCorrect ? q.points || 10 : 0,
          maxScore: q.points || 10,
          feedback: q.explanation || '',
          evaluatedAt: new Date().toISOString()
        };
      }
    }
    return initial;
  });

  // Sync if userAnswers/feedbackState hydrate asynchronously after mount
  useEffect(() => {
    setResponses(prev => {
      let changed = false;
      const next = { ...prev };
      for (const q of validQuestions) {
        if (next[q.id]) continue;
        const savedAnswer = userAnswers[q.id];
        const savedFeedback = feedbackState[q.id];
        if (savedAnswer !== undefined || savedFeedback) {
          changed = true;
          next[q.id] = {
            questionId: q.id,
            answer: savedAnswer ?? savedFeedback?.selected ?? '',
            status: savedFeedback?.isCorrect ? 'correct' : 'incorrect',
            score: savedFeedback?.isCorrect ? q.points || 10 : 0,
            maxScore: q.points || 10,
            feedback: q.explanation || '',
            evaluatedAt: new Date().toISOString()
          };
        }
      }
      return changed ? next : prev;
    });
  }, [validQuestions, userAnswers, feedbackState]);

  const isPuzzleCompleted = jigsawQuestion ? Boolean(responses[jigsawQuestion.id]) : true;
  const isMcqUnlocked = isPuzzleCompleted;
  const isMcqCompleted =
    mcqQuestions.length > 0 && mcqQuestions.every(q => Boolean(responses[q.id]));

  const isTfUnlocked = isPuzzleCompleted && isMcqCompleted;
  const isTfCompleted =
    tfQuestions.length > 0 && tfQuestions.every(q => Boolean(responses[q.id]));

  const isClozeUnlocked = isPuzzleCompleted && isMcqCompleted && isTfCompleted;
  const isClozeCompleted = clozeQuestion ? Boolean(responses[clozeQuestion.id]) : true;

  const totalAnswered = validQuestions.filter(q => Boolean(responses[q.id])).length;
  const allStepsCompleted = isPuzzleCompleted && isMcqCompleted && isTfCompleted && isClozeCompleted;

  useEffect(() => {
    if (onProgressChange) {
      onProgressChange(totalAnswered, validQuestions.length);
    }
  }, [totalAnswered, validQuestions.length, onProgressChange]);

  const totalEarnedPoints = useMemo(() => {
    return validQuestions.reduce((sum, q) => sum + (responses[q.id]?.score || 0), 0);
  }, [validQuestions, responses]);

  const handleCommitResponse = (q: CourseQuestion, result: StudentQuestionResponse) => {
    setResponses(prev => {
      if (prev[q.id]) return prev; // Prevent repeated score farming
      return { ...prev, [q.id]: result };
    });
    if (!responses[q.id] && onQuestionAnswer) {
      onQuestionAnswer(
        q.id,
        String(result.answer || ''),
        result.status === 'correct',
        result.score || 0,
        q,
        result
      );
    }
  };

  const steps = [
    {
      num: 1,
      label: 'Jigsaw Puzzle',
      points: 20,
      icon: Puzzle,
      completed: isPuzzleCompleted,
      unlocked: true
    },
    {
      num: 2,
      label: '3 MCQs',
      points: 30,
      icon: HelpCircle,
      completed: isMcqCompleted,
      unlocked: isMcqUnlocked
    },
    {
      num: 3,
      label: '2 True/False',
      points: 20,
      icon: CheckSquare,
      completed: isTfCompleted,
      unlocked: isTfUnlocked
    },
    {
      num: 4,
      label: 'Cloze Passage',
      points: 30,
      icon: BookOpen,
      completed: isClozeCompleted,
      unlocked: isClozeUnlocked
    }
  ];

  return (
    <div className="space-y-6 sm:space-y-8 text-slate-900">
      {/* 1. DAY 3 PROGRESSION & POINTS TRACKER */}
      <section className="rounded-3xl bg-white border-2 border-sky-200 p-4 sm:p-6 shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-sky-700 block">
              Day 3 • Sequential Learning Quest
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Puzzle, Comprehension & Vocabulary Challenge
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-950 text-xs sm:text-sm font-black shadow-2xs">
              <Star className="w-4 h-4 fill-amber-500 text-amber-600" />
              <span>{totalEarnedPoints} / 100 XP</span>
            </span>
          </div>
        </div>

        {/* 4-Step Visual Roadmap Pills */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {steps.map(step => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 transition-all ${
                  step.completed
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : step.unlocked
                    ? 'bg-sky-50 border-sky-400 text-sky-950 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-400 opacity-80'
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    step.completed
                      ? 'bg-emerald-500 text-white'
                      : step.unlocked
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : step.unlocked ? (
                    <Icon className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 text-[10px] font-black uppercase tracking-wider">
                    <span>Step {step.num} • {step.points} XP</span>
                    <span>
                      {step.completed ? '🟢 Completed' : step.unlocked ? '🔵 Available' : '🔒 Locked'}
                    </span>
                  </div>
                  <div className="text-xs font-extrabold truncate">{step.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. STEP 1 — JIGSAW PUZZLE (20 XP) */}
      {jigsawQuestion && (
        <InteractiveJigsawPuzzle
          imageUrl={(jigsawQuestion.options as any)?.image_url || day3ImageUrl}
          gridSize={(jigsawQuestion.options as any)?.grid_rows || 2}
          points={jigsawQuestion.points || 20}
          isCompleted={isPuzzleCompleted}
          onComplete={() => {
            const result: StudentQuestionResponse = {
              questionId: jigsawQuestion.id,
              answer: 'puzzle_completed',
              status: 'correct',
              score: jigsawQuestion.points || 20,
              maxScore: jigsawQuestion.points || 20,
              feedback: jigsawQuestion.explanation || 'Puzzle completed!',
              evaluatedAt: new Date().toISOString()
            };
            handleCommitResponse(jigsawQuestion, result);
          }}
        />
      )}

      {/* 3. STEP 2 — THREE MCQ QUESTIONS (30 XP) */}
      <section
        data-testid="day3-mcq-section"
        className={`rounded-3xl border-2 p-5 sm:p-6 transition-all ${
          isMcqUnlocked
            ? 'bg-white border-sky-200 shadow-md space-y-5'
            : 'bg-slate-50 border-slate-200 opacity-85'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                isMcqCompleted
                  ? 'bg-emerald-500 text-white'
                  : isMcqUnlocked
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {isMcqCompleted ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : isMcqUnlocked ? (
                <Unlock className="w-5 h-5" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
            </span>
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-sky-700 block">
                Step 2 • 3 Multiple Choice Questions (30 XP)
              </span>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                Scene Comprehension Quiz
              </h3>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-black bg-sky-50 border border-sky-200 text-sky-800">
            {mcqQuestions.filter(q => Boolean(responses[q.id])).length} / {mcqQuestions.length} Answered
          </span>
        </div>

        {!isMcqUnlocked ? (
          <div className="mt-4 p-6 rounded-2xl bg-white/80 border border-dashed border-slate-300 text-center space-y-2">
            <Lock className="w-7 h-7 text-slate-400 mx-auto" />
            <p className="text-sm font-black text-slate-700">
              Locked — Complete the Jigsaw Puzzle First
            </p>
            <p className="text-xs text-slate-500">
              Solve Step 1 above to unlock these 3 Multiple Choice Questions.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {mcqQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="rounded-2xl bg-slate-50/80 border border-slate-200 p-3 sm:p-4"
              >
                <ComprehensiveQuestionRenderer
                  question={q}
                  index={idx}
                  mode="student"
                  response={responses[q.id]}
                  allowRetryIncorrect={false}
                  onAnswerSubmit={result => handleCommitResponse(q, result)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. STEP 3 — TWO TRUE/FALSE QUESTIONS (20 XP) */}
      <section
        data-testid="day3-tf-section"
        className={`rounded-3xl border-2 p-5 sm:p-6 transition-all ${
          isTfUnlocked
            ? 'bg-white border-amber-200 shadow-md space-y-5'
            : 'bg-slate-50 border-slate-200 opacity-85'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                isTfCompleted
                  ? 'bg-emerald-500 text-white'
                  : isTfUnlocked
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {isTfCompleted ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : isTfUnlocked ? (
                <Unlock className="w-5 h-5" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
            </span>
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-800 block">
                Step 3 • 2 True / False Questions (20 XP)
              </span>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                Fact Check Challenge
              </h3>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-50 border border-amber-200 text-amber-900">
            {tfQuestions.filter(q => Boolean(responses[q.id])).length} / {tfQuestions.length} Answered
          </span>
        </div>

        {!isTfUnlocked ? (
          <div className="mt-4 p-6 rounded-2xl bg-white/80 border border-dashed border-slate-300 text-center space-y-2">
            <Lock className="w-7 h-7 text-slate-400 mx-auto" />
            <p className="text-sm font-black text-slate-700">
              Locked — Complete All 3 MCQs First
            </p>
            <p className="text-xs text-slate-500">
              Answer all 3 Multiple Choice Questions in Step 2 to unlock True / False.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tfQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="rounded-2xl bg-amber-50/40 border border-amber-200/80 p-3 sm:p-4"
              >
                <ComprehensiveQuestionRenderer
                  question={q}
                  index={idx}
                  mode="student"
                  response={responses[q.id]}
                  allowRetryIncorrect={false}
                  onAnswerSubmit={result => handleCommitResponse(q, result)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. STEP 4 — EXISTING CLOZE PASSAGE (30 XP) */}
      {clozeQuestion && (
        <section
          data-testid="day3-cloze-section"
          className={`rounded-3xl border-2 p-5 sm:p-6 transition-all ${
            isClozeUnlocked
              ? 'bg-white border-emerald-200 shadow-md space-y-5'
              : 'bg-slate-50 border-slate-200 opacity-85'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  isClozeCompleted
                    ? 'bg-emerald-500 text-white'
                    : isClozeUnlocked
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isClozeCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : isClozeUnlocked ? (
                  <Unlock className="w-5 h-5" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
              </span>
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-700 block">
                  Step 4 • Existing Cloze Passage (30 XP)
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  Complete the Scene Story Passage
                </h3>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 border border-emerald-200 text-emerald-800">
              {isClozeCompleted ? '✓ Completed' : isClozeUnlocked ? 'Unlocked' : 'Locked'}
            </span>
          </div>

          {!isClozeUnlocked ? (
            <div className="mt-4 p-6 rounded-2xl bg-white/80 border border-dashed border-slate-300 text-center space-y-2">
              <Lock className="w-7 h-7 text-slate-400 mx-auto" />
              <p className="text-sm font-black text-slate-700">
                Locked — Complete Both True / False Questions First
              </p>
              <p className="text-xs text-slate-500">
                Finish Step 3 above to unlock the Cloze Passage activity.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-emerald-50/40 border border-emerald-200/80 p-3 sm:p-4">
              <ComprehensiveQuestionRenderer
                question={clozeQuestion}
                index={0}
                mode="student"
                response={responses[clozeQuestion.id]}
                allowRetryIncorrect={false}
                onAnswerSubmit={result => handleCommitResponse(clozeQuestion, result)}
              />
            </div>
          )}
        </section>
      )}

      {/* 6. ALL STEPS COMPLETE BANNER */}
      {allStepsCompleted && (
        <div className="rounded-3xl bg-gradient-to-r from-emerald-50 via-sky-50 to-amber-50 border-2 border-emerald-300 p-5 sm:p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-black text-slate-900">
                All Day 3 Activities Complete!
              </h4>
              <p className="text-xs sm:text-sm font-medium text-slate-700">
                You earned <strong>{totalEarnedPoints} / 100 XP</strong> across the Jigsaw Puzzle, MCQs, True/False, and Cloze Passage.
                {!isLessonCompleted && ' Click "Complete Lesson" below to save your Day 3 score and claim your Course Completion Bonus!'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
