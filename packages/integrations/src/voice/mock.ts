import { randomUUID } from 'crypto';
import type { VoiceProvider } from './interface';
import type { Database } from '@dental-pms/db';
import { devOutbox } from '@dental-pms/db/schema';

/**
 * Mock voice provider — logs to dev_outbox, no real telephony.
 */
export class MockVoiceProvider implements VoiceProvider {
  private activeCalls = new Map<string, { to: string; startedAt: number }>();

  constructor(private db: Database) {}

  async initiateCall(to: string, script: string): Promise<{ callId: string }> {
    const callId = randomUUID();
    this.activeCalls.set(callId, { to, startedAt: Date.now() });

    await this.db.insert(devOutbox).values({
      channel: 'voice',
      from: 'system',
      to,
      body: `[call:${callId}] ${script}`,
      provider: 'mock',
      direction: 'outbound',
    });
    console.log(`[MockVoice] initiateCall → ${to}: ${callId}`);
    return { callId };
  }

  async endCall(callId: string): Promise<void> {
    this.activeCalls.delete(callId);
    console.log(`[MockVoice] endCall → ${callId}`);
  }

  async getCallStatus(callId: string): Promise<{ status: string; duration?: number }> {
    const call = this.activeCalls.get(callId);
    if (!call) {
      return { status: 'ended' };
    }
    const duration = Math.floor((Date.now() - call.startedAt) / 1000);
    return { status: 'active', duration };
  }
}
