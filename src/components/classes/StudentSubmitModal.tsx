import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, Paperclip, Trash2 } from 'lucide-react';
import { Assignment, AssignmentAttachment } from '@/types/classroom';
import { assignmentService } from '@/services/assignmentService';
import { supabase } from '@/lib/supabase';
import { countWords } from '@/utils/writingInstructionGenerator';

interface StudentSubmitModalProps {
  isOpen: boolean;
  assignment: Assignment | null;
  classroomId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const StudentSubmitModal: React.FC<StudentSubmitModalProps> = ({
  isOpen,
  assignment,
  classroomId,
  onClose,
  onSuccess
}) => {
  const existingSub = assignment?.my_submission;
  const isAlreadySubmitted = Boolean(
    existingSub && (
      existingSub.status === 'submitted' ||
      existingSub.status === 'graded' ||
      existingSub.status === 'completed' ||
      Boolean(existingSub.submitted_at)
    )
  );
  const [textResponse, setTextResponse] = useState(existingSub?.text_response || '');
  const [attachments, setAttachments] = useState<AssignmentAttachment[]>(existingSub?.file_urls || []);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !assignment) return null;

  const requiredWordLength = Number(
    assignment.required_word_length ??
      (assignment as any).settings?.required_word_length ??
      0
  );
  const writingType =
    assignment.writing_type ||
    (assignment as any).settings?.writing_type ||
    assignment.subtitle ||
    '';
  const currentWordCount = countWords(textResponse);
  const isWordCountMet =
    attachments.length > 0
      ? true
      : requiredWordLength > 0
      ? currentWordCount >= requiredWordLength
      : currentWordCount > 0;
  const wordsRemaining =
    requiredWordLength > 0 ? Math.max(0, requiredWordLength - currentWordCount) : 0;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);
    setErrorMessage(null);

    try {
      // 1. Get valid Supabase auth token
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token;

      // 2. Request presigned upload URL from backend
      const presignRes = await fetch('/api/classes/presign-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          classroomId,
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size
        })
      });

      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to initialize upload');
      }

      const { data: presigned } = await presignRes.json();

      // 3. Upload directly to Cloudflare R2
      const uploadRes = await fetch(presigned.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      });

      if (!uploadRes.ok) {
        throw new Error('Direct file upload to storage failed');
      }

      // 4. Record attachment
      const newAttachment: AssignmentAttachment = {
        name: file.name,
        url: presigned.publicUrl,
        type: file.type,
        size: file.size
      };

      setAttachments((prev) => [...prev, newAttachment]);
    } catch (err: any) {
      console.error('[StudentSubmitModal] Upload error:', err);
      setErrorMessage(err.message || 'File upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!textResponse.trim() && attachments.length === 0) {
      setErrorMessage('Please provide a text response or attach a file.');
      return;
    }

    if (attachments.length === 0 && requiredWordLength > 0 && currentWordCount < requiredWordLength) {
      setErrorMessage(
        `Your response has ${currentWordCount} words, which is below the minimum required length of ${requiredWordLength} words.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await assignmentService.submitAssignment({
        assignment_id: assignment.id,
        classroom_id: classroomId,
        text_response: textResponse.trim(),
        file_urls: attachments
      });

      if (res.error) {
        setErrorMessage(res.error);
        setIsSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit work.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 lg:p-8 shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200 edtechra-light-surface text-slate-900 my-auto max-h-[92vh] overflow-y-auto"
        data-light-surface="true"
        data-theme-mode="light"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                  isAlreadySubmitted ? 'bg-emerald-100 text-emerald-800' : 'text-[#026fc3] bg-blue-50'
                }`}
              >
                {isAlreadySubmitted ? 'Task Completed' : 'Submit Task'}
              </span>
              {writingType && (
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                  {writingType}
                </span>
              )}
              {requiredWordLength > 0 && (
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                  Min {requiredWordLength} words
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 mt-1">
              {assignment.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task Instructions Summary */}
        {assignment.instructions && (
          <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              Task Instructions
            </span>
            <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
              {assignment.instructions}
            </p>
          </div>
        )}

        {/* COMPLETED / SUBMITTED READ-ONLY VIEW */}
        {isAlreadySubmitted ? (
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/90 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>You completed this task</span>
                </span>
                {existingSub?.submitted_at && (
                  <span className="text-[11px] font-semibold text-emerald-700">
                    Submitted {new Date(existingSub.submitted_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                )}
              </div>

              {existingSub?.status === 'graded' && existingSub.points_awarded != null && (
                <div className="text-xs font-bold text-emerald-800 pt-1 border-t border-emerald-200/60">
                  Score: {existingSub.points_awarded} / {assignment.points} points
                </div>
              )}

              {existingSub?.teacher_feedback && (
                <p className="text-xs sm:text-sm text-emerald-800 font-medium italic pt-1 leading-relaxed">
                  &ldquo;{existingSub.teacher_feedback}&rdquo;
                </p>
              )}
            </div>

            {/* Submitted Text Response */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700">
                Your Submitted Response
              </label>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm sm:text-base font-medium text-slate-800 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                {existingSub?.text_response || 'No written text was submitted.'}
              </div>
            </div>

            {/* Attached Files List (Read-only) */}
            {attachments.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700">
                  Attached Files ({attachments.length})
                </label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-[#026fc3] hover:underline truncate"
                        >
                          {file.name}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View-Only Close Button */}
            <div className="pt-2 flex items-center justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* UNCOMPLETED / SUBMIT FORM */
          <>
            {/* Error notification */}
            {errorMessage && (
              <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {errorMessage}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs sm:text-sm font-extrabold text-slate-800">
                    Your Response
                  </label>
                  {requiredWordLength > 0 && (
                    <span className="text-[11px] font-bold text-slate-500">
                      Required minimum: {requiredWordLength} words
                    </span>
                  )}
                </div>
                <textarea
                  rows={8}
                  value={textResponse}
                  onChange={(e) => setTextResponse(e.target.value)}
                  placeholder={
                    requiredWordLength > 0
                      ? `Type your answer here (at least ${requiredWordLength} words)...`
                      : 'Type your answer, summary, or response here...'
                  }
                  className="w-full min-h-[240px] sm:min-h-[300px] lg:min-h-[360px] p-4 sm:p-5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border-2 border-slate-300 focus:border-[#026fc3] rounded-2xl text-base sm:text-base lg:text-[17px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#026fc3]/15 transition-all resize-y leading-relaxed lg:leading-[1.75] shadow-2xs select-text overflow-y-auto"
                />

                {/* Live Word Count & Minimum Status Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                        requiredWordLength > 0
                          ? isWordCountMet
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-slate-200/70 text-slate-800'
                      }`}
                    >
                      {requiredWordLength > 0
                        ? `${currentWordCount} / ${requiredWordLength} words`
                        : `${currentWordCount} ${currentWordCount === 1 ? 'word' : 'words'}`}
                    </span>

                    {requiredWordLength > 0 && (
                      <span
                        className={`text-xs font-bold ${
                          isWordCountMet ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {isWordCountMet
                          ? '✓ Ready to submit'
                          : `${wordsRemaining} more ${wordsRemaining === 1 ? 'word' : 'words'} required`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Attachment list */}
              {attachments.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-700">
                    Attached Files ({attachments.length})
                  </label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {attachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-[#026fc3] hover:underline truncate"
                          >
                            {file.name}
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* File Upload Dropzone */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt,.zip"
                />
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-2xl text-xs font-extrabold text-slate-600 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span>{isUploading ? 'Uploading to R2 Storage...' : '+ Attach Document or Image (R2)'}</span>
                </button>
              </div>

              {/* Form Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading || !isWordCountMet}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-extrabold shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Work'}</span>
                </button>
              </div>
            </form>
          </>
        )}

      </div>
    </div>
  );
};
