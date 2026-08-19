import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Image as ImageIcon,
  SlidersHorizontal,
  BookOpen,
  Loader2,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { StudentPost } from '@/types/post';
import { postService } from '@/services/postService';
import { useAuth } from '@/context/AuthContext';
import { PostCard } from './PostCard';
import { PostComposerModal } from './PostComposerModal';
import { AdminModerationModal } from './AdminModerationModal';

export const PostFeed: React.FC = () => {
  const { user, profile, session, requireAuth } = useAuth();
  
  const [posts, setPosts] = useState<StudentPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');
  const [composerOpen, setComposerOpen] = useState<boolean>(false);
  const [adminModalOpen, setAdminModalOpen] = useState<boolean>(false);

  const displayName =
    profile?.full_name?.trim() ||
    profile?.name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    (user?.email ? user.email.split('@')[0] : 'Student');

  const avatarUrl =
    profile?.avatar_url ||
    profile?.avatarUrl ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture;

  const initials = (displayName || 'S').slice(0, 2).toUpperCase();

  const fetchPosts = useCallback(
    async (targetPage = 1, append = false) => {
      if (targetPage === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const token = session?.access_token || null;
        const data = await postService.getPosts(
          { page: targetPage, limit: 8, sort: sortBy },
          token
        );

        if (append) {
          setPosts((prev) => [...prev, ...data.posts]);
        } else {
          setPosts(data.posts);
        }

        setHasMore(data.hasMore);
        setPage(targetPage);
      } catch (err) {
        console.error('[PostFeed] Error loading posts:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [session, sortBy]
  );

  useEffect(() => {
    fetchPosts(1, false);
  }, [fetchPosts]);

  const handleOpenComposer = () => {
    requireAuth({ type: 'action', action: 'create_post' }, () => {
      setComposerOpen(true);
    });
  };

  const handlePostCreated = (newPost: StudentPost) => {
    // Optimistically insert new post at top of feed
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostDeleted = (deletedPostId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== deletedPostId));
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      
      {/* 1. Quick "Create Post" Composer Bar */}
      <div className="bg-white border border-stone-200/80 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-[1.5px] shadow-2xs overflow-hidden shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full rounded-full object-cover bg-amber-100" />
            ) : (
              <div className="w-full h-full rounded-full bg-amber-100 flex items-center justify-center font-bold text-xs text-slate-800">
                {initials}
              </div>
            )}
          </div>

          <button
            onClick={handleOpenComposer}
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 text-xs sm:text-sm font-semibold rounded-2xl text-left transition-colors cursor-pointer"
          >
            What's on your mind? Share your knowledge…
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleOpenComposer}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-brand-50 text-[#026fc3] text-xs font-bold transition-colors cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 text-[#026fc3]" />
            <span>Add Square Photo</span>
          </button>

          <button
            onClick={handleOpenComposer}
            className="px-4 py-1.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Create Post</span>
          </button>
        </div>
      </div>

      {/* 2. Feed Controls & Filter Header */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-semibold">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-slate-800 text-sm">Student Feed</span>
          <span className="text-slate-300">•</span>
          <span>{posts.length} {posts.length === 1 ? 'post' : 'posts'}</span>
        </div>

        <div className="flex items-center gap-3">
          {profile?.role === 'admin' && (
            <button
              onClick={() => setAdminModalOpen(true)}
              className="px-3 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open AI Moderation Queue"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>Admin Queue</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'popular')}
              className="bg-transparent text-slate-700 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="popular">Most Liked</option>
            </select>
          </div>

          <button
            onClick={() => fetchPosts(1, false)}
            disabled={loading}
            className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh Feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#026fc3]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. Feed Posts List */}
      {loading ? (
        <div className="space-y-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-2.5 bg-slate-100 rounded w-1/6"></div>
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded w-3/4"></div>
              <div className="w-full aspect-square bg-slate-200 rounded-2xl"></div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-[#026fc3] flex items-center justify-center mx-auto shadow-xs">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#0f233a]">No Student Posts Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Be the first to share an educational insight, study diagram, or learning reflection with the community!
            </p>
          </div>
          <button
            onClick={handleOpenComposer}
            className="px-5 py-2.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-2xl shadow-xs transition-all active:scale-95 inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create First Post</span>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPostDeleted={handlePostDeleted}
            />
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div className="pt-2 text-center">
              <button
                onClick={() => fetchPosts(page + 1, true)}
                disabled={loadingMore}
                className="px-6 py-2.5 bg-white border border-slate-200 hover:border-brand-400 hover:bg-brand-50/50 text-slate-700 text-xs font-bold rounded-2xl shadow-xs transition-all flex items-center gap-2 mx-auto cursor-pointer disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#026fc3]" />
                    <span>Loading more posts…</span>
                  </>
                ) : (
                  <span>Load More Posts</span>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Post Composer Modal */}
      <PostComposerModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        onPostCreated={handlePostCreated}
      />

      {/* Admin Moderation Queue Modal */}
      {profile?.role === 'admin' && (
        <AdminModerationModal
          isOpen={adminModalOpen}
          onClose={() => setAdminModalOpen(false)}
          onPostUpdated={() => fetchPosts(1, false)}
        />
      )}

    </div>
  );
};
