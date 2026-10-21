import { useState } from 'react';
import { 
  Vote, 
  ShieldCheck, 
  Award, 
  Video, 
  ExternalLink, 
  Sparkles, 
  Users, 
  ThumbsUp, 
  MessageSquare, 
  CheckCircle2, 
  Calendar, 
  FileText,
  AlertCircle,
  TrendingUp,
  Share2,
  Megaphone,
  Plus
} from 'lucide-react';
import { PoliticalCandidate } from '../types';
import { POLITICAL_CANDIDATES, POLITICAL_FELICITATIONS } from '../data/socialMockData';
import { useAuth } from '../context/AuthContext';

interface PoliticsCampaignViewProps {
  onRequireAuth?: () => void;
  onShowToast?: (msg: string) => void;
}

export const PoliticsCampaignView = ({ onRequireAuth, onShowToast }: PoliticsCampaignViewProps) => {
  const { currentUser } = useAuth();
  const [candidates, setCandidates] = useState<PoliticalCandidate[]>(POLITICAL_CANDIDATES);
  const [felicitations, setFelicitations] = useState(POLITICAL_FELICITATIONS);
  const [activeTab, setActiveTab] = useState<'all' | 'cec' | 'senate' | 'departmental'>('all');
  const [showFelicitationModal, setShowFelicitationModal] = useState(false);
  const [newFelText, setNewFelText] = useState('');
  
  // Student Sentiment Poll state
  const [pollVotes, setPollVotes] = useState<Record<string, number>>({
    'cand-danladi': 412,
    'cand-adesua': 328,
  });
  const [hasVotedPoll, setHasVotedPoll] = useState(false);

  const handleEndorseToggle = (candidateId: string) => {
    if (!currentUser) {
      onRequireAuth?.();
      return;
    }

    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id === candidateId) {
          const nextState = !c.endorsedByMe;
          return {
            ...c,
            endorsedByMe: nextState,
            endorsementsCount: nextState ? c.endorsementsCount + 1 : c.endorsementsCount - 1,
          };
        }
        return c;
      })
    );
  };

  const handleVotePoll = (candidateId: string) => {
    if (!currentUser) {
      onRequireAuth?.();
      return;
    }
    if (hasVotedPoll) return;
    setPollVotes((prev) => ({
      ...prev,
      [candidateId]: (prev[candidateId] || 0) + 1,
    }));
    setHasVotedPoll(true);
    onShowToast?.('Your student poll vote has been recorded on the live tally!');
  };

  const handleAddFelicitation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth?.();
      return;
    }
    if (!newFelText.trim()) return;

    const newFel = {
      id: `fel_${Date.now()}`,
      candidateName: currentUser.fullName || 'Comrade Student',
      runningFor: currentUser.politicalRole || 'Campus Aspirant / Leader',
      bannerText: newFelText.trim(),
      tag: 'Campus Goodwill Message',
      date: 'Just Now',
      avatarUrl: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    };

    setFelicitations([newFel, ...felicitations]);
    setNewFelText('');
    setShowFelicitationModal(false);
    onShowToast?.('Your goodwill felicitation is published on the digital billboard!');
  };

  const totalPollVotes = Object.values(pollVotes).reduce((a, b) => a + b, 0);

  const filteredCandidates = candidates.filter((c) => {
    if (activeTab === 'cec') return c.runningFor.includes('CEC') || c.runningFor.includes('SUG');
    if (activeTab === 'senate') return c.runningFor.includes('Senate');
    if (activeTab === 'departmental') return !c.runningFor.includes('SUG');
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* 1. Official UNECOM Election Commission Top Banner */}
      <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/50 via-neutral-900 to-neutral-950 p-5 sm:p-6 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <Vote className="h-3 w-3" />
                <span>UNECOM 2026/2027 Portal</span>
              </span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Official Manifesto Hub
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              UNILORIN Student Union Government (SUG) Elections
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed">
              Explore presidential manifestos, watch live campaign video pitches, examine 4-pillar policy agendas, and attend virtual Town Hall sessions.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block font-mono">
                Town Hall Date
              </span>
              <div className="text-sm font-bold text-white mt-0.5">Thursday, 4:00 PM</div>
              <span className="text-[10px] text-emerald-400 font-mono">Main Auditorium & Stream</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Digital Billboard: Session Greetings & Candidate Felicitations */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 backdrop-blur-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-amber-400" />
            <h3 className="text-xs sm:text-sm font-bold text-white">
              Digital Campaign Billboard: Session Greetings & Felicitations
            </h3>
          </div>

          <button
            type="button"
            onClick={() => setShowFelicitationModal(true)}
            className="flex items-center gap-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-amber-400" />
            <span>Post Felicitation</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {felicitations.map((fel) => (
            <div
              key={fel.id}
              className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3.5 flex flex-col justify-between space-y-2 relative overflow-hidden"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                  <span className="rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5">
                    {fel.tag}
                  </span>
                  <span>{fel.date}</span>
                </div>
                <p className="text-xs text-neutral-200 italic leading-snug">
                  "{fel.bannerText}"
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-neutral-850">
                <img
                  src={fel.avatarUrl}
                  alt={fel.candidateName}
                  className="h-6 w-6 rounded-full object-cover border border-neutral-700"
                />
                <div className="min-w-0 truncate">
                  <div className="text-[11px] font-bold text-white truncate">{fel.candidateName}</div>
                  <div className="text-[9px] text-neutral-400 truncate">{fel.runningFor}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Live Student Sentiment Poll */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-rose-400" />
            <h3 className="text-xs sm:text-sm font-bold text-white">
              Live Student Opinion Poll: SUG Presidency Race
            </h3>
          </div>
          <span className="text-[10px] font-mono text-neutral-400">
            {totalPollVotes} student ballots cast
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {candidates.filter(c => c.runningFor.includes('President')).map((cand) => {
            const votes = pollVotes[cand.id] || 0;
            const pct = totalPollVotes > 0 ? Math.round((votes / totalPollVotes) * 100) : 50;

            return (
              <div
                key={cand.id}
                className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-2.5 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={cand.photoUrl}
                      alt={cand.name}
                      className="h-9 w-9 rounded-xl object-cover border border-neutral-700"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">{cand.name}</div>
                      <div className="text-[10px] text-neutral-400">{cand.faculty}</div>
                    </div>
                  </div>

                  <span className="text-sm font-mono font-black text-rose-400">
                    {pct}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="font-mono text-neutral-400">{votes} votes</span>
                  <button
                    type="button"
                    onClick={() => handleVotePoll(cand.id)}
                    disabled={hasVotedPoll}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                      hasVotedPoll
                        ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
                    }`}
                  >
                    {hasVotedPoll ? 'Vote Recorded' : 'Cast Student Poll Vote'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Candidate Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-neutral-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'all'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          All Candidates ({candidates.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cec')}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'cec'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          SUG Central Executive Council (CEC)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('departmental')}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'departmental'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          Faculty & Departmental Executives
        </button>
      </div>

      {/* 5. Candidate Profiles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCandidates.map((cand) => (
          <div
            key={cand.id}
            className="rounded-2xl border border-neutral-800 bg-neutral-900/70 overflow-hidden backdrop-blur-md flex flex-col justify-between hover:border-neutral-700 transition-colors"
          >
            <div>
              {/* Campaign Banner Header */}
              <div className="relative h-32 w-full bg-neutral-950 overflow-hidden">
                <img
                  src={cand.bannerUrl}
                  alt={cand.name}
                  className="h-full w-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
                
                <div className="absolute top-3 right-3">
                  <span className="rounded-full bg-rose-500/90 text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-md">
                    {cand.runningFor}
                  </span>
                </div>
              </div>

              {/* Candidate Info Overlay */}
              <div className="px-5 -mt-10 relative z-10 space-y-3">
                <div className="flex items-end gap-3.5">
                  <img
                    src={cand.photoUrl}
                    alt={cand.name}
                    className="h-20 w-20 rounded-2xl object-cover border-2 border-neutral-700 shadow-xl ring-2 ring-white/10"
                  />
                  <div>
                    <h3 className="text-base font-bold text-white">{cand.name}</h3>
                    <p className="text-xs text-neutral-300 font-mono">
                      {cand.level} • {cand.department}
                    </p>
                    <p className="text-[11px] text-amber-400 italic mt-0.5 font-medium">
                      "{cand.slogan}"
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                    Manifesto Summary:
                  </span>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {cand.manifestoSummary}
                  </p>
                </div>

                {/* Key Policy Pillars */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
                    Core Action Pillars:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cand.manifestoPillars.map((pillar, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-2.5 space-y-0.5"
                      >
                        <div className="text-[11px] font-bold text-white">
                          {pillar.title}
                        </div>
                        <p className="text-[10px] text-neutral-400 leading-snug line-clamp-2">
                          {pillar.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions: Endorse, Town Hall, Video Pitch */}
            <div className="mt-4 p-5 pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleEndorseToggle(cand.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                  cand.endorsedByMe
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-950/50'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                }`}
              >
                <ThumbsUp className={`h-3.5 w-3.5 ${cand.endorsedByMe ? 'fill-current' : ''}`} />
                <span>{cand.endorsedByMe ? 'Endorsed' : 'Endorse Candidate'} ({cand.endorsementsCount})</span>
              </button>

              <div className="flex items-center gap-2">
                {cand.townhallLink && (
                  <a
                    href={cand.townhallLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-3 py-2 text-xs font-bold transition-colors"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Town Hall</span>
                  </a>
                )}

                {cand.videoPitchUrl && (
                  <a
                    href={cand.videoPitchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 px-3 py-2 text-xs font-bold transition-colors"
                  >
                    <Video className="h-3.5 w-3.5" />
                    <span>Video Pitch</span>
                  </a>
                )}
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* 6. Post Felicitation Modal */}
      {showFelicitationModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowFelicitationModal(false)}
        >
          <div 
            className="relative flex flex-col w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-5 py-4">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Post Campaign Felicitation / Goodwill Note</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFelicitationModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFelicitation} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Goodwill Message / Exam Success Wish
                </label>
                <textarea
                  required
                  rows={4}
                  value={newFelText}
                  onChange={(e) => setNewFelText(e.target.value)}
                  placeholder="e.g. Wishing all Unilorites success in their upcoming CBT exams – Comrade X"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-white placeholder-neutral-500 focus:border-rose-500 focus:outline-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-rose-600 hover:bg-rose-500 text-white py-2.5 text-xs font-bold transition-colors cursor-pointer shadow-lg shadow-rose-950/40"
              >
                Publish on Digital Billboard
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
