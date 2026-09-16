"""Pydantic settings — loads all env vars with validation."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file="../../.env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database & Cache
    database_url: str = "postgresql://dental:dental@localhost:5432/dental_pms"
    redis_url: str = "redis://localhost:6379"
    default_clinic_id: str = "b398700a-f746-4a45-afc0-b1020cda02a8"

    # Agent & LLM
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    agent_service_url: str = "http://localhost:8000"
    llm_provider: str = "mock"  # mock | claude | gemini
    session_store: str = "memory"  # memory | redis
    system_prompt_path: str = "prompts/system.md"

    # Provider selection
    whatsapp_provider: str = "mock"
    voice_provider: str = "mock"
    social_provider: str = "mock"
    storage_provider: str = "mock"
    pdf_provider: str = "mock"
    ai_provider: str = "mock"


settings = Settings()
