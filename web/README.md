# OnCallr

OnCallr is a real-time incident response and on-call management platform built as a portfolio-grade full-stack system. It helps a small engineering team receive incidents, route them to the current on-call responder, escalate automatically when nobody acknowledges, track the full timeline, and write structured postmortems after resolution.

This repository currently contains:

- `web/` - Next.js frontend
- `api/` - Fastify backend
- `features.md` - detailed feature and integration reference

## Overview

OnCallr is designed around a simple operational flow:

1. An incident is created by webhook or manually from the dashboard.
2. The backend resolves the correct on-call target from a service escalation policy.
3. The assigned responder receives a live Socket.io notification.
4. If the incident is not acknowledged in time, BullMQ advances to the next escalation step.
5. Engineers can acknowledge, comment on, and resolve the incident.
6. Resolved incidents can be turned into editable postmortems.
7. Admins can review analytics, schedules, services, and escalations from the dashboard.

## What The Project Demonstrates

- Real-time frontend updates with Socket.io
- Time-based background jobs with Redis and BullMQ
- Incident lifecycle and audit-timeline design
- Role-based access control for engineer/admin workflows
- On-call schedule generation and rotation editing
- Postmortem drafting and structured operational writeups
- Full-stack TypeScript across frontend and backend

## Current Feature Set

### Authentication

- Cookie-based JWT authentication
- Engineer and admin roles
- Protected dashboard routes

### Incidents

- Create incidents from:
  - service webhook URLs
  - manual admin dashboard trigger
- Incident states:
  - `TRIGGERED`
  - `ACKNOWLEDGED`
  - `RESOLVED`
- Timeline entries for:
  - created
  - notified
  - escalated
  - acknowledged
  - commented
  - resolved
- Incident detail view with comment, acknowledge, resolve, and admin force-escalate actions

### Escalation Engine

- Service-level escalation policies
- Escalation steps that target either:
  - a user
  - a schedule
- BullMQ delayed jobs for escalation timeouts
- Real-time reassignment updates
- Optional email fallback when the target user has no active socket connection

### Services

- Admin service creation
- Unique webhook token per service
- Manual incident trigger from the dashboard
- Service detail page with recent incidents and webhook info

### Schedules

- Schedule creation with member order
- Configurable rotation length in days
- Automatic shift generation
- Schedule detail page with:
  - current on-call coverage
  - rotation members
  - future shifts
- Admin schedule editing with regeneration of future shifts

### Postmortems

- Resolved incident list
- Draft generation from incident timeline data
- Editable postmortem fields
- Saved postmortem workflow

### Analytics

- Admin analytics dashboard
- MTTA / MTTR style summaries
- Incident volume and service-oriented metrics

## Tech Stack

### Frontend

- Next.js 16
- React 19
- Tailwind CSS 4
- shadcn/ui
- TanStack Query
- Socket.io Client
- Recharts

### Backend

- Fastify
- Prisma
- PostgreSQL
- Redis
- BullMQ
- Socket.io
- Nodemailer

## Architecture

```text
External system / dashboard action
    -> Fastify API
    -> PostgreSQL stores incidents, services, schedules, events
    -> Escalation engine resolves assignee
    -> Socket.io sends live updates
    -> BullMQ schedules next escalation timeout
    -> Optional email fallback if no active socket exists
    -> Next.js dashboard reflects updates in real time
```

## Repository Structure

```text
Oncallr/
├── api/
│   ├── prisma/
│   ├── src/
│   │   ├── config/
│   │   ├── jobs/
│   │   ├── plugins/
│   │   ├── routes/
│   │   ├── services/
│   │   └── types/
│   └── package.json
├── web/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── providers/
│   │   ├── services/
│   │   └── types/
│   └── package.json
└── features.md
```

## Local Development

### Prerequisites

- Node.js
- Docker Desktop
- PostgreSQL database
- Redis

### Backend Environment

Create `api/.env` with values similar to:

```env
NODE_ENV=development
HOST=0.0.0.0
PORT=5000
WEB_ORIGIN=http://localhost:3000,http://localhost:3001
DATABASE_URL=postgresql://...
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=replace-this-with-a-long-random-secret
JWT_EXPIRES_IN=7d
AUTH_COOKIE_NAME=oncallr_token
DATABASE_SSL_REJECT_UNAUTHORIZED=false

# Optional email fallback
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=OnCallr
```

### Frontend Environment

Create `web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### Install Dependencies

```bash
cd api
npm install

cd ../web
npm install
```

### Run Redis

```bash
docker run -d --name oncallr-redis -p 6379:6379 redis:7
```

If the container already exists:

```bash
docker start oncallr-redis
```

### Run Prisma

```bash
cd api
npx prisma migrate dev
npm run prisma:seed
```

### Start The Apps

Backend:

```bash
cd api
npm run dev
```

Frontend:

```bash
cd web
npm run dev
```

Frontend URL:

- `http://localhost:3000`

Backend URL:

- `http://localhost:5000`

## Seeded Demo Accounts

After running the seed script:

- Admin: `admin@oncallr.dev` / `password123`
- Engineer: `engineer@oncallr.dev` / `password123`

## Example Demo Flows

### Trigger An Incident By Webhook

```bash
curl -X POST http://localhost:5000/api/webhooks/incidents/<webhook-token> \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Payment API returning 500s\",\"description\":\"Error rate spiked\",\"severity\":\"CRITICAL\"}"
```

### Trigger An Incident From The UI

1. Sign in as admin
2. Open `Services`
3. Use the `Trigger incident` panel
4. Watch dashboard and incident views update live

### Test Escalation

1. Create a triggered incident
2. Do not acknowledge it
3. Wait for the policy timeout, or use the admin `Escalate now` action
4. Confirm assignee changes and timeline events

## Project Status

This is a working implementation, not just a design doc. The current version already supports real end-to-end flows across:

- login
- service creation
- schedule creation and editing
- escalation policy management
- webhook and manual incident creation
- real-time incident assignment
- incident acknowledgment, comments, and resolution
- postmortem editing
- analytics

The product also now includes:

- shift override and swap management for future schedule coverage
- service-filtered analytics with severity breakdowns
- webhook token rotation from the dashboard
- OpenAI-backed postmortem draft generation
- email fallback notifications when no active socket connection exists

## Related Docs

- [features.md](../features.md)

## Why This Project Matters

OnCallr is meant to show practical backend and frontend engineering around a real operational domain. It is not just CRUD. It combines:

- state transitions
- durable background work
- live UI synchronization
- scheduling logic
- role-aware product design
- operational documentation workflows

That makes it a strong systems-focused portfolio project for incident management, reliability tooling, and internal platform engineering.
