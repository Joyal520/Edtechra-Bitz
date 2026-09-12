// ============================================================================
// SUBJECT-TO-COVER IMAGE MAPPING FOR EDTECHRA DIGITAL CLASSROOM
// Common cover image for all classes of the same subject
// ============================================================================

export interface SubjectCoverInfo {
  imageUrl: string;
  badgeLabel: string;
  themeColor: string;
  gradient: string;
}

export const SUBJECT_COVERS: Record<string, SubjectCoverInfo> = {
  english: {
    imageUrl: '/images/classroom/covers/english.jpg',
    badgeLabel: 'English',
    themeColor: '#0284c7',
    gradient: 'from-amber-600 to-amber-800'
  },
  mathematics: {
    imageUrl: '/images/classroom/covers/mathematics.jpg',
    badgeLabel: 'Mathematics',
    themeColor: '#0284c7',
    gradient: 'from-blue-600 to-indigo-800'
  },
  science: {
    imageUrl: '/images/classroom/covers/science.jpg',
    badgeLabel: 'Science',
    themeColor: '#059669',
    gradient: 'from-emerald-600 to-teal-800'
  },
  ict: {
    imageUrl: '/images/classroom/covers/ict.jpg',
    badgeLabel: 'ICT & Coding',
    themeColor: '#7c3aed',
    gradient: 'from-purple-600 to-indigo-900'
  },
  history: {
    imageUrl: '/images/classroom/covers/history.jpg',
    badgeLabel: 'History',
    themeColor: '#b45309',
    gradient: 'from-amber-700 to-stone-800'
  },
  robotics: {
    imageUrl: '/images/classroom/covers/robotics.jpg',
    badgeLabel: 'Robotics',
    themeColor: '#2563eb',
    gradient: 'from-sky-600 to-blue-900'
  },
  general: {
    imageUrl: '/images/classroom/covers/general.jpg',
    badgeLabel: 'General Education',
    themeColor: '#0284c7',
    gradient: 'from-sky-700 to-slate-800'
  }
};

/**
 * Returns the subject cover information based on subject title or category.
 * Deterministic: every class of the same subject receives the identical cover image.
 */
export function getSubjectCover(subject?: string | null): SubjectCoverInfo {
  if (!subject) return SUBJECT_COVERS.general;
  const s = subject.toLowerCase().trim();

  if (s.includes('eng') || s.includes('lit') || s.includes('read') || s.includes('grammar') || s.includes('writing') || s.includes('language')) {
    return SUBJECT_COVERS.english;
  }
  if (s.includes('math') || s.includes('calc') || s.includes('alg') || s.includes('geom') || s.includes('stat') || s.includes('arithmetic')) {
    return SUBJECT_COVERS.mathematics;
  }
  if (s.includes('sci') || s.includes('bio') || s.includes('chem') || s.includes('phys') || s.includes('nature') || s.includes('lab')) {
    return SUBJECT_COVERS.science;
  }
  if (s.includes('ict') || s.includes('comp') || s.includes('code') || s.includes('tech') || s.includes('prog') || s.includes('web') || s.includes('it') || s.includes('software')) {
    return SUBJECT_COVERS.ict;
  }
  if (s.includes('hist') || s.includes('social') || s.includes('geo') || s.includes('civic') || s.includes('world')) {
    return SUBJECT_COVERS.history;
  }
  if (s.includes('robot') || s.includes('stem') || s.includes('electron') || s.includes('engin') || s.includes('ai') || s.includes('iot')) {
    return SUBJECT_COVERS.robotics;
  }

  return SUBJECT_COVERS.general;
}
