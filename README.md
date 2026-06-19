# OnCallr — Real-Time Incident & On-Call Management Platform

## 1. Project Summary

OnCallr is a single-team incident response and on-call management platform for engineering teams. It detects or receives incidents, instantly notifies the engineer currently on call in real time, automatically escalates if no one responds, tracks the full incident timeline, and generates an AI-drafted postmortem once the incident is resolved.

It is a scoped-down, portfolio-grade version of tools like PagerDuty or Opsgenie — built to demonstrate real-time systems, time-based scheduling logic, and applied AI, rather than to compete with those products commercially.

---

## 2. Problem Statement

Engineering teams need to know immediately when something breaks in production — a service goes down, error rates spike, latency increases. Without a structured process:

- Alerts get missed or buried in chat tools like Slack
- It is unclear who is responsible for responding at any given time
- Nothing escalates automatically if the responsible person is unavailable
- No one documents what happened after the fire is put out, so the same incidents repeat

OnCallr solves this with a clear, automated escalation pipeline and a forced documentation step (the postmortem) at the end of every incident.

---

## 3. Goals

### Primary Goal
Provide real-time incident detection, notification, and escalation for a single engineering team, with full incident history and AI-assisted postmortems.

### Secondary Goals
- Visual on-call scheduling (who is on call, when)
- Webhook-based incident ingestion (so external tools can trigger incidents)
- Incident timeline with comments and audit trail
- Analytics: MTTA (Mean Time to Acknowledge), MTTR (Mean Time to Resolve)
- Clean, fast, demoable dashboard UX

### Non-Goals (explicitly out of scope for v1)
- Multi-tenant support (multiple organizations on one platform)
- Real external monitoring integrations (Datadog, Sentry, etc.) — webhook endpoint simulates this generically instead
- SMS/phone call alerting (push/in-app + email only)
- Mobile app

---

## 4. Target Users

### Engineers
Need:
- To know immediately when they are on call
- Instant notification when an incident is assigned to them
- A simple way to acknowledge, investigate, and resolve incidents
- Context (timeline, comments) when picking up an incident from someone else

### Team Lead / Admin
Need:
- Visibility into all incidents across all services
- Ability to configure on-call rotations and escalation policies
- Analytics on team responsiveness (MTTA/MTTR)
- Reviewable, editable AI-generated postmortems for record-keeping

---

## 5. Core Features (Summary — see features.md for full detail)

1. **Services** — logical units being monitored (e.g. "Payment API", "Auth Service")
2. **On-Call Scheduling** — rotations assigning engineers to time-based shifts
3. **Webhook Ingestion** — external systems POST to a unique URL per service to create incidents
4. **Real-Time Notifications** — Socket.io pushes incident alerts instantly to the on-call engineer's dashboard
5. **Escalation Engine** — if not acknowledged within a configured timeout, automatically escalates to the next person in the chain
6. **Incident Timeline** — full audit trail of every state change, escalation, and comment
7. **AI Postmortems** — drafts a structured postmortem from the incident timeline once resolved; human edits and finalizes
8. **Analytics Dashboard** — MTTA, MTTR, incident volume by service, busiest on-call periods

---

## 6. Roles

| Role | Permissions |
|---|---|
| **Engineer** | View assigned incidents, acknowledge/comment/resolve incidents, view own shifts, view own postmortems |
| **Admin** | Everything an engineer can do, plus: create/edit services, configure escalation policies, create/edit schedules, view all incidents, view analytics |

This is a single-team system — there is no organization/tenant boundary. All users belong to the same team.

---

## 7. Technical Architecture

### Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Next.js 14 + Tailwind + shadcn/ui | Fast to build, clean dashboard UI, familiar stack |
| Real-time | Socket.io | Mature, well-documented, works well with Fastify |
| Backend | Fastify (TypeScript) | Lightweight, fast, already used in other projects |
| Database | PostgreSQL | Relational integrity for incidents/schedules/users |
| Job queue / timers | Redis + BullMQ | Durable delayed jobs for escalation timers — survives server restarts, unlike `setTimeout` |
| AI | OpenAI `gpt-4o-mini` | Postmortem drafting from structured incident data |
| Auth | JWT (HTTP-only cookie, web) | Same pattern as prior projects |
| Email (optional fallback) | Resend | Email notification if user is not actively viewing the dashboard |
| Hosting | Vercel (frontend) + Railway (backend, Postgres, Redis) | Low-cost, simple deploy pipeline |

### High-Level Architecture

```
┌─────────────┐        webhook POST        ┌──────────────────┐
│  External    │ ─────────────────────────▶ │   Fastify API     │
│  Monitor /   │                             │  (webhook intake) │
│  curl demo   │                             └─────────┬─────────┘
└─────────────┘                                         │
                                                          ▼
                                                 ┌──────────────────┐
                                                 │   PostgreSQL      │
                                                 │ (incidents, etc.) │
                                                 └─────────┬─────────┘
                                                          │
                                  ┌───────────────────────┼───────────────────────┐
                                  ▼                                              ▼
                         ┌──────────────────┐                          ┌──────────────────┐
                         │   Socket.io       │ ───── live push ───────▶│   Next.js client   │
                         │ (real-time layer) │                         │   (dashboard)       │
                         └──────────────────┘                          └──────────────────┘
                                  ▲
                                  │ schedule / cancel
                                  ▼
                         ┌──────────────────┐
                         │  Redis + BullMQ   │
                         │ (escalation jobs) │
                         └──────────────────┘
```

### Folder Structure (suggested)

```
oncallr/
├── apps/
│   ├── web/                  # Next.js frontend
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   └── api/                  # Fastify backend
│       ├── src/
│       │   ├── routes/
│       │   ├── services/      # business logic (escalation, ai, etc.)
│       │   ├── jobs/          # BullMQ job definitions
│       │   ├── sockets/       # Socket.io event handlers
│       │   ├── db/            # migrations, schema, queries
│       │   └── plugins/
├── packages/
│   └── shared-types/          # shared TS types between web and api
└── docs/
    ├── 00-master-overview.md
    └── features.md
```

---

## 8. Development Phases

| Phase | Duration | Deliverable |
|---|---|---|
| 1. Foundation | 1 week | Auth, services CRUD, basic dashboard layout |
| 2. Scheduling | 1.5 weeks | On-call rotations, calendar view, "who's on call now" |
| 3. Webhook + real-time core | 1.5 weeks | Webhook endpoint, Socket.io live notifications |
| 4. Escalation engine | 1.5 weeks | BullMQ delayed jobs, escalation chain logic |
| 5. Incident timeline & comments | 1 week | Event log, comments, state transitions |
| 6. AI postmortems | 1 week | Generate, edit, save |
| 7. Analytics & polish | 1 week | MTTA/MTTR charts, deploy, demo polish |

**Total: ~9 weeks**

---

## 9. MVP Definition

OnCallr is MVP-complete when:

- An admin can create a service and an on-call schedule
- A webhook POST to a service's unique URL creates an incident
- The currently on-call engineer receives an instant real-time notification
- If unacknowledged within the configured timeout, the incident automatically escalates to the next person
- Engineers can acknowledge, comment on, and resolve incidents
- A resolved incident can generate an AI-drafted postmortem, which can be edited and saved
- An admin can view basic analytics (MTTA, MTTR, incident volume)

---

## 10. Portfolio Value

This project demonstrates:

- Real-time systems design (Socket.io, live state sync)
- Durable, time-based job scheduling (Redis/BullMQ — not naive `setTimeout`)
- State machine design (incident lifecycle: Triggered → Acknowledged → Resolved)
- Applied AI for structured document generation (not just a chatbot wrapper)
- Security awareness (webhook token validation, rate limiting)
- Relational database design for scheduling and audit-trail data
- Dashboard/analytics UX with real engineering-domain metrics (MTTA/MTTR)

This is intended to read as a credible "I understand how production incident response tooling works" project, not a CRUD demo.