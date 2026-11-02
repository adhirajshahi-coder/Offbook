-- Offbook identity: parents, students, staff, schools, consent and audit.
-- PRD §13, §14. RLS is on for every table; nothing is readable by default.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create type public.staff_role as enum (
  'admin', 'sales', 'marketing', 'ops', 'content', 'teacher', 'reviewer', 'viewer'
);

create type public.band as enum ('explore', 'build', 'launch');

-- ---------------------------------------------------------------------------
-- Staff (Offbook HQ users)
-- ---------------------------------------------------------------------------

create table public.staff (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role public.staff_role not null default 'viewer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger staff_updated_at before update on public.staff
  for each row execute function public.set_updated_at();

-- Role check used by every policy. SECURITY DEFINER so policies on staff
-- itself do not recurse.
create or replace function public.staff_role_of(uid uuid)
returns public.staff_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.staff where id = uid and active
$$;

create or replace function public.is_staff(roles public.staff_role[] default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff s
    where s.id = (select auth.uid())
      and s.active
      and (roles is null or s.role = any (roles) or s.role = 'admin')
  )
$$;

-- ---------------------------------------------------------------------------
-- Schools
-- ---------------------------------------------------------------------------

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  state text,
  board text,
  school_code text not null unique,
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  crm_org_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger schools_updated_at before update on public.schools
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Parents (the account holder) and students (child profiles, no auth user)
-- ---------------------------------------------------------------------------

create table public.parents (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  phone text,
  email text,
  consent_version text,
  consent_at timestamptz,
  notification_prefs jsonb not null default '{"weekly_summary": true, "daily_reminder": true}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger parents_updated_at before update on public.parents
  for each row execute function public.set_updated_at();

create table public.students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents (id) on delete cascade,
  -- First name or nickname only. No surname, photo or bio (PRD §7.1).
  display_name text not null check (char_length(trim(display_name)) between 1 and 24),
  class_grade smallint not null check (class_grade between 6 and 12),
  band public.band generated always as (
    case
      when class_grade <= 8 then 'explore'::public.band
      when class_grade <= 10 then 'build'::public.band
      else 'launch'::public.band
    end
  ) stored,
  content_level smallint not null check (content_level between 1 and 3),
  avatar jsonb not null default '{}',
  school_id uuid references public.schools (id) on delete set null,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level between 1 and 50),
  rank text not null default 'rookie',
  weekly_goal smallint not null default 4 check (weekly_goal between 1 and 7),
  league_opt_in boolean not null default false,
  public_portfolio boolean not null default false,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index students_parent_id_idx on public.students (parent_id);
create index students_school_id_idx on public.students (school_id);

create trigger students_updated_at before update on public.students
  for each row execute function public.set_updated_at();

-- Fields a parent may not change directly: progress is written by RPCs only.
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
      or new.parent_id is distinct from old.parent_id then
      raise exception 'These fields change through progress, not edits';
    end if;
  end if;
  return new;
end;
$$;

create trigger students_guard_progress before update on public.students
  for each row execute function public.guard_student_progress_fields();

-- PINs live apart from students so no client can ever read a hash.
create table public.student_pins (
  student_id uuid primary key references public.students (id) on delete cascade,
  pin_hash text not null,
  failed_attempts smallint not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

-- Create a parent row for every new non-staff auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'kind', 'parent') = 'parent' then
    insert into public.parents (id, email, phone, name)
    values (new.id, new.email, new.phone, new.raw_user_meta_data ->> 'name')
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Consent and audit
-- ---------------------------------------------------------------------------

create table public.consent_log (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents (id) on delete cascade,
  student_id uuid references public.students (id) on delete cascade,
  action text not null check (action in ('given', 'withdrawn')),
  version text not null,
  method text not null,
  created_at timestamptz not null default now()
);

create index consent_log_parent_idx on public.consent_log (parent_id);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_log_target_idx on public.audit_log (target_type, target_id);

create or replace function public.write_audit(
  p_action text, p_target_type text, p_target_id text, p_details jsonb default '{}'
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, target_type, target_id, details)
  values ((select auth.uid()), p_action, p_target_type, p_target_id, coalesce(p_details, '{}'));
$$;

-- ---------------------------------------------------------------------------
-- PIN functions (child profile access, PRD §7.1)
-- ---------------------------------------------------------------------------

create or replace function public.set_student_pin(p_student_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be 4 digits';
  end if;
  if not exists (
    select 1 from public.students
    where id = p_student_id and parent_id = (select auth.uid()) and deleted_at is null
  ) and not public.is_staff(array['ops']::public.staff_role[]) then
    raise exception 'Not allowed';
  end if;
  insert into public.student_pins (student_id, pin_hash)
  values (p_student_id, extensions.crypt(p_pin, extensions.gen_salt('bf')))
  on conflict (student_id) do update
    set pin_hash = excluded.pin_hash, failed_attempts = 0, locked_until = null, updated_at = now();
end;
$$;

-- Returns 'ok', 'wrong', 'locked' or 'no_pin'. Five wrong tries lock for 5 minutes.
create or replace function public.verify_student_pin(p_student_id uuid, p_pin text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec public.student_pins%rowtype;
begin
  if not exists (
    select 1 from public.students
    where id = p_student_id and parent_id = (select auth.uid()) and deleted_at is null
  ) then
    raise exception 'Not allowed';
  end if;

  select * into rec from public.student_pins where student_id = p_student_id for update;
  if not found then
    return 'no_pin';
  end if;
  if rec.locked_until is not null and rec.locked_until > now() then
    return 'locked';
  end if;
  if rec.pin_hash = extensions.crypt(p_pin, rec.pin_hash) then
    update public.student_pins set failed_attempts = 0, locked_until = null where student_id = p_student_id;
    return 'ok';
  end if;
  update public.student_pins
    set failed_attempts = rec.failed_attempts + 1,
        locked_until = case when rec.failed_attempts + 1 >= 5 then now() + interval '5 minutes' else null end
    where student_id = p_student_id;
  return 'wrong';
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.staff enable row level security;
alter table public.schools enable row level security;
alter table public.parents enable row level security;
alter table public.students enable row level security;
alter table public.student_pins enable row level security;
alter table public.consent_log enable row level security;
alter table public.audit_log enable row level security;

-- staff
create policy "staff read self" on public.staff
  for select to authenticated using (id = (select auth.uid()));
create policy "admin reads staff" on public.staff
  for select to authenticated using (public.is_staff(array['admin']::public.staff_role[]));
create policy "admin manages staff" on public.staff
  for all to authenticated
  using (public.is_staff(array['admin']::public.staff_role[]))
  with check (public.is_staff(array['admin']::public.staff_role[]));

-- schools
create policy "staff read schools" on public.schools
  for select to authenticated using (public.is_staff());
create policy "sales and ops manage schools" on public.schools
  for all to authenticated
  using (public.is_staff(array['sales', 'ops']::public.staff_role[]))
  with check (public.is_staff(array['sales', 'ops']::public.staff_role[]));

-- parents
create policy "parent reads self" on public.parents
  for select to authenticated using (id = (select auth.uid()));
create policy "parent updates self" on public.parents
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "staff read parents" on public.parents
  for select to authenticated
  using (public.is_staff(array['ops', 'sales', 'marketing']::public.staff_role[]));

-- students
create policy "parent reads own children" on public.students
  for select to authenticated using (parent_id = (select auth.uid()));
create policy "parent adds children" on public.students
  for insert to authenticated with check (parent_id = (select auth.uid()));
create policy "parent updates own children" on public.students
  for update to authenticated
  using (parent_id = (select auth.uid())) with check (parent_id = (select auth.uid()));
create policy "parent removes own children" on public.students
  for delete to authenticated using (parent_id = (select auth.uid()));
create policy "staff read students" on public.students
  for select to authenticated
  using (public.is_staff(array['ops', 'sales', 'reviewer', 'viewer']::public.staff_role[]));
create policy "ops update students" on public.students
  for update to authenticated
  using (public.is_staff(array['ops']::public.staff_role[]))
  with check (public.is_staff(array['ops']::public.staff_role[]));

-- student_pins: no policies. Only the SECURITY DEFINER functions touch it.

-- consent_log
create policy "parent reads own consent" on public.consent_log
  for select to authenticated using (parent_id = (select auth.uid()));
create policy "parent records consent" on public.consent_log
  for insert to authenticated with check (parent_id = (select auth.uid()));
create policy "ops read consent" on public.consent_log
  for select to authenticated using (public.is_staff(array['ops']::public.staff_role[]));

-- audit_log: written only through write_audit(); admins read.
create policy "admin reads audit" on public.audit_log
  for select to authenticated using (public.is_staff(array['admin']::public.staff_role[]));

revoke execute on function public.set_student_pin(uuid, text) from public, anon;
revoke execute on function public.verify_student_pin(uuid, text) from public, anon;
revoke execute on function public.write_audit(text, text, text, jsonb) from public, anon;
grant execute on function public.set_student_pin(uuid, text) to authenticated;
grant execute on function public.verify_student_pin(uuid, text) to authenticated;
grant execute on function public.write_audit(text, text, text, jsonb) to authenticated;
