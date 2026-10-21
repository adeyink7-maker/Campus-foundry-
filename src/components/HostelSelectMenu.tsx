import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, X, Check, Building2, Users, ArrowRight, Compass, ShieldCheck } from 'lucide-react';
import { 
  ALL_UNILORIN_HOSTELS, 
  ALL_UNILORIN_HOSTELS_META, 
  HostelInfo 
} from '../data/mockData';

interface HostelSelectMenuProps {
  /** The currently selected hostel name or full address */
  selectedHostel: string;
  /** Callback when hostel is changed */
  onHostelChange: (hostelName: string) => void;
  /** Optional room / block number */
  roomNumber?: string;
  /** Callback when room number is changed */
  onRoomNumberChange?: (room: string) => void;
  /** Whether to show the room/block number input field beside or below the select */
  showRoomInput?: boolean;
  /** Custom label */
  label?: string;
  /** Required field */
  required?: boolean;
  /** ClassName for the wrapper */
  className?: string;
  /** Custom select class name */
  selectClassName?: string;
  /** Placeholder for room number input */
  roomPlaceholder?: string;
  /** Whether to include an 'All Hostels' option (useful for filter menus) */
  allowAll?: boolean;
  /** Custom label for the 'All' option */
  allLabel?: string;
}

export const HostelSelectMenu: React.FC<HostelSelectMenuProps> = ({
  selectedHostel,
  onHostelChange,
  roomNumber,
  onRoomNumberChange,
  showRoomInput = false,
  label = 'Hostel / Campus Residence',
  required = true,
  className = '',
  selectClassName = '',
  roomPlaceholder = 'e.g. Block B Room 102',
  allowAll = false,
  allLabel = 'All UNILORIN Hostels',
}) => {
  // Overhead search query
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Initial detection from selectedHostel prop if present
  const initialMeta = useMemo(() => {
    if (!selectedHostel || selectedHostel === 'All') return null;
    return ALL_UNILORIN_HOSTELS_META.find((h) => selectedHostel.includes(h.name)) || null;
  }, [selectedHostel]);

  // Step 1: Campus Location ('main' | 'mini' | 'offcampus' | null)
  const [campusStep, setCampusStep] = useState<'main' | 'mini' | 'offcampus' | null>(() => {
    return initialMeta ? initialMeta.campus : null;
  });

  // Step 2: Ownership Type ('school' | 'private' | null)
  const [ownershipStep, setOwnershipStep] = useState<'school' | 'private' | null>(() => {
    if (!initialMeta) return null;
    return initialMeta.category === 'school' ? 'school' : 'private';
  });

  // Step 3: Gender Preference ('male' | 'female') - Exclude "All/Any" default state to keep choices explicit
  const [genderStep, setGenderStep] = useState<'male' | 'female'>(() => {
    if (initialMeta && initialMeta.gender === 'female') return 'female';
    return 'male';
  });

  // Keep state synced if selectedHostel changes from outside
  useEffect(() => {
    if (initialMeta) {
      setCampusStep(initialMeta.campus);
      setOwnershipStep(initialMeta.category === 'school' ? 'school' : 'private');
      if (initialMeta.gender === 'female') setGenderStep('female');
      else setGenderStep('male');
    }
  }, [initialMeta]);

  // Overhead search results across all hostels
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase();
    return ALL_UNILORIN_HOSTELS_META.filter((h) =>
      h.name.toLowerCase().includes(q) || h.groupName.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [searchTerm]);

  // Dynamic Hostels for current drill-down branch (Campus -> Ownership -> Gender)
  const branchHostels = useMemo(() => {
    if (!campusStep) return [];

    return ALL_UNILORIN_HOSTELS_META.filter((h) => {
      // 1. Campus match
      if (h.campus !== campusStep) return false;

      // 2. Ownership match (if main or mini campus)
      if (campusStep === 'main' || campusStep === 'mini') {
        if (ownershipStep) {
          if (ownershipStep === 'school' && h.category !== 'school') return false;
          if (ownershipStep === 'private' && h.category !== 'private') return false;
        }
      }

      // 3. Gender match (Explicit: male vs female)
      if (genderStep === 'male') {
        if (h.gender !== 'male' && h.gender !== 'any') return false;
      } else if (genderStep === 'female') {
        if (h.gender !== 'female' && h.gender !== 'any') return false;
      }

      return true;
    });
  }, [campusStep, ownershipStep, genderStep]);

  // Quick select from overhead search
  const handleSelectSearchResult = (hostel: HostelInfo) => {
    onHostelChange(hostel.name);
    setCampusStep(hostel.campus);
    setOwnershipStep(hostel.category === 'school' ? 'school' : 'private');
    setGenderStep(hostel.gender === 'female' ? 'female' : 'male');
    setSearchTerm('');
    setIsSearchOpen(false);
  };

  return (
    <div className={`space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3.5 sm:p-4 backdrop-blur-sm ${className}`}>
      
      {/* 1. Top Search Bar: Accessible at all times for quick keyword lookup */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <MapPin className="h-3 w-3" />
            </span>
            <span>{label}</span>
            {required && !allowAll && <span className="text-emerald-400">*</span>}
          </div>

          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
              isSearchOpen || searchTerm
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700'
            }`}
          >
            <Search className="h-3 w-3 text-emerald-400" />
            <span>Search All Hostels</span>
          </button>
        </div>

        {/* Search Field */}
        {(isSearchOpen || searchTerm) && (
          <div className="relative animate-in fade-in slide-in-from-top-1 duration-150">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search hostel name (e.g. Sanusi, Bethany, Village I, Arafims, Hawa, Trunil)..."
              className="w-full rounded-xl border border-emerald-500/40 bg-neutral-950 pl-9 pr-8 py-2 text-xs text-white placeholder-neutral-500 focus:border-emerald-400 focus:outline-none shadow-inner"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Quick Search Dropdown Results */}
            {searchTerm.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-56 overflow-y-auto rounded-xl border border-neutral-700 bg-neutral-950 p-1.5 shadow-2xl space-y-1">
                {searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-neutral-900 transition-colors group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Building2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <div className="truncate">
                          <span className="font-semibold text-white group-hover:text-emerald-300">
                            {item.name}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                            <span className="capitalize">{item.campus} Campus</span>
                            <span>•</span>
                            <span className="capitalize">{item.category}</span>
                            <span>•</span>
                            <span className="capitalize">{item.gender}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 ml-2">
                        <span>Select</span>
                        <ArrowRight className="h-2.5 w-2.5" />
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-center text-xs text-neutral-400">
                    No hostel found matching "{searchTerm}"
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Multi-Step Drilling Navigation Flow */}
      <div className="space-y-3 pt-1 border-t border-neutral-800/60">
        
        {/* STEP 1: Campus Location Selection (3 initial choice options) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-medium text-neutral-300 flex items-center gap-1.5">
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                campusStep ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                1
              </span>
              <span>Step 1: Select Campus Location</span>
              {required && !allowAll && <span className="text-emerald-400">*</span>}
            </label>
            {campusStep && (
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">
                ✓ {campusStep === 'main' ? 'Main Campus' : campusStep === 'mini' ? 'Mini Campus' : 'Off Campus'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => {
                setCampusStep('main');
                if (ownershipStep === null) setOwnershipStep('school');
              }}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                campusStep === 'main'
                  ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500/50'
                  : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
              }`}
            >
              <div className="text-xs font-bold leading-tight">Main Campus</div>
              <div className="text-[10px] text-neutral-400 mt-0.5">PS Hostels</div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => {
                setCampusStep('mini');
                if (ownershipStep === null) setOwnershipStep('school');
              }}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                campusStep === 'mini'
                  ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/50'
                  : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
              }`}
            >
              <div className="text-xs font-bold leading-tight">Mini Campus</div>
              <div className="text-[10px] text-neutral-400 mt-0.5">COHS / Sabo Oke</div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => {
                setCampusStep('offcampus');
                setOwnershipStep('private');
              }}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                campusStep === 'offcampus'
                  ? 'bg-purple-600/20 border-purple-500 text-white shadow-sm ring-1 ring-purple-500/50'
                  : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
              }`}
            >
              <div className="text-xs font-bold leading-tight">Off Campus</div>
              <div className="text-[10px] text-neutral-400 mt-0.5">Tanke / Suburbs</div>
            </motion.button>
          </div>
        </div>

        {/* STEP 2: Ownership Type Selection (Revealed upon selecting Campus Location, expands smoothly) */}
        <AnimatePresence>
          {campusStep && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.98 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="overflow-hidden pt-2 border-t border-neutral-800/40"
            >
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-medium text-neutral-300 flex items-center gap-1.5">
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                    ownershipStep ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    2
                  </span>
                  <span>Step 2: Choose Ownership Type</span>
                  {required && !allowAll && <span className="text-emerald-400">*</span>}
                </label>
                {ownershipStep && (
                  <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">
                    ✓ {ownershipStep === 'school' ? 'School-Owned' : 'Private'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setOwnershipStep('school')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    ownershipStep === 'school'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  School-Owned Hostels
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setOwnershipStep('private')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    ownershipStep === 'private'
                      ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-950/40 ring-1 ring-amber-400'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  Private Hostels
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STEP 3: Gender & Final Hostel List Selection (Revealed once Campus & Ownership are selected) */}
        <AnimatePresence>
          {campusStep && ownershipStep && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.98 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="overflow-hidden pt-2 border-t border-neutral-800/40 space-y-3"
            >
              {/* Gender Filter (Explicit: Male Hostels vs Female Hostels - NO "All / Any" default) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-medium text-neutral-300 flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-[9px] font-bold text-emerald-400">
                      3
                    </span>
                    <span>Step 3: Gender Specification</span>
                    {required && !allowAll && <span className="text-emerald-400">*</span>}
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">
                    ✓ {genderStep === 'male' ? 'Male Hostels' : 'Female Hostels'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setGenderStep('male')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      genderStep === 'male'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-950/40 ring-1 ring-blue-400'
                        : 'bg-neutral-950 text-blue-300/70 border-neutral-800 hover:text-blue-200'
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Male Hostels</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setGenderStep('female')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      genderStep === 'female'
                        ? 'bg-pink-600 text-white border-pink-500 shadow-md shadow-pink-950/40 ring-1 ring-pink-400'
                        : 'bg-neutral-950 text-pink-300/70 border-neutral-800 hover:text-pink-200'
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Female Hostels</span>
                  </motion.button>
                </div>
              </div>

              {/* Dynamic Final Hostel List Selection */}
              <div className={showRoomInput ? 'grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1' : 'w-full pt-1'}>
                <div className={showRoomInput ? 'sm:col-span-7' : 'w-full'}>
                  <label className="text-[10px] font-mono text-neutral-400 block mb-1 flex items-center justify-between">
                    <span>Select Specific Hostel ({branchHostels.length} available)</span>
                    <span className="text-emerald-400 font-semibold uppercase">
                      {campusStep} • {ownershipStep} • {genderStep}
                    </span>
                  </label>

                  <select
                    required={required && !allowAll}
                    value={selectedHostel}
                    onChange={(e) => onHostelChange(e.target.value)}
                    className={`w-full rounded-xl border border-emerald-500/60 bg-neutral-950 py-2.5 px-3 text-xs sm:text-sm text-white focus:border-emerald-400 focus:outline-none transition-colors cursor-pointer shadow-sm ${selectClassName}`}
                  >
                    {allowAll && (
                      <option value="All" className="bg-neutral-900 text-emerald-400 font-semibold">
                        ✨ {allLabel}
                      </option>
                    )}
                    {!selectedHostel && (
                      <option value="" disabled>-- Select from {branchHostels.length} matching hostels --</option>
                    )}
                    {branchHostels.map((item) => (
                      <option key={item.name} value={item.name} className="bg-neutral-950 text-white font-normal py-1">
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Optional Room / Compound / Block input */}
                {showRoomInput && onRoomNumberChange && (
                  <div className="sm:col-span-5">
                    <label className="text-[10px] font-mono text-neutral-400 block mb-1">
                      Room / Block / Compound
                    </label>
                    <input
                      type="text"
                      value={roomNumber || ''}
                      onChange={(e) => onRoomNumberChange(e.target.value)}
                      placeholder={roomPlaceholder}
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 px-3 text-xs sm:text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none transition-colors"
                    />
                  </div>
                )}
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Selected Hostel Final Confirmation Pill with motion */}
      <AnimatePresence>
        {selectedHostel && selectedHostel !== 'All' && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="flex items-center justify-between rounded-xl bg-emerald-950/40 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-300"
          >
            <span className="flex items-center gap-2 truncate">
              <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">
                Selected: <strong>{selectedHostel}</strong>
                {roomNumber?.trim() ? ` (${roomNumber.trim()})` : ''}
              </span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400/90 font-bold ml-2 shrink-0 bg-emerald-900/40 px-2 py-0.5 rounded">
              UNILORIN Verified
            </span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
