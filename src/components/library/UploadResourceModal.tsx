import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  Presentation,
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  ArrowLeft,
  ExternalLink,
  Laptop,
  Smartphone,
  Trash2,
  RefreshCw,
  Sparkles,
  Check
} from 'lucide-react';
import { LibraryResource, LibraryFileType } from '@/types/library';
import { libraryService } from '@/services/libraryService';
import {
  SUBJECT_OPTIONS,
  CATEGORY_OPTIONS,
  GRADE_OPTIONS
} from '@/components/library/LibraryFilters';
import { extractPptxCover } from '@/utils/pptxParser';
import {
  getDefaultCoverDataUri,
  validatePdfFile,
  validatePresentationFile,
  validateHtmlFile,
  validateWebUrl
} from '@/utils/libraryCovers';
import { useAuth } from '@/context/AuthContext';

interface UploadResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (resource: LibraryResource, action: 'view' | 'close') => void;
}

type WebSourceType = 'html_upload' | 'external_url';
type CoverMode = 'default' | 'custom';
type ViewportMode = 'desktop' | 'mobile';

export const UploadResourceModal: React.FC<UploadResourceModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user, profile } = useAuth();

  // Step state: 'form' | 'preview_web' | 'success'
  const [modalStep, setModalStep] = useState<'form' | 'preview_web' | 'success'>('form');

  // Resource Type
  const [resourceType, setResourceType] = useState<LibraryFileType>('pdf');

  // Common Metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState(SUBJECT_OPTIONS[1] || 'English & Grammar');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[1] || 'Study Guide');
  const [gradeLevel, setGradeLevel] = useState(GRADE_OPTIONS[2] || 'Middle School (Grades 6-8)');

  // Cover Image
  const [coverMode, setCoverMode] = useState<CoverMode>('default');
  const [customCoverFile, setCustomCoverFile] = useState<File | null>(null);
  const [customCoverPreview, setCustomCoverPreview] = useState<string | null>(null);

  // File Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileValidationSuccess, setFileValidationSuccess] = useState(false);
  const [htmlBlobUrl, setHtmlBlobUrl] = useState<string | null>(null);

  // Web / Blog specific
  const [webSourceType, setWebSourceType] = useState<WebSourceType>('html_upload');
  const [webUrl, setWebUrl] = useState('');
  const [urlInfo, setUrlInfo] = useState<{
    valid: boolean;
    normalizedUrl?: string;
    isGitHub?: boolean;
    isGitHubRepo?: boolean;
    message?: string;
  }>({ valid: false });

  // Web Preview viewport
  const [previewViewport, setPreviewViewport] = useState<ViewportMode>('desktop');

  // Submission & Progress
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Created resource for success screen
  const [createdResource, setCreatedResource] = useState<LibraryResource | null>(null);

  // Drag & drop highlight
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setModalStep('form');
      setResourceType('pdf');
      setTitle('');
      setDescription('');
      setSubject(SUBJECT_OPTIONS[1] || 'English & Grammar');
      setCategory('Study Guide');
      setGradeLevel(GRADE_OPTIONS[2] || 'Middle School (Grades 6-8)');
      setCoverMode('default');
      setCustomCoverFile(null);
      setCustomCoverPreview(null);
      setSelectedFile(null);
      setFileValidationSuccess(false);
      setHtmlBlobUrl(null);
      setWebSourceType('html_upload');
      setWebUrl('');
      setUrlInfo({ valid: false });
      setPreviewViewport('desktop');
      setIsSubmitting(false);
      setUploadProgress(0);
      setProgressStatus('');
      setFormError(null);
      setCreatedResource(null);
    }
  }, [isOpen]);

  // Adjust default category when resource type changes
  useEffect(() => {
    if (resourceType === 'pptx') {
      setCategory('Presentation');
    } else if (resourceType === 'web_blog') {
      setCategory('Web / Blogs');
    } else {
      setCategory('Study Guide');
    }
    // Clear selected file when switching type to prevent mismatch
    setSelectedFile(null);
    setFileValidationSuccess(false);
    setFormError(null);
  }, [resourceType]);

  // Clean up HTML blob URL on unmount
  useEffect(() => {
    return () => {
      if (htmlBlobUrl) {
        URL.revokeObjectURL(htmlBlobUrl);
      }
    };
  }, [htmlBlobUrl]);

  if (!isOpen) return null;

  // Active default cover data URI
  const defaultCoverUri = getDefaultCoverDataUri(resourceType, title);
  const effectiveCoverPreview = coverMode === 'custom' && customCoverPreview
    ? customCoverPreview
    : defaultCoverUri;

  // --------------------------------------------------------------------------
  // File Validation & Handling
  // --------------------------------------------------------------------------

  const handleProcessFile = async (file: File) => {
    setFormError(null);
    setFileValidationSuccess(false);

    if (resourceType === 'pdf') {
      const result = await validatePdfFile(file);
      if (!result.valid) {
        setFormError(result.error || 'Invalid PDF file. Please select a genuine PDF document.');
        return;
      }
      setSelectedFile(file);
      setFileValidationSuccess(true);
      if (!title.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    } else if (resourceType === 'pptx') {
      const result = await validatePresentationFile(file);
      if (!result.valid) {
        setFormError(result.error || 'Invalid presentation file. Please upload a PowerPoint (.pptx) file.');
        return;
      }
      setSelectedFile(file);
      setFileValidationSuccess(true);
      if (!title.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }

      // Try auto slide-cover extraction if user has not uploaded a custom cover
      if (coverMode === 'default' && file.name.toLowerCase().endsWith('.pptx')) {
        extractPptxCover(file, file.name)
          .then((extracted) => {
            if (extracted?.file) {
              setCustomCoverFile(extracted.file);
              setCustomCoverPreview(extracted.url);
              setCoverMode('custom');
            }
          })
          .catch((err) => {
            console.warn('[UploadResourceModal] Auto slide cover extraction notice:', err);
          });
      }
    } else if (resourceType === 'web_blog') {
      const result = await validateHtmlFile(file);
      if (!result.valid) {
        setFormError(result.error || 'Invalid HTML file. Please upload a valid .html learning resource.');
        return;
      }
      const text = await file.text();
      setSelectedFile(file);
      if (htmlBlobUrl) URL.revokeObjectURL(htmlBlobUrl);
      const newBlobUrl = URL.createObjectURL(new Blob([text], { type: 'text/html' }));
      setHtmlBlobUrl(newBlobUrl);
      setFileValidationSuccess(true);
      if (!title.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // --------------------------------------------------------------------------
  // Cover Handling
  // --------------------------------------------------------------------------

  const handleCoverInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Cover image must be a valid image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFormError('Cover image exceeds the 10 MB limit.');
      return;
    }

    setCustomCoverFile(file);
    setCustomCoverPreview(URL.createObjectURL(file));
    setCoverMode('custom');
    setFormError(null);
  };

  // --------------------------------------------------------------------------
  // URL Input Handling
  // --------------------------------------------------------------------------

  const handleWebUrlChange = (val: string) => {
    setWebUrl(val);
    if (!val.trim()) {
      setUrlInfo({ valid: false });
      return;
    }
    const valResult = validateWebUrl(val);
    setUrlInfo(valResult);
  };

  // --------------------------------------------------------------------------
  // Form Validation
  // --------------------------------------------------------------------------

  const isFormValid = (): boolean => {
    if (!title.trim()) return false;

    if (resourceType === 'pdf' || resourceType === 'pptx') {
      return Boolean(selectedFile && fileValidationSuccess);
    }

    if (resourceType === 'web_blog') {
      if (webSourceType === 'html_upload') {
        return Boolean(selectedFile && fileValidationSuccess);
      } else {
        return Boolean(webUrl.trim() && urlInfo.valid);
      }
    }

    return false;
  };

  // --------------------------------------------------------------------------
  // Publish Submission
  // --------------------------------------------------------------------------

  const handlePublish = async () => {
    if (!isFormValid()) {
      setFormError('Please fill in all required fields and provide a valid resource file or URL.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(5);
    setProgressStatus('Preparing upload...');
    setFormError(null);

    try {
      let finalFileUrl = '';
      let finalFileKey: string | null = null;
      let finalFileSize = 0;
      let finalCoverUrl: string | null = null;
      let finalCoverKey: string | null = null;

      // 1. Upload Cover Image if user selected a custom image
      if (coverMode === 'custom' && customCoverFile) {
        setProgressStatus('Uploading cover image to Cloudflare R2...');
        const coverRes = await libraryService.uploadFileToR2(customCoverFile, true);
        finalCoverUrl = coverRes.publicUrl;
        finalCoverKey = coverRes.objectKey;
      } else {
        // Use default SVG cover data URI directly
        finalCoverUrl = defaultCoverUri;
      }

      // 2. Upload Document or set External URL
      if (resourceType === 'web_blog' && webSourceType === 'external_url') {
        finalFileUrl = urlInfo.normalizedUrl || webUrl.trim();
        finalFileKey = null;
        finalFileSize = 0;
        setUploadProgress(60);
      } else if (selectedFile) {
        setProgressStatus(
          `Uploading ${resourceType === 'web_blog' ? 'HTML lesson' : resourceType.toUpperCase()} file to Cloudflare R2...`
        );
        const fileRes = await libraryService.uploadFileToR2(
          selectedFile,
          false,
          (pct) => setUploadProgress(pct)
        );
        finalFileUrl = fileRes.publicUrl;
        finalFileKey = fileRes.objectKey;
        finalFileSize = selectedFile.size;
      }

      // 3. Save Record to Supabase
      setProgressStatus('Saving resource metadata to EdTechra catalog...');
      setUploadProgress(95);

      const authorName = profile?.full_name || user?.user_metadata?.full_name || 'EdTechra Educator';

      const createRes = await libraryService.createResource({
        title: title.trim(),
        description: description.trim(),
        subject: subject.trim(),
        category: category.trim(),
        grade_level: gradeLevel.trim(),
        file_type: resourceType,
        file_url: finalFileUrl,
        file_key: finalFileKey,
        file_size: finalFileSize,
        cover_image_url: finalCoverUrl,
        cover_image_key: finalCoverKey,
        author: authorName,
        published: true // Instant publishing
      });

      if (createRes.error || !createRes.data) {
        throw new Error(createRes.error || 'Failed to save resource in database.');
      }

      setUploadProgress(100);
      setProgressStatus('Resource published successfully!');
      setCreatedResource(createRes.data);
      setModalStep('success');
    } catch (err: any) {
      console.error('[UploadResourceModal] Publish error:', err);
      setFormError(err.message || 'An unexpected error occurred while publishing the resource.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  // --------------------------------------------------------------------------
  // RENDER: PREVIEW VIEW FOR WEB / BLOG
  // --------------------------------------------------------------------------

  if (modalStep === 'preview_web') {
    const previewSrc = webSourceType === 'html_upload' ? htmlBlobUrl : urlInfo.normalizedUrl || webUrl;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
        <div className="bg-slate-900 text-white w-full h-full sm:rounded-3xl sm:max-h-[94vh] flex flex-col shadow-2xl border border-slate-800 overflow-hidden">
          
          {/* Preview Header */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setModalStep('form')}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Back to Edit Form"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                    Preview
                  </span>
                  <h3 className="text-xs sm:text-sm font-black text-white truncate max-w-[200px] sm:max-w-md">
                    {title || 'Web Resource Preview'}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {webSourceType === 'html_upload' ? selectedFile?.name : previewSrc}
                </p>
              </div>
            </div>

            {/* Viewport switchers & Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setPreviewViewport('desktop')}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    previewViewport === 'desktop' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Desktop View"
                >
                  <Laptop className="w-4 h-4" />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport('mobile')}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    previewViewport === 'mobile' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Mobile View"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Mobile</span>
                </button>
              </div>

              {previewSrc && (
                <a
                  href={previewSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Open in new window"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <button
                type="button"
                onClick={handlePublish}
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Publish Resource</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Iframe Viewport Area */}
          <div className="flex-1 bg-slate-950 p-2 sm:p-6 overflow-hidden flex items-center justify-center">
            <div
              className={`h-full transition-all duration-300 rounded-2xl overflow-hidden shadow-2xl bg-white border border-slate-700 flex flex-col ${
                previewViewport === 'mobile' ? 'w-[375px] max-w-full' : 'w-full'
              }`}
            >
              {urlInfo.isGitHubRepo ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-900 text-white space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-slate-800 text-emerald-400 flex items-center justify-center shadow-inner">
                    <Globe className="w-8 h-8" />
                  </div>
                  <div className="space-y-2 max-w-md">
                    <h4 className="text-base font-black">GitHub Repository Resource</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      GitHub repositories enforce strict CSP/iframe restrictions. Students will open this resource safely in a dedicated tab.
                    </p>
                  </div>
                  <a
                    href={previewSrc || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#026fc3] hover:bg-[#025ea6] text-white rounded-xl text-xs font-black flex items-center gap-2"
                  >
                    <span>Test Link in New Tab</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : previewSrc ? (
                <iframe
                  src={previewSrc}
                  title="Resource Preview"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  className="w-full h-full border-0 bg-white"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                  No preview available
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: SUCCESS SCREEN
  // --------------------------------------------------------------------------

  if (modalStep === 'success' && createdResource) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white text-slate-900 rounded-3xl w-full max-w-md p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 space-y-5">
          
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shadow-xs">
            <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-black text-slate-900">Resource Uploaded Successfully</h3>
            <p className="text-xs text-slate-500 font-semibold max-w-xs mx-auto">
              Your educational resource is now published and available to the EdTechra community.
            </p>
          </div>

          {/* Mini preview card */}
          <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center gap-3 text-left">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-200">
              <img
                src={createdResource.cover_image_url || defaultCoverUri}
                alt={createdResource.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-black uppercase text-slate-700">
                {createdResource.file_type.toUpperCase()}
              </span>
              <h4 className="text-xs font-black text-slate-900 truncate mt-1">
                {createdResource.title}
              </h4>
              <p className="text-[11px] text-slate-500 truncate font-medium">
                {createdResource.subject} • {createdResource.grade_level}
              </p>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="w-full flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                onSuccess(createdResource, 'view');
                onClose();
              }}
              className="flex-1 py-3 px-4 bg-[#026fc3] hover:bg-[#025ea6] text-white rounded-2xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>View Resource</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSuccess(createdResource, 'close');
                // Reset for another upload
                setModalStep('form');
                setTitle('');
                setDescription('');
                setSelectedFile(null);
                setFileValidationSuccess(false);
                setWebUrl('');
                setCoverMode('default');
                setCustomCoverFile(null);
                setCustomCoverPreview(null);
              }}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Upload Another</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: MAIN UPLOAD FORM
  // --------------------------------------------------------------------------

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white text-slate-900 w-full h-full sm:h-auto sm:max-h-[92vh] sm:rounded-3xl sm:max-w-3xl flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* =================================================================== */}
        {/* MODAL HEADER                                                        */}
        {/* =================================================================== */}
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="space-y-0.5">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Upload a Resource
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Share a useful learning resource with the EdTechra community.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
            title="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* =================================================================== */}
        {/* SCROLLABLE FORM BODY                                                */}
        {/* =================================================================== */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
          
          {/* Error Banner */}
          {formError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold">{formError}</div>
              <button
                type="button"
                onClick={() => setFormError(null)}
                className="text-rose-500 hover:text-rose-800 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* 1. THREE LARGE SELECTABLE RESOURCE TYPES                           */}
          {/* ----------------------------------------------------------------- */}
          <div className="space-y-2.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500">
              Select Resource Type
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Card 1: PDF */}
              <button
                type="button"
                onClick={() => setResourceType('pdf')}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                  resourceType === 'pdf'
                    ? 'border-rose-500 bg-rose-50/50 shadow-md ring-2 ring-rose-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      resourceType === 'pdf'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  {resourceType === 'pdf' && (
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">PDF</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
                    Upload a PDF learning resource
                  </p>
                </div>
              </button>

              {/* Card 2: Presentation */}
              <button
                type="button"
                onClick={() => setResourceType('pptx')}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                  resourceType === 'pptx'
                    ? 'border-amber-500 bg-amber-50/50 shadow-md ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      resourceType === 'pptx'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Presentation className="w-5 h-5" />
                  </div>
                  {resourceType === 'pptx' && (
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Presentation</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
                    Upload a PowerPoint presentation
                  </p>
                </div>
              </button>

              {/* Card 3: Web / Blog */}
              <button
                type="button"
                onClick={() => setResourceType('web_blog')}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                  resourceType === 'web_blog'
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-2 ring-emerald-600/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      resourceType === 'web_blog'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Globe className="w-5 h-5" />
                  </div>
                  {resourceType === 'web_blog' && (
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Web / Blog</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
                    Upload an interactive HTML resource or web link
                  </p>
                </div>
              </button>

            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* 2. RESOURCE UPLOAD AREA ACCORDING TO TYPE                          */}
          {/* ----------------------------------------------------------------- */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                {resourceType === 'pdf'
                  ? 'Upload PDF Document'
                  : resourceType === 'pptx'
                  ? 'Upload Presentation Deck'
                  : 'Web / Blog Learning Source'}
              </label>
              {resourceType === 'web_blog' && (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setWebSourceType('html_upload')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      webSourceType === 'html_upload'
                        ? 'bg-white text-slate-900 shadow-2xs font-black'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Upload HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setWebSourceType('external_url')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      webSourceType === 'external_url'
                        ? 'bg-white text-slate-900 shadow-2xs font-black'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Add URL
                  </button>
                </div>
              )}
            </div>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={
                resourceType === 'pdf'
                  ? '.pdf,application/pdf'
                  : resourceType === 'pptx'
                  ? '.pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation'
                  : '.html,.htm,text/html'
              }
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* WEB URL INPUT TAB */}
            {resourceType === 'web_blog' && webSourceType === 'external_url' ? (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-900">Web URL</h4>
                  <p className="text-xs text-slate-500">
                    Paste an interactive web lesson, blog, or GitHub link.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={webUrl}
                      onChange={(e) => handleWebUrlChange(e.target.value)}
                      placeholder="https://example.com/lesson or https://github.com/..."
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  {webUrl.trim() && (
                    <button
                      type="button"
                      onClick={() => setModalStep('preview_web')}
                      className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shrink-0 flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                  )}
                </div>

                {urlInfo.message && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200/80 font-medium">
                    {urlInfo.message}
                  </p>
                )}
              </div>
            ) : (
              /* DRAG & DROP ZONE FOR PDF, PPTX, OR HTML */
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-[#026fc3] bg-sky-50/50 scale-[0.99]'
                    : fileValidationSuccess && selectedFile
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-50'
                }`}
              >
                {selectedFile && fileValidationSuccess ? (
                  <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          resourceType === 'pdf'
                            ? 'bg-rose-100 text-rose-600'
                            : resourceType === 'pptx'
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-emerald-100 text-emerald-600'
                        }`}
                      >
                        {resourceType === 'pdf' ? (
                          <FileText className="w-6 h-6" />
                        ) : resourceType === 'pptx' ? (
                          <Presentation className="w-6 h-6" />
                        ) : (
                          <Globe className="w-6 h-6" />
                        )}
                      </div>
                      <div className="text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                            {selectedFile.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Validated
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-semibold">
                          {formatBytes(selectedFile.size)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {resourceType === 'web_blog' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalStep('preview_web');
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          setFileValidationSuccess(false);
                          if (htmlBlobUrl) URL.revokeObjectURL(htmlBlobUrl);
                          setHtmlBlobUrl(null);
                        }}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-rose-100 hover:text-rose-600 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                      >
                        Change File
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200/80 flex items-center justify-center text-[#026fc3] mx-auto">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm font-black text-slate-900">
                        {resourceType === 'pdf'
                          ? 'Drag & drop your PDF here'
                          : resourceType === 'pptx'
                          ? 'Drag & drop your presentation here'
                          : 'Drag & drop your single HTML file here'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        or <span className="text-[#026fc3] font-bold underline">browse from your computer</span>
                      </p>
                    </div>
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                      {resourceType === 'pdf'
                        ? 'PDF only • Up to 100 MB'
                        : resourceType === 'pptx'
                        ? 'PPTX, PPT • Up to 100 MB'
                        : 'HTML only • Up to 50 MB'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* 3. COMMON INFORMATION: TITLE & DESCRIPTION                        */}
          {/* ----------------------------------------------------------------- */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Title <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter the resource title (e.g. Basic English Grammar for Beginners)"
                maxLength={120}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3] focus:bg-white transition-all"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Description <span className="text-slate-400 font-medium lowercase">(optional)</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {description.length}/500
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="Briefly describe this resource to help students and teachers understand what they'll learn..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3] focus:bg-white transition-all resize-none leading-relaxed"
              />
            </div>

            {/* Subject, Category, Grade Level Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#026fc3] cursor-pointer"
                >
                  {SUBJECT_OPTIONS.filter((s) => s !== 'All Subjects').map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#026fc3] cursor-pointer"
                >
                  {CATEGORY_OPTIONS.filter((c) => c !== 'All Categories').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grade / Level */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                  Grade / Level
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#026fc3] cursor-pointer"
                >
                  {GRADE_OPTIONS.filter((g) => g !== 'All Grades').map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* 4. COVER IMAGE CHOICES: DEFAULT OR CUSTOM                         */}
          {/* ----------------------------------------------------------------- */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                Resource Cover
              </label>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setCoverMode('default')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    coverMode === 'default'
                      ? 'bg-white text-slate-900 shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Use Default Cover
                </button>
                <button
                  type="button"
                  onClick={() => setCoverMode('custom')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    coverMode === 'custom'
                      ? 'bg-white text-slate-900 shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Upload Cover Image
                </button>
              </div>
            </div>

            <input
              ref={coverInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleCoverInputChange}
              className="hidden"
            />

            {/* Cover Preview & Options */}
            <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-3xl flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-44 aspect-[16/10] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-xs relative shrink-0">
                <img
                  src={effectiveCoverPreview}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[9px] font-black uppercase tracking-wider text-white">
                  {coverMode === 'custom' ? 'Custom' : 'EdTechra Generated'}
                </span>
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                {coverMode === 'default' ? (
                  <>
                    <div className="flex items-center gap-1.5 justify-center sm:justify-start text-xs font-black text-slate-900">
                      <Sparkles className="w-4 h-4 text-[#026fc3]" />
                      <span>Automatic Smart Cover</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      EdTechra automatically creates an attractive, brand-consistent cover themed for{' '}
                      <span className="font-bold text-slate-700">{resourceType.toUpperCase()}</span>. No design effort needed!
                    </p>
                  </>
                ) : (
                  <>
                    <h5 className="text-xs font-black text-slate-900">Custom Image Cover</h5>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Upload your own 16:9 banner or illustration (JPG, PNG, WebP up to 10MB).
                    </p>
                    <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-black shadow-2xs transition-all cursor-pointer"
                      >
                        Choose Image
                      </button>
                      {customCoverFile && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomCoverFile(null);
                            setCustomCoverPreview(null);
                            setCoverMode('default');
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
                          title="Remove custom cover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Upload Progress Bar (when submitting) */}
          {isSubmitting && (
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-3xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-black text-sky-900">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#026fc3]" />
                  <span>{progressStatus || 'Uploading...'}</span>
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-sky-200/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#026fc3] to-sky-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

        </div>

        {/* =================================================================== */}
        {/* FORM FOOTER                                                         */}
        {/* =================================================================== */}
        <div className="px-5 sm:px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl text-xs font-black text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {resourceType === 'web_blog' && isFormValid() && (
              <button
                type="button"
                onClick={() => setModalStep('preview_web')}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Resource</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePublish}
              disabled={!isFormValid() || isSubmitting}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer ${
                isFormValid() && !isSubmitting
                  ? 'bg-[#026fc3] hover:bg-[#025ea6] text-white active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Publish Resource</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
