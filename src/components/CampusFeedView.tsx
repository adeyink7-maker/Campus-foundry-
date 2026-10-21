import { useState, useMemo } from 'react';
import { 
  Sparkles, 
  PlusCircle, 
  Search, 
  Filter, 
  Flame, 
  Clock, 
  ShoppingBag, 
  Send, 
  Image, 
  BookOpen, 
  Vote,
  Compass
} from 'lucide-react';
import { CampusPost, CampusSnap, StudentBusiness, StudentLevel, AppModule } from '../types';
import { CampusSnapsBar } from './CampusSnapsBar';
import { PostCard } from './PostCard';
import { useAuth } from '../context/AuthContext';

interface CampusFeedViewProps {
  posts: CampusPost[];
  snaps: CampusSnap[];
  businesses: StudentBusiness[];
  selectedLevel: StudentLevel | 'All';
  onLikeToggle: (postId: string) => void;
  onAddComment: (postId: string, commentText: string) => void;
  onSelectSnap: (snap: CampusSnap) => void;
  onOpenCreateSnap: () => void;
  onOpenCreatePost: () => void;
  onSelectBusiness: (business: StudentBusiness) => void;
  onNavigateModule: (mod: AppModule) => void;
  onOpenAuthorProfile?: (authorId: string, authorDetails?: any) => void;
  onDeletePost?: (postId: string) => void;
}

const FEED_CATEGORIES = [
  'All Buzz',
  'Academics & GNS',
  'Student Hustle & Trades',
  'SUG & Elections',
  'Events & Sports',
  'Campus Life & Hostels',
] as const;

export const CampusFeedView = ({
  posts,
  snaps,
  businesses,
  selectedLevel,
  onLikeToggle,
  onAddComment,
  onSelectSnap,
  onOpenCreateSnap,
  onOpenCreatePost,
  onSelectBusiness,
  onNavigateModule,
  onOpenAuthorProfile,
  onDeletePost,
}: CampusFeedViewProps) => {
  const { currentUser } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>('All Buzz');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'latest' | 'popular'>('latest');

  // Filter posts by category, academic level, and search query
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (activeCategory !== 'All Buzz' && post.category !== activeCategory) {
        return false;
      }
      if (selectedLevel !== 'All' && post.authorLevel !== selectedLevel) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesContent = post.content.toLowerCase().includes(q);
        const matchesAuthor = post.authorName.toLowerCase().includes(q);
        const matchesLoc = post.locationTag?.toLowerCase().includes(q);
        const matchesDept = post.authorDept?.toLowerCase().includes(q);
        if (!matchesContent && !matchesAuthor && !matchesLoc && !matchesDept) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortOrder === 'popular') {
        return b.likesCount - a.likesCount;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [posts, activeCategory, selectedLevel, searchQuery, sortOrder]);

  return (
    <div className="space-y-6">
      
      {/* 1. 24-Hour Campus Snaps Bar */}
      <CampusSnapsBar
        snaps={snaps}
        onSelectSnap={onSelectSnap}
        onOpenCreateSnap={onOpenCreateSnap}
      />

      {/* 2. Quick Create Post Banner */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shrink-0 ${
            currentUser?.role === 'trader' ? 'bg-amber-600' : 'bg-emerald-600'
          }`}>
            {currentUser?.fullName ? currentUser.fullName[0].toUpperCase() : 'U'}
          </div>

          <button
            type="button"
            onClick={onOpenCreatePost}
            className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-left text-xs text-neutral-400 hover:border-neutral-700 hover:text-neutral-200 transition-all cursor-pointer flex items-center justify-between"
          >
            <span>What's happening at UNILORIN today, {currentUser?.fullName?.split(' ')[0] || 'Student'}?</span>
            <div className="flex items-center gap-2 text-emerald-400">
              <Image className="h-4 w-4" />
              <Send className="h-4 w-4" />
            </div>
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between pt-2 border-t border-neutral-800/60 text-xs text-neutral-400 px-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenCreatePost}
              className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5 text-blue-400" />
              <span>GNS/Academic Note</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateModule('marketplace')}
              className="flex items-center gap-1.5 hover:text-amber-400 transition-colors cursor-pointer"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-amber-400" />
              <span>Hostel Trade Promo</span>
            </button>
          </div>

          <span className="text-[11px] text-neutral-500 font-mono">
            {selectedLevel === 'All' ? 'All Classes' : `${selectedLevel} Filter Active`}
          </span>
        </div>
      </div>

      {/* 3. Filter Category Pills & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {FEED_CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-neutral-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Sort & Search Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search feed..."
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center rounded-xl border border-neutral-800 bg-neutral-900 p-1">
            <button
              type="button"
              onClick={() => setSortOrder('latest')}
              className={`rounded-lg p-1.5 transition-colors ${
                sortOrder === 'latest' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400 hover:text-white'
              }`}
              title="Latest Posts"
            >
              <Clock className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSortOrder('popular')}
              className={`rounded-lg p-1.5 transition-colors ${
                sortOrder === 'popular' ? 'bg-neutral-800 text-amber-400' : 'text-neutral-400 hover:text-white'
              }`}
              title="Most Popular"
            >
              <Flame className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Posts Feed List */}
      <div className="space-y-4">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLikeToggle={onLikeToggle}
              onAddComment={onAddComment}
              onSelectBusiness={onSelectBusiness}
              onDeletePost={onDeletePost}
              allBusinesses={businesses}
              onOpenAuthorProfile={(authorId) =>
                onOpenAuthorProfile?.(authorId, {
                  fullName: post.authorName,
                  username: post.authorUsername || `@${post.authorName.toLowerCase().replace(/\s+/g, '_')}`,
                  avatarUrl: post.authorAvatar,
                  level: post.authorLevel,
                  department: post.authorDept,
                  faculty: post.authorFaculty,
                })
              }
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 p-10 text-center space-y-3">
            <Compass className="h-8 w-8 text-neutral-500 mx-auto" />
            <h3 className="text-sm font-bold text-white">No posts matching your filters</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Be the first to share an academic inquiry, hostel update, or trade promo for this category!
            </p>
            <button
              type="button"
              onClick={onOpenCreatePost}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
            >
              Create Post Now
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
