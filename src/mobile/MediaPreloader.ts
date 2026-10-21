import RNFS from 'react-native-fs';

const CACHE_DIR = `${RNFS.CachesDirectoryPath}/status_media_cache`;

export class MediaPreloader {
  /**
   * Initializes the cache directory
   */
  static async initCache() {
    const exists = await RNFS.exists(CACHE_DIR);
    if (!exists) {
      await RNFS.mkdir(CACHE_DIR);
    }
  }

  /**
   * Generates a deterministic local file path based on URL string
   */
  private static getLocalFilePath(url: string): string {
    // Deterministic 32-bit hash function for filename
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      hash = (hash << 5) - hash + url.charCodeAt(i);
      hash |= 0;
    }
    const ext = url.split('.').pop()?.split('?')[0] || 'tmp';
    return `${CACHE_DIR}/${Math.abs(hash)}.${ext}`;
  }

  /**
   * Checks if file exists locally; if not, downloads in background
   */
  static async preloadMedia(url: string): Promise<string> {
    await this.initCache();
    const localPath = this.getLocalFilePath(url);

    // Return cached path if file already exists locally
    const exists = await RNFS.exists(localPath);
    if (exists) {
      return `file://${localPath}`;
    }

    try {
      // Download file to disk cache asynchronously
      const downloadResult = RNFS.downloadFile({
        fromUrl: url,
        toFile: localPath,
        background: true,
        discretionary: true,
      });

      await downloadResult.promise;
      return `file://${localPath}`;
    } catch (error) {
      console.warn('Failed to preload media, falling back to network URL:', error);
      return url; // Fallback to raw remote URL on error
    }
  }

  /**
   * Cleans up media files older than 24 hours to free device disk space
   */
  static async pruneCache() {
    try {
      await this.initCache();
      const files = await RNFS.readDir(CACHE_DIR);
      const now = Date.now();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

      for (const file of files) {
        const fileTime = file.mtime ? new Date(file.mtime).getTime() : 0;
        if (fileTime > 0 && now - fileTime > TWENTY_FOUR_HOURS) {
          await RNFS.unlink(file.path);
        }
      }
    } catch (error) {
      console.error('Error pruning status cache:', error);
    }
  }
}

export default MediaPreloader;
