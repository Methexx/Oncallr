# OnCallr - Features & Integration Reference

This document describes every feature in detail: what it does, how it works internally, and how it connects to every other feature. Read this alongside `00-master-overview.md`.

---

## 1. Services

### What it is
A "Service" is the logical thing being monitored - e.g. "Payment API", "Auth Service", "Checkout Frontend". Every incident belongs to exactly one service.

### Fields
- `id`
- `name`
- `webhook_token` (random UUID, used to build the unique webhook URL)
- `escalation_policy_id` (FK -> escalation_policies)
- `created_at` 

### How it works
- Admin creates a service from the dashboard
- On creation, the backend generates a random `webhook_token` and the system builds a webhook URL: `POST /api/webhooks/incidents/:webhook_token`
- Admin attaches an escalation policy to the service (see Section 5)
- Admin can regenerate the token at any time (invalidates the old URL - useful if a token leaks)

### Integrates with
- **Webhook Ingestion (Section 3)** - the token is the auth mechanism for incoming webhook calls
- **Escalation Policies (Section 5)** - each service points to one escalation policy that defines its response chain
- **Incidents (Section 6)** - every incident has a `service_id`
- **Analytics (Section 9)** - incidents are grouped/filtered by service

---

## 2. On-Call Scheduling

### What it is
Defines who is on call and when, via named "Schedules" made up of rotating members.

### Fields
- `schedules`: `id`, `name`
- `schedule_members`: `schedule_id`, `user_id`, `rotation_order`
- `oncall_shifts`: `id`, `schedule_id`, `user_id`, `start_time`, `end_time`

### How it works
- Admin creates a schedule (e.g. "Backend Rotation") and adds members in rotation order
- The system auto-generates `oncall_shifts` based on a chosen rotation length (e.g. weekly), assigning each member a block of time in order
- Dashboard shows a calendar view of shifts, and a persistent "Who's on call now" widget computed by checking which shift's `start_time`/`end_time` range contains the current time
- Admin can manually override a shift (e.g. swap two engineers) by editing the `oncall_shifts` row directly

### Integrates with
- **Escalation Policies (Section 5)** - escalation steps can reference a schedule ("notify whoever is on call for this schedule") rather than a hardcoded user, so the right person is always notified even as rotations change
- **Real-Time Notifications (Section 4)** - when an incident is created, the system looks up the current `oncall_shifts` entry to determine who to notify first
- **Incidents (Section 6)** - incidents display "assigned to" based on the resolved on-call user at the time of creation

---

## 3. Webhook Ingestion

### What it is
A public-facing endpoint that lets external systems (or a `curl` command in a demo) create an incident for a given service.

### Endpoint
```json
POST /api/webhooks/incidents/:webhook_token
Content-Type: application/json

{
  "title": "Payment API returning 500s",
  "description": "Error rate spiked to 12% over the last 5 minutes",
  "severity": "critical"
}
```

### How it works
1. Backend looks up the service by `webhook_token`. If not found, returns 404 - never reveals whether a token format is valid (avoid leaking info to scanners)
2. Endpoint is rate-limited (e.g. max 30 requests/minute per token) to prevent abuse
3. Payload is validated (title and severity required)
4. A new `incident` row is created with status `triggered`
5. An `incident_event` row is created with type `created`
6. The **Escalation Engine (Section 5)** is triggered immediately for this incident
7. Returns `201` with the created incident ID

### Integrates with
- **Services (Section 1)** - token lookup ties the webhook to the correct service
- **Incidents (Section 6)** - this is the primary way incidents are created (alongside a manual "Trigger Incident" button in the dashboard, which calls the same internal incident-creation logic directly rather than via HTTP)
- **Escalation Engine (Section 5)** - fires immediately after incident creation
- **Real-Time Notifications (Section 4)** - fires as part of the escalation engine's first step

---

## 4. Real-Time Notifications (Socket.io)

### What it is
The mechanism that pushes incident alerts to engineers' dashboards instantly, without polling.

### How it works
- On login, the client opens a Socket.io connection authenticated via the user's JWT
- The server maintains a mapping of `user_id -> socket connection(s)`
- When the Escalation Engine determines who needs to be notified, it emits an event directly to that user's socket(s):
  ```
  socket.to(userSocketId).emit("incident:new", { incidentId, title, severity, serviceName })
  ```
