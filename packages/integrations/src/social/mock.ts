import { randomUUID } from 'crypto';
import type { SocialPlatform } from '@dental-pms/types';
import type { SocialProvider, SocialMention } from './interface';
import type { Database } from '@dental-pms/db';
import { devOutbox } from '@dental-pms/db/schema';

/**
 * Mock social provider — logs to dev_outbox, returns canned data.
 */
export class MockSocialProvider implements SocialProvider {
  constructor(private db: Database) {}

  async postReply(
    platform: SocialPlatform,
    threadId: string,
    body: string,
  ): Promise<{ replyId: string }> {
    const replyId = randomUUID();
    await this.db.insert(devOutbox).values({
      channel: platform,
      from: 'system',
      to: threadId,
      body,
      provider: 'mock',
      direction: 'outbound',
    });
    console.log(`[MockSocial] postReply → ${platform}/${threadId}: ${body}`);
    return { replyId };
  }

  async sendMessage(
    platform: SocialPlatform,
    to: string,
    body: string,
  ): Promise<{ messageId: string }> {
    const messageId = randomUUID();
    await this.db.insert(devOutbox).values({
      channel: platform,
      from: 'system',
      to,
      body,
      provider: 'mock',
      direction: 'outbound',
    });
    console.log(`[MockSocial] sendMessage → ${platform}/${to}: ${body}`);
    return { messageId };
  }

  async fetchMentions(
    platform: SocialPlatform,
    _since: string,
  ): Promise<{ mentions: SocialMention[] }> {
    console.log(`[MockSocial] fetchMentions → ${platform}`);
    return {
      mentions: [
        {
          id: randomUUID(),
          platform,
          author: 'mock-user',
          body: 'This is a mock mention for dev testing.',
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
