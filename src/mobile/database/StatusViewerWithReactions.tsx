import React, { useState } from 'react';

export interface StatusItem {
  id: string;
  mediaUrl: string;
  caption?: string;
  timestamp?: number;
  duration?: number;
}

export interface StatusViewerWithReactionsProps {
  statuses: StatusItem[];
  user: {
    username: string;
    avatarUrl?: string;
  };
  onSendReply: (statusId: string, text: string) => void;
  onLikeStatus: (statusId: string) => void;
  onClose: () => void;
}

export const StatusViewerWithReactions: React.FC<StatusViewerWithReactionsProps> = ({
  statuses,
  user,
  onSendReply,
  onLikeStatus,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [hasLiked, setHasLiked] = useState(false);

  const currentStatus = statuses[currentIndex] || statuses[0];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentStatus) return;
    onSendReply(currentStatus.id, replyText.trim());
    setReplyText('');
  };

  const handleLike = () => {
    if (!currentStatus) return;
    setHasLiked(true);
    onLikeStatus(currentStatus.id);
  };

  if (!currentStatus) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
      {/* Top Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <img
            src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&fit=crop&crop=faces'}
            alt={user.username}
            className="w-10 h-10 rounded-full border border-white/20 object-cover"
          />
          <div>
            <span className="text-white font-semibold text-sm">{user.username}</span>
            <p className="text-white/60 text-xs">{currentIndex + 1} of {statuses.length}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10"
        >
          ✕
        </button>
      </div>

      {/* Main Status Media */}
      <div className="relative w-full max-w-sm aspect-[9/16] bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
        <img
          src={currentStatus.mediaUrl}
          alt={currentStatus.caption || 'Status story'}
          className="w-full h-full object-cover select-none"
          onDoubleClick={handleLike}
        />
        {currentStatus.caption && (
          <div className="absolute bottom-16 left-4 right-4 bg-black/60 backdrop-blur-md rounded-xl p-3 text-white text-sm">
            {currentStatus.caption}
          </div>
        )}
      </div>

      {/* Reply & Like Bar */}
      <div className="w-full max-w-sm mt-4 flex items-center gap-2">
        <form onSubmit={handleSend} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            placeholder={`Reply to ${user.username}...`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-white text-sm placeholder-white/50 focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={!replyText.trim()}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold px-4 py-2.5 rounded-full text-sm transition-colors"
          >
            Send
          </button>
        </form>
        <button
          onClick={handleLike}
          className={`p-2.5 rounded-full transition-colors ${
            hasLiked ? 'bg-red-500/20 text-red-500' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title="Like story"
        >
          ❤️
        </button>
      </div>
    </div>
  );
};

export default StatusViewerWithReactions;
