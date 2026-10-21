import { useEffect, useRef } from 'react';
import { MediaPreloader } from './MediaPreloader';

export interface UserStoryStack {
  userId: string;
  statuses: {
    id: string;
    url: string;
    type: 'image' | 'video';
  }[];
}

export interface UsePreloaderProps {
  storyStacks: UserStoryStack[];
  currentStackIndex: number;
  currentStatusIndex: number;
}

export const useStatusQueuePreloader = ({
  storyStacks,
  currentStackIndex,
  currentStatusIndex,
}: UsePreloaderProps) => {
  // Map to store resolves (remote URL -> local cached path)
  const cachedUrlMap = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const preloadQueue = async () => {
      const urlsToPreload: string[] = [];

      const currentStack = storyStacks[currentStackIndex];
      if (!currentStack) return;

      // 1. Preload NEXT 2 statuses in the current user's stack
      const nextStatusInCurrentStack = currentStack.statuses[currentStatusIndex + 1];
      const secondStatusInCurrentStack = currentStack.statuses[currentStatusIndex + 2];

      if (nextStatusInCurrentStack) urlsToPreload.push(nextStatusInCurrentStack.url);
      if (secondStatusInCurrentStack) urlsToPreload.push(secondStatusInCurrentStack.url);

      // 2. Preload FIRST status of the NEXT contact's stack (for smooth horizontal swipe)
      const nextStack = storyStacks[currentStackIndex + 1];
      if (nextStack && nextStack.statuses[0]) {
        urlsToPreload.push(nextStack.statuses[0].url);
      }

      // Execute background downloads in parallel
      await Promise.all(
        urlsToPreload.map(async (url) => {
          if (!cachedUrlMap.current.has(url)) {
            const localUri = await MediaPreloader.preloadMedia(url);
            cachedUrlMap.current.set(url, localUri);
          }
        })
      );
    };

    preloadQueue();
  }, [storyStacks, currentStackIndex, currentStatusIndex]);

  /**
   * Helper function to get cached URI or fallback to remote URL
   */
  const getCachedUri = (remoteUrl: string): string => {
    return cachedUrlMap.current.get(remoteUrl) || remoteUrl;
  };

  return { getCachedUri };
};

export default useStatusQueuePreloader;
