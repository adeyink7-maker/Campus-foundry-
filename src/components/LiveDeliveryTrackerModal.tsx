import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Navigation, 
  Phone, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Package, 
  Store, 
  ArrowRight,
  Sparkles,
  Zap,
  CreditCard,
  KeyRound
} from 'lucide-react';
import { OrderRecord } from '../types';

interface LiveDeliveryTrackerModalProps {
  order: OrderRecord;
  isOpen: boolean;
  onClose: () => void;
}

export const LiveDeliveryTrackerModal: React.FC<LiveDeliveryTrackerModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  // Simulated courier telemetry & GPS movement along campus route
  const [courierProgress, setCourierProgress] = useState(0.45); // 0.0 to 1.0 along route
  const [etaSeconds, setEtaSeconds] = useState(740); // ~12 minutes
  const [activeStep, setActiveStep] = useState<'placed' | 'accepted' | 'preparing' | 'in_transit' | 'delivered'>('in_transit');

  // Simulated live movement
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setEtaSeconds((prev) => Math.max(60, prev - 3));
      setCourierProgress((prev) => {
        if (prev >= 0.95) return 0.95;
        return prev + 0.008;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const etaMinutes = Math.ceil(etaSeconds / 60);

  // Dynamic distance estimate (1.8 km down to 0.2 km)
  const remainingDistanceKm = Math.max(0.2, (1.8 * (1 - courierProgress))).toFixed(1);

  // Security delivery verification PIN (Glovo/Jumia model)
  const deliveryPin = order.deliveryPin || '8492';

  const steps = [
    { id: 'placed', label: 'Order Placed', time: '14:20' },
    { id: 'accepted', label: 'Accepted by Merchant', time: '14:22' },
    { id: 'preparing', label: 'Freshly Prepared', time: '14:28' },
    { id: 'in_transit', label: 'Courier on Campus Route', time: '14:32 (Live)' },
    { id: 'delivered', label: 'Hostel Room Delivered', time: 'Est. in 12m' },
  ];

  return (
    <div 
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="relative flex flex-col w-full max-w-2xl rounded-3xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden max-h-[92vh] text-white"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Navigation className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Live On-Demand Delivery Telemetry</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Glovo / Jumia Engine
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-mono">
                Order #{order.orderNumber} · {order.businessName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Top ETA & Security PIN Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Dynamic ETA Telemetry Box */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">Estimated Arrival</span>
                <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono flex items-center gap-1.5 mt-0.5">
                  <Clock className="h-5 w-5 animate-spin" />
                  <span>{etaMinutes} Mins</span>
                </div>
                <span className="text-[11px] text-emerald-400 font-semibold">{remainingDistanceKm} km remaining · Direct Route</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg">
                🛵
              </div>
            </div>

            {/* Delivery Verification PIN (Glovo/Jumia Security Architecture) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-950 to-neutral-900 border border-emerald-500/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block flex items-center gap-1">
                  <KeyRound className="h-3 w-3 text-emerald-400" />
                  <span>Delivery Security PIN</span>
                </span>
                <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tracking-widest mt-0.5">
                  {deliveryPin}
                </div>
                <span className="text-[11px] text-neutral-400">Share with courier at hostel door</span>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* INTERACTIVE UNILORIN CAMPUS GPS ROUTE MAP (Vector Render) */}
          {/* ======================================================== */}
          <div className="relative rounded-3xl overflow-hidden border border-neutral-800 bg-[#0c141c] p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                <span>Live Route: {order.traderHostel || 'Merchant Kitchen'} ➔ {order.buyerHostelRoom}</span>
              </span>
              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Live GPS Active
              </span>
            </div>

            {/* SVG Visual Campus Map Route */}
            <div className="relative h-44 w-full bg-neutral-950/80 rounded-2xl border border-neutral-800 overflow-hidden flex items-center justify-center">
              
              {/* Grid backdrop */}
              <div className="absolute inset-0 bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

              <svg className="w-full h-full" viewBox="0 0 500 160" preserveAspectRatio="none">
                {/* Campus Roadway Path */}
                <path
                  d="M 50 110 Q 180 30, 260 90 T 450 60"
                  fill="none"
                  stroke="#374151"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Traversed Path */}
                <path
                  d="M 50 110 Q 180 30, 260 90 T 450 60"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="6"
                  strokeDasharray="400"
                  strokeDashoffset={400 * (1 - courierProgress)}
                  strokeLinecap="round"
                />

                {/* Merchant Origin Point */}
                <circle cx="50" cy="110" r="10" fill="#f59e0b" />
                <circle cx="50" cy="110" r="5" fill="#000" />

                {/* Destination Hostel Point */}
                <circle cx="450" cy="60" r="10" fill="#10b981" />
                <circle cx="450" cy="60" r="5" fill="#000" />
              </svg>

              {/* Animated Courier Marker on Route */}
              <div 
                className="absolute z-20 transition-all duration-1000 ease-linear flex flex-col items-center"
                style={{
                  left: `${10 + courierProgress * 78}%`,
                  top: `${35 + Math.sin(courierProgress * Math.PI) * 20}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="relative flex items-center justify-center">
                  <span className="absolute h-8 w-8 rounded-full bg-amber-400/40 animate-ping" />
                  <div className="h-8 w-8 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center shadow-lg font-bold text-sm border-2 border-white">
                    🛵
                  </div>
                </div>
                <span className="mt-1 px-1.5 py-0.5 rounded bg-neutral-900 border border-amber-400 text-[9px] font-mono text-amber-300 font-bold whitespace-nowrap shadow-md">
                  Ibrahim ({remainingDistanceKm}km)
                </span>
              </div>

              {/* Waypoint Labels */}
              <div className="absolute left-3 bottom-2 text-[10px] font-mono text-neutral-400 bg-black/60 px-2 py-0.5 rounded border border-neutral-800">
                🏪 Store / Kitchen
              </div>
              <div className="absolute right-3 top-2 text-[10px] font-mono text-emerald-400 bg-black/60 px-2 py-0.5 rounded border border-neutral-800">
                📍 {order.buyerHostelRoom}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* VERIFIED COURIER RIDER CARD */}
          {/* ======================================================== */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120"
                alt="Courier Rider"
                className="h-12 w-12 rounded-2xl object-cover border-2 border-amber-400 shrink-0"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs sm:text-sm font-bold text-white">Ibrahim Sikiru</h4>
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-[10px] font-mono text-amber-400 font-bold">4.9 ★ (342 orders)</span>
                </div>
                <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                  Honda Ace 125 · Kwara ILR-482-XA
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`tel:${order.courierPhone || '08031234567'}`}
                className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Call Courier</span>
              </a>

              <a
                href={`https://wa.me/2348031234567?text=${encodeURIComponent(`Hello Ibrahim, I am at ${order.buyerHostelRoom} tracking my Campus Foundry order #${order.orderNumber}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {/* ======================================================== */}
          {/* ORDER LIFECYCLE PROGRESS TIMELINE */}
          {/* ======================================================== */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Order Status Flow
            </h4>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              {steps.map((st, i) => (
                <div
                  key={st.id}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-between gap-1 transition-all ${
                    st.id === activeStep
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-md'
                      : i < 3
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {i < 3 ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : st.id === activeStep ? (
                      <Zap className="h-3.5 w-3.5 text-amber-400 animate-bounce" />
                    ) : (
                      <Package className="h-3.5 w-3.5 text-neutral-500" />
                    )}
                  </div>
                  <span className="text-[10px] leading-tight font-semibold">{st.label}</span>
                  <span className="text-[9px] font-mono text-neutral-400">{st.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Items Summary & Payment Split Settlement */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <span className="font-bold text-neutral-300">Items Ordered ({order.items.length})</span>
              <span className="text-emerald-400 font-mono font-bold">Paid via {order.paymentMethod || 'Card'}</span>
            </div>

            <div className="space-y-1.5 pt-1">
              {order.items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between text-neutral-400">
                  <span>{it.quantity}x {it.name}</span>
                  <span className="font-mono text-white">₦{(it.price * it.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between font-bold">
              <span>Grand Total Paid</span>
              <span className="text-amber-400 font-mono text-sm">₦{order.grandTotal.toLocaleString()}</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default LiveDeliveryTrackerModal;
