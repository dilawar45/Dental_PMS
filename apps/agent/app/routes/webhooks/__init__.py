"""Webhooks router aggregating all external channel endpoints."""

from fastapi import APIRouter
from app.routes.webhooks.whatsapp import router as whatsapp_router
from app.routes.webhooks.voice import router as voice_router
from app.routes.webhooks.social import router as social_router

router = APIRouter(prefix="/webhooks")
router.include_router(whatsapp_router)
router.include_router(voice_router)
router.include_router(social_router)

__all__ = ["router"]
