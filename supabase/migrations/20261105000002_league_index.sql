-- Weekly leagues: students.league_opt_in (identity migration, default off)
-- is what parents toggle. This adds the index the weekly lookups use.
create index league_members_week_idx on public.league_members (week_start, league_id);
