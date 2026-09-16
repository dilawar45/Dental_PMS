"""Mock LLM provider with keyword-driven intent classification."""

import uuid
from app.llm.base import LLMProvider, Message, ToolSpec, ToolCall, LLMResponse


class MockLLMProvider(LLMProvider):
    """
    Mock LLM provider that simulates intelligent assistant routing.

    Inspects inbound user message text and maps detected clinical/administrative
    keywords to appropriate tool calls. If no intent is detected, returns
    a friendly conversational greeting.
    """

    async def complete(
        self,
        messages: list[Message],
        tools: list[ToolSpec] | None = None,
    ) -> LLMResponse:
        # Retrieve the latest user message
        last_user_msg = ""
        for m in reversed(messages):
            if m.role == "user":
                last_user_msg = m.content.strip()
                break

        text_lower = last_user_msg.lower()

        # 1. Severe pain / symptom emergency intent -> triage_symptoms + request_human_handoff
        if any(kw in text_lower for kw in ["pain", "hurt", "bleeding", "swelling", "emergency", "toothache", "broken tooth"]):
            # For severe pain/emergency, trigger triage AND human handoff
            if any(kw in text_lower for kw in ["severe", "severe pain", "swelling", "emergency", "broken tooth", "unbearable", "bleeding"]):
                return LLMResponse(
                    text="I understand you are experiencing severe discomfort. Let me evaluate your symptoms and escalate to our clinical team immediately.",
                    tool_calls=[
                        ToolCall(
                            id=f"call_{uuid.uuid4().hex[:8]}",
                            name="triage_symptoms",
                            arguments={
                                "description": last_user_msg,
                                "channel": "whatsapp",
                            },
                        ),
                        ToolCall(
                            id=f"call_{uuid.uuid4().hex[:8]}",
                            name="request_human_handoff",
                            arguments={
                                "reason": f"Clinical triage escalation: {last_user_msg}",
                                "urgency": "emergency" if any(k in text_lower for k in ["bleeding", "unbearable", "emergency"]) else "high",
                                "channel": "whatsapp",
                            },
                        ),
                    ],
                )
            else:
                return LLMResponse(
                    text="I understand you are experiencing discomfort. Let me evaluate your symptoms.",
                    tool_calls=[
                        ToolCall(
                            id=f"call_{uuid.uuid4().hex[:8]}",
                            name="triage_symptoms",
                            arguments={
                                "description": last_user_msg,
                                "channel": "whatsapp",
                            },
                        )
                    ],
                )

        # 2. Appointment booking intent -> check_availability
        if any(kw in text_lower for kw in ["book", "appointment", "schedule", "slot"]):
            return LLMResponse(
                text="I would be happy to help you schedule an appointment. Let me check our available slots.",
                tool_calls=[
                    ToolCall(
                        id=f"call_{uuid.uuid4().hex[:8]}",
                        name="check_availability",
                        arguments={"date": "upcoming"},
                    )
                ],
            )

        # 3. Clinic information intent -> get_clinic_info
        if any(kw in text_lower for kw in ["hour", "open", "time", "location", "address", "where", "service", "pricing", "cost", "fee"]):
            topic = "hours"
            if any(k in text_lower for k in ["location", "address", "where"]):
                topic = "location"
            elif any(k in text_lower for k in ["pricing", "cost", "fee"]):
                topic = "pricing"
            elif any(k in text_lower for k in ["service"]):
                topic = "services"

            return LLMResponse(
                text="Here is the clinic information you requested.",
                tool_calls=[
                    ToolCall(
                        id=f"call_{uuid.uuid4().hex[:8]}",
                        name="get_clinic_info",
                        arguments={"topic": topic},
                    )
                ],
            )

        # 4. Human escalation intent -> request_human_handoff
        if any(kw in text_lower for kw in ["human", "receptionist", "person", "talk to someone", "operator", "staff"]):
            return LLMResponse(
                text="I am connecting you with one of our clinic receptionists right away.",
                tool_calls=[
                    ToolCall(
                        id=f"call_{uuid.uuid4().hex[:8]}",
                        name="request_human_handoff",
                        arguments={
                            "reason": "Patient requested human assistance",
                            "urgency": "high",
                            "channel": "whatsapp",
                        },
                    )
                ],
            )

        # 5. Cancellation or reschedule intent -> request_human_handoff (normal urgency)
        if any(kw in text_lower for kw in ["cancel", "reschedule"]):
            return LLMResponse(
                text="I can assist with modifying your appointment. I will hand this over to our reception team to adjust your schedule.",
                tool_calls=[
                    ToolCall(
                        id=f"call_{uuid.uuid4().hex[:8]}",
                        name="request_human_handoff",
                        arguments={
                            "reason": "Patient requested cancellation or rescheduling",
                            "urgency": "normal",
                            "channel": "whatsapp",
                        },
                    )
                ],
            )

        # 6. Receipt / billing intent -> send_receipt
        if any(kw in text_lower for kw in ["receipt", "invoice", "bill", "payment proof"]):
            return LLMResponse(
                text="I can help you retrieve your payment receipt. Let me look up your billing record.",
                tool_calls=[
                    ToolCall(
                        id=f"call_{uuid.uuid4().hex[:8]}",
                        name="send_receipt",
                        arguments={
                            "patient_id": "00000000-0000-0000-0000-000000000000",
                            "invoice_id": "00000000-0000-0000-0000-000000000000",
                            "channel": "whatsapp",
                        },
                    )
                ],
            )

        # 7. Patient registration intent -> create_patient
        if any(kw in text_lower for kw in ["register", "new patient", "sign up"]):
            return LLMResponse(
                text="Welcome to Bright Smile Dental! Let's get you registered in our practice management system.",
                tool_calls=[
                    ToolCall(
                        id=f"call_{uuid.uuid4().hex[:8]}",
                        name="create_patient",
                        arguments={
                            "full_name": "New Patient",
                            "phone": "+923001234567",
                            "consent_type": "data_processing",
                        },
                    )
                ],
            )

        # 8. Patient record inquiry -> lookup_patient
        if any(kw in text_lower for kw in ["my record", "my profile", "my details", "find my"]):
            return LLMResponse(
                text="Let me verify and look up your patient record.",
                tool_calls=[
                    ToolCall(
                        id=f"call_{uuid.uuid4().hex[:8]}",
                        name="lookup_patient",
                        arguments={"phone": "+923001234567"},
                    )
                ],
            )

        # Default: Friendly clinical assistant greeting (No tool calls)
        return LLMResponse(
            text="Hello! I am the AI Receptionist at Bright Smile Dental. How may I assist you with your dental care today?",
            tool_calls=[],
        )
