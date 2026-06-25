-- Research session resume/autosave state.
-- Run once in Supabase SQL Editor.

alter table public.sessions
add column if not exists "progressState" jsonb;

create index if not exists sessions_progress_state_idx
on public.sessions using gin ("progressState");
