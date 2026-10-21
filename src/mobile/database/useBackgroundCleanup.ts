import { useEffect } from 'react';
import { BackgroundFetchService } from './BackgroundFetchService';

export const useBackgroundCleanup = (): void => {
  useEffect(() => {
    BackgroundFetchService.initBackgroundFetch();
  }, []);
};

export default useBackgroundCleanup;
