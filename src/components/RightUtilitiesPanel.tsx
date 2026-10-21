import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Bus, 
  TrendingUp, 
  ShieldAlert, 
  Phone, 
  ExternalLink, 
  GraduationCap, 
  Clock, 
  Sparkles,
  ChevronRight,
  Filter,
  Users,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { AppModule, StudentLevel } from '../types';
import { SHUTTLE_ROUTES } from '../data/socialMockData';

interface RightUtilitiesPanelProps {
  selectedLevel: StudentLevel | 'All';
  onSelectLevel: (lvl: StudentLevel | 'All') => void;
  onNavigateModule: (mod: AppModule) => void;
  onSelectLandmark?: (landmarkId: string) => void;
}

export interface BusTerminalStatus {
  id: string;
  name: string;
  status: 'low' | 'moderate' | 'heavy';
  waitTime: string;
  busesWaiting: number;
  lastUpdatedBy: string;
  updatedAtMinutesAgo: number;
}

const INITIAL_TERMINALS: BusTerminalStatus[] = [
  {
    id: 'term-ps',
    name: 'PS Main Terminal (Senate / Hostels)',
    status: 'moderate',
    waitTime: '12 - 18 mins',
    busesWaiting: 6,
    lastUpdatedBy: 'Adeyinka (300L)',
    updatedAtMinutesAgo: 4,
  },
  {
    id: 'term-tanke',
    name: 'Tanke Gate Terminal (Sanrab)',
    status: 'heavy',
    waitTime: '25 - 35 mins',
    busesWaiting: 3,
    lastUpdatedBy: 'Bukola (400L)',
    updatedAtMinutesAgo: 2,
  },
  {
    id: 'term-cbt',
    name: 'CBT Complex Shuttle Hub',
    status: 'low',
    waitTime: '3 - 5 mins',
    busesWaiting: 8,
    lastUpdatedBy: 'Ibrahim (200L)',
    updatedAtMinutesAgo: 7,
  },
];

