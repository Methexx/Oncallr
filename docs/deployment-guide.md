# Deployment Guide

This guide describes one practical deployment setup for OnCallr.

## Recommended hosting split

- `web/` on Vercel
- `api/` on Railway, Render, or Fly.io
- PostgreSQL on Supabase or Railway Postgres
- Redis on Upstash or Railway Redis

## Backend environment

Set these on the deployed API service:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=5000
WEB_ORIGIN=https://your-frontend-domain.example
DATABASE_URL=postgresql://...
DATABASE_SSL_REJECT_UNAUTHORIZED=false
REDIS_URL=redis://...
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
AUTH_COOKIE_NAME=oncallr_token
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=OnCallr
```

Notes:

- If your provider requires SSL for Postgres, keep SSL enabled in the connection
- If your password includes `@`, encode it as `%40`
- `WEB_ORIGIN` must match the real frontend origin so cookies and CORS behave correctly

## Frontend environment

Set these on Vercel or your frontend host:

```env
NEXT_PUBLIC_API_URL=https://your-api-domain.example/api
NEXT_PUBLIC_SOCKET_URL=https://your-api-domain.example
```

## Deployment order

1. Provision PostgreSQL
2. Provision Redis
3. Deploy the backend
4. Run Prisma migrations against production
5. Seed only if you want demo accounts in that environment
6. Deploy the frontend with the correct public URLs
7. Test login, live incident delivery, escalation, and postmortem drafting

## Prisma in production

Run migrations from the `api/` app after the backend has environment variables:

```powershell
cd api
npx prisma migrate deploy
```

If you want seeded demo data:

```powershell
npm run prisma:seed
```

## Smoke test checklist

### Auth

- Login works
- Auth cookie is set
- Logout clears the cookie

### Incidents

- Manual incident trigger works
- Webhook incident trigger works
- Engineer receives a live notification
- Incident detail updates in real time

### Escalation

- Unacknowledged incidents advance to the next escalation step
- Timeline logs the escalation event
- Offline users receive email fallback if SMTP is configured

### Postmortems

- Resolved incidents appear in postmortems
- AI draft generation works when `OPENAI_API_KEY` is configured
- Saved postmortem content reloads correctly

### Analytics

- Admin can open analytics
- Service filter works
- Summary cards and charts load successfully

## Common issues

### Login works locally but not in production

- Check `WEB_ORIGIN`
- Check cookie `secure` behavior under HTTPS
- Confirm frontend is calling the deployed API URL

### Escalation does not fire

- Confirm Redis is reachable
- Confirm the backend boot log says the queue is ready
- Confirm the service has an escalation policy with valid steps

### Webhook creates nothing

- Confirm the webhook token belongs to a service
- Confirm the JSON body includes `title` and `severity`

### AI draft generation fails

- Confirm `OPENAI_API_KEY` is present
- Confirm outbound network access is allowed on the backend host

### Email fallback does not send

- Confirm all SMTP values are present
- Confirm the target user has no active socket if you are specifically testing fallback
