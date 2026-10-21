import RNFS from 'react-native-fs';
import { MediaCacheCleaner } from './MediaCacheCleaner';

describe('MediaCacheCleaner', () => {
  const mockCacheDir = `${RNFS.CachesDirectoryPath || '/mock/cache/dir'}/status_media_cache`;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Lock test time to a fixed timestamp: Oct 5, 2026, 12:00:00 PM
    jest.setSystemTime(new Date('2026-10-05T12:00:00Z').getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should unlink files older than 24 hours and keep unexpired files', async () => {
    const now = Date.now();
    const THIRTY_HOURS_AGO = new Date(now - 30 * 60 * 60 * 1000);
    const TWO_HOURS_AGO = new Date(now - 2 * 60 * 60 * 1000);

    // Mock directory check & mock file list
    (RNFS.exists as jest.Mock).mockResolvedValue(true);
    (RNFS.readDir as jest.Mock).mockResolvedValue([
      {
        name: 'expired_video.mp4',
        path: `${mockCacheDir}/expired_video.mp4`,
        mtime: THIRTY_HOURS_AGO, // Expired
        size: '10485760', // 10 MB
      },
      {
        name: 'fresh_image.jpg',
        path: `${mockCacheDir}/fresh_image.jpg`,
        mtime: TWO_HOURS_AGO, // Valid
        size: '2097152', // 2 MB
      },
    ]);
    (RNFS.unlink as jest.Mock).mockResolvedValue(true);

    const result = await MediaCacheCleaner.purgeExpiredMediaFiles();

    // Verification
    expect(RNFS.exists).toHaveBeenCalledWith(mockCacheDir);
    expect(RNFS.readDir).toHaveBeenCalledWith(mockCacheDir);

    // Should ONLY delete expired_video.mp4
    expect(RNFS.unlink).toHaveBeenCalledTimes(1);
    expect(RNFS.unlink).toHaveBeenCalledWith(`${mockCacheDir}/expired_video.mp4`);

    expect(result.deletedCount).toBe(1);
    expect(result.freedBytes).toBe(10485760);
  });

  it('should handle empty or non-existent cache directory gracefully', async () => {
    (RNFS.exists as jest.Mock).mockResolvedValue(false);

    const result = await MediaCacheCleaner.purgeExpiredMediaFiles();

    expect(RNFS.unlink).not.toHaveBeenCalled();
    expect(result).toEqual({ deletedCount: 0, freedBytes: 0 });
  });
});
