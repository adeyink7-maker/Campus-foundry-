import React, { useState, useEffect, useRef } from 'react';

export interface MobileChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  mediaUrl?: string;
  isAudio?: boolean;
  audioDuration?: string;
  timestamp: number;
  isMe: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read'; // WhatsApp checks
  reactions?: { [emoji: string]: number };
}

export interface RealTimeChatScreenProps {
  chatType: 'direct' | 'group' | 'channel';
  recipient: {
    id: string;
    name: string;
    handle: string;
    avatarUrl: string;
    isVerifiedStudent?: boolean;
    department?: string;
    online?: boolean;
    isAcceptedContact?: boolean; // For Twitter/Instagram Message Request policy
  };
  currentUser: {
    id: string;
    name: string;
    avatarUrl: string;
    isAdmin?: boolean;
  };
  onBack: () => void;
}

export const RealTimeChatScreen: React.FC<RealTimeChatScreenProps> = ({
  chatType,
  recipient,
  currentUser,
  onBack,
}) => {
  // Twitter/Instagram style message request state
  const [isRequestAccepted, setIsRequestAccepted] = useState(
    recipient.isAcceptedContact !== false
  );

  // Telegram/WhatsApp group admin lock state: "Only admins can send messages"
  const [isAdminOnlyBroadcast, setIsAdminOnlyBroadcast] = useState(
    chatType === 'channel'
  );
  const [groupMembers, setGroupMembers] = useState<string[]>([
    'Tunde Adeyemi (Admin)',
    'Fatima Bello',
    'Chinedu Okafor',
    'Amina Mohammed',
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [queuedInWatermelon, setQueuedInWatermelon] = useState<number>(0);
  const [messages, setMessages] = useState<MobileChatMessage[]>([
    {
      id: 'm1',
      senderId: recipient.id,
      senderName: recipient.name,
      senderAvatar: recipient.avatarUrl,
      text:
        chatType === 'channel'
          ? '📢 Official Faculty Announcement: CIS 312 Mid-Semester Test rescheduled to Block B Lecture Theater.'
          : 'Hi! Are you still selling the Engineering Mathematics textbook on the Campus Foundry market?',
      timestamp: Date.now() - 3600000,
      isMe: false,
      status: 'read',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Accepting or Declining Message Request (Twitter / Instagram style)
  const handleAcceptRequest = () => {
    setIsRequestAccepted(true);
  };

  const handleDeclineRequest = () => {
    onBack();
  };

  // Handle Sending a Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;

    if (!isRequestAccepted) {
      alert('You must accept the message request before replying.');
      return;
    }

    if (isAdminOnlyBroadcast && !currentUser.isAdmin) {
      alert('Only group admins are authorized to send messages in this channel.');
      return;
    }

    const newMessage: MobileChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatarUrl,
      text: inputMessage.trim(),
      timestamp: Date.now(),
      isMe: true,
      status: 'delivered',
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage('');

    // Simulate auto-reply in direct chats for high interactivity
    if (chatType === 'direct') {
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `reply_${Date.now()}`,
              senderId: recipient.id,
              senderName: recipient.name,
              senderAvatar: recipient.avatarUrl,
              text: 'Awesome, thanks! Let me send the funds through Campus Escrow now.',
              timestamp: Date.now(),
              isMe: false,
              status: 'read',
            },
          ]);
        }, 1500);
      }, 800);
    }
  };

  // Simulate Sending Voice Note (WhatsApp style)
  const handleToggleVoiceNote = () => {
    if (isRecordingAudio) {
      setIsRecordingAudio(false);
      const audioMessage: MobileChatMessage = {
        id: `audio_${Date.now()}`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatarUrl,
        text: 'Voice message (0:14)',
        isAudio: true,
        audioDuration: '0:14',
        timestamp: Date.now(),
        isMe: true,
        status: 'delivered',
      };
      setMessages((prev) => [...prev, audioMessage]);
    } else {
      setIsRecordingAudio(true);
    }
  };

  // WhatsApp style double check icon helper
  const renderStatusCheck = (status: MobileChatMessage['status']) => {
    if (status === 'sending') return <span className="text-neutral-500 text-[10px]">🕒</span>;
    if (status === 'sent') return <span className="text-neutral-400 text-[11px]">✓</span>;
    if (status === 'delivered') return <span className="text-neutral-400 text-[11px]">✓✓</span>;
    return <span className="text-sky-400 text-[11px] font-bold">✓✓</span>; // Read (blue ticks)
  };

  return (
    <div className="flex flex-col h-full w-full bg-neutral-950 text-white overflow-hidden relative">
      {/* Top Header (WhatsApp / Telegram style) */}
      <div className="flex items-center justify-between px-3 py-3 bg-neutral-900 border-b border-neutral-800 z-10">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 -ml-1 text-neutral-300 hover:text-white rounded-full hover:bg-neutral-800 transition-colors"
          >
            ←
          </button>
          <div className="relative">
            <img
              src={recipient.avatarUrl}
              alt={recipient.name}
              className="w-10 h-10 rounded-full object-cover border border-amber-500/40"
            />
            {recipient.online && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-neutral-900 rounded-full" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white leading-tight">{recipient.name}</span>
              {recipient.isVerifiedStudent && (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30">
                  UNILORIN
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 leading-tight">
              {isTyping ? (
                <span className="text-amber-400 animate-pulse font-medium">typing...</span>
              ) : recipient.online ? (
                'Online'
              ) : (
                recipient.handle
              )}
            </p>
          </div>
        </div>

        {/* Action Controls: Group Admin Broadcast Lock & Info */}
        <div className="flex items-center gap-1.5">
          {chatType === 'channel' && currentUser.isAdmin && (
            <button
              type="button"
              onClick={() => setIsAdminOnlyBroadcast((prev) => !prev)}
              className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                isAdminOnlyBroadcast
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-neutral-800 text-neutral-300 border-neutral-700'
              }`}
              title="Toggle WhatsApp/Telegram Admin-Only Broadcast Lock"
            >
              {isAdminOnlyBroadcast ? '🔒 Admin Broadcast Only' : '🔓 Group Chat Open'}
            </button>
          )}

          <div className="text-xs px-2 py-1 rounded-lg bg-neutral-800/80 text-emerald-400 border border-neutral-700/60 font-mono text-[10px]">
            ⚡ WatermelonDB
          </div>
        </div>
      </div>

      {/* Twitter / Instagram Message Request Gate Banner */}
      {!isRequestAccepted && (
        <div className="p-3 bg-amber-950/60 border-b border-amber-800/60 text-center z-10">
          <p className="text-xs text-amber-200 font-medium">
            💬 <strong>Message Request</strong>: {recipient.name} ({recipient.handle}) sent you a message request.
          </p>
          <p className="text-[11px] text-amber-300/80 mt-0.5">
            They won't know you've read it until you accept.
          </p>
          <div className="flex items-center justify-center gap-3 mt-2.5">
            <button
              type="button"
              onClick={handleAcceptRequest}
              className="px-4 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-colors shadow-md"
            >
              Accept Request
            </button>
            <button
              type="button"
              onClick={handleDeclineRequest}
              className="px-4 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition-colors"
            >
              Decline & Block
            </button>
          </div>
        </div>
      )}

      {/* Admin Broadcast Notice (Telegram style channel header) */}
      {isAdminOnlyBroadcast && (
        <div className="px-3 py-1.5 bg-neutral-900/90 border-b border-neutral-800 text-center text-[11px] text-neutral-400 flex items-center justify-center gap-1.5">
          <span>📢</span>
          <span>Only administrators can send messages to this faculty channel.</span>
        </div>
      )}

      {/* Message Feed Canvas (WhatsApp wallpaper style with subtle dark texture) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
        {/* Date Divider */}
        <div className="flex justify-center my-2">
          <span className="text-[10px] uppercase tracking-wider bg-neutral-900/80 text-neutral-400 px-2.5 py-0.5 rounded-full border border-neutral-800 backdrop-blur-sm">
            Today
          </span>
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col max-w-[80%] ${
              msg.isMe ? 'ml-auto items-end' : 'mr-auto items-start'
            }`}
          >
            {/* Bubble Container */}
            <div
              className={`rounded-2xl px-3.5 py-2.5 shadow-md relative text-xs leading-relaxed ${
                msg.isMe
                  ? 'bg-amber-600/90 text-white rounded-br-xs border border-amber-500/40'
                  : 'bg-neutral-800/95 text-neutral-100 rounded-bl-xs border border-neutral-700/60'
              }`}
            >
              {/* Sender name for group chats */}
              {chatType !== 'direct' && !msg.isMe && (
                <p className="text-[10px] font-bold text-amber-400 mb-1">{msg.senderName}</p>
              )}

              {/* Audio voice note representation */}
              {msg.isAudio ? (
                <div className="flex items-center gap-2 py-1">
                  <button
                    type="button"
                    className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white"
                  >
                    ▶
                  </button>
                  <div className="w-24 h-1.5 bg-white/30 rounded-full overflow-hidden">
                    <div className="w-1/2 h-full bg-white rounded-full" />
                  </div>
                  <span className="text-[10px] opacity-80">{msg.audioDuration}</span>
                </div>
              ) : (
                <p className="break-words">{msg.text}</p>
              )}

              {/* Timestamp & Delivery Checks */}
              <div
                className={`flex items-center gap-1 mt-1 text-[10px] ${
                  msg.isMe ? 'justify-end text-amber-200/80' : 'justify-end text-neutral-400'
                }`}
              >
                <span>
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {msg.isMe && renderStatusCheck(msg.status)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Drawer */}
      <div className="p-2.5 bg-neutral-900 border-t border-neutral-800">
        {isAdminOnlyBroadcast && !currentUser.isAdmin ? (
          <div className="py-2.5 px-4 text-center text-xs text-neutral-400 bg-neutral-950/60 rounded-2xl border border-neutral-800">
            🔒 Only channel administrators can post updates here.
          </div>
        ) : !isRequestAccepted ? (
          <div className="py-2.5 px-4 text-center text-xs text-neutral-400 bg-neutral-950/60 rounded-2xl border border-neutral-800">
            Accept message request to type a reply.
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            {/* Media Attachment trigger */}
            <button
              type="button"
              className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors"
              title="Attach media or document"
              onClick={() => alert('Camera & File picker ready')}
            >
              📎
            </button>

            {/* Input pill */}
            <input
              type="text"
              placeholder="Message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 bg-neutral-800/90 border border-neutral-700/70 rounded-full px-4 py-2.5 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-amber-500 transition-colors"
            />

            {/* Voice note or Send button */}
            {inputMessage.trim() ? (
              <button
                type="submit"
                className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center justify-center font-bold text-sm shadow-md transition-all active:scale-95"
              >
                ➤
              </button>
            ) : (
              <button
                type="button"
                onClick={handleToggleVoiceNote}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  isRecordingAudio
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
                title="Hold or tap to record Voice Note"
              >
                🎤
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
