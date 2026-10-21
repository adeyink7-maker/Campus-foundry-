import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AppUser, StudentBusiness, CampusPost } from '../types';
import { UserProfileView } from './UserProfileView';
import { LogIn, ArrowLeft } from 'lucide-react';

interface StudentDashboardProps {
  businesses: StudentBusiness[];
  posts?: CampusPost[];
  targetUser?: AppUser | null;
  onClearTargetUser?: () => void;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  onOpenCreateBusiness: () => void;
  onSelectBusiness: (business: StudentBusiness) => void;
  onOpenTraderProfile?: (business: StudentBusiness) => void;
  onClaimBusiness?: (bizId: string) => void;
  onDeleteBusiness?: (bizId: string) => void;
  onDeletePost?: (postId: string) => void;
  onOpenBecomeTrader?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  businesses,
  posts = [],
  targetUser,
  onClearTargetUser,
  onOpenAuth,
  onOpenCreateBusiness,
  onSelectBusiness,
  onOpenTraderProfile,
}) => {
  const { currentUser } = useAuth();

  const activeUser = targetUser || currentUser;

  if (!activeUser) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-8 shadow-2xl backdrop-blur-md">
          <LogIn className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Sign In to Access Instagram-Style Profile</h2>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-6">
            View followers, photo grid, active campus trades, academic credentials & bio in a clean social portfolio.
          </p>
          <button
            type="button"
            onClick={() => onOpenAuth('signin')}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            Sign In Now
          </button>
        </div>
      </div>
    );
  }

  const userBusinesses = businesses.filter((b) => {
    if (b.ownerId && b.ownerId === activeUser.id) return true;
    if (b.ownerEmail && activeUser.email && b.ownerEmail.toLowerCase().trim() === activeUser.email.toLowerCase().trim()) return true;
    return false;
  });

  const userPosts = posts.filter((p) => p.authorId === activeUser.id);

  const isViewingOther = Boolean(targetUser && currentUser && targetUser.id !== currentUser.id);

  return (
    <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Top Back Header when viewing another account */}
      {isViewingOther && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-900/80 border border-neutral-800 shadow-md">
          <button
            type="button"
            onClick={onClearTargetUser}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-amber-400" />
            <span>Back to Campus Feed</span>
          </button>

          <span className="text-xs text-neutral-400 font-mono">
            Viewing Profile: <strong className="text-white">{activeUser.fullName}</strong>
          </span>
        </div>
      )}

      <UserProfileView
        user={activeUser}
        userPosts={userPosts}
        userSnaps={[]}
        userBusinesses={userBusinesses}
        onOpenCreateBusiness={onOpenCreateBusiness}
        onSelectBusiness={onSelectBusiness}
        onOpenTraderProfile={onOpenTraderProfile}
      />
    </div>
  );
};

export default StudentDashboard;
