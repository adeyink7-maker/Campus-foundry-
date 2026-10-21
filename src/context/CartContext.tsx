import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { CartItem, WishlistItem, OrderRecord, StudentBusiness, AppUser } from '../types';
import { useAuth } from './AuthContext';
import { useChat } from './ChatContext';

interface CartContextType {
  cartItems: CartItem[];
  wishlistItems: WishlistItem[];
  orders: OrderRecord[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (item: Omit<CartItem, 'id' | 'addedAt'>) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  removeFromCart: (cartItemId: string) => CartItem | null;
  undoLastRemoval: () => void;
  clearCart: () => void;
  totalItemCount: number;
  subtotal: number;
  deliveryFeeTotal: number;
  grandTotal: number;
  toggleWishlist: (business: StudentBusiness) => boolean;
  isWishlisted: (businessId: string) => boolean;
  placeOrders: (deliveryDetails: { hostelRoom: string; phone?: string; notes?: string }) => Promise<OrderRecord[]>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_GUEST_TOKEN_KEY = 'campus_foundry_guest_token_v2';
const STORAGE_CART_PREFIX = 'campus_foundry_cart_';
const STORAGE_WISHLIST_PREFIX = 'campus_foundry_wishlist_';
const STORAGE_ORDERS_PREFIX = 'campus_foundry_orders_';

// Generate or retrieve persistent guest token for unauthenticated visitors
function getOrCreateGuestToken(): string {
  try {
    let token = localStorage.getItem(STORAGE_GUEST_TOKEN_KEY);
    if (!token) {
      token = 'guest_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      localStorage.setItem(STORAGE_GUEST_TOKEN_KEY, token);
    }
    return token;
  } catch {
    return 'guest_fallback_' + Date.now();
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { openChatWithBusiness } = useChat();

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [guestToken] = useState<string>(() => getOrCreateGuestToken());
  const [lastRemovedItem, setLastRemovedItem] = useState<CartItem | null>(null);

  // Active storage identity: user ID if authenticated, or guest token if anonymous
  const activeIdentity = useMemo(() => {
    return currentUser ? `user_${currentUser.id}` : `guest_${guestToken}`;
  }, [currentUser, guestToken]);

  // Persistent Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const key = `${STORAGE_CART_PREFIX}${currentUser ? `user_${currentUser.id}` : `guest_${getOrCreateGuestToken()}`}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persistent Wishlist state
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>(() => {
    try {
      const key = `${STORAGE_WISHLIST_PREFIX}${currentUser ? `user_${currentUser.id}` : `guest_${getOrCreateGuestToken()}`}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persistent Orders state
  const [orders, setOrders] = useState<OrderRecord[]>(() => {
    try {
      const key = `${STORAGE_ORDERS_PREFIX}${currentUser ? `user_${currentUser.id}` : `guest_${getOrCreateGuestToken()}`}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // ANONYMOUS-TO-AUTHENTICATED CART MIGRATION & MERGE PATTERN
  // When currentUser changes from guest to authenticated user, merge guest items into user's persistent cart!
  useEffect(() => {
    if (!currentUser) return;

    try {
      const guestKey = `${STORAGE_CART_PREFIX}guest_${guestToken}`;
      const guestCartRaw = localStorage.getItem(guestKey);
      
      const userKey = `${STORAGE_CART_PREFIX}user_${currentUser.id}`;
      const userCartRaw = localStorage.getItem(userKey);
      const userCart: CartItem[] = userCartRaw ? JSON.parse(userCartRaw) : [];

      if (guestCartRaw) {
        const guestCart: CartItem[] = JSON.parse(guestCartRaw);

        if (guestCart.length > 0) {
          // Merge logic: for matching serviceId in same business, combine quantity. Otherwise append.
          const merged: CartItem[] = [...userCart];
          for (const gItem of guestCart) {
            const existingIdx = merged.findIndex(
              (m) => m.businessId === gItem.businessId && m.serviceId === gItem.serviceId
            );
            if (existingIdx >= 0) {
              merged[existingIdx].quantity += gItem.quantity;
            } else {
              merged.push(gItem);
            }
          }

          // Save merged cart under authenticated user's permanent key
          localStorage.setItem(userKey, JSON.stringify(merged));
          setCartItems(merged);

          // Remove guest cart to prevent duplicate re-merging
          localStorage.removeItem(guestKey);
          return;
        }
      }

      // If no guest cart, load user's cart
      setCartItems(userCart);

      // Load user's wishlist
      const userWishlistKey = `${STORAGE_WISHLIST_PREFIX}user_${currentUser.id}`;
      const userWishlistRaw = localStorage.getItem(userWishlistKey);
      if (userWishlistRaw) {
        setWishlistItems(JSON.parse(userWishlistRaw));
      }

      // Load user's orders
      const userOrdersKey = `${STORAGE_ORDERS_PREFIX}user_${currentUser.id}`;
      const userOrdersRaw = localStorage.getItem(userOrdersKey);
      if (userOrdersRaw) {
        setOrders(JSON.parse(userOrdersRaw));
      }
    } catch (err) {
      console.error('Failed merging guest cart on auth:', err);
    }
  }, [currentUser, guestToken]);

  // Save Cart to persistent storage whenever cartItems change
  useEffect(() => {
    try {
      const key = `${STORAGE_CART_PREFIX}${activeIdentity}`;
      localStorage.setItem(key, JSON.stringify(cartItems));
    } catch (e) {
      console.error('Failed saving cart to storage:', e);
    }
  }, [cartItems, activeIdentity]);

  // Save Wishlist to persistent storage whenever wishlistItems change
  useEffect(() => {
    try {
      const key = `${STORAGE_WISHLIST_PREFIX}${activeIdentity}`;
      localStorage.setItem(key, JSON.stringify(wishlistItems));
    } catch (e) {
      console.error('Failed saving wishlist to storage:', e);
    }
  }, [wishlistItems, activeIdentity]);

  // Save Orders to persistent storage whenever orders change
  useEffect(() => {
    try {
      const key = `${STORAGE_ORDERS_PREFIX}${activeIdentity}`;
      localStorage.setItem(key, JSON.stringify(orders));
    } catch (e) {
      console.error('Failed saving orders to storage:', e);
    }
  }, [orders, activeIdentity]);

  // Cart Operations
  const addToCart = useCallback((item: Omit<CartItem, 'id' | 'addedAt'>) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (ci) => ci.businessId === item.businessId && ci.serviceId === item.serviceId
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + item.quantity,
          customNotes: item.customNotes || updated[existingIdx].customNotes,
        };
        return updated;
      }

      const newItem: CartItem = {
        ...item,
        id: 'ci_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
        addedAt: new Date().toISOString(),
      };
      return [...prev, newItem];
    });

    setIsCartOpen(true);
  }, []);

  const updateQuantity = useCallback((cartItemId: string, newQuantity: number) => {
    setCartItems((prev) => {
      if (newQuantity <= 0) {
        return prev.filter((item) => item.id !== cartItemId);
      }
      return prev.map((item) =>
        item.id === cartItemId ? { ...item, quantity: newQuantity } : item
      );
    });
  }, []);

  const removeFromCart = useCallback((cartItemId: string) => {
    let removed: CartItem | null = null;
    setCartItems((prev) => {
      const found = prev.find((item) => item.id === cartItemId);
      if (found) {
        removed = found;
        setLastRemovedItem(found);
      }
      return prev.filter((item) => item.id !== cartItemId);
    });
    return removed;
  }, []);

  const undoLastRemoval = useCallback(() => {
    if (lastRemovedItem) {
      setCartItems((prev) => [...prev, lastRemovedItem]);
      setLastRemovedItem(null);
    }
  }, [lastRemovedItem]);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  // Wishlist Operations
  const toggleWishlist = useCallback((business: StudentBusiness): boolean => {
    let isNowSaved = false;
    setWishlistItems((prev) => {
      const exists = prev.some((w) => w.businessId === business.id);
      if (exists) {
        isNowSaved = false;
        return prev.filter((w) => w.businessId !== business.id);
      }
      isNowSaved = true;
      const newItem: WishlistItem = {
        id: 'wl_' + Math.random().toString(36).substring(2, 9),
        businessId: business.id,
        businessName: business.name,
        businessCategory: business.category,
        campus: business.campus,
        hostelLocation: business.hostelLocation,
        imageUrl: business.imageUrl,
        startingPrice: business.startingPrice,
        savedAt: new Date().toISOString(),
      };
      return [...prev, newItem];
    });
    return isNowSaved;
  }, []);

  // Fast O(1) Wishlist Lookup Set
  const wishlistIdSet = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < wishlistItems.length; i++) {
      set.add(wishlistItems[i].businessId);
    }
    return set;
  }, [wishlistItems]);

  const isWishlisted = useCallback((businessId: string): boolean => {
    return wishlistIdSet.has(businessId);
  }, [wishlistIdSet]);

  // Single-Pass O(N) Sizing and Financial Calculations
  const { totalItemCount, subtotal, deliveryFeeTotal, grandTotal } = useMemo(() => {
    let count = 0;
    let sum = 0;
    const uniqueBizIds = new Set<string>();

    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      count += item.quantity;
      sum += item.price * item.quantity;
      uniqueBizIds.add(item.businessId);
    }

    const deliveryFee = uniqueBizIds.size * 300; // ₦300 hostel courier fee per unique trader
    return {
      totalItemCount: count,
      subtotal: sum,
      deliveryFeeTotal: deliveryFee,
      grandTotal: sum + deliveryFee,
    };
  }, [cartItems]);

  // Place Orders (groups by trader/business and triggers live chat order snippet)
  const placeOrders = useCallback(async (deliveryDetails: {
    hostelRoom: string;
    phone?: string;
    notes?: string;
  }): Promise<OrderRecord[]> => {
    if (cartItems.length === 0) return [];

    // Group items by business
    const grouped = new Map<string, CartItem[]>();
    for (const item of cartItems) {
      const list = grouped.get(item.businessId) || [];
      list.push(item);
      grouped.set(item.businessId, list);
    }

    const createdOrders: OrderRecord[] = [];
    const timestamp = new Date().toISOString();

    for (const [businessId, items] of grouped.entries()) {
      const first = items[0];
      const itemsSubtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
      const deliveryFee = 300;
      const orderTotal = itemsSubtotal + deliveryFee;

      const orderNumber = 'CF-' + Math.floor(100000 + Math.random() * 900000);
      const orderRecord: OrderRecord = {
        id: 'ord_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
        orderNumber,
        buyerId: currentUser ? currentUser.id : `guest_${guestToken}`,
        buyerName: currentUser ? currentUser.fullName : 'Guest Student',
        buyerEmail: currentUser?.email,
        buyerHostelRoom: deliveryDetails.hostelRoom,
        buyerPhone: deliveryDetails.phone || currentUser?.whatsapp,
        businessId,
        businessName: first.businessName,
        traderHostel: first.traderHostel,
        items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
        totalAmount: itemsSubtotal,
        deliveryFee,
        grandTotal: orderTotal,
        status: 'placed',
        createdAt: timestamp,
        notes: deliveryDetails.notes,
      };

      createdOrders.push(orderRecord);

      // Trigger chat message / order snippet directly with the trader!
      try {
        const orderSummaryText = `🛒 *New Campus Foundry Order #${orderNumber}*\n` +
          `Hostel Delivery to: *${deliveryDetails.hostelRoom}*\n` +
          `Items:\n${items.map((i) => `• ${i.quantity}x ${i.name} (₦${(i.price * i.quantity).toLocaleString()})`).join('\n')}\n` +
          `Delivery Fee: ₦${deliveryFee.toLocaleString()}\n` +
          `*Total Payable:* ₦${orderTotal.toLocaleString()}\n` +
          (deliveryDetails.notes ? `Note: ${deliveryDetails.notes}` : '');

        openChatWithBusiness(
          {
            id: businessId,
            name: first.businessName,
            imageUrl: first.businessImageUrl || '',
            hostelLocation: first.traderHostel || 'UNILORIN Hostels',
            ownerName: first.businessName,
            whatsapp: first.businessWhatsapp || '08012345678',
            category: 'Campus Service',
            startingPrice: orderTotal,
            services: [],
            rating: 5,
            reviewsCount: 1,
            verifiedStudent: true,
            acceptsHostelDelivery: true,
            campus: 'Permanent Site',
            studentDept: 'Student Trade',
            studentLevel: '300L',
            tagline: 'Student Vendor',
            description: 'Campus Foundry Trader',
            university: 'University of Ilorin',
          },
          orderSummaryText,
          {
            items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
            totalAmount: orderTotal,
            deliveryRoom: deliveryDetails.hostelRoom,
            status: 'pending',
          }
        );
      } catch (err) {
        console.warn('Could not post order snippet to chat:', err);
      }
    }

    // Save orders to history and clear active cart
    setOrders((prev) => [...createdOrders, ...prev]);
    setCartItems([]);
    setIsCartOpen(false);

    return createdOrders;
  }, [cartItems, currentUser, guestToken, openChatWithBusiness]);

  const contextValue = useMemo(
    () => ({
      cartItems,
      wishlistItems,
      orders,
      isCartOpen,
      setIsCartOpen,
      addToCart,
      updateQuantity,
      removeFromCart,
      undoLastRemoval,
      clearCart,
      totalItemCount,
      subtotal,
      deliveryFeeTotal,
      grandTotal,
      toggleWishlist,
      isWishlisted,
      placeOrders,
    }),
    [
      cartItems,
      wishlistItems,
      orders,
      isCartOpen,
      addToCart,
      updateQuantity,
      removeFromCart,
      undoLastRemoval,
      clearCart,
      totalItemCount,
      subtotal,
      deliveryFeeTotal,
      grandTotal,
      toggleWishlist,
      isWishlisted,
      placeOrders,
    ]
  );

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
