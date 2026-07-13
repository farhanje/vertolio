# Promo automation — Stage 1 foundation

This change adds the server-side foundation for the Coupon and Voucher Intelligence Platform without changing the existing portfolio, Sanity content, or research runner.

## Included

- Supabase schema for source registry, ingestion jobs, raw documents, normalized promotions, version history, and review queue.
- Database-level prevention of concurrent active jobs for the same source.
- Atomic RPC functions to enqueue due sources and claim the next queued job.
- Protected enqueue-only scheduler endpoint:
  - `POST /api/internal/scheduler/run`
- Protected worker endpoint that processes one claimed source job per invocation:
  - `POST /api/internal/promo-worker/run`
- Protected nightly status endpoint:
  - `POST /api/internal/promo-expiration/run`
- Generic public HTML adapter with:
  - same-domain promotion-link discovery;
  - content fetching with a timeout;
  - canonical URL normalization;
  - JSON-LD reading;
  - deterministic basic extraction;
  - content hashing.
- Deterministic promo calculations.
- Validation, automatic-publication gating, retry backoff, source health, versioning, and material-change detection.
- Protected admin dashboard:
  - `/promo-admin`
- GitHub Actions scheduler example.

## Important scope boundary

This is the automation foundation, not the completed production MVP.

No provider is labelled as genuinely automated yet. The source registry starts empty on purpose. Two official sources must be tested against their current public HTML, access rules, pagination, and serverless behavior before enabling them.

The generic adapter should be treated as a fallback. Stable sources should receive provider-specific adapters.

## Setup

1. Apply `supabase/migrations/202607130001_promo_automation_foundation.sql` in the Supabase SQL editor.
2. Add these Vercel environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PROMO_SCHEDULER_SECRET`
   - `PROMO_ADMIN_USER` and `PROMO_ADMIN_PASS`, or reuse the existing Studio credentials.
3. Add GitHub repository secrets:
   - `PROMO_SITE_URL`, for example `https://farhanje.com`
   - `PROMO_SCHEDULER_SECRET`, matching Vercel.
4. Deploy the branch.
5. Open `/promo-admin`.
6. Register only tested official public sources in `promo_sources`.

Example source:

```sql
insert into public.promo_sources (
  name,
  base_url,
  adapter_key,
  check_frequency,
  check_interval_minutes,
  enabled,
  auto_publish_enabled,
  minimum_confidence
) values (
  'Example official promotions',
  'https://example.com/promotions',
  'generic-html',
  'every_6_hours',
  360,
  true,
  false,
  0.90
);
```

Keep `auto_publish_enabled = false` until extraction has been validated over multiple runs.

## Scheduler behavior

The hourly workflow calls the scheduler endpoint. The endpoint:

1. atomically enqueues due sources;
2. prevents duplicate active jobs per source;
3. calls the protected worker separately;
4. lets each worker invocation claim only one queued job;
5. records counts and logs;
6. schedules the next run;
7. retries with 15-minute, 1-hour, then 6-hour backoff.

Keeping enqueueing and processing separate reduces the risk that one slow source blocks the scheduler request.

The nightly workflow runs at `00:17 Asia/Jakarta` (`17:17 UTC`) and recalculates upcoming, active, expiring-soon, and expired statuses.

## Next implementation stage

Before adding provider adapters, test candidate official sources for:

- public access without login or CAPTCHA;
- stable listing and detail URLs;
- robots and source terms;
- server-rendered HTML or legitimate structured data;
- pagination;
- request-rate tolerance;
- whether Vercel/GitHub-hosted requests are blocked.

Then implement two provider-specific adapters and mark only those sources as genuinely automated.
