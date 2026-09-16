"""Tool contract and implementation: lookup_patient."""

from typing import Any
import asyncpg
from pydantic import BaseModel, Field
from app.config import settings
from app.db.client import with_clinic
from app.llm.base import ToolSpec

TOOL_NAME = "lookup_patient"
TOOL_DESCRIPTION = "Lookup existing patient details by telephone number."


class PatientRecord(BaseModel):
    """Patient summary details."""

    id: str
    full_name: str
    phone: str
    email: str | None = None
    dob: str | None = None
    gender: str | None = None


class LookupPatientInput(BaseModel):
    """Input parameters for lookup_patient tool."""

    phone: str = Field(..., description="Patient phone number in E.164 format (e.g., +923001234501)")


class LookupPatientOutput(BaseModel):
    """Output results for lookup_patient tool."""

    found: bool
    patient: PatientRecord | None = None


TOOL_SPEC = ToolSpec(
    name=TOOL_NAME,
    description=TOOL_DESCRIPTION,
    parameters=LookupPatientInput.model_json_schema(),
)


async def execute(input_data: LookupPatientInput, context: dict[str, Any]) -> LookupPatientOutput:
    """Execute lookup_patient against tenant-scoped database."""
    clinic_id = context.get("clinic_id") or settings.default_clinic_id

    async def _query(conn: asyncpg.Connection) -> LookupPatientOutput:
        row = await conn.fetchrow(
            """
            SELECT id, full_name, phone, email, dob, gender
            FROM patients
            WHERE phone = $1 AND deleted_at IS NULL
            LIMIT 1
            """,
            input_data.phone.strip(),
        )
        if not row:
            return LookupPatientOutput(found=False, patient=None)

        return LookupPatientOutput(
            found=True,
            patient=PatientRecord(
                id=str(row["id"]),
                full_name=row["full_name"],
                phone=row["phone"],
                email=row["email"],
                dob=str(row["dob"]) if row["dob"] else None,
                gender=row["gender"],
            ),
        )

    return await with_clinic(clinic_id, _query)
