import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  Presentation,
  Globe,
  Gamepad2,
  GraduationCap,
  Link as LinkIcon,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  Save
} from 'lucide-react';
import { LibraryResource, LibraryFileType, TrainingFormat } from '@/types/library';
import { libraryService } from '@/services/libraryService';
import {
  SUBJECT_OPTIONS,
  CATEGORY_OPTIONS,
  GRADE_OPTIONS,
  GAME_CATEGORY_OPTIONS,
  TRAINING_CATEGORY_OPTIONS,
  TRAINING_DIFFICULTY_OPTIONS
} from '@/components/library/LibraryFilters';
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

  // Game & Training specific fields
  const [externalUrl, setExternalUrl] = useState('');
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const [instructor, setInstructor] = useState('');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [duration, setDuration] = useState('');
  const [trainingFormat, setTrainingFormat] = useState<TrainingFormat>('video');

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
      setCoverUrlInput(resourceToEdit.cover_image_url || '');
      setExternalUrl(resourceToEdit.file_url || '');
      setInstructor(resourceToEdit.instructor || resourceToEdit.author || '');
      setDifficulty(resourceToEdit.difficulty || 'Beginner');
      setDuration(resourceToEdit.duration || '');
      setTrainingFormat(resourceToEdit.training_format || 'video');
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
      setExternalUrl('');
      setCoverUrlInput('');
      setInstructor('');
      setDifficulty('Beginner');
      setDuration('');
      setTrainingFormat('video');
      setSelectedFile(null);
      setCoverFile(null);
      setCoverPreviewUrl(null);
    }
    setError(null);
    setUploadProgress('');
  }, [resourceToEdit, isOpen]);

  if (!isOpen) return null;

  // Handle main PDF/PPTX/HTML file selection
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
    const isHtml =
      lowerName.endsWith('.html') ||
      lowerName.endsWith('.htm') ||
      file.type === 'text/html';
    const isVideo =
      file.type.startsWith('video/') ||
      lowerName.endsWith('.mp4') ||
      lowerName.endsWith('.webm') ||
      lowerName.endsWith('.mov') ||
      lowerName.endsWith('.m4v');

    if (!isPdf && !isPptx && !isHtml && !isVideo) {
      setError('Please select a valid PDF (.pdf), PowerPoint (.pptx), Web/HTML (.html), or Video (.mp4, .webm, .mov) file.');
      return;
    }

    const maxBytes = isVideo ? 250 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(isVideo ? 'Video file exceeds 250MB limit.' : 'File exceeds 100MB limit.');
      return;
    }

    setSelectedFile(file);
    if (fileType === 'training') {
      if (isVideo) setTrainingFormat('video');
      else if (isPdf) setTrainingFormat('pdf');
      else if (isPptx) setTrainingFormat('pptx');
      else if (isHtml) setTrainingFormat('interactive');
    } else if (fileType !== 'game') {
      if (isHtml) {
        setFileType('web_blog');
        setCategory('Web / Blogs');
      } else if (isPptx) {
        setFileType('pptx');
      } else if (isPdf) {
        setFileType('pdf');
      }
    }
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

    const usesUrlOption = fileType === 'game' || fileType === 'training' || fileType === 'web_blog';
    const trimmedExternalUrl = externalUrl.trim();

    if (!isEditing && !selectedFile && !(usesUrlOption && trimmedExternalUrl)) {
      setError(
        fileType === 'game'
          ? 'Please enter a playable Game URL or upload an HTML5 game file.'
          : fileType === 'training'
          ? 'Please upload a training file (Video/PDF/PPTX/HTML) or enter a training URL.'
          : 'Please select a PDF, PPTX, or Web / Blog file to upload.'
      );
      return;
    }

    setIsSubmitting(true);
    setUploadProgress('Preparing upload...');

    try {
      let finalFileUrl = (usesUrlOption && trimmedExternalUrl) ? trimmedExternalUrl : (resourceToEdit?.file_url || '');
      let finalFileKey = (usesUrlOption && trimmedExternalUrl && trimmedExternalUrl !== resourceToEdit?.file_url)
        ? null
        : (resourceToEdit?.file_key || null);
      let finalFileSize = resourceToEdit?.file_size || 0;

      let finalCoverUrl = coverUrlInput.trim() || resourceToEdit?.cover_image_url || null;
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
        setUploadProgress(`Uploading ${fileType === 'web_blog' ? 'Web / Blog' : fileType.toUpperCase()} file to Cloudflare R2...`);
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
          author: author.trim() || (fileType === 'training' ? instructor.trim() : '') || null,
          instructor: fileType === 'training' ? (instructor.trim() || null) : null,
          difficulty: fileType === 'training' ? difficulty : null,
          duration: fileType === 'training' ? (duration.trim() || null) : null,
          training_format: fileType === 'training' ? trainingFormat : null,
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
          author: author.trim() || (fileType === 'training' ? instructor.trim() : '') || null,
          instructor: fileType === 'training' ? (instructor.trim() || null) : null,
          difficulty: fileType === 'training' ? difficulty : null,
          duration: fileType === 'training' ? (duration.trim() || null) : null,
          training_format: fileType === 'training' ? trainingFormat : null,
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
              {fileType === 'game' ? (
                <Gamepad2 className="w-5 h-5 text-violet-600" />
              ) : fileType === 'training' ? (
                <GraduationCap className="w-5 h-5 text-teal-600" />
              ) : fileType === 'web_blog' ? (
                <Globe className="w-5 h-5 text-emerald-500" />
              ) : fileType === 'pptx' ? (
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

          {/* 1. Content Type Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              Resource Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {([
                { id: 'pdf', label: 'PDF', Icon: FileText, active: 'bg-rose-600 text-white border-rose-600' },
                { id: 'pptx', label: 'PowerPoint', Icon: Presentation, active: 'bg-amber-500 text-white border-amber-500' },
                { id: 'web_blog', label: 'Web / Blog', Icon: Globe, active: 'bg-emerald-600 text-white border-emerald-600' },
                { id: 'game', label: 'Game', Icon: Gamepad2, active: 'bg-violet-600 text-white border-violet-600' },
                { id: 'training', label: 'Training', Icon: GraduationCap, active: 'bg-teal-600 text-white border-teal-600' }
              ] as const).map((item) => {
                const Icon = item.Icon;
                const isSelected = fileType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setFileType(item.id);
                      if (item.id === 'web_blog') setCategory('Web / Blogs');
                      else if (item.id === 'game') setCategory(GAME_CATEGORY_OPTIONS[0]);
                      else if (item.id === 'training') setCategory(TRAINING_CATEGORY_OPTIONS[0]);
                      else if (item.id === 'pptx') setCategory('Presentation');
                      else setCategory('Study Guide');
                    }}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                      isSelected
                        ? item.active
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1b. URL Input for Game / Training / Web */}
          {(fileType === 'game' || fileType === 'training' || fileType === 'web_blog') && (
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                {fileType === 'game'
                  ? 'Playable Game URL'
                  : fileType === 'training'
                  ? 'Training URL (Video, YouTube, Interactive Tutorial, or Document URL)'
                  : 'External Web / Blog URL (Optional if uploading HTML)'}
                {fileType === 'game' && !isEditing && !selectedFile && <span className="text-rose-500"> *</span>}
              </label>
              <div className="relative">
                <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder={
                    fileType === 'game'
                      ? 'https://edtechra.org/games/vocab-quest or /classes/games/...'
                      : fileType === 'training'
                      ? 'https://www.youtube.com/watch?v=... or interactive tutorial URL'
                      : 'https://...'
                  }
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* 1c. Main Resource File Dropzone */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              {fileType === 'game'
                ? 'Or Upload HTML5 Game File (Optional)'
                : fileType === 'training'
                ? 'Or Upload Training File (Video .mp4/.webm, PDF, PPTX, or HTML)'
                : <>Resource File {!isEditing && <span className="text-rose-500">*</span>} (PDF, PPTX, or Web / Blog HTML)</>}
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.pptx,.ppt,.html,.htm,.mp4,.webm,.mov,.m4v,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/html,video/*"
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
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {fileType === 'web_blog' ? 'Web / Blog' : fileType.toUpperCase()}
                  </p>
                </div>
              ) : isEditing ? (
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-slate-700">
                    Keep existing file ({resourceToEdit?.file_type === 'web_blog' ? 'Web / Blog' : resourceToEdit?.file_type?.toUpperCase()})
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Click here to replace with a new PDF, PPTX, or Web / Blog file
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-slate-800">
                    Click to select PDF, PowerPoint, or Web / Blog HTML
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Supports .pdf, .pptx, and .html up to 100 MB
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
                {(fileType === 'game'
                  ? GAME_CATEGORY_OPTIONS
                  : fileType === 'training'
                  ? TRAINING_CATEGORY_OPTIONS
                  : CATEGORY_OPTIONS.filter((c) => c !== 'All Categories')
                ).map((cat) => (
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

          {/* 3b. Training Learning Details (Format, Instructor, Difficulty, Duration) */}
          {fileType === 'training' && (
            <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-teal-800">
                Training Learning Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">
                    Training Format
                  </label>
                  <select
                    value={trainingFormat}
                    onChange={(e) => setTrainingFormat(e.target.value as TrainingFormat)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-600 cursor-pointer"
                  >
                    <option value="video">Video</option>
                    <option value="pdf">PDF Guide</option>
                    <option value="pptx">Presentation (PPTX)</option>
                    <option value="interactive">Interactive Tutorial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">
                    Instructor
                  </label>
                  <input
                    type="text"
                    value={instructor}
                    onChange={(e) => setInstructor(e.target.value)}
                    placeholder="e.g. Dr. Sarah Lin"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-600 cursor-pointer"
                  >
                    {TRAINING_DIFFICULTY_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 45 mins"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>
            </div>
          )}

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
                <input
                  type="text"
                  value={coverUrlInput}
                  onChange={(e) => {
                    setCoverUrlInput(e.target.value);
                    if (e.target.value.trim() && !coverFile) {
                      setCoverPreviewUrl(e.target.value.trim());
                    }
                  }}
                  placeholder="Or paste thumbnail image URL (https://...)"
                  className="mt-2 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
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
