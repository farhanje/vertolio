begin;

-- Repair migration for environments where 202607130005 failed because it used
-- the invalid verification status value `needs_verification`.
delete from public.promo_llm_cache
where provider = 'gemini'
  and prompt_version = 'promo-segmentation-v2';

update public.promotions
set segmentation_provider = null,
    segmentation_model = null,
    segmentation_prompt_version = null,
    segmentation_taxonomy_version = null,
    segmentation_llm_status = null,
    segmentation_last_attempt_at = null,
    intelligence_method = 'rules',
    verification_status = 'needs_attention'
where coalesce(intelligence_method, 'rules') in ('rules', 'cache')
  and coalesce(ai_summary, '') = '';

commit;
