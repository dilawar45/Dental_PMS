"""WhatsApp webhook endpoint stub."""

from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/whatsapp", tags=["webhooks"])


@router.post("")
async def whatsapp_webhook() -> dict[str, str]:
    """Receive inbound Meta WhatsApp webhooks (stub for production phase)."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="WhatsApp webhook handler is not implemented in Phase 4A. Use /dev/simulate-inbound.",
    )
