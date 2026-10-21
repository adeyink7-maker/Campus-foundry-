import { ExpiredKeyGarbageCollector } from './ExpiredKeyGarbageCollector';

describe('ExpiredKeyGarbageCollector Unit Tests', () => {
  let mockDatabase: any;
  let mockRecords: any[];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-05T12:00:00Z').getTime());

    const now = Date.now();
    const THIRTY_HOURS_AGO = new Date(now - 30 * 60 * 60 * 1000).toISOString();
    const TWO_HOURS_AGO = new Date(now - 2 * 60 * 60 * 1000).toISOString();

    mockRecords = [
      {
        id: 'key_1',
        updatedAt: THIRTY_HOURS_AGO, // Expired (> 24h)
        chainKeyHex: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        destroyPermanently: jest.fn().mockResolvedValue(true),
      },
      {
        id: 'key_2',
        updatedAt: TWO_HOURS_AGO, // Fresh (< 24h)
        chainKeyHex: '1122334455667788112233445566778811223344556677881122334455667788',
        destroyPermanently: jest.fn().mockResolvedValue(true),
      },
    ];

    mockDatabase = {
      get: jest.fn().mockReturnValue({
        query: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue(mockRecords),
        }),
      }),
      write: jest.fn().mockImplementation(async (callback) => {
        return callback();
      }),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should identify and purge only expired sender keys (> 24h)', async () => {
    const collector = new ExpiredKeyGarbageCollector(mockDatabase);
    const purgedCount = await collector.purgeExpiredSenderKeys();

    expect(purgedCount).toBe(1);
    expect(mockRecords[0].destroyPermanently).toHaveBeenCalledTimes(1);
    expect(mockRecords[1].destroyPermanently).not.toHaveBeenCalled();
  });

  it('should return 0 when no keys are expired', async () => {
    const now = Date.now();
    mockRecords[0].updatedAt = new Date(now - 1 * 60 * 60 * 1000).toISOString(); // Fresh

    const collector = new ExpiredKeyGarbageCollector(mockDatabase);
    const purgedCount = await collector.purgeExpiredSenderKeys();

    expect(purgedCount).toBe(0);
    expect(mockDatabase.write).not.toHaveBeenCalled();
  });

  it('should catch and log database errors gracefully without throwing', async () => {
    mockDatabase.get.mockImplementation(() => {
      throw new Error('SQLite disk I/O error');
    });

    const collector = new ExpiredKeyGarbageCollector(mockDatabase);
    const purgedCount = await collector.purgeExpiredSenderKeys();

    expect(purgedCount).toBe(0);
  });
});
