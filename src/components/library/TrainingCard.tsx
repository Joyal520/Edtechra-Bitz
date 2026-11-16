import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Play,
  Video,
  FileText,
  Presentation,
  Laptop,
  Clock,
  User,
  BarChart3
} from 'lucide-react';
import { LibraryResource, getNormalizedTrainingFormat } from '@/types/library';
import { getDefaultCoverDataUri } from '@/utils/libraryCovers';

interface TrainingCardProps {
  resource: LibraryResource;
  onStart: (resource: LibraryResource) => void;
}

export const TrainingCard: React.FC<TrainingCardProps> = ({ resource, onStart }) => {
  const defaultFallbackCover = getDefaultCoverDataUri('training', resource.title);
  const [coverUrl, setCoverUrl] = useState<string>(resource.cover_image_url || defaultFallbackCover);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
    setCoverUrl(resource.cover_image_url || defaultFallbackCover);
  }, [resource.cover_image_url, defaultFallbackCover]);

  const format = getNormalizedTrainingFormat(resource);
  const instructor = resource.instructor || resource.author || resource.uploader?.full_name || 'EdTechra Faculty';
  const difficulty = resource.difficulty || 'Beginner';
  const duration = resource.duration || 'Self-paced';

  const formatMeta = {
    video: { label: 'VIDEO', Icon: Video },
    pdf: { label: 'PDF GUIDE', Icon: FileText },
    pptx: { label: 'SLIDE DECK', Icon: Presentation },
    interactive: { label: 'INTERACTIVE', Icon: Laptop }
  }[format];

  const FormatIcon = formatMeta.Icon;

  const difficultyStyles: Record<string, string> = {
    Beginner: 'bg-emerald-500/90 text-white border-emerald-300/40',
    Intermediate: 'bg-amber-500/90 text-white border-amber-300/40',
    Advanced: 'bg-rose-600/90 text-white border-rose-300/40'
  };

  return (
    <div
      onClick={() => onStart(resource)}
      className="group bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 hover:border-teal-500/60 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer relative"
    >
      {/* Training Thumbnail */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-gradient-to-br from-sky-950 via-teal-900 to-slate-900 shrink-0">
        {coverUrl && !imageError ? (
          <img
            src={coverUrl}
            alt={resource.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-white/85 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-teal-300 shadow-inner group-hover:scale-110 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-black tracking-widest uppercase text-white/60">
              {resource.category || resource.subject}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent pointer-events-none" />

        {/* Top Badges: Format & Difficulty */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black shadow-md backdrop-blur-md uppercase tracking-wider bg-teal-600/95 text-white border border-teal-300/40">
            <FormatIcon className="w-3 h-3 stroke-[2.5]" />
            <span>{formatMeta.label}</span>
          </span>

          <span
            className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border backdrop-blur-md ${
              difficultyStyles[difficulty] || 'bg-slate-900/80 text-white border-white/20'
            }`}
          >
            {difficulty}
          </span>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-teal-950/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStart(resource);
            }}
            className="px-4 py-2.5 bg-white hover:bg-teal-50 text-teal-900 rounded-xl text-xs font-black shadow-lg flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current text-teal-600" />
            <span>START TRAINING</span>
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          {/* Topic / Category & Subject */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
              {resource.category || resource.subject}
            </span>
            {resource.subject && resource.category && resource.subject !== resource.category && (
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                {resource.subject}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm sm:text-base font-black text-slate-900 line-clamp-1 group-hover:text-teal-700 transition-colors">
            {resource.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed min-h-[34px]">
            {resource.description || 'Structured training module designed to build practical skills.'}
          </p>

          {/* Learning Details Row: Instructor, Difficulty, Duration */}
          <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 font-semibold">
            <span className="inline-flex items-center gap-1 truncate max-w-[140px]" title={`Instructor: ${instructor}`}>
              <User className="w-3 h-3 text-teal-600 shrink-0" />
              <span className="truncate">{instructor}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <BarChart3 className="w-3 h-3 text-teal-600 shrink-0" />
              <span>{difficulty}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3 text-teal-600 shrink-0" />
              <span>{duration}</span>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
          <span className="text-[11px] font-bold text-slate-400 truncate">
            {resource.grade_level || 'All Levels'}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStart(resource);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>START TRAINING</span>
          </button>
        </div>
      </div>
    </div>
  );
};
