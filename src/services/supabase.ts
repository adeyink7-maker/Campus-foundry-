import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CampusPost, CampusSnap, StudentBusiness, CampusComment } from '../types';

/**
 * Checks if a string is a Supabase API key (publishable key, secret key, or JWT)
 * rather than a valid URL.
 */
function isLikelyApiKey(val: string | undefined): boolean {
  if (!val) return false;
  const trimmed = val.trim().replace(/^['"]+|['"]+$/g, '');
  return (
    trimmed.startsWith('sb_publishable_') ||
    trimmed.startsWith('sb_secret_') ||
    trimmed.startsWith('eyJ') ||
    (trimmed.includes('_') && !trimmed.includes('/') && !trimmed.includes('.'))
  );
}

/**
 * Checks if a string is a valid Supabase project URL
 * (e.g. https://your-project.supabase.co or custom domain)
 */
function isLikelySupabaseUrl(val: string | undefined): boolean {
  if (!val) return false;
  const trimmed = val.trim().replace(/^['"]+|['"]+$/g, '').toLowerCase();
  if (isLikelyApiKey(trimmed)) return false;

  const withoutProto = trimmed.replace(/^https?:\/\//, '');
  const host = withoutProto.split('/')[0].split('?')[0].split(':')[0];

  if (host === 'localhost' || host === '127.0.0.1') return true;
  // Domain must contain at least one dot, no underscores, and no spaces
  return host.includes('.') && !host.includes('_') && !host.includes(' ') && host.length >= 5;
}

/**
 * Normalizes and sanitizes a valid URL string
 */
function cleanUrl(rawUrl: string): string {
  let cleaned = rawUrl.trim().replace(/^['"]+|['"]+$/g, '').trim();
  if (cleaned.startsWith('http://')) {
    cleaned = cleaned.replace(/^http:\/\//i, 'https://');
  } else if (!cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned.replace(/\/+$/, '');
}

/**
 * Cleans an API key
 */
function cleanKey(rawKey: string): string {
  return rawKey.trim().replace(/^['"]+|['"]+$/g, '').trim();
}

const rawEnvUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawEnvKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let resolvedUrl = 'https://placeholder-project.supabase.co';
let resolvedKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-anon-key';
let configured = false;

// 1. Detect if the user swapped VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
if (isLikelySupabaseUrl(rawEnvKey) && isLikelyApiKey(rawEnvUrl)) {
  if (typeof window !== 'undefined') {
    console.info(
      '[Supabase Auto-Config]: Detected that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY were inverted. Automatically routing to the correct endpoints.'
    );
  }
  resolvedUrl = cleanUrl(rawEnvKey!);
  resolvedKey = cleanKey(rawEnvUrl!);
  configured = true;
} else if (isLikelySupabaseUrl(rawEnvUrl)) {
  // Standard valid URL
  resolvedUrl = cleanUrl(rawEnvUrl!);
  if (rawEnvKey && rawEnvKey.trim().length > 10) {
    resolvedKey = cleanKey(rawEnvKey);
  }
  configured = !resolvedUrl.includes('placeholder-project');
} else {
  // URL is missing or invalid (e.g. user entered a publishable key into VITE_SUPABASE_URL)
  if (isLikelyApiKey(rawEnvUrl)) {
    resolvedKey = cleanKey(rawEnvUrl!);
    if (typeof window !== 'undefined') {
      console.warn(
        `[Supabase Configuration Notice]: The value provided in VITE_SUPABASE_URL appears to be a Supabase Publishable Key ("${rawEnvUrl}"), not a Project URL.\n` +
        `A Supabase project URL format looks like: https://<project-id>.supabase.co\n` +
        `Running safely in local offline mode until a valid Project URL is provided.`
      );
    }
  }
  configured = false;
}

export const SUPABASE_URL = resolvedUrl;
export const SUPABASE_ANON_KEY = resolvedKey;
export const isSupabaseConfigured = configured;

if (typeof window !== 'undefined') {
  console.info('[Supabase Runtime Status]:', {
    endpoint: SUPABASE_URL,
    isLiveConfigured: isSupabaseConfigured,
    keyFormat: SUPABASE_ANON_KEY.startsWith('sb_publishable_') ? 'publishable_key' : 'jwt_token',
  });
}

/**
 * Custom fetch wrapper to log network interactions safely without raising unhandled errors
 */
const customFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : (input as Request).url;
  const method = init?.method || 'GET';
  try {
    const res = await fetch(input, init);
    if (!res.ok && res.status !== 404) {
      console.warn(`[Supabase HTTP Response] ${method} ${url} -> Status ${res.status} (${res.statusText})`);
    }
    return res;
  } catch (fetchError: any) {
    // Log as warning rather than uncaught error to prevent false-alarm fatal exceptions
    console.warn(`[Supabase Network Notice] ${method} ${url} could not be reached:`, fetchError?.message || fetchError);
    throw fetchError;
  }
};

// Export singleton Supabase client
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    fetch: customFetch,
  },
});

/**
 * Formats Supabase error messages into user-friendly diagnostic notices,
 * specifically identifying ad-blockers, network firewalls, and credential issues.
 */
export function formatSupabaseErrorMessage(err: any, defaultMessage = 'An unexpected error occurred'): string {
  if (!err) return defaultMessage;

  const rawMsg = typeof err === 'string' 
    ? err 
    : err.message || err.error_description || (err.error?.message ?? '');

  const lower = (rawMsg || '').toLowerCase();

  // Network / Ad-Blocker / Firewall interception
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed') ||
    lower.includes('connection refused') ||
    lower.includes('err_blocked_by_client')
  ) {
    return 'Unable to reach the Supabase backend server ("Failed to fetch"). Please verify your VITE_SUPABASE_URL (e.g. https://<project-ref>.supabase.co) and ensure no ad-blocker or firewall is blocking requests.';
  }

  // Email provider / SMTP configuration issue
  if (lower.includes('confirmation email') || lower.includes('error sending')) {
    return 'Supabase project email provider error. Please configure custom SMTP in Supabase Dashboard (Authentication > Email Settings). Verification has been routed through the UNILORIN Student Gateway.';
  }

  // Credential configuration issues
  if (lower.includes('invalid api key') || lower.includes('jwt') || lower.includes('apikey') || lower.includes('unauthorized')) {
    return 'Supabase authentication failed: Invalid API credentials. Please verify your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.';
  }

  return rawMsg || defaultMessage;
}

/**
 * Storage Helper: Upload a file (avatar, product image, story snap, etc.)
 */
export async function uploadMedia(
  bucket: 'avatars' | 'media' | 'businesses',
  path: string,
  file: File | Blob
): Promise<string> {
  if (!isSupabaseConfigured) {
    return URL.createObjectURL(file);
  }

  try {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
    });

    if (error) {
      console.warn(`[Supabase Storage Notice (${bucket}/${path})]:`, error.message);
      return URL.createObjectURL(file);
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicData.publicUrl;
  } catch (err: any) {
    console.warn('[Supabase Storage uploadMedia fallback]:', err?.message || err);
    return URL.createObjectURL(file);
  }
}

/**
 * Test connectivity to the Supabase backend
 */
export async function testSupabaseConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  if (!isSupabaseConfigured) {
    return true; // Local preview mode
  }
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

// ============================================================================
// SUPABASE CRUD OPERATIONS FOR CAMPUS POSTS
// ============================================================================

export async function fetchCampusPostsFromSupabase(): Promise<CampusPost[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('campus_posts')
      .select('*, campus_comments(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase fetchCampusPosts Notice]:', error.message || error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      authorId: row.author_id,
      authorName: row.author_name,
      authorUsername: row.author_username,
      authorAvatar: row.author_avatar,
      authorDept: row.author_dept,
      authorLevel: row.author_level,
      authorRole: row.author_role,
      authorBusinessId: row.author_business_id,
      content: row.content,
      category: row.category,
      mediaUrl: row.media_url,
      mediaType: row.media_type,
      locationTag: row.location_tag,
      likesCount: row.likes_count || 0,
      commentsCount: row.comments_count || 0,
      resharesCount: row.reshares_count || 0,
      reactions: row.reactions,
      pinned: row.pinned,
      createdAt: row.created_at,
      comments: (row.campus_comments || []).map((c: any) => ({
        id: c.id,
        postId: c.post_id,
        authorId: c.author_id,
        authorName: c.author_name,
        authorAvatar: c.author_avatar,
        authorDept: c.author_dept,
        authorLevel: c.author_level,
        text: c.text,
        createdAt: c.created_at,
      })),
    }));
  } catch (err: any) {
    console.warn('[Supabase fetchCampusPosts Exception]:', err?.message || err);
    return [];
  }
}

export async function createCampusPostInSupabase(post: CampusPost): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase.from('campus_posts').insert({
      id: post.id.startsWith('post_') ? undefined : post.id,
      author_id: post.authorId,
      author_name: post.authorName,
      author_username: post.authorUsername,
      author_avatar: post.authorAvatar,
      author_dept: post.authorDept,
      author_level: post.authorLevel,
      author_role: post.authorRole,
      author_business_id: post.authorBusinessId,
      content: post.content,
      category: post.category,
      media_url: post.mediaUrl,
      mediaType: post.mediaType,
      location_tag: post.locationTag,
      likes_count: post.likesCount || 0,
      comments_count: 0,
      reactions: post.reactions,
      pinned: post.pinned || false,
      created_at: post.createdAt,
    });
    if (error) {
      console.warn('[Supabase createCampusPost Notice]:', error.message || error);
    }
  } catch (err: any) {
    console.warn('[Supabase createCampusPost Exception]:', err?.message || err);
  }
}

