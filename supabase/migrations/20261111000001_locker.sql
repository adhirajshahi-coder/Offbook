-- Phase 6: the Locker (PRD §7.8, §7.10). Coins come from XP (1 coin per 10
-- XP, computed); purchases are recorded here. Cosmetics only: nothing in the
-- Locker affects learning or access. No real money, ever.

create table public.locker_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null check (kind in ('accessory', 'color')),
  -- Which built-in renderer draws it on Kube (components/kid/Kube.tsx).
  asset text not null,
  price_coins integer not null check (price_coins between 0 and 10000),
  min_level smallint not null default 1 check (min_level between 1 and 50),
  order_index smallint not null default 0,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now()
);

create table public.student_items (
  student_id uuid not null references public.students (id) on delete cascade,
  item_id uuid not null references public.locker_items (id) on delete cascade,
  price_paid integer not null,
  bought_at timestamptz not null default now(),
  primary key (student_id, item_id)
);

-- What Kube is wearing: { "accessory": "<slug>", "color": "<slug>" }.
alter table public.students add column equipped jsonb not null default '{}';

alter table public.locker_items enable row level security;
create policy "families read published locker items" on public.locker_items for select to authenticated using (status = 'published');
create policy "staff read locker items" on public.locker_items for select to authenticated using (public.is_staff());
create policy "content team writes locker items" on public.locker_items for all to authenticated
  using (public.is_staff(array['content']::public.staff_role[])) with check (public.is_staff(array['content']::public.staff_role[]));

alter table public.student_items enable row level security;
create policy "parent reads own child items" on public.student_items for select to authenticated using (public.is_my_child(student_id));
create policy "staff read student items" on public.student_items for select to authenticated using (public.is_staff(array['ops', 'viewer']::public.staff_role[]));

insert into public.locker_items (slug, name, kind, asset, price_coins, min_level, order_index) values
  ('cap-violet', 'Street cap', 'accessory', 'cap', 30, 1, 1),
  ('shades', 'Cool shades', 'accessory', 'shades', 40, 1, 2),
  ('headphones', 'Study headphones', 'accessory', 'headphones', 60, 2, 3),
  ('bowtie', 'Bow tie', 'accessory', 'bowtie', 50, 2, 4),
  ('flower', 'Marigold', 'accessory', 'flower', 35, 1, 5),
  ('scarf', 'Winter scarf', 'accessory', 'scarf', 80, 3, 6),
  ('color-mint', 'Mint Kube', 'color', 'mint', 60, 2, 10),
  ('color-sky', 'Sky Kube', 'color', 'sky', 60, 2, 11),
  ('color-sunset', 'Sunset Kube', 'color', 'sunset', 100, 4, 12),
  ('color-midnight', 'Midnight Kube', 'color', 'midnight', 150, 6, 13);
