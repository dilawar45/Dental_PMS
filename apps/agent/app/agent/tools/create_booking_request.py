"""Tool contract and implementation: create_booking_request."""

from datetime import datetime
from typing import Any, Literal
import asyncpg
from pydantic import BaseModel, Field
from app.config import settings
from app.db.client import with_clinic, log_audit
from app.llm.base import ToolSpec

TOOL_NAME = "create_booking_request"
TOOL_DESCRIPTION = "Queue an unconfirmed patient appointment booking request for clinic staff triage."

BookingChannel = Literal["whatsapp", "voice", "instagram", "facebook", "google", "staff"]
BookingStatus = Literal["pending", "approved", "rejected"]


class CreateBookingRequestInput(BaseModel):
    """Input parameters for create_booking_request tool."""

    slot_start: str = Field(..., description="Requested appointment start ISO-8601 timestamp")
    slot_end: str = Field(..., description="Requested appointment end ISO-8601 timestamp")
    channel: BookingChannel = Field(
        ...,
        description="Booking origin channel (matches DB booking_request_channel enum: whatsapp, voice, instagram, facebook, google, staff)",
    )
    patient_id: str | None = Field(None, description="Optional UUID of registered patient")
    patient_name: str | None = Field(None, description="Prospective patient full name")
    patient_phone: str | None = Field(None, description="Prospective patient telephone number")
    reason: str | None = Field(None, description="Clinical reason or service required")
    notes: str | None = Field(None, description="Additional triage or patient notes")


class CreateBookingRequestOutput(BaseModel):
    """Output results for create_booking_request tool."""

    booking_request_id: str
    status: BookingStatus = "pending"
    channel: BookingChannel
    message: str = "Your request has been submitted. Staff will confirm shortly."


TOOL_SPEC = ToolSpec(
    name=TOOL_NAME,
    description=TOOL_DESCRIPTION,
    parameters=CreateBookingRequestInput.model_json_schema(),
)


def _parse_dt(raw: str) -> datetime:
    """Parse ISO-8601 string into datetime."""
    clean = raw.strip().replace("Z", "+00:00")
    return datetime.fromisoformat(clean)


async def execute(input_data: CreateBookingRequestInput, context: dict[str, Any]) -> CreateBookingRequestOutput:
    """Queue booking request in database and record audit log."""
    clinic_id = context.get("clinic_id") or settings.default_clinic_id
    start_dt = _parse_dt(input_data.slot_start)
    end_dt = _parse_dt(input_data.slot_end)

    async def _execute(conn: asyncpg.Connection) -> CreateBookingRequestOutput:
        # 1. If patient_id is provided, verify it belongs to this clinic
        if input_data.patient_id:
            patient_exists = await conn.fetchval(
                "SELECT id FROM patients WHERE id = $1::uuid AND clinic_id = $2::uuid AND deleted_at IS NULL",
                input_data.patient_id,
                clinic_id,
            )
            if not patient_exists:
                raise ValueError(
                    f"Patient '{input_data.patient_id}' does not exist or does not belong to clinic."
                )

        # 2. Insert booking request
        row = await conn.fetchrow(
            """
            INSERT INTO booking_requests (
                clinic_id, patient_id, patient_phone, patient_name,
                requested_slot_start, requested_slot_end, reason, notes,
                status, requested_via, created_at, updated_at
            ) VALUES (
                $1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, 'pending', $9, NOW(), NOW()
            )
            RETURNING id
            """,
            clinic_id,
            input_data.patient_id,
            input_data.patient_phone,
            input_data.patient_name,
            start_dt,
            end_dt,
            input_data.reason,
            input_data.notes,
            input_data.channel,
        )
        if not row:
            raise RuntimeError("Failed to insert booking request.")

        booking_request_id = str(row["id"])

        # 3. Record audit log
        await log_audit(
            conn=conn,
            clinic_id=clinic_id,
            action="booking_request.create",
            entity="booking_request",
            entity_id=booking_request_id,
            meta={
                "channel": input_data.channel,
                "slot_start": input_data.slot_start,
                "slot_end": input_data.slot_end,
                "patient_name": input_data.patient_name,
                "reason": input_data.reason,
            },
        )

        return CreateBookingRequestOutput(
            booking_request_id=booking_request_id,
            status="pending",
            channel=input_data.channel,
            message="Your request has been submitted. Staff will confirm shortly.",
        )

    return await with_clinic(clinic_id, _execute)
