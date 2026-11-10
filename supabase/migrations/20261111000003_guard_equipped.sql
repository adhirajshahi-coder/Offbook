-- Kube outfits are set by trusted server code after checking the item was
-- bought with coins; parents (who can edit their child's profile) can't set
-- them directly.
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
      or new.parent_id is distinct from old.parent_id
      or new.equipped is distinct from old.equipped then
      raise exception 'These fields change through progress, not edits';
    end if;
  end if;
  return new;
end;
$$;
