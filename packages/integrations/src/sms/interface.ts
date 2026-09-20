/**
 * SMS notification provider interface.
 */
export interface SmsProvider {
  /**
   * Sends an SMS message to the recipient phone number.
   */
  send(to: string, message: string): Promise<{ messageId: string }>;
}
