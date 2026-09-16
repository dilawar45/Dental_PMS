"""Pydantic models for request/response payloads."""

from pydantic import BaseModel, Field


class SimulateInboundRequest(BaseModel):
    """Request body for POST /dev/simulate-inbound."""

    channel: str = Field(
        ...,
        description="Communication channel (whatsapp, voice, sms, web, etc.)",
        examples=["whatsapp"],
    )
    from_: str = Field(
        ...,
        alias="from",
        description="Sender identifier (phone number, user ID, etc.)",
        examples=["+1234567890"],
    )
    body: str = Field(
        ...,
        description="Message body",
        examples=["I'd like to book a dental cleaning appointment"],
    )


class SimulateInboundResponse(BaseModel):
    """Response body for POST /dev/simulate-inbound."""

    reply: str = Field(..., description="Agent's reply text")
    channel: str = Field(..., description="Channel the message was received on")
    logged: bool = Field(True, description="Whether the message was logged to dev_outbox")
    session_id: str | None = Field(None, description="Active conversation session ID")
    tool_intent: str | None = Field(None, description="Primary classified tool intent or None")
    tool_intents: list[str] = Field(
        default_factory=list,
        description="All executed tool intents during the turn",
    )


class HealthResponse(BaseModel):
    """Response body for GET /health."""

    status: str = "ok"
    service: str = "dental-pms-agent"
    llm_provider: str = "mock"
    session_store: str = "memory"
    providers: dict[str, str] = Field(
        default_factory=dict,
        description="Active provider modes",
    )
