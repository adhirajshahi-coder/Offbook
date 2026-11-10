-- Phase 5: the Offbook CRM (PRD §12). Records, pipelines, activities,
-- campaigns, referral codes, custom fields and saved views.
-- Sales and marketing work the CRM; ops reads families and schools;
-- viewers read for reports. Writes go through RLS as the staff member.

-- ---------------------------------------------------------------------------
-- Records
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  kind text not null default 'school' check (kind in ('school', 'partner', 'other')),
  city text,
  state text,
  board text check (board in ('CBSE', 'ICSE', 'State', 'IB', 'IGCSE', 'Other')),
  website text,
  school_id uuid unique references public.schools (id) on delete set null,
  owner_id uuid references auth.users (id) on delete set null,
  custom jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organizations_name_idx on public.organizations (lower(name));

alter table public.schools add constraint schools_crm_org_fk foreign key (crm_org_id) references public.organizations (id) on delete set null;

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  email text check (email is null or email = lower(email)),
  phone text,
  title text,
  kind text not null default 'other' check (kind in ('principal', 'coordinator', 'teacher', 'parent_lead', 'creator', 'partner', 'other')),
  parent_id uuid references public.parents (id) on delete set null,
  owner_id uuid references auth.users (id) on delete set null,
  source text,
  campaign_id uuid,
  utm jsonb not null default '{}',
  referrer text,
  custom jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index contacts_email_key on public.contacts (email) where email is not null;
create index contacts_phone_idx on public.contacts (regexp_replace(phone, '\D', '', 'g')) where phone is not null;
create index contacts_org_idx on public.contacts (organization_id);

