begin;

create or replace function public.classify_promo_catalog_listing()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  is_ultra_voucher boolean := false;
  percentage_text text := null;
  catalog_percentage numeric := null;
  benefit_evidence_text text := null;
begin
  select exists (
    select 1
    from public.promo_sources s
    where s.id = new.source_id
      and s.adapter_key = 'ultra-voucher'
  ) into is_ultra_voucher;

  if is_ultra_voucher
    and new.duplicate_of is null
    and coalesce(new.is_promotion, true) = true
    and new.expires_at is null
    and jsonb_array_length(coalesce(new.contradictions, '[]'::jsonb)) = 0
  then
    -- The Ultra Voucher adapter creates deterministic catalog evidence such as
    -- "Merchant - Diskon 40%". Restore that evidenced percentage after the
    -- generic calibration trigger clears unsupported Gemini benefit fields.
    percentage_text := substring(
      coalesce(new.title, '')
      from '([0-9]{1,3}([.,][0-9]+)?)[[:space:]]*%'
    );

    if percentage_text is null then
      percentage_text := substring(
        coalesce(new.terms_text, '')
        from '([0-9]{1,3}([.,][0-9]+)?)[[:space:]]*%'
      );
    end if;

    if percentage_text is not null then
      catalog_percentage := replace(percentage_text, ',', '.')::numeric;
    end if;

    if catalog_percentage is not null
      and catalog_percentage > 0
      and catalog_percentage <= 100
    then
      benefit_evidence_text := left(
        coalesce(nullif(new.title, ''), nullif(new.terms_text, ''), 'Ultra Voucher catalog discount'),
        500
      );

      new.benefit_type := 'percentage';
      new.benefit_value := catalog_percentage;
      new.field_evidence := jsonb_set(
        coalesce(new.field_evidence, '{}'::jsonb),
        '{benefit}',
        to_jsonb(benefit_evidence_text),
        true
      );
      new.field_confidence := jsonb_set(
        coalesce(new.field_confidence, '{}'::jsonb),
        '{benefit}',
        '1'::jsonb,
        true
      );
      new.verification_status := 'catalog_listing';
      new.publication_status := 'review';
      new.published_at := null;

      if not coalesce(new.intelligence_warnings, '[]'::jsonb) @> '["validity_unavailable_catalog_listing"]'::jsonb then
        new.intelligence_warnings := coalesce(new.intelligence_warnings, '[]'::jsonb)
          || '["validity_unavailable_catalog_listing"]'::jsonb;
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- Trigger the existing calibration followed by the catalog classifier for all
-- current Ultra Voucher rows. No Gemini call is made.
update public.promotions p
set updated_at = p.updated_at
where exists (
  select 1
  from public.promo_sources s
  where s.id = p.source_id
    and s.adapter_key = 'ultra-voucher'
);

delete from public.promo_review_queue q
using public.promotions p
where q.promotion_id = p.id
  and p.verification_status = 'catalog_listing'
  and q.status in ('pending','in_review');

commit;