- The dashboard listens for `incident:new` and shows a toast/banner plus an audible/visual alert, and adds the incident to the user's "My Incidents" list in real time without a page refresh
- If the user is not currently connected (no active socket), the system falls back to an email notification via Resend

### Integrates with
- **Escalation Engine (Section 5)** - this is the delivery mechanism the escalation engine uses at every step of the chain
- **Incident Timeline (Section 6)** - every notification sent is also logged as an `incident_event` (type `notified`) for the audit trail
- **On-Call Scheduling (Section 2)** - determines who the socket event is addressed to

---

## 5. Escalation Engine

### What it is
The core logic that ensures an incident is never silently ignored. If the currently responsible person doesn't acknowledge in time, it automatically notifies the next person.

### Fields
- `escalation_policies`: `id`, `service_id`, `timeout_minutes`, `steps` (ordered JSON array, each step references either a `user_id` or a `schedule_id`)

### How it works (step by step)
1. Incident created -> Escalation Engine reads the service's `escalation_policy`
2. Step 1 of the policy is resolved to an actual user (if it's a schedule reference, look up who's currently on call) and notified via **Real-Time Notifications (Section 4)**
3. A delayed job is scheduled in BullMQ: "if this incident is not acknowledged within `timeout_minutes`, run the escalation check"
4. If the engineer acknowledges the incident before the job fires:
   - The incident status changes to `acknowledged`
   - The pending BullMQ job for this incident is cancelled
   - An `incident_event` (type `acknowledged`) is logged
