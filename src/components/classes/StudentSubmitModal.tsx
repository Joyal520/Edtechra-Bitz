import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, Paperclip, Trash2 } from 'lucide-react';
import { Assignment, AssignmentAttachment } from '@/types/classroom';
import { assignmentService } from '@/services/assignmentService';
import { supabase } from '@/lib/supabase';

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
  const [textResponse, setTextResponse] = useState(existingSub?.text_response || '');
  const [attachments, setAttachments] = useState<AssignmentAttachment[]>(existingSub?.file_urls || []);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !assignment) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#026fc3] bg-blue-50 px-2 py-0.5 rounded-md">
              Submit Task
            </span>
            <h2 className="text-base font-black text-slate-900 mt-1 line-clamp-1">
              {assignment.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Existing Feedback notice if graded */}
        {existingSub?.status === 'graded' && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-1">
            <div className="font-extrabold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Score: {existingSub.points_awarded} / {assignment.points} points</span>
            </div>
            {existingSub.teacher_feedback && (
              <p className="text-emerald-700 font-medium">"{existingSub.teacher_feedback}"</p>
            )}
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              Your Response / Notes
            </label>
            <textarea
              rows={4}
              value={textResponse}
              onChange={(e) => setTextResponse(e.target.value)}
              placeholder="Type your answer, summary, or response here..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3] focus:bg-white transition-all resize-none"
            />
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
              disabled={isSubmitting || isUploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-extrabold shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Work'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
