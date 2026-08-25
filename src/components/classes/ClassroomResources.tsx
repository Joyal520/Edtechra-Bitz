import React, { useState } from 'react';
import { Folder, Plus, Trash2, ExternalLink, BookOpen, Video, FileText } from 'lucide-react';
import { ContentBucket, BucketItemType } from '@/types/classroom';
import { classroomResourceService } from '@/services/classroomResourceService';

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

  // Add Item to Bucket modal state
  const [activeBucketId, setActiveBucketId] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState('');
  const [itemType, setItemType] = useState<BucketItemType>('lesson');
  const [itemUrl, setItemUrl] = useState('');

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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <Folder className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Classroom Resources & Content</h2>
            <p className="text-xs text-slate-500 font-semibold">{buckets.length} folders organized</p>
          </div>
        </div>

        {isTeacher && (
          <div className="flex items-center gap-2">
            {onOpenActivityHub && (
              <button
                type="button"
                onClick={onOpenActivityHub}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white rounded-xl text-xs font-extrabold shadow-xs transition-all cursor-pointer"
              >
                <span>Activity Hub</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAddBucket(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-extrabold shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Folder</span>
            </button>
          </div>
        )}
      </div>

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
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-xs space-y-2">
          <Folder className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-500">No resources in this classroom yet.</p>
          <p className="text-[11px] text-slate-400">
            {isTeacher
              ? 'Create folders to share readings, videos, worksheets, and study notes.'
              : 'Your teacher will add learning resources and notes here.'}
          </p>
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
                    (bucket.items || []).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 p-2 bg-slate-50 hover:bg-slate-100/80 rounded-xl transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {getItemIcon(item.item_type)}
                          {item.content_url ? (
                            <a
                              href={item.content_url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-slate-900 hover:text-[#026fc3] hover:underline truncate"
                            >
                              {item.title}
                            </a>
                          ) : (
                            <span className="font-bold text-slate-800 truncate">{item.title}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {item.content_url && (
                            <a
                              href={item.content_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-slate-400 hover:text-[#026fc3]"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {isTeacher && (
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
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
                    <button
                      type="button"
                      onClick={() => {
                        setActiveBucketId(bucket.id);
                        setItemTitle('');
                        setItemUrl('');
                      }}
                      className="w-full py-1.5 rounded-xl border border-dashed border-slate-200 text-xs font-extrabold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      + Add Item to Folder
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
