import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CampusPost, CampusSnap, StudentBusiness, CampusComment, ChatConversation, ChatMessage, SnapViewerRecord } from '../types';
import { getFriendlyError, withNetworkRetry } from '../utils/friendlyErrors';

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

  if (!rawMsg) return defaultMessage;
  const lower = rawMsg.toLowerCase();

  // Network / Ad-Blocker / Firewall interception
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed') ||
    lower.includes('connection refused') ||
    lower.includes('err_blocked_by_client')
  ) {
    return 'Unable to reach the Supabase backend server ("Failed to fetch"). Please verify your project URL and ensure no ad-blocker or firewall is blocking requests.';
  }

  // Credential configuration issues
  if (lower.includes('invalid api key') || lower.includes('jwt') || lower.includes('apikey') || lower.includes('unauthorized')) {
    return 'Supabase authentication failed: Invalid API credentials. Please verify your credentials in .env.';
  }

  // Return the real error message as requested
  return rawMsg;
}

/**
 * Ensures an active Supabase Auth session (auth.uid()) exists via supabase.auth.getSession().
 */
export async function ensureSupabaseAuthSession(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch (err) {
    console.warn('[Supabase Auth]: Session verification exception:', err);
  }

  return null;
}

export async function uploadMedia(
  bucket: 'avatars' | 'media' | 'businesses' | 'audio' | 'voice-notes' | 'player-cards',
  path: string,
  file: File | Blob,
  customContentType?: string
): Promise<string> {
  if (!isSupabaseConfigured) {
    const err = new Error('Supabase Storage is not configured.');
    console.error(`[Supabase Storage Upload Error (${bucket}/${path})]:`, {
      message: err.message,
      code: 'STORAGE_NOT_CONFIGURED',
      details: 'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing or invalid',
    });
    emitAppToast('Storage is not configured. Please check your Supabase credentials.', 'error');
    throw err;
  }

  // Enforce RULE: the first folder of the path must equal the signed-in user's id
  let targetPath = path.trim().replace(/^\/+/, '');
  if (!targetPath.includes('/')) {
    let uid = 'usr_me';
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.id) {
        uid = sessionData.session.user.id;
      }
    } catch {}
    targetPath = `${uid}/${targetPath}`;
  }

  const rawMime = customContentType || file.type || '';
  const cleanContentType = rawMime ? rawMime.split(';')[0].trim() : undefined;

  try {
    return await withNetworkRetry(async () => {
      const { data, error } = await supabase.storage.from(bucket).upload(targetPath, file, {
        upsert: true,
        contentType: cleanContentType,
      });

      if (error) {
        console.error(`[Supabase Storage Upload Error (${bucket}/${targetPath})]:`, error);
        throw error;
      }

      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return publicData.publicUrl;
    }, 2);
  } catch (err: unknown) {
    const friendly = getFriendlyError(err, 'upload');
    emitAppToast(friendly, 'error');
    throw new Error(friendly);
  }
}


/**
 * Helper to determine real audio file extension from mime type or file name
 */
export function getAudioExtension(mimeOrName?: string): string {
  if (!mimeOrName) return 'webm';
  const lower = mimeOrName.toLowerCase();
  if (lower.includes('mp4') || lower.includes('m4a')) return 'mp4';
  if (lower.includes('ogg') || lower.includes('opus')) return 'ogg';
  if (lower.includes('wav')) return 'wav';
  if (lower.includes('aac')) return 'aac';
  if (lower.includes('mpeg') || lower.includes('mp3')) return 'mp3';
  return 'webm';
}

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(val?: string | null): boolean {
  return Boolean(val && UUID_REGEX.test(val));
}

// Set of known mock conversation IDs to skip Supabase operations on
export const MOCK_CONV_IDS = new Set<string>([
  '8c0d7b2f-9f5e-4c9b-ab2c-2d3e4f5a6b02',
  '9d1e8c3a-0a6f-4da0-bc3d-3e4f5a6b7c03',
  'conv_campus_bites_1',
  'conv_dami_lagos',
  'conv_tunde_tech',
  '4f1a2b3c-4d5e-4a1b-8c2d-3e4f5a6b7c01',
  '5a2b3c4d-5e6f-4b2c-9d3e-4f5a6b7c8d02',
]);


/**
 * Checks if a conversation ID belongs to local mock data
 */
export function isMockConversation(convId?: string | null): boolean {
  if (!convId) return true;
  if (MOCK_CONV_IDS.has(convId)) return true;
  if (
    convId.startsWith('conv_') ||
    convId.startsWith('mock_') ||
    convId.startsWith('demo_') ||
    convId.startsWith('biz_') ||
    !isValidUuid(convId)
  ) {
    return true;
  }
  return false;
}

/**
 * Returns val if already a valid UUID, or converts any arbitrary string
 * deterministically into a valid RFC4122 v4 UUID so PostgreSQL UUID columns never error with 22P02.
 */
export function toSafeUuid(str?: string | null): string {
  if (!str) return '00000000-0000-4000-8000-000000000000';
  if (UUID_REGEX.test(str)) return str;

  // 128-bit deterministic hash
  let h1 = 0xdeadbeef, h2 = 0x41c64e6d, h3 = 0x9e3779b9, h4 = 0x85ebca6b;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }
  const hex = [h1, h2, h3, h4]
    .map((h) => (h >>> 0).toString(16).padStart(8, '0'))
    .join('');

  return (
    hex.substring(0, 8) +
    '-' +
    hex.substring(8, 12) +
    '-4' +
    hex.substring(13, 16) +
    '-a' +
    hex.substring(17, 20) +
    '-' +
    hex.substring(20, 32)
  );
}

/**
 * Generates standard RFC4122 v4 UUID
 */
export function generateVoiceUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// In-memory cache for fast local playback of voice notes (blob URLs)
const voiceNoteBlobCache = new Map<string, string>();

/**
 * Resolves a voice note path or URL into a playable URL for HTML5 Audio playback.
 * If the path is stored as `${userId}/${uuid}.${ext}`, it resolves via Supabase Storage 'audio' bucket.
 */
export function getPlayableAudioUrl(urlOrPath?: string): string {
  if (!urlOrPath) return '';
  // If it's already an absolute or blob/data URL, return directly
  if (
    urlOrPath.startsWith('http://') ||
    urlOrPath.startsWith('https://') ||
    urlOrPath.startsWith('blob:') ||
    urlOrPath.startsWith('data:')
  ) {
    return urlOrPath;
  }

  // Check if we have an active in-memory blob for instant zero-latency playback
  if (voiceNoteBlobCache.has(urlOrPath)) {
    return voiceNoteBlobCache.get(urlOrPath)!;
  }

  // Resolve public URL from Supabase Storage 'audio' bucket
  try {
    const { data } = supabase.storage.from('audio').getPublicUrl(urlOrPath);
    return data?.publicUrl || urlOrPath;
  } catch (err) {
    console.warn('[Supabase getPlayableAudioUrl Error]:', err);
    return urlOrPath;
  }
}

/**
 * Dispatches an application toast notification for user-visible error handling
 */
export function emitAppToast(message: string, type: 'error' | 'success' | 'info' = 'error'): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('campus-toast', {
        detail: { message, type },
      })
    );
  }
}

/**
 * Uploads a recorded voice note audio blob to Supabase Storage ('audio' or 'voice-notes' bucket).
 * Constructs file path `${activeUid}/${uuid}.${ext}` where activeUid equals the signed-in user's id.
 * Strips any ";codecs=..." from contentType to adhere to allowed mime types.
 */
export async function uploadVoiceNoteAudio(
  fileOrBlob: File | Blob,
  userId?: string
): Promise<string> {
  const ext = getAudioExtension(fileOrBlob.type || (fileOrBlob as File).name);
  const uuid = generateVoiceUuid();

  // 1. Resolve active auth.uid() from Supabase session to satisfy Storage RLS policy
  let activeUid = userId;
  if (isSupabaseConfigured) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.id) {
        activeUid = sessionData.session.user.id;
      }
    } catch {}
  }

  if (!activeUid || activeUid === 'usr_me') {
    activeUid = toSafeUuid(userId || 'usr_me');
  }

  const filePath = `${activeUid}/${uuid}.${ext}`;

  if (!isSupabaseConfigured) {
    const err = new Error('Supabase Storage is not configured for voice notes.');
    console.error('[Voice Note Upload Error]:', {
      message: err.message,
      code: 'STORAGE_NOT_CONFIGURED',
      details: 'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing or invalid',
    });
    emitAppToast('Voice note storage is not configured.', 'error');
    throw err;
  }

  // Strip any ";codecs=..." from mimeType to match allowed Supabase bucket types
  const rawMime = fileOrBlob.type || `audio/${ext}`;
  const cleanContentType = rawMime ? rawMime.split(';')[0].trim() : `audio/${ext}`;

  try {
    return await withNetworkRetry(async () => {
      const { data, error } = await supabase.storage
        .from('audio')
        .upload(filePath, fileOrBlob, {
          upsert: true,
          contentType: cleanContentType,
        });

      if (error) {
        console.error('[Voice Note Upload Error]:', error);
        throw error;
      }

      const { data: publicData } = supabase.storage.from('audio').getPublicUrl(data.path);
      if (!publicData?.publicUrl) {
        throw new Error('Failed to obtain audio URL');
      }
      return publicData.publicUrl;
    }, 2);
  } catch (err: unknown) {
    const friendly = getFriendlyError(err, 'voice');
    emitAppToast(friendly, 'error');
    throw new Error(friendly);
  }
}

