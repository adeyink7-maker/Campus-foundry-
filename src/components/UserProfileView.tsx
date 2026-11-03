import React, { useState } from 'react';
import { 
  Grid, 
  Bookmark, 
  Tag, 
  Store, 
  Share2, 
  MessageCircle, 
  UserPlus, 
  UserCheck, 
  MapPin, 
  GraduationCap, 
  ExternalLink, 
  ShieldCheck, 
  Heart, 
  Eye, 
  MessageSquare, 
  Edit3, 
  X,
  Phone,
  CheckCircle2,
  Trophy,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { usePlayerCard } from '../context/PlayerCardContext';
import { emitAppToast } from '../services/supabase';
import { LongPressAvatar } from './playercard/LongPressAvatar';
import { AppUser, CampusPost, CampusSnap, StudentBusiness } from '../types';
import { EditProfileModal } from './EditProfileModal';

export interface UserProfileViewProps {
  user?: AppUser | null;
  userPosts?: CampusPost[];
  userSnaps?: CampusSnap[];
  userBusinesses?: StudentBusiness[];
  onOpenCreatePost?: () => void;
  onOpenCreateBusiness?: () => void;
  onSelectBusiness?: (biz: StudentBusiness) => void;
  onOpenTraderProfile?: (biz: StudentBusiness) => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  user: targetUserProp,
  userPosts = [],
  userSnaps = [],
  userBusinesses = [],
  onOpenCreatePost,
  onSelectBusiness,
  onOpenTraderProfile,
}) => {
  const { currentUser, toggleFollowUser, signOut } = useAuth();
  const { openChatDrawer } = useChat();
  const { openPlayerCard, openEditor } = usePlayerCard();

  const [activeTab, setActiveTab] = useState<'grid' | 'ventures' | 'saved' | 'activity'>('grid');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowedLocal, setIsFollowedLocal] = useState(false);
  const [selectedGridItem, setSelectedGridItem] = useState<{
    id: string;
    mediaUrl: string;
    caption: string;
    likesCount: number;
    viewsCount?: number;
    createdAt: string;
  } | null>(null);

  const [shareToast, setShareToast] = useState(false);

  // If no target user provided, default to currently logged-in account
  const activeUser = targetUserProp || currentUser;
  const isOwner = Boolean(currentUser && activeUser && currentUser.id === activeUser.id);

  if (!activeUser) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-neutral-400">
        <p className="text-sm font-semibold mb-3">No user profile selected.</p>
      </div>
    );
  }

  // Derive metrics
  const displayUsername = activeUser.username
    ? activeUser.username.startsWith('@')
      ? activeUser.username
      : `@${activeUser.username}`
    : `@${activeUser.email.split('@')[0]}`;

  const postsCount = userPosts.length + userSnaps.length;
  const followersCount = (activeUser.followersCount || 128) + (isFollowedLocal ? 1 : 0);
  const followingCount = activeUser.followingCount || 84;
  const venturesCount = userBusinesses.length;

  const handleToggleFollow = () => {
    setIsFollowedLocal(!isFollowedLocal);
    toggleFollowUser(activeUser.id);
  };

  const handleShareProfile = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 3000);
    }
  };

  const handleDirectMessage = () => {
    if (currentUser && activeUser && currentUser.id === activeUser.id) {
      emitAppToast("You can't message yourself", 'error');
      return;
    }
    openChatDrawer();
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 text-white font-sans">
      
      {/* 1. INSTAGRAM-STYLE HEADER & IDENTITY SECTION */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 pb-8 border-b border-neutral-800">
        
        {/* Profile Avatar with Long Press to World Cup Card */}
        <div className="relative group">
          <LongPressAvatar
            user={activeUser}
            size="2xl"
            avatarClassName="rounded-full border-4 border-amber-400 p-1 shadow-2xl bg-neutral-900"
            onClick={() => openPlayerCard(activeUser)}
          />
          {isOwner && (
            <button
              type="button"
              onClick={() => openEditor(activeUser)}
              className="absolute bottom-1 right-1 p-2 rounded-full bg-amber-500 text-neutral-950 shadow-lg hover:scale-110 transition-transform cursor-pointer z-10"
              title="Player Card Studio"
            >
              <Trophy className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Identity & Metadata Details */}
        <div className="flex-1 text-center md:text-left space-y-3 w-full">
          
          {/* Top Row: Username & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3">
            <h1 className="text-xl md:text-2xl font-black text-white font-mono tracking-tight flex items-center gap-2">
              <span>{displayUsername}</span>
              {(activeUser.role === 'trader' || activeUser.accountType === 'TRADER') && (
                <span title="Verified Campus Account">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 fill-emerald-400/20" />
                </span>
              )}
            </h1>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openPlayerCard(activeUser)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 text-xs font-bold shadow transition-all active:scale-95 border border-amber-500/40 flex items-center gap-1.5 cursor-pointer"
                title="Hold avatar or click to reveal World Cup Player Card"
              >
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                <span>Player Card</span>
              </button>

              {isOwner ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold shadow transition-all active:scale-95 border border-neutral-700 flex items-center gap-1.5"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                    <span>Edit Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShareProfile}
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors border border-neutral-700"
                    title="Share Profile Link"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={signOut}
                    className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-rose-950/40 text-neutral-300 hover:text-rose-400 border border-neutral-700 hover:border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Sign Out of Profile"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    className={`px-5 py-1.5 rounded-xl text-xs font-bold shadow transition-all active:scale-95 flex items-center gap-1.5 ${
                      isFollowedLocal
                        ? 'bg-neutral-800 text-neutral-200 border border-neutral-700 hover:bg-neutral-700'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 text-neutral-950 hover:from-amber-400 hover:to-orange-400 font-extrabold'
                    }`}
                  >
                    {isFollowedLocal ? (
                      <>
                        <UserCheck className="h-4 w-4 text-emerald-400" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDirectMessage}
                    className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold border border-neutral-700 transition-all flex items-center gap-1.5"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-sky-400" />
                    <span>Message</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Activity Metrics Bar (Desktop & Tablet) */}
          <div className="flex items-center justify-center md:justify-start gap-6 py-2 text-xs text-neutral-300 border-y border-neutral-800/80 md:border-none">
            <div>
              <span className="font-extrabold text-white text-sm md:text-base mr-1">{postsCount}</span>
              <span className="text-neutral-400">posts</span>
            </div>
            <div>
              <span className="font-extrabold text-white text-sm md:text-base mr-1">{followersCount}</span>
              <span className="text-neutral-400">followers</span>
            </div>
            <div>
              <span className="font-extrabold text-white text-sm md:text-base mr-1">{followingCount}</span>
              <span className="text-neutral-400">following</span>
            </div>
            {venturesCount > 0 && (
              <div>
                <span className="font-extrabold text-amber-400 text-sm md:text-base mr-1">{venturesCount}</span>
                <span className="text-neutral-400">trades</span>
              </div>
            )}
          </div>

          {/* Bio & Meta Info */}
          <div className="space-y-1.5 text-xs text-neutral-200 leading-relaxed">
            <h2 className="font-extrabold text-white text-sm">{activeUser.fullName}</h2>
            
            <p className="whitespace-pre-line text-neutral-300">
              {activeUser.bio || 'UNILORIN student passionate about campus culture, trade & tech initiatives.'}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1 pt-1 text-[11px] text-neutral-400 font-medium">
              <div className="flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5 text-amber-400" />
                <span>{activeUser.level || '300L'} • {activeUser.department || 'Computer Science'}</span>
              </div>

              {activeUser.hostelLocation && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{activeUser.hostelLocation}</span>
                </div>
              )}

              {activeUser.socialLinks?.portfolio && (
                <a
                  href={activeUser.socialLinks.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sky-400 hover:underline font-bold"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>{activeUser.socialLinks.portfolio.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Share Toast */}
      {shareToast && (
        <div className="my-3 p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center animate-in fade-in">
          Link copied to clipboard! Share on WhatsApp status or campus group chats.
        </div>
      )}

      {/* 2. TABBED NAVIGATION BAR */}
      <div className="flex items-center justify-center border-b border-neutral-800 text-xs font-bold uppercase tracking-wider text-neutral-400">
        <button
          type="button"
          onClick={() => setActiveTab('grid')}
          className={`flex items-center gap-2 py-3 px-6 border-b-2 transition-all cursor-pointer ${
            activeTab === 'grid'
              ? 'border-amber-400 text-amber-400 font-extrabold'
              : 'border-transparent hover:text-white'
          }`}
        >
          <Grid className="h-4 w-4" />
          <span>Posts & Snaps</span>
        </button>

        {venturesCount > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('ventures')}
            className={`flex items-center gap-2 py-3 px-6 border-b-2 transition-all cursor-pointer ${
              activeTab === 'ventures'
                ? 'border-amber-400 text-amber-400 font-extrabold'
                : 'border-transparent hover:text-white'
            }`}
          >
            <Store className="h-4 w-4" />
            <span>Ventures ({venturesCount})</span>
          </button>
        )}

        {isOwner && (
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-2 py-3 px-6 border-b-2 transition-all cursor-pointer ${
              activeTab === 'saved'
                ? 'border-amber-400 text-amber-400 font-extrabold'
                : 'border-transparent hover:text-white'
            }`}
          >
            <Bookmark className="h-4 w-4" />
            <span>Saved</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 py-3 px-6 border-b-2 transition-all cursor-pointer ${
            activeTab === 'activity'
              ? 'border-amber-400 text-amber-400 font-extrabold'
              : 'border-transparent hover:text-white'
          }`}
        >
          <Tag className="h-4 w-4" />
          <span>Tagged</span>
        </button>
      </div>

      {/* 3. TAB CONTENT VIEWS */}
      <div className="py-6">
        
        {/* TAB 1: INSTAGRAM 3x3 PHOTO & SNAP GRID */}
        {activeTab === 'grid' && (
          <div>
            {userPosts.length === 0 && userSnaps.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-neutral-900/40 rounded-3xl border border-neutral-800">
                <Grid className="h-12 w-12 text-neutral-600 mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">No Posts or Snaps Yet</h3>
                <p className="text-xs text-neutral-400 max-w-xs mb-4">
                  When {isOwner ? 'you share' : `${activeUser.fullName} shares`} photos or status snaps, they will appear in this grid.
                </p>
                {isOwner && onOpenCreatePost && (
                  <button
                    type="button"
                    onClick={onOpenCreatePost}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 text-xs font-bold hover:bg-amber-400 transition-all"
                  >
                    Share First Post
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 sm:gap-3">
                {userPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() =>
                      setSelectedGridItem({
                        id: post.id,
                        mediaUrl: post.mediaUrl || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
                        caption: post.content,
                        likesCount: post.likesCount,
                        createdAt: post.createdAt,
                      })
                    }
                    className="group relative aspect-square bg-neutral-900 rounded-xl overflow-hidden cursor-pointer shadow-md"
                  >
                    <img
                      src={post.mediaUrl || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800'}
                      alt={post.content}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    
                    {/* Hover Overlay Stats */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-bold text-xs sm:text-sm">
                      <span className="flex items-center gap-1">
                        <Heart className="h-4 w-4 fill-white text-white" />
                        <span>{post.likesCount}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4 fill-white text-white" />
                        <span>{post.commentsCount}</span>
                      </span>
                    </div>
                  </div>
                ))}

                {userSnaps.map((snap) => (
                  <div
                    key={snap.id}
                    onClick={() =>
                      setSelectedGridItem({
                        id: snap.id,
                        mediaUrl: snap.mediaUrl,
                        caption: snap.caption,
                        likesCount: 18,
                        viewsCount: snap.viewsCount,
                        createdAt: snap.createdAt,
                      })
                    }
                    className="group relative aspect-square bg-neutral-900 rounded-xl overflow-hidden cursor-pointer shadow-md border-2 border-amber-400/60"
                  >
                    <img
                      src={snap.mediaUrl}
                      alt={snap.caption}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-amber-500 text-neutral-950 text-[9px] font-black uppercase">
                      Snap
                    </div>

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-bold text-xs sm:text-sm">
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{snap.viewsCount}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VENTURES & TRADES */}
        {activeTab === 'ventures' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {userBusinesses.map((biz) => (
              <div
                key={biz.id}
                onClick={() => onSelectBusiness?.(biz)}
                className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-400/50 transition-all cursor-pointer shadow-lg space-y-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={biz.imageUrl}
                    alt={biz.name}
                    className="h-12 w-12 rounded-xl object-cover border border-neutral-700"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{biz.name}</span>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    </h4>
                    <span className="text-[10px] text-amber-400 font-semibold">{biz.category}</span>
                  </div>
                </div>

                <p className="text-xs text-neutral-300 line-clamp-2">{biz.description}</p>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-800">
                  <span className="font-extrabold text-emerald-400">From ₦{biz.startingPrice.toLocaleString()}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenTraderProfile) {
                          onOpenTraderProfile(biz);
                        } else {
                          onSelectBusiness?.(biz);
                        }
                      }}
                      className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-neutral-950 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Store className="h-3 w-3" />
                      <span>Trader Portfolio</span>
                    </button>
                    <a
                      href={`https://wa.me/${biz.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-neutral-950 text-[11px] font-bold transition-all flex items-center gap-1"
                    >
                      <Phone className="h-3 w-3" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: SAVED & BOOKMARKS */}
        {activeTab === 'saved' && (
          <div className="p-8 text-center bg-neutral-900/40 rounded-3xl border border-neutral-800">
            <Bookmark className="h-10 w-10 text-neutral-600 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-white mb-1">Only You Can See What You've Saved</h4>
            <p className="text-[11px] text-neutral-400">Save campus study materials, marketplace listings, or posts to view them later.</p>
          </div>
        )}

        {/* TAB 4: TAGGED & ACTIVITY */}
        {activeTab === 'activity' && (
          <div className="p-8 text-center bg-neutral-900/40 rounded-3xl border border-neutral-800">
            <Tag className="h-10 w-10 text-neutral-600 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-white mb-1">Photos & Snaps of You</h4>
            <p className="text-[11px] text-neutral-400">When people tag {displayUsername} in campus snaps or SUG political endorsements, they'll show up here.</p>
          </div>
        )}

      </div>

      {/* 4. LIGHTBOX PREVIEW MODAL */}
      {selectedGridItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={() => setSelectedGridItem(null)}
        >
          <div 
            className="relative w-full max-w-lg rounded-3xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedGridItem(null)}
              className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X className="h-4 w-4" />
            </button>

            <img
              src={selectedGridItem.mediaUrl}
              alt="Grid Preview"
              className="w-full max-h-[60vh] object-cover"
            />

            <div className="p-4 space-y-2">
              <p className="text-xs text-white leading-relaxed">{selectedGridItem.caption}</p>
              <div className="flex items-center justify-between text-xs text-neutral-400 pt-2 border-t border-neutral-800 font-mono">
                <span className="flex items-center gap-1 text-rose-400 font-bold">
                  <Heart className="h-3.5 w-3.5 fill-current" />
                  <span>{selectedGridItem.likesCount} likes</span>
                </span>
                <span>{new Date(selectedGridItem.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

    </div>
  );
};

export default UserProfileView;
