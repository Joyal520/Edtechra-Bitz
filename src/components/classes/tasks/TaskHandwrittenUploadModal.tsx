import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Check
} from 'lucide-react';
import { ClassroomTask, TaskSubmission } from '@/types/classroomTask';
import { ClassroomMember } from '@/types/classroom';
import { classroomTaskService } from '@/services/classroomTaskService';
import { ocrService } from '@/services/ocrService';
import { optimizeImageForOCR } from '@/utils/imageOptimizer';

interface TaskHandwrittenUploadModalProps {
  isOpen: boolean;
  classroomId: string;
  tasks: ClassroomTask[];
  members: ClassroomMember[];
  initialTaskId?: string | null;
  initialStudentId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const TaskHandwrittenUploadModal: React.FC<TaskHandwrittenUploadModalProps> = ({
  isOpen,
  classroomId,
  tasks = [],
  members = [],
  initialTaskId,
  initialStudentId,
  onClose,
  onSuccess
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string>(initialTaskId || '');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId || '');
  
  // Existing submission check
  const [existingSubmission, setExistingSubmission] = useState<TaskSubmission | null>(null);
  const [loadingExistingSub, setLoadingExistingSub] = useState(false);
  const [replaceWork, setReplaceWork] = useState(false);

  // File Upload State (ONLY Image: JPG, JPEG, PNG, WEBP)
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Evaluation & Processing State
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Teacher Adjustments
  const [editScore, setEditScore] = useState<number>(0);
  const [editFeedback, setEditFeedback] = useState<string>('');
  const [isSavingAdjustment, setIsSavingAdjustment] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter students only from classroom members
  const students = members.filter((m) => {
    if (m.role === 'teacher' || m.role === 'co-teacher') return false;
    if (m.profile?.role === 'teacher' || m.profile?.role === 'admin') return false;
    return true;
  });

  const currentTask = tasks.find((t) => t.id === selectedTaskId) || null;

  useEffect(() => {
    if (isOpen) {
      setSelectedTaskId(initialTaskId || (tasks.length > 0 ? tasks[0].id : ''));
      setSelectedStudentId(initialStudentId || (students.length > 0 ? students[0].profile_id : ''));
      resetEvaluationState();
    }
  }, [isOpen, initialTaskId, initialStudentId]);

  // Check for existing submission whenever Task or Student changes
  useEffect(() => {
    if (selectedTaskId && selectedStudentId) {
      checkExistingSubmission(selectedTaskId, selectedStudentId);
    } else {
      setExistingSubmission(null);
    }
  }, [selectedTaskId, selectedStudentId]);

  const checkExistingSubmission = async (taskId: string, studentId: string) => {
    setLoadingExistingSub(true);
    try {
      const sub = await classroomTaskService.getStudentSubmission(taskId, studentId);
      setExistingSubmission(sub);
      setReplaceWork(false);
      if (sub) {
        if (sub.final_score != null) {
          setEditScore(Number(sub.final_score));
          setEditFeedback(sub.teacher_feedback || '');
        }
        if (sub.file_urls && sub.file_urls.length > 0 && sub.file_urls[0]) {
          setImagePreview(sub.file_urls[0]);
        }
      }
    } catch {
      setExistingSubmission(null);
    } finally {
      setLoadingExistingSub(false);
    }
  };

  const resetEvaluationState = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setEvaluating(false);
    setEvaluationResult(null);
    setErrorMessage('');
    setSavedNotice(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // Strictly enforce image formats (JPG, JPEG, PNG, WEBP)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      alert('Only image files (JPG, JPEG, PNG, WEBP) are supported for classroom handwritten work.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('Image size exceeds 15 MB limit. Please select a smaller photo.');
      return;
    }

    setSelectedImage(file);
    try {
      const optimizedBase64 = await optimizeImageForOCR(file, 1600, 0.85);
      setImagePreview(optimizedBase64);
    } catch (_) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEvaluate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTaskId) {
      alert('Please select a Task.');
      return;
    }
    if (!selectedStudentId) {
      alert('Please select a student.');
      return;
    }
    if (!selectedImage && !imagePreview) {
      alert('Please upload a photo of the student’s handwritten work.');
      return;
    }

    setEvaluating(true);
    setErrorMessage('');

