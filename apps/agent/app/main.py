"""Dental PMS Agent Service — FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.health import router as health_router
from app.routes.dev import router as dev_router
from app.routes.webhooks import router as webhooks_router

app = FastAPI(
    title="Dental PMS Agent",
    description="AI receptionist agent service for the Dental PMS (Phase 4A)",
    version="0.1.0",
)

# CORS — allow all origins in dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount application routers
app.include_router(health_router)
app.include_router(dev_router)
app.include_router(webhooks_router)
