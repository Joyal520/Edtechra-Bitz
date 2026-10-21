// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: COURSE COVER & BRANDED FALLBACK SYSTEM
// Priority 1: Teacher-uploaded cover
// Priority 2: Video thumbnail (YouTube / lesson video)
// Priority 3: Attractive branded default cover based on subject and course title
// ============================================================================

import React, { useState } from 'react';
import {
  BookOpen,
  Headphones,
  Atom,
  Binary,
  Compass,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { extractYouTubeVideoId, getYouTubeThumbnailUrl } from './youtubeUrl';
import { Course } from '@/types/courseStudio';

export interface SubjectIdentity {
  badgeLabel: string;
  gradientClass: string;
  accentColor: string;
  icon: React.ComponentType<{ className?: string }>;
  patternUrl?: string;
  theme: 'podcast' | 'english' | 'science' | 'math' | 'ict' | 'general';
}

/**
 * Detects the subject identity and theme from course subject & title.
 */
export function getCourseSubjectIdentity(course?: Partial<Course> | null): SubjectIdentity {
  const title = (course?.title || '').toLowerCase();
  const subject = (course?.subject || '').toLowerCase();

  // 1. Podcast / Audio / Listening Course
  if (
    title.includes('podcast') ||
    title.includes('listen') ||
    title.includes('audio') ||
    subject.includes('podcast') ||
    subject.includes('audio')
  ) {
    return {
      badgeLabel: 'Podcast & Listening',
      gradientClass: 'from-[#0b1728] via-[#09355c] to-[#026fc3]',
      accentColor: '#38bdf8',
      icon: Headphones,
      patternUrl: '/images/classroom/covers/english.jpg',
      theme: 'podcast'
    };
  }

  // 2. English / Languages
  if (subject.includes('english') || title.includes('english') || subject.includes('language')) {
    return {
      badgeLabel: 'English Language',
      gradientClass: 'from-[#0a192f] via-[#0e3b68] to-[#1e40af]',
      accentColor: '#60a5fa',
      icon: BookOpen,
      patternUrl: '/images/classroom/covers/english.jpg',
      theme: 'english'
    };
  }

  // 3. Science
  if (subject.includes('science') || title.includes('science') || subject.includes('biology') || subject.includes('physics')) {
    return {
      badgeLabel: 'Science',
      gradientClass: 'from-[#062419] via-[#065f46] to-[#0d9488]',
      accentColor: '#34d399',
      icon: Atom,
      patternUrl: '/images/classroom/covers/science.jpg',
      theme: 'science'
    };
  }

  // 4. Mathematics
  if (subject.includes('math') || title.includes('math')) {
    return {
      badgeLabel: 'Mathematics',
      gradientClass: 'from-[#171435] via-[#3730a3] to-[#4f46e5]',
      accentColor: '#818cf8',
      icon: Compass,
      patternUrl: '/images/classroom/covers/mathematics.jpg',
      theme: 'math'
    };
  }

  // 5. ICT / Coding / Tech
  if (subject.includes('ict') || subject.includes('coding') || subject.includes('computer') || title.includes('ict')) {
    return {
      badgeLabel: 'ICT & Computing',
      gradientClass: 'from-[#1e1035] via-[#5b21b6] to-[#7c3aed]',
      accentColor: '#c084fc',
      icon: Binary,
      patternUrl: '/images/classroom/covers/ict.jpg',
      theme: 'ict'
    };
  }

  // 6. General Education Default
  return {
    badgeLabel: course?.subject || 'Digital Course',
    gradientClass: 'from-[#0f172a] via-[#1e293b] to-[#026fc3]',
    accentColor: '#38bdf8',
    icon: GraduationCap,
    patternUrl: '/images/classroom/covers/general.jpg',
    theme: 'general'
  };
}

/**
 * Searches course content (units, episodes, blocks) to find an accessible video thumbnail
 */
export function extractCourseVideoThumbnail(course?: Partial<Course> | null): string | null {
  if (!course || !course.units) return null;

  for (const unit of course.units) {
    for (const ep of unit.episodes || []) {
      for (const block of ep.blocks || []) {
        if (!block?.content) continue;
        const c: any = block.content;
        const videoUrl = c.url || c.video?.url || (block.block_type === 'youtube_video' ? c.video_id : null);
        const ytId = extractYouTubeVideoId(videoUrl);
        if (ytId) {
          return getYouTubeThumbnailUrl(ytId, 'hq');
        }
      }
    }
  }

  return null;
}

/**
 * Determines the primary cover image URL according to the 3-tier hierarchy:
 * Tier 1: Custom Cover Image
 * Tier 2: Extracted Video Thumbnail
 * Tier 3: Deterministic Branded Subject Graphic / Cover Image
 */
export function getCourseCoverUrl(course?: Partial<Course> | null): { url: string; isFallback: boolean } {
  if (course?.cover_image_url && course.cover_image_url.trim()) {
    return { url: course.cover_image_url.trim(), isFallback: false };
  }

  const videoThumb = extractCourseVideoThumbnail(course);
  if (videoThumb) {
    return { url: videoThumb, isFallback: false };
  }

  const identity = getCourseSubjectIdentity(course);
  return { url: identity.patternUrl || '/images/classroom/covers/general.jpg', isFallback: true };
}

/**
 * Premium Educational Branded Fallback Visual
 * Used when no custom image or video thumbnail exists, or when image loading fails.
 */
export const BrandedCourseFallback: React.FC<{
  course?: Partial<Course> | null;
  className?: string;
}> = ({ course, className = '' }) => {
  const identity = getCourseSubjectIdentity(course);
  const IconComponent = identity.icon;

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between p-5 bg-gradient-to-br ${identity.gradientClass} overflow-hidden select-none ${className}`}
    >
      {/* Ambient background glows */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-sky-400/10 blur-2xl pointer-events-none" />

      {/* Decorative SVG Graphic Elements */}
      {identity.theme === 'podcast' ? (
        <div className="absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none">
          <svg className="w-full h-32 text-sky-300" viewBox="0 0 400 100" fill="none">
            <path d="M10 50 Q 50 10, 100 50 T 200 50 T 300 50 T 400 50" stroke="currentColor" strokeWidth="3" fill="none" />
            <path d="M10 50 Q 60 80, 110 50 T 210 50 T 310 50 T 400 50" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" fill="none" />
          </svg>
        </div>
      ) : (
        <div className="absolute right-3 bottom-3 opacity-10 pointer-events-none">
          <IconComponent className="w-36 h-36 text-white" />
        </div>
      )}

      {/* Top Header Badge */}
      <div className="relative z-10 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-[11px] font-black uppercase tracking-wider shadow-xs">
          <IconComponent className="w-3.5 h-3.5 text-sky-300" />
          <span>{identity.badgeLabel}</span>
        </span>
        <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
          EdTechra Course
        </span>
      </div>

      {/* Center Icon & Branding */}
      <div className="relative z-10 flex items-center gap-3.5 my-auto">
        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner shrink-0">
          <IconComponent className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-black text-sm sm:text-base leading-snug line-clamp-2 drop-shadow-xs">
            {course?.title || 'Interactive Course'}
          </p>
          <p className="text-white/70 text-xs font-semibold mt-0.5 line-clamp-1">
            {course?.grade_level || 'Structured Learning'}
          </p>
        </div>
      </div>

      {/* Bottom Footer Pattern */}
      <div className="relative z-10 flex items-center justify-between text-[11px] font-bold text-white/80 border-t border-white/10 pt-2.5">
        <span className="flex items-center gap-1 text-sky-200">
          <Sparkles className="w-3 h-3 text-amber-300" />
          <span>Interactive Units & Lessons</span>
        </span>
        <span className="text-white/60">EdTechra Studio</span>
      </div>
    </div>
  );
};

/**
 * Universal Resilient Course Cover Component.
 * Implements full 3-priority fallback, error recovery, smooth hover scale, and aspect ratio awareness.
 */
export const CourseCoverImage: React.FC<{
  course?: Partial<Course> | null;
  className?: string;
  imgClassName?: string;
  aspectRatio?: '16:9' | '1:1' | 'banner';
}> = ({ course, className = '', imgClassName = '', aspectRatio }) => {
  const [hasError, setHasError] = useState(false);
  const coverInfo = getCourseCoverUrl(course);
  
  // Resolve aspect ratio class
  let ratioClass = 'aspect-video';
  if (aspectRatio === 'banner') {
    ratioClass = 'aspect-[2.35/1]';
  } else if (aspectRatio === '1:1' || (!aspectRatio && course?.cover_aspect_ratio === '1:1')) {
    ratioClass = 'aspect-square';
  }

  // If no image url is found or an image load error occurred, render branded fallback
  if (hasError || !coverInfo.url) {
    return (
      <div className={`w-full overflow-hidden ${ratioClass} ${className}`}>
        <BrandedCourseFallback course={course} />
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden bg-slate-950 ${ratioClass} ${className}`}>
      <img
        src={coverInfo.url}
        alt={course?.title || 'Course Cover'}
        loading="lazy"
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105 ${imgClassName}`}
      />
      {/* Subtle bottom vignette gradient for readable text contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-black/20 pointer-events-none" />
    </div>
  );
};
