begin;

alter table public.promotions
  add column if not exists primary_category text not null default 'other',
  add column if not exists categories text[] not null default array['other']::text[],
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists location_scope text not null default 'unknown',
  add column if not exists cities text[] not null default '{}'::text[],
  add column if not exists provinces text[] not null default '{}'::text[],
  add column if not exists outlet_count integer not null default 0,
  add column if not exists segmentation_method text not null default 'rules',
  add column if not exists segmentation_confidence numeric(4,3) not null default 0;

alter table public.promotions
  drop constraint if exists promotions_primary_category_check,
  add constraint promotions_primary_category_check check (
    primary_category in (
      'food_dining','groceries','travel','transportation','shopping','fashion','electronics',
      'entertainment','health_beauty','bills_utilities','financial_services','education',
      'home_living','automotive','other'
    )
  ),
  drop constraint if exists promotions_location_scope_check,
  add constraint promotions_location_scope_check check (
    location_scope in ('nationwide','online','regional','city','outlet','unknown')
  ),
  drop constraint if exists promotions_outlet_count_check,
  add constraint promotions_outlet_count_check check (outlet_count >= 0),
  drop constraint if exists promotions_segmentation_method_check,
  add constraint promotions_segmentation_method_check check (
    segmentation_method in ('rules','llm_hybrid')
  ),
  drop constraint if exists promotions_segmentation_confidence_check,
  add constraint promotions_segmentation_confidence_check check (
    segmentation_confidence >= 0 and segmentation_confidence <= 1
  );

create index if not exists promotions_primary_category_idx
  on public.promotions(primary_category, publication_status, status);
create index if not exists promotions_location_scope_idx
  on public.promotions(location_scope, publication_status, status);
create index if not exists promotions_categories_gin_idx
  on public.promotions using gin(categories);
create index if not exists promotions_cities_gin_idx
  on public.promotions using gin(cities);
create index if not exists promotions_tags_gin_idx
  on public.promotions using gin(tags);

create table if not exists public.promo_outlets (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  outlet_name text not null,
  address text,
  city text,
  province text,
  postal_code text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  source_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists promo_outlets_atomic_unique
  on public.promo_outlets(
    promotion_id,
    lower(outlet_name),
    coalesce(lower(address), ''),
    coalesce(lower(city), '')
  );
create index if not exists promo_outlets_promotion_idx
  on public.promo_outlets(promotion_id);
create index if not exists promo_outlets_city_idx
  on public.promo_outlets(city, promotion_id);

alter table public.promo_outlets enable row level security;

drop trigger if exists promo_outlets_updated_at on public.promo_outlets;
create trigger promo_outlets_updated_at
before update on public.promo_outlets
for each row execute function public.set_promo_updated_at();

alter table public.promo_ingestion_jobs
  add column if not exists records_deleted integer not null default 0,
  add column if not exists records_expired_skipped integer not null default 0;

update public.promo_sources
set auto_publish_enabled = true
where adapter_key in ('bca','ultra-voucher');

commit;