/**
 * Uploads a snap photo or video to Supabase Storage 'media' bucket at `${userId}/snaps/${uuid}.${ext}`.
 * - Photos: compressed to 1280px wide JPEG before upload (contentType: 'image/jpeg').
 * - Videos: validated for max 30 seconds and <= 25 MB before upload (contentType: file.type || 'video/mp4').
 * - Failure: throws the error, logs full error details, and never returns a blob: URL.
 */
export async function uploadSnapMedia(
  fileOrBlob: File | Blob,
  userId: string
): Promise<{ url: string; mediaType: 'image' | 'video' }> {
  const isVideo = fileOrBlob.type.startsWith('video');

  // Resolve user id from session or parameter
  let activeUid = userId;
  if (isSupabaseConfigured) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.id) {
        activeUid = sessionData.session.user.id;
      }
    } catch {}
  }
  if (!activeUid || activeUid === 'usr_me') {
    activeUid = toSafeUuid(userId || 'usr_me');
  }

  const uuid = generateVoiceUuid();

  if (!isSupabaseConfigured) {
    const err = new Error('Supabase Storage is not configured for snaps.');
    console.error('[Snap Upload Error]:', {
      message: err.message,
      code: 'STORAGE_NOT_CONFIGURED',
      details: 'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing or invalid',
    });
    emitAppToast('Media storage is not configured.', 'error');
    throw err;
  }

  if (isVideo) {
    // 1. File size check (max ~25 MB)
    const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
    if (fileOrBlob.size > MAX_VIDEO_BYTES) {
      const err = new Error('Video file size exceeds 25 MB limit');
      console.error('[Snap Upload Error]: Video file size exceeds 25 MB limit', {
        message: err.message,
        code: 'FILE_TOO_LARGE',
        details: `File size: ${fileOrBlob.size} bytes`,
      });
      emitAppToast('Video is too large. Snaps must be under 25 MB.', 'error');
      throw err;
    }

    // 2. Video duration check (max 30 seconds)
    if (typeof document !== 'undefined') {
      try {
        const duration = await new Promise<number>((resolve) => {
          const video = document.createElement('video');
          video.preload = 'metadata';
          const tempUrl = URL.createObjectURL(fileOrBlob);
          video.onloadedmetadata = () => {
            URL.revokeObjectURL(tempUrl);
            resolve(video.duration || 0);
          };
          video.onerror = () => {
            URL.revokeObjectURL(tempUrl);
            resolve(0);
          };
          video.src = tempUrl;
        });

        if (duration > 30.5) {
          const err = new Error('Video duration exceeds 30 seconds');
          console.error('[Snap Upload Error]: Video duration exceeds 30 seconds', {
            message: err.message,
            code: 'VIDEO_TOO_LONG',
            duration,
          });
          emitAppToast('Video is too long. Snaps must be 30 seconds or shorter.', 'error');
          throw err;
        }
      } catch (videoMetaErr) {
        console.warn('[Snap Upload]: Could not verify video duration, proceeding with upload:', videoMetaErr);
      }
    }

    const rawExt = (fileOrBlob as File).name?.split('.').pop()?.toLowerCase();
    const ext = rawExt || (fileOrBlob.type.includes('webm') ? 'webm' : 'mp4');
    const filePath = `${activeUid}/snaps/${uuid}.${ext}`;
    const contentType = fileOrBlob.type ? fileOrBlob.type.split(';')[0].trim() : 'video/mp4';

    try {
      const { error } = await supabase.storage
        .from('media')
        .upload(filePath, fileOrBlob, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.error('[Snap Video Upload Error]:', {
          message: error.message,
          code: (error as any)?.code || (error as any)?.statusCode,
          details: (error as any)?.details || error.message,
          error,
        });
        emitAppToast(`Failed to upload snap: ${error.message || 'Storage error'}`, 'error');
        throw error;
      }

      const { data: publicData } = supabase.storage.from('media').getPublicUrl(filePath);
      return { url: publicData.publicUrl, mediaType: 'video' };
    } catch (err: any) {
      console.error('[Snap Video Upload Exception]:', {
        message: err?.message || err,
        code: err?.code || err?.statusCode,
        details: err?.details || err?.message,
        err,
      });
      emitAppToast(err?.message ? `Failed to upload video snap: ${err.message}` : 'Failed to upload video snap. Please try again.', 'error');
      throw err;
    }
  } else {
    // Photos: compress to 1280px wide JPEG before upload
    let uploadBlob: Blob = fileOrBlob;
    if (typeof document !== 'undefined') {
      try {
        uploadBlob = await new Promise<Blob>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error('Failed to read image file'));
          reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => reject(new Error('Failed to load image for compression'));
            img.onload = () => {
              let width = img.width;
              let height = img.height;
              const maxWidth = 1280;
              if (width > maxWidth) {
                const ratio = maxWidth / width;
                width = maxWidth;
                height = Math.round(height * ratio);
              }
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                return resolve(fileOrBlob);
              }
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, width, height);
              canvas.toBlob(
                (blob) => {
                  if (blob) resolve(blob);
                  else resolve(fileOrBlob);
                },
                'image/jpeg',
                0.85
              );
            };
            img.src = e.target?.result as string;
          };
          reader.readAsDataURL(fileOrBlob);
        });
      } catch (compressErr) {
        console.warn('[Snap Upload]: Image compression failed, using original file:', compressErr);
      }
    }

    const filePath = `${activeUid}/snaps/${uuid}.jpg`;
    const contentType = 'image/jpeg';

    try {
      const { error } = await supabase.storage
        .from('media')
        .upload(filePath, uploadBlob, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.error('[Snap Image Upload Error]:', {
          message: error.message,
          code: (error as any)?.code || (error as any)?.statusCode,
          details: (error as any)?.details || error.message,
          error,
        });
        emitAppToast(`Failed to upload snap: ${error.message || 'Storage error'}`, 'error');
        throw error;
      }

      const { data: publicData } = supabase.storage.from('media').getPublicUrl(filePath);
      return { url: publicData.publicUrl, mediaType: 'image' };
    } catch (err: any) {
      console.error('[Snap Image Upload Exception]:', {
        message: err?.message || err,
        code: err?.code || err?.statusCode,
        details: err?.details || err?.message,
        err,
      });
      emitAppToast(err?.message ? `Failed to upload image snap: ${err.message}` : 'Failed to upload image snap. Please try again.', 'error');
      throw err;
    }
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

/**
 * System Reset for Launch Readiness:
 * Clears local state and resets all collections/tables for users/profiles,
 * vendors/stores, posts, comments, snaps, orders, and chats so the database starts at zero.
 */
export async function resetDatabaseToZero(): Promise<{ success: boolean; message: string }> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('campus_foundry_user_session_v4');
      localStorage.removeItem('campus_foundry_chat_messages_v7');
      localStorage.removeItem('campus_foundry_chat_conversations_v7');
      localStorage.removeItem('campus_foundry_mp_conversations_v1');
      localStorage.removeItem('campus_foundry_posts_v4');
      localStorage.removeItem('campus_foundry_snaps_v4');
      localStorage.removeItem('campus_foundry_custom_businesses_v4');
    } catch {}
  }

  if (!isSupabaseConfigured) {
    return { success: true, message: 'Local storage reset to zero successfully.' };
  }

  try {
    const isOnline = typeof navigator === 'undefined' || navigator.onLine;
    if (!isOnline) {
      return { success: true, message: 'Local state cleared. (Offline mode)' };
    }

    await Promise.allSettled([
      supabase.from('product_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('marketplace_products').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('student_businesses').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('campus_comments').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('campus_posts').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('campus_snaps').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('chat_conversations').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('marketplace_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('marketplace_conversations').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    ]);

    return { success: true, message: 'Backend database collections/tables reset to zero.' };
  } catch (err: any) {
    console.warn('[Supabase resetDatabaseToZero Notice]:', err?.message || err);
    return { success: false, message: err?.message || 'Database reset exception' };
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
      console.error('[Supabase fetchCampusPosts Error]:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
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
    console.error('[Supabase fetchCampusPosts Exception]:', err?.message || err);
    return [];
  }
}

export async function createCampusPostInSupabase(post: CampusPost): Promise<CampusPost> {
  if (!isSupabaseConfigured) {
    const err = new Error('Supabase is not configured.');
    console.error('[Supabase createCampusPost Error]:', {
      message: err.message,
      code: 'NOT_CONFIGURED',
      details: 'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing',
    });
    emitAppToast('Database is not configured. Post cannot be saved.', 'error');
    throw err;
  }

  const payload: Record<string, any> = {
    author_id: post.authorId,
    author_name: post.authorName,
    author_username: post.authorUsername,
    author_avatar: post.authorAvatar,
    author_dept: post.authorDept,
    author_level: post.authorLevel,
    author_role: post.authorRole,
    author_business_id: post.authorBusinessId,
    content: post.content || '',
    category: post.category,
    media_url: post.mediaUrl || null,
    media_type: post.mediaType || (post.mediaUrl ? 'image' : null),
    location_tag: post.locationTag,
    pinned: Boolean(post.pinned),
    created_at: post.createdAt || new Date().toISOString(),
  };

  if (isValidUuid(post.id)) {
    payload.id = post.id;
  }

  try {
    const { data, error } = await supabase
      .from('campus_posts')
      .insert(payload)
      .select('*, campus_comments(*)')
      .single();

    if (error) {
      console.error('[Supabase createCampusPost Error]:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        payload,
      });
      emitAppToast(`Failed to publish post: ${error.message || 'Database error'}`, 'error');
      throw error;
    }

    const row = data;
    return {
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
      reactions: row.reactions,
      pinned: row.pinned,
      createdAt: row.created_at,
      comments: [],
    };
  } catch (err: any) {
    console.error('[Supabase createCampusPost Exception]:', {
      message: err?.message || err,
      code: err?.code,
      details: err?.details || err?.message,
      err,
    });
    emitAppToast(err?.message ? `Failed to publish post: ${err.message}` : 'Failed to publish post. Please try again.', 'error');
    throw err;
  }
}


