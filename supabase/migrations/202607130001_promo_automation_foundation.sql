create extension if not exists pgcrypto;

create table if not exists public.promo_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_url text not null,
  source_type text not null default 'official_web',
  adapter_key text not null default 'generic-html',
  check_frequency text not null default 'every_6_hours',
  check_interval_minutes integer not null default 360 check (check_interval_minutes > 0),
  cron_expression text,
  timezone text not null default 'Asia/Jakarta',
  next_run_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_content_change_at timestamptz,
  status text not null default 'healthy'
    check (status in ('healthy','delayed','degraded','failing','paused','unsupported')),
  consecutive_failure_count integer not null default 0 check (consecutive_failure_count >= 0),
  average_execution_ms numeric,
  enabled boolean not null default true,
  auto_publish_enabled boolean not null default false,
  minimum_confidence numeric(4,3) not null default 0.850
    check (minimum_confidence >= 0 and minimum_confidence <= 1),
  request_timeout_ms integer not null default 15000 check (request_timeout_ms between 1000 and 120000),
  max_pages_per_run integer not null default 25 check (max_pages_per_run between 1 and 250),
  adapter_config jsonb not null default '{}'::jsonb,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists promo_sources_base_url_unique
  on public.promo_sources (lower(base_url));

create index if not exists promo_sources_due_idx
  on public.promo_sources (enabled, next_run_at)
  where enabled = true;

create table if not exists public.promo_ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.promo_sources(id) on delete cascade,
  trigger_type text not null default 'scheduled'
    check (trigger_type in ('scheduled','administrator_retry','source_test','backfill','webhook')),
  status text not null default 'queued'
    check (status in ('queued','running','completed','completed_with_warnings','retrying','failed','cancelled')),
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  attempt_number integer not null default 1 check (attempt_number > 0),
  retry_at timestamptz,
  records_discovered integer not null default 0,
  records_created integer not null default 0,
  records_updated integer not null default 0,
  records_unchanged integer not null default 0,
  records_requiring_review integer not null default 0,
  error_message text,
  execution_logs jsonb not null default '[]'::jsonb,
  duration_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists promo_jobs_one_active_per_source
  on public.promo_ingestion_jobs(source_id)
  where status in ('queued','running','retrying');

create index if not exists promo_jobs_claim_idx
  on public.promo_ingestion_jobs(status, retry_at, scheduled_at);

create table if not exists public.promo_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.promo_sources(id) on delete cascade,
  job_id uuid references public.promo_ingestion_jobs(id) on delete set null,
  source_url text not null,
  canonical_url text not null,
  source_title text,
  raw_relevant_text text,
  content_hash text not null,
  publication_date timestamptz,
  extracted_fields jsonb not null default '{}'::jsonb,
  ambiguity_warnings jsonb not null default '[]'::jsonb,
  extraction_confidence numeric(4,3) not null default 0
    check (extraction_confidence >= 0 and extraction_confidence <= 1),
  fetched_at timestamptz not null default now(),
  http_status integer,
  response_headers jsonb not null default '{}'::jsonb,
  document_status text not null default 'fetched'
    check (document_status in ('fetched','extracted','quarantined','error')),
  created_at timestamptz not null default now()
);

create unique index if not exists promo_documents_version_unique
  on public.promo_documents(source_id, canonical_url, content_hash);

create index if not exists promo_documents_source_url_idx
  on public.promo_documents(source_id, canonical_url, fetched_at desc);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.promo_sources(id) on delete restrict,
  canonical_url text not null,
  source_url text not null,
  title text not null,
  merchant text,
  provider text,
  payment_methods text[] not null default '{}',
  minimum_spend numeric,
  benefit_type text
    check (benefit_type is null or benefit_type in ('percentage','cashback_fixed','discount_fixed','points','other')),
  benefit_value numeric,
  maximum_benefit numeric,
  voucher_code text,
  starts_at timestamptz,
  expires_at timestamptz,
  applicable_days text[] not null default '{}',
  eligibility jsonb not null default '{}'::jsonb,
  channels text[] not null default '{}',
  terms_text text,
  calculated_values jsonb not null default '{}'::jsonb,
  status text not null default 'active'
    check (status in ('upcoming','active','expiring_soon','expired','removed','pending_verification')),
  publication_status text not null default 'review'
    check (publication_status in ('published','review','rejected','draft')),
  extraction_confidence numeric(4,3) not null default 0
    check (extraction_confidence >= 0 and extraction_confidence <= 1),
  content_hash text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_verified_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists promotions_source_canonical_unique
  on public.promotions(source_id, canonical_url);

