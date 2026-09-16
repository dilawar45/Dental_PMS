"""Tests for tool contracts, Pydantic validation, and enum integrity."""

import pytest
from pydantic import ValidationError

from app.agent.registry import (
    TOOL_REGISTRY,
    TOOL_INPUT_MODELS,
)
from app.agent.tools.lookup_patient import LookupPatientInput
from app.agent.tools.create_patient import CreatePatientInput
from app.agent.tools.get_clinic_info import GetClinicInfoInput
from app.agent.tools.check_availability import CheckAvailabilityInput
from app.agent.tools.create_booking_request import CreateBookingRequestInput
from app.agent.tools.triage_symptoms import TriageSymptomsInput, classify_symptoms
from app.agent.tools.request_human_handoff import RequestHumanHandoffInput
from app.agent.tools.send_receipt import SendReceiptInput

EXPECTED_8_TOOLS = [
    "lookup_patient",
    "create_patient",
    "get_clinic_info",
    "check_availability",
    "create_booking_request",
    "triage_symptoms",
    "request_human_handoff",
    "send_receipt",
]


def test_tool_registry_contains_all_8_tools() -> None:
    """Ensure all 8 tools are properly registered with specifications."""
    assert len(TOOL_REGISTRY) == 8
    for tool_name in EXPECTED_8_TOOLS:
        assert tool_name in TOOL_REGISTRY
        spec = TOOL_REGISTRY[tool_name]
        assert spec.name == tool_name
        assert len(spec.description) > 0
        assert "properties" in spec.parameters
        assert tool_name in TOOL_INPUT_MODELS


def test_clarification_1_handoff_urgency_enums() -> None:
    """
    Clarification 1 test:
    handoff_urgency MUST match DB schema: 'low' | 'normal' | 'high' | 'emergency'.
    Invalid values like 'medium' or 'critical' MUST raise ValidationError.
    """
    for valid_urgency in ["low", "normal", "high", "emergency"]:
        model = RequestHumanHandoffInput(
            reason="Test handoff",
            urgency=valid_urgency,  # type: ignore[arg-type]
            channel="whatsapp",
        )
        assert model.urgency == valid_urgency

    for invalid_urgency in ["medium", "critical", "routine"]:
        with pytest.raises(ValidationError):
            RequestHumanHandoffInput(
                reason="Test handoff",
                urgency=invalid_urgency,  # type: ignore[arg-type]
                channel="whatsapp",
            )


def test_clarification_2_channel_in_triage_and_handoff() -> None:
    """
    Clarification 2 test:
    channel: 'whatsapp' | 'voice' | 'instagram' | 'facebook' | 'google'
    MUST be present as an input in triage_symptoms and request_human_handoff.
    """
    valid_channels = ["whatsapp", "voice", "instagram", "facebook", "google"]
    for ch in valid_channels:
        triage = TriageSymptomsInput(
            description="Mild sensitivity to cold",
            channel=ch,  # type: ignore[arg-type]
        )
        assert triage.channel == ch

        handoff = RequestHumanHandoffInput(
            reason="Patient request",
            urgency="normal",
            channel=ch,  # type: ignore[arg-type]
        )
        assert handoff.channel == ch

    # Invalid channel must be rejected
    with pytest.raises(ValidationError):
        TriageSymptomsInput(
            description="Pain",
            channel="telegram",  # type: ignore[arg-type]
        )

    with pytest.raises(ValidationError):
        RequestHumanHandoffInput(
            reason="Need help",
            urgency="normal",
            channel="sms",  # type: ignore[arg-type]
        )


def test_booking_request_channels_match_db() -> None:
    """Booking request channels must match DB enum: whatsapp, voice, instagram, facebook, google, staff."""
    for ch in ["whatsapp", "voice", "instagram", "facebook", "google", "staff"]:
        model = CreateBookingRequestInput(
            slot_start="2026-09-20T10:00:00Z",
            slot_end="2026-09-20T10:45:00Z",
            channel=ch,  # type: ignore[arg-type]
        )
        assert model.channel == ch

    with pytest.raises(ValidationError):
        CreateBookingRequestInput(
            slot_start="2026-09-20T10:00:00Z",
            slot_end="2026-09-20T10:45:00Z",
            channel="email",  # type: ignore[arg-type]
        )


def test_consent_types_match_db() -> None:
    """Consent types must match DB enum: data_processing, marketing, reminders."""
    for ct in ["data_processing", "marketing", "reminders"]:
        model = CreatePatientInput(
            full_name="Zahid Iqbal",
            phone="+923001234567",
            consent_type=ct,  # type: ignore[arg-type]
        )
        assert model.consent_type == ct

    with pytest.raises(ValidationError):
        CreatePatientInput(
            full_name="Zahid Iqbal",
            phone="+923001234567",
            consent_type="medical_only",  # type: ignore[arg-type]
        )


def test_symptom_classifier_rules() -> None:
    """Validate rule-based symptom classifier logic."""
    urg_emerg, _ = classify_symptoms("I have uncontrolled bleeding and cannot breathe")
    assert urg_emerg == "emergency"

    urg_high, _ = classify_symptoms("I have severe pain and facial swelling")
    assert urg_high == "high"

    urg_norm, _ = classify_symptoms("I have a dull toothache and sensitivity to hot water")
    assert urg_norm == "normal"

    urg_low, _ = classify_symptoms("I want to know about flossing techniques")
    assert urg_low == "low"
