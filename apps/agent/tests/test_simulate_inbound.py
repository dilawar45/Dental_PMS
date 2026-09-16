"""Tests for inbound simulation and intent classification."""

from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@patch("app.routes.dev.log_dev_outbox")
def test_intent_check_availability(mock_log: object) -> None:
    """Test intent detection: appointment booking -> check_availability."""
    response = client.post(
        "/dev/simulate-inbound",
        json={
            "channel": "whatsapp",
            "from": "+923001234501",
            "body": "I want to book an appointment",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["channel"] == "whatsapp"
    assert data["logged"] is True
    assert data["tool_intent"] == "check_availability"
    assert "availability" in data["reply"].lower()
    assert data["session_id"] == "whatsapp:+923001234501"


@patch("app.routes.dev.log_dev_outbox")
def test_intent_triage_symptoms(mock_log: object) -> None:
    """Test intent detection: severe pain -> triage_symptoms."""
    response = client.post(
        "/dev/simulate-inbound",
        json={
            "channel": "whatsapp",
            "from": "+923001234502",
            "body": "I'm having severe pain",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["channel"] == "whatsapp"
    assert data["logged"] is True
    assert "triage_symptoms" in data["tool_intents"]
    assert "urgent" in data["reply"].lower() or "evaluat" in data["reply"].lower() or "escalat" in data["reply"].lower()


@patch("app.routes.dev.log_dev_outbox")
def test_intent_get_clinic_info(mock_log: object) -> None:
    """Test intent detection: hours/location -> get_clinic_info."""
    response = client.post(
        "/dev/simulate-inbound",
        json={
            "channel": "whatsapp",
            "from": "+923001234503",
            "body": "What are your hours?",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["channel"] == "whatsapp"
    assert data["logged"] is True
    assert data["tool_intent"] == "get_clinic_info"
    assert "bright smile" in data["reply"].lower()


@patch("app.routes.dev.log_dev_outbox")
def test_intent_null_greeting(mock_log: object) -> None:
    """Test general greeting produces no tool intent (null)."""
    response = client.post(
        "/dev/simulate-inbound",
        json={
            "channel": "whatsapp",
            "from": "+923001234504",
            "body": "Hello",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["channel"] == "whatsapp"
    assert data["logged"] is True
    assert data["tool_intent"] is None
    assert "receptionist" in data["reply"].lower()


@patch("app.routes.dev.log_dev_outbox")
def test_intent_human_handoff(mock_log: object) -> None:
    """Test human handoff escalation intent."""
    response = client.post(
        "/dev/simulate-inbound",
        json={
            "channel": "whatsapp",
            "from": "+923001234505",
            "body": "Can I please speak to a human receptionist?",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["tool_intent"] == "request_human_handoff"


@patch("app.routes.dev.log_dev_outbox")
def test_intent_send_receipt(mock_log: object) -> None:
    """Test receipt dispatch intent."""
    response = client.post(
        "/dev/simulate-inbound",
        json={
            "channel": "whatsapp",
            "from": "+923001234506",
            "body": "Please send my latest invoice receipt",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["tool_intent"] == "send_receipt"
    assert "send_receipt" in data["tool_intents"]


def test_simulate_inbound_validation_error() -> None:
    """Missing mandatory fields returns 422 Unprocessable Entity."""
    response = client.post("/dev/simulate-inbound", json={"channel": "whatsapp"})
    assert response.status_code == 422


def test_webhooks_return_501() -> None:
    """External webhook endpoints return 501 Not Implemented in Phase 4A."""
    for path in ["/webhooks/whatsapp", "/webhooks/voice", "/webhooks/social"]:
        res = client.post(path)
        assert res.status_code == 501