export async function deleteCampusPostInSupabase(postId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase.from('campus_posts').delete().eq('id', postId);
    if (error) {
      console.error('[Supabase deleteCampusPost Error]:', error);
    }
  } catch (err: any) {
    console.error('[Supabase deleteCampusPost Exception]:', err?.message || err);
  }
}

export async function deletePostsByUserInSupabase(usernameOrQuery: string): Promise<number> {
  const query = usernameOrQuery.trim().toLowerCase().replace('@', '');
  if (!query) return 0;

  // 1. Purge from local storage
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('campus_foundry_posts_v4');
      if (saved) {
        const posts: CampusPost[] = JSON.parse(saved);
        const filtered = posts.filter((p) => {
          const authorUser = (p.authorUsername || '').toLowerCase().replace('@', '');
          const authorName = (p.authorName || '').toLowerCase();
          const authorId = (p.authorId || '').toLowerCase();
          return !authorUser.includes(query) && !authorName.includes(query) && !authorId.includes(query);
        });
        localStorage.setItem('campus_foundry_posts_v4', JSON.stringify(filtered));
      }
    } catch {}
  }

  if (!isSupabaseConfigured) return 0;

  try {
    const isUuid = isValidUuid(query);
    const filterConditions = isUuid
      ? `author_username.ilike.%${query}%,author_name.ilike.%${query}%,author_id.eq.${query}`
      : `author_username.ilike.%${query}%,author_name.ilike.%${query}%`;

    const { data, error } = await supabase
      .from('campus_posts')
      .delete()
      .or(filterConditions)
      .select('id');

    if (error) {
      console.error('[Supabase deletePostsByUser Error]:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (err: any) {
    console.error('[Supabase deletePostsByUser Exception]:', err);
    return 0;
  }
}

export async function toggleCampusPostLikeInSupabase(postId: string, reaction: string = 'heart'): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    // Check if reaction already exists
    const { data: existing } = await supabase
      .from('post_reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('reaction', reaction)
      .maybeSingle();

    if (existing) {
      // Delete if exists (toggle off)
      await supabase.from('post_reactions').delete().eq('id', existing.id);
    } else {
      // Insert if not exists (toggle on)
      await supabase.from('post_reactions').insert({
        post_id: postId,
        user_id: userId,
        reaction: reaction
      });
    }
  } catch (err: any) {
    console.error('[Supabase togglePostReaction Exception]:', err?.message || err);
  }
}

/**
 * Trader calls this RPC to confirm delivery using the buyer's PIN.
 */
export async function confirmDeliveryRPC(orderId: string, pin: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { data, error } = await supabase.rpc('confirm_delivery', {
      p_order: orderId,
      p_pin: pin
    });
    if (error) {
      console.error('[Supabase confirmDeliveryRPC Error]:', error);
      throw error;
    }
    return !!data;
  } catch (err: any) {
    console.error('[Supabase confirmDeliveryRPC Exception]:', err);
    throw err;
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
      console.error('[Supabase addCampusComment Error]:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
    }
  } catch (err: any) {
    console.error('[Supabase addCampusComment Exception]:', err?.message || err);
  }
}

// ============================================================================
export const ALLOWED_PROFILES_READ_COLUMNS =
  'id, full_name, username, role, account_type, university, faculty, department, level, hostel_location, bio, avatar_url, is_verified, is_admin, staff_role, unilorin_domain, posts_count, followers_count, following_count, following_user_ids, created_at, updated_at';

export const ALLOWED_STUDENT_BUSINESSES_READ_COLUMNS =
  'id, owner_id, name, tagline, description, category, university, campus, hostel_location, owner_name, student_faculty, student_dept, student_level, whatsapp, rating, reviews_count, accepts_hostel_delivery, starting_price, services, image_url, badge, verified_student, created_at, updated_at';

export async function fetchStudentBusinessesFromSupabase(): Promise<StudentBusiness[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('student_businesses')
      .select(ALLOWED_STUDENT_BUSINESSES_READ_COLUMNS)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase fetchStudentBusinesses Error]:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      tagline: row.tagline,
      description: row.description,
      category: row.category,
      university: row.university || '',
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
    console.error('[Supabase fetchStudentBusinesses Exception]:', err?.message || err);
    throw err;
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
      console.error('[Supabase upsertStudentBusiness Error]:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
    }
  } catch (err: any) {
    console.error('[Supabase upsertStudentBusiness Exception]:', err?.message || err);
  }
}

export async function deleteStudentBusinessInSupabase(bizId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase.from('student_businesses').delete().eq('id', bizId);
    if (error) {
      console.error('[Supabase deleteStudentBusiness Error]:', error);
    }
  } catch (err: any) {
    console.error('[Supabase deleteStudentBusiness Exception]:', err?.message || err);
  }
}

// ============================================================================
// SUPABASE CRUD OPERATIONS FOR CAMPUS SNAPS (24H STORIES)
// ============================================================================

export async function fetchCampusSnapsFromSupabase(): Promise<CampusSnap[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const nowIso = new Date().toISOString();
    // Query campus_snaps with real-time expiry filter
    let { data, error } = await supabase
      .from('campus_snaps')
      .select('*')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false });

    // Fallback to singular campus_snap if user created that table name
    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      const fallback = await supabase
        .from('campus_snap')
        .select('*')
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('[Supabase fetchCampusSnaps Error]:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return [];
    }

    return (data || []).map((row: any) => {
      const realViewsCount = row.views_count || 0;

      return {
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
        viewsCount: realViewsCount,
        stickers: row.stickers || [],
      };
    });
  } catch (err: any) {
    console.error('[Supabase fetchCampusSnaps Exception]:', err?.message || err);
    return [];
  }
}

export async function createCampusSnapInSupabase(snap: CampusSnap): Promise<CampusSnap> {
  if (!isSupabaseConfigured) {
    const err = new Error('Supabase is not configured.');
    console.error('[Supabase createCampusSnap Error]:', {
      message: err.message,
      code: 'NOT_CONFIGURED',
      details: 'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing',
    });
    emitAppToast('Database is not configured. Snap cannot be saved.', 'error');
    throw err;
  }

  if (snap.mediaUrl && snap.mediaUrl.startsWith('blob:')) {
    const err = new Error('Invalid snap media URL: blob URL detected. Must upload to storage first.');
    console.error('[Supabase createCampusSnap Error]: Attempted to insert blob: URL into campus_snaps', {
      message: err.message,
      mediaUrl: snap.mediaUrl,
    });
    emitAppToast('Failed to save snap: media upload incomplete.', 'error');
    throw err;
  }

  const payload: Record<string, any> = {
    author_id: snap.authorId,
    author_name: snap.authorName,
    author_username: snap.authorUsername,
    author_avatar: snap.authorAvatar,
    author_dept: snap.authorDept,
    author_level: snap.authorLevel,
    location_tag: snap.locationTag,
    media_url: snap.mediaUrl,
    media_type: snap.mediaType || 'image',
    caption: snap.caption || '',
    created_at: snap.createdAt || new Date().toISOString(),
    expires_in_hours: snap.expiresInHours || 24,
    stickers: snap.stickers || [],
  };

  if (isValidUuid(snap.id)) {
    payload.id = snap.id;
  }

  try {
    let { data, error } = await supabase.from('campus_snaps').insert(payload).select().single();

    // Fallback to singular campus_snap table if needed
    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      const fallback = await supabase.from('campus_snap').insert(payload).select().single();
      error = fallback.error;
      data = fallback.data;
    }

    if (error) {
      console.error('[Supabase createCampusSnap Error]:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        payload,
      });
      emitAppToast(`Failed to post snap: ${error.message || 'Database error'}`, 'error');
      throw error;
    }

    return {
      ...snap,
      id: data?.id || snap.id,
    };
  } catch (err: any) {
    console.error('[Supabase createCampusSnap Exception]:', {
      message: err?.message || err,
      code: err?.code,
      details: err?.details || err?.message,
      err,
    });
    emitAppToast(err?.message ? `Failed to post snap: ${err.message}` : 'Failed to post snap. Please try again.', 'error');
    throw err;
  }
}

export async function deleteCampusSnapInSupabase(snapId: string, mediaUrl?: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    if (mediaUrl && mediaUrl.includes('/storage/v1/object/public/media/')) {
      const parts = mediaUrl.split('/storage/v1/object/public/media/');
      if (parts[1]) {
        const filePath = decodeURIComponent(parts[1].split('?')[0]);
        await supabase.storage.from('media').remove([filePath]).catch((storageErr) => {
          console.warn('[Supabase Storage Delete Notice]:', storageErr);
        });
      }
    }

    let { error } = await supabase.from('campus_snaps').delete().eq('id', snapId);
    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      const fallback = await supabase.from('campus_snap').delete().eq('id', snapId);
      error = fallback.error;
    }
    if (error) {
      console.error('[Supabase deleteCampusSnap Error]:', error);
      throw error;
    }
  } catch (err: any) {
    console.error('[Supabase deleteCampusSnap Exception]:', err);
    throw err;
  }
}

