import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  Presentation,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  Save
} from 'lucide-react';
import { LibraryResource, LibraryFileType } from '@/types/library';
import { libraryService } from '@/services/libraryService';
import { SUBJECT_OPTIONS, CATEGORY_OPTIONS, GRADE_OPTIONS } from '@/components/library/LibraryFilters';
import { extractPptxCover } from '@/utils/pptxParser';

interface AdminLibraryModalProps {
  isOpen: boolean;
  resourceToEdit?: LibraryResource | null;
  onClose: () => void;
  onSuccess: (resource: LibraryResource) => void;
}

export const AdminLibraryModal: React.FC<AdminLibraryModalProps> = ({
  isOpen,
  resourceToEdit,
  onClose,
  onSuccess
}) => {
  const isEditing = Boolean(resourceToEdit);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('English & Grammar');
  const [category, setCategory] = useState('Presentation');
  const [gradeLevel, setGradeLevel] = useState('Middle School (Grades 6-8)');
  const [author, setAuthor] = useState('');
  const [fileType, setFileType] = useState<LibraryFileType>('pdf');
  const [published, setPublished] = useState(true);

  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Populate data when editing
  useEffect(() => {
    if (resourceToEdit) {
      setTitle(resourceToEdit.title || '');
      setDescription(resourceToEdit.description || '');
      setSubject(resourceToEdit.subject || 'English & Grammar');
      setCategory(resourceToEdit.category || 'Presentation');
      setGradeLevel(resourceToEdit.grade_level || 'Middle School (Grades 6-8)');
      setAuthor(resourceToEdit.author || '');
      setFileType(resourceToEdit.file_type || 'pdf');
      setPublished(resourceToEdit.published !== false);
      setCoverPreviewUrl(resourceToEdit.cover_image_url || null);
      setSelectedFile(null);
      setCoverFile(null);
    } else {
      // Default new resource form
      setTitle('');
      setDescription('');
      setSubject('English & Grammar');
      setCategory('Presentation');
      setGradeLevel('Middle School (Grades 6-8)');
      setAuthor('');
      setFileType('pdf');
      setPublished(true);
      setSelectedFile(null);
      setCoverFile(null);
      setCoverPreviewUrl(null);
    }
    setError(null);
    setUploadProgress('');
  }, [resourceToEdit, isOpen]);

  if (!isOpen) return null;

  // Handle main PDF/PPTX file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';
    const isPptx =
      lowerName.endsWith('.pptx') ||
      lowerName.endsWith('.ppt') ||
      file.type.includes('presentation') ||
      file.type.includes('powerpoint');

    if (!isPdf && !isPptx) {
      setError('Please select a valid PDF (.pdf) or PowerPoint (.pptx) file.');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError('File exceeds 100MB limit.');
      return;
    }

    setSelectedFile(file);
    setFileType(isPptx ? 'pptx' : 'pdf');
    setError(null);

    // Auto-extract first slide / cover page from PPTX presentation if no manual cover is set
    if (isPptx && !coverFile) {
      extractPptxCover(file, file.name).then((extracted) => {
        if (extracted) {
          setCoverFile(extracted.file);
          setCoverPreviewUrl(extracted.url);
        }
      }).catch((e) => {
        console.warn('[AdminLibraryModal] Auto cover extraction skipped:', e);
      });
    }

    // Auto-fill title if empty
    if (!title.trim()) {
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1));
    }
  };

  // Handle cover image selection
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Cover must be a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Cover image exceeds 10MB limit.');
      return;
    }

    setCoverFile(file);
    setCoverPreviewUrl(URL.createObjectURL(file));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please enter a title for the resource.');
      return;
    }

    if (!isEditing && !selectedFile) {
      setError('Please select a PDF or PPTX file to upload.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress('Preparing upload...');

    try {
      let finalFileUrl = resourceToEdit?.file_url || '';
      let finalFileKey = resourceToEdit?.file_key || null;
      let finalFileSize = resourceToEdit?.file_size || 0;

      let finalCoverUrl = resourceToEdit?.cover_image_url || null;
      let finalCoverKey = resourceToEdit?.cover_image_key || null;

      // 1. Upload Cover Image if changed
      if (coverFile) {
        setUploadProgress('Uploading cover image to Cloudflare R2...');
        const coverRes = await libraryService.uploadFileToR2(coverFile, true);
        finalCoverUrl = coverRes.publicUrl;
        finalCoverKey = coverRes.objectKey;
      }

      // 2. Upload Document file if provided
      if (selectedFile) {
        setUploadProgress(`Uploading ${fileType.toUpperCase()} file to Cloudflare R2...`);
        const fileRes = await libraryService.uploadFileToR2(selectedFile, false);
        finalFileUrl = fileRes.publicUrl;
        finalFileKey = fileRes.objectKey;
        finalFileSize = selectedFile.size;
      }

      setUploadProgress('Saving metadata to Supabase...');

      if (isEditing && resourceToEdit) {
        // Update existing resource
        const res = await libraryService.updateResource(resourceToEdit.id, {
          title: title.trim(),
          description: description.trim(),
          subject: subject.trim(),
          category: category.trim(),
          grade_level: gradeLevel.trim(),
          author: author.trim() || null,
          file_type: fileType,
          published,
          file_url: finalFileUrl,
          file_key: finalFileKey,
          file_size: finalFileSize,
          cover_image_url: finalCoverUrl,
          cover_image_key: finalCoverKey
        });

        if (res.error || !res.data) {
          throw new Error(res.error || 'Failed to update resource.');
        }

        onSuccess(res.data);
      } else {
        // Create new resource
        const res = await libraryService.createResource({
          title: title.trim(),
          description: description.trim(),
          subject: subject.trim(),
          category: category.trim(),
          grade_level: gradeLevel.trim(),
          author: author.trim() || null,
          file_type: fileType,
          file_url: finalFileUrl,
          file_key: finalFileKey,
          file_size: finalFileSize,
          cover_image_url: finalCoverUrl,
          cover_image_key: finalCoverKey,
          published
        });

        if (res.error || !res.data) {
          throw new Error(res.error || 'Failed to create resource.');
        }

        onSuccess(res.data);
      }

      onClose();
    } catch (err: any) {
      console.error('[AdminLibraryModal] Save error:', err);
      setError(err.message || 'An error occurred while saving the resource.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white text-slate-900 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200/60 flex items-center justify-center">
              {fileType === 'pptx' ? (
                <Presentation className="w-5 h-5 text-amber-500" />
              ) : (
                <FileText className="w-5 h-5 text-rose-500" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {isEditing ? 'Edit Library Resource' : 'Upload Library Resource'}
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                Cloudflare R2 Direct Upload & Catalog Metadata
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Main Resource File Dropzone */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              Resource File {!isEditing && <span className="text-rose-500">*</span>} (PDF or PPTX)
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.pptx,.ppt,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center space-y-2 ${
                selectedFile
                  ? 'bg-purple-50/50 border-purple-300'
                  : isEditing
                  ? 'bg-slate-50 border-slate-300 hover:border-purple-400'
                  : 'bg-slate-50 border-slate-300 hover:border-purple-400 hover:bg-purple-50/20'
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-white shadow-2xs border border-slate-200 flex items-center justify-center mx-auto text-purple-600">
                <Upload className="w-5 h-5" />
              </div>

              {selectedFile ? (
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-slate-900 truncate max-w-sm mx-auto">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {fileType.toUpperCase()}
                  </p>
                </div>
              ) : isEditing ? (
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-slate-700">
                    Keep existing file ({resourceToEdit?.file_type?.toUpperCase()})
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Click here to replace with a new PDF or PPTX file
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-slate-800">
                    Click to select PDF or PowerPoint presentation
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Supports .pdf and .pptx up to 100 MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Resource Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Master English Tenses & Grammar Presentation"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Description / Overview
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short summary of topics covered, lesson objectives, or student guidelines..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white resize-none"
              />
            </div>
          </div>

          {/* 3. Classification: Subject, Category, Grade Level */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-600 cursor-pointer"
              >
                {SUBJECT_OPTIONS.filter((s) => s !== 'All Subjects').map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-600 cursor-pointer"
              >
                {CATEGORY_OPTIONS.filter((c) => c !== 'All Categories').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Grade / Level
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-600 cursor-pointer"
              >
                {GRADE_OPTIONS.filter((g) => g !== 'All Grades').map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Author & Published Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Author / Faculty
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Department of English"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
              />
            </div>

            <div className="pt-4 sm:pt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <span className="text-xs font-black text-slate-800">
                  Publish to Student & Teacher Library
                </span>
              </label>
              <p className="text-[11px] text-slate-400 font-medium pl-7">
                {published ? 'Visible immediately to all authenticated users' : 'Saved as private administrator draft'}
              </p>
            </div>
          </div>

          {/* 5. Cover Image Picker */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                Cover / Preview Image (Optional)
              </label>
              {coverPreviewUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setCoverFile(null);
                    setCoverPreviewUrl(null);
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  Remove Cover
                </button>
              )}
            </div>

            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverChange}
              className="hidden"
            />

            <div className="flex items-center gap-3">
              <div
                onClick={() => coverInputRef.current?.click()}
                className="w-24 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer shrink-0 hover:border-purple-400 transition-colors"
              >
                {coverPreviewUrl ? (
                  <img src={coverPreviewUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  {coverPreviewUrl ? 'Change Cover Image' : 'Select Cover Image'}
                </button>
                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  {fileType === 'pptx' && coverPreviewUrl && !resourceToEdit?.cover_image_url
                    ? 'Cover automatically captured from Slide 1 of presentation (click Change to replace if desired).'
                    : '16:9 ratio recommended. JPG, PNG, or WebP up to 10MB.'}
                </p>
              </div>
            </div>
          </div>

          {/* Upload Progress Indicator */}
          {uploadProgress && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-2 text-purple-700 text-xs font-bold">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              <span>{uploadProgress}</span>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEditing ? 'Save Changes' : 'Upload Resource'}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
