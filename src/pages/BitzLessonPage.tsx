import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  BookOpen,
  Lock,
  RotateCcw,
  ArrowRight,
  Trophy,
  Check,
  X as XIcon
} from 'lucide-react';
import { YouTubeVideo, QuizQuestion, UserLearningProgress } from '@/types';
import { youtubeClient } from '@/services/youtubeClient';
import { useAuth } from '@/context/AuthContext';
import {
  getLevelByVideoId,
  getLevelByNumber,
  isLevelUnlocked,
  getNextLevelNumber,
  LevelDefinition
} from '@/utils/levelsData';

export const BitzLessonPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [video, setVideo] = useState<YouTubeVideo | null>(null);
  const [levelDef, setLevelDef] = useState<LevelDefinition | null>(null);
  const [progressMap, setProgressMap] = useState<{ [videoId: string]: UserLearningProgress }>({});
  const [loading, setLoading] = useState(true);

  // Sequential learning flow steps: 1 = Watch, 2 = Read, 3 = Quiz
  const [activeStep, setActiveStep] = useState<number>(1);
  const [watchedCompleted, setWatchedCompleted] = useState(false);
  const [readingCompleted, setReadingCompleted] = useState(false);

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<{ [questionId: string]: string }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [isPassed, setIsPassed] = useState(false);

  const userId = user?.id || 'guest-user';

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    try {
      // 1. Fetch progress map
      const pMap = await youtubeClient.getProgressMap(userId);
      setProgressMap(pMap);

      // 2. Check if ID is a level number (e.g. "1", "level-1")
      let targetVideoId = id;
      let matchedLevel: LevelDefinition | undefined;

      const parsedNum = parseInt(id.replace(/^level-/i, ''), 10);
      if (!isNaN(parsedNum) && parsedNum >= 1 && parsedNum <= 20) {
        matchedLevel = getLevelByNumber(parsedNum);
        if (matchedLevel) {
          targetVideoId = matchedLevel.youtubeVideoId;
        }
      } else {
        matchedLevel = getLevelByVideoId(id);
      }

      setLevelDef(matchedLevel || null);

      // 3. Fetch video details
      const videoData = await youtubeClient.getVideo(targetVideoId);
      setVideo(videoData);

      // 4. Restore existing progress for this video if available
      const existingProg = pMap[targetVideoId];
      if (existingProg) {
        if (existingProg.watched) {
          setWatchedCompleted(true);
        }
        if (existingProg.completed && existingProg.quiz_score >= 2) {
          setReadingCompleted(true);
          setIsPassed(true);
          setQuizScore(existingProg.quiz_score);
        }
      }
    } catch (err) {
      console.error('Error loading lesson:', err);
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useEffect(() => {
    loadData();
    // Reset step state on lesson change
    setActiveStep(1);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    setIsPassed(false);
    setWatchedCompleted(false);
    setReadingCompleted(false);
  }, [loadData]);

  // Handle Watch completion
  const handleCompleteWatch = async () => {
    setWatchedCompleted(true);
    setActiveStep(2); // Automatically advance to Step 2: Read

    if (video) {
      const prev = progressMap[video.youtube_video_id];
      await youtubeClient.saveProgress({
        userId,
        videoId: video.youtube_video_id,
        watched: true,
        quizCompleted: prev?.quiz_completed || false,
        quizScore: prev?.quiz_score || 0,
        completed: prev?.completed || false
      });
      const updatedMap = await youtubeClient.getProgressMap(userId);
      setProgressMap(updatedMap);
    }
  };

  // Handle Read completion
  const handleCompleteReading = () => {
    setReadingCompleted(true);
    setActiveStep(3); // Advance to Step 3: Quiz
  };

  // Handle Quiz answer selection
  const handleAnswerSelect = (questionId: string, optionId: string) => {
    if (quizSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  // Handle Quiz submission
  const handleQuizSubmit = async () => {
    const questions: QuizQuestion[] = levelDef?.questions || video?.learning_content?.quiz || [];
    if (questions.length === 0 || !video) return;

    let score = 0;
    questions.forEach(q => {
      const chosenOptId = selectedAnswers[q.id];
      const correctOpt = q.options.find(opt => opt.isCorrect);
      if (chosenOptId && correctOpt && chosenOptId === correctOpt.id) {
        score += 1;
      }
    });

    const passed = score >= 2;
    setQuizScore(score);
    setIsPassed(passed);
    setQuizSubmitted(true);

    try {
      await youtubeClient.saveProgress({
        userId,
        videoId: video.youtube_video_id,
        watched: true,
        quizCompleted: true,
        quizScore: score,
        quizTotal: 3,
        completed: passed
      });

      const updatedMap = await youtubeClient.getProgressMap(userId);
      setProgressMap(updatedMap);
    } catch (err) {
      console.error('Error saving quiz results:', err);
    }
  };

  // Retry Quiz handler on failure
  const handleRetryQuiz = () => {
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    setIsPassed(false);
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

  // ============================================================================
  // LEVEL LOCKING ENFORCEMENT & SHIELD UI
  // ============================================================================
  if (levelDef && !isLevelUnlocked(levelDef.levelNumber, progressMap)) {
    const prevLevelNum = levelDef.levelNumber - 1;
    const prevLevel = getLevelByNumber(prevLevelNum);

    return (
      <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16 space-y-6">
        <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-10 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center mx-auto shadow-2xs">
            <Lock className="w-8 h-8 stroke-[2.2]" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-black rounded-full uppercase tracking-wider">
              Level {levelDef.levelNumber} Locked
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#0f233a] tracking-tight">
              {levelDef.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed pt-1">
              You must pass <strong>Level {prevLevelNum}</strong> ({prevLevel?.title}) with at least <strong>2 out of 3 correct answers</strong> on the quiz to unlock Level {levelDef.levelNumber}.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {prevLevel && (
              <Link
                to={`/bitz/${prevLevel.youtubeVideoId}`}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs sm:text-sm font-extrabold rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <span>Go to Level {prevLevelNum}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <Link
              to="/explore"
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-2xl transition-all"
            >
              View Level Roadmap
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Handle upcoming status for non-level future videos
  const isUpcoming = video.status === 'upcoming' || video.learning_content?.status === 'upcoming';
  if (isUpcoming) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6 pb-16">
        <div className="flex items-center justify-between">
          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-1.5 rounded-2xl shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Explore
          </Link>
          <span className="text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Upcoming Lesson
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 bg-amber-500 text-white text-[10px] font-extrabold rounded-md uppercase tracking-wider">
              {video.category}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0f233a] tracking-tight">
            {video.title}
          </h1>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
          <div className="relative aspect-[9/16] max-w-[300px] mx-auto bg-black rounded-3xl overflow-hidden shadow-xl border border-slate-200">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video.youtube_video_id}?autoplay=0&rel=0&playsinline=1`}
              title={video.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="p-5 bg-gradient-to-br from-amber-50/90 to-orange-50/50 border border-amber-200/80 rounded-2xl text-center space-y-2">
            <h3 className="font-extrabold text-amber-900 text-sm">Interactive Content In Production</h3>
            <p className="text-xs text-amber-800/90">This Short is newly detected. Interactive explanations and quizzes are being prepared.</p>
          </div>
        </div>
      </div>
    );
  }

  // Authoritative Content Resolution
  const explanationText = levelDef?.explanation || video.learning_content?.summary || video.description || '';
  const questions: QuizQuestion[] = levelDef?.questions || video.learning_content?.quiz || [];
  const nextLevelNum = levelDef ? getNextLevelNumber(levelDef.levelNumber) : null;
  const nextLevelDef = nextLevelNum ? getLevelByNumber(nextLevelNum) : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5 pb-16">
      
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-1.5 rounded-2xl shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Level Roadmap
        </Link>
        
        <div className="flex items-center gap-2">
          {levelDef ? (
            <span className="text-xs font-black text-[#026fc3] bg-brand-50 border border-brand-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Level {levelDef.levelNumber} of 20</span>
            </span>
          ) : (
            <span className="text-xs font-extrabold text-[#026fc3] bg-brand-50 border border-brand-200 px-3 py-1 rounded-full flex items-center gap-1 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> +40 XP Reward
            </span>
          )}
        </div>
      </div>

      {/* Lesson Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          {levelDef && (
            <span className="px-2.5 py-0.5 bg-[#026fc3] text-white text-[10px] font-black rounded-md uppercase tracking-wider">
              Stage {levelDef.levelNumber}
            </span>
          )}
          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-extrabold rounded-md uppercase tracking-wider">
            {video.category}
          </span>
          {isPassed && (
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completed ({quizScore}/3)
            </span>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-[#0f233a] tracking-tight">
          {levelDef ? levelDef.title : video.title}
        </h1>
      </div>

      {/* Sequential Flow Tabs (Watch -> Read -> Quiz) */}
      <div className="grid grid-cols-3 gap-2 bg-white border border-stone-200/80 rounded-2xl p-1.5 shadow-xs">
        
        {/* Step 1: Watch Tab */}
        <button
          onClick={() => setActiveStep(1)}
          className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
            activeStep === 1
              ? 'bg-[#026fc3] text-white shadow-xs'
              : watchedCompleted
              ? 'text-emerald-700 bg-emerald-50/70 hover:bg-emerald-50'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          {watchedCompleted ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Play className="w-3.5 h-3.5" />}
          <span>1. Watch</span>
        </button>

        {/* Step 2: Read Tab */}
        <button
          onClick={() => {
            if (watchedCompleted) setActiveStep(2);
          }}
          disabled={!watchedCompleted}
          className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
            activeStep === 2
              ? 'bg-[#026fc3] text-white shadow-xs'
              : readingCompleted
              ? 'text-emerald-700 bg-emerald-50/70 hover:bg-emerald-50'
              : watchedCompleted
              ? 'text-slate-700 hover:bg-slate-50'
              : 'text-slate-300 opacity-60 cursor-not-allowed'
          }`}
        >
          {readingCompleted ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : !watchedCompleted ? <Lock className="w-3 h-3 text-slate-300" /> : <BookOpen className="w-3.5 h-3.5" />}
          <span>2. Read</span>
        </button>

        {/* Step 3: Quiz Tab */}
        <button
          onClick={() => {
            if (readingCompleted) setActiveStep(3);
          }}
          disabled={!readingCompleted}
          className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
            activeStep === 3
              ? 'bg-[#026fc3] text-white shadow-xs'
              : isPassed
              ? 'text-emerald-700 bg-emerald-50/70 hover:bg-emerald-50'
              : readingCompleted
              ? 'text-slate-700 hover:bg-slate-50'
              : 'text-slate-300 opacity-60 cursor-not-allowed'
          }`}
        >
          {isPassed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : !readingCompleted ? <Lock className="w-3 h-3 text-slate-300" /> : <HelpCircle className="w-3.5 h-3.5" />}
          <span>3. Quiz</span>
        </button>

      </div>

      {/* Main Interactive Step Card */}
      <div className="bg-white border border-stone-200/80 rounded-3xl p-5 sm:p-7 shadow-sm min-h-[380px] flex flex-col justify-between space-y-6">
        
        {/* =================================================================== */}
        {/* STEP 1: WATCH                                                       */}
        {/* =================================================================== */}
        {activeStep === 1 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <Play className="w-4 h-4 text-[#026fc3]" /> Step 1: Watch Video
              </h2>
              {watchedCompleted && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Video Completed
                </span>
              )}
            </div>

            <div className="relative aspect-[9/16] max-w-[300px] mx-auto bg-black rounded-3xl overflow-hidden shadow-xl border border-slate-200">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${video.youtube_video_id}?autoplay=1&rel=0&modestbranding=1`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            <div className="pt-2">
              <button
                onClick={handleCompleteWatch}
                className="w-full py-3 bg-[#026fc3] hover:bg-[#025ea6] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <span>{watchedCompleted ? 'Re-open Step 2: Read Explanation' : 'I Finished Watching → Unlock Reading'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 2: READ (50-WORD EXPLANATION)                                  */}
        {/* =================================================================== */}
        {activeStep === 2 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#026fc3]" /> Step 2: Read 50-Word Explanation
              </h2>
              <span className="text-xs font-bold text-slate-400">
                50 Words
              </span>
            </div>

            {/* Reading Card */}
            <div className="p-6 sm:p-7 bg-[#fbfbf7] border border-stone-200/90 rounded-3xl space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-black text-[#026fc3] uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Concept Summary
              </div>
              <p className="text-slate-800 text-sm sm:text-base font-medium leading-relaxed">
                {explanationText}
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleCompleteReading}
                className="w-full py-3 bg-[#22c55e] hover:bg-[#16a34a] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <span>I Have Read and Understood → Start Quiz</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 3: QUIZ (3 QUESTIONS, PASS: >= 2/3)                            */}
        {/* =================================================================== */}
        {activeStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#026fc3]" /> Step 3: Mastery Quiz (3 Questions)
              </h2>
              <span className="text-xs font-bold text-slate-500">
                Passing: 2/3 Correct
              </span>
            </div>

            {/* Questions List */}
            <div className="space-y-5">
              {questions.map((q, qIndex) => {
                const selected = selectedAnswers[q.id];

                return (
                  <div key={q.id} className="p-4 sm:p-5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                        {qIndex + 1}
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        {q.question}
                      </p>
                    </div>

                    {/* Options (Preserve exact A, B, C, D order) */}
                    <div className="space-y-2 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const optLetter = ['A', 'B', 'C', 'D'][optIdx] || '';
                        const isChosen = selected === opt.id;
                        let optionStyle = 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80';

                        if (quizSubmitted) {
                          if (opt.isCorrect) {
                            optionStyle = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold';
                          } else if (isChosen && !opt.isCorrect) {
                            optionStyle = 'bg-rose-50 border-rose-400 text-rose-900 line-through';
                          }
                        } else if (isChosen) {
                          optionStyle = 'bg-brand-50 border-brand-500 text-brand-900 font-bold';
                        }

                        return (
                          <button
                            key={opt.id}
                            disabled={quizSubmitted}
                            onClick={() => handleAnswerSelect(q.id, opt.id)}
                            className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-2 ${optionStyle}`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-lg bg-slate-100 font-black text-[11px] text-slate-600 flex items-center justify-center shrink-0">
                                {optLetter}
                              </span>
                              <span>{opt.text}</span>
                            </span>

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
                  </div>
                );
              })}
            </div>

            {/* Quiz Action / Results */}
            {!quizSubmitted ? (
              <button
                disabled={Object.keys(selectedAnswers).length < questions.length}
                onClick={handleQuizSubmit}
                className="w-full py-3 bg-[#026fc3] hover:bg-[#025ea6] disabled:opacity-40 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-xs transition-all"
              >
                Submit Answers ({Object.keys(selectedAnswers).length}/{questions.length} Answered)
              </button>
            ) : isPassed ? (
              /* PASS RESULT BANNER */
              <div className="p-5 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-3xl shadow-md space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-black text-xl">
                      🎉
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black">
                        Level Completed! (Score: {quizScore}/3)
                      </h3>
                      <p className="text-xs text-emerald-100">
                        {quizScore === 3 ? 'Perfect 3/3 score! Level unlocked.' : 'Great job! 2/3 passed requirements.'}
                      </p>
                    </div>
                  </div>
                  <span className="text-base sm:text-lg font-black text-amber-300 bg-white/10 px-3 py-1 rounded-2xl">
                    +40 XP
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {nextLevelDef ? (
                    <Link
                      to={`/bitz/${nextLevelDef.youtubeVideoId}`}
                      className="px-5 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 text-xs sm:text-sm font-black rounded-2xl shadow-xs transition-all flex items-center gap-2"
                    >
                      <span>Continue to Level {nextLevelDef.levelNumber}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <Link
                      to="/explore"
                      className="px-5 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 text-xs sm:text-sm font-black rounded-2xl shadow-xs transition-all flex items-center gap-2"
                    >
                      <span>All 20 Levels Completed! View Roadmap</span>
                      <Trophy className="w-4 h-4 text-amber-500" />
                    </Link>
                  )}
                  <button
                    onClick={handleRetryQuiz}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-2xl transition-all flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Try Quiz Again</span>
                  </button>
                </div>
              </div>
            ) : (
              /* FAIL RESULT BANNER */
              <div className="p-5 bg-gradient-to-tr from-amber-500 to-rose-500 text-white rounded-3xl shadow-md space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-black text-xl">
                    ⚠️
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black">
                      Quiz Failed (Score: {quizScore}/3)
                    </h3>
                    <p className="text-xs text-amber-100">
                      You need at least 2 out of 3 correct answers to pass and unlock the next level.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    onClick={handleRetryQuiz}
                    className="px-5 py-2.5 bg-white text-rose-900 hover:bg-rose-50 text-xs sm:text-sm font-black rounded-2xl shadow-xs transition-all flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Retry Quiz</span>
                  </button>
                  <button
                    onClick={() => setActiveStep(2)}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-2xl transition-all flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Review Explanation</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};
