# Decisions log

Ambiguities resolved during the build (PRD §0: pick the [ASSUMPTION] default, note it here, keep going). Newest last.

## Owner-approved (curriculum mapping, signed off 2026-11-02)

All ten owner decisions in `docs/curriculum/curriculum-mapping.md` were approved as proposed:

| # | Decision |
|---|---|
| O-1 | Nine zones (one per curriculum track) instead of five: Leaders' Peak, Cyber Cove, Code Canyon, Bot Bay, Puzzle Peaks, Founders' Forge, Discovery Delta, Voice Valley, Launchpad |
| O-2 | Keep school-subject courses and pitch them as "school plus real life" |
| O-3 | Bridge course (built from Level 1 lessons) first for students placed into Level 2 or 3 |
| O-4 | Level 1 order with Money Mint first |
| O-5 | Choice slots on the Level 2 and 3 paths |
| O-6 | Parent-controlled board-exam lighter mode in classes 10 and 12 |
| O-7 | Launch for classes 6–8 first; waitlist for 9–12 |
| O-8 | Solo capstone defaults; school-cohort variants for school-code students |
| O-9 | Electronics uses a browser simulator by default; hardware kit later as a paid add-on |
| O-10 | Generative AI and ML use a scripted sandbox until a lawyer clears specific tools |

## Build decisions

| # | Date | Decision | Why |
|---|---|---|---|
| D-001 | 2026-11-02 | Repo at `Documents/offbook`, branch per phase (`phase-0-foundation`, …) | Owner asked to plan then build; phases commit separately |
| D-002 | 2026-11-02 | Hosted Supabase project (Mumbai), migrations pushed with `npx supabase db push`; no local Supabase | Docker isn't installed on the build machine |
| D-003 | 2026-11-02 | Theme band is a generated column from `class_grade`; `content_level` is a separate field | Mapping §3: look comes from class, courses come from progress |
| D-004 | 2026-11-02 | `courses.level` (1–3) replaces the PRD's `courses.band` | Content level, not theme band, decides the path |
| D-005 | 2026-11-02 | PINs are bcrypt-hashed in Postgres (pgcrypto) in `student_pins`, a table with no RLS policies; only SECURITY DEFINER functions touch it. 5 wrong tries lock for 5 minutes | No client can ever read a hash; rate limiting lives next to the data |
| D-006 | 2026-11-02 | Child session = parent's Supabase session + an HMAC-signed, httpOnly cookie naming the profile, bound to the parent id, 12-hour expiry | PRD §7.1/§14: children have no auth account |
| D-007 | 2026-11-02 | Content below course level (missions, lessons, steps, questions) is staff-only in RLS; students will read it through unlock-checking RPCs (Phase 2) | Server-enforced unlocks (PRD §8); answers never reach the client |
| D-008 | 2026-11-02 | Parents can't update `xp`, `level`, `rank`, `content_level` or `parent_id` directly (trigger) | Progress changes only through RPCs |
| D-009 | 2026-11-02 | Email OTP sign-in (6-digit code or magic link) in Phase 0; phone OTP in Phase 1 once an SMS provider is chosen | Supabase phone auth needs an SMS provider account |
| D-010 | 2026-11-02 | Development-only "Sign in as demo user" buttons (`ENABLE_DEV_LOGIN=true`), using the service role to mint a magic link | PRD §17 seed-based demo mode for QA without email round trips |
| D-011 | 2026-11-02 | Next.js 16 `cacheComponents` turned off | Almost every route reads the session; Suspense-everywhere adds risk with no benefit yet |
| D-012 | 2026-11-02 | Phase 0 asks for parental consent (checkbox, version, timestamp, method → `consent_log`) when a child is added | DPDP: consent before processing a child's data; Phase 1 adds the full consent flow and withdrawal |
| D-013 | 2026-11-02 | Logo SVGs traced by hand from the owner's PNG; the PNG itself still needs saving to `public/brand/offbook-logo.png` | The PNG was shared in chat, not as a file |
| D-014 | 2026-11-02 | Launch-band accent is `#8A2EFF` instead of violet-600 on dark surfaces | White text on it is 5.4:1 (AA); keeps contrast on the night background |
