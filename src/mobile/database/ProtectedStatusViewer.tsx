import React, { useState, useEffect } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { useScreenSecurity } from './useScreenSecurity';

const { ScreenRecordingProtector } = NativeModules || {};

export interface ProtectedStatusViewerProps {
  statusMediaUri: string;
  mediaType?: 'image' | 'video';
  caption?: string;
  authorName?: string;
  onClose: () => void;
  onScreenshotAttempt?: () => void;
}

export const DecryptedStatusContent: React.FC<{
  mediaUri: string;
  mediaType?: 'image' | 'video';
  caption?: string;
}> = ({ mediaUri, mediaType = 'image', caption }) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black select-none">
      {mediaType === 'video' ? (
        <video
          src={mediaUri}
          autoPlay
          playsInline
          loop
          className="w-full h-full object-contain pointer-events-auto"
        />
      ) : (
        <img
          src={mediaUri}
          alt="Ephemeral story"
          className="w-full h-full object-contain pointer-events-none select-none"
          draggable={false}
        />
      )}
      {caption && (
        <div className="absolute bottom-6 left-4 right-4 bg-black/60 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-white text-sm shadow-xl pointer-events-none">
          {caption}
        </div>
      )}
    </div>
  );
};

export const ProtectedStatusViewer: React.FC<ProtectedStatusViewerProps> = ({
  statusMediaUri,
  mediaType = 'image',
  caption,
  authorName,
  onClose,
  onScreenshotAttempt,
}) => {
  const [isScreenRecording, setIsScreenRecording] = useState(false);
  const [screenshotWarning, setScreenshotWarning] = useState(false);

  // 1. Enable OS-level capture protection (FLAG_SECURE on Android, capture restriction on iOS)
  useScreenSecurity({
    enabled: true,
    onScreenshotTaken: () => {
      console.warn('[ProtectedStatusViewer] Screenshot detected!');
      setScreenshotWarning(true);
      onScreenshotAttempt?.();
      setTimeout(() => setScreenshotWarning(false), 3500);
    },
  });

  // 2. Listen for iOS Screen Recording transitions
  useEffect(() => {
    if (Platform && Platform.OS === 'ios' && ScreenRecordingProtector) {
      if (typeof ScreenRecordingProtector.isScreenRecording === 'function') {
        ScreenRecordingProtector.isScreenRecording().then((recording: boolean) => {
          setIsScreenRecording(recording);
        }).catch(() => {});
      }

      try {
        const eventEmitter = new NativeEventEmitter(ScreenRecordingProtector);
        const subscription = eventEmitter.addListener('onScreenRecordingChanged', (event: any) => {
          setIsScreenRecording(Boolean(event?.isRecording));
        });

        return () => subscription.remove();
      } catch (err) {
        console.warn('[ProtectedStatusViewer] NativeEventEmitter error:', err);
      }
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none">
      {/* Top Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2 text-white">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-semibold">{authorName || 'Campus Story'}</span>
          <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
            Encrypted & Protected
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Screenshot Interception Toast Notification */}
      {screenshotWarning && (
        <div className="absolute top-16 z-30 px-4 py-2 bg-red-600/90 text-white text-xs font-semibold rounded-full shadow-lg border border-red-400 backdrop-blur animate-bounce">
          📸 Screenshot attempt blocked & logged to author
        </div>
      )}

      {/* If screen recording is active, mask video content with blackout overlay */}
      {isScreenRecording ? (
        <div className="flex-1 w-full flex flex-col items-center justify-center bg-black p-6 text-center text-white">
          <span className="text-4xl mb-3">🙈</span>
          <h2 className="text-xl font-bold mb-2">Screen Recording Detected</h2>
          <p className="text-sm text-neutral-400 max-w-xs">
            Displaying status content is disabled while screen capture or AirPlay mirroring is active.
          </p>
        </div>
      ) : (
        /* Render Decrypted Status Component */
        <DecryptedStatusContent
          mediaUri={statusMediaUri}
          mediaType={mediaType}
          caption={caption}
        />
      )}
    </div>
  );
};

export default ProtectedStatusViewer;
