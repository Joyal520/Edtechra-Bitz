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
    <div className="relative min-h-[82vh] bg-gradient-to-b from-[#eaf2f9] via-[#f1f6fc] to-[#e4edf7] text-slate-900 rounded-[32px] p-4 sm:p-7 md:p-8 shadow-xl overflow-hidden border border-sky-200/70 flex flex-col justify-between space-y-6">
      
      {/* Top Header: Branding, Authoritative Status, PIN, Sound, & Exit */}
      <div className="relative z-10 flex items-center justify-between gap-3 flex-wrap">
        
        {/* Left: Official EdTechra Logo & Title */}
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="EdTechra"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain drop-shadow-xs"
          />
          <div className="text-left">
            <div className="font-black text-slate-900 text-base sm:text-lg leading-tight">EdTechra</div>
            <div className="text-[11px] text-sky-600 font-bold tracking-wide">Live Quiz</div>
          </div>
        </div>

        {/* Center / Status Badge */}
        {isScheduled && scheduledTimeStr ? (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/90 border border-amber-300 text-amber-900 text-xs font-black shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-amber-700" />
            <span>STATUS: SCHEDULED</span>
            <span className="text-amber-400">•</span>
            <span>
              Starts at {new Date(scheduledTimeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/90 border border-emerald-300 text-emerald-900 text-xs font-black shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>STATUS: LIVE NOW</span>
          </div>
        )}

        {/* Right Controls: Game PIN, Sound, & Exit Lobby */}
        <div className="flex items-center gap-2.5">
          {/* Game PIN Pill — Only shown to teacher to display to class */}
          {isTeacher && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-xs text-xs font-bold text-slate-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-700">
                {session.classroom_id ? 'Guest PIN:' : 'Game PIN:'}
              </span>
              <span className="font-mono font-black text-slate-900 tracking-wider text-sm">{pin}</span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Copy Direct Join Link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 shadow-xs flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute audio' : 'Unmute audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-sky-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Exit Lobby */}
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
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-3.5 py-1.5 rounded-full transition-all border border-slate-200 shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit Lobby</span>
          </button>
        </div>

      </div>

      {/* Main Content Area: 1. Quiz Hero Card, 2. Countdown Hero Card */}
      <div className="relative z-10 space-y-5">
        
        {/* Card 1: Quiz Information Hero Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-2.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${badgeStyle.bg} ${badgeStyle.text} border ${badgeStyle.border} shadow-xs`}>
                  {category}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>{questionsCount} Questions</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {quizTitle}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-xl">
                {session.quiz?.description || 'A live classroom quiz testing your knowledge, speed, and accuracy.'}
              </p>
            </div>

            {/* Right Cover / Illustration */}
            <div className="shrink-0 self-center sm:self-auto">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-sky-50 to-indigo-100 border border-slate-200 p-1 shadow-xs flex items-center justify-center">
                <img
                  src={coverUrl}
                  alt={quizTitle}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_QUIZ_COVER;
                  }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Meta Badges Strip */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2.5 sm:gap-3 flex-wrap text-xs font-bold text-slate-600">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/80 border border-slate-200/70">
              <span className={`w-2 h-2 rounded-full ${isScheduled ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <span>Status: {isScheduled ? 'Scheduled' : 'Live Now'}</span>
            </div>
            {scheduledTimeStr && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/80 border border-slate-200/70">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                <span>Starts at: {new Date(scheduledTimeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/80 border border-slate-200/70">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Players Joined: {participants.length}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Countdown Hero Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
          {/* Left: 3D Student Character */}
          <div className="w-full md:w-5/12 flex items-center justify-center">
            <div className="relative w-full max-w-[260px] aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-tr from-sky-100 via-indigo-50 to-blue-100 flex items-center justify-center p-2 border border-sky-200/60 shadow-xs">
              <img
                src="/images/classroom/student-classroom-hero.webp"
                alt="Student Learning"
                className="w-full h-full object-contain drop-shadow-sm"
                onError={(e) => {
                  e.currentTarget.src = '/images/classroom/classroom-hero-student.jpg';
                }}
              />
            </div>
          </div>

          {/* Right: Countdown or Live Action Controls */}
          <div className="w-full md:w-7/12 text-center md:text-left space-y-3">
            {isScheduled ? (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-black uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
                  <span>Quiz Starts In</span>
                </div>

                <div className="font-mono font-black text-5xl sm:text-6xl md:text-7xl text-slate-900 tracking-tight drop-shadow-xs">
                  {formattedCountdown}
                </div>

                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-md">
                  {!isTeacher
                    ? 'Please wait. The quiz will start automatically when the countdown reaches zero.'
                    : 'Students are entering the waiting lobby. The quiz will automatically begin when the timer reaches 00:00.'}
                </p>

                {/* Teacher Early Start Controls */}
                {isTeacher && (
                  <div className="pt-2 flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      disabled={isStarting || participants.length === 0}
                      onClick={handleStart}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {isStarting
                          ? 'Starting...'
                          : `Start Question 1 Now (${participants.length} Ready)`}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isCancelling || isStarting}
                      onClick={handleCancelSession}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isCancelling ? 'Cancelling...' : 'Cancel Quiz'}
                    </button>
                  </div>
                )}
              </>
            ) : isReady && targetStartMs ? (
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Scheduled Start Reached</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                  Starting Quiz Automatically!
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  The countdown is complete. Transitioning to Question 1...
                </p>
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin my-2" />
              </div>
            ) : isTeacher ? (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Ready to Begin</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                  {participants.length > 0
                    ? `${participants.length} Student${participants.length > 1 ? 's' : ''} Connected & Ready`
                    : 'Lobby is Open — Waiting for Students'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md">
                  When your students have joined, click below to begin. All connected student devices will automatically transition to Question 1.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    disabled={isStarting}
                    onClick={handleStart}
                    className="inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-black shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>
                      {isStarting
                        ? 'Starting Question 1...'
                        : participants.length > 0
                          ? `Start Quiz (${participants.length} Ready)`
                          : 'Start Quiz'}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={isCancelling || isStarting}
                    onClick={handleCancelSession}
                    className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isCancelling ? 'Cancelling...' : 'Cancel Quiz'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-100 border border-sky-300 text-sky-800 text-xs font-black uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
                  <span>Get Ready!</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                  Waiting for the teacher to start...
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md">
                  Sit tight! Question 1 will appear automatically on your screen as soon as the teacher starts the quiz.
                </p>
                <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin my-2" />
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Players Connected Section */}
      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm sm:text-base font-black text-slate-900">
              Players Connected ({participants.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium italic">
            Waiting for more players...
          </span>
        </div>

        {participants.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 sm:p-8 text-center border border-slate-200/80 shadow-xs space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-xs font-bold text-slate-500">
              {session.classroom_id ? (
                <>Waiting for classroom students to join...</>
              ) : (
                <>Waiting for students to connect using Game PIN <strong className="text-slate-800 font-mono text-sm">{pin}</strong>...</>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {participants.map((p) => {
              const initials = p.display_name.slice(0, 2).toUpperCase();
              return (
                <div
                  key={p.student_id}
                  className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 hover:border-sky-300 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 text-white font-black text-xs flex items-center justify-center overflow-hidden shadow-xs">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          initials
                        )}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                      {p.display_name}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-black uppercase tracking-wider shrink-0">
                    Ready!
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
