import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Crop,
  Loader2,
  Bot,
  Rocket
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { ImageSquareCropper } from './ImageSquareCropper';
import { UploadBoxIllustration } from './UploadBoxIllustration';
import {
  OptimizationResult,
  validateImageFile,
  formatBytes
} from '@/utils/imageOptimizer';
import { postService } from '@/services/postService';
import { StudentPost } from '@/types/post';

interface PostComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (post: StudentPost) => void;
}

type ComposerStage = 'select' | 'crop' | 'ready' | 'uploading' | 'success';

export const PostComposerModal: React.FC<PostComposerModalProps> = ({
  isOpen,
  onClose,
  onPostCreated
}) => {
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<ComposerStage>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [optimizedImage, setOptimizedImage] = useState<OptimizationResult | null>(null);
  const [caption, setCaption] = useState('');
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stage !== 'uploading') {
        handleClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, stage]);

  if (!isOpen) return null;

  const processSelectedFile = (file: File) => {
    setErrorMessage(null);
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid image file.');
      return;
    }

    setSelectedFile(file);
    setStage('crop');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
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
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleCropComplete = (result: OptimizationResult) => {
    setOptimizedImage(result);
    setStage('ready');
  };

  const handleReCrop = () => {
    if (selectedFile) {
      setStage('crop');
    }
  };

  const handleResetImage = () => {
    if (optimizedImage?.objectUrl) {
      URL.revokeObjectURL(optimizedImage.objectUrl);
    }
    setSelectedFile(null);
    setOptimizedImage(null);
    setStage('select');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (stage === 'uploading') return; // Prevent aborting during active upload
    handleResetImage();
    setCaption('');
    setErrorMessage(null);
    setStage('select');
    onClose();
  };

  const handleSubmitPost = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!optimizedImage) {
      setErrorMessage('Please select and crop an image to upload.');
      return;
    }
    if (stage === 'uploading') return;

    let uploadedObjectKey: string | null = null;
    let token: string | null = null;

    try {
      setErrorMessage(null);
      setStage('uploading');
      setUploadPercent(10);
      setStatusMessage('Verifying authentication…');

      // Obtain fresh Supabase session and access token
      if (supabase) {
        const { data: { session: freshSession }, error: sessError } = await supabase.auth.getSession();
        if (sessError || !freshSession?.access_token) {
          throw new Error('Your session has expired. Please sign in again.');
        }
        token = freshSession.access_token;
      } else if (session?.access_token) {
        token = session.access_token;
      }

      if (!token) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      setStatusMessage('Connecting to R2 storage…');

      // Step 1: Request Presigned URL from Server
      const presignResult = await postService.requestPresignedUpload(
        {
          filename: `post.${optimizedImage.format}`,
          contentType: optimizedImage.blob.type || 'image/webp',
          size: optimizedImage.optimizedSizeBytes
        },
        token
      );

      uploadedObjectKey = presignResult.objectKey;
      setUploadPercent(25);

      // Step 2: Direct Upload to Cloudflare R2 via XHR
      setStatusMessage('Uploading…');
      await postService.uploadBlobToR2(
        presignResult.uploadUrl,
        presignResult.headers,
        optimizedImage.blob,
        (progress) => {
          setUploadPercent(25 + Math.round(progress * 0.55)); // 25% -> 80%
          setStatusMessage(`Uploading… ${progress}%`);
        }
      );

      // Step 3: AI Safety Guideline Moderation & Post Record Creation
      setUploadPercent(85);
      setStatusMessage('AI checking guidelines…');

      const result = await postService.createPost(
        {
          caption: caption.trim() || 'Educational insight from EdTechra.',
          image_url: presignResult.publicUrl,
          image_object_key: presignResult.objectKey,
          storage_provider: 'r2',
          image_width: optimizedImage.width,
          image_height: optimizedImage.height,
          image_size_bytes: optimizedImage.optimizedSizeBytes,
          image_format: optimizedImage.format
        },
        token
      );

      setUploadPercent(100);

      if (result.moderationStatus === 'approved') {
        setStatusMessage('Uploaded!');
        setStage('success');
        onPostCreated(result.post);
        setTimeout(() => {
          handleClose();
        }, 1200);
      } else if (result.moderationStatus === 'review') {
        setStatusMessage('Your post is waiting for review.');
        setStage('success');
        setTimeout(() => {
          handleClose();
        }, 2000);
      }

    } catch (err: any) {
      console.error('[Post Submit Error]:', err);
      setStage('ready');
      setErrorMessage(err.message || 'Upload failed. Please try again.');

      // Rollback R2 object if upload succeeded but DB creation failed
      if (uploadedObjectKey) {
        postService.rollbackR2Upload(uploadedObjectKey, token).catch(() => {});
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-[500px] bg-gradient-to-b from-[#0b1b36] to-[#071328] rounded-[28px] sm:rounded-[32px] border border-sky-500/30 shadow-[0_0_50px_rgba(2,111,195,0.35)] p-5 sm:p-6 space-y-4 sm:space-y-4.5 relative animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        
        {/* Close Button in Top Right */}
        <button
          onClick={handleClose}
          disabled={stage === 'uploading'}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700/60 transition-colors disabled:opacity-30 cursor-pointer z-10"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 1. Header with Top Illustration, Heading & Subtitle */}
        <div className="text-center pt-1 space-y-2">
          <UploadBoxIllustration className="w-20 h-16 sm:w-24 sm:h-20 mx-auto" />

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Share Your Knowledge
            </h2>
            <p className="text-xs sm:text-sm text-sky-200/70 font-normal mt-0.5">
              Share something useful you’ve learned.
            </p>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />

        {/* 2. Crop Stage Overlay */}
        {stage === 'crop' && selectedFile && (
          <div className="pt-1">
            <ImageSquareCropper
              imageFile={selectedFile}
              onCropComplete={handleCropComplete}
              onCancel={handleResetImage}
            />
          </div>
        )}

        {/* 3. Main Form (Select / Ready / Uploading / Success) */}
        {stage !== 'crop' && (
          <div className="space-y-3.5 sm:space-y-4">
            
            {/* Upload Area / Dropzone */}
            {!optimizedImage ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-5 sm:p-6 text-center cursor-pointer transition-all group ${
                  isDragging
                    ? 'border-sky-400 bg-sky-900/40 shadow-[0_0_20px_rgba(56,189,248,0.3)]'
                    : 'border-sky-500/35 hover:border-sky-400/80 bg-sky-950/25 hover:bg-sky-900/25'
                }`}
              >
                {/* Glowing Circular Cloud Icon */}
                <div className="w-12 h-12 rounded-full bg-[#0c2242] border border-sky-400/40 text-[#38bdf8] flex items-center justify-center mx-auto mb-2.5 shadow-[0_0_15px_rgba(56,189,248,0.25)] group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] transition-all">
                  <UploadCloud className="w-6 h-6 stroke-[2]" />
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-sm sm:text-base font-bold text-white tracking-wide">
                    Upload Image or File
                  </h4>
                  <p className="text-xs text-slate-300">
                    JPG, PNG, MP4, PDF and more
                  </p>
                  <p className="text-[11px] text-slate-400/90 font-medium">
                    (Max size: 50MB)
                  </p>
                </div>
              </div>
            ) : (
              /* Selected Image 1:1 Preview Card */
              <div className="border-2 border-dashed border-sky-500/40 bg-sky-950/30 rounded-2xl p-3.5 flex items-center gap-3.5">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-sky-500/30 shadow-xs relative">
                  <img
                    src={optimizedImage.objectUrl}
                    alt="Square preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 right-1 bg-[#026fc3] text-[9px] font-black text-white px-1.5 py-0.2 rounded">
                    1:1
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">
                      {selectedFile?.name || 'Image ready'}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      {formatBytes(optimizedImage.optimizedSizeBytes)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={handleReCrop}
                      disabled={stage === 'uploading'}
                      className="text-sky-300 hover:text-sky-200 font-bold flex items-center gap-1 hover:underline cursor-pointer disabled:opacity-40"
                    >
                      <Crop className="w-3 h-3" />
                      <span>Adjust Crop</span>
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={handleResetImage}
                      disabled={stage === 'uploading'}
                      className="text-slate-400 hover:text-rose-300 font-medium transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Change
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Short Explanation Textarea with live character counter */}
            <div className="relative">
              <textarea
                rows={3}
                maxLength={300}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={stage === 'uploading' || stage === 'success'}
                placeholder="Write a short explanation (optional)..."
                className="w-full px-4 py-3 bg-[#0a1832] border border-sky-900/60 focus:border-sky-400/80 rounded-2xl text-xs sm:text-sm text-slate-100 placeholder-slate-400/70 focus:outline-none transition-all resize-none shadow-inner pb-7"
              />
              <div className="absolute right-3.5 bottom-2.5 text-[11px] font-semibold text-slate-400 select-none pointer-events-none">
                {caption.length} / 300
              </div>
            </div>

            {/* 4. AI Review Information Row */}
            <div className="bg-[#0a1b38]/90 border border-sky-500/20 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 text-xs text-sky-100/90 shadow-sm">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <span className="font-medium text-slate-200">
                AI will review and categorize your post. ✨
              </span>
            </div>

            {/* Upload Progress Bar (when uploading) */}
            {stage === 'uploading' && (
              <div className="p-3 bg-sky-950/50 border border-sky-500/30 rounded-2xl space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-sky-300">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                    <span>{statusMessage}</span>
                  </span>
                  <span className="font-mono text-sky-200">{uploadPercent}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(56,189,248,0.5)]"
                    style={{ width: `${uploadPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Success Notification */}
            {stage === 'success' && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in zoom-in-95">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{statusMessage || 'Post published successfully!'}</span>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/40 text-rose-300 rounded-2xl flex items-center gap-2 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 5. Large Primary Action Button */}
            <button
              type="button"
              onClick={() => handleSubmitPost()}
              disabled={stage === 'uploading' || stage === 'success' || !optimizedImage}
              className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#026fc3] via-[#0284c7] to-[#0ea5e9] hover:from-[#025ea6] hover:to-[#0284c7] text-white font-black text-sm sm:text-base shadow-[0_0_25px_rgba(2,111,195,0.45)] hover:shadow-[0_0_35px_rgba(14,165,233,0.65)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {stage === 'uploading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : stage === 'success' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Uploaded!</span>
                </>
              ) : errorMessage ? (
                <>
                  <Rocket className="w-4 h-4" />
                  <span>Try Again</span>
                </>
              ) : (
                <>
                  <span className="text-base">🚀</span>
                  <span>Upload & Submit</span>
                </>
              )}
            </button>

          </div>
        )}

      </div>
    </div>
  );
};
