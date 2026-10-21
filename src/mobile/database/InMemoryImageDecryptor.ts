import crypto from 'crypto';
import fs from 'fs';

export class InMemoryImageDecryptor {
  /**
   * Decrypts an encrypted file directly into an in-memory Base64 Data URI string.
   * No unencrypted file is ever written to disk.
   */
  static async decryptImageToDataUri(
    encryptedFilePath: string,
    mediaKeyHex: string,
    macKeyHex: string,
    ivHex: string,
    expectedMacTag: string,
    mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg'
  ): Promise<string> {
    const mediaKey = Buffer.from(mediaKeyHex, 'hex');
    const macKey = Buffer.from(macKeyHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');

    // 1. Read encrypted file from disk directly into RAM Buffer
    const encryptedBuffer = await fs.promises.readFile(encryptedFilePath);

    // 2. Verify HMAC-SHA256 Integrity (Encrypt-then-MAC)
    const hmac = crypto.createHmac('sha256', macKey);
    hmac.update(iv);
    hmac.update(encryptedBuffer);
    const calculatedMacTag = hmac.digest('hex');

    if (calculatedMacTag !== expectedMacTag) {
      throw new Error('HMAC verification failed. The media file is tampered or corrupted.');
    }

    // 3. Decrypt in RAM memory buffer
    const decipher = crypto.createDecipheriv('aes-256-cbc', mediaKey, iv);
    const decryptedBuffer = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final(),
    ]);

    // 4. Convert decrypted RAM buffer directly into a Data URI string
    const base64Data = decryptedBuffer.toString('base64');

    // Explicitly zero-out sensitive decrypted buffer in RAM after conversion
    decryptedBuffer.fill(0);

    return `data:${mimeType};base64,${base64Data}`;
  }

  /**
   * Decrypts an in-memory ArrayBuffer/Buffer directly into a Data URI without filesystem IO
   */
  static async decryptBufferToDataUri(
    encryptedBuffer: Buffer,
    mediaKeyHex: string,
    macKeyHex: string,
    ivHex: string,
    expectedMacTag: string,
    mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg'
  ): Promise<string> {
    const mediaKey = Buffer.from(mediaKeyHex, 'hex');
    const macKey = Buffer.from(macKeyHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');

    // 1. Verify HMAC-SHA256 Integrity (Encrypt-then-MAC)
    const hmac = crypto.createHmac('sha256', macKey);
    hmac.update(iv);
    hmac.update(encryptedBuffer);
    const calculatedMacTag = hmac.digest('hex');

    if (calculatedMacTag !== expectedMacTag) {
      throw new Error('HMAC verification failed. The media file is tampered or corrupted.');
    }

    // 2. Decrypt in RAM memory buffer
    const decipher = crypto.createDecipheriv('aes-256-cbc', mediaKey, iv);
    const decryptedBuffer = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final(),
    ]);

    // 3. Convert decrypted RAM buffer directly into Data URI string
    const base64Data = decryptedBuffer.toString('base64');

    // Explicitly zero-out sensitive decrypted buffer in RAM
    decryptedBuffer.fill(0);

    return `data:${mimeType};base64,${base64Data}`;
  }
}

export default InMemoryImageDecryptor;
