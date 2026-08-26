import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Upload,
  CheckCircle2,
  FileText,
  Loader2,
  AlertCircle,
  ExternalLink,
  Edit3,
  Save,
  Check,
  Trash2
} from 'lucide-react';
import { ClassroomMember, OCREvaluation, OCREvaluationCategory } from '@/types/classroom';
import { ocrService } from '@/services/ocrService';

interface OCRGradingModalProps {
  isOpen: boolean;
  classroomId: string;
  members: ClassroomMember[];
  onClose: () => void;
  onSuccess: () => void;
}

const OCR_CATEGORIES: OCREvaluationCategory[] = [
  'Paragraph Writing',
  'Essay Writing',
  'Story Writing',
  'Letter Writing',
  'Handwritten Neatness',
  'Other'
];

export const OCRGradingModal: React.FC<OCRGradingModalProps> = ({
  isOpen,
  classroomId,
  members,
  onClose,
  onSuccess
}) => {
  // Form State
  const [studentId, setStudentId] = useState('');
  const [maxMarks, setMaxMarks] = useState(100);
  const [category, setCategory] = useState<OCREvaluationCategory>('Paragraph Writing');
  const [taskTitle, setTaskTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Job and Progress State
  const [jobState, setJobState] = useState<'idle' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [evaluation, setEvaluation] = useState<OCREvaluation | null>(null);

  // Teacher Correction State
  const [isEditing, setIsEditing] = useState(false);
  const [editScore, setEditScore] = useState<number>(0);
  const [editFeedback, setEditFeedback] = useState<string>('');
  const [isSavingAdjustment, setIsSavingAdjustment] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Report Loading State
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Filter students only from enrolled members
  const studentMembers = members.filter((m) => {
    if (m.role === 'teacher' || m.role === 'co-teacher') return false;
    if (m.profile?.role === 'teacher' || m.profile?.role === 'admin') return false;
    return true;
  });

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen]);

  const resetForm = () => {
    setStudentId('');
    setMaxMarks(100);
    setCategory('Paragraph Writing');
    setTaskTitle('');
    setSelectedFile(null);
    setImagePreview(null);
    setJobState('idle');
    setStatusMessage('');
    setErrorMessage('');
    setEvaluation(null);
    setIsEditing(false);
    setSaveSuccess(false);
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    if (file.size > 15 * 1024 * 1024) {
      alert('File size exceeds the 15 MB limit. Please select a smaller file.');
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startPolling = (jobId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    const poll = async () => {
      try {
        const evalData = await ocrService.pollJob(jobId);
        if (evalData.status === 'completed') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setEvaluation(evalData);
          setEditScore(evalData.final_score ?? evalData.score);
          setEditFeedback(evalData.feedback);
          setJobState('completed');
          setStatusMessage('Evaluation completed successfully.');
        } else if (evalData.status === 'processing') {
          setJobState('processing');
          setStatusMessage('AI is analyzing the worksheet...');
        } else if (evalData.status === 'queued') {
          setJobState('queued');
          setStatusMessage('Your worksheet is waiting for AI processing.');
        } else if (evalData.status === 'failed') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setJobState('failed');
          setErrorMessage(evalData.error_message || 'The worksheet could not be evaluated. Please try again.');
        }
      } catch (err: any) {
        console.warn('[OCR Modal] Status poll notice:', err.message);
      }
    };

    poll();
    pollTimerRef.current = setInterval(poll, 1500);
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      alert('Please select an enrolled student.');
      return;
    }
    if (!selectedFile) {
      alert('Please upload a worksheet photo or document.');
      return;
    }
    if (maxMarks <= 0 || isNaN(maxMarks)) {
      alert('Please enter a valid positive number for Maximum Marks.');
      return;
    }

    const selectedStudent = studentMembers.find((m) => m.profile_id === studentId);
    const studentName = selectedStudent?.display_name || selectedStudent?.profile?.full_name || 'Student';

    const evaluationId = crypto.randomUUID();
    setJobState('uploading');
    setStatusMessage('Uploading temporary worksheet...');
    setErrorMessage('');

    try {
      // 1. Presign temporary upload in R2
      const presigned = await ocrService.presignTemporaryUpload({
        classroomId,
        filename: selectedFile.name,
        contentType: selectedFile.type || 'image/jpeg',
        size: selectedFile.size,
        evaluationId
      });

      // 2. Direct upload to R2
      await ocrService.uploadFileToR2(presigned.uploadUrl, selectedFile, selectedFile.type || 'image/jpeg');

      // 3. Submit async job
      setJobState('queued');
      setStatusMessage('Your worksheet is waiting for AI processing.');

      const jobRes = await ocrService.submitJob({
        evaluationId,
        classroomId,
        studentId,
        category,
        maxMarks: Number(maxMarks),
        title: taskTitle.trim(),
        temporaryFileKey: presigned.objectKey,
        fileContentType: selectedFile.type || 'image/jpeg',
        studentName
      });

      // 4. Begin polling
      startPolling(jobRes.jobId || evaluationId);
    } catch (err: any) {
      console.error('[OCR Modal] Submit error:', err);
      setJobState('failed');
      setErrorMessage(err.message || 'The worksheet could not be evaluated. Please try again.');
    }
  };

  const handleSaveAdjustments = async () => {
    if (!evaluation) return;
    if (editScore < 0 || editScore > (evaluation.max_marks || 100)) {
      alert(`Score must be between 0 and ${evaluation.max_marks}.`);
      return;
    }

    setIsSavingAdjustment(true);
    try {
      const updated = await ocrService.updateEvaluation(evaluation.id, {
        score: editScore,
        feedback: editFeedback.trim()
      });
      setEvaluation(updated);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save adjustments');
    } finally {
      setIsSavingAdjustment(false);
    }
  };

  const handleViewReport = async () => {
    if (!evaluation) return;
    setIsLoadingReport(true);
    try {
      const reportUrl = await ocrService.getReportUrl(evaluation.id);
      if (reportUrl) {
        window.open(reportUrl, '_blank', 'noopener,noreferrer');
      } else {
        alert('Report URL is not available yet.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to open PDF report');
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleDone = () => {
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">AI OCR Worksheet Grader</h2>
              <p className="text-xs text-slate-500 font-semibold">Category-driven automated evaluation & feedback</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-4">

          {/* STATE 1: Initial Evaluation Form */}
          {jobState === 'idle' && (
            <form onSubmit={handleSubmitEvaluation} className="space-y-4">
              
              {/* Row 1: Student Selection & Maximum Marks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Select Student *
                  </label>
                  <select
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Choose enrolled student --</option>
                    {studentMembers.map((m) => (
                      <option key={m.profile_id} value={m.profile_id}>
                        {m.display_name || m.profile?.full_name || m.profile?.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Maximum Marks *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    required
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Row 2: Evaluation Category & Optional Task Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Evaluation Category *
                  </label>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value as OCREvaluationCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {OCR_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Worksheet / Task Title <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g. My Favourite Animal"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Row 3: Worksheet Photo / Document Upload */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Worksheet Photo / Document *
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/jpeg,image/png,image/webp,.pdf"
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Worksheet preview" className="h-16 w-16 object-cover rounded-xl border border-slate-200" />
                      ) : (
                        <div className="h-16 w-16 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600">
                          <FileText className="w-8 h-8" />
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-black text-slate-800 line-clamp-1">{selectedFile.name}</div>
                        <div className="text-[10px] text-slate-500 font-semibold">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Temporary processing input
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-6 border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl flex flex-col items-center justify-center text-slate-500 space-y-1.5 transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 group-hover:border-emerald-300 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 shadow-2xs">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black text-slate-700">Click to upload student worksheet</span>
                    <span className="text-[10px] text-slate-400 font-medium">Supports JPG, JPEG, PNG, WebP, PDF (up to 15MB)</span>
                  </button>
                )}
              </div>

              {/* Form Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || !studentId}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Evaluate with AI</span>
                </button>
              </div>

            </form>
          )}

          {/* STATE 2: Async Processing & Polling View */}
          {(jobState === 'uploading' || jobState === 'queued' || jobState === 'processing') && (
            <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm animate-pulse">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </div>
              </div>

              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-black text-slate-900">
                  {jobState === 'uploading' && 'Uploading Worksheet...'}
                  {jobState === 'queued' && 'Queued for AI Evaluation'}
                  {jobState === 'processing' && 'AI Analyzing Worksheet...'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {statusMessage || 'Processing your student submission...'}
                </p>
              </div>

              <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full animate-[indeterminate_1.5s_infinite_linear]" style={{ width: '40%' }}></div>
              </div>
            </div>
          )}

          {/* STATE 3: Failed State */}
          {jobState === 'failed' && (
            <div className="p-6 bg-rose-50 rounded-2xl border border-rose-200 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-rose-900">Evaluation Failed</h3>
                <p className="text-xs text-rose-700 mt-1 font-medium">
                  {errorMessage || 'The worksheet could not be evaluated. Please try again.'}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setJobState('idle')}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Edit Inputs & Retry
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: Completed Result View */}
          {jobState === 'completed' && evaluation && (
            <div className="space-y-4 animate-in fade-in">
              
              {/* Header Badge & Title */}
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                      AI Evaluation Complete
                    </span>
                    {evaluation.is_teacher_adjusted && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                        Teacher Adjusted
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    {studentMembers.find((m) => m.profile_id === evaluation.student_id)?.display_name ||
                     studentMembers.find((m) => m.profile_id === evaluation.student_id)?.profile?.full_name ||
                     'Student'}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    {evaluation.category} {evaluation.title ? `• "${evaluation.title}"` : ''}
                  </p>
                </div>

                <div className="text-right sm:border-l sm:border-emerald-200 sm:pl-4">
                  <div className="text-2xl font-black text-emerald-800">
                    {evaluation.final_score ?? evaluation.score}{' '}
                    <span className="text-xs font-bold text-slate-500">/ {evaluation.max_marks}</span>
                  </div>
                  <div className="text-xs font-black text-emerald-600">
                    {evaluation.percentage}% • {evaluation.performance}
                  </div>
                </div>
              </div>

              {/* Score Breakdown Cards */}
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                  Score Breakdown
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(evaluation.breakdown_json || []).map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">{item.criterion}</span>
                      <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {item.score} / {item.max}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Feedback Box & Teacher Edit Form */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    AI Feedback <span className="text-slate-400 font-normal">(Max 50 Words)</span>
                  </h4>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Score / Feedback</span>
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-200 space-y-3">
                    <div>
                      <label className="block text-[11px] font-extrabold text-indigo-900 mb-1">
                        Adjust Final Score (Max: {evaluation.max_marks})
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={evaluation.max_marks}
                        value={editScore}
                        onChange={(e) => setEditScore(Number(e.target.value))}
                        className="w-32 px-3 py-1.5 bg-white border border-indigo-300 rounded-xl text-xs font-black text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-indigo-900 mb-1">
                        Edit Pedagogical Feedback
                      </label>
                      <textarea
                        rows={3}
                        value={editFeedback}
                        onChange={(e) => setEditFeedback(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="text-[10px] text-slate-400 text-right mt-1">
                        {editFeedback.trim().split(/\s+/).filter(Boolean).length} / 50 words
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSavingAdjustment}
                        onClick={handleSaveAdjustments}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSavingAdjustment ? 'Saving...' : 'Save Adjustments'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium">
                    "{evaluation.feedback}"
                  </div>
                )}

                {saveSuccess && (
                  <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Corrections saved and report updated!</span>
                  </div>
                )}
              </div>

              {/* Bottom Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  disabled={isLoadingReport}
                  onClick={handleViewReport}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{isLoadingReport ? 'Loading Report...' : 'View Report PDF'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setJobState('idle')}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Grade Another
                  </button>
                  <button
                    type="button"
                    onClick={handleDone}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Done</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
