"""Tool contract and implementation: triage_symptoms."""

from typing import Any, Literal
from pydantic import BaseModel, Field
from app.llm.base import ToolSpec

TOOL_NAME = "triage_symptoms"
TOOL_DESCRIPTION = "Evaluate dental symptom severity and determine clinical escalation urgency without diagnosis."

HandoffUrgency = Literal["low", "normal", "high", "emergency"]
ConversationChannel = Literal["whatsapp", "voice", "instagram", "facebook", "google"]


class TriageSymptomsInput(BaseModel):
    """Input parameters for triage_symptoms tool."""

    description: str = Field(..., description="Patient description of dental symptoms, pain, or trauma")
    channel: ConversationChannel = Field(
        ...,
        description="Communication channel (matches DB conversation_channel enum: whatsapp, voice, instagram, facebook, google)",
    )


class TriageSymptomsOutput(BaseModel):
    """Output results for triage_symptoms tool."""

    urgency: HandoffUrgency
    channel: ConversationChannel
    requires_human_handoff: bool
    recommendation: str


TOOL_SPEC = ToolSpec(
    name=TOOL_NAME,
    description=TOOL_DESCRIPTION,
    parameters=TriageSymptomsInput.model_json_schema(),
)


def classify_symptoms(description: str) -> tuple[HandoffUrgency, str]:
    """Classify dental symptoms based on clinical urgency criteria."""
    text = description.lower()

    # Emergency criteria
    is_emergency = (
        ("bleeding" in text and "uncontrolled" in text)
        or ("can't breathe" in text or "cant breathe" in text or "breathing" in text)
        or "swallowing" in text
        or "knocked out" in text
        or "avulsion" in text
        or "trauma" in text
        or ("facial swelling" in text and "fever" in text)
        or ("swelling" in text and "fever" in text)
    )
    if is_emergency:
        return (
            "emergency",
            "Immediate emergency dental or hospital evaluation is strongly recommended. "
            "If breathing or swallowing is impaired, please proceed immediately to the nearest hospital ER.",
        )

    # High urgency criteria
    is_high = (
        "severe pain" in text
        or "unbearable" in text
        or "swelling" in text
        or "broken tooth" in text
        or "abscess" in text
        or ("child" in text and "pain" in text)
    )
    if is_high:
        return (
            "high",
            "Urgent dental evaluation recommended within 24 hours. "
            "Our clinic staff is being alerted to arrange an expedited slot.",
        )

    # Normal urgency criteria
    is_normal = (
        "toothache" in text
        or "sensitive" in text
        or "sensitivity" in text
        or "mild pain" in text
        or "ache" in text
        or "discomfort" in text
    )
    if is_normal:
        return (
            "normal",
            "Routine dental examination recommended. "
            "We can schedule you for a comprehensive clinical assessment.",
        )

    # Low urgency / general inquiries
    return (
        "low",
        "Preventative dental care recommended. Maintain good oral hygiene and schedule a routine checkup.",
    )


async def execute(input_data: TriageSymptomsInput, context: dict[str, Any]) -> TriageSymptomsOutput:
    """Execute symptom triage classification without external LLM calls."""
    urgency, recommendation = classify_symptoms(input_data.description)
    requires_human_handoff = urgency in ("high", "emergency")

    return TriageSymptomsOutput(
        urgency=urgency,
        channel=input_data.channel,
        requires_human_handoff=requires_human_handoff,
        recommendation=recommendation,
    )
