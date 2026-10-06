import React, { useState, useEffect } from 'react';
import {
  FileText,
  Presentation,
  Globe,
  Download,
  Eye,
  Play,
  User
} from 'lucide-react';
import { LibraryResource } from '@/types/library';
import { extractPptxCoverFromUrl } from '@/utils/pptxParser';

interface LibraryCardProps {
  resource: LibraryResource;
  onOpen: (resource: LibraryResource) => void;
  onDownload?: (resource: LibraryResource) => void;
  onPresent?: (resource: LibraryResource) => void;
}

export const LibraryCard: React.FC<LibraryCardProps> = ({
  resource,
  onOpen,
  onDownload,
  onPresent
}) => {
  const isPptx = resource.file_type === 'pptx';
  const isWebBlog =
    resource.file_type === 'web_blog' ||
    resource.category === 'Web / Blogs' ||
    resource.file_url?.endsWith('.html') ||
    resource.file_key?.endsWith('.html');
  const [coverUrl, setCoverUrl] = useState<string | null>(resource.cover_image_url || null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
    if (resource.cover_image_url) {
      setCoverUrl(resource.cover_image_url);
      return;
    }

    // Auto-extract first slide cover from PPTX URL if cover_image_url is not set in DB
    if (isPptx && resource.file_url) {
      let isMounted = true;
      extractPptxCoverFromUrl(resource.file_url).then((extractedUrl) => {
        if (isMounted && extractedUrl) {
          setCoverUrl(extractedUrl);
        }
      }).catch((err) => {
        console.warn('[LibraryCard] PPTX first slide cover fetch notice:', err);
      });

      return () => {
        isMounted = false;
      };
    }
  }, [resource.cover_image_url, isPptx, resource.file_url]);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes <= 0) return '';
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload(resource);
    } else {
      const link = document.createElement('a');
      link.href = resource.file_url;
      link.download = `${resource.title}.${resource.file_type}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div
      onClick={() => onOpen(resource)}
      className="group bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 hover:border-[#026fc3]/50 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer relative"
    >
      {/* Cover / Preview Image Banner */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 shrink-0">
        {coverUrl && !imageError ? (
          <img
            src={coverUrl}
            alt={resource.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => {
              setImageError(true);
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-white/80 space-y-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-radial from-white/10 to-transparent opacity-40" />
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white shadow-inner group-hover:scale-110 transition-transform">
              {isPptx ? (
                <Presentation className="w-6 h-6 text-amber-400" />
              ) : isWebBlog ? (
                <Globe className="w-6 h-6 text-emerald-400" />
              ) : (
                <FileText className="w-6 h-6 text-rose-400" />
              )}
            </div>
            <span className="text-[11px] font-black tracking-widest uppercase text-white/60">
              {resource.subject}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

        {/* Top Badges: File Type & Grade */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black shadow-md backdrop-blur-md uppercase tracking-wider ${
              isPptx
                ? 'bg-amber-500/90 text-white border border-amber-300/40'
                : isWebBlog
                ? 'bg-emerald-600/90 text-white border border-emerald-300/40'
                : 'bg-rose-600/90 text-white border border-rose-300/40'
            }`}
          >
            {isPptx ? (
              <Presentation className="w-3 h-3 stroke-[2.5]" />
            ) : isWebBlog ? (
              <Globe className="w-3 h-3 stroke-[2.5]" />
            ) : (
              <FileText className="w-3 h-3 stroke-[2.5]" />
            )}
            <span>{isWebBlog ? 'WEB / BLOG' : resource.file_type.toUpperCase()}</span>
          </span>

          {resource.grade_level && (
            <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-slate-900/80 text-white border border-white/20 backdrop-blur-md">
              {resource.grade_level}
            </span>
          )}
        </div>

        {/* Quick Hover Action Overlay */}
        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(resource);
            }}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-black shadow-lg flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#026fc3]" />
            <span>{isPptx ? 'Present' : isWebBlog ? 'Read Article' : 'View PDF'}</span>
          </button>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          {/* Category & Subject meta tags */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-50 text-[#026fc3] border border-sky-200">
              {resource.subject}
            </span>
            {resource.category && (
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                {resource.category}
              </span>
            )}
            {formatFileSize(resource.file_size) && (
              <span className="text-[10px] font-mono text-slate-400 font-semibold ml-auto">
                {formatFileSize(resource.file_size)}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm sm:text-base font-black text-slate-900 line-clamp-1 group-hover:text-[#026fc3] transition-colors">
            {resource.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed min-h-[34px]">
            {resource.description || `Educational ${resource.file_type.toUpperCase()} resource available for study and presentation.`}
          </p>
        </div>

        {/* Card Footer: Author + Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
          {/* Author/Uploader attribution */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold truncate min-w-0">
            <User className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">
              {resource.author || resource.uploader?.full_name || 'EdTechra Faculty'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownloadClick}
              title="Download file"
              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-transparent hover:border-slate-200 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* PPTX Present, Web/Blog Read, or PDF View */}
            {isPptx ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onPresent) onPresent(resource);
                  else onOpen(resource);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Present</span>
              </button>
            ) : isWebBlog ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(resource);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                <Eye className="w-3 h-3" />
                <span>Read</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(resource);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#026fc3] hover:bg-[#025ea6] text-white rounded-xl text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                <Eye className="w-3 h-3" />
                <span>Open</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
