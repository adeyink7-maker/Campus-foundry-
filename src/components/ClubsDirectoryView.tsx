import { useState } from 'react';
import { 
  Users, 
  Search, 
  ChevronRight
} from 'lucide-react';
import { CampusClub } from '../types';
import { CAMPUS_CLUBS } from '../data/socialMockData';

interface ClubsDirectoryViewProps {
  onRequireAuth?: () => void;
  onShowToast?: (msg: string) => void;
}

export const ClubsDirectoryView = ({
  onShowToast,
}: ClubsDirectoryViewProps) => {
  const [clubs] = useState<CampusClub[]>(CAMPUS_CLUBS);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    'All',
    'Leadership',
    'Tech & Innovation',
    'Humanitarian',
    'Arts & Culture',
    'Academic',
  ];

  const filteredClubs = clubs.filter((club) => {
    if (activeCategory !== 'All' && club.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = club.name.toLowerCase().includes(q);
      const matchAcronym = club.acronym.toLowerCase().includes(q);
      const matchDesc = club.description.toLowerCase().includes(q);
      if (!matchName && !matchAcronym && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* 1. Clubs Top Hero Banner */}
      <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/50 via-neutral-900 to-neutral-950 p-5 sm:p-6 backdrop-blur-md">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>UNILORIN Student Societies</span>
            </span>
            <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              Campus Organizations
            </span>
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
            Clubs & Student Societies
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed">
            Discover student-led clubs, leadership organizations, and technical developer communities across the university.
          </p>
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
                    ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
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
            placeholder="Search clubs..."
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>

      {/* 3. Clubs Directory Grid (Strictly Name & Category, No Invented Member Counts, Fees, Schedules, or Venues) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredClubs.map((club) => (
          <div
            key={club.id}
            className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 backdrop-blur-md flex flex-col justify-between hover:border-neutral-700 transition-colors space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  {club.category}
                </span>
                {club.acronym && (
                  <span className="text-[10px] font-mono text-neutral-400">
                    {club.acronym}
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-white leading-snug">
                {club.name}
              </h3>

              <p className="text-xs text-neutral-300 leading-relaxed">
                {club.description}
              </p>
            </div>

            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">
                Official Student Organization
              </span>
              <button
                type="button"
                onClick={() => onShowToast?.(`Induction details for ${club.name} will be announced by the executive council.`)}
                className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Learn more</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
