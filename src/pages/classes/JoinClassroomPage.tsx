import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { KeyRound, ArrowRight, AlertCircle } from 'lucide-react';
import { classroomService } from '@/services/classroomService';
import { useAuth } from '@/context/AuthContext';

export const JoinClassroomPage: React.FC = () => {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, openAuthModal } = useAuth();

  const [inputCode, setInputCode] = useState(code || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (code && isAuthenticated) {
      handleAutoJoin(code);
    }
  }, [code, isAuthenticated]);

  const handleAutoJoin = async (targetCode: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await classroomService.joinClassroomByCode(targetCode);
      if (res.error || !res.data) {
        setError(res.error || 'Failed to join classroom.');
        setLoading(false);
        return;
      }
      navigate(`/classes/${res.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Error joining classroom');
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal('login', { type: 'action', action: 'join_classroom' });
      return;
    }
    if (!inputCode.trim()) return;
    handleAutoJoin(inputCode.trim().toUpperCase());
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
          <KeyRound className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900">Join a Digital Classroom</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Enter the 6-character class code provided by your teacher to access assignments, materials, and live streams.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold text-left flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            maxLength={10}
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            placeholder="e.g. 7K9X2B"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-center font-mono text-xl tracking-widest font-black text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-extrabold shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            <span>{loading ? 'Joining Classroom...' : 'Join Classroom'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
