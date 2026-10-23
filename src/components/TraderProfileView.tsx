import React, { useState, useEffect } from 'react';
import { 
  Store, 
  MapPin, 
  Phone, 
  Star, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  ShoppingBag, 
  MessageCircle, 
  Edit3, 
  Bookmark, 
  Share2, 
  Power, 
  Tag, 
  Send, 
  Plus, 
  ArrowLeft,
  ThumbsUp,
  User,
  Trash2,
  Check,
  X
} from 'lucide-react';
import { StudentBusiness, StudentServiceItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useCart } from '../context/CartContext';
import { EditTraderProfileModal } from './EditTraderProfileModal';
import { LongPressAvatar } from './playercard/LongPressAvatar';

export interface TraderProfileViewProps {
  business: StudentBusiness;
  onBack?: () => void;
  onUpdateBusiness?: (updated: StudentBusiness) => void;
}

export const TraderProfileView: React.FC<TraderProfileViewProps> = ({
  business: initialBusiness,
  onBack,
  onUpdateBusiness,
}) => {
  const { currentUser } = useAuth();
  const { openChatWithBusiness, openChatDrawer } = useChat();
  const { addToCart, toggleWishlist, isWishlisted } = useCart();

  const [business, setBusiness] = useState<StudentBusiness>(initialBusiness);
  const [activeTab, setActiveTab] = useState<'goods' | 'services' | 'reviews'>('goods');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  // Sync with prop updates
  useEffect(() => {
    setBusiness(initialBusiness);
  }, [initialBusiness]);

  // Inline Product / Good Creation State
  const [isAddingGood, setIsAddingGood] = useState(false);
  const [goodName, setGoodName] = useState('');
  const [goodPrice, setGoodPrice] = useState('');
  const [goodDesc, setGoodDesc] = useState('');

  // Inline Service Creation State
  const [isAddingService, setIsAddingService] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceTurnaround, setServiceTurnaround] = useState('');

  // Review Form State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewsList, setReviewsList] = useState<Array<{ id: string; authorName: string; rating: number; text: string; date: string }>>([
    {
      id: 'rev_1',
      authorName: 'Blessing K.',
      rating: 5,
      text: 'Super fast delivery to Zamfara Hostel! The food was hot and delicious.',
      date: '2 days ago',
    },
    {
      id: 'rev_2',
      authorName: 'Chidi O.',
      rating: 5,
      text: 'Brought my laptop for RAM upgrade, completed same day at CBT center.',
      date: '1 week ago',
    },
  ]);

  const isOwner = Boolean(
    currentUser &&
      (business.ownerId === currentUser.id ||
        (business.ownerEmail && currentUser.email && business.ownerEmail.toLowerCase() === currentUser.email.toLowerCase()))
  );

  const isSaved = isWishlisted(business.id);
  const isOpenForBusiness = business.activeOrdersToday !== undefined ? business.activeOrdersToday > 0 : true;

  const handleUpdate = (updated: StudentBusiness) => {
    setBusiness(updated);
    onUpdateBusiness?.(updated);
  };

  const handleToggleAvailability = () => {
    if (!isOwner) return;
    const nextState = !isOpenForBusiness;
    const updated = {
      ...business,
      activeOrdersToday: nextState ? 12 : 0,
    };
    handleUpdate(updated);
  };

  const handleCreateGood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goodName.trim() || !goodPrice) return;
    const newItem: StudentServiceItem = {
      id: `good_${Date.now()}`,
      name: goodName.trim(),
      price: Number(goodPrice) || 1000,
      description: goodDesc.trim() || undefined,
      type: 'good',
      inStock: true,
    };
    const updated = {
      ...business,
      services: [...business.services, newItem],
    };
    handleUpdate(updated);
    setGoodName('');
    setGoodPrice('');
    setGoodDesc('');
    setIsAddingGood(false);
  };

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim() || !servicePrice) return;
    const newItem: StudentServiceItem = {
      id: `svc_${Date.now()}`,
      name: serviceName.trim(),
      price: Number(servicePrice) || 1000,
      description: serviceDesc.trim() || undefined,
      estimatedTime: serviceTurnaround.trim() || 'Same Day',
      type: 'service',
      inStock: true,
    };
    const updated = {
      ...business,
      services: [...business.services, newItem],
    };
    handleUpdate(updated);
    setServiceName('');
    setServicePrice('');
    setServiceDesc('');
    setServiceTurnaround('');
    setIsAddingService(false);
  };

  const handleDeleteItem = (itemId: string) => {
    const updated = {
      ...business,
      services: business.services.filter((s) => s.id !== itemId),
    };
    handleUpdate(updated);
  };

  const handleShareTrader = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    }
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    const newRev = {
      id: `rev_${Date.now()}`,
      authorName: currentUser?.fullName || 'Campus Student',
      rating: reviewRating,
      text: reviewComment.trim(),
      date: 'Just now',
    };

    setReviewsList([newRev, ...reviewsList]);
    setReviewComment('');
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 text-white font-sans space-y-6">
      
      {/* Back Header */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 text-xs font-bold transition-all cursor-pointer shadow-md"
        >
          <ArrowLeft className="h-4 w-4 text-amber-400" />
          <span>Back to Marketplace</span>
        </button>
      )}

      {/* 1. HEADER & TRADER IDENTITY BANNER */}
      <div className="relative rounded-3xl border border-neutral-800 bg-neutral-900/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl overflow-hidden space-y-6">
        
        {/* Top Status & Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          
          {/* Availability Status Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
            isOpenForBusiness
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
          }`}>
            <span className={`h-2 w-2 rounded-full ${isOpenForBusiness ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span>{isOpenForBusiness ? 'Open for Business' : 'Away / Taking Exams'}</span>
          </div>

          {/* Owner or Buyer Action Buttons */}
          <div className="flex items-center gap-2">
            {isOwner ? (
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-neutral-950 font-bold text-xs shadow-lg hover:from-amber-400 hover:to-orange-400 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="h-4 w-4" />
                <span>Edit Trader Profile</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => toggleWishlist(business)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    isSaved
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'
                  }`}
                  title="Bookmark Trader"
                >
                  <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={handleShareTrader}
                  className="p-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition-colors"
                  title="Share Trader Link"
                >
                  <Share2 className="h-4 w-4" />
                </button>

                <a
                  href={`https://wa.me/${business.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-extrabold text-xs shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Phone className="h-4 w-4" />
                  <span>WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    openChatWithBusiness(business);
                    openChatDrawer();
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Message</span>
                </button>
              </>
            )}
          </div>

        </div>

        {/* Brand Details */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <img
            src={business.imageUrl}
            alt={business.name}
            className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl object-cover border-2 border-amber-400 p-0.5 shadow-2xl shrink-0"
          />

          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white">{business.name}</h1>
              <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 text-xs font-mono font-bold">
                {business.category}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-mono font-bold">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Verified Student Founder</span>
              </span>
            </div>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-medium">
              {business.tagline || business.description}
            </p>

            {/* Meta Tags */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-neutral-400">
              <span className="flex items-center gap-1.5" title="Long-press founder avatar for Player Card">
                <LongPressAvatar
                  userId={business.ownerId || `trader_${business.id}`}
                  name={business.ownerName}
                  size="xs"
                  showRingHint
                  className="rounded-full shadow-xs"
                />
                <span className="font-semibold text-neutral-200">{business.ownerName}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                <span>{business.hostelLocation || 'Zamfara Hostel'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono text-emerald-400 font-bold">
                <Clock className="h-3.5 w-3.5" />
                <span>Est. {business.deliveryTimeEstimate || '15-20 Mins'} turnaround</span>
              </span>
            </div>
          </div>
        </div>

        {/* 2. PERFORMANCE & CREDIBILITY METRICS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-neutral-800 text-center">
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
            <div className="text-xs text-neutral-400 font-medium">Rating Score</div>
            <div className="text-sm sm:text-base font-extrabold text-amber-400 flex items-center justify-center gap-1 mt-0.5">
              <Star className="h-4 w-4 fill-current" />
              <span>{business.rating} / 5.0</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
            <div className="text-xs text-neutral-400 font-medium">Completed Orders</div>
            <div className="text-sm sm:text-base font-extrabold text-white mt-0.5">
              {business.reviewsCount * 4 + 18}+ items
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
            <div className="text-xs text-neutral-400 font-medium">Response Rate</div>
            <div className="text-sm sm:text-base font-extrabold text-emerald-400 mt-0.5">
              &lt; 15 Mins
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
            <div className="text-xs text-neutral-400 font-medium">Hostel Room Delivery</div>
            <div className="text-sm sm:text-base font-extrabold text-sky-400 mt-0.5 flex items-center justify-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              <span>Supported</span>
            </div>
          </div>
        </div>

      </div>

      {copiedToast && (
        <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center animate-in fade-in">
          Trader profile link copied to clipboard!
        </div>
      )}

      {/* 3. TABBED PORTFOLIO SHOWCASE */}
      {(() => {
        const goodsList = business.services.filter((s) => s.type === 'good' || (!s.type && !s.name.toLowerCase().match(/(service|repair|upgrade|cleaning|styling|delivery)/i)));
        const servicesList = business.services.filter((s) => s.type === 'service' || (!s.type && s.name.toLowerCase().match(/(service|repair|upgrade|cleaning|styling|delivery)/i)));

        return (
          <>
            <div className="flex items-center justify-center border-b border-neutral-800 text-xs font-bold uppercase tracking-wider text-neutral-400">
              <button
                type="button"
                onClick={() => setActiveTab('goods')}
                className={`flex items-center gap-2 py-3 px-6 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'goods'
                    ? 'border-amber-400 text-amber-400 font-extrabold'
                    : 'border-transparent hover:text-white'
                }`}
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Goods & Products ({goodsList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('services')}
                className={`flex items-center gap-2 py-3 px-6 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'services'
                    ? 'border-amber-400 text-amber-400 font-extrabold'
                    : 'border-transparent hover:text-white'
                }`}
              >
                <Tag className="h-4 w-4" />
                <span>Services Offered ({servicesList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`flex items-center gap-2 py-3 px-6 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'reviews'
                    ? 'border-amber-400 text-amber-400 font-extrabold'
                    : 'border-transparent hover:text-white'
                }`}
              >
                <Star className="h-4 w-4" />
                <span>Reviews ({reviewsList.length})</span>
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="py-4 space-y-4">
              
              {/* TAB 1: GOODS & PRODUCTS */}
              {activeTab === 'goods' && (
                <div className="space-y-4">
                  {/* Owner Post Good Action */}
                  {isOwner && (
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-amber-300">Trader Portfolio Dashboard</h4>
                        <p className="text-[11px] text-neutral-400">Post new goods and stock to showcase directly in your storefront</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingGood(!isAddingGood)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all shadow-md flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{isAddingGood ? 'Close Form' : '+ Post New Good / Product'}</span>
                      </button>
                    </div>
                  )}

                  {/* Inline Good Creation Form */}
                  {isOwner && isAddingGood && (
                    <form onSubmit={handleCreateGood} className="p-5 rounded-2xl bg-neutral-900 border border-amber-500/40 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Plus className="h-4 w-4 text-amber-400" />
                          <span>Post New Good to Your Portfolio</span>
                        </h4>
                        <button type="button" onClick={() => setIsAddingGood(false)} className="text-neutral-400 hover:text-white">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-neutral-400 block mb-1">Product Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Chilled Parfait with Granola"
                            value={goodName}
                            onChange={(e) => setGoodName(e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-neutral-400 block mb-1">Price (₦)</label>
                          <input
                            type="number"
                            required
                            placeholder="e.g. 1500"
                            value={goodPrice}
                            onChange={(e) => setGoodPrice(e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-neutral-400 block mb-1">Description / Flavor / Specifications</label>
                        <input
                          type="text"
                          placeholder="e.g. Fresh strawberries, yoghurt layers and roasted nuts. Delivered chilled."
                          value={goodDesc}
                          onChange={(e) => setGoodDesc(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingGood(false)}
                          className="px-3.5 py-1.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold hover:bg-neutral-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-md cursor-pointer"
                        >
                          Post Product Now
                        </button>
                      </div>
                    </form>
                  )}

                  {goodsList.length === 0 ? (
                    <div className="p-8 text-center bg-neutral-900/40 rounded-3xl border border-neutral-800 space-y-2">
                      <ShoppingBag className="h-10 w-10 text-neutral-600 mx-auto mb-1" />
                      <h4 className="text-sm font-bold text-white">No Goods or Products Listed Yet</h4>
                      <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                        {isOwner ? 'Click "+ Post New Good / Product" above to showcase items in your hostel shop.' : `${business.name} has not listed any goods yet.`}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {goodsList.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-400/50 transition-all shadow-lg flex flex-col justify-between space-y-3 group"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">{item.name}</h4>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                                  In Stock
                                </span>
                                {isOwner && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(item.id)}
                                    title="Delete product from portfolio"
                                    className="p-1 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {item.description && (
                              <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">
                                {item.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                            <span className="text-sm font-black text-amber-400 font-mono">
                              ₦{item.price.toLocaleString()}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                addToCart({
                                  businessId: business.id,
                                  businessName: business.name,
                                  businessImageUrl: business.imageUrl,
                                  businessWhatsapp: business.whatsapp,
                                  traderHostel: business.hostelLocation,
                                  serviceId: item.id,
                                  name: item.name,
                                  price: item.price,
                                  quantity: 1,
                                })
                              }
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Add to Cart</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SERVICES OFFERED */}
              {activeTab === 'services' && (
                <div className="space-y-4">
                  {/* Owner Add Service Action */}
                  {isOwner && (
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-amber-300">Trader Services Showcase</h4>
                        <p className="text-[11px] text-neutral-400">Offer tailored services like hair styling, repairs, errands, or graphics</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingService(!isAddingService)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all shadow-md flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{isAddingService ? 'Close Form' : '+ Add New Service'}</span>
                      </button>
                    </div>
                  )}

                  {/* Inline Service Creation Form */}
                  {isOwner && isAddingService && (
                    <form onSubmit={handleCreateService} className="p-5 rounded-2xl bg-neutral-900 border border-amber-500/40 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Tag className="h-4 w-4 text-amber-400" />
                          <span>Add New Service Offering</span>
                        </h4>
                        <button type="button" onClick={() => setIsAddingService(false)} className="text-neutral-400 hover:text-white">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
                          <label className="text-[11px] font-semibold text-neutral-400 block mb-1">Service Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Dorm Room Braiding"
                            value={serviceName}
                            onChange={(e) => setServiceName(e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div className="sm:col-span-1">
                          <label className="text-[11px] font-semibold text-neutral-400 block mb-1">Starting Price (₦)</label>
                          <input
                            type="number"
                            required
                            placeholder="e.g. 3500"
                            value={servicePrice}
                            onChange={(e) => setServicePrice(e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                          />
                        </div>

                        <div className="sm:col-span-1">
                          <label className="text-[11px] font-semibold text-neutral-400 block mb-1">Turnaround Time</label>
                          <input
                            type="text"
                            placeholder="e.g. 1-2 Hours / Same Day"
                            value={serviceTurnaround}
                            onChange={(e) => setServiceTurnaround(e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-neutral-400 block mb-1">Description / Booking Terms</label>
                        <input
                          type="text"
                          placeholder="e.g. Bring your own extensions or purchase at my room. Booking 24 hours ahead."
                          value={serviceDesc}
                          onChange={(e) => setServiceDesc(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingService(false)}
                          className="px-3.5 py-1.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold hover:bg-neutral-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-md cursor-pointer"
                        >
                          Add Service Now
                        </button>
                      </div>
                    </form>
                  )}

                  {servicesList.length === 0 ? (
                    <div className="p-8 text-center bg-neutral-900/40 rounded-3xl border border-neutral-800 space-y-2">
                      <Tag className="h-10 w-10 text-neutral-600 mx-auto mb-1" />
                      <h4 className="text-sm font-bold text-white">No Services Listed Yet</h4>
                      <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                        {isOwner ? 'Click "+ Add New Service" above to offer campus skills, repairs, styling, or deliveries.' : `${business.name} has not listed custom services yet.`}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {servicesList.map((svc) => (
                        <div
                          key={svc.id}
                          className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3 hover:border-amber-400/40 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-white">{svc.name}</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-emerald-400">
                                From ₦{svc.price.toLocaleString()}
                              </span>
                              {isOwner && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(svc.id)}
                                  title="Delete service offering"
                                  className="p-1 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-neutral-300 leading-relaxed">
                            {svc.description || 'Tailored campus student service. Book via WhatsApp or in-app direct chat for custom requirements.'}
                          </p>

                          <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-[11px] text-neutral-400">
                            <span>Turnaround: {svc.estimatedTime || business.deliveryTimeEstimate || 'Same Day'}</span>
                            <a
                              href={`https://wa.me/${business.whatsapp}?text=${encodeURIComponent(`Hi ${business.name}, I want to request your service: ${svc.name}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold hover:bg-emerald-500 hover:text-neutral-950 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Phone className="h-3 w-3" />
                              <span>Request Service</span>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: REVIEWS & FEEDBACK */}
              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  
                  {/* Submit Review Form */}
                  <form onSubmit={handleAddReview} className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
                    <h4 className="text-xs font-bold text-white">Leave a Review for {business.name}</h4>
                    
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star className={`h-5 w-5 ${star <= reviewRating ? 'fill-current' : 'text-neutral-600'}`} />
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={2}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your hostel delivery experience, item quality, or turnaround time..."
                      className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                    />

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs hover:bg-amber-400 shadow-md cursor-pointer"
                      >
                        Post Review
                      </button>
                    </div>
                  </form>

                  {/* List Reviews */}
                  <div className="space-y-3">
                    {reviewsList.map((rev) => (
                      <div key={rev.id} className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{rev.authorName}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">{rev.date}</span>
                        </div>

                        <div className="flex items-center gap-1 text-amber-400">
                          {[...Array(rev.rating)].map((_, i) => (
                            <Star key={i} className="h-3.5 w-3.5 fill-current" />
                          ))}
                        </div>

                        <p className="text-xs text-neutral-300">{rev.text}</p>
                      </div>
                    ))}
                  </div>

                </div>
              )}

            </div>
          </>
        );
      })()}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <EditTraderProfileModal
          business={business}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdateBusiness={handleUpdate}
        />
      )}

    </div>
  );
};

export default TraderProfileView;