export async function purgeExpiredCampusSnapsInSupabase(): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const nowIso = new Date().toISOString();
    let { error } = await supabase
      .from('campus_snaps')
      .delete()
      .lt('expires_at', nowIso);

    // Fallback to singular campus_snap if needed
    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      const fallback = await supabase
        .from('campus_snap')
        .delete()
        .lt('expires_at', nowIso);
      error = fallback.error;
    }

    if (error) {
      console.error('[Supabase purgeExpiredCampusSnaps Error]:', error);
    }
  } catch (err: any) {
    console.error('[Supabase purgeExpiredCampusSnaps Exception]:', err);
  }
}

function formatSnapViewTime(iso: string): string {
  if (!iso) return 'Recently';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

/**
 * Records a snap view in snap_views table.
 * Unique constraint on (snap_id, viewer_id) ignores duplicate views.
 * Author's own views are ignored.
 */
export async function recordSnapView(
  snapId: string,
  viewerId?: string | null,
  authorId?: string | null
): Promise<number> {
  if (!snapId || !viewerId) return 0;
  if (viewerId === authorId || viewerId === 'usr_me' || viewerId === 'guest') return 0;

  const safeSnapId = isValidUuid(snapId) ? snapId : toSafeUuid(snapId);
  const safeViewerId = isValidUuid(viewerId) ? viewerId : toSafeUuid(viewerId);

  if (!isSupabaseConfigured) {
    try {
      const storedKey = `snap_views_${safeSnapId}`;
      const existing: string[] = JSON.parse(localStorage.getItem(storedKey) || '[]');
      if (!existing.includes(safeViewerId)) {
        existing.push(safeViewerId);
        localStorage.setItem(storedKey, JSON.stringify(existing));
      }
      return existing.length;
    } catch {
      return 1;
    }
  }

  try {
    const { error: insertErr } = await supabase
      .from('snap_views')
      .insert({ snap_id: safeSnapId, viewer_id: safeViewerId });

    if (insertErr && insertErr.code !== '23505') {
      console.warn('[Supabase recordSnapView Notice]:', insertErr.message);
    }

    const { count } = await supabase
      .from('snap_views')
      .select('*', { count: 'exact', head: true })
      .eq('snap_id', safeSnapId);

    const totalViews = count || 0;
    return totalViews;
  } catch (err: any) {
    console.warn('[Supabase recordSnapView Exception]:', err?.message || err);
    return 0;
  }
}

/**
 * Fetches real viewer records and count for a snap from snap_views + profiles.
 */
export async function fetchSnapViewers(
  snapId: string
): Promise<{ count: number; viewers: SnapViewerRecord[] }> {
  if (!snapId) return { count: 0, viewers: [] };
  const safeSnapId = isValidUuid(snapId) ? snapId : toSafeUuid(snapId);

  if (!isSupabaseConfigured) {
    try {
      const storedKey = `snap_views_${safeSnapId}`;
      const existing: string[] = JSON.parse(localStorage.getItem(storedKey) || '[]');
      return {
        count: existing.length,
        viewers: existing.map((id, idx) => ({
          id,
          name: `Campus Viewer ${idx + 1}`,
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
          dept: 'UNILORIN Student',
          viewedAt: 'Recently',
        })),
      };
    } catch {
      return { count: 0, viewers: [] };
    }
  }

  try {
    const { data, count, error } = await supabase
      .from('snap_views')
      .select('viewed_at, viewer_id, profiles(id, full_name, username, avatar_url, department, level)', { count: 'exact' })
      .eq('snap_id', safeSnapId)
      .order('viewed_at', { ascending: false });

    if (error) {
      console.warn('[Supabase fetchSnapViewers Notice]:', error.message);
      return { count: 0, viewers: [] };
    }

    const viewers: SnapViewerRecord[] = (data || []).map((row: any) => {
      const p = row.profiles || {};
      const deptStr = p.department ? `${p.department}${p.level ? ` (${p.level})` : ''}` : 'UNILORIN Student';
      return {
        id: p.id || row.viewer_id,
        name: p.full_name || 'Campus Student',
        username: p.username ? `@${p.username}` : undefined,
        avatarUrl: p.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        dept: deptStr,
        viewedAt: formatSnapViewTime(row.viewed_at),
      };
    });

    return {
      count: count ?? viewers.length,
      viewers,
    };
  } catch (err: any) {
    console.warn('[Supabase fetchSnapViewers Exception]:', err?.message || err);
    return { count: 0, viewers: [] };
  }
}

// ============================================================================
// SUPABASE CRUD OPERATIONS FOR CONVERSATIONS & DIRECT MESSAGES
// ============================================================================

/**
 * Helper to detect if a table is missing from Supabase schema cache (e.g. PGRST205 or 42P01)
 * Note: PGRST204 is column missing, not table missing.
 */
function isTableMissingError(error: any): boolean {
  if (!error) return false;
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    (typeof error.message === 'string' &&
      (error.message.includes('Could not find the table') ||
       (error.message.includes('relation') && error.message.includes('does not exist'))))
  );
}

/**
 * Helper to detect PostgreSQL invalid UUID syntax error (code 22P02)
 */
function isUuidSyntaxError(error: any): boolean {
  if (!error) return false;
  return (
    error.code === '22P02' ||
    (typeof error.message === 'string' &&
      (error.message.includes('invalid input syntax for type uuid') ||
       error.message.includes('type uuid')))
  );
}

/**
 * Helper to detect PostgreSQL Row-Level Security (RLS) policy rejection or permission restrictions (code 42501)
 */
function isRlsOrPermissionError(error: any): boolean {
  if (!error) return false;
  return (
    error.code === '42501' ||
    (typeof error.message === 'string' &&
      (error.message.includes('row-level security') ||
       error.message.includes('permission denied') ||
       error.message.includes('violates row-level security')))
  );
}

export async function fetchConversationsFromSupabase(userId: string): Promise<ChatConversation[]> {
  if (!isSupabaseConfigured || !userId) return [];
  const safeUserId = toSafeUuid(userId);
  const filterQuery = isValidUuid(userId)
    ? `buyer_id.eq.${userId},trader_id.eq.${userId}`
    : `buyer_id.eq.${safeUserId},trader_id.eq.${safeUserId}`;

  // Target chat_conversations exclusively
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('*')
    .or(filterQuery)
    .order('last_message_timestamp', { ascending: false });

  if (error) {
    console.error('[Supabase fetchConversations Error]:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    // Log error to console instead of showing raw error toast to the user
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    kind: 'direct' as const,
    businessId: row.business_id,
    businessName: row.business_name,
    businessImageUrl: row.business_image_url,
    traderName: row.trader_name,
    traderId: row.trader_id,
    traderHostel: row.trader_hostel,
    buyerId: row.buyer_id,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    lastMessage: row.last_message,
    lastMessageTimestamp: row.last_message_timestamp,
    unreadCount: row.unread_count || 0,
    isMessageRequest: row.is_message_request || false,
    requestStatus: row.request_status || 'accepted',
    isOnline: row.is_online ?? true,
    lastSeen: row.last_seen || 'Online',
    chatTheme: row.chat_theme,
  }));
}

/**
 * Ensures a real row exists in the chat_conversations table before any message is sent.
 * Verifies that the current user is a valid participant (buyer_id or trader_id matches auth.uid()).
 * Returns true if successful or already exists, false on error.
 */
export async function ensureConversationInSupabase(
  conv: ChatConversation,
  authUid: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !conv?.id) return false;

  // Skip Supabase queries for conversations that are local mock data
  if (isMockConversation(conv.id)) {
    return true;
  }

  const safeConvId = toSafeUuid(conv.id);
  const safeBusinessId = conv.businessId ? toSafeUuid(conv.businessId) : null;
  const isTrader = authUid === toSafeUuid(conv.traderId);

  try {
    // 1. Check if the conversation row already exists in chat_conversations
    const { data: existing, error: checkError } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('id', safeConvId)
      .maybeSingle();

    if (checkError) {
      console.error('[Supabase checkConversation Error]:', {
        message: checkError.message,
        code: checkError.code,
        details: checkError.details,
        hint: checkError.hint,
        conversationId: safeConvId,
      });
      return false;
    }

    const payload = {
      id: safeConvId,
      business_id: safeBusinessId,
      business_name: conv.businessName || '',
      business_image_url: conv.businessImageUrl || null,
      trader_name: conv.traderName || 'Trader',
      trader_id: isTrader ? authUid : toSafeUuid(conv.traderId || 'trader_id'),
      buyer_id: isTrader ? toSafeUuid(conv.buyerId || 'buyer_id') : authUid,
      buyer_name: conv.buyerName || 'Student Buyer',
      last_message: conv.lastMessage || '',
      last_message_timestamp: conv.lastMessageTimestamp || new Date().toISOString(),
    };

    if (!existing) {
      // Insert new conversation row
      const { error: insertError } = await supabase
        .from('chat_conversations')
        .insert(payload);

      if (insertError) {
        console.error('[Supabase insertConversation Error]:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
          payload,
        });
        return false;
      }
    } else {
      // Update existing conversation timestamp and last message
      const { error: updateError } = await supabase
        .from('chat_conversations')
        .update({
          last_message: conv.lastMessage || '',
          last_message_timestamp: conv.lastMessageTimestamp || new Date().toISOString(),
        })
        .eq('id', safeConvId);

      if (updateError) {
        console.error('[Supabase updateConversation Error]:', {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
        });
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error('[Supabase ensureConversation Exception]:', err);
    return false;
  }
}

