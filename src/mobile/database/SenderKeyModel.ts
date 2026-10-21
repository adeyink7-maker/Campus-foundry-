import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class SenderKeyModel extends Model {
  static table = 'sender_keys';

  @field('author_user_id') authorUserId!: string;
  @field('session_id') sessionId!: string;
  @field('chain_key') chainKeyHex!: string;
  @field('signature_pub_key') signaturePubKey!: string;
  @readonly @date('updated_at') updatedAt!: Date;
}

export { SenderKeyModel };
