import crypto from 'crypto';
import fs from 'fs';
import { InMemoryImageDecryptor } from './InMemoryImageDecryptor';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
  existsSync: jest.fn(),
}));

describe('InMemoryImageDecryptor', () => {
  const mediaKey = crypto.randomBytes(32);
  const macKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const plainText = Buffer.from('Mock decrypted image bytes for campus status');

  let validCiphertext: Buffer;
  let validMacTag: string;

  beforeAll(() => {
    // Encrypt test payload with AES-256-CBC
    const cipher = crypto.createCipheriv('aes-256-cbc', mediaKey, iv);
    validCiphertext = Buffer.concat([cipher.update(plainText), cipher.final()]);

    // Compute valid HMAC-SHA256
    const hmac = crypto.createHmac('sha256', macKey);
    hmac.update(iv);
    hmac.update(validCiphertext);
    validMacTag = hmac.digest('hex');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully verify HMAC, decrypt in memory, and return a data URI', async () => {
    (fs.promises.readFile as jest.Mock).mockResolvedValue(validCiphertext);

    const dataUri = await InMemoryImageDecryptor.decryptImageToDataUri(
      '/mock/encrypted/image.enc',
      mediaKey.toString('hex'),
      macKey.toString('hex'),
      iv.toString('hex'),
      validMacTag,
      'image/jpeg'
    );

    expect(dataUri).toMatch(/^data:image\/jpeg;base64,/);
    expect(fs.promises.readFile).toHaveBeenCalledWith('/mock/encrypted/image.enc');
  });

  it('should throw an integrity error if ciphertext has been tampered with or HMAC tag is invalid', async () => {
    (fs.promises.readFile as jest.Mock).mockResolvedValue(validCiphertext);
    const forgedMacTag = 'deadbeef'.repeat(8);

    await expect(
      InMemoryImageDecryptor.decryptImageToDataUri(
        '/mock/encrypted/image.enc',
        mediaKey.toString('hex'),
        macKey.toString('hex'),
        iv.toString('hex'),
        forgedMacTag
      )
    ).rejects.toThrow(/HMAC verification failed/i);
  });

  it('should handle filesystem read errors gracefully', async () => {
    (fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT: file not found'));

    await expect(
      InMemoryImageDecryptor.decryptImageToDataUri(
        '/mock/nonexistent.enc',
        mediaKey.toString('hex'),
        macKey.toString('hex'),
        iv.toString('hex'),
        validMacTag
      )
    ).rejects.toThrow('ENOENT: file not found');
  });
});
