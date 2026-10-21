import React, { useState, useRef, type FormEvent } from 'react';
import { 
  X, 
  MapPin, 
  Sparkles, 
  Image as ImageIcon, 
  Camera, 
  UploadCloud, 
  Video, 
  Music, 
  Users, 
  Lock, 
  Plus, 
  Check, 
  AlertCircle,
  Radio
} from 'lucide-react';
import { CampusSnap, StudentLevel, StorySticker } from '../types';
import { useAuth } from '../context/AuthContext';
import { LiveCameraModal } from './LiveCameraModal';
import { compressImageFile } from '../utils/imageOptimizer';

interface CreateSnapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSnapCreated: (newSnap: CampusSnap) => void;
  onRequireAuth?: () => void;
}

const UNILORIN_LANDMARK_TAGS = [
  'Senate Building Walkway',
  'Walk of Fame',
  'CBT Examination Centre',
  'SUB Lounge & Quad',
  'Faculty of Arts Quad',
  'CIS Block & Basement',
  'Faculty of Engineering (ETF)',
  'Lagos Hostel Quad',
  'Abuja / Kwara Hostel',
  'Tanke Gate / Sanrab Loop',
  'UNILORIN Sports Stadium',
  'Main Auditorium Lawn',
];

const SAMPLE_MUSIC_TRACKS = [
  { id: 'm_1', title: 'Lonely at the Top', artist: 'Asake' },
  { id: 'm_2', title: 'City Boys', artist: 'Burna Boy' },
  { id: 'm_3', title: 'Commas', artist: 'Ayra Starr' },
  { id: 'm_4', title: 'UNILORIN Anthem & Beat', artist: 'Campus Foundry Ensemble' },
];

const SAMPLE_SNAP_IMAGES = [
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
];

