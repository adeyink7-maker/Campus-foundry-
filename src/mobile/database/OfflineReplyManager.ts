import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { schema } from './schema';
import { PendingReply } from './PendingReply';

const isWeb = typeof window !== 'undefined' || typeof document !== 'undefined';

const adapter = isWeb
  ? new LokiJSAdapter({
      schema,
      useWebWorker: false,
      useIncrementalIndexedDB: true,
    })
  : new SQLiteAdapter({
      schema,
      jsi: true, // High-performance native bindings on iOS & Android
    });

export const database = new Database({
  adapter,
  modelClasses: [PendingReply],
});

export class OfflineReplyManager {
  /**
   * Enqueues a story reply or like locally when offline
   */
  static async enqueueReply(
    storyId: string,
    storyAuthorId: string,
    type: 'reply' | 'like',
    content?: string
  ): Promise<PendingReply> {
    const clientMessageId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    return await database.write(async () => {
      return await database.get<PendingReply>('pending_status_replies').create((record) => {
        record.storyId = storyId;
        record.storyAuthorId = storyAuthorId;
        record.type = type;
        record.content = content || '';
        record.clientMessageId = clientMessageId;
        record.replySyncStatus = 'pending';
      });
    });
  }

  /**
   * Retrieves all unsent items pending network sync
   */
  static async getPendingQueue(): Promise<PendingReply[]> {
    return await database
      .get<PendingReply>('pending_status_replies')
      .query()
      .fetch();
  }

  /**
   * Deletes record upon successful delivery confirmation
   */
  static async removeCompleted(id: string): Promise<void> {
    await database.write(async () => {
      const record = await database.get<PendingReply>('pending_status_replies').find(id);
      await record.destroyPermanently();
    });
  }
}

export default OfflineReplyManager;
