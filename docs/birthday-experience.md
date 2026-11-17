# Birthday infrastructure (Sanity-managed)

The experience is OFF by default and has no birthday photos, music, or chapters yet.

## How to prepare content

1. Open Sanity Studio at /studio and select **Ema's Birthday**.
2. Upload a hero photograph and add at least one populated story/photo/quote block.
3. Optionally upload a soundtrack. Browsers require user interaction to play music.
4. Publish the document with **Homepage birthday takeover — ACTIVE** still OFF.
5. When ready to reveal: toggle ACTIVE on and **Publish**. The change is read at request time without a redeploy.
6. To end the takeover: toggle ACTIVE off and **Publish**. Optionally enable **Keep /dear-ema available after the takeover** before disabling.

## Routing and safety

- /: Normal homepage unless active AND a hero image and a populated chapter exist.
- /portfolio: Always the normal homepage. The navbar Home link points here during an active takeover.
- /dear-ema: Returns 404 until content is ready AND either takeover is active or keepStoryPublic is enabled.
- /for/*, /work/*, /blog/*, /resume, /about, /studio, /api/*: Not redirected.
- On the homepage, users first see the real portfolio briefly, then the intro lines, then the birthday story.
- Content is fetched from the published Sanity dataset with no-store caching.
- Sanity query failure or incomplete content always falls back to the normal portfolio.
- This is a content-management and routing foundation; photography curation, final creative design, and polished soundtrack handoff follow separately.

## Testing checklist

- OFF: / displays existing portfolio, navbar Home remains /.
- OFF: /portfolio displays existing portfolio, /dear-ema returns 404.
- ON with missing assets: / remains normal portfolio (fails safe).
- ON with valid assets: / briefly shows the portfolio and then birthday story.
- ON: /work/some-slug, /for/valid-code, /blog/some-slug and /resume remain normal.
- ON: navbar Home targets /portfolio, preventing accidental birthday navigation from case studies.
- OFF after launch: / returns to the normal homepage immediately after publishing.
