"""End-to-end agent flow tests via /dev/simulate-inbound."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_agent_flow_booking_intent():
    """Test 'I want to book an appointment' -> check_availability -> response mentions availability."""
    response = client.post(
        "/dev/simulate-inbound",
        json={
            "channel": "whatsapp",
            "from": "+923001234567",
            "body": "I want to book an appointment",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["channel"] == "whatsapp"
    assert data["tool_intent"] == "check_availability"
    assert "check_availability" in data["tool_intents"]
    assert "availability" in data["reply"].lower() or "slot" in data["reply"].lower()


def test_agent_flow_severe_pain_escalation():
    """Test 'I'm having severe pain' -> triage_symptoms + request_human_handoff -> mentions escalation."""
    response = client.post(
        "/dev/simulate-inbound",
        json={
            "channel": "whatsapp",
            "from": "+923007654321",
            "body": "I'm having severe pain and swelling",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["channel"] == "whatsapp"
    assert "triage_symptoms" in data["tool_intents"]
    assert "request_human_handoff" in data["tool_intents"]
    # Check that reply mentions escalation or emergency staff
    reply_lower = data["reply"].lower()
    assert "alert" in reply_lower or "escalat" in reply_lower or "emergency" in reply_lower or "assist" in reply_lower


def test_agent_flow_clinic_hours():
    """Test 'What are your hours?' -> get_clinic_info -> response contains clinic hours."""
    response = client.post(
        "/dev/simulate-inbound",
        json={
            "channel": "whatsapp",
            "from": "+923005554433",
            "body": "What are your hours?",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["tool_intent"] == "get_clinic_info"
    assert "hours" in data["reply"].lower() or "monday" in data["reply"].lower() or "9:00" in data["reply"].lower()


def test_agent_flow_no_tool_greeting():
    """Test message triggering no tool -> graceful assistant greeting."""
    response = client.post(
        "/dev/simulate-inbound",
        json={
            "channel": "whatsapp",
            "from": "+923001112233",
            "body": "Hello, good morning!",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["tool_intent"] is None
    assert data["tool_intents"] == []
    assert "receptionist" in data["reply"].lower() or "bright smile" in data["reply"].lower()
