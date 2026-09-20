import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  AlertCircle,
  Loader2,
  RotateCcw,
  Check,
  User,
  Award,
  BookOpen
} from 'lucide-react';
import { ClassroomMember, OCREvaluationCategory } from '@/types/classroom';
import { ocrService } from '@/services/ocrService';
import { supabase } from '@/lib/supabase';

interface QuickAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId: string;
  members?: ClassroomMember[];
  onSuccess?: () => void;
}

const PRESET_CATEGORIES: Array<{ id: OCREvaluationCategory; label: string; desc: string }> = [
  { id: 'Paragraph Writing', label: 'Paragraph Writing', desc: 'Core structure, ideas & coherence' },
  { id: 'Grammar', label: 'Grammar', desc: 'Syntax, punctuation, tense & mechanics' },
  { id: 'Vocabulary', label: 'Vocabulary', desc: 'Word choice, context & precision' },
  { id: 'Reading', label: 'Reading', desc: 'Comprehension & passage interpretation' },
  { id: 'Writing', label: 'Writing', desc: 'Overall expression, clarity & flow' },
  { id: 'Comprehension', label: 'Comprehension', desc: 'Question understanding & accuracy' },
  { id: 'Story Writing', label: 'Story Writing', desc: 'Narrative, pacing & creativity' },
  { id: 'Handwritten Neatness', label: 'Handwritten Neatness', desc: 'Legibility, alignment & spacing' },
  { id: 'Other', label: 'Custom / Other', desc: 'Teacher-specified skill or topic' }
];

