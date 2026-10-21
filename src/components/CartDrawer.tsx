import React, { useState } from 'react';
import { 
  X, 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  Store,
  Clock,
  Sparkles,
  ArrowRight,
  Tag,
  CreditCard,
  Building2,
  Wallet,
  Coins,
  ShieldCheck,
  Navigation,
  KeyRound
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ALL_UNILORIN_HOSTELS } from '../data/mockData';
import { HostelSelectMenu } from './HostelSelectMenu';
import { LiveDeliveryTrackerModal } from './LiveDeliveryTrackerModal';
import { OrderRecord } from '../types';

interface CartDrawerProps {
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  onExploreBusinesses?: () => void;
}

const PROMO_CODES: Record<string, { discount: number; type: 'fixed' | 'free_delivery'; label: string }> = {
  UNILORIN500: { discount: 500, type: 'fixed', label: '₦500 Campus Student Voucher' },
  CAMPUSFREE: { discount: 350, type: 'free_delivery', label: 'Free Hostel Delivery' },
  JUMIAFIRST: { discount: 1000, type: 'fixed', label: '₦1,000 First-Time Glovo/Jumia Welcome Grant' },
};

export const CartDrawer: React.FC<CartDrawerProps> = ({
  onOpenAuth,
  onExploreBusinesses,
}) => {
  const {
    isCartOpen,
    setIsCartOpen,
    cartItems,
    updateQuantity,
    removeFromCart,
    undoLastRemoval,
    clearCart,
    totalItemCount,
    subtotal,
    deliveryFeeTotal,
    grandTotal,
    orders,
    placeOrders,
  } = useCart();

  const { currentUser } = useAuth();

  const [deliveryHostel, setDeliveryHostel] = useState(() => {
    return ALL_UNILORIN_HOSTELS.find((h) => currentUser?.hostelLocation?.includes(h)) || 'Lagos Hostel (Male)';
  });
  const [deliveryRoom, setDeliveryRoom] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.whatsapp || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastRemovedName, setLastRemovedName] = useState<string | null>(null);

  // Enterprise Voucher / Promo Engine
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Multi-Payment Gateway Engine
  const [selectedPayment, setSelectedPayment] = useState<'card' | 'transfer' | 'wallet' | 'cash'>('card');

  // Live On-Demand Tracking Modal
  const [trackedOrder, setTrackedOrder] = useState<OrderRecord | null>(null);

  if (!isCartOpen && !trackedOrder) return null;

  // Group items by student business
  const groupedByBusiness = cartItems.reduce((acc, item) => {
    const list = acc.get(item.businessId) || [];
    list.push(item);
    acc.set(item.businessId, list);
    return acc;
  }, new Map<string, typeof cartItems>());

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoInput.trim().toUpperCase();
    if (PROMO_CODES[code]) {
      const p = PROMO_CODES[code];
      const discount = p.type === 'free_delivery' ? deliveryFeeTotal : p.discount;
      setAppliedPromo({ code, discount, label: p.label });
      setPromoError(null);
    } else {
      setPromoError('Invalid campus voucher code. Try "UNILORIN500" or "CAMPUSFREE".');
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
  };

  const finalDiscount = appliedPromo ? Math.min(subtotal, appliedPromo.discount) : 0;
  const finalGrandTotal = Math.max(0, grandTotal - finalDiscount);

  const handleConfirmOrder = async () => {
    if (!deliveryHostel.trim()) {
      alert('Please select your UNILORIN hostel from the menu.');
      return;
    }

    const fullHostelAddress = `${deliveryHostel}${deliveryRoom.trim() ? `, ${deliveryRoom.trim()}` : ''}`;

    setIsSubmitting(true);
    try {
      const created = await placeOrders({
        hostelRoom: fullHostelAddress,
        phone: phoneNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (created.length > 0) {
        const enrichedOrder: OrderRecord = {
          ...created[0],
          promoCode: appliedPromo?.code,
          discountAmount: finalDiscount,
          paymentMethod: selectedPayment,
          deliveryPin: String(Math.floor(1000 + Math.random() * 9000)),
        };
        setIsCartOpen(false);
        setTrackedOrder(enrichedOrder);
      }
    } catch (err) {
      alert('Could not place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Main Drawer Overlay */}
      {isCartOpen && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setIsCartOpen(false)}
        >
          <div 
            className="w-full max-w-lg h-full bg-neutral-900 border-l border-neutral-800 shadow-2xl flex flex-col text-white"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Campus Cart ({totalItemCount})</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Glovo / Jumia On-Demand
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              
              {cartItems.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 space-y-3">
                  <ShoppingBag className="h-12 w-12 mx-auto text-neutral-600" />
                  <h4 className="text-sm font-bold text-white">Your Campus Cart is Empty</h4>
                  <p className="text-xs text-neutral-400">
                    Explore student shops, restaurants, tech repairs, and dorm essentials in the marketplace.
                  </p>
                  
                  {orders.length > 0 && (
                    <div className="pt-4 border-t border-neutral-800 text-left space-y-2">
                      <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">
                        Recent On-Demand Orders:
                      </span>
                      {orders.slice(0, 2).map((ord) => (
                        <div key={ord.id} className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                          <div>
                            <h5 className="text-xs font-bold text-white">#{ord.orderNumber} · {ord.businessName}</h5>
                            <span className="text-[10px] text-amber-400 font-mono">₦{ord.grandTotal.toLocaleString()}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTrackedOrder(ord)}
                            className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1 hover:bg-emerald-500 hover:text-neutral-950 transition-colors"
                          >
                            <Navigation className="h-3 w-3" />
                            <span>Track Live</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Grouped Business Items */}
                  <div className="space-y-4">
                    {Array.from(groupedByBusiness.entries()).map(([bizId, items]) => {
                      const first = items[0];
                      return (
                        <div key={bizId} className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3 shadow-md">
                          <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
                            <Store className="h-4 w-4 text-amber-400" />
                            <h4 className="text-xs font-bold text-white truncate">{first.businessName}</h4>
                            <span className="text-[10px] text-neutral-500 font-mono ml-auto">
                              Hostel: {first.traderHostel || 'Zamfara'}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-xs gap-3">
                                <div className="flex-1 min-w-0">
                                  <span className="font-bold text-white truncate block">{item.name}</span>
                                  <span className="text-amber-400 font-mono text-[11px]">₦{item.price.toLocaleString()}</span>
                                </div>

                                <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-xl p-1">
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    className="p-1 text-neutral-400 hover:text-white"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="font-mono text-xs font-bold px-1">{item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    className="p-1 text-neutral-400 hover:text-white"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 1. Hostel Room Delivery Location */}
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                    <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Hostel Delivery Location</span>
                    </h4>

                    <HostelSelectMenu
                      selectedHostel={deliveryHostel}
                      onHostelChange={setDeliveryHostel}
                    />

                    <input
                      type="text"
                      value={deliveryRoom}
                      onChange={(e) => setDeliveryRoom(e.target.value)}
                      placeholder="Room number / Block (e.g. Block C Room 24)"
                      className="w-full p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-400"
                    />

                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Contact WhatsApp / Phone for Rider (e.g. 08012345678)"
                      className="w-full p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* 2. Automated Voucher / Promo Engine */}
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                    <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-amber-400" />
                      <span>Campus Promo Voucher</span>
                    </h4>

                    {appliedPromo ? (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-emerald-400">{appliedPromo.code} Applied</span>
                          <p className="text-[10px] text-neutral-300">{appliedPromo.label}</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemovePromo}
                          className="text-[10px] text-rose-400 hover:underline font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleApplyPromo} className="flex gap-2">
                        <input
                          type="text"
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value)}
                          placeholder="e.g. UNILORIN500 or CAMPUSFREE"
                          className="flex-1 p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white uppercase font-mono focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-md cursor-pointer"
                        >
                          Apply
                        </button>
                      </form>
                    )}

                    {promoError && (
                      <p className="text-[10px] text-rose-400 font-mono">{promoError}</p>
                    )}
                  </div>

                  {/* 3. Multi-Payment Gateway Options */}
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                    <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-sky-400" />
                      <span>Payment Method (Instant Settlement)</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { id: 'card', label: 'Debit / Card', icon: CreditCard },
                        { id: 'transfer', label: 'Bank Transfer (Paystack)', icon: Building2 },
                        { id: 'wallet', label: 'Campus Wallet', icon: Wallet },
                        { id: 'cash', label: 'Cash on Arrival', icon: Coins },
                      ].map((pm) => {
                        const Icon = pm.icon;
                        const isSel = selectedPayment === pm.id;
                        return (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => setSelectedPayment(pm.id as any)}
                            className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition-all ${
                              isSel
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{pm.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. Financial Cost Breakdown */}
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Items Subtotal</span>
                      <span className="font-mono text-white">₦{subtotal.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Hostel Delivery Fee (Base + Demand)</span>
                      <span className="font-mono text-white">₦{deliveryFeeTotal.toLocaleString()}</span>
                    </div>

                    {appliedPromo && (
                      <div className="flex items-center justify-between text-emerald-400 font-bold">
                        <span>Voucher Discount ({appliedPromo.code})</span>
                        <span className="font-mono">-₦{finalDiscount.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-sm font-black">
                      <span>Grand Total</span>
                      <span className="font-mono text-amber-400">₦{finalGrandTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Checkout Action Button */}
                  <button
                    type="button"
                    onClick={handleConfirmOrder}
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-black text-sm shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Navigation className="h-4 w-4" />
                    <span>{isSubmitting ? 'Dispatching Order...' : `Place & Track Order (₦${finalGrandTotal.toLocaleString()})`}</span>
                  </button>
                </>
              )}

            </div>

          </div>
        </div>
      )}

      {/* On-Demand Real-Time GPS Tracking Modal (Glovo/Jumia Model) */}
      {trackedOrder && (
        <LiveDeliveryTrackerModal
          order={trackedOrder}
          isOpen={Boolean(trackedOrder)}
          onClose={() => setTrackedOrder(null)}
        />
      )}
    </>
  );
};

export default CartDrawer;
