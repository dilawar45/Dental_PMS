import type { Channel } from './channels';

/**
 * An inbound message from any channel.
 */
export interface InboundMessage {
  /** Unique message ID */
  id: string;
  /** Communication channel */
  channel: Channel;
  /** Sender identifier (phone number, user ID, etc.) */
  from: string;
  /** Message body */
  body: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Optional metadata from the channel */
  metadata?: Record<string, unknown>;
}

/**
 * An outbound message to be sent via a channel.
 */
export interface OutboundMessage {
  /** Unique message ID */
  id: string;
  /** Communication channel */
  channel: Channel;
  /** Recipient identifier */
  to: string;
  /** Message body */
  body: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Optional metadata for the channel */
  metadata?: Record<string, unknown>;
}
