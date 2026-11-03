import { supabase, isSupabaseConfigured, formatSupabaseErrorMessage } from './supabase';
import { AppUser, UserRole, StudentLevel } from '../types';

export const UNILORIN_DOMAIN = 'students.unilorin.edu.ng';
export const MATRIC_USERNAME_REGEX = /^[a-z0-9-]+$/i;
export const ADMIN_EMAILS: string[] = [];

export interface SendOtpResult {
  success: boolean;
  message: string;
  expiresInSeconds?: number;
  retryAfterSeconds?: number;
}

export interface VerifyOtpParams {
  email: string;
  otp: string;
  fullName?: string;
  role?: UserRole;
  level?: StudentLevel;
  hostelLocation?: string;
  whatsapp?: string;
  faculty?: string;
  department?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  user: AppUser;
  needsOnboarding?: boolean;
  message?: string;
}

/**
 * // LAUNCH POLISH: Strict Client-Side validation and sanitization before hitting authentication gateway
 */
export function validateUnilorinEmail(email: string): { valid: boolean; error?: string; matricNumber?: string } {
  // LAUNCH POLISH: Input sanitization - strip unsafe whitespace and control chars
  const normalized = (email || '').trim().toLowerCase().replace(/[\x00-\x1F\x7F]/g, '');
  if (!normalized || !normalized.includes('@')) {
    return { valid: false, error: 'Please enter a valid UNILORIN student email address.' };
  }

  if (ADMIN_EMAILS.includes(normalized)) {
    return { valid: true, matricNumber: normalized.split('@')[0] };
  }

  const parts = normalized.split('@');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed email format.' };
  }

  const [username, domain] = parts;

  // LAUNCH POLISH: Strict domain check (no external domains, no spoofing)
  if (domain !== UNILORIN_DOMAIN) {
    return {
      valid: false,
      error: `Only official UNILORIN student emails (@${UNILORIN_DOMAIN}) are permitted.`
    };
  }

  // Matriculation format check
  if (!MATRIC_USERNAME_REGEX.test(username)) {
    return {
      valid: false,
      error: 'Invalid student username. Format must be your matriculation identifier (e.g. 25-31qq023).'
    };
  }

  return { valid: true, matricNumber: username };
}

/**
 * Initiates 6-digit OTP delivery using Supabase Auth signInWithOtp
 */
export async function requestStudentEmailOTP(email: string): Promise<SendOtpResult> {
  const validation = validateUnilorinEmail(email);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const normalized = email.trim().toLowerCase();

  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    const lower = error.message?.toLowerCase() || '';
    if (lower.includes('rate') || error.status === 429) {
      throw new Error('Too many attempts. Please wait 60 seconds before requesting another code.');
    }
    throw new Error(formatSupabaseErrorMessage(error, 'Failed to send verification code. Please try again.'));
  }

  return {
    success: true,
    message: `A 6-digit verification code has been sent to ${normalized}. Please check your webmail inbox or spam folder.`,
    expiresInSeconds: 600,
    retryAfterSeconds: 60,
  };
}

/**
 * Verifies 6-digit OTP via Supabase Auth verifyOtp, then checks and syncs profile
 */
export async function verifyStudentEmailOTP(params: VerifyOtpParams): Promise<VerifyOtpResult> {
  const validation = validateUnilorinEmail(params.email);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const token = params.otp.trim();
  if (!token || !/^\d{6}$/.test(token)) {
    throw new Error('Please enter a valid 6-digit verification passcode.');
  }

  const normalized = params.email.trim().toLowerCase();

  const { data, error } = await supabase.auth.verifyOtp({
    email: normalized,
    token,
    type: 'email',
  });

  if (error || !data?.user) {
    const msg = error?.message?.toLowerCase() || '';
    if (msg.includes('expire') || msg.includes('token expired')) {
      throw new Error('Verification code has expired. Please request a new code.');
    }
    if (msg.includes('rate') || error?.status === 429) {
      throw new Error('Too many verification attempts. Please wait a moment before trying again.');
    }
    throw new Error('Incorrect verification code. Please check your webmail inbox or spam folder and try again.');
  }

  const user = data.user;
  const matric = validation.matricNumber || normalized.split('@')[0];

  // Fetch existing profile from Supabase profiles table
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const needsOnboarding = !existingProfile || !existingProfile.full_name || existingProfile.full_name === 'UNILORIN Student' || !existingProfile.level || !existingProfile.department;

  // Prepare app user representation
  const appUser: AppUser = {
    id: user.id,
    email: normalized,
    fullName: params.fullName?.trim() || existingProfile?.full_name || 'UNILORIN Student',
    username: existingProfile?.username || matric,
    matricNumber: existingProfile?.matric_number || matric,
    role: (existingProfile?.role as UserRole) || params.role || 'student',
    accountType: existingProfile?.account_type || (params.role === 'trader' ? 'TRADER' : 'BUYER'),
    university: 'University of Ilorin (UNILORIN)',
    level: (existingProfile?.level as StudentLevel) || params.level || '300L',
    hostelLocation: existingProfile?.hostel_location || params.hostelLocation,
    faculty: existingProfile?.faculty || params.faculty,
    department: existingProfile?.department || params.department,
    whatsapp: existingProfile?.whatsapp || params.whatsapp,
    isVerified: true,
    unilorinDomain: UNILORIN_DOMAIN,
    joinedAt: user.created_at || new Date().toISOString(),
    followersCount: existingProfile?.followers_count || 0,
    followingCount: existingProfile?.following_count || 0,
    postsCount: existingProfile?.posts_count || 0,
    followingUserIds: existingProfile?.following_user_ids || [],
    blockedUserIds: existingProfile?.blocked_user_ids || [],
    avatarUrl: existingProfile?.avatar_url,
    bio: existingProfile?.bio,
  };

  // Upsert profile into Supabase profiles table using real column names
  if (params.fullName || params.level || params.faculty || params.department) {
    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        email: normalized,
        full_name: appUser.fullName,
        username: appUser.username,
        matric_number: appUser.matricNumber,
        role: appUser.role,
        account_type: appUser.accountType,
        level: appUser.level,
        faculty: appUser.faculty,
        department: appUser.department,
        hostel_location: appUser.hostelLocation,
        whatsapp: appUser.whatsapp,
        is_verified: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase Profile Upsert Notice]:', e);
    }
  }

  return {
    success: true,
    user: appUser,
    needsOnboarding,
    message: 'Identity verified successfully with University of Ilorin credentials.'
  };
}

