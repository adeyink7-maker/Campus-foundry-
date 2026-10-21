import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Layers, Search, X, Check, ArrowRight } from 'lucide-react';
import { UNILORIN_FACULTIES, FacultyDepartmentMapping } from '../data/mockData';

interface FacultyDepartmentSelectorProps {
  selectedFaculty: string;
  onFacultyChange: (faculty: string) => void;
  selectedDepartment: string;
  onDepartmentChange: (department: string) => void;
  className?: string;
  required?: boolean;
  compact?: boolean;
  labelPrefix?: string;
  allowAll?: boolean;
  allFacultyLabel?: string;
  allDepartmentLabel?: string;
}

export const FacultyDepartmentSelector: React.FC<FacultyDepartmentSelectorProps> = ({
  selectedFaculty,
  onFacultyChange,
  selectedDepartment,
  onDepartmentChange,
  className = '',
  required = true,
  compact = false,
  labelPrefix = 'Student',
  allowAll = false,
  allFacultyLabel = 'All 16 Faculties',
  allDepartmentLabel = 'All Departments',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Check if a faculty has been explicitly chosen in Step 1
  const hasFacultySelected = Boolean(selectedFaculty && selectedFaculty !== '');

  // Find currently selected faculty object
  const currentFacultyObj = useMemo(() => {
    if (!hasFacultySelected || selectedFaculty === 'All') return null;
    return UNILORIN_FACULTIES.find(
      (f) => f.faculty === selectedFaculty || selectedFaculty.includes(f.code)
    );
  }, [selectedFaculty, hasFacultySelected]);

  // Departments available under the chosen faculty ONLY
  const availableDepartments = useMemo(() => {
    if (currentFacultyObj) {
      return currentFacultyObj.departments;
    }
    return [];
  }, [currentFacultyObj]);

  // Overhead search results across all 16 faculties and departments
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase();
    const results: { faculty: FacultyDepartmentMapping; matchedDept?: string }[] = [];

    UNILORIN_FACULTIES.forEach((fac) => {
      const facMatch = fac.faculty.toLowerCase().includes(q) || fac.code.toLowerCase().includes(q);
      const matchingDepts = fac.departments.filter((d) => d.toLowerCase().includes(q));

      if (matchingDepts.length > 0) {
        matchingDepts.forEach((dept) => {
          results.push({ faculty: fac, matchedDept: dept });
        });
      } else if (facMatch) {
        results.push({ faculty: fac });
      }
    });

    return results.slice(0, 10);
  }, [searchTerm]);

  const handleFacultySelect = (newFaculty: string) => {
    onFacultyChange(newFaculty);
    if (newFaculty === 'All') {
      onDepartmentChange('All');
      return;
    }
    const found = UNILORIN_FACULTIES.find((f) => f.faculty === newFaculty);
    if (found && found.departments.length > 0) {
      // If previous department does not belong to newly chosen faculty, reset to first or empty
      if (!found.departments.includes(selectedDepartment)) {
        onDepartmentChange(found.departments[0]);
      }
    } else {
      onDepartmentChange('');
    }
  };

  const handleQuickSelectSearchResult = (facName: string, deptName?: string) => {
    onFacultyChange(facName);
    if (deptName) {
      onDepartmentChange(deptName);
    } else {
      const found = UNILORIN_FACULTIES.find((f) => f.faculty === facName);
      if (found && found.departments.length > 0) {
        onDepartmentChange(found.departments[0]);
      }
    }
    setSearchTerm('');
    setIsSearchOpen(false);
  };

  return (
    <div className={`space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3.5 sm:p-4 backdrop-blur-sm ${className}`}>
      
      {/* 1. Top Search Bar: Accessible at all times for direct query searches */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Layers className="h-3 w-3" />
            </span>
            <span>{labelPrefix ? `${labelPrefix} Academic Affiliation` : 'UNILORIN Faculty & Department'}</span>
            {required && !allowAll && <span className="text-amber-400">*</span>}
          </div>

          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
              isSearchOpen || searchTerm
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700'
            }`}
          >
            <Search className="h-3 w-3 text-amber-400" />
            <span>Search All</span>
          </button>
        </div>

        {/* Top Overhead Search Input Field */}
        {(isSearchOpen || searchTerm) && (
          <div className="relative animate-in fade-in slide-in-from-top-1 duration-150">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search any faculty or department (e.g. Computer Science, Anatomy, Civil, Law)..."
              className="w-full rounded-xl border border-amber-500/40 bg-neutral-950 pl-9 pr-8 py-2 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none shadow-inner"
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

            {/* Live Search Dropdown Results */}
            {searchTerm.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-56 overflow-y-auto rounded-xl border border-neutral-700 bg-neutral-950 p-1.5 shadow-2xl space-y-1">
                {searchResults.length > 0 ? (
                  searchResults.map((item, idx) => (
                    <button
                      key={`${item.faculty.code}-${item.matchedDept || 'fac'}-${idx}`}
                      type="button"
                      onClick={() => handleQuickSelectSearchResult(item.faculty.faculty, item.matchedDept)}
                      className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-neutral-900 transition-colors group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <GraduationCap className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <div className="truncate">
                          {item.matchedDept ? (
                            <>
                              <span className="font-semibold text-white group-hover:text-emerald-300">
                                {item.matchedDept}
                              </span>
                              <span className="text-[10px] text-neutral-400 block truncate">
                                in {item.faculty.faculty} ({item.faculty.code})
                              </span>
                            </>
                          ) : (
                            <span className="font-semibold text-amber-300">
                              {item.faculty.faculty} ({item.faculty.code})
                            </span>
                          )}
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
                    No faculty or department found matching "{searchTerm}"
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step Progress Indicators */}
      <div className="flex items-center gap-2 text-[11px] font-medium text-neutral-400">
        <span className={`flex items-center gap-1 ${hasFacultySelected ? 'text-amber-400 font-semibold' : 'text-neutral-300'}`}>
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-[9px] font-bold text-amber-400">
            1
          </span>
          <span>Select Faculty</span>
        </span>
        <span className="text-neutral-600">→</span>
        <span className={`flex items-center gap-1 ${hasFacultySelected ? 'text-emerald-400 font-semibold' : 'text-neutral-600'}`}>
          <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
            hasFacultySelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-600'
          }`}>
            2
          </span>
          <span>Select Department</span>
        </span>
      </div>

      {/* Progressive Drill-Down Form Layout */}
      <div className="space-y-3">
        
        {/* STEP 1: Faculty Selection (Always visible on initial load) */}
        <div>
          <label className="text-[11px] font-medium text-neutral-300 flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5">
              <span>Step 1: Choose Faculty</span>
              {required && !allowAll && <span className="text-amber-400">*</span>}
            </span>
            <span className="text-[10px] text-amber-400 font-mono">16 Faculties</span>
          </label>

          <select
            required={required && !allowAll}
            value={selectedFaculty}
            onChange={(e) => handleFacultySelect(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 px-3 text-xs sm:text-sm text-white focus:border-amber-500 focus:outline-none transition-colors cursor-pointer"
          >
            {allowAll && (
              <option value="All" className="bg-neutral-900 text-amber-300 font-bold">
                ✨ {allFacultyLabel}
              </option>
            )}
            <option value="" disabled={!allowAll}>
              -- Select UNILORIN Faculty (1 - 16) --
            </option>
            {UNILORIN_FACULTIES.map((fac, idx) => (
              <option key={fac.faculty} value={fac.faculty} className="bg-neutral-950 text-white font-normal py-1">
                {idx + 1}. {fac.faculty} ({fac.departments.length} depts) [{fac.code}]
              </option>
            ))}
          </select>
        </div>

        {/* STEP 2: Department Selection (Completely hidden until a faculty is chosen, expands smoothly) */}
        <AnimatePresence>
          {hasFacultySelected && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.98 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="overflow-hidden pt-1 border-t border-neutral-800/60"
            >
              <label className="text-[11px] font-medium text-neutral-300 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Step 2: Choose Department under {currentFacultyObj ? currentFacultyObj.code : selectedFaculty}</span>
                  {required && !allowAll && <span className="text-emerald-400">*</span>}
                </span>
                {currentFacultyObj && (
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    {availableDepartments.length} depts
                  </span>
                )}
              </label>

              <select
                required={required && !allowAll}
                value={selectedDepartment}
                onChange={(e) => onDepartmentChange(e.target.value)}
                className="w-full rounded-xl border border-emerald-500/50 bg-neutral-950 py-2.5 px-3 text-xs sm:text-sm text-white focus:border-emerald-400 focus:outline-none transition-colors cursor-pointer shadow-sm"
              >
                {allowAll && (
                  <option value="All" className="bg-neutral-900 text-emerald-300 font-bold">
                    ✨ {allDepartmentLabel}
                  </option>
                )}
                {!selectedDepartment && (
                  <option value="" disabled>-- Select Department in {currentFacultyObj?.code || 'Faculty'} --</option>
                )}
                {availableDepartments.map((dept) => (
                  <option key={dept} value={dept} className="bg-neutral-950 text-white font-normal py-1">
                    {dept}
                  </option>
                ))}
              </select>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Selected Confirmation Summary with motion */}
      <AnimatePresence>
        {hasFacultySelected && selectedDepartment && selectedDepartment !== '' && (
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
                <strong>{selectedDepartment}</strong> • <span className="text-neutral-400">{selectedFaculty}</span>
              </span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold ml-2 shrink-0 bg-emerald-900/40 px-2 py-0.5 rounded">
              {currentFacultyObj?.code}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
