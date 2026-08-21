import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  Search,
  RefreshCw,
  Image as ImageIcon,
  X,
  Loader2,
  FileText,
  Plus,
  Check
} from 'lucide-react';
import {
  ReadingBit,
  ReadingAdminStats,
  ReadingValidationResult,
  RawReadingInput
} from '@/types';
import { readingService } from '@/services/readingService';
import { useAuth } from '@/context/AuthContext';
import { validateReadingJSON } from '@/utils/readingValidation';

export const AdminReadingsSection: React.FC = () => {
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);

  // Data state
  const [readings, setReadings] = useState<ReadingBit[]>([]);
  const [stats, setStats] = useState<ReadingAdminStats>({
    totalReadings: 0,
    publishedReadings: 0,
    draftReadings: 0,
    readingsWithImages: 0,
    readingsWithoutImages: 0
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter] = useState<string>('all');
  const [levelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // JSON Import & Create State
  const [jsonInput, setJsonInput] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ReadingValidationResult | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const [createCoverBlob, setCreateCoverBlob] = useState<Blob | null>(null);
  const [createCoverPreview, setCreateCoverPreview] = useState<string | null>(null);

  // Edit Reading Modal State
  const [editingReading, setEditingReading] = useState<ReadingBit | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    subtitle: string;
    category: string;
    level: string;
    reading_time: number;
    paragraphsText: string;
    is_published: boolean;
  }>({
    title: '',
    subtitle: '',
    category: 'General',
    level: 'A2',
    reading_time: 1,
    paragraphsText: '',
    is_published: true
  });
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Attach Cover Image Modal State (for updating cover later without duplicating)
  const [targetReadingForCover, setTargetReadingForCover] = useState<ReadingBit | null>(null);
  const [coverUploading, setCoverUploading] = useState<boolean>(false);
  const [coverUploadProgress, setCoverUploadProgress] = useState<number>(0);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const token = session?.access_token || null;
      const data = await readingService.getAdminReadings(
        {
          search: searchQuery,
          category: categoryFilter,
          level: levelFilter,
          published: statusFilter
        },
        token
      );
      setReadings(data.readings);
      setStats(data.stats);
    } catch (err: any) {
      console.error('Error loading admin readings:', err);
      showToast(err.message || 'Failed to load readings', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, searchQuery, categoryFilter, levelFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle JSON File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setJsonInput(text);
      const val = validateReadingJSON(text);
      setValidationResult(val);
      if (val.valid) {
        showToast('JSON file loaded and validated successfully!');
      } else {
        showToast('JSON validation failed. Check syntax and required fields.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Validate Pasted JSON
  const handleValidateInput = () => {
    if (!jsonInput.trim()) {
      showToast('Please paste reading JSON data before validating.', 'error');
      return;
    }
    const val = validateReadingJSON(jsonInput);
    setValidationResult(val);
    if (val.valid) {
      showToast('Reading JSON passed validation! Ready to create.');
    } else {
      showToast(val.errors[0]?.message || 'Validation failed.', 'error');
    }
  };

  // Optional Cover Image Selection during creation
  const handleCreateCoverSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCreateCoverBlob(file);
    setCreateCoverPreview(URL.createObjectURL(file));
  };

  // Submit and Create Reading
  const handleCreateReading = async (publishImmediately: boolean = true) => {
    if (!validationResult || !validationResult.valid || !validationResult.reading) {
      showToast('Please provide valid reading JSON before publishing.', 'error');
      return;
    }

    setImporting(true);
    try {
      const token = session?.access_token || null;
      let coverImageUrl: string | null = null;
      let coverImageObjectKey: string | null = null;

      // 1. Upload Cover Image to Cloudflare R2 if selected (OPTIONAL)
      if (createCoverBlob) {
        const presigned = await readingService.requestPresignedCoverUpload(
          {
            readingId: 'reading',
            filename: 'cover.webp',
            contentType: createCoverBlob.type || 'image/webp',
            size: createCoverBlob.size
          },
          token
        );

        await readingService.uploadCoverToR2(
          presigned.uploadUrl,
          presigned.headers,
          createCoverBlob
        );

        coverImageUrl = presigned.publicUrl;
        coverImageObjectKey = presigned.objectKey;
      }

      // 2. Create Reading Record
      const payload: RawReadingInput = {
        ...validationResult.reading,
        cover_image_url: coverImageUrl || validationResult.reading.cover_image_url || null,
        cover_image_object_key: coverImageObjectKey || validationResult.reading.cover_image_object_key || null,
        is_published: publishImmediately
      };

      const newReading = await readingService.createReading(payload, token);
      showToast(`One-Minute Reading "${newReading.title}" ${publishImmediately ? 'published' : 'saved as draft'}!`);

      // Reset form
      setJsonInput('');
      setValidationResult(null);
      setCreateCoverBlob(null);
      setCreateCoverPreview(null);
      await loadData();
    } catch (err: any) {
      console.error('Failed to create reading:', err);
      showToast(err.message || 'Failed to create reading.', 'error');
    } finally {
      setImporting(false);
    }
  };

  // Upload Cover Image Later for existing reading (without duplicate creation)
  const handleUploadCoverLater = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetReadingForCover) return;

    setCoverUploading(true);
    setCoverUploadProgress(10);
    try {
      const token = session?.access_token || null;

      // 1. Request presigned upload URL
      const presigned = await readingService.requestPresignedCoverUpload(
        {
          readingId: targetReadingForCover.id,
          filename: file.name,
          contentType: file.type || 'image/webp',
          size: file.size
        },
        token
      );

      setCoverUploadProgress(40);

      // 2. Upload directly to Cloudflare R2
      await readingService.uploadCoverToR2(
        presigned.uploadUrl,
        presigned.headers,
        file,
        (p) => setCoverUploadProgress(40 + Math.round(p * 0.5))
      );

      // 3. Update existing reading cover image authoritatively
      await readingService.updateReadingCover(
        targetReadingForCover.id,
        {
          cover_image_url: presigned.publicUrl,
          cover_image_object_key: presigned.objectKey
        },
        token
      );

      showToast(`Cover image updated for "${targetReadingForCover.title}".`);
      setTargetReadingForCover(null);
      await loadData();
    } catch (err: any) {
      console.error('Failed to upload cover image:', err);
      showToast(err.message || 'Failed to update cover image.', 'error');
    } finally {
      setCoverUploading(false);
      setCoverUploadProgress(0);
      e.target.value = '';
    }
  };

  // Toggle Publish
  const handleTogglePublish = async (reading: ReadingBit) => {
    try {
      const token = session?.access_token || null;
      const newStatus = !reading.is_published;
      await readingService.togglePublish(reading.id, newStatus, token);
      setReadings(prev => prev.map(r => (r.id === reading.id ? { ...r, is_published: newStatus } : r)));
      showToast(`Reading ${newStatus ? 'published' : 'unpublished'}.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle publication.', 'error');
    }
  };

  // Delete Reading
  const handleDeleteReading = async (reading: ReadingBit) => {
    if (!window.confirm(`Permanently delete reading "${reading.title}"?`)) return;

    try {
      const token = session?.access_token || null;
      await readingService.deleteReading(reading.id, token);
      setReadings(prev => prev.filter(r => r.id !== reading.id));
      showToast('Reading deleted permanently.');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete reading.', 'error');
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (reading: ReadingBit) => {
    setEditingReading(reading);
    setEditForm({
      title: reading.title,
      subtitle: reading.subtitle || '',
      category: reading.category || 'General',
      level: reading.level || 'A2',
      reading_time: reading.reading_time || 1,
      paragraphsText: reading.paragraphs.map(p => p.text).join('\n\n'),
      is_published: reading.is_published
    });
  };

  // Save Edit Form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReading) return;

    if (!editForm.title.trim()) {
      alert('Title is required.');
      return;
    }

    const paragraphs = editForm.paragraphsText
      .split('\n\n')
      .map((t, idx) => ({ id: idx + 1, text: t.trim() }))
      .filter(p => p.text.length > 0);

    if (paragraphs.length === 0) {
      alert('At least one paragraph is required.');
      return;
    }

    setSavingEdit(true);
    try {
      const token = session?.access_token || null;
      const updated = await readingService.updateReading(
        editingReading.id,
        {
          title: editForm.title.trim(),
          subtitle: editForm.subtitle.trim() || undefined,
          category: editForm.category.trim(),
          level: editForm.level.trim(),
          reading_time: Number(editForm.reading_time) || 1,
          paragraphs,
          is_published: editForm.is_published
        },
        token
      );

      setReadings(prev => prev.map(r => (r.id === editingReading.id ? updated : r)));
      showToast('Reading updated successfully.');
      setEditingReading(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save changes.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <section className="space-y-6 pt-4">
      
      {/* Toast Alert */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top-2 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-500 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-[#0f233a] text-white rounded-3xl p-6 sm:p-7 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-300 text-[11px] font-black tracking-wider uppercase border border-teal-400/30">
              Editorial Feed Engine
            </span>
            <span className="text-white/70 text-xs font-semibold">
              CEFR Levels & Vocabulary
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <span>📖</span>
            <span>One-Minute Readings Management</span>
          </h2>
          <p className="text-xs text-white/80 leading-relaxed">
            Upload JSON reading articles with optional cover images, vocabulary glossaries, and micro-comprehension checks. If no image is uploaded, articles publish normally in a premium text-first format.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => loadData()}
            disabled={refreshing}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
            title="Reload reading records"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400">Total Readings</div>
          <div className="text-2xl font-black text-[#0f233a]">{stats.totalReadings}</div>
          <div className="text-[10px] text-slate-500">In Library</div>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-emerald-600">Published</div>
          <div className="text-2xl font-black text-emerald-700">{stats.publishedReadings}</div>
          <div className="text-[10px] text-slate-500">Active in Feed</div>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-amber-600">Drafts</div>
          <div className="text-2xl font-black text-amber-700">{stats.draftReadings}</div>
          <div className="text-[10px] text-slate-500">Unpublished</div>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-teal-600">With Cover Image</div>
          <div className="text-2xl font-black text-teal-700">{stats.readingsWithImages}</div>
          <div className="text-[10px] text-slate-500">Visual Cards</div>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-indigo-600">Text-First (No Image)</div>
          <div className="text-2xl font-black text-indigo-700">{stats.readingsWithoutImages}</div>
          <div className="text-[10px] text-slate-500">Editorial Format</div>
        </div>
      </div>

      {/* 3. JSON Upload / Creation Card */}
      <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#0f233a] flex items-center gap-2">
              <Upload className="w-5 h-5 text-teal-600" />
              <span>Import New Reading Article</span>
            </h3>
            <p className="text-xs text-slate-500">
              Upload a JSON file or paste structured reading JSON. Cover image is completely optional.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Upload JSON File</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* JSON Textarea */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">
              Reading JSON Content:
            </label>
            <textarea
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                if (e.target.value.trim()) {
                  setValidationResult(validateReadingJSON(e.target.value));
                } else {
                  setValidationResult(null);
                }
              }}
              rows={9}
              placeholder={`{\n  "title": "The Secret Life of Trees",\n  "subtitle": "How trees communicate underground",\n  "category": "Science",\n  "level": "A2",\n  "paragraphs": [\n    { "id": 1, "text": "..." }\n  ]\n}`}
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleValidateInput}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Validate JSON Structure
              </button>

              {jsonInput && (
                <button
                  type="button"
                  onClick={() => {
                    setJsonInput('');
                    setValidationResult(null);
                    setCreateCoverBlob(null);
                    setCreateCoverPreview(null);
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Validation Preview & Optional Image Section */}
          <div className="space-y-4 bg-stone-50/70 p-4 sm:p-5 rounded-2xl border border-stone-200 flex flex-col justify-between">
            {validationResult?.valid && validationResult.reading ? (
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Valid Reading Detected</span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-black text-[#0f233a]">
                    {validationResult.reading.title}
                  </h4>
                  {validationResult.reading.subtitle && (
                    <p className="text-xs text-slate-600 font-semibold">
                      {validationResult.reading.subtitle}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="px-2 py-0.5 bg-white border border-stone-200 text-teal-800 text-[10px] font-black rounded-md">
                      {validationResult.reading.category}
                    </span>
                    <span className="px-2 py-0.5 bg-white border border-stone-200 text-slate-700 text-[10px] font-bold rounded-md">
                      Level {validationResult.reading.level}
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold">
                      {validationResult.reading.paragraphs?.length || 0} paragraphs • {validationResult.reading.vocabulary?.length || 0} vocabulary words
                    </span>
                  </div>
                </div>

                {/* Optional Cover Image Uploader Box */}
                <div className="pt-2 border-t border-stone-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                      <span>Optional Cover Image:</span>
                    </span>
                    <span className="text-[11px] font-normal text-slate-400">
                      (Can upload now or later)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {createCoverPreview ? (
                      <div className="relative w-20 h-14 rounded-xl overflow-hidden border border-stone-300 shrink-0">
                        <img src={createCoverPreview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setCreateCoverBlob(null);
                            setCreateCoverPreview(null);
                          }}
                          className="absolute top-1 right-1 p-0.5 bg-black/60 text-white rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-14 rounded-xl border-2 border-dashed border-stone-300 flex items-center justify-center text-slate-400 shrink-0">
                        <ImageIcon className="w-5 h-5 opacity-50" />
                      </div>
                    )}

                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleCreateCoverSelected}
                        className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
                <FileText className="w-8 h-8 opacity-40" />
                <p className="text-xs font-semibold">
                  Paste or upload JSON to see a live validation preview.
                </p>
                {validationResult?.errors && validationResult.errors.length > 0 && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 text-left w-full space-y-1">
                    <strong>Validation Issue:</strong>
                    <div>{validationResult.errors[0]?.message}</div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={!validationResult?.valid || importing}
                onClick={() => handleCreateReading(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all disabled:opacity-40 cursor-pointer"
              >
                Save as Draft
              </button>

              <button
                type="button"
                disabled={!validationResult?.valid || importing}
                onClick={() => handleCreateReading(true)}
                className="px-5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-40 cursor-pointer min-h-[36px]"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing…</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Publish Reading to Feed</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Catalogue List Table */}
      <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
        
        {/* Controls Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#0f233a]">
              Readings Catalogue
            </h3>
            <p className="text-xs text-slate-500">
              Showing {readings.length} {readings.length === 1 ? 'article' : 'articles'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, category, or level..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { id: 'all', label: 'All' },
                { id: 'published', label: 'Published' },
                { id: 'draft', label: 'Drafts' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === f.id
                      ? 'bg-white text-teal-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Readings Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                <th className="pb-3 px-3">Article</th>
                <th className="pb-3 px-3">Format / Cover</th>
                <th className="pb-3 px-3">Level & Time</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
                    <span>Loading readings...</span>
                  </td>
                </tr>
              ) : readings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No reading articles found matching your criteria.
                  </td>
                </tr>
              ) : (
                readings.map(reading => {
                  const hasCover = Boolean(reading.cover_image_url);

                  return (
                    <tr key={reading.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Title & Subtitle */}
                      <td className="py-3.5 px-3 max-w-xs">
                        <div className="font-extrabold text-slate-900 line-clamp-1">
                          {reading.title}
                        </div>
                        {reading.subtitle && (
                          <div className="text-[11px] text-slate-500 line-clamp-1">
                            {reading.subtitle}
                          </div>
                        )}
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                          {reading.category}
                        </span>
                      </td>

                      {/* Cover Thumbnail / Mode */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          {hasCover ? (
                            <img
                              src={reading.cover_image_url!}
                              alt={reading.title}
                              className="w-12 h-8 rounded-lg object-cover border border-stone-200 shadow-2xs"
                            />
                          ) : (
                            <span className="px-2 py-1 bg-stone-100 text-stone-700 text-[10px] font-bold rounded-lg border border-stone-200">
                              Text-First
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setTargetReadingForCover(reading);
                              coverImageInputRef.current?.click();
                            }}
                            className="text-[11px] text-teal-700 hover:underline font-bold"
                          >
                            {hasCover ? 'Replace' : '+ Add Image'}
                          </button>
                        </div>
                      </td>

                      {/* Level & Time */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-md font-black text-[10px]">
                            {reading.level || 'A2'}
                          </span>
                          <span className="text-[11px] text-slate-500 font-semibold">
                            {reading.reading_time || 1} min
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(reading)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black cursor-pointer transition-all ${
                            reading.is_published
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200'
                          }`}
                        >
                          {reading.is_published ? 'Published' : 'Draft'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(reading)}
                            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-teal-700 transition-colors"
                            title="Edit reading content"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteReading(reading)}
                            className="p-1.5 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete reading permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden File Input for "Upload/Replace Cover Image Later" */}
      <input
        ref={coverImageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleUploadCoverLater}
        className="hidden"
      />

      {/* Cover Image Upload Progress Overlay */}
      {coverUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white p-6 rounded-3xl shadow-2xl border border-stone-200 text-center space-y-3 max-w-xs w-full animate-in zoom-in-95">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
            <h4 className="text-sm font-black text-slate-900">
              Uploading Cover to Cloudflare R2…
            </h4>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-teal-600 h-full transition-all duration-300"
                style={{ width: `${coverUploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Reading Content Modal */}
      {editingReading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white w-full max-w-xl max-h-[90vh] rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col animate-in zoom-in-95"
          >
            <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-800 to-[#0f233a] text-white flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-black flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-teal-300" />
                <span>Edit One-Minute Reading</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingReading(null)}
                className="p-1 text-white/80 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Subtitle</label>
                <input
                  type="text"
                  value={editForm.subtitle}
                  onChange={(e) => setEditForm(prev => ({ ...prev, subtitle: e.target.value }))}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Category</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Level</label>
                  <input
                    type="text"
                    value={editForm.level}
                    onChange={(e) => setEditForm(prev => ({ ...prev, level: e.target.value }))}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Reading Time (min)</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.reading_time}
                    onChange={(e) => setEditForm(prev => ({ ...prev, reading_time: Number(e.target.value) || 1 }))}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Paragraphs (separate paragraphs with blank line):
                </label>
                <textarea
                  value={editForm.paragraphsText}
                  onChange={(e) => setEditForm(prev => ({ ...prev, paragraphsText: e.target.value }))}
                  rows={8}
                  className="w-full p-3 font-serif text-xs leading-relaxed bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={editForm.is_published}
                  onChange={(e) => setEditForm(prev => ({ ...prev, is_published: e.target.checked }))}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs font-bold text-slate-800">
                  Published (visible in feed)
                </span>
              </label>
            </div>

            <div className="p-4 bg-white border-t border-stone-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingReading(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

    </section>
  );
};
