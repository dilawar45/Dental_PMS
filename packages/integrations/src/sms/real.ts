import type { SmsProvider } from './interface';

/**
 * Real SMS provider stub — throws until Twilio / Telenor / Jazz credentials are configured.
 */
export class RealSmsProvider implements SmsProvider {
  async send(_to: string, _message: string): Promise<{ messageId: string }> {
    throw new Error('SMS provider not configured. Set SMS credentials to enable.');
  }
}
