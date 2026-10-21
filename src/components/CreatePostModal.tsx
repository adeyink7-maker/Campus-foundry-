import { useState, useRef, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Image as ImageIcon, 
  MapPin, 
  Tag, 
  Sparkles, 
  Send, 
  ShoppingBag, 
  Camera, 
  UploadCloud, 
  EyeOff, 
  FileText, 
  Lock,
  Smartphone 
} from 'lucide-react';
import { CampusPost, StudentLevel, StudentBusiness } from '../types';
import { useAuth } from '../context/AuthContext';
import { LiveCameraModal } from './LiveCameraModal';
import { compressImageFile } from '../utils/imageOptimizer';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (newPost: CampusPost) => void;
  onRequireAuth?: () => void;
  userBusinesses?: StudentBusiness[];
}

const CATEGORIES = [
  'Academics & GNS',
  'Gist & Social',
  'Student Hustle & Trades',
  'SUG & Elections',
  'Campus Life & Hostels',
  'Events & Sports',
] as const;

const UNILORIN_LOCATIONS = [
  'Senate Building Walkway',
  'Walk of Fame',
  'CBT Complex',
  'SUB Lounge & Eateries',
  'CIS Building & Labs',
  'Engineering ETF Hall',
  'Lagos Hostel (PS)',
  'Abuja / Kwara Hostels',
  'Private Hostels (Sanusi/Arafims)',
  'Tanke Gate / Sanrab',
  'UNILORIN Sports Stadium',
  'General Studies (GNS) Quad',
];

const SAMPLE_POST_IMAGES = [
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
];

