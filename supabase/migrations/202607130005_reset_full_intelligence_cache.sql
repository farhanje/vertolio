begin;

-- The previous category-only sorter and the full extractor initially shared the
-- same cache signature. Remove those cached payloads so they cannot be reused
-- as if they were complete promo intelligence records.
delete from public.promo_llm_cache
where provider = 'gemini'
  and prompt_version = 'promo-segmentation-v2';

-- Force incomplete rule/cache records through one clean full extraction pass.
-- Successfully completed full-intelligence records are left untouched.
update public.promotions
set segmentation_provider = null,
    segmentation_model = null,
    segmentation_prompt_version = null,
    segmentation_taxonomy_version = null,
    segmentation_llm_status = null,
    segmentation_last_attempt_at = null,
    intelligence_method = 'rules',
    verification_status = 'needs_verification'
where coalesce(intelligence_method, 'rules') in ('rules', 'cache')
  and coalesce(ai_summary, '') = '';

commit;
