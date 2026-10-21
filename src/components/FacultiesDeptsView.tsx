import { useState, useMemo } from 'react';
import { 
  BookOpen, 
  GraduationCap, 
  Download, 
  Search, 
  FileText, 
  Folder, 
  CheckCircle2, 
  Sparkles, 
  ChevronRight, 
  Building2, 
  Layers, 
  Briefcase, 
  Award,
  ExternalLink,
  MessageSquare,
  Users,
  Send
} from 'lucide-react';
import { DepartmentResource, StudentLevel } from '../types';
import { DEPARTMENT_RESOURCES, DEPARTMENT_GYRATING_CHANNELS } from '../data/socialMockData';
import { UNILORIN_FACULTIES } from '../data/mockData';
import { FacultyDepartmentSelector } from './FacultyDepartmentSelector';
import { CommunityTelegramChatModal } from './CommunityTelegramChatModal';
import { CampusClub } from '../types';

interface FacultiesDeptsViewProps {
  selectedLevel: StudentLevel | 'All';
  onSelectLevel: (lvl: StudentLevel | 'All') => void;
  onShowToast?: (msg: string) => void;
}

export const FacultiesDeptsView = ({
  selectedLevel,
  onSelectLevel,
  onShowToast,
}: FacultiesDeptsViewProps) => {
  const [activeTab, setActiveTab] = useState<'resources' | 'gyrating'>('resources');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('All');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadedMap, setDownloadedMap] = useState<Record<string, boolean>>({});

  // Gyrating Hub interactive chat message simulation
  const [joinedChannels, setJoinedChannels] = useState<Record<string, boolean>>({ 'chan-cis': true });
  const [gyratingInput, setGyratingInput] = useState('');
  const [activeFacultyClub, setActiveFacultyClub] = useState<CampusClub | null>(null);

  const levels: Array<StudentLevel | 'All'> = ['All', '100L', '200L', '300L', '400L', '500L'];

  const categories = [
    'All',
    'GNS & Orientation',
    'Lecture Slides',
    'Past Questions & Solutions',
    'SIWES & IT Leads',
    'Final Year Projects',
  ];

  const handleDownload = (res: DepartmentResource) => {
    setDownloadedMap((prev) => ({ ...prev, [res.id]: true }));
    onShowToast?.(`Downloading "${res.title}" (${res.fileType})... Check your device downloads.`);
  };

  const handleToggleJoinChannel = (chanId: string, chanName: string) => {
    setJoinedChannels((prev) => {
      const nextState = !prev[chanId];
      onShowToast?.(nextState ? `Joined ${chanName}!` : `Left ${chanName}.`);
      return { ...prev, [chanId]: nextState };
    });
  };

  const filteredResources = useMemo(() => {
    return DEPARTMENT_RESOURCES.filter((res) => {
      if (selectedLevel !== 'All' && res.level !== selectedLevel) return false;
      if (selectedCategory !== 'All' && res.category !== selectedCategory) return false;
      if (selectedFaculty !== 'All' && res.faculty !== 'All Departments' && res.faculty !== 'General Studies Unit' && res.faculty !== 'All Faculties' && res.faculty !== 'All Applied & Tech Faculties' && res.faculty !== selectedFaculty) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = res.title.toLowerCase().includes(q);
        const matchCourse = res.courseCode.toLowerCase().includes(q);
        const matchTags = res.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchCourse && !matchTags) return false;
      }
      return true;
    });
  }, [selectedLevel, selectedCategory, selectedFaculty, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* 1. Academic Portal Top Hero */}
      <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/50 via-neutral-900 to-neutral-950 p-5 sm:p-6 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                <span>UNILORIN Academic Vault & Social Hubs</span>
              </span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Harmattan & Rain Session
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              Faculties, Departments & Gyrating Hubs
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed">
              Drill down by class level (100L–500L) to access verified GNS CBT question banks, core lecture slide decks, 400L SIWES placement leads, 500L project repositories, and faculty informal discussion channels.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block font-mono">
                Active Resources
              </span>
              <div className="text-base font-bold text-white mt-0.5">850+ Verified Packs</div>
              <span className="text-[10px] text-blue-400 font-mono">Free Peer Access</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Switcher: Course Resources vs Departmental Gyrating Hubs */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('resources')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'resources'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-950/40'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Academic Resource Matrix</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gyrating')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'gyrating'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-950/40'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Departmental "Gyrating" Hubs</span>
        </button>
      </div>

      {/* Render Tab 1: Academic Resources */}
      {activeTab === 'resources' && (
        <div className="space-y-5">
          {/* Level Selector Pills (100L - 500L) */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-blue-400" />
                <span>Select Student Class Year / Level:</span>
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                {selectedLevel === 'All' ? 'Showing All Years' : `${selectedLevel} Focus`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              {levels.map((lvl) => {
                const isSelected = selectedLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => onSelectLevel(lvl)}
                    className={`rounded-xl py-2 px-3 text-xs font-bold transition-all text-center cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-950/40'
                        : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
                    }`}
                  >
                    <div>{lvl === 'All' ? 'All Levels' : lvl}</div>
                    <div className="text-[9px] opacity-75 font-normal mt-0.5">
                      {lvl === '100L' && 'GNS & CBT'}
                      {lvl === '200L' && 'Core Basics'}
                      {lvl === '300L' && 'Applied Labs'}
                      {lvl === '400L' && 'SIWES & IT'}
                      {lvl === '500L' && 'Thesis / Project'}
                      {lvl === 'All' && 'Global Vault'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search & Category Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
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
                placeholder="Search by course e.g. GNS 111..."
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Resources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredResources.map((res) => {
              const isDownloaded = downloadedMap[res.id];

              return (
                <div
                  key={res.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 sm:p-5 backdrop-blur-md flex flex-col justify-between hover:border-neutral-700 transition-colors space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 text-[10px] font-mono font-bold">
                        {res.courseCode}
                      </span>
                      <span className="rounded-md bg-neutral-800 text-neutral-300 px-2 py-0.5 text-[10px] font-mono">
                        {res.level} • {res.fileType}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug">
                      {res.title}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {res.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      {res.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-neutral-950 px-2 py-0.5 text-[9px] font-mono text-neutral-400 border border-neutral-800"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-neutral-400">
                      {res.downloadsCount} downloads
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDownload(res)}
                      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        isDownloaded
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-950/40'
                      }`}
                    >
                      {isDownloaded ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Downloaded</span>
                        </>
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5" />
                          <span>Download {res.fileType}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Render Tab 2: Departmental "Gyrating" Hubs */}
      {activeTab === 'gyrating' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4">
            <p className="text-xs text-neutral-300 leading-relaxed">
              Join live departmental gyrations, debate assignment solutions, coordinate study groups, and connect with faculty course reps and seniors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEPARTMENT_GYRATING_CHANNELS.map((chan) => {
              const isJoined = joinedChannels[chan.id];

              return (
                <div
                  key={chan.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 backdrop-blur-md space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-950 text-xl border border-neutral-800 shadow-md">
                        {chan.avatar}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{chan.name}</h4>
                        <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{chan.faculty}</div>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {chan.activeMembers} online
                    </span>
                  </div>

                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">Recent Topic:</span>
                    <p className="italic">"{chan.recentTopic}"</p>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const mockClub: CampusClub = {
                          id: chan.id,
                          name: `${chan.name} Community`,
                          acronym: chan.name.slice(0, 4).toUpperCase(),
                          category: 'Academic',
                          description: `Official faculty supergroup channel for ${chan.faculty}.`,
                          tagline: `Recent topic: ${chan.recentTopic}`,
                          logoUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=200',
                          bannerUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
                          memberCount: chan.activeMembers * 12 + 1500,
                          meetingSchedule: 'Daily Online Syncs',
                          meetingVenue: chan.faculty,
                          presidentName: 'Faculty Course Rep',
                          presidentPhone: '08012345678',
                          isRecruiting: true,
                          highlights: ['Past Questions', 'Class Timetables', 'Lab Groups'],
                        };
                        setActiveFacultyClub(mockClub);
                      }}
                      className="rounded-xl px-3.5 py-1.5 text-xs font-bold bg-sky-500/20 text-sky-300 hover:bg-sky-500 hover:text-neutral-950 border border-sky-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Telegram Supergroup</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleJoinChannel(chan.id, chan.name)}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        isJoined
                          ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-300 hover:text-white'
                      }`}
                    >
                      {isJoined ? '✓ Joined' : 'Join'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Community Supergroup Chat Modal */}
      {activeFacultyClub && (
        <CommunityTelegramChatModal
          club={activeFacultyClub}
          isOpen={Boolean(activeFacultyClub)}
          onClose={() => setActiveFacultyClub(null)}
          onShowToast={onShowToast}
        />
      )}

    </div>
  );
};
