# @dental-pms/agent

Clinical AI Receptionist Agent Service built with TypeScript and Hono.

## Architecture

- **HTTP Framework**: [Hono](https://hono.dev) with `@hono/node-server`
- **Orchestrator**: `AgentRunner` managing turn state, multi-turn sliding window, and tool dispatch
- **LLM Abstraction**: Swappable LLM adapters (`mock`, `claude`, `gemini`) via `LLMProvider`
- **Session Management**: Pluggable storage (`memory`, `redis` via `ioredis`)
- **Clinical Tools**: 8 validated tools contracts aligning with the PostgreSQL tenant schema:
  - `lookup_patient`
  - `create_patient`
  - `get_clinic_info`
  - `check_availability`
  - `create_booking_request`
  - `triage_symptoms`
  - `request_human_handoff`
  - `send_receipt`

## Environment Variables

- `AGENT_PORT` (default: `8000`)
- `LLM_PROVIDER` (`mock` | `claude` | `gemini`, default: `mock`)
- `SESSION_STORE` (`memory` | `redis`, default: `memory`)
- `REDIS_URL` (default: `redis://localhost:6379`)
- `DEFAULT_CLINIC_ID` (UUID of active clinic)

## Development

```bash
# Run agent in development mode
pnpm --filter @dental-pms/agent dev

# Typecheck
pnpm --filter @dental-pms/agent typecheck
```
