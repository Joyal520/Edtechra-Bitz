import React, { useState, useEffect } from 'react';
import {
  X,
  Trophy,
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Paperclip,
  Check
} from 'lucide-react';
import { AiChallenge, AiChallengeSubmission } from '@/types/aiChallenge';
import { aiChallengeService } from '@/services/aiChallengeService';

interface StudentChallengeSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: AiChallenge;
  onSubmitted?: () => void;
}

export const StudentChallengeSubmissionModal: React.FC<StudentChallengeSubmissionModalProps> = ({
  isOpen,
  onClose,
  challenge,
  onSubmitted
}) => {
  const draftKey = `ai_challenge_draft_${challenge.id}`;

  const [submissionMode, setSubmissionMode] = useState<'text' | 'file'>(
    challenge.allow_text_submission ? 'text' : 'file'
  );
  const [typedText, setTypedText] = useState<string>(() => {
    return localStorage.getItem(draftKey) || '';
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [mySubmission, setMySubmission] = useState<AiChallengeSubmission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Autosave typed draft
  useEffect(() => {
    if (submissionMode === 'text' && !mySubmission) {
      localStorage.setItem(draftKey, typedText);
    }
  }, [typedText, submissionMode, mySubmission, draftKey]);

  // Load existing student submission
  const loadMySubmission = async () => {
    try {
      const sub = await aiChallengeService.getMySubmission(challenge.id);
      setMySubmission(sub);
    } catch (err) {
      console.warn('Notice loading submission:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMySubmission();
    }
  }, [isOpen, challenge.id]);

  // Polling for completion if queued or processing
  useEffect(() => {
    if (!isOpen || !mySubmission) return;
    if (mySubmission.status === 'queued' || mySubmission.status === 'processing') {
      const pollTimer = setInterval(async () => {
        const updated = await aiChallengeService.getMySubmission(challenge.id);
        if (updated) {
          setMySubmission(updated);
          if (updated.status === 'completed' || updated.status === 'failed' || updated.status === 'teacher_review') {
            clearInterval(pollTimer);
          }
        }
      }, 3000);

      return () => clearInterval(pollTimer);
    }
  }, [isOpen, mySubmission?.status, challenge.id]);

  if (!isOpen) return null;

  const currentWordCount = typedText.trim() ? typedText.trim().split(/\s+/).filter(Boolean).length : 0;
  const targetWordCount = challenge.required_word_count || challenge.evaluation_spec_json?.required_word_count;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      const allowed = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'docx', 'txt', 'html'];
      if (!allowed.includes(ext || '')) {
        setError(`Invalid format .${ext}. Allowed formats: ${allowed.join(', ')}`);
        return;
      }
      setError(null);
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (submissionMode === 'text') {
      if (!typedText.trim()) {
        setError('Please enter your written response before submitting.');
        return;
      }
    } else {
      if (!selectedFile) {
        setError('Please select a file to upload.');
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let fileKey: string | undefined = undefined;
      let submissionId: string | undefined = undefined;

      if (submissionMode === 'file' && selectedFile) {
        const upRes = await aiChallengeService.uploadFile(selectedFile, challenge.id, 'submission');
        if (upRes.error) {
          setError(`File upload failed: ${upRes.error}`);
          setSubmitting(false);
          return;
        }
        fileKey = upRes.fileKey;
        submissionId = upRes.submissionId;
      }

      const res = await aiChallengeService.submitWork(challenge.id, {
        submissionType: submissionMode,
        contentText: submissionMode === 'text' ? typedText : undefined,
        fileKey,
        fileName: selectedFile?.name,
        fileType: selectedFile?.type,
        fileSize: selectedFile?.size,
        submissionId
      });

      if (res.error) {
        setError(res.error);
      } else {
        localStorage.removeItem(draftKey);
        setSuccessMessage('Work submitted successfully! AI evaluation in progress.');
        await loadMySubmission();
        if (onSubmitted) onSubmitted();
      }
    } catch (err: any) {
      setError(err.message || 'Submission error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full inline-block mb-1">
                AI Challenge
              </span>
              <h2 className="text-lg font-black tracking-tight leading-snug">{challenge.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Challenge Task & Instructions Banner */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-900">
                Task Instructions
              </span>
              <span className="text-xs font-black text-indigo-700 bg-white px-2.5 py-1 rounded-xl shadow-2xs">
                Max Marks: {challenge.max_marks}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
              {challenge.instructions}
            </p>
            {challenge.reference_file_name && (
              <div className="pt-1 flex items-center gap-2 text-xs font-bold text-indigo-700">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Reference: {challenge.reference_file_name}</span>
              </div>
            )}
          </div>

          {/* If already submitted: Display Submission & AI Evaluation Results */}
          {mySubmission && mySubmission.status !== 'draft' ? (
            <div className="space-y-5 animate-in fade-in duration-300">
              
              {/* Status Banner */}
              {mySubmission.status === 'completed' ? (
                <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-950 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-emerald-950">Submission Evaluated</h3>
                        <p className="text-xs text-emerald-700 font-medium">
                          Your work has been scored by the AI assessment engine
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-2xl font-black text-emerald-700">
                        {mySubmission.final_score ?? mySubmission.ai_score}
                      </span>
                      <span className="text-xs text-slate-500 font-bold"> / {challenge.max_marks} pts</span>
                    </div>
                  </div>

                  {/* AI Feedback */}
                  {mySubmission.ai_feedback && (
                    <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-2xs space-y-1.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>AI Feedback</span>
                      </span>
                      <p className="text-xs font-medium text-slate-700 leading-relaxed">
                        {mySubmission.ai_feedback}
                      </p>
                    </div>
                  )}

                  {/* Criteria Breakdown */}
                  {Array.isArray(mySubmission.criteria_json) && mySubmission.criteria_json.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-black text-emerald-900 uppercase tracking-wider block">
                        Criteria Scores
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {mySubmission.criteria_json.map((crit, idx) => (
                          <div key={idx} className="p-3 bg-white rounded-xl border border-emerald-100 flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-700">{crit.name}</span>
                            <span className="text-emerald-700 font-black">
                              {crit.score} / {crit.max}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
                  <h3 className="text-base font-black text-amber-900">
                    {mySubmission.status === 'processing' ? 'Evaluating Your Work...' : 'Submission Queued'}
                  </h3>
                  <p className="text-xs text-amber-700 font-medium max-w-sm mx-auto">
                    Your response has been securely received. Our AI assessment engine is analyzing your submission against the challenge rubric.
                  </p>
                </div>
              )}

              {/* View Submitted Content */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                  Your Submitted Work
                </span>
                {mySubmission.submission_type === 'text' ? (
                  <p className="text-xs font-medium text-slate-700 whitespace-pre-wrap bg-white p-3.5 rounded-xl border border-slate-100">
                    {mySubmission.content_text}
                  </p>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 bg-white p-3 rounded-xl border border-slate-100">
                    <FileText className="w-4 h-4" />
                    <span>Uploaded File: {mySubmission.file_name || 'Document'}</span>
                  </div>
                )}
              </div>

            </div>
          ) : (
            /* Student Input / Submission Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Submission Method Selection if both are allowed */}
              {challenge.allow_text_submission && challenge.allow_file_upload && (
                <div className="flex items-center gap-3 p-1.5 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setSubmissionMode('text')}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      submissionMode === 'text'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Type Response
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionMode('file')}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      submissionMode === 'file'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Upload File
                  </button>
                </div>
              )}

              {/* Method A: Type Response */}
              {submissionMode === 'text' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Your Response
                    </label>
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                      targetWordCount
                        ? Math.abs(currentWordCount - targetWordCount) <= 15
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {currentWordCount} {targetWordCount ? `/ ${targetWordCount}` : ''} words
                    </span>
                  </div>

                  <textarea
                    rows={8}
                    value={typedText}
                    onChange={(e) => setTypedText(e.target.value)}
                    placeholder="Type your response here... Your draft is automatically saved."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-400 font-medium">
                    Draft is autosaved locally so you don't lose your work.
                  </p>
                </div>
              )}

              {/* Method B: Upload File */}
              {submissionMode === 'file' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                    Upload Your Work
                  </label>
                  <label className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2 cursor-pointer bg-slate-50/50 hover:bg-indigo-50/30 transition-all group">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.txt,.html"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    <span className="text-xs font-black text-slate-700 block">
                      {selectedFile ? selectedFile.name : 'Choose a file to submit'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      PDF, JPG, PNG, WebP, DOCX, TXT or HTML up to 15MB
                    </span>
                  </label>
                </div>
              )}

              {/* Submit Action */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl text-xs font-black shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Submit Work</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
