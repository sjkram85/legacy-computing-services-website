# Legacy Control Center — Cloudflare Workers + D1 Backend

Replaces Google Sheets and Google Apps Script as the primary database and intake API for both Legacy Computing Services and Legacy Bowling Academy.

## Deployed Resources
- **Cloudflare Account ID:** `d82b2e0d7355268bbdcf74484800c059`
- **Workers Subdomain:** `legacycomputing.workers.dev`
- **Worker Script:** `legacy-control-center-api`
- **Worker Base URL:** `https://legacy-control-center-api.legacycomputing.workers.dev`
- **D1 Database:** `legacy-control-center-db` (`78397cd9-4976-4050-8766-e7b28aee99ea`, ENAM)

## Endpoints
- `GET /api/health` — Database health check
- `POST /api/public/academy` — Public booking/inquiry intake for `legacybowlingacademy.com` (returns JSON receipt `{ ok: true, id }`)
- `POST /api/public/inquiry` — Public contact form intake for `legacycomputingservices.com`
- `POST /api/portal/auth/google` — Verifies Google OAuth access token and issues a 12-hour HMAC session token
- `GET /api/portal/data` — Loads all tables permitted for the signed-in user's role (`admin` or `coach`)
- `PUT /api/portal/records/:sheet` — Upserts a single record into D1
- `PUT /api/portal/documents/:kind` — Atomically upserts a `quote` or `invoice` header + line items (`admin` only)
- `GET` / `PUT /api/portal/users` — Manage authorized portal users and roles (`admin` only)

## Adding Future Bowling Coaches
To grant a future coach Google Sign-In access scoped strictly to Academy tabs (`Academy Students`, `Academy Requests`, `Academy Sessions`) with zero access to computing tickets, customers, or invoices:

1. Insert or update their Google email in D1 `users` with `role = 'coach'` (either via `PUT /api/portal/users` while signed in as admin, or in Cloudflare Dashboard -> D1 -> `legacy-control-center-db` -> Console):
   ```sql
   INSERT INTO users (email, role, display_name, active, created_at)
   VALUES ('coach@example.com', 'coach', 'Coach Name', 1, datetime('now'))
   ON CONFLICT(email) DO UPDATE SET role = 'coach', active = 1;
   ```
2. Add their Google email as a Test User in Google Cloud OAuth Consent Screen if your Google Cloud OAuth client is set to Internal (or switch consent screen to External with `users` allowlist enforced on Cloudflare D1).
