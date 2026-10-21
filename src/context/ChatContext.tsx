import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { 
  ChatMessage, 
  ChatConversation, 
  ChatOrderSnippet, 
  StudentBusiness, 
  ChatThemeMode,
} from '../types';
import { useAuth } from './AuthContext';

export interface SendMessageOptions {
  orderSnippet?: ChatOrderSnippet;
  voiceNote?: {
    url: string;
    duration: number;
    waveform: number[];
  };
  attachment?: {
    url: string;
    type: 'image' | 'file';
    name: string;
  };
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
}

interface ChatContextType {
  conversations: ChatConversation[];
  primaryConversations: ChatConversation[];
  requestConversations: ChatConversation[];
  activeConversationId: string | null;
  activeConversation: ChatConversation | null;
  activeMessages: ChatMessage[];
  unreadTotalCount: number;
  pendingRequestsCount: number;
  isConnected: boolean;
  isChatDrawerOpen: boolean;
  typingUser: string | null;
  chatTheme: ChatThemeMode;
  setChatTheme: (theme: ChatThemeMode) => void;
  onlinePrivacy: 'everyone' | 'contacts' | 'nobody';
  setOnlinePrivacy: (pref: 'everyone' | 'contacts' | 'nobody') => void;
  openChatDrawer: (targetTab?: 'primary' | 'requests' | any) => void;
  closeChatDrawer: () => void;
  setActiveConversationId: (id: string | null) => void;
  openChatWithBusiness: (
    business: StudentBusiness,
    initialMessage?: string,
    orderSnippet?: ChatOrderSnippet,
    asMessageRequest?: boolean
  ) => void;
  sendMessage: (text: string, options?: SendMessageOptions) => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
  markConversationRead: (conversationId: string) => void;
  acceptMessageRequest: (conversationId: string) => void;
  declineMessageRequest: (conversationId: string) => void;
  blockMessageRequest: (conversationId: string) => void;
  toggleMessageReaction: (messageId: string, emoji: string) => void;
  clearAllChats: () => void;
}

const STORAGE_CHATS_KEY = 'campus_foundry_chat_messages_v5';
const STORAGE_CONVS_KEY = 'campus_foundry_chat_conversations_v5';
const STORAGE_THEME_KEY = 'campus_foundry_chat_theme';
const STORAGE_PRIVACY_KEY = 'campus_foundry_chat_online_privacy';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Initial demo conversations demonstrating both established chats and X/Twitter message requests
const INITIAL_DEMO_CONVERSATIONS: ChatConversation[] = [
  {
    id: 'conv_campus_bites_1',
    businessId: 'biz_1',
    businessName: 'Campus Bites & Grills',
    businessImageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300',
    traderName: 'Tunde Bakare',
    traderId: 'tunde@unilorin.edu.ng',
    traderHostel: 'Zamfara Hostel (Male)',
    buyerId: 'usr_me',
    buyerName: 'You',
    lastMessage: 'Your smoky jollof and turkey is on the way to your hostel room!',
    lastMessageTimestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    unreadCount: 0,
    isMessageRequest: false,
    requestStatus: 'accepted',
    isOnline: true,
    lastSeen: 'Online',
  },
  {
    id: 'conv_req_gadget_dr',
    businessId: 'biz_req_1',
    businessName: 'Gadget Doctor & Tech Lab',
    businessImageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=300',
    traderName: 'Amina Al-Hassan',
    traderId: 'amina_tech@unilorin.edu.ng',
    traderHostel: 'Abuja Hostel (Female)',
    buyerId: 'usr_me',
    buyerName: 'You',
    lastMessage: 'Hello! Saw your enquiry about replacing the MacBook M1 screen. We have genuine OEM parts in stock.',
    lastMessageTimestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    unreadCount: 1,
    isMessageRequest: true,
    requestStatus: 'pending',
    isOnline: true,
    lastSeen: 'Online',
  },
  {
    id: 'conv_req_tutor_peer',
    businessId: 'biz_req_2',
    businessName: 'CIS Peer Tutoring & Code Prep',
    businessImageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300',
    traderName: 'David Oladipo',
    traderId: 'david_cis@unilorin.edu.ng',
    traderHostel: 'Private Hostel, Sanrab',
    buyerId: 'usr_me',
    buyerName: 'You',
    lastMessage: 'Hi, are you still interested in joining the Data Structures & Algorithm intensive study cohort this weekend?',
    lastMessageTimestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    unreadCount: 1,
    isMessageRequest: true,
    requestStatus: 'pending',
    isOnline: false,
    lastSeen: 'last seen today at 13:45',
  },
];

