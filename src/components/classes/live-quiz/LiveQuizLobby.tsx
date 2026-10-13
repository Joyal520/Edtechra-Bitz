import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Copy,
  Check,
  Play,
  Volume2,
  VolumeX,
  ArrowLeft,
  Sparkles,
  Layers,
  Clock,
  Radio
} from 'lucide-react';
import { LiveQuizSession, LiveQuizParticipant } from '@/types/liveQuiz';
import { liveQuizService } from '@/services/liveQuizService';
import { quizAudioService } from '@/services/quizAudioService';
import { useAuth } from '@/context/AuthContext';
import { getQuizCover, DEFAULT_QUIZ_COVER } from '@/utils/quizCover';

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
  const isScheduledSession = Boolean(session.started_at && (session.status === 'lobby' || effectiveState === 'scheduled'));
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
  const coverUrl = getQuizCover(session.quiz);
  const quizTitle = session.quiz?.title || 'Classroom Live Quiz';
  const category = session.quiz?.category || 'General';

  // Proactively fetch question count if missing from session
  const [realQuestionsCount, setRealQuestionsCount] = useState<number>(() => session.quiz?.questions?.length || 0);

  useEffect(() => {
    if (session.quiz?.questions?.length) {
      setRealQuestionsCount(session.quiz.questions.length);
      return;
    }
    const quizId = session.quiz_id || session.quiz?.id;
    if (session.id) {
      liveQuizService.getStudentQuestions(session.id).then((qs) => {
        if (qs && qs.length > 0) {
          setRealQuestionsCount(qs.length);
        } else if (quizId) {
          liveQuizService.getQuizById(quizId).then((q) => {
            if (q?.questions?.length) {
              setRealQuestionsCount(q.questions.length);
            }
          });
        }
      }).catch(() => {});
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
      const q0EndsAtMs = startMs + (q0Dur * 1000);

      // Reconcile scheduled session
      liveQuizService.reconcileScheduledSession(session.id, session.classroom_id).then((fresh) => {
        const freshQ0Dur = fresh?.quiz?.questions?.[0]?.durationSec || fresh?.question_duration_sec || q0Dur;
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
          questionEndsAtMs: freshStartMs + (freshQ0Dur * 1000),
          totalQuestions: questionsCount
        };

        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'quiz_started',
            payload: { session_id: session.id, total_questions: questionsCount, starts_at: freshStartMs }
          }).catch(() => {});

          channelRef.current.send({
            type: 'broadcast',
            event: 'question_started',
            payload: questionPayload
          }).catch(() => {});
        }

        if (isTeacher) {
          if (onStartQuiz) onStartQuiz();
          else navigate(`/classes/${session.classroom_id}/live-quiz/host/${session.id}`, { state: { initialSession: activeSession } });
        } else {
          navigate(`/classes/${session.classroom_id}/live-quiz/play/${session.id}`, {
            state: {
              initialSession: activeSession,
              initialQuestionPayload: questionPayload
            }
          });
        }
      }).catch((err) => {
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
          navigate(`/classes/${session.classroom_id}/live-quiz/host/${session.id}`, { state: { initialSession: fallbackSession } });
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
            if (p.student_id && p.display_name && p.role !== 'teacher' && p.student_id !== session.teacher_id) {
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
            prev.filter((item) => item.student_id !== session.teacher_id).forEach((item) => map.set(item.student_id, item));
            liveUsers.forEach((item) => map.set(item.student_id, item));
            return Array.from(map.values());
          });
        }
      })
      .on('broadcast', { event: 'quiz_started' }, (payload: any) => {
        if (!isTeacher && session.teacher_id !== user?.id) {
          const startMs = payload?.payload?.starts_at || Date.now();
          const q0Dur = session.quiz?.questions?.[0]?.durationSec || session.question_duration_sec || 20;
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
          if (!isTeacher && session.teacher_id !== user?.id && (payload.new?.status === 'in_progress' || payload.new?.status === 'reveal')) {
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
          const name = profile?.full_name || profile?.name || user.email?.split('@')[0] || (isCurrentHost ? 'Host' : 'Student');
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
    <div className="relative w-full max-w-lg mx-auto min-h-[100dvh] sm:min-h-0 sm:max-h-[92vh] flex flex-col justify-between p-3 sm:p-5 text-white bg-transparent">
      
      {/* 1. TOP BAR: BRANDING & QUICK ACTIONS (No heavy outer border) */}
      <div className="shrink-0 flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="EdTechra"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain"
          />
          <div>
            <div className="font-extrabold text-white text-sm sm:text-base leading-none tracking-tight">EdTechra</div>
            <div className="text-[10px] text-sky-400 font-bold uppercase tracking-wider mt-0.5">
              Live Lounge
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* PIN badge with copy interaction */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/30 text-sky-300 transition-colors text-xs font-bold cursor-pointer"
            title="Click to copy join link"
          >
            <span className="text-[10px] text-sky-400 uppercase font-black">PIN</span>
            <span className="font-mono font-black text-white">{pin}</span>
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-sky-400/80" />}
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute audio' : 'Unmute audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-sky-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Exit */}
          <button
            type="button"
            onClick={handleExitLobby}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/15 px-3 py-1.5 rounded-full border border-white/10 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* 2. QUIZ HEADER BANNER: COMPACT, ELEGANT HERO */}
      <div className="shrink-0 mt-3 relative rounded-2xl overflow-hidden bg-slate-900/80 border border-white/10 p-3 sm:p-3.5 flex items-center gap-3 shadow-md">
        {/* Cover thumbnail */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-slate-800 border border-white/10 shadow-sm">
          <img
            src={coverUrl}
            alt={quizTitle}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = DEFAULT_QUIZ_COVER;
            }}
          />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/30">
              {category}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
              <Layers className="w-3 h-3 text-slate-400" />
              <span>{questionsCount} Questions</span>
            </span>
          </div>

          <h1 className="text-sm sm:text-base font-extrabold text-white truncate leading-snug" title={quizTitle}>
            {quizTitle}
          </h1>

          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Lobby Active</span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. CENTRAL GAME READINESS & COUNTDOWN HUB (NO EXCESSIVE BOXES) */}
      <div className="shrink-0 my-4 flex flex-col items-center justify-center text-center">
        {isScheduled ? (
          /* Scheduled Countdown Mode */
          <div className="flex flex-col items-center space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-300 text-xs font-bold uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              <span>Starts In</span>
            </div>
            <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-indigo-200 to-emerald-300">
              {formattedCountdown}
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Synchronized start across all participant devices
            </p>
          </div>
        ) : (
          /* Live Readiness Mode */
          <div className="flex flex-col items-center space-y-2">
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-sky-500/20 to-emerald-500/20 border border-emerald-400/40 flex flex-col items-center justify-center shadow-[0_0_25px_rgba(52,211,153,0.15)]">
                <span className="text-2xl font-black font-mono text-emerald-300 leading-none">
                  {participants.length}
                </span>
                <span className="text-[10px] font-extrabold uppercase text-slate-300 tracking-wider mt-0.5">
                  Joined
                </span>
              </div>
            </div>

            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>
                {participants.length === 0
                  ? 'Waiting for players to join with the PIN...'
                  : `${participants.length} ${participants.length === 1 ? 'player is' : 'players are'} in the lobby`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4. DYNAMIC PARTICIPANTS CONTAINER (NO GIANT EMPTY VOID BOX) */}
      <div className="flex-1 min-h-0 flex flex-col justify-start my-2">
        <div className="flex items-center justify-between pb-1.5 mb-2 text-xs font-bold text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-200">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span>Participants ({participants.length})</span>
          </span>
          <span className="text-[11px] text-emerald-400 font-semibold">
            {participants.length > 0 ? 'Ready to play' : 'Join using PIN'}
          </span>
        </div>

        {participants.length === 0 ? (
          /* Compact, purposeful empty state */
          <div className="py-6 px-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Users className="w-5 h-5 animate-pulse" />
            </div>
            <p className="text-xs font-semibold text-slate-300">
              Share PIN <span className="font-mono text-sky-400 font-black">{pin}</span> with students
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs">
              Players will appear here as soon as they enter the code.
            </p>
          </div>
        ) : (
          /* Dynamic-height list that fits player count naturally */
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-white/20">
            {participants.map((p) => {
              const initials = (p.display_name || 'U').slice(0, 2).toUpperCase();
              return (
                <div
                  key={p.student_id}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:border-sky-400/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center overflow-hidden">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          initials
                        )}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#060c1d]" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      {p.display_name}
                    </span>
                  </div>

                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
                    <Check className="w-3 h-3" />
                    <span>Ready</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. MINIMALIST HINT / TIP (Single elegant line, NO dual bulky boxes) */}
      <div className="shrink-0 py-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-500/5 border border-sky-400/15 text-slate-300 text-[11px] leading-tight">
          <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>
            <strong className="text-sky-300 font-bold">Pro Tip:</strong> Faster correct answers earn higher streak multipliers and speed points!
          </span>
        </div>
      </div>

      {/* 6. PRIMARY ACTION BUTTON */}
      <div className="shrink-0 pt-2">
        {isTeacher ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isStarting || participants.length === 0}
              onClick={handleStart}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 rounded-2xl text-xs sm:text-sm font-extrabold shadow-lg shadow-teal-500/20 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {isStarting
                  ? 'Starting Quiz...'
                  : participants.length > 0
                    ? `Start Quiz Now (${participants.length} Ready)`
                    : 'Start Quiz Now'}
              </span>
            </button>

            <button
              type="button"
              disabled={isCancelling || isStarting}
              onClick={handleCancelSession}
              className="shrink-0 inline-flex items-center justify-center px-4 py-3.5 rounded-2xl border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          </div>
        ) : (
          <div className="w-full py-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2.5 text-center shadow-lg shadow-emerald-500/10">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Waiting for host to start the quiz...</span>
          </div>
        )}
      </div>

    </div>
  );
};
