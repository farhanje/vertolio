# Vertolio

Next.js + Sanity CMS + Vercel portfolio.

## Routes
- `/` Home
- `/work` Work (grouped by Organization)
- `/blog` Blog
- `/about` About
- `/studio` Sanity Studio (admin)

## Vercel env vars
Set these in Vercel Project → Settings → Environment Variables:
- `NEXT_PUBLIC_SANITY_PROJECT_ID=iq6vjwu7`
- `NEXT_PUBLIC_SANITY_DATASET=production`

## What to do in Studio (CMS)
Open `/studio` and create:
1) Organizations: **AstraPay**, **TU/e**, **Telkom Indonesia**, **Others**
2) Projects: your portfolio items (assign Organization, add summary, tags, content)
3) Posts: your blog posts

## Next steps
- After you create a few records in Studio, we’ll wire the frontend pages to fetch and render real CMS content.