    try {
      const studentMember = students.find((m) => m.profile_id === selectedStudentId);
      const studentName = studentMember?.display_name || studentMember?.profile?.full_name || 'Student';

      let base64 = imagePreview;
      if (!base64 && selectedImage) {
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedImage);
        });
      }

      if (!base64) throw new Error('Could not process image file.');

      const result = await classroomTaskService.submitHandwrittenTask(selectedTaskId, {
        classroomId,
        studentId: selectedStudentId,
        studentName,
        imageBase64: base64,
        maxMarks: currentTask?.points || 20,
        category: 'Paragraph Writing',
        title: currentTask?.title || 'Classroom Task'
      });

      if (result.error) {
        throw new Error(result.error);
      }

      const evalData = result.data;
      setEvaluationResult(evalData);
      setEditScore(evalData.final_score ?? evalData.score ?? 0);
      setEditFeedback(evalData.feedback || '');
      setSavedNotice(true);
      onSuccess();

      // Refresh existing submission record
      await checkExistingSubmission(selectedTaskId, selectedStudentId);
    } catch (err: any) {
      console.error('[TaskHandwrittenUpload] Error:', err);
      setErrorMessage(err.message || 'Evaluation failed. Please verify the image and try again.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleSaveAdjustments = async () => {
    if (!existingSubmission && !evaluationResult) return;
    const subId = existingSubmission?.id;
    const evalId = evaluationResult?.id || existingSubmission?.ocr_evaluation_id;

    setIsSavingAdjustment(true);
    try {
      if (evalId) {
        await ocrService.updateEvaluation(evalId, {
          score: editScore,
          feedback: editFeedback.trim()
        });
      }

      if (subId) {
        await classroomTaskService.overrideScore(
          subId,
          editScore,
          'Teacher adjustment',
          editFeedback.trim()
        );
      }

      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Failed to save score adjustment');
    } finally {
      setIsSavingAdjustment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-[#C9E5E2] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#071a1c] via-[#0d2a2d] to-[#173B3F] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#087477]/80 border border-teal-400/30 text-teal-200 flex items-center justify-center font-black shadow-xs">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-300 bg-teal-900/60 border border-teal-500/40 px-2 py-0.5 rounded-full inline-block mb-0.5">
                Classroom Work
              </span>
              <h3 className="text-base sm:text-lg font-black text-white">
                Evaluate Classroom Work
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-[#F8FCFB]">
          
          {/* Step 1 & 2: Select Task & Student */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#173B3F] block">
                1. Select Task <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                style={{ color: '#172B2F', backgroundColor: '#FFFFFF' }}
                className="w-full px-3.5 py-2.5 bg-white border-2 border-[#C9E5E2] rounded-xl text-xs font-black text-[#172B2F] focus:outline-none focus:border-[#159A9C] focus:ring-2 focus:ring-[#159A9C]/20"
              >
                <option value="">-- Choose a Task --</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.points} pts)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#173B3F] block">
                2. Select Student <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                style={{ color: '#172B2F', backgroundColor: '#FFFFFF' }}
                className="w-full px-3.5 py-2.5 bg-white border-2 border-[#C9E5E2] rounded-xl text-xs font-black text-[#172B2F] focus:outline-none focus:border-[#159A9C] focus:ring-2 focus:ring-[#159A9C]/20"
              >
                <option value="">-- Choose a Student --</option>
                {students.map((m) => (
                  <option key={m.profile_id} value={m.profile_id}>
                    {m.display_name || m.profile?.full_name || m.profile?.email || 'Student'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Existing Submission Found Alert */}
          {loadingExistingSub ? (
            <div className="p-3 bg-white rounded-2xl flex items-center justify-center gap-2 text-xs text-slate-400 border border-slate-200">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Checking student submission history...</span>
            </div>
          ) : existingSubmission && !replaceWork ? (
            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="text-xs font-black text-teal-950">
                    Existing Submission on File
                  </span>
                </div>
                <span className="text-[10px] font-bold text-teal-700">
                  {new Date(existingSubmission.submitted_at).toLocaleDateString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3 rounded-xl border border-teal-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Recorded Score</span>
                  <span className="text-sm font-black text-teal-700">
                    {existingSubmission.final_score ?? existingSubmission.points_awarded ?? 'Ungraded'} / {currentTask?.points || 20} pts
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Status</span>
                  <span className="text-xs font-black text-slate-800 capitalize">
                    {existingSubmission.status} {existingSubmission.is_ai_graded ? '(AI Evaluated)' : ''}
                  </span>
                </div>
              </div>

              {/* Display student's existing typed text response if available */}
              {existingSubmission.text_response && (
                <div className="bg-white p-3 rounded-xl border border-teal-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Student Typed Response</span>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {existingSubmission.text_response}
                  </p>
                </div>
              )}

              {/* Display student's existing handwritten image if available */}
              {imagePreview && (
                <div className="bg-white p-3 rounded-xl border border-teal-100 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Student Uploaded Work</span>
                  <div className="rounded-lg overflow-hidden border border-slate-200 max-h-52 flex justify-center bg-slate-100">
                    <img
                      src={imagePreview}
                      alt="Student Work"
                      className="max-h-52 object-contain"
                    />
                  </div>
                </div>
              )}

              {existingSubmission.teacher_feedback && (
                <p className="text-xs text-slate-600 font-medium bg-white/90 p-2.5 rounded-xl border border-teal-100">
                  <strong>Feedback:</strong> {existingSubmission.teacher_feedback}
                </p>
              )}

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-slate-500 font-medium">
                  {imagePreview
                    ? 'Student already submitted work. You can evaluate this image or upload a replacement.'
                    : 'This student has work recorded. You can adjust the score or upload a photo to replace it.'}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  {imagePreview && (
                    <button
                      type="button"
                      disabled={evaluating}
                      onClick={() => handleEvaluate()}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      {evaluating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>Evaluate Image</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setReplaceWork(true)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Upload New Work
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Step 3: Upload Student Handwritten Image (Only when no existing sub, or user selected replaceWork) */}
          {(!existingSubmission || replaceWork) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-700">
                  3. Upload Student Work Photo <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-bold text-slate-400">
                  Images only: JPG, JPEG, PNG, WEBP (Max 15MB)
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleImageSelect}
                className="hidden"
              />

              {!imagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl p-8 text-center cursor-pointer hover:bg-white transition-all space-y-2 group bg-slate-50/50"
                >
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-black text-slate-800">
                    Click to browse or drop student worksheet photo
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Capture student handwritten work with good lighting and contrast
                  </p>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-white p-2 group">
                  <img
                    src={imagePreview}
                    alt="Handwritten work preview"
                    className="max-h-64 mx-auto rounded-xl object-contain shadow-xs"
                  />
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg text-xs font-bold backdrop-blur-xs flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Evaluate Button */}
              <div className="flex items-center justify-end gap-2 pt-2">
                {replaceWork && (
                  <button
                    type="button"
                    onClick={() => setReplaceWork(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  disabled={evaluating || (!selectedImage && !imagePreview) || !selectedTaskId || !selectedStudentId}
                  onClick={() => handleEvaluate()}
                  className="px-6 py-2.5 bg-[#087477] hover:bg-[#065e60] text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                >
                  {evaluating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Evaluating Work with AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-teal-200" />
                      <span>Evaluate with AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Evaluated Results & Teacher Adjustments */}
          {(evaluationResult || (existingSubmission && !replaceWork)) && (
            <div className="pt-4 border-t-2 border-[#C9E5E2] space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#173B3F]">
                  Evaluation Outcome & Teacher Review
                </span>
                {savedNotice && (
                  <span className="text-[11px] font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Saved & Graded</span>
                  </span>
                )}
              </div>

              {/* Score & Feedback Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-[#173B3F]">Final Score (pts)</label>
                  <input
                    type="number"
                    value={editScore}
                    onChange={(e) => setEditScore(Number(e.target.value))}
                    max={currentTask?.points || 20}
                    min={0}
                    style={{ color: '#172B2F', backgroundColor: '#FFFFFF' }}
                    className="w-full px-3 py-2 bg-white border-2 border-[#C9E5E2] rounded-xl text-sm font-black text-[#087477] focus:outline-none focus:border-[#159A9C]"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-black text-[#173B3F]">Teacher Feedback</label>
                  <input
                    type="text"
                    value={editFeedback}
                    onChange={(e) => setEditFeedback(e.target.value)}
                    placeholder="Enter actionable praise or guidance..."
                    style={{ color: '#172B2F', backgroundColor: '#FFFFFF' }}
                    className="w-full px-3 py-2 bg-white border-2 border-[#C9E5E2] rounded-xl text-xs font-semibold text-[#172B2F] placeholder:text-[#475569] focus:outline-none focus:border-[#159A9C]"
                  />
                </div>
              </div>

              {/* Save Adjustment Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={isSavingAdjustment}
                  onClick={handleSaveAdjustments}
                  className="px-5 py-2 bg-[#087477] hover:bg-[#065e60] text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all active:scale-95 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingAdjustment ? 'Saving...' : 'Save Adjustments'}</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-[#C9E5E2] flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#36565A]">
            Work evaluation records directly into Task submissions.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#E8F7F5] hover:bg-[#D4EFEC] text-[#173B3F] border border-[#C9E5E2] rounded-xl text-xs font-black cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
