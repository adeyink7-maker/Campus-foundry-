import RNFS from 'react-native-fs';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useStatusQueuePreloader, UserStoryStack } from './useStatusQueuePreloader';

describe('useStatusQueuePreloader Integration Test', () => {
  const mockStoryStacks: UserStoryStack[] = [
    {
      userId: 'user_A',
      statuses: [
        { id: 's1', url: 'https://cdn.com/userA_1.jpg', type: 'image' },
        { id: 's2', url: 'https://cdn.com/userA_2.mp4', type: 'video' },
        { id: 's3', url: 'https://cdn.com/userA_3.jpg', type: 'image' },
      ],
    },
    {
      userId: 'user_B',
      statuses: [
        { id: 's4', url: 'https://cdn.com/userB_1.jpg', type: 'image' },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (RNFS.exists as jest.Mock).mockResolvedValue(false);
    (RNFS.mkdir as jest.Mock).mockResolvedValue(true);
    (RNFS.downloadFile as jest.Mock).mockReturnValue({
      promise: Promise.resolve({ statusCode: 200 }),
    });
  });

  it('should automatically trigger preloading for next 2 statuses and next contact status', async () => {
    // Render hook viewing User A's 1st status (Stack 0, Status 0)
    renderHook(() =>
      useStatusQueuePreloader({
        storyStacks: mockStoryStacks,
        currentStackIndex: 0,
        currentStatusIndex: 0,
      })
    );

    await waitFor(() => {
      // Expected preloads:
      // 1. User A Status #2 (userA_2.mp4)
      // 2. User A Status #3 (userA_3.jpg)
      // 3. User B Status #1 (userB_1.jpg - Next contact)
      expect(RNFS.downloadFile).toHaveBeenCalledTimes(3);
    });

    const downloadedUrls = (RNFS.downloadFile as jest.Mock).mock.calls.map(
      (call) => call[0].fromUrl
    );

    expect(downloadedUrls).toContain('https://cdn.com/userA_2.mp4');
    expect(downloadedUrls).toContain('https://cdn.com/userA_3.jpg');
    expect(downloadedUrls).toContain('https://cdn.com/userB_1.jpg');
  });

  it('should not re-download media that is already cached locally', async () => {
    // Mock that file already exists on disk
    (RNFS.exists as jest.Mock).mockResolvedValue(true);

    renderHook(() =>
      useStatusQueuePreloader({
        storyStacks: mockStoryStacks,
        currentStackIndex: 0,
        currentStatusIndex: 0,
      })
    );

    await waitFor(() => {
      // File download should be skipped because file exists
      expect(RNFS.downloadFile).not.toHaveBeenCalled();
    });
  });
});
