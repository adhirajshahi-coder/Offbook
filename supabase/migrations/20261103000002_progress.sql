-- Phase 2: student progress, XP ledger, retry vault, skill mastery, badges,
-- submissions and staff course overrides. PRD §7, §8, §14.
--
-- Students have no auth user, so every write goes through trusted server
-- code (service role) after it checks the signed child session and the
-- unlock rules (lib/gamification/unlocks.ts). Parents can read their own
-- children's progress; staff read by role. Nothing here is client-writable.

-- Where the student started, so the Bridge applies to late joiners only.
alter table public.students add column started_level smallint;
update public.students set started_level = content_level where started_level is null;
alter table public.students alter column started_level set not null;
alter table public.students add constraint students_started_level_check check (started_level between 1 and 3);

create or replace function public.default_started_level()
returns trigger
language plpgsql
as $$
begin
  if new.started_level is null then
    new.started_level := new.content_level;
  end if;
  return new;
end;
$$;

create trigger students_default_started_level before insert on public.students
  for each row execute function public.default_started_level();

-- Parents can't edit placement either (it decides the Bridge).
create or replace function public.guard_student_progress_fields()
returns trigger
language plpgsql
as $$
begin
  if (select auth.role()) = 'authenticated' and not public.is_staff(array['ops']::public.staff_role[]) then
    if new.xp is distinct from old.xp
      or new.level is distinct from old.level
      or new.rank is distinct from old.rank
      or new.content_level is distinct from old.content_level
      or new.started_level is distinct from old.started_level
      or new.parent_id is distinct from old.parent_id then
      raise exception 'These fields change through progress, not edits';
    end if;
  end if;
  return new;
end;
$$;

-- Stable key for seeded questions, so re-seeding updates them in place
-- instead of deleting rows that progress points at.
alter table public.questions add column seed_key text unique;

-- ---------------------------------------------------------------------------

create type public.progress_status as enum ('in_progress', 'pending_review', 'completed');

create table public.course_progress (
  student_id uuid not null references public.students (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  status public.progress_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (student_id, course_id)
);

create table public.mission_progress (
  student_id uuid not null references public.students (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  quiz_best_pct smallint not null default 0,
  quiz_passed_at timestamptz,
  boss_best_pct smallint not null default 0,
  boss_passed_at timestamptz,
  completed_at timestamptz,
  primary key (student_id, mission_id)
);

create table public.lesson_progress (
  student_id uuid not null references public.students (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (student_id, lesson_id)
);

create table public.step_progress (
  student_id uuid not null references public.students (id) on delete cascade,
  step_id uuid not null references public.lesson_steps (id) on delete cascade,
  completed_at timestamptz,
  attempts integer not null default 0,
  watch_pct smallint not null default 0,
  response jsonb,                 -- Make / Reflect text, private to student and parent
  primary key (student_id, step_id)
);

create table public.question_attempts (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.students (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  context text not null check (context in ('lesson', 'quiz', 'boss', 'warmup')),
  correct boolean not null,
  hints_used smallint not null default 0,
  ms integer,
  created_at timestamptz not null default now()
);

create index question_attempts_student_idx on public.question_attempts (student_id, created_at desc);

-- Retry Vault (Leitner). Keyed by variant group so any variant can resurface.
create table public.retry_queue (
  student_id uuid not null references public.students (id) on delete cascade,
  variant_group text not null,
  box smallint not null default 1 check (box between 1 and 4),
  due_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (student_id, variant_group)
);

create table public.skill_mastery (
  student_id uuid not null references public.students (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  -- 0 attempted, 1 familiar, 2 proficient, 3 mastered (Khan-style, PRD §2.1)
  level smallint not null default 0 check (level between 0 and 3),
  correct_count integer not null default 0,
  last_practiced_at timestamptz not null default now(),
  primary key (student_id, skill_id)
);

-- XP ledger: the source of truth (PRD §7.8). One row per earning event;
-- the unique key makes "first time only" awards idempotent.
create table public.xp_events (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.students (id) on delete cascade,
  source_type text not null,
  source_id text not null,
  amount integer not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (student_id, source_type, source_id)
);

create index xp_events_student_idx on public.xp_events (student_id, created_at desc);

create table public.student_badges (
  student_id uuid not null references public.students (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (student_id, badge_id)
);

-- Work for review: capstones always; Make steps are kept and sampled.
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  kind text not null check (kind in ('make', 'capstone')),
  course_id uuid references public.courses (id) on delete cascade,
  step_id uuid references public.lesson_steps (id) on delete cascade,
  content jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'revision', 'rejected', 'kept')),
  reviewer_id uuid references auth.users (id) on delete set null,
  feedback text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index submissions_status_idx on public.submissions (status, created_at);
create trigger submissions_updated_at before update on public.submissions
  for each row execute function public.set_updated_at();

-- Staff overrides (PRD §8): unlock or reset a course for one student. Audited.
create table public.course_overrides (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  action text not null check (action in ('unlock', 'reset')),
  reason text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security: parents read their own children; staff read by role.
-- ---------------------------------------------------------------------------

create or replace function public.is_my_child(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.students where id = p_student_id and parent_id = (select auth.uid()))
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'course_progress', 'mission_progress', 'lesson_progress', 'step_progress', 'question_attempts',
    'retry_queue', 'skill_mastery', 'xp_events', 'student_badges', 'submissions', 'course_overrides'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "parent reads own child %1$s" on public.%1$I for select to authenticated using (public.is_my_child(student_id))', t
    );
    execute format(
      'create policy "staff read %1$s" on public.%1$I for select to authenticated '
      'using (public.is_staff(array[''ops'', ''reviewer'', ''viewer'']::public.staff_role[]))', t
    );
  end loop;
end $$;

create policy "reviewers handle submissions" on public.submissions
  for update to authenticated
  using (public.is_staff(array['reviewer', 'ops']::public.staff_role[]))
  with check (public.is_staff(array['reviewer', 'ops']::public.staff_role[]));

create policy "ops write overrides" on public.course_overrides
  for insert to authenticated
  with check (public.is_staff(array['ops']::public.staff_role[]));
