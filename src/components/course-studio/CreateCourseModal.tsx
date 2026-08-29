// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: CREATE DIGITAL COURSE MODAL
// Fast creation flow for Full Multi-Unit Courses or Quick Single-Lesson Courses.
// ============================================================================

import React, { useState } from 'react';
import {
  X,
  Plus,
  Sparkles,
  Layers,
  Zap,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import { courseStudioService } from '@/services/courseStudioService';
import { Course } from '@/types/courseStudio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (course: Course) => void;
}

export const CreateCourseModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('English');
  const [gradeLevel, setGradeLevel] = useState('Grade 8');
  const [shortDescription, setShortDescription] = useState('');
  const [courseType, setCourseType] = useState<'full' | 'quick'>('full');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverImageKey, setCoverImageKey] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        grade_level: gradeLevel,
        short_description: shortDescription.trim(),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#fcfaf6] rounded-[28px] max-w-lg w-full border border-stone-200/90 shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="p-6 bg-[#0a213c] text-white flex items-center justify-between border-b border-slate-800">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-200 text-[11px] font-black uppercase tracking-wider border border-sky-400/30">
              <Sparkles className="w-3.5 h-3.5 text-sky-300" />
              <span>EdTechra Course Studio</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Create Digital Course
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

        {/* Form Body */}
        <form onSubmit={handleCreate} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Course Type Selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCourseType('full')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                courseType === 'full'
                  ? 'bg-sky-50 border-[#026fc3] text-[#026fc3] shadow-xs'
                  : 'bg-white border-stone-200/80 text-slate-700 hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <Layers className="w-5 h-5 text-[#026fc3]" />
                {courseType === 'full' && <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#026fc3] text-white rounded-full">Selected</span>}
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">Full Course</p>
                <p className="text-[11px] text-slate-500 font-medium leading-tight">Multi-unit curriculum with structured days & practice</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCourseType('quick')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                courseType === 'quick'
                  ? 'bg-sky-50 border-[#026fc3] text-[#026fc3] shadow-xs'
                  : 'bg-white border-stone-200/80 text-slate-700 hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <Zap className="w-5 h-5 text-amber-500" />
                {courseType === 'quick' && <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-500 text-white rounded-full">Selected</span>}
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">Quick Lesson</p>
                <p className="text-[11px] text-slate-500 font-medium leading-tight">Single focused lesson with AI questions for quick delivery</p>
              </div>
            </button>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700">Course Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Master the Simple Present Tense"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-[#026fc3] focus:outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Subject & Grade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700">Subject</label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#026fc3] focus:outline-none"
              >
                <option value="English">English</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Science">Science</option>
                <option value="Social Studies">Social Studies</option>
                <option value="Hindi">Hindi</option>
                <option value="General Knowledge">General Knowledge</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700">Grade Level</label>
              <select
                value={gradeLevel}
                onChange={e => setGradeLevel(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#026fc3] focus:outline-none"
              >
                <option value="Grade 6">Grade 6</option>
                <option value="Grade 7">Grade 7</option>
                <option value="Grade 8">Grade 8</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                <option value="All Grades">All Grades</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700">Short Description</label>
            <textarea
              rows={2}
              value={shortDescription}
              onChange={e => setShortDescription(e.target.value)}
              placeholder="Brief summary of learning objectives..."
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-[#026fc3] focus:outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Cover Image Upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 flex items-center justify-between">
              <span>Cover Image (Optional)</span>
              {coverImageUrl && <span className="text-emerald-600 text-[11px] font-bold">✓ Uploaded</span>}
            </label>
            <div className="flex items-center gap-3">
              {coverImageUrl && (
                <img
                  src={coverImageUrl}
                  alt="Cover"
                  className="w-16 h-12 rounded-lg object-cover border border-stone-200"
                />
              )}
              <label className="px-4 py-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-slate-500" />
                <span>{uploadingImage ? 'Compressing & Uploading...' : coverImageUrl ? 'Change Cover Image' : 'Upload Cover Image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImagePick}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="px-6 py-2.5 rounded-xl bg-[#026fc3] hover:bg-[#03589e] text-white text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{submitting ? 'Creating Course...' : 'Create Course & Open Studio'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
