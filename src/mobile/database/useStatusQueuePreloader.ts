import { useEffect } from 'react';
import RNFS from 'react-native-fs';

export interface StatusItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  mediaKey?: string;
  macKey?: string;
  iv?: string;
  macTag?: string;
}

export interface UserStoryStack {
  userId: string;
  statuses: StatusItem[];
}

export interface StatusQueuePreloaderProps {
  storyStacks: UserStoryStack[];
  currentStackIndex: number;
  currentStatusIndex: number;
}

const STATUS_CACHE_DIR = `${RNFS.CachesDirectoryPath || '/tmp'}/status_media_cache`;

// In-flight download deduplication cache to avoid redundant parallel downloads during rapid swipes
const activeInFlightDownloads = new Set<string>();

export const useStatusQueuePreloader = ({
  storyStacks,
  currentStackIndex,
  currentStatusIndex,
}: StatusQueuePreloaderProps): void => {
  useEffect(() => {
    if (!storyStacks || storyStacks.length === 0) return;

    let isMounted = true;

    const preloadMediaQueue = async () => {
      try {
        // Ensure cache directory exists
        const dirExists = await RNFS.exists(STATUS_CACHE_DIR);
        if (!dirExists) {
          await RNFS.mkdir(STATUS_CACHE_DIR);
        }

        const candidateUrls = new Set<string>();

        // 1. Next 2 statuses in the current user's stack
        const currentStack = storyStacks[currentStackIndex];
        if (currentStack && currentStack.statuses) {
          const nextStatus1 = currentStack.statuses[currentStatusIndex + 1];
          if (nextStatus1?.url) candidateUrls.add(nextStatus1.url);

          const nextStatus2 = currentStack.statuses[currentStatusIndex + 2];
          if (nextStatus2?.url) candidateUrls.add(nextStatus2.url);
        }

        // 2. First status of the next user's stack
        const nextStack = storyStacks[currentStackIndex + 1];
        if (nextStack && nextStack.statuses && nextStack.statuses[0]?.url) {
          candidateUrls.add(nextStack.statuses[0].url);
        }

        const urlsToPreload = Array.from(candidateUrls).filter(
          (url) => !activeInFlightDownloads.has(url)
        );

        if (urlsToPreload.length === 0) return;

        // 3. Download uncached media files concurrently with deduplication
        await Promise.all(
          urlsToPreload.map(async (url) => {
            const filename = url.split('/').pop() || `status_${Date.now()}`;
            const targetPath = `${STATUS_CACHE_DIR}/${filename}`;

            try {
              const fileAlreadyExists = await RNFS.exists(targetPath);
              if (!fileAlreadyExists && isMounted) {
                activeInFlightDownloads.add(url);
                const downloadResult = RNFS.downloadFile({
                  fromUrl: url,
                  toFile: targetPath,
                  background: true,
                  discretionary: true,
                });
                await downloadResult.promise;
              }
            } finally {
              activeInFlightDownloads.delete(url);
            }
          })
        );
      } catch (error) {
        console.warn('[useStatusQueuePreloader] Preload error:', error);
      }
    };

    preloadMediaQueue();

    return () => {
      isMounted = false;
    };
  }, [storyStacks, currentStackIndex, currentStatusIndex]);
};

export default useStatusQueuePreloader;
