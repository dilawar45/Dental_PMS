"""Tool contract and implementation: check_availability."""

from datetime import datetime, date, time, timedelta, timezone
from typing import Any
import asyncpg
from pydantic import BaseModel, Field
from app.config import settings
from app.db.client import with_clinic
from app.llm.base import ToolSpec

TOOL_NAME = "check_availability"
TOOL_DESCRIPTION = "Query available appointment calendar slots for a date range, dentist, or procedure."

# Asia/Karachi is UTC+5
PK_TZ = timezone(timedelta(hours=5))


class Slot(BaseModel):
    """Calendar appointment slot representation."""

    start_at: str
    end_at: str
    dentist_id: str
    dentist_name: str | None = None


class CheckAvailabilityInput(BaseModel):
    """Input parameters for check_availability tool."""

    date: str = Field(..., description="Target date in YYYY-MM-DD format (or 'today', 'upcoming')")
    dentist_id: str | None = Field(None, description="Optional UUID of specific dentist")
    procedure: str | None = Field(None, description="Optional procedure name or code")


class CheckAvailabilityOutput(BaseModel):
    """Output results for check_availability tool."""

    date: str
    available_slots: list[Slot] = Field(default_factory=list)


TOOL_SPEC = ToolSpec(
    name=TOOL_NAME,
    description=TOOL_DESCRIPTION,
    parameters=CheckAvailabilityInput.model_json_schema(),
)


def _parse_target_date(raw_date: str) -> date:
    """Resolve raw date string to a valid date object."""
    clean = raw_date.strip().lower()
    now_pk = datetime.now(PK_TZ).date()
    if clean in ["today", "now"]:
        return now_pk
    elif clean in ["tomorrow", "upcoming", "next"]:
        return now_pk + timedelta(days=1)
    try:
        return datetime.strptime(clean, "%Y-%m-%d").date()
    except ValueError:
        return now_pk + timedelta(days=1)


async def execute(input_data: CheckAvailabilityInput, context: dict[str, Any]) -> CheckAvailabilityOutput:
    """Generate available appointment slots excluding booked appointments."""
    clinic_id = context.get("clinic_id") or settings.default_clinic_id
    target_date = _parse_target_date(input_data.date)
    date_str = target_date.isoformat()

    # Define day window in Pakistan time (09:00 to 19:00)
    day_start_dt = datetime.combine(target_date, time(9, 0), tzinfo=PK_TZ)
    day_end_dt = datetime.combine(target_date, time(19, 0), tzinfo=PK_TZ)

    async def _query(conn: asyncpg.Connection) -> CheckAvailabilityOutput:
        # 1. Fetch practitioners
        if input_data.dentist_id:
            dentists = await conn.fetch(
                "SELECT id, full_name FROM users WHERE clinic_id = $1::uuid AND id = $2::uuid",
                clinic_id,
                input_data.dentist_id,
            )
        else:
            dentists = await conn.fetch(
                "SELECT id, full_name FROM users WHERE clinic_id = $1::uuid AND role IN ('dentist', 'owner')",
                clinic_id,
            )

        if not dentists:
            # Fallback placeholder practitioner if clinic has no dentist rows
            dentists = [{"id": "00000000-0000-0000-0000-000000000001", "full_name": "Clinic Duty Dentist"}]

        # 2. Fetch active appointments on target date
        booked_appts = await conn.fetch(
            """
            SELECT id, dentist_id, start_at, end_at, status
            FROM appointments
            WHERE clinic_id = $1::uuid
              AND status NOT IN ('cancelled', 'no_show')
              AND start_at >= $2
              AND start_at < $3
            """,
            clinic_id,
            day_start_dt,
            day_end_dt,
        )

        available_slots: list[Slot] = []

        # 3. Generate 30-minute candidate slots for each dentist
        slot_duration = timedelta(minutes=30)
        for d in dentists:
            d_id = str(d["id"])
            d_name = d["full_name"]

            # Filter existing bookings for this dentist
            d_appts = [
                (a["start_at"], a["end_at"])
                for a in booked_appts
                if str(a["dentist_id"]) == d_id
            ]

            curr_slot_start = day_start_dt
            while curr_slot_start + slot_duration <= day_end_dt:
                curr_slot_end = curr_slot_start + slot_duration

                # Check if slot overlaps any existing appointment
                overlap = any(
                    (curr_slot_start < a_end and curr_slot_end > a_start)
                    for a_start, a_end in d_appts
                )

                if not overlap:
                    available_slots.append(
                        Slot(
                            start_at=curr_slot_start.isoformat(),
                            end_at=curr_slot_end.isoformat(),
                            dentist_id=d_id,
                            dentist_name=d_name,
                        )
                    )

                curr_slot_start = curr_slot_end

        return CheckAvailabilityOutput(date=date_str, available_slots=available_slots)

    return await with_clinic(clinic_id, _query)
