begin;

create or replace function public.calibrate_promo_intelligence_row()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  start_evidence text := lower(coalesce(new.field_evidence ->> 'startsAt', ''));
  expiry_evidence text := lower(coalesce(new.field_evidence ->> 'expiresAt', ''));
  benefit_evidence text := lower(coalesce(new.field_evidence ->> 'benefit', ''));
  maximum_evidence text := lower(coalesce(new.field_evidence ->> 'maximumBenefit', ''));
  minimum_evidence text := lower(coalesce(new.field_evidence ->> 'minimumSpend', ''));
  location_evidence text := lower(concat_ws(' ',
    coalesce(new.field_evidence ->> 'locations', ''),
    coalesce(new.title, ''),
    coalesce(new.merchant, '')
  ));
  benefit_confidence numeric := 0;
  expiry_confidence numeric := 0;
  maximum_confidence numeric := 0;
  filtered_cities text[] := '{}'::text[];
  filtered_provinces text[] := '{}'::text[];
  source_auto_publish boolean := false;
  source_minimum_confidence numeric := 0.85;
begin
  -- Decode the most common entities left by HTML-only catalog sources.
  new.title := replace(replace(replace(replace(coalesce(new.title, ''), '&#x27;', ''''), '&#39;', ''''), '&quot;', '"'), '&amp;', '&');
  if new.merchant is not null then
    new.merchant := replace(replace(replace(replace(new.merchant, '&#x27;', ''''), '&#39;', ''''), '&quot;', '"'), '&amp;', '&');
  end if;

  if coalesce(new.intelligence_method, 'rules') in ('gemini', 'cache') then
    if coalesce(new.field_confidence ->> 'benefit', '') ~ '^[0-9]+([.][0-9]+)?$' then
      benefit_confidence := (new.field_confidence ->> 'benefit')::numeric;
    end if;
    if coalesce(new.field_confidence ->> 'expiresAt', '') ~ '^[0-9]+([.][0-9]+)?$' then
      expiry_confidence := (new.field_confidence ->> 'expiresAt')::numeric;
    end if;
    if coalesce(new.field_confidence ->> 'maximumBenefit', '') ~ '^[0-9]+([.][0-9]+)?$' then
      maximum_confidence := (new.field_confidence ->> 'maximumBenefit')::numeric;
    end if;

    -- Publication/article dates are not promo start dates. Keep a start only when
    -- Gemini can point to explicit source evidence and the range is chronological.
    if start_evidence = ''
      or (new.starts_at is not null and new.expires_at is not null and new.starts_at > new.expires_at)
    then
      new.starts_at := null;
    end if;

    -- Only keep locations that appear in location evidence or in the offer title.
    select coalesce(array_agg(item.value order by item.ordinality), '{}'::text[])
    into filtered_cities
    from unnest(coalesce(new.cities, '{}'::text[])) with ordinality as item(value, ordinality)
    where nullif(trim(item.value), '') is not null
      and position(lower(item.value) in location_evidence) > 0;

    select coalesce(array_agg(item.value order by item.ordinality), '{}'::text[])
    into filtered_provinces
    from unnest(coalesce(new.provinces, '{}'::text[])) with ordinality as item(value, ordinality)
    where nullif(trim(item.value), '') is not null
      and position(lower(item.value) in location_evidence) > 0;

    new.cities := filtered_cities;
    new.provinces := filtered_provinces;

    if location_evidence ~ '(seluruh|semua|all)[[:space:]]+(outlet|merchant|cabang)' then
      new.location_scope := 'nationwide';
    elsif cardinality(new.cities) > 0 then
      new.location_scope := 'city';
    elsif coalesce(new.channels, '{}'::text[]) && array['online', 'website', 'in_app']::text[] then
      new.location_scope := 'online';
    elsif coalesce(new.outlet_count, 0) = 0 then
      new.location_scope := 'unknown';
    end if;

    -- Do not preserve a percentage or amount that Gemini could not support with
    -- evidence. A title-backed "up to RpX" offer can safely use the evidenced cap.
    if benefit_evidence = '' then
      if maximum_evidence <> ''
        and new.maximum_benefit is not null
        and lower(coalesce(new.title, '')) ~ '(diskon|potongan|cashback).*(hingga|up to)'
      then
        new.benefit_type := case
          when lower(new.title) like '%cashback%' then 'cashback_fixed'
          else 'discount_fixed'
        end;
        new.benefit_value := new.maximum_benefit;
        new.field_evidence := jsonb_set(coalesce(new.field_evidence, '{}'::jsonb), '{benefit}', to_jsonb(maximum_evidence), true);
        new.field_confidence := jsonb_set(coalesce(new.field_confidence, '{}'::jsonb), '{benefit}', to_jsonb(maximum_confidence), true);
        benefit_confidence := maximum_confidence;
      else
        new.benefit_type := 'other';
        new.benefit_value := null;
        benefit_confidence := 0;
      end if;
    end if;

    if maximum_evidence = '' then
      new.maximum_benefit := null;
    end if;

    if minimum_evidence = '' then
      new.minimum_spend := null;
    end if;

    -- Recalculate the simple status after discarding an unsupported start date.
    if new.starts_at is not null and new.starts_at > now() then
      new.status := 'upcoming';
    elsif coalesce(new.calculated_values ->> 'expiryStatus', '') = 'expiring_soon' then
      new.status := 'expiring_soon';
    else
      new.status := 'active';
    end if;

    if new.duplicate_of is not null then
      new.verification_status := 'duplicate';
    elsif coalesce(new.source_trust_level, 'unverified') not in ('official_source', 'trusted_aggregator')
      or new.expires_at is null
      or expiry_evidence = ''
      or expiry_confidence < 0.6
      or new.benefit_type is null
      or new.benefit_type in ('other', 'unknown')
      or new.benefit_value is null
      or benefit_evidence = ''
      or benefit_confidence < 0.6
      or cardinality(coalesce(new.contradictions, '{}'::text[])) > 0
      or (new.starts_at is not null and new.expires_at is not null and new.starts_at > new.expires_at)
    then
      new.verification_status := 'needs_attention';
    else
      new.verification_status := 'verified';
    end if;

    select coalesce(auto_publish_enabled, false), coalesce(minimum_confidence, 0.85)
    into source_auto_publish, source_minimum_confidence
    from public.promo_sources
    where id = new.source_id;

    if new.verification_status = 'verified'
      and source_auto_publish
      and coalesce(new.extraction_confidence, 0) >= source_minimum_confidence
    then
      new.publication_status := 'published';
      new.published_at := coalesce(new.published_at, now());
    elsif new.verification_status = 'needs_attention' then
      new.publication_status := 'review';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists promotions_calibrate_intelligence_before_write on public.promotions;
create trigger promotions_calibrate_intelligence_before_write
before insert or update on public.promotions
for each row
execute function public.calibrate_promo_intelligence_row();

-- Apply the same calibration immediately to the existing Gemini/cache rows.
update public.promotions
set updated_at = updated_at
where intelligence_method in ('gemini', 'cache');

commit;
