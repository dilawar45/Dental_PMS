/**
 * Mock LLM provider with keyword-driven intent classification.
 */

import { randomUUID } from 'node:crypto';
import type { LLMProvider, LLMResponse, Message, ToolCall, ToolSpec } from './base';

export class MockLLMProvider implements LLMProvider {
  /**
   * Simulates intelligent clinical and administrative routing.
   * Maps inbound user message text to appropriate tool calls.
   */
  async complete(
    messages: Message[],
    _tools?: ToolSpec[],
    _system?: string
  ): Promise<LLMResponse> {
    // Retrieve the latest user message
    let lastUserMsg = '';
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m && m.role === 'user') {
        lastUserMsg = m.content.trim();
        break;
      }
    }

    const textLower = lastUserMsg.toLowerCase();

    // Helper for keyword matching
    const hasAny = (keywords: string[]) => keywords.some((kw) => textLower.includes(kw));

    // 1. Severe pain / symptom emergency intent -> triage_symptoms + request_human_handoff
    if (hasAny(['pain', 'hurt', 'bleeding', 'swelling', 'emergency', 'toothache', 'broken tooth'])) {
      if (hasAny(['severe', 'severe pain', 'swelling', 'emergency', 'broken tooth', 'unbearable', 'bleeding'])) {
        const isUrgentEmergency = hasAny(['bleeding', 'unbearable', 'emergency']);
        const toolCalls: ToolCall[] = [
          {
            id: `call_${randomUUID().slice(0, 8)}`,
            name: 'triage_symptoms',
            arguments: {
              description: lastUserMsg,
              channel: 'whatsapp',
            },
          },
          {
            id: `call_${randomUUID().slice(0, 8)}`,
            name: 'request_human_handoff',
            arguments: {
              reason: `Clinical triage escalation: ${lastUserMsg}`,
              urgency: isUrgentEmergency ? 'emergency' : 'high',
              channel: 'whatsapp',
            },
          },
        ];

        return {
          text: 'I understand you are experiencing severe discomfort. Let me evaluate your symptoms and escalate to our clinical team immediately.',
          tool_calls: toolCalls,
          toolCalls,
        };
      } else {
        const toolCalls: ToolCall[] = [
          {
            id: `call_${randomUUID().slice(0, 8)}`,
            name: 'triage_symptoms',
            arguments: {
              description: lastUserMsg,
              channel: 'whatsapp',
            },
          },
        ];

        return {
          text: 'I understand you are experiencing discomfort. Let me evaluate your symptoms.',
          tool_calls: toolCalls,
          toolCalls,
        };
      }
    }

    // 2. Appointment booking intent -> check_availability
    if (hasAny(['book', 'appointment', 'schedule', 'slot'])) {
      const toolCalls: ToolCall[] = [
        {
          id: `call_${randomUUID().slice(0, 8)}`,
          name: 'check_availability',
          arguments: { date: 'upcoming' },
        },
      ];

      return {
        text: 'I would be happy to help you schedule an appointment. Let me check our available slots.',
        tool_calls: toolCalls,
        toolCalls,
      };
    }

    // 3. Clinic information intent -> get_clinic_info
    if (hasAny(['hour', 'open', 'time', 'location', 'address', 'where', 'service', 'pricing', 'cost', 'fee'])) {
      let topic = 'hours';
      if (hasAny(['location', 'address', 'where'])) {
        topic = 'location';
      } else if (hasAny(['pricing', 'cost', 'fee'])) {
        topic = 'pricing';
      } else if (hasAny(['service'])) {
        topic = 'services';
      }

      const toolCalls: ToolCall[] = [
        {
          id: `call_${randomUUID().slice(0, 8)}`,
          name: 'get_clinic_info',
          arguments: { topic },
        },
      ];

      return {
        text: 'Here is the clinic information you requested.',
        tool_calls: toolCalls,
        toolCalls,
      };
    }

    // 4. Human escalation intent -> request_human_handoff
    if (hasAny(['human', 'receptionist', 'person', 'talk to someone', 'operator', 'staff'])) {
      const toolCalls: ToolCall[] = [
        {
          id: `call_${randomUUID().slice(0, 8)}`,
          name: 'request_human_handoff',
          arguments: {
            reason: 'Patient requested human assistance',
            urgency: 'high',
            channel: 'whatsapp',
          },
        },
      ];

      return {
        text: 'I am connecting you with one of our clinic receptionists right away.',
        tool_calls: toolCalls,
        toolCalls,
      };
    }

    // 5. Cancellation or reschedule intent -> request_human_handoff (normal urgency)
    if (hasAny(['cancel', 'reschedule'])) {
      const toolCalls: ToolCall[] = [
        {
          id: `call_${randomUUID().slice(0, 8)}`,
          name: 'request_human_handoff',
          arguments: {
            reason: 'Patient requested cancellation or rescheduling',
            urgency: 'normal',
            channel: 'whatsapp',
          },
        },
      ];

      return {
        text: 'I can assist with modifying your appointment. I will hand this over to our reception team to adjust your schedule.',
        tool_calls: toolCalls,
        toolCalls,
      };
    }

    // 6. Receipt / billing intent -> send_receipt
    if (hasAny(['receipt', 'invoice', 'bill', 'payment proof'])) {
      const toolCalls: ToolCall[] = [
        {
          id: `call_${randomUUID().slice(0, 8)}`,
          name: 'send_receipt',
          arguments: {
            patient_id: '00000000-0000-0000-0000-000000000000',
            invoice_id: '00000000-0000-0000-0000-000000000000',
            channel: 'whatsapp',
          },
        },
      ];

      return {
        text: 'I can help you retrieve your payment receipt. Let me look up your billing record.',
        tool_calls: toolCalls,
        toolCalls,
      };
    }

    // 7. Patient registration intent -> create_patient
    if (hasAny(['register', 'new patient', 'sign up'])) {
      const toolCalls: ToolCall[] = [
        {
          id: `call_${randomUUID().slice(0, 8)}`,
          name: 'create_patient',
          arguments: {
            full_name: 'New Patient',
            phone: '+923001234567',
            consent_type: 'data_processing',
          },
        },
      ];

      return {
        text: "Welcome to Bright Smile Dental! Let's get you registered in our practice management system.",
        tool_calls: toolCalls,
        toolCalls,
      };
    }

    // 8. Patient record inquiry -> lookup_patient
    if (hasAny(['my record', 'my profile', 'my details', 'find my'])) {
      const toolCalls: ToolCall[] = [
        {
          id: `call_${randomUUID().slice(0, 8)}`,
          name: 'lookup_patient',
          arguments: { phone: '+923001234567' },
        },
      ];

      return {
        text: 'Let me verify and look up your patient record.',
        tool_calls: toolCalls,
        toolCalls,
      };
    }

    // 9. Default: Friendly clinical assistant greeting (No tool calls)
    return {
      text: 'Hello! I am the AI Receptionist at Bright Smile Dental. How may I assist you with your dental care today?',
      tool_calls: [],
      toolCalls: [],
    };
  }
}
