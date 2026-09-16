# 🦷 Dental PMS

Multi-clinic dental practice management system with an embedded AI receptionist.

## Architecture

```
dental-pms/
├── apps/
│   ├── web/            → Next.js 15 (App Router, TypeScript, Tailwind, shadcn/ui)
│   ├── agent/          → FastAPI + Claude Agent SDK (Python 3.11+)
│   └── workers/        → Inngest job definitions (Hono server)
├── packages/
│   ├── db/             → Drizzle ORM schema + migrations (PostgreSQL)
│   ├── types/          → Shared TypeScript types
│   ├── ui/             → shadcn/ui component library
│   └── integrations/   → Provider abstraction layer
│       ├── whatsapp/       Mock ↔ Meta
│       ├── voice/          Mock ↔ Telephony
│       ├── social/         Mock ↔ IG/FB/Google
│       ├── storage/        Mock ↔ Supabase/S3
│       ├── pdf/            Mock ↔ PDF library
│       └── ai/             Mock ↔ Claude/OpenAI
└── tooling/
    └── docker-compose.yml  → PostgreSQL 16 + Redis 7
```

## Prerequisites

- **Node.js** ≥ 22
- **pnpm** (enabled via corepack: `corepack enable pnpm`)
- **Python** ≥ 3.11
- **Docker** + Docker Compose

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url> dental-pms
cd dental-pms
cp .env.example .env
pnpm install
```

### 2. Start Docker services

```bash
pnpm docker:up
# Starts PostgreSQL (5432) + Redis (6379)
```

### 3. Run database migrations and seed

```bash
pnpm db:generate   # Generate Drizzle migration files
pnpm db:migrate    # Apply migrations to PostgreSQL
pnpm db:seed       # Insert demo clinic + staff users + sample data
```

#### Dev Staff Credentials (Development Only)

All seeded staff accounts share the default development password: **`DevPassword123!`**

| Name | Role | Email | Permissions |
| :--- | :--- | :--- | :--- |
| **Dr. Tariq Mahmood** | `owner` | `dr.tariq@brightsmile.pk` | Full clinic & user administration, bookings, invoices |
| **Dr. Ayesha Khan** | `dentist` | `dr.ayesha@brightsmile.pk` | Patients, clinical charts, scheduled appointments |
| **Sana Ali** | `receptionist` | `sana.reception@brightsmile.pk` | Booking queue, appointments, patient check-in, invoices |
| **Bilal Ahmed** | `assistant` | `assistant@brightsmile.com` | Patient records, appointment viewing |

### 4. Start the web app

```bash
cd apps/web
pnpm dev
# → http://localhost:3000
```

### 5. Start the agent service

```bash
cd apps/agent
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# → http://localhost:8000/docs
```

### 6. Test the dev simulator

```bash
curl -X POST http://localhost:8000/dev/simulate-inbound \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "whatsapp",
    "from": "+1234567890",
    "body": "I need to book a dental cleaning"
  }'
```

**Expected response:**

```json
{
  "reply": "[Dev Agent] Received your message on whatsapp: \"I need to book a dental cleaning\". This is a simulated response. Connect a real AI provider to get intelligent replies.",
  "channel": "whatsapp",
  "logged": true
}
```

## Provider Abstraction

Every external integration is behind a provider interface with two implementations:

| Provider | Env Var | Mock (dev) | Real (production) |
|----------|---------|------------|--------------------|
| WhatsApp | `WHATSAPP_PROVIDER` | Logs to `dev_outbox` | Meta API (stub) |
| Voice | `VOICE_PROVIDER` | Logs to `dev_outbox` | Telephony API (stub) |
| Social | `SOCIAL_PROVIDER` | Logs + canned data | IG/FB/Google API (stub) |
| Storage | `STORAGE_PROVIDER` | Logs to `dev_outbox` | Supabase/S3 (stub) |
| PDF | `PDF_PROVIDER` | Placeholder buffer | PDF library (stub) |
| AI | `AI_PROVIDER` | Echo response | Claude/OpenAI (stub) |

**Switch providers by changing one env var:**

```bash
# In .env
WHATSAPP_PROVIDER=mock   # ← default, no network calls
WHATSAPP_PROVIDER=real   # ← throws "not configured" until credentials are set
```

**Hard rule:** In `mock` mode, **zero** external network calls are made. Everything is logged to the `dev_outbox` table.

## Environment Variables

See [`.env.example`](.env.example) for the full list with comments.

## CI Pipeline

GitHub Actions runs on every push/PR to `main`:

1. **TypeScript** — `pnpm turbo typecheck` + `pnpm turbo lint`
2. **Python** — `pytest` + `mypy`

## Scripts Reference

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start all dev servers (Turborepo) |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | TypeScript strict check across all packages |
| `pnpm lint` | Lint all packages |
| `pnpm docker:up` | Start Postgres + Redis via Docker Compose |
| `pnpm docker:down` | Stop Docker services |
| `pnpm db:generate` | Generate Drizzle migration files |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Seed demo data |

## License

Private — All rights reserved.
