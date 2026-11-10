-- A plain unique constraint (NULLs never collide) so upserts can target it.
drop index public.contacts_email_key;
alter table public.contacts add constraint contacts_email_key unique (email);
