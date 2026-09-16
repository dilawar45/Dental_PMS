"""Health check route."""

from fastapi import APIRouter
from app.config import settings
from app.models import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Health check endpoint returning service and active provider statuses."""
    return HealthResponse(
        status="ok",
        service="dental-pms-agent",
        llm_provider=settings.llm_provider,
        session_store=settings.session_store,
        providers={
            "whatsapp": settings.whatsapp_provider,
            "voice": settings.voice_provider,
            "social": settings.social_provider,
            "storage": settings.storage_provider,
            "pdf": settings.pdf_provider,
            "ai": settings.ai_provider,
        },
    )
