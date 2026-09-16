"""FastAPI dependency injection providers."""

from fastapi import Depends
from app.config import settings
from app.llm.base import LLMProvider
from app.llm.factory import get_llm_provider
from app.session.base import SessionStore
from app.session.factory import get_session_store
from app.agent.runner import AgentRunner


def get_llm() -> LLMProvider:
    """Provide configured LLM provider."""
    return get_llm_provider(settings)


def get_session_store_dep() -> SessionStore:
    """Provide configured Session store."""
    return get_session_store(settings)


def get_agent_runner(
    llm: LLMProvider = Depends(get_llm),
    session_store: SessionStore = Depends(get_session_store_dep),
) -> AgentRunner:
    """Provide initialized AgentRunner."""
    return AgentRunner(llm=llm, session_store=session_store)
