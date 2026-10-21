import { useState } from 'react';
import { 
  Users, 
  Sparkles, 
  CheckCircle2, 
  Search, 
  Calendar, 
  MapPin, 
  Phone, 
  Award, 
  ExternalLink, 
  Plus, 
  X,
  Send,
  MessageSquare,
  Lock
} from 'lucide-react';
import { CampusClub } from '../types';
import { CAMPUS_CLUBS } from '../data/socialMockData';
import { useAuth } from '../context/AuthContext';
import { CommunityTelegramChatModal } from './CommunityTelegramChatModal';

interface ClubsDirectoryViewProps {
  onRequireAuth?: () => void;
  onShowToast?: (msg: string) => void;
}

export const ClubsDirectoryView = ({
  onRequireAuth,
  onShowToast,
}: ClubsDirectoryViewProps) => {
  const { currentUser } = useAuth();
  const [clubs, setClubs] = useState<CampusClub[]>(CAMPUS_CLUBS);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClub, setSelectedClub] = useState<CampusClub | null>(null);
  
  // Membership application form state
  const [applyingClub, setApplyingClub] = useState<CampusClub | null>(null);
  const [statement, setStatement] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeChatClub, setActiveChatClub] = useState<CampusClub | null>(null);

  const categories = [
    'All',
    'Leadership',
    'Tech & Innovation',
    'Humanitarian',
    'Arts & Culture',
    'Academic',
  ];

  const handleOpenApply = (club: CampusClub) => {
    if (!currentUser) {
      onRequireAuth?.();
      return;
    }
    setApplyingClub(club);
    setStatement('');
  };

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingClub) return;
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      onShowToast?.(`Application submitted to ${applyingClub.name}! The membership committee will contact you.`);
      setApplyingClub(null);
    }, 600);
  };

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>UNILORIN Student Societies</span>
              </span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Verified Organizations
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              Clubs, Societies & Student Organizations
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed">
              Find your community beyond the classroom: join global leadership hubs (JCI, Rotaract), developer collectives (GDSC), social venture teams (Enactus), and theatre troupes.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block font-mono">
                Active Societies
              </span>
              <div className="text-base font-bold text-white mt-0.5">35+ Registered</div>
              <span className="text-[10px] text-purple-400 font-mono">Direct Induction</span>
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
            placeholder="Search clubs e.g. GDSC, JCI..."
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>

      {/* 3. Clubs Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredClubs.map((club) => (
          <div
            key={club.id}
            className="rounded-2xl border border-neutral-800 bg-neutral-900/70 overflow-hidden backdrop-blur-md flex flex-col justify-between hover:border-neutral-700 transition-colors"
          >
            <div>
              {/* Banner Image */}
              <div className="relative h-28 w-full bg-neutral-950 overflow-hidden">
                <img
                  src={club.bannerUrl}
                  alt={club.name}
                  className="h-full w-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
                <div className="absolute top-3 right-3">
                  <span className="rounded-full bg-purple-600/90 text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    {club.category}
                  </span>
                </div>
              </div>

              {/* Club Details */}
              <div className="px-5 -mt-8 relative z-10 space-y-3">
                <div className="flex items-end gap-3.5">
                  <img
                    src={club.logoUrl}
                    alt={club.name}
                    className="h-16 w-16 rounded-2xl object-cover border-2 border-neutral-700 bg-neutral-950 shadow-xl"
                  />
                  <div>
                    <h3 className="text-base font-bold text-white leading-snug">{club.name}</h3>
                    <p className="text-xs text-purple-400 font-mono font-semibold">
                      {club.acronym} • {club.memberCount}+ Members
                    </p>
                  </div>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed pt-1">
                  {club.description}
                </p>

                {/* Key Meeting Schedule & Venue */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Calendar className="h-3.5 w-3.5 text-amber-400" />
                    <span>{club.meetingSchedule}</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-400">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{club.meetingVenue}</span>
                  </div>
                </div>

                {/* Highlights */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Flagship Programs:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {club.highlights.map((h, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-neutral-950 px-2 py-0.5 text-[10px] text-neutral-300 border border-neutral-800"
                      >
                        ✓ {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-5 pt-3 mt-3 border-t border-neutral-800 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] font-mono text-neutral-400">
                {club.membershipFee || 'Free Induction'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveChatClub(club)}
                  className="rounded-xl px-3 py-1.5 text-xs font-bold bg-sky-500/20 text-sky-300 hover:bg-sky-500 hover:text-neutral-950 transition-all flex items-center gap-1.5 cursor-pointer border border-sky-500/30 shadow-sm"
                  title="Open Telegram-style supergroup chat with WhatsApp admin governance"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Supergroup Chat</span>
                  {club.isChatLocked && <Lock className="h-3 w-3 text-rose-400 ml-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenApply(club)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    club.isRecruiting
                      ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-950/50'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {club.isRecruiting ? 'Apply' : 'Contact'}
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* 4. Telegram Supergroup & WhatsApp Admin Governance Chat Modal */}
      {activeChatClub && (
        <CommunityTelegramChatModal
          club={activeChatClub}
          isOpen={Boolean(activeChatClub)}
          onClose={() => setActiveChatClub(null)}
          onShowToast={onShowToast}
        />
      )}

      {/* 5. Membership Application Modal */}
      {applyingClub && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in"
          onClick={() => setApplyingClub(null)}
        >
          <div 
            className="relative flex flex-col w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-5 py-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Join {applyingClub.acronym}</h3>
              </div>
              <button
                type="button"
                onClick={() => setApplyingClub(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <img
                  src={applyingClub.logoUrl}
                  alt={applyingClub.name}
                  className="h-10 w-10 rounded-xl object-cover"
                />
                <div>
                  <div className="text-xs font-bold text-white">{applyingClub.name}</div>
                  <div className="text-[10px] text-neutral-400">{applyingClub.category}</div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Why do you want to join this organization?
                </label>
                <textarea
                  required
                  rows={4}
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  placeholder="Share your interests, skills, or what you hope to learn and contribute..."
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-400 space-y-1">
                <div>Applicant: <span className="text-white font-semibold">{currentUser?.fullName}</span></div>
                <div>Faculty: <span className="text-white">{currentUser?.faculty || 'General'}</span></div>
                <div>Class Year: <span className="text-white">{currentUser?.level || '300L'}</span></div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white py-2.5 text-xs font-bold transition-colors cursor-pointer shadow-lg shadow-purple-950/40"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Membership Application'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
