import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { YouTubeVideo } from '@/types';
import { youtubeClient } from '@/services/youtubeClient';
import { useAuth } from '@/context/AuthContext';

interface AdminThumbnailModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: YouTubeVideo | null;
  levelNumber?: number;
  onThumbnailUpdated: (videoId: string, newThumbnailUrl: string) => void;
}

export const AdminThumbnailModal: React.FC<AdminThumbnailModalProps> = ({
  isOpen,
  onClose,
  video,
  levelNumber,
  onThumbnailUpdated
}) => {
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isSquare, setIsSquare] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Reset state on open/close or video change
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setDimensions(null);
      setIsSquare(false);
      setError(null);
      setSuccessMsg(null);
      setUploading(false);
    }
  }, [isOpen, video?.youtube_video_id]);

  if (!isOpen || !video) return null;

  const currentThumbnail = video.thumbnail_url || `https://i.ytimg.com/vi/${video.youtube_video_id}/maxresdefault.jpg`;
  const isCustomR2Thumbnail = currentThumbnail.includes('r2.dev') || currentThumbnail.includes('cloudflarestorage.com');

  const processFile = (file: File) => {
    setError(null);
    setSuccessMsg(null);

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setError('Unsupported image format. Please select a JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('Image file exceeds the 15 MB limit. Please select a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const ratio = w / h;

        // Strict 1:1 validation (within 2% aspect ratio tolerance)
        if (Math.abs(ratio - 1) > 0.02) {
          setError(`Please upload a 1:1 square image. (Selected image is ${w}×${h}px, aspect ratio: ${ratio.toFixed(2)}:1)`);
          setSelectedFile(null);
          setPreviewUrl(null);
          setDimensions(null);
          setIsSquare(false);
        } else {
          setSelectedFile(file);
          setPreviewUrl(dataUrl);
          setDimensions({ width: w, height: h });
          setIsSquare(true);
          setError(null);
        }
      };
      img.onerror = () => {
        setError('Failed to load and validate image dimensions.');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const handleUploadAndSave = async () => {
    if (!selectedFile || !isSquare) {
      setError('Please select a valid 1:1 square image first.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const token = session?.access_token || null;
      const targetVideoId = video.youtube_video_id || video.id;

      // 1. Request presigned upload URL from server
      const presigned = await youtubeClient.getThumbnailPresignedUrl(
        targetVideoId,
        {
          filename: selectedFile.name,
          contentType: selectedFile.type,
          size: selectedFile.size
        },
        token
      );

      // 2. Upload binary directly to Cloudflare R2
      await youtubeClient.uploadThumbnailToR2(
        presigned.uploadUrl,
        selectedFile,
        selectedFile.type
      );

      // 3. Save thumbnail URL to Supabase and cache
      const updateResult = await youtubeClient.updateVideoThumbnail(
        targetVideoId,
        presigned.publicUrl,
        token
      );

      if (updateResult.success) {
        setSuccessMsg('1:1 Square thumbnail uploaded and saved successfully!');
        onThumbnailUpdated(targetVideoId, presigned.publicUrl);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      console.error('[AdminThumbnailModal] Upload error:', err);
      setError(err.message || 'Failed to upload and associate thumbnail.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200/90 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-blue-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 text-[#026fc3] border border-brand-200 flex items-center justify-center font-bold">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-[#0f233a]">
                  Manage 1:1 Video Thumbnail
                </h3>
                {levelNumber && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-brand-500 text-white uppercase">
                    Level {levelNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-semibold truncate max-w-xs sm:max-w-sm">
                {video.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={uploading}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Success Message */}
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2.5 animate-in zoom-in-95">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5 animate-in zoom-in-95">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-bold">{error}</span>
            </div>
          )}

          {/* Current vs New Thumbnail Comparison */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Current Active Thumbnail */}
            <div className="space-y-1.5 text-center">
              <span className="text-[11px] font-bold text-slate-500 block">
                Current Thumbnail
              </span>
              <div className="aspect-square w-full rounded-2xl overflow-hidden border border-stone-200 bg-slate-900 relative shadow-inner group">
                <img
                  src={currentThumbnail}
                  alt="Current Thumbnail"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-extrabold backdrop-blur-md text-white bg-black/60">
                  {isCustomR2Thumbnail ? '1:1 Custom R2' : 'YouTube Default'}
                </div>
              </div>
            </div>

            {/* New Uploaded 1:1 Preview */}
            <div className="space-y-1.5 text-center">
              <span className="text-[11px] font-bold text-slate-500 block">
                New 1:1 Preview
              </span>
              <div className="aspect-square w-full rounded-2xl overflow-hidden border-2 border-dashed border-brand-300 bg-brand-50/30 relative flex flex-col items-center justify-center shadow-inner">
                {previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt="New 1:1 Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-extrabold backdrop-blur-md text-white bg-emerald-600/90 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>{dimensions?.width}×{dimensions?.height} (1:1)</span>
                    </div>
                  </>
                ) : (
                  <div className="p-3 text-center space-y-1 text-slate-400">
                    <ImageIcon className="w-8 h-8 mx-auto opacity-50 text-[#026fc3]" />
                    <p className="text-[11px] font-semibold">No new image selected</p>
                    <p className="text-[9px] text-slate-400">1:1 Square Required</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Upload Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#026fc3] bg-blue-50/60 scale-[0.99]'
                : 'border-slate-300 hover:border-[#026fc3] bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="space-y-1.5">
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-[#026fc3] flex items-center justify-center mx-auto shadow-2xs">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Click to browse or drag & drop a 1:1 image
                </p>
                <p className="text-[11px] text-slate-400 font-medium">
                  JPG, PNG, or WebP (Strict 1:1 aspect ratio, up to 15MB)
                </p>
              </div>
            </div>
          </div>

          {/* Guidance Note */}
          <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-2xl text-[11px] text-slate-600 space-y-1">
            <div className="font-bold text-[#026fc3] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Micro-Learning Zone Thumbnail Rules:</span>
            </div>
            <p className="leading-relaxed">
              Thumbnails are securely hosted on Cloudflare R2 and will immediately display on the corresponding Level card in the <strong>EdTechra Micro Learning Zone</strong> and Post Feed references.
            </p>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-stone-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleUploadAndSave}
            disabled={!selectedFile || !isSquare || uploading}
            className={`px-5 py-2.5 text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-2 ${
              !selectedFile || !isSquare || uploading
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#026fc3] hover:bg-[#025ea6] text-white active:scale-95 cursor-pointer shadow-md'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Uploading to R2...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Save 1:1 Thumbnail</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
