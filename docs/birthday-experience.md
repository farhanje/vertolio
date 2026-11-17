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
