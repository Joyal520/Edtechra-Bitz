// ============================================================================
// EDTECHRA-BITZ: BitzReadingVisual
// Displays the Bitz illustration / visual card.
// Desktop: positioned in the right column above the Key Takeaway.
// Mobile: compact visual below title & badges without dominating the screen.
// Elegant unobtrusive fallback when no visual exists or image fails to load.
// ============================================================================

import React, { useState } from 'react';
import { Sparkles, Image as ImageIcon } from 'lucide-react';

interface BitzReadingVisualProps {
  visualUrl?: string | null;
  title: string;
  categoryName?: string;
  categoryColor?: string;
  variant?: 'desktop' | 'mobile';
}

export const BitzReadingVisual: React.FC<BitzReadingVisualProps> = ({
  visualUrl,
  title,
  categoryName = 'Knowledge Bitz',
  categoryColor = '#38bdf8',
  variant = 'desktop'
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const hasValidImage = Boolean(visualUrl) && !imageFailed;

  if (variant === 'mobile') {
    if (!hasValidImage) {
      return null; // Keep mobile compact if no image
    }

    return (
      <div className="w-full rounded-2xl overflow-hidden border border-sky-900/35 bg-[#051125] shadow-lg shadow-black/25 relative max-h-[220px] aspect-[16/10] my-2">
        {!isLoaded && (
          <div className="absolute inset-0 bg-slate-900/60 animate-pulse flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-slate-600" />
          </div>
        )}
        <img
          src={visualUrl!}
          alt={title}
          onError={() => setImageFailed(true)}
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="eager"
        />
      </div>
    );
  }

  // Desktop Visual Box
  return (
    <div className="w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-sky-900/35 bg-gradient-to-br from-[#06142a] via-[#071935] to-[#040e24] shadow-xl shadow-black/30 relative aspect-square max-h-[380px] flex items-center justify-center">
      {hasValidImage ? (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 bg-slate-900/60 animate-pulse flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-slate-600" />
            </div>
          )}
          <img
            src={visualUrl!}
            alt={title}
            onError={() => setImageFailed(true)}
            onLoad={() => setIsLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="eager"
          />
        </>
      ) : (
        // Elegant, unobtrusive visual placeholder with category gradient
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-15 blur-2xl"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${categoryColor}, transparent 70%)`
            }}
          />
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg relative z-10"
            style={{ backgroundColor: `${categoryColor}22` }}
          >
            <Sparkles className="w-7 h-7" style={{ color: categoryColor }} />
          </div>
          <div className="space-y-1 relative z-10">
            <span
              className="text-[11px] font-black uppercase tracking-wider block font-ui"
              style={{ color: categoryColor }}
            >
              {categoryName}
            </span>
            <p className="text-xs text-slate-400 font-ui font-medium max-w-[200px] mx-auto line-clamp-2">
              {title}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
