import type { SocialPlatform } from '@dental-pms/types';

/**
 * Social media provider interface (Instagram, Facebook, Google).
 */
export interface SocialProvider {
  /** Post a reply to a thread/comment on a social platform. */
  postReply(platform: SocialPlatform, threadId: string, body: string): Promise<{ replyId: string }>;

  /** Fetch recent mentions/comments since a given ISO timestamp. */
  fetchMentions(
    platform: SocialPlatform,
    since: string,
  ): Promise<{ mentions: SocialMention[] }>;
}

export interface SocialMention {
  id: string;
  platform: SocialPlatform;
  author: string;
  body: string;
  timestamp: string;
}
