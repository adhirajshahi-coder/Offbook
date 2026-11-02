-- Service-role-only helper so the seed script can set demo PINs.
create or replace function public.seed_set_student_pin(p_student_id uuid, p_pin text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.student_pins (student_id, pin_hash)
  values (p_student_id, extensions.crypt(p_pin, extensions.gen_salt('bf')))
  on conflict (student_id) do update set pin_hash = excluded.pin_hash, failed_attempts = 0, locked_until = null;
$$;

revoke execute on function public.seed_set_student_pin(uuid, text) from public, anon, authenticated;
grant execute on function public.seed_set_student_pin(uuid, text) to service_role;
