begin;

alter table public.promotions
  drop constraint if exists promotions_verification_status_check;

alter table public.promotions
  add constraint promotions_verification_status_check
  check (verification_status in ('verified','needs_attention','catalog_listing','duplicate','not_promotion'));

create or replace function public.classify_promo_catalog_listing()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Trusted aggregator cards can prove that a discount exists while still lacking
  -- a validity period or full redemption terms. Keep them separate from genuinely
  -- contradictory or suspicious offers instead of calling them verified.
  if new.duplicate_of is null
    and coalesce(new.is_promotion, true) = true
    and new.source_trust_level = 'trusted_aggregator'
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

drop trigger if exists promotions_catalog_listing_before_write on public.promotions;
create trigger promotions_catalog_listing_before_write
before insert or update on public.promotions
for each row
execute function public.classify_promo_catalog_listing();

create or replace function public.skip_catalog_listing_review_item()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.promotion_id is not null
    and exists (
      select 1
      from public.promotions p
      where p.id = new.promotion_id
        and p.verification_status = 'catalog_listing'
    )
  then
    return null;
  end if;

  return new;
end;
$$;

drop trigger if exists promo_review_queue_skip_catalog_before_write on public.promo_review_queue;
create trigger promo_review_queue_skip_catalog_before_write
before insert or update on public.promo_review_queue
for each row
execute function public.skip_catalog_listing_review_item();

-- Re-run the existing calibration first, then the alphabetically later catalog
-- classifier for all current rows.
update public.promotions
set updated_at = updated_at;

-- Catalog cards no longer belong in the manual exception queue.
delete from public.promo_review_queue q
using public.promotions p
where q.promotion_id = p.id
  and p.verification_status = 'catalog_listing'
  and q.status in ('pending','in_review');

commit;
