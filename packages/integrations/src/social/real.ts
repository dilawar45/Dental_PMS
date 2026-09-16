import type { SocialPlatform } from '@dental-pms/types';
import type { SocialProvider, SocialMention } from './interface';

/**
 * Real social provider stub — throws until API credentials are configured.
 */
export class RealSocialProvider implements SocialProvider {
  async postReply(
    _platform: SocialPlatform,
    _threadId: string,
    _body: string,
  ): Promise<{ replyId: string }> {
    throw new Error('Social provider not configured. Set platform API credentials to enable.');
  }

  async fetchMentions(
    _platform: SocialPlatform,
    _since: string,
  ): Promise<{ mentions: SocialMention[] }> {
    throw new Error('Social provider not configured. Set platform API credentials to enable.');
  }
}
