import { useState, FormEvent } from 'react';
import { 
  ShoppingBag, 
  Store, 
  Search, 
  ArrowRight, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Zap, 
  TrendingUp 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { ExpandFromOriginModal } from './ExpandFromOriginModal';

interface HeroSectionProps {
  onSearch: (query: string) => void;
  searchQuery: string;
  selectedCampus: string;
  onSelectCampus: (campus: string) => void;
  onOpenAuth: (mode?: 'signin' | 'signup', role?: UserRole) => void;
  onOpenCreateBusiness: () => void;
  onSelectFeatured: (id: string) => void;
}

export const HeroSection = ({
  onSearch,
  searchQuery,
  selectedCampus,
  onSelectCampus,
  onOpenAuth,
  onOpenCreateBusiness,
  onSelectFeatured,
}: HeroSectionProps) => {
  const { currentUser } = useAuth();
  const [activePersona, setActivePersona] = useState<'buyer' | 'trader'>('buyer');
  const [inputVal, setInputVal] = useState(searchQuery);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(inputVal);
  };

  const campusZones = [
    { id: 'All', label: 'All Campus' },
    { id: 'Permanent Site', label: 'Permanent Site (PS Hostels)' },
    { id: 'Tanke Off-Campus', label: 'Tanke Off-Campus' },
    { id: 'Mini Campus', label: 'Mini Campus' },
  ];

  return (
    <section className="relative overflow-hidden border-b border-neutral-800 bg-neutral-950 pt-8 pb-12 sm:pt-12 sm:pb-16">
      {/* Subtle ambient gradient backdrops */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-[600px] -translate-x-1/2 rounded-full bg-emerald-600/10 blur-[130px]" />
      <div className="pointer-events-none absolute top-1/2 -right-40 -z-10 h-80 w-80 rounded-full bg-amber-500/10 blur-[120px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Interactive Persona Selector (Getting Started Navigator) */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex items-center rounded-2xl border border-neutral-800 bg-neutral-900/90 p-1 shadow-lg backdrop-blur-md">
            <button
              onClick={() => setActivePersona('buyer')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                activePersona === 'buyer'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>I am a Student Buyer</span>
            </button>

            <button
              onClick={() => setActivePersona('trader')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                activePersona === 'trader'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-950/40'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Store className="h-4 w-4" />
              <span>I am a Student Trader</span>
            </button>
          </div>
        </div>

        {/* Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Contextual Dynamic Pitch & Direct Controls */}
          <div className="lg:col-span-7">
            
            {/* Collegiate Pill */}
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-3 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>University of Ilorin (UNILORIN)</span>
              <span className="text-emerald-700">·</span>
              <span>"Better by Far" Trade Hub</span>
            </div>

            {/* Persona-Driven Dynamic Headlines */}
            {activePersona === 'buyer' ? (
              <>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.18]">
                  Order Food, Services & Essentials Direct to Your Dorm Room.
                </h1>
                <p className="mt-3.5 text-sm sm:text-base text-neutral-300 max-w-2xl leading-relaxed">
                  Connect with verified Unilorites baking warm meat pies in Lagos Hostel, fixing iPhone screens near CIS Quad, cutting fades in Village 1 & 2, or styling thrift fits in Tanke. Order directly on WhatsApp with zero markup.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.18]">
                  Turn Your Dorm Skill Into an Active UNILORIN Business.
                </h1>
                <p className="mt-3.5 text-sm sm:text-base text-neutral-300 max-w-2xl leading-relaxed">
                  List your hostel enterprise in under 2 minutes. Publish your service menu, receive instant orders directly to your WhatsApp, deliver across PS and Tanke, and build verified student reviews.
                </p>
              </>
            )}

            {/* Live Interactive Search Bar */}
            <form onSubmit={handleSearchSubmit} className="mt-6 flex items-center gap-2 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => {
                    setInputVal(e.target.value);
                    onSearch(e.target.value);
                  }}
                  placeholder={
                    activePersona === 'buyer'
                      ? "Search meat pie, phone screen, dorm barber, laundry runner..."
                      : "Search student ventures, category benchmarks, pricing..."
                  }
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900/90 pl-10 pr-4 py-3 text-xs sm:text-sm text-neutral-200 placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                />
                {inputVal && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputVal('');
                      onSearch('');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-xs sm:text-sm font-semibold text-white transition-colors shrink-0 shadow-md shadow-emerald-950/40"
              >
                Search
              </button>
            </form>

            {/* Interactive Campus Zone Filter Buttons */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1 mr-1">
                <MapPin className="h-3 w-3 text-emerald-400" />
                <span>Zone:</span>
              </span>
              {campusZones.map((zone) => {
                const isSelected = selectedCampus === zone.id;
                return (
                  <button
                    key={zone.id}
                    onClick={() => onSelectCampus(zone.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-xs'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    {zone.label}
                  </button>
                );
              })}
            </div>

            {/* Primary Action Buttons Based on Persona */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {activePersona === 'buyer' ? (
                <>
                  <a
                    href="#stores-directory"
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white transition-all hover:bg-emerald-500 shadow-lg shadow-emerald-950/50"
                  >
                    <span>Browse UNILORIN Stores</span>
                    <ArrowRight className="h-4 w-4" />
                  </a>

                  {/* Dynamic Expand-from-Origin App Launch Transition Component */}
                  <ExpandFromOriginModal
                    onOpenCreateBusiness={onOpenCreateBusiness}
                  />

                  {!currentUser && (
                    <button
                      onClick={() => onOpenAuth('signup', 'student')}
                      className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-xs sm:text-sm font-medium text-white transition-colors hover:border-neutral-600 hover:bg-neutral-800"
                    >
                      <ShoppingBag className="h-4 w-4 text-emerald-400" />
                      <span>Sign In with Email</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={onOpenCreateBusiness}
                    className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-neutral-950 transition-all hover:bg-amber-400 shadow-lg shadow-amber-950/30"
                  >
                    <span>+ List Your Trade in 2 Mins</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <ExpandFromOriginModal
                    onOpenCreateBusiness={onOpenCreateBusiness}
                  />

                  {!currentUser ? (
                    <button
                      onClick={() => onOpenAuth('signin', 'trader')}
                      className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-xs sm:text-sm font-medium text-white transition-colors hover:border-neutral-600 hover:bg-neutral-800"
                    >
                      <Store className="h-4 w-4 text-amber-400" />
                      <span>Trader Sign In</span>
                    </button>
                  ) : (
                    <span className="text-xs text-neutral-400 flex items-center gap-1.5 bg-neutral-900/60 px-3 py-2 rounded-xl border border-neutral-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>Logged in as <strong>{currentUser.fullName}</strong></span>
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Credibility Badges */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-neutral-900 pt-5">
              <div className="rounded-xl border border-neutral-900 bg-neutral-900/50 p-2.5">
                <div className="text-base sm:text-lg font-bold text-white font-mono">₦0 Fee</div>
                <div className="text-[11px] text-neutral-400">Zero commission taken</div>
              </div>
              <div className="rounded-xl border border-neutral-900 bg-neutral-900/50 p-2.5">
                <div className="text-base sm:text-lg font-bold text-white font-mono">Direct</div>
                <div className="text-[11px] text-neutral-400">WhatsApp order chats</div>
              </div>
              <div className="rounded-xl border border-neutral-900 bg-neutral-900/50 p-2.5">
                <div className="text-base sm:text-lg font-bold text-white font-mono">PS Hostels</div>
                <div className="text-[11px] text-neutral-400">Door-to-door delivery</div>
              </div>
              <div className="rounded-xl border border-neutral-900 bg-neutral-900/50 p-2.5">
                <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono">100%</div>
                <div className="text-[11px] text-neutral-400">Verified Unilorites</div>
              </div>
            </div>

          </div>

          {/* Right Column: Highlighting an Actual Student Venture Card */}
          <div className="lg:col-span-5">
            <div 
              onClick={() => onSelectFeatured('dami-pastries-unilorin')}
              className="group relative rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden shadow-2xl transition-all duration-300 hover:border-emerald-500/50 cursor-pointer"
            >
              {/* Product Visual */}
              <div className="relative h-56 sm:h-64 w-full overflow-hidden bg-neutral-950">
                <img
                  src="https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80"
                  alt="Dami's Crust & Hot Bakes"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />

                {/* Tags on Image */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg bg-neutral-950/90 border border-neutral-800 px-2.5 py-1 text-xs text-neutral-200 backdrop-blur-md">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Lagos Hostel Block C</span>
                </div>

                <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-bold text-neutral-950 shadow-md">
                  <span>Room Delivery Active</span>
                </div>
              </div>

              {/* Card Information */}
              <div className="p-5 bg-neutral-950">
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                  <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[10px]">
                    ⭐ Featured Student Venture
                  </span>
                  <span className="font-mono text-neutral-400">18 orders today</span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                  Dami's Crust & Hot Bakes
                </h3>

                <p className="mt-1 text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                  Warm beef meat pies, glazed cinnamon rolls & midnight study packages baked daily in Lagos Hostel. Delivered right to your hostel door.
                </p>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-neutral-800/80">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Starting from</span>
                    <span className="font-mono font-bold text-white text-sm">₦800</span>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                    <span>View Menu & Order</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