export async function upsertConversationInSupabase(conv: ChatConversation, authUid?: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  let uid = authUid;
  if (!uid) {
    const { data: { session } } = await supabase.auth.getSession();
    uid = session?.user?.id;
  }
  if (!uid) {
    console.warn('[Supabase upsertConversation Notice]: auth.uid() not available yet.');
    return;
  }
  await ensureConversationInSupabase(conv, uid);
}

/**
 * Loads messages for a conversation from the Supabase chat_messages table.
 * Strictly queries the required columns: id, conversation_id, sender_id, recipient_id, text, is_read, order_snippet, created_at.
 */
export async function fetchMessagesFromSupabase(conversationId: string): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured || !conversationId) return [];

  // Skip Supabase queries for conversations that are local mock data
  if (isMockConversation(conversationId)) {
    return [];
  }

  const safeConvId = toSafeUuid(conversationId);

  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, conversation_id, sender_id, recipient_id, text, is_read, order_snippet, created_at, voice_note_url, voice_duration, voice_waveform')
    .eq('conversation_id', safeConvId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Supabase fetchMessages Error]:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      conversationId: safeConvId,
    });
    // Log to console instead of showing raw error toast to the user
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    conversationId: row.conversation_id,
    businessId: '',
    businessName: '',
    senderId: row.sender_id,
    senderName: row.sender_id,
    senderRole: 'student',
    recipientId: row.recipient_id,
    recipientName: 'Participant',
    text: row.text || '',
    timestamp: row.created_at,
    isRead: Boolean(row.is_read),
    deliveryState: row.is_read ? 'read' : 'delivered',
    orderSnippet: row.order_snippet || undefined,
    voiceNoteUrl: row.voice_note_url || undefined,
    voiceDuration: row.voice_duration != null ? Number(row.voice_duration) : undefined,
    voiceWaveform: row.voice_waveform || undefined,
  }));
}

/**
 * Inserts a message into the Supabase chat_messages table.
 * Columns: id, conversation_id, sender_id, recipient_id, text, is_read, order_snippet, created_at.
 * Requires authUid to match auth.uid() to comply with Row Level Security.
 * Logs all errors to console without showing raw error text to the user.
 */
export async function insertChatMessageInSupabase(
  msg: ChatMessage,
  authUid: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    console.warn('[Supabase insertChatMessage Notice]: Supabase is not configured.');
    return;
  }
  if (!msg || isMockConversation(msg.conversationId)) {
    return;
  }

  const safeId = toSafeUuid(msg.id);
  const safeConvId = toSafeUuid(msg.conversationId);
  const safeRecipientId = toSafeUuid(msg.recipientId);

  let textContent = msg.text ? msg.text.trim() : '';
  if (!textContent) {
    if (msg.voiceNoteUrl) {
      textContent = '🎤 Voice message';
    } else {
      textContent = 'Message';
    }
  }

  // Strictly target requested columns: id, conversation_id, sender_id, recipient_id, text, is_read, order_snippet, created_at, voice_note_url, voice_duration, voice_waveform
  const payload: Record<string, any> = {
    id: safeId,
    conversation_id: safeConvId,
    sender_id: authUid,
    recipient_id: safeRecipientId,
    text: textContent,
    is_read: Boolean(msg.isRead),
    order_snippet: msg.orderSnippet ? (typeof msg.orderSnippet === 'string' ? msg.orderSnippet : JSON.stringify(msg.orderSnippet)) : null,
    created_at: msg.timestamp || new Date().toISOString(),
  };

  if (msg.voiceNoteUrl) {
    payload.voice_note_url = msg.voiceNoteUrl;
    payload.voice_duration = msg.voiceDuration != null ? Number(msg.voiceDuration) : null;
    payload.voice_waveform = msg.voiceWaveform || null;
  }

  const { error } = await supabase.from('chat_messages').insert(payload);

  if (error) {
    if (error.code === '42501' || error.message?.includes('permission denied')) {
      console.warn('[Supabase save notice (RLS permission 42501)]:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        payload,
      });
      return;
    }
    console.error('[Supabase save error]:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      payload,
    });
    emitAppToast(`Save failed: ${error.message || 'Database error'}`, 'error');
    throw error;
  }
}


// ============================================================================
// SUPABASE POLL VOTES HELPERS
// ============================================================================

export async function fetchPollVotesFromSupabase(
  pollId: string,
  userId?: string
): Promise<{ votes: Record<string, number>; hasVoted: boolean }> {
  if (!isSupabaseConfigured) {
    return { votes: {}, hasVoted: false };
  }

  try {
    const votes: Record<string, number> = {};
    let hasVoted = false;
    const safeUid = userId ? toSafeUuid(userId) : null;

    // 1. Call supabase.rpc('get_poll_results', { p_poll_id: pollId }) and read candidate_id and votes columns
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_poll_results', {
      p_poll_id: pollId,
    });

    if (!rpcError && Array.isArray(rpcData)) {
      rpcData.forEach((row: { candidate_id: string; votes: number }) => {
        if (row.candidate_id) {
          votes[row.candidate_id] = Number(row.votes) || 0;
        }
      });
    } else {
      // 2. Fallback to direct select on poll_votes table
      const { data, error } = await supabase
        .from('poll_votes')
        .select('candidate_id, user_id')
        .eq('poll_id', pollId);

      if (!error && Array.isArray(data)) {
        data.forEach((row: any) => {
          const cid = row.candidate_id;
          if (cid) votes[cid] = (votes[cid] || 0) + 1;
        });
      }
    }

    // 3. Verify user vote status
    if (userId) {
      const { data: userVoteRow } = await supabase
        .from('poll_votes')
        .select('id')
        .eq('poll_id', pollId)
        .or(`user_id.eq.${userId},user_id.eq.${safeUid}`)
        .maybeSingle();

      if (userVoteRow) {
        hasVoted = true;
      }
    }

    return { votes, hasVoted };
  } catch (err: any) {
    console.error('[Supabase fetchPollVotes Exception]:', err?.message || err);
    return { votes: {}, hasVoted: false };
  }
}

export async function castPollVoteInSupabase(
  pollId: string,
  userId: string,
  candidateId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    let safeUserId = toSafeUuid(userId);
    // Get actual auth session UID if available to satisfy RLS policy (user_id = auth.uid())
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user?.id) {
      safeUserId = sessionData.session.user.id;
    }

    const { error } = await supabase.from('poll_votes').insert({
      poll_id: pollId,
      user_id: safeUserId,
      candidate_id: candidateId,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[Supabase castPollVote Error]:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });

      // Handle duplicate vote error (code 23505) with friendly message
      if (
        error.code === '23505' ||
        error.code === '42501' ||
        error.message?.includes('unique constraint') ||
        error.message?.includes('duplicate key') ||
        error.message?.includes('poll_votes_poll_id_user_id_key')
      ) {
        return { success: false, error: 'You have already cast your vote in this election poll!' };
      }
      return { success: false, error: error.message || 'Could not record your vote.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Supabase castPollVote Exception]:', err?.message || err);
    return { success: false, error: err?.message || 'Vote failed.' };
  }
}

// ==========================================
// Hub Pages, Members, Posts, Reports & Chat Services
// ==========================================
import {
  HubPage,
  HubPageType,
  PageJoinMode,
  PageStatus,
  PageMember,
  PageMemberRole,
  PageMemberStatus,
  PagePost,
  PagePostKind,
  PageReport,
  PageMessage,
  StaffRole,
  AdminActionLog,
  AppUser,
  UserRole,
  StudentLevel,
} from '../types';

// Pure Supabase Hub Pages, Members, Posts, Reports & Chat Services
// =================================================================

// Helper functions for Hub Pages (strictly loaded from Supabase)
export async function fetchPagesFromSupabase(type?: HubPageType): Promise<HubPage[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    let query = supabase
      .from('pages')
      .select('*')
      .eq('status', 'approved');

    if (type) query = query.eq('type', type);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      if (isRlsOrPermissionError(error) || isTableMissingError(error)) {
        console.warn('[fetchPagesFromSupabase permission notice]: Table "pages" permission denied or missing. Execute migration 010_grant_hubs_pages_permissions.sql in Supabase SQL editor.', error);
        return [];
      }
      console.error('[fetchPagesFromSupabase error]:', error);
      throw new Error(error.message || 'Failed to fetch pages from Supabase');
    }
    if (!data || data.length === 0) {
      return [];
    }

    // Get true member/follower counts from page_members for each page
    const pageIds = data.map((r: any) => r.id);
    let countsMap: Record<string, { members: number; followers: number }> = {};
    
    if (pageIds.length > 0) {
      try {
        const { data: memberRows, error: memberErr } = await supabase
          .from('page_members')
          .select('page_id, role, status')
          .in('page_id', pageIds)
          .eq('status', 'active');

        if (memberErr) {
          console.error('[fetchPagesFromSupabase member count error]:', memberErr);
        } else if (memberRows) {
          memberRows.forEach((m: any) => {
            if (!countsMap[m.page_id]) {
              countsMap[m.page_id] = { members: 0, followers: 0 };
            }
            if (m.role === 'follower') {
              countsMap[m.page_id].followers += 1;
            } else {
              countsMap[m.page_id].members += 1;
            }
          });
        }
      } catch (cntErr) {
        console.error('[fetchPagesFromSupabase member count exception]:', cntErr);
      }
    }

    return data.map((row: any) => ({
      id: row.id,
      type: row.type,
      name: row.name,
      slug: row.slug,
      description: row.description || '',
      logoUrl: row.logo_url || '',
      coverUrl: row.cover_url || '',
      ownerId: row.owner_id,
      isVerified: !!row.is_verified,
      joinMode: row.join_mode || 'open',
      status: row.status || 'approved',
      note: row.note || '',
      createdAt: row.created_at,
      membersCount: countsMap[row.id]?.members || 0,
      followersCount: countsMap[row.id]?.followers || 0,
    }));
  } catch (err) {
    console.error('[fetchPagesFromSupabase exception]:', err);
    throw err;
  }
}

