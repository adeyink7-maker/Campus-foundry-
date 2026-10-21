import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { OfflineReplyManager } from './OfflineReplyManager';

interface SyncQueueProps {
  sendWebSocketEvent: (event: string, data: any) => boolean; // Returns true if sent successfully
}

export const useOfflineSyncQueue = ({ sendWebSocketEvent }: SyncQueueProps) => {
  const isSyncing = useRef(false);

  const processQueue = async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    try {
      const pendingItems = await OfflineReplyManager.getPendingQueue();

      if (pendingItems.length === 0) {
        isSyncing.current = false;
        return;
      }

      console.log(`Processing ${pendingItems.length} offline status items...`);

      for (const item of pendingItems) {
        const eventName = item.type === 'reply' ? 'STORY_REPLY' : 'STORY_LIKE';
        const payload = {
          storyId: item.storyId,
          storyAuthorId: item.storyAuthorId,
          text: item.content,
          reactionType: item.content,
          clientMessageId: item.clientMessageId,
        };

        const success = sendWebSocketEvent(eventName, payload);

        if (success) {
          // Remove from local SQLite database once transmitted
          await OfflineReplyManager.removeCompleted(item.id);
        } else {
          console.warn('Network connection dropped during sync queue flush.');
          break; // Stop draining queue if network drops again mid-sync
        }
      }
    } catch (error) {
      console.error('Error syncing offline queue:', error);
    } finally {
      isSyncing.current = false;
    }
  };

  useEffect(() => {
    // Subscribe to network connectivity state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        processQueue();
      }
    });

    // Also trigger sync immediately on mount if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      processQueue();
    }

    return () => unsubscribe();
  }, []);

  return { processQueue };
};

export default useOfflineSyncQueue;
