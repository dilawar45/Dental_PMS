import type { WhatsAppProvider } from './interface';

/**
 * Real WhatsApp provider stub.
 * Throws until Meta credentials are configured.
 */
export class RealWhatsAppProvider implements WhatsAppProvider {
  async sendMessage(_to: string, _body: string): Promise<{ messageId: string }> {
    throw new Error(
      'WhatsApp provider not configured. Set Meta API credentials to enable.',
    );
  }

  async sendTemplate(
    _to: string,
    _templateId: string,
    _params: Record<string, string>,
  ): Promise<{ messageId: string }> {
    throw new Error(
      'WhatsApp provider not configured. Set Meta API credentials to enable.',
    );
  }
}
