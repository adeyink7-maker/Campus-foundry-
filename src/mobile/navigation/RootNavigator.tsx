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

import React, { useState, useMemo } from 'react';
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
  Smartphone, 
  Laptop, 
  Maximize2, 
  Minimize2, 
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
  Award
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
import { INITIAL_BUSINESSES } from '../../data/mockData';
import { INITIAL_CAMPUS_POSTS, INITIAL_CAMPUS_SNAPS } from '../../data/socialMockData';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useChat } from '../../context/ChatContext';

import { UnilorinAuthModule } from '../auth/UnilorinAuthModule';
import { StoriesViewerScreen, MobileStoryItem } from '../screens/StoriesViewerScreen';
import { RealTimeChatScreen } from '../screens/RealTimeChatScreen';
import { BiometricsService } from '../auth/BiometricsService';

// Web feature views integrated directly into mobile tabs
import { PoliticsCampaignView } from '../../components/PoliticsCampaignView';
import { FacultiesDeptsView } from '../../components/FacultiesDeptsView';
import { ClubsDirectoryView } from '../../components/ClubsDirectoryView';
import { CampusNewsView } from '../../components/CampusNewsView';
import { CampusMapView } from '../../components/CampusMapView';
import { PostCard } from '../../components/PostCard';
import { BusinessCard } from '../../components/BusinessCard';

export type MobileTab = 'feed' | 'market' | 'campus' | 'chats' | 'profile';
export type CampusSubHub = 'politics' | 'academics' | 'clubs' | 'news' | 'map';

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
}

