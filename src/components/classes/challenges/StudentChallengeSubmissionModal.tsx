import React, { useState, useEffect, useRef } from 'react';
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
  Check,
  ShieldAlert,
  Eye
} from 'lucide-react';
import { AiChallenge, AiChallengeSubmission, AiChallengeLeaderboardEntry } from '@/types/aiChallenge';
import { aiChallengeService } from '@/services/aiChallengeService';
import { ChallengeLeaderboardView } from './ChallengeLeaderboardView';

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
  const [leaderboard, setLeaderboard] = useState<AiChallengeLeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Paste attempt banner state with auto-dismiss
  const [pasteWarning, setPasteWarning] = useState<string | null>(null);
  const pasteWarningTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Active view when submission is completed
  const [resultTab, setResultTab] = useState<'leaderboard' | 'work'>('leaderboard');

  // Multi-step evaluation animation step (1: submitting, 2: rubric, 3: authenticity, 4: ranking)
  const [evalStep, setEvalStep] = useState<number>(1);

  // Autosave typed draft
  useEffect(() => {
    if (submissionMode === 'text' && !mySubmission) {
      localStorage.setItem(draftKey, typedText);
    }
  }, [typedText, submissionMode, mySubmission, draftKey]);

  // Load existing student submission and leaderboard
  const loadData = async () => {
    try {
      setLeaderboardLoading(true);
      const [sub, lb] = await Promise.all([
        aiChallengeService.getMySubmission(challenge.id),
        aiChallengeService.getLeaderboard(challenge.id)
      ]);
      setMySubmission(sub);
      setLeaderboard(lb);
    } catch (err) {
      console.warn('Notice loading submission or leaderboard:', err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, challenge.id]);

  // Progress evaluation stepper simulation while processing
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (submitting || mySubmission?.status === 'queued' || mySubmission?.status === 'processing') {
      timer = setInterval(() => {
        setEvalStep((prev) => (prev < 4 ? prev + 1 : 2));
      }, 2400);
    } else {
      setEvalStep(1);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [submitting, mySubmission?.status]);

  // Polling for completion if queued or processing
  useEffect(() => {
    if (!isOpen || !mySubmission) return;
    if (mySubmission.status === 'queued' || mySubmission.status === 'processing') {
      const pollTimer = setInterval(async () => {
        const [updated, lb] = await Promise.all([
          aiChallengeService.getMySubmission(challenge.id),
          aiChallengeService.getLeaderboard(challenge.id)
        ]);
        if (updated) {
          setMySubmission(updated);
          if (lb) setLeaderboard(lb);
          if (updated.status === 'completed' || updated.status === 'failed' || updated.status === 'teacher_review') {
            clearInterval(pollTimer);
            setSubmitting(false);
          }
        }
      }, 3000);

      return () => clearInterval(pollTimer);
    }
  }, [isOpen, mySubmission?.status, challenge.id]);

  // Clean up paste warning timer on unmount
  useEffect(() => {
    return () => {
      if (pasteWarningTimerRef.current) {
        clearTimeout(pasteWarningTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const currentWordCount = typedText.trim() ? typedText.trim().split(/\s+/).filter(Boolean).length : 0;
  const targetWordCount = challenge.required_word_count || challenge.evaluation_spec_json?.required_word_count;

  // Intercept paste attempts strictly on the challenge response textarea
  const handleBlockedPaste = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (pasteWarningTimerRef.current) {
      clearTimeout(pasteWarningTimerRef.current);
    }
    setPasteWarning('Pasting is not allowed. Please write your own answer.');
    pasteWarningTimerRef.current = setTimeout(() => {
      setPasteWarning(null);
    }, 3500);
  };

  const handleKeyDownTextarea = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Intercept Ctrl+V or Cmd+V
    if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
      e.preventDefault();
      handleBlockedPaste();
    }
  };

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
    setEvalStep(1);

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
        setSubmitting(false);
      } else {
        localStorage.removeItem(draftKey);
        setSuccessMessage('Work submitted successfully! AI evaluation pipeline started.');
        await loadData();
        if (onSubmitted) onSubmitted();
      }
    } catch (err: any) {
      setError(err.message || 'Submission error');
      setSubmitting(false);
    }
  };

  const isEvaluating =
    submitting ||
    mySubmission?.status === 'queued' ||
    mySubmission?.status === 'processing';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-inner">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full inline-block">
                  AI Challenge & Competition
                </span>
                <span className="text-xs text-indigo-200 font-bold">
                  Max Marks: {challenge.max_marks}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight leading-snug">{challenge.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* Challenge Task & Instructions Banner */}
          <div className="p-4.5 rounded-2xl bg-white border border-indigo-100 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Task Instructions</span>
              </span>
              <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100">
                Category: {challenge.category}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
              {challenge.instructions}
            </p>
            {challenge.reference_file_name && (
              <div className="pt-1 flex items-center gap-2 text-xs font-bold text-indigo-700">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Reference Attachment: {challenge.reference_file_name}</span>
              </div>
            )}
          </div>

          {/* ACTIVE EVALUATION PROGRESS DISPLAY */}
          {isEvaluating ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-indigo-100 text-center space-y-6 shadow-sm">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <Sparkles className="w-5 h-5 text-amber-500 absolute -top-1 -right-1 animate-pulse" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  Evaluating Your Challenge Submission
                </h3>
                <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                  Our educational AI assessment engine is objectively scoring your response across fixed criteria and originality patterns.
                </p>
              </div>

              {/* Multi-step progress stepper */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-left max-w-xl mx-auto">
                <div className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                  evalStep >= 1 ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${evalStep >= 1 ? 'text-indigo-600' : 'text-slate-300'}`} />
                    <span className="text-[10px] font-black uppercase">Step 1</span>
                  </div>
                  <span className="text-[11px] block leading-tight">Submitted Work</span>
                </div>

                <div className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                  evalStep >= 2 ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {evalStep === 2 ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    ) : (
                      <CheckCircle2 className={`w-3.5 h-3.5 ${evalStep > 2 ? 'text-indigo-600' : 'text-slate-300'}`} />
                    )}
                    <span className="text-[10px] font-black uppercase">Step 2</span>
                  </div>
                  <span className="text-[11px] block leading-tight">Rubric Scoring</span>
                </div>

                <div className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                  evalStep >= 3 ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {evalStep === 3 ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    ) : (
                      <CheckCircle2 className={`w-3.5 h-3.5 ${evalStep > 3 ? 'text-indigo-600' : 'text-slate-300'}`} />
                    )}
                    <span className="text-[10px] font-black uppercase">Step 3</span>
                  </div>
                  <span className="text-[11px] block leading-tight">Authenticity Check</span>
                </div>

                <div className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                  evalStep >= 4 ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {evalStep === 4 ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    ) : (
                      <CheckCircle2 className={`w-3.5 h-3.5 text-slate-300`} />
                    )}
                    <span className="text-[10px] font-black uppercase">Step 4</span>
                  </div>
                  <span className="text-[11px] block leading-tight">Podium Update</span>
                </div>
              </div>

              <div className="pt-2 text-[11px] font-medium text-slate-400">
                You can leave this modal at any time. Results will update automatically.
              </div>
            </div>
          ) : mySubmission && mySubmission.status === 'completed' ? (
            /* COMPLETED SUBMISSION VIEW: Leaderboard & Work Tabs */
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Tab Selector */}
              <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setResultTab('leaderboard')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    resultTab === 'leaderboard'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Your Result & Podium Leaderboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResultTab('work')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    resultTab === 'work'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                  <span>View Your Submitted Work</span>
                </button>
              </div>

              {resultTab === 'leaderboard' ? (
                /* Leaderboard with prominent personal result card */
                <ChallengeLeaderboardView
                  maxMarks={challenge.max_marks}
                  leaderboard={leaderboard}
                  mySubmission={mySubmission}
                  currentUserId={mySubmission.student_id}
                  isLoading={leaderboardLoading}
                />
              ) : (
                /* Submitted text or file viewer */
                <div className="p-5 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Your Submitted Content
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {mySubmission.word_count ? `${mySubmission.word_count} words` : 'Submission'}
                    </span>
                  </div>

                  {mySubmission.submission_type === 'text' ? (
                    <div
                      style={{
                        color: '#090d16',
                        backgroundColor: '#ffffff',
                        fontFamily: 'inherit'
                      }}
                      className="text-sm font-normal text-slate-950 whitespace-pre-wrap bg-white p-5 rounded-2xl border border-slate-200 leading-relaxed shadow-inner"
                    >
                      {mySubmission.content_text}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-indigo-900">
                      <FileText className="w-6 h-6 text-indigo-600 shrink-0" />
                      <div>
                        <span className="text-xs font-black block">{mySubmission.file_name || 'Uploaded File'}</span>
                        <span className="text-[11px] text-indigo-600 font-medium">Uploaded Document</span>
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 font-medium text-right">
                    Submitted on {new Date(mySubmission.submitted_at).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STUDENT WRITING / SUBMISSION FORM */
            <form onSubmit={handleSubmit} className="space-y-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
              
              {/* Errors & Alerts */}
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Paste Blocked Warning Banner */}
              {pasteWarning && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs font-black flex items-center gap-2.5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{pasteWarning}</span>
                </div>
              )}

              {/* Submission Method Toggle if both are allowed */}
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

              {/* Method A: Type Response (HIGH CONTRAST & PASTE-PROTECTED) */}
              {submissionMode === 'text' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Your Written Response
                    </label>
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                        targetWordCount
                          ? Math.abs(currentWordCount - targetWordCount) <= 15
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {currentWordCount} {targetWordCount ? `/ ~${targetWordCount}` : ''} words
                    </span>
                  </div>

                  {/* 
                    HIGH-CONTRAST & PASTE-PREVENTION TEXTAREA:
                    - Explicit inline style overrides guarantee crisp text (#090d16) and pure white background (#ffffff).
                    - Explicit caretColor (#4f46e5).
                    - onPaste, onDrop, onDragOver, onKeyDown intercept paste actions specifically here.
                  */}
                  <textarea
                    rows={9}
                    value={typedText}
                    onChange={(e) => setTypedText(e.target.value)}
                    onPaste={handleBlockedPaste}
                    onDrop={handleBlockedPaste}
                    onDragOver={(e) => e.preventDefault()}
                    onKeyDown={handleKeyDownTextarea}
                    placeholder="Write your response here using your own words... (Pasting is disabled for this challenge)"
                    style={{
                      color: '#090d16',
                      backgroundColor: '#ffffff',
                      caretColor: '#4f46e5',
                      WebkitTextFillColor: '#090d16'
                    }}
                    className="w-full p-4.5 bg-white border-2 border-slate-200 focus:border-indigo-600 rounded-2xl text-sm font-semibold text-slate-950 placeholder:text-slate-400 placeholder:italic focus:outline-hidden focus:ring-4 focus:ring-indigo-100 transition-all leading-relaxed selection:bg-indigo-100 selection:text-slate-950 shadow-inner"
                  />

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>Draft autosaves to your browser.</span>
                    <span className="text-slate-400">Write naturally with your own thoughts and vocabulary.</span>
                  </div>
                </div>
              )}

              {/* Method B: Upload File */}
              {submissionMode === 'file' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                    Upload Your Document
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
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Submit Challenge Response</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium shrink-0">
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>EdTechra Challenge Arena</span>
          </span>
          <button
            onClick={onClose}
            className="text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
