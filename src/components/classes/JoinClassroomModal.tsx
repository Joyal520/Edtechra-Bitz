import React, { useState } from 'react';
import { X, KeyRound, ArrowRight } from 'lucide-react';
import { classroomService } from '@/services/classroomService';

interface JoinClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (joinedClassroomId: string) => void;
}

export const JoinClassroomModal: React.FC<JoinClassroomModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage('Please enter a 6-character classroom code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await classroomService.joinClassroomByCode(cleanCode);
      if (res.error || !res.data) {
        setErrorMessage(res.error || 'Could not join classroom.');
        setIsSubmitting(false);
        return;
      }

      onSuccess(res.data.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Unexpected error joining classroom.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Join a Classroom</h2>
              <p className="text-xs text-slate-500 font-semibold">Enter your teacher's 6-character code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              Classroom Code *
            </label>
            <input
              type="text"
              required
              maxLength={10}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. 7K9X2B"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-center font-mono text-lg tracking-widest font-black text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
            <p className="text-[11px] text-slate-400 font-medium text-center mt-2">
              Ask your teacher for the 6-character class code to get access.
            </p>
          </div>

          {/* Form Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <span>{isSubmitting ? 'Joining...' : 'Join Classroom'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
