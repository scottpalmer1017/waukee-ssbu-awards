# Waukee SSBU Developer Awards

Live class voting app for the AP Computer Science Principles tournament-manager
showcase: 7 student projects, 4 awards, ~21 voters on iPads, and a
teacher-controlled cinematic awards reveal.

**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS on Vercel ·
Supabase (Postgres, Storage, Auth) from Stage 2 onward.

## Run locally

```bash
npm install
npm run dev   # http://localhost:3000
```

## Implementation stages

- [x] **Stage 1 — Student voting experience (sample data).** Intro →
  one-award-at-a-time voting (7 cards, 4-over-3 on landscape tablets) →
  ballot review → confirmation. Five awards: four *specialty* awards
  (Most Visually Appealing, Easiest to Use, Simplest Solution, The WOW
  Award) are exclusive per ballot — a group already picked shows
  greyed out as "Already Honored" — then the **Best Overall** finale
  brings all 7 groups back with no restrictions. In-progress and
  submitted ballots persist in `localStorage`, so a refresh mid-vote loses
  nothing and a submitted iPad can't accidentally vote twice from the
  confirmation screen. Content lives in `src/lib/data.ts` so groups,
  categories, and the event are data, not hardcoded UI.
- [x] **Stage 2 — Ballot saving.** Ballots submit to `/api/ballot` with full
  server-side validation and a per-device token (duplicates rejected);
  results are only available through teacher-authenticated APIs. The local
  store is a JSON file (`data/store.json`, git-ignored). The Supabase
  equivalent is written and ready — `supabase/migrations/0001_waukee_awards.sql`
  (RLS + explicit Data API grants + atomic `submit_ballot`) — and gets wired
  when the Supabase project is connected for deployment.
- [x] **Stage 3 — Teacher dashboard (`/admin`).** Password gate (set
  `ADMIN_PASSWORD` in `.env.local`; default `waukee-admin` for local use —
  becomes Supabase Auth on deployment): open/close voting, live ballot
  count, private per-award results with winner/tie badges, reset all
  ballots (double-confirmed). *Still to add: group editing + screenshot
  uploads once the real screenshots exist.*
- [x] **Stage 4 — Presentation mode (`/present`).** Full-screen reveal, one
  award at a time: award title → nominees → "AND THE WINNER IS…" (waits for
  the teacher) → winner + confetti. Advance with click / Space / →, go back
  with ←. Ties reveal as co-winners. **No repeat champions:** a group that
  already won an earlier award can't win again — on the nominees screen it
  shows a "🏆 WON: …" badge, and the award passes to the next-highest vote
  total among groups that haven't won yet (the dashboard privately shows
  who was passed over). Exception: the **Best Overall finale** — all 7
  groups are live again with no badges, and anyone can win it. Vote totals
  hidden unless the teacher ticks the box. `?rehearsal=1` runs the whole show with fake results and
  never touches real ballots.
- [ ] **Stage 5 — Hardening & deployment.** iPad Safari checks (landscape
  1180×820 and smaller), Vercel deploy, test from a school-issued iPad on
  district Wi-Fi before the event.

## Decisions locked in

- No voting-code entry friction for students; totals are a simple clean count.
- Ties reveal as **co-winners**.
- Teacher access is real Supabase Auth, never a hidden URL.
- The official Waukee W logo is **not** recreated here — drop the provided
  asset in later; branding is currently typographic.
