/**
 * WhatsApp provider interface.
 * Implementations: MockWhatsAppProvider (dev), RealWhatsAppProvider (production stub).
 */
export interface WhatsAppProvider {
  /** Send a text message to a recipient. */
  sendMessage(to: string, body: string): Promise<{ messageId: string }>;

  /** Send a template message with parameters. */
  sendTemplate(
    to: string,
    templateId: string,
    params: Record<string, string>,
  ): Promise<{ messageId: string }>;
}
