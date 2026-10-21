import RNFS from 'react-native-fs';

const STATUS_CACHE_DIR = `${RNFS.CachesDirectoryPath || '/tmp'}/status_media_cache`;

export class MediaCacheCleaner {
  /**
   * Scans status media cache directory and deletes expired files in parallel batches
   */
  static async purgeExpiredMediaFiles(): Promise<{ deletedCount: number; freedBytes: number }> {
    let deletedCount = 0;
    let freedBytes = 0;
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const now = Date.now();

    try {
      const exists = await RNFS.exists(STATUS_CACHE_DIR);
      if (!exists) return { deletedCount: 0, freedBytes: 0 };

      const files = await RNFS.readDir(STATUS_CACHE_DIR);
      if (!files || files.length === 0) return { deletedCount: 0, freedBytes: 0 };

      const expiredFiles: { path: string; size: number }[] = [];

      for (const file of files) {
        const fileMtime = file.mtime ? new Date(file.mtime).getTime() : now;
        const fileAge = now - fileMtime;

        // Collect expired files
        if (fileAge > TWENTY_FOUR_HOURS) {
          expiredFiles.push({
            path: file.path,
            size: Number(file.size || 0),
          });
        }
      }

      if (expiredFiles.length === 0) return { deletedCount: 0, freedBytes: 0 };

      // Execute unlinks in parallel
      const results = await Promise.allSettled(
        expiredFiles.map((file) => RNFS.unlink(file.path))
      );

      results.forEach((res, index) => {
        if (res.status === 'fulfilled') {
          freedBytes += expiredFiles[index].size;
          deletedCount++;
        }
      });

      console.log(
        `Media Cleanup Complete: Removed ${deletedCount} files, freed ${(
          freedBytes /
          (1024 * 1024)
        ).toFixed(2)} MB.`
      );

      return { deletedCount, freedBytes };
    } catch (error) {
      console.error('Error cleaning media cache directory:', error);
      return { deletedCount: 0, freedBytes: 0 };
    }
  }

  /**
   * Hard reset: Instantly wipes all cached status media (e.g., on logout)
   */
  static async clearAllMediaCache(): Promise<void> {
    try {
      const exists = await RNFS.exists(STATUS_CACHE_DIR);
      if (exists) {
        await RNFS.unlink(STATUS_CACHE_DIR);
        await RNFS.mkdir(STATUS_CACHE_DIR);
      }
    } catch (error) {
      console.error('Error clearing entire media cache:', error);
    }
  }
}

export default MediaCacheCleaner;
