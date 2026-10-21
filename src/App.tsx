import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { CartProvider } from './context/CartContext';
import { RootNavigator } from './mobile/navigation/RootNavigator';

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
import { CartDrawer } from './components/CartDrawer';
import { SnapViewerModal } from './components/SnapViewerModal';
import { CreateSnapModal } from './components/CreateSnapModal';
import { CreatePostModal } from './components/CreatePostModal';

// Mock Data & Types
import { INITIAL_BUSINESSES } from './data/mockData';
import { INITIAL_CAMPUS_POSTS, INITIAL_CAMPUS_SNAPS } from './data/socialMockData';
import { 
  AppModule, 
  StudentLevel, 
  StudentBusiness, 
  CampusPost, 
  CampusSnap, 
  BusinessBlueprint, 
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
} from './services/supabase';

const STORAGE_BUSINESSES_KEY = 'campus_foundry_custom_businesses_v4';
const STORAGE_POSTS_KEY = 'campus_foundry_posts_v4';
const STORAGE_SNAPS_KEY = 'campus_foundry_snaps_v4';

function MainApp() {
  const { currentUser } = useAuth();
  const [viewMode, setViewMode] = useState<'web' | 'mobile'>('mobile');

  // Active Ecosystem Module ('feed', 'marketplace', 'politics', 'academics', 'clubs', 'news', 'map', 'dashboard')
  const [currentModule, setCurrentModule] = useState<AppModule>('feed');

  // Academic Class Year Filter ('All', '100L', '200L', '300L', '400L', '500L')
  const [selectedLevel, setSelectedLevel] = useState<StudentLevel | 'All'>('All');

  // Marketplace State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('All');

  // Business Data State
  const [businesses, setBusinesses] = useState<StudentBusiness[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_BUSINESSES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading businesses from storage:', e);
    }
    return INITIAL_BUSINESSES;
  });

  // Social Posts Data State
  const [posts, setPosts] = useState<CampusPost[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_POSTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_CAMPUS_POSTS;
  });

  // Campus Snaps Data State
  const [snaps, setSnaps] = useState<CampusSnap[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SNAPS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_CAMPUS_SNAPS;
  });

  // Synchronize data from Supabase backend on mount
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;

    async function syncSupabaseData() {
      try {
        const [remotePosts, remoteBusinesses, remoteSnaps] = await Promise.all([
          fetchCampusPostsFromSupabase(),
          fetchStudentBusinessesFromSupabase(),
          fetchCampusSnapsFromSupabase(),
        ]);

        if (!isMounted) return;

        if (remotePosts.length > 0) {
          setPosts(remotePosts);
          try {
            localStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(remotePosts));
          } catch {}
        }

        if (remoteBusinesses.length > 0) {
          setBusinesses(remoteBusinesses);
          try {
            localStorage.setItem(STORAGE_BUSINESSES_KEY, JSON.stringify(remoteBusinesses));
          } catch {}
        }

        if (remoteSnaps.length > 0) {
          setSnaps(remoteSnaps);
          try {
            localStorage.setItem(STORAGE_SNAPS_KEY, JSON.stringify(remoteSnaps));
          } catch {}
        }
      } catch (err) {
        console.warn('[Supabase Sync] Background data load warning:', err);
      }
    }

    syncSupabaseData();

    return () => {
      isMounted = false;
    };
  }, []);

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
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'unilorin-otp'>('unilorin-otp');
  const [authRole, setAuthRole] = useState<UserRole>('student');

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

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAuth = (mode: 'signin' | 'signup' | 'unilorin-otp' = 'unilorin-otp', role: UserRole = 'student') => {
    setAuthMode(mode);
    setAuthRole(role);
    setIsAuthOpen(true);
  };

  // Guarded Create Business Action
  const handleOpenCreateBusiness = () => {
    if (!currentUser) {
      showToast('Please sign in or create a verified trader account to list and manage your trade.');
      handleOpenAuth('signup', 'trader');
      return;
    }
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
    if (!currentUser) return;
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

  // Social Post Actions
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
    if (!currentUser) {
      showToast('Please sign in to comment on campus posts.');
      handleOpenAuth('signin');
      return;
    }

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

  const handlePostCreated = (newPost: CampusPost) => {
    setPosts((prev) => {
      const updated = [newPost, ...prev];
      try {
        localStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    createCampusPostInSupabase(newPost);
    showToast('Your post is live on the UNILORIN Campus Feed!');
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

  // Campus Snap Actions
  const handleSnapCreated = (newSnap: CampusSnap) => {
    setSnaps((prev) => {
      const updated = [newSnap, ...prev];
      try {
        localStorage.setItem(STORAGE_SNAPS_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    createCampusSnapInSupabase(newSnap);
    showToast('Campus Snap published for 24 hours!');
  };

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

  // Current user's businesses for tagging
  const userOwnedBusinesses = useMemo(() => {
    if (!currentUser) return [];
    return businesses.filter(
      (b) => b.ownerId === currentUser.id || (b.ownerEmail && currentUser.email && b.ownerEmail.toLowerCase() === currentUser.email.toLowerCase())
    );
  }, [businesses, currentUser]);

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
        />
      ) : (
        <>
          {/* Floating Toggle to switch to Mobile App View */}
          <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-amber-400 border border-amber-500/40 text-xs font-bold shadow-2xl backdrop-blur-md transition-all hover:scale-105"
            >
              <span>📱</span>
              <span className="hidden xs:inline sm:inline">Switch to </span><span>Mobile App (Expo)</span>
            </button>
          </div>
          
          {/* 1. TOP DYNAMIC OVERHEAD MOTIVATIONAL BANNER WITH GESTURES & BACKDROP */}
          <DynamicMotivationBanner
            currentModule={currentModule}
            onNavigateModule={(mod) => setCurrentModule(mod)}
          />

          {/* 2. MAIN THREE-PANEL ECOSYSTEM LAYOUT */}
          <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1600px] mx-auto">
        
        {/* LEFT COLLAPSIBLE NAVIGATION SIDE PANEL */}
        <SidebarNav
          currentModule={currentModule}
          onSelectModule={(mod) => setCurrentModule(mod)}
          onOpenCreateBusiness={handleOpenCreateBusiness}
          onOpenCreatePost={() => setIsCreatePostOpen(true)}
          onOpenBecomeTrader={() => setIsBecomeTraderOpen(true)}
          onOpenAuth={handleOpenAuth}
        />

        {/* CENTER DYNAMIC MAIN CONTENT VIEW */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentModule}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {/* Module 1: Main Campus Feed */}
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

              {/* Module 2: Campus Marketplace & Student Ventures */}
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
                />
              )}

              {/* Module 3: Student Politics & SUG Hub */}
              {currentModule === 'politics' && (
                <PoliticsCampaignView
                  onRequireAuth={() => handleOpenAuth('signin')}
                />
              )}

              {/* Module 4: Faculties & Departmental Resources */}
              {currentModule === 'academics' && (
                <FacultiesDeptsView
                  selectedLevel={selectedLevel}
                  onSelectLevel={setSelectedLevel}
                  onShowToast={showToast}
                />
              )}

              {/* Module 5: Campus Clubs & Student Organizations */}
              {currentModule === 'clubs' && (
                <ClubsDirectoryView
                  onRequireAuth={() => handleOpenAuth('signin')}
                  onShowToast={showToast}
                />
              )}

              {/* Module 6: Verified Campus News Bulletins */}
              {currentModule === 'news' && (
                <CampusNewsView
                  onShowToast={showToast}
                />
              )}

              {/* Module 7: Interactive UNILORIN Map & Transit Guide */}
              {currentModule === 'map' && (
                <CampusMapView />
              )}

              {/* Module 8: Personal Student Profile & Venture Dashboard */}
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

        {/* RIGHT CONTEXTUAL PANEL: CAMPUS UTILITIES, TRANSIT & QUICK FILTERS */}
        <RightUtilitiesPanel
          selectedLevel={selectedLevel}
          onSelectLevel={setSelectedLevel}
          onNavigateModule={(mod) => setCurrentModule(mod)}
        />

      </div>
    </>
  )}

  {/* MODALS & OVERLAYS */}
      
      {/* 24h Snap Viewer */}
      <SnapViewerModal
        snap={selectedSnap}
        snapsList={snaps}
        onClose={() => setSelectedSnap(null)}
        onNextSnap={handleNextSnap}
        onPrevSnap={handlePrevSnap}
        onOpenAuthorProfile={handleViewUserProfile}
      />

      {/* Post Snap Modal with Live Camera & Upload */}
      <CreateSnapModal
        isOpen={isCreateSnapOpen}
        onClose={() => setIsCreateSnapOpen(false)}
        onSnapCreated={handleSnapCreated}
        onRequireAuth={() => handleOpenAuth('signin')}
      />

      {/* Create Campus Post Modal with Camera, Upload & Privacy Restrict */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={handlePostCreated}
        onRequireAuth={() => handleOpenAuth('signin')}
        userBusinesses={userOwnedBusinesses}
      />

      {/* User Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
        defaultRole={authRole}
        onSuccess={() => {
          showToast(`Welcome! You are now signed in to UNILORIN Campus Foundry.`);
          if (authRole === 'trader') {
            setIsBecomeTraderOpen(true);
          }
        }}
      />

      {/* Store & Venture Detail Modal */}
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

      {/* "Become a Verified Trader" Elevation Modal */}
      <BecomeTraderModal
        isOpen={isBecomeTraderOpen}
        onClose={() => setIsBecomeTraderOpen(false)}
        onElevated={(newBiz) => {
          handleBusinessCreated(newBiz);
          showToast(`🎉 Congratulations! Your account has been elevated to a Verified Trader.`);
        }}
        onRequireAuth={() => handleOpenAuth('signin')}
      />

      {/* Create Trade Modal */}
      <CreateBusinessModal
        isOpen={isCreateBusinessOpen}
        onClose={() => setIsCreateBusinessOpen(false)}
        onBusinessCreated={handleBusinessCreated}
        onRequireAuth={() => handleOpenAuth('signup', 'trader')}
      />

      {/* In-App Trader Chat Drawer */}
      <ChatDrawer />

      {/* Shopping Cart Drawer */}
      <CartDrawer />

      {/* Global Toast Notification */}
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
        <CartProvider>
          <MainApp />
        </CartProvider>
      </ChatProvider>
    </AuthProvider>
  );
}
