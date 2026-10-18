import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Copy,
  Check,
  Clock,
  Hourglass,
  Layers
} from 'lucide-react';
import { LiveQuizSession, LiveQuizParticipant } from '@/types/liveQuiz';
import { liveQuizService } from '@/services/liveQuizService';
import { quizAudioService } from '@/services/quizAudioService';
import { useAuth } from '@/context/AuthContext';
import {
  QuizHeader,
  PlayerCard,
  SubmitButton,
  ExitButton
} from './LiveQuizUI';

interface LiveQuizLobbyProps {
  session: LiveQuizSession;
  isTeacher: boolean;
  onStartQuiz?: () => void;
}

export const LiveQuizLobby: React.FC<LiveQuizLobbyProps> = ({
  session,
  isTeacher,
  onStartQuiz
}) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [participants, setParticipants] = useState<LiveQuizParticipant[]>([]);
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Active Supabase Realtime channel reference
  const channelRef = useRef<any>(null);

  const effectiveState = liveQuizService.getEffectiveSessionState(session);
  const isScheduledSession = Boolean(
    session.started_at && (session.status === 'lobby' || effectiveState === 'scheduled')
  );
  const scheduledTimeStr = isScheduledSession ? session.started_at : null;
  const targetStartMs = useMemo(() => {
    return scheduledTimeStr ? new Date(scheduledTimeStr).getTime() : null;
  }, [scheduledTimeStr]);

  const [remainingSec, setRemainingSec] = useState<number>(() => {
    if (!targetStartMs) return 0;
    return Math.max(0, Math.ceil((targetStartMs - Date.now()) / 1000));
  });

  const isScheduled = isScheduledSession && remainingSec > 0;

  const pin = session.pin;
  const joinUrl = `${window.location.origin}/classes/live-quiz/join/${pin}`;
  const category = session.quiz?.category || 'General';

  // Proactively fetch question count if missing from session
  const [realQuestionsCount, setRealQuestionsCount] = useState<number>(
    () => session.quiz?.questions?.length || 0
  );

  useEffect(() => {
    if (session.quiz?.questions?.length) {
      setRealQuestionsCount(session.quiz.questions.length);
      return;
    }
    const quizId = session.quiz_id || session.quiz?.id;
    if (session.id) {
      liveQuizService
        .getStudentQuestions(session.id)
        .then((qs) => {
          if (qs && qs.length > 0) {
            setRealQuestionsCount(qs.length);
          } else if (quizId) {
            liveQuizService.getQuizById(quizId).then((q) => {
              if (q?.questions?.length) {
                setRealQuestionsCount(q.questions.length);
              }
            });
          }
        })
        .catch(() => {});
    }
  }, [session.id, session.quiz_id, session.quiz]);

  const questionsCount = realQuestionsCount || session.quiz?.questions?.length || 0;

  // 1. Audio management: Respect soundEnabled toggle and cleanup on unmount
  useEffect(() => {
    if (soundEnabled) {
      quizAudioService.startBackgroundMusic();
    } else {
      quizAudioService.stopBackgroundMusic();
    }
    return () => {
      quizAudioService.stopBackgroundMusic();
    };
  }, [soundEnabled]);

  // 1b. Stale-state / Reconnection Guard: If quiz is already active, navigate immediately
  useEffect(() => {
    if (!isTeacher && (session.status === 'in_progress' || session.status === 'reveal')) {
      navigate(`/classes/${session.classroom_id}/live-quiz/play/${session.id}`, {
        state: { initialSession: session }
      });
      return;
    }

    if (isTeacher && (session.status === 'in_progress' || session.status === 'reveal')) {
      navigate(`/classes/${session.classroom_id}/live-quiz/host/${session.id}`, {
        state: { initialSession: session }
      });
      return;
    }
  }, [session.status, session.classroom_id, session.id, isTeacher, navigate]);

  // 2. Synchronized countdown timer
  useEffect(() => {
    if (!targetStartMs) return;

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((targetStartMs - now) / 1000));
      setRemainingSec(diff);
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [targetStartMs]);

  const formattedCountdown = useMemo(() => {
    const hours = Math.floor(remainingSec / 3600);
    const mins = Math.floor((remainingSec % 3600) / 60);
    const secs = remainingSec % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [remainingSec]);

  // 3. Auto-Transition when countdown expires
  const hasAutoStartedRef = useRef(false);

  useEffect(() => {
    if (!targetStartMs) return;

    if (remainingSec <= 0 && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      setIsStarting(true);

      const startMs = Date.now();
      const q0 = session.quiz?.questions?.[0];
      const q0Dur = q0?.durationSec || session.question_duration_sec || 20;
      const q0EndsAtMs = startMs + q0Dur * 1000;

      // Reconcile scheduled session
      liveQuizService
        .reconcileScheduledSession(session.id, session.classroom_id)
        .then((fresh) => {
          const freshQ0Dur =
            fresh?.quiz?.questions?.[0]?.durationSec || fresh?.question_duration_sec || q0Dur;
          const freshStartMs = fresh?.question_start_ms || startMs;
          const activeSession: LiveQuizSession = {
            ...session,
            ...(fresh || {}),
            status: 'in_progress',
            current_question_index: 0,
            started_at: fresh?.started_at || new Date(freshStartMs).toISOString(),
            question_start_ms: freshStartMs,
            question_duration_sec: freshQ0Dur,
            quiz: fresh?.quiz || session.quiz
          };

          const questionPayload = {
            qIndex: 0,
            question: q0?.question || 'Question 1',
            options: q0?.options || [],
            durationSec: freshQ0Dur,
            questionStartMs: freshStartMs,
            questionEndsAtMs: freshStartMs + freshQ0Dur * 1000,
            totalQuestions: questionsCount
          };

          if (channelRef.current) {
            channelRef.current
              .send({
                type: 'broadcast',
                event: 'quiz_started',
                payload: {
                  session_id: session.id,
                  total_questions: questionsCount,
                  starts_at: freshStartMs
                }
              })
              .catch(() => {});

            channelRef.current
              .send({
                type: 'broadcast',
                event: 'question_started',
                payload: questionPayload
              })
              .catch(() => {});
          }

          if (isTeacher) {
            if (onStartQuiz) onStartQuiz();
            else
              navigate(`/classes/${session.classroom_id}/live-quiz/host/${session.id}`, {
                state: { initialSession: activeSession }
              });
          } else {
            navigate(`/classes/${session.classroom_id}/live-quiz/play/${session.id}`, {
              state: {
                initialSession: activeSession,
                initialQuestionPayload: questionPayload
              }
            });
          }
        })
        .catch((err) => {
          console.warn('[LiveQuizLobby] Scheduled start reconcile fallback:', err);
          const fallbackSession: LiveQuizSession = {
            ...session,
            status: 'in_progress',
            current_question_index: 0,
            started_at: new Date(startMs).toISOString(),
            question_start_ms: startMs,
            question_duration_sec: q0Dur
          };
          const questionPayload = {
            qIndex: 0,
            question: q0?.question || 'Question 1',
            options: q0?.options || [],
            durationSec: q0Dur,
            questionStartMs: startMs,
            questionEndsAtMs: q0EndsAtMs,
            totalQuestions: questionsCount
          };
          if (isTeacher) {
            navigate(`/classes/${session.classroom_id}/live-quiz/host/${session.id}`, {
              state: { initialSession: fallbackSession }
            });
          } else {
            navigate(`/classes/${session.classroom_id}/live-quiz/play/${session.id}`, {
              state: {
                initialSession: fallbackSession,
                initialQuestionPayload: questionPayload
              }
            });
          }
        });
    } else if (remainingSec <= 2 && !isTeacher) {
      const pollInterval = setInterval(async () => {
        try {
          const fresh = await liveQuizService.getSessionById(session.id);
          if (fresh && (fresh.status === 'in_progress' || fresh.status === 'reveal')) {
            navigate(`/classes/${session.classroom_id}/live-quiz/play/${session.id}`, {
              state: { initialSession: fresh }
            });
          }
        } catch {}
      }, 1500);

      return () => clearInterval(pollInterval);
    }
  }, [isTeacher, remainingSec, targetStartMs, session, questionsCount, navigate, onStartQuiz]);

  // 4. Initial participants load from database
  const loadParticipants = useCallback(async () => {
    try {
      const data = await liveQuizService.getParticipants(session.id);
      if (data.length > 0) {
        setParticipants(data);
      }
    } catch (err) {
      console.warn('[LiveQuizLobby] load participants notice:', err);
    }
  }, [session.id]);

  // 5. Connect to Supabase Realtime Channel
  useEffect(() => {
    loadParticipants();

    const channel = liveQuizService.createRealtimeChannel(pin);
    if (!channel) return;
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const liveUsers: LiveQuizParticipant[] = [];

        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (
              p.student_id &&
              p.display_name &&
              p.role !== 'teacher' &&
              p.student_id !== session.teacher_id
            ) {
              liveUsers.push({
                id: p.student_id,
                session_id: session.id,
                student_id: p.student_id,
                display_name: p.display_name,
                avatar_url: p.avatar_url || null,
                score: p.score || 0,
                last_earned_points: 0,
                joined_at: new Date().toISOString()
              });
            }
          });
        });

        if (liveUsers.length > 0) {
          setParticipants((prev) => {
            const map = new Map<string, LiveQuizParticipant>();
            prev
              .filter((item) => item.student_id !== session.teacher_id)
              .forEach((item) => map.set(item.student_id, item));
            liveUsers.forEach((item) => map.set(item.student_id, item));
            return Array.from(map.values());
          });
        }
      })
      .on('broadcast', { event: 'quiz_started' }, (payload: any) => {
        if (!isTeacher && session.teacher_id !== user?.id) {
          const startMs = payload?.payload?.starts_at || Date.now();
          const q0Dur =
            session.quiz?.questions?.[0]?.durationSec || session.question_duration_sec || 20;
          navigate(`/classes/${session.classroom_id}/live-quiz/play/${session.id}`, {
            state: {
              initialSession: {
                ...session,
                status: 'in_progress',
                current_question_index: 0,
                started_at: new Date(startMs).toISOString(),
                question_start_ms: startMs,
                question_duration_sec: q0Dur
              },
              totalQuestions: payload?.payload?.total_questions || questionsCount
            }
          });
        }
      })
      .on('broadcast', { event: 'question_started' }, (payload: any) => {
        if (!isTeacher && session.teacher_id !== user?.id) {
          const qData = payload?.payload;
          const startMs = qData?.questionStartMs || Date.now();
          const durSec = qData?.durationSec || session.question_duration_sec || 20;
          navigate(`/classes/${session.classroom_id}/live-quiz/play/${session.id}`, {
            state: {
              initialSession: {
                ...session,
                status: 'in_progress',
                current_question_index: qData?.qIndex ?? 0,
                started_at: new Date(startMs).toISOString(),
                question_start_ms: startMs,
                question_duration_sec: durSec
              },
              totalQuestions: qData?.totalQuestions || questionsCount,
              initialQuestionPayload: qData
            }
          });
        }
      })
      .on('broadcast', { event: 'quiz_cancelled' }, () => {
        alert('This Live Quiz was cancelled by the teacher.');
        navigate(`/classes/${session.classroom_id}`);
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_quiz_sessions',
          filter: `id=eq.${session.id}`
        },
        (payload: any) => {
          if (
            !isTeacher &&
            session.teacher_id !== user?.id &&
            (payload.new?.status === 'in_progress' || payload.new?.status === 'reveal')
          ) {
            navigate(`/classes/${session.classroom_id}/live-quiz/play/${session.id}`, {
              state: { initialSession: { ...session, ...payload.new } }
            });
          }
          if (payload.new?.status === 'cancelled') {
            alert('This Live Quiz was cancelled.');
            navigate(`/classes/${session.classroom_id}`);
          }
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          const isCurrentHost = isTeacher || session.teacher_id === user.id;
          const name =
            profile?.full_name ||
            profile?.name ||
            user.email?.split('@')[0] ||
            (isCurrentHost ? 'Host' : 'Student');
          await channel.track({
            student_id: user.id,
            display_name: name,
            avatar_url: profile?.avatar_url || profile?.avatarUrl || null,
            role: isCurrentHost ? 'teacher' : 'student',
            score: 0
          });
        }
      });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [pin, session, user, isTeacher, profile, questionsCount, loadParticipants, navigate]);

  const handleCopyLink = () => {
    quizAudioService.playClick();
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelSession = async () => {
    const confirmMsg = isScheduled
      ? 'Are you sure you want to cancel this scheduled quiz? Students will be notified.'
      : 'Are you sure you want to cancel this live quiz session? The lobby will be closed.';
    if (!confirm(confirmMsg)) return;
    setIsCancelling(true);
    try {
      await liveQuizService.cancelSession(session.id);
      navigate(`/classes/${session.classroom_id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel quiz session');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleStart = async () => {
    quizAudioService.playClick();
    setIsStarting(true);

    try {
      await liveQuizService.startSession(session.id, session.classroom_id, questionsCount);

      if (channelRef.current) {
        try {
          await channelRef.current.send({
            type: 'broadcast',
            event: 'quiz_started',
            payload: {
              session_id: session.id,
              total_questions: questionsCount,
              starts_at: Date.now()
            }
          });

          const q0 = session.quiz?.questions?.[0];
          if (q0) {
            await channelRef.current.send({
              type: 'broadcast',
              event: 'question_started',
              payload: {
                qIndex: 0,
                question: q0.question,
                options: q0.options,
                durationSec: session.question_duration_sec || q0.durationSec || 20,
                questionStartMs: Date.now(),
                totalQuestions: questionsCount
              }
            });
          }
        } catch (broadcastErr) {
          console.warn('[LiveQuizLobby] Realtime broadcast warning:', broadcastErr);
        }
      }

      if (onStartQuiz) {
        onStartQuiz();
      } else {
        navigate(`/classes/${session.classroom_id}/live-quiz/host/${session.id}`);
      }
    } catch (err) {
      console.error('[LiveQuizLobby] handleStart error:', err);
      if (onStartQuiz) {
        onStartQuiz();
      } else {
        navigate(`/classes/${session.classroom_id}/live-quiz/host/${session.id}`);
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleToggleSound = () => {
    quizAudioService.playClick();
    setSoundEnabled((prev) => !prev);
  };

  const handleExitLobby = () => {
    quizAudioService.playClick();
    if (isTeacher && !isScheduled && participants.length === 0) {
      if (confirm('Do you want to cancel this live quiz lobby before leaving?')) {
        liveQuizService.cancelSession(session.id).catch(() => {});
      }
    }
    navigate(`/classes/${session.classroom_id}`);
  };

  return (
    <div className="relative w-full max-w-[460px] mx-auto my-auto select-none">
      {/* Main White/Light Rounded Card Shell */}
      <div className="relative bg-white rounded-[28px] p-4 sm:p-6 border border-[#DCEBFA] shadow-[0_20px_50px_rgba(8,124,245,0.08)] flex flex-col justify-between space-y-5">
        {/* 1. TOP HEADER */}
        <QuizHeader
          uppercaseBrand={true}
          subtitle="LIVE QUIZ"
          isMuted={!soundEnabled}
          onToggleSound={handleToggleSound}
          rightSlot={
            <>
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-full bg-[#EAF7FF] hover:bg-[#D8F0FF] border border-[#BCE3FF] text-[#087CF5] transition-all text-xs font-extrabold cursor-pointer active:scale-95"
                title="Click to copy join link"
              >
                <span className="text-[10px] text-[#087CF5] uppercase font-black">PIN</span>
                <span className="font-mono font-black text-[#10245A]">{pin}</span>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-[#18B981]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[#087CF5]" />
                )}
              </button>

              <ExitButton onClick={handleExitLobby} label="Exit" />
            </>
          }
        />

        {/* 2. CENTER WAITING / HOST READINESS HERO */}
        <div className="relative rounded-[24px] bg-gradient-to-b from-[#EAF7FF] to-[#F5FBFF] border border-[#DCEBFA] px-4 py-6 text-center overflow-hidden">
          {/* Subtle Decorative Floating Accents */}
          <div className="absolute -top-10 -left-10 w-28 h-28 rounded-full bg-[#08AEEF]/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-28 h-28 rounded-full bg-[#087CF5]/10 blur-xl pointer-events-none" />

          {isScheduled ? (
            /* Scheduled Countdown Mode */
            <div className="relative z-10 flex flex-col items-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white border border-[#BCE3FF] text-[#087CF5] text-xs font-extrabold uppercase tracking-wider shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-[#087CF5] animate-pulse" />
                <span>Starts In</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-[#10245A] tabular-nums">
                {formattedCountdown}
              </div>
              <p className="text-xs text-[#4A608A] font-semibold">
                {isTeacher ? 'Waiting Room • Scheduled Start' : 'Waiting for the host...'}
              </p>
            </div>
          ) : (
            /* Standard Live Waiting Room Mode */
            <div className="relative z-10 flex flex-col items-center space-y-3">
              {/* Pulsing Waiting Indicator */}
              <div className="relative flex items-center justify-center">
                <span className="absolute w-16 h-16 rounded-full bg-[#08AEEF]/20 animate-ping" />
                <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-[#087CF5] to-[#08AEEF] text-white flex items-center justify-center shadow-[0_8px_20px_rgba(8,124,245,0.28)]">
                  <Hourglass className="w-6 h-6 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#10245A] tracking-tight">
                  {isTeacher ? 'Waiting Room' : 'Waiting for the host...'}
                </h1>
                <div className="inline-flex items-center gap-2 text-xs font-bold text-[#4A608A]">
                  <span className="px-2.5 py-0.5 rounded-md bg-white border border-[#DCEBFA] text-[#087CF5] font-extrabold">
                    {category}
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-[#087CF5]" />
                    <span>{questionsCount} Questions</span>
                  </span>
                </div>
              </div>

              {/* Players Joined Pill Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#CDE4FA] shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#18B981] animate-pulse" />
                <span className="text-xs sm:text-sm font-extrabold text-[#10245A]">
                  {participants.length} {participants.length === 1 ? 'Player' : 'Players'} Joined
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 3. PLAYERS CARD */}
        <div className="w-full bg-white rounded-[22px] p-4 border border-[#E2EEF9] shadow-[0_6px_24px_rgba(16,36,90,0.03)] space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#087CF5]" />
              <h2 className="text-sm font-extrabold text-[#10245A]">Players</h2>
            </div>
            <span className="text-xs font-bold text-[#087CF5]">
              {participants.length} {participants.length === 1 ? 'Player' : 'Players'}
            </span>
          </div>

          {participants.length === 0 ? (
            <div className="py-7 px-4 rounded-2xl bg-[#F8FBFF] border border-dashed border-[#CDE4FA] flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-[#EAF7FF] text-[#087CF5] flex items-center justify-center">
                <Users className="w-5 h-5 animate-pulse" />
              </div>
              <p className="text-xs sm:text-sm font-extrabold text-[#10245A]">
                Share PIN <span className="font-mono text-[#087CF5]">{pin}</span> with students
              </p>
              <p className="text-[11px] text-[#64748B] max-w-xs font-medium">
                Players will appear here in real time as soon as they join.
              </p>
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {participants.map((p, idx) => (
                <PlayerCard
                  key={p.student_id || p.id}
                  name={p.display_name || 'Student'}
                  avatarUrl={p.avatar_url}
                  index={idx}
                  statusText="Online"
                />
              ))}
            </div>
          )}
        </div>

        {/* 4. PRIMARY ACTION / WAITING BAR */}
        <div className="pt-1">
          {isTeacher ? (
            <div className="flex items-center gap-2.5">
              <div className="flex-1">
                <SubmitButton
                  onClick={handleStart}
                  disabled={participants.length === 0}
                  isLoading={isStarting}
                  label="Start Quiz"
                  loadingLabel="Starting Quiz..."
                />
              </div>

              <button
                type="button"
                disabled={isCancelling || isStarting}
                onClick={handleCancelSession}
                className="shrink-0 inline-flex items-center justify-center px-4 py-3.5 sm:py-4 rounded-full border border-[#FECDD3] bg-[#FFF1F5] hover:bg-[#FFE4EC] text-[#F43F7A] text-xs sm:text-sm font-extrabold transition-all disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel'}
              </button>
            </div>
          ) : (
            <div className="w-full py-3.5 sm:py-4 px-5 rounded-full bg-[#EAF7FF] border border-[#BCE3FF] text-[#087CF5] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2.5 text-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#087CF5] animate-ping" />
              <span>Waiting for host...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
