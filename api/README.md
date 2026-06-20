# OnCallr API

The `api/` app is the Fastify backend for OnCallr. It owns authentication, PostgreSQL persistence, schedule resolution, escalation timers, real-time socket delivery, and AI postmortem generation.

## Responsibilities

- Issue and validate auth cookies
- Expose REST endpoints for auth, incidents, services, schedules, analytics, postmortems, and escalation policies
- Accept incoming incident webhook calls
- Resolve on-call assignees from schedules
- Queue escalation checks in Redis with BullMQ
- Deliver live incident events over Socket.io
- Send email fallback notifications when a user is offline
- Generate structured postmortem drafts through OpenAI

## Main folders

```text
api/
|-- prisma/         Schema, migrations, seed script
|-- src/
|   |-- config/     Env parsing and validation
|   |-- jobs/       BullMQ queue and worker logic
|   |-- plugins/    Fastify plugins for auth, Prisma, Redis, sockets
|   |-- routes/     API route modules
|   |-- services/   Business logic helpers
|   `-- types/      Shared backend types and Fastify module augmentation
`-- package.json
```

## Environment

Start from `.env.example`.

Required values:

- `WEB_ORIGIN`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`

Optional but recommended:

- `OPENAI_API_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM_EMAIL`

### Supabase note

If your Postgres password contains `@`, encode it as `%40` in `DATABASE_URL`.

Example:

```text
postgresql://postgres:Pathirana%4012345@db.example.supabase.co:5432/postgres
```

## Commands

```powershell
npm run dev
npm run build
npm run lint
npm run prisma:migrate
npm run prisma:seed
```

## Seed data

The seed script creates:

- one admin user
- one engineer user
- one schedule with two members
- one current on-call shift
- one `Payment API` service
- one escalation policy attached to that service

After seeding, the script prints the webhook token for the seeded service.

## Route summary

### Auth

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Users

- `GET /api/users`

### Services

- `GET /api/services`
- `POST /api/services`
- `GET /api/services/:serviceId`
- `POST /api/services/:serviceId/regenerate-webhook-token`
- `POST /api/services/:serviceId/trigger-incident`

### Schedules

- `GET /api/schedules`
- `POST /api/schedules`
- `GET /api/schedules/:scheduleId`
- `POST /api/schedules/:scheduleId/regenerate`
- `PATCH /api/schedules/:scheduleId/shifts/:shiftId`
- `POST /api/schedules/:scheduleId/shifts/swap`

### Escalation policies

- `GET /api/escalation-policies`
- `POST /api/escalation-policies`
- `PATCH /api/escalation-policies/:policyId`

### Incidents

- `GET /api/incidents`
- `GET /api/incidents/:incidentId`
- `POST /api/incidents/:incidentId/acknowledge`
- `POST /api/incidents/:incidentId/comment`
- `POST /api/incidents/:incidentId/resolve`
- `POST /api/incidents/:incidentId/escalate`

### Postmortems

- `GET /api/postmortems`
- `GET /api/postmortems/:incidentId`
- `POST /api/postmortems/:incidentId/draft`
- `PUT /api/postmortems/:incidentId`

### Analytics

- `GET /api/analytics/overview`

### Webhooks

- `POST /api/webhooks/incidents/:webhookToken`

## Local run checklist

1. Start Redis
2. Fill `api/.env`
3. Run migrations
4. Seed demo data
5. Start `npm run dev`
6. Open the frontend and sign in

## Webhook test

```bash
curl -X POST http://localhost:5000/api/webhooks/incidents/<webhook-token> \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Checkout latency spike\",\"description\":\"p95 latency doubled after deploy\",\"severity\":\"HIGH\"}"
```

## Production notes

- Set `NODE_ENV=production`
- Use a strong `JWT_SECRET`
- Point `WEB_ORIGIN` at your deployed frontend URL
- Keep Redis enabled or escalation timers will not run
- Add `OPENAI_API_KEY` if you want AI drafts
- Add SMTP credentials if you want email fallback notifications
