import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Video, 
  Square, 
  RotateCw, 
  X, 
  Check, 
  RefreshCw, 
  AlertCircle,
  UploadCloud,
  ShieldAlert,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCheck
} from 'lucide-react';
import { captureAndCompressVideoFrame, compressImageFile } from '../utils/imageOptimizer';

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (mediaUrl: string, mediaType: 'image' | 'video') => void;
  title?: string;
}

export const LiveCameraModal = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Live Campus Camera',
}: LiveCameraModalProps) => {
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [capturedMedia, setCapturedMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInsecureContext, setIsInsecureContext] = useState(false);
  const [showDevTips, setShowDevTips] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileFallbackRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraRef = useRef<HTMLInputElement | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Stop camera tracks cleanly
  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Initialize Camera Stream safely with Secure Context & Device checks
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsInsecureContext(false);
    stopTracks();

    // 1. Secure Context Check (HTTPS or localhost)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setIsInsecureContext(true);
      setCameraError(
        'Camera access requires a Secure Context (HTTPS or localhost). Modern browsers restrict camera hardware access over plain HTTP for user privacy.'
      );
      return;
    }

    // 2. Browser & Device Availability Check
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setCameraError(
        'Your browser or current device does not support live camera capture. Please use the device camera or file upload options below.'
      );
      return;
    }

    // 3. Request Camera Stream with fallback constraints
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: mode === 'video',
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('Camera Access Error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError(
          'Camera permission denied. Please allow camera access in your browser site settings, or use native device capture below.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError(
          'No camera device was found on this device. Please select a photo or video from your device.'
        );
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError(
          'The camera is currently locked or in use by another application. Please close other camera tabs/apps and retry.'
        );
      } else if (err.name === 'OverconstrainedError') {
        // Retry with relaxed constraint
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: mode === 'video',
          });
          streamRef.current = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.play().catch(() => {});
          }
          return;
        } catch {
          setCameraError('Unable to match requested camera resolution. Please use native capture.');
        }
      } else {
        setCameraError(`Unable to access camera: ${err.message || err.name || 'Unknown error'}. Please use device capture/file upload.`);
      }
    }
  }, [facingMode, mode, stopTracks]);

  // Effect to start camera when modal opens
  useEffect(() => {
    if (!isOpen || capturedMedia) return;
    startCamera();

    return () => {
      stopTracks();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, startCamera, capturedMedia, stopTracks]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopTracks();
    };
  }, [stopTracks]);

  if (!isOpen) return null;

  // 1. Take Photo with instant flash & compression
  const handleTakePhoto = () => {
    if (!videoRef.current) return;

    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 180);

    const compressed = captureAndCompressVideoFrame(videoRef.current, {
      facingMode,
      maxWidth: 960,
      maxHeight: 720,
      quality: 0.85,
    });

    if (compressed) {
      setCapturedMedia({ url: compressed, type: 'image' });
      stopTracks();
    }
  };

  // 2. Start Video Recording
  const handleStartRecording = () => {
    if (!streamRef.current) return;

    recordedChunksRef.current = [];
    setRecordSeconds(0);

    try {
      let mimeType = 'video/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        }
      }

      const recorder = new MediaRecorder(streamRef.current, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const videoUrl = URL.createObjectURL(blob);
        setCapturedMedia({ url: videoUrl, type: 'video' });
        setIsRecording(false);
        stopTracks();
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 30) {
            handleStopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (e) {
      console.error('MediaRecorder error:', e);
      setCameraError('Video recording is not supported on this browser. Please use photo mode or upload.');
    }
  };

  // 3. Stop Video Recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Confirm capture
  const handleConfirm = () => {
    if (capturedMedia) {
      onCapture(capturedMedia.url, capturedMedia.type);
      handleClose();
    }
  };

  // Retake
  const handleRetake = () => {
    if (capturedMedia?.url.startsWith('blob:')) {
      URL.revokeObjectURL(capturedMedia.url);
    }
    setCapturedMedia(null);
    startCamera();
  };

  const handleClose = () => {
    if (capturedMedia?.url.startsWith('blob:')) {
      URL.revokeObjectURL(capturedMedia.url);
    }
    setCapturedMedia(null);
    stopTracks();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    onClose();
  };

  // Fallback file input handler (Native camera or File selection)
  const handleFallbackFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVid = file.type.startsWith('video');
    try {
      if (isVid) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (typeof event.target?.result === 'string') {
            onCapture(event.target.result, 'video');
            handleClose();
          }
        };
        reader.readAsDataURL(file);
      } else {
        const compressed = await compressImageFile(file, {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.85,
        });
        onCapture(compressed, 'image');
        handleClose();
      }
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          onCapture(event.target.result, isVid ? 'video' : 'image');
          handleClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
      onClick={handleClose}
    >
      <div 
        className="relative flex flex-col w-full max-w-lg rounded-3xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Flash animation */}
        {flashActive && (
          <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-out fade-out duration-200" />
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800/80 bg-neutral-900/80 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className={`flex h-2.5 w-2.5 rounded-full ${cameraError ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
            <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
          </div>

          <div className="flex items-center gap-2">
            {!capturedMedia && !cameraError && (
              <button
                type="button"
                onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                title="Flip Camera (Front/Rear)"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Hidden File Inputs for Native Fallbacks */}
        <input
          ref={nativeCameraRef}
          type="file"
          accept="image/*,video/*"
          capture={facingMode}
          style={{ display: 'none' }}
          onChange={handleFallbackFile}
        />
        <input
          ref={fileFallbackRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: 'none' }}
          onChange={handleFallbackFile}
        />

        {/* Viewfinder or Preview Screen */}
        <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-neutral-900 flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center space-y-4 max-w-md overflow-y-auto max-h-full">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto">
                {isInsecureContext ? <ShieldAlert className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">
                  {isInsecureContext ? 'Secure Context (HTTPS) Required' : 'Live Camera Unavailable'}
                </h4>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  {cameraError}
                </p>
              </div>

              {/* Native Capture Fallback Triggers */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => nativeCameraRef.current?.click()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Launch Phone Camera</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => fileFallbackRef.current?.click()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer"
                >
                  <UploadCloud className="h-4 w-4 text-amber-400" />
                  <span>Choose from Gallery/Files</span>
                </motion.button>
              </div>

              {/* Re-check / Retry Button */}
              <div>
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Re-check Camera Permissions</span>
                </button>
              </div>

              {/* Testing Workarounds Guide Accordion */}
              <div className="pt-2 border-t border-neutral-800/80 text-left">
                <button
                  type="button"
                  onClick={() => setShowDevTips(!showDevTips)}
                  className="w-full flex items-center justify-between text-[11px] font-semibold text-neutral-400 hover:text-neutral-200 transition-colors py-1 cursor-pointer"
                >
                  <span>Testing on a physical mobile phone over local IP?</span>
                  {showDevTips ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                <AnimatePresence>
                  {showDevTips && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden space-y-2.5 pt-2 text-[10px] text-neutral-400"
                    >
                      <div className="rounded-xl bg-neutral-950 p-2.5 border border-neutral-800 space-y-1">
                        <div className="flex items-center justify-between font-bold text-neutral-200">
                          <span>Option A: HTTPS Tunnel</span>
                          <button
                            type="button"
                            onClick={() => handleCopy('npx localtunnel --port 3000')}
                            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                          >
                            {copiedText === 'npx localtunnel --port 3000' ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            <span>Copy</span>
                          </button>
                        </div>
                        <code className="block font-mono text-[9px] text-emerald-400 bg-neutral-900 px-2 py-1 rounded">
                          npx localtunnel --port 3000
                        </code>
                        <p className="text-neutral-500">Or use <code className="text-neutral-400">npx ngrok http 3000</code> to create a secure HTTPS endpoint for mobile testing.</p>
                      </div>

                      <div className="rounded-xl bg-neutral-950 p-2.5 border border-neutral-800 space-y-1">
                        <div className="flex items-center justify-between font-bold text-neutral-200">
                          <span>Option B: Android Chrome Flags</span>
                          <button
                            type="button"
                            onClick={() => handleCopy('chrome://flags/#unsafely-treat-insecure-origin-as-secure')}
                            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                          >
                            {copiedText === 'chrome://flags/#unsafely-treat-insecure-origin-as-secure' ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            <span>Copy</span>
                          </button>
                        </div>
                        <p>1. Open Chrome on phone and navigate to:</p>
                        <code className="block font-mono text-[9px] text-amber-400 bg-neutral-900 px-2 py-1 rounded break-all">
                          chrome://flags/#unsafely-treat-insecure-origin-as-secure
                        </code>
                        <p>2. Enable flag, add your host machine IP (e.g. <code className="text-neutral-300">http://192.168.1.50:3000</code>), and relaunch Chrome.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : capturedMedia ? (
            capturedMedia.type === 'image' ? (
              <img 
                src={capturedMedia.url} 
                alt="Captured Snap" 
                className="h-full w-full object-cover"
              />
            ) : (
              <video 
                src={capturedMedia.url} 
                controls 
                autoPlay 
                playsInline 
                className="h-full w-full object-cover"
              />
            )
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={`h-full w-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
              />

              {/* Grid Lines Overlay */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20 border border-white/20">
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div />
              </div>

              {/* Native Fallback Quick Launcher in Viewfinder */}
              <div className="absolute top-3 right-3 z-20">
                <button
                  type="button"
                  onClick={() => fileFallbackRef.current?.click()}
                  className="flex items-center gap-1 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-sm text-neutral-300 hover:text-white px-2.5 py-1 text-[10px] font-semibold transition-colors cursor-pointer border border-white/10"
                  title="Upload from files instead"
                >
                  <UploadCloud className="h-3 w-3" />
                  <span>Files</span>
                </button>
              </div>

              {/* Recording indicator */}
              {isRecording && (
                <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-red-600/90 px-3 py-1 text-xs font-mono font-bold text-white shadow-lg animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-white" />
                  <span>REC 00:{recordSeconds < 10 ? `0${recordSeconds}` : recordSeconds} / 00:30</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls Footer */}
        <div className="p-4 bg-neutral-900 border-t border-neutral-800">
          {capturedMedia ? (
            <div className="flex items-center justify-between gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={handleRetake}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 py-3 text-xs font-bold text-neutral-200 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Retake</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-xs font-bold text-white transition-colors cursor-pointer shadow-lg shadow-emerald-950/50"
              >
                <Check className="h-4 w-4" />
                <span>Use Media</span>
              </motion.button>
            </div>
          ) : !cameraError ? (
            <div className="flex flex-col items-center gap-3">
              {/* Photo / Video Switch */}
              <div className="flex items-center gap-1 rounded-xl bg-neutral-950 p-1 border border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setMode('photo');
                    if (isRecording) handleStopRecording();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'photo'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('video')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'video'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Video className="h-3.5 w-3.5" />
                  <span>Video Clip</span>
                </button>
              </div>

              {/* Shutter Button & Device Native Shortcut */}
              <div className="flex items-center justify-center gap-6 pt-1">
                <button
                  type="button"
                  onClick={() => nativeCameraRef.current?.click()}
                  className="flex flex-col items-center gap-1 text-neutral-400 hover:text-white transition-colors text-[10px] cursor-pointer"
                  title="Capture using native device camera"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-800 border border-neutral-700">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <span>Device</span>
                </button>

                {mode === 'photo' ? (
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    type="button"
                    onClick={handleTakePhoto}
                    className="h-16 w-16 rounded-full border-4 border-white bg-emerald-500 hover:bg-emerald-400 p-1 shadow-lg shadow-emerald-950/60 flex items-center justify-center cursor-pointer transition-all"
                    title="Take Snap Photo"
                  >
                    <span className="h-12 w-12 rounded-full bg-white/20 border-2 border-white/50" />
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    type="button"
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    className={`h-16 w-16 rounded-full border-4 border-white p-1 shadow-lg flex items-center justify-center cursor-pointer transition-all ${
                      isRecording ? 'bg-red-600 animate-pulse' : 'bg-red-500 hover:bg-red-400'
                    }`}
                    title={isRecording ? 'Stop Recording' : 'Start Video Recording'}
                  >
                    {isRecording ? (
                      <Square className="h-6 w-6 text-white fill-white" />
                    ) : (
                      <span className="h-8 w-8 rounded-full bg-white" />
                    )}
                  </motion.button>
                )}

                <button
                  type="button"
                  onClick={() => fileFallbackRef.current?.click()}
                  className="flex flex-col items-center gap-1 text-neutral-400 hover:text-white transition-colors text-[10px] cursor-pointer"
                  title="Upload from files"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-800 border border-neutral-700">
                    <UploadCloud className="h-4 w-4" />
                  </div>
                  <span>Gallery</span>
                </button>
              </div>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={handleClose}
              className="w-full rounded-xl bg-neutral-800 text-neutral-300 py-2.5 text-xs font-bold hover:text-white cursor-pointer"
            >
              Close Camera
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};