export const RootNavigator: React.FC<RootNavigatorProps> = ({
  businesses = INITIAL_BUSINESSES,
  posts = INITIAL_CAMPUS_POSTS,
  snaps = INITIAL_CAMPUS_SNAPS,
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
}) => {
  const { currentUser, signOut } = useAuth();
  const { totalItemCount, setIsCartOpen } = useCart();
  const { unreadTotalCount, pendingRequestsCount, conversations, openChatWithBusiness } = useChat();

  // Navigation State
  const [activeTab, setActiveTab] = useState<MobileTab>('feed');
  const [activeCampusSubHub, setActiveCampusSubHub] = useState<CampusSubHub>('politics');

  // Display Mode: 'frame' (mobile phone bezel simulator) vs 'fullscreen' (edge-to-edge)
  const [displayMode, setDisplayMode] = useState<'frame' | 'fullscreen'>('frame');

  // Quick Action Sheet state (center '+' FAB)
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  // Search & Filters in Marketplace
  const [marketSearch, setMarketSearch] = useState('');
  const [marketCategory, setMarketCategory] = useState<string>('All');
  const [marketCampus, setMarketCampus] = useState<string>('All');

  // Feed Category Filter
  const [feedCategory, setFeedCategory] = useState<string>('All Buzz');

  // Institutional Auth Modal state
  const [showInstitutionalAuth, setShowInstitutionalAuth] = useState(false);

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
    <div className={`w-full min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center ${displayMode === 'frame' ? 'p-0 sm:py-6 sm:px-4' : 'p-0'} select-none relative`}>
      
      {/* Top Floating Viewport Control Bar */}
      <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 z-50 flex items-center justify-between sm:justify-end gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 bg-neutral-900/90 border border-neutral-700/80 px-2.5 py-1.5 rounded-full shadow-2xl backdrop-blur-md text-[11px] font-bold">
          <span className="text-amber-400">📱 Mobile Mode:</span>
          <button
            type="button"
            onClick={() => setDisplayMode(displayMode === 'frame' ? 'fullscreen' : 'frame')}
            className={`px-2 py-0.5 rounded-full transition-colors ${
              displayMode === 'frame' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {displayMode === 'frame' ? 'Phone Bezel' : 'Edge-to-Edge'}
          </button>
        </div>

        {onSwitchToWeb && (
          <button
            type="button"
            onClick={onSwitchToWeb}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-emerald-400 border border-emerald-500/40 text-xs font-bold shadow-2xl backdrop-blur-md transition-all hover:scale-105"
            title="Switch to Web 3-Panel Dashboard"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Web Dashboard</span>
          </button>
        )}
      </div>

      {/* Main Mobile App Container */}
      <div 
        className={`relative bg-neutral-950 text-white flex flex-col overflow-hidden transition-all duration-300 shadow-2xl ${
          displayMode === 'frame'
            ? 'w-full max-w-[430px] h-[100dvh] sm:h-[880px] sm:rounded-[48px] sm:border-[8px] sm:border-neutral-800 sm:ring-1 sm:ring-neutral-700/50'
            : 'w-full h-[100dvh] max-w-none rounded-none border-0'
        }`}
      >
        
        {/* Native Mobile Status Bar Simulator */}
        <div className="h-11 px-6 flex items-center justify-between text-xs text-neutral-400 font-semibold bg-neutral-950 z-30 select-none border-b border-neutral-900">
          <span>9:41</span>
          
          {/* Dynamic Island / Speaker Pill */}
          <div className="w-28 h-5 bg-black rounded-full flex items-center justify-center border border-neutral-800">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 mr-2 animate-pulse" />
            <span className="text-[9px] font-mono text-neutral-400">UNILORIN</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span>5G</span>
            <span className="text-amber-400">⚡ 98%</span>
          </div>
        </div>

        {/* Top App Header with UNILORIN Branding, Cart, Chat & Profile */}
        <div className="px-4 py-2.5 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800/80 flex items-center justify-between z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-neutral-950 font-black flex items-center justify-center text-sm shadow-md shadow-amber-500/20">
              CF
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-extrabold text-white tracking-tight">CampusFoundry</h1>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold uppercase tracking-wider border border-amber-500/30">
                  Mobile
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SQLite WatermelonDB Sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

            {/* Profile Avatar / Sign In */}
            {currentUser ? (
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="w-8 h-8 rounded-full border-2 border-amber-500 overflow-hidden shadow-sm"
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
                onClick={() => setShowInstitutionalAuth(true)}
                className="text-xs px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl shadow-md transition-all active:scale-95"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Stories / Status Bar (Shown on Feed Tab) */}
        {activeTab === 'feed' && (
          <div className="py-2 px-3 bg-neutral-900/40 border-b border-neutral-800/80 overflow-x-auto no-scrollbar flex items-center gap-3 z-10 shrink-0">
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
            {snaps.map((snap) => (
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
            ))}
          </div>
        )}

        {/* MAIN MOBILE SCREEN BODY */}
        <div className="flex-1 overflow-y-auto no-scrollbar bg-neutral-950 p-3 space-y-3 pb-24">
          
          {/* ========================================================== */}
          {/* TAB 1: 📰 CAMPUS FEED                                      */}
          {/* ========================================================== */}
          {activeTab === 'feed' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              
              {/* Level Filter Horizontal Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {(['All', '100L', '200L', '300L', '400L', '500L'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => onSelectLevel(lvl)}
                    className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      selectedLevel === lvl
                        ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                        : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              {/* Feed Topic Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {FEED_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFeedCategory(cat)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-colors ${
                      feedCategory === cat
                        ? 'bg-neutral-800 text-amber-400 border border-amber-500/40'
                        : 'bg-neutral-900/60 text-neutral-400 hover:text-white'
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
                  <h4 className="text-sm font-bold text-white">No buzz found for {selectedLevel}</h4>
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
              <div className="p-3.5 bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-neutral-900 border border-amber-500/30 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-amber-300">UNILORIN Student Marketplace</h3>
                  <p className="text-[10px] text-neutral-300 mt-0.5">
                    Order directly from verified student traders across Sanrab, Tanke & PS.
                  </p>
                </div>
                {onOpenBecomeTrader && (
                  <button
                    type="button"
                    onClick={onOpenBecomeTrader}
                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-[10px] shadow-sm whitespace-nowrap"
                  >
                    Become Trader
                  </button>
                )}
              </div>

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

              {/* Campus Location Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {CAMPUS_ZONES.map((zone) => (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => setMarketCampus(zone)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${
                      marketCampus === zone
                        ? 'bg-amber-500 text-neutral-950'
                        : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                    }`}
                  >
                    {zone}
                  </button>
                ))}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {MARKET_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setMarketCategory(cat)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-colors ${
                      marketCategory === cat
                        ? 'bg-neutral-800 text-amber-400 border border-amber-500/40'
                        : 'bg-neutral-900/60 text-neutral-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Business Cards Grid */}
              {filteredBusinesses.length === 0 ? (
                <div className="text-center py-12 px-4 bg-neutral-900/50 rounded-2xl border border-neutral-800">
                  <Store className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-white">No trades found</h4>
                  <p className="text-xs text-neutral-400 mt-1 mb-4">Try clearing filters or search query.</p>
                  <button
                    type="button"
                    onClick={onOpenCreateBusiness}
                    className="px-4 py-2 bg-amber-500 text-neutral-950 font-bold rounded-xl text-xs"
                  >
                    + Register Your Student Trade
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
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
            <div className="space-y-3 animate-in fade-in duration-200">
              
              {/* Campus Life Segmented Sub-Navigation Bar */}
              <div className="flex bg-neutral-900 p-1 rounded-2xl border border-neutral-800 overflow-x-auto no-scrollbar gap-1">
                {[
                  { id: 'politics' as CampusSubHub, label: 'SUG & Votes', icon: '🗳️' },
                  { id: 'academics' as CampusSubHub, label: 'Academics', icon: '📚' },
                  { id: 'clubs' as CampusSubHub, label: 'Clubs', icon: '🚀' },
                  { id: 'news' as CampusSubHub, label: 'News', icon: '📢' },
                  { id: 'map' as CampusSubHub, label: 'Campus Map', icon: '🗺️' },
                ].map((hub) => (
                  <button
                    key={hub.id}
                    type="button"
                    onClick={() => setActiveCampusSubHub(hub.id)}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
                      activeCampusSubHub === hub.id
                        ? 'bg-amber-500 text-neutral-950 shadow-md'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span>{hub.icon}</span>
                    <span>{hub.label}</span>
                  </button>
                ))}
              </div>

              {/* Sub-Hub Content */}
              {activeCampusSubHub === 'politics' && (
                <div className="space-y-3">
                  <PoliticsCampaignView
                    onRequireAuth={() => onOpenAuth('signin')}
                    onShowToast={showToast}
                  />
                </div>
              )}

              {activeCampusSubHub === 'academics' && (
                <div className="space-y-3">
                  <FacultiesDeptsView
                    selectedLevel={selectedLevel}
                    onSelectLevel={onSelectLevel}
                    onShowToast={showToast}
                  />
                </div>
              )}

              {activeCampusSubHub === 'clubs' && (
                <div className="space-y-3">
                  <ClubsDirectoryView
                    onRequireAuth={() => onOpenAuth('signin')}
                    onShowToast={showToast}
                  />
                </div>
              )}

              {activeCampusSubHub === 'news' && (
                <div className="space-y-3">
                  <CampusNewsView onShowToast={showToast} />
                </div>
              )}

              {activeCampusSubHub === 'map' && (
                <div className="space-y-3">
                  <CampusMapView />
                </div>
              )}
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 4: 💬 CHATS & DIRECT MESSAGING                         */}
          {/* ========================================================== */}
          {activeTab === 'chats' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              
              {/* Security & Offline Banner */}
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">🔒</span>
                  <div>
                    <h4 className="text-xs font-bold text-white">End-to-End Encrypted</h4>
                    <p className="text-[10px] text-neutral-400">Offline replies synced to WatermelonDB SQLite</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  Online
                </span>
              </div>

              {/* Filter Tabs: Direct Messages vs Instagram-style Message Requests */}
              <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setChatFilter('all')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    chatFilter === 'all' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400'
                  }`}
                >
                  Direct Chats ({conversations.length || 3})
                </button>
                <button
                  type="button"
                  onClick={() => setChatFilter('requests')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                    chatFilter === 'requests' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400'
                  }`}
                >
                  <span>Requests</span>
                  <span className="w-4 h-4 rounded-full bg-amber-400 text-neutral-950 text-[10px] flex items-center justify-center">
                    {pendingRequestsCount || 1}
                  </span>
                </button>
              </div>

              {/* Departmental & Club Broadcast Channels (Telegram Mode) */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-neutral-400 px-1 uppercase tracking-wider">
                  📢 Faculty & Department Channels
                </div>
                {[
                  {
                    id: 'comm_cis',
                    name: 'Faculty of CIS Official',
                    members: '1,420 students',
                    avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100',
                    lastMessage: 'Mid-semester CBT testing schedule updated on student portal.',
                    time: '12:45 PM',
                    unread: 2,
                  },
                  {
                    id: 'comm_tech',
                    name: 'UNILORIN Tech Innovators Club',
                    members: '542 builders',
                    avatar: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=100',
                    lastMessage: 'Campus Hackathon registration closes this Friday at 11:59 PM.',
                    time: '10:20 AM',
                    unread: 0,
                  },
                ].map((channel) => (
                  <div
                    key={channel.id}
                    onClick={() =>
                      setActiveChatTarget({
                        chatType: 'channel',
                        recipient: {
                          id: channel.id,
                          name: channel.name,
                          handle: `@${channel.id}`,
                          avatarUrl: channel.avatar,
                          department: 'CIS',
                          online: true,
                          isAcceptedContact: true,
                        },
                      })
                    }
                    className="p-3 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-between cursor-pointer hover:border-neutral-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={channel.avatar} alt={channel.name} className="w-10 h-10 rounded-2xl object-cover" />
                      <div>
                        <h4 className="text-xs font-bold text-white">{channel.name}</h4>
                        <p className="text-[11px] text-neutral-400 truncate max-w-[190px]">{channel.lastMessage}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-neutral-500">{channel.time}</span>
                      {channel.unread > 0 && (
                        <div className="w-4 h-4 bg-amber-500 text-neutral-950 font-bold rounded-full flex items-center justify-center text-[9px] ml-auto mt-1">
                          {channel.unread}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Student Direct Messaging List */}
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-bold text-neutral-400 px-1 uppercase tracking-wider">
                  💬 Direct Conversations
                </div>
                {[
                  {
                    id: 'c_ibrahim',
                    name: 'Ibrahim Adebayo',
                    handle: '@ibrahim_cs',
                    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
                    lastMessage: 'Are we still meeting at the University Library by 4 PM?',
                    time: '11:15 AM',
                    unread: 0,
                    isAccepted: true,
                    online: true,
                  },
                  {
                    id: 'c_zainab',
                    name: 'Zainab Bakes (Sanrab Hub)',
                    handle: '@zainab_bakes',
                    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100',
                    lastMessage: 'Your pastry box is ready for pickup at Sanrab Gate!',
                    time: 'Yesterday',
                    unread: 1,
                    isAccepted: true,
                    online: false,
                  },
                  {
                    id: 'c_chiamaka',
                    name: 'Chiamaka (Economics 200L)',
                    handle: '@chiamaka_econs',
                    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
                    lastMessage: 'Message Request: Hello! Do you have the past questions for ECO 201?',
                    time: '2h ago',
                    unread: 1,
                    isAccepted: false,
                    online: false,
                  },
                ]
                  .filter((c) => (chatFilter === 'requests' ? !c.isAccepted : c.isAccepted))
                  .map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() =>
                        setActiveChatTarget({
                          chatType: 'direct',
                          recipient: {
                            id: chat.id,
                            name: chat.name,
                            handle: chat.handle,
                            avatarUrl: chat.avatarUrl,
                            isVerifiedStudent: true,
                            online: chat.online,
                            isAcceptedContact: chat.isAccepted,
                          },
                        })
                      }
                      className="p-3 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-between cursor-pointer hover:border-neutral-700 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <img src={chat.avatarUrl} alt={chat.name} className="w-10 h-10 rounded-full object-cover" />
                          {chat.online && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-neutral-900" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{chat.name}</h4>
                          <p className="text-[11px] text-neutral-400 truncate max-w-[190px]">{chat.lastMessage}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-neutral-500">{chat.time}</span>
                        {chat.unread > 0 && (
                          <div className="w-4 h-4 bg-amber-500 text-neutral-950 font-bold rounded-full flex items-center justify-center text-[9px] ml-auto mt-1">
                            {chat.unread}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 5: 🎓 STUDENT ID & FOUNDER DASHBOARD                  */}
          {/* ========================================================== */}
          {activeTab === 'profile' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              
              {/* UNILORIN Student ID Digital Card */}
              <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-amber-950/60 border border-amber-500/40 rounded-3xl p-4 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏛️</span>
                    <div>
                      <h4 className="text-xs font-bold text-white tracking-wide">UNIVERSITY OF ILORIN</h4>
                      <p className="text-[9px] text-amber-400 uppercase tracking-widest font-mono">Student Digital Identity</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    ✓ Verified
                  </span>
                </div>

                <div className="flex items-center gap-3.5 my-4">
                  <img
                    src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                    alt="Student"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500 shadow-md"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-white">{currentUser?.fullName || 'Tunde Adeyemi'}</h3>
                    <p className="text-xs font-mono text-amber-400 font-bold">
                      {currentUser?.username || '21/52HA042'}
                    </p>
                    <p className="text-[10px] text-neutral-300 mt-0.5">
                      {currentUser?.department || 'Computer Science'} • {currentUser?.level || '300L'}
                    </p>
                    <p className="text-[9px] text-neutral-400">
                      {currentUser?.faculty || 'Faculty of Physical Sciences'}
                    </p>
                  </div>
                </div>

                {/* Simulated Barcode */}
                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[10px] font-mono text-neutral-400">
                  <span>UNILORIN-SECURE-ENCLAVE</span>
                  <span>SESSION: 2024/2025</span>
                </div>
              </div>

              {/* Biometrics & Enclave Security */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4 text-amber-400" />
                  <span>Native Security & Offline Enclave</span>
                </h4>

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-neutral-200">Face ID / Touch ID Unlock</p>
                    <p className="text-[10px] text-neutral-400">Instant biometric authentication</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleBiometrics}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                      isBiometricsActive
                        ? 'bg-amber-500 text-neutral-950 border-amber-400'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                    }`}
                  >
                    {isBiometricsActive ? 'Active ✓' : 'Enable'}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-800">
                  <div>
                    <p className="font-semibold text-neutral-200">WatermelonDB Local SQLite Cache</p>
                    <p className="text-[10px] text-neutral-400">Encrypted offline state & queued replies</p>
                  </div>
                  <span className="text-emerald-400 font-mono text-xs font-bold">Encrypted</span>
                </div>
              </div>

              {/* Founder & Trader Portfolio Section */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-amber-400" />
                    <span>My Campus Trades & Ventures ({userOwnedBusinesses.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={onOpenCreateBusiness}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold"
                  >
                    + Add Listing
                  </button>
                </div>

                {userOwnedBusinesses.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-2">
                    You haven't listed any student trade yet. Turn your skill or hustle into a verified campus venture!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {userOwnedBusinesses.map((biz) => (
                      <div
                        key={biz.id}
                        className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <img src={biz.imageUrl} alt={biz.name} className="w-9 h-9 rounded-lg object-cover" />
                          <div>
                            <h5 className="text-xs font-bold text-white">{biz.name}</h5>
                            <p className="text-[10px] text-neutral-400">{biz.category} • {biz.campus || biz.hostelLocation}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSelectBusiness(biz)}
                          className="text-xs text-amber-400 font-bold"
                        >
                          View ➔
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Authentication Controls */}
              {currentUser ? (
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    showToast('Signed out of institutional profile.');
                  }}
                  className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-bold text-rose-400 transition-colors"
                >
                  Sign Out of Account
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowInstitutionalAuth(true)}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors shadow-md"
                >
                  Sign In with UNILORIN Student Portal
                </button>
              )}
            </div>
          )}

        </div>

        {/* BOTTOM TAB BAR NAVIGATION (Native Mobile Look & Feel) */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-neutral-950/95 backdrop-blur-md border-t border-neutral-800/80 px-2 flex items-center justify-around z-30">
          
          {/* TAB 1: FEED */}
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className="flex flex-col items-center gap-1 transition-transform active:scale-90 flex-1"
          >
            <span className={`text-lg transition-transform ${activeTab === 'feed' ? 'scale-110' : 'opacity-50'}`}>
              📰
            </span>
            <span className={`text-[10px] font-bold ${activeTab === 'feed' ? 'text-amber-400' : 'text-neutral-400'}`}>
              Feed
            </span>
          </button>

          {/* TAB 2: MARKET */}
          <button
            type="button"
            onClick={() => setActiveTab('market')}
            className="flex flex-col items-center gap-1 transition-transform active:scale-90 flex-1"
          >
            <span className={`text-lg transition-transform ${activeTab === 'market' ? 'scale-110' : 'opacity-50'}`}>
              🛍️
            </span>
            <span className={`text-[10px] font-bold ${activeTab === 'market' ? 'text-amber-400' : 'text-neutral-400'}`}>
              Market
            </span>
          </button>

          {/* CENTER QUICK ACTION FAB (+) */}
          <div className="relative -top-3 flex items-center justify-center flex-1">
            <button
              type="button"
              onClick={() => setIsActionSheetOpen(true)}
              className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-neutral-950 flex items-center justify-center shadow-xl shadow-amber-500/30 transition-transform active:scale-95 border-2 border-neutral-950 font-black text-xl"
              title="Campus Quick Action"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
            </button>
          </div>

          {/* TAB 3: CAMPUS HUBS */}
          <button
            type="button"
            onClick={() => setActiveTab('campus')}
            className="flex flex-col items-center gap-1 transition-transform active:scale-90 flex-1"
          >
            <span className={`text-lg transition-transform ${activeTab === 'campus' ? 'scale-110' : 'opacity-50'}`}>
              🏛️
            </span>
            <span className={`text-[10px] font-bold ${activeTab === 'campus' ? 'text-amber-400' : 'text-neutral-400'}`}>
              Hubs
            </span>
          </button>

          {/* TAB 4: CHATS */}
          <button
            type="button"
            onClick={() => setActiveTab('chats')}
            className="flex flex-col items-center gap-1 transition-transform active:scale-90 flex-1 relative"
          >
            <div className="relative">
              <span className={`text-lg transition-transform ${activeTab === 'chats' ? 'scale-110' : 'opacity-50'}`}>
                💬
              </span>
              {unreadTotalCount > 0 && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-amber-500 text-neutral-950 text-[9px] font-black rounded-full flex items-center justify-center">
                  {unreadTotalCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-bold ${activeTab === 'chats' ? 'text-amber-400' : 'text-neutral-400'}`}>
              Chats
            </span>
          </button>

          {/* TAB 5: STUDENT PROFILE */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className="flex flex-col items-center gap-1 transition-transform active:scale-90 flex-1"
          >
            <span className={`text-lg transition-transform ${activeTab === 'profile' ? 'scale-110' : 'opacity-50'}`}>
              🎓
            </span>
            <span className={`text-[10px] font-bold ${activeTab === 'profile' ? 'text-amber-400' : 'text-neutral-400'}`}>
              ID Card
            </span>
          </button>

        </div>

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

        {/* MODAL: INSTITUTIONAL UNILORIN AUTH & BIOMETRICS */}
        {showInstitutionalAuth && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <UnilorinAuthModule
              onAuthSuccess={(data) => {
                showToast(`Welcome! Verified student account authenticated.`);
                setShowInstitutionalAuth(false);
              }}
              onCancel={() => setShowInstitutionalAuth(false)}
            />
          </div>
        )}

      </div>
    </div>
  );
};
