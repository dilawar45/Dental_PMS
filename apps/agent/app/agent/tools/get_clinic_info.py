"""Tool contract and implementation: get_clinic_info."""

from typing import Any, Literal
import asyncpg
from pydantic import BaseModel, Field
from app.config import settings
from app.db.client import with_clinic
from app.llm.base import ToolSpec
from app.agent.constants import (
    CLINIC_OPERATING_HOURS,
    CLINIC_SERVICES,
    CLINIC_PRICING,
)

TOOL_NAME = "get_clinic_info"
TOOL_DESCRIPTION = "Retrieve clinic operating hours, location, services, pricing, or general practice information."

InfoTopic = Literal["hours", "location", "services", "pricing", "general"]


class GetClinicInfoInput(BaseModel):
    """Input parameters for get_clinic_info tool."""

    topic: InfoTopic = Field(
        default="general",
        description="Category of clinic information requested: hours, location, services, pricing, general",
    )


class GetClinicInfoOutput(BaseModel):
    """Output results for get_clinic_info tool."""

    topic: str
    info: str


TOOL_SPEC = ToolSpec(
    name=TOOL_NAME,
    description=TOOL_DESCRIPTION,
    parameters=GetClinicInfoInput.model_json_schema(),
)


async def execute(input_data: GetClinicInfoInput, context: dict[str, Any]) -> GetClinicInfoOutput:
    """Retrieve clinic information based on requested topic."""
    clinic_id = context.get("clinic_id") or settings.default_clinic_id

    async def _query(conn: asyncpg.Connection) -> GetClinicInfoOutput:
        row = await conn.fetchrow(
            """
            SELECT id, name, slug, address, phone, timezone, locale
            FROM clinics
            WHERE id = $1::uuid
            LIMIT 1
            """,
            clinic_id,
        )

        name = row["name"] if row and row["name"] else "Bright Smile Dental"
        address = row["address"] if row and row["address"] else "123 Dental Blvd, Lahore"
        phone = row["phone"] if row and row["phone"] else "+92 300 1234500"

        topic = input_data.topic

        if topic == "hours":
            info = f"{name} operating hours: {CLINIC_OPERATING_HOURS}."
        elif topic == "location":
            info = f"{name} is located at: {address}."
        elif topic == "services":
            services_str = ", ".join(CLINIC_SERVICES)
            info = f"Services offered at {name}: {services_str}."
        elif topic == "pricing":
            pricing_items = [f"{k}: {v}" for k, v in CLINIC_PRICING.items()]
            pricing_str = "; ".join(pricing_items)
            info = f"Indicative pricing at {name}: {pricing_str}."
        else:  # 'general'
            info = (
                f"{name} is located at {address}. Phone: {phone}. "
                f"Operating hours: {CLINIC_OPERATING_HOURS}. "
                f"We offer comprehensive clinical dental care including consultations, "
                f"cleanings, fillings, root canals, crowns, and emergency pain relief."
            )

        return GetClinicInfoOutput(topic=topic, info=info)

    return await with_clinic(clinic_id, _query)
