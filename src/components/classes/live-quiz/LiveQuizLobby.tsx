import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Calendar
} from 'lucide-react';
import { LiveQuizSession, LiveQuizParticipant } from '@/types/liveQuiz';
import { liveQuizService } from '@/services/liveQuizService';
import { quizAudioService } from '@/services/quizAudioService';
import { useAuth } from '@/context/AuthContext';

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

  const effectiveState = liveQuizService.getEffectiveSessionState(session);
  const isScheduled = effectiveState === 'scheduled';
  const scheduledTimeStr = session.scheduled_start_at || session.started_at;
  const targetStartMs = useMemo(() => {
    return scheduledTimeStr ? new Date(scheduledTimeStr).getTime() : null;
  }, [scheduledTimeStr]);

  const [remainingSec, setRemainingSec] = useState<number>(() => {
    if (!targetStartMs) return 0;
    return Math.max(0, Math.ceil((targetStartMs - Date.now()) / 1000));
  });

  const hasAutoStartedRef = useRef(false);

  const pin = session.pin;
  const joinUrl = `${window.location.origin}/classes/live-quiz/join/${pin}`;

  // Synchronized countdown timer & zero-second auto-transition
  useEffect(() => {
    if (!isScheduled || !targetStartMs) return;

    const tick = async () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((targetStartMs - now) / 1000));
      setRemainingSec(diff);

      if (diff <= 0 && !hasAutoStartedRef.current) {
        hasAutoStartedRef.current = true;
        // Countdown reached 0: Automatically start quiz!
        if (isTeacher) {
          handleStart();
        } else {
          // Student triggers authoritative reconciliation fallback
          try {
            await liveQuizService.reconcileScheduledSession(session.id, session.classroom_id);
          } catch (e) {
            console.warn('[LiveQuizLobby] Student auto-reconcile trigger:', e);
          }
        }
      }
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [isScheduled, targetStartMs, isTeacher, session.id, session.classroom_id]);

  const formattedCountdown = useMemo(() => {
    const hours = Math.floor(remainingSec / 3600);
    const mins = Math.floor((remainingSec % 3600) / 60);
    const secs = remainingSec % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [remainingSec]);

  useEffect(() => {
    // Strictly ensure no background music is playing in lobby
    quizAudioService.stopBackgroundMusic();

    // If student arrives when quiz is already active, redirect immediately to play
    if (!isTeacher && session.status === 'in_progress') {
      navigate(`/classes/${session.classroom_id}/live-quiz/play/${session.id}`, {
        state: { initialSession: session }
      });
      return;
    }

    // 1. Initial participants load from database
    loadParticipants();

    // 2. Connect to Supabase Realtime Channel
    const channel = liveQuizService.createRealtimeChannel(pin);
    if (!channel) return;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const liveUsers: LiveQuizParticipant[] = [];

        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            // Exclude teacher role from participants list
            if (p.student_id && p.display_name && p.role !== 'teacher') {
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
          // Merge unique
          setParticipants((prev) => {
            const map = new Map<string, LiveQuizParticipant>();
            prev.forEach((item) => map.set(item.student_id, item));
            liveUsers.forEach((item) => map.set(item.student_id, item));
            return Array.from(map.values());
          });
        }
      })
      .on('broadcast', { event: 'quiz_started' }, (payload: any) => {
        if (!isTeacher) {
          navigate(`/classes/${session.classroom_id}/live-quiz/play/${session.id}`, {
            state: { initialSession: session, totalQuestions: payload?.payload?.total_questions }
          });
        }
      })
      .on('broadcast', { event: 'question_started' }, () => {
        if (!isTeacher) {
          navigate(`/classes/${session.classroom_id}/live-quiz/play/${session.id}`, {
            state: { initialSession: session }
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
          if (!isTeacher && payload.new?.status === 'in_progress') {
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
          const name = profile?.full_name || profile?.name || user.email?.split('@')[0] || 'Student';
          await channel.track({
            student_id: user.id,
            display_name: name,
            avatar_url: profile?.avatar_url || profile?.avatarUrl || null,
            role: isTeacher ? 'teacher' : 'student',
            score: 0
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [pin, session.id, session.status, session.classroom_id, user, isTeacher, navigate]);

  const loadParticipants = async () => {
    try {
      const data = await liveQuizService.getParticipants(session.id);
      if (data.length > 0) {
        setParticipants(data);
      }
    } catch (err) {
      console.warn('[LiveQuizLobby] load participants notice:', err);
    }
  };

  const handleCopyLink = () => {
    quizAudioService.playClick();
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelSession = async () => {
    if (!confirm('Are you sure you want to cancel this scheduled quiz? Students will be notified.')) return;
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
    if (!onStartQuiz) return;
    quizAudioService.playClick();
    setIsStarting(true);

    try {
      // 1. Broadcast quiz_started
      const channel = liveQuizService.createRealtimeChannel(pin);
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'quiz_started',
          payload: {
            session_id: session.id,
            total_questions: session.quiz?.questions.length || 0,
            starts_at: Date.now()
          }
        });
      }

      onStartQuiz();
    } catch (err) {
      alert('Failed to start quiz');
      setIsStarting(false);
    }
  };

  return (
    <div className="relative min-h-[80vh] bg-gradient-to-br from-[#031528] via-[#092b4e] to-[#0f4477] text-white rounded-3xl p-6 sm:p-10 shadow-2xl overflow-hidden border border-sky-500/20 flex flex-col justify-between space-y-8">
      
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 -mb-20 w-80 h-80 rounded-full bg-sky-400/15 blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
        <button
          type="button"
          onClick={() => navigate(`/classes/${session.classroom_id}`)}
          className="inline-flex items-center gap-2 text-xs font-bold text-sky-200 hover:text-white bg-white/10 hover:bg-white/15 px-3.5 py-1.5 rounded-full transition-all border border-white/10 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Lobby</span>
        </button>

        {/* SCHEDULED / LIVE BADGE */}
        {isScheduled && scheduledTimeStr ? (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-black">
            <Calendar className="w-3.5 h-3.5" />
            <span>STATUS: SCHEDULED</span>
            <span className="text-white/60">•</span>
            <span>
              Starts at {new Date(scheduledTimeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-black">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>STATUS: LIVE NOW</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            title={soundEnabled ? 'Mute audio' : 'Unmute audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Center Display: Scheduled Countdown OR Live PIN Display */}
      <div className="relative z-10 text-center space-y-6 max-w-2xl mx-auto">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-400/20 text-sky-300 text-xs font-black uppercase tracking-wider border border-sky-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isScheduled ? 'Scheduled Live Challenge' : 'Live Multiplayer Game'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            {session.quiz?.title || 'Classroom Live Quiz'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            {isScheduled
              ? !isTeacher
                ? 'You are connected. Please wait for the quiz to start.'
                : 'Students are entering the waiting lobby. The quiz will begin automatically at 00:00.'
              : 'Join on your phone or computer to compete in real-time!'}
          </p>
        </div>

        {/* Prominent Synchronized Countdown for Scheduled Sessions */}
        {isScheduled && (
          <div className="p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl space-y-3 animate-in zoom-in-95">
            <div className="flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-widest text-emerald-300">
              <Clock className="w-4 h-4 animate-pulse" />
              <span>Quiz Starts In</span>
            </div>
            <div className="font-mono font-black text-5xl sm:text-7xl text-emerald-300 drop-shadow-md tracking-wider">
              {formattedCountdown}
            </div>
            <p className="text-xs text-sky-200 font-medium">
              {!isTeacher
                ? 'Sit tight! Question 1 will automatically appear when the timer reaches zero.'
                : 'Synchronized server-authoritative countdown active across all student devices.'}
            </p>
          </div>
        )}

        {/* 6-Digit PIN Boxes */}
        <div className="inline-block p-4 sm:p-5 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl">
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-sky-300 mb-2">
            Game PIN
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            {pin.split('').map((digit, idx) => (
              <div
                key={idx}
                className="w-10 h-14 sm:w-14 sm:h-18 bg-white text-slate-900 rounded-2xl flex items-center justify-center font-mono font-black text-2xl sm:text-3xl shadow-lg"
              >
                {digit}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-extrabold transition-all border border-white/20 cursor-pointer shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link Copied!' : 'Copy Direct Join Link'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Participants Live Grid & Action Bar */}
      <div className="relative z-10 space-y-4">
        
        <div className="flex items-center justify-between border-b border-white/15 pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <Users className="w-4 h-4 text-sky-300" />
            <span>Players Connected ({participants.length})</span>
          </div>

          {isTeacher && (
            <div className="flex items-center gap-3">
              {isScheduled && (
                <button
                  type="button"
                  disabled={isCancelling || isStarting}
                  onClick={handleCancelSession}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-400/40 text-rose-300 hover:bg-rose-500/20 text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isCancelling ? 'Cancelling...' : 'Cancel Scheduled Quiz'}
                </button>
              )}

              <button
                type="button"
                disabled={isStarting || participants.length === 0}
                onClick={handleStart}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-2xl text-xs font-black shadow-xl active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {isStarting
                    ? 'Starting Quiz...'
                    : isScheduled
                    ? `Start Quiz Now (${participants.length} Ready)`
                    : `Start Quiz (${participants.length} Ready)`}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Players Avatar Pills */}
        {participants.length === 0 ? (
          <div className="py-12 text-center text-xs font-bold text-slate-400 animate-pulse">
            Waiting for students to join using PIN <strong className="text-white font-mono">{pin}</strong>...
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2.5 max-h-48 overflow-y-auto py-2">
            {participants.map((p) => {
              const initials = p.display_name.slice(0, 2).toUpperCase();
              return (
                <div
                  key={p.student_id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 text-xs font-black text-white animate-in zoom-in-90 duration-200"
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
