import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Plus,
  Search,
  FileText,
  Presentation,
  Trash2,
  Edit2,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  BookOpen,
  Globe
} from 'lucide-react';
import { LibraryResource, LibraryFileType } from '@/types/library';
import { libraryService } from '@/services/libraryService';
import { AdminLibraryModal } from '@/components/admin/AdminLibraryModal';
import { SUBJECT_OPTIONS } from '@/components/library/LibraryFilters';
import { PdfViewerModal } from '@/components/library/PdfViewerModal';
import { WebBlogViewerModal } from '@/components/library/WebBlogViewerModal';

export const AdminLibraryPage: React.FC = () => {
  const navigate = useNavigate();

  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | LibraryFileType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'unpublished'>('all');

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [resourceToEdit, setResourceToEdit] = useState<LibraryResource | null>(null);
  const [resourceToDelete, setResourceToDelete] = useState<LibraryResource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Preview Modals
  const [activePdfResource, setActivePdfResource] = useState<LibraryResource | null>(null);
  const [activeWebBlogResource, setActiveWebBlogResource] = useState<LibraryResource | null>(null);

  const loadResources = useCallback(async () => {
    setLoading(true);
    try {
      // Pass isAdmin=true to fetch all resources (both published and drafts)
      const data = await libraryService.getResources(
        {
          search,
          subject: subjectFilter,
          file_type: fileTypeFilter,
          published: statusFilter
        },
        true
      );
      setResources(data);
    } catch (err) {
      console.error('[AdminLibraryPage] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, subjectFilter, fileTypeFilter, statusFilter]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleTogglePublish = async (resource: LibraryResource) => {
    const newStatus = !resource.published;
    try {
      // Optimistic update
      setResources((prev) =>
        prev.map((r) => (r.id === resource.id ? { ...r, published: newStatus } : r))
      );
      await libraryService.updateResource(resource.id, { published: newStatus });
    } catch (err) {
      console.error('[AdminLibraryPage] Toggle publish error:', err);
      loadResources();
    }
  };

  const handleConfirmDelete = async () => {
    if (!resourceToDelete) return;
    setIsDeleting(true);

    try {
      const res = await libraryService.deleteResource(
        resourceToDelete.id,
        resourceToDelete.file_key,
        resourceToDelete.cover_image_key
      );
      if (res.error) {
        alert(res.error);
      } else {
        setResources((prev) => prev.filter((r) => r.id !== resourceToDelete.id));
        setResourceToDelete(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete resource');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenPreview = (res: LibraryResource) => {
    if (res.file_type === 'pdf') {
      setActivePdfResource(res);
    } else if (res.file_type === 'web_blog') {
      setActiveWebBlogResource(res);
    } else {
      navigate(`/library/present/${res.id}`);
    }
  };

  // Metrics
  const totalCount = resources.length;
  const publishedCount = resources.filter((r) => r.published).length;
  const pdfCount = resources.filter((r) => r.file_type === 'pdf').length;
  const pptxCount = resources.filter((r) => r.file_type === 'pptx').length;

  return (
    <div className="min-h-screen bg-[#fbfbf7] text-slate-900 pb-16">
      
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200/80 pt-6 pb-6 px-4 sm:px-6 md:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link
                  to="/admin"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Back to Admin Dashboard"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>

                <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200/60 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Library Administration
                </h1>
              </div>

              <p className="text-xs sm:text-sm text-slate-500 font-semibold pl-9">
                Manage PDF guides, PowerPoint presentations, Cloudflare R2 uploads, and publish status.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/library"
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all"
              >
                <span>View Public Library</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setResourceToEdit(null);
                  setIsUploadModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Resource</span>
              </button>
            </div>

          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Files</span>
              <div className="text-xl font-black text-slate-900">{totalCount}</div>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/80">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Published</span>
              <div className="text-xl font-black text-emerald-700">{publishedCount}</div>
            </div>

            <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-200/80">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">PDFs</span>
              <div className="text-xl font-black text-rose-700">{pdfCount}</div>
            </div>

            <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Presentations</span>
              <div className="text-xl font-black text-amber-800">{pptxCount}</div>
            </div>
          </div>

        </div>
      </div>

      {/* Main Admin Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-6 space-y-4">
        
        {/* Search & Filter Strip */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, author, or subject..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Subject Selector */}
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-purple-600"
            >
              {SUBJECT_OPTIONS.map((sub) => (
                <option key={sub} value={sub === 'All Subjects' ? 'all' : sub}>
                  {sub}
                </option>
              ))}
            </select>

            {/* File Type Filter */}
            <select
              value={fileTypeFilter}
              onChange={(e) => setFileTypeFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-purple-600"
            >
              <option value="all">All File Types</option>
              <option value="pdf">PDFs only</option>
              <option value="pptx">PowerPoint only</option>
              <option value="web_blog">Web / Blogs only</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-purple-600"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="unpublished">Drafts only</option>
            </select>
          </div>

        </div>

        {/* Resources Table / Card List */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <span className="text-xs font-bold">Loading admin catalog...</span>
            </div>
          ) : resources.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-black text-slate-800">No resources found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No library files matched your active filters. Click "Upload Resource" above to add your first resource.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Resource</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Subject & Category</th>
                    <th className="py-3 px-4">Grade</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resources.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Title & Cover */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-8 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 shrink-0">
                            {res.cover_image_url ? (
                              <img src={res.cover_image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/50 bg-slate-800">
                                {res.file_type === 'pptx' ? (
                                  <Presentation className="w-4 h-4 text-amber-400" />
                                ) : res.file_type === 'web_blog' ? (
                                  <Globe className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <FileText className="w-4 h-4 text-rose-400" />
                                )}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <span className="font-black text-slate-900 line-clamp-1">{res.title}</span>
                            <span className="text-[11px] text-slate-400 font-medium truncate block">
                              {res.author || res.uploader?.full_name || 'EdTechra'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* File Type */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-black text-[10px] uppercase ${
                            res.file_type === 'pptx'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : res.file_type === 'web_blog'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {res.file_type === 'web_blog' ? 'Web / Blog' : res.file_type}
                        </span>
                      </td>

                      {/* Subject & Category */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 block">{res.subject}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{res.category}</span>
                        </div>
                      </td>

                      {/* Grade */}
                      <td className="py-3 px-4">
                        <span className="text-slate-600 font-semibold">{res.grade_level}</span>
                      </td>

                      {/* Status Toggle Switch */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(res)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black cursor-pointer transition-colors ${
                            res.published
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {res.published ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Published</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-slate-400" />
                              <span>Draft</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(res)}
                            title="Preview resource"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setResourceToEdit(res);
                              setIsUploadModalOpen(true);
                            }}
                            title="Edit metadata"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-purple-50"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setResourceToDelete(res)}
                            title="Delete resource"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Upload & Edit Modal */}
      <AdminLibraryModal
        isOpen={isUploadModalOpen}
        resourceToEdit={resourceToEdit}
        onClose={() => {
          setIsUploadModalOpen(false);
          setResourceToEdit(null);
        }}
        onSuccess={() => loadResources()}
      />

      {/* Destructive Delete Confirmation Modal */}
      {resourceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">Delete Resource?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-slate-800">"{resourceToDelete.title}"</strong>?
                This will delete the database record and remove the file from Cloudflare R2.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setResourceToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
