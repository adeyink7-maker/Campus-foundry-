import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Share2, 
  MapPin, 
  ShieldCheck, 
  Store, 
  Repeat, 
  Quote, 
  Bookmark, 
  ExternalLink, 
  MessageSquare, 
  UserPlus, 
  UserCheck, 
  Trash2, 
  X, 
  Flame, 
  Lightbulb, 
  Sparkles,
  Phone
} from 'lucide-react';
import { CampusPost, StudentBusiness, PostReactionCounts } from '../types';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

interface PostCardProps {
  post: CampusPost;
  onLikeToggle?: (postId: string) => void;
  onAddComment?: (postId: string, commentText: string) => void;
  onSelectBusiness?: (business: StudentBusiness) => void;
  onDeletePost?: (postId: string) => void;
  allBusinesses?: StudentBusiness[];
  onOpenAuthorProfile?: (authorId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onLikeToggle,
  onSelectBusiness,
  onDeletePost,
  allBusinesses = [],
  onOpenAuthorProfile,
}) => {
  const { currentUser, toggleFollowUser } = useAuth();
  const { openChatWithBusiness, openChatDrawer } = useChat();
  
  // Local reactive reactions state
  const [reactions, setReactions] = useState<PostReactionCounts>(() => {
    return (
      post.reactions || {
        heart: post.likesCount || 14,
        fire: 8,
        lightbulb: 5,
        clap: 6,
        myReaction: post.likedByMe ? 'heart' : undefined,
      }
    );
  });

  // Reshare & Quote state
  const [resharesCount, setResharesCount] = useState<number>(post.resharesCount || 4);
  const [isReshared, setIsReshared] = useState<boolean>(post.resharedByMe || false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState<boolean>(false);
  const [quoteComment, setQuoteComment] = useState<string>('');
  const [myQuote, setMyQuote] = useState<{ author: string; text: string } | null>(null);

  const [copiedToast, setCopiedToast] = useState(false);

  // Check if author has a linked business in the marketplace
  const linkedBusiness = allBusinesses.find(
    (b) =>
      b.ownerId === post.authorId ||
      b.id === post.authorBusinessId ||
      (post.authorBusinessName && b.name.toLowerCase() === post.authorBusinessName.toLowerCase())
  );

  const isFollowingAuthor = currentUser?.followingUserIds?.includes(post.authorId);
  const isMyPost = currentUser?.id === post.authorId;

  const handleToggleReaction = (type: 'heart' | 'fire' | 'lightbulb' | 'clap') => {
    setReactions((prev) => {
      const isAlready = prev.myReaction === type;
      const nextReaction = isAlready ? undefined : type;

      const updated = {
        ...prev,
        [type]: isAlready ? Math.max(0, prev[type] - 1) : prev[type] + 1,
        myReaction: nextReaction,
      };

      if (prev.myReaction && prev.myReaction !== type) {
        updated[prev.myReaction] = Math.max(0, updated[prev.myReaction] - 1);
      }

      return updated;
    });

    if (type === 'heart' && onLikeToggle) {
      onLikeToggle(post.id);
    }
  };

  const handleSimpleReshare = () => {
    if (isReshared) {
      setIsReshared(false);
      setResharesCount((c) => Math.max(0, c - 1));
    } else {
      setIsReshared(true);
      setResharesCount((c) => c + 1);
    }
  };

  const handleConfirmQuoteReshare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteComment.trim()) return;
    setMyQuote({
      author: currentUser?.fullName || 'You',
      text: quoteComment.trim(),
    });
    setIsReshared(true);
    setResharesCount((c) => c + 1);
    setIsQuoteModalOpen(false);
    setQuoteComment('');
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2200);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Academics & GNS':
        return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      case 'Student Hustle & Trades':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'SUG & Elections':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'Events & Sports':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      default:
        return 'text-neutral-400 bg-neutral-800 border-neutral-700';
    }
  };

  return (
    <article className="rounded-3xl border border-neutral-800 bg-neutral-900/90 p-5 sm:p-6 backdrop-blur-xl shadow-xl transition-all hover:border-neutral-700/80 space-y-4">
      
      {/* Top Author Metadata & Academic Identity */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          
          {/* Avatar with click to profile */}
          <div 
            onClick={() => onOpenAuthorProfile?.(post.authorId)}
            className="relative cursor-pointer group/avatar"
          >
            {post.authorAvatar ? (
              <img
                src={post.authorAvatar}
                alt={post.authorName}
                className="h-11 w-11 rounded-2xl object-cover border-2 border-neutral-700 group-hover/avatar:border-amber-400 transition-colors shadow-md"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 font-bold text-neutral-950 text-sm shadow-md">
                {post.authorName[0]}
              </div>
            )}
            {post.isVerifiedStudent && (
              <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-neutral-950 shadow-sm" title="Verified UNILORIN Student">
                <ShieldCheck className="h-2.5 w-2.5" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span 
                onClick={() => onOpenAuthorProfile?.(post.authorId)}
                className="text-xs sm:text-sm font-bold text-white hover:text-amber-400 cursor-pointer transition-colors"
              >
                {post.authorName}
              </span>

              <span className="rounded-md bg-neutral-800 px-1.5 py-0.5 text-[10px] font-mono text-neutral-300 border border-neutral-700">
                {post.authorLevel}
              </span>

              {post.authorRole === 'trader' && (
                <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-mono font-bold">
                  Trader
                </span>
              )}

              {/* Follow Button */}
              {currentUser && !isMyPost && (
                <button
                  type="button"
                  onClick={() => toggleFollowUser(post.authorId)}
                  className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                    isFollowingAuthor
                      ? 'bg-neutral-800 text-neutral-400 hover:text-red-400 border border-neutral-700'
                      : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                  }`}
                >
                  {isFollowingAuthor ? (
                    <>
                      <UserCheck className="h-3 w-3 text-emerald-400" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3 w-3" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-neutral-400 truncate mt-0.5">
              <span>{post.authorDept || 'UNILORIN Student'}</span>
              <span>•</span>
              <time>{new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time>
            </div>
          </div>
        </div>

        {/* Category & Location Badge */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${getCategoryColor(post.category)}`}>
            {post.category}
          </span>
          {post.locationTag && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">
              <MapPin className="h-3 w-3" />
              <span>{post.locationTag.split(',')[0]}</span>
            </span>
          )}
        </div>
      </div>

      {/* Post Text Content */}
      <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed whitespace-pre-line font-medium">
        {post.content}
      </p>

      {/* Attached Media Photo / Video */}
      {post.mediaUrl && (
        <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 aspect-video sm:aspect-auto sm:max-h-96 shadow-lg">
          {post.mediaType === 'video' ? (
            <video
              src={post.mediaUrl}
              controls
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={post.mediaUrl}
              alt="Post media"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
        </div>
      )}

      {/* Linked Student Business Card */}
      {linkedBusiness && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-neutral-950 font-bold shrink-0 shadow-sm">
              <Store className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{linkedBusiness.name}</span>
                <span className="text-[10px] text-amber-300 font-mono font-normal">({linkedBusiness.category})</span>
              </div>
              <p className="text-[11px] text-neutral-300 line-clamp-1">
                {linkedBusiness.tagline}
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => onSelectBusiness?.(linkedBusiness)}
            className="rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer shrink-0 self-start sm:self-auto flex items-center gap-1.5 shadow-md"
          >
            <span>View & Order</span>
            <ExternalLink className="h-3 w-3" />
          </motion.button>
        </div>
      )}

      {/* Quoted Repost Render */}
      {myQuote && (
        <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 font-mono">
            <Repeat className="h-3.5 w-3.5" />
            <span>Reshared by {myQuote.author}</span>
          </div>
          <p className="text-xs text-neutral-200">{myQuote.text}</p>
        </div>
      )}

      {/* ======================================================== */}
      {/* PUBLIC FEED INTERACTION POLICY (X / Twitter Global Standards) */}
      {/* Users can View, React, Share, and Reshare (Comments Disabled) */}
      {/* ======================================================== */}
      <div className="pt-3 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Multi-Emoji Reaction Suite */}
        <div className="flex items-center gap-1.5 flex-wrap">
          
          {/* Heart / Love */}
          <button
            type="button"
            onClick={() => handleToggleReaction('heart')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
              reactions.myReaction === 'heart'
                ? 'bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30'
                : 'bg-neutral-800/60 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${reactions.myReaction === 'heart' ? 'fill-current' : ''}`} />
            <span className="font-mono text-[11px]">{reactions.heart}</span>
          </button>

          {/* Fire / Hot */}
          <button
            type="button"
            onClick={() => handleToggleReaction('fire')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
              reactions.myReaction === 'fire'
                ? 'bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30'
                : 'bg-neutral-800/60 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Flame className={`h-3.5 w-3.5 ${reactions.myReaction === 'fire' ? 'fill-current' : ''}`} />
            <span className="font-mono text-[11px]">{reactions.fire}</span>
          </button>

          {/* Lightbulb / Insightful */}
          <button
            type="button"
            onClick={() => handleToggleReaction('lightbulb')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
              reactions.myReaction === 'lightbulb'
                ? 'bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30'
                : 'bg-neutral-800/60 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Lightbulb className={`h-3.5 w-3.5 ${reactions.myReaction === 'lightbulb' ? 'fill-current' : ''}`} />
            <span className="font-mono text-[11px]">{reactions.lightbulb}</span>
          </button>

          {/* Clap / Support */}
          <button
            type="button"
            onClick={() => handleToggleReaction('clap')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
              reactions.myReaction === 'clap'
                ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                : 'bg-neutral-800/60 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="font-mono text-[11px]">{reactions.clap}</span>
          </button>
        </div>

        {/* Reshare, Share & Connect Actions */}
        <div className="flex items-center gap-2">
          
          {/* Twitter / X Reshare Button */}
          <div className="relative">
            <button
              type="button"
              onClick={handleSimpleReshare}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all cursor-pointer ${
                isReshared
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                  : 'bg-neutral-800/60 text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              title="Reshare Post"
            >
              <Repeat className={`h-3.5 w-3.5 ${isReshared ? 'stroke-[2.5]' : ''}`} />
              <span className="font-mono text-[11px]">{resharesCount}</span>
            </button>
          </div>

          {/* Quote Repost Trigger */}
          <button
            type="button"
            onClick={() => setIsQuoteModalOpen(true)}
            className="p-1.5 rounded-xl bg-neutral-800/60 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Quote Repost with Comment"
          >
            <Quote className="h-3.5 w-3.5" />
          </button>

          {/* Global Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-neutral-800/60 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Share Post Link"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="text-[11px]">{copiedToast ? 'Copied!' : 'Share'}</span>
          </button>

          {/* Message Author (Twitter / X Inbound Request Model) */}
          {currentUser?.id !== post.authorId && (
            <button
              type="button"
              onClick={() => {
                if (linkedBusiness) {
                  openChatWithBusiness(linkedBusiness, `Saw your campus post: "${post.content.slice(0, 35)}..."`, undefined, true);
                } else {
                  openChatDrawer('requests');
                }
              }}
              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-neutral-950 font-bold transition-all cursor-pointer"
              title="Send Message Request"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[11px]">Message</span>
            </button>
          )}

          {/* Delete (if owner) */}
          {isMyPost && onDeletePost && (
            <button
              type="button"
              onClick={() => onDeletePost(post.id)}
              className="p-1.5 rounded-xl text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Delete Post"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

      </div>

      {/* Quote Repost Dialog Modal */}
      {isQuoteModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setIsQuoteModalOpen(false)}
        >
          <div 
            className="w-full max-w-lg rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Quote className="h-4 w-4 text-amber-400" />
                <span>Quote Reshare Post</span>
              </h3>
              <button type="button" onClick={() => setIsQuoteModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Original Post Preview */}
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs space-y-1">
              <div className="font-bold text-amber-400">{post.authorName} · {post.authorDept}</div>
              <p className="text-neutral-300 line-clamp-2">{post.content}</p>
            </div>

            <form onSubmit={handleConfirmQuoteReshare} className="space-y-4">
              <textarea
                rows={3}
                required
                value={quoteComment}
                onChange={(e) => setQuoteComment(e.target.value)}
                placeholder="Add your thoughts, insights or review to quote this post..."
                className="w-full p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 resize-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuoteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold hover:bg-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-md cursor-pointer"
                >
                  Post Quote Reshare
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </article>
  );
};

export default PostCard;
