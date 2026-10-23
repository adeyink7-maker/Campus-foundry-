import { 
  Star, 
  MapPin, 
  CheckCircle2, 
  ShoppingBag, 
  ArrowUpRight, 
  Clock, 
  ShieldCheck, 
  MessageSquare, 
  Sparkles, 
  Heart,
  Store
} from 'lucide-react';
import { StudentBusiness } from '../types';
import { useChat } from '../context/ChatContext';
import { useCart } from '../context/CartContext';
import { LongPressAvatar } from './playercard/LongPressAvatar';

interface BusinessCardProps {
  business: StudentBusiness;
  onSelect: (business: StudentBusiness) => void;
  onOpenTraderProfile?: (business: StudentBusiness) => void;
}

export const BusinessCard = ({ business, onSelect, onOpenTraderProfile }: BusinessCardProps) => {
  const { openChatWithBusiness } = useChat();
  const { toggleWishlist, isWishlisted } = useCart();
  const isSaved = isWishlisted(business.id);

  const handleCardClick = () => {
    onSelect(business);
  };

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(); }}
      className="group flex flex-col justify-between rounded-2xl border border-neutral-800/90 bg-neutral-900/60 hover:bg-neutral-900 hover:border-emerald-500/50 p-4 transition-all duration-200 hover:shadow-xl hover:shadow-emerald-950/20 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
    >
      <div>
        {/* Card Image Banner */}
        <div className="relative mb-3.5 h-44 w-full overflow-hidden rounded-xl bg-neutral-950 border border-neutral-800/80">
          <img
            src={business.imageUrl}
            alt={business.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/30 to-transparent" />

          {/* Wishlist Bookmark Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(business);
            }}
            title={isSaved ? 'Remove from saved' : 'Save to wishlist'}
            className={`absolute top-2.5 left-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-lg backdrop-blur-md border transition-all ${
              isSaved
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-rose-400 hover:border-neutral-700'
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} />
          </button>

          {/* Location Badge */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-lg bg-neutral-950/90 px-2 py-1 text-[11px] font-medium text-neutral-300 backdrop-blur-md border border-neutral-800">
            <MapPin className="h-3 w-3 text-amber-400 shrink-0" />
            <span className="truncate max-w-[130px]">{business.hostelLocation.split(',')[0]}</span>
          </div>

          {/* Student Status Indicator */}
          {business.isTemplate ? (
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-md bg-amber-500/95 px-2 py-0.5 text-[10px] font-bold text-neutral-950 shadow-xs">
              <Sparkles className="h-3 w-3" />
              <span>Starter Template (Demo)</span>
            </div>
          ) : (
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-md bg-emerald-500/95 px-2 py-0.5 text-[10px] font-bold text-neutral-950 shadow-xs">
              <CheckCircle2 className="h-3 w-3" />
              <span>Live Student Trader</span>
            </div>
          )}

          {/* Delivery pill */}
          {business.acceptsHostelDelivery && (
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-md bg-neutral-950/90 border border-neutral-800 px-2 py-0.5 text-[10px] font-medium text-emerald-400 backdrop-blur-md">
              <Clock className="h-3 w-3" />
              <span>{business.deliveryTimeEstimate || 'Hostel Delivery'}</span>
            </div>
          )}
        </div>

        {/* Category & Campus Hub */}
        <div className="flex items-center gap-1.5 text-xs text-neutral-400 flex-wrap">
          <span className="font-semibold text-emerald-400">{business.category}</span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-300">{business.campus}</span>
        </div>

        {/* Business Title & Hover Arrow */}
        <div className="mt-1.5 flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors leading-snug">
            {business.name}
          </h3>
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-800 text-neutral-400 group-hover:bg-emerald-500 group-hover:text-neutral-950 transition-colors shrink-0">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Tagline */}
        <p className="mt-1.5 text-xs text-neutral-400 line-clamp-2 leading-relaxed">
          {business.tagline}
        </p>

        {/* Student Owner Info & Rating */}
        <div className="mt-3.5 flex items-center justify-between text-xs text-neutral-400 border-t border-neutral-800/80 pt-2.5">
          <div 
            onClick={(e) => {
              if (onOpenTraderProfile) {
                e.stopPropagation();
                onOpenTraderProfile(business);
              }
            }}
            className="truncate mr-2 hover:text-amber-400 transition-colors cursor-pointer group/trader flex items-center gap-2"
            title="Long-press for Player Card or tap for Profile"
          >
            <LongPressAvatar
              userId={business.ownerId || `trader_${business.id}`}
              name={business.ownerName}
              size="sm"
              showRingHint
              className="h-7 w-7 rounded-lg shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTraderProfile?.(business);
              }}
            />
            <div className="truncate">
              <span className="text-neutral-200 font-bold block truncate group-hover/trader:text-amber-400">{business.ownerName}</span>
              <span className="text-neutral-500 text-[10px] truncate block">{business.studentDept} ({business.studentLevel})</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-amber-400 font-semibold shrink-0">
            <Star className="h-3 w-3 fill-amber-400" />
            <span>{business.rating.toFixed(1)}</span>
            <span className="text-neutral-500 text-[10px] font-normal">({business.reviewsCount})</span>
          </div>
        </div>
      </div>

      {/* Card Footer: Starting Price & Order Button */}
      <div className="mt-3.5 flex items-center justify-between border-t border-neutral-800/80 pt-3 text-xs">
        <div>
          <span className="text-neutral-500 block text-[10px] font-medium uppercase tracking-wider">Starting from</span>
          <span className="font-mono text-white font-bold text-sm tabular-nums">
            ₦{business.startingPrice.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openChatWithBusiness(business);
            }}
            title={`Chat directly with ${business.ownerName}`}
            className="inline-flex items-center gap-1 rounded-xl bg-neutral-800 hover:bg-emerald-950/70 hover:text-emerald-300 hover:border-emerald-500/50 px-2.5 py-1.5 text-xs font-semibold text-neutral-300 border border-neutral-700/80 transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
            <span>Chat</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenTraderProfile) {
                onOpenTraderProfile(business);
              } else {
                onSelect(business);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-800 group-hover:bg-amber-500 group-hover:text-neutral-950 px-3 py-1.5 text-xs font-extrabold text-neutral-200 border border-neutral-700/80 group-hover:border-amber-400 transition-all shadow-sm"
          >
            <Store className="h-3.5 w-3.5" />
            <span>Portfolio</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessCard;
