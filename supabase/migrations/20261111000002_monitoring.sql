-- Phase 6: first-party error tracking (PRD §17 observability). Server errors
-- come from instrumentation.ts (onRequestError), browser errors from error
-- boundaries via /api/errors. Paths are stored without query strings and
-- messages are truncated, so no personal data is collected on purpose.
create table public.error_events (
  id bigint generated always as identity primary key,
  source text not null check (source in ('server', 'client')),
  message text not null check (char_length(message) <= 500),
  digest text,
  path text check (char_length(path) <= 200),
  route text check (char_length(route) <= 200),
  kind text check (char_length(kind) <= 40),
  created_at timestamptz not null default now()
);

create index error_events_created_idx on public.error_events (created_at desc);

alter table public.error_events enable row level security;
create policy "admins read errors" on public.error_events for select to authenticated using (public.is_staff(array[]::public.staff_role[]));