export async function deleteCampusPostInSupabase(postId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase.from('campus_posts').delete().eq('id', postId);
    if (error) {
      console.warn('[Supabase deleteCampusPost Notice]:', error.message || error);
    }
  } catch (err: any) {
    console.warn('[Supabase deleteCampusPost Exception]:', err?.message || err);
  }
}

export async function toggleCampusPostLikeInSupabase(postId: string, newLikesCount: number): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase.from('campus_posts').update({ likes_count: newLikesCount }).eq('id', postId);
    if (error) {
      console.warn('[Supabase toggleCampusPostLike Notice]:', error.message || error);
    }
  } catch (err: any) {
    console.warn('[Supabase toggleCampusPostLike Exception]:', err?.message || err);
  }
}

export async function addCampusCommentInSupabase(comment: CampusComment): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase.from('campus_comments').insert({
      post_id: comment.postId,
      author_id: comment.authorId,
      author_name: comment.authorName,
      author_avatar: comment.authorAvatar,
      author_dept: comment.authorDept,
      author_level: comment.authorLevel,
      text: comment.text,
      created_at: comment.createdAt,
    });
    if (error) {
      console.warn('[Supabase addCampusComment Notice]:', error.message || error);
    }
  } catch (err: any) {
    console.warn('[Supabase addCampusComment Exception]:', err?.message || err);
  }
}

