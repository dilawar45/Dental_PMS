"""Social media (Instagram/Facebook/Google) webhook endpoint stub."""

from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/social", tags=["webhooks"])


@router.post("")
async def social_webhook() -> dict[str, str]:
    """Receive inbound social channel webhooks (stub for production phase)."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Social webhook handler is not implemented in Phase 4A. Use /dev/simulate-inbound.",
    )
