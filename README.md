# OnCallr

OnCallr is a full-stack incident response and on-call management platform for a single engineering team. It combines live incident delivery, schedule-aware assignment, automatic escalation, incident timelines, analytics, and AI-assisted postmortems in one product.

## What it does

- Accepts incidents from per-service webhook URLs
- Lets admins trigger incidents manually from the dashboard
- Resolves the current on-call responder from schedule-backed escalation policies
- Pushes live notifications over Socket.io
- Escalates automatically with BullMQ if nobody acknowledges in time
- Tracks the full incident timeline with comments, acknowledgements, and resolutions
- Generates editable AI postmortem drafts for resolved incidents
- Gives admins analytics for MTTA, MTTR, service volume, severity mix, and on-call load

## Repo layout

```text
Oncallr/
|-- api/           Fastify API, Prisma schema, BullMQ jobs, Socket.io server
|-- web/           Next.js dashboard application
|-- docs/          Deployment and demo guides
|-- features.md    Product feature and integration reference
`-- README.md
```

## Tech stack

### Frontend

- Next.js 16
- React 19
- Tailwind CSS 4
- shadcn/ui
- TanStack Query
- Recharts
- Socket.io client

### Backend

- Fastify
- Prisma
- PostgreSQL
- Redis
- BullMQ
- Socket.io
- OpenAI Responses API
- Nodemailer

## Product areas

### Auth and roles

- Cookie-based JWT auth
- Engineer and admin permissions
- Protected dashboard routes

### Services and webhooks

- Admin-managed services
- Unique webhook token per service
- Webhook token rotation
- Manual incident trigger from the dashboard

### Escalation and scheduling

- Escalation policies with ordered user or schedule steps
- Schedule creation with rotation members
- Auto-generated future shifts
- Shift overrides and shift swaps
- Escalation reassigns incidents when timeout windows expire

### Incidents

- Triggered, acknowledged, and resolved statuses
- Real-time toast and dashboard updates
- Full event timeline
- Comments, acknowledge, resolve, and admin force-escalate actions
- Engineer-focused "My Incidents" queue

### Postmortems

- Resolved incident list
- OpenAI-powered draft generation
- Editable structured postmortem content
- Saved postmortem records per incident

### Analytics

- MTTA and MTTR
- Incident totals by status
- Volume by service
- Incidents over time
- Severity breakdown
- Busiest on-call coverage
- Date-range and service filtering

## Local setup

### Prerequisites

- Node.js 20+ or newer
- Docker Desktop
- PostgreSQL database
- Redis

### 1. Install dependencies

```powershell
cd api
npm install

cd ..\web
npm install
```

### 2. Configure environment files

Copy the example files and fill in your real values:

```powershell
Copy-Item api\.env.example api\.env
Copy-Item web\.env.example web\.env.local
```

Important notes:

- If your database password contains `@`, encode it as `%40` inside `DATABASE_URL`
- Supabase Postgres usually needs SSL enabled
- Only `NEXT_PUBLIC_*` values belong in `web/.env.local`

### 3. Start Redis

```powershell
docker run -d --name oncallr-redis -p 6379:6379 redis:7
```

If the container already exists:

```powershell
docker start oncallr-redis
```

### 4. Run Prisma and seed demo data

```powershell
cd api
npm run prisma:migrate
npm run prisma:seed
```

Seeded accounts:

- Admin: `admin@oncallr.dev` / `password123`
- Engineer: `engineer@oncallr.dev` / `password123`

### 5. Start the apps

Backend:

```powershell
cd api
npm run dev
```

Frontend:

```powershell
cd web
npm run dev
```

Open:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

## Demo flow

### Basic product demo

1. Sign in as `admin@oncallr.dev`
2. Open `Services` and confirm the seeded `Payment API`
3. Open `Schedules` and confirm the primary rotation
4. Trigger an incident from the service detail page or by webhook
5. Sign in as `engineer@oncallr.dev`
6. Watch the live incident notification arrive
7. Acknowledge, comment on, and resolve the incident
8. Open `Postmortems` and generate a draft for the resolved incident
9. Open `Analytics` as admin and review the updated metrics

### Webhook example

```bash
curl -X POST http://localhost:5000/api/webhooks/incidents/<webhook-token> \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Payment API returning 500s\",\"description\":\"Error rate spiked over the last 5 minutes\",\"severity\":\"CRITICAL\"}"
```

## Quality checks

Backend:

```powershell
cd api
npm run lint
npm run build
```

Frontend:

```powershell
cd web
npm run lint
npm run build
```

## Deployment notes

- Frontend is suited for Vercel
- Backend is suited for Railway, Render, or Fly.io
- PostgreSQL can run on Supabase or Railway Postgres
- Redis can run on Upstash or Railway Redis
- Set the backend `WEB_ORIGIN` to your deployed frontend URL
- Set the frontend `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` to your deployed API URL
- Configure SMTP and `OPENAI_API_KEY` in backend environment if you want email fallback and AI drafts outside local dev

More detail is in [docs/deployment-guide.md](docs/deployment-guide.md).

## Extra docs

- [features.md](features.md)
- [api/README.md](api/README.md)
- [web/README.md](web/README.md)
- [docs/deployment-guide.md](docs/deployment-guide.md)
