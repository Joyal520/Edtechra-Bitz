import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Copy,
  Check,
  Play,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { LiveQuizSession, LiveQuizParticipant } from '@/types/liveQuiz';
import { liveQuizService } from '@/services/liveQuizService';
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
  const [soundEnabled, setSoundEnabled] = useState(true);

  const pin = session.pin;
  const joinUrl = `${window.location.origin}/classes/live-quiz/join/${pin}`;

  useEffect(() => {
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
            if (p.student_id && p.display_name) {
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
      .on('broadcast', { event: 'quiz_started' }, () => {
        if (!isTeacher) {
          navigate(`/classes/${session.classroom_id}/live-quiz/play/${session.id}`);
        }
      })
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
  }, [pin, session.id, user, isTeacher]);

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
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = async () => {
    if (!onStartQuiz) return;
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
      <div className="relative z-10 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(`/classes/${session.classroom_id}`)}
          className="inline-flex items-center gap-2 text-xs font-bold text-sky-200 hover:text-white bg-white/10 hover:bg-white/15 px-3.5 py-1.5 rounded-full transition-all border border-white/10 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Lobby</span>
        </button>

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

      {/* Center PIN Display & Game Title */}
      <div className="relative z-10 text-center space-y-5 max-w-2xl mx-auto">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-400/20 text-sky-300 text-xs font-black uppercase tracking-wider border border-sky-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Live Multiplayer Game</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            {session.quiz?.title || 'Classroom Live Quiz'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            Join on your phone or computer to compete in real-time!
          </p>
        </div>

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
        
        <div className="flex items-center justify-between border-b border-white/15 pb-3">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <Users className="w-4 h-4 text-sky-300" />
            <span>Players Connected ({participants.length})</span>
          </div>

          {isTeacher && (
            <button
              type="button"
              disabled={isStarting || participants.length === 0}
              onClick={handleStart}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-2xl text-xs font-black shadow-xl active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isStarting ? 'Starting Quiz...' : `Start Quiz (${participants.length} Ready)`}</span>
            </button>
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
