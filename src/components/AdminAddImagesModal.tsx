// ============================================================================
// EDTECHRA-BITZ: Admin "Add Images" Assembly-Line Workflow Modal
// Fast manual image assignment pipeline:
// Drop Image -> Instant Preview -> Upload & Next -> Sharp (85 WebP) -> R2 -> DB -> Next Bitz
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
  Check,
  RotateCcw
} from 'lucide-react';
import { KnowledgeBitzItem } from '@/types';
import { knowledgeBitzService } from '@/services/knowledgeBitzService';
import { useAuth } from '@/context/AuthContext';

interface AdminAddImagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBitzUpdated?: (bitzId: string, publicUrl: string) => void;
}

export const AdminAddImagesModal: React.FC<AdminAddImagesModalProps> = ({
  isOpen,
  onClose,
  onBitzUpdated
}) => {
  const { session } = useAuth();
  const token = session?.access_token || null;

  // Queue state
  const [queue, setQueue] = useState<KnowledgeBitzItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [totalQueueCount, setTotalQueueCount] = useState<number>(0);
  const [loadingQueue, setLoadingQueue] = useState<boolean>(true);
  const [queueError, setQueueError] = useState<string | null>(null);

  // Active item upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'optimizing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Exit confirmation dialog state
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch missing images queue on open
  const fetchQueue = useCallback(async () => {
    setLoadingQueue(true);
    setQueueError(null);
    setCurrentIndex(0);
    setCompletedCount(0);
    try {
      const res = await knowledgeBitzService.getMissingImagesQueue(100, token);
      if (res.success) {
        setQueue(res.bitz || []);
        setTotalQueueCount(res.totalMissing || res.bitz?.length || 0);
      } else {
        setQueueError('Failed to retrieve Bitz records needing images.');
      }
    } catch (err: any) {
      console.error('[AdminAddImagesModal] Queue fetch error:', err);
      setQueueError(err.message || 'Failed to load images queue.');
    } finally {
      setLoadingQueue(false);
    }
  }, [token]);

  useEffect(() => {
    if (isOpen) {
      fetchQueue();
      resetItemState();
    }
  }, [isOpen, fetchQueue]);

  // Reset file and preview state when moving to another item
  const resetItemState = () => {
    setSelectedFile(null);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setBase64Data(null);
    setUploadState('idle');
    setErrorMessage(null);
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Validate and process selected file
  const handleProcessFile = (file: File) => {
    setErrorMessage(null);
    setUploadState('idle');

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setErrorMessage('Unsupported file format. Please choose a JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Image file exceeds the 10 MB limit. Please select a smaller file.');
      return;
    }

    setSelectedFile(file);

    // Create local object URL for instant UI preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Read as Base64 for server upload
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setBase64Data(result);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read selected image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleProcessFile(files[0]);
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

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleProcessFile(files[0]);
    }
  };

  const currentBitz: KnowledgeBitzItem | undefined = queue[currentIndex];

  // Primary Action: Upload & Next
  const handleUploadAndNext = async () => {
    if (!currentBitz || !selectedFile || uploadState === 'uploading' || uploadState === 'optimizing') {
      return;
    }

    setUploadState('uploading');
    setErrorMessage(null);

    try {
      // Transition to optimizing indicator
      setTimeout(() => {
        setUploadState((prev) => (prev === 'uploading' ? 'optimizing' : prev));
      }, 300);

      const res = await knowledgeBitzService.uploadBitzManualImage(currentBitz.id, selectedFile, token);

      if (res.success && res.publicUrl) {
        setUploadState('success');
        setCompletedCount((prev) => prev + 1);

        if (onBitzUpdated) {
          onBitzUpdated(currentBitz.id, res.publicUrl);
        }

        // Auto-transition to next Bitz after brief feedback (~400ms)
        setTimeout(() => {
          resetItemState();
          setCurrentIndex((prev) => prev + 1);
        }, 400);
      } else {
        throw new Error('Image uploaded, but the Bitz record could not be updated.');
      }
    } catch (err: any) {
      console.error('[AdminAddImagesModal] Upload error:', err);
      setUploadState('error');
      setErrorMessage(err.message || 'Image uploaded, but the Bitz record could not be updated.');
    }
  };

  // Secondary Action: Skip
  const handleSkip = () => {
    if (uploadState === 'uploading' || uploadState === 'optimizing') return;
    resetItemState();
    setCurrentIndex((prev) => prev + 1);
  };

  // Keyboard shortcut: Enter triggers Upload & Next, Escape triggers close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && selectedFile && base64Data && uploadState !== 'uploading' && uploadState !== 'optimizing' && uploadState !== 'success') {
        e.preventDefault();
        handleUploadAndNext();
      } else if (e.key === 'Escape') {
        if (uploadState === 'uploading' || uploadState === 'optimizing') {
          setShowExitConfirm(true);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedFile, base64Data, uploadState, currentBitz]);

  // Close handler with active upload protection
  const handleAttemptClose = () => {
    if (uploadState === 'uploading' || uploadState === 'optimizing') {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const isQueueFinished = !loadingQueue && (queue.length === 0 || currentIndex >= queue.length);
  const remainingCount = Math.max(0, queue.length - currentIndex);
  const progressPercent = totalQueueCount > 0 ? Math.min(100, Math.round((completedCount / totalQueueCount) * 100)) : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#091528] text-white rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden max-h-[96vh] sm:max-h-[90vh]">
        {/* Top Progress Bar */}
        <div className="w-full bg-slate-800 h-1">
          <div
            className="bg-gradient-to-r from-blue-500 to-sky-400 h-1 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#06101E]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-ui font-black text-base sm:text-lg text-white leading-tight">
                Add Images
              </h2>
              {!isQueueFinished && !loadingQueue && queue.length > 0 && (
                <div className="font-ui flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="font-bold text-sky-400">
                    IMAGE {currentIndex + 1} OF {queue.length}
                  </span>
                  <span>•</span>
                  <span>{remainingCount} images remaining</span>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAttemptClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* STATE 1: LOADING QUEUE */}
          {loadingQueue && (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
              <p className="font-ui text-sm font-semibold">Finding Bitz records without images...</p>
            </div>
          )}

          {/* STATE 2: QUEUE ERROR */}
          {!loadingQueue && queueError && (
            <div className="p-5 rounded-2xl bg-rose-950/60 border border-rose-600/60 text-rose-200 space-y-3 text-center my-6">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="font-ui text-sm font-bold">{queueError}</p>
              <button
                type="button"
                onClick={fetchQueue}
                className="font-ui inline-flex items-center gap-1.5 px-4 py-2 bg-rose-800 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* STATE 3: ALL IMAGES COMPLETED / EMPTY QUEUE */}
          {!loadingQueue && !queueError && isQueueFinished && (
            <div className="py-12 sm:py-16 text-center space-y-5 max-w-sm mx-auto animate-scale-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-2xl sm:text-3xl font-normal text-white">
                  All Images Added
                </h3>
                <p className="font-ui text-sm text-emerald-400 font-bold">
                  {completedCount} Bitz completed
                </p>
                <p className="font-ui text-xs sm:text-sm text-slate-400 pt-1">
                  Your image catalogue is completely up to date.
                </p>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="font-ui px-8 py-3 bg-gradient-to-r from-[#1677FF] to-[#026fc3] hover:from-[#2D8CFF] hover:to-[#1677FF] text-white text-sm font-bold rounded-full shadow-lg shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: ACTIVE IMAGE ASSIGNMENT */}
          {!loadingQueue && !queueError && !isQueueFinished && currentBitz && (
            <div className="space-y-5">
              {/* Drop / Preview Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !previewUrl && fileInputRef.current?.click()}
                className={`relative rounded-2xl border-2 transition-all overflow-hidden ${
                  previewUrl
                    ? 'border-slate-700 bg-slate-900/90'
                    : isDragging
                    ? 'border-sky-400 bg-sky-950/40 cursor-pointer shadow-lg shadow-sky-500/20'
                    : 'border-dashed border-slate-700 hover:border-sky-500/60 bg-slate-900/60 hover:bg-slate-900/90 cursor-pointer'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {previewUrl ? (
                  /* Image Preview Mode */
                  <div className="relative group flex flex-col items-center justify-center p-3">
                    <div className="w-full max-h-[260px] sm:max-h-[300px] aspect-video sm:aspect-square max-w-sm mx-auto rounded-xl overflow-hidden bg-black/60 border border-slate-700 flex items-center justify-center">
                      <img
                        src={previewUrl}
                        alt="Selected preview"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="pt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="font-ui flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Replace Image</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Drop / Select Placeholder */
                  <div className="py-10 sm:py-14 px-4 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-sky-400">
                      <Upload className="w-6 h-6 stroke-[2]" />
                    </div>
                    <div>
                      <p className="font-ui text-sm sm:text-base font-bold text-white uppercase tracking-wide">
                        DROP IMAGE HERE
                      </p>
                      <p className="font-ui text-xs text-slate-400 pt-0.5">
                        or <span className="text-sky-400 underline font-semibold">Choose Image</span> (.jpg, .png, .webp up to 10MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Validation / Processing Error Notice */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-600 text-rose-200 text-xs sm:text-sm font-medium flex items-center justify-between gap-2 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                  {uploadState === 'error' && (
                    <button
                      type="button"
                      onClick={handleUploadAndNext}
                      className="px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              {/* Bitz Context Card: Title & Full Short Fact */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                {/* Title */}
                <h3 className="font-display text-lg sm:text-xl font-normal text-white leading-snug">
                  {currentBitz.title}
                </h3>

                {/* Complete Short Fact */}
                <p className="font-ui text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                  {currentBitz.short_fact}
                </p>

                {/* Metadata Pills */}
                <div className="font-ui flex items-center gap-2 pt-1 flex-wrap text-[11px] text-slate-400 font-semibold">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-sky-300">
                    {currentBitz.category}
                  </span>
                  {currentBitz.sub_topic && (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                      {currentBitz.sub_topic}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-400/30 text-purple-300">
                    {currentBitz.cefr_level || 'A1'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-400">
                    {currentBitz.difficulty || 'Easy'}
                  </span>
                </div>
              </div>

              {/* Assembly Actions Bar */}
              <div className="flex items-center justify-between pt-2 gap-3">
                <button
                  type="button"
                  disabled={uploadState === 'uploading' || uploadState === 'optimizing'}
                  onClick={handleSkip}
                  className="font-ui px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Skip
                </button>

                <button
                  type="button"
                  disabled={!selectedFile || uploadState === 'uploading' || uploadState === 'optimizing' || uploadState === 'success'}
                  onClick={handleUploadAndNext}
                  className={`font-ui flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer ${
                    uploadState === 'success'
                      ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                      : !selectedFile || uploadState === 'uploading' || uploadState === 'optimizing'
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#1677FF] to-[#026fc3] hover:from-[#2D8CFF] hover:to-[#1677FF] text-white shadow-blue-600/30'
                  }`}
                >
                  {uploadState === 'uploading' && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Uploading...</span>
                    </>
                  )}
                  {uploadState === 'optimizing' && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-sky-300" />
                      <span>Optimizing & Saving...</span>
                    </>
                  )}
                  {uploadState === 'success' && (
                    <>
                      <Check className="w-4 h-4 stroke-[3] text-white" />
                      <span>✓ Image saved</span>
                    </>
                  )}
                  {(uploadState === 'idle' || uploadState === 'error') && (
                    <>
                      <span>Upload & Next</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Exit Confirmation Dialog Modal */}
        {showExitConfirm && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#091528] border border-slate-700 p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
              <div className="space-y-1">
                <h4 className="font-ui text-base font-bold text-white">Upload in progress</h4>
                <p className="font-ui text-xs text-slate-300">
                  An image is currently uploading and being saved to R2. Are you sure you want to leave this workflow?
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="font-ui px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all"
                >
                  Continue Upload
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExitConfirm(false);
                    onClose();
                  }}
                  className="font-ui px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white text-xs font-bold transition-all"
                >
                  Leave
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
