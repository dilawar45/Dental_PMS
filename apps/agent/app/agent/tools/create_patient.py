"""Tool contract and implementation: create_patient."""

from datetime import datetime
from typing import Any, Literal
import asyncpg
from pydantic import BaseModel, Field
from app.config import settings
from app.db.client import with_clinic, log_audit
from app.llm.base import ToolSpec
from app.agent.constants import CONSENT_VERSION, CONSENT_TEXT_SNAPSHOT

TOOL_NAME = "create_patient"
TOOL_DESCRIPTION = "Register a new patient record with consent and demographic details."

ConsentType = Literal["data_processing", "marketing", "reminders"]


class CreatePatientInput(BaseModel):
    """Input parameters for create_patient tool."""

    full_name: str = Field(..., description="Full name of the patient")
    phone: str = Field(..., description="Patient telephone number in E.164 format")
    consent_type: ConsentType = Field(
        default="data_processing",
        description="Patient consent type (matches DB consent_type enum: data_processing, marketing, reminders)",
    )
    email: str | None = Field(None, description="Optional email address")
    dob: str | None = Field(None, description="Date of birth in YYYY-MM-DD format")
    gender: str | None = Field(None, description="Gender description (e.g., male, female, other)")


class CreatePatientOutput(BaseModel):
    """Output results for create_patient tool."""

    patient_id: str
    full_name: str
    phone: str
    status: str = "created"


TOOL_SPEC = ToolSpec(
    name=TOOL_NAME,
    description=TOOL_DESCRIPTION,
    parameters=CreatePatientInput.model_json_schema(),
)


async def execute(input_data: CreatePatientInput, context: dict[str, Any]) -> CreatePatientOutput:
    """Register patient, capture consent, and record audit log in tenant scope."""
    clinic_id = context.get("clinic_id") or settings.default_clinic_id

    # Parse optional date of birth
    dob_val = None
    if input_data.dob:
        try:
            dob_val = datetime.strptime(input_data.dob.strip(), "%Y-%m-%d").date()
        except ValueError:
            dob_val = None

    async def _execute(conn: asyncpg.Connection) -> CreatePatientOutput:
        # 1. Insert patient record
        patient_row = await conn.fetchrow(
            """
            INSERT INTO patients (
                clinic_id, full_name, phone, email, dob, gender, created_at, updated_at
            ) VALUES (
                $1::uuid, $2, $3, $4, $5, $6, NOW(), NOW()
            )
            RETURNING id
            """,
            clinic_id,
            input_data.full_name.strip(),
            input_data.phone.strip(),
            input_data.email.strip() if input_data.email else None,
            dob_val,
            input_data.gender.strip() if input_data.gender else None,
        )
        if not patient_row:
            raise RuntimeError("Failed to insert patient record.")

        patient_id = str(patient_row["id"])

        # 2. Record consent with bilingual text snapshot
        await conn.execute(
            """
            INSERT INTO consents (
                clinic_id, patient_id, type, version, granted_at, ip, text_snapshot, created_at, updated_at
            ) VALUES (
                $1::uuid, $2::uuid, $3, $4, NOW(), '127.0.0.1'::inet, $5, NOW(), NOW()
            )
            """,
            clinic_id,
            patient_id,
            input_data.consent_type,
            CONSENT_VERSION,
            CONSENT_TEXT_SNAPSHOT,
        )

        # 3. Write immutable audit log entry
        await log_audit(
            conn=conn,
            clinic_id=clinic_id,
            action="patient.create",
            entity="patient",
            entity_id=patient_id,
            meta={
                "full_name": input_data.full_name,
                "phone": input_data.phone,
                "consent_type": input_data.consent_type,
                "version": CONSENT_VERSION,
            },
        )

        return CreatePatientOutput(
            patient_id=patient_id,
            full_name=input_data.full_name,
            phone=input_data.phone,
            status="created",
        )

    return await with_clinic(clinic_id, _execute)
