import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured, formatSupabaseErrorMessage } from '../services/supabase';
import { AppUser, UserRole, AccountType, TraderProfile, StudentBusiness } from '../types';
import { 
  requestStudentEmailOTP, 
  verifyStudentEmailOTP, 
  SendOtpResult, 
  VerifyOtpParams 
} from '../services/unilorinAuth';

export interface TraderElevationData {
  brandName: string;
  brandLogoUrl: string;
  businessCategory: string;
  campusLocation: string;
  whatsappContact: string;
  description?: string;
  startingPrice?: number;
  acceptsHostelDelivery?: boolean;
}

interface AuthContextType {
  currentUser: AppUser | null;
  isLoading: boolean;
  signInWithEmail: (email: string, pass: string, role?: UserRole) => Promise<AppUser>;
  signUpWithEmail: (
    email: string,
    pass: string,
    fullName: string,
    role: UserRole,
    hostelLocation?: string,
    whatsapp?: string,
    faculty?: string,
    department?: string
  ) => Promise<AppUser>;
  requestUnilorinOTP: (email: string) => Promise<SendOtpResult>;
  verifyUnilorinOTP: (params: VerifyOtpParams) => Promise<AppUser>;
  signInDemo: (role: UserRole) => Promise<AppUser>;
  signOut: () => void;
  updateUser: (updatedData: Partial<AppUser>) => void;
  elevateToTrader: (traderData: TraderElevationData) => Promise<{ user: AppUser; business: StudentBusiness }>;
  toggleFollowUser: (targetUserId: string) => void;
  clearAllRegisteredAccounts: () => void;
}

const STORAGE_KEY = 'campus_foundry_user_session_v4';
const REGISTERED_USERS_KEY = 'campus_foundry_accounts_v4';
const STORAGE_BUSINESSES_KEY = 'campus_foundry_custom_businesses_v4';

