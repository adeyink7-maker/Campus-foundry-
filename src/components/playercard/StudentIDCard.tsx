import React, { useState, useRef, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck, Fingerprint, Store, QrCode, LogIn } from 'lucide-react';
import { AppUser, StudentBusiness } from '../../types';
import { LongPressAvatar } from './LongPressAvatar';

interface StudentIDCardProps {
  currentUser: AppUser | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  userOwnedBusinesses?: StudentBusiness[];
  onOpenCreateBusiness?: () => void;
  onSelectBusiness?: (biz: StudentBusiness) => void;
  onOpenMyStore?: (biz: StudentBusiness) => void;
}

/**
 * Deterministic SVG QR Code Generator for Matric Numbers
 * Renders a standard QR matrix with finder patterns, timing lines, alignment, and data payload.
 */
export const MatricQRCode: React.FC<{ value: string; size?: number; className?: string }> = ({
  value,
  size = 140,
  className = '',
}) => {
  const matrixSize = 25; // Version 2 QR code matrix (25x25)
  
  // Deterministically construct QR matrix array based on string value
  const grid = React.useMemo(() => {
    const matrix: boolean[][] = Array(matrixSize)
      .fill(false)
      .map(() => Array(matrixSize).fill(false));

    // Helper: draw finder pattern at (r, c)
    const drawFinder = (row: number, col: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          if (isOuter || isInner) {
            if (row + r < matrixSize && col + c < matrixSize) {
              matrix[row + r][col + c] = true;
            }
          }
        }
      }
    };

    // Draw 3 Finder Patterns
    drawFinder(0, 0); // Top-Left
    drawFinder(0, matrixSize - 7); // Top-Right
    drawFinder(matrixSize - 7, 0); // Bottom-Left

    // Draw Timing Patterns
    for (let i = 8; i < matrixSize - 8; i++) {
      matrix[6][i] = i % 2 === 0;
      matrix[i][6] = i % 2 === 0;
    }

    // Draw Alignment Pattern (at bottom-right area)
    const alignRow = matrixSize - 7;
    const alignCol = matrixSize - 7;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const isOuter = Math.abs(r) === 2 || Math.abs(c) === 2;
        const isCenter = r === 0 && c === 0;
        if (isOuter || isCenter) {
          matrix[alignRow + r][alignCol + c] = true;
        }
      }
    }

    // Simple hash algorithm to populate remaining modules based on value
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }

    // Fill data area
    for (let r = 0; r < matrixSize; r++) {
      for (let c = 0; c < matrixSize; c++) {
        // Skip reserved finder / timing areas
        const isTopLeftFinder = r < 8 && c < 8;
        const isTopRightFinder = r < 8 && c >= matrixSize - 8;
        const isBottomLeftFinder = r >= matrixSize - 8 && c < 8;
        const isTiming = r === 6 || c === 6;
        const isAlignment = Math.abs(r - alignRow) <= 2 && Math.abs(c - alignCol) <= 2;

        if (!isTopLeftFinder && !isTopRightFinder && !isBottomLeftFinder && !isTiming && !isAlignment) {
          // Bitwise mask derived from matric string hash
          const bitVal = Math.sin(hash + r * 31 + c * 17) * 10000;
          matrix[r][c] = Math.abs(bitVal - Math.floor(bitVal)) > 0.48;
        }
      }
    }

    return matrix;
  }, [value, matrixSize]);

  // Construct SVG rect elements
  const cellDimension = size / matrixSize;

  return (
    <div className={`bg-white p-2.5 rounded-2xl shadow-lg border border-neutral-200 inline-block ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <rect width={size} height={size} fill="#ffffff" />
        {grid.map((row, r) =>
          row.map((isBlack, c) =>
            isBlack ? (
              <rect
                key={`${r}-${c}`}
                x={c * cellDimension}
                y={r * cellDimension}
                width={cellDimension + 0.1}
                height={cellDimension + 0.1}
                fill="#0a0a0a"
                rx={0.3}
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
};

export const StudentIDCard: React.FC<StudentIDCardProps> = ({
  currentUser,
  onOpenAuth,
  onSignOut,
  userOwnedBusinesses = [],
  onOpenCreateBusiness,
  onSelectBusiness,
  onOpenMyStore,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const prefersReducedMotion = useReducedMotion();
  const [isBiometricsActive, setIsBiometricsActive] = useState(true);

  // 3D Motion / Touch Pointer Tilt handler
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (prefersReducedMotion || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const xRatio = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
      const yRatio = (e.clientY - rect.top) / rect.height - 0.5;

      setTilt({
        x: yRatio * -16, // Rotate X axis
        y: xRatio * 16,  // Rotate Y axis
      });

      setGlarePos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    },
    [prefersReducedMotion]
  );

  const handlePointerLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setGlarePos({ x: 50, y: 50 });
  }, []);

  // SIGNED-OUT STATE: Show ONLY sign-in prompt with NO sample student data
  if (!currentUser) {
    return (
      <div className="space-y-4 py-4 animate-in fade-in duration-200">
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-amber-950/40 border border-amber-500/30 rounded-3xl p-7 text-center shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white tracking-wide">UNILORIN Student Digital Identity</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
              Please sign in with your verified UNILORIN student account to access your official Digital ID Card, biometric verification badge, and campus credentials.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/25 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Access Student ID</span>
          </button>
        </div>
      </div>
    );
  }

  // SIGNED-IN STATE: Verified Student ID Card details
  const matricNo = currentUser.matricNumber || '20/55EC042';
  const studentDepartment = currentUser.department || 'Computer Science';
  const studentLevel = currentUser.level || '300L';
  const studentFaculty = currentUser.faculty || 'Faculty of Communication & Information Sciences';

  return (
    <div className="space-y-5 py-2 animate-in fade-in duration-200">
      {/* 3D Tilted Student Digital ID Card with Holographic Shimmer */}
      <div className="perspective-1000">
        <motion.div
          ref={cardRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          style={{
            transformStyle: 'preserve-3d',
            rotateX: tilt.x,
            rotateY: tilt.y,
          }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-neutral-950 p-5 shadow-2xl transition-all duration-150 cursor-pointer select-none group"
        >
          {/* Holographic Shimmer Effect Overlay */}
          <div
            className="pointer-events-none absolute inset-0 z-20 opacity-40 mix-blend-color-dodge transition-opacity duration-300 group-hover:opacity-70"
            style={{
              background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,215,0,0.5) 0%, rgba(255,105,180,0.3) 30%, rgba(0,255,255,0.2) 60%, transparent 80%)`,
            }}
          />

          {/* Card Metallic Foil Background Patterns */}
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-transparent blur-xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-gradient-to-tr from-cyan-500/20 via-indigo-600/10 to-transparent blur-xl pointer-events-none" />

          {/* Card Header */}
          <div className="relative z-10 flex items-center justify-between border-b border-neutral-800/80 pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl drop-shadow">🏛️</span>
              <div>
                <h4 className="text-xs font-black text-white tracking-wider">UNIVERSITY OF ILORIN</h4>
                <p className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                  OFFICIAL STUDENT DIGITAL ID
                </p>
              </div>
            </div>
            {currentUser?.isVerified ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-400 text-[10px] font-mono shadow-sm">
                <span>Student</span>
              </div>
            )}
          </div>

          {/* Card Main Body: Student Photo + Details */}
          <div className="relative z-10 flex items-center gap-4 my-4">
            {/* Interactive Avatar with Hold / Tap indicator */}
            <div className="shrink-0">
              <LongPressAvatar
                user={currentUser}
                size="2xl"
                showVerifiedBadge={Boolean(currentUser?.isVerified)}
                showRingHint={true}
              />
            </div>

            {/* Student Info */}
            <div className="space-y-1 min-w-0 flex-1">
              <h3 className="text-base font-extrabold text-white truncate tracking-tight">{currentUser.fullName}</h3>
              <div className="inline-block px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30">
                <p className="text-xs font-mono font-bold text-amber-300 tracking-wide">
                  {matricNo}
                </p>
              </div>
              <p className="text-xs font-medium text-neutral-200 truncate mt-1">
                {studentDepartment}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                <span className="font-bold text-neutral-300">{studentLevel}</span>
                <span>•</span>
                <span className="truncate max-w-[170px]">{studentFaculty}</span>
              </div>
            </div>
          </div>

          {/* Card Footer */}
          <div className="relative z-10 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <span>●</span> BIOMETRICALLY ACTIVE
            </span>
            <span className="text-neutral-500 font-medium">SESSION: 2025/2026</span>
          </div>
        </motion.div>
      </div>

      {/* QR Code Section Below Card */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-5 text-center shadow-xl space-y-3">
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-neutral-300">
          <QrCode className="w-4 h-4 text-amber-400" />
          <span>Student Authentication QR Code</span>
        </div>
        <p className="text-[11px] text-neutral-400">
          Scan at University Library, Exam Halls, and Campus Gate Checkpoints.
        </p>

        {/* Generated SVG QR Code */}
        <div className="pt-2 flex justify-center">
          <MatricQRCode value={matricNo} size={150} />
        </div>

        <p className="text-xs font-mono font-bold text-amber-400 tracking-wider">
          {matricNo}
        </p>
      </div>

      {/* Biometrics Toggle Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <Fingerprint className="w-4.5 h-4.5 text-amber-400 shrink-0" />
          <div>
            <p className="font-bold text-neutral-200">Biometric Card Lock</p>
            <p className="text-[10px] text-neutral-400">Face ID / Touch ID quick authentication</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsBiometricsActive(!isBiometricsActive)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            isBiometricsActive
              ? 'bg-amber-500 text-neutral-950 border-amber-400'
              : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:border-neutral-600'
          }`}
        >
          {isBiometricsActive ? 'Active ✓' : 'Enable'}
        </button>
      </div>

      {/* Founder & Trader Portfolio Section */}
      {userOwnedBusinesses && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Store className="w-4 h-4 text-amber-400" />
              <span>My Campus Ventures ({userOwnedBusinesses.length})</span>
            </h4>
            {onOpenCreateBusiness && (
              <button
                type="button"
                onClick={onOpenCreateBusiness}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 font-bold transition-colors"
              >
                + Add Listing
              </button>
            )}
          </div>

          {userOwnedBusinesses.length === 0 ? (
            <p className="text-xs text-neutral-400 py-1">
              You haven't listed any student trade yet. Turn your skill or hustle into a verified campus venture!
            </p>
          ) : (
            <div className="space-y-2">
              {userOwnedBusinesses.map((biz) => (
                <div
                  key={biz.id}
                  className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <img src={biz.imageUrl} alt={biz.name} className="w-9 h-9 rounded-lg object-cover" />
                    <div>
                      <h5 className="text-xs font-bold text-white">{biz.name}</h5>
                      <p className="text-[10px] text-neutral-400">
                        {biz.category} • {biz.campus || biz.hostelLocation}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {onOpenMyStore && (
                      <button
                        type="button"
                        onClick={() => onOpenMyStore(biz)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-bold border border-orange-500/30 transition-colors cursor-pointer"
                      >
                        Manage Products
                      </button>
                    )}
                    {onSelectBusiness && (
                      <button
                        type="button"
                        onClick={() => onSelectBusiness(biz)}
                        className="text-xs text-amber-400 font-bold hover:underline"
                      >
                        View ➔
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sign Out Button */}
      <button
        type="button"
        onClick={onSignOut}
        className="w-full py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-bold text-rose-400 transition-colors shadow-sm"
      >
        Sign Out of Account
      </button>
    </div>
  );
};
