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

create or replace function public.sync_promo_ai_queue_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'failed' then
    update public.promotions
    set publishability_status = 'review_required',
        verification_status = case
          when verification_status in ('duplicate','not_promotion') then verification_status
          else 'needs_attention'
        end,
        publication_status = case
          when publication_status = 'rejected' then publication_status
          else 'review'
        end,
        published_at = null
    where id = new.promotion_id;
  end if;
  return new;
end;
$$;

drop trigger if exists promo_ai_resolution_sync_promotion_after_write on public.promo_ai_resolution_queue;
create trigger promo_ai_resolution_sync_promotion_after_write
after insert or update on public.promo_ai_resolution_queue
for each row execute function public.sync_promo_ai_queue_state();

commit;
