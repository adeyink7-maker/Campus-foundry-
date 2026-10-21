import { useEffect } from 'react';
import * as RawScreenCapture from 'react-native-screen-capture';

// Type definition supporting react-native-screen-capture & expo-screen-capture interfaces
interface ScreenCaptureAPI {
  preventScreenCaptureAsync?: () => Promise<void> | void;
  allowScreenCaptureAsync?: () => Promise<void> | void;
  addScreenshotListener?: (listener: () => void) => { remove: () => void };
  disallowScreenshot?: (disallow: boolean) => void;
  ScreenCapture?: {
    disallowScreenshot?: (disallow: boolean) => void;
    keepAwake?: (keep: boolean) => void;
  };
}

const ScreenCapture = RawScreenCapture as unknown as ScreenCaptureAPI;

export interface ScreenSecurityOptions {
  enabled: boolean;
  onScreenshotTaken?: () => void;
}

export const preventScreenCaptureAsync = async (): Promise<void> => {
  if (typeof ScreenCapture.preventScreenCaptureAsync === 'function') {
    await ScreenCapture.preventScreenCaptureAsync();
  } else if (typeof ScreenCapture.disallowScreenshot === 'function') {
    ScreenCapture.disallowScreenshot(true);
  } else if (ScreenCapture.ScreenCapture?.disallowScreenshot) {
    ScreenCapture.ScreenCapture.disallowScreenshot(true);
  }
};

export const allowScreenCaptureAsync = async (): Promise<void> => {
  if (typeof ScreenCapture.allowScreenCaptureAsync === 'function') {
    await ScreenCapture.allowScreenCaptureAsync();
  } else if (typeof ScreenCapture.disallowScreenshot === 'function') {
    ScreenCapture.disallowScreenshot(false);
  } else if (ScreenCapture.ScreenCapture?.disallowScreenshot) {
    ScreenCapture.ScreenCapture.disallowScreenshot(false);
  }
};

export const addScreenshotListener = (callback: () => void): { remove: () => void } => {
  if (typeof ScreenCapture.addScreenshotListener === 'function') {
    return ScreenCapture.addScreenshotListener(callback);
  }

  // Web / fallback listener for screenshot key combinations (PrintScreen / Cmd+Shift+3/4)
  if (typeof window !== 'undefined') {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'PrintScreen' ||
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5'))
      ) {
        callback();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return {
      remove: () => window.removeEventListener('keydown', handleKeyDown),
    };
  }

  return { remove: () => {} };
};

export const useScreenSecurity = ({ enabled, onScreenshotTaken }: ScreenSecurityOptions) => {
  useEffect(() => {
    if (!enabled) return;

    // 1. Enable Android FLAG_SECURE and iOS screen capture restrictions
    preventScreenCaptureAsync();

    // 2. Register listener for iOS/Android screenshot events (for analytics/audit logs)
    const subscription = addScreenshotListener(() => {
      console.warn('User attempted to take a screenshot during story playback!');
      onScreenshotTaken?.();
    });

    return () => {
      // Re-enable screen capture when user exits status view mode
      allowScreenCaptureAsync();
      subscription.remove();
    };
  }, [enabled, onScreenshotTaken]);
};

export default useScreenSecurity;