// ============================================================================
// SUPABASE CRUD OPERATIONS FOR STUDENT BUSINESSES
// ============================================================================

export async function fetchStudentBusinessesFromSupabase(): Promise<StudentBusiness[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('student_businesses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase fetchStudentBusinesses Notice]:', error.message || error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      tagline: row.tagline,
      description: row.description,
      category: row.category,
      university: row.university || 'University of Ilorin',
      campus: row.campus || 'Permanent Site',
      hostelLocation: row.hostel_location,
      ownerId: row.owner_id,
      ownerName: row.owner_name,
      ownerEmail: row.owner_email,
      studentFaculty: row.student_faculty,
      studentDept: row.student_dept,
      studentLevel: row.student_level,
      whatsapp: row.whatsapp,
      rating: Number(row.rating) || 5.0,
      reviewsCount: row.reviews_count || 0,
      acceptsHostelDelivery: Boolean(row.accepts_hostel_delivery),
      startingPrice: Number(row.starting_price) || 0,
      services: row.services || [],
      imageUrl: row.image_url,
      badge: row.badge,
      verifiedStudent: Boolean(row.verified_student),
    }));
  } catch (err: any) {
    console.warn('[Supabase fetchStudentBusinesses Exception]:', err?.message || err);
    return [];
  }
}

