# Deployment — awards.lineuppro.com

Student-facing URL: **https://awards.lineuppro.com** (QR code: `public/qr-awards-lineuppro.png`, project `/qr` before voting).
All student traffic stays on this domain; Supabase is only contacted server-side,
so the district filter only ever sees `*.lineuppro.com`.

## 1. Supabase (one-time, ~5 min)

1. Create a new project at supabase.com (e.g. `waukee-ssbu-awards`).
2. SQL Editor → paste the entire contents of `supabase/migrations/0001_waukee_awards.sql` → Run.
   This creates tables + RLS + grants, the atomic `submit_ballot` function, and seeds
   the event (starting **closed**), 5 categories, and 7 groups.
3. Settings → API: note the **Project URL** and **service_role key** (keep the key out of chat/git).

## 2. GitHub

Push this repo to a new GitHub repo (e.g. `waukee-ssbu-awards`).

## 3. Vercel

1. New Project → import the repo. Framework: Next.js (auto-detected).
2. Environment Variables (Production):
   - `SUPABASE_URL` = your Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key (server-only)
   - `ADMIN_PASSWORD` = a strong teacher password (replaces the local default)
3. Deploy. Open the `*.vercel.app` URL and sanity-check voting + `/admin`.

## 4. Custom domain

1. In the new Vercel project: Settings → Domains → add `awards.lineuppro.com`.
2. If lineuppro.com DNS is on Vercel, the record is automatic. If it's external
   (registrar/Cloudflare), add the CNAME Vercel shows (→ `cname.vercel-dns.com`).
3. Wait for the certificate, then open https://awards.lineuppro.com.

## 5. Test TOMORROW (day before the event) — non-negotiable

On a **school-issued iPad on school Wi-Fi**, in the actual classroom:
- [ ] Scan the QR / open awards.lineuppro.com — page loads
- [ ] Cast a full ballot, submit — dashboard count goes to 1
- [ ] Teacher login at /admin works; reveal rehearsal plays
- [ ] Reset ballots (clears the test vote), leave voting **closed**

## Event day

1. Project `/qr` — students scan and land on the (closed) ballot screen.
2. After demos: /admin → **Open Voting**. Watch the count climb to ~21.
3. **Close Voting** → **Launch Reveal** (`/present`). Click/Space to advance.

## Backup plan

If the domain/DNS is blocked or broken at school: run this same app on the
teacher Mac (`npm run build && npm run start -- -p 3000 -H 0.0.0.0`) and use
`http://<mac-ip>:3000`. Without Supabase env vars it automatically uses its
local ballot file. Decide before students start — never mix the two mid-vote.
