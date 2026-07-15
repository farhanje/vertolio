begin;

alter table public.promotions
  add column if not exists offer_summary text,
  add column if not exists requirements_summary text,
  add column if not exists publishability_status text not null default 'unresolved',
  add column if not exists publishability_score numeric(4,3) not null default 0,
  add column if not exists publishability_missing text[] not null default '{}',
  add column if not exists boundary_status text not null default 'unknown',
  add column if not exists boundary_diagnostics jsonb not null default '{}'::jsonb;

alter table public.promotions
  drop constraint if exists promotions_publishability_status_check;
alter table public.promotions
  add constraint promotions_publishability_status_check
  check (publishability_status in ('publishable','catalog_listing','unresolved'));

alter table public.promo_documents
  add column if not exists boundary_status text not null default 'unknown',
  add column if not exists boundary_diagnostics jsonb not null default '{}'::jsonb;

create table if not exists public.promo_ai_resolution_queue (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  document_id uuid references public.promo_documents(id) on delete cascade,
  source_id uuid not null references public.promo_sources(id) on delete cascade,
  content_hash text not null,
  missing_fields text[] not null default '{}',
  status text not null default 'queued'
    check (status in ('queued','running','completed','failed','cancelled')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error text,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (promotion_id, content_hash)
);

create index if not exists promo_ai_resolution_queue_claim_idx
  on public.promo_ai_resolution_queue(status, next_attempt_at, created_at)
  where status in ('queued','running');

create or replace function public.claim_promo_ai_resolution_batch(p_limit integer default 6)
returns setof public.promo_ai_resolution_queue
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select q.id
    from public.promo_ai_resolution_queue q
    where q.status = 'queued'
      and q.next_attempt_at <= now()
    order by q.created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 6), 10))
  )
  update public.promo_ai_resolution_queue q
  set status = 'running',
      attempt_count = q.attempt_count + 1,
      updated_at = now(),
      last_error = null
  from candidates c
  where q.id = c.id
  returning q.*;
end;
$$;

create or replace function public.set_promo_ai_resolution_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists promo_ai_resolution_updated_at on public.promo_ai_resolution_queue;
create trigger promo_ai_resolution_updated_at
before update on public.promo_ai_resolution_queue
for each row execute function public.set_promo_ai_resolution_updated_at();

revoke all on function public.claim_promo_ai_resolution_batch(integer) from public;
grant execute on function public.claim_promo_ai_resolution_batch(integer) to service_role;

alter table public.promo_ai_resolution_queue enable row level security;

update public.promotions
set offer_summary = coalesce(
      nullif(offer_summary, ''),
      nullif(regexp_replace(title, '^.*?\s[-–—:]\s+', ''), title),
      title
    ),
    requirements_summary = coalesce(requirements_summary, eligibility_summary, ''),
    publishability_status = case
      when verification_status = 'catalog_listing' then 'catalog_listing'
      when verification_status = 'verified' then 'publishable'
      else 'unresolved'
    end,
    publishability_score = case
      when verification_status in ('verified','catalog_listing') then 1
      else extraction_confidence
    end,
    publishability_missing = case
      when verification_status in ('verified','catalog_listing') then '{}'
      else array['legacy_reassessment_required']
    end
where true;

commit;
