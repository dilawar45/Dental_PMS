"""System prompt loader and caching mechanism."""

from pathlib import Path
from app.config import settings

_cached_system_prompt: str | None = None


def get_system_prompt() -> str:
    """Read and cache the system prompt from markdown file."""
    global _cached_system_prompt
    if _cached_system_prompt is not None:
        return _cached_system_prompt

    prompt_path = Path(settings.system_prompt_path)
    if not prompt_path.is_absolute():
        # Resolve relative to project root / app root
        app_dir = Path(__file__).resolve().parent.parent.parent
        resolved = app_dir / prompt_path
        if not resolved.exists():
            # Fallback to current working dir
            resolved = Path(settings.system_prompt_path).resolve()
        prompt_path = resolved

    if prompt_path.exists():
        _cached_system_prompt = prompt_path.read_text(encoding="utf-8").strip()
    else:
        _cached_system_prompt = (
            "You are the AI Receptionist at Bright Smile Dental. "
            "Assist patients professionally, triage dental emergencies, "
            "and never diagnose or prescribe medication."
        )

    return _cached_system_prompt
