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

# Build serverless output
pnpm --filter @dental-pms/agent build

# Test
pnpm --filter @dental-pms/agent test
```

## Deploy to Vercel

The agent is deployed to Vercel as a **separate project** from the web app, pointing to the same GitHub repository.

### Step-by-Step Deployment:
1. `vercel link` or in the Vercel dashboard, click **Add New... -> Project** and select this GitHub repository.
2. In Project Settings, set **Root Directory** to `apps/agent`.
3. Set the build and output settings (automatically configured via `apps/agent/vercel.json`).
4. Configure the following Environment Variables in the Vercel agent project:
   - `DATABASE_URL` (Direct Supabase connection string)
   - `LLM_PROVIDER=mock`
   - `SESSION_STORE=memory` (upgrade to redis later)
   - `DEFAULT_CLINIC_ID=<seed clinic id>`
   - `WHATSAPP_PROVIDER=mock`
   - `VOICE_PROVIDER=mock`
   - `SOCIAL_PROVIDER=mock`
   - `META_WHATSAPP_VERIFY_TOKEN=<value>`
   - `META_APP_SECRET=<value>`
   - `SIMULATOR_SHARED_SECRET=<shared-secret-matching-web-env>`
5. Click **Deploy**.

> **Note**: All credentials remain in mock mode. No real third-party API keys required.

## Smoke Test Verification

After deployment, verify the agent health endpoint:
```bash
curl https://<agent-url>.vercel.app/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "dental-agent",
  "llm_provider": "mock",
  "session_store": "memory"
}
```

