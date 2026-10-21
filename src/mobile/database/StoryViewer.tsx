import React, { useState } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, Dimensions, Image, Text, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface StoryItem {
  id: string;
  url: string;
  caption?: string;
  type?: 'image' | 'video';
}

export interface StoryAccount {
  id: string;
  username: string;
  avatarUrl?: string;
  stories: StoryItem[];
}

export interface StoryViewerProps {
  accounts: StoryAccount[];
  initialAccountIndex?: number;
  onClose?: () => void;
  onOpenAuthorProfile?: (username: string) => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({
  accounts,
  initialAccountIndex = 0,
  onClose,
  onOpenAuthorProfile,
}) => {
  const [currentAccountIndex, setCurrentAccountIndex] = useState(initialAccountIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  const currentAccount = accounts[currentAccountIndex] || accounts[0];
  const currentStories = currentAccount?.stories || [];

  const screenWidth = SCREEN_WIDTH > 0 ? SCREEN_WIDTH : 360;

  // Reanimated shared values for horizontal page swipe transition
  const translateX = useSharedValue(-currentAccountIndex * screenWidth);

  // --- INTER-ACCOUNT NAVIGATION (SWIPE GESTURE) ---
  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20]) // Only trigger after a clear horizontal drag
    .onUpdate((event) => {
      // Live drag tracking
      translateX.value = -currentAccountIndex * screenWidth + event.translationX;
    })
    .onEnd((event) => {
      // Swipe threshold check (swipe speed or distance)
      if (event.translationX < -screenWidth * 0.25 || event.velocityX < -500) {
        // Swipe Left -> Next Account
        if (currentAccountIndex < accounts.length - 1) {
          goToAccount(currentAccountIndex + 1);
        } else {
          snapToCurrentAccount();
        }
      } else if (event.translationX > screenWidth * 0.25 || event.velocityX > 500) {
        // Swipe Right -> Previous Account
        if (currentAccountIndex > 0) {
          goToAccount(currentAccountIndex - 1);
        } else {
          snapToCurrentAccount();
        }
      } else {
        snapToCurrentAccount();
      }
    });

  const goToAccount = (index: number) => {
    setCurrentAccountIndex(index);
    setCurrentStoryIndex(0); // Reset to first story of the new account
    translateX.value = withTiming(-index * screenWidth, { duration: 250 });
  };

  const snapToCurrentAccount = () => {
    translateX.value = withTiming(-currentAccountIndex * screenWidth, { duration: 200 });
  };

  // --- INTRA-ACCOUNT NAVIGATION (TAP GESTURE) ---
  const handleTap = (event: any) => {
    const x = event.nativeEvent.locationX;
    const tapZoneWidth = screenWidth * 0.3; // Left 30% goes back

    if (x < tapZoneWidth) {
      // TAP LEFT -> Previous Story / Previous Account
      if (currentStoryIndex > 0) {
        setCurrentStoryIndex((prev) => prev - 1);
      } else if (currentAccountIndex > 0) {
        // At first story of current account -> jump to last story of previous account
        const prevAccountIndex = currentAccountIndex - 1;
        const prevAccountLastStoryIndex = accounts[prevAccountIndex].stories.length - 1;
        setCurrentAccountIndex(prevAccountIndex);
        setCurrentStoryIndex(prevAccountLastStoryIndex);
        translateX.value = withTiming(-prevAccountIndex * screenWidth, { duration: 200 });
      }
    } else {
      // TAP RIGHT -> Next Story / Next Account
      if (currentStoryIndex < currentStories.length - 1) {
        setCurrentStoryIndex((prev) => prev + 1);
      } else if (currentAccountIndex < accounts.length - 1) {
        // At last story of current account -> jump to next account
        goToAccount(currentAccountIndex + 1);
      } else if (onClose) {
        onClose();
      }
    }
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Web Fallback for Web Browsers
  if (Platform && Platform.OS === 'web') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-4 select-none">
        <div className="relative flex flex-col h-full max-h-[88vh] w-full max-w-sm rounded-3xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-2xl">
          {/* Top Progress Segment Bars */}
          <div className="absolute top-3 left-3 right-3 z-40 flex items-center gap-1.5">
            {currentStories.map((_, idx) => (
              <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-150 ease-linear rounded-full"
                  style={{
                    width: idx < currentStoryIndex ? '100%' : idx === currentStoryIndex ? '100%' : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header Info */}
          <div className="absolute top-6 left-3 right-3 z-40 flex items-center justify-between">
            <div
              onClick={() => onOpenAuthorProfile?.(currentAccount?.username)}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img
                src={currentAccount?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={currentAccount?.username}
                className="h-8 w-8 rounded-full object-cover border border-amber-400"
              />
              <span className="text-xs font-bold text-white drop-shadow">
                {currentAccount?.username}
              </span>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center text-xs font-bold hover:bg-black"
              >
                ✕
              </button>
            )}
          </div>

          {/* Media Image Display */}
          <div
            onClick={(e) => {
              const bounds = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - bounds.left;
              handleTap({ nativeEvent: { locationX: clickX } });
            }}
            className="relative flex-1 bg-black flex items-center justify-center overflow-hidden cursor-pointer"
          >
            <img
              src={currentStories[currentStoryIndex]?.url || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800'}
              alt={currentAccount?.username}
              className="h-full w-full object-cover pointer-events-none"
              draggable={false}
            />

            {/* Account Switcher Left/Right Bar Indicators */}
            <div className="absolute bottom-4 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-neutral-400 bg-black/60 backdrop-blur px-3 py-1 rounded-xl">
              <span>Account {currentAccountIndex + 1} of {accounts.length}</span>
              <span>Story {currentStoryIndex + 1} of {currentStories.length}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.horizontalList,
            { width: screenWidth * accounts.length },
            animatedContainerStyle,
          ]}
        >
          {accounts.map((account, accIdx) => (
            <View key={account.id} style={[styles.accountPage, { width: screenWidth }]}>
              {/* Media Display */}
              <Image
                source={{ uri: account.stories[accIdx === currentAccountIndex ? currentStoryIndex : 0]?.url }}
                style={styles.media}
                resizeMode="cover"
              />

              {/* Progress Indicators */}
              <View style={styles.progressContainer}>
                {account.stories.map((_, storyIdx) => (
                  <View key={storyIdx} style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width:
                            accIdx === currentAccountIndex && storyIdx === currentStoryIndex
                              ? '100%'
                              : accIdx === currentAccountIndex && storyIdx < currentStoryIndex
                              ? '100%'
                              : '0%',
                        },
                      ]}
                    />
                  </View>
                ))}
              </View>

              {/* Header Info */}
              <View style={styles.header}>
                <Text style={styles.username}>{account.username}</Text>
              </View>

              {/* Fullscreen Tap Receiver Zone */}
              <TouchableWithoutFeedback onPress={handleTap}>
                <View style={StyleSheet.absoluteFill} />
              </TouchableWithoutFeedback>
            </View>
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  horizontalList: { flex: 1, flexDirection: 'row' },
  accountPage: { flex: 1, justifyContent: 'center' },
  media: { ...StyleSheet.absoluteFill },
  progressContainer: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    flexDirection: 'row',
    gap: 4,
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 15,
  },
  username: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default StoryViewer;