export async function upsertStudentBusinessInSupabase(biz: StudentBusiness): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase.from('student_businesses').upsert({
      id: biz.id.startsWith('biz_') ? undefined : biz.id,
      name: biz.name,
      tagline: biz.tagline,
      description: biz.description,
      category: biz.category,
      university: biz.university,
      campus: biz.campus,
      hostel_location: biz.hostelLocation,
      owner_id: biz.ownerId,
      owner_name: biz.ownerName,
      owner_email: biz.ownerEmail,
      student_faculty: biz.studentFaculty,
      student_dept: biz.studentDept,
      student_level: biz.studentLevel,
      whatsapp: biz.whatsapp,
      rating: biz.rating,
      reviews_count: biz.reviewsCount,
      accepts_hostel_delivery: biz.acceptsHostelDelivery,
      starting_price: biz.startingPrice,
      services: biz.services,
      image_url: biz.imageUrl,
      badge: biz.badge,
      verified_student: biz.verifiedStudent,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('[Supabase upsertStudentBusiness Notice]:', error.message || error);
    }
  } catch (err: any) {
    console.warn('[Supabase upsertStudentBusiness Exception]:', err?.message || err);
  }
}

export async function deleteStudentBusinessInSupabase(bizId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase.from('student_businesses').delete().eq('id', bizId);
    if (error) {
      console.warn('[Supabase deleteStudentBusiness Notice]:', error.message || error);
    }
  } catch (err: any) {
    console.warn('[Supabase deleteStudentBusiness Exception]:', err?.message || err);
  }
}

// ============================================================================
// SUPABASE CRUD OPERATIONS FOR CAMPUS SNAPS (24H STORIES)
// ============================================================================

export async function fetchCampusSnapsFromSupabase(): Promise<CampusSnap[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('campus_snaps')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase fetchCampusSnaps Notice]:', error.message || error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      authorId: row.author_id,
      authorName: row.author_name,
      authorUsername: row.author_username,
      authorAvatar: row.author_avatar,
      authorDept: row.author_dept,
      authorLevel: row.author_level,
      locationTag: row.location_tag,
      mediaUrl: row.media_url,
      mediaType: row.media_type,
      caption: row.caption || '',
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      expiresInHours: row.expires_in_hours || 24,
      viewsCount: row.views_count || 0,
      stickers: row.stickers || [],
    }));
  } catch (err: any) {
    console.warn('[Supabase fetchCampusSnaps Exception]:', err?.message || err);
    return [];
  }
}

export async function createCampusSnapInSupabase(snap: CampusSnap): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase.from('campus_snaps').insert({
      id: snap.id.startsWith('snap_') ? undefined : snap.id,
      author_id: snap.authorId,
      author_name: snap.authorName,
      author_username: snap.authorUsername,
      author_avatar: snap.authorAvatar,
      author_dept: snap.authorDept,
      author_level: snap.authorLevel,
      location_tag: snap.locationTag,
      media_url: snap.mediaUrl,
      media_type: snap.mediaType || 'image',
      caption: snap.caption,
      created_at: snap.createdAt,
      expires_in_hours: snap.expiresInHours || 24,
      views_count: snap.viewsCount || 0,
      stickers: snap.stickers || [],
    });

    if (error) {
      console.warn('[Supabase createCampusSnap Notice]:', error.message || error);
    }
  } catch (err: any) {
    console.warn('[Supabase createCampusSnap Exception]:', err?.message || err);
  }
}
