begin;

alter table public.promotions
  add column if not exists is_promotion boolean not null default true,
  add column if not exists promotion_confidence numeric(4,3) not null default 0,
  add column if not exists ai_summary text,
  add column if not exists quota_text text,
  add column if not exists eligibility_summary text,
  add column if not exists field_confidence jsonb not null default '{}'::jsonb,
  add column if not exists field_evidence jsonb not null default '{}'::jsonb,
  add column if not exists intelligence_warnings jsonb not null default '[]'::jsonb,
  add column if not exists contradictions jsonb not null default '[]'::jsonb,
  add column if not exists source_trust_level text not null default 'unverified',
  add column if not exists source_trust_reasons jsonb not null default '[]'::jsonb,
  add column if not exists verification_status text not null default 'needs_attention',
  add column if not exists duplicate_fingerprint text,
  add column if not exists duplicate_of uuid references public.promotions(id) on delete set null,
  add column if not exists intelligence_method text not null default 'rules';

alter table public.promo_documents
  add column if not exists intelligence_result jsonb not null default '{}'::jsonb;

alter table public.promo_ingestion_jobs
  add column if not exists records_not_promotions integer not null default 0,
  add column if not exists records_duplicates integer not null default 0,
  add column if not exists records_ai_enriched integer not null default 0,
  add column if not exists records_needs_attention integer not null default 0;

create index if not exists promotions_duplicate_fingerprint_idx
  on public.promotions(duplicate_fingerprint)
  where duplicate_fingerprint is not null;

create index if not exists promotions_verification_status_idx
  on public.promotions(verification_status, publication_status, status);

create index if not exists promotions_source_trust_idx
  on public.promotions(source_trust_level, publication_status);

alter table public.promotions
  drop constraint if exists promotions_source_trust_level_check;
alter table public.promotions
  add constraint promotions_source_trust_level_check
  check (source_trust_level in ('official_source','trusted_aggregator','unverified','suspicious'));

alter table public.promotions
  drop constraint if exists promotions_verification_status_check;
alter table public.promotions
  add constraint promotions_verification_status_check
  check (verification_status in ('verified','needs_attention','duplicate','not_promotion'));

alter table public.promotions
  drop constraint if exists promotions_intelligence_method_check;
alter table public.promotions
  add constraint promotions_intelligence_method_check
  check (intelligence_method in ('gemini','cache','rules'));

commit;
