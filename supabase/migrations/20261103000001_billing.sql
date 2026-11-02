-- Phase 1: plans, coupons, subscriptions, invoices, refunds, payment events,
-- editable policy pages and marketing lead capture. PRD §7.11, §11, §12.3, §13, §15.
-- Money is integer paise. Prices live in `plans`, never in code.

-- ---------------------------------------------------------------------------
-- Plans and discounts
-- ---------------------------------------------------------------------------

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  price_paise integer not null check (price_paise >= 0),
  tax_rate numeric(5, 2) not null default 18.00 check (tax_rate between 0 and 100),
  tax_inclusive boolean not null default true,
  duration_days integer not null default 365 check (duration_days > 0),
  features jsonb not null default '[]',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  kind text not null check (kind in ('percent', 'flat')),
  value integer not null check (value > 0),   -- percent (1–100) or paise
  max_uses integer,
  used_count integer not null default 0,
  valid_from timestamptz,
  valid_to timestamptz,
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100)
);

-- School partners can carry a discount for families who join with their code.
alter table public.schools
  add column discount_percent smallint not null default 0 check (discount_percent between 0 and 100);

-- ---------------------------------------------------------------------------
-- Subscriptions, invoices, refunds
-- ---------------------------------------------------------------------------

create type public.subscription_status as enum ('pending', 'active', 'expired', 'cancelled', 'refunded');

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  parent_id uuid not null references public.parents (id) on delete cascade,
  plan_id uuid not null references public.plans (id),
  status public.subscription_status not null default 'pending',
  starts_at timestamptz,
  ends_at timestamptz,
  amount_paise integer not null check (amount_paise >= 0),
  list_price_paise integer not null,
  discount_paise integer not null default 0,
  coupon_id uuid references public.coupons (id) on delete set null,
  school_id uuid references public.schools (id) on delete set null,
  referral_code_id uuid,
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  renewal_reminders boolean not null default true,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_student_idx on public.subscriptions (student_id, status);
create index subscriptions_parent_idx on public.subscriptions (parent_id);
create index subscriptions_ends_idx on public.subscriptions (ends_at) where status = 'active';

create sequence public.invoice_number_seq;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  subscription_id uuid not null references public.subscriptions (id) on delete restrict,
  parent_id uuid not null references public.parents (id) on delete cascade,
  amount_paise integer not null,
  tax_paise integer not null,
  tax_rate numeric(5, 2) not null,
  tax_inclusive boolean not null,
  lines jsonb not null default '[]',
  issued_at timestamptz not null default now()
);

create index invoices_parent_idx on public.invoices (parent_id);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  parent_id uuid not null references public.parents (id) on delete cascade,
  reason text check (char_length(reason) <= 1000),
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'processed')),
  amount_paise integer,
  razorpay_refund_id text,
  handled_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Razorpay webhook events, keyed by event id for idempotency.
create table public.payment_events (
  id text primary key,
  type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Policies (privacy, terms, refunds, safety): editable text, PRD §13
-- ---------------------------------------------------------------------------

create table public.policies (
  slug text primary key,
  title text not null,
  body text not null,          -- Markdown
  version text not null,
  meta jsonb not null default '{}',  -- e.g. refunds: {"window_days": 7}
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Marketing leads (feeds the CRM built in Phase 5), PRD §12.3
-- ---------------------------------------------------------------------------

create table public.lead_submissions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('school_pilot', 'demo', 'newsletter')),
  name text,
  email text,
  phone text,
  organization text,
  city text,
  role text,
  message text check (char_length(message) <= 2000),
  utm jsonb not null default '{}',
  referrer text,
  status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'closed')),
  created_at timestamptz not null default now()
);

create index lead_submissions_email_idx on public.lead_submissions (lower(email));

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['plans', 'coupons', 'subscriptions', 'refunds'] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_updated_at', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Activation: one atomic, idempotent step for checkout and webhook alike.
-- Returns the subscription id when this call activated it, null otherwise.
-- ---------------------------------------------------------------------------

create or replace function public.activate_subscription(p_order_id text, p_payment_id text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub public.subscriptions%rowtype;
  pl public.plans%rowtype;
  tax integer;
  start_at timestamptz;
begin
  select * into sub from public.subscriptions
    where razorpay_order_id = p_order_id for update;
  if not found or sub.status <> 'pending' then
    return null;
  end if;

  select * into pl from public.plans where id = sub.plan_id;

  -- A renewal starts when the current period ends, so nobody loses days.
  select greatest(now(), coalesce(max(ends_at), now())) into start_at
    from public.subscriptions
    where student_id = sub.student_id and status = 'active' and id <> sub.id;

  update public.subscriptions
    set status = 'active',
        razorpay_payment_id = p_payment_id,
        starts_at = start_at,
        ends_at = start_at + make_interval(days => pl.duration_days)
    where id = sub.id;

  if sub.coupon_id is not null then
    update public.coupons set used_count = used_count + 1 where id = sub.coupon_id;
  end if;
  if sub.school_id is not null then
    update public.students set school_id = sub.school_id where id = sub.student_id and school_id is null;
  end if;

  -- amount_paise is always the total charged (tax added on top when the plan
  -- is tax-exclusive), so the tax share is the same formula either way.
  tax := round(sub.amount_paise * pl.tax_rate / (100 + pl.tax_rate));

  insert into public.invoices (number, subscription_id, parent_id, amount_paise, tax_paise, tax_rate, tax_inclusive, lines)
  values (
    'OB-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0'),
    sub.id, sub.parent_id, sub.amount_paise, tax, pl.tax_rate, pl.tax_inclusive,
    jsonb_build_array(
      jsonb_build_object('label', pl.name, 'amount_paise', sub.list_price_paise),
      jsonb_build_object('label', 'Discount', 'amount_paise', -sub.discount_paise)
    )
  );

  return sub.id;
