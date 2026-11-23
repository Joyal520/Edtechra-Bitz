import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Sparkles,
  Volume2,
  VolumeX,
  Feather,
  Mountain,
  Sun,
  Wind,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
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

const DEFAULT_LESSON1_IMAGE =
  'https://pub-5b308f0d53ca4cf3bf3ad3630d2b86d5.r2.dev/courses/774af599-7c7e-46b9-9ad9-832a6f45d105/media/548eea36-a825-4c69-9ca3-89fc06218c39/1788004302711_502d91a2.webp';

interface VocabItem {
  word: string;
  meaning: string;
  example: string;
}

const STORY_VOCABULARY: VocabItem[] = [
  {
    word: 'mountain',
    meaning: 'A very tall, high landform rising above the land.',
    example: 'High on a tall mountain, an eagle lived with her babies.'
  },
  {
    word: 'nest',
    meaning: 'A safe home built by birds for their eggs and babies.',
    example: 'A chicken found the egg and put it in her nest.'
  },
  {
    word: 'chicks',
    meaning: 'Baby birds that have just hatched from eggs.',
    example: 'After some days, little chicks came out.'
  },
  {
    word: 'wings',
    meaning: 'The parts of a bird that help it fly in the air.',
    example: 'He was bigger and had strong wings.'
  },
  {
    word: 'eagle',
    meaning: 'A large, powerful bird that flies high in the sky.',
    example: 'But he did not know that he was an eagle.'
  },
  {
    word: 'lifted',
    meaning: 'Raised or carried something upward into the air.',
    example: 'Then the wind lifted him.'
  }
];

const STORY_SCENES = [
  {
    id: 'scene-1',
    badge: 'Part 1 • The Mountain',
    title: 'The Egg Rolls Away',
    icon: Mountain,
    accentBg: 'bg-sky-50 border-sky-200',
    badgeColor: 'bg-sky-600 text-white',
    paragraphs: [
      'High on a tall mountain, an eagle lived with her babies. One day, one small egg rolled away from the nest. It went down the mountain and reached a farm.'
    ]
  },
  {
    id: 'scene-2',
    badge: 'Part 2 • The Farmyard',
    title: 'A Warm Nest Among Chickens',
    icon: Sun,
    accentBg: 'bg-amber-50/80 border-amber-200',
    badgeColor: 'bg-amber-500 text-slate-950',
    paragraphs: [
      'A chicken found the egg and put it in her nest. She kept it warm with her other eggs.',
      'After some days, the eggs opened. Little chicks came out. One baby bird looked different. He was bigger and had strong wings. But he did not know that he was an eagle.'
    ]
  },
  {
    id: 'scene-3',
    badge: 'Part 3 • Growing Up',
    title: 'Looking Up at the Sky',
    icon: Feather,
    accentBg: 'bg-emerald-50/70 border-emerald-200',
    badgeColor: 'bg-emerald-600 text-white',
    paragraphs: [
      'He lived with the chickens and walked on the ground. The chickens told him, “You are one of us. You cannot fly.”',
      'The young bird believed them. But every morning, he looked at the sky and felt something inside him. He wanted to fly.'
    ]
  },
  {
    id: 'scene-4',
    badge: 'Part 4 • Flight',
    title: 'Born for the Sky',
    icon: Wind,
    accentBg: 'bg-gradient-to-br from-sky-50 via-amber-50/60 to-yellow-50 border-sky-300',
    badgeColor: 'bg-sky-700 text-white',
    paragraphs: [
      'One day, he climbed a high hill. He opened his wings and jumped. He fell for a moment. Then the wind lifted him.',
      'He flew higher and higher. At last, he understood: he was born for the sky.'
    ]
  }
];

function highlightVocabulary(text: string, onSelectWord: (word: string) => void): React.ReactNode {
  const words = STORY_VOCABULARY.map(v => v.word);
  const regex = new RegExp(`\\b(${words.join('|')})\\b`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    const matched = STORY_VOCABULARY.find(v => v.word.toLowerCase() === part.toLowerCase());
    if (!matched) return <React.Fragment key={idx}>{part}</React.Fragment>;
    return (
      <button
        key={idx}
        type="button"
        onClick={() => onSelectWord(matched.word)}
        className="inline px-1.5 py-0.5 mx-0.5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold border-b-2 border-amber-400 transition-colors cursor-pointer"
        title={`Tap to see meaning of "${matched.word}"`}
      >
        {part}
      </button>
    );
  });
}

