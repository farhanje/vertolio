# Birthday Experience — Sanity controls and private draft preview

## Preview while the public takeover is OFF

1. Open `/studio`, then **Ema's Birthday**.
2. Click **Open private preview** to open `/dear-ema` in another tab.
3. Authenticate using the **existing Studio username/password** when prompted.
4. The preview reads **unpublished Sanity drafts** using a server-side token. No publish and no activation required.
5. After making and saving edits in Sanity, refresh the preview tab to see your changes.
6. Click **Preview opening transition** (or the preview page's **Replay opening** link) to test the real portfolio → intro → birthday sequence.

The preview stays protected by HTTP Basic Auth and always carries noindex/no-store response headers. If Studio credentials or a server-side Sanity token are absent, it fails closed rather than exposing draft content. Sanity asset URLs themselves are served by Sanity and may be independently accessible if someone has the asset URL.

## Public activation remains independent

- `/`: Normal portfolio when `active` is OFF, or if essential birthday content is missing.
- `/`: Birthday experience only when `active` is ON **and published**, with a hero photo and a populated chapter.
- `/portfolio`: Always the original portfolio homepage.
- `/dear-ema`: Always private, regardless of `active` or `keepStoryPublic`.
- `/for/*`, `/work/*`, `/blog/*`, `/resume`, `/about`, `/studio` and `/api/*`: Unaffected.

The older `keepStoryPublic` field is hidden and retired for compatibility, not used for public access.

## Verification

- No credentials: `GET /dear-ema` returns 401 challenge when configured (404 if missing credentials configuration).
- With Studio credentials: `GET /dear-ema` renders the saved draft even without photos or chapters.
- `?intro=1`: Replays the transformation from a real portfolio homepage snapshot into the story.
- The published `active: false` setting keeps the homepage normal.
- Sanity outage or missing assets fails closed for public takeover.
- Do not share preview credentials. Browser Basic Auth may prompt again outside `/studio`.

## Editorial design and motion (November 2026)

The birthday edition deliberately reuses the portfolio's white/black, Geist typography,
12-column/editorial grids, numeric overlines, and hairline dividers. No new font system or
off-brand beige/serif theme is introduced.

The transition is the actual homepage (roughly 850 ms), then three short typographic
interludes, then a left-to-right curtain reveal into the birthday cover. The same
sequence is available under `/dear-ema?intro=1`, behind Studio authentication.

Native vertical scrolling is never hijacked. Headings, quotations, captions and
individual photographs reveal once via IntersectionObserver. Photos carry subtle,
requestAnimationFrame-throttled parallax and the page has a slender scroll-progress rule.
Motion respects `prefers-reduced-motion` and bandwidth-saving preferences. Images and
soundtrack are loaded from Sanity, but the preview deliberately shows editorial empty
states rather than fabricated memories when the story is still empty.

Background music is **off by default**, and can only play after a visitor actively presses
Play. The public homepage takeover remains governed solely by the published Sanity
`active` switch and the content readiness guard.

## Adjustable intro timings (Sanity Studio)

Open **Ema's Birthday → Opening transition timing (seconds)**. Each numeric value is independently editable:
- Homepage glimpse, first sentence hold, second sentence hold, final sentence hold
- Curtain wipe duration

The Studio **Opening timeline** panel shows the estimated total in seconds and a proportional timeline. **Saving your draft** updates the protected `/dear-ema?intro=1` replay upon refresh; this does not require publishing, turning the campaign on, or redeploying. The live homepage always reads published values only.

The default has deliberately been slowed from ~3.9 seconds to **8.2 seconds overall**: 1.5 + 1.8 + 1.5 + 2.2 seconds before the reveal, then a 1.2-second wipe. These durations are approximate; actual display can vary slightly with browser rendering.

The fields use seconds (decimals accepted). Reduced-motion preferences still skip the long opening for accessibility.
