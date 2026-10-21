import http from 'http';
import fs from 'fs';
import crypto from 'crypto';
import { AddressInfo } from 'net';

export class LocalDecryptionServer {
  private server: http.Server | null = null;
  private port = 0;

  /**
   * Starts a local loopback HTTP server that decrypts video chunks on the fly
   */
  public start(
    encryptedFilePath: string,
    mediaKeyHex: string,
    ivHex: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const mediaKey = Buffer.from(mediaKeyHex, 'hex');
        const iv = Buffer.from(ivHex, 'hex');

        this.server = http.createServer((req, res) => {
          // Enforce loopback security: Accept requests ONLY from local device
          if (
            req.socket.remoteAddress !== '127.0.0.1' &&
            req.socket.remoteAddress !== '::1' &&
            req.socket.remoteAddress !== '::ffff:127.0.0.1'
          ) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
            return;
          }

          if (!fs.existsSync(encryptedFilePath)) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Encrypted video file not found');
            return;
          }

          const stat = fs.statSync(encryptedFilePath);
          const fileSize = stat.size;
          const range = req.headers.range;

          if (range) {
            // Parse byte range request from Video Player
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = end - start + 1;

            // Decrypt chunk on-the-fly using AES-CBC
            const decipher = crypto.createDecipheriv('aes-256-cbc', mediaKey, iv);
            const fileStream = fs.createReadStream(encryptedFilePath, { start, end });

            res.writeHead(206, {
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunksize,
              'Content-Type': 'video/mp4',
            });

            // Pipe decrypted stream directly into HTTP response
            fileStream.pipe(decipher).pipe(res);
          } else {
            res.writeHead(200, {
              'Content-Length': fileSize,
              'Content-Type': 'video/mp4',
            });

            const decipher = crypto.createDecipheriv('aes-256-cbc', mediaKey, iv);
            fs.createReadStream(encryptedFilePath).pipe(decipher).pipe(res);
          }
        });

        // Bind to random ephemeral port on localhost
        this.server.listen(0, '127.0.0.1', () => {
          const address = this.server?.address() as AddressInfo;
          this.port = address?.port || 0;
          const streamUrl = `http://127.0.0.1:${this.port}/stream.mp4`;
          resolve(streamUrl);
        });

        this.server.on('error', (err) => {
          console.error('[LocalDecryptionServer] Server encountered error:', err);
          reject(err);
        });
      } catch (error) {
        console.error('[LocalDecryptionServer] Start error:', error);
        reject(error);
      }
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      this.port = 0;
    }
  }
}

export default LocalDecryptionServer;
