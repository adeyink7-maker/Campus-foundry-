import React, { useState, useRef, useEffect, type FormEvent } from 'react';
import { 
  X, 
  Send, 
  MessageSquare, 
  CheckCheck, 
  Check, 
  Store, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  Phone, 
  ShoppingBag, 
  ChevronLeft,
  Sparkles,
  Zap,
  CheckCircle2,
  ExternalLink,
  Maximize2,
  Minimize2,
  LayoutGrid,
  Trash2,
  Mic,
  MicOff,
  Paperclip,
  Smile,
  Play,
  Pause,
  CornerUpLeft,
  ShieldAlert,
  UserX,
  Palette,
  Eye,
  Lock,
  Volume2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useChat, SendMessageOptions } from '../context/ChatContext';
import { useMarketplaceChat } from '../context/MarketplaceChatContext';
import { useAuth } from '../context/AuthContext';
import { ChatThemeMode } from '../types';
import { uploadVoiceNoteAudio, getPlayableAudioUrl, emitAppToast } from '../services/supabase';

export type ChatScreenRatio = 'standard' | 'wide' | 'compact';

export const ChatDrawer = () => {
  const { 
    isChatDrawerOpen, 
    closeChatDrawer, 
    primaryConversations,
    requestConversations,
    pendingRequestsCount,
    activeConversation, 
    activeConversationId, 
    setActiveConversationId, 
    activeMessages, 
    sendMessage, 
    sendTyping, 
    typingUser, 
    isConnected,
    chatTheme,
    setChatTheme,
    onlinePrivacy,
    setOnlinePrivacy,
    acceptMessageRequest,
    declineMessageRequest,
    blockMessageRequest,
    toggleMessageReaction,
    clearAllChats
  } = useChat();

  const { conversations: marketplaceConversations, openMarketplaceChat } = useMarketplaceChat();
  const { currentUser } = useAuth();
  
  // Navigation tabs: 'primary' vs 'requests' vs 'marketplace'
  const [activeTab, setActiveTab] = useState<'primary' | 'requests' | 'marketplace'>('primary');
  
  // Input & Reply state
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; senderName: string; text: string } | null>(null);
  
  // Voice note recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Real Audio Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Voice note playback speeds per message: id -> speed (1, 1.5, 2)
  const [voicePlaybackSpeeds, setVoicePlaybackSpeeds] = useState<Record<string, number>>({});
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Media Attachment Modal State
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<{ url: string; name: string; type: 'image' | 'file' } | null>(null);
  const [attachmentCaption, setAttachmentCaption] = useState('');

  // Wallpaper / Theme menu
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);

  // UI layout
  const [screenRatio, setScreenRatio] = useState<ChatScreenRatio>('standard');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, typingUser, activeConversationId]);

  // Voice recording timer
  useEffect(() => {
    if (isRecordingVoice) {
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecordingVoice]);

  // In-drawer toast notification state
  const [chatToast, setChatToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setChatToast({ message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setChatToast(null);
    }, 5000);
  };

  useEffect(() => {
    const handleGlobalToast = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.message) {
        showToast(detail.message, detail.type || 'error');
      }
    };
    window.addEventListener('campus-toast', handleGlobalToast);
    return () => {
      window.removeEventListener('campus-toast', handleGlobalToast);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  if (!isChatDrawerOpen) return null;

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const textToSend = inputText;
    setInputText('');
    sendTyping(false);

    const options: SendMessageOptions = {};
    if (replyingTo) {
      options.replyTo = replyingTo;
      setReplyingTo(null);
    }

    try {
      await sendMessage(textToSend, options);
    } catch (err: any) {
      console.error('[Send Message Error]:', err?.message || err);
      showToast(`Failed to send message: ${err?.message || 'Database error'}`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    sendTyping(e.target.value.length > 0);
  };

  const handleStartVoiceRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        const msg = 'Microphone recording is not supported in this browser environment.';
        showToast(msg);
        setMicPermissionDenied(true);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      // Pick recorder format with MediaRecorder.isTypeSupported (audio/webm first, then audio/mp4 for Safari)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(200);
      setMicPermissionDenied(false);
      setMicErrorMessage(null);
      setIsRecordingVoice(true);
    } catch (err: any) {
      const isPermissionDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.name === 'SecurityError';

      const isNotFound =
        err?.name === 'NotFoundError' ||
        err?.name === 'DevicesNotFoundError';

      let msg = '';
      if (isPermissionDenied) {
        msg = 'Microphone access was blocked or denied (NotAllowedError). Please allow microphone permissions in your browser or preview frame settings.';
        console.warn('[Microphone Access Error]: Microphone permission was denied by browser or user.', {
          name: err?.name,
          message: err?.message,
          statusCode: 403,
        });
      } else if (isNotFound) {
        msg = 'No microphone device was found (NotFoundError). Please connect a microphone to record voice notes.';
        console.warn('[Microphone Access Error]: No microphone device found.', {
          name: err?.name,
          message: err?.message,
          statusCode: 404,
        });
      } else {
        msg = `Could not access microphone (${err?.name || 'Error'}): ${err?.message || 'Device inaccessible'}`;
        console.warn('[Microphone Access Error]:', {
          name: err?.name,
          message: err?.message,
          statusCode: err?.statusCode || 500,
        });
      }

      showToast(msg);
      setMicErrorMessage(msg);
      setMicPermissionDenied(true);
    }
  };

  const handleCancelVoiceRecording = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      audioChunksRef.current = [];
    } catch {
      // safe cleanup
    }
    setMicPermissionDenied(false);
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  const handleSendVoiceRecording = async () => {
    setIsUploadingVoice(true);
    const duration = Math.max(1, recordingSeconds);
    const userId = currentUser?.id || 'usr_me';

    let voiceNotePath = '';

    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        await new Promise<void>((resolve) => {
          if (!mediaRecorderRef.current) return resolve();
          mediaRecorderRef.current.onstop = () => resolve();
          mediaRecorderRef.current.stop();
        });
      }

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;

      if (audioChunksRef.current.length > 0) {
        const rawMime = audioChunksRef.current[0].type || 'audio/webm';
        const cleanMime = rawMime.split(';')[0].trim();
        const audioBlob = new Blob(audioChunksRef.current, { type: cleanMime });
        audioChunksRef.current = [];

        // Uploads the audio to Supabase Storage at `${currentUser.id}/${uuid}.${ext}` in the audio bucket
        voiceNotePath = await uploadVoiceNoteAudio(audioBlob, userId);
      } else {
        const errorMsg = 'No audio recorded. Please hold the mic to record audio before sending.';
        console.error('[Voice Note Recording Error]: Empty audio chunk buffer');
        showToast(errorMsg);
        setIsUploadingVoice(false);
        setIsRecordingVoice(false);
        setRecordingSeconds(0);
        return;
      }

      // Dynamic campus waveform
      const sampleWaveform = Array.from({ length: 14 }, () => Math.floor(Math.random() * 65 + 30));

      // 2. Inserts a chat_messages row with sender_id, recipient_id, conversation_id, voice_note_url, voice_duration and voice_waveform
      await sendMessage('', {
        voiceNote: {
          url: voiceNotePath,
          duration,
          waveform: sampleWaveform,
        },
        replyTo: replyingTo || undefined,
      });
    } catch (err: any) {
      console.error('[Send Voice Note Error]:', {
        message: err?.message,
        code: (err as any)?.code || (err as any)?.statusCode,
        details: err?.details || err?.message,
        raw: err,
      });
      showToast(err?.message ? `Failed to send voice note: ${err.message}` : 'Failed to send voice note. Please try again.');
    } finally {
      setIsUploadingVoice(false);
      setIsRecordingVoice(false);
      setMicPermissionDenied(false);
      setRecordingSeconds(0);
      setReplyingTo(null);
    }
  };

  const handleToggleVoicePlay = (msgId: string, url: string) => {
    if (playingVoiceId === msgId) {
      audioPlayerRef.current?.pause();
      setPlayingVoiceId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      // 3. loads and plays voice notes from those columns in the chat view
      const playableSrc = getPlayableAudioUrl(url);
      const audio = new Audio(playableSrc);
      const currentSpeed = voicePlaybackSpeeds[msgId] || 1;
      audio.playbackRate = currentSpeed;
      audio.onended = () => setPlayingVoiceId(null);
      audio.onerror = (e) => {
        console.error('[Audio Playback Error]: Failed to stream audio from source:', {
          source: playableSrc,
          originalUrl: url,
          error: e,
        });
        showToast(`Could not play voice note: failed to stream from storage (${url})`);
        setPlayingVoiceId(null);
      };
      audio.play().catch((playErr) => {
        console.error('[Audio Playback Error]:', playErr?.message || playErr);
        showToast(`Audio playback error: ${playErr?.message || 'Playback failed'}`);
        setPlayingVoiceId(null);
      });
      audioPlayerRef.current = audio;
      setPlayingVoiceId(msgId);
    }
  };

  const handleCycleSpeed = (msgId: string) => {
    const currentSpeed = voicePlaybackSpeeds[msgId] || 1;
    const nextSpeed = currentSpeed === 1 ? 1.5 : currentSpeed === 1.5 ? 2 : 1;
    setVoicePlaybackSpeeds((prev) => ({ ...prev, [msgId]: nextSpeed }));
    if (playingVoiceId === msgId && audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = nextSpeed;
    }
  };

  const handleSendAttachment = async () => {
    if (!attachmentPreview) return;
    await sendMessage(attachmentCaption.trim(), {
      attachment: attachmentPreview,
      replyTo: replyingTo || undefined,
    });
    setAttachmentPreview(null);
    setAttachmentCaption('');
    setIsAttachmentModalOpen(false);
    setReplyingTo(null);
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Dynamic Wallpaper styles (WhatsApp / Dark AMOLED / Emerald / Neon)
  const getThemeBackground = () => {
    switch (chatTheme) {
      case 'whatsapp':
        return 'bg-[#0b141a] bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:16px_16px]';
      case 'emerald':
        return 'bg-neutral-950 bg-[radial-gradient(#064e3b_1px,transparent_1px)] [background-size:20px_20px]';
      case 'neon':
        return 'bg-slate-950 bg-[linear-gradient(to_right,#1e1b4b_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b_1px,transparent_1px)] [background-size:24px_24px]';
      case 'dark':
      default:
        return 'bg-neutral-950';
    }
  };

  const isCurrentConvARequest = Boolean(
    activeConversation &&
    activeConversation.isMessageRequest &&
    activeConversation.requestStatus === 'pending'
  );

  const ratioClasses = {
    compact: 'sm:max-w-3xl sm:h-[82vh]',
    standard: 'sm:max-w-5xl sm:h-[88vh]',
    wide: 'sm:max-w-7xl sm:h-[94vh]',
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={closeChatDrawer}
    >
      <div 
        className={`w-full h-full ${ratioClasses[screenRatio]} rounded-none sm:rounded-3xl border border-neutral-800 bg-neutral-900/95 shadow-2xl flex flex-col overflow-hidden text-neutral-100 transition-all duration-300 relative`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Error / Alert Toast Notification */}
        {chatToast && (
          <div className={`absolute top-16 left-4 right-4 z-50 flex items-center justify-between gap-3 p-3.5 rounded-2xl border shadow-2xl backdrop-blur-md animate-in slide-in-from-top-3 ${
            chatToast.type === 'success'
              ? 'bg-emerald-600/95 border-emerald-400 text-white'
              : 'bg-rose-600/95 border-rose-400 text-white'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="h-4 w-4 shrink-0 text-white" />
              <span className="text-xs font-semibold truncate">{chatToast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setChatToast(null)}
              className="p-1 rounded-lg hover:bg-white/20 text-white shrink-0 cursor-pointer"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        
        {/* ======================================================== */}
        {/* TOP ENTERPRISE HEADER BAR (WhatsApp / Instagram Hybrid) */}
        {/* ======================================================== */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md shrink-0">
          
          <div className="flex items-center gap-3 min-w-0">
            {activeConversation ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveConversationId(null)}
                  className="sm:hidden p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="relative">
                  <div className="h-10 w-10 rounded-full overflow-hidden border border-neutral-700 bg-neutral-800 flex items-center justify-center shrink-0">
                    {activeConversation.businessImageUrl ? (
                      <img 
                        src={activeConversation.businessImageUrl} 
                        alt={activeConversation.businessName} 
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      <Store className="h-5 w-5 text-amber-400" />
                    )}
                  </div>
                  {activeConversation.isOnline && onlinePrivacy !== 'nobody' && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-neutral-950 ring-1 ring-emerald-400" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-[280px]">
                      {activeConversation.businessName}
                    </h3>
                    <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                    {isCurrentConvARequest && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Request
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                    <span className="truncate">{activeConversation.traderName}</span>
                    <span>•</span>
                    <span className="text-amber-400/90 font-medium">
                      {activeConversation.traderHostel || 'Campus Student'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Direct Messages</span>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-normal">
                      <Lock className="h-3 w-3" /> E2EE
                    </span>
                  </h3>
                  <p className="text-[11px] text-neutral-400">WhatsApp & X/Twitter Hybrid Architecture</p>
                </div>
              </div>
            )}
          </div>

          {/* Top Actions: Theme Switcher, Screen Ratio, Close */}
          <div className="flex items-center gap-1.5">
            
            {/* Theme Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowThemeMenu(!showThemeMenu);
                  setShowPrivacyMenu(false);
                }}
                className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Change Chat Wallpaper Theme"
              >
                <Palette className="h-4 w-4 text-amber-400" />
              </button>

              {showThemeMenu && (
                <div className="absolute right-0 top-11 z-50 w-44 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-1.5 text-xs animate-in fade-in">
                  <div className="px-2 py-1 text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                    Wallpaper Theme
                  </div>
                  {(['whatsapp', 'dark', 'emerald', 'neon'] as ChatThemeMode[]).map((theme) => (
                    <button
                      key={theme}
                      type="button"
                      onClick={() => {
                        setChatTheme(theme);
                        setShowThemeMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl capitalize font-medium text-left transition-colors ${
                        chatTheme === theme ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <span>{theme} Theme</span>
                      {chatTheme === theme && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Privacy Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowPrivacyMenu(!showPrivacyMenu);
                  setShowThemeMenu(false);
                }}
                className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Online Status Privacy"
              >
                <Eye className="h-4 w-4 text-emerald-400" />
              </button>

              {showPrivacyMenu && (
                <div className="absolute right-0 top-11 z-50 w-48 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-1.5 text-xs animate-in fade-in">
                  <div className="px-2 py-1 text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                    Online Status Visibility
                  </div>
                  {[
                    { id: 'everyone', label: 'Everyone' },
                    { id: 'contacts', label: 'My Contacts Only' },
                    { id: 'nobody', label: 'Nobody (Invisible)' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setOnlinePrivacy(item.id as any);
                        setShowPrivacyMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-medium text-left transition-colors ${
                        onlinePrivacy === item.id ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <span>{item.label}</span>
                      {onlinePrivacy === item.id && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Screen Ratio Switcher */}
            <button
              type="button"
              onClick={() => {
                setScreenRatio((prev) => (prev === 'standard' ? 'wide' : prev === 'wide' ? 'compact' : 'standard'));
              }}
              className="hidden sm:flex p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
              title="Toggle Window Ratio"
            >
              {screenRatio === 'wide' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={closeChatDrawer}
              className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* MAIN TWO-PANEL SPLIT BODY */}
        {/* ======================================================== */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* ------------------------------------------------------ */}
          {/* LEFT CONVERSATION LIST (Primary vs Requests) */}
          {/* ------------------------------------------------------ */}
          <div className={`${activeConversation ? 'hidden sm:flex' : 'flex'} w-full sm:w-80 md:w-96 flex-col border-r border-neutral-800 bg-neutral-950/70 shrink-0`}>
            
            {/* X/Twitter Tab Switcher: Primary vs Requests vs Marketplace */}
            <div className="p-3 border-b border-neutral-800 bg-neutral-950 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('primary')}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  activeTab === 'primary'
                    ? 'bg-amber-500 text-neutral-950 shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
                }`}
              >
                <span>Primary</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'primary' ? 'bg-neutral-950/20 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-400'
                }`}>
                  {primaryConversations.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  activeTab === 'requests'
                    ? 'bg-amber-500 text-neutral-950 shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
                }`}
              >
                <span>Requests</span>
                {pendingRequestsCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500 text-white font-extrabold animate-pulse">
                    {pendingRequestsCount}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-neutral-800 text-neutral-400">
                    0
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('marketplace')}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  activeTab === 'marketplace'
                    ? 'bg-amber-500 text-neutral-950 shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Marketplace</span>
                {marketplaceConversations.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    activeTab === 'marketplace' ? 'bg-neutral-950/20 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {marketplaceConversations.length}
                  </span>
                )}
              </button>
            </div>

            {/* Conversation Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-900/60 p-2 space-y-1">
              
              {activeTab === 'primary' ? (
                primaryConversations.length === 0 ? (
                  <div className="p-8 text-center text-neutral-500 text-xs">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-neutral-600" />
                    <p className="font-bold text-neutral-300">No active chats yet</p>
                    <p className="text-[11px] mt-1">Start a conversation with student founders on the Campus Marketplace.</p>
                  </div>
                ) : (
                  primaryConversations.map((conv) => {
                    const isSelected = conv.id === activeConversationId;
                    return (
                      <div
                        key={conv.id}
                        onClick={() => setActiveConversationId(conv.id)}
                        className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'bg-neutral-800/90 border border-neutral-700/80 shadow-md'
                            : 'hover:bg-neutral-900/70'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={conv.businessImageUrl || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=100'}
                            alt={conv.businessName}
                            className="h-11 w-11 rounded-2xl object-cover border border-neutral-700"
                          />
                          {conv.isOnline && onlinePrivacy !== 'nobody' && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-neutral-950" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-white truncate">{conv.businessName}</h4>
                            <span className="text-[10px] text-neutral-500 font-mono">
                              {formatMessageTime(conv.lastMessageTimestamp)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-[11px] text-neutral-400 truncate pr-2">
                              {conv.lastMessage}
                            </p>
                            {conv.unreadCount > 0 && (
                              <span className="h-4 min-w-[16px] px-1 rounded-full bg-amber-500 text-neutral-950 text-[10px] font-bold font-mono flex items-center justify-center">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )
              ) : activeTab === 'requests' ? (
                /* REQUESTS TAB (X / Twitter Inbound Requests) */
                requestConversations.length === 0 ? (
                  <div className="p-8 text-center text-neutral-500 text-xs">
                    <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                    <p className="font-bold text-neutral-300">No message requests</p>
                    <p className="text-[11px] mt-1">Direct messaging is restricted. Inbound messages from non-contacts will appear here for review.</p>
                  </div>
                ) : (
                  requestConversations.map((req) => {
                    const isSelected = req.id === activeConversationId;
                    return (
                      <div
                        key={req.id}
                        onClick={() => setActiveConversationId(req.id)}
                        className={`p-3 rounded-2xl cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/40 shadow-md'
                            : 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={req.businessImageUrl || 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=100'}
                            alt={req.businessName}
                            className="h-10 w-10 rounded-2xl object-cover border border-neutral-700 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-white truncate">{req.businessName}</h4>
                              <span className="text-[9px] font-mono text-amber-400 font-bold uppercase">Pending</span>
                            </div>
                            <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                              {req.lastMessage}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                /* MARKETPLACE TAB (marketplace_conversations) */
                marketplaceConversations.length === 0 ? (
                  <div className="p-8 text-center text-neutral-500 text-xs space-y-2">
                    <Store className="h-8 w-8 mx-auto text-amber-400" />
                    <p className="font-bold text-neutral-300">No marketplace chats yet</p>
                    <p className="text-[11px] text-neutral-400">
                      When you tap "Message trader" on any product or store, your trade inquiries will appear here.
                    </p>
                  </div>
                ) : (
                  marketplaceConversations.map((conv) => {
                    const isTrader = currentUser && currentUser.id === conv.traderId;
                    const unread = isTrader ? conv.traderUnread : conv.buyerUnread;
                    const displayName = isTrader
                      ? (conv.buyerName || conv.businessName || 'Student Buyer')
                      : (conv.businessName || 'Campus Store');

                    return (
                      <div
                        key={conv.id}
                        onClick={() => openMarketplaceChat(conv.id)}
                        className="p-3.5 rounded-2xl cursor-pointer transition-all border bg-neutral-900/80 hover:bg-neutral-800 border-neutral-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 overflow-hidden shrink-0 flex items-center justify-center">
                            {conv.businessImageUrl ? (
                              <img src={conv.businessImageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Store className="w-5 h-5 text-amber-400" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-xs font-bold text-white truncate">{displayName}</h4>
                              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase ${
                                conv.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                                conv.status === 'declined' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-rose-500/20 text-rose-400'
                              }`}>
                                {conv.status}
                              </span>
                            </div>

                            <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                              {conv.lastMessage || 'No messages yet'}
                            </p>
                          </div>
                        </div>

                        {unread > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-neutral-950 text-[10px] font-extrabold shrink-0">
                            {unread}
                          </span>
                        )}
                      </div>
                    );
                  })
                )
              )}

            </div>

            {/* Bottom Clear History / Reset */}
            <div className="p-2 border-t border-neutral-800/80 bg-neutral-950 flex items-center justify-between text-[11px] text-neutral-500">
              <span className="font-mono">E2EE Verified</span>
              <button
                type="button"
                onClick={clearAllChats}
                className="hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear History</span>
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------ */}
          {/* RIGHT CHAT WINDOW (WhatsApp / Instagram Interaction UI) */}
          {/* ------------------------------------------------------ */}
          <div className={`${activeConversation ? 'flex' : 'hidden sm:flex'} flex-1 flex-col overflow-hidden relative ${getThemeBackground()}`}>
            
            {activeConversation ? (
              <>
                {/* E2EE Security Banner */}
                <div className="p-2.5 bg-neutral-950/80 border-b border-neutral-800/80 text-center text-[10px] text-amber-300/80 flex items-center justify-center gap-1.5 backdrop-blur-md">
                  <Lock className="h-3 w-3 text-amber-400" />
                  <span>Messages and calls are end-to-end encrypted. No one outside of this chat can read them.</span>
                </div>

                {/* Twitter / X Message Request Banner */}
                {isCurrentConvARequest && (
                  <div className="p-4 bg-amber-500/10 border-b border-amber-500/30 backdrop-blur-md space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                      <ShieldAlert className="h-4 w-4" />
                      <span>Message Request from {activeConversation.traderName} ({activeConversation.businessName})</span>
                    </div>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      Accept to reply and allow them to message you directly. They won't know you've previewed this until you accept.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => acceptMessageRequest(activeConversation.id)}
                        className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        Accept Request
                      </button>
                      <button
                        type="button"
                        onClick={() => declineMessageRequest(activeConversation.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => blockMessageRequest(activeConversation.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <UserX className="h-3.5 w-3.5" />
                        <span>Block & Report</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Messages Stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {activeMessages.map((msg) => {
                    const isMe = msg.senderId === (currentUser?.id || 'usr_me') || msg.senderName === 'You';
                    const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group/msg relative`}
                      >
                        {/* Quoted Message / Swipe-to-Reply snippet */}
                        {msg.replyToMessage && (
                          <div className={`mb-1 max-w-sm rounded-xl p-2 text-xs border border-neutral-700 bg-neutral-850/80 text-neutral-300 flex items-start gap-1.5 ${isMe ? 'mr-1' : 'ml-1'}`}>
                            <CornerUpLeft className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                            <div className="truncate">
                              <span className="font-bold text-amber-400 text-[10px] block">{msg.replyToMessage.senderName}</span>
                              <span className="text-[11px] truncate block text-neutral-300">{msg.replyToMessage.text}</span>
                            </div>
                          </div>
                        )}

                        {/* Main Message Bubble */}
                        <div
                          className={`relative max-w-[85%] sm:max-w-md rounded-2xl p-3 shadow-md transition-all ${
                            isMe
                              ? 'bg-amber-500 text-neutral-950 font-medium rounded-tr-sm'
                              : 'bg-neutral-800/90 text-white rounded-tl-sm border border-neutral-700/80 backdrop-blur-md'
                          }`}
                        >
                          {/* Sender name for non-me */}
                          {!isMe && (
                            <div className="text-[10px] font-bold text-amber-400 mb-0.5">
                              {msg.senderName}
                            </div>
                          )}

                          {/* Media Attachment Render */}
                          {msg.attachmentUrl && (
                            <div className="mb-2 rounded-xl overflow-hidden border border-black/20 max-h-60 bg-neutral-950">
                              {msg.attachmentType === 'image' ? (
                                <img src={msg.attachmentUrl} alt="Attachment" className="w-full h-full object-cover" />
                              ) : (
                                <div className="p-3 flex items-center gap-2 text-xs text-white">
                                  <Paperclip className="h-4 w-4 text-amber-400" />
                                  <span className="truncate">{msg.attachmentName || 'Document'}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Voice Note Player (Instagram / WhatsApp Waveform) */}
                          {msg.voiceNoteUrl && (
                            <div className={`p-2 rounded-xl mb-1 flex items-center gap-2.5 ${isMe ? 'bg-amber-600/30' : 'bg-neutral-900/80'}`}>
                              <button
                                type="button"
                                onClick={() => handleToggleVoicePlay(msg.id, msg.voiceNoteUrl!)}
                                className={`h-8 w-8 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
                                  isMe ? 'bg-neutral-950 text-amber-400' : 'bg-amber-500 text-neutral-950'
                                }`}
                              >
                                {playingVoiceId === msg.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                              </button>

                              {/* Waveform Visualization Bars */}
                              <div className="flex-1 flex items-center gap-1 h-6">
                                {(msg.voiceWaveform || [40, 70, 90, 50, 80, 60, 30, 95, 75, 45]).map((val, idx) => (
                                  <span
                                    key={idx}
                                    style={{ height: `${Math.max(15, val)}%` }}
                                    className={`w-1 rounded-full ${
                                      playingVoiceId === msg.id ? 'bg-emerald-400 animate-pulse' : isMe ? 'bg-neutral-950/70' : 'bg-neutral-400'
                                    }`}
                                  />
                                ))}
                              </div>

                              <span className="text-[10px] font-mono font-bold">
                                0:0{msg.voiceDuration || 6}
                              </span>

                              {/* Speed Switcher (1x -> 1.5x -> 2x) */}
                              <button
                                type="button"
                                onClick={() => handleCycleSpeed(msg.id)}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                                  isMe ? 'border-neutral-950/30 bg-neutral-950/20' : 'border-neutral-700 bg-neutral-800'
                                }`}
                              >
                                {voicePlaybackSpeeds[msg.id] || 1}x
                              </button>
                            </div>
                          )}

                          {/* Message Text */}
                          {msg.text && (
                            <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                              {msg.text}
                            </p>
                          )}

                          {/* Bottom Meta & Delivery Tick States */}
                          <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? 'text-neutral-900/70' : 'text-neutral-400'}`}>
                            <span>{formatMessageTime(msg.timestamp)}</span>
                            {isMe && (
                              <span title={msg.isRead || msg.deliveryState === 'read' ? 'Read' : 'Sent'}>
                                {msg.isRead || msg.deliveryState === 'read' ? (
                                  <CheckCheck className="h-3.5 w-3.5 text-sky-700 font-extrabold" />
                                ) : (
                                  <Check className="h-3.5 w-3.5 text-neutral-800" />
                                )}
                              </span>
                            )}
                          </div>

                          {/* Quick Emoji Reaction Trigger (on hover) */}
                          <div className="absolute top-1 -right-16 hidden group-hover/msg:flex items-center gap-1 bg-neutral-900 border border-neutral-700 rounded-full p-1 shadow-lg z-10 animate-in fade-in">
                            {['❤️', '👍', '🔥', '😂', '👏'].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => toggleMessageReaction(msg.id, emoji)}
                                className="text-xs hover:scale-125 transition-transform p-0.5 cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setReplyingTo({ id: msg.id, senderName: msg.senderName, text: msg.text || 'Voice note' })}
                              className="text-neutral-400 hover:text-white p-0.5"
                              title="Quote Reply"
                            >
                              <CornerUpLeft className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Reaction Badges on Bubble */}
                        {hasReactions && (
                          <div className={`flex items-center gap-1 -mt-2 z-10 ${isMe ? 'mr-2' : 'ml-2'}`}>
                            {Object.entries(msg.reactions!).map(([emoji, users]) => (
                              <span
                                key={emoji}
                                onClick={() => toggleMessageReaction(msg.id, emoji)}
                                className="px-1.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-700 text-[11px] shadow-sm flex items-center gap-1 cursor-pointer hover:scale-105 transition-transform"
                              >
                                <span>{emoji}</span>
                                <span className="text-[9px] font-mono text-neutral-400 font-bold">{users.length}</span>
                              </span>
                            ))}
                          </div>
                        )}

                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quoted Message Active Bar */}
                {replyingTo && (
                  <div className="px-4 py-2 bg-neutral-900/90 border-t border-neutral-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <CornerUpLeft className="h-4 w-4 text-amber-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-amber-400 block text-[10px]">Replying to {replyingTo.senderName}</span>
                        <span className="text-neutral-300 text-[11px] truncate block">{replyingTo.text}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="p-1 text-neutral-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* ==================================================== */}
                {/* BOTTOM COMPOSER INPUT BAR (WhatsApp / Instagram Model) */}
                {/* ==================================================== */}
                <div className="p-3 border-t border-neutral-800 bg-neutral-950/90 backdrop-blur-md">
                  {/* Clear Microphone Permission Denied Notice */}
                  {micPermissionDenied && (
                    <div className="mb-2.5 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-start justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <MicOff className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-semibold text-amber-300">Microphone Access Issue</p>
                          <p className="text-[11px] text-neutral-300 mt-0.5 leading-relaxed">
                            {micErrorMessage || 'The preview environment or browser blocked microphone access. Please allow microphone permissions in your browser address bar or preview frame settings to record and send voice notes.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={handleStartVoiceRecording}
                          className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Try Again
                        </button>
                        <button
                          type="button"
                          onClick={() => setMicPermissionDenied(false)}
                          className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer"
                          title="Dismiss notice"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {isRecordingVoice ? (
                    /* Active Voice Note Recording Mode */
                    <div className="flex items-center justify-between gap-3 p-2 bg-neutral-900 rounded-2xl border border-rose-500/40 animate-pulse">
                      <div className="flex items-center gap-2">
                        <Mic className="h-5 w-5 text-rose-400 animate-bounce" />
                        <div className="flex flex-col">
                          <span className="text-xs font-mono font-bold text-rose-400">
                            Recording... {recordingSeconds}s
                          </span>
                          <span className="text-[10px] text-neutral-400">Capturing audio</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCancelVoiceRecording}
                          className="px-3 py-1.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-bold hover:bg-neutral-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isUploadingVoice}
                          onClick={handleSendVoiceRecording}
                          className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-60 cursor-pointer"
                        >
                          {isUploadingVoice ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5" />
                              <span>Send Audio</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Standard Messaging Composer */
                    <form onSubmit={handleSend} className="flex items-center gap-2">
                      
                      {/* Media Attachment Button */}
                      <button
                        type="button"
                        onClick={() => setIsAttachmentModalOpen(true)}
                        className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-amber-400 transition-colors"
                        title="Attach Photo or Document"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>

                      {/* Text Input */}
                      <input
                        type="text"
                        value={inputText}
                        onChange={handleInputChange}
                        placeholder={isCurrentConvARequest ? "Accept request above to respond..." : "Type a message..."}
                        disabled={isCurrentConvARequest}
                        className="flex-1 px-4 py-2.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-50"
                      />

                      {/* Voice Note or Send Button */}
                      {inputText.trim() ? (
                        <button
                          type="submit"
                          className="p-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold shadow-md transition-transform active:scale-95 cursor-pointer"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleStartVoiceRecording}
                          disabled={isCurrentConvARequest}
                          className={`p-2.5 rounded-2xl border transition-all cursor-pointer disabled:opacity-50 ${
                            micPermissionDenied
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30'
                              : 'bg-neutral-900 border-neutral-800 text-amber-400 hover:bg-amber-500 hover:text-neutral-950'
                          }`}
                          title={micPermissionDenied ? 'Microphone permission blocked - click to retry' : 'Record Voice Note'}
                        >
                          {micPermissionDenied ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </button>
                      )}
                    </form>
                  )}
                </div>
              </>
            ) : (
              /* Empty Placeholder */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-500 space-y-3">
                <div className="h-16 w-16 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-400 shadow-xl">
                  <MessageSquare className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Select a conversation or request</h4>
                  <p className="text-xs text-neutral-400 max-w-xs mt-1">
                    Direct messaging follows X/Twitter privacy requests with WhatsApp modern delivery states & voice notes.
                  </p>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* ======================================================== */}
      {/* MEDIA ATTACHMENT MODAL */}
      {/* ======================================================== */}
      {isAttachmentModalOpen && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setIsAttachmentModalOpen(false)}
        >
          <div 
            className="w-full max-w-md rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-amber-400" />
                <span>Send Photo or Document</span>
              </h3>
              <button type="button" onClick={() => setIsAttachmentModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Demo Previews */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-neutral-400 block">Select Sample Attachment:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAttachmentPreview({
                    url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600',
                    name: 'Food Menu Photo',
                    type: 'image'
                  })}
                  className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-400 text-left text-xs text-neutral-200"
                >
                  📸 Product Photo
                </button>
                <button
                  type="button"
                  onClick={() => setAttachmentPreview({
                    url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600',
                    name: 'Receipt_Zamfara_Delivery.pdf',
                    type: 'file'
                  })}
                  className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-400 text-left text-xs text-neutral-200"
                >
                  📄 Receipt PDF
                </button>
              </div>
            </div>

            {attachmentPreview && (
              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
                  <span>Attached: {attachmentPreview.name}</span>
                </div>
                <input
                  type="text"
                  value={attachmentCaption}
                  onChange={(e) => setAttachmentCaption(e.target.value)}
                  placeholder="Add a caption..."
                  className="w-full p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAttachmentModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-neutral-800 text-xs font-semibold hover:bg-neutral-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendAttachment}
                disabled={!attachmentPreview}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-md disabled:opacity-40"
              >
                Send Attachment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ChatDrawer;
