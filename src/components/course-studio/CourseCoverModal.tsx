// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: COURSE COVER MANAGEMENT MODAL
// Allows teachers to upload, preview, replace, or remove custom covers.
// Updates existing course records without duplicating courses.
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  UploadCloud,
  Trash2,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Move,
  RotateCcw
} from 'lucide-react';
import { Course } from '@/types/courseStudio';
import { courseStudioService } from '@/services/courseStudioService';
import {
  BrandedCourseFallback,
  parseCoverPosition,
  applyCoverPositionToUrl
} from '@/utils/courseCover';

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
  const initialPos = parseCoverPosition(course.cover_image_url, (course as any)?.cover_object_position);
  const defaultCreepyCover =
    course.id === 'e10c7ee9-0012-4000-8000-000000000012' ||
    course.title?.toLowerCase().includes('creepy legends')
      ? '/images/creepy-legends-cover.jpg'
      : null;

  const [coverUrl, setCoverUrl] = useState<string | null>(
    initialPos.cleanUrl || defaultCreepyCover
  );
  const [coverKey, setCoverKey] = useState<string | null>(course.cover_image_key || null);
  const [posX, setPosX] = useState<number>(initialPos.x);
  const [posY, setPosY] = useState<number>(initialPos.y);
  const [isDragging, setIsDragging] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '1:1'>(
    course.cover_aspect_ratio === '1:1' ? '1:1' : '16:9'
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startX: number;
    startY: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const parsed = parseCoverPosition(course.cover_image_url, (course as any)?.cover_object_position);
      setCoverUrl(parsed.cleanUrl || defaultCreepyCover);
      setCoverKey(course.cover_image_key || null);
      setPosX(parsed.x);
      setPosY(parsed.y);
      setAspectRatio(course.cover_aspect_ratio === '1:1' ? '1:1' : '16:9');
      setError(null);
    }
  }, [isOpen, course.id, course.cover_image_url, course.cover_image_key, course.cover_aspect_ratio]);

  if (!isOpen) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!coverUrl) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore pointer capture error
    }
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: posX,
      startY: posY
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || !previewContainerRef.current) return;
    const rect = previewContainerRef.current.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);

    // Dragging image right moves focal point left (natural pan feel)
    const deltaXPercent = ((e.clientX - dragStartRef.current.clientX) / width) * -100;
    const deltaYPercent = ((e.clientY - dragStartRef.current.clientY) / height) * -100;

    const nextX = Math.max(0, Math.min(100, Math.round(dragStartRef.current.startX + deltaXPercent)));
    const nextY = Math.max(0, Math.min(100, Math.round(dragStartRef.current.startY + deltaYPercent)));
    setPosX(nextX);
    setPosY(nextY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDragging(false);
    dragStartRef.current = null;
  };

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
      setPosX(50);
      setPosY(38);
    } catch (err: any) {
      setError(err.message || 'Failed to upload cover image.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveCover = () => {
    setCoverUrl(defaultCreepyCover);
    setCoverKey(null);
    setPosX(50);
    setPosY(38);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const finalCoverUrl = coverUrl ? applyCoverPositionToUrl(coverUrl, posX, posY) : null;
      const updated = await courseStudioService.updateCourse(course.id, {
        cover_image_url: finalCoverUrl,
        cover_image_key: coverKey,
        cover_aspect_ratio: aspectRatio
      });
      onSuccess({
        ...course,
        ...updated,
        cover_image_url: finalCoverUrl
      });
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

          {/* Live Preview Card with Interactive Drag-to-Reposition */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#026fc3]" />
                <span>Preview • Drag Image to Reposition Focal Point</span>
              </span>
              {coverUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setPosX(50);
                    setPosY(38);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Position ({posX}%, {posY}%)</span>
                </button>
              )}
            </div>

            <div className="rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md w-full bg-[#08162b]">
              {coverUrl ? (
                <div
                  ref={previewContainerRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className={`relative w-full select-none touch-none ${
                    aspectRatio === '1:1' ? 'aspect-square max-w-xs mx-auto' : 'aspect-[16/7] sm:aspect-[16/6.5]'
                  } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                >
                  <img
                    src={coverUrl}
                    alt={course.title}
                    draggable={false}
                    style={{ objectPosition: `${posX}% ${posY}%` }}
                    className="w-full h-full object-cover opacity-90 pointer-events-none select-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#061124]/85 via-[#081b38]/40 to-[#061124]/35 pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#061124]/90 via-transparent to-[#061124]/25 pointer-events-none" />

                  {/* Drag Helper Pill */}
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-slate-950/75 border border-white/20 text-white text-[11px] font-bold flex items-center gap-1.5 backdrop-blur-md pointer-events-none shadow-sm">
                    <Move className="w-3.5 h-3.5 text-sky-300" />
                    <span>Drag ↔ ↕ to reposition</span>
                  </div>

                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2 pointer-events-none">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded bg-sky-500/80 text-white text-[10px] font-extrabold uppercase tracking-wider mb-1">
                        Student Header Preview
                      </span>
                      <p className="text-sm sm:text-base font-black text-white drop-shadow line-clamp-1">
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

            {coverUrl && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                    <span>Horizontal Position (← →)</span>
                    <span className="font-mono text-[#026fc3]">{posX}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={posX}
                    onChange={e => setPosX(Number(e.target.value))}
                    className="w-full accent-[#026fc3] cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                    <span>Vertical Position (↑ ↓)</span>
                    <span className="font-mono text-[#026fc3]">{posY}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={posY}
                    onChange={e => setPosY(Number(e.target.value))}
                    className="w-full accent-[#026fc3] cursor-pointer"
                  />
                </div>
              </div>
            )}
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