create index if not exists promotions_public_list_idx
  on public.promotions(publication_status, status, expires_at);

create table if not exists public.promotion_versions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  document_id uuid references public.promo_documents(id) on delete set null,
  version_number integer not null check (version_number > 0),
  snapshot jsonb not null,
  material_changes jsonb not null default '[]'::jsonb,
  is_material boolean not null default false,
  created_at timestamptz not null default now(),
  unique (promotion_id, version_number)
);

create table if not exists public.promo_review_queue (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.promo_documents(id) on delete set null,
  promotion_id uuid references public.promotions(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending','in_review','approved','rejected','merged')),
  reasons jsonb not null default '[]'::jsonb,
  suggested_fields jsonb not null default '{}'::jsonb,
  correction jsonb not null default '{}'::jsonb,
  resolution_note text,
  resolved_at timestamptz,
  resolved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists promo_review_queue_status_idx
  on public.promo_review_queue(status, created_at);

create unique index if not exists promo_review_queue_one_open_per_document
  on public.promo_review_queue(document_id)
  where document_id is not null and status in ('pending','in_review');

create or replace function public.set_promo_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists promo_sources_updated_at on public.promo_sources;
create trigger promo_sources_updated_at
before update on public.promo_sources
for each row execute function public.set_promo_updated_at();

drop trigger if exists promo_ingestion_jobs_updated_at on public.promo_ingestion_jobs;
create trigger promo_ingestion_jobs_updated_at
before update on public.promo_ingestion_jobs
for each row execute function public.set_promo_updated_at();

drop trigger if exists promotions_updated_at on public.promotions;
create trigger promotions_updated_at
before update on public.promotions
for each row execute function public.set_promo_updated_at();

drop trigger if exists promo_review_queue_updated_at on public.promo_review_queue;
create trigger promo_review_queue_updated_at
before update on public.promo_review_queue
for each row execute function public.set_promo_updated_at();

create or replace function public.enqueue_due_promo_jobs(
  p_limit integer default 10,
  p_trigger_type text default 'scheduled'
)
returns setof public.promo_ingestion_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  source_row public.promo_sources%rowtype;
  job_row public.promo_ingestion_jobs%rowtype;
begin
  for source_row in
    select s.*
    from public.promo_sources s
    where s.enabled = true
      and s.status not in ('paused','unsupported')
      and s.next_run_at <= now()
      and (s.locked_until is null or s.locked_until < now())
      and not exists (
        select 1
        from public.promo_ingestion_jobs j
        where j.source_id = s.id
          and j.status in ('queued','running','retrying')
      )
    order by s.next_run_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 10), 50))
  loop
    begin
      insert into public.promo_ingestion_jobs(source_id, trigger_type, status, scheduled_at)
      values (source_row.id, p_trigger_type, 'queued', now())
      returning * into job_row;

      update public.promo_sources
      set locked_until = now() + interval '10 minutes',
          last_attempt_at = now()
      where id = source_row.id;

      return next job_row;
    exception when unique_violation then
      continue;
    end;
  end loop;

  return;
end;
$$;

create or replace function public.claim_next_promo_job()
returns setof public.promo_ingestion_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  job_row public.promo_ingestion_jobs%rowtype;
begin
  select *
  into job_row
  from public.promo_ingestion_jobs
  where (
    status = 'queued'
    or (status = 'retrying' and retry_at is not null and retry_at <= now())
  )
  order by scheduled_at asc
  for update skip locked
  limit 1;

  if job_row.id is null then
    return;
  end if;

  update public.promo_ingestion_jobs
  set status = 'running',
      started_at = coalesce(started_at, now()),
      retry_at = null,
      error_message = null
  where id = job_row.id
  returning * into job_row;

  return next job_row;
end;
$$;

revoke all on function public.enqueue_due_promo_jobs(integer, text) from public;
revoke all on function public.claim_next_promo_job() from public;
grant execute on function public.enqueue_due_promo_jobs(integer, text) to service_role;
grant execute on function public.claim_next_promo_job() to service_role;

alter table public.promo_sources enable row level security;
alter table public.promo_ingestion_jobs enable row level security;
alter table public.promo_documents enable row level security;
alter table public.promotions enable row level security;
alter table public.promotion_versions enable row level security;
alter table public.promo_review_queue enable row level security;
