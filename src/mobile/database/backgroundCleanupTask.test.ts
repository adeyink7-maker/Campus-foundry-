import BackgroundFetch from 'react-native-background-fetch';
import { HeadlessBackgroundCleanupTask } from './backgroundCleanupTask';
import { MediaCacheCleaner } from './MediaCacheCleaner';

jest.mock('./MediaCacheCleaner');

describe('HeadlessBackgroundCleanupTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should execute cleanup routines and call BackgroundFetch.finish() on completion', async () => {
    (MediaCacheCleaner.purgeExpiredMediaFiles as jest.Mock).mockResolvedValue({
      deletedCount: 5,
      freedBytes: 1000,
    });

    const mockEvent = { taskId: 'com.transistorsoft.fetch', timeout: false };

    await HeadlessBackgroundCleanupTask(mockEvent);

    expect(MediaCacheCleaner.purgeExpiredMediaFiles).toHaveBeenCalledTimes(1);
    expect(BackgroundFetch.finish).toHaveBeenCalledWith('com.transistorsoft.fetch');
  });

  it('should handle timeout events properly without running full cleanup', async () => {
    const timeoutEvent = { taskId: 'com.transistorsoft.fetch', timeout: true };

    await HeadlessBackgroundCleanupTask(timeoutEvent);

    expect(MediaCacheCleaner.purgeExpiredMediaFiles).not.toHaveBeenCalled();
    expect(BackgroundFetch.finish).toHaveBeenCalledWith('com.transistorsoft.fetch');
  });
});
