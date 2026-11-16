import React, { useState, useEffect } from 'react';
import { Gamepad2, Play, Sparkles, ExternalLink } from 'lucide-react';
import { LibraryResource } from '@/types/library';
import { getDefaultCoverDataUri } from '@/utils/libraryCovers';

interface GameCardProps {
  resource: LibraryResource;
  onPlay: (resource: LibraryResource) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ resource, onPlay }) => {
  const defaultFallbackCover = getDefaultCoverDataUri('game', resource.title);
  const [coverUrl, setCoverUrl] = useState<string>(resource.cover_image_url || defaultFallbackCover);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
    setCoverUrl(resource.cover_image_url || defaultFallbackCover);
  }, [resource.cover_image_url, defaultFallbackCover]);

  const isClassroomActivity = resource.category === 'Classroom Activities';

  return (
    <div
      onClick={() => onPlay(resource)}
      className="group bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 hover:border-violet-400/70 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer relative"
    >
      {/* Game Thumbnail */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-gradient-to-br from-indigo-950 via-violet-900 to-slate-900 shrink-0">
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
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-violet-300 shadow-inner group-hover:scale-110 transition-transform">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-black tracking-widest uppercase text-white/60">
              {resource.category || resource.subject}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent pointer-events-none" />

        {/* Top Badges: Game Type & Grade Level */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black shadow-md backdrop-blur-md uppercase tracking-wider bg-violet-600/95 text-white border border-violet-300/40">
            {isClassroomActivity ? (
              <Sparkles className="w-3 h-3 stroke-[2.5]" />
            ) : (
              <Gamepad2 className="w-3 h-3 stroke-[2.5]" />
            )}
            <span>{isClassroomActivity ? 'ACTIVITY' : 'GAME'}</span>
          </span>

          {resource.grade_level && (
            <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-slate-900/80 text-white border border-white/20 backdrop-blur-md truncate max-w-[140px]">
              {resource.grade_level}
            </span>
          )}
        </div>

        {/* Hover Play Overlay */}
        <div className="absolute inset-0 bg-violet-950/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlay(resource);
            }}
            className="px-4 py-2.5 bg-white hover:bg-violet-50 text-violet-900 rounded-xl text-xs font-black shadow-lg flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current text-violet-600" />
            <span>PLAY GAME</span>
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          {/* Subject & Category */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200">
              {resource.subject}
            </span>
            {resource.category && resource.category !== resource.subject && (
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                {resource.category}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm sm:text-base font-black text-slate-900 line-clamp-1 group-hover:text-violet-700 transition-colors">
            {resource.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed min-h-[34px]">
            {resource.description || 'Interactive educational game and classroom activity ready to play.'}
          </p>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-semibold truncate">
            <ExternalLink className="w-3 h-3 text-violet-500 shrink-0" />
            <span className="truncate">{resource.grade_level || 'All Grades'}</span>
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlay(resource);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>PLAY GAME</span>
          </button>
        </div>
      </div>
    </div>
  );
};
