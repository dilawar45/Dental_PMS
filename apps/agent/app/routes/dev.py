"""Developer simulation endpoints for testing without external provider connections."""

from fastapi import APIRouter, Depends
from app.models import SimulateInboundRequest, SimulateInboundResponse
from app.agent.runner import AgentRunner
from app.deps import get_agent_runner
from app.db.client import log_dev_outbox

router = APIRouter(prefix="/dev", tags=["dev"])


@router.post("/simulate-inbound", response_model=SimulateInboundResponse)
async def simulate_inbound(
    request: SimulateInboundRequest,
    runner: AgentRunner = Depends(get_agent_runner),
) -> SimulateInboundResponse:
    """
    Simulate an inbound message from any channel (WhatsApp, Voice, Web, etc.).

    Orchestrates session lookup, prompt assembly, mock LLM intent classification,
    and real tool dispatch via with_clinic. Logs messages to dev_outbox.
    """
    # 1. Log inbound message to dev_outbox
    log_dev_outbox(
        channel=request.channel,
        from_=request.from_,
        to="system",
        body=request.body,
        direction="inbound",
        provider="mock",
    )

    # 2. Process turn via AgentRunner
    reply, tool_intent, tool_intents, session_id = await runner.handle_inbound(
        channel=request.channel,
        sender=request.from_,
        body=request.body,
    )

    # 3. Log outbound reply to dev_outbox
    log_dev_outbox(
        channel=request.channel,
        from_="system",
        to=request.from_,
        body=reply,
        direction="outbound",
        provider="mock",
    )

    return SimulateInboundResponse(
        reply=reply,
        channel=request.channel,
        logged=True,
        session_id=session_id,
        tool_intent=tool_intent,
        tool_intents=tool_intents,
    )