export const CreatePostModal = ({
  isOpen,
  onClose,
  onPostCreated,
  onRequireAuth,
  userBusinesses = [],
}: CreatePostModalProps) => {
  const { currentUser } = useAuth();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<CampusPost['category']>('Academics & GNS');
  const [locationTag, setLocationTag] = useState(UNILORIN_LOCATIONS[0]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [customMediaUrl, setCustomMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [restrictedUsersInput, setRestrictedUsersInput] = useState<string>('');
  const [showPrivacyOptions, setShowPrivacyOptions] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  if (!currentUser) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      >
        <div 
          className="relative flex flex-col w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl text-center space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto">
            <Send className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white">Sign In to Post on Feed</h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Please log in with your UNILORIN student profile to publish updates, GNS inquiries, and campus news.
          </p>
          <button
            type="button"
            onClick={() => {
              onClose();
              onRequireAuth?.();
            }}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 text-xs font-bold transition-colors cursor-pointer"
          >
            Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  // Handle local file upload with compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVid = file.type.startsWith('video');
    setMediaType(isVid ? 'video' : 'image');

    try {
      if (isVid) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (typeof event.target?.result === 'string') {
            setCustomMediaUrl(event.target.result);
            setSelectedImage(null);
          }
        };
        reader.readAsDataURL(file);
      } else {
        const compressed = await compressImageFile(file, {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.85,
        });
        setCustomMediaUrl(compressed);
        setSelectedImage(null);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          setCustomMediaUrl(event.target.result);
          setSelectedImage(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLiveCapture = (url: string, type: 'image' | 'video') => {
    setCustomMediaUrl(url);
    setMediaType(type);
    setSelectedImage(null);
    setIsLiveCameraOpen(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const finalMedia = customMediaUrl.trim() || selectedImage || undefined;
    
    // Privacy restriction list
    const restrictedUserIds = restrictedUsersInput
      .split(',')
      .map((u) => u.trim().replace(/^@/, ''))
      .filter((u) => u.length > 0);

    // Business snippet link if tagged
    const taggedBiz = userBusinesses.find((b) => b.id === selectedBusinessId);

    const newPost: CampusPost = {
      id: `post_${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.fullName || 'UNILORIN Student',
      authorUsername: currentUser.username || currentUser.email.split('@')[0],
      authorAvatar: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      authorFaculty: currentUser.faculty || 'Faculty of Communication & Information Sciences',
      authorDept: currentUser.department || 'Computer Science',
      authorLevel: (currentUser.level as StudentLevel) || '300L',
      authorRole: currentUser.role,
      authorAccountType: currentUser.accountType || (currentUser.role === 'trader' ? 'TRADER' : 'BUYER'),
      authorBusinessId: taggedBiz?.id,
      authorBusinessName: taggedBiz?.name,
      content: content.trim(),
      category,
      locationTag,
      mediaUrl: finalMedia,
      mediaType: finalMedia ? mediaType : undefined,
      likesCount: 1,
      likedByMe: true,
      commentsCount: 0,
      comments: [],
      createdAt: new Date().toISOString(),
      isVerifiedStudent: true,
      restrictedUserIds: restrictedUserIds.length > 0 ? restrictedUserIds : undefined,
      productSnippet: taggedBiz ? {
        title: taggedBiz.name,
        price: taggedBiz.startingPrice,
        businessId: taggedBiz.id,
        imageUrl: taggedBiz.imageUrl,
      } : undefined,
    };

    onPostCreated(newPost);
    setContent('');
    setSelectedImage(null);
    setCustomMediaUrl('');
    setRestrictedUsersInput('');
    setSelectedBusinessId('');
    onClose();
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      >
        <div 
          className="relative flex flex-col w-full max-w-xl rounded-3xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-5 py-4">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Create Campus Post</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
            {/* Category and Location Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-neutral-400 block mb-1 flex items-center gap-1">
                  <Tag className="h-3 w-3 text-emerald-400" />
                  <span>Category</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CampusPost['category'])}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-200 focus:border-emerald-500 focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-400 block mb-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-amber-400" />
                  <span>Campus Spot</span>
                </label>
                <select
                  value={locationTag}
                  onChange={(e) => setLocationTag(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-200 focus:border-emerald-500 focus:outline-none"
                >
                  {UNILORIN_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      📍 {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Post Content */}
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                Post Text / Discussion
              </label>
              <textarea
                required
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your campus update, study group question, hostel gist, or trade announcement..."
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 p-3.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none leading-relaxed"
              />
            </div>

            {/* Camera & Media Upload Actions */}
            <div className="grid grid-cols-3 gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => nativeCameraRef.current?.click()}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white py-2 px-2 text-[11px] font-bold transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
                title="Launch Native Phone Camera"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Snap Camera</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 py-2 px-2 text-[11px] font-bold transition-all cursor-pointer"
                title="Upload Photo, Video, or Document from Gallery"
              >
                <UploadCloud className="h-3.5 w-3.5 text-amber-400" />
                <span>Gallery</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => setIsLiveCameraOpen(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-700/80 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 py-2 px-2 text-[11px] font-semibold transition-all cursor-pointer"
                title="Open Live Web Viewfinder"
              >
                <Smartphone className="h-3.5 w-3.5 text-blue-400" />
                <span>Web Cam</span>
              </motion.button>

              <input 
                ref={nativeCameraRef}
                type="file" 
                accept="image/*,video/*" 
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFileUpload} 
              />
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*,video/*,.pdf,.doc,.docx" 
                style={{ display: 'none' }}
                onChange={handleFileUpload} 
              />
            </div>

            {/* Active Media Preview */}
            {customMediaUrl && (
              <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 aspect-video">
                {mediaType === 'video' ? (
                  <video src={customMediaUrl} controls className="h-full w-full object-cover" />
                ) : (
                  <img src={customMediaUrl} alt="Uploaded" className="h-full w-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => setCustomMediaUrl('')}
                  className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-950/80 text-white hover:bg-red-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Preset Stock Images Option */}
            {!customMediaUrl && (
              <div>
                <label className="text-[11px] font-semibold text-neutral-400 block mb-1.5">
                  Or attach an image preset:
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {SAMPLE_POST_IMAGES.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImage(selectedImage === img ? null : img)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        selectedImage === img
                          ? 'border-emerald-500 scale-105 shadow-md ring-2 ring-emerald-500/20'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="preset" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tag Student Venture (If user has trades) */}
            {userBusinesses.length > 0 && (
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3">
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5 flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5 text-amber-400" />
                  <span>Attach Your Campus Venture / Trade Snippet:</span>
                </label>
                <select
                  value={selectedBusinessId}
                  onChange={(e) => setSelectedBusinessId(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">None (Standard Campus Post)</option>
                  {userBusinesses.map((biz) => (
                    <option key={biz.id} value={biz.id}>
                      🛍️ {biz.name} ({biz.category})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Privacy Controls & User Visibility Restriction */}
            <div>
              <button
                type="button"
                onClick={() => setShowPrivacyOptions(!showPrivacyOptions)}
                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-emerald-400 font-medium transition-colors"
              >
                <EyeOff className="h-3.5 w-3.5" />
                <span>{showPrivacyOptions ? 'Hide Privacy Controls' : 'Fine-Grained Privacy & Visibility Controls'}</span>
              </button>

              {showPrivacyOptions && (
                <div className="mt-2 rounded-xl border border-neutral-800 bg-neutral-950 p-3 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-300">
                    <Lock className="h-3 w-3 text-amber-400" />
                    <span>Restrict Post from Specific Users:</span>
                  </div>
                  <input
                    type="text"
                    value={restrictedUsersInput}
                    onChange={(e) => setRestrictedUsersInput(e.target.value)}
                    placeholder="Enter usernames or student emails separated by commas (e.g., user_123, tobi_dev)"
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-neutral-500">
                    Restricted users won't see this post on their main or departmental feed.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
              <span className="text-[11px] text-neutral-400">
                Visible to <strong className="text-neutral-200">UNILORIN Community</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 text-xs transition-colors shadow-lg shadow-emerald-950/50 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Publish Post</span>
                </motion.button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* In-App Live Camera Modal */}
      <LiveCameraModal
        isOpen={isLiveCameraOpen}
        onClose={() => setIsLiveCameraOpen(false)}
        onCapture={handleLiveCapture}
        title="Capture Live Media for Post"
      />
    </>
  );
};
