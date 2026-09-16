"""Central tool registry and execution dispatcher."""

from typing import Any
from collections.abc import Callable, Coroutine
from pydantic import BaseModel

from app.llm.base import ToolSpec
from app.agent.tools import (
    lookup_patient,
    create_patient,
    get_clinic_info,
    check_availability,
    create_booking_request,
    triage_symptoms,
    request_human_handoff,
    send_receipt,
)

# Registry of all 8 tool specifications exposed to the LLM
TOOL_REGISTRY: dict[str, ToolSpec] = {
    lookup_patient.TOOL_NAME: lookup_patient.TOOL_SPEC,
    create_patient.TOOL_NAME: create_patient.TOOL_SPEC,
    get_clinic_info.TOOL_NAME: get_clinic_info.TOOL_SPEC,
    check_availability.TOOL_NAME: check_availability.TOOL_SPEC,
    create_booking_request.TOOL_NAME: create_booking_request.TOOL_SPEC,
    triage_symptoms.TOOL_NAME: triage_symptoms.TOOL_SPEC,
    request_human_handoff.TOOL_NAME: request_human_handoff.TOOL_SPEC,
    send_receipt.TOOL_NAME: send_receipt.TOOL_SPEC,
}

# Mapping of tool names to Pydantic input models for validation
TOOL_INPUT_MODELS: dict[str, type[BaseModel]] = {
    lookup_patient.TOOL_NAME: lookup_patient.LookupPatientInput,
    create_patient.TOOL_NAME: create_patient.CreatePatientInput,
    get_clinic_info.TOOL_NAME: get_clinic_info.GetClinicInfoInput,
    check_availability.TOOL_NAME: check_availability.CheckAvailabilityInput,
    create_booking_request.TOOL_NAME: create_booking_request.CreateBookingRequestInput,
    triage_symptoms.TOOL_NAME: triage_symptoms.TriageSymptomsInput,
    request_human_handoff.TOOL_NAME: request_human_handoff.RequestHumanHandoffInput,
    send_receipt.TOOL_NAME: send_receipt.SendReceiptInput,
}

# Mapping of tool names to their execute functions
TOOL_HANDLERS: dict[str, Callable[[Any, dict[str, Any]], Coroutine[Any, Any, Any]]] = {
    lookup_patient.TOOL_NAME: lookup_patient.execute,
    create_patient.TOOL_NAME: create_patient.execute,
    get_clinic_info.TOOL_NAME: get_clinic_info.execute,
    check_availability.TOOL_NAME: check_availability.execute,
    create_booking_request.TOOL_NAME: create_booking_request.execute,
    triage_symptoms.TOOL_NAME: triage_symptoms.execute,
    request_human_handoff.TOOL_NAME: request_human_handoff.execute,
    send_receipt.TOOL_NAME: send_receipt.execute,
}


async def dispatch_tool(
    name: str,
    arguments: dict[str, Any],
    context: dict[str, Any] | None = None,
) -> Any:
    """
    Validate inputs with Pydantic and dispatch tool execution.

    In Phase 4A, inputs are strictly validated against Pydantic schemas,
    and dispatch then raises NotImplementedError for Phase 4B implementation.
    """
    if name not in TOOL_REGISTRY:
        raise ValueError(f"Unknown tool '{name}'. Available: {list(TOOL_REGISTRY.keys())}")

    input_model_cls = TOOL_INPUT_MODELS[name]
    validated_input = input_model_cls.model_validate(arguments)

    handler = TOOL_HANDLERS[name]
    return await handler(validated_input, context or {})