-- A family is a paying parent and their children; this holds the CRM side.
create table public.families (
  parent_id uuid primary key references public.parents (id) on delete cascade,
  owner_id uuid references auth.users (id) on delete set null,
  at_risk boolean not null default false,
  at_risk_since timestamptz,
  custom jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Pipelines and deals
-- ---------------------------------------------------------------------------

create table public.pipelines (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null check (kind in ('school', 'family')),
  stale_days smallint not null default 14 check (stale_days between 1 and 365),
  order_index smallint not null default 0,
  created_at timestamptz not null default now()
);

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines (id) on delete cascade,
  name text not null,
  order_index smallint not null,
  probability smallint not null default 10 check (probability between 0 and 100),
  outcome text not null default 'open' check (outcome in ('open', 'won', 'lost')),
  unique (pipeline_id, order_index) deferrable initially deferred
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'other' check (kind in ('creator', 'school_outreach', 'webinar', 'ads', 'event', 'other')),
  utm_campaign text unique,
  spend_paise integer not null default 0 check (spend_paise >= 0),
  starts_on date,
  ends_on date,
  owner_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contacts add constraint contacts_campaign_fk foreign key (campaign_id) references public.campaigns (id) on delete set null;

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines (id) on delete restrict,
  stage_id uuid not null references public.pipeline_stages (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 160),
  organization_id uuid references public.organizations (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  family_parent_id uuid references public.families (parent_id) on delete set null,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  owner_id uuid references auth.users (id) on delete set null,
  value_paise integer not null default 0 check (value_paise >= 0),
  expected_close date,
  source text,
  campaign_id uuid references public.campaigns (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'won', 'lost')),
  lost_reason text,
  stage_changed_at timestamptz not null default now(),
  closed_at timestamptz,
  custom jsonb not null default '{}',
  -- Set by automations so a rule never creates the same deal twice.
  automation_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deals_pipeline_idx on public.deals (pipeline_id, stage_id);
create index deals_owner_idx on public.deals (owner_id, status);

create table public.deal_stage_history (
  id bigint generated always as identity primary key,
  deal_id uuid not null references public.deals (id) on delete cascade,
  from_stage uuid references public.pipeline_stages (id) on delete set null,
  to_stage uuid not null references public.pipeline_stages (id) on delete cascade,
  changed_by uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default now()
);

create index deal_stage_history_deal_idx on public.deal_stage_history (deal_id, changed_at);

-- Keep status, closed_at, stage_changed_at and the stage history in step
-- with the stage. History has no client write policy, hence security definer.
create or replace function public.deal_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare o text;
begin
  select outcome into o from public.pipeline_stages where id = new.stage_id and pipeline_id = new.pipeline_id;
  if o is null then
    raise exception 'Stage does not belong to this pipeline';
  end if;
  new.status := o;
  new.stage_changed_at := now();
  new.closed_at := case when o = 'open' then null else now() end;
  return new;
end;
$$;

create or replace function public.deal_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.deal_stage_history (deal_id, from_stage, to_stage, changed_by) values (new.id, null, new.stage_id, auth.uid());
  return null;
end;
$$;

create or replace function public.deal_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare o text;
begin
  if new.stage_id is distinct from old.stage_id or new.pipeline_id is distinct from old.pipeline_id then
    select outcome into o from public.pipeline_stages where id = new.stage_id and pipeline_id = new.pipeline_id;
    if o is null then
      raise exception 'Stage does not belong to this pipeline';
    end if;
    new.status := o;
    new.stage_changed_at := now();
    new.closed_at := case when o = 'open' then null else now() end;
    insert into public.deal_stage_history (deal_id, from_stage, to_stage, changed_by) values (new.id, old.stage_id, new.stage_id, auth.uid());
  else
    new.status := old.status;
    new.closed_at := old.closed_at;
    new.stage_changed_at := old.stage_changed_at;
  end if;
  return new;
end;
$$;

create trigger deals_before_insert before insert on public.deals for each row execute function public.deal_before_insert();
create trigger deals_after_insert after insert on public.deals for each row execute function public.deal_after_insert();
create trigger deals_before_update before update on public.deals for each row execute function public.deal_before_update();

-- ---------------------------------------------------------------------------
-- Activities: calls, meetings, WhatsApp, email, notes and tasks
-- ---------------------------------------------------------------------------

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('call', 'meeting', 'whatsapp', 'email', 'note', 'task')),
  subject text not null check (char_length(subject) between 1 and 200),
  body text check (char_length(body) <= 4000),
  due_at timestamptz,
  done_at timestamptz,
  owner_id uuid references auth.users (id) on delete set null,
  deal_id uuid references public.deals (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  family_parent_id uuid references public.families (parent_id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  automation_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index activities_owner_due_idx on public.activities (owner_id, due_at) where done_at is null;
create index activities_deal_idx on public.activities (deal_id);
create index activities_contact_idx on public.activities (contact_id);
create index activities_org_idx on public.activities (organization_id);
create index activities_family_idx on public.activities (family_parent_id);

-- ---------------------------------------------------------------------------
-- Referral codes (creators, student ambassadors)
-- ---------------------------------------------------------------------------

create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9-]{3,24}$'),
  contact_id uuid references public.contacts (id) on delete set null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  payout_percent smallint not null default 0 check (payout_percent between 0 and 100),
  paid_out_paise integer not null default 0 check (paid_out_paise >= 0),
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions add constraint subscriptions_referral_fk foreign key (referral_code_id) references public.referral_codes (id) on delete set null;
alter table public.parents add column referral_code_id uuid references public.referral_codes (id) on delete set null;
alter table public.parents add column signup_utm jsonb not null default '{}';

-- ---------------------------------------------------------------------------
-- Custom fields, saved views, CRM state
-- ---------------------------------------------------------------------------

create table public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  object text not null check (object in ('contact', 'organization', 'deal', 'family')),
  key text not null check (key ~ '^[a-z][a-z0-9_]{1,39}$'),
  label text not null,
  type text not null check (type in ('text', 'number', 'date', 'select', 'multi_select', 'url')),
  options jsonb not null default '[]',
  order_index smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (object, key)
);

create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  object text not null check (object in ('contact', 'organization', 'deal', 'family')),
  name text not null check (char_length(name) between 1 and 80),
  filters jsonb not null default '{}',
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  shared boolean not null default false,
  created_at timestamptz not null default now()
);

-- Round-robin pointer and similar small state.
create table public.crm_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Reminder log so automations send each email once.
create table public.automation_log (
  key text primary key,
  created_at timestamptz not null default now()
);

-- lead_submissions gain a link to the contact they became.
alter table public.lead_submissions add column contact_id uuid references public.contacts (id) on delete set null;

