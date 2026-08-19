import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Check, Move, Info } from 'lucide-react';
import {
  CropArea,
  OptimizationResult,
  optimizeAndCropImage
} from '@/utils/imageOptimizer';

interface ImageSquareCropperProps {
  imageFile: File;
  onCropComplete: (result: OptimizationResult) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export const ImageSquareCropper: React.FC<ImageSquareCropperProps> = ({
  imageFile,
  onCropComplete,
  onCancel,
  isProcessing = false
}) => {
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cropError, setCropError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load Image File
  useEffect(() => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(imageFile);
    img.src = objectUrl;

    img.onload = () => {
      setImageElement(img);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };

    img.onerror = () => {
      setCropError('Failed to decode image file. Please try another image.');
    };

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  // Pointer event handlers for pan/drag (works for both Mouse and Touch)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y
    });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch (err) {
      // Ignore if pointer capture release is not needed
    }
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleConfirmCrop = useCallback(async () => {
    if (!imageElement || !containerRef.current) return;

    try {
      setCropError(null);
      const naturalWidth = imageElement.naturalWidth;
      const naturalHeight = imageElement.naturalHeight;

      // Determine viewport dimensions
      const viewportSize = containerRef.current.clientWidth || 320;

      // Scale factor mapping container viewport pixels to natural image pixels
      const baseScale = Math.max(viewportSize / naturalWidth, viewportSize / naturalHeight);
      const effectiveScale = baseScale * zoom;

      const renderedWidth = naturalWidth * effectiveScale;
      const renderedHeight = naturalHeight * effectiveScale;

      // Center offset + user pan
      const centerX = (viewportSize - renderedWidth) / 2 + offset.x;
      const centerY = (viewportSize - renderedHeight) / 2 + offset.y;

      // Convert viewport square (0,0 to viewportSize,viewportSize) to natural image coordinates
      const cropX = Math.max(0, -centerX / effectiveScale);
      const cropY = Math.max(0, -centerY / effectiveScale);
      const cropSize = Math.min(
        naturalWidth - cropX,
        naturalHeight - cropY,
        viewportSize / effectiveScale
      );

      const cropArea: CropArea = {
        x: cropX,
        y: cropY,
        size: cropSize
      };

      const result = await optimizeAndCropImage(
        imageElement,
        cropArea,
        imageFile.size,
        {
          maxDimension: 1920,
          preferredDimension: 1600,
          initialQuality: 0.88,
          minQuality: 0.78,
          preserveTransparency: true
        }
      );

      onCropComplete(result);
    } catch (err: any) {
      console.error('[Cropper Error]:', err);
      setCropError(err.message || 'Error processing and compressing image.');
    }
  }, [imageElement, zoom, offset, imageFile, onCropComplete]);

  return (
    <div className="flex flex-col items-center space-y-4 w-full select-none">
      
      {/* 1:1 Aspect Ratio Crop Viewport with Grid */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-full aspect-square max-w-[340px] sm:max-w-[380px] bg-slate-900 rounded-3xl overflow-hidden shadow-inner border-2 border-brand-400/80 cursor-grab active:cursor-grabbing touch-none flex items-center justify-center group"
      >
        {imageElement && (
          <div
            className="absolute transition-transform duration-75 origin-center pointer-events-none"
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src={imageElement.src}
              alt="Crop target"
              className="max-w-none pointer-events-none select-none object-cover"
              style={{
                width: imageElement.naturalWidth >= imageElement.naturalHeight ? 'auto' : '100%',
                height: imageElement.naturalHeight >= imageElement.naturalWidth ? 'auto' : '100%',
                minWidth: '100%',
                minHeight: '100%'
              }}
              draggable={false}
            />
          </div>
        )}

        {/* Rule of Thirds Crop Overlay Grid */}
        <div className="absolute inset-0 pointer-events-none border border-white/40 grid grid-cols-3 grid-rows-3 rounded-2xl">
          <div className="border-r border-b border-white/25"></div>
          <div className="border-r border-b border-white/25"></div>
          <div className="border-b border-white/25"></div>
          <div className="border-r border-b border-white/25"></div>
          <div className="border-r border-b border-white/25"></div>
          <div className="border-b border-white/25"></div>
          <div className="border-r border-white/25"></div>
          <div className="border-r border-white/25"></div>
          <div></div>
        </div>

        {/* Pan Indicator Pill */}
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-bold flex items-center gap-1.5 pointer-events-none">
          <Move className="w-3 h-3 text-brand-300" />
          <span>Drag to pan</span>
        </div>

        {/* 1:1 Aspect Badge */}
        <div className="absolute top-3 right-3 bg-[#026fc3]/90 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-black uppercase tracking-wider shadow-xs pointer-events-none">
          1:1 Square
        </div>
      </div>

      {/* Helper Note */}
      <div className="flex items-center gap-1.5 text-xs text-sky-200/80 font-medium text-center">
        <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span>Posts must be square (1:1). Reposition and zoom inside the crop frame.</span>
      </div>

      {/* Zoom Controls & Slider */}
      <div className="w-full max-w-[340px] sm:max-w-[380px] bg-[#0c1e3d] border border-sky-500/20 rounded-2xl p-3 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-200">
          <div className="flex items-center gap-1">
            <ZoomIn className="w-3.5 h-3.5 text-sky-400" />
            <span>Zoom</span>
          </div>
          <span className="text-[11px] font-mono text-sky-300 font-bold">{zoom.toFixed(1)}x</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, Number((z - 0.1).toFixed(1))))}
            disabled={zoom <= 1 || isProcessing}
            className="p-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            disabled={isProcessing}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />

          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, Number((z + 0.1).toFixed(1))))}
            disabled={zoom >= 3 || isProcessing}
            className="p-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isProcessing}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-sky-400 hover:bg-slate-700 transition-colors cursor-pointer"
            title="Reset pan and zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {cropError && (
        <div className="w-full max-w-[380px] p-2.5 bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-xl text-center">
          {cropError}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 w-full max-w-[340px] sm:max-w-[380px] pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl transition-colors cursor-pointer border border-slate-700/60"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleConfirmCrop}
          disabled={isProcessing || !imageElement}
          className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#026fc3] to-[#0ea5e9] hover:from-[#025ea6] hover:to-[#0284c7] text-white text-xs font-black rounded-2xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Check className="w-4 h-4 stroke-[2.5]" />
          <span>Apply 1:1 Crop</span>
        </button>
      </div>

    </div>
  );
};
