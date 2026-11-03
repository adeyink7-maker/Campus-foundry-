import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, ShieldCheck, ArrowRight } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { MarketplaceChatProvider } from './context/MarketplaceChatContext';
import { CartProvider } from './context/CartContext';
import { PlayerCardProvider } from './context/PlayerCardContext';
import { PlayerCardOverlay } from './components/playercard/PlayerCardOverlay';
import { PlayerCardEditorModal } from './components/playercard/PlayerCardEditorModal';
import { RootNavigator } from './mobile/navigation/RootNavigator';

function WelcomeLandingScreen({ onOpenAuth }: { onOpenAuth: () => void }) {
  return (
    <div className="min-h-screen w-full bg-neutral-950 flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-xl w-full mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-bold tracking-wide uppercase">
          <GraduationCap className="h-4 w-4 text-blue-400" />
          <span>CAMPUS FOUNDRY • STUDENT COMMUNITY & MARKETPLACE</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
          The Ultimate Campus Foundry <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">Student Hub & Marketplace</span>
        </h1>

        <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-lg mx-auto">
          Connect with campus peers, order food & hostel deliveries from verified student vendors, share 24h snaps, and trade easily across campus.
        </p>

        <div className="pt-4 space-y-3">
          <button
            onClick={onOpenAuth}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 font-bold text-sm sm:text-base shadow-xl shadow-blue-950/50 transition-all transform hover:scale-[1.02] cursor-pointer"
          >
            <ShieldCheck className="h-5 w-5" />
            <span>Sign in with Student Webmail</span>
            <ArrowRight className="h-5 w-5" />
          </button>

          <p className="text-xs text-neutral-400">
            Verified securely via student webmail OTP.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-8 border-t border-neutral-800/80 text-left">
          <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
            <span className="text-xs font-bold text-white block mb-1">Verified OTP</span>
            <span className="text-[11px] text-neutral-400 leading-snug block">Student identity verification guarantee.</span>
          </div>
          <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
            <span className="text-xs font-bold text-white block mb-1">Hostel Delivery</span>
            <span className="text-[11px] text-neutral-400 leading-snug block">Direct dispatch to your hostel block.</span>
          </div>
          <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
            <span className="text-xs font-bold text-white block mb-1">ID Card Studio</span>
            <span className="text-[11px] text-neutral-400 leading-snug block">World Cup style student player cards.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Components
import { DynamicMotivationBanner } from './components/DynamicMotivationBanner';
import { SidebarNav } from './components/SidebarNav';
import { RightUtilitiesPanel } from './components/RightUtilitiesPanel';
import { CampusFeedView } from './components/CampusFeedView';
import { MarketplaceView } from './components/MarketplaceView';
import { PoliticsCampaignView } from './components/PoliticsCampaignView';
import { FacultiesDeptsView } from './components/FacultiesDeptsView';
import { ClubsDirectoryView } from './components/ClubsDirectoryView';
import { CampusNewsView } from './components/CampusNewsView';
import { CampusMapView } from './components/CampusMapView';
import { StudentDashboard } from './components/StudentDashboard';

// Modals
import { BusinessDetailModal } from './components/BusinessDetailModal';
import { CreateBusinessModal } from './components/CreateBusinessModal';
import { BecomeTraderModal } from './components/BecomeTraderModal';
import { AuthModal } from './components/AuthModal';
import { ChatDrawer } from './components/ChatDrawer';
import { MarketplaceChatDrawer } from './components/MarketplaceChatDrawer';
import { CartDrawer } from './components/CartDrawer';
import { SnapViewerModal } from './components/SnapViewerModal';
import { CreateSnapModal } from './components/CreateSnapModal';
import { CreatePostModal } from './components/CreatePostModal';

// Mock Data & Types
import { 
  AppModule, 
  StudentLevel, 
  StudentBusiness, 
  CampusPost, 
  CampusSnap, 
  UserRole,
  AppUser
} from './types';

// Supabase Realtime & CRUD Services
import {
  isSupabaseConfigured,
  fetchCampusPostsFromSupabase,
  createCampusPostInSupabase,
  deleteCampusPostInSupabase,
  toggleCampusPostLikeInSupabase,
  addCampusCommentInSupabase,
  fetchStudentBusinessesFromSupabase,
  upsertStudentBusinessInSupabase,
  deleteStudentBusinessInSupabase,
  fetchCampusSnapsFromSupabase,
  createCampusSnapInSupabase,
  resetDatabaseToZero,
  deletePostsByUserInSupabase,
} from './services/supabase';

const STORAGE_BUSINESSES_KEY = 'campus_foundry_custom_businesses_v4';
const STORAGE_POSTS_KEY = 'campus_foundry_posts_v4';
const STORAGE_SNAPS_KEY = 'campus_foundry_snaps_v4';

function MainApp() {
  const { currentUser, isLoading } = useAuth();
  const [viewMode, setViewMode] = useState<'web' | 'mobile'>('mobile');

  // Pending action ref to return user to what they were doing after sign in
  const pendingActionRef = useRef<(() => void) | null>(null);

  // Modals & Active Selections
  const [selectedBusiness, setSelectedBusiness] = useState<StudentBusiness | null>(null);
  const [activeTraderBusiness, setActiveTraderBusiness] = useState<StudentBusiness | null>(null);
  const [selectedSnap, setSelectedSnap] = useState<CampusSnap | null>(null);
  const [targetProfileUser, setTargetProfileUser] = useState<AppUser | null>(null);
  const [isCreateSnapOpen, setIsCreateSnapOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isCreateBusinessOpen, setIsCreateBusinessOpen] = useState(false);
  const [isBecomeTraderOpen, setIsBecomeTraderOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authRole, setAuthRole] = useState<UserRole>('student');

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Ecosystem Module
  const [currentModule, setCurrentModule] = useState<AppModule>('feed');

  // Academic Class Year Filter
  const [selectedLevel, setSelectedLevel] = useState<StudentLevel | 'All'>('All');

  // Marketplace State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('All');

  // Business Data State
  const [businesses, setBusinesses] = useState<StudentBusiness[]>([]);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(true);
  const [businessesError, setBusinessesError] = useState<string | null>(null);

  // Social Posts Data State
  const [posts, setPosts] = useState<CampusPost[]>([]);

  // Campus Snaps Data State
  const [snaps, setSnaps] = useState<CampusSnap[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenAuth = (action?: (() => void) | any, role: UserRole = 'student') => {
    if (typeof action === 'function') {
      pendingActionRef.current = action;
    }
    setAuthRole(role);
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = () => {
    showToast(`Welcome! You are now signed in to UNILORIN Campus Foundry.`);
    if (pendingActionRef.current) {
      const act = pendingActionRef.current;
      pendingActionRef.current = null;
      act();
    }
  };

  // Load real student_businesses from Supabase
  const loadBusinesses = useCallback(async () => {
    setIsLoadingBusinesses(true);
    setBusinessesError(null);
    try {
      const remote = await fetchStudentBusinessesFromSupabase();
      setBusinesses(remote);
      try {
        localStorage.setItem(STORAGE_BUSINESSES_KEY, JSON.stringify(remote));
      } catch {}
    } catch (err: any) {
      console.warn('[Supabase loadBusinesses Error]:', err);
      setBusinessesError('Unable to load campus traders. Please check your connection and try again.');
    } finally {
      setIsLoadingBusinesses(false);
    }
  }, []);

  // Hooks
  useEffect(() => {
    const handleCampusToast = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.message) {
        showToast(detail.message);
      }
    };
    window.addEventListener('campus-toast', handleCampusToast);
    return () => window.removeEventListener('campus-toast', handleCampusToast);
  }, []);

  useEffect(() => {
    const HAS_RESET_LAUNCH_KEY = 'campus_foundry_system_reset_v1';
    if (!localStorage.getItem(HAS_RESET_LAUNCH_KEY)) {
      resetDatabaseToZero().then(() => {
        localStorage.setItem(HAS_RESET_LAUNCH_KEY, 'true');
        loadBusinesses();
      });
    } else {
      loadBusinesses();
    }
  }, [loadBusinesses]);

  // Synchronize social posts & snaps data from Supabase backend
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;

    async function syncSupabaseData() {
      try {
        await Promise.all([
          deletePostsByUserInSupabase('adeyiink7'),
          deletePostsByUserInSupabase('adeyink7'),
        ]);

        const [remotePosts, remoteSnaps] = await Promise.all([
          fetchCampusPostsFromSupabase(),
          fetchCampusSnapsFromSupabase(),
        ]);

        if (!isMounted) return;

        const filteredPosts = (remotePosts || []).filter((p) => {
          const user = (p.authorUsername || '').toLowerCase();
          const name = (p.authorName || '').toLowerCase();
          const id = (p.authorId || '').toLowerCase();
          return !user.includes('adeyiink7') && !user.includes('adeyink7') &&
                 !name.includes('adeyiink7') && !name.includes('adeyink7') &&
                 !id.includes('adeyiink7') && !id.includes('adeyink7');
        });

        setPosts(filteredPosts);
        try {
          localStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(filteredPosts));
        } catch {}

        setSnaps(remoteSnaps || []);
        try {
          localStorage.setItem(STORAGE_SNAPS_KEY, JSON.stringify(remoteSnaps || []));
        } catch {}
      } catch (err) {
        console.warn('[Supabase Sync] Background data load warning:', err);
      }
    }

    syncSupabaseData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleNextSnap = useCallback(() => {
    setSelectedSnap((current) => {
      if (!current) return null;
      const currentIndex = snaps.findIndex((s) => s.id === current.id);
      if (currentIndex >= 0 && currentIndex < snaps.length - 1) {
        return snaps[currentIndex + 1];
      }
      return null;
    });
  }, [snaps]);

  const handlePrevSnap = useCallback(() => {
    setSelectedSnap((current) => {
      if (!current) return null;
      const currentIndex = snaps.findIndex((s) => s.id === current.id);
      if (currentIndex > 0) {
        return snaps[currentIndex - 1];
      }
      return current;
    });
  }, [snaps]);

  const userOwnedBusinesses = useMemo(() => {
    if (!currentUser) return [];
    return businesses.filter(
      (b) => b.ownerId === currentUser.id || (b.ownerEmail && currentUser.email && b.ownerEmail.toLowerCase() === currentUser.email.toLowerCase())
    );
  }, [businesses, currentUser]);



  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-neutral-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <span className="text-xs text-neutral-400 font-medium">Loading UNILORIN Campus Foundry...</span>
        </div>
      </div>
    );
  }

  // Signed-out users see a welcome screen with sign-in.
  if (!currentUser) {
    return (
      <>
        <WelcomeLandingScreen onOpenAuth={() => handleOpenAuth()} />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          defaultRole={authRole}
          onSuccess={handleAuthSuccess}
        />
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-neutral-900/95 px-5 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        )}
      </>
    );
  }

  const handleViewUserProfile = (authorId?: string, authorDetails?: any) => {
    if (currentUser && authorId === currentUser.id) {
      setTargetProfileUser(currentUser);
      setCurrentModule('dashboard');
      return;
    }

    const resolvedUser: AppUser = {
      id: authorId || `user_${Date.now()}`,
      email: `${authorDetails?.username?.replace('@', '') || 'student'}@unilorin.edu.ng`,
      fullName: authorDetails?.fullName || 'Campus Student',
      username: authorDetails?.username || `@student_${authorId?.slice(0, 5) || 'unilorin'}`,
      role: 'student',
      avatarUrl: authorDetails?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
      bio: 'UNILORIN undergraduate building solutions, collaborating on research, and running campus initiatives.',
      level: authorDetails?.level || '300L',
      department: authorDetails?.department || 'Computer Science',
      faculty: authorDetails?.faculty || 'Communication & Information Sciences',
      hostelLocation: 'Zamfara Hostel Block B',
      followersCount: 142,
      followingCount: 88,
    };

    setTargetProfileUser(resolvedUser);
    setCurrentModule('dashboard');
  };

  // Guarded Create Business Action
  const handleOpenCreateBusiness = () => {
    if (currentUser.accountType !== 'TRADER' && currentUser.role !== 'trader') {
      setIsBecomeTraderOpen(true);
      return;
    }
    setIsCreateBusinessOpen(true);
  };

  const handleBusinessCreated = (newBiz: StudentBusiness) => {
    setBusinesses((prev) => {
      const updated = [newBiz, ...prev];
      try {
        localStorage.setItem(STORAGE_BUSINESSES_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    upsertStudentBusinessInSupabase(newBiz);
    showToast(`"${newBiz.name}" is now listed on the UNILORIN Campus Marketplace!`);
    setCurrentModule('marketplace');
    setSelectedBusiness(newBiz);
  };

  const handleBusinessUpdated = (updatedBiz: StudentBusiness) => {
    setBusinesses((prev) => {
      const updated = prev.map((b) => (b.id === updatedBiz.id ? updatedBiz : b));
      try {
        localStorage.setItem(STORAGE_BUSINESSES_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    upsertStudentBusinessInSupabase(updatedBiz);
    setActiveTraderBusiness(updatedBiz);
    showToast(`"${updatedBiz.name}" portfolio & catalog updated successfully!`);
  };

  const handleDeleteBusiness = (bizId: string) => {
    setBusinesses((prev) => {
      const updated = prev.filter((b) => b.id !== bizId);
      try {
        localStorage.setItem(STORAGE_BUSINESSES_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    deleteStudentBusinessInSupabase(bizId);
    showToast('Trade listing deleted successfully.');
  };

  const handleClaimBusiness = (bizId: string) => {
    setBusinesses((prev) => {
      const updated = prev.map((b) => {
        if (b.id === bizId) {
          const claimedBiz = {
            ...b,
            ownerId: currentUser.id,
            ownerEmail: currentUser.email.toLowerCase().trim(),
            ownerName: currentUser.fullName || b.ownerName,
          };
          upsertStudentBusinessInSupabase(claimedBiz);
          return claimedBiz;
        }
        return b;
      });
      try {
        localStorage.setItem(STORAGE_BUSINESSES_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast('Trade successfully linked to your verified account!');
  };

  const handleLikeToggle = (postId: string) => {
    setPosts((prev) => {
      const updated = prev.map((p) => {
        if (p.id === postId) {
          const nextState = !p.likedByMe;
          const newLikesCount = nextState ? p.likesCount + 1 : Math.max(0, p.likesCount - 1);
          toggleCampusPostLikeInSupabase(postId, newLikesCount);
          return {
            ...p,
            likedByMe: nextState,
            likesCount: newLikesCount,
          };
        }
        return p;
      });
      try {
        localStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleAddComment = (postId: string, commentText: string) => {
    const newComment = {
      id: `c_${Date.now()}`,
      postId,
      authorId: currentUser.id,
      authorName: currentUser.fullName || 'Student',
      authorAvatar: currentUser.avatarUrl,
      authorLevel: currentUser.level || '300L',
      authorDept: currentUser.department || 'Student',
      text: commentText,
      createdAt: new Date().toISOString(),
    };

    setPosts((prev) => {
      const updated = prev.map((p) => {
        if (p.id === postId) {
          const existingComments = p.comments || [];
          return {
            ...p,
            comments: [newComment, ...existingComments],
            commentsCount: p.commentsCount + 1,
          };
        }
        return p;
      });
      try {
        localStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    addCampusCommentInSupabase(newComment);
    showToast('Comment published.');
  };

  const handlePostCreated = async (newPost: CampusPost) => {
    try {
      const saved = await createCampusPostInSupabase(newPost);
      
      const remotePosts = await fetchCampusPostsFromSupabase();
      if (remotePosts && remotePosts.length > 0) {
        setPosts(remotePosts);
        try {
          localStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(remotePosts));
        } catch {}
      } else {
        setPosts((prev) => {
          const updated = [saved, ...prev.filter((p) => p.id !== saved.id)];
          try {
            localStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }

      showToast('Your post is live on the UNILORIN Campus Feed!');
    } catch (err: any) {
      console.error('[handlePostCreated Failure]:', err);
      throw err;
    }
  };

  const handleDeletePost = (postId: string) => {
    setPosts((prev) => {
      const updated = prev.filter((p) => p.id !== postId);
      try {
        localStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    deleteCampusPostInSupabase(postId);
    showToast('Post deleted successfully.');
  };

  const handleSnapCreated = async (newSnap: CampusSnap) => {
    try {
      const saved = await createCampusSnapInSupabase(newSnap);
      
      const remoteSnaps = await fetchCampusSnapsFromSupabase();
      if (remoteSnaps && remoteSnaps.length > 0) {
        setSnaps(remoteSnaps);
        try {
          localStorage.setItem(STORAGE_SNAPS_KEY, JSON.stringify(remoteSnaps));
        } catch {}
      } else {
        setSnaps((prev) => {
          const updated = [saved, ...prev.filter((s) => s.id !== saved.id)];
          try {
            localStorage.setItem(STORAGE_SNAPS_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }

      showToast('Campus Snap published for 24 hours!');
    } catch (err: any) {
      console.error('[handleSnapCreated Failure]:', err);
      throw err;
    }
  };



  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans relative">
      {viewMode === 'mobile' ? (
        <RootNavigator
          businesses={businesses}
          posts={posts}
          snaps={snaps}
          selectedLevel={selectedLevel}
          onSelectLevel={setSelectedLevel}
          onLikeToggle={handleLikeToggle}
          onAddComment={handleAddComment}
          onDeletePost={handleDeletePost}
          onSelectSnap={(snap) => setSelectedSnap(snap)}
          onOpenCreateSnap={() => setIsCreateSnapOpen(true)}
          onOpenCreatePost={() => setIsCreatePostOpen(true)}
          onSelectBusiness={(biz) => setSelectedBusiness(biz)}
          onOpenCreateBusiness={handleOpenCreateBusiness}
          onOpenBecomeTrader={() => setIsBecomeTraderOpen(true)}
          onClaimBusiness={handleClaimBusiness}
          onDeleteBusiness={handleDeleteBusiness}
          onUpdateBusiness={handleBusinessUpdated}
          onOpenTraderProfile={(biz) => {
            setActiveTraderBusiness(biz);
            setSelectedBusiness(biz);
          }}
          onOpenAuth={handleOpenAuth}
          showToast={showToast}
          onSwitchToWeb={() => setViewMode('web')}
          onViewUserProfile={handleViewUserProfile}
          isLoadingBusinesses={isLoadingBusinesses}
          businessesError={businessesError}
          onRetryBusinesses={loadBusinesses}
        />
      ) : (
        <>
          <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-amber-400 border border-amber-500/40 text-xs font-bold shadow-2xl backdrop-blur-md transition-all hover:scale-105"
            >
              <span>📱</span>
              <span className="hidden xs:inline sm:inline">Switch to </span><span>Mobile View</span>
            </button>
          </div>
          
          <DynamicMotivationBanner
            currentModule={currentModule}
            onNavigateModule={(mod) => setCurrentModule(mod)}
          />

          <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1600px] mx-auto">
        
        <SidebarNav
          currentModule={currentModule}
          onSelectModule={(mod) => setCurrentModule(mod)}
          onOpenCreateBusiness={handleOpenCreateBusiness}
          onOpenCreatePost={() => setIsCreatePostOpen(true)}
          onOpenBecomeTrader={() => setIsBecomeTraderOpen(true)}
          onOpenAuth={handleOpenAuth}
        />

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentModule}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {currentModule === 'feed' && (
                <CampusFeedView
                  posts={posts}
                  snaps={snaps}
                  businesses={businesses}
                  selectedLevel={selectedLevel}
                  onLikeToggle={handleLikeToggle}
                  onAddComment={handleAddComment}
                  onSelectSnap={(snap) => setSelectedSnap(snap)}
                  onOpenCreateSnap={() => setIsCreateSnapOpen(true)}
                  onOpenCreatePost={() => setIsCreatePostOpen(true)}
                  onSelectBusiness={(biz) => setSelectedBusiness(biz)}
                  onNavigateModule={(mod) => setCurrentModule(mod)}
                  onOpenAuthorProfile={handleViewUserProfile}
                  onDeletePost={handleDeletePost}
                />
              )}

              {currentModule === 'marketplace' && (
                <MarketplaceView
                  businesses={businesses}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  selectedCampus={selectedCampus}
                  onSelectCampus={setSelectedCampus}
                  onSelectBusiness={setSelectedBusiness}
                  onOpenCreateBusiness={handleOpenCreateBusiness}
                  onOpenBecomeTrader={() => setIsBecomeTraderOpen(true)}
                  onApplyBlueprint={() => handleOpenCreateBusiness()}
                  onOpenAuth={handleOpenAuth}
                  activeTraderBusiness={activeTraderBusiness}
                  onOpenTraderProfile={(biz) => setActiveTraderBusiness(biz)}
                  onClearTraderBusiness={() => setActiveTraderBusiness(null)}
                  onUpdateBusiness={handleBusinessUpdated}
                  isLoadingBusinesses={isLoadingBusinesses}
                  businessesError={businessesError}
                  onRetryBusinesses={loadBusinesses}
                />
              )}

              {currentModule === 'politics' && (
                <PoliticsCampaignView
                  onRequireAuth={() => handleOpenAuth()}
                />
              )}

              {currentModule === 'academics' && (
                <FacultiesDeptsView
                  selectedLevel={selectedLevel}
                  onSelectLevel={setSelectedLevel}
                  onShowToast={showToast}
                />
              )}

              {currentModule === 'clubs' && (
                <ClubsDirectoryView
                  onRequireAuth={() => handleOpenAuth()}
                  onShowToast={showToast}
                />
              )}

              {currentModule === 'news' && (
                <CampusNewsView
                  onShowToast={showToast}
                />
              )}

              {currentModule === 'map' && (
                <CampusMapView />
              )}

              {currentModule === 'dashboard' && (
                <StudentDashboard
                  businesses={businesses}
                  posts={posts}
                  targetUser={targetProfileUser}
                  onClearTargetUser={() => setTargetProfileUser(null)}
                  onOpenAuth={handleOpenAuth}
                  onOpenCreateBusiness={handleOpenCreateBusiness}
                  onSelectBusiness={setSelectedBusiness}
                  onOpenTraderProfile={(biz) => {
                    setActiveTraderBusiness(biz);
                    setCurrentModule('marketplace');
                  }}
                  onClaimBusiness={handleClaimBusiness}
                  onDeleteBusiness={handleDeleteBusiness}
                  onDeletePost={handleDeletePost}
                  onOpenBecomeTrader={() => setIsBecomeTraderOpen(true)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <RightUtilitiesPanel
          selectedLevel={selectedLevel}
          onSelectLevel={setSelectedLevel}
          onNavigateModule={(mod) => setCurrentModule(mod)}
        />

      </div>
    </>
  )}

      <SnapViewerModal
        snap={selectedSnap}
        snapsList={snaps}
        onClose={() => setSelectedSnap(null)}
        onNextSnap={handleNextSnap}
        onPrevSnap={handlePrevSnap}
        onOpenAuthorProfile={handleViewUserProfile}
      />

      <CreateSnapModal
        isOpen={isCreateSnapOpen}
        onClose={() => setIsCreateSnapOpen(false)}
        onSnapCreated={handleSnapCreated}
        onRequireAuth={() => handleOpenAuth()}
      />

      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={handlePostCreated}
        onRequireAuth={() => handleOpenAuth()}
        userBusinesses={userOwnedBusinesses}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultRole={authRole}
        onSuccess={handleAuthSuccess}
      />

      {selectedBusiness && (
        <BusinessDetailModal
          business={selectedBusiness}
          onClose={() => setSelectedBusiness(null)}
          onOpenTraderProfile={(biz) => {
            setSelectedBusiness(null);
            setActiveTraderBusiness(biz);
            setCurrentModule('marketplace');
          }}
        />
      )}

      <BecomeTraderModal
        isOpen={isBecomeTraderOpen}
        onClose={() => setIsBecomeTraderOpen(false)}
        onElevated={(newBiz) => {
          handleBusinessCreated(newBiz);
          showToast(`🎉 Congratulations! Your account has been elevated to a Verified Trader.`);
        }}
        onRequireAuth={() => handleOpenAuth()}
      />

      <CreateBusinessModal
        isOpen={isCreateBusinessOpen}
        onClose={() => setIsCreateBusinessOpen(false)}
        onBusinessCreated={handleBusinessCreated}
        onRequireAuth={() => handleOpenAuth(undefined, 'trader')}
      />

      <ChatDrawer />
      <MarketplaceChatDrawer />
      <CartDrawer onOpenAuth={() => handleOpenAuth()} />
      <PlayerCardOverlay onOpenProfile={handleViewUserProfile} />
      <PlayerCardEditorModal />

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-neutral-900/95 px-5 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <MarketplaceChatProvider>
          <CartProvider>
            <PlayerCardProvider>
              <MainApp />
            </PlayerCardProvider>
          </CartProvider>
        </MarketplaceChatProvider>
      </ChatProvider>
    </AuthProvider>
  );
}
