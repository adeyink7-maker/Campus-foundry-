import { MapPin, Users, Store, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { CAMPUS_HUBS } from '../data/mockData';

interface CampusHubsViewProps {
  onSelectHubZone: (zone: string) => void;
  onOpenCreateBusiness: () => void;
}

export const CampusHubsView = ({
  onSelectHubZone,
  onOpenCreateBusiness,
}: CampusHubsViewProps) => {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header */}
      <div className="border-b border-neutral-800 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
          <MapPin className="h-3.5 w-3.5" />
          <span>UNILORIN Collegiate Clusters</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Hostel Hubs & Campus Commercial Zones
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed">
          Discover which dorms bake late-night pastries, where the fastest iPhone technicians assemble around CIS, and explore Tanke off-campus thrift fashion studios.
        </p>
      </div>

      {/* Hub Cards Grid */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {CAMPUS_HUBS.map((hub) => (
          <div
            key={hub.id}
            className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 sm:p-6 transition-all duration-200 hover:border-emerald-500/50 hover:bg-neutral-900 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  {hub.type}
                </span>
                <span className="text-xs font-mono text-neutral-400 bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800">
                  {hub.businessCount}+ Student Trades
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
                {hub.name}
              </h2>

              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mb-4">
                {hub.description}
              </p>

              {/* Popular categories in this hub */}
              <div className="mb-4">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 block mb-1.5">
                  Popular Student Specialties:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {hub.topCategories.map((cat, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg bg-neutral-950 border border-neutral-800 px-2.5 py-1 text-xs text-neutral-300"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Spot reference */}
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-950/70 p-2.5 rounded-xl border border-neutral-800/80">
                <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Primary Meeting Spot: <strong>{hub.popularSpot}</strong></span>
              </div>
            </div>

            {/* Hub Action Button */}
            <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between">
              <button
                onClick={() => onSelectHubZone(hub.zone)}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <span>Browse Stores in {hub.zone}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={onOpenCreateBusiness}
                className="rounded-lg bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors"
              >
                List Trade Here
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
