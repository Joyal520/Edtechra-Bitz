import React, { useState, useEffect } from 'react';
import {
  Folder,
  Plus,
  Trash2,
  ExternalLink,
  BookOpen,
  Video,
  FileText,
  Cloud,
  Eye
} from 'lucide-react';
import {
  ContentBucket,
  BucketItemType,
  TeacherCloudMaterial,
  TeacherStorageUsage
} from '@/types/classroom';
import { classroomResourceService } from '@/services/classroomResourceService';
import { AddLearningMaterialModal } from './resources/AddLearningMaterialModal';
import { UploadFromDeviceModal } from './resources/UploadFromDeviceModal';
import { ExploreCloudBucketModal } from './resources/ExploreCloudBucketModal';
import { PdfPreviewModal } from './resources/PdfPreviewModal';

interface ClassroomResourcesProps {
  classroomId: string;
  buckets: ContentBucket[];
  isTeacher: boolean;
  onUpdated: () => void;
  onOpenActivityHub?: () => void;
}

export const ClassroomResources: React.FC<ClassroomResourcesProps> = ({
  classroomId,
  buckets,
  isTeacher,
  onUpdated,
  onOpenActivityHub
}) => {
  const [showAddBucket, setShowAddBucket] = useState(false);
  const [bucketTitle, setBucketTitle] = useState('');
  const [bucketDesc, setBucketDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cloud Materials and Storage State
  const [storageUsage, setStorageUsage] = useState<TeacherStorageUsage | null>(null);
  const [cloudMaterials, setCloudMaterials] = useState<TeacherCloudMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  // Modal States
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCloudBucketModal, setShowCloudBucketModal] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<{
    title: string;
    fileUrl: string;
    originalFilename?: string;
  } | null>(null);

  // Target bucket for assignment/upload
  const [targetBucketId, setTargetBucketId] = useState<string | undefined>(undefined);

  // Inline Add Custom URL / Note state
  const [activeBucketId, setActiveBucketId] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState('');
  const [itemType, setItemType] = useState<BucketItemType>('lesson');
  const [itemUrl, setItemUrl] = useState('');

  // Load teacher cloud materials and storage usage
  const loadCloudMaterialsAndQuota = async () => {
    if (!isTeacher) return;
    setLoadingMaterials(true);
    try {
      const [quota, materials] = await Promise.all([
        classroomResourceService.getTeacherStorageUsage(),
        classroomResourceService.getTeacherCloudMaterials(classroomId)
      ]);
      setStorageUsage(quota);
      setCloudMaterials(materials);
    } catch (err) {
      console.error('[ClassroomResources] Failed to load cloud data:', err);
    } finally {
      setLoadingMaterials(false);
    }
  };

  useEffect(() => {
    loadCloudMaterialsAndQuota();
  }, [classroomId, isTeacher]);

  const handleCreateBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bucketTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await classroomResourceService.createBucket({
        classroom_id: classroomId,
        title: bucketTitle.trim(),
        description: bucketDesc.trim()
      });
      setBucketTitle('');
      setBucketDesc('');
      setShowAddBucket(false);
      onUpdated();
    } catch (err) {
      alert('Failed to create resource bucket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBucketId || !itemTitle.trim()) return;

    try {
      await classroomResourceService.addItemToBucket({
        bucket_id: activeBucketId,
        classroom_id: classroomId,
        title: itemTitle.trim(),
        item_type: itemType,
        content_url: itemUrl.trim() || undefined
      });
      setItemTitle('');
      setItemUrl('');
      setActiveBucketId(null);
      onUpdated();
    } catch (err) {
      alert('Failed to add resource');
    }
  };

  const handleDeleteBucket = async (bucketId: string) => {
    if (!confirm('Are you sure you want to delete this folder and all its contents?')) return;
    try {
      await classroomResourceService.deleteBucket(bucketId);
      onUpdated();
    } catch (err) {
      alert('Failed to delete bucket');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await classroomResourceService.deleteItem(itemId);
      onUpdated();
    } catch (err) {
      alert('Failed to remove item');
    }
  };

  const getItemIcon = (type: BucketItemType) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4 text-rose-500" />;
      case 'worksheet':
      case 'document':
        return <FileText className="w-4 h-4 text-emerald-600" />;
      default:
        return <BookOpen className="w-4 h-4 text-[#026fc3]" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shadow-2xs">
              <Folder className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Classroom Resources &amp; Content
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                {buckets.length} folder{buckets.length === 1 ? '' : 's'} organized &bull; Reusable Cloud Materials
              </p>
            </div>
          </div>
        </div>

        {isTeacher && (
          <div className="flex flex-wrap items-center gap-2">
            {onOpenActivityHub && (
              <button
                type="button"
                onClick={onOpenActivityHub}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white rounded-xl text-xs font-extrabold shadow-xs transition-all cursor-pointer"
              >
                <span>Activity Hub</span>
              </button>
            )}

            {/* Explore Cloud Bucket Button */}
            <button
              type="button"
              onClick={() => {
                setTargetBucketId(undefined);
                loadCloudMaterialsAndQuota();
                setShowCloudBucketModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 rounded-xl text-xs font-extrabold shadow-2xs active:scale-95 transition-all cursor-pointer border border-indigo-200/70"
            >
              <Cloud className="w-4 h-4" />
              <span>Explore Cloud Bucket</span>
            </button>

            {/* Add Learning Material Button */}
            <button
              type="button"
              onClick={() => {
                setTargetBucketId(undefined);
                loadCloudMaterialsAndQuota();
                setShowChoiceModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-extrabold shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Learning Material</span>
            </button>

            {/* New Folder Button */}
            <button
              type="button"
              onClick={() => setShowAddBucket(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Folder className="w-3.5 h-3.5" />
              <span>New Folder</span>
            </button>
          </div>
        )}
      </div>

      {/* Cloud Storage Allocation Widget (for Teachers) */}
      {isTeacher && storageUsage && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white rounded-3xl shadow-sm border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-400/20 shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-300">
                  Cloud Storage Allocation
                </h3>
                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  500 MB Max
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {storageUsage.usedMb} MB / {storageUsage.maxMb} MB used ({storageUsage.percentage}%) &bull;{' '}
                <strong className="text-white">{storageUsage.remainingMb} MB remaining</strong>
              </p>
            </div>
          </div>

          <div className="w-full sm:w-64 space-y-1.5 shrink-0">
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  storageUsage.percentage >= 100
                    ? 'bg-rose-500'
                    : storageUsage.percentage >= 85
                    ? 'bg-amber-500'
                    : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min(100, storageUsage.percentage)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
              <span>{storageUsage.fileCount} cloud file{storageUsage.fileCount === 1 ? '' : 's'}</span>
              <span>Upload Once &bull; Reuse Everywhere</span>
            </div>
          </div>
        </div>
      )}

      {/* New Bucket Form Modal / Inline */}
      {showAddBucket && (
        <form onSubmit={handleCreateBucket} className="p-5 bg-white rounded-3xl border-2 border-brand-200 shadow-sm space-y-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Create Resource Folder</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={bucketTitle}
              onChange={(e) => setBucketTitle(e.target.value)}
              placeholder="Folder name (e.g. Unit 3 Study Materials)"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#026fc3]"
            />
            <input
              type="text"
              value={bucketDesc}
              onChange={(e) => setBucketDesc(e.target.value)}
              placeholder="Short description (optional)"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#026fc3]"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddBucket(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-[#026fc3] text-white rounded-xl text-xs font-extrabold"
            >
              {isSubmitting ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      )}

      {/* Buckets Grid */}
      {buckets.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-xs space-y-3">
          <Folder className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-black text-slate-800">No resources in this classroom yet.</h4>
          <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">
            {isTeacher
              ? 'Add materials from your cloud bucket or upload new PDFs to share with your students.'
              : 'Your teacher will add learning resources and notes here.'}
          </p>
          {isTeacher && (
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setTargetBucketId(undefined);
                  loadCloudMaterialsAndQuota();
                  setShowChoiceModal(true);
                }}
                className="px-4 py-2 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-extrabold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Learning Material</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {buckets.map((bucket) => (
            <div key={bucket.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-[#026fc3]" />
                    <h3 className="text-sm font-black text-slate-900">{bucket.title}</h3>
                  </div>
                  {isTeacher && (
                    <button
                      onClick={() => handleDeleteBucket(bucket.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                      title="Delete folder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {bucket.description && (
                  <p className="text-xs text-slate-500 mt-2 font-medium">{bucket.description}</p>
                )}

                {/* Bucket items */}
                <div className="mt-3 space-y-1.5">
                  {(bucket.items || []).length === 0 ? (
                    <div className="text-center py-4 text-[11px] text-slate-400">No items added to this folder yet.</div>
                  ) : (
                    (bucket.items || []).map((item) => {
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl transition-colors text-xs group"
                        >
                          <div className="flex items-center gap-2.5 truncate flex-1">
                            {getItemIcon(item.item_type)}
                            {item.content_url ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.content_url) {
                                    setPreviewMaterial({
                                      title: item.title,
                                      fileUrl: item.content_url,
                                      originalFilename: `${item.title}.pdf`
                                    });
                                  }
                                }}
                                className="font-bold text-slate-900 hover:text-[#026fc3] text-left truncate cursor-pointer hover:underline"
                              >
                                {item.title}
                              </button>
                            ) : (
                              <span className="font-bold text-slate-800 truncate">{item.title}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {item.content_url && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.content_url) {
                                      setPreviewMaterial({
                                        title: item.title,
                                        fileUrl: item.content_url,
                                        originalFilename: `${item.title}.pdf`
                                      });
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-indigo-600 rounded-md transition-colors"
                                  title="Preview Material"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <a
                                  href={item.content_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 text-slate-400 hover:text-[#026fc3] rounded-md transition-colors"
                                  title="Open Link"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </>
                            )}
                            {isTeacher && (
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                                title="Remove from folder"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Add item button */}
              {isTeacher && (
                <div className="pt-2 border-t border-slate-100">
                  {activeBucketId === bucket.id ? (
                    <form onSubmit={handleAddItem} className="space-y-2 pt-1">
                      <input
                        type="text"
                        required
                        value={itemTitle}
                        onChange={(e) => setItemTitle(e.target.value)}
                        placeholder="Item title..."
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={itemType}
                          onChange={(e) => setItemType(e.target.value as BucketItemType)}
                          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        >
                          <option value="lesson">Lesson / Note</option>
                          <option value="worksheet">Worksheet</option>
                          <option value="video">Video</option>
                          <option value="document">Document</option>
                          <option value="link">Web Link</option>
                        </select>
                        <input
                          type="url"
                          value={itemUrl}
                          onChange={(e) => setItemUrl(e.target.value)}
                          placeholder="URL (optional)"
                          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveBucketId(null)}
                          className="px-3 py-1 text-xs text-slate-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 bg-[#026fc3] text-white rounded-lg text-xs font-extrabold"
                        >
                          Add Item
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTargetBucketId(bucket.id);
                          loadCloudMaterialsAndQuota();
                          setShowChoiceModal(true);
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-indigo-50/70 hover:bg-indigo-100 text-xs font-black text-indigo-700 transition-colors flex items-center justify-center gap-1.5 border border-indigo-200/60"
                      >
                        <Cloud className="w-3.5 h-3.5" />
                        <span>Add Learning Material</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveBucketId(bucket.id);
                          setItemTitle('');
                          setItemUrl('');
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        title="Add Custom Note or Web Link"
                      >
                        + Note / Link
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 1. Add Learning Material Choice Modal */}
      <AddLearningMaterialModal
        isOpen={showChoiceModal}
        onClose={() => setShowChoiceModal(false)}
        storageUsage={storageUsage}
        onSelectUploadDevice={() => setShowUploadModal(true)}
        onSelectCloudBucket={() => setShowCloudBucketModal(true)}
      />

      {/* 2. Upload from Device Modal */}
      <UploadFromDeviceModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        classroomId={classroomId}
        bucketId={targetBucketId}
        storageUsage={storageUsage}
        onSuccess={() => {
          onUpdated();
          loadCloudMaterialsAndQuota();
        }}
        onSwitchToCloudBucket={() => {
          setShowUploadModal(false);
          setShowCloudBucketModal(true);
        }}
      />

      {/* 3. Explore Your Cloud Bucket Modal */}
      <ExploreCloudBucketModal
        isOpen={showCloudBucketModal}
        onClose={() => setShowCloudBucketModal(false)}
        classroomId={classroomId}
        bucketId={targetBucketId}
        materials={cloudMaterials}
        storageUsage={storageUsage}
        isLoading={loadingMaterials}
        onMaterialsAssigned={() => {
          onUpdated();
          loadCloudMaterialsAndQuota();
        }}
        onOpenUploadDevice={() => {
          setShowCloudBucketModal(false);
          setShowUploadModal(true);
        }}
        onPreviewMaterial={(material) => {
          setPreviewMaterial({
            title: material.title,
            fileUrl: material.fileUrl || material.file_url,
            originalFilename: material.originalFilename || material.original_filename
          });
        }}
      />

      {/* 4. PDF Preview Modal */}
      {previewMaterial && (
        <PdfPreviewModal
          isOpen={Boolean(previewMaterial)}
          onClose={() => setPreviewMaterial(null)}
          title={previewMaterial.title}
          fileUrl={previewMaterial.fileUrl}
          originalFilename={previewMaterial.originalFilename}
        />
      )}
    </div>
  );
};

