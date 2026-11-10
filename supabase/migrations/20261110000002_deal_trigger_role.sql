-- Staff can't hand-edit a deal's status, closed_at or stage_changed_at (they
-- follow the stage). Trusted server code (service role: imports, seeds,
-- automations) may set them directly, e.g. to backfill history.
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
  elsif (select auth.role()) = 'authenticated' then
    new.status := old.status;
    new.closed_at := old.closed_at;
    new.stage_changed_at := old.stage_changed_at;
  end if;
  return new;
end;
$$;
