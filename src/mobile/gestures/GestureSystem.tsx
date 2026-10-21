import React, { useState } from 'react';
import { StyleSheet, Text, View, Dimensions, Platform } from 'react-native';
import {
  GestureHandlerRootView,
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH > 0 ? SCREEN_WIDTH * 0.75 : 280;

// Physics configuration for consistent feel
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 180,
  mass: 0.8,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

export const GestureSystem: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // 1. PANEL DRAWER (Pan Gesture with Physics & Rubber-Banding)
  // ---------------------------------------------------------------------------
  const drawerTranslationX = useSharedValue(0);
  const contextX = useSharedValue(0);

  const drawerPanGesture = Gesture.Pan()
    .onStart(() => {
      contextX.value = drawerTranslationX.value;
    })
    .onUpdate((event) => {
      const rawTranslation = contextX.value + event.translationX;

      if (rawTranslation < 0) {
        // Rubber-banding formula for left over-drag
        drawerTranslationX.value = -Math.pow(-rawTranslation, 0.75);
      } else if (rawTranslation > DRAWER_WIDTH) {
        // Rubber-banding formula for right over-drag
        const overflow = rawTranslation - DRAWER_WIDTH;
        drawerTranslationX.value = DRAWER_WIDTH + Math.pow(overflow, 0.75);
      } else {
        drawerTranslationX.value = rawTranslation;
      }
    })
    .onEnd((event) => {
      const velocityX = event.velocityX;
      const currentX = drawerTranslationX.value;

      // Snap logic combining current position and gesture velocity
      if (velocityX > 500 || (currentX > DRAWER_WIDTH / 2 && velocityX > -300)) {
        drawerTranslationX.value = withSpring(DRAWER_WIDTH, SPRING_CONFIG);
        runOnJS(setIsDrawerOpen)(true);
      } else {
        drawerTranslationX.value = withSpring(0, SPRING_CONFIG);
        runOnJS(setIsDrawerOpen)(false);
      }
    });

  const animatedDrawerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: drawerTranslationX.value }],
    };
  });

  const animatedBackdropStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      drawerTranslationX.value,
      [0, DRAWER_WIDTH],
      [0, 0.5],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  // ---------------------------------------------------------------------------
  // 2. PINCH & PAN CANVAS (Simultaneous Gestures)
  // ---------------------------------------------------------------------------
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const canvasTranslationX = useSharedValue(0);
  const canvasTranslationY = useSharedValue(0);
  const savedCanvasX = useSharedValue(0);
  const savedCanvasY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        // Snap back to minimum scale constraint
        scale.value = withSpring(1, SPRING_CONFIG);
        savedScale.value = 1;
      } else if (scale.value > 3) {
        // Snap back to maximum scale constraint
        scale.value = withSpring(3, SPRING_CONFIG);
        savedScale.value = 3;
      } else {
        savedScale.value = scale.value;
      }
    });

  const canvasPanGesture = Gesture.Pan()
    .onStart(() => {
      savedCanvasX.value = canvasTranslationX.value;
      savedCanvasY.value = canvasTranslationY.value;
    })
    .onUpdate((event) => {
      canvasTranslationX.value = savedCanvasX.value + event.translationX;
      canvasTranslationY.value = savedCanvasY.value + event.translationY;
    })
    .onEnd(() => {
      // Return canvas back to center if scaled to normal size
      if (scale.value <= 1) {
        canvasTranslationX.value = withSpring(0, SPRING_CONFIG);
        canvasTranslationY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  // Combine Pinch and Pan to execute concurrently
  const composedCanvasGesture = Gesture.Simultaneous(pinchGesture, canvasPanGesture);

  const animatedCanvasStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: canvasTranslationX.value },
        { translateY: canvasTranslationY.value },
        { scale: scale.value },
      ],
    };
  });

  // ---------------------------------------------------------------------------
  // 3. TACTILE ACTION BUTTON (Instant UI-Thread Tap)
  // ---------------------------------------------------------------------------
  const buttonScale = useSharedValue(1);

  const handlePressAction = () => {
    console.log('[GestureSystem] Tactile action triggered!');
    if (drawerTranslationX.value === 0) {
      drawerTranslationX.value = withSpring(DRAWER_WIDTH, SPRING_CONFIG);
      setIsDrawerOpen(true);
    } else {
      drawerTranslationX.value = withSpring(0, SPRING_CONFIG);
      setIsDrawerOpen(false);
    }
  };

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onTouchesDown(() => {
      // Instant response on initial touch contact
      buttonScale.value = withTiming(0.92, { duration: 50 });
    })
    .onFinalize((_, success) => {
      buttonScale.value = withSpring(1, SPRING_CONFIG);
      if (success) {
        runOnJS(handlePressAction)();
      }
    });

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  // Web Fallback for Browser Preview
  if (Platform && Platform.OS === 'web' && typeof window !== 'undefined') {
    return (
      <div className="relative w-full h-[500px] bg-slate-900 rounded-3xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-2xl select-none">
        {/* Background Interactive Canvas */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-800/60 backdrop-blur">
          <p className="text-slate-400 text-sm font-semibold mb-4">
            Pinch to Zoom / Drag to Pan Canvas
          </p>
          <button
            type="button"
            onClick={handlePressAction}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl active:scale-95 transition-all cursor-pointer"
          >
            {isDrawerOpen ? 'Close Side Drawer' : 'Toggle Channel Drawer ➔'}
          </button>
        </div>

        {/* Backdrop */}
        {isDrawerOpen && (
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />
        )}

        {/* Side Panel Drawer */}
        <div
          className={`absolute top-0 bottom-0 left-0 w-72 bg-slate-900 border-r border-slate-800 p-6 z-20 flex flex-col justify-center transition-transform duration-300 ${
            isDrawerOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          }`}
        >
          <div className="w-1 h-10 bg-slate-700 rounded-full absolute right-2 top-1/2 -translate-y-1/2" />
          <h2 className="text-xl font-bold text-slate-100 mb-2">Channel Panel</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Drag horizontally from the edge or body to dismiss or pull open. Sub-pixel 60–120 FPS spring physics.
          </p>
        </div>
      </div>
    );
  }

  // Native View
  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Background Interactive Canvas */}
      <GestureDetector gesture={composedCanvasGesture}>
        <Animated.View style={[styles.canvas, animatedCanvasStyle]}>
          <Text style={styles.canvasText}>Pinch to Zoom / Drag to Pan</Text>

          {/* Instant Tactile Button */}
          <GestureDetector gesture={tapGesture}>
            <Animated.View style={[styles.button, animatedButtonStyle]}>
              <Text style={styles.buttonText}>
                {isDrawerOpen ? 'Close Drawer' : 'Toggle Drawer'}
              </Text>
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </GestureDetector>

      {/* Dimmed Backdrop Overlay */}
      <Animated.View
        style={[styles.backdrop, animatedBackdropStyle]}
        pointerEvents="none"
      />

      {/* Gesture-Driven Side Panel Drawer */}
      <GestureDetector gesture={drawerPanGesture}>
        <Animated.View style={[styles.drawer, animatedDrawerStyle]}>
          <View style={styles.drawerHandle} />
          <Text style={styles.drawerTitle}>Channel Panel</Text>
          <Text style={styles.drawerContent}>
            Drag horizontally from the edge or body to dismiss or pull open.
          </Text>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  canvas: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
  },
  canvasText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 1,
  },
  drawer: {
    position: 'absolute',
    left: -DRAWER_WIDTH,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#0f172a',
    padding: 24,
    zIndex: 2,
    borderRightWidth: 1,
    borderRightColor: '#334155',
    justifyContent: 'center',
  },
  drawerHandle: {
    position: 'absolute',
    right: 8,
    top: '50%',
    width: 4,
    height: 40,
    borderRadius: 2,
    backgroundColor: '#475569',
  },
  drawerTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  drawerContent: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default GestureSystem;
