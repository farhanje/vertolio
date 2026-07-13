begin;

alter table public.promotions
  add column if not exists segmentation_provider text,
  add column if not exists segmentation_model text,
  add column if not exists segmentation_prompt_version text,
  add column if not exists segmentation_taxonomy_version text,
  add column if not exists segmentation_llm_status text,
  add column if not exists segmentation_last_attempt_at timestamptz;

create index if not exists promotions_segmentation_signature_idx
  on public.promotions(
    segmentation_method,
    segmentation_provider,
    segmentation_model,
    segmentation_prompt_version,
    segmentation_taxonomy_version
  );

create table if not exists public.promo_llm_cache (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text not null,
  content_hash text not null,
  prompt_version text not null,
  taxonomy_version text not null,
  result jsonb not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  estimated_cost_usd numeric(12,8) not null default 0 check (estimated_cost_usd >= 0),
  response_id text,
  service_tier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, model, content_hash, prompt_version, taxonomy_version)
);

create index if not exists promo_llm_cache_content_hash_idx
  on public.promo_llm_cache(content_hash, provider, model);

create table if not exists public.promo_llm_usage (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text not null,
  operation text not null default 'segmentation',
  status text not null check (
    status in ('reserved','success','failed','cached','skipped_budget','skipped_daily_limit','disabled')
  ),
  source_id uuid references public.promo_sources(id) on delete set null,
  job_id uuid references public.promo_ingestion_jobs(id) on delete set null,
  promotion_id uuid references public.promotions(id) on delete set null,
  canonical_url text,
  content_hash text,
  prompt_version text not null,
  taxonomy_version text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  reserved_cost_usd numeric(12,8) not null default 0 check (reserved_cost_usd >= 0),
  estimated_cost_usd numeric(12,8) not null default 0 check (estimated_cost_usd >= 0),
  response_id text,
  service_tier text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists promo_llm_usage_month_idx
  on public.promo_llm_usage(created_at, provider, status);
create index if not exists promo_llm_usage_content_hash_idx
  on public.promo_llm_usage(content_hash, provider, model);
create index if not exists promo_llm_usage_job_idx
  on public.promo_llm_usage(job_id, created_at);

alter table public.promo_llm_cache enable row level security;
alter table public.promo_llm_usage enable row level security;

drop trigger if exists promo_llm_cache_updated_at on public.promo_llm_cache;
create trigger promo_llm_cache_updated_at
before update on public.promo_llm_cache
for each row execute function public.set_promo_updated_at();

drop trigger if exists promo_llm_usage_updated_at on public.promo_llm_usage;
create trigger promo_llm_usage_updated_at
before update on public.promo_llm_usage
for each row execute function public.set_promo_updated_at();

alter table public.promo_ingestion_jobs
  add column if not exists records_llm_called integer not null default 0,
  add column if not exists records_llm_cached integer not null default 0,
  add column if not exists records_llm_budget_skipped integer not null default 0,
  add column if not exists records_llm_failed integer not null default 0,
  add column if not exists records_llm_skipped_unchanged integer not null default 0,
  add column if not exists records_rules_only integer not null default 0;

create or replace function public.reserve_promo_llm_request(
  p_provider text,
  p_model text,
  p_operation text,
  p_content_hash text,
  p_prompt_version text,
  p_taxonomy_version text,
  p_source_id uuid,
  p_job_id uuid,
  p_promotion_id uuid,
  p_max_estimated_cost_usd numeric,
  p_monthly_budget_usd numeric,
  p_daily_call_limit integer,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_month_start timestamptz;
  v_day_start timestamptz;
  v_monthly_used numeric := 0;
  v_daily_calls integer := 0;
  v_usage_id uuid;
  v_max_cost numeric := greatest(0, coalesce(p_max_estimated_cost_usd, 0));
  v_budget numeric := greatest(0, coalesce(p_monthly_budget_usd, 0));
  v_daily_limit integer := greatest(1, coalesce(p_daily_call_limit, 1));
begin
  perform pg_advisory_xact_lock(734920260713);

  v_month_start := date_trunc('month', timezone('Asia/Jakarta', v_now)) at time zone 'Asia/Jakarta';
  v_day_start := date_trunc('day', timezone('Asia/Jakarta', v_now)) at time zone 'Asia/Jakarta';

  select coalesce(sum(
    case
      when status = 'reserved' and updated_at >= v_now - interval '1 hour' then reserved_cost_usd
      when status in ('success','failed') then estimated_cost_usd
      else 0
    end
  ), 0)
  into v_monthly_used
  from public.promo_llm_usage
  where created_at >= v_month_start
    and status in ('reserved','success','failed');

  select count(*)
  into v_daily_calls
  from public.promo_llm_usage
  where created_at >= v_day_start
    and (
      status in ('success','failed')
      or (status = 'reserved' and updated_at >= v_now - interval '1 hour')
    );

  if v_daily_calls >= v_daily_limit then
    insert into public.promo_llm_usage(
      provider, model, operation, status, source_id, job_id, promotion_id,
      canonical_url, content_hash, prompt_version, taxonomy_version, metadata
    ) values (
      p_provider, p_model, coalesce(p_operation, 'segmentation'), 'skipped_daily_limit',
      p_source_id, p_job_id, p_promotion_id,
      p_metadata->>'canonicalUrl', p_content_hash, p_prompt_version, p_taxonomy_version,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'dailyCalls', v_daily_calls,
        'dailyCallLimit', v_daily_limit
      )
    ) returning id into v_usage_id;

    return jsonb_build_object(
      'allowed', false,
      'status', 'skipped_daily_limit',
      'usageId', v_usage_id,
      'dailyCalls', v_daily_calls,
      'dailyCallLimit', v_daily_limit,
      'monthlyUsedUsd', v_monthly_used,
      'monthlyBudgetUsd', v_budget
    );
  end if;

  if v_budget <= 0 or v_monthly_used + v_max_cost > v_budget then
    insert into public.promo_llm_usage(
      provider, model, operation, status, source_id, job_id, promotion_id,
      canonical_url, content_hash, prompt_version, taxonomy_version, metadata
    ) values (
      p_provider, p_model, coalesce(p_operation, 'segmentation'), 'skipped_budget',
      p_source_id, p_job_id, p_promotion_id,
      p_metadata->>'canonicalUrl', p_content_hash, p_prompt_version, p_taxonomy_version,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'monthlyUsedUsd', v_monthly_used,
        'monthlyBudgetUsd', v_budget,
        'requestedMaximumUsd', v_max_cost
      )
    ) returning id into v_usage_id;

    return jsonb_build_object(
      'allowed', false,
      'status', 'skipped_budget',
      'usageId', v_usage_id,
      'monthlyUsedUsd', v_monthly_used,
      'monthlyBudgetUsd', v_budget,
      'requestedMaximumUsd', v_max_cost
    );
  end if;

  insert into public.promo_llm_usage(
    provider, model, operation, status, source_id, job_id, promotion_id,
    canonical_url, content_hash, prompt_version, taxonomy_version,
    reserved_cost_usd, metadata
  ) values (
    p_provider, p_model, coalesce(p_operation, 'segmentation'), 'reserved',
    p_source_id, p_job_id, p_promotion_id,
    p_metadata->>'canonicalUrl', p_content_hash, p_prompt_version, p_taxonomy_version,
    v_max_cost, coalesce(p_metadata, '{}'::jsonb)
  ) returning id into v_usage_id;

  return jsonb_build_object(
    'allowed', true,
    'status', 'reserved',
    'usageId', v_usage_id,
    'reservedCostUsd', v_max_cost,
    'monthlyUsedUsd', v_monthly_used,
    'monthlyBudgetUsd', v_budget,
    'dailyCalls', v_daily_calls,
    'dailyCallLimit', v_daily_limit,
    'metadata', coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.reserve_promo_llm_request(
  text, text, text, text, text, text, uuid, uuid, uuid, numeric, numeric, integer, jsonb
) from public, anon, authenticated;
grant execute on function public.reserve_promo_llm_request(
  text, text, text, text, text, text, uuid, uuid, uuid, numeric, numeric, integer, jsonb
) to service_role;

commit;