-- updated_at
do $$
declare t text;
begin
  foreach t in array array['organizations', 'contacts', 'families', 'campaigns', 'deals', 'activities', 'referral_codes'] loop
    execute format('create trigger %1$s_updated_at before update on public.%1$I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'organizations', 'contacts', 'families', 'pipelines', 'pipeline_stages', 'campaigns', 'deals',
    'deal_stage_history', 'activities', 'referral_codes', 'custom_fields'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "crm read %1$s" on public.%1$I for select to authenticated '
      'using (public.is_staff(array[''sales'', ''marketing'', ''ops'', ''viewer'']::public.staff_role[]))', t
    );
  end loop;
  -- Sales and marketing write records and activities.
  foreach t in array array['organizations', 'contacts', 'families', 'campaigns', 'deals', 'activities', 'referral_codes'] loop
    execute format(
      'create policy "crm write %1$s" on public.%1$I for all to authenticated '
      'using (public.is_staff(array[''sales'', ''marketing'']::public.staff_role[])) '
      'with check (public.is_staff(array[''sales'', ''marketing'']::public.staff_role[]))', t
    );
  end loop;
end $$;

-- Ops also flags families and logs support activities.
create policy "ops update families" on public.families for update to authenticated
  using (public.is_staff(array['ops']::public.staff_role[])) with check (public.is_staff(array['ops']::public.staff_role[]));
create policy "ops log family activities" on public.activities for insert to authenticated
  with check (public.is_staff(array['ops']::public.staff_role[]) and family_parent_id is not null);

-- Pipeline setup and custom fields are admin settings (admins pass is_staff with any list).
create policy "admin configures pipelines" on public.pipelines for all to authenticated
  using (public.is_staff(array[]::public.staff_role[])) with check (public.is_staff(array[]::public.staff_role[]));
create policy "admin configures stages" on public.pipeline_stages for all to authenticated
  using (public.is_staff(array[]::public.staff_role[])) with check (public.is_staff(array[]::public.staff_role[]));
create policy "admin configures fields" on public.custom_fields for all to authenticated
  using (public.is_staff(array[]::public.staff_role[])) with check (public.is_staff(array[]::public.staff_role[]));

-- Saved views: your own, plus shared ones.
alter table public.saved_views enable row level security;
create policy "staff read views" on public.saved_views for select to authenticated
  using (public.is_staff() and (owner_id = (select auth.uid()) or shared));
create policy "staff manage own views" on public.saved_views for all to authenticated
  using (public.is_staff() and owner_id = (select auth.uid()))
  with check (public.is_staff() and owner_id = (select auth.uid()));

-- Server-only state.
alter table public.crm_state enable row level security;
alter table public.automation_log enable row level security;

-- ---------------------------------------------------------------------------
-- Default pipelines (PRD §12.2). Editable in HQ → Settings → Pipelines.
-- ---------------------------------------------------------------------------

with p as (
  insert into public.pipelines (slug, name, kind, stale_days, order_index)
  values ('schools', 'Schools', 'school', 14, 0), ('families', 'Families', 'family', 21, 1)
  returning id, slug
)
insert into public.pipeline_stages (pipeline_id, name, order_index, probability, outcome)
select p.id, s.name, s.ord, s.prob, s.outcome
from p
join (values
  ('schools', 'New', 0, 5, 'open'),
  ('schools', 'Contacted', 1, 10, 'open'),
  ('schools', 'Meeting booked', 2, 20, 'open'),
  ('schools', 'Pilot agreed', 3, 40, 'open'),
  ('schools', 'Pilot running', 4, 55, 'open'),
  ('schools', 'Proposal sent', 5, 70, 'open'),
  ('schools', 'Paid', 6, 100, 'won'),
  ('schools', 'Renewal', 7, 80, 'open'),
  ('schools', 'Lost', 8, 0, 'lost'),
  ('families', 'Signed up', 0, 10, 'open'),
  ('families', 'Trial / preview', 1, 25, 'open'),
  ('families', 'Paid', 2, 100, 'won'),
  ('families', 'Active (30 days)', 3, 100, 'won'),
  ('families', 'Renewal due', 4, 60, 'open'),
  ('families', 'Renewed', 5, 100, 'won'),
  ('families', 'Lost', 6, 0, 'lost')
) as s(slug, name, ord, prob, outcome) on s.slug = p.slug;
