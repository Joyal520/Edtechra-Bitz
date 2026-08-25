import React, { useState, useRef } from 'react';
import { X, Sparkles, Upload, CheckCircle2 } from 'lucide-react';
import { ClassroomMember } from '@/types/classroom';
import { classroomPointsService } from '@/services/classroomPointsService';
import { supabase } from '@/lib/supabase';

interface OCRGradingModalProps {
  isOpen: boolean;
  classroomId: string;
  members: ClassroomMember[];
  onClose: () => void;
  onSuccess: () => void;
}

export const OCRGradingModal: React.FC<OCRGradingModalProps> = ({
  isOpen,
  classroomId,
  members,
  onClose,
  onSuccess
}) => {
  const [studentId, setStudentId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [rubric, setRubric] = useState('Accuracy, clarity, and completeness of answers');
  const [maxPoints, setMaxPoints] = useState(100);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<{
    score: number;
    feedback: string;
    strengths?: string[];
    improvements?: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // Local preview
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token;

      const presignRes = await fetch('/api/classes/presign-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          classroomId,
          filename: file.name,
          contentType: file.type || 'image/jpeg',
          size: file.size
        })
      });

      if (!presignRes.ok) throw new Error('Upload initialization failed');
      const { data: presigned } = await presignRes.json();

      await fetch(presigned.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: file
      });

      setUploadedUrl(presigned.publicUrl);
    } catch (err) {
      console.warn('R2 direct upload notice:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !taskTitle.trim()) {
      alert('Please select a student and enter the task title.');
      return;
    }

    const selectedMember = members.find((m) => m.profile_id === studentId);
    const studentName = selectedMember?.display_name || selectedMember?.profile?.full_name || 'Student';

    setIsEvaluating(true);
    setEvaluationResult(null);

    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token;

      const res = await fetch('/api/classes/ocr-grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          studentName,
          assignmentTitle: taskTitle.trim(),
          rubric,
          maxPoints,
          textResponse: `Student worksheet submission evaluated for ${studentName}.`,
          fileUrl: uploadedUrl
        })
      });

      if (!res.ok) throw new Error('Evaluation failed');
      const json = await res.json();
      setEvaluationResult(json.data);
    } catch (err: any) {
      alert(err.message || 'Failed to complete AI OCR evaluation.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSaveResult = async () => {
    if (!evaluationResult || !studentId) return;

    try {
      // Award classroom points
      await classroomPointsService.awardPoints({
        classroom_id: classroomId,
        student_id: studentId,
        points: evaluationResult.score,
        reason: `AI OCR Grade: ${taskTitle}`,
        source_type: 'activity'
      });

      alert(`Successfully saved ${evaluationResult.score} points to student's record!`);
      onSuccess();
      onClose();
    } catch (err) {
      alert('Failed to save points');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">AI OCR Worksheet Grader</h2>
              <p className="text-xs text-slate-500 font-semibold">Automatic rubric evaluation from worksheet photos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-4">
          
          {!evaluationResult ? (
            <form onSubmit={handleEvaluate} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Select Student *
                  </label>
                  <select
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="">-- Choose enrolled student --</option>
                    {members.map((m) => (
                      <option key={m.profile_id} value={m.profile_id}>
                        {m.display_name || m.profile?.full_name || m.profile?.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Max Points *
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={500}
                    required
                    value={maxPoints}
                    onChange={(e) => setMaxPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Task / Worksheet Title *
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Chapter 4 Grammar Quiz Sheet"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Evaluation Rubric & Focus Criteria
                </label>
                <input
                  type="text"
                  value={rubric}
                  onChange={(e) => setRubric(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              {/* Image Upload Box */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Worksheet Photo / Document (Optional for AI analysis)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*,.pdf"
                  className="hidden"
                />

                {imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-2 flex items-center justify-between">
                    <img src={imagePreview} alt="Worksheet" className="h-24 w-24 object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      Change Photo
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-6 border-2 border-dashed border-slate-200 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl flex flex-col items-center justify-center text-slate-500 space-y-1 transition-all cursor-pointer"
                  >
                    <Upload className="w-6 h-6 text-slate-400" />
                    <span className="text-xs font-extrabold text-slate-700">Upload Worksheet Photo</span>
                    <span className="text-[10px] text-slate-400">JPG, PNG, WebP up to 15MB</span>
                  </button>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEvaluating || isUploading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isEvaluating ? 'Evaluating with AI...' : 'Run AI Evaluation'}</span>
                </button>
              </div>

            </form>
          ) : (
            /* Result View */
            <div className="space-y-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 animate-in fade-in">
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                    AI Evaluation Ready
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">{taskTitle}</h3>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-700">
                    {evaluationResult.score} <span className="text-xs font-bold text-slate-500">/ {maxPoints} pts</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-emerald-100 text-xs text-slate-800 leading-relaxed font-medium">
                "{evaluationResult.feedback}"
              </div>

              {evaluationResult.strengths && evaluationResult.strengths.length > 0 && (
                <div>
                  <strong className="text-xs font-black text-emerald-900">Key Strengths:</strong>
                  <ul className="list-disc list-inside text-xs text-emerald-800 mt-1 space-y-0.5">
                    {evaluationResult.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluationResult.improvements && evaluationResult.improvements.length > 0 && (
                <div>
                  <strong className="text-xs font-black text-amber-900">Areas for Growth:</strong>
                  <ul className="list-disc list-inside text-xs text-amber-800 mt-1 space-y-0.5">
                    {evaluationResult.improvements.map((imp, i) => (
                      <li key={i}>{imp}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-3 border-t border-emerald-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setEvaluationResult(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white rounded-xl"
                >
                  Back / Re-evaluate
                </button>

                <button
                  type="button"
                  onClick={handleSaveResult}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Result & Award Points</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
