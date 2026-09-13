import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Copy,
  Check,
  Play,
  Volume2,
  VolumeX,
  Sparkles,
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

  // 1. Stale-state / Reconnection Guard: If quiz is already active, navigate immediately
  useEffect(() => {
    // Start background lobby music
    quizAudioService.startBackgroundMusic();

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

  // 3. Auto-Transition when countdown expires (Scheduled quizzes start automatically — zero teacher action needed!)
  const hasAutoStartedRef = useRef(false);

  useEffect(() => {
    if (!targetStartMs) return;

    if (remainingSec <= 0 && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      setIsStarting(true);

      // 1. Authoritatively reconcile session state
      liveQuizService.reconcileScheduledSession(session.id, session.classroom_id).then((fresh) => {
        const activeSession = fresh || { ...session, status: 'in_progress', current_question_index: 0 };

        // 2. Broadcast on channel if present
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'quiz_started',
            payload: { session_id: session.id, total_questions: questionsCount, starts_at: Date.now() }
          }).catch(() => {});
        }

        // 3. Navigate automatically
        if (isTeacher) {
          if (onStartQuiz) onStartQuiz();
          else navigate(`/classes/${session.classroom_id}/live-quiz/host/${session.id}`, { state: { initialSession: activeSession } });
        } else {
          navigate(`/classes/${session.classroom_id}/live-quiz/play/${session.id}`, { state: { initialSession: activeSession } });
        }
      }).catch(() => {
        // Fallback navigation even if offline/network error
        const fallbackSession = { ...session, status: 'in_progress', current_question_index: 0 };
        if (isTeacher) {
          navigate(`/classes/${session.classroom_id}/live-quiz/host/${session.id}`, { state: { initialSession: fallbackSession } });
        } else {
          navigate(`/classes/${session.classroom_id}/live-quiz/play/${session.id}`, { state: { initialSession: fallbackSession } });
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
          navigate(`/classes/${session.classroom_id}/live-quiz/play/${session.id}`, {
            state: {
              initialSession: { ...session, status: 'in_progress', current_question_index: 0 },
              totalQuestions: payload?.payload?.total_questions || questionsCount
            }
          });
        }
      })
      .on('broadcast', { event: 'question_started' }, () => {
        if (!isTeacher && session.teacher_id !== user?.id) {
          navigate(`/classes/${session.classroom_id}/live-quiz/play/${session.id}`, {
            state: {
              initialSession: { ...session, status: 'in_progress', current_question_index: 0 },
              totalQuestions: questionsCount
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

  return (
    <div className="relative min-h-[82vh] bg-gradient-to-br from-[#031528] via-[#092b4e] to-[#0f4477] text-white rounded-3xl p-5 sm:p-8 md:p-10 shadow-2xl overflow-hidden border border-sky-500/20 flex flex-col justify-between space-y-6">
      
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 -mb-20 w-80 h-80 rounded-full bg-sky-400/15 blur-3xl pointer-events-none" />

      {/* Top Header: Navigation, Authoritative Status, Compact Game PIN & Sound */}
      <div className="relative z-10 flex items-center justify-between gap-3 flex-wrap">
        
        {/* Left: Exit Lobby */}
        <button
          type="button"
          onClick={() => {
            if (isTeacher && !isScheduled && participants.length === 0) {
              if (confirm('Do you want to cancel this live quiz lobby before leaving?')) {
                liveQuizService.cancelSession(session.id).catch(() => {});
              }
            }
            navigate(`/classes/${session.classroom_id}`);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-200 hover:text-white bg-white/10 hover:bg-white/15 px-3.5 py-1.5 rounded-full transition-all border border-white/10 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Lobby</span>
        </button>

        {/* Center / Status Badge */}
        {isScheduled && scheduledTimeStr ? (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-black shadow-sm">
            <Calendar className="w-3.5 h-3.5" />
            <span>STATUS: SCHEDULED</span>
            <span className="text-white/60">•</span>
            <span>
              Starts at {new Date(scheduledTimeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-black shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>STATUS: LIVE NOW</span>
          </div>
        )}

        {/* Right Controls: Compact Game PIN & Audio */}
        <div className="flex items-center gap-2.5">
          {/* Game PIN Pill — Only shown to teacher to display to class */}
          {isTeacher && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-white shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-300">
                {session.classroom_id ? 'Guest PIN:' : 'Game PIN:'}
              </span>
              <span className="font-mono font-black text-amber-300 tracking-wider text-sm">{pin}</span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-1 rounded-md hover:bg-white/15 text-sky-200 hover:text-white transition-colors cursor-pointer"
                title="Copy Direct Join Link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute audio' : 'Unmute audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* Main Center Display: Prioritizing Quiz Cover, Title, Countdown, & Status */}
      <div className="relative z-10 text-center space-y-6 max-w-2xl mx-auto w-full">
        
        {/* Prominent Quiz Cover Image Card with Badge */}
        <div className="relative w-full max-w-md mx-auto aspect-video rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-900/80 group">
          <img
            src={coverUrl}
            alt={quizTitle}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              e.currentTarget.src = DEFAULT_QUIZ_COVER;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent pointer-events-none" />

          {/* Top-Left Category Badge */}
          <div className="absolute top-3 left-3">
            <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${badgeStyle.bg} ${badgeStyle.text} border ${badgeStyle.border} shadow-md`}>
              {category}
            </span>
          </div>

          {/* Top-Right Question Count Badge */}
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-black/60 backdrop-blur-md border border-white/20 text-sky-200 shadow-md">
              <Layers className="w-3 h-3 text-sky-400" />
              <span>{questionsCount} Questions</span>
            </span>
          </div>

          {/* Bottom Title Bar over Image */}
          <div className="absolute bottom-3 left-4 right-4 text-left pointer-events-none">
            <h2 className="text-lg sm:text-xl font-black text-white drop-shadow-md truncate">
              {quizTitle}
            </h2>
          </div>
        </div>

        {/* State A: SCHEDULED LOBBY — Prominent Synchronized Countdown */}
        {isScheduled && (
          <div className="p-6 sm:p-7 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl space-y-3 animate-in zoom-in-95 max-w-lg mx-auto">
            <div className="flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-widest text-emerald-300">
              <Clock className="w-4 h-4 animate-pulse" />
              <span>Quiz Starts In</span>
            </div>
            <div className="font-mono font-black text-5xl sm:text-7xl text-emerald-300 drop-shadow-md tracking-wider">
              {formattedCountdown}
            </div>
            <p className="text-xs sm:text-sm text-sky-100 font-medium">
              {!isTeacher
                ? 'Please wait. The quiz will start automatically when the countdown reaches zero.'
                : 'Students are entering the waiting lobby. The quiz is scheduled to begin at 00:00.'}
            </p>
          </div>
        )}

        {/* State B: LIVE NOW / READY — Auto-Start for Scheduled, or Teacher Controls for Live */}
        {isReady && (
          <div className="max-w-lg mx-auto w-full animate-in zoom-in-95">
            {targetStartMs ? (
              <div className="p-6 sm:p-7 bg-emerald-500/20 backdrop-blur-md rounded-3xl border border-emerald-400/40 shadow-2xl space-y-3">
                <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Scheduled Start Reached</span>
                </div>
                <div className="w-10 h-10 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto my-2" />
                <h3 className="text-lg sm:text-xl font-black text-white">Starting Quiz Automatically!</h3>
                <p className="text-xs text-slate-200 font-medium">
                  The countdown is complete. Transitioning to Question 1 automatically...
                </p>
              </div>
            ) : isTeacher ? (
              <div className="p-6 sm:p-7 bg-emerald-500/15 backdrop-blur-md rounded-3xl border border-emerald-400/30 shadow-2xl space-y-4">
                <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Ready to Begin</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  {participants.length > 0
                    ? `${participants.length} Student${participants.length > 1 ? 's' : ''} Connected & Ready`
                    : 'Lobby is Open — Waiting for Students to Join'}
                </h3>
                <p className="text-xs text-slate-200 font-medium">
                  When students have joined, click below to begin. All connected student devices will automatically transition to Question 1.
                </p>
                <button
                  type="button"
                  disabled={isStarting}
                  onClick={handleStart}
                  className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 rounded-2xl text-base font-black shadow-xl active:scale-95 transition-all disabled:opacity-50 cursor-pointer inline-flex items-center justify-center gap-2.5"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>
                    {isStarting
                      ? 'Starting Question 1...'
                      : participants.length > 0
                        ? `Start Quiz (${participants.length} Ready)`
                        : 'Start Quiz'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="p-6 sm:p-7 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl space-y-4">
                <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Get Ready!</span>
                </div>
                <div className="w-10 h-10 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto my-2" />
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Get Ready!
                </h3>
                <p className="text-sm text-sky-100 font-semibold">
                  Waiting for the teacher to start the quiz.
                </p>
                <p className="text-xs text-slate-300 font-medium">
                  Sit tight! Question 1 will appear automatically on your screen without refreshing.
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Bottom Section: Connected Players Grid & Host Action Controls */}
      <div className="relative z-10 space-y-4">
        
        <div className="flex items-center justify-between border-b border-white/15 pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <Users className="w-4 h-4 text-sky-300" />
            <span>Players Connected ({participants.length})</span>
          </div>

          {isTeacher && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isCancelling || isStarting}
                onClick={handleCancelSession}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-400/40 text-rose-300 hover:bg-rose-500/20 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                {isCancelling ? 'Cancelling...' : isScheduled ? 'Cancel Scheduled Quiz' : 'Cancel Live Quiz'}
              </button>

              {/* Early Start button for teacher if scheduled but all students are already ready */}
              {isScheduled && (
                <button
                  type="button"
                  disabled={isStarting || participants.length === 0}
                  onClick={handleStart}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-xl text-xs font-black shadow-xl active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {isStarting
                      ? 'Starting...'
                      : `Start Question 1 Now (${participants.length} Ready)`}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Players Avatar Pills */}
        {participants.length === 0 ? (
          <div className="py-8 text-center text-xs font-bold text-slate-300 animate-pulse flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>
              {session.classroom_id ? (
                <>Waiting for classroom students to join...</>
              ) : (
                <>Waiting for students to connect using Game PIN <strong className="text-white font-mono text-sm">{pin}</strong>...</>
              )}
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2.5 max-h-40 overflow-y-auto py-2">
            {participants.map((p) => {
              const initials = p.display_name.slice(0, 2).toUpperCase();
              return (
                <div
                  key={p.student_id}
                  className="flex items-center gap-2 px-3.5 py-1.5 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 text-xs font-black text-white animate-in zoom-in-90 duration-200"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-300 text-slate-900 font-black text-[10px] flex items-center justify-center overflow-hidden">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <span>{p.display_name}</span>
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
};
