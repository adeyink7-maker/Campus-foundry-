import { useState } from 'react';
import { 
  Newspaper, 
  Calendar, 
  Clock, 
  Share2, 
  Bookmark, 
  CheckCircle2, 
  ChevronRight, 
  ShieldCheck, 
  Search, 
  Sparkles,
  X,
  ExternalLink
} from 'lucide-react';
import { CampusNewsArticle } from '../types';
import { CAMPUS_NEWS } from '../data/socialMockData';

interface CampusNewsViewProps {
  onShowToast?: (msg: string) => void;
}

export const CampusNewsView = ({ onShowToast }: CampusNewsViewProps) => {
  const [articles, setArticles] = useState<CampusNewsArticle[]>(CAMPUS_NEWS);
  const [selectedArticle, setSelectedArticle] = useState<CampusNewsArticle | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedMap, setBookmarkedMap] = useState<Record<string, boolean>>({});

  const categories = [
    'All',
    'Senate & Admin',
    'Academic Calendar',
    'Exams & CBT',
    'Sports & UNILORIN League',
  ];

  const handleToggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedMap((prev) => {
      const nextVal = !prev[id];
      onShowToast?.(nextVal ? 'Article saved to bookmarks.' : 'Bookmark removed.');
      return { ...prev, [id]: nextVal };
    });
  };

  const handleShare = (article: CampusNewsArticle, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(window.location.href);
    onShowToast?.('Article link copied to clipboard!');
  };

  const filteredArticles = articles.filter((art) => {
    if (activeCategory !== 'All' && art.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = art.title.toLowerCase().includes(q);
      const matchSummary = art.summary.toLowerCase().includes(q);
      const matchAuthor = art.author.toLowerCase().includes(q);
      if (!matchTitle && !matchSummary && !matchAuthor) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* 1. Official News Header Banner */}
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 p-5 sm:p-6 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <Newspaper className="h-3 w-3" />
                <span>UNILORIN Gazette & Bulletins</span>
              </span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Verified News Desk
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              Campus News & Official Senate Bulletins
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed">
              Stay ahead with verified University Senate resolutions, academic calendar updates, CBT examination timetables, and sports league fixtures.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block font-mono">
                Latest Bulletin
              </span>
              <div className="text-sm font-bold text-white mt-0.5">Harmattan 2026/2027</div>
              <span className="text-[10px] text-emerald-400 font-mono">Senate Approved</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Category Filter & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-neutral-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bulletins..."
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* 3. Articles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredArticles.map((art) => (
          <article
            key={art.id}
            onClick={() => setSelectedArticle(art)}
            className="rounded-2xl border border-neutral-800 bg-neutral-900/70 overflow-hidden backdrop-blur-md flex flex-col justify-between hover:border-neutral-700 transition-all cursor-pointer group"
          >
            <div>
              {/* Feature Image */}
              <div className="relative h-48 w-full bg-neutral-950 overflow-hidden">
                <img
                  src={art.imageUrl}
                  alt={art.title}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-transparent" />
                
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="rounded-full bg-neutral-900/90 text-emerald-400 border border-neutral-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                    {art.category}
                  </span>
                  {art.isBreaking && (
                    <span className="rounded-full bg-rose-600 text-white px-2 py-0.5 text-[9px] font-mono font-bold uppercase animate-pulse">
                      Breaking
                    </span>
                  )}
                </div>

                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-neutral-300 font-mono">
                  <span>{art.publishedAt}</span>
                  <span>{art.readTime}</span>
                </div>
              </div>

              {/* Title & Summary */}
              <div className="p-5 space-y-2">
                <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors leading-snug">
                  {art.title}
                </h3>
                <p className="text-xs text-neutral-300 line-clamp-3 leading-relaxed">
                  {art.summary}
                </p>
              </div>
            </div>

            {/* Bottom Meta & Actions */}
            <div className="p-5 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400 font-medium">
                {art.authorRole}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleShare(art, e)}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
                  title="Share"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleToggleBookmark(art.id, e)}
                  className={`rounded-lg p-1.5 transition-colors ${
                    bookmarkedMap[art.id]
                      ? 'text-amber-400 bg-amber-500/10'
                      : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  }`}
                  title="Bookmark"
                >
                  <Bookmark className={`h-4 w-4 ${bookmarkedMap[art.id] ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

          </article>
        ))}
      </div>

      {/* 4. Full Article Reader Modal */}
      {selectedArticle && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedArticle(null)}
        >
          <div 
            className="relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-5 py-4 shrink-0">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                {selectedArticle.category} • {selectedArticle.publishedAt}
              </span>
              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="relative h-56 w-full rounded-xl overflow-hidden border border-neutral-800">
                <img
                  src={selectedArticle.imageUrl}
                  alt={selectedArticle.title}
                  className="h-full w-full object-cover"
                />
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
                {selectedArticle.title}
              </h2>

              <div className="flex items-center justify-between text-xs text-neutral-400 pb-3 border-b border-neutral-800 font-mono">
                <span>By: {selectedArticle.author} ({selectedArticle.authorRole})</span>
                <span>{selectedArticle.readTime}</span>
              </div>

              <div className="text-xs sm:text-sm text-neutral-200 leading-relaxed space-y-3 whitespace-pre-line">
                {selectedArticle.content}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
