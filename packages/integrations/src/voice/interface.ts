/**
 * Voice provider interface.
 * Implementations: MockVoiceProvider (dev), RealVoiceProvider (production stub).
 */
export interface VoiceProvider {
  /** Initiate an outbound call with a script/prompt. */
  initiateCall(to: string, script: string): Promise<{ callId: string }>;

  /** End an active call. */
  endCall(callId: string): Promise<void>;

  /** Get the current status of a call. */
  getCallStatus(callId: string): Promise<{ status: string; duration?: number }>;
}
