import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Cloud,
  FileText,
  Check,
  Eye,
  Loader2,
  AlertCircle,
  HardDrive,
  Plus
} from 'lucide-react';
import { TeacherCloudMaterial, TeacherStorageUsage } from '@/types/classroom';
import { classroomResourceService } from '@/services/classroomResourceService';

interface ExploreCloudBucketModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId?: string;
  bucketId?: string;
  materials: TeacherCloudMaterial[];
  storageUsage?: TeacherStorageUsage | null;
  isLoading?: boolean;
  onMaterialsAssigned: (assignedCount: number) => void;
  onOpenUploadDevice: () => void;
  onPreviewMaterial: (material: TeacherCloudMaterial) => void;
}

export const ExploreCloudBucketModal: React.FC<ExploreCloudBucketModalProps> = ({
  isOpen,
  onClose,
  classroomId,
  bucketId,
  materials,
  storageUsage,
  isLoading = false,
  onMaterialsAssigned,
  onOpenUploadDevice,
  onPreviewMaterial
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'size'>('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAssigning, setIsAssigning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    materials.forEach((m) => {
      if (m.category && m.category.trim()) {
        set.add(m.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [materials]);

  // Filter and sort materials
  const filteredMaterials = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return materials
      .filter((m) => {
        const matchesQuery =
          !q ||
          m.title.toLowerCase().includes(q) ||
          (m.originalFilename && m.originalFilename.toLowerCase().includes(q)) ||
          (m.original_filename && m.original_filename.toLowerCase().includes(q)) ||
          (m.description && m.description.toLowerCase().includes(q));

        const matchesCategory =
          !selectedCategory || (m.category || '').toLowerCase() === selectedCategory.toLowerCase();

        return matchesQuery && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === 'size') {
          return (b.fileSize || b.file_size || 0) - (a.fileSize || a.file_size || 0);
        }
        // newest default
        const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
        const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
        return dateB - dateA;
      });
  }, [materials, searchQuery, selectedCategory, sortBy]);

  const toggleSelectMaterial = (id: string, isAssigned?: boolean) => {
    if (isAssigned) return; // Prevent selection of already-assigned materials

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAssignMaterials = async () => {
    if (!classroomId) {
      setErrorMessage('No classroom selected.');
      return;
    }
    if (selectedIds.size === 0) {
      setErrorMessage('Please select at least one material to assign.');
      return;
    }

    setIsAssigning(true);
    setErrorMessage(null);

    try {
      const res = await classroomResourceService.assignCloudMaterialsToClassroom({
        classroomId,
        resourceIds: Array.from(selectedIds),
        bucketId
      });

      if (res.error) {
        setErrorMessage(res.error);
        setIsAssigning(false);
        return;
      }

      onMaterialsAssigned(selectedIds.size);
      setSelectedIds(new Set());
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to assign materials to classroom.');
    } finally {
      setIsAssigning(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const quotaPercent = storageUsage?.percentage ?? 0;
  const isNearLimit = quotaPercent >= 85;
  const isFull = quotaPercent >= 100;
  const quotaBarColor = isFull ? 'bg-rose-500' : isNearLimit ? 'bg-amber-500' : 'bg-[#026fc3]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/20">
              <Cloud className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-white/10 px-2.5 py-0.5 rounded-full">
                  Reusable Library
                </span>
                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  0 MB Added on Assign
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                YOUR CLOUD MATERIALS
              </h3>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Select a material to assign to this class &bull; Reuses files in cloud storage without duplicate upload
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Storage Quota Bar */}
        {storageUsage && (
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 shrink-0 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                <span>Cloud Storage</span>
              </span>
              <span className="font-extrabold text-slate-900">
                {storageUsage.usedMb} MB / {storageUsage.maxMb} MB used ({storageUsage.percentage}%)
                <span className="text-slate-400 font-normal ml-2">
                  &bull; {storageUsage.remainingMb} MB remaining
                </span>
              </span>
            </div>
            <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${quotaBarColor}`}
                style={{ width: `${Math.min(100, storageUsage.percentage)}%` }}
              />
            </div>
          </div>
        )}

        {/* Toolbar: Search, Filter, Sort */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search materials by name or filename..."
              className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#026fc3] focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2">
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
            >
              <option value="newest">Newest First</option>
              <option value="name">Name (A-Z)</option>
              <option value="size">Size (Largest)</option>
            </select>
          </div>
        </div>

        {/* Modal Body: Materials List */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-3">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-16 text-center space-y-2">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Loading your cloud materials...</p>
            </div>
          ) : materials.length === 0 ? (
            /* EMPTY STATE */
            <div className="py-14 text-center border-2 border-dashed border-slate-200 rounded-3xl p-6 sm:p-8 space-y-3 bg-slate-50/50">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                <Cloud className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  You haven't uploaded any learning materials yet.
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-1 max-w-sm mx-auto">
                  Upload PDF files or study guides from your computer once to start building your reusable personal cloud library.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUploadDevice();
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Your First Material</span>
              </button>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="py-12 text-center text-xs font-bold text-slate-500">
              No materials match your search or filter criteria.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMaterials.map((material) => {
                const isSelected = selectedIds.has(material.id);
                const isAssigned = Boolean(material.is_assigned || material.isAssigned);
                const filename = material.originalFilename || material.original_filename || '';
                const sizeText = material.formattedSize || '0 B';
                const dateText = formatDate(material.createdAt || material.created_at);

                return (
                  <div
                    key={material.id}
                    onClick={() => toggleSelectMaterial(material.id, isAssigned)}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 group ${
                      isAssigned
                        ? 'border-slate-200 bg-slate-50/70 opacity-75 cursor-default'
                        : isSelected
                        ? 'border-indigo-500 bg-indigo-50/60 shadow-xs cursor-pointer'
                        : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                          isAssigned
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                            : isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 bg-white group-hover:border-indigo-400'
                        }`}
                      >
                        {(isSelected || isAssigned) && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      {/* PDF Icon Badge */}
                      <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-2xs">
                        <FileText className="w-4 h-4" />
                      </div>

                      {/* Material Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                            {material.title || material.name}
                          </h4>
                          {material.category && (
                            <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                              {material.category}
                            </span>
                          )}
                          {isAssigned && (
                            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <span>✓</span>
                              <span>Already assigned to this class</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                          {filename && <span className="truncate max-w-[140px] sm:max-w-xs">{filename}</span>}
                          <span>&bull;</span>
                          <span>{sizeText}</span>
                          {dateText && (
                            <>
                              <span>&bull;</span>
                              <span>Uploaded {dateText}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Preview Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreviewMaterial(material);
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="Preview PDF"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Preview</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer / Selection Bar */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-bold text-slate-600">
            <span className="text-slate-900 font-black">{selectedIds.size}</span> material
            {selectedIds.size === 1 ? '' : 's'} selected
            <span className="text-[11px] text-slate-400 font-normal ml-2">
              (0 MB storage added)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isAssigning}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssignMaterials}
              disabled={isAssigning || selectedIds.size === 0}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isAssigning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <span>
                  {selectedIds.size > 0
                    ? `Assign Materials (${selectedIds.size})`
                    : 'Assign Materials'}
                </span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
