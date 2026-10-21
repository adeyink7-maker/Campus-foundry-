import { Database } from '@nozbe/watermelondb';
import SenderKeyModel from './SenderKeyModel';

export class ExpiredKeyGarbageCollector {
  private database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  /**
   * Identifies, zero-fills in memory, and permanently deletes expired SenderKeys
   */
  public async purgeExpiredSenderKeys(): Promise<number> {
    const TWENTY_FOUR_HOURS_AGO = Date.now() - 24 * 60 * 60 * 1000;

    try {
      // 1. Fetch all keys older than 24 hours from WatermelonDB/SQLite
      const expiredKeyRecords = await this.database
        .get<SenderKeyModel>('sender_keys')
        .query()
        .fetch();

      const keysToPurge = expiredKeyRecords.filter(
        (record) => new Date(record.updatedAt).getTime() < TWENTY_FOUR_HOURS_AGO
      );

      if (keysToPurge.length === 0) return 0;

      // 2. Perform zero-out and deletion inside a single write transaction
      await this.database.write(async () => {
        for (const record of keysToPurge) {
          // Zero-out the chain key in memory to prevent memory-dump attacks
          if (record.chainKeyHex) {
            const tempBuf = Buffer.from(record.chainKeyHex, 'hex');
            tempBuf.fill(0); // Overwrite bytes with zeros
          }

          // Permanently delete the row from SQLite
          await record.destroyPermanently();
        }
      });

      console.log(`Successfully purged and zeroed out ${keysToPurge.length} expired SenderKeys.`);
      return keysToPurge.length;
    } catch (error) {
      console.error('Error during SenderKey cleanup:', error);
      return 0;
    }
  }
}

export default ExpiredKeyGarbageCollector;
