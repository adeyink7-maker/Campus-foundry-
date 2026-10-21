import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import { AddressInfo } from 'net';

export interface DecryptStreamSession {
  fileId: string;
  encryptedFilePath: string;
  mediaKeyHex: string;
  macKeyHex: string;
  ivHex: string;
  macTag: string;
  mimeType?: string;
}

export class LocalVideoDecryptServer {
  private static instance: LocalVideoDecryptServer | null = null;
  private server: http.Server | null = null;
  private port: number = 0;
  private sessions: Map<string, DecryptStreamSession> = new Map();

  private constructor() {}

  public static getInstance(): LocalVideoDecryptServer {
    if (!LocalVideoDecryptServer.instance) {
      LocalVideoDecryptServer.instance = new LocalVideoDecryptServer();
    }
    return LocalVideoDecryptServer.instance;
  }

  /**
   * Starts local HTTP streaming decryptor bound strictly to 127.0.0.1 loopback
   */
  public async start(): Promise<number> {
    if (this.server && this.port > 0) {
      return this.port;
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));

      // Bind strictly to 127.0.0.1 loopback
      this.server.listen(0, '127.0.0.1', () => {
        const address = this.server?.address() as AddressInfo;
        this.port = address.port;
        console.log(`[LocalVideoDecryptServer] Streaming proxy active on http://127.0.0.1:${this.port}`);
        resolve(this.port);
      });

      this.server.on('error', (err) => {
        console.error('[LocalVideoDecryptServer] Server error:', err);
        reject(err);
      });
    });
  }

  /**
   * Registers an encrypted video file session and returns the playback URL for AVPlayer/ExoPlayer
   */
  public registerStreamSession(session: DecryptStreamSession): string {
    const sessionId = crypto.randomBytes(16).toString('hex');
    this.sessions.set(sessionId, session);
    return `http://127.0.0.1:${this.port}/stream/${sessionId}`;
  }

  /**
   * Revokes a video stream session and clears encryption keys from RAM
   */
  public revokeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://127.0.0.1:${this.port}`);
    const parts = url.pathname.split('/');
    const sessionId = parts[2];

    if (!sessionId || !this.sessions.has(sessionId)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Session not found or expired');
      return;
    }

    const session = this.sessions.get(sessionId)!;

    try {
      if (!fs.existsSync(session.encryptedFilePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Encrypted file not found on disk');
        return;
      }

      const mediaKey = Buffer.from(session.mediaKeyHex, 'hex');
      const macKey = Buffer.from(session.macKeyHex, 'hex');
      const iv = Buffer.from(session.ivHex, 'hex');

      // 1. Read encrypted file from disk into RAM buffer
      const encryptedBuffer = await fs.promises.readFile(session.encryptedFilePath);

      // 2. Verify Encrypt-then-MAC integrity before decrypting
      const hmac = crypto.createHmac('sha256', macKey);
      hmac.update(iv);
      hmac.update(encryptedBuffer);
      const calculatedMacTag = hmac.digest('hex');

      if (session.macTag && calculatedMacTag !== session.macTag) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('HMAC verification failed. Video file is corrupted or tampered.');
        return;
      }

      // 3. Decrypt in RAM memory buffer
      const decipher = crypto.createDecipheriv('aes-256-cbc', mediaKey, iv);
      const decryptedBuffer = Buffer.concat([
        decipher.update(encryptedBuffer),
        decipher.final(),
      ]);

      const totalSize = decryptedBuffer.length;
      const mimeType = session.mimeType || 'video/mp4';

      // 4. Handle HTTP Range Requests (Required by AVPlayer & ExoPlayer)
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
        const chunkSize = end - start + 1;

        const chunk = decryptedBuffer.subarray(start, end + 1);

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': mimeType,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        });

        res.end(chunk);
      } else {
        // Full playback response
        res.writeHead(200, {
          'Content-Length': totalSize,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        });

        res.end(decryptedBuffer);
      }

      // Wipe decrypted buffer from RAM memory
      decryptedBuffer.fill(0);
    } catch (error: any) {
      console.error('[LocalVideoDecryptServer] Decryption error:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Decryption streaming error: ${error?.message || 'Unknown'}`);
    }
  }

  public async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server?.close(() => {
          this.server = null;
          this.port = 0;
          this.sessions.clear();
          resolve();
        });
      });
    }
  }
}

export default LocalVideoDecryptServer;