const INITIAL_DEMO_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_demo_1',
    conversationId: 'conv_campus_bites_1',
    businessId: 'biz_1',
    businessName: 'Campus Bites & Grills',
    senderId: 'usr_me',
    senderName: 'You',
    senderRole: 'student',
    recipientId: 'tunde@unilorin.edu.ng',
    recipientName: 'Tunde Bakare',
    text: 'Good afternoon! Please can I get the Grilled Peppered Turkey and Jollof Combo delivered to Lagos Hostel?',
    timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    isRead: true,
    deliveryState: 'read',
    hostelLocation: 'Lagos Hostel',
  },
  {
    id: 'msg_demo_2',
    conversationId: 'conv_campus_bites_1',
    businessId: 'biz_1',
    businessName: 'Campus Bites & Grills',
    senderId: 'tunde@unilorin.edu.ng',
    senderName: 'Tunde Bakare',
    senderRole: 'trader',
    recipientId: 'usr_me',
    recipientName: 'You',
    text: 'Yes definitely! We are packaging it now with fresh coleslaw and plantain.',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    isRead: true,
    deliveryState: 'read',
    hostelLocation: 'Zamfara Hostel',
    reactions: { '🔥': ['usr_me'] },
  },
  {
    id: 'msg_demo_3',
    conversationId: 'conv_campus_bites_1',
    businessId: 'biz_1',
    businessName: 'Campus Bites & Grills',
    senderId: 'tunde@unilorin.edu.ng',
    senderName: 'Tunde Bakare',
    senderRole: 'trader',
    recipientId: 'usr_me',
    recipientName: 'You',
    text: 'Your smoky jollof and turkey is on the way to your hostel room!',
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    isRead: true,
    deliveryState: 'read',
    hostelLocation: 'Zamfara Hostel',
    voiceNoteUrl: 'https://actions.google.com/sounds/v1/water/air_woosh_underwater.ogg',
    voiceDuration: 6,
    voiceWaveform: [35, 60, 85, 40, 95, 70, 50, 80, 65, 45, 90, 30],
  },
  // Request messages
  {
    id: 'msg_req_1',
    conversationId: 'conv_req_gadget_dr',
    businessId: 'biz_req_1',
    businessName: 'Gadget Doctor & Tech Lab',
    senderId: 'amina_tech@unilorin.edu.ng',
    senderName: 'Amina Al-Hassan',
    senderRole: 'trader',
    recipientId: 'usr_me',
    recipientName: 'You',
    text: 'Hello! Saw your enquiry about replacing the MacBook M1 screen. We have genuine OEM parts in stock.',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    isRead: false,
    deliveryState: 'delivered',
  },
  {
    id: 'msg_req_2',
    conversationId: 'conv_req_tutor_peer',
    businessId: 'biz_req_2',
    businessName: 'CIS Peer Tutoring & Code Prep',
    senderId: 'david_cis@unilorin.edu.ng',
    senderName: 'David Oladipo',
    senderRole: 'trader',
    recipientId: 'usr_me',
    recipientName: 'You',
    text: 'Hi, are you still interested in joining the Data Structures & Algorithm intensive study cohort this weekend?',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    isRead: false,
    deliveryState: 'delivered',
  },
];

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CONVS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_DEMO_CONVERSATIONS;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHATS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_DEMO_MESSAGES;
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>('conv_campus_bites_1');
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [typingMap, setTypingMap] = useState<Record<string, string>>({});
  
  const [chatTheme, setChatThemeState] = useState<ChatThemeMode>(() => {
    try {
      return (localStorage.getItem(STORAGE_THEME_KEY) as ChatThemeMode) || 'whatsapp';
    } catch {
      return 'whatsapp';
    }
  });

  const [onlinePrivacy, setOnlinePrivacyState] = useState<'everyone' | 'contacts' | 'nobody'>(() => {
    try {
      return (localStorage.getItem(STORAGE_PRIVACY_KEY) as any) || 'everyone';
    } catch {
      return 'everyone';
    }
  });

  const wsRef = useRef<WebSocket | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  const setChatTheme = (theme: ChatThemeMode) => {
    setChatThemeState(theme);
    try {
      localStorage.setItem(STORAGE_THEME_KEY, theme);
    } catch {}
  };

  const setOnlinePrivacy = (pref: 'everyone' | 'contacts' | 'nobody') => {
    setOnlinePrivacyState(pref);
    try {
      localStorage.setItem(STORAGE_PRIVACY_KEY, pref);
    } catch {}
  };

  // Persist conversations
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CONVS_KEY, JSON.stringify(conversations));
    } catch {}
  }, [conversations]);

  // Persist messages
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CHATS_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // BroadcastChannel sync
  useEffect(() => {
    try {
      const channel = new BroadcastChannel('campus_foundry_chat_channel');
      broadcastChannelRef.current = channel;
      channel.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'NEW_MESSAGE') {
          handleIncomingMessage(payload.message, payload.conversation);
        } else if (type === 'READ_CONVERSATION') {
          handleMarkReadLocal(payload.conversationId);
        } else if (type === 'ACCEPT_REQUEST') {
          handleAcceptRequestLocal(payload.conversationId);
        }
      };
      return () => channel.close();
    } catch {}
  }, []);

  const handleIncomingMessage = (msg: ChatMessage, conv?: ChatConversation) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });

    if (conv) {
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== conv.id);
        return [conv, ...filtered];
      });
    }
  };

  const handleMarkReadLocal = (convId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
    );
    setMessages((prev) =>
      prev.map((m) => (m.conversationId === convId ? { ...m, isRead: true, deliveryState: 'read' } : m))
    );
  };

  const handleAcceptRequestLocal = (convId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, isMessageRequest: false, requestStatus: 'accepted' }
          : c
      )
    );
  };

  const acceptMessageRequest = (conversationId: string) => {
    handleAcceptRequestLocal(conversationId);
    broadcastChannelRef.current?.postMessage({
      type: 'ACCEPT_REQUEST',
      payload: { conversationId },
    });
  };

  const declineMessageRequest = (conversationId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    setMessages((prev) => prev.filter((m) => m.conversationId !== conversationId));
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
    }
  };

  const blockMessageRequest = (conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, requestStatus: 'blocked' }
          : c
      )
    );
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
    }
  };

  const toggleMessageReaction = (messageId: string, emoji: string) => {
    const userId = currentUser?.id || 'usr_me';
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const currentReactions = m.reactions || {};
        const currentUsers = currentReactions[emoji] || [];
        const hasReacted = currentUsers.includes(userId);

        const updatedUsers = hasReacted
          ? currentUsers.filter((u) => u !== userId)
          : [...currentUsers, userId];

        const nextReactions = { ...currentReactions };
        if (updatedUsers.length === 0) {
          delete nextReactions[emoji];
        } else {
          nextReactions[emoji] = updatedUsers;
        }

        return { ...m, reactions: nextReactions };
      })
    );
  };

  const markConversationRead = (conversationId: string) => {
    handleMarkReadLocal(conversationId);
    broadcastChannelRef.current?.postMessage({
      type: 'READ_CONVERSATION',
      payload: { conversationId },
    });
  };

  const openChatWithBusiness = (
    business: StudentBusiness,
    initialMessage?: string,
    orderSnippet?: ChatOrderSnippet,
    asMessageRequest = false
  ) => {
    const buyerId = currentUser?.id || 'usr_me';
    const buyerName = currentUser?.fullName || 'Student Buyer';
    const conversationId = `conv_${business.id}_${buyerId}`.replace(/[^a-zA-Z0-9_]/g, '_');

    let conv = conversations.find((c) => c.id === conversationId);
    if (!conv) {
      conv = {
        id: conversationId,
        businessId: business.id,
        businessName: business.name,
        businessImageUrl: business.imageUrl,
        traderName: business.ownerName,
        traderId: business.ownerEmail || `trader_${business.id}`,
        traderHostel: business.hostelLocation,
        buyerId,
        buyerName,
        buyerEmail: currentUser?.email,
        lastMessage: initialMessage || 'Direct inquiry started on Campus Foundry.',
        lastMessageTimestamp: new Date().toISOString(),
        unreadCount: 0,
        isMessageRequest: asMessageRequest,
        requestStatus: asMessageRequest ? 'pending' : 'accepted',
        isOnline: true,
        lastSeen: 'Online',
      };
      setConversations((prev) => [conv!, ...prev]);
    }

    setActiveConversationId(conversationId);
    setIsChatDrawerOpen(true);

    if (initialMessage || orderSnippet) {
      sendMessageDirect(
        conversationId,
        business,
        initialMessage || 'Order inquiry placed via Campus Foundry',
        { orderSnippet }
      );
    }
  };

  const sendMessageDirect = async (
    convId: string,
    businessInfo: { id: string; name: string; ownerName: string; ownerEmail?: string; hostelLocation: string },
    text: string,
    options?: SendMessageOptions
  ) => {
    const isTraderSender = currentUser?.role === 'trader';
    const senderId = currentUser?.id || 'usr_me';
    const senderName = currentUser?.fullName || (isTraderSender ? 'Student Trader' : 'Student Buyer');

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId: convId,
      businessId: businessInfo.id,
      businessName: businessInfo.name,
      senderId,
      senderName,
      senderRole: isTraderSender ? 'trader' : 'student',
      recipientId: isTraderSender ? 'student_buyer' : businessInfo.ownerEmail || 'trader_' + businessInfo.id,
      recipientName: isTraderSender ? 'Student Buyer' : businessInfo.ownerName,
      text,
      timestamp: new Date().toISOString(),
      isRead: false,
      deliveryState: 'sent',
      hostelLocation: currentUser?.hostelLocation || 'Lagos Hostel',
      orderSnippet: options?.orderSnippet,
      voiceNoteUrl: options?.voiceNote?.url,
      voiceDuration: options?.voiceNote?.duration,
      voiceWaveform: options?.voiceNote?.waveform,
      attachmentUrl: options?.attachment?.url,
      attachmentType: options?.attachment?.type,
      attachmentName: options?.attachment?.name,
      replyToMessage: options?.replyTo,
    };

    // Simulate progression to 'delivered' and 'read' after micro-delay
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newMessage.id ? { ...m, deliveryState: 'delivered' } : m))
      );
    }, 900);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newMessage.id ? { ...m, deliveryState: 'read', isRead: true } : m))
      );
    }, 2400);

    const updatedConv: ChatConversation = {
      id: convId,
      businessId: businessInfo.id,
      businessName: businessInfo.name,
      businessImageUrl: (businessInfo as any).imageUrl,
      traderName: businessInfo.ownerName,
      traderId: businessInfo.ownerEmail || 'trader_' + businessInfo.id,
      traderHostel: businessInfo.hostelLocation,
      buyerId: isTraderSender ? 'student_buyer' : senderId,
      buyerName: isTraderSender ? 'Student Buyer' : senderName,
      lastMessage: options?.voiceNote ? '🎤 Voice message' : options?.attachment ? '📎 Media attachment' : text,
      lastMessageTimestamp: newMessage.timestamp,
      unreadCount: 0,
      isMessageRequest: false,
      requestStatus: 'accepted',
      isOnline: true,
      lastSeen: 'Online',
    };

    handleIncomingMessage(newMessage, updatedConv);

    broadcastChannelRef.current?.postMessage({
      type: 'NEW_MESSAGE',
      payload: { message: newMessage, conversation: updatedConv },
    });
  };

  const sendMessage = async (text: string, options?: SendMessageOptions) => {
    if (!activeConversationId) return;
    const currentConv = conversations.find((c) => c.id === activeConversationId);
    if (!currentConv) return;

    await sendMessageDirect(
      activeConversationId,
      {
        id: currentConv.businessId,
        name: currentConv.businessName,
        ownerName: currentConv.traderName,
        ownerEmail: currentConv.traderId,
        hostelLocation: currentConv.traderHostel,
        imageUrl: currentConv.businessImageUrl,
      } as any,
      text.trim(),
      options
    );
  };

  const sendTyping = (isTyping: boolean) => {
    if (!activeConversationId) return;
    setTypingMap((prev) => ({
      ...prev,
      [activeConversationId]: isTyping ? 'typing...' : '',
    }));
  };

  const clearAllChats = () => {
    setConversations([]);
    setMessages([]);
    setActiveConversationId(null);
    try {
      localStorage.removeItem(STORAGE_CHATS_KEY);
      localStorage.removeItem(STORAGE_CONVS_KEY);
    } catch {}
  };

  const primaryConversations = conversations.filter(
    (c) => !c.isMessageRequest || c.requestStatus === 'accepted'
  );

  const requestConversations = conversations.filter(
    (c) => c.isMessageRequest && c.requestStatus === 'pending'
  );

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const activeMessages = messages.filter((m) => m.conversationId === activeConversationId);
  const unreadTotalCount = primaryConversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const pendingRequestsCount = requestConversations.length;

  return (
    <ChatContext.Provider
      value={{
        conversations,
        primaryConversations,
        requestConversations,
        activeConversationId,
        activeConversation,
        activeMessages,
        unreadTotalCount,
        pendingRequestsCount,
        isConnected,
        isChatDrawerOpen,
        typingUser: activeConversationId ? typingMap[activeConversationId] || null : null,
        chatTheme,
        setChatTheme,
        onlinePrivacy,
        setOnlinePrivacy,
        openChatDrawer: (targetTab) => {
          setIsChatDrawerOpen(true);
          if (targetTab === 'requests' && requestConversations.length > 0) {
            setActiveConversationId(requestConversations[0].id);
          }
        },
        closeChatDrawer: () => setIsChatDrawerOpen(false),
        setActiveConversationId: (id) => {
          setActiveConversationId(id);
          if (id) markConversationRead(id);
        },
        openChatWithBusiness,
        sendMessage,
        sendTyping,
        markConversationRead,
        acceptMessageRequest,
        declineMessageRequest,
        blockMessageRequest,
        toggleMessageReaction,
        clearAllChats,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