export async function requestPageInSupabase(
  payload: Partial<HubPage> & { name: string; type: HubPageType; ownerId: string }
): Promise<{ success: boolean; page?: HubPage; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database not connected' };
  }

  const newPage: HubPage = {
    id: payload.id || `page-${Date.now()}`,
    type: payload.type,
    name: payload.name,
    slug: payload.slug || payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: payload.description || '',
    logoUrl: payload.logoUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&auto=format&fit=crop&q=80',
    coverUrl: payload.coverUrl || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1000&auto=format&fit=crop&q=80',
    ownerId: payload.ownerId,
    isVerified: false,
    joinMode: payload.joinMode || 'open',
    status: 'pending',
    note: payload.note || '',
    createdAt: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.from('pages').insert({
      id: toSafeUuid(newPage.id),
      type: newPage.type,
      name: newPage.name,
      slug: newPage.slug,
      description: newPage.description,
      logo_url: newPage.logoUrl,
      cover_url: newPage.coverUrl,
      owner_id: toSafeUuid(newPage.ownerId),
      is_verified: false,
      join_mode: newPage.joinMode,
      status: 'pending',
      note: newPage.note,
      created_at: newPage.createdAt,
    }).select().single();

    if (error) {
      console.error('[requestPageInSupabase error]:', error);
      return { success: false, error: error.message };
    }
    if (data) {
      newPage.id = data.id;
    }
    return { success: true, page: newPage };
  } catch (e: any) {
    console.error('[requestPageInSupabase exception]:', e);
    return { success: false, error: e?.message || 'Failed to submit page request' };
  }
}

export async function joinOrFollowPageInSupabase(
  pageId: string,
  userId: string,
  targetRole: PageMemberRole,
  joinMode: PageJoinMode
): Promise<{ success: boolean; status: PageMemberStatus; role: PageMemberRole; error?: string }> {
  const memberStatus: PageMemberStatus = (joinMode === 'request' && targetRole === 'member') ? 'pending' : 'active';

  if (!isSupabaseConfigured) {
    return { success: false, status: memberStatus, role: targetRole, error: 'Database not connected' };
  }

  try {
    let safeUid = toSafeUuid(userId);
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user?.id) safeUid = sessionData.session.user.id;

    const { error } = await supabase.from('page_members').upsert({
      page_id: toSafeUuid(pageId),
      user_id: safeUid,
      role: targetRole,
      status: memberStatus,
      is_muted: false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[joinOrFollowPageInSupabase error]:', error);
      return { success: false, status: memberStatus, role: targetRole, error: error.message };
    }
    return { success: true, status: memberStatus, role: targetRole };
  } catch (e: any) {
    console.error('[joinOrFollowPageInSupabase exception]:', e);
    return { success: false, status: memberStatus, role: targetRole, error: e?.message || 'Membership action failed' };
  }
}

export async function leaveOrUnfollowPageInSupabase(
  pageId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    let safeUid = toSafeUuid(userId);
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user?.id) safeUid = sessionData.session.user.id;

    const { error } = await supabase
      .from('page_members')
      .delete()
      .eq('page_id', toSafeUuid(pageId))
      .eq('user_id', safeUid);

    if (error) {
      console.error('[leaveOrUnfollowPageInSupabase error]:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    console.error('[leaveOrUnfollowPageInSupabase exception]:', e);
    return { success: false, error: e?.message || 'Failed to leave page' };
  }
}

export async function toggleMutePageNotificationsInSupabase(
  pageId: string,
  userId: string,
  isMuted: boolean
): Promise<{ success: boolean }> {
  if (isSupabaseConfigured) {
    try {
      let safeUid = toSafeUuid(userId);
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.id) safeUid = sessionData.session.user.id;

      await supabase
        .from('page_members')
        .update({ is_muted: isMuted })
        .eq('page_id', toSafeUuid(pageId))
        .eq('user_id', safeUid);
    } catch (e) {
      console.error('[toggleMutePageNotificationsInSupabase exception]:', e);
    }
  }

  return { success: true };
}

