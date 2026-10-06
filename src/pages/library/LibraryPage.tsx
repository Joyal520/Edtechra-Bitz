import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  Presentation,
  Globe,
  ShieldCheck,
  Sparkles,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { LibraryResource, LibraryFilterState } from '@/types/library';
import { libraryService } from '@/services/libraryService';
import { LibraryCard } from '@/components/library/LibraryCard';
import { LibraryFilters } from '@/components/library/LibraryFilters';
import { PdfViewerModal } from '@/components/library/PdfViewerModal';
import { WebBlogViewerModal } from '@/components/library/WebBlogViewerModal';
import { useAuth } from '@/context/AuthContext';

export const LibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Active Filters
  const [filters, setFilters] = useState<LibraryFilterState>({
    search: '',
    subject: 'all',
    category: 'all',
    grade_level: 'all',
    file_type: 'all'
  });

  // Modal states
  const [activePdfResource, setActivePdfResource] = useState<LibraryResource | null>(null);
  const [activeWebBlogResource, setActiveWebBlogResource] = useState<LibraryResource | null>(null);

  const loadResources = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await libraryService.getResources(filters, isAdmin);
      setResources(data);
    } catch (err) {
      console.error('[LibraryPage] Error loading resources:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, isAdmin]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleOpenResource = (res: LibraryResource) => {
    if (res.file_type === 'pptx') {
      navigate(`/library/present/${res.id}`);
    } else if (res.file_type === 'web_blog') {
      setActiveWebBlogResource(res);
    } else {
      setActivePdfResource(res);
    }
  };

  const handlePresent = (res: LibraryResource) => {
    navigate(`/library/present/${res.id}`);
  };

  // Quick stats
  const pdfCount = resources.filter((r) => r.file_type === 'pdf').length;
  const pptxCount = resources.filter((r) => r.file_type === 'pptx').length;
  const webBlogCount = resources.filter((r) => r.file_type === 'web_blog').length;

  return (
    <div className="min-h-screen bg-[#fbfbf7] text-slate-900 pb-16">
      
      {/* ========================================================================= */}
      {/* PAGE HERO HEADER                                                          */}
      {/* ========================================================================= */}
      <div className="bg-white border-b border-slate-200/80 pt-8 pb-8 px-4 sm:px-6 md:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Title & Badge */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#026fc3] to-sky-600 text-white flex items-center justify-center shadow-xs">
                  <BookOpen className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    EdTechra Library
                  </h1>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-semibold max-w-xl">
                Discover high-quality PDF guides and interactive PowerPoint presentations for your classroom and independent study.
              </p>
            </div>

            {/* Admin Shortcuts & Remote Shortcut */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => navigate('/library/controller')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer"
                title="Enter 6-digit code to control a live presentation"
              >
                <span>Phone Remote</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate('/admin/library')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin Management</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => loadResources(true)}
                disabled={refreshing}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title="Refresh library"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

          </div>

          {/* Quick Stats Pill Strip */}
          <div className="flex items-center gap-2 pt-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-[#026fc3]" />
              <span>{resources.length} Total Resources</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/60 text-xs font-bold shrink-0">
              <FileText className="w-3.5 h-3.5" />
              <span>{pdfCount} PDF Documents</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60 text-xs font-bold shrink-0">
              <Presentation className="w-3.5 h-3.5" />
              <span>{pptxCount} Presentations</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-xs font-bold shrink-0">
              <Globe className="w-3.5 h-3.5" />
              <span>{webBlogCount} Web / Blogs</span>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA: Filters & Resource Grid                                */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-6 space-y-6">
        
        {/* Filters & Search Component */}
        <LibraryFilters
          filters={filters}
          onChange={setFilters}
          totalCount={resources.length}
        />

        {/* Resources Grid */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#026fc3]" />
            <span className="text-xs font-black">Loading Library Resources...</span>
          </div>
        ) : resources.length === 0 ? (
          <div className="py-20 text-center space-y-4 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 text-[#026fc3] flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">No Resources Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No educational resources matched your current search filters or category selection.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setFilters({
                  search: '',
                  subject: 'all',
                  category: 'all',
                  grade_level: 'all',
                  file_type: 'all'
                })
              }
              className="px-4 py-2 bg-[#026fc3] hover:bg-[#025ea6] text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {resources.map((res) => (
              <LibraryCard
                key={res.id}
                resource={res}
                onOpen={handleOpenResource}
                onPresent={handlePresent}
              />
            ))}
          </div>
        )}

      </div>

      {/* Embedded PDF Viewer Modal */}
      <PdfViewerModal
        isOpen={Boolean(activePdfResource)}
        resource={activePdfResource}
        onClose={() => setActivePdfResource(null)}
      />

      {/* Embedded Web / Blog Viewer Modal */}
      <WebBlogViewerModal
        isOpen={Boolean(activeWebBlogResource)}
        resource={activeWebBlogResource}
        onClose={() => setActiveWebBlogResource(null)}
      />

    </div>
  );
};
