import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  Paintbrush,
  Loader2,
  Image as ImageIcon,
  Upload,
  Trash2,
  LayoutTemplate,
  Monitor
} from 'lucide-react';
import { Classroom } from '@/types/classroom';
import { classroomService } from '@/services/classroomService';
import { CLASSROOM_THEMES, getClassroomTheme } from '@/utils/classroomThemes';
import {
  getSubjectCover,
  DEFAULT_CLASSROOM_HEADER_IMAGE
} from '@/utils/classroomCovers';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export type EditClassroomTab = 'details' | 'card' | 'header';

interface EditClassroomModalProps {
  isOpen: boolean;
  classroom: Classroom | null;
  onClose: () => void;
  onSuccess: (updated: {
    title: string;
    theme: string;
    banner_url?: string | null;
    classroom_header_image?: string | null;
  }) => void;
  initialTab?: EditClassroomTab;
}

export const EditClassroomModal: React.FC<EditClassroomModalProps> = ({
  isOpen,
  classroom,
  onClose,
  onSuccess,
  initialTab = 'details'
}) => {
  const [activeTab, setActiveTab] = useState<EditClassroomTab>(initialTab);
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('theme-blue');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Classroom Card Image (Thumbnail) Management State
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [cardPreviewUrl, setCardPreviewUrl] = useState<string | null>(null);
  const [isCardRemoved, setIsCardRemoved] = useState(false);
  const cardFileInputRef = useRef<HTMLInputElement>(null);

  // 2. Classroom Header Cover (Full-Bleed) Management State
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [headerPreviewUrl, setHeaderPreviewUrl] = useState<string | null>(null);
  const [isHeaderRemoved, setIsHeaderRemoved] = useState(false);
  const headerFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (classroom && isOpen) {
      setTitle(classroom.title || '');
      setTheme(classroom.theme || 'theme-blue');
      setActiveTab(initialTab);

      // Reset Card Image staging
      setCardFile(null);
      setCardPreviewUrl(null);
      setIsCardRemoved(false);

      // Reset Header Cover staging
      setHeaderFile(null);
      setHeaderPreviewUrl(null);
      setIsHeaderRemoved(false);

      setErrorMessage(null);
    }
  }, [classroom, isOpen, initialTab]);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (cardPreviewUrl && cardPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(cardPreviewUrl);
      }
      if (headerPreviewUrl && headerPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(headerPreviewUrl);
      }
    };
  }, [cardPreviewUrl, headerPreviewUrl]);

  if (!isOpen || !classroom) return null;

  const activeThemeConfig = getClassroomTheme(theme);
  const defaultSubjectCover = getSubjectCover(classroom.subject).imageUrl;

  // Active Card Display URL
  const currentCardDisplay = (() => {
    if (cardPreviewUrl) return cardPreviewUrl;
    if (!isCardRemoved && classroom.banner_url) return classroom.banner_url;
    return defaultSubjectCover;
  })();
  const hasCustomCard = Boolean(!isCardRemoved && (cardPreviewUrl || classroom.banner_url));

  // Active Header Display URL
  const currentHeaderDisplay = (() => {
    if (headerPreviewUrl) return headerPreviewUrl;
    if (!isHeaderRemoved && classroom.classroom_header_image) return classroom.classroom_header_image;
    return DEFAULT_CLASSROOM_HEADER_IMAGE;
  })();
  const hasCustomHeader = Boolean(!isHeaderRemoved && (headerPreviewUrl || classroom.classroom_header_image));

  // --- Handlers for Card Image ---
  const handleCardFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mime = (file.type || '').toLowerCase();
    const isAllowedFormat =
      ALLOWED_IMAGE_FORMATS.includes(mime) || /\.(jpe?g|png|webp)$/i.test(file.name);

    if (!isAllowedFormat) {
      setErrorMessage('Card image must be a JPG, PNG, or WebP file.');
      if (cardFileInputRef.current) cardFileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrorMessage('Card image must be smaller than 5 MB.');
      if (cardFileInputRef.current) cardFileInputRef.current.value = '';
      return;
    }

    if (cardPreviewUrl && cardPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(cardPreviewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setCardFile(file);
    setCardPreviewUrl(objectUrl);
    setIsCardRemoved(false);
    setErrorMessage(null);
  };

  const handleRemoveCard = () => {
    if (cardPreviewUrl && cardPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(cardPreviewUrl);
    }
    setCardFile(null);
    setCardPreviewUrl(null);
    setIsCardRemoved(true);
    setErrorMessage(null);
    if (cardFileInputRef.current) cardFileInputRef.current.value = '';
  };

  // --- Handlers for Header Image ---
  const handleHeaderFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mime = (file.type || '').toLowerCase();
    const isAllowedFormat =
      ALLOWED_IMAGE_FORMATS.includes(mime) || /\.(jpe?g|png|webp)$/i.test(file.name);

    if (!isAllowedFormat) {
      setErrorMessage('Header image must be a JPG, PNG, or WebP file.');
      if (headerFileInputRef.current) headerFileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrorMessage('Header image must be smaller than 5 MB.');
      if (headerFileInputRef.current) headerFileInputRef.current.value = '';
      return;
    }

    if (headerPreviewUrl && headerPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(headerPreviewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setHeaderFile(file);
    setHeaderPreviewUrl(objectUrl);
    setIsHeaderRemoved(false);
    setErrorMessage(null);
  };

  const handleRemoveHeader = () => {
    if (headerPreviewUrl && headerPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(headerPreviewUrl);
    }
    setHeaderFile(null);
    setHeaderPreviewUrl(null);
    setIsHeaderRemoved(true);
    setErrorMessage(null);
    if (headerFileInputRef.current) headerFileInputRef.current.value = '';
  };

  // --- Submit Handler ---
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
      let finalHeaderUrl: string | null = classroom.classroom_header_image || null;

      // 1. Process Card Image changes
      if (cardFile) {
        const uploadRes = await classroomService.uploadClassroomCover(classroom.id, cardFile);
        if (uploadRes.error || !uploadRes.publicUrl) {
          setErrorMessage(uploadRes.error || 'Card image could not be uploaded. Please try again.');
          setIsSubmitting(false);
          return;
        }
        finalBannerUrl = uploadRes.publicUrl;
        if (classroom.banner_url && classroom.banner_url !== finalBannerUrl) {
          classroomService.cleanupClassroomCover(classroom.banner_url);
        }
      } else if (isCardRemoved) {
        finalBannerUrl = null;
        if (classroom.banner_url) {
          classroomService.cleanupClassroomCover(classroom.banner_url);
        }
      }

      // 2. Process Header Cover changes independently
      if (headerFile) {
        const headerUploadRes = await classroomService.uploadClassroomHeaderImage(classroom.id, headerFile);
        if (headerUploadRes.error || !headerUploadRes.publicUrl) {
          setErrorMessage(headerUploadRes.error || 'Header image could not be uploaded. Please try again.');
          setIsSubmitting(false);
          return;
        }
        finalHeaderUrl = headerUploadRes.publicUrl;
        if (classroom.classroom_header_image && classroom.classroom_header_image !== finalHeaderUrl) {
          classroomService.cleanupClassroomHeaderImage(classroom.classroom_header_image);
        }
      } else if (isHeaderRemoved) {
        finalHeaderUrl = null;
        if (classroom.classroom_header_image) {
          classroomService.cleanupClassroomHeaderImage(classroom.classroom_header_image);
        }
      }

      // 3. Update database record
      const res = await classroomService.updateClassroom(classroom.id, {
        title: trimmedTitle,
        theme,
        banner_url: finalBannerUrl,
        classroom_header_image: finalHeaderUrl
      });

      if (res.error) {
        setErrorMessage(res.error || 'Classroom changes could not be saved. Please try again.');
        setIsSubmitting(false);
        return;
      }

      onSuccess({
        title: trimmedTitle,
        theme,
        banner_url: finalBannerUrl,
        classroom_header_image: finalHeaderUrl
      });
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
        className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col p-6 sm:p-7 shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200 text-slate-900"
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
                Customize appearance, card thumbnail, and full-bleed header cover
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

        {/* Tab Switcher */}
        <div className="pt-3 pb-1 border-b border-slate-100 flex items-center gap-1.5 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'details'
                ? 'bg-[#026fc3] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>Details & Color</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('card')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'card'
                ? 'bg-[#026fc3] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            <span>Card Image</span>
            {hasCustomCard && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('header')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'header'
                ? 'bg-[#026fc3] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Header Cover</span>
            {hasCustomHeader && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold shrink-0">
            {errorMessage}
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {/* TAB 1: DETAILS & COLOR */}
          {activeTab === 'details' && (
            <div className="space-y-4 animate-in fade-in duration-150">
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

              {/* Subject & Grade Metadata (Readonly reminder) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Subject
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {classroom.subject || 'General'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Grade
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {classroom.grade || 'All Grades'}
                  </span>
                </div>
              </div>

              {/* Classroom Colour Swatches */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-2">
                  Visual Theme
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                  {CLASSROOM_THEMES.map((t) => {
                    const isSelected = theme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTheme(t.id)}
                        className={`h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
                          isSelected
                            ? 'ring-3 ring-offset-2 scale-102 shadow-sm'
                            : 'hover:scale-105 shadow-2xs hover:shadow-xs opacity-85 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: t.hex,
                          // @ts-ignore
                          '--tw-ring-color': t.hex,
                          '--tw-ring-offset-color': '#ffffff'
                        }}
                        title={t.name}
                      >
                        {isSelected && (
                          <Check className="w-5 h-5 text-white stroke-[3] drop-shadow-xs" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CLASSROOM CARD IMAGE (THUMBNAIL) */}
          {activeTab === 'card' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800">
                    Classroom Card Thumbnail
                  </label>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Displayed on classroom directory cards and dashboards
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  JPG, PNG, WebP up to 5 MB
                </span>
              </div>

              {/* Hidden File Input for Card */}
              <input
                type="file"
                ref={cardFileInputRef}
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCardFileSelect}
                className="hidden"
                aria-label="Upload custom card image"
              />

              {/* Card Preview Container */}
              <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs group">
                <img
                  src={currentCardDisplay}
                  alt="Classroom Card Preview"
                  className="w-full h-full object-cover transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.src = defaultSubjectCover;
                  }}
                />

                {/* Status Badge */}
                <div className="absolute top-2.5 left-2.5 z-10">
                  {cardFile ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs backdrop-blur-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>New Staged Card Image</span>
                    </span>
                  ) : hasCustomCard ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-[10px] font-black uppercase tracking-wider shadow-xs backdrop-blur-xs">
                      <ImageIcon className="w-3 h-3" />
                      <span>Custom Card Image</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/60 text-white text-[10px] font-black uppercase tracking-wider shadow-xs backdrop-blur-xs">
                      <ImageIcon className="w-3 h-3" />
                      <span>Default Subject Cover</span>
                    </span>
                  )}
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-4">
                  <button
                    type="button"
                    onClick={() => cardFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold shadow-md cursor-pointer transition-transform active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#026fc3]" />
                    <span>{hasCustomCard || cardFile ? 'Change Card Image' : 'Upload Card Image'}</span>
                  </button>

                  {(hasCustomCard || cardFile) && (
                    <button
                      type="button"
                      onClick={handleRemoveCard}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer transition-transform active:scale-95"
                      title="Reset to subject default"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Direct Buttons below preview */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => cardFileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#026fc3]" />
                  <span>{hasCustomCard || cardFile ? 'Change Card Image' : 'Upload Card Image'}</span>
                </button>

                {(hasCustomCard || cardFile) && (
                  <button
                    type="button"
                    onClick={handleRemoveCard}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Reset to Subject Default</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CLASSROOM HEADER COVER (FULL-BLEED) */}
          {activeTab === 'header' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800">
                    Classroom Header Cover (Full-Bleed)
                  </label>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Displayed across the entire header of your classroom detail page
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  JPG, PNG, WebP up to 5 MB
                </span>
              </div>

              {/* Hidden File Input for Header */}
              <input
                type="file"
                ref={headerFileInputRef}
                accept="image/jpeg,image/png,image/webp"
                onChange={handleHeaderFileSelect}
                className="hidden"
                aria-label="Upload custom header image"
              />

              {/* Header Preview Container — Panoramic Header Mockup */}
              <div className="relative w-full aspect-[21/9] sm:aspect-[2.4/1] rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-2xs group">
                <img
                  src={currentHeaderDisplay}
                  alt="Classroom Header Preview"
                  className="w-full h-full object-cover object-center transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_CLASSROOM_HEADER_IMAGE;
                  }}
                />

                {/* Subtle Mockup Readability Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/40 pointer-events-none" />

                {/* Header Mockup Text Preview */}
                <div className="absolute bottom-3 left-3 right-3 z-10 pointer-events-none">
                  <div className="bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/60 shadow-xs inline-block">
                    <span className="text-xs font-black text-slate-900 block truncate max-w-[280px]">
                      {title || classroom.title}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      Header preview with readable text overlay
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="absolute top-2.5 left-2.5 z-10">
                  {headerFile ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs backdrop-blur-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>New Staged Header</span>
                    </span>
                  ) : hasCustomHeader ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-[10px] font-black uppercase tracking-wider shadow-xs backdrop-blur-xs">
                      <Monitor className="w-3 h-3" />
                      <span>Custom Header</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-900/80 text-white text-[10px] font-black uppercase tracking-wider shadow-xs backdrop-blur-xs">
                      <Monitor className="w-3 h-3" />
                      <span>EdTechra Default Header</span>
                    </span>
                  )}
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-4 z-20">
                  <button
                    type="button"
                    onClick={() => headerFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold shadow-md cursor-pointer transition-transform active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#026fc3]" />
                    <span>{hasCustomHeader || headerFile ? 'Change Header Image' : 'Upload Header Image'}</span>
                  </button>

                  {(hasCustomHeader || headerFile) && (
                    <button
                      type="button"
                      onClick={handleRemoveHeader}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer transition-transform active:scale-95"
                      title="Reset to default header"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Direct Buttons below preview */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => headerFileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#026fc3]" />
                  <span>{hasCustomHeader || headerFile ? 'Change Header Image' : 'Upload Header Image'}</span>
                </button>

                {(hasCustomHeader || headerFile) && (
                  <button
                    type="button"
                    onClick={handleRemoveHeader}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Reset to Default Header</span>
                  </button>
                )}
              </div>
            </div>
          )}

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
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
