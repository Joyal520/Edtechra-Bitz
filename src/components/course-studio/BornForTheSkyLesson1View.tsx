import React, { useState, useEffect, useMemo } from 'react';
import { HelpCircle } from 'lucide-react';
import {
  CourseBlock,
  CourseQuestion,
  StudentQuestionResponse
} from '@/types/courseStudio';
import { ComprehensiveQuestionRenderer } from '@/components/course-studio/ComprehensiveQuestionRenderer';
import { getValidLessonQuestions } from '@/components/course-studio/CourseContentRenderer';

interface BornForTheSkyLesson1ViewProps {
  blocks: CourseBlock[];
  questions: CourseQuestion[];
  userAnswers?: Record<string, string>;
  feedbackState?: Record<string, { isCorrect: boolean; showExplanation: boolean; selected: string }>;
  isLessonCompleted?: boolean;
  allowQuestionRetries?: boolean;
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

interface StoryPart {
  id: string;
  partLabel: string;
  title: string;
  imageUrl: string;
  imageAlt: string;
  accentBg: string;
  badgeColor: string;
  paragraphs: string[];
}

const STORY_PARTS: StoryPart[] = [
  {
    id: 'part-1',
    partLabel: 'Part 1',
    title: 'The Egg Rolls Away',
    imageUrl: '/images/born-for-the-sky/01_part1_the_egg_rolls_away.jpg',
    imageAlt: 'An eagle nest on a tall mountain with a small egg rolling down toward a farm',
    accentBg: 'bg-gradient-to-br from-[#fffdf7] to-[#f0f9ff] border-sky-200/80',
    badgeColor: 'bg-sky-600 text-white',
    paragraphs: [
      'High on a tall mountain, an eagle lived with her babies.',
      'One day, one small egg rolled away from the nest. It went down the mountain and reached a farm.'
    ]
  },
  {
    id: 'part-2',
    partLabel: 'Part 2',
    title: 'A Warm Nest Among Chickens',
    imageUrl: '/images/born-for-the-sky/02_part2_a_warm_nest_among_chickens.jpg',
    imageAlt: 'A mother hen keeping the eagle egg warm with her chicks in the nest',
    accentBg: 'bg-gradient-to-br from-[#fffdf7] to-[#fef9e7] border-amber-200/80',
    badgeColor: 'bg-amber-500 text-slate-950',
    paragraphs: [
      'A chicken found the egg and put it in her nest. She kept it warm with her other eggs.',
      'After some days, the eggs opened. Little chicks came out. One baby bird looked different. He was bigger and had strong wings. But he did not know that he was an eagle.'
    ]
  },
  {
    id: 'part-3',
    partLabel: 'Part 3',
    title: 'Looking Up at the Sky',
    imageUrl: '/images/born-for-the-sky/03_part3_looking_up_at_the_sky.jpg',
    imageAlt: 'The young eagle walking on the farmyard ground and looking up at the sky',
    accentBg: 'bg-gradient-to-br from-[#fffdf7] to-[#f0fdf4] border-emerald-200/80',
    badgeColor: 'bg-emerald-600 text-white',
    paragraphs: [
      'He lived with the chickens and walked on the ground. The chickens told him, “You are one of us. You cannot fly.”',
      'The young bird believed them. But every morning, he looked at the sky and felt something inside him. He wanted to fly.'
    ]
  },
  {
    id: 'part-4',
    partLabel: 'Part 4',
    title: 'Born for the Sky',
    imageUrl: '/images/born-for-the-sky/04_part4_born_for_the_sky.jpg',
    imageAlt: 'The young eagle spreading his wings and soaring high into the golden sky',
    accentBg: 'bg-gradient-to-br from-[#f0f9ff] via-[#fffdf7] to-[#fef9e7] border-sky-300/80',
    badgeColor: 'bg-sky-700 text-white',
    paragraphs: [
      'One day, he climbed a high hill. He opened his wings and jumped. He fell for a moment. Then the wind lifted him.',
      'He flew higher and higher. At last, he understood: he was born for the sky.'
    ]
  }
];

export const BornForTheSkyLesson1View: React.FC<BornForTheSkyLesson1ViewProps> = ({
  questions,
  userAnswers = {},
  feedbackState = {},
  isLessonCompleted = false,
  allowQuestionRetries = true,
  onQuestionAnswer,
  onProgressChange
}) => {
  const validQuestions = useMemo(() => getValidLessonQuestions(questions), [questions]);

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

  useEffect(() => {
    if (onProgressChange) {
      const answeredCount = validQuestions.filter(q => Boolean(responses[q.id])).length;
      onProgressChange(answeredCount, validQuestions.length);
    }
  }, [responses, validQuestions, onProgressChange]);

  const answeredCount = validQuestions.filter(q => Boolean(responses[q.id])).length;

  return (
    <div className="space-y-6 sm:space-y-8 text-slate-900">
      {/* 1. ILLUSTRATED STORY PARTS (4 INTEGRATED CHAPTERS) */}
      <section className="space-y-5 sm:space-y-6" aria-label="Story Parts">
        {STORY_PARTS.map((part, idx) => {
          const isImageLeft = idx % 2 === 1;
          return (
            <article
              key={part.id}
              data-testid={`story-${part.id}`}
              className={`rounded-3xl border p-5 sm:p-7 shadow-sm transition-all ${part.accentBg}`}
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-7 items-center">
                {/* Story Text */}
                <div
                  className={`md:col-span-7 space-y-3 ${
                    isImageLeft ? 'md:order-2' : 'md:order-1'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${part.badgeColor}`}
                    >
                      {part.partLabel}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {part.title}
                  </h2>
                  <div className="space-y-3 text-base sm:text-[18px] leading-[1.8] text-slate-800 font-medium">
                    {part.paragraphs.map((paragraph, pIdx) => (
                      <p key={pIdx}>{paragraph}</p>
                    ))}
                  </div>
                </div>

                {/* Story Part Illustration */}
                <div
                  className={`md:col-span-5 ${
                    isImageLeft ? 'md:order-1' : 'md:order-2'
                  }`}
                >
                  <div className="rounded-2xl overflow-hidden bg-white p-2 border border-white shadow-sm">
                    <img
                      src={part.imageUrl}
                      alt={part.imageAlt}
                      loading={idx === 0 ? 'eager' : 'lazy'}
                      className="w-full aspect-[4/3] object-cover rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* 2. EXISTING LESSON 1 COMPREHENSION CHECK */}
      {validQuestions.length > 0 && (
        <section className="rounded-3xl bg-white border border-sky-200/90 p-5 sm:p-7 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-sky-700 block">
                  Comprehension Check
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  Answer the Story Questions
                </h3>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-black">
              {answeredCount} / {validQuestions.length} Answered
            </span>
          </div>

          <div className="space-y-4">
            {validQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="rounded-2xl bg-slate-50/70 border border-slate-200/80 p-3 sm:p-4"
              >
                <ComprehensiveQuestionRenderer
                  question={q}
                  index={idx}
                  mode="student"
                  response={responses[q.id]}
                  allowRetryIncorrect={allowQuestionRetries && !isLessonCompleted}
                  onAnswerSubmit={result => {
                    setResponses(prev => ({ ...prev, [q.id]: result }));
                    if (onQuestionAnswer) {
                      onQuestionAnswer(
                        q.id,
                        String(result.answer || ''),
                        result.status === 'correct',
                        result.score || 0,
                        q,
                        result
                      );
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
