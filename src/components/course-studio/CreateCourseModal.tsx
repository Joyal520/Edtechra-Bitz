// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: CREATE DIGITAL COURSE MODAL (WIDE LANDSCAPE)
// Fast creation flow: Course Type -> Title -> Subject -> Cover Image
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Layers,
  Zap,
  Trash2,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Check,
  AlertCircle,
  UploadCloud
} from 'lucide-react';
import { courseStudioService } from '@/services/courseStudioService';
import { Course } from '@/types/courseStudio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (course: Course) => void;
}

const SUBJECT_OPTIONS = [
  'English',
  'ICT',
  'Science',
  'Mathematics',
  'Social Studies',
  'Hindi',
  'General Knowledge',
  'Other'
];

export const CreateCourseModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('English');
  const [courseType, setCourseType] = useState<'full' | 'quick'>('full');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverImageKey, setCoverImageKey] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setSubject('English');
      setCourseType('full');
      setCoverImageUrl(null);
      setCoverImageKey(null);
      setError(null);
      setSubmitting(false);
      setUploadingImage(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError(null);
    try {
      const res = await courseStudioService.uploadCourseImage(file, 'general', true);
      setCoverImageUrl(res.publicUrl);
      setCoverImageKey(res.storageKey);
    } catch (err: any) {
      setError(err.message || 'Failed to upload cover image.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setCoverImageUrl(null);
    setCoverImageKey(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a course title.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const newCourse = await courseStudioService.createCourse({
        title: title.trim(),
        subject,
        grade_level: 'All Grades',
        course_type: courseType,
        cover_image_url: coverImageUrl,
        cover_image_key: coverImageKey
      });

      onSuccess(newCourse);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create course.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      {/* Modal Dialog Container - Wide Landscape */}
      <div className="bg-white rounded-[24px] sm:rounded-[28px] max-w-[980px] w-full border border-stone-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header - Always Fixed at Top */}
        <div className="px-6 py-5 sm:px-8 sm:py-5 bg-[#0a213c] text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-200 text-[11px] font-black uppercase tracking-wider border border-sky-400/30">
              <Sparkles className="w-3.5 h-3.5 text-sky-300" />
              <span>EdTechra Course Studio</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Create Digital Course
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleCreate} id="create-course-form" className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* COURSE TYPE */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
              Course Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Full Course Card */}
              <button
                type="button"
                onClick={() => setCourseType('full')}
                className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-4 ${
                  courseType === 'full'
                    ? 'bg-sky-50/70 border-[#026fc3] ring-2 ring-[#026fc3]/20 shadow-xs'
                    : 'bg-[#faf9f6] border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  courseType === 'full' ? 'bg-[#026fc3] text-white shadow-sm' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  <Layers className="w-5 h-5" />
                </div>
                <div className="space-y-1 flex-1 pr-6">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-slate-900">Full Course</p>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-sky-100 text-[#026fc3]">
                      Multi-unit
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Build a course with multiple units and lessons.
                  </p>
                </div>
                {courseType === 'full' && (
                  <div className="absolute top-4 right-4 text-[#026fc3]">
                    <CheckCircle2 className="w-5 h-5 fill-[#026fc3] text-white" />
                  </div>
                )}
              </button>

              {/* Quick Lesson Card */}
              <button
                type="button"
                onClick={() => setCourseType('quick')}
                className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-4 ${
                  courseType === 'quick'
                    ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                    : 'bg-[#faf9f6] border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  courseType === 'quick' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  <Zap className="w-5 h-5" />
                </div>
                <div className="space-y-1 flex-1 pr-6">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-slate-900">Quick Lesson</p>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                      Single lesson
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Create one focused lesson.
                  </p>
                </div>
                {courseType === 'quick' && (
                  <div className="absolute top-4 right-4 text-amber-600">
                    <CheckCircle2 className="w-5 h-5 fill-amber-500 text-white" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* COURSE TITLE */}
          <div className="space-y-1.5">
            <label htmlFor="course-title-input" className="text-xs font-black text-slate-700 flex items-center gap-1">
              <span>Course Title</span>
              <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              id="course-title-input"
              type="text"
              required
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Master the Simple Present Tense"
              className="w-full px-4 py-3 rounded-xl bg-white border border-stone-200 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-[#026fc3] focus:border-[#026fc3] focus:outline-none placeholder:text-slate-400 transition-all shadow-2xs"
            />
          </div>

          {/* LANDSCAPE 2-COLUMN SECTION: SUBJECT & COVER IMAGE */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            
            {/* Subject Dropdown */}
            <div className="md:col-span-6 space-y-1.5">
              <label htmlFor="subject-select" className="text-xs font-black text-slate-700 block">
                Subject
              </label>
              <select
                id="subject-select"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white border border-stone-200 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-[#026fc3] focus:border-[#026fc3] focus:outline-none transition-all shadow-2xs cursor-pointer"
              >
                {SUBJECT_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 font-medium">
                Select the primary discipline for this course.
              </p>
            </div>

            {/* Cover Image Upload (Optional) */}
            <div className="md:col-span-6 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-700">
                  Cover Image
                </label>
                <span className="text-[11px] text-slate-400 font-semibold">
                  Optional
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImagePick}
                disabled={uploadingImage}
                className="hidden"
                id="cover-image-upload"
              />

              {coverImageUrl ? (
                /* Uploaded State */
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-stone-200 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={coverImageUrl}
                      alt="Course Cover Preview"
                      className="w-14 h-11 rounded-lg object-cover border border-stone-200 shrink-0 bg-white"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Cover uploaded</span>
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        Cloudflare R2 stored
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <label
                      htmlFor="cover-image-upload"
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 text-slate-700 text-xs font-bold hover:bg-stone-50 transition-all cursor-pointer shadow-2xs"
                    >
                      Change
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      aria-label="Remove image"
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Empty Upload Dropzone Button */
                <label
                  htmlFor="cover-image-upload"
                  className={`group w-full p-3 rounded-xl border border-dashed transition-all cursor-pointer flex items-center justify-center gap-3 ${
                    uploadingImage
                      ? 'bg-slate-50 border-slate-300 opacity-70 cursor-wait'
                      : 'bg-white hover:bg-slate-50/80 border-stone-300 hover:border-[#026fc3]/50'
                  }`}
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 text-[#026fc3] animate-spin shrink-0" />
                      <span className="text-xs font-bold text-slate-600">
                        Uploading to Cloudflare R2...
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#026fc3] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                        <UploadCloud className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-800 group-hover:text-[#026fc3] transition-colors">
                          Upload Cover Image
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          PNG, JPG or WebP (optional)
                        </p>
                      </div>
                    </>
                  )}
                </label>
              )}
            </div>

          </div>
        </form>

        {/* Footer - Fixed / Sticky Bottom Bar */}
        <div className="px-6 py-4 sm:px-8 sm:py-4 bg-[#fcfaf6] border-t border-stone-200/90 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 font-medium hidden sm:block">
            You can configure lessons & content in the studio.
          </div>
          <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-course-form"
              disabled={submitting || !title.trim() || uploadingImage}
              className="px-6 py-2.5 rounded-xl bg-[#026fc3] hover:bg-[#03589e] text-white text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Course...</span>
                </>
              ) : (
                <>
                  <span>Create Course</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
