-- Offbook content: track → course → mission → lesson → step, plus skills,
-- questions, games, challenges and badges. PRD §9, §14, with the approved
-- curriculum mapping (docs/curriculum-mapping.md): 9 tracks, content levels,
-- choice slots, course priority, cohort variants and per-course game unlocks.
--
-- Visibility rule: course-level metadata (tracks, courses, slots, skills,
-- games, badges) is readable by any signed-in user once published, so the
-- whole road ahead is visible. Anything below a course (missions, lessons,
-- steps, questions) is staff-only; students get it through unlock-checking
-- RPCs added in Phase 2.

create type public.content_status as enum ('draft', 'published', 'archived');
create type public.course_priority as enum ('core', 'recommended', 'elective');
create type public.course_kind as enum ('standard', 'bridge');
create type public.skill_link_type as enum ('prerequisite', 'related', 'applies_in');
create type public.step_type as enum ('study_deck', 'video', 'practice', 'make', 'reflect');
create type public.question_type as enum (
  'multiple_choice', 'multi_select', 'order', 'match_pairs', 'slider',
  'short_answer', 'scenario', 'simulator'
);
create type public.challenge_type as enum ('challenge_week', 'real_world', 'sponsored');

-- ---------------------------------------------------------------------------

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,            -- curriculum track name
  zone_name text not null,       -- world-map name, editable
  color text not null default '#7B14FF',
  order_index smallint not null,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_slots (
  id uuid primary key default gen_random_uuid(),
  level smallint not null check (level between 1 and 3),
  order_index smallint not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete restrict,
  level smallint not null check (level between 1 and 3),
  kind public.course_kind not null default 'standard',
  -- Fixed path courses carry order_index; slot courses carry slot_id instead.
  order_index smallint,
  slot_id uuid references public.course_slots (id) on delete set null,
  priority public.course_priority not null default 'core',
  slug text not null unique,
  title text not null,
  short_title text,
  promise text not null,
  cover jsonb not null default '{}',
  capstone jsonb not null default '{}',       -- {title, brief, rubric[]}; solo default
  cohort_variant jsonb,                        -- school-code version of the capstone
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_on_path_or_slot check (
    kind = 'bridge' or ((order_index is null) <> (slot_id is null))
  )
);

create index courses_track_idx on public.courses (track_id);
create index courses_level_idx on public.courses (level, order_index);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  order_index smallint not null,
  title text not null,
  output_description text not null default '',
  boss_config jsonb not null default '{}',
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, order_index)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  order_index smallint not null,
  title text not null,
  summary text not null default '',
  est_minutes smallint not null default 5,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mission_id, order_index)
);

create table public.lesson_steps (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  order_index smallint not null,
  type public.step_type not null,
  content jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, order_index)
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  mux_asset_id text,
  mux_upload_id text,
  mux_playback_id text,
  title text not null,
  teacher text,
  track_id uuid references public.tracks (id) on delete set null,
  tags text[] not null default '{}',
  duration_sec integer,
  status text not null default 'uploading'
    check (status in ('uploading', 'processing', 'ready', 'errored')),
  error_message text,
  captions_url text,
  transcript text,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete restrict,
  slug text not null unique,
  name text not null,
  description text not null default '',
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skill_links (
  from_skill_id uuid not null references public.skills (id) on delete cascade,
  to_skill_id uuid not null references public.skills (id) on delete cascade,
  link_type public.skill_link_type not null,
  primary key (from_skill_id, to_skill_id, link_type),
  check (from_skill_id <> to_skill_id)
);

create table public.lesson_skills (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  primary key (lesson_id, skill_id)
);

create table public.mission_skills (
  mission_id uuid not null references public.missions (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  primary key (mission_id, skill_id)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references public.lessons (id) on delete cascade,
  mission_id uuid references public.missions (id) on delete cascade,
  type public.question_type not null,
  prompt text not null,
  options jsonb not null default '[]',
  answer jsonb not null,
  explanation text not null default '',
  hint1 text,
  hint2 text,
  difficulty smallint not null default 1 check (difficulty between 1 and 3),
  variant_group text,
  skill_id uuid references public.skills (id) on delete set null,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lesson_id is not null or mission_id is not null)
);

create index questions_lesson_idx on public.questions (lesson_id);
create index questions_variant_idx on public.questions (variant_group);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete restrict,
  unlock_course_id uuid references public.courses (id) on delete set null,
  slug text not null unique,
  title text not null,
  description text not null default '',
  config jsonb not null default '{}',
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  type public.challenge_type not null,
  title text not null,
  brief text not null,
  rubric jsonb not null default '[]',
  safety_note text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  xp integer not null default 200 check (xp between 0 and 500),
  track_id uuid references public.tracks (id) on delete set null,
  required_course_id uuid references public.courses (id) on delete set null,
  band public.band,
  parent_ack_required boolean not null default true,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  rule jsonb not null default '{}',
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array[
    'tracks', 'course_slots', 'courses', 'missions', 'lessons', 'lesson_steps',
    'videos', 'skills', 'questions', 'games', 'challenges', 'badges'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_updated_at', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'tracks', 'course_slots', 'courses', 'missions', 'lessons', 'lesson_steps',
    'videos', 'skills', 'skill_links', 'lesson_skills', 'mission_skills',
    'questions', 'games', 'challenges', 'badges'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    -- Every staff role can read content (teachers see videos below).
    execute format(
      'create policy "staff read %1$s" on public.%1$I for select to authenticated using (public.is_staff())', t
    );
    -- Content team and admins write.
    execute format(
      'create policy "content team writes %1$s" on public.%1$I for all to authenticated '
      'using (public.is_staff(array[''content'']::public.staff_role[])) '
      'with check (public.is_staff(array[''content'']::public.staff_role[]))', t
    );
  end loop;
end $$;

-- The road ahead is visible to signed-in families (locked courses included).
create policy "families read published tracks" on public.tracks
  for select to authenticated using (status = 'published');
create policy "families read slots" on public.course_slots
  for select to authenticated using (true);
create policy "families read published courses" on public.courses
  for select to authenticated using (status = 'published');
create policy "families read skills" on public.skills
  for select to authenticated using (true);
create policy "families read skill links" on public.skill_links
  for select to authenticated using (true);
create policy "families read published games" on public.games
  for select to authenticated using (status = 'published');
create policy "families read published challenges" on public.challenges
  for select to authenticated using (status = 'published');
create policy "families read badges" on public.badges
  for select to authenticated using (true);

-- Teachers see and manage only their own videos (PRD §10.2).
drop policy "staff read videos" on public.videos;
create policy "staff read videos" on public.videos
  for select to authenticated
  using (public.is_staff(array['content', 'ops', 'reviewer', 'viewer', 'sales', 'marketing']::public.staff_role[]));
create policy "teachers manage own videos" on public.videos
  for all to authenticated
  using (public.is_staff(array['teacher']::public.staff_role[]) and uploaded_by = (select auth.uid()))
  with check (public.is_staff(array['teacher']::public.staff_role[]) and uploaded_by = (select auth.uid()));
