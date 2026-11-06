/**
 * CampusFoundry Mobile - Root Navigation Architecture
 * Cross-platform stack and tab navigator for Expo / React Native Web.
 * Fully integrates 100% of CampusFoundry web features:
 * - 📰 Campus Feed (Live posts, reactions, comments, 24h stories tray, level filters)
 * - 🛍️ Marketplace & Trades (Student businesses, search, campus zone filters, WhatsApp link, Add to Cart)
 * - 🏛️ Campus Life Hub (SUG Politics & Voting, Academics & Past Questions, Clubs & Tech Hubs, Campus News, Interactive Map)
 * - 💬 Real-Time Chats (E2EE chats, message requests, department broadcast channels, offline queue)
 * - 🎓 Student ID & Dashboard (Digital UNILORIN ID card, Biometrics Face ID/Touch ID, offline SQLite cache diagnostics, claimed trades)
 * - ⚡ Quick Action FAB & Mobile Action Sheet
 * - 📱 Device Frame Toggle (Phone Frame vs Edge-to-Edge Fullscreen vs Web view)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { fetchUserProfileByIdFromSupabase } from '../../services/supabase';
import { 
  Sparkles, 
  Plus, 
  Search, 
  Filter, 
  ShoppingBag, 
  MessageSquare, 
  User, 
  Bell, 
  ChevronRight, 
  ShieldCheck, 
  Heart, 
  Share2, 
  MapPin, 
  CheckCircle2, 
  Phone, 
  ExternalLink, 
  RefreshCw, 
  Laptop, 
  Lock, 
  X, 
  PlusCircle, 
  ArrowLeft, 
  Send, 
  BookOpen, 
  Vote, 
  Users, 
  Newspaper, 
  Compass, 
  Trash2, 
  Shield, 
  Fingerprint,
  Store,
  Camera,
  Layers,
  ArrowRight,
  TrendingUp,
  Award,
  AlertCircle,
  Home,
  Building2
} from 'lucide-react';

import { 
  CampusPost, 
  CampusSnap, 
  StudentBusiness, 
  StudentLevel, 
  AppModule, 
  UserRole, 
  AppUser 
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useChat } from '../../context/ChatContext';
import { useMarketplaceChat } from '../../context/MarketplaceChatContext';
import { CURRENT_ACADEMIC_SESSION } from '../../constants/academic';
import { StudentIDCard } from '../../components/playercard';
import { UserProfileView } from '../../components/UserProfileView';

import { StoriesViewerScreen, MobileStoryItem } from '../screens/StoriesViewerScreen';
import { RealTimeChatScreen } from '../screens/RealTimeChatScreen';
import { BiometricsService } from '../auth/BiometricsService';
import GlobalSearchModal from '../../components/GlobalSearchModal';
import PeopleDiscoveryModal from '../../components/PeopleDiscoveryModal';

// Web feature views integrated directly into mobile tabs
import { PoliticsCampaignView } from '../../components/PoliticsCampaignView';
import { FacultiesDeptsView } from '../../components/FacultiesDeptsView';
import { ClubsDirectoryView } from '../../components/ClubsDirectoryView';
import { CampusNewsView } from '../../components/CampusNewsView';
import { CampusMapView } from '../../components/CampusMapView';
import { PostCard } from '../../components/PostCard';
import { BusinessCard } from '../../components/BusinessCard';
import { MyStoreModal } from '../../components/MyStoreModal';

export type MobileTab = 'feed' | 'market' | 'campus' | 'chats' | 'profile';
export type CampusSubHub = 'politics' | 'academics' | 'clubs' | 'news' | 'map' | 'idcard' | null;

export interface RootNavigatorProps {
  businesses?: StudentBusiness[];
  posts?: CampusPost[];
  snaps?: CampusSnap[];
  selectedLevel?: StudentLevel | 'All';
  onSelectLevel?: (lvl: StudentLevel | 'All') => void;
  onLikeToggle?: (postId: string) => void;
  onAddComment?: (postId: string, commentText: string) => void;
  onDeletePost?: (postId: string) => void;
  onSelectSnap?: (snap: CampusSnap) => void;
  onOpenCreateSnap?: () => void;
  onOpenCreatePost?: () => void;
  onSelectBusiness?: (business: StudentBusiness) => void;
  onOpenCreateBusiness?: () => void;
  onOpenBecomeTrader?: () => void;
  onClaimBusiness?: (bizId: string) => void;
  onDeleteBusiness?: (bizId: string) => void;
  onUpdateBusiness?: (updated: StudentBusiness) => void;
  onOpenTraderProfile?: (business: StudentBusiness) => void;
  onOpenAuth?: (mode?: 'signin' | 'signup' | 'unilorin-otp', role?: UserRole) => void;
  showToast?: (msg: string) => void;
  onSwitchToWeb?: () => void;
  onViewUserProfile?: (authorId?: string, authorDetails?: any) => void;
  targetProfileUser?: AppUser | null;
  onClearTargetUser?: () => void;
  isLoadingBusinesses?: boolean;
  businessesError?: string | null;
  onRetryBusinesses?: () => void;
  onOpenAdminPages?: () => void;
}

export const RootNavigator: React.FC<RootNavigatorProps> = ({
  businesses = [],
  posts = [],
  snaps = [],
  selectedLevel = 'All',
  onSelectLevel = () => {},
  onLikeToggle = () => {},
  onAddComment = () => {},
  onDeletePost,
  onSelectSnap = () => {},
  onOpenCreateSnap = () => {},
  onOpenCreatePost = () => {},
  onSelectBusiness = () => {},
  onOpenCreateBusiness = () => {},
  onOpenBecomeTrader,
  onClaimBusiness,
  onDeleteBusiness,
  onUpdateBusiness,
  onOpenTraderProfile,
  onOpenAuth = () => {},
  showToast = () => {},
  onSwitchToWeb,
  onViewUserProfile,
  targetProfileUser = null,
  onClearTargetUser,
  isLoadingBusinesses = false,
  businessesError = null,
  onRetryBusinesses,
  onOpenAdminPages,
}) => {
  const { currentUser, signOut, toggleFollowUser } = useAuth();
  const { totalItemCount, setIsCartOpen } = useCart();
  const { unreadTotalCount, pendingRequestsCount, conversations, openChatWithBusiness } = useChat();
  const { conversations: marketplaceConversations, openMarketplaceChat } = useMarketplaceChat();

  // Navigation State
  const [activeTab, setActiveTab] = useState<MobileTab>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/profile/')) {
      return 'profile';
    }
    return 'feed';
  });
  const [viewingProfileUser, setViewingProfileUser] = useState<AppUser | null>(null);
  const [activeCampusSubHub, setActiveCampusSubHub] = useState<CampusSubHub | null>(null);

  const activeProfileUser = targetProfileUser || viewingProfileUser || currentUser;

  useEffect(() => {
    if (targetProfileUser) {
      setActiveTab('profile');
    }
  }, [targetProfileUser]);

  // Listen for /profile/:id route changes
  useEffect(() => {
    const handleRoute = () => {
      if (typeof window === 'undefined') return;
      const path = window.location.pathname;
      const match = path.match(/^\/profile\/([^/]+)/);
      if (match) {
        const userId = match[1];
        console.log('Navigated to:', path);
        setActiveTab('profile');
        if (currentUser && currentUser.id === userId) {
          setViewingProfileUser(currentUser);
        } else {
          fetchUserProfileByIdFromSupabase(userId).then((profile) => {
            if (profile) {
              setViewingProfileUser(profile);
            }
          });
        }
      }
    };

    handleRoute();
    window.addEventListener('popstate', handleRoute);
    return () => window.removeEventListener('popstate', handleRoute);
  }, [currentUser]);


  // Quick Action Sheet state (center '+' FAB)
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  // My Store modal state
  const [selectedMyStore, setSelectedMyStore] = useState<StudentBusiness | null>(null);

  // Search & Filters in Marketplace
  const [marketSearch, setMarketSearch] = useState('');
  const [marketCategory, setMarketCategory] = useState<string>('All');
  const [marketCampus, setMarketCampus] = useState<string>('All');
  const [isZoneFilterSheetOpen, setIsZoneFilterSheetOpen] = useState(false);

  // Global Search & People Discovery modals
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [initialSearchTab, setInitialSearchTab] = useState<'people' | 'groups' | 'pages' | 'products' | 'posts'>('posts');
  const [isPeopleDiscoveryOpen, setIsPeopleDiscoveryOpen] = useState(false);

  // Feed Category Filter
  const [feedCategory, setFeedCategory] = useState<string>('All Buzz');

  // Active Story Viewer State (WhatsApp/IG format)
  const [activeStoryData, setActiveStoryData] = useState<{
    author: {
      userId: string;
      username: string;
      fullName?: string;
      avatarUrl: string;
      department?: string;
    };
    stories: MobileStoryItem[];
  } | null>(null);

  // Active Real-Time Chat Screen state
  const [activeChatTarget, setActiveChatTarget] = useState<{
    chatType: 'direct' | 'group' | 'channel';
    recipient: {
      id: string;
      name: string;
      handle: string;
      avatarUrl: string;
      isVerifiedStudent?: boolean;
      department?: string;
      online?: boolean;
      isAcceptedContact?: boolean;
    };
  } | null>(null);

  // Chat Filter (Primary Messages vs Instagram-style Message Requests)
  const [chatFilter, setChatFilter] = useState<'all' | 'requests'>('all');

  // Biometrics toggle state
  const [isBiometricsActive, setIsBiometricsActive] = useState(() => BiometricsService.isBiometricsEnabled());

  const handleToggleBiometrics = () => {
    const nextState = !isBiometricsActive;
    BiometricsService.setBiometricsEnabled(nextState, currentUser?.email);
    setIsBiometricsActive(nextState);
    showToast(
      nextState
        ? '✓ Native Biometrics (Face ID / Fingerprint) enabled on this device.'
        : 'Biometrics disabled.'
    );
  };

  // Filtered Marketplace businesses
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((biz) => {
      if (marketCategory !== 'All' && biz.category !== marketCategory) return false;
      if (marketCampus !== 'All' && biz.campus !== marketCampus && biz.hostelLocation !== marketCampus) return false;
      if (marketSearch.trim()) {
        const query = marketSearch.toLowerCase();
        const matchesName = biz.name.toLowerCase().includes(query);
        const matchesDesc = biz.description.toLowerCase().includes(query);
        const matchesLocation = biz.hostelLocation?.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesLocation) return false;
      }
      return true;
    });
  }, [businesses, marketCategory, marketCampus, marketSearch]);

  // Filtered Campus Posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (selectedLevel !== 'All' && post.authorLevel && post.authorLevel !== selectedLevel && post.authorLevel !== 'Postgraduate' && post.authorLevel !== 'Postgrad') {
        return false;
      }
      if (feedCategory === 'Academics & GNS' && post.category !== 'Academics & GNS') return false;
      if (feedCategory === 'Student Hustle & Trades' && post.category !== 'Student Hustle & Trades') return false;
      if (feedCategory === 'SUG & Elections' && post.category !== 'SUG & Elections') return false;
      if (feedCategory === 'Events & Sports' && post.category !== 'Events & Sports') return false;
      if (feedCategory === 'Campus Life' && post.category !== 'Campus Life & Hostels') return false;
      return true;
    });
  }, [posts, selectedLevel, feedCategory]);

  // User owned businesses for founder dashboard
  const userOwnedBusinesses = useMemo(() => {
    if (!currentUser) return [];
    return businesses.filter(
      (b) => b.ownerId === currentUser.id || (b.ownerEmail && currentUser.email && b.ownerEmail.toLowerCase() === currentUser.email.toLowerCase())
    );
  }, [businesses, currentUser]);

  // Categories list
  const MARKET_CATEGORIES = ['All', 'Food & Snacks', 'Tech & Gadgets', 'Fashion', 'Academics', 'Services', 'Grooming'];
  const CAMPUS_ZONES = ['All', 'Permanent Site (PS)', 'Sanrab', 'Tanke', 'Chapels/Mosque', 'Jalala', 'Mini Campus'];
  const FEED_CATEGORIES = ['All Buzz', 'Academics & GNS', 'Student Hustle & Trades', 'SUG & Elections', 'Events & Sports', 'Campus Life'];

  return (
    <div className="w-full min-h-screen h-[100dvh] bg-neutral-950 text-white flex flex-col select-none relative overflow-hidden">
      {/* Top App Header */}
      <header className="w-full bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800/80 z-20 shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-neutral-950 font-black flex items-center justify-center text-sm shadow-md shadow-amber-500/20">
              CF
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-white tracking-tight">CampusFoundry</h1>
              {currentUser?.university ? (
                <p className="text-[10px] text-neutral-400 font-medium truncate max-w-[160px]">
                  {currentUser.university}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSwitchToWeb && (
              <button
                type="button"
                onClick={onSwitchToWeb}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-semibold transition-colors"
                title="Switch to Web Dashboard"
              >
                <Laptop className="w-3.5 h-3.5 text-neutral-400" />
                <span>Web Dashboard</span>
              </button>
            )}
            {/* Cart Drawer Trigger with Badge */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
              title="Open Campus Cart"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              {totalItemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-neutral-950 text-[10px] font-black flex items-center justify-center shadow-md animate-bounce">
                  {totalItemCount}
                </span>
              )}
            </button>

            {/* Global Search Trigger */}
            <button
              type="button"
              onClick={() => {
                const defaultTab = activeTab === 'market' ? 'products' : activeTab === 'campus' ? 'groups' : 'posts';
                setInitialSearchTab(defaultTab);
                setIsGlobalSearchOpen(true);
              }}
              className="relative p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
              title="Global Search"
            >
              <Search className="w-4 h-4 text-amber-400" />
            </button>

            {/* In-App Direct Messages Trigger */}
            <button
              type="button"
              onClick={() => setActiveTab('chats')}
              className="relative p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
              title="Open Messages"
            >
              <MessageSquare className="w-4 h-4 text-sky-400" />
              {unreadTotalCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sky-500 text-neutral-950 text-[10px] font-black flex items-center justify-center shadow-md">
                  {unreadTotalCount}
                </span>
              )}
            </button>

            {/* Admin Pages Control (Mobile Header Trigger) */}
            {(currentUser?.isAdmin || currentUser?.staffRole === 'page_moderator' || currentUser?.staffRole === 'super_admin') && onOpenAdminPages && (
              <button
                type="button"
                onClick={onOpenAdminPages}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 transition-colors shadow-sm active:scale-95"
                title="Admin Pages Control"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-bold hidden xs:inline">Admin Pages</span>
              </button>
            )}

            {/* Profile Avatar / Sign In */}
            {currentUser ? (
              <button
                type="button"
                onClick={() => {
                  setViewingProfileUser(null);
                  onClearTargetUser?.();
                  setActiveTab('profile');
                  if (typeof window !== 'undefined') {
                    window.history.pushState({}, '', '/');
                  }
                }}
                className="w-8 h-8 rounded-full border-2 border-amber-500 overflow-hidden shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                title="Open My Profile"
              >
                <img 
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} 
                  alt={currentUser.fullName || 'User'} 
                  className="w-full h-full object-cover" 
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth('signin')}
                className="text-xs px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl shadow-md transition-all active:scale-95"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Stories / Status Bar (Shown on Feed Tab) */}
      {activeTab === 'feed' && (
        <div className="w-full bg-neutral-900/40 border-b border-neutral-800/80 shrink-0">
          <div className="max-w-4xl mx-auto py-2 px-4 overflow-x-auto no-scrollbar flex items-center gap-3">
            {/* Add 24h Snap Button */}
            <div
              className="flex flex-col items-center gap-1 cursor-pointer min-w-[62px]"
              onClick={onOpenCreateSnap}
            >
              <div className="relative w-14 h-14 rounded-full p-0.5 bg-neutral-800 border-2 border-dashed border-amber-500/70 flex items-center justify-center hover:scale-105 transition-transform">
                <img
                  src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt="My Status"
                  className="w-full h-full rounded-full object-cover opacity-80"
                />
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-amber-500 text-neutral-950 rounded-full flex items-center justify-center text-xs font-black shadow-md">
                  +
                </span>
              </div>
              <span className="text-[10px] text-neutral-300 font-medium truncate max-w-[60px]">Add Snap</span>
            </div>

            {/* Active Campus Snaps list */}
            {snaps.length === 0 ? (
              <div className="flex items-center text-[11px] text-neutral-500 italic px-2">
                Nothing here yet
              </div>
            ) : (
              snaps.map((snap) => (
                <div
                  key={snap.id}
                  className="flex flex-col items-center gap-1 cursor-pointer min-w-[62px] active:scale-95 transition-transform"
                  onClick={() => onSelectSnap(snap)}
                >
                  <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500 shadow-sm">
                    <img
                      src={snap.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={snap.authorName}
                      className="w-full h-full rounded-full object-cover border-2 border-neutral-950"
                    />
                  </div>
                  <span className="text-[10px] text-neutral-300 truncate max-w-[60px]">
                    {snap.authorUsername?.replace('@', '') || snap.authorName}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MAIN SCREEN BODY */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-neutral-950 pb-24 w-full">
        <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-3">
          
          {/* ========================================================== */}
          {/* TAB 1: 📰 CAMPUS FEED                                      */}
          {/* ========================================================== */}
          {activeTab === 'feed' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              
              {/* Single Row of Feed Category Filters */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {FEED_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFeedCategory(cat)}
                    className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
                      feedCategory === cat
                        ? 'bg-neutral-800 text-orange-400 border-orange-500/40 font-bold'
                        : 'bg-neutral-900/80 text-neutral-300 border-neutral-800 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Quick Post Prompt Card */}
              <div 
                onClick={onOpenCreatePost}
                className="p-3 bg-neutral-900/90 border border-neutral-800 rounded-2xl flex items-center justify-between cursor-pointer hover:border-amber-500/40 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400">
                    <Camera className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-xs text-neutral-400">Share campus updates, announcements or trade listing...</span>
                </div>
                <span className="text-xs font-bold text-amber-400 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  Post
                </span>
              </div>

              {/* Posts Stream */}
              {filteredPosts.length === 0 ? (
                <div className="text-center py-12 px-4 bg-neutral-900/50 rounded-2xl border border-neutral-800">
                  <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-white">Nothing here yet</h4>
                  <p className="text-xs text-neutral-400 mt-1 mb-4">Be the first student to drop an update or course gist!</p>
                  <button
                    type="button"
                    onClick={onOpenCreatePost}
                    className="px-4 py-2 bg-amber-500 text-neutral-950 font-bold rounded-xl text-xs"
                  >
                    + Create First Post
                  </button>
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLikeToggle={onLikeToggle}
                    onAddComment={onAddComment}
                    onSelectBusiness={onSelectBusiness}
                    onDeletePost={onDeletePost}
                    allBusinesses={businesses}
                    onOpenAuthorProfile={onViewUserProfile}
                    onRequireAuth={(action) => onOpenAuth('signin')}
                  />
                ))
              )}
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 2: 🛍️ MARKETPLACE & VENTURES                           */}
          {/* ========================================================== */}
          {activeTab === 'market' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              
              {/* Marketplace Header Banner */}
              <div className="p-3.5 bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-neutral-900 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-xs font-extrabold text-amber-300 truncate">
                    {currentUser?.university ? `${currentUser.university} Marketplace` : 'Campus Marketplace'}
                  </h3>
                  <p className="text-[10px] text-neutral-300 mt-0.5 line-clamp-1">
                    Order directly from verified student traders across Sanrab, Tanke & PS.
                  </p>
                </div>
                {userOwnedBusinesses.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSelectedMyStore(userOwnedBusinesses[0])}
                    className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-[10px] shadow-sm whitespace-nowrap flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>My Store</span>
                  </button>
                ) : onOpenBecomeTrader ? (
                  <button
                    type="button"
                    onClick={onOpenBecomeTrader}
                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-[10px] shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Become Trader
                  </button>
                ) : null}
              </div>

              {/* My Store Quick Actions Banner (if owner) */}
              {userOwnedBusinesses.length > 0 && (
                <div className="p-3 bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                      <Store className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Your Venture</span>
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30 font-medium">Owner</span>
                      </div>
                      <h4 className="text-xs font-bold text-white truncate">{userOwnedBusinesses[0].name}</h4>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMyStore(userOwnedBusinesses[0])}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-[11px] shrink-0 flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Manage Products</span>
                  </button>
                </div>
              )}

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={marketSearch}
                  onChange={(e) => setMarketSearch(e.target.value)}
                  placeholder="Search food, gadgets, printouts, fashion..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60"
                />
                {marketSearch && (
                  <button
                    type="button"
                    onClick={() => setMarketSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Merged Single Filter Row: Zone Filters Button + Category Chips */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {/* Filters Button for Campus Zone Bottom Sheet */}
                <button
                  type="button"
                  onClick={() => setIsZoneFilterSheetOpen(true)}
                  className={`min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all shrink-0 cursor-pointer ${
                    marketCampus !== 'All'
                      ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white'
                  }`}
                  title="Filter by Campus Zone"
                >
                  <Filter className="h-4 w-4 text-orange-400" />
                  <span>{marketCampus !== 'All' ? marketCampus.split(' ')[0] : 'Filters'}</span>
                </button>

                {/* Category Chips */}
                {MARKET_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setMarketCategory(cat)}
                    className={`min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
                      marketCategory === cat
                        ? 'bg-neutral-800 text-orange-400 border-orange-500/40 font-bold'
                        : 'bg-neutral-900/80 text-neutral-300 border-neutral-800 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Business Cards 2-Column Grid / States */}
              {isLoadingBusinesses && businesses.length === 0 ? (
                /* Loading Skeletons in 2-Column Grid */
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3 space-y-2.5 animate-pulse"
                    >
                      <div className="w-full aspect-square rounded-xl bg-neutral-800" />
                      <div className="h-3.5 w-3/4 rounded-md bg-neutral-800" />
                      <div className="h-4 w-1/2 rounded-md bg-neutral-800" />
                      <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                        <div className="h-3 w-1/3 rounded bg-neutral-800" />
                        <div className="h-3 w-8 rounded bg-neutral-800" />
                      </div>
                      <div className="h-11 w-full rounded-xl bg-neutral-800" />
                    </div>
                  ))}
                </div>
              ) : businessesError && businesses.length === 0 ? (
                /* Error State with Retry Button */
                <div className="text-center py-12 px-4 bg-neutral-900/50 rounded-2xl border border-neutral-800">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-3">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Unable to load campus traders</h4>
                  <p className="text-xs text-neutral-400 mt-1 mb-4">Please check your connection and try again.</p>
                  <button
                    type="button"
                    onClick={onRetryBusinesses}
                    className="min-h-[44px] px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-xs cursor-pointer border border-neutral-700 transition-colors inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                </div>
              ) : businesses.length === 0 ? (
                /* Empty State: No traders yet. Be the first to open a store */
                <div className="text-center py-12 px-4 bg-neutral-900/50 rounded-2xl border border-neutral-800">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20 mb-3">
                    <Store className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">No traders yet. Be the first to open a store</h4>
                  <p className="text-xs text-neutral-400 mt-1 mb-4">Register your hostel bakes, tech repair, dorm styling, or campus brand today.</p>
                  <button
                    type="button"
                    onClick={onOpenBecomeTrader || onOpenCreateBusiness}
                    className="min-h-[44px] px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-neutral-950 font-bold rounded-xl text-xs cursor-pointer transition-colors shadow-md"
                  >
                    Become a Trader
                  </button>
                </div>
              ) : filteredBusinesses.length === 0 ? (
                /* Filtered Search Empty State */
                <div className="text-center py-12 px-4 bg-neutral-900/50 rounded-2xl border border-neutral-800">
                  <Store className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-white">No trades found</h4>
                  <p className="text-xs text-neutral-400 mt-1 mb-4">Try clearing filters or search query.</p>
                  <button
                    type="button"
                    onClick={() => { setMarketCategory('All'); setMarketCampus('All'); setMarketSearch(''); }}
                    className="min-h-[44px] px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                /* 2-Column Grid */
                <div className="grid grid-cols-2 gap-3">
                  {filteredBusinesses.map((biz) => (
                    <BusinessCard
                      key={biz.id}
                      business={biz}
                      onSelect={onSelectBusiness}
                      onOpenTraderProfile={onOpenTraderProfile}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 3: 🏛️ CAMPUS LIFE HUB                                 */}
          {/* ========================================================== */}
          {activeTab === 'campus' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {activeCampusSubHub === null ? (
                /* Hubs Landing Screen - 2x3 Grid */
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-neutral-900 via-neutral-900 to-orange-950/40 border border-neutral-800 rounded-3xl">
                    <h2 className="text-base font-extrabold text-white">Campus Life Hubs</h2>
                    <p className="text-xs text-neutral-300 mt-1">
                      Student politics, academic resources, clubs, news bulletins & interactive map.
                    </p>
                  </div>

                  {/* 2x3 Grid of Icon Tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                    {[
                      {
                        id: 'politics' as CampusSubHub,
                        icon: Vote,
                        label: 'SUG Politics & Votes',
                        subtitle: 'Campaign manifestos & live voting',
                        color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
                      },
                      {
                        id: 'academics' as CampusSubHub,
                        icon: BookOpen,
                        label: 'Academic Hub',
                        subtitle: 'Faculties, past Qs & course outlines',
                        color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
                      },
                      {
                        id: 'clubs' as CampusSubHub,
                        icon: Users,
                        label: 'Clubs & Tech Hubs',
                        subtitle: 'Tech, sports & student societies',
                        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                      },
                      {
                        id: 'news' as CampusSubHub,
                        icon: Newspaper,
                        label: 'Campus News',
                        subtitle: 'Official campus memos & press',
                        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                      },
                      {
                        id: 'map' as CampusSubHub,
                        icon: Compass,
                        label: 'Landmarks & Transit',
                        subtitle: 'Places, shuttle routes and fares',
                        color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
                      },
                      {
                        id: 'idcard' as CampusSubHub,
                        icon: ShieldCheck,
                        label: 'Digital ID Pass',
                        subtitle: 'Verified student badge',
                        color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
                      },
                    ].map((tile) => {
                      const IconComponent = tile.icon;
                      return (
                        <button
                          key={tile.id}
                          type="button"
                          onClick={() => {
                            if (tile.id === 'idcard') {
                              setActiveTab('profile');
                            } else {
                              setActiveCampusSubHub(tile.id);
                            }
                          }}
                          className="group relative min-h-[110px] p-4 rounded-2xl border border-neutral-800 bg-neutral-900/90 hover:bg-neutral-800 hover:border-orange-500/50 transition-all flex flex-col justify-between cursor-pointer shadow-lg text-left active:scale-95"
                        >
                          <div className="flex items-center justify-between">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${tile.color}`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <ChevronRight className="h-4 w-4 text-neutral-500 group-hover:text-orange-400 transition-colors" />
                          </div>

                          <div className="mt-3">
                            <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-1">
                              {tile.label}
                            </h3>
                            <p className="text-[11px] text-neutral-300 line-clamp-1 mt-0.5">
                              {tile.subtitle}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Sub-Section View with Back Arrow in Header */
                <div className="space-y-4">
                  {/* Header with Back Arrow */}
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setActiveCampusSubHub(null)}
                      className="min-h-[44px] min-w-[44px] flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-800 font-bold text-xs cursor-pointer transition-all"
                    >
                      <ArrowLeft className="h-4 w-4 text-orange-400" />
                      <span>Back to Hubs</span>
                    </button>

                    <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider font-mono">
                      {activeCampusSubHub === 'politics' && 'SUG Politics'}
                      {activeCampusSubHub === 'academics' && 'Academics'}
                      {activeCampusSubHub === 'clubs' && 'Clubs & Societies'}
                      {activeCampusSubHub === 'news' && 'Campus Memos'}
                      {activeCampusSubHub === 'map' && 'Landmarks & Transit'}
                    </span>
                  </div>

                  {/* Active Section Content */}
                  {activeCampusSubHub === 'politics' && (
                    <PoliticsCampaignView
                      onRequireAuth={() => onOpenAuth('signin')}
                      onShowToast={showToast}
                    />
                  )}

                  {activeCampusSubHub === 'academics' && (
                    <FacultiesDeptsView
                      selectedLevel={selectedLevel}
                      onSelectLevel={onSelectLevel}
                      onShowToast={showToast}
                    />
                  )}

                  {activeCampusSubHub === 'clubs' && (
                    <ClubsDirectoryView
                      onRequireAuth={() => onOpenAuth('signin')}
                      onShowToast={showToast}
                    />
                  )}

                  {activeCampusSubHub === 'news' && (
                    <CampusNewsView onShowToast={showToast} />
                  )}

                  {activeCampusSubHub === 'map' && (
                    <CampusMapView />
                  )}
                </div>
              )}

            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 4: 💬 CHATS & DIRECT MESSAGING                         */}
          {/* ========================================================== */}
          {activeTab === 'chats' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              
              {/* Chats Header with subtle lock indicator */}
              <div className="flex items-center justify-between px-1 py-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Direct Messages</h3>
                  <span title="End-to-End Encrypted" className="text-emerald-400 flex items-center">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Online
                </span>
              </div>

              {/* Filter Tabs: Direct Messages vs Message Requests */}
              <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setChatFilter('all')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    chatFilter === 'all' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400'
                  }`}
                >
                  Direct Chats ({conversations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setChatFilter('requests')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                    chatFilter === 'requests' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400'
                  }`}
                >
                  <span>Requests</span>
                  {pendingRequestsCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-amber-400 text-neutral-950 text-[10px] flex items-center justify-center font-bold">
                      {pendingRequestsCount}
                    </span>
                  )}
                </button>
              </div>

              {/* 1. Marketplace In-App Order Conversations */}
              {marketplaceConversations.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-bold text-neutral-400 px-1 uppercase tracking-wider flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-amber-400" />
                    <span>Marketplace Trades & Orders</span>
                  </div>
                  {marketplaceConversations
                    .filter((m) => m.buyerId !== m.traderId && !(currentUser && m.buyerId === currentUser.id && m.traderId === currentUser.id))
                    .map((mConv) => {
                    const isBuyer = mConv.buyerId === currentUser?.id;
                    const otherPartyName = isBuyer 
                      ? (mConv.businessName || 'Campus Store')
                      : (mConv.buyerName || 'Buyer');
                    const unread = isBuyer ? mConv.buyerUnread : mConv.traderUnread;
                    const isDeclinedOrBlocked = mConv.status === 'declined' || mConv.status === 'blocked';

                    return (
                      <div
                        key={mConv.id}
                        onClick={() => openMarketplaceChat(mConv.id)}
                        className="p-3 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-between cursor-pointer hover:border-neutral-700 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-amber-400 shrink-0 font-bold text-sm">
                            {otherPartyName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-white truncate">{otherPartyName}</h4>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase ${
                                isDeclinedOrBlocked 
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}>
                                {mConv.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-400 truncate max-w-[210px]">
                              {mConv.lastMessage || 'Order conversation opened'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-neutral-500">
                            {mConv.lastMessageAt 
                              ? new Date(mConv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </span>
                          {unread > 0 && (
                            <div className="w-4 h-4 bg-amber-500 text-neutral-950 font-bold rounded-full flex items-center justify-center text-[9px] ml-auto mt-1">
                              {unread}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 2. Direct Conversations List */}
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-bold text-neutral-400 px-1 uppercase tracking-wider">
                  💬 Direct Conversations
                </div>
                {conversations.filter((c) => (chatFilter === 'requests' ? c.isMessageRequest : !c.isMessageRequest)).length > 0 ? (
                  conversations
                    .filter((c) => (chatFilter === 'requests' ? c.isMessageRequest : !c.isMessageRequest))
                    .map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() =>
                          setActiveChatTarget({
                            chatType: 'direct',
                            recipient: {
                              id: chat.id,
                              name: chat.traderName || chat.businessName,
                              handle: `@${(chat.businessName || 'chat').toLowerCase().replace(/\s+/g, '_')}`,
                              avatarUrl: chat.businessImageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
                              isVerifiedStudent: true,
                              online: chat.isOnline,
                              isAcceptedContact: !chat.isMessageRequest,
                            },
                          })
                        }
                        className="p-3 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-between cursor-pointer hover:border-neutral-700 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <img 
                              src={chat.businessImageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} 
                              alt={chat.businessName} 
                              className="w-10 h-10 rounded-full object-cover" 
                            />
                            {chat.isOnline && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-neutral-900" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{chat.traderName || chat.businessName}</h4>
                            <p className="text-[11px] text-neutral-400 truncate max-w-[210px]">{chat.lastMessage}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {chat.lastMessageTimestamp
                              ? new Date(chat.lastMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </span>
                          {chat.unreadCount > 0 && (
                            <div className="w-4 h-4 bg-amber-500 text-neutral-950 font-bold rounded-full flex items-center justify-center text-[9px] ml-auto mt-1">
                              {chat.unreadCount}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                ) : (
                  marketplaceConversations.length === 0 && (
                    <div className="text-center py-10 px-4 bg-neutral-900/40 rounded-2xl border border-neutral-800 space-y-2">
                      <MessageSquare className="w-7 h-7 text-neutral-500 mx-auto" />
                      <h4 className="text-sm font-bold text-white">Nothing here yet</h4>
                      <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                        Your direct messages and trade enquiries will appear here once you message a trader or receive an inquiry.
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* ========================================================== */}
          {/* TAB 5: 🎓 STUDENT ID & FOUNDER DASHBOARD                  */}
          {/* ========================================================== */}
          {/* ========================================================== */}
          {/* TAB 5: 👤 STUDENT SOCIAL PROFILE                           */}
          {/* ========================================================== */}
          {activeTab === 'profile' && (
            <div className="space-y-3">
              {activeProfileUser && currentUser && activeProfileUser.id !== currentUser.id && (
                <div className="px-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setViewingProfileUser(null);
                      onClearTargetUser?.();
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/');
                        console.log('Navigated to:', '/');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                    <span>Back to My Profile</span>
                  </button>
                </div>
              )}
              <UserProfileView
                user={activeProfileUser}
                userPosts={posts.filter((p) => p.authorId === activeProfileUser?.id || p.authorUsername === activeProfileUser?.username)}
                userSnaps={snaps.filter((s) => s.authorId === activeProfileUser?.id)}
                userBusinesses={activeProfileUser?.id === currentUser?.id ? userOwnedBusinesses : businesses.filter((b) => b.ownerId === activeProfileUser?.id)}
                onOpenCreatePost={onOpenCreatePost}
                onOpenCreateBusiness={onOpenCreateBusiness}
                onSelectBusiness={onSelectBusiness}
              />
            </div>
          )}


        </div>
      </div>

      {/* BOTTOM TAB BAR NAVIGATION */}
      <nav 
        className="fixed bottom-0 left-0 right-0 h-16 bg-neutral-950/95 backdrop-blur-md border-t border-neutral-800/80 z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div 
          className="max-w-4xl mx-auto h-full grid grid-cols-5 w-full"
          style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}
        >
          {/* COLUMN 1: FEED */}
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className="flex flex-col items-center justify-center h-full w-full col-span-1 transition-transform active:scale-95 cursor-pointer"
          >
            <Home className={`w-[22px] h-[22px] transition-colors ${activeTab === 'feed' ? 'text-amber-400' : 'text-neutral-400'}`} />
            <span className={`text-[10px] font-bold mt-1 leading-none ${activeTab === 'feed' ? 'text-amber-400' : 'text-neutral-400'}`}>
              Feed
            </span>
          </button>

          {/* COLUMN 2: MARKET */}
          <button
            type="button"
            onClick={() => setActiveTab('market')}
            className="flex flex-col items-center justify-center h-full w-full col-span-1 transition-transform active:scale-95 cursor-pointer"
          >
            <ShoppingBag className={`w-[22px] h-[22px] transition-colors ${activeTab === 'market' ? 'text-amber-400' : 'text-neutral-400'}`} />
            <span className={`text-[10px] font-bold mt-1 leading-none ${activeTab === 'market' ? 'text-amber-400' : 'text-neutral-400'}`}>
              Market
            </span>
          </button>

          {/* COLUMN 3: CENTER QUICK ACTION FAB (+) */}
          <div className="flex flex-col items-center justify-center h-full w-full col-span-1 relative">
            <button
              type="button"
              onClick={() => setIsActionSheetOpen(true)}
              className="relative -top-3.5 w-[56px] h-[56px] min-w-[56px] min-h-[56px] rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-neutral-950 flex items-center justify-center shadow-xl shadow-amber-500/30 transition-transform active:scale-95 border-2 border-neutral-950 cursor-pointer"
              title="Campus Quick Action"
            >
              <Plus className="w-[26px] h-[26px] stroke-[2.5] block p-0 text-neutral-950" />
            </button>
          </div>

          {/* COLUMN 4: CAMPUS HUBS */}
          <button
            type="button"
            onClick={() => setActiveTab('campus')}
            className="flex flex-col items-center justify-center h-full w-full col-span-1 transition-transform active:scale-95 cursor-pointer"
          >
            <Building2 className={`w-[22px] h-[22px] transition-colors ${activeTab === 'campus' ? 'text-amber-400' : 'text-neutral-400'}`} />
            <span className={`text-[10px] font-bold mt-1 leading-none ${activeTab === 'campus' ? 'text-amber-400' : 'text-neutral-400'}`}>
              Hubs
            </span>
          </button>

          {/* COLUMN 5: CHATS */}
          <button
            type="button"
            onClick={() => setActiveTab('chats')}
            className="flex flex-col items-center justify-center h-full w-full col-span-1 transition-transform active:scale-95 cursor-pointer"
          >
            <div className="relative flex items-center justify-center">
              <MessageSquare className={`w-[22px] h-[22px] transition-colors ${activeTab === 'chats' ? 'text-amber-400' : 'text-neutral-400'}`} />
              {unreadTotalCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[14px] h-[14px] px-0.5 bg-amber-500 text-neutral-950 text-[9px] font-black rounded-full flex items-center justify-center shadow-sm">
                  {unreadTotalCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-bold mt-1 leading-none ${activeTab === 'chats' ? 'text-amber-400' : 'text-neutral-400'}`}>
              Chats
            </span>
          </button>

        </div>
      </nav>

        {/* MODAL: QUICK ACTION BOTTOM SHEET */}
        {isActionSheetOpen && (
          <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200">
            <div 
              className="bg-neutral-900 border-t border-neutral-800 rounded-t-3xl p-4 space-y-3 pb-8 animate-in slide-in-from-bottom duration-250"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <h3 className="text-xs font-extrabold text-white tracking-wide">CAMPUS QUICK ACTIONS</h3>
                <button
                  type="button"
                  onClick={() => setIsActionSheetOpen(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsActionSheetOpen(false);
                    onOpenCreatePost();
                  }}
                  className="p-3 bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800 rounded-2xl flex flex-col items-center text-center gap-1.5 transition-colors"
                >
                  <span className="text-xl">📝</span>
                  <span className="text-xs font-bold text-white">Create Post</span>
                  <span className="text-[10px] text-neutral-400">Buzz, news or inquiry</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsActionSheetOpen(false);
                    onOpenCreateSnap();
                  }}
                  className="p-3 bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800 rounded-2xl flex flex-col items-center text-center gap-1.5 transition-colors"
                >
                  <span className="text-xl">📸</span>
                  <span className="text-xs font-bold text-white">24h Campus Snap</span>
                  <span className="text-[10px] text-neutral-400">Camera / status photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsActionSheetOpen(false);
                    onOpenCreateBusiness();
                  }}
                  className="p-3 bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800 rounded-2xl flex flex-col items-center text-center gap-1.5 transition-colors"
                >
                  <span className="text-xl">🏪</span>
                  <span className="text-xs font-bold text-white">List New Trade</span>
                  <span className="text-[10px] text-neutral-400">Launch a campus business</span>
                </button>

                {onOpenBecomeTrader && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionSheetOpen(false);
                      onOpenBecomeTrader();
                    }}
                    className="p-3 bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800 rounded-2xl flex flex-col items-center text-center gap-1.5 transition-colors"
                  >
                    <span className="text-xl">🎓</span>
                    <span className="text-xs font-bold text-amber-400">Become Trader</span>
                    <span className="text-[10px] text-neutral-400">Matric verification badge</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL: FULLSCREEN STORIES / STATUS VIEWER */}
        {activeStoryData && (
          <StoriesViewerScreen
            author={activeStoryData.author}
            stories={activeStoryData.stories}
            onClose={() => setActiveStoryData(null)}
            onOpenChatWithAuthor={(authorId, replyText) => {
              setActiveStoryData(null);
              setActiveChatTarget({
                chatType: 'direct',
                recipient: {
                  id: authorId,
                  name: activeStoryData.author.username,
                  handle: `@${activeStoryData.author.username}`,
                  avatarUrl: activeStoryData.author.avatarUrl,
                  department: activeStoryData.author.department,
                  online: true,
                  isAcceptedContact: true,
                },
              });
            }}
          />
        )}

        {/* MODAL: FULLSCREEN REAL-TIME CHAT SCREEN */}
        {activeChatTarget && (
          <div className="absolute inset-0 z-40 bg-neutral-950 flex flex-col">
            <RealTimeChatScreen
              chatType={activeChatTarget.chatType}
              recipient={activeChatTarget.recipient}
              currentUser={{
                id: currentUser?.id || 'guest_user',
                name: currentUser?.fullName || 'Student User',
                avatarUrl: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
                isAdmin: currentUser?.role === 'trader',
              }}
              onBack={() => setActiveChatTarget(null)}
            />
          </div>
        )}

        {/* Campus Zone Filter Bottom Sheet Modal */}
        {isZoneFilterSheetOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsZoneFilterSheetOpen(false)}
          >
            <div 
              className="w-full max-w-lg rounded-t-3xl border-t border-neutral-800 bg-neutral-900 p-6 space-y-4 text-white shadow-2xl animate-in slide-in-from-bottom duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-orange-400" />
                  <h3 className="text-sm font-bold">Select Campus Zone</h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsZoneFilterSheetOpen(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {CAMPUS_ZONES.map((zone) => {
                  const isSelected = marketCampus === zone;
                  return (
                    <button
                      key={zone}
                      type="button"
                      onClick={() => {
                        setMarketCampus(zone);
                        setIsZoneFilterSheetOpen(false);
                      }}
                      className={`w-full min-h-[44px] flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                          : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
                      }`}
                    >
                      <span>{zone}</span>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-orange-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* My Store Product Management Modal */}
        {selectedMyStore && (
          <MyStoreModal
            isOpen={Boolean(selectedMyStore)}
            onClose={() => setSelectedMyStore(null)}
            myStore={selectedMyStore}
            onUpdateStore={(updated) => {
              setSelectedMyStore(updated);
              onUpdateBusiness?.(updated);
            }}
            onOpenStorePublicView={(store) => {
              setSelectedMyStore(null);
              onSelectBusiness?.(store);
            }}
          />
        )}

        {/* Global Search Modal */}
        <GlobalSearchModal
          isOpen={isGlobalSearchOpen}
          onClose={() => setIsGlobalSearchOpen(false)}
          initialTab={initialSearchTab}
          onSelectUser={(u) => {
            const targetPath = `/profile/${u.id}`;
            console.log('Navigated to:', targetPath);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', targetPath);
            }
            setViewingProfileUser(u);
            setActiveTab('profile');
            onViewUserProfile?.(u.id, u);
          }}
          onSelectPage={(pageId) => {
            // open hub page
          }}
          onSelectProduct={(prodId) => {
            // open product modal
          }}
          onSelectPost={(postId) => {
            // open post modal
          }}
        />

        {/* People Discovery / See More Modal */}
        <PeopleDiscoveryModal
          isOpen={isPeopleDiscoveryOpen}
          onClose={() => setIsPeopleDiscoveryOpen(false)}
          currentUser={currentUser}
          onSelectUser={(u) => {
            const targetPath = `/profile/${u.id}`;
            console.log('Navigated to:', targetPath);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', targetPath);
            }
            setViewingProfileUser(u);
            setActiveTab('profile');
            onViewUserProfile?.(u.id, u);
          }}
          onToggleFollow={(id) => {
            toggleFollowUser(id);
          }}
        />

    </div>
  );
};
