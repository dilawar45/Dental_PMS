import { describe, it, expect } from 'vitest';
import app from '../src/index';

describe('Agent Flow Inbound End-to-End Simulation', () => {
  it('triggers check_availability tool for booking requests', async () => {
    const res = await app.request('/dev/simulate-inbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body: 'I want to book an appointment',
        channel: 'whatsapp',
        from: '+923009988771',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tool_intents).toContain('check_availability');
    expect(data.reply).toBeDefined();
    expect(data.logged).toBe(true);
  });

  it('triggers triage_symptoms and request_human_handoff for severe pain symptoms', async () => {
    const res = await app.request('/dev/simulate-inbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body: "I'm having severe pain and bleeding",
        channel: 'whatsapp',
        from: '+923009988772',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tool_intents).toContain('triage_symptoms');
    expect(data.tool_intents).toContain('request_human_handoff');
    expect(data.reply).toBeDefined();
  });

  it('triggers get_clinic_info for operational hour queries', async () => {
    const res = await app.request('/dev/simulate-inbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body: 'What are your hours and timing?',
        channel: 'whatsapp',
        from: '+923009988773',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tool_intents).toContain('get_clinic_info');
    expect(data.reply).toBeDefined();
  });

  it('handles general greetings with no tool calls', async () => {
    const res = await app.request('/dev/simulate-inbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body: 'Hello',
        channel: 'whatsapp',
        from: '+923009988774',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tool_intents).toEqual([]);
    expect(data.tool_intent).toBeNull();
    expect(data.reply).toContain('Bright Smile Dental');
  });
});