export async function fetchPageMembersFromSupabase(pageId: string): Promise<PageMember[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('page_members')
      .select('*')
      .eq('page_id', toSafeUuid(pageId));

    if (error) {
      if (isRlsOrPermissionError(error) || isTableMissingError(error)) {
        console.warn('[fetchPageMembersFromSupabase permission notice]: Table "page_members" permission denied or missing.', error);
        return [];
      }
      console.error('[fetchPageMembersFromSupabase error]:', error);
      throw new Error(error.message || 'Failed to fetch members');
    }
    if (!data || data.length === 0) {
      return [];
    }

    // Collect user IDs to fetch profile details (display name & avatar)
    const userIds = [...new Set(data.map((row: any) => row.user_id).filter(Boolean))];
    let profileMap: Record<string, { fullName?: string; username?: string; avatarUrl?: string }> = {};

    if (userIds.length > 0) {
      try {
        const { data: profs, error: profErr } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', userIds);

        if (profErr) {
          console.error('[fetchPageMembersFromSupabase profiles join error]:', profErr);
        } else if (profs) {
          profs.forEach((p: any) => {
            profileMap[p.id] = {
              fullName: p.full_name,
              username: p.username,
              avatarUrl: p.avatar_url,
            };
          });
        }
      } catch (profErr) {
        console.error('[fetchPageMembersFromSupabase profiles join exception]:', profErr);
      }
    }

    return data.map((row: any) => {
      const prof = profileMap[row.user_id];
      return {
        id: row.id,
        pageId: row.page_id,
        userId: row.user_id,
        role: row.role,
        status: row.status,
        isMuted: !!row.is_muted,
        createdAt: row.created_at,
        userName: prof?.fullName || prof?.username || `Student ${row.user_id?.slice(0, 8)}`,
        userUsername: prof?.username,
        userAvatarUrl: prof?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.user_id}`,
      };
    });
  } catch (err) {
    console.error('[fetchPageMembersFromSupabase exception]:', err);
    throw err;
  }
}

export async function fetchPagePostsFromSupabase(pageId?: string, pageNum = 1, pageSize = 20): Promise<PagePost[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    let query = supabase.from('page_posts').select('*').eq('status', 'published');
    if (pageId) query = query.eq('page_id', toSafeUuid(pageId));

    const fromIndex = (pageNum - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    const { data, error } = await query.order('created_at', { ascending: false }).range(fromIndex, toIndex);
    if (error) {
      if (isRlsOrPermissionError(error) || isTableMissingError(error)) {
        console.warn('[fetchPagePostsFromSupabase permission notice]: Table "page_posts" permission denied or missing. Execute migration 010_grant_hubs_pages_permissions.sql in Supabase SQL editor.', error);
        return [];
      }
      console.error('[fetchPagePostsFromSupabase error]:', error);
      throw new Error(error.message || 'Failed to fetch posts');
    }
    if (!data || data.length === 0) {
      return [];
    }

    return data.map((row: any) => ({
      id: row.id,
      pageId: row.page_id,
      authorId: row.author_id,
      kind: row.kind,
      title: row.title,
      body: row.body,
      imageUrl: row.image_url,
      eventDate: row.event_date,
      eventLocation: row.event_location,
      pollOptions: row.poll_options,
      isBreaking: !!row.is_breaking,
      status: row.status,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('[fetchPagePostsFromSupabase exception]:', err);
    throw err;
  }
}

export async function createPagePostInSupabase(
  payload: Partial<PagePost> & { pageId: string; authorId: string; kind: PagePostKind; body: string }
): Promise<{ success: boolean; post?: PagePost; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database not connected' };
  }

  const newPost: PagePost = {
    id: payload.id || `ppost-${Date.now()}`,
    pageId: payload.pageId,
    authorId: payload.authorId,
    kind: payload.kind,
    title: payload.title || '',
    body: payload.body,
    imageUrl: payload.imageUrl || '',
    eventDate: payload.eventDate,
    eventLocation: payload.eventLocation,
    pollOptions: payload.pollOptions,
    isBreaking: !!payload.isBreaking,
    status: 'published',
    createdAt: new Date().toISOString(),
    pageName: payload.pageName,
    pageLogoUrl: payload.pageLogoUrl,
    pageType: payload.pageType,
    pageIsVerified: payload.pageIsVerified,
  };

  try {
    const { data, error } = await supabase.from('page_posts').insert({
      id: toSafeUuid(newPost.id),
      page_id: toSafeUuid(newPost.pageId),
      author_id: toSafeUuid(newPost.authorId),
      kind: newPost.kind,
      title: newPost.title,
      body: newPost.body,
      image_url: newPost.imageUrl,
      event_date: newPost.eventDate,
      event_location: newPost.eventLocation,
      poll_options: newPost.pollOptions,
      is_breaking: newPost.isBreaking,
      status: 'published',
      created_at: newPost.createdAt,
    }).select().single();

    if (error) {
      console.error('[createPagePostInSupabase error]:', error);
      return { success: false, error: error.message };
    }
    if (data) newPost.id = data.id;
    return { success: true, post: newPost };
  } catch (e: any) {
    console.error('[createPagePostInSupabase exception]:', e);
    return { success: false, error: e?.message || 'Failed to publish post' };
  }
}

export async function deletePagePostInSupabase(postId: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const { error } = await supabase.from('page_posts').delete().eq('id', toSafeUuid(postId));
    if (error) {
      console.error('[deletePagePostInSupabase error]:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    console.error('[deletePagePostInSupabase exception]:', e);
    return { success: false, error: e?.message };
  }
}

export async function submitPageReportInSupabase(
  payload: { pageId?: string; postId?: string; reporterId: string; reason: string }
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database not configured' };
  }

  const report: PageReport = {
    id: `pr-${Date.now()}`,
    pageId: payload.pageId,
    postId: payload.postId,
    reporterId: payload.reporterId,
    reason: payload.reason,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  try {
    const { error } = await supabase.from('page_reports').insert({
      id: toSafeUuid(report.id),
      page_id: payload.pageId ? toSafeUuid(payload.pageId) : null,
      post_id: payload.postId ? toSafeUuid(payload.postId) : null,
      reporter_id: toSafeUuid(payload.reporterId),
      reason: payload.reason,
      status: 'pending',
      created_at: report.createdAt,
    });
    if (error) {
      console.error('[submitPageReportInSupabase error]:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    console.error('[submitPageReportInSupabase exception]:', e);
    return { success: false, error: e?.message };
  }
}

export async function fetchPendingPageRequestsFromSupabase(): Promise<HubPage[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      if (isRlsOrPermissionError(error) || isTableMissingError(error)) {
        console.warn('[fetchPendingPageRequestsFromSupabase permission notice]: Table "pages" permission denied or missing.', error);
        return [];
      }
      console.error('[fetchPendingPageRequestsFromSupabase error]:', error);
      throw new Error(error.message);
    }
    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      type: row.type,
      name: row.name,
      slug: row.slug,
      description: row.description || '',
      logoUrl: row.logo_url || '',
      coverUrl: row.cover_url || '',
      ownerId: row.owner_id,
      isVerified: !!row.is_verified,
      joinMode: row.join_mode || 'open',
      status: row.status,
      note: row.note || '',
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('[fetchPendingPageRequestsFromSupabase exception]:', err);
    throw err;
  }
}

export async function reviewPageRequestInSupabase(
  pageId: string,
  newStatus: PageStatus,
  isVerified = false,
  staffId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database not connected' };
  }

  try {
    const { error } = await supabase
      .from('pages')
      .update({ status: newStatus, is_verified: isVerified })
      .eq('id', toSafeUuid(pageId));

    if (error) {
      console.error('[reviewPageRequestInSupabase error]:', error);
      return { success: false, error: error.message };
    }

    if (staffId) {
      const act = newStatus === 'approved' ? (isVerified ? 'verify_page' : 'approve_page') : 'reject_page';
      await logAdminActionInSupabase(staffId, act, pageId, { newStatus, isVerified });
    }
    return { success: true };
  } catch (e: any) {
    console.error('[reviewPageRequestInSupabase exception]:', e);
    return { success: false, error: e?.message };
  }
}

export async function fetchPageReportsFromSupabase(): Promise<PageReport[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('page_reports')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      if (isRlsOrPermissionError(error) || isTableMissingError(error)) {
        console.warn('[fetchPageReportsFromSupabase permission notice]: Table "page_reports" permission denied or missing.', error);
        return [];
      }
      console.error('[fetchPageReportsFromSupabase error]:', error);
      throw new Error(error.message);
    }
    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      pageId: row.page_id,
      postId: row.post_id,
      reporterId: row.reporter_id,
      reason: row.reason,
      status: row.status,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('[fetchPageReportsFromSupabase exception]:', err);
    throw err;
  }
}

export async function reviewPageReportInSupabase(
  reportId: string,
  action: 'dismiss' | 'remove_post',
  postId?: string,
  staffId?: string
): Promise<{ success: boolean; error?: string }> {
  if (action === 'remove_post' && postId) {
    await deletePagePostInSupabase(postId);
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('page_reports')
        .update({ status: action === 'dismiss' ? 'dismissed' : 'reviewed' })
        .eq('id', toSafeUuid(reportId));

      if (error) {
        console.error('[reviewPageReportInSupabase error]:', error);
        return { success: false, error: error.message };
      }

      if (staffId) {
        await logAdminActionInSupabase(staffId, action === 'dismiss' ? 'dismiss_report' : 'remove_reported_post', reportId, { postId });
      }
    } catch (e: any) {
      console.error('[reviewPageReportInSupabase exception]:', e);
      return { success: false, error: e?.message };
    }
  }

  return { success: true };
}

export async function fetchPageMessagesFromSupabase(pageId: string): Promise<PageMessage[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('page_messages')
      .select('*')
      .eq('page_id', toSafeUuid(pageId))
      .order('created_at', { ascending: true });

    if (error) {
      if (isRlsOrPermissionError(error) || isTableMissingError(error)) {
        console.warn('[fetchPageMessagesFromSupabase permission notice]: Table "page_messages" permission denied or missing.', error);
        return [];
      }
      console.error('[fetchPageMessagesFromSupabase error]:', error);
      throw new Error(error.message);
    }
    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      pageId: row.page_id,
      senderId: row.sender_id,
      senderName: row.sender_name || 'Member',
      senderAvatar: row.sender_avatar || '',
      text: row.text,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('[fetchPageMessagesFromSupabase exception]:', err);
    throw err;
  }
}

export async function sendPageMessageInSupabase(
  pageId: string,
  senderId: string,
  senderName: string,
  senderAvatar: string | undefined,
  text: string
): Promise<{ success: boolean; message?: PageMessage; error?: string }> {
  const msg: PageMessage = {
    id: `pmg-${Date.now()}`,
    pageId,
    senderId,
    senderName,
    senderAvatar: senderAvatar || '',
    text,
    createdAt: new Date().toISOString(),
  };

  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database not connected' };
  }

  try {
    let safeUid = toSafeUuid(senderId);
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user?.id) safeUid = sessionData.session.user.id;

    const { data, error } = await supabase.from('page_messages').insert({
      id: toSafeUuid(msg.id),
      page_id: toSafeUuid(pageId),
      sender_id: safeUid,
      sender_name: senderName,
      sender_avatar: senderAvatar || '',
      text,
      created_at: msg.createdAt,
    }).select().single();

    if (error) {
      console.error('[sendPageMessageInSupabase error]:', error);
      return { success: false, error: error.message };
    }
    if (data) msg.id = data.id;
    return { success: true, message: msg };
  } catch (e: any) {
    console.error('[sendPageMessageInSupabase exception]:', e);
    return { success: false, error: e?.message };
  }
}

export async function updatePageDetailsInSupabase(
  pageId: string,
  updates: Partial<HubPage>
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database not connected' };
  }

  try {
    const payload: any = {};
    if (updates.name) payload.name = updates.name;
    if (updates.description) payload.description = updates.description;
    if (updates.logoUrl) payload.logo_url = updates.logoUrl;
    if (updates.coverUrl) payload.cover_url = updates.coverUrl;
    if (updates.joinMode) payload.join_mode = updates.joinMode;

    const { error } = await supabase.from('pages').update(payload).eq('id', toSafeUuid(pageId));
    if (error) {
      console.error('[updatePageDetailsInSupabase error]:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    console.error('[updatePageDetailsInSupabase exception]:', e);
    return { success: false, error: e?.message };
  }
}

// ==========================================
// Staff Permissions & Audit Logging Services
// ==========================================
let localAdminLogs: AdminActionLog[] = [];

export async function logAdminActionInSupabase(
  staffId: string,
  action: string,
  targetId: string,
  details?: any
): Promise<void> {
  const log: AdminActionLog = {
    id: `log-${Date.now()}`,
    staffId,
    action,
    targetId,
    details,
    createdAt: new Date().toISOString(),
  };

  localAdminLogs.unshift(log);

  if (isSupabaseConfigured) {
    try {
      let safeUid = toSafeUuid(staffId);
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.id) safeUid = sessionData.session.user.id;

      await supabase.from('admin_actions').insert({
        staff_id: safeUid,
        action,
        target_id: targetId,
        details: details ? details : null,
        created_at: log.createdAt,
      });
    } catch (e) {
      console.warn('[logAdminActionInSupabase error]:', e);
    }
  }
}

export async function fetchAdminActionLogsFromSupabase(): Promise<AdminActionLog[]> {
  if (!isSupabaseConfigured) {
    return localAdminLogs;
  }

  try {
    const { data, error } = await supabase
      .from('admin_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) return localAdminLogs;

    // Fetch staff profile info
    const staffIds = Array.from(new Set(data.map((d) => d.staff_id)));
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', staffIds);

    const staffMap = new Map<string, any>();
    if (profiles) {
      profiles.forEach((p) => staffMap.set(p.id, p));
    }

    return data.map((row: any) => {
      const p = staffMap.get(row.staff_id);
      return {
        id: row.id,
        staffId: row.staff_id,
        action: row.action,
        targetId: row.target_id,
        details: row.details,
        createdAt: row.created_at,
        staffName: p?.full_name || 'Staff Member',
      };
    });
  } catch (err) {
    return localAdminLogs;
  }
}

export async function searchUsersForStaffManagementInSupabase(query: string): Promise<AppUser[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    if (!query.trim()) return [];
    const q = `%${query.trim().toLowerCase()}%`;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, role, level, department, faculty, staff_role, is_verified, is_admin, avatar_url')
      .or(`username.ilike.${q},full_name.ilike.${q}`)
      .limit(20);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      email: '',
      fullName: row.full_name || 'Student',
      username: row.username || '',
      role: row.role || 'student',
      level: row.level || '300L',
      department: row.department,
      faculty: row.faculty,
      isVerified: !!row.is_verified,
      isAdmin: !!row.is_admin || !!row.staff_role,
      staffRole: row.staff_role || (row.is_admin ? 'super_admin' : null),
      avatarUrl: row.avatar_url,
    }));
  } catch (err) {
    return [];
  }
}

export async function assignStaffRoleInSupabase(
  staffId: string,
  targetUserId: string,
  newStaffRole: StaffRole
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        staff_role: newStaffRole,
        is_admin: newStaffRole === 'super_admin' ? true : false,
      })
      .eq('id', targetUserId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log staff role change action
    await logAdminActionInSupabase(
      staffId,
      newStaffRole ? 'assign_staff_role' : 'remove_staff_role',
      targetUserId,
      { assigned_role: newStaffRole }
    );

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Role update failed.' };
  }
}


// ==============================================================
// 1. GLOBAL SEARCH SUPABASE HELPERS
// ==============================================================
export async function executeGlobalSearchInSupabase(
  query: string,
  tab: 'people' | 'groups' | 'pages' | 'products' | 'posts',
  page = 1,
  pageSize = 15
): Promise<{ items: any[]; hasMore: boolean }> {
  if (!isSupabaseConfigured || !query.trim()) return { items: [], hasMore: false };
  const q = `%${query.trim().toLowerCase()}%`;
  const from = (page - 1) * pageSize;
  const to = from + pageSize;

  try {
    if (tab === 'people') {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, faculty, department, level, is_verified, bio, followers_count')
        .or(`full_name.ilike.${q},username.ilike.${q}`)
        .range(from, to);
      if (error || !data) return { items: [], hasMore: false };
      return {
        items: data.map((d) => ({ ...d, type: 'person' })),
        hasMore: data.length > pageSize,
      };
    } else if (tab === 'groups' || tab === 'pages') {
      const pageType = tab === 'groups' ? 'club' : 'news';
      const { data, error } = await supabase
        .from('pages')
        .select('id, type, name, slug, description, logo_url, cover_url, is_verified, join_mode, status')
        .eq('status', 'approved')
        .eq('type', pageType)
        .or(`name.ilike.${q},description.ilike.${q}`)
        .range(from, to);
      if (error || !data) return { items: [], hasMore: false };
      return {
        items: data.map((d) => ({ ...d, type: 'page' })),
        hasMore: data.length > pageSize,
      };
    } else if (tab === 'products') {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, description, price, images, category, stock_quantity, is_active')
        .eq('is_active', true)
        .or(`title.ilike.${q},description.ilike.${q}`)
        .range(from, to);
      if (error || !data) return { items: [], hasMore: false };
      return {
        items: data.map((d) => ({ ...d, type: 'product' })),
        hasMore: data.length > pageSize,
      };
    } else if (tab === 'posts') {
      const { data, error } = await supabase
        .from('campus_posts')
        .select('*')
        .or(`content.ilike.${q}`)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error || !data) return { items: [], hasMore: false };
      return {
        items: data.map((d) => ({
          id: d.id,
          authorId: d.author_id,
          authorName: d.author_name || 'Campus Scholar',
          authorAvatar: d.author_avatar,
          authorDept: d.author_dept,
          authorLevel: d.author_level || '300L',
          authorRole: d.author_role || 'student',
          content: d.content,
          category: d.category || 'Academics & GNS',
          mediaUrl: d.media_url,
          mediaType: d.media_type,
          likesCount: d.likes_count || 0,
          commentsCount: d.comments_count || 0,
          createdAt: d.created_at,
          type: 'post',
        })),
        hasMore: data.length > pageSize,
      };
    }
  } catch (e) {
    console.warn('[executeGlobalSearchInSupabase error]:', e);
  }
  return { items: [], hasMore: false };
}

// ==============================================================
// 2. BALANCED PEOPLE DISCOVERY SUPABASE HELPER (RPC)
// ==============================================================
export async function fetchBalancedPeopleSuggestionsFromSupabase(
  userId: string,
  limit = 20
): Promise<Array<{ id: string; fullName: string; username: string; avatarUrl?: string; faculty?: string; department?: string; level?: string; hostelLocation?: string; isVerified?: boolean; bio?: string; suggestionReason: string }>> {
  if (!isSupabaseConfigured || !userId) return [];

  try {
    const { data, error } = await supabase.rpc('get_balanced_people_suggestions', {
      p_user_id: userId,
      p_limit: limit,
    });

    if (error || !data) {
      console.warn('[fetchBalancedPeopleSuggestionsFromSupabase rpc fallback]:', error?.message);
      const { data: fallbackData } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, faculty, department, level, hostel_location, is_verified, bio')
        .neq('id', userId)
        .limit(limit);
      if (!fallbackData) return [];
      return fallbackData.map((d: any) => ({
        id: d.id,
        fullName: d.full_name || 'Campus Student',
        username: d.username || d.email?.split('@')[0],
        avatarUrl: d.avatar_url,
        faculty: d.faculty,
        department: d.department,
        level: d.level,
        hostelLocation: d.hostel_location,
        isVerified: !!d.is_verified,
        bio: d.bio,
        suggestionReason: 'Discover',
      }));
    }

    return data.map((d: any) => ({
      id: d.id,
      fullName: d.full_name || 'Campus Student',
      username: d.username || '',
      avatarUrl: d.avatar_url,
      faculty: d.faculty,
      department: d.department,
      level: d.level,
      hostelLocation: d.hostel_location,
      isVerified: !!d.is_verified,
      bio: d.bio,
      suggestionReason: d.suggestion_reason || 'Discover',
    }));
  } catch (e) {
    console.warn('[fetchBalancedPeopleSuggestionsFromSupabase exception]:', e);
    return [];
  }
}

// ==============================================================
// 3. DELETE SNAP SUPABASE HELPER & STORAGE REMOVAL
// ==============================================================
export async function deleteSnapFromSupabase(snapId: string, mediaUrl?: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: true };

  try {
    const { error: dbError } = await supabase
      .from('campus_snaps')
      .delete()
      .eq('id', snapId);

    if (dbError) {
      return { success: false, error: dbError.message };
    }

    if (mediaUrl && mediaUrl.includes('supabase.co/storage')) {
      try {
        const urlObj = new URL(mediaUrl);
        const pathParts = urlObj.pathname.split('/storage/v1/object/public/');
        if (pathParts.length > 1) {
          const fullPath = pathParts[1];
          const firstSlash = fullPath.indexOf('/');
          if (firstSlash !== -1) {
            const bucketName = fullPath.substring(0, firstSlash);
            const filePath = fullPath.substring(firstSlash + 1);
            await supabase.storage.from(bucketName).remove([filePath]);
          }
        }
      } catch (storageErr) {
        console.warn('[deleteSnapFromSupabase storage cleanup notice]:', storageErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete snap.' };
  }
}

// ==============================================================
// 4. FETCH USER PROFILE BY ID HELPER
// ==============================================================
export async function fetchUserProfileByIdFromSupabase(userId: string): Promise<AppUser | null> {
  if (!isSupabaseConfigured || !userId) return null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const isSelf = session?.user?.id === userId;

    let profile: any = null;

    if (isSelf) {
      // The logged-in user's own full profile must come from get_my_profile RPC
      const { data: myProf, error: rpcErr } = await supabase.rpc('get_my_profile');
      if (!rpcErr && myProf) {
        profile = myProf;
      }
    }

    if (!profile) {
      // Explicit allowed column list for reading profile (never select * or other users' email/matric/whatsapp)
      const { data: publicProf, error: pubErr } = await supabase
        .from('profiles')
        .select(ALLOWED_PROFILES_READ_COLUMNS)
        .eq('id', userId)
        .maybeSingle();

      if (pubErr || !publicProf) {
        if (pubErr && pubErr.code !== 'PGRST116') {
          console.warn('[fetchUserProfileByIdFromSupabase error]:', pubErr.message);
        }
        return null;
      }
      profile = publicProf;
    }

    const resolvedUser: AppUser = {
      id: profile.id,
      email: isSelf ? (profile.email || session?.user?.email || '') : '',
      fullName: profile.full_name || 'Campus Student',
      username: profile.username || `student_${profile.id.slice(0, 5)}`,
      matricNumber: isSelf ? (profile.matric_number || '') : '',
      role: (profile.role as UserRole) || 'student',
      accountType: (profile.account_type as any) || 'BUYER',
      university: profile.university || '',
      session: profile.session || '',
      faculty: profile.faculty,
      department: profile.department,
      level: (profile.level as StudentLevel) || '300L',
      hostelLocation: profile.hostel_location,
      whatsapp: isSelf ? profile.whatsapp : undefined,
      isVerified: Boolean(profile.is_verified),
      isAdmin: Boolean(profile.is_admin || profile.role === 'admin' || profile.staff_role),
      staffRole: (profile.staff_role as any) || (profile.role === 'admin' || profile.is_admin ? 'super_admin' : null),
      verifiedAt: profile.verified_at,
      avatarUrl: profile.avatar_url,
      bio: profile.bio,
      postsCount: profile.posts_count || 0,
      followersCount: profile.followers_count || 0,
      followingCount: profile.following_count || 0,
      followingUserIds: profile.following_user_ids || [],
      blockedUserIds: isSelf ? (profile.blocked_user_ids || []) : [],
      joinedAt: profile.created_at || new Date().toISOString(),
    };

    return resolvedUser;
  } catch (err) {
    console.warn('[fetchUserProfileByIdFromSupabase exception]:', err);
    return null;
  }
}
