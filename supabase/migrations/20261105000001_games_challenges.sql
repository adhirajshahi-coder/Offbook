-- Phase 4: games, real-world challenges, review queue, portfolio,
-- certificates, weekly leagues and the moderated Showcase. PRD §7.7–§7.10.
-- As before: students write through trusted server code only; parents read
-- their own children's rows; staff read and act by role.

-- ---------------------------------------------------------------------------
-- Games
-- ---------------------------------------------------------------------------

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,
  seed integer not null,
  level smallint not null default 1,
  status text not null default 'started' check (status in ('started', 'finished')),
  score integer,
  won boolean,
  xp_awarded integer not null default 0,
  skills jsonb not null default '[]',
  duration_sec integer,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index game_sessions_student_idx on public.game_sessions (student_id, started_at desc);

-- ---------------------------------------------------------------------------
-- Challenges: parent permission, then submission to the review queue
-- ---------------------------------------------------------------------------

-- A parent says yes to an offline challenge after reading its safety note.
create table public.challenge_permissions (
  student_id uuid not null references public.students (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  requested_at timestamptz not null default now(),
  granted_at timestamptz,
  granted_by uuid references public.parents (id) on delete set null,
  primary key (student_id, challenge_id)
);

-- Submissions now cover challenges too; reviewers can claim work.
alter table public.submissions drop constraint submissions_kind_check;
alter table public.submissions add constraint submissions_kind_check check (kind in ('make', 'capstone', 'challenge'));
alter table public.submissions add column challenge_id uuid references public.challenges (id) on delete cascade;
alter table public.submissions add column assigned_to uuid references auth.users (id) on delete set null;
alter table public.submissions add column rubric_checks jsonb not null default '[]';
create index submissions_queue_idx on public.submissions (status, kind, created_at) where status = 'pending';

-- ---------------------------------------------------------------------------
-- Portfolio, Showcase, certificates
-- ---------------------------------------------------------------------------

alter table public.students add column portfolio_handle text unique
  check (portfolio_handle ~ '^[a-z0-9-]{3,30}$');

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  source_type text not null check (source_type in ('mission', 'capstone', 'challenge')),
  source_id uuid not null,
  submission_id uuid references public.submissions (id) on delete set null,
  title text not null,
  summary text not null default '',
  skills jsonb not null default '[]',
  -- Nothing is public unless the parent switches it on (PRD §13).
  visibility text not null default 'private' check (visibility in ('private', 'portfolio')),
  -- Showcase needs parent consent AND staff approval.
  showcase_consent boolean not null default false,
  showcase_status text not null default 'none' check (showcase_status in ('none', 'pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (student_id, source_type, source_id)
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  student_id uuid not null references public.students (id) on delete cascade,
  course_id uuid references public.courses (id) on delete cascade,
  mission_id uuid references public.missions (id) on delete cascade,
  title text not null,
  issued_at timestamptz not null default now(),
  check ((course_id is null) <> (mission_id is null))
);

create unique index certificates_once_course on public.certificates (student_id, course_id) where course_id is not null;
create unique index certificates_once_mission on public.certificates (student_id, mission_id) where mission_id is not null;

-- ---------------------------------------------------------------------------
-- Weekly leagues (PRD §7.8): 20–30 students of one band, ranked by weekly XP
-- ---------------------------------------------------------------------------

create type public.league_tier as enum ('bronze', 'silver', 'gold', 'diamond');

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  band public.band not null,
  tier public.league_tier not null,
  created_at timestamptz not null default now()
);

create index leagues_week_idx on public.leagues (week_start, band, tier);

create table public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  week_start date not null,
  tier public.league_tier not null,
  weekly_xp integer not null default 0,
  final_rank smallint,
  outcome text check (outcome in ('promoted', 'stayed', 'demoted')),
  primary key (league_id, student_id),
  unique (student_id, week_start)
);

-- Preset reactions only (no free text between students).
create table public.league_reactions (
  id bigint generated always as identity primary key,
  league_id uuid not null references public.leagues (id) on delete cascade,
  from_student uuid not null references public.students (id) on delete cascade,
  to_student uuid not null references public.students (id) on delete cascade,
  sticker text not null check (sticker in ('clap', 'fire', 'star', 'rocket', 'muscle')),
  created_at timestamptz not null default now(),
  unique (league_id, from_student, to_student, sticker)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['game_sessions', 'challenge_permissions', 'portfolio_items', 'certificates', 'league_members', 'league_reactions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "parent reads own child %1$s" on public.%1$I for select to authenticated using (public.is_my_child(%2$s))', t,
      case when t = 'league_reactions' then 'from_student' else 'student_id' end);
    execute format('create policy "staff read %1$s" on public.%1$I for select to authenticated using (public.is_staff(array[''ops'', ''reviewer'', ''viewer'']::public.staff_role[]))', t);
  end loop;
end $$;

alter table public.leagues enable row level security;
create policy "staff read leagues" on public.leagues for select to authenticated using (public.is_staff());

-- Parents grant challenge permission and control portfolio visibility and
-- Showcase consent for their own children. Everything else is server-only.
create policy "parent grants challenge permission" on public.challenge_permissions
  for update to authenticated using (public.is_my_child(student_id)) with check (public.is_my_child(student_id));
create policy "parent controls portfolio item sharing" on public.portfolio_items
  for update to authenticated using (public.is_my_child(student_id)) with check (public.is_my_child(student_id));

create or replace function public.guard_portfolio_parent_update()
returns trigger
language plpgsql
as $$
begin
  if (select auth.role()) = 'authenticated' and not public.is_staff(array['ops', 'reviewer']::public.staff_role[]) then
    if (to_jsonb(new) - 'visibility' - 'showcase_consent' - 'showcase_status') is distinct from (to_jsonb(old) - 'visibility' - 'showcase_consent' - 'showcase_status') then
      raise exception 'Only sharing settings can be changed here';
    end if;
    -- Consent can be given or withdrawn; only staff approve.
    if new.showcase_status = 'approved' and old.showcase_status <> 'approved' then
      raise exception 'Only Offbook staff approve Showcase items';
    end if;
    if new.showcase_consent and old.showcase_status in ('none', 'rejected') then
      new.showcase_status := 'pending';
    elsif not new.showcase_consent then
      new.showcase_status := 'none';
    end if;
  end if;
  return new;
end;
$$;

create trigger portfolio_guard_parent before update on public.portfolio_items
  for each row execute function public.guard_portfolio_parent_update();

create policy "reviewers moderate showcase" on public.portfolio_items
  for update to authenticated
  using (public.is_staff(array['reviewer', 'ops']::public.staff_role[]))
  with check (public.is_staff(array['reviewer', 'ops']::public.staff_role[]));

-- Public pages (portfolio /p/[handle], /showcase, certificate checks) are
-- served by the server with the service role and filtered there, so anon
-- gets no direct table access.
