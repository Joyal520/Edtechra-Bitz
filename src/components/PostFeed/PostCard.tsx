import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Trash2,
  ShieldCheck,
  Check,
  Maximize2,
  X,
  Sparkles
} from 'lucide-react';
import { StudentPost } from '@/types/post';
import { useAuth } from '@/context/AuthContext';
import { postService } from '@/services/postService';

interface PostCardProps {
  post: StudentPost;
  onPostDeleted?: (postId: string) => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 45) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return 'Recently';
  }
}

export const PostCard: React.FC<PostCardProps> = ({ post, onPostDeleted }) => {
  const { user, isAdmin, session, requireAuth } = useAuth();
  
  const [isLiked, setIsLiked] = useState<boolean>(post.is_liked_by_me || false);
  const [likesCount, setLikesCount] = useState<number>(post.likes_count || 0);
  const [isSaved, setIsSaved] = useState<boolean>(post.is_saved_by_me || false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);
  const [imageModalOpen, setImageModalOpen] = useState<boolean>(false);
  const [commentOpen, setCommentOpen] = useState<boolean>(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const isAuthor = Boolean(user && user.id === post.user_id);
  const canDelete = isAuthor || isAdmin;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLike = () => {
    requireAuth({ type: 'action', action: 'like' }, async () => {
      // Optimistic update
      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      setLikesCount((prev) => (newLikedState ? prev + 1 : Math.max(0, prev - 1)));

      try {
        const token = session?.access_token || null;
        const res = await postService.toggleLike(post.id, token);
        setIsLiked(res.liked);
        setLikesCount(res.likesCount);
      } catch (err) {
        console.error('Error toggling like:', err);
        // Revert on error
        setIsLiked(!newLikedState);
        setLikesCount((prev) => (!newLikedState ? prev + 1 : Math.max(0, prev - 1)));
      }
    });
  };

  const handleSave = () => {
    requireAuth({ type: 'action', action: 'save' }, () => {
      setIsSaved(!isSaved);
    });
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/explore?post=${post.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2200);
      });
    }
  };

  const handleDelete = async () => {
    if (!canDelete || isDeleting) return;

    if (!window.confirm('Are you sure you want to delete this post? This will permanently remove the image.')) {
      return;
    }

    try {
      setIsDeleting(true);
      const token = session?.access_token || null;
      await postService.deletePost(post.id, token);
      if (onPostDeleted) {
        onPostDeleted(post.id);
      }
    } catch (err: any) {
      console.error('Failed to delete post:', err);
      alert(err.message || 'Failed to delete post.');
      setIsDeleting(false);
    }
  };

  const authorName = post.author?.full_name || 'EdTechra Student';
  const authorAvatar = post.author?.avatar_url;
  const authorRole = post.author?.role || 'student';
  const authorInitials = authorName.slice(0, 2).toUpperCase();

  return (
    <article className="w-full bg-white border border-stone-200/80 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all">
      
      {/* 1. Header: Avatar, Name, Timestamp, Options Menu */}
      <div className="p-4 sm:p-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-[1.5px] shadow-2xs overflow-hidden shrink-0">
            {authorAvatar ? (
              <img
                src={authorAvatar}
                alt={authorName}
                className="w-full h-full rounded-full object-cover bg-amber-100"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-amber-100 flex items-center justify-center font-bold text-xs text-slate-800">
                {authorInitials}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xs sm:text-sm text-[#0f233a] leading-tight">
                {authorName}
              </span>
              {authorRole === 'admin' && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-800 text-[9px] font-black uppercase">
                  <ShieldCheck className="w-2.5 h-2.5" /> Admin
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              {formatRelativeTime(post.created_at)}
            </span>
          </div>
        </div>

        {/* Options Menu (Delete for Owner / Admin) */}
        {canDelete && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              aria-label="Post Options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-20 animate-in fade-in duration-100">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Deleting…' : 'Delete Post'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Caption Text */}
      <div className="px-4 sm:px-5 pb-3">
        <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap">
          {post.caption}
        </p>
      </div>

      {/* 3. STRICT 1:1 SQUARE MEDIA CONTAINER */}
      <div className="px-3 sm:px-4 pb-3">
        <div
          onClick={() => setImageModalOpen(true)}
          className="relative w-full aspect-square bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer group shadow-2xs"
        >
          <img
            src={post.image_url}
            alt={post.caption || 'Student learning post image'}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
          />

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="p-2 rounded-full bg-white/80 backdrop-blur-md text-slate-900 shadow-md">
              <Maximize2 className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Action Bar: Like, Comment, Share, Save */}
      <div className="px-4 sm:px-5 py-3 border-t border-slate-100 flex items-center justify-between text-slate-600">
        <div className="flex items-center gap-1 sm:gap-2">
          
          {/* Like Button */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer ${
              isLiked
                ? 'bg-rose-50 text-rose-600'
                : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-600 stroke-rose-600' : ''}`} />
            <span>{likesCount > 0 ? likesCount : 'Like'}</span>
          </button>

          {/* Comment Button */}
          <button
            onClick={() => setCommentOpen(!commentOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Comment</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer relative"
          >
            {copiedToast ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            <span>{copiedToast ? 'Copied!' : 'Share'}</span>
          </button>

        </div>

        {/* Save / Bookmark Button */}
        <button
          onClick={handleSave}
          className={`p-2 rounded-full transition-colors cursor-pointer ${
            isSaved
              ? 'text-[#026fc3] bg-brand-50'
              : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
          }`}
          title={isSaved ? 'Saved' : 'Save post'}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#026fc3]' : ''}`} />
        </button>
      </div>

      {/* Expandable Comment Drawer */}
      {commentOpen && (
        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 bg-slate-50/50 space-y-2 animate-in fade-in">
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#026fc3]" />
            <span>Student Discussions</span>
          </div>
          <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400 font-semibold">
            Educational discussions and reflections will appear here.
          </div>
        </div>
      )}

      {/* Fullscreen 1:1 Image Preview Modal */}
      {imageModalOpen && (
        <div
          onClick={() => setImageModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
        >
          <button
            onClick={() => setImageModalOpen(false)}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full aspect-square bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/20"
          >
            <img
              src={post.image_url}
              alt={post.caption}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

    </article>
  );
};
