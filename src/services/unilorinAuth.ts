import { supabase, isSupabaseConfigured, formatSupabaseErrorMessage } from './supabase';
import { AppUser, UserRole } from '../types';

export const UNILORIN_DOMAIN = 'students.unilorin.edu.ng';
export const MATRIC_USERNAME_REGEX = /^[a-z0-9-]+$/i;

export interface SendOtpResult {
  success: boolean;
  message: string;
  expiresInSeconds?: number;
  retryAfterSeconds?: number;
}

export interface VerifyOtpParams {
  email: string;
  otp: string;
  fullName: string;
  role: UserRole;
  hostelLocation?: string;
  whatsapp?: string;
  faculty?: string;
  department?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  user: AppUser;
  message?: string;
}

/**
 * Strict Client-Side validation before hitting authentication gateway
 */
export function validateUnilorinEmail(email: string): { valid: boolean; error?: string; matricNumber?: string } {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    return { valid: false, error: 'Please enter a valid UNILORIN student email address.' };
  }

  const parts = normalized.split('@');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed email format.' };
  }

  const [username, domain] = parts;

  // Strict domain check (no external domains, no spoofing)
  if (domain !== UNILORIN_DOMAIN) {
    return {
      valid: false,
      error: `Only official UNILORIN student emails (@${UNILORIN_DOMAIN}) are permitted. External or personal emails are forbidden.`
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
 * Initiates 6-digit OTP delivery using Supabase Auth signInWithOtp,
 * with graceful fallback to the local UNILORIN Gateway if Supabase project has unconfigured SMTP.
 */
export async function requestStudentEmailOTP(email: string): Promise<SendOtpResult> {
  const validation = validateUnilorinEmail(email);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const normalized = email.trim().toLowerCase();

  // 1. Attempt Supabase Auth signInWithOtp when Supabase is live-configured
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: {
          shouldCreateUser: true,
        },
      });

      if (!error) {
        return {
          success: true,
          message: `A 6-digit verification code has been dispatched to ${normalized}. Please check your webmail inbox or spam folder.`,
          expiresInSeconds: 600,
          retryAfterSeconds: 60,
        };
      }

      // Log warning for diagnostic clarity without raising unhandled console errors
      console.warn('[Supabase Auth signInWithOtp Notice]:', {
        status: (error as any)?.status,
        message: error.message,
      });

      const isSmtpOrNetworkIssue =
        (error as any)?.status === 500 ||
        error.message?.toLowerCase().includes('confirmation email') ||
        error.message?.toLowerCase().includes('rate limit') ||
        error.message?.toLowerCase().includes('failed to fetch');

      if (!isSmtpOrNetworkIssue) {
        throw new Error(formatSupabaseErrorMessage(error));
      }
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (!msg.includes('confirmation email') && !msg.includes('failed to fetch')) {
        throw err;
      }
      console.warn('[UNILORIN Auth]: Routing OTP request via Student Gateway fallback.');
    }
  }

  // 2. UNILORIN Student Authentication Gateway Fallback
  try {
    const response = await fetch('/api/auth/unilorin/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalized }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to dispatch verification code.');
    }

    return {
      success: true,
      message: data.message || `Verification code sent to ${normalized}. Please check your student webmail.`,
      expiresInSeconds: data.expiresInSeconds || 600,
      retryAfterSeconds: data.retryAfterSeconds || 60,
    };
  } catch (gatewayErr: any) {
    console.warn('[UNILORIN Gateway Exception]:', gatewayErr?.message || gatewayErr);
    throw new Error(gatewayErr?.message || 'Failed to dispatch verification code. Please check your network connection.');
  }
}

/**
 * Verifies 6-digit OTP via Supabase Auth or UNILORIN Student Gateway, then syncs profile
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
  let verifiedUserId: string | null = null;
  let createdAtStr: string = new Date().toISOString();

  // 1. Attempt Supabase Auth verifyOtp if live-configured
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: normalized,
        token,
        type: 'email',
      });

      if (!error && data?.user) {
        verifiedUserId = data.user.id;
        createdAtStr = data.user.created_at || createdAtStr;
      } else if (error) {
        console.warn('[Supabase Auth verifyOtp Notice]:', error.message);
      }
    } catch (err: any) {
      console.warn('[Supabase Auth verifyOtp Exception]:', err?.message || err);
    }
  }

  // 2. Fall back to local UNILORIN gateway verification if not validated via Supabase Auth
  if (!verifiedUserId) {
    try {
      const response = await fetch('/api/auth/unilorin/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalized,
          otp: token,
          fullName: params.fullName.trim() || 'UNILORIN Student',
          role: params.role,
          hostelLocation: params.hostelLocation,
          whatsapp: params.whatsapp,
          faculty: params.faculty,
          department: params.department,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Verification passcode is incorrect or has expired.');
      }

      verifiedUserId = data.uid || data.user?.uid || `usr_${Math.random().toString(36).substring(2, 9)}`;
      createdAtStr = data.user?.createdAt || createdAtStr;
    } catch (gatewayVerifyErr: any) {
      throw new Error(gatewayVerifyErr?.message || 'Verification failed. Please verify the 6-digit passcode and try again.');
    }
  }

  const matric = validation.matricNumber || normalized.split('@')[0];

  // Map to AppUser
  const appUser: AppUser = {
    id: verifiedUserId || `usr_${Math.random().toString(36).substring(2, 9)}`,
    email: normalized,
    fullName: params.fullName.trim() || 'UNILORIN Student',
    username: matric,
    matricNumber: matric,
    role: params.role,
    accountType: params.role === 'trader' ? 'TRADER' : 'BUYER',
    university: 'University of Ilorin (UNILORIN)',
    hostelLocation: params.hostelLocation,
    faculty: params.faculty,
    department: params.department,
    whatsapp: params.whatsapp,
    isVerified: true,
    unilorinDomain: UNILORIN_DOMAIN,
    joinedAt: createdAtStr,
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    followingUserIds: [],
    blockedUserIds: [],
  };

  // Sync verified student profile to Supabase Database (if configured)
  if (isSupabaseConfigured) {
    try {
      await supabase.from('profiles').upsert({
        id: appUser.id,
        email: appUser.email,
        full_name: appUser.fullName,
        matric_number: appUser.matricNumber,
        username: appUser.username,
        role: appUser.role,
        account_type: appUser.accountType,
        faculty: appUser.faculty,
        department: appUser.department,
        hostel_location: appUser.hostelLocation,
        whatsapp: appUser.whatsapp,
        is_verified: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (supabaseErr: any) {
      console.warn('[Supabase Profile Sync Notice]:', supabaseErr?.message || supabaseErr);
    }
  }

  return {
    success: true,
    user: appUser,
    message: 'Identity verified successfully with University of Ilorin credentials.'
  };
}