export const RightUtilitiesPanel = ({
  selectedLevel,
  onSelectLevel,
  onNavigateModule,
}: RightUtilitiesPanelProps) => {
  const [terminals, setTerminals] = useState<BusTerminalStatus[]>(INITIAL_TERMINALS);
  const [reportingTerminalId, setReportingTerminalId] = useState<string | null>(null);

  const levelsList: Array<StudentLevel | 'All'> = ['All', '100L', '200L', '300L', '400L', '500L'];

  const trendingTopics = [
    { tag: '#HarmattanExams', count: '1.4k posts', category: 'Academics' },
    { tag: '#SUGElections2026', count: '980 posts', category: 'Politics' },
    { tag: '#TankeShuttleFare', count: '740 posts', category: 'Campus Life' },
    { tag: '#CISSuperCupFinal', count: '520 posts', category: 'Sports' },
    { tag: '#HostelBakesDelivery', count: '410 posts', category: 'Marketplace' },
  ];

  const handleUpdateQueue = (terminalId: string, nextStatus: 'low' | 'moderate' | 'heavy') => {
    setTerminals((prev) =>
      prev.map((t) => {
        if (t.id === terminalId) {
          return {
            ...t,
            status: nextStatus,
            waitTime:
              nextStatus === 'low'
                ? '3 - 5 mins'
                : nextStatus === 'moderate'
                ? '10 - 20 mins'
                : '30+ mins (Heavy Crowd)',
            updatedAtMinutesAgo: 0,
            lastUpdatedBy: 'You (Just now)',
          };
        }
        return t;
      })
    );
    setReportingTerminalId(null);
  };

  const getStatusBadge = (status: 'low' | 'moderate' | 'heavy') => {
    switch (status) {
      case 'low':
        return {
          label: 'Low Queue',
          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-400',
        };
      case 'moderate':
        return {
          label: 'Moderate',
          color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          dot: 'bg-amber-400',
        };
      case 'heavy':
        return {
          label: 'Heavy Crowd',
          color: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          dot: 'bg-rose-500',
        };
    }
  };

  return (
    <aside className="hidden xl:flex w-80 flex-col gap-5 border-l border-neutral-800/80 bg-neutral-950/70 p-4 shrink-0 overflow-y-auto max-h-[calc(100vh-60px)] sticky top-[60px]">
      
      {/* 1. Academic Level Quick Filter */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4 text-emerald-400" />
            <span>Academic Level View</span>
          </span>
          <span className="text-[10px] font-mono text-neutral-400">
            {selectedLevel === 'All' ? 'Global' : selectedLevel}
          </span>
        </div>

        <p className="text-[11px] text-neutral-400">
          Filter posts, GNS study packs, and IT opportunities tailored to your class year:
        </p>

        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {levelsList.map((lvl) => {
            const isSelected = selectedLevel === lvl;
            return (
              <motion.button
                key={lvl}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => onSelectLevel(lvl)}
                className={`rounded-lg py-1.5 px-2 text-xs font-bold transition-all text-center cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                }`}
              >
                {lvl}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 2. Crowd-Sourced Live Bus Queue Tracker */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
          <div className="flex items-center gap-1.5">
            <Bus className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-bold text-white">Live Bus Queue Tracker</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateModule('map')}
            className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
          >
            <span>Full Map</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <p className="text-[11px] text-neutral-400 leading-snug">
          Crowd-sourced status reported by Unilorites in real-time:
        </p>

        <div className="space-y-2.5">
          {terminals.map((term) => {
            const statusInfo = getStatusBadge(term.status);
            const isReporting = reportingTerminalId === term.id;

            return (
              <div
                key={term.id}
                className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-white line-clamp-1">{term.name}</h4>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      Est. Wait: <strong className="text-white">{term.waitTime}</strong>
                    </span>
                  </div>

                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-mono font-bold uppercase border flex items-center gap-1 shrink-0 ${statusInfo.color}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot} animate-pulse`} />
                    <span>{statusInfo.label}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono pt-1 border-t border-neutral-850">
                  <span>By {term.lastUpdatedBy} ({term.updatedAtMinutesAgo === 0 ? 'Just now' : `${term.updatedAtMinutesAgo}m ago`})</span>

                  <button
                    type="button"
                    onClick={() => setReportingTerminalId(isReporting ? null : term.id)}
                    className="text-amber-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                    <span>Report Status</span>
                  </button>
                </div>

                {/* Status Update Quick Toggles */}
                {isReporting && (
                  <div className="pt-2 border-t border-neutral-800 space-y-1.5 animate-in fade-in">
                    <span className="text-[10px] font-bold text-neutral-300 block">
                      How is the queue right now?
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateQueue(term.id, 'low')}
                        className="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 py-1 text-[10px] font-bold hover:bg-emerald-500/30"
                      >
                        🟢 Low Queue
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateQueue(term.id, 'moderate')}
                        className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 py-1 text-[10px] font-bold hover:bg-amber-500/30"
                      >
                        🟡 Moderate
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateQueue(term.id, 'heavy')}
                        className="rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 py-1 text-[10px] font-bold hover:bg-rose-500/30"
                      >
                        🔴 Heavy Crowd
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. UNILORIN Regulated Shuttle Routes Peek */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 space-y-2.5">
        <span className="text-xs font-bold text-white flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>Regulated Shuttle Fares</span>
        </span>

        <div className="space-y-1.5">
          {SHUTTLE_ROUTES.slice(0, 3).map((r) => (
            <div key={r.id} className="flex items-center justify-between text-xs bg-neutral-950/60 p-2 rounded-xl border border-neutral-800/80">
              <span className="text-neutral-300 text-[11px] truncate max-w-[170px]">{r.routeName}</span>
              <span className="font-mono font-bold text-amber-400 text-xs">₦{r.fare}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Trending Campus Buzz */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-rose-400" />
            <span>UNILORIN Trending</span>
          </span>
          <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
        </div>

        <div className="divide-y divide-neutral-800/80">
          {trendingTopics.map((topic, i) => (
            <div key={i} className="py-2 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                <span>{topic.category}</span>
                <span>{topic.count}</span>
              </div>
              <span className="text-xs font-bold text-white hover:text-emerald-400 transition-colors cursor-pointer block mt-0.5">
                {topic.tag}
              </span>
            </div>
          ))}
        </div>
      </div>

    </aside>
  );
};
