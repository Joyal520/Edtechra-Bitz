import React, { useState } from 'react';
import {
  X,
  Trophy,
  Clock,
  Sparkles,
  AlertCircle,
  Loader2,
  Paperclip
} from 'lucide-react';
import { aiChallengeService } from '@/services/aiChallengeService';
import { AI_CHALLENGE_CATEGORIES } from '@/types/aiChallenge';

interface CreateChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId: string;
  onChallengeCreated: () => void;
}

export const CreateChallengeModal: React.FC<CreateChallengeModalProps> = ({
  isOpen,
  onClose,
  classroomId,
  onChallengeCreated
}) => {
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [category, setCategory] = useState('Creative Writing');
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [allowText, setAllowText] = useState(true);
  const [allowFile, setAllowFile] = useState(true);
  const [deadline, setDeadline] = useState('');

  // Reference file state
  const [refFile, setRefFile] = useState<File | null>(null);
  const [isUploadingRef, setIsUploadingRef] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      const allowed = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'docx', 'txt'];
      if (!allowed.includes(ext || '')) {
        setError(`Invalid reference file format. Allowed: ${allowed.join(', ')}`);
        return;
      }
      setError(null);
      setRefFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Challenge Title is required.');
      return;
    }
    if (!instructions.trim()) {
      setError('Task instructions are required.');
      return;
    }
    if (!allowText && !allowFile) {
      setError('At least one submission method (Type or Upload) must be enabled.');
      return;
    }
    if (maxMarks <= 0 || isNaN(maxMarks)) {
      setError('Maximum Marks must be a positive number.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let referenceFileKey: string | null = null;
      let referenceFileName: string | null = null;

      // Upload reference file if provided
      if (refFile) {
        setIsUploadingRef(true);
        const upRes = await aiChallengeService.uploadFile(refFile, undefined, 'reference');
        if (upRes.error) {
          setError(`Reference upload failed: ${upRes.error}`);
          setLoading(false);
          setIsUploadingRef(false);
          return;
        }
        referenceFileKey = upRes.fileKey || null;
        referenceFileName = refFile.name;
      }

      const res = await aiChallengeService.createChallenge({
        classroomId,
        title: title.trim(),
        instructions: instructions.trim(),
        category,
        maxMarks: Number(maxMarks),
        allowTextSubmission: allowText,
        allowFileUpload: allowFile,
        referenceFileKey,
        referenceFileName,
        deadlineAt: deadline ? new Date(deadline).toISOString() : null
      });

      if (res.error) {
        setError(res.error);
      } else {
        onChallengeCreated();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create challenge.');
    } finally {
      setLoading(false);
      setIsUploadingRef(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Create AI Challenge</h2>
              <p className="text-xs text-indigo-100 font-medium">
                Set student task, instructions & rubric for automated AI evaluation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Challenge Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Challenge Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Mystery Door Story Challenge"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all"
              required
            />
          </div>

          {/* Instructions */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Instructions & Prompt <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Create a story in 100 words about discovering a mysterious glowing door in an old library."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all leading-relaxed"
              required
            />
            <p className="text-[11px] text-slate-400 font-medium">
              Word count targets (e.g. "100 words") are detected automatically and verified by the AI.
            </p>
          </div>

          {/* Category & Max Marks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
              >
                {AI_CHALLENGE_CATEGORIES.map((cat: string) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Maximum Marks
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={maxMarks}
                onChange={(e) => setMaxMarks(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Reference Document / Worksheet (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>Reference / Instruction File (Optional)</span>
              {refFile && (
                <button
                  type="button"
                  onClick={() => setRefFile(null)}
                  className="text-[11px] text-rose-500 hover:underline font-bold"
                >
                  Remove
                </button>
              )}
            </label>
            <label className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-4 flex items-center justify-center gap-3 cursor-pointer bg-slate-50/50 hover:bg-indigo-50/30 transition-all group">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Paperclip className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              <div className="text-left">
                <span className="text-xs font-black text-slate-700 block">
                  {refFile ? refFile.name : 'Upload reference worksheet, rubric or prompt file'}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  PDF, JPG, PNG, DOCX, TXT up to 10MB
                </span>
              </div>
            </label>
          </div>

          {/* Submission Methods */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
              Allowed Submission Methods
            </label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs font-black text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowText}
                  onChange={(e) => setAllowText(e.target.checked)}
                  className="w-4 h-4 rounded-md text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span>Type Response</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-black text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowFile}
                  onChange={(e) => setAllowFile(e.target.checked)}
                  className="w-4 h-4 rounded-md text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span>Upload File (PDF, DOCX, Images, HTML)</span>
              </label>
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Submission Deadline (Optional)</span>
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isUploadingRef}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl text-xs font-black shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Challenge...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Publish Challenge</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
