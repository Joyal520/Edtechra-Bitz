// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: COURSE STUDIO PREVIEW MODE
// Interactive simulation of the Student Experience for Teachers.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  ArrowRight,
  Clock,
  Award
} from 'lucide-react';
import { Course, CourseEpisode } from '@/types/courseStudio';
import { courseStudioService } from '@/services/courseStudioService';
import { CourseContentRenderer } from '@/components/course-studio/CourseContentRenderer';

export const CoursePreviewPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEpisode, setSelectedEpisode] = useState<CourseEpisode | null>(null);
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (courseId) {
      loadCourse(courseId);
    }
  }, [courseId]);

  const loadCourse = async (id: string) => {
    setLoading(true);
    try {
      const data = await courseStudioService.getCourse(id);
      setCourse(data);

      const firstUnit = data.units?.[0];
      if (firstUnit) {
        setExpandedUnits({ [firstUnit.id]: true });
        const firstEp = firstUnit.episodes?.[0];
        if (firstEp) setSelectedEpisode(firstEp);
      }
    } catch (err) {
      console.error('Failed to load course preview:', err);
    } finally {
      setLoading(false);
    }
  };

  // Find all episodes linearly for Next / Prev navigation
  const allEpisodes: Array<{ episode: CourseEpisode; unitTitle: string }> = [];
  (course?.units || []).forEach(u => {
    (u.episodes || []).forEach(ep => {
      allEpisodes.push({ episode: ep, unitTitle: u.title });
    });
  });

  const currentIndex = allEpisodes.findIndex(item => item.episode.id === selectedEpisode?.id);
  const prevItem = currentIndex > 0 ? allEpisodes[currentIndex - 1] : null;
  const nextItem = currentIndex < allEpisodes.length - 1 ? allEpisodes[currentIndex + 1] : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfaf6] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 text-[#026fc3] flex items-center justify-center mx-auto animate-spin">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-sm font-black text-slate-800">Loading Preview...</p>
        </div>
      </div>
    );
  }

  if (!course || !selectedEpisode) {
    return (
      <div className="min-h-screen bg-[#fcfaf6] flex items-center justify-center p-6 text-center space-y-4">
        <h2 className="text-lg font-black text-slate-900">No Content in this Course</h2>
        <button
          onClick={() => navigate(`/course-studio/${courseId}`)}
          className="px-5 py-2.5 bg-[#026fc3] text-white text-xs font-black rounded-xl"
        >
          Return to Editor
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#f9f7f1] font-sans antialiased text-slate-800 overflow-hidden">
      
      {/* PREVIEW TOP BAR */}
      <header className="h-16 bg-[#0a213c] text-white px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/course-studio/${course.id}`)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-black"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Exit Preview</span>
          </button>

          <div className="h-6 w-px bg-white/20" />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-white truncate max-w-xs sm:max-w-md">
                {course.title}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black uppercase">
                Preview Mode
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">
              {selectedEpisode.title} • {selectedEpisode.estimated_minutes || 15} min
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-black text-sky-200">
          <Award className="w-4 h-4 text-sky-300" />
          <span>Interactive Student Simulation</span>
        </div>
      </header>

      {/* BODY WITH SIDEBAR AND MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* OUTLINE SIDEBAR */}
        <aside className="w-72 bg-[#f4efe6] border-r border-stone-200/90 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-stone-200/80">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#026fc3]" />
              <span>Lessons & Practice</span>
            </h2>
          </div>

          <div className="p-3 space-y-3 flex-1 overflow-y-auto">
            {(course.units || []).map((unit) => {
              const isExpanded = expandedUnits[unit.id] ?? true;

              return (
                <div key={unit.id} className="bg-white/80 rounded-2xl border border-stone-200/80 overflow-hidden shadow-2xs">
                  <div
                    onClick={() => setExpandedUnits(p => ({ ...p, [unit.id]: !isExpanded }))}
                    className="p-3 bg-stone-50 hover:bg-stone-100/70 border-b border-stone-100 flex items-center justify-between cursor-pointer"
                  >
                    <span className="text-xs font-black text-slate-900 truncate">{unit.title}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </div>

                  {isExpanded && (
                    <div className="p-1.5 space-y-1">
                      {(unit.episodes || []).map((ep) => {
                        const isSelected = selectedEpisode.id === ep.id;

                        return (
                          <button
                            key={ep.id}
                            type="button"
                            onClick={() => setSelectedEpisode(ep)}
                            className={`w-full p-2.5 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? 'bg-[#026fc3] text-white shadow-xs'
                                : 'hover:bg-stone-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                              <span className="truncate">{ep.title}</span>
                            </div>
                            <span className={`text-[10px] font-semibold shrink-0 ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                              {ep.estimated_minutes || 15}m
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* MAIN RENDERER CONTAINER */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 space-y-8">
          <div className="max-w-3xl mx-auto space-y-8">
            
            {/* Lesson Title Header */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-sky-50 text-[#026fc3] text-xs font-black border border-sky-100 uppercase">
                  {course.subject}
                </span>
                <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {selectedEpisode.estimated_minutes || 15} mins
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {selectedEpisode.title}
              </h1>
            </div>

            {/* Shared Content Renderer */}
            <CourseContentRenderer
              blocks={selectedEpisode.blocks || []}
              questions={selectedEpisode.questions || []}
              isStudentView={false}
            />

            {/* Lesson Bottom Navigation */}
            <div className="flex items-center justify-between gap-4 pt-6 border-t border-stone-200">
              {prevItem ? (
                <button
                  type="button"
                  onClick={() => setSelectedEpisode(prevItem.episode)}
                  className="px-5 py-3 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200/80 text-slate-800 text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous: {prevItem.episode.title}</span>
                </button>
              ) : <div />}

              {nextItem ? (
                <button
                  type="button"
                  onClick={() => setSelectedEpisode(nextItem.episode)}
                  className="px-6 py-3 rounded-2xl bg-[#026fc3] hover:bg-[#03589e] text-white text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Next: {nextItem.episode.title}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(`/course-studio/${course.id}`)}
                  className="px-6 py-3 rounded-2xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Finish & Return to Editor</span>
                </button>
              )}
            </div>

          </div>
        </main>

      </div>
    </div>
  );
};