export const BornForTheSkyLesson1View: React.FC<BornForTheSkyLesson1ViewProps> = ({
  blocks,
  questions,
  userAnswers = {},
  feedbackState = {},
  isLessonCompleted = false,
  allowQuestionRetries = true,
  onQuestionAnswer,
  onProgressChange
}) => {
  const [selectedVocabWord, setSelectedVocabWord] = useState<string>(STORY_VOCABULARY[0].word);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Extract existing Lesson 1 image from blocks if present
  const lessonImageUrl = useMemo(() => {
    for (const b of blocks || []) {
      const url = (b.content as any)?.image?.url || (b.content as any)?.url;
      if (url && typeof url === 'string') return url;
    }
    return DEFAULT_LESSON1_IMAGE;
  }, [blocks]);

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

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleReadAloud = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const fullStory = STORY_SCENES.map(s => s.paragraphs.join(' ')).join(' ');
    const utterance = new SpeechSynthesisUtterance(fullStory);
    utterance.rate = 0.92;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const activeVocab =
    STORY_VOCABULARY.find(v => v.word.toLowerCase() === selectedVocabWord.toLowerCase()) ||
    STORY_VOCABULARY[0];

  const answeredCount = validQuestions.filter(q => Boolean(responses[q.id])).length;

  return (
    <div className="space-y-6 sm:space-y-8 text-slate-900">
      {/* 1. WARM INTRODUCTORY STORY CARD */}
      <section className="rounded-3xl bg-gradient-to-br from-[#fffdf7] via-[#fef9e7] to-[#eef8ff] border-2 border-amber-200/80 p-5 sm:p-8 shadow-md space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-sky-700 block">
                Day 1 • Interactive Story
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Read & Discover: Born for the Sky
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleReadAloud}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer shadow-xs ${
              isSpeaking
                ? 'bg-rose-500 hover:bg-rose-600 text-white'
                : 'bg-sky-600 hover:bg-sky-700 text-white'
            }`}
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isSpeaking ? 'Stop Audio' : 'Listen to Story'}</span>
          </button>
        </div>

        {/* Featured Story Illustration — clean, uncropped presentation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6">
            <div className="rounded-2xl bg-white p-3 border border-amber-200/80 shadow-sm">
              <img
                src={lessonImageUrl}
                alt="Mother hen, chicks, and the young eagle looking up at the sky"
                className="w-full max-h-[340px] object-contain rounded-xl mx-auto"
              />
              <p className="text-center text-xs font-bold text-slate-600 mt-2.5">
                A young eagle grows up in a farmyard among chickens—until he discovers his true wings.
              </p>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="p-4 rounded-2xl bg-white/90 border border-sky-200/80 space-y-2 shadow-2xs">
              <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-sky-700">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>What You Will Learn Today</span>
              </div>
              <ul className="space-y-2 text-sm font-medium text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Read the inspiring story of the young eagle step by step.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Tap highlighted yellow words to explore their meanings.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Answer {validQuestions.length} comprehension questions to earn Day 1 XP.</span>
                </li>
              </ul>
            </div>

            {/* Interactive Vocabulary Spotlight Card */}
            <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300/80 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                  Vocabulary Spotlight
                </span>
                <span className="text-[11px] font-bold text-amber-700">Tap any word below</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STORY_VOCABULARY.map(v => (
                  <button
                    key={v.word}
                    type="button"
                    onClick={() => setSelectedVocabWord(v.word)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      activeVocab.word === v.word
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-white text-slate-700 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    {v.word}
                  </button>
                ))}
              </div>
              <div className="p-3 rounded-xl bg-white border border-amber-200/80 space-y-1">
                <div className="text-sm font-black text-slate-900 capitalize">{activeVocab.word}</div>
                <div className="text-xs sm:text-sm font-medium text-slate-700">{activeVocab.meaning}</div>
                <div className="text-xs italic text-sky-800">“{activeVocab.example}”</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. VISUAL STORYTELLING SCENES */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Feather className="w-5 h-5 text-sky-600" />
          <h3 className="text-lg sm:text-xl font-black text-slate-900">The Story</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STORY_SCENES.map(scene => {
            const Icon = scene.icon;
            return (
              <article
                key={scene.id}
                className={`rounded-2xl border-2 p-5 sm:p-6 shadow-sm space-y-3 transition-all hover:shadow-md ${scene.accentBg}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${scene.badgeColor}`}>
                    {scene.badge}
                  </span>
                  <Icon className="w-5 h-5 text-slate-600" />
                </div>
                <h4 className="text-base sm:text-lg font-black text-slate-900">{scene.title}</h4>
                <div className="space-y-2.5 text-base sm:text-[17px] leading-[1.75] text-slate-800 font-medium">
                  {scene.paragraphs.map((p, idx) => (
                    <p key={idx}>{highlightVocabulary(p, setSelectedVocabWord)}</p>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 3. EXISTING LESSON 1 COMPREHENSION CHECK */}
      {validQuestions.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-sky-200/80 p-5 sm:p-7 shadow-md space-y-5">
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