export const CreateSnapModal: React.FC<CreateSnapModalProps> = ({
  isOpen,
  onClose,
  onSnapCreated,
  onRequireAuth,
}) => {
  const { currentUser } = useAuth();
  const [caption, setCaption] = useState('');
  const [locationTag, setLocationTag] = useState(UNILORIN_LANDMARK_TAGS[0]);
  const [selectedImage, setSelectedImage] = useState(SAMPLE_SNAP_IMAGES[0]);
  const [customMediaUrl, setCustomMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  
  // Instagram / WhatsApp Model: Audience Privacy Controls
  const [privacySetting, setPrivacySetting] = useState<'all' | 'close_friends' | 'except'>('all');
  
  // Music Track Selection
  const [selectedMusic, setSelectedMusic] = useState<typeof SAMPLE_MUSIC_TRACKS[0] | null>(null);

  // Interactive Poll Sticker Toggle
  const [includePoll, setIncludePoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('Attending today? 🔥');
  const [pollOpt1, setPollOpt1] = useState('Yes, definitely!');
  const [pollOpt2, setPollOpt2] = useState('Studying in room');

  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  if (!currentUser) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      >
        <div 
          className="relative flex flex-col w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl text-center space-y-4 text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 mx-auto">
            <Camera className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold">Sign In to Post Campus Statuses</h3>
          <p className="text-xs text-neutral-400">
            Share 24-hour auto-expiring media moments with granular privacy controls.
          </p>
          <button
            type="button"
            onClick={() => {
              onClose();
              onRequireAuth?.();
            }}
            className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 py-2.5 text-xs font-bold transition-colors cursor-pointer"
          >
            Sign In Now
          </button>
        </div>
      </div>
    );
  }

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
      }
    } catch {}
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) return;

    const stickers: StorySticker[] = [];

    if (locationTag) {
      stickers.push({
        id: `loc_${Date.now()}`,
        type: 'location',
        locationName: locationTag,
        latitude: 8.4799,
        longitude: 4.5418,
        x: 0.5,
        y: 0.22,
      });
    }

    if (includePoll && pollQuestion.trim()) {
      stickers.push({
        id: `poll_${Date.now()}`,
        type: 'poll',
        question: pollQuestion.trim(),
        options: [
          { id: 'opt_1', text: pollOpt1.trim() || 'Option 1', votes: 1 },
          { id: 'opt_2', text: pollOpt2.trim() || 'Option 2', votes: 0 },
        ],
        x: 0.5,
        y: 0.55,
      });
    }

    const newSnap: CampusSnap = {
      id: `snap_${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.fullName || 'Student',
      authorAvatar: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      authorDept: currentUser.department || 'General Studies',
      authorLevel: (currentUser.level as StudentLevel) || '300L',
      locationTag,
      mediaUrl: customMediaUrl.trim() || selectedImage,
      mediaType,
      caption: caption.trim(),
      createdAt: new Date().toISOString(),
      expiresInHours: 24,
      viewsCount: 1,
      privacySetting,
      musicTrack: selectedMusic || undefined,
      stickers,
    };

    onSnapCreated(newSnap);
    setCaption('');
    setCustomMediaUrl('');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="relative flex flex-col w-full max-w-lg rounded-3xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden max-h-[92vh] text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Create 24-Hour Campus Status</h3>
          </div>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* 1. Audience & Privacy Selection (Instagram/WhatsApp Model) */}
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-amber-400" />
              <span>Audience & Privacy Selector</span>
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPrivacySetting('all')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  privacySetting === 'all'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                <span>🌍 All Campus Contacts</span>
              </button>
              <button
                type="button"
                onClick={() => setPrivacySetting('close_friends')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  privacySetting === 'close_friends'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold ring-1 ring-emerald-400'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                <span>⭐ Close Friends & Founders</span>
              </button>
            </div>
          </div>

          {/* 2. Media Source Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Photo / Video Source
            </label>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold flex items-center justify-center gap-2 border border-neutral-700 transition-colors cursor-pointer"
              >
                <UploadCloud className="h-4 w-4 text-amber-400" />
                <span>Upload File</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => setIsLiveCameraOpen(true)}
                className="flex-1 p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold flex items-center justify-center gap-2 border border-neutral-700 transition-colors cursor-pointer"
              >
                <Camera className="h-4 w-4 text-emerald-400" />
                <span>Live Camera</span>
              </button>
            </div>

            {/* Quick Sample Presets */}
            <div className="pt-1">
              <span className="text-[10px] text-neutral-500 block mb-1">Or choose a campus preset:</span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {SAMPLE_SNAP_IMAGES.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt="Preset"
                    onClick={() => {
                      setSelectedImage(img);
                      setCustomMediaUrl('');
                    }}
                    className={`h-14 w-14 rounded-xl object-cover cursor-pointer border-2 shrink-0 ${
                      !customMediaUrl && selectedImage === img ? 'border-amber-400 scale-105' : 'border-transparent opacity-70'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 3. Status Caption */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Caption & Thoughts
            </label>
            <input
              type="text"
              required
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Studying for GNS 111 at CBT Centre..."
              className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* 4. Background Music Track (Instagram Model) */}
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Music className="h-3.5 w-3.5 text-amber-400" />
                <span>Background Soundtrack</span>
              </span>
              {selectedMusic && (
                <button type="button" onClick={() => setSelectedMusic(null)} className="text-[10px] text-rose-400 hover:underline">
                  Remove
                </button>
              )}
            </label>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              {SAMPLE_MUSIC_TRACKS.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => setSelectedMusic(track)}
                  className={`p-2 rounded-xl border text-left truncate transition-all ${
                    selectedMusic?.id === track.id
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <span className="block truncate font-bold">{track.title}</span>
                  <span className="block truncate text-[10px] text-neutral-500">{track.artist}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 5. Location Tag */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-emerald-400" />
              <span>UNILORIN Landmark Tag</span>
            </label>
            <select
              value={locationTag}
              onChange={(e) => setLocationTag(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              {UNILORIN_LANDMARK_TAGS.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          {/* 6. Interactive Poll Overlay Toggle */}
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-amber-400" />
                <span>Interactive Poll Overlay</span>
              </span>
              <button
                type="button"
                onClick={() => setIncludePoll(!includePoll)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  includePoll ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {includePoll ? 'Enabled' : '+ Add Poll'}
              </button>
            </div>

            {includePoll && (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Poll Question..."
                  className="w-full p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={pollOpt1}
                    onChange={(e) => setPollOpt1(e.target.value)}
                    placeholder="Option 1"
                    className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={pollOpt2}
                    onChange={(e) => setPollOpt2(e.target.value)}
                    placeholder="Option 2"
                    className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold hover:bg-neutral-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              Post Status (24 Hours)
            </button>
          </div>

        </form>
      </div>

      {isLiveCameraOpen && (
        <LiveCameraModal
          isOpen={isLiveCameraOpen}
          onClose={() => setIsLiveCameraOpen(false)}
          onCapture={(url, type) => {
            setCustomMediaUrl(url);
            setMediaType(type);
            setIsLiveCameraOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default CreateSnapModal;
