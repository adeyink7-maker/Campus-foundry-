import { StoryCryptoEngine, StoryMediaKeys, StoryMetadataPlaintext } from './StoryCryptoEngine';
import { MediaPreloader } from '../MediaPreloader';

/**
 * End-to-End Encrypted (E2EE) 24-Hour Stories Pipeline Orchestrator
 * Implements Signal-Style Sender Keys & Zero-Knowledge S3 Blob Storage
 */

export interface SenderPublishRequest {
  authorId: string;
  senderGroupKeyHex: string; // 32-byte active group/ratchet sender key
  rawMediaBytes: Uint8Array;
  mediaType: 'image' | 'video';
  durationSeconds: number;
  caption?: string;
  getPresignedUploadUrl: (fileType: string, fileSize: number) => Promise<{ uploadUrl: string; publicUrl: string }>;
  publishCiphertextMetadata: (ciphertext: string) => Promise<void>;
}

export interface RecipientPlaybackResult {
  storyId: string;
  authorId: string;
  decryptedMediaLocalUri: string;
  mediaType: 'image' | 'video';
  durationSeconds: number;
  caption?: string;
  createdAt: number;
}

export class E2EEStoryPipeline {
  /**
   * ============================================================================
   * SENDER DEVICE WORKFLOW
   * ============================================================================
   * 1. Generate 32-byte AES key + HMAC key + IV.
   * 2. Encrypt media locally (AES-256-CBC + HMAC-SHA256).
   * 3. Upload raw encrypted blob to S3 via Pre-Signed URL.
   * 4. Encrypt Metadata Payload with active Sender Key.
   * 5. Dispatch ciphertext metadata to server / WebSocket relay.
   */
  static async publishEncryptedStory(
    params: SenderPublishRequest
  ): Promise<{ storyId: string; publicMediaUrl: string }> {
    const {
      authorId,
      senderGroupKeyHex,
      rawMediaBytes,
      mediaType,
      durationSeconds,
      caption,
      getPresignedUploadUrl,
      publishCiphertextMetadata,
    } = params;

    // Step 1: Generate ephemeral 32-byte AES key + HMAC key + 16-byte IV
    const mediaKeys: StoryMediaKeys = StoryCryptoEngine.generateMediaKeys();
    const storyId = `e2ee_story_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Step 2: Encrypt media locally on device
    const encryptedBlob = await StoryCryptoEngine.encryptMediaBlob(rawMediaBytes, mediaKeys);

    // Step 3: Upload raw encrypted blob directly to S3 Bucket
    const mimeType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(mimeType, encryptedBlob.length);

    // Upload raw binary bytes to S3 pre-signed endpoint
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream', // Binary ciphertext payload
      },
      body: encryptedBlob as any,
    });

    if (!uploadRes.ok) {
      throw new Error(`S3 blob upload failed with HTTP status ${uploadRes.status}`);
    }

    // Step 4: Encrypt Metadata Payload using active Sender Key
    const now = Date.now();
    const metadataPayload: StoryMetadataPlaintext = {
      storyId,
      authorId,
      mediaUrl: publicUrl,
      mediaType,
      durationSeconds,
      caption,
      encryptionKeys: mediaKeys,
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
    };

    const ciphertextMetadata = StoryCryptoEngine.encryptMetadata(
      metadataPayload,
      senderGroupKeyHex
    );

    // Step 5: Distribute Ciphertext Metadata over Relay / API Server
    await publishCiphertextMetadata(ciphertextMetadata);

    return {
      storyId,
      publicMediaUrl: publicUrl,
    };
  }

  /**
   * ============================================================================
   * RECIPIENT DEVICE WORKFLOW
   * ============================================================================
   * 1. Decrypt Metadata Payload using active Sender Key.
   * 2. Extract S3 Media URL + AES Key + HMAC Key.
   * 3. Download encrypted blob from S3 into local cache.
   * 4. Verify HMAC tag & Decrypt AES media to local file sandbox.
   */
  static async consumeEncryptedStory(
    ciphertextMetadata: string,
    senderGroupKeyHex: string
  ): Promise<RecipientPlaybackResult> {
    // Step 1: Decrypt Metadata Payload using contact's active Sender Key
    const metadata = StoryCryptoEngine.decryptMetadata(
      ciphertextMetadata,
      senderGroupKeyHex
    );

    // Step 2 & 3: Download raw encrypted blob from S3 CDN
    const response = await fetch(metadata.mediaUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch encrypted media blob from ${metadata.mediaUrl}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const encryptedBytes = new Uint8Array(arrayBuffer);

    // Step 4: Verify HMAC tag & Decrypt AES media
    const decryptedMediaBytes = await StoryCryptoEngine.decryptMediaBlob(
      encryptedBytes,
      metadata.encryptionKeys
    );

    // Convert decrypted bytes to a local sandbox URI / Blob URL for UI playback
    const mimeType = metadata.mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
    let localUri: string;

    if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL) {
      const blob = new Blob([decryptedMediaBytes as any], { type: mimeType });
      localUri = URL.createObjectURL(blob);
    } else {
      // In mobile environment, write to sandboxed cache directory via MediaPreloader
      localUri = await MediaPreloader.preloadMedia(metadata.mediaUrl);
    }

    return {
      storyId: metadata.storyId,
      authorId: metadata.authorId,
      decryptedMediaLocalUri: localUri,
      mediaType: metadata.mediaType,
      durationSeconds: metadata.durationSeconds,
      caption: metadata.caption,
      createdAt: metadata.createdAt,
    };
  }
}
