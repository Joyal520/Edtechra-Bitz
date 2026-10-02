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
  Clock,
  Calendar,
  Layers
} from 'lucide-react';
import { LiveQuizSession, LiveQuizParticipant } from '@/types/liveQuiz';
import { liveQuizService } from '@/services/liveQuizService';
import { quizAudioService } from '@/services/quizAudioService';
import { useAuth } from '@/context/AuthContext';
import { getQuizCover, DEFAULT_QUIZ_COVER, getQuizCategoryBadgeStyle } from '@/utils/quizCover';

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
  // A session is scheduled if it has session.started_at set and is still in lobby
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
  const isReady = !isScheduled;

  const pin = session.pin;
  const joinUrl = `${window.location.origin}/classes/live-quiz/join/${pin}`;
  const coverUrl = getQuizCover(session.quiz);
  const quizTitle = session.quiz?.title || 'Classroom Live Quiz';
  const category = session.quiz?.category || 'General';
  const badgeStyle = getQuizCategoryBadgeStyle(category);

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
      return `${String(hours).padStart(2, '0')} : ${String(mins).padStart(2, '0')} : ${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')} : ${String(secs).padStart(2, '0')}`;
  }, [remainingSec]);

  // 3. Auto-Transition when countdown expires (Scheduled quizzes start automatically — zero teacher action needed!)
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

      // 1. Authoritatively reconcile session state
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

        // 2. Broadcast on channel if present
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

        // 3. Navigate automatically
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
      // Periodic safety check if countdown is within 2s
      const pollInterval = setInterval(async () => {
        try {
          const fresh = await liveQuizService.getSessionById(session.id);
          if (fresh && (fresh.status === 'in_progress' || fresh.status === 'reveal')) {
            navigate(`/classes/${session.classroom_id}/live-quiz/play/${session.id}`, {
              state: { initialSession: fresh }
            });
          }
        } catch {
          // ignore
        }
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
            // Exclude teacher role or session host from participants list
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

  // 6. Teacher Starts Question 1: Authoritative DB Update + Realtime Broadcast + Navigation
  const handleStart = async () => {
    quizAudioService.playClick();
    setIsStarting(true);

    try {
      // 1. Authoritative DB update FIRST
      await liveQuizService.startSession(session.id, session.classroom_id, questionsCount);

      // 2. Broadcast on the already-connected Realtime channel
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

      // 3. Navigate host teacher view
      if (onStartQuiz) {
        onStartQuiz();
      } else {
        navigate(`/classes/${session.classroom_id}/live-quiz/host/${session.id}`);
      }
    } catch (err) {
      console.error('[LiveQuizLobby] handleStart error:', err);
      // Ensure host proceeds even if offline/fallback
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
    <div className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[94vh] max-w-xl mx-auto bg-gradient-to-b from-[#060c1d] via-[#091636] to-[#040814] text-white p-3 sm:p-5 sm:rounded-3xl border-0 sm:border border-sky-500/20 shadow-2xl flex flex-col justify-between overflow-hidden">
      
      {/* 1. TOP BAR */}
      <div className="shrink-0 flex items-center justify-between gap-2 pb-2 border-b border-white/10">
        {/* Left: Branding */}
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="EdTechra"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain drop-shadow-xs"
          />
          <div className="text-left">
            <div className="font-black text-white text-sm sm:text-base leading-tight tracking-tight">EdTechra</div>
            <div className="text-[9px] sm:text-[10px] text-sky-400 font-extrabold uppercase tracking-wider leading-none">
              Live Quiz
            </div>
          </div>
        </div>

        {/* Right Controls: PIN (if host), Sound Toggle, Exit Lobby */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isTeacher && (
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 hover:text-white hover:bg-sky-500/25 transition-all text-xs font-bold cursor-pointer"
              title="Click to copy direct join link"
            >
              <span className="text-[10px] font-black uppercase text-sky-400">PIN:</span>
              <span className="font-mono font-black text-white tracking-wider text-xs">{pin}</span>
              {copied ? <Check className="w-3 h-3 text-emerald-400 ml-0.5" /> : <Copy className="w-3 h-3 text-sky-400 ml-0.5" />}
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleSound}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute audio' : 'Unmute audio'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-sky-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          <button
            type="button"
            onClick={handleExitLobby}
            className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full transition-all border border-white/15 cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* 2. QUIZ SUMMARY & SINGLE COVER */}
      <div className="shrink-0 space-y-1.5 pt-1">
        {/* Category badge, Quiz title, metadata */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/30">
                {category}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                <Layers className="w-3 h-3 text-slate-400" />
                <span>{questionsCount} Questions</span>
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-black text-white tracking-tight truncate" title={quizTitle}>
              {quizTitle}
            </h1>
          </div>
        </div>

        {/* Uploaded Quiz Cover Image (120-160px, rounded corners, object-cover) */}
        <div className="w-full h-[120px] sm:h-[145px] rounded-2xl overflow-hidden border border-white/10 shadow-lg relative bg-slate-900/60">
          <img
            src={coverUrl}
            alt={quizTitle}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = DEFAULT_QUIZ_COVER;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060c1d]/70 via-transparent to-transparent pointer-events-none" />
        </div>
      </div>

      {/* 3. COUNTDOWN (MAIN FOCUS) */}
      <div className="shrink-0 text-center py-1.5 sm:py-2">
        {isScheduled ? (
          <div className="space-y-0.5">
            <div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-sky-400 flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5 animate-pulse text-sky-400" />
              <span>Quiz Starts In</span>
            </div>
            <div className="font-mono font-black text-3xl sm:text-4xl text-white tracking-widest drop-shadow-[0_0_15px_rgba(56,189,248,0.45)]">
              {formattedCountdown}
            </div>
          </div>
        ) : isReady && targetStartMs ? (
          <div className="space-y-1 py-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Starting Quiz Automatically...</span>
            </div>
            <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mt-1" />
          </div>
        ) : isTeacher ? (
          <div className="space-y-0.5">
            <div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-emerald-400 flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Lobby is Open</span>
            </div>
            <div className="text-xs sm:text-sm font-black text-white">
              {participants.length > 0 ? `${participants.length} Ready to Play` : 'Waiting for Players to Join'}
            </div>
          </div>
        ) : (
          <div className="space-y-0.5">
            <div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-sky-400 flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span>Waiting for Host</span>
            </div>
            <div className="text-xs font-bold text-slate-300">
              Quiz will start automatically when host begins
            </div>
          </div>
        )}
      </div>

      {/* 4. PLAYER STATUS & PLAYERS JOINED */}
      <div className="flex-1 min-h-0 flex flex-col bg-white/[0.04] border border-white/10 rounded-2xl p-2.5 sm:p-3.5 backdrop-blur-md">
        {/* Status Header */}
        <div className="shrink-0 flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10">
          <div className="flex items-center gap-1.5 text-xs font-black text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {participants.length} {participants.length === 1 ? 'Player' : 'Players'} Ready
            </span>
          </div>
          <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Players Joined
          </span>
        </div>

        {/* Players List (Internally Scrollable ONLY) */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-white/20">
          {participants.length === 0 ? (
            <div className="h-full min-h-[70px] flex flex-col items-center justify-center text-center p-2 space-y-1">
              <Users className="w-5 h-5 text-slate-500 animate-pulse" />
              <p className="text-xs text-slate-400 font-medium">
                {session.classroom_id
                  ? 'Waiting for classroom students to join...'
                  : `Waiting for students to join with PIN ${pin}...`}
              </p>
            </div>
          ) : (
            participants.map((p) => {
              const initials = (p.display_name || 'U').slice(0, 2).toUpperCase();
              return (
                <div
                  key={p.student_id}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 hover:border-sky-400/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-black text-[10px] flex items-center justify-center overflow-hidden shadow-xs">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          initials
                        )}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#060c1d]" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      {p.display_name}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider shrink-0">
                    Ready
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. HOST CONTROLS (IF TEACHER) */}
      {isTeacher && (
        <div className="shrink-0 pt-2 flex items-center gap-2">
          <button
            type="button"
            disabled={isStarting || participants.length === 0}
            onClick={handleStart}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-sky-500/20 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>
              {isStarting
                ? 'Starting...'
                : participants.length > 0
                  ? `Start Quiz (${participants.length} Ready)`
                  : 'Start Quiz'}
            </span>
          </button>

          <button
            type="button"
            disabled={isCancelling || isStarting}
            onClick={handleCancelSession}
            className="shrink-0 inline-flex items-center justify-center px-3 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
          >
            {isCancelling ? 'Cancelling...' : 'Cancel'}
          </button>
        </div>
      )}

    </div>
  );
};
