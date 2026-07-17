begin;

do $$
declare
  existing_id uuid;
begin
  select id
  into existing_id
  from public.promo_sources
  where adapter_key = 'dana'
     or base_url in ('https://www.dana.id/promo?lng=id', 'https://www.dana.id/promo')
  order by created_at asc
  limit 1;

  if existing_id is null then
    insert into public.promo_sources (
      name,
      base_url,
      source_type,
      adapter_key,
      enabled,
      check_frequency,
      check_interval_minutes,
      timezone,
      minimum_confidence,
      max_pages_per_run,
      auto_publish_enabled,
      status,
      next_run_at,
      adapter_config
    ) values (
      'DANA Promotions',
      'https://www.dana.id/promo?lng=id',
      'official_web',
      'dana',
      true,
      'every_6_hours',
      360,
      'Asia/Jakarta',
      0.88,
      100,
      true,
      'healthy',
      now(),
      '{"page_batch_size":1,"listing_page_limit":5}'::jsonb
    );
  else
    update public.promo_sources
    set name = 'DANA Promotions',
        base_url = 'https://www.dana.id/promo?lng=id',
        source_type = 'official_web',
        adapter_key = 'dana',
        enabled = true,
        check_frequency = 'every_6_hours',
        check_interval_minutes = 360,
        timezone = 'Asia/Jakarta',
        minimum_confidence = 0.88,
        max_pages_per_run = 100,
        auto_publish_enabled = true,
        status = 'healthy',
        next_run_at = now(),
        locked_until = null,
        adapter_config = coalesce(adapter_config, '{}'::jsonb)
          || '{"page_batch_size":1,"listing_page_limit":5}'::jsonb,
        updated_at = now()
    where id = existing_id;
  end if;
end
$$;

commit;
