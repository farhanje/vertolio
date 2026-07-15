begin;

create or replace function public.normalize_selective_promo_intelligence_method()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Same-timing triggers execute by name. This 000-prefixed trigger runs before
  -- the legacy full-Gemini calibration trigger and prevents selective field
  -- resolution from being judged as a full numeric extraction.
  if new.segmentation_method = 'llm_hybrid' then
    new.intelligence_method := 'hybrid';
  end if;
  return new;
end;
$$;

drop trigger if exists promotions_000_selective_hybrid_before_write on public.promotions;
create trigger promotions_000_selective_hybrid_before_write
before insert or update on public.promotions
for each row execute function public.normalize_selective_promo_intelligence_method();

commit;
