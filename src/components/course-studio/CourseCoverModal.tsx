// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: COURSE COVER MANAGEMENT MODAL
// Allows teachers to upload, preview, replace, or remove custom covers.
// Updates existing course records without duplicating courses.
// ============================================================================

import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  Trash2,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import { Course } from '@/types/courseStudio';
import { courseStudioService } from '@/services/courseStudioService';
import { BrandedCourseFallback } from '@/utils/courseCover';

interface Props {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedCourse: Course) => void;
}

export const CourseCoverModal: React.FC<Props> = ({
  course,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [coverUrl, setCoverUrl] = useState<string | null>(course.cover_image_url || null);
  const [coverKey, setCoverKey] = useState<string | null>(course.cover_image_key || null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '1:1'>(
    course.cover_aspect_ratio === '1:1' ? '1:1' : '16:9'
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Cover image size must be under 10MB.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const res = await courseStudioService.uploadCourseImage(file, course.id, true);
      setCoverUrl(res.publicUrl);
      setCoverKey(res.storageKey);
    } catch (err: any) {
      setError(err.message || 'Failed to upload cover image.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveCover = () => {
    setCoverUrl(null);
    setCoverKey(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await courseStudioService.updateCourse(course.id, {
        cover_image_url: coverUrl,
        cover_image_key: coverKey,
        cover_aspect_ratio: aspectRatio
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save cover changes.');
    } finally {
      setSaving(false);
    }
  };

  const previewCourse: Partial<Course> = {
    ...course,
    cover_image_url: coverUrl,
    cover_aspect_ratio: aspectRatio
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-[28px] max-w-xl w-full border border-stone-200/90 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 bg-[#0a213c] text-white flex items-center justify-between border-b border-slate-800">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-200 text-[11px] font-black uppercase tracking-wider border border-sky-400/30">
                <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                <span>Course Cover</span>
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 text-[11px] font-black uppercase tracking-wider border border-amber-400/30">
                Recommended: 16:9
              </span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Manage Course Cover Image
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Live Preview Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#026fc3]" />
                <span>Preview • Student Course Header (Recommended: 16:9)</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                {coverUrl ? 'Custom 16:9 Cover Active' : 'Branded Fallback Active'}
              </span>
            </div>

            <div className="rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md w-full bg-[#08162b]">
              {coverUrl ? (
                <div className={`relative w-full ${aspectRatio === '1:1' ? 'aspect-square max-w-xs mx-auto' : 'aspect-video'}`}>
                  <img
                    src={coverUrl}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#08162b]/90 via-[#08162b]/25 to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2 pointer-events-none">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded bg-sky-500/80 text-white text-[10px] font-extrabold uppercase tracking-wider mb-1">
                        16:9 Student Header Preview
                      </span>
                      <p className="text-sm font-black text-white drop-shadow line-clamp-1">
                        {course.title}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`w-full ${aspectRatio === '1:1' ? 'aspect-square max-w-xs mx-auto' : 'aspect-video'}`}>
                  <BrandedCourseFallback course={previewCourse} />
                </div>
              )}
            </div>
          </div>

          {/* Aspect Ratio Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Display Aspect Ratio
              </label>
              <span className="text-[11px] font-bold text-[#026fc3]">
                Recommended: 16:9 (1920×1080 WebP)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  aspectRatio === '16:9'
                    ? 'bg-sky-50 border-[#026fc3] text-[#026fc3] shadow-xs'
                    : 'bg-white border-stone-200 text-slate-600 hover:bg-stone-50'
                }`}
              >
                <span>16:9 Widescreen (Recommended)</span>
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('1:1')}
                className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  aspectRatio === '1:1'
                    ? 'bg-sky-50 border-[#026fc3] text-[#026fc3] shadow-xs'
                    : 'bg-white border-stone-200 text-slate-600 hover:bg-stone-50'
                }`}
              >
                <span>1:1 Square (Compact)</span>
              </button>
            </div>
          </div>

          {/* Upload & Remove Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:flex-1 py-3 px-4 bg-sky-50 hover:bg-sky-100 text-[#026fc3] border border-sky-200 rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Optimizing 16:9 WebP & Uploading...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>{coverUrl ? 'Replace Image' : 'Upload Image'}</span>
                </>
              )}
            </button>

            {coverUrl && (
              <button
                type="button"
                onClick={handleRemoveCover}
                className="w-full sm:w-auto py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                title="Remove custom cover and use branded default"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove Custom</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-stone-300 text-slate-700 hover:bg-stone-100 text-xs font-bold cursor-pointer transition-all"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving || uploading}
            onClick={handleSave}
            className="px-6 py-2.5 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Cover...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Cover Changes</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
