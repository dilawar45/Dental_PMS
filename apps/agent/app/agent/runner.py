"""Conversation turn runner orchestrating Session, LLM, and Tool dispatch."""

import logging
from app.config import settings
from app.llm.base import LLMProvider, Message
from app.session.base import SessionStore, Session, ChatMessage
from app.agent.registry import TOOL_REGISTRY, dispatch_tool
from app.agent.system_prompt import get_system_prompt

logger = logging.getLogger(__name__)


class AgentRunner:
    """Orchestrates an inbound conversation turn with real tool execution."""

    def __init__(self, llm: LLMProvider, session_store: SessionStore) -> None:
        self.llm = llm
        self.session_store = session_store

    async def handle_inbound(
        self,
        channel: str,
        sender: str,
        body: str,
        conversation_id: str | None = None,
        clinic_id: str | None = None,
    ) -> tuple[str, str | None, list[str], str]:
        """
        Handle an incoming message and execute real tools.

        Returns:
            Tuple of (reply_text, primary_tool_intent, executed_tool_intents, conversation_id)
        """
        conv_id = conversation_id or f"{channel}:{sender}"
        active_clinic_id = clinic_id or settings.default_clinic_id

        # 1. Fetch or initialize session
        session = await self.session_store.get(conv_id)
        if not session:
            session = Session(
                conversation_id=conv_id,
                channel=channel,
                clinic_id=active_clinic_id,
            )

        # 2. Append user message to session history
        session.history.append(ChatMessage(role="user", content=body))

        # 3. Assemble prompt context for LLM
        messages: list[Message] = [
            Message(role="system", content=get_system_prompt())
        ]
        for msg in session.history:
            messages.append(
                Message(
                    role=msg.role,
                    content=msg.content,
                    tool_call_id=msg.tool_call_id,
                    name=msg.name,
                )
            )

        # 4. Generate response via configured LLM provider
        available_tools = list(TOOL_REGISTRY.values())
        response = await self.llm.complete(messages=messages, tools=available_tools)

        executed_tools: list[str] = []
        reply_parts: list[str] = []

        # Server-enforced tool execution context
        tool_context = {
            "clinic_id": active_clinic_id,
            "session_id": conv_id,
            "channel": channel,
            "sender": sender,
            "from": sender,
        }

        # 5. Execute real tool calls
        if response.tool_calls:
            for tool_call in response.tool_calls:
                tool_name = tool_call.name
                executed_tools.append(tool_name)
                try:
                    tool_result = await dispatch_tool(
                        name=tool_name,
                        arguments=tool_call.arguments,
                        context=tool_context,
                    )

                    # Format response in agent's clinical voice
                    if tool_name == "check_availability":
                        slots = getattr(tool_result, "available_slots", [])
                        t_date = getattr(tool_result, "date", "")
                        if slots:
                            slot_times = [s.start_at[11:16] for s in slots[:4]]
                            reply_parts.append(
                                f"We have availability on {t_date} at {', '.join(slot_times)}. "
                                "Which time slot would you like to request?"
                            )
                        else:
                            reply_parts.append(
                                f"Our appointment slots are currently fully booked on {t_date}. "
                                "Would you like me to check the following day?"
                            )

                    elif tool_name == "get_clinic_info":
                        info_text = getattr(tool_result, "info", "")
                        reply_parts.append(info_text)

                    elif tool_name == "triage_symptoms":
                        rec = getattr(tool_result, "recommendation", "")
                        req_handoff = getattr(tool_result, "requires_human_handoff", False)
                        urgency = getattr(tool_result, "urgency", "normal")
                        reply_parts.append(rec)

                        # If symptom triage requires escalation and handoff wasn't already queued
                        if req_handoff and not any(
                            c.name == "request_human_handoff" for c in response.tool_calls
                        ):
                            try:
                                await dispatch_tool(
                                    name="request_human_handoff",
                                    arguments={
                                        "reason": f"Symptom triage escalation ({urgency}): {body}",
                                        "urgency": urgency,
                                        "channel": channel if channel in ["whatsapp", "voice", "instagram", "facebook", "google"] else "whatsapp",
                                    },
                                    context=tool_context,
                                )
                                executed_tools.append("request_human_handoff")
                            except Exception as h_err:
                                logger.error("Automatic triage handoff failed: %s", h_err)

                        if req_handoff:
                            reply_parts.append(
                                "I have alerted our clinic emergency reception staff for immediate escalation."
                            )

                    elif tool_name == "create_booking_request":
                        reply_parts.append(
                            "I have submitted your booking request to our clinic reception staff. "
                            "Our team will confirm your appointment shortly."
                        )

                    elif tool_name == "create_patient":
                        p_name = getattr(tool_result, "full_name", "")
                        reply_parts.append(
                            f"Thank you, {p_name}! Your patient profile has been registered in our clinic system."
                        )

                    elif tool_name == "lookup_patient":
                        found = getattr(tool_result, "found", False)
                        patient = getattr(tool_result, "patient", None)
                        if found and patient:
                            reply_parts.append(
                                f"I found your patient record, {patient.full_name}. How may I assist you today?"
                            )
                        else:
                            reply_parts.append(
                                "I could not locate an existing patient profile with that phone number. "
                                "Would you like me to register you as a new patient?"
                            )

                    elif tool_name == "request_human_handoff":
                        reply_parts.append(
                            "I have escalated your conversation to our clinic reception staff. "
                            "A team member will assist you directly."
                        )

                    elif tool_name == "send_receipt":
                        reply_parts.append(
                            "I have verified your invoice and dispatched your digital receipt link."
                        )

                except Exception as e:
                    logger.error("Tool '%s' execution failed: %s", tool_name, e, exc_info=True)
                    # Safe user-facing fallback and automatic escalation to receptionist
                    try:
                        safe_channel = (
                            channel
                            if channel in ["whatsapp", "voice", "instagram", "facebook", "google"]
                            else "whatsapp"
                        )
                        await dispatch_tool(
                            name="request_human_handoff",
                            arguments={
                                "reason": f"Tool execution failure fallback: {tool_name} ({str(e)})",
                                "urgency": "high",
                                "channel": safe_channel,
                            },
                            context=tool_context,
                        )
                        executed_tools.append("request_human_handoff")
                    except Exception as fallback_err:
                        logger.error("Fallback handoff failed: %s", fallback_err)

                    reply_parts.append(
                        "I'm having trouble with that right now. Let me connect you with our team."
                    )
                    break

        if reply_parts:
            reply_text = " ".join(reply_parts)
        elif response.text:
            reply_text = response.text
        else:
            reply_text = (
                "Hello! I am the AI Receptionist at Bright Smile Dental. "
                "How can I assist you with your dental care today?"
            )

        # 6. Append assistant message to session history
        session.history.append(ChatMessage(role="assistant", content=reply_text))

        # 7. Persist updated session
        await self.session_store.set(session)

        primary_tool = executed_tools[0] if executed_tools else None
        return reply_text, primary_tool, executed_tools, conv_id