5. If the timeout job fires before acknowledgment:
   - The engine moves to the next step in the policy
   - That step's user/schedule is notified
   - An `incident_event` (type `escalated`) is logged
   - A new delayed job is scheduled for the next timeout
   - This repeats until either someone acknowledges, or the policy runs out of steps (in which case the last step's target keeps getting re-notified, or an admin is alerted as a final fallback)

### Why BullMQ instead of `setTimeout`
A plain `setTimeout` only exists in server memory - if the server restarts or redeploys while a 5-minute timer is pending, the escalation silently never happens. BullMQ persists jobs in Redis, so scheduled escalations survive restarts and are processed reliably by a worker process.

### Integrates with
- **Services (Section 1)** - each service has exactly one escalation policy
- **On-Call Scheduling (Section 2)** - steps that reference a schedule resolve to "whoever is on call right now" at the moment the step fires, not at incident creation time
- **Real-Time Notifications (Section 4)** - used at every step to actually notify someone
- **Incident Timeline (Section 6)** - every escalation step is logged as an event

---

## 6. Incidents & Timeline

### What it is
The central object of the system. Each incident has a lifecycle and a full event log.

### Fields
- `incidents`: `id`, `service_id`, `title`, `description`, `severity`, `status`, `created_at`, `acknowledged_at`, `resolved_at`
- `incident_events`: `id`, `incident_id`, `type`, `actor_id`, `message`, `created_at`
  - `type` in `created | notified | escalated | acknowledged | commented | resolved`

### Status lifecycle
```
triggered -> acknowledged -> resolved
```

- `triggered`: just created, escalation engine actively running
- `acknowledged`: someone has taken ownership, escalation stopped
- `resolved`: issue fixed, eligible for postmortem generation

### How it works
- Every action on an incident (creation, notification sent, escalation, acknowledgment, comment, resolution) writes a new row to `incident_events` - this table is append-only and is the single source of truth for the timeline view
- The dashboard renders the timeline by querying all events for an incident, ordered by `created_at`
- Engineers can add free-text comments at any point (`type: commented`) - useful for "checked logs, looks like a DB connection pool issue"
- Resolving an incident requires the user to optionally enter a resolution note, which becomes the final `commented` event before the `resolved` event

### Integrates with
- **Escalation Engine (Section 5)** - writes events into this table at every step; reads `status` to know whether to keep escalating
- **AI Postmortems (Section 7)** - reads the full `incident_events` list as input context
- **Analytics (Section 9)** - `created_at`, `acknowledged_at`, `resolved_at` timestamps are the raw data for MTTA/MTTR calculations

---

## 7. AI Postmortems

### What it is
Once an incident is resolved, the system can generate a structured postmortem draft using AI, based on the full incident timeline.

### How it works
1. User clicks "Generate Postmortem" on a resolved incident
2. Backend assembles a prompt containing:
   - Incident title, description, severity
   - Full ordered list of `incident_events` (formatted as a readable timeline)
   - Total duration (`resolved_at - created_at`)
3. Sends this to OpenAI `gpt-4o-mini` with a structured-output instruction requesting a JSON object with fields:
   - `summary` (plain-English what happened)
   - `timeline_recap` (condensed narrative of the timeline)
   - `what_went_well`
   - `what_could_improve`
   - `action_items` (array of suggested follow-ups)
4. The result is saved to the `postmortems` table as `ai_draft` (raw, unedited)
5. The user can edit any field in a form before saving the `final_content` - the AI draft is never shown as if it were final, reinforcing "AI assists, human approves"

### Fields
- `postmortems`: `id`, `incident_id`, `ai_draft` (JSON), `final_content` (JSON), `created_at`

### Integrates with
- **Incidents & Timeline (Section 6)** - the entire timeline is the input context; a postmortem can only be generated for a `resolved` incident
- **Analytics (Section 9)** - finalized postmortems can optionally be included in exported reports (future scope)

---

## 8. Roles & Permissions

### How it works
- JWT payload includes `role: "engineer" | "admin"`
- Fastify route-level middleware checks role before allowing access to admin-only routes (service creation, escalation policy editing, schedule management, full analytics)
- Engineers can only see incidents/services they're involved in plus all incidents assigned to them; admins see everything

### Integrates with
- **All features** - every route in the system checks role before performing the action; this is enforced server-side, not just hidden in the UI

---

## 9. Analytics Dashboard

### What it is
Admin-facing dashboard showing team responsiveness and incident volume.

### Metrics
- **MTTA (Mean Time to Acknowledge)** = average of (`acknowledged_at - created_at`) across incidents in a date range
- **MTTR (Mean Time to Resolve)** = average of (`resolved_at - created_at`) across incidents in a date range
- **Incident volume by service** (bar chart)
- **Incidents over time** (line chart, daily/weekly buckets)
- **Busiest on-call periods** (which shifts had the most incidents)

### How it works
- Backend exposes aggregate query endpoints (e.g. `GET /api/analytics/mtta?from=...&to=...`) that run SQL aggregate queries directly against `incidents` rather than computing in application code, for performance
- Frontend renders results with Recharts

### Integrates with
- **Incidents & Timeline (Section 6)** - all metrics are derived directly from incident timestamps and event logs
- **Services (Section 1)** - volume metrics can be filtered/grouped by service
- **On-Call Scheduling (Section 2)** - busiest-period metric cross-references `oncall_shifts`

---

## 10. End-to-End Flow Example

To see how every feature connects, here is a single incident's full journey:

1. **Webhook (Section 3)** receives a POST from a `curl` command simulating a monitoring tool -> creates an `incident` with status `triggered`
2. **Escalation Engine (Section 5)** reads the service's policy, resolves step 1 via **On-Call Scheduling (Section 2)** to find the current on-call engineer
3. **Real-Time Notifications (Section 4)** pushes a Socket.io event to that engineer's open dashboard; an `incident_event` (`notified`) is logged
4. A BullMQ job is scheduled for the timeout window
5. Engineer doesn't respond in time -> job fires -> **Escalation Engine** moves to step 2, notifies the next person, logs an `escalated` event
6. That engineer acknowledges -> `incident_event` (`acknowledged`) logged, status changes to `acknowledged`, pending BullMQ job cancelled
7. Engineer investigates, adds two comments (`commented` events), then resolves the incident with a resolution note -> status becomes `resolved`
8. Admin opens the incident, clicks "Generate Postmortem" -> **AI Postmortems (Section 7)** reads the full event timeline, drafts a structured postmortem
9. Admin edits the draft slightly, saves `final_content`
10. The incident now contributes its timestamps to the **Analytics Dashboard (Section 9)** MTTA/MTTR calculations, and its service's incident count increments on the volume chart
