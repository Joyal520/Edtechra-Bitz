import React, { useState, useEffect } from 'react';
import {
  X,
  Trophy,
  Plus,
  Sparkles,
  Users,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { AiChallenge } from '@/types/aiChallenge';
import { aiChallengeService } from '@/services/aiChallengeService';
import { useClassroomAuth } from '@/hooks/useClassroomAuth';
import { CreateChallengeModal } from './CreateChallengeModal';
import { StudentChallengeSubmissionModal } from './StudentChallengeSubmissionModal';
import { ChallengeDashboardModal } from './ChallengeDashboardModal';

interface ChallengeListModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId: string;
  isTeacher?: boolean;
}

export const ChallengeListModal: React.FC<ChallengeListModalProps> = ({
  isOpen,
  onClose,
  classroomId,
  isTeacher: isTeacherProp
}) => {
  const classroomAuth = useClassroomAuth(classroomId);
  const isTeacher = isTeacherProp ?? classroomAuth.isTeacher;
  const isRoleResolving = classroomAuth.isLoading && !isTeacher;

  const [challenges, setChallenges] = useState<AiChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  // Submodals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedForDashboard, setSelectedForDashboard] = useState<AiChallenge | null>(null);
  const [selectedForSubmit, setSelectedForSubmit] = useState<AiChallenge | null>(null);

  const loadChallenges = async () => {
    setLoading(true);
    try {
      const list = await aiChallengeService.getChallenges(classroomId);
      setChallenges(list);
    } catch (err) {
      console.error('Error loading challenges:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadChallenges();
    }
  }, [isOpen, classroomId]);

  if (!isOpen) return null;

  const showInitialLoading = (loading || isRoleResolving) && challenges.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-lg">
              <Trophy className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                  {isTeacher ? 'Teacher Dashboard' : 'Student Challenges'}
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight">
                {isTeacher ? 'AI Challenge Competition' : 'AI Challenge'}
              </h2>
              <p className="text-xs text-indigo-100 font-medium">
                {isTeacher
                  ? 'Create challenges, collect student work and let AI evaluate submissions automatically'
                  : 'Complete challenges and receive automated AI assessment'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isTeacher && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 bg-white text-indigo-700 font-black rounded-2xl text-xs shadow-md hover:bg-indigo-50 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Challenge</span>
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {showInitialLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-bold">Loading AI challenges...</p>
            </div>
          ) : challenges.length === 0 ? (
            /* Role-Specific Empty State */
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-800">
                {isTeacher ? 'No challenges created yet' : 'No challenges available yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                {isTeacher
                  ? 'Click "Create Challenge" above to launch an open-ended writing, story, or project challenge with automated AI evaluation.'
                  : 'Your teacher has not published any open-ended challenges yet. Check back soon!'}
              </p>
              {isTeacher && (
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-2 px-5 py-2.5 bg-indigo-600 text-white font-black rounded-2xl text-xs shadow-md hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Challenge</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {challenges.map((ch) => {
                const mySub = ch.my_submission;
                const isCompleted = mySub?.status === 'completed';

                return (
                  <div
                    key={ch.id}
                    className="p-5 rounded-3xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-lg transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full">
                          {ch.category}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          Max Marks: {ch.max_marks}
                        </span>
                        {ch.required_word_count && (
                          <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                            ~{ch.required_word_count} words
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {ch.title}
                      </h3>

                      <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                        {ch.instructions}
                      </p>

                      <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{ch.submitted_count || 0} Submitted</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{ch.completed_count || 0} Evaluated</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 sm:self-center">
                      <button
                        type="button"
                        onClick={() => setSelectedForDashboard(ch)}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-2xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Trophy className="w-3.5 h-3.5" />
                        <span>{isTeacher ? 'View Dashboard & Results' : 'Leaderboard'}</span>
                      </button>

                      {!isTeacher && (
                        <button
                          type="button"
                          onClick={() => setSelectedForSubmit(ch)}
                          className={`px-4 py-2.5 rounded-2xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
                            isCompleted
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isCompleted ? 'View Score' : mySub ? 'Check Status' : 'Submit Work'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Create Challenge Submodal */}
      {isCreateOpen && (
        <CreateChallengeModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          classroomId={classroomId}
          onChallengeCreated={() => {
            loadChallenges();
          }}
        />
      )}

      {/* Challenge Dashboard Submodal */}
      {selectedForDashboard && (
        <ChallengeDashboardModal
          isOpen={Boolean(selectedForDashboard)}
          onClose={() => setSelectedForDashboard(null)}
          challenge={selectedForDashboard}
          isTeacher={isTeacher}
          onOpenStudentSubmit={() => {
            const ch = selectedForDashboard;
            setSelectedForDashboard(null);
            setSelectedForSubmit(ch);
          }}
        />
      )}

      {/* Student Submission Submodal */}
      {selectedForSubmit && (
        <StudentChallengeSubmissionModal
          isOpen={Boolean(selectedForSubmit)}
          onClose={() => setSelectedForSubmit(null)}
          challenge={selectedForSubmit}
          onSubmitted={() => {
            loadChallenges();
          }}
        />
      )}

    </div>
  );
};