end;
$$;

revoke execute on function public.activate_subscription(text, text) from public, anon, authenticated;
grant execute on function public.activate_subscription(text, text) to service_role;

-- Whether a child can play right now. Used by the app and, from Phase 2, by
-- content RPCs.
create or replace function public.has_active_subscription(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions
    where student_id = p_student_id and status = 'active'
      and starts_at <= now() and ends_at > now()
  )
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.plans enable row level security;
alter table public.coupons enable row level security;
alter table public.subscriptions enable row level security;
alter table public.invoices enable row level security;
alter table public.refunds enable row level security;
alter table public.payment_events enable row level security;
alter table public.policies enable row level security;
alter table public.lead_submissions enable row level security;

-- plans: public (pricing page); ops/admin manage
create policy "anyone reads active plans" on public.plans
  for select to anon, authenticated using (active);
create policy "staff read plans" on public.plans
  for select to authenticated using (public.is_staff());
create policy "ops manage plans" on public.plans
  for all to authenticated
  using (public.is_staff(array['ops']::public.staff_role[]))
  with check (public.is_staff(array['ops']::public.staff_role[]));

-- coupons: validated server-side only; staff manage
create policy "staff read coupons" on public.coupons
  for select to authenticated using (public.is_staff(array['ops', 'sales', 'marketing']::public.staff_role[]));
create policy "ops and marketing manage coupons" on public.coupons
  for all to authenticated
  using (public.is_staff(array['ops', 'marketing']::public.staff_role[]))
  with check (public.is_staff(array['ops', 'marketing']::public.staff_role[]));

-- subscriptions: parents read their own; writes go through the server
create policy "parent reads own subscriptions" on public.subscriptions
  for select to authenticated using (parent_id = (select auth.uid()));
create policy "parent turns renewal reminders on or off" on public.subscriptions
  for update to authenticated
  using (parent_id = (select auth.uid())) with check (parent_id = (select auth.uid()));
create policy "staff read subscriptions" on public.subscriptions
  for select to authenticated using (public.is_staff(array['ops', 'sales', 'viewer']::public.staff_role[]));
create policy "ops manage subscriptions" on public.subscriptions
  for update to authenticated
  using (public.is_staff(array['ops']::public.staff_role[]))
  with check (public.is_staff(array['ops']::public.staff_role[]));

-- Parents may only flip renewal reminders, nothing else.
create or replace function public.guard_subscription_parent_update()
returns trigger
language plpgsql
as $$
begin
  if (select auth.role()) = 'authenticated' and not public.is_staff(array['ops']::public.staff_role[]) then
    if (to_jsonb(new) - 'renewal_reminders' - 'updated_at') is distinct from (to_jsonb(old) - 'renewal_reminders' - 'updated_at') then
      raise exception 'Only renewal reminders can be changed here';
    end if;
  end if;
  return new;
end;
$$;

create trigger subscriptions_guard_parent before update on public.subscriptions
  for each row execute function public.guard_subscription_parent_update();

-- invoices
create policy "parent reads own invoices" on public.invoices
  for select to authenticated using (parent_id = (select auth.uid()));
create policy "staff read invoices" on public.invoices
  for select to authenticated using (public.is_staff(array['ops', 'viewer']::public.staff_role[]));

-- refunds
create policy "parent reads own refunds" on public.refunds
  for select to authenticated using (parent_id = (select auth.uid()));
create policy "parent requests refunds" on public.refunds
  for insert to authenticated
  with check (
    parent_id = (select auth.uid())
    and status = 'requested'
    and exists (select 1 from public.subscriptions s where s.id = subscription_id and s.parent_id = (select auth.uid()))
  );
create policy "ops handle refunds" on public.refunds
  for all to authenticated
  using (public.is_staff(array['ops']::public.staff_role[]))
  with check (public.is_staff(array['ops']::public.staff_role[]));

-- payment_events: service role only (no policies)

-- policies: public read; ops/admin edit
create policy "anyone reads policies" on public.policies
  for select to anon, authenticated using (true);
create policy "ops edit policies" on public.policies
  for all to authenticated
  using (public.is_staff(array['ops']::public.staff_role[]))
  with check (public.is_staff(array['ops']::public.staff_role[]));

-- lead_submissions: inserted by the server; sales and marketing read
create policy "sales and marketing read leads" on public.lead_submissions
  for select to authenticated using (public.is_staff(array['sales', 'marketing']::public.staff_role[]));
create policy "sales and marketing update leads" on public.lead_submissions
  for update to authenticated
  using (public.is_staff(array['sales', 'marketing']::public.staff_role[]))
  with check (public.is_staff(array['sales', 'marketing']::public.staff_role[]));

-- The public site shows the zone map and course list (not lesson content).
create policy "visitors read published tracks" on public.tracks
  for select to anon using (status = 'published');
create policy "visitors read published courses" on public.courses
  for select to anon using (status = 'published');
create policy "visitors read slots" on public.course_slots
  for select to anon using (true);

grant execute on function public.has_active_subscription(uuid) to authenticated;
