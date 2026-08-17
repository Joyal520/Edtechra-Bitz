import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Lightbulb,
  BookOpen,
  Volume2,
  Check,
  X as XIcon,
  ArrowRight
} from 'lucide-react';
import { YouTubeVideo, QuizQuestion } from '@/types';
import { youtubeClient } from '@/services/youtubeClient';

export const BitzLessonPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<YouTubeVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [questionId: string]: string }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  useEffect(() => {
    async function loadVideo() {
      if (!id) return;
      setLoading(true);
      try {
        const data = await youtubeClient.getVideo(id);
        setVideo(data);
      } catch (err) {
        console.error('Error fetching video detail:', err);
      } finally {
        setLoading(false);
      }
    }
    loadVideo();
  }, [id]);

  const handleAnswerSelect = (questionId: string, optionId: string) => {
    if (quizSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleQuizSubmit = () => {
    if (!video?.learning_content?.quiz) return;
    const questions = video.learning_content.quiz;
    let score = 0;

    questions.forEach(q => {
      const selected = selectedAnswers[q.id];
      const correct = q.options.find(opt => opt.isCorrect)?.id;
      if (selected === correct) {
        score += 1;
      }
    });

    setQuizScore(score);
    setQuizSubmitted(true);
  };

  const handleCompleteLesson = async () => {
    if (!video) return;
    setSavingProgress(true);

    try {
      await youtubeClient.saveProgress({
        videoId: video.youtube_video_id,
        watched: true,
        quizCompleted: true,
        quizScore: quizScore,
        quizTotal: video.learning_content?.quiz?.length || 3,
        completed: true
      });
      setIsCompleted(true);
    } catch (err) {
      console.error('Error saving progress:', err);
      setIsCompleted(true);
    } finally {
      setSavingProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 bg-slate-200 rounded-xl w-1/3 animate-pulse"></div>
        <div className="aspect-[16/9] bg-slate-200 rounded-3xl animate-pulse"></div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Bitz Not Found</h2>
        <p className="text-xs text-slate-500">The requested learning Short could not be found.</p>
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#026fc3] text-white text-xs font-bold rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Explore
        </Link>
      </div>
    );
  }

  const steps = [
    { id: 1, name: 'Watch', icon: Play },
    { id: 2, name: 'Understand', icon: BookOpen },
    { id: 3, name: 'Vocabulary', icon: Lightbulb },
    { id: 4, name: 'Quiz', icon: HelpCircle },
  ];

  const content = video.learning_content;
  const questions: QuizQuestion[] = content?.quiz || [];
  const vocabulary = content?.vocabulary || [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5 pb-16">
      
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-1.5 rounded-2xl shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Explore
        </Link>
        
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-[#026fc3] bg-brand-50 border border-brand-200 px-3 py-1 rounded-full flex items-center gap-1 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> +40 XP Reward
          </span>
        </div>
      </div>

      {/* Lesson Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 bg-[#026fc3] text-white text-[10px] font-extrabold rounded-md uppercase tracking-wider">
            {video.category}
          </span>
          <span className="text-xs text-slate-400 font-semibold">
            {video.duration_formatted || 'Short (11s)'}
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-[#0f233a] tracking-tight">
          {video.title}
        </h1>
      </div>

      {/* Step Navigation Tabs */}
      <div className="flex items-center justify-between bg-white border border-stone-200/80 rounded-2xl p-1.5 shadow-xs">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = activeStep === step.id;
          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-[#026fc3] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{step.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Step Card */}
      <div className="bg-white border border-stone-200/80 rounded-3xl p-5 sm:p-7 shadow-sm min-h-[380px] flex flex-col justify-between space-y-6">
        
        {/* STEP 1: WATCH */}
        {activeStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Play className="w-4 h-4 text-[#026fc3]" /> Step 1: Watch the YouTube Short
              </h2>
              <span className="text-xs text-slate-400 font-semibold">
                Official YouTube Player
              </span>
            </div>

            <div className="relative aspect-[9/16] max-w-[300px] mx-auto bg-black rounded-3xl overflow-hidden shadow-xl border border-slate-200">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${video.youtube_video_id}?autoplay=1&rel=0&modestbranding=1`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              ></iframe>
            </div>

            <div className="p-3.5 bg-brand-50 border border-brand-100 rounded-2xl text-xs text-brand-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Key Insight:</strong>{' '}
                {content?.key_takeaway || 'Watch carefully and pay attention to how this principle affects everyday life.'}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: UNDERSTAND */}
        {activeStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#026fc3]" /> Step 2: Understand the Concept
            </h2>
            
            <div className="p-5 bg-stone-50 border border-stone-200/80 rounded-2xl text-slate-800 text-sm leading-relaxed space-y-3">
              <div className="font-bold text-[#0f233a] text-base">
                {video.title}
              </div>
              <p>
                {content?.summary || video.description}
              </p>
            </div>

            {content?.learning_objectives && content.learning_objectives.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Learning Objectives
                </h3>
                <div className="space-y-1.5">
                  {content.learning_objectives.map((obj, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{obj}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: KEY VOCABULARY */}
        {activeStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" /> Step 3: Key Vocabulary ({vocabulary.length} Words)
              </h2>
              <span className="text-xs text-slate-400 font-semibold">Word Bank</span>
            </div>

            <div className="space-y-3">
              {vocabulary.map((vocab, index) => (
                <div
                  key={index}
                  className="p-4 bg-slate-50 hover:bg-white border border-slate-200 rounded-2xl space-y-2 shadow-2xs transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-[#026fc3]">{vocab.word}</span>
                      {vocab.pronunciation && (
                        <span className="text-xs text-slate-400 font-mono">{vocab.pronunciation}</span>
                      )}
                      {vocab.part_of_speech && (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-md italic">
                          {vocab.part_of_speech}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const utterance = new SpeechSynthesisUtterance(vocab.word);
                        window.speechSynthesis.speak(utterance);
                      }}
                      className="p-1 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Pronounce word"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="text-xs text-slate-700">
                    <strong>Meaning:</strong> {vocab.definition}
                  </div>
                  
                  <div className="text-[11px] text-slate-500 italic bg-white p-2 rounded-xl border border-slate-100">
                    " {vocab.example} "
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: QUICK QUIZ */}
        {activeStep === 4 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#026fc3]" /> Step 4: Quick Mastery Quiz
              </h2>
              {quizSubmitted && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  Score: {quizScore}/{questions.length} ({Math.round((quizScore / questions.length) * 100)}%)
                </span>
              )}
            </div>

            <div className="space-y-5">
              {questions.map((q, qIndex) => {
                const selected = selectedAnswers[q.id];

                return (
                  <div key={q.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {qIndex + 1}
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        {q.question}
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      {q.options.map((opt) => {
                        const isChosen = selected === opt.id;
                        let optionStyle = 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100';

                        if (quizSubmitted) {
                          if (opt.isCorrect) {
                            optionStyle = 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold';
                          } else if (isChosen && !opt.isCorrect) {
                            optionStyle = 'bg-rose-50 border-rose-400 text-rose-800 line-through';
                          }
                        } else if (isChosen) {
                          optionStyle = 'bg-brand-50 border-brand-500 text-brand-800 font-bold';
                        }

                        return (
                          <button
                            key={opt.id}
                            disabled={quizSubmitted}
                            onClick={() => handleAnswerSelect(q.id, opt.id)}
                            className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-between ${optionStyle}`}
                          >
                            <span>{opt.text}</span>
                            {quizSubmitted && opt.isCorrect && (
                              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                            {quizSubmitted && isChosen && !opt.isCorrect && (
                              <XIcon className="w-4 h-4 text-rose-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {quizSubmitted && (
                      <div className="p-2.5 bg-white border border-slate-100 rounded-xl text-[11px] text-slate-600">
                        <strong className="text-slate-800">Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quiz Submit Button */}
            {!quizSubmitted ? (
              <button
                disabled={Object.keys(selectedAnswers).length < questions.length}
                onClick={handleQuizSubmit}
                className="w-full py-3 bg-[#026fc3] hover:bg-[#025ea6] disabled:opacity-40 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-xs transition-all"
              >
                Submit Answers
              </button>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <div className="font-extrabold text-sm text-emerald-900">
                    {quizScore === questions.length ? '🎉 Perfect Score!' : '👍 Great Effort!'}
                  </div>
                  <div className="text-xs text-emerald-700 mt-0.5">
                    You answered {quizScore} out of {questions.length} questions correctly.
                  </div>
                </div>
                <button
                  disabled={savingProgress || isCompleted}
                  onClick={handleCompleteLesson}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-white text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isCompleted ? 'Completed (+40 XP)' : 'Claim XP & Finish'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step Navigation Controller Buttons */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          <button
            disabled={activeStep === 1}
            onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
            className="px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-100 rounded-xl transition-all"
          >
            Previous
          </button>

          {activeStep < 4 ? (
            <button
              onClick={() => setActiveStep(prev => Math.min(4, prev + 1))}
              className="px-5 py-2 text-xs font-extrabold bg-[#026fc3] hover:bg-[#025ea6] text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <span>Next: {steps[activeStep]?.name}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            isCompleted && (
              <Link
                to="/explore"
                className="px-5 py-2 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <span>Explore Next Bitz</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )
          )}
        </div>

      </div>

      {/* Completion Banner */}
      {isCompleted && (
        <div className="p-6 bg-gradient-to-tr from-[#026fc3] via-[#03589e] to-[#0c3f6c] text-white rounded-3xl shadow-lg space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-black">
                ✨
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black leading-snug">
                  Lesson Completed!
                </h3>
                <p className="text-xs text-brand-100">
                  You earned <strong>+40 XP</strong> and learned <strong>{vocabulary.length} new vocabulary terms</strong>.
                </p>
              </div>
            </div>
            <span className="text-xl font-black text-amber-300 bg-white/10 px-3 py-1 rounded-2xl">
              +40 XP
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/explore"
              className="px-5 py-2.5 bg-white text-[#0f233a] hover:bg-slate-100 text-xs font-extrabold rounded-2xl shadow-xs transition-all"
            >
              Explore More Shorts
            </Link>
            <Link
              to="/dashboard"
              className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold rounded-2xl transition-all"
            >
              View My Dashboard
            </Link>
          </div>
        </div>
      )}

    </div>
  );
};
