import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Dimensions,
  SafeAreaView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
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
  duration?: number;
  caption?: string;
}

export interface StatusViewerProps {
  statuses: StatusItem[];
  user: {
    username: string;
    avatarUrl: string;
  };
  onSendReply?: (statusId: string, text: string) => void;
  onLikeStatus?: (statusId: string) => void;
  onClose?: () => void;
}

export const StatusViewerWithReactions: React.FC<StatusViewerProps> = ({
  statuses,
  user,
  onSendReply,
  onLikeStatus,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);

  const currentStatus = statuses[currentIndex];
  const duration = (currentStatus?.duration || 5) * 1000;

  // Reanimated Shared Values
  const progress = useSharedValue(0);
  const pausedProgress = useRef<number>(0);

  // Floating Heart Animation Shared Values
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const heartTranslateY = useSharedValue(0);

  // ---------------------------------------------------------------------------
  // Heart Animation Trigger
  // ---------------------------------------------------------------------------
  const triggerHeartAnimation = () => {
    'worklet';
    heartScale.value = 0;
    heartOpacity.value = 1;
    heartTranslateY.value = 0;

    // Pop Up Scale
    heartScale.value = withSpring(1.2, { damping: 6, stiffness: 150 });
    
    // Float Up & Fade Out
    heartTranslateY.value = withTiming(-120, { duration: 800, easing: Easing.out(Easing.quad) });
    heartOpacity.value = withTiming(0, { duration: 800 });

    if (onLikeStatus && currentStatus) {
      runOnJS(onLikeStatus)(currentStatus.id);
    }
  };

  const animatedHeartStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: heartScale.value },
      { translateY: heartTranslateY.value },
    ],
    opacity: heartOpacity.value,
  }));

  // ---------------------------------------------------------------------------
  // Controls & Playback
  // ---------------------------------------------------------------------------
  const handleNext = () => {
    if (currentIndex < statuses.length - 1) {
      progress.value = 0;
      pausedProgress.current = 0;
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose?.();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      progress.value = 0;
      pausedProgress.current = 0;
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const startProgressAnimation = (initialValue: number = 0) => {
    cancelAnimation(progress);
    progress.value = initialValue;
    const remainingDuration = duration * (1 - initialValue);

    progress.value = withTiming(
      1,
      { duration: remainingDuration, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(handleNext)();
      }
    );
  };

  useEffect(() => {
    if (!isPaused && !isInputFocused) {
      startProgressAnimation(pausedProgress.current);
    } else {
      cancelAnimation(progress);
    }
    return () => cancelAnimation(progress);
  }, [currentIndex, isPaused, isInputFocused]);

  // ---------------------------------------------------------------------------
  // Gestures (Double Tap to Heart, Tap left/right, Long-press pause)
  // ---------------------------------------------------------------------------
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      triggerHeartAnimation();
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd((event) => {
      'worklet';
      if (isInputFocused) {
        runOnJS(Keyboard.dismiss)();
        return;
      }
      if (event.x < SCREEN_WIDTH * 0.3) {
        runOnJS(handlePrevious)();
      } else {
        runOnJS(handleNext)();
      }
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(150)
    .onStart(() => {
      'worklet';
      if (!isInputFocused) {
        pausedProgress.current = progress.value;
        runOnJS(setIsPaused)(true);
      }
    })
    .onFinalize(() => {
      'worklet';
      if (!isInputFocused) {
        runOnJS(setIsPaused)(false);
      }
    });

  // Combine Gestures safely
  const composedGestures = Gesture.Exclusive(
    doubleTapGesture,
    Gesture.Race(longPressGesture, singleTapGesture)
  );

  const handleSendReply = () => {
    if (replyText.trim().length > 0 && currentStatus) {
      onSendReply?.(currentStatus.id, replyText);
      setReplyText('');
      Keyboard.dismiss();
    }
  };

  if (!currentStatus) return null;

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar hidden />

      {/* Media Layer */}
      <View style={styles.mediaContainer}>
        {currentStatus.type === 'image' ? (
          <Image source={{ uri: currentStatus.url }} style={styles.media} resizeMode="cover" />
        ) : (
          <Video
            source={{ uri: currentStatus.url }}
            style={styles.media}
            resizeMode="cover"
            paused={isPaused || isInputFocused}
            onEnd={handleNext}
          />
        )}
      </View>

      {/* Floating Animated Heart */}
      <View style={styles.heartOverlay} pointerEvents="none">
        <Animated.Text style={[styles.floatingHeart, animatedHeartStyle]}>
          ❤️
        </Animated.Text>
      </View>

      {/* Gesture Detector Layer */}
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

            <View style={styles.header}>
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              <Text style={styles.username}>{user.username}</Text>
            </View>
          </SafeAreaView>

          {/* Bottom Interaction Layer */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.bottomWrapper}
          >
            {currentStatus.caption && (
              <Text style={styles.caption}>{currentStatus.caption}</Text>
            )}

            <View style={styles.interactionBar}>
              <TextInput
                style={styles.input}
                placeholder="Reply..."
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={replyText}
                onChangeText={setReplyText}
                onFocus={() => {
                  pausedProgress.current = progress.value;
                  setIsInputFocused(true);
                }}
                onBlur={() => setIsInputFocused(false)}
              />

              {replyText.length > 0 ? (
                <TouchableOpacity onPress={handleSendReply} style={styles.sendButton}>
                  <Text style={styles.sendText}>Send</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={triggerHeartAnimation}
                  style={styles.likeButton}
                >
                  <Text style={styles.heartIcon}>❤️</Text>
                </TouchableOpacity>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

// Segmented Progress Bar Helper Component
const ProgressBarItem: React.FC<{
  index: number;
  currentIndex: number;
  progress: any;
}> = ({ index, currentIndex, progress }) => {
  const animatedStyle = useAnimatedStyle(() => {
    let scaleX = 0;
    if (index < currentIndex) scaleX = 1;
    else if (index === currentIndex) scaleX = progress.value;
    return { transform: [{ scaleX }] };
  });

  return (
    <View style={styles.progressBarBackground}>
      <Animated.View style={[styles.progressBarFill, animatedStyle]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  mediaContainer: { ...(StyleSheet.absoluteFill as object) },
  media: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  heartOverlay: {
    ...(StyleSheet.absoluteFill as object),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  floatingHeart: { fontSize: 90 },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topContainer: { paddingTop: 12, paddingHorizontal: 10 },
  progressContainer: { flexDirection: 'row', height: 3, gap: 4 },
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
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#FFF' },
  username: { color: '#FFF', fontSize: 14, fontWeight: '600', marginLeft: 10 },
  bottomWrapper: { paddingHorizontal: 12, paddingBottom: 20 },
  caption: {
    color: '#FFF',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 6,
    borderRadius: 8,
  },
  interactionBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: 18,
    color: '#FFF',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  likeButton: { padding: 6 },
  heartIcon: { fontSize: 28 },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendText: { color: '#FFF', fontWeight: '600' },
});

export default StatusViewerWithReactions;
