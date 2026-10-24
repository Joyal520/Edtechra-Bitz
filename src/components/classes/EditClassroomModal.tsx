import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Paintbrush, Loader2, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';
import { Classroom } from '@/types/classroom';
import { classroomService } from '@/services/classroomService';
import { CLASSROOM_THEMES, getClassroomTheme } from '@/utils/classroomThemes';
import { getSubjectCover } from '@/utils/classroomCovers';

const MAX_COVER_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

interface EditClassroomModalProps {
  isOpen: boolean;
  classroom: Classroom | null;
  onClose: () => void;
  onSuccess: (updated: { title: string; theme: string; banner_url?: string | null }) => void;
}

export const EditClassroomModal: React.FC<EditClassroomModalProps> = ({
  isOpen,
  classroom,
  onClose,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('theme-blue');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cover image management state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCoverRemoved, setIsCoverRemoved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (classroom && isOpen) {
      setTitle(classroom.title || '');
      setTheme(classroom.theme || 'theme-blue');
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsCoverRemoved(false);
      setErrorMessage(null);
    }
  }, [classroom, isOpen]);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen || !classroom) return null;

  const activeThemeConfig = getClassroomTheme(theme);
  const defaultSubjectCover = getSubjectCover(classroom.subject).imageUrl;
  
  // Calculate active cover display URL
  const currentCoverDisplay = (() => {
    if (isCoverRemoved) return defaultSubjectCover;
    if (previewUrl) return previewUrl;
    if (classroom.banner_url) return classroom.banner_url;
    return defaultSubjectCover;
  })();

  const hasCustomCover = Boolean((!isCoverRemoved && (previewUrl || classroom.banner_url)));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validate MIME type
    const mime = (file.type || '').toLowerCase();
    const isAllowedFormat = ALLOWED_IMAGE_FORMATS.includes(mime) || 
      /\.(jpe?g|png|webp)$/i.test(file.name);

    if (!isAllowedFormat) {
      setErrorMessage('Cover image must be a JPG, PNG, or WebP file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Validate maximum file size (5 MB limit)
    if (file.size > MAX_COVER_SIZE_BYTES) {
      setErrorMessage('Cover image must be smaller than 5 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Revoke previous blob if any
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setIsCoverRemoved(false);
    setErrorMessage(null);
  };

  const handleRemoveCover = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsCoverRemoved(true);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setErrorMessage('Please enter a classroom name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let finalBannerUrl: string | null = classroom.banner_url || null;

      // 1. Upload new cover image to Cloudflare R2 if selected
      if (selectedFile) {
        const uploadRes = await classroomService.uploadClassroomCover(classroom.id, selectedFile);
        if (uploadRes.error || !uploadRes.publicUrl) {
          setErrorMessage(uploadRes.error || 'Cover image could not be uploaded. Please try again.');
          setIsSubmitting(false);
          return;
        }

        finalBannerUrl = uploadRes.publicUrl;

        // Cleanup old custom cover in background safely
        if (classroom.banner_url && classroom.banner_url !== finalBannerUrl) {
          classroomService.cleanupClassroomCover(classroom.banner_url);
        }
      } else if (isCoverRemoved) {
        finalBannerUrl = null;
        if (classroom.banner_url) {
          classroomService.cleanupClassroomCover(classroom.banner_url);
        }
      }

      // 2. Update classroom in database
      const res = await classroomService.updateClassroom(classroom.id, {
        title: trimmedTitle,
        theme,
        banner_url: finalBannerUrl
      });

      if (res.error) {
        setErrorMessage(res.error || 'Classroom changes could not be saved. Please try again.');
        setIsSubmitting(false);
        return;
      }

      onSuccess({ title: trimmedTitle, theme, banner_url: finalBannerUrl });
      onClose();
    } catch (err: any) {
      console.error('[EditClassroomModal] Save error:', err);
      setErrorMessage(err.message || 'Classroom changes could not be saved. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col p-6 sm:p-7 shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200 text-slate-900"
        data-light-surface="true"
        data-theme-mode="light"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-2xs transition-colors"
              style={{
                backgroundColor: `${activeThemeConfig.hex}15`,
                borderColor: `${activeThemeConfig.hex}30`,
                color: activeThemeConfig.hex
              }}
            >
              <Paintbrush className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Edit Classroom
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                Update name, visual colour, and cover image
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold shrink-0">
            {errorMessage}
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5 overflow-y-auto pr-1 flex-1">
          {/* Classroom Name Input */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
              Classroom Name *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. English Grade 8"
              className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-300 focus:border-[#026fc3] rounded-2xl text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3]/20 transition-all shadow-2xs select-text"
              autoFocus
            />
          </div>

          {/* Classroom Colour Swatches */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-extrabold text-slate-800">
                Classroom Colour
              </label>
              <span
                className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                style={{
                  backgroundColor: `${activeThemeConfig.hex}15`,
                  color: activeThemeConfig.hex
                }}
              >
                {activeThemeConfig.name}
              </span>
            </div>

            {/* Swatches Grid */}
            <div className="grid grid-cols-5 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              {CLASSROOM_THEMES.map((t) => {
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    title={t.name}
                    aria-label={`Select ${t.name} theme`}
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'ring-3 ring-offset-2 scale-105 shadow-md'
                        : 'hover:scale-105 shadow-2xs hover:shadow-xs opacity-85 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: t.hex,
                      // @ts-ignore
                      '--tw-ring-color': t.hex,
                      '--tw-ring-offset-color': '#ffffff'
                    }}
                  >
                    {isSelected && (
                      <Check className="w-5 h-5 text-white stroke-[3] drop-shadow-xs" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cover Image Section */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-slate-800">
                Cover Image
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                JPG, PNG, WebP up to 5 MB
              </span>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Upload custom cover image"
            />

            {/* Cover Preview Container */}
            <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs group">
              <img
                src={currentCoverDisplay}
                alt="Classroom Cover Preview"
                className="w-full h-full object-cover transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.src = '/images/classroom/covers/general.jpg';
                }}
              />

              {/* Status Badge */}
              <div className="absolute top-2.5 left-2.5 z-10">
                {selectedFile ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs backdrop-blur-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>New Staged Cover</span>
                  </span>
                ) : hasCustomCover ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-[10px] font-black uppercase tracking-wider shadow-xs backdrop-blur-xs">
                    <ImageIcon className="w-3 h-3" />
                    <span>Custom Cover</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/60 text-white text-[10px] font-black uppercase tracking-wider shadow-xs backdrop-blur-xs">
                    <ImageIcon className="w-3 h-3" />
                    <span>Default Cover</span>
                  </span>
                )}
              </div>

              {/* Hover Overlay with Action Buttons */}
              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold shadow-md cursor-pointer transition-transform active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5 text-[#026fc3]" />
                  <span>{hasCustomCover || selectedFile ? 'Change Cover' : 'Upload Cover'}</span>
                </button>

                {(hasCustomCover || selectedFile) && (
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer transition-transform active:scale-95"
                    title="Remove custom cover"
                    aria-label="Remove custom cover"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Action Button below preview for touch devices */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#026fc3]" />
                <span>{hasCustomCover || selectedFile ? 'Change Cover Image' : 'Upload Cover Image'}</span>
              </button>

              {(hasCustomCover || selectedFile) && (
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset to Default</span>
                </button>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black text-white shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              style={{
                backgroundColor: activeThemeConfig.hex
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
