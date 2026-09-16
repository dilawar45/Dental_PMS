"""Tool contract and implementation: request_human_handoff."""

from typing import Any, Literal
import asyncpg
from pydantic import BaseModel, Field
from app.config import settings
from app.db.client import with_clinic, log_audit
from app.llm.base import ToolSpec

TOOL_NAME = "request_human_handoff"
TOOL_DESCRIPTION = "Escalate an ongoing patient conversation to a human clinic receptionist or staff member."

HandoffUrgency = Literal["low", "normal", "high", "emergency"]
ConversationChannel = Literal["whatsapp", "voice", "instagram", "facebook", "google"]
ConversationStatus = Literal["open", "pending_handoff", "closed"]


class RequestHumanHandoffInput(BaseModel):
    """Input parameters for request_human_handoff tool."""

    reason: str = Field(..., description="Reason for escalating to human receptionist")
    urgency: HandoffUrgency = Field(
        default="normal",
        description="Escalation urgency level (matches DB handoff_urgency enum: low, normal, high, emergency)",
    )
    channel: ConversationChannel = Field(
        ...,
        description="Communication channel (matches DB conversation_channel enum: whatsapp, voice, instagram, facebook, google)",
    )


class RequestHumanHandoffOutput(BaseModel):
    """Output results for request_human_handoff tool."""

    handoff_id: str
    status: ConversationStatus = "pending_handoff"
    urgency: HandoffUrgency
    channel: ConversationChannel
    message: str = "Handoff successfully queued for clinic receptionist."


TOOL_SPEC = ToolSpec(
    name=TOOL_NAME,
    description=TOOL_DESCRIPTION,
    parameters=RequestHumanHandoffInput.model_json_schema(),
)


async def execute(input_data: RequestHumanHandoffInput, context: dict[str, Any]) -> RequestHumanHandoffOutput:
    """Find or create conversation, queue handoff row, update status, and record audit log."""
    clinic_id = context.get("clinic_id") or settings.default_clinic_id
    external_thread_id = context.get("session_id") or context.get("sender") or "thread_default"
    patient_id = context.get("patient_id")

    async def _execute(conn: asyncpg.Connection) -> RequestHumanHandoffOutput:
        # 1. Find or create conversation thread
        conv_row = await conn.fetchrow(
            """
            SELECT id FROM conversations
            WHERE clinic_id = $1::uuid AND channel = $2 AND external_thread_id = $3
            LIMIT 1
            """,
            clinic_id,
            input_data.channel,
            external_thread_id,
        )

        if conv_row:
            conversation_id = str(conv_row["id"])
            await conn.execute(
                """
                UPDATE conversations
                SET status = 'pending_handoff', updated_at = NOW(), last_message_at = NOW()
                WHERE id = $1::uuid
                """,
                conversation_id,
            )
        else:
            new_conv = await conn.fetchrow(
                """
                INSERT INTO conversations (
                    clinic_id, patient_id, channel, external_thread_id, status,
                    last_message_at, created_at, updated_at
                ) VALUES (
                    $1::uuid, $2::uuid, $3, $4, 'pending_handoff', NOW(), NOW(), NOW()
                )
                RETURNING id
                """,
                clinic_id,
                patient_id,
                input_data.channel,
                external_thread_id,
            )
            if not new_conv:
                raise RuntimeError("Failed to create conversation record.")
            conversation_id = str(new_conv["id"])

        # 2. Insert handoff escalation row
        handoff_row = await conn.fetchrow(
            """
            INSERT INTO handoffs (
                clinic_id, conversation_id, reason, urgency, created_at, updated_at
            ) VALUES (
                $1::uuid, $2::uuid, $3, $4, NOW(), NOW()
            )
            RETURNING id
            """,
            clinic_id,
            conversation_id,
            input_data.reason,
            input_data.urgency,
        )
        if not handoff_row:
            raise RuntimeError("Failed to insert handoff record.")

        handoff_id = str(handoff_row["id"])

        # 3. Write immutable audit log
        await log_audit(
            conn=conn,
            clinic_id=clinic_id,
            action="handoff.create",
            entity="handoff",
            entity_id=handoff_id,
            meta={
                "urgency": input_data.urgency,
                "reason": input_data.reason,
                "channel": input_data.channel,
                "conversation_id": conversation_id,
            },
        )

        return RequestHumanHandoffOutput(
            handoff_id=handoff_id,
            status="pending_handoff",
            urgency=input_data.urgency,
            channel=input_data.channel,
            message="Handoff successfully queued for clinic receptionist.",
        )

    return await with_clinic(clinic_id, _execute)
