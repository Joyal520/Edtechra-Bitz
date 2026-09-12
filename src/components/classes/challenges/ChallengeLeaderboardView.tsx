import React from 'react';
import {
  Trophy,
  Medal,
  Crown,
  Sparkles,
  ShieldCheck,
  Award,
  CheckCircle2,
  Clock,
  HelpCircle,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import {
  AiChallengeLeaderboardEntry,
  AiChallengeSubmission,
  AiChallengeCriterion
} from '@/types/aiChallenge';

interface ChallengeLeaderboardViewProps {
  maxMarks: number;
  leaderboard: AiChallengeLeaderboardEntry[];
  mySubmission?: AiChallengeSubmission | null;
  currentUserId?: string | null;
  isLoading?: boolean;
}

export const ChallengeLeaderboardView: React.FC<ChallengeLeaderboardViewProps> = ({
  maxMarks,
  leaderboard,
  mySubmission,
  currentUserId,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-500">Loading challenge rankings...</p>
      </div>
    );
  }

  // Find user's entry in the leaderboard if present
  const myEntry = leaderboard.find(
    (e) => (currentUserId && e.student_id === currentUserId) || (mySubmission && e.id === mySubmission.id)
  );

  // Compute personal card values
  const hasPersonalResult = !!(mySubmission && mySubmission.status === 'completed') || !!myEntry;

  const originalScore =
    mySubmission?.ai_original_score ??
    myEntry?.ai_original_score ??
    mySubmission?.ai_score ??
    mySubmission?.final_score ??
    myEntry?.final_score ??
    0;

  const finalScore =
    mySubmission?.final_score ??
    myEntry?.final_score ??
    mySubmission?.ai_score ??
    originalScore;

  const calculatedPenalty =
    mySubmission?.ai_penalty ??
    myEntry?.ai_penalty ??
    Math.max(0, Math.round((originalScore - finalScore) * 10) / 10);

  const aiLikelihood =
    mySubmission?.ai_detection_score ??
    myEntry?.ai_detection_score ??
    mySubmission?.ai_content_analysis?.likelihood_percentage ??
    0;

  const rawRiskLevel =
    mySubmission?.ai_risk_level ??
    myEntry?.ai_risk_level ??
    mySubmission?.ai_content_analysis?.risk_level ??
    (aiLikelihood <= 30 ? 'Minimal' : aiLikelihood <= 60 ? 'Low' : aiLikelihood <= 80 ? 'Moderate' : 'High');

  const myRank = myEntry?.rank ?? (mySubmission?.status === 'completed'
    ? leaderboard.findIndex((e) => e.id === mySubmission.id) + 1 || null
    : null);

  // Safe criteria list (filtering out internal metadata objects)
  const rawCriteria: any[] = (mySubmission?.criteria_json as any) || (myEntry?.criteria_json as any) || [];
  const criteriaList: AiChallengeCriterion[] = Array.isArray(rawCriteria)
    ? rawCriteria.filter((c) => c && typeof c === 'object' && c.name && !c.is_ai_analysis && !c.__is_ai_analysis)
    : [];

  const feedbackText = mySubmission?.ai_feedback || myEntry?.ai_feedback;

  // Podium contestants
  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];
  const restOfLeaderboard = leaderboard.slice(3);

  const getRiskBadgeStyles = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'moderate':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. DEDICATED PROMINENT PERSONAL RESULT CARD */}
      {hasPersonalResult && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white p-6 shadow-xl border border-indigo-700/40">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* Header / Badges */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-amber-300 shadow-inner">
                  {myRank === 1 ? (
                    <Crown className="w-6 h-6 text-amber-400" />
                  ) : myRank === 2 || myRank === 3 ? (
                    <Medal className="w-6 h-6 text-amber-300" />
                  ) : (
                    <Trophy className="w-6 h-6 text-indigo-200" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                      Your Challenge Performance
                    </span>
                    {myRank && (
                      <span className="text-xs font-black text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                        Rank #{myRank} of {leaderboard.length}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black tracking-tight text-white mt-0.5">
                    Personal Assessment & Score Breakdown
                  </h3>
                </div>
              </div>

              {/* Motivational Tag */}
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-400/20 border border-emerald-400/30 text-emerald-200 rounded-full text-xs font-black">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                <span>
                  {finalScore >= maxMarks * 0.85
                    ? 'Exceptional Work!'
                    : finalScore >= maxMarks * 0.7
                    ? 'Great Performance!'
                    : 'Good Effort!'}
                </span>
              </div>
            </div>

            {/* Score Grid Comparison: Original vs AI Penalty vs Final */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Original Rubric Score */}
              <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
                <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider block">
                  Original Score
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white">{originalScore}</span>
                  <span className="text-xs text-indigo-200 font-bold">/ {maxMarks}</span>
                </div>
                <span className="text-[10px] text-indigo-200/80 font-medium block">
                  Writing quality & rubric
                </span>
              </div>

              {/* AI Content Likelihood */}
              <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider block">
                    AI Likelihood
                  </span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${getRiskBadgeStyles(rawRiskLevel)}`}>
                    {rawRiskLevel}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white">{aiLikelihood}%</span>
                </div>
                <span className="text-[10px] text-indigo-200/80 font-medium block">
                  Style pattern analysis
                </span>
              </div>

              {/* Authenticity Adjustment / Penalty */}
              <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
                <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider block">
                  AI Penalty
                </span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-black ${calculatedPenalty > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                    {calculatedPenalty > 0 ? `-${calculatedPenalty}` : '0'}
                  </span>
                  <span className="text-xs text-indigo-200 font-bold">pts</span>
                </div>
                <span className="text-[10px] text-indigo-200/80 font-medium block">
                  {calculatedPenalty > 0 ? 'Safeguarded deduction' : 'Full originality preserved'}
                </span>
              </div>

              {/* Final Official Score */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-400/20 to-emerald-400/20 border border-amber-300/40 space-y-1 shadow-md">
                <span className="text-[10px] font-black text-amber-200 uppercase tracking-wider block">
                  Final Official Score
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-amber-300">{finalScore}</span>
                  <span className="text-xs text-amber-100 font-bold">/ {maxMarks}</span>
                </div>
                <span className="text-[10px] text-amber-200/90 font-black block">
                  {Math.round((finalScore / maxMarks) * 100)}% on Leaderboard
                </span>
              </div>
            </div>

            {/* Criteria Breakdown */}
            {criteriaList.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-200 block">
                  Rubric Criteria Breakdown
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {criteriaList.map((crit, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 flex items-center justify-between text-xs"
                    >
                      <span className="text-indigo-100 font-medium truncate pr-2">{crit.name}</span>
                      <span className="font-black text-white shrink-0">
                        <span className="text-amber-300">{crit.score ?? 0}</span>
                        <span className="text-indigo-300 text-[10px]"> / {crit.max}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Constructive Feedback */}
            {feedbackText && (
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 text-xs font-medium text-indigo-50 leading-relaxed space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Educational Feedback & Growth Note</span>
                </span>
                <p>{feedbackText}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. PODIUM-STYLE TOP 3 DISPLAY */}
      {leaderboard.length > 0 ? (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-black">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Challenge Leaderboard & Podium</span>
            </div>
            <h3 className="text-lg font-black text-slate-900">Top Performing Scholars</h3>
            <p className="text-xs text-slate-500 font-medium">
              Ranked strictly by Final Score and earliest submission time
            </p>
          </div>

          {/* Olympic / High-End Podium Layout */}
          <div className="pt-8 pb-4 px-2">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-2xl mx-auto">
              
              {/* Silver #2 (Left) */}
              <div className="flex flex-col items-center">
                {top2 ? (
                  <div className="w-full flex flex-col items-center space-y-2">
                    <div className="relative">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 flex items-center justify-center font-black text-lg shadow-lg border-2 border-slate-300">
                        {top2.student?.avatar_url ? (
                          <img
                            src={top2.student.avatar_url}
                            alt={top2.student.full_name || 'Student'}
                            className="w-full h-full object-cover rounded-2xl"
                          />
                        ) : (
                          top2.student?.full_name?.charAt(0) || '2'
                        )}
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-slate-300 text-slate-800 font-black text-xs flex items-center justify-center shadow-md border-2 border-white">
                        #2
                      </div>
                    </div>

                    <div className="text-center w-full px-1">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                        {top2.student?.full_name || 'Student'}
                      </h4>
                      <div className="mt-0.5">
                        <span className="text-xs sm:text-sm font-black text-slate-700">
                          {top2.final_score}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold"> / {maxMarks}</span>
                      </div>
                    </div>

                    {/* Silver Pedestal */}
                    <div className="w-full h-24 sm:h-28 bg-gradient-to-t from-slate-200 to-slate-100 rounded-t-2xl border-t border-x border-slate-300 flex flex-col items-center justify-center shadow-inner">
                      <Medal className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs font-black uppercase text-slate-600 tracking-wider">
                        2nd Place
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-24 bg-slate-50 rounded-t-2xl border-t border-x border-slate-200 flex items-center justify-center text-slate-300 text-xs font-bold">
                    Empty
                  </div>
                )}
              </div>

              {/* Gold #1 (Center Elevated) */}
              <div className="flex flex-col items-center -mt-6">
                {top1 ? (
                  <div className="w-full flex flex-col items-center space-y-2">
                    <div className="relative">
                      {/* Floating Crown */}
                      <Crown className="w-8 h-8 text-amber-400 absolute -top-7 left-1/2 -translate-x-1/2 animate-bounce duration-1000" />
                      
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 text-amber-950 flex items-center justify-center font-black text-xl shadow-xl border-4 border-amber-200">
                        {top1.student?.avatar_url ? (
                          <img
                            src={top1.student.avatar_url}
                            alt={top1.student.full_name || 'Student'}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          top1.student?.full_name?.charAt(0) || '1'
                        )}
                      </div>
                      <div className="absolute -bottom-2.5 -right-2.5 w-8 h-8 rounded-full bg-amber-400 text-amber-950 font-black text-xs flex items-center justify-center shadow-lg border-2 border-white">
                        #1
                      </div>
                    </div>

                    <div className="text-center w-full px-1">
                      <div className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full mb-0.5">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>Winner</span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                        {top1.student?.full_name || 'Student'}
                      </h4>
                      <div className="mt-0.5">
                        <span className="text-sm sm:text-base font-black text-indigo-700">
                          {top1.final_score}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold"> / {maxMarks}</span>
                      </div>
                    </div>

                    {/* Gold Pedestal */}
                    <div className="w-full h-32 sm:h-36 bg-gradient-to-t from-amber-300 via-amber-200 to-amber-100 rounded-t-3xl border-t border-x border-amber-400 flex flex-col items-center justify-center shadow-md">
                      <Trophy className="w-8 h-8 text-amber-600 mb-1" />
                      <span className="text-xs font-black uppercase text-amber-900 tracking-wider">
                        1st Place
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-32 bg-slate-50 rounded-t-3xl border-t border-x border-slate-200 flex items-center justify-center text-slate-300 text-xs font-bold">
                    Empty
                  </div>
                )}
              </div>

              {/* Bronze #3 (Right) */}
              <div className="flex flex-col items-center">
                {top3 ? (
                  <div className="w-full flex flex-col items-center space-y-2">
                    <div className="relative">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100 flex items-center justify-center font-black text-lg shadow-lg border-2 border-amber-600">
                        {top3.student?.avatar_url ? (
                          <img
                            src={top3.student.avatar_url}
                            alt={top3.student.full_name || 'Student'}
                            className="w-full h-full object-cover rounded-2xl"
                          />
                        ) : (
                          top3.student?.full_name?.charAt(0) || '3'
                        )}
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-amber-700 text-amber-100 font-black text-xs flex items-center justify-center shadow-md border-2 border-white">
                        #3
                      </div>
                    </div>

                    <div className="text-center w-full px-1">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                        {top3.student?.full_name || 'Student'}
                      </h4>
                      <div className="mt-0.5">
                        <span className="text-xs sm:text-sm font-black text-slate-700">
                          {top3.final_score}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold"> / {maxMarks}</span>
                      </div>
                    </div>

                    {/* Bronze Pedestal */}
                    <div className="w-full h-20 sm:h-24 bg-gradient-to-t from-amber-200/80 to-amber-100/60 rounded-t-2xl border-t border-x border-amber-300 flex flex-col items-center justify-center shadow-inner">
                      <Medal className="w-6 h-6 text-amber-700 mb-1" />
                      <span className="text-xs font-black uppercase text-amber-800 tracking-wider">
                        3rd Place
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-20 bg-slate-50 rounded-t-2xl border-t border-x border-slate-200 flex items-center justify-center text-slate-300 text-xs font-bold">
                    Empty
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* 3. RANKED LIST FOR #4 AND BEYOND */}
          {restOfLeaderboard.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Full Rankings ({restOfLeaderboard.length} more)
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  Total participants: {leaderboard.length}
                </span>
              </div>

              <div className="space-y-2">
                {restOfLeaderboard.map((entry) => {
                  const isMe =
                    (currentUserId && entry.student_id === currentUserId) ||
                    (mySubmission && entry.id === mySubmission.id);

                  return (
                    <div
                      key={entry.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isMe
                          ? 'bg-indigo-50/80 border-indigo-300 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 text-center font-black text-xs text-slate-600">
                          #{entry.rank}
                        </span>

                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs overflow-hidden shrink-0">
                          {entry.student?.avatar_url ? (
                            <img
                              src={entry.student.avatar_url}
                              alt={entry.student.full_name || 'Student'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            entry.student?.full_name?.charAt(0) || 'S'
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">
                              {entry.student?.full_name || 'Student'}
                            </span>
                            {isMe && (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Submitted {new Date(entry.submitted_at).toLocaleDateString()} at{' '}
                            {new Date(entry.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-sm font-black text-indigo-700">{entry.final_score}</span>
                          <span className="text-[10px] text-slate-400 font-bold"> / {maxMarks}</span>
                        </div>

                        <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black shrink-0">
                          Completed
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-12 text-center space-y-2 bg-slate-50 rounded-3xl border border-slate-200">
          <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-black text-slate-700">No submissions evaluated yet</h4>
          <p className="text-xs text-slate-400 max-w-xs mx-auto font-medium">
            Be the first to submit your work and take the top spot on the podium!
          </p>
        </div>
      )}

      {/* Helper Footer on Evaluation Policy */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-black text-slate-800 block">
            Authenticity & Integrity Safeguard
          </span>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            Every submission is independently graded on task criteria (creativity, structure, vocabulary, grammar). A probabilistic AI content check ensures fair play while safeguarding student work against false positives.
          </p>
        </div>
      </div>

    </div>
  );
};
