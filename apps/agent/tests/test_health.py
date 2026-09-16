"""Tests for health endpoint."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check() -> None:
    """GET /health returns 200 with service and provider metadata."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "dental-pms-agent"
    assert data["llm_provider"] == "mock"
    assert data["session_store"] in ["memory", "redis"]
    assert "whatsapp" in data["providers"]
