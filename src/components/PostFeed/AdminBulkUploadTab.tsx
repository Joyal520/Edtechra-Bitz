// ============================================================================
// EDTECHRA-BITZ: Admin Bulk Image Upload Component
// Multi-Image Selection | Direct R2 Upload | Zero Gemini AI | Sequential Queue
// ============================================================================

import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Sparkles,
  ShieldCheck,
  Loader2,
  X,
  ArrowUpDown,
  FileText
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  QUEUE_INTERVAL_OPTIONS,
  CreateBatchQueuePayload,
  CreateBatchQueueItemInput
} from '@/types';
import { adminPostQueueService } from '@/services/adminPostQueueService';
import { formatBytes } from '@/utils/imageOptimizer';

interface AdminBulkUploadTabProps {
  onQueueCreated?: (batchId: string) => void;
  onCancel?: () => void;
}

interface SelectedImageItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  width?: number;
  height?: number;
}

export const AdminBulkUploadTab: React.FC<AdminBulkUploadTabProps> = ({
  onQueueCreated,
  onCancel
}) => {
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedImages, setSelectedImages] = useState<SelectedImageItem[]>([]);
  const [batchName, setBatchName] = useState<string>(
    `Admin Knowledge Batch #${new Date().toISOString().slice(0, 10)}`
  );
  const [defaultCaption, setDefaultCaption] = useState<string>('');
  const [intervalMinutes, setIntervalMinutes] = useState<number>(360); // Default: Every 6 hours
  const [order, setOrder] = useState<'upload_order' | 'reverse_order'>('upload_order');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Upload state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; percent: number }>({
    current: 0,
    total: 0,
    percent: 0
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Process files selected from input or dropped
  const processFiles = useCallback((files: FileList | File[]) => {
    setErrorMessage(null);
    setDuplicateWarning(null);
    const validExtensions = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const newItems: SelectedImageItem[] = [];
    let duplicateCount = 0;

    setSelectedImages((currentSelected) => {
      const existingFingerprints = new Set(
        currentSelected.map((i) => `${i.name.toLowerCase().trim()}_${i.size}`)
      );
      const batchFingerprints = new Set<string>();

      Array.from(files).forEach((file) => {
        if (!validExtensions.includes(file.type.toLowerCase())) {
          return; // skip non-images
        }

        if (file.size > 20 * 1024 * 1024) {
          return; // skip files > 20MB
        }

        const fingerprint = `${file.name.toLowerCase().trim()}_${file.size}`;
        if (existingFingerprints.has(fingerprint) || batchFingerprints.has(fingerprint)) {
          duplicateCount++;
          return; // Skip duplicate image
        }

        batchFingerprints.add(fingerprint);

        const previewUrl = URL.createObjectURL(file);
        const item: SelectedImageItem = {
          id: `${file.name}_${file.size}_${Date.now()}_${Math.random()}`,
          file,
          previewUrl,
          name: file.name,
          size: file.size
        };

        // Probe dimensions asynchronously
        const img = new Image();
        img.onload = () => {
          item.width = img.naturalWidth;
          item.height = img.naturalHeight;
        };
        img.src = previewUrl;

        newItems.push(item);
      });

      if (duplicateCount > 0) {
        setDuplicateWarning(
          `Skipped ${duplicateCount} duplicate ${duplicateCount === 1 ? 'image' : 'images'} to prevent repeated uploads.`
        );
      }

      if (newItems.length === 0 && files.length > 0 && duplicateCount === 0) {
        setErrorMessage('No valid image files (JPG, PNG, WEBP) detected.');
        return currentSelected;
      }

      return [...currentSelected, ...newItems];
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (id: string) => {
    setSelectedImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const clearAllImages = () => {
    selectedImages.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setSelectedImages([]);
    setErrorMessage(null);
  };

  // Execute Upload & Queue Creation
  const handleExecuteUpload = async () => {
    if (selectedImages.length === 0) {
      setErrorMessage('Please select at least 1 image.');
      return;
    }

    setShowConfirmModal(false);
    setIsUploading(true);
    setErrorMessage(null);
    setUploadProgress({ current: 0, total: selectedImages.length, percent: 0 });

    try {
      const token = session?.access_token || null;

      // 1. Request batch presigned URLs from server for all images
      const presignPayload = selectedImages.map((img) => ({
        filename: img.name,
        contentType: img.file.type || 'image/webp',
        size: img.size
      }));

      const presignedList = await adminPostQueueService.requestBatchPresignedUploads(presignPayload, token);

      if (presignedList.length !== selectedImages.length) {
        throw new Error('Server returned incomplete presigned upload batch.');
      }

      // 2. Upload images directly to Cloudflare R2 with progress
      const uploadQueue = selectedImages.map((img, idx) => ({
        file: img.file,
        presigned: presignedList[idx]
      }));

      await adminPostQueueService.uploadBatchImagesToR2(uploadQueue, (cur, tot, pct) => {
        setUploadProgress({ current: cur, total: tot, percent: pct });
      });

      // 3. Create persistent Queue records on the server (Zero Gemini calls!)
      const queueItems: CreateBatchQueueItemInput[] = selectedImages.map((img, idx) => ({
        imageUrl: presignedList[idx].publicUrl,
        imageObjectKey: presignedList[idx].objectKey,
        caption: defaultCaption.trim() || undefined,
        imageWidth: img.width || undefined,
        imageHeight: img.height || undefined,
        imageSizeBytes: img.size,
        imageFormat: img.file.type.split('/')[1] || 'webp',
        queuePosition: idx + 1
      }));

      const submitPayload: CreateBatchQueuePayload = {
        batchName: batchName.trim() || undefined,
        defaultCaption: defaultCaption.trim() || undefined,
        intervalMinutes,
        order,
        items: queueItems
      };

      const result = await adminPostQueueService.submitBulkUploadQueue(submitPayload, token);

      if (result.success) {
        clearAllImages();
        if (onQueueCreated) {
          onQueueCreated(result.batchId);
        }
      }
    } catch (err: any) {
      console.error('[AdminBulkUploadTab] Upload failed:', err);
      setErrorMessage(err.message || 'Failed to upload and queue images.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden Multi-File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
      />

      {/* Admin Notice Banner */}
      <div className="p-3.5 bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-blue-900/40 border border-purple-500/30 rounded-2xl flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 border border-purple-400/30">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="space-y-0.5 flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-white">Admin Pre-Approved Media Upload</span>
            <span className="px-2 py-0.5 bg-purple-400/20 text-purple-300 rounded-full text-[10px] font-extrabold uppercase border border-purple-400/30">
              Zero AI Validation
            </span>
          </div>
          <p className="text-[11px] text-purple-200/80 leading-relaxed">
            Uploaded images are marked as administrator-approved, stored securely in Cloudflare R2, and published <strong>one by one</strong> to the public post feed.
          </p>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-950/60 border border-rose-500/40 text-rose-200 rounded-2xl text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Duplicate Warning Notice */}
      {duplicateWarning && (
        <div className="p-3.5 bg-amber-950/60 border border-amber-500/40 text-amber-200 rounded-2xl text-xs flex items-center justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-bold">{duplicateWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => setDuplicateWarning(null)}
            className="text-amber-400 hover:text-white text-xs font-black px-2 py-0.5 rounded-lg bg-amber-900/50 hover:bg-amber-900 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Uploading Progress Overlay */}
      {isUploading ? (
        <div className="p-8 sm:p-10 bg-slate-900/80 border border-sky-500/30 rounded-3xl text-center space-y-4 animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-400/40 text-sky-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(56,189,248,0.25)]">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-black text-white">
              Uploading Images to Cloudflare R2...
            </h3>
            <p className="text-xs text-sky-200/70 font-mono">
              {uploadProgress.current} of {uploadProgress.total} images uploaded ({uploadProgress.percent}%)
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700 max-w-md mx-auto">
            <div
              className="bg-gradient-to-r from-[#026fc3] via-sky-400 to-teal-400 h-full transition-all duration-200 rounded-full"
              style={{ width: `${uploadProgress.percent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Please keep this tab open until upload completes. Once queued, background publishing is fully automatic.
          </p>
        </div>
      ) : (
        <>
          {/* Dropzone & Multi-Image Picker */}
          {selectedImages.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all group ${
                isDragging
                  ? 'border-purple-400 bg-purple-950/40 shadow-[0_0_25px_rgba(168,85,247,0.3)]'
                  : 'border-purple-500/35 hover:border-purple-400/80 bg-purple-950/20 hover:bg-purple-900/25'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#1b1233] border border-purple-400/40 text-purple-300 flex items-center justify-center mx-auto mb-3 shadow-[0_0_15px_rgba(168,85,247,0.25)] group-hover:scale-105 transition-all">
                <UploadCloud className="w-7 h-7 stroke-[2]" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-black text-white tracking-wide">
                  Select Multiple Images (10, 20, 50, 100+)
                </h4>
                <p className="text-xs text-purple-200/70">
                  Drag and drop a folder of images or click to browse files
                </p>
                <p className="text-[11px] text-slate-400 font-mono mt-1">
                  Supported formats: JPG, JPEG, PNG, WEBP (up to 20MB per image)
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="mt-4 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer inline-flex items-center gap-2"
              >
                <Layers className="w-4 h-4" />
                <span>Select Multiple Images</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-700/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white">
                    Selected Images:
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-black">
                    {selectedImages.length} {selectedImages.length === 1 ? 'image' : 'images'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>+ Add More</span>
                  </button>
                  <button
                    type="button"
                    onClick={clearAllImages}
                    className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              {/* Scrollable Thumbnail Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-64 overflow-y-auto p-2 bg-slate-950/40 rounded-2xl border border-slate-800">
                {selectedImages.map((img, idx) => (
                  <div
                    key={img.id}
                    className="relative group aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-xs"
                  >
                    <img
                      src={img.previewUrl}
                      alt={img.name}
                      className="w-full h-full object-cover"
                    />

                    {/* Position Badge */}
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 text-white font-mono text-[10px] font-bold backdrop-blur-xs">
                      #{idx + 1}
                    </div>

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-rose-600/90 text-white hover:bg-rose-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                      title="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    {/* Image Footer */}
                    <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-[10px] text-white/90 font-mono truncate px-1">
                        {img.name}
                      </p>
                      <p className="text-[9px] text-white/60 font-mono px-1">
                        {formatBytes(img.size)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Batch Configuration Form */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Batch Name */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-purple-400" />
                      <span>Batch Name / Reference</span>
                    </label>
                    <input
                      type="text"
                      value={batchName}
                      onChange={(e) => setBatchName(e.target.value)}
                      placeholder="e.g. Grammar Infographics 2026"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-purple-500 font-semibold"
                    />
                  </div>

                  {/* Publishing Interval */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <span>Publishing Interval (One-by-One)</span>
                    </label>
                    <select
                      value={intervalMinutes}
                      onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-sky-500 font-bold"
                    >
                      {QUEUE_INTERVAL_OPTIONS.map((opt) => (
                        <option key={opt.minutes} value={opt.minutes}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Default Caption & Publishing Order */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">
                      Default Post Caption (optional)
                    </label>
                    <input
                      type="text"
                      value={defaultCaption}
                      onChange={(e) => setDefaultCaption(e.target.value)}
                      placeholder="e.g. Daily English Bit #Vocabulary #Grammar"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                      <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Publish Order</span>
                    </label>
                    <select
                      value={order}
                      onChange={(e) => setOrder(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-emerald-500 font-semibold"
                    >
                      <option value="upload_order">Upload Order (1 → N)</option>
                      <option value="reverse_order">Reverse Order (N → 1)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={selectedImages.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-black transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-40 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Upload & Schedule Batch ({selectedImages.length})</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-purple-500/40 rounded-3xl p-6 space-y-4 text-left shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold border border-purple-500/30 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  Confirm Admin Bulk Upload
                </h3>
                <p className="text-xs text-purple-300/80">
                  {selectedImages.length} pre-approved images ready to queue
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs space-y-2 text-slate-300">
              <div className="font-bold text-white">These images will:</div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Upload securely to Cloudflare R2 storage</span>
              </div>
              <div className="flex items-center gap-2 text-purple-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Mark as Administrator-Approved (Zero Gemini AI)</span>
              </div>
              <div className="flex items-center gap-2 text-sky-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Add to persistent server queue & publish one by one</span>
              </div>
              <div className="flex items-center gap-2 text-amber-300 font-mono text-[11px]">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Interval: {QUEUE_INTERVAL_OPTIONS.find((o) => o.minutes === intervalMinutes)?.label}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteUpload}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black cursor-pointer shadow-md active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>Upload & Start Queue</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
