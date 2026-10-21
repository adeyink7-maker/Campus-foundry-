import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Video from 'react-native-video';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface StatusItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  duration?: number; // In seconds (default: 5s for images)
  caption?: string;
}

export interface StatusViewerProps {
  statuses: StatusItem[];
  user: {
    username: string;
    avatarUrl: string;
  };
  onClose?: () => void;
}

export const StatusViewer: React.FC<StatusViewerProps> = ({
  statuses,
  user,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentStatus = statuses[currentIndex];
  const duration = (currentStatus?.duration || 5) * 1000; // Duration in ms

  // Reanimated Shared Value for Progress (0 to 1)
  const progress = useSharedValue(0);

  // Reference to store paused time offset
  const pausedProgress = useRef<number>(0);

  // ---------------------------------------------------------------------------
  // Navigation Callbacks
  // ---------------------------------------------------------------------------
  const handleNext = () => {
    if (currentIndex < statuses.length - 1) {
      progress.value = 0;
      pausedProgress.current = 0;
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose?.(); // Close viewer when reaching the end
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      progress.value = 0;
      pausedProgress.current = 0;
      setCurrentIndex((prev) => prev - 1);
    } else {
      // Reset current status if on the first item
      progress.value = 0;
      pausedProgress.current = 0;
      startProgressAnimation(0);
    }
  };

  // ---------------------------------------------------------------------------
  // Animation Controller
  // ---------------------------------------------------------------------------
  const startProgressAnimation = (initialValue: number = 0) => {
    cancelAnimation(progress);
    progress.value = initialValue;

    const remainingDuration = duration * (1 - initialValue);

    progress.value = withTiming(
      1,
      {
        duration: remainingDuration,
        easing: Easing.linear,
      },
      (finished) => {
        if (finished) {
          runOnJS(handleNext)();
        }
      }
    );
  };

  // Trigger progress timer whenever index or pause state changes
  useEffect(() => {
    if (!isPaused) {
      startProgressAnimation(pausedProgress.current);
    } else {
      cancelAnimation(progress);
    }
    return () => cancelAnimation(progress);
  }, [currentIndex, isPaused]);

  // ---------------------------------------------------------------------------
  // Gesture Handling (Tap Right/Left & Hold to Pause)
  // ---------------------------------------------------------------------------
  const longPressGesture = Gesture.LongPress()
    .minDuration(150)
    .onStart(() => {
      'worklet';
      pausedProgress.current = progress.value;
      runOnJS(setIsPaused)(true);
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(setIsPaused)(false);
    });

  const tapGesture = Gesture.Tap().onEnd((event) => {
    'worklet';
    const x = event.x;
    if (x < SCREEN_WIDTH * 0.3) {
      runOnJS(handlePrevious)();
    } else {
      runOnJS(handleNext)();
    }
  });

  // Compose tap and long-press gestures simultaneously
  const composedGestures = Gesture.Race(longPressGesture, tapGesture);

  if (!currentStatus) return null;

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar hidden />
      
      {/* Background Media View */}
      <View style={styles.mediaContainer}>
        {currentStatus.type === 'image' ? (
          <Image
            source={{ uri: currentStatus.url }}
            style={styles.media}
            resizeMode="cover"
          />
        ) : (
          <Video
            source={{ uri: currentStatus.url }}
            style={styles.media}
            resizeMode="cover"
            paused={isPaused}
            onEnd={handleNext}
          />
        )}
      </View>

      {/* Overlay Layer (Controls & Header) */}
      <GestureDetector gesture={composedGestures}>
        <View style={styles.overlay}>
          {/* Top Header & Progress Bars */}
          <SafeAreaView style={styles.topContainer}>
            <View style={styles.progressContainer}>
              {statuses.map((item, index) => (
                <ProgressBarItem
                  key={item.id}
                  index={index}
                  currentIndex={currentIndex}
                  progress={progress}
                />
              ))}
            </View>

            {/* User Info */}
            <View style={styles.header}>
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              <Text style={styles.username}>{user.username}</Text>
            </View>
          </SafeAreaView>

          {/* Bottom Caption */}
          {currentStatus.caption && (
            <View style={styles.bottomContainer}>
              <Text style={styles.caption}>{currentStatus.caption}</Text>
            </View>
          )}
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

// -----------------------------------------------------------------------------
// Individual Segmented Progress Bar Component
// -----------------------------------------------------------------------------
interface ProgressBarItemProps {
  index: number;
  currentIndex: number;
  progress: any;
}

const ProgressBarItem: React.FC<ProgressBarItemProps> = ({
  index,
  currentIndex,
  progress,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    let scaleX = 0;
    if (index < currentIndex) {
      scaleX = 1; // Completed segments
    } else if (index === currentIndex) {
      scaleX = progress.value; // Active segment
    } else {
      scaleX = 0; // Future segments
    }

    return {
      transform: [{ scaleX }],
    };
  });

  return (
    <View style={styles.progressBarBackground}>
      <Animated.View style={[styles.progressBarFill, animatedStyle]} />
    </View>
  );
};

// -----------------------------------------------------------------------------
// Stylesheet
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mediaContainer: {
    ...(StyleSheet.absoluteFill as object),
  },
  media: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topContainer: {
    paddingTop: 12,
    paddingHorizontal: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    height: 3,
    gap: 4,
  },
  progressBarBackground: {
    flex: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFF',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  username: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  caption: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
});

export default StatusViewer;
