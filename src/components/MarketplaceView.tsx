import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  Store, 
  Search, 
  MapPin, 
  Sparkles, 
  Plus, 
  Compass, 
  ShieldCheck, 
  Layers, 
  ArrowRight,
  Zap,
  SlidersHorizontal,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  Package
} from 'lucide-react';
import { StudentBusiness, BusinessBlueprint, UserRole } from '../types';
import { BusinessDirectory } from './BusinessDirectory';
import { CampusHubsView } from './CampusHubsView';
import { TraderBlueprintsView } from './TraderBlueprintsView';
import { CampusDirectoryView } from './CampusDirectoryView';
import { HeroSection } from './HeroSection';
import { TraderProfileView } from './TraderProfileView';
import { useAuth } from '../context/AuthContext';

interface MarketplaceViewProps {
  businesses: StudentBusiness[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCampus: string;
  onSelectCampus: (campus: string) => void;
  onSelectBusiness: (business: StudentBusiness) => void;
  onOpenCreateBusiness: () => void;
  onOpenBecomeTrader?: () => void;
  onApplyBlueprint?: (blueprint: BusinessBlueprint) => void;
  onOpenAuth: (mode?: 'signin' | 'signup', role?: UserRole) => void;
  activeTraderBusiness?: StudentBusiness | null;
  onOpenTraderProfile?: (business: StudentBusiness) => void;
  onClearTraderBusiness?: () => void;
  onUpdateBusiness?: (updated: StudentBusiness) => void;
}

export const MarketplaceView = ({
  businesses,
  searchQuery,
  onSearchChange,
  selectedCampus,
  onSelectCampus,
  onSelectBusiness,
  onOpenCreateBusiness,
  onOpenBecomeTrader,
  onApplyBlueprint,
  onOpenAuth,
  activeTraderBusiness,
  onOpenTraderProfile: externalOpenTraderProfile,
  onClearTraderBusiness,
  onUpdateBusiness,
}: MarketplaceViewProps) => {
  const { currentUser } = useAuth();
  const [subTab, setSubTab] = useState<'stores' | 'hubs' | 'blueprints' | 'hostels' | 'vendor_hub'>('stores');
  const [localTraderProfile, setLocalTraderProfile] = useState<StudentBusiness | null>(null);

  // If parent passes activeTraderBusiness, use it; otherwise use local selection
  const activeTraderProfile = activeTraderBusiness !== undefined ? (activeTraderBusiness || localTraderProfile) : localTraderProfile;

  const handleOpenTrader = (biz: StudentBusiness) => {
    setLocalTraderProfile(biz);
    externalOpenTraderProfile?.(biz);
  };

  const handleBackFromTrader = () => {
    setLocalTraderProfile(null);
    onClearTraderBusiness?.();
  };

  const isElevatedTrader = currentUser?.accountType === 'TRADER' || currentUser?.role === 'trader';

  // Filter current user's owned trades
  const myTrades = currentUser
    ? businesses.filter(
        (b) =>
          b.ownerId === currentUser.id ||
          (b.ownerEmail && currentUser.email && b.ownerEmail.toLowerCase() === currentUser.email.toLowerCase())
      )
    : [];

  if (activeTraderProfile) {
    return (
      <TraderProfileView
        business={activeTraderProfile}
        onBack={handleBackFromTrader}
        onUpdateBusiness={(updated) => {
          setLocalTraderProfile(updated);
          onUpdateBusiness?.(updated);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Marketplace Header Hero */}
      <HeroSection
        onSearch={onSearchChange}
        searchQuery={searchQuery}
        selectedCampus={selectedCampus}
        onSelectCampus={onSelectCampus}
        onOpenAuth={onOpenAuth}
        onOpenCreateBusiness={onOpenCreateBusiness}
        onSelectFeatured={(bizId: string) => {
          const found = businesses.find((b) => b.id === bizId);
          if (found) onSelectBusiness(found);
        }}
      />

      {/* Elevation Banner for Buyers */}
      {!isElevatedTrader && (
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/60 via-neutral-900 to-neutral-950 p-5 sm:p-6 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">Start Your Campus Venture</h3>
                <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[9px] font-mono font-bold">
                  Zero Commission
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 max-w-xl leading-relaxed">
                Elevate your student account to list food, services, fashion, or tech gadgets. Get orders straight to your WhatsApp with verified UNILORIN trust badges.
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onOpenBecomeTrader || onOpenCreateBusiness}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold px-5 py-2.5 text-xs transition-all shadow-lg shadow-amber-950/50 cursor-pointer shrink-0"
          >
            <span>Become a Trader</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </motion.button>
        </div>
      )}

      {/* Sub-Navigation Tabs inside Marketplace */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => setSubTab('stores')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer shrink-0 ${
              subTab === 'stores'
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-950/40'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <Store className="h-3.5 w-3.5" />
            <span>Campus Stores & Ventures ({businesses.length})</span>
          </motion.button>

          {isElevatedTrader && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => setSubTab('vendor_hub')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                subTab === 'vendor_hub'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              <Package className="h-3.5 w-3.5 text-emerald-400" />
              <span>Vendor Dashboard ({myTrades.length})</span>
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => setSubTab('hostels')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer shrink-0 ${
              subTab === 'hostels'
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-950/40'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>Hostels & Faculties Drill-Down</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => setSubTab('hubs')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer shrink-0 ${
              subTab === 'hubs'
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-950/40'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Campus Hubs</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => setSubTab('blueprints')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer shrink-0 ${
              subTab === 'blueprints'
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-950/40'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Starter Blueprints</span>
          </motion.button>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={isElevatedTrader ? onOpenCreateBusiness : (onOpenBecomeTrader || onOpenCreateBusiness)}
          className="hidden sm:flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-md"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{isElevatedTrader ? '+ List New Trade' : 'Become Trader'}</span>
        </motion.button>
      </div>

      {/* Render Subtabs */}
      {subTab === 'stores' && (
        <BusinessDirectory
          businesses={businesses}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          selectedCampus={selectedCampus}
          onSelectCampus={onSelectCampus}
          onSelectBusiness={onSelectBusiness}
          onOpenCreateBusiness={onOpenCreateBusiness}
          onOpenTraderProfile={handleOpenTrader}
        />
      )}

      {/* Elevated Vendor Operations Hub */}
      {subTab === 'vendor_hub' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 space-y-4 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <span>UNILORIN Verified Vendor Operations Dashboard</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Manage your active trade listings, hostel orders, menu prices, and brand storefront
                </p>
              </div>

              <div className="flex items-center gap-2">
                {myTrades.length > 0 && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => handleOpenTrader(myTrades[0])}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-500/50 bg-amber-500/15 hover:bg-amber-500 hover:text-neutral-950 text-amber-300 px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow-md shadow-amber-950/30"
                  >
                    <Store className="h-3.5 w-3.5" />
                    <span>View My Trader Portfolio</span>
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={onOpenCreateBusiness}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 px-4 py-2 text-xs font-bold transition-colors cursor-pointer shadow-md shadow-amber-950/40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Product / Service</span>
                </motion.button>
              </div>
            </div>

            {myTrades.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-800 p-8 text-center space-y-3">
                <Store className="h-10 w-10 text-neutral-600 mx-auto" />
                <p className="text-xs text-neutral-400">
                  You are registered as a Trader, but you haven't listed your first venture profile yet.
                </p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onOpenCreateBusiness}
                  className="rounded-xl bg-amber-500 text-neutral-950 font-bold px-4 py-2 text-xs cursor-pointer shadow-md"
                >
                  Create Your Storefront Listing
                </motion.button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {myTrades.map((biz) => (
                  <div
                    key={biz.id}
                    className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 space-y-3 flex flex-col justify-between hover:border-neutral-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={biz.imageUrl}
                          alt={biz.name}
                          className="h-12 w-12 rounded-xl object-cover border border-neutral-800 shadow-md"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-white">{biz.name}</h4>
                          <span className="text-[11px] text-amber-400 font-medium">{biz.category}</span>
                        </div>
                      </div>

                      <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-bold">
                        Verified Live
                      </span>
                    </div>

                    <p className="text-xs text-neutral-300 line-clamp-2">{biz.tagline}</p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                      <div>
                        <span className="text-neutral-500 block">Hostel Base:</span>
                        <strong className="text-white">{biz.hostelLocation}</strong>
                      </div>
                      <div>
                        <span className="text-neutral-500 block">Menu Items:</span>
                        <strong className="text-emerald-400">{biz.services.length} items listed</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                      <span className="text-xs font-mono font-bold text-white">
                        From ₦{biz.startingPrice.toLocaleString()}
                      </span>

                      <div className="flex items-center gap-2">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => handleOpenTrader(biz)}
                          className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                          title="View your public trader profile & edit inventory"
                        >
                          <Store className="h-3.5 w-3.5" />
                          <span>View Trader Portfolio</span>
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => onSelectBusiness(biz)}
                          className="rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Orders
                        </motion.button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'hostels' && (
        <CampusDirectoryView
          onSelectHostelFilter={(hostelName) => {
            onSearchChange(hostelName);
            setSubTab('stores');
          }}
          onSelectDepartmentFilter={(dept, faculty) => {
            onSearchChange(dept);
            setSubTab('stores');
          }}
          onOpenCreateBusiness={onOpenCreateBusiness}
        />
      )}

      {subTab === 'hubs' && (
        <CampusHubsView
          onSelectHubZone={(zoneName) => {
            onSelectCampus(zoneName);
            setSubTab('stores');
          }}
          onOpenCreateBusiness={onOpenCreateBusiness}
        />
      )}

      {subTab === 'blueprints' && (
        <TraderBlueprintsView
          onApplyBlueprint={onApplyBlueprint || onOpenCreateBusiness}
        />
      )}

    </div>
  );
};
