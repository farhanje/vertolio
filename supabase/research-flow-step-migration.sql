-- Research runner logging upgrade
-- Run this once in Supabase SQL Editor before collecting real participant data.
-- It is additive only: no tables are dropped.

create extension if not exists "pgcrypto";

create table if not exists public.flow_step_runs (
  id uuid primary key default gen_random_uuid(),
  "studyId" uuid not null references public.studies(id) on delete cascade,
  "sessionId" uuid not null references public.sessions(id) on delete cascade,
  "stepId" text not null,
  "stepType" text not null check ("stepType" in ('question', 'prototype_task', 'info', 'survey')),
  "stepOrder" int,
  variant text,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'skipped', 'abandoned')),
  "startedAt" timestamptz not null default now(),
  "endedAt" timestamptz,
  "durationMs" int,
  meta jsonb
);

create index if not exists flow_step_runs_session_order_idx
on public.flow_step_runs("sessionId", "stepOrder");

create index if not exists flow_step_runs_study_variant_idx
on public.flow_step_runs("studyId", variant);

alter table public.sessions
add column if not exists "researchType" text,
add column if not exists "configSnapshot" jsonb,
add column if not exists "sanityRevision" text,
add column if not exists "deviceViewport" jsonb;

alter table public.task_runs
add column if not exists "flowStepRunId" uuid references public.flow_step_runs(id) on delete set null,
add column if not exists "flowStepId" text,
add column if not exists "flowStepOrder" int;

alter table public.screen_events
add column if not exists "flowStepRunId" uuid references public.flow_step_runs(id) on delete set null,
add column if not exists "flowStepId" text,
add column if not exists "flowStepOrder" int;

alter table public.survey_responses
add column if not exists "flowStepRunId" uuid references public.flow_step_runs(id) on delete set null,
add column if not exists "flowStepId" text,
add column if not exists "flowStepOrder" int,
add column if not exists "questionOrder" int;

create index if not exists task_runs_flow_step_idx
on public.task_runs("flowStepRunId");

create index if not exists screen_events_flow_step_idx
on public.screen_events("flowStepRunId");

create index if not exists survey_responses_flow_step_idx
on public.survey_responses("flowStepRunId");