export const QuickAssessmentModal: React.FC<QuickAssessmentModalProps> = ({
  isOpen,
  onClose,
  classroomId,
  members: membersProp = [],
  onSuccess
}) => {
  // Members state
  const [members, setMembers] = useState<ClassroomMember[]>(membersProp);

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [category, setCategory] = useState<OCREvaluationCategory>('Paragraph Writing');
  const [topicFocus, setTopicFocus] = useState('');
  const [customCategoryTitle, setCustomCategoryTitle] = useState('');
  const [maxMarks, setMaxMarks] = useState<number>(20);

  // Image & Camera State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Evaluation & Results State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Teacher Adjustment
  const [editScore, setEditScore] = useState<number>(0);
  const [editFeedback, setEditFeedback] = useState<string>('');
  const [isSavingAdjustment, setIsSavingAdjustment] = useState(false);
  const [adjustmentSaved, setAdjustmentSaved] = useState(false);
  const [tiSyncStatus, setTiSyncStatus] = useState<'synced' | 'pending'>('synced');

  // File Inputs Refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load students if members not passed
  useEffect(() => {
    if (isOpen && classroomId && members.length === 0 && supabase) {
      supabase
        .from('classroom_members')
        .select(`
          id,
          classroom_id,
          profile_id,
          role,
          status,
          display_name,
          profile:profiles!classroom_members_profile_id_fkey(id, full_name, email, avatar_url, role)
        `)
        .eq('classroom_id', classroomId)
        .eq('status', 'active')
        .then(({ data }) => {
          if (data) {
            setMembers(data as any[]);
          }
        });
    }
  }, [isOpen, classroomId]);

  useEffect(() => {
    if (membersProp && membersProp.length > 0) {
      setMembers(membersProp);
    }
  }, [membersProp]);

  // Filter students only
  const students = members.filter((m) => {
    if (m.role === 'teacher' || m.role === 'co-teacher') return false;
    if (m.profile?.role === 'teacher' || m.profile?.role === 'admin') return false;
    return true;
  });

  // Auto-select first student if none selected
  useEffect(() => {
    if (isOpen && !selectedStudentId && students.length > 0) {
      setSelectedStudentId(students[0].profile_id);
    }
  }, [isOpen, students]);

  // Body scroll lock & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleImageFile = (file: File) => {
    setFileError(null);
    setErrorMessage(null);

    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const ext = file.name?.split('.').pop()?.toLowerCase();
    const validExts = ['jpg', 'jpeg', 'png', 'webp'];

    if (!validMimes.includes(file.type) && (!ext || !validExts.includes(ext))) {
      setFileError('Please select a valid image (.jpg, .jpeg, .png, or .webp). Document or PDF files are not supported.');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setFileError('Image is larger than 12MB. Please select or capture a smaller image.');
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.onerror = () => {
      setFileError('Failed to read the selected image.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setFileError(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEvaluate = async () => {
    if (!selectedStudentId) {
      setErrorMessage('Please select a student to assess.');
      return;
    }

    if (!selectedImage && !imagePreview) {
      setErrorMessage('Please take a photo or upload an image of the student work.');
      return;
    }

    if (maxMarks <= 0 || isNaN(maxMarks)) {
      setErrorMessage('Maximum marks must be a positive number.');
      return;
    }

    setIsEvaluating(true);
    setErrorMessage(null);

    try {
      const targetStudent = students.find((s) => s.profile_id === selectedStudentId);
      const studentName = targetStudent?.display_name || targetStudent?.profile?.full_name || 'Student';
      const effectiveTitle = topicFocus.trim() || (category === 'Other' && customCategoryTitle.trim()
        ? customCategoryTitle.trim()
        : category);

      let tempFileKey: string | undefined;

      // Detect MIME type accurately for JPG, JPEG, PNG, WEBP
      const detectedContentType = selectedImage?.type || (
        imagePreview?.startsWith('data:image/png')
          ? 'image/png'
          : imagePreview?.startsWith('data:image/webp')
            ? 'image/webp'
            : 'image/jpeg'
      );

      // Attempt R2 presigned upload if image is selected, with seamless fallback to direct base64
      if (selectedImage) {
        try {
          const presigned = await ocrService.presignTemporaryUpload({
            classroomId,
            filename: selectedImage.name || 'worksheet.jpg',
            contentType: detectedContentType,
            size: selectedImage.size
          });

          await ocrService.uploadFileToR2(presigned.uploadUrl, selectedImage, detectedContentType);
          tempFileKey = presigned.objectKey;
        } catch (uploadErr: any) {
          console.warn('[QuickAssessment] R2 temporary upload notice, proceeding with direct base64:', uploadErr.message);
        }
      }

      const evalId = crypto.randomUUID();
      const jobPayload: any = {
        evaluationId: evalId,
        classroomId,
        studentId: selectedStudentId,
        studentName,
        category,
        title: effectiveTitle,
        maxMarks: Number(maxMarks),
        fileContentType: detectedContentType
      };

      // Ensure base64 is always provided for instantaneous vision processing
      if (imagePreview) {
        jobPayload.imageBase64 = imagePreview;
      }
      if (tempFileKey) {
        jobPayload.temporaryFileKey = tempFileKey;
      }

      const result = await ocrService.submitJob(jobPayload);

      // Handle both unwrapped and wrapped response structures
      let completedEval: any = (result && (result.data || result)) || null;

      // If job is asynchronously queued or processing, poll until finished
      if (completedEval && (completedEval.status === 'queued' || completedEval.status === 'processing')) {
        const pollJobId = completedEval.jobId || completedEval.evaluationId || evalId;
        const maxPollAttempts = 20;
        for (let i = 0; i < maxPollAttempts; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          const polled = await ocrService.pollJob(pollJobId);
          if (polled && polled.status === 'completed') {
            completedEval = polled;
            break;
          } else if (polled && polled.status === 'failed') {
            const pollErr: any = new Error(polled.error_message || 'Evaluation could not be completed.');
            pollErr.stage = 'vision_evaluation';
            throw pollErr;
          }
        }
      }

      if (!completedEval || (completedEval.status !== 'completed' && typeof completedEval.score !== 'number' && typeof completedEval.final_score !== 'number')) {
        const invalidResErr: any = new Error('Evaluation could not be completed. Please try again.');
        invalidResErr.stage = 'response_parsing';
        throw invalidResErr;
      }

      // Guarantee ID is available for teacher score adjustment
      completedEval.id = completedEval.id || completedEval.evaluationId || evalId;

      setEvaluationResult(completedEval);
      setEditScore(completedEval.final_score ?? completedEval.score ?? 0);
      setEditFeedback(completedEval.feedback || '');

      // STAGE C & D: Safely propagate evidence to classroom data without blocking or losing student score
      try {
        if (onSuccess) {
          await Promise.resolve(onSuccess());
        }
        setTiSyncStatus('synced');
      } catch (syncErr: any) {
        console.warn('[QuickAssessment] Notice: Post-evaluation sync pending:', syncErr?.message || syncErr);
        setTiSyncStatus('pending');
      }
    } catch (err: any) {
      console.error('[QuickAssessment] Evaluation request failed:', {
        status: err?.status || 500,
        stage: err?.stage || 'vision_evaluation',
        error: err?.message || 'Unknown error'
      });
      const msg = err.message || '';
      const isQualityError = msg.toLowerCase().includes('quality') || msg.toLowerCase().includes('blur');
      if (isQualityError) {
        setErrorMessage('Image quality is too low for reliable evaluation. Please retake the photo in better lighting.');
      } else if (err.stage === 'image_upload') {
        setErrorMessage('Failed to upload the worksheet image. Please check your connection and try again.');
      } else if (err.stage === 'vision_evaluation') {
        setErrorMessage(msg || 'AI Vision evaluation could not read this worksheet. Please ensure the handwriting is clear.');
      } else {
        setErrorMessage(msg || 'Evaluation could not be completed. Please try again.');
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSaveAdjustment = async () => {
    const evalId = evaluationResult?.id || evaluationResult?.evaluationId;
    if (!evalId) return;
    setIsSavingAdjustment(true);
    try {
      await ocrService.updateEvaluation(evalId, {
        score: editScore,
        feedback: editFeedback.trim()
      });
      fetch(`/api/classes/${classroomId}/teaching-intelligence/invalidate`, { method: 'POST' }).catch(() => {});
      setAdjustmentSaved(true);
      setTimeout(() => setAdjustmentSaved(false), 3000);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert(err.message || 'Failed to save score adjustment.');
    } finally {
      setIsSavingAdjustment(false);
    }
  };

  const handleAssessAnother = () => {
    // Keep category and maxMarks for convenience, reset student work & result
    setEvaluationResult(null);
    setSelectedImage(null);
    setImagePreview(null);
    setErrorMessage(null);
    setFileError(null);
    setAdjustmentSaved(false);
    setTiSyncStatus('synced');
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const currentSelectedStudent = students.find((s) => s.profile_id === selectedStudentId);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 pointer-events-auto"
      style={{ isolation: 'isolate' }}
    >
      {/* Dark translucent backdrop covering entire viewport */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200 cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Container - Fully Opaque */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-assessment-modal-title"
        className="relative z-10 bg-white opacity-100 w-[calc(100vw-24px)] sm:w-full max-w-2xl rounded-3xl shadow-2xl border-2 border-[#C9E5E2] overflow-hidden flex flex-col max-h-[90vh] my-auto pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header - Fully Opaque */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#071a1c] via-[#0d2a2d] to-[#173B3F] text-white flex items-center justify-between shrink-0 border-b border-[#0e3b40]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#087477] border border-teal-400/30 text-teal-200 flex items-center justify-center shadow-xs shrink-0">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-300 bg-teal-900/60 border border-teal-500/40 px-2 py-0.5 rounded-full">
                  Classroom Mode
                </span>
                <span className="text-[10px] font-bold text-teal-200/80">
                  Direct Evidence
                </span>
              </div>
              <h2 id="quick-assessment-modal-title" className="text-base sm:text-lg font-black text-white tracking-tight uppercase">
                QUICK CLASSROOM ASSESSMENT
              </h2>
              <p className="text-xs text-teal-100/90 font-medium mt-0.5">
                Evaluate student work instantly and add the result to Teaching Intelligence.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Hidden Camera & File Inputs */}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          ref={cameraInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Modal Body - Fully Opaque */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-white">
          
          {/* Error Banner */}
          {(errorMessage || fileError) && (
            <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl text-xs text-rose-900 font-bold flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage || fileError}</span>
            </div>
          )}

          {/* =============================================================== */}
          {/* STATE A: EVALUATION RESULTS PRESENTATION                        */}
          {/* =============================================================== */}
          {evaluationResult ? (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Score Announcement Banner */}
              <div className="p-6 bg-gradient-to-br from-[#173B3F] to-[#087477] text-white rounded-3xl shadow-md space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-teal-300" />
                    <span className="text-xs font-black uppercase tracking-wider text-teal-100">
                      Assessment Completed
                    </span>
                  </div>
                  {tiSyncStatus === 'pending' ? (
                    <span className="px-3 py-1 rounded-full text-xs font-black tracking-wide bg-teal-500/30 text-teal-200 border border-teal-400/40 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                      Teaching Intelligence analysis will update shortly
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-black tracking-wide bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      Result saved to Teaching Intelligence
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-teal-600/40">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-200/80 block">Student</span>
                    <span className="text-sm font-black text-white block truncate">{currentSelectedStudent?.display_name || currentSelectedStudent?.profile?.full_name || 'Student'}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-200/80 block">Evaluation</span>
                    <span className="text-sm font-black text-white block truncate">{evaluationResult.title || evaluationResult.category}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-200/80 block">Score</span>
                    <span className="text-xl font-black text-white block">{evaluationResult.final_score ?? evaluationResult.score} <span className="text-xs font-bold text-teal-200">/ {evaluationResult.max_marks || maxMarks}</span></span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-200/80 block">Performance</span>
                    <span className="text-xl font-black text-emerald-300 block">{evaluationResult.percentage}%</span>
                  </div>
                </div>
              </div>

              {/* Criteria Breakdown Grid */}
              {Array.isArray(evaluationResult.breakdown_json) && evaluationResult.breakdown_json.length > 0 && (
                <div className="bg-white p-5 rounded-3xl border-2 border-[#C9E5E2] shadow-xs space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">
                    Criteria Breakdown
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {evaluationResult.breakdown_json.map((c: any, idx: number) => {
                      const pct = c.max > 0 ? Math.round((c.score / c.max) * 100) : 0;
                      return (
                        <div key={idx} className="p-3 rounded-2xl bg-[#E8F7F5] border border-[#C9E5E2] space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-black text-[#173B3F]">{c.criterion}</span>
                            <span className="font-black text-[#087477]">{c.score} / {c.max}</span>
                          </div>
                          <div className="w-full bg-[#C9E5E2] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#087477] h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Teacher Feedback & Adjustment Area */}
              <div className="bg-white p-5 rounded-3xl border-2 border-[#C9E5E2] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">
                    AI Feedback & Teacher Review
                  </h4>
                  {adjustmentSaved && (
                    <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Check className="w-3 h-3" /> Saved to Records
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1 space-y-1">
                    <label className="text-xs font-black text-[#173B3F] block">
                      Score Adjustment
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={evaluationResult.max_marks || maxMarks}
                      value={editScore}
                      onChange={(e) => setEditScore(Number(e.target.value))}
                      style={{ color: '#172B2F', backgroundColor: '#FFFFFF' }}
                      className="w-full px-3.5 py-2.5 bg-white border-2 border-[#C9E5E2] rounded-xl text-sm font-black text-[#172B2F] focus:outline-none focus:border-[#159A9C] focus:ring-2 focus:ring-[#159A9C]/20"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-black text-[#173B3F] block">
                      Feedback
                    </label>
                    <textarea
                      rows={2}
                      value={editFeedback}
                      onChange={(e) => setEditFeedback(e.target.value)}
                      placeholder="Pedagogical feedback for the student..."
                      style={{ color: '#172B2F', backgroundColor: '#FFFFFF' }}
                      className="w-full p-2.5 bg-white border-2 border-[#C9E5E2] rounded-xl text-xs font-semibold text-[#172B2F] placeholder:text-[#475569] focus:outline-none focus:border-[#159A9C] focus:ring-2 focus:ring-[#159A9C]/20 resize-none leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveAdjustment}
                    disabled={isSavingAdjustment}
                    className="px-4 py-1.5 bg-[#E8F7F5] hover:bg-[#D4EFEC] text-[#087477] border border-[#C9E5E2] rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {isSavingAdjustment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Update Evidence Score</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleAssessAnother}
                  className="px-5 py-2.5 bg-[#087477] hover:bg-[#065e60] text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-sm transition-all active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Assess Another Student</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-white hover:bg-slate-100 text-[#173B3F] border-2 border-[#C9E5E2] rounded-xl text-xs font-black cursor-pointer transition-all"
                >
                  Done
                </button>
              </div>

            </div>
          ) : (

            /* =============================================================== */
            /* STATE B: ASSESSMENT FORM (STUDENT + CATEGORY + MARKS + WORK)    */
            /* =============================================================== */
            <div className="space-y-5">
              
              {/* Step 1: Select Student */}
              <div className="bg-white p-5 rounded-3xl border-2 border-[#C9E5E2] shadow-xs space-y-2">
                <label className="text-xs font-black text-[#173B3F] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#087477]" />
                  <span>Student</span>
                  <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  style={{ color: '#172B2F', backgroundColor: '#FFFFFF' }}
                  className="w-full px-4 py-2.5 bg-white border-2 border-[#C9E5E2] rounded-xl text-xs font-black text-[#172B2F] focus:outline-none focus:border-[#159A9C] focus:ring-2 focus:ring-[#159A9C]/20 transition-all cursor-pointer"
                >
                  <option value="">Choose student ▼</option>
                  {students.map((st) => (
                    <option key={st.profile_id} value={st.profile_id}>
                      {st.display_name || st.profile?.full_name || st.profile?.email || 'Student'}
                    </option>
                  ))}
                </select>
                {students.length === 0 && (
                  <p className="text-[11px] text-amber-700 font-bold bg-amber-50 p-2 rounded-lg border border-amber-200">
                    No enrolled students found in this classroom roster.
                  </p>
                )}
              </div>

              {/* Step 2: Learning Topic / Skill Focus */}
              <div className="bg-white p-5 rounded-3xl border-2 border-[#C9E5E2] shadow-xs space-y-2">
                <label className="text-xs font-black text-[#173B3F] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#087477]" />
                  <span>Learning Topic / Skill Focus</span>
                </label>
                <input
                  type="text"
                  value={topicFocus}
                  onChange={(e) => setTopicFocus(e.target.value)}
                  placeholder="e.g., Simple Present — Negative Forms"
                  style={{ color: '#172B2F', backgroundColor: '#FFFFFF' }}
                  className="w-full px-4 py-2.5 bg-white border-2 border-[#C9E5E2] rounded-xl text-xs font-black text-[#172B2F] placeholder:text-[#667085] focus:outline-none focus:border-[#159A9C] focus:ring-2 focus:ring-[#159A9C]/20 transition-all"
                />
              </div>

              {/* Step 2: Choose Evaluation Category / Skill */}
              <div className="bg-white p-5 rounded-3xl border-2 border-[#C9E5E2] shadow-xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="text-xs font-black text-[#173B3F] flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#087477]" />
                      <span>Evaluation Area</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-[11px] text-[#36565A] font-semibold mt-0.5">
                      Select the skill or category being evaluated.
                    </p>
                  </div>
                  
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as OCREvaluationCategory)}
                    style={{ color: '#172B2F', backgroundColor: '#FFFFFF' }}
                    className="px-3 py-1.5 bg-white border-2 border-[#C9E5E2] rounded-xl text-xs font-black text-[#172B2F] focus:outline-none focus:border-[#159A9C] cursor-pointer"
                  >
                    <option value="">Select category ▼</option>
                    {PRESET_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {PRESET_CATEGORIES.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#E8F7F5] border-[#087477] shadow-xs ring-1 ring-[#087477]'
                            : 'bg-white border-[#C9E5E2] hover:border-[#159A9C]'
                        }`}
                      >
                        <span className={`text-xs font-black block ${isSelected ? 'text-[#087477]' : 'text-[#173B3F]'}`}>
                          {cat.label}
                        </span>
                        <span className="text-[10px] text-[#36565A] font-medium leading-tight line-clamp-1 mt-0.5">
                          {cat.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Category Title Input if 'Other' selected */}
                {category === 'Other' && (
                  <div className="pt-2 border-t border-[#C9E5E2] space-y-1.5 animate-in fade-in">
                    <label className="text-xs font-black text-[#173B3F]">
                      Specific Skill or Topic Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customCategoryTitle}
                      onChange={(e) => setCustomCategoryTitle(e.target.value)}
                      placeholder="e.g., Creative Writing, Science Diagram, Book Review"
                      style={{ color: '#172B2F', backgroundColor: '#FFFFFF' }}
                      className="w-full px-3.5 py-2 bg-white border-2 border-[#C9E5E2] rounded-xl text-xs font-black text-[#172B2F] placeholder:text-[#475569] focus:outline-none focus:border-[#159A9C] focus:ring-2 focus:ring-[#159A9C]/20 transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Step 3: Maximum Marks */}
              <div className="bg-white p-5 rounded-3xl border-2 border-[#C9E5E2] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-[#173B3F]">
                    Maximum Marks <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[10, 20, 50, 100].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setMaxMarks(val)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
                          maxMarks === val
                            ? 'bg-[#087477] text-white'
                            : 'bg-[#E8F7F5] text-[#087477] hover:bg-[#D4EFEC]'
                        }`}
                      >
                        {val} pts
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(Number(e.target.value))}
                  style={{ color: '#172B2F', backgroundColor: '#FFFFFF' }}
                  className="w-full sm:w-48 px-3.5 py-2 bg-white border-2 border-[#C9E5E2] rounded-xl text-xs font-black text-[#172B2F] focus:outline-none focus:border-[#159A9C] focus:ring-2 focus:ring-[#159A9C]/20 transition-all"
                />
              </div>

              {/* Step 4: Student Work (Camera / Upload) */}
              <div className="bg-white p-5 rounded-3xl border-2 border-[#C9E5E2] shadow-xs space-y-3">
                <label className="text-xs font-black text-[#173B3F] block">
                  Student Work <span className="text-rose-500">*</span>
                </label>

                {imagePreview ? (
                  <div className="p-4 bg-[#F8FCFB] rounded-2xl border-2 border-[#C9E5E2] flex flex-col items-center gap-3.5">
                    <div className="relative max-h-72 overflow-hidden rounded-xl shadow-xs border border-[#C9E5E2] bg-black/5">
                      <img
                        src={imagePreview}
                        alt="Student Work Preview"
                        className="max-h-72 object-contain mx-auto"
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 bg-white hover:bg-[#E8F7F5] text-[#173B3F] border border-[#C9E5E2] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#087477]" />
                        <span>Change Image</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-3.5 py-1.5 bg-[#E8F7F5] hover:bg-[#D4EFEC] text-[#087477] border border-[#C9E5E2] rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Retake</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleClearImage}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    
                    {/* Option 1: Take Photo */}
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="p-5 rounded-2xl border-2 border-dashed border-[#087477] bg-[#E8F7F5] hover:bg-[#D4EFEC] transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 group shadow-2xs"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#087477] text-white flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                        <Camera className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#087477] block">CAMERA</span>
                        <span className="text-sm font-black text-[#173B3F] block mt-0.5">
                          Take Photo
                        </span>
                        <span className="text-[11px] text-[#36565A] font-semibold block mt-0.5">
                          Use device camera where supported
                        </span>
                      </div>
                    </button>

                    {/* Option 2: Upload Image */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-5 rounded-2xl border-2 border-dashed border-[#C9E5E2] bg-white hover:bg-[#E8F7F5] transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 group shadow-2xs"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#C9E5E2] text-[#087477] flex items-center justify-center group-hover:scale-105 group-hover:border-[#159A9C] transition-all shadow-xs">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#36565A] block">UPLOAD</span>
                        <span className="text-sm font-black text-[#173B3F] block mt-0.5">
                          Upload Image
                        </span>
                        <span className="text-[11px] text-[#36565A] font-semibold block mt-0.5">
                          Choose JPG, JPEG, PNG, or WEBP
                        </span>
                      </div>
                    </button>

                  </div>
                )}
              </div>

              {/* Evaluate Action Button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-[#C9E5E2] text-[#36565A] hover:bg-[#E8F7F5] text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleEvaluate}
                  disabled={isEvaluating || (!selectedImage && !imagePreview)}
                  className="px-6 py-2.5 bg-[#087477] hover:bg-[#065e60] text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                >
                  {isEvaluating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Evaluating with AI...</span>
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

        </div>
      </div>
    </div>,
    document.body
  );
};
