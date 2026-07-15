begin;

create or replace function public.classify_promo_catalog_listing()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Catalog semantics come from the registered source adapter, not from the
  -- trust label inferred for an individual row. Ultra Voucher cards are
  -- intentionally partial catalog listings when they prove a benefit but do
  -- not expose a validity period or complete redemption terms.
  if new.duplicate_of is null
    and coalesce(new.is_promotion, true) = true
    and exists (
      select 1
      from public.promo_sources s
      where s.id = new.source_id
        and s.adapter_key = 'ultra-voucher'
    )
    and new.expires_at is null
    and coalesce(new.benefit_type, 'other') in ('percentage','cashback_fixed','discount_fixed','points')
    and new.benefit_value is not null
    and new.benefit_value > 0
    and jsonb_array_length(coalesce(new.contradictions, '[]'::jsonb)) = 0
  then
    new.verification_status := 'catalog_listing';
    new.publication_status := 'review';
    new.published_at := null;
  end if;

  return new;
end;
$$;

-- Reclassify current Ultra Voucher rows immediately. The existing calibration
-- trigger runs first; the catalog classifier then applies the source-specific
-- state where the catalog evidence is intentionally incomplete.
update public.promotions p
set updated_at = p.updated_at
where exists (
  select 1
  from public.promo_sources s
  where s.id = p.source_id
    and s.adapter_key = 'ultra-voucher'
);

-- Catalog listings are visible as a separate operational state and should not
-- remain in the manual exception queue.
delete from public.promo_review_queue q
using public.promotions p
where q.promotion_id = p.id
  and p.verification_status = 'catalog_listing'
  and q.status in ('pending','in_review');

commit;
