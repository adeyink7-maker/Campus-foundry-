import React from 'react';
import { Image } from 'react-native';
import Video from 'react-native-video';
import { useStatusQueuePreloader, UserStoryStack } from './useStatusQueuePreloader';

export interface PreloadedViewerProps {
  storyStacks: UserStoryStack[];
  currentStackIndex: number;
  currentStatusIndex: number;
}

export const PreloadedStatusViewer: React.FC<PreloadedViewerProps> = ({
  storyStacks,
  currentStackIndex,
  currentStatusIndex,
}) => {
  // 1. Initialize queue preloader hook
  const { getCachedUri } = useStatusQueuePreloader({
    storyStacks,
    currentStackIndex,
    currentStatusIndex,
  });

  const currentItem = storyStacks[currentStackIndex]?.statuses[currentStatusIndex];

  if (!currentItem) return null;

  // 2. Resolve cached local uri (or remote URL fallback)
  const resolvedMediaUri = getCachedUri(currentItem.url);

  return (
    <>
      {currentItem.type === 'image' ? (
        <Image
          source={{ uri: resolvedMediaUri }}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <Video
          source={{ uri: resolvedMediaUri }}
          style={{ width: '100%', height: '100%' }}
          bufferConfig={{
            minBufferMs: 1500,     // Start playing after 1.5s buffered
            maxBufferMs: 10000,
            bufferForPlaybackMs: 1000,
          }}
          preventsDisplaySleepDuringVideoPlayback
        />
      )}
    </>
  );
};

export default PreloadedStatusViewer;
