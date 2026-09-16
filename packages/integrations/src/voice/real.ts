import type { VoiceProvider } from './interface';

/**
 * Real voice provider stub — throws until telephony credentials are configured.
 */
export class RealVoiceProvider implements VoiceProvider {
  async initiateCall(_to: string, _script: string): Promise<{ callId: string }> {
    throw new Error('Voice provider not configured. Set telephony API credentials to enable.');
  }

  async endCall(_callId: string): Promise<void> {
    throw new Error('Voice provider not configured. Set telephony API credentials to enable.');
  }

  async getCallStatus(_callId: string): Promise<{ status: string; duration?: number }> {
    throw new Error('Voice provider not configured. Set telephony API credentials to enable.');
  }
}
