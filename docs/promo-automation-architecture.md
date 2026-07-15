# Deterministic-First Promo Automation

## Product goal

Build a public promotion dataset that stays fresh with minimal operator intervention while keeping AI cost and factual risk low.

The system should answer five user questions reliably:

1. Which merchant is offering the promotion?
2. What does the user receive?
3. Until when is it available, or is it only a catalog listing?
4. Where or through which channel can it be redeemed?
5. Which requirements apply when the source states them?

## Core principle

AI is not the crawler and is not the default extractor.

```text
scheduler
  -> source discovery
  -> fetch
  -> source boundary
  -> deterministic parsing
  -> content hash and duplicate checks
  -> publishability decision
  -> publish, catalog, or unresolved queue
  -> selective bulk AI only for unresolved fields
  -> publish or genuine exception queue
```

Unchanged content stops before parsing and never spends AI budget.

## Source adapter contract

The universal part is the adapter output, not the source HTML structure.

Every high-volume source should eventually define:

- promotion discovery strategy;
- detail URL pattern;
- start boundary;
- end boundary;
- excluded sections;
- pagination strategy;
- deterministic source-specific hints;
- evidence and boundary diagnostics.

All adapters normalize to the same user-facing fields:

```js
{
  merchant,
  offerSummary,
  startsAt,
  expiresAt,
  locationScope,
  cities,
  provinces,
  outlets,
  channels,
  requirementsSummary,
  paymentMethods,
  minimumSpend,
  voucherCode,
  sourceUrl,
  canonicalUrl,
  boundaryDiagnostics
}
```

### Boundary behavior

A boundary contract may use source-specific start and end markers. Missing required boundaries prevent unrestricted auto-publication and create a parser-health signal.

BCA currently starts from the current promo title and stops before:

- `Bagikan promo ini`
- `Promo Serupa`
- `Lihat semua promo`

This prevents a related promotion from contaminating the current offer's expiry, benefit, merchant, or location.

Generic sources support configured boundary markers through `promo_sources.adapter_config.boundaries`. Generic sources remain review-only until a tested boundary or dedicated adapter is shipped.

## Publishability

A normal promotion is publishable when it has:

- merchant;
- understandable offer summary;
- expiry;
- location or redemption channel;
- trusted source URL;
- safe required boundaries.

A catalog listing may omit expiry when the source is explicitly a catalog source. Catalog listings stay separate from currently usable promotions and never enter expiring-soon alerts.

Requirements are displayed when found but are not universally mandatory because some offers have no minimum spend, code, or payment restriction.

## Selective AI

Only unresolved user-facing fields enter `promo_ai_resolution_queue`.

Current AI-resolvable fields:

- merchant;
- offer summary;
- validity;
- availability.

The resolver:

- claims up to six items per request;
- sends bounded source text, not full web pages;
- allows changes only to each item's declared missing fields;
- requires an exact source quote for every accepted field;
- leaves unsupported values empty;
- uses the existing content-hash cache;
- uses the existing daily and monthly hard caps;
- retries unchanged failures only once;
- moves terminal unresolved cases to the genuine exception queue.

The scheduled worker prioritizes a selective AI batch when the oldest unresolved item has waited 30 minutes. Otherwise deterministic ingestion remains the default task. When no source job exists, the worker drains the AI queue.

## Cost controls

Zero-cost operations:

- scheduling;
- discovery;
- fetching;
- boundary isolation;
- content hashing;
- deterministic field parsing;
- exact duplicate detection;
- expiry cleanup;
- rules-based category and location classification;
- publishability evaluation.

Paid operations:

- bulk ambiguity resolution;
- later: sampled quality control;
- later: semantic duplicate review;
- later: bulk classification only where rules fail.

Hard controls:

- unchanged content never calls AI;
- one queue row per promotion and content hash;
- bounded input length per item;
- maximum six items per batch;
- maximum one retry for unchanged failures;
- daily call limit;
- US$5 application monthly hard cap;
- cache keyed by content, model, prompt, and taxonomy.

## Automation and operator involvement

Normal operation requires no button press.

- Scheduler creates due source jobs.
- Worker processes safe, resumable source batches.
- Worker automatically drains selective AI batches.
- Expiration job deletes expired promos.
- Failed source jobs use capped retry delays.
- Failed AI batches use capped retries and then create an exception.

The admin `Run now` control is optional and exists only for immediate testing or recovery.

Manual review should contain only:

- unconfirmed required boundaries;
- suspicious or external source URLs;
- contradictions;
- missing fields still unresolved after selective AI;
- unsupported generic source structures;
- genuinely merged or ambiguous offers.

## Source expansion procedure

For each new source:

1. Verify that the pages are public and crawlable without login or CAPTCHA.
2. Identify the discovery mechanism: DOM links, sitemap, JSON-LD, embedded app state, or public JSON endpoint.
3. Capture representative fixtures: ordinary promo, online promo, offline promo, tiered offer, expired promo, and related-content section.
4. Define and test boundaries.
5. Confirm deterministic merchant, offer, expiry, availability, and requirements extraction.
6. Enable auto-publication only after boundary and field coverage are stable.
7. Monitor boundary issue rate and source failures after release.

Suggested next source order, subject to live accessibility checks:

1. Blibli
2. Mandiri
3. CIMB Niaga
4. DANA and GoPay
5. Grab
6. Tokopedia and ShopeePay
7. selected merchant websites

## Future voucher-code finder

Voucher codes should become a related entity rather than forcing every promotion into a code-centric model.

A future `voucher_codes` record should include:

- code;
- merchant;
- benefit;
- minimum spend;
- expiry;
- redemption channel;
- restrictions;
- source evidence;
- verification state;
- optional relation to a promotion.

The existing discovery, boundary, hash, evidence, selective-AI, and cost-control layers can be reused.

## Operational metrics

The dashboard should prioritize:

- pages checked and changed;
- promotions parsed without AI;
- promotions queued for bulk AI;
- AI batches and resolved items;
- cost per usable promotion;
- boundary issue count;
- genuine review count;
- source failure rate;
- published, catalog, expired, duplicate, and rejected counts.

The north-star operational metric is not the percentage marked `verified`. It is fresh usable-promo coverage with low false-information rate and low AI cost per usable new promotion.
