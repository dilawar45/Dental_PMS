"""Voice telephony webhook endpoint stub."""

from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/voice", tags=["webhooks"])


@router.post("")
async def voice_webhook() -> dict[str, str]:
    """Receive inbound telephony webhooks (stub for production phase)."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Voice webhook handler is not implemented in Phase 4A. Use /dev/simulate-inbound.",
    )
