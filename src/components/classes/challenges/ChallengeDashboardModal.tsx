import React, { useState, useEffect } from 'react';
import {
  X,
  Trophy,
  Medal,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Edit3,
  Loader2,
  FileText,
  AlertCircle
} from 'lucide-react';
import {
  AiChallenge,
  AiChallengeSubmission,
  AiChallengeLeaderboardEntry
} from '@/types/aiChallenge';
import { aiChallengeService } from '@/services/aiChallengeService';
import { useAuth } from '@/context/AuthContext';

interface ChallengeDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: AiChallenge;
  onOpenStudentSubmit?: () => void;
}

export const ChallengeDashboardModal: React.FC<ChallengeDashboardModalProps> = ({
  isOpen,
  onClose,
  challenge,
  onOpenStudentSubmit
}) => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'leaderboard' | 'submissions'>('leaderboard');
  const [submissions, setSubmissions] = useState<AiChallengeSubmission[]>([]);
  const [leaderboard, setLeaderboard] = useState<AiChallengeLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Score Override Modal State
  const [selectedSubForReview, setSelectedSubForReview] = useState<AiChallengeSubmission | null>(null);
  const [overrideScoreVal, setOverrideScoreVal] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overriding, setOverriding] = useState(false);
  const [overrideErr, setOverrideErr] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [lb, subs] = await Promise.all([
        aiChallengeService.getLeaderboard(challenge.id),
        isTeacher ? aiChallengeService.getSubmissions(challenge.id) : Promise.resolve([])
      ]);
      setLeaderboard(lb);
      setSubmissions(subs);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, challenge.id, isTeacher]);

  if (!isOpen) return null;

  const totalParticipants = challenge.total_participants || (submissions.length > 0 ? submissions.length : 1);
  const completedCount = submissions.filter((s) => s.status === 'completed').length || leaderboard.length;
  const processingCount = submissions.filter((s) => s.status === 'processing' || s.status === 'queued').length;
  const progressPercent = totalParticipants > 0 ? Math.round((completedCount / totalParticipants) * 100) : 0;

  const handleOpenReview = (sub: AiChallengeSubmission) => {
    setSelectedSubForReview(sub);
    setOverrideScoreVal(String(sub.final_score ?? sub.ai_score ?? ''));
    setOverrideReason(sub.teacher_adjustment_reason || '');
    setOverrideErr(null);
  };

  const handleSaveScoreOverride = async () => {
    if (!selectedSubForReview) return;
    const num = Number(overrideScoreVal);
    if (isNaN(num) || num < 0 || num > challenge.max_marks) {
      setOverrideErr(`Score must be between 0 and ${challenge.max_marks}`);
      return;
    }

    setOverriding(true);
    setOverrideErr(null);

    try {
      const res = await aiChallengeService.overrideScore(selectedSubForReview.id, num, overrideReason);
      if (res.error) {
        setOverrideErr(res.error);
      } else {
        setSelectedSubForReview(null);
        await loadData();
      }
    } catch (err: any) {
      setOverrideErr(err.message || 'Failed to update score');
    } finally {
      setOverriding(false);
    }
  };

  const filteredSubmissions = submissions.filter((s) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    const name = s.student?.full_name?.toLowerCase() || '';
    const email = s.student?.email?.toLowerCase() || '';
    return name.includes(term) || email.includes(term);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-lg">
              <Trophy className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                  {challenge.category}
                </span>
                <span className="text-xs text-indigo-200 font-bold">
                  Max Marks: {challenge.max_marks}
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight">{challenge.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isTeacher && onOpenStudentSubmit && (
              <button
                type="button"
                onClick={onOpenStudentSubmit}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-2xl text-xs shadow-md transition-all cursor-pointer"
              >
                {challenge.my_submission ? 'View Your Submission' : 'Submit Work'}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Challenge Overview & Stats Banner */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 shrink-0 space-y-4">
          <div className="text-xs text-slate-700 font-medium whitespace-pre-wrap bg-white p-3 rounded-2xl border border-slate-200/80">
            <span className="font-black text-slate-900 uppercase tracking-wider block text-[10px] mb-1">
              Instructions
            </span>
            {challenge.instructions}
          </div>

          {/* Stats & Progress Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center gap-2.5">
              <Users className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Participants</span>
                <span className="text-sm font-black text-slate-800">{totalParticipants}</span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed</span>
                <span className="text-sm font-black text-slate-800">{completedCount}</span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Processing</span>
                <span className="text-sm font-black text-slate-800">{processingCount}</span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
              <div className="w-full">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI Progress</span>
                <div className="w-full bg-slate-100 rounded-full h-2 mt-1 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="px-6 pt-3 flex items-center gap-2 border-b border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 text-xs font-black rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === 'leaderboard'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Leaderboard ({leaderboard.length})</span>
          </button>

          {isTeacher && (
            <button
              type="button"
              onClick={() => setActiveTab('submissions')}
              className={`px-4 py-2 text-xs font-black rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
                activeTab === 'submissions'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>All Submissions ({submissions.length})</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-bold">Loading challenge data...</p>
            </div>
          ) : activeTab === 'leaderboard' ? (
            /* Leaderboard View */
            leaderboard.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-black text-slate-700">No evaluations completed yet</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto font-medium">
                  Submissions are processed asynchronously by the AI assessment engine. Rankings appear once evaluated.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-black uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold">
                    {leaderboard.map((entry) => {
                      const isTop1 = entry.rank === 1;
                      const isTop2 = entry.rank === 2;
                      const isTop3 = entry.rank === 3;

                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              {isTop1 && <Medal className="w-5 h-5 text-amber-500 shrink-0" />}
                              {isTop2 && <Medal className="w-5 h-5 text-slate-400 shrink-0" />}
                              {isTop3 && <Medal className="w-5 h-5 text-amber-700 shrink-0" />}
                              <span className={`font-black ${isTop1 ? 'text-amber-600 text-sm' : 'text-slate-700'}`}>
                                #{entry.rank}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black shrink-0">
                                {entry.student?.full_name?.charAt(0) || 'S'}
                              </div>
                              <span className="text-slate-900">{entry.student?.full_name || 'Student'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-sm font-black text-indigo-700">{entry.final_score}</span>
                            <span className="text-[10px] text-slate-400 font-bold"> / {challenge.max_marks}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">
                              Complete
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 text-[11px] font-medium">
                            {new Date(entry.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* Teacher Submissions View */
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search students..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {filteredSubmissions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No submissions matching search.</p>
              ) : (
                <div className="space-y-2.5">
                  {filteredSubmissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-sm shrink-0">
                          {sub.student?.full_name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900">
                            {sub.student?.full_name || sub.student?.email || 'Student'}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              sub.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : sub.status === 'processing'
                                ? 'bg-amber-100 text-amber-700 animate-pulse'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {sub.status.toUpperCase()}
                            </span>
                            {sub.word_count != null && (
                              <span className="text-[10px] text-slate-400 font-bold">
                                {sub.word_count} words
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 justify-end">
                        {sub.status === 'completed' && (
                          <div className="text-right">
                            <span className="text-sm font-black text-indigo-700">
                              {sub.final_score ?? sub.ai_score} / {challenge.max_marks}
                            </span>
                            {sub.teacher_adjusted && (
                              <span className="text-[10px] text-purple-600 font-black block">
                                (Adjusted)
                              </span>
                            )}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenReview(sub)}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-black rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Review & Adjust</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Teacher Score Override Modal */}
      {selectedSubForReview && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 bg-indigo-600 text-white flex items-center justify-between shrink-0">
              <h3 className="text-sm font-black">
                Review Student Submission — {selectedSubForReview.student?.full_name || 'Student'}
              </h3>
              <button
                onClick={() => setSelectedSubForReview(null)}
                className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {overrideErr && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{overrideErr}</span>
                </div>
              )}

              {/* Student Response Display */}
              <div className="space-y-1.5">
                <span className="font-black text-slate-800 uppercase tracking-wider block text-[10px]">
                  Student's Submitted Content
                </span>
                {selectedSubForReview.submission_type === 'text' ? (
                  <p className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed text-slate-800 max-h-40 overflow-y-auto">
                    {selectedSubForReview.content_text}
                  </p>
                ) : (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 text-indigo-700 font-bold">
                    <FileText className="w-4 h-4" />
                    <span>Uploaded: {selectedSubForReview.file_name}</span>
                  </div>
                )}
              </div>

              {/* AI Feedback & Criteria */}
              {selectedSubForReview.ai_feedback && (
                <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-100 space-y-1">
                  <span className="font-black text-purple-900 uppercase tracking-wider block text-[10px]">
                    AI Feedback (≤50 words)
                  </span>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {selectedSubForReview.ai_feedback}
                  </p>
                </div>
              )}

              {/* Score Override Form */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-800">Original AI Score:</span>
                  <span className="font-black text-slate-700">{selectedSubForReview.ai_score ?? 'N/A'} / {challenge.max_marks}</span>
                </div>

                <div className="space-y-1.5">
                  <label className="font-black text-slate-800 block">
                    Final Adjusted Score (0 to {challenge.max_marks})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={challenge.max_marks}
                    value={overrideScoreVal}
                    onChange={(e) => setOverrideScoreVal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-black text-slate-800 block">
                    Teacher Adjustment Reason (Optional)
                  </label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g., Recognized creative metaphor"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedSubForReview(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={overriding}
                onClick={handleSaveScoreOverride}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {overriding ? 'Saving...' : 'Save Adjusted Score'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
