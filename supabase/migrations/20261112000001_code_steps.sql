-- Phase 7: interactive coding workspaces as lesson step types (curriculum
-- mapping §7). Content shape per type is validated in lib/workspaces/schemas.ts.
alter type public.step_type add value if not exists 'code_blocks';
alter type public.step_type add value if not exists 'code_python';
alter type public.step_type add value if not exists 'code_web';
alter type public.step_type add value if not exists 'sql';
