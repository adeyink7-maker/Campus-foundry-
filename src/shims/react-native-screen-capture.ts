export const disallowScreenshot = (_disallow?: boolean) => {};
export const keepAwake = (_keep?: boolean) => {};
export const preventScreenCaptureAsync = async () => {};
export const allowScreenCaptureAsync = async () => {};

export const addScreenshotListener = (callback: () => void) => {
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

export const ScreenCapture = {
  disallowScreenshot,
  keepAwake,
};

export default {
  disallowScreenshot,
  keepAwake,
  preventScreenCaptureAsync,
  allowScreenCaptureAsync,
  addScreenshotListener,
  ScreenCapture,
};