const LEGACY_STORAGE_KEYS = [
  'campus_foundry_user_session',
  'campus_foundry_user_session_v2',
  'campus_foundry_user_session_v3',
  'campus_foundry_accounts',
  'campus_foundry_accounts_v2',
  'campus_foundry_accounts_v3',
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to sync user session to localStorage & memory
  const saveUserSession = (user: AppUser | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      try {
        const accounts = getStoredAccounts();
        if (accounts[user.email.toLowerCase()]) {
          accounts[user.email.toLowerCase()].user = user;
          localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(accounts));
        }
      } catch {}
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const getStoredAccounts = (): Record<string, { user: AppUser; passwordHash: string }> => {
    try {
      const stored = localStorage.getItem(REGISTERED_USERS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const saveAccountRecord = (email: string, user: AppUser, pass: string) => {
    try {
      const accounts = getStoredAccounts();
      accounts[email.toLowerCase()] = {
        user,
        passwordHash: pass,
      };
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(accounts));
    } catch {}
  };

  // Sync Supabase Auth session & onAuthStateChange listener
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // Purge legacy storage keys
        LEGACY_STORAGE_KEYS.forEach((k) => {
          try {
            localStorage.removeItem(k);
          } catch {}
        });

        // 1. Check local session cache for immediate offline/fast render
        const cachedSession = localStorage.getItem(STORAGE_KEY);
        if (cachedSession) {
          try {
            const parsed = JSON.parse(cachedSession);
            if (isMounted) setCurrentUser(parsed);
          } catch {}
        }

        // 2. If Supabase is configured, verify session
        if (isSupabaseConfigured) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && isMounted) {
            await syncUserProfileFromSupabase(session.user.id, session.user.email);
          }
        }
      } catch (e) {
        console.warn('[Auth] Session initialization warning:', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initAuth();

    // Set up Supabase Auth state change subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_IN' && session?.user) {
        await syncUserProfileFromSupabase(session.user.id, session.user.email);
      } else if (event === 'SIGNED_OUT') {
        saveUserSession(null);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const syncUserProfileFromSupabase = async (userId: string, userEmail?: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('[Supabase] Could not fetch profile from table:', error.message);
      }

      if (profile) {
        const mappedUser: AppUser = {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name || 'UNILORIN Student',
          username: profile.username || profile.email?.split('@')[0],
          matricNumber: profile.matric_number,
          role: (profile.role as UserRole) || 'student',
          accountType: (profile.account_type as AccountType) || 'BUYER',
          university: profile.university || 'University of Ilorin (UNILORIN)',
          faculty: profile.faculty,
          department: profile.department,
          hostelLocation: profile.hostel_location,
          whatsapp: profile.whatsapp,
          isVerified: Boolean(profile.is_verified),
          avatarUrl: profile.avatar_url,
          bio: profile.bio,
          postsCount: profile.posts_count || 0,
          followersCount: profile.followers_count || 0,
          followingCount: profile.following_count || 0,
          followingUserIds: profile.following_user_ids || [],
          blockedUserIds: profile.blocked_user_ids || [],
          joinedAt: profile.created_at || new Date().toISOString(),
        };
        saveUserSession(mappedUser);
      } else if (userEmail) {
        // Fallback to local accounts list
        const accounts = getStoredAccounts();
        const existing = accounts[userEmail.toLowerCase()];
        if (existing) {
          saveUserSession(existing.user);
        }
      }
    } catch (e) {
      console.warn('[Supabase] Profile sync warning:', e);
    }
  };

  const clearAllRegisteredAccounts = () => {
    try {
      localStorage.removeItem(REGISTERED_USERS_KEY);
      localStorage.removeItem(STORAGE_KEY);
      LEGACY_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
      saveUserSession(null);
      supabase.auth.signOut().catch(() => {});
    } catch (e) {
      console.error('Error clearing accounts:', e);
    }
  };

  const signInWithEmail = async (email: string, pass: string, preferredRole?: UserRole): Promise<AppUser> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please provide a valid UNILORIN student email or personal email address.');
    }
    if (!pass || pass.length < 4) {
      throw new Error('Please provide your account password.');
    }

    // 1. Attempt Supabase Auth sign-in if configured
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pass,
        });
        if (error) {
          console.error('[Supabase signInWithPassword Error Response]:', {
            error,
            status: (error as any)?.status,
            name: error.name,
            message: error.message,
            email: cleanEmail,
          });
          const formatted = formatSupabaseErrorMessage(error, 'Sign-in failed.');
          if (
            formatted.includes('Failed to fetch') ||
            formatted.includes('ad-blocker') ||
            formatted.includes('Invalid API credentials')
          ) {
            throw new Error(formatted);
          }
        } else if (data.user) {
          await syncUserProfileFromSupabase(data.user.id, data.user.email);
          if (currentUser) return currentUser;
        }
      } catch (err: any) {
        console.error('[Supabase Auth] Remote sign-in exception:', err);
        const lower = (err?.message || '').toLowerCase();
        if (lower.includes('failed to fetch') || lower.includes('ad-blocker') || lower.includes('credentials')) {
          throw err;
        }
      }
    }

    // 2. Local Fallback Account Handling
    const accounts = getStoredAccounts();
    const existing = accounts[cleanEmail];

    if (existing) {
      if (existing.passwordHash !== pass) {
        throw new Error('Incorrect password. Please verify and try again.');
      }
      const loggedUser = {
        ...existing.user,
        role: existing.user.accountType === 'TRADER' ? ('trader' as UserRole) : (preferredRole || existing.user.role),
      };
      saveUserSession(loggedUser);
      return loggedUser;
    }

    // Initialize new student buyer account
    const generatedName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
    const formattedName = generatedName.charAt(0).toUpperCase() + generatedName.slice(1);
    const username = cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');

    const newUser: AppUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      email: cleanEmail,
      fullName: formattedName,
      username: username || 'student_' + Math.floor(Math.random() * 1000),
      role: preferredRole || (cleanEmail.includes('trader') || cleanEmail.includes('shop') ? 'trader' : 'student'),
      accountType: preferredRole === 'trader' ? 'TRADER' : 'BUYER',
      university: 'University of Ilorin (UNILORIN)',
      hostelLocation: 'Lagos Hostel (PS)',
      postsCount: 12,
      followersCount: 184,
      followingCount: 92,
      followingUserIds: [],
      blockedUserIds: [],
      joinedAt: new Date().toISOString(),
    };

    saveAccountRecord(cleanEmail, newUser, pass);
    saveUserSession(newUser);
    return newUser;
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    fullName: string,
    role: UserRole,
    hostelLocation?: string,
    whatsapp?: string,
    faculty?: string,
    department?: string
  ): Promise<AppUser> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please provide a valid university or personal email address.');
    }
    if (!fullName.trim()) {
      throw new Error('Please provide your full name or trade name.');
    }
    if (!pass || pass.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const accounts = getStoredAccounts();
    if (accounts[cleanEmail]) {
      throw new Error('An account with this email already exists. Please choose Sign In instead.');
    }

    const username = cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');

    const newUser: AppUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      email: cleanEmail,
      fullName: fullName.trim(),
      username: username || 'student_' + Math.floor(Math.random() * 1000),
      role: role || 'student',
      accountType: role === 'trader' ? 'TRADER' : 'BUYER',
      university: 'University of Ilorin (UNILORIN)',
      hostelLocation: hostelLocation?.trim() || 'Lagos Hostel (Male Wing)',
      faculty: faculty?.trim() || 'Faculty of Communication and Information Sciences',
      department: department?.trim() || 'Computer Science',
      whatsapp: whatsapp?.trim() || '',
      postsCount: 0,
      followersCount: 48,
      followingCount: 22,
      followingUserIds: [],
      blockedUserIds: [],
      joinedAt: new Date().toISOString(),
    };

    // 1. Supabase Auth registration
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: pass,
          options: {
            data: {
              full_name: fullName.trim(),
              role,
              hostel_location: hostelLocation,
              whatsapp,
              faculty,
              department,
            },
          },
        });
        if (error) {
          console.error('[Supabase signUp Error Response]:', {
            error,
            status: (error as any)?.status,
            name: error.name,
            message: error.message,
            email: cleanEmail,
          });
          const formatted = formatSupabaseErrorMessage(error, 'Sign-up failed.');
          if (
            formatted.includes('Failed to fetch') ||
            formatted.includes('ad-blocker') ||
            formatted.includes('Invalid API credentials')
          ) {
            throw new Error(formatted);
          }
        } else if (data.user) {
          newUser.id = data.user.id;
        }
      } catch (err: any) {
        console.error('[Supabase Auth] Remote signup exception:', err);
        const lower = (err?.message || '').toLowerCase();
        if (lower.includes('failed to fetch') || lower.includes('ad-blocker') || lower.includes('credentials')) {
          throw err;
        }
      }
    }

    saveAccountRecord(cleanEmail, newUser, pass);
    saveUserSession(newUser);
    return newUser;
  };

  const signInDemo = async (role: UserRole): Promise<AppUser> => {
    const isTrader = role === 'trader';
    const demoUser: AppUser = {
      id: isTrader ? 'trader_adeyinka' : 'student_buyer_unilorin',
      email: isTrader ? 'adeyinka.trader@unilorin.edu.ng' : 'adeyink7@gmail.com',
      fullName: isTrader ? 'Adeyinka (Campus Trader)' : 'Adeyinka (Student Buyer)',
      username: isTrader ? 'adeyinka_ventures' : 'adeyinka_unilorin',
      role,
      accountType: isTrader ? 'TRADER' : 'BUYER',
      university: 'University of Ilorin (UNILORIN)',
      hostelLocation: isTrader ? 'Lagos Hostel, Block C' : 'Abuja Hostel, Block B',
      faculty: 'Faculty of Communication and Information Sciences',
      department: 'Computer Science',
      whatsapp: '2348039281744',
      postsCount: isTrader ? 28 : 14,
      followersCount: isTrader ? 1280 : 380,
      followingCount: isTrader ? 420 : 195,
      followingUserIds: [],
      blockedUserIds: [],
      joinedAt: new Date().toISOString(),
    };
    saveUserSession(demoUser);
    return demoUser;
  };

  const requestUnilorinOTP = async (email: string): Promise<SendOtpResult> => {
    return await requestStudentEmailOTP(email);
  };

  const verifyUnilorinOTP = async (params: VerifyOtpParams): Promise<AppUser> => {
    const result = await verifyStudentEmailOTP(params);
    saveUserSession(result.user);
    saveAccountRecord(result.user.email, result.user, 'verified_student_otp');
    return result.user;
  };

  const elevateToTrader = async (traderData: TraderElevationData): Promise<{ user: AppUser; business: StudentBusiness }> => {
    if (!currentUser) {
      throw new Error('You must be logged in to become a campus trader.');
    }

    const businessId = `biz_${currentUser.id}_${Date.now()}`;

    const newTraderProfile: TraderProfile = {
      id: `tp_${Date.now()}`,
      brandName: traderData.brandName.trim(),
      brandLogoUrl: traderData.brandLogoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
      businessCategory: traderData.businessCategory,
      campusLocation: traderData.campusLocation,
      whatsappContact: traderData.whatsappContact,
      products: [],
      isVerifiedVendor: true,
      activeOrdersToday: 0,
      rating: 5.0,
      reviewsCount: 1,
    };

    const newBusiness: StudentBusiness = {
      id: businessId,
      name: traderData.brandName.trim(),
      tagline: traderData.description || 'Verified student venture serving the UNILORIN community.',
      description: traderData.description || `${traderData.brandName} is a student-owned venture offering ${traderData.businessCategory} at ${traderData.campusLocation}.`,
      category: traderData.businessCategory,
      university: 'University of Ilorin (UNILORIN)',
      campus: 'Permanent Site',
      hostelLocation: traderData.campusLocation,
      ownerId: currentUser.id,
      ownerName: currentUser.fullName,
      ownerEmail: currentUser.email,
      studentFaculty: currentUser.faculty || 'UNILORIN',
      studentDept: currentUser.department || 'Undergraduate',
      studentLevel: currentUser.level || '300L',
      whatsapp: traderData.whatsappContact,
      rating: 5.0,
      reviewsCount: 1,
      acceptsHostelDelivery: traderData.acceptsHostelDelivery ?? true,
      deliveryTimeEstimate: '20 - 45 mins',
      startingPrice: traderData.startingPrice || 1500,
      imageUrl: traderData.brandLogoUrl || 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=800&q=80',
      verifiedStudent: true,
      services: [
        {
          id: `srv_${Date.now()}_1`,
          name: `${traderData.brandName} Standard Package`,
          price: traderData.startingPrice || 1500,
          description: 'Official student rate package',
          estimatedTime: 'Same-day',
        },
      ],
    };

    // Save locally
    try {
      const stored = localStorage.getItem(STORAGE_BUSINESSES_KEY);
      const list: StudentBusiness[] = stored ? JSON.parse(stored) : [];
      const updated = [newBusiness, ...list.filter((b) => b.id !== businessId)];
      localStorage.setItem(STORAGE_BUSINESSES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed saving business locally:', e);
    }

    // Sync to Supabase
    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').update({
          role: 'trader',
          account_type: 'TRADER',
          updated_at: new Date().toISOString(),
        }).eq('id', currentUser.id);

        await supabase.from('student_businesses').insert({
          id: businessId,
          owner_id: currentUser.id,
          name: newBusiness.name,
          category: newBusiness.category,
          campus: newBusiness.campus,
          hostel_location: newBusiness.hostelLocation,
          owner_name: newBusiness.ownerName,
          owner_email: newBusiness.ownerEmail,
          whatsapp: newBusiness.whatsapp,
          image_url: newBusiness.imageUrl,
          starting_price: newBusiness.startingPrice,
          accepts_hostel_delivery: newBusiness.acceptsHostelDelivery,
          services: newBusiness.services,
        });
      } catch (err) {
        console.warn('[Supabase] Elevation sync deferred:', err);
      }
    }

    const elevatedUser: AppUser = {
      ...currentUser,
      role: 'trader',
      accountType: 'TRADER',
      businessProfileId: businessId,
      traderProfile: newTraderProfile,
    };

    saveUserSession(elevatedUser);
    return { user: elevatedUser, business: newBusiness };
  };

  const toggleFollowUser = (targetUserId: string) => {
    if (!currentUser) return;
    const currentFollowing = currentUser.followingUserIds || [];
    const isFollowing = currentFollowing.includes(targetUserId);

    const updatedFollowing = isFollowing
      ? currentFollowing.filter((id) => id !== targetUserId)
      : [...currentFollowing, targetUserId];

    const updatedUser: AppUser = {
      ...currentUser,
      followingUserIds: updatedFollowing,
      followingCount: Math.max(0, (currentUser.followingCount || 0) + (isFollowing ? -1 : 1)),
    };

    saveUserSession(updatedUser);

    if (isSupabaseConfigured) {
      Promise.resolve(
        supabase.from('profiles').update({
          following_user_ids: updatedFollowing,
          following_count: updatedUser.followingCount,
        }).eq('id', currentUser.id)
      ).catch(() => {});
    }
  };

  const signOut = () => {
    supabase.auth.signOut().catch(() => {});
    saveUserSession(null);
  };

  const updateUser = (updatedData: Partial<AppUser>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updatedData };
    saveUserSession(updated);

    if (isSupabaseConfigured) {
      const payload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (updatedData.fullName) payload.full_name = updatedData.fullName;
      if (updatedData.bio !== undefined) payload.bio = updatedData.bio;
      if (updatedData.avatarUrl !== undefined) payload.avatar_url = updatedData.avatarUrl;
      if (updatedData.whatsapp !== undefined) payload.whatsapp = updatedData.whatsapp;
      if (updatedData.hostelLocation !== undefined) payload.hostel_location = updatedData.hostelLocation;

      Promise.resolve(
        supabase.from('profiles').update(payload).eq('id', currentUser.id)
      ).catch(() => {});
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        signInWithEmail,
        signUpWithEmail,
        requestUnilorinOTP,
        verifyUnilorinOTP,
        signInDemo,
        signOut,
        updateUser,
        elevateToTrader,
        toggleFollowUser,
        clearAllRegisteredAccounts,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
